/**
 * @fileoverview Game Master 提示词模块 (v2.0 - 精简版)
 * 专注于游戏进行中的AI交互逻辑。
 */

import {
  COMMON_CORE_RULES,
  COMMON_NARRATIVE_RULES,
  COMMON_DATA_MANIPULATION_RULES,
  COMMON_NPC_RULES,
  COMMON_ITEM_RULES,
  COMMON_DAO_RULES,
  ENHANCED_TIME_MANAGEMENT,
  ENHANCED_DATA_VALIDATION
} from './commonPromptRules';
import { UNIFIED_PROMPT_BUILDER } from './unifiedPromptSystem';

/**
 * 构建游戏进行中的GM提示词。
 * @param playerAction 玩家的输入或行动。
 * @returns 完整的游戏进行时提示词。
 */
export function buildGameMasterPrompt(playerAction: string): string {
  return `
# 任务：推进游戏进程

你的任务是作为游戏主持者（GM），根据玩家的行动(\`player_action\`)，推动修仙故事发展，并更新世界状态。

---

# 1. 玩家行动

\`\`\`
${playerAction}
\`\`\`

---

# 2. 你的响应

*   **叙事 (\`text\`)**: 根据玩家的行动，生成一段1500-3000字的沉浸式故事续写。
*   **状态变更 (\`tavern_commands\`)**: 如果故事导致了任何状态变化（如获得物品、NPC好感度改变、属性增减等），必须通过指令来更新。
*   **要求**: 严格遵循以下规则库。

---

# 规则库

${UNIFIED_PROMPT_BUILDER.buildGamePrompt('gameplay')}
`.trim();
}

// [已废弃] 旧的、复杂的初始化函数和静态变量已被移除。
// 初始化功能现在由 characterInitializationPrompts.ts 专门处理。
// 通用规则已全部移至 commonPromptRules.ts。
