import { generateItemWithTavernAI } from '../tavernCore';
import { INITIAL_MESSAGE_PROMPT } from '../prompts/gameMasterPrompts';
import { buildGmRequest } from '../AIGameMaster';
import type { GM_Response } from '../../types/AIGameMaster';

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
    const gmRequest = buildGmRequest(
      initialGameData.baseInfo, 
      initialGameData.saveData, 
      mapData
    );
    console.log('【神识印记】构建的GM_Request:', gmRequest);

    // 2. 替换提示词中的占位符，然后调用AI
    const prompt = INITIAL_MESSAGE_PROMPT.replace('INPUT_PLACEHOLDER', JSON.stringify(gmRequest, null, 2));
    
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