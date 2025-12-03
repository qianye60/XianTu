/**
 * 默认提示词集合 - 完整版
 *
 * 分类说明：
 * 1. 核心请求提示词 - 正常游戏请求时按顺序发送
 * 2. 总结请求提示词 - 记忆总结时使用
 * 3. 生成类提示词 - 世界/NPC/任务等生成
 * 4. 角色初始化提示词 - 创建角色时使用
 */
import { SAVE_DATA_STRUCTURE } from '@/utils/prompts/definitions/dataDefinitions';
import { CHARACTER_INITIALIZATION_PROMPT } from '@/utils/prompts/tasks/characterInitializationPrompts';
import { getCotCorePrompt } from '@/utils/prompts/cot/cotCore';
import { EnhancedWorldPromptBuilder } from '@/utils/worldGeneration/enhancedWorldPrompts';
import { promptStorage } from './promptStorage';
// 核心规则
import { JSON_OUTPUT_RULES, RESPONSE_FORMAT_RULES, DATA_STRUCTURE_STRICTNESS } from '@/utils/prompts/definitions/coreRules';
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
  NSFW_CONTENT_RULES
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
const CORE_OUTPUT_RULES = [JSON_OUTPUT_RULES, RESPONSE_FORMAT_RULES, DATA_STRUCTURE_STRICTNESS].join('\n\n');

// 合并业务规则
const BUSINESS_RULES = [
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
  NSFW_CONTENT_RULES
].join('\n\n');

// 合并文本格式规范
const TEXT_FORMAT_RULES = [TEXT_FORMAT_MARKERS, DICE_ROLLING_RULES, COMBAT_DAMAGE_RULES, NAMING_CONVENTIONS].join('\n\n');

// 合并世界观标准
const WORLD_STANDARDS = [REALM_ATTRIBUTE_STANDARDS, QUALITY_SYSTEM, REPUTATION_GUIDE].join('\n\n');

export function getSystemPrompts(): Record<string, PromptDefinition> {
  return {
    // ==================== 核心请求提示词（合并版） ====================
    coreOutputRules: {
      name: '1. 核心输出规则',
      content: CORE_OUTPUT_RULES,
      category: 'coreRequest',
      description: 'JSON输出格式、数据同步、结构严格性',
      order: 1
    },
    businessRules: {
      name: '2. 业务规则',
      content: BUSINESS_RULES,
      category: 'coreRequest',
      description: '境界体系、大道、NPC、功法、状态效果等游戏规则',
      order: 2
    },
    dataDefinitions: {
      name: '3. 数据结构定义',
      content: SAVE_DATA_STRUCTURE,
      category: 'coreRequest',
      description: '游戏存档数据结构完整定义',
      order: 3
    },
    textFormatRules: {
      name: '4. 文本格式规范',
      content: TEXT_FORMAT_RULES,
      category: 'coreRequest',
      description: '文本标记、判定系统、战斗伤害、命名约定',
      order: 4
    },
    worldStandards: {
      name: '5. 世界观标准',
      content: WORLD_STANDARDS,
      category: 'coreRequest',
      description: '境界属性、品质系统、声望指南',
      order: 5
    },
    cotCore: {
      name: '6. CoT思维链',
      content: getCotCorePrompt('{{用户输入}}', false),
      category: 'coreRequest',
      description: '强制AI先思考后输出的思维链协议',
      order: 6
    },
    actionOptions: {
      name: '7. 行动选项规则',
      content: ACTION_OPTIONS_RULES,
      category: 'coreRequest',
      description: '生成玩家行动选项的规范',
      order: 7
    },
    questSystemRules: {
      name: '8. 任务系统规则',
      content: QUEST_SYSTEM_RULES,
      category: 'coreRequest',
      description: '任务系统开关控制和触发条件',
      order: 8
    },

    // ==================== 总结请求提示词 ====================
    memorySummary: {
      name: '记忆总结提示词',
      content: `你是记忆总结助手。这是一个纯文本总结任务，不是游戏对话或故事续写。

【待总结的记忆内容】：
{{记忆内容}}

【总结要求】：
- 第一人称"我"
- 250-400字
- 连贯的现代修仙小说叙述风格
- 仅输出JSON，不要thinking/commands/options

【必须保留】：
- 原文中的人名、地名
- 原文中的事件
- 原文中的物品、功法、境界
- 原文中的时间节点

【必须忽略】：
- 对话内容
- 情绪描写
- 过程细节

【输出格式】：
\`\`\`json
{"text": "总结内容"}
\`\`\`

【示例】：
原文："我在青云峰修炼七天，突破到炼气三层。李云送我聚气丹。我去藏经阁学了剑法。"
总结："我在青云峰闭关七日，成功突破到炼气三层。期间结识了外门弟子李云，他赠予我一枚聚气丹。之后我进入藏经阁，学习了《基础剑法》。"`,
      category: 'summary',
      description: '中期记忆转化为长期记忆时的总结提示词',
      order: 1
    },
    npcMemorySummary: {
      name: 'NPC记忆总结提示词',
      content: `你是NPC记忆总结助手。总结指定NPC与主角的互动记忆。

【待总结的NPC记忆】：
{{NPC记忆内容}}

【NPC信息】：
- 姓名：{{NPC姓名}}
- 与主角关系：{{关系}}

【总结要求】：
- 第三人称，以NPC视角
- 100-200字
- 保留关键事件和情感变化
- 仅输出JSON

【输出格式】：
\`\`\`json
{"text": "总结内容"}
\`\`\``,
      category: 'summary',
      description: 'NPC记忆总结的提示词',
      order: 2
    },

    // ==================== 动态生成提示词 ====================
    npcGeneration: {
      name: 'NPC生成提示词',
      content: `生成一个修仙世界的NPC角色。

【场景信息】：
{{场景信息}}

【生成要求】：
1. 姓名符合修仙世界设定（两字或三字姓名）
2. 性格特点鲜明，有独特的说话方式
3. 背景故事合理，与当前场景有联系
4. 修为境界明确，符合场景定位

【输出格式】：
\`\`\`json
{
  "姓名": "NPC姓名",
  "性别": "男/女",
  "年龄": 数字,
  "境界": {"名称": "境界名", "阶段": "初期/中期/后期/圆满"},
  "性格": "性格描述（50字内）",
  "外貌": "外貌描述（100字内）",
  "背景": "背景故事（200字内）",
  "说话风格": "说话特点",
  "初始好感度": 50
}
\`\`\``,
      category: 'generation',
      description: '游戏中动态生成NPC角色',
      order: 1
    },
    questGeneration: {
      name: '任务生成提示词',
      content: `生成一个修仙世界的任务。

【当前场景信息】：
{{场景信息}}

【玩家信息】：
- 境界：{{玩家境界}}
- 宗门：{{所属宗门}}

【要求】：
1. 任务名称要有修仙特色
2. 目标明确可量化
3. 奖励合理（修为/灵石/物品/声望）
4. 难度符合玩家当前境界

【输出格式】：
\`\`\`json
{
  "任务ID": "quest_时间戳",
  "任务名称": "任务名",
  "任务描述": "详细描述",
  "任务类型": "主线/支线/日常/宗门",
  "目标列表": [
    {"目标描述": "具体目标", "当前进度": 0, "目标进度": 数量, "完成状态": false}
  ],
  "奖励": {
    "修为": 数值,
    "灵石": {"下品": 数值},
    "声望": 数值,
    "物品": []
  },
  "时限": "无/X天",
  "难度": "简单/普通/困难/极难"
}
\`\`\``,
      category: 'generation',
      description: '游戏中动态生成任务',
      order: 2
    },
    itemGeneration: {
      name: '物品生成提示词',
      content: `生成一个修仙世界的物品。

【物品类型】：{{物品类型}}
【品质要求】：{{品质要求}}
【场景信息】：{{场景信息}}

【品质系统】：
- 凡品(grade:1-3): 普通物品
- 黄阶(grade:4-5): 入门级法宝/功法
- 玄阶(grade:6-7): 中级法宝/功法
- 地阶(grade:8-9): 高级法宝/功法
- 天阶(grade:10): 顶级法宝/功法

【输出格式】：
\`\`\`json
{
  "物品ID": "item_类型_时间戳",
  "名称": "物品名称",
  "类型": "装备/功法/丹药/材料/其他",
  "品质": {"quality": "凡/黄/玄/地/天", "grade": 1-10},
  "描述": "物品描述（100字内）",
  "数量": 1,
  "效果": "效果描述"
}
\`\`\``,
      category: 'generation',
      description: '游戏中动态生成物品',
      order: 3
    },

    // ==================== 开局初始化提示词 ====================
    worldGeneration: {
      name: '1. 世界生成提示词',
      content: EnhancedWorldPromptBuilder.buildPrompt({
        factionCount: 5,
        totalLocations: 10,
        secretRealms: 3,
        continentCount: 3
      }),
      category: 'initialization',
      description: '开局第一步：生成修仙世界的大陆、势力、地点等设定',
      order: 1
    },
    characterInit: {
      name: '2. 角色初始化提示词',
      content: CHARACTER_INITIALIZATION_PROMPT,
      category: 'initialization',
      description: '开局第二步：根据玩家选择生成角色初始状态和开场剧情',
      order: 2
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
