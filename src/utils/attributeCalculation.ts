import type { InnateAttributes, Item, Equipment, SaveData } from '@/types/game';
import type { Talent } from '../types/index';
import { LOCAL_TALENTS } from '../data/creationData';

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

  console.log('[装备加成计算] 开始计算装备加成');
  console.log('[装备加成计算] 装备栏数据:', equipment);
  console.log('[装备加成计算] 背包物品数据:', inventory?.物品);

  // 遍历装备栏中的每个装备槽位
  Object.entries(equipment).forEach(([slot, itemId]) => {
    console.log(`[装备加成计算] 检查槽位 ${slot}, itemId: ${itemId}`);

    if (itemId && inventory.物品 && inventory.物品[itemId]) {
      const item: Item = inventory.物品[itemId];
      console.log(`[装备加成计算] 找到物品:`, item);

      // 检查装备是否有后天六司加成
      if (item.类型 === '装备' && item.装备增幅?.后天六司) {
        console.log(`[装备加成计算] 物品 ${item.名称} 有装备增幅:`, item.装备增幅);
        const sixSiBonuses = item.装备增幅.后天六司;
        
        Object.entries(sixSiBonuses).forEach(([attr, value]) => {
          if (attr in bonuses) {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
              console.log(`[装备加成计算] 添加属性加成: ${attr} +${numericValue} (原始值: ${value})`);
              (bonuses as InnateAttributes)[attr as keyof InnateAttributes] += numericValue;
            } else {
              console.warn(`[装备加成计算] 属性 ${attr} 的值 "${value}" 不是一个有效的数字，已忽略。物品: ${item.名称}`);
            }
          } else {
            console.warn(`[装备加成计算] 发现未知的后天六司属性 "${attr}"，已忽略。物品: ${item.名称}`);
          }
        });
      } else {
        console.log(`[装备加成计算] 物品 ${item.名称} 没有装备增幅或后天六司属性`);
      }
    } else {
      console.log(`[装备加成计算] 槽位 ${slot} 为空或物品不存在`);
    }
  });

  console.log('[装备加成计算] 最终装备加成:', bonuses);
  return bonuses;
}

/**
 * 从角色存档数据中计算天赋提供的后天六司加成
 */
export function calculateTalentBonusesFromCharacter(saveData: SaveData): InnateAttributes {
  const bonuses: InnateAttributes = {
    根骨: 0,
    灵性: 0,
    悟性: 0,
    气运: 0,
    魅力: 0,
    心性: 0
  };

  // 获取角色的天赋名称列表（V3：角色.身份）
  const character = (saveData as any).角色?.身份 ?? null;
  const characterTalents = character?.天赋 || [];

  // 提取天赋名称，兼容字符串数组和对象数组两种格式
  const characterTalentNames: string[] = characterTalents.map((talent: any) => {
    if (typeof talent === 'string') {
      return talent; // 简单字符串格式
    } else if (talent && typeof talent === 'object' && talent.名称) {
      return talent.名称; // 对象格式，提取名称字段
    }
    return null;
  }).filter(Boolean);

  // 遍历角色的每个天赋
  characterTalents.forEach((talent: any) => {
    let talentData: Talent | undefined;
    let talentName: string;

    if (typeof talent === 'string') {
      talentName = talent;
      // 在LOCAL_TALENTS中查找对应的天赋数据
      talentData = LOCAL_TALENTS.find(t => t.name === talentName);
    } else if (talent && typeof talent === 'object') {
      talentName = talent.名称 || '';
      // 先尝试在LOCAL_TALENTS中查找
      talentData = LOCAL_TALENTS.find(t => t.name === talentName);

      // 如果找不到预定义天赋，但天赋对象本身有effects，直接使用
      if (!talentData && talent.effects) {
        talentData = {
          id: 0,
          name: talentName,
          description: talent.描述 || '',
          talent_cost: 0,
          rarity: 1,
          effects: talent.effects
        };
      }
    }

    if (talentData && talentData.effects) {
      // 使用现有的calculateTalentBonuses函数处理单个天赋
      const singleTalentBonuses = calculateTalentBonuses([talentData]);

      // 累加到总bonuses中
      Object.keys(bonuses).forEach(attr => {
        bonuses[attr as keyof InnateAttributes] += singleTalentBonuses[attr as keyof InnateAttributes];
      });
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
        // 如果是字符串，跳过（字符串描述格式不参与属性计算）
        if (typeof effect === 'string') return;

        // 支持中文格式："后天六司"
        if (effect.类型 === '后天六司') {
          const target = effect.目标;
          const value = Number(effect.数值) || 0;

          // 将目标属性名转换为中文键名
          let chineseAttr: string | undefined = target;
          if (target === '神识') chineseAttr = '悟性'; // 神识映射到悟性
          if (target === '惟性') chineseAttr = '悟性'; // 惟性映射到悟性（修正拼写）
          if (target === '体质') chineseAttr = '根骨'; // 体质映射到根骨
          if (target === '敏捷') chineseAttr = '灵性'; // 敏捷映射到灵性

          if (chineseAttr && chineseAttr in bonuses) {
            (bonuses as InnateAttributes)[chineseAttr as keyof InnateAttributes] += value;
          }
        }

        // 支持英文格式：后端API格式（如果effect有这些属性）
        if ('type' in effect && effect.type === 'ATTRIBUTE_MODIFIER') {
          const target = 'target' in effect ? effect.target : undefined;
          const value = 'value' in effect ? Number(effect.value) || 0 : 0;

          if (!target) return;

          // 英文属性名到中文映射
          const englishToChinese: Record<string, string> = {
            'STR': '根骨',     // 力量 -> 根骨
            'CON': '根骨',     // 体质 -> 根骨
            'DEX': '灵性',     // 敏捷 -> 灵性
            'INT': '悟性',     // 智力 -> 悟性
            'SPI': '悟性',     // 神魂 -> 悟性
            'LUK': '气运',     // 运气 -> 气运
          };

          const chineseAttr = englishToChinese[target as string] as keyof InnateAttributes;
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
 * 计算已装备功法提供的属性加成
 */
export function calculateTechniqueBonuses(saveData: SaveData): InnateAttributes {
  const bonuses: InnateAttributes = { 根骨: 0, 灵性: 0, 悟性: 0, 气运: 0, 魅力: 0, 心性: 0 };

  const itemsMap = (saveData as any)?.角色?.背包?.物品 ?? (saveData as any)?.背包?.物品;
  if (!itemsMap) {
    return bonuses;
  }

  // 查找已装备的功法
  const items = (itemsMap ?? {}) as Record<string, Item>;
  const equippedTechnique = Object.values(items).find((item) => item.类型 === '功法' && item.已装备 === true);

  if (equippedTechnique && equippedTechnique.类型 === '功法' && equippedTechnique.功法效果?.属性加成) {
    const attributeBonuses = equippedTechnique.功法效果.属性加成;
    for (const key in attributeBonuses) {
      if (key in bonuses) {
        bonuses[key as keyof InnateAttributes] += attributeBonuses[key as keyof InnateAttributes] || 0;
      }
    }
  }

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
  // 🔥 [BUG修复] 动态计算后天六司，确保装备和天赋加成正确显示
  // 1. 从存档读取基础后天六司（可能包含永久加成）
  const character = (saveData as any).角色?.身份 ?? null;
  const storedAcquiredAttributes = character?.后天六司 || {
    根骨: 0, 灵性: 0, 悟性: 0, 气运: 0, 魅力: 0, 心性: 0
  };

  // 2. 计算装备加成（实时计算，确保准确）
  const equipmentState = (saveData as any).角色?.装备 ?? null;
  const inventoryState = (saveData as any).角色?.背包 ?? null;
  const equipmentBonuses = calculateEquipmentBonuses(equipmentState, inventoryState);

  // 3. 计算天赋加成
  const talentBonuses = calculateTalentBonusesFromCharacter(saveData);

  // 4. 合并所有后天加成
  const totalAcquiredAttributes: InnateAttributes = {
    根骨: storedAcquiredAttributes.根骨 + equipmentBonuses.根骨 + talentBonuses.根骨,
    灵性: storedAcquiredAttributes.灵性 + equipmentBonuses.灵性 + talentBonuses.灵性,
    悟性: storedAcquiredAttributes.悟性 + equipmentBonuses.悟性 + talentBonuses.悟性,
    气运: storedAcquiredAttributes.气运 + equipmentBonuses.气运 + talentBonuses.气运,
    魅力: storedAcquiredAttributes.魅力 + equipmentBonuses.魅力 + talentBonuses.魅力,
    心性: storedAcquiredAttributes.心性 + equipmentBonuses.心性 + talentBonuses.心性,
  };

  // 5. 计算最终属性（先天 + 后天）
  const finalAttributes: InnateAttributes = {
    根骨: innateAttributes.根骨 + totalAcquiredAttributes.根骨,
    灵性: innateAttributes.灵性 + totalAcquiredAttributes.灵性,
    悟性: innateAttributes.悟性 + totalAcquiredAttributes.悟性,
    气运: innateAttributes.气运 + totalAcquiredAttributes.气运,
    魅力: innateAttributes.魅力 + totalAcquiredAttributes.魅力,
    心性: innateAttributes.心性 + totalAcquiredAttributes.心性,
  };

  return {
    先天六司: innateAttributes,
    后天六司: totalAcquiredAttributes,
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
