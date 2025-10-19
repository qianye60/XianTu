/**
 * @fileoverview 角色初始化AI提示词
 * 精简高效，减少AI理解负担。
 */

import { DATA_STRUCTURE_DEFINITIONS } from './dataStructureDefinitions';
import { REALM_STAGE_RULE, NSFW_RULE } from './sharedRules';

// 角色初始化专用规则
const CHARACTER_INIT_RULES = [
  '# 任务：生成开局故事并初始化世界',
  '',
  '## 1. 随机选项处理',
  '检测到"随机灵根"或"随机出身"时必须替换为具体内容。灵根根据天资等级选择品级，出身根据世界背景选择。text和commands中禁止出现"随机"字样。',
  '',
  '## 2. 玩家选择不可更改',
  '玩家已选的具体灵根或出身，严禁使用commands进行修改。',
  '',
  '## 3. 位置设置 ⚠️ 必须完成',
  '**必须**在tavern_commands中设置位置，这是初始化的核心步骤！',
  '位置格式必须为 "大陆名·地点名" 或 "大陆名·区域·地点名"。',
  '地点必须从可用的`availableContinents`和`availableLocations`中选择，禁止编造。',
  '命令示例: {"action":"set","key":"玩家角色状态.位置.描述","value":"青云大陆·青云宗·外门"}',
  '如果故事中提到了具体建筑或区域，也应该包含在位置中（最多3层）。',
  '',
  '## 4. 物品创建流程',
  '先创建物品到背包，然后装备栏引用该物品ID，最后标记物品为已装备状态。',
  '',
  '## 5. 开局年龄',
  '严格按照玩家选择的年龄开始游戏。禁止修改寿命，禁止时间跳跃。',
  '',
  '## 6. 初始资源范围',
  '灵石: 凡人(0-10), 小康(10-50), 宗门弟子(50-200)。',
  '物品: 2-5件。',
  'NPC: 0-3个。',
  '功法: 0-2部。',
  '',
  '## 7. 叙事要求',
  '生成1200-2500字的沉浸式开场故事。通过行为暗示角色特质，禁止直接提及游戏术语。纯叙事，不加时间标记。',
  '',
  REALM_STAGE_RULE,
  '',
  NSFW_RULE,
  '',
  '## 8. 玩家身体部位初始化（NSFW模式）',
  '当nsfwMode=true时，必须初始化玩家的身体部位开发数据（3-5个核心部位）。',
  '使用命令格式: {"action":"set","key":"身体部位开发.部位名称","value":{"描述":"...","开发等级":0-20,"敏感度":20-50,"特殊标记":""}}',
  '初始状态应该是未开发或轻度开发，开发等级0-20，敏感度20-50。',
  '根据玩家性别选择合适的部位（女性：乳房、乳头、阴蒂、阴道、肛门等；男性：阴茎、龟头、睾丸、肛门等）。',
].join('\n');

export const CHARACTER_INITIALIZATION_PROMPT = `
# 任务：角色初始化 (生成开局故事)

## 🔴 核心指令 (必须严格遵守，否则程序会崩溃)

1.  **输出格式**: 你的输出必须是一个纯JSON对象，不能有markdown代码块标记。
    - ✅ 正确：直接输出 {"text": "...", "mid_term_memory": "...", "tavern_commands": [...]}
    - ❌ 错误：\`\`\`json {...} \`\`\` （不要使用代码块标记）
    - ❌ 错误：在JSON前后添加任何说明文字
2.  **时间规则**: **禁止推进时间**。这是一个开局任务，不要包含任何 "游戏时间.分钟" 的命令。
3.  **JSON铁律**: 绝对禁止使用注释、尾随逗号、单引号。所有字符串必须用双引号。
4.  **必需字段**: JSON对象必须包含 \`text\`, \`mid_term_memory\`, \`tavern_commands\` 三个字段。
5.  **字段值要求**:
    - text: 必须是1200-2500字的详细开局故事字符串
    - mid_term_memory: 简短的记忆摘要字符串
    - tavern_commands: 必须是数组，包含至少一个位置设置命令

---

## 🔴 输出结构模板 (必须严格遵循此结构)

你的完整输出应该是这样的纯JSON（没有代码块标记）：

{
  "text": "这里是1200-2500字的沉浸式开局故事...",
  "mid_term_memory": "角色创建完成，故事即将开始。",
  "tavern_commands": [
    {"action": "set", "key": "玩家角色状态.位置.描述", "value": "大陆名·区域·地点名"},
    {"action": "set", "key": "背包.灵石.下品", "value": 50}
  ]
}

---

## 🔴 发送前自查清单 (必须逐项检查)

1.  **JSON有效性**: 我的输出是单个、完整的、没有语法错误的JSON吗？
2.  **必需字段**: \`text\`, \`mid_term_memory\`, \`tavern_commands\` 是否都存在？
3.  **时间命令**: 我是否**没有**添加任何关于 "游戏时间.分钟" 的命令？
4.  **位置命令**: \`tavern_commands\` 的第一条命令是否是设置 "玩家角色状态.位置.描述"？
5.  **引号**: 所有key和字符串value是否都使用了双引号？
6.  **逗号**: 列表或对象中的最后一项后面是否没有尾随逗号？
7.  **🔴 完整描述检查**: 我是否阅读并使用了玩家选择数据JSON中每个对象的"描述"字段，而不仅仅是"名称"字段？
8.  **🔴 世界背景检查**: 开局故事是否体现了"世界信息.描述"中的详细世界观？
9.  **🔴 出身背景检查**: 开局故事是否体现了"出身.描述"中的完整身份背景？
10. **🔴 天资体现检查**: 开局故事是否根据"天资.描述"合理展现了角色的资质水平？

---

# 1. 开局故事 (text)

生成1200-2500字的沉浸式开场，体现角色的出身、天赋和所处环境。

**核心原则**：
- **严格遵循玩家选择**：所有内容必须完全基于玩家在角色创建时的选择
- **尊重玩家意图**：玩家可以选择任何生活方式，不强制修仙或冒险
- **开放性叙事**：这个世界的物理规则是修仙体系，但玩家可以选择成为修士、凡人、商人、学者等任何角色

**叙事要求**:
- 通过行为和感受来展现角色特质，禁止直接提及"根骨"、"灵根"等游戏术语
- 例如：高根骨体现为体魄强健，高悟性体现为领悟力超群，神品灵根可能伴随天地异象

**一致性**: 故事内容必须与玩家的选择完全匹配，积极体现其特点和优势

**年龄**: 从玩家选择的开局年龄开始，禁止修改寿命，禁止时间跳跃

**格式**: 纯叙事，不包含时间标记

---

# 2. 初始世界状态 (tavern_commands)

根据开局故事，通过commands添加初始实体。

## 数据同步规则 (最高优先级)

**核心原则**: text字段描述的数据变化，必须在tavern_commands字段中完全对应实现。

## 强制检查清单
- ✅ **位置设置**: 必须作为第一个命令！格式: {"action":"set","key":"玩家角色状态.位置.描述","value":"大陆名·地点名"}
- ✅ **物品获得**: 初始2-5件物品，使用set命令添加到背包，提供完整物品结构
- ✅ **初始灵石**: 根据出身设置合理数量 (凡人0-10, 小康10-50, 宗门弟子50-200)
- ✅ **NPC创建**: 0-3个与故事相关的NPC，使用完整结构
- ✅ **大道解锁**: 如果天赋与某个大道对应，则解锁该大道

## 操作类型与常用示例

| Action | 用途 | 示例 |
|---|---|---|
| set | 替换/设置整个字段 | 位置, 物品, NPC |
| add | 增减数值 | 灵石, 时间 |
| push | 添加到数组末尾 | 记忆, 状态 |
| delete | 删除字段 | 物品 |
| pull | 从数组中移除 | 任务 |

### 位置设置 (必需，且必须是第一条命令)
\`\`\`json
{"action": "set", "key": "玩家角色状态.位置.描述", "value": "青云大陆·青云宗·外门"}
\`\`\`

### 灵石设置
\`\`\`json
{"action": "set", "key": "背包.灵石.下品", "value": 50}
{"action": "set", "key": "背包.灵石.中品", "value": 5}
\`\`\`

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

### NPC创建 (简化版 - 保证格式正确)
\`\`\`json
{
  "action": "set",
  "key": "人物关系.李师兄",
  "value": {
    "名字": "李师兄",
    "性别": "男",
    "年龄": 25,
    "外貌描述": "剑眉星目，气宇轩昂",
    "境界": {"名称": "筑基", "阶段": "中期"},
    "与玩家关系": "师兄弟",
    "好感度": 50,
    "当前位置": "青云大陆·青云宗",
    "背包": {},
    "记忆": []
  }
}
\`\`\`

## 必须字段要求 (初始化阶段)

**物品**: 物品ID, 名称, 类型, 品质, 数量, 描述
**NPC (简化)**: 名字, 性别, 年龄, 外貌描述, 境界, 与玩家关系, 好感度, 当前位置, 背包, 记忆
**位置**: 描述("大陆名·地点名")  // 初始化阶段只需要描述字符串
**境界**: 名称, 阶段 (凡人境界阶段为空字符串"")

## 品质标准
- quality (品质) 的有效值: 凡, 黄, 玄, 地, 天, 仙, 神
- grade (品级) 的有效值: 0到10的整数
- 正确示例: {"quality":"玄","grade":5}
- 错误示例: {"quality":"玄品","grade":"五"}

## 🔴 发送前自查清单

在发送响应前，必须检查:
1. ✅ JSON格式是否100%正确？(无注释、无尾随逗号、使用双引号)
2. ✅ text, mid_term_memory, tavern_commands 三个必需字段都存在？
3. ✅ text字段是否≥1200字？
4. ✅ mid_term_memory是否包含了核心事件总结？
5. ✅ tavern_commands的第一条命令是否是位置设置？
6. ✅ 所有物品、NPC是否包含了全部必填字段？
7. ✅ 数字类型字段是否使用了数字而不是字符串？
8. ✅ 品质格式是否正确？(quality和grade)

---

# 角色初始化规则

${CHARACTER_INIT_RULES}

---

# 数据结构

${DATA_STRUCTURE_DEFINITIONS}
`.trim();

/**
 * 构建角色初始化的完整提示词结构
 * @param userSelections - The player's choices during character creation.
 * @param worldContext - The world information including continents and locations.
 * @returns 分离的提示词结构：系统提示、世界书、用户消息
 */
export function buildCharacterInitializationPrompt(
  userSelections: {
    name: string;
    gender: string;
    age: number;
    world: string;
    talentTier: any;
    origin: any;
    spiritRoot: any;
    talents: any[];
    attributes: Record<string, number>;
  },
  worldContext?: {
    worldInfo?: any;
    availableContinents?: any[];
    availableLocations?: any[];
    mapConfig?: any;
    systemSettings?: any;
  }
): string {

  /**
   * Formats a selection item into a detailed, AI-readable description.
   * Handles both Chinese and English property names robustly.
   */
  const formatItem = (value: any): string => {
    if (!value) return '无';

    if (typeof value === 'string') {
      if (value.includes('随机灵根')) {
        return `${value}\n    *   AI必须处理: 这是一个随机选项，必须在生成故事前将其替换为具体的灵根。`;
      }
      if (value.includes('随机出生')) {
        return `${value}\n    *   AI必须处理: 这是一个随机选项，必须在生成故事前将其替换为具体的出身。`;
      }
      return String(value);
    }

    if (typeof value !== 'object' || value === null) return String(value);

    const name = value.name || value.名称;
    const description = value.description || value.描述;

    let title = name || '';
    const details: string[] = [];

    // Handle different object structures by checking for their unique properties
    const tier = value.tier ?? value.品级;
    if (name && tier !== undefined) { // Spirit Root
      title = `${name}(${tier})`;
      if (description) details.push(`描述: ${description}`);
    } else if (name && description) { // Common pattern for Talent, Origin, TalentTier
      title = name;
      details.push(`详细描述: ${description}`);
      if (typeof value.total_points === 'number') { // TalentTier
        details.push(`天赋点数: ${value.total_points}`);
      }
      if (value.attribute_modifiers) { // Origin
        const modifiers = Object.entries(value.attribute_modifiers)
          .map(([attr, val]) => `${attr}${Number(val) > 0 ? '+' : ''}${val}`)
          .join(', ');
        if (modifiers) details.push(`属性影响: ${modifiers}`);
      }
      if (typeof value.talent_cost === 'number') { // Talent
        details.push(`消耗点数: ${value.talent_cost}`);
      }
    }

    if (title) {
      const formattedDetails = details.map(d => `*   ${d}`);
      return [title, ...formattedDetails].join('\n    ');
    }

    // Fallback for any other object structure that doesn't fit the patterns
    const fallbackJson = JSON.stringify(value, null, 2);
    return fallbackJson.length > 500 ? `\`\`\`json\n${fallbackJson.substring(0, 500)}...\n\`\`\`` : `\`\`\`json\n${fallbackJson}\n\`\`\``;
  };

  // ============================================================
  // 🔴 关键修复：直接提取并呈现描述信息给AI
  // ============================================================

  // 1. 世界信息
  const worldName = userSelections.world;
  const worldDesc = worldContext?.worldInfo?.描述 || worldContext?.worldInfo?.description || '未知世界背景';
  const worldEra = worldContext?.worldInfo?.时代 || worldContext?.worldInfo?.era || '未知时代';

  // 2. 天资信息
  const talentTierName = userSelections.talentTier?.名称 || userSelections.talentTier?.name || '未知';
  const talentTierDesc = userSelections.talentTier?.描述 || userSelections.talentTier?.description || '';

  // 3. 出身信息
  const originName = typeof userSelections.origin === 'string'
    ? userSelections.origin
    : (userSelections.origin?.名称 || userSelections.origin?.name || '未知');
  const originDesc = typeof userSelections.origin === 'string'
    ? ''
    : (userSelections.origin?.描述 || userSelections.origin?.description || '');

  // 4. 灵根信息
  const spiritRootName = typeof userSelections.spiritRoot === 'string'
    ? userSelections.spiritRoot
    : (userSelections.spiritRoot?.名称 || userSelections.spiritRoot?.name || '未知');
  const spiritRootTier = userSelections.spiritRoot?.品级 || userSelections.spiritRoot?.tier || '';
  const spiritRootDesc = typeof userSelections.spiritRoot === 'string'
    ? ''
    : (userSelections.spiritRoot?.描述 || userSelections.spiritRoot?.description || '');

  // 5. 天赋列表
  const talentsList = userSelections.talents && userSelections.talents.length > 0
    ? userSelections.talents.map(t => {
        const tName = t.名称 || t.name || '未知天赋';
        const tDesc = t.描述 || t.description || '';
        return `  - **${tName}**：${tDesc}`;
      }).join('\n')
    : '  无';

  // 6. 先天六司
  const attributesText = Object.entries(userSelections.attributes)
    .map(([key, value]) => `  - ${key}: ${value}`)
    .join('\n');

  // 7. 可用大陆
  const continentsList = worldContext?.availableContinents?.map((c: any) => {
    const cName = c.名称 || c.name || '未知';
    const cDesc = c.描述 || c.description || '';
    return `  - **${cName}**：${cDesc}`;
  }).join('\n') || '  （未生成）';

  // 8. 主要地点
  const locationsList = worldContext?.availableLocations?.slice(0, 10).map((l: any) => {
    const lName = l.名称 || l.name || '未知';
    const lType = l.类型 || l.type || '';
    const lDesc = l.描述 || l.description || '';
    return `  - **${lName}** (${lType})：${lDesc}`;
  }).join('\n') || '  （未生成）';

  const selectionsSummary = `
# 🔴🔴🔴 重要提醒 🔴🔴🔴

**你必须输出纯JSON格式，不要使用markdown代码块！**

格式示例：
{"text": "故事内容...", "mid_term_memory": "摘要", "tavern_commands": [...]}

❌ 错误：\`\`\`json {...}\`\`\`
✅ 正确：直接输出JSON对象

---

# 🔴 玩家角色创建数据（详细信息） 🔴

## 基础信息
- **姓名**：${userSelections.name}
- **性别**：${userSelections.gender}
- **开局年龄**：${userSelections.age}岁

---

## 世界背景 🌍
- **世界名称**：${worldName}
- **世界时代**：${worldEra}
- **🔴 世界描述（必读）**：${worldDesc}

**要求**：开局故事必须完全基于这个世界描述构建世界观！

---

## 天资等级 ✨
- **天资名称**：${talentTierName}
- **🔴 天资描述（必读）**：${talentTierDesc}

**要求**：角色的资质表现必须符合这个天资描述！

---

## 出身背景 👤
- **出身名称**：${originName}
- **🔴 出身描述（必读）**：${originDesc || '（随机出身，需AI根据世界背景创造性生成）'}

**要求**：开局故事的核心背景必须基于这个出身描述！

---

## 灵根资质 🔥
- **灵根名称**：${spiritRootName}
- **灵根品级**：${spiritRootTier}
- **🔴 灵根描述（必读）**：${spiritRootDesc || '（随机灵根，需AI根据天资等级创造性生成）'}

**要求**：角色的修炼天赋必须体现这个灵根描述！

---

## 天赋列表 🎁
${talentsList}

**要求**：开局故事或初始化数据中必须体现这些天赋！

---

## 先天六司 📊
${attributesText}

---

## 可用大陆 🗺️
${continentsList}

---

## 主要地点 📍
${locationsList}

**重要**：位置设置必须从这些大陆和地点中选择（格式：大陆名·地点名）！

---

## 🔴 核心要求总结

✅ **正确**：使用完整描述构建故事（根据出身描述展开详细背景）

---

## 🔴🔴🔴 输出格式要求（极其重要！）🔴🔴🔴

**你必须输出一个纯JSON对象，格式如下：**

{
  "text": "1200-2500字的开局故事（必须体现上述所有描述信息）",
  "mid_term_memory": "简短摘要",
  "tavern_commands": [
    {"action": "set", "key": "玩家角色状态.位置.描述", "value": "大陆名·地点名"},
    其他命令...
  ]
}

**🚫 绝对禁止：**
- ❌ 使用 \`\`\`json 代码块标记
- ❌ 在JSON前后添加任何文字说明
- ❌ 使用注释、尾随逗号、单引号
- ❌ 遗漏任何必需字段（text, mid_term_memory, tavern_commands）
- ❌ tavern_commands不是数组
- ❌ 第一条命令不是位置设置

**✅ 必须做到：**
- ✅ 直接输出纯JSON对象（没有任何前缀或后缀）
- ✅ text字段包含1200-2500字的详细故事
- ✅ text必须体现世界描述、出身描述、天资描述、灵根描述
- ✅ tavern_commands第一条必须是位置设置
- ✅ 位置必须从上面的可用大陆和地点中选择
- ✅ 所有字符串使用双引号，数字不加引号

---
`;

  // 将完整的用户选择数据前置于核心指令之前
  return selectionsSummary + '\n' + CHARACTER_INITIALIZATION_PROMPT;
}

/**
 * 地点名称生成提示词
 */
export const LOCATION_NAME_GENERATION_PROMPT = `
# 任务：为大陆生成层级地点名

为大陆生成具体、有层级、有特色的地点名称。

**输入**:
\`\`\`json
INPUT_PLACEHOLDER
\`\`\`

**输出**:
\`\`\`json
{"location_name": "具体地点(不含大陆名)"}
\`\`\`

**要求**:
1. 2-3层级, 用"·"分隔, 从大到小 (例如: 区域·建筑·场所)。
2. 体现大陆特点 (修仙世界使用宗门/洞府, 都市世界使用建筑/街道)。
3. 只返回地点名，系统会自动拼接大陆名。
4. 必须是有效的JSON，无注释或额外文本。
`.trim();

export const GAME_START_INITIALIZATION_PROMPT = '';
