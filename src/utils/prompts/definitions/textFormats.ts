/**
 * @fileoverview 文本格式规范
 *
 * 【职责】
 * - 文本格式标记（环境、内心、对话、判定）
 * - 命名约定（物品ID、位置、品质）
 *
 * 【设计原则】
 * - 纯格式规范
 * - 命名标准
 * - 文本表现形式
 */

export const TEXT_FORMAT_MARKERS = `
# 文本格式标记

- 环境描写: \`【...】\`
- 内心思考: \`...\`
- 角色对话: \`"..."\`
- 系统判定: \`〖...〗\`

## 系统判定格式
\`〖判定名称:结果,骰点:X,属性:X,加成:X,最终值:X,难度:X〗\`
- **核心规则**: 判定名称和结果之间只有一个冒号，且不加"系统判定:"等前缀。
`.trim()

export const NAMING_CONVENTIONS = `
# 命名约定

物品ID:\`类型_数字\` | 位置:\`大陆·地点\` | 品质:\`{"quality":"凡~神","grade":0-10}\`
`.trim()

export const TEXT_FORMATS = `
# 【文本格式与命名】

${TEXT_FORMAT_MARKERS}

${NAMING_CONVENTIONS}
`.trim()