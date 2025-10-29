/**
 * 游戏元素生成提示词
 *
 * 【职责】
 * - 定义世界、天资、出身、灵根、天赋、功法等游戏元素的生成规则
 * - 提供详细的字段说明和示例
 * - 定义品质等级和世界观适配规则
 *
 * 【设计原则】
 * - 专注于生成逻辑和字段定义
 * - 通用格式规则从 sharedRules 导入
 * - 避免重复定义JSON格式要求
 */


// 基础指令 - 精简版
const BASE_INSTRUCTION = `你是专业的世界观内容生成器，根据用户提供的主题生成对应风格的内容。

【世界观核心理念】
无论背景设定是什么（仙侠、科幻、现代、赛博朋克等），核心都是"修仙体系"。
关键词："一人修仙"的孤独感 + 超凡体系

【输出要求】
1. 所有数值字段必须是数字类型。
2. 输出必须使用\`\`\`json代码块包裹。
3. 不得添加任何额外的解释说明文字。
`;

// 1. 世界生成
export const IMPROVED_WORLD_GENERATION_PROMPT = `${BASE_INSTRUCTION}

【任务】生成世界设定

【字段】name(2-6字)/description(200-400字)/era(5-10字)
`;

// 2. 天资等级
export const IMPROVED_TALENT_TIER_PROMPT = `${BASE_INSTRUCTION}

【任务】生成天赋等级

【必填字段】
- name: 天赋名称
- description: 描述文字（50-150字）
- total_points: 总点数（数字类型，范围10-50）
- rarity: 稀有度（数字类型，范围1-5）
- color: 颜色（十六进制格式）
`;

// 3. 出身背景 - 优化版
export const IMPROVED_ORIGIN_PROMPT = `${BASE_INSTRUCTION}

【任务】生成出身背景

【字段要求】
- name (字符串): 4-6字的出身名称
- description (字符串): 100-300字的背景故事
- talent_cost (数字): 0-10之间的整数
- rarity (数字): 1-5之间的整数
- attribute_modifiers (对象): 先天六司加成，总和不超过5点
- effects (数组): 1-2个独特效果的文字描述
`;

// 4. 灵根类型 - 优化版
export const IMPROVED_SPIRIT_ROOT_PROMPT = `${BASE_INSTRUCTION}

【任务】生成核心天赋类型（如灵根、血统等）

【字段要求】
- name (字符串): 灵根名称，不含等级前缀
- tier (字符串): 等级，可选值：凡品、下品、中品、上品、极品、神品
- description (字符串): 50-200字的灵根描述
- cultivation_speed (字符串): 修炼速度，格式为"数字x"
- special_effects (数组): 1-3个特殊效果
- base_multiplier (数字): 基础倍率，纯数字
- talent_cost (数字): 3-30之间的整数
- rarity (数字): 1-5之间的整数
`;

// 5. 天赋技能 - 优化版
export const IMPROVED_TALENT_PROMPT = `${BASE_INSTRUCTION}

【任务】生成先天天赋

【字段要求】
- name (字符串): 4-6字的天赋名称
- description (字符串): 30-100字的天赋描述
`;

// 6. 功法生成 - 优化版
export const IMPROVED_TECHNIQUE_PROMPT = `${BASE_INSTRUCTION}

【任务】生成技能或功法

【字段要求】
- 物品ID (字符串): 唯一标识符，格式："gongfa_" + 拼音或数字
- 名称 (字符串): 功法名称，2-8字
- 类型 (字符串): 固定值"功法"
- 品质 (对象): {quality: "凡|黄|玄|地|天|仙|神", grade: 0-10}
- 数量 (数字): 固定为1
- 描述 (字符串): 100-300字的介绍
- 功法效果 (对象): 包含修炼速度加成、属性加成、特殊能力
- 功法技能 (数组): 包含技能名称、描述、消耗、解锁熟练度
- 修炼进度 (数字): 初始为0
- 已装备 (布尔): 初始为false

【品质等级规则】
- **默认生成凡品或黄品**。
- 只有在剧情明确需要"珍贵功法"时才生成**玄品**。
- **地品及以上严禁随意生成**，除非有"上古遗迹"等特殊剧情。
- **神品完全禁止生成**。
- **基础功法名称** (如"引气诀") 必须对应**低品质** (凡/黄)。

【功法技能规则】
- **数量**: 必须包含2-5个技能。
- **解锁**: 第一个技能的解锁熟练度必须为0。
- **世界观**: 技能名称和消耗（灵气/灵能）必须与世界观适配。
`;

// 导出所有优化的提示词
export const IMPROVED_PROMPTS = {
  WORLD: IMPROVED_WORLD_GENERATION_PROMPT,
  TALENT_TIER: IMPROVED_TALENT_TIER_PROMPT,
  ORIGIN: IMPROVED_ORIGIN_PROMPT,
  SPIRIT_ROOT: IMPROVED_SPIRIT_ROOT_PROMPT,
  TALENT: IMPROVED_TALENT_PROMPT,
  TECHNIQUE: IMPROVED_TECHNIQUE_PROMPT,
};

// 向后兼容的导出（使用旧名称）
export const WORLD_ITEM_GENERATION_PROMPT = IMPROVED_WORLD_GENERATION_PROMPT;
export const TALENT_TIER_ITEM_GENERATION_PROMPT = IMPROVED_TALENT_TIER_PROMPT;
export const ORIGIN_ITEM_GENERATION_PROMPT = IMPROVED_ORIGIN_PROMPT;
export const SPIRIT_ROOT_ITEM_GENERATION_PROMPT = IMPROVED_SPIRIT_ROOT_PROMPT;
export const TALENT_ITEM_GENERATION_PROMPT = IMPROVED_TALENT_PROMPT;
export const TECHNIQUE_ITEM_GENERATION_PROMPT = IMPROVED_TECHNIQUE_PROMPT;


/**
 * @deprecated Placeholder for missing export to resolve build error. Should be removed once the dependency is located and fixed.
 */
export const MAP_GENERATION_PROMPT = ``;