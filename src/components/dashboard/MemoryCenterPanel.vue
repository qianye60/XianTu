<template>
  <div class="memory-center-panel game-panel">

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
        <button
          class="settings-toggle-btn"
          @click="showSettings = !showSettings"
          :class="{ active: showSettings }"
          title="记忆系统设置"
        >
          <Settings :size="16" />
        </button>
      </div>
    </div>

    <!-- 导出工具 -->
    <div class="export-section" v-if="!showSettings">
      <button
        class="export-btn-main"
        @click="exportMemoriesAsNovel"
        title="将完整的叙事历史导出为小说格式的 .txt 文件"
      >
        📖 导出为小说
      </button>
      <div class="export-hint">
        将完整的游戏对话历史（基于叙事历史）导出为小说格式，便于阅读和分享。
      </div>
    </div>

    <!-- 记忆系统设置 -->
    <div class="settings-section" v-if="showSettings">
      <div class="settings-header">
        <span class="settings-title">⚙️ 记忆系统配置</span>
        <div class="header-actions">
          <button
            class="test-btn"
            @click="addTestMediumTermMemory"
            title="添加测试中期记忆"
          >
            🧪 测试
          </button>
          <button
            class="settings-close-btn"
            @click="showSettings = false"
          >✕</button>
        </div>
      </div>

      <div class="settings-content">
        <div class="setting-item">
          <label class="setting-label">短期记忆限制 (条):</label>
          <input
            type="number"
            v-model.number="memoryConfig.shortTermLimit"
            min="3"
            max="10"
            class="setting-input"
          />
          <span class="setting-hint">默认: 3</span>
        </div>

        <div class="setting-item">
          <label class="setting-label">中期记忆转化阈值 (条):</label>
          <input
            type="number"
            v-model.number="memoryConfig.midTermTrigger"
            min="10"
            max="50"
            class="setting-input"
          />
          <span class="setting-hint">中期记忆积累达到此数量时转化为长期记忆，默认: 25</span>
        </div>

        <div class="setting-item">
          <label class="setting-label">中期记忆保留数量 (条):</label>
          <input
            type="number"
            v-model.number="memoryConfig.midTermKeep"
            min="5"
            max="15"
            class="setting-input"
          />
          <span class="setting-hint">转化为长期记忆时保留最新的中期记忆数量，默认: 8</span>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input
              type="checkbox"
              v-model="memoryConfig.autoSummaryEnabled"
              class="setting-checkbox"
            />
            启用自动记忆转化
          </label>
          <span class="setting-hint">开启后自动将中期记忆转化为长期记忆，关闭则不进行转化</span>
        </div>

        <div class="setting-item">
          <label class="setting-label">中期记忆自定义格式:</label>
          <textarea
            v-model="memoryConfig.midTermFormat"
            class="setting-textarea"
            placeholder="留空使用默认格式。可自定义AI提示词来控制中期记忆的生成格式..."
            rows="4"
          ></textarea>
          <span class="setting-hint">自定义中期记忆的AI提示词格式，留空使用系统默认</span>
        </div>

        <div class="setting-item">
          <label class="setting-label">长期记忆自定义格式:</label>
          <textarea
            v-model="memoryConfig.longTermFormat"
            class="setting-textarea"
            placeholder="留空使用默认格式。可自定义AI提示词来控制长期记忆的生成格式..."
            rows="4"
          ></textarea>
          <span class="setting-hint">自定义长期记忆的AI提示词格式，留空使用系统默认</span>
        </div>

        <div class="settings-actions">
          <button
            class="action-btn success"
            @click="saveMemoryConfig"
          >
            💾 保存配置
          </button>
          <button
            class="action-btn info"
            @click="resetMemoryConfig"
          >
            重置默认
          </button>
        </div>

        <!-- 手动总结触发 -->
        <div class="manual-summary-section">
          <div class="summary-info">
            <span class="info-text">当前中期记忆: {{ mediumTermMemories.length }} 条</span>
            <span class="info-hint">（达到 {{ memoryConfig.midTermTrigger }} 条时自动触发总结）</span>
          </div>
          <button
            class="action-btn warning"
            @click="manualTriggerSummary"
            :disabled="mediumTermMemories.length < memoryConfig.midTermKeep + 5"
            :title="mediumTermMemories.length < memoryConfig.midTermKeep + 5 ? `至少需要 ${memoryConfig.midTermKeep + 5} 条中期记忆才能总结` : '手动触发AI总结'"
          >
            📝 手动总结中期记忆
          </button>
        </div>
      </div>
    </div>

    <!-- 记忆列表 -->
    <div class="panel-content" v-if="!showSettings">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner">⏳</div>
        <div class="loading-text">正在读取记忆...</div>
      </div>

      <div v-else-if="filteredMemories.length === 0" class="empty-state">
        <div class="empty-icon">🧠</div>
        <div class="empty-text">{{ getEmptyText() }}</div>
      </div>

      <div v-else>
        <!-- 分页控制 -->
        <div class="pagination-controls" v-if="filteredMemoriesAll.length > pageSize">
          <div class="pagination-info">
            第 {{ currentPage }} / {{ totalPages }} 页，共 {{ filteredMemoriesAll.length }} 条记忆
          </div>
          <div class="pagination-buttons">
            <button
              class="page-btn"
              @click="goToFirstPage"
              :disabled="currentPage === 1"
              title="第一页"
            >
              ⏮️
            </button>
            <button
              class="page-btn"
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage === 1"
              title="上一页"
            >
              ◀️
            </button>
            <button
              class="page-btn"
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage === totalPages"
              title="下一页"
            >
              ▶️
            </button>
            <button
              class="page-btn"
              @click="goToLastPage"
              :disabled="currentPage === totalPages"
              title="最后一页"
            >
              ⏭️
            </button>
          </div>
          <div class="pagination-jump">
            <input
              type="number"
              v-model="jumpToPage"
              placeholder="页码"
              class="jump-input"
              @keyup.enter="handleJumpToPage"
              min="1"
              :max="totalPages"
            />
            <button class="jump-btn" @click="handleJumpToPage">跳转</button>
          </div>
        </div>

        <div class="memory-list">
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
            <div class="memory-actions">
              <button
                class="delete-memory-btn"
                @click.stop="deleteMemory(memory)"
                title="删除此记忆"
              >
                🗑️
              </button>
              <div class="memory-time">{{ memory.time }}</div>
            </div>
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
                <!-- 确保只在数组时才遍历，字符串直接显示 -->
                <template v-if="Array.isArray(memory.parsedContent.sections[section.key])">
                  <div
                    v-for="item in memory.parsedContent.sections[section.key]"
                    :key="item"
                    class="memory-item"
                  >
                    {{ item }}
                  </div>
                </template>
                <div v-else class="memory-item">
                  {{ memory.parsedContent.sections[section.key] }}
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
                <!-- 确保只在数组时才遍历，字符串直接显示 -->
                <template v-if="Array.isArray(memory.parsedContent.sections['general'])">
                  <div
                    v-for="item in memory.parsedContent.sections['general']"
                    :key="item"
                    class="memory-item"
                  >
                    {{ item }}
                  </div>
                </template>
                <div v-else class="memory-item">
                  {{ memory.parsedContent.sections['general'] }}
                </div>
              </div>
            </div>

            <div v-else class="simple-memory">
              {{ memory.content }}
            </div>
          </div>
          </div>
        </div>

        <!-- 底部分页控制 -->
        <div class="pagination-controls bottom" v-if="filteredMemoriesAll.length > pageSize">
          <div class="pagination-info">
            第 {{ currentPage }} / {{ totalPages }} 页
          </div>
          <div class="pagination-buttons">
            <button
              class="page-btn"
              @click="goToFirstPage"
              :disabled="currentPage === 1"
            >
              ⏮️
            </button>
            <button
              class="page-btn"
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage === 1"
            >
              ◀️
            </button>
            <button
              class="page-btn"
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage === totalPages"
            >
              ▶️
            </button>
            <button
              class="page-btn"
              @click="goToLastPage"
              :disabled="currentPage === totalPages"
            >
              ⏭️
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Settings } from 'lucide-vue-next';
import { panelBus } from '@/utils/panelBus';
import { useCharacterStore } from '@/stores/characterStore';
import { useGameStateStore } from '@/stores/gameStateStore'; // 导入 gameStateStore
import { toast } from '@/utils/toast';
import { debug } from '@/utils/debug';
import { type MemoryFormatConfig } from '@/utils/memoryFormatConfig';
import { AIBidirectionalSystem } from '@/utils/AIBidirectionalSystem'; // 导入AI系统

interface Memory {
  type: 'short' | 'medium' | 'long';
  content: string;
  time: string;
  parsedContent?: {
    title?: string;
    sections: { [key: string]: string[] };
    format?: MemoryFormatConfig;
    事件?: string;
    时间?: string;
    地点?: string;
    人物?: string;
    影响?: string;
  };
  // 新增字段用于记忆转化逻辑
  originalIndex?: number; // 原始索引位置
  isConverted?: boolean; // 是否是转化后的记忆
  isSummarized?: boolean; // 是否是AI总结后的记忆
  importance?: number; // 记忆重要性（1-10）
}

const characterStore = useCharacterStore();
const gameStateStore = useGameStateStore(); // 实例化 gameStateStore
// const saveData = computed(() => characterStore.activeSaveSlot?.存档数据); // [已废弃]
const loading = ref(false);
const activeFilter = ref('all');
const showSettings = ref(false);

// 分页相关
const currentPage = ref(1);
const pageSize = ref(10);
const jumpToPage = ref('');

// 记忆系统配置
const memoryConfig = ref({
  shortTermLimit: 3, // 与后端配置同步
  midTermTrigger: 25, // 与后端配置同步
  midTermKeep: 8,
  autoSummaryEnabled: true,
  midTermFormat: '',
  longTermFormat: '',
});

// 记忆转化配置
const MEMORY_CONFIG = {
  SHORT_TERM_LIMIT: 3, // 短期记忆上限（与后端同步）
  MEDIUM_TERM_LIMIT: 25, // 中期记忆上限（与后端同步）
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

// 筛选后的记忆（不分页）
const filteredMemoriesAll = computed(() => {
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

// 总页数
const totalPages = computed(() => {
  return Math.ceil(filteredMemoriesAll.value.length / pageSize.value) || 1;
});

// 当前页的记忆（分页后）
const filteredMemories = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredMemoriesAll.value.slice(start, end);
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

// 此函数已废弃，逻辑已移至 AIBidirectionalSystem.ts
// const summarizeMidTermToLongTerm = async () => { ... };

/**
 * 保存记忆数据到存档
 */
const saveMemoriesToStore = async () => {
  try {
    if (!gameStateStore.memory) {
      debug.warn('记忆中心', 'gameStateStore.memory 不存在，无法保存记忆');
      // 如果不存在，则创建一个空的记忆对象
      gameStateStore.memory = { 短期记忆: [], 中期记忆: [], 长期记忆: [], 隐式中期记忆: [] };
    }

    // 将内存中的记忆数据转换为存档格式（字符串数组）
    gameStateStore.memory.短期记忆 = shortTermMemories.value.map(m => m.content);
    gameStateStore.memory.中期记忆 = mediumTermMemories.value.map(m => m.content);
    gameStateStore.memory.长期记忆 = longTermMemories.value.map(m => m.content);

    // 触发存档保存
    await characterStore.saveCurrentGame();

    debug.log('记忆中心', '记忆数据已保存到存档');
  } catch (error) {
    debug.error('记忆中心', '保存记忆数据到存档失败:', error);
    throw error;
  }
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
    debug.log('记忆中心', '中期记忆达到上限，准备转化为长期记忆');

    // 如果启用了自动总结，触发AI总结
    if (memoryConfig.value.autoSummaryEnabled) {
      debug.log('记忆中心', '自动总结已启用，将在后台触发AI总结');
      // 🔥 [重构] 调用统一的总结入口
      AIBidirectionalSystem.triggerMemorySummary().catch(error => {
        debug.error('记忆中心', '自动总结失败:', error);
      });
    } else {
      // 未启用自动总结，直接转化（旧逻辑）
      const oldestMedium = mediumTermMemories.value.shift();
      if (oldestMedium) {
        const convertedMemory: Memory = {
          ...oldestMedium,
          type: 'long',
          time: `归档于${formatTime(Date.now())}`,
          importance: Math.max(oldestMedium.importance || 5, 7),
          isConverted: true
        };
        longTermMemories.value.push(convertedMemory);
        hasConversion = true;
      }
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
const addMemory = (type: 'short' | 'medium' | 'long', content: string, importance: number = 5, parsedContent?: Memory['parsedContent']) => {
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
  currentPage.value = 1; // 切换筛选器时重置到第一页
};

// 分页相关函数
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const goToFirstPage = () => {
  currentPage.value = 1;
};

const goToLastPage = () => {
  currentPage.value = totalPages.value;
};

const handleJumpToPage = () => {
  const page = parseInt(jumpToPage.value);
  if (!isNaN(page) && page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    jumpToPage.value = '';
  } else {
    toast.warning(`请输入 1-${totalPages.value} 之间的页码`);
  }
};

// 清理记忆（使用全局确认弹窗）
import { useUIStore } from '@/stores/uiStore';
const uiStore = useUIStore();
const clearMemory = async () => {
  uiStore.showRetryDialog({
    title: '清理记忆',
    message: '确定要清理所有记忆吗？此操作不可撤销，将同步清理酒馆数据。',
    confirmText: '确认清理',
    cancelText: '取消',
    onConfirm: async () => {
      try {
        // 清理本地显示数据
        shortTermMemories.value = [];
        mediumTermMemories.value = [];
        longTermMemories.value = [];

        // 同步清理 gameStateStore 中的数据
        if (gameStateStore.memory) {
          gameStateStore.memory.短期记忆 = [];
          gameStateStore.memory.中期记忆 = [];
          gameStateStore.memory.长期记忆 = [];
        }

        // 保存变更
        await characterStore.saveCurrentGame();

        toast.success('记忆已清理并同步到酒馆');
      } catch (error) {
        console.error('[记忆中心] 清理记忆失败:', error);
        toast.error('清理记忆失败，请重试');
      }
    },
    onCancel: () => {}
  });
};

// 测试记忆转化功能（保留但不使用）
// const testMemoryConversion = () => {
//   const testMessages = [
//     '今日在练功房修炼《太极心经》，有所感悟',
//     '与师兄切磋武艺，招式精进不少',
//     '在藏书阁阅读古籍，了解到远古修真历史',
//     '炼制了几枚回气丹，成功率提升',
//     '探索后山秘境，发现奇异灵草'
//   ];
//
//   const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
//   addMemory('short', randomMessage, Math.floor(Math.random() * 5) + 5);
//
//   toast.success(`已添加测试记忆: ${randomMessage.substring(0, 20)}...`);
// };

// 加载记忆数据 - 简化版本：直接从存档数据读取字符串数组
const loadMemoryData = async () => {
  try {
    debug.log('记忆中心', '开始加载记忆数据');

    const loadedShortMemories: Memory[] = [];
    const loadedMediumMemories: Memory[] = [];
    const loadedLongMemories: Memory[] = [];

    // 直接从 gameStateStore 获取记忆
    const memoryData = gameStateStore.memory;

    if (memoryData) {
      debug.log('记忆中心', '从存档数据加载记忆:', Object.keys(memoryData));

      // 短期记忆 - 字符串数组
      if (Array.isArray(memoryData.短期记忆)) {
        memoryData.短期记忆.forEach((content: string, index: number) => {
          if (content && typeof content === 'string') {
            const memory: Memory = {
              type: 'short',
              content,
              time: formatTime(Date.now() - index * 300000), // 5分钟间隔
              importance: 5
            };
            loadedShortMemories.push(memory);
          }
        });
      }

      // 中期记忆 - 字符串数组
      if (Array.isArray(memoryData.中期记忆)) {
        memoryData.中期记忆.forEach((content: string, index: number) => {
          if (content && typeof content === 'string') {
            const memory: Memory = {
              type: 'medium',
              content,
              time: formatTime(Date.now() - index * 3600000), // 1小时间隔
              importance: 7
            };
            loadedMediumMemories.push(memory);
          }
        });
      }

      // 长期记忆 - 字符串数组
      if (Array.isArray(memoryData.长期记忆)) {
        debug.log('记忆中心', `发现长期记忆数组，长度: ${memoryData.长期记忆.length}`);
        debug.log('记忆中心', '长期记忆原始数据:', memoryData.长期记忆);

        memoryData.长期记忆.forEach((content: string, index: number) => {
          if (content && typeof content === 'string') {
            const memory: Memory = {
              type: 'long',
              content,
              time: formatTime(Date.now() - index * 86400000), // 1天间隔
              importance: 9
            };
            loadedLongMemories.push(memory);
            debug.log('记忆中心', `加载长期记忆 #${index}:`, content.substring(0, 50));
          }
        });
      } else {
        debug.warn('记忆中心', '长期记忆不是数组或不存在:', memoryData.长期记忆);
      }

      debug.log('记忆中心', `记忆加载完成: 短期${loadedShortMemories.length}, 中期${loadedMediumMemories.length}, 长期${loadedLongMemories.length}`);
    } else {
      debug.warn('记忆中心', '未找到存档记忆数据');
    }

    // 更新显示状态
    shortTermMemories.value = loadedShortMemories;
    mediumTermMemories.value = loadedMediumMemories;
    longTermMemories.value = loadedLongMemories;

    // 统计各类型记忆数量
    const totalMemories = loadedShortMemories.length + loadedMediumMemories.length + loadedLongMemories.length;
    debug.log('记忆中心', `记忆加载完成：总计 ${totalMemories} 条记忆`);

  } catch (error) {
    debug.error('记忆中心', '加载记忆数据失败', error);
    toast.error('加载记忆数据失败');
  }
};

// 记忆配置管理功能
const loadMemoryConfig = async () => {
  try {
    // 🔥 [新架构] 从 localStorage 读取配置
    const saved = localStorage.getItem('memory-settings');
    if (saved) {
      const settings = JSON.parse(saved);
      memoryConfig.value = { ...memoryConfig.value, ...settings };
      debug.log('记忆中心', '已从localStorage加载配置', settings);
      return;
    }
    debug.log('记忆中心', '未找到配置，使用默认值');
  } catch (error) {
    debug.error('记忆中心', '加载记忆配置失败:', error);
  }
};

const saveMemoryConfig = async () => {
  try {
    // 🔥 [新架构] 保存到 localStorage
    localStorage.setItem('memory-settings', JSON.stringify(memoryConfig.value));

    // 发送全局事件，通知其他面板配置已更新
    panelBus.emit('memory-settings-updated', memoryConfig.value);

    toast.success('记忆系统配置已保存');
    debug.log('记忆中心', '配置已保存:', memoryConfig.value);
  } catch (error) {
    debug.error('记忆中心', '保存配置失败:', error);
    toast.error('保存配置失败');
  }
};

const resetMemoryConfig = () => {
  memoryConfig.value = {
    shortTermLimit: 3,
    midTermTrigger: 20,
    midTermKeep: 8,
    autoSummaryEnabled: true,
    midTermFormat: '',
    longTermFormat: '',
  };
  toast.success('配置已重置为默认值');
};

/**
 * 手动触发中期记忆到长期记忆的AI总结
 */
const manualTriggerSummary = async () => {
  const minRequired = memoryConfig.value.midTermKeep + 5;
  if (mediumTermMemories.value.length < minRequired) {
    toast.warning(`中期记忆不足，至少需要 ${minRequired} 条才能总结`);
    return;
  }

  // 🔥 [重构] 直接调用 AIBidirectionalSystem 中的统一方法
  // 这个方法自带 toast 通知和错误处理
  await AIBidirectionalSystem.triggerMemorySummary();
};

/**
 * 删除单条记忆（同时删除本地显示、IndexedDB存档和酒馆变量）
 * 这是唯一能完整删除记忆的方法，确保三处数据同步
 */
const deleteMemory = async (memory: Memory) => {
  uiStore.showRetryDialog({
    title: '删除记忆',
    message: `确定要删除这条${getTypeName(memory.type)}吗？此操作不可撤销。\n\n内容：${memory.content.substring(0, 50)}...`,
    confirmText: '删除',
    cancelText: '取消',
    onConfirm: async () => {
      try {
        // 🔥 步骤1：从显示数组中删除
        let actualIndex = -1;
        switch (memory.type) {
          case 'short':
            actualIndex = shortTermMemories.value.findIndex(m => m === memory);
            if (actualIndex !== -1) {
              shortTermMemories.value.splice(actualIndex, 1);
            }
            break;
          case 'medium':
            actualIndex = mediumTermMemories.value.findIndex(m => m === memory);
            if (actualIndex !== -1) {
              mediumTermMemories.value.splice(actualIndex, 1);
            }
            break;
          case 'long':
            actualIndex = longTermMemories.value.findIndex(m => m === memory);
            if (actualIndex !== -1) {
              longTermMemories.value.splice(actualIndex, 1);
            }
            break;
        }

        if (actualIndex === -1) {
          toast.error('找不到要删除的记忆');
          return;
        }

        // 保存到 gameStateStore 和 IndexedDB
        await saveMemoriesToStore();

        debug.log('记忆中心', `✅ 已删除${getTypeName(memory.type)}并同步到存档`);
        toast.success(`已删除${getTypeName(memory.type)}`);
      } catch (error) {
        debug.error('记忆中心', '删除记忆失败:', error);
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        toast.error(`删除失败: ${errorMsg}`);
      }
    },
    onCancel: () => {}
  });
};

/**
 * [重构] 导出叙事历史为小说格式
 */
const exportMemoriesAsNovel = () => {
  try {
    const characterName = gameStateStore.character?.名字 || '修行者';
    const worldName = gameStateStore.worldInfo?.世界名称 || '修仙世界';
    const narrativeHistory = gameStateStore.narrativeHistory || [];

    if (narrativeHistory.length === 0) {
      toast.warning('暂无叙事历史可导出');
      return;
    }

    // 生成小说格式的文本
    let novelText = `《${characterName}的修仙之路》\n\n`;
    novelText += `世界档案：${worldName}\n`;
    novelText += `导出时间：${new Date().toLocaleString('zh-CN')}\n`;
    novelText += `总段落数：${narrativeHistory.length}\n`;
    novelText += `\n${'='.repeat(60)}\n\n`;

    narrativeHistory.forEach((entry, index) => {
      const isPlayer = entry.type === 'user' || entry.type === 'player';
      const content = entry.content.replace(/【.*?】/g, '').trim(); // 移除时间戳

      if (isPlayer) {
        novelText += `我说道："${content}"\n`;
      } else {
        novelText += `${content}\n`;
      }

      // 每条之间添加分隔线
      novelText += `${'─'.repeat(50)}\n\n`;

      // 每10个段落添加一个章节分隔符
      if ((index + 1) % 10 === 0) {
        novelText += `\n${'═'.repeat(50)}\n`;
        novelText += `第 ${Math.floor((index + 1) / 10)} 章节\n`;
        novelText += `${'═'.repeat(50)}\n\n`;
      }
    });

    // 创建下载
    const blob = new Blob([novelText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${characterName}_修仙历程_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`已成功导出 ${narrativeHistory.length} 条叙事历史`);
  } catch (error) {
    console.error('[记忆中心] 导出失败:', error);
    toast.error('导出失败，请查看控制台');
  }
};

onMounted(async () => {
  await loadMemoryData();
  await loadMemoryConfig();
  // 绑定统一顶栏动作
  panelBus.on('refresh', async () => {
    loading.value = true;
    try { await loadMemoryData(); } finally { loading.value = false; }
  });
  panelBus.on('test', () => {
    addMemory('short', '【测试记忆】用于检验转化与渲染。');
  });
  panelBus.on('clear', async () => {
    await clearMemory();
  });
});

// 测试函数：添加一条中期记忆
const addTestMediumTermMemory = async () => {
  try {
    const testMemory: Memory = {
      content: `测试中期记忆 ${Date.now()} - 这是一条用于测试的中期记忆记录。`,
      time: formatTime(Date.now()),
      type: 'medium',
      isConverted: false,
      isSummarized: false,
      parsedContent: {
        影响: '测试',
        sections: {}
      }
    };

    mediumTermMemories.value.push(testMemory);

    // 保存到存档
    await saveMemoriesToStore();

    toast.success(`✅ 测试记忆已添加！当前中期记忆: ${mediumTermMemories.value.length} 条`);
    debug.log('记忆中心', '添加测试中期记忆成功', testMemory);
  } catch (error) {
    debug.error('记忆中心', '添加测试记忆失败', error);
    toast.error('添加测试记忆失败');
  }
};
</script>

<style scoped>
/* 顶栏动作统一处理，移除本地工具栏 */
/* 容器约束防止溢出 */
.memory-center-panel {
  width: 100%;
  max-width: 100%;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
  container-type: inline-size;
  margin: 0;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem; /* 为导出区域增加间距 */
}

/* 导出区域样式 */
.export-section {
  padding: 1rem;
  background: rgba(var(--color-surface-rgb), 0.5);
  border: 1px solid rgba(var(--color-border-rgb), 0.3);
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 1rem;
  backdrop-filter: blur(5px);
}

.export-btn-main {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.export-btn-main:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.3);
}

.export-hint {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.filter-section {
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.filter-tabs {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
  align-items: center;
  margin: 0 0 1rem 0;
  padding: 1rem;
  background: rgba(var(--color-surface-rgb), 0.3);
  border: 1px solid rgba(var(--color-border-rgb), 0.3);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.filter-tabs .filter-tab {
  flex: 0 0 auto;
  margin: 0;
}

.filter-tabs .settings-toggle-btn {
  margin-left: auto;
}

.filter-tab {
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
  margin: 0;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-sizing: border-box;
  font-size: 0.875rem;
  font-weight: 500;
  min-height: 40px;
  position: relative;
}

.filter-tab:hover {
  background: var(--color-surface-light);
  border-color: var(--color-border-hover);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.filter-tab.active {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  border-color: var(--color-primary);
  color: white;
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
}

.filter-tab .tab-icon {
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-tab .tab-name {
  font-weight: 500;
  letter-spacing: 0.3px;
}

.filter-tab .tab-count {
  background: rgba(255, 255, 255, 0.2);
  color: var(--color-text);
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
  line-height: 1;
}

.filter-tab.active .tab-count {
  background: rgba(255, 255, 255, 0.25);
  color: white;
}

.filter-section {
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.panel-content {
  width: 100%;
  max-width: 100%;
  height: calc(100% - 80px);
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* 设置界面样式 */
.settings-section {
  margin: 0;
  padding: 0;
  background: rgba(var(--color-surface-rgb), 0.95);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  animation: fadeIn 0.3s ease-in-out;
  max-width: 100%;
  width: 100%;
  height: 100%;
  max-height: calc(100% - 80px);
  box-sizing: border-box;
  overflow: hidden;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0;
  padding: 1rem 1rem 0.5rem 1rem;
  border-bottom: 1px solid var(--color-border);
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.export-btn {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
  margin-right: 0.5rem;
}

.export-btn:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.test-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.test-btn:hover {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.settings-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-close-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.2rem;
  border-radius: 4px;
  transition: var(--transition-fast);
  flex-shrink: 0;
}

.settings-close-btn:hover {
  background: rgba(var(--color-danger-rgb), 0.1);
  color: var(--color-danger);
}

.settings-content {
  display: block;
  max-width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
  flex: 1;
  min-height: 0;
  padding: 1rem;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}

.settings-content::-webkit-scrollbar {
  width: 8px;
}

.settings-content::-webkit-scrollbar-track {
  background: rgba(var(--color-border-rgb), 0.1);
  border-radius: 4px;
}

.settings-content::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

.settings-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-hover);
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 100%;
  overflow: visible;
  box-sizing: border-box;
  margin-bottom: 1.5rem;
}

.setting-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 100%;
  overflow: hidden;
  word-wrap: break-word;
}

.setting-input {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.875rem;
  width: 100px;
  max-width: 120px;
  transition: var(--transition-fast);
  box-sizing: border-box;
}

.setting-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
}

.setting-textarea {
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.875rem;
  width: 100%;
  max-width: 100%;
  transition: var(--transition-fast);
  box-sizing: border-box;
  resize: vertical;
  min-height: 100px;
  font-family: monospace;
  line-height: 1.4;
}

.setting-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
}

.setting-textarea::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.7;
}

.setting-checkbox {
  margin-right: 0.5rem;
  accent-color: var(--color-primary);
  flex-shrink: 0;
}

.setting-hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  opacity: 0.8;
  max-width: 100%;
  overflow: hidden;
  word-wrap: break-word;
}

.settings-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 2rem;
  flex-wrap: wrap;
  max-width: 100%;
  overflow: visible;
  box-sizing: border-box;
}

/* 手动总结区域 */
.manual-summary-section {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.summary-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

.info-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.info-hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

/* 通用操作按钮基样式，确保有清晰边框 */
.action-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: var(--transition-fast);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-sizing: border-box;
  background: var(--color-surface);
  color: var(--color-text);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.action-btn.success {
  background: rgba(var(--color-success-rgb), 0.1);
  border: 1px solid rgba(var(--color-success-rgb), 0.3);
  color: var(--color-success);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: var(--transition-fast);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-sizing: border-box;
}

.action-btn.success:hover {
  background: rgba(var(--color-success-rgb), 0.2);
  border-color: var(--color-success);
}

/* 信息按钮，用于“重置默认”等操作 */
.action-btn.info {
  background: rgba(var(--color-info-rgb), 0.1);
  border: 1px solid rgba(var(--color-info-rgb), 0.3);
  color: var(--color-info);
}

.action-btn.info:hover {
  background: rgba(var(--color-info-rgb), 0.2);
  border-color: var(--color-info);
}

.settings-toggle-btn {
  background: rgba(var(--color-surface-rgb), 0.8);
  border: 1px solid var(--color-border);
  padding: 0.6rem;
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  box-sizing: border-box;
  backdrop-filter: blur(10px);
}

.settings-toggle-btn:hover,
.settings-toggle-btn.active {
  background: rgba(var(--color-primary-rgb), 0.15);
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.2);
}

/* 记忆卡片特定样式 */
.memory-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.memory-card {
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: var(--transition-fast);
  cursor: pointer;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
  word-wrap: break-word;
  word-break: break-word;
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

.memory-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.delete-memory-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  opacity: 0.6;
}

.delete-memory-btn:hover {
  opacity: 1;
  background: rgba(220, 38, 38, 0.1);
  border-color: #dc2626;
  transform: scale(1.1);
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
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  word-wrap: break-word;
  word-break: break-word;
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
  color: var(--color-text);
  font-size: 0.9rem;
}

.memory-item {
  margin: 0.3rem 0;
  padding-left: 1rem;
  color: var(--color-text);
  line-height: 1.4;
  position: relative;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  word-wrap: break-word;
  word-break: break-word;
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
@media (max-width: 640px) {
  .memory-center-panel {
    gap: 0.75rem;
    width: 100%;
    max-width: 100%;
    overflow: hidden;
  }

  .header-actions .btn-text {
    display: none;
  }

  .filter-tabs {
    gap: 0.3rem;
  }

  .filter-tab {
    max-width: 120px;
    font-size: 0.8rem;
  }

  .memory-status {
    gap: 0.5rem;
    padding: 0.6rem;
    flex-direction: column;
  }

  .status-item {
    min-width: 80px;
    flex: 1 1 100px;
    width: 100%;
    max-width: 100%;
  }

  .status-text {
    font-size: 0.7rem;
    min-width: 2.5rem;
  }

  .memory-card {
    padding: 0.8rem;
  }

  .memory-content {
    font-size: 0.8rem;
  }

  .memory-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .memory-type-badge {
    align-self: flex-start;
  }

  .memory-time {
    align-self: flex-end;
    font-size: 0.7rem;
  }
}

@media (max-width: 480px) {
  .memory-center-panel {
    gap: 0.5rem;
  }

  .filter-tabs {
    gap: 0.2rem;
  }

  .filter-tab {
    max-width: 100px;
    font-size: 0.75rem;
    padding: 0.4rem 0.6rem;
  }

  .memory-status {
    padding: 0.5rem;
  }

  .status-item {
    gap: 0.3rem;
  }

  .status-label {
    font-size: 0.7rem;
    min-width: 1.5rem;
  }

  .status-bar {
    height: 4px;
  }

  .status-text {
    font-size: 0.65rem;
    min-width: 2rem;
  }

  .memory-card {
    padding: 0.6rem;
  }

  .memory-content {
    font-size: 0.75rem;
  }

  .memory-section-title {
    font-size: 0.8rem;
  }

  .memory-item {
    font-size: 0.75rem;
    padding-left: 0.8rem;
  }
}

/* 分页控制样式 */
.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  background: rgba(var(--color-surface-rgb), 0.5);
  border: 1px solid rgba(var(--color-border-rgb), 0.3);
  border-radius: 8px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.pagination-controls.bottom {
  margin-top: 1rem;
  margin-bottom: 0;
}

.pagination-info {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.pagination-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.page-btn {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
  color: var(--color-text);
  min-width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-btn:hover:not(:disabled) {
  background: var(--color-surface-light);
  border-color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.2);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-jump {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.jump-input {
  width: 70px;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.875rem;
  text-align: center;
  transition: all 0.2s ease;
}

.jump-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
}

.jump-btn {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.jump-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
}

@media (max-width: 640px) {
  .pagination-controls {
    flex-direction: column;
    gap: 0.75rem;
  }

  .pagination-info {
    width: 100%;
    text-align: center;
  }

  .pagination-buttons {
    width: 100%;
    justify-content: center;
  }

  .pagination-jump {
    width: 100%;
    justify-content: center;
  }
}
</style>
