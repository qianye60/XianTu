/**
 * SaveData分片存储工具
 * 将巨大的SaveData拆分为多个独立的chat变量，解决token爆炸问题
 *
 * 核心优势:
 * - 精准访问: 只读取需要的字段
 * - 真正增量更新: 直接修改单个分片
 * - 路径简化: 境界.名称 vs character.saveData.玩家角色状态.境界.名称
 * - Token节省: AI请求从20k降至1.5k tokens
 */

import type { CharacterBaseInfo, InnateAttributes, Realm, SaveData, ValuePair, WorldInfo } from '@/types/game';
import type { TavernHelper } from './tavernCore';
import { debug } from './debug';

// 定义分片结构 - 使用最简洁的路径格式
export interface StorageShards {
  '基础信息': {
    名字: string;
    世界: string;
    天资: string;
    出生: CharacterBaseInfo['出生'];
    灵根: CharacterBaseInfo['灵根'];
    天赋: CharacterBaseInfo['天赋'];
    先天六司: InnateAttributes;
  };
  '境界': Realm;
  '属性': {
    气血: ValuePair<number>;
    灵气: ValuePair<number>;
    神识: ValuePair<number>;
    寿命: ValuePair<number>;
  };
  '位置': SaveData['玩家角色状态']['位置'];
  '修炼功法': SaveData['修炼功法'];
  '掌握技能': SaveData['掌握技能']; // 新增：掌握的技能列表
  '装备栏': SaveData['装备栏'];
  '背包_灵石': SaveData['背包']['灵石'];
  '背包_物品': SaveData['背包']['物品'];
  '人物关系': SaveData['人物关系'];
  '三千大道': SaveData['三千大道'];
  '世界信息': WorldInfo;
  '记忆_短期': string[];
  '记忆_中期': string[];
  '记忆_长期': string[];
  '记忆_隐式中期': string[]; // 新增：隐式中期记忆分片
  '游戏时间': SaveData['游戏时间'];
  '状态效果': Array<{
    状态名称: string;
    类型: "buff" | "debuff";
    生成时间: {
      年: number;
      月: number;
      日: number;
      小时: number;
      分钟: number;
    };
    持续时间分钟: number;
    状态描述: string;
    强度?: number;
    来源?: string;
  }>;
}

/**
 * 将完整SaveData拆分为分片
 */
export function shardSaveData(saveData: SaveData): StorageShards {
  // 安全访问可选字段
  const baseInfo = saveData.角色基础信息 || {
    名字: '未知修士',
    世界: '未知世界',
    天资: '普通',
    出生: '散修',
    灵根: '无',
    天赋: [],
    先天六司: { 根骨: 5, 灵性: 5, 悟性: 5, 气运: 5, 魅力: 5, 心性: 5 },
  };

  const worldInfo = saveData.世界信息 || {
    世界名称: '修仙界',
    世界背景: '一个广阔的修仙世界',
    大陆信息: [],
    势力信息: [],
    地点信息: [],
    生成时间: new Date().toISOString(),
    世界纪元: '开元',
    特殊设定: [],
    版本: '1.0',
  };

  return {
    '基础信息': {
      名字: baseInfo.名字,
      世界: baseInfo.世界,
      天资: baseInfo.天资,
      出生: baseInfo.出生,
      灵根: baseInfo.灵根,
      天赋: baseInfo.天赋,
      先天六司: baseInfo.先天六司,
    },
    '境界': saveData.玩家角色状态.境界,
    '属性': {
      气血: saveData.玩家角色状态.气血,
      灵气: saveData.玩家角色状态.灵气,
      神识: saveData.玩家角色状态.神识,
      寿命: saveData.玩家角色状态.寿命,
    },
    '位置': saveData.玩家角色状态.位置,
    '修炼功法': saveData.修炼功法,
    '掌握技能': saveData.掌握技能 || [], // 新增：掌握的技能列表
    '装备栏': saveData.装备栏,
    '背包_灵石': saveData.背包.灵石,
    '背包_物品': saveData.背包.物品,
    '人物关系': saveData.人物关系,
    '三千大道': saveData.三千大道 || { 已解锁大道: [], 大道进度: {}, 大道路径定义: {} },
    '世界信息': worldInfo,
    '记忆_短期': saveData.记忆.短期记忆,
    '记忆_中期': saveData.记忆.中期记忆,
    '记忆_长期': saveData.记忆.长期记忆,
    '记忆_隐式中期': saveData.记忆.隐式中期记忆 || [], // 新增：隐式中期记忆分片
    '游戏时间': saveData.游戏时间,
    '状态效果': saveData.玩家角色状态.状态效果 || [],
  };
}

/**
 * 从分片重组完整SaveData
 */
export function assembleSaveData(shards: Partial<StorageShards>): SaveData {
  if (!shards['基础信息']) {
    throw new Error('[分片存储] 缺少必需的基础信息分片');
  }

  const baseInfo = shards['基础信息']!;
  const realm = shards['境界'] || { 名称: '凡人', 阶段: '第0层', 当前进度: 0, 下一级所需: 100, 突破描述: '无' };
  const attrs = shards['属性'] || {
    气血: { 当前: 100, 最大: 100 },
    灵气: { 当前: 100, 最大: 100 },
    神识: { 当前: 50, 最大: 50 },
    寿命: { 当前: 0, 最大: 80 },
  };

  const saveData: SaveData = {
    角色基础信息: {
      名字: baseInfo.名字,
      性别: '未知', // 添加缺失的必填字段
      世界: baseInfo.世界,
      天资: baseInfo.天资,
      出生: baseInfo.出生,
      灵根: baseInfo.灵根,
      天赋: baseInfo.天赋,
      先天六司: baseInfo.先天六司,
    },
    玩家角色状态: {
      境界: realm,
      声望: 0, // 添加缺失的必填字段
      气血: attrs.气血,
      灵气: attrs.灵气,
      神识: attrs.神识,
      寿命: attrs.寿命,
      位置: shards['位置'] || { 描述: '未知' },
      状态效果: shards['状态效果'] || [],
    },
    修炼功法: shards['修炼功法'] || { 功法: null, 正在修炼: false, 修炼进度: 0, 熟练度: 0, 已解锁技能: [], 修炼时间: 0, 突破次数: 0 },
    掌握技能: shards['掌握技能'] || [], // 新增：掌握的技能列表
    装备栏: shards['装备栏'] || { 装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null },
    背包: {
      灵石: shards['背包_灵石'] || { 下品: 0, 中品: 0, 上品: 0, 极品: 0 },
      物品: shards['背包_物品'] || {},
    },
    人物关系: shards['人物关系'] || {},
    宗门系统: { availableSects: [], sectRelationships: {}, sectHistory: [] }, // 添加缺失的必填字段
    三千大道: shards['三千大道'] || { 已解锁大道: [], 大道进度: {}, 大道路径定义: {} },
    世界信息: shards['世界信息'] || {
      世界名称: '修仙界',
      世界背景: '一个广阔的修仙世界',
      大陆信息: [],
      势力信息: [],
      地点信息: [],
      生成时间: new Date().toISOString(),
      世界纪元: '开元',
      特殊设定: [],
      版本: '1.0',
      // 地图配置是可选的，默认不提供
    },
    记忆: {
      短期记忆: shards['记忆_短期'] || [],
      中期记忆: shards['记忆_中期'] || [],
      长期记忆: shards['记忆_长期'] || [],
      隐式中期记忆: shards['记忆_隐式中期'] || [], // 新增：隐式中期记忆
    },
    游戏时间: shards['游戏时间'] || { 年: 1, 月: 1, 日: 1, 小时: 0, 分钟: 0 },
  };

  return saveData;
}

/**
 * 从SaveData中获取指定分片的数据 (使用函数重载确保类型安全)
 */
export function getShardFromSaveData<K extends keyof StorageShards>(saveData: SaveData, shardKey: K): StorageShards[K] | null;
export function getShardFromSaveData(saveData: SaveData, shardKey: keyof StorageShards): StorageShards[keyof StorageShards] | null {
  switch (shardKey) {
    case '基础信息':
      return saveData.角色基础信息 ? {
        ...saveData.角色基础信息,
      } : null;
    case '境界':
      return saveData.玩家角色状态.境界;
    case '属性':
      return {
        气血: saveData.玩家角色状态.气血,
        灵气: saveData.玩家角色状态.灵气,
        神识: saveData.玩家角色状态.神识,
        寿命: saveData.玩家角色状态.寿命,
      };
    case '位置':
      return saveData.玩家角色状态.位置;
    case '修炼功法':
      return saveData.修炼功法;
    case '掌握技能': // 🔥 修复：添加掌握技能分片的获取逻辑
      return saveData.掌握技能;
    case '装备栏':
      return saveData.装备栏;
    case '背包_灵石':
      return saveData.背包.灵石;
    case '背包_物品':
      return saveData.背包.物品;
    case '人物关系':
      return saveData.人物关系;
    case '三千大道':
      return saveData.三千大道;
    case '世界信息':
      return saveData.世界信息 ?? null;
    case '记忆_短期':
      return saveData.记忆.短期记忆;
    case '记忆_中期':
      return saveData.记忆.中期记忆;
    case '记忆_长期':
      return saveData.记忆.长期记忆;
    case '记忆_隐式中期':
      return saveData.记忆.隐式中期记忆 || []; // 新增：隐式中期记忆分片获取
    case '游戏时间':
      return saveData.游戏时间;
    case '状态效果':
      return saveData.玩家角色状态.状态效果;
    default:
      return null;
  }
}

/**
 * 检查是否存在旧格式的SaveData
 */
export async function hasLegacySaveData(helper: TavernHelper): Promise<boolean> {
  try {
    const legacyData = await helper.getVariable('character.saveData', { type: 'chat' });
    return !!legacyData;
  } catch {
    return false;
  }
}

/**
 * 将旧格式SaveData迁移到新的分片格式
 */
export async function migrateLegacyToShards(helper: TavernHelper): Promise<void> {
  debug.log('分片存储', '开始迁移旧格式数据...');

  const legacyData = await helper.getVariable('character.saveData', { type: 'chat' });
  if (!legacyData || typeof legacyData !== 'object') {
    debug.warn('分片存储', '未找到有效的旧格式数据');
    return;
  }

  const saveData = legacyData as SaveData;
  const shards = shardSaveData(saveData);
  await saveAllShards(shards, helper);

  // 删除旧的character.saveData变量
  try {
    await helper.deleteVariable('character.saveData', { type: 'chat' });
    debug.log('分片存储', '已删除旧的character.saveData变量');
  } catch (error) {
    debug.warn('分片存储', '删除旧变量失败', error);
  }

  debug.log('分片存储', '迁移完成');
}

/**
 * 保存所有分片到酒馆
 */
export async function saveAllShards(
  shards: StorageShards,
  helper: TavernHelper
): Promise<void> {
  // 逐个保存，避免insertOrAssignVariables对整个对象进行structuredClone
  const successKeys: string[] = [];
  const failedKeys: string[] = [];

  for (const [key, value] of Object.entries(shards)) {
    try {
      // 序列化为JSON字符串，避免structuredClone问题
      const serialized = JSON.stringify(value);

      // 尝试保存
      await helper.setVariable(key, serialized, { type: 'chat' });
      successKeys.push(key);

    } catch (error) {
      failedKeys.push(key);
      const errorMsg = error instanceof Error ? error.message : String(error);

      // 详细记录失败信息
      console.error(`[分片存储] 保存分片"${key}"失败:`, {
        error: errorMsg,
        valueType: typeof value,
        valueKeys: value && typeof value === 'object' ? Object.keys(value) : 'N/A',
        serializedLength: JSON.stringify(value).length
      });

      // 如果是structuredClone错误，仅警告；其他错误则抛出
      if (!errorMsg.includes('structuredClone') && !errorMsg.includes('DataCloneError')) {
        throw error;
      }
    }
  }

  debug.log('分片存储', `已保存 ${successKeys.length}/${Object.keys(shards).length} 个分片`);
  if (failedKeys.length > 0) {
    debug.warn('分片存储', `以下分片因TavernHelper限制未能同步: ${failedKeys.join(', ')}`);
  }
}

/**
 * 从酒馆加载所有分片
 */
export async function loadAllShards(helper: TavernHelper): Promise<Partial<StorageShards>> {
  const allVars = await helper.getVariables({ type: 'chat' });
  const shards: Partial<StorageShards> = {};

  const shardKeys: (keyof StorageShards)[] = [
    '基础信息',
    '境界',
    '属性',
    '位置',
    '修炼功法',
    '掌握技能', // 🔥 修复：添加缺失的掌握技能分片
    '装备栏',
    '背包_灵石',
    '背包_物品',
    '人物关系',
    '三千大道',
    '世界信息',
    '记忆_短期',
    '记忆_中期',
    '记忆_长期',
    '记忆_隐式中期', // 新增：隐式中期记忆分片
    '游戏时间',
    '状态效果',
  ];

  for (const key of shardKeys) {
    if (key in allVars) {
      const value = allVars[key];
      // 反序列化JSON字符串
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (shards as any)[key] = typeof value === 'string' ? JSON.parse(value) : value;
    }
  }

  debug.log('分片存储', `已加载 ${Object.keys(shards).length} 个分片`);
  return shards;
}

/**
 * 增量更新单个分片
 */
export async function updateShard<K extends keyof StorageShards>(
  key: K,
  value: StorageShards[K],
  helper: TavernHelper
): Promise<void> {
  // 序列化为JSON字符串，避免structuredClone问题
  await helper.setVariable(key, JSON.stringify(value), { type: 'chat' });
  debug.log('分片存储', `已更新分片: ${key}`);
}

/**
 * 批量更新多个分片
 */
export async function updateShards(
  updates: Partial<StorageShards>,
  helper: TavernHelper
): Promise<void> {
  // 逐个更新，避免insertOrAssignVariables对整个对象进行structuredClone
  for (const [key, value] of Object.entries(updates)) {
    // 序列化为JSON字符串，避免structuredClone问题
    await helper.setVariable(key, JSON.stringify(value), { type: 'chat' });
  }
  debug.log('分片存储', `已批量更新 ${Object.keys(updates).length} 个分片`);
}

/**
 * 清除所有分片（用于退出游戏或切换角色）
 */
export async function clearAllShards(helper: TavernHelper): Promise<void> {
  const shardKeys: (keyof StorageShards)[] = [
    '基础信息',
    '境界',
    '属性',
    '位置',
    '修炼功法',
    '掌握技能', // 🔥 修复：添加缺失的掌握技能分片
    '装备栏',
    '背包_灵石',
    '背包_物品',
    '人物关系',
    '三千大道',
    '世界信息',
    '记忆_短期',
    '记忆_中期',
    '记忆_长期',
    '记忆_隐式中期', // 新增：隐式中期记忆分片
    '游戏时间',
    '状态效果',
  ];

  for (const key of shardKeys) {
    try {
      await helper.deleteVariable(key, { type: 'chat' });
    } catch (error) {
      debug.warn('分片存储', `清除分片失败: ${key}`, error);
    }
  }

  debug.log('分片存储', '已清除所有分片');
}

/**
 * 路径映射: 旧路径 -> 新分片路径
 * 用于迁移旧的tavern_commands
 */
export function mapOldPathToShard(oldPath: string): {
  shardKey: keyof StorageShards;
  subPath: string;
} | null {
  // 移除 character.saveData. 前缀
  const cleanPath = oldPath.replace(/^character\.saveData\./, '');

  // 映射规则
  if (cleanPath.startsWith('角色基础信息.')) {
    return { shardKey: '基础信息', subPath: cleanPath.substring('角色基础信息.'.length) };
  }
  if (cleanPath.startsWith('玩家角色状态.境界')) {
    const subPath = cleanPath.substring('玩家角色状态.境界'.length);
    return { shardKey: '境界', subPath: subPath.startsWith('.') ? subPath.substring(1) : subPath };
  }
  if (cleanPath.startsWith('玩家角色状态.气血') || cleanPath.startsWith('玩家角色状态.灵气') || cleanPath.startsWith('玩家角色状态.神识') || cleanPath.startsWith('玩家角色状态.寿命')) {
    return { shardKey: '属性', subPath: cleanPath.substring('玩家角色状态.'.length) };
  }
  if (cleanPath.startsWith('玩家角色状态.位置')) {
    const subPath = cleanPath.substring('玩家角色状态.位置'.length);
    return { shardKey: '位置', subPath: subPath.startsWith('.') ? subPath.substring(1) : subPath };
  }
  if (cleanPath.startsWith('玩家角色状态.状态效果')) {
    const subPath = cleanPath.substring('玩家角色状态.状态效果'.length);
    return { shardKey: '状态效果', subPath: subPath.startsWith('.') ? subPath.substring(1) : subPath };
  }
  if (cleanPath.startsWith('修炼功法')) {
    return { shardKey: '修炼功法', subPath: cleanPath.substring('修炼功法'.length).replace(/^\./, '') };
  }
  if (cleanPath.startsWith('装备栏')) {
    return { shardKey: '装备栏', subPath: cleanPath.substring('装备栏'.length).replace(/^\./, '') };
  }
  if (cleanPath.startsWith('背包.灵石')) {
    return { shardKey: '背包_灵石', subPath: cleanPath.substring('背包.灵石'.length).replace(/^\./, '') };
  }
  if (cleanPath.startsWith('背包.物品')) {
    return { shardKey: '背包_物品', subPath: cleanPath.substring('背包.物品'.length).replace(/^\./, '') };
  }
  if (cleanPath.startsWith('人物关系')) {
    return { shardKey: '人物关系', subPath: cleanPath.substring('人物关系'.length).replace(/^\./, '') };
  }
  if (cleanPath.startsWith('三千大道')) {
    return { shardKey: '三千大道', subPath: cleanPath.substring('三千大道'.length).replace(/^\./, '') };
  }
  if (cleanPath.startsWith('世界信息')) {
    return { shardKey: '世界信息', subPath: cleanPath.substring('世界信息'.length).replace(/^\./, '') };
  }
  if (cleanPath.startsWith('记忆.短期记忆')) {
    return { shardKey: '记忆_短期', subPath: '' };
  }
  if (cleanPath.startsWith('记忆.中期记忆')) {
    return { shardKey: '记忆_中期', subPath: '' };
  }
  if (cleanPath.startsWith('记忆.长期记忆')) {
    return { shardKey: '记忆_长期', subPath: '' };
  }
  if (cleanPath.startsWith('记忆.隐式中期记忆')) {
    return { shardKey: '记忆_隐式中期', subPath: '' }; // 新增：隐式中期记忆路径映射
  }
  if (cleanPath.startsWith('游戏时间')) {
    return { shardKey: '游戏时间', subPath: cleanPath.substring('游戏时间'.length).replace(/^\./, '') };
  }

  return null;
}

/**
 * 加载精简上下文（仅必要字段，用于AI请求）
 * Token消耗: ~1500-2000 tokens (相比完整SaveData的20000 tokens减少90%)
 */
export async function loadMinimalContext(
  helper: TavernHelper,
  options?: {
    includeRelationships?: boolean;  // 是否包含人物关系 (默认false)
    includeItems?: boolean;           // 是否包含背包物品 (默认false)
    includeWorldInfo?: boolean;       // 是否包含世界信息 (默认false)
  }
): Promise<Partial<StorageShards>> {
  // 辅助函数：反序列化变量
  const parseVar = <T>(value: unknown): T | undefined => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return undefined;
      }
    }
    return value as T;
  };

  const context: Partial<StorageShards> = {
    '基础信息': parseVar<StorageShards['基础信息']>(await helper.getVariable('基础信息', { type: 'chat' })),
    '境界': parseVar<StorageShards['境界']>(await helper.getVariable('境界', { type: 'chat' })),
    '属性': parseVar<StorageShards['属性']>(await helper.getVariable('属性', { type: 'chat' })),
    '位置': parseVar<StorageShards['位置']>(await helper.getVariable('位置', { type: 'chat' })),
    '修炼功法': parseVar<StorageShards['修炼功法']>(await helper.getVariable('修炼功法', { type: 'chat' })),
    '装备栏': parseVar<StorageShards['装备栏']>(await helper.getVariable('装备栏', { type: 'chat' })),
    '背包_灵石': parseVar<StorageShards['背包_灵石']>(await helper.getVariable('背包_灵石', { type: 'chat' })),
    '游戏时间': parseVar<StorageShards['游戏时间']>(await helper.getVariable('游戏时间', { type: 'chat' })),
    '状态效果': parseVar<StorageShards['状态效果']>(await helper.getVariable('状态效果', { type: 'chat' })),
  };

  // 可选的大型数据字段
  if (options?.includeRelationships) {
    context['人物关系'] = parseVar<StorageShards['人物关系']>(await helper.getVariable('人物关系', { type: 'chat' }));
  }
  if (options?.includeItems) {
    context['背包_物品'] = parseVar<StorageShards['背包_物品']>(await helper.getVariable('背包_物品', { type: 'chat' }));
  }
  if (options?.includeWorldInfo) {
    context['世界信息'] = parseVar<StorageShards['世界信息']>(await helper.getVariable('世界信息', { type: 'chat' }));
  }

  debug.log('分片存储', `已加载精简上下文，包含 ${Object.keys(context).length} 个字段`);
  return context;
}
