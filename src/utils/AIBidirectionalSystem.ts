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
import { useUIStore } from '@/stores/uiStore';
import type { GM_Response } from '@/types/AIGameMaster';
import type { CharacterProfile, StateChangeLog, SaveData, GameTime, StateChange, GameMessage, StatusEffect } from '@/types/game';
import { updateMasteredSkills } from './masteredSkillsCalculator';
import {  assembleSystemPrompt } from './prompts/promptAssembler';
import { getCotCorePrompt } from './prompts/cot/cotCore';
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
  generateMode?: 'generate' | 'generateRaw'; // 生成模式：generate（标准）或 generateRaw（纯净）
}

/**
 * 记忆总结选项
 */
export interface MemorySummaryOptions {
  /**
   * 是否使用Raw模式（默认true）
   *
   * **Raw模式 vs 标准模式：**
   * - ✅ Raw模式（推荐用于总结）：
   *   - 只发送总结提示词，不包含角色卡、世界观等预设
   *   - 不受其他提示词干扰，更符合真实内容
   *   - 适用场景：记忆总结、NPC总结、纯文本提取
   *
   * - ⚠️ 标准模式（容易污染）：
   *   - 包含完整的系统提示词（角色卡、世界观、规则等）
   *   - 容易受到预设提示词污染，可能偏离原始内容
   *   - 适用场景：正常游戏对话、需要遵守世界观的生成
   */
  useRawMode?: boolean;

  /**
   * 是否使用流式传输（默认false）
   *
   * **流式 vs 非流式：**
   * - ⚡ 流式传输（更快）：
   *   - 实时显示生成过程，用户体验更好
   *   - 响应更快，无需等待完整生成
   *   - 适用场景：长文本生成、需要实时反馈的场景
   *
   * - 🛡️ 非流式传输（更稳定，推荐用于总结）：
   *   - 一次性返回完整结果，更稳定可靠
   *   - 避免流式传输可能的中断问题
   *   - 适用场景：后台任务、自动总结、批量处理
   */
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
    const uiStore = useUIStore();

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
          coreStatusSummary += `\n- 状态: ${playerStatus.状态效果
            .filter((e: StatusEffect) => e && typeof e === 'object' && e.状态名称)
            .map((e: StatusEffect) => e.状态名称)
            .join(', ')}`;
        }
      }
      if (character?.天赋) {
        coreStatusSummary += `\n- 天赋: ${formatTalentsForPrompt(character.天赋)}`;
      }
      // --- 结束 ---

      const stateJsonString = JSON.stringify(stateForAI);

      const activePrompts: string[] = [];
      if (uiStore.enableActionOptions) {
        activePrompts.push('actionOptions');
      }

      // 🔥 根据任务系统配置决定是否激活任务系统提示词
      if (stateForAI.任务系统?.配置?.启用系统任务) {
        activePrompts.push('questSystem');
      }

      const systemPrompt = `
${assembleSystemPrompt(activePrompts, uiStore.actionOptionsPrompt)}

${coreStatusSummary}

# 游戏状态
你正在修仙世界《大道朝天》中扮演GM。以下是当前完整游戏存档(JSON格式):
${stateJsonString}
`.trim();

      const userActionForAI = (userMessage && userMessage.toString().trim()) || '继续当前活动';
      console.log('[AI双向系统] 用户输入 userMessage:', userMessage);
      console.log('[AI双向系统] 处理后 userActionForAI:', userActionForAI);

      // 🎲 投掷骰子 - 程序随机生成
      const diceRoll = rollD20();
      console.log(`[骰子系统] 本回合骰点: ${diceRoll}`);

      // 构建注入消息列表
      const injects: Array<{ content: string; role: 'system' | 'assistant' | 'user'; depth: number; position: 'in_chat' | 'none' }> = [
        {
          content: systemPrompt,
          role: 'system',
          depth: 4,
          position: 'in_chat',
        }
      ];

      // 如果有短期记忆，作为独立的 assistant 消息发送
      if (shortTermMemory.length > 0) {
        injects.push({
          content: `# 【最近事件】\n${shortTermMemory.join('\n')}。根据这刚刚发生的文本事件，合理生成下一次文本信息，要保证衔接流畅、不断层，符合上文的文本信息`,
          role: 'assistant',
          depth: 2,
          position: 'in_chat',
        });
      }

      // 🔥 添加 CoT 提示词（仅在启用系统CoT时注入）
      if (uiStore.useSystemCot) {
        injects.push({
          content: getCotCorePrompt(userActionForAI, uiStore.enableActionOptions),
          role: 'system',
          depth: 1,
          position: 'in_chat',
        });
      }

      // 🎲 添加骰点信息到用户输入
      const userInputWithDice = `${userActionForAI}\n\n【系统骰点】本回合骰点: ${diceRoll} (1d20)`;

      const finalUserInput = `${userInputWithDice}`;

      // 🛡️ 添加assistant角色的占位消息（防止输入截断）
      // 原理：如果最后一条消息是assistant角色，某些模型不会审核输入
      injects.push({
        content: '</input>',
        role: 'assistant',
        depth: 0,
        position: 'in_chat',
      });

      // 🔥 [流式传输修复]
      // 使用酒馆的事件系统处理流式传输
      const useStreaming = options?.useStreaming !== false;

      const response = await tavernHelper!.generate({
        user_input: finalUserInput,
        should_stream: useStreaming,
        generation_id: generationId,
        injects: injects as any,
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

      if (!gmResponse || !gmResponse.text || gmResponse.text.trim() === '') {
        console.error('[AI双向系统] AI响应为空，原始响应:', String(response).substring(0, 200));
        throw new Error('AI响应为空或格式错误');
      }

      // 流式传输完成后调用回调
      if (useStreaming && options?.onStreamComplete) {
        options.onStreamComplete();
      }
    } catch (error) {
      console.error('[AI双向系统] AI生成失败:', error);
      gmResponse = { text: '（AI生成失败）', mid_term_memory: '', tavern_commands: [] };
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
      return gmResponse;
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
      const generateMode = options?.generateMode || 'generate'; // 默认使用 generate 模式

      let response: string;

      if (generateMode === 'generateRaw') {
        // 🔥 使用 generateRaw 模式：纯净生成，不使用角色卡预设
        console.log('[AI双向系统] 使用 generateRaw 模式生成初始消息');
        response = String(await tavernHelper.generateRaw({
          ordered_prompts: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          should_stream: useStreaming,
          generation_id: `initial_message_raw_${Date.now()}`,
        }));
      } else {
        // 🔥 使用标准 generate 模式：包含角色卡预设和聊天历史
        console.log('[AI双向系统] 使用 generate 模式生成初始消息');
        const injects: Array<{ content: string; role: 'system' | 'assistant' | 'user'; depth: number; position: 'in_chat' | 'none' }> = [
          {
            content: systemPrompt,
            role: 'user',
            depth: 4,
            position: 'in_chat',
          }
        ];

        response = await tavernHelper.generate({
          user_input: userPrompt,
          should_stream: useStreaming,
          generation_id: `initial_message_${Date.now()}`,
          injects,
        });
      }

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
        time: timePrefix,
        actionOptions: response.action_options || []
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

    while (saveData.记忆?.短期记忆 && saveData.记忆.短期记忆.length > SHORT_TERM_LIMIT) {
      // 删除最旧的短期记忆（第一个）
      saveData.记忆.短期记忆.shift();
      console.log(`[AI双向系统] 短期记忆超过上限（${SHORT_TERM_LIMIT}条），已删除最旧的短期记忆。当前短期记忆数量: ${saveData.记忆.短期记忆.length}`);

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

    // 🔥 叙事历史存储在IndexedDB中，不限制条数
    // 叙事历史只用于UI显示和导出小说，不需要发送给AI（已在第122行移除）

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

    // 🔥 新增：预处理指令以修复常见的AI错误
    const preprocessedCommands = this._preprocessCommands(response.tavern_commands);

    // 🔥 步骤1：验证并清理指令格式
    const { validateCommands, cleanCommands } = await import('./commandValidator');
    const validation = validateCommands(preprocessedCommands);

    // 🔥 步骤2：验证指令值的格式，过滤掉格式错误的指令
    const { validateAndRepairCommandValue } = await import('./commandValueValidator');
    const validCommands: any[] = [];
    const rejectedCommands: Array<{ command: any; errors: string[] }> = [];

    preprocessedCommands.forEach((cmd, index) => {
      const valueValidation = validateAndRepairCommandValue(cmd);
      if (!valueValidation.valid) {
        console.error(`[AI双向系统] ❌ 拒绝执行指令[${index}]，格式错误:`, valueValidation.errors);
        rejectedCommands.push({
          command: cmd,
          errors: valueValidation.errors
        });
      } else {
        validCommands.push(cmd);
      }
    });

    // 记录被拒绝的指令
    if (rejectedCommands.length > 0) {
      console.error(`[AI双向系统] 共拒绝 ${rejectedCommands.length} 条格式错误的指令`);
      rejectedCommands.forEach(({ command, errors }) => {
        changes.unshift({
          key: '❌ 格式错误（已拒绝）',
          action: 'validation_error',
          oldValue: undefined,
          newValue: {
            command: JSON.stringify(command, null, 2),
            errors: errors
          }
        });
      });
    }

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

    // 🔥 步骤3：清理指令，移除多余字段（只处理通过验证的指令）
    const cleanedCommands = cleanCommands(validCommands);

    console.log(`[AI双向系统] 执行 ${cleanedCommands.length} 条有效指令，拒绝 ${rejectedCommands.length} 条无效指令`);

    for (const command of cleanedCommands) {
      try {
        const oldValue = get(saveData, command.key);
        this.executeCommand(command, saveData);
        const newValue = get(saveData, command.key);
        changes.push({
          key: command.key,
          action: command.action,
          oldValue: this._summarizeValue(oldValue),
          newValue: this._summarizeValue(newValue)
        });
      } catch (error) {
        console.error(`[AI双向系统] 指令执行失败:`, command, error);
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
   * 触发记忆总结（公开方法，带锁）
   * 无论是自动还是手动，都通过此方法执行，以防止竞态条件。
   *
   * @param options - 总结选项，详见 MemorySummaryOptions 接口说明
   *
   * @example
   * // 默认配置（推荐）：Raw模式 + 非流式
   * await AIBidirectionalSystem.triggerMemorySummary();
   *
   * @example
   * // 标准模式 + 流式传输
   * await AIBidirectionalSystem.triggerMemorySummary({
   *   useRawMode: false,
   *   useStreaming: true
   * });
   */
  public async triggerMemorySummary(options?: MemorySummaryOptions): Promise<void> {
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

      // 检查中期记忆数量是否达到触发阈值
      if (midTermMemories.length < midTermTrigger) {
        console.log(`[AI双向系统] 中期记忆数量(${midTermMemories.length})未达到触发阈值(${midTermTrigger})，取消总结。`);
        toast.info(`中期记忆未达到触发阈值(${midTermTrigger}条)，已取消总结`, { id: 'memory-summary' });
        return;
      }

      // 3. 确定要总结和保留的记忆
      // 需要总结的数量 = 触发阈值 - 保留数量（例如：25 - 8 = 17条）
      const numToSummarize = midTermTrigger - midTermKeep;

      if (numToSummarize <= 0) {
        console.log('[AI双向系统] 计算出的总结数量 <= 0，配置错误，取消操作。');
        toast.error('记忆配置错误：触发阈值必须大于保留数量', { id: 'memory-summary' });
        return;
      }

      if (midTermMemories.length < numToSummarize) {
        console.log(`[AI双向系统] 中期记忆数量(${midTermMemories.length})不足以总结${numToSummarize}条，取消总结。`);
        toast.info(`中期记忆不足${numToSummarize}条，已取消总结`, { id: 'memory-summary' });
        return;
      }

      // 从最旧的记忆开始（数组前面），取出需要总结的数量
      const memoriesToSummarize = midTermMemories.slice(0, numToSummarize);
      // 保留剩余的记忆（从 numToSummarize 位置开始到末尾）
      const memoriesToKeep = midTermMemories.slice(numToSummarize);
      const memoriesText = memoriesToSummarize.map((m, i) => `${i + 1}. ${m}`).join('\n');

      console.log(`[AI双向系统] 准备总结：从${midTermMemories.length}条中期记忆中，总结最旧的${numToSummarize}条，保留最新的${memoriesToKeep.length}条`);
      console.log(`[AI双向系统] 配置：触发阈值=${midTermTrigger}, 保留数量=${midTermKeep}, 总结数量=${numToSummarize}`);

      // 4. 构建提示词（优化：防止AI误解任务）
      const userPrompt = `这是一个纯粹的文本总结任务，不是游戏对话。请严格按照以下记忆内容进行总结，不要编造新内容。

【待总结的记忆内容】：
${memoriesText}

【总结要求】：
- 视角：第一人称"我"
- 字数：200-400字
- 风格：连贯的现代修仙小说叙述
- 核心原则：只总结上述记忆中已发生的事件，不要添加任何新情节

【必须包含的要素】：
1. 记忆中提到的具体人名、地名
2. 记忆中发生的具体事件
3. 记忆中的物品、功法、境界变化
4. 记忆中的时间节点

【禁止事项】：
❌ 不要编造记忆中没有的新情节
❌ 不要添加记忆中没有的新人物
❌ 不要推进故事发展
❌ 不要生成游戏对话
❌ 不要包含对话细节和情绪描写

【正确示例】：
记忆："我在青云峰修炼七天，突破到炼气三层。李云送我聚气丹。我去藏经阁学了剑法。"
总结："我在青云峰闭关七日，成功突破到炼气三层。期间结识了外门弟子李云，他赠予我一枚聚气丹。之后我进入藏经阁，学习了《基础剑法》。"

现在请严格根据上述【待总结的记忆内容】进行总结，不要偏离。`;

      // 5. 调用 AI
      const tavernHelper = getTavernHelper();
      if (!tavernHelper) throw new Error('TavernHelper 未初始化');

      // 默认使用Raw模式和非流式传输
      const useRawMode = options?.useRawMode !== false; // 默认true（Raw模式，推荐）
      const useStreaming = options?.useStreaming === true; // 默认false

      // 🔥 获取精简版游戏存档数据（只包含记忆总结需要的信息）
      const simplifiedSaveData = this._extractEssentialDataForSummary(saveData);
      const saveDataJson = JSON.stringify(simplifiedSaveData, null, 2);

      console.log(`[AI双向系统] 记忆总结模式: ${useRawMode ? 'Raw模式（纯净总结）' : '标准模式（带预设）'}, 传输方式: ${useStreaming ? '流式' : '非流式'}`);

      let response: string;
      if (useRawMode) {
        // Raw模式：分条目发送提示词
        const rawResponse = await tavernHelper.generateRaw({
          ordered_prompts: [
            // 1. 角色定义
            { role: 'system', content: '你是记忆总结助手。这是一个纯文本总结任务，不是游戏对话或故事续写。' },

            // 2. 游戏存档数据
            { role: 'system', content: `【游戏存档数据】（供参考）：\n${saveDataJson}` },

            // 3. 关键约束
            { role: 'system', content: '【关键约束】：\n1. 这不是游戏推进，不要生成新剧情\n2. 这不是对话任务，不要生成角色对话\n3. 只总结用户提供的记忆内容，不要编造\n4. 必须严格基于原文，不要添加原文没有的内容' },

            // 4. 输出格式
            { role: 'system', content: '【输出格式】：\n```json\n{"text": "总结内容"}\n```' },

            // 5. 总结要求
            { role: 'system', content: '【总结要求】：\n- 第一人称"我"\n- 250-400字\n- 连贯的现代修仙小说叙述风格\n- 仅输出JSON，不要thinking/commands/options' },

            // 6. 必须保留
            { role: 'system', content: '【必须保留】：\n- 原文中的人名、地名\n- 原文中的事件\n- 原文中的物品、功法、境界\n- 原文中的时间节点' },

            // 7. 必须忽略
            { role: 'system', content: '【必须忽略】：\n- 对话内容\n- 情绪描写\n- 过程细节' },

            // 8. 示例
            { role: 'system', content: '【示例】：\n原文："张长老说你天赋不错。你去了藏经阁。三天后在青云峰修炼突破到炼气二层。李云送你聚气丹。"\n正确："我获得了张长老的认可，进入藏经阁领取了令牌。三日后我在青云峰修炼，成功突破到炼气二层。期间结识了李云，他赠予我一枚聚气丹，我们结为道友。"\n错误："我继续修炼，遇到了新的挑战..."（❌ 编造了原文没有的内容）' },

            // 9. 重要提醒
            { role: 'system', content: '【重要提醒】：\n- 不要把这当成游戏对话\n- 不要推进故事\n- 不要编造新内容\n- 严格基于用户提供的记忆进行总结' },

            // 10. 用户输入
            { role: 'user', content: userPrompt },

            // 🛡️ 添加随机前缀（规避内容检测）
            { role: 'user', content: ['Continue.', 'Proceed.', 'Next.', 'Go on.', 'Resume.'][Math.floor(Math.random() * 5)] },

            // 🛡️ 添加assistant角色的占位消息（防止输入截断）
            { role: 'assistant', content: '</input>' }
          ],
          should_stream: useStreaming
        });
        response = String(rawResponse);
      } else {
        // 标准模式：合并提示词，减少条目数量
        const systemPromptCombined = `你是记忆总结助手。这是一个纯文本总结任务，不是游戏对话或故事续写。

【游戏存档数据】（供参考）：
${saveDataJson}

【关键约束】：
1. 这不是游戏推进，不要生成新剧情
2. 这不是对话任务，不要生成角色对话
3. 只总结用户提供的记忆内容，不要编造
4. 必须严格基于原文，不要添加原文没有的内容

【输出格式】：
\`\`\`json
{"text": "总结内容"}
\`\`\`

【总结要求】：
- 第一人称"我"
- 250-400字
- 连贯的现代修仙小说叙述风格
- 仅输出JSON，不要thinking/commands/options

【必须保留】：
- 原文中的人名、地名
- 原文中的事件
- 原文中的物品、功法、境界
- 原文中的时间节点

【必须忽略】：
- 对话内容
- 情绪描写
- 过程细节

【示例】：
原文："张长老说你天赋不错。你去了藏经阁。三天后在青云峰修炼突破到炼气二层。李云送你聚气丹。"
正确："我获得了张长老的认可，进入藏经阁领取了令牌。三日后我在青云峰修炼，成功突破到炼气二层。期间结识了李云，他赠予我一枚聚气丹，我们结为道友。"
错误："我继续修炼，遇到了新的挑战..."（❌ 编造了原文没有的内容）

【重要提醒】：
- 不要把这当成游戏对话
- 不要推进故事
- 不要编造新内容
- 严格基于用户提供的记忆进行总结`;

        const standardResponse = await tavernHelper.generate({
          user_input: userPrompt,
          should_stream: useStreaming,
          generation_id: `memory_summary_${Date.now()}`,
          injects: [
            {
              content: systemPromptCombined,
              role: 'system',
              depth: 4,  // 插入到较深位置，确保在用户输入之前
              position: 'in_chat'
            },
            // 🛡️ 添加assistant角色的占位消息（防止输入截断）
            {
              content: '</input>',
              role: 'assistant',
              depth: 0,  // 插入到最新位置
              position: 'in_chat'
            }
          ]
        });
        response = String(standardResponse);
      }

      // 解析响应（与NPC记忆总结相同的方式）
      let summaryText: string;
      const responseText = String(response).trim();

      const jsonBlockMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonBlockMatch?.[1]) {
        try {
          summaryText = JSON.parse(jsonBlockMatch[1].trim()).text?.trim() || '';
        } catch {
          summaryText = '';
        }
      } else {
        try {
          summaryText = JSON.parse(responseText).text?.trim() || '';
        } catch {
          summaryText = responseText.trim();
        }
      }

      if (!summaryText || summaryText.length === 0) {
        throw new Error('AI返回了空的总结结果');
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

  private _preprocessCommands(commands: any[]): any[] {
    if (!Array.isArray(commands)) return [];

    return commands.map(cmd => {
      if (cmd && typeof cmd === 'object') {
        // 修复: AI推送一个字符串而不是物品对象到物品栏
        if (cmd.action === 'push' && cmd.key === '背包.物品' && typeof cmd.value === 'string') {
          console.warn(`[AI双向系统] 预处理: 将字符串物品 "${cmd.value}" 转换为对象。`);
          const itemName = cmd.value;
          // 返回一个结构化的新指令值
          return {
            ...cmd,
            value: {
              物品ID: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              名称: itemName,
              类型: '杂物', // 默认类型
              品质: { quality: '凡品', grade: 0 }, // 默认品质
              数量: 1,
              描述: `一个普通的${itemName}。`
            }
          };
        }
      }
      return cmd;
    });
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
        const newValue = currentValue + value;

        // 🔥 防止灵石变成负数
        if (path.includes('灵石') && newValue < 0) {
          console.warn(`[AI双向系统] ${path} 执行add后会变成负数 (${currentValue} + ${value} = ${newValue})，已限制为0`);
          set(saveData, path, 0);
        } else {
          set(saveData, path, newValue);
        }

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

  /**
   * 提取记忆总结所需的精简存档数据
   * 与正式游戏交互保持一致：移除叙事历史、短期记忆、隐式中期记忆
   */
  private _extractEssentialDataForSummary(saveData: SaveData): SaveData {
    const simplified = cloneDeep(saveData);

    // 移除叙事历史（避免与短期记忆重复）
    if (simplified.叙事历史) {
      delete simplified.叙事历史;
    }

    // 移除短期和隐式中期记忆（以优化AI上下文）
    if (simplified.记忆) {
      delete simplified.记忆.短期记忆;
      delete simplified.记忆.隐式中期记忆;
    }

    return simplified;
  }

  /**
   * 智能摘要值，避免在状态变更日志中存储大量重复数据
   * 对于大型数组和对象，只记录摘要信息
   */
  private _summarizeValue(value: any): any {
    // null 或 undefined 直接返回
    if (value === null || value === undefined) {
      return value;
    }

    // 基本类型直接返回
    if (typeof value !== 'object') {
      return value;
    }

    // 数组类型：根据大小决定是否摘要
    if (Array.isArray(value)) {
      // 小数组（≤3个元素）：完整保留
      if (value.length <= 3) {
        return cloneDeep(value);
      }
      // 大数组：只记录摘要信息
      return {
        __type: 'Array',
        __length: value.length,
        __summary: `[数组: ${value.length}个元素]`,
        __first: value[0] ? this._summarizeValue(value[0]) : undefined,
        __last: value[value.length - 1] ? this._summarizeValue(value[value.length - 1]) : undefined
      };
    }

    // 对象类型：检查是否是大型对象
    const keys = Object.keys(value);

    // 小对象（≤5个属性）：完整保留
    if (keys.length <= 5) {
      return cloneDeep(value);
    }

    // 大对象：只记录摘要信息
    const summary: any = {
      __type: 'Object',
      __keys: keys.length,
      __summary: `[对象: ${keys.length}个属性]`
    };

    // 保留前3个属性作为预览
    keys.slice(0, 3).forEach(key => {
      summary[key] = this._summarizeValue(value[key]);
    });

    return summary;
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
        tavern_commands: tavernCommands,
        action_options: Array.isArray(obj.action_options) ? obj.action_options : []
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
