/**
 * @fileoverview 角色初始化AI提示词 (v2.0 - 精简)
 * 专注于生成高质量的开局故事和初始状态。
 */

import { DATA_STRUCTURE_DEFINITIONS } from './dataStructureDefinitions';

// 角色初始化专用规则
const CHARACTER_INIT_RULES = [
  '# 角色初始化要点',
  '',
  '⚠️ **先创建后装备/修炼原则（最高优先级）**：',
  '',
  '## 装备和功法的正确流程',
  '1. **必须先创建物品/功法**：',
  '   - ⚠️ 重要：背包.物品是**对象结构**，不是数组！',
  '   - 在 tavern_commands 中，必须先使用 "set" 操作创建物品到 "背包.物品.物品ID"',
  '   - 格式：set "背包.物品.<物品ID>" = {完整物品对象}',
  '   - 物品ID和功法ID必须唯一且具体（如 "天蚕羽衣_初始装备"）',
  '   - 物品/功法必须包含完整的数据结构（名称、类型、品质、描述等）',
  '',
  '2. **然后才能装备/修炼**：',
  '   - 装备：先创建物品到背包.物品对象，再设置 "装备栏.装备N" 引用该物品ID',
  '   - 功法：先创建功法，再设置 "玩家角色状态.当前修炼功法" 引用该功法ID',
  '',
  '3. **严禁跳过创建步骤**：',
  '   - ❌ 错误示例：直接设置装备栏引用一个不存在的物品ID（会被系统清除）',
  '   - ✅ 正确示例（三步流程）：',
  '     ```',
  '     第1步: set "背包.物品.天蚕羽衣" = {物品ID:"天蚕羽衣", 名称:"天蚕羽衣", 类型:"装备", 品质:{...}, ...}',
  '     第2步: set "装备栏.装备4" = {物品ID:"天蚕羽衣", 名称:"天蚕羽衣"}',
  '     第3步: set "背包.物品.天蚕羽衣.已装备" = true',
  '     ```',
  '',
  '## 其他规则',
  '- 严禁修改角色基础信息（姓名、性别、年龄、先天六司等）',
  '- 必须生成具体的层级地理位置（大陆名·区域名·地点名）',
  '- 创建2-5件初始物品（衣服、武器、丹药等）',
  '- 创建1-2个初始功法（基础心法或高级功法，取决于出身）',
  '- 位置必须使用真实大陆名称（从世界信息.大陆信息中选择）',
  '- 必须生成地图坐标标记（在大陆边界范围内）',
].join('\n');

export const CHARACTER_INITIALIZATION_PROMPT = `
# 任务：角色初始化

你的任务是为玩家创作一个基于其选择的、个性化的修仙开局故事，并设定好世界的初始状态。

**输出格式要求**：必须严格按照以下JSON格式返回响应：
\`\`\`json
{
  "text": "⚠️ 必须1500-3000字的详细开局故事，包含环境描写、人物刻画、事件叙述等",
  "mid_term_memory": "可选：开局核心事件50-100字总结",
  "tavern_commands": [
    {"action": "set", "scope": "chat", "key": "character.saveData.玩家角色状态.位置.描述", "value": "大陆名·区域名·地点名"},
    {"action": "set", "scope": "chat", "key": "player_location_marker", "value": {"coordinates": {"longitude": 经度, "latitude": 纬度}}},
    {"action": "set", "scope": "chat", "key": "character.saveData.背包.物品.<物品ID>", "value": {完整物品对象}},
    {"action": "set", "scope": "chat", "key": "character.saveData.人物关系.<NPC名称>", "value": {完整NPC对象}},
    更多初始化指令...
  ]
}
\`\`\`

**⚠️ 关键要求**：
- \`text\` 字段是**必需的**，不能省略、不能为空、不能少于1500字
- \`tavern_commands\` 字段是**必需的**，必须包含位置、物品、NPC等初始化指令
- \`mid_term_memory\` 字段是可选的，用于总结开局核心事件
- **所有指令的key必须以 \`character.saveData.\` 开头**（除了 \`player_location_marker\`）

---

# 1. 开局故事 (text)

*   核心: 生成一段 1500-3000 字的沉浸式开场故事。
*   内容: 故事必须体现玩家选择的出身、天赋，并详细描绘角色当前所处的环境、心境和正在发生的事件。
*   **最高优先级规则 1：严格遵守开局年龄（禁止修改）**
    *   **必须**从玩家选择的 \`开局年龄\` 精确开始叙事。
    *   **严禁修改年龄**：不要通过 tavern_commands 修改 \`玩家角色状态.寿命.当前\`，系统已经设置好了！
    *   如果 \`开局年龄\` 为 0 岁，故事必须从角色**刚刚诞生**的时刻开始，例如描述出生时的异象、环境、家庭反应等。
    *   如果 \`开局年龄\` 为 18 岁，故事应该描述一个 18 岁青年的状态和环境。
    *   **严禁**在开局故事中进行任何形式的时间跳跃（例如"一晃六年过去了"）。故事的起点必须是指定的年龄。
*   **最高优先级规则 2：绝对的叙事一致性**
    *   故事**必须**与玩家选择的**所有**核心设定（天资、出身、灵根、天赋）完全一致，并积极、正面地体现这些设定的优势。
    *   **严禁**为了制造戏剧冲突而贬低、削弱或无视玩家选择的正面特质。例如，如果玩家选择了“神品灵根”，故事中就**绝对不能**出现“灵根是凡品”、“无法修炼”等负面描述。故事必须围绕这个“神品灵根”所带来的强大潜力和异象展开。
    *   将玩家的选择作为故事的核心驱动力，而不是可有可无的背景板。
*   要求: 遵循以下的通用叙事规则。
---

# 2. 初始世界状态 (tavern_commands)

*   核心: 根据故事内容，通过 \`tavern_commands\` 为世界添加初始实体。
*   内容:
    *   **位置格式规范**：**必须严格遵守以下格式**
        *   格式："大陆名称·具体位置"，可以使用多个 · 分隔表示层级关系
        *   示例："东胜神洲·花果山·水帘洞" 或 "天星大陆·玄天宗·外门" 或 "南域大陆·青云城"
        *   **重要**：大陆名必须从 \`世界信息.大陆信息\` 中选择一个实际存在的大洲名称，严禁编造不存在的大陆名！
        *   区域名可以在该大陆范围内创造性生成，但必须合理且符合世界观。
        *   严禁使用"初始地"、"某大陆"等模糊描述（除非世界中真的有这个大陆名称）。
        *   如果世界信息中提供了大陆和势力信息，优先选择与角色出身相关的大陆和地点。
        *   使用指令: \`set character.saveData.玩家角色状态.位置.描述 = "大陆名称·区域名称·具体地点"\`
    *   **地图坐标**: **必须为玩家设置准确的地图坐标标记**（用于地图显示）：
        *   使用指令: \`set player_location_marker = { coordinates: { longitude: 经度数值, latitude: 纬度数值 } }\`
        *   坐标必须在地图范围内（参考 availableContinents 和 mapConfig）
        *   **最重要**：经纬度必须在选定大洲的边界范围内，参考 \`availableContinents[].大洲边界\` 数组中的坐标点
        *   选择大洲边界内的合理位置（如中心区域、边缘城镇等），可以通过计算边界点的平均值来找到中心位置
    *   **物品**: **必须**在背包中添加 2-5 件符合背景的初始物品，包括：
        *   基础生活用品（如衣物、食物、铜钱等）
        *   根据出身背景的特殊物品（如传家之宝、修炼资源等）
        *   如果故事中提到获得功法、法器等，必须添加到背包
    *   **功法**: 如果故事涉及传授功法，必须设置到修炼功法字段
    *   **NPC**: **必须**创建 1-3 个与主角相关的初始 NPC，使用平衡的数据结构：
        *   师父、长辈或指导者
        *   同门、朋友或伙伴
        *   其他重要角色
        *   **重要**: 使用简化的NPC格式，包含角色基础信息、最后出现位置、天资、灵根、天赋、背包等必要字段
    *   **大道**: 如果天赋对应，解锁初始大道。
*   要求: 遵循以下的通用数据操作和模块化规则。
---

## NPC生成规范（精简版）

创建NPC时使用标准格式，包含基础信息、关系描述、好感度、背包等必要字段即可。

---

# 角色初始化专属规则

${CHARACTER_INIT_RULES}

---

# 数据结构定义

${DATA_STRUCTURE_DEFINITIONS}

---

# 参考数据

以下是当前游戏状态和可用的参考信息，请根据这些信息生成合理的初始化内容：

**重要提醒**：
- \`reference.chatVariables["character.saveData"].世界信息\` 包含完整的世界数据（已由第一步生成）
- 其中 \`世界信息.大陆信息\` 包含所有可用大陆的名称、描述、边界坐标
- 其中 \`世界信息.地图配置\` 包含地图的基础配置信息
- 其中 \`世界信息.势力信息\`、\`世界信息.地点信息\`、\`世界信息.秘境信息\` 包含具体的世界实体
- **必须**从 \`世界信息.大陆信息\` 中选择一个真实存在的大陆名称作为玩家的出生地
- **必须**根据选定的大陆的 \`大洲边界\` 坐标范围，为玩家生成合理的经纬度坐标

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
  age: number;      // 用户选择的开局年龄
  world: string;
  talentTier: any;  // TalentTier 对象或字符串
  origin: any;      // Origin 对象或字符串
  spiritRoot: any;  // SpiritRoot 对象或灵根对象或字符串
  talents: any[];   // Talent 对象数组或字符串数组
  attributes: Record<string, number>;
}): string {

  // 🔍 调试：检查DATA_STRUCTURE_DEFINITIONS是否正确加载
  console.log('[提示词构建] === 输入参数检查 ===');
  console.log('[提示词构建] 传入的age参数:', userSelections.age, '类型:', typeof userSelections.age);
  console.log('[提示词构建] 传入的name参数:', userSelections.name);
  console.log('[提示词构建] 传入的gender参数:', userSelections.gender);
  console.log('[提示词构建] === 参数检查完成 ===');

  console.log('[提示词构建] DATA_STRUCTURE_DEFINITIONS 长度:', DATA_STRUCTURE_DEFINITIONS.length);
  console.log('[提示词构建] DATA_STRUCTURE_DEFINITIONS 前100字符:', DATA_STRUCTURE_DEFINITIONS.substring(0, 100));
  console.log('[提示词构建] CHARACTER_INITIALIZATION_PROMPT 长度:', CHARACTER_INITIALIZATION_PROMPT.length);
  console.log('[提示词构建] CHARACTER_INITIALIZATION_PROMPT 是否包含DATA_STRUCTURE_DEFINITIONS:',
    CHARACTER_INITIALIZATION_PROMPT.includes('# 数据结构定义'));

  /**
   * 格式化选择项为AI可读的详细描述
   * 根据实际数据结构精确匹配
   */
  const formatItem = (value: any): string => {
    if (!value) return '无';
    if (typeof value !== 'object') return String(value);

    // === 灵根对象处理 ===
    // 1. 中文格式灵根 { 名称, 品级, 描述 }
    if (value.名称 && value.品级) {
      const desc = value.描述 || '';
      return `${value.名称}(${value.品级})${desc ? `\n    *   **描述**: ${desc}` : ''}`;
    }

    // 2. 英文格式灵根 SpiritRoot { name, tier, description }
    if (value.name && value.tier && value.description !== undefined) {
      return `${value.name}(${value.tier})\n    *   **描述**: ${value.description}`;
    }

    // === 天资等级对象 TalentTier ===
    if (value.name && value.description && typeof value.total_points === 'number') {
      return `${value.name}\n    *   **详细描述**: ${value.description}\n    *   **天赋点数**: ${value.total_points}`;
    }

    // === 出身对象 Origin ===
    if (value.name && value.description && typeof value.talent_cost === 'number' && value.attribute_modifiers) {
      const modifiers = Object.entries(value.attribute_modifiers)
        .map(([attr, val]) => `${attr}${Number(val) > 0 ? '+' : ''}${val}`)
        .join(', ');
      return `${value.name}\n    *   **详细描述**: ${value.description}${modifiers ? `\n    *   **属性影响**: ${modifiers}` : ''}`;
    }

    // === 天赋对象 Talent ===
    if (value.name && value.description && typeof value.talent_cost === 'number' && !value.attribute_modifiers) {
      return `${value.name}\n    *   **详细描述**: ${value.description}\n    *   **消耗点数**: ${value.talent_cost}`;
    }

    // === 通用对象 { name, description } ===
    if (value.name && value.description) {
      return `${value.name}\n    *   **详细描述**: ${value.description}`;
    }

    // === 中文格式通用对象 { 名称, 描述 } ===
    if (value.名称 && value.描述) {
      return `${value.名称}\n    *   **详细描述**: ${value.描述}`;
    }

    // === 自定义对象处理 - 显示所有字段 ===
    if (typeof value === 'object' && value !== null) {
      const entries = Object.entries(value);
      if (entries.length > 0) {
        // 如果有 name 或 名称 字段，先显示它
        const nameField = value.name || value.名称;
        let result = nameField ? `${nameField}\n` : '';

        // 显示所有其他字段（限制长度避免提示词爆炸）
        entries.forEach(([key, val]) => {
          if (key !== 'name' && key !== '名称' && val !== null && val !== undefined) {
            let valueStr = '';
            if (typeof val === 'object') {
              // 限制对象序列化的长度，避免巨量文本
              const jsonStr = JSON.stringify(val);
              valueStr = jsonStr.length > 100 ? `${jsonStr.substring(0, 100)}...` : jsonStr;
            } else {
              valueStr = String(val);
              // 限制字符串长度
              if (valueStr.length > 200) {
                valueStr = valueStr.substring(0, 200) + '...';
              }
            }
            result += `    *   **${key}**: ${valueStr}\n`;
          }
        });

        const fallbackJson = JSON.stringify(value, null, 2);
        return result.trim() || (fallbackJson.length > 500 ? `${fallbackJson.substring(0, 500)}...` : fallbackJson);
      }
    }

    // === 最后防线：直接显示 JSON（限制长度） ===
    console.warn('[formatItem] 使用JSON格式显示未识别的对象类型:', value);
    const finalJson = JSON.stringify(value, null, 2);
    return finalJson.length > 1000 ?
      `\\\`\\\`\\\`json\n${finalJson.substring(0, 1000)}...\n\\\`\\\`\\\`` :
      `\\\`\\\`\\\`json\n${finalJson}\n\\\`\\\`\\\``;
  };

  // === 格式化天赋列表 ===
  const formattedTalents = userSelections.talents && userSelections.talents.length > 0
    ? userSelections.talents.map(t => `*   **天赋**: ${formatItem(t)}`).join('\n')
    : '*   **天赋**: 无';

  // === 格式化先天六司 ===
  const formattedAttributes = Object.entries(userSelections.attributes)
    .map(([key, value]) => `*   **${key}**: ${value}`)
    .join('\n');

  // === 调试日志：显示格式化结果 ===
  console.log('[提示词构建] === 格式化结果验证 ===');
  console.log('天资格式化结果:', formatItem(userSelections.talentTier));
  console.log('出身格式化结果:', formatItem(userSelections.origin));
  console.log('灵根格式化结果:', formatItem(userSelections.spiritRoot));
  console.log('天赋格式化结果:', formattedTalents);
  console.log('[提示词构建] === 格式化验证完成 ===');

  const selectionsSummary = `
# 玩家核心选择

## 核心身份
*   **姓名**: ${userSelections.name}
*   **性别**: ${userSelections.gender}
*   **开局年龄**: ${userSelections.age}岁
*   **世界**: ${userSelections.world}

## 修行潜质
*   **天资**: ${formatItem(userSelections.talentTier)}
*   **出身**: ${formatItem(userSelections.origin)}
*   **灵根**: ${formatItem(userSelections.spiritRoot)}
${formattedTalents}

## 先天六司
${formattedAttributes}
---
`;

  const finalPrompt = selectionsSummary + CHARACTER_INITIALIZATION_PROMPT;

  // 调试：检查提示词内容
  console.log('[提示词检查] finalPrompt长度:', finalPrompt.length);
  console.log('[提示词检查] 是否包含DATA_STRUCTURE_DEFINITIONS标记:', finalPrompt.includes('# 数据结构定义'));
  console.log('[提示词检查] 是否包含境界与阶段说明:', finalPrompt.includes('## 1. 境界与阶段'));
  console.log('[提示词检查] 是否包含品质系统说明:', finalPrompt.includes('## 2. 品质系统'));

  return finalPrompt;
}

// [已废弃] 旧的 GAME_START_INITIALIZATION_PROMPT 已被移除，其功能由 MainGamePanel.vue 的逻辑和新的通用规则替代。
export const GAME_START_INITIALIZATION_PROMPT = '';

