import { DICE_ROLLING_RULES } from '../definitions/textFormats';

/**
 * @fileoverview CoT 核心提示词 v2.2.0
 * @version 2.2.0
 * @lastUpdated 2025-11-19
 *
 * 【更新日志】
 * - v2.2.0: 强化判定系统，明确d20骰点使用规则
 * - v2.2.0: 新增NPC独立演绎逻辑，区分玩家与NPC
 * - v2.2.0: 强化数据变更约束，防止越权修改
 * - v2.2.0: 新增修仙世界观一致性检查
 */

export function getCotCorePrompt(userInput: string, enableActionOptions: boolean = false): string {
  return `
# 🧠 思维链 (CoT) 协议

**【强制要求】必须先输出完整的 <thinking> 标签，逐项仔细分析后再输出 JSON。跳过或敷衍thinking将导致变量遗漏。**

## 思维链模板
<thinking>
1. 意图: [${userInput || '无'}] → [目标/场景]
2. 判定: [是否触发] → [公式/结果]
3. NPC: [人格/好感度/反应]
4. 变量: [NPC外貌/内心/记忆/好感] [亲密私密信息] [战斗气血/状态] [物品/灵石] [时间+X分钟]
5. 输出: [字数/风格确认]
</thinking>

## 核心原则
1. 严格执行用户输入，不替玩家决定
2. 判定克制，仅关键节点触发
3. NPC独立人格，拒绝工具人
4. 数据严谨，符合世界观

${DICE_ROLLING_RULES}
`;
}

// 保留旧的导出以兼容现有代码
export const cotCorePrompt = getCotCorePrompt('');
