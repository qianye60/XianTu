<template>
  <div class="game-variable-panel">
    <GameVariableDataHeader
      :isRefreshing="isRefreshing"
      :searchQuery="searchQuery"
      @update:search-query="searchQuery = $event"
      @refresh="refreshData"
      @export="exportData"
      @show-stats="showDataStats"
    />

    <GameVariableDataSelector
      :dataTypes="dataTypes"
      :selectedType="selectedDataType"
      :getDataCount="getDataCount"
      @update:selected-type="selectedDataType = $event"
    />

    <GameVariableDataDisplay
      :isLoading="isLoading"
      :selectedDataType="selectedDataType"
      :searchQuery="searchQuery"
      :coreDataViews="coreDataViews"
      :customOptions="customOptions"
      :characterData="characterData"
      :saveData="saveData"
      :worldInfo="worldInfo"
      :memoryData="memoryData"
      :allGameData="allGameData"
      :filteredCoreDataViews="filteredCoreDataViews"
      :filteredCustomOptions="filteredCustomOptions"
      @edit-variable="editVariable"
      @copy-variable="copyVariable"
      @delete-variable="deleteVariable"
      @add-new-variable="addNewVariable"
      @debug-log="debugLogData"
    />

    <GameVariableEditModal
      v-if="showEditModal"
      :editingItem="editingItem"
      @close="closeEditModal"
      @save="saveVariable"
    />

    <GameVariableStatsModal
      v-if="showDataStatsModal"
      :coreDataViews="coreDataViews"
      :customOptions="customOptions"
      :allGameData="allGameData"
      :getMemoryCount="getMemoryCount"
      :getWorldItemCount="getWorldItemCount"
      @close="showDataStatsModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useGameStateStore } from '@/stores/gameStateStore'
import { toast } from '@/utils/toast'
import { panelBus } from '@/utils/panelBus'
import GameVariableDataHeader from './components/GameVariableDataHeader.vue'
import GameVariableDataSelector from './components/GameVariableDataSelector.vue'
import GameVariableDataDisplay from './components/GameVariableDataDisplay.vue'
import GameVariableEditModal from './components/GameVariableEditModal.vue'
import GameVariableStatsModal from './components/GameVariableStatsModal.vue'

// 🔥 [新架构] 使用 Pinia 作为单一数据源
const gameStateStore = useGameStateStore()

// 类型定义
type GameVariableValue = string | number | boolean | object | null | undefined

interface EditingItem {
  type: string
  key: string
  value: GameVariableValue
}

// 状态管理
const isLoading = ref(false)
const isRefreshing = ref(false)
const lastUpdateTime = ref('')
const selectedDataType = ref('saveData') // 默认显示存档数据
const searchQuery = ref('')
const showDataStatsModal = ref(false)
const editingItem = ref<EditingItem | null>(null)
const showEditModal = ref(false)

// 🔥 [新架构] 数据从 Pinia Store 获取
const coreDataViews = computed(() => {
  const saveData = gameStateStore.toSaveData()
  if (!saveData) return {}

  // 将SaveData放在第一个位置
  return {
    '存档数据 (SaveData)': saveData,
    '角色数据': saveData.角色基础信息,
    '记忆数据': saveData.记忆,
    '世界信息': saveData.世界信息
  }
})

const customOptions = computed(() => {
  // 自定义选项可以保留为空或添加一些全局配置
  return {
    '游戏版本': '2.0.0',
    '架构模式': 'Pinia内存 + DB持久化'
  }
})

const characterData = computed(() => gameStateStore.character || {})
const saveData = computed(() => gameStateStore.toSaveData() || {})
const worldInfo = computed(() => gameStateStore.worldInfo || {})
const memoryData = computed(() => gameStateStore.memory || {})
const allGameData = computed(() => ({
  ...coreDataViews.value,
  ...customOptions.value
}))

// 过滤后的变量（用于搜索）
const filteredCoreDataViews = computed(() => {
  if (!searchQuery.value) return coreDataViews.value
  const query = searchQuery.value.toLowerCase()
  return Object.fromEntries(
    Object.entries(coreDataViews.value).filter(([key]) =>
      key.toLowerCase().includes(query)
    )
  )
})

const filteredCustomOptions = computed(() => {
  if (!searchQuery.value) return customOptions.value
  const query = searchQuery.value.toLowerCase()
  return Object.fromEntries(
    Object.entries(customOptions.value).filter(([key]) =>
      key.toLowerCase().includes(query)
    )
  )
})

// 获取数据计数
const getDataCount = (type: string) => {
  switch (type) {
    case 'core': return Object.keys(coreDataViews.value).length
    case 'custom': return Object.keys(customOptions.value).length
    case 'character': return Object.keys(characterData.value).length
    case 'saveData': return Object.keys(saveData.value).length
    case 'worldInfo': return getWorldItemCount()
    case 'memory': return getMemoryCount()
    case 'raw': return Object.keys(allGameData.value).length
    default: return 0
  }
}

const getMemoryCount = () => {
  if (typeof memoryData.value === 'object' && memoryData.value !== null) {
    return Object.keys(memoryData.value).length
  }
  return 0
}

const getWorldItemCount = () => {
  if (typeof worldInfo.value === 'object' && worldInfo.value !== null) {
    return Object.keys(worldInfo.value).length
  }
  return 0
}

// 数据类型配置 - 将存档数据放在第一个
const dataTypes = [
  { key: 'saveData',  label: '存档数据', icon: 'Archive' },
  { key: 'core',      label: '核心数据', icon: 'Database' },
  { key: 'character', label: '角色数据', icon: 'Users' },
  { key: 'worldInfo', label: '世界信息', icon: 'Book' },
  { key: 'memory',    label: '记忆数据', icon: 'Brain' },
  { key: 'custom',    label: '自定义选项', icon: 'Settings' },
  { key: 'raw',       label: '原始数据', icon: 'Code' }
]

// 🔥 [新架构] 刷新数据 = 从 gameStateStore 重新读取
const refreshData = async () => {
  isRefreshing.value = true
  isLoading.value = true

  try {
    // 检查游戏是否已加载
    if (!gameStateStore.isGameLoaded) {
      toast.warning('请先加载游戏存档')
      return
    }

    lastUpdateTime.value = new Date().toLocaleString('zh-CN')
    toast.success('数据已从Pinia Store刷新')
  } catch (error) {
    console.error('[游戏变量] 刷新失败:', error)
    toast.error('数据刷新失败: ' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    isLoading.value = false
    isRefreshing.value = false
  }
}

const exportData = () => {
  try {
    const dataStr = JSON.stringify(allGameData.value, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `game-variables-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('数据导出成功')
  } catch (error) {
    console.error('[游戏变量] 导出失败:', error)
    toast.error('数据导出失败')
  }
}

const showDataStats = () => {
  showDataStatsModal.value = true
}

const addNewVariable = () => {
  toast.warning('新架构下不支持直接添加变量，请通过游戏操作修改数据')
}

const editVariable = (item: EditingItem) => {
  editingItem.value = { ...item }
  showEditModal.value = true
}

const copyVariable = async (key: string, value: GameVariableValue) => {
  try {
    const text = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
    await navigator.clipboard.writeText(`${key}: ${text}`)
    toast.success('已复制到剪贴板')
  } catch (error) {
    console.error('[游戏变量] 复制失败:', error)
    toast.error('复制失败')
  }
}

const deleteVariable = async () => {
  toast.warning('新架构下不支持直接删除变量，请通过游戏操作修改数据')
}

const saveVariable = async () => {
  if (!editingItem.value) {
    toast.error('没有要保存的数据')
    return
  }

  try {
    const { key, value } = editingItem.value

    // 解析JSON字符串（如果是对象类型）
    let parsedValue = value
    if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
      try {
        parsedValue = JSON.parse(value)
      } catch {
        // 如果解析失败，保持原字符串
      }
    }

    console.log('[游戏变量-保存前] Key:', key, 'Value:', parsedValue)

    // 🔥 关键修复：直接使用完整的 key，先转换为 store 的路径格式
    const keyPrefixMap: Record<string, string> = {
      '角色基础信息': 'character',
      '玩家角色状态': 'playerStatus',
      '背包': 'inventory',
      '装备栏': 'equipment',
      '人物关系': 'relationships',
      '记忆': 'memory',
      '游戏时间': 'gameTime',
      '世界信息': 'worldInfo',
      '任务系统': 'questSystem',
      '三千大道': 'thousandDao',
    };

    // 查找匹配的前缀（只替换第一个匹配的前缀）
    let path: string = key;
    for (const [chinesePrefix, storeKey] of Object.entries(keyPrefixMap)) {
      if (key === chinesePrefix) {
        // 完全匹配，直接替换
        path = storeKey;
        break;
      } else if (key.startsWith(chinesePrefix + '.')) {
        // 前缀匹配，替换前缀部分
        path = key.replace(chinesePrefix, storeKey);
        break;
      }
    }

    console.log('[游戏变量-转换后路径]', path)

    // 🔥 直接使用 updateState 更新
    gameStateStore.updateState(path, parsedValue);
    console.log('[游戏变量-更新后] Store中的值:', gameStateStore.$state)

    // 保存到数据库
    await gameStateStore.saveGame()

    toast.success(`✅ 已成功更新 ${key}`)
    closeEditModal()

    // 刷新显示
    await refreshData()
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误'
    toast.error(`保存失败: ${errorMsg}`)
    console.error('[游戏变量] 保存失败:', error)
  }
}

const closeEditModal = () => {
  showEditModal.value = false
  editingItem.value = null
}

const debugLogData = () => {
  console.group('[游戏变量] 详细调试信息 (Pinia模式)')
  console.log('基本统计:', {
    游戏已加载: gameStateStore.isGameLoaded,
    角色名: gameStateStore.character?.名字,
    coreDataViewsCount: Object.keys(coreDataViews.value).length,
    customOptionsCount: Object.keys(customOptions.value).length,
    lastUpdateTime: lastUpdateTime.value
  })
  console.log('核心数据键名:', Object.keys(coreDataViews.value))
  console.log('自定义选项键名:', Object.keys(customOptions.value))
  console.log('完整SaveData:', gameStateStore.toSaveData())
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
.game-variable-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  overflow: hidden;
}
</style>