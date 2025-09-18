<template>
  <div class="data-clear-container">
    <div class="clear-buttons">
      <!-- 清除自定义数据（自定义+AI生成），保留本地基础+云端数据 -->
      <button 
        @click="clearCustomData" 
        class="clear-button custom"
        :disabled="!hasCustomData"
        title="清除自定义和AI生成的数据，保留本地基础数据和云端数据"
      >
        <span class="clear-icon">🗑️</span>
        <span class="clear-text">清除自定义数据</span>
      </button>

      <!-- 清除云端数据，保留本地基础+自定义数据 -->
      <button 
        @click="clearCloudData" 
        class="clear-button cloud"
        :disabled="!hasCloudData"
        title="清除从云端获取的数据，保留本地基础数据和自定义数据"
      >
        <span class="clear-icon">☁️</span>
        <span class="clear-text">清除云端数据</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUIStore } from '@/stores/uiStore';
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
const uiStore = useUIStore();

// 检查是否有自定义数据
const hasCustomData = computed(() => {
  // 检查是否有ID大于本地基础数据最大ID的项目（这些是自定义或AI生成的）
  const maxLocalWorldId = Math.max(...LOCAL_WORLDS.map(w => w.id));
  const maxLocalTalentTierId = Math.max(...LOCAL_TALENT_TIERS.map(t => t.id));
  const maxLocalOriginId = Math.max(...LOCAL_ORIGINS.map(o => o.id));
  const maxLocalSpiritRootId = Math.max(...LOCAL_SPIRIT_ROOTS.map(s => s.id));
  const maxLocalTalentId = Math.max(...LOCAL_TALENTS.map(t => t.id));
  
  return store.creationData.worlds.some(w => w.id > maxLocalWorldId) ||
         store.creationData.talentTiers.some(t => t.id > maxLocalTalentTierId) ||
         store.creationData.origins.some(o => o.id > maxLocalOriginId) ||
         store.creationData.spiritRoots.some(s => s.id > maxLocalSpiritRootId) ||
         store.creationData.talents.some(t => t.id > maxLocalTalentId);
});

// 检查是否有云端数据
const hasCloudData = computed(() => {
  return store.creationData.worlds.some(w => w.source === 'cloud') ||
         store.creationData.talentTiers.some(t => t.source === 'cloud') ||
         store.creationData.origins.some(o => o.source === 'cloud') ||
         store.creationData.spiritRoots.some(s => s.source === 'cloud') ||
         store.creationData.talents.some(t => t.source === 'cloud');
});

// 清除自定义数据，保留本地基础+云端数据
async function clearCustomData() {
  if (!hasCustomData.value) return;
  uiStore.showRetryDialog({
    title: '清除自定义数据',
    message: '确定要清除自定义数据吗？这将清除所有自定义和AI生成的数据，保留本地基础数据和云端数据。此操作不可撤销。',
    confirmText: '确认清除',
    cancelText: '取消',
    onConfirm: async () => {
      const originalCounts = {
        worlds: store.creationData.worlds.length,
        talentTiers: store.creationData.talentTiers.length,
        origins: store.creationData.origins.length,
        spiritRoots: store.creationData.spiritRoots.length,
        talents: store.creationData.talents.length
      };

      const maxLocalWorldId = Math.max(...LOCAL_WORLDS.map(w => w.id));
      const maxLocalTalentTierId = Math.max(...LOCAL_TALENT_TIERS.map(t => t.id));
      const maxLocalOriginId = Math.max(...LOCAL_ORIGINS.map(o => o.id));
      const maxLocalSpiritRootId = Math.max(...LOCAL_SPIRIT_ROOTS.map(s => s.id));
      const maxLocalTalentId = Math.max(...LOCAL_TALENTS.map(t => t.id));

      store.creationData.worlds = store.creationData.worlds.filter(w => w.source === 'local' || w.id <= maxLocalWorldId);
      store.creationData.talentTiers = store.creationData.talentTiers.filter(t => t.source === 'local' || t.id <= maxLocalTalentTierId);
      store.creationData.origins = store.creationData.origins.filter(o => o.source === 'local' || o.id <= maxLocalOriginId);
      store.creationData.spiritRoots = store.creationData.spiritRoots.filter(s => s.source === 'local' || s.id <= maxLocalSpiritRootId);
      store.creationData.talents = store.creationData.talents.filter(t => t.source === 'local' || t.id <= maxLocalTalentId);

      const removedCount = (originalCounts.worlds - store.creationData.worlds.length) +
                           (originalCounts.talentTiers - store.creationData.talentTiers.length) +
                           (originalCounts.origins - store.creationData.origins.length) +
                           (originalCounts.spiritRoots - store.creationData.spiritRoots.length) +
                           (originalCounts.talents - store.creationData.talents.length);

      store.resetCharacter();
      await store.persistCustomData();
      toast.success(`已清除 ${removedCount} 项自定义数据，保留本地基础数据和云端数据`);
      emit('dataCleared', 'custom', removedCount);
    },
    onCancel: () => {}
  });
}

// 清除云端数据，保留本地基础+自定义数据
function clearCloudData() {
  if (!hasCloudData.value) return;
  uiStore.showRetryDialog({
    title: '清除云端数据',
    message: '确定要清除云端数据吗？这将清除从云端获取的数据，保留本地基础数据和自定义数据。此操作不可撤销。',
    confirmText: '确认清除',
    cancelText: '取消',
    onConfirm: () => {
      const originalCounts = {
        worlds: store.creationData.worlds.length,
        talentTiers: store.creationData.talentTiers.length,
        origins: store.creationData.origins.length,
        spiritRoots: store.creationData.spiritRoots.length,
        talents: store.creationData.talents.length
      };

      store.creationData.worlds = store.creationData.worlds.filter(w => w.source !== 'cloud');
      store.creationData.talentTiers = store.creationData.talentTiers.filter(t => t.source !== 'cloud');
      store.creationData.origins = store.creationData.origins.filter(o => o.source !== 'cloud');
      store.creationData.spiritRoots = store.creationData.spiritRoots.filter(s => s.source !== 'cloud');
      store.creationData.talents = store.creationData.talents.filter(t => t.source !== 'cloud');

      const removedCount = (originalCounts.worlds - store.creationData.worlds.length) +
                           (originalCounts.talentTiers - store.creationData.talentTiers.length) +
                           (originalCounts.origins - store.creationData.origins.length) +
                           (originalCounts.spiritRoots - store.creationData.spiritRoots.length) +
                           (originalCounts.talents - store.creationData.talents.length);

      store.resetCharacter();
      toast.success(`已清除 ${removedCount} 项云端数据，保留本地数据和自定义数据`);
      emit('dataCleared', 'cloud', removedCount);
    },
    onCancel: () => {}
  });
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
