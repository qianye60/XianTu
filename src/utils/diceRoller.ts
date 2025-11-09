/**
 * 骰子系统 - 提供真随机的骰点功能
 */

/**
 * 投掷一个 d20 骰子（1-20）
 * 特殊规则：骰到1时有50%概率重投
 * @returns 1-20 之间的随机整数
 */
export function rollD20(): number {
  const result = Math.floor(Math.random() * 20) + 1;
  // 骰到1时，50%概率重投
  if (result === 1 && Math.random() < 0.5) {
    return Math.floor(Math.random() * 20) + 1;
  }
  return result;
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
 * 计算判定最终值
 * @param dice 骰点（1-20）
 * @param attribute 属性值
 * @param bonus 加成
 * @returns 最终值
 */
export function calculateFinalValue(dice: number, attribute: number, bonus: number = 0): number {
  return dice + attribute + bonus;
}


