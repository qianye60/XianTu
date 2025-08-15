<template>
  <div class="talent-selector">
    <h3 class="selector-title">【 天赋觉醒 】</h3>
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
import type { Talent } from '@/core/rules/characterCreation'
import _ from 'lodash'

const props = defineProps<{
  modelValue: Talent[]
  talents: Talent[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Talent[]]
  'update:talents': [value: Talent[]]
}>()

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
