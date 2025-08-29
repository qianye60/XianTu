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
  background: white;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  color: #64748b;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #e2e8f0;
  color: #334155;
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
  /* 滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.5) transparent;
}

.panel-content-wrapper::-webkit-scrollbar {
  width: 6px;
}

.panel-content-wrapper::-webkit-scrollbar-track {
  background: rgba(148, 163, 184, 0.1);
  border-radius: 3px;
}

.panel-content-wrapper::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.5);
  border-radius: 3px;
}

.panel-content-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.8);
}

.placeholder-content {
  text-align: center;
  color: #64748b;
  font-size: 1rem;
  margin-top: 40px;
}

/* 深色主题 */
[data-theme="dark"] .function-panel {
  background: #1e293b;
}

[data-theme="dark"] .panel-header {
  background: #334155;
  border-bottom-color: #475569;
}

[data-theme="dark"] .panel-header h2 {
  color: #f1f5f9;
}

[data-theme="dark"] .close-btn {
  color: #94a3b8;
}

[data-theme="dark"] .close-btn:hover {
  background: #475569;
  color: #e2e8f0;
}

[data-theme="dark"] .placeholder-content {
  color: #94a3b8;
}
</style>