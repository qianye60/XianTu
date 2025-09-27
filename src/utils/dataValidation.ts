/**
 * @fileoverview 酒馆数据验证工具
 * 确保酒馆变量中的数据结构正确，修复常见的数据类型问题
 */

import type { SaveData, Equipment, Item, Inventory, NpcProfile } from '@/types/game.d';
import type { TavernHelper } from './tavernCore';

// 定义一个更具体的 Tavern 变量类型，避免过多的 any
type TavernChatVariables = Record<string, unknown> & {
  'character.saveData'?: SaveData;
  // 注意：以下字段已废弃，数据应统一存储在 character.saveData 中
  // '背包'?: Inventory;
  // '装备栏'?: Equipment;
  // '修炼功法'?: SaveData['修炼功法'];
  // '人物关系'?: Record<string, NpcProfile>;
  // '宗门系统'?: SaveData['宗门系统'];
  // '玩家角色状态'?: SaveData['玩家角色状态'];
};

// 识别明显的地名/建筑名（避免误被当作NPC）
function isLikelyPlaceName(name: string): boolean {
  const placeSuffixes = [
    '斋','阁','殿','堂','观','庙','楼','坊','庄','居','院','馆','铺','轩','苑','宫','台',
    '山','谷','峰','崖','洞','关','岛','城','镇','村','街','巷','桥','路'
  ];
  try { return placeSuffixes.some(suf => name.endsWith(suf)); } catch { return false; }
}

/**
 * 检查并修复数据重复问题
 * @param chatVariables - 从酒馆获取的聊天变量
 * @returns 清理后的SaveData
 */
export function cleanDuplicateData(chatVariables: TavernChatVariables): SaveData | null {
  console.log('[数据清理] 开始检查重复数据...');

  const characterSaveData = chatVariables['character.saveData'];

  if (!characterSaveData) {
    console.warn('[数据清理] 未找到character.saveData');
    return null;
  }

  // 创建一个深拷贝以避免直接修改原始对象
  const cleanedData: SaveData = JSON.parse(JSON.stringify(characterSaveData));

  // 检查是否存在废弃的重复数据字段
  const deprecatedFields = ['背包', '装备栏', '修炼功法', '人物关系', '宗门系统', '玩家角色状态'];
  let hasDeprecatedData = false;

  for (const field of deprecatedFields) {
    if (chatVariables[field]) {
      console.warn(`[数据清理] 检测到废弃的重复数据字段: ${field}，数据应统一存储在 character.saveData 中`);
      hasDeprecatedData = true;
    }
  }

  if (hasDeprecatedData) {
    console.log('[数据清理] 发现废弃的重复数据字段，建议清理。');
  } else {
    console.log('[数据清理] 未发现重复数据，数据结构符合规范。');
  }

  return validateAndFixSaveData(cleanedData);
}


/**
 * 清理酒馆变量中的重复数据
 * @param tavernHelper - 酒馆助手实例
 */
export async function cleanTavernDuplicates(tavernHelper: TavernHelper) {
  console.log('[数据清理] 开始清理酒馆重复变量...');

  try {
    const chatVars = await tavernHelper.getVariables({ type: 'chat' });

    // 这些字段是废弃的重复数据，应该被清理
    const duplicateFields = ['背包', '装备栏', '修炼功法', '人物关系', '宗门系统', '玩家角色状态', '背包数据', '装备栏数据', '修炼功法数据'];
    const toDelete: string[] = [];

    for (const field of duplicateFields) {
      if (chatVars[field]) {
        console.log(`[数据清理] 发现废弃的重复字段，准备删除: ${field}`);
        toDelete.push(field);
      }
    }

    if (toDelete.length > 0) {
      for (const key of toDelete) {
        await tavernHelper.deleteVariable(key, { type: 'chat' });
        console.log(`[数据清理] 已删除重复变量: ${key}`);
      }
      console.log(`[数据清理] 清理完成，删除了 ${toDelete.length} 个重复变量。`);
    } else {
      console.log('[数据清理] 未发现需要清理的重复变量。');
    }

  } catch (error) {
    console.error('[数据清理] 清理酒馆重复数据失败:', error);
  }
}

/**
 * 验证并修复存档数据中的常见问题
 * @param saveData - 从酒馆获取的存档数据
 * @returns 修复后的存档数据
 */
export function validateAndFixSaveData(saveData: SaveData): SaveData {
  console.log('[数据验证] 开始验证和修复存档数据...');

  // 1. 修复装备栏中的 "null" 或 "undefined" 字符串问题
  if (saveData.装备栏) {
    const equipment = saveData.装备栏;
    for (const slot of Object.keys(equipment) as (keyof Equipment)[]) {
      if (equipment[slot] === 'null' || equipment[slot] === 'undefined') {
        console.log(`[数据验证] 修复装备栏 ${slot}: "${equipment[slot]}" -> null`);
        equipment[slot] = null;
      }
    }
  }

  // 2. 清理背包中的无效物品
  if (saveData.背包?.物品) {
    for (const itemId in saveData.背包.物品) {
      const item = saveData.背包.物品[itemId];
      if (!item || typeof item !== 'object' || item === null) {
        console.log(`[数据验证] 删除无效物品: ${itemId}`);
        delete saveData.背包.物品[itemId];
      }
    }
  }

  // 3. 修复修炼功法中的 "null" 字符串和确保数组存在
  if (saveData.修炼功法) {
    if ((saveData.修炼功法.功法 as unknown) === 'null' || (saveData.修炼功法.功法 as unknown) === 'undefined') {
      console.log('[数据验证] 修复修炼功法: "null" -> null');
      saveData.修炼功法.功法 = null;
    }
    if (!Array.isArray(saveData.修炼功法.已解锁技能)) {
      saveData.修炼功法.已解锁技能 = [];
    }
  }

  // 4. 确保必要的对象和数组存在
  if (!saveData.玩家角色状态) {
    // 如果核心状态不存在，可能需要创建一个默认结构或抛出错误
    console.error('[数据验证] 玩家角色状态不存在，数据可能已损坏！');
  } else if (!Array.isArray(saveData.玩家角色状态.状态效果)) {
    saveData.玩家角色状态.状态效果 = [];
  }

  if (!saveData.人物关系) {
    saveData.人物关系 = {};
  }

  // 5. 迁移异常的 "角色物品" 到 "背包.物品"
  const anySave = saveData as any;
  if (anySave.角色物品 && typeof anySave.角色物品 === 'object') {
    try {
      if (!saveData.背包) {
        saveData.背包 = { 灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 }, 物品: {} };
      }
      if (!saveData.背包.物品) {
        saveData.背包.物品 = {};
      }

      const mapItemType = (typeStr: string): Item['类型'] => {
        const s = String(typeStr || '').trim();
        const equipmentKeywords = ['武器', '兵器', '法器', '灵器', '宝物', '剑', '刀', '飞剑', '木剑', '装备', '法宝'];
        const skillbookKeywords = ['功法', '心法', '秘籍', '法诀', '经书', '法门', '内功', '刀法', '剑法'];
        if (equipmentKeywords.includes(s)) return '装备';
        if (skillbookKeywords.includes(s)) return '功法';
        return '其他';
      };

      for (const category in anySave.角色物品) {
        if (Array.isArray(anySave.角色物品[category])) {
          for (const itemData of anySave.角色物品[category]) {
            if (!itemData || !itemData.名称) continue;
            const id = `migrated_${itemData.名称.replace(/\s/g, '')}_${Date.now()}`;
            const itemType = mapItemType(itemData.类型);
            saveData.背包.物品[id] = {
              物品ID: id,
              名称: itemData.名称,
              类型: itemType,
              可叠加: itemType !== '装备', // 装备通常不可叠加
              品质: { quality: '凡', grade: 1 },
              数量: typeof itemData.数量 === 'number' ? itemData.数量 : 1,
              描述: itemData.描述 || '',
            };
          }
        }
      }
      delete anySave.角色物品;
      console.log('[数据验证] 已迁移 "角色物品" -> "背包.物品"');
    } catch (e) {
      console.warn('[数据验证] 迁移角色物品失败:', e);
    }
  }

  // 6. 合并/清理异常的 "角色状态" 到 "玩家角色状态"
  if (anySave.角色状态 && typeof anySave.角色状态 === 'object') {
    const playerStatus = saveData.玩家角色状态;
    if (playerStatus) {
      if (anySave.角色状态.当前位置 && (!playerStatus.位置?.描述 || playerStatus.位置.描述 === '未知')) {
        if (!playerStatus.位置) playerStatus.位置 = { 描述: '' };
        playerStatus.位置.描述 = anySave.角色状态.当前位置;
      }
      // 可以根据需要添加更多字段的合并
    }
    delete anySave.角色状态;
    console.log('[数据验证] 已清理 "角色状态" (合并必要字段后移除)');
  }

  // 7. 规范化人物关系，移除无效NPC
  if (saveData.人物关系) {
    const worldName = saveData.角色基础信息?.世界 || '未知';
    for (const key in saveData.人物关系) {
      const npc = saveData.人物关系[key];
      if (!npc || typeof npc !== 'object' || !npc.角色基础信息?.名字 || key.startsWith('npc_init_') || isLikelyPlaceName(key)) {
        console.log(`[数据验证] 发现无效NPC数据或地名，标记删除: ${key}`);
        delete saveData.人物关系[key];
        continue;
      }
      // 确保基础结构完整
      if (!('人物关系' in npc)) (npc as any).人物关系 = '相识';
      if (!('人物好感度' in npc)) (npc as any).人物好感度 = 0;
    }
  }

  // 8. 确保记忆模块存在
  if (!saveData.记忆) {
    saveData.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [] };
  }

  console.log('[数据验证] 数据验证和修复完成。');
  return saveData;
}

/**
 * 数据一致性验证报告
 */
export interface ValidationReport {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * 生成数据验证报告
 * @param saveData - 存档数据
 * @returns 验证报告
 */
export function generateValidationReport(saveData: SaveData): ValidationReport {
  const report: ValidationReport = { isValid: true, warnings: [], errors: [] };

  if (!saveData.玩家角色状态) {
    report.errors.push('缺少玩家角色状态数据');
    report.isValid = false;
  } else {
    const requiredFields: (keyof SaveData['玩家角色状态'])[] = ['境界', '气血', '灵气', '神识', '寿命', '修为'];
    requiredFields.forEach(field => {
      if (!(field in saveData.玩家角色状态)) {
        report.warnings.push(`玩家角色状态缺少字段: ${field}`);
      }
    });
  }

  if (!saveData.背包) {
    report.errors.push('缺少背包数据');
    report.isValid = false;
  } else {
    if (!saveData.背包.灵石) report.warnings.push('背包中缺少灵石数据');
    if (!saveData.背包.物品) report.warnings.push('背包中缺少物品数据');
  }

  if (saveData.修炼功法) {
    if (typeof saveData.修炼功法.熟练度 !== 'number') {
      report.warnings.push('修炼功法熟练度应为数字类型');
    }
    if (!Array.isArray(saveData.修炼功法.已解锁技能)) {
      report.warnings.push('已解锁技能应为数组类型');
    }
  }

  console.log('[数据验证] 生成验证报告完成:', report);
  return report;
}

/**
 * 导出工具函数，供其他模块使用
 */
export const DataValidationUtils = {
  validateAndFixSaveData,
  generateValidationReport,
  cleanDuplicateData,
  cleanTavernDuplicates,
};
