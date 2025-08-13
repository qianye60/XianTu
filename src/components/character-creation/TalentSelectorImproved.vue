<template>
  <div class="talent-selector">
    <h3 class="selector-title">【 天赋觉醒 】</h3>
    <div class="custom-section">
      <button @click="toggleCustomPanel" class="toggle-btn">
        {{ isCustomPanelOpen ? '收起自定义' : '展开自定义' }}
      </button>
      <div v-if="isCustomPanelOpen" class="custom-panel">
        <div class="section-actions">
          <button @click="generateAITalents" class="btn btn-ai" :disabled="isGenerating">
            {{ isGenerating ? 'AI生成中...' : 'AI生成天赋' }}
          </button>
          <button @click="addCustomTalent" class="btn btn-sm">手动添加</button>
        </div>
        <div v-if="customTalents.length > 0" class="custom-items">
          <div
            v-for="(talent, index) in customTalents"
            :key="index"
            class="custom-item talent-item"
          >
            <div class="talent-basic">
              <input v-model="talent.name" placeholder="天赋名称" class="item-input" />
              <textarea
                v-model="talent.description"
                placeholder="天赋描述"
                class="item-textarea"
              ></textarea>
            </div>
            <div class="talent-effects">
              <div class="effect-row">
                <label>效果类型：</label>
                <select v-model="talent.effectType" class="effect-select">
                  <option value="ATTRIBUTE_MODIFIER">属性加成</option>
                  <option value="SKILL_BONUS">技能加成</option>
                  <option value="PASSIVE_EFFECT">被动效果</option>
                </select>
              </div>
              <div v-if="talent.effectType === 'ATTRIBUTE_MODIFIER'" class="effect-row">
                <label>属性：</label>
                <select v-model="talent.attributeTarget" class="effect-select">
                  <option value="CON">根骨</option>
                  <option value="INT">悟性</option>
                  <option value="SPI">神识</option>
                  <option value="LUK">气运</option>
                  <option value="CHA">仪容</option>
                  <option value="BKG">家世</option>
                </select>
                <label>加成值：</label>
                <input v-model.number="talent.effectValue" type="number" class="effect-input" />
              </div>
              <div v-else class="effect-row">
                <label>效果描述：</label>
                <input
                  v-model="talent.customEffect"
                  placeholder="自定义效果描述"
                  class="effect-input"
                />
              </div>
            </div>
            <button @click="removeCustomTalent(index)" class="btn btn-danger btn-sm">删除</button>
          </div>
        </div>
        <button @click="applyCustomTalents" class="btn btn-primary">应用自定义天赋</button>
      </div>
    </div>
    <div class="talents-grid">
      <div
        v-for="talent in availableTalents"
        :key="talent.id"
        class="talent-card"
        :class="{ selected: isSelected(talent) }"
        @click="toggleTalent(talent)"
      >
        <h4 class="talent-name">{{ talent.name }}</h4>
        <p class="talent-description">{{ talent.description }}</p>
        <div v-if="talent.effects" class="talent-effects">
          <span class="effects-label">天赋效果:</span>
          <span class="effects-text">{{ formatEffects(talent.effects) }}</span>
        </div>
      </div>
    </div>
    <button @click="randomizeTalents" class="dao-btn">天机再演</button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { postData } from '@/services/api' // 导入 postData
import type { Talent, AttributeModifierEffect } from '@/core/rules/characterCreation'
import _ from 'lodash'

const props = defineProps<{
  modelValue: Talent[]
  talents: Talent[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Talent[]]
  'update:talents': [value: Talent[]]
}>()

async function generateTavernAI(prompt: string): Promise<any> {
  return postData('/ai/generate-talents', { prompt });
}

const allTalents = ref<Talent[]>([])
const availableTalents = ref<Talent[]>([])
const selectedTalents = ref<Talent[]>([...props.modelValue])

const randomizeTalents = () => {
  if (allTalents.value.length > 0) {
    availableTalents.value = _.sampleSize(allTalents.value, 3)
    // Clear selection on randomize to prevent keeping talents that are no longer visible
    selectedTalents.value = []
    emit('update:modelValue', selectedTalents.value)
  }
}

const isSelected = (talent: Talent) => {
  return selectedTalents.value.some((t) => t.id === talent.id)
}

const toggleTalent = (talent: Talent) => {
  const index = selectedTalents.value.findIndex((t) => t.id === talent.id)
  if (index > -1) {
    selectedTalents.value.splice(index, 1)
  } else {
    if (selectedTalents.value.length < 3) {
      selectedTalents.value.push(talent)
    }
  }
  emit('update:modelValue', selectedTalents.value)
}

// 格式化天赋效果显示
const formatEffects = (effects: any) => {
  // 如果effects为空或未定义，返回默认文本
  if (!effects) {
    return '无特殊效果'
  }

  // 如果是字符串且不是JSON格式，直接返回
  if (typeof effects === 'string' && !effects.startsWith('{') && !effects.startsWith('[')) {
    return effects
  }

  // 如果已经是对象/数组，直接处理；如果是字符串，先解析
  let parsedEffects = effects
  if (typeof effects === 'string') {
    try {
      parsedEffects = JSON.parse(effects)
    } catch (e) {
      return effects // 解析失败时返回原始字符串
    }
  }

  // 处理数组格式的效果
  if (Array.isArray(parsedEffects)) {
    return parsedEffects
      .map((effect) => {
        if (effect.type === 'ATTRIBUTE_MODIFIER') {
          const attrNames: Record<string, string> = {
            CON: '根骨',
            INT: '悟性',
            SPI: '神识',
            LUK: '气运',
            CHA: '仪容',
            BKG: '家世',
          }
          const attrName = attrNames[effect.target] || effect.target
          const value = effect.value > 0 ? `+${effect.value}` : `${effect.value}`
          return `${attrName} ${value}`
        }
        // 处理其他类型的效果
        if (effect.type === 'SPECIAL_ABILITY') {
          return effect.description || effect.name
        }
        return JSON.stringify(effect)
      })
      .join(', ')
  }

  // 处理单个对象格式的效果
  if (typeof parsedEffects === 'object') {
    if (parsedEffects.type === 'ATTRIBUTE_MODIFIER') {
      const attrNames: Record<string, string> = {
        CON: '根骨',
        INT: '悟性',
        SPI: '神识',
        LUK: '气运',
        CHA: '仪容',
        BKG: '家世',
      }
      const attrName = attrNames[parsedEffects.target] || parsedEffects.target
      const value = parsedEffects.value > 0 ? `+${parsedEffects.value}` : `${parsedEffects.value}`
      return `${attrName} ${value}`
    }
    return JSON.stringify(parsedEffects)
  }

  return String(parsedEffects)
}

// Watch for the talents prop to be populated from the API
watch(
  () => props.talents,
  (newTalents) => {
    allTalents.value = [...newTalents]
    // Initial randomization when data arrives
    randomizeTalents()
  },
  { deep: true }, // Use deep watch for arrays, remove immediate to avoid race condition on mount
)

const isCustomPanelOpen = ref(false)
const isGenerating = ref(false)
const customTalents = ref<Partial<Talent>[]>([])

const toggleCustomPanel = () => {
  isCustomPanelOpen.value = !isCustomPanelOpen.value
}

const generateAITalents = async () => {
  if (isGenerating.value) return
  isGenerating.value = true
  try {
    const prompt = `生成三个仙侠风格的天赋，每个天赋包含名称(name)、描述(description)和效果(effects)。效果可以是属性修正，也可以是特殊的被动效果。以JSON数组格式返回。`
    const aiResult = await generateTavernAI(prompt)
    const aiTalents = JSON.parse(aiResult)
    customTalents.value.push(...aiTalents)
  } catch (error) {
    console.error('AI生成天赋失败:', error)
  } finally {
    isGenerating.value = false
  }
}

const addCustomTalent = () => {
    customTalents.value.push({
    id: `custom-${Date.now()}`,
    name: '',
    description: '',
    effectType: 'ATTRIBUTE_MODIFIER',
    attributeTarget: 'CON',
    effectValue: 1,
    customEffect: '',
  })
}

const removeCustomTalent = (index: number) => {
  customTalents.value.splice(index, 1)
}

const applyCustomTalents = () => {
    const validTalents: Talent[] = customTalents.value
    .filter((t) => t.name && t.description)
    .map((t, index) => {
      let effects: string | null = null;
      if (t.effectType === 'ATTRIBUTE_MODIFIER' && t.attributeTarget && t.effectValue) {
        const effect: AttributeModifierEffect = {
          type: 'ATTRIBUTE_MODIFIER',
          target: t.attributeTarget,
          value: t.effectValue,
        };
        effects = JSON.stringify([effect]);
      } else if (t.customEffect) {
        effects = t.customEffect;
      }

      return {
        id: t.id || `custom-${Date.now()}-${index}`,
        name: t.name!,
        description: t.description!,
        effects: effects || '',
        type: 'talent',
      };
    });

  emit('update:talents', [...props.talents, ...validTalents])
  customTalents.value = []
  isCustomPanelOpen.value = false
}
</script>

<style scoped>
.talent-selector {
  width: 100%;
  text-align: center;
}

.selector-title {
  text-align: center;
  color: var(--color-primary);
  margin-bottom: 2rem;
  font-size: 1.5rem;
  font-family: var(--font-family-serif);
  font-weight: bold;
}

.talents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.talent-card {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: left;
}

.talent-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb, 58, 95, 125), 0.2);
  transform: translateY(-2px);
}

.talent-card.selected {
  border-color: var(--color-primary);
  background: var(--color-surface-light);
  box-shadow: 0 0 20px rgba(var(--color-primary-rgb, 58, 95, 125), 0.3);
}

.talent-name {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 0.8rem;
  color: var(--color-text);
  font-family: var(--font-family-serif);
  text-align: center;
}

.talent-card.selected .talent-name {
  color: var(--color-primary);
}

.talent-description {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  margin: 0 0 1rem 0;
  line-height: 1.5;
  flex-grow: 1;
}

.talent-card.selected .talent-description {
  color: var(--color-text);
}

.talent-effects {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.effects-label {
  font-size: 0.85rem;
  color: var(--color-accent);
  font-weight: bold;
  font-family: var(--font-family-serif);
}

.effects-text {
  font-size: 0.9rem;
  color: var(--color-primary);
  font-weight: 500;
  background: rgba(var(--color-primary-rgb, 58, 95, 125), 0.1);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border-left: 3px solid var(--color-primary);
}

.dao-btn {
  background: transparent;
  border: 2px solid var(--color-primary);
  color: var(--color-primary);
  padding: 0.75rem 2rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: var(--font-family-serif);
  font-size: 1rem;
  font-weight: bold;
}

.dao-btn:hover {
  background: var(--color-primary);
  color: var(--color-background);
  box-shadow: 0 0 15px rgba(var(--color-primary-rgb, 58, 95, 125), 0.4);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .talents-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .talent-card {
    min-height: 120px;
    padding: 1rem;
  }

  .selector-title {
    font-size: 1.3rem;
    margin-bottom: 1.5rem;
  }
}
</style>
