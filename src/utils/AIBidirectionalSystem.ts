/**
 * AIBidirectionalSystem (重构整合版)
 *
 * 核心功能：
 * 1. 接收用户输入
 * 2. 构建Prompt，调用AI生成响应
 * 3. 解析AI响应，执行AI返回的指令 (逻辑已从AIGameMaster.ts迁移至此)
 * 4. 返回结果
 */

// 🔥 [新架构] 移除对 AIGameMaster 的依赖，整合其核心功能
import { set, get, unset, cloneDeep } from 'lodash';
import { getTavernHelper } from '@/utils/tavern';
import { toast } from './toast';
import { useGameStateStore } from '@/stores/gameStateStore';
import type { GM_Response } from '@/types/AIGameMaster';
import type { CharacterProfile, StateChangeLog, SaveData, GameTime, StateChange } from '@/types/game';
import { updateMasteredSkills } from './masteredSkillsCalculator';
import { DATA_STRUCTURE_DEFINITIONS } from './prompts/dataStructureDefinitions';

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
    options?: ProcessOptions
  ): Promise<GM_Response> {
    const gameStateStore = useGameStateStore();
    const tavernHelper = getTavernHelper();

    if (!tavernHelper) {
      throw new Error('TavernHelper 未初始化，请检查配置');
    }

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
      // 1. 准备完整的游戏状态作为上下文，并移除短期记忆
      const stateForAI = cloneDeep(saveData);
      if (stateForAI.记忆) {
        // 移除短期记忆，因为它会通过另一种方式（最近发生的事件）提供
        if (stateForAI.记忆.短期记忆) {
          delete stateForAI.记忆.短期记忆;
        }
        // 移除隐式中期记忆，因为它仅供系统内部使用，不应干扰AI判断
        if (stateForAI.记忆.隐式中期记忆) {
          delete stateForAI.记忆.隐式中期记忆;
        }
      }
      // 🔥 优化：移除JSON格式化中的空格和换行，以节省大量Token
      const stateJsonString = JSON.stringify(stateForAI);

      const systemPrompt = `
# 游戏状态
你正在修仙世界《大道朝天》中扮演GM。以下是当前完整游戏存档(JSON格式):
${stateJsonString}
---
${DATA_STRUCTURE_DEFINITIONS}
`.trim();

      // 2. 准备用户输入 (已移除短期记忆注入)
      const userActionForAI = (userMessage && userMessage.toString().trim()) || '继续当前活动';
      console.log('[AI请求] 系统提示词长度:', systemPrompt.length);
      console.log('[AI请求] 用户输入长度:', userActionForAI.length);

      // 🔥 架构优化：切换到标准的 generate 方法，并使用 injects 注入动态系统提示
      const response = await tavernHelper!.generate({
        user_input: userActionForAI,
        should_stream: options?.useStreaming || false,
        injects: [
          {
            // 将完整的游戏存档作为高优先级的系统提示注入
            content: systemPrompt,
            role: 'system',
            // 确保它在上下文中处于一个较高的位置
            depth: 1,
            // 🔥 修复：使用 'before' 将其置于主系统提示之前
            position: 'before',
          }
        ],
        // 让酒馆正常使用世界书等功能
        // use_world_info: true, // generate 方法不直接接受此参数，但默认会使用
      });

      gmResponse = this.parseAIResponse(response);
      if (!gmResponse || !gmResponse.text) {
        throw new Error('AI响应解析失败或为空');
      }
    } catch (error) {
      console.error('[AI双向系统] AI生成失败:', error);
      throw new Error(`AI生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    // 3. 执行AI指令
    options?.onProgressUpdate?.('执行AI指令…');
    try {
      const updatedSaveData = await this.processGmResponse(gmResponse, saveData);
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
      const response = await tavernHelper!.generate({
        user_input: userPrompt,
        should_stream: options?.useStreaming || false,
        injects: [
          {
            content: systemPrompt,
            role: 'system',
            depth: 1,
            position: 'before',
          }
        ],
      });

      gmResponse = this.parseAIResponse(response);
      if (!gmResponse || !gmResponse.text) {
        throw new Error('AI响应解析失败或为空');
      }
      return gmResponse;
    } catch (error) {
      console.error('[AI双向系统] 初始消息生成失败:', error);
      throw new Error(`初始消息生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 以下函数从 AIGameMaster.ts 迁移而来，作为内部实现，以消除对旧文件的依赖
  // =================================================================
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
    const saveData = cloneDeep(currentSaveData);
    const changes: StateChange[] = [];

    if (!response.tavern_commands || response.tavern_commands.length === 0) {
      console.warn('[AI双向系统] 没有需要执行的指令');
      return { saveData, stateChanges: { changes: [] } };
    }

    console.log(`[AI双向系统] 开始执行 ${response.tavern_commands.length} 条指令`);

    for (let i = 0; i < response.tavern_commands.length; i++) {
      const command = response.tavern_commands[i];
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
        console.log(`[AI双向系统] 指令 ${i + 1}/${response.tavern_commands.length} 执行成功:`, command);
      } catch (error) {
        console.error(`[AI双向系统] 指令 ${i + 1} 执行失败:`, command, error);
        toast.error(`指令执行失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    // 🔥 新增：自动更新掌握技能
    updateMasteredSkills(saveData);

    if (!isInitialization) {
      const gameStateStore = useGameStateStore();
      // 保存更新后的数据到 gameStateStore
      gameStateStore.loadFromSaveData(saveData);
    }

    const stateChanges: StateChangeLog = {
      changes,
      timestamp: new Date().toISOString()
    };

    return { saveData, stateChanges };
  }

  private executeCommand(command: { action: string; key: string; value?: unknown }, saveData: SaveData): void {
    const { action, key, value } = command;

    if (!action || !key) {
      throw new Error('指令格式错误：缺少 action 或 key');
    }

    const path = key.toString();

    switch (action) {
      case 'set':
        set(saveData, path, value);
        console.log(`[AI双向系统] SET: ${path} = `, value);
        break;

      case 'add':
        const currentValue = get(saveData, path, 0);
        if (typeof currentValue !== 'number' || typeof value !== 'number') {
          throw new Error(`ADD操作要求数值类型，但得到: ${typeof currentValue}, ${typeof value}`);
        }
        const newValue = currentValue + value;
        set(saveData, path, newValue);
        console.log(`[AI双向系统] ADD: ${path} ${currentValue} + ${value} = ${newValue}`);
        break;

      case 'push': {
        const array = get(saveData, path, []) as unknown[];
        if (!Array.isArray(array)) {
          throw new Error(`PUSH操作要求数组类型，但 ${path} 是 ${typeof array}`);
        }
        let valueToPush: unknown = value ?? null;
        // 🔥 修复：当向任何记忆数组推送时，自动添加时间戳
        if (typeof valueToPush === 'string' && path.endsWith('.记忆')) {
          // 🔥 新增检查：只有在记忆内容非空时才添加
          if (!valueToPush.trim()) {
            console.warn(`[AI双向系统] 检测到空的记忆推送，已跳过。路径: ${path}`);
            break; // 跳出 switch case，不执行 push
          }
          const timePrefix = this._formatGameTime(saveData.游戏时间);
          valueToPush = `${timePrefix}${valueToPush}`;
        }
        array.push(valueToPush);
        if (!get(saveData, path)) {
          set(saveData, path, array);
        }
        console.log(`[AI双向系统] PUSH: ${path} <- `, valueToPush);
        break;
      }

      case 'delete':
        unset(saveData, path);
        console.log(`[AI双向系统] DELETE: ${path}`);
        break;

      default:
        throw new Error(`未知的操作类型: ${action}`);
    }
  }

  private parseAIResponse(rawResponse: string): GM_Response {
    if (!rawResponse || typeof rawResponse !== 'string') {
      throw new Error('AI响应为空或格式错误');
    }

    const rawText = rawResponse.trim();

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
        scope: cmd.scope || 'global' as const,
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

    // 尝试提取JSON对象
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedObj = tryParse(jsonMatch[0]);
      if (parsedObj) return standardize(parsedObj);
    }

    throw new Error('无法解析AI响应为有效的JSON格式');
  }
}

export const AIBidirectionalSystem = AIBidirectionalSystemClass.getInstance();

// 导出 getTavernHelper 以供其他模块使用
export { getTavernHelper };
