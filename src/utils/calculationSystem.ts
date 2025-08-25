/**
 * 程序化计算系统
 * 处理复杂的数值计算，包含随机性和气运因子
 * 文字增幅等描述性内容交给AI处理
 */

import type { RealmStage } from '../types/game';
import { getRealmStageInfo } from '../data/realms';

// 气运等级枚举
export enum LuckLevel {
  CURSED = -2,      // 诅咒
  UNLUCKY = -1,     // 霉运
  NORMAL = 0,       // 普通
  LUCKY = 1,        // 幸运
  BLESSED = 2,      // 鸿运当头
  HEAVEN_DEFYING = 3 // 逆天气运
}

// 计算结果类型
export interface CalculationResult {
  baseValue: number;
  modifiers: {
    luck: number;
    random: number;
    realm: number;
    special: number;
  };
  finalValue: number;
  criticalSuccess: boolean;
  criticalFailure: boolean;
  description?: string; // AI可以填充的描述字段
}

// 突破难度系数
const BREAKTHROUGH_DIFFICULTY_MULTIPLIERS = {
  '简单': 0.8,
  '普通': 1.0,
  '困难': 1.3,
  '极难': 1.8,
  '逆天': 2.5
} as const;

// 随机数生成器类
export class LuckBasedRandom {
  private seed: number;

  constructor(initialSeed?: number) {
    this.seed = initialSeed || Date.now();
  }

  // 基于种子的伪随机数生成
  private seededRandom(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  // 带气运影响的随机数 (0-1)
  randomWithLuck(luck: LuckLevel): number {
    const baseRandom = this.seededRandom();
    const luckModifier = luck * 0.1; // 气运修正

    // 应用气运修正，但保持在0-1范围内
    let modifiedRandom = baseRandom + luckModifier;

    // 特殊处理：逆天气运有小概率产生超常结果
    if (luck === LuckLevel.HEAVEN_DEFYING && baseRandom > 0.95) {
      modifiedRandom = Math.min(1.2, modifiedRandom); // 允许超出1
    }

    // 诅咒气运有概率产生灾难性结果
    if (luck === LuckLevel.CURSED && baseRandom < 0.05) {
      modifiedRandom = Math.max(-0.2, modifiedRandom); // 允许负值
    }

    return Math.max(0, Math.min(1, modifiedRandom));
  }

  // 生成指定范围的随机整数
  randomInt(min: number, max: number, luck: LuckLevel = LuckLevel.NORMAL): number {
    const random = this.randomWithLuck(luck);
    return Math.floor(random * (max - min + 1)) + min;
  }

  // 百分比检定
  percentageCheck(chance: number, luck: LuckLevel = LuckLevel.NORMAL): boolean {
    const roll = this.randomWithLuck(luck) * 100;
    return roll <= chance + (luck * 5); // 气运每级+5%成功率
  }
}

// 全局随机数生成器实例
const rng = new LuckBasedRandom();

/**
 * 境界突破成功率计算
 */
export function calculateBreakthroughChance(
  currentRealm: number,
  currentStage: RealmStage,
  luck: LuckLevel,
  preparationBonus: number = 0
): CalculationResult {
  const stageInfo = getRealmStageInfo(currentRealm, currentStage);

  if (!stageInfo.stageInfo) {
    throw new Error(`无效的境界信息: ${currentRealm} ${currentStage}`);
  }

  // 基础成功率 (根据突破难度)
  const difficultyMultiplier = BREAKTHROUGH_DIFFICULTY_MULTIPLIERS[stageInfo.stageInfo.breakthrough_difficulty];
  let baseChance = Math.max(5, 60 / difficultyMultiplier); // 最低5%成功率

  // 极境突破特殊处理
  if (currentStage === '极境') {
    baseChance = Math.max(1, baseChance * 0.3); // 极境突破更困难
  }

  // 修正因子计算
  const luckModifier = luck * 8; // 气运修正，每级±8%
  const randomModifier = (rng.randomWithLuck(luck) - 0.5) * 20; // ±10%随机修正
  const realmModifier = preparationBonus; // 准备加成

  const finalChance = Math.max(0.1, Math.min(95,
    baseChance + luckModifier + randomModifier + realmModifier
  ));

  // 判定暴击成功/失败
  const roll = rng.randomWithLuck(luck) * 100;
  const criticalSuccess = roll <= 2 && luck >= LuckLevel.LUCKY; // 幸运时有暴击成功
  const criticalFailure = roll >= 98 && luck <= LuckLevel.UNLUCKY; // 霉运时有暴击失败

  return {
    baseValue: baseChance,
    modifiers: {
      luck: luckModifier,
      random: randomModifier,
      realm: realmModifier,
      special: criticalSuccess ? 50 : criticalFailure ? -50 : 0
    },
    finalValue: criticalSuccess ? Math.min(99, finalChance + 50) :
                criticalFailure ? Math.max(0.1, finalChance - 50) : finalChance,
    criticalSuccess,
    criticalFailure
  };
}

/**
 * 修炼资源获取计算
 */
export function calculateResourceGain(
  baseAmount: number,
  realmLevel: number,
  stage: RealmStage,
  luck: LuckLevel,
  timeSpent: number = 1 // 修炼时间(小时)
): CalculationResult {
  const stageInfo = getRealmStageInfo(realmLevel, stage);
  const resourceMultiplier = stageInfo.stageInfo?.resource_multiplier || 1;

  // 基础收益
  const baseGain = baseAmount * resourceMultiplier * timeSpent;

  // 修正因子
  const luckModifier = baseGain * (luck * 0.15); // 气运修正15%每级
  const randomModifier = baseGain * (rng.randomWithLuck(luck) - 0.5) * 0.4; // ±20%随机
  const realmModifier = baseGain * (realmLevel * 0.1); // 境界修正

  // 特殊事件判定
  const eventRoll = rng.randomWithLuck(luck);
  let specialModifier = 0;
  let criticalSuccess = false;
  let criticalFailure = false;

  if (eventRoll >= 0.98) { // 2%概率大成功
    specialModifier = baseGain * 2;
    criticalSuccess = true;
  } else if (eventRoll <= 0.02) { // 2%概率大失败
    specialModifier = -baseGain * 0.5;
    criticalFailure = true;
  }

  const finalGain = Math.max(0, baseGain + luckModifier + randomModifier + realmModifier + specialModifier);

  return {
    baseValue: baseGain,
    modifiers: {
      luck: luckModifier,
      random: randomModifier,
      realm: realmModifier,
      special: specialModifier
    },
    finalValue: finalGain,
    criticalSuccess,
    criticalFailure
  };
}

/**
 * 战斗力评估计算
 */
export function calculateCombatPower(
  realmLevel: number,
  stage: RealmStage,
  talentBonus: number = 0,
  equipmentBonus: number = 0,
  luck: LuckLevel = LuckLevel.NORMAL
): CalculationResult {
  // 基础战斗力 = 境界等级^2 * 100
  const basePower = Math.pow(realmLevel + 1, 2) * 100;

  // 阶段修正
  const stageMultipliers = {
    '初期': 1.0,
    '中期': 1.3,
    '后期': 1.6,
    '圆满': 2.0,
    '极境': 3.0
  };

  const stageBonus = basePower * (stageMultipliers[stage] - 1);

  // 修正因子
  const talentModifier = basePower * (talentBonus / 100); // 天赋加成
  const equipmentModifier = equipmentBonus; // 装备加成
  const luckModifier = basePower * (luck * 0.05); // 气运修正
  const randomModifier = basePower * (rng.randomWithLuck(luck) - 0.5) * 0.2; // ±10%随机

  const finalPower = Math.max(1,
    basePower + stageBonus + talentModifier + equipmentModifier + luckModifier + randomModifier
  );

  return {
    baseValue: basePower,
    modifiers: {
      luck: luckModifier,
      random: randomModifier,
      realm: stageBonus,
      special: talentModifier + equipmentModifier
    },
    finalValue: Math.round(finalPower),
    criticalSuccess: false,
    criticalFailure: false
  };
}

/**
 * 寿命计算
 */
export function calculateLifespan(
  realmLevel: number,
  stage: RealmStage,
  luck: LuckLevel = LuckLevel.NORMAL
): CalculationResult {
  const stageInfo = getRealmStageInfo(realmLevel, stage);
  const baseLifespan = 100; // 凡人基础寿命

  // 境界寿命加成
  const realmBonus = Math.pow(realmLevel + 1, 1.5) * 50;
  const stageBonus = stageInfo.stageInfo?.lifespan_bonus || 0;

  // 气运和随机修正
  const luckModifier = realmBonus * (luck * 0.1);
  const randomModifier = realmBonus * (rng.randomWithLuck(luck) - 0.5) * 0.3;

  const finalLifespan = Math.round(
    baseLifespan + realmBonus + stageBonus + luckModifier + randomModifier
  );

  return {
    baseValue: baseLifespan + realmBonus,
    modifiers: {
      luck: luckModifier,
      random: randomModifier,
      realm: stageBonus,
      special: 0
    },
    finalValue: finalLifespan,
    criticalSuccess: false,
    criticalFailure: false
  };
}

/**
 * 获取随机气运等级
 */
export function generateRandomLuck(): LuckLevel {
  const roll = Math.random();

  if (roll < 0.01) return LuckLevel.HEAVEN_DEFYING; // 1%
  if (roll < 0.05) return LuckLevel.CURSED;         // 4%
  if (roll < 0.15) return LuckLevel.BLESSED;        // 10%
  if (roll < 0.35) return LuckLevel.LUCKY;          // 20%
  if (roll < 0.65) return LuckLevel.UNLUCKY;        // 30%
  return LuckLevel.NORMAL;                          // 35%
}

/**
 * 获取气运描述 (供AI参考)
 */
export function getLuckDescription(luck: LuckLevel): string {
  const descriptions = {
    [LuckLevel.CURSED]: '诅咒缠身',
    [LuckLevel.UNLUCKY]: '时运不济',
    [LuckLevel.NORMAL]: '平平无奇',
    [LuckLevel.LUCKY]: '福星高照',
    [LuckLevel.BLESSED]: '鸿运当头',
    [LuckLevel.HEAVEN_DEFYING]: '逆天改命'
  };
  return descriptions[luck];
}

// 导出随机数生成器实例供其他模块使用
export { rng };
