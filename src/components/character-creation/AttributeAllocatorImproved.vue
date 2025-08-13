<template>
  <div class="p-6 bg-surface/75 border border-primary/40 rounded-lg">
    <h3 class="text-center text-primary mb-6 text-2xl font-serif">【 先天六司，点化灵犀 】</h3>
    <div class="text-center mb-6 text-xl text-text-secondary">
      剩余点数: <span class="text-primary font-bold">{{ remainingPoints }}</span>
    </div>
    <div class="grid grid-cols-1 gap-4">
      <div v-for="(attr, key) in CORE_ATTRIBUTES" :key="key" class="flex justify-between items-center bg-black/20 p-3 rounded-md">
        <span class="text-lg font-medium">{{ attr }}</span>
        <div class="flex items-center gap-4">
          <button
            @click="decrement(key as CoreAttribute)"
            :disabled="attributes.attributes[key as CoreAttribute] <= 10 + (birthOriginModifiers[key as CoreAttribute] || 0)"
            class="w-[30px] h-[30px] rounded-full border border-primary bg-transparent text-primary text-2xl cursor-pointer flex justify-center items-center leading-none transition-colors hover:bg-primary hover:text-background disabled:border-muted disabled:text-muted disabled:cursor-not-allowed"
          >
            -
          </button>
          <span class="text-xl font-bold text-white min-w-[30px] text-center">{{ attributes.attributes[key as CoreAttribute] }}</span>
          <button 
            @click="increment(key as CoreAttribute)" 
            :disabled="remainingPoints <= 0"
            class="w-[30px] h-[30px] rounded-full border border-primary bg-transparent text-primary text-2xl cursor-pointer flex justify-center items-center leading-none transition-colors hover:bg-primary hover:text-background disabled:border-muted disabled:text-muted disabled:cursor-not-allowed"
          >
            +
          </button>
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

<style>
/* 
  此处的样式已通过原子化CSS（如 `p-6`, `bg-surface/75`, `text-primary` 等）直接应用于模板中。
  这些原子类应由您的UI框架（如TailwindCSS, UnoCSS）或在全局样式表中定义。
  例如，.text-primary { color: var(--color-primary); }
  此举遵循了 "心法一：万法归一" 中的原子化CSS优先原则，以及 "心法五：匠心独运" 的道法自然原则。
  <style> 块已被移除，使组件更加纯净、可移植。
*/
</style>