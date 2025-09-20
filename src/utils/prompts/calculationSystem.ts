/**
 * @fileoverview 提示词侧的“计算系统”封装
 * 提供：
 *  - CALCULATION_SYSTEM_PROMPT：一段集中描述的计算/判定规则提示
 *  - generateNumericalStatusPrompt：根据角色数值生成结构化数值提示
 *  - generateEnvironmentPrompt：根据场景生成环境提示
 */

export const CALCULATION_SYSTEM_PROMPT = `
## 数值与判定总纲

- 所有成功率、收益、损耗必须基于角色真实数值与环境因素计算。
- 失败应有合理代价，成功应与投入与风险匹配。
- 随机性存在但受“气运/难度/环境”调制，不得脱离区间上限/下限。

### 通用参考（示例）
- 突破成功率 ≈ (当前修为/所需修为) × (悟性/10) × (功法品质系数) × (状态/环境系数)
- 战斗力 ≈ (气血×0.3) + (灵气×0.4) + (神识×0.2) + (境界等级×100) + (装备/功法/状态加成)
- 资源收益随境界与环境上升，随机波动受“气运/难度”影响
`;

/**
 * 生成角色数值现状提示（供大模型参考的定性+定量“看板”）
 */
export function generateNumericalStatusPrompt(input: {
  baseAttributes: Record<string, number>;
  cultivation: Record<string, any>;
  talents: string[];
  constitution: string;
  spiritRoot: string;
  fortune: number;
}): string {
  const { baseAttributes, cultivation, talents, constitution, spiritRoot, fortune } = input;

  const attrs = Object.entries(baseAttributes || {})
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const realmInfo = cultivation?.realm ? `- 境界: ${cultivation.realm}` : '';
  const realmProgress = cultivation?.progress ? `- 修为进度: ${cultivation.progress}` : '';
  const talentList = (talents && talents.length) ? talents.map(t => `- ${t}`).join('\n') : '- 无';

  return `
### 数值状态总览

#### 基础属性
${attrs || '- 无'}

#### 修炼信息
${realmInfo || '- 境界: 未知'}
${realmProgress || ''}
- 体质: ${constitution || '普通体质'}
- 灵根: ${spiritRoot || '普通灵根'}
- 气运(0-10): ${typeof fortune === 'number' ? fortune : 5}

#### 天赋/特性
${talentList}
`;
}

/**
 * 生成环境提示（地点/灵气/危险度/特殊效果）
 */
export function generateEnvironmentPrompt(input: {
  name: string;
  type: string;
  spiritDensity: number; // 0-10
  dangerLevel: number;   // 0-10
  specialEffects?: string[] | undefined;
}): string {
  const { name, type, spiritDensity, dangerLevel, specialEffects } = input;
  const effects = specialEffects?.length ? specialEffects.map(e => `- ${e}`).join('\n') : '- 无';
  return `
### 场景环境
- 地点: ${name}
- 类型: ${type}
- 灵气密度(0-10): ${spiritDensity}
- 危险等级(0-10): ${dangerLevel}
#### 特殊环境效果
${effects}
`;
}

