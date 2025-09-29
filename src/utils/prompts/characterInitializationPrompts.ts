/**
 * @fileoverview 角色初始化AI提示词 (v2.0 - 精简)
 * 专注于生成高质量的开局故事和初始状态。
 */

import {
  COMMON_CORE_RULES,
  COMMON_NARRATIVE_RULES,
  COMMON_DATA_MANIPULATION_RULES,
  COMMON_NPC_RULES,
  COMMON_ITEM_RULES,
  COMMON_DAO_RULES,
  CHARACTER_INITIALIZATION_RULES,
  ENHANCED_TIME_MANAGEMENT,
  ENHANCED_DATA_VALIDATION
} from './commonPromptRules';
import { DATA_STRUCTURE_TEMPLATES, UNIFIED_PROMPT_BUILDER } from './unifiedPromptSystem';

export const CHARACTER_INITIALIZATION_PROMPT = `
# 任务：角色初始化

你的任务是为玩家创作一个基于其选择的、个性化的修仙开局故事，并设定好世界的初始状态。
---

# 1. 开局故事 (text)

*   核心: 生成一段 800-1500 字的沉浸式开场故事。
*   内容: 故事必须体现玩家选择的出身、天赋，并详细描绘角色当前所处的环境、心境和正在发生的事件。
*   要求: 遵循以下的通用叙事规则。
---

# 2. 初始世界状态 (tavern_commands)

*   核心: 根据故事内容，通过 \`tavern_commands\` 为世界添加初始实体。
*   内容:
    *   **位置**: 设定具体的层级地理位置，格式为"大陆·州郡·城镇"或"大陆·宗门"等，例如"青云大陆·青云宗"、"天星大陆·天青州·安德镇"。严禁使用"初始地"、"某大陆"等模糊描述。
    *   **物品**: 在背包中添加 1-3 件符合背景的初始物品。
    *   **NPC**: 创建 0-3 个与主角相关的初始 NPC。
    *   **大道**: 如果天赋对应，解锁初始大道。
*   要求: 遵循以下的通用数据操作和模块化规则。
---

# 规则库
${UNIFIED_PROMPT_BUILDER.buildGamePrompt('initialization')}
`.trim();

/**
 * Builds the final character initialization prompt by injecting a summary of user selections.
 * @param userSelections - The player's choices during character creation.
 * @returns A complete and dynamic prompt string for the AI.
 */

export function buildCharacterInitializationPrompt(userSelections: {
  name: string;
  gender: string;
  world: string;
  talentTier: any;  // TalentTier 对象或字符串
  origin: any;      // Origin 对象或字符串  
  spiritRoot: any;  // SpiritRoot 对象或灵根对象或字符串
  talents: any[];   // Talent 对象数组或字符串数组
  attributes: Record<string, number>;
}): string {
  
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
        
        // 显示所有其他字段
        entries.forEach(([key, val]) => {
          if (key !== 'name' && key !== '名称' && val !== null && val !== undefined) {
            result += `    *   **${key}**: ${typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}\n`;
          }
        });
        
        return result.trim() || JSON.stringify(value, null, 2);
      }
    }

    // === 最后防线：直接显示 JSON ===
    console.warn('[formatItem] 使用JSON格式显示未识别的对象类型:', value);
    return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
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

  return selectionsSummary + CHARACTER_INITIALIZATION_PROMPT;
}

// [已废弃] 旧的 GAME_START_INITIALIZATION_PROMPT 已被移除，其功能由 MainGamePanel.vue 的逻辑和新的通用规则替代。
export const GAME_START_INITIALIZATION_PROMPT = '';

