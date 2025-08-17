import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  CharacterCreationData,
  World,
  TalentTier,
  Origin,
  SpiritRoot,
  Talent,
  CharacterCreationPayload,
  AttributeKey,
} from '../types';
import { loadGameData, saveGameData } from '../utils/tavern';
import { request } from '../services/request';
import {
  LOCAL_WORLDS,
  LOCAL_TALENT_TIERS,
  LOCAL_ORIGINS,
  LOCAL_SPIRIT_ROOTS,
  LOCAL_TALENTS,
} from '../data/creationData';

const TOTAL_STEPS = 7;

export const useCharacterCreationStore = defineStore('characterCreation', () => {
  // =======================================================================
  //                                 STATE
  // =======================================================================

  const mode = ref<'single' | 'cloud'>('single');
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  // 核心数据状态 (世界、天赋等可选列表)
  const creationData = ref<CharacterCreationData>({
    worlds: [],
    talentTiers: [],
    origins: [],
    spiritRoots: [],
    talents: [],
  });

  // 玩家当前创建角色的数据载荷
  const characterPayload = ref<CharacterCreationPayload>(createEmptyPayload());

  // UI 状态
  const currentStep = ref(1);
  const isLocalCreation = ref(true); // 全局开关，决定创角行为是本地还是联机

  // =======================================================================
  //                                GETTERS
  // =======================================================================

  const totalSteps = computed(() => TOTAL_STEPS);
  const attributes = computed(() => {
    return {
      root_bone: characterPayload.value.root_bone,
      spirituality: characterPayload.value.spirituality,
      comprehension: characterPayload.value.comprehension,
      fortune: characterPayload.value.fortune,
      charm: characterPayload.value.charm,
      temperament: characterPayload.value.temperament,
    };
  });

  const selectedWorld = computed(() => 
    creationData.value.worlds.find(w => w.id === characterPayload.value.world_id) || null
  );

  const selectedTalentTier = computed(() =>
    creationData.value.talentTiers.find(t => t.id === characterPayload.value.talent_tier_id) || null
  );

  const selectedOrigin = computed(() =>
    creationData.value.origins.find(o => o.id === characterPayload.value.origin_id) || null
  );

  const selectedSpiritRoot = computed(() =>
    creationData.value.spiritRoots.find(s => s.id === characterPayload.value.spirit_root_id) || null
  );

  const selectedTalents = computed(() =>
    creationData.value.talents.filter(t => characterPayload.value.selected_talent_ids.includes(t.id))
  );

  const remainingTalentPoints = computed(() => {
    if (!selectedTalentTier.value) return 0;
    
    let points = selectedTalentTier.value.total_points;
    if (selectedOrigin.value) {
      points -= selectedOrigin.value.talent_cost;
    }
    if (selectedSpiritRoot.value) {
      points -= selectedSpiritRoot.value.talent_cost;
    }
    points -= selectedTalents.value.reduce((total, talent) => total + talent.talent_cost, 0);
    
    const allocatedAttributePoints = Object.values(attributes.value).reduce((sum, val) => sum + val, 0);
    points -= allocatedAttributePoints;

    return points;
  });

  // =======================================================================
  //                                ACTIONS
  // =======================================================================

  function createEmptyPayload(): CharacterCreationPayload {
    return {
      character_name: '',
      world_id: '',
      talent_tier_id: '',
      birth_age: 18,
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

  async function initializeStore(mode: 'single' | 'cloud') {
    isLoading.value = true;
    error.value = null;
    
    // 初始化前先清空，确保模式切换时状态纯净
    creationData.value = {
      worlds: [],
      talentTiers: [],
      origins: [],
      spiritRoots: [],
      talents: [],
    };

    // 辅助函数，用于合并和去重数组，处理类型安全
    const mergeAndDeduplicate = <T extends { id: string | number, source?: string }>(
      savedItems: T[] | undefined,
      localItems: ReadonlyArray<Omit<T, 'source'>>
    ): T[] => {
      const itemMap = new Map<string | number, T>();

      // 1. 添加本地数据，并明确赋予 'local' source
      localItems.forEach(item => {
        const newItem = { ...item, source: 'local' } as T;
        itemMap.set(item.id, newItem);
      });

      // 2. 如果有从酒馆保存的数据，用它们来覆盖或添加
      if (savedItems) {
        savedItems.forEach(item => {
          // 确保保存的数据也有 source 属性，若无则默认为 tavern
          const newItem = { ...item, source: item.source || 'tavern' } as T;
          itemMap.set(item.id, newItem);
        });
      }

      return Array.from(itemMap.values());
    };

    try {
      const savedData = await loadGameData();

      if (mode === 'single') {
        console.log('Initializing store for single player mode.');
        // 单人模式：合并本地预设数据和玩家在酒馆中AI生成的数据
        creationData.value.worlds = mergeAndDeduplicate(savedData.worlds, LOCAL_WORLDS);
        creationData.value.talentTiers = mergeAndDeduplicate(savedData.talentTiers, LOCAL_TALENT_TIERS);
        creationData.value.origins = mergeAndDeduplicate(savedData.origins, LOCAL_ORIGINS);
        creationData.value.spiritRoots = mergeAndDeduplicate(savedData.spiritRoots, LOCAL_SPIRIT_ROOTS);
        creationData.value.talents = mergeAndDeduplicate(savedData.talents, LOCAL_TALENTS);
      } else {
        // 云端模式：从后端获取公共数据，并与玩家自建数据合并
        console.log('Initializing store for cloud mode. Fetching data from server...');
        
        // 并行获取所有公共创角数据
        const [
          publicWorlds,
          publicTalentTiers,
          publicOrigins,
          publicSpiritRoots,
          publicTalents,
        ] = await Promise.all([
          request<World[]>('/api/v1/worlds'),
          request<TalentTier[]>('/api/v1/talent_tiers'),
          request<Origin[]>('/api/v1/origins'),
          request<SpiritRoot[]>('/api/v1/spirit_roots'),
          request<Talent[]>('/api/v1/talents'),
        ]);

        // 将'cloud'源标签添加到公共数据
        const markSource = <T>(items: T[], source: string): (T & { source: string })[] =>
          items.map(item => ({ ...item, source }));

        // 合并公共数据（来自云端）和私有数据（来自酒馆存储）
        creationData.value.worlds = mergeAndDeduplicate(savedData.worlds, markSource(publicWorlds, 'cloud'));
        creationData.value.talentTiers = mergeAndDeduplicate(savedData.talentTiers, markSource(publicTalentTiers, 'cloud'));
        creationData.value.origins = mergeAndDeduplicate(savedData.origins, markSource(publicOrigins, 'cloud'));
        creationData.value.spiritRoots = mergeAndDeduplicate(savedData.spiritRoots, markSource(publicSpiritRoots, 'cloud'));
        creationData.value.talents = mergeAndDeduplicate(savedData.talents, markSource(publicTalents, 'cloud'));
      }
    } catch (e) {
      console.error("加载游戏数据失败:", e);
      error.value = "加载数据时发生错误，已使用默认本地数据。";
      // 发生任何错误都回退到本地数据
      creationData.value.worlds = LOCAL_WORLDS.map(w => ({ ...w, source: 'local' }));
      creationData.value.talentTiers = LOCAL_TALENT_TIERS.map(t => ({ ...t, source: 'local' }));
      creationData.value.origins = LOCAL_ORIGINS.map(o => ({ ...o, source: 'local' }));
      creationData.value.spiritRoots = LOCAL_SPIRIT_ROOTS.map(s => ({ ...s, source: 'local' }));
      creationData.value.talents = LOCAL_TALENTS.map(t => ({ ...t, source: 'local' }));
    } finally {
      isLoading.value = false;
    }
  }

  // --- Data Persistence Actions ---
  function addWorld(world: World) {
    creationData.value.worlds.unshift(world);
  }
  function addTalentTier(tier: TalentTier) {
    creationData.value.talentTiers.unshift(tier);
  }
  function addOrigin(origin: Origin) {
    creationData.value.origins.unshift(origin);
  }
  function addSpiritRoot(root: SpiritRoot) {
    creationData.value.spiritRoots.unshift(root);
  }
  function addTalent(talent: Talent) {
    creationData.value.talents.unshift(talent);
  }

  // --- Generic Action for AI-generated data ---
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
  
  // --- Character Payload Actions ---
  function selectWorld(worldId: number | '') {
    characterPayload.value.world_id = worldId;
  }
  
  function selectTalentTier(tierId: number | '') {
    characterPayload.value.talent_tier_id = tierId;
    // 重置依赖天资等级的选择
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

  function selectOrigin(originId: number | null) {
    characterPayload.value.origin_id = originId;
  }

  function selectSpiritRoot(rootId: number | null) {
    characterPayload.value.spirit_root_id = rootId;
  }

  function toggleTalent(talentId: number) {
    const index = characterPayload.value.selected_talent_ids.indexOf(talentId);
    if (index > -1) {
      characterPayload.value.selected_talent_ids.splice(index, 1);
    } else {
      characterPayload.value.selected_talent_ids.push(talentId);
    }
  }
  
  function setAttribute(key: AttributeKey, value: number) {
    if (key in characterPayload.value) {
      characterPayload.value[key] = value;
    }
  }

  function resetCharacter() {
    characterPayload.value = createEmptyPayload();
    currentStep.value = 1;
  }

  // --- Navigation Actions ---
  function nextStep() {
    if (currentStep.value < TOTAL_STEPS) {
      currentStep.value++;
    }
  }

  function prevStep() {
    if (currentStep.value > 1) {
      currentStep.value--;
    }
  }

  function goToStep(step: number) {
    if (step >= 1 && step <= TOTAL_STEPS) {
      currentStep.value = step;
    }
  }

  function setMode(newMode: 'single' | 'cloud') {
    mode.value = newMode;
    // 同步设置 isLocalCreation 状态
    isLocalCreation.value = (newMode === 'single');
    console.log(`Mode set to: ${newMode}, isLocalCreation: ${isLocalCreation.value}`);
  }

  function toggleLocalCreation() {
    isLocalCreation.value = !isLocalCreation.value;
  }

  // 当用户退出创角流程时调用，以防止状态污染
  function resetOnExit() {
    resetCharacter(); // 重置角色选择和步骤
    mode.value = 'single'; // 将模式重置回默认值
    isLocalCreation.value = true; // 将创角模式也重置回默认的本地模式
  }

  // --- 新的入口 Actions ---
  function startLocalCreation() {
    console.log('Starting LOCAL creation process...');
    resetCharacter(); // 确保从一个干净的状态开始
    isLocalCreation.value = true;
    mode.value = 'single'; // 保持同步
  }

  function startCloudCreation() {
    console.log('Starting CLOUD creation process...');
    resetCharacter(); // 确保从一个干净的状态开始
    isLocalCreation.value = false;
    mode.value = 'cloud'; // 保持同步
  }

  return {
    // State
    mode,
    isLoading,
    error,
    creationData,
    characterPayload,
    currentStep,
    isLocalCreation,
    // Getters
    totalSteps,
    attributes,
    selectedWorld,
    selectedTalentTier,
    selectedOrigin,
    selectedSpiritRoot,
    selectedTalents,
    remainingTalentPoints,
    // Actions
    initializeStore,
    addWorld,
    addTalentTier,
    addOrigin,
    addSpiritRoot,
    addTalent,
    addGeneratedData,
    selectWorld,
    selectTalentTier,
    selectOrigin,
    selectSpiritRoot,
    toggleTalent,
    setAttribute,
    resetCharacter,
    nextStep,
    prevStep,
    goToStep,
    setMode,
    toggleLocalCreation,
    resetOnExit,
    startLocalCreation,
    startCloudCreation,
  };
});