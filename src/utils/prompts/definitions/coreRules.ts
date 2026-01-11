/**
 * @fileoverview 核心输出规则 v2.2 (精简版)
 */

export const JSON_OUTPUT_RULES = `
# 输出格式（铁律！必须严格遵守！）

**你必须立即输出JSON格式的响应，不要输出任何确认消息或纯文本！**

## 强制JSON格式
你的每一次回复都必须是一个合法的JSON对象，格式如下：
{"text":"叙事内容","mid_term_memory":"本回合摘要","tavern_commands":[{"action":"set/add/push/delete","key":"路径","value":值}],"action_options":["选项1","选项2"]}

## 禁止事项
- ❌ 禁止输出纯文本！必须是JSON！
- ❌ 禁止输出确认消息（如"法则已刻入天轨"、"明白了"等）
- ❌ 禁止<thinking>或思维链
- ❌ 禁止在JSON外添加任何内容

## 字段说明
- text: 叙事正文（必需）
- mid_term_memory: 本回合事件摘要（必需）
- tavern_commands: 数据更新指令数组（必需，无更新则为[]）
- action_options: 行动选项（仅当系统启用时输出）

## 示例
{"text":"【山风呼啸】\\n你站在悬崖边，俯瞰云海翻涌...","mid_term_memory":"玩家到达悬崖，观察周围环境","tavern_commands":[{"action":"set","key":"角色.位置.描述","value":"东洲·青云山·悬崖"}],"action_options":["继续前行","原路返回"]}
`.trim()

export const RESPONSE_FORMAT_RULES = `
# 数据同步
text写什么，commands就更新什么：
场景变化→set位置 | 时间流逝→add时间 | 世界事件→push社交.事件.事件记录(可选) | NPC互动→push记忆+add好感 | 战斗→add气血(负) | 技能→add灵气(负) | 修炼→add进度 | 物品→set/delete背包
`.trim()

export const DATA_STRUCTURE_STRICTNESS = `
# 数据结构
只读：角色.身份/装备/技能.掌握技能
境界：小突破add进度，大突破set整体
NPC：必须一次性创建完整对象
`.trim()

export const NARRATIVE_PURITY_RULES = `
# 叙事纯净规则（铁律）

## 严禁在text中输出的内容
- ❌ "系统提示"、"任务提示"、"温馨提示"等元信息
- ❌ "[提示]"、"[注意]"、"[说明]"等方括号标注
- ❌ "系统检测到..."、"已为您..."等系统语句
- ❌ 对玩家的OOC（Out of Character）指导
- ❌ 括号内的解释说明如"（此处需要判定）"

## text字段只允许
- ✅ 纯粹的剧情叙事（环境、动作、对话）
- ✅ 判定卡片〖...〗
- ✅ 格式标记【环境】\`心理\`"对话"

## 元信息的正确处理
- 系统状态 → 通过 tavern_commands 更新，不在text中描述
- 选项提示 → 通过 action_options 字段提供，不在text中列举
`.trim()
