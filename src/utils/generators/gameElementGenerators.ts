import { generateItemWithTavernAI } from '../tavernCore';
import { WORLD_ITEM_GENERATION_PROMPT, TALENT_TIER_ITEM_GENERATION_PROMPT, 
         ORIGIN_ITEM_GENERATION_PROMPT, SPIRIT_ROOT_ITEM_GENERATION_PROMPT, 
         TALENT_ITEM_GENERATION_PROMPT, MAP_GENERATION_PROMPT } from '../prompts/gameElementPrompts';
import type { GM_Response } from '../../types/AIGameMaster';

/**
 * AI生成世界设定
 */
export async function generateWorld(): Promise<any> {
  return await generateItemWithTavernAI(WORLD_ITEM_GENERATION_PROMPT, '世界设定');
}

/**
 * AI生成天资等级
 */
export async function generateTalentTier(): Promise<any> {
  return await generateItemWithTavernAI(TALENT_TIER_ITEM_GENERATION_PROMPT, '天资等级');
}

/**
 * AI生成出身背景
 */
export async function generateOrigin(): Promise<any> {
  return await generateItemWithTavernAI(ORIGIN_ITEM_GENERATION_PROMPT, '出身背景');
}

/**
 * AI生成灵根类型
 */
export async function generateSpiritRoot(): Promise<any> {
  return await generateItemWithTavernAI(SPIRIT_ROOT_ITEM_GENERATION_PROMPT, '灵根类型');
}

/**
 * AI生成天赋技能
 */
export async function generateTalent(): Promise<any> {
  return await generateItemWithTavernAI(TALENT_ITEM_GENERATION_PROMPT, '天赋技能');
}

/**
 * 根据世界背景，调用AI生成地图信息，并返回包含指令的GM_Response
 */
export async function generateMapFromWorld(world: any): Promise<GM_Response> {
    const worldName = world.name || world.名称 || '未知世界';
    const worldEra = world.era || world.时代 || world.时代背景 || '未知时代';
    const worldDesc = world.description || world.描述 || world.世界描述 || '未知描述';

    console.log('【神识印记】准备生成地图，世界信息:', { worldName, worldEra, worldDesc });

    // 添加随机种子以确保每次生成不同
    const randomSeed = Math.floor(Math.random() * 1000000);
    const timestamp = Date.now();
    const worldInfo = `\n\n## **当前世界信息**\n世界名称: ${worldName}\n时代背景: ${worldEra}\n世界描述: ${worldDesc}\n\n请基于以上世界信息生成对应的地图。`;
    const uniquePrompt = `${worldInfo}\n\n随机种子: ${randomSeed}\n生成时间: ${timestamp}\n\n请确保每次生成的地图都有所不同，包含不同的地点、特色和布局。`;
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