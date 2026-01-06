import { DICE_ROLLING_RULES } from '../definitions/textFormats';

/**
 * @fileoverview CoT 核心提示词 v4.0.0
 * @version 4.0.0
 * @lastUpdated 2025-12-01
 *
 * 【更新日志】
 * - v4.0.0: 全面重构思维链，增强AI感知游戏状态能力
 *   - 新增场景感知检查（位置、时间、环境）
 *   - 新增数据同步检查清单
 *   - 优化NPC交互逻辑
 *   - 强化text与tavern_commands同步要求
 * - v3.0.0: 移除骰点系统，判定完全基于属性和境界
 * - v2.2.0: 新增NPC独立演绎逻辑，区分玩家与NPC
 */

export function getCotCorePrompt(userInput: string, enableActionOptions: boolean = false): string {
  // 提取 <行动趋向> 标签中的内容，如果存在的话
  const intentMatch = userInput.match(/<行动趋向>([\s\S]*?)<\/行动趋向>/);
  const actualIntent = intentMatch ? intentMatch[1].trim() : (userInput || '无');

  return `
# 🧭 低噪声协议（无思维链）

用户意图："${actualIntent}"

## 禁止
- 绝对禁止输出：\`<thinking>\` / 思维链 / 任何推理过程标签

## 内部自检清单（不要写出来）
叙事里写到什么，就在 \`tavern_commands\` 里同步什么：
□ 位置变化 → set \`位置\`
□ 时间流逝 → add \`时间.分钟\`
□ NPC出场 → set \`关系.NPC名.当前外貌状态\` / \`关系.NPC名.当前内心想法\`
□ NPC互动 → push \`关系.NPC名.记忆\` + add \`关系.NPC名.好感度\`
□ 受伤/恢复 → add \`属性.气血.当前\`（±）
□ 效果增减 → push \`效果\`
□ 使用灵气 → add \`属性.灵气.当前\`（负）
□ 修炼进度 → add \`属性.境界.当前进度\` + add \`背包.物品.[功法ID].修炼进度\`
□ 物品增删 → set/delete \`背包.物品.[物品ID]\`
□ 灵石变化 → add \`背包.灵石.下品/中品/上品/极品\`

## 行动选项
- 若启用：输出 \`action_options\`（3-5个）
- 若未启用：不要输出 \`action_options\`

${DICE_ROLLING_RULES}
`;
}

// 保留旧的导出以兼容现有代码
export const cotCorePrompt = getCotCorePrompt('');
