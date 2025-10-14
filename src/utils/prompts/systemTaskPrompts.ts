/**
 * @file System Task Prompts
 * @description This file contains all prompts related to the AI-driven system task generation.
 * It's designed to be conditionally injected into the AI's context when the feature is enabled.
 */

export const getSystemTaskPrompt = (customPrompt?: string): string => {
  const basePrompt = `
========== 系统任务功能 ==========

【数据结构】
\`\`\`json
{
  "系统任务": {
    "配置": {
      "启用": true,
      "任务类型": "all|relationship|cultivation|exploration|combat|custom",
      "颁发数量": 3
    },
    "进行中任务": [{任务对象}],
    "已完成任务名称": []
  }
}
\`\`\`

【核心规则】
- 前置条件：配置.启用 === true 时才能操作系统任务
- 数量限制：生成的任务数不得超过颁发数量（最大值为5）
- 【重要】每次生成后必须检查所有进行中任务的条件
- 完成判定：当任务的所有条件.完成 === true 时，必须立即执行完成流程
- 完成流程：发放奖励 + pull删除任务 + push任务名称到已完成列表
- 失败处理：任务失败时，执行惩罚 + pull删除任务

【任务ID命名规范】
格式：task_类型缩写_年月日_序号
类型缩写对照表：
- rel: 交友任务
- com: 道侣任务
- cul: 修炼任务
- exp: 探索任务
- bat: 战斗任务
- cus: 自定义任务

【任务有效期】
单位：游戏内分钟
时间换算：1小时=60分钟，1天=1440分钟，1月=43200分钟，1年=518400分钟
过期判定：(当前游戏时间 - 任务颁发时间) > 任务有效期

【任务触发时机】
- 到达新地点 → 触发探索任务或战斗任务
- 与新NPC互动且关系良好 → 触发交友任务
- NPC好感度≥60 → 触发道侣任务
- 境界突破 → 触发修炼任务
- 剧情关键节点 → 触发对应类型任务

【操作示例】

[颁发新任务]
\`{"action":"push","key":"系统任务.进行中任务","value":{完整任务对象}}\`

[更新任务进度]
\`{"action":"set","key":"系统任务.进行中任务.0.条件.0.进度.当前","value":2}\`

[标记任务条件完成]
\`{"action":"set","key":"系统任务.进行中任务.0.条件.0.完成","value":true}\`

[完成任务] 必须按顺序执行以下三个操作，缺一不可：
\`\`\`json
[
  {"action":"add","scope":"chat","key":"背包.灵石.下品","value":100},
  {"action":"pull","scope":"chat","key":"系统任务.进行中任务","value":{"任务ID":"task_rel_1000_0315_001"}},
  {"action":"push","scope":"chat","key":"系统任务.已完成任务名称","value":"初识道友"}
]
\`\`\`

[任务失败]
\`\`\`json
[
  {"action":"add","scope":"chat","key":"玩家角色状态.声望","value":-10},
  {"action":"pull","scope":"chat","key":"系统任务.进行中任务","value":{"任务ID":"task_xxx"}}
]
\`\`\`
  `;

  if (customPrompt) {
    return `${basePrompt}\n\n### 自定义规则\n${customPrompt}`;
  }

  return basePrompt;
};