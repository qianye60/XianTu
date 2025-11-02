<template>
  <div v-if="show" class="retry-dialog-overlay" @click="handleCancel">
    <div class="retry-dialog" @click.stop>
      <div class="dialog-header">
        <h3>{{ config?.title || $t('AI生成失败') }}</h3>
      </div>

      <div class="dialog-content">
        <div class="error-icon">
          <AlertTriangle :size="48" />
        </div>
        <p class="message">{{ config?.message || $t('生成过程遇到问题') }}</p>
      </div>

      <div class="dialog-actions">
        <button class="btn-secondary" @click="handleCancel">
          {{ config?.cancelText || $t('取消') }}
        </button>
        <button class="btn-primary" @click="handleConfirm">
          {{ config?.confirmText || $t('重试') }}
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
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.retry-dialog {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: dialog-appear 0.3s ease-out;
  overflow: hidden;
  /* 确保背景完全贴合 */
  display: flex;
  flex-direction: column;
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
  padding: 24px 24px 16px;
  text-align: center;
  background: var(--color-surface);
  /* 去除可能的间隙 */
  margin: 0;
  flex-shrink: 0;
}

.dialog-header h3 {
  margin: 0;
  padding: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.4;
}

.dialog-content {
  padding: 20px 24px;
  text-align: center;
  background: var(--color-surface);
  /* 确保内容区域可滚动但不超出 */
  max-height: 50vh;
  overflow-y: auto;
  overflow-x: hidden;
  /* 去除可能的间隙 */
  margin: 0;
  flex: 1;
}

/* 滚动条样式优化 */
.dialog-content::-webkit-scrollbar {
  width: 6px;
}

.dialog-content::-webkit-scrollbar-track {
  background: transparent;
}

.dialog-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.dialog-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.4);
}

.error-icon {
  color: var(--color-warning);
  margin: 0 0 16px 0;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.message {
  color: var(--color-text);
  line-height: 1.6;
  margin: 0;
  padding: 0;
  white-space: pre-line;
  text-align: left;
  word-break: break-word;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  padding: 16px 24px 24px;
  background: var(--color-surface);
  /* 去除可能的间隙 */
  margin: 0;
  flex-shrink: 0;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 12px 20px;
  margin: 0;
  border-radius: 8px;
  border: 1px solid;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  line-height: 1.5;
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
  .retry-dialog-overlay {
    padding: 16px;
  }

  .retry-dialog {
    max-width: none;
    border-radius: 12px;
  }

  .dialog-header {
    padding: 20px 20px 12px;
  }

  .dialog-header h3 {
    font-size: 1.1rem;
  }

  .dialog-content {
    padding: 16px 20px;
    max-height: 60vh;
  }

  .dialog-actions {
    flex-direction: column-reverse;
    gap: 10px;
    padding: 12px 20px 20px;
  }

  .btn-primary,
  .btn-secondary {
    flex: none;
    width: 100%;
  }
}
</style>
