<template>
  <div v-if="uiStore.showDataValidationError" class="dialog-overlay">
    <div class="dialog-container">
      <div class="dialog-header">
        <AlertTriangle :size="28" class="header-icon" />
        <h2 class="header-title">存档数据异常</h2>
      </div>
      <div class="dialog-content">
        <p class="content-lead">系统检测到您的存档文件存在严重结构问题，可能导致游戏无法正常运行。这通常是由于版本更新或数据损坏导致的。</p>
        <div class="error-list-container">
          <strong class="error-list-title">具体问题如下：</strong>
          <ul class="error-list">
            <li v-for="(error, index) in uiStore.dataValidationErrorMessages" :key="index" class="error-item">
              {{ error }}
            </li>
          </ul>
        </div>
        <p class="content-suggestion">
          {{ dialogTexts.suggestion }}
          <strong>{{ dialogTexts.warning }}</strong>
        </p>
      </div>
      <div class="dialog-actions">
        <button class="action-button confirm-button" @click="handleConfirm">
          <RefreshCw :size="16" />
          {{ dialogTexts.buttonText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUIStore } from '@/stores/uiStore';
import { AlertTriangle, RefreshCw } from 'lucide-vue-next';
import { computed } from 'vue';

const uiStore = useUIStore();

const handleConfirm = () => {
  uiStore.confirmDataValidationError();
};

// 根据上下文动态生成对话框文本
const dialogTexts = computed(() => {
  const context = uiStore.dataValidationContext;
  if (context === 'loading') {
    return {
      suggestion: '我们建议您立即修复此问题。修复过程将尝试在保留您核心进度的前提下，修正存档的数据结构。',
      warning: '注意：修复主要针对结构性问题，无法恢复已损坏或丢失的数据。建议您在修复前备份存档。',
      buttonText: '修复存档并继续'
    };
  }
  // 默认为 'creation' 场景
  return {
    suggestion: '我们建议您立即修复此问题。修复过程将根据您现有的角色基础信息，重新生成一份健康的初始存档数据。',
    warning: '注意：这将会重置您的游戏进度（如修为、背包物品等），但角色核心设定（如姓名、天赋、灵根）将保留。',
    buttonText: '重新初始化并修复'
  };
});
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.dialog-container {
  background-color: var(--color-surface);
  border-radius: 16px;
  padding: 2rem;
  width: 100%;
  max-width: 550px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  animation: slideInUp 0.4s cubic-bezier(0.25, 1, 0.5, 1);
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  color: var(--color-danger);
}

.header-icon {
  flex-shrink: 0;
}

.header-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.content-lead {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-text);
}

.error-list-container {
  background-color: rgba(var(--color-danger-rgb), 0.05);
  border: 1px solid rgba(var(--color-danger-rgb), 0.2);
  border-radius: 8px;
  padding: 1rem;
}

.error-list-title {
  display: block;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
}

.error-list {
  list-style-type: none;
  padding-left: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.error-item {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.875rem;
  color: var(--color-danger);
  padding: 0.5rem;
  background-color: rgba(var(--color-danger-rgb), 0.05);
  border-radius: 4px;
}

.content-suggestion {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

.content-suggestion strong {
  color: var(--color-warning);
  font-weight: 600;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
}

.action-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.confirm-button {
  background-color: var(--color-primary);
  color: white;
}

.confirm-button:hover {
  background-color: var(--color-primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
}
</style>