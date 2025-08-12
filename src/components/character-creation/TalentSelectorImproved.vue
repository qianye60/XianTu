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
      </div>
    </div>
    <button @click="randomizeTalents" class="dao-btn">天机再演</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Talent } from '@/core/rules/characterCreation'
import _ from 'lodash'

const props = defineProps<{
  modelValue: Talent[]
  talents: Talent[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Talent[]]
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
const formatEffects = (effects: string) => {
  // 如果是简单的文本描述，直接返回
  if (typeof effects === 'string' && !effects.startsWith('{') && !effects.startsWith('[')) {
    return effects
  }

  // 尝试解析JSON格式的效果
  try {
    const parsedEffects = JSON.parse(effects)
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
          return JSON.stringify(effect)
        })
        .join(', ')
    }
    return JSON.stringify(parsedEffects)
  } catch (e) {
    // 解析失败时，返回原始字符串
    return effects
  }
}

// Watch for the talents prop to be populated from the API
watch(
  () => props.talents,
  (newTalents) => {
    allTalents.value = [...newTalents]
    // Initial randomization when data arrives
    randomizeTalents()
  },
  { immediate: true },
)
</script>

<style scoped>
.talent-selector {
  width: 100%;
  text-align: center;
}
.selector-title {
  text-align: center;
  color: #ffd700;
  margin-bottom: 2rem;
  font-size: 1.5rem;
}
.talents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.talent-card {
  background: rgba(10, 20, 30, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.talent-card:hover {
  transform: translateY(-5px);
  border-color: #ffd700;
}
.talent-card.selected {
  border-color: #ffd700;
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
}
.talent-name {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  color: #fff;
}
.talent-card.selected .talent-name {
  color: #ffd700;
}
.talent-description {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 0.5rem 0;
}

.talent-effects {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.effects-label {
  font-size: 0.8rem;
  color: rgba(255, 215, 0, 0.8);
  font-weight: bold;
}

.effects-text {
  font-size: 0.85rem;
  color: #90ee90;
  font-style: italic;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border-left: 2px solid #90ee90;
}
.dao-btn {
  background: transparent;
  border: 1px solid #ffd700;
  color: #ffd700;
  padding: 0.5rem 1.5rem;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
}
.dao-btn:hover {
  background: #ffd700;
  color: #1a1a1a;
}
</style>
