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
import { getCoreSettings, generateAIContent } from '@/services/api'
import type { Origin } from '@/core/rules/characterCreation'

const props = defineProps<{
  modelValue: Origin | null
  origins: Origin[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Origin | null]
  'update:origins': [value: Origin[]]
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
  color: var(--color-primary);
  margin-bottom: 2rem;
  font-size: 1.5rem;
  font-family: var(--font-family-serif);
  font-weight: bold;
}

.origins-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
}

.origin-card {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  min-width: 250px;
  flex: 1;
  max-width: 350px;
}

.origin-card:hover {
  transform: translateY(-3px);
  border-color: var(--color-primary);
  box-shadow: 0 6px 20px rgba(var(--color-primary-rgb), 0.2);
}

.origin-card.selected {
  border-color: var(--color-primary);
  background: var(--color-surface-light);
  box-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.3);
}

.origin-name {
  font-size: 1.4rem;
  color: var(--color-text);
  margin-bottom: 1rem;
  font-family: var(--font-family-serif);
  font-weight: bold;
}

.origin-card.selected .origin-name {
  color: var(--color-primary);
}

.origin-desc {
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
  line-height: 1.6;
  font-style: italic;
}

.origin-card.selected .origin-desc {
  color: var(--color-text);
}

.origin-story {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .origins-grid {
    flex-direction: column;
    align-items: center;
  }

  .origin-card {
    width: 100%;
    max-width: 400px;
    min-width: unset;
    padding: 1.5rem;
  }

  .selector-title {
    font-size: 1.3rem;
    margin-bottom: 1.5rem;
  }

  .origin-name {
    font-size: 1.2rem;
  }
}
</style>
