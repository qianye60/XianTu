/**
 * @fileoverview 核心输出规则（AI友好格式）
 */

export const JSON_OUTPUT_RULES = `
[输出格式](MANDATORY)
只输出单个JSON对象,禁止确认消息,禁止纯文本
格式:{"text":"叙事","mid_term_memory":"摘要","tavern_commands":[...],"action_options":["选项1","选项2"]}
JSON有效性(CRITICAL):禁止代码围栏/前后缀文本;字符串内换行用\\n;正确转义"和\\;禁止尾逗号/注释
禁止:纯文本响应/"明白了"/"法则已刻入"/<thinking>标签/JSON外任何内容
`.trim()

export const RESPONSE_FORMAT_RULES = `
[数据同步]
text写什么,tavern_commands就必须更新什么(否则删掉对应text内容)
映射:场景变化→set角色.位置;时间流逝→add元数据.时间.*;世界事件→push社交.事件.事件记录;NPC互动→push记忆+add好感度;货币变化→add角色.背包.货币.{币种ID}.数量;战斗受伤→add角色.属性.气血.当前(负数);技能消耗→add灵气/神识/气血.当前(负数);修炼进度→add境界.当前进度;物品变更→set/delete角色.背包.物品.*
约束:每类变化至少一条指令;新增NPC/信息必须完整落地到tavern_commands
`.trim()

export const DATA_STRUCTURE_STRICTNESS = `
[数据结构]
只读:角色.身份/装备/技能.掌握技能;境界:小突破add进度,大突破set整体;NPC:必须一次性创建完整对象,字段缺失必须补齐合理默认值,禁止残缺对象
`.trim()

export const NARRATIVE_PURITY_RULES = `
[叙事纯净](铁律)
核心:text字段=纯镜头记录,只写主角眼前可见/可闻/可感知的客观画面,不读心/不解说/不输出规则
允许标记:环境描写【】;NPC内心\`...\`(成对);对话"";系统判定〖〗;客观叙述(不含心理/结论)
画面感最低标准:每回合至少1段【环境】+2个可见动作细节+1次互动("对话"或NPC内心),结尾留可行动钩子
字数要求(CRITICAL):text正文不少于1500字(建议1500-2500),不足时用更多环境/动作/对话补足,禁止水字
符号归属(CRITICAL):【】只用于环境;〖〗只用于系统判定/状态变化;错误:【系统提示】;正确:〖系统提示〗
严禁格式:任何Markdown(尤其*_/#>/三反引号);未成对反引号
严禁内容:系统/元信息/规则解释/推理过程;数值/机制暴露(除〖〗内必要判定);主角心理与决策(禁"你觉得/你决定/你害怕")
`.trim()
