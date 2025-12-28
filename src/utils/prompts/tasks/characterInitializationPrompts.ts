/**
 * @fileoverview 角色初始化AI提示词
 *
 * 开局流程：世界生成 → 角色初始化（本文件）
 */

import type { World, TalentTier, Origin, SpiritRoot, Talent } from '@/types';
import type { WorldInfo, WorldMapConfig, SystemConfig } from '@/types/game';
import { SAVE_DATA_STRUCTURE, stripNsfwContent } from '../definitions/dataDefinitions';
import { characterInitializationCotPrompt } from '../cot/characterInitializationCot';
import { assembleSystemPrompt } from '../promptAssembler';
import { isTavernEnv } from '@/utils/tavern';

// =====================================================================
// 响应格式定义
// =====================================================================

const RESPONSE_FORMAT = `
## 响应格式（必须严格遵守，五个标签全部必填）

依次输出五个标签：

<thinking>
## 1. 角色分析
- 姓名/性别/年龄: [读取]
- 出身/灵根/天赋: [读取]
- 初始境界判定: [有修炼背景→炼气期，无→凡人]

## 2. 开局规划
- 初始位置: [从可用地点选择]
- 初始资源: [基于出身]
- 出场NPC: [0-3个]
</thinking>

<narrative>
[1200-2500字开局故事，沉浸式叙事，禁止包含游戏数据]
</narrative>

<memory>
[故事摘要，50-100字]
</memory>

<commands>
[初始化指令，每行一条，格式：操作|路径|值]
set|游戏时间|{"年":1050,"月":1,"日":1,"小时":8,"分钟":0}
set|玩家角色状态.位置|{"描述":"某地","x":5000,"y":5000}
set|背包.灵石|{"下品":100,"中品":0,"上品":0,"极品":0}
</commands>

<options>
[5个基于开局情境的行动选项，每行一个]
四处走动熟悉环境
查看自身状态
与附近的人交谈
寻找修炼之地
打听周围消息
</options>

**五个标签全部必填！**
`.trim();

// =====================================================================
// 初始化命令规则
// =====================================================================

const COMMANDS_RULES = `
## 初始化命令（tavern_commands）

按顺序执行：

1. **时间** - 设置 \`游戏时间\` 和 \`角色基础信息.出生日期.年\`（出生年=游戏年-年龄）
2. **位置** - 设置 \`玩家角色状态.位置\`，必须包含 {描述, x, y}，从可用地点选择
3. **声望** - 设置 \`玩家角色状态.声望\`（普通0-10, 宗门10-50, 名门50-100）
4. **随机项** - 若灵根/出身为"随机"，用 \`set\` 替换为具体内容
5. **资源** - 设置 \`背包.灵石\` 和初始物品（1-6件）、功法（0-3部）
6. **NPC** - 仅创建文本中明确提到的重要人物（0-3个），必须一次性创建完整对象
7. **大道** - 若天赋对应某大道，解锁该大道
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

## 输出要求
依次输出五个标签：<thinking>、<narrative>、<memory>、<commands>、<options>
- <thinking>: 角色分析和开局规划
- <options>: 5个基于开局情境的行动选项，每行一个
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

${characterInitializationCotPrompt}

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
