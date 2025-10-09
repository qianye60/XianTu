<template>
  <div class="data-display">
    <div v-if="isLoading" class="loading-state">
      <Loader2 :size="32" class="animate-spin" />
      <p>正在加载数据...</p>
    </div>

    <div v-else-if="!tavernConnected" class="no-connection">
      <AlertCircle :size="48" />
      <p>未检测到酒馆连接</p>
      <p class="hint">Make sure the SillyTavern extension is enabled</p>
    </div>

    <div v-else class="data-content">
      <div v-if="hasError" class="error-state">
        <AlertCircle :size="48" />
        <p>数据显示出错</p>
        <p class="hint">请尝试刷新数据</p>
        <button @click="clearError" class="retry-btn">重试</button>
      </div>
      <component
        v-else
        :is="getCurrentDataComponent()"
        v-bind="getCurrentDataProps()"
        @edit-variable="(item: any) => $emit('edit-variable', item)"
        @copy-variable="(item: any) => $emit('copy-variable', item)"
        @delete-variable="(item: any) => $emit('delete-variable', item)"
        @add-new-variable="$emit('add-new-variable', $event)"
        @debug-log="$emit('debug-log')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { AlertCircle, Loader2 } from 'lucide-vue-next'
import TavernVariableSection from './TavernVariableSection.vue'
import TavernCharacterSection from './TavernCharacterSection.vue'
import TavernSaveDataSection from './TavernSaveDataSection.vue'
import TavernWorldInfoSection from './TavernWorldInfoSection.vue'
import TavernMemorySection from './TavernMemorySection.vue'
import TavernRawDataSection from './TavernRawDataSection.vue'

interface Props {
  isLoading: boolean
  tavernConnected: boolean
  selectedDataType: string
  searchQuery: string
  chatVariables: Record<string, any>
  globalVariables: Record<string, any>
  characterData: any
  saveData: any
  worldInfo: any
  memoryData: any
  allTavernData: any
  filteredChatVariables: Record<string, any>
  filteredGlobalVariables: Record<string, any>
}

const props = defineProps<Props>()

defineEmits<{
  (e: 'edit-variable', event: { type: string; key: string; value: any }): void
  (e: 'copy-variable', event: { key: string; value: any }): void
  (e: 'delete-variable', event: { type: string; key: string }): void
  (e: 'add-new-variable', type: string): void
  (e: 'debug-log'): void
}>()

// 错误处理
const hasError = ref(false)

const clearError = () => {
  hasError.value = false
}

const getCurrentDataComponent = () => {
  switch (props.selectedDataType) {
    case 'chat':
    case 'global':
      return TavernVariableSection
    case 'character':
      return TavernCharacterSection
    case 'saveData':
      return TavernSaveDataSection
    case 'worldInfo':
      return TavernWorldInfoSection
    case 'memory':
      return TavernMemorySection
    case 'raw':
      return TavernRawDataSection
    default:
      return TavernVariableSection
  }
}

const getCurrentDataProps = () => {
  const baseProps = {
    searchQuery: props.searchQuery,
    chatVariables: props.chatVariables || {},
    globalVariables: props.globalVariables || {},
  }

  switch (props.selectedDataType) {
    case 'chat':
      return {
        ...baseProps,
        type: 'chat' as const,
        variables: props.filteredChatVariables || {}
      }
    case 'global':
      return {
        ...baseProps,
        type: 'global' as const,
        variables: props.filteredGlobalVariables || {}
      }
    case 'character':
      return {
        characterData: props.characterData
      }
    case 'saveData':
      return {
        saveData: props.saveData
      }
    case 'worldInfo':
      return {
        worldInfo: props.worldInfo
      }
    case 'memory':
      return {
        memoryData: props.memoryData
      }
    case 'raw':
      return {
        allTavernData: props.allTavernData
      }
    default:
      // 默认返回 chat 类型的 props
      return {
        ...baseProps,
        type: 'chat' as const,
        variables: props.filteredChatVariables || {}
      }
  }
}
</script>

<style scoped>
.data-display {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}

.loading-state,
.no-connection,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  color: var(--color-text-secondary);
}

.retry-btn {
  padding: 0.5rem 1rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: var(--color-primary-hover);
}

.hint {
  font-size: 0.875rem;
  opacity: 0.7;
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
</style>