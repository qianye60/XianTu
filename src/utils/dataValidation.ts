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
export function cleanDuplicateData(chatVariables: Record<string, unknown>): SaveData | null {
  console.log('[数据清理] 开始检查重复数据...');
  
  const characterSaveData = chatVariables['character.saveData'] as SaveData;
  const rootData = chatVariables;
  
  if (!characterSaveData) {
    console.warn('[数据清理] 未找到character.saveData');
    return null;
  }
  
  const cleanedData = { ...characterSaveData };
  let hasDuplicates = false;
  
  // 检查背包数据重复
  if (rootData.背包 && cleanedData.背包) {
    const rootItems = Object.keys((rootData.背包 as any)?.物品 || {}).length;
    const rootSpirit = ((rootData.背包 as any).灵石?.下品 || 0) + ((rootData.背包 as any).灵石?.中品 || 0) + 
                     ((rootData.背包 as any).灵石?.上品 || 0) + ((rootData.背包 as any).灵石?.极品 || 0);
    
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
      if ((rootData.背包 as any).灵石 && cleanedData.背包.灵石) {
        cleanedData.背包.灵石 = {
          下品: Math.max((rootData.背包 as any).灵石.下品 || 0, cleanedData.背包.灵石.下品 || 0),
          中品: Math.max((rootData.背包 as any).灵石.中品 || 0, cleanedData.背包.灵石.中品 || 0),
          上品: Math.max((rootData.背包 as any).灵石.上品 || 0, cleanedData.背包.灵石.上品 || 0),
          极品: Math.max((rootData.背包 as any).灵石.极品 || 0, cleanedData.背包.灵石.极品 || 0),
        };
      }
      
      // 合并物品（优先使用有效物品）
      if ((rootData.背包 as any).物品) {
        for (const [itemId, item] of Object.entries((rootData.背包 as any).物品)) {
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
    if (rootData[field] && JSON.stringify(rootData[field]) !== JSON.stringify((cleanedData as any)[field])) {
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
export async function cleanTavernDuplicates(tavernHelper: {
  getVariables(options: { type: string }): Promise<Record<string, unknown>>;
  deleteVariable(key: string, options: { type: string }): Promise<void>;
}) {
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
export function validateAndFixSaveData(saveData: SaveData): SaveData {
  console.log('[数据验证] 开始验证和修复酒馆数据...');
  
  // 1. 修复装备栏中的 "null" 字符串问题
  if (saveData.装备栏) {
    const equipment = saveData.装备栏 as Equipment;
    
    // 遍历所有装备槽位，将字符串"null"转换为实际的null
    (['装备1', '装备2', '装备3', '装备4', '装备5', '装备6'] as const).forEach(slot => {
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
      if ((item as any) === 'null' || (item as any) === 'undefined' || item === null || item === undefined) {
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
    
    if ((cultivation.功法 as any) === 'null' || (cultivation.功法 as any) === 'undefined') {
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

  // 5. 迁移异常的 "角色物品" 到 背包.物品（兼容部分AI返回的错误路径）
  try {
    const anySave: any = saveData as any;
    const src = anySave.角色物品;
    if (src && typeof src === 'object') {
      if (!saveData.背包) saveData.背包 = { 灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 }, 物品: {} } as any;
      if (!saveData.背包.物品) saveData.背包.物品 = {} as any;

      const mapType = (t: any): '法宝' | '功法' | '其他' => {
        const s = String(t || '').trim();
        const weapon = ['武器','兵器','法器','灵器','宝物','剑','刀','飞剑','木剑','装备'];
        const gongfa = ['功法','心法','秘籍','法诀','经书','法门','内功','刀法','剑法'];
        const other = ['消耗品','丹药','草药','材料','资源','道具'];
        if (s === '法宝' || weapon.includes(s)) return '法宝';
        if (s === '功法' || gongfa.includes(s)) return '功法';
        if (other.includes(s)) return '其他';
        return '其他';
      };

      const importArray = (arr: any[]) => {
        if (!Array.isArray(arr)) return;
        for (const it of arr) {
          if (!it) continue;
          const name = it.名称 || it.name || '未命名物品';
          const type = mapType(it.类型 || it.type);
          const qty = typeof it.数量 === 'number' ? it.数量 : (typeof it.quantity === 'number' ? it.quantity : 1);
          const desc = it.描述 || it.description || '';
          const idBase = String(name).replace(/[^a-zA-Z0-9一-龥]/g, '');
          const id = `item_${idBase}_${Math.floor(Math.random()*1e6)}`;
          (saveData.背包.物品 as any)[id] = {
            物品ID: id,
            名称: name,
            类型: type,
            品质: { quality: '凡品', grade: 1 },
            数量: qty,
            描述: desc
          };
        }
      };

      // 遍历各分类数组并导入
      Object.keys(src).forEach(k => {
        if (Array.isArray(src[k])) importArray(src[k]);
      });

      // 迁移完成后移除源字段
      delete anySave.角色物品;
      console.log('[数据验证] 已迁移 角色物品 → 背包.物品');
    }
  } catch (e) {
    console.warn('[数据验证] 迁移角色物品失败:', e);
  }

  // 6. 合并/清理异常的 "角色状态" 到 玩家角色状态
  try {
    const anySave: any = saveData as any;
    const extraState = anySave.角色状态;
    if (extraState && typeof extraState === 'object') {
      const ps = saveData.玩家角色状态 as any;
      if (extraState.当前位置 && (!ps?.位置?.描述 || ps.位置.描述 === '未知')) {
        ps.位置 = ps.位置 || { 描述: '', 坐标: { X: 0, Y: 0 } };
        ps.位置.描述 = extraState.当前位置;
      }
      if (extraState.情绪 && !ps?.心情) {
        ps.心情 = extraState.情绪;
      }
      // 移除杂项，避免污染
      delete anySave.角色状态;
      console.log('[数据验证] 已清理 角色状态 (合并必要字段后移除)');
    }
  } catch (e) {
    console.warn('[数据验证] 合并角色状态失败:', e);
  }
  // 规范化人物关系为最小NpcProfile，方便前端展示
  if (saveData.人物关系 && typeof saveData.人物关系 === 'object') {
    const worldName = (saveData as any)?.角色基础信息?.世界 || '未知';
    const invalidKeys: string[] = [];
    
    for (const [k, v] of Object.entries(saveData.人物关系)) {
      const name = k;
      const val: any = v;
      
      // 标记无效的临时NPC数据
      if (String(k).startsWith('npc_init_') || !val || typeof val !== 'object' || !val.角色基础信息?.名字) {
        console.log(`[数据验证] 发现无效NPC数据，标记删除: ${k}`);
        invalidKeys.push(k);
        continue;
      }
      
      if (!val || typeof val !== 'object' || (val && !('角色基础信息' in val))) {
        (saveData.人物关系 as any)[k] = {
          角色基础信息: {
            名字: name,
            性别: val?.性别 || '未知',
            年龄: val?.年龄,
            世界: worldName,
            天资: '未知',
            出生: '未知',
            灵根: '未知',
            天赋: [],
            先天六司: { 根骨: 0, 灵性: 0, 悟性: 0, 气运: 0, 魅力: 0, 心性: 0 }
          },
          外貌描述: val?.外貌描述 || '',
          角色存档信息: undefined,
          人物关系: val?.人物关系 || val?.type || '相识',
          人物好感度: typeof val?.人物好感度 === 'number' ? val.人物好感度 : (typeof val?.好感度 === 'number' ? val.好感度 : (typeof val?.value === 'number' ? val.value : 0)),
          人物记忆: Array.isArray(val?.人物记忆) ? val.人物记忆 : (Array.isArray(val?.memories) ? val.memories : []),
          互动次数: typeof val?.互动次数 === 'number' ? val.互动次数 : 0,
          最后互动时间: (val?.最后互动时间 || new Date().toISOString()),
          特殊标记: Array.isArray(val?.特殊标记) ? val.特殊标记 : []
        } as any;
      }
    }
    
    // 删除无效的NPC数据
    invalidKeys.forEach(key => {
      delete (saveData.人物关系 as any)[key];
      console.log(`[数据验证] 已删除无效NPC: ${key}`);
    });
    
    if (invalidKeys.length > 0) {
      console.log(`[数据验证] 共清理了 ${invalidKeys.length} 个无效NPC数据`);
    }
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
