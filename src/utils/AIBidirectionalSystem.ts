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
import type { TavernHelper } from '@/types';
import { toast } from './toast';
import { useGameStateStore } from '@/stores/gameStateStore';
import type { GM_Response } from '@/types/AIGameMaster';
import type { CharacterProfile, StateChangeLog, SaveData, GameTime } from '@/types/game';
import { getRandomizedInGamePrompt } from './prompts/inGameGMPromptsV2';
import { applyEquipmentBonus, removeEquipmentBonus } from './equipmentBonusApplier';
import { updateMasteredSkills } from './masteredSkillsCalculator';

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

    // 2. 🔥 [新架构] 从 gameStateStore 获取当前存档数据
    options?.onProgressUpdate?.('从存档获取游戏状态…');
    const gameStateStore = useGameStateStore();
    const saveData = gameStateStore.getCurrentSaveData();

    if (!saveData) {
      throw new Error('无法获取存档数据，请确保角色已加载');
    }

    // 3. 🔥 [新架构] 直接构建 prompt 并调用 AI
    options?.onProgressUpdate?.('构建提示词并请求AI生成…');
    let gmResponse: GM_Response;

    try {
      const userActionForAI = (userMessage && userMessage.toString().trim()) || '继续当前活动';
      const systemPrompt = getRandomizedInGamePrompt(saveData);

      console.log('[AI请求] 系统提示词长度:', systemPrompt.length);
      console.log('[AI请求] 用户输入:', userActionForAI);

      const response = await tavernHelper!.generateRaw({
        ordered_prompts: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userActionForAI }
        ],
        should_stream: options?.useStreaming || false,
        use_world_info: false,
      });

      gmResponse = this.parseAIResponse(response);

      if (!gmResponse || !gmResponse.text) {
        throw new Error('AI生成器返回了无效的响应');
      }

    } catch (err) {
      console.error('[AI双向系统] AI生成失败:', err);
      toast.error('天机推演失败，请稍后重试。');
      throw (err instanceof Error ? err : new Error(String(err)));
    }

    // 4. 🔥 [新架构] 执行AI指令（如果有）
    let stateChanges: StateChangeLog | null = null;
    if (gmResponse.tavern_commands && gmResponse.tavern_commands.length > 0) {
      options?.onProgressUpdate?.('执行AI指令并更新游戏状态…');

      try {
        // 🔥 [新架构] processGmResponse 现在是本类的公共方法
        const processResult = await this.processGmResponse(gmResponse);
        const updatedSaveData = processResult.saveData;
        stateChanges = processResult.stateChanges;

        await gameStateStore.saveAfterConversation();
        console.log('[AI双向系统] ✅ 已将命令执行后的SaveData更新到Store并持久化（含上次对话备份）');

        if (options?.onStateChange && stateChanges.changes.length > 0) {
          options.onStateChange(updatedSaveData as unknown as PlainObject);
        }

      } catch (error) {
        console.error('[AI双向系统] 执行AI指令失败:', error);
        toast.warning(`部分指令执行失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // 5. 返回结果
    const finalText = gmResponse.text;
    options?.onStreamChunk?.(finalText);

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
   * 🔥 [新架构] 解析AI响应
   */
  private parseAIResponse(response: unknown): GM_Response {
    const tryParse = (text: string): any | null => {
      try { return JSON.parse(text); } catch (e) { return null; }
    };

    const standardize = (obj: any): GM_Response => {
      if (!obj || typeof obj !== 'object') return { text: '', tavern_commands: [] };
      const text = typeof obj.text === 'string' ? obj.text : '';
      const mid_term_memory = typeof obj.mid_term_memory === 'string' ? obj.mid_term_memory : undefined;
      const tavern_commands = Array.isArray(obj.tavern_commands)
        ? obj.tavern_commands.filter((c: any) => c && typeof c.action === 'string' && typeof c.key === 'string')
        : [];
      return { text, mid_term_memory, tavern_commands };
    };

    if (typeof response === 'string') {
      const rawText = response.trim();
      let parsedObj: any = null;
      parsedObj = tryParse(rawText);
      if (parsedObj) return standardize(parsedObj);
      const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (codeBlockMatch && codeBlockMatch[1]) {
        parsedObj = tryParse(codeBlockMatch[1].trim());
        if (parsedObj) return standardize(parsedObj);
      }
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const jsonCandidate = rawText.substring(firstBrace, lastBrace + 1);
        parsedObj = tryParse(jsonCandidate);
        if (parsedObj) {
          const standardizedObj = standardize(parsedObj);
          if (!standardizedObj.text) {
            standardizedObj.text = rawText.substring(0, firstBrace).trim();
          }
          return standardizedObj;
        }
      }
      return { text: rawText, tavern_commands: [] };
    }

    if (response && typeof response === 'object') {
      const obj = response as Record<string, any>;
      if (typeof obj.text === 'string' && (!obj.tavern_commands || obj.tavern_commands.length === 0)) {
        const nestedResponse = this.parseAIResponse(obj.text);
        if (nestedResponse.tavern_commands && nestedResponse.tavern_commands.length > 0) return nestedResponse;
      }
      return standardize(obj);
    }
    return { text: '', tavern_commands: [] };
  }

  /** @deprecated */
  private async captureCurrentState(): Promise<PlainObject> {
    console.warn('[AI双向系统] captureCurrentState 已废弃');
    return {};
  }
  /** @deprecated */
  private buildGameStateData(): PlainObject {
    console.warn('[AI双向系统] buildGameStateData 已废弃');
    return {};
  }
  /** @deprecated */
  private generateStateChangeLogFromCommands(): StateChangeLog {
    console.warn('[AI双向系统] generateStateChangeLogFromCommands 已废弃');
    return { changes: [] };
  }
  /** @deprecated */
  private getNestedValue(): unknown {
    console.warn('[AI双向系统] getNestedValue 已废弃');
    return undefined;
  }

  // =================================================================
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
    currentSaveData?: SaveData,
    isInitialization: boolean = false
  ): Promise<{ saveData: SaveData; stateChanges: StateChangeLog }> {
    const emptyChanges: StateChangeLog = { changes: [] };
    if (!currentSaveData) {
      const gameStateStore = useGameStateStore();
      currentSaveData = gameStateStore.toSaveData() || undefined;
    }
    if (!currentSaveData) {
      console.error('[AI双向系统:_processGmResponse] 无法获取当前存档数据，操作中止。');
      return { saveData: {} as SaveData, stateChanges: emptyChanges };
    }
    const { repairSaveData } = await import('@/utils/dataRepair');
    if (!response) {
      console.warn('[AI双向系统:_processGmResponse] 响应为空，返回原始数据');
      const repairedData = repairSaveData(currentSaveData);
      useGameStateStore().loadFromSaveData(repairedData);
      return { saveData: repairedData, stateChanges: emptyChanges };
    }

    const repairedCurrent = repairSaveData(currentSaveData);
    let updatedSaveData = cloneDeep(repairedCurrent);
    let stateChanges: StateChangeLog = emptyChanges;

    if (Array.isArray(response.tavern_commands) && response.tavern_commands.length > 0) {
      const result = await this._executeCommands(response.tavern_commands, updatedSaveData);
      updatedSaveData = result.saveData;
      stateChanges = result.stateChanges;

      const hasTimeUpdate = response.tavern_commands.some(cmd => cmd.key?.includes('游戏时间'));
      if (hasTimeUpdate) {
        const { updateLifespanFromGameTime, updateNpcLifespanFromGameTime } = await import('@/utils/lifespanCalculator');
        updateLifespanFromGameTime(updatedSaveData);
        const relations = updatedSaveData.人物关系 || {};
        const gameTime = updatedSaveData.游戏时间;
        if (gameTime) {
          for (const [, npcData] of Object.entries(relations)) {
            if (npcData && typeof npcData === 'object') {
              updateNpcLifespanFromGameTime(npcData, gameTime);
            }
          }
        }
      }
    }

    // 🔥 移除自动添加短期记忆的逻辑 - 由调用方统一处理，避免重复添加
    // if (isInitialization && response.text) {
    //   if (!updatedSaveData.记忆) updatedSaveData.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [], 隐式中期记忆: [] };
    //   if (!Array.isArray(updatedSaveData.记忆.短期记忆)) updatedSaveData.记忆.短期记忆 = [];
    //   const timePrefix = this._formatGameTime(updatedSaveData.游戏时间);
    //   updatedSaveData.记忆.短期记忆.push(`${timePrefix}${response.text}`);
    // }

    updatedSaveData = repairSaveData(updatedSaveData);
    useGameStateStore().loadFromSaveData(updatedSaveData);
    return { saveData: updatedSaveData, stateChanges };
  }

  private async _executeCommands(
    commands: { action: string; key: string; value?: unknown }[],
    saveData: SaveData
  ): Promise<{ saveData: SaveData; stateChanges: StateChangeLog }> {
    let updatedSaveData = cloneDeep(saveData);
    const changes: StateChangeLog['changes'] = [];
    for (const command of commands) {
      if (!command || !command.action || !command.key) continue;
      const { action, key } = command;
      const mappedPath = this._mapShardPathToSaveDataPath(key);
      const oldValue = cloneDeep(get(updatedSaveData, mappedPath));
      updatedSaveData = await this._executeCommand(command, updatedSaveData);
      const newValue = cloneDeep(get(updatedSaveData, mappedPath));
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ key: mappedPath, action, oldValue, newValue });
      }
    }
    return { saveData: updatedSaveData, stateChanges: { changes } };
  }

  // 🔥 [新架构] 移除路径映射，直接使用提示词中的完整路径
  // Pinia/gameStateStore 会自动处理路径解析
  private _mapShardPathToSaveDataPath(shardPath: string): string {
    // 直接返回原路径，不再进行映射
    return shardPath;
  }

  private async _executeCommand(command: { action: string; key: string; value?: unknown }, saveData: SaveData): Promise<SaveData> {
    const gameStateStore = useGameStateStore();
    if (!command || !command.action || !command.key) return saveData;
    const { action, key, value } = command;
    const path = this._mapShardPathToSaveDataPath(key);

    try {
      const { interceptRealmBreakthroughCommand } = await import('./judgement/heavenlyRules');
      if (!interceptRealmBreakthroughCommand(command, saveData).allowed) return saveData;

      // 🔥 [新架构] 不再需要路径映射，直接使用提示词中的路径
      // gameStateStore会自动处理路径解析

      let oldEquipmentItemId: string | null = null;
      if (action === 'set' && path.startsWith('装备栏.装备')) {
        oldEquipmentItemId = get(saveData, path) as string | null;
      }

      switch (action) {
        case 'set':
          set(saveData, path, value); // 更新 saveData 对象
          gameStateStore.updateState(path, value); // 同步更新 store

          // 🔥 [坐标同步] 当设置经纬度坐标时,自动计算并更新 x/y 虚拟坐标
          if (path === '玩家角色状态.位置.longitude' || path === '玩家角色状态.位置.latitude') {
            const location = get(saveData, '玩家角色状态.位置');
            if (location && typeof location === 'object') {
              const loc = location as any;
              if (loc.longitude !== undefined && loc.latitude !== undefined) {
                const worldInfo = get(saveData, '世界信息') as any;
                const mapConfig = worldInfo?.地图配置;

                // 坐标转换逻辑(复制自 WorldMapPanel.vue geoToVirtual 函数)
                let worldMinLng = 100.0, worldMaxLng = 130.0;
                let worldMinLat = 25.0, worldMaxLat = 45.0;
                const mapWidth = 3600, mapHeight = 2400;

                if (mapConfig) {
                  worldMinLng = mapConfig.minLng;
                  worldMaxLng = mapConfig.maxLng;
                  worldMinLat = mapConfig.minLat;
                  worldMaxLat = mapConfig.maxLat;
                }

                const clampedLng = Math.max(worldMinLng, Math.min(worldMaxLng, loc.longitude));
                const clampedLat = Math.max(worldMinLat, Math.min(worldMaxLat, loc.latitude));

                const x = ((clampedLng - worldMinLng) / (worldMaxLng - worldMinLng)) * (mapWidth * 0.85) + (mapWidth * 0.075);
                const y = ((worldMaxLat - clampedLat) / (worldMaxLat - worldMinLat)) * (mapHeight * 0.85) + (mapHeight * 0.075);

                loc.x = x;
                loc.y = y;
                set(saveData, '玩家角色状态.位置', loc);
                gameStateStore.updateState('玩家角色状态.位置', loc);

                console.log(`[坐标同步] 经纬度(${clampedLng.toFixed(2)}, ${clampedLat.toFixed(2)}) -> 虚拟坐标(${x.toFixed(1)}, ${y.toFixed(1)})`);
              }
            }
          }
          if (path.startsWith('三千大道.大道列表.')) {
            const daoName = path.split('.')[2];
            const daoData = get(saveData, `三千大道.大道列表.${daoName}`);
            if (daoData && typeof daoData === 'object') (daoData as any).是否解锁 = true;
          }
          if (String(path).includes('背包.物品.') && String(path).endsWith('.修炼进度')) {
            updateMasteredSkills(saveData);
          }
          if (path.startsWith('装备栏.装备')) {
            const newItemId = String(value || '');
            if (oldEquipmentItemId && oldEquipmentItemId !== newItemId) removeEquipmentBonus(saveData, oldEquipmentItemId);
            if (newItemId && newItemId !== oldEquipmentItemId) applyEquipmentBonus(saveData, newItemId);
          }
          break;
        case 'add':
          if (path.endsWith('游戏时间.分钟')) {
            const time = get(saveData, '游戏时间', { 年: 1, 月: 1, 日: 1, 小时: 0, 分钟: 0 }) as GameTime;
            const totalMinutes = time.分钟 + Number(value || 0);
            const totalHours = time.小时 + Math.floor(totalMinutes / 60);
            time.分钟 = totalMinutes % 60;
            const totalDays = time.日 + Math.floor(totalHours / 24);
            time.小时 = totalHours % 24;
            const totalMonths = time.月 + Math.floor((totalDays - 1) / 30);
            time.日 = ((totalDays - 1) % 30) + 1;
            time.年 += Math.floor((totalMonths - 1) / 12);
            time.月 = ((totalMonths - 1) % 12) + 1;
            set(saveData, '游戏时间', time); // 更新 saveData
            gameStateStore.updateState('游戏时间', time); // 同步更新 store
            const { updateStatusEffects } = await import('./statusEffectManager');
            updateStatusEffects(saveData);
          } else {
            const currentValue = get(saveData, path, 0);
            const newValue = Number(currentValue) + Number(value || 0);
            set(saveData, path, newValue); // 更新 saveData
            gameStateStore.updateState(path, newValue); // 同步更新 store
            if (String(path).includes('背包.物品.') && String(path).endsWith('.修炼进度')) {
              updateMasteredSkills(saveData);
            }
          }
          break;
        case 'push':
          const array = get(saveData, path, []) as unknown[];
          array.push(value ?? null);
          if (!get(saveData, path)) set(saveData, path, array);
          break;
        case 'delete':
          unset(saveData, path);
          break;
      }
    } catch (error) {
      console.error(`[AI双向系统:_executeCommand] 命令执行失败:`, error);
    }
    return saveData;
  }
}

export const AIBidirectionalSystem = AIBidirectionalSystemClass;
export { getTavernHelper };