import { toast } from './toast';
import type { Talent, World, TalentTier, Origin, SpiritRoot } from '../types';

// =======================================================================
//                           核心：酒馆上下文获取
// =======================================================================

/**
 * 获取SillyTavern助手API，适配iframe环境。
 * @returns {any} - 返回TavernHelper对象
 */
function getTavernHelper(): any {
  // @ts-ignore
  if (window.parent?.TavernHelper?.generateRaw) {
    // @ts-ignore
    return window.parent.TavernHelper;
  }
  toast.error('感应酒馆助手灵脉失败，请确认在SillyTavern环境中运行！');
  throw new Error('TavernHelper API not found in window.parent.');
}


// =======================================================================
//                                提示词定义
// =======================================================================

// 通用指令：扮演专家角色，并严格遵循JSON格式
const ROLE_PLAY_INSTRUCTION = `
# **一、 角色扮演**
你是一位精通东方玄幻设定的“天机阁”推演大师。你的任务是创造独特、有趣且符合逻辑的修仙世界元素。

# **二、 输出格式 (至关重要)**
**你必须严格按照任务指定的JSON格式输出，绝对不能包含任何JSON格式之外的解释、注释或任何额外文本。**
`;

// 1. 世界生成提示词
const WORLD_ITEM_GENERATION_PROMPT = `${ROLE_PLAY_INSTRUCTION}
# **三、 生成任务：开辟鸿蒙**
请生成一个独特的修仙世界设定。

## **具体要求：**
1.  **世界命名:** 起一个富有修仙世界古典的名字 (例如: 玄黄大界, 沧澜古陆, 碎星天域)。
2.  **世界描述:** 用200-400字，描绘这个世界的宏观背景、独特的修炼体系、能量来源或重大历史事件。使其感觉独一无二。
3.  **时代背景:** 定义当前所处的时代特征 (例如: 上古遗迹频出，黄金大世 / 仙路断绝，末法时代 / 灵气复苏，都市修仙 / 魔族入侵，烽烟四起)。

## **四、 JSON输出格式**
\`\`\`json
{
  "name": "世界名称",
  "description": "详细的世界背景描述...",
  "era": "当前时代背景"
}
\`\`\`
`;

// 2. 天资等级生成提示词
const TALENT_TIER_ITEM_GENERATION_PROMPT = `${ROLE_PLAY_INSTRUCTION}
# **三、 生成任务：天定仙缘**
请生成一个独特的天资等级。

## **具体要求：**
1.  **天资命名:** 起一个富有层次感的名字 (例如: 凡夫俗子, 中人之姿, 天生灵秀, 气运之子, 大道亲和)。
2.  **天资描述:** 简要描述该天资等级的特点。
3.  **总点数:** 设定一个介于10到50之间的整数，作为该天资等级可分配的天道点数。
4.  **稀有度:** 设定一个1到5的整数（1最常见，5最稀有）。
5.  **颜色:** 提供一个十六进制颜色代码，用于UI显示。

## **四、 JSON输出格式**
\`\`\`json
{
  "name": "天资名称",
  "description": "天资特点描述",
  "total_points": 25,
  "rarity": 3,
  "color": "#A020F0"
}
\`\`\`
`;

// 3. 出身背景生成提示词
const ORIGIN_ITEM_GENERATION_PROMPT = `${ROLE_PLAY_INSTRUCTION}
# **三、 生成任务：轮回之始**
请生成一个独特的出身背景。

## **具体要求：**
1.  **出身命名:** 起一个能体现其阶级或特点的名字 (例如: 边陲猎户, 书香门第, 没落王孙, 宗门弃徒)。
2.  **背景故事:** 用100-200字，生动地描述这个出身的经历和故事。
3.  **天道点消耗:** 设定一个介于-10到10之间的整数。正面出身消耗点数，负面出身提供点数。
4.  **稀有度:** 设定一个1到5的整数（1最常见，5最稀有）。

## **四、 JSON输出格式**
\`\`\`json
{
  "name": "出身名称",
  "description": "生动的背景故事...",
  "talent_cost": 5,
  "rarity": 2
}
\`\`\`
`;

// 4. 灵根生成提示词
const SPIRIT_ROOT_ITEM_GENERATION_PROMPT = `${ROLE_PLAY_INSTRUCTION}
# **三、 生成任务：灵根天定**
请生成一种独特的灵根。

## **具体要求：**
1.  **灵根命名:** 起一个独特的名字，可以不是传统的五行灵根 (例如: 废灵根, 混沌灵根, 太阴灵根, 剑心通明)。
2.  **特点描述:** 描述该灵根的修炼特性、优缺点。
3.  **基础倍率:** 设定一个0.1到5.0之间的小数，代表基础修炼速度倍率。
4.  **天道点消耗:** 设定一个介于-10到20之间的整数。

## **四、 JSON输出格式**
\`\`\`json
{
  "name": "灵根名称",
  "description": "灵根的修炼特性、优缺点",
  "base_multiplier": 1.5,
  "talent_cost": 10
}
\`\`\`
`;

// 5. 天赋生成提示词
const TALENT_GENERATION_PROMPT = `${ROLE_PLAY_INSTRUCTION}
# **三、 生成任务：命格造化**
请生成一个独特的修仙天赋。

## **具体要求：**
1.  **天赋命名:** 起一个言简意赅且有趣的名字 (例如: 老而弥坚, 丹毒免疫, 话痨, 一诺千金)。
2.  **效果描述:** 清晰地描述天赋带来的正面或负面效果。
3.  **天道点消耗:** 设定一个介于-10到10之间的整数。正面天赋消耗点数，负面天赋提供点数。

## **四、 JSON输出格式**
\`\`\`json
{
  "name": "天赋名称",
  "description": "清晰的天赋效果描述",
  "talent_cost": 3
}
\`\`\`
`;


// 6. 世界书（大陆及势力）生成提示词
const WORLD_GENERATION_PROMPT = `${ROLE_PLAY_INSTRUCTION}
# **三、 生成任务：大陆格局**
请基于东方玄幻世界观，随机生成一个独特凡界大陆的初始势力格局。

## **世界观基石 (必须严格遵守)**
*   **能量体系:** 核心能量是“灵气”。“灵脉”是灵气的脉络。
*   **社会结构:** 修仙者以“宗门”和“世家”为主，凡人建立“王朝”。
*   **阵营划分:** 分为“正道”、“邪修”、“魔修”和“中立”。
*   **境界水平:** 凡界最高战力通常为“化神”或“炼虚”期。

## **具体要求：**
1.  **大陆命名与描述：**
    *   为大陆起一个富有东方玄幻色彩的名字。
    *   用2-3句话简要描述大陆的宏观地理特征。
2.  **核心势力生成 (5-7个)：**
    *   确保势力类型多样化，至少包含：**2个宗门，1个修仙世家，1个凡俗王朝**。
    *   确保阵营分布均衡，至少包含：**1个正道领袖，1个邪道/魔道巨擘**。
    *   为势力之间构建一些基础的**敌对或同盟关系**。

## **四、 JSON输出格式**
\`\`\`json
{
  "continentName": "大陆名称",
  "continentDescription": "大陆的宏观地理描述。",
  "factions": [
    {
      "name": "势力名称",
      "type": "势力类型 (宗门/修仙世家/凡俗王朝/散修联盟/魔修/邪修)",
      "alignment": "阵营 (正道/邪修/魔修/中立)",
      "location": "地理位置 (例如：坐落于大陆东部，青云山脉)",
      "powerLevel": "实力等级 (例如：大陆霸主/一流势力/中坚力量/崛起新秀)",
      "description": "一段精炼的描述，包括其核心理念、擅长的功法/技艺、以及当前的主要目标或困境。"
    }
  ]
}
\`\`\`
`;


// =======================================================================
//                           通用AI生成器 (最终版)
// =======================================================================

/**
* 通用AI生成器 (使用 TavernHelper.generateRaw)
* @param prompt - 提示词
* @param typeName - 类型名称 (用于日志)
* @returns {Promise<any>} 解析后的JSON对象
*/
async function generateItemWithTavernAI<T>(prompt: string, typeName: string): Promise<Partial<T>> {
  try {
    const helper = getTavernHelper();
    toast.info(`天机运转，推演${typeName}...`);

    // 使用 TavernHelper.generateRaw API，并提高温度以增加随机性
    const rawResult = await helper.generateRaw({
      ordered_prompts: [{ role: 'system', content: prompt }],
      generation_args: {
        temperature: 1.2, // 提高温度，让结果更多样化
        max_new_tokens: 512, // 限制最大长度
      }
    });

    if (!rawResult || typeof rawResult !== 'string') {
      throw new Error(`AI未返回任何有效的${typeName}文本。`);
    }

    // 尝试从返回结果中提取JSON字符串
    const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(`原始AI输出 (${typeName}):`, rawResult);
      throw new Error(`AI返回内容中未找到有效的JSON结构。`);
    }
    const jsonString = jsonMatch[0];

    try {
      const parsedData = JSON.parse(jsonString);
      return parsedData as Partial<T>;
    } catch (parseError) {
      console.error(`无法解析的JSON (${typeName}):`, jsonString);
      console.error(`原始AI输出 (${typeName}):`, rawResult);
      throw new Error(`AI返回的${typeName}格式错乱，无法解析。`);
    }

  } catch (error: any) {
    console.error(`调用酒馆AI生成${typeName}失败:`, error);
    toast.error(`${typeName}推演失败: ${error.message}`);
    throw error;
  }
}

// =======================================================================
//                            具体类型的AI生成函数
// =======================================================================

export async function generateWorldWithTavernAI(): Promise<World> {
  const parsed = await generateItemWithTavernAI<World>(WORLD_ITEM_GENERATION_PROMPT, '世界');
  return {
    id: Date.now(),
    name: parsed.name || '未知世界',
    description: parsed.description || '',
    era: parsed.era || '未知时代',
  };
}

export async function generateTalentTierWithTavernAI(): Promise<TalentTier> {
  const parsed = await generateItemWithTavernAI<TalentTier>(TALENT_TIER_ITEM_GENERATION_PROMPT, '天资');
  return {
    id: Date.now(),
    name: parsed.name || '凡俗之资',
    description: parsed.description || '',
    total_points: parsed.total_points || 10,
    rarity: parsed.rarity || 1,
    color: parsed.color || '#FFFFFF',
  };
}

export async function generateOriginWithTavernAI(): Promise<Origin> {
  const parsed = await generateItemWithTavernAI<Origin>(ORIGIN_ITEM_GENERATION_PROMPT, '出身');
  return {
    id: Date.now(),
    name: parsed.name || '平凡人家',
    description: parsed.description || '',
    talent_cost: parsed.talent_cost || 0,
    rarity: parsed.rarity || 1,
    attribute_modifiers: null, // AI不生成复杂属性
  };
}

export async function generateSpiritRootWithTavernAI(): Promise<SpiritRoot> {
  const parsed = await generateItemWithTavernAI<SpiritRoot>(SPIRIT_ROOT_ITEM_GENERATION_PROMPT, '灵根');
  return {
    id: Date.now(),
    name: parsed.name || '凡人灵根',
    description: parsed.description || '',
    base_multiplier: parsed.base_multiplier || 1.0,
    talent_cost: parsed.talent_cost || 0,
  };
}

export async function generateTalentWithTavernAI(): Promise<Talent> {
    const parsed = await generateItemWithTavernAI<Talent>(TALENT_GENERATION_PROMPT, '天赋');
    return {
        id: Date.now(),
        name: parsed.name || '平平无奇',
        description: parsed.description || '没有任何特殊之处。',
        talent_cost: parsed.talent_cost || 0,
        effects: null,
        rarity: 3,
    };
}


// =======================================================================
//                           世界书相关函数
// =======================================================================

/**
 * 调用酒馆AI生成世界地图和势力信息，并直接更新到世界书
 */
export async function generateAndSetupWorldBook(): Promise<void> {
    const worldData = await generateItemWithTavernAI<any>(WORLD_GENERATION_PROMPT, '大陆格局');
    if (worldData && worldData.continentName) {
        await updateWorldBook(worldData);
    } else {
        toast.error('生成的大陆格局数据不完整，无法更新世界书。');
    }
}

/**
 * 将生成的世界信息更新到酒馆的世界书中
 * @param worldData 从AI生成并解析后的世界数据对象
 */
export async function updateWorldBook(worldData: any): Promise<void> {
  try {
    // SillyTavern的sendSystemMessage在主上下文，而非TavernHelper
    // @ts-ignore
    if (!window.parent?.SillyTavern?.getContext) {
        toast.error('无法连接酒馆主灵脉，更新世界书失败！');
        return;
    }
    // @ts-ignore
    const context = window.parent.SillyTavern.getContext();

    if (!context.sendSystemMessage) {
      toast.error('无法访问酒馆言灵法术，更新世界书失败！');
      return;
    }

    const bookName = 'DAD_World_Data';
    const entryKey = worldData.continentName || '世界总览';

    let content = `## ${worldData.continentName}\n\n`;
    content += `${worldData.continentDescription}\n\n`;
    content += `### **核心势力**\n\n`;

    for (const faction of worldData.factions) {
      content += `**${faction.name}**\n`;
      content += `- **类型:** ${faction.type} (${faction.alignment})\n`;
      content += `- **实力:** ${faction.powerLevel}\n`;
      content += `- **位置:** ${faction.location}\n`;
      content += `- **简介:** ${faction.description}\n\n`;
    }

    // 使用/setvar和/setentryfield命令来更新世界书
    await context.sendSystemMessage('slash', `/setvar key=worldBookContent "${content.replace(/"/g, '\\"')}"`);
    await context.sendSystemMessage('slash', `/setentryfield file="${bookName}" key="${entryKey}" content={{getvar::worldBookContent}}`);
    await context.sendSystemMessage('slash', `/flushvar worldBookContent`);

    toast.success(`世界设定已成功录入《${bookName}》`);

  } catch (error: any) {
    console.error('更新世界书失败:', error);
    toast.error(`更新世界书失败: ${error.message}`);
  }
}
