<template>
  <div class="game-variable-data-header">
    <div class="panel-header">
      <h2 class="panel-title">
        <Database :size="20" />
        <span>游戏变量查看</span>
      </h2>
      <div class="header-actions">
        <div class="search-bar">
          <Search :size="16" />
          <input
            :value="searchQuery"
            @input="$emit('update:search-query', $event.target.value)"
            placeholder="搜索数据..."
            class="search-input"
          />
        </div>
        <button class="format-guide-btn" @click="$emit('show-format-guide')" title="查看数据格式说明">
          <BookOpen :size="16" />
          <span>格式说明</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Database, Search, BookOpen } from 'lucide-vue-next'

interface Props {
  searchQuery: string
  isRefreshing: boolean
}

defineProps<Props>()

defineEmits<{
  'update:search-query': [value: string]
  'show-format-guide': []
  'refresh': []
  'export': []
  'show-stats': []
}>()
</script>

<style scoped>
.panel-header {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.2rem;
  color: var(--color-text);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.5rem;
  min-width: 180px;
  flex: 1 1 220px;
}

.search-input {
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text);
  font-size: 0.875rem;
  flex: 1;
}

.format-guide-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
  white-space: nowrap;
}

.format-guide-btn:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
}

/* 手机端适配 */
@media (max-width: 640px) {
  .panel-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }
  
  .panel-title {
    font-size: 1.1rem;
  }
  
  .header-actions {
    justify-content: stretch;
  }
  
  .search-bar {
    min-width: 100%;
    flex: 1;
  }
}

@media (max-width: 480px) {
  .panel-header {
    padding: 0.75rem;
  }
  
  .panel-title {
    font-size: 1rem;
  }
  
  .search-bar {
    padding: 0.4rem;
  }
  
  .search-input {
    font-size: 0.8rem;
  }
}

.header-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 0 0 auto;
  white-space: nowrap;
  min-width: fit-content;
}

.refresh-btn,
.export-btn,
.stats-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
  white-space: nowrap;
}

.refresh-btn:hover,
.export-btn:hover,
.stats-btn:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 560px) {
  .header-buttons .refresh-btn span,
  .header-buttons .export-btn span,
  .header-buttons .stats-btn span {
    display: none;
  }
}
</style>
