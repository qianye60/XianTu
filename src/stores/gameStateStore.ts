/**
 * 仙途 (XianTu) - 游戏状态管理
 * @author 千夜 | GitHub: qianye60 | Bilibili: 477576651
 * @license CC BY-NC-SA 4.0 - 商业使用需授权
 */
import { defineStore } from 'pinia';
import { set, get, cloneDeep } from 'lodash';
import type {
  CharacterBaseInfo,
  PlayerAttributes,
  PlayerLocation,
  Inventory,
  NpcProfile,
  WorldInfo,
  WorldFaction,
  Memory,
  GameTime,
  SaveData,
  Equipment,
  GameMessage,
  EventSystem,
  SectMemberInfo,
  SectSystemV2,
  StatusEffect,
} from '@/types/game';
import { calculateFinalAttributes } from '@/utils/attributeCalculation';
import { isTavernEnv } from '@/utils/tavern';
import { ensureSystemConfigHasNsfw } from '@/utils/nsfw';
import { isSaveDataV3, migrateSaveDataToLatest } from '@/utils/saveMigration';
import { normalizeInventoryCurrencies } from '@/utils/currencySystem';
import { detectPlayerSectLeadership } from '@/utils/sectLeadershipUtils';

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

function normalizeRelationshipMatrixV3(raw: unknown, npcNames: string[]): any | null {
  const names = (Array.isArray(npcNames) ? npcNames : [])
    .map((n) => (typeof n === 'string' ? n.trim() : ''))
    .filter(Boolean);

  const ensureBase = (): any => ({
    version: 1,
    nodes: Array.from(new Set(names)).slice(0, 300),
    edges: [],
  });

  if (raw == null) {
    // 没有任何 NPC 时不强制生成该字段（保持可选）
    return names.length > 0 ? ensureBase() : null;
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) return ensureBase();

  const matrix: any = raw as any;

  const nodes = Array.isArray(matrix.nodes)
    ? matrix.nodes
        .map((n: any) => (typeof n === 'string' ? n.trim() : ''))
        .filter(Boolean)
    : [];
  const mergedNodes = Array.from(new Set([...nodes, ...names])).slice(0, 300);

  const edgesRaw = Array.isArray(matrix.edges) ? matrix.edges : [];
  const seen = new Set<string>();
  const edges: any[] = [];
  for (const e of edgesRaw) {
    if (!e || typeof e !== 'object') continue;
    const from = typeof (e as any).from === 'string' ? (e as any).from.trim() : '';
    const to = typeof (e as any).to === 'string' ? (e as any).to.trim() : '';
    if (!from || !to || from === to) continue;

    // 以无向边去重（UI 也是按无向合并）
    const a = from < to ? from : to;
    const b = from < to ? to : from;
    const key = `${a}::${b}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const relation = typeof (e as any).relation === 'string' ? (e as any).relation : undefined;
    const score = typeof (e as any).score === 'number' && Number.isFinite((e as any).score) ? (e as any).score : undefined;
    const tags = Array.isArray((e as any).tags)
      ? (e as any).tags.filter((t: any) => typeof t === 'string' && t.trim()).slice(0, 12)
      : undefined;
    const updatedAt = typeof (e as any).updatedAt === 'string' ? (e as any).updatedAt : undefined;

    edges.push({ from, to, relation, score, tags, updatedAt });
    if (edges.length >= 2000) break;
  }

  return {
    version: typeof matrix.version === 'number' && Number.isFinite(matrix.version) ? matrix.version : 1,
    nodes: mergedNodes.length ? mergedNodes : Array.from(new Set(names)).slice(0, 300),
    edges,
  };
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
  /**
   * NPC-NPC 关系网（可选）。
   * 之前该字段未落入 store，会导致 AI 写入的 `社交.关系矩阵` 在 UI/保存时丢失。
   */
  relationshipMatrix: any | null;
  worldInfo: WorldInfo | null;
  sectSystem: SectSystemV2 | null;
  sectMemberInfo: SectMemberInfo | null;
  memory: Memory | null;
  gameTime: GameTime | null;
  narrativeHistory: GameMessage[] | null;
  isGameLoaded: boolean;

  // 三千大道系统
  thousandDao: any | null;
  // 事件系统
  eventSystem: EventSystem;
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
  // 角色.身体（完整对象，包含酒馆端扩展字段）
  body: Record<string, any> | null;
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
    relationshipMatrix: null,
    worldInfo: null,
    sectSystem: null,
    sectMemberInfo: null,
    memory: null,
    gameTime: null,
    narrativeHistory: [],
    isGameLoaded: false,

    // 其他游戏系统
    thousandDao: null,
    eventSystem: {
      配置: {
        启用随机事件: true,
        最小间隔年: 1,
        最大间隔年: 10,
        事件提示词: '',
      },
      下次事件时间: null,
      事件记录: [],
    },
    cultivationTechnique: null,
    cultivation: null,
    techniqueSystem: null,
    skillState: null,
    effects: [],
    masteredSkills: null,
    systemConfig: null,
    body: null,
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
      if (location && (this.onlineState as any)?.模式 === '联机') {
        delete (location as any).x;
        delete (location as any).y;
      }
      const inventory: Inventory | null = v3?.角色?.背包 ? deepCopy(v3.角色.背包) : null;
      const equipment: Equipment | null = v3?.角色?.装备 ? deepCopy(v3.角色.装备) : null;
      const relationships: Record<string, NpcProfile> | null = v3?.社交?.关系 ? deepCopy(v3.社交.关系) : null;
      const relationshipMatrix = normalizeRelationshipMatrixV3(v3?.社交?.关系矩阵, Object.keys(relationships || {}));
      const worldInfo: WorldInfo | null = v3?.世界?.信息 ? deepCopy(v3.世界.信息) : null;
      const sectSystem: SectSystemV2 | null = v3?.社交?.宗门 ? deepCopy(v3.社交.宗门) : null;
      let sectMemberInfo: SectMemberInfo | null = (v3?.社交?.宗门 as any)?.成员信息 ? deepCopy((v3.社交.宗门 as any).成员信息) : null;

      // 🔥 兜底：若玩家在“宗门档案领导层”中被识别为高层，但存档缺失 成员信息，则在 store 中补齐一份（仅用于 UI/保存时回写）
      try {
        if (!sectMemberInfo) {
          const playerNameForDetect = String((character as any)?.名字 || '').trim();
          const factions = (worldInfo?.势力信息 || []) as WorldFaction[];
          const leader = detectPlayerSectLeadership(playerNameForDetect, factions, null);

          const sectNameCandidate = String((sectSystem as any)?.当前宗门 || leader.sectName || '').trim();
          if (sectNameCandidate) {
            const sectProfile = factions.find((s) => String((s as any)?.名称 || '').trim() === sectNameCandidate) ?? null;
            sectMemberInfo = {
              宗门名称: sectNameCandidate,
              宗门类型: ((sectProfile as any)?.类型 as any) || '修仙宗门',
              职位: leader.position || '外门弟子',
              贡献: 0,
              关系: '友好',
              声望: 0,
              加入日期: new Date().toISOString(),
              描述: ((sectProfile as any)?.描述 as any) || '',
            } as any;
          }
        }
      } catch (e) {
        console.warn('[gameStateStore.loadFromSaveData] 自动补齐 sectMemberInfo 失败（非致命）:', e);
      }
      const coerceMemoryArray = (value: unknown): string[] => {
        if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
        if (typeof value === 'string' && value.trim().length > 0) return [value.trim()];
        return [];
      };
      const memoryCandidate: any = v3?.社交?.记忆 ? deepCopy(v3.社交.记忆) : {};
      const memory: Memory = {
        短期记忆: coerceMemoryArray(memoryCandidate?.短期记忆),
        中期记忆: coerceMemoryArray(memoryCandidate?.中期记忆),
        长期记忆: coerceMemoryArray(memoryCandidate?.长期记忆),
        隐式中期记忆: coerceMemoryArray(memoryCandidate?.隐式中期记忆),
      };
      const gameTime: GameTime | null = v3?.元数据?.时间 ? deepCopy(v3.元数据.时间) : null;

      const narrativeHistory: GameMessage[] = Array.isArray(v3?.系统?.历史?.叙事) ? deepCopy(v3.系统.历史.叙事) : [];

      const daoSystem = v3?.角色?.大道 ? deepCopy(v3.角色.大道) : null;
      const eventSystem: EventSystem | null = v3?.社交?.事件 ? deepCopy(v3.社交.事件) : null;
      const cultivation = v3?.角色?.修炼 ? deepCopy(v3.角色.修炼) : null;
      const techniqueSystem = v3?.角色?.功法 ? deepCopy(v3.角色.功法) : null;
      const skillState = v3?.角色?.技能 ? deepCopy(v3.角色.技能) : null;

      const effects: StatusEffect[] = Array.isArray(v3?.角色?.效果) ? deepCopy(v3.角色.效果) : [];

      const systemConfig = v3?.系统?.配置 ? deepCopy(v3.系统.配置) : null;

      const body = v3?.角色?.身体 ? deepCopy(v3.角色.身体) : null;
      let bodyPartDevelopment =
        body && typeof body === 'object' && (body as any).部位开发 ? deepCopy((body as any).部位开发) : null;

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
      // 兼容旧存档/旧字段：确保货币系统已迁移（避免打开背包卡死/显示异常）
      normalizeInventoryCurrencies(this.inventory);
      this.equipment = equipment;
      this.relationships = relationships;
      this.relationshipMatrix = relationshipMatrix;
      this.worldInfo = worldInfo;
      this.sectSystem = sectSystem;
      this.sectMemberInfo = sectMemberInfo;
      this.memory = memory;
      this.gameTime = gameTime;
      this.narrativeHistory = narrativeHistory;

      // 系统模块
      this.thousandDao = daoSystem ? deepCopy(daoSystem) : null;
      this.eventSystem = eventSystem
        ? deepCopy(eventSystem)
        : {
            配置: {
              启用随机事件: true,
              最小间隔年: 1,
              最大间隔年: 10,
              事件提示词: '',
            },
            下次事件时间: null,
            事件记录: [],
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

      // Tavern 兜底：即使存档没带“角色.身体”，也保证 UI/变量面板有可写路径
      if (isTavernEnv()) {
        const bodyObj: Record<string, any> =
          body && typeof body === 'object' ? deepCopy(body) : {};
        if (bodyObj.部位 === undefined) bodyObj.部位 = {};
        if (bodyObj.部位开发 === undefined) bodyObj.部位开发 = bodyPartDevelopment ?? {};
        bodyPartDevelopment = bodyObj.部位开发 ?? bodyPartDevelopment;
        this.body = bodyObj;
      } else {
        this.body = body && typeof body === 'object' ? deepCopy(body) : null;
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
      // 🔥 详细的数据检查和日志输出，帮助诊断联机模式下的问题
      const missingFields: string[] = [];
      if (!this.character) missingFields.push('character');
      if (!this.attributes) missingFields.push('attributes');
      if (!this.location) missingFields.push('location');
      if (!this.inventory) missingFields.push('inventory');
      if (!this.relationships) missingFields.push('relationships');
      if (!this.memory) missingFields.push('memory');
      if (!this.gameTime) missingFields.push('gameTime');
      if (!this.equipment) missingFields.push('equipment');

      if (missingFields.length > 0) {
        console.error('[gameStateStore.toSaveData] 存档数据不完整，缺少以下字段:', missingFields.join(', '));
        console.error('[gameStateStore.toSaveData] 联机状态:', this.onlineState);
        console.error('[gameStateStore.toSaveData] 游戏是否已加载:', this.isGameLoaded);
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

      const location = deepCopy(this.location);
      if (location && (online as any)?.模式 === '联机') {
        delete (location as any).x;
        delete (location as any).y;
      }

      const body = (() => {
        const baseBody: Record<string, any> =
          this.body && typeof this.body === 'object' ? deepCopy(this.body) : {};

        if (this.bodyPartDevelopment && typeof this.bodyPartDevelopment === 'object') {
          baseBody.部位开发 = deepCopy(this.bodyPartDevelopment);
        }

        if (isTavernEnv()) {
          if (baseBody.部位 === undefined) baseBody.部位 = {};
          if (baseBody.部位开发 === undefined) baseBody.部位开发 = {};
        }

        return Object.keys(baseBody).length > 0 ? baseBody : undefined;
      })();

      const v3: any = {
        元数据: meta,
        角色: {
          身份: this.character,
          属性: this.attributes,
          位置: location,
          效果: this.effects ?? [],
          身体: body,
          背包: this.inventory,
          装备: this.equipment,
          功法: techniqueSystem,
          修炼: cultivation,
          大道: daoNormalized,
          技能: skillState,
        },
        社交: {
          关系: this.relationships ?? {},
          关系矩阵: this.relationshipMatrix ?? undefined,
          宗门: sectNormalized,
          事件: this.eventSystem,
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
      // 注意：这里不能将计算后的"后天六司"（总值）保存回 character.后天六司（基值），
      // 否则会导致下次加载时重复叠加天赋/装备加成（基值被污染为总值，再算一遍加成）。
      // character.后天六司 应该只存储永久性的消耗品加成。
      // 天赋/装备加成应在运行时动态计算，不落盘到该字段。

      return deepCopy(v3 as any);
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
      this.eventSystem = {
        配置: {
          启用随机事件: true,
          最小间隔年: 1,
          最大间隔年: 10,
          事件提示词: '',
        },
        下次事件时间: null,
        事件记录: [],
      };
      this.cultivationTechnique = null;
      this.cultivation = null;
      this.techniqueSystem = null;
      this.skillState = null;
      this.effects = [];
      this.masteredSkills = null;
      this.systemConfig = null;
      this.body = null;
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

      // 与 AIBidirectionalSystem / 主面板显示保持一致：使用 push，最新的在末尾
      this.memory.短期记忆.push(finalContent);
      this.memory.隐式中期记忆.push(finalContent); // 同步添加到隐式中期记忆（用于“短期->中期”过渡）

      // 检查溢出，从localStorage读取配置
      const maxShortTerm = (() => {
        try {
          const settings = localStorage.getItem('memory-settings');
          if (!settings) return 5;
          const parsed = JSON.parse(settings);
          const limit = typeof parsed.shortTermLimit === 'number' && parsed.shortTermLimit > 0
            ? parsed.shortTermLimit
            : (typeof parsed.maxShortTerm === 'number' && parsed.maxShortTerm > 0 ? parsed.maxShortTerm : 5);
          return limit;
        } catch { return 5; }
      })();

      while (this.memory.短期记忆.length > maxShortTerm) {
        // 移除最旧的（第一个）
        this.memory.短期记忆.shift();
        const implicit = this.memory.隐式中期记忆.shift();
        if (implicit && !this.memory.中期记忆.includes(implicit)) {
          this.memory.中期记忆.push(implicit);
          console.log('[gameStateStore] ✅ 短期记忆溢出，已转移到中期记忆');
        }
      }

      console.log('[gameStateStore] ✅ 已添加到短期记忆', finalContent.substring(0, 50) + '...');
    },

    // ─── 区域地图操作 ───────────────────────────────────────────────────────────

    /**
     * 根据地点标识查询已生成的区域地图
     * @param locationId WorldLocation 的名称或 id
     */
    getRegionMap(locationId: string) {
      const maps = (this.worldInfo as any)?.区域地图 as import('@/types/gameMap').RegionMap[] | undefined;
      return maps?.find((m) => m.linkedLocationId === locationId) ?? null;
    },

    /**
     * 保存（新增或更新）一张区域地图到 worldInfo
     * @param map 完整的 RegionMap 对象
     */
    saveRegionMap(map: import('@/types/gameMap').RegionMap) {
      if (!this.worldInfo) return;
      const worldInfo = this.worldInfo as any;
      if (!Array.isArray(worldInfo.区域地图)) {
        worldInfo.区域地图 = [];
      }
      const idx = (worldInfo.区域地图 as any[]).findIndex(
        (m: any) => m.linkedLocationId === map.linkedLocationId
      );
      if (idx >= 0) {
        worldInfo.区域地图[idx] = map;
      } else {
        worldInfo.区域地图.push(map);
      }
    },

    /**
     * 玩家进入区域：更新位置中的 regionId / buildingId
     * @param regionId  区域地图 ID
     * @param buildingId 初始落点建筑 ID（通常为入口建筑）
     */
    enterRegion(regionId: string, buildingId: string) {
      if (!this.location) return;
      this.location = { ...this.location, regionId, buildingId } as any;
      console.log(`[gameStateStore] ✅ 进入区域: ${regionId} / 建筑: ${buildingId}`);
    },

    /**
     * 玩家离开区域：清除位置中的 regionId / buildingId，恢复世界地图状态
     */
    leaveRegion() {
      if (!this.location) return;
      const loc = { ...this.location } as any;
      delete loc.regionId;
      delete loc.buildingId;
      this.location = loc;
      console.log('[gameStateStore] ✅ 已离开区域，返回世界地图');
    },
  },
});
