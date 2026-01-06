<template>
  <div class="save-data-section">
    <div class="section-header">
      <h3 class="section-title">Save Data (存档数据)</h3>
    </div>
    <div class="save-data-content">
      <div v-if="displaySaveData && Object.keys(displaySaveData).length > 0" class="data-tree">
        <TreeNode
          v-for="(value, key) in displaySaveData"
          :key="key"
          :node-key="key"
          :value="value"
          :path="String(key)"
          :read-only="readOnly"
          @delete-item="handleDeleteItem"
          @edit-item="handleEditItem"
        />
      </div>
      <div v-else class="empty-state">
        <Archive :size="32" />
        <p>暂无存档数据</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Archive } from 'lucide-vue-next'
import { computed, defineAsyncComponent } from 'vue'
import { useGameStateStore } from '@/stores/gameStateStore'
import { toast } from '@/utils/toast'
import { debug } from '@/utils/debug'
import { isSaveDataV3, migrateSaveDataToLatest } from '@/utils/saveMigration'

// 异步加载 TreeNode 组件以避免循环依赖
const TreeNode = defineAsyncComponent(() => import('./TreeNode.vue'))

interface Props {
  saveData: any
  readOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: false
})

const emit = defineEmits(['edit-variable'])

const gameStateStore = useGameStateStore()

const displaySaveData = computed(() => {
  const raw = props.saveData ?? {}
  const v3 = isSaveDataV3(raw) ? raw : migrateSaveDataToLatest(raw as any).migrated

  // 只展示 V3 五域（彻底隐藏旧顶层 key）
  return {
    元数据: (v3 as any).元数据,
    角色: (v3 as any).角色,
    社交: (v3 as any).社交,
    世界: (v3 as any).世界,
    系统: (v3 as any).系统,
  }
})

const handleEditItem = (path: string, value: unknown) => {
  if (props.readOnly) {
    toast.warning('联机模式下不允许直接修改存档数据（服务器权威控制）');
    return;
  }
  emit('edit-variable', {
    type: 'saveData',
    key: path,
    value: value
  })
}

const handleDeleteItem = async (path: string) => {
  if (props.readOnly) {
    toast.warning('联机模式下不允许直接删除存档数据（服务器权威控制）');
    return;
  }
  debug.log('[TavernSaveData]', `请求删除: ${path}`)
  if (!confirm(`确定要删除此项目吗？\n路径: ${path}\n\n此操作不可撤销！`)) {
    return
  }

  try {
    const segments = path.split('.')
    const isInventoryItem = path.startsWith('角色.背包.物品.') && segments.length === 4
    const isNpc = path.startsWith('社交.关系.') && segments.length === 3

    if (!isInventoryItem && !isNpc) {
      toast.warning('该路径暂不支持删除，请通过游戏内操作处理')
      return
    }

    if (isInventoryItem) {
      const itemId = segments[3]
      const inventory = gameStateStore.inventory
      if (!inventory?.物品?.[itemId]) {
        throw new Error(`物品不存在: ${itemId}`)
      }
      const nextInventory = JSON.parse(JSON.stringify(inventory))
      delete nextInventory.物品[itemId]
      gameStateStore.updateState('inventory', nextInventory)
    } else {
      const npcKey = segments[2]
      const relationships = gameStateStore.relationships
      if (!relationships?.[npcKey]) {
        throw new Error(`NPC不存在: ${npcKey}`)
      }
      const nextRelationships = JSON.parse(JSON.stringify(relationships))
      delete nextRelationships[npcKey]
      gameStateStore.updateState('relationships', nextRelationships)
    }

    await gameStateStore.saveGame()

    toast.success(`项目 ${path} 已删除`)
    debug.log('[TavernSaveData]', `成功删除并同步: ${path}`)
  } catch (error) {
    debug.error('[TavernSaveData]', '删除失败', error)
    toast.error(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}
</script>

<style scoped>
.save-data-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.section-header {
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.section-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.save-data-content {
  flex: 1;
  overflow: auto;
  background: var(--color-code-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.75rem;
}

.data-tree {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.85rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
  text-align: center;
}
</style>
