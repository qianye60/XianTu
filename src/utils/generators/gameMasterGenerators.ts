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
  mapData: any,
  additionalPrompt?: string
): Promise<GM_Response> {
  console.log('【神识印记】准备调用AI生成天道初言，数据:', { initialGameData, mapData });

  try {
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
      console.warn('【神识印记】AI返回的初始消息结构无效，将使用fallback:', result);
      // 不再抛出错误，直接使用fallback
      const fallbackResponse = createFallbackResponse(initialGameData, processedOrigin, processedSpiritRoot);
      return {
        ...fallbackResponse,
        processedOrigin,
        processedSpiritRoot
      };
    }
    
    // 5. 确保tavern_commands是数组 (以防万一)
    if (!Array.isArray(result.tavern_commands)) {
      console.warn('【神识印记】AI未返回tavern_commands数组，设置为空数组');
      result.tavern_commands = [];
    }
    
    console.log('【神识印记】成功生成天道初言，命令数量:', result.tavern_commands?.length || 0);
    
    // 6. 返回结构化的响应，并包含处理后的具体设定
    const finalResult = {
      ...result,
      processedOrigin,
      processedSpiritRoot
    };
    return finalResult as GM_Response;
    
  } catch (error: any) {
    console.warn('【神识印记】生成天道初言失败，使用默认内容:', error);

    // 确保在catch块中重新声明变量
    let processedOrigin = initialGameData.creationDetails.originName;
    let processedSpiritRoot = initialGameData.creationDetails.spiritRootName;
    
    if (processedOrigin === '随机出身') {
      const possibleOrigins = ['世家子弟', '宗门弟子', '平民出身', '商贾之家', '猎户人家', '书香门第', '孤儿出身'];
      processedOrigin = possibleOrigins[Math.floor(Math.random() * possibleOrigins.length)];
    }
    
    if (processedSpiritRoot === '随机灵根') {
      const possibleRoots = ['五行灵根', '金灵根', '木灵根', '水灵根', '火灵根', '土灵根', '冰灵根', '雷灵根', '风灵根'];
      processedSpiritRoot = possibleRoots[Math.floor(Math.random() * possibleRoots.length)];
    }

    // 不再抛出错误，直接使用fallback
    const fallbackResponse = createFallbackResponse(initialGameData, processedOrigin, processedSpiritRoot);
    return {
      ...fallbackResponse,
      processedOrigin,
      processedSpiritRoot
    };
  }
}

/**
 * 创建fallback响应的辅助函数
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
          key: "character.saveData.玩家角色状态.位置.描述",
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
        },
        {
          action: "set",
          scope: "chat",
          key: "character.saveData.玩家角色状态.位置.描述",
          value: processedOrigin === '世家子弟' ? "青云世家祖宅" : processedOrigin === '宗门弟子' ? "九霄宗外门" : "故乡小镇"
        },
        // 家庭成员初始化
        {
          action: "set",
          scope: "chat",
          key: "relationships.父亲",
          value: {
            name: `${initialGameData.baseInfo.名字}父`,
            relationship: "父亲",
            trust_level: 90,
            influence: 85,
            description: processedOrigin === '世家子弟' ? "家族长者，修为不俗，对家族传承极为看重" : processedOrigin === '商贾之家' ? "精明的商人，为家族积累了不少财富" : processedOrigin === '书香门第' ? "饱读诗书的学者，教导有方" : "勤劳朴实的普通人，为家庭默默奉献",
            current_status: "健在",
            location: processedOrigin === '世家子弟' ? "青云世家祖宅" : processedOrigin === '宗门弟子' ? "九霄宗外门" : "故乡小镇",
            age: 45,
            cultivation_level: processedOrigin === '世家子弟' ? "筑基期" : "凡人"
          }
        },
        {
          action: "set", 
          scope: "chat",
          key: "relationships.母亲",
          value: {
            name: `${initialGameData.baseInfo.名字}母`,
            relationship: "母亲",
            trust_level: 95,
            influence: 90,
            description: "温柔慈爱的母亲，对孩子关怀备至，总是默默支持着家人的决定",
            current_status: "健在",
            location: processedOrigin === '世家子弟' ? "青云世家祖宅" : processedOrigin === '宗门弟子' ? "九霄宗外门" : "故乡小镇",
            age: 42,
            cultivation_level: processedOrigin === '世家子弟' ? "练气期" : "凡人"
          }
        },
        {
          action: "set",
          scope: "chat", 
          key: "relationships.青梅竹马",
          value: {
            name: `小${processedOrigin === '世家子弟' ? '月' : processedOrigin === '宗门弟子' ? '雪' : '花'}`,
            relationship: "青梅竹马",
            trust_level: 80,
            influence: 70,
            description: "邻家的同龄女孩，从小一起长大，彼此青涩的感情",
            current_status: "健在",
            location: processedOrigin === '世家子弟' ? "青云世家附近" : processedOrigin === '宗门弟子' ? "九霄宗外门" : "故乡小镇",
            age: 17,
            romantic_potential: true
          }
        }
      ]
    };
}