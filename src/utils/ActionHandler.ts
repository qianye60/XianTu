import type { LocalCharacterWithGameData } from "@/data/localData";

/**
 * 定义一个动作处理函数返回的结果结构
 */
export interface ActionResult {
  updatedCharacter: LocalCharacterWithGameData;
  feedbackMessage: string;
}

/**
 * 未来可以添加更多动作处理函数
 * export function handleExplore(...) { ... }
 * export function handleCombat(...) { ... }
 */