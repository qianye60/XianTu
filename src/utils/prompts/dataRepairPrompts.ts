import type { CharacterProfile, SaveData } from '../../types/game';

/**
 * @description 生成用于AI数据修复的系统提示词 (v2.0 - 精简版)
 * @param corruptedData 损坏的存档数据
 * @param dataTypeDefinition 正确的TypeScript类型定义字符串
 * @returns {string} 包含背景、任务、规则和示例的完整系统提示词
 */
export const getAIDataRepairSystemPrompt = (
  corruptedData: Partial<SaveData>,
  dataTypeDefinition: string
): string => {
  const corruptedDataString = JSON.stringify(corruptedData, null, 2);

  return `
# 任务：存档数据修复专家

你的任务是分析损坏的游戏存档数据，生成 \`tavern_commands\` 指令数组来修复结构性错误。

## 核心要求：
- **非破坏性**：只修复结构错误，不改变游戏进度数据
- **精确指令**：生成可执行的tavern_commands
- **最小化操作**：只生成必要的修复指令

## 修复类型：
1. **类型错误**：字段应是对象但现为字符串 → 用set修正
2. **字段缺失**：新版本必需字段 → 用set添加默认值  
3. **字段迁移**：字段更名 → set新字段，可选delete旧字段
4. **格式变更**：单值变对象结构 → set创建新对象

## 数据保留：
修复时必须保留原始有效信息。例如：
- 灵根从"天品金灵根"变为对象 → {"名称":"天品金灵根","品级":"天品","描述":"(自动修复)"}

## 输出格式：
**必须**输出JSON对象，只包含 \`tavern_commands\` 键：

\`\`\`json
{
  "tavern_commands": [
    {"action": "set", "key": "character.saveData.路径", "value": "修复值"}
  ]
}
\`\`\`

---

# 损坏的数据
\`\`\`json
${corruptedDataString}
\`\`\`

# 正确的类型定义
\`\`\`typescript
${dataTypeDefinition}
\`\`\`
`;
};