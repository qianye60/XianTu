import { generateItemWithTavernAI } from '../tavernCore';
import { INITIAL_MESSAGE_PROMPT } from '../prompts/gameMasterPrompts';
import { getRandomizedInGamePrompt, createSceneSpecificPrompt } from '../prompts/inGameGMPrompts';
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
  mapData: any,
  additionalPrompt?: string
): Promise<GM_Response> {
  console.log('【神识印记】准备调用AI生成天道初言，数据:', { initialGameData, mapData });

  try {
    // 0. 缓存已生成的世界数据，避免在AI处理过程中丢失
    console.log('【数据缓存】缓存现有世界数据...');
    const { getTavernHelper } = await import('../tavern');
    const tavernHelper = getTavernHelper();
    
    let cachedWorldData = null;
    if (tavernHelper) {
      try {
        // 获取并缓存现有的世界数据
        const existingVars = await tavernHelper.getVariables({ type: 'chat' });
        const existingSaveData = existingVars['character.saveData'] as any;
        
        if (existingSaveData && existingSaveData.世界信息) {
          cachedWorldData = JSON.parse(JSON.stringify(existingSaveData.世界信息)); // 深拷贝避免引用问题
          console.log('【数据缓存】已缓存世界数据:', {
            世界名称: cachedWorldData.世界名称,
            大陆数量: cachedWorldData.大陆信息?.length || 0,
            势力数量: cachedWorldData.势力信息?.length || 0,
            地点数量: cachedWorldData.地点信息?.length || 0
          });
        } else {
          console.log('【数据缓存】未发现现有世界数据');
        }
        
        // 清理chat变量为AI生成做准备，但保留缓存
        console.log('【数据清理】清理chat变量，为AI生成做准备...');
        const allVars = Object.keys(existingVars);
        for (const varName of allVars) {
          await tavernHelper.deleteVariable(varName, { type: 'chat' });
        }
        console.log('【数据清理】已清理所有chat变量，数据已缓存到内存中');
        
      } catch (error) {
        console.warn('【数据缓存】缓存过程中出现警告:', error);
      }
    } else {
      console.warn('【数据缓存】酒馆连接不可用，跳过数据缓存');
    }

    // 1. 处理随机出身和随机灵根，具体化为实际设定
    let processedOrigin = initialGameData.creationDetails.originName;
    let processedSpiritRoot = initialGameData.creationDetails.spiritRootName;
    
    // 随机出身处理
    if (processedOrigin === '随机出身') {
      const possibleOrigins = ['世家子弟', '宗门弟子', '平民出身', '商贾之家', '猎户人家', '书香门第', '孤儿出身'];
      processedOrigin = possibleOrigins[Math.floor(Math.random() * possibleOrigins.length)];
      console.log('【随机出身】已选定:', processedOrigin);
    }
    
    // 随机灵根处理  
    if (processedSpiritRoot === '随机灵根') {
      const possibleRoots = ['五行灵根', '金灵根', '木灵根', '水灵根', '火灵根', '土灵根', '冰灵根', '雷灵根', '风灵根'];
      processedSpiritRoot = possibleRoots[Math.floor(Math.random() * possibleRoots.length)];
      console.log('【随机灵根】已选定:', processedSpiritRoot);
    }

    // 1.1 构建GM_Request对象，展示给AI看
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
    
    // 构造creationDetails对象，使用处理后的具体设定
    const creationDetails = {
      age: initialGameData.creationDetails.age,
      originName: processedOrigin,
      spiritRootName: processedSpiritRoot
    };
    
    const gmRequest = buildGmRequest(
      {
        ...initialGameData.baseInfo,
        出生: processedOrigin,  // 使用处理后的具体出身
        灵根: processedSpiritRoot  // 使用处理后的具体灵根
      },
      creationDetails, 
      mapData
    );
    console.log('【神识印记】构建的GM_Request:', gmRequest);

    // 2. 替换提示词中的占位符，然后调用AI
    const prompt = (INITIAL_MESSAGE_PROMPT + (additionalPrompt ? '\n\n' + additionalPrompt : '')).replace('INPUT_PLACEHOLDER', JSON.stringify(gmRequest, null, 2));
    
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
      console.warn('【神识印记】AI返回的初始消息结构无效，将抛出错误以触发重试:', result);
      // 抛出错误让重试机制处理，而不是直接使用fallback
      throw new Error('AI生成的初始消息格式无效或内容缺失');
    }
    
    // 5. 确保tavern_commands是数组 (以防万一)
    if (!Array.isArray(result.tavern_commands)) {
      console.warn('【神识印记】AI未返回tavern_commands数组，设置为空数组');
      result.tavern_commands = [];
    }
    
    console.log('【神识印记】成功生成天道初言，命令数量:', result.tavern_commands?.length || 0);
    
    // 5.5. 将缓存的世界数据植入到AI生成结果中
    if (cachedWorldData) {
      console.log('【数据植入】将缓存的世界数据植入AI生成结果');
      
      // 移除AI可能生成的world相关命令，避免冲突
      const originalCommandCount = result.tavern_commands.length;
      result.tavern_commands = result.tavern_commands.filter((cmd: any) => 
        !cmd.key || (!cmd.key.includes('世界信息') && !cmd.key.includes('world_') && cmd.key !== 'character.saveData')
      );
      
      if (originalCommandCount !== result.tavern_commands.length) {
        console.log('【数据植入】已过滤AI生成的世界相关命令，避免数据冲突');
      }
      
      // 添加植入世界数据的命令
      result.tavern_commands.push({
        action: "set",
        scope: "chat",
        key: "character.saveData.世界信息",
        value: cachedWorldData
      });
      
      console.log('【数据植入】已添加世界数据植入命令，确保世界数据完整保存');
    } else {
      console.log('【数据植入】无缓存的世界数据，使用AI生成的默认数据');
    }
    
    // 6. 返回结构化的响应，并包含处理后的具体设定和缓存的世界数据
    const finalResult = {
      ...result,
      processedOrigin,
      processedSpiritRoot,
      cachedWorldData // 传递缓存的世界数据供后续使用
    };
    return finalResult as GM_Response;
    
  } catch (error: any) {
    console.warn('【神识印记】生成天道初言失败，抛出错误以触发重试:', error);
    // 不再使用fallback，让重试机制处理
    throw error;
  }
}

/**
 * 创建fallback响应的辅助函数 - 已废弃，现在直接抛出错误让重试机制处理
 */
function createFallbackResponse(initialGameData: any, processedOrigin: string, processedSpiritRoot: string): GM_Response {
  return {
      text: `【${initialGameData.baseInfo.名字}的修仙之路】

十八年前，${processedOrigin}的一个${processedOrigin === '世家子弟' ? '雅致庭院' : processedOrigin === '宗门弟子' ? '宗门侧院' : '普通人家'}里，随着一声嘹亮的啼哭声，${initialGameData.baseInfo.名字}来到了这个世界。

那一夜，${processedOrigin === '世家子弟' ? '家族老祖感应到一股不凡的灵气波动' : processedOrigin === '宗门弟子' ? '山门护山大阵微微震动' : '村里的老槐树开出了不合时节的花朵'}，仿佛预示着这个孩子的不凡命运。

童年时光里，${initialGameData.baseInfo.名字}在家人的呵护下健康成长。父亲是个${processedOrigin === '商贾之家' ? '精明的商人' : processedOrigin === '书香门第' ? '博学的书生' : processedOrigin === '世家子弟' ? '修为不俗的族人' : '勤劳的普通人'}，母亲温柔贤良，一家人其乐融融。

${processedOrigin === '世家子弟' ? '七岁时，家族为其进行了正式的灵根检测，确认了' + processedSpiritRoot + '的天赋，从此开始接受家族的修炼教导。' : processedOrigin === '宗门弟子' ? '作为宗门子弟，从小就接受基础的修炼启蒙，' + processedSpiritRoot + '的天赋在早期的训练中逐渐显现。' : '在平凡的成长过程中，' + initialGameData.baseInfo.名字 + '展现出了一些与众不同的特质，虽然不知道这是否与传说中的灵根有关。'}

从那时起，${initialGameData.baseInfo.名字}就知道，自己${processedOrigin === '世家子弟' || processedOrigin === '宗门弟子' ? '注定要走上修仙之路' : '对那个充满传奇色彩的修炼世界充满了向往'}。

如今十八岁的${initialGameData.baseInfo.名字}，带着家人的期望和自己的梦想，${processedOrigin === '宗门弟子' ? '准备参与内门考核' : processedOrigin === '世家子弟' ? '即将踏出家族庇护开始独立修行' : '即将踏出家门寻找修仙机缘'}......`,
      around: `你现在身处${processedOrigin === '世家子弟' ? '一座古朴典雅的府邸庭院中' : processedOrigin === '宗门弟子' ? '宗门的外门弟子居所里' : '家中简朴但温馨的小屋内'}。

${processedOrigin === '世家子弟' ? '雕梁画栋的建筑彰显着家族的底蕴，庭院中种植着珍贵的灵草，空气中弥漫着淡淡的灵气。远处可见家族的修炼场，偶有族中长辈飞剑掠过。' : processedOrigin === '宗门弟子' ? '四周是同门师兄弟的居所，远处传来晨练的喝彩声，山间灵气清新怡人。宗门的钟声悠扬，提醒着弟子们修炼的时间。' : '虽然家境普通，但处处透露着家人的用心，窗外的小菜园生机勃勃，邻里间的炊烟袅袅升起。偶尔能听到远山传来的奇异鸣叫，暗示着这个世界的不凡。'}

一缕晨光透过窗棂洒在地面上，新的一天即将开始，而你的修仙之路也即将拉开序幕......`,
      mid_term_memory: `【初始刻印】
- ${initialGameData.baseInfo.名字}，${processedOrigin}出身，现年18岁
- ${processedOrigin === '世家子弟' ? '家族子弟，从小接受良好教育' : processedOrigin === '宗门弟子' ? '宗门培养的弟子，接受基础修炼训练' : '平民出身，过着普通人的生活，对修炼世界充满好奇'}
- 家庭成员：慈爱的父母，${processedOrigin === '世家子弟' ? '显赫的家族背景' : processedOrigin === '宗门弟子' ? '宗门长辈的关照' : '和睦的平民家庭氛围'}  
- 童年好友：邻家的青梅竹马，彼此青涩的感情
- 掌握技能：基础文字、简单武艺、${processedOrigin === '书香门第' ? '琴棋书画' : processedOrigin === '商贾之家' ? '算账理财' : processedOrigin === '世家子弟' ? '家族武学' : processedOrigin === '宗门弟子' ? '宗门基础功' : '农耕劳作'}
- 当前状态：身体健康，${processedOrigin === '世家子弟' || processedOrigin === '宗门弟子' ? '已开始修炼启蒙' : '怀着修仙梦想'}，即将踏上人生新阶段
- 人生目标：踏上修仙大道，追求长生不老之境，${processedOrigin === '世家子弟' ? '光耀门楣' : processedOrigin === '宗门弟子' ? '为宗门争光' : '改变家族命运'}`,
      tavern_commands: [
        {
          action: "set",
          scope: "chat",
          key: "character.saveData.玩家角色状态.境界.名称",
          value: "凡人"
        },
        {
          action: "set",
          scope: "chat",
          key: "character.saveData.玩家角色状态.境界.等级",
          value: 0
        },
        {
          action: "set",
          scope: "chat",
          key: "character.saveData.玩家角色状态.境界.当前进度",
          value: 0
        },
        {
          action: "set",
          scope: "chat",
          key: "character.saveData.玩家角色状态.位置.描述",
          value: processedOrigin === '世家子弟' ? "青云世家祖宅" : processedOrigin === '宗门弟子' ? "九霄宗外门" : "未知起点"
        },
        {
          action: "set",
          scope: "chat",
          key: "character.saveData.玩家角色状态.寿元.当前",
          value: 18
        },
        {
          action: "set",
          scope: "chat",
          key: "character.saveData.玩家角色状态.寿元.最大",
          value: 100
        },
        // 人物关系初始化 - 由AI根据角色出身随机生成合适的关系
        {
          action: "set",
          scope: "chat",
          key: "character.saveData.人物关系",
          value: {} // 空对象，由AI初始化消息时自行生成合适的人物关系
        }
      ]
    };
}

/**
 * 生成正式游戏中的GM响应 - 用于剧情推进
 * @param currentGameData 当前游戏状态数据
 * @param playerAction 玩家的行动或选择
 * @param sceneType 可选的场景类型，用于生成特定场景的提示词
 * @param memoryFormatId 可选的指定记忆格式ID
 */
export async function generateInGameResponse(
  currentGameData: any,
  playerAction?: string,
  sceneType?: '战斗' | '修炼' | '社交' | '探索' | '传承',
  memoryFormatId?: string
): Promise<GM_Response> {
  console.log('【剧情推进】准备生成游戏GM响应，数据:', { currentGameData, playerAction, sceneType });

  try {
    // 构建当前游戏状态的GM请求对象
    const gmRequest = {
      ...currentGameData,
      playerAction: playerAction || '继续当前活动',
      requestType: 'in_game_progression',
      timestamp: new Date().toISOString()
    };
    
    // 根据场景类型选择合适的提示词
    let prompt: string;
    if (sceneType) {
      prompt = createSceneSpecificPrompt(sceneType, memoryFormatId);
      console.log('【剧情推进】使用场景特定提示词:', sceneType);
    } else {
      prompt = getRandomizedInGamePrompt();
      console.log('【剧情推进】使用随机化提示词');
    }
    
    // 替换提示词中的占位符
    const finalPrompt = prompt.replace('INPUT_PLACEHOLDER', JSON.stringify(gmRequest, null, 2));
    
    console.log('【剧情推进】最终提示词长度:', finalPrompt.length);
    console.log('【剧情推进】GM请求数据:', gmRequest);
    
    // 调用AI生成响应
    const result = await generateItemWithTavernAI<GM_Response>(
      finalPrompt, 
      sceneType ? `${sceneType}剧情推进` : '剧情推进', 
      false
    );
    
    // 验证结果结构
    if (!result || !result.text) {
      console.warn('【剧情推进】AI返回的响应结构无效:', result);
      throw new Error('AI生成的游戏响应格式无效或内容缺失');
    }
    
    // 确保tavern_commands是数组
    if (!Array.isArray(result.tavern_commands)) {
      console.warn('【剧情推进】AI未返回tavern_commands数组，设置为空数组');
      result.tavern_commands = [];
    }
    
    console.log('【剧情推进】成功生成响应，命令数量:', result.tavern_commands?.length || 0);
    
    return result as GM_Response;
    
  } catch (error: any) {
    console.error('【剧情推进】生成游戏响应失败:', error);
    throw error;
  }
}

/**
 * 生成快速游戏响应 - 用于简单的玩家行动反馈
 * @param currentState 当前角色状态
 * @param action 玩家行动
 */
export async function generateQuickResponse(
  currentState: any,
  action: string
): Promise<GM_Response> {
  console.log('【快速响应】生成简单反馈，行动:', action);
  
  try {
    const quickRequest = {
      currentState,
      action,
      requestType: 'quick_response',
      timestamp: new Date().toISOString()
    };
    
    // 使用简化的提示词进行快速生成
    const quickPrompt = `
# 快速游戏响应生成

根据玩家行动"${action}"，生成简短的游戏反馈。

**要求**:
- text字段: 200-500字符的简短反馈
- around字段: 100-300字符的环境描述
- mid_term_memory字段: 如有重要变化则更新，否则可为空
- tavern_commands: 仅在必要时更新数据

**输入数据**:
\`\`\`json
${JSON.stringify(quickRequest, null, 2)}
\`\`\`

**输出格式**:
\`\`\`json
{
  "text": "简短的反馈内容",
  "around": "环境描述", 
  "mid_term_memory": "记忆更新或空字符串",
  "tavern_commands": []
}
\`\`\`
`;
    
    const result = await generateItemWithTavernAI<GM_Response>(quickPrompt, '快速响应', false);
    
    if (!result || !result.text) {
      throw new Error('快速响应生成失败');
    }
    
    result.tavern_commands = result.tavern_commands || [];
    
    console.log('【快速响应】生成完成');
    return result as GM_Response;
    
  } catch (error: any) {
    console.error('【快速响应】生成失败:', error);
    
    // 提供极简的fallback响应
    return {
      text: `你${action}。周围的环境没有发生明显变化，一切都按部就班地继续着。`,
      around: "环境保持原状，你可以继续你的行动。",
      mid_term_memory: "",
      tavern_commands: []
    };
  }
}