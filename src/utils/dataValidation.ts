/**
 * 数据验证工具
 *
 * 功能:
 * - 验证存档数据结构完整性
 * - 修复NPC数据
 * - 清理无效数据
 *
 * 被以下文件引用:
 * - src/stores/characterStore.ts
 * - src/services/characterInitialization.ts
 */

import type { NpcProfile, SaveData } from '@/types/game';
import type { TavernHelper } from '@/types';
import { validateSaveDataV3 } from '@/utils/saveValidationV3';

export function deepCleanForClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 验证并修复存档数据，确保数据结构完整
 * @param saveData - 存档数据
 * @returns 修复后的存档数据
 */
export function validateAndFixSaveData(saveData: SaveData): SaveData {
  // 简单的验证和修复逻辑
  if (!saveData) {
    console.warn('[数据验证] 存档数据为空');
    return saveData;
  }

  const anySave = saveData as any;
  if (!anySave.角色 || typeof anySave.角色 !== 'object') anySave.角色 = {};
  if (!anySave.角色.背包 || typeof anySave.角色.背包 !== 'object') {
    anySave.角色.背包 = {
      灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 },
      物品: {}
    };
  }

  if (!anySave.角色.背包.物品 || typeof anySave.角色.背包.物品 !== 'object') {
    anySave.角色.背包.物品 = {};
  }

  if (!anySave.角色.背包.灵石 || typeof anySave.角色.背包.灵石 !== 'object') {
    anySave.角色.背包.灵石 = { 下品: 0, 中品: 0, 上品: 0, 极品: 0 };
  }

  // 清理无效的物品数据
  if (anySave.角色?.背包?.物品) {
    const items = anySave.角色.背包.物品 as Record<string, any>;
    Object.keys(items).forEach(key => {
      const item = items[key];
      // 移除无效的物品（例如null、undefined或缺少必要字段）
      if (!item || typeof item !== 'object' || !item.名称) {
        delete items[key];
        console.warn(`[数据验证] 移除无效物品: ${key}`);
      }
    });
  }

  return saveData;
}

/**
 * 清理酒馆中的重复变量
 * @param _tavernHelper - 酒馆助手实例（保留参数以保持接口兼容性）
 */
export async function cleanTavernDuplicates(_tavernHelper: TavernHelper): Promise<void> {
  try {
    // 这个函数用于清理旧的重复变量
    // 在新的分片存储系统中，这个功能可能不再需要
    console.log('[数据验证] 酒馆重复变量清理（新系统中已优化）');
  } catch (error) {
    console.warn('[数据验证] 清理酒馆重复变量失败:', error);
  }
}

/**
 * 验证并可能修复一个NPC Profile对象，确保其符合核心数据结构。
 * @param npcData - 从AI或其他来源接收到的原始NPC数据。
 * @returns 一个元组，第一个元素是布尔值，表示是否有效；第二个元素是处理（可能被修复）后的NPC数据。
 */
export function validateAndRepairNpcProfile(npcData: unknown): [boolean, NpcProfile | null] {
  try {
    if (!npcData || typeof npcData !== 'object') {
      console.error('[NPC校验] 提供的输入不是一个有效的对象:', npcData);
      return [false, null];
    }

    const data = { ...npcData } as Partial<NpcProfile>;

    // 1. 核心验证：必须有名字，且为非空字符串
    if (typeof data.名字 !== 'string' || data.名字.trim().length === 0) {
      console.error('[NPC校验] 核心字段`名字`缺失或无效:', data);
      return [false, null];
    }

    const repairedNpc: Partial<NpcProfile> = { ...data };

    // 2. 修复与默认值填充（防御性编程，确保不会因为任何字段导致崩溃）
    try {
      if (typeof repairedNpc.性别 !== 'string') repairedNpc.性别 = '其他';
    } catch (e) {
      repairedNpc.性别 = '其他';
    }

    // 年龄已从出生日期自动计算,不需要验证
    try {
      if (typeof repairedNpc.与玩家关系 !== 'string') repairedNpc.与玩家关系 = '相识';
    } catch (e) {
      repairedNpc.与玩家关系 = '相识';
    }

    try {
      if (typeof repairedNpc.好感度 !== 'number' || isNaN(repairedNpc.好感度)) repairedNpc.好感度 = 0;
    } catch (e) {
      repairedNpc.好感度 = 0;
    }

    try {
      if (!Array.isArray(repairedNpc.记忆)) repairedNpc.记忆 = [];
    } catch (e) {
      repairedNpc.记忆 = [];
    }

    try {
      if (!Array.isArray(repairedNpc.人格底线)) repairedNpc.人格底线 = [];
    } catch (e) {
      repairedNpc.人格底线 = [];
    }

    try {
      if (!Array.isArray(repairedNpc.天赋)) repairedNpc.天赋 = [];
    } catch (e) {
      repairedNpc.天赋 = [];
    }

    try {
      if (!Array.isArray(repairedNpc.性格特征)) repairedNpc.性格特征 = [];
    } catch (e) {
      repairedNpc.性格特征 = [];
    }

    // 3. 结构检查与修复 (境界) - 防御性处理
    try {
      if (typeof repairedNpc.境界 !== 'object' || repairedNpc.境界 === null) {
        repairedNpc.境界 = {
          名称: '凡人',
          阶段: '',
          当前进度: 0,
          下一级所需: 100,
          突破描述: '引气入体，感悟天地灵气，踏上修仙第一步'
        };
      } else {
        if (typeof repairedNpc.境界.名称 !== 'string') repairedNpc.境界.名称 = '凡人';
        if (typeof repairedNpc.境界.阶段 !== 'string') repairedNpc.境界.阶段 = '';
        if (typeof repairedNpc.境界.当前进度 !== 'number' || isNaN(repairedNpc.境界.当前进度)) repairedNpc.境界.当前进度 = 0;
        if (typeof repairedNpc.境界.下一级所需 !== 'number' || isNaN(repairedNpc.境界.下一级所需)) repairedNpc.境界.下一级所需 = 100;
        if (typeof repairedNpc.境界.突破描述 !== 'string') repairedNpc.境界.突破描述 = '引气入体，感悟天地灵气，踏上修仙第一步';
      }
    } catch (e) {
      console.warn('[NPC校验] 境界字段修复失败，使用默认值:', e);
      repairedNpc.境界 = {
        名称: '凡人',
        阶段: '',
        当前进度: 0,
        下一级所需: 100,
        突破描述: '引气入体，感悟天地灵气，踏上修仙第一步'
      };
    }

    // 4. 结构检查与修复 (背包) - 防御性处理
    try {
      if (typeof repairedNpc.背包 !== 'object' || repairedNpc.背包 === null) {
        repairedNpc.背包 = { 灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 }, 物品: {} };
      } else {
        if (typeof repairedNpc.背包.灵石 !== 'object' || repairedNpc.背包.灵石 === null) {
          repairedNpc.背包.灵石 = { 下品: 0, 中品: 0, 上品: 0, 极品: 0 };
        }
        if (typeof repairedNpc.背包.物品 !== 'object' || repairedNpc.背包.物品 === null) {
          repairedNpc.背包.物品 = {};
        }
      }
    } catch (e) {
      console.warn('[NPC校验] 背包字段修复失败，使用默认值:', e);
      repairedNpc.背包 = { 灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 }, 物品: {} };
    }

    // 5. 确保实时关注是布尔值
    try {
      if (typeof repairedNpc.实时关注 !== 'boolean') {
        repairedNpc.实时关注 = false;
      }
    } catch (e) {
      repairedNpc.实时关注 = false;
    }

    return [true, repairedNpc as NpcProfile];
  } catch (error) {
    console.error('[NPC校验] 验证过程发生严重错误:', error);
    return [false, null];
  }
}

/**
 * 验证游戏数据的完整性和正确性
 * @param saveData - 存档数据
 * @param profile - 角色档案信息
 * @param context - 验证上下文（可选）
 * @returns 验证结果，包含 isValid 和 errors
 */
export function validateGameData(
  saveData: SaveData,
  profile?: any,
  context?: string
): { isValid: boolean; errors: string[] } {
  if (!saveData) return { isValid: false, errors: ['存档数据为空'] };

  const result = validateSaveDataV3(saveData);
  const errors: string[] = [...result.errors];

  if (profile?.角色) {
    const baseInfo = profile.角色;
    if (!baseInfo.名字 || typeof baseInfo.名字 !== 'string') errors.push('角色姓名无效');
    if (!baseInfo.性别) errors.push('角色性别缺失');
  }

  if (context === 'creation') {
    const loc = (saveData as any)?.角色?.位置;
    if (!loc || typeof loc !== 'object') errors.push('角色.位置 缺失');
    const realm = (saveData as any)?.角色?.属性?.境界;
    if (!realm || typeof realm !== 'object') errors.push('角色.属性.境界 缺失');
  }

  return { isValid: errors.length === 0, errors };
}
