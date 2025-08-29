<template>
  <div class="data-clear-container">
    <div class="clear-buttons">
      <!-- 清除额外数据（自定义+AI生成+云端同步），保留基础数据 -->
      <button 
        @click="clearExtraData" 
        class="clear-button extra"
        :disabled="!hasExtraData"
        title="清除所有额外数据，保留基础数据"
      >
        <span class="clear-icon">🗑️</span>
        <span class="clear-text">清除额外数据</span>
      </button>

      <!-- 清除云端同步缓存 -->
      <button 
        @click="clearSyncCache" 
        class="clear-button sync"
        :disabled="!hasSyncCache"
        title="清除云端同步缓存，但保留Store中的数据"
      >
        <span class="clear-icon">🧹</span>
        <span class="clear-text">清除同步缓存</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useCharacterCreationStore } from '../../stores/characterCreationStore';
import { cloudDataSync } from '../../utils/cloudDataSync';
import { toast } from '../../utils/toast';
import { LOCAL_WORLDS, LOCAL_TALENT_TIERS, LOCAL_ORIGINS, LOCAL_SPIRIT_ROOTS, LOCAL_TALENTS } from '../../data/creationData';

// Props
defineProps<{
  variant?: 'horizontal' | 'vertical';
  size?: 'small' | 'medium' | 'large';
}>();

// Emits
const emit = defineEmits<{
  dataCleared: [type: string, count: number];
}>();

// Store
const store = useCharacterCreationStore();

// 检查是否有额外数据（超出基础数据的部分）
const hasExtraData = computed(() => {
  const baseWorldsCount = LOCAL_WORLDS.length;
  const baseTalentTiersCount = LOCAL_TALENT_TIERS.length;
  const baseOriginsCount = LOCAL_ORIGINS.length;
  const baseSpiritRootsCount = LOCAL_SPIRIT_ROOTS.length;
  const baseTalentsCount = LOCAL_TALENTS.length;
  
  return store.creationData.worlds.length > baseWorldsCount ||
         store.creationData.talentTiers.length > baseTalentTiersCount ||
         store.creationData.origins.length > baseOriginsCount ||
         store.creationData.spiritRoots.length > baseSpiritRootsCount ||
         store.creationData.talents.length > baseTalentsCount;
});

// 检查是否有同步缓存
const hasSyncCache = computed(() => {
  const syncStats = cloudDataSync.getSyncStats();
  return syncStats.totalSyncedItems > 0;
});

// 清除额外数据，保留基础数据
function clearExtraData() {
  if (!hasExtraData.value) return;
  
  if (!confirm('确定要清除所有额外数据吗？这将保留基础数据，清除自定义、AI生成和云端同步的数据。此操作不可撤销。')) {
    return;
  }

  const originalCounts = {
    worlds: store.creationData.worlds.length,
    talentTiers: store.creationData.talentTiers.length,
    origins: store.creationData.origins.length,
    spiritRoots: store.creationData.spiritRoots.length,
    talents: store.creationData.talents.length
  };
  
  // 重置为基础数据
  store.creationData.worlds = LOCAL_WORLDS.map(w => ({ ...w, source: 'local' as const }));
  store.creationData.talentTiers = LOCAL_TALENT_TIERS.map(t => ({ ...t, source: 'local' as const }));
  store.creationData.origins = LOCAL_ORIGINS.map(o => ({ ...o, source: 'local' as const }));
  store.creationData.spiritRoots = LOCAL_SPIRIT_ROOTS.map(s => ({ ...s, source: 'local' as const }));
  store.creationData.talents = LOCAL_TALENTS.map(t => ({ ...t, source: 'local' as const }));
  
  const removedCount = (originalCounts.worlds - store.creationData.worlds.length) +
                       (originalCounts.talentTiers - store.creationData.talentTiers.length) +
                       (originalCounts.origins - store.creationData.origins.length) +
                       (originalCounts.spiritRoots - store.creationData.spiritRoots.length) +
                       (originalCounts.talents - store.creationData.talents.length);

  // 重置当前选择状态
  store.resetCharacter();

  toast.success(`已清除 ${removedCount} 项额外数据，保留基础数据`);
  emit('dataCleared', 'extra', removedCount);
}

// 清除同步缓存
function clearSyncCache() {
  if (!hasSyncCache.value) return;
  
  if (!confirm('确定要清除云端同步缓存吗？这不会影响已添加到Store的数据。')) {
    return;
  }

  const syncStats = cloudDataSync.getSyncStats();
  const removedCount = syncStats.totalSyncedItems;
  
  // 清除云端同步历史和缓存数据
  cloudDataSync.clearSyncHistory();

  toast.success(`已清除 ${removedCount} 项同步缓存`);
  emit('dataCleared', 'cache', removedCount);
}
</script>

<style scoped>
.data-clear-container {
  display: flex;
  align-items: center;
}

.clear-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.clear-button {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.4rem 0.8rem;
  border: 1px solid transparent;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: auto;
}

.clear-button:hover:not(:disabled) {
  background: rgba(var(--color-danger-rgb), 0.2);
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.clear-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.clear-icon {
  font-size: 0.9em;
}

.clear-text {
  font-size: 0.8rem;
  white-space: nowrap;
}

/* 不同类型按钮的特定样式 */
.clear-button.extra:hover:not(:disabled) {
  background: rgba(255, 165, 0, 0.2);
  border-color: orange;
  color: orange;
}

.clear-button.sync:hover:not(:disabled) {
  background: rgba(135, 206, 235, 0.2);
  border-color: skyblue;
  color: skyblue;
}
</style>