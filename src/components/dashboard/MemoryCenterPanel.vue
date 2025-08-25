<template>
  <div class="memory-center-panel">
    <!-- 头部 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="header-icon">🧠</div>
        <div class="header-info">
          <h3 class="panel-title">记忆中心</h3>
          <span class="memory-count">{{ totalMemoryCount }}条记忆</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="refreshMemory" :disabled="loading">
          <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
          <span class="btn-text">刷新</span>
        </button>
        <button class="action-btn" @click="clearMemory">
          <Trash2 :size="16" />
          <span class="btn-text">清理</span>
        </button>
      </div>
    </div>

    <!-- 记忆类型筛选 -->
    <div class="filter-section">
      <div class="filter-tabs">
        <button 
          v-for="type in memoryTypes" 
          :key="type.key"
          class="filter-tab"
          :class="{ active: activeFilter === type.key }"
          @click="setActiveFilter(type.key)"
        >
          <span class="tab-icon">{{ type.icon }}</span>
          <span class="tab-name">{{ type.name }}</span>
          <span class="tab-count">{{ getTypeCount(type.key) }}</span>
        </button>
      </div>
    </div>

    <!-- 记忆列表 -->
    <div class="memory-container">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner">⏳</div>
        <div class="loading-text">正在读取记忆...</div>
      </div>
      
      <div v-else-if="filteredMemories.length === 0" class="empty-state">
        <div class="empty-icon">🧠</div>
        <div class="empty-text">{{ getEmptyText() }}</div>
        <div class="empty-hint">随着游戏进行，记忆会自动记录在这里</div>
      </div>

      <div v-else class="memory-list">
        <!-- 为了测试滚动条，我会添加更多内容 -->
        <div 
          v-for="(memory, index) in filteredMemories" 
          :key="index"
          class="memory-card"
          :class="`memory-${memory.type}`"
        >
          <div class="memory-header">
            <div class="memory-type-badge" :class="`badge-${memory.type}`">
              {{ getTypeIcon(memory.type) }} {{ getTypeName(memory.type) }}
            </div>
            <div class="memory-time">{{ memory.time }}</div>
          </div>
          
          <div class="memory-content">
            {{ memory.content }}
          </div>
          
          <div v-if="memory.importance" class="memory-importance">
            重要程度: {{ memory.importance }}/10
          </div>
        </div>

        <!-- 添加一些示例内容来测试滚动 -->
        <div v-for="n in 20" :key="`demo-${n}`" class="memory-card memory-demo">
          <div class="memory-header">
            <div class="memory-type-badge badge-short">
              🧠 短期记忆
            </div>
            <div class="memory-time">{{ formatTime(Date.now() - n * 60000) }}</div>
          </div>
          
          <div class="memory-content">
            示例记忆内容 {{ n }}：这是一条测试记忆，用于验证滚动条功能。记忆内容可能包含人物对话、重要事件、获得的物品、学习的技能等各种信息。通过多层记忆系统，重要的记忆会被长期保存，而不太重要的记忆会逐渐淡化。
          </div>
          
          <div class="memory-importance">
            重要程度: {{ Math.floor(Math.random() * 10) + 1 }}/10
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { RefreshCw, Trash2 } from 'lucide-vue-next';
import { useCharacterStore } from '@/stores/characterStore';
import { getTavernHelper } from '@/utils/tavern';
import { toast } from '@/utils/toast';

interface Memory {
  type: 'short' | 'medium' | 'long';
  content: string;
  time: string;
  importance?: number;
}

const characterStore = useCharacterStore();
const loading = ref(false);
const activeFilter = ref('all');

// 记忆数据
const memories = ref<Memory[]>([]);

// 记忆类型
const memoryTypes = [
  { key: 'all', name: '全部', icon: '🧠' },
  { key: 'short', name: '短期', icon: '⚡' },
  { key: 'medium', name: '中期', icon: '💭' },
  { key: 'long', name: '长期', icon: '💾' }
];

// 筛选后的记忆
const filteredMemories = computed(() => {
  if (activeFilter.value === 'all') {
    return memories.value;
  }
  return memories.value.filter(memory => memory.type === activeFilter.value);
});

// 总记忆数量
const totalMemoryCount = computed(() => memories.value.length + 20); // +20 for demo content

// 获取类型数量
const getTypeCount = (type: string): number => {
  if (type === 'all') return totalMemoryCount.value;
  const realCount = memories.value.filter(memory => memory.type === type).length;
  // Add demo content count
  if (type === 'short') return realCount + 20;
  return realCount;
};

// 获取空状态文本
const getEmptyText = (): string => {
  if (activeFilter.value === 'all') return '暂无记忆记录';
  const type = memoryTypes.find(t => t.key === activeFilter.value);
  return `暂无${type?.name}记忆`;
};

// 获取类型图标
const getTypeIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    'short': '⚡',
    'medium': '💭',
    'long': '💾'
  };
  return iconMap[type] || '🧠';
};

// 获取类型名称
const getTypeName = (type: string): string => {
  const nameMap: Record<string, string> = {
    'short': '短期记忆',
    'medium': '中期记忆',
    'long': '长期记忆'
  };
  return nameMap[type] || '未知';
};

// 格式化时间
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
};

// 设置活跃筛选器
const setActiveFilter = (filterKey: string) => {
  activeFilter.value = filterKey;
};

// 刷新记忆
const refreshMemory = async () => {
  loading.value = true;
  try {
    await loadMemoryData();
    toast.success('记忆数据已刷新');
  } catch (error) {
    console.error('[记忆中心] 刷新失败:', error);
    toast.error('刷新失败');
  } finally {
    loading.value = false;
  }
};

// 清理记忆
const clearMemory = () => {
  if (confirm('确定要清理所有记忆吗？此操作不可撤销。')) {
    memories.value = [];
    toast.success('记忆已清理');
  }
};

// 加载记忆数据
const loadMemoryData = async () => {
  try {
    // 从角色存档中加载
    const activeSave = characterStore.activeSaveSlot;
    if (activeSave?.存档数据?.记忆) {
      const memoryData = activeSave.存档数据.记忆;
      
      const loadedMemories: Memory[] = [];
      
      // 短期记忆
      if (memoryData.短期记忆 && Array.isArray(memoryData.短期记忆)) {
        memoryData.短期记忆.forEach((content: string, index: number) => {
          loadedMemories.push({
            type: 'short',
            content,
            time: formatTime(Date.now() - index * 300000) // 5分钟间隔
          });
        });
      }
      
      // 中期记忆
      if (memoryData.中期记忆 && Array.isArray(memoryData.中期记忆)) {
        memoryData.中期记忆.forEach((content: string, index: number) => {
          loadedMemories.push({
            type: 'medium',
            content,
            time: formatTime(Date.now() - (index + 10) * 3600000) // 1小时间隔
          });
        });
      }
      
      // 长期记忆
      if (memoryData.长期记忆 && Array.isArray(memoryData.长期记忆)) {
        memoryData.长期记忆.forEach((content: string, index: number) => {
          loadedMemories.push({
            type: 'long',
            content,
            time: formatTime(Date.now() - (index + 20) * 86400000) // 1天间隔
          });
        });
      }
      
      memories.value = loadedMemories;
    }

    // 尝试从酒馆变量获取数据
    const helper = getTavernHelper();
    if (helper) {
      const chatVars = await helper.getVariables({ type: 'chat' });
      
      if (chatVars['character.memory'] || chatVars['记忆']) {
        // 处理酒馆中的记忆数据
        console.log('[记忆中心] 从酒馆获取记忆数据');
      }
    }

  } catch (error) {
    console.error('[记忆中心] 加载数据失败:', error);
  }
};

onMounted(() => {
  loadMemoryData();
});
</script>

<style scoped>
.memory-center-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(135deg, #fef7cd 0%, #fef3c7 100%);
  overflow: hidden;
  padding: 1rem;
  gap: 1rem;
  position: relative;
}

/* 头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #fde68a;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  font-size: 1.5rem;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.panel-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #92400e;
}

.memory-count {
  font-size: 0.875rem;
  color: #a16207;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #fde68a;
  border-radius: 0.5rem;
  background: white;
  color: #92400e;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.action-btn:hover {
  background: #fefce8;
  border-color: #a16207;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 筛选器 */
.filter-section {
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #fde68a;
  flex-shrink: 0;
}

.filter-tabs {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.filter-tabs::-webkit-scrollbar {
  display: none;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #fde68a;
  border-radius: 1.5rem;
  background: white;
  color: #a16207;
  font-size: 0.875rem;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.filter-tab:hover {
  background: #fefce8;
}

.filter-tab.active {
  background: #a16207;
  color: white;
}

.tab-count {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 0.75rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
  min-width: 1.25rem;
  text-align: center;
}

.filter-tab.active .tab-count {
  background: rgba(255, 255, 255, 0.2);
}

/* 记忆容器 - 确保能看到滚动条 */
.memory-container {
  flex: 1;
  padding: 0 1rem 1rem 1rem;
  overflow-y: auto;
  min-height: 0;
  padding-bottom: 3rem;
  
  /* 改进的滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(161, 98, 7, 0.3) rgba(243, 244, 246, 0.5);
}

/* Webkit 滚动条样式 */
.memory-container::-webkit-scrollbar {
  width: 8px;
}

.memory-container::-webkit-scrollbar-track {
  background: rgba(243, 244, 246, 0.5);
  border-radius: 4px;
}

.memory-container::-webkit-scrollbar-thumb {
  background: rgba(161, 98, 7, 0.3);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.memory-container::-webkit-scrollbar-thumb:hover {
  background: rgba(161, 98, 7, 0.5);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
}

.loading-spinner,
.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.loading-text,
.empty-text {
  font-size: 1rem;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 0.875rem;
  color: #9ca3af;
}

/* 记忆列表 */
.memory-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.memory-card {
  padding: 1rem;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #fde68a;
  transition: all 0.2s ease;
}

.memory-card:hover {
  background: #fefce8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(161, 98, 7, 0.15);
}

.memory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.memory-type-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge-short {
  background: #fef3c7;
  color: #a16207;
  border: 1px solid #fde68a;
}

.badge-medium {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #bbf7d0;
}

.badge-long {
  background: #ede9fe;
  color: #7c3aed;
  border: 1px solid #c4b5fd;
}

.memory-time {
  font-size: 0.75rem;
  color: #6b7280;
}

.memory-content {
  font-size: 0.875rem;
  color: #374151;
  line-height: 1.5;
  margin-bottom: 0.5rem;
}

.memory-importance {
  font-size: 0.75rem;
  color: #92400e;
  font-weight: 500;
}

.memory-demo {
  opacity: 0.8;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .memory-center-panel {
    gap: 0.75rem;
  }
  
  .header-actions .btn-text {
    display: none;
  }
}

/* 深色主题 */
[data-theme="dark"] .memory-center-panel {
  background: linear-gradient(135deg, #422006 0%, #451a03 100%);
}

[data-theme="dark"] .panel-header,
[data-theme="dark"] .filter-section,
[data-theme="dark"] .memory-card {
  background: #451a03;
  border-color: #78350f;
}

[data-theme="dark"] .panel-title {
  color: #fbbf24;
}

[data-theme="dark"] .memory-count {
  color: #f59e0b;
}

[data-theme="dark"] .action-btn,
[data-theme="dark"] .filter-tab {
  background: #78350f;
  border-color: #92400e;
  color: #fbbf24;
}

[data-theme="dark"] .action-btn:hover,
[data-theme="dark"] .filter-tab:hover {
  background: #92400e;
}

[data-theme="dark"] .filter-tab.active {
  background: #fbbf24;
  color: #451a03;
}

[data-theme="dark"] .memory-card:hover {
  background: #78350f;
}

[data-theme="dark"] .badge-short {
  background: #78350f;
  color: #fbbf24;
  border-color: #92400e;
}

[data-theme="dark"] .memory-content {
  color: #d1d5db;
}

[data-theme="dark"] .memory-importance {
  color: #fbbf24;
}
</style>