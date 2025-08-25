import { generateItemWithTavernAI } from '../tavernCore';
import { INITIAL_MESSAGE_PROMPT } from '../prompts/gameMasterPrompts';
import { buildGmRequest } from '../AIGameMaster';
import type { GM_Response } from '../../types/AIGameMaster';
import type { CharacterData } from '../../types';

/**
 * 调用酒馆AI生成初始降世消息 (GM模式)
 * @param character 基础角色数据对象
 * @param creationDetails 包含年龄和描述来源的创建详情
 * @param mapData AI生成的GeoJSON地图数据
 */
export async function generateInitialMessage(
  initialGameData: any, 
  mapData: any
): Promise<GM_Response> {
  console.log('【神识印记】准备调用AI生成天道初言，数据:', { initialGameData, mapData });

  try {
    // 1. 构建GM_Request对象，展示给AI看
    // 构造CharacterData对象用于buildGmRequest
    const characterDataForGm: CharacterData = {
      character_name: initialGameData.baseInfo.名字,
      id: Date.now(), // 使用时间戳作为临时ID
      world_id: 1, // 默认世界ID
      created_at: new Date().toISOString(),
      inventory: {
        items: [],
        capacity: 100,
        expansions: [],
        currency: { low: 0, mid: 0, high: 0, supreme: 0 }
      },
      talents: [],
      reputation: 0,
      root_bone: initialGameData.baseInfo.先天六司?.根骨 || 0,
      spirituality: initialGameData.baseInfo.先天六司?.灵性 || 0,
      comprehension: initialGameData.baseInfo.先天六司?.悟性 || 0,
      fortune: initialGameData.baseInfo.先天六司?.气运 || 0,
      charm: initialGameData.baseInfo.先天六司?.魅力 || 0,
      temperament: initialGameData.baseInfo.先天六司?.心性 || 0,
      source: 'local' as const
    };
    
    // 构造creationDetails对象
    const creationDetails = {
      age: initialGameData.creationDetails.age,
      originName: initialGameData.creationDetails.originName,
      spiritRootName: initialGameData.creationDetails.spiritRootName
    };
    
    const gmRequest = buildGmRequest(
      characterDataForGm, 
      creationDetails, 
      mapData
    );
    console.log('【神识印记】构建的GM_Request:', gmRequest);

    // 2. 替换提示词中的占位符，然后调用AI
    const prompt = INITIAL_MESSAGE_PROMPT.replace('INPUT_PLACEHOLDER', JSON.stringify(gmRequest, null, 2));
    
    console.log('【角色初始化-调试】准备调用generateItemWithTavernAI');
    console.log('【角色初始化-调试】INITIAL_MESSAGE_PROMPT长度:', INITIAL_MESSAGE_PROMPT.length);
    console.log('【角色初始化-调试】INITIAL_MESSAGE_PROMPT前200字符:', INITIAL_MESSAGE_PROMPT.substring(0, 200));
    console.log('【角色初始化-调试】完整prompt长度:', prompt.length);
    console.log('【角色初始化-调试】完整prompt前300字符:', prompt.substring(0, 300));
    console.log('【神识印记-调试】构建的完整prompt:', prompt);
    console.log('【神识印记-调试】prompt长度:', prompt.length);
    console.log('【神识印记-调试】GM_Request数据:', gmRequest);
    
    // 3. 调用通用生成器，并期望返回GM_Response格式
    const result = await generateItemWithTavernAI<GM_Response>(prompt, '天道初言', false);
    
    // 4. 验证结果结构
    if (!result || !result.text || !result.tavern_commands || result.tavern_commands.length === 0) {
      console.error('【神识印记】AI返回的初始消息结构无效:', result);
      throw new Error('AI返回的初始消息格式不正确或缺少指令。');
    }
    
    // 5. 确保tavern_commands是数组 (以防万一)
    if (!Array.isArray(result.tavern_commands)) {
      console.warn('【神识印记】AI未返回tavern_commands数组，设置为空数组');
      result.tavern_commands = [];
    }
    
    console.log('【神识印记】成功生成天道初言，命令数量:', result.tavern_commands?.length || 0);
    
    // 6. 返回结构化的响应
    return result as GM_Response;
    
  } catch (error: any) {
    console.error('【神识印记】生成天道初言失败:', error);
    console.error('【神识印记】错误详情:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // 返回一个默认的GM响应作为后备，不抛出错误避免双重错误处理
    const fallbackResponse: GM_Response = {
      text: `${initialGameData.baseInfo.名字}，${initialGameData.creationDetails.originName}出身，拥有${initialGameData.creationDetails.spiritRootName}，怀着修仙的梦想踏入了这片广阔的天地。\n\n你的修行之路从此开始，前方有无数的机遇与挑战等待着你。`,
      around: "一片陌生的土地，远山如黛，近水如镜。",
      tavern_commands: [
        {
          action: "set",
          scope: "chat",
          key: "character.cultivation.realm",
          value: "凡人"
        },
        {
          action: "set",
          scope: "chat",
          key: "character.cultivation.realm_level",
          value: 0
        },
        {
          action: "set",
          scope: "chat",
          key: "character.cultivation.realm_progress",
          value: 0
        },
        {
          action: "set",
          scope: "chat",
          key: "character.status.location",
          value: "修仙世界边缘"
        },
        {
          action: "set",
          scope: "chat",
          key: "character.cultivation.lifespan_current",
          value: 18
        },
        {
          action: "set",
          scope: "chat",
          key: "character.cultivation.lifespan_max",
          value: 100
        }
      ]
    };

    console.log('【神识印记】使用默认天道初言:', fallbackResponse);
    return fallbackResponse;
  }
}