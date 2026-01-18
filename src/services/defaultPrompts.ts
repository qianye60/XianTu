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
  SECT_DYNAMIC_GENERATION_RULES,
  COMBAT_TURN_BASED_RULES
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
  COMBAT_TURN_BASED_RULES,
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
      weight: 10
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
      content: `# 联机模式基础规则
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
    onlineTravelContext: {
      name: '穿越场景理解',
      content: `# 联机穿越场景 - 核心理解（CRITICAL）

## 🌀 穿越者身份（玩家当前状态）
**玩家是一个穿越者**，通过虚空裂隙从自己的世界穿越到了另一个玩家的世界。

### 穿越者的特征
1. **陌生人身份**：玩家对这个世界一无所知，这里的NPC也不认识玩家
2. **保留记忆**：玩家保留了自己原世界的所有记忆和经历
3. **双重世界观**：玩家知道自己来自另一个世界，但这个世界的NPC不知道"穿越"的概念
4. **临时访客**：玩家随时可能返回原世界，或被世界主人驱逐

## 🎭 玩家可能的"奇怪"行为（必须理解并合理演化）

### 类型1：提到"原世界"相关内容
玩家可能会说：
- "我要找到原世界的玩家"
- "我是从另一个世界来的"
- "我的世界里有个叫XXX的人"
- "我想回到我的世界"
- "这里和我的世界不一样"

**AI应该如何处理**：
- ✅ NPC会觉得玩家在说胡话、疯言疯语，或者是某种隐喻
- ✅ NPC可能认为玩家是在讲故事、做梦、或者修炼走火入魔
- ✅ 如果玩家展示了强大实力，NPC可能会半信半疑
- ✅ 世界继续正常演化，不会因为玩家的"奇怪话"而崩溃
- ❌ 不要让NPC直接理解"穿越"概念（除非是特殊设定的世界）
- ❌ 不要让NPC突然知道"联机"、"玩家"等元概念

### 类型2：寻找世界主人
玩家可能会说：
- "这个世界的主人在哪里？"
- "我要找到XXX（世界主人名字）"
- "我想见见这个世界的创造者"

**AI应该如何处理**：
- ✅ 如果世界主人是NPC，可以正常引导玩家去找
- ✅ 如果世界主人不在线，NPC不知道世界主人的位置
- ✅ NPC可能会误解玩家的意思（比如理解为"宗主"、"城主"等）
- ✅ 可以让玩家通过探索、打听来了解世界主人的信息

### 类型3：提到游戏机制
玩家可能会说：
- "我的穿越点不够了"
- "我要签到"
- "这是联机模式"

**AI应该如何处理**：
- ✅ 完全忽略这些元游戏概念，当作玩家的自言自语
- ✅ 继续推进正常的世界叙事
- ✅ NPC不会对这些话做出反应（除非玩家明确对NPC说）

## 🌍 世界演化原则

### 原则1：世界的独立性
- 这个世界有自己的历史、势力、NPC，不会因为玩家的到来而改变
- 世界主人可能在某处活动，也可能不在线（离线代理）
- 世界的事件、NPC的行为应该符合这个世界的设定

### 原则2：玩家的陌生人视角
- 玩家不知道这个世界的地理、势力、重要人物
- 玩家需要通过探索、询问来了解这个世界
- NPC不会主动告诉玩家"你是穿越者"相关的信息

### 原则3：合理的信息差
- 玩家知道自己是穿越者，但NPC不知道
- 玩家可能会暴露自己的"奇怪"身份，但NPC会用自己的世界观来理解
- 如果玩家展示了超出常理的能力，NPC会惊讶但不会突然理解"穿越"

## 📝 叙事建议

### 当玩家提到"原世界"时
正确示例：
- 【周围的修士面面相觑，似乎觉得你在说胡话】
- "另一个世界？你是在讲故事吗？"那名修士笑道。
- \`\`这人莫不是修炼走火入魔了？\`\` 那名修士心中暗想。

错误示例：
- ❌ "哦，你是穿越者啊！"（NPC不应该理解穿越概念）
- ❌ "原来你是从联机世界来的！"（NPC不应该知道联机）
- ❌ 【系统检测到你是穿越者】（不要暴露元信息）

### 当玩家寻找世界主人时
正确示例：
- "你说的是XXX？他是我们宗门的长老，现在不在宗内。"
- 【你打听到，XXX最近在闭关修炼，不见外人】
- "世界的主人？你是说天道吗？"那名修士疑惑地看着你。

### 当玩家说奇怪的话时
正确示例：
- 【众人沉默，似乎不知道如何回应你的话】
- "你这话我听不懂。"那名修士摇了摇头。
- \`\`此人言语古怪，还是小心为上。\`\` 那名修士心中警惕起来。

## ⚠️ 严禁事项
- ❌ 不要让NPC突然理解"穿越"、"联机"、"玩家"等元概念
- ❌ 不要让世界因为玩家的"奇怪话"而崩溃或出现bug
- ❌ 不要在叙事中暴露"这是游戏"的元信息
- ❌ 不要让NPC直接说出"你是穿越者"之类的话（除非有特殊设定）
- ❌ 不要因为玩家提到原世界就停止叙事或报错

## ✅ 核心要点
1. **玩家是穿越者**，但世界不知道
2. **玩家可以说任何奇怪的话**，AI要能理解并合理演化
3. **世界继续正常运转**，不会因为玩家的话而崩溃
4. **NPC用自己的世界观理解**玩家的奇怪行为
5. **保持叙事的连贯性**，不要突然跳出世界观`,
      category: 'online',
      description: '穿越场景理解与处理',
      order: 1.5,
      weight: 10,
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
      content: `# 分步生成 1/2：仅正文

## 🔴 输出格式
\`\`\`json
{"text":"500-1500字叙事正文"}
\`\`\`

## 📖 文本格式标记 / Text Format Markers
使用以下标记增强叙事表现力：
- 环境描写: 【...】 (场景、天气、氛围)
- 内心思考: \`...\` (NPC心理活动，非主角)
- 角色对话: "..." (人物对话)
- 系统判定: 〖类型:结果,判定值:X,难度:Y,基础:B,幸运:L,环境:E,状态:S〗

## 📝 正文要求（必须遵守）
1. **长度**：500-1500字，不要太短！
2. **判定系统**：战斗/修炼/炼丹/探索/社交等场景**必须使用判定**
3. **判定格式**：〖类型:结果,判定值:X,难度:Y,基础:B,幸运:L,环境:E,状态:S〗
4. **叙事风格**：多描写少总结，结尾留钩子，承接上文情节
5. **格式标记**：合理使用【】环境、\`\`心理、""对话、〖〗判定

## ⚔️ 战斗场景特别要求
- 每次攻防都要进行判定
- 判定结果决定伤害和后果
- 大失败=重伤，大成功=重创敌人

## ⚠️ 严禁
- ❌ mid_term_memory / tavern_commands / action_options 字段
- ❌ <thinking> 标签
- ❌ 任何指令/命令相关内容

## 🔴 输出格式
只输出：\`{"text":"叙事正文内容"}\``.trim(),
      category: 'coreRequest',
      description: '分步模式第1步',
      order: 9,
      weight: 7,
      condition: 'splitGeneration'
    },
    splitGenerationStep2: {
      name: '10. 分步指令',
      content: `# 分步生成 2/2：仅指令

## 🔴 输出格式（必须严格遵守）
\`\`\`json
{"mid_term_memory":"50-100字摘要","tavern_commands":[{"action":"add","key":"元数据.时间.分钟","value":30}],"action_options":["选项1","选项2","选项3","选项4","选项5"]}
\`\`\`

## ⚠️ 严禁（违反将导致生成失败）
- ❌ text 字段（正文已在第1步完成，不要重复生成）
- ❌ <thinking> 标签
- ❌ JSON以外的内容
- ❌ 任何叙事/正文内容

## ✅ 本步骤只需要
- mid_term_memory：摘要
- tavern_commands：数据更新指令
- action_options：行动选项（如启用）

## 🔔 实时关注NPC
若有NPC的\`实时关注\`为true，即使不在玩家身边，也要根据第1步正文推演其动态并更新

## 🔴 再次强调输出格式
只输出：\`{"mid_term_memory":"...","tavern_commands":[...],"action_options":[...]}\`
禁止输出text字段！`.trim(),
      category: 'coreRequest',
      description: '分步模式第2步',
      order: 10,
      weight: 7,
      condition: 'splitGeneration'
    },
    splitInitStep1: {
      name: '11. 开局正文',
      content: `# 开局生成 1/2：仅开局叙事

## 🔴 输出格式（必须严格遵守）
\`\`\`json
{"text":"1200-2500字开局叙事，第三人称，修仙正剧风"}
\`\`\`

## 📖 文本格式标记 / Text Format Markers
- 环境描写: 【...】 (场景、天气、氛围)
- 内心思考: \`...\` (NPC心理活动，非主角)
- 角色对话: "..." (人物对话)

## 叙事要求
- 开篇交代时间地点→中段展现出身处境→结尾留悬念
- 严禁游戏术语和数据罗列
- 合理使用【】环境描写、""对话增强表现力

## ⚠️ 严禁（违反将导致生成失败）
- ❌ mid_term_memory 字段
- ❌ tavern_commands 字段
- ❌ action_options 字段
- ❌ <thinking> 标签
- ❌ 任何指令/命令相关内容

## ✅ 本步骤只需要
- 只输出 {"text":"..."} 这一个字段
- text内容为纯叙事正文
- 指令将在第2步单独生成

## 🔴 再次强调输出格式
只输出：\`{"text":"开局叙事内容"}\`
禁止输出任何其他字段！`.trim(),
      category: 'coreRequest',
      description: '开局分步第1步',
      order: 11,
      weight: 7,
      condition: 'splitGeneration'
    },
    splitInitStep2: {
      name: '12. 开局指令',
      content: `# 开局生成 2/2：初始化数据

## 🔴 输出格式（必须严格遵守）
\`\`\`json
{"mid_term_memory":"50-100字摘要","tavern_commands":[...],"action_options":["选项1","选项2","选项3","选项4","选项5"]}
\`\`\`

## 必须执行的命令（tavern_commands）
1. 时间：set \`元数据.时间\` + set \`角色.身份.出生日期\`
2. 位置：set \`角色.位置\` {描述,x,y}
3. 声望：set \`角色.属性.声望\`（普通0-10/宗门10-50/名门50-100）
4. 资源：set \`角色.背包.灵石\`（贫困0-10/普通10-50/世家100-300）
5. NPC：set \`社交.关系.{NPC名}\`（0-3个重要人物）

## ⚠️ 严禁（违反将导致生成失败）
- ❌ text 字段（正文已在第1步完成，不要重复生成）
- ❌ <thinking> 标签
- ❌ JSON以外的内容
- ❌ 任何叙事/正文内容

## 🔴 再次强调输出格式
只输出：\`{"mid_term_memory":"...","tavern_commands":[...],"action_options":[...]}\`
禁止输出text字段！`.trim(),
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
