import { generateItemWithTavernAI } from '../tavernCore';
import { WORLD_ITEM_GENERATION_PROMPT, TALENT_TIER_ITEM_GENERATION_PROMPT,
         ORIGIN_ITEM_GENERATION_PROMPT, SPIRIT_ROOT_ITEM_GENERATION_PROMPT,
         TALENT_ITEM_GENERATION_PROMPT, MAP_GENERATION_PROMPT } from '../prompts/gameElementPrompts';
import type { GM_Response } from '../../types/AIGameMaster';
import type { World, TalentTier, Origin, SpiritRoot, Talent } from '../../types';

/**
 * AI生成世界设定
 */
export async function generateWorld(): Promise<World | null> {
  return await generateItemWithTavernAI<World>(WORLD_ITEM_GENERATION_PROMPT, '世界设定');
}

/**
 * AI生成世界设定（带用户提示词）
 */
export async function generateWorldWithPrompt(userPrompt: string): Promise<World | null> {
  const enhancedPrompt = `${WORLD_ITEM_GENERATION_PROMPT}\n\n用户特殊要求：${userPrompt}\n\n请结合用户要求生成相应的世界设定。`;
  return await generateItemWithTavernAI<World>(enhancedPrompt, '世界设定');
}

/**
 * AI生成天资等级
 */
export async function generateTalentTier(): Promise<TalentTier | null> {
  return await generateItemWithTavernAI<TalentTier>(TALENT_TIER_ITEM_GENERATION_PROMPT, '天资等级');
}

/**
 * AI生成天资等级（带用户提示词）
 */
export async function generateTalentTierWithPrompt(userPrompt: string): Promise<TalentTier | null> {
  const enhancedPrompt = `${TALENT_TIER_ITEM_GENERATION_PROMPT}\n\n用户特殊要求：${userPrompt}\n\n请结合用户要求生成相应的天资等级。`;
  return await generateItemWithTavernAI<TalentTier>(enhancedPrompt, '天资等级');
}

/**
 * AI生成出身背景
 */
export async function generateOrigin(): Promise<Origin | null> {
  return await generateItemWithTavernAI<Origin>(ORIGIN_ITEM_GENERATION_PROMPT, '出身背景');
}

/**
 * AI生成出身背景（带用户提示词）
 */
export async function generateOriginWithPrompt(userPrompt: string): Promise<Origin | null> {
  const enhancedPrompt = `${ORIGIN_ITEM_GENERATION_PROMPT}\n\n用户特殊要求：${userPrompt}\n\n请结合用户要求生成相应的出身背景。`;
  return await generateItemWithTavernAI<Origin>(enhancedPrompt, '出身背景');
}

/**
 * AI生成灵根类型
 */
export async function generateSpiritRoot(): Promise<SpiritRoot | null> {
  return await generateItemWithTavernAI<SpiritRoot>(SPIRIT_ROOT_ITEM_GENERATION_PROMPT, '灵根类型');
}

/**
 * AI生成灵根类型（带用户提示词）
 */
export async function generateSpiritRootWithPrompt(userPrompt: string): Promise<SpiritRoot | null> {
  const enhancedPrompt = `${SPIRIT_ROOT_ITEM_GENERATION_PROMPT}\n\n用户特殊要求：${userPrompt}\n\n请结合用户要求生成相应的灵根类型。`;
  return await generateItemWithTavernAI<SpiritRoot>(enhancedPrompt, '灵根类型');
}

/**
 * AI生成天赋技能
 */
export async function generateTalent(): Promise<Talent | null> {
  return await generateItemWithTavernAI<Talent>(TALENT_ITEM_GENERATION_PROMPT, '天赋技能');
}

/**
 * AI生成天赋技能（带用户提示词）
 */
export async function generateTalentWithPrompt(userPrompt: string): Promise<Talent | null> {
  const enhancedPrompt = `${TALENT_ITEM_GENERATION_PROMPT}\n\n用户特殊要求：${userPrompt}\n\n请结合用户要求生成相应的天赋技能。`;
  return await generateItemWithTavernAI<Talent>(enhancedPrompt, '天赋技能');
}

/**
 * 根据世界背景，调用AI生成地图信息，并返回包含指令的GM_Response
 */
export async function generateMapFromWorld(world: any, userConfig?: { majorFactionsCount?: number; totalLocations?: number; secretRealmsCount?: number }, characterInfo?: { origin?: string; age?: number; birthplace?: string }): Promise<GM_Response> {
    const worldName = world.name || world.名称 || '未知世界';
    const worldEra = world.era || world.时代 || world.时代背景 || '未知时代';
    const worldDesc = world.description || world.描述 || world.世界描述 || '未知描述';

    console.log('【神识印记】准备生成地图，世界信息:', { worldName, worldEra, worldDesc });
    console.log('【神识印记】用户配置信息:', userConfig);
    console.log('【神识印记】角色信息:', characterInfo);

    // 添加随机种子以确保每次生成不同
    const randomSeed = Math.floor(Math.random() * 1000000);
    const timestamp = Date.now();
    
    // 构建包含用户配置的世界信息
    let worldInfo = `

## **当前世界信息**
世界名称: ${worldName}
时代背景: ${worldEra}
世界描述: ${worldDesc}`;
    
    // 如果有用户配置，添加到提示词中
    if (userConfig) {
        worldInfo += `

## **用户生成配置要求**
- 主要势力数量: ${userConfig.majorFactionsCount || 7}个
- 地点总数: ${userConfig.totalLocations || 25}个
- 秘境数量: ${userConfig.secretRealmsCount || 8}个

**请严格按照上述配置生成对应数量的势力范围和地点。**`;
    }
    
    // 如果有角色信息，添加角色相关地点要求
    if (characterInfo) {
        const age = characterInfo.age || 18;
        const origin = characterInfo.origin || characterInfo.birthplace || '未知出身';
        
        worldInfo += `

## **角色背景相关地点要求**
- 角色出身: ${origin}
- 角色年龄: ${age}岁
- 游戏开始位置: 需要根据角色出身安排合适的起始地点

**重要要求：**
1. **必须生成角色出生地**: 根据角色出身"${origin}"，在地图中创建对应的出生地点（如：门派、村落、城镇等）
2. **必须生成早期活动地点**: 根据角色${age}岁的年龄，生成角色在成长过程中可能接触过的地方（如：附近的城镇、集市、修炼地等）
3. **起始位置标记**: 将其中一个地点设为游戏开始位置，通常是角色出身相关的地点
4. **地点关联性**: 确保生成的角色相关地点在地理位置上有合理的关联性

**地点生成建议：**
- 如果是门派出身：生成对应宗门、附近的城镇、修炼场所
- 如果是世家出身：生成家族府邸、管辖城市、商业据点  
- 如果是散修出身：生成村落、集市、野外修炼地
- 如果是皇室出身：生成皇城、行宫、重要城池`;
    }
    
    const uniquePrompt = `${worldInfo}

随机种子: ${randomSeed}
生成时间: ${timestamp}

请基于以上世界信息、配置要求和角色背景生成对应的地图，确保每次生成的地图都有所不同，并且包含角色相关的重要地点。`;
    const prompt = MAP_GENERATION_PROMPT + uniquePrompt;

    // 1. 直接让AI生成GeoJSON
    console.log('【地图生成-调试】准备调用generateItemWithTavernAI');
    console.log('【地图生成-调试】MAP_GENERATION_PROMPT长度:', MAP_GENERATION_PROMPT.length);
    console.log('【地图生成-调试】MAP_GENERATION_PROMPT前200字符:', MAP_GENERATION_PROMPT.substring(0, 200));
    console.log('【地图生成-调试】完整prompt长度:', prompt.length);
    console.log('【地图生成-调试】完整prompt前300字符:', prompt.substring(0, 300));
    
    const geoJson = await generateItemWithTavernAI<any>(prompt, '世界舆图GeoJSON', false);

    if (!geoJson || !geoJson.type || !geoJson.features) {
        console.error('【神识印记-衍化山河失败根源】AI未能生成有效的GeoJSON:', geoJson);
        console.warn('【神识印记-山河应急措施】使用默认的山河脉络');
        
        // 使用通用的安全起始点，避免硬编码具体名称
        const randomCity = `起始安全区域`;
        const randomX = (Math.random() - 0.5) * 0.1; // -0.05 到 0.05
        const randomY = (Math.random() - 0.5) * 0.1;
        
        const fallbackGeoJson = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {
                        name: randomCity,
                        type: '凡人城镇',
                        description: `适合初入修仙的新人居住的安全区域`,
                        danger_level: '安全',
                        suitable_for: '凡人-炼气'
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [randomX, randomY]
                    }
                }
            ]
        };

        // 2. 在代码中可靠地封装成GM_Response
        const gmResponse: GM_Response = {
            text: `鸿蒙初判，清浊始分。吾以神念衍化，为这方名为'${worldName}'的新生世界，定下山川脉络，划定万古基石。

虚空中，一幅巨大的光幕缓缓展开，其上星罗棋布，正是这方世界的完整舆图。万里山河尽收眼底，各方势力盘踞其间，静待道友的到来。`,
            mid_term_memory: "【世界诞生】新生世界创建完成，地图数据已设定",
            tavern_commands: [
                {
                    action: "set",
                    scope: "chat",
                    key: "world.mapData",
                    value: fallbackGeoJson
                }
            ]
        };
        console.log("【神识印记】成功在本地封装应急舆图法旨:", gmResponse);
        return gmResponse;
    }

    // 2. 在代码中可靠地封装成GM_Response
    const gmResponse: GM_Response = {
        text: `鸿蒙初判，清浊始分。吾以神念衍化，为这方名为'${worldName}'的新生世界，定下山川脉络，划定万古基石。

虚空中，一幅巨大的光幕缓缓展开，其上星罗棋布，正是这方世界的完整舆图。万里山河尽收眼底，各方势力盘踞其间，静待道友的到来。`,
        mid_term_memory: "【世界诞生】新生世界创建完成，地图数据已设定",
        tavern_commands: [
            {
                action: "set",
                scope: "chat",
                key: "world.mapData",
                value: geoJson
            }
        ]
    };
    console.log("【神识印记】成功在本地封装舆图法旨:", gmResponse);
    return gmResponse;
}

/**
 * 生成角色位置标点，用于在地图上标记角色位置
 */
export async function generatePlayerLocation(
    baseInfo: any, 
    characterInfo: any, 
    enhancedWorldConfig: any,
    mapBounds?: { minLng: number, maxLng: number, minLat: number, maxLat: number }
): Promise<GM_Response> {
    console.log('【角色位置生成】开始生成角色位置标点...');
    console.log('【角色位置生成】角色基础信息:', baseInfo);
    console.log('【角色位置生成】角色详细信息:', characterInfo);
    console.log('【角色位置生成】世界配置:', enhancedWorldConfig);
    console.log('【角色位置生成】地图边界:', mapBounds);

    // 使用地图边界或默认坐标范围
    const bounds = mapBounds || { minLng: 115.0, maxLng: 120.0, minLat: 35.0, maxLat: 42.0 };

    // 构建角色位置生成提示词
    const locationPrompt = `# 角色位置标点生成任务

你需要为刚刚踏入修仙世界的角色生成一个精确的位置标点，用于在世界地图上显示角色的当前位置。

## 角色信息
- 姓名: ${baseInfo.名字}
- 年龄: ${characterInfo.age}岁
- 出身: ${characterInfo.origin}
- 出生地: ${characterInfo.birthplace || characterInfo.origin}
- 世界背景: ${characterInfo.worldBackground}
- 世界时代: ${characterInfo.worldEra}
- 世界名称: ${characterInfo.worldName}

## 地图信息
- 经度范围: ${bounds.minLng} - ${bounds.maxLng}
- 纬度范围: ${bounds.minLat} - ${bounds.maxLat}
- 重要: 角色位置必须在已生成的世界地图的大洲范围内，不能在海洋中或边界外

## 要求

1. **根据角色出身确定合适的起始位置**
   - 如果是门派弟子：应该在对应宗门附近的大洲内
   - 如果是世家子弟：应该在家族势力范围内的大洲内
   - 如果是散修：应该在某个大洲的安全区域内
   - 如果是皇室：应该在皇城所在大洲内

2. **生成位置坐标**
   - 经度范围：${bounds.minLng} - ${bounds.maxLng}
   - 纬度范围：${bounds.minLat} - ${bounds.maxLat}
   - 确保坐标在大洲陆地范围内，不要在海洋或空白区域
   - 坐标应位于某个大洲的中心区域，避免边界位置

3. **输出格式要求**

必须严格按照以下JSON格式输出，作为酒馆命令：

\`\`\`json
{
  "text": "天机定位完成，${baseInfo.名字}的位置已锁定。你发现自己正身处[具体位置描述，位置名称必须按照'大洲名·后缀'格式，如'中土大陆·青石镇']，周围[环境描述]。**重要：必须按照'你发现自己正身处...'的完整格式描述，且位置名称必须是'大洲名·后缀'格式**",
  "mid_term_memory": "【初始定位】角色位置已确定，开始修仙之旅",
  "tavern_commands": [
    {
      "action": "set",
      "scope": "chat", 
      "key": "player_location_marker",
      "value": {
        "id": "player_start_position",
        "name": "${baseInfo.名字}的位置",
        "type": "player_location",
        "coordinates": {
          "longitude": [具体经度数值],
          "latitude": [具体纬度数值]
        },
        "description": "角色${baseInfo.名字}的当前位置",
        "marker_style": {
          "color": "#DC2626",
          "icon": "player",
          "size": "medium"
        }
      }
    }
  ]
}
\`\`\`

**位置描述格式要求**：
- ✅ 正确格式："你发现自己正身处中土大陆·赤泥镇的陶工坊外，周围是熟悉的窑烟和泥土香味。"
- ❌ 错误格式："赤泥镇" 或 "陶工坊" 或 "某某地点"
- 必须包含完整的场景描述，不能只写一个地名

请根据角色的出身背景和世界地图生成合适的位置标点。`;

    try {
        // 调用AI生成位置标点
        const result = await generateItemWithTavernAI<GM_Response>(
            locationPrompt, 
            '角色位置标点', 
            true, 
            2
        );

        if (!result) {
            console.warn('【角色位置生成】AI生成失败，使用默认位置');
            // 生成默认位置，使用地图边界的中心区域
            const centerLng = (bounds.minLng + bounds.maxLng) / 2;
            const centerLat = (bounds.minLat + bounds.maxLat) / 2;
            const defaultResponse: GM_Response = {
                text: `天机定位完成，${baseInfo.名字}的位置已锁定。你发现自己正身处中土大陆·${characterInfo.origin === '散修' ? '幽静山谷' : '安全区域'}，周围灵气淡薄但环境宜人。`,
                mid_term_memory: "【初始定位】角色位置已确定，开始修仙之旅",
                tavern_commands: [
                    {
                        action: "set",
                        scope: "chat",
                        key: "player_location_marker", 
                        value: {
                            id: "player_start_position",
                            name: `${baseInfo.名字}的位置`,
                            type: "player_location",
                            coordinates: {
                                longitude: centerLng + (Math.random() - 0.5) * 1, // 中心位置附近1度范围内随机
                                latitude: centerLat + (Math.random() - 0.5) * 1   // 中心位置附近1度范围内随机
                            },
                            description: `角色${baseInfo.名字}的当前位置`,
                            marker_style: {
                                color: "#DC2626",
                                icon: "player", 
                                size: "medium"
                            }
                        }
                    }
                ]
            };
            
            console.log('【角色位置生成】使用默认位置标点:', defaultResponse);
            return defaultResponse;
        }

        console.log('【角色位置生成】成功生成位置标点:', result);
        return result;
        
    } catch (error) {
        console.error('【角色位置生成】生成过程中出错:', error);
        
        // 错误时返回基础位置
        const fallbackResponse: GM_Response = {
            text: `虽遇天机扰动，但${baseInfo.名字}的大致位置已确定。你发现自己身处中土大陆·安全避难所，这是一个陌生但相对安全的地方。`,
            mid_term_memory: "【位置确定】虽遇干扰，但已安全定位",
            tavern_commands: [
                {
                    action: "set",
                    scope: "chat",
                    key: "player_location_marker",
                    value: {
                        id: "player_start_position",
                        name: `${baseInfo.名字}的位置`,
                        type: "player_location", 
                        coordinates: {
                            longitude: 117.0,
                            latitude: 38.0
                        },
                        description: `角色${baseInfo.名字}的当前位置`,
                        marker_style: {
                            color: "#DC2626",
                            icon: "player",
                            size: "medium"
                        }
                    }
                }
            ]
        };
        
        return fallbackResponse;
    }
}