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
  '## 3. 位置设置',
  '位置格式必须为 "大陆名·地点名" 或 "大陆名·区域·地点名"。地点必须从可用的`availableContinents`和`availableLocations`中选择，禁止编造。',
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
].join('\n');

export const CHARACTER_INITIALIZATION_PROMPT = `
# 任务：角色初始化

生成修仙开局故事并初始化世界状态。

**输出格式**:
\`\`\`json
{
  "text": "1200-2500字开局故事",
  "mid_term_memory": "可选：50-100字核心事件总结",
  "tavern_commands": [{"action": "set", "key": "位置.描述", "value": "大陆·地点"}, ...]
}
\`\`\`

**要求**: JSON中禁止使用注释、尾随逗号和单引号。'text'字段长度必须大于等于1200字。'tavern_commands'为必需字段。

---

# 1. 开局故事 (text)

生成1200-2500字的沉浸式开场，体现角色的出身、天赋和所处环境。

**叙事**: 通过行为和感受来展现角色特质，禁止直接提及"根骨"、"灵根"等术语。例如，高根骨体现为体魄强健，高悟性体现为领悟力超群，神品灵根则可能伴随天地异象。

**一致性**: 故事内容必须与玩家的选择完全匹配，并积极体现其优势。

**年龄**: 从玩家选择的开局年龄开始，禁止修改寿命，禁止时间跳跃。

**格式**: 纯叙事，不包含时间标记。

---

# 2. 初始世界状态 (tavern_commands)

根据开局故事，通过commands添加初始实体。

**物品与灵石**: 初始2-5件物品，灵石数量根据出身背景决定 (凡人0-10, 小康10-50, 宗门弟子50-200)，物品品质需与出身匹配。

**NPC**: 初始0-3个与故事相关的NPC，使用简化格式。

**大道**: 如果天赋与某个大道对应，则解锁该大道。

---

# 角色初始化规则

${CHARACTER_INIT_RULES}

---

# 数据结构

${DATA_STRUCTURE_DEFINITIONS}

---

# 参考数据

以下是当前状态和参考信息:

提醒：位置必须从'availableContinents'和'availableLocations'中选择，禁止编造。

\`\`\`json
INPUT_PLACEHOLDER
\`\`\`
`.trim();

/**
 * Builds the final character initialization prompt by injecting a summary of user selections.
 * @param userSelections - The player's choices during character creation.
 * @returns A complete and dynamic prompt string for the AI.
 */
export function buildCharacterInitializationPrompt(userSelections: {
  name: string;
  gender: string;
  age: number;
  world: string;
  talentTier: any;
  origin: any;
  spiritRoot: any;
  talents: any[];
  attributes: Record<string, number>;
}): string {

  /**
   * Formats a selection item into a detailed, AI-readable description.
   * Matches the actual data structure precisely.
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

    if (typeof value !== 'object') return String(value);

    // Spirit Root Object (Chinese format)
    if (value.名称 && value.品级) {
      const desc = value.描述 || '';
      return `${value.名称}(${value.品级})${desc ? `\n    *   描述: ${desc}` : ''}`;
    }

    // Spirit Root Object (English format)
    if (value.name && value.tier && value.description !== undefined) {
      return `${value.name}(${value.tier})\n    *   描述: ${value.description}`;
    }

    // TalentTier Object
    if (value.name && value.description && typeof value.total_points === 'number') {
      return `${value.name}\n    *   详细描述: ${value.description}\n    *   天赋点数: ${value.total_points}`;
    }

    // Origin Object
    if (value.name && value.description && typeof value.talent_cost === 'number' && value.attribute_modifiers) {
      const modifiers = Object.entries(value.attribute_modifiers)
        .map(([attr, val]) => `${attr}${Number(val) > 0 ? '+' : ''}${val}`)
        .join(', ');
      return `${value.name}\n    *   详细描述: ${value.description}${modifiers ? `\n    *   属性影响: ${modifiers}` : ''}`;
    }

    // Talent Object
    if (value.name && value.description && typeof value.talent_cost === 'number' && !value.attribute_modifiers) {
      return `${value.name}\n    *   详细描述: ${value.description}\n    *   消耗点数: ${value.talent_cost}`;
    }

    // Generic Object { name, description }
    if (value.name && value.description) {
      return `${value.name}\n    *   详细描述: ${value.description}`;
    }

    // Generic Object (Chinese format) { 名称, 描述 }
    if (value.名称 && value.描述) {
      return `${value.名称}\n    *   详细描述: ${value.描述}`;
    }

    // Fallback for custom objects
    if (typeof value === 'object' && value !== null) {
      const entries = Object.entries(value);
      if (entries.length > 0) {
        const nameField = value.name || value.名称;
        let result = nameField ? `${nameField}\n` : '';
        entries.forEach(([key, val]) => {
          if (key !== 'name' && key !== '名称' && val !== null && val !== undefined) {
            let valueStr = '';
            if (typeof val === 'object') {
              const jsonStr = JSON.stringify(val);
              valueStr = jsonStr.length > 100 ? `${jsonStr.substring(0, 100)}...` : jsonStr;
            } else {
              valueStr = String(val);
              if (valueStr.length > 200) {
                valueStr = valueStr.substring(0, 200) + '...';
              }
            }
            result += `    *   ${key}: ${valueStr}\n`;
          }
        });
        const fallbackJson = JSON.stringify(value, null, 2);
        return result.trim() || (fallbackJson.length > 500 ? `${fallbackJson.substring(0, 500)}...` : fallbackJson);
      }
    }

    // Final fallback: stringify with length limit
    const finalJson = JSON.stringify(value, null, 2);
    return finalJson.length > 1000 ?
      `\`\`\`json\n${finalJson.substring(0, 1000)}...\n\`\`\`` :
      `\`\`\`json\n${finalJson}\n\`\`\``;
  };

  const formattedTalents = userSelections.talents && userSelections.talents.length > 0
    ? userSelections.talents.map(t => `*   天赋: ${formatItem(t)}`).join('\n')
    : '*   天赋: 无';

  const formattedAttributes = Object.entries(userSelections.attributes)
    .map(([key, value]) => `*   ${key}: ${value}`)
    .join('\n');

  const selectionsSummary = `
# 玩家核心选择

## 核心身份
*   姓名: ${userSelections.name}
*   性别: ${userSelections.gender}
*   开局年龄: ${userSelections.age}岁
*   世界: ${userSelections.world}

## 修行潜质
*   天资: ${formatItem(userSelections.talentTier)}
*   出身: ${formatItem(userSelections.origin)}
*   灵根: ${formatItem(userSelections.spiritRoot)}
${formattedTalents}

## 先天六司
${formattedAttributes}
---
`;

  const finalPrompt = CHARACTER_INITIALIZATION_PROMPT.replace(
    '# 玩家核心选择',
    selectionsSummary.replace('# 玩家核心选择', '# 角色核心设定参考（仅供创作参考，严禁直接复述）')
  );

  return finalPrompt;
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