<template>
  <div class="sect-migration">
    <div class="migration-header">
      <h4>检测到旧版宗门存档</h4>
      <p>将把宗门数据升级到 V{{ targetVersion }}，只写入 V3 路径（不再保留旧字段）。</p>
    </div>

    <div v-if="displayReasons.length" class="migration-reasons">
      <div v-for="reason in displayReasons" :key="reason" class="reason-item">
        <span class="dot"></span>
        <span>{{ reason }}</span>
      </div>
    </div>

    <div class="migration-meta">
      <div class="meta-item">
        <span class="label">当前宗门</span>
        <span class="value">{{ currentSectName }}</span>
      </div>
      <div class="meta-item">
        <span class="label">势力数量</span>
        <span class="value">{{ factionCount }}</span>
      </div>
      <div class="meta-item">
        <span class="label">存档模式</span>
        <span class="value">{{ modeLabel }}</span>
      </div>
    </div>

    <div class="migration-actions">
      <button class="primary" :disabled="isMigrating" @click="runMigration">
        {{ isMigrating ? '正在迁移...' : '创建备份并迁移' }}
      </button>
      <button class="secondary" :disabled="isMigrating" @click="later">
        稍后再说
      </button>
    </div>

    <p class="migration-hint">
      迁移前会自动备份：单机模式生成新存档槽，联机模式写入本地备份记录。
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useCharacterStore } from '@/stores/characterStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useUIStore } from '@/stores/uiStore';
import { toast } from '@/utils/toast';
import * as storage from '@/utils/indexedDBManager';
import { migrateSectSaveData, SECT_SYSTEM_VERSION } from '@/utils/sectMigration';
import type { SaveData } from '@/types/game';

interface Props {
  reasons?: string[];
  fromVersion?: number;
  toVersion?: number;
}

const props = defineProps<Props>();
const characterStore = useCharacterStore();
const gameStateStore = useGameStateStore();
const uiStore = useUIStore();
const isMigrating = ref(false);

const targetVersion = computed(() => props.toVersion ?? SECT_SYSTEM_VERSION);
const displayReasons = computed(() => props.reasons?.length ? props.reasons : ['检测到旧版宗门字段']);

const currentSectName = computed(() => {
  const fromPlayer = gameStateStore.sectMemberInfo?.宗门名称;
  const fromSystem = gameStateStore.sectSystem?.当前宗门 ?? undefined;
  return fromPlayer || fromSystem || '未加入宗门';
});

const factionCount = computed(() => {
  const sectSystem = gameStateStore.sectSystem;
  if (sectSystem?.宗门档案) {
    return Object.keys(sectSystem.宗门档案).length;
  }
  return gameStateStore.worldInfo?.势力信息?.length || 0;
});

const modeLabel = computed(() => characterStore.activeCharacterProfile?.模式 || '未知');

const formatStamp = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

const createBackup = async (saveData: SaveData) => {
  const active = characterStore.rootState.当前激活存档;
  const profile = characterStore.activeCharacterProfile;
  if (!active || !profile) {
    toast.warning('无法创建备份：未找到激活存档');
    return;
  }

  const backupName = `宗门迁移备份-${formatStamp()}`;

  if (profile.模式 === '单机') {
    await characterStore.saveAsNewSlot(backupName);
    return;
  }

  await storage.saveSaveData(active.角色ID, backupName, saveData);
  const backupIndexKey = 'sect_migration_backups';
  const record = { 角色ID: active.角色ID, 存档槽位: backupName, 时间: new Date().toISOString() };
  const existing = JSON.parse(localStorage.getItem(backupIndexKey) || '[]');
  existing.push(record);
  localStorage.setItem(backupIndexKey, JSON.stringify(existing.slice(-20)));
  toast.success(`已创建本地备份：${backupName}`);
};

const runMigration = async () => {
  if (isMigrating.value) return;
  isMigrating.value = true;

  try {
    const saveData = gameStateStore.getCurrentSaveData();
    if (!saveData) {
      toast.error('未找到存档数据，无法迁移');
      return;
    }

    await createBackup(saveData);

    const migrated = migrateSectSaveData(saveData);
    gameStateStore.loadFromSaveData(migrated);
    await characterStore.saveCurrentGame();

    toast.success('宗门存档迁移完成');
    uiStore.hideDetailModal();
  } catch (error) {
    toast.error(`宗门存档迁移失败：${error instanceof Error ? error.message : '未知错误'}`);
  } finally {
    isMigrating.value = false;
  }
};

const later = () => {
  uiStore.hideDetailModal();
};
</script>

<style scoped>
.sect-migration {
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--color-text);
}

.migration-header h4 {
  margin: 0 0 6px 0;
  font-size: 1.05rem;
}

.migration-header p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.migration-reasons {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px;
}

.reason-item {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.reason-item .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-warning);
  flex-shrink: 0;
}

.migration-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
}

.meta-item {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-item .label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.meta-item .value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.migration-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.migration-actions button {
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.migration-actions .primary {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
}

.migration-actions .primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.migration-actions .secondary {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.migration-hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: rgba(var(--color-primary-rgb), 0.08);
  padding: 8px 10px;
  border-radius: 8px;
}
</style>
