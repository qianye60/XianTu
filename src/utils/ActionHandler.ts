import type { LocalCharacterWithGameData } from "@/data/localData";

/**
 * 定义一个动作处理函数返回的结果结构
 */
export interface ActionResult {
  updatedCharacter: LocalCharacterWithGameData;
  feedbackMessage: string;
}

/**
 * 处理打坐修行的逻辑
 * @param character 当前角色数据
 * @returns {ActionResult} 包含更新后角色和反馈消息的对象
 */
export function handleMeditate(character: LocalCharacterWithGameData): ActionResult {
  // --- 天机演算：计算收益 ---
  // 简化的收益计算：基础值为5，受境界和灵根影响（未来扩展）
  const manaGain = Math.floor(5 + character.spirituality / 2);
  const spiritGain = Math.floor(2 + character.comprehension / 3);

  const updatedCharacter = { ...character };

  // 更新灵力，但不超过上限
  updatedCharacter.mana = Math.min(updatedCharacter.mana_max, updatedCharacter.mana + manaGain);
  // 更新神识，但不超过上限
  updatedCharacter.spirit = Math.min(updatedCharacter.spirit_max, updatedCharacter.spirit + spiritGain);

  // --- 大道回响：生成反馈文本 ---
  let feedbackMessage = `你盘膝而坐，运转周天，丝丝灵气汇入丹田。`;
  
  if (manaGain > 0) {
    feedbackMessage += `\n灵力增加了 ${manaGain} 点。`;
  }
  if (spiritGain > 0) {
    feedbackMessage += `\n神识增加了 ${spiritGain} 点。`;
  }
  if (updatedCharacter.mana === updatedCharacter.mana_max && updatedCharacter.spirit === updatedCharacter.spirit_max) {
    feedbackMessage += `\n你的灵力和神识均已达到当前境界的巅峰。`;
  }

  return {
    updatedCharacter,
    feedbackMessage,
  };
}

/**
 * 未来可以添加更多动作处理函数
 * export function handleExplore(...) { ... }
 * export function handleCombat(...) { ... }
 */