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
  PROFESSION_MASTERY_RULES,
  ANTI_SYCOPHANCY_RULES,
  DUAL_REALM_NARRATIVE_RULES,
  DIFFICULTY_ENHANCEMENT_RULES,
  SECT_SYSTEM_RULES,
  COMBAT_ALCHEMY_RISK_RULES,
  CULTIVATION_PRACTICE_RULES,
  DAO_COMPREHENSION_RULES,
  CULTIVATION_SPEED_RULES,
  SIX_SI_ACQUISITION_RULES,
  SECT_DYNAMIC_GENERATION_RULES
} from '@/utils/prompts/definitions/businessRules';
// 文本格式
import { TEXT_FORMAT_MARKERS, DICE_ROLLING_RULES, COMBAT_DAMAGE_RULES, NAMING_CONVENTIONS } from '@/utils/prompts/definitions/textFormats';
// 世界标准
import { REALM_ATTRIBUTE_STANDARDS, QUALITY_SYSTEM, REPUTATION_GUIDE } from '@/utils/prompts/definitions/worldStandards';
import { ACTION_OPTIONS_RULES } from '@/utils/prompts/definitions/actionOptions';
import { EVENT_SYSTEM_RULES } from '@/utils/prompts/definitions/eventSystemRules';

export interface PromptDefinition {
  name: string;
  content: string;
  category: string;
  description?: string;
  order?: number;
  weight?: number; // 权重 1-10，越高越重要
  condition?: 'onlineMode' | 'splitGeneration' | 'eventSystem' | 'always'; // 显示条件
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
    description: '游戏中动态生成NPC/事件/物品的提示词',
    icon: '🎨'
  },
  online: {
    name: '联机模式提示词',
    description: '联机模式专用的规则和限制提示词',
    icon: '🌐'
  }
};

// 合并核心输出规则
const CORE_OUTPUT_RULES = [JSON_OUTPUT_RULES, RESPONSE_FORMAT_RULES, DATA_STRUCTURE_STRICTNESS, NARRATIVE_PURITY_RULES].join('\n\n');

// 合并业务规则（精简版，核心规则优先）
const BUSINESS_RULES = [
  RATIONALITY_AUDIT_RULES,
  ANTI_SYCOPHANCY_RULES,
  PROFESSION_MASTERY_RULES,
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
  CULTIVATION_SPEED_RULES,
  SIX_SI_ACQUISITION_RULES,
  SECT_DYNAMIC_GENERATION_RULES
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
      category: 'online',
      description: '联机模式限制',
      order: 1,
      weight: 8,
      condition: 'onlineMode'
    },
    onlineWorldSync: {
      name: '联机世界同步',
      content: `# 联机世界同步规则
- 世界状态由服务器权威管理
- 玩家对世界的影响需通过事件广播
- NPC状态变更需同步到所有在场玩家
- 大型事件需全服公告`,
      category: 'online',
      description: '世界同步机制',
      order: 2,
      weight: 7,
      condition: 'onlineMode'
    },
    onlineInteraction: {
      name: '联机交互',
      content: `# 联机玩家交互
- 同区域玩家可见可交互
- 交易需双方确认
- PVP需双方同意或特定区域
- 组队共享部分奖励`,
      category: 'online',
      description: '玩家交互规则',
      order: 3,
      weight: 6,
      condition: 'onlineMode'
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
    eventSystemRules: {
      name: '8. 世界事件',
      content: EVENT_SYSTEM_RULES,
      category: 'coreRequest',
      description: '世界事件演变与影响',
      order: 8,
      weight: 5,
      condition: 'eventSystem'
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
      weight: 7,
      condition: 'splitGeneration'
    },
    splitGenerationStep2: {
      name: '10. 分步指令',
      content: `# 分步生成 2/2：JSON指令
禁止：正文/text字段/<thinking>
只输出：{mid_term_memory, tavern_commands, action_options}`.trim(),
      category: 'coreRequest',
      description: '分步模式第2步',
      order: 10,
      weight: 7,
      condition: 'splitGeneration'
    },
    splitInitStep1: {
      name: '11. 开局正文',
      content: `# 天道书写命运之章 - 第一步：开局叙事

## 你的任务
根据玩家的角色设定，书写一段沉浸式的开局叙事文本。

## 输出要求
**只输出纯文本正文，不要任何JSON、标签、指令！**

## 叙事要求
1. **字数**: 1200-2500字
2. **视角**: 第三人称，以玩家角色为主视角
3. **内容结构**:
   - 开篇：交代时间、地点、环境氛围
   - 中段：展现角色的出身背景、当前处境
   - 结尾：留下悬念或行动契机，自然过渡到玩家可以做出选择的时刻

## 文风要求
- **修仙正剧风**: 语言古朴凝练，富有画面感
- **沉浸式体验**: 侧重环境氛围、内心感悟、灵气流动的触感
- **严禁游戏术语**: 不要出现"玩家"、"获得"、"装备了"、"等级提升"等出戏词汇
- **严禁数据罗列**: 不要在正文中出现任何游戏数据、JSON、变量名

## 修仙逻辑
- **成仙之难**: 修仙是"逆天而行"，每一步都充满艰辛
- **时间感知**: 体现时间流逝感（如"寒来暑往"、"枯坐数日"）
- **境界严谨**: 凡人开局不可能在此次生成中直接突破到练气期

## 角色塑造
- **年龄匹配**: 行为举止要符合玩家选择的年龄段
- **出身一致**: 出身决定眼界和起点，必须与玩家选择完全匹配
- **尊重选择**: 玩家选择什么样的出身、天赋、灵根，你就如实展现，不要强加预设剧情

## 禁止事项
- ❌ 不要输出 <thinking> 或任何思维链标签
- ❌ 不要输出 JSON 格式
- ❌ 不要输出游戏指令或数据
- ❌ 不要输出"记忆"、"行动选项"等结构化内容
- ❌ 不要在文本中夹带命令、数据、变量名

## 示例开头（仅供参考风格）
"仙历一千零五十年，初春。东荒大陆，青云山脉外围，一座不起眼的小村庄笼罩在晨雾之中。村口的老槐树下，一个少年正静静地坐着，目光望向远方连绵的群山..."

现在，请根据用户提供的角色信息，书写开局叙事。`.trim(),
      category: 'coreRequest',
      description: '开局分步第1步',
      order: 11,
      weight: 7,
      condition: 'splitGeneration'
    },
    splitInitStep2: {
      name: '12. 开局指令',
      content: `# 天道书写命运之章 - 第二步：初始化数据

## 你的任务
根据第一步生成的开局叙事，输出初始化游戏数据。

## 输出格式（最高优先级）
**只输出一个 JSON 对象，不要任何解释性文字！**

\`\`\`json
{
  "mid_term_memory": "50-100字摘要（必填，不能为空）",
  "tavern_commands": [
    {"action":"set","key":"元数据.时间","value":{"年":1050,"月":1,"日":1,"小时":8,"分钟":0}},
    {"action":"set","key":"角色.身份.出生日期","value":{"年":1032,"月":1,"日":1,"小时":0,"分钟":0}},
    {"action":"set","key":"角色.位置","value":{"描述":"大陆·地点","x":5000,"y":5000}},
    {"action":"set","key":"角色.背包.灵石","value":{"下品":100,"中品":0,"上品":0,"极品":0}}
  ],
  "action_options": ["选项1","选项2","选项3","选项4","选项5"]
}
\`\`\`

## 初始化命令规则（tavern_commands）

### 必须执行的命令（按顺序）：

1. **时间** - 设置 \`元数据.时间\`
   - 并设置 \`角色.身份.出生日期\`（出生年 = 元数据.时间.年 - 开局年龄）

2. **位置** - 设置 \`角色.位置\`
   - 必须包含 {描述, x, y}
   - 描述格式：大陆·地点（用·分隔）
   - 从可用地点列表中选择
   - 坐标范围: x:0-10000, y:0-10000

3. **声望** - 设置 \`角色.属性.声望\`
   - 普通出身: 0-10
   - 宗门出身: 10-50
   - 名门出身: 50-100

4. **随机项** - 若灵根/出身为"随机"
   - 用 \`set\` 写入 \`角色.身份.灵根\` 或 \`角色.身份.出生\` 的具体内容

5. **资源** - 设置初始资源
   - \`角色.背包.灵石\`（根据出身决定数量）
   - \`角色.背包.物品.{物品ID}\`（如有初始物品）
   - 功法只作为"物品.类型=功法"进入背包

6. **NPC** - 仅创建文本中明确提到的重要人物（0-3个）
   - 写入 \`社交.关系.{NPC中文名}\`
   - key直接使用NPC的中文名字（如：张三、李媚娘）
   - NPC对象内的 \`名字\` 字段必须与key一致

7. **大道** - 若天赋/功法影响大道
   - 写入 \`角色.大道.大道列表.{道名}\`
   - 必须包含完整对象

### 初始资源控制（严格执行）

**灵石**（基于出身）:
- 贫困/流浪: 0-10
- 凡人/普通: 10-50
- 修仙世家/宗门: 100-300
- 富裕/商贾: 300-800

**物品与装备**:
- 数量: 1-5件，宁缺毋滥
- 品质: 初始物品必须以**凡品**为主
- 功法: 0-2部（大多数凡人开局不应自带功法）

**NPC与关系**:
- 数量: 0-3个（必须是剧情中产生深刻羁绊的重要人物）
- 关系: 初始好感度不宜过高（除非是血亲）

**境界判定**:
- 凡人: 绝大多数开局应为凡人（境界进度0）
- 练气: 仅当出身为"修仙家族"且年龄较大时才允许

## 中期记忆（mid_term_memory）
- 50-100字摘要
- 必填，不能为空
- 概括开局的核心信息（出身、处境、关键事件）

## 行动选项（action_options）
- 必须输出5个选项
- 不能为空
- 要符合当前场景和角色处境
- 示例：["四处走动熟悉环境","查看自身状态","与附近的人交谈","寻找修炼之地","打听周围消息"]

## 禁止事项
- ❌ 不要输出 <thinking> 或任何思维链
- ❌ 不要输出正文文本（text字段留空或不输出）
- ❌ 不要输出解释性文字
- ❌ 所有 key 必须以 \`元数据/角色/社交/世界/系统\` 开头（V3短路径）

现在，请根据第一步的开局叙事和用户的角色信息，输出初始化JSON数据。`.trim(),
      category: 'coreRequest',
      description: '开局分步第2步',
      order: 12,
      weight: 7,
      condition: 'splitGeneration'
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
      content: `生成修仙世界NPC。
核心：世界不以玩家为中心，NPC有独立生活；严禁参考玩家境界生成"镜像NPC"或"量身对手"。
要求：根据场景合理分布境界、姓名性格多样化、身份决定行为。
输出JSON：{姓名,性别,年龄,境界:{名称,阶段},性格,外貌,背景,说话风格,当前行为,个人目标,初始好感度:50}`,
      category: 'generation',
      description: '动态生成NPC',
      order: 1,
      weight: 5
    },
    eventGeneration: {
      name: '事件生成',
      content: `生成修仙世界"刚刚发生"的世界事件（用于影响玩家与世界演变）。要求：
- 必须让玩家受到影响（危险/资源/关系/位置/修炼环境/势力格局至少一项）
- 事件可以是宗门大战、世界变化、异宝降世、秘境现世、好友出事/突破等
- 涉及好友时，需参考关系/好感度与境界，不能无端超规格
- 不要公告式总结，要有现场感（刚发生）
输出JSON（不要代码块/解释/额外文本）：
{
  "event": {
    "事件ID": "event_时间戳_随机数",
    "事件名称": "string",
    "事件类型": "string",
    "事件描述": "string",
    "影响等级": "轻微|中等|重大|灾难",
    "影响范围": "string",
    "相关人物": ["string"],
    "相关势力": ["string"],
    "事件来源": "随机",
    "发生时间": {"年":0,"月":1,"日":1,"小时":0,"分钟":0}
  },
  "prompt_addition": "一段可直接注入主叙事的事件快照（强调刚刚发生）"
}`,
      category: 'generation',
      description: '动态生成世界事件',
      order: 2,
      weight: 5,
      condition: 'eventSystem'
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
    },

    // ==================== 文本优化提示词 ====================
    textOptimization: {
      name: '文本优化',
      content: `# 文本优化助手

你是一个专业的中文文学编辑，负责优化修仙小说文本。

## 优化原则
1. **保持原意**：不改变故事情节、人物行为、对话内容
2. **提升文采**：使用更优美、更具画面感的表达
3. **修仙风格**：保持修仙世界的语言风格和氛围
4. **流畅自然**：确保行文流畅，过渡自然
5. **精简冗余**：删除重复、啰嗦的表达

## 优化重点
- 动作描写：更加生动形象
- 环境描写：增加意境和氛围
- 对话：保持人物性格特色
- 心理描写：更加细腻深入

## 禁止事项
- 不要添加新的情节或角色
- 不要改变原有的判定结果
- 不要输出任何JSON格式内容
- 不要添加解释或评论

## 输出格式
直接输出优化后的纯文本，不要任何额外内容。`,
      category: 'summary',
      description: '优化AI生成的文本',
      order: 3,
      weight: 5
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
