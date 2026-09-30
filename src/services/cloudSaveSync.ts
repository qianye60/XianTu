/**
 * 云端存档同步规则（纯函数，不依赖 store）
 *
 * - 上传前移除叙事历史和任何疑似密钥字段：API Key 不得进入云端数据
 * - 上传携带基线版本和本地修改时间，便于识别并发覆盖
 * - 加载时比较本地与云端版本，冲突必须交给玩家决定，不能静默覆盖
 */
import type { SaveData, SaveSlot } from '@/types/game';

export type CloudSyncInfo = NonNullable<SaveSlot['云端同步信息']>;

/** 字段名命中即视为密钥，上传前整体移除 */
const SECRET_KEY_PATTERN = /^(api[_-]?key|apikey|secret|access[_-]?token|refresh[_-]?token|authorization|password|密钥|令牌)$/i;

/**
 * 深度移除疑似密钥字段（原地修改传入对象，调用方需先深拷贝）
 * @returns 被移除的字段路径，用于日志
 */
export function stripSecretsInPlace(value: unknown, path = '', removed: string[] = []): string[] {
  if (!value || typeof value !== 'object') return removed;
  if (Array.isArray(value)) {
    value.forEach((item, i) => stripSecretsInPlace(item, `${path}[${i}]`, removed));
    return removed;
  }
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    const childPath = path ? `${path}.${key}` : key;
    if (SECRET_KEY_PATTERN.test(key)) {
      delete obj[key];
      removed.push(childPath);
      continue;
    }
    stripSecretsInPlace(obj[key], childPath, removed);
  }
  return removed;
}

/**
 * 生成用于云端同步的存档副本：移除叙事历史（体积大且云端不需要）和密钥字段
 */
export function filterSaveDataForCloud(saveData: SaveData | null): SaveData | null {
  if (!saveData) return null;

  const filtered = JSON.parse(JSON.stringify(saveData)) as any;

  // V3: 系统.历史.叙事；兼容旧结构: 历史.叙事 / 叙事历史 / 对话历史
  if (filtered?.系统?.历史 && typeof filtered.系统.历史 === 'object') delete filtered.系统.历史.叙事;
  if (filtered?.系统 && typeof filtered.系统 === 'object') delete filtered.系统.图廊;
  if (filtered?.历史 && typeof filtered.历史 === 'object') delete filtered.历史.叙事;
  delete filtered.叙事历史;
  delete filtered.对话历史;

  const removed = stripSecretsInPlace(filtered);
  if (removed.length > 0) {
    console.warn('[云端存档] 已从上传数据中移除疑似密钥字段:', removed);
  }
  return filtered as SaveData;
}

export interface CloudSaveUploadPayload {
  save_data: SaveData | null;
  world_map: unknown;
  game_time: string | null;
  /** 本次修改基于的云端版本；服务端应在版本过期时返回 HTTP 409。 */
  base_version: number;
  /** 本地最后修改时间（ISO） */
  client_updated_at: string;
}

export function buildCloudUploadPayload(
  saveData: SaveData,
  slot: Pick<SaveSlot, '游戏内时间' | '云端同步信息'> & { 世界地图?: unknown },
): CloudSaveUploadPayload {
  return {
    save_data: filterSaveDataForCloud(saveData),
    world_map: slot.世界地图 ?? {},
    game_time: slot.游戏内时间 ?? null,
    base_version: slot.云端同步信息?.版本 ?? 0,
    client_updated_at: slot.云端同步信息?.本地修改时间 ?? new Date().toISOString(),
  };
}

/**
 * 上传成功后的同步信息。
 * 如果服务端返回的版本跳过了 base+1，说明期间有其他设备写入过，本次上传覆盖了对方，标记冲突供玩家确认。
 */
export function syncInfoAfterUpload(previous: CloudSyncInfo | undefined, serverVersion: unknown): CloudSyncInfo {
  const base = previous?.版本 ?? 0;
  const version = typeof serverVersion === 'number' ? serverVersion : base + 1;
  const skipped = typeof serverVersion === 'number' && base > 0 && serverVersion > base + 1;
  if (skipped) {
    console.warn(`[云端存档] 云端版本从 ${base} 跳到 ${serverVersion}，期间有其他设备写入`);
  }
  return {
    最后同步: new Date().toISOString(),
    版本: version,
    需要同步: false,
    后端创建失败: false,
    冲突: skipped || undefined,
  };
}

export function syncInfoAfterLocalChange(previous: CloudSyncInfo | undefined): CloudSyncInfo {
  return {
    最后同步: previous?.最后同步 || '',
    版本: previous?.版本 ?? 0,
    需要同步: true,
    后端创建失败: previous?.后端创建失败,
    本地修改时间: new Date().toISOString(),
    冲突: previous?.冲突,
  };
}

export type CloudLoadDecision = 'use-cloud' | 'use-local' | 'conflict';

/**
 * 加载云端存档前决定使用哪一份数据
 * - 本地没有未上传修改：云端版本不低于本地时使用云端
 * - 本地有未上传修改、云端未前进：保留本地并补传
 * - 本地有未上传修改、云端也前进了（其他设备写入）：冲突
 */
export function decideCloudLoad(
  local: CloudSyncInfo | undefined,
  hasLocalData: boolean,
  cloudVersion: number | undefined,
): CloudLoadDecision {
  if (!hasLocalData) return 'use-cloud';
  const localVersion = local?.版本 ?? 0;
  const remote = typeof cloudVersion === 'number' ? cloudVersion : 0;
  const localDirty = local?.需要同步 === true;

  if (local?.冲突) return 'conflict';
  if (!localDirty) return remote >= localVersion ? 'use-cloud' : 'use-local';
  if (remote <= localVersion) return 'use-local';
  return 'conflict';
}
