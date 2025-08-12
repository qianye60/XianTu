<template>
  <div class="birth-origin-selector">
    <h3 class="selector-title">【 选择出身 】</h3>
    <div class="origins-grid">
      <div
        v-for="origin in origins"
        :key="origin.id"
        class="origin-card"
        :class="{ selected: modelValue?.id === origin.id }"
        @click="selectOrigin(origin)"
      >
        <h4 class="origin-name">{{ origin.name }}</h4>
        <p class="origin-desc">{{ origin.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Origin } from '@/core/rules/characterCreation'

defineProps<{
  modelValue: Origin | null
  origins: Origin[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Origin | null]
}>()

const selectOrigin = (origin: Origin) => {
  emit('update:modelValue', origin)
}
</script>

<style scoped>
.birth-origin-selector {
  width: 100%;
}
.selector-title {
  text-align: center;
  color: #ffd700;
  margin-bottom: 2rem;
  font-size: 1.5rem;
}
.origins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}
.origin-card {
  background: rgba(10, 20, 30, 0.5);
  border: 1px solid rgba(255, 215, 0, 0.4);
  border-radius: 10px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}
.origin-card:hover {
  transform: translateY(-5px);
  border-color: #ffd700;
  box-shadow: 0 5px 20px rgba(218, 165, 32, 0.2);
}
.origin-card.selected {
  border-color: #ffa500;
  background: rgba(218, 165, 32, 0.15);
  box-shadow: 0 0 15px rgba(218, 165, 32, 0.4);
}
.origin-name {
  font-size: 1.3em;
  color: #ffd700;
  margin-bottom: 0.75rem;
}
.origin-desc {
  font-size: 1rem;
  color: #d1d5db; /* cool-gray-300, increased contrast */
  margin-bottom: 1rem;
  font-style: italic;
}
.origin-story {
  font-size: 0.9rem;
  color: #9ca3af; /* cool-gray-400, increased contrast */
  line-height: 1.5;
}
</style>
