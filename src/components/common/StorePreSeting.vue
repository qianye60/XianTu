<template>
  <div>
    <button
      @click="handleStorePreset"
      class="cloud-sync-button"
      :class="{ 'synced': hasStored }"
      :disabled="isStoring || !isEnabled"
      :title="getButtonTooltip()"
    >
      <span class="sync-icon" v-if="isStoring">⏳</span>
      <span class="sync-icon" v-else-if="hasStored">✅</span>
      <span class="sync-icon" v-else>💾</span>
      <span class="sync-text">{{ getButtonText() }}</span>
    </button>

    <!-- 预设保存对话框 -->
    <PresetSaveModal
      :visible="showSaveModal"
      @close="showSaveModal = false"
      @submit="handleSavePreset"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { toast } from '../../utils/toast';
import PresetSaveModal from './PresetSaveModal.vue';

// Props
const props = defineProps<{
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'compact';
  currentStep?: number; // 当前步骤
  totalSteps?: number; // 总步骤数
}>();

// Emits
const emit = defineEmits<{
  storeCompleted: [result: { success: boolean; message: string; presetData?: any }];
  storeStarted: [];
}>();

// State
const isStoring = ref(false);
const hasStored = ref(false);
const showSaveModal = ref(false);

// 是否启用按钮（仅在最后一步启用）
const isEnabled = computed(() => {
  if (props.currentStep === undefined || props.totalSteps === undefined) {
    return true; // 如果没有传入步骤信息，默认启用
  }
  return props.currentStep === props.totalSteps;
});

// 获取按钮文本
function getButtonText() {
  if (isStoring.value) return '存储中';
  if (hasStored.value) return '已存储';
  return '存储预设';
}

// 获取按钮提示文本
function getButtonTooltip() {
  if (!isEnabled.value) {
    return '请完成所有步骤后再保存预设';
  }
  if (isStoring.value) return '正在存储预设...';
  if (hasStored.value) return '预设已存储';
  return '保存当前选择为预设';
}

// 处理点击存储预设按钮
function handleStorePreset() {
  if (isStoring.value || hasStored.value || !isEnabled.value) {
    if (hasStored.value) {
      toast.info('预设已存储，无需重复操作');
    } else if (!isEnabled.value) {
      toast.warning('请完成所有步骤后再保存预设');
    }
    return;
  }

  // 显示保存对话框
  showSaveModal.value = true;
  emit('storeStarted');
}

// 处理保存预设
async function handleSavePreset(data: { presetName: string; presetDescription: string }) {
  isStoring.value = true;
  const toastId = 'store-preset-toast';
  toast.loading('正在保存预设...', { id: toastId });
  
  try {
    // TODO: 实现预设存储逻辑
    // 这里应该获取当前的角色创建数据并保存
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const presetData = {
      name: data.presetName,
      description: data.presetDescription,
      savedAt: new Date().toISOString()
      // TODO: 添加实际的角色数据
    };
    
    toast.success(`预设「${data.presetName}」保存成功！`, { id: toastId });
    hasStored.value = true;
    showSaveModal.value = false;

    emit('storeCompleted', {
      success: true,
      message: '预设保存成功',
      presetData
    });

  } catch (error) {
    console.error('[存储预设组件] 存储失败:', error);
    const message = error instanceof Error ? error.message : '存储失败';
    toast.error(`存储失败: ${message}`, { id: toastId });
    emit('storeCompleted', {
      success: false,
      message: message
    });
  } finally {
    isStoring.value = false;
  }
}
</script>

<style scoped>
.cloud-sync-button {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.3rem;
  padding: 0.5rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border: 1px solid var(--color-border);
  background: var(--color-surface-light);
  color: var(--color-text);
  font-size: 0.85rem;
  min-width: 80px;
  white-space: nowrap;
}

.cloud-sync-button:hover {
  background: var(--color-surface-lighter);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.sync-text {
  font-weight: 500;
}

.sync-icon {
  font-size: 1em;
  flex-shrink: 0;
}

/* 已同步状态样式 */
.cloud-sync-button.synced {
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.1), rgba(var(--color-success-rgb), 0.1));
  border-color: var(--color-success);
  color: var(--color-success);
}

.cloud-sync-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cloud-sync-button.synced:hover {
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.2), rgba(var(--color-success-rgb), 0.2));
}

/* Size variants */
.cloud-sync-button.small {
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  min-width: 100px;
}

.cloud-sync-button.large {
  padding: 1rem 1.5rem;
  font-size: 1.1rem;
  min-width: 180px;
}

/* Compact variant */
.cloud-sync-button.compact {
  min-width: auto;
  padding: 0.5rem;
}

.cloud-sync-button.compact .sync-text {
  display: none;
}
</style>