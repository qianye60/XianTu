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
            :character-data="finalCharacterSheet"
          />
        </section>
      </main>

      <footer class="creation-footer">
        <button @click="handleBack" class="btn btn-secondary">
          {{ currentStep === 1 ? '返回道途' : '上一步' }}
        </button>
        <button v-if="currentStep < steps.length" @click="currentStep++" class="btn">下一步</button>
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
} from '@/core/rules/characterCreation'

// Import modular components
import BirthOriginSelector from '@/components/character-creation/BirthOriginSelector.vue'
import SpiritRootSelector from '@/components/character-creation/SpiritRootSelector.vue'
import TalentSelectorImproved from '@/components/character-creation/TalentSelectorImproved.vue'
import CharacterPreview from '@/components/character-creation/CharacterPreview.vue'
import StepIndicator from '@/components/shared/StyledStepIndicator.vue'
import WorldBackgroundSelector from '@/components/character-creation/WorldBackgroundSelector.vue'
import AttributeAllocatorImproved from '@/components/character-creation/AttributeAllocatorImproved.vue'
import ThemeSwitcher from '@/components/shared/ThemeSwitcher.vue'

// --- Props & Emits ---
const props = defineProps<{
  characterName: string
  steps: Array<{ id: string; name: string; icon: string }>
  worlds: World[]
  origins: Origin[]
  talents: Talent[]
  spiritRoots: SpiritRoot[]
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
  origin: Origin | null;
  'spirit-root': SpiritRoot | null;
  talents: Talent[];
  attributes: any;
  preview: any;
}

const stepModels = reactive<StepModels>({
  world: null,
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
  justify-content: center; /* 垂直居中 */
  align-items: center; /* 水平居中 */
  width: 100%;
  min-height: 100vh; /* 确保容器至少与视口等高 */
  /* padding: 2rem; -- 遵道友法旨，移除内边距 */
  box-sizing: border-box;
  /* 背景已由 App.vue 的视频天幕接管，此处不再需要 */
}

.creation-content {
  width: 100%;
  max-width: 960px;
  /* 移除固定的高度限制，让其随内容自适应 */
  padding: 2rem;
  background-color: rgba(var(--color-surface-rgb), 0.85);
  border: 1px solid rgba(var(--color-border-rgb), 0.5);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
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
  text-shadow: 0 0 20px var(--color-primary-hover);
}

.subtitle-text {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.creation-steps {
  flex-grow: 1; /* 仍然占据主要空间 */
  /* 移除 overflow-y: auto，不再需要内部滚动 */
  min-height: 0; /* Flexbox hack for overflow */
}

.step-section {
  padding-top: 1rem;
  padding-bottom: 2rem;
  animation: fadeIn 0.6s ease-out;
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
