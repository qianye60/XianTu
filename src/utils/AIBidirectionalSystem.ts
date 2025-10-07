/**
 * AIBidirectionalSystem (简化版)
 *
 * 核心功能：
 * 1. 接收用户输入
 * 2. 调用AI生成响应
 * 3. 执行AI返回的指令
 * 4. 返回结果
 */

import { generateInGameResponse } from './generators/gameMasterGenerators';
import { processGmResponse, getFromTavern } from './AIGameMaster';
import { getTavernHelper } from './tavern';
import type { TavernHelper, SaveData } from '@/types';
import { toast } from './toast';
import type { GM_Response } from '@/types/AIGameMaster';
import type { CharacterProfile, StateChangeLog } from '@/types/game';

type PlainObject = Record<string, unknown>;

export interface ProcessOptions {
  onStreamChunk?: (chunk: string) => void;
  onProgressUpdate?: (progress: string) => void;
  onStateChange?: (newState: PlainObject) => void;
  useStreaming?: boolean;
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
   * 处理玩家行动 - 简化版流程
   * 1. 调用AI生成响应
   * 2. 执行指令
   * 3. 返回结果
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
  }> {
    // 1. 获取酒馆助手
    let tavernHelper: TavernHelper | null = null;
    try {
      tavernHelper = getTavernHelper();
    } catch {
      const fallback = '当下灵机未至（未连接酒馆环境），请稍后再试。';
      options?.onStreamChunk?.(fallback);
      return { finalContent: fallback };
    }

    // 2. 状态快照 - 记录执行前的状态
    options?.onProgressUpdate?.('获取当前状态快照…');
    const beforeState = await this.captureCurrentState(tavernHelper!);

    // 3. 调用AI生成
    options?.onProgressUpdate?.('构建提示词并请求AI生成…');
    let gmResponse: GM_Response;

    try {
      const userActionForAI = (userMessage && userMessage.toString().trim()) || '继续当前活动';

      // 构建当前游戏状态数据
      const currentGameData = this.buildGameStateData(
        character,
        gameState,
        userActionForAI
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

    } catch (err) {
      console.error('[AI双向系统] AI生成失败:', err);
      toast.error('天机推演失败，请稍后重试。');
      throw (err instanceof Error ? err : new Error(String(err)));
    }

    // 4. 执行AI指令（如果有）
    let stateChanges: StateChangeLog | null = null;
    if (gmResponse.tavern_commands && gmResponse.tavern_commands.length > 0) {
      options?.onProgressUpdate?.('执行AI指令并更新游戏状态…');

      try {
        // 从新的分片存储获取当前SaveData
        const currentSaveData = await getFromTavern('chat');

        // 确保有有效的SaveData再处理
        if (currentSaveData) {
          // 🔥 核心修复：接收processGmResponse返回的updatedSaveData
          // 原问题：之前没有接收返回值，导致命令执行后的数据被丢弃
          const processResult = await processGmResponse(gmResponse, currentSaveData);
          const updatedSaveData = processResult.saveData;
          stateChanges = processResult.stateChanges;

          // 🔥 重要：立即将更新后的SaveData分片并同步回酒馆
          // 这样后续的syncFromTavern能正确获取到最新数据
          const { shardSaveData, saveAllShards } = await import('./storageSharding');
          const shards = shardSaveData(updatedSaveData);
          await saveAllShards(shards, tavernHelper!);
          console.log('[AI双向系统] ✅ 已将命令执行后的SaveData同步到酒馆分片');

          // 🔥 新增：立即更新characterStore中的SaveData，确保UI实时响应
          const { useCharacterStore } = await import('@/stores/characterStore');
          const characterStore = useCharacterStore();
          await characterStore.updateSaveDataDirectly(updatedSaveData);
          console.log('[AI双向系统] ✅ 已将命令执行后的SaveData更新到Store，UI将实时响应');
        } else {
          console.warn('[AI双向系统] 无法获取SaveData，跳过指令执行');
        }

        // 获取执行后的状态
        const afterState = await this.captureCurrentState(tavernHelper!);

        // 生成状态变更日志
        stateChanges = this.generateStateChangeLogFromCommands(gmResponse.tavern_commands, beforeState, afterState);

        console.log('[AI双向系统] ===== 状态变更详情 =====');
        console.log('[AI双向系统] 命令数量:', gmResponse.tavern_commands.length);
        console.log('[AI双向系统] 检测到的变更数量:', stateChanges.changes.length);
        console.log('[AI双向系统] 变更详情:', JSON.stringify(stateChanges.changes, null, 2));
        console.log('[AI双向系统] beforeState 分片数:', Object.keys(beforeState).length);
        console.log('[AI双向系统] afterState 分片数:', Object.keys(afterState).length);
        console.log('[AI双向系统] ========================');

        // 通知状态变化
        if (options?.onStateChange && stateChanges.changes.length > 0) {
          options.onStateChange(afterState);
        }

      } catch (error) {
        console.error('[AI双向系统] 执行AI指令失败:', error);
        toast.warning(`部分指令执行失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // 5. 返回结果
    const finalText = gmResponse.text;
    options?.onStreamChunk?.(finalText);

    // 记录处理历史
    if (stateChanges) {
      this.stateHistory.push(stateChanges);
      if (this.stateHistory.length > 50) {
        this.stateHistory = this.stateHistory.slice(-30);
      }
    }

    return {
      finalContent: finalText,
      gmResponse: gmResponse,
      stateChanges: stateChanges
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
    userMessage: string
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
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 从命令生成状态变更日志
   */
  private generateStateChangeLogFromCommands(
    commands: any[],
    beforeState: PlainObject,
    afterState: PlainObject
  ): StateChangeLog {
    const changes: Array<{
      key: string;
      action: string;
      oldValue: unknown;
      newValue: unknown;
    }> = [];

    console.log('[状态变更] ===== 开始生成变更日志 =====');
    console.log('[状态变更] 总命令数:', commands.length);

    for (const cmd of commands) {
      if (!cmd || !cmd.action || !cmd.key) {
        console.log('[状态变更] ⚠️ 跳过无效命令:', cmd);
        continue;
      }

      const key = cmd.key;
      const action = cmd.action;
      const oldValue = this.getNestedValue(beforeState, key);
      const newValue = this.getNestedValue(afterState, key);

      console.log(`[状态变更] 检查命令: ${action} "${key}"`);
      console.log(`[状态变更]   oldValue:`, oldValue);
      console.log(`[状态变更]   newValue:`, newValue);

      // 只记录有变化的字段
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          key,
          action,
          oldValue,
          newValue
        });
        console.log(`[状态变更]   ✅ 检测到变更`);
      } else {
        console.log(`[状态变更]   ⏭️ 值未变化，跳过`);
      }
    }

    console.log('[状态变更] ===== 变更日志生成完成 =====');
    console.log('[状态变更] 最终变更数量:', changes.length);

    return {
      before: beforeState,
      after: afterState,
      changes,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 获取嵌套对象的值（支持新的分片格式）
   */
  private getNestedValue(obj: PlainObject, path: string): unknown {
    if (!obj || typeof obj !== 'object') return undefined;

    // 新的分片格式: 直接从顶层变量读取
    // 路径格式: "境界.名称", "属性.气血.当前", "背包_物品.天蚕羽衣.名称"
    // obj 结构: { '境界': {...}, '属性': {...}, '背包_物品': {...} }

    // 分片路径解析: "属性.气血.当前" -> ['属性', '气血', '当前']
    const parts = path.split('.');

    // 递归遍历路径
    let current: any = obj;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }
}

export const AIBidirectionalSystem = AIBidirectionalSystemClass;
