<template>
  <div class="state-change-overlay" @click.self="$emit('close')">
    <div class="state-change-viewer">
      <div class="viewer-header">
        <h3><ScrollText :size="18" /> {{ $t('变更日志') }}</h3>
        <button @click="$emit('close')" class="close-btn">
          <X :size="20" />
        </button>
      </div>
      <div class="viewer-summary">
        <div class="summary-item added">
          <PlusCircle :size="16" />
          <span>{{ $t('新增') }} {{ formattedLog.summary.added }}</span>
        </div>
        <div class="summary-item removed">
          <MinusCircle :size="16" />
          <span>{{ $t('移除') }} {{ formattedLog.summary.removed }}</span>
        </div>
        <div class="summary-item updated">
          <RefreshCw :size="16" />
          <span>{{ $t('更新') }} {{ formattedLog.summary.updated }}</span>
        </div>
        <div v-if="formattedLog.summary.errors > 0" class="summary-item errors">
          <X :size="16" />
          <span>{{ $t('错误') }} {{ formattedLog.summary.errors }}</span>
        </div>
      </div>
      <div class="viewer-content">
        <div v-if="formattedLog.changes.length === 0" class="no-changes">
          <p>{{ $t('本次操作没有产生可见的状态变更。') }}</p>
        </div>
        <div v-else class="changes-list">
          <div
            v-for="(change, index) in formattedLog.changes"
            :key="index"
            class="change-item"
            :class="`item-${change.color}`"
          >
            <div class="item-icon">
              <Plus v-if="change.icon === 'add'" :size="18" />
              <Minus v-else-if="change.icon === 'remove'" :size="18" />
              <RefreshCw v-else-if="change.icon === 'update'" :size="18" />
              <X v-else-if="change.icon === 'error'" :size="18" />
              <Info v-else :size="18" />
            </div>
            <div class="item-content">
              <p class="item-title">{{ change.title }}</p>
              <p class="item-description">{{ change.description }}</p>
              <div v-if="change.details && change.details.length > 0" class="item-details">
                <p v-for="(detail, idx) in change.details" :key="idx">{{ detail }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { StateChangeLog } from '@/types/game';
import { formatStateChanges, FormattedStateChangeLog } from '@/utils/stateChangeFormatter';
import { PlusCircle, MinusCircle, RefreshCw, Plus, Minus, Info, X, ScrollText } from 'lucide-vue-next';

const props = defineProps<{
  log: StateChangeLog;
}>();

defineEmits(['close']);

const formattedLog = computed<FormattedStateChangeLog>(() => {
  return formatStateChanges(props.log);
});
</script>

<style scoped>
.state-change-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.state-change-viewer {
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  background-color: var(--color-surface);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  animation: modal-fade-in 0.3s ease-out;
}

@keyframes modal-fade-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.viewer-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0.25rem;
  border-radius: 50%;
  transition: all 0.2s ease;
}
.close-btn:hover {
  background-color: var(--color-surface-hover);
  color: var(--color-text);
}

.viewer-summary {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--color-surface-light);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
}
.summary-item.added { color: var(--color-success); }
.summary-item.removed { color: #ff9800; }
.summary-item.updated { color: var(--color-info); }
.summary-item.errors { color: var(--color-error); }

.viewer-content {
  overflow-y: auto;
  padding: 1rem 1.25rem;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}

.viewer-content::-webkit-scrollbar { width: 6px; }
.viewer-content::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

.no-changes {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.changes-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.change-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border-radius: 10px;
  border-left: 4px solid;
  background: var(--color-surface-light);
  transition: all 0.2s ease;
}

.change-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.item-green { border-color: var(--color-success); }
.item-red { border-color: var(--color-error); }
.item-blue { border-color: var(--color-info); }
.item-gray { border-color: var(--color-text-secondary); }
.item-orange { border-color: #ff9800; }

.item-icon {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: white;
}
.item-green .item-icon { background: var(--color-success); }
.item-red .item-icon { background: var(--color-error); }
.item-blue .item-icon { background: var(--color-info); }
.item-gray .item-icon { background: var(--color-text-secondary); }
.item-orange .item-icon { background: #ff9800; }

.item-content { flex: 1; }

.item-title {
  margin: 0 0 0.25rem 0;
  font-weight: 600;
  color: var(--color-text);
}

.item-description {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
}

.item-details {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-family: 'Courier New', monospace;
}

.item-details p {
  margin: 0.25rem 0;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>