/**
 * 物品等级系统
 * 实现"神仙天地玄黄凡"品质分级，每个品级0-10级细分
 * 
 * 品质等级（由低到高）：
 * - 凡品: 凡人世界常见物品
 * - 黄品: 低阶修士用品  
 * - 玄品: 中阶修士珍品
 * - 地品: 高阶修士至宝
 * - 天品: 顶级势力收藏
 * - 仙品: 隐世宗门至宝
 * - 神品: 举世无双传说
 */

import { toast } from './toast';

// 物品品质枚举
export enum ItemQuality {
  MORTAL = '凡', // 凡品
  YELLOW = '黄', // 黄品
  MYSTICAL = '玄', // 玄品
  EARTH = '地', // 地品
  HEAVEN = '天', // 天品
  IMMORTAL = '仙', // 仙品
  DIVINE = '神' // 神品
}

// 物品类型枚举
export enum ItemType {
  WEAPON = '武器',
  ARMOR = '防具',
  ACCESSORY = '配饰',
  CONSUMABLE = '消耗品',
  MATERIAL = '材料',
  TECHNIQUE = '功法',
  PILL = '丹药',
  TREASURE = '法宝',
  BOOK = '书籍',
  MISC = '其他'
}

// 品质配置接口
export interface QualityConfig {
  name: string;
  level: number; // 品质等级 0-6
  rarity: string; // 稀有度描述
  colorHex: string; // 显示颜色
  dropRate: number; // 掉落概率权重
  minAttributes: number; // 最小属性数量
  maxAttributes: number; // 最大属性数量
  levelMultiplier: number; // 等级加成倍数
}

// 物品属性接口
export interface ItemAttribute {
  type: '攻击力' | '防御力' | '气血' | '灵气' | '神识' | '速度' | '暴击' | '命中' | '闪避' | '特殊';
  value: number;
  percentage?: boolean; // 是否为百分比加成
  description?: string;
}

// 物品接口
export interface GameItem {
  id: string;
  name: string;
  type: ItemType;
  quality: ItemQuality;
  level: number; // 0-10级
  description: string;
  attributes: ItemAttribute[];
  requirements?: {
    realm?: string; // 需要境界
    level?: number; // 需要等级
    attributes?: Record<string, number>; // 需要属性
  };
  effects?: {
    type: 'active' | 'passive' | 'triggered';
    description: string;
    cooldown?: number;
    duration?: number;
  }[];
  stackSize: number; // 堆叠上限
  sellValue: number; // 出售价值（下品灵石）
  origin?: string; // 来源描述
  bindType?: '绑定' | '装备绑定' | '不绑定';
  durability?: {
    current: number;
    max: number;
  };
  enchantments?: string[]; // 附魔效果
  setBonus?: {
    setName: string;
    pieces: number;
    totalPieces: number;
    bonus: ItemAttribute[];
  };
  createdAt: string;
  updatedAt: string;
}

// 背包槽位接口
export interface InventorySlot {
  item: GameItem | null;
  quantity: number;
  locked?: boolean;
}

class ItemSystemClass {
  // 品质配置表
  private qualityConfigs: Map<ItemQuality, QualityConfig> = new Map([
    [ItemQuality.MORTAL, {
      name: '凡品',
      level: 0,
      rarity: '随处可见',
      colorHex: '#9CA3AF', // 灰色
      dropRate: 100,
      minAttributes: 0,
      maxAttributes: 2,
      levelMultiplier: 1.0,
    }],
    [ItemQuality.YELLOW, {
      name: '黄品',
      level: 1,
      rarity: '较为常见',
      colorHex: '#FBBF24', // 黄色
      dropRate: 60,
      minAttributes: 1,
      maxAttributes: 3,
      levelMultiplier: 1.2,
    }],
    [ItemQuality.MYSTICAL, {
      name: '玄品',
      level: 2,
      rarity: '颇为珍贵',
      colorHex: '#8B5CF6', // 紫色
      dropRate: 30,
      minAttributes: 2,
      maxAttributes: 4,
      levelMultiplier: 1.5,
    }],
    [ItemQuality.EARTH, {
      name: '地品',
      level: 3,
      rarity: '极为稀有',
      colorHex: '#F59E0B', // 橙色
      dropRate: 12,
      minAttributes: 3,
      maxAttributes: 5,
      levelMultiplier: 2.0,
    }],
    [ItemQuality.HEAVEN, {
      name: '天品',
      level: 4,
      rarity: '顶级势力收藏',
      colorHex: '#3B82F6', // 蓝色
      dropRate: 4,
      minAttributes: 4,
      maxAttributes: 6,
      levelMultiplier: 3.0,
    }],
    [ItemQuality.IMMORTAL, {
      name: '仙品',
      level: 5,
      rarity: '隐世宗门至宝',
      colorHex: '#10B981', // 绿色
      dropRate: 1,
      minAttributes: 5,
      maxAttributes: 7,
      levelMultiplier: 5.0,
    }],
    [ItemQuality.DIVINE, {
      name: '神品',
      level: 6,
      rarity: '举世无双',
      colorHex: '#EF4444', // 红色
      dropRate: 0.1,
      minAttributes: 6,
      maxAttributes: 8,
      levelMultiplier: 10.0,
    }],
  ]);

  /**
   * 获取品质配置
   */
  public getQualityConfig(quality: ItemQuality): QualityConfig {
    const config = this.qualityConfigs.get(quality);
    if (!config) {
      throw new Error(`未知的物品品质: ${quality}`);
    }
    return config;
  }

  /**
   * 获取品质显示名称
   */
  public getQualityDisplayName(quality: ItemQuality, level: number = 0): string {
    const config = this.getQualityConfig(quality);
    if (level === 0) {
      return config.name;
    }
    return `${config.name}·${level}级`;
  }

  /**
   * 获取物品显示颜色
   */
  public getItemColor(quality: ItemQuality): string {
    const config = this.getQualityConfig(quality);
    return config.colorHex;
  }

  /**
   * 计算物品属性值
   */
  public calculateAttributeValue(
    baseValue: number, 
    quality: ItemQuality, 
    level: number
  ): number {
    const config = this.getQualityConfig(quality);
    const qualityMultiplier = config.levelMultiplier;
    const levelBonus = 1 + (level * 0.1); // 每级+10%
    
    return Math.floor(baseValue * qualityMultiplier * levelBonus);
  }

  /**
   * 获取物品评分
   */
  public getItemScore(item: GameItem): number {
    const config = this.getQualityConfig(item.quality);
    let score = config.level * 1000; // 品质基础分
    
    // 等级加成
    score += item.level * 100;
    
    // 属性加成
    item.attributes.forEach(attr => {
      score += attr.value * (attr.percentage ? 0.5 : 1);
    });
    
    // 特效加成
    score += (item.effects?.length || 0) * 200;
    
    return score;
  }

  /**
   * 比较物品优劣
   */
  public compareItems(item1: GameItem, item2: GameItem): number {
    const score1 = this.getItemScore(item1);
    const score2 = this.getItemScore(item2);
    return score1 - score2;
  }

  /**
   * 生成随机物品
   */
  public generateRandomItem(
    type: ItemType,
    targetQuality?: ItemQuality,
    targetLevel?: number
  ): GameItem {
    // 确定品质
    const quality = targetQuality || this.rollRandomQuality();
    
    // 确定等级
    const level = targetLevel !== undefined 
      ? Math.max(0, Math.min(10, targetLevel))
      : Math.floor(Math.random() * 11);
    
    const config = this.getQualityConfig(quality);
    
    // 生成基础属性
    const attributeCount = Math.floor(
      Math.random() * (config.maxAttributes - config.minAttributes + 1)
    ) + config.minAttributes;
    
    const attributes = this.generateRandomAttributes(type, attributeCount, quality, level);
    
    // 生成物品
    const item: GameItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: this.generateItemName(type, quality, level),
      type,
      quality,
      level,
      description: this.generateItemDescription(type, quality, level),
      attributes,
      stackSize: this.getStackSize(type),
      sellValue: this.calculateSellValue(quality, level, attributes),
      bindType: this.determineBindType(quality),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 添加特殊效果
    if (quality !== ItemQuality.MORTAL && Math.random() < 0.3 + (config.level * 0.1)) {
      item.effects = this.generateItemEffects(type, quality);
    }

    // 添加耐久度
    if (type === ItemType.WEAPON || type === ItemType.ARMOR) {
      const maxDurability = 100 + (config.level * 100) + (level * 20);
      item.durability = {
        current: maxDurability,
        max: maxDurability,
      };
    }

    return item;
  }

  /**
   * 随机品质掉落
   */
  private rollRandomQuality(): ItemQuality {
    const totalWeight = Array.from(this.qualityConfigs.values())
      .reduce((sum, config) => sum + config.dropRate, 0);
    
    let roll = Math.random() * totalWeight;
    
    for (const [quality, config] of this.qualityConfigs.entries()) {
      roll -= config.dropRate;
      if (roll <= 0) {
        return quality;
      }
    }
    
    return ItemQuality.MORTAL; // 默认返回凡品
  }

  /**
   * 生成随机属性
   */
  private generateRandomAttributes(
    type: ItemType,
    count: number,
    quality: ItemQuality,
    level: number
  ): ItemAttribute[] {
    const possibleAttributes = this.getPossibleAttributes(type);
    const selectedAttributes = new Set<string>();
    const attributes: ItemAttribute[] = [];

    while (attributes.length < count && selectedAttributes.size < possibleAttributes.length) {
      const attrType = possibleAttributes[Math.floor(Math.random() * possibleAttributes.length)];
      
      if (!selectedAttributes.has(attrType)) {
        selectedAttributes.add(attrType);
        
        const baseValue = this.getBaseAttributeValue(type, attrType);
        const finalValue = this.calculateAttributeValue(baseValue, quality, level);
        
        attributes.push({
          type: attrType as any,
          value: finalValue,
          percentage: this.isPercentageAttribute(attrType),
        });
      }
    }

    return attributes;
  }

  /**
   * 获取物品类型可能的属性
   */
  private getPossibleAttributes(type: ItemType): string[] {
    const attributeMap: Record<ItemType, string[]> = {
      [ItemType.WEAPON]: ['攻击力', '暴击', '命中', '速度'],
      [ItemType.ARMOR]: ['防御力', '气血', '闪避'],
      [ItemType.ACCESSORY]: ['气血', '灵气', '神识', '暴击', '命中', '闪避'],
      [ItemType.CONSUMABLE]: ['特殊'],
      [ItemType.MATERIAL]: ['特殊'],
      [ItemType.TECHNIQUE]: ['特殊'],
      [ItemType.PILL]: ['气血', '灵气', '神识'],
      [ItemType.TREASURE]: ['气血', '灵气', '神识', '攻击力', '防御力'],
      [ItemType.BOOK]: ['特殊'],
      [ItemType.MISC]: ['特殊'],
    };

    return attributeMap[type] || ['特殊'];
  }

  /**
   * 获取基础属性值
   */
  private getBaseAttributeValue(type: ItemType, attrType: string): number {
    const baseValues: Record<string, number> = {
      '攻击力': 10,
      '防御力': 8,
      '气血': 50,
      '灵气': 30,
      '神识': 20,
      '速度': 5,
      '暴击': 3,
      '命中': 5,
      '闪避': 5,
      '特殊': 1,
    };

    return baseValues[attrType] || 1;
  }

  /**
   * 判断是否为百分比属性
   */
  private isPercentageAttribute(attrType: string): boolean {
    const percentageAttrs = ['暴击', '命中', '闪避', '速度'];
    return percentageAttrs.includes(attrType);
  }

  /**
   * 生成物品名称
   */
  private generateItemName(type: ItemType, quality: ItemQuality, level: number): string {
    const prefixes = {
      [ItemQuality.MORTAL]: ['普通的', '破旧的', '生锈的'],
      [ItemQuality.YELLOW]: ['精良的', '锋利的', '坚固的'],
      [ItemQuality.MYSTICAL]: ['神秘的', '古老的', '魔法的'],
      [ItemQuality.EARTH]: ['地级的', '稀有的', '强大的'],
      [ItemQuality.HEAVEN]: ['天级的', '传奇的', '神圣的'],
      [ItemQuality.IMMORTAL]: ['仙级的', '不朽的', '超凡的'],
      [ItemQuality.DIVINE]: ['神级的', '至尊的', '无上的'],
    };

    const typeNames = {
      [ItemType.WEAPON]: ['剑', '刀', '枪', '斧', '锤'],
      [ItemType.ARMOR]: ['甲', '袍', '靴', '盔'],
      [ItemType.ACCESSORY]: ['戒指', '项链', '手镯', '护符'],
      [ItemType.CONSUMABLE]: ['药水', '卷轴', '符咒'],
      [ItemType.MATERIAL]: ['矿石', '草药', '兽骨'],
      [ItemType.TECHNIQUE]: ['功法', '心诀', '秘籍'],
      [ItemType.PILL]: ['丹药', '灵丹', '仙丹'],
      [ItemType.TREASURE]: ['法宝', '灵器', '仙器'],
      [ItemType.BOOK]: ['古书', '典籍', '经文'],
      [ItemType.MISC]: ['奇物', '珍品', '宝物'],
    };

    const prefix = prefixes[quality][Math.floor(Math.random() * prefixes[quality].length)];
    const baseName = typeNames[type][Math.floor(Math.random() * typeNames[type].length)];
    
    if (level > 0) {
      return `${prefix}${baseName}·${level}级`;
    }
    
    return `${prefix}${baseName}`;
  }

  /**
   * 生成物品描述
   */
  private generateItemDescription(type: ItemType, quality: ItemQuality, level: number): string {
    const config = this.getQualityConfig(quality);
    
    let description = `${config.name}品质的${type}，${config.rarity}。`;
    
    if (level > 0) {
      description += `经过${level}次淬炼，威力大增。`;
    }
    
    return description;
  }

  /**
   * 获取堆叠上限
   */
  private getStackSize(type: ItemType): number {
    const stackSizes: Record<ItemType, number> = {
      [ItemType.WEAPON]: 1,
      [ItemType.ARMOR]: 1,
      [ItemType.ACCESSORY]: 1,
      [ItemType.CONSUMABLE]: 99,
      [ItemType.MATERIAL]: 999,
      [ItemType.TECHNIQUE]: 1,
      [ItemType.PILL]: 99,
      [ItemType.TREASURE]: 1,
      [ItemType.BOOK]: 1,
      [ItemType.MISC]: 99,
    };

    return stackSizes[type] || 1;
  }

  /**
   * 计算出售价值
   */
  private calculateSellValue(
    quality: ItemQuality, 
    level: number, 
    attributes: ItemAttribute[]
  ): number {
    const config = this.getQualityConfig(quality);
    let baseValue = Math.pow(10, config.level); // 10^品质等级
    
    // 等级加成
    baseValue *= (1 + level * 0.5);
    
    // 属性加成
    const attributeBonus = attributes.reduce((sum, attr) => sum + attr.value * 0.1, 0);
    baseValue += attributeBonus;
    
    return Math.floor(baseValue);
  }

  /**
   * 确定绑定类型
   */
  private determineBindType(quality: ItemQuality): GameItem['bindType'] {
    const config = this.getQualityConfig(quality);
    
    if (config.level >= 4) { // 天品及以上
      return '绑定';
    } else if (config.level >= 2) { // 玄品及以上
      return '装备绑定';
    }
    
    return '不绑定';
  }

  /**
   * 生成物品特效
   */
  private generateItemEffects(type: ItemType, quality: ItemQuality): GameItem['effects'] {
    const config = this.getQualityConfig(quality);
    const effects: GameItem['effects'] = [];
    
    // 根据品质和类型生成不同特效
    if (config.level >= 3 && Math.random() < 0.5) {
      effects.push({
        type: 'passive',
        description: this.generatePassiveEffect(type, quality),
      });
    }
    
    if (config.level >= 5 && Math.random() < 0.3) {
      effects.push({
        type: 'active',
        description: this.generateActiveEffect(type, quality),
        cooldown: 30,
        duration: 10,
      });
    }
    
    return effects.length > 0 ? effects : undefined;
  }

  /**
   * 生成被动特效
   */
  private generatePassiveEffect(type: ItemType, quality: ItemQuality): string {
    const passiveEffects = [
      '攻击时有概率触发灵气爆发',
      '受到攻击时减少伤害',
      '持续恢复气血',
      '增加修炼速度',
      '提升暴击伤害',
    ];

    return passiveEffects[Math.floor(Math.random() * passiveEffects.length)];
  }

  /**
   * 生成主动特效
   */
  private generateActiveEffect(type: ItemType, quality: ItemQuality): string {
    const activeEffects = [
      '释放强力攻击技能',
      '瞬间恢复大量气血',
      '提升全属性',
      '召唤护盾',
      '进入无敌状态',
    ];

    return activeEffects[Math.floor(Math.random() * activeEffects.length)];
  }

  /**
   * 获取所有品质列表
   */
  public getAllQualities(): Array<{ quality: ItemQuality; config: QualityConfig }> {
    return Array.from(this.qualityConfigs.entries()).map(([quality, config]) => ({
      quality,
      config,
    }));
  }

  /**
   * 获取物品完整信息
   */
  public getItemInfo(item: GameItem): {
    displayName: string;
    color: string;
    score: number;
    rarity: string;
    sellValueFormatted: string;
  } {
    const config = this.getQualityConfig(item.quality);
    
    return {
      displayName: this.getQualityDisplayName(item.quality, item.level),
      color: config.colorHex,
      score: this.getItemScore(item),
      rarity: config.rarity,
      sellValueFormatted: this.formatCurrency(item.sellValue),
    };
  }

  /**
   * 格式化货币显示
   */
  private formatCurrency(value: number): string {
    if (value >= 10000) {
      const wan = Math.floor(value / 10000);
      const remainder = value % 10000;
      if (remainder > 0) {
        return `${wan}万${remainder}下品灵石`;
      } else {
        return `${wan}万下品灵石`;
      }
    }
    
    return `${value}下品灵石`;
  }
}

// 导出单例实例
export const ItemSystem = new ItemSystemClass();

export default ItemSystem;