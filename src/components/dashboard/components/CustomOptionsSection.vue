<template>
  <div class="variable-section">
    <div class="section-header">
      <h3 class="section-title">{{ type === 'chat' ? 'Chat Variables (聊天变量)' : type === 'core' ? 'Core Data (核心数据)' : 'Custom Options (自定义选项)' }}</h3>
      <button @click="$emit('add-new-variable', type)" class="add-btn" :disabled="readOnly">
        <Plus :size="14" />
        <span>新增变量</span>
      </button>
    </div>

    <div class="variable-content">
      <div v-if="Object.keys(variables).length > 0" class="variable-list">
        <div v-for="(value, key) in variables" :key="key" class="variable-item">
          <div class="variable-header">
            <span class="variable-key">{{ key }}</span>
            <span class="variable-type">{{ getDataType(value) }}</span>
            <div class="variable-actions">
              <button @click="$emit('edit-variable', { type, key, value })" class="action-btn edit" title="编辑" :disabled="readOnly">
                <Edit3 :size="12" />
              </button>
              <button @click="$emit('copy-variable', { key, value })" class="action-btn copy" title="复制">
                <Copy :size="12" />
              </button>
              <button @click="$emit('delete-variable', { type, key })" class="action-btn delete" title="删除" :disabled="readOnly">
                <Trash2 :size="12" />
              </button>
            </div>
          </div>
          <div class="variable-value">
            <pre v-if="typeof value === 'object'" class="code-pre">{{ JSON.stringify(value, null, 2) }}</pre>
            <span v-else>{{ value }}</span>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <Package :size="32" />
        <p v-if="searchQuery">无匹配的变量</p>
        <p v-else>{{ type === 'chat' ? '暂无聊天变量' : type === 'core' ? '暂无核心数据' : '暂无自定义选项' }}</p>

        <div class="debug-info">
          <details>
            <summary>🔍 调试信息 (点击展开)</summary>
            <div class="debug-content">
              <p><strong>连接状态:</strong> ✅已连接</p>
              <p><strong>变量数量:</strong> {{ Object.keys(variables).length }}</p>
              <div class="debug-actions">
                <button @click="$emit('debug-log')" class="debug-btn">
                  🖼️ 控制台输出
                </button>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Edit3, Copy, Trash2, Package } from 'lucide-vue-next'

type GameVariableValue = string | number | boolean | object | null | undefined

interface Props {
  type: 'chat' | 'custom' | 'core'
  variables: Record<string, GameVariableValue>
  searchQuery: string
  readOnly?: boolean
  chatVariables?: Record<string, GameVariableValue>
  customOptions?: Record<string, GameVariableValue>
  coreDataViews?: Record<string, GameVariableValue>
}

withDefaults(defineProps<Props>(), {
  readOnly: false
})

defineEmits<{
  (e: 'edit-variable', event: { type: string; key: string; value: GameVariableValue }): void
  (e: 'copy-variable', event: { key: string; value: GameVariableValue }): void
  (e: 'delete-variable', event: { type: string; key: string }): void
  (e: 'add-new-variable', type: string): void
  (e: 'debug-log'): void
}>()

const getDataType = (value: GameVariableValue): string => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return `array[${value.length}]`
  if (typeof value === 'object') return `object{${Object.keys(value).length}}`
  return typeof value
}
</script>

<style scoped>
.variable-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.section-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.add-btn {
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
}

.add-btn:hover {
  background: var(--color-primary-hover);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--color-border);
}

.variable-content {
  flex: 1;
  overflow: hidden;
}

.variable-list {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.variable-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 1rem;
}

.variable-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 0.5rem;
}

.variable-key {
  font-weight: 600;
  color: var(--color-primary);
  flex: 1;
  word-break: break-word;
}

.variable-type {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  background: var(--color-accent-light);
  color: var(--color-accent);
  border-radius: 4px;
  flex-shrink: 0;
}

.variable-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--color-text-secondary);
  background: var(--color-surface);
}

.action-btn:hover {
  background: var(--color-hover);
  color: var(--color-text);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border-color: var(--color-border);
}

.action-btn.edit:disabled:hover,
.action-btn.copy:disabled:hover,
.action-btn.delete:disabled:hover {
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border-color: var(--color-border);
}

.action-btn.edit:hover {
  background: var(--color-info);
  color: white;
  border-color: var(--color-info);
}

.action-btn.copy:hover {
  background: var(--color-success);
  color: white;
  border-color: var(--color-success);
}

.action-btn.delete:hover {
  background: var(--color-danger);
  color: white;
  border-color: var(--color-danger);
}

.variable-value {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  word-break: break-word;
}

.code-pre {
  margin: 0;
  padding: 0.75rem;
  background: var(--color-code-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  max-height: 200px;
  overflow: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.8rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: var(--color-text-secondary);
  text-align: center;
}

.debug-info {
  margin-top: 1rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.debug-info summary {
  cursor: pointer;
  color: var(--color-primary);
}

.debug-content {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: var(--color-surface);
  border-radius: 4px;
  text-align: left;
}

.debug-actions {
  margin-top: 0.5rem;
}

.debug-btn {
  padding: 0.25rem 0.5rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
}

/* 手机端适配 */
@media (max-width: 640px) {
  .variable-section {
    padding: 0.75rem;
  }
  
  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  
  .section-title {
    font-size: 1rem;
    text-align: center;
  }
  
  .add-btn {
    align-self: center;
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }
  
  .variable-item {
    padding: 0.75rem;
  }
  
  .variable-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  
  .variable-key {
    font-size: 0.9rem;
  }
  
  .variable-actions {
    justify-content: center;
    gap: 0.5rem;
  }
  
  .action-btn {
    width: 32px;
    height: 32px;
  }
  
  .code-pre {
    font-size: 0.75rem;
    padding: 0.5rem;
  }
}

@media (max-width: 480px) {
  .variable-section {
    padding: 0.5rem;
  }
  
  .section-title {
    font-size: 0.9rem;
  }
  
  .add-btn {
    padding: 0.35rem 0.7rem;
    font-size: 0.75rem;
  }
  
  .variable-item {
    padding: 0.5rem;
  }
  
  .variable-key {
    font-size: 0.85rem;
  }
  
  .variable-type {
    font-size: 0.7rem;
  }
  
  .action-btn {
    width: 28px;
    height: 28px;
  }
  
  .code-pre {
    font-size: 0.7rem;
    padding: 0.4rem;
  }
  
  .empty-state {
    padding: 2rem 0.5rem;
  }
}
</style>
