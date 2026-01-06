import { defineStore } from 'pinia';
import { set, get, cloneDeep } from 'lodash';
import type {
  CharacterBaseInfo,
  PlayerAttributes,
  PlayerLocation,
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
  SectMemberInfo,
  SectSystemV2,
  StatusEffect,
} from '@/types/game';
import { calculateFinalAttributes } from '@/utils/attributeCalculation';
import { isTavernEnv } from '@/utils/tavern';
import { ensureSystemConfigHasNsfw } from '@/utils/nsfw';
import { isSaveDataV3, migrateSaveDataToLatest } from '@/utils/saveMigration';

function buildTechniqueProgress(inventory: Inventory | null) {
  const progress: Record<string, { 熟练度: number; 已解锁技能: string[] }> = {};
  const items = inventory?.物品 || {};

  Object.values(items).forEach((item: any) => {
    if (item?.类型 !== '功法') return;
    const itemId = item.物品ID;
    if (!itemId) return;
    progress[itemId] = {
      熟练度: Number(item.修炼进度 ?? item.熟练度 ?? 0),
      已解锁技能: Array.isArray(item.已解锁技能) ? item.已解锁技能 : []
    };
  });

  return progress;
}

// 定义各个模块的接口
interface GameState {
  // --- V3 元数据/系统字段（随存档保存）---
  saveMeta: any | null;
  onlineState: any | null;
  userSettings: any | null;

  character: CharacterBaseInfo | null;
  attributes: PlayerAttributes | null;
  location: PlayerLocation | null;
  inventory: Inventory | null;
  equipment: Equipment | null;
  relationships: Record<string, NpcProfile> | null;
  worldInfo: WorldInfo | null;
  sectSystem: SectSystemV2 | null;
  sectMemberInfo: SectMemberInfo | null;
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
  // 修炼模块（完整结构）
  cultivation: any | null;
  // 功法模块（进度/套装）
  techniqueSystem: any | null;
  // 技能模块（掌握技能/冷却）
  skillState: any | null;
  // 效果（buff/debuff数组）
  effects: StatusEffect[] | null;
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
    saveMeta: null,
    onlineState: null,
    userSettings: null,

    character: null,
    attributes: null,
    location: null,
    inventory: null,
    equipment: null,
    relationships: null,
    worldInfo: null,
    sectSystem: null,
    sectMemberInfo: null,
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
    cultivation: null,
    techniqueSystem: null,
    skillState: null,
    effects: [],
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
      const v3 = (isSaveDataV3(saveData) ? saveData : migrateSaveDataToLatest(saveData).migrated) as any;

      const deepCopy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

      // V3 保存的元数据/联机/设置也读入到 store（用于后续保存回写）
      this.saveMeta = v3?.元数据 ? deepCopy(v3.元数据) : null;
      this.onlineState = v3?.系统?.联机 ? deepCopy(v3.系统.联机) : null;
      this.userSettings = v3?.系统?.设置 ? deepCopy(v3.系统.设置) : null;
      const normalizeQualitySuffix = (obj: any, field: string) => {
        if (!obj || typeof obj !== 'object') return;

        const raw = obj[field];
        if (raw == null) return;

        if (typeof raw === 'string') {
          if (raw && !raw.endsWith('品')) obj[field] = `${raw}品`;
          return;
        }

        if (typeof raw === 'object') {
          const qualityName = String((raw as any).quality ?? (raw as any).品质 ?? (raw as any).品阶 ?? '');
          if (!qualityName) return;
          obj[field] = qualityName.endsWith('品') ? qualityName : `${qualityName}品`;
        }
      };

      const character: CharacterBaseInfo | null = v3?.角色?.身份 ? deepCopy(v3.角色.身份) : null;
      const attributes: PlayerAttributes | null = v3?.角色?.属性 ? deepCopy(v3.角色.属性) : null;
      const location: PlayerLocation | null = v3?.角色?.位置 ? deepCopy(v3.角色.位置) : null;
      const inventory: Inventory | null = v3?.角色?.背包 ? deepCopy(v3.角色.背包) : null;
      const equipment: Equipment | null = v3?.角色?.装备 ? deepCopy(v3.角色.装备) : null;
      const relationships: Record<string, NpcProfile> | null = v3?.社交?.关系 ? deepCopy(v3.社交.关系) : null;
      const worldInfo: WorldInfo | null = v3?.世界?.信息 ? deepCopy(v3.世界.信息) : null;
      const sectSystem: SectSystemV2 | null = v3?.社交?.宗门 ? deepCopy(v3.社交.宗门) : null;
      const sectMemberInfo: SectMemberInfo | null = (v3?.社交?.宗门 as any)?.成员信息 ? deepCopy((v3.社交.宗门 as any).成员信息) : null;
      const memory: Memory | null = v3?.社交?.记忆 ? deepCopy(v3.社交.记忆) : null;
      const gameTime: GameTime | null = v3?.元数据?.时间 ? deepCopy(v3.元数据.时间) : null;

      const narrativeHistory: GameMessage[] = Array.isArray(v3?.系统?.历史?.叙事) ? deepCopy(v3.系统.历史.叙事) : [];

      const daoSystem = v3?.角色?.大道 ? deepCopy(v3.角色.大道) : null;
      const questSystem: QuestSystem | null = v3?.社交?.任务 ? deepCopy(v3.社交.任务) : null;
      const cultivation = v3?.角色?.修炼 ? deepCopy(v3.角色.修炼) : null;
      const techniqueSystem = v3?.角色?.功法 ? deepCopy(v3.角色.功法) : null;
      const skillState = v3?.角色?.技能 ? deepCopy(v3.角色.技能) : null;

      const effects: StatusEffect[] = Array.isArray(v3?.角色?.效果) ? deepCopy(v3.角色.效果) : [];

      const systemConfig = v3?.系统?.配置 ? deepCopy(v3.系统.配置) : null;
      const bodyPartDevelopment =
        (v3?.角色?.身体 as any)?.部位开发 ? deepCopy((v3.角色.身体 as any).部位开发) : null;

      // 基础模块
      this.character = character;
      this.attributes = attributes;
      this.location = location;

      // 灵根/境界品质字段容错（AI偶尔会返回 {quality,grade} 结构）
      if (this.character?.灵根 && typeof this.character.灵根 === 'object') {
        normalizeQualitySuffix(this.character.灵根 as any, 'tier');
      }
      if (this.attributes?.境界 && typeof this.attributes.境界 === 'object') {
        normalizeQualitySuffix(this.attributes.境界 as any, '品质');
        normalizeQualitySuffix(this.attributes.境界 as any, '品阶');
      }

      this.inventory = inventory;
      this.equipment = equipment;
      this.relationships = relationships;
      this.worldInfo = worldInfo;
      this.sectSystem = sectSystem;
      this.sectMemberInfo = sectMemberInfo;
      this.memory = memory;
      this.gameTime = gameTime;
      this.narrativeHistory = narrativeHistory;

      // 系统模块
      this.thousandDao = daoSystem ? deepCopy(daoSystem) : null;
      this.questSystem = questSystem
        ? deepCopy(questSystem)
        : {
            配置: {
              启用系统任务: false,
              系统任务类型: '修仙辅助系统',
              系统任务提示词: '',
              自动刷新: false,
              默认任务数量: 3,
            },
            当前任务列表: [],
            任务统计: {
              完成总数: 0,
              各类型完成: {} as Record<QuestType, number>,
            },
          };

      this.cultivation = cultivation ? deepCopy(cultivation) : null;
      this.cultivationTechnique = (this.cultivation as any)?.修炼功法 ?? null;

      this.techniqueSystem = techniqueSystem ? deepCopy(techniqueSystem) : null;
      this.skillState = skillState ? deepCopy(skillState) : null;
      this.masteredSkills = (this.skillState as any)?.掌握技能
        ? deepCopy((this.skillState as any).掌握技能)
        : deepCopy((v3?.系统?.缓存?.掌握技能 ?? []) as any);

      this.effects = Array.isArray(effects) ? deepCopy(effects) : [];
      this.systemConfig = systemConfig ? deepCopy(systemConfig) : null;
      if (isTavernEnv() && this.systemConfig) {
        this.systemConfig = ensureSystemConfigHasNsfw(this.systemConfig) as any;
      }
      this.bodyPartDevelopment = bodyPartDevelopment ? deepCopy(bodyPartDevelopment) : null;

      // 兜底：旧存档可能没有模块对象
      if (!this.skillState) {
        this.skillState = {
          掌握技能: this.masteredSkills ?? [],
          装备栏: [],
          冷却: {},
        } as any;
      }

      if (!this.cultivation) {
        this.cultivation = { 修炼功法: this.cultivationTechnique ?? null } as any;
      }

      this.isGameLoaded = true;
    },

    /**
     * 将当前 state 转换为 SaveData 对象
     * @returns 完整的存档数据
     */
    toSaveData(): SaveData | null {
      if (!this.character || !this.attributes || !this.location || !this.inventory || !this.relationships || !this.memory || !this.gameTime || !this.equipment) {
        return null;
      }

      const deepCopy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

      const techniqueProgress = buildTechniqueProgress(this.inventory);
      const currentTechniqueId = (this.cultivationTechnique as any)?.物品ID ?? null;

      const techniqueSystem = {
        ...(this.techniqueSystem || {}),
        当前功法ID: (this.techniqueSystem as any)?.当前功法ID ?? currentTechniqueId,
        功法进度: (this.techniqueSystem as any)?.功法进度 ?? techniqueProgress,
        功法套装: (this.techniqueSystem as any)?.功法套装 ?? { 主修: null, 辅修: [] },
      } as any;

      const skillState = {
        ...(this.skillState || {}),
        掌握技能: (this.skillState as any)?.掌握技能 ?? this.masteredSkills ?? [],
        装备栏: (this.skillState as any)?.装备栏 ?? [],
        冷却: (this.skillState as any)?.冷却 ?? {},
      } as any;

      const cultivation = {
        ...(this.cultivation || {}),
        修炼功法: (this.cultivation as any)?.修炼功法 ?? this.cultivationTechnique ?? null,
      } as any;

      const nowIso = new Date().toISOString();
      const meta = {
        ...(this.saveMeta || {}),
        版本号: 3,
        存档ID: (this.saveMeta as any)?.存档ID ?? `save_${Date.now()}`,
        存档名: (this.saveMeta as any)?.存档名 ?? '自动存档',
        游戏版本: (this.saveMeta as any)?.游戏版本,
        创建时间: (this.saveMeta as any)?.创建时间 ?? nowIso,
        更新时间: nowIso,
        游戏时长秒: Number((this.saveMeta as any)?.游戏时长秒 ?? 0),
        时间: this.gameTime,
      };

      const daoNormalized =
        this.thousandDao && typeof this.thousandDao === 'object' && (this.thousandDao as any).大道列表
          ? this.thousandDao
          : { 大道列表: {} };

      const sectNormalized =
        this.sectSystem || this.sectMemberInfo
          ? { ...(this.sectSystem || {}), ...(this.sectMemberInfo ? { 成员信息: this.sectMemberInfo } : {}) }
          : null;

      const settings =
        this.userSettings ?? {
          timeBasedSaveEnabled: this.timeBasedSaveEnabled,
          timeBasedSaveInterval: this.timeBasedSaveInterval,
          conversationAutoSaveEnabled: this.conversationAutoSaveEnabled,
        };

      const online =
        this.onlineState ?? { 模式: '单机', 房间ID: null, 玩家ID: null, 只读路径: ['世界'], 世界曝光: false, 冲突策略: '服务器' };

      const v3: any = {
        元数据: meta,
        角色: {
          身份: this.character,
          属性: this.attributes,
          位置: this.location,
          效果: this.effects ?? [],
          身体: this.bodyPartDevelopment ? { 部位开发: this.bodyPartDevelopment } : undefined,
          背包: this.inventory,
          装备: this.equipment,
          功法: techniqueSystem,
          修炼: cultivation,
          大道: daoNormalized,
          技能: skillState,
        },
        社交: {
          关系: this.relationships ?? {},
          宗门: sectNormalized,
          任务: this.questSystem,
          记忆: this.memory,
        },
        世界: { 信息: this.worldInfo ?? {}, 状态: {} },
        系统: {
          配置: this.systemConfig ?? {},
          设置: settings,
          缓存: { 掌握技能: this.masteredSkills ?? (skillState as any)?.掌握技能 ?? [] },
          历史: { 叙事: this.narrativeHistory || [] },
          扩展: {},
          联机: online,
        },
      };

      // 动态计算后天六司（装备/天赋加成）
      try {
        const calculatedAttrs = calculateFinalAttributes((this.character as any).先天六司, v3 as any);

        const updatedCharacter = {
          ...this.character,
          后天六司: calculatedAttrs.后天六司,
        };

        console.log('[toSaveData] 后天六司(动态计算):', calculatedAttrs.后天六司);

        return deepCopy({ ...v3, 角色: { ...v3.角色, 身份: updatedCharacter } } as any);
      } catch (error) {
        console.error('[toSaveData] 动态计算后天六司失败，回退为原始数据:', error);
        return deepCopy(v3 as any);
      }
    },

    /**
     * 更新玩家属性（动态数值）
     * @param updates 部分属性对象
     */
    updatePlayerStatus(updates: Partial<PlayerAttributes>) {
      if (this.attributes) {
        this.attributes = { ...this.attributes, ...(updates as any) };
      }
    },

    updateLocation(updates: Partial<PlayerLocation>) {
      if (this.location) {
        this.location = { ...this.location, ...(updates as any) };
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
      this.saveMeta = null;
      this.onlineState = null;
      this.userSettings = null;
      this.character = null;
      this.attributes = null;
      this.location = null;
      this.inventory = null;
      this.equipment = null;
      this.relationships = null;
      this.worldInfo = null;
      this.sectSystem = null;
      this.sectMemberInfo = null;
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
      this.cultivation = null;
      this.techniqueSystem = null;
      this.skillState = null;
      this.effects = [];
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

      // 2. 注意："上次对话"备份已移至 MainGamePanel.sendMessage() 的开始处（发送消息前）
      // 这样回滚时才能恢复到对话前的状态

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
