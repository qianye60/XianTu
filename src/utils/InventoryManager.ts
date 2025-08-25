/**
 * 背包管理系统
 * 管理玩家物品存储、整理、使用和交易
 * 
 * 功能包括：
 * - 背包扩展和分页
 * - 物品分类和筛选
 * - 自动整理和堆叠
 * - 物品使用和装备
 * - 买卖和交易
 */

import { ItemSystem, GameItem, ItemType, ItemQuality, InventorySlot } from './ItemSystem';
import { GameStateManager } from './GameStateManager';
import { getTavernHelper } from './tavern';
import { toast } from './toast';

// 背包配置
export interface InventoryConfig {
  baseSize: number; // 基础容量
  maxSize: number; // 最大容量
  expandCost: number; // 扩展费用基数
  autoSort: boolean; // 自动整理
  autoStack: boolean; // 自动堆叠
  categories: ItemType[]; // 显示分类
}

// 物品过滤器
export interface ItemFilter {
  type?: ItemType;
  quality?: ItemQuality[];
  levelRange?: [number, number];
  searchText?: string;
  showEquipped?: boolean;
}

// 装备槽位枚举
export enum EquipSlot {
  WEAPON = '武器',
  HEAD = '头部',
  CHEST = '胸甲',
  LEGS = '腿甲',
  FEET = '足部',
  RING_1 = '戒指1',
  RING_2 = '戒指2',
  NECKLACE = '项链',
  ACCESSORY = '配饰'
}

// 装备信息
export interface EquippedItem {
  slot: EquipSlot;
  item: GameItem;
  equippedAt: string;
}

// 货币类型
export interface Currency {
  下品灵石: number;
  中品灵石: number;
  上品灵石: number;
  极品灵石: number;
}

class InventoryManagerClass {
  private slots: InventorySlot[] = [];
  private equippedItems: Map<EquipSlot, GameItem> = new Map();
  private currency: Currency = {
    下品灵石: 0,
    中品灵石: 0,
    上品灵石: 0,
    极品灵石: 0,
  };
  
  private config: InventoryConfig = {
    baseSize: 20,
    maxSize: 200,
    expandCost: 1000,
    autoSort: true,
    autoStack: true,
    categories: Object.values(ItemType),
  };

  private tavernHelper: any = null;

  constructor() {
    this.initializeInventory();
  }

  /**
   * 初始化背包系统
   */
  private async initializeInventory() {
    try {
      this.tavernHelper = getTavernHelper();
      await this.loadInventoryFromStorage();
      this.initializeSlots();
      console.log('[背包系统] 初始化完成');
    } catch (error) {
      console.error('[背包系统] 初始化失败:', error);
    }
  }

  /**
   * 初始化背包槽位
   */
  private initializeSlots() {
    if (this.slots.length === 0) {
      this.slots = Array.from({ length: this.config.baseSize }, () => ({
        item: null,
        quantity: 0,
      }));
    }
  }

  /**
   * 添加物品到背包
   */
  public addItem(item: GameItem, quantity: number = 1): boolean {
    try {
      // 尝试堆叠到现有物品
      if (this.config.autoStack && item.stackSize > 1) {
        const existingSlot = this.findExistingItem(item.id);
        if (existingSlot && existingSlot.item) {
          const canStack = Math.min(
            quantity,
            existingSlot.item.stackSize - existingSlot.quantity
          );
          
          if (canStack > 0) {
            existingSlot.quantity += canStack;
            quantity -= canStack;
            
            if (quantity === 0) {
              this.saveInventoryToStorage();
              return true;
            }
          }
        }
      }

      // 寻找空槽位
      while (quantity > 0) {
        const emptySlot = this.findEmptySlot();
        if (!emptySlot) {
          toast.error('背包已满，无法添加更多物品');
          return false;
        }

        const stackAmount = Math.min(quantity, item.stackSize);
        emptySlot.item = { ...item };
        emptySlot.quantity = stackAmount;
        quantity -= stackAmount;
      }

      this.saveInventoryToStorage();
      toast.success(`获得 ${item.name} x${quantity}`);
      return true;

    } catch (error) {
      console.error('[背包系统] 添加物品失败:', error);
      return false;
    }
  }

  /**
   * 移除物品
   */
  public removeItem(itemId: string, quantity: number = 1): boolean {
    try {
      let remainingQuantity = quantity;

      for (const slot of this.slots) {
        if (slot.item?.id === itemId) {
          const removeAmount = Math.min(remainingQuantity, slot.quantity);
          slot.quantity -= removeAmount;
          remainingQuantity -= removeAmount;

          if (slot.quantity === 0) {
            slot.item = null;
          }

          if (remainingQuantity === 0) {
            break;
          }
        }
      }

      this.saveInventoryToStorage();
      return remainingQuantity === 0;

    } catch (error) {
      console.error('[背包系统] 移除物品失败:', error);
      return false;
    }
  }

  /**
   * 使用物品
   */
  public useItem(itemId: string, quantity: number = 1): boolean {
    try {
      const slot = this.findExistingItem(itemId);
      if (!slot || !slot.item || slot.quantity < quantity) {
        toast.error('物品不足');
        return false;
      }

      // 检查使用条件
      if (!this.checkItemRequirements(slot.item)) {
        return false;
      }

      // 执行物品效果
      this.applyItemEffects(slot.item, quantity);

      // 消耗物品（如果是消耗品）
      if (slot.item.type === ItemType.CONSUMABLE) {
        slot.quantity -= quantity;
        if (slot.quantity === 0) {
          slot.item = null;
        }
      }

      this.saveInventoryToStorage();
      return true;

    } catch (error) {
      console.error('[背包系统] 使用物品失败:', error);
      return false;
    }
  }

  /**
   * 装备物品
   */
  public equipItem(itemId: string): boolean {
    try {
      const slot = this.findExistingItem(itemId);
      if (!slot || !slot.item) {
        toast.error('物品不存在');
        return false;
      }

      const item = slot.item;
      const equipSlot = this.getEquipSlot(item);
      if (!equipSlot) {
        toast.error('该物品无法装备');
        return false;
      }

      // 检查装备条件
      if (!this.checkItemRequirements(item)) {
        return false;
      }

      // 卸下当前装备
      const currentEquipped = this.equippedItems.get(equipSlot);
      if (currentEquipped) {
        this.addItem(currentEquipped, 1);
      }

      // 装备新物品
      this.equippedItems.set(equipSlot, item);
      this.removeItem(itemId, 1);

      // 应用装备属性
      this.updateEquipmentStats();

      toast.success(`装备了 ${item.name}`);
      this.saveInventoryToStorage();
      return true;

    } catch (error) {
      console.error('[背包系统] 装备物品失败:', error);
      return false;
    }
  }

  /**
   * 卸下装备
   */
  public unequipItem(equipSlot: EquipSlot): boolean {
    try {
      const equippedItem = this.equippedItems.get(equipSlot);
      if (!equippedItem) {
        toast.error('该槽位没有装备');
        return false;
      }

      // 检查背包空间
      if (!this.hasSpace(1)) {
        toast.error('背包空间不足');
        return false;
      }

      // 卸下装备
      this.equippedItems.delete(equipSlot);
      this.addItem(equippedItem, 1);

      // 更新属性
      this.updateEquipmentStats();

      toast.success(`卸下了 ${equippedItem.name}`);
      this.saveInventoryToStorage();
      return true;

    } catch (error) {
      console.error('[背包系统] 卸下装备失败:', error);
      return false;
    }
  }

  /**
   * 出售物品
   */
  public sellItem(itemId: string, quantity: number = 1): boolean {
    try {
      const slot = this.findExistingItem(itemId);
      if (!slot || !slot.item || slot.quantity < quantity) {
        toast.error('物品不足');
        return false;
      }

      const item = slot.item;
      const totalValue = item.sellValue * quantity;

      // 移除物品
      if (!this.removeItem(itemId, quantity)) {
        return false;
      }

      // 添加货币
      this.addCurrency('下品灵石', totalValue);

      toast.success(`出售 ${item.name} x${quantity}，获得 ${totalValue} 下品灵石`);
      this.saveInventoryToStorage();
      return true;

    } catch (error) {
      console.error('[背包系统] 出售物品失败:', error);
      return false;
    }
  }

  /**
   * 整理背包
   */
  public sortInventory(sortBy: 'type' | 'quality' | 'name' | 'value' = 'type'): void {
    try {
      // 收集所有有效物品
      const items: { item: GameItem; quantity: number }[] = [];
      this.slots.forEach(slot => {
        if (slot.item) {
          items.push({ item: slot.item, quantity: slot.quantity });
        }
      });

      // 清空槽位
      this.slots.forEach(slot => {
        slot.item = null;
        slot.quantity = 0;
      });

      // 排序物品
      items.sort((a, b) => {
        switch (sortBy) {
          case 'type':
            return a.item.type.localeCompare(b.item.type);
          case 'quality':
            const qualityOrder = ['凡', '黄', '玄', '地', '天', '仙', '神'];
            return qualityOrder.indexOf(a.item.quality) - qualityOrder.indexOf(b.item.quality);
          case 'name':
            return a.item.name.localeCompare(b.item.name);
          case 'value':
            return b.item.sellValue - a.item.sellValue;
          default:
            return 0;
        }
      });

      // 重新放置物品
      let slotIndex = 0;
      for (const { item, quantity } of items) {
        if (slotIndex < this.slots.length) {
          this.slots[slotIndex].item = item;
          this.slots[slotIndex].quantity = quantity;
          slotIndex++;
        }
      }

      toast.success('背包整理完成');
      this.saveInventoryToStorage();

    } catch (error) {
      console.error('[背包系统] 整理背包失败:', error);
    }
  }

  /**
   * 扩展背包
   */
  public expandInventory(): boolean {
    try {
      if (this.slots.length >= this.config.maxSize) {
        toast.error('背包已达最大容量');
        return false;
      }

      const expandSize = Math.min(10, this.config.maxSize - this.slots.length);
      const cost = this.config.expandCost * Math.floor(this.slots.length / 10 + 1);

      if (this.currency.下品灵石 < cost) {
        toast.error(`扩展背包需要 ${cost} 下品灵石`);
        return false;
      }

      // 扣除费用
      this.currency.下品灵石 -= cost;

      // 添加槽位
      for (let i = 0; i < expandSize; i++) {
        this.slots.push({ item: null, quantity: 0 });
      }

      toast.success(`背包扩展成功，新增 ${expandSize} 个槽位`);
      this.saveInventoryToStorage();
      return true;

    } catch (error) {
      console.error('[背包系统] 扩展背包失败:', error);
      return false;
    }
  }

  /**
   * 获取过滤后的物品列表
   */
  public getFilteredItems(filter: ItemFilter = {}): InventorySlot[] {
    return this.slots.filter(slot => {
      if (!slot.item) return false;

      const item = slot.item;

      // 类型过滤
      if (filter.type && item.type !== filter.type) {
        return false;
      }

      // 品质过滤
      if (filter.quality && filter.quality.length > 0 && !filter.quality.includes(item.quality)) {
        return false;
      }

      // 等级过滤
      if (filter.levelRange) {
        const [minLevel, maxLevel] = filter.levelRange;
        if (item.level < minLevel || item.level > maxLevel) {
          return false;
        }
      }

      // 文本搜索
      if (filter.searchText) {
        const searchText = filter.searchText.toLowerCase();
        if (!item.name.toLowerCase().includes(searchText) &&
            !item.description.toLowerCase().includes(searchText)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 获取装备列表
   */
  public getEquippedItems(): EquippedItem[] {
    const equipped: EquippedItem[] = [];
    
    for (const [slot, item] of this.equippedItems.entries()) {
      equipped.push({
        slot,
        item,
        equippedAt: new Date().toISOString(), // 简化版，实际应存储装备时间
      });
    }

    return equipped;
  }

  /**
   * 获取背包统计信息
   */
  public getInventoryStats(): {
    usedSlots: number;
    totalSlots: number;
    itemsByType: Record<ItemType, number>;
    itemsByQuality: Record<ItemQuality, number>;
    totalValue: number;
    currency: Currency;
  } {
    const usedSlots = this.slots.filter(slot => slot.item).length;
    const itemsByType: Record<string, number> = {};
    const itemsByQuality: Record<string, number> = {};
    let totalValue = 0;

    this.slots.forEach(slot => {
      if (slot.item) {
        itemsByType[slot.item.type] = (itemsByType[slot.item.type] || 0) + slot.quantity;
        itemsByQuality[slot.item.quality] = (itemsByQuality[slot.item.quality] || 0) + slot.quantity;
        totalValue += slot.item.sellValue * slot.quantity;
      }
    });

    return {
      usedSlots,
      totalSlots: this.slots.length,
      itemsByType: itemsByType as Record<ItemType, number>,
      itemsByQuality: itemsByQuality as Record<ItemQuality, number>,
      totalValue,
      currency: { ...this.currency },
    };
  }

  // 私有辅助方法

  private findExistingItem(itemId: string): InventorySlot | null {
    return this.slots.find(slot => slot.item?.id === itemId) || null;
  }

  private findEmptySlot(): InventorySlot | null {
    return this.slots.find(slot => !slot.item) || null;
  }

  private hasSpace(requiredSlots: number): boolean {
    const emptySlots = this.slots.filter(slot => !slot.item).length;
    return emptySlots >= requiredSlots;
  }

  private getEquipSlot(item: GameItem): EquipSlot | null {
    const slotMap: Record<ItemType, EquipSlot[]> = {
      [ItemType.WEAPON]: [EquipSlot.WEAPON],
      [ItemType.ARMOR]: [EquipSlot.HEAD, EquipSlot.CHEST, EquipSlot.LEGS, EquipSlot.FEET],
      [ItemType.ACCESSORY]: [EquipSlot.RING_1, EquipSlot.RING_2, EquipSlot.NECKLACE, EquipSlot.ACCESSORY],
      [ItemType.CONSUMABLE]: [],
      [ItemType.MATERIAL]: [],
      [ItemType.TECHNIQUE]: [],
      [ItemType.PILL]: [],
      [ItemType.TREASURE]: [EquipSlot.ACCESSORY],
      [ItemType.BOOK]: [],
      [ItemType.MISC]: [],
    };

    const possibleSlots = slotMap[item.type] || [];
    
    // 返回第一个空槽位，如果没有空的就返回第一个
    for (const slot of possibleSlots) {
      if (!this.equippedItems.has(slot)) {
        return slot;
      }
    }

    return possibleSlots[0] || null;
  }

  private checkItemRequirements(item: GameItem): boolean {
    if (!item.requirements) return true;

    // 检查境界要求
    if (item.requirements.realm) {
      // 这里需要与GameStateManager集成
      // 暂时简化处理
      console.log('检查境界要求:', item.requirements.realm);
    }

    return true;
  }

  private applyItemEffects(item: GameItem, quantity: number): void {
    if (!item.effects) return;

    item.effects.forEach(effect => {
      switch (effect.type) {
        case 'passive':
          // 被动效果已在装备时应用
          break;
        case 'active':
          // 执行主动效果
          this.executeActiveEffect(effect.description, quantity);
          break;
        case 'triggered':
          // 触发式效果需要事件系统支持
          break;
      }
    });
  }

  private executeActiveEffect(description: string, quantity: number): void {
    // 这里需要根据描述解析并执行具体效果
    // 简化版实现
    toast.info(`物品效果：${description}`);
  }

  private updateEquipmentStats(): void {
    // 这里需要与GameStateManager集成，更新角色属性
    const totalStats = this.calculateTotalEquipmentStats();
    console.log('[背包系统] 装备属性更新:', totalStats);
  }

  private calculateTotalEquipmentStats(): Record<string, number> {
    const totalStats: Record<string, number> = {};

    for (const item of this.equippedItems.values()) {
      item.attributes.forEach(attr => {
        totalStats[attr.type] = (totalStats[attr.type] || 0) + attr.value;
      });
    }

    return totalStats;
  }

  private addCurrency(type: keyof Currency, amount: number): void {
    this.currency[type] += amount;
  }

  private saveInventoryToStorage(): void {
    try {
      const inventoryData = {
        slots: this.slots,
        equipped: Array.from(this.equippedItems.entries()),
        currency: this.currency,
        config: this.config,
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem('game-inventory', JSON.stringify(inventoryData));
    } catch (error) {
      console.error('[背包系统] 保存失败:', error);
    }
  }

  private loadInventoryFromStorage(): void {
    try {
      const stored = localStorage.getItem('game-inventory');
      if (stored) {
        const inventoryData = JSON.parse(stored);
        this.slots = inventoryData.slots || [];
        this.currency = inventoryData.currency || this.currency;
        
        if (inventoryData.equipped) {
          this.equippedItems = new Map(inventoryData.equipped);
        }

        if (inventoryData.config) {
          this.config = { ...this.config, ...inventoryData.config };
        }

        console.log('[背包系统] 从本地存储加载完成');
      }
    } catch (error) {
      console.error('[背包系统] 加载失败:', error);
    }
  }
}

// 导出单例实例
export const InventoryManager = new InventoryManagerClass();

export default InventoryManager;