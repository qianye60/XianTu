<template>
  <div class="function-panel">
    <div class="panel-header">
      <h2>{{ title }}</h2>
      <button @click="$emit('close')" class="close-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="panel-body">
      <div class="panel-content-wrapper">
        <slot>
          <div class="placeholder-content">
            <p>{{ title }}功能开发中...</p>
          </div>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()

defineEmits<{
  close: []
}>()
</script>

<style scoped>
.function-panel {
  width: 100%;
  height: 100%;
  background: var(--color-background);
  display: flex;
  flex-direction: column;
  font-family: var(--font-family-sans-serif);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  backdrop-filter: blur(10px);
}

.panel-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  color: var(--color-text-secondary);
  transition: var(--transition-fast);
}

.close-btn:hover {
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-text);
  transform: scale(1.05);
}

.panel-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: var(--color-background);
  /* 优化的滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) transparent;
}

.panel-content-wrapper::-webkit-scrollbar {
  width: 6px;
}

.panel-content-wrapper::-webkit-scrollbar-track {
  background: rgba(var(--color-border-rgb), 0.1);
  border-radius: 3px;
}

.panel-content-wrapper::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
  opacity: 0.6;
}

.panel-content-wrapper::-webkit-scrollbar-thumb:hover {
  opacity: 0.8;
}

.placeholder-content {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 1rem;
  margin-top: 40px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface-light);
}

/* 移除深色主题硬编码，使用CSS变量自动适配 */
</style>