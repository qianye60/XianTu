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
        @edit-variable="(item) => $emit('edit-variable', item)"
        @copy-variable="(item) => $emit('copy-variable', item)"
        @delete-variable="(item) => $emit('delete-variable', item)"
        @add-new-variable="$emit('add-new-variable', $event)"
        @debug-log="$emit('debug-log')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { AlertCircle, Loader2 } from 'lucide-vue-next'
import CustomOptionsSection from './CustomOptionsSection.vue'
import GameVariableCharacterSection from './GameVariableCharacterSection.vue'
import GameVariableSaveDataSection from './GameVariableSaveDataSection.vue'
import GameVariableWorldInfoSection from './GameVariableWorldInfoSection.vue'
import GameVariableMemorySection from './GameVariableMemorySection.vue'
import GameVariableRawDataSection from './GameVariableRawDataSection.vue'

type GameVariableValue = string | number | boolean | object | null | undefined

interface Props {
  isLoading: boolean
  tavernConnected: boolean
  selectedDataType: string
  searchQuery: string
  chatVariables: Record<string, GameVariableValue>
  customOptions: Record<string, GameVariableValue>
  characterData: Record<string, GameVariableValue>
  saveData: Record<string, GameVariableValue>
  worldInfo: Record<string, GameVariableValue>
  memoryData: Record<string, GameVariableValue>
  allGameData: Record<string, GameVariableValue>
  filteredChatVariables: Record<string, GameVariableValue>
  filteredCustomOptions: Record<string, GameVariableValue>
}

const props = defineProps<Props>()

defineEmits<{
  (e: 'edit-variable', event: { type: string; key: string; value: GameVariableValue }): void
  (e: 'copy-variable', event: { key: string; value: GameVariableValue }): void
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
    case 'custom':
      return CustomOptionsSection
    case 'character':
      return GameVariableCharacterSection
    case 'saveData':
      return GameVariableSaveDataSection
    case 'worldInfo':
      return GameVariableWorldInfoSection
    case 'memory':
      return GameVariableMemorySection
    case 'raw':
      return GameVariableRawDataSection
    default:
      return CustomOptionsSection
  }
}

const getCurrentDataProps = () => {
  const baseProps = {
    searchQuery: props.searchQuery,
    chatVariables: props.chatVariables || {},
    customOptions: props.customOptions || {},
  }

  switch (props.selectedDataType) {
    case 'chat':
      return {
        ...baseProps,
        type: 'chat' as const,
        variables: props.filteredChatVariables || {}
      }
    case 'custom':
      return {
        ...baseProps,
        type: 'custom' as const,
        variables: props.filteredCustomOptions || {}
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
        allGameData: props.allGameData
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