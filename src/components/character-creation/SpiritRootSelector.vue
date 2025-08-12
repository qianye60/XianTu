<template>
  <div class="spirit-root-selector">
    <h3 class="selector-title">【 择定灵根 】</h3>
    <div class="roots-grid">
      <div
        v-for="root in spiritRoots"
        :key="root.id"
        class="root-card"
        :class="{ selected: modelValue?.id === root.id }"
        @click="selectRoot(root)"
      >
        <h4 class="root-name">{{ root.name }}</h4>
        <p class="root-desc">{{ root.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SpiritRoot } from '@/core/rules/characterCreation'

defineProps<{
  modelValue: SpiritRoot | null
  spiritRoots: SpiritRoot[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SpiritRoot | null]
}>()

const selectRoot = (root: SpiritRoot) => {
  emit('update:modelValue', root)
}
</script>

<style scoped>
.spirit-root-selector {
  width: 100%;
}
.selector-title {
  text-align: center;
  color: #ffd700;
  margin-bottom: 2rem;
  font-size: 1.5rem;
}
.roots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}
.root-card {
  background: rgba(10, 20, 30, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}
.root-card:hover {
  transform: translateY(-5px);
  border-color: #ffd700;
}
.root-card.selected {
  border-color: #ffd700;
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
  background: rgba(255, 215, 0, 0.1);
}
.root-name {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: #fff;
}
.root-card.selected .root-name {
  color: #ffd700;
}
.root-desc {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}
</style>
