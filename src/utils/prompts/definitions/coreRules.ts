/**
 * @fileoverview 核心输出规则 v2.2 (精简版)
 */

export const JSON_OUTPUT_RULES = `
# 输出格式
禁止：<thinking>/思维链
标准输出（非分步）：
{"text":"叙事","mid_term_memory":"摘要","tavern_commands":[{action,key,value}],"action_options":["选项"]}
JSON必须合法，action_options仅当系统启用时输出
`.trim()

export const RESPONSE_FORMAT_RULES = `
# 数据同步
text写什么，commands就更新什么：
场景变化→set位置 | 时间流逝→add时间 | NPC互动→push记忆+add好感 | 战斗→add气血(负) | 技能→add灵气(负) | 修炼→add进度 | 物品→set/delete背包
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
- ❌ "当前任务："、"任务目标："等任务信息
- ❌ "系统检测到..."、"已为您..."等系统语句
- ❌ 对玩家的OOC（Out of Character）指导
- ❌ 括号内的解释说明如"（此处需要判定）"

## text字段只允许
- ✅ 纯粹的剧情叙事（环境、动作、对话）
- ✅ 判定卡片〖...〗
- ✅ 格式标记【环境】\`心理\`"对话"

## 元信息的正确处理
- 任务变化 → 通过 tavern_commands 更新，不在text中描述
- 系统状态 → 通过 tavern_commands 更新，不在text中描述
- 选项提示 → 通过 action_options 字段提供，不在text中列举
`.trim()
