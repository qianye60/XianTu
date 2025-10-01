import type { InnateAttributes, Item, Equipment, SaveData } from '../types/game.d';
import type { Talent } from '../types/index';

/**
 * 中文键名到英文键名的映射（用于组件传参）
 */
const CHINESE_TO_ENGLISH_MAP: Record<string, string> = {
  '根骨': 'root_bone',
  '灵性': 'spirituality',
  '悟性': 'comprehension', 
  '气运': 'fortune',
  '魅力': 'charm',
  '心性': 'temperament'
};

/**
 * 计算装备提供的后天六司加成
 */
export function calculateEquipmentBonuses(equipment: Equipment, inventory: SaveData['背包']): InnateAttributes {
  const bonuses: InnateAttributes = {
    根骨: 0,
    灵性: 0,
    悟性: 0,
    气运: 0,
    魅力: 0,
    心性: 0
  };

  // 遍历装备栏中的每个装备槽位
  Object.values(equipment).forEach(itemId => {
    if (itemId && inventory.物品 && inventory.物品[itemId]) {
      const item: Item = inventory.物品[itemId];
      
      // 检查装备是否有后天六司加成
      if ('装备增幅' in item && item.装备增幅?.后天六司) {
        Object.entries(item.装备增幅.后天六司).forEach(([attr, value]) => {
          if (attr in bonuses && typeof value === 'number') {
            (bonuses as InnateAttributes)[attr as keyof InnateAttributes] += value;
          }
        });
      }
    }
  });

  return bonuses;
}

/**
 * 计算天赋提供的后天六司加成
 */
export function calculateTalentBonuses(talents: Talent[]): InnateAttributes {
  const bonuses: InnateAttributes = {
    根骨: 0,
    灵性: 0,
    悟性: 0,
    气运: 0,
    魅力: 0,
    心性: 0
  };

  talents.forEach(talent => {
    if (talent.effects && Array.isArray(talent.effects)) {
      talent.effects.forEach(effect => {
        // 支持中文格式："后天六司"和"属性加成"
        if (effect.类型 === '后天六司' || effect.类型 === '属性加成') {
          const target = effect.目标;
          const value = Number(effect.数值) || 0;
          
          // 将目标属性名转换为中文键名
          let chineseAttr = target;
          if (target === '神识') chineseAttr = '悟性'; // 神识映射到悟性
          if (target === '惟性') chineseAttr = '悟性'; // 惟性映射到悟性（修正拼写）
          if (target === '体质') chineseAttr = '根骨'; // 体质映射到根骨
          if (target === '敏捷') chineseAttr = '灵性'; // 敏捷映射到灵性
          
          if (chineseAttr in bonuses) {
            (bonuses as InnateAttributes)[chineseAttr as keyof InnateAttributes] += value;
          }
        }
        
        // 支持英文格式：后端API格式
        if (effect.type === 'ATTRIBUTE_MODIFIER') {
          const target = effect.target;
          const value = Number(effect.value) || 0;
          
          // 英文属性名到中文映射
          const englishToChinese: Record<string, string> = {
            'STR': '根骨',     // 力量 -> 根骨
            'CON': '根骨',     // 体质 -> 根骨  
            'DEX': '灵性',     // 敏捷 -> 灵性
            'INT': '悟性',     // 智力 -> 悟性
            'SPI': '悟性',     // 神魂 -> 悟性
            'LUK': '气运',     // 运气 -> 气运
          };
          
          const chineseAttr = englishToChinese[target] as keyof InnateAttributes;
          if (chineseAttr && chineseAttr in bonuses) {
            bonuses[chineseAttr] += value;
          }
        }
      });
    }
  });

  return bonuses;
}

/**
 * 计算最终的六司属性（先天+后天）
 */
export function calculateFinalAttributes(
  innateAttributes: InnateAttributes,
  saveData: SaveData
): {
  先天六司: InnateAttributes,
  后天六司: InnateAttributes,
  最终六司: InnateAttributes
} {
  // 装备加成
  const equipmentBonuses = saveData.装备栏 && saveData.背包 
    ? calculateEquipmentBonuses(saveData.装备栏, saveData.背包)
    : { 根骨: 0, 灵性: 0, 悟性: 0, 气运: 0, 魅力: 0, 心性: 0 };

  // 天赋加成
  const talentBonuses = saveData.角色基础信息?.天赋详情 
    ? calculateTalentBonuses(saveData.角色基础信息.天赋详情)
    : { 根骨: 0, 灵性: 0, 悟性: 0, 气运: 0, 魅力: 0, 心性: 0 };

  // 合并所有后天加成
  const totalAcquiredBonuses: InnateAttributes = {
    根骨: equipmentBonuses.根骨 + talentBonuses.根骨,
    灵性: equipmentBonuses.灵性 + talentBonuses.灵性,
    悟性: equipmentBonuses.悟性 + talentBonuses.悟性,
    气运: equipmentBonuses.气运 + talentBonuses.气运,
    魅力: equipmentBonuses.魅力 + talentBonuses.魅力,
    心性: equipmentBonuses.心性 + talentBonuses.心性,
  };

  // 计算最终属性
  const finalAttributes: InnateAttributes = {
    根骨: innateAttributes.根骨 + totalAcquiredBonuses.根骨,
    灵性: innateAttributes.灵性 + totalAcquiredBonuses.灵性,
    悟性: innateAttributes.悟性 + totalAcquiredBonuses.悟性,
    气运: innateAttributes.气运 + totalAcquiredBonuses.气运,
    魅力: innateAttributes.魅力 + totalAcquiredBonuses.魅力,
    心性: innateAttributes.心性 + totalAcquiredBonuses.心性,
  };

  return {
    先天六司: innateAttributes,
    后天六司: totalAcquiredBonuses,
    最终六司: finalAttributes
  };
}

/**
 * 转换中文属性键名为英文（用于组件传参）
 */
export function convertToEnglishAttributes(chineseAttrs: InnateAttributes): Record<string, number> {
  const englishAttrs: Record<string, number> = {};
  
  Object.entries(chineseAttrs).forEach(([chineseKey, value]) => {
    const englishKey = CHINESE_TO_ENGLISH_MAP[chineseKey];
    if (englishKey) {
      englishAttrs[englishKey] = value;
    }
  });

  return englishAttrs;
}

/**
 * 获取属性值的描述文字
 */
export function getAttributeDescription(attributeName: string, value: number): string {
  const descriptions: Record<string, Record<number, string>> = {
    根骨: {
      0: "羸弱不堪", 1: "体弱多病", 2: "身体孱弱", 3: "体质一般",
      4: "身体健康", 5: "体质不错", 6: "身强体壮", 7: "筋骨强健",
      8: "体魄过人", 9: "天生神力", 10: "金刚不坏"
    },
    灵性: {
      0: "灵气不显", 1: "灵性微弱", 2: "灵性较低", 3: "灵性一般",
      4: "灵性尚可", 5: "灵性不错", 6: "灵性敏锐", 7: "灵性超群",
      8: "灵性过人", 9: "灵性绝佳", 10: "天人感应"
    },
    悟性: {
      0: "愚钝如牛", 1: "悟性极差", 2: "悟性较差", 3: "悟性一般",
      4: "悟性尚可", 5: "悟性不错", 6: "悟性敏锐", 7: "悟性超群",
      8: "悟性过人", 9: "悟性绝佳", 10: "一点即通"
    },
    气运: {
      0: "厄运缠身", 1: "运气极差", 2: "运气较差", 3: "运气一般",
      4: "运气尚可", 5: "运气不错", 6: "运气颇佳", 7: "运气极好",
      8: "福星高照", 9: "洪福齐天", 10: "天命之子"
    },
    魅力: {
      0: "面目可憎", 1: "其貌不扬", 2: "容貌平平", 3: "容貌一般",
      4: "容貌尚可", 5: "容貌不错", 6: "容貌出众", 7: "美貌动人",
      8: "倾国倾城", 9: "绝世容颜", 10: "天人之姿"
    },
    心性: {
      0: "心性不稳", 1: "意志薄弱", 2: "心性较差", 3: "心性一般",
      4: "心性尚可", 5: "心性不错", 6: "道心稳固", 7: "道心坚韧",
      8: "道心如铁", 9: "道心不移", 10: "道心圆满"
    }
  };

  if (attributeName in descriptions) {
    const attrDescriptions = descriptions[attributeName];
    if (value in attrDescriptions) {
      return attrDescriptions[value];
    }
  }

  return `未知境界(${value})`;
}