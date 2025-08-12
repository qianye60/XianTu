<template>
  <div class="creation-container">
    <div v-if="isLoading" class="loading-overlay">
      <p>天机推演中，正在为您接引命星，请稍候...</p>
    </div>
    <div v-else class="creation-content">
      <header class="creation-header">
        <p class="title-text">【 天道筑基，化凡入圣 】</p>
        <p class="subtitle-text">道友，请择汝之道途，塑汝之仙身。</p>
      </header>

      <main class="creation-steps">
        <StepIndicator :current-step="currentStep" :steps="steps" />

        <!-- Step 1: Origin -->
        <section v-if="currentStep === 1 && origins.length > 0" class="step-section">
          <BirthOriginSelector v-model="selectedOrigin" :origins="origins" />
        </section>

        <!-- Step 2: Spirit Root -->
        <section v-if="currentStep === 2" class="step-section">
          <SpiritRootSelector v-model="selectedSpiritRoot" :spirit-roots="spiritRoots" />
        </section>

        <!-- Step 3: Talents -->
        <section v-if="currentStep === 3" class="step-section">
          <TalentSelectorImproved v-model="selectedTalents" :talents="talents" />
        </section>

        <!-- Step 4: Preview -->
        <section v-if="currentStep === 4" class="step-section">
          <CharacterPreview :character-data="finalCharacterSheet" />
        </section>
      </main>

      <footer class="creation-footer">
        <button @click="$emit('back')" v-if="currentStep === 1" class="btn btn-secondary">
          返回选择模式
        </button>
        <button v-if="currentStep > 1" @click="currentStep--" class="btn btn-secondary">
          上一步
        </button>
        <button v-if="currentStep < steps.length" @click="currentStep++" class="btn">下一步</button>
        <button
          v-if="currentStep === steps.length"
          class="btn btn-complete"
          :disabled="!isCreationComplete"
          @click="finalizeCharacterCreation"
        >
          完成创生，开启道途
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getOrigins, getTalents, getSpiritRoots, createCharacter } from '@/services/api'
import { useAuth } from '@/composables/useAuth'
import {
  ATTRIBUTE_RULES,
  CoreAttribute,
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

declare const TavernHelper: any

// TODO: The world_id needs to be passed into this component, likely as a prop.
// For now, we'll assume a placeholder.
const props = defineProps<{
  worldId: number
}>()

const emit = defineEmits<{
  (e: 'back'): void
}>()

const { currentUser } = useAuth()

// Stepper state
const currentStep = ref(1)
const steps = [
  { id: 'origin', name: '择出身', icon: 'fas fa-scroll' },
  { id: 'spirit-root', name: '觅灵根', icon: 'fas fa-seedling' },
  { id: 'talents', name: '选天赋', icon: 'fas fa-star' },
  { id: 'preview', name: '观命盘', icon: 'fas fa-book-open' },
]

// Data holding refs
const origins = ref<Origin[]>([])
const talents = ref<Talent[]>([])
const spiritRoots = ref<SpiritRoot[]>([])
const isLoading = ref(true)

// Form state refs
const selectedOrigin = ref<Origin | null>(null)
const selectedTalents = ref<Talent[]>([])
const selectedSpiritRoot = ref<SpiritRoot | null>(null)

onMounted(async () => {
  isLoading.value = true
  try {
    const [originsData, talentsData, spiritRootsData] = await Promise.all([
      getOrigins(),
      getTalents(),
      getSpiritRoots(),
    ])

    origins.value = originsData
    talents.value = talentsData
    spiritRoots.value = spiritRootsData

    // Set default selections
    if (origins.value.length > 0) selectedOrigin.value = origins.value[0]
    if (spiritRoots.value.length > 0) selectedSpiritRoot.value = spiritRoots.value[0]
  } catch (error) {
    console.error('加载创角规则失败:', error)
    TavernHelper.toastr.error('从云端获取天道规则失败，请稍后重试。')
  } finally {
    isLoading.value = false
  }
})

// --- Logic Computeds ---
const isCreationComplete = computed(() => {
  return selectedOrigin.value && selectedSpiritRoot.value && selectedTalents.value.length > 0
})

const finalCharacterSheet = computed<CharacterSheet>(() => {
  const baseAttributes = ATTRIBUTE_RULES.reduce(
    (acc, rule) => {
      acc[rule.id] = 10 // 赋予基础值
      return acc
    },
    {} as Record<CoreAttribute, number>,
  )

  // 应用出身修正
  if (selectedOrigin.value?.attributeModifiers) {
    // 后端返回的已经是JSON对象，无需解析
    for (const key in selectedOrigin.value.attributeModifiers) {
      const attrKey = key as CoreAttribute
      const modifier =
        selectedOrigin.value.attributeModifiers[
          attrKey as keyof typeof selectedOrigin.value.attributeModifiers
        ]
      baseAttributes[attrKey] += modifier || 0
    }
  }

  // TODO: 应用天赋修正 (需要根据后端返回的 effects 结构进行适配)

  const finalAttrs = baseAttributes
  const origin = selectedOrigin.value
  const spiritRoot = selectedSpiritRoot.value
  const finalTalents = selectedTalents.value.map((t) => ({ ...t, level: 1 }))

  const generateFateVerdict = (): string => {
    if (!origin || !spiritRoot) return '天机混沌，命数未显...'

    const userName = currentUser.value?.user_name || '道友'
    let verdict = `${userName}，${origin.description} `
    verdict += `身具【${spiritRoot.name}】，此乃修行之基。`

    if (finalTalents.length > 0) {
      verdict += `更得天道垂青，与生便有“${finalTalents.map((t) => t.name).join('”、“')}”等天赋，仙路前景，已胜常人三分。`
    } else {
      verdict += `然未得天眷，无伴生天赋，仙路需倍加勤勉。`
    }
    return verdict
  }

  return {
    name: currentUser.value?.user_name || '无名者',
    origin: origin!,
    spiritRoot: spiritRoot!,
    talents: finalTalents,
    attributes: finalAttrs,
    description: generateFateVerdict(),
    memory_shards: [],
  }
})

const finalizeCharacterCreation = async () => {
  if (!isCreationComplete.value || !currentUser.value) {
    TavernHelper.toastr.error('道友，你的道途尚未完整或身份不明，请完成所有选择。')
    return
  }

  isLoading.value = true
  try {
    const characterDataPayload = {
      origin: selectedOrigin.value,
      talents: selectedTalents.value,
      spiritRoot: selectedSpiritRoot.value,
      attributes: finalCharacterSheet.value.attributes, // Will be properly calculated later
    }

    const newCharacter = await createCharacter({
      user_id: currentUser.value.id,
      world_id: props.worldId,
      character_name: currentUser.value.user_name, // Can be customized later
      character_data: characterDataPayload,
    })

    TavernHelper.toastr.success(`仙身【${newCharacter.character_name}】缔造成功！`)
    // TODO: Emit an event to App.vue to signify completion and move to the main game view.
  } catch (error: any) {
    TavernHelper.toastr.error(`缔造仙身失败: ${error.message}`)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
/* Scoped styles are copied from CharacterCreationFinal.vue */
.creation-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  width: 100%;
  padding: 2rem;
  box-sizing: border-box;
  background-color: var(--color-background);
}

.creation-content {
  width: 100%;
  max-width: 1000px;
  padding: 3rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
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
  text-align: center;
  margin-bottom: 3rem;
}

.title-text {
  font-family: var(--font-family-serif);
  font-size: 2.8rem;
  color: var(--color-primary);
  margin-bottom: 1rem;
  text-shadow: 0 0 20px var(--color-primary-hover);
}

.subtitle-text {
  font-size: 1.2rem;
  color: var(--color-text-secondary);
}

.step-section {
  margin-top: 2.5rem;
  margin-bottom: 2.5rem;
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
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
}
</style>
