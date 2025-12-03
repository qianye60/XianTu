/**
 * @fileoverview 核心输出规则 v2.0
 * @version 2.0.0
 * @lastUpdated 2025-12-01
 *
 * 【职责】
 * - JSON输出格式规范
 * - 响应格式要求
 * - 数据结构严格性规则
 * - AI感知游戏状态的核心约束
 *
 * 【设计原则】
 * - 最高优先级规则
 * - 技术性约束
 * - 确保系统正常运行
 * - 保证数据与叙事同步
 */

export const JSON_OUTPUT_RULES = `
# JSON输出规范

## 输出顺序（铁律）
1. 先输出 \`<thinking>...</thinking>\` 思维链
2. 再输出 \`\`\`json {...} \`\`\` 代码块

## 输出结构
\`\`\`json
{
  "text": "叙事文本(1500-2500字)",
  "mid_term_memory": "事件摘要(50-100字)",
  "tavern_commands": [{"action":"set|add|push|delete","key":"路径","value":"值"}],
  "action_options": ["选项1", "选项2", "选项3"]
}
\`\`\`

## 字段要求
- **text**: 纯小说叙事，五感描写，禁止数值
- **mid_term_memory**: 客观第三人称，仅记录已发生事实
- **tavern_commands**: 与text同步，text写了什么就更新什么
- **action_options**: 可选，3-5个选项
`.trim()

export const RESPONSE_FORMAT_RULES = `
# 数据同步铁律
**text写了什么，tavern_commands就必须更新什么！**

## 同步检查表
| 描写内容 | 必须更新 |
|---------|---------|
| 场景变化 | set 玩家角色状态.位置 {描述,x,y} |
| 时间流逝 | add 游戏时间.分钟 |
| NPC出场 | set 当前外貌状态/当前内心想法 |
| NPC互动 | push 记忆 + add 好感度 |
| 战斗受伤 | add 气血.当前(负) + push 状态效果 |
| 使用技能 | add 灵气.当前(负) |
| 修炼进度 | add 境界.当前进度 |
| 物品变化 | set/delete 背包.物品 |
| 灵石变化 | add 背包.灵石.品级 |
`.trim()

export const DATA_STRUCTURE_STRICTNESS = `
# 数据结构规则

## 只读字段（禁止修改）
装备栏、修炼功法、掌握技能、记忆、系统、角色基础信息、年龄

## 境界更新
- 小突破: add 当前进度
- 大突破: set 整个境界对象

## NPC创建
必须一次性创建完整对象，禁止分步添加字段
`.trim()
