/**
 * 前端角色属性计算模块
 * 单机模式下用于计算基础六命对应的核心属性
 */

export interface CoreAttributes {
  // 核心属性上限
  maxHealthPoints: number;
  maxSpiritualPower: number;
  maxSpiritSense: number;
  maxLifespan: number;
  
  // 当前属性值（初始化时等于上限）
  healthPoints: number;
  spiritualPower: number;
  spiritSense: number;
  currentAge: number;
  
  // 恢复速度
  healthRecoveryRate: number;
  spiritualRecoveryRate: number;
  spiritRecoveryRate: number;
  
  // 其他衍生属性
  luckFactor: number;
  socialBonus: number;
  mentalResistance: number;
  
  // 初始境界
  currentRealm: string;
  cultivationProgress: number;
  cultivationExperience: number;
  
  // 初始位置和场景
  currentLocation: string;
  currentScene: string;
  
  // 初始资源
  spiritualStones: number;
  
  // 背包物品栏系统
  inventory: Record<string, any>;
  equippedItems: Record<string, any>;
}

export function calculateCoreAttributes(
  rootBone: number,
  spirituality: number,
  comprehension: number,
  fortune: number,
  charm: number,
  temperament: number
): CoreAttributes {
  // 基础计算公式
  // 每点先天六司提供不同的属性加成
  
  // 气血系统（基于根骨）
  const baseHealth = 80; // 基础气血
  const healthPerBone = 15; // 每点根骨增加的气血
  const maxHealth = baseHealth + (rootBone * healthPerBone);
  const healthRecoveryRate = 1.0 + (rootBone * 0.1); // 每点根骨增加10%恢复速度
  
  // 灵气系统（基于灵性）
  const baseSpiritual = 60; // 基础灵气
  const spiritualPerPoint = 12; // 每点灵性增加的灵气
  const maxSpiritual = baseSpiritual + (spirituality * spiritualPerPoint);
  const spiritualRecoveryRate = 1.0 + (spirituality * 0.12); // 每点灵性增加12%恢复速度
  
  // 神识系统（基于悟性）
  const baseSpirit = 50; // 基础神识
  const spiritPerPoint = 10; // 每点悟性增加的神识
  const maxSpirit = baseSpirit + (comprehension * spiritPerPoint);
  const spiritRecoveryRate = 1.0 + (comprehension * 0.08); // 每点悟性增加8%恢复速度
  
  // 寿元系统（基于根骨）
  const baseLifespan = 80; // 基础寿命（凡人）
  const lifespanPerBone = 8; // 每点根骨增加的寿命
  const maxLifespan = baseLifespan + (rootBone * lifespanPerBone);
  
  // 初始年龄基于福缘决定（福缘高的人往往出生更好）
  const baseAge = 16;
  const ageVariation = Math.max(0, 3 - Math.floor(fortune / 2)); // 福缘高的人可能年龄稍小
  const currentAge = baseAge + ageVariation;
  
  // 初始化空的背包物品栏系统
  const initialInventory = {};  // 空背包
  const initialEquipment = getInitialEquipment();  // 空装备栏
  
  return {
    // 核心属性上限
    maxHealthPoints: maxHealth,
    maxSpiritualPower: maxSpiritual,
    maxSpiritSense: maxSpirit,
    maxLifespan: maxLifespan,
    
    // 当前属性值（初始化时等于上限）
    healthPoints: maxHealth,
    spiritualPower: maxSpiritual,
    spiritSense: maxSpirit,
    currentAge: currentAge,
    
    // 恢复速度
    healthRecoveryRate: Math.round(healthRecoveryRate * 100) / 100,
    spiritualRecoveryRate: Math.round(spiritualRecoveryRate * 100) / 100,
    spiritRecoveryRate: Math.round(spiritRecoveryRate * 100) / 100,
    
    // 其他衍生属性（用于后续系统）
    luckFactor: fortune, // 福缘影响奇遇概率
    socialBonus: charm, // 魅力影响社交
    mentalResistance: temperament, // 心性影响心魔抗性
    
    // 初始境界
    currentRealm: "凡人",
    cultivationProgress: 0.0,
    cultivationExperience: 0,
    
    // 初始位置和场景
    currentLocation: "未知之地",
    currentScene: "初入修仙界",
    
    // 初始资源
    spiritualStones: 100 + (fortune * 20), // 福缘影响初始灵石
    
    // 背包物品栏系统
    inventory: initialInventory,
    equippedItems: initialEquipment,
  };
}

// 初始化空装备栏位
function getInitialEquipment(): Record<string, any> {
  return {
    "weapon": null,      // 武器栏位
    "head": null,        // 头部栏位
    "chest": null,       // 胸甲栏位
    "legs": null,        // 腿甲栏位
    "feet": null,        // 鞋子栏位
    "gloves": null,      // 手套栏位
    "ring": null,        // 戒指栏位
    "necklace": null,    // 项链栏位
    "talisman": null,    // 护身符栏位
  };
}

export function getAttributeDescription(attributeName: string, value: number): string {
  const descriptions: Record<string, Record<number, string>> = {
    root_bone: {
      0: "羸弱不堪", 1: "体弱多病", 2: "身体孱弱", 3: "体质一般",
      4: "身体健康", 5: "体质不错", 6: "身强体壮", 7: "筋骨强健",
      8: "体魄过人", 9: "天生神力", 10: "金刚不坏"
    },
    spirituality: {
      0: "灵气不显", 1: "灵性微弱", 2: "灵性较低", 3: "灵性一般",
      4: "灵性尚可", 5: "灵性不错", 6: "灵性敏锐", 7: "灵性超群",
      8: "灵性过人", 9: "灵性绝佳", 10: "天人感应"
    },
    comprehension: {
      0: "愚钝如牛", 1: "悟性极差", 2: "悟性较差", 3: "悟性一般",
      4: "悟性尚可", 5: "悟性不错", 6: "悟性敏锐", 7: "悟性超群",
      8: "悟性过人", 9: "悟性绝佳", 10: "一点即通"
    },
    fortune: {
      0: "厄运缠身", 1: "运气极差", 2: "运气较差", 3: "运气一般",
      4: "运气尚可", 5: "运气不错", 6: "运气颇佳", 7: "运气极好",
      8: "福星高照", 9: "洪福齐天", 10: "天命之子"
    },
    charm: {
      0: "面目可憎", 1: "其貌不扬", 2: "容貌平平", 3: "容貌一般",
      4: "容貌尚可", 5: "容貌不错", 6: "容貌出众", 7: "美貌动人",
      8: "倾国倾城", 9: "绝世容颜", 10: "天人之姿"
    },
    temperament: {
      0: "心性不稳", 1: "意志薄弱", 2: "心性较差", 3: "心性一般",
      4: "心性尚可", 5: "心性不错", 6: "道心稳固", 7: "道心坚韧",
      8: "道心如铁", 9: "道心不移", 10: "道心圆满"
    }
  };
  
  if (attributeName in descriptions && value in descriptions[attributeName]) {
    return descriptions[attributeName][value];
  }
  
  return `未知境界(${value})`;
}