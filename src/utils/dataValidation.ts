/**
 * @fileoverview 酒馆数据验证工具
 * 确保酒馆变量中的数据结构正确，修复常见的数据类型问题
 */

import type { SaveData, Equipment, Item } from '@/types/game.d';

/**
 * 检查并修复数据重复问题
 * @param chatVariables - 从酒馆获取的聊天变量
 * @returns 清理后的SaveData
 */
export function cleanDuplicateData(chatVariables: Record<string, any>): SaveData | null {
  console.log('[数据清理] 开始检查重复数据...');
  
  const characterSaveData = chatVariables['character.saveData'] as SaveData;
  const rootData = chatVariables;
  
  if (!characterSaveData) {
    console.warn('[数据清理] 未找到character.saveData');
    return null;
  }
  
  let cleanedData = { ...characterSaveData };
  let hasDuplicates = false;
  
  // 检查背包数据重复
  if (rootData.背包 && cleanedData.背包) {
    const rootItems = Object.keys(rootData.背包?.物品 || {}).length;
    const rootSpirit = (rootData.背包.灵石?.下品 || 0) + (rootData.背包.灵石?.中品 || 0) + 
                     (rootData.背包.灵石?.上品 || 0) + (rootData.背包.灵石?.极品 || 0);
    
    const saveDataItems = Object.keys(cleanedData.背包?.物品 || {}).length;
    const saveDataSpirit = (cleanedData.背包.灵石?.下品 || 0) + (cleanedData.背包.灵石?.中品 || 0) + 
                          (cleanedData.背包.灵石?.上品 || 0) + (cleanedData.背包.灵石?.极品 || 0);
    
    console.log('[数据清理] 背包对比:', {
      根路径: { 物品数: rootItems, 灵石总数: rootSpirit },
      character路径: { 物品数: saveDataItems, 灵石总数: saveDataSpirit }
    });
    
    // 如果根路径的背包有更多内容，合并数据
    if (rootItems > 0 || rootSpirit > 0) {
      hasDuplicates = true;
      console.log('[数据清理] 发现根路径背包数据，进行合并...');
      
      // 合并灵石（取最大值）
      if (rootData.背包.灵石 && cleanedData.背包.灵石) {
        cleanedData.背包.灵石 = {
          下品: Math.max(rootData.背包.灵石.下品 || 0, cleanedData.背包.灵石.下品 || 0),
          中品: Math.max(rootData.背包.灵石.中品 || 0, cleanedData.背包.灵石.中品 || 0),
          上品: Math.max(rootData.背包.灵石.上品 || 0, cleanedData.背包.灵石.上品 || 0),
          极品: Math.max(rootData.背包.灵石.极品 || 0, cleanedData.背包.灵石.极品 || 0),
        };
      }
      
      // 合并物品（优先使用有效物品）
      if (rootData.背包.物品) {
        for (const [itemId, item] of Object.entries(rootData.背包.物品)) {
          if (item && item !== 'null' && item !== 'undefined') {
            cleanedData.背包.物品[itemId] = item as Item;
            console.log(`[数据清理] 合并物品: ${itemId}`);
          }
        }
      }
    }
  }
  
  // 检查其他可能的重复字段
  const fieldsToCheck = ['装备栏', '修炼功法', '人物关系', '宗门系统'];
  fieldsToCheck.forEach(field => {
    if (rootData[field] && JSON.stringify(rootData[field]) !== JSON.stringify(cleanedData[field])) {
      console.log(`[数据清理] 发现重复字段: ${field}`);
      hasDuplicates = true;
    }
  });
  
  if (hasDuplicates) {
    console.log('[数据清理] 清理完成，发现并处理了重复数据');
  } else {
    console.log('[数据清理] 未发现重复数据');
  }
  
  return validateAndFixSaveData(cleanedData);
}

/**
 * 清理酒馆变量中的重复数据
 * @param tavernHelper - 酒馆助手实例
 */
export async function cleanTavernDuplicates(tavernHelper: any) {
  console.log('[数据清理] 开始清理酒馆重复变量...');
  
  try {
    const chatVars = await tavernHelper.getVariables({ type: 'chat' });
    
    // 要清理的重复字段
    const duplicateFields = ['背包', '装备栏', '修炼功法', '人物关系', '宗门系统', '玩家角色状态'];
    const toDelete: string[] = [];
    
    for (const field of duplicateFields) {
      if (chatVars[field] && chatVars['character.saveData']) {
        console.log(`[数据清理] 发现重复字段，准备删除根路径的: ${field}`);
        toDelete.push(field);
      }
    }
    
    // 批量删除重复变量
    if (toDelete.length > 0) {
      for (const key of toDelete) {
        await tavernHelper.deleteVariable(key, { type: 'chat' });
        console.log(`[数据清理] 已删除重复变量: ${key}`);
      }
      console.log(`[数据清理] 清理完成，删除了 ${toDelete.length} 个重复变量`);
    } else {
      console.log('[数据清理] 未发现需要清理的重复变量');
    }
    
  } catch (error) {
    console.error('[数据清理] 清理酒馆重复数据失败:', error);
  }
}

/**
 * 验证并修复酒馆数据中的常见问题
 * @param saveData - 从酒馆获取的存档数据
 * @returns 修复后的存档数据
 */
export function validateAndFixSaveData(saveData: any): SaveData {
  console.log('[数据验证] 开始验证和修复酒馆数据...');
  
  // 1. 修复装备栏中的 "null" 字符串问题
  if (saveData.装备栏) {
    const equipment = saveData.装备栏 as Equipment;
    
    // 遍历所有法宝槽位，将字符串"null"转换为实际的null
    (['法宝1', '法宝2', '法宝3', '法宝4', '法宝5', '法宝6'] as const).forEach(slot => {
      if (equipment[slot] === 'null' || equipment[slot] === 'undefined') {
        console.log(`[数据验证] 修复装备栏 ${slot}: "${equipment[slot]}" -> null`);
        equipment[slot] = null;
      }
    });
  }
  
  // 2. 修复背包物品中的 "null" 字符串问题
  if (saveData.背包?.物品) {
    const items = saveData.背包.物品 as Record<string, Item>;
    const itemsToDelete: string[] = [];
    
    for (const [itemId, item] of Object.entries(items)) {
      if (item === 'null' || item === 'undefined' || item === null) {
        console.log(`[数据验证] 标记删除无效物品: ${itemId}`);
        itemsToDelete.push(itemId);
      }
    }
    
    // 删除无效物品
    itemsToDelete.forEach(itemId => {
      delete items[itemId];
    });
  }
  
  // 3. 修复修炼功法中的 "null" 字符串问题
  if (saveData.修炼功法) {
    const cultivation = saveData.修炼功法;
    
    if (cultivation.功法 === 'null' || cultivation.功法 === 'undefined') {
      console.log('[数据验证] 修复修炼功法: "null" -> null');
      cultivation.功法 = null;
    }
    
    // 确保数组类型字段不是null
    if (!Array.isArray(cultivation.已解锁技能)) {
      cultivation.已解锁技能 = [];
    }
  }
  
  // 4. 确保必需的字段存在且类型正确
  if (!saveData.玩家角色状态?.状态效果) {
    if (saveData.玩家角色状态) {
      saveData.玩家角色状态.状态效果 = [];
    }
  }
  
  if (!saveData.人物关系) {
    saveData.人物关系 = {};
  }
  
  if (!saveData.记忆) {
    saveData.记忆 = {
      短期记忆: [],
      中期记忆: [],
      长期记忆: []
    };
  }
  
  console.log('[数据验证] 数据验证和修复完成');
  return saveData as SaveData;
}

/**
 * 检查数据一致性，报告潜在问题
 * @param saveData - 存档数据
 * @returns 验证报告
 */
export interface ValidationReport {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export function generateValidationReport(saveData: SaveData): ValidationReport {
  const report: ValidationReport = {
    isValid: true,
    warnings: [],
    errors: []
  };
  
  // 检查玩家角色状态完整性
  if (!saveData.玩家角色状态) {
    report.errors.push('缺少玩家角色状态数据');
    report.isValid = false;
  } else {
    // 检查必需的数值字段
    const requiredFields = ['境界', '气血', '灵气', '神识', '寿命', '修为'];
    requiredFields.forEach(field => {
      if (!(field in saveData.玩家角色状态)) {
        report.warnings.push(`玩家角色状态缺少字段: ${field}`);
      }
    });
  }
  
  // 检查背包数据
  if (!saveData.背包) {
    report.errors.push('缺少背包数据');
    report.isValid = false;
  } else {
    if (!saveData.背包.灵石) {
      report.warnings.push('背包中缺少灵石数据');
    }
    if (!saveData.背包.物品) {
      report.warnings.push('背包中缺少物品数据');
    }
  }
  
  // 检查修炼功法数据结构
  if (saveData.修炼功法) {
    const cultivation = saveData.修炼功法;
    if (typeof cultivation.熟练度 !== 'number') {
      report.warnings.push('修炼功法熟练度应为数字类型');
    }
    if (!Array.isArray(cultivation.已解锁技能)) {
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