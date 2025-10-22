/**
 * @fileoverview 角色初始化AI提示词
 *
 * 【职责】
 * - 定义角色初始化专用的规则（随机选项处理、位置设置、命名风格等）
 * - 构建角色初始化的完整提示词
 * - 生成用户选择摘要
 *
 * 【设计原则】
 * - 只包含角色初始化场景特有的规则
 * - 通用规则从 sharedRules 导入
 * - 数据结构从 dataStructureDefinitions 导入
 */

import type { World, TalentTier, Origin, SpiritRoot, Talent } from '@/types';
import type { WorldInfo, WorldMapConfig, SystemConfig } from '@/types/game';
import { DATA_STRUCTURE_DEFINITIONS } from './dataStructureDefinitions';

// 角色初始化专用规则
const CHARACTER_INIT_RULES = [
  '## 角色初始化专用规则',
  '',
  '### 随机选项处理',
  '检测到"随机灵根"或"随机出身"时必须替换为具体内容。灵根根据天资等级选择品级，出身根据世界背景选择。',
  '',
  '### 位置设置要求',
  '必须在tavern_commands中设置位置，格式："世界名·大陆名·地点名·更具体地点"（最多3层，用"·"分隔）',
  '地点必须从可用的availableContinents和availableLocations中选择。',
  '同时设置坐标：x和y字段。',
  '',
  '### 命名风格一致性',
  '所有专有名词（NPC姓名、地点、组织、物品等）必须严格符合世界背景风格。',
  '- 现代世界：张伟、XX市图书馆、XX研究中心',
  '- 仙侠世界：清虚道长、炼丹阁、青云宗',
  '',
  '### 初始资源范围',
  '- 灵石：凡人(0-10)，小康(10-50)，宗门弟子(50-200)',
  '- 物品：2-5件',
  '- NPC：0-3个',
  '- 功法：0-2部',
  '',
  '### NPC境界约束',
  'NPC境界必须与世界设定匹配，不要随意创建高境界NPC。',
  '',
  '### 叙事要求',
  '- 1200-2500字沉浸式开场故事',
  '- 禁止直接提及游戏术语（背包、系统、提示词等）',
  '- 通过行为和感受展现角色特质，而非直接说明',
  '',
  '### 年龄和时间',
  '严格按照玩家选择的年龄开始，禁止修改寿命或时间跳跃。',
  '',
  '### 境界系统',
  '境界顺序：凡人 → 练气 → 筑基 → 金丹 → 元婴 → 化神 → 炼虚 → 合体 → 大乘 → 渡劫 → 仙人',
  '每个境界分为：初期、中期、后期、大圆满四个阶段，但是有极少天才中的天才或者远古妖孽能突破极境。',
  '',
  '### 境界提升修为标准（重要参考）',
  '这是修仙世界的数值标准，体现修仙的宏大感和难度递增：',
  '设定原则：',
  '- 体现修仙的宏大感：数值要有仙侠的磅礴气势',
  '- 指数级增长：高境界需要的修为呈指数增长',
  '- 合理的成长空间：给玩家足够的挑战感和成就感',
  '',
  '重要：如果开局故事中角色突破了境界（例如从凡人到练气），必须使用 tavern_commands 更新 `玩家角色状态.境界` 对象，确保叙事和数据同步。',
  '',
  '### NSFW模式',
  '当nsfwMode=true时，需为玩家和NPC生成身体部位开发数据，本次对话为初始化对话，当nsfwMode直接打开为true，所有初始化生成的女性都带私密信息',
  '- 玩家：生成3-5个核心身体部位，使用命令格式：{"action":"set","key":"身体部位开发.部位名称","value":{"描述":"...","开发等级":0-20,"敏感度":20-50}}',
  '- NPC：在私密信息中包含14个必填字段（是否为处女/处男、身体部位[]、性格倾向、性取向等）',
].join('\n');

export const CHARACTER_INITIALIZATION_PROMPT = `
# 任务：角色初始化 (生成开局故事)

## 🔴 核心指令 (最高优先级)

1.  输出格式: 必须输出纯JSON对象，不使用markdown代码块标记
    - ✅ 正确：{"text": "...", "mid_term_memory": "...", "tavern_commands": [...]}
    - ❌ 错误：\`\`\`json {...} \`\`\`
2.  时间规则: 禁止推进时间（这是开局任务，不包含时间命令）
3.  必需字段: text (1200-2500字), mid_term_memory, tavern_commands (数组)

## JSON输出规则
1. 必须输出纯JSON对象，不使用markdown代码块
2. 所有字符串使用双引号
3. 不允许尾随逗号
4. 必须包含text、mid_term_memory、tavern_commands字段

---

## 🔴 输出结构模板 (必须严格遵循此结构)

你的完整输出应该是这样的纯JSON：

{
  "text": "这里是1200-2500字根据出身背景的沉浸式开局故事...",
  "mid_term_memory": "初始化文本对应的中期记忆",
  "tavern_commands": [
    {"action": "set", "key": "路径", "value": "值"}
  ]
}
---

# 1. 开局故事 (text)

生成1200-2500字的沉浸式开场，体现角色的出身、天赋和所处环境。

叙事要求:
- 通过行为和感受来展现角色特质，禁止直接提及"根骨"、"灵根"等游戏术语
- 例如：高根骨体现为体魄强健，高悟性体现为领悟力超群，神品灵根出生或者释放伴随天地异象

一致性: 故事内容必须与玩家的选择完全匹配，积极体现其特点和优势

年龄: 从玩家选择的开局年龄开始，禁止修改寿命，禁止时间跳跃

格式: 叙事，遵守FORMAT_MARKERS文本格式规则
  FORMAT_MARKERS:
  - 环境描写和氛围渲染: 使用【...】
  - 内心思考和心理活动: 使用\`...\`
  - 角色对话: 使用"..."
  - 系统判定和规则说明: 使用〖...〗，格式必须为"判定类型:结果"或包含具体数值的完整判定
  - 注意：\`...\` 为内容

---

# 2. 初始世界状态 (tavern_commands)

根据开局故事，通过commands添加初始实体。

## 初始化专用检查清单

- 时间设置 (最优先，第一个命令): 根据世界背景设置合理的游戏年份
  - 仙侠世界：使用仙历纪年（如：仙道元年1000年、青云纪5000年）
  - 现代都市：使用公元纪年（如：2024年）
  - 先设置游戏时间，再创建NPC，确保NPC年龄计算正确；
  - 命令格式：{"action":"set","key":"游戏时间.年","value":合理年份}
  - 同时设置角色出生日期：{"action":"set","key":"角色基础信息.出生日期.年","value":游戏时间年份-角色年龄}
- 位置设置 (第二个命令): {"action":"set","key":"玩家角色状态.位置.描述","value":"世界名·大陆名·地点名"}
- 物品获得: 初始2-5件物品，提供完整物品结构
- 初始灵石: 根据出身设置 (凡人0-10, 小康10-50, 宗门弟子50-200)
- 初始声望: 根据出身背景设置合理的声望值
- NPC创建: 0-3个NPC，使用完整结构
- 大道解锁: 如果天赋对应某大道则解锁
- 私密信息:NPC是否生成的对象是否含有私密信息14个字段

### 时间设置 (必需，第一组命令)
\`\`\`json
{"action": "set", "key": "游戏时间.年", "value": 1000},
{"action": "set", "key": "游戏时间.月", "value": 1},
{"action": "set", "key": "游戏时间.日", "value": 1},
{"action": "set", "key": "角色基础信息.出生日期.年", "value": 980}
\`\`\`
注意：
- 根据世界背景选择合理的年份（仙侠世界用仙历，现代世界用公元）
- 出生日期.年 = 游戏时间.年 - 角色开局年龄
- 必须先设置时间再创建NPC，否则NPC年龄会出错

### 位置设置 (必需，第二组命令)
\`\`\`json
{"action": "set", "key": "玩家角色状态.位置.描述", "value": "朝天大陆·青云大陆·青云宗·外门"},
{"action": "set", "key": "玩家角色状态.位置.x", "value": 500},
{"action": "set", "key": "玩家角色状态.位置.y", "value": 300}
\`\`\`
注意：x, y 坐标应从可用地点列表中获取或基于地图配置合理设置。

### 灵石设置
\`\`\`json
{"action": "set", "key": "背包.灵石.下品", "value": 50}
{"action": "set", "key": "背包.灵石.中品", "value": 5}
\`\`\`

### 声望设置 (必需)
根据出身背景设置合理的初始声望值：
\`\`\`json
{"action": "set", "key": "玩家角色状态.声望", "value": 0}
\`\`\`

声望设置指导：
- 普通出身：0（籍籍无名）
- 贫苦出身：-10到-50（略有恶名或无名）
- 富贵出身：10到100（小有名气）
- 宗门弟子：50到200（宗门内有一定声望）
- 世家子弟：100到500（家族声望加成）
- 流浪者/罪犯出身：-100到-500（恶名在外）
- 英雄后代：200到1000（继承声望）

重要：声望必须与出身背景的描述保持一致！

### 物品创建 (必须包含所有必填字段)
\`\`\`json
{
  "action": "set",
  "key": "背包.物品.item_001",
  "value": {
    "物品ID": "item_001",
    "名称": "聚气丹",
    "类型": "丹药",
    "品质": {"quality": "黄", "grade": 3},
    "数量": 5,
    "描述": "低阶丹药，可加速灵气吸收"
  }
}
\`\`\`


## 初始化阶段数据要求【部分】 (必须严格遵守)

物品必填字段 (基础):
- 通用: \`物品ID\`, \`名称\`, \`类型\`, \`品质\`, \`数量\`, \`描述\`
- 装备: 额外需要 \`装备增幅\`, \`已装备\`
- 功法: 额外需要 \`功法效果\`, \`功法技能\`, \`修炼进度\`, \`已装备\`
- 丹药: 额外需要 \`使用效果\`

NPC结构 (必须完整):
- 核心信息: \`名字\`, \`性别\`, \`年龄\`, \`出生日期\`, \`种族\`, \`出生\`, \`外貌描述\`, \`性格特征\`
- 实力资质: \`境界\` (简化版: {名称, 阶段}), \`灵根\` (简化版: {名称, 品级}), \`天赋\`, \`先天六司\`
- 社交关系: \`与玩家关系\`, \`好感度\`, \`人格底线\`, \`势力归属\`
- 动态信息: \`记忆\`, \`记忆总结\`, \`当前位置\` ({描述, x, y}), \`当前外貌状态\`, \`当前内心想法\`
- 资产: \`背包\` ({灵石, 物品})
- 私密信息: 此次对话为初始化，必须生成，包含14个必填字段的完整对象
- 元信息: \`实时关注\` (boolean)

位置格式:
- 描述字段: "世界名·大陆名·地点名·更具体地点" (最多3层)
- 完整对象: 必须同时设置 \`描述\`, \`x\`, \`y\` 三个字段

品质标准: \`{"quality":"凡|黄|玄|地|天|仙|神(不可出现)","grade":0-10}\`

---

# 角色初始化规则

${CHARACTER_INIT_RULES}

---

# 数据结构

${DATA_STRUCTURE_DEFINITIONS}
`.trim();

/*
 * 构建角色创建时用户选择的摘要，用于插入到用户消息中。
 * @param userSelections - The player's choices during character creation.
 * @param worldContext - The world information including continents and locations.
 * @returns A formatted string summarizing the player's selections.
 */
interface ContextItem {
  name?: string;
  名称?: string;
  description?: string;
  描述?: string;
  type?: string;
  类型?: string;
}

export function buildCharacterSelectionsSummary(
  userSelections: {
    name: string;
    gender: string;
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


  // ============================================================
  // 数据提取：直接从强类型对象获取，无需 || 回退
  // ============================================================

  // 1. 世界信息（userSelections.world 是 World 类型）
  const worldName = userSelections.world.name;
  const worldDesc = userSelections.world.description;
  const worldEra = userSelections.world.era;

  // 2. 天资信息（userSelections.talentTier 是 TalentTier 类型）
  const talentTierName = userSelections.talentTier.name;
  const talentTierDesc = userSelections.talentTier.description;

  // 3. 出身信息（可能是 Origin 对象或字符串 "随机出身"）
  const originName = (typeof userSelections.origin === 'object' && userSelections.origin)
    ? userSelections.origin.name
    : userSelections.origin;
  const originDesc = (typeof userSelections.origin === 'object' && userSelections.origin)
    ? userSelections.origin.description
    : '（随机出身，需AI根据世界背景创造性生成）';

  // 4. 灵根信息（可能是 SpiritRoot 对象或字符串 "随机灵根"）
  const spiritRootName = (typeof userSelections.spiritRoot === 'object' && userSelections.spiritRoot)
    ? userSelections.spiritRoot.name
    : userSelections.spiritRoot;
  const spiritRootTier = (typeof userSelections.spiritRoot === 'object' && userSelections.spiritRoot) ? userSelections.spiritRoot.tier : '';
  const spiritRootDesc = (typeof userSelections.spiritRoot === 'object' && userSelections.spiritRoot)
    ? userSelections.spiritRoot.description
    : '（随机灵根，需AI根据天资等级创造性生成）';

  // 5. 天赋列表（Talent[] 类型）
  const talentsList = userSelections.talents.length > 0
    ? userSelections.talents.map(t => `  - **${t.name}**：${t.description}`).join('\n')
    : '  无';

  // 6. 先天六司
  const attributesText = Object.entries(userSelections.attributes)
    .map(([key, value]) => `  - ${key}: ${value}`)
    .join('\n');

  // 7. 可用大陆（从 worldContext 获取生成后的地图数据）
  const continentsList = worldContext?.availableContinents
    ? worldContext.availableContinents.map((c: ContextItem) => `  - **${c.name || c.名称}**：${c.description || c.描述}`).join('\n')
    : '  （未生成）';

  // 8. 主要地点（从 worldContext 获取）
  const locationsList = worldContext?.availableLocations?.slice(0, 10)
    ? worldContext.availableLocations.slice(0, 10).map((l: ContextItem) => `  - **${l.name || l.名称}** (${l.type || l.类型})：${l.description || l.描述}`).join('\n')
    : '  （未生成）';

  const selectionsSummary = `
# 🔴🔴🔴 重要提醒 🔴🔴🔴

你必须输出纯JSON格式，不要使用markdown代码块！

格式示例：
{"text": "故事内容...", "mid_term_memory": "摘要", "tavern_commands": [...]}

❌ 错误：\`\`\`json {...}\`\`\`
✅ 正确：直接输出JSON对象

---

# 🔴 玩家角色创建数据（详细信息） 🔴

## 基础信息
- 姓名：${userSelections.name}
- 性别：${userSelections.gender}
- 开局年龄：${userSelections.age}岁

---

## 世界背景 🌍
- 世界名称：${worldName}
- 世界时代：${worldEra}
- 🔴 世界描述（必读）：${worldDesc}

要求：开局故事必须完全基于这个世界描述构建世界观！

---

## 天资等级 ✨
- 天资名称：${talentTierName}
- 🔴 天资描述（必读）：${talentTierDesc}

要求：角色的资质表现必须符合这个天资描述！

---

## 出身背景 👤
- 出身名称：${originName}
- 🔴 出身描述（必读）：${originDesc}

要求：开局故事的核心背景必须基于这个出身描述！

---

## 灵根资质 🔥
- 灵根名称：${spiritRootName}
- 灵根品级：${spiritRootTier}
- 🔴 灵根描述（必读）：${spiritRootDesc}

要求：角色的修炼天赋必须体现这个灵根描述！

---

## 天赋列表 🎁
${talentsList}

要求：开局故事或初始化数据中必须体现这些天赋！

---

## 先天六司 📊
${attributesText}

---

## 可用大陆 🗺️
${continentsList}

---

## 主要地点 📍
${locationsList}

重要：位置设置必须从这些大陆和地点中选择！
格式规则：使用"·"分隔（例如："世界名·大陆名·地点名·更具体的地点"）

---

## 🔴 核心要求总结

正确：使用完整描述构建故事（根据出身描述展开详细背景）

---

## 🔴🔴🔴 输出格式要求（极其重要！）🔴🔴🔴

你必须输出一个纯JSON对象，格式如下：

{
  "text": "1200-2500字的开局故事（必须体现上述所有描述信息）",
  "mid_term_memory": "text的缩短版",
  "tavern_commands": [
    {"action": "set", "key": "玩家角色状态.位置.描述", "value": "世界名·大陆名·地点名"},
    其他命令...
  ]
}
---
`;

  // This function now only returns the summary. The main prompt is returned by buildCharacterInitializationPrompt.
  return selectionsSummary;
}

/**
 * 构建角色初始化的系统提示词
 * @returns The system prompt string.
 */
export function buildCharacterInitializationPrompt(): string {
  return CHARACTER_INITIALIZATION_PROMPT;
}

/**
 * 地点名称生成提示词
 */
export const LOCATION_NAME_GENERATION_PROMPT = `
# 任务：为大陆生成层级地点名

为大陆生成具体、有层级、有特色的地点名称。

输入:
\`\`\`json
INPUT_PLACEHOLDER
\`\`\`

输出:
\`\`\`json
{"location_name": "具体地点(不含大陆名)"}
\`\`\`

要求:
1. 2-3层级, 用"·"分隔, 从大到小 (例如: 区域·建筑·场所)。
2. 体现大陆特点 (修仙世界使用宗门/洞府, 都市世界使用建筑/街道)。
3. 只返回地点名，系统会自动拼接大陆名。
4. 必须是有效的JSON，无注释或额外文本。
`.trim();

export const GAME_START_INITIALIZATION_PROMPT = '';
