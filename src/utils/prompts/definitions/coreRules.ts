/**
 * @fileoverview 核心输出规则 v2.2 (精简版)
 */

export const JSON_OUTPUT_RULES = `
# OUTPUT FORMAT (MANDATORY)

**Output a single JSON object only. No confirmation messages. No pure text.**

## Format
{"text":"叙事","mid_term_memory":"摘要","tavern_commands":[...],"action_options":["选项1","选项2"]}

## JSON VALIDITY (CRITICAL)
- No code fences, no prefix/suffix text
- Strings MUST be valid JSON:
  - Use "\\n" for newlines inside "text"/"mid_term_memory" (do NOT put raw line breaks inside quotes)
  - Escape " and \\ correctly
- No trailing commas, no comments

## FORBIDDEN
- Pure text responses
- Confirmation like "明白了"/"法则已刻入"
- <thinking> tags
- Anything outside JSON
`.trim()

export const RESPONSE_FORMAT_RULES = `
# 数据同步
text写什么，tavern_commands就必须更新什么（否则删掉对应text内容）。

## 常见映射
- 场景变化→set 角色.位置
- 时间流逝→add 元数据.时间.*
- 世界事件→push 社交.事件.事件记录（按需）
- NPC互动→push 社交.关系.[NPC名].记忆 + add 社交.关系.[NPC名].好感度
- 战斗受伤→add 角色.属性.气血.当前（负数）
- 技能消耗→add 角色.属性.灵气.当前 / 角色.属性.神识.当前 / 角色.属性.气血.当前（负数，按规则）
- 修炼进度→add 角色.属性.境界.当前进度（或对应进度字段）
- 物品变更→set/delete 角色.背包.物品.*

## 约束
- 每类变化至少一条指令，避免合并导致漏更
- 新增NPC/新增信息必须完整落地到 tavern_commands
`.trim()

export const DATA_STRUCTURE_STRICTNESS = `
# 数据结构
只读：角色.身份/装备/技能.掌握技能
境界：小突破add进度，大突破set整体
NPC：必须一次性创建完整对象；字段缺失必须补齐合理默认值，禁止残缺对象
`.trim()

export const NARRATIVE_PURITY_RULES = `
# 叙事纯净规则（铁律）

## 核心
text字段 = 纯镜头记录。只写主角眼前可见/可闻/可感知的客观画面；不读心、不解说、不输出规则。

## text中允许的内容（必须用正确标记）
- 环境描写：用【】
- NPC内心：用 \`...\`（必须成对，且仅限NPC）
- 对话：用 " "
- 系统判定/状态提示：用 〖〗
- 客观叙述：不含心理/结论/价值判断

## 画面感最低标准（每回合）
至少包含：1段【环境】+ 2个可见动作细节 + 1次互动（"对话" 或 NPC内心 \`...\`）。结尾留可行动钩子。

## 符号与归属（CRITICAL）
- 【】只用于环境/场景；〖〗只用于系统判定/状态变化
- 错误示例：【系统提示】/【好感度+10】；正确：〖系统提示：好感度变化〗
- 系统状态写入 tavern_commands；行动选项写入 action_options；text只写发生了什么

## 严禁（格式）
- 任何Markdown（尤其是 * _ 、以 # 或 > 开头的行、三反引号代码块）
- 未成对的反引号（反引号只允许成对且仅用于NPC内心）

## 严禁（内容）
- 系统/元信息：任务提示、规则解释、推理过程、后台数据
- 数值/机制暴露：成功率/伤害计算/属性明细（唯一例外：必须放在 〖...〗 内的必要判定数值）
- 主角心理与决策：禁止“你觉得/你决定/你害怕”等；主角想什么做什么由玩家决定
`.trim()
