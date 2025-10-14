/**
 * SaveData分片存储工具
 * 将巨大的SaveData拆分为多个独立的chat变量，解决token爆炸问题
 *
 * 核心优势:
 * - 精准访问: 只读取需要的字段
 * - 真正增量更新: 直接修改单个分片
 * - 路径简化: 境界.名称 vs 玩家角色状态.境界.名称
 * - Token节省: AI请求从20k降至1.5k tokens
 */

import type { CharacterBaseInfo, InnateAttributes, Realm, SaveData, ValuePair, WorldInfo } from '@/types/game';
import type { TavernHelper } from '@/types';
import { debug } from './debug';

// 定义分片结构 - 使用最简洁的路径格式
export interface StorageShards {
  '基础信息': {
    名字: string;
    性别: '男' | '女' | '其他';
    出生日期?: { 年: number; 月: number; 日: number; 小时?: number; 分钟?: number }; // 出生日期（用于计算年龄，年龄由系统自动计算不需存储）
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
    声望: number;
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
  '系统': {
    nsfwMode: boolean;
    nsfwGenderFilter: 'all' | 'female' | 'male';
  };
}

/**
 * 将完整SaveData拆分为分片
 */
export function shardSaveData(saveData: SaveData): StorageShards {
  // 读取系统设置
  let nsfwMode = true; // 默认开启NSFW模式
  let nsfwGenderFilter = 'all'; // 默认所有性别
  try {
    const savedSettings = localStorage.getItem('dad_game_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      nsfwMode = parsed.enableNsfwMode !== undefined ? !!parsed.enableNsfwMode : true;
      nsfwGenderFilter = parsed.nsfwGenderFilter || 'all';
    }
  } catch (error) {
    debug.warn('分片存储', '读取NSFW设置失败', error);
  }

  // 安全访问可选字段
  const baseInfo = saveData.角色基础信息 || {
    名字: '未知修士',
    性别: '其他',
    世界: '未知世界',
    天资: '普通',
    出生: '散修',
    灵根: '无',
    天赋: [],
    先天六司: { 根骨: 0, 灵性: 0, 悟性: 0, 气运: 0, 魅力: 0, 心性: 0 },
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

  console.log('[分片存储-保存] 接收到的 saveData.角色基础信息.先天六司:', saveData.角色基础信息?.先天六司);
  console.log('[分片存储-保存] 最终使用的 baseInfo.先天六司:', baseInfo.先天六司);

  return {
    '基础信息': {
      名字: baseInfo.名字,
      性别: baseInfo.性别 || '其他',
      出生日期: baseInfo.出生日期, // 添加出生日期（年龄由系统自动计算）
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
      声望: saveData.玩家角色状态.声望,
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
    '系统': {
      nsfwMode: nsfwMode,
      nsfwGenderFilter: nsfwGenderFilter as 'all' | 'female' | 'male',
    },
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
  console.log('[分片存储-读取] 从酒馆读取的 基础信息.先天六司:', baseInfo.先天六司);
  const realm = shards['境界'] || { 名称: '凡人', 阶段: '', 当前进度: 0, 下一级所需: 100, 突破描述: '引气入体，感悟天地灵气，踏上修仙第一步' };
  const attrs = shards['属性'] || {
    气血: { 当前: 100, 上限: 100 },
    灵气: { 当前: 100, 上限: 100 },
    神识: { 当前: 50, 上限: 50 },
    寿命: { 当前: 0, 上限: 80 },
    声望: 0,
  };

  const saveData: SaveData = {
    角色基础信息: {
      名字: baseInfo.名字,
      性别: baseInfo.性别 || '其他', // 添加缺失的必填字段，默认为'其他'
      出生日期: baseInfo.出生日期, // 添加出生日期字段（用于计算年龄）
      世界: baseInfo.世界,
      天资: baseInfo.天资,
      出生: baseInfo.出生,
      灵根: baseInfo.灵根,
      天赋: baseInfo.天赋,
      先天六司: baseInfo.先天六司,
      后天六司: (baseInfo as any).后天六司 || { 根骨: 0, 悟性: 0, 定力: 0, 气运: 0, 魅力: 0, 心性: 0 },
    },
    玩家角色状态: {
      境界: realm,
      声望: attrs.声望,
      气血: attrs.气血,
      灵气: attrs.灵气,
      神识: attrs.神识,
      寿命: attrs.寿命,
      位置: shards['位置'] || { 描述: '未知', x: 0, y: 0 },
      状态效果: shards['状态效果'] || [],
    },
    修炼功法: shards['修炼功法'] || null,
    掌握技能: shards['掌握技能'] || [],
    装备栏: shards['装备栏'] || { 装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null },
    背包: {
      灵石: shards['背包_灵石'] || { 下品: 0, 中品: 0, 上品: 0, 极品: 0 },
      物品: shards['背包_物品'] || {},
    },
    人物关系: shards['人物关系'] || {},
    宗门系统: { availableSects: [], sectRelationships: {}, sectHistory: [] },
    三千大道: shards['三千大道'] || { 大道列表: {} },
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
        声望: saveData.玩家角色状态.声望,
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
 * 保存所有分片到酒馆
 */
export async function saveAllShards(
  shards: StorageShards,
  helper: TavernHelper
): Promise<void> {
  const vars: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(shards)) {
    vars[key] = value;
  }

  console.log(`[分片存储] 准备保存 ${Object.keys(shards).length} 个分片到酒馆...`);

  // 清理数据，移除不可序列化的值（修复酒馆助手3.6.11的structuredClone问题）
  const { deepCleanForClone } = await import('./dataValidation');
  const cleanedVars = deepCleanForClone(vars);
  console.log(`[分片存储] 已清理数据，准备写入酒馆`);

  // 添加30秒超时保护
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('保存分片数据超时(30秒)'));
    }, 30 * 1000);
  });

  const savePromise = helper.insertOrAssignVariables(cleanedVars, { type: 'chat' });

  await Promise.race([savePromise, timeoutPromise]);

  console.log(`[分片存储] ✅ 已保存所有 ${Object.keys(shards).length} 个分片`);
  debug.log('分片存储', `已保存所有 ${Object.keys(shards).length} 个分片`);
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
    '系统',
  ];

  for (const key of shardKeys) {
    if (key in allVars) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (shards as any)[key] = allVars[key];
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
  const { deepCleanForClone } = await import('@/utils/dataValidation');
  await helper.setVariable(key, deepCleanForClone(value), { type: 'chat' });
  debug.log('分片存储', `已更新分片: ${key}`);
}

/**
 * 批量更新多个分片
 */
export async function updateShards(
  updates: Partial<StorageShards>,
  helper: TavernHelper
): Promise<void> {
  const vars: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    vars[key] = value;
  }

  // 清理数据，移除不可序列化的值（修复酒馆助手3.6.11的structuredClone问题）
  const { deepCleanForClone } = await import('./dataValidation');
  const cleanedVars = deepCleanForClone(vars);

  await helper.insertOrAssignVariables(cleanedVars, { type: 'chat' });
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
    '系统',
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
  const cleanPath = oldPath;

  // 映射规则
  if (cleanPath.startsWith('角色基础信息.')) {
    return { shardKey: '基础信息', subPath: cleanPath.substring('角色基础信息.'.length) };
  }
  if (cleanPath.startsWith('玩家角色状态.境界') || cleanPath.startsWith('境界')) {
    const prefix = cleanPath.startsWith('玩家角色状态.境界') ? '玩家角色状态.境界' : '境界';
    const subPath = cleanPath.substring(prefix.length);
    return { shardKey: '境界', subPath: subPath.startsWith('.') ? subPath.substring(1) : subPath };
  }
  if (cleanPath.startsWith('玩家角色状态.气血') || cleanPath.startsWith('玩家角色状态.灵气') || cleanPath.startsWith('玩家角色状态.神识') || cleanPath.startsWith('玩家角色状态.寿命') || cleanPath.startsWith('玩家角色状态.声望') || cleanPath.startsWith('属性.') || cleanPath === '声望') {
    const prefix = cleanPath.startsWith('玩家角色状态.') ? '玩家角色状态.' : (cleanPath.startsWith('属性.') ? '属性.' : '');
    return { shardKey: '属性', subPath: cleanPath.substring(prefix.length) };
  }
  if (cleanPath.startsWith('玩家角色状态.位置') || cleanPath.startsWith('位置')) {
    const prefix = cleanPath.startsWith('玩家角色状态.位置') ? '玩家角色状态.位置' : '位置';
    const subPath = cleanPath.substring(prefix.length);
    return { shardKey: '位置', subPath: subPath.startsWith('.') ? subPath.substring(1) : subPath };
  }
  if (cleanPath.startsWith('玩家角色状态.状态效果') || cleanPath.startsWith('状态效果')) {
    const prefix = cleanPath.startsWith('玩家角色状态.状态效果') ? '玩家角色状态.状态效果' : '状态效果';
    const subPath = cleanPath.substring(prefix.length);
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
  const context: Partial<StorageShards> = {
    '基础信息': await helper.getVariable('基础信息', { type: 'chat' }) as StorageShards['基础信息'],
    '境界': await helper.getVariable('境界', { type: 'chat' }) as StorageShards['境界'],
    '属性': await helper.getVariable('属性', { type: 'chat' }) as StorageShards['属性'],
    '位置': await helper.getVariable('位置', { type: 'chat' }) as StorageShards['位置'],
    '修炼功法': await helper.getVariable('修炼功法', { type: 'chat' }) as StorageShards['修炼功法'],
    '装备栏': await helper.getVariable('装备栏', { type: 'chat' }) as StorageShards['装备栏'],
    '背包_灵石': await helper.getVariable('背包_灵石', { type: 'chat' }) as StorageShards['背包_灵石'],
    '游戏时间': await helper.getVariable('游戏时间', { type: 'chat' }) as StorageShards['游戏时间'],
    '状态效果': await helper.getVariable('状态效果', { type: 'chat' }) as StorageShards['状态效果'],
  };

  // 可选的大型数据字段
  if (options?.includeRelationships) {
    context['人物关系'] = await helper.getVariable('人物关系', { type: 'chat' }) as StorageShards['人物关系'];
  }
  if (options?.includeItems) {
    context['背包_物品'] = await helper.getVariable('背包_物品', { type: 'chat' }) as StorageShards['背包_物品'];
  }
  if (options?.includeWorldInfo) {
    context['世界信息'] = await helper.getVariable('世界信息', { type: 'chat' }) as StorageShards['世界信息'];
  }

  debug.log('分片存储', `已加载精简上下文，包含 ${Object.keys(context).length} 个字段`);
  return context;
}
