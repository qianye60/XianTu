<template>
  <div class="creation-container">
    <div v-if="isLoading" class="loading-overlay">
      <p>天机推演中，正在为您开辟洞天，请稍候...</p>
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
import { getOrigins, getTalents, getSpiritRoots } from '@/services/api' //, saveCharacter } from '@/services/api' // TODO: Refactor for new API
import {
  ATTRIBUTE_RULES,
  CORE_ATTRIBUTES,
  CoreAttribute,
  type Origin,
  type Talent,
  type SpiritRoot,
  type CharacterSheet,
  type WorldState,
  type Character,
} from '@/core/rules/characterCreation'
import { getUserInfo } from '@/services/tavern'
import { useGameState } from '@/composables/useGameState'

// Import modular components
import BirthOriginSelector from '@/components/character-creation/BirthOriginSelector.vue'
import SpiritRootSelector from '@/components/character-creation/SpiritRootSelector.vue'
import TalentSelectorImproved from '@/components/character-creation/TalentSelectorImproved.vue'
import CharacterPreview from '@/components/character-creation/CharacterPreview.vue'
import StepIndicator from '@/components/shared/StyledStepIndicator.vue'

declare const TavernHelper: any

const { loadGameState } = useGameState()

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
const userName = ref('道友')

onMounted(async () => {
  isLoading.value = true
  const [originsData, talentsData, spiritRootsData, userData] = await Promise.all([
    getOrigins(),
    getTalents(),
    getSpiritRoots(),
    getUserInfo(),
  ])

  origins.value = originsData
  talents.value = talentsData
  spiritRoots.value = spiritRootsData
  userName.value = userData.name

  // Set default selections
  if (origins.value.length > 0 && !selectedOrigin.value) selectedOrigin.value = origins.value[0]
  if (spiritRoots.value.length > 0 && !selectedSpiritRoot.value)
    selectedSpiritRoot.value = spiritRoots.value[0]

  isLoading.value = false
})

// --- Logic Computeds ---

const isCreationComplete = computed(() => {
  return selectedOrigin.value && selectedSpiritRoot.value && selectedTalents.value.length > 0
})

const finalCharacterSheet = computed<CharacterSheet>(() => {
  const baseAttributes = ATTRIBUTE_RULES.reduce(
    (acc, rule) => {
      acc[rule.id] = 10
      return acc
    },
    {} as Record<CoreAttribute, number>,
  )

  if (selectedOrigin.value) {
    for (const key in selectedOrigin.value.attributeModifiers) {
      const attrKey = key as CoreAttribute
      baseAttributes[attrKey] += selectedOrigin.value.attributeModifiers[attrKey] || 0
    }
  }
  selectedTalents.value.forEach((talent) => {
    if (talent.effects && typeof talent.effects === 'string') {
      try {
        const parsedEffects: Array<{ type: string; target: CoreAttribute; value: number }> =
          JSON.parse(talent.effects)
        parsedEffects.forEach((effect) => {
          if (effect.type === 'ATTRIBUTE_MODIFIER' && baseAttributes[effect.target]) {
            baseAttributes[effect.target] += effect.value
          }
        })
      } catch (e) {
        console.error(`天赋'${talent.name}'的effects字段解析失败:`, e)
      }
    }
  })

  const finalAttrs = baseAttributes

  const origin = selectedOrigin.value
  const spiritRoot = selectedSpiritRoot.value
  const finalTalents = selectedTalents.value.map((t) => ({ ...t, level: 1 }))

  const generateFateVerdict = (): string => {
    if (!origin || !spiritRoot) return '天机混沌，命数未显...'

    let verdict = `${userName.value}，${origin.description} `
    verdict += `身具【${spiritRoot.name}】，此乃修行之基。`

    if (finalTalents.length > 0) {
      verdict += `更得天道垂青，与生便有“${finalTalents.map((t) => t.name).join('”、“')}”等天赋，仙路前景，已胜常人三分。`
    } else {
      verdict += `然未得天眷，无伴生天赋，仙路需倍加勤勉。`
    }

    const sortedAttrs = Object.entries(finalAttrs).sort((a, b) => b[1] - a[1])
    const highestAttr = sortedAttrs[0][0] as CoreAttribute

    let attrVerdict = ''
    switch (highestAttr) {
      case CoreAttribute.CON:
        attrVerdict = '然其命数之中，【根骨】二字最为耀眼，此乃肉身成圣之兆。'
        break
      case CoreAttribute.INT:
        attrVerdict = '其魂魄深处，【悟性】之光独占鳌头，此乃天生道子。'
        break
      case CoreAttribute.SPI:
        attrVerdict = '此子【神识】天生强大，远超同辈，一切虚妄幻象，皆无所遁形。'
        break
      case CoreAttribute.LUK:
        attrVerdict = '冥冥之中，【气运】二字与汝纠缠最深，乃是福缘深厚之人。'
        break
      case CoreAttribute.CHA:
        attrVerdict = '其【仪容】风姿，令人见之忘俗，如谪仙临尘。'
        break
      case CoreAttribute.BKG:
        attrVerdict = '其【家世】渊源，虽未明言，却已在命数中留下浓墨重彩的一笔。'
        break
    }
    verdict += ` ${attrVerdict}`

    return verdict
  }

  return {
    name: userName.value,
    origin: origin!,
    spiritRoot: spiritRoot!,
    talents: finalTalents,
    attributes: finalAttrs,
    description: generateFateVerdict(),
    memory_shards: [],
  }
})

const finalizeCharacterCreation = async () => {
  if (!isCreationComplete.value) {
    TavernHelper.toastr.error('道友，你的道途尚未完整，请完成所有选择。')
    return
  }

  isLoading.value = true
  // TODO: Refactor this function for the new online mode.
  // It will need to call a new `createCharacter` API function,
  // passing the user_id and world_id.
  TavernHelper.toastr.info('角色创建逻辑正在重构中...')
  console.log('Final character sheet:', finalCharacterSheet.value)
  isLoading.value = false
}
</script>

<style scoped>
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
