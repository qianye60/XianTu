/**
 * AIBidirectionalSystem
 *
 * 实现AI指令集方案中定义的双向数据流系统
 * 核心功能：
 * 1. 监听AI回复并解析指令
 * 2. 执行指令对酒馆Chat变量的修改
 * 3. 状态快照与比对，生成变更日志
 * 4. 上下文注入到下一次AI生成请求
 */

import { generateInGameResponse } from './generators/gameMasterGenerators';
import { processGmResponse } from './AIGameMaster';
import { MultiLayerMemorySystem } from './MultiLayerMemorySystem';
import { getTavernHelper } from './tavern';
import type { TavernHelper } from './tavernCore';
import { toast } from './toast';
import type { GM_Response } from '@/types/AIGameMaster';
import type { CharacterProfile } from '@/types/game';
import type { MemoryEntry } from '@/types/game';

type PlainObject = Record<string, unknown>;

export interface ProcessOptions {
  onStreamChunk?: (chunk: string) => void;
  onProgressUpdate?: (progress: string) => void;
  onStateChange?: (newState: PlainObject) => void;
  useStreaming?: boolean;
}

export interface StateChangeLog {
  before: PlainObject;
  after: PlainObject;
  changes: Array<{
    key: string;
    action: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  timestamp: string;
}

class AIBidirectionalSystemClass {
  private static instance: AIBidirectionalSystemClass | null = null;
  private stateHistory: StateChangeLog[] = [];

  // 记忆管理相关
  private memoryManager = {
    shortTerm: [] as MemoryEntry[],
    midTerm: [] as MemoryEntry[], // 中期记忆
    longTerm: [] as MemoryEntry[]
  };

  // 记忆限制配置
  private memoryLimits = {
    shortTermLimit: 10, // 短期记忆条数限制
    midTermLimit: 50,   // 中期记忆条数限制
    autoConvertThreshold: 8 // 自动转换阈值
  };

  private constructor() {}

  public static getInstance(): AIBidirectionalSystemClass {
    if (!this.instance) this.instance = new AIBidirectionalSystemClass();
    return this.instance;
  }

  // 初始化时加载中期记忆
  async initialize() {
    const loadedMidTermMemories = await this.loadMidTermMemoryFromTavern();
    this.memoryManager.midTerm = loadedMidTermMemories;
    console.log(`[中期记忆] 已加载 ${loadedMidTermMemories.length} 条中期记忆`);
  }

  /**
   * 处理玩家行动 - 完整的双向数据流处理
   * 1. 记忆整理
   * 2. 状态快照
   * 3. AI生成
   * 4. 指令解析执行
   * 5. 状态比对更新
   */
  public async processPlayerAction(
    userMessage: string,
    character: CharacterProfile,
    gameState: PlainObject,
    options?: ProcessOptions
  ): Promise<{
    finalContent: string;
    gmResponse?: GM_Response | null;
    stateChanges?: StateChangeLog | null;
    memoryUpdates?: PlainObject | null;
    systemMessages?: string[] | null;
    memoryStats?: {
      shortTermCount: number;
      midTermCount: number;
      longTermCount: number;
      hiddenMidTermCount: number;
      lastConversion?: Date;
    };
  }> {
    // 0. 初始化中期记忆系统
    await this.initialize();

    // 1. 记忆整理
    options?.onProgressUpdate?.('准备进行记忆整理…');
    try {
      const summarized = await MultiLayerMemorySystem.getInstance().ensureMidTermSummaryIfNeeded?.();
      if (summarized) {
        console.log('[AI双向系统] 发送前完成一次中期记忆整理');
      }
    } catch (e) {
      console.warn('[AI双向系统] 发送前记忆整理失败（非致命）:', e);
    }

    // 2. 获取酒馆助手
    let tavernHelper: TavernHelper | null = null;
    try {
      tavernHelper = getTavernHelper();
    } catch {
      const fallback = '当下灵机未至（未连接酒馆环境），请稍后再试。';
      options?.onStreamChunk?.(fallback);
      return { finalContent: fallback };
    }

    // 3. 状态快照 - 记录执行前的状态
    options?.onProgressUpdate?.('获取当前状态快照…');
    const beforeState = await this.captureCurrentState(tavernHelper!);

    // 4. 构建游戏数据并调用AI生成（含用户提示词防护与“行动趋向”包装）
    options?.onProgressUpdate?.('构建提示词并请求AI生成…');
    let gmResponse: GM_Response;
    let guardSystemMessages: string[] | null = null;

    try {
      // 简化用户输入处理
      const userActionForAI = (userMessage && userMessage.toString().trim()) || '继续当前活动';

      // 简化处理，移除 promptGuard 依赖
      guardSystemMessages = null;

      // 构建当前游戏状态数据
      const currentGameData = this.buildGameStateData(
        character,
        gameState,
        userActionForAI,
        { wrapper: '', tendencies: [] }
      );

      // 使用标准的GM生成器
      gmResponse = await generateInGameResponse(
        currentGameData,
        userActionForAI,
        options?.useStreaming,
        options?.onStreamChunk
      );

      if (!gmResponse || !gmResponse.text) {
        throw new Error('AI生成器返回了无效的响应');
      }
      // guardSystemMessages 已在上方准备

    } catch (err) {
      console.error('[AI双向系统] AI生成失败:', err);
      toast.error('天机推演失败，请稍后重试。');

      throw (err instanceof Error ? err : new Error(String(err)));
    }

    // 5. 执行AI指令（如果有）
    let stateChanges: StateChangeLog | null = null;
    if (gmResponse.tavern_commands && gmResponse.tavern_commands.length > 0) {
      options?.onProgressUpdate?.('执行AI指令并更新游戏状态…');

      try {
        // 处理AI指令
        await processGmResponse(gmResponse, character);

        // 获取执行后的状态
        const afterState = await this.captureCurrentState(tavernHelper!);

        // 生成状态变更日志 - 从指令生成，而不是比对
        stateChanges = this.generateStateChangeLogFromCommands(gmResponse.tavern_commands, beforeState, afterState);

        console.log('[AI双向系统] 状态变更:', stateChanges);

        // 通知状态变化
        if (options?.onStateChange && stateChanges.changes.length > 0) {
          options.onStateChange(afterState);
        }

      } catch (error) {
        console.error('[AI双向系统] 执行AI指令失败:', error);
        toast.warning(`部分指令执行失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // 6. 流式输出最终内容
    const finalText = gmResponse.text;
    options?.onStreamChunk?.(finalText);

    // 7. 记录处理历史
    if (stateChanges) {
      this.stateHistory.push(stateChanges);
      // 保持历史记录在合理范围内
      if (this.stateHistory.length > 50) {
        this.stateHistory = this.stateHistory.slice(-30);
      }
    }

    return {
      finalContent: finalText,
      gmResponse: gmResponse,
      stateChanges: stateChanges,
      memoryUpdates: null, // 记忆更新由GM生成器内部处理
      systemMessages: guardSystemMessages,
      memoryStats: {
        shortTermCount: this.memoryManager.shortTerm.length,
        midTermCount: this.memoryManager.midTerm.length,
        longTermCount: this.memoryManager.longTerm.length,
        hiddenMidTermCount: this.memoryManager.midTerm.filter(m => m.tags.includes('hidden')).length,
        lastConversion: this.getLastConversionTime()
      }
    };
  }

  /**
   * 捕获当前状态快照
   */
  private async captureCurrentState(tavernHelper: TavernHelper): Promise<PlainObject> {
    try {
      const chatVariables = await tavernHelper.getVariables({ type: 'chat' });
      return chatVariables || {};
    } catch (error) {
      console.warn('[AI双向系统] 获取状态快照失败:', error);
      return {};
    }
  }

  /**
   * 构建游戏状态数据
   */
  private buildGameStateData(
    character: CharacterProfile,
    gameState: PlainObject,
    userMessage: string,
    actionTendency?: { wrapper: string; tendencies: string[] }
  ): PlainObject {
    // 从角色配置中获取存档数据
    const saveData = character.模式 === '单机'
      ? character.存档列表?.['存档1']?.存档数据
      : character.存档?.存档数据;

    return {
      character: character,
      saveData: saveData,
      gameState: gameState,
      playerAction: userMessage,
      action_tendency: actionTendency ? {
        emphasized: true,
        message: actionTendency.wrapper,
        tendencies: actionTendency.tendencies,
      } : undefined,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 生成状态变更日志
   */
  private getNestedValue(obj: PlainObject, path: string): unknown {
    return path.split('.').reduce((o: PlainObject | unknown, k) => {
      if (o && typeof o === 'object' && !Array.isArray(o) && k in (o as PlainObject)) {
        return (o as PlainObject)[k];
      }
      return undefined;
    }, obj as PlainObject | unknown);
  }

  /**
   * 根据AI指令生成状态变更日志
   */
  private generateStateChangeLogFromCommands(
    commands: Array<{ action: string; key: string; value?: unknown }>,
    beforeState: PlainObject,
    afterState: PlainObject
  ): StateChangeLog {
    const changes = commands.map(command => {
      let oldValue: unknown;
      let newValue: unknown;

      // 根据指令类型智能确定新旧值
      switch (command.action) {
        case 'add':
        case 'push':
          // 对于新增操作，旧值为空，新值是指令提供的值
          oldValue = null;
          newValue = command.value;
          break;
        
        case 'remove':
        case 'pull':
          // 对于删除操作，旧值是执行前的值，新值为空
          oldValue = this.getNestedValue(beforeState, command.key);
          newValue = null;
          break;

        default:
          // 对于其他所有操作（set, inc, dec等），通过比对状态快照获取
          oldValue = this.getNestedValue(beforeState, command.key);
          newValue = this.getNestedValue(afterState, command.key);
          break;
      }
      
      return {
        key: command.key,
        action: command.action,
        oldValue: oldValue,
        newValue: newValue
      };
    });

    return {
      before: beforeState,
      after: afterState,
      changes: changes.filter(c => c.newValue !== c.oldValue), // 只记录实际发生变化的指令
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 获取状态变更历史
   */
  public getStateHistory(): StateChangeLog[] {
    return [...this.stateHistory];
  }

  /**
   * 清除状态历史
   */
  public clearStateHistory(): void {
    this.stateHistory = [];
  }

  // 添加记忆条目
  private addMemoryEntry(type: 'short' | 'mid' | 'long', content: string, importance: number = 1) {
    const entry: MemoryEntry = {
      id: Date.now().toString(),
      content,
      timestamp: new Date(),
      importance,
      tags: [],
      type: type === 'short' ? 'user_action' : type === 'mid' ? 'ai_response' : 'summary',
      category: 'other'
    };

    if (type === 'short') {
      this.memoryManager.shortTerm.push(entry);
      // 检查是否需要转换为中期记忆
      this.checkAndConvertToMidTerm();
    } else if (type === 'mid') {
      this.memoryManager.midTerm.push(entry);
      // 限制中期记忆数量
      if (this.memoryManager.midTerm.length > this.memoryLimits.midTermLimit) {
        this.memoryManager.midTerm.shift();
      }
      // 存储到酒馆变量
      this.storeMidTermMemoryToTavern(entry);
    } else {
      this.memoryManager.longTerm.push(entry);
    }
  }

  // 检查并转换短期记忆为中期记忆
  private checkAndConvertToMidTerm() {
    if (this.memoryManager.shortTerm.length >= this.memoryLimits.autoConvertThreshold) {
      // 选择重要性较低的记忆转换为中期记忆
      const sortedShortTerm = [...this.memoryManager.shortTerm]
        .sort((a, b) => a.importance - b.importance);
      
      const toConvert = sortedShortTerm.slice(0, Math.floor(sortedShortTerm.length / 2));
      
      console.log(`[中期记忆] 开始转换 ${toConvert.length} 条短期记忆为中期记忆`);
      
      toConvert.forEach(entry => {
        // 移除短期记忆
        this.memoryManager.shortTerm = this.memoryManager.shortTerm
          .filter(item => item.id !== entry.id);
        
        // 转换为中期记忆（标记为隐藏状态）
        const midTermEntry: MemoryEntry = {
          ...entry,
          id: `mid_${entry.id}`,
          tags: [...entry.tags, 'converted_from_short', 'hidden']
        };
        
        this.memoryManager.midTerm.push(midTermEntry);
        this.storeMidTermMemoryToTavern(midTermEntry);
      });
      
      console.log(`[中期记忆] 转换完成，当前短期记忆: ${this.memoryManager.shortTerm.length}，中期记忆: ${this.memoryManager.midTerm.length}`);
    }
  }

  // 将中期记忆存储到酒馆变量
  private storeMidTermMemoryToTavern(entry: MemoryEntry) {
    try {
      const helper = getTavernHelper();
      if (helper) {
        const variableName = `mid_term_memory_${entry.id}`;
        const memoryData = {
          content: entry.content,
          timestamp: entry.timestamp.toISOString(),
          importance: entry.importance,
          tags: entry.tags,
          hidden: entry.tags.includes('hidden')
        };
        
        helper.insertOrAssignVariables(
          { [variableName]: JSON.stringify(memoryData) },
          { type: 'chat' }
        );
        console.log(`[中期记忆] 已存储中期记忆到酒馆变量: ${variableName}`);
      }
    } catch (error) {
      console.error('[中期记忆] 存储中期记忆到酒馆变量失败:', error);
    }
  }

  // 从酒馆变量加载中期记忆
  private async loadMidTermMemoryFromTavern(): Promise<MemoryEntry[]> {
    const midTermMemories: MemoryEntry[] = [];
    
    try {
      const helper = getTavernHelper();
      if (helper) {
        // 获取所有聊天变量
        const variables = await helper.getVariables({ type: 'chat' });
        
        Object.keys(variables).forEach(key => {
          if (key.startsWith('mid_term_memory_')) {
            try {
              const rawData = variables[key];
              const memoryData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
              const entry: MemoryEntry = {
                id: key.replace('mid_term_memory_', ''),
                content: memoryData.content,
                timestamp: new Date(memoryData.timestamp),
                importance: memoryData.importance || 1,
                tags: memoryData.tags || [],
                type: memoryData.type || 'ai_response',
                category: memoryData.category || 'other'
              };
              midTermMemories.push(entry);
            } catch (e) {
              console.error('[中期记忆] 解析中期记忆数据失败:', e);
            }
          }
        });
      }
    } catch (error) {
      console.error('[中期记忆] 从酒馆变量加载中期记忆失败:', error);
    }
    
    return midTermMemories;
  }

  // 获取记忆上下文
  private getMemoryContext(): string {
    const shortTermContext = this.memoryManager.shortTerm
      .slice(-5) // 只取最近5条短期记忆
      .map(entry => `${entry.content} (重要性: ${entry.importance})`)
      .join('\n');

    // 获取非隐藏的中期记忆用于辅助分析
    const midTermContext = this.memoryManager.midTerm
      .filter(entry => !entry.tags.includes('hidden'))
      .slice(-3)
      .map(entry => `${entry.content} (转换自短期记忆)`)
      .join('\n');

    const longTermContext = this.memoryManager.longTerm
      .filter(entry => entry.importance >= 3) // 只取重要的长期记忆
      .slice(-3)
      .map(entry => entry.content)
      .join('\n');

    return `
短期记忆:
${shortTermContext}

${midTermContext ? `中期记忆(辅助分析):
${midTermContext}
` : ''}
长期记忆:
${longTermContext}
    `.trim();
  }

  // 获取隐藏的中期记忆用于内部分析
  private getHiddenMidTermContext(): string {
    return this.memoryManager.midTerm
      .filter(entry => entry.tags.includes('hidden'))
      .map(entry => entry.content)
      .join('\n');
  }

  // 获取最后一次转换时间
  private getLastConversionTime(): Date | undefined {
    const convertedMemories = this.memoryManager.midTerm
      .filter(m => m.tags.includes('converted_from_short'))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return convertedMemories.length > 0 ? convertedMemories[0].timestamp : undefined;
  }

  /**
   * 获取上下文信息用于注入到提示词
   */
  public getContextForPrompt(): {
    recentChanges: StateChangeLog[];
    currentState: string;
  } {
    const recentChanges = this.stateHistory.slice(-5); // 最近5次变更

    let currentState = '当前状态稳定，无重大变化。';
    if (recentChanges.length > 0) {
      const latestChanges = recentChanges[recentChanges.length - 1];
      if (latestChanges.changes.length > 0) {
        currentState = `最近有${latestChanges.changes.length}项状态变更，包括：` +
          latestChanges.changes.slice(0, 3).map(c =>
            `${c.action === 'add' ? '新增' : c.action === 'set' ? '修改' : '删除'} ${c.key}`
          ).join('、');
      }
    }

    return {
      recentChanges,
      currentState
    };
  }
}

export const AIBidirectionalSystem = {
  getInstance: () => AIBidirectionalSystemClass.getInstance()
};

export default AIBidirectionalSystem;
