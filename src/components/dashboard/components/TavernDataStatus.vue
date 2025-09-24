<template>
  <div class="data-status">
    <div class="status-item">
      <span class="status-label">连接状态:</span>
      <span class="status-value" :class="{ connected: tavernConnected, disconnected: !tavernConnected }">
        {{ tavernConnected ? '已连接' : '未连接' }}
      </span>
    </div>
    <div class="status-item">
      <span class="status-label">数据更新时间:</span>
      <span class="status-value">{{ lastUpdateTime || '从未更新' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  tavernConnected: boolean
  lastUpdateTime: string
}

defineProps<Props>()
</script>

<style scoped>
.data-status {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  gap: 2rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.status-value {
  font-size: 0.875rem;
  font-weight: 500;
}

.status-value.connected {
  color: var(--color-success);
}

.status-value.disconnected {
  color: var(--color-danger);
}
</style>
