<template>
  <div class="save-migration">
    <div class="migration-header">
      <h4>检测到旧版存档结构</h4>
      <p>此存档不符合 V3（5领域：元数据/角色/社交/世界/系统），必须迁移后才能加载。</p>
    </div>

    <div class="migration-meta">
      <div class="meta-item">
        <span class="label">角色ID</span>
        <span class="value">{{ characterId }}</span>
      </div>
      <div class="meta-item">
        <span class="label">存档槽位</span>
        <span class="value">{{ saveSlot }}</span>
      </div>
    </div>

    <div class="migration-reasons">
      <div class="reason-title">检测到的旧字段</div>
      <div class="reason-list">
        <span v-for="k in legacyKeysFound" :key="k" class="tag">{{ k }}</span>
      </div>
    </div>

    <div class="migration-hint">
      <div>操作会自动：</div>
      <ul>
        <li>先在 IndexedDB 创建一份隐藏备份（不出现在存档列表）</li>
        <li>覆盖写回当前槽位为 V3 新结构存档</li>
      </ul>
    </div>

    <div class="migration-actions">
      <button class="primary" :disabled="busy" @click="confirmMigration">
        {{ busy ? '正在迁移…' : '备份并迁移' }}
      </button>
      <button class="secondary" :disabled="busy" @click="cancelMigration">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';

interface Props {
  characterId: string;
  saveSlot: string;
  legacyKeysFound: string[];
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

const props = defineProps<Props>();
const busy = ref(false);
let resolved = false;

const confirmMigration = async () => {
  if (busy.value) return;
  busy.value = true;
  try {
    resolved = true;
    await props.onConfirm?.();
  } finally {
    busy.value = false;
  }
};

const cancelMigration = () => {
  if (busy.value) return;
  resolved = true;
  props.onCancel?.();
};

onBeforeUnmount(() => {
  if (!resolved) {
    props.onCancel?.();
  }
});
</script>

<style scoped>
.save-migration {
  display: flex;
  flex-direction: column;
  gap: 14px;
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

.migration-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
  word-break: break-all;
}

.migration-reasons {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reason-title {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.reason-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  font-size: 0.75rem;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(var(--color-warning-rgb), 0.35);
  background: rgba(var(--color-warning-rgb), 0.08);
  color: var(--color-text);
}

.migration-hint {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.migration-hint ul {
  margin: 6px 0 0 18px;
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
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
</style>
