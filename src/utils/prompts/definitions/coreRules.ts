/**
 * @fileoverview 核心输出规则
 *
 * 【职责】
 * - JSON输出格式规范
 * - 响应格式要求
 * - 数据结构严格性规则
 *
 * 【设计原则】
 * - 最高优先级规则
 * - 技术性约束
 * - 确保系统正常运行
 */

export const JSON_OUTPUT_RULES = `
# JSON 输出规范 (最高优先级)

## 1. 格式要求
- **Markdown包裹**: 必须使用 \`\`\`json ... \`\`\` 包裹 JSON 内容。
- **纯净 JSON**: 确保语法正确，无尾随逗号，所有键值对使用双引号。
- **结构定义**:
\`\`\`json
{
  "text": "叙事文本 (必填，禁含游戏数据)",
  "mid_term_memory": "记忆摘要 (必填，客观第三人称)",
  "tavern_commands": [
    {"action": "set|add|push|delete", "key": "路径", "value": "值"}
  ],
  "action_options": ["选项1", "选项2"] // 仅在启用时返回
}
\`\`\`

## 2. 字段约束
- **text**: 纯小说叙事，严禁包含数值/属性/进度等游戏数据。
- **mid_term_memory**:
  - 区分主角({{user}})与NPC。
  - 仅记录已发生事实，不编造，不推测。
- **tavern_commands**:
  - 必须是数组。
  - 仅包含 action, key, value 字段。
  - action 仅限: set, add, push, pull, delete。
`.trim()

export const RESPONSE_FORMAT_RULES = `
`.trim()

export const DATA_STRUCTURE_STRICTNESS = `
# 核心规则：数据结构严格性 - 最高优先级

## 1. 数据结构严格性
- **严格匹配定义**：输出必须严格匹配数据结构，禁止添加未定义字段
- **类型正确**：数字用number，字符串用string，不要混用
- **结构优先**：结构正确的平庸JSON > 结构错误的丰富JSON（前端解析失败会导致无法显示）
- **NPC境界规则**：NPC境界包含{名称, 阶段, 当前进度?, 下一级所需?, 突破描述?}，突破时必须更新名称和阶段

## 2. 只读字段 - 禁止修改
\`装备栏.*\` | \`修炼功法.*\` | \`掌握技能\` | \`系统.*\` | \`角色基础信息\`(除后天六司) | \`年龄\`
`.trim()

