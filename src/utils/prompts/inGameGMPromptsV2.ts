/**
 * 游戏正文AI生成提示词 - 核心剧情推进系统
 * 用于处理玩家在游戏中的行动和AI回复
 */

import { UNIFIED_PROMPT_BUILDER } from './unifiedPromptSystem';

// 直接使用导入的通用组件，不再重新声明

// === 4. 玩家操作处理优先级 ===
const PLAYER_ACTION_PRIORITY = [
  '【玩家操作处理优先级】',
  '⚠️ **执行顺序至关重要**：当收到包含【玩家最近操作】的输入时，必须按以下顺序处理：',
  '',
  '## ⚠️ 最高优先级：先创建后修改原则',
  '**所有数据操作都必须遵循"先存在后修改"原则**：',
  '- 修改NPC好感度前，该NPC必须已在人物关系中存在',
  '- **添加物品前，必须先用set创建完整Item对象，然后才能修改其属性**', 
  '- **物品操作示例**：',
  '  - ❌错误：直接add物品数量 → 失败（物品不存在）',
  '  - ✅正确：先set完整Item对象，包含所有必需字段',
  '  - Item对象必须包含：{物品ID, 名称, 类型, 品质:{quality,grade}, 数量, 已装备, 描述, 可叠加}',
  '- 修改大道进度前，该大道必须已解锁并存在',
  '- 不能对不存在的数据路径使用add/set操作',
  '',
  '## 🎯 第一优先级：处理玩家具体操作',
  '- **优先响应**：首先基于【玩家最近操作】中列出的具体动作生成回应',
  '- **动作反馈**：必须在叙事中明确体现每个操作的结果和效果',
  '- **详尽描述**：text字段必须1500-3000字，包含丰富的环境描写、人物对话、心理活动',
  '- **数据更新**：根据操作类型更新对应的游戏数据（修为、装备、状态等）',
  '- **即时反馈**：玩家的每个操作都应该得到直接的叙事反馈',
  '',
  '## 📝 第二优先级：回应用户文本输入',
  '- **文本处理**：在处理完具体操作后，再基于用户输入的文本内容继续叙事',
  '- **内容融合**：将用户文本意图与操作结果自然融合到一个连贯的回应中',
  '- **逻辑连贯**：确保操作效果和文本回应在逻辑上连贯一致',
  '',
  '## ✅ 处理示例：',
  '```',
  '用户操作：感悟了《五行调和术》大道',
  '用户文本：我要去市集看看',
  '正确回应：先描述感悟大道的过程和收获，然后自然过渡到前往市集的情节',
  '```',
  '',
  '❌ **严禁**：忽略具体操作，直接回应文本内容',
  '✅ **正确**：先处理操作，再融入文本意图',
].join('\n')

// === 精简版天道判定系统 ===
const JUDGMENT_SYSTEM = [
  '【🌟 天道演算系统 v6.0】',
  '## 🎲 强制判定：战斗/修炼/炼丹/突破/感悟等都必须判定',
  '## 📊 输出格式：〖判定类型:结果,骰点:XX,基础值:XX,加成:XX,最终值:XX〗',
  '## 🎯 天赋灵根加成：',
  '- 神品灵根+60%，极品+40~50%，上品+25~35%，中品+15~20%，下品+5~10%',
  '- 攻击类天赋+20~40%，修炼类+25~50%，特殊天赋+30~60%',
  '## ⚠️ 强制规则：必须判定，必须显示过程，必须应用天赋灵根加成',
].join('\n')

// 使用通用物品系统规则

// [已废弃] NPC_SYSTEM 和 DAO_SYSTEM_RULES 已被迁移到 commonPromptRules.ts 并通过
// COMMON_NPC_RULES 和 COMMON_DAO_RULES 导入使用，旧的常量定义在此移除以保持代码整洁。

// === 精简版AI数据更新规则 ===
const UPDATE_RULES = [
  '【AI数据更新规则】',
  '⚠️ **重要提醒**：每次回复都必须分析当前游戏状态，主动更新相关数据！',
  '',
  '### 🌟 **天赋灵根强制应用**',
  '- **天赋影响**：修炼类天赋+25~50%效率，攻击类+20~40%，特殊天赋+30~60%',
  '- **灵根加成**：神品+60%，极品+40~50%，上品+25~35%，中品+15~20%，下品+5~10%',
  '- **必须体现差异**：在text中详细描述天赋灵根带来的优势或劣势',
  '',
  '### 🎯 **用户数据强制关注**',
  '- **基础信息检查**：天资/天赋/灵根/先天六司/境界/气血/灵气/状态效果/装备',
  '- **实时状态关注**：根据当前状态调整叙事和判定结果',
  '',
  '### 🔄 **核心更新项目**',
  '1. **时间推进**：根据活动类型推进(修炼/战斗/移动等)，简单对话不推进',
  '2. **生命状态**：气血/灵气变化，死亡判定',
  '3. **位置更新**：移动时更新位置描述(大洲名·区域名·地点名或大洲名·宗门名)',
  '4. **修为进度**：修炼获得修为，突破境界',
  '5. **NPC记忆**：重要互动更新记忆和好感度',
  '6. **物品状态**：获得/消耗物品，装备状态',
  '7. **状态效果**：新增/移除buff/debuff',
  '',
  '### 📋 **每次回复检查清单**',
  '- ✅ **判定检查**：是否需要天道判定？',
  '- ✅ **天赋灵根**：是否应用了相应加成？',
  '- ✅ **数据关注**：是否查看了角色基础信息？',
  '- ✅ **状态更新**：时间/位置/修为/物品/NPC是否需要更新？',
  '- ✅ **判定结果**：是否正确显示了判定过程？',
].join('\n')
const LOCATION_SYSTEM = [
  '【位置系统】',
  '- 标准格式：\"大洲名·区域名·地点名\"(如\"中土大陆·青云宗\"或\"天星大陆·天青州·青石镇\")',
  '- 移动时只更新位置.描述，不生成坐标',
].join('\n')

// 剧情推进提示词（严格：返回唯一 JSON，text + mid_term_memory + tavern_commands 对象）
export const IN_GAME_MESSAGE_PROMPT = [
  '【剧情推进】根据当前游戏状态推进一段叙事，并返回唯一 JSON。',
  '',
  UNIFIED_PROMPT_BUILDER.buildGamePrompt('gameplay'),
  '',
  PLAYER_ACTION_PRIORITY,
  '',
  JUDGMENT_SYSTEM,
  '',
  LOCATION_SYSTEM,
  '',
  UPDATE_RULES,
  '',
  '【当前游戏状态】你必须严格基于以下"当前游戏状态"来生成响应。这是唯一的真实数据源。',
  'INPUT_PLACEHOLDER',
  '',
  'tavern_commands 用法(数组): 每个元素为 {action: "set/add/push/pull/delete", scope: "chat", key: "character.saveData.路径", value: 值}；路径以 character.saveData. 开头，点号分隔。',
  '',
  '路径变量参考（必须遵循）:',
  '- 角色基础信息: 名字/性别/年龄/出生/灵根/天赋/天资/先天六司{根骨/灵性/悟性/气运/魅力/心性}/世界；',
  '- 玩家角色状态: 境界(对象)/位置.{描述}/气血|灵气|神识|寿命|修为(各为{当前,最大})/状态效果[]/身份/当前活动/心情；',
  '- 背包: 灵石.{下品/中品/上品/极品}/物品: 对象，每个物品ID作为key，值为完整Item对象；',
  '- 装备栏: 装备1..装备6={物品ID:"实际ID",名称:"物品名称"}|null；修炼功法: 功法/熟练度/已解锁技能/修炼时间/突破次数/正在修炼(boolean)/修炼进度(0-100)；',
  '- 记忆: 短期记忆[]/中期记忆[]/长期记忆[]（禁止操作，自动生成）；',
  '- 人物关系: 人物关系.<姓名>=NpcProfile（仅NPC交互时操作）；',
  '',
  '### 🏃‍♂️ NPC管理规范（使用平衡数据结构）',
  '- 包含：角色基础信息(天资/灵根/天赋)，最后出现位置，背包，性格特征，知名技能',
  '- 禁止：过度复杂的实时数值状态，装备栏管理，修炼进度详情',
  '',
  '【输出格式要求】必须严格按照以下JSON格式返回响应：',
  '```json',
  '{',
  '  "text": "⚠️ 必须1500-3000字的详细叙述内容，包含细致的环境描写、人物对话、心理活动、动作描述等",',
  '  "mid_term_memory": "可选：重要事件50-100字总结",',
  '  "tavern_commands": [',
  '    {"action": "set/add/push/pull/delete", "scope": "chat", "key": "character.saveData.路径", "value": "值"}',
  '  ]',
  '}',
  '```',
  '',
].join('\n')

export function getRandomizedInGamePrompt(): string {
  const core = UNIFIED_PROMPT_BUILDER.buildGamePrompt('gameplay')
  const lite = [
    '【剧情推进】根据当前游戏状态推进叙事，并返回唯一 JSON。',
    core,
    '# 重要补充（二次声明）',
    '- 输出唯一 JSON：text(1500-3000字详细叙述), mid_term_memory, tavern_commands',
    '- 所有变更必须通过 tavern_commands 实现',
    '- 每次推进必须更新时间；位置仅写 位置.描述',
    '- 严格遵守 character.saveData.系统.规则 与各对象的 _AI说明/_AI重要提醒',
    '- 禁止修改 记忆（短/中/长期）字段；禁止写入坐标',
    '',
    '【tavern_commands 规范（必须）】',
    '- tavern_commands 是数组；每个元素为：',
    '  {"action": "set|add|push|pull|delete", "scope": "chat", "key": "character.saveData.路径", "value": 值}',
    '- 只允许 action：set/add/push/pull/delete；严禁使用 update_time/update_character 等自定义命令名',
    '- key 必须以 character.saveData. 开头；scope 固定为 chat',
    '- 时间推进：优先 add 到 分钟/小时 字段（必要时自行进位）',
    '示例：',
    '```json',
    '[',
    '  {"action":"add","scope":"chat","key":"character.saveData.游戏时间.分钟","value":5},',
    '  {"action":"set","scope":"chat","key":"character.saveData.背包.物品.混沌开天诀","value":{"物品ID":"混沌开天诀","名称":"混沌开天诀","类型":"功法","品质":{"quality":"神","grade":10},"数量":1,"已装备":false,"描述":"神品功法，乃是上古混沌魔神所创","可叠加":false}},',
    '  {"action":"set","scope":"chat","key":"character.saveData.背包.物品.九转淬体丹","value":{"物品ID":"九转淬体丹","名称":"九转淬体丹","类型":"其他","品质":{"quality":"天","grade":9},"数量":10,"已装备":false,"描述":"淬体圣药","可叠加":true}},',
    '  {"action":"set","scope":"chat","key":"character.saveData.背包.物品.须弥戒","value":{"物品ID":"须弥戒","名称":"须弥戒","类型":"装备","品质":{"quality":"仙","grade":8},"数量":1,"已装备":false,"描述":"空间戒指","可叠加":false}},',
    '  {"action":"add","scope":"chat","key":"character.saveData.背包.灵石.极品","value":1000000}',
    ']',
    '```',
    '',
    '【当前游戏状态】（JSON）',
    'INPUT_PLACEHOLDER',
    '',
    '【输出格式】必须严格如下（text必须1500-3000字）：',
    '```json',
    '{ "text": "1500-3000字详细叙述，环境描写+对话+心理+动作", "mid_term_memory": "", "tavern_commands": [] }',
    '```'
  ].join('\n')
  return lite
}

// 调试函数：检查提示词完整性
export function debugPromptInfo(): void {
  const fullPrompt = IN_GAME_MESSAGE_PROMPT
  console.log('[提示词调试] 提示词类型:', typeof fullPrompt)
  console.log('[提示词调试] 提示词长度:', fullPrompt.length)
  console.log('[提示词调试] 开头200字符:', fullPrompt.substring(0, 200))
  console.log('[提示词调试] 结尾200字符:', fullPrompt.substring(fullPrompt.length - 200))
  console.log('[提示词调试] 是否包含INPUT_PLACEHOLDER:', fullPrompt.includes('INPUT_PLACEHOLDER'))
  console.log('[提示词调试] 是否包含格式化标记:', fullPrompt.includes('【格式化标记规范】'))
  console.log('[提示词调试] 是否包含物品系统:', fullPrompt.includes('【物品系统规范】'))
  console.log('[提示词调试] 完整内容:', fullPrompt)
}
