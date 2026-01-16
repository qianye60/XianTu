import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type {
  World,
  TalentTier,
  Origin,
  SpiritRoot,
  Talent,
  DADCustomData,
} from '../types';
import { aiService } from '@/services/aiService';
// Import the Tavern helper to interact with Tavern's variable system
import { getTavernHelper, getCurrentCharacterName } from '../utils/tavern';
import { fetchWorlds, fetchTalentTiers, fetchOrigins, fetchSpiritRoots, fetchTalents } from '../services/request';
import {
  LOCAL_WORLDS,
  LOCAL_TALENT_TIERS,
  LOCAL_ORIGINS,
  LOCAL_SPIRIT_ROOTS,
  LOCAL_TALENTS,
} from '../data/creationData';

// =======================================================================
//                           本地类型定义
// =======================================================================

export type AttributeKey = 'root_bone' | 'spirituality' | 'comprehension' | 'fortune' | 'charm' | 'temperament';

export interface CharacterCreationPayload {
  character_name: string;
  gender: string;
  race: string;
  world_id: number | '';
  talent_tier_id: number | '';
  current_age: number;
  root_bone: number;
  spirituality: number;
  comprehension: number;
  fortune: number;
  charm: number;
  temperament: number;
  origin_id: number | null;
  spirit_root_id: number | null;
  selected_talent_ids: number[];
}

type DataSource = 'local' | 'cloud';
type WorldWithSource = World & { source: DataSource };
type TalentTierWithSource = TalentTier & { source: DataSource };
type OriginWithSource = Origin & { source: DataSource };
type SpiritRootWithSource = SpiritRoot & { source: DataSource };
type TalentWithSource = Talent & { source: DataSource };

interface CharacterCreationDataWithSource {
  worlds: WorldWithSource[];
  talentTiers: TalentTierWithSource[];
  origins: OriginWithSource[];
  spiritRoots: SpiritRootWithSource[];
  talents: TalentWithSource[];
}

const TOTAL_STEPS = 7;

// Type guard to validate the structure of DAD_creationData from Tavern
function isDADCustomData(data: unknown): data is DADCustomData {
  if (data === null || typeof data !== 'object') {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return (
    Array.isArray(obj.worlds) &&
    Array.isArray(obj.talentTiers) &&
    Array.isArray(obj.origins) &&
    Array.isArray(obj.spiritRoots) &&
    Array.isArray(obj.talents)
  );
}


// =======================================================================
//                           Store 定义
// =======================================================================

export const useCharacterCreationStore = defineStore('characterCreation', () => {
  // --- STATE ---
  const mode = ref<'single' | 'cloud'>('single');
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  const creationData = ref<CharacterCreationDataWithSource>({
    worlds: [],
    talentTiers: [],
    origins: [],
    spiritRoots: [],
    talents: [],
  });

  const characterPayload = ref<CharacterCreationPayload>({
    gender: '男',
    character_name: '无名者',
    race: '人族',
    world_id: '',
    talent_tier_id: '',
    current_age: 16,
    root_bone: 0,
    spirituality: 0,
    comprehension: 0,
    fortune: 0,
    charm: 0,
    temperament: 0,
    origin_id: null,
    spirit_root_id: null,
    selected_talent_ids: [],
  });
  const currentStep = ref(1);
  const isLocalCreation = ref(true);
  const initialGameMessage = ref<string | null>(null);
  const useStreamingStart = ref(true); // 开局是否使用流式传输（默认启用）

  // ========== 角色创建流程状态管理 ==========
  // 用于跟踪创建流程的状态，确保按钮状态正确
  const isCreating = ref(false); // 是否正在创建角色
  type CreationPhase = 'idle' | 'preparing' | 'world_generation' | 'opening_scene' | 'finalizing' | 'completed' | 'failed';
  const creationPhase = ref<CreationPhase>('idle'); // 当前创建阶段
  const creationError = ref<string | null>(null); // 创建过程中的错误信息
  const generateMode = ref<'generate' | 'generateRaw'>('generate'); // 开局生成模式（默认使用 generate）
  const splitResponseGeneration = ref(true); // 第七步是否使用分步生成（默认启用，提高开局稳定性）

  // 世界生成配置 - 使用固定默认值，用户可在界面中修改
  const worldGenerationConfig = ref({
    majorFactionsCount: 5, // 默认5个主要势力
    totalLocations: 12, // 默认12个地点
    secretRealmsCount: 5, // 默认5个秘境
    continentCount: 4, // 默认4片大陆
    generateOnlyContinents: true // 默认只生成大陆（开局优化）
  });

  // 修仙难度配置
  type DifficultyLevel = '简单' | '普通' | '困难' | '噩梦';
  const gameDifficulty = ref<DifficultyLevel>('普通');

  // 难度提示词配置（切换式，非叠加）
  const difficultyPrompts: Record<DifficultyLevel, string> = {
    简单: `【难度模式：简单】
- 世界对主角较为友善，机缘频繁出现
- 敌人实力普遍较弱，战斗容易获胜
- 资源获取容易，修炼进度较快
- 突破瓶颈的难度降低
- NPC对主角态度友好，容易获得帮助
- 判定难度-10，幸运点+5`,
    普通: `【难度模式：普通】
- 世界遵循正常修仙规则，机缘与危险并存
- 敌人实力与主角相当，战斗需要策略
- 资源获取需要努力，修炼进度正常
- 突破瓶颈需要积累和机缘
- NPC态度中立，需要建立关系
- 判定难度正常，无额外修正`,
    困难: `【难度模式：困难】天道对主角格外严苛！
- 世界充满危险，机缘稀少且竞争激烈
- 敌人实力普遍较强，战斗需要谨慎
- 资源稀缺，修炼进度缓慢
- 突破瓶颈困难重重，需要特殊机缘
- NPC对主角态度冷淡，需要付出代价获得帮助
【困难模式惩罚】
- 所有判定难度+10
- 幸运点上限-5
- 大失败阈值扩大：<难度-10即为大失败
- 失败必有代价，不可轻描淡写
- 敌人境界普遍比主角高半级到一级`,
    噩梦: `【难度模式：噩梦】天道要看这只蝼蚁如何挣扎！
- 世界极度危险，处处是陷阱和敌人
- 敌人实力远超主角，战斗九死一生
- 资源极度稀缺，修炼举步维艰
- 突破瓶颈几乎不可能，需要逆天机缘
- NPC对主角充满敌意，信任难以建立
- 死亡风险极高，每一步都需谨慎
【噩梦模式惩罚】
- 所有判定难度+20
- 幸运点上限-10，下限-15
- 大失败阈值扩大：<难度-5即为大失败
- 大失败惩罚翻倍（重伤变濒死，损失翻倍）
- 失败也有严重代价
- 敌人境界普遍比主角高一到两级
- 开局自带负面状态：【天道试炼】（所有判定-5，持续整个游戏）
- 机缘出现概率减半，陷阱出现概率翻倍`
  };

  // 获取当前难度的提示词
  const currentDifficultyPrompt = computed(() => difficultyPrompts[gameDifficulty.value]);

  // 同步“开局流式/生成模式”与 AI 配置，并做本地持久化（网页版/酒馆版本都适用）
  try {
    const cfg = aiService.getConfig();
    useStreamingStart.value = cfg.streaming !== false;
    generateMode.value = (cfg.initMode === 'generateRaw' ? 'generateRaw' : 'generate');
  } catch {
    // ignore (e.g. storage unavailable)
  }

  try {
    const savedUseStreamingStart = localStorage.getItem('dad_creation_useStreamingStart');
    if (savedUseStreamingStart !== null) {
      useStreamingStart.value = savedUseStreamingStart !== 'false';
    }
    const savedGenerateMode = localStorage.getItem('dad_creation_generateMode');
    if (savedGenerateMode === 'generate' || savedGenerateMode === 'generateRaw') {
      generateMode.value = savedGenerateMode;
    }
  } catch {
    // ignore
  }

  // 工坊“开局配置”落地：允许从本地存储读取并覆盖默认开局参数（一次性应用，可在界面继续修改）
  const applyStartConfig = (cfg: unknown) => {
    if (!cfg || typeof cfg !== 'object') return;
    const anyCfg = cfg as any;

    const aiCfg = (anyCfg.ai && typeof anyCfg.ai === 'object') ? anyCfg.ai : anyCfg;
    const streaming = aiCfg.streaming ?? aiCfg.useStreamingStart;
    if (typeof streaming === 'boolean') useStreamingStart.value = streaming;
    const initMode = aiCfg.initMode ?? aiCfg.generateMode;
    if (initMode === 'generate' || initMode === 'generateRaw') generateMode.value = initMode;

    const worldCfg =
      (anyCfg.world && typeof anyCfg.world === 'object')
        ? anyCfg.world
        : (anyCfg.worldGenerationConfig && typeof anyCfg.worldGenerationConfig === 'object')
          ? anyCfg.worldGenerationConfig
          : null;

    const clampInt = (value: unknown, min: number, max: number): number | null => {
      const n = Number(value);
      if (!Number.isFinite(n)) return null;
      const i = Math.floor(n);
      return Math.min(max, Math.max(min, i));
    };

    if (worldCfg) {
      const next = { ...worldGenerationConfig.value };
      const majorFactionsCount = clampInt(worldCfg.majorFactionsCount, 1, 30);
      const totalLocations = clampInt(worldCfg.totalLocations, 1, 60);
      const secretRealmsCount = clampInt(worldCfg.secretRealmsCount, 0, 30);
      const continentCount = clampInt(worldCfg.continentCount, 1, 12);
      if (majorFactionsCount !== null) next.majorFactionsCount = majorFactionsCount;
      if (totalLocations !== null) next.totalLocations = totalLocations;
      if (secretRealmsCount !== null) next.secretRealmsCount = secretRealmsCount;
      if (continentCount !== null) next.continentCount = continentCount;
      worldGenerationConfig.value = next;
    }

    const charCfg = (anyCfg.character && typeof anyCfg.character === 'object') ? anyCfg.character : null;
    if (charCfg) {
      const next = { ...characterPayload.value };
      const name = typeof charCfg.character_name === 'string' ? charCfg.character_name.trim() : null;
      const gender = typeof charCfg.gender === 'string' ? charCfg.gender.trim() : null;
      const race = typeof charCfg.race === 'string' ? charCfg.race.trim() : null;
      const currentAge = clampInt(charCfg.current_age, 1, 3000);

      if (name) next.character_name = name;
      if (gender) next.gender = gender;
      if (race) next.race = race;
      if (currentAge !== null) next.current_age = currentAge;

      characterPayload.value = next;
    }
  };

  try {
    const rawStartConfig = localStorage.getItem('dad_start_config');
    if (rawStartConfig) {
      applyStartConfig(JSON.parse(rawStartConfig));
    }
  } catch {
    // ignore (invalid json / storage unavailable)
  }

  watch(useStreamingStart, (val) => {
    try {
      localStorage.setItem('dad_creation_useStreamingStart', String(val));
    } catch {
      // ignore
    }
  });

  watch(generateMode, (val) => {
    try {
      localStorage.setItem('dad_creation_generateMode', val);
    } catch {
      // ignore
    }
  });

  // --- GETTERS ---
  const totalSteps = computed(() => TOTAL_STEPS);
  const attributes = computed(() => ({
    root_bone: characterPayload.value.root_bone,
    spirituality: characterPayload.value.spirituality,
    comprehension: characterPayload.value.comprehension,
    fortune: characterPayload.value.fortune,
    charm: characterPayload.value.charm,
    temperament: characterPayload.value.temperament,
  }));
  const selectedWorld = computed(() => creationData.value.worlds.find(w => w.id === characterPayload.value.world_id) || null);
  const selectedTalentTier = computed(() => creationData.value.talentTiers.find(t => t.id === characterPayload.value.talent_tier_id) || null);
  const selectedOrigin = computed(() => creationData.value.origins.find(o => o.id === characterPayload.value.origin_id) || null);
  const selectedSpiritRoot = computed(() => creationData.value.spiritRoots.find(s => s.id === characterPayload.value.spirit_root_id) || null);
  const selectedTalents = computed(() => creationData.value.talents.filter(t => characterPayload.value.selected_talent_ids.includes(t.id)));

  const bonusTalentPoints = computed(() => {
    let points = 0;
    if (selectedTalents.value.some(t => t.name === '霸王血脉')) {
      points += 1;
      console.log('[天道点计算] 检测到 "霸王血脉" 天赋, 增加 1 天道点');
    }
    return points;
  });

  const remainingTalentPoints = computed(() => {
    if (!selectedTalentTier.value) return 0;

    let points = selectedTalentTier.value.total_points;
    console.log('[天道点计算] 初始天道点:', points);

    // Add bonus points from talents
    points += bonusTalentPoints.value;

    if (selectedOrigin.value) {
      console.log('[天道点计算] 出生消耗:', selectedOrigin.value.talent_cost);
      points -= selectedOrigin.value.talent_cost;
    }

    if (selectedSpiritRoot.value) {
      console.log('[天道点计算] 灵根消耗:', selectedSpiritRoot.value.talent_cost);
      points -= selectedSpiritRoot.value.talent_cost;
    }

    const talentCost = selectedTalents.value.reduce((total, talent) => total + talent.talent_cost, 0);
    console.log('[天道点计算] 已选天赋数量:', selectedTalents.value.length);
    console.log('[天道点计算] 已选天赋列表:', selectedTalents.value.map(t => ({ 名称: t.name, 消耗: t.talent_cost })));
    console.log('[天道点计算] 天赋总消耗:', talentCost);
    points -= talentCost;

    const allocatedAttributePoints = Object.values(attributes.value).reduce((sum, val) => sum + val, 0);
    console.log('[天道点计算] 先天六司总和:', allocatedAttributePoints);
    points -= allocatedAttributePoints;

    console.log('[天道点计算] 最终剩余:', points);
    return points;
  });

  const totalTalentCost = computed(() => {
    if (!selectedTalentTier.value) return 0;
    const cost = selectedTalentTier.value.total_points - remainingTalentPoints.value;
    return Math.max(0, cost);
  });

  // --- ACTIONS ---

  async function persistCustomData() {
    const dataToSave: DADCustomData = {
      worlds: creationData.value.worlds.filter(item => item.source === 'cloud'),
      talentTiers: creationData.value.talentTiers.filter(item => item.source === 'cloud'),
      origins: creationData.value.origins.filter(item => item.source === 'cloud'),
      spiritRoots: creationData.value.spiritRoots.filter(item => item.source === 'cloud'),
      talents: creationData.value.talents.filter(item => item.source === 'cloud'),
    };

    // 保存到 IndexedDB
    const { saveData } = await import('@/utils/indexedDBManager');
    await saveData('customCreationData', dataToSave);
    console.log("【创世神殿】自定义创世数据已保存到数据库！");
  }

  async function createEmptyPayload(): Promise<CharacterCreationPayload> {
    // 尝试获取当前用户名字
    let character_name = '无名者'; // 默认值为无名者
    try {
      const userName = await getCurrentCharacterName();
      character_name = userName || '无名者';
    } catch (error) {
      console.warn('获取用户名字失败:', error);
      character_name = '无名者';
    }
    
    return {
      gender: '男',
      character_name: character_name,
      race: '人族',
      world_id: '',
      talent_tier_id: '',
      current_age: 16,
      root_bone: 0,
      spirituality: 0,
      comprehension: 0,
      fortune: 0,
      charm: 0,
      temperament: 0,
      origin_id: null,
      spirit_root_id: null,
      selected_talent_ids: [],
    };
  }

  async function initializeStore(currentMode: 'single' | 'cloud') {
    isLoading.value = true;
    error.value = null;
    mode.value = currentMode;

    // 初始化时获取用户名字
    try {
      const userName = await getCurrentCharacterName();
      characterPayload.value.character_name = userName || '无名者';
      console.log("【创世神殿】已获取用户道号:", characterPayload.value.character_name);
    } catch (error) {
      console.warn('【创世神殿】获取用户道号失败，使用默认名', error);
      characterPayload.value.character_name = '无名者';
    }

    try {
      if (currentMode === 'single') {
        console.log("【创世神殿】初始化单机模式，加载本地数据和自定义数据！");
        
        // 加载本地预设数据
        const localWorlds = LOCAL_WORLDS.map(w => ({ ...w, source: 'local' as DataSource }));
        const localTalentTiers = LOCAL_TALENT_TIERS.map(t => ({ ...t, source: 'local' as DataSource }));
        const localOrigins = LOCAL_ORIGINS.map(o => ({ ...o, source: 'local' as DataSource }));
        const localSpiritRoots = LOCAL_SPIRIT_ROOTS.map(s => ({ ...s, source: 'local' as DataSource }));
        const localTalents = LOCAL_TALENTS.map(t => ({ ...t, source: 'local' as DataSource }));
        
        // 尝试加载自定义数据（从 IndexedDB）
        let savedData: DADCustomData = { worlds: [], talentTiers: [], origins: [], spiritRoots: [], talents: [] };
        try {
          const { loadFromIndexedDB } = await import('@/utils/indexedDBManager');
          const potentialData = await loadFromIndexedDB('customCreationData');
          if (potentialData && isDADCustomData(potentialData)) {
            savedData = potentialData;
            console.log("【创世神殿】成功加载自定义数据:", {
              worlds: savedData.worlds.length,
              talentTiers: savedData.talentTiers.length,
              origins: savedData.origins.length,
              spiritRoots: savedData.spiritRoots.length,
              talents: savedData.talents.length
            });
          }
        } catch (error) {
          console.warn("【创世神殿】加载自定义数据失败，仅使用本地数据:", error);
        }
        
        const savedCloudWorlds = savedData.worlds.map(w => ({...w, source: 'cloud' as DataSource}));
        const savedCloudTalentTiers = savedData.talentTiers.map(t => ({...t, source: 'cloud' as DataSource}));
        const savedCloudOrigins = savedData.origins.map(o => ({...o, source: 'cloud' as DataSource}));
        const savedCloudSpiritRoots = savedData.spiritRoots.map(s => ({...s, source: 'cloud' as DataSource}));
        const savedCloudTalents = savedData.talents.map(t => ({...t, source: 'cloud' as DataSource}));
        
        // 合并本地数据和自定义数据
        const merge = <T extends { id: number }>(local: T[], cloud: T[]): T[] => {
            const map = new Map<number, T>();
            local.forEach(item => map.set(item.id, item));
            cloud.forEach(item => map.set(item.id, item));
            return Array.from(map.values());
        };
        
        creationData.value.worlds = merge(localWorlds, savedCloudWorlds);
        creationData.value.talentTiers = merge(localTalentTiers, savedCloudTalentTiers);
        creationData.value.origins = merge(localOrigins, savedCloudOrigins);
        creationData.value.spiritRoots = merge(localSpiritRoots, savedCloudSpiritRoots);
        creationData.value.talents = merge(localTalents, savedCloudTalents);
      } else {
        console.log("【创世神殿】初始化联机模式，从后端获取云端数据！");

        // 联机模式：主动从后端请求数据
        const { isBackendConfigured } = await import('@/services/backendConfig');
        const { verifyStoredToken } = await import('@/services/request');

        if (isBackendConfigured()) {
          // 验证 token 有效性
          const tokenValid = await verifyStoredToken();
          if (!tokenValid) {
            console.warn("【创世神殿】联机模式 token 无效，回退到本地数据");
            creationData.value.worlds = LOCAL_WORLDS.map(w => ({ ...w, source: 'local' as DataSource }));
            creationData.value.talentTiers = LOCAL_TALENT_TIERS.map(t => ({ ...t, source: 'local' as DataSource }));
            creationData.value.origins = LOCAL_ORIGINS.map(o => ({ ...o, source: 'local' as DataSource }));
            creationData.value.spiritRoots = LOCAL_SPIRIT_ROOTS.map(s => ({ ...s, source: 'local' as DataSource }));
            creationData.value.talents = LOCAL_TALENTS.map(t => ({ ...t, source: 'local' as DataSource }));
            error.value = "联机模式需要先登录";
          } else {
            try {
              console.log("【创世神殿】后端已配置且 token 有效，开始请求云端数据...");
              const [cloudWorlds, cloudTalentTiers, cloudOrigins, cloudSpiritRoots, cloudTalents] = await Promise.all([
                fetchWorlds(),
                fetchTalentTiers(),
                fetchOrigins(),
                fetchSpiritRoots(),
                fetchTalents()
              ]);

              console.log("【创世神殿】成功获取云端数据:", {
                worlds: cloudWorlds.length,
                talentTiers: cloudTalentTiers.length,
                origins: cloudOrigins.length,
                spiritRoots: cloudSpiritRoots.length,
                talents: cloudTalents.length
              });

              // 标记为云端数据
              creationData.value.worlds = cloudWorlds.map(w => ({...w, source: 'cloud' as DataSource}));
              creationData.value.talentTiers = cloudTalentTiers.map(t => ({...t, source: 'cloud' as DataSource}));
              creationData.value.origins = cloudOrigins.map(o => ({...o, source: 'cloud' as DataSource}));
              creationData.value.spiritRoots = cloudSpiritRoots.map(s => ({...s, source: 'cloud' as DataSource}));
              creationData.value.talents = cloudTalents.map(t => ({...t, source: 'cloud' as DataSource}));

            } catch (fetchError) {
              console.error("【创世神殿】获取云端数据失败，回退到本地数据:", fetchError);
              // 回退到本地数据
              creationData.value.worlds = LOCAL_WORLDS.map(w => ({ ...w, source: 'local' as DataSource }));
              creationData.value.talentTiers = LOCAL_TALENT_TIERS.map(t => ({ ...t, source: 'local' as DataSource }));
              creationData.value.origins = LOCAL_ORIGINS.map(o => ({ ...o, source: 'local' as DataSource }));
              creationData.value.spiritRoots = LOCAL_SPIRIT_ROOTS.map(s => ({ ...s, source: 'local' as DataSource }));
              creationData.value.talents = LOCAL_TALENTS.map(t => ({ ...t, source: 'local' as DataSource }));
            }
          }
        } else {
          console.warn("【创世神殿】后端未配置，使用本地数据！");
          creationData.value.worlds = LOCAL_WORLDS.map(w => ({ ...w, source: 'local' as DataSource }));
          creationData.value.talentTiers = LOCAL_TALENT_TIERS.map(t => ({ ...t, source: 'local' as DataSource }));
          creationData.value.origins = LOCAL_ORIGINS.map(o => ({ ...o, source: 'local' as DataSource }));
          creationData.value.spiritRoots = LOCAL_SPIRIT_ROOTS.map(s => ({ ...s, source: 'local' as DataSource }));
          creationData.value.talents = LOCAL_TALENTS.map(t => ({ ...t, source: 'local' as DataSource }));
        }
      }
    } catch (e) {
      console.error("加载数据失败:", e);
      error.value = "加载数据失败";
      // 即使出错也使用正确的数据源标记      creationData.value.worlds = LOCAL_WORLDS.map(w => ({ ...w, source: 'local' as DataSource }));
      creationData.value.talentTiers = LOCAL_TALENT_TIERS.map(t => ({ ...t, source: 'local' as DataSource }));
      creationData.value.origins = LOCAL_ORIGINS.map(o => ({ ...o, source: 'local' as DataSource }));
      creationData.value.spiritRoots = LOCAL_SPIRIT_ROOTS.map(s => ({ ...s, source: 'local' as DataSource }));
      creationData.value.talents = LOCAL_TALENTS.map(t => ({ ...t, source: 'local' as DataSource }));
    } finally {
      isLoading.value = false;
    }
  }
  async function fetchCloudWorlds() {
    console.log("【创世神殿】正在从云端获取世界列表...");
    isLoading.value = true;
    error.value = null;
    
    try {
      const cloudWorlds = await fetchWorlds();
      console.log("【创世神殿】成功获取云端世界数据", cloudWorlds);
      
      const cloudWorldsWithSource = cloudWorlds.map(w => ({ ...w, source: 'cloud' as DataSource }));
      
      // 合并云端和本地数据，本地为主
      const localWorlds = LOCAL_WORLDS.map(w => ({ ...w, source: 'local' as DataSource }));
      const worldMap = new Map<number, WorldWithSource>();
      cloudWorldsWithSource.forEach(w => worldMap.set(w.id, w)); // 先添加云端数据      localWorlds.forEach(w => worldMap.set(w.id, w)); // 本地数据覆盖同ID的云端数据（本地为主）
      creationData.value.worlds = Array.from(worldMap.values());
      console.log("【创世神殿】世界列表已更新:", creationData.value.worlds.length, "个世界");
      console.log("【创世神殿】云端世界", creationData.value.worlds.filter(w => w.source === 'cloud'));
    } catch (e) {
      console.error("【创世神殿】从云端获取世界列表失败:", e);
      error.value = `获取云端世界列表失败: ${e instanceof Error ? e.message : '未知错误'}`;
      
      // 失败时提供本地数据作为备选
      const localWorlds = LOCAL_WORLDS.map(w => ({ ...w, source: 'local' as DataSource }));
      creationData.value.worlds = localWorlds;
      console.warn("【创世神殿】云端数据获取失败，已提供本地备选数据");
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 获取所有云端创世数据（世界、天资、出身、灵根、天赋）
   */
  async function fetchAllCloudData(): Promise<number> {
    console.log("【创世神殿】正在从云端获取完整创世数据...");
    isLoading.value = true;
    error.value = null;
    
    try {
      // 并发获取所有数据类型
      const [cloudWorlds, cloudTalentTiers, cloudOrigins, cloudSpiritRoots, cloudTalents] = await Promise.all([
        fetchWorlds(),
        fetchTalentTiers(),
        fetchOrigins(),
        fetchSpiritRoots(),
        fetchTalents()
      ]);

      console.log("【创世神殿】成功获取所有云端数据");
      console.log("- 世界:", cloudWorlds.length, "个");
      console.log("- 天资等级:", cloudTalentTiers.length, "个");
      console.log("- 出身:", cloudOrigins.length, "个");
      console.log("- 灵根:", cloudSpiritRoots.length, "个");
      console.log("- 天赋:", cloudTalents.length, "个");

      // 记录合并前各项数据的数量
      const beforeCounts = {
        worlds: creationData.value.worlds.length,
        talentTiers: creationData.value.talentTiers.length,
        origins: creationData.value.origins.length,
        spiritRoots: creationData.value.spiritRoots.length,
        talents: creationData.value.talents.length,
      };

      // 安全地转换API返回的数据，确保类型正确
      const safeTransform = <T>(items: any[], defaultItem: Omit<T, 'source'>): (T & { source: DataSource })[] => {
        return (items || []).filter(Boolean).map(item => ({
          ...defaultItem,
          ...item,
          source: 'cloud' as DataSource,
        } as T & { source: DataSource }));
      };

      const cloudWorldsWithSource = safeTransform<World>(cloudWorlds, { id: 0, name: '', era: '', description: '' });
      const cloudTalentTiersWithSource = safeTransform<TalentTier>(cloudTalentTiers, { id: 0, name: '未知天资', description: '', total_points: 20, rarity: 1, color: '#FFFFFF' });
      const cloudOriginsWithSource = safeTransform<Origin>(cloudOrigins, { id: 0, name: '', description: '', talent_cost: 0, attribute_modifiers: {}, rarity: 0 });
      const cloudSpiritRootsWithSource = safeTransform<SpiritRoot>(cloudSpiritRoots, { id: 0, name: '', tier: '', description: '', base_multiplier: 0, talent_cost: 0 });
      const cloudTalentsWithSource = safeTransform<Talent>(cloudTalents, { id: 0, name: '', description: '', talent_cost: 0, rarity: 0 });
      
      // 使用当前 store 中的数据作为本地数据源进行合并，而不是用初始常量
      const localWorlds = creationData.value.worlds;
      const localTalentTiers = creationData.value.talentTiers;
      const localOrigins = creationData.value.origins;
      const localSpiritRoots = creationData.value.spiritRoots;
      const localTalents = creationData.value.talents;

      // 该函数现在计算并返回需要新增的云端项目
      const findNewItems = <T extends { id: number; name: string; source: DataSource }>(existing: T[], cloud: T[]): T[] => {
        const newItems: T[] = [];
        const existingNames = new Set(existing.map(item => item.name));
        let maxId = Math.max(...existing.map(item => item.id), 0);

        cloud.forEach(cloudItem => {
          if (!existingNames.has(cloudItem.name)) {
            maxId++;
            const newItem = {
              ...cloudItem,
              id: maxId
            };
            newItems.push(newItem);
            existingNames.add(newItem.name); // 确保在同一次同步中，云端数据自身的重复项也被过滤
          }
        });

        return newItems;
      };
      
      // 合并数据，通过直接修改数组来确保响应性
      const mergeInto = <T extends { id: number; name: string; source: DataSource }>(existing: T[], newItems: T[]) => {
        if (newItems.length > 0) {
          existing.push(...newItems);
        }
      };

      mergeInto(creationData.value.worlds, findNewItems(localWorlds, cloudWorldsWithSource));
      mergeInto(creationData.value.talentTiers, findNewItems(localTalentTiers, cloudTalentTiersWithSource));
      mergeInto(creationData.value.origins, findNewItems(localOrigins, cloudOriginsWithSource));
      mergeInto(creationData.value.spiritRoots, findNewItems(localSpiritRoots, cloudSpiritRootsWithSource));
      mergeInto(creationData.value.talents, findNewItems(localTalents, cloudTalentsWithSource));

      console.log("【创世神殿】所有云端数据合并完成");
      console.log("【创世神殿】最终数据验证");
      console.log("- 世界 (云端):", creationData.value.worlds.filter(w => w.source === 'cloud').length);
      console.log("- 天资 (云端):", creationData.value.talentTiers.filter(t => t.source === 'cloud').length);
      console.log("- 出身 (云端):", creationData.value.origins.filter(o => o.source === 'cloud').length);
      console.log("- 灵根 (云端):", creationData.value.spiritRoots.filter(s => s.source === 'cloud').length);
      console.log("- 天赋 (云端):", creationData.value.talents.filter(t => t.source === 'cloud').length);
      console.log("【创世神殿】天资数据示例", creationData.value.talentTiers.slice(0, 3).map(t => ({ name: t.name, source: t.source })));
      
      // 计算新增条目总数
      const afterCounts = {
        worlds: creationData.value.worlds.length,
        talentTiers: creationData.value.talentTiers.length,
        origins: creationData.value.origins.length,
        spiritRoots: creationData.value.spiritRoots.length,
        talents: creationData.value.talents.length,
      };

      const newItemsCount =
        (afterCounts.worlds - beforeCounts.worlds) +
        (afterCounts.talentTiers - beforeCounts.talentTiers) +
        (afterCounts.origins - beforeCounts.origins) +
        (afterCounts.spiritRoots - beforeCounts.spiritRoots) +
        (afterCounts.talents - beforeCounts.talents);
      
      console.log(`【创世神殿】同步完成，新增 ${newItemsCount} 项数据。`);

      // 保存云端数据到全局变量
      await persistCustomData();
      return newItemsCount; // 返回新增数量
    } catch (e) {
      console.error("【创世神殿】获取云端创世数据失败", e);
      error.value = `获取云端创世数据失败: ${e instanceof Error ? e.message : '未知错误'}`;
      
      // 失败时使用本地数据作为备选
      const localWorlds = LOCAL_WORLDS.map(w => ({ ...w, source: 'local' as DataSource }));
      const localTalentTiers = LOCAL_TALENT_TIERS.map(t => ({ ...t, source: 'local' as DataSource }));
      const localOrigins = LOCAL_ORIGINS.map(o => ({ ...o, source: 'local' as DataSource }));
      const localSpiritRoots = LOCAL_SPIRIT_ROOTS.map(s => ({ ...s, source: 'local' as DataSource }));
      const localTalents = LOCAL_TALENTS.map(t => ({ ...t, source: 'local' as DataSource }));
      
      creationData.value.worlds = localWorlds;
      creationData.value.talentTiers = localTalentTiers;
      creationData.value.origins = localOrigins;
      creationData.value.spiritRoots = localSpiritRoots;
      creationData.value.talents = localTalents;
      
      console.warn("【创世神殿】云端数据获取失败，已提供本地备选数据");
      return 0; // 失败时返回0
    } finally {
      isLoading.value = false;
    }
  }


  function addWorld(world: World) {
    // 用户自定义创建的数据都标记为'cloud'以便持久化，不管当前是否为单机模式
    const source = 'cloud' as const;
    creationData.value.worlds.unshift({ ...world, source });
    persistCustomData();
  }
  function addTalentTier(tier: TalentTier) {
    // 用户自定义创建的数据都标记为'cloud'以便持久化，不管当前是否为单机模式
    const source = 'cloud' as const;
    creationData.value.talentTiers.unshift({ ...tier, source });
    persistCustomData();
  }
  function addOrigin(origin: Origin) {
    // 用户自定义创建的数据都标记为'cloud'以便持久化，不管当前是否为单机模式
    const source = 'cloud' as const;
    creationData.value.origins.unshift({ ...origin, source });
    persistCustomData();
  }
  function addSpiritRoot(root: SpiritRoot) {
    // 用户自定义创建的数据都标记为'cloud'以便持久化，不管当前是否为单机模式
    const source = 'cloud' as const;
    creationData.value.spiritRoots.unshift({ ...root, source });
    persistCustomData();
  }
  function addTalent(talent: Talent) {
    // 用户自定义创建的数据都标记为'cloud'以便持久化，不管当前是否为单机模式
    const source = 'cloud' as const;
    creationData.value.talents.unshift({ ...talent, source });
    persistCustomData();
  }

  function addGeneratedData(type: string, data: unknown) {
    switch (type) {
      case 'world': addWorld(data as World); break;
      case 'talent_tier': addTalentTier(data as TalentTier); break;
      case 'origin': addOrigin(data as Origin); break;
      case 'spirit_root': addSpiritRoot(data as SpiritRoot); break;
      case 'talent': addTalent(data as Talent); break;
      default: console.warn(`Unknown data type for addGeneratedData: ${type}`);
    }
  }
  
  // --- 新增：删除功能 ---
  type CreationDataType = 'worlds' | 'talentTiers' | 'origins' | 'spiritRoots' | 'talents';

  async function removeItem(type: CreationDataType, id: number) {
    const index = creationData.value[type].findIndex(item => item.id === id);
    if (index > -1) {
      const removedItem = creationData.value[type][index];
      creationData.value[type].splice(index, 1);
      console.log(`【创世神殿】已删除 ${type} 项目，ID: ${id}，来源: ${removedItem.source}`);
      
      // 立即持久化到酒馆全局变量
      await persistCustomData();
      
      // 关键修复：如果删除的是云端数据，需要强制刷新酒馆全局变量
      if (removedItem.source === 'cloud') {
        console.log(`【创世神殿】删除云端数据，强制同步酒馆全局变量`);
        try {
          const helper = getTavernHelper();
          if (helper) {
            // 方案1：先尝试完全重置 DAD_creationData
            console.log(`【创世神殿】方案1：完全重置 DAD_creationData`);
            
            // 构建当前内存中的所有云端数据（已删除目标项）
            const newData: DADCustomData = {
              worlds: creationData.value.worlds.filter(item => item.source === 'cloud'),
              talentTiers: creationData.value.talentTiers.filter(item => item.source === 'cloud'),
              origins: creationData.value.origins.filter(item => item.source === 'cloud'),
              spiritRoots: creationData.value.spiritRoots.filter(item => item.source === 'cloud'),
              talents: creationData.value.talents.filter(item => item.source === 'cloud'),
            };
            
            console.log(`【创世神殿】准备保存的新数据:`, JSON.stringify(newData, null, 2));
            
            // 先删除旧的 DAD_creationData
            try {
              await helper.deleteVariable('DAD_creationData', { type: 'global' });
              console.log(`【创世神殿】已删除旧的 DAD_creationData`);
            } catch (e) {
              console.warn(`【创世神殿】删除旧变量失败（可能不存在）:`, e);
            }
            
            // 清理数据，移除不可序列化的值（修复酒馆助手3.6.11的structuredClone问题）
            const { deepCleanForClone } = await import('@/utils/dataValidation');
            const cleanedNewData = deepCleanForClone({ 'DAD_creationData': newData });

            // 重新创建 DAD_creationData
            await helper.insertOrAssignVariables(cleanedNewData, { type: 'global' });
            
            console.log(`【创世神殿】已重新创建 DAD_creationData`);
            
            // 验证删除是否成功
            const verifyVars = await helper.getVariables({ type: 'global' });
            const verifyData = verifyVars['DAD_creationData'];
            console.log(`【创世神殿】验证：更新后的 DAD_creationData:`, JSON.stringify(verifyData, null, 2));
            
            if (verifyData && isDADCustomData(verifyData)) {
              const remainingItems = (verifyData[type] as any[]).filter((item: any) => item.id === id);
              if (remainingItems.length === 0) {
                console.log(`【创世神殿】✅ 验证成功：${type} 项目 ID: ${id} 已从酒馆全局变量中删除`);
              } else {
                console.error(`【创世神殿】❌ 验证失败：${type} 项目 ID: ${id} 仍在酒馆全局变量中`);
                console.error(`【创世神殿】剩余项目:`, remainingItems);
              }
            } else {
              console.error(`【创世神殿】❌ 验证失败：DAD_creationData 格式无效`);
            }
          } else {
            console.error(`【创世神殿】❌ 酒馆助手不可用`);
          }
        } catch (error) {
          console.error('【创世神殿】❌ 同步酒馆全局变量失败:', error);
        }
      }
    } else {
      console.warn(`【创世神殿】删除失败：未找到 ${type} 项目，ID: ${id}`);
    }
  }

  const removeWorld = async (id: number) => await removeItem('worlds', id);
  const removeTalentTier = async (id: number) => await removeItem('talentTiers', id);
  const removeOrigin = async (id: number) => await removeItem('origins', id);
  const removeSpiritRoot = async (id: number) => await removeItem('spiritRoots', id);
  const removeTalent = async (id: number) => await removeItem('talents', id);

  // --- 新增：编辑功能 ---
  function updateItem<T extends { id: number }>(type: CreationDataType, id: number, updatedData: Partial<T>) {
    const index = creationData.value[type].findIndex(item => item.id === id);
    if (index > -1) {
      // 保持原有数据源标记，只更新内容
      const currentItem = creationData.value[type][index];
      creationData.value[type][index] = { ...currentItem, ...updatedData };
      console.log(`【创世神殿】已更新 ${type} 项目，ID: ${id}`);
      persistCustomData();
      return true;
    }
    return false;
  }

  const updateWorld = (id: number, data: Partial<World>) => updateItem('worlds', id, data);
  const updateTalentTier = (id: number, data: Partial<TalentTier>) => updateItem('talentTiers', id, data);
  const updateOrigin = (id: number, data: Partial<Origin>) => updateItem('origins', id, data);
  const updateSpiritRoot = (id: number, data: Partial<SpiritRoot>) => updateItem('spiritRoots', id, data);
  const updateTalent = (id: number, data: Partial<Talent>) => updateItem('talents', id, data);

  // 获取单个项目数据（用于编辑时填充表单）
  const getItemById = <T extends { id: number }>(type: CreationDataType, id: number): T | null => {
    return creationData.value[type].find(item => item.id === id) as T || null;
  };
  
  function selectWorld(worldId: number | '') { characterPayload.value.world_id = worldId; }
  function selectTalentTier(tierId: number | '') {
    characterPayload.value.talent_tier_id = tierId;
    characterPayload.value.origin_id = null;
    characterPayload.value.spirit_root_id = null;
    characterPayload.value.selected_talent_ids = [];
    characterPayload.value.root_bone = 0;
    characterPayload.value.spirituality = 0;
    characterPayload.value.comprehension = 0;
    characterPayload.value.fortune = 0;
    characterPayload.value.charm = 0;
    characterPayload.value.temperament = 0;
  }
  function selectOrigin(originId: number | null) { characterPayload.value.origin_id = originId; }
  function selectSpiritRoot(rootId: number | null) { characterPayload.value.spirit_root_id = rootId; }
  function toggleTalent(talentId: number) {
    const index = characterPayload.value.selected_talent_ids.indexOf(talentId);
    if (index > -1) characterPayload.value.selected_talent_ids.splice(index, 1);
    else characterPayload.value.selected_talent_ids.push(talentId);
  }
  function setAttribute(key: AttributeKey, value: number) { if (key in characterPayload.value) characterPayload.value[key] = value; }

  function setAIGeneratedSpiritRoot(spiritRoot: SpiritRoot) {
    if (!spiritRoot || typeof spiritRoot !== 'object' || !spiritRoot.name) return;
    let existingRoot = creationData.value.spiritRoots.find(r => r.name === spiritRoot.name);
    if (!existingRoot) {
      const newId = Math.max(...creationData.value.spiritRoots.map(r => r.id), 0) + 1;
      const newRootWithId = { ...spiritRoot, id: newId };
      addSpiritRoot(newRootWithId);
      existingRoot = creationData.value.spiritRoots.find(r => r.name === spiritRoot.name); // Re-find it to be safe
      console.log(`[创世神殿] AI生成了新的灵根 "${spiritRoot.name}" 并已添加到列表中 (ID: ${newId})`);
    }
    if (existingRoot) {
        characterPayload.value.spirit_root_id = existingRoot.id;
        console.log(`[创世神殿] 已将玩家选择的灵根更新为AI生成的结果: "${existingRoot.name}"`);
    }
  }

  function setAIGeneratedOrigin(origin: Origin) {
    if (!origin || typeof origin !== 'object' || !origin.name) return;
    let existingOrigin = creationData.value.origins.find(o => o.name === origin.name);
    if (!existingOrigin) {
      const newId = Math.max(...creationData.value.origins.map(o => o.id), 0) + 1;
      const newOriginWithId = { ...origin, id: newId };
      addOrigin(newOriginWithId);
      existingOrigin = creationData.value.origins.find(o => o.name === origin.name); // Re-find it to be safe
      console.log(`[创世神殿] AI生成了新的出身 "${origin.name}" 并已添加到列表中 (ID: ${newId})`);
    }
    if (existingOrigin) {
        characterPayload.value.origin_id = existingOrigin.id;
        console.log(`[创世神殿] 已将玩家选择的出身更新为AI生成的结果: "${existingOrigin.name}"`);
    }
  }

  async function resetCharacter() {
    const newPayload = await createEmptyPayload();
    characterPayload.value = newPayload;
    currentStep.value = 1; 
  }
  function nextStep() { if (currentStep.value < TOTAL_STEPS) currentStep.value++; }
  function prevStep() { if (currentStep.value > 1) currentStep.value--; }
  function goToStep(step: number) { if (step >= 1 && step <= TOTAL_STEPS) currentStep.value = step; }
  function setMode(newMode: 'single' | 'cloud') { mode.value = newMode; isLocalCreation.value = (newMode === 'single'); }
  function toggleLocalCreation() { isLocalCreation.value = !isLocalCreation.value; }
  function setInitialGameMessage(message: string) { initialGameMessage.value = message; }
  
  // 设置世界生成配置
  function setWorldGenerationConfig(config: Partial<typeof worldGenerationConfig.value>) {
    worldGenerationConfig.value = { ...worldGenerationConfig.value, ...config };
  }
  async function resetOnExit() { await resetCharacter(); mode.value = 'single'; isLocalCreation.value = true; }
  async function startLocalCreation() { await resetCharacter(); isLocalCreation.value = true; mode.value = 'single'; }
  async function startCloudCreation() { await resetCharacter(); isLocalCreation.value = false; mode.value = 'cloud'; }

  // ========== 创建流程状态管理函数 ==========
  function startCreation() {
    isCreating.value = true;
    creationPhase.value = 'preparing';
    creationError.value = null;
    console.log('[创世神殿] 开始创建角色流程');
  }

  function setCreationPhase(phase: CreationPhase) {
    creationPhase.value = phase;
    console.log(`[创世神殿] 创建阶段更新: ${phase}`);
  }

  function completeCreation() {
    isCreating.value = false;
    creationPhase.value = 'completed';
    creationError.value = null;
    console.log('[创世神殿] 角色创建完成');
  }

  function failCreation(errorMsg: string) {
    isCreating.value = false;
    creationPhase.value = 'failed';
    creationError.value = errorMsg;
    console.log(`[创世神殿] 角色创建失败: ${errorMsg}`);
  }

  function resetCreationState() {
    isCreating.value = false;
    creationPhase.value = 'idle';
    creationError.value = null;
    console.log('[创世神殿] 重置创建状态');
  }

  return {
    mode, isLoading, error, creationData, characterPayload, currentStep, isLocalCreation, initialGameMessage, worldGenerationConfig, useStreamingStart, generateMode, splitResponseGeneration,
    // 创建流程状态
    isCreating, creationPhase, creationError,
    gameDifficulty, currentDifficultyPrompt, // 难度配置
    totalSteps, attributes, selectedWorld, selectedTalentTier, selectedOrigin, selectedSpiritRoot, selectedTalents, remainingTalentPoints, totalTalentCost, bonusTalentPoints,
    initializeStore, fetchCloudWorlds, fetchAllCloudData, addWorld, addTalentTier, addOrigin, addSpiritRoot, addTalent, addGeneratedData,
    removeWorld, removeTalentTier, removeOrigin, removeSpiritRoot, removeTalent, // 导出删除函数
    updateWorld, updateTalentTier, updateOrigin, updateSpiritRoot, updateTalent, getItemById, // 导出编辑函数
    selectWorld, selectTalentTier, selectOrigin, selectSpiritRoot, toggleTalent, setAttribute,
    resetCharacter, nextStep, prevStep, goToStep, setMode, toggleLocalCreation, setInitialGameMessage, setWorldGenerationConfig,
    resetOnExit, startLocalCreation, startCloudCreation, persistCustomData,
    setAIGeneratedSpiritRoot,
    setAIGeneratedOrigin,
    // 创建流程状态管理函数
    startCreation, setCreationPhase, completeCreation, failCreation, resetCreationState,
  };
});
