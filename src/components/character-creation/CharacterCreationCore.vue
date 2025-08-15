<template>
  <div class="creation-container">
    <div v-if="isLoading" class="loading-overlay">
      <p>{{ loadingText }}</p>
    </div>
    <div v-else class="creation-content">
      <header class="creation-header">
        <div class="header-top">
          <div class="header-spacer"></div>
          <div class="header-center">
            <p class="title-text">【 天道筑基，化凡入圣 】</p>
            <p class="subtitle-text">道友，请择汝之道途，塑汝之仙身。</p>
          </div>
          <div class="header-actions">
            <ThemeSwitcher />
          </div>
        </div>
        <!-- 插槽：用于放置模式特定的头部内容，如同步按钮或兑换码 -->
        <slot name="header-extension"></slot>
      </header>

      <main class="creation-steps" v-if="props.worlds && props.worlds.length > 0">
        <!-- 插槽：用于放置步骤前的额外面板，如自定义规则 -->
        <slot name="pre-steps"></slot>

        <StepIndicator :current-step="currentStep" :steps="steps" @update:currentStep="(newStep) => (currentStep = newStep)" />

        <!-- Step Dynamic Content -->
        <section v-if="currentStepComponent" class="step-section">
          <component
            :is="currentStepComponent"
            :key="componentKey"
            v-model="stepModels[currentStepId]"
            :backgrounds="props.worlds"
            :origins="props.origins"
            :spirit-roots="props.spiritRoots"
            :talents="props.talents"
            :talent-tiers="props.talentTiers"
            :talent-tier="stepModels['talent-tier']"
            :character-data="finalCharacterSheet"
          />
        </section>
      </main>

      <footer class="creation-footer">
        <button
          @click="handleBack"
          class="btn btn-secondary"
          :disabled="isLoading"
        >
          {{ currentStep === 1 ? '返回道途' : '上一步' }}
        </button>
        <button
          v-if="currentStep < steps.length"
          @click="currentStep++"
          class="btn"
          :disabled="isLoading"
        >
          下一步
        </button>
        <button
          v-if="currentStep === steps.length"
          class="btn btn-complete"
          :disabled="!isCreationComplete"
          @click="onFinalize"
        >
          完成创生，开启道途
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, shallowRef, reactive, toRef, type Component } from 'vue'
import { useCharacterSheetBuilder } from '@/composables/useCharacterCalculations'
import {
  type World,
  type Origin,
  type Talent,
  type SpiritRoot,
  type CharacterSheet,
  type TalentTier,
} from '@/core/rules/characterCreation'

// Import modular components
import BirthOriginSelector from '@/components/character-creation/BirthOriginSelector.vue'
import SpiritRootSelector from '@/components/character-creation/SpiritRootSelector.vue'
import TalentSelectorImproved from '@/components/character-creation/TalentSelectorImproved.vue'
import CharacterPreview from '@/components/character-creation/CharacterPreview.vue'
import StepIndicator from '@/components/shared/StyledStepIndicator.vue'
import WorldBackgroundSelector from '@/components/character-creation/WorldBackgroundSelector.vue'
import AttributeAllocatorImproved from '@/components/character-creation/AttributeAllocatorImproved.vue'
import TalentTierSelector from '@/components/character-creation/TalentTierSelector.vue'
import ThemeSwitcher from '@/components/shared/ThemeSwitcher.vue'

// --- Props & Emits ---
const props = defineProps<{
  characterName: string
  steps: Array<{ id: string; name: string; icon: string }>
  worlds: World[]
  origins: Origin[]
  talents: Talent[]
  spiritRoots: SpiritRoot[]
  talentTiers: TalentTier[]
  isLoading?: boolean
  loadingText?: string
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'finalize', characterSheet: CharacterSheet): void
}>()

// --- Component Map ---
const componentMap: Record<string, Component> = {
  world: WorldBackgroundSelector,
  'talent-tier': TalentTierSelector,
  origin: BirthOriginSelector,
  'spirit-root': SpiritRootSelector,
  talents: TalentSelectorImproved,
  attributes: AttributeAllocatorImproved,
  preview: CharacterPreview,
}

// --- Stepper State ---
const currentStep = ref(1)
const componentKey = ref(0)

// --- Form State Models ---
interface StepModels {
  world: World | null;
  'talent-tier': TalentTier | null;
  origin: Origin | null;
  'spirit-root': SpiritRoot | null;
  talents: Talent[];
  attributes: any;
  preview: any;
}

const stepModels = reactive<StepModels>({
  world: null,
  'talent-tier': null,
  origin: null,
  'spirit-root': null,
  talents: [],
  attributes: null,
  preview: null,
})

// --- Watchers to set default selections ---
watch(
  () => props.origins,
  (newOrigins) => {
    if (!stepModels.origin && newOrigins && newOrigins.length > 0) {
      stepModels.origin = newOrigins[0]
    }
  },
  { immediate: true }
)

watch(
  () => props.worlds,
  (newWorlds) => {
    if (newWorlds && newWorlds.length > 0 && !stepModels.world) {
      stepModels.world = newWorlds[0];
      componentKey.value++;
    }
  },
  { immediate: true }
)

watch(
  () => props.spiritRoots,
  (newRoots) => {
    if (newRoots && newRoots.length > 0 && !stepModels['spirit-root']) {
      stepModels['spirit-root'] = newRoots[0];
      componentKey.value++;
    }
  },
  { immediate: true }
)

watch(
  () => props.talents,
  (newTalents) => {
    // Talents are multi-select, so we don't set a default
    // but we still need to trigger a re-render when the data arrives.
    if (newTalents && newTalents.length > 0) {
       componentKey.value++;
    }
  },
  { immediate: true }
)

watch(
  () => props.talentTiers,
  (newTiers) => {
    if (newTiers && newTiers.length > 0 && !stepModels['talent-tier']) {
      // Select the most common tier (highest rarity number) by default
      const defaultTier = [...newTiers].sort((a, b) => b.rarity - a.rarity)[0]
      stepModels['talent-tier'] = defaultTier;
      componentKey.value++;
    }
  },
  { immediate: true }
)

// --- Use the Character Sheet Builder Composable ---
const { finalCharacterSheet, isCreationComplete } = useCharacterSheetBuilder(
  toRef(props, 'characterName'),
  toRef(stepModels, 'origin'),
  toRef(stepModels, 'spirit-root'),
  toRef(stepModels, 'talents')
)

// --- Computed Properties ---
const currentStepId = computed(() => props.steps[currentStep.value - 1]?.id as keyof StepModels)
const currentStepComponent = computed(() => {
  const stepId = props.steps[currentStep.value - 1]?.id
  return componentMap[stepId] || null
})

// --- Methods ---
const handleBack = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  } else {
    // 立即触发返回，无需额外延迟
    emit('back')
  }
}

const onFinalize = () => {
  if (!isCreationComplete.value) return
  emit('finalize', finalCharacterSheet.value)
}
</script>

<style scoped>
/* Styles are largely copied from CharacterCreationFinal.vue for consistency */
.creation-container {
  display: flex;
  flex-direction: column;
  justify-content: flex-start; /* 改为顶部对齐，避免内容过长时居中导致顶部被截断 */
  align-items: center; /* 水平居中 */
  width: 100%;
  min-height: 100vh; /* 确保容器至少与视口等高 */
  padding: 2rem 1rem; /* 添加适当的内边距 */
  box-sizing: border-box;
  overflow-y: auto; /* 允许垂直滚动 */
  overflow-x: hidden; /* 禁止横向滚动 */
  /* 背景已由 App.vue 的视频天幕接管，此处不再需要 */
}

/* 美化滚动条 */
.creation-container::-webkit-scrollbar {
  width: 8px;
}

.creation-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.creation-container::-webkit-scrollbar-thumb {
  background: rgba(var(--color-primary-rgb), 0.3);
  border-radius: 4px;
}

.creation-container::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--color-primary-rgb), 0.5);
}

.creation-content {
  width: 100%;
  max-width: 960px;
  max-height: calc(100vh - 4rem); /* 限制最大高度，留出上下边距 */
  padding: 2rem;
  /* 深色半透明背景，确保文字在任何主题下都清晰 */
  background: linear-gradient(135deg, rgba(30, 40, 50, 0.9) 0%, rgba(20, 30, 40, 0.95) 100%);
  border: 1px solid rgba(var(--color-primary-rgb), 0.3);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(15px);
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 防止内容溢出 */
}

.loading-overlay {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 1.5rem;
  color: var(--color-text-secondary);
  font-family: var(--font-family-serif);
}

.creation-header {
  flex-shrink: 0; /* 防止头部被压缩 */
  margin-bottom: 1rem;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.header-spacer {
  width: 44px;
}

.header-center {
  flex: 1;
  text-align: center;
}

.header-actions {
  display: flex;
  align-items: center;
  width: 44px;
  justify-content: center;
}

.title-text {
  font-family: var(--font-family-serif);
  font-size: 2.2rem;
  color: var(--color-primary);
  margin: 0 0 0.5rem 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5), 0 0 20px rgba(var(--color-primary-rgb), 0.3);
}

.subtitle-text {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  margin: 0;
}

.creation-steps {
  flex-grow: 1; /* 仍然占据主要空间 */
  overflow-y: auto; /* 允许内容区域滚动 */
  overflow-x: hidden; /* 禁止横向滚动 */
  min-height: 0; /* Flexbox hack for overflow */
  padding-right: 0.5rem; /* 为滚动条留出空间 */
}

/* 美化步骤区域的滚动条 */
.creation-steps::-webkit-scrollbar {
  width: 6px;
}

.creation-steps::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.creation-steps::-webkit-scrollbar-thumb {
  background: rgba(var(--color-primary-rgb), 0.3);
  border-radius: 3px;
}

.creation-steps::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--color-primary-rgb), 0.5);
}

.step-section {
  padding-top: 1rem;
  padding-bottom: 2rem;
  animation: fadeIn 0.3s ease-out; /* 气机流转更为迅捷，缩短动画时长 */
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.creation-footer {
  flex-shrink: 0; /* 防止尾部被压缩 */
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-top: auto; /* 将其推到底部 */
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}
</style>
