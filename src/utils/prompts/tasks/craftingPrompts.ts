import { generateQualitySystemPrompt } from '@/data/itemQuality';
import type { CraftingType } from '@/utils/craftingSystem';
import type { ItemQuality } from '@/types/game';

export type CraftingFireInput = { percent: number; label: string };

export type CraftingFormationInput = {
  id: string;
  name: string;
  desc: string;
  extraManaPercent: number;
  extraSpiritPercent: number;
};

export type CraftingResourcePlan = {
  灵气: {
    当前: number;
    投入百分比: number;
    阵法额外百分比: number;
    基础消耗: number;
    额外消耗: number;
    总消耗: number;
  };
  神识: {
    当前: number;
    投入百分比: number;
    阵法额外百分比: number;
    基础消耗: number;
    额外消耗: number;
    总消耗: number;
  };
};

export interface CraftingMaterialSnapshot {
  名称: string;
  类型: string;
  品质: { quality: string; grade: number | string };
  描述?: string;
}

export interface CraftingNarrativeInput {
  type: CraftingType;
  fire: CraftingFireInput;
  formation: CraftingFormationInput;
  resources?: CraftingResourcePlan;
  successRate: number;
  success: boolean;
  resultQuality: ItemQuality;
  materials: CraftingMaterialSnapshot[];
}

export interface CraftingSimulationInput {
  type: CraftingType;
  fire: CraftingFireInput;
  formation: CraftingFormationInput;
  resources?: CraftingResourcePlan;
  materials: CraftingMaterialSnapshot[];
  characterSnapshot?: {
    先天六司?: Record<string, number>;
    后天六司?: Record<string, number>;
    大道摘要?: string[];
    境界?: string;
  };
}

export interface CraftingFinalizeInput {
  type: CraftingType;
  fire: CraftingFireInput;
  formation: CraftingFormationInput;
  resources?: CraftingResourcePlan;
  materials: CraftingMaterialSnapshot[];
  simulation?: {
    successRate?: number;
    predictedQuality?: ItemQuality;
  };
  characterSnapshot?: CraftingSimulationInput['characterSnapshot'];
}

export function buildCraftingNarrativePrompts(input: CraftingNarrativeInput): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `
你是“修仙游戏炼制文案生成器”。你的任务是：根据给定的材料/火候/阵法/成功率/结果品质，生成炼制过程描写与成品描述。

硬性规则：
1) 只输出一个 JSON 对象，禁止输出 Markdown、代码块、解释文字、前后缀。
2) 禁止虚构未提供的材料与关键信息；可合理补全细节（火候变化、气机、药香、金铁之声等）。
3) 必须严格遵守结果：success=false 表示失败（成品为废丹/废器/炉渣等），success=true 表示成功。
4) 必须严格遵守物品品质体系：仅使用给定 resultQuality（quality 与 grade），不要自行更改。
5) 若提供 resources（灵气/神识消耗计划），文案与事件描述必须与其一致，不要写出超过当前值的消耗。

输出 JSON 结构：
{
  "processText": "string（炼制过程描写，分段可用\\n）",
  "itemName": "string（成品名称，失败时也要给出名称）",
  "itemDesc": "string（成品描述，含品质与大致功效/缺陷，失败时突出副作用/无效）",
  "eventDesc": "string（用于写入事件记录的描述，需包含材料清单与结果概要）"
}

${generateQualitySystemPrompt()}
`.trim();

  const userPrompt = `
请生成一次炼制文案（JSON 输出）。

炼制类型：${input.type}
火候强度：${input.fire.percent}%（${input.fire.label}）
阵法：${input.formation.name}（额外：灵气+${input.formation.extraManaPercent}% / 神识+${input.formation.extraSpiritPercent}%）
成功率：${input.successRate}%
结果是否成功：${input.success ? '成功' : '失败'}
结果品质：${input.resultQuality.quality}·${String(input.resultQuality.grade)}

灵力/神识消耗（如提供则必须遵守，不得超过当前值）：
${JSON.stringify(input.resources ?? {}, null, 2)}

材料清单（仅可使用这些材料）：
${JSON.stringify(input.materials, null, 2)}
  `.trim();

  return { systemPrompt, userPrompt };
}

export function buildCraftingSimulationPrompts(input: CraftingSimulationInput): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `
你是“修仙游戏炼制推演器”。你需要根据材料、火候、阵法、角色信息与大道加成，推演炼制的成功率与预期品质。

硬性规则：
1) 只输出一个 JSON 对象，禁止输出 Markdown、代码块、解释文字、前后缀。
2) successRate 必须是 5-95 的整数。
3) predictedQuality 必须符合物品品质体系：quality 只能是 神/仙/天/地/玄/黄/凡，grade 只能是 0-10 的整数。
4) 这是“推演”，不是最终结果：不要输出成品物品，不要输出战斗/剧情延伸。
5) 若提供 resources：视作“投入强度约束”，推演应考虑投入与阵法额外消耗，但不得写出超过当前值的消耗。

输出 JSON 结构：
{
  "successRate": number,
  "predictedQuality": { "quality": "凡|黄|玄|地|天|仙|神", "grade": 0-10 },
  "analysis": "string（简短推演依据，1-3句）",
  "warnings": ["string"...]
}

${generateQualitySystemPrompt()}
`.trim();

  const userPrompt = `
请推演一次炼制（JSON 输出）。

炼制类型：${input.type}
火候强度：${input.fire.percent}%（${input.fire.label}）
阵法：${input.formation.name}（额外：灵气+${input.formation.extraManaPercent}% / 神识+${input.formation.extraSpiritPercent}%）

材料清单：
${JSON.stringify(input.materials, null, 2)}

投入与资源上限（如提供则必须遵守，不得超过当前值）：
${JSON.stringify(input.resources ?? {}, null, 2)}

角色信息（可能为空）：
${JSON.stringify(input.characterSnapshot ?? {}, null, 2)}
  `.trim();

  return { systemPrompt, userPrompt };
}

export function buildCraftingFinalizePrompts(input: CraftingFinalizeInput): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `
你是“修仙游戏炼制裁定器”。你需要输出最终炼制结果：是否成功、产出物品（严格 JSON）、炼制过程描写与事件描述。

硬性规则：
1) 只输出一个 JSON 对象，禁止输出 Markdown、代码块、解释文字、前后缀。
2) 必须输出 success(boolean)、successRate(number)、item(object)、processText(string)、eventDesc(string)。
3) item 必须符合游戏 Item 结构（字段名用中文）：物品ID(可留空字符串)、名称、类型(装备/丹药/材料/其他/功法)、品质{quality,grade}、数量、描述、可叠加(可选)。
4) 若炼制类型为“炼丹”，成功产物类型必须是“丹药”；若为“炼器”，成功产物类型必须是“装备”。
5) 失败时允许产物为“废丹/炉渣”等：类型可为“丹药”或“材料/其他”，但必须与描述一致。
6) successRate 必须与推演一致（如果给了推演），否则按你推导给出 5-95 的整数。
7) predictedQuality（如果给了）仅作参考，但你需要让最终品质与之“基本一致”（允许小幅波动）。
8) 若提供 resources（灵气/神识消耗计划）：你在 processText / eventDesc 里必须体现该投入与消耗，且不得写出超过当前值的消耗。

输出 JSON 结构：
{
  "success": boolean,
  "successRate": number,
  "item": {
    "物品ID": "",
    "名称": "string",
    "类型": "装备|丹药|材料|其他|功法",
    "品质": { "quality": "凡|黄|玄|地|天|仙|神", "grade": 0-10 },
    "数量": number,
    "描述": "string",
    "可叠加": boolean
  },
  "processText": "string",
  "eventDesc": "string"
}

${generateQualitySystemPrompt()}
`.trim();

  const userPrompt = `
请裁定一次最终炼制结果（JSON 输出）。

炼制类型：${input.type}
火候强度：${input.fire.percent}%（${input.fire.label}）
阵法：${input.formation.name}（额外：灵气+${input.formation.extraManaPercent}% / 神识+${input.formation.extraSpiritPercent}%）

材料清单：
${JSON.stringify(input.materials, null, 2)}

投入与资源上限（如提供则必须遵守，不得超过当前值）：
${JSON.stringify(input.resources ?? {}, null, 2)}

推演结果（如果存在）：
${JSON.stringify(input.simulation ?? {}, null, 2)}

角色信息（可能为空）：
${JSON.stringify(input.characterSnapshot ?? {}, null, 2)}
  `.trim();

  return { systemPrompt, userPrompt };
}
