/**
 * 物品系统测试工具
 * 生成测试物品，演示物品系统功能
 */

import { ItemSystem, ItemType, ItemQuality } from './ItemSystem';
import { InventoryManager } from './InventoryManager';
import { toast } from './toast';

class ItemTestUtilsClass {
  /**
   * 生成测试物品库
   */
  public generateTestItems(): void {
    const testItems = [
      // 武器类
      {
        type: ItemType.WEAPON,
        quality: ItemQuality.MORTAL,
        level: 0,
        count: 3
      },
      {
        type: ItemType.WEAPON,
        quality: ItemQuality.YELLOW,
        level: 2,
        count: 2
      },
      {
        type: ItemType.WEAPON,
        quality: ItemQuality.MYSTICAL,
        level: 5,
        count: 1
      },
      
      // 防具类
      {
        type: ItemType.ARMOR,
        quality: ItemQuality.YELLOW,
        level: 1,
        count: 3
      },
      {
        type: ItemType.ARMOR,
        quality: ItemQuality.MYSTICAL,
        level: 3,
        count: 2
      },
      
      // 配饰类
      {
        type: ItemType.ACCESSORY,
        quality: ItemQuality.EARTH,
        level: 4,
        count: 1
      },
      
      // 消耗品
      {
        type: ItemType.CONSUMABLE,
        quality: ItemQuality.MORTAL,
        level: 0,
        count: 10
      },
      {
        type: ItemType.PILL,
        quality: ItemQuality.YELLOW,
        level: 2,
        count: 5
      },
      
      // 材料
      {
        type: ItemType.MATERIAL,
        quality: ItemQuality.MYSTICAL,
        level: 0,
        count: 20
      },
      
      // 稀有物品
      {
        type: ItemType.TREASURE,
        quality: ItemQuality.HEAVEN,
        level: 7,
        count: 1
      },
    ];

    let addedCount = 0;
    
    testItems.forEach(({ type, quality, level, count }) => {
      for (let i = 0; i < count; i++) {
        const item = ItemSystem.generateRandomItem(type, quality, level);
        if (InventoryManager.addItem(item, 1)) {
          addedCount++;
        }
      }
    });

    toast.success(`生成了${addedCount}件测试物品`);
  }

  /**
   * 生成随机物品包
   */
  public generateRandomItemPack(packSize: number = 10): void {
    const itemTypes = Object.values(ItemType);
    const qualities = Object.values(ItemQuality);
    
    let addedCount = 0;
    
    for (let i = 0; i < packSize; i++) {
      const randomType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
      const randomQuality = qualities[Math.floor(Math.random() * qualities.length)];
      const randomLevel = Math.floor(Math.random() * 11); // 0-10级
      
      const item = ItemSystem.generateRandomItem(randomType, randomQuality, randomLevel);
      if (InventoryManager.addItem(item, 1)) {
        addedCount++;
      }
    }

    toast.success(`随机生成了${addedCount}件物品`);
  }

  /**
   * 生成高品质物品
   */
  public generateRareItems(): void {
    const rareQualities = [ItemQuality.EARTH, ItemQuality.HEAVEN, ItemQuality.IMMORTAL, ItemQuality.DIVINE];
    const itemTypes = [ItemType.WEAPON, ItemType.ARMOR, ItemType.TREASURE, ItemType.ACCESSORY];
    
    let addedCount = 0;
    
    rareQualities.forEach(quality => {
      itemTypes.forEach(type => {
        const level = Math.floor(Math.random() * 6) + 5; // 5-10级
        const item = ItemSystem.generateRandomItem(type, quality, level);
        if (InventoryManager.addItem(item, 1)) {
          addedCount++;
        }
      });
    });

    toast.success(`生成了${addedCount}件高品质物品`);
  }

  /**
   * 添加测试货币
   */
  public addTestCurrency(): void {
    // 这需要在InventoryManager中添加货币管理功能
    toast.info('测试货币功能待实现');
  }

  /**
   * 清空背包
   */
  public clearInventory(): void {
    // 这需要在InventoryManager中添加清空功能
    localStorage.removeItem('game-inventory');
    toast.success('背包已清空，请刷新页面');
  }

  /**
   * 打印物品系统状态
   */
  public printSystemStats(): void {
    const stats = InventoryManager.getInventoryStats();
    console.group('=== 物品系统统计 ===');
    console.log('使用槽位:', `${stats.usedSlots}/${stats.totalSlots}`);
    console.log('物品价值:', stats.totalValue, '下品灵石');
    console.log('按类型分布:', stats.itemsByType);
    console.log('按品质分布:', stats.itemsByQuality);
    console.log('货币情况:', stats.currency);
    console.groupEnd();
    
    toast.info('统计信息已输出到控制台');
  }

  /**
   * 测试物品比较功能
   */
  public testItemComparison(): void {
    const weapon1 = ItemSystem.generateRandomItem(ItemType.WEAPON, ItemQuality.YELLOW, 3);
    const weapon2 = ItemSystem.generateRandomItem(ItemType.WEAPON, ItemQuality.MYSTICAL, 2);
    
    const score1 = ItemSystem.getItemScore(weapon1);
    const score2 = ItemSystem.getItemScore(weapon2);
    const comparison = ItemSystem.compareItems(weapon1, weapon2);
    
    console.group('=== 物品比较测试 ===');
    console.log('物品1:', weapon1.name, '评分:', score1);
    console.log('物品2:', weapon2.name, '评分:', score2);
    console.log('比较结果:', comparison > 0 ? '物品1更好' : comparison < 0 ? '物品2更好' : '相等');
    console.groupEnd();
    
    toast.info('物品比较结果已输出到控制台');
  }

  /**
   * 测试品质系统
   */
  public testQualitySystem(): void {
    const qualities = ItemSystem.getAllQualities();
    
    console.group('=== 品质系统信息 ===');
    qualities.forEach(({ quality, config }) => {
      console.log(`${config.name}:`, {
        等级: config.level,
        稀有度: config.rarity,
        颜色: config.colorHex,
        掉落权重: config.dropRate,
        属性数量: `${config.minAttributes}-${config.maxAttributes}`,
        等级加成: `${config.levelMultiplier}x`
      });
    });
    console.groupEnd();
    
    toast.info('品质系统信息已输出到控制台');
  }

  /**
   * 生成完整测试环境
   */
  public setupTestEnvironment(): void {
    console.log('正在设置物品系统测试环境...');
    
    // 清空现有背包
    this.clearInventory();
    
    // 等待一下让清空操作完成
    setTimeout(() => {
      // 生成基础测试物品
      this.generateTestItems();
      
      // 生成一些随机物品
      this.generateRandomItemPack(5);
      
      // 生成少量稀有物品
      setTimeout(() => {
        this.generateRareItems();
        
        // 打印统计信息
        setTimeout(() => {
          this.printSystemStats();
          this.testQualitySystem();
          toast.success('测试环境设置完成！');
        }, 500);
      }, 300);
    }, 100);
  }

  /**
   * 获取物品展示信息
   */
  public getItemDisplayInfo(itemId: string): any {
    const slots = InventoryManager.getFilteredItems();
    const slot = slots.find(s => s.item?.id === itemId);
    
    if (!slot || !slot.item) {
      return null;
    }

    const item = slot.item;
    const displayInfo = ItemSystem.getItemInfo(item);
    
    return {
      ...item,
      displayInfo,
      quantity: slot.quantity
    };
  }
}

// 导出单例实例
export const ItemTestUtils = new ItemTestUtilsClass();

// 添加到全局对象，便于调试
if (typeof window !== 'undefined') {
  (window as any).ItemTestUtils = ItemTestUtils;
  (window as any).ItemSystem = ItemSystem;
  (window as any).InventoryManager = InventoryManager;
}

export default ItemTestUtils;