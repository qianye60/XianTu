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
            <div v-if="memory.parsedContent && memory.parsedContent.format" class="structured-memory">
              <div class="memory-title" v-if="memory.parsedContent.title">
                【{{ memory.parsedContent.title }}】
              </div>
              
              <div 
                v-for="section in memory.parsedContent.format.sections" 
                :key="section.key"
                v-if="memory.parsedContent.sections && memory.parsedContent.sections[section.key]"
                class="memory-section-group"
              >
                <div class="memory-section">
                  <span class="memory-icon">{{ section.icon }}</span>
                  <span class="memory-section-title">{{ section.title }}</span>
                </div>
                <div 
                  v-for="item in memory.parsedContent.sections[section.key]" 
                  :key="item"
                  class="memory-item"
                >
                  {{ item }}
                </div>
              </div>
              
              <!-- 未识别的通用内容 -->
              <div 
                v-if="memory.parsedContent.sections['general']"
                class="memory-section-group"
              >
                <div class="memory-section">
                  <span class="memory-icon">📝</span>
                  <span class="memory-section-title">其他记录</span>
                </div>
                <div 
                  v-for="item in memory.parsedContent.sections['general']" 
                  :key="item"
                  class="memory-item"
                >
                  {{ item }}
                </div>
              </div>
            </div>
            
            <div v-else class="simple-memory">
              {{ memory.content }}
            </div>
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
import { parseMemoryContent, type MemoryFormatConfig } from '@/utils/memoryFormatConfig';

interface Memory {
  type: 'short' | 'medium' | 'long';
  content: string;
  time: string;
  importance?: number;
  parsedContent?: {
    title?: string;
    sections: { [key: string]: string[] };
    format?: MemoryFormatConfig;
  };
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

// 判断是否为结构化记忆
const isStructuredMemory = (content: string): boolean => {
  return content.includes('【') && content.includes('】') && 
         (content.includes('🏠') || content.includes('💫') || content.includes('🗺️') || content.includes('⚡') || content.includes('💭'));
};

// 格式化结构化记忆
const formatStructuredMemory = (content: string): string => {
  return content
    // 处理标题
    .replace(/【([^】]+)】/g, '<div class="memory-title">【$1】</div>')
    // 处理分类标题
    .replace(/(🏠|💫|🗺️|⚡|💭)\s*\*\*([^*]+)\*\*/g, '<div class="memory-section"><span class="memory-icon">$1</span><span class="memory-section-title">$2</span></div>')
    // 处理列表项
    .replace(/^-\s+(.+)$/gm, '<div class="memory-item">• $1</div>')
    // 处理换行
    .replace(/\n/g, '<br/>');
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
          const memory: Memory = {
            type: 'short',
            content,
            time: formatTime(Date.now() - index * 300000) // 5分钟间隔
          };
          
          // 尝试解析结构化内容
          const parsed = parseMemoryContent(content);
          if (parsed.format || Object.keys(parsed.sections).length > 0) {
            memory.parsedContent = parsed;
          }
          
          loadedMemories.push(memory);
        });
      }
      
      // 中期记忆 - 支持新的结构化格式
      if (memoryData.中期记忆) {
        if (Array.isArray(memoryData.中期记忆)) {
          // 旧的数组格式
          memoryData.中期记忆.forEach((content: string, index: number) => {
            const memory: Memory = {
              type: 'medium',
              content,
              time: formatTime(Date.now() - (index + 10) * 3600000) // 1小时间隔
            };
            
            const parsed = parseMemoryContent(content);
            if (parsed.format || Object.keys(parsed.sections).length > 0) {
              memory.parsedContent = parsed;
            }
            
            loadedMemories.push(memory);
          });
        } else if (typeof memoryData.中期记忆 === 'string') {
          // 新的结构化格式 - 单个记忆条目
          const memory: Memory = {
            type: 'medium',
            content: memoryData.中期记忆,
            time: '初始刻印',
            importance: 10
          };
          
          memory.parsedContent = parseMemoryContent(memoryData.中期记忆);
          loadedMemories.push(memory);
        }
      }
      
      // 长期记忆
      if (memoryData.长期记忆 && Array.isArray(memoryData.长期记忆)) {
        memoryData.长期记忆.forEach((content: string, index: number) => {
          const memory: Memory = {
            type: 'long',
            content,
            time: formatTime(Date.now() - (index + 20) * 86400000) // 1天间隔
          };
          
          const parsed = parseMemoryContent(content);
          if (parsed.format || Object.keys(parsed.sections).length > 0) {
            memory.parsedContent = parsed;
          }
          
          loadedMemories.push(memory);
        });
      }
      
      memories.value = loadedMemories;
    }

    // 尝试从酒馆变量获取数据
    const helper = getTavernHelper();
    if (helper) {
      const chatVars = await helper.getVariables({ type: 'chat' });
      
      // 检查是否有mid_term_memory字段（新格式的中期记忆）
      if (chatVars['mid_term_memory']) {
        const midTermMemory = chatVars['mid_term_memory'];
        if (typeof midTermMemory === 'string' && midTermMemory.trim()) {
          // 找到现有的中期记忆并替换或添加
          const existingIndex = memories.value.findIndex(m => m.type === 'medium');
          const newMemory: Memory = {
            type: 'medium',
            content: midTermMemory,
            time: '初始刻印',
            importance: 10,
            parsedContent: parseMemoryContent(midTermMemory)
          };
          
          if (existingIndex >= 0) {
            memories.value[existingIndex] = newMemory;
          } else {
            memories.value.unshift(newMemory);
          }
        }
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

.simple-memory {
  /* 简单记忆样式，保持原样 */
}

.structured-memory {
  /* 结构化记忆的特殊样式 */
}

.memory-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 0.75rem;
  text-align: center;
  padding: 0.5rem;
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.1), rgba(var(--color-accent-rgb), 0.05));
  border-radius: 6px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
}

.memory-section {
  display: flex;
  align-items: center;
  margin: 0.75rem 0 0.5rem 0;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(var(--color-border-rgb), 0.3);
}

.memory-icon {
  font-size: 1.2rem;
  margin-right: 0.5rem;
}

.memory-section-title {
  font-weight: 600;
  color: var(--color-text-primary);
  font-size: 0.9rem;
}

.memory-item {
  margin: 0.3rem 0;
  padding-left: 1rem;
  color: var(--color-text);
  line-height: 1.4;
  position: relative;
}

.memory-item::before {
  content: '';
  position: absolute;
  left: 0.25rem;
  top: 0.6rem;
  width: 3px;
  height: 3px;
  background: var(--color-accent);
  border-radius: 50%;
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