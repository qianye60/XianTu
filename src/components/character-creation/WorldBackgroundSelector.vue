<template>
  <div class="world-background-selector">
    <h3 class="selector-title">【 世界背景选择 】</h3>
    <p class="selector-subtitle">
      道友，请选择你的修行世界背景，不同的世界将影响你的修行环境和际遇。
    </p>

    <div v-if="backgrounds && backgrounds.length > 0" class="backgrounds-grid">
      <div
        v-for="background in backgrounds"
        :key="background.id"
        class="background-card"
        :class="{ selected: modelValue?.id === background.id }"
        @click="selectBackground(background)"
      >
        <div class="background-header">
          <h4 class="background-name">{{ background.name }}</h4>
        </div>
        <p class="background-description">{{ background.description }}</p>
        <div v-if="background.features" class="background-features">
          <h5>世界特色:</h5>
          <ul>
            <li v-for="feature in background.features" :key="feature">{{ feature }}</li>
          </ul>
        </div>
        <div v-if="background.cultivation_bonus" class="cultivation-bonus">
          <span class="bonus-label">修行加成:</span>
          <span class="bonus-text">{{ background.cultivation_bonus }}</span>
        </div>
      </div>
    </div>
    <div v-else class="no-data-prompt">
      <p>未能探知任何世界背景，请检查天道连接或本地秘藏。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { World } from '@/core/rules/characterCreation'

const props = defineProps<{
  modelValue: World | null
  backgrounds: World[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: World | null]
}>()

const selectBackground = (background: World) => {
  emit('update:modelValue', background)
}

// Watch for incoming data and set a default selection if none exists
watch(
  () => props.backgrounds,
  (newBackgrounds) => {
    if (!props.modelValue && newBackgrounds && newBackgrounds.length > 0) {
      selectBackground(newBackgrounds[0])
    }
  },
  { immediate: true },
)

onMounted(() => {
  // Initial check in case modelValue is already set but we need to ensure it's valid
  if (!props.modelValue && props.backgrounds && props.backgrounds.length > 0) {
    selectBackground(props.backgrounds[0])
  }
})
</script>

<style scoped>
.world-background-selector {
  width: 100%;
}

.selector-title {
  text-align: center;
  color: var(--color-primary);
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.selector-subtitle {
  text-align: center;
  color: var(--color-text-secondary);
  margin-bottom: 2rem;
  font-size: 1rem;
}

.backgrounds-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.background-card {
  background: rgba(10, 20, 30, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

.background-card:hover {
  transform: translateY(-5px);
  border-color: var(--color-primary);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.background-card.selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.3);
  background: rgba(var(--color-primary-rgb), 0.1);
}

.background-header {
  margin-bottom: 1rem;
}

.background-name {
  color: var(--color-text);
  margin: 0;
  font-size: 1.2rem;
}

.background-card.selected .background-name {
  color: var(--color-primary);
}

.background-description {
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
  line-height: 1.5;
  flex-grow: 1;
}

.background-features {
  margin-bottom: 1rem;
}

.background-features h5 {
  color: var(--color-text);
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
}

.background-features ul {
  margin: 0;
  padding-left: 1rem;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.background-features li {
  margin-bottom: 0.25rem;
}

.cultivation-bonus {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: rgba(var(--color-primary-rgb), 0.1);
  border-radius: 6px;
  border-left: 3px solid var(--color-primary);
}

.bonus-label {
  color: var(--color-text);
  font-size: 0.85rem;
  font-weight: bold;
}

.bonus-text {
  color: var(--color-primary);
  font-size: 0.85rem;
  font-weight: bold;
}

.no-data-prompt {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary);
  font-style: italic;
  background: var(--color-surface);
  border-radius: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .backgrounds-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .background-card {
    padding: 1rem;
  }
}
</style>
