import { defineStore } from 'pinia';
import { set } from 'lodash';
import type {
  CharacterBaseInfo,
  PlayerStatus,
  Inventory,
  NpcProfile,
  WorldInfo,
  Memory,
  GameTime,
  SaveData,
  Equipment,
  GameMessage,
  QuestSystem,
} from '@/types/game';

// 定义各个模块的接口
interface GameState {
  character: CharacterBaseInfo | null;
  playerStatus: PlayerStatus | null;
  inventory: Inventory | null;
  equipment: Equipment | null;
  relationships: Record<string, NpcProfile> | null;
  worldInfo: WorldInfo | null;
  memory: Memory | null;
  gameTime: GameTime | null;
  narrativeHistory: GameMessage[] | null;
  isGameLoaded: boolean;
  任务系统: QuestSystem | null;

  // 三千大道系统
  thousandDao: any | null;
  // 宗门系统
  sectSystem: any | null;
  // 穿越者系统
  transmigratorSystem: any | null;
  // 系统任务
  systemTasks: any | null;
  // 修炼功法
  cultivationTechnique: any | null;
  // 掌握技能
  masteredSkills: any[] | null;
  // 系统配置
  systemConfig: any | null;
  // 身体部位开发
  bodyPartDevelopment: Record<string, any> | null;

  // 时间点存档配置
  timeBasedSaveEnabled: boolean; // 是否启用时间点存档
  timeBasedSaveInterval: number; // 时间点存档间隔（分钟）
  lastTimeBasedSave: number | null; // 上次时间点存档的时间戳
}

export const useGameStateStore = defineStore('gameState', {
  state: (): GameState => ({
    character: null,
    playerStatus: null,
    inventory: null,
    equipment: null,
    relationships: null,
    worldInfo: null,
    memory: null,
    gameTime: null,
    narrativeHistory: null,
    isGameLoaded: false,
    任务系统: null,

    // 其他游戏系统
    thousandDao: null,
    sectSystem: null,
    transmigratorSystem: null,
    systemTasks: null,
    cultivationTechnique: null,
    masteredSkills: null,
    systemConfig: null,
    bodyPartDevelopment: null,

    // 时间点存档配置（默认关闭，用户可在设置中开启）
    timeBasedSaveEnabled: false,
    timeBasedSaveInterval: 10, // 默认10分钟
    lastTimeBasedSave: null,
  }),

  actions: {
    /**
     * 从 IndexedDB 加载游戏存档到 Pinia Store
     * @param characterId 角色ID
     * @param saveSlot 存档槽位名称
     */
    async loadGame(characterId: string, saveSlot: string) {
      console.log(`[GameState] Loading game for character ${characterId}, slot ${saveSlot}`);

      // 从 characterStore 获取存档数据
      const { useCharacterStore } = await import('./characterStore');
      const characterStore = useCharacterStore();

      const profile = characterStore.rootState.角色列表[characterId];
      if (!profile) {
        console.error(`[GameState] Character ${characterId} not found`);
        return;
      }

      // 新架构：从 characterStore 加载存档数据，它会处理从 IndexedDB 读取的逻辑
      const saveData = await characterStore.loadSaveData(characterId, saveSlot);

      if (saveData) {
        this.loadFromSaveData(saveData);
        console.log('[GameState] Game loaded successfully');
      } else {
        console.error(`[GameState] No save data found for character ${characterId}, slot ${saveSlot}`);
      }
    },

    /**
     * 将当前 Pinia Store 中的游戏状态保存到 IndexedDB
     */
    async saveGame() {
      if (!this.isGameLoaded) {
        console.warn('[GameState] Game not loaded, skipping save.');
        return;
      }

      console.log('[GameState] Saving game state...');

      // 通过 characterStore 的 saveCurrentGame 来保存
      const { useCharacterStore } = await import('./characterStore');
      const characterStore = useCharacterStore();

      await characterStore.saveCurrentGame();
      console.log('[GameState] Game saved successfully');
    },

    /**
     * 从 SaveData 对象加载状态
     * @param saveData 完整的存档数据
     */
    loadFromSaveData(saveData: SaveData) {
      this.character = saveData.角色基础信息;
      this.playerStatus = saveData.玩家角色状态;
      this.inventory = saveData.背包;
      this.equipment = saveData.装备栏;
      this.relationships = saveData.人物关系;
      this.worldInfo = saveData.世界信息 || null;
      this.memory = saveData.记忆;
      this.gameTime = saveData.游戏时间;
      this.narrativeHistory = saveData.叙事历史 || [];
      this.任务系统 = saveData.任务系统;

      // 加载其他系统数据
      this.thousandDao = saveData.三千大道 || null;
      this.sectSystem = saveData.宗门系统 || null;
      this.transmigratorSystem = saveData.穿越者系统 || null;
      this.systemTasks = saveData.系统任务 || null;
      this.cultivationTechnique = saveData.修炼功法 || null;
      this.masteredSkills = saveData.掌握技能 || [];
      this.systemConfig = saveData.系统 || null;
      this.bodyPartDevelopment = saveData.身体部位开发 || null;

      this.isGameLoaded = true;
    },

    /**
     * 将当前 state 转换为 SaveData 对象
     * @returns 完整的存档数据
     */
    toSaveData(): SaveData | null {
      if (!this.character || !this.playerStatus || !this.inventory || !this.relationships || !this.memory || !this.gameTime || !this.equipment) {
        return null;
      }

      return {
        角色基础信息: this.character,
        玩家角色状态: this.playerStatus,
        背包: this.inventory,
        装备栏: this.equipment,
        人物关系: this.relationships,
        记忆: this.memory,
        游戏时间: this.gameTime,
        世界信息: this.worldInfo || undefined,

        // 其他系统数据
        三千大道: this.thousandDao || { 大道列表: {} },
        宗门系统: this.sectSystem || { availableSects: [], sectRelationships: {}, sectHistory: [] },
        穿越者系统: this.transmigratorSystem || undefined,
        系统任务: this.systemTasks || undefined,
        修炼功法: this.cultivationTechnique || null,
        掌握技能: this.masteredSkills || [],
        系统: this.systemConfig || undefined,
        叙事历史: this.narrativeHistory || [],
        身体部位开发: this.bodyPartDevelopment || undefined,
        任务系统: this.任务系统 || { 当前任务列表: [], 已完成任务: [], 任务统计: { 完成总数: 0, 主线完成: 0, 支线完成: 0 } },
      };
    },

    /**
     * 更新玩家状态
     * @param updates 部分 PlayerStatus 对象
     */
    updatePlayerStatus(updates: Partial<PlayerStatus>) {
      if (this.playerStatus) {
        this.playerStatus = { ...this.playerStatus, ...updates };
      }
    },

    /**
     * 更新背包
     * @param updates 部分 Inventory 对象
     */
    updateInventory(updates: Partial<Inventory>) {
      if (this.inventory) {
        this.inventory = { ...this.inventory, ...updates };
      }
    },

    /**
     * 更新特定NPC的人物关系
     * @param npcName NPC名字
     * @param updates 部分 NpcProfile 对象
     */
    updateRelationship(npcName: string, updates: Partial<NpcProfile>) {
      if (this.relationships && this.relationships[npcName]) {
        this.relationships[npcName] = { ...this.relationships[npcName], ...updates };
      }
    },

    /**
     * 推进游戏时间
     * @param minutes 要推进的分钟数
     */
    advanceGameTime(minutes: number) {
      if (this.gameTime) {
        // 实现时间推进逻辑，处理进位
        this.gameTime.分钟 += minutes;

        // 处理小时进位
        if (this.gameTime.分钟 >= 60) {
          const hours = Math.floor(this.gameTime.分钟 / 60);
          this.gameTime.分钟 = this.gameTime.分钟 % 60;
          this.gameTime.小时 += hours;
        }

        // 处理天进位（注意：GameTime 使用"日"而非"天"）
        if (this.gameTime.小时 >= 24) {
          const days = Math.floor(this.gameTime.小时 / 24);
          this.gameTime.小时 = this.gameTime.小时 % 24;
          this.gameTime.日 += days;
        }

        // 处理月进位（假设每月30天）
        if (this.gameTime.日 > 30) {
          const months = Math.floor((this.gameTime.日 - 1) / 30);
          this.gameTime.日 = ((this.gameTime.日 - 1) % 30) + 1;
          this.gameTime.月 += months;
        }

        // 处理年进位
        if (this.gameTime.月 > 12) {
          const years = Math.floor((this.gameTime.月 - 1) / 12);
          this.gameTime.月 = ((this.gameTime.月 - 1) % 12) + 1;
          this.gameTime.年 += years;
        }
      }
    },

    /**
     * 重置游戏状态
     */
    resetState() {
      this.character = null;
      this.playerStatus = null;
      this.inventory = null;
      this.equipment = null;
      this.relationships = null;
      this.worldInfo = null;
      this.memory = null;
      this.gameTime = null;
      this.narrativeHistory = null;
      this.isGameLoaded = false;
      this.任务系统 = null;

      // 重置其他系统数据
      this.thousandDao = null;
      this.sectSystem = null;
      this.transmigratorSystem = null;
      this.systemTasks = null;
      this.cultivationTechnique = null;
      this.masteredSkills = null;
      this.systemConfig = null;
      this.bodyPartDevelopment = null;

      console.log('[GameState] State has been reset');
    },

    /**
     * 在对话后保存（保存到当前激活存档 + "上次对话"存档）
     * 这是主要的保存机制，每次AI对话后自动调用
     */
    async saveAfterConversation() {
      if (!this.isGameLoaded) {
        console.warn('[GameState] Game not loaded, skipping save');
        return;
      }

      console.log('[GameState] Saving after conversation...');

      const { useCharacterStore } = await import('./characterStore');
      const characterStore = useCharacterStore();

      // 新架构：委托给 characterStore 处理保存逻辑
      // 1. 保存到当前激活的存档
      await characterStore.saveCurrentGame();

      // 2. 同时保存到 "上次对话" 存档槽
      await characterStore.saveToSlot('上次对话');

      console.log('[GameState] Saved to current slot and "上次对话"');

      // 3. 检查是否需要创建时间点存档
      await this.checkAndCreateTimeBasedSave();
    },

    /**
     * 检查并覆盖时间点存档（固定存档槽位，按间隔覆盖）
     */
    async checkAndCreateTimeBasedSave() {
      if (!this.timeBasedSaveEnabled) {
        return;
      }

      const now = Date.now();
      const intervalMs = this.timeBasedSaveInterval * 60 * 1000;

      // 如果距离上次时间点存档还没到间隔，跳过
      if (this.lastTimeBasedSave && (now - this.lastTimeBasedSave < intervalMs)) {
        return;
      }

      console.log('[GameState] Updating time-based save slot...');

      const { useCharacterStore } = await import('./characterStore');
      const characterStore = useCharacterStore();

      // 新架构：委托给 characterStore 处理
      await characterStore.saveToSlot('时间点存档');
      this.lastTimeBasedSave = now;
      console.log('[GameState] Time-based save slot updated: 时间点存档');
    },

    /**
     * 在返回道途前保存
     */
    async saveBeforeExit() {
      if (!this.isGameLoaded) {
        return;
      }

      console.log('[GameState] Saving before exit...');
      await this.saveGame();
    },

    /**
     * 设置时间点存档间隔
     * @param minutes 间隔分钟数
     */
    setTimeBasedSaveInterval(minutes: number) {
      if (minutes < 1) {
        console.warn('[GameState] Invalid interval, must be at least 1 minute');
        return;
      }
      this.timeBasedSaveInterval = minutes;
      console.log(`[GameState] Time-based save interval set to ${minutes} minutes`);
    },

    /**
     * 启用/禁用时间点存档
     * @param enabled 是否启用
     */
    setTimeBasedSaveEnabled(enabled: boolean) {
      this.timeBasedSaveEnabled = enabled;
      console.log(`[GameState] Time-based save ${enabled ? 'enabled' : 'disabled'}`);
    },

    /**
     * 获取当前存档数据
     * @returns 当前的 SaveData 或 null
     */
    getCurrentSaveData(): SaveData | null {
      return this.toSaveData();
    },

    /**
     * 通用状态更新方法
     * @param path 状态路径
     * @param value 要设置的值
     */
    updateState(path: string, value: any) {
      set(this, path, value);
    },
  },
});
