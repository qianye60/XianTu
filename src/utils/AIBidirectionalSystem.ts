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
import { toast } from './toast';
import type { GM_Response } from '@/types/AIGameMaster';
import type { CharacterProfile } from '@/types/game';

type PlainObject = Record<string, unknown>;

export interface ProcessOptions {
  onStreamChunk?: (chunk: string) => void;
  onProgressUpdate?: (progress: string) => void;
  onStateChange?: (newState: PlainObject) => void;
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
  
  private constructor() {}

  public static getInstance(): AIBidirectionalSystemClass {
    if (!this.instance) this.instance = new AIBidirectionalSystemClass();
    return this.instance;
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
    gameState: any,
    options?: ProcessOptions
  ): Promise<{
    finalContent: string;
    gmResponse?: GM_Response | null;
    stateChanges?: StateChangeLog | null;
    memoryUpdates?: PlainObject | null;
  }> {
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
    let tavernHelper: any = null;
    try {
      tavernHelper = getTavernHelper();
    } catch (e) {
      const fallback = '当下灵机未至（未连接酒馆环境），请稍后再试。';
      options?.onStreamChunk?.(fallback);
      return { finalContent: fallback };
    }

    // 3. 状态快照 - 记录执行前的状态
    options?.onProgressUpdate?.('获取当前状态快照…');
    const beforeState = await this.captureCurrentState(tavernHelper);
    
    // 4. 构建游戏数据并调用AI生成
    options?.onProgressUpdate?.('构建提示词并请求AI生成…');
    let gmResponse: GM_Response;
    
    try {
      // 构建当前游戏状态数据
      const currentGameData = this.buildGameStateData(character, gameState, userMessage);
      
      // 使用标准的GM生成器
      gmResponse = await generateInGameResponse(
        currentGameData, 
        userMessage
      );
      
      if (!gmResponse || !gmResponse.text) {
        throw new Error('AI生成器返回了无效的响应');
      }
      
    } catch (err) {
      console.error('[AI双向系统] AI生成失败:', err);
      toast.error('天机推演失败，请稍后重试。');
      
      const errorText = '风起云涌，天机未明（AI生成失败）。';
      options?.onStreamChunk?.(errorText);
      return { finalContent: errorText };
    }

    // 5. 执行AI指令（如果有）
    let stateChanges: StateChangeLog | null = null;
    if (gmResponse.tavern_commands && gmResponse.tavern_commands.length > 0) {
      options?.onProgressUpdate?.('执行AI指令并更新游戏状态…');
      
      try {
        // 处理AI指令
        await processGmResponse(gmResponse, character);
        
        // 获取执行后的状态
        const afterState = await this.captureCurrentState(tavernHelper);
        
        // 生成状态变更日志
        stateChanges = this.generateStateChangeLog(beforeState, afterState);
        
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
      memoryUpdates: null // 记忆更新由GM生成器内部处理
    };
  }

  /**
   * 捕获当前状态快照
   */
  private async captureCurrentState(tavernHelper: any): Promise<PlainObject> {
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
  private buildGameStateData(character: CharacterProfile, gameState: any, userMessage: string): any {
    // 从角色配置中获取存档数据
    const saveData = character.模式 === '单机' 
      ? character.存档列表?.['存档1']?.存档数据 
      : character.存档?.存档数据;

    return {
      character: character,
      saveData: saveData,
      gameState: gameState,
      playerAction: userMessage,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 生成状态变更日志
   */
  private generateStateChangeLog(beforeState: PlainObject, afterState: PlainObject): StateChangeLog {
    const changes: Array<{
      key: string;
      action: string;
      oldValue: unknown;
      newValue: unknown;
    }> = [];

    // 递归比较状态差异
    this.compareObjects('', beforeState, afterState, changes);

    return {
      before: beforeState,
      after: afterState,
      changes: changes,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 递归比较对象差异
   */
  private compareObjects(
    keyPrefix: string, 
    before: any, 
    after: any, 
    changes: Array<{key: string; action: string; oldValue: unknown; newValue: unknown}>
  ): void {
    // 检查新增和修改的键
    if (after && typeof after === 'object') {
      for (const key in after) {
        const fullKey = keyPrefix ? `${keyPrefix}.${key}` : key;
        const beforeValue = before?.[key];
        const afterValue = after[key];

        if (beforeValue === undefined) {
          // 新增
          changes.push({
            key: fullKey,
            action: 'add',
            oldValue: undefined,
            newValue: afterValue
          });
        } else if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
          // 修改
          if (typeof beforeValue === 'object' && typeof afterValue === 'object') {
            // 递归比较对象
            this.compareObjects(fullKey, beforeValue, afterValue, changes);
          } else {
            changes.push({
              key: fullKey,
              action: 'set',
              oldValue: beforeValue,
              newValue: afterValue
            });
          }
        }
      }
    }

    // 检查删除的键
    if (before && typeof before === 'object') {
      for (const key in before) {
        const fullKey = keyPrefix ? `${keyPrefix}.${key}` : key;
        if (after === null || after === undefined || !(key in after)) {
          changes.push({
            key: fullKey,
            action: 'delete',
            oldValue: before[key],
            newValue: undefined
          });
        }
      }
    }
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
