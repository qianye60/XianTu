import { generateItemWithTavernAI } from '../tavernCore';
import { INITIAL_MESSAGE_PROMPT } from '../prompts/gameMasterPrompts';
import { getRandomizedInGamePrompt, createSceneSpecificPrompt } from '../prompts/inGameGMPromptsV2';
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
    let chatVariablesForPrompt: Record<string, unknown> | null = null;
    if (tavernHelper) {
      try {
        // 获取并缓存现有的世界数据
        const existingVars = await tavernHelper.getVariables({ type: 'chat' });
        chatVariablesForPrompt = existingVars || {};
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
        // 不再清理chat变量：全部提供给AI作路径参考
        
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
      // 更贴近常见人生样本：默认有家庭；“孤儿出身”仅作为低概率选项
      type OriginWeight = { label: string; weight: number };
      const originPool: OriginWeight[] = [
        { label: '世家子弟', weight: 2 },
        { label: '宗门弟子', weight: 2 },
        { label: '平民出身', weight: 3 },
        { label: '商贾之家', weight: 2 },
        { label: '猎户人家', weight: 2 },
        { label: '书香门第', weight: 2 },
        { label: '官宦之家', weight: 1.5 },
        { label: '农家子弟', weight: 2 },
        { label: '手艺人家', weight: 2 },
        { label: '散修出身', weight: 1 },
        { label: '孤儿出身', weight: 0.2 }, // 极低概率，除非玩家明确选择
      ];

      const total = originPool.reduce((s, o) => s + o.weight, 0);
      let roll = Math.random() * total;
      for (const o of originPool) {
        if ((roll -= o.weight) <= 0) { processedOrigin = o.label; break; }
      }
      if (!processedOrigin || processedOrigin === '随机出身') processedOrigin = '平民出身';
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
    const promptInput = {
      gmRequest,
      reference: {
        chatVariables: chatVariablesForPrompt || {},
        note: '所有路径请统一以 character.saveData. 开头，并严格匹配参考中已有字段结构。'
      }
    };
    const prompt = (INITIAL_MESSAGE_PROMPT + (additionalPrompt ? '\n\n' + additionalPrompt : '')).replace('INPUT_PLACEHOLDER', JSON.stringify(promptInput, null, 2));
    
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
    
    console.log('【神识印记-调试】AI原始返回结果:', JSON.stringify(result, null, 2));
    
    // 4. 验证结果结构并修复格式问题
    if (!result || typeof result !== 'object') {
      console.warn('【神识印记】AI返回的初始消息结构无效，将抛出错误以触发重试:', result);
      throw new Error('AI生成的初始消息格式无效或内容缺失');
    }

    // 4.1 基本字段验证（不兜底）：缺少text则抛错并重试
    if (!result.text || typeof result.text !== 'string' || !result.text.trim()) {
      console.warn('【神识印记】AI返回的消息缺少text字段或空:', result);
      throw new Error('AI生成的初始消息缺少必需字段text');
    }

    // 4.3 修复并验证 tavern_commands
    if (result.tavern_commands && !Array.isArray(result.tavern_commands) && typeof (result as any).tavern_commands === 'object') {
      // 将对象格式的 tavern_commands 映射为数组
      const obj: any = (result as any).tavern_commands;
      const arr: any[] = [];
      const pushPairs = (section: any, action: string) => {
        if (!section) return;
        if (Array.isArray(section)) {
          for (const it of section) {
            if (!it) continue;
            const key = it.key || it.path || it.target;
            if (key) arr.push({ action, scope: it.scope || 'chat', key, value: it.value });
            else if (Array.isArray(it)) { const [k, v] = it; arr.push({ action, scope: 'chat', key: k, value: v }); }
          }
        } else if (typeof section === 'object') {
          for (const k of Object.keys(section)) arr.push({ action, scope: 'chat', key: k, value: section[k] });
        }
      };
      ['set','add','push','pull','delete'].forEach(op => pushPairs(obj[op], op));
      (result as any).tavern_commands = arr;
    }

    if (!result.tavern_commands) {
      console.warn('【神识印记】AI未返回tavern_commands，设置为空数组');
      result.tavern_commands = [];
    }

    // 4.4 规范化 tavern_commands 数组
    if (Array.isArray(result.tavern_commands)) {
      console.log('【神识印记】验证tavern_commands格式');
      result.tavern_commands = result.tavern_commands.map((cmd: any) => {
        // 确保必需字段存在
        if (!cmd) return null;
        if (!cmd.action) cmd.action = 'set';
        const k = cmd.key || cmd.path || cmd.target;
        if (!k) { console.warn('【神识印记】缺少key/path/target，跳过:', cmd); return null; }
        cmd.key = String(k);
        delete cmd.path; delete cmd.target;
        
        // 添加必需的scope字段
        if (!cmd.scope) {
          cmd.scope = 'chat';
        }

        // 修复常见错误路径
        if (cmd.key.startsWith('character.saveData.物品')) {
          cmd.key = cmd.key.replace('character.saveData.物品', 'character.saveData.背包.物品');
        }
        if (cmd.key.startsWith('character.saveData.') === false && cmd.key.startsWith('character.') ) {
          // 兼容 character.* → character.saveData.玩家角色状态.*
          cmd.key = cmd.key.replace('character.', 'character.saveData.玩家角色状态.');
        }

        return cmd;
      }).filter(cmd => cmd !== null); // 过滤掉无效命令
      
      console.log('【神识印记】有效的tavern_commands数量:', result.tavern_commands.length);
    } else {
      console.warn('【神识印记】AI返回的tavern_commands不是数组格式，设置为空数组');
      result.tavern_commands = [];
    }

    // 不再添加默认mid_term_memory；由AI提供
    
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
    // 注入当前chat变量，作为参考上下文
    let chatVariablesForPrompt: Record<string, unknown> | null = null;
    try {
      const { getTavernHelper } = await import('../tavern');
      const helper = getTavernHelper();
      if (helper) {
        chatVariablesForPrompt = await helper.getVariables({ type: 'chat' });
      }
    } catch (e) {
      console.warn('【剧情推进】获取chat变量作为参考失败（可忽略）:', e);
    }

    // 从存档计算导出指标（战斗值/BUFF汇总/装备与生命体征摘要），便于AI做出更贴近系统的数据驱动决策
    const computeDerived = (vars: Record<string, unknown> | null) => {
      try {
        const save = (vars?.['character.saveData'] as any) || {};
        const status = save?.玩家角色状态 || {};
        const realmLevel = Number(status?.境界?.等级 || 0);
        const vit = {
          hp: status?.气血 || { 当前: 0, 最大: 0 },
          mp: status?.灵气 || { 当前: 0, 最大: 0 },
          spirit: status?.神识 || { 当前: 0, 最大: 0 },
          lifespan: status?.寿命 || { 当前: 0, 最大: 0 }
        };
        const afterSix = save?.角色基础信息?.先天六司 || {};
        const sixSum = ['根骨','灵性','悟性','气运','魅力','心性'].reduce((acc, k) => acc + Number(afterSix?.[k] || 0), 0);
        // 简化版战斗值：境界等级*100 + 气血最大*0.5 + 灵气最大*0.3 + 神识最大*0.2 + 先天六司总和*2 + 装备增幅粗略加成
        const eq = save?.装备栏 || {};
        const slots = ['法宝1','法宝2','法宝3','法宝4','法宝5','法宝6'];
        let eqBonus = 0;
        const eqNames: string[] = [];
        slots.forEach((sk: string) => {
          const it = eq?.[sk];
          if (it && typeof it === 'object') {
            eqNames.push(it.名称 || sk);
            const aug = it.装备增幅 || {};
            eqBonus += Number(aug?.气血上限 || 0) * 0.5;
            eqBonus += Number(aug?.灵气上限 || 0) * 0.3;
            eqBonus += Number(aug?.神识上限 || 0) * 0.2;
            if (aug?.后天六司) {
              const s = Object.values(aug.后天六司).reduce((a: number, v: any) => a + Number(v || 0), 0);
              eqBonus += s * 2;
            }
          }
        });
        const hpMax = Number(vit.hp?.最大 || 0);
        const mpMax = Number(vit.mp?.最大 || 0);
        const spMax = Number(vit.spirit?.最大 || 0);
        const battlePower = Math.round(realmLevel * 100 + hpMax * 0.5 + mpMax * 0.3 + spMax * 0.2 + sixSum * 2 + eqBonus);
        const buffs = Array.isArray(status?.状态效果) ? status.状态效果.filter((e: any) => String(e?.类型).toLowerCase() === 'buff') : [];
        return {
          battle_power: battlePower,
          realm_level: realmLevel,
          location: status?.位置?.描述 || '未知',
          vitals: {
            hp: vit.hp,
            mp: vit.mp,
            spirit: vit.spirit,
            lifespan: vit.lifespan
          },
          active_buffs_count: buffs.length,
          active_buffs: buffs.map((b: any) => b?.状态名称).filter(Boolean).slice(0, 10),
          equipment_names: eqNames
        };
      } catch {
        return null;
      }
    };
    const derived = computeDerived(chatVariablesForPrompt);

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
      prompt = createSceneSpecificPrompt(sceneType);
      console.log('【剧情推进】使用场景特定提示词:', sceneType);
    } else {
      prompt = getRandomizedInGamePrompt();
      console.log('【剧情推进】使用随机化提示词');
    }
    
    // 替换提示词中的占位符
    const promptInput = {
      gmRequest,
      reference: {
        chatVariables: chatVariablesForPrompt || {},
        note: '所有路径请统一以 character.saveData. 开头，并严格匹配参考中已有字段结构。'
      },
      derived
    };
    const finalPrompt = prompt.replace('INPUT_PLACEHOLDER', JSON.stringify(promptInput, null, 2));
    
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
      mid_term_memory: "",
      tavern_commands: []
    };
  }
}
