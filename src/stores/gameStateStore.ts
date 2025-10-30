import { defineStore } from 'pinia';
import { set, get, cloneDeep } from 'lodash';
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
  QuestType,
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

  // 三千大道系统
  thousandDao: any | null;
  // 任务系统
  questSystem: QuestSystem;
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

  // 对话后自动存档配置
  conversationAutoSaveEnabled: boolean; // 是否启用对话后自动存档
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
    narrativeHistory: [],
    isGameLoaded: false,

    // 其他游戏系统
    thousandDao: null,
    questSystem: {
      配置: {
        启用系统任务: false,
        系统任务类型: '修仙辅助系统',
        系统任务提示词: '',
        自动刷新: false,
        默认任务数量: 3
      },
      当前任务列表: [],
      任务统计: {
        完成总数: 0,
        各类型完成: {} as Record<QuestType, number>
      }
    },
    cultivationTechnique: null,
    masteredSkills: null,
    systemConfig: null,
    bodyPartDevelopment: null,

    // 时间点存档配置（默认关闭，用户可在设置中开启）
    timeBasedSaveEnabled: false,
    timeBasedSaveInterval: 10, // 默认10分钟
    lastTimeBasedSave: null,

    // 对话后自动存档配置（默认开启）
    conversationAutoSaveEnabled: true,
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
      // 🔥 修复：使用深拷贝确保嵌套对象（如境界）不会被引用污染
      this.character = saveData.角色基础信息 ? JSON.parse(JSON.stringify(saveData.角色基础信息)) : null;
      this.playerStatus = saveData.玩家角色状态 ? JSON.parse(JSON.stringify(saveData.玩家角色状态)) : null;

      // 🔥 自动修复灵根品级格式
      if (this.character?.灵根 && typeof this.character.灵根 === 'object') {
        const 灵根 = this.character.灵根 as any;
        if (灵根.品级 && typeof 灵根.品级 === 'object') {
          const qualityObj = 灵根.品级;
          let qualityName = qualityObj.quality || '';
          if (qualityName && !qualityName.endsWith('品')) {
            qualityName = `${qualityName}品`;
          }
          灵根.品级 = qualityName;
          console.log('[GameState] 修复角色灵根品级格式');
        }
      }

      if (this.playerStatus) {
        const playerStatusAny = this.playerStatus as any;
        if (playerStatusAny.灵根 && typeof playerStatusAny.灵根 === 'object') {
          const 灵根 = playerStatusAny.灵根;
          if (灵根.品级 && typeof 灵根.品级 === 'object') {
            const qualityObj = 灵根.品级;
            let qualityName = qualityObj.quality || '';
            if (qualityName && !qualityName.endsWith('品')) {
              qualityName = `${qualityName}品`;
            }
            灵根.品级 = qualityName;
            console.log('[GameState] 修复玩家状态灵根品级格式');
          }
        }
      }

      // 确保角色基础信息和玩家角色状态中的灵根、出生保持同步
      if (this.character && this.playerStatus) {
        if (this.character.灵根) (this.playerStatus as any).灵根 = this.character.灵根;
        if (this.character.出生) (this.playerStatus as any).出生 = this.character.出生;
      }

      // 🔥 深拷贝嵌套对象以保持响应式
      this.inventory = saveData.背包 ? JSON.parse(JSON.stringify(saveData.背包)) : null;
      this.equipment = saveData.装备栏 ? JSON.parse(JSON.stringify(saveData.装备栏)) : null;
      this.relationships = saveData.人物关系 ? JSON.parse(JSON.stringify(saveData.人物关系)) : null;
      this.worldInfo = saveData.世界信息 ? JSON.parse(JSON.stringify(saveData.世界信息)) : null;
      this.memory = saveData.记忆 ? JSON.parse(JSON.stringify(saveData.记忆)) : null;
      this.gameTime = saveData.游戏时间 ? { ...saveData.游戏时间 } : null;
      this.narrativeHistory = saveData.叙事历史 ? [...saveData.叙事历史] : [];

      // 加载其他系统数据
      this.thousandDao = saveData.三千大道 ? JSON.parse(JSON.stringify(saveData.三千大道)) : null;
      this.questSystem = saveData.任务系统 ? JSON.parse(JSON.stringify(saveData.任务系统)) : {
        配置: {
          启用系统任务: false,
          系统任务类型: '修仙辅助系统',
          系统任务提示词: '',
          自动刷新: false,
          默认任务数量: 3
        },
        当前任务列表: [],
        任务统计: {
          完成总数: 0,
          各类型完成: {} as Record<QuestType, number>
        }
      };
      this.cultivationTechnique = saveData.修炼功法 ? JSON.parse(JSON.stringify(saveData.修炼功法)) : null;
      this.masteredSkills = saveData.掌握技能 ? JSON.parse(JSON.stringify(saveData.掌握技能)) : [];
      this.systemConfig = saveData.系统 ? JSON.parse(JSON.stringify(saveData.系统)) : null;
      this.bodyPartDevelopment = saveData.身体部位开发 ? JSON.parse(JSON.stringify(saveData.身体部位开发)) : null;

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

      // 🔥 使用深拷贝确保返回的数据是独立的，防止引用污染
      return JSON.parse(JSON.stringify({
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
        任务系统: this.questSystem || {
          配置: {
            启用系统任务: false,
            系统任务类型: '修仙辅助系统',
            系统任务提示词: '',
            自动刷新: false,
            默认任务数量: 3
          },
          当前任务列表: [],
          任务统计: {
            完成总数: 0,
            各类型完成: {} as Record<QuestType, number>
          }
        },
        修炼功法: this.cultivationTechnique || null,
        掌握技能: this.masteredSkills || [],
        系统: this.systemConfig || undefined,
        叙事历史: this.narrativeHistory || [],
        身体部位开发: this.bodyPartDevelopment || undefined
      }));
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
      this.narrativeHistory = [];
      this.isGameLoaded = false;

      // 重置其他系统数据
      this.thousandDao = null;
      this.questSystem = {
        配置: {
          启用系统任务: false,
          系统任务类型: '修仙辅助系统',
          系统任务提示词: '',
          自动刷新: false,
          默认任务数量: 3
        },
        当前任务列表: [],
        任务统计: {
          完成总数: 0,
          各类型完成: {} as Record<QuestType, number>
        }
      };
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

      // 2. 如果启用了对话后自动存档，则保存到 "上次对话" 存档槽
      if (this.conversationAutoSaveEnabled) {
        await characterStore.saveToSlot('上次对话');
        console.log('[GameState] Saved to "上次对话" slot');
      }

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
     * 启用/禁用对话后自动存档
     * @param enabled 是否启用
     */
    setConversationAutoSaveEnabled(enabled: boolean) {
      this.conversationAutoSaveEnabled = enabled;
      console.log(`[GameState] Conversation auto save ${enabled ? 'enabled' : 'disabled'}`);
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
      console.log(`[诊断-updateState] 开始更新路径: ${path}`)
      console.log(`[诊断-updateState] 要设置的值:`, value)

      // 🔥 核心修复：使用Vue 3的响应式更新方式
      const parts = path.split('.');
      const rootKey = parts[0];

      console.log(`[诊断-updateState] rootKey:`, rootKey)
      console.log(`[诊断-updateState] 路径部分:`, parts)

      // 对于顶层属性，直接设置(这会触发响应式)
      if (parts.length === 1) {
        (this as any)[rootKey] = value;
        console.log(`[诊断-updateState] 顶层属性直接设置完成`)
        return;
      }

      // 🔥 关键修复：对于嵌套属性，使用Pinia的$patch方法
      // 这确保了Vue 3能够正确追踪响应式变化
      const currentRoot = (this as any)[rootKey];
      console.log(`[诊断-updateState] 当前rootKey的值:`, currentRoot)

      if (currentRoot && typeof currentRoot === 'object') {
        // 🔥 使用cloneDeep创建深拷贝，保持对象结构
        const clonedRoot = cloneDeep(currentRoot);
        console.log(`[诊断-updateState] 深拷贝后的clonedRoot:`, clonedRoot)

        // 使用 lodash set 修改副本
        const nestedPath = parts.slice(1).join('.');
        console.log(`[诊断-updateState] 嵌套路径:`, nestedPath);
        console.log(`[诊断-updateState] set前的value类型:`, typeof value, 'value:', value);
        set(clonedRoot, nestedPath, value);
        console.log(`[诊断-updateState] lodash set后的clonedRoot:`, clonedRoot);
        console.log(`[诊断-updateState] set后检查实际值:`, get(clonedRoot, nestedPath));

        // 🔥 关键：使用$patch替换整个对象，确保响应式追踪
        this.$patch({
          [rootKey]: clonedRoot
        });
        console.log(`[诊断-updateState] 已通过$patch更新root对象`)
        console.log(`[gameStateStore] ✅ 已更新 ${path} = ${JSON.stringify(value).substring(0, 100)}`);
      } else {
        console.log(`[诊断-updateState] currentRoot不是对象，直接设置`)
        // 对于非对象类型，直接使用set
        set(this, path, value);
      }
    },

    /**
     * 添加内容到短期记忆
     */
    addToShortTermMemory(content: string) {
      if (!this.memory) {
        this.memory = { 短期记忆: [], 中期记忆: [], 长期记忆: [], 隐式中期记忆: [] };
      }
      if (!Array.isArray(this.memory.短期记忆)) {
        this.memory.短期记忆 = [];
      }
      if (!Array.isArray(this.memory.中期记忆)) {
        this.memory.中期记忆 = [];
      }
      if (!Array.isArray(this.memory.隐式中期记忆)) {
        this.memory.隐式中期记忆 = [];
      }

      // 添加时间前缀（使用"仙道"与其他地方保持一致）
      const gameTime = this.gameTime;
      const minutes = gameTime?.分钟 ?? 0;
      const timePrefix = gameTime
        ? `【仙道${gameTime.年}年${gameTime.月}月${gameTime.日}日 ${String(gameTime.小时).padStart(2, '0')}:${String(minutes).padStart(2, '0')}】`
        : '【未知时间】';

      const hasTimePrefix = content.startsWith('【仙道') || content.startsWith('【未知时间】') || content.startsWith('【仙历');
      const finalContent = hasTimePrefix ? content : `${timePrefix}${content}`;

      this.memory.短期记忆.unshift(finalContent); // 最新的在前
      this.memory.隐式中期记忆.unshift(finalContent); // 同步添加到隐式中期记忆

      // 检查溢出，从localStorage读取配置
      const maxShortTerm = (() => {
        try {
          const settings = localStorage.getItem('memory-settings');
          return settings ? JSON.parse(settings).maxShortTerm || 3 : 3;
        } catch { return 3; }
      })();

      while (this.memory.短期记忆.length > maxShortTerm) {
        this.memory.短期记忆.pop(); // 移除最旧的
        const implicit = this.memory.隐式中期记忆.pop();
        if (implicit && !this.memory.中期记忆.includes(implicit)) {
          this.memory.中期记忆.push(implicit);
          console.log('[gameStateStore] ✅ 短期记忆溢出，已转移到中期记忆');
        }
      }

      console.log('[gameStateStore] ✅ 已添加到短期记忆', finalContent.substring(0, 50) + '...');
    }
  },
});
