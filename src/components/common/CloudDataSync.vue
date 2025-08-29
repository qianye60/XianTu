<template>
  <button 
    @click="handleSyncCloudData" 
    class="cloud-sync-button"
    :class="{ 'synced': hasSynced }"
    :disabled="isSyncing"
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

// State
const isSyncing = ref(false);
const hasSynced = ref(false);

// 获取同步按钮文本
function getSyncButtonText() {
  if (isSyncing.value) return '同步中...';
  if (hasSynced.value) return '已获取云端';
  return '获取云端数据';
}

// 处理云端数据同步
async function handleSyncCloudData() {
  if (isSyncing.value || hasSynced.value) {
    if (hasSynced.value) {
      toast.info('云端数据已获取，无需重复操作');
    }
    return;
  }

  isSyncing.value = true;
  emit('syncStarted');
  
  try {
    // 检查云端服务是否可用
    const isAvailable = await cloudDataSync.checkCloudDataAvailability();
    if (!isAvailable) {
      toast.warning('云端服务暂时不可用，请稍后再试');
      return;
    }

    // 同步云端数据
    const result = await cloudDataSync.syncCloudData();
    
    if (result.success) {
      // 获取同步后的数据
      const syncedData = cloudDataSync.getSyncedCloudData();
      
      console.log('[云端同步] 开始添加数据到store...');
      console.log('[云端同步] 同步的数据:', syncedData);
      
      // 直接使用store的add方法，这会自动标记为cloud并持久化到酒馆
      let addedCount = 0;
      
      syncedData.worlds.forEach(world => {
        if (!store.creationData.worlds.some(w => w.id === world.id)) {
          store.addWorld(world);
          console.log('[云端同步] 添加世界:', world.name);
          addedCount++;
        }
      });
      
      syncedData.talentTiers.forEach(tier => {
        if (!store.creationData.talentTiers.some(t => t.id === tier.id)) {
          store.addTalentTier(tier);
          addedCount++;
        }
      });
      
      syncedData.origins.forEach(origin => {
        if (!store.creationData.origins.some(o => o.id === origin.id)) {
          store.addOrigin(origin);
          addedCount++;
        }
      });
      
      syncedData.spiritRoots.forEach(root => {
        if (!store.creationData.spiritRoots.some(r => r.id === root.id)) {
          store.addSpiritRoot(root);
          addedCount++;
        }
      });
      
      syncedData.talents.forEach(talent => {
        if (!store.creationData.talents.some(t => t.id === talent.id)) {
          store.addTalent(talent);
          addedCount++;
        }
      });
      
      console.log('[云端同步] 数据添加完成，当前worlds数量:', store.creationData.worlds.length);
      console.log('[云端同步] 云端模式worlds:', store.creationData.worlds.filter(w => w.source === 'cloud').map(w => w.name));
      
      const totalNewItems = result.newItems.worlds + result.newItems.talentTiers + 
                           result.newItems.origins + result.newItems.spiritRoots + 
                           result.newItems.talents;

      if (totalNewItems > 0) {
        toast.success(`成功获取云端数据！新增 ${addedCount} 项内容`);
        hasSynced.value = true;
      } else {
        toast.info('所有云端数据已是最新');
        hasSynced.value = true;
      }

      emit('syncCompleted', {
        success: true,
        newItemsCount: addedCount,
        message: result.message
      });
    } else {
      toast.error('获取云端数据失败：' + result.message);
      emit('syncCompleted', {
        success: false,
        newItemsCount: 0,
        message: result.message
      });
    }
  } catch (error) {
    console.error('[云端同步组件] 同步云端数据失败:', error);
    toast.error('同步失败，请检查网络连接');
    emit('syncCompleted', {
      success: false,
      newItemsCount: 0,
      message: error instanceof Error ? error.message : '同步失败'
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
  padding: 0.8rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border: 1px solid var(--color-border);
  background: var(--color-surface-light);
  color: var(--color-text);
  font-size: 1rem;
  min-width: 140px;
}

.cloud-sync-button:hover {
  background: var(--color-surface-lighter);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.sync-text {
  font-weight: 500;
  margin-left: 0.25rem;
}

.sync-icon {
  font-size: 1.1em;
  vertical-align: middle;
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