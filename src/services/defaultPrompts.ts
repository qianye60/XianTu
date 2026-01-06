/**
 * 默认提示词集合 - 完整版
 *
 * 分类说明：
 * 1. 核心请求提示词 - 正常游戏请求时按顺序发送
 * 2. 总结请求提示词 - 记忆总结时使用
 * 3. 生成类提示词 - 世界/NPC/任务等生成
 * 4. 角色初始化提示词 - 创建角色时使用
 */
import { getSaveDataStructureForEnv } from '@/utils/prompts/definitions/dataDefinitions';
import { getCharacterInitializationPromptForEnv } from '@/utils/prompts/tasks/characterInitializationPrompts';
import { getCotCorePrompt } from '@/utils/prompts/cot/cotCore';
import { EnhancedWorldPromptBuilder } from '@/utils/worldGeneration/enhancedWorldPrompts';
import { promptStorage } from './promptStorage';
import { isTavernEnv } from '@/utils/tavern';
// 核心规则
import { JSON_OUTPUT_RULES, RESPONSE_FORMAT_RULES, DATA_STRUCTURE_STRICTNESS, NARRATIVE_PURITY_RULES } from '@/utils/prompts/definitions/coreRules';
// 业务规则
import {
  REALM_SYSTEM_RULES,
  THREE_THOUSAND_DAOS_RULES,
  NPC_RULES,
  GRAND_CONCEPT_CONSTRAINTS,
  SKILL_AND_SPELL_USAGE_RULES,
  CULTIVATION_DETAIL_RULES,
  STATUS_EFFECT_RULES,
  LOCATION_UPDATE_RULES,
  COMMAND_PATH_CONSTRUCTION_RULES,
  TECHNIQUE_SYSTEM_RULES,
  PLAYER_AUTONOMY_RULES,
  RATIONALITY_AUDIT_RULES,
  DUAL_REALM_NARRATIVE_RULES,
  DIFFICULTY_ENHANCEMENT_RULES,
  SECT_SYSTEM_RULES,
  COMBAT_ALCHEMY_RISK_RULES,
  CULTIVATION_PRACTICE_RULES,
  DAO_COMPREHENSION_RULES,
  TASK_SYSTEM_RULES
} from '@/utils/prompts/definitions/businessRules';
// 文本格式
import { TEXT_FORMAT_MARKERS, DICE_ROLLING_RULES, COMBAT_DAMAGE_RULES, NAMING_CONVENTIONS } from '@/utils/prompts/definitions/textFormats';
// 世界标准
import { REALM_ATTRIBUTE_STANDARDS, QUALITY_SYSTEM, REPUTATION_GUIDE } from '@/utils/prompts/definitions/worldStandards';
import { ACTION_OPTIONS_RULES } from '@/utils/prompts/definitions/actionOptions';
import { QUEST_SYSTEM_RULES } from '@/utils/prompts/definitions/questSystemRules';

export interface PromptDefinition {
  name: string;
  content: string;
  category: string;
  description?: string;
  order?: number;
  weight?: number; // 权重 1-10，越高越重要
}

/**
 * 提示词分类定义
 */
export const PROMPT_CATEGORIES = {
  coreRequest: {
    name: '核心请求提示词',
    description: '正常游戏请求时按顺序发送的提示词',
    icon: '📨'
  },
  summary: {
    name: '总结请求提示词',
    description: '记忆总结时使用的提示词',
    icon: '📝'
  },
  initialization: {
    name: '开局初始化提示词',
    description: '开局时世界生成和角色初始化的提示词',
    icon: '🚀'
  },
  generation: {
    name: '动态生成提示词',
    description: '游戏中动态生成NPC/任务/物品的提示词',
    icon: '🎨'
  }
};

// 合并核心输出规则
const CORE_OUTPUT_RULES = [JSON_OUTPUT_RULES, RESPONSE_FORMAT_RULES, DATA_STRUCTURE_STRICTNESS, NARRATIVE_PURITY_RULES].join('\n\n');

// 合并业务规则（精简版，核心规则优先）
const BUSINESS_RULES = [
  RATIONALITY_AUDIT_RULES,
  DUAL_REALM_NARRATIVE_RULES,
  DIFFICULTY_ENHANCEMENT_RULES,
  REALM_SYSTEM_RULES,
  NPC_RULES,
  COMMAND_PATH_CONSTRUCTION_RULES,
  TECHNIQUE_SYSTEM_RULES,
  COMBAT_ALCHEMY_RISK_RULES,
  PLAYER_AUTONOMY_RULES
].join('\n\n');

// 扩展业务规则（可选，用户可自定义开启）
const EXTENDED_BUSINESS_RULES = [
  THREE_THOUSAND_DAOS_RULES,
  GRAND_CONCEPT_CONSTRAINTS,
  SKILL_AND_SPELL_USAGE_RULES,
  CULTIVATION_DETAIL_RULES,
  STATUS_EFFECT_RULES,
  LOCATION_UPDATE_RULES,
  SECT_SYSTEM_RULES,
  CULTIVATION_PRACTICE_RULES,
  DAO_COMPREHENSION_RULES,
  TASK_SYSTEM_RULES
].join('\n\n');

// 合并文本格式规范
const TEXT_FORMAT_RULES = [TEXT_FORMAT_MARKERS, DICE_ROLLING_RULES, COMBAT_DAMAGE_RULES, NAMING_CONVENTIONS].join('\n\n');

// 合并世界观标准
const WORLD_STANDARDS = [REALM_ATTRIBUTE_STANDARDS, QUALITY_SYSTEM, REPUTATION_GUIDE].join('\n\n');

export function getSystemPrompts(): Record<string, PromptDefinition> {
  const tavernEnv = isTavernEnv();
  return {
    // ==================== 核心请求提示词（合并版） ====================
    coreOutputRules: {
      name: '1. 输出格式',
      content: CORE_OUTPUT_RULES,
      category: 'coreRequest',
      description: 'JSON格式、数据同步',
      order: 1,
      weight: 10
    },
    businessRules: {
      name: '2. 核心规则',
      content: BUSINESS_RULES,
      category: 'coreRequest',
      description: '境界、NPC、战斗规则',
      order: 2,
      weight: 9
    },
    extendedBusinessRules: {
      name: '2.5 扩展规则',
      content: EXTENDED_BUSINESS_RULES,
      category: 'coreRequest',
      description: '大道、宗门等扩展',
      order: 2.5,
      weight: 5
    },
    dataDefinitions: {
      name: '3. 数据结构',
      content: getSaveDataStructureForEnv(tavernEnv),
      category: 'coreRequest',
      description: '存档结构定义',
      order: 3,
      weight: 10
    },
    textFormatRules: {
      name: '4. 文本格式',
      content: TEXT_FORMAT_RULES,
      category: 'coreRequest',
      description: '判定、伤害、命名',
      order: 4,
      weight: 6
    },
    worldStandards: {
      name: '5. 世界标准',
      content: WORLD_STANDARDS,
      category: 'coreRequest',
      description: '境界属性、品质',
      order: 5,
      weight: 7
    },
    // ==================== 联机模式提示词 ====================
    onlineModeRules: {
      name: '联机规则',
      content: `# 联机模式
- 共享世界，玩家行为影响他人
- 禁止修改世界设定/重要NPC
- 禁止跨区域瞬移
- 穿越消耗穿越点，受目标世界约束`,
      category: 'coreRequest',
      description: '联机模式限制',
      order: 6,
      weight: 4
    },
    cotCore: {
      name: '6. 自检协议',
      content: getCotCorePrompt('{{用户输入}}', false),
      category: 'coreRequest',
      description: '禁止思维链输出',
      order: 6,
      weight: 8
    },
    actionOptions: {
      name: '7. 行动选项',
      content: ACTION_OPTIONS_RULES,
      category: 'coreRequest',
      description: '生成玩家选项',
      order: 7,
      weight: 6
    },
    questSystemRules: {
      name: '8. 任务系统',
      content: QUEST_SYSTEM_RULES,
      category: 'coreRequest',
      description: '任务触发控制',
      order: 8,
      weight: 5
    },
    splitGenerationStep1: {
      name: '9. 分步正文',
      content: `# 分步生成 1/2：正文
禁止：<thinking>/JSON/字段名/解释
只输出：纯文本小说正文
要求：承接情节、多描写少总结、结尾留钩子`.trim(),
      category: 'coreRequest',
      description: '分步模式第1步',
      order: 9,
      weight: 7
    },
    splitGenerationStep2: {
      name: '10. 分步指令',
      content: `# 分步生成 2/2：JSON指令
禁止：正文/text字段/<thinking>
只输出：{mid_term_memory, tavern_commands, action_options}`.trim(),
      category: 'coreRequest',
      description: '分步模式第2步',
      order: 10,
      weight: 7
    },
    splitInitStep1: {
      name: '11. 开局正文',
      content: `# 开局分步 1/2：正文
禁止：<thinking>/JSON/指令
只输出：开局纯文本正文
要求：交代场景、结尾留钩子`.trim(),
      category: 'coreRequest',
      description: '开局分步第1步',
      order: 11,
      weight: 7
    },
    splitInitStep2: {
      name: '12. 开局指令',
      content: `# 开局分步 2/2：JSON指令
禁止：正文/text/<thinking>
只输出：{mid_term_memory, tavern_commands, action_options}`.trim(),
      category: 'coreRequest',
      description: '开局分步第2步',
      order: 12,
      weight: 7
    },

    // ==================== 总结请求提示词 ====================
    memorySummary: {
      name: '记忆总结',
      content: `记忆总结助手。第一人称"我"，250-400字，保留人名/地名/事件/物品/境界，忽略对话/情绪/细节。
输出：{"text": "总结内容"}`,
      category: 'summary',
      description: '中期→长期记忆',
      order: 1,
      weight: 6
    },
    npcMemorySummary: {
      name: 'NPC记忆总结',
      content: `NPC记忆总结。第三人称，100-200字，保留关键事件和情感变化。
输出：{"text": "总结内容"}`,
      category: 'summary',
      description: 'NPC记忆总结',
      order: 2,
      weight: 5
    },

    // ==================== 动态生成提示词 ====================
    npcGeneration: {
      name: 'NPC生成',
      content: `生成修仙世界NPC。要求：2-3字姓名、性格鲜明、背景合理、境界明确。
输出JSON：{姓名,性别,年龄,境界:{名称,阶段},性格,外貌,背景,说话风格,初始好感度:50}`,
      category: 'generation',
      description: '动态生成NPC',
      order: 1,
      weight: 5
    },
    questGeneration: {
      name: '任务生成',
      content: `生成修仙世界任务。要求：修仙特色名称、目标可量化、奖励合理、难度匹配境界。
输出JSON：{任务ID,任务名称,任务描述,任务类型,目标列表,奖励,时限,难度}`,
      category: 'generation',
      description: '动态生成任务',
      order: 2,
      weight: 5
    },
    itemGeneration: {
      name: '物品生成',
      content: `生成修仙世界物品。品质：凡(1-3)/黄(4-5)/玄(6-7)/地(8-9)/天(10)。
输出JSON：{物品ID,名称,类型,品质:{quality,grade},描述,数量,效果}`,
      category: 'generation',
      description: '动态生成物品',
      order: 3,
      weight: 5
    },

    // ==================== 开局初始化提示词 ====================
    worldGeneration: {
      name: '世界生成',
      content: EnhancedWorldPromptBuilder.buildPrompt({
        factionCount: 5,
        totalLocations: 10,
        secretRealms: 3,
        continentCount: 3
      }),
      category: 'initialization',
      description: '生成大陆、势力、地点',
      order: 1,
      weight: 8
    },
    characterInit: {
      name: '角色初始化',
      content: getCharacterInitializationPromptForEnv(tavernEnv),
      category: 'initialization',
      description: '生成角色和开场',
      order: 2,
      weight: 9
    },
    newbieGuide: {
      name: '新手引导',
      content: `新手引导（前3回合）。原则：自然融入叙事，不打破沉浸感，通过NPC对话传递。
内容：行动方式/查看状态/物品使用/交流/探索。`,
      category: 'initialization',
      description: '自然新手引导',
      order: 3,
      weight: 4
    }
  };
}

/**
 * 获取提示词（优先使用用户自定义的）
 * @param key 提示词键名
 * @returns 提示词内容（用户自定义 > 默认）
 */
export async function getPrompt(key: string): Promise<string> {
  return await promptStorage.get(key);
}
