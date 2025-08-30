<template>
  <div class="memory-center-panel game-panel">
    <!-- 头部 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="header-icon">🧠</div>
        <div class="header-info">
          <h3 class="panel-title">记忆中心</h3>
          <span class="panel-subtitle">{{ totalMemoryCount }}条记忆</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="refreshMemory" :disabled="loading">
          <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
          <span class="btn-text">刷新</span>
        </button>
        <button class="action-btn danger" @click="clearMemory">
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
    <div class="panel-content">
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
const totalMemoryCount = computed(() => memories.value.length);

// 获取类型数量
const getTypeCount = (type: string): number => {
  if (type === 'all') return totalMemoryCount.value;
  return memories.value.filter(memory => memory.type === type).length;
};

// 获取空状态文本
const getEmptyText = (): string => {
  if (activeFilter.value === 'all') return '心境空明如镜，尚未记录修行感悟';
  const type = memoryTypes.find(t => t.key === activeFilter.value);
  return `此类${type?.name}记忆如流水无痕，待道友体验后方可显现`;
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
  /* 使用统一的 game-panel 基础样式 */
}

/* 记忆卡片特定样式 */
.memory-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.memory-card {
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: var(--transition-fast);
  cursor: pointer;
}

.memory-card:hover {
  background: var(--color-surface-light);
  border-color: var(--color-border-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.1);
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
  border: 1px solid var(--color-border);
  background: var(--color-surface-light);
  color: var(--color-text-secondary);
}

.badge-short {
  border-color: rgba(var(--color-warning-rgb), 0.3);
  background: rgba(var(--color-warning-rgb), 0.1);
  color: var(--color-warning);
}

.badge-medium {
  border-color: rgba(var(--color-success-rgb), 0.3);
  background: rgba(var(--color-success-rgb), 0.1);
  color: var(--color-success);
}

.badge-long {
  border-color: rgba(var(--color-info-rgb), 0.3);
  background: rgba(var(--color-info-rgb), 0.1);
  color: var(--color-info);
}

.memory-time {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.memory-content {
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.5;
  margin-bottom: 0.5rem;
}

.memory-importance {
  font-size: 0.75rem;
  color: var(--color-accent);
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  background: rgba(var(--color-accent-rgb), 0.1);
  border-radius: 4px;
  border: 1px solid rgba(var(--color-accent-rgb), 0.3);
  display: inline-block;
}

.empty-hint {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  opacity: 0.7;
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
</style>