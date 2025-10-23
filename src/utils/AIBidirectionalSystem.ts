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
import type { GM_Response } from '@/types/AIGameMaster';
import type { CharacterProfile, StateChangeLog, SaveData, GameTime, StateChange, GameMessage, StatusEffect } from '@/types/game';
import { updateMasteredSkills } from './masteredSkillsCalculator';
import { DATA_STRUCTURE_DEFINITIONS } from './prompts/dataStructureDefinitions';
import { normalizeGameTime } from './time';

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
  ): Promise<GM_Response | null> {
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
      const stateForAI = cloneDeep(saveData);
      if (stateForAI.记忆) {
        // 移除短期和隐式中期记忆，以优化AI上下文
        delete stateForAI.记忆.短期记忆;
        delete stateForAI.记忆.隐式中期记忆;
      }
      // 移除叙事历史，避免与短期记忆重复
      if (stateForAI.叙事历史) delete stateForAI.叙事历史;
      // 移除只读字段（装备栏和掌握技能由系统自动计算）
      if (stateForAI.装备栏) (stateForAI as Partial<SaveData>).装备栏 = undefined;
      if (stateForAI.掌握技能) (stateForAI as Partial<SaveData>).掌握技能 = undefined;

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

      let coreStatusSummary = '# 角色核心状态速览 (请密切关注这些数值的变化)\n';
      if (playerStatus) {
        coreStatusSummary += `\n- **生命状态**:
  - 气血: ${playerStatus.气血?.当前 ?? '未知'} / ${playerStatus.气血?.上限 ?? '未知'}
  - 灵气: ${playerStatus.灵气?.当前 ?? '未知'} / ${playerStatus.灵气?.上限 ?? '未知'}
  - 神识: ${playerStatus.神识?.当前 ?? '未知'} / ${playerStatus.神识?.上限 ?? '未知'}
  - 寿元: ${playerStatus.寿命?.当前 ?? '未知'} / ${playerStatus.寿命?.上限 ?? '未知'}`;

        if (playerStatus.境界) {
          const realm = playerStatus.境界;
          coreStatusSummary += `\n- **境界状态**: ${realm.名称 || '无'} - ${realm.阶段 || '无'} (${realm.当前进度 ?? 0}/${realm.下一级所需 ?? '??'})`;
        }

        if (playerStatus.声望) {
          coreStatusSummary += `\n- **声望**: ${playerStatus.声望}`;
        }

        if (playerStatus.状态效果 && playerStatus.状态效果.length > 0) {
          coreStatusSummary += `\n- **状态效果**: ${playerStatus.状态效果.map((e: StatusEffect) => e.状态名称).join(', ')}`;
        } else {
          coreStatusSummary += `\n- **状态效果**: 无`;
        }
      }
      if (character?.天赋) {
        coreStatusSummary += `\n- **天赋神通**: ${formatTalentsForPrompt(character.天赋)}`;
      }
      // --- 结束 ---

      const stateJsonString = JSON.stringify(stateForAI);

      const systemPrompt = `
# 核心行为准则 (最高优先级)
1.  **尊重玩家意图**: 你的首要任务是响应玩家的行动和意图。如果玩家没有明确表示要离开当前地点或进行重大活动（如修炼、探索、战斗），你必须专注于当前场景的深度互动。
2.  **禁止主动推进**: 绝对不要主动提出离开当前场景的建议（例如"我们去xxx看看？"）。将剧情推进的决定权完全交给玩家。
3.  **丰富当前场景**: 当玩家选择"静止"（例如，只是对话、观察、思考）时，你应该通过细腻的环境描写、NPC的心理活动、更深入的对话选项来丰富当前的体验，而不是试图创造新的事件或转移地点。
4.  **被动响应**: 你的所有叙述和行动都应该是对玩家输入的直接或间接响应，而不是自发地创造新剧情。

${coreStatusSummary}

# 游戏状态
你正在修仙世界《大道朝天》中扮演GM。以下是当前完整游戏存档(JSON格式):
${stateJsonString}

下面是格式标准规则和命令生成教程参考（仔细查看，字段类型一定不能出错）：
${DATA_STRUCTURE_DEFINITIONS}
`.trim();

      const userActionForAI = (userMessage && userMessage.toString().trim()) || '继续当前活动';

      // 构建注入消息列表
      const injects: Array<{ content: string; role: 'system' | 'assistant'; depth: number; position: 'before' }> = [
        {
          content: systemPrompt,
          role: 'system',
          depth: 1,
          position: 'before',
        }
      ];

      // 如果有短期记忆，作为独立的 assistant 消息发送
      if (shortTermMemory.length > 0) {
        injects.push({
          content: `# 短期记忆\n${shortTermMemory.join('\n')}`,
          role: 'assistant',
          depth: 0,
          position: 'before',
        });
      }

      const response = await tavernHelper!.generate({
        user_input: userActionForAI,
        should_stream: options?.useStreaming || false,
        ...(options?.onStreamChunk ? { onStreamChunk: options.onStreamChunk } : {}),
        injects,
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
      // 使用 Raw 模式生成初始消息，跳过世界书和角色卡
      const response = await tavernHelper!.generateRaw({
        ordered_prompts: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        use_world_info: false,
        should_stream: options?.useStreaming || false,
        ...(options?.onStreamChunk ? { onStreamChunk: options.onStreamChunk } : {}),
      });

      gmResponse = this.parseAIResponse(String(response));
      if (!gmResponse || !gmResponse.text) {
        throw new Error('AI响应解析失败或为空');
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
    const saveData = cloneDeep(currentSaveData);
    const changes: StateChange[] = [];

    // 确保叙事历史数组存在
    if (!saveData.叙事历史) {
      saveData.叙事历史 = [];
    }

    if (response.text?.trim()) {
      const newNarrative = {
        type: 'gm' as const,
        role: 'assistant' as const,
        content: `${this._formatGameTime(saveData.游戏时间)}${response.text.trim()}`,
        time: this._formatGameTime(saveData.游戏时间)
      };
      saveData.叙事历史.push(newNarrative);
      changes.push({
        key: `叙事历史[${saveData.叙事历史.length - 1}]`,
        action: 'push',
        oldValue: undefined,
        newValue: cloneDeep(newNarrative)
      });
    }

    // 处理mid_term_memory：添加到隐式中期记忆
    if (response.mid_term_memory?.trim()) {
      if (!saveData.记忆) saveData.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [], 隐式中期记忆: [] };
      if (!saveData.记忆.隐式中期记忆) saveData.记忆.隐式中期记忆 = [];
      const timePrefix = this._formatGameTime(saveData.游戏时间);
      saveData.记忆.隐式中期记忆.push(`${timePrefix}${response.mid_term_memory.trim()}`);
    }

    if (!response.tavern_commands?.length) {
      return { saveData, stateChanges: { changes, timestamp: new Date().toISOString() } };
    }

    for (const command of response.tavern_commands) {
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

    if (!isInitialization) {
      const gameStateStore = useGameStateStore();
      gameStateStore.loadFromSaveData(saveData);
    }

    return { saveData, stateChanges: { changes, timestamp: new Date().toISOString() } };
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
        break;

      case 'add': {
        const currentValue = get(saveData, path, 0);
        if (typeof currentValue !== 'number' || typeof value !== 'number') {
          throw new Error(`ADD操作要求数值类型，但得到: ${typeof currentValue}, ${typeof value}`);
        }
        set(saveData, path, currentValue + value);
        break;
      }

      case 'push': {
        const array = get(saveData, path, []) as unknown[];
        if (!Array.isArray(array)) {
          throw new Error(`PUSH操作要求数组类型，但 ${path} 是 ${typeof array}`);
        }
        let valueToPush: unknown = value ?? null;
        // 当向记忆数组推送时，自动添加时间戳
        if (typeof valueToPush === 'string' && path.startsWith('记忆.')) {
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
