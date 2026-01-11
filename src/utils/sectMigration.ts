import { cloneDeep } from 'lodash';
import type { SaveData, SectSystemV2, WorldFaction } from '@/types/game';
import { validateAndFixSectDataList } from '@/utils/worldGeneration/sectDataValidator';

export const SECT_SYSTEM_VERSION = 2;

export interface SectMigrationCheck {
  needed: boolean;
  fromVersion: number;
  toVersion: number;
  reasons: string[];
}

const collectMembersBySect = (saveData: SaveData): Record<string, string[]> => {
  const membersBySect: Record<string, string[]> = {};
  const relationships = (saveData as any).社交?.关系 ?? {};

  Object.entries(relationships).forEach(([key, npc]) => {
    if (!npc || typeof npc !== 'object') return;
    const sectName = (npc as any).势力归属 || (npc as any).宗门 || (npc as any).势力;
    if (!sectName) return;
    const memberName = (npc as any).名字 || key;
    if (!membersBySect[sectName]) {
      membersBySect[sectName] = [];
    }
    if (!membersBySect[sectName].includes(memberName)) {
      membersBySect[sectName].push(memberName);
    }
  });

  return membersBySect;
};

export const detectSectMigration = (saveData: SaveData | null): SectMigrationCheck => {
  const check: SectMigrationCheck = {
    needed: false,
    fromVersion: 0,
    toVersion: SECT_SYSTEM_VERSION,
    reasons: []
  };

  if (!saveData) {
    return check;
  }

  const sectSystem = ((saveData as any).社交?.宗门 ?? null) as (SectSystemV2 & { 成员信息?: any }) | null;

  // V3 存档中 宗门: null 是合法状态（玩家未加入任何宗门），不需要迁移
  // 空对象 {} 也视为"未加入宗门"状态，不需要迁移
  const isEmptyObject = sectSystem !== null && typeof sectSystem === 'object' && Object.keys(sectSystem).length === 0;

  // 只有当存在旧版字段或版本不匹配时才需要迁移
  const hasLegacySectFields = !!(sectSystem as any)?.成员信息?.宗门名称;
  // 空对象不算版本不匹配
  const hasVersionMismatch = sectSystem !== null && !isEmptyObject && sectSystem.版本 !== SECT_SYSTEM_VERSION;

  // 如果宗门系统为空（null或空对象）且没有旧版字段，说明是新建的 V3 存档，不需要迁移
  if ((!sectSystem || isEmptyObject) && !hasLegacySectFields) {
    return check;
  }

  const fromVersion = typeof sectSystem?.版本 === 'number' ? sectSystem.版本 : 0;
  check.fromVersion = fromVersion;

  // 只检测真正需要迁移的情况
  if (hasLegacySectFields && !sectSystem?.当前宗门) {
    check.reasons.push('玩家宗门信息未同步到宗门系统');
  }

  if (hasVersionMismatch) {
    check.reasons.push('宗门系统版本不匹配');
  }

  check.needed = check.reasons.length > 0;
  return check;
};

const buildSectSystem = (
  saveData: SaveData,
  factions: WorldFaction[],
  fromVersion: number
): SectSystemV2 => {
  const existing = (((saveData as any).社交?.宗门 ?? {}) as Partial<SectSystemV2>) as any;
  const sectMap: Record<string, WorldFaction> = {};

  factions.forEach((sect) => {
    if (sect?.名称) {
      sectMap[sect.名称] = sect;
    }
  });

  const playerSectName = (existing as any)?.成员信息?.宗门名称 ?? null;
  const membersBySect = collectMembersBySect(saveData);

  return {
    ...existing,
    版本: SECT_SYSTEM_VERSION,
    当前宗门: existing.当前宗门 ?? playerSectName ?? null,
    宗门档案: {
      ...sectMap,
      ...(existing.宗门档案 || {})
    },
    宗门成员: existing.宗门成员 ?? membersBySect,
    宗门藏经阁: existing.宗门藏经阁 ?? {},
    宗门贡献商店: existing.宗门贡献商店 ?? {},
    迁移记录: {
      来源版本: fromVersion,
      目标版本: SECT_SYSTEM_VERSION,
      时间: new Date().toISOString(),
      说明: '由旧版宗门字段迁移生成'
    }
  };
};

export const migrateSectSaveData = (saveData: SaveData): SaveData => {
  const next = cloneDeep(saveData);
  const worldInfo = (next as any).世界?.信息 ?? null;
  const rawFactions = Array.isArray(worldInfo?.势力信息) ? worldInfo.势力信息 : [];
  const fixedFactions = validateAndFixSectDataList(cloneDeep(rawFactions));

  if (worldInfo?.势力信息) {
    worldInfo.势力信息 = fixedFactions;
  }

  const currentSectSystem = ((next as any).社交?.宗门 ?? null) as SectSystemV2 | null;
  const fromVersion = typeof currentSectSystem?.版本 === 'number' ? currentSectSystem.版本 : 0;

  if (!(next as any).社交 || typeof (next as any).社交 !== 'object') {
    (next as any).社交 = {};
  }
  (next as any).社交.宗门 = buildSectSystem(next, fixedFactions, fromVersion);

  return next;
};
