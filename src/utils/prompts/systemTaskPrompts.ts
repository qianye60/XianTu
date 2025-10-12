/**
 * @file System Task Prompts
 * @description This file contains all prompts related to the AI-driven system task generation.
 * It's designed to be conditionally injected into the AI's context when the feature is enabled.
 */

export const getSystemTaskPrompt = (customPrompt?: string): string => {
  const basePrompt = `
## 系统任务 (System Quests | 根级字段)

### 结构 (Structure)
\`\`\`json
{
  "系统任务": {
    "配置": {"启用":true,"任务类型":"all|relationship|companion|cultivation|exploration|combat|custom","颁发数量":3,"自定义提示词":""},
    "进行中任务": [{"任务ID":"task_001","任务名称":"初识道友","任务类型":"relationship","任务描述":"结识3位修士","颁发时间":{年月日时分},"有效期":14400,"条件":[{"描述":"结识3位修士","完成":false,"进度":{"当前":0,"目标":3}}],"奖励":[{"类型":"灵石","描述":"下品灵石×100","数据":{"品级":"下品","数量":100}}],"失败惩罚":"声望-10"}],
    "已完成任务名称": []
  }
}
\`\`\`

⚠️ **操作规则** (Rules)：
- 启用检查：配置.启用=true才操作
- 任务生成：合适时机生成，进行中≤颁发数量，≤5个(硬上限)
- 任务进度：玩家行动后自动检查更新
- 任务完成：条件全满→发放奖励(add)+pull删除+push已完成名称
- 任务失败：超时/触发失败→惩罚+pull删除

### 任务ID命名 (Naming)
格式：\`task_类型_年月日_序号\`
示例：\`task_rel_1000_0315_001\` (交友) \`task_cul_1000_0320_002\` (修炼)
缩写：rel=交友, com=道侣, cul=修炼, exp=探索, bat=战斗, cus=自定义

### 有效期 (Duration)
单位：游戏内分钟
换算：1小时=60, 1天=1440, 1月(30天)=43200, 1年=518400
示例：14400=10天, 21600=15天
过期：(当前时间-颁发时间) > 有效期

### 触发时机 (Triggers | 进行中<颁发数量时)
- 进入新地点→探索/战斗
- 遇见新NPC且互动良好→交友
- NPC好感度达阈值(60)→道侣
- 境界突破后→修炼
- 剧情关键节点→对应类型

### 操作示例 (Examples)

**颁发**：
\`\`\`json
{"action":"push","key":"系统任务.进行中任务","value":{任务完整对象}}
\`\`\`

**更新进度** (数组索引)：
\`\`\`json
{"action":"set","key":"系统任务.进行中任务.0.条件.0.进度.当前","value":2}
\`\`\`
说明：第1个0=任务列表第0个，第2个0=条件列表第0个

**标记完成**：
\`\`\`json
{"action":"set","key":"系统任务.进行中任务.0.条件.0.完成","value":true}
\`\`\`

**完成任务** (顺序：奖励→删除→记录)：
\`\`\`json
[
  {"action":"add","key":"背包_灵石.下品","value":100},
  {"action":"pull","key":"系统任务.进行中任务","value":{"任务ID":"task_rel_1000_0315_001"}},
  {"action":"push","key":"系统任务.已完成任务名称","value":"初识道友"}
]
\`\`\`

**失败** (惩罚→删除)：
\`\`\`json
[
  {"action":"add","key":"玩家角色状态.声望","value":-10},
  {"action":"pull","key":"系统任务.进行中任务","value":{"任务ID":"task_xxx"}}
]
\`\`\`

**批量颁发**：
\`\`\`json
[
  {"action":"push","key":"系统任务.进行中任务","value":{任务1}},
  {"action":"push","key":"系统任务.进行中任务","value":{任务2}}
]
\`\`\`
  `;

  if (customPrompt) {
    return `${basePrompt}\n\n### 自定义任务规则\n${customPrompt}`;
  }

  return basePrompt;
};