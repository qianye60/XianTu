import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// 根据后端接口API.json定义的数据结构
export interface World {
  id: number;
  name: string;
  description: string | null;
  era: string | null;
}

export interface TalentTier {
  id: number;
  name: string;
  description: string | null;
  total_points: number;
  rarity: number;
  color: string;
}

export interface Origin {
  id: number;
  name: string;
  description: string | null;
  attribute_modifiers: Record<string, any> | null;
  talent_cost: number;
}

export interface SpiritRoot {
  id: number;
  name: string;
  description: string | null;
  base_multiplier: number;
  talent_cost: number;
}

export interface Talent {
  id: number;
  name: string;
  description: string | null;
  effects: any | null;
  rarity: number;
  talent_cost: number;
}

export const useCharacterCreationStore = defineStore('characterCreation', () => {
  // --- 核心状态 ---
  const mode = ref<'single' | 'multi'>('single');
  const currentStep = ref(1);
  const totalSteps = 7; // 1:世界, 2:天资, 3:出身, 4:灵根, 5:天赋, 6:六司, 7:预览

  // --- 玩家选择 ---
  // 尝试从酒馆获取用户名，如果失败则使用localStorage或默认值
  const getCharacterName = () => {
    try {
      // 首先尝试从酒馆获取
      if (typeof window !== 'undefined' && (window as any).SillyTavern) {
        const username = (window as any).SillyTavern.getContext()?.name1;
        if (username) return username;
      }
    } catch (e) {
      console.log('无法从酒馆获取道号');
    }
    
    // 其次从localStorage获取
    const storedName = localStorage.getItem('username');
    if (storedName) return storedName;
    
    // 最后使用默认值
    return '无名道人';
  };
  
  const characterName = ref(getCharacterName());
  const selectedWorld = ref<World | null>(null);
  const selectedTalentTier = ref<TalentTier | null>(null);
  const selectedOrigin = ref<Origin | null>(null);
  const selectedSpiritRoot = ref<SpiritRoot | null>(null);
  const selectedTalents = ref<Talent[]>([]);
  const attributes = ref({
    root_bone: 0,     // 初始都是0
    spirituality: 0,
    comprehension: 0,
    luck: 0,          // 气运
    charm: 0,
    temperament: 0,
  });
  
  // --- 资源管理 ---
  const talentPoints = ref(0); // 由天资等级决定的天赋点数

  const remainingTalentPoints = computed(() => {
    const originCost = selectedOrigin.value?.talent_cost ?? 0;
    const spiritRootCost = selectedSpiritRoot.value?.talent_cost ?? 0;
    const talentsCost = selectedTalents.value.reduce((sum, t) => sum + t.talent_cost, 0);
    const attributeCost = Object.values(attributes.value).reduce((sum, val) => sum + val, 0);
    return talentPoints.value - originCost - spiritRootCost - talentsCost - attributeCost;
  });

  // --- 法诀 (Actions) ---
  function setMode(newMode: 'single' | 'multi') {
    mode.value = newMode;
  }

  function nextStep() {
    if (currentStep.value < totalSteps) currentStep.value++;
  }

  function prevStep() {
    if (currentStep.value > 1) currentStep.value--;
  }

  function goToStep(step: number) {
    if (step > 0 && step <= totalSteps) currentStep.value = step;
  }

  function reset() {
      currentStep.value = 1;
      characterName.value = getCharacterName(); // 重新获取道号
      selectedWorld.value = null;
      selectedTalentTier.value = null;
      selectedOrigin.value = null;
      selectedSpiritRoot.value = null;
      selectedTalents.value = [];
      talentPoints.value = 0;
      attributes.value = { root_bone: 0, spirituality: 0, comprehension: 0, luck: 0, charm: 0, temperament: 0 };
    }
  
    function applyRedemptionData(data: any) {
      // 根据兑换码返回的数据，有选择性地覆盖当前状态
      // 这里假设返回的数据结构是 { origins?: Origin[], talents?: Talent[] ... }
      if (data.origins && data.origins.length > 0) {
        // 简单起见，我们只取第一个作为“天赐出身”
        selectedOrigin.value = data.origins[0];
      }
      if (data.talents && data.talents.length > 0) {
        // 将兑换的天赋添加到已选天赋中，或进行替换
        selectedTalents.value = [...selectedTalents.value, ...data.talents];
      }
      if (data.spirit_roots && data.spirit_roots.length > 0) {
        selectedSpiritRoot.value = data.spirit_roots[0];
      }
      if (data.talent_tiers && data.talent_tiers.length > 0) {
          selectedTalentTier.value = data.talent_tiers[0];
          talentPoints.value = data.talent_tiers[0].total_points;
      }
      if (data.world_backgrounds && data.world_backgrounds.length > 0) {
          selectedWorld.value = data.world_backgrounds[0];
      }
    }
  
    return {
      mode,
      currentStep,
    totalSteps,
    characterName,
    selectedWorld,
    selectedTalentTier,
    selectedOrigin,
    selectedSpiritRoot,
    selectedTalents,
    attributes,
    talentPoints,
    remainingTalentPoints,
    setMode,
    nextStep,
    prevStep,
    goToStep,
    reset,
    applyRedemptionData,
  };
});