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
        <button class="action-btn info" @click="testMemoryConversion" title="添加测试记忆触发转化">
          <span class="btn-icon">🧪</span>
          <span class="btn-text">测试转化</span>
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
      
      <!-- 记忆容量状态提示 -->
      <div class="memory-status">
        <div class="status-item" :class="{ warning: shortTermMemories.length >= MEMORY_CONFIG.SHORT_TERM_LIMIT * 0.8 }">
          <span class="status-label">短期</span>
          <span class="status-bar">
            <span class="status-fill" :style="{ width: `${(shortTermMemories.length / MEMORY_CONFIG.SHORT_TERM_LIMIT) * 100}%` }"></span>
          </span>
          <span class="status-text">{{ shortTermMemories.length }}/{{ MEMORY_CONFIG.SHORT_TERM_LIMIT }}</span>
        </div>
        <div class="status-item" :class="{ warning: mediumTermMemories.length >= MEMORY_CONFIG.MEDIUM_TERM_LIMIT * 0.8 }">
          <span class="status-label">中期</span>
          <span class="status-bar">
            <span class="status-fill" :style="{ width: `${(mediumTermMemories.length / MEMORY_CONFIG.MEDIUM_TERM_LIMIT) * 100}%` }"></span>
          </span>
          <span class="status-text">{{ mediumTermMemories.length }}/{{ MEMORY_CONFIG.MEDIUM_TERM_LIMIT }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">长期</span>
          <span class="status-bar">
            <span class="status-fill" :style="{ width: `${Math.min((longTermMemories.length / MEMORY_CONFIG.LONG_TERM_LIMIT) * 100, 100)}%` }"></span>
          </span>
          <span class="status-text">{{ longTermMemories.length }}/{{ MEMORY_CONFIG.LONG_TERM_LIMIT }}</span>
        </div>
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
              
              <template v-for="section in memory.parsedContent.format.sections" :key="section.key">
                <div 
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
              </template>
              
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
import { debug } from '@/utils/debug';
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
  // 新增字段用于记忆转化逻辑
  originalIndex?: number; // 原始索引位置
  isConverted?: boolean; // 是否是转化后的记忆
}

const characterStore = useCharacterStore();
const loading = ref(false);
const activeFilter = ref('all');

// 记忆转化配置
const MEMORY_CONFIG = {
  SHORT_TERM_LIMIT: 5, // 短期记忆上限
  MEDIUM_TERM_LIMIT: 20, // 中期记忆上限
  LONG_TERM_LIMIT: 50, // 长期记忆上限
  CONVERT_THRESHOLD: 0.8 // 转化阈值（达到上限的80%就开始转化）
};

// 记忆数据 - 按类型分类存储
const shortTermMemories = ref<Memory[]>([]);
const mediumTermMemories = ref<Memory[]>([]);
const longTermMemories = ref<Memory[]>([]);

// 合并所有记忆用于显示
const memories = computed(() => {
  const allMemories = [
    ...longTermMemories.value,
    ...mediumTermMemories.value,
    ...shortTermMemories.value
  ];
  return allMemories.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
});


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
  
  switch (activeFilter.value) {
    case 'short': return shortTermMemories.value;
    case 'medium': return mediumTermMemories.value;
    case 'long': return longTermMemories.value;
    default: return memories.value;
  }
});

// 总记忆数量
const totalMemoryCount = computed(() => 
  shortTermMemories.value.length + mediumTermMemories.value.length + longTermMemories.value.length
);

// 获取类型数量
const getTypeCount = (type: string): number => {
  if (type === 'all') return totalMemoryCount.value;
  switch (type) {
    case 'short': return shortTermMemories.value.length;
    case 'medium': return mediumTermMemories.value.length;
    case 'long': return longTermMemories.value.length;
    default: return 0;
  }
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

// 记忆转化功能
const convertMemories = () => {
  let hasConversion = false;
  
  // 检查短期记忆是否达到转化阈值
  if (shortTermMemories.value.length >= MEMORY_CONFIG.SHORT_TERM_LIMIT) {
    debug.log('记忆中心', '短期记忆达到上限，开始转化为中期记忆');
    
    // 取最早的短期记忆转化为中期记忆
    const oldestShort = shortTermMemories.value.shift();
    if (oldestShort) {
      const convertedMemory: Memory = {
        ...oldestShort,
        type: 'medium',
        time: `转化于${formatTime(Date.now())}`,
        isConverted: true
      };
      mediumTermMemories.value.push(convertedMemory);
      hasConversion = true;
    }
  }
  
  // 检查中期记忆是否达到转化阈值
  if (mediumTermMemories.value.length >= MEMORY_CONFIG.MEDIUM_TERM_LIMIT) {
    debug.log('记忆中心', '中期记忆达到上限，开始转化为长期记忆');
    
    // 取最早的中期记忆转化为长期记忆
    const oldestMedium = mediumTermMemories.value.shift();
    if (oldestMedium) {
      const convertedMemory: Memory = {
        ...oldestMedium,
        type: 'long',
        time: `归档于${formatTime(Date.now())}`,
        importance: Math.max(oldestMedium.importance || 5, 7), // 长期记忆重要性至少为7
        isConverted: true
      };
      longTermMemories.value.push(convertedMemory);
      hasConversion = true;
    }
  }
  
  // 检查长期记忆是否超限
  if (longTermMemories.value.length > MEMORY_CONFIG.LONG_TERM_LIMIT) {
    // 按重要性排序，保留重要的
    longTermMemories.value.sort((a, b) => (b.importance || 5) - (a.importance || 5));
    const removed = longTermMemories.value.splice(MEMORY_CONFIG.LONG_TERM_LIMIT);
    debug.log('记忆中心', `长期记忆超限，移除${removed.length}条低重要性记忆`);
  }
  
  if (hasConversion) {
    toast.success('记忆已重新整理，旧记忆已转化');
  }
};

// 添加记忆的功能
const addMemory = (type: 'short' | 'medium' | 'long', content: string, importance: number = 5, parsedContent?: any) => {
  const memory: Memory = {
    type,
    content,
    time: formatTime(Date.now()),
    importance,
    parsedContent
  };
  
  switch (type) {
    case 'short':
      shortTermMemories.value.push(memory);
      break;
    case 'medium':
      mediumTermMemories.value.push(memory);
      break;
    case 'long':
      longTermMemories.value.push(memory);
      break;
  }
  
  // 检查是否需要转化
  convertMemories();
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
    debug.error('记忆中心', '刷新失败', error);
    toast.error('刷新失败');
  } finally {
    loading.value = false;
  }
};

// 清理记忆
const clearMemory = () => {
  if (confirm('确定要清理所有记忆吗？此操作不可撤销。')) {
    shortTermMemories.value = [];
    mediumTermMemories.value = [];
    longTermMemories.value = [];
    toast.success('记忆已清理');
  }
};

// 测试记忆转化功能
const testMemoryConversion = () => {
  const testMessages = [
    '今日在练功房修炼《太极心经》，有所感悟',
    '与师兄切磋武艺，招式精进不少',
    '在藏书阁阅读古籍，了解到远古修真历史',
    '炼制了几枚回气丹，成功率提升',
    '探索后山秘境，发现奇异灵草'
  ];
  
  const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
  addMemory('short', randomMessage, Math.floor(Math.random() * 5) + 5);
  
  toast.success(`已添加测试记忆: ${randomMessage.substring(0, 20)}...`);
};

// 加载记忆数据
const loadMemoryData = async () => {
  try {
    debug.log('记忆中心', '开始加载记忆数据');
    
    const loadedShortMemories: Memory[] = [];
    const loadedMediumMemories: Memory[] = [];
    const loadedLongMemories: Memory[] = [];

    // 首先尝试从酒馆变量获取数据
    const helper = getTavernHelper();
    if (helper) {
      try {
        const chatVars = await helper.getVariables({ type: 'chat' });
        debug.log('记忆中心', '酒馆变量键', Object.keys(chatVars));
        
        // 检查是否有mid_term_memory字段（新格式的中期记忆）
        // 注意：初始化时的中期记忆应该作为短期记忆处理
        if (chatVars['mid_term_memory']) {
          const midTermMemory = chatVars['mid_term_memory'];
          debug.log('记忆中心', '找到mid_term_memory:', typeof midTermMemory === 'string' ? midTermMemory.substring(0, 100) + '...' : String(midTermMemory));
          
          if (typeof midTermMemory === 'string' && midTermMemory.trim()) {
            // 初始化生成的中期记忆实际上应该作为短期记忆，等短期记忆满了才转化为中期记忆
            const newMemory: Memory = {
              type: 'short', // 改为短期记忆
              content: midTermMemory,
              time: '初始记录',
              importance: 8,
              parsedContent: parseMemoryContent(midTermMemory)
            };
            
            loadedShortMemories.push(newMemory); // 添加到短期记忆
            debug.log('记忆中心', '已添加mid_term_memory到短期记忆列表（等待转化）');
          }
        }
        
        // 检查character.saveData中的记忆数据
        if (chatVars['character.saveData']) {
          const saveData = chatVars['character.saveData'] as any;
          if (saveData?.记忆) {
            debug.log('记忆中心', '找到saveData记忆:', Object.keys(saveData.记忆));
            const memoryData = saveData.记忆 as Record<string, any>;
            
            // 处理各类型记忆...
            (['短期记忆', '中期记忆', '长期记忆'] as const).forEach(memoryType => {
              if (memoryData[memoryType]) {
                const typeMap: Record<string, 'short' | 'medium' | 'long'> = { '短期记忆': 'short', '中期记忆': 'medium', '长期记忆': 'long' };
                const englishType = typeMap[memoryType];
                
                if (Array.isArray(memoryData[memoryType])) {
                  (memoryData[memoryType] as string[]).forEach((content: string, index: number) => {
                    const memory: Memory = {
                      type: englishType,
                      content,
                      time: formatTime(Date.now() - index * (englishType === 'short' ? 300000 : englishType === 'medium' ? 3600000 : 86400000))
                    };
                    
                    const parsed = parseMemoryContent(content);
                    if (parsed.format || Object.keys(parsed.sections).length > 0) {
                      memory.parsedContent = parsed;
                    }
                    
                    // 按类型分类存储
                    switch (englishType) {
                      case 'short': loadedShortMemories.push(memory); break;
                      case 'medium': loadedMediumMemories.push(memory); break;
                      case 'long': loadedLongMemories.push(memory); break;
                    }
                  });
                  debug.log('记忆中心', `已加载${(memoryData[memoryType] as string[]).length}条${memoryType}(数组)`);
                } else if (typeof memoryData[memoryType] === 'string' && memoryType === '中期记忆') {
                  const memory: Memory = {
                    type: 'medium',
                    content: memoryData[memoryType] as string,
                    time: '存档记忆',
                    importance: 8,
                    parsedContent: parseMemoryContent(memoryData[memoryType] as string)
                  };
                  loadedMediumMemories.push(memory);
                  debug.log('记忆中心', '已加载存档中期记忆(字符串)');
                }
              }
            });
          }
        }
      } catch (tavernError) {
        debug.error('记忆中心', '酒馆API调用失败', tavernError);
      }
    } else {
      debug.warn('记忆中心', '酒馆助手不可用');
    }
    
    // 从角色存档中加载（作为备选）
    const activeSave = characterStore.activeSaveSlot;
    if (activeSave?.存档数据?.记忆 && (loadedShortMemories.length + loadedMediumMemories.length + loadedLongMemories.length) === 0) {
      debug.log('记忆中心', '从角色存档加载记忆...');
      const memoryData = activeSave.存档数据.记忆 as Record<string, any>;
      
      // 处理各类型记忆
      (['短期记忆', '中期记忆', '长期记忆'] as const).forEach(memoryType => {
        if (memoryData[memoryType]) {
          const typeMap: Record<string, 'short' | 'medium' | 'long'> = { '短期记忆': 'short', '中期记忆': 'medium', '长期记忆': 'long' };
          const englishType = typeMap[memoryType];
          
          if (Array.isArray(memoryData[memoryType])) {
            (memoryData[memoryType] as string[]).forEach((content: string, index: number) => {
              const memory: Memory = {
                type: englishType,
                content,
                time: formatTime(Date.now() - index * (englishType === 'short' ? 300000 : englishType === 'medium' ? 3600000 : 86400000))
              };
              
              const parsed = parseMemoryContent(content);
              if (parsed.format || Object.keys(parsed.sections).length > 0) {
                memory.parsedContent = parsed;
              }
              
              // 按类型分类存储
              switch (englishType) {
                case 'short': loadedShortMemories.push(memory); break;
                case 'medium': loadedMediumMemories.push(memory); break;
                case 'long': loadedLongMemories.push(memory); break;
              }
            });
          } else if (typeof memoryData[memoryType] === 'string' && memoryType === '中期记忆') {
            const memory: Memory = {
              type: 'medium',
              content: memoryData[memoryType] as string,
              time: '角色记忆',
              importance: 6,
              parsedContent: parseMemoryContent(memoryData[memoryType] as string)
            };
            loadedMediumMemories.push(memory);
          }
        }
      });
    }

    // 如果仍然没有数据，添加示例数据以便测试界面
    if ((loadedShortMemories.length + loadedMediumMemories.length + loadedLongMemories.length) === 0) {
      debug.warn('记忆中心', '未找到记忆数据，添加示例数据');
      loadedMediumMemories.push({
        type: 'medium',
        content: '【初入仙途】\n\n🏠 **居所环境**\n- 茅屋简陋，但清净无扰\n- 门前有竹林，常有清风徐来\n\n💫 **修行感悟**\n- 今日观竹有所感悟，心境渐明\n- 体内灵气流转更加顺畅\n\n⚡ **特殊事件**\n- 遇见神秘老者，获得修行指导',
        time: '初入此界',
        importance: 8
      });
    }

    // 分类赋值到对应的记忆类型
    shortTermMemories.value = loadedShortMemories;
    mediumTermMemories.value = loadedMediumMemories;
    longTermMemories.value = loadedLongMemories;
    
    const totalLoaded = loadedShortMemories.length + loadedMediumMemories.length + loadedLongMemories.length;
    debug.log('记忆中心', `记忆加载完成，总计: ${totalLoaded} 条记忆，短期:${loadedShortMemories.length}, 中期:${loadedMediumMemories.length}, 长期:${loadedLongMemories.length}`);
    
    // 检查是否需要转化记忆
    convertMemories();

  } catch (error) {
    debug.error('记忆中心', '加载数据失败:', error);
    // 确保即使出错也有基本显示
    if ((shortTermMemories.value.length + mediumTermMemories.value.length + longTermMemories.value.length) === 0) {
      shortTermMemories.value = [{
        type: 'short',
        content: '记忆系统初始化中...',
        time: '系统记录',
        importance: 5
      }];
    }
  }
};

onMounted(() => {
  loadMemoryData();
});
</script>

<style scoped>
/* 记忆状态条样式 */
.memory-status {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(var(--color-surface-rgb), 0.5);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 120px;
  flex: 1;
}

.status-item.warning {
  color: var(--color-warning);
}

.status-label {
  font-size: 0.75rem;
  font-weight: 500;
  min-width: 2rem;
}

.status-bar {
  flex: 1;
  height: 6px;
  background: rgba(var(--color-border-rgb), 0.3);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.status-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-success), var(--color-warning), var(--color-danger));
  border-radius: 3px;
  transition: var(--transition-fast);
}

.status-item.warning .status-fill {
  background: var(--color-warning);
}

.status-text {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  min-width: 3rem;
}

.btn-icon {
  font-size: 1rem;
}

.action-btn.info {
  background: rgba(var(--color-info-rgb), 0.1);
  border-color: rgba(var(--color-info-rgb), 0.3);
  color: var(--color-info);
}

.action-btn.info:hover {
  background: rgba(var(--color-info-rgb), 0.2);
  border-color: var(--color-info);
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