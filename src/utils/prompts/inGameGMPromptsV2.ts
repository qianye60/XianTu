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
  '【当前游戏状态】你必须严格基于以下"当前游戏状态"来生成响应。这是唯一的真实数据源。',
  'INPUT_PLACEHOLDER',
  '',
  '【输出格式要求】必须严格按照以下JSON格式返回响应：',
  '```json',
  '{',
  '  "text": "⚠️ 必须1500-3000字的详细叙述内容，包含细致的环境描写、人物对话、心理活动、动作描述等",',
  '  "mid_term_memory": "可选：重要事件50-100字总结",',
  '  "state_changes": {',
  '    "时间推进_分钟": 必填数字,',
  '    "NPC交互": ["如果本回合与NPC互动，列出NPC名字"],',
  '    "需要修改的字段": [',
  '      {',
  '        "路径": "玩家角色状态.气血.当前",',
  '        "当前值": 100,',
  '        "目标值": 80,',
  '        "变化原因": "战斗受伤",',
  '        "操作类型": "add",',
  '        "操作值": -20',
  '      },',
  '      {',
  '        "路径": "人物关系.李师兄.人物记忆",',
  '        "操作类型": "push",',
  '        "操作值": {"时间": "今日", "事件": "一起切磋武艺"},',
  '        "变化原因": "与NPC互动必须更新记忆"',
  '      }',
  '    ]',
  '  },',
  '  "tavern_commands": [',
  '    {"action": "add", "scope": "chat", "key": "character.saveData.游戏时间.总分钟数", "value": 时间推进的分钟数},',
  '    {"action": "push", "scope": "chat", "key": "character.saveData.人物关系.李师兄.人物记忆", "value": {"时间": "今日", "事件": "一起切磋武艺"}},',
  '    {"action": "add", "scope": "chat", "key": "character.saveData.人物关系.李师兄.人物好感度", "value": 5},',
  '    注意：如需添加物品，使用 {"action": "set", "scope": "chat", "key": "character.saveData.背包.物品.<物品ID>", "value": {完整物品对象}},',
  '    {"action": "set/add/push/pull/delete", "scope": "chat", "key": "character.saveData.路径", "value": "值"}',
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
