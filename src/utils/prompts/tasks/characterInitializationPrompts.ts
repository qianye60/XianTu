/**
 * @fileoverview 角色初始化AI提示词
 *
 * 开局流程：世界生成 → 角色初始化（本文件）
 */

import type { World, TalentTier, Origin, SpiritRoot, Talent } from '@/types';
import type { WorldInfo, WorldMapConfig, SystemConfig } from '@/types/game';
import { SAVE_DATA_STRUCTURE, stripNsfwContent } from '../definitions/dataDefinitions';
import { assembleSystemPrompt } from '../promptAssembler';
import { isTavernEnv } from '@/utils/tavern';

// =====================================================================
// 响应格式定义
// =====================================================================

const RESPONSE_FORMAT = `
## 输出格式（最高优先级）

仅输出一个 JSON 对象（可用 \`\`\`json 代码围栏包裹）；不要输出任何解释性文字/标签。

JSON结构：
\`\`\`json
{
  "text": "1200-2500字开局叙事（沉浸式、禁止包含任何游戏数据/JSON/标签）",
  "mid_term_memory": "50-100字摘要（必填，不能为空）",
  "tavern_commands": [
    {"action":"set","key":"元数据.时间","value":{"年":1050,"月":1,"日":1,"小时":8,"分钟":0}},
    {"action":"set","key":"角色.位置","value":{"描述":"大陆·地点","x":5000,"y":5000}},
    {"action":"set","key":"角色.背包.灵石","value":{"下品":100,"中品":0,"上品":0,"极品":0}}
  ],
  "action_options": ["选项1","选项2","选项3","选项4","选项5"]
}
\`\`\`

要求：
- text 只写故事正文；不要夹带命令、数据、变量名
- tavern_commands 必须是数组；用 {action,key,value} 格式
- action_options 必须输出5个且不能为空
- 严禁输出 \`<thinking>\` / 思维链 / 推理过程
`.trim();

// =====================================================================
// 初始化命令规则
// =====================================================================

const COMMANDS_RULES = `
## 初始化命令（tavern_commands）

按顺序执行：

1. **时间** - 设置 \`元数据.时间\`；并设置 \`角色.身份.出生日期\`（出生年 = 元数据.时间.年 - 开局年龄）
2. **位置** - 设置 \`角色.位置\`，必须包含 {描述, x, y}，从可用地点选择
3. **声望** - 设置 \`角色.属性.声望\`（普通0-10, 宗门10-50, 名门50-100）
4. **随机项** - 若灵根/出身为"随机"，用 \`set\` 写入 \`角色.身份.灵根\` / \`角色.身份.出生\` 的具体内容
5. **资源** - 设置 \`角色.背包.灵石\` 与 \`角色.背包.物品.{物品ID}\`；功法只作为“物品.类型=功法”进入背包
6. **NPC** - 仅创建文本中明确提到的重要人物（0-3个），写入 \`社交.关系.{npcKey}\`（npcKey 用 npc_姓名 拼音/英文均可，但要稳定）
7. **大道** - 若天赋/功法影响大道，写入 \`角色.大道.大道列表.{道名}\`，必须包含完整对象：{道名,描述,阶段列表:[{阶段名,需求经验}],是否解锁:true,当前阶段:0,当前经验:0,总经验:0}

约束：
- 所有 key 必须以 \`元数据/角色/社交/世界/系统\` 开头（短路径）
`.trim();

// =====================================================================
// 叙事规则
// =====================================================================

const NARRATIVE_RULES = `
## 叙事要求

- **篇幅**: 1200-2500字
- **风格**: 通过行为和感受展现特质，禁止游戏术语
- **年龄**: 严格从玩家选择的年龄开始
- **一致性**: 必须与玩家选择完全匹配
`.trim();

// =====================================================================
// 资源范围参考
// =====================================================================

const RESOURCE_RANGES = `
## 初始资源参考

- **灵石**: 贫困0-50, 普通20-100, 宗门50-300, 富裕100-500+
- **物品**: 1-6件（基于故事逻辑）
- **功法**: 0-3部（基于出身）
- **NPC**: 0-3个（只创建文本中明确提到的）
- **境界**: 有修炼内容→炼气期, 无修炼→凡人
`.trim();

// =====================================================================
// 导出的提示词常量（用于提示词管理UI显示）
// =====================================================================

export const CHARACTER_INITIALIZATION_PROMPT = `
# 角色初始化任务

${RESPONSE_FORMAT}

---

${COMMANDS_RULES}

---

${NARRATIVE_RULES}

---

${RESOURCE_RANGES}

---

# 数据结构
${SAVE_DATA_STRUCTURE}
`.trim();

export function getCharacterInitializationPromptForEnv(isTavern: boolean): string {
  if (isTavern) return CHARACTER_INITIALIZATION_PROMPT;
  return stripNsfwContent(CHARACTER_INITIALIZATION_PROMPT);
}

// =====================================================================
// 构建函数
// =====================================================================

interface ContextItem {
  name?: string;
  名称?: string;
  description?: string;
  描述?: string;
  type?: string;
  类型?: string;
}

/**
 * 构建玩家选择摘要
 */
export function buildCharacterSelectionsSummary(
  userSelections: {
    name: string;
    gender: string;
    race: string;
    age: number;
    world: World;
    talentTier: TalentTier;
    origin: Origin | string;
    spiritRoot: SpiritRoot | string;
    talents: Talent[];
    attributes: Record<string, number>;
  },
  worldContext?: {
    worldInfo?: WorldInfo;
    availableContinents?: ContextItem[];
    availableLocations?: ContextItem[];
    mapConfig?: WorldMapConfig;
    systemSettings?: SystemConfig;
  }
): string {
  // 提取数据
  const { name, gender, race, age, world, talentTier, origin, spiritRoot, talents, attributes } = userSelections;

  const originIsObj = typeof origin === 'object' && origin !== null;
  const spiritRootIsObj = typeof spiritRoot === 'object' && spiritRoot !== null;

  // 格式化天赋列表
  const talentsList = talents.length > 0
    ? talents.map(t => `- ${t.name}: ${t.description}`).join('\n')
    : '无';

  // 格式化属性
  const attrList = Object.entries(attributes).map(([k, v]) => `${k}:${v}`).join(', ');

  // 格式化地点
  const continents = worldContext?.availableContinents
    ?.map(c => `- ${c.name || c.名称}`)
    .join('\n') || '(未生成)';

  const locations = worldContext?.availableLocations
    ?.slice(0, 8)
    .map(l => `- ${l.name || l.名称} (${l.type || l.类型})`)
    .join('\n') || '(未生成)';

  return `
# 玩家角色数据

## 基础信息
姓名: ${name} | 性别: ${gender} | 种族: ${race} | 年龄: ${age}岁

## 世界
${world.name} (${world.era})
${world.description}

## 天资
${talentTier.name}: ${talentTier.description}

## 出身
${originIsObj ? (origin as Origin).name : origin}: ${originIsObj ? (origin as Origin).description : '(随机，需AI生成)'}

## 灵根
${spiritRootIsObj ? `${(spiritRoot as SpiritRoot).name} (${(spiritRoot as SpiritRoot).tier})` : spiritRoot}: ${spiritRootIsObj ? (spiritRoot as SpiritRoot).description : '(随机，需AI生成)'}

## 天赋
${talentsList}

## 先天六司
${attrList}

---

## 可用地点
**大陆**:
${continents}

**地点**:
${locations}

⚠️ 位置必须从上述地点选择，坐标范围: x:0-10000, y:0-10000

---

## 系统设置
${worldContext?.systemSettings?.nsfwMode ? `- **NSFW模式**: 已开启
- **私密信息生成范围**: ${worldContext?.systemSettings?.nsfwGenderFilter === 'all' ? '所有NPC' : worldContext?.systemSettings?.nsfwGenderFilter === 'female' ? '仅女性NPC' : '仅男性NPC'}
⚠️ 创建NPC时，若NPC性别符合上述范围，必须生成完整的"私密信息(PrivacyProfile)"字段` : '- **NSFW模式**: 已关闭（不生成私密信息）'}

---

## 输出要求
严格遵循系统的JSON输出规则：
- 不要输出 \`<thinking>\` / 思维链 / 任何推理过程标签
- 正文写入 JSON 的 "text" 字段（不要再输出 "<narrative>" 等标签）
- 行动选项写入 JSON 的 "action_options" 字段（5个）
`.trim();
}

/**
 * 构建角色初始化系统提示词
 */
export async function buildCharacterInitializationPrompt(): Promise<string> {
  const basePrompt = await assembleSystemPrompt([]);

  const prompt = `${basePrompt}

---

# 角色初始化任务

---

${RESPONSE_FORMAT}

---

${COMMANDS_RULES}

---

${NARRATIVE_RULES}

---

${RESOURCE_RANGES}
`.trim();

  return isTavernEnv() ? prompt : stripNsfwContent(prompt);
}

/**
 * 地点名称生成提示词
 */
export const LOCATION_NAME_GENERATION_PROMPT = `
# 任务：生成层级地点名

输入: INPUT_PLACEHOLDER
输出: {"location_name": "区域·建筑·场所"}

要求:
1. 2-3层级，用"·"分隔
2. 体现世界特点
3. 只返回JSON
`.trim();

export const GAME_START_INITIALIZATION_PROMPT = '';
