<!-- src/components/game-view/InteractionPanel.vue -->
<template>
  <div class="interaction-panel">
    <h3 class="sidebar-title">互动法阵</h3>
    <div class="interaction-buttons">
      <button 
        v-for="button in interactionButtons" 
        :key="button.id" 
        class="action-button"
        @click="handleAction(button.id)"
      >
        {{ button.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'action', actionId: string): void;
}>();

const interactionButtons = ref([
  { id: 'explore', label: '探索周边' },
  { id: 'inventory', label: '查看背包' },
  { id: 'status', label: '检视自身' },
]);

const handleAction = (actionId: string) => {
  emit('action', actionId);
};
</script>

<style scoped>
/* 样式从 GameView.vue 迁移并调整 */
.interaction-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
}

.sidebar-title {
  text-align: center;
  color: #e5c07b;
  font-size: 1.2em;
  margin: 0 0 0.5rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #444;
  flex-shrink: 0;
}

.interaction-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.action-button {
  width: 100%;
  padding: 0.75rem;
  background: rgba(229, 192, 123, 0.1);
  border: 1px solid #e5c07b;
  color: #e5c07b;
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  font-size: 1em;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: #e5c07b;
  color: #1a1a1a;
  box-shadow: 0 0 15px rgba(229, 192, 123, 0.3);
}
</style>