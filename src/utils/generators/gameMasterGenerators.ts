import { generateItemWithTavernAI } from '../tavernCore';
import { buildInitialMessagePrompt } from '../prompts/gameMasterPrompts';
import { getRandomizedInGamePrompt } from '../prompts/inGameGMPromptsV2';
import { buildGmRequest } from '../AIGameMaster';
import type { GM_Response, TavernCommand } from '../../types/AIGameMaster';
import type { InitialGameData, SaveData, WorldInfo } from '../../types';

/**
 * 调用酒馆AI生成初始降世消息 (GM模式)
 * @param initialGameData 包含角色基础信息和创建详情的初始游戏数据
 * @param mapData AI生成的GeoJSON地图数据
 * @param additionalPrompt 附加的提示词
 */
export async function generateInitialMessage(
  initialGameData: InitialGameData,
  mapData: Record<string, unknown>,
  additionalPrompt?: string
): Promise<GM_Response> {
  console.log('【神识印记】准备调用AI生成天道初言，数据:', { initialGameData, mapData });

  try {
    // 0. 缓存已生成的世界数据，避免在AI处理过程中丢失
    console.log('【数据缓存】缓存现有世界数据...');
    const { getTavernHelper } = await import('../tavern');
    const tavernHelper = getTavernHelper();
    
    let cachedWorldData: WorldInfo | null = null;
    let chatVariablesForPrompt: Record<string, unknown> | null = null;
    if (tavernHelper) {
      try {
        // 获取并缓存现有的世界数据
        const existingVars = await tavernHelper.getVariables({ type: 'chat' });
        chatVariablesForPrompt = existingVars || {};
        const existingSaveData = existingVars['character.saveData'] as SaveData | undefined;
        
        if (existingSaveData && existingSaveData.世界信息) {
          cachedWorldData = JSON.parse(JSON.stringify(existingSaveData.世界信息)); // 深拷贝避免引用问题
          if (cachedWorldData) {
            console.log('【数据缓存】已缓存世界数据:', {
              世界名称: cachedWorldData.世界名称,
              大陆数量: cachedWorldData.大陆信息?.length || 0,
              势力数量: cachedWorldData.势力信息?.length || 0,
              地点数量: cachedWorldData.地点信息?.length || 0
            });
          }
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
    // 构造creationDetails对象，使用处理后的具体设定
    const creationDetails = {
      age: initialGameData.creationDetails.age,
      originName: processedOrigin,
      spiritRootName: processedSpiritRoot
    };
    
    // 1.2. 确保先天六司不超过10（安全验证）
    const clampAttribute = (value: number): number => Math.max(0, Math.min(10, Math.round(value || 5)));
    const safeAttributes = {
      根骨: clampAttribute(initialGameData.baseInfo.先天六司?.根骨 ?? 0),
      灵性: clampAttribute(initialGameData.baseInfo.先天六司?.灵性 ?? 0),
      悟性: clampAttribute(initialGameData.baseInfo.先天六司?.悟性 ?? 0),
      气运: clampAttribute(initialGameData.baseInfo.先天六司?.气运 ?? 0),
      魅力: clampAttribute(initialGameData.baseInfo.先天六司?.魅力 ?? 0),
      心性: clampAttribute(initialGameData.baseInfo.先天六司?.心性 ?? 0)
    };
    
    console.log('【属性验证】确保先天六司在0-10范围内:', safeAttributes);
    
    const gmRequest = buildGmRequest(
      {
        ...initialGameData.baseInfo,
        出生: processedOrigin,  // 使用处理后的具体出身
        灵根: processedSpiritRoot,  // 使用处理后的具体灵根
        性别: initialGameData.baseInfo.性别 || '男', // 确保传递性别信息
        先天六司: safeAttributes // 使用安全验证后的属性
      },
      creationDetails, 
      mapData
    );
    console.log('【神识印记】构建的GM_Request:', gmRequest);

    // 1.5. 创建清理过的chat变量副本，供AI参考使用
    const sanitizedChatVars: Record<string, unknown> = chatVariablesForPrompt ? JSON.parse(JSON.stringify(chatVariablesForPrompt)) : {};
    
    // 1.6. 提取上一条对话的AI/GM文本（用于连续性），在初始化阶段通常为空
    let lastTextMemory = '';
    try {
      const saveFromChat = (chatVariablesForPrompt?.['character.saveData'] as SaveData | undefined) || {};
      const mem = saveFromChat?.['记忆'] || saveFromChat?.记忆;
      const short = mem?.['短期记忆'] || mem?.短期记忆;
      if (Array.isArray(short) && short.length > 0 && typeof short[short.length - 1] === 'string') {
        lastTextMemory = String(short[short.length - 1]);
      }
    } catch (e) {
      console.warn('【神识印记】提取上一条文本失败（可忽略）:', e);
    }

    // 2. 构建用户选择信息并使用动态提示词
    const userSelections = {
      name: initialGameData.baseInfo.名字 || '匿名',
      gender: initialGameData.baseInfo.性别 || '男',
      world: initialGameData.baseInfo.世界 || '未知世界',
      talentTier: initialGameData.baseInfo.天资 || '普通',
      origin: processedOrigin || '平民',
      spiritRoot: processedSpiritRoot || '五行灵根',
      talents: initialGameData.baseInfo.天赋 || [],
      attributes: safeAttributes // 使用安全验证后的属性
    };
    
    console.log('【神识印记】构建的用户选择信息:', userSelections);
    
    // 1.7. 基于先天六司做基础数值预计算（不含"修为"）
    const ageYears = Number(initialGameData?.creationDetails?.age || 16);
    const attrs = safeAttributes; // 直接使用安全验证后的属性
    const hpMax = Math.max(30, 80 + attrs.根骨 * 6 + Math.floor(attrs.心性 * 2));
    const lingMax = Math.max(0, attrs.灵性 * 6);
    const shenMax = Math.max(10, 10 + attrs.悟性 * 2 + Math.floor(attrs.心性));
    const lifeMax = Math.max(40, 80 + attrs.根骨 * 2 + attrs.气运 * 3);
    const lifeCurrent = Math.max(0, lifeMax - ageYears);

    const derivedStats = {
      基线数值: {
        气血: { 当前: hpMax, 最大: hpMax },
        灵气: { 当前: 0, 最大: lingMax },
        神识: { 当前: shenMax, 最大: shenMax },
        寿命: { 当前: lifeCurrent, 最大: lifeMax }
      },
      先天六司: attrs,
      天资: userSelections.talentTier,
      灵根: userSelections.spiritRoot
    };

    // 1.8. 将预计算基线直接写入酒馆存档（仅写“最终数值”，不写计算过程），以便开局即正确展示
    try {
      const { getTavernHelper } = await import('../tavern');
      const tv = getTavernHelper();
      if (tv) {
        const vars = await tv.getVariables({ type: 'chat' });
        const saveData = (vars['character.saveData'] as SaveData) || {};
        saveData['玩家角色状态'] = saveData['玩家角色状态'] || {};
        const st = saveData['玩家角色状态'];
        st['气血'] = { 当前: hpMax, 最大: hpMax };
        st['灵气'] = { 当前: 0, 最大: lingMax };
        st['神识'] = { 当前: shenMax, 最大: shenMax };
        st['寿命'] = { 当前: lifeCurrent, 最大: lifeMax };
        await tv.insertOrAssignVariables({ 'character.saveData': saveData }, { type: 'chat' });
        console.log('[初始化基线] 已写入玩家角色状态基线: ', st);
      }
    } catch (e) {
      console.warn('[初始化基线] 写入玩家角色状态基线失败（非致命）：', e);
    }

    const promptInput = {
      character_creation: {
        selections: userSelections,
        derived_stats: derivedStats
      },
      gmRequest,
      reference: {
        chatVariables: sanitizedChatVars || {},
        last_text: lastTextMemory,
        note: '所有路径请统一以 character.saveData. 开头，并严格匹配参考中已有字段结构。'
      }
    };
    
    // 使用动态提示词而不是静态提示词
    const dynamicPrompt = buildInitialMessagePrompt(userSelections);
    const prompt = (dynamicPrompt + (additionalPrompt ? '\n\n' + additionalPrompt : '')).replace('INPUT_PLACEHOLDER', JSON.stringify(promptInput, null, 2));
    
    console.log('【角色初始化-调试】准备调用generateItemWithTavernAI');
    console.log('【角色初始化-调试】动态提示词长度:', dynamicPrompt.length);
    console.log('【角色初始化-调试】动态提示词前200字符:', dynamicPrompt.substring(0, 200));
    console.log('【角色初始化-调试】完整prompt长度:', prompt.length);
    console.log('【角色初始化-调试】完整prompt前300字符:', prompt.substring(0, 300));
    console.log('【神识印记-调试】构建的完整prompt:', prompt);
    console.log('【神识印记-调试】prompt长度:', prompt.length);
    console.log('【神识印记-调试】GM_Request数据:', gmRequest);
    console.log('【神识印记-调试】用户选择信息:', userSelections);
    
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
    if (result.tavern_commands && !Array.isArray(result.tavern_commands) && typeof result.tavern_commands === 'object') {
      // 将对象格式的 tavern_commands 映射为数组
      const obj = result.tavern_commands as Record<string, unknown>;
      const arr: TavernCommand[] = [];
      const pushPairs = (section: unknown, action: string) => {
        if (!section) return;
        if (Array.isArray(section)) {
          for (const it of section) {
            if (!it) continue;
            const key = it.key || it.path || it.target;
            if (key) arr.push({ action, scope: it.scope || 'chat', key, value: it.value } as TavernCommand);
            else if (Array.isArray(it)) { const [k, v] = it; arr.push({ action, scope: 'chat', key: k, value: v } as TavernCommand); }
          }
        } else if (typeof section === 'object' && section !== null) {
          for (const k of Object.keys(section)) arr.push({ action, scope: 'chat', key: k, value: (section as Record<string, unknown>)[k] } as TavernCommand);
        }
      };
      ['set','add','push','pull','delete'].forEach(op => pushPairs(obj[op], op));
      result.tavern_commands = arr;
    }

    if (!result.tavern_commands) {
      console.warn('【神识印记】AI未返回tavern_commands，设置为空数组');
      result.tavern_commands = [];
    }

    // 4.4 规范化 tavern_commands 数组
    if (Array.isArray(result.tavern_commands)) {
      console.log('【神识印记】验证tavern_commands格式');
      result.tavern_commands = result.tavern_commands.map((cmd: Partial<TavernCommand>): TavernCommand | null => {
        // 确保必需字段存在
        if (!cmd) return null;
        if (!cmd.action) cmd.action = 'set';
        const k = cmd.key;
        if (!k) { console.warn('【神识印记】缺少key，跳过:', cmd); return null; }
        cmd.key = String(k);
        
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

        return cmd as TavernCommand;
      }).filter((cmd): cmd is TavernCommand => cmd !== null); // 过滤掉无效命令
      
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
      
      if (result.tavern_commands) {
        // 移除AI可能生成的world相关命令，避免冲突
        const originalCommandCount = result.tavern_commands.length;
        result.tavern_commands = result.tavern_commands.filter((cmd: TavernCommand) =>
          !cmd.key || (!cmd.key.includes('世界信息') && !cmd.key.includes('world_') && cmd.key !== 'character.saveData')
        );
        
        if (originalCommandCount !== result.tavern_commands.length) {
          console.log('【数据植入】已过滤AI生成的世界相关命令，避免数据冲突');
        }
      }
      
      // 添加植入世界数据的命令
      if (!result.tavern_commands) {
        result.tavern_commands = [];
      }
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
    
  } catch (error) {
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
 */
export async function generateInGameResponse(
  currentGameData: Record<string, unknown>,
  playerAction?: string
): Promise<GM_Response> {
  console.log('【剧情推进】准备生成游戏GM响应，数据:', { currentGameData, playerAction });

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

    // 从存档计算导出指标，并实现通用能力面板
    const computeDerived = (save: SaveData) => {
      try {
        const status = save?.玩家角色状态 || {};
        const realmLevel = Number(status?.['境界']?.['等级'] || 0);
        const vit = {
          hp: status?.气血 || { 当前: 0, 最大: 0 },
          mp: status?.灵气 || { 当前: 0, 最大: 0 },
          spirit: status?.神识 || { 当前: 0, 最大: 0 },
          lifespan: status?.寿命 || { 当前: 0, 最大: 0 }
        };
        const afterSix = save?.角色基础信息?.先天六司 || {};
        // 确保先天六司不超过10的限制
        const clampAttr = (val: unknown): number => Math.max(0, Math.min(10, Number(val || 0)));
        const safeAfterSix = {
          根骨: clampAttr(afterSix?.根骨),
          灵性: clampAttr(afterSix?.灵性),
          悟性: clampAttr(afterSix?.悟性),
          气运: clampAttr(afterSix?.气运),
          魅力: clampAttr(afterSix?.魅力),
          心性: clampAttr(afterSix?.心性)
        };
        const sixSum = Object.values(safeAfterSix).reduce((acc, val) => acc + val, 0);
        const eq = save?.装备栏 || {};
        const slots = ['装备1','装备2','装备3','装备4','装备5','装备6'];
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
              const s = Object.values(aug.后天六司).reduce((a: number, v: unknown) => a + Number(v || 0), 0);
              eqBonus += s * 2;
            }
          }
        });
        const hpMax = Number(vit.hp?.最大 || 0);
        const mpMax = Number(vit.mp?.最大 || 0);
        const spMax = Number(vit.spirit?.最大 || 0);
        const battlePower = Math.round(realmLevel * 100 + hpMax * 0.5 + mpMax * 0.3 + spMax * 0.2 + sixSum * 2 + eqBonus);
        const buffs = Array.isArray(status?.状态效果) ? status.状态效果.filter((e: { 类型: string; }) => String(e?.类型).toLowerCase() === 'buff') : [];

        // --- 通用能力面板计算 ---
        const potential_actions = {
          alchemy: { // 炼丹
            success_chance: Math.round(Math.min(95, Math.max(5, (safeAfterSix.悟性 * 5 + (status?.神识?.当前 || 30) / 10) / 50 * 50 + safeAfterSix.气运))),
            crit_chance: Math.round(Math.max(1, safeAfterSix.气运 + safeAfterSix.悟性 / 2)),
            description: '基于当前悟性和神识，炼丹成功率较高。'
          },
          crafting: { // 炼器
            success_chance: Math.round(Math.min(95, Math.max(5, (safeAfterSix.根骨 * 5 + (status?.灵气?.当前 || 0) / 20) / 60 * 50 + safeAfterSix.气运))),
            crit_chance: Math.round(Math.max(1, safeAfterSix.气运 + safeAfterSix.根骨 / 2)),
            description: '基于当前根骨和灵气，炼器成功率中等。'
          },
          cultivation: { // 修炼
            efficiency: (() => {
              let eff = 5;
              const spiritRootName = save?.角色基础信息?.灵根?.名称 || save?.角色基础信息?.灵根 || '';
              if (spiritRootName.includes('天品')) eff += 5;
              if (spiritRootName.includes('极品')) eff += 3;
              const technique = save?.修炼功法?.功法;
              if (technique?.品质?.quality === '仙') eff += 5;
              if (technique?.品质?.quality === '天') eff += 3;
              return Math.round(eff);
            })(),
            breakthrough_chance: Math.round(Math.min(80, Math.max(5, 10 + safeAfterSix.心性 * 2 + safeAfterSix.气运))),
            description: '天品灵根和仙品功法带来了极高的修炼效率。'
          },
          exploration: { // 探索
            risk_level: (() => {
              let risk = 5;
              const locationName = status?.['位置']?.['描述'] || '';
              const worldInfo = save?.世界信息;
              const locationInfo = worldInfo?.地点信息?.find((l: { 名称: string; }) => l.名称 === locationName);
              if (locationInfo?.['安全等级'] === '极危险') risk += 5;
              if (locationInfo?.['安全等级'] === '危险') risk += 3;
              return Math.round(Math.max(1, Math.min(10, risk - (realmLevel + safeAfterSix.气运 / 2))));
            })(),
            loot_chance: Math.round(Math.min(90, Math.max(10, 20 + safeAfterSix.气运 * 5))),
            description: '当前位置较为危险，但高气运可能带来意外收获。'
          },
          social: { // 社交
            persuasion_chance: Math.round(Math.min(95, Math.max(5, 50 + safeAfterSix.魅力 * 5))),
            intimidation_chance: Math.round(Math.min(95, Math.max(5, 20 + safeAfterSix.根骨 * 2 + realmLevel * 5))),
            description: '高魅力使得说服他人变得容易。'
          }
        };

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
          active_buffs: buffs.map((b: { 状态名称: string; }) => b?.状态名称).filter(Boolean).slice(0, 10),
          equipment_names: eqNames,
          potential_actions: potential_actions
        };
      } catch {
        return null;
      }
    };
    const saveData = (chatVariablesForPrompt?.['character.saveData'] as SaveData) || {};
    const derived = computeDerived(saveData);

    // 提取上一条对话的AI/GM文本（用于连续性）
    let lastTextMemory = '';
    try {
      const saveFromChat = (chatVariablesForPrompt?.['character.saveData'] as SaveData | undefined) || {};
      const history = (saveFromChat?.['对话历史'] || saveFromChat?.对话历史);
      if (Array.isArray(history) && history.length > 0) {
        for (let i = history.length - 1; i >= 0; i--) {
          const m = history[i];
          const t = String(m?.type || '').toLowerCase();
          if ((t === 'ai' || t === 'gm') && typeof m?.content === 'string' && m.content.trim()) {
            lastTextMemory = String(m.content);
            break;
          }
        }
      }
    } catch (e) {
      console.warn('【提示词连续性】提取上一次对话文本失败（忽略）:', e);
    }

    // 构建当前游戏状态的GM请求对象
    // 优先使用短期记忆作为上一条文本，并从 chat 变量中去重避免重复
    try {
      const saveFromChat2 = (chatVariablesForPrompt?.['character.saveData'] as SaveData | undefined) || {};
      const mem2 = saveFromChat2?.['记忆'] || saveFromChat2?.记忆;
      const short2 = mem2?.['短期记忆'] || mem2?.短期记忆;
      if (Array.isArray(short2) && short2.length > 0 && typeof short2[short2.length - 1] === 'string') {
        lastTextMemory = String(short2[short2.length - 1]);
      }
    } catch {}
    const sanitizedChatVars: Record<string, unknown> = chatVariablesForPrompt ? JSON.parse(JSON.stringify(chatVariablesForPrompt)) : {};
    try {
      const saveSan = (sanitizedChatVars['character.saveData'] as SaveData) || null;
      const memSan = saveSan?.['记忆'] || saveSan?.记忆;
      const shortSan = memSan?.['短期记忆'] || memSan?.短期记忆;
      if (Array.isArray(shortSan) && typeof lastTextMemory === 'string' && lastTextMemory.trim()) {
        const lastIdx = shortSan.length - 1;
        if (typeof shortSan[lastIdx] === 'string' && String(shortSan[lastIdx]).trim() === lastTextMemory.trim()) {
          shortSan.splice(lastIdx, 1);
          if (memSan?.['短期记忆']) memSan['短期记忆'] = shortSan;
          if (memSan?.短期记忆) memSan.短期记忆 = shortSan;
        }
      }
    } catch {}
    const gmRequest = {
      ...currentGameData,
      playerAction: playerAction || '继续当前活动',
      requestType: 'in_game_progression',
      timestamp: new Date().toISOString()
    };
    
    // 获取通用提示词
    const prompt = getRandomizedInGamePrompt();
    console.log('【剧情推进】使用通用提示词');
    
    // 替换提示词中的占位符
    const promptInput = {
      gmRequest,
      current_game_state: {
        ...chatVariablesForPrompt,
        note: '这是当前的游戏状态，所有生成的内容都必须严格基于此数据。'
      },
      derived
    };
    const finalPrompt = prompt.replace('INPUT_PLACEHOLDER', JSON.stringify(promptInput, null, 2));
    const previousBlock = lastTextMemory && typeof lastTextMemory === 'string' && lastTextMemory.trim()
      ? `\n\n【上一条对话全文】\n${lastTextMemory}\n`
      : '';
    const continuityGuide = '\n\n【连续性要求】基于上一条对话全文（如上）作为上一条叙述的延续进行创作：不得重复或总结已给内容；保持文风一致，仅推进后续发展。';
    const finalPromptWithContinuity = finalPrompt + previousBlock + continuityGuide;
    console.log('【连续性】上一条对话字数:', typeof lastTextMemory === 'string' ? lastTextMemory.length : 0);
    
    console.log('【剧情推进】最终提示词长度:', finalPrompt.length);
    console.log('【剧情推进】GM请求数据:', gmRequest);
    
    // 调用AI生成响应
    const result = await generateItemWithTavernAI<GM_Response>(
      finalPromptWithContinuity,
      '剧情推进',
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
    
  } catch (error) {
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
  currentState: Record<string, unknown>,
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
    
  } catch (error) {
    console.error('【快速响应】生成失败:', error);
    
    // 提供极简的fallback响应
    return {
      text: `你${action}。周围的环境没有发生明显变化，一切都按部就班地继续着。`,
      mid_term_memory: "",
      tavern_commands: []
    };
  }
}
