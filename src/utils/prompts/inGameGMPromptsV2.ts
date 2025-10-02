/**
 * 游戏正文AI生成提示词 - 核心剧情推进系统
 * 用于处理玩家在游戏中的行动和AI回复
 */

import { DATA_STRUCTURE_DEFINITIONS } from './dataStructureDefinitions';

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
  '',
  '【当前游戏状态】你必须严格基于以下"当前游戏状态"来生成响应。这是唯一的真实数据源。',
  'INPUT_PLACEHOLDER',
  '',
  '【输出格式要求】必须严格按照以下JSON格式返回响应：',
  '```json',
  '{',
  '  "text": "⚠️ 必须1500-3000字的详细叙述内容，包含细致的环境描写、人物对话、心理活动、动作描述等",',
  '  "mid_term_memory": "【必须】重要事件50-100字总结，不能为空，用于中期记忆存储",',
  '  "state_changes": {',
  '    "时间推进_分钟": 必填数字,',
  '    "NPC交互": ["如果本回合与NPC互动，列出NPC名字"],',
  '    "需要修改的字段": [',
  '      {',
  '        "路径": "玩家角色状态.修炼.当前境界",',
  '        "当前值": "凡人",',
  '        "目标值": "练气一层",',
  '        "变化原因": "使用混沌道石初次修炼《混沌无极经》，成功引气入体，踏入练气期。",',
  '        "操作类型": "set",',
  '        "操作值": "练气一层"',
  '      },',
  '      {',
  '        "路径": "玩家角色状态.气血.上限",',
  '        "当前值": 100,',
  '        "目标值": 150,',
  '        "变化原因": "突破境界，肉身得到淬炼，气血上限提升。"',
  '        "操作类型": "set",',
  '        "操作值": 150',
  '      },',
  '      {',
  '        "路径": "玩家角色状态.气血.当前",',
  '        "当前值": 100,',
  '        "目标值": 150,',
  '        "变化原因": "突破后，气血完全恢复并达到新的上限。"',
  '        "操作类型": "set",',
  '        "操作值": 150',
  '      }',
  '    ]',
  '  },',
  '  "tavern_commands": [',
  '    {"action": "add", "scope": "chat", "key": "character.saveData.游戏时间.总分钟数", "value": 180},',
  '    {"action": "set", "scope": "chat", "key": "character.saveData.玩家角色状态.修炼.当前境界", "value": "练气一层"},',
  '    {"action": "set", "scope": "chat", "key": "character.saveData.玩家角色状态.修炼.当前境界等级", "value": 1},',
  '    {"action": "set", "scope": "chat", "key": "character.saveData.玩家角色状态.气血.上限", "value": 150},',
  '    {"action": "set", "scope": "chat", "key": "character.saveData.玩家角色状态.气血.当前", "value": 150},',
  '    {"action": "delete", "scope": "chat", "key": "character.saveData.背包.物品.混沌道石"}',
  '  ]',
  '}',
  '```',
  '',
  '⚠️ **state_changes是分析层，tavern_commands是执行层**:',
  '- state_changes: 先分析需要改什么（时间、气血、物品、**NPC记忆**等），当前值是多少，要改成什么，为什么改',
  '- tavern_commands: 基于state_changes生成精确的修改指令',
  '- 时间推进**必须**同时出现在state_changes和tavern_commands中',
  '- **NPC互动必须更新NPC记忆**：只要与NPC有对话/战斗/协作，必须push新记忆到该NPC的人物记忆数组',
  '- state_changes帮助你理清思路，避免遗漏重要变更（特别是时间和NPC记忆）',
  '',
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
