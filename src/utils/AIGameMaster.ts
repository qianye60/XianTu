/**
 * @fileoverview AI Game Master 核心模块
 * 负责构建GM请求、处理GM响应和执行酒馆命令
 */

import { getTavernHelper } from './tavern';
import { set, get, unset, cloneDeep } from 'lodash';
import type { GameCharacter, GM_Request, GM_Response } from '../types/AIGameMaster';
import type { CharacterBaseInfo, SaveData, StateChange, StateChangeLog } from '@/types/game';
import { shardSaveData, assembleSaveData, type StorageShards } from './storageSharding';
import { SETTINGS_RANGES } from './settings/memorySettings';
import { applyEquipmentBonus, removeEquipmentBonus } from './equipmentBonusApplier';

/**
 * 生成长期记忆总结
 */
async function generateLongTermSummary(memories: string[]): Promise<string | null> {
  try {
    const helper = getTavernHelper();
    if (!helper) return null;

    const prompt = `请将以下游戏记忆总结成一段简洁的长期记忆，保留关键信息和重要事件：\n\n${memories.join('\n\n')}\n\n总结要求：\n1. 保持第三人称视角\n2. 突出重要的修炼进展、人物关系、重大事件\n3. 控制在100字以内\n4. 使用修仙小说的语言风格`;

    const response = await helper.generate({ user_input: prompt });
    return response?.trim() || null;
  } catch (error) {
    console.warn('[记忆管理] 生成长期记忆总结失败:', error);
    return null;
  }
}

/**
 * 转移到长期记忆 - 直接操作存档数据（用于AIGameMaster.ts）
 */
async function transferToLongTermMemoryInAI(saveData: SaveData, maxMidTermMemories: number): Promise<void> {
  try {
    console.log('[记忆管理] 开始直接转移到长期记忆');

    if (!saveData?.记忆?.中期记忆) {
      console.warn('[记忆管理] 存档或中期记忆数据不可用，无法处理长期记忆转移');
      return;
    }

    const excess = saveData.记忆.中期记忆.length - maxMidTermMemories;

    if (excess > 0) {
      const oldMemories = saveData.记忆.中期记忆.splice(maxMidTermMemories);

      // 生成长期记忆总结
      const summary = await generateLongTermSummary(oldMemories);
      if (summary) {
        // 确保长期记忆结构存在
        if (!saveData.记忆.长期记忆) saveData.记忆.长期记忆 = [];

        // 添加新的总结到长期记忆开头
        saveData.记忆.长期记忆.unshift(summary);

        console.log(`[记忆管理] 总结 ${oldMemories.length} 条记忆到长期记忆，长期记忆总数: ${saveData.记忆.长期记忆.length} 条`);
      }
    }
  } catch (error) {
    console.warn('[记忆管理] 转移长期记忆失败:', error);
  }
}

/**
 * 构建发送给AI Game Master的请求对象
 * @param baseInfo 角色基础信息
 * @param creationDetails 创建详情
 * @param mapData 地图数据
 * @returns GM_Request对象
 */
export function buildGmRequest(
  baseInfo: Partial<CharacterBaseInfo>,
  creationDetails: { age?: number },
  mapData?: unknown,
  time: string = ''
): GM_Request {
  // 构建GameCharacter对象
  const character: GameCharacter = {
    identity: {
      name: baseInfo.名字 || '无名',
      title: undefined,
      age: creationDetails.age || 16,
      apparent_age: creationDetails.age || 16,
      gender: baseInfo.性别 || '男',
      description: `${baseInfo.出生 || '平民出身'}，${baseInfo.灵根 || '五行灵根'}，年龄${creationDetails.age || 16}岁`
    },
    cultivation: {
      realm: '凡人',
      realm_progress: 0,
      lifespan_remaining: 80,
      breakthrough_bottleneck: undefined
    },
    attributes: {
      STR: baseInfo.先天六司?.根骨 || 5,
      CON: baseInfo.先天六司?.根骨 || 5,
      DEX: baseInfo.先天六司?.魅力 || 5,
      INT: baseInfo.先天六司?.悟性 || 5,
      SPI: baseInfo.先天六司?.灵性 || 5,
      LUK: baseInfo.先天六司?.气运 || 5
    },
    resources: {
      qi: { current: 100, max: 100 },
      ling: { current: 0, max: 50 },
      shen: { current: 30, max: 30 }
    },
    qualities: {
      origin: {
        name: typeof baseInfo.出生 === 'string' ? baseInfo.出生 : (baseInfo.出生?.名称 || '平民出身'),
        effects: []
      },
      spiritRoot: {
        name: typeof baseInfo.灵根 === 'string' ? baseInfo.灵根 : (baseInfo.灵根?.名称 || '五行灵根'),
        quality: '普通',
        attributes: []
      },
      talents: Array.isArray(baseInfo.天赋) ? baseInfo.天赋.map((t: string | { 名称: string }) => ({
        name: typeof t === 'string' ? t : t.名称 || '未知天赋',
        type: '特殊',
        effects: []
      })) : []
    },
    skills: {},
    cultivation_arts: {},
    equipment: {
      accessories: [],
      treasures: [],
      consumables: []
    },
    social: {
      relationships: {},
      reputation: {}
    },
    hidden_state: {
      karma: {
        righteous: 0,
        demonic: 0,
        heavenly_favor: 0
      },
      dao_heart: {
        stability: 100,
        demons: [],
        enlightenment: 0
      },
      special_marks: []
    },
    status: {
      conditions: [],
      location: '未知',
      activity: '刚刚降生'
    }
  };

  // 构建世界状态
  const world = {
    lorebook: baseInfo.世界 || '修仙世界',
    mapInfo: mapData || null,
    time: time
  };

  // 构建记忆模块
  const memory = {
    short_term: [],
    mid_term: [],
    long_term: []
  };

  return {
    character,
    world,
    memory
  };
}

/**
 * [新] 批量执行酒馆命令并记录状态变更
 * @param commands 命令数组
 * @param saveData 初始存档数据
 * @returns 包含更新后存档和变更日志的对象
 */
export async function executeCommands(
  commands: { action: string; key: string; value?: unknown }[],
  saveData: SaveData
): Promise<{ saveData: SaveData; stateChanges: StateChangeLog }> {
  let updatedSaveData = cloneDeep(saveData);
  const changes: StateChangeLog['changes'] = [];

  for (const command of commands) {
    if (!command || !command.action || !command.key) continue;

    const { action, key } = command;

    // 规范化路径
    let path = key;
    if (path.startsWith('character.saveData.')) {
      path = path.substring('character.saveData.'.length);
    }

    // 🔥 核心修复：将分片路径映射为SaveData内部路径
    // AI使用分片路径(如"境界.名称"),executeCommand内部会映射为SaveData路径(如"玩家角色状态.境界.名称")
    // 所以这里必须用映射后的路径来获取oldValue/newValue,否则会获取不到值,导致变更为空
    const mappedPath = mapShardPathToSaveDataPath(path);
    const oldValue = cloneDeep(get(updatedSaveData, mappedPath));

    // 执行命令
    updatedSaveData = await executeCommand(command, updatedSaveData);

    const newValue = cloneDeep(get(updatedSaveData, mappedPath));

    // 简单比较来决定是否记录变更
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        key: mappedPath,  // 🔥 记录时使用映射后的SaveData路径,这样syncChangesToTavern可以正确识别分片
        action,
        oldValue,
        newValue,
      });
    }
  }

  // 🔥 注意：这里不同步到酒馆，由调用方决定何时同步
  // 初始化时会在最后一次性同步完整saveData
  // 游戏中会增量同步变更
  console.log('[executeCommands] 命令执行完成，共', changes.length, '个变更（未同步）');

  return {
    saveData: updatedSaveData,
    stateChanges: { changes },
  };
}


/**
 * 处理AI Game Master的响应，执行其中的酒馆命令
 * @param response GM响应对象
 * @param currentSaveData 当前存档数据
 * @param isInitialization 是否是角色初始化阶段（初始化时需要保存记忆）
 * @returns 包含更新后存档和变更日志的对象
 */
export async function processGmResponse(
  response: GM_Response,
  currentSaveData: SaveData,
  isInitialization: boolean = false
): Promise<{ saveData: SaveData; stateChanges: StateChangeLog }> {
  console.log('[processGmResponse] 开始处理GM响应，isInitialization=', isInitialization);

  const emptyChanges: StateChangeLog = { changes: [] };

  if (!response) {
    console.warn('[processGmResponse] 响应为空，返回原始数据');
    return { saveData: currentSaveData, stateChanges: emptyChanges };
  }

  let updatedSaveData = cloneDeep(currentSaveData);
  let stateChanges: StateChangeLog = emptyChanges;

  // 处理tavern_commands
  if (Array.isArray(response.tavern_commands) && response.tavern_commands.length > 0) {
    console.log(`[processGmResponse] 🎯 收到 ${response.tavern_commands.length} 个酒馆命令，开始执行...`);
    console.log('[processGmResponse] 命令详情:', response.tavern_commands);
    const result = await executeCommands(response.tavern_commands, updatedSaveData);
    updatedSaveData = result.saveData;
    stateChanges = result.stateChanges;
    // 将本次变更增量同步到酒馆，确保环境状态与本地一致
    try {
      if (stateChanges?.changes?.length) {
        console.log('[processGmResponse] 🎯 准备同步', stateChanges.changes.length, '个变更到酒馆');
        console.log('[processGmResponse] 变更详情:', stateChanges.changes.map(c => ({ key: c.key, action: c.action })));
        await syncChangesToTavern(stateChanges.changes, 'chat');
        console.log('[processGmResponse] ✅ 已同步变更到 Tavern character.saveData');
      } else {
        console.warn('[processGmResponse] ⚠️ 没有变更需要同步（stateChanges.changes为空）');
      }
    } catch (syncErr) {
      console.error('[processGmResponse] ❌ 同步变更到酒馆失败:', syncErr);
      throw syncErr; // 重新抛出错误以便上层感知
    }
    console.log('[processGmResponse] ✅ 所有命令执行完成');
  } else {
    console.log('[processGmResponse] ⚠️ 没有 tavern_commands 需要执行');
  }

  // 🔥 处理短期记忆
  // 初始化阶段：必须在这里保存，因为MainGamePanel还没加载
  // 游戏中：由MainGamePanel的addToShortTermMemory处理
  if (isInitialization && response.text) {
    if (!updatedSaveData.记忆) {
      updatedSaveData.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [] };
    }
    if (!Array.isArray(updatedSaveData.记忆.短期记忆)) {
      updatedSaveData.记忆.短期记忆 = [];
    }

    const gameTime = updatedSaveData.游戏时间;
    const timePrefix = gameTime
      ? `【仙道${gameTime.年}年${gameTime.月}月${gameTime.日}日 ${String(gameTime.小时).padStart(2, '0')}:${String(gameTime.分钟).padStart(2, '0')}】`
      : '【仙历元年】';

    const textToStore = `${timePrefix}${response.text}`;
    updatedSaveData.记忆.短期记忆.push(textToStore);
    console.log('[processGmResponse] ✅ 已添加初始化短期记忆');
    console.log('[processGmResponse] 记忆内容（前100字符）:', textToStore.substring(0, 100));
    console.log('[processGmResponse] 当前短期记忆数量:', updatedSaveData.记忆.短期记忆.length);
  } else if (!isInitialization) {
    console.log('[processGmResponse] ⚠️ 非初始化阶段，跳过短期记忆添加（由MainGamePanel处理）');
  }

  // 🔥 修复：如果有mid_term_memory，直接存入中期记忆数组，不使用缓存
  if (response.mid_term_memory && typeof response.mid_term_memory === 'string') {
    if (!updatedSaveData.记忆) {
      updatedSaveData.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [] };
    }
    if (!Array.isArray(updatedSaveData.记忆.中期记忆)) {
      updatedSaveData.记忆.中期记忆 = [];
    }

    // 格式化游戏时间
    const gameTime = updatedSaveData.游戏时间;
    const timePrefix = gameTime
      ? `【仙道${gameTime.年}年${gameTime.月}月${gameTime.日}日 ${String(gameTime.小时).padStart(2, '0')}:${String(gameTime.分钟).padStart(2, '0')}】`
      : '【未知时间】';

    const formattedMemory = `${timePrefix}${response.mid_term_memory}`;

    // 直接存入中期记忆数组
    updatedSaveData.记忆.中期记忆.unshift(formattedMemory);
    console.log('[processGmResponse] ✅ 已将mid_term_memory直接存入中期记忆');
    console.log('[processGmResponse] 中期记忆内容:', formattedMemory.substring(0, 100));
    console.log('[processGmResponse] 当前中期记忆数量:', updatedSaveData.记忆.中期记忆.length);

    // 🔥 检查中期记忆是否需要转换到长期记忆
    const maxMidTermMemories = 25; // 默认中期记忆上限
    if (updatedSaveData.记忆.中期记忆.length > maxMidTermMemories) {
      console.log('[processGmResponse] 中期记忆超出限制，准备转换到长期记忆');
      await transferToLongTermMemoryInAI(updatedSaveData, maxMidTermMemories);
    }
  }

  console.log('[processGmResponse] GM响应处理完成');
  return { saveData: updatedSaveData, stateChanges };
}

/**
 * 将分片路径转换为SaveData内部路径
 * @param shardPath AI使用的分片路径 (如: "境界.名称")
 * @returns SaveData内部路径 (如: "玩家角色状态.境界.名称")
 */
function mapShardPathToSaveDataPath(shardPath: string): string {
  // 移除可能存在的旧格式前缀
  let path = shardPath;
  if (path.startsWith('character.saveData.')) {
    path = path.substring('character.saveData.'.length);
  }

  // 分片路径映射到SaveData内部路径
  // 基础信息分片
  if (path.startsWith('基础信息.')) {
    return '角色基础信息.' + path.substring('基础信息.'.length);
  }
  if (path === '基础信息') {
    return '角色基础信息';
  }

  // 境界分片
  if (path.startsWith('境界.')) {
    return '玩家角色状态.境界.' + path.substring('境界.'.length);
  }
  if (path === '境界') {
    return '玩家角色状态.境界';
  }

  // 属性分片 (气血、灵气、神识、寿命)
  if (path.startsWith('属性.')) {
    return '玩家角色状态.' + path.substring('属性.'.length);
  }
  if (path === '属性') {
    // 这种情况很少见，但为完整性添加
    return '玩家角色状态';
  }

  // 位置分片
  if (path.startsWith('位置.')) {
    return '玩家角色状态.位置.' + path.substring('位置.'.length);
  }
  if (path === '位置') {
    return '玩家角色状态.位置';
  }

  // 修炼功法分片
  if (path.startsWith('修炼功法.') || path === '修炼功法') {
    return path; // SaveData中就叫"修炼功法"
  }

  // 装备栏分片
  if (path.startsWith('装备栏.') || path === '装备栏') {
    return path; // SaveData中就叫"装备栏"
  }

  // 背包分片
  if (path.startsWith('背包_灵石.')) {
    return '背包.灵石.' + path.substring('背包_灵石.'.length);
  }
  if (path === '背包_灵石') {
    return '背包.灵石';
  }
  if (path.startsWith('背包_物品.')) {
    return '背包.物品.' + path.substring('背包_物品.'.length);
  }
  if (path === '背包_物品') {
    return '背包.物品';
  }

  // 人物关系分片
  if (path.startsWith('人物关系.') || path === '人物关系') {
    return path; // SaveData中就叫"人物关系"
  }

  // 三千大道分片
  if (path.startsWith('三千大道.') || path === '三千大道') {
    return path; // SaveData中就叫"三千大道"
  }

  // 世界信息分片
  if (path.startsWith('世界信息.') || path === '世界信息') {
    return path; // SaveData中就叫"世界信息"
  }

  // 记忆分片（通常不带子路径，因为是数组操作）
  if (path.startsWith('记忆_短期.')) {
    return '记忆.短期记忆.' + path.substring('记忆_短期.'.length);
  }
  if (path === '记忆_短期') {
    return '记忆.短期记忆';
  }
  if (path.startsWith('记忆_中期.')) {
    return '记忆.中期记忆.' + path.substring('记忆_中期.'.length);
  }
  if (path === '记忆_中期') {
    return '记忆.中期记忆';
  }
  if (path.startsWith('记忆_长期.')) {
    return '记忆.长期记忆.' + path.substring('记忆_长期.'.length);
  }
  if (path === '记忆_长期') {
    return '记忆.长期记忆';
  }

  // 游戏时间分片
  if (path.startsWith('游戏时间.') || path === '游戏时间') {
    return path; // SaveData中就叫"游戏时间"
  }

  // 状态效果分片
  if (path.startsWith('状态效果.')) {
    return '玩家角色状态.状态效果.' + path.substring('状态效果.'.length);
  }
  if (path === '状态效果') {
    return '玩家角色状态.状态效果';
  }

  // 如果不匹配任何分片，可能是旧格式或SaveData内部路径，直接返回
  console.warn('[路径映射] 未识别的分片路径，保持原样:', path);
  return path;
}

/**
 * 执行单个酒馆命令
 * @param command 酒馆命令
 * @param saveData 存档数据
 * @returns 更新后的存档数据
 */
async function executeCommand(command: { action: string; key: string; value?: unknown }, saveData: SaveData): Promise<SaveData> {
  if (!command || !command.action || !command.key) {
    console.warn('[executeCommand] 无效命令:', command);
    return saveData;
  }

  const { action, key, value } = command;

  // 工具：限制数值到0-10（用于先天六司）
  const clamp = (n: unknown, min = 0, max = 10): number => {
    const v = typeof n === 'number' ? n : parseFloat(String(n));
    if (Number.isNaN(v)) return min;
    return Math.max(min, Math.min(max, v));
  };

  // 若是先天六司路径，按规则裁剪
  const normalizeInnateSet = (p: string, val: unknown) => {
    if (!String(p).includes('先天六司')) return val;
    try {
      // 整体对象写入
      if (typeof val === 'object' && val !== null && (String(p).endsWith('先天六司') || String(p).endsWith('先天六司.')) ) {
        const obj = { ...val } as Record<string, unknown>;
        if ('根骨' in obj) obj['根骨'] = clamp(obj['根骨']);
        if ('灵性' in obj) obj['灵性'] = clamp(obj['灵性']);
        if ('悟性' in obj) obj['悟性'] = clamp(obj['悟性']);
        if ('气运' in obj) obj['气运'] = clamp(obj['气运']);
        if ('魅力' in obj) obj['魅力'] = clamp(obj['魅力']);
        if ('心性' in obj) obj['心性'] = clamp(obj['心性']);
        return obj;
      }
      // 单字段写入
      if (typeof val === 'number') return clamp(val);
      return val;
    } catch { return val; }
  };

  // 位置描述规范化：将任意叙事式地点描述，统一为「大陆名·区域·地点」结构
  const normalizeLocationDescription = (raw: unknown, dataRoot: SaveData): { 描述: string } | unknown => {
    const worldName = (dataRoot?.['角色基础信息']?.['世界']) || '朝天大陆';

    const normalizeStr = (s: string): string => {
      let t = String(s || '').trim();
      if (!t) return `${worldName}·未知之地`;
      // 统一分隔符为 ·
      t = t
        .replace(/[，,、/\\|>]+/g, '·')
        .replace(/\s*[-—–]\s*/g, '·')
        .replace(/\s*·\s*/g, '·')
        .replace(/。/g, '')
        .replace(/\.\s*/g, '·');

      // 若仍无层级分隔，尽量从语句中抽取短语
      if (!t.includes('·')) {
        // 将句读转为层级，再去噪
        t = t.replace(/\s+/g, '·');
      }

      // 去掉常见虚词与尾缀（仅处理末段，避免破坏地名）
      const cleanup = (seg: string): string => {
        let u = seg.trim();
        u = u.replace(/的/g, '');
        u = u.replace(/[之的]?([上中下里内外处间旁畔边]{1})$/g, '');
        return u;
      };

      let parts = t.split('·').map(x => x.trim()).filter(Boolean).map(cleanup);
      // 去重空段
      parts = parts.filter(Boolean);

      // 确保首段为大陆名
      if (parts.length === 0) parts = ['未知之地'];
      if (parts[0] !== worldName) {
        parts.unshift(worldName);
      }

      // 限制总段数为 2~3（含大陆名）
      if (parts.length > 3) {
        parts = parts.slice(0, 3);
      }

      return parts.join('·');
    };

    // 支持直接字符串或对象 { 描述: string }
    if (typeof raw === 'string') {
      return normalizeStr(raw);
    }
    if (raw && typeof raw === 'object' && '描述' in raw) {
      const obj = raw as Record<string, unknown>;
      if (typeof obj['描述'] === 'string') {
        return { ...obj, 描述: normalizeStr(obj['描述']) };
      }
    }
    return raw;
  };

  // 规范化：当AI写入物品(尤其功法)时，自动校正品质与品级
  const normalizeItemIfNeeded = (val: unknown) => {
    try {
      if (!val || typeof val !== 'object') return val;
      const item = val as Record<string, unknown>;
      const type = (item.类型 as string || '').trim();
      if (!['装备', '功法', '其他'].includes(type)) return val;

      // 品质规范化
      const qualityMap: Record<string, string> = {
        '凡品': '凡', '凡阶': '凡', '凡': '凡',
        '黄品': '黄', '黄阶': '黄', '黄': '黄',
        '玄品': '玄', '玄阶': '玄', '玄': '玄',
        '地品': '地', '地阶': '地', '地': '地',
        '天品': '天', '天阶': '天', '天': '天',
        '仙品': '仙', '仙阶': '仙', '仙': '仙',
        '神品': '神', '神阶': '神', '神': '神'
      };
      const gradeTextToNumber: Record<string, number> = {
        '残缺': 0, '下品': 2, '中品': 5, '上品': 8, '极品': 10
      };
      const q = (item.品质 as Record<string, unknown>) || {};
      const rawQ = String(q.quality ?? q.品质 ?? '').trim();
      const normQuality = qualityMap[rawQ] || '凡';
      const rawG = (q.grade ?? q.品级 ?? q.等级);
      let normGrade = 1;
      if (typeof rawG === 'number' && !Number.isNaN(rawG)) {
        normGrade = Math.min(10, Math.max(0, Math.round(rawG)));
      } else if (typeof rawG === 'string' && rawG.trim()) {
        normGrade = gradeTextToNumber[rawG.trim()] ?? 1;
      }
      item.品质 = { quality: normQuality, grade: normGrade };

      // 确保装备类物品有已装备字段
      if (type === '装备' || type === '功法') {
        if (item.已装备 === undefined) {
          item.已装备 = false;
        }

        // 清理重复的装备状态字段，只保留"已装备"字段
        if (item.是否装备 !== undefined) {
          console.warn('[物品规范化] 发现重复的装备状态字段"是否装备"，已清理');
          delete item.是否装备;
        }
      }

      // 确保有物品ID字段
      if (!item.物品ID) {
        item.物品ID = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      return item;
    } catch {
      return val;
    }
  };

  // 🔥 核心修复：将分片路径映射到SaveData内部路径
  const path = mapShardPathToSaveDataPath(key);

  console.log(`[executeCommand] ========== 开始执行命令 ==========`);
  console.log(`[executeCommand] 原始路径: ${key}`);
  console.log(`[executeCommand] 映射路径: ${path}`);
  console.log(`[executeCommand] 动作: ${action}`);
  console.log(`[executeCommand] 值:`, value);
  console.log(`[executeCommand] 值类型:`, typeof value);

  try {
    // 🔥 [装备增幅系统] 在set之前，获取装备栏旧值（用于移除旧装备加成）
    let oldEquipmentItemId: string | null = null;
    if (action === 'set' && path.startsWith('装备栏.装备')) {
      oldEquipmentItemId = get(saveData, path) as string | null;
      console.log(`[装备增幅] 准备变更 ${path}，旧装备ID: ${oldEquipmentItemId || '无'}`);
    }

    switch (action) {
      case 'set':
        // 若写入物品或功法，先做一次品质规范化
        if (String(path).includes('背包.物品') || String(path).includes('修炼功法.功法')) {
          set(saveData, path, normalizeItemIfNeeded(value));
          console.log(`[executeCommand] ✅ 已设置(规范化物品/功法):`, get(saveData, path));
        } else {
          // 当写入位置时，做格式化：「大陆名·区域·地点」
          if (String(path).endsWith('玩家角色状态.位置.描述') || String(path).endsWith('位置.描述')) {
            set(saveData, path, normalizeLocationDescription(value, saveData));
            console.log(`[executeCommand] ✅ 已设置(规范化位置):`, get(saveData, path));
          } else if (String(path).endsWith('玩家角色状态.位置')) {
            set(saveData, path, normalizeLocationDescription(value, saveData));
            console.log(`[executeCommand] ✅ 已设置(规范化位置对象):`, get(saveData, path));
          } else {
            // 先天六司写入时裁剪到<=10（NPC与玩家均适用）
            const finalVal = normalizeInnateSet(path, value);
            set(saveData, path, finalVal);
            console.log(`[executeCommand] ✅ 已设置:`, get(saveData, path));
          }
        }

        // [特例修复] 当设置大道进度时，自动将其添加到已解锁大道数组中
        if (path.startsWith('三千大道.大道进度.')) {
          try {
            const daoName = path.substring('三千大道.大道进度.'.length);
            const unlockedDaos = get(saveData, '三千大道.已解锁大道', []) as string[];
            if (Array.isArray(unlockedDaos) && !unlockedDaos.includes(daoName)) {
              unlockedDaos.push(daoName);
              set(saveData, '三千大道.已解锁大道', unlockedDaos);
              console.log(`[executeCommand] 特例：已自动解锁大道 "${daoName}"`);
            }
          } catch (e) {
            console.error('[executeCommand] 自动解锁大道失败:', e);
          }
        }

        // 🔥 [装备增幅系统] 当装备栏变更时，自动应用/移除装备属性加成
        if (path.startsWith('装备栏.装备')) {
          try {
            const newItemId = String(value || '');

            console.log(`[装备增幅] 检测到装备栏变更: ${path}`);
            console.log(`[装备增幅] 旧装备ID: ${oldEquipmentItemId || '无'}`);
            console.log(`[装备增幅] 新装备ID: ${newItemId || '无'}`);

            // 如果旧装备存在，移除其属性加成
            if (oldEquipmentItemId && oldEquipmentItemId !== 'null' && oldEquipmentItemId !== newItemId) {
              console.log(`[装备增幅] 移除旧装备 ${oldEquipmentItemId} 的属性加成`);
              removeEquipmentBonus(saveData, oldEquipmentItemId);
            }

            // 如果新装备存在，应用其属性加成
            if (newItemId && newItemId !== 'null' && newItemId !== oldEquipmentItemId) {
              console.log(`[装备增幅] 应用新装备 ${newItemId} 的属性加成`);
              applyEquipmentBonus(saveData, newItemId);
            }
          } catch (e) {
            console.error('[装备增幅] 处理装备增幅失败:', e);
          }
        }
        break;

      case 'add':
        const currentValue = get(saveData, path, 0);
        let added = Number(currentValue) + Number(value || 0);
        // 若针对先天六司，裁剪到<=10
        if (String(path).includes('先天六司')) added = clamp(added);

        // 🔥 特殊处理：游戏时间自动进位
        if (path === '游戏时间.分钟' || path.endsWith('游戏时间.分钟')) {
          console.log(`[executeCommand] 🕐 游戏时间增加 ${value} 分钟，开始自动进位计算`);

          // 获取当前游戏时间
          const gameTime = get(saveData, '游戏时间', { 年: 1, 月: 1, 日: 1, 小时: 0, 分钟: 0 }) as {
            年: number;
            月: number;
            日: number;
            小时: number;
            分钟: number;
          };

          // 计算新的总分钟数
          const totalMinutes = gameTime.分钟 + Number(value || 0);

          // 进位计算
          let 新小时 = gameTime.小时;
          let 新日 = gameTime.日;
          let 新月 = gameTime.月;
          let 新年 = gameTime.年;
          let 新分钟 = totalMinutes;

          // 分钟 → 小时
          if (新分钟 >= 60) {
            新小时 += Math.floor(新分钟 / 60);
            新分钟 = 新分钟 % 60;
          }

          // 小时 → 天
          if (新小时 >= 24) {
            新日 += Math.floor(新小时 / 24);
            新小时 = 新小时 % 24;
          }

          // 天 → 月 (假设每月30天)
          if (新日 > 30) {
            新月 += Math.floor((新日 - 1) / 30);
            新日 = ((新日 - 1) % 30) + 1;
          }

          // 月 → 年 (假设每年12个月)
          if (新月 > 12) {
            新年 += Math.floor((新月 - 1) / 12);
            新月 = ((新月 - 1) % 12) + 1;
          }

          // 更新整个游戏时间对象
          set(saveData, '游戏时间', {
            年: 新年,
            月: 新月,
            日: 新日,
            小时: 新小时,
            分钟: 新分钟
          });

          console.log(`[executeCommand] ✅ 游戏时间已更新: ${新年}年${新月}月${新日}日 ${新小时}:${新分钟}`);
          console.log(`[executeCommand]   原时间: ${gameTime.年}年${gameTime.月}月${gameTime.日}日 ${gameTime.小时}:${gameTime.分钟}`);
          console.log(`[executeCommand]   增加: ${value}分钟`);
        } else {
          set(saveData, path, added);
          console.log(`[executeCommand] ✅ 已增加: ${currentValue} + ${value} = ${added}`);
        }
        break;

      case 'push':
        const array = get(saveData, path, []) as unknown[];
        if (Array.isArray(array)) {
          array.push(value ?? null);
          console.log(`[executeCommand] ✅ 已添加到数组，当前长度:`, array.length);
        } else {
          set(saveData, path, [value ?? null]);
          console.log(`[executeCommand] ✅ 已创建新数组并添加元素`);
        }
        break;
        
      case 'pull':
        {
          const pullArray = get(saveData, path, []) as unknown[];
          if (Array.isArray(pullArray)) {
            const deepEqual = (a: unknown, b: unknown): boolean => {
              try { return JSON.stringify(a) === JSON.stringify(b); } catch { return a === b; }
            };
            let removed = false;
            // 1) 直接匹配（适用于原始类型，或同引用的对象）
            let idx = pullArray.indexOf(value);
            if (idx > -1) {
              pullArray.splice(idx, 1);
              removed = true;
            }
            // 2) 深度相等匹配（用于对象值）
            if (!removed && typeof value === 'object' && value !== null) {
              idx = pullArray.findIndex((it) => deepEqual(it, value));
              if (idx > -1) {
                pullArray.splice(idx, 1);
                removed = true;
              }
            }
            // 3) 通过标识符匹配（常见：物品ID/名称/状态名称）
            if (!removed && (typeof value === 'string' || typeof value === 'number')) {
              const v = String(value);
              const keyCandidates = ['物品ID', '名称', '状态名称', 'id', 'name'];
              idx = pullArray.findIndex((it) => {
                if (it && typeof it === 'object') {
                  return keyCandidates.some(k => String((it as Record<string, unknown>)[k] ?? '') === v);
                }
                return String(it) === v;
              });
              if (idx > -1) {
                pullArray.splice(idx, 1);
                removed = true;
              }
            }
          }
        }
        break;

      case 'delete':
        {
          // 支持删除数组索引（以 [...][index] 结尾时使用 splice 保持数组紧凑）
          const arrayIndexMatch = String(path).match(/^(.*)\[(\d+)\]$/);
          if (arrayIndexMatch) {
            const basePath = arrayIndexMatch[1];
            const index = parseInt(arrayIndexMatch[2], 10);
            const arr = get(saveData, basePath, undefined) as unknown[] | undefined;
            if (Array.isArray(arr) && index >= 0 && index < arr.length) {
              arr.splice(index, 1);
            } else {
              unset(saveData, path);
            }
          } else {
            unset(saveData, path);
          }
        }
        break;
        
      default:
        console.warn('[executeCommand] 未知命令类型:', action);
    }
  } catch (error) {
    console.error('[executeCommand] 命令执行失败:', error);
  }

  return saveData;
}

/**
 * 同步数据到酒馆变量（使用分片存储）
 * @param saveData 存档数据
 * @param scope 变量作用域
 */
export async function syncToTavern(saveData: SaveData, scope: 'global' | 'chat' = 'chat'): Promise<void> {
  try {
    const helper = getTavernHelper();
    if (!helper) {
      console.warn('[syncToTavern] 酒馆助手不可用');
      return;
    }

    // 将saveData拆分为16个分片
    const shards = shardSaveData(saveData);

    // 一次性写入所有分片 (通过unknown中转以避免类型转换错误)
    await helper.insertOrAssignVariables(shards as unknown as Record<string, unknown>, { type: scope });

    console.log('[syncToTavern] 数据同步完成 (16个分片)');
  } catch (error) {
    console.error('[syncToTavern] 数据同步失败:', error);
  }
}

/**
 * 根据路径确定所属分片名称
 * @param path 数据路径,如 "玩家角色状态.境界.名称"
 * @returns 分片名称,如 "境界"
 */
function getShardNameFromPath(path: string): keyof StorageShards | null {
  // 移除可能的前缀
  let normalizedPath = path;
  if (normalizedPath.startsWith('character.saveData.')) {
    normalizedPath = normalizedPath.substring('character.saveData.'.length);
  }

  // 路径映射到分片名称
  if (normalizedPath.startsWith('角色基础信息')) return '基础信息';
  if (normalizedPath.startsWith('玩家角色状态.境界')) return '境界';
  if (normalizedPath.startsWith('玩家角色状态.气血') ||
      normalizedPath.startsWith('玩家角色状态.灵气') ||
      normalizedPath.startsWith('玩家角色状态.神识') ||
      normalizedPath.startsWith('玩家角色状态.寿命')) return '属性';
  if (normalizedPath.startsWith('玩家角色状态.位置')) return '位置';
  if (normalizedPath.startsWith('修炼功法')) return '修炼功法';
  if (normalizedPath.startsWith('装备栏')) return '装备栏';
  if (normalizedPath.startsWith('背包.灵石')) return '背包_灵石';
  if (normalizedPath.startsWith('背包.物品')) return '背包_物品';
  if (normalizedPath.startsWith('人物关系')) return '人物关系';
  if (normalizedPath.startsWith('三千大道')) return '三千大道';
  if (normalizedPath.startsWith('世界信息')) return '世界信息';
  if (normalizedPath.startsWith('记忆.短期记忆')) return '记忆_短期';
  if (normalizedPath.startsWith('记忆.中期记忆')) return '记忆_中期';
  if (normalizedPath.startsWith('记忆.长期记忆')) return '记忆_长期';
  if (normalizedPath.startsWith('游戏时间')) return '游戏时间';
  if (normalizedPath.startsWith('玩家角色状态.状态效果')) return '状态效果';

  return null;
}

/**
 * 将SaveData格式的路径转换为分片内部路径
 * @param path 完整路径,如 "玩家角色状态.境界.名称"
 * @param shardName 分片名称
 * @returns 分片内部路径,如 "名称"
 */
function getPathInShard(path: string, shardName: string): string {
  let normalizedPath = path;
  if (normalizedPath.startsWith('character.saveData.')) {
    normalizedPath = normalizedPath.substring('character.saveData.'.length);
  }

  // 移除分片对应的SaveData路径前缀
  const prefixMap: Record<string, string> = {
    '基础信息': '角色基础信息.',
    '境界': '玩家角色状态.境界.',
    '属性': '玩家角色状态.',
    '位置': '玩家角色状态.位置.',
    '修炼功法': '修炼功法.',
    '装备栏': '装备栏.',
    '背包_灵石': '背包.灵石.',
    '背包_物品': '背包.物品.',
    '人物关系': '人物关系.',
    '三千大道': '三千大道.',
    '世界信息': '世界信息.',
    '记忆_短期': '记忆.短期记忆',
    '记忆_中期': '记忆.中期记忆',
    '记忆_长期': '记忆.长期记忆',
    '游戏时间': '游戏时间.',
    '状态效果': '玩家角色状态.状态效果',
  };

  const prefix = prefixMap[shardName];
  if (prefix && normalizedPath.startsWith(prefix)) {
    // 对于属性分片,需要特殊处理
    if (shardName === '属性') {
      // "玩家角色状态.气血.当前" -> "气血.当前"
      const afterPrefix = normalizedPath.substring('玩家角色状态.'.length);
      return afterPrefix;
    }
    return normalizedPath.substring(prefix.length);
  }

  return normalizedPath;
}

/**
 * 增量同步变更到酒馆（使用分片存储）
 * @param changes 变更列表
 * @param scope 变量作用域
 */
export async function syncChangesToTavern(changes: StateChange[], scope: 'global' | 'chat' = 'chat'): Promise<void> {
  try {
    console.log('[syncChangesToTavern] ========== 开始同步到酒馆 ==========');
    console.log('[syncChangesToTavern] 需要同步的变更数量:', changes.length);

    const helper = getTavernHelper();
    if (!helper) {
      console.warn('[syncChangesToTavern] 酒馆助手不可用');
      return;
    }

    if (changes.length === 0) {
      console.log('[syncChangesToTavern] 无变更需要同步');
      return;
    }

    // 按分片分组变更
    const shardChanges: Record<string, StateChange[]> = {};

    for (const change of changes) {
      const shardName = getShardNameFromPath(change.key);
      console.log(`[syncChangesToTavern] 路径 "${change.key}" -> 分片 "${shardName}"`);

      if (!shardName) {
        console.warn('[syncChangesToTavern] ⚠️ 无法确定分片:', change.key);
        continue;
      }

      if (!shardChanges[shardName]) {
        shardChanges[shardName] = [];
      }
      shardChanges[shardName].push(change);
    }

    console.log(`[syncChangesToTavern] 分片分组完成，共 ${Object.keys(shardChanges).length} 个分片受影响:`, Object.keys(shardChanges));

    // 对每个受影响的分片进行更新
    for (const [shardName, changes] of Object.entries(shardChanges)) {
      console.log(`[syncChangesToTavern] 处理分片 "${shardName}"，包含 ${changes.length} 个变更`);
      let currentShard = await helper.getVariable(shardName, { type: scope });

      // 如果分片不存在,创建空对象/数组
      if (!currentShard) {
        // 记忆分片是数组,其他是对象
        currentShard = shardName.startsWith('记忆_') ? [] : {};
        console.log(`[syncChangesToTavern] 分片不存在，创建新的:`, shardName.startsWith('记忆_') ? '数组' : '对象');
      }

      // 应用变更到分片
      for (const change of changes) {
        const pathInShard = getPathInShard(change.key, shardName);
        console.log(`[syncChangesToTavern]   应用变更: 路径="${pathInShard}", 值=`, change.newValue);

        // 如果是记忆分片且路径为空,直接赋值整个数组
        if (shardName.startsWith('记忆_') && !pathInShard) {
          currentShard = change.newValue;
          console.log(`[syncChangesToTavern]   ✅ 替换整个记忆数组`);
        } else {
          set(currentShard as object, pathInShard, change.newValue);
          console.log(`[syncChangesToTavern]   ✅ 已设置 ${pathInShard}`);
        }
      }

      // 更新分片
      await helper.setVariable(shardName, currentShard, { type: scope });
      console.log(`[syncChangesToTavern] ✅ 分片 "${shardName}" 已更新到酒馆`);
    }

    console.log(`[syncChangesToTavern] 同步完成，更新了 ${changes.length} 个字段到 ${Object.keys(shardChanges).length} 个分片`);
  } catch (error) {
    console.error('[syncChangesToTavern] 同步失败:', error);
  }
}

/**
 * 从酒馆变量获取数据（仅使用分片存储）
 * @param scope 变量作用域
 * @returns 重组的完整SaveData
 */
export async function getFromTavern(scope: 'global' | 'chat' = 'chat'): Promise<SaveData | null> {
  try {
    const helper = getTavernHelper();
    if (!helper) {
      console.warn('[getFromTavern] 酒馆助手不可用');
      return null;
    }

    const variables = await helper.getVariables({ type: scope });

    // 从分片重组SaveData
    const shards: Partial<StorageShards> = {
      '基础信息': variables['基础信息'] as StorageShards['基础信息'],
      '境界': variables['境界'] as StorageShards['境界'],
      '属性': variables['属性'] as StorageShards['属性'],
      '位置': variables['位置'] as StorageShards['位置'],
      '修炼功法': variables['修炼功法'] as StorageShards['修炼功法'],
      '装备栏': variables['装备栏'] as StorageShards['装备栏'],
      '背包_灵石': variables['背包_灵石'] as StorageShards['背包_灵石'],
      '背包_物品': variables['背包_物品'] as StorageShards['背包_物品'],
      '人物关系': variables['人物关系'] as StorageShards['人物关系'],
      '三千大道': variables['三千大道'] as StorageShards['三千大道'],
      '世界信息': variables['世界信息'] as StorageShards['世界信息'],
      '记忆_短期': variables['记忆_短期'] as StorageShards['记忆_短期'],
      '记忆_中期': variables['记忆_中期'] as StorageShards['记忆_中期'],
      '记忆_长期': variables['记忆_长期'] as StorageShards['记忆_长期'],
      '游戏时间': variables['游戏时间'] as StorageShards['游戏时间'],
      '状态效果': variables['状态效果'] as StorageShards['状态效果'],
    };

    // 从分片重组SaveData
    console.log('[getFromTavern] 从16个分片重组SaveData');
    return assembleSaveData(shards);
  } catch (error) {
    console.error('[getFromTavern] 获取数据失败:', error);
    return null;
  }
}