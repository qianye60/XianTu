/**
 * 游戏正文AI生成提示词 - 核心剧情推进系统
 * 用于处理玩家在游戏中的行动和AI回复
 *
 * 🔥 Token优化版本：使用精简上下文 + 简化路径格式
 */

import { DATA_STRUCTURE_DEFINITIONS } from './dataStructureDefinitions';
import { generateJudgmentPrompt } from '../judgement/heavenlyRules';

// 剧情推进提示词
export const IN_GAME_MESSAGE_PROMPT = [
  '【剧情推进】根据当前游戏状态推进一段叙事，并返回唯一 JSON。',
  '',
  '# 时间推进规则（极其重要）',
  '',
  '⚠️ **每次剧情推进必须让时间流逝！**',
  '',
  '1. **强制时间流逝**: 除非玩家明确说"不做任何事"、"原地不动"，否则任何行动都必须推进时间',
  '2. **最小时间单位**: 每次至少推进1分钟，哪怕只是简单对话',
  '3. **时间推进参考**:',
  '   - 简单对话: 1-5分钟',
  '   - 战斗: 5-30分钟',
  '   - 修炼: 30分钟-数小时',
  '   - 炼丹/炼器: 数小时-数天',
  '   - 赶路: 数小时-数天',
  '   - 闭关: 数天-数月',
  '',
  '4. **时间格式**: 时间推进量用分钟数表示（例如：7200表示5天）',
  '',
  '',
  DATA_STRUCTURE_DEFINITIONS,
  '',
  generateJudgmentPrompt(),
  '',
  '# 状态变更识别规则 (极其重要)',
  '',
  '⚠️ **你不仅是叙事者，更是游戏状态的维护者。**',
  '1. **主动识别**: 你必须主动从【玩家输入】和【你生成的剧情】中识别出任何导致角色或世界状态变化的关键事件。',
  '2. **关键事件示例**: 如果发生以下事件，**必须**生成对应的`state_changes`和`tavern_commands`：',
  '   - **修炼/突破**: 角色境界提升、属性增长、灵力/气血变化。',
  '   - **学习/领悟**: 角色学会新功法、技能、神通。',
  '   - **获得/失去物品**: 角色背包中增加或减少丹药、法宝、材料等。',
  '   - **战斗/受伤**: 角色或NPC的气血、灵力、状态发生变化。',
  '   - **情感/关系变化**: 角色与NPC的好感度、关系状态改变。',
  '3. **无变更则不生成**: 如果剧情确实没有导致任何状态变更，则`state_changes`和`tavern_commands`可以为空数组。',
].join('\n')

export function getRandomizedInGamePrompt(): string {
  return IN_GAME_MESSAGE_PROMPT;
}

// 调试函数：检查提示词完整性和Token分析
export function debugPromptInfo(): void {
  const fullPrompt = IN_GAME_MESSAGE_PROMPT
  console.log('[提示词调试] 提示词类型:', typeof fullPrompt)
  console.log('[提示词调试] 提示词长度:', fullPrompt.length)
  console.log('[提示词调试] 开头200字符:', fullPrompt.substring(0, 200))
  console.log('[提示词调试] 结尾200字符:', fullPrompt.substring(fullPrompt.length - 200))
  console.log('[提示词调试] 是否包含INPUT_PLACEHOLDER:', fullPrompt.includes('INPUT_PLACEHOLDER'))

  // 简单的token估算
  const chineseChars = (fullPrompt.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishChars = fullPrompt.length - chineseChars;
  const estimatedTokens = Math.ceil(chineseChars * 1.5 + englishChars / 4);

  console.log('\n=== 简单TOKEN分析 ===');
  console.log(`[Token估算] 中文字符: ${chineseChars}`);
  console.log(`[Token估算] 英文字符: ${englishChars}`);
  console.log(`[Token估算] 预估Token: ${estimatedTokens}`);
  console.log(`[Token估算] 优化状态: ${estimatedTokens < 4000 ? '✅ 优秀' : estimatedTokens < 6000 ? '⚡ 良好' : '⚠️ 需优化'}`);
}
