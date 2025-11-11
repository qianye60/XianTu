/**
 * @fileoverview 角色初始化AI提示词
 *
 * 【职责】
 * - 定义角色初始化专用的规则(随机选项处理、位置设置、命名风格等)
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
import { SAVE_DATA_STRUCTURE as DATA_STRUCTURE_DEFINITIONS } from '../definitions/dataDefinitions';
import { characterInitializationCotPrompt } from '../cot/characterInitializationCot';
import { assembleSystemPrompt } from '../promptAssembler';

// =====================================================================
// 角色初始化专用规则
// =====================================================================

const CHARACTER_INIT_RULES = `
## 🎯 角色初始化核心要求

### 1. 数据路径规范
- 所有命令的 key 路径必须严格匹配数据结构定义
- NPC 创建必须使用 \`set\` 操作创建完整对象
- 严禁修改只读字段（角色基础信息，除出生日期.年外）

### 2. 随机选项处理
- 当灵根或出身为"随机"时，必须创造独特内容并用 \`set\` 替换
- 根据世界背景、天资等级设计合理内容

### 3. 位置与命名
- 位置必须包含 描述、x、y 三个字段
- 位置必须从提供的可用大陆和地点中选择
- 命名风格必须与世界背景一致

### 4. 初始资源范围
- **灵石**：贫困 0-50，普通 20-100，宗门 50-300，富裕 100-500+
- **物品**：1-6 件（基于故事逻辑）
- **功法**：0-3 部（基于出身）
- **NPC**：0-3 个（只创建文本中明确提到的）

### 5. 叙事要求
- **篇幅**：1200-2500 字
- **风格**：通过行为和感受展现特质，禁止游戏术语
- **年龄**：严格按玩家选择的年龄开始，禁止时间跳跃
- **文本质量**：避免禁用词汇（绝望化/机械化/八股化/过度修饰）

### 6. 初始境界判定
- **有修炼内容**（功法/灵气/术法/宗门弟子）→ 炼气初期/中期/后期 或 筑基初期
- **完全无修炼内容** → 凡人

### 7. NSFW 内容生成
- **NPC 私密信息**：nsfwMode=true 且性别符合 nsfwGenderFilter 时，生成完整 12 字段私密信息
- **玩家身体部位**：nsfwMode=true 时，生成 3-5 个身体部位开发数据
`.trim();

export const CHARACTER_INITIALIZATION_PROMPT = `
# 任务:角色初始化 (生成开局故事)

# 思维链 (COT)
${characterInitializationCotPrompt}

---

## 1. 【强制JSON响应格式】- 最高优先级
你必须返回一个有效的、纯粹的JSON对象，格式如下：
\`\`\`json
{
  "text": "1200-2500字的沉浸式开局故事",
  "mid_term_memory": "开局事件的简短摘要（必填，不能为空）",
  "tavern_commands": [
    {"action": "set", "key": "游戏时间.年", "value": 1000}
  ]
}
\`\`\`
- **关键要求**: 必须是纯JSON，不带任何Markdown标记或解释性文字。\`tavern_commands\` 必须是数组。

---

## 2. 【开局故事 (text)】
生成1200-2500字的沉浸式开场，体现角色的出身、天赋和所处环境。
- **叙事要求**: 通过行为和感受来展现角色特质，禁止直接提及游戏术语。
- **一致性**: 故事内容必须与玩家的选择完全匹配。
- **年龄**: 严格从玩家选择的开局年龄开始。

---

## 3. 【初始世界状态 (tavern_commands)】
根据开局故事，通过commands添加初始实体。**命令必须按以下顺序执行**：

### 第1步：时间设置 (最优先)
- 设置 \`游戏时间\` 和 \`角色基础信息.出生日期.年\`。
- 出生年 = 游戏年份 - 角色年龄。

### 第2步：位置设置 (必需)
- 设置 \`玩家角色状态.位置\`，包含 \`描述\`, \`x\`, \`y\`。
- 必须从提供的可用大陆和地点中选择。

### 第3步：声望设置 (必需)
- 设置 \`玩家角色状态.声望\` (参考范围: 普通0-10, 宗门10-50, 名门50-100)。

### 第4步：随机项替换 (如果需要)
- 如果灵根或出身包含"随机"，必须使用 \`set\` 命令将其替换为具体内容。

### 第5步：初始资源 (必需)
- 设置 \`背包.灵石\` (参考范围: 贫困0-50, 普通20-100, 富裕100-500+)。
- 添加1-6件初始物品和0-3部功法。

### 第6步：NPC创建 (可选, 0-3个)
- **核心原则**: 只生成开局文本中明确提到的、有互动的重要人物。严禁凭空编造。
- 如果文本只是泛泛提到"路人"或无人提及，则不创建NPC。

### 第7步：大道解锁 (如果天赋对应)
- 如果天赋与某个大道相关，使用 \`set\` 命令解锁该大道。

---

# 角色初始化规则
${CHARACTER_INIT_RULES}

---

# 数据结构
${DATA_STRUCTURE_DEFINITIONS}
`.trim();

/*
 * 构建角色创建时用户选择的摘要,用于插入到用户消息中。
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
  // 数据提取
  const worldName = userSelections.world.name;
  const worldDesc = userSelections.world.description;
  const worldEra = userSelections.world.era;

  const talentTierName = userSelections.talentTier.name;
  const talentTierDesc = userSelections.talentTier.description;

  const originIsObject = typeof userSelections.origin === 'object' && userSelections.origin !== null;
  const originName = originIsObject ? (userSelections.origin as Origin).name : userSelections.origin;
  const originDesc = originIsObject ? (userSelections.origin as Origin).description : '(随机出身,需AI根据世界背景创造性生成)';

  const spiritRootName = typeof userSelections.spiritRoot === 'object' ? userSelections.spiritRoot.name : userSelections.spiritRoot;
  const spiritRootTier = typeof userSelections.spiritRoot === 'object' ? userSelections.spiritRoot.tier : '';
  const spiritRootDesc = typeof userSelections.spiritRoot === 'object' ? userSelections.spiritRoot.description : '(随机灵根,需AI根据天资等级创造性生成)';

  const talentsList = userSelections.talents.length > 0
    ? userSelections.talents.map(t => `  - **${t.name}**: ${t.description}`).join('\n')
    : '  无';

  const attributesText = Object.entries(userSelections.attributes)
    .map(([key, value]) => `  - ${key}: ${value}`)
    .join('\n');

  const continentsList = worldContext?.availableContinents
    ? worldContext.availableContinents.map((c: ContextItem) => `  - **${c.name || c.名称}**: ${c.description || c.描述}`).join('\n')
    : '  (未生成)';

  const locationsList = worldContext?.availableLocations?.slice(0, 10)
    ? worldContext.availableLocations.slice(0, 10).map((l: ContextItem) => `  - **${l.name || l.名称}** (${l.type || l.类型}): ${l.description || l.描述}`).join('\n')
    : '  (未生成)';

  // 地图坐标范围（经纬度系统）
  const minLng = worldContext?.mapConfig?.minLng || 100;
  const maxLng = worldContext?.mapConfig?.maxLng || 115;
  const minLat = worldContext?.mapConfig?.minLat || 25;
  const maxLat = worldContext?.mapConfig?.maxLat || 35;

  const mapCoordinateInfo = `
## 🗺️ 地图坐标系统 (CRITICAL - 必须严格遵守)
**坐标系统说明**:
- 本系统使用**经纬度坐标系统**（类似真实地理坐标）
- x 代表经度（Longitude），y 代表纬度（Latitude）
- 前端会自动将经纬度转换为显示坐标

**坐标范围**:
- **X 轴（经度）范围**: ${minLng} ~ ${maxLng}
- **Y 轴（纬度）范围**: ${minLat} ~ ${maxLat}

**坐标生成规则**:
- 位置坐标必须在上述经纬度范围内
- 推荐使用中心区域: X: ${(minLng + (maxLng - minLng) * 0.3).toFixed(1)} ~ ${(minLng + (maxLng - minLng) * 0.7).toFixed(1)}, Y: ${(minLat + (maxLat - minLat) * 0.3).toFixed(1)} ~ ${(minLat + (maxLat - minLat) * 0.7).toFixed(1)}
- 避免使用边缘坐标

**示例坐标**:
- 中心位置: {x: ${((minLng + maxLng) / 2).toFixed(1)}, y: ${((minLat + maxLat) / 2).toFixed(1)}}
- 东部区域: {x: ${(minLng + (maxLng - minLng) * 0.7).toFixed(1)}, y: ${((minLat + maxLat) / 2).toFixed(1)}}
- 西部区域: {x: ${(minLng + (maxLng - minLng) * 0.3).toFixed(1)}, y: ${((minLat + maxLat) / 2).toFixed(1)}}
- 北部区域: {x: ${((minLng + maxLng) / 2).toFixed(1)}, y: ${(minLat + (maxLat - minLat) * 0.3).toFixed(1)}}
- 南部区域: {x: ${((minLng + maxLng) / 2).toFixed(1)}, y: ${(minLat + (maxLat - minLat) * 0.7).toFixed(1)}}
`;

  const nsfwMode = worldContext?.systemSettings?.nsfwMode;
  const nsfwFilter = worldContext?.systemSettings?.nsfwGenderFilter || 'female';
  let nsfwRuleText = `
[错误] **NSFW模式已禁用**
→ 所有NPC都不生成私密信息
→ 不生成玩家身体部位开发
`;
  if (nsfwMode) {
    if (nsfwFilter === 'female') {
      nsfwRuleText = `
[正确] **NSFW模式已启用 - 仅女性**
→ 所有女性NPC必须包含完整的12字段"私密信息"
→ 男性NPC不生成私密信息
→ 为玩家生成3-5个身体部位开发数据
`;
    } else if (nsfwFilter === 'male') {
      nsfwRuleText = `
[正确] **NSFW模式已启用 - 仅男性**
→ 所有男性NPC必须包含完整的12字段"私密信息"
→ 女性NPC不生成私密信息
→ 为玩家生成3-5个身体部位开发数据
`;
    } else {
      nsfwRuleText = `
[正确] **NSFW模式已启用 - 所有性别**
→ 所有NPC(无论性别)都必须包含完整的12字段"私密信息"
→ 为玩家生成2-4个身体部位开发数据
`;
    }
  }

  const selectionsSummary = `
# [重要] 玩家角色创建数据 (详细信息)

## 基础信息
- 姓名: ${userSelections.name}
- 性别: ${userSelections.gender}
- 种族: ${userSelections.race}
- 开局年龄: ${userSelections.age}岁

---
## 世界背景 🌍 (开局故事必须基于此构建)
- 世界名称: ${worldName}
- 世界时代: ${worldEra}
- [重要] **世界描述**: ${worldDesc}

---
## 天资等级 ✨ (角色资质必须符合此描述)
- 天资名称: ${talentTierName}
- [重要] **天资描述**: ${talentTierDesc}

---
## 出身背景 👤 (开局故事核心)
- 出身名称: ${originName}
- [重要] **出身描述**: ${originDesc}

---
## 灵根资质 🔥 (修炼天赋必须体现此描述)
- 灵根名称: ${spiritRootName}
- 灵根品级: ${spiritRootTier}
- [重要] **灵根描述**: ${spiritRootDesc}

---
## 天赋列表 🎁 (必须在开局故事或数据中体现)
${talentsList}

---
## 先天六司 📊
${attributesText}

---
## 可用地点参考 🗺️
- **可用大陆**:
${continentsList}
- **主要地点**:
${locationsList}
**重要**: 位置设置必须从这些地点中选择!

---
${mapCoordinateInfo}

---
## [重要][重要] 系统设置 (NSFW内容生成控制) [重要][重要]
**当前系统配置 (必须严格遵守)**:
- **nsfwMode**: ${nsfwMode ? 'true (已启用)' : 'false (已禁用)'}
- **nsfwGenderFilter**: ${nsfwFilter}

**生成规则 (最高优先级)**:
${nsfwRuleText}
🚨 **严重警告**: 未按照上述设置生成私密信息将被视为任务失败!

---
## [重要][重要][重要] 输出格式要求 (极其重要!) [重要][重要][重要]
你必须输出一个纯JSON对象,不要使用markdown代码块!
\`\`\`json
{
  "text": "1200-2500字的开局故事...",
  "mid_term_memory": "text的缩短版（必填，不能为空）",
  "tavern_commands": [
    {"action": "set", "key": "玩家角色状态.位置", "value": {...}},
    ...
  ]
}
\`\`\`
`;

  return selectionsSummary;
}

/**
 * 构建角色初始化的系统提示词
 */
export function buildCharacterInitializationPrompt(): string {
  // 使用 assembleSystemPrompt 获取完整的通用规则（不包含COT，因为初始化有专用COT）
  const basePrompt = assembleSystemPrompt([]);

  // 添加角色初始化专用的COT和规则
  return `${basePrompt}

---

# 任务:角色初始化 (生成开局故事)

${characterInitializationCotPrompt}

---

## 1. 【强制JSON响应格式】- 最高优先级
你必须返回一个有效的、纯粹的JSON对象，格式如下：
\`\`\`json
{
  "text": "1200-2500字的沉浸式开局故事",
  "mid_term_memory": "开局事件的简短摘要（必填，不能为空）",
  "tavern_commands": [
    {"action": "set", "key": "游戏时间.年", "value": 1000}
  ]
}
\`\`\`
- **关键要求**: 必须是纯JSON，不带任何Markdown标记或解释性文字。\`tavern_commands\` 必须是数组。

---

## 2. 【开局故事 (text)】
生成1200-2500字的沉浸式开场，体现角色的出身、天赋和所处环境。
- **叙事要求**: 通过行为和感受来展现角色特质，禁止直接提及游戏术语。
- **一致性**: 故事内容必须与玩家的选择完全匹配。
- **年龄**: 严格从玩家选择的开局年龄开始。

---

## 3. 【初始世界状态 (tavern_commands)】
根据开局故事，通过commands添加初始实体。**命令必须按以下顺序执行**：

### 第1步：时间设置 (最优先)
- 设置 \`游戏时间\` 和 \`角色基础信息.出生日期.年\`。
- 出生年 = 游戏年份 - 角色年龄。

### 第2步：位置设置 (必需)
- 设置 \`玩家角色状态.位置\`，包含 \`描述\`, \`x\`, \`y\`。
- 必须从提供的可用大陆和地点中选择。

### 第3步：声望设置 (必需)
- 设置 \`玩家角色状态.声望\` (参考范围: 普通0-10, 宗门10-50, 名门50-100)。

### 第4步：随机项替换 (如果需要)
- 如果灵根或出身包含"随机"，必须使用 \`set\` 命令将其替换为具体内容。

### 第5步：初始资源 (必需)
- 设置 \`背包.灵石\` (参考范围: 贫困0-50, 普通20-100, 富裕100-500+)。
- 添加1-6件初始物品和0-3部功法。

### 第6步：NPC创建 (可选, 0-3个)
- **核心原则**: 只生成开局文本中明确提到的、有互动的重要人物。严禁凭空编造。
- 如果文本只是泛泛提到"路人"或无人提及，则不创建NPC。

### 第7步：大道解锁 (如果天赋对应)
- 如果天赋与某个大道相关，使用 \`set\` 命令解锁该大道。

---

# 角色初始化规则
${CHARACTER_INIT_RULES}
`.trim();
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
