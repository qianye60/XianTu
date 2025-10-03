<template>
  <div v-if="show" class="retry-dialog-overlay" @click="handleCancel">
    <div class="retry-dialog" @click.stop>
      <div class="dialog-header">
        <h3>{{ config?.title || 'AI生成失败' }}</h3>
      </div>

      <div class="dialog-content">
        <div class="error-icon">
          <AlertTriangle :size="48" />
        </div>
        <p class="message">{{ config?.message || '生成过程遇到问题' }}</p>
      </div>

      <div class="dialog-actions">
        <button class="btn-secondary" @click="handleCancel">
          {{ config?.cancelText || '取消创建' }}
        </button>
        <button class="btn-primary" @click="handleConfirm">
          {{ config?.confirmText || '继续重试' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AlertTriangle } from 'lucide-vue-next';
import { useUIStore } from '@/stores/uiStore';

const uiStore = useUIStore();

const show = computed(() => uiStore.showRetryDialogState);
const config = computed(() => uiStore.retryDialogConfig);

const handleConfirm = () => {
  uiStore.confirmRetry();
};

const handleCancel = () => {
  uiStore.cancelRetry();
};
</script>

<style scoped>
.retry-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 99999; /* 设置为最高层，确保在所有元素之上 */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.retry-dialog {
  background: var(--color-surface);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: dialog-appear 0.3s ease-out;
  overflow: hidden;
}

@keyframes dialog-appear {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.dialog-header {
  padding: 20px 24px 0;
  text-align: center;
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.dialog-content {
  padding: 24px;
  text-align: center;
  max-height: 60%; /* 限制最大高度为视口的60% */
  overflow-y: auto; /* 超出时显示垂直滚动条 */
}

/* 滚动条样式 */
.dialog-content::-webkit-scrollbar {
  width: 8px;
}

.dialog-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.dialog-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.dialog-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.5);
}

.error-icon {
  color: var(--color-warning);
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
}

.message {
  color: var(--color-text);
  line-height: 1.6;
  margin: 0;
  white-space: pre-line;
  text-align: left; /* 长文本左对齐更易读 */
  word-break: break-word; /* 长单词自动换行 */
}

.dialog-actions {
  display: flex;
  gap: 12px;
  padding: 0 24px 24px;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 12px 20px;
  border-radius: 8px;
  border: 1px solid;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.btn-primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
}

.btn-secondary {
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-text-secondary);
}

.btn-secondary:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-text-secondary);
  color: var(--color-text);
  transform: translateY(-1px);
}

.btn-primary:active,
.btn-secondary:active {
  transform: translateY(0) scale(0.98);
}

@media (max-width: 480px) {
  .retry-dialog {
    margin: 16px;
    max-width: none;
  }

  .dialog-actions {
    flex-direction: column-reverse;
  }

  .btn-primary,
  .btn-secondary {
    flex: none;
  }
}
</style>
