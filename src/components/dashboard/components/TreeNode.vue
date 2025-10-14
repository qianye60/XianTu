<template>
  <div class="tree-node">
    <div class="node-line" @click="toggle" :class="{ 'is-object': isObject }">
      <span class="arrow" v-if="isObject">{{ isOpen ? '▼' : '▶' }}</span>
      <span class="arrow" v-else></span>
      <span class="key">{{ nodeKey }}:</span>
      <span class="value" v-if="!isObject">{{ displayValue }}</span>
      
      <button v-if="isDeletable" @click.stop="deleteItem" class="delete-btn" title="删除此项">
        <Trash2 :size="14" />
      </button>
    </div>
    <div v-if="isObject && isOpen" class="node-children">
      <TreeNode
        v-for="(childValue, childKey) in value"
        :key="childKey"
        :node-key="childKey"
        :value="childValue"
        :path="`${path}.${childKey}`"
        @delete-item="(p) => emit('delete-item', p)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue'
import { Trash2 } from 'lucide-vue-next'

// 异步加载自身以处理递归
const TreeNode = defineAsyncComponent(() => import('./TreeNode.vue'))

interface Props {
  nodeKey: string | number
  value: any
  path: string
}

const props = defineProps<Props>()
const emit = defineEmits(['delete-item'])

const isOpen = ref(false)

const isObject = computed(() => typeof props.value === 'object' && props.value !== null)

const displayValue = computed(() => {
  if (props.value === null) return 'null'
  if (typeof props.value === 'string' && props.value.length > 100) {
    return `"${props.value.substring(0, 100)}..."`
  }
  return JSON.stringify(props.value)
})

// 检查当前节点是否是可删除的项（如物品或NPC）
const isDeletable = computed(() => {
  const path = props.path
  // 检查路径是否为 `背包_物品.xxx` 或 `人物关系.xxx` 的形式
  // 确保它是一个直接子节点，而不是更深层的属性
  const isItem = path.startsWith('背包_物品.') && path.split('.').length === 2
  const isNpc = path.startsWith('人物关系.') && path.split('.').length === 2
  return isItem || isNpc
})

const toggle = () => {
  if (isObject.value) {
    isOpen.value = !isOpen.value
  }
}

const deleteItem = () => {
  emit('delete-item', props.path)
}
</script>

<style scoped>
.tree-node {
  padding-left: 20px;
  position: relative;
}

.node-line {
  display: flex;
  align-items: center;
  padding: 4px 0;
  cursor: default;
  position: relative;
}

.node-line.is-object {
  cursor: pointer;
}

.arrow {
  width: 20px;
  text-align: center;
  margin-left: -20px;
  color: #888;
  font-size: 0.7rem;
}

.key {
  color: #9cdcfe; /* 蓝色，适合键 */
  margin-right: 8px;
  font-weight: bold;
}

.value {
  color: #ce9178; /* 橙色，适合字符串值 */
}

.node-children {
  border-left: 1px solid #444;
}

.delete-btn {
  background: none;
  border: none;
  color: #ff5555;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  margin-left: auto;
  display: none; /* 默认隐藏 */
  transition: all 0.2s ease;
}

.node-line:hover .delete-btn {
  display: inline-block; /* 悬停时显示 */
}

.delete-btn:hover {
  background: rgba(255, 85, 85, 0.2);
  color: #ff8080;
}
</style>