import { diceRollingCotPrompt } from './diceRollingCot';
import { WRITING_QUALITY } from '../definitions/writingQuality';

/**
 * @fileoverview CoT 核心提示词 v2.0.0
 * @version 2.0.0
 * @lastUpdated 2025-10-31
 *
 * 【更新日志】
 * - v2.0.0: 简化 CoT 步骤结构 (7步→3大步)
 * - v2.0.0: 增强字数检查和数据校验
 * - v2.0.0: 添加快速决策分支和 NPC 性格矩阵
 */

export const cotCorePrompt = `
# 🔴 CoT 思维链 v2.1 (Chain of Thought) - 必须遵守

## 输出流程（严格按顺序）
**第一步：必须先输出思维链**
<thinking>
[简单场景3步 / 复杂场景按模板]
</thinking>

**第二步：再输出JSON响应**
\`\`\`json
{
  "text": "叙事文本（简单500-800字，复杂1000-1500字）",
  "mid_term_memory": "核心事件摘要（50-100字）",
  "tavern_commands": [{"action":"set|add|push|delete","key":"路径","value":"值"}],
  "action_options": ["选项1", "选项2", "选项3"]
}
\`\`\`

注意：
- **必须先输出 <thinking> 标签内的思维链，再输出JSON**
- \`action_options\` 字段仅在启用行动选项功能时需要返回

---

## 思维链模板

### 精简模式（日常/无判定/无NPC）
<thinking>
Intent: [用户想做什么] | Dice: NO
Data: 时间+[X]分 | [其他变化]
Words: 500-800字 | ✓禁用词
</thinking>

### 完整模式（判定/NPC/重要剧情）
<thinking>
## 1. Intent
Action: [类型] | Goal: [目标] | Dice: [YES/NO]
Time: [对话1-5分/移动5-30分/战斗5-30分/修炼数小时]

## 2. Execution
NPC: [名称] | 性格:[3词] | 关系:[好感度] | 反应:[基于性格] (if any)
Words: 1000-1500字(核心叙事≥60%) | 超限→压缩环境 | 不足→补充细节
Innovation: [场景特色/剧情转折/角色成长]

## 3. Data
Changes: [角色/物品/NPC/任务/时间/位置]
Commands:
- 需要更新的变量 → [哪些字段需要改]
- 路径构建 → [顶层.动态键.目标] 是否正确
- 指令格式 → action/key/value 是否完整
- 数值合理性 → 是否符合游戏逻辑
- [最终指令数量]
</thinking>

---

## 核心规则

### 玩家意图
- ✅ 必须尝试用户想做的事
- ✅ 结果取决于判定+能力+环境
- ❌ 不添加无关事件
- ❌ 不替玩家做决定

### 判定触发
- 战斗/困难/风险 → 输出〖判定〗
- 日常/对话/确定成功 → 直接描述
${diceRollingCotPrompt}

### 文本质量
${WRITING_QUALITY}
`;
