/**
 * @fileoverview 修炼速度计算模块
 *
 * 【职责】
 * - 计算修炼速度的各项因子
 * - 综合计算最终修炼速度
 * - 预估突破时间
 *
 * 【核心公式】
 * 最终速度 = 基础速度 × 灵气系数 × 六司系数 × 状态系数 × (1 + 功法加成 + 环境加成)
 * 六司系数 = 先天六司系数 × 0.7 + 后天六司系数 × 0.3
 */

import type {
  CultivationSpeedFactors,
  CultivationSpeedResult,
} from '@/types/game';

// ============================================================================
// 常量定义
// ============================================================================

/** 六司属性权重配置 */
const SIX_SI_WEIGHTS = {
  根骨: 0.25,  // 25% - 影响体质和灵气吸收
  灵性: 0.25,  // 25% - 影响灵气感应和运转
  悟性: 0.20,  // 20% - 影响功法理解和突破
  心性: 0.15,  // 15% - 影响修炼稳定性
  气运: 0.10,  // 10% - 影响机缘和突破成功率
  魅力: 0.05,  // 5%  - 影响社交和资源获取
} as const;

/** 先天六司系数范围 */
const INNATE_SIX_SI_RANGE = {
  minValue: 0,
  maxValue: 10,
  minFactor: 0.5,
  maxFactor: 2.0,
} as const;

/** 后天六司系数范围 */
const ACQUIRED_SIX_SI_RANGE = {
  minValue: 0,
  maxValue: 20,
  minFactor: 0.0,
  maxFactor: 0.6,
} as const;

/** 灵气浓度系数映射表 */
const SPIRIT_DENSITY_RANGES = [
  { min: 1, max: 20, minFactor: 0.1, maxFactor: 0.4, desc: '灵气稀薄' },
  { min: 21, max: 40, minFactor: 0.4, maxFactor: 0.7, desc: '灵气普通' },
  { min: 41, max: 60, minFactor: 0.7, maxFactor: 1.0, desc: '灵气充沛' },
  { min: 61, max: 80, minFactor: 1.0, maxFactor: 1.5, desc: '灵气浓郁' },
  { min: 81, max: 100, minFactor: 1.5, maxFactor: 2.0, desc: '灵气极盛' },
] as const;

/** 境界突破时间标准（游戏时间，单位：月） - 内部使用 */
interface InternalBreakthroughTime {
  境界名称: string;
  阶段: string;
  最短月数: number;
  标准月数: number;
  最长月数: number;
}

/** 境界突破时间标准（游戏时间，单位：月） */
export const REALM_BREAKTHROUGH_STANDARDS: InternalBreakthroughTime[] = [
  // 练气期
  { 境界名称: '练气', 阶段: '初期', 最短月数: 3, 标准月数: 12, 最长月数: 36 },
  { 境界名称: '练气', 阶段: '中期', 最短月数: 6, 标准月数: 24, 最长月数: 60 },
  { 境界名称: '练气', 阶段: '后期', 最短月数: 12, 标准月数: 36, 最长月数: 120 },
  { 境界名称: '练气', 阶段: '圆满', 最短月数: 24, 标准月数: 60, 最长月数: 240 },
  // 筑基期
  { 境界名称: '筑基', 阶段: '初期', 最短月数: 12, 标准月数: 60, 最长月数: 180 },
  { 境界名称: '筑基', 阶段: '中期', 最短月数: 24, 标准月数: 96, 最长月数: 300 },
  { 境界名称: '筑基', 阶段: '后期', 最短月数: 36, 标准月数: 144, 最长月数: 480 },
  { 境界名称: '筑基', 阶段: '圆满', 最短月数: 60, 标准月数: 240, 最长月数: 720 },
  // 金丹期
  { 境界名称: '金丹', 阶段: '初期', 最短月数: 60, 标准月数: 240, 最长月数: 600 },
  { 境界名称: '金丹', 阶段: '中期', 最短月数: 120, 标准月数: 360, 最长月数: 960 },
  { 境界名称: '金丹', 阶段: '后期', 最短月数: 180, 标准月数: 480, 最长月数: 1200 },
  { 境界名称: '金丹', 阶段: '圆满', 最短月数: 240, 标准月数: 720, 最长月数: 1800 },
  // 元婴期
  { 境界名称: '元婴', 阶段: '初期', 最短月数: 240, 标准月数: 720, 最长月数: 1800 },
  { 境界名称: '元婴', 阶段: '中期', 最短月数: 360, 标准月数: 1080, 最长月数: 2400 },
  { 境界名称: '元婴', 阶段: '后期', 最短月数: 480, 标准月数: 1440, 最长月数: 3600 },
  { 境界名称: '元婴', 阶段: '圆满', 最短月数: 720, 标准月数: 2160, 最长月数: 6000 },
  // 化神期
  { 境界名称: '化神', 阶段: '初期', 最短月数: 600, 标准月数: 1800, 最长月数: 6000 },
  { 境界名称: '化神', 阶段: '中期', 最短月数: 960, 标准月数: 2880, 最长月数: 9600 },
  { 境界名称: '化神', 阶段: '后期', 最短月数: 1440, 标准月数: 4320, 最长月数: 14400 },
  { 境界名称: '化神', 阶段: '圆满', 最短月数: 2400, 标准月数: 7200, 最长月数: 24000 },
];

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 线性插值计算
 */
function lerp(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  const t = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)));
  return outMin + t * (outMax - outMin);
}

/**
 * 限制数值在指定范围内
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================================
// 六司系数计算
// ============================================================================

/** 六司数据类型 */
export interface SixSiData {
  根骨: number;
  灵性: number;
  悟性: number;
  气运: number;
  魅力: number;
  心性: number;
}

/**
 * 计算六司加权总分
 */
function calculateWeightedSixSi(sixSi: SixSiData): number {
  return (
    sixSi.根骨 * SIX_SI_WEIGHTS.根骨 +
    sixSi.灵性 * SIX_SI_WEIGHTS.灵性 +
    sixSi.悟性 * SIX_SI_WEIGHTS.悟性 +
    sixSi.心性 * SIX_SI_WEIGHTS.心性 +
    sixSi.气运 * SIX_SI_WEIGHTS.气运 +
    sixSi.魅力 * SIX_SI_WEIGHTS.魅力
  );
}

/**
 * 计算先天六司系数
 * @param sixSi 先天六司数据（每项0-10）
 * @returns 系数范围 0.5 - 2.0
 */
export function calculateInnateSixSiFactor(sixSi: SixSiData): number {
  const weightedScore = calculateWeightedSixSi(sixSi);
  const { minValue, maxValue, minFactor, maxFactor } = INNATE_SIX_SI_RANGE;
  return lerp(weightedScore, minValue, maxValue, minFactor, maxFactor);
}

/**
 * 计算后天六司系数
 * @param sixSi 后天六司数据（每项0-20）
 * @returns 系数范围 0.0 - 0.6（作为额外加成）
 */
export function calculateAcquiredSixSiFactor(sixSi: SixSiData): number {
  const weightedScore = calculateWeightedSixSi(sixSi);
  const { minValue, maxValue, minFactor, maxFactor } = ACQUIRED_SIX_SI_RANGE;
  return lerp(weightedScore, minValue, maxValue, minFactor, maxFactor);
}

/**
 * 计算综合六司系数
 * 公式：先天系数 × 0.7 + 后天系数 × 0.3
 */
export function calculateCombinedSixSiFactor(
  innateSixSi: SixSiData,
  acquiredSixSi: SixSiData
): { innate: number; acquired: number; combined: number } {
  const innate = calculateInnateSixSiFactor(innateSixSi);
  const acquired = calculateAcquiredSixSiFactor(acquiredSixSi);
  // 先天占70%权重，后天作为额外加成（30%权重）
  const combined = innate * 0.7 + (1 + acquired) * 0.3;
  return { innate, acquired, combined };
}

// ============================================================================
// 灵气浓度系数计算
// ============================================================================

/**
 * 计算灵气浓度系数
 * @param density 灵气浓度（1-100）
 * @returns 系数范围 0.1 - 2.0
 */
export function calculateSpiritDensityFactor(density: number): number {
  const clampedDensity = clamp(density, 1, 100);

  for (const range of SPIRIT_DENSITY_RANGES) {
    if (clampedDensity >= range.min && clampedDensity <= range.max) {
      return lerp(clampedDensity, range.min, range.max, range.minFactor, range.maxFactor);
    }
  }

  // 默认返回最低系数
  return 0.1;
}

/**
 * 获取灵气浓度描述
 */
export function getSpiritDensityDescription(density: number): string {
  const clampedDensity = clamp(density, 1, 100);

  for (const range of SPIRIT_DENSITY_RANGES) {
    if (clampedDensity >= range.min && clampedDensity <= range.max) {
      return range.desc;
    }
  }

  return '灵气稀薄';
}

// ============================================================================
// 状态效果系数计算
// ============================================================================

/** 状态效果类型 */
export interface StatusEffect {
  状态名称: string;
  类型: 'buff' | 'debuff';
  强度?: number;  // 0-100，默认50
  状态描述?: string;
}

/**
 * 计算状态效果系数
 * @param effects 当前状态效果列表
 * @returns 系数范围 0.5 - 2.0
 */
export function calculateStatusEffectFactor(effects: StatusEffect[]): number {
  if (!effects || effects.length === 0) {
    return 1.0;
  }

  let totalModifier = 0;

  for (const effect of effects) {
    const intensity = effect.强度 ?? 50;
    const modifier = (intensity / 100) * 0.5; // 最大±0.5

    if (effect.类型 === 'buff') {
      totalModifier += modifier;
    } else {
      totalModifier -= modifier;
    }
  }

  // 限制在0.5-2.0范围内
  return clamp(1.0 + totalModifier, 0.5, 2.0);
}

// ============================================================================
// 功法加成系数计算
// ============================================================================

/** 功法品质到加成的映射 */
const TECHNIQUE_QUALITY_BONUS: Record<string, number> = {
  '凡': 0.0,
  '黄': 0.1,
  '玄': 0.25,
  '地': 0.45,
  '天': 0.7,
  '仙': 0.9,
  '神': 1.0,
};

/**
 * 计算功法加成系数
 * @param quality 功法品质
 * @param proficiency 修炼进度（0-100）
 * @returns 系数范围 0.0 - 1.0
 */
export function calculateTechniqueBonus(quality: string, proficiency: number): number {
  const baseBonus = TECHNIQUE_QUALITY_BONUS[quality] ?? 0;
  const proficiencyMultiplier = proficiency / 100;
  return baseBonus * proficiencyMultiplier;
}

// ============================================================================
// 综合修炼速度计算
// ============================================================================

/** 修炼速度计算输入参数 */
export interface CultivationSpeedInput {
  // 位置信息
  灵气浓度: number;  // 1-100

  // 六司信息
  先天六司: SixSiData;
  后天六司: SixSiData;

  // 状态效果
  当前效果?: StatusEffect[];

  // 功法信息
  功法品质?: string;
  修炼进度?: number;

  // 境界信息
  当前境界: string;
  当前阶段: string;
  当前进度: number;
  下一级所需: number;

  // 环境加成（可选）
  环境加成?: number;  // 0.0 - 0.5
}

/** 基础修炼速度（每回合修为增加） */
const BASE_CULTIVATION_SPEED = 1;

/**
 * 计算综合修炼速度
 */
export function calculateCultivationSpeed(input: CultivationSpeedInput): CultivationSpeedResult {
  // 1. 计算灵气浓度系数
  const spiritDensityFactor = calculateSpiritDensityFactor(input.灵气浓度);

  // 2. 计算六司系数
  const sixSiResult = calculateCombinedSixSiFactor(input.先天六司, input.后天六司);

  // 3. 计算状态效果系数
  const statusFactor = calculateStatusEffectFactor(input.当前效果 ?? []);

  // 4. 计算功法加成
  const techniqueBonus = input.功法品质
    ? calculateTechniqueBonus(input.功法品质, input.修炼进度 ?? 0)
    : 0;

  // 5. 环境加成
  const environmentBonus = clamp(input.环境加成 ?? 0, 0, 0.5);

  // 6. 综合计算
  // 公式：基础速度 × 灵气系数 × 六司综合系数 × 状态系数 × (1 + 功法加成 + 环境加成)
  const combinedFactor =
    spiritDensityFactor *
    sixSiResult.combined *
    statusFactor *
    (1 + techniqueBonus + environmentBonus);

  const finalSpeed = BASE_CULTIVATION_SPEED * combinedFactor;

  // 7. 预估突破时间
  const remainingProgress = input.下一级所需 - input.当前进度;
  const estimatedBreakthroughTime = estimateBreakthroughTime(
    input.当前境界,
    input.当前阶段,
    remainingProgress,
    finalSpeed
  );

  return {
    基础速度: BASE_CULTIVATION_SPEED,
    综合系数: combinedFactor,
    最终速度: finalSpeed,
    预计突破时间: estimatedBreakthroughTime,
    因子详情: {
      灵气浓度系数: spiritDensityFactor,
      先天六司系数: sixSiResult.innate,
      后天六司系数: sixSiResult.acquired,
      状态效果系数: statusFactor,
      功法加成系数: techniqueBonus,
      环境加成系数: environmentBonus,
    },
  };
}

// ============================================================================
// 突破时间预估
// ============================================================================

/**
 * 预估突破时间
 */
function estimateBreakthroughTime(
  realm: string,
  stage: string,
  remainingProgress: number,
  speed: number
): string {
  if (speed <= 0 || remainingProgress <= 0) {
    return '已可突破';
  }

  // 查找当前境界阶段的标准时间
  const standard = REALM_BREAKTHROUGH_STANDARDS.find(
    (s) => s.境界名称 === realm && s.阶段 === stage
  );

  if (!standard) {
    // 未找到标准，使用简单计算
    const rounds = Math.ceil(remainingProgress / speed);
    return `约${rounds}回合`;
  }

  // 基于标准时间和当前速度计算
  // 假设标准速度为1.0时需要标准月数
  const adjustedMonths = Math.ceil(standard.标准月数 * (remainingProgress / 100) / speed);

  if (adjustedMonths < 1) {
    return '不足一月';
  } else if (adjustedMonths < 12) {
    return `约${adjustedMonths}月`;
  } else {
    const years = Math.floor(adjustedMonths / 12);
    const months = adjustedMonths % 12;
    if (months === 0) {
      return `约${years}年`;
    }
    return `约${years}年${months}月`;
  }
}

/**
 * 获取境界突破时间标准
 */
export function getBreakthroughStandard(
  realm: string,
  stage: string
): InternalBreakthroughTime | undefined {
  return REALM_BREAKTHROUGH_STANDARDS.find(
    (s) => s.境界名称 === realm && s.阶段 === stage
  );
}

/**
 * 验证修炼进度是否合理
 * @returns 是否合理，以及原因
 */
export function validateCultivationProgress(
  realm: string,
  stage: string,
  progressGain: number,
  elapsedMonths: number,
  speed: number
): { valid: boolean; reason: string } {
  const standard = getBreakthroughStandard(realm, stage);

  if (!standard) {
    return { valid: true, reason: '未找到标准，默认通过' };
  }

  // 计算理论上的最大进度增长
  // 假设100进度需要标准月数，则每月最大进度 = 100 / 最短月数 * speed
  const maxProgressPerMonth = (100 / standard.最短月数) * speed;
  const theoreticalMaxProgress = maxProgressPerMonth * elapsedMonths;

  if (progressGain > theoreticalMaxProgress * 1.2) {
    // 允许20%的浮动
    return {
      valid: false,
      reason: `进度增长过快：${progressGain}超过理论最大值${theoreticalMaxProgress.toFixed(1)}`,
    };
  }

  return { valid: true, reason: '进度合理' };
}

// ============================================================================
// 导出常量供外部使用
// ============================================================================

export { SIX_SI_WEIGHTS, SPIRIT_DENSITY_RANGES };
