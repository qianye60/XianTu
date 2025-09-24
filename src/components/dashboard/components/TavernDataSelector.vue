<template>
  <div class="data-type-selector">
    <button
      v-for="type in dataTypes"
      :key="type.key"
      @click="$emit('update:selected-type', type.key)"
      class="type-btn"
      :class="{ active: selectedType === type.key }"
    >
      <component :is="getIconComponent(type.icon)" :size="16" />
      <span>{{ type.label }}</span>
      <span class="count-badge" v-if="getDataCount(type.key) > 0">
        {{ getDataCount(type.key) }}
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { MessageSquare, Globe, Users, Archive, Book, Brain, Code } from 'lucide-vue-next'

interface DataType {
  key: string
  label: string
  icon: string
}

interface Props {
  dataTypes: DataType[]
  selectedType: string
  getDataCount: (type: string) => number
}

defineProps<Props>()

defineEmits<{
  'update:selected-type': [type: string]
}>()

const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, any> = {
    MessageSquare,
    Globe,
    Users,
    Archive,
    Book,
    Brain,
    Code
  }
  return iconMap[iconName] || Code
}
</script>

<style scoped>
.data-type-selector {
  padding: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

/* 手机端适配 */
@media (max-width: 640px) {
  .data-type-selector {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    padding: 0.75rem;
  }
}

@media (max-width: 480px) {
  .data-type-selector {
    gap: 0.4rem;
    padding: 0.5rem;
  }
}

.type-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  position: relative;
  overflow: visible;
  width: 100%;
  justify-content: flex-start;
  color: var(--color-text);
  background: var(--color-background);
}

.type-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.15);
}

.type-btn.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.type-btn.active:hover,
.type-btn.active:focus,
.type-btn.active:focus-visible {
  background: var(--color-primary-hover);
  color: white;
  border-color: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(var(--color-primary-rgb), 0.25);
}

.type-btn svg {
  color: inherit;
}

.type-btn:focus {
  outline: none;
}

.type-btn:focus-visible {
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.25);
  border-color: var(--color-primary);
}

.type-btn:active {
  transform: translateY(0);
  box-shadow: none;
}

.count-badge {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  background: var(--color-accent);
  color: white;
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  border-radius: 10px;
  min-width: 1.25rem;
  text-align: center;
  z-index: 2;
}

/* 手机端按钮适配 */
@media (max-width: 640px) {
  .type-btn {
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
    gap: 0.3rem;
  }
  
  .count-badge {
    font-size: 0.7rem;
    padding: 0.1rem 0.3rem;
    min-width: 1rem;
  }
}

@media (max-width: 480px) {
  .type-btn {
    padding: 0.35rem 0.5rem;
    font-size: 0.75rem;
    gap: 0.25rem;
  }
  
  .count-badge {
    font-size: 0.65rem;
    padding: 0.08rem 0.25rem;
    min-width: 0.9rem;
  }
}
</style>
