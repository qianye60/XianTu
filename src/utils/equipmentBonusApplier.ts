/**
 * @fileoverview 装备属性增幅应用系统
 * 负责在装备/卸下装备时，自动应用或移除属性加成
 */

import { get, set } from 'lodash';
import type { SaveData, AttributeBonus, Item } from '@/types/game';

function ensureAttributes(saveData: SaveData): any {
  const anySave = saveData as any;
  if (anySave.角色?.属性 && typeof anySave.角色.属性 === 'object') return anySave.角色.属性;

  anySave.角色 = anySave.角色 && typeof anySave.角色 === 'object' ? anySave.角色 : {};
  anySave.角色.属性 = {
    境界: { 名称: '凡人', 阶段: '', 当前进度: 0, 下一级所需: 100, 突破描述: '' },
    声望: 0,
    气血: { 当前: 100, 上限: 100 },
    灵气: { 当前: 50, 上限: 50 },
    神识: { 当前: 10, 上限: 10 },
    寿命: { 当前: 18, 上限: 80 },
  };
  return anySave.角色.属性;
}

function resolveCharacterTarget(saveData: SaveData): { character: any } {
  const anySave = saveData as any;
  if (anySave.角色?.身份 && typeof anySave.角色.身份 === 'object') return { character: anySave.角色.身份 };
  anySave.角色 = anySave.角色 && typeof anySave.角色 === 'object' ? anySave.角色 : {};
  anySave.角色.身份 = { 后天六司: { 根骨: 0, 灵性: 0, 悟性: 0, 气运: 0, 魅力: 0, 心性: 0 } };
  return { character: anySave.角色.身份 };
}

/**
 * 应用装备的属性加成到角色属性
 * @param saveData 存档数据
 * @param equipmentItemId 装备物品ID
 * @returns 是否成功应用
 */
export function applyEquipmentBonus(saveData: SaveData, equipmentItemId: string): boolean {
  try {
    const attributes = ensureAttributes(saveData);
    const { character } = resolveCharacterTarget(saveData);

    // 获取装备物品数据
    const itemMap = (saveData as any)?.角色?.背包?.物品;
    const item: Item | undefined = itemMap?.[equipmentItemId];
    if (!item || item.类型 !== '装备') {
      console.warn(`[装备增幅] 物品 ${equipmentItemId} 不是装备类型`);
      return false;
    }

    const bonus: AttributeBonus | undefined = item.装备增幅;
    if (!bonus) {
      console.log(`[装备增幅] 装备 ${item.名称} 没有属性加成`);
      return true; // 没有加成不算失败
    }

    console.log(`[装备增幅] 开始应用装备 ${item.名称} 的属性加成:`, bonus);

    // 应用气血上限加成
    if (bonus.气血上限 && typeof bonus.气血上限 === 'number') {
      const current气血 = get(attributes, '气血', { 当前: 100, 上限: 100 });
      const new上限 = current气血.上限 + bonus.气血上限;
      set(attributes, '气血.上限', new上限);
      console.log(`[装备增幅] 气血上限: ${current气血.上限} -> ${new上限} (+${bonus.气血上限})`);
    }

    // 应用灵气上限加成
    if (bonus.灵气上限 && typeof bonus.灵气上限 === 'number') {
      const current灵气 = get(attributes, '灵气', { 当前: 100, 上限: 100 });
      const new上限 = current灵气.上限 + bonus.灵气上限;
      set(attributes, '灵气.上限', new上限);
      console.log(`[装备增幅] 灵气上限: ${current灵气.上限} -> ${new上限} (+${bonus.灵气上限})`);
    }

    // 应用神识上限加成
    if (bonus.神识上限 && typeof bonus.神识上限 === 'number') {
      const current神识 = get(attributes, '神识', { 当前: 100, 上限: 100 });
      const new上限 = current神识.上限 + bonus.神识上限;
      set(attributes, '神识.上限', new上限);
      console.log(`[装备增幅] 神识上限: ${current神识.上限} -> ${new上限} (+${bonus.神识上限})`);
    }

    // 应用后天六司加成
    if (bonus.后天六司) {
      const 后天六司属性 = ['根骨', '灵性', '悟性', '气运', '魅力', '心性'] as const;
      后天六司属性.forEach(attr => {
        const bonusValue = bonus.后天六司?.[attr as keyof typeof bonus.后天六司];
        if (bonusValue && typeof bonusValue === 'number') {
          const currentValue = get(character, `后天六司.${attr}`, 0);
          const newValue = currentValue + bonusValue;
          set(character, `后天六司.${attr}`, newValue);
          console.log(`[装备增幅] 后天六司.${attr}: ${currentValue} -> ${newValue} (+${bonusValue})`);
        }
      });
    }

    console.log(`[装备增幅] ✅ 成功应用装备 ${item.名称} 的属性加成`);
    return true;
  } catch (error) {
    console.error(`[装备增幅] 应用装备加成失败:`, error);
    return false;
  }
}

/**
 * 移除装备的属性加成从角色属性
 * @param saveData 存档数据
 * @param equipmentItemId 装备物品ID
 * @returns 是否成功移除
 */
export function removeEquipmentBonus(saveData: SaveData, equipmentItemId: string): boolean {
  try {
    const attributes = ensureAttributes(saveData);
    const { character } = resolveCharacterTarget(saveData);

    // 获取装备物品数据
    const itemMap = (saveData as any)?.角色?.背包?.物品;
    const item: Item | undefined = itemMap?.[equipmentItemId];
    if (!item || item.类型 !== '装备') {
      console.warn(`[装备增幅] 物品 ${equipmentItemId} 不是装备类型`);
      return false;
    }

    const bonus: AttributeBonus | undefined = item.装备增幅;
    if (!bonus) {
      console.log(`[装备增幅] 装备 ${item.名称} 没有属性加成`);
      return true; // 没有加成不算失败
    }

    console.log(`[装备增幅] 开始移除装备 ${item.名称} 的属性加成:`, bonus);

    // 移除气血上限加成
    if (bonus.气血上限 && typeof bonus.气血上限 === 'number') {
      const current气血 = get(attributes, '气血', { 当前: 100, 上限: 100 });
      const new上限 = Math.max(1, current气血.上限 - bonus.气血上限); // 最小为1
      set(attributes, '气血.上限', new上限);

      // 如果当前值超过新的上限，调整当前值
      if (current气血.当前 > new上限) {
        set(attributes, '气血.当前', new上限);
        console.log(`[装备增幅] 气血当前值超过新上限，已调整: ${current气血.当前} -> ${new上限}`);
      }

      console.log(`[装备增幅] 气血上限: ${current气血.上限} -> ${new上限} (-${bonus.气血上限})`);
    }

    // 移除灵气上限加成
    if (bonus.灵气上限 && typeof bonus.灵气上限 === 'number') {
      const current灵气 = get(attributes, '灵气', { 当前: 100, 上限: 100 });
      const new上限 = Math.max(1, current灵气.上限 - bonus.灵气上限);
      set(attributes, '灵气.上限', new上限);

      if (current灵气.当前 > new上限) {
        set(attributes, '灵气.当前', new上限);
        console.log(`[装备增幅] 灵气当前值超过新上限，已调整: ${current灵气.当前} -> ${new上限}`);
      }

      console.log(`[装备增幅] 灵气上限: ${current灵气.上限} -> ${new上限} (-${bonus.灵气上限})`);
    }

    // 移除神识上限加成
    if (bonus.神识上限 && typeof bonus.神识上限 === 'number') {
      const current神识 = get(attributes, '神识', { 当前: 100, 上限: 100 });
      const new上限 = Math.max(1, current神识.上限 - bonus.神识上限);
      set(attributes, '神识.上限', new上限);

      if (current神识.当前 > new上限) {
        set(attributes, '神识.当前', new上限);
        console.log(`[装备增幅] 神识当前值超过新上限，已调整: ${current神识.当前} -> ${new上限}`);
      }

      console.log(`[装备增幅] 神识上限: ${current神识.上限} -> ${new上限} (-${bonus.神识上限})`);
    }

    // 移除后天六司加成
    if (bonus.后天六司) {
      const 后天六司属性 = ['根骨', '灵性', '悟性', '气运', '魅力', '心性'] as const;
      后天六司属性.forEach(attr => {
        const bonusValue = bonus.后天六司?.[attr as keyof typeof bonus.后天六司];
        if (bonusValue && typeof bonusValue === 'number') {
          const currentValue = get(character, `后天六司.${attr}`, 0);
          const newValue = Math.max(0, currentValue - bonusValue);
          set(character, `后天六司.${attr}`, newValue);
          console.log(`[装备增幅] 后天六司.${attr}: ${currentValue} -> ${newValue} (-${bonusValue})`);
        }
      });
    }

    console.log(`[装备增幅] ✅ 成功移除装备 ${item.名称} 的属性加成`);
    return true;
  } catch (error) {
    console.error(`[装备增幅] 移除装备加成失败:`, error);
    return false;
  }
}

/**
 * 重新计算所有装备的属性加成
 * 用于修复数据不一致的情况
 * @param saveData 存档数据
 */
export function recalculateAllEquipmentBonuses(saveData: SaveData): void {
  console.log('[装备增幅] 开始重新计算所有装备的属性加成...');

  try {
    const { character } = resolveCharacterTarget(saveData);

    // 1. 重置后天六司为0（清除所有装备加成）
    const emptyBonuses = { 根骨: 0, 灵性: 0, 悟性: 0, 气运: 0, 魅力: 0, 心性: 0 };
    character.后天六司 = { ...emptyBonuses };

    console.log('[装备增幅] 已重置后天六司为0');

    // 2. 遍历装备槽位中的所有装备（V3：saveData.角色.装备 / saveData.角色.背包）
    const equipmentSlots = ((saveData as any).角色?.装备 ?? {}) as Record<string, unknown>;
    const inventory = (saveData as any).角色?.背包;
    if (!equipmentSlots || !inventory?.物品) {
      console.log('[装备增幅] 没有装备数据或背包数据');
      return;
    }

    const totalBonuses = {
      根骨: 0,
      灵性: 0,
      悟性: 0,
      气运: 0,
      魅力: 0,
      心性: 0
    };

    // 3. 累加所有已装备的装备加成
    Object.entries(equipmentSlots).forEach(([slot, slotValue]) => {
      const itemId =
        typeof slotValue === 'string'
          ? slotValue
          : typeof slotValue === 'object' && slotValue !== null && '物品ID' in slotValue
            ? String((slotValue as any).物品ID || '')
            : '';
      if (!itemId) return;

      const item = inventory.物品[itemId];
      if (!item || item.类型 !== '装备') return;

      const bonus = item.装备增幅;
      if (!bonus || !bonus.后天六司) return;

      console.log(`[装备增幅] 处理装备 ${item.名称} (${slot}):`, bonus.后天六司);

      // 累加后天六司加成
      Object.entries(bonus.后天六司).forEach(([attr, value]) => {
        if (attr in totalBonuses && typeof value === 'number') {
          totalBonuses[attr as keyof typeof totalBonuses] += value;
        }
      });
    });

    // 4. 应用累加后的加成（V3：角色.身份.后天六司）
    character.后天六司 = totalBonuses;

    console.log('[装备增幅] ✅ 重新计算完成，最终后天六司:', totalBonuses);
  } catch (error) {
    console.error('[装备增幅] 重新计算失败:', error);
  }
}
