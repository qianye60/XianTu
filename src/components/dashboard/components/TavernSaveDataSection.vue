<template>
  <div class="save-data-section">
    <div class="section-header">
      <h3 class="section-title">Save Data (存档数据)</h3>
    </div>
    <div class="save-data-content">
      <div v-if="saveData && Object.keys(saveData).length > 0" class="data-tree">
        <TreeNode
          v-for="(value, key) in saveData"
          :key="key"
          :node-key="key"
          :value="value"
          :path="String(key)"
          @delete-item="handleDeleteItem"
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
import { defineAsyncComponent } from 'vue'
import { useCharacterStore } from '@/stores/characterStore'
import { toast } from '@/utils/toast'
import { debug } from '@/utils/debug'

// 异步加载 TreeNode 组件以避免循环依赖
const TreeNode = defineAsyncComponent(() => import('./TreeNode.vue'))

interface Props {
  saveData: any
}

defineProps<Props>()

const characterStore = useCharacterStore()

const handleDeleteItem = async (path: string) => {
  debug.log('[TavernSaveData]', `请求删除: ${path}`)
  if (!confirm(`确定要删除此项目吗？\n路径: ${path}\n\n此操作不可撤销！`)) {
    return
  }

  try {
    // 路径类似于 '背包_物品.item_123'
    // 我们需要将其转换为 lodash.set 的路径格式
    const pathArray = path.split('.')
    
    // 获取当前激活的存档数据
    const activeSave = characterStore.activeSaveSlot
    if (!activeSave || !activeSave.存档数据) {
      throw new Error('没有激活的存档数据')
    }

    // 创建一个深拷贝以进行修改
    const saveDataCopy = JSON.parse(JSON.stringify(activeSave.存档数据))

    // 使用动态方式删除嵌套对象中的属性
    let current = saveDataCopy
    for (let i = 0; i < pathArray.length - 1; i++) {
      current = current[pathArray[i]]
      if (current === undefined) {
        throw new Error(`路径无效: ${path}`)
      }
    }
    delete current[pathArray[pathArray.length - 1]]

    // 直接用修改后的数据更新整个存档
    await characterStore.updateSaveDataDirectly(saveDataCopy)
    
    // 同步到酒馆
    await characterStore.syncToTavernAndSave({ fullSync: true })

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