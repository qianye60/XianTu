<template>
  <div class="main-game-panel">
    <!-- 短期记忆区域 -->
    <div class="memory-section" v-if="showMemorySection">
      <div class="memory-header" @click="toggleMemory">
        <span class="memory-title">短期记忆</span>
        <ChevronDown v-if="memoryExpanded" :size="16" class="memory-icon" />
        <ChevronRight v-else :size="16" class="memory-icon" />
      </div>

      <!-- 下拉悬浮的记忆内容 -->
      <Transition name="memory-dropdown">
        <div v-if="memoryExpanded" class="memory-dropdown">
          <div class="memory-content">
            <div v-for="(memory, index) in recentMemories" :key="index" class="memory-item">
              {{ memory }}
            </div>
            <div v-if="recentMemories.length === 0" class="no-memory">
              脑海中一片清净，尚未留下修行痕迹...
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 文本显示区域 - 当前AI回复 -->
    <div class="content-area" ref="contentAreaRef">
      <!-- 左侧：当前叙述 -->
      <div class="current-narrative">
        <!-- AI处理时显示 -->
        <div v-if="isAIProcessing" class="ai-processing-display">
          <!-- 如果有流式内容则显示 -->
          <div v-if="useStreaming && streamingContent" class="streaming-content">
            <div class="narrative-meta streaming-meta">
              <span class="narrative-time">{{ formatCurrentTime() }}</span>
              <div class="streaming-indicator">
                <span class="streaming-dot"></span>
                <span v-if="streamingContent" class="streaming-text">{{ streamingCharCount }} 字</span>
              </div>
              <!-- 重置按钮 - 右侧 -->
              <button
                @click="forceResetAIProcessingState"
                class="reset-state-btn"
                title="如果长时间无响应，点击此处重置状态"
              >
                <RotateCcw :size="16" />
              </button>
            </div>
            <div class="narrative-text">
              <FormattedText :text="streamingContent" />
            </div>
          </div>
          <!-- 等待响应的加载动画 -->
          <div v-else class="waiting-for-stream">
            <div class="narrative-meta streaming-meta">
              <span class="narrative-time">{{ formatCurrentTime() }}</span>
              <div class="streaming-indicator">
                <span class="streaming-dot"></span>
                <span class="streaming-text">天道感应中...</span>
              </div>
              <!-- 重置按钮 - 右侧 -->
              <button
                @click="forceResetAIProcessingState"
                class="reset-state-btn"
                title="如果长时间无响应，点击此处重置状态"
              >
                <RotateCcw :size="16" />
              </button>
            </div>
            <div class="narrative-text">
              <div class="waiting-animation">
                <div class="thinking-dots">
                  <div class="dot"></div>
                  <div class="dot"></div>
                  <div class="dot"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 非AI处理时显示 -->
        <template v-else>
          <div v-if="currentNarrative" class="narrative-content">
            <div class="narrative-meta">
              <span class="narrative-time">{{ currentNarrative.time }}</span>
              <div class="meta-buttons">
                <!-- 回滚按钮 -->
                <button
                  v-if="canRollback"
                  @click="rollbackToLastConversation"
                  class="header-action-btn rollback-btn"
                  title="回滚到上次对话前的状态"
                >
                  <RotateCcw :size="24" />
                </button>
                <!-- 命令日志按钮 -->
                <button
                  @click="showStateChanges(currentNarrative.stateChanges)"
                  class="variable-updates-toggle"
                  :class="{ disabled: currentNarrativeStateChanges.length === 0 }"
                  :disabled="currentNarrativeStateChanges.length === 0"
                  :title="currentNarrativeStateChanges.length > 0 ? '查看本次对话的变更日志' : '本次对话无变更记录'"
                >
                  <ScrollText :size="16" />
                  <span class="update-count">{{ currentNarrativeStateChanges.length }}</span>
                </button>
              </div>
            </div>
            <div class="narrative-text">
              <FormattedText :text="currentNarrative.content" />
            </div>
          </div>
          <div v-else class="empty-narrative">
            静待天机变化...
          </div>
        </template>
      </div>
    </div>


    <!-- 输入区域 -->
    <div class="input-section">
      <!-- 动作队列显示区域 -->
      <div v-if="actionQueue.pendingActions.length > 0" class="action-queue-display">
        <div class="queue-header">
          <span class="queue-title">最近操作</span>
          <button @click="clearActionQueue" class="clear-queue-btn" title="清空记录">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="queue-actions">
          <div
            v-for="(action, index) in actionQueue.pendingActions"
            :key="action.id"
            class="queue-action-item"
          >
            <span class="action-text">{{ action.description }}</span>
            <div class="action-controls">
              <button
                @click="removeActionFromQueue(index)"
                class="remove-action-btn"
                :title="isUndoableAction(action) ? '撤回并恢复' : '删除此动作'"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="input-wrapper">
        <!-- 隐藏的文件选择器 -->
        <input
          type="file"
          ref="imageInputRef"
          @change="handleImageSelect"
          multiple
          accept="image/*"
          style="display: none"
        />

        <!-- 图片上传按钮 -->
        <button
          @click="openImagePicker"
          class="action-selector-btn image-upload-btn"
          :disabled="!hasActiveCharacter"
          title="上传图片"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>

        <button
          @click="showActionSelector"
          class="action-selector-btn"
          :disabled="!hasActiveCharacter"
          title="快捷行动"
        >
          <ChevronDown :size="16" />
        </button>

        <div class="input-container">
          <!-- 图片预览区域 -->
          <div v-if="selectedImages.length > 0" class="image-preview-container">
            <div
              v-for="(image, index) in selectedImages"
              :key="index"
              class="image-preview-item"
            >
              <img :src="getImagePreviewUrl(image)" :alt="image.name" />
              <button @click="removeImage(index)" class="remove-image-btn" title="移除图片">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <textarea
            v-model="inputText"
            @focus="isInputFocused = true"
            @blur="isInputFocused = false"
            @keydown="handleKeyDown"
            @input="handleInput"
            :placeholder="hasActiveCharacter ? '请输入您的选择或行动...' : '请先选择角色...'"
            class="game-input"
            ref="inputRef"
            rows="1"
            wrap="soft"
            :disabled="!hasActiveCharacter || isAIProcessing"
          ></textarea>

          <!-- 流式传输选项在输入框内部右侧 -->
          <label class="stream-toggle-inside">
            <input type="checkbox" v-model="useStreaming" />
            <span class="label-text">流式</span>
          </label>
        </div>

        <button
          @click="sendMessage"
          :disabled="!inputText.trim() || isAIProcessing || !hasActiveCharacter"
          class="send-button"
        >
          <Loader2 v-if="isAIProcessing" :size="16" class="animate-spin" />
          <Send v-else :size="16" />
        </button>
      </div>

      <!-- 行动选择弹窗 -->
      <div v-if="showActionModal" class="action-modal-overlay" @click.self="hideActionSelector">
        <div class="action-modal">
          <div class="modal-header">
            <h3>快捷行动</h3>
            <button @click="hideActionSelector" class="close-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="action-grid">
            <button
              v-for="action in flatActions"
              :key="action.name"
              @click="selectAction(action)"
              class="quick-action-btn"
              :class="action.type"
            >
              <div class="action-icon">{{ action.icon }}</div>
              <div class="action-text">{{ action.name }}</div>
            </button>
          </div>
        </div>
      </div>

      <!-- 行动配置弹窗 -->
      <div v-if="selectedAction" class="action-config-overlay" @click.self="cancelAction">
        <div class="action-config-modal">
          <div class="config-header">
            <h3>{{ selectedAction.icon }} {{ selectedAction.name }}</h3>
            <button @click="cancelAction" class="close-btn">×</button>
          </div>
          <div class="config-content">
            <p class="action-description">{{ selectedAction.description }}</p>

            <!-- 时间配置 -->
            <div v-if="selectedAction.timeRequired" class="config-section">
              <label class="config-label">修炼时间</label>
              <div class="time-selector">
                <button
                  v-for="timeOption in timeOptions"
                  :key="timeOption.value"
                  @click="selectedTime = timeOption.value"
                  class="time-btn"
                  :class="{ active: selectedTime === timeOption.value }"
                >
                  {{ timeOption.label }}
                </button>
              </div>
              <div class="time-custom">
                <label>自定义：</label>
                <input
                  v-model.number="customTime"
                  type="number"
                  min="1"
                  max="365"
                  class="time-input"
                /> 天
              </div>
            </div>

            <!-- 其他配置选项 -->
            <div v-if="selectedAction.options" class="config-section">
              <label class="config-label">选项</label>
              <div class="action-options">
                <label
                  v-for="option in selectedAction.options"
                  :key="option.key"
                  class="option-item"
                >
                  <input
                    type="radio"
                    :name="'option-' + selectedAction.name"
                    :value="option.key"
                    v-model="selectedOption"
                  />
                  <span>{{ option.label }}</span>
                </label>
              </div>
            </div>
          </div>
          <div class="config-actions">
            <button @click="cancelAction" class="cancel-btn">取消</button>
            <button @click="confirmAction" class="confirm-btn">确认</button>
          </div>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { checkCharacterDeath } from '@/utils/judgement/heavenlyRules';
import { ref, onMounted, onActivated, nextTick, computed, watch } from 'vue';
import {
  Send, Loader2, ChevronDown, ChevronRight, ScrollText, RotateCcw
} from 'lucide-vue-next';
import { useCharacterStore } from '@/stores/characterStore';
import { useActionQueueStore } from '@/stores/actionQueueStore';
import { useUIStore } from '@/stores/uiStore';
import { panelBus } from '@/utils/panelBus';
import { useQuestStore } from '@/stores/questStore';
import { EnhancedActionQueueManager } from '@/utils/enhancedActionQueue';
import { AIBidirectionalSystem, getTavernHelper } from '@/utils/AIBidirectionalSystem';
import { toast } from '@/utils/toast';
import FormattedText from '@/components/common/FormattedText.vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import { formatGameTimeString } from '@/utils/formatters';
import type { GameMessage, CharacterProfile } from '@/types/game';
import type { GM_Response } from '@/types/AIGameMaster'; // AIGameMaster.d.ts 仍然需要保留

// 定义状态变更日志类型
interface StateChangeLog {
  changes: Array<{
    key: string;
    action: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
}


// --- 计算属性：从当前叙述中安全地获取状态变更列表 ---
const currentNarrativeStateChanges = computed(() => {
  return currentNarrative.value?.stateChanges?.changes || [];
});


// 🔥 使用 uiStore 持久化输入框内容
const inputText = computed({
  get: () => uiStore.userInputText,
  set: (value: string) => { uiStore.userInputText = value; }
});
const isInputFocused = ref(false);
const isAIProcessing = ref(false);
const inputRef = ref<HTMLTextAreaElement>();
const contentAreaRef = ref<HTMLDivElement>();
const memoryExpanded = ref(false);
const showMemorySection = ref(true);

// 切换记忆面板
const toggleMemory = () => {
  memoryExpanded.value = !memoryExpanded.value;
};

// AI处理状态持久化 - 在面板切换时保持等待状态
const persistAIProcessingState = () => {
  if (isAIProcessing.value) {
    sessionStorage.setItem('ai-processing-state', 'true');
    sessionStorage.setItem('ai-processing-timestamp', Date.now().toString());
  } else {
    sessionStorage.removeItem('ai-processing-state');
    sessionStorage.removeItem('ai-processing-timestamp');
  }
};

// 恢复AI处理状态
const restoreAIProcessingState = () => {
  const saved = sessionStorage.getItem('ai-processing-state');
  const timestamp = sessionStorage.getItem('ai-processing-timestamp');
  const TIMEOUT_DURATION = 2 * 60 * 1000; // 2分钟超时

  if (saved === 'true' && timestamp) {
    const elapsed = Date.now() - parseInt(timestamp);
    // 如果超过2分钟，认为已超时，清除状态
    if (elapsed < TIMEOUT_DURATION) {
      isAIProcessing.value = true;
      console.log('[状态恢复] 恢复AI处理状态');

      // 2分钟后自动清除状态
      setTimeout(() => {
        if (isAIProcessing.value) {
          console.log('[状态恢复] AI处理超时，自动清除状态');
          forceResetAIProcessingState();
        }
      }, TIMEOUT_DURATION - elapsed); // 从剩余时间开始计时
    } else {
      console.log('[状态恢复] AI处理状态已超时，清除状态');
      sessionStorage.removeItem('ai-processing-state');
      sessionStorage.removeItem('ai-processing-timestamp');
      isAIProcessing.value = false;
    }
  }
};

// 监听AI处理状态变化
watch(isAIProcessing, persistAIProcessingState);

// 强制清除AI处理状态的方法
const forceResetAIProcessingState = () => {
  console.log('[强制重置] 清除AI处理状态和会话存储');
  isAIProcessing.value = false;
  sessionStorage.removeItem('ai-processing-state');
  sessionStorage.removeItem('ai-processing-timestamp');
  streamingMessageIndex.value = null;
  streamingContent.value = '';
  toast.info('AI处理状态已重置');
};


// 行动选择相关
const showActionModal = ref(false);
const selectedAction = ref<ActionItem | null>(null);
const selectedTime = ref(1);
const customTime = ref(1);
const selectedOption = ref('');

// 行动类型定义
interface ActionItem {
  name: string;
  icon: string;
  type: string;
  description: string;
  timeRequired?: boolean;
  options?: Array<{ key: string; label: string }>;
}

const characterStore = useCharacterStore();
const actionQueue = useActionQueueStore();
const uiStore = useUIStore();
const gameStateStore = useGameStateStore();
const questStore = useQuestStore();
const enhancedActionQueue = EnhancedActionQueueManager.getInstance();
const bidirectionalSystem = AIBidirectionalSystem;

// 流式输出状态
const streamingMessageIndex = ref<number | null>(null);
const streamingContent = ref('');
const useStreaming = ref(true);
const streamingCharCount = computed(() => streamingContent.value.length);

// 图片上传相关
const selectedImages = ref<File[]>([]);
const imageInputRef = ref<HTMLInputElement>();

// 打开图片选择器
const openImagePicker = () => {
  imageInputRef.value?.click();
};

// 处理图片选择
const handleImageSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const newFiles = Array.from(target.files);
    selectedImages.value.push(...newFiles);
    console.log('[图片上传] 已选择图片:', newFiles.length, '张');
    toast.success(`已选择 ${newFiles.length} 张图片`);
  }
};

// 移除已选择的图片
const removeImage = (index: number) => {
  selectedImages.value.splice(index, 1);
  toast.info('已移除图片');
};

// 清空所有图片
const clearImages = () => {
  selectedImages.value = [];
  if (imageInputRef.value) {
    imageInputRef.value.value = '';
  }
};

// 获取图片预览 URL
const getImagePreviewUrl = (file: File): string => {
  return URL.createObjectURL(file);
};


// gameMessages 数组将被移除，currentNarrative 成为显示内容的唯一来源
// const gameMessages = ref<GameMessage[]>([]);

// --- 移除旧的变量更新面板逻辑 ---
// const variableUpdatesExpanded = ref(false);
// const toggleVariableUpdates = () => { ... };


// 🔥 [修复] 标记为意图未使用的工具函数（保留供将来使用）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '空';
  }

  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }

  if (typeof value === 'number') {
    if (value >= 10000) return `${(value / 10000).toFixed(1)}万`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}千`;
    return value.toString();
  }

  if (typeof value === 'string') {
    if (value.length === 0) return '空字符串';
    if (value.length > 50) return `${value.substring(0, 47)}...`;
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '空数组';
    if (value.length <= 3) return `[${value.map(v => formatValue(v)).join(', ')}]`;
    return `[${value.length}项数组]`;
  }

  if (typeof value === 'object' && value !== null) {
    const valAsRecord = value as Record<string, unknown>;
    if (typeof valAsRecord['当前'] === 'number' && typeof valAsRecord['最大'] === 'number') {
      return `${valAsRecord['当前']} / ${valAsRecord['最大']}`;
    }

    const keys = Object.keys(value);
    if (keys.length === 0) return '空对象';

    const jsonString = JSON.stringify(value);
    if (jsonString.length > 50) {
      return `${jsonString.substring(0, 47)}...`;
    }
    return jsonString;
  }

  return String(value);
};

// 显示状态变更详情
const showStateChanges = (log: StateChangeLog | undefined) => {
  if (!log || !log.changes || log.changes.length === 0) {
    toast.info('本次对话无变更记录');
    return;
  }
  // [核心改造] 调用 uiStore 中新的方法来打开专属的 StateChangeViewer 弹窗
  uiStore.openStateChangeViewer(log);
};

// 当前显示的叙述内容（只显示最新的AI回复）
const currentNarrative = ref<GameMessage | null>(null);
const latestMessageText = ref<string | null>(null); // 用于存储单独的text部分

// 短期记忆设置 - 可配置
const maxShortTermMemories = ref(3); // 默认3条，避免token过多
const maxMidTermMemories = ref(25); // 默认25条触发阈值
const midTermKeepCount = ref(8); // 默认保留8条最新的中期记忆
// 长期记忆无限制，不设上限

// 从设置加载记忆配置
const loadMemorySettings = async () => {
  try {
    // 🔥 [新架构] 直接从 localStorage 读取配置
    // 配置信息不需要存储在酒馆变量中
    const memorySettings = localStorage.getItem('memory-settings');
    if (memorySettings) {
      const settings = JSON.parse(memorySettings);
      if (settings.maxShortTerm) maxShortTermMemories.value = settings.maxShortTerm;
      if (settings.maxMidTerm) maxMidTermMemories.value = settings.maxMidTerm;
      if (settings.midTermKeep) midTermKeepCount.value = settings.midTermKeep;
      console.log('[记忆设置] 已从localStorage加载配置:', {
        短期记忆上限: maxShortTermMemories.value,
        中期记忆触发阈值: maxMidTermMemories.value,
        中期记忆保留数量: midTermKeepCount.value
      });
    }
  } catch (error) {
    console.warn('[记忆设置] 加载配置失败，使用默认值:', error);
  }
};

// 保存记忆配置
const saveMemorySettings = () => {
  try {
    const settings = {
      maxShortTerm: maxShortTermMemories.value,
      maxMidTerm: maxMidTermMemories.value
    };
    localStorage.setItem('memory-settings', JSON.stringify(settings));
    console.log('[记忆设置] 已保存配置:', settings);
  } catch (error) {
    console.warn('[记忆设置] 保存配置失败:', error);
  }
};

// 更新记忆配置的外部接口
const updateMemorySettings = (shortTerm?: number, midTerm?: number) => {
  if (shortTerm !== undefined && shortTerm > 0) {
    maxShortTermMemories.value = shortTerm;
  }
  if (midTerm !== undefined && midTerm > 0) {
    maxMidTermMemories.value = midTerm;
  }
  saveMemorySettings();
  console.log('[记忆设置] 配置已更新:', {
    短期记忆上限: maxShortTermMemories.value,
    中期记忆上限: maxMidTermMemories.value
  });
};

// 暴露给父组件（如果需要）
defineExpose({
  updateMemorySettings,
  getMemorySettings: () => ({
    maxShortTerm: maxShortTermMemories.value,
    maxMidTerm: maxMidTermMemories.value
  })
});

// 计算属性：检查是否有激活的角色
const hasActiveCharacter = computed(() => !!gameStateStore.character);

// 计算属性：角色名称
const characterName = computed(() => {
  return gameStateStore.character?.名字 || '无名道友';
});

// 计算属性：是否可以回滚
const canRollback = computed(() => {
  const profile = characterStore.activeCharacterProfile;
  if (!profile || profile.模式 !== '单机') return false;
  const lastConversation = profile.存档列表?.['上次对话'];
  return lastConversation?.存档数据 !== null && lastConversation?.存档数据 !== undefined;
});

// 回滚到上次对话
const rollbackToLastConversation = async () => {
  if (!canRollback.value) {
    toast.warning('没有可回滚的存档');
    return;
  }

  uiStore.showRetryDialog({
    title: '回滚确认',
    message: '确定要回滚到上次对话前的状态吗？当前进度将被替换。',
    confirmText: '确认回滚',
    cancelText: '取消',
    onConfirm: async () => {
      try {
        await characterStore.rollbackToLastConversation();
        toast.success('已回滚到上次对话前的状态');
      } catch (error) {
        console.error('回滚失败:', error);
        toast.error(`回滚失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    },
    onCancel: () => {}
  });
};

// 扁平化的行动列表，用于简化UI显示
const flatActions = computed(() => {
  const actions: ActionItem[] = [];
  actionCategories.value.forEach(category => {
    actions.push(...category.actions);
  });
  return actions;
});

// 时间选项
const timeOptions = ref([
  { label: '1天', value: 1 },
  { label: '3天', value: 3 },
  { label: '7天', value: 7 },
  { label: '30天', value: 30 }
]);

// 行动分类数据
const actionCategories = ref([
  {
    name: '修炼',
    icon: '',
    actions: [
      {
        name: '基础修炼',
        icon: '',
        type: 'cultivation',
        description: '进行基础的修为修炼，提升境界',
        timeRequired: true
      },
      {
        name: '炼体',
        icon: '',
        type: 'cultivation',
        description: '锻炼肉身，增强体质',
        timeRequired: true
      },
      {
        name: '冥想',
        icon: '',
        type: 'cultivation',
        description: '静心冥想，稳固心境',
        timeRequired: true
      }
    ]
  },
  {
    name: '探索',
    icon: '',
    actions: [
      {
        name: '野外探索',
        icon: '',
        type: 'exploration',
        description: '前往野外探索，寻找机缘',
        options: [
          { key: 'nearby', label: '附近区域' },
          { key: 'far', label: '远方区域' },
          { key: 'dangerous', label: '危险区域' }
        ]
      },
      {
        name: '城镇逛街',
        icon: '',
        type: 'exploration',
        description: '在城镇中闲逛，了解信息',
        options: [
          { key: 'market', label: '集市' },
          { key: 'tavern', label: '酒楼' },
          { key: 'shop', label: '商铺' }
        ]
      }
    ]
  },
  {
    name: '交流',
    icon: '',
    actions: [
      {
        name: '拜访朋友',
        icon: '',
        type: 'social',
        description: '拜访认识的朋友',
        options: [
          { key: 'random', label: '随机拜访' },
          { key: 'close', label: '亲密朋友' }
        ]
      },
      {
        name: '结交新友',
        icon: '',
        type: 'social',
        description: '主动结交新的朋友'
      }
    ]
  },
  {
    name: '其他',
    icon: '',
    actions: [
      {
        name: '休息',
        icon: '',
        type: 'other',
        description: '好好休息，恢复精神',
        timeRequired: true
      },
      {
        name: '查看状态',
        icon: '',
        type: 'other',
        description: '查看当前的详细状态'
      }
    ]
  }
]);

// 行动选择器函数
const showActionSelector = () => {
  showActionModal.value = true;
};

const hideActionSelector = () => {
  showActionModal.value = false;
};

const selectAction = (action: ActionItem) => {
  selectedAction.value = action;
  showActionModal.value = false;

  // 重置选择
  selectedTime.value = 1;
  customTime.value = 1;
  selectedOption.value = '';

  // 如果不需要配置，直接执行
  if (!action.timeRequired && !action.options) {
    confirmAction();
  }
};

const cancelAction = () => {
  selectedAction.value = null;
  selectedTime.value = 1;
  customTime.value = 1;
  selectedOption.value = '';
};

const confirmAction = () => {
  if (!selectedAction.value) return;

  let actionText = selectedAction.value.name;

  // 添加时间信息
  if (selectedAction.value.timeRequired) {
    const time = customTime.value > 0 ? customTime.value : selectedTime.value;
    actionText += `（${time}天）`;
  }

  // 添加选项信息
  if (selectedOption.value && selectedAction.value.options) {
    const option = selectedAction.value.options.find(opt => opt.key === selectedOption.value);
    if (option) {
      actionText += `（${option.label}）`;
    }
  }

  // 填充到输入框
  inputText.value = actionText;

  // 清理状态
  cancelAction();

  // 聚焦输入框
  nextTick(() => {
    inputRef.value?.focus();
  });
};

// 移除中期记忆临时数组，防止数据丢失
// const midTermMemoryBuffer = ref<string[]>([]);

// 短期记忆获取 - 直接从 gameStateStore 中获取
const recentMemories = computed(() => {
  if (gameStateStore.memory?.短期记忆) {
    return gameStateStore.memory.短期记忆.slice(0, maxShortTermMemories.value);
  }
  return [];
});

// AI响应结构验证
const validateAIResponse = (response: unknown): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!response) {
    errors.push('AI响应为空');
    return { isValid: false, errors };
  }

  // 类型断言，确保response是对象
  const resp = response as Record<string, unknown>;

  // 检查基本结构
  if (!resp.text || typeof resp.text !== 'string') {
    errors.push('缺少有效的text字段');
  }

  // 检查mid_term_memory字段（必须）
  if (!resp.mid_term_memory || typeof resp.mid_term_memory !== 'string') {
    errors.push('缺少必要的mid_term_memory字段（中期记忆总结）');
  } else if (resp.mid_term_memory.trim().length === 0) {
    errors.push('mid_term_memory字段不能为空');
  }

  // 检查tavern_commands字段（可选）
  if (resp.tavern_commands) {
    if (!Array.isArray(resp.tavern_commands)) {
      errors.push('tavern_commands字段必须是数组');
    } else {
      // 检查每个命令的基本结构
      resp.tavern_commands.forEach((cmd: unknown, index: number) => {
        const command = cmd as Record<string, unknown>;
        if (!cmd || typeof cmd !== 'object') {
          errors.push(`tavern_commands[${index}]不是有效对象`);
        } else if (!command.action || !command.key) {
          errors.push(`tavern_commands[${index}]缺少必要字段(action/key)`);
        }
      });
    }
  }

  return { isValid: errors.length === 0, errors };
};

// 重新请求AI响应（当结构验证失败时）
const retryAIResponse = async (
  userMessage: string,
  character: CharacterProfile,
  gameState: Record<string, unknown>,
  previousErrors: string[],
  maxRetries: number = 2
): Promise<Record<string, unknown> | null> => {
  console.log('[AI响应重试] 开始重试，之前的错误:', previousErrors);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[AI响应重试] 第${attempt}次尝试`);

      // 在用户消息中添加结构要求
      const enhancedMessage = `${userMessage}

## 输出格式（必须严格遵守）

**重要：以下3个字段都是必需的，缺一不可！**

{
  "text": "Narrative text(中文简体，字数越多越好1000-3000，往用户趋向去尝试行动)",
  "mid_term_memory": "Brief summary",
  "tavern_commands": [{"action": "Action", "key": "key.path", "value": Value/List}]
}

下面为tavern_commands的行动命令类型

# Action Types

| Action | Purpose | Example |
|--------|---------|---------|
| set | Replace/Set | Update state |
| add | Increase/Decrease | Change numerical values |
| push | Add to array | Record history |
| delete | Remove field | Clear data |
| pull | Remove from array | Remove array element |

---


上次响应的问题：${previousErrors.join(', ')}
请修正这些问题并确保结构正确。`;

      const aiResponse = await bidirectionalSystem.processPlayerAction(
        enhancedMessage,
        character,
        gameState,
        {
          onProgressUpdate: (progress: string) => {
            console.log('[AI重试进度]', progress);
          }
        }
      );

      if (aiResponse.gmResponse) {
        const validation = validateAIResponse(aiResponse.gmResponse);
        if (validation.isValid) {
          console.log(`[AI响应重试] 第${attempt}次尝试成功`);
          return aiResponse;
        } else {
          console.warn(`[AI响应重试] 第${attempt}次尝试验证失败:`, validation.errors);
          previousErrors = validation.errors;
        }
      }
    } catch (error) {
      console.error(`[AI响应重试] 第${attempt}次尝试出错:`, error);
    }
  }

  console.error('[AI响应重试] 所有重试尝试都失败了');
  return null;
};


const handleStreamingResponse = (chunk: string) => {
  if (streamingMessageIndex.value !== null) {
    streamingContent.value += chunk;
    // 自动滚动到底部
    nextTick(() => {
      if (contentAreaRef.value) {
        contentAreaRef.value.scrollTop = contentAreaRef.value.scrollHeight;
      }
    });
  }
};

// 检查动作是否可撤回
const isUndoableAction = (action: { type?: string }): boolean => {
  if (!action.type) return false;
  // NPC交互类操作不支持撤回，只能删除
  const npcInteractionTypes = ['npc_trade', 'npc_request', 'npc_steal'];
  if (npcInteractionTypes.includes(action.type)) {
    return false;
  }
  // 其他操作支持撤回
  return ['equip', 'unequip', 'use', 'cultivate'].includes(action.type);
};

// 动作队列管理方法
const clearActionQueue = async () => {
  actionQueue.clearActions();
  toast.success('操作记录已清空');
};

const removeActionFromQueue = async (index: number) => {
  if (index >= 0 && index < actionQueue.pendingActions.length) {
    const action = actionQueue.pendingActions[index];

    // NPC交互类操作不支持撤回，只能删除
    const npcInteractionTypes = ['npc_trade', 'npc_request', 'npc_steal'];
    if (action.type && npcInteractionTypes.includes(action.type)) {
      actionQueue.removeAction(action.id);
      toast.success('已移除NPC交互动作');
      return;
    }

    // 如果是装备、卸下、使用或修炼类操作，尝试按名称精准撤回
    if (action.type && ['equip', 'unequip', 'use', 'cultivate'].includes(action.type) && action.itemName) {
      const success = await enhancedActionQueue.undoByItemName(action.type as 'equip' | 'unequip' | 'use' | 'cultivate', action.itemName);
      if (success) {
        toast.success('已撤回并恢复');
        return;
      }
    }

    // 普通删除操作
    actionQueue.removeAction(action.id);
    toast.success('已移除动作');
  }
};

// 发送消息给AI（优化版）
const sendMessage = async () => {
  if (!inputText.value.trim()) return;
  if (isAIProcessing.value) {
    toast.warning('AI正在处理中，请稍等...');
    return;
  }
  if (!hasActiveCharacter.value) {
    toast.error('请先选择或创建角色');
    return;
  }

  // 检查角色死亡状态
  const saveData = gameStateStore.toSaveData();
  if (saveData) {
    const deathStatus = checkCharacterDeath(saveData);
    if (deathStatus.isDead) {
      toast.error(`角色已死亡：${deathStatus.deathReason}。无法继续游戏，请重新开始或复活角色。`);
      currentNarrative.value = {
        type: 'system',
        content: `【死亡提示】${characterName.value}已经死亡（${deathStatus.deathReason}），修仙之路戛然而止。若要继续游戏，请选择其他角色或重新开始。`,
        time: formatCurrentTime(),
        stateChanges: { changes: [] }
      };
      return;
    }
  }

  const userMessage = inputText.value.trim();

  // 🔥 在发送消息之前，保存当前状态到"上次对话"
  try {
    // 备份当前状态到"上次对话"存档（用于重roll）
    const currentProfile = characterStore.activeCharacterProfile;
    if (currentProfile?.模式 === '单机' && currentProfile.存档列表) {
      const currentSlot = characterStore.activeSaveSlot;
      if (currentSlot?.存档数据) {
        const now = new Date().toISOString();
        currentProfile.存档列表['上次对话'] = {
          存档名: '上次对话',
          保存时间: currentProfile.存档列表['上次对话']?.保存时间 || now,
          最后保存时间: now,
          游戏内时间: currentSlot.游戏内时间,
          角色名字: currentSlot.角色名字,
          境界: currentSlot.境界,
          位置: currentSlot.位置,
          修为进度: currentSlot.修为进度,
          世界地图: currentSlot.世界地图,
          存档数据: JSON.parse(JSON.stringify(currentSlot.存档数据))
        };
        await characterStore.commitMetadataToStorage();
        console.log('[上次对话] 已备份当前状态，时间:', now);
      }
    }
  } catch (error) {
    console.warn('[上次对话] 备份失败（非致命）:', error);
  }

  // 获取动作队列中的文本
  const actionQueueText = actionQueue.getActionPrompt();

  // 🔥 用户输入外层包裹格式化标签
  const formattedUserMessage = userMessage ? `<用户行动趋向>${userMessage}</用户行动趋向>` : '';

  // 将格式化后的用户输入和动作队列文本合并
  const finalUserMessage = actionQueueText ?
    `${formattedUserMessage}${actionQueueText}` :
    formattedUserMessage;

  // 清空动作队列（动作已经添加到消息中）
  if (actionQueueText) {
    actionQueue.clearActions();
  }

  // 重置输入框高度
  nextTick(() => {
    adjustTextareaHeight();
  });

  // 用户消息只作为行动趋向提示词，不添加到记忆中
  isAIProcessing.value = true;

  // 强制清空当前叙述，为流式响应或等待动画做准备，彻底避免内容重叠
  currentNarrative.value = null;
  streamingContent.value = ''; // 重置流式内容
  streamingMessageIndex.value = 1; // 设置一个虚拟索引以启用流式处理

  try {
    // 获取当前角色
    const character = characterStore.activeCharacterProfile;

    if (!character) {
      throw new Error('角色数据缺失');
    }

    // 用户消息不存储到记忆，只作为行动提示词使用
    // 移除: await addToShortTermMemory(userMessage, 'user');

    // 不再使用 gameMessages，直接准备 currentNarrative
    currentNarrative.value = {
      type: 'ai',
      content: '',
      time: formatCurrentTime(),
      stateChanges: { changes: [] }
    };

    // 使用优化的AI请求系统进行双向交互
    let aiResponse: Record<string, unknown> | null = null;

    try {
      const options: Record<string, unknown> = {
        onProgressUpdate: (progress: string) => {
          console.log('[AI进度]', progress);
        }
      };
      if (useStreaming.value) {
        options.onStreamChunk = handleStreamingResponse;
        options.useStreaming = true;
      }
      // 添加图片上传支持
      if (selectedImages.value.length > 0) {
        options.image = selectedImages.value;
        console.log('[图片上传] 将发送', selectedImages.value.length, '张图片');
      }

      // 在AI调用前计算并同步天道系统
      const baseInfo = gameStateStore.character;
      const currentSaveData = gameStateStore.toSaveData();
      if (currentSaveData && baseInfo) {
        const { syncHeavenlyPrecalcToTavern } = await import('@/utils/judgement/heavenlyRules');
        await syncHeavenlyPrecalcToTavern(currentSaveData, baseInfo);
        console.log('[天道系统] 已同步预计算数据到酒馆');
      }

      aiResponse = await bidirectionalSystem.processPlayerAction(
        finalUserMessage,
        character,
        {}, // gameState已移除，传空对象
        options
      );

      // 验证AI响应结构
      if (aiResponse.gmResponse) {
        const validation = validateAIResponse(aiResponse.gmResponse);
        if (!validation.isValid) {
          console.warn('[AI响应验证] 结构验证失败:', validation.errors);
          toast.warning('AI响应格式不正确，正在重试...');

          // 尝试重新生成
          const retryResponse = await retryAIResponse(
            finalUserMessage,
            character,
            {}, // gameState已移除，传空对象
            validation.errors
          );

          if (retryResponse) {
            aiResponse = retryResponse;
            // 注意：重试成功后不显示额外的toast，统一在最后显示"天道已回"
            console.log('[AI响应验证] 重试成功');
          } else {
            // 所有重试都失败了，中止处理
            throw new Error('AI响应格式错误，且多次重试失败');
          }
        }
      }


      // 完成流式输出 - 清除流式状态（但保持isAIProcessing为true直到所有处理完成）
      console.log('[流式输出] 完成，清除流式状态');
      streamingMessageIndex.value = null;
      streamingContent.value = ''; // 清空流式内容
      // 🔥 重要：不在这里设置 isAIProcessing = false，因为还有后续处理
      // 避免触发 watch 监听器过早更新 currentNarrative
      // isAIProcessing 会在 finally 块中统一设置为 false

      // --- 核心逻辑：整合最终文本并更新状态 ---
      let finalText = '';
      const gmResp = aiResponse.gmResponse as GM_Response | undefined;

      console.log('[AI响应处理] 开始处理AI响应文本');
      console.log('[AI响应处理] aiResponse:', aiResponse);
      console.log('[AI响应处理] gmResp:', gmResp);
      console.log('[AI响应处理] streamingContent:', streamingContent.value);

      // 优先从结构化响应中获取最准确的文本
      if (gmResp?.text && typeof gmResp.text === 'string') {
        finalText = gmResp.text;
        console.log('[AI响应处理] 使用 gmResponse.text 作为最终文本，长度:', finalText.length);
      } else if (aiResponse.finalContent && typeof aiResponse.finalContent === 'string') {
        finalText = aiResponse.finalContent;
        console.log('[AI响应处理] 使用 aiResponse.finalContent 作为最终文本，长度:', finalText.length);
      } else if (streamingContent.value) {
        // 如果以上都没有，使用流式输出的最终结果作为备用
        finalText = streamingContent.value;
        console.log('[AI响应处理] 使用 streamingContent 作为最终文本，长度:', finalText.length);
      } else {
        console.warn('[AI响应处理] 未找到任何有效的文本内容');
      }

      console.log('[AI响应处理] 最终文本内容预览:', finalText.substring(0, 100) + '...');

      // 如果最终有文本内容，先添加到记忆系统
      // 注意：必须在 syncFromTavern 之前执行，这样syncFromTavern可以保留本地记忆
      if (finalText) {
        console.log('[AI响应处理] 开始处理最终文本...');
        latestMessageText.value = gmResp?.text || null;

        // 统一内容格式：为AI回复添加时间前缀，确保UI、历史记录和记忆中的内容一致
        const gameTime = gameStateStore.gameTime;
        const timePrefix = gameTime ? formatGameTimeString(gameTime) : '【未知时间】';
        // 检查finalText是否已意外包含前缀，避免重复添加
        const hasExistingPrefix = finalText.startsWith('【仙道') || finalText.startsWith('【未知时间】');
        const prefixedContent = hasExistingPrefix ? finalText : `${timePrefix}${finalText}`;

        // 更新UI显示
        if (currentNarrative.value) {
          currentNarrative.value.content = prefixedContent;
          console.log('[AI响应处理] 已更新UI显示（使用带前缀内容）');
        }

        // 添加到短期记忆，并传递中期记忆总结（如果有）
        console.log('[AI响应处理] 准备将文本添加到短期记忆...');
        const midTermSummary = gmResp?.mid_term_memory && typeof gmResp.mid_term_memory === 'string'
          ? gmResp.mid_term_memory
          : undefined;
        // addToShortTermMemory 会自动处理前缀检查，直接传递即可
        await addToShortTermMemory(prefixedContent, 'assistant', midTermSummary);
        console.log('[AI响应处理] 最终文本已添加到短期记忆，文本长度:', prefixedContent.length);
      } else {
        latestMessageText.value = null;
        console.error('[AI响应处理] 没有找到有效的文本内容，跳过记忆保存');
      }

      // 🔥 核心修复：记忆数据已在本地处理完毕，直接保存即可
      // processGmResponse 已经执行了 tavern_commands 并同步到酒馆
      // 不需要再次 syncFromTavern，避免用酒馆旧数据覆盖本地新数据
      console.log('[数据同步] ⚠️ 跳过 syncFromTavern（命令已在processGmResponse中同步）');

      // 🔥 [新架构] 跳过记忆同步到酒馆
      // 记忆已经在 Pinia Store 的 saveData 中，AI 会在 prompt 中接收到完整记忆
      console.log('[记忆同步] ⚠️ 跳过记忆同步到酒馆（新架构使用 Pinia + prompt 传递）');

    // 处理游戏状态更新（仅在有有效AI响应时执行）
    if (aiResponse && aiResponse.stateChanges) {
      // 先清空上一次的日志（在收到新响应时清空，而不是发送消息时）
      uiStore.clearCurrentMessageStateChanges();
      console.log('[日志清空] 收到新响应，已清空上一条消息的状态变更日志');

      // 🔥 [新架构] AI指令已在 AIBidirectionalSystem.processGmResponse 中执行完毕
      // gameStateStore 已包含最新数据，无需再次调用 updateCharacterData

      // 确保 stateChanges 有 changes 数组
      const stateChanges: StateChangeLog = (
        aiResponse.stateChanges &&
        typeof aiResponse.stateChanges === 'object' &&
        'changes' in aiResponse.stateChanges
      )
        ? aiResponse.stateChanges as StateChangeLog
        : { changes: [] };
      console.log('[状态更新] AI指令已执行，状态变更数量:', stateChanges.changes.length);

      // 将状态变更附加到当前叙述上
      if (currentNarrative.value) {
        currentNarrative.value.stateChanges = aiResponse.stateChanges as StateChangeLog;

        // 保存到叙事历史（只保留最新一条，用于页面恢复）
        if (gameStateStore.isGameLoaded) {
          // 叙事历史只保留最新一条对话（用于切换页面后恢复）
          const latestNarrative = {
            type: currentNarrative.value.type,
            content: currentNarrative.value.content,
            time: currentNarrative.value.time,
            stateChanges: currentNarrative.value.stateChanges
          };

          if (gameStateStore.narrativeHistory) {
            gameStateStore.narrativeHistory = [latestNarrative];
          }


          // TODO: 触发 gameStateStore 的保存机制
          // gameStateStore.saveGame();
        }
      }

      // 将新的状态变更保存到 uiStore 的内存中（会覆盖之前的）
      uiStore.setCurrentMessageStateChanges(aiResponse.stateChanges);
      console.log('[日志面板] State changes received and stored in memory:', aiResponse.stateChanges);

      // 检查角色死亡状态（在状态更新后）
      const currentSaveData = gameStateStore.toSaveData();
      if (currentSaveData) {
        const deathStatus = checkCharacterDeath(currentSaveData);
        if (deathStatus.isDead) {
          // 如果死亡，用死亡信息覆盖当前叙述
          currentNarrative.value = {
            type: 'system',
            content: `【死亡通知】${characterName.value}在此次行动中不幸死亡（${deathStatus.deathReason}）。修仙路断，生命已逝。`,
            time: formatCurrentTime(),
            stateChanges: { changes: [] }
          };
          toast.error(`角色已死亡：${deathStatus.deathReason}`);
        }
      }
    } else if (aiResponse) {
      console.log('[日志面板] No state changes received in this response.');
    }

    } catch (aiError) {
      console.error('[AI处理失败]', aiError);

      // 清理流式输出状态
      streamingMessageIndex.value = null;
      streamingContent.value = '';

      // 清除AI处理状态
      isAIProcessing.value = false;
      persistAIProcessingState();

      // 显示失败弹窗，明确告知用户生成失败
      const errorMessage = aiError instanceof Error ? aiError.message : '未知错误';
      toast.error(`AI生成失败：${errorMessage}`, {
        duration: 5000
      });

      // 设置当前叙述为错误消息
      currentNarrative.value = {
        type: 'system',
        content: `【生成失败】天道感应中断，未能生成有效回应。原有游戏状态未发生任何变化，请重新尝试。`,
        time: formatCurrentTime(),
        stateChanges: { changes: [] }
      };

      // 重要：不设置任何响应对象，确保后续处理跳过
      aiResponse = null;
    }

    // 系统消息直接覆盖当前叙述
    if (aiResponse && aiResponse.systemMessages && Array.isArray(aiResponse.systemMessages) && aiResponse.systemMessages.length > 0) {
      currentNarrative.value = {
        type: 'system',
        content: aiResponse.systemMessages.join('\n'),
        time: formatCurrentTime(),
        stateChanges: { changes: [] }
      };
    }

    // 成功的提示
    if (aiResponse) {
      toast.success('天机重现');

      // 清空已发送的图片
      clearImages();
      // 🔥 用户要求：保留输入框内容，不清空
      // inputText.value = '';


      // 明确清除AI处理状态(成功路径)
      console.log('[AI响应处理] 成功完成,清除AI处理状态');
      isAIProcessing.value = false;
      persistAIProcessingState();

    }

  } catch (error: unknown) {
    console.error('[AI交互] 处理失败:', error);

    // 清理流式输出状态
    streamingMessageIndex.value = null;
    streamingContent.value = '';

    // 设置当前叙述为错误消息
    currentNarrative.value = {
      type: 'system',
      content: `【天道无应】${error instanceof Error ? error.message : '修仙路上遇到了未知阻碍'}`,
      time: formatCurrentTime(),
      stateChanges: { changes: [] }
    };

    toast.error('天道无应，请稍后再试');
  } finally {
    isAIProcessing.value = false;
    // 清除状态持久化
    persistAIProcessingState();
    // 最终统一存档
    try {
      console.log('[AI响应处理] 最终统一存档...');
      await characterStore.saveCurrentGame();
      const slot = characterStore.activeSaveSlot;
      if (slot) {
        toast.success(`存档【${slot.存档名}】已保存`);
      }
      console.log('[AI响应处理] 最终统一存档完成');
    } catch (storageError) {
      console.error('[AI响应处理] 最终统一存档失败:', storageError);
      toast.error('游戏存档失败，请尝试手动保存');
    }
  }
};

// 🔥 移除复杂的中期记忆缓存系统，改为直接处理
// 中期记忆现在直接在 AIBidirectionalSystem.ts 的 processGmResponse 中处理
const addToShortTermMemory = async (
content: string,
_role: 'user' | 'assistant' = 'assistant',  // eslint-disable-line @typescript-eslint/no-unused-vars
midTermSummary?: string  // AI生成的中期记忆总结
) => {
try {
  if (!gameStateStore.isGameLoaded || !gameStateStore.memory) {
    console.warn('[记忆管理] 游戏状态未加载，无法存储短期记忆');
    return;
  }

  const memory = gameStateStore.memory;

  // 确保记忆结构存在
  if (!Array.isArray(memory.短期记忆)) memory.短期记忆 = [];
  if (!Array.isArray(memory.中期记忆)) memory.中期记忆 = [];
  if (!Array.isArray(memory.长期记忆)) memory.长期记忆 = [];
  if (!Array.isArray(memory.隐式中期记忆)) memory.隐式中期记忆 = [];

  const gameTime = gameStateStore.gameTime;
  const timePrefix = gameTime ? formatGameTimeString(gameTime) : '【未知时间】';

  // 添加时间前缀
  const hasTimePrefix = content.startsWith('【仙道') || content.startsWith('【未知时间】') || content.startsWith('【仙历');
  const finalContent = hasTimePrefix ? content : `${timePrefix}${content}`;

  // 添加到短期记忆
  memory.短期记忆.unshift(finalContent);

  // 处理中期记忆
  if (midTermSummary?.trim()) {
    // 如果有显式的中期记忆总结，存入隐式中期记忆
    memory.隐式中期记忆.unshift(`${timePrefix}${midTermSummary}`);
  } else {
    // 否则，将叙述文本也存入隐式中期记忆
    const contentWithoutTime = hasTimePrefix ? content.substring(content.indexOf('】') + 1) : content;
    memory.隐式中期记忆.unshift(`${timePrefix}${contentWithoutTime}`);
  }

  // 检查短期记忆溢出
  if (memory.短期记忆.length > maxShortTermMemories.value) {
    const overflowCount = memory.短期记忆.length - maxShortTermMemories.value;
    for (let i = 0; i < overflowCount; i++) {
      memory.短期记忆.pop(); // 移除最旧的短期记忆
      const implicit = memory.隐式中期记忆.pop(); // 移除对应的隐式中期记忆
      if (implicit && !memory.中期记忆.includes(implicit)) {
        memory.中期记忆.unshift(implicit); // 转移到中期记忆
      }
    }

    // 检查中期记忆溢出
    if (memory.中期记忆.length > maxMidTermMemories.value) {
      await transferToLongTermMemory();
    }
  }

  console.log('[记忆管理] 记忆已更新到 gameStateStore');

} catch (error) {
  console.error('[记忆管理] 添加短期记忆失败:', error);
}
};

// transferToMidTermMemory 函数已被合并到 addToShortTermMemory 中，故移除

// 转移到长期记忆 - 直接操作 gameStateStore
const transferToLongTermMemory = async () => {
  try {
    console.log('[记忆管理] 开始转移到长期记忆');

    // 🔥 核心修复：直接从 gameStateStore 获取最新的记忆数据
    const memory = gameStateStore.memory;
    if (!memory || !memory.中期记忆) {
      console.warn('[记忆管理] gameStateStore 或中期记忆数据不可用，无法处理长期记忆转移');
      return;
    }

    // 计算需要总结的记忆数量 = 当前中期记忆数量 - 保留数量
    const memoriesToSummarizeCount = memory.中期记忆.length - midTermKeepCount.value;

    if (memoriesToSummarizeCount > 0) {
      // 从中期记忆的开头提取（并移除）最旧的记忆进行总结
      const oldMemories = memory.中期记忆.splice(0, memoriesToSummarizeCount);

      console.log(`[记忆管理] 提取了 ${oldMemories.length} 条中期记忆进行总结。剩余中期记忆: ${memory.中期记忆.length} 条`);

      // 生成长期记忆总结
      const summary = await generateLongTermSummary(oldMemories);
      if (summary) {
        // 确保长期记忆结构存在
        if (!memory.长期记忆) memory.长期记忆 = [];

        // 添加新的总结到长期记忆开头
        memory.长期记忆.unshift(summary);

        console.log(`[记忆管理] ✅ 成功总结并添加到长期记忆。长期记忆总数: ${memory.长期记忆.length} 条`);
        console.log(`[记忆管理] 长期记忆内容预览:`, summary.substring(0, 100));
        console.log(`[记忆管理] 完整长期记忆数组:`, memory.长期记忆);

        // 🔥 保存到 gameStateStore 和 IndexedDB
        // saveCurrentGame 会从 gameStateStore 读取最新数据并保存
        await characterStore.saveCurrentGame();
        console.log(`[记忆管理] ✅ 已保存中期记忆删除和长期记忆新增`);

      } else {
        console.warn('[记忆管理] ⚠️ 生成长期记忆总结失败，被移除的中期记忆已丢失:', oldMemories);
      }
    }
  } catch (error) {
    console.warn('[记忆管理] 转移长期记忆失败:', error);
  }
};


// 生成长期记忆总结
const generateLongTermSummary = async (memories: string[]): Promise<string | null> => {
  try {
    const helper = getTavernHelper();
    if (!helper) return null;

    // 构建纯粹的总结提示
    const memoriesToSummarize = memories.join('\n\n');

    const response = await helper.generateRaw({
      ordered_prompts: [
        {
          role: 'system',
          content: '你是记忆整理助手。将提供的多条记忆整理成一段连贯的总结。只输出总结内容，不要任何前言、后语或额外说明。'
        },
        {
          role: 'user',
          content: `请将以下记忆总结成一段连贯的文本：\n\n${memoriesToSummarize}`
        }
      ],
      use_world_info: false,
      should_stream: false
    });

    return (typeof response === 'string' ? response.trim() : null) || null;
  } catch (error) {
    console.warn('[记忆管理] 生成长期记忆总结失败:', error);
    return null;
  }
};

// （移除逐条总结逻辑）不再对溢出的短期记忆逐条生成总结

// 键盘事件处理
// 格式化当前时间
const formatCurrentTime = (): string => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};

// 自动调整输入框高度
const adjustTextareaHeight = () => {
  const textarea = inputRef.value;
  if (textarea) {
    // 单行基准高度（根据line-height计算）
    const lineHeight = 1.4; // 与CSS中的line-height一致
    const fontSize = 0.9; // rem
    const padding = 16; // 8px * 2
    const singleLineHeight = fontSize * 16 * lineHeight + padding; // 约36px

    // 计算所需高度
    textarea.style.height = `${singleLineHeight}px`; // 先设置为单行高度
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 120; // 与CSS中的max-height保持一致

    // 只有当内容超过单行时才增加高度
    if (scrollHeight > singleLineHeight) {
      const newHeight = Math.min(scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }

    // 如果内容超出最大高度，启用滚动
    if (scrollHeight > maxHeight) {
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  }
};

// 监听输入变化以调整高度
const handleInput = () => {
  nextTick(() => {
    adjustTextareaHeight();
  });
};

// 初始化/重新初始化面板以适应当前存档
const initializePanelForSave = async () => {
  console.log('[主面板] 为当前存档初始化面板 (新逻辑)...');
  try {
    if (hasActiveCharacter.value) {
      // 🔥 使用 gameStateStore 获取数据
      const memories = gameStateStore.memory?.短期记忆;

      console.log('[主面板-调试] 存档数据检查:', {
        有游戏数据: gameStateStore.isGameLoaded,
        有叙事历史: !!gameStateStore.narrativeHistory,
        叙事历史长度: gameStateStore.narrativeHistory?.length || 0,
        有短期记忆: !!memories,
        短期记忆长度: memories?.length || 0
      });

      // 优先从叙事历史中恢复最近的一条记录（包含stateChanges）
      if (gameStateStore.narrativeHistory && gameStateStore.narrativeHistory.length > 0) {
        const latestNarrative = gameStateStore.narrativeHistory[0];
        console.log('[主面板] 从叙事历史恢复最新叙述（含状态变更日志）');
        console.log('[主面板-调试] 叙事历史第一条:', {
          type: latestNarrative.type,
          内容长度: latestNarrative.content?.length || 0,
          有stateChanges: !!latestNarrative.stateChanges,
          changes数量: latestNarrative.stateChanges?.changes?.length || 0
        });

        currentNarrative.value = {
          type: latestNarrative.type,
          content: latestNarrative.content,
          time: latestNarrative.time,
          stateChanges: latestNarrative.stateChanges || { changes: [] }
        };
      } else if (memories && memories.length > 0) {
        // 回退：从记忆加载（旧版本存档，没有叙事历史）
        const initialMessageContent = memories[0];
        console.log('[主面板] 从记忆加载最新叙述:', initialMessageContent.substring(0, 100));

        currentNarrative.value = {
          type: 'gm',
          content: initialMessageContent,
          time: formatCurrentTime(),
          stateChanges: { changes: [] }, // 旧版本没有状态变更
        };

      } else {
        // 未找到记忆或叙事历史，显示欢迎信息
        console.log('[主面板] 未找到叙事记录，显示欢迎信息');
        const characterName = gameStateStore.character?.名字 || '修行者';
        currentNarrative.value = {
          type: 'system',
          content: `【欢迎】${characterName}，你的修仙之旅即将开始。请输入你的行动。`,
          time: formatCurrentTime(),
          stateChanges: { changes: [] },
        };
      }
      await syncGameState();
    } else {
      // 没有激活的角色
      currentNarrative.value = {
        type: 'system',
        content: '【提示】请先选择或创建角色开始游戏。',
        time: formatCurrentTime(),
        stateChanges: { changes: [] }
      };
    }
    nextTick(() => {
      if (contentAreaRef.value) {
        contentAreaRef.value.scrollTop = contentAreaRef.value.scrollHeight;
      }
    });
  } catch (error) {
    console.error('[主面板] 初始化存档数据失败:', error);
    currentNarrative.value = {
      type: 'system',
      content: '【系统】加载存档数据时遇到问题。',
      time: formatCurrentTime(),
      stateChanges: { changes: [] }
    };
  }
};

// 重置面板状态以进行存档切换
const resetPanelState = () => {
  console.log('[主面板] 检测到存档切换，正在重置面板状态...');
  actionQueue.clearActions();
  currentNarrative.value = null;
  inputText.value = '';
  latestMessageText.value = null;

  // --- 重置命令日志相关状态 ---

  // isAIProcessing 在切换存档时应重置为 false
  isAIProcessing.value = false;
  persistAIProcessingState(); // 清除持久化状态
};

// 监听激活存档ID的变化
watch(() => characterStore.rootState.当前激活存档, async (newSlotId, oldSlotId) => {
  // 仅在实际发生切换时执行，忽略组件首次加载（oldSlotId为undefined）
  if (newSlotId && newSlotId !== oldSlotId) {
    console.log(`[主面板] 存档已切换: 从 ${oldSlotId || '无'} 到 ${newSlotId}`);
    resetPanelState();
    await initializePanelForSave();
  }
});

// 监听短期记忆的变化，确保显示始终同步
watch(() => gameStateStore.memory?.短期记忆, (newMemories) => {
  // AI处理期间不更新，避免覆盖流式输出
  if (!isAIProcessing.value && newMemories && newMemories.length > 0) {
    const latestMemory = newMemories[0];
    // 如果当前显示的内容不是最新的记忆，则更新
    if (!currentNarrative.value || currentNarrative.value.content !== latestMemory) {
      console.log('[主面板] 检测到短期记忆变更，同步更新显示。');
      currentNarrative.value = {
        type: 'ai',
        content: latestMemory,
        time: formatCurrentTime(),
        stateChanges: { changes: [] } // 状态变更是瞬时的，此处不显示历史变更
      };
    }
  }
}, { deep: true });

// 组件挂载时执行一次性初始化
onMounted(async () => {
  try {
    // 一次性设置
    loadMemorySettings();
    restoreAIProcessingState();
    await initializeSystemConnections();
    nextTick(adjustTextareaHeight);

    // 为初始加载的存档初始化面板
    await initializePanelForSave();

    // 监听来自MemoryCenterPanel的配置更新事件
    panelBus.on('memory-settings-updated', (settings: unknown) => {
      console.log('[记忆设置] 接收到配置更新事件:', settings);
      if (settings && typeof settings === 'object') {
        const settingsObj = settings as Record<string, unknown>;
        if (typeof settingsObj.shortTermLimit === 'number') {
          maxShortTermMemories.value = settingsObj.shortTermLimit;
          console.log(`[记忆设置] 短期记忆上限已更新为: ${maxShortTermMemories.value}`);
        }
        if (typeof settingsObj.midTermTrigger === 'number') {
          maxMidTermMemories.value = settingsObj.midTermTrigger;
          console.log(`[记忆设置] 中期记忆触发阈值已更新为: ${maxMidTermMemories.value}`);
        }
        if (typeof settingsObj.midTermKeep === 'number') {
          midTermKeepCount.value = settingsObj.midTermKeep;
          console.log(`[记忆设置] 中期记忆保留数量已更新为: ${midTermKeepCount.value}`);
        }
      }
    });

    // 监听 AI 生成完成事件
    const helper = getTavernHelper();
    if (helper && helper.registerSlashCommand) {
      console.log('[主面板] 注册 AI 生成完成监听');

      // 使用 event-emit 监听生成完成
      helper.registerSlashCommand('event-emit', async (args: unknown) => {
        const argsObj = args as Record<string, unknown>;
        const event = argsObj?.event;
        if (event === 'MESSAGE_GENERATED' || event === 'GENERATION_COMPLETED') {
          console.log('[主面板] 检测到 AI 生成完成事件');
          if (isAIProcessing.value) {
            console.log('[主面板] 自动清除 AI 处理状态');
            isAIProcessing.value = false;
            persistAIProcessingState();
          }
        }
      });
    }

  } catch (error) {
    console.error('[主面板] 首次挂载失败:', error);
    currentNarrative.value = {
      type: 'system',
      content: '【系统】初始化遇到问题，请刷新页面重试。',
      time: formatCurrentTime(),
      stateChanges: { changes: [] }
    };
  }
});

// 组件激活时恢复AI处理状态（适用于keep-alive或面板切换）
onActivated(() => {
  console.log('[主面板] 组件激活，恢复AI处理状态');
  restoreAIProcessingState();
});

// 初始化系统连接
const initializeSystemConnections = async () => {
  try {
    console.log('[主面板] 初始化系统连接...');

    // 确保所有系统已初始化
    // await memorySystem.initialize();
    // await gameStateManager.initialize();
    // await bidirectionalSystem.initialize();

    console.log('[主面板] 系统连接初始化完成');
  } catch (error) {
    console.error('[主面板] 系统连接初始化失败:', error);
  }
};

// 同步游戏状态
const syncGameState = async () => {
  try {
    const character = characterStore.activeCharacterProfile;
    if (!character) return;

    console.log('[主面板] 游戏状态同步完成');
  } catch (error) {
    console.error('[主面板] 游戏状态同步失败:', error);
  }
};

</script>

<style scoped>
/* 命令日志弹窗样式 */
.command-log-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.command-log-modal {
  background: var(--color-surface);
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

/* 弹窗动画 */
.command-log-modal-enter-active,
.command-log-modal-leave-active {
  transition: all 0.3s ease;
}
.command-log-modal-enter-from,
.command-log-modal-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

.command-log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--color-surface-light) 0%, var(--color-surface-hover) 100%);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.command-log-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.close-log-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-log-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
  transform: rotate(90deg);
}

.command-log-content {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.command-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.command-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.command-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--color-primary);
}

.command-icon-wrapper {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.command-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.command-description {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text);
  line-height: 1.4;
}

.command-values {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-family: var(--font-family-mono);
}

.old-value, .new-value {
  padding: 4px 8px;
  border-radius: 4px;
}

.old-value {
  background: rgba(var(--color-error-rgb), 0.1);
  color: var(--color-danger);
  text-decoration: line-through;
}

.new-value {
  background: rgba(var(--color-success-rgb), 0.1);
  color: var(--color-success);
  font-weight: 600;
}

.arrow {
  color: var(--color-text-secondary);
  font-weight: 600;
}

.no-commands {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.no-commands .empty-icon {
  opacity: 0.5;
  margin-bottom: 1rem;
}

.no-commands .empty-text {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--color-text);
  font-size: 1rem;
}

.no-commands .empty-hint {
  font-size: 0.85rem;
  opacity: 0.8;
}

/* 深色主题适配 */
[data-theme="dark"] .command-log-modal {
  background: #1e293b;
  border-color: #475569;
}
[data-theme="dark"] .command-log-header {
  background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
  border-color: #475569;
}
[data-theme="dark"] .command-item {
  background: #334155;
  border-color: #475569;
}
[data-theme="dark"] .command-item:hover {
  border-color: var(--color-primary);
}
[data-theme="dark"] .command-icon-wrapper {
  background: rgba(var(--color-primary-rgb), 0.1);
}
[data-theme="dark"] .old-value {
  background: rgba(var(--color-error-rgb), 0.2);
}
[data-theme="dark"] .new-value {
  background: rgba(var(--color-success-rgb), 0.2);
}

.main-game-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  box-sizing: border-box;
}

/* 短期记忆区域 */
.memory-section {
  padding: 12px 20px;
  background: linear-gradient(135deg, #fefbff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
  position: relative;
  z-index: 20;
  flex-shrink: 0;
}

.memory-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 4px 0;
  transition: all 0.2s ease;
}

.memory-header:hover {
  background: rgba(99, 102, 241, 0.05);
  border-radius: 6px;
  margin: -4px;
  padding: 8px 4px;
}

.memory-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #6366f1;
}

.memory-icon {
  color: #94a3b8;
  transition: transform 0.2s ease;
}

/* 下拉悬浮效果 */
.memory-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-background);
  border: 1px solid #e2e8f0;
  border-top: none;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  z-index: 19;
  max-height: 300px;
  overflow-y: auto;
}

.memory-content {
  padding: 16px 20px;
}

.memory-item {
  font-size: 0.85rem;
  color: #374151;
  margin-bottom: 12px;
  padding: 12px 16px;
  background: rgba(99, 102, 241, 0.05);
  border-radius: 8px;
  border-left: 3px solid #6366f1;
  line-height: 1.5;
}

.memory-item:last-child {
  margin-bottom: 0;
}

.no-memory {
  font-size: 0.9rem;
  color: #9ca3af;
  font-style: italic;
  text-align: center;
  padding: 20px;
}

/* 下拉动画 */
.memory-dropdown-enter-active,
.memory-dropdown-leave-active {
  transition: all 0.3s ease;
}

.memory-dropdown-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.memory-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 当前叙述显示区域 */
.current-narrative {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 0; /* 防止flex收缩问题 */
  border-radius: 12px; /* 圆角 */
  box-shadow: none !important; /* 移除阴影 */
  background-color: var(--color-background) !important; /* 与padding区域相同背景色 */
}

.content-area {
  background-color: var(--color-background) !important; /* 强制应用背景色 */
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  /* 显示可见的滚动拇指，但轨道透明 */
  scrollbar-color: rgba(148, 163, 184, 0.6) transparent;
  box-sizing: border-box;
  min-height: 200px;
  display: flex; /* 让子元素可以撑满高度 */
  box-shadow: none !important; /* 移除阴影 */
}

/* WebKit滚动条样式 */
.content-area::-webkit-scrollbar {
  width: 6px;
  background: transparent;
}

.content-area::-webkit-scrollbar-track {
  background: transparent;
}

.content-area::-webkit-scrollbar-track-piece {
  background: transparent;
}

.content-area::-webkit-scrollbar-thumb {
  border-radius: 3px;
  background-color: rgba(148, 163, 184, 0.6);
}

/* 悬停时略微增强可见度 */
.content-area:hover::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.8);
}

.content-area::-webkit-scrollbar-button {
  display: none;
}

.content-area::-webkit-scrollbar-corner {
  background: transparent;
}


/* AI处理时的显示样式 */
.ai-processing-display {
  width: 100%;
  background: var(--color-surface); /* 确保AI处理区域使用主题表面颜色 */
}

/* 重置状态按钮 */
.reset-state-btn {
  padding: 6px;
  font-size: 13px;
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto; /* 推到右侧 */
}

.reset-state-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-danger);
  border-color: var(--color-border-hover);
  transform: translateY(-1px);
}

/* 流式内容显示 */
.streaming-content {
  width: 100%;
}

.streaming-meta {
  justify-content: center !important; /* 强制居中，覆盖 narrative-meta 的 space-between */
  position: relative; /* 添加相对定位，让时间和按钮可以绝对定位 */
}

.streaming-meta .narrative-time {
  position: absolute;
  left: 0;
}

.streaming-meta .reset-state-btn {
  position: absolute;
  right: 0;
}

.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--color-primary);
  /* 现在这个会真正居中 */
}


.streaming-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: pulse 1.2s ease-in-out infinite;
}

.streaming-text {
  font-weight: 500;
}

/* 等待动画样式 */
.waiting-animation {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 0; /* 增加一些垂直空间 */
}

.thinking-dots {
  display: flex;
  gap: 8px;
}

.thinking-dots .dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: thinking 1.4s ease-in-out infinite;
}

.thinking-dots .dot:nth-child(1) {
  animation-delay: 0s;
}

.thinking-dots .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking-dots .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes thinking {
  0%, 60%, 100% {
    transform: scale(1);
    opacity: 0.7;
  }
  30% {
    transform: scale(1.3);
    opacity: 1;
  }
}

/* .waiting-text is no longer used */

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 currentColor; opacity: 0.8; }
  70% { box-shadow: 0 0 0 6px transparent; opacity: 1; }
  100% { box-shadow: 0 0 0 0 transparent; opacity: 0.8; }
}

/* 输入框右侧的流式传输选项样式 - 删除旧样式 */

/* 输入框容器样式 */
.input-container {
  flex: 1;
  position: relative;
  display: flex;
  align-items: stretch; /* 让内部元素垂直拉伸 */
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: var(--color-background);
  transition: all 0.2s ease;
  min-height: 32px; /* 减小最小高度以对应单行 */
  max-width: 100%; /* 防止横向扩展 */
  overflow: hidden; /* 确保内容不会溢出容器 */
}

.input-container:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-container:has(.game-input:disabled) {
  background: #f9fafb;
}

/* 输入框内部的文本区域 */
.input-container .game-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 8px 16px;
  padding-right: 0; /* 右侧留给流式传输选项 */
  outline: none;
  box-shadow: none;
  resize: none;
  overflow-y: auto;
  width: 100%; /* 确保宽度填满容器 */
  min-height: 24px; /* 单行高度 */
  max-height: 120px;
  min-width: 0; /* 允许缩小 */
  box-sizing: border-box;
  word-wrap: break-word;
  white-space: pre-wrap; /* 保持换行和空格 */
  overflow-wrap: break-word;
  /* 移除自动高度相关样式，用JS控制 */
  height: auto;
  line-height: 1.4;
  /* 透明滚动条（Firefox） */
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.6) transparent;
}

.input-container .game-input:focus {
  border: none;
  box-shadow: none;
}

/* 透明滚动条（WebKit） */
.input-container .game-input::-webkit-scrollbar {
  width: 6px;
  background: transparent;
}

.input-container .game-input::-webkit-scrollbar-track,
.input-container .game-input::-webkit-scrollbar-track-piece,
.input-container .game-input::-webkit-scrollbar-corner {
  background: transparent;
}

.input-container .game-input::-webkit-scrollbar-thumb {
  border-radius: 3px;
  background-color: rgba(148, 163, 184, 0.6);
}

.input-container .game-input:hover::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.8);
}

/* 输入框内部的流式传输选项 */
.stream-toggle-inside {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  padding: 4px 12px;
  border-left: 1px solid #e5e7eb;
  margin-left: 8px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
  align-self: stretch; /* 垂直拉伸以匹配容器高度 */
  min-height: 32px; /* 减小最小高度以对应单行 */
}

.stream-toggle-inside:hover {
  color: var(--color-text);
}

.stream-toggle-inside input[type="checkbox"] {
  width: 12px;
  height: 12px;
  cursor: pointer;
}

.stream-toggle-inside .label-text {
  cursor: pointer;
}

/* 当前叙述显示区域 */
/* .current-narrative 样式已合并到 line 1996 */

.narrative-content {
  line-height: 1.8;
  color: var(--color-text);
  font-size: 0.95rem;
  background: var(--color-surface); /* 确保叙述内容区域背景一致 */
}

.narrative-meta {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.meta-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-action-btn.rollback-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.header-action-btn.rollback-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-primary);
}

.narrative-time {
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 500;
}

/* 变量更新按钮 */
.variable-updates-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  position: relative;
  overflow: hidden;
}

.variable-updates-toggle::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.variable-updates-toggle:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
  background: linear-gradient(135deg, #2563eb, #1e40af);
}

.variable-updates-toggle:hover::before {
  left: 100%;
}

.variable-updates-toggle.active {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.variable-updates-toggle.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: linear-gradient(135deg, #9ca3af, #6b7280);
  box-shadow: 0 2px 8px rgba(156, 163, 175, 0.3);
}

.variable-updates-toggle.disabled:hover {
  transform: none;
  background: linear-gradient(135deg, #9ca3af, #6b7280);
  box-shadow: 0 2px 8px rgba(156, 163, 175, 0.3);
}

.variable-updates-toggle.disabled::before {
  display: none;
}

.update-count {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 悬浮面板覆盖层 */
.variable-updates-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(4px);
}

/* 悬浮面板主体 */
.variable-updates-modal {
  background: var(--color-surface);
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  animation: modal-appear 0.3s ease-out;
}

@keyframes modal-appear {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 悬浮面板动画 */
.variable-updates-modal-enter-active,
.variable-updates-modal-leave-active {
  transition: all 0.3s ease;
}

.variable-updates-modal-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

.variable-updates-modal-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

/* 悬浮面板头部 */
.variable-updates-modal .updates-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-bottom: 1px solid var(--color-border);
}

.variable-updates-modal .updates-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.close-updates-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-updates-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
  transform: rotate(90deg);
}

/* 悬浮面板内容 */
.variable-updates-modal .updates-content {
  padding: 16px;
  overflow-y: auto;
  max-height: 60vh;
}

/* 移除重复的样式，让内部FormattedText组件处理 */

.empty-narrative {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-style: italic;
  font-size: 0.9rem;
}

/* 动作队列显示区域 */
.action-queue-display {
  margin-bottom: 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
}

.queue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.queue-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #6366f1;
}

.clear-queue-btn {
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.clear-queue-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.queue-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 150px;
  overflow-y: auto;
}

.queue-action-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(99, 102, 241, 0.05);
  border: 1px solid rgba(99, 102, 241, 0.1);
  border-radius: 6px;
  font-size: 0.85rem;
}

.action-text {
  flex: 1;
  color: #374151;
  line-height: 1.4;
  margin-right: 8px;
}

.action-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.undo-indicator {
  font-size: 12px;
  opacity: 0.7;
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.remove-action-btn {
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 16px;
  line-height: 1;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.remove-action-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.input-section {
  padding: 16px 20px 20px 20px; /* 进一步增加底部内边距 */
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  box-sizing: border-box;
  flex-shrink: 0;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: stretch; /* 改为stretch让所有元素高度一致 */
  width: 100%;
  max-width: none;
}

.game-input {
  /* 这些样式现在由 .input-container 处理 */
  font-size: 0.9rem;
  line-height: 1.4;
  color: #374151;
  resize: none;
  /* 移除固定高度，改为自动调整 */
  /* min-height: 44px; */
  /* max-height: 120px; */
  font-family: inherit;
  /* 移除过渡效果，避免高度调整时的闪烁 */
  /* transition: all 0.2s ease; */
}

/* 移除原来的 focus 样式，现在由容器处理 */
/* .game-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
} */

.game-input:disabled {
  /* background: #f9fafb; */
  color: #9ca3af;
  cursor: not-allowed;
}

.game-input::placeholder {
  color: #9ca3af;
}

.send-button {
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  font-family: inherit;
  min-height: 32px; /* 减小最小高度以匹配输入框 */
  align-self: stretch; /* 垂直拉伸以匹配容器高度 */
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-button:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.send-button:disabled {
  background: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 深色主题 */
[data-theme="dark"] .main-game-panel {
  background: var(--color-background);
}

/* 叙述内容深色主题 */
[data-theme="dark"] .narrative-content {
  background: #1e293b;
  color: #e2e8f0;
}

[data-theme="dark"] .narrative-meta {
  border-bottom-color: #374151;
}

[data-theme="dark"] .narrative-time {
  color: #94a3b8;
}

/* 深色主题 - 变量更新按钮 */
[data-theme="dark"] .variable-updates-toggle {
  background: linear-gradient(135deg, #3b82f6, #1e3a8a);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

[data-theme="dark"] .variable-updates-toggle:hover {
  background: linear-gradient(135deg, #2563eb, #1e40af);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.5);
}

[data-theme="dark"] .variable-updates-toggle.active {
  background: linear-gradient(135deg, #10b981, #065f46);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
}

[data-theme="dark"] .variable-updates-toggle.active:hover {
  background: linear-gradient(135deg, #059669, #047857);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.5);
}

[data-theme="dark"] .variable-updates-toggle.disabled {
  background: linear-gradient(135deg, #4b5563, #374151);
  box-shadow: 0 2px 8px rgba(75, 85, 99, 0.4);
}

[data-theme="dark"] .variable-updates-toggle.disabled:hover {
  background: linear-gradient(135deg, #4b5563, #374151);
  box-shadow: 0 2px 8px rgba(75, 85, 99, 0.4);
}

[data-theme="dark"] .variable-updates-overlay {
  background: rgba(0, 0, 0, 0.7);
}

[data-theme="dark"] .variable-updates-modal {
  background: #1e293b;
  border-color: #475569;
}

[data-theme="dark"] .variable-updates-modal .updates-header {
  background: linear-gradient(135deg, #334155 0%, #475569 100%);
  border-color: #475569;
}

[data-theme="dark"] .variable-updates-modal .updates-header h4 {
  color: #e2e8f0;
}

[data-theme="dark"] .close-updates-btn {
  color: #94a3b8;
}

[data-theme="dark"] .close-updates-btn:hover {
  background: #475569;
  color: #e2e8f0;
}

[data-theme="dark"] .empty-narrative {
  color: #6b7280;
}

/* 确保深色主题下当前叙述区域背景一致 */
[data-theme="dark"] .current-narrative {
  background: #1e293b;
}


[data-theme="dark"] .ai-processing-display {
  background: #1e293b !important;
}

[data-theme="dark"] .reset-state-btn {
  background: rgba(var(--color-error-rgb), 0.2);
  color: var(--color-danger);
  border-color: rgba(var(--color-error-rgb), 0.3);
}

[data-theme="dark"] .reset-state-btn:hover {
  background: rgba(var(--color-error-rgb), 0.3);
  border-color: rgba(var(--color-error-rgb), 0.5);
}

[data-theme="dark"] .narrative-content {
  background: #1e293b !important;
}

[data-theme="dark"] .input-section {
  background: #334155;
  border-top-color: #475569;
}

[data-theme="dark"] .game-input {
  /* background: #1e293b; - 现在由容器处理 */
  /* border-color: #475569; - 现在由容器处理 */
  color: #e2e8f0;
}

/* 移除重复的深色主题 focus 样式 */
/* [data-theme="dark"] .game-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
} */

[data-theme="dark"] .game-input:disabled {
  /* background: #0f172a; - 现在由容器处理 */
  color: #64748b;
}

[data-theme="dark"] .game-input::placeholder {
  color: #64748b;
}

[data-theme="dark"] .send-button {
  background: #3b82f6;
}

[data-theme="dark"] .send-button:hover:not(:disabled) {
  background: #2563eb;
}

[data-theme="dark"] .send-button:disabled {
  background: #374151;
  color: #64748b;
}

/* 短期记忆深色主题 */
[data-theme="dark"] .memory-section {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border-color: #475569;
}

[data-theme="dark"] .memory-header:hover {
  background: rgba(99, 102, 241, 0.1);
}

[data-theme="dark"] .memory-title {
  color: #818cf8;
}

[data-theme="dark"] .memory-icon {
  color: #64748b;
}

[data-theme="dark"] .memory-dropdown {
  background: #1e293b;
  border-color: #475569;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .memory-item {
  background: rgba(129, 140, 248, 0.1);
  border-left-color: #818cf8;
  color: #e2e8f0;
}

/* 等待覆盖层深色主题 - 更新为AI处理显示样式 */
[data-theme="dark"] .streaming-meta {
  border-bottom-color: #374151;
}

[data-theme="dark"] .streaming-indicator {
  color: #60a5fa;
}

[data-theme="dark"] .streaming-dot {
  background: #60a5fa;
}

[data-theme="dark"] .thinking-dots .dot {
  background: #60a5fa;
}

[data-theme="dark"] .waiting-text {
  color: #94a3b8;
}

/* 输入框右侧流式传输选项深色主题 - 更新为内部样式 */
[data-theme="dark"] .input-container {
  background: #1e293b;
  border-color: #475569;
}

[data-theme="dark"] .input-container:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

[data-theme="dark"] .input-container:has(.game-input:disabled) {
  background: #0f172a;
}

[data-theme="dark"] .stream-toggle-inside {
  color: #94a3b8;
  border-left-color: #475569;
}

[data-theme="dark"] .stream-toggle-inside:hover {
  color: #e2e8f0;
}

/* 行动选择器按钮 */
.action-selector-btn {
  width: 44px;
  min-height: 32px; /* 减小最小高度以匹配输入框 */
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6366f1;
  align-self: stretch; /* 垂直拉伸以匹配容器高度 */
  flex-shrink: 0;
}

.action-selector-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #6366f1;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
}

.action-selector-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 行动选择弹窗 */
.action-modal-overlay,
.action-config-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.action-modal {
  background: var(--color-background);
  border-radius: 12px;
  max-width: 480px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.action-config-modal {
  background: var(--color-background);
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.modal-header,
.config-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-primary, #3b82f6);
}

.modal-header h3,
.config-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: white;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--color-surface-light);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.action-grid {
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.quick-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: var(--color-background);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
  min-height: 70px;
}

.quick-action-btn:hover {
  border-color: #3b82f6;
  background: #f8fafc;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.quick-action-btn.cultivation {
  border-color: rgba(34, 197, 94, 0.2);
  background: rgba(34, 197, 94, 0.03);
}

.quick-action-btn.cultivation:hover {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.08);
}

.quick-action-btn.exploration {
  border-color: rgba(59, 130, 246, 0.2);
  background: rgba(59, 130, 246, 0.03);
}

.quick-action-btn.exploration:hover {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
}

.quick-action-btn.social {
  border-color: rgba(168, 85, 247, 0.2);
  background: rgba(168, 85, 247, 0.03);
}

.quick-action-btn.social:hover {
  border-color: #a855f7;
  background: rgba(168, 85, 247, 0.08);
}

.quick-action-btn.other {
  border-color: rgba(156, 163, 175, 0.2);
  background: rgba(156, 163, 175, 0.03);
}

.quick-action-btn.other:hover {
  border-color: #9ca3af;
  background: rgba(156, 163, 175, 0.08);
}

.action-icon {
  font-size: 1.2rem;
  line-height: 1;
}

.action-text {
  font-weight: 500;
  color: #374151;
  text-align: center;
  line-height: 1.2;
}

/* 配置弹窗内容 */
.config-content {
  padding: 20px;
}

.action-description {
  margin: 0 0 20px 0;
  color: #6b7280;
  line-height: 1.5;
}

.config-section {
  margin-bottom: 20px;
}

.config-section:last-child {
  margin-bottom: 0;
}

.config-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.time-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.time-btn {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: var(--color-background);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.time-btn:hover {
  border-color: #3b82f6;
}

.time-btn.active {
  border-color: #3b82f6;
  background: #3b82f6;
  color: white;
}

.time-custom {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
}

.time-input {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.action-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-item:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.option-item input[type="radio"] {
  margin: 0;
}

.config-actions {
  padding: 20px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.cancel-btn,
.confirm-btn {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn {
  border: 1px solid #d1d5db;
  background: var(--color-background);
  color: #6b7280;
}

.cancel-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.confirm-btn {
  border: 1px solid #3b82f6;
  background: #3b82f6;
  color: white;
}

.confirm-btn:hover {
  background: #2563eb;
  border-color: #2563eb;
}

/* 深色主题适配 */
[data-theme="dark"] .action-selector-btn {
  background: #374151;
  border-color: #4b5563;
  color: #d1d5db;
}

[data-theme="dark"] .action-selector-btn:hover:not(:disabled) {
  background: #4b5563;
  border-color: #6b7280;
}

[data-theme="dark"] .action-modal,
[data-theme="dark"] .action-config-modal {
  background: #1f2937;
}

[data-theme="dark"] .modal-header,
[data-theme="dark"] .config-header,
[data-theme="dark"] .config-actions {
  border-color: #374151;
}

[data-theme="dark"] .modal-header h3,
[data-theme="dark"] .config-header h3,
[data-theme="dark"] .category-title,
[data-theme="dark"] .config-label,
[data-theme="dark"] .action-name {
  color: #f9fafb;
}

[data-theme="dark"] .close-btn {
  background: #374151;
  color: #d1d5db;
}

[data-theme="dark"] .close-btn:hover {
  background: #4b5563;
  color: #f9fafb;
}

[data-theme="dark"] .action-btn {
  background: #374151;
  border-color: #4b5563;
}

[data-theme="dark"] .action-btn:hover {
  border-color: #3b82f6;
  background: #1f2937;
}

[data-theme="dark"] .time-btn,
[data-theme="dark"] .option-item {
  background: #374151;
  border-color: #4b5563;
  color: #d1d5db;
}

[data-theme="dark"] .time-input {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

[data-theme="dark"] .cancel-btn {
  background: #374151;
  border-color: #4b5563;
  color: #d1d5db;
}

[data-theme="dark"] .cancel-btn:hover {
  background: #4b5563;
}

/* 深色主题动作队列样式 */
[data-theme="dark"] .action-queue-display {
  background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
  border-color: #4b5563;
}

[data-theme="dark"] .queue-title {
  color: #818cf8;
}

[data-theme="dark"] .clear-queue-btn {
  color: #9ca3af;
}

[data-theme="dark"] .clear-queue-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

[data-theme="dark"] .queue-action-item {
  background: rgba(129, 140, 248, 0.1);
  border-color: rgba(129, 140, 248, 0.2);
}

[data-theme="dark"] .action-text {
  color: #e5e7eb;
}

[data-theme="dark"] .remove-action-btn {
  color: #9ca3af;
}

[data-theme="dark"] .remove-action-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

[data-theme="dark"] .action-controls {
  color: #d1d5db;
}

[data-theme="dark"] .undo-indicator {
  filter: brightness(1.2);
}

/* 变更描述样式 */
.change-description {
  color: var(--color-text);
  font-size: 0.8rem;
  margin-bottom: 6px;
  padding: 4px 8px;
  background: var(--color-surface-light);
  border-radius: 4px;
  border-left: 2px solid var(--color-primary);
  line-height: 1.3;
  font-style: italic;
}

/* 深色主题下的变更描述 */
[data-theme="dark"] .change-description {
  background: #334155;
  color: #e2e8f0;
  border-left-color: #60a5fa;
}

/* 空状态样式 */
.no-changes {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.no-changes .empty-icon {
  opacity: 0.5;
  margin-bottom: 1rem;
  color: var(--color-text-secondary);
}

.no-changes .empty-text {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--color-text);
  font-size: 0.9rem;
}

.no-changes .empty-hint {
  font-size: 0.8rem;
  opacity: 0.8;
  line-height: 1.4;
}

/* 图片预览容器样式 */
.image-preview-container {
  display: flex;
  gap: 8px;
  padding: 8px;
  flex-wrap: wrap;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.image-preview-item {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid #e5e7eb;
  transition: all 0.2s ease;
}

.image-preview-item:hover {
  border-color: #3b82f6;
  transform: scale(1.05);
}

.image-preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-image-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  padding: 0;
  background: rgba(239, 68, 68, 0.9);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s ease;
}

.image-preview-item:hover .remove-image-btn {
  opacity: 1;
}

.remove-image-btn:hover {
  background: rgba(220, 38, 38, 1);
  transform: scale(1.1);
}

/* 图片上传按钮特殊样式 */
.image-upload-btn svg {
  color: #10b981;
}

.image-upload-btn:hover:not(:disabled) svg {
  color: #059669;
}

/* 深色主题图片预览样式 */
[data-theme="dark"] .image-preview-container {
  background: #0f172a;
  border-bottom-color: #475569;
}

[data-theme="dark"] .image-preview-item {
  border-color: #475569;
}

[data-theme="dark"] .image-preview-item:hover {
  border-color: #3b82f6;
}

/* 最新消息text样式 */
.latest-message-text {
  margin-top: 20px;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #818cf8;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #475569;
  line-height: 1.7;
}

.latest-text-header {
  font-weight: 600;
  color: #6366f1;
  margin-bottom: 8px;
  font-size: 0.85rem;
}

[data-theme="dark"] .latest-message-text {
  background: #334155;
  border-color: #4b5563;
  border-left-color: #818cf8;
  color: #cbd5e1;
}

[data-theme="dark"] .latest-text-header {
  color: #a5b4fc;
}
</style>
