/**
 * 骰子系统 - 提供真随机的骰点功能
 */

/**
 * 投掷一个 d20 骰子（1-20）
 * @returns 1-20 之间的随机整数
 */
export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * 投掷任意面数的骰子
 * @param sides 骰子面数
 * @returns 1-sides 之间的随机整数
 */
export function rollDice(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * 投掷多个骰子并求和
 * @param count 骰子数量
 * @param sides 每个骰子的面数
 * @returns 所有骰子点数之和
 */
export function rollMultipleDice(count: number, sides: number): number {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += rollDice(sides);
  }
  return total;
}

/**
 * 判定骰点结果类型
 * @param dice 骰点值（1-20）
 * @returns 结果类型
 */
export function getDiceResultType(dice: number): 'critical-failure' | 'failure' | 'success' | 'great-success' | 'perfect' {
  if (dice <= 2) return 'critical-failure'; // 大失败
  if (dice >= 19) return 'perfect'; // 完美
  if (dice >= 16) return 'great-success'; // 大成功
  if (dice >= 8) return 'success'; // 成功
  return 'failure'; // 失败
}

/**
 * 计算判定最终值
 * @param dice 骰点（1-20）
 * @param attribute 属性值
 * @param bonus 加成
 * @returns 最终值
 */
export function calculateFinalValue(dice: number, attribute: number, bonus: number = 0): number {
  return dice + attribute + bonus;
}

/**
 * 执行完整判定
 * @param attribute 属性值
 * @param bonus 加成
 * @param difficulty 难度
 * @returns 判定结果
 */
export interface JudgementResult {
  dice: number;
  attribute: number;
  bonus: number;
  finalValue: number;
  difficulty: number;
  success: boolean;
  resultType: 'critical-failure' | 'failure' | 'success' | 'great-success' | 'perfect';
}

export function performJudgement(
  attribute: number,
  bonus: number = 0,
  difficulty: number = 10
): JudgementResult {
  const dice = rollD20();
  const finalValue = calculateFinalValue(dice, attribute, bonus);
  const resultType = getDiceResultType(dice);

  // 大失败必定失败，完美必定成功
  let success: boolean;
  if (resultType === 'critical-failure') {
    success = false;
  } else if (resultType === 'perfect') {
    success = true;
  } else {
    success = finalValue >= difficulty;
  }

  return {
    dice,
    attribute,
    bonus,
    finalValue,
    difficulty,
    success,
    resultType
  };
}
