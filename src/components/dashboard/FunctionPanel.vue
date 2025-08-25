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
      <slot>
        <div class="placeholder-content">
          <p>{{ title }}功能开发中...</p>
        </div>
      </slot>
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
  overflow: hidden; /* 移除overflow-y: auto，让子组件自己处理滚动 */
  /* 移除padding，让子组件自己控制内边距 */
}

.placeholder-content {
  text-align: center;
  color: #64748b;
  font-size: 1rem;
  margin-top: 40px;
  padding: 20px; /* 为placeholder内容添加内边距 */
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