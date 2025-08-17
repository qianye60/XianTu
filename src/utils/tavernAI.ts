import { toast } from './toast';
import type { Talent, World, TalentTier, Origin, SpiritRoot, CharacterData } from '../types';
import type { GM_Request, GM_Response } from '../types/AIGameMaster';
import { buildGmRequest } from './AIGameMaster';

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


// 6. 地图生成提示词 (坤舆图志) v2
const MAP_GENERATION_PROMPT = `${ROLE_PLAY_INSTRUCTION}
# **三、 生成任务：开辟坤舆图志**
你是一位名为“天机阁舆图师”的地理与气运专家。你的任务是为一方新生的修仙世界，生成其核心的地理、势力分布及秘境信息，并以 **GeoJSON** 格式进行输出。

## **世界观基石 (必须严格遵守)**
*   **坐标系:** 经纬度坐标系。经度范围 [-180, 180], 纬度范围 [-90, 90]。
*   **地理逻辑:** 势力范围 (\`Polygon\`) 应当符合地理逻辑。秘境、城市 (\`Point\`) 等应坐落于合理的地理位置上。
*   **气运显化:** 势力的颜色 (\`style.color\`) 代表其气运或属性。例如，魔道宗门可用暗色系（#6b21a8），正道大派可用明亮色系（#1d4ed8）。
*   **世界尺度:** **请确保生成的地理要素分布广泛，坐标横跨万里（例如，经纬度差值达到数十上百），以体现世界的广袤无垠与苍茫古老之感。**

## **生成步骤 (总计10-15个Features)：**

### **第一步：开辟大陆（1-2个Features）**
*   生成1到2个宏大的 **大洲**。
*   \`geometry.type\`: "Polygon"
*   \`properties.featureType\`: "continent"
*   \`properties.name\`: 大洲名称 (例如: 东胜神洲, 南瞻部洲)
*   \`properties.description\`: 对该大洲的宏观描述。

### **第二步：衍化万象（8-13个Features）**
在已生成的大洲内部，创造多样化的势力和地点。

1.  **生成势力范围 (\`Polygon\`, 3-4个):**
    *   \`properties.featureType\`: "faction_territory"
    *   \`properties.name\`: 势力名称 (例如: 青云宗, 万魔窟)
    *   \`properties.factionType\`: 势力类型，应当多样化，例如 '宗门', '修仙世家', '凡俗王朝', '散修联盟' 等。
    *   \`properties.description\`: 势力描述。
    *   \`properties.style\`: 必须包含 \`color\`, \`fillColor\`, \`fillOpacity\` (0.3-0.6), \`weight\` (1-3)。
    *   **\`properties.continent\`: (关键) 其值必须是该势力所在大洲的名称。**

2.  **生成兴趣点 (\`Point\`, 5-7个):**
    *   \`properties.featureType\`: 必须是 "secret_realm" (秘境), "city" (城市), 或 "landmark" (奇观) 中的一种。
    *   \`properties.name\`: 地点名称 (例如: 万剑冢, 云来城, 不周山)
    *   \`properties.description\`: 地点描述。
    *   \`properties.icon\`: 一个代表其类型的英文标识符 (例如: 'sword-cave', 'city-gate', 'mountain-peak')。
    *   **\`properties.continent\`: (关键) 其值必须是该地点所在大洲的名称。**

## **四、 JSON输出格式 (GeoJSON FeatureCollection)**
**你必须严格遵循下面的GeoJSON格式，这是唯一允许的输出格式。**
\`\`\`json
{
  "mapData": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": { "type": "Polygon", "coordinates": [ [ [80, 20], [120, 20], [120, 50], [80, 50], [80, 20] ] ] },
        "properties": {
          "featureType": "continent",
          "name": "东胜神洲",
          "description": "灵气充裕，人杰地灵，乃正道宗门汇聚之地。"
        }
      },
      {
        "type": "Feature",
        "geometry": { "type": "Polygon", "coordinates": [ [ [102, 25], [105, 25], [105, 28], [102, 28], [102, 25] ] ] },
        "properties": {
          "featureType": "faction_territory",
          "continent": "东胜神洲",
          "name": "青云宗",
          "factionType": "宗门",
          "description": "东胜神洲第一大宗，剑修圣地，山门连绵八百里。",
          "style": { "color": "#1d4ed8", "fillColor": "#1d4ed8", "fillOpacity": 0.4, "weight": 2 }
        }
      },
      {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [103.5, 26.5] },
        "properties": {
          "featureType": "city",
          "continent": "东胜神洲",
          "name": "云来城",
          "description": "青云宗山脚下的凡人城市，商贸繁荣。",
          "icon": "city-gate"
        }
      }
    ]
  }
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
 * 根据世界背景，调用AI生成地图信息（创世流程专用）
 * 此版本直接使用专业的 MAP_GENERATION_PROMPT，并将世界描述注入其中。
 * @param world 包含世界描述的世界对象
 */
export async function generateMapFromWorld(world: World): Promise<any> {
    const prompt = `You are a fantasy world map generator. Based on the following world description, generate a valid GeoJSON FeatureCollection.

World: ${world.name}
Era: ${world.era}
Description: ${world.description}

Requirements:
1. Create 1-2 continents as Polygon features
2. Create 3-4 faction territories within the continents
3. Create 5-7 points of interest (cities, secret realms, landmarks)
4. Use coordinates that span a wide range to show a vast world
5. Each feature must have appropriate properties

Output a valid GeoJSON FeatureCollection JSON object directly, without any markdown formatting or explanations.

Example structure:
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {"type": "Polygon", "coordinates": [[[80,20],[120,20],[120,50],[80,50],[80,20]]]},
      "properties": {"featureType": "continent", "name": "Eastern Continent", "description": "A vast land"}
    }
  ]
}`;
    
    try {
        const helper = getTavernHelper();
        
        console.log("【神识印记】准备向天机阁问询舆图...");
        console.log("【神识印记】世界信息:", { name: world.name, era: world.era });
        
        // 使用正确的 generateRaw API
        const rawResult = await helper.generateRaw({
            ordered_prompts: [{ role: 'system', content: prompt }],
            generation_args: {
                temperature: 0.8,
                max_new_tokens: 1024, // 地图数据需要更多token
            }
        });
        
        console.log("【神识印记】天机阁已回应舆图信息，开始解析...");

        if (!rawResult || typeof rawResult !== 'string') {
            console.error('【神识印记】天机阁回应为空或非字符串:', rawResult);
            throw new Error('天机阁未返回有效的舆图数据。');
        }

        // 尝试从返回结果中提取JSON
        let geoJsonData;
        try {
            // 清理可能的markdown标记
            const cleanedText = rawResult
                .replace(/```json\s*/g, '')
                .replace(/```\s*/g, '')
                .trim();
            
            // 尝试找到JSON对象
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.error('【神识印记】无法在回应中找到JSON:', rawResult);
                throw new Error('天机阁回应中未包含有效的JSON数据。');
            }
            
            geoJsonData = JSON.parse(jsonMatch[0]);
            console.log("【神识印记】成功解析舆图数据:", geoJsonData);
            
        } catch (e) {
            console.error('【神识印记-衍化山河失败根源】解析失败:', e);
            console.error('【神识印记】原始回应内容:', rawResult);
            throw new Error('天机阁回应的舆图格式无法解析。');
        }

        // 验证GeoJSON结构
        if (geoJsonData && geoJsonData.type === 'FeatureCollection' && Array.isArray(geoJsonData.features)) {
            console.log("【神识印记】舆图验证通过，包含", geoJsonData.features.length, "个地理要素");
            return geoJsonData;
        } else {
            console.error('【神识印记-衍化山河失败根源】舆图结构无效:', geoJsonData);
            throw new Error('天机阁生成的舆图不符合GeoJSON规范。');
        }

    } catch (error: any) {
        console.error('【神识印记-衍化山河失败根源】与天机阁沟通失败:', error);
        console.error('【神识印记】错误详情:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        // 生成一个默认的简单地图作为后备方案
        console.log("【神识印记】启用备用舆图方案...");
        return {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: [[[100, 20], [140, 20], [140, 50], [100, 50], [100, 20]]]
                    },
                    properties: {
                        featureType: "continent",
                        name: world.name || "神州大陆",
                        description: world.description || "一片广袤的修仙大陆"
                    }
                },
                {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [120, 35]
                    },
                    properties: {
                        featureType: "city",
                        continent: world.name || "神州大陆",
                        name: "凌云城",
                        description: "大陆中心的繁华修仙城市",
                        icon: "city-gate"
                    }
                }
            ]
        };
    }
}


/**
 * 调用酒馆AI生成世界地图信息 (完整版，可用于手动刷新或扩展)
 */
export async function generateMapData(): Promise<any> {
    const result = await generateItemWithTavernAI<any>(MAP_GENERATION_PROMPT, '舆图');
    // AI应返回 { mapData: GeoJSONObject } 结构
    if (result && result.mapData && result.mapData.type === 'FeatureCollection') {
        return result.mapData; // 直接返回GeoJSON对象
    } else {
        console.error('从AI返回的舆图数据结构无效:', result);
        toast.error('AI生成的舆图数据格式不符合GeoJSON规范。');
        return null;
    }
}


// =======================================================================
//                           初始消息生成 (GM v2)
// =======================================================================

const INITIAL_MESSAGE_PROMPT = `${ROLE_PLAY_INSTRUCTION}
# **三、 生成任务：道友降世 (GM)**
你现在是此方世界的“天道主宰”，一个智能游戏主控(GM)。你的任务是为一名新生的道友，生成其降世的完整初始状态。

## **输入信息 (Input):**
你将收到一个 **GM_Request** 格式的JSON对象，包含了角色和世界的全部初始信息。示例如下：
\`\`\`json
INPUT_PLACEHOLDER
\`\`\`

## **核心任务:**
1.  **推演过往 (Handle Age):** 如果角色年龄不为0，你必须根据其出身、天赋、灵根和气运，在返回的 \`text\` 字段中，简要叙述从其出生到当前年龄的关键经历。
2.  **选定或创造降生点 (Select Spawn Point):** 根据角色的气运，从地图中选择一个合理的初始位置。
3.  **赋予初始状态 (Grant Initial State):** 根据角色的出身和推演的过往经历，使用 \`tavern_commands\` 指令集，为其赋予合理的初始状态。例如：
    *   猎户出身，可使用 \`push\` 指令向 \`chat.inventory\` 数组添加一把“旧猎弓”。
    *   若经历过奇遇，可使用 \`set\` 指令为角色添加一个新状态，如 \`chat.character.skills.ancient_reading = true\`。
    *   必须在 \`text\` 字段中，将降生场景和获得的初始状态自然地描绘出来。

## **四、 输出格式 (Output - 必须严格遵守):**
你 **必须** 返回一个 **GM_Response** 格式的JSON对象，其中必须包含 \`tavern_commands\` 数组。

\`\`\`json
{
  "text": "你在一阵颠簸中醒来，发现自己正躺在一辆摇晃的马车上。空气中弥漫着草木与泥土的芬芳。你记起来，你是【书香门第】的次子，因不喜仕途，年仅十六便外出游学。昨日路遇山匪，幸被一位路过的修士所救，他见你颇有灵性，便赠予你一枚【纳戒】，并指点你前往【青云宗】尝试拜山门。\\n\\n你低头看去，一枚古朴的戒指正戴在你的手指上。",
  "around": "一辆简陋的马车，车外是崎岖的山路，远处可见连绵的山脉轮廓。",
  "tavern_commands": [
    {
      "action": "set",
      "scope": "chat",
      "key": "character.location",
      "value": "青云宗山下"
    },
    {
      "action": "push",
      "scope": "chat",
      "key": "inventory",
      "value": { "name": "纳戒", "type": "法宝", "description": "一枚最基础的储物戒指，内有三尺见方的空间。" }
    }
  ]
}
\`\`\`
`;

/**
 * 调用酒馆AI生成初始降世消息 (GM模式)
 * @param character 基础角色数据对象
 * @param creationDetails 包含年龄和描述来源的创建详情
 * @param mapData AI生成的GeoJSON地图数据
 */
export async function generateInitialMessage(
  character: CharacterData,
  creationDetails: { age: number; originName: string; spiritRootName: string; },
  mapData: any
): Promise<GM_Response> {
  // 1. 构造AI需要的、带有附加信息 CharacterData 对象
  const characterForAI = {
    ...character,
    age: creationDetails.age,
    description: `出身于${creationDetails.originName}，拥有${creationDetails.spiritRootName}。`,
  };

  // 2. 构建标准GM请求
  const request = buildGmRequest(characterForAI, mapData);

  // 3. 将请求对象注入到提示词模板中
  const prompt = INITIAL_MESSAGE_PROMPT
    .replace(
      'INPUT_PLACEHOLDER',
      JSON.stringify(request, null, 2) // 格式化JSON以便AI更好地阅读
    );

  // 4. 调用通用生成器，并期望返回GM_Response格式
  const result = await generateItemWithTavernAI<GM_Response>(prompt, '初始消息');

  // 5. 返回结构化的响应
  return result as GM_Response;
}
