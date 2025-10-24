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
import { DATA_STRUCTURE_DEFINITIONS } from './dataStructureDefinitions';

// =====================================================================
// 角色初始化专用规则
// =====================================================================

const CHARACTER_INIT_RULES = `
## 🎯 角色初始化核心要求

### 1. 数据路径规范(最高优先级)

**所有命令的key路径必须严格匹配【数据结构定义】**

✅ **正确路径示例:**
- \`角色基础信息.出生日期.年\` - 唯一允许修改的基础信息字段
- \`玩家角色状态.位置\` - 玩家位置对象(必须包含描述、x、y三个字段)
- \`背包.灵石.下品\` - 背包字段
- \`人物关系.张三\` - NPC对象
- \`身体部位开发.胸部\` - 玩家身体部位(NSFW)

❌ **常见错误(严禁使用):**
- \`玩家角色状态.基础信息.姓名\` - 路径不存在
- \`人物卡.千璃\` - 应为"人物关系"

**NPC创建铁律:**
- ✅ 使用\`set\`创建完整NPC对象: \`{"action":"set","key":"人物关系.张三","value":{完整对象}}\`
- ❌ 不能直接设置NPC子字段: \`{"action":"set","key":"人物关系.张三.称呼","value":"..."}\`
- 必须先创建完整NPC,之后才能用\`add\`/\`push\`/\`set\`修改其子字段

**只读字段约束:**
- ❌ 严禁修改\`角色基础信息\`下的字段(除了\`出生日期.年\`)
- ✅ 玩家选择的数据(名字、性别、天资、灵根、天赋)已存在且不可更改

---

### 2. 随机选项处理(强制执行)

#### 随机灵根检测与替换
**触发条件:** 灵根字段值为"随机灵根"或包含"随机"

**执行步骤:**
1. 根据天资等级选择灵根品级:
   - 废柴/凡人 → 凡品、下品
   - 俊杰 → 中品、上品
   - 天骄 → 上品、极品
   - 妖孽 → 极品(神品禁止随机)
2. 创造符合世界背景的独特灵根
3. 使用命令替换:
\`\`\`json
{"action":"set","key":"角色基础信息.灵根","value":{
  "名称":"五行混沌根",
  "品级":"极品",
  "描述":"...",
  "属性":["金","木","水","火","土"],
  "修炼加成":200
}}
\`\`\`

#### 随机出身检测与替换
**触发条件:** 出生字段值为"随机出身"或包含"随机"

**执行步骤:**
1. 根据世界背景创造独特出身
2. 确保与世界设定、性别、天资匹配
3. 使用命令替换:
\`\`\`json
{"action":"set","key":"角色基础信息.出生","value":{
  "名称":"修仙世家传人",
  "描述":"出生于传承千年的修仙世家..."
}}
\`\`\`

🚨 **警告:** 未替换随机选项视为任务失败!替换命令必须放在时间设置之后、NPC创建之前。

---

### 3. 位置与命名规范

**位置格式:**
- 使用\`set\`操作更新整个\`玩家角色状态.位置\`对象
- 描述: "世界名·大陆名·地点名·具体地点"(最多3层,用·分隔)
- 必须从\`availableContinents\`和\`availableLocations\`中选择
- 必须同时设置\`描述\`、\`x\`、\`y\`三个字段
- 命令示例: \`{"action":"set","key":"玩家角色状态.位置","value":{"描述":"青云大陆·青云宗","x":115.23,"y":35.67}}\`

**命名风格一致性:**
- 现代世界: 张伟、XX市图书馆、XX研究中心
- 仙侠世界: 清虚道长、炼丹阁、青云宗

---

### 4. 初始资源范围

- **灵石:** 凡人(0-10)、小康(10-50)、宗门弟子(50-200)
- **物品:** 2-5件
- **NPC:** 0-3个
- **功法:** 0-2部

---

### 5. 叙事要求

- **篇幅:** 1200-2500字沉浸式开场
- **风格:** 通过行为和感受展现特质,禁止直接提及游戏术语(背包、系统等)
- **年龄:** 严格按玩家选择的年龄开始,禁止修改寿命或时间跳跃
- **格式:** 遵守FORMAT_MARKERS规则(见主提示词)

---

### 6. NSFW私密信息生成(条件性)

#### 生成规则(根据systemSettings)

**1. nsfwMode=true 且 nsfwGenderFilter="female"**
→ 女性NPC必须包含完整"私密信息"(13字段)
→ 男性NPC不生成

**2. nsfwMode=true 且 nsfwGenderFilter="male"**
→ 男性NPC必须包含完整"私密信息"
→ 女性NPC不生成

**3. nsfwMode=true 且 nsfwGenderFilter="all"**
→ 所有NPC必须包含完整"私密信息"

**4. nsfwMode=false**
→ 所有NPC都不生成私密信息

#### NPC私密信息必填字段(13个)

1. 是否为处女/处男 (boolean)
2. 身体部位 (array) - 每个对象含:部位名称、开发度、敏感度、特征描述、特殊印记
3. 性格倾向 (string)
4. 性取向 (string)
5. 性癖好 (array)
6. 性渴望程度 (number, 0-100)
7. 当前性状态 (string)
8. 体液分泌状态 (string)
9. 性交总次数 (number)
10. 性伴侣数量 (number)
11. 性伴侣名单 (array)
12. 最近一次性行为时间 (string)
13. 特殊体质 (array)

**逻辑一致性:**
- 处女/处男=true时: 性交总次数=0,性伴侣数量=0,性伴侣名单=[],最近一次="无"
- 性伴侣数量必须等于性伴侣名单.length

#### 玩家身体部位开发(极简结构)

**触发条件:** nsfwMode=true时为玩家生成3-5个核心部位
**存储路径:** \`身体部位开发\`(根级别)
**结构:** \`{"部位名": {"特征描述": "..."}}\`
**命令示例:** \`{"action":"set","key":"身体部位开发.胸部","value":{"特征描述":"..."}}\`

❌ **严禁:** 为玩家创建完整\`私密信息\`对象或使用\`玩家角色状态.私密信息\`路径

🚨 **警告:** 未按systemSettings生成私密信息视为任务失败!
`.trim();

export const CHARACTER_INITIALIZATION_PROMPT = `
# 任务:角色初始化 (生成开局故事)

## ⚠️ 【强制响应格式】- 最高优先级

你必须返回一个有效的JSON对象，格式如下：

\`\`\`json
{
  "text": "1200-2500字的沉浸式开局故事",
  "mid_term_memory": "开局事件的简短摘要",
  "tavern_commands": [
    {"action": "set", "key": "游戏时间.年", "value": 1000},
    {"action": "set", "key": "角色基础信息.出生日期.年", "value": 982}
  ]
}
\`\`\`

### 🚨 关键要求：
1. **必须是纯JSON** - 不要在JSON前后添加任何说明文字或markdown代码块标记
2. **text字段必填** - 必须是1200-2500字的开局故事
3. **tavern_commands必须是数组** - 即使只有一条指令也要用 \`[{...}]\` 包裹
4. **所有字符串用双引号** - 不能用单引号
5. **不要有尾随逗号** - JSON最后一个元素后不能有逗号

---

# 1. 开局故事 (text)

生成1200-2500字的沉浸式开场,体现角色的出身、天赋和所处环境。

- **叙事要求**: 通过行为和感受来展现角色特质,禁止直接提及"根骨"、"灵根"等游戏术语。例如:高根骨体现为体魄强健,高悟性体现为领悟力超群。
- **一致性**: 故事内容必须与玩家的选择完全匹配,积极体现其特点和优势。
- **年龄**: 从玩家选择的开局年龄开始,禁止修改寿命,禁止时间跳跃。
- **格式**: 遵守FORMAT_MARKERS文本格式规则。
  - 环境描写: \`【...】\`
  - 内心思考: \`...\`
  - 角色对话: \`"..."\`
  - 系统判定: \`〖判定类型:结果〗\`

---

# 2. 初始世界状态 (tavern_commands)

根据开局故事,通过commands添加初始实体。**命令必须按以下顺序执行**：

## ✅ 初始化检查清单 (按顺序执行)

### 第1步：时间设置 (最优先，必须最先执行)
\`\`\`json
{"action":"set","key":"游戏时间","value":{"年":1000,"月":3,"日":15,"小时":6,"分钟":0}}
{"action":"set","key":"角色基础信息.出生日期.年","value":982}
\`\`\`
- 仙侠世界用仙历年份(如1000年)，都市世界用公元年份(如2024年)
- 出生年 = 游戏年份 - 角色年龄

### 第2步：位置设置 (必需)
\`\`\`json
{"action":"set","key":"玩家角色状态.位置","value":{"描述":"世界名·大陆名·地点名","x":500,"y":300}}
\`\`\`
- 必须从提供的可用大陆和地点中选择
- 描述、x、y三个字段必须同时设置

### 第3步：声望设置 (必需)
\`\`\`json
{"action":"set","key":"玩家角色状态.声望","value":0}
\`\`\`
- 普通出身：0-10
- 宗门弟子：10-50
- 名门之后：50-100

### 第4步：随机项替换 (如果需要)
如果灵根或出身是"随机"，必须用set命令替换：
\`\`\`json
{"action":"set","key":"角色基础信息.灵根","value":{"名称":"...","品级":"...","描述":"...","属性":[],"修炼加成":100}}
{"action":"set","key":"角色基础信息.出生","value":{"名称":"...","描述":"..."}}
\`\`\`

### 第5步：初始资源 (必需)
\`\`\`json
{"action":"set","key":"背包.灵石","value":{"下品":100,"中品":0,"上品":0,"极品":0}}
{"action":"set","key":"背包.物品.item_001","value":{完整物品对象}}
\`\`\`
- 灵石总量：凡人(0-10)、小康(10-50)、宗门弟子(50-200)
- 物品：2-5件(装备、丹药、材料等)
- 功法：0-2部

### 第6步：NPC创建 (可选，0-3个)
\`\`\`json
{"action":"set","key":"人物关系.张三","value":{完整NPC对象，包含所有必填字段}}
\`\`\`
- 必须创建完整的NPC对象，不能只设置部分字段
- 如果nsfwMode=true且性别符合过滤条件，必须包含完整的13字段"私密信息"

### 第7步：大道解锁 (如果天赋对应某大道)
\`\`\`json
{"action":"set","key":"三千大道.大道列表.剑道","value":{"道名":"剑道","描述":"...","是否解锁":true,"当前阶段":0,"当前经验":0,"总经验":0,"阶段列表":[...]}}
\`\`\`

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

  const nsfwMode = worldContext?.systemSettings?.nsfwMode;
  const nsfwFilter = worldContext?.systemSettings?.nsfwGenderFilter || 'female';
  let nsfwRuleText = `
❌ **NSFW模式已禁用**
→ 所有NPC都不生成私密信息
→ 不生成玩家身体部位开发
`;
  if (nsfwMode) {
    if (nsfwFilter === 'female') {
      nsfwRuleText = `
✅ **NSFW模式已启用 - 仅女性**
→ 所有女性NPC必须包含完整的13字段"私密信息"
→ 男性NPC不生成私密信息
→ 为玩家生成3-5个身体部位开发数据
`;
    } else if (nsfwFilter === 'male') {
      nsfwRuleText = `
✅ **NSFW模式已启用 - 仅男性**
→ 所有男性NPC必须包含完整的13字段"私密信息"
→ 女性NPC不生成私密信息
→ 为玩家生成3-5个身体部位开发数据
`;
    } else {
      nsfwRuleText = `
✅ **NSFW模式已启用 - 所有性别**
→ 所有NPC(无论性别)都必须包含完整的13字段"私密信息"
→ 为玩家生成2-4个身体部位开发数据
`;
    }
  }

  const selectionsSummary = `
# 🔴 玩家角色创建数据 (详细信息)

## 基础信息
- 姓名: ${userSelections.name}
- 性别: ${userSelections.gender}
- 开局年龄: ${userSelections.age}岁

---
## 世界背景 🌍 (开局故事必须基于此构建)
- 世界名称: ${worldName}
- 世界时代: ${worldEra}
- 🔴 **世界描述**: ${worldDesc}

---
## 天资等级 ✨ (角色资质必须符合此描述)
- 天资名称: ${talentTierName}
- 🔴 **天资描述**: ${talentTierDesc}

---
## 出身背景 👤 (开局故事核心)
- 出身名称: ${originName}
- 🔴 **出身描述**: ${originDesc}

---
## 灵根资质 🔥 (修炼天赋必须体现此描述)
- 灵根名称: ${spiritRootName}
- 灵根品级: ${spiritRootTier}
- 🔴 **灵根描述**: ${spiritRootDesc}

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
## 🔴🔴 系统设置 (NSFW内容生成控制) 🔴🔴
**当前系统配置 (必须严格遵守)**:
- **nsfwMode**: ${nsfwMode ? 'true (已启用)' : 'false (已禁用)'}
- **nsfwGenderFilter**: ${nsfwFilter}

**生成规则 (最高优先级)**:
${nsfwRuleText}
🚨 **严重警告**: 未按照上述设置生成私密信息将被视为任务失败!

---
## 🔴🔴🔴 输出格式要求 (极其重要!) 🔴🔴🔴
你必须输出一个纯JSON对象,不要使用markdown代码块!
\`\`\`json
{
  "text": "1200-2500字的开局故事...",
  "mid_term_memory": "text的缩短版",
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