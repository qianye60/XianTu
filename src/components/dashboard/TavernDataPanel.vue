<template>
  <div class="tavern-data-panel">
    <TavernDataHeader
      :isRefreshing="isRefreshing"
      :searchQuery="searchQuery"
      @update:search-query="searchQuery = $event"
      @refresh="refreshData"
      @export="exportData"
      @show-stats="showDataStats"
    />

    <TavernDataStatus
      :tavernConnected="tavernConnected"
      :lastUpdateTime="lastUpdateTime"
    />

    <TavernDataSelector
      :dataTypes="dataTypes"
      :selectedType="selectedDataType"
      :getDataCount="getDataCount"
      @update:selected-type="selectedDataType = $event"
    />

    <TavernDataDisplay
      :isLoading="isLoading"
      :tavernConnected="tavernConnected"
      :selectedDataType="selectedDataType"
      :searchQuery="searchQuery"
      :chatVariables="chatVariables"
      :globalVariables="globalVariables"
      :characterData="characterData"
      :saveData="saveData"
      :worldInfo="worldInfo"
      :memoryData="memoryData"
      :allTavernData="allTavernData"
      :filteredChatVariables="filteredChatVariables"
      :filteredGlobalVariables="filteredGlobalVariables"
      @edit-variable="editVariable"
      @copy-variable="copyVariable"
      @delete-variable="deleteVariable"
      @add-new-variable="addNewVariable"
      @debug-log="debugLogData"
    />

    <TavernEditModal
      v-if="showEditModal"
      :editingItem="editingItem"
      @close="closeEditModal"
      @save="saveVariable"
    />

    <TavernStatsModal
      v-if="showDataStatsModal"
      :chatVariables="chatVariables"
      :globalVariables="globalVariables"
      :allTavernData="allTavernData"
      :getMemoryCount="getMemoryCount"
      :getWorldItemCount="getWorldItemCount"
      @close="showDataStatsModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getTavernHelper } from '@/utils/tavern'
import { toast } from '@/utils/toast'
import { panelBus } from '@/utils/panelBus'
// Removed unused type imports to satisfy ESLint
import { useTavernData } from '../../composables/useTavernData'
import { useTavernVariables } from '../../composables/useTavernVariables'
import TavernDataHeader from './components/TavernDataHeader.vue'
import TavernDataStatus from './components/TavernDataStatus.vue'
import TavernDataSelector from './components/TavernDataSelector.vue'
import TavernDataDisplay from './components/TavernDataDisplay.vue'
import TavernEditModal from './components/TavernEditModal.vue'
import TavernStatsModal from './components/TavernStatsModal.vue'

// 类型定义
type TavernVariableValue = string | number | boolean | object | null | undefined

interface EditingItem {
  type: string
  key: string
  value: TavernVariableValue
}




// 状态管理
const tavernConnected = ref(false)
const isLoading = ref(false)
const isRefreshing = ref(false)
const lastUpdateTime = ref('')
const selectedDataType = ref('chat')
const searchQuery = ref('')
const showDataStatsModal = ref(false)
const editingItem = ref<EditingItem | null>(null)
const showEditModal = ref(false)

// 使用组合函数
const {
  chatVariables,
  globalVariables,
  characterData,
  saveData,
  worldInfo,
  memoryData,
  allTavernData,
  refreshTavernData
} = useTavernData()

const {
  filteredChatVariables,
  filteredGlobalVariables,
  getDataCount,
  getMemoryCount,
  getWorldItemCount
} = useTavernVariables({
  chatVariables,
  globalVariables,
  characterData,
  saveData,
  worldInfo,
  memoryData,
  searchQuery
})

// 数据类型配置
const dataTypes = [
  { key: 'chat',      label: '聊天变量', icon: 'MessageSquare' },
  { key: 'global',    label: '全局变量', icon: 'Globe' },
  { key: 'character', label: '角色数据', icon: 'Users' },
  { key: 'saveData',  label: '存档数据', icon: 'Archive' },
  { key: 'worldInfo', label: '世界信息', icon: 'Book' },
  { key: 'memory',    label: '记忆数据', icon: 'Brain' },
  { key: 'raw',       label: '原始数据', icon: 'Code' }
]

// 基础方法
const refreshData = async () => {
  isRefreshing.value = true
  isLoading.value = true

  try {
    const helper = getTavernHelper()
    if (!helper) {
      tavernConnected.value = false
      toast.error('未连接到酒馆')
      return
    }

    tavernConnected.value = true
    await refreshTavernData()
    lastUpdateTime.value = new Date().toLocaleString('zh-CN')
    toast.success('数据刷新成功')
  } catch (error) {
    console.error('[酒馆数据] 刷新失败:', error)
    toast.error('数据刷新失败: ' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    isLoading.value = false
    isRefreshing.value = false
  }
}

const exportData = () => {
  try {
    const dataStr = JSON.stringify(allTavernData.value, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tavern-data-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('数据导出成功')
  } catch (error) {
    console.error('[酒馆数据] 导出失败:', error)
    toast.error('数据导出失败')
  }
}

const showDataStats = () => {
  showDataStatsModal.value = true
}

const addNewVariable = (type: 'chat' | 'global') => {
  editingItem.value = { type, key: '', value: '' }
  showEditModal.value = true
}

const editVariable = (type: string, key: string, value: TavernVariableValue) => {
  editingItem.value = { type, key, value }
  showEditModal.value = true
}

const copyVariable = async (key: string, value: TavernVariableValue) => {
  try {
    const text = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
    await navigator.clipboard.writeText(`${key}: ${text}`)
    toast.success('已复制到剪贴板')
  } catch (error) {
    console.error('[酒馆数据] 复制失败:', error)
    toast.error('复制失败')
  }
}

const deleteVariable = async (type: 'chat' | 'global', key: string) => {
  if (!confirm(`确定要删除变量 "${key}" 吗？`)) return

  try {
    const helper = getTavernHelper()
    if (!helper) {
      toast.error('未连接到酒馆')
      return
    }

    await helper.deleteVariable(key, { type })

    if (type === 'chat') {
      delete chatVariables.value[key]
    } else {
      delete globalVariables.value[key]
    }

    toast.success('变量删除成功')
  } catch (error) {
    console.error('[酒馆数据] 删除失败:', error)
    toast.error('删除失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }
}

const saveVariable = async () => {
  if (!editingItem.value) return

  try {
    const helper = getTavernHelper()
    if (!helper) {
      toast.error('未连接到酒馆')
      return
    }

    let value: TavernVariableValue
    const rawValue = editingItem.value.value

    try {
      value = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue
    } catch {
      value = rawValue
    }

    const { type, key } = editingItem.value
    const data = { [key]: value }
    await helper.insertOrAssignVariables(data, { type: type as 'chat' | 'global' })

    if (type === 'chat') {
      chatVariables.value[key] = value
    } else {
      globalVariables.value[key] = value
    }

    closeEditModal()
    toast.success('变量保存成功')
  } catch (error) {
    console.error('[酒馆数据] 保存失败:', error)
    toast.error('保存失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }
}

const closeEditModal = () => {
  showEditModal.value = false
  editingItem.value = null
}

const debugLogData = () => {
  console.group('[酒馆数据] 详细调试信息')
  console.log('基本统计:', {
    tavernConnected: tavernConnected.value,
    chatVariablesCount: Object.keys(chatVariables.value).length,
    globalVariablesCount: Object.keys(globalVariables.value).length,
    lastUpdateTime: lastUpdateTime.value
  })
  console.log('聊天变量键名:', Object.keys(chatVariables.value))
  console.log('全局变量键名:', Object.keys(globalVariables.value))
  console.groupEnd()
  toast.success('调试信息已输出到控制台')
}

// 组件挂载
onMounted(() => {
  refreshData()
  panelBus.on('refresh', () => refreshData())
  panelBus.on('export', () => exportData())
  panelBus.on('stats', () => showDataStats())
})
</script>

<style scoped>
.tavern-data-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
}
</style>
