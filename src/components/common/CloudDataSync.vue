<template>
  <button 
    @click="handleSyncCloudData" 
    class="cloud-sync-button"
    :class="{ 'synced': hasSynced }"
    :disabled="isSyncing"
    :title="getSyncButtonTooltip()"
  >
    <span class="sync-icon" v-if="isSyncing">⏳</span>
    <span class="sync-icon" v-else-if="hasSynced">✅</span>
    <span class="sync-icon" v-else>☁️</span>
    <span class="sync-text">{{ getSyncButtonText() }}</span>
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { cloudDataSync } from '../../utils/cloudDataSync';
import { toast } from '../../utils/toast';
import { useCharacterCreationStore } from '../../stores/characterCreationStore';
import { useI18n } from '../../i18n';

// Props
defineProps<{
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'compact';
}>();

// Emits
const emit = defineEmits<{
  syncCompleted: [result: { success: boolean; newItemsCount: number; message: string }];
  syncStarted: [];
}>();

// Store
const store = useCharacterCreationStore();
const { t } = useI18n();

// State
const isSyncing = ref(false);
const hasSynced = ref(false);

// 获取同步按钮文本
function getSyncButtonText() {
  if (isSyncing.value) return t('同步中');
  if (hasSynced.value) return t('已获取');
  return t('获取云端');
}

// 获取按钮提示文本
function getSyncButtonTooltip() {
  if (isSyncing.value) return t('正在同步云端数据...');
  if (hasSynced.value) return t('云端数据已获取');
  return t('获取云端数据');
}

// 处理云端数据同步
async function handleSyncCloudData() {
  if (isSyncing.value || hasSynced.value) {
    if (hasSynced.value) {
      toast.info(t('云端数据已获取，无需重复操作'));
    }
    return;
  }

  isSyncing.value = true;
  emit('syncStarted');
  const toastId = 'cloud-sync-toast';
  toast.loading(t('正在获取云端数据...'), { id: toastId });

  try {
    const newItemsCount = await store.fetchAllCloudData();

    if (newItemsCount > 0) {
      toast.success(t('同步成功！新增 {0} 项云端数据').replace('{0}', String(newItemsCount)), { id: toastId });
      hasSynced.value = true;
    } else {
      toast.info(t('所有云端数据已是最新'), { id: toastId });
      hasSynced.value = true;
    }

    emit('syncCompleted', {
      success: true,
      newItemsCount: newItemsCount,
      message: t('同步成功')
    });

  } catch (error) {
    console.error('[云端同步组件] 同步云端数据失败:', error);
    const message = error instanceof Error ? error.message : t('同步失败');
    toast.error(t('同步失败: {0}').replace('{0}', message), { id: toastId });
    emit('syncCompleted', {
      success: false,
      newItemsCount: 0,
      message: message
    });
  } finally {
    isSyncing.value = false;
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