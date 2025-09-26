import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  World,
  TalentTier,
  Origin,
  SpiritRoot,
  Talent,
  DADCustomData,
} from '../types';
// Import the Tavern helper to interact with Tavern's variable system
import { getTavernHelper, getCurrentCharacterName } from '../utils/tavern';
import { request, fetchWorlds, fetchTalentTiers, fetchOrigins, fetchSpiritRoots, fetchTalents } from '../services/request';
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
function isDADCustomData(data: any): data is DADCustomData {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.worlds) &&
    Array.isArray(data.talentTiers) &&
    Array.isArray(data.origins) &&
    Array.isArray(data.spiritRoots) &&
    Array.isArray(data.talents)
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
    character_name: '',
    world_id: '',
    talent_tier_id: '',
    current_age: 18,
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
  
  // 世界生成配置
  const worldGenerationConfig = ref({
    majorFactionsCount: Math.floor(Math.random() * 4) + 5, // 5-8 随机势力数量
    totalLocations: Math.floor(Math.random() * 11) + 20, // 20-30 随机地点数量
    secretRealmsCount: Math.floor(Math.random() * 6) + 6, // 6-11 随机秘境数量
    continentCount: Math.floor(Math.random() * 5) + 3, // 3-7 随机大陆数量
    hasImmortalEmpires: false,
    hasDemonicFactions: true,
    hasAncientSects: true,
    mapConfig: {
      width: 3600,
      height: 2400,
      minLng: 100.0,
      maxLng: 130.0,
      minLat: 25.0,
      maxLat: 45.0,
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

  const remainingTalentPoints = computed(() => {
    if (!selectedTalentTier.value) return 0;
    let points = selectedTalentTier.value.total_points;
    if (selectedOrigin.value) points -= selectedOrigin.value.talent_cost;
    if (selectedSpiritRoot.value) points -= selectedSpiritRoot.value.talent_cost;
    points -= selectedTalents.value.reduce((total, talent) => total + talent.talent_cost, 0);
    const allocatedAttributePoints = Object.values(attributes.value).reduce((sum, val) => sum + val, 0);
    points -= allocatedAttributePoints;
    return points;
  });

  // --- ACTIONS ---

  async function persistCustomData() {
    const helper = getTavernHelper();
    if (!helper) {
      console.error("【创世神殿】无法连接到酒馆助手，数据无法持久化。");
      return;
    }
    const dataToSave: DADCustomData = {
      worlds: creationData.value.worlds.filter(item => item.source === 'cloud'),
      talentTiers: creationData.value.talentTiers.filter(item => item.source === 'cloud'),
      origins: creationData.value.origins.filter(item => item.source === 'cloud'),
      spiritRoots: creationData.value.spiritRoots.filter(item => item.source === 'cloud'),
      talents: creationData.value.talents.filter(item => item.source === 'cloud'),
    };
    
    // 云端创世数据存储到全局变量，不影响角色存档
    await helper.insertOrAssignVariables({ 
      'DAD_creationData': dataToSave 
    }, { type: 'global' });
    
    console.log("【创世神殿】云端创世数据已存入全局变量。");
  }

  async function createEmptyPayload(): Promise<CharacterCreationPayload> {
    // 尝试获取当前用户名字
    let character_name = '';
    try {
      const userName = await getCurrentCharacterName();
      character_name = userName || '';
    } catch (error) {
      console.warn('获取用户名字失败:', error);
      character_name = '';
    }
    
    return {
      gender: '男',
      character_name: character_name,
      world_id: '',
      talent_tier_id: '',
      current_age: 18,
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
      if (userName) {
        characterPayload.value.character_name = userName;
        console.log("【创世神殿】已获取用户道号:", userName);
      }
    } catch (error) {
      console.warn('【创世神殿】获取用户道号失败:', error);
    }

    try {
      if (currentMode === 'single') {
        console.log("【创世神殿】初始化单机模式，仅加载本地数据。");
        creationData.value.worlds = LOCAL_WORLDS.map(w => ({ ...w, source: 'local' }));
        creationData.value.talentTiers = LOCAL_TALENT_TIERS.map(t => ({ ...t, source: 'local' }));
        creationData.value.origins = LOCAL_ORIGINS.map(o => ({ ...o, source: 'local' }));
        creationData.value.spiritRoots = LOCAL_SPIRIT_ROOTS.map(s => ({ ...s, source: 'local' }));
        creationData.value.talents = LOCAL_TALENTS.map(t => ({ ...t, source: 'local' }));
      } else {
        console.log("【创世神殿】初始化联机模式，加载本地及缓存的云端数据。");
        const helper = getTavernHelper();
        let savedData: DADCustomData = { worlds: [], talentTiers: [], origins: [], spiritRoots: [], talents: [] };
        if (helper) {
          const globalVars = await helper.getVariables({ type: 'global' });
          const potentialData = globalVars?.['DAD_creationData'];
          if (isDADCustomData(potentialData)) {
            savedData = potentialData;
            console.log("【创世神殿】从全局变量中加载了已缓存的云端创世数据。");
          }
        }

        const localWorlds = LOCAL_WORLDS.map(w => ({ ...w, source: 'local' as DataSource }));
        const localTalentTiers = LOCAL_TALENT_TIERS.map(t => ({ ...t, source: 'local' as DataSource }));
        const localOrigins = LOCAL_ORIGINS.map(o => ({ ...o, source: 'local' as DataSource }));
        const localSpiritRoots = LOCAL_SPIRIT_ROOTS.map(s => ({ ...s, source: 'local' as DataSource }));
        const localTalents = LOCAL_TALENTS.map(t => ({ ...t, source: 'local' as DataSource }));

        const savedCloudWorlds = savedData.worlds.map(w => ({...w, source: 'cloud' as DataSource}));
        const savedCloudTalentTiers = savedData.talentTiers.map(t => ({...t, source: 'cloud' as DataSource}));
        const savedCloudOrigins = savedData.origins.map(o => ({...o, source: 'cloud' as DataSource}));
        const savedCloudSpiritRoots = savedData.spiritRoots.map(s => ({...s, source: 'cloud' as DataSource}));
        const savedCloudTalents = savedData.talents.map(t => ({...t, source: 'cloud' as DataSource}));
        
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
      }
    } catch (e) {
      console.error("加载数据失败:", e);
      error.value = "加载数据失败";
      creationData.value.worlds = LOCAL_WORLDS.map(w => ({ ...w, source: 'local' }));
      creationData.value.talentTiers = LOCAL_TALENT_TIERS.map(t => ({ ...t, source: 'local' }));
      creationData.value.origins = LOCAL_ORIGINS.map(o => ({ ...o, source: 'local' }));
      creationData.value.spiritRoots = LOCAL_SPIRIT_ROOTS.map(s => ({ ...s, source: 'local' }));
      creationData.value.talents = LOCAL_TALENTS.map(t => ({ ...t, source: 'local' }));
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
      console.log("【创世神殿】成功获取云端世界数据:", cloudWorlds);
      
      const cloudWorldsWithSource = cloudWorlds.map(w => ({ ...w, source: 'cloud' as DataSource }));
      
      // 合并云端和本地数据，本地为主
      const localWorlds = LOCAL_WORLDS.map(w => ({ ...w, source: 'local' as DataSource }));
      const worldMap = new Map<number, WorldWithSource>();
      cloudWorldsWithSource.forEach(w => worldMap.set(w.id, w)); // 先添加云端数据
      localWorlds.forEach(w => worldMap.set(w.id, w)); // 本地数据覆盖同ID的云端数据（本地为主）

      creationData.value.worlds = Array.from(worldMap.values());
      console.log("【创世神殿】世界列表已更新:", creationData.value.worlds.length, "个世界");
      console.log("【创世神殿】云端世界:", creationData.value.worlds.filter(w => w.source === 'cloud'));
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

      // 转换为带source标记的数据
      const cloudWorldsWithSource = cloudWorlds.map(w => ({ ...w, source: 'cloud' as DataSource }));
      const cloudTalentTiersWithSource = cloudTalentTiers.map(t => ({ ...t, source: 'cloud' as DataSource }));
      const cloudOriginsWithSource = cloudOrigins.map(o => ({ ...o, source: 'cloud' as DataSource }));
      const cloudSpiritRootsWithSource = cloudSpiritRoots.map(s => ({ ...s, source: 'cloud' as DataSource }));
      const cloudTalentsWithSource = cloudTalents.map(t => ({ ...t, source: 'cloud' as DataSource }));
      
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
      console.log("【创世神殿】最终数据验证:");
      console.log("- 世界 (云端):", creationData.value.worlds.filter(w => w.source === 'cloud').length);
      console.log("- 天资 (云端):", creationData.value.talentTiers.filter(t => t.source === 'cloud').length);
      console.log("- 出身 (云端):", creationData.value.origins.filter(o => o.source === 'cloud').length);
      console.log("- 灵根 (云端):", creationData.value.spiritRoots.filter(s => s.source === 'cloud').length);
      console.log("- 天赋 (云端):", creationData.value.talents.filter(t => t.source === 'cloud').length);
      console.log("【创世神殿】天资数据示例:", creationData.value.talentTiers.slice(0, 3).map(t => ({ name: t.name, source: t.source })));
      
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
      console.error("【创世神殿】获取云端创世数据失败:", e);
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
    const source = isLocalCreation.value ? 'local' : 'cloud';
    creationData.value.worlds.unshift({ ...world, source });
  }
  function addTalentTier(tier: TalentTier) {
    const source = isLocalCreation.value ? 'local' : 'cloud';
    creationData.value.talentTiers.unshift({ ...tier, source });
  }
  function addOrigin(origin: Origin) {
    const source = isLocalCreation.value ? 'local' : 'cloud';
    creationData.value.origins.unshift({ ...origin, source });
  }
  function addSpiritRoot(root: SpiritRoot) {
    const source = isLocalCreation.value ? 'local' : 'cloud';
    creationData.value.spiritRoots.unshift({ ...root, source });
  }
  function addTalent(talent: Talent) {
    const source = isLocalCreation.value ? 'local' : 'cloud';
    creationData.value.talents.unshift({ ...talent, source });
  }

  function addGeneratedData(type: string, data: any) {
    switch (type) {
      case 'world': addWorld(data as World); break;
      case 'talent_tier': addTalentTier(data as TalentTier); break;
      case 'origin': addOrigin(data as Origin); break;
      case 'spirit_root': addSpiritRoot(data as SpiritRoot); break;
      case 'talent': addTalent(data as Talent); break;
      default: console.warn(`Unknown data type for addGeneratedData: ${type}`);
    }
  }
  
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
  function setWorldGenerationConfig(config: any) {
    worldGenerationConfig.value = { ...worldGenerationConfig.value, ...config };
  }
  async function resetOnExit() { await resetCharacter(); mode.value = 'single'; isLocalCreation.value = true; }
  async function startLocalCreation() { await resetCharacter(); isLocalCreation.value = true; mode.value = 'single'; }
  async function startCloudCreation() { await resetCharacter(); isLocalCreation.value = false; mode.value = 'cloud'; }

  return {
    mode, isLoading, error, creationData, characterPayload, currentStep, isLocalCreation, initialGameMessage, worldGenerationConfig,
    totalSteps, attributes, selectedWorld, selectedTalentTier, selectedOrigin, selectedSpiritRoot, selectedTalents, remainingTalentPoints,
    initializeStore, fetchCloudWorlds, fetchAllCloudData, addWorld, addTalentTier, addOrigin, addSpiritRoot, addTalent, addGeneratedData,
    selectWorld, selectTalentTier, selectOrigin, selectSpiritRoot, toggleTalent, setAttribute,
    resetCharacter, nextStep, prevStep, goToStep, setMode, toggleLocalCreation, setInitialGameMessage, setWorldGenerationConfig,
    resetOnExit, startLocalCreation, startCloudCreation, persistCustomData,
  };
});