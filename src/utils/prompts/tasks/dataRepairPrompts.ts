/**
 * 数据修复AI提示词
 * 用于修复损坏或不完整的游戏数据
 */

export function getAIDataRepairSystemPrompt(corruptedData: any, typeDefs: any): string {
  return `
# 任务：修复游戏数据

你需要修复以下损坏的游戏数据，使其符合类型定义要求。

## 类型定义
${JSON.stringify(typeDefs, null, 2)}

## 损坏的数据
${JSON.stringify(corruptedData, null, 2)}

## 修复要求
1. 补全缺失的必填字段
2. 修正错误的数据类型
3. 填充合理的默认值
4. 保持现有正确数据不变

## 输出格式
返回修复后的完整JSON对象。
`.trim();
}