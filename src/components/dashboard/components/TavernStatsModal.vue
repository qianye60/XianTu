<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content stats-modal" @click.stop>
      <div class="modal-header">
        <h3>数据统计</h3>
        <button @click="$emit('close')" class="close-btn">
          <X :size="16" />
        </button>
      </div>
      <div class="modal-body">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon chat">
              <MessageSquare :size="24" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ Object.keys(chatVariables).length }}</div>
              <div class="stat-label">聊天变量</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon global">
              <Globe :size="24" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ Object.keys(globalVariables).length }}</div>
              <div class="stat-label">全局变量</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon memory">
              <Brain :size="24" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ getMemoryCount() }}</div>
              <div class="stat-label">记忆条目</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon world">
              <Book :size="24" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ getWorldItemCount() }}</div>
              <div class="stat-label">世界元素</div>
            </div>
          </div>
        </div>

        <div class="data-size-info">
          <h4>数据大小统计</h4>
          <div class="size-list">
            <div class="size-item">
              <span>聊天变量大小:</span>
              <span>{{ formatBytes(getDataSize(chatVariables)) }}</span>
            </div>
            <div class="size-item">
              <span>全局变量大小:</span>
              <span>{{ formatBytes(getDataSize(globalVariables)) }}</span>
            </div>
            <div class="size-item">
              <span>总数据大小:</span>
              <span>{{ formatBytes(getDataSize(allTavernData)) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X, MessageSquare, Globe, Brain, Book } from 'lucide-vue-next'

interface Props {
  chatVariables: Record<string, any>
  globalVariables: Record<string, any>
  allTavernData: any
  getMemoryCount: () => number
  getWorldItemCount: () => number
}

defineProps<Props>()

defineEmits<{
  close: []
}>()

const getDataSize = (data: any): number => {
  return new Blob([JSON.stringify(data)]).size
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--color-background);
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-content.stats-modal {
  max-width: 600px;
}

.modal-header {
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--color-hover);
  color: var(--color-text);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.2s;
}

.stat-card:hover {
  background: var(--color-hover);
  border-color: var(--color-primary);
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.chat {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.stat-icon.global {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.stat-icon.memory {
  background: rgba(168, 85, 247, 0.1);
  color: #a855f7;
}

.stat-icon.world {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.data-size-info {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
}

.data-size-info h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.95rem;
  color: var(--color-text);
}

.size-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.size-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.size-item:last-child {
  border-bottom: none;
}

.size-item span:first-child {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.size-item span:last-child {
  color: var(--color-text);
  font-weight: 500;
  font-size: 0.875rem;
}
</style>