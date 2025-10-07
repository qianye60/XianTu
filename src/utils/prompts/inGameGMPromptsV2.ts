/**
 * 游戏正文AI生成提示词 - 核心剧情推进系统
 * 用于处理玩家在游戏中的行动和AI回复
 *
 * 🔥 Token优化版本：使用精简上下文 + 简化路径��式
 */

import { DATA_STRUCTURE_DEFINITIONS } from './dataStructureDefinitions';
import { generateJudgmentPrompt } from '../judgement/heavenlyRules';

// 剧情推进提示词
export const buildInGameMessagePrompt = (): string => {
  // ⚠️ 重要：短期记忆通过 helper.generate() 的 overrides.chat_history.prompts 注入
  // 作为 assistant 角色的历史输出，这样AI可以"看到"自己之前生成的内容
  // 本函数只生成系统提示词（规则、数据结构等）

  const storyContext = `
# 故事延续与防重复机制

## 提示词结构说明
系统使用**结构化提示词**进行游戏推演：
1. **系统提示词（你正在阅读的内容）**：游戏规则、数据结构、判定系统等背景知识
2. **上一幕剧情（assistant角色）**：你之前生成的所有短期记忆内容，作为你的"完整记忆"
3. **玩家行动（user角色）**：玩家的当前输入

## 防重复输出的核心法则
⚠️ **绝对禁止**：你不能重复输出上一幕剧情的内容！
- 上一幕剧情（所有短期记忆）已经作为assistant角色注入，代表"你之前说过的所有话"
- 这些记忆已经用分隔线（---）分开，按时间顺序排列
- 你的任务是**承接**最后一条记忆，推进**全新的**剧情发展
- 如果玩家没有新行动，描述环境变化、NPC反应、时间流逝等新内容
- **绝对不要**复述、总结、重新描述任何已经在记忆中的事件

## 正确的剧情推进方式
✅ 阅读所有短期记忆，了解完整的剧情脉络
✅ 从最后一条记忆的结果出发，描述接下来发生的事
✅ 根据玩家行动，推进故事发展
✅ 添加新的细节、新的NPC反应、新的环境描写
❌ 重复短期记忆中的任何内容
❌ 总结之前发生的事情
❌ 复述玩家的行动��之前的剧情
`;

  return [
    '【剧情推进】根据当前游戏状态推进一段叙事，并返回唯一 JSON。',
    storyContext,
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
    '4. **时间推进命令**: 使用 `{"action":"add","key":"游戏时间.分钟","value":推进的分钟数}` 来推进时间',
    '   - ⚠️ **重要**: value 是本次推进的时间量，不是累计总时间',
    '   - ✅ 正确示例: `{"action":"add","key":"游戏时间.分钟","value":30}` 表示推进30分钟',
    '   - ❌ 错误示例: 不要传递累计的总分钟数（如111445）',
    '   - 换算参考: 1小时=60, 1天=1440, 1月=43200, 1年=518400',
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
    '   - **新人物登场**: 故事中出现新的重要人物时，**必须**为其创建完整数据，包括为其设定符合背景的初始背包（含1-3件物品和少量灵石）。',
    '3. **无变更则不生成**: 如果剧情确实没有导致任何状态变更，则`state_changes`和`tavern_commands`可以为空数组。',
  ].join('\n');
};

export function getRandomizedInGamePrompt(): string {
  return buildInGameMessagePrompt();
}

// 调试函数：检查提示词完整性和Token分析
export function debugPromptInfo(): void {
  const fullPrompt = buildInGameMessagePrompt();
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
