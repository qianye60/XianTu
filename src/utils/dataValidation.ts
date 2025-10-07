/**
 * @fileoverview 统一数据验证工具
 * 确保酒馆变量和游戏存档数据结构正确，修复常见的数据类型问题
 * 整合了原 dataValidation.ts 和 gameDataValidator.ts 的功能
 */

import type { SaveData, Equipment, Item, Inventory, NpcProfile, CharacterProfile } from '@/types/game.d';
import type { TavernHelper } from '@/types';
import { debug } from './debug';

// 定义 Tavern 变量类型（现已使用分片存储）
type TavernChatVariables = Record<string, unknown>;

// 识别明显的地名/建筑名（避免误被当作NPC）
function isLikelyPlaceName(name: string): boolean {
  const placeSuffixes = [
    '斋','阁','殿','堂','观','庙','楼','坊','庄','居','院','馆','铺','轩','苑','宫','台',
    '山','谷','峰','崖','洞','关','岛','城','镇','村','街','巷','桥','路'
  ];
  try { return placeSuffixes.some(suf => name.endsWith(suf)); } catch { return false; }
}

/**
 * @deprecated 此函数已废弃，现使用分片存储，不再需要清理重复数据
 */
export function cleanDuplicateData(_chatVariables: TavernChatVariables): SaveData | null {
  console.warn('[数据清理] cleanDuplicateData 已废弃，现使用分片存储');
  return null;
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

  // 工具：限制数值到指定范围（默认0-10）
  const clamp = (n: unknown, min = 0, max = 10): number => {
    const v = typeof n === 'number' ? n : parseFloat(String(n));
    if (Number.isNaN(v)) return min;
    return Math.max(min, Math.min(max, v));
  };

  // 提前注入系统规则与先天六司上限修正（玩家 + NPC）
  try {
    // 确保系统规则存在
    if (!(saveData as any).系统) (saveData as any).系统 = {};
    if (!(saveData as any).系统.规则) (saveData as any).系统.规则 = {};
    if (!(saveData as any).系统.规则.属性上限) (saveData as any).系统.规则.属性上限 = {};
    if (!(saveData as any).系统.规则.属性上限.先天六司) (saveData as any).系统.规则.属性上限.先天六司 = { 每项上限: 10 };

    // 玩家：角色基础信息.先天六司
    const innate = (saveData as any)?.角色基础信息?.先天六司;
    if (innate && typeof innate === 'object') {
      if ('根骨' in innate) innate['根骨'] = clamp(innate['根骨']);
      if ('灵性' in innate) innate['灵性'] = clamp(innate['灵性']);
      if ('悟性' in innate) innate['悟性'] = clamp(innate['悟性']);
      if ('气运' in innate) innate['气运'] = clamp(innate['气运']);
      if ('魅力' in innate) innate['魅力'] = clamp(innate['魅力']);
      if ('心性' in innate) innate['心性'] = clamp(innate['心性']);
    }

    // NPC：人物关系.*.角色基础信息.先天六司
    if ((saveData as any).人物关系) {
      Object.values((saveData as any).人物关系).forEach((npc: any) => {
        const npcInnate = npc?.角色基础信息?.先天六司;
        if (npcInnate && typeof npcInnate === 'object') {
          if ('根骨' in npcInnate) npcInnate['根骨'] = clamp(npcInnate['根骨']);
          if ('灵性' in npcInnate) npcInnate['灵性'] = clamp(npcInnate['灵性']);
          if ('悟性' in npcInnate) npcInnate['悟性'] = clamp(npcInnate['悟性']);
          if ('气运' in npcInnate) npcInnate['气运'] = clamp(npcInnate['气运']);
          if ('魅力' in npcInnate) npcInnate['魅力'] = clamp(npcInnate['魅力']);
          if ('心性' in npcInnate) npcInnate['心性'] = clamp(npcInnate['心性']);
        }
      });
    }

    // 写入提示（便于AI在当前状态中读到）
    const tipLine = '系统规则：先天六司每项上限为10（NPC同样适用），如超限需裁剪至上限。';
    const sys = (saveData as any).系统;
    if (Array.isArray(sys.提示)) {
      if (!sys.提示.includes(tipLine)) sys.提示.push(tipLine);
    } else if (typeof sys.提示 === 'string') {
      if (!sys.提示.includes('先天六司每项上限')) sys.提示 = [sys.提示, tipLine];
    } else {
      sys.提示 = [tipLine];
    }
  } catch (e) {
    console.warn('[数据验证] 注入系统规则/修正先天六司时发生警告:', e);
  }

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

  // 3. 修复修炼功法中的 "null" 字符串（新结构：修炼功法本身就是功法数据或null）
  if ((saveData.修炼功法 as unknown) === 'null' || (saveData.修炼功法 as unknown) === 'undefined') {
    console.log('[数据验证] 修复修炼功法: "null" -> null');
    saveData.修炼功法 = null;
  }
  // 如果修炼功法存在，确保已解锁技能数组存在
  if (saveData.修炼功法 && typeof saveData.修炼功法 === 'object') {
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
      if (!npc || typeof npc !== 'object' || !(npc as any).角色基础信息?.名字 || key.startsWith('npc_init_') || isLikelyPlaceName(key)) {
        console.log(`[数据验证] 发现无效NPC数据或地名，标记删除: ${key}`);
        delete saveData.人物关系[key];
        continue;
      }
      // 确保基础结构完整
      if (!('人物关系' in npc)) (npc as any).人物关系 = '相识';
      if (!('人物好感度' in npc)) (npc as any).人物好感度 = 0;
    }
  }

  // 8. 跳过角色基础信息中的灵根检查，因为外层灵根可能是字符串格式（如"随机灵根"）
  // 外层的角色基础信息不需要验证，只验证存档数据内部结构
  console.log('[数据验证] 跳过外层角色基础信息的灵根验证，外层可以是字符串格式');

  // 9. 确保记忆模块存在
  if (!saveData.记忆) {
    saveData.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [] };
  }

  // 10. 装备状态双向同步与修复
  if (saveData.背包?.物品 && saveData.装备栏) {
    const inventoryItems = saveData.背包.物品;
    const equipmentSlots = saveData.装备栏;
    const equippedItemIds = new Set<string>();

    // 从装备栏构建已装备物品ID集合，并清理无效引用
    for (const slot in equipmentSlots) {
      const slotItem = equipmentSlots[slot as keyof Equipment];
      if (slotItem && typeof slotItem === 'object' && slotItem.物品ID) {
        // 检查引用的物品是否存在于背包
        if (inventoryItems[slotItem.物品ID]) {
          equippedItemIds.add(slotItem.物品ID);
        } else {
          // 如果物品不存在，这是一个“幽灵”装备，清空该槽位
          console.warn(`[数据验证] 修复：装备栏中的物品 ${slotItem.物品ID} 在背包中不存在，已移除。`);
          equipmentSlots[slot as keyof Equipment] = null;
        }
      }
    }

    // 遍历背包，同步状态
    for (const itemId in inventoryItems) {
      const item = inventoryItems[itemId];
      if (item && item.类型 === '装备') {
        const isEquippedInSlots = equippedItemIds.has(itemId);

        // 情况1：物品标记为已装备，但不在装备栏中
        if (item.已装备 && !isEquippedInSlots) {
          console.warn(`[数据验证] 修复：物品 ${item.名称} (${itemId}) 标记为已装备但不在装备栏中。`);
          // 尝试找到一个空槽位
          const emptySlot = Object.keys(equipmentSlots).find(slot => !equipmentSlots[slot as keyof Equipment]);
          if (emptySlot) {
            equipmentSlots[emptySlot as keyof Equipment] = { 名称: item.名称, 物品ID: item.物品ID };
            console.log(`[数据验证] -> 已将其放入空槽位 ${emptySlot}。`);
          } else {
            // 没有空槽位，取消其装备状态
            item.已装备 = false;
            console.log(`[数据验证] -> 装备栏已满，已取消其装备状态。`);
          }
        }

        // 情况2：物品未标记为已装备，但在装备栏中
        else if (!item.已装备 && isEquippedInSlots) {
          console.warn(`[数据验证] 修复：物品 ${item.名称} (${itemId}) 在装备栏中但未标记为已装备。`);
          item.已装备 = true;
          console.log(`[数据验证] -> 已将其状态更新为“已装备”。`);
        }
      }
    }
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
    const requiredFields: (keyof SaveData['玩家角色状态'])[] = ['境界', '气血', '灵气', '神识', '寿命'];
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

  if (saveData.修炼功法 && typeof saveData.修炼功法 === 'object') {
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
  validateGameData,
};

/**
 * 轻量级游戏数据验证（用于角色创建和加载时的快速检查）
 * @param saveData 存档数据
 * @param profile 角色配置
 * @param context 验证上下文：'creation'（创建）或 'loading'（加载）
 * @returns 验证结果对象
 */
export function validateGameData(saveData: SaveData, profile: CharacterProfile, context: 'creation' | 'loading' = 'creation'): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  debug.log('数据验证', `开始检查数据骨架 (上下文: ${context})...`);

  // 1. 检查背包物品 (Inventory)
  // ⚠️ 重要：`背包.物品` 必须是对象结构 Record<string, Item>，不是数组
  if (saveData.背包 && saveData.背包.物品 !== undefined) {
    if (typeof saveData.背包.物品 !== 'object' || saveData.背包.物品 === null || Array.isArray(saveData.背包.物品)) {
      errors.push('核心数据错误：`背包.物品` 结构不正确，必须是一个对象 (Record<string, Item>)，不能是数组。这可能是由于旧版存档数据不兼容导致的。');
    }
  } else {
    // 如果连背包或物品字段都没有，也算作错误
    errors.push('数据缺失：`背包.物品` 字段不存在。');
  }

  // 2. 跳过外层角色基础信息的灵根检查
  // 外层的角色基础信息.灵根可以是字符串格式（如"随机灵根"），这是正常的
  // 只需要确保存档数据内部的结构是正确的
  debug.log('数据验证', '跳过外层角色基础信息的灵根验证，外层允许字符串格式');

  // 3. 检查存档数据内部的关键结构
  // 这里可以添加对 saveData 内部结构的检查

  const isValid = errors.length === 0;

  if (isValid) {
    debug.log('数据验证', '数据骨架检查通过，结构有效。');
  } else {
    debug.error('数据验证', '数据骨架检查失败！发现以下问题:', errors);
  }

  return {
    isValid,
    errors,
  };
}
