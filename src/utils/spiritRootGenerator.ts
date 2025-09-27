/**
 * @fileoverview 智能灵根生成系统
 * 根据天资等级生成相应品质的随机灵根
 */

// 灵根类型定义
interface SpiritRootType {
  name: string;
  element: string;
  description: string;
  baseMultiplier: number;
}

// 品阶定义
interface SpiritRootTier {
  name: string;
  multiplier: number;
  rarity: number; // 稀有度 1-5
  weight: number; // 权重，用于随机
}

// 天资等级对应的品阶权重
interface TalentTierWeights {
  [key: string]: {
    [tierName: string]: number;
  };
}

// 基础灵根类型
const SPIRIT_ROOT_TYPES: SpiritRootType[] = [
  { name: '金灵根', element: '金', description: '蕴含锋锐金气之力，修炼金系功法事半功倍', baseMultiplier: 1.0 },
  { name: '木灵根', element: '木', description: '蕴含生机木元之力，修炼木系功法事半功倍', baseMultiplier: 1.0 },
  { name: '水灵根', element: '水', description: '蕴含柔和水流之力，修炼水系功法事半功倍', baseMultiplier: 1.0 },
  { name: '火灵根', element: '火', description: '蕴含炽热火焰之力，修炼火系功法事半功倍', baseMultiplier: 1.0 },
  { name: '土灵根', element: '土', description: '蕴含厚实土元之力，修炼土系功法事半功倍', baseMultiplier: 1.0 },
  { name: '雷灵根', element: '雷', description: '蕴含狂暴雷电之力，雷系功法威力倍增', baseMultiplier: 1.2 },
  { name: '冰灵根', element: '冰', description: '蕴含极寒冰雪之力，冰系功法修炼如鱼得水', baseMultiplier: 1.2 },
  { name: '风灵根', element: '风', description: '蕴含轻盈风元之力，身法类功法修炼速度提升', baseMultiplier: 1.1 },
  { name: '光灵根', element: '光', description: '蕴含纯净光明之力，对抗邪恶有奇效', baseMultiplier: 1.3 },
  { name: '暗灵根', element: '暗', description: '蕴含神秘暗影之力，暗系功法修炼事半功倍', baseMultiplier: 1.3 },
  { name: '五行灵根', element: '五行', description: '五行齐全的均衡灵根，修炼各系功法都有不错效果', baseMultiplier: 0.8 },
  { name: '变异双灵根', element: '变异', description: '罕见的变异灵根，拥有两种属性的独特优势', baseMultiplier: 1.4 },
  { name: '混沌灵根', element: '混沌', description: '传说中的混沌灵根，蕴含开天辟地之力', baseMultiplier: 2.0 }
];

// 品阶定义
const SPIRIT_ROOT_TIERS: SpiritRootTier[] = [
  { name: '凡品', multiplier: 1.0, rarity: 1, weight: 100 },
  { name: '下品', multiplier: 1.1, rarity: 2, weight: 80 },
  { name: '中品', multiplier: 1.3, rarity: 3, weight: 60 },
  { name: '上品', multiplier: 1.6, rarity: 4, weight: 40 },
  { name: '极品', multiplier: 2.0, rarity: 5, weight: 20 },
  { name: '神品', multiplier: 2.8, rarity: 5, weight: 5 },
  { name: '仙品', multiplier: 3.5, rarity: 5, weight: 1 }
];

// 天资等级对应的品阶权重
const TALENT_TIER_WEIGHTS: TalentTierWeights = {
  '凡夫俗子': {
    '凡品': 70,
    '下品': 25,
    '中品': 5,
    '上品': 0,
    '极品': 0,
    '神品': 0,
    '仙品': 0
  },
  '中人之姿': {
    '凡品': 50,
    '下品': 35,
    '中品': 12,
    '上品': 3,
    '极品': 0,
    '神品': 0,
    '仙品': 0
  },
  '天生灵秀': {
    '凡品': 30,
    '下品': 40,
    '中品': 20,
    '上品': 8,
    '极品': 2,
    '神品': 0,
    '仙品': 0
  },
  '气运之子': {
    '凡品': 15,
    '下品': 30,
    '中品': 30,
    '上品': 18,
    '极品': 6,
    '神品': 1,
    '仙品': 0
  },
  '大道亲和': {
    '凡品': 5,
    '下品': 15,
    '中品': 25,
    '上品': 30,
    '极品': 20,
    '神品': 4,
    '仙品': 1
  },
  '天命所归': {
    '凡品': 0,
    '下品': 5,
    '中品': 15,
    '上品': 30,
    '极品': 35,
    '神品': 12,
    '仙品': 3
  }
};

// 根据权重随机选择
function weightedRandom<T>(items: T[], weightGetter: (item: T) => number): T {
  const totalWeight = items.reduce((sum, item) => sum + weightGetter(item), 0);
  let random = Math.random() * totalWeight;
  
  for (const item of items) {
    random -= weightGetter(item);
    if (random <= 0) {
      return item;
    }
  }
  
  return items[items.length - 1]; // 回退选项
}

// 根据天资等级选择品阶
function selectTierByTalent(talentTier: string): SpiritRootTier {
  const weights = TALENT_TIER_WEIGHTS[talentTier] || TALENT_TIER_WEIGHTS['中人之姿'];
  
  const availableTiers = SPIRIT_ROOT_TIERS.filter(tier => weights[tier.name] > 0);
  return weightedRandom(availableTiers, tier => weights[tier.name]);
}

// 根据品阶选择灵根类型
function selectRootTypeByTier(tier: SpiritRootTier): SpiritRootType {
  // 高品阶更容易获得稀有灵根
  if (tier.rarity >= 4) {
    // 极品以上有机会获得特殊灵根
    const specialRoots = SPIRIT_ROOT_TYPES.filter(root => 
      ['光灵根', '暗灵根', '变异双灵根', '混沌灵根'].includes(root.name)
    );
    const commonRoots = SPIRIT_ROOT_TYPES.filter(root => 
      !['光灵根', '暗灵根', '变异双灵根', '混沌灵根'].includes(root.name)
    );
    
    if (tier.rarity === 5 && Math.random() < 0.3) {
      return weightedRandom(specialRoots, () => 1);
    }
    return weightedRandom(commonRoots, () => 1);
  } else {
    // 低品阶主要是基础灵根
    const basicRoots = SPIRIT_ROOT_TYPES.filter(root => 
      ['金灵根', '木灵根', '水灵根', '火灵根', '土灵根', '五行灵根'].includes(root.name)
    );
    const elementalRoots = SPIRIT_ROOT_TYPES.filter(root => 
      ['雷灵根', '冰灵根', '风灵根'].includes(root.name)
    );
    
    if (tier.rarity >= 3 && Math.random() < 0.4) {
      return weightedRandom(elementalRoots, () => 1);
    }
    return weightedRandom(basicRoots, () => 1);
  }
}

// 生成特殊效果
function generateSpecialEffects(rootType: SpiritRootType, tier: SpiritRootTier): string[] {
  const effects: string[] = [];
  
  // 基础效果
  if (rootType.element !== '五行') {
    effects.push(`${rootType.element}系功法修炼速度提升${Math.round(tier.multiplier * 100 - 100)}%`);
  }
  
  // 品阶特殊效果
  if (tier.rarity >= 3) {
    effects.push('修炼时有概率获得额外感悟');
  }
  
  if (tier.rarity >= 4) {
    effects.push('突破瓶颈时成功率提升');
  }
  
  if (tier.rarity >= 5) {
    effects.push('天劫威力减弱，渡劫成功率大幅提升');
  }
  
  // 特殊灵根效果
  switch (rootType.name) {
    case '光灵根':
      effects.push('对邪恶生物造成额外伤害', '心魔抗性提升');
      break;
    case '暗灵根':
      effects.push('隐匿能力增强', '暗系法术威力倍增');
      break;
    case '变异双灵根':
      effects.push('可同时修炼两种属性功法', '属性转换能力');
      break;
    case '混沌灵根':
      effects.push('万法皆通', '创造性功法领悟能力');
      break;
    case '五行灵根':
      effects.push('五行相生相克运用自如');
      break;
  }
  
  return effects;
}

// 主要的随机灵根生成函数
export function generateRandomSpiritRoot(talentTier: string): {
  名称: string;
  品级: string;
  描述: string;
  base_multiplier: number;
  cultivation_speed: string;
  special_effects: string[];
  tier: string;
  rarity: number;
} {
  console.log(`[灵根生成] 开始为天资"${talentTier}"生成随机灵根`);
  
  // 1. 根据天资选择品阶
  const selectedTier = selectTierByTalent(talentTier);
  console.log(`[灵根生成] 选定品阶: ${selectedTier.name}`);
  
  // 2. 根据品阶选择灵根类型
  const selectedType = selectRootTypeByTier(selectedTier);
  console.log(`[灵根生成] 选定类型: ${selectedType.name}`);
  
  // 3. 计算最终倍率
  const finalMultiplier = selectedType.baseMultiplier * selectedTier.multiplier;
  
  // 4. 生成特殊效果
  const specialEffects = generateSpecialEffects(selectedType, selectedTier);
  
  // 5. 构建完整的灵根名称
  const fullName = selectedTier.name === '凡品' ? 
    selectedType.name : 
    `${selectedTier.name}${selectedType.name}`;
  
  // 6. 生成描述
  let description = selectedType.description;
  if (selectedTier.rarity >= 3) {
    description += `，${selectedTier.name}品质使其修炼效果更为卓越`;
  }
  
  const result = {
    名称: fullName,
    品级: selectedTier.name,
    描述: description,
    base_multiplier: finalMultiplier,
    cultivation_speed: `${finalMultiplier.toFixed(1)}x`,
    special_effects: specialEffects,
    tier: selectedTier.name,
    rarity: selectedTier.rarity
  };
  
  console.log(`[灵根生成] 生成结果:`, result);
  return result;
}

// 验证灵根是否为随机灵根
export function isRandomSpiritRoot(spiritRoot: string | object): boolean {
  if (typeof spiritRoot === 'string') {
    return spiritRoot === '随机灵根' || spiritRoot.includes('随机');
  }
  return false;
}

// 格式化灵根为标准对象格式
export function formatSpiritRootObject(generatedRoot: ReturnType<typeof generateRandomSpiritRoot>) {
  return {
    名称: generatedRoot.名称,
    品级: generatedRoot.品级,
    品质: generatedRoot.tier,
    等级: generatedRoot.tier,
    描述: generatedRoot.描述,
    base_multiplier: generatedRoot.base_multiplier,
    cultivation_speed: generatedRoot.cultivation_speed,
    special_effects: generatedRoot.special_effects
  };
}