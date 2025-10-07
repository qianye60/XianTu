import { generateItemWithTavernAI } from '../tavernCore';
import { buildCharacterInitializationPrompt } from '../prompts/characterInitializationPrompts';
import { getRandomizedInGamePrompt } from '../prompts/inGameGMPromptsV2';
import { getTavernHelper } from '../tavern';
import { toast } from '../toast';

import type { GM_Response, TavernCommand } from '../../types/AIGameMaster';
import type { InitialGameData, SaveData, WorldInfo } from '../../types';

/**
 * (新) 调用酒馆AI生成一个简单的、无状态的JSON响应
 * @param inputData 要注入到提示词中的简单JS对象
 * @param promptTemplate 包含 INPUT_PLACEHOLDER 的提示词模板
 * @returns AI响应的JSON对象
 */
export async function generateSimpleResponse<T>(
  inputData: Record<string, unknown>,
  promptTemplate: string
): Promise<T> {
  console.log('【简单响应】准备调用AI...', { inputData });

  try {
    const prompt = promptTemplate.replace('INPUT_PLACEHOLDER', JSON.stringify(inputData, null, 2));

    const result = await generateItemWithTavernAI<T>(
      prompt,
      '简单JSON生成',
      false, // showToast
      3,     // retries
      false  // useStreaming
    );

    if (!result || typeof result !== 'object') {
      throw new Error('AI返回的响应不是有效的JSON对象');
    }

    console.log('【简单响应】成功生成:', result);
    return result;

  } catch (error) {
    console.error('【简单响应】生成过程中发生错误:', error);
    if (error instanceof Error) {
      throw new Error(`生成简单响应失败: ${error.message}`);
    }
    throw new Error(`生成简单响应时发生未知错误: ${String(error)}`);
  }
}

/**
 * 判断是否为随机灵根
 */
function isRandomSpiritRoot(spiritRoot: string | object): boolean {
  if (typeof spiritRoot === 'string') {
    return spiritRoot === '随机灵根' || spiritRoot.includes('随机');
  }
  return false;
}


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

  // --- 1. 增加核心数据校验 ---
  if (!initialGameData || !initialGameData.baseInfo || !initialGameData.creationDetails) {
    console.error('【神识印记-致命错误】initialGameData 或其核心属性缺失', initialGameData);
    throw new Error('初始游戏数据不完整，无法开始生成。');
  }
  if (!initialGameData.baseInfo.先天六司) {
    console.error('【神识印记-致命错误】先天六司数据缺失', initialGameData.baseInfo);
    throw new Error('角色核心属性“先天六司”数据缺失，无法继续。');
  }
  console.log('【神识印记】核心数据校验通过');

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
        const existingWorldInfo = existingVars['世界信息'] as WorldInfo | undefined;

        if (existingWorldInfo) {
          cachedWorldData = JSON.parse(JSON.stringify(existingWorldInfo)); // 深拷贝避免引用问题
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

    // 1. 保留随机选项，让 AI 自行创造性处理
    const processedOrigin = initialGameData.creationDetails.originName;
    const processedSpiritRoot = initialGameData.creationDetails.spiritRootName;

    // 不再硬编码处理随机选项，完全交给 AI 根据提示词引导创造
    if (processedOrigin === '随机出身') {
      console.log('【随机出身】检测到随机出身，将由 AI 创造性生成');
    }

    if (processedSpiritRoot === '随机灵根' || isRandomSpiritRoot(processedSpiritRoot)) {
      console.log('【随机灵根】检测到随机灵根，将由 AI 创造性生成');
    }

    // 1.1 构建GM_Request对象，展示给AI看
    // 构造creationDetails对象，使用处理后的具体设定
    const creationDetails = {
      age: initialGameData.creationDetails.age,
      originName: processedOrigin,
      spiritRootName: processedSpiritRoot
    };

    // 1.2. 确保先天六司不超过10（安全验证）
    const clampAttribute = (value: number): number => Math.max(0, Math.min(10, Math.round(value ?? 0)));
    const safeAttributes = {
      根骨: clampAttribute(initialGameData.baseInfo.先天六司?.根骨 ?? 0),
      灵性: clampAttribute(initialGameData.baseInfo.先天六司?.灵性 ?? 0),
      悟性: clampAttribute(initialGameData.baseInfo.先天六司?.悟性 ?? 0),
      气运: clampAttribute(initialGameData.baseInfo.先天六司?.气运 ?? 0),
      魅力: clampAttribute(initialGameData.baseInfo.先天六司?.魅力 ?? 0),
      心性: clampAttribute(initialGameData.baseInfo.先天六司?.心性 ?? 0)
    };

    console.log('【属性验证】确保先天六司在0-10范围内:', safeAttributes);


    // 1.5. 创建清理过的chat变量副本，供AI参考使用
    // ⚠️ 关键修复：传递完整的世界信息，包括势力和地点的位置数据，以便AI能正确生成角色位置
    const sanitizedChatVars: Record<string, unknown> = {};
    if (chatVariablesForPrompt && chatVariablesForPrompt['世界信息']) {
      const worldInfo = chatVariablesForPrompt['世界信息'] as WorldInfo;

      // 传递完整的世界信息，包括势力和地点数据
      const worldInfoForPrompt = {
        世界名称: worldInfo.世界名称,
        世界背景: (worldInfo as any).世界背景,
        大陆信息: worldInfo.大陆信息?.map((continent) => ({
          名称: continent.名称 || (continent as Record<string, unknown>).name,
          描述: continent.描述 || (continent as Record<string, unknown>).description,
          大洲边界: continent.大洲边界 || (continent as Record<string, unknown>).continent_bounds
        })),
        // ✅ 传递完整的势力信息，包含位置数据
        势力信息: worldInfo.势力信息?.map((faction) => ({
          名称: faction.名称,
          类型: faction.类型,
          位置: faction.位置,
          势力范围: faction.势力范围
        })),
        // ✅ 传递完整的地点信息，包含坐标数据
        地点信息: worldInfo.地点信息?.map((location) => ({
          名称: location.名称,
          类型: location.类型,
          位置: location.位置,
          coordinates: location.coordinates
        }))
      };

      sanitizedChatVars['世界信息'] = worldInfoForPrompt;

      console.log('【修复】传递完整世界信息给AI');
      console.log('【修复】世界名称:', worldInfoForPrompt.世界名称, '（注意：这是世界名，不是大陆名）');
      console.log('【修复】大陆数量:', worldInfoForPrompt.大陆信息?.length || 0);
      console.log('【修复】大陆名称列表:', worldInfoForPrompt.大陆信息?.map((c: any) => c.名称).join(', '));
      console.log('【修复】势力数量:', worldInfoForPrompt.势力信息?.length || 0);
      console.log('【修复】地点数量:', worldInfoForPrompt.地点信息?.length || 0);
    }

    // 1.6. 提取上一条对话的AI/GM文本（用于连续性），在初始化阶段通常为空
    let lastTextMemory = '';
    try {
      const shortMemory = chatVariablesForPrompt?.['记忆_短期'] as string[] | undefined;
      if (Array.isArray(shortMemory) && shortMemory.length > 0 && typeof shortMemory[shortMemory.length - 1] === 'string') {
        lastTextMemory = String(shortMemory[shortMemory.length - 1]);
      }
    } catch (e) {
      console.warn('【神识印记】提取上一条文本失败（可忽略）:', e);
    }

    // 2. 构建用户选择信息并使用动态提示词
    // [核心修复] 使用完整的详情对象，确保AI能获得详细描述信息
    const userSelections = {
      name: initialGameData.baseInfo.名字 || '匿名',
      gender: initialGameData.baseInfo.性别 || '男',
      age: Number(initialGameData?.creationDetails?.age || 16),
      world: initialGameData.baseInfo.世界 || '未知世界',
      // [修复] 使用详情对象而非简单字符串，保留完整描述信息
      talentTier: (initialGameData.baseInfo as Record<string, any>).天资详情 || initialGameData.baseInfo.天资 || '凡人',
      origin: (initialGameData.baseInfo as Record<string, any>).出身详情 || initialGameData.baseInfo.出生 || '平民出身',
      spiritRoot: (initialGameData.baseInfo as Record<string, any>).灵根详情 || initialGameData.baseInfo.灵根 || '废灵根',
      talents: (initialGameData.baseInfo as Record<string, any>).天赋详情 || (initialGameData.baseInfo.天赋 || []),
      attributes: safeAttributes
    };
    console.log('【神识印记】构建的用户选择信息:', userSelections);

    // 1.7. 基于先天六司做基础数值预计算（不含"修为"）
    const ageYears = userSelections.age;
    const attrs = safeAttributes; // 直接使用安全验证后的属性
    const hpMax = Math.max(30, 80 + attrs.根骨 * 6 + Math.floor(attrs.心性 * 2));
    const lingMax = Math.max(0, attrs.灵性 * 6);
    const shenMax = Math.max(10, 10 + attrs.悟性 * 2 + Math.floor(attrs.心性));
    const lifeMax = Math.max(40, 80 + attrs.根骨 * 2 + attrs.气运 * 3);
    const lifeCurrent = ageYears; // 当前年龄

    const derivedStats = {
      基线数值: {
        气血: { 当前: hpMax, 上限: hpMax },
        灵气: { 当前: 0, 上限: lingMax },
        神识: { 当前: shenMax, 上限: shenMax },
        寿命: { 当前: lifeCurrent, 上限: lifeMax }
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
        const attrs = {
          气血: { 当前: hpMax, 上限: hpMax },
          灵气: { 当前: 0, 上限: lingMax },
          神识: { 当前: shenMax, 上限: shenMax },
          寿命: { 当前: lifeCurrent, 上限: lifeMax }
        };
        await tv.insertOrAssignVariables({ '属性': attrs }, { type: 'chat' });
        console.log('[初始化基线] 已写入玩家角色属性基线: ', attrs);
      }
    } catch (e) {
      console.warn('[初始化基线] 写入玩家角色状态基线失败（非致命）：', e);
    }

    const promptInput = {
      character_creation: {
        selections: userSelections,
        derived_stats: derivedStats
      },
      reference: {
        chatVariables: sanitizedChatVars || {},
        last_text: lastTextMemory,
        note: '【强制】所有路径必须以 saveData. 开头。' +
              '【强制】所有物品，无论类型（装备/功法/丹药等），都必须统一写入 "背包.物品" 对象中，并使用物品ID作为键。' +
              '【严禁】严禁创建 "背包.装备" 或 "背包.功法" 等自定义路径。' +
              '【参考】严格匹配参考中已有字段结构。例如：saveData.玩家角色状态.气血.当前'
      }
    };

    // 🔥 新方案：将提示词拆分成多条消息发送
    // 1. 系统规则
    const systemRulesPrompt = buildCharacterInitializationPrompt(userSelections);

    // 2. 世界数据
    const worldDataPrompt = `# 世界信息数据

**可用大陆列表**：
${sanitizedChatVars['世界信息'] ? JSON.stringify((sanitizedChatVars['世界信息'] as any).大陆信息, null, 2) : '[]'}

**可用地点列表**：
${sanitizedChatVars['世界信息'] ? JSON.stringify((sanitizedChatVars['世界信息'] as any).地点信息, null, 2) : '[]'}

⚠️ **重要**：位置必须从上述列表选择，严禁编造！`;

    // 3. 用户输入
    const userInputPrompt = `# 玩家核心选择

${JSON.stringify(promptInput, null, 2)}

${additionalPrompt || ''}`;

    console.log('【初始化】使用多消息格式，系统规则:', systemRulesPrompt.length, '字符');
    console.log('【初始化】世界数据:', worldDataPrompt.length, '字符');
    console.log('【初始化】用户输入:', userInputPrompt.length, '字符');

    const helper = getTavernHelper();
    if (!helper) throw new Error('酒馆助手未初始化');

    toast.info(`天机运转，推演天道初言...`);

    const rawResult = await helper.generate({
      user_input: userInputPrompt,
      overrides: {
        chat_history: {
          prompts: [
            { role: 'system', content: systemRulesPrompt },
            { role: 'system', content: worldDataPrompt }
          ]
        }
      },
      max_chat_history: 0
    } as any);

    console.log('【初始化-调试】AI原始返回类型:', typeof rawResult);
    console.log('【初始化-调试】AI原始返回值前500字符:', typeof rawResult === 'string' ? rawResult.substring(0, 500) : rawResult);

    let result: GM_Response;
    try {
      // helper.generate() 返回的可能是字符串或对象
      if (typeof rawResult === 'string') {
        // 🔥 修复：去掉 Markdown 代码块标记（```json 和 ```）
        let cleanedText = rawResult.trim();

        // 移除开头的 ```json 或 ```
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.substring(7);
        } else if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.substring(3);
        }

        // 移除结尾的 ```
        if (cleanedText.endsWith('```')) {
          cleanedText = cleanedText.substring(0, cleanedText.length - 3);
        }

        cleanedText = cleanedText.trim();

        console.log('【初始化-调试】清理后的JSON前500字符:', cleanedText.substring(0, 500));
        result = JSON.parse(cleanedText);
      } else if (rawResult && typeof rawResult === 'object') {
        result = rawResult as GM_Response;
      } else {
        console.error('【初始化-错误】AI返回了意外的类型:', rawResult);
        throw new Error('AI返回数据类型无效');
      }
    } catch (e) {
      console.error('【初始化-错误】解析AI返回值失败:', e);
      console.error('【初始化-错误】原始返回值:', typeof rawResult === 'string' ? rawResult.substring(0, 1000) : rawResult);
      throw new Error('AI返回数据格式无效: ' + (e instanceof Error ? e.message : String(e)));
    }

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

      // 检查是否是数字索引的对象格式（如 "0": {...}, "1": {...}）
      const keys = Object.keys(obj);
      const isNumericIndexed = keys.every(key => /^\d+$/.test(key));

      if (isNumericIndexed) {
        // 处理数字索引的对象格式
        console.log('【格式修复】检测到数字索引的tavern_commands格式，正在转换...');
        for (const key of keys) {
          const command = obj[key];
          if (command && typeof command === 'object') {
            const cmd = command as Record<string, unknown>;
            if (cmd.action && cmd.key) {
              arr.push({
                action: String(cmd.action),
                scope: String(cmd.scope || 'chat'),
                key: String(cmd.key),
                value: cmd.value
              } as TavernCommand);
            }
          }
        }
      } else {
        // 处理标准的分区格式（set/add/push等）
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
      }

      result.tavern_commands = arr;
      console.log('【格式修复】转换后的tavern_commands数量:', arr.length);
    }

    if (!result.tavern_commands) {
      console.warn('【神识印记】AI未返回tavern_commands，设置为空数组');
      result.tavern_commands = [];
    }

    // 确保tavern_commands是数组格式，如果不是则强制转换
    if (!Array.isArray(result.tavern_commands)) {
      console.warn('【神识印记】tavern_commands不是数组格式，强制设置为空数组');
      result.tavern_commands = [];
    }

    // 4.4 规范化 tavern_commands 数组
    if (Array.isArray(result.tavern_commands)) {
      console.log('【神识印记】验证tavern_commands格式，原始命令数量:', result.tavern_commands.length);
      console.log('【神识印记-详细】AI生成的所有命令:', JSON.stringify(result.tavern_commands, null, 2));

      result.tavern_commands = result.tavern_commands.map((cmd: Partial<TavernCommand>): TavernCommand | null => {
        // 确保必需字段存在
        if (!cmd) return null;
        if (!cmd.action) cmd.action = 'set';
        const k = cmd.key;
        if (!k) { console.warn('【神识印记】缺少key，跳过:', cmd); return null; }
        cmd.key = String(k);

        // 记录装备相关的命令
        if (cmd.key.includes('装备') || cmd.key.includes('物品')) {
          console.log('【装备命令检测】', {
            action: cmd.action,
            key: cmd.key,
            hasValue: !!cmd.value,
            valueType: typeof cmd.value,
            value: cmd.value
          });
        }

        // 添加必需的scope字段
        if (!cmd.scope) {
          cmd.scope = 'chat';
        }

        // 路径修正规范：兼容AI常见别名/误写
        const normalizeKey = (rawKey: string): string => {
          let key = String(rawKey || '').trim();
          // 移除旧的 character.saveData 前缀（如果AI仍然使用）
          if (key.startsWith('character.saveData.')) {
            key = key.substring('character.saveData.'.length);
          }
          if (key.startsWith('character.')) {
            key = key.substring('character.'.length);
          }

          // 路径归一化（分片路径）
          // 物品/背包路径
          if (key.startsWith('物品.')) key = key.replace('物品.', '背包_物品.');
          if (key === '背包.灵石' || key.startsWith('背包.灵石.')) key = key.replace('背包.灵石', '背包_灵石');
          if (key === '背包.物品' || key.startsWith('背包.物品.')) key = key.replace('背包.物品', '背包_物品');

          // inventory 英文路径转换
          if (key.startsWith('inventory.items')) key = key.replace('inventory.items', '背包_物品');
          if (key.startsWith('inventory.currency.灵石')) key = key.replace('inventory.currency.灵石', '背包_灵石');

          // 关系网 -> 人物关系
          if (key.startsWith('关系网')) key = key.replace('关系网', '人物关系');

          return key;
        };
        cmd.key = normalizeKey(cmd.key);

        // 路径修复逻辑已移除，因为提示词已从源头修复

        return cmd as TavernCommand;
      }).filter((cmd): cmd is TavernCommand => cmd !== null); // 过滤掉无效命令

      console.log('【神识印记】有效的tavern_commands数量:', result.tavern_commands.length);
    } else {
      console.warn('【神识印记】AI返回的tavern_commands不是数组格式，设置为空数组');
      result.tavern_commands = [];
    }

    // 不再添加默认mid_term_memory；由AI提供

    console.log('【神识印记】成功生成天道初言，命令数量:', result.tavern_commands?.length || 0);

    // 5.4. 装备完整性验证：清除无效的装备引用
    console.log('【装备验证】开始检查装备完整性...');

    const equipmentCommands = result.tavern_commands?.filter(cmd =>
      cmd.key && cmd.key.includes('装备栏')
    ) || [];

    const itemCreationCommands = result.tavern_commands?.filter(cmd =>
      cmd.key && cmd.key.includes('背包.物品.')
    ) || [];

    console.log('【装备验证】找到装备命令数量:', equipmentCommands.length);
    console.log('【装备验证】找到物品创建命令数量:', itemCreationCommands.length);

    // 检查并移除没有对应物品创建命令的装备槽命令
    const invalidEquipmentIndices: number[] = [];
    equipmentCommands.forEach(eqCmd => {
      if (eqCmd.value && typeof eqCmd.value === 'object') {
        const eqValue = eqCmd.value as Record<string, unknown>;
        const itemId = eqValue['物品ID'] || eqValue['itemId'];

        if (itemId) {
          // 检查是否有对应的物品创建命令
          const hasCreationCommand = itemCreationCommands.some(cmd =>
            cmd.key && cmd.key.includes(String(itemId))
          );

          if (!hasCreationCommand) {
            console.warn('【装备验证】发现无效装备引用，将清除:', { itemId, slotKey: eqCmd.key });
            const index = result.tavern_commands?.indexOf(eqCmd);
            if (index !== undefined && index >= 0) {
              invalidEquipmentIndices.push(index);
            }
          }
        }
      }
    });

    // 从后往前删除，避免索引混乱
    if (invalidEquipmentIndices.length > 0) {
      invalidEquipmentIndices.sort((a, b) => b - a);
      for (const index of invalidEquipmentIndices) {
        result.tavern_commands?.splice(index, 1);
      }
      console.warn(`【装备验证】已清除 ${invalidEquipmentIndices.length} 个无效装备引用`);
      console.log('【装备验证】清理后的命令总数:', result.tavern_commands?.length);
    } else {
      console.log('【装备验证】所有装备引用都有效，通过验证');
    }

    // 5.5. 将缓存的世界数据植入到AI生成结果中
    if (cachedWorldData) {
      console.log('【数据植入】将缓存的世界数据植入AI生成结果');

      if (result.tavern_commands) {
        // 移除AI可能生成的world相关命令，避免冲突
        const originalCommandCount = result.tavern_commands.length;
        result.tavern_commands = result.tavern_commands.filter((cmd: TavernCommand) =>
          !cmd.key || (!cmd.key.includes('世界信息') && !cmd.key.includes('world_'))
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
        key: "世界信息",
        value: cachedWorldData
      });

      console.log('【数据植入】已添加世界数据植入命令，确保世界数据完整保存');
    } else {
      console.log('【数据植入】无缓存的世界数据，使用AI生成的默认数据');
    }

    // 6. 返回结构化的响应，并包含处理后的具体设定和缓存的世界数据
    // 移除硬编码兜底逻辑 - AI应该生成所有必要的内容
    console.log('【验证】AI生成的命令数量:', result.tavern_commands?.length || 0);

// 文本-指令同步：再次确保根据叙事补齐命令（覆盖上方兜底更全面的情况）
// try {
//   result.tavern_commands = syncTextWithCommands(String(result.text || ''), result.tavern_commands || [])
//   console.log('【同步】最终根据text补齐命令后数量:', result.tavern_commands?.length)
// } catch {}

    const finalResult = {
      ...result,
      processedOrigin,
      processedSpiritRoot,
      cachedWorldData // 传递缓存的世界数据供后续使用
    };
    return finalResult as GM_Response;

  } catch (error) {
    console.error('【神识印记】生成天道初言过程中发生严重错误:', error);
    // 抛出包含原始错误信息的更具体的错误
    if (error instanceof Error) {
      throw new Error(`生成初始消息失败: ${error.message}\n${error.stack}`);
    }
    throw new Error(`生成初始消息时发生未知错误: ${String(error)}`);
  }
}


/**
 * 生成正式游戏中的GM响应 - 用于剧情推进
 * @param currentGameData 当前游戏状态数据
 * @param playerAction 玩家的行动或选择
 * @param sceneType 可选的场景类型，用于生成特定场景的提示词
 * @param useStreaming 是否使用流式生成
 * @param onStreamChunk 流式回调函数
 */
export async function generateInGameResponse(
  currentGameData: Record<string, unknown>,
  playerAction?: string,
  useStreaming?: boolean,
  onStreamChunk?: (chunk: string) => void
): Promise<GM_Response> {
  console.log('【剧情推进】准备生成游戏GM响应，数据:', { currentGameData, playerAction });

  try {
    // ⚠️ 重要变更：不再从酒馆获取变量，因为酒馆已经通过 <status_current_variables> 自动注入
    // 所有数据直接从 currentGameData 参数中获取
    console.log('【优化】使用 currentGameData 参数，不再重复获取酒馆变量');

    // 从存档计算导出指标，并实现通用能力面板
    const computeDerived = (save: SaveData) => {
      try {
        const status = save?.玩家角色状态 || {};
        const realmName = String(status?.['境界']?.['名称'] || '凡人');
        // 简单映射境界名到数值（用于计算战力等）
        const realmLevelMap: Record<string, number> = {
          '凡人': 0, '练气': 1, '炼气': 1, '筑基': 2, '金丹': 3,
          '元婴': 4, '化神': 5, '炼虚': 6, '合体': 7, '渡劫': 8
        };
        const realmLevel = realmLevelMap[realmName] || 0;
        const vit = {
          hp: status?.气血 || { 当前: 0, 上限: 0 },
          mp: status?.灵气 || { 当前: 0, 上限: 0 },
          spirit: status?.神识 || { 当前: 0, 上限: 0 },
          lifespan: status?.寿命 || { 当前: 0, 上限: 0 }
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
              if (spiritRootName.includes('仙品')) eff += 5;
              if (spiritRootName.includes('极品')) eff += 3;
              const technique = save?.修炼功法?.功法;
              if (technique?.品质?.quality === '仙') eff += 5;
              if (technique?.品质?.quality === '天') eff += 3;
              return Math.round(eff);
            })(),
            breakthrough_chance: Math.round(Math.min(80, Math.max(5, 10 + safeAfterSix.心性 * 2 + safeAfterSix.气运))),
            description: '仙品灵根和仙品功法带来了极高的修炼效率。'
          },
          exploration: { // 探索
            risk_level: (() => {
              let risk = 5;
              const locationDesc = status?.['位置']?.['描述'];
              const locationName = typeof locationDesc === 'string' ? locationDesc : (typeof locationDesc === 'object' && locationDesc !== null ? (locationDesc as any).描述 : '');
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

        const locationDesc = status?.位置?.描述;
        const locationStr = typeof locationDesc === 'string' ? locationDesc : (typeof locationDesc === 'object' && locationDesc !== null ? (locationDesc as any).描述 : '未知');

        return {
          battle_power: battlePower,
          realm_level: realmLevel,
          location: locationStr,
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
    const saveData = (currentGameData.saveData as SaveData) || {};
    const derived = computeDerived(saveData);

    // 提取所有短期记忆作为"上一幕剧情"
    let shortTermMemories: string[] = [];
    try {
        const mem = saveData?.['记忆'] || saveData?.记忆;
        const short = mem?.['短期记忆'] || mem?.短期记忆;
        if (Array.isArray(short)) {
            shortTermMemories = short.filter(m => typeof m === 'string');
        }
    } catch (e) {
        console.warn('【提示词连续性】提取短期记忆失败（忽略）:', e);
    }

    // 获取系统提示词（规则和数据结构）
    const systemPrompt = getRandomizedInGamePrompt();

    // 构建玩家行动消息
    const userInput = `<玩家的行动趋向>\n${playerAction || '静观其变。'}</玩家的行动趋向>`;

    console.log('【剧情推进】系统提示词长度:', systemPrompt.length);
    console.log('【剧情推进】短期记忆数量:', shortTermMemories.length);
    console.log('【剧情推进】玩家行动:', playerAction);

    // 🔥 使用结构化 prompts 注入短期记忆
    // 1. system: 系统提示词（规则、数据结构等）
    // 2. assistant: 短期记忆（之前的剧情，合并为一条）
    // 3. user: 玩家行动
    const helper = getTavernHelper();
    if (!helper) throw new Error('酒馆助手未初始化');

    // 将所有短期记忆合并为一条assistant消息
    const memoryContent = shortTermMemories.length > 0
      ? shortTermMemories.join('\n\n---\n\n')
      : '【仙道元年元月初一 00:00】旅途刚刚开始...';

    console.log('【剧情推进-调试】注入记忆长度:', memoryContent.length);
    console.log('【剧情推进-调试】注入记忆前300字符:', memoryContent.substring(0, 300));

    const rawResult = await helper.generate({
      user_input: userInput,
      overrides: {
        chat_history: {
          prompts: [
            { role: 'system', content: systemPrompt },
            { role: 'assistant', content: memoryContent }  // 🔥 关键：将短期记忆作为assistant的历史输出
          ]
        }
      },
      max_chat_history: 0,  // 禁用真实对话历史，只使用我们注入的prompts
      should_stream: useStreaming || false
    } as any);

    console.log('【剧情推进-调试】AI原始返回类型:', typeof rawResult);
    console.log('【剧情推进-调试】AI原始返回值前500字符:', typeof rawResult === 'string' ? rawResult.substring(0, 500) : rawResult);

    // 🔥 处理AI返回结果（参考初始化函数的处理方式）
    let result: GM_Response;
    try {
      if (typeof rawResult === 'string') {
        // 去掉 Markdown 代码块标记
        let cleanedResult = rawResult.trim();
        const jsonMatch = cleanedResult.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanedResult = jsonMatch[1].trim();
        }
        result = JSON.parse(cleanedResult) as GM_Response;
      } else if (rawResult && typeof rawResult === 'object') {
        result = rawResult as GM_Response;
      } else {
        throw new Error('AI返回了空的响应');
      }
    } catch (parseError) {
      console.error('【剧情推进】JSON解析失败:', parseError);
      console.error('【剧情推进】原始返回值:', rawResult);
      throw new Error('AI返回的响应格式无效');
    }

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
- text字段: 800-1500字符的简短反馈
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
    // 文本-指令同步：对照叙事自动补齐人物/物品命令（游戏进行中）
    // try {
    //   result.tavern_commands = syncTextWithCommands(String(result.text || ''), result.tavern_commands)
    //   console.log('【同步-进行中】根据text补齐命令后数量:', result.tavern_commands?.length)
    // } catch {}

    console.log('【快速响应】生成完成');
    return result as GM_Response;

  } catch (error) {
    console.error('【快速响应】生成失败:', error);

    // 不再提供fallback响应，直接抛出错误
    throw new Error(`快速响应生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}
