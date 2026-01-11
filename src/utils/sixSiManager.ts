/**
 * @fileoverview 六司系统管理模块
 *
 * 【职责】
 * - 管理先天/后天六司的约束
 * - 计算六司对各项属性的加成
 * - 验证六司修改的合法性
 *
 * 【核心概念】
 * - 先天六司：代表先天天资，范围0-10，占加成权重70%
 * - 后天六司：代表后天增长，范围0-20，占加成权重30%
 * - 等价原则：先天1点 ≈ 后天2.33点效果
 */

// ============================================================================
// 常量定义
// ============================================================================

/** 六司约束配置 - 内部扩展版本 */
export interface InternalSixSiConstraints {
  先天六司: {
    每项上限: number;
    总分上限: number;
    对加成权重: number;
  };
  后天六司: {
    每项上限: number;
    总分上限: number;
    单次增加上限: number;
    稀有机缘上限: number;
    对加成权重: number;
  };
}

/** 六司约束配置 */
export const SIX_SI_CONSTRAINTS: InternalSixSiConstraints = {
  先天六司: {
    每项上限: 10,
    总分上限: 60,
    对加成权重: 0.7,
  },
  后天六司: {
    每项上限: 20,
    总分上限: 120,
    单次增加上限: 3,
    稀有机缘上限: 5,
    对加成权重: 0.3,
  },
};

/** 六司属性名称 */
export const SIX_SI_ATTRIBUTES = ['根骨', '灵性', '悟性', '气运', '魅力', '心性'] as const;
export type SixSiAttribute = (typeof SIX_SI_ATTRIBUTES)[number];

/** 六司属性权重（用于综合计算） */
export const SIX_SI_WEIGHTS: Record<SixSiAttribute, number> = {
  根骨: 0.25,  // 影响体质、气血、灵气吸收
  灵性: 0.25,  // 影响灵气感应、法术威力
  悟性: 0.20,  // 影响功法理解、突破概率
  心性: 0.15,  // 影响修炼稳定、抗心魔
  气运: 0.10,  // 影响机缘、掉落、突破
  魅力: 0.05,  // 影响社交、NPC好感
};

/** 六司对各项属性的加成系数 */
export const SIX_SI_BONUS_COEFFICIENTS = {
  根骨: {
    气血上限: 0.05,      // 每点根骨增加5%气血上限
    灵气吸收: 0.03,      // 每点根骨增加3%灵气吸收效率
    体质强度: 0.04,      // 每点根骨增加4%体质强度
  },
  灵性: {
    灵气上限: 0.05,      // 每点灵性增加5%灵气上限
    法术威力: 0.04,      // 每点灵性增加4%法术威力
    灵气感应: 0.03,      // 每点灵性增加3%灵气感应范围
  },
  悟性: {
    修炼速度: 0.04,      // 每点悟性增加4%修炼速度
    功法理解: 0.05,      // 每点悟性增加5%功法理解速度
    突破概率: 0.02,      // 每点悟性增加2%突破成功率
  },
  心性: {
    修炼稳定: 0.04,      // 每点心性增加4%修炼稳定性
    抗心魔: 0.05,        // 每点心性增加5%抗心魔能力
    意志强度: 0.03,      // 每点心性增加3%意志强度
  },
  气运: {
    机缘概率: 0.03,      // 每点气运增加3%机缘触发概率
    掉落品质: 0.02,      // 每点气运增加2%掉落品质
    突破运势: 0.02,      // 每点气运增加2%突破运势
  },
  魅力: {
    好感获取: 0.05,      // 每点魅力增加5%好感获取
    交易折扣: 0.02,      // 每点魅力增加2%交易折扣
    说服成功: 0.03,      // 每点魅力增加3%说服成功率
  },
} as const;

/** 后天六司获取方式 */
export const ACQUIRED_SIX_SI_SOURCES = {
  装备增幅: { 最大增加: 3, 描述: '穿戴特殊装备获得的临时/永久加成' },
  天赋效果: { 最大增加: 2, 描述: '特殊天赋带来的永久加成' },
  服用丹药: { 最大增加: 2, 描述: '服用洗髓丹等特殊丹药' },
  机缘奇遇: { 最大增加: 5, 描述: '极稀有机缘，如仙人传承、神物洗礼' },
  大道感悟: { 最大增加: 1, 描述: '大道突破时的感悟加成' },
  境界突破: { 最大增加: 1, 描述: '大境界突破时的体质蜕变' },
} as const;

// ============================================================================
// 类型定义
// ============================================================================

/** 六司数据 */
export interface SixSiData {
  根骨: number;
  灵性: number;
  悟性: number;
  气运: number;
  魅力: number;
  心性: number;
}

/** 六司修改请求 */
export interface SixSiModifyRequest {
  属性: SixSiAttribute;
  增加值: number;
  来源: keyof typeof ACQUIRED_SIX_SI_SOURCES;
  描述?: string;
}

/** 六司修改验证结果 */
export interface SixSiModifyValidation {
  valid: boolean;
  reason: string;
  adjustedValue?: number;  // 如果需要调整，返回调整后的值
}

// ============================================================================
// 验证函数
// ============================================================================

/**
 * 验证先天六司数据是否合法
 */
export function validateInnateSixSi(sixSi: SixSiData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { 每项上限, 总分上限 } = SIX_SI_CONSTRAINTS.先天六司;

  let total = 0;
  for (const attr of SIX_SI_ATTRIBUTES) {
    const value = sixSi[attr];
    if (value < 0) {
      errors.push(`${attr}不能为负数`);
    }
    if (value > 每项上限) {
      errors.push(`${attr}超过上限${每项上限}，当前值${value}`);
    }
    total += value;
  }

  if (total > 总分上限) {
    errors.push(`先天六司总分${total}超过上限${总分上限}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 验证后天六司数据是否合法
 */
export function validateAcquiredSixSi(sixSi: SixSiData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { 每项上限, 总分上限 } = SIX_SI_CONSTRAINTS.后天六司;

  let total = 0;
  for (const attr of SIX_SI_ATTRIBUTES) {
    const value = sixSi[attr];
    if (value < 0) {
      errors.push(`${attr}不能为负数`);
    }
    if (value > 每项上限) {
      errors.push(`${attr}超过上限${每项上限}，当前值${value}`);
    }
    total += value;
  }

  if (total > 总分上限) {
    errors.push(`后天六司总分${total}超过上限${总分上限}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 验证后天六司修改请求是否合法
 */
export function validateSixSiModify(
  currentSixSi: SixSiData,
  request: SixSiModifyRequest
): SixSiModifyValidation {
  const { 属性, 增加值, 来源 } = request;
  const { 每项上限, 单次增加上限, 稀有机缘上限 } = SIX_SI_CONSTRAINTS.后天六司;

  // 检查来源是否有效
  const sourceConfig = ACQUIRED_SIX_SI_SOURCES[来源];
  if (!sourceConfig) {
    return { valid: false, reason: `无效的获取来源：${来源}` };
  }

  // 检查增加值是否为正
  if (增加值 <= 0) {
    return { valid: false, reason: '增加值必须为正数' };
  }

  // 检查单次增加上限
  const maxIncrease = 来源 === '机缘奇遇' ? 稀有机缘上限 : 单次增加上限;
  if (增加值 > maxIncrease) {
    return {
      valid: false,
      reason: `${来源}单次最多增加${maxIncrease}点，请求增加${增加值}点`,
      adjustedValue: maxIncrease,
    };
  }

  // 检查来源限制
  if (增加值 > sourceConfig.最大增加) {
    return {
      valid: false,
      reason: `${来源}最多增加${sourceConfig.最大增加}点`,
      adjustedValue: sourceConfig.最大增加,
    };
  }

  // 检查是否超过属性上限
  const currentValue = currentSixSi[属性];
  const newValue = currentValue + 增加值;
  if (newValue > 每项上限) {
    const actualIncrease = 每项上限 - currentValue;
    if (actualIncrease <= 0) {
      return { valid: false, reason: `${属性}已达上限${每项上限}` };
    }
    return {
      valid: true,
      reason: `${属性}将达到上限，实际增加${actualIncrease}点`,
      adjustedValue: actualIncrease,
    };
  }

  return { valid: true, reason: '修改合法' };
}

// ============================================================================
// 加成计算函数
// ============================================================================

/**
 * 计算单项六司对特定属性的加成
 */
export function calculateSingleBonus(
  attribute: SixSiAttribute,
  innateValue: number,
  acquiredValue: number,
  bonusType: string
): number {
  const coefficients = SIX_SI_BONUS_COEFFICIENTS[attribute];
  const coefficient = (coefficients as Record<string, number>)[bonusType];

  if (coefficient === undefined) {
    return 0;
  }

  // 先天权重70%，后天权重30%
  const innateBonus = innateValue * coefficient * SIX_SI_CONSTRAINTS.先天六司.对加成权重;
  const acquiredBonus = acquiredValue * coefficient * SIX_SI_CONSTRAINTS.后天六司.对加成权重;

  return innateBonus + acquiredBonus;
}

/** 六司加成结果 - 内部扩展版本 */
export interface InternalSixSiBonus {
  修炼速度加成: number;
  气血上限加成: number;
  灵气上限加成: number;
  神识上限加成: number;
  突破概率加成: number;
  机缘概率加成: number;
}

/**
 * 计算综合六司加成
 */
export function calculateSixSiBonus(
  innateSixSi: SixSiData,
  acquiredSixSi: SixSiData
): InternalSixSiBonus {
  const bonus: InternalSixSiBonus = {
    修炼速度加成: 0,
    气血上限加成: 0,
    灵气上限加成: 0,
    神识上限加成: 0,
    突破概率加成: 0,
    机缘概率加成: 0,
  };

  // 根骨加成
  bonus.气血上限加成 += calculateSingleBonus('根骨', innateSixSi.根骨, acquiredSixSi.根骨, '气血上限');

  // 灵性加成
  bonus.灵气上限加成 += calculateSingleBonus('灵性', innateSixSi.灵性, acquiredSixSi.灵性, '灵气上限');

  // 悟性加成
  bonus.修炼速度加成 += calculateSingleBonus('悟性', innateSixSi.悟性, acquiredSixSi.悟性, '修炼速度');
  bonus.突破概率加成 += calculateSingleBonus('悟性', innateSixSi.悟性, acquiredSixSi.悟性, '突破概率');

  // 心性加成（影响神识）
  bonus.神识上限加成 += calculateSingleBonus('心性', innateSixSi.心性, acquiredSixSi.心性, '抗心魔') * 0.5;

  // 气运加成
  bonus.机缘概率加成 += calculateSingleBonus('气运', innateSixSi.气运, acquiredSixSi.气运, '机缘概率');
  bonus.突破概率加成 += calculateSingleBonus('气运', innateSixSi.气运, acquiredSixSi.气运, '突破运势');

  return bonus;
}

/**
 * 计算六司综合评分
 * 用于快速评估角色天资
 */
export function calculateSixSiScore(
  innateSixSi: SixSiData,
  acquiredSixSi: SixSiData
): { innateScore: number; acquiredScore: number; totalScore: number; grade: string } {
  let innateScore = 0;
  let acquiredScore = 0;

  for (const attr of SIX_SI_ATTRIBUTES) {
    const weight = SIX_SI_WEIGHTS[attr];
    innateScore += innateSixSi[attr] * weight;
    acquiredScore += acquiredSixSi[attr] * weight;
  }

  // 先天满分10，后天满分20，但后天权重只有30%
  // 综合评分 = 先天评分 * 0.7 + 后天评分 * 0.3 / 2（因为后天上限是先天的2倍）
  const totalScore = innateScore * 0.7 + (acquiredScore / 2) * 0.3;

  // 评级
  let grade: string;
  if (totalScore >= 9) {
    grade = '天纵奇才';
  } else if (totalScore >= 7) {
    grade = '资质上佳';
  } else if (totalScore >= 5) {
    grade = '中等之资';
  } else if (totalScore >= 3) {
    grade = '资质平庸';
  } else {
    grade = '资质愚钝';
  }

  return {
    innateScore: Math.round(innateScore * 100) / 100,
    acquiredScore: Math.round(acquiredScore * 100) / 100,
    totalScore: Math.round(totalScore * 100) / 100,
    grade,
  };
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 创建空的六司数据
 */
export function createEmptySixSi(): SixSiData {
  return {
    根骨: 0,
    灵性: 0,
    悟性: 0,
    气运: 0,
    魅力: 0,
    心性: 0,
  };
}

/**
 * 创建默认的先天六司（中等资质）
 */
export function createDefaultInnateSixSi(): SixSiData {
  return {
    根骨: 5,
    灵性: 5,
    悟性: 5,
    气运: 5,
    魅力: 5,
    心性: 5,
  };
}

/**
 * 随机生成先天六司
 * @param totalPoints 总点数（默认30，即平均每项5点）
 * @param variance 方差系数（0-1，越大越不均匀）
 */
export function generateRandomInnateSixSi(totalPoints: number = 30, variance: number = 0.5): SixSiData {
  const sixSi = createEmptySixSi();
  const { 每项上限 } = SIX_SI_CONSTRAINTS.先天六司;

  // 先平均分配
  const baseValue = Math.floor(totalPoints / 6);
  let remaining = totalPoints - baseValue * 6;

  for (const attr of SIX_SI_ATTRIBUTES) {
    sixSi[attr] = baseValue;
  }

  // 根据方差随机调整
  const adjustments = Math.floor(totalPoints * variance);
  for (let i = 0; i < adjustments; i++) {
    // 随机选择两个属性，一个加一个减
    const attrs = [...SIX_SI_ATTRIBUTES];
    const fromIdx = Math.floor(Math.random() * attrs.length);
    const fromAttr = attrs[fromIdx];
    attrs.splice(fromIdx, 1);
    const toIdx = Math.floor(Math.random() * attrs.length);
    const toAttr = attrs[toIdx];

    if (sixSi[fromAttr] > 1 && sixSi[toAttr] < 每项上限) {
      sixSi[fromAttr]--;
      sixSi[toAttr]++;
    }
  }

  // 分配剩余点数
  while (remaining > 0) {
    const attr = SIX_SI_ATTRIBUTES[Math.floor(Math.random() * SIX_SI_ATTRIBUTES.length)];
    if (sixSi[attr] < 每项上限) {
      sixSi[attr]++;
      remaining--;
    }
  }

  return sixSi;
}

/**
 * 格式化六司数据为显示字符串
 */
export function formatSixSiDisplay(sixSi: SixSiData, type: '先天' | '后天'): string {
  const maxValue = type === '先天'
    ? SIX_SI_CONSTRAINTS.先天六司.每项上限
    : SIX_SI_CONSTRAINTS.后天六司.每项上限;

  return SIX_SI_ATTRIBUTES.map(attr => `${attr}:${sixSi[attr]}/${maxValue}`).join(' ');
}
