<template>
  <div class="editor-overlay" @click.self="$emit('close')">
    <div class="editor-panel">
      <h2 class="panel-title">世界书</h2>
      <p class="panel-description">
        此乃此方天地的根本大法。AI将以此为纲，知晓境界、炼丹、炼器等核心规则。
      </p>

      <textarea class="world-book-textarea" v-model="settings.worldBookContent"></textarea>

      <button class="close-button" @click="$emit('close')">关闭</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'

defineEmits(['close'])

const settings = useSettingsStore()
</script>

<style scoped>
.editor-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1002; /* Higher than other panels */
}

.editor-panel {
  background: #1f2937;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #374151;
  width: 90%;
  max-width: 800px;
  height: 80vh;
  color: #e5e7eb;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-size: 2rem;
  color: #a5b4fc;
  text-align: center;
  margin-bottom: 1rem;
}

.panel-description {
  text-align: center;
  color: #9ca3af;
  margin-bottom: 1.5rem;
  flex-shrink: 0;
}

.world-book-textarea {
  flex-grow: 1;
  width: 100%;
  padding: 1rem;
  background: #111827;
  border: 1px solid #4b5563;
  border-radius: 6px;
  color: #e5e7eb;
  font-size: 1rem;
  line-height: 1.6;
  resize: none;
  font-family: 'Courier New', Courier, monospace;
}

.close-button {
  width: 100%;
  padding: 0.8rem;
  margin-top: 1.5rem;
  flex-shrink: 0;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
}
</style>
