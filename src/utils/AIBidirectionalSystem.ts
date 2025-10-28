/**
 * AIBidirectionalSystem
 * 核心功能：
 * 1. 接收用户输入，构建Prompt，调用AI生成响应
 * 2. 解析AI响应，执行AI返回的指令
 * 3. 更新并返回游戏状态
 */
import { set, get, unset, cloneDeep } from 'lodash';
import { getTavernHelper } from '@/utils/tavern';
import { toast } from './toast';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useCharacterStore } from '@/stores/characterStore'; // 导入角色商店
import type { GM_Response } from '@/types/AIGameMaster';
import type { CharacterProfile, StateChangeLog, SaveData, GameTime, StateChange, GameMessage, StatusEffect } from '@/types/game';
import { updateMasteredSkills } from './masteredSkillsCalculator';
import { DATA_STRUCTURE_DEFINITIONS } from './prompts/dataStructureDefinitions';
import { PLAYER_INTENT_RESPECT_RULE } from './prompts/sharedRules';
import { normalizeGameTime } from './time';
import { updateStatusEffects } from './statusEffectManager';
import { rollD20 } from './diceRoller';

type PlainObject = Record<string, unknown>;

export interface ProcessOptions {
  onStreamChunk?: (chunk: string) => void;
  onStreamComplete?: () => void;
  onProgressUpdate?: (progress: string) => void;
  onStateChange?: (newState: PlainObject) => void;
  useStreaming?: boolean;
}

class AIBidirectionalSystemClass {
  private static instance: AIBidirectionalSystemClass | null = null;
  private stateHistory: StateChangeLog[] = [];
  private isSummarizing = false; // 添加一个锁，防止并发总结

  private constructor() {}

  public static getInstance(): AIBidirectionalSystemClass {
    if (!this.instance) this.instance = new AIBidirectionalSystemClass();
    return this.instance;
  }

  /**
   * 处理玩家行动 - 简化版流程
   * 1. 调用AI生成响应
   * 2. 执行指令
   * 3. 返回结果
   */
  public async processPlayerAction(
    userMessage: string,
    character: CharacterProfile,
    options?: ProcessOptions & { generation_id?: string }
  ): Promise<GM_Response | null> {
    const gameStateStore = useGameStateStore();
    const tavernHelper = getTavernHelper();

    if (!tavernHelper) {
      throw new Error('TavernHelper 未初始化，请检查配置');
    }

    // 生成唯一的generation_id，如果未提供
    const generationId = options?.generation_id || `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 1. 获取当前存档数据
    options?.onProgressUpdate?.('获取存档数据…');
    const saveData = gameStateStore.toSaveData();
    if (!saveData) {
      throw new Error('无法获取存档数据，请确保角色已加载');
    }

    // 2. 准备AI上下文
    options?.onProgressUpdate?.('构建提示词并请求AI生成…');
    let gmResponse: GM_Response;
    try {
      const stateForAI = cloneDeep(saveData);
      if (stateForAI.记忆) {
        // 移除短期和隐式中期记忆，以优化AI上下文
        delete stateForAI.记忆.短期记忆;
        delete stateForAI.记忆.隐式中期记忆;
      }
      // 移除叙事历史，避免与短期记忆重复
      if (stateForAI.叙事历史) delete stateForAI.叙事历史;

      // 保存短期记忆用于单独发送
      const shortTermMemory = saveData.记忆?.短期记忆 || [];

      // --- 角色核心状态速览 ---
      const playerStatus = stateForAI.玩家角色状态;
      const character = stateForAI.角色基础信息;
      const formatTalentsForPrompt = (talents: any): string => {
        if (!talents) return '无';
        if (typeof talents === 'string') return talents;
        if (Array.isArray(talents)) {
          return talents.map(t => {
            if (typeof t === 'string') return t;
            if (typeof t === 'object' && t !== null) {
              return t.name || t.名称 || '';
            }
            return '';
          }).filter(Boolean).join(', ') || '无';
        }
        return '未知格式';
      };

      let coreStatusSummary = '# 角色核心状态速览\n';
      if (playerStatus) {
        coreStatusSummary += `\n- 生命: 气血${playerStatus.气血?.当前}/${playerStatus.气血?.上限} 灵气${playerStatus.灵气?.当前}/${playerStatus.灵气?.上限} 神识${playerStatus.神识?.当前}/${playerStatus.神识?.上限} 寿元${playerStatus.寿命?.当前}/${playerStatus.寿命?.上限}`;

        if (playerStatus.境界) {
          const realm = playerStatus.境界;
          coreStatusSummary += `\n- 境界: ${realm.名称}-${realm.阶段} (${realm.当前进度}/${realm.下一级所需})`;
        }

        if (playerStatus.声望) {
          coreStatusSummary += `\n- 声望: ${playerStatus.声望}`;
        }

        if (playerStatus.状态效果 && playerStatus.状态效果.length > 0) {
          coreStatusSummary += `\n- 状态: ${playerStatus.状态效果.map((e: StatusEffect) => e.状态名称).join(', ')}`;
        }
      }
      if (character?.天赋) {
        coreStatusSummary += `\n- 天赋: ${formatTalentsForPrompt(character.天赋)}`;
      }
      // --- 结束 ---

      const stateJsonString = JSON.stringify(stateForAI);

      const systemPrompt = `
${PLAYER_INTENT_RESPECT_RULE}

${coreStatusSummary}

# 游戏状态
你正在修仙世界《大道朝天》中扮演GM。以下是当前完整游戏存档(JSON格式):
${stateJsonString}

下面是格式标准规则和命令生成教程参考（仔细查看，字段类型一定不能出错）：
${DATA_STRUCTURE_DEFINITIONS}
`.trim();

      const userActionForAI = (userMessage && userMessage.toString().trim()) || '继续当前活动';

      // 🎲 投掷骰子 - 程序随机生成
      const diceRoll = rollD20();
      console.log(`[骰子系统] 本回合骰点: ${diceRoll}`);

      // 构建注入消息列表
      // 注意：使用 assistant 角色而不是 system，避免中转API忽略
      const injects: Array<{ content: string; role: 'system' | 'assistant'; depth: number; position: 'before' }> = [
        {
          content: systemPrompt,
          role: 'assistant',
          depth: 1,
          position: 'before',
        }
      ];

      // 如果有短期记忆，作为独立的 assistant 消息发送
      if (shortTermMemory.length > 0) {
        injects.push({
          content: `# 【最近事件】\n${shortTermMemory.join('\n')}。根据这刚刚发生的文本事件，合理生成下一次文本信息，要保证衔接流畅、不断层，符合上文的文本信息`,
          role: 'assistant',
          depth: 0,
          position: 'before',
        });
      }

      // 🎲 添加骰点信息到用户输入
      const userInputWithDice = `${userActionForAI}\n\n【系统骰点】本回合骰点: ${diceRoll} (1d20)`;

      // 🔥 [流式传输修复]
      // 使用酒馆的事件系统处理流式传输
      const useStreaming = options?.useStreaming !== false;

      const response = await tavernHelper!.generate({
        user_input: userInputWithDice,
        should_stream: useStreaming,
        generation_id: generationId,
        injects,
      });

      // 流式传输通过事件系统在 MainGamePanel 中处理
      // 这里只需要解析最终响应
      try {
        gmResponse = this.parseAIResponse(response);
      } catch (parseError) {
        console.error('[AI双向系统] 响应解析失败，尝试容错处理:', parseError);

        // 容错策略：尝试多种方式提取文本内容
        const responseText = String(response).trim();
        let extractedText = '';
        let extractedMemory = '';
        let extractedCommands: any[] = [];

        // 1. 尝试提取JSON代码块（```json ... ```）
        const jsonBlockMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
        if (jsonBlockMatch && jsonBlockMatch[1]) {
          try {
            const jsonObj = JSON.parse(jsonBlockMatch[1].trim());
            extractedText = jsonObj.text || jsonObj.叙事文本 || jsonObj.narrative || '';
            extractedMemory = jsonObj.mid_term_memory || jsonObj.中期记忆 || '';
            extractedCommands = jsonObj.tavern_commands || jsonObj.指令 || [];
          } catch (e) {
            console.warn('[AI双向系统] JSON代码块解析失败:', e);
          }
        }

        // 2. 如果没有提取到，尝试直接JSON解析
        if (!extractedText) {
          try {
            const jsonObj = JSON.parse(responseText);
            extractedText = jsonObj.text || jsonObj.叙事文本 || jsonObj.narrative || '';
            extractedMemory = jsonObj.mid_term_memory || jsonObj.中期记忆 || '';
            extractedCommands = jsonObj.tavern_commands || jsonObj.指令 || [];
          } catch {
            // 3. 尝试提取JSON中的text字段（使用正则）
            const textMatch = responseText.match(/"(?:text|叙事文本|narrative)"\s*:\s*"((?:[^"\\]|\\.)*)"/);
            if (textMatch && textMatch[1]) {
              extractedText = textMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
            } else {
              // 4. 尝试查找大括号包裹的JSON
              const jsonMatch = responseText.match(/\{[\s\S]*"text"[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  const jsonObj = JSON.parse(jsonMatch[0]);
                  extractedText = jsonObj.text || '';
                  extractedMemory = jsonObj.mid_term_memory || '';
                  extractedCommands = jsonObj.tavern_commands || [];
                } catch {
                  // 5. 最后降级：使用整个响应作为文本
                  extractedText = responseText;
                }
              } else {
                // 5. 最后降级：使用整个响应作为文本
                extractedText = responseText;
              }
            }
          }
        }

        gmResponse = {
          text: extractedText,
          mid_term_memory: extractedMemory,
          tavern_commands: extractedCommands
        };
        console.warn('[AI双向系统] 使用容错模式提取内容 - 文本长度:', extractedText.length, '记忆:', extractedMemory.length, '指令数:', extractedCommands.length);
      }

      if (!gmResponse || !gmResponse.text) {
        throw new Error('AI响应为空或格式错误');
      }

      // 流式传输完成后调用回调
      if (useStreaming && options?.onStreamComplete) {
        options.onStreamComplete();
      }
    } catch (error) {
      console.error('[AI双向系统] AI生成失败:', error);
      throw new Error(`AI生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    // 3. 执行AI指令
    options?.onProgressUpdate?.('执行AI指令…');
    try {
      const { saveData: updatedSaveData } = await this.processGmResponse(gmResponse, saveData);
      if (options?.onStateChange) {
        options.onStateChange(updatedSaveData as unknown as PlainObject);
      }
      return gmResponse;
    } catch (error) {
      console.error('[AI双向系统] 指令执行失败:', error);
      throw new Error(`指令执行失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  public async generateInitialMessage(
    systemPrompt: string,
    userPrompt: string,
    options?: ProcessOptions
  ): Promise<GM_Response> {
    const tavernHelper = getTavernHelper();
    if (!tavernHelper) {
      throw new Error('TavernHelper 未初始化，请检查配置');
    }

    options?.onProgressUpdate?.('构建提示词并请求AI生成…');
    let gmResponse: GM_Response;
    try {
      const useStreaming = options?.useStreaming !== false; // 默认启用流式传输

      // 🔥 [重构] 使用标准 generate() 方法，不再使用 generateRaw()
      // 构建注入消息列表
      const injects: Array<{ content: string; role: 'system' | 'assistant'; depth: number; position: 'before' }> = [
        {
          content: systemPrompt,
          role: 'assistant',
          depth: 1,
          position: 'before',
        }
      ];

      const response = await tavernHelper!.generate({
        user_input: userPrompt,
        should_stream: useStreaming,
        generation_id: `initial_message_${Date.now()}`,
        injects,
      });

      // 流式传输通过事件系统在调用方处理
      try {
        gmResponse = this.parseAIResponse(String(response));
      } catch (parseError) {
        console.error('[AI双向系统] 初始消息解析失败，尝试容错处理:', parseError);

        // 容错策略：尝试多种方式提取文本内容
        const responseText = String(response).trim();
        let extractedText = '';
        let extractedMemory = '';
        let extractedCommands: any[] = [];

        // 1. 尝试提取JSON代码块（```json ... ```）
        const jsonBlockMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
        if (jsonBlockMatch && jsonBlockMatch[1]) {
          try {
            const jsonObj = JSON.parse(jsonBlockMatch[1].trim());
            extractedText = jsonObj.text || jsonObj.叙事文本 || jsonObj.narrative || '';
            extractedMemory = jsonObj.mid_term_memory || jsonObj.中期记忆 || '';
            extractedCommands = jsonObj.tavern_commands || jsonObj.指令 || [];
          } catch (e) {
            console.warn('[AI双向系统] JSON代码块解析失败:', e);
          }
        }

        // 2. 如果没有提取到，尝试直接JSON解析
        if (!extractedText) {
          try {
            const jsonObj = JSON.parse(responseText);
            extractedText = jsonObj.text || jsonObj.叙事文本 || jsonObj.narrative || '';
            extractedMemory = jsonObj.mid_term_memory || jsonObj.中期记忆 || '';
            extractedCommands = jsonObj.tavern_commands || jsonObj.指令 || [];
          } catch {
            // 3. 尝试提取JSON中的text字段（使用正则）
            const textMatch = responseText.match(/"(?:text|叙事文本|narrative)"\s*:\s*"((?:[^"\\]|\\.)*)"/);
            if (textMatch && textMatch[1]) {
              extractedText = textMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
            } else {
              // 4. 尝试查找大括号包裹的JSON
              const jsonMatch = responseText.match(/\{[\s\S]*"text"[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  const jsonObj = JSON.parse(jsonMatch[0]);
                  extractedText = jsonObj.text || '';
                  extractedMemory = jsonObj.mid_term_memory || '';
                  extractedCommands = jsonObj.tavern_commands || [];
                } catch {
                  // 5. 最后降级：使用整个响应作为文本
                  extractedText = responseText;
                }
              } else {
                // 5. 最后降级：使用整个响应作为文本
                extractedText = responseText;
              }
            }
          }
        }

        gmResponse = {
          text: extractedText,
          mid_term_memory: extractedMemory,
          tavern_commands: extractedCommands
        };
        console.warn('[AI双向系统] 使用容错模式提取初始消息 - 文本长度:', extractedText.length, '记忆:', extractedMemory.length, '指令数:', extractedCommands.length);
      }

      if (!gmResponse || !gmResponse.text) {
        throw new Error('AI响应解析失败或为空');
      }

      // 流式传输完成后调用回调
      if (useStreaming && options?.onStreamComplete) {
        options.onStreamComplete();
      }

      return gmResponse;
    } catch (error) {
      console.error('[AI双向系统] 初始消息生成失败:', error);
      throw new Error(`初始消息生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private _getMinutes(gameTime: GameTime): number {
    return gameTime.分钟 ?? 0;
  }
  private _formatGameTime(gameTime: GameTime | undefined): string {
    if (!gameTime) return '【仙历元年】';
    const minutes = this._getMinutes(gameTime);
    return `【仙道${gameTime.年}年${gameTime.月}月${gameTime.日}日 ${String(gameTime.小时).padStart(2, '0')}:${String(minutes).padStart(2, '0')}】`;
  }
  public async processGmResponse(
    response: GM_Response,
    currentSaveData: SaveData,
    isInitialization = false
  ): Promise<{ saveData: SaveData; stateChanges: StateChangeLog }> {
    // 🔥 先修复数据格式，确保所有字段正确
    const { repairSaveData } = await import('./dataRepair');
    const repairedData = repairSaveData(currentSaveData);
    const saveData = cloneDeep(repairedData);
    const changes: StateChange[] = [];

    // 确保叙事历史数组存在
    if (!saveData.叙事历史) {
      saveData.叙事历史 = [];
    }

    // 处理text：添加到叙事历史和短期记忆
    if (response.text?.trim()) {
      const timePrefix = this._formatGameTime(saveData.游戏时间);
      const textContent = response.text.trim();

      // 1. 添加到叙事历史（用于UI显示）
      const newNarrative = {
        type: 'gm' as const,
        role: 'assistant' as const,
        content: `${timePrefix}${textContent}`,
        time: timePrefix
      };
      saveData.叙事历史.push(newNarrative);
      changes.push({
        key: `叙事历史[${saveData.叙事历史.length - 1}]`,
        action: 'push',
        oldValue: undefined,
        newValue: cloneDeep(newNarrative)
      });

      // 2. 添加到短期记忆（用于AI上下文）
      if (!saveData.记忆) saveData.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [], 隐式中期记忆: [] };
      if (!saveData.记忆.短期记忆) saveData.记忆.短期记忆 = [];
      saveData.记忆.短期记忆.push(`${timePrefix}${textContent}`);
    }

    // 处理mid_term_memory：添加到隐式中期记忆
    if (response.mid_term_memory?.trim()) {
      if (!saveData.记忆) saveData.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [], 隐式中期记忆: [] };
      if (!saveData.记忆.隐式中期记忆) saveData.记忆.隐式中期记忆 = [];
      const timePrefix = this._formatGameTime(saveData.游戏时间);
      saveData.记忆.隐式中期记忆.push(`${timePrefix}${response.mid_term_memory.trim()}`);
    }

    // 🔥 检查短期记忆是否超限，超限则删除最旧的短期记忆，并将对应的隐式中期记忆转化为正式中期记忆
    // 从 localStorage 读取短期记忆上限配置
    let SHORT_TERM_LIMIT = 10; // 默认值
    try {
      const memorySettings = localStorage.getItem('memory-settings');
      if (memorySettings) {
        const settings = JSON.parse(memorySettings);
        if (typeof settings.shortTermLimit === 'number' && settings.shortTermLimit > 0) {
          SHORT_TERM_LIMIT = settings.shortTermLimit;
        }
      }
    } catch (error) {
      console.warn('[AI双向系统] 读取记忆配置失败，使用默认值:', error);
    }

    if (saveData.记忆?.短期记忆 && saveData.记忆.短期记忆.length > SHORT_TERM_LIMIT) {
      // 删除最旧的短期记忆（第一个）
      saveData.记忆.短期记忆.shift();
      console.log(`[AI双向系统] 短期记忆超限（上限: ${SHORT_TERM_LIMIT}），已删除最旧的短期记忆。当前短期记忆数量: ${saveData.记忆.短期记忆.length}`);

      // 将对应的隐式中期记忆转化为正式中期记忆
      if (saveData.记忆.隐式中期记忆 && saveData.记忆.隐式中期记忆.length > 0) {
        const implicitMidTerm = saveData.记忆.隐式中期记忆.shift();
        if (implicitMidTerm) {
          if (!saveData.记忆.中期记忆) saveData.记忆.中期记忆 = [];
          saveData.记忆.中期记忆.push(implicitMidTerm);
          console.log(`[AI双向系统] 已将隐式中期记忆转化为正式中期记忆。当前中期记忆数量: ${saveData.记忆.中期记忆.length}`);
        }
      }
    }

    // 检查是否达到自动总结阈值，如果达到则“异步”触发，不阻塞当前游戏循环
    try {
      const memorySettings = JSON.parse(localStorage.getItem('memory-settings') || '{}');
      const midTermTrigger = memorySettings.midTermTrigger ?? 25; // 默认25
      if (saveData.记忆?.中期记忆 && saveData.记忆.中期记忆.length >= midTermTrigger) {
        this.triggerMemorySummary().catch(error => {
          console.error('[AI双向系统] 自动记忆总结在后台失败:', error);
        });
      }
    } catch (error) {
      console.warn('[AI双向系统] 检查自动总结阈值时出错:', error);
    }


    if (!response.tavern_commands?.length) {
      return { saveData, stateChanges: { changes, timestamp: new Date().toISOString() } };
    }

    // 🔥 验证并清理指令格式
    const { validateCommands, cleanCommands } = await import('./commandValidator');
    const validation = validateCommands(response.tavern_commands);

    if (!validation.valid) {
      console.error('[AI双向系统] 指令格式验证失败:', validation.errors);
      validation.errors.forEach(err => console.error(`  - ${err}`));

      // 将验证错误添加到changes数组顶部
      if (validation.invalidCommands && validation.invalidCommands.length > 0) {
        validation.invalidCommands.forEach(({ command, errors }) => {
          changes.unshift({
            key: '❌ 错误指令',
            action: 'validation_error',
            oldValue: undefined,
            newValue: {
              command: JSON.stringify(command, null, 2),
              errors: errors
            }
          });
        });
      }
    }

    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warn => console.warn(`[AI双向系统] ${warn}`));
    }

    // 清理指令，移除多余字段
    const cleanedCommands = cleanCommands(response.tavern_commands);

    for (const command of cleanedCommands) {
      try {
        const oldValue = get(saveData, command.key);
        this.executeCommand(command, saveData);
        const newValue = get(saveData, command.key);
        changes.push({
          key: command.key,
          action: command.action,
          oldValue: cloneDeep(oldValue),
          newValue: cloneDeep(newValue)
        });
      } catch (error) {
        console.error(`[AI双向系统] 指令执行失败:`, command, error);
        toast.error(`指令执行失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    updateMasteredSkills(saveData);

    if (saveData.游戏时间) {
      saveData.游戏时间 = normalizeGameTime(saveData.游戏时间);
    }

    // 每次AI响应后，检查并移除过期的状态效果
    const { removedEffects } = updateStatusEffects(saveData);
    if (removedEffects.length > 0) {
      console.log(`[AI双向系统] Pinia状态更新前: 移除了 ${removedEffects.length} 个过期效果: ${removedEffects.join(', ')}`);
    }

    // 🔥 将状态变更添加到最新的叙事记录中
    const stateChangesLog: StateChangeLog = { changes, timestamp: new Date().toISOString() };
    if (saveData.叙事历史 && saveData.叙事历史.length > 0) {
      const latestNarrative = saveData.叙事历史[saveData.叙事历史.length - 1];
      (latestNarrative as any).stateChanges = stateChangesLog;
    }

    if (!isInitialization) {
      const gameStateStore = useGameStateStore();
      gameStateStore.loadFromSaveData(saveData);
    }

    return { saveData, stateChanges: stateChangesLog };
  }

  /**
   * 对记忆内容进行净化处理，替换敏感词汇为委婉表达
   * 避免触发API的内容审核
   */
  private sanitizeMemoryContent(content: string): string {
    // 定义敏感词汇映射表（使用委婉的古典文学表达）
    const replacements: Record<string, string> = {
      // 身体部位
      '乳房': '酥胸',
      '胸部': '玉峰',
      '乳头': '红梅',
      '下体': '私密之处',
      '阴部': '花径',
      '阴道': '幽谷',
      '小穴': '花心',
      '阴茎': '玉茎',
      '龟头': '龙首',

      // 动作描述
      '做爱': '云雨之欢',
      '性交': '鱼水之欢',
      '交合': '阴阳交融',
      '插入': '深入',
      '抽插': '律动',
      '射精': '释放',
      '高潮': '巅峰',
      '爱液': '琼浆',
      '精液': '精华',

      // 状态描述
      '湿润': '润泽',
      '勃起': '昂扬',
      '淫荡': '妩媚',
      '淫乱': '放纵',
      '色情': '情欲',
      '性欲': '欲望',
      '发情': '春心萌动',

      // 其他
      '处女': '完璧之身',
      '破处': '初次',
      '失身': '献身',
      '春药': '迷情之物',
      '媚药': '情药'
    };

    let sanitized = content;

    // 执行替换
    for (const [sensitive, elegant] of Object.entries(replacements)) {
      const regex = new RegExp(sensitive, 'g');
      sanitized = sanitized.replace(regex, elegant);
    }

    // 移除过于露骨的描述（使用正则匹配并替换为概括性描述）
    sanitized = sanitized.replace(/详细描述了.*?过程/g, '发生了亲密接触');
    sanitized = sanitized.replace(/具体.*?细节/g, '相关情况');

    return sanitized;
  }

  /**
   * 触发记忆总结（公开方法，带锁）
   * 无论是自动还是手动，都通过此方法执行，以防止竞态条件。
   */
  public async triggerMemorySummary(): Promise<void> {
    if (this.isSummarizing) {
      toast.warning('已有一个总结任务正在进行中，请稍候...');
      console.log('[AI双向系统] 检测到已有总结任务在运行，本次触发被跳过。');
      return;
    }

    this.isSummarizing = true;
    console.log('[AI双向系统] 开始记忆总结流程...');
    toast.loading('正在调用AI总结中期记忆...', { id: 'memory-summary' });

    try {
      const gameStateStore = useGameStateStore();
      const characterStore = useCharacterStore();
      const saveData = gameStateStore.toSaveData();

      if (!saveData || !saveData.记忆) {
        throw new Error('无法获取存档数据或记忆模块');
      }

      // 1. 从 localStorage 读取最新配置
      const settings = JSON.parse(localStorage.getItem('memory-settings') || '{}');
      const midTermTrigger = settings.midTermTrigger ?? 25;
      const midTermKeep = settings.midTermKeep ?? 8;
      const longTermFormat = settings.longTermFormat || '';

      // 2. 再次检查是否需要总结
      const midTermMemories = saveData.记忆.中期记忆 || [];

      // 情况1: 未达到触发阈值
      if (midTermMemories.length + 1  < midTermTrigger) {
        console.log(`[AI双向系统] 中期记忆数量(${midTermMemories.length})未达到总结阈值(${midTermTrigger})，取消总结。`);
        toast.info('中期记忆数量不足，已取消总结', { id: 'memory-summary' });
        return;
      }

      // 情况2: 总结后无法保留足够的记忆
      if (midTermMemories.length <= midTermKeep) {
        console.log(`[AI双向系统] 中期记忆数量(${midTermMemories.length})不足以保留${midTermKeep}条，取消总结。`);
        toast.info('中期记忆不足以保留指定数量，已取消总结', { id: 'memory-summary' });
        return;
      }

      // 3. 确定要总结和保留的记忆
      const numToSummarize = Math.max(0, midTermMemories.length - midTermKeep);
      if (numToSummarize <= 0) {
        console.log('[AI双向系统] 需要总结的记忆数量为0，取消操作。');
        return;
      }

      const memoriesToSummarize = midTermMemories.slice(0, numToSummarize);
      const memoriesToKeep = midTermMemories.slice(numToSummarize);
      const memoriesText = memoriesToSummarize.map((m, i) => `${i + 1}. ${m}`).join('\n');

      // 4. 构建提示词 - 使用标准JSON格式
      const defaultPrompt = `# 记忆总结任务

你需要将以下中期记忆总结成一条详细的长期记忆档案。

## 总结要求
1. 必须包含时间线索、关键事件、人物关系变化、情感波动
2. 使用第一人称（"我"）的视角描述
3. 按时间顺序梳理事件脉络，突出因果关系
4. 保留重要细节，合并琐碎信息
5. 字数控制在200-600简体汉字，确保信息完整详实
6. 不要添加任何时间前缀（如【仙道XX年】）、标题（如【记忆总结】）或其他格式标记

## 内容处理规范（重要）
- 如果记忆中包含亲密关系内容，必须使用委婉、文学化的表达方式
- 使用"云雨之欢"、"鱼水之欢"、"共度良宵"、"情意绵绵"等古典文学词汇
- 侧重情感层面和关系发展，淡化具体细节
- 采用含蓄笔法，符合修仙世界的文学审美

## 输出格式（严格遵守）
你必须返回标准JSON格式：
\`\`\`json
{
  "text": "总结的记忆内容（200-600字）",
  "mid_term_memory": "",
  "tavern_commands": []
}
\`\`\`

注意：
- text字段包含完整的记忆总结
- mid_term_memory留空
- tavern_commands留空数组
- 不要在JSON外添加任何说明文字`;

      const systemPrompt = longTermFormat || defaultPrompt;

      // 对记忆内容进行预处理，替换敏感词汇为委婉表达
      const sanitizedMemoriesText = this.sanitizeMemoryContent(memoriesText);

      const userPrompt = `请总结以下中期记忆：\n\n${sanitizedMemoriesText}`;

      // 5. 调用 AI - 使用标准generate而非generateRaw
      const tavernHelper = getTavernHelper();
      if (!tavernHelper) throw new Error('TavernHelper 未初始化');

      // 构建注入消息
      const injects: Array<{ content: string; role: 'system' | 'assistant'; depth: number; position: 'before' }> = [
        {
          content: systemPrompt,
          role: 'assistant',
          depth: 1,
          position: 'before',
        }
      ];

      const response = await tavernHelper.generate({
        user_input: userPrompt,
        should_stream: false,
        generation_id: `memory_summary_${Date.now()}`,
        injects,
      });

      // 使用标准的parseAIResponse解析
      let summaryText: string;
      try {
        const parsed = this.parseAIResponse(response);
        summaryText = parsed.text.trim();
      } catch (parseError) {
        console.error('[AI双向系统] 记忆总结解析失败，尝试容错:', parseError);

        // 容错处理
        const responseText = String(response).trim();

        // 尝试提取JSON
        let extractedText = '';
        try {
          const jsonObj = JSON.parse(responseText);
          extractedText = jsonObj.text || jsonObj.summary || jsonObj.content || '';
        } catch {
          // 尝试提取JSON代码块
          const jsonBlockMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
          if (jsonBlockMatch && jsonBlockMatch[1]) {
            try {
              const jsonObj = JSON.parse(jsonBlockMatch[1].trim());
              extractedText = jsonObj.text || '';
            } catch {
              extractedText = responseText;
            }
          } else {
            extractedText = responseText;
          }
        }

        summaryText = extractedText.trim();
      }

      if (!summaryText) {
        throw new Error('AI返回的总结为空');
      }

      console.log('[AI双向系统] 总结文本长度:', summaryText.length, '预览:', summaryText.substring(0, 100));

      // 6. 更新游戏状态
      // 长期记忆不需要时间前缀和【记忆总结】标签，直接存储总结内容
      const newLongTermMemory = summaryText;

      // 确保 memory 对象存在
      if (!gameStateStore.memory) {
        gameStateStore.memory = { 短期记忆: [], 中期记忆: [], 长期记忆: [], 隐式中期记忆: [] };
      }

      gameStateStore.memory.长期记忆.push(newLongTermMemory);
      gameStateStore.memory.中期记忆 = memoriesToKeep;

      // 7. 保存到存档
      await characterStore.saveCurrentGame();

      console.log(`[AI双向系统] ✅ 总结完成：${numToSummarize}条中期记忆 -> 1条长期记忆。保留 ${memoriesToKeep.length} 条。`);
      toast.success(`成功总结 ${numToSummarize} 条记忆！`, { id: 'memory-summary' });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      console.error('[AI双向系统] 记忆总结失败:', error);
      toast.error(`记忆总结失败: ${errorMsg}`, { id: 'memory-summary' });
    } finally {
      this.isSummarizing = false;
      console.log('[AI双向系统] 记忆总结流程结束，已释放锁。');
    }
  }

  private executeCommand(command: { action: string; key: string; value?: unknown }, saveData: SaveData): void {
    const { action, key, value } = command;

    if (!action || !key) {
      throw new Error('指令格式错误：缺少 action 或 key');
    }

    const path = key.toString();

    // 🔥 保护关键数组字段，防止被设为 null
    const arrayFields = ['玩家角色状态.状态效果', '任务列表', '物品栏.物品', '技能列表', '记忆.短期记忆', '记忆.中期记忆', '记忆.长期记忆', '叙事历史'];
    // 精确匹配：路径必须完全等于数组字段，或者是数组元素（如 状态效果[0]）但不是其子属性
    const isArrayField = arrayFields.some(field => {
      // 完全匹配
      if (path === field) return true;
      // 匹配数组元素，但不匹配数组元素的子属性
      // 例如：状态效果[0] ✓  状态效果[0].持续时间分钟 ✗
      if (path.startsWith(field + '[') && !path.includes('.', field.length)) return true;
      return false;
    });

    if (action === 'set' && isArrayField) {
      if (value === null || value === undefined) {
        console.warn(`[AI双向系统] 阻止将数组字段 ${path} 设为 null/undefined，改为空数组`);
        set(saveData, path, []);
        return;
      }
      if (!Array.isArray(value)) {
        console.warn(`[AI双向系统] 阻止将数组字段 ${path} 设为非数组值，保持原值`);
        return;
      }
    }

    switch (action) {
      case 'set':
        set(saveData, path, value);
        this.enforceStatLimits(saveData, path);
        break;

      case 'add': {
        const currentValue = get(saveData, path, 0);
        if (typeof currentValue !== 'number' || typeof value !== 'number') {
          throw new Error(`ADD操作要求数值类型，但得到: ${typeof currentValue}, ${typeof value}`);
        }
        set(saveData, path, currentValue + value);
        this.enforceStatLimits(saveData, path);
        break;
      }

      case 'push': {
        const array = get(saveData, path, []) as unknown[];
        if (!Array.isArray(array)) {
          throw new Error(`PUSH操作要求数组类型，但 ${path} 是 ${typeof array}`);
        }
        let valueToPush: unknown = value ?? null;
        // 当向记忆数组推送时，自动添加时间戳（但跳过隐式中期记忆，因为已在processGmResponse中处理）
        if (typeof valueToPush === 'string' && path.startsWith('记忆.') && path !== '记忆.隐式中期记忆') {
          if (!valueToPush.trim()) {
            break;
          }
          const timePrefix = this._formatGameTime(saveData.游戏时间);
          valueToPush = `${timePrefix}${valueToPush}`;
        }
        array.push(valueToPush);
        // 如果路径不存在，set会创建它
        set(saveData, path, array);
        break;
      }

      case 'delete':
        unset(saveData, path);
        break;

      case 'pull': {
        // 从数组中移除匹配的元素（用于任务系统、状态效果等）
        const array = get(saveData, path, []) as unknown[];
        if (!Array.isArray(array)) {
          throw new Error(`PULL操作要求数组类型，但 ${path} 是 ${typeof array}`);
        }

        // value 应该是一个对象，包含用于匹配的字段
        if (!value || typeof value !== 'object') {
          throw new Error(`PULL操作要求value是对象类型，用于匹配要移除的元素`);
        }

        const matchCriteria = value as Record<string, unknown>;
        const updatedArray = array.filter(item => {
          if (!item || typeof item !== 'object') return true;

          // 检查是否所有匹配条件都满足
          for (const [key, val] of Object.entries(matchCriteria)) {
            if ((item as Record<string, unknown>)[key] !== val) {
              return true; // 不匹配，保留
            }
          }
          return false; // 完全匹配，移除
        });

        set(saveData, path, updatedArray);
        console.log(`[AI双向系统] PULL操作: 从 ${path} 移除了 ${array.length - updatedArray.length} 个元素`);
        break;
      }

      default:
        throw new Error(`未知的操作类型: ${action}`);
    }
  }

  /**
   * 强制执行属性上限限制
   * 确保当前值不超过上限值
   */
  private enforceStatLimits(saveData: SaveData, path: string): void {
    // 定义需要检查上限的属性映射
    const statLimits: Record<string, string> = {
      '玩家角色状态.气血.当前': '玩家角色状态.气血.上限',
      '玩家角色状态.灵气.当前': '玩家角色状态.灵气.上限',
      '玩家角色状态.神识.当前': '玩家角色状态.神识.上限',
      '玩家角色状态.寿命.当前': '玩家角色状态.寿命.上限',
    };

    // 检查是否是需要限制的属性
    const limitPath = statLimits[path];
    if (limitPath) {
      const currentValue = get(saveData, path);
      const maxValue = get(saveData, limitPath);

      if (typeof currentValue === 'number' && typeof maxValue === 'number' && currentValue > maxValue) {
        set(saveData, path, maxValue);
        console.warn(`[AI双向系统] ${path} 超过上限 (${currentValue} > ${maxValue})，已限制为 ${maxValue}`);
      }
    }
  }

  private parseAIResponse(rawResponse: string): GM_Response {
    if (!rawResponse || typeof rawResponse !== 'string') {
      throw new Error('AI响应为空或格式错误');
    }

    const rawText = rawResponse.trim();
    console.log('[parseAIResponse] 原始响应长度:', rawText.length);
    console.log('[parseAIResponse] 原始响应前500字符:', rawText.substring(0, 500));

    // 🔥 检测是否有多个JSON对象
    const jsonCount = (rawText.match(/\{[\s\S]*?"text"[\s\S]*?:/g) || []).length;
    if (jsonCount > 1) {
      console.warn(`[parseAIResponse] ⚠️ 检测到 ${jsonCount} 个JSON对象，将只使用第一个`);
    }

    const tryParse = (text: string): Record<string, unknown> | null => {
      try {
        return JSON.parse(text) as Record<string, unknown>;
      } catch {
        return null;
      }
    };

    const standardize = (obj: Record<string, unknown>): GM_Response => {
      const commands = Array.isArray(obj.tavern_commands) ? obj.tavern_commands :
                      Array.isArray(obj.指令) ? obj.指令 :
                      Array.isArray(obj.commands) ? obj.commands : [];

      // 🔥 修复：将简化命令格式转换为完整的 TavernCommand 格式
      const tavernCommands = commands.map((cmd: any) => ({
        action: cmd.action || 'set',
        key: cmd.key || '',
        value: cmd.value
      }));

      return {
        text: String(obj.text || obj.叙事文本 || obj.narrative || ''),
        mid_term_memory: String(obj.mid_term_memory || obj.中期记忆 || obj.memory || ''),
        tavern_commands: tavernCommands
      };
    };

    // 尝试直接解析
    let parsedObj = tryParse(rawText);
    if (parsedObj) return standardize(parsedObj);

    // 尝试提取代码块
    const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      parsedObj = tryParse(codeBlockMatch[1].trim());
      if (parsedObj) return standardize(parsedObj);
    }

    // 🔥 修复：提取第一个完整的JSON对象（防止AI返回多个重复的JSON）
    // 使用更精确的方法：逐字符解析，匹配括号平衡
    const extractFirstJSON = (text: string): string | null => {
      const startIndex = text.indexOf('{');
      if (startIndex === -1) return null;

      let depth = 0;
      let inString = false;
      let escapeNext = false;

      for (let i = startIndex; i < text.length; i++) {
        const char = text[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          continue;
        }

        if (inString) continue;

        if (char === '{') depth++;
        if (char === '}') {
          depth--;
          if (depth === 0) {
            return text.substring(startIndex, i + 1);
          }
        }
      }

      return null;
    };

    const firstJSON = extractFirstJSON(rawText);
    if (firstJSON) {
      parsedObj = tryParse(firstJSON);
      if (parsedObj) {
        console.log('[parseAIResponse] ✅ 成功提取第一个JSON对象');
        return standardize(parsedObj);
      }
    }

    throw new Error('无法解析AI响应为有效的JSON格式');
  }
}

export const AIBidirectionalSystem = AIBidirectionalSystemClass.getInstance();

// 导出 getTavernHelper 以供其他模块使用
export { getTavernHelper };
