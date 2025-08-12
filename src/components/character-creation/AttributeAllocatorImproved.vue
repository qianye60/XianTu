<template>
  <div class="panel attribute-allocator">
    <h3 class="panel-title">【 先天六司，点化灵犀 】</h3>
    <div class="points-tracker">
      剩余点数: <span class="points-value">{{ remainingPoints }}</span>
    </div>
    <div class="attributes-grid">
      <div v-for="(attr, key) in CORE_ATTRIBUTES" :key="key" class="attribute-row">
        <span class="attribute-name">{{ attr }}</span>
        <div class="attribute-controls">
          <button
            @click="decrement(key as CoreAttribute)"
            :disabled="attributes.attributes[key as CoreAttribute] <= 10 + (birthOriginModifiers[key as CoreAttribute] || 0)"
          >
            -
          </button>
          <span class="current-value">{{ attributes.attributes[key as CoreAttribute] }}</span>
          <button @click="increment(key as CoreAttribute)" :disabled="remainingPoints <= 0">+</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  CORE_ATTRIBUTES,
  type CoreAttribute,
  type AttributeDistribution,
} from '@/core/rules/characterCreation'

const props = defineProps<{
  totalPoints: number
  initialAttributes: AttributeDistribution
  birthOriginModifiers: Partial<Record<CoreAttribute, number>>
}>()

const emit = defineEmits<{
  'update:attributes': [value: AttributeDistribution]
}>()

const attributes = ref<AttributeDistribution>({ ...props.initialAttributes })

const pointsSpent = computed(() => {
  return Object.keys(CORE_ATTRIBUTES).reduce((sum, key) => {
    const attrKey = key as CoreAttribute
    const baseValue = 10 + (props.birthOriginModifiers[attrKey] || 0)
    return sum + (attributes.value.attributes[attrKey] - baseValue)
  }, 0)
})

const remainingPoints = computed(() => props.totalPoints - pointsSpent.value)

const increment = (key: CoreAttribute) => {
  if (remainingPoints.value > 0) {
    attributes.value.attributes[key]++
  }
}

const decrement = (key: CoreAttribute) => {
  const baseValue = 10 + (props.birthOriginModifiers[key] || 0)
  if (attributes.value.attributes[key] > baseValue) {
    attributes.value.attributes[key]--
  }
}

watch(
  attributes,
  (newValue) => {
    emit('update:attributes', {
      attributes: newValue.attributes,
      pointsSpent: pointsSpent.value,
    })
  },
  { deep: true },
)

watch(
  () => props.initialAttributes,
  (newVal) => {
    attributes.value = { ...newVal }
  },
  { deep: true },
)
</script>

<style scoped>
.attribute-allocator {
  padding: 1.5rem;
  background: rgba(10, 20, 30, 0.5);
  border-radius: 10px;
  border: 1px solid rgba(255, 215, 0, 0.4);
}
.panel-title {
  text-align: center;
  color: #ffd700;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}
.points-tracker {
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 1.2rem;
  color: #b0c4de;
}
.points-value {
  color: #ffd700;
  font-weight: bold;
}
.attributes-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
.attribute-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.2);
  padding: 0.75rem 1rem;
  border-radius: 8px;
}
.attribute-name {
  font-size: 1.1rem;
  font-weight: 500;
}
.attribute-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.attribute-controls button {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid #ffd700;
  background-color: transparent;
  color: #ffd700;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  line-height: 1;
  transition:
    background-color 0.2s,
    color 0.2s;
}
.attribute-controls button:hover:not(:disabled) {
  background-color: #ffd700;
  color: #1a1a1a;
}
.attribute-controls button:disabled {
  border-color: #555;
  color: #555;
  cursor: not-allowed;
}
.current-value {
  font-size: 1.2rem;
  font-weight: bold;
  color: #fff;
  min-width: 30px;
  text-align: center;
}
</style>
