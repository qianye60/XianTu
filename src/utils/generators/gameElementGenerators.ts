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
        
        // 随机生成不同的起始城镇
        const startingCities = ['云雾村', '青石镇', '山泉村', '竹林镇', '飞瀑村', '清风镇', '紫霞村', '翠竹镇'];
        const randomCity = startingCities[Math.floor(Math.random() * startingCities.length)];
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
            text: `鸿蒙初判，清浊始分。吾以神念衍化，为这方名为'${worldName}'的新生世界，定下山川脉络，划定万古基石。`,
            around: "虚空中，一幅巨大的光幕缓缓展开，其上星罗棋布，正是这方世界的完整舆图。",
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
        text: `鸿蒙初判，清浊始分。吾以神念衍化，为这方名为'${worldName}'的新生世界，定下山川脉络，划定万古基石。`,
        around: "虚空中，一幅巨大的光幕缓缓展开，其上星罗棋布，正是这方世界的完整舆图。",
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