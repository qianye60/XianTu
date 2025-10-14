/**
 * @fileoverview 角色初始化AI提示词 (v3.0 - 精简高效)
 * 优化后更短更精准,减少AI理解负担和重试次数。
 */

import { DATA_STRUCTURE_DEFINITIONS } from './dataStructureDefinitions';
import { REALM_STAGE_RULE, NSFW_RULE } from './sharedRules';

// 角色初始化专用规则
const CHARACTER_INIT_RULES = [
  '# 🎯 任务：生成开局故事+初始化世界',
  '',
  '## 1️⃣ 随机选项处理',
  '检测"随机灵根/出身"必须替换：灵根按天资选品级,出身按背景选。text/commands禁含"随机"',
  '',
  '## 2️⃣ 玩家选择不可改',
  '已选具体灵根/出身严禁用commands修改',
  '',
  '## 3️⃣ 位置设置',
  '格式:"真实大陆·地点"或"大陆·区域·地点",从availableContinents/Locations选,禁编造',
  '',
  '## 4️⃣ 物品创建',
  '先创建到背包→装备栏引用→标记已装备',
  '',
  '## 5️⃣ 开局年龄',
  '按选择年龄开始,禁改寿命.当前,禁时间跳跃',
  '',
  '## 6️⃣ 初始资源',
  '灵石:凡人0-10,小康10-50,宗门50-200 | 物品:2-5件 | NPC:0-3个 | 功法:0-2部',
  '',
  '## 7️⃣ 叙事',
  '1200-2500字沉浸式开场,用行为暗示特质,禁直提术语,纯叙事无时间标记',
  '',
  REALM_STAGE_RULE,
  '',
  NSFW_RULE,
].join('\n');

export const CHARACTER_INITIALIZATION_PROMPT = `
# 任务：角色初始化

生成修仙开局故事并初始化世界状态

**输出格式**：
\`\`\`json
{
  "text": "1200-2500字开局故事",
  "mid_term_memory": "可选：50-100字核心事件",
  "tavern_commands": [{"action": "set", "key": "位置.描述", "value": "大陆·地点"}, ...]
}
\`\`\`

**要求**：禁注释/尾逗号/单引号；text≥1200字；tavern_commands必需

---

# 1. 开局故事 (text)

1200-2500字沉浸式开场,体现出身/天赋/环境。

**叙事**：用行为/感受展现特质,禁直提术语(根骨/灵根等)。高根骨→体魄强健,高悟性→领悟超群,神品灵根→天地异象。

**一致性**：必须完全匹配玩家选择,积极体现优势。

**年龄**：从开局年龄开始,禁改寿命.当前,禁时间跳跃。

**格式**：纯叙事,无时间标记。

---

# 2. 初始世界状态 (tavern_commands)

根据故事通过commands添加初始实体。

**物品灵石**：2-5件物品,灵石按出身(凡0-10,小康10-50,宗门50-200),品质匹配出身。

**NPC**：0-3个相关NPC,简化格式。

**大道**：天赋对应则解锁。

---

# 角色初始化规则

${CHARACTER_INIT_RULES}

---

# 数据结构

${DATA_STRUCTURE_DEFINITIONS}

---

# 参考数据

以下是当前状态和参考信息:

**提醒**：位置必须从availableContinents/Locations选,禁编造。

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

    // === 检测随机选项 ===
    if (typeof value === 'string') {
      if (value === '随机灵根' || value.includes('随机灵根')) {
        return `${value}\n    *   **⚠️ AI必须处理**: 这是一个随机选项，你必须在生成故事前将其替换为具体的灵根！`;
      }
      if (value === '随机出生' || value.includes('随机出生')) {
        return `${value}\n    *   **⚠️ AI必须处理**: 这是一个随机选项，你必须在生成故事前将其替换为具体的出身！`;
      }
      return String(value);
    }

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

  const finalPrompt = CHARACTER_INITIALIZATION_PROMPT.replace(
    '# 玩家核心选择',
    selectionsSummary.replace('# 玩家核心选择', '# 角色核心设定参考（仅供创作参考，严禁直接复述）')
  );

  // 调试：检查提示词内容
  console.log('[提示词检查] finalPrompt长度:', finalPrompt.length);
  console.log('[提示词检查] 是否包含DATA_STRUCTURE_DEFINITIONS标记:', finalPrompt.includes('# 数据结构定义'));

  return finalPrompt;
}

/**
 * 地点名称生成提示词
 */
export const LOCATION_NAME_GENERATION_PROMPT = `
# 任务：为大陆生成层级地点名

为大陆生成具体、有层级、有特色的地点名称。

**输入**：
\`\`\`json
INPUT_PLACEHOLDER
\`\`\`

**输出**：
\`\`\`json
{"location_name": "具体地点(不含大陆名)"}
\`\`\`

**要求**：
1. 2-3层级,用"·"分隔,从大到小(区域·建筑·场所)
2. 体现大陆特点(修仙用宗门/洞府,都市用建筑/街道)
3. 只返回地点名,系统自动拼接大陆名
4. 有效JSON,无注释/额外文本
`.trim();

// [已废弃] 旧的 GAME_START_INITIALIZATION_PROMPT 已被移除，其功能由 MainGamePanel.vue 的逻辑和新的通用规则替代。
export const GAME_START_INITIALIZATION_PROMPT = '';
