import { DICE_ROLLING_RULES } from '../definitions/textFormats';

/**
 * @fileoverview CoT 核心提示词 v3.0.0
 * @version 3.0.0
 * @lastUpdated 2025-11-23
 *
 * 【更新日志】
 * - v3.0.0: 移除骰点系统，判定完全基于属性和境界
 * - v2.2.0: 新增NPC独立演绎逻辑，区分玩家与NPC
 * - v2.2.0: 强化数据变更约束，防止越权修改
 * - v2.2.0: 新增修仙世界观一致性检查
 */

export function getCotCorePrompt(userInput: string, enableActionOptions: boolean = false): string {
  // 提取 <行动趋向> 标签中的内容，如果存在的话
  const intentMatch = userInput.match(/<行动趋向>([\s\S]*?)<\/行动趋向>/);
  const actualIntent = intentMatch ? intentMatch[1].trim() : (userInput || '无');

  return `
# 🧠 思维链 (CoT) 协议

**【强制要求】必须先输出 <thinking>...</thinking> 标签，逐项分析后再输出 JSON。禁止跳过thinking。**

## 思维链模板
<thinking>
1. 用户意图: "${actualIntent}" → 用户想做什么？必须严格按此执行，不得擅自改变
2. 判定: 是否需要判定？→ 公式/结果
3. NPC: 人格/好感度/反应
4. 变量: 需要修改哪些数据？
5. 输出: 字数/风格确认
</thinking>

## 🚨 强制约束
**你必须严格按照用户输入"${actualIntent}"来推进剧情，不得擅自改变用户的行动意图或替玩家做决定。**

${DICE_ROLLING_RULES}
`;
}

// 保留旧的导出以兼容现有代码
export const cotCorePrompt = getCotCorePrompt('');
