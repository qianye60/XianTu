<template>
  <div class="main-game-panel">
    <!-- 短期记忆区域 -->
    <div class="memory-section" v-if="showMemorySection">
      <div class="memory-header" @click="toggleMemory">
        <span class="memory-title">{{ t('短期记忆') }}</span>
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
              {{ t('脑海中一片清净，尚未留下修行痕迹...') }}
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 文本显示区域 - 当前AI回复 -->
    <div class="content-area" ref="contentAreaRef" @scroll="handleContentScroll">
      <!-- 左侧：当前叙述 -->
      <div class="current-narrative">
        <!-- AI生成状态指示器（生成时显示在顶部） -->
        <div v-if="isAIProcessing" class="ai-processing-indicator">
          <div class="streaming-meta">
            <span class="narrative-time">{{ formatCurrentTime() }}</span>
            <div class="streaming-indicator">
              <span class="streaming-dot"></span>
              <span class="streaming-text">{{ streamingContent ? `${streamingCharCount} ${t('字')}` : t('天道感应中...') }}</span>
            </div>
            <!-- 重置按钮 - 右侧 -->
            <button
              @click="forceResetAIProcessingState"
              class="reset-state-btn"
              :title="t('如果长时间无响应，点击此处重置状态')"
            >
              <RotateCcw :size="16" />
            </button>
          </div>
        </div>

        <!-- 思维链显示区域（可折叠）- 生成中和完成后都显示 -->
        <div v-if="thinkingContent || lastThinkingContent" class="thinking-section">
          <div class="thinking-header" @click="uiStore.toggleThinkingExpanded()">
            <BrainCircuit :size="16" class="thinking-icon" />
            <span class="thinking-title">{{ t('思维过程') }}</span>
            <span v-if="isThinkingPhase" class="thinking-badge streaming">{{ t('思考中...') }}</span>
            <span v-else-if="thinkingContent || lastThinkingContent" class="thinking-badge completed">{{ t('已完成') }}</span>
            <ChevronDown v-if="thinkingExpanded" :size="16" class="expand-icon" />
            <ChevronRight v-else :size="16" class="expand-icon" />
          </div>
          <Transition name="thinking-expand">
            <div v-if="thinkingExpanded" class="thinking-content">
              <FormattedText :text="thinkingContent || lastThinkingContent" />
            </div>
          </Transition>
        </div>

        <!-- 流式输出内容（生成时实时显示，优先级最高） -->
        <div v-if="isAIProcessing && streamingContent" class="streaming-narrative-content">
          <div v-if="uiStore.lastSentUserIntentText" class="last-user-intent">
            <div class="last-user-intent-header">
              <span class="k">你的输入</span>
              <span v-if="uiStore.lastSentUserIntentSource === 'action_option'" class="badge">来自行动推荐</span>
              <span v-else-if="uiStore.lastSentUserIntentSource === 'mixed'" class="badge">含行动推荐</span>
            </div>
            <div class="last-user-intent-text">{{ uiStore.lastSentUserIntentText }}</div>
          </div>
          <div class="streaming-text">
            <FormattedText :text="streamingContent" />
          </div>
        </div>

        <!-- 上一次的叙述内容（非生成时显示） -->
        <div v-else-if="currentNarrative" class="narrative-content">
          <div class="narrative-meta">
            <span class="narrative-time">{{ currentNarrative.time }}</span>
            <div class="meta-buttons">
              <!-- 快照回退按钮 -->
              <button
                v-if="snapshots.length > 0"
                @click="rollbackToLastSnapshot"
                class="header-action-btn snapshot-btn"
                :title="t('回退到上一条对话')"
              >
                <History :size="20" />
                <span class="snapshot-count">{{ snapshots.length }}</span>
              </button>

              <button
                @click="openEventsPanel"
                class="header-action-btn event-btn"
                :title="t('世界事件')"
              >
                <Bell :size="20" />
              </button>

              <span
                v-if="isOnlineTraveling"
                class="traveling-badge"
                :title="travelingTooltip"
              >穿越中</span>

              <!-- 命令日志按钮 -->
              <button
                @click="showStateChanges(currentNarrative.stateChanges)"
                class="variable-updates-toggle"
                :class="{ disabled: currentNarrativeStateChanges.length === 0 }"
                :disabled="currentNarrativeStateChanges.length === 0"
                :title="currentNarrativeStateChanges.length > 0 ? t('查看本次对话的变更日志') : t('本次对话无变更记录')"
              >
                <ScrollText :size="16" />
                <span class="update-count">{{ currentNarrativeStateChanges.length }}</span>
              </button>
            </div>
          </div>
          <div v-if="uiStore.lastSentUserIntentText" class="last-user-intent">
            <div class="last-user-intent-header">
              <span class="k">你的输入</span>
              <span v-if="uiStore.lastSentUserIntentSource === 'action_option'" class="badge">来自行动推荐</span>
              <span v-else-if="uiStore.lastSentUserIntentSource === 'mixed'" class="badge">含行动推荐</span>
            </div>
            <div class="last-user-intent-text">{{ uiStore.lastSentUserIntentText }}</div>
          </div>
          <div class="narrative-text">
            <FormattedText :text="currentNarrative.content" />
          </div>

          <!-- 行动选项 -->
          <div v-if="uiStore.enableActionOptions && currentNarrative.actionOptions?.length" class="action-options">
            <button
              v-for="(option, index) in currentNarrative.actionOptions"
              :key="index"
              @click="selectActionOption(option)"
              class="action-option-btn"
            >
              {{ option }}
            </button>
          </div>
        </div>

        <div v-else class="empty-narrative">
          {{ t('静待天机变化...') }}
        </div>
      </div>
    </div>


    <!-- 输入区域 -->
    <div class="input-section">
      <!-- 动作队列显示区域 -->
      <div v-if="actionQueue.pendingActions.length > 0" class="action-queue-display">
        <div class="queue-header">
          <span class="queue-title">{{ t('最近操作') }}</span>
          <button @click="clearActionQueue" class="clear-queue-btn" :title="t('清空记录')">
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
                :title="isUndoableAction(action) ? t('撤回并恢复') : t('删除此动作')"
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

        <!-- 图片上传按钮 - 已禁用 -->
        <button
          v-if="false"
          @click="openImagePicker"
          class="action-selector-btn image-upload-btn"
          :disabled="!hasActiveCharacter"
          :title="t('上传图片')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>

        <!-- 快捷行动按钮 - 已禁用 -->
        <button
          v-if="false"
          @click="showActionSelector"
          class="action-selector-btn"
          :disabled="!hasActiveCharacter"
          :title="t('快捷行动')"
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
              <button @click="removeImage(index)" class="remove-image-btn" :title="t('移除图片')">
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
            :placeholder="hasActiveCharacter ? t('请输入您的选择或行动...') : t('请先选择角色...')"
            class="game-input"
            ref="inputRef"
            rows="1"
            wrap="soft"
            :disabled="!hasActiveCharacter || isAIProcessing"
          ></textarea>
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
            <h3>{{ t('快捷行动') }}</h3>
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
              <label class="config-label">{{ t('修炼时间') }}</label>
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
                <label>{{ t('自定义：') }}</label>
                <input
                  v-model.number="customTime"
                  type="number"
                  min="1"
                  max="365"
                  class="time-input"
                /> {{ t('天') }}
              </div>
            </div>

            <!-- 其他配置选项 -->
            <div v-if="selectedAction.options" class="config-section">
              <label class="config-label">{{ t('选项') }}</label>
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
            <button @click="cancelAction" class="cancel-btn">{{ t('取消') }}</button>
            <button @click="confirmAction" class="confirm-btn">{{ t('确认') }}</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated, onUnmounted, nextTick, computed, watch } from 'vue';
import {
  Send, Loader2, ChevronDown, ChevronRight, ScrollText, RotateCcw, Shield, BrainCircuit, Bell, History
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { useI18n } from '@/i18n';
import { useCharacterStore } from '@/stores/characterStore';
import { useActionQueueStore } from '@/stores/actionQueueStore';
import { useUIStore } from '@/stores/uiStore';
import { panelBus } from '@/utils/panelBus';
import { chatBus, type ChatBusPayload } from '@/utils/chatBus';
import { EnhancedActionQueueManager } from '@/utils/enhancedActionQueue';
import { AIBidirectionalSystem, getTavernHelper } from '@/utils/AIBidirectionalSystem';
import { isTavernEnv } from '@/utils/tavern';
import { toast } from '@/utils/toast';
import { calculateAgeFromBirthdate } from '@/utils/lifespanCalculator';
import { aiService } from '@/services/aiService';
import { extractTextFromJsonResponse } from '@/utils/textSanitizer';
import FormattedText from '@/components/common/FormattedText.vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import { getSnapshots } from '@/utils/snapshotManager';
import type {  CharacterProfile } from '@/types/game';
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
// 🔥 使用全局状态替代组件状态
const isAIProcessing = computed(() => uiStore.isAIProcessing);
const streamingContent = computed(() => uiStore.streamingContent);
const currentGenerationId = computed(() => uiStore.currentGenerationId);
const streamingCharCount = computed(() => uiStore.streamingContent.length);

// 🔥 思维链状态
const thinkingContent = computed(() => uiStore.thinkingContent);
const isThinkingPhase = computed(() => uiStore.isThinkingPhase);
const thinkingExpanded = computed(() => uiStore.thinkingExpanded);

// 🔥 保存上一次的思维链内容（传输完成后仍可查看）
const lastThinkingContent = ref('');

// 🔥 流式内容解析状态（用于解析 <thinking> 标签）
const streamParseState = ref({
  inThinking: false,
  buffer: ''
});

// 🔥 处理流式 chunk，解析思维链标签
const handleStreamChunk = (chunk: string) => {
  if (!chunk) return;

  const state = streamParseState.value;
  state.buffer += chunk;

  // 处理缓冲区中的内容
  while (state.buffer.length > 0) {
    if (!state.inThinking) {
      // 查找 <thinking> 开始标签
      const thinkingStart = state.buffer.indexOf('<thinking>');
      if (thinkingStart === -1) {
        // 没有找到标签，检查是否可能是不完整的标签
        if (state.buffer.length > 8 && !state.buffer.includes('<')) {
          // 安全地输出所有内容作为正文
          uiStore.appendStreamingContent(state.buffer);
          state.buffer = '';
        } else if (state.buffer.length > 35) {
          // 缓冲区太长，输出前面的内容
          const safeLen = state.buffer.lastIndexOf('<');
          if (safeLen > 0) {
            uiStore.appendStreamingContent(state.buffer.substring(0, safeLen));
            state.buffer = state.buffer.substring(safeLen);
          } else {
            uiStore.appendStreamingContent(state.buffer);
            state.buffer = '';
          }
        }
        break;
      } else {
        // 找到 <thinking> 标签
        if (thinkingStart > 0) {
          // 标签前有正文内容
          uiStore.appendStreamingContent(state.buffer.substring(0, thinkingStart));
        }
        state.buffer = state.buffer.substring(thinkingStart + 10); // 跳过 <thinking>
        state.inThinking = true;
        uiStore.isThinkingPhase = true;
      }
    } else {
      // 在思维链中，查找 </thinking> 结束标签
      const thinkingEnd = state.buffer.indexOf('</thinking>');
      if (thinkingEnd === -1) {
        // 没有找到结束标签，检查是否可能是不完整的标签
        if (state.buffer.length > 8 && !state.buffer.includes('<')) {
          // 安全地输出所有内容作为思维链
          uiStore.appendThinkingContent(state.buffer);
          state.buffer = '';
        } else if (state.buffer.length > 60) {
          // 缓冲区太长，输出前面的内容
          const safeLen = state.buffer.lastIndexOf('<');
          if (safeLen > 0) {
            uiStore.appendThinkingContent(state.buffer.substring(0, safeLen));
            state.buffer = state.buffer.substring(safeLen);
          } else {
            uiStore.appendThinkingContent(state.buffer);
            state.buffer = '';
          }
        }
        break;
      } else {
        // 找到 </thinking> 标签
        if (thinkingEnd > 0) {
          // 标签前有思维链内容
          uiStore.appendThinkingContent(state.buffer.substring(0, thinkingEnd));
        }
        state.buffer = state.buffer.substring(thinkingEnd + 11); // 跳过 </thinking>
        state.inThinking = false;
        uiStore.endThinkingPhase();
      }
    }
  }
};

// 🔥 重置流式解析状态
const resetStreamParseState = () => {
  // 保存当前思维链内容，以便传输完成后仍可查看
  if (uiStore.thinkingContent) {
    lastThinkingContent.value = uiStore.thinkingContent;
  }
  streamParseState.value = { inThinking: false, buffer: '' };
  uiStore.clearThinkingContent();
  uiStore.clearStreamingContent();
};

const inputRef = ref<HTMLTextAreaElement>();
const contentAreaRef = ref<HTMLDivElement>();
const memoryExpanded = ref(false);

// 🔥 用户滚动检测：当用户手动向上滚动时，停止自动跟随
const userHasScrolledUp = ref(false);
const showMemorySection = ref(true);

const handleChatPrefill = async ({ text, focus }: ChatBusPayload) => {
  uiStore.userInputText = text;
  if (focus !== false) {
    await nextTick();
    inputRef.value?.focus();
  }
};

const handleChatSend = async ({ text, focus }: ChatBusPayload) => {
  if (uiStore.isAIProcessing) {
    toast.warning(t('AI正在生成中，请稍后再试'));
    return;
  }
  uiStore.userInputText = text;
  if (focus !== false) {
    await nextTick();
    inputRef.value?.focus();
  }
  await nextTick();
  sendMessage();
};

// 切换记忆面板
const toggleMemory = () => {
  memoryExpanded.value = !memoryExpanded.value;
};

// 恢复AI处理状态（从sessionStorage）
const restoreAIProcessingState = () => {
  const saved = sessionStorage.getItem('ai-processing-state');
  if (saved === 'true') {
    uiStore.setAIProcessing(true);
    console.log('[状态恢复] 恢复AI处理状态');
  }
};

// 持久化AI处理状态到sessionStorage
const persistAIProcessingState = () => {
  if (uiStore.isAIProcessing) {
    sessionStorage.setItem('ai-processing-state', 'true');
    sessionStorage.setItem('ai-processing-timestamp', Date.now().toString());
  } else {
    sessionStorage.removeItem('ai-processing-state');
    sessionStorage.removeItem('ai-processing-timestamp');
  }
};

// 强制清除AI处理状态的方法
const forceResetAIProcessingState = () => {
  console.log('[强制重置] 清除AI处理状态和会话存储');
  // 取消所有正在进行的AI请求（包括重试中的）
  aiService.cancelAllRequests();
  aiResetToken += 1;
  uiStore.resetStreamingState();
  streamingMessageIndex.value = null;
  rawStreamingContent.value = '';
  persistAIProcessingState();
  toast.info(t('AI处理状态已重置'));
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
  iconComponent?: unknown;
}

interface ActionCategory {
  name: string;
  icon: string;
  actions: ActionItem[];
}

const { t } = useI18n();
const router = useRouter();
const characterStore = useCharacterStore();
const actionQueue = useActionQueueStore();
const uiStore = useUIStore();
let aiResetToken = 0;
const gameStateStore = useGameStateStore();
const isTavernEnvFlag = isTavernEnv();
const enhancedActionQueue = EnhancedActionQueueManager.getInstance();
const bidirectionalSystem = AIBidirectionalSystem;

const isOnlineTraveling = computed(() => {
  const online = gameStateStore.onlineState as any;
  return online?.模式 === '联机' && !!online?.房间ID;
});

const travelingTooltip = computed(() => {
  if (!isOnlineTraveling.value) return '';
  const online = gameStateStore.onlineState as any;
  const sessionId = online?.房间ID ? String(online.房间ID) : '';
  const owner = online?.穿越目标?.主人用户名 ? String(online.穿越目标.主人用户名) : '';
  const worldId = online?.穿越目标?.世界ID != null ? String(online.穿越目标.世界ID) : '';
  const parts = ['联机穿越中'];
  if (owner) parts.push(`目标：${owner}`);
  if (worldId) parts.push(`世界#${worldId}`);
  if (sessionId) parts.push(`会话#${sessionId}`);
  return parts.join(' · ');
});

const openEventsPanel = () => {
  router.push('/game/events');
};

// 流式输出状态
const streamingMessageIndex = ref<number | null>(null);
// 🔥 使用全局流式传输开关（从 uiStore 获取，切换页面不丢失）
const useStreaming = computed({
  get: () => uiStore.useStreaming,
  set: (val) => { uiStore.useStreaming = val; }
});

// 🔥 全局标志：防止重复注册事件监听器（使用 window 对象存储，确保全局唯一）
const GLOBAL_EVENT_KEY = '__mainGamePanel_eventListenersRegistered__';
const globalWindowState = window as unknown as Record<string, unknown>;
if (!globalWindowState[GLOBAL_EVENT_KEY]) {
  globalWindowState[GLOBAL_EVENT_KEY] = false;
}

// 🔥 存储事件监听器引用，用于清理（也存储在全局）
const GLOBAL_HANDLERS_KEY = '__mainGamePanel_eventHandlers__';
if (!globalWindowState[GLOBAL_HANDLERS_KEY]) {
  globalWindowState[GLOBAL_HANDLERS_KEY] = {};
}

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

// 显示状态变更详情
const showStateChanges = (log: StateChangeLog | undefined) => {
  if (!log || !log.changes || log.changes.length === 0) {
    toast.info('本次对话无变更记录');
    return;
  }
  // [核心改造] 调用 uiStore 中新的方法来打开专属的 StateChangeViewer 弹窗
  uiStore.openStateChangeViewer(log);
};

// 当前显示的叙述内容
// 文本内容优先使用短期记忆最后一条，actionOptions和stateChanges从叙事历史获取
const currentNarrative = computed(() => {
  const narrativeHistory = gameStateStore.narrativeHistory;
  const shortTermMemory = gameStateStore.memory?.短期记忆;
  const currentTimeString = formatCurrentTime();

  // 优先从短期记忆获取文本内容
  let content = '';
  if (shortTermMemory && shortTermMemory.length > 0) {
    // 短期记忆使用push添加，最新的在末尾
    const latestMemory = shortTermMemory[shortTermMemory.length - 1];
    content = latestMemory.replace(/^【.*?】\s*/, ''); // 移除时间前缀
  } else if (narrativeHistory && narrativeHistory.length > 0) {
    // 回退到叙事历史
    content = narrativeHistory[narrativeHistory.length - 1].content.replace(/^【.*?】\s*/, '');
  }

  // 从叙事历史获取actionOptions和stateChanges
  if (narrativeHistory && narrativeHistory.length > 0) {
    const latestNarrative = narrativeHistory[narrativeHistory.length - 1];
    return {
      type: latestNarrative.type || 'narrative',
      content: content || '...',
      time: currentTimeString,
      stateChanges: latestNarrative.stateChanges || { changes: [] },
      actionOptions: latestNarrative.actionOptions || []
    };
  }

  // 无数据时的默认内容
  return {
    type: 'system',
    content: content || '开局生成失败，请检查API上下文长度是否足够，是否使用支持流式的API，然后返回主页重新开始生成。',
    time: currentTimeString,
    stateChanges: { changes: [] },
    actionOptions: []
  };
});

// 绘图相关逻辑
const isGeneratingImage = ref(false);
const showImageModal = ref(false);
const currentSceneImage = ref('');
const isImageFullScreen = ref(false);

const generateSceneImage = async () => {
  if (isGeneratingImage.value) return;
  
  const text = currentNarrative.value?.content;
  if (!text || text.length < 5) {
    toast.warning('当前剧情内容过少，无法生成');
    return;
  }

  isGeneratingImage.value = true;
  try {
    // 构建提示词
    const location = gameStateStore.location?.描述 || '未知地点';
    const basePrompt = `中国古风水墨画，修仙玄幻风格，高品质，细节丰富。当前地点：${location}。剧情描述：`;
    // 截取前500字作为提示词
    const prompt = basePrompt + text.substring(0, 500);

    // TODO: 实现图片生成功能
    // const imageUrl = await aiService.generateImage(prompt);
    // currentSceneImage.value = imageUrl;
    // showImageModal.value = true;
    toast.warning('场景绘卷功能暂未实现');
    console.log('绘图提示词:', prompt);
  } catch (error) {
    console.error('绘图失败:', error);
    toast.error(`绘图失败: ${error instanceof Error ? error.message : '未知错误'}`);
  } finally {
    isGeneratingImage.value = false;
  }
};

const closeImageModal = () => {
  showImageModal.value = false;
  isImageFullScreen.value = false;
};

const toggleFullScreenImage = () => {
  isImageFullScreen.value = !isImageFullScreen.value;
};

const saveImageToGallery = () => {
  // TODO: 实现画廊功能，目前仅做提示
  toast.success('已保存到临时画册 (功能开发中)');
  closeImageModal();
};

const latestMessageText = ref<string | null>(null); // 用于存储单独的text部分

// 短期记忆设置 - 可配置
const maxShortTermMemories = ref(5); // 默认5条，与记忆中心同步
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
      const shortLimit = typeof settings.shortTermLimit === 'number' ? settings.shortTermLimit : settings.maxShortTerm;
      const midTrigger = typeof settings.midTermTrigger === 'number' ? settings.midTermTrigger : settings.maxMidTerm;
      if (shortLimit) maxShortTermMemories.value = shortLimit;
      if (midTrigger) maxMidTermMemories.value = midTrigger;
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
    const raw = localStorage.getItem('memory-settings');
    const existing = raw ? JSON.parse(raw) : {};
    const settings = {
      ...existing,
      shortTermLimit: maxShortTermMemories.value,
      midTermTrigger: maxMidTermMemories.value,
      midTermKeep: midTermKeepCount.value,
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


// 计算属性：是否可以回滚
const canRollback = computed(() => {
  const profile = characterStore.activeCharacterProfile;
  if (!profile || profile.模式 !== '单机') return false;
  const lastConversation = profile.存档列表?.['上次对话'];
  // 🔥 修复：检查保存时间而不是存档数据，因为存档数据可能在IndexedDB中而不在内存中
  return lastConversation?.保存时间 !== null && lastConversation?.保存时间 !== undefined;
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

// 快照相关
const showSnapshotMenu = ref(false);
const snapshots = computed(() => {
  const active = characterStore.rootState.当前激活存档;
  if (!active) return [];
  return getSnapshots(active.角色ID, active.存档槽位).reverse();
});

const formatSnapshotTime = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  return new Date(timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const rollbackToSnapshot = async (snapshotId: string) => {
  showSnapshotMenu.value = false;
  const active = characterStore.rootState.当前激活存档;
  if (!active) return;

  uiStore.showRetryDialog({
    title: '回退确认',
    message: '确定要回退到此快照吗？当前进度将被替换。',
    confirmText: '确认回退',
    cancelText: '取消',
    onConfirm: async () => {
      try {
        const { getSnapshot, restoreSnapshot } = await import('@/utils/snapshotManager');
        const snap = getSnapshot(active.角色ID, active.存档槽位, snapshotId);
        if (!snap) throw new Error('快照不存在');

        const currentData = gameStateStore.toSaveData();
        if (!currentData) throw new Error('无法获取当前数据');

        const restored = restoreSnapshot(currentData, snap);
        await gameStateStore.loadFromSaveData(restored);

        const profile = characterStore.activeCharacterProfile;
        if (profile?.模式 === '单机' && profile.存档列表) {
          const slot = profile.存档列表[active.存档槽位];
          if (slot) {
            slot.存档数据 = restored;
            const { saveSaveData } = await import('@/utils/indexedDBManager');
            await saveSaveData(active.角色ID, active.存档槽位, restored);
          }
        }

        uiStore.resetStreamingState();
        uiStore.lastSentUserIntentText = '';

        // 删除该快照及之后的所有快照
        const { getSnapshots } = await import('@/utils/snapshotManager');
        const allSnapshots = getSnapshots(active.角色ID, active.存档槽位);
        const snapIndex = allSnapshots.findIndex(s => s.id === snapshotId);
        if (snapIndex !== -1) {
          const { deleteSnapshotsFrom } = await import('@/utils/snapshotManager');
          deleteSnapshotsFrom(active.角色ID, active.存档槽位, snapIndex);
        }

        toast.success('已回退到快照');
      } catch (error) {
        console.error('回退失败:', error);
        toast.error(`回退失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    },
    onCancel: () => {}
  });
};

// 回退到最后一条快照
const rollbackToLastSnapshot = async () => {
  if (snapshots.value.length === 0) return;
  const lastSnapshot = snapshots.value[snapshots.value.length - 1];
  await rollbackToSnapshot(lastSnapshot.id);
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
const actionCategories = ref<ActionCategory[]>([
  {
    name: '修炼',
    icon: '',
    actions: [
      {
        name: '基础修炼',
        icon: '⚡',
        type: 'cultivation',
        description: '吐纳天地灵气，淬炼自身修为，是提升境界的根本之法。',
        timeRequired: true
      },
      {
        name: '炼体',
        icon: 'Shield',
        iconComponent: Shield,
        type: 'cultivation',
        description: '以灵气或外力锤炼肉身，强化筋骨皮膜，增强体魄与防御。',
        timeRequired: true
      },
      {
        name: '冥想',
        icon: 'BrainCircuit',
        iconComponent: BrainCircuit,
        type: 'cultivation',
        description: '沉入心海，观想天地，可稳固心境，提升神识，偶有顿悟。',
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

if (!isTavernEnvFlag) {
  actionCategories.value = actionCategories.value.map((category) => ({
    ...category,
    actions: category.actions.map((action) => {
      const filteredOptions = action.options?.filter((option) => option.key !== 'tavern');
      return filteredOptions ? { ...action, options: filteredOptions } : action;
    })
  }));
}

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

// 短期记忆获取 - 显示所有短期记忆
const recentMemories = computed(() => {
  const mems = gameStateStore.memory?.短期记忆;
  if (mems && mems.length > 0) {
    // 短期记忆使用push添加，数组本身就是时间顺序（最旧的在前，最新的在后）
    // 返回副本以避免在 computed 中产生副作用
    return mems.slice();
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
      // 基本结构检查仅做告警，避免阻塞响应
      resp.tavern_commands.forEach((cmd: unknown, index: number) => {
        const command = cmd as Record<string, unknown>;
        if (!cmd || typeof cmd !== 'object') {
          console.warn(`[AI响应校验] tavern_commands[${index}]不是有效对象`);
        } else if (!command.action || !command.key) {
          console.warn(`[AI响应校验] tavern_commands[${index}]缺少必要字段(action/key)`);
        }
      });
    }
  }

  return { isValid: errors.length === 0, errors };
};

const isCanceledError = (error: unknown): boolean => {
  if (!error) return false;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  const message = error instanceof Error ? error.message : String(error);
  return /请求已取消|abort|aborted|canceled|cancelled/i.test(message);
};

// 重新请求AI响应（当结构验证失败时）
const retryAIResponse = async (
  userMessage: string,
  character: CharacterProfile,
  previousErrors: string[],
  maxRetries: number = 2
): Promise<GM_Response | null> => {
  console.log('[AI响应重试] 开始重试，之前的错误:', previousErrors);
  const resetSnapshot = aiResetToken;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!uiStore.isAIProcessing || aiResetToken !== resetSnapshot) {
        console.log('[AI响应重试] 已中止：检测到重置状态');
        return null;
      }
      console.log(`[AI响应重试] 第${attempt}次尝试`);

      // 🔥 重置流式内容，准备新的流式输出
      uiStore.setStreamingContent('');
      rawStreamingContent.value = '';

      // 🔥 生成新的 generation_id 用于流式传输
      const retryGenerationId = `gen_retry_${attempt}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      uiStore.setCurrentGenerationId(retryGenerationId);

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

      const options: Record<string, unknown> = {
        onProgressUpdate: (progress: string) => {
          console.log('[AI重试进度]', progress);
        },
        useStreaming: useStreaming.value, // 🔥 启用流式传输
        shouldAbort: () => !uiStore.isAIProcessing || aiResetToken !== resetSnapshot,
        generation_id: retryGenerationId  // 🔥 传递 generation_id
      };

      // 非酒馆环境（网页版自定义API）：需要设置 onStreamChunk 才能实时渲染
      if (!isTavernEnvFlag) {
        console.log('[网页版流式-重试] 设置 onStreamChunk 回调');
        resetStreamParseState(); // 重置解析状态
        (options as any).onStreamChunk = (chunk: string) => {
          if (!useStreaming.value || !chunk) return;
          console.log('[网页版流式-重试] 收到chunk:', chunk.length, '字符');
          handleStreamChunk(chunk);
        };
      }

      const aiResponse = await bidirectionalSystem.processPlayerAction(
        enhancedMessage,
        character,
        options
      );

      if (!uiStore.isAIProcessing || aiResetToken !== resetSnapshot) {
        console.log('[AI响应重试] 已中止：检测到重置状态');
        return null;
      }

      if (aiResponse) {
        const validation = validateAIResponse(aiResponse);
        if (validation.isValid) {
          console.log(`[AI响应重试] 第${attempt}次尝试成功`);
          return aiResponse;
        } else {
          console.warn(`[AI响应重试] 第${attempt}次尝试验证失败:`, validation.errors);
          previousErrors = validation.errors;
          // 继续下一次重试
        }
      }
    } catch (error) {
      if (isCanceledError(error) || !uiStore.isAIProcessing || aiResetToken !== resetSnapshot) {
        console.log('[AI响应重试] 已取消，停止重试');
        return null;
      }
      console.error(`[AI响应重试] 第${attempt}次尝试出错:`, error);
      // 继续下一次重试
    }
  }

  console.error('[AI响应重试] 所有重试尝试都失败了');
  return null;
};


// 存储原始流式内容（用于解析完整JSON）
const rawStreamingContent = ref('');
// 记录最近一次点击的行动推荐（用于判定“发送来源/被覆盖”）
const lastSelectedActionOption = ref('');

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

// 选择行动选项（默认替换输入框内容）
const selectActionOption = (option: string) => {
  const trimmed = (option || '').trim();
  if (!trimmed) return;

  lastSelectedActionOption.value = trimmed;
  inputText.value = trimmed;

  nextTick(() => {
    inputRef.value?.focus?.();
    adjustTextareaHeight();
  });
};

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
    // 检查气血
    if ((saveData as any).角色?.属性?.气血?.当前 !== undefined && (saveData as any).角色.属性.气血.当前 <= 0) {
      toast.error('角色已死亡，气血耗尽。无法继续游戏，请重新开始或复活角色。');
      return;
    }
    // 检查寿命（通过出生日期计算当前年龄，与寿元上限比较）
    const birthDate = (saveData as any).角色?.身份?.出生日期;
    const gameTime = (saveData as any).元数据?.时间;
    const lifespanLimit = (saveData as any).角色?.属性?.寿元上限;
    if (birthDate && gameTime && typeof lifespanLimit === 'number') {
      const currentAge = calculateAgeFromBirthdate(birthDate, gameTime);
      if (currentAge >= lifespanLimit) {
        toast.error('角色已死亡，寿元耗尽。无法继续游戏，请重新开始或复活角色。');
        return;
      }
    }
  }

  // 🔥 在发送消息前备份到"上次对话"（用于回滚）
  if (gameStateStore.conversationAutoSaveEnabled) {
    try {
      await characterStore.saveToSlot('上次对话');
      console.log('[上次对话] 已在发送消息前备份当前状态');
    } catch (backupError) {
      console.warn('[上次对话] 备份失败（非致命）:', backupError);
      // 备份失败不阻止发送消息
    }
  }

	  const userMessage = inputText.value.trim();
	  console.log('[前端] 用户输入 inputText.value:', inputText.value);
	  console.log('[前端] 处理后 userMessage:', userMessage);

	  // 🔍 仅用于UI展示：记录本回合“实际发送给AI”的用户输入（不写入存档/记忆）
	  uiStore.lastSentUserIntentText = userMessage;
	  if (lastSelectedActionOption.value && userMessage === lastSelectedActionOption.value) {
	    uiStore.lastSentUserIntentSource = 'action_option';
	  } else if (lastSelectedActionOption.value && userMessage.includes(lastSelectedActionOption.value)) {
	    uiStore.lastSentUserIntentSource = 'mixed';
	  } else if (userMessage) {
	    uiStore.lastSentUserIntentSource = 'manual';
	  } else {
	    uiStore.lastSentUserIntentSource = 'unknown';
	  }

  // 获取动作队列中的文本
  const actionQueueText = actionQueue.getActionPrompt();
  console.log('[前端] 动作队列 actionQueueText:', actionQueueText);

  let finalUserMessage = '';
  if (userMessage) {
    const combinedAction = actionQueueText ? `${userMessage}\n\n${actionQueueText}` : userMessage;
    finalUserMessage = `<行动趋向>${combinedAction}</行动趋向>
`;
  } else {
    finalUserMessage = actionQueueText ? `<行动趋向>${actionQueueText}</行动趋向>
` : '';
  }
  console.log('[前端] 最终发送 finalUserMessage:', finalUserMessage);

  // 清空动作队列（动作已经添加到消息中）
  if (actionQueueText) {
    actionQueue.clearActions();
  }

  // 重置输入框高度
  nextTick(() => {
    adjustTextareaHeight();
  });

  // 用户消息只作为行动趋向提示词，不添加到记忆中
  const resetSnapshot = aiResetToken;
  uiStore.setAIProcessing(true);
  persistAIProcessingState();

  // 🔥 重置流式内容，准备接收新的流式输出
  uiStore.setStreamingContent('');
  rawStreamingContent.value = ''; // 清除原始流式内容
  streamingMessageIndex.value = 1; // 设置一个虚拟索引以启用流式处理

  // 使用优化的AI请求系统进行双向交互
  let aiResponse: GM_Response | null = null;
  let hasError = false;

  try {
    // 获取当前角色
    const character = characterStore.activeCharacterProfile;

    if (!character) {
      throw new Error('角色数据缺失');
    }

    try {
      const options: Record<string, unknown> = {
        onProgressUpdate: (progress: string) => {
          console.log('[AI进度]', progress);
        },
        useStreaming: useStreaming.value,
        shouldAbort: () => !uiStore.isAIProcessing || aiResetToken !== resetSnapshot,
      };

      // 酒馆环境：流式通过事件系统处理（STREAM_TOKEN_RECEIVED_INCREMENTALLY）
      // 非酒馆环境（网页版自定义API）：需要设置 onStreamChunk 才能实时渲染
      if (!isTavernEnvFlag) {
        console.log('[网页版流式] 设置 onStreamChunk 回调');
        resetStreamParseState(); // 重置解析状态
        (options as any).onStreamChunk = (chunk: string) => {
          if (!useStreaming.value || !chunk) return;
          console.log('[网页版流式] 收到chunk:', chunk.length, '字符');
          handleStreamChunk(chunk);
        };
      }

      // 生成唯一的 generation_id
      const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      uiStore.setCurrentGenerationId(generationId);
      options.generation_id = generationId;

      // 添加图片上传支持
      if (selectedImages.value.length > 0) {
        options.image = selectedImages.value;
        console.log('[图片上传] 将发送', selectedImages.value.length, '张图片');
      }

      aiResponse = await bidirectionalSystem.processPlayerAction(
        finalUserMessage,
        character,
        options
      );

      if (!uiStore.isAIProcessing || aiResetToken !== resetSnapshot) {
        console.log('[AI响应处理] 已重置，忽略本次响应');
        aiResponse = null;
        return;
      }

      // 验证AI响应结构
      if (aiResponse) {
        const validation = validateAIResponse(aiResponse);
        if (!validation.isValid) {
          console.warn('[AI响应验证] 结构验证失败:', validation.errors);
          toast.warning('AI响应格式不正确，正在重试...');

          // 尝试重新生成
          const retryResponse = await retryAIResponse(
            finalUserMessage,
            character,
            validation.errors
          );

          if (!uiStore.isAIProcessing || aiResetToken !== resetSnapshot) {
            console.log('[AI响应处理] 已重置，停止重试结果处理');
            aiResponse = null;
            return;
          }

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


      // 🔥 流式传输完成回调已经在 onStreamComplete 中处理
      // 这里不需要再次清除流式状态
      console.log('[流式输出] AI响应处理开始');
      // isAIProcessing 会在 finally 块中统一设置为 false

      // --- 核心逻辑：整合最终文本并更新状态 ---
      let finalText = '';
      const gmResp = aiResponse; // aiResponse 本身就是 GM_Response

      console.log('[AI响应处理] 开始处理AI响应文本');
      console.log('[AI响应处理] aiResponse:', aiResponse);
      console.log('[AI响应处理] streamingContent:', streamingContent.value);

      // 优先从结构化响应中获取最准确的文本
      if (gmResp?.text && typeof gmResp.text === 'string') {
        finalText = gmResp.text;
        console.log('[AI响应处理] 使用 gmResponse.text 作为最终文本，长度:', finalText.length);
      } else if (streamingContent.value) {
        // 如果以上都没有，使用流式输出的最终结果作为备用
        // 🔥 从 JSON 响应中提取 text 字段
        finalText = extractTextFromJsonResponse(streamingContent.value);
        console.log('[AI响应处理] 使用 streamingContent 提取后作为最终文本，长度:', finalText.length);
      } else {
        console.warn('[AI响应处理] 未找到任何有效的文本内容');
      }

      console.log('[AI响应处理] 最终文本内容预览:', finalText.substring(0, 100) + '...');

      // 🔥 [重要] 记忆处理已在 AIBidirectionalSystem.processGmResponse 中完成
      // 包括：短期记忆、隐式中期记忆、叙事历史的添加
      // 这里只需要更新UI显示状态
      if (finalText) {
        console.log('[AI响应处理] 文本处理完成，记忆已由 AIBidirectionalSystem 处理');
        latestMessageText.value = gmResp?.text || null;

        // 更新UI显示
        if (currentNarrative.value) {
          // currentNarrative 现在自动显示最新短期记忆
          console.log('[AI响应处理] 已更新UI显示');
        }
      } else {
        latestMessageText.value = null;
        console.error('[AI响应处理] 没有找到有效的文本内容');
      }

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


      // 将新的状态变更保存到 uiStore 的内存中（会覆盖之前的）
      if (aiResponse.stateChanges) {
        uiStore.setCurrentMessageStateChanges(aiResponse.stateChanges);
        console.log('[日志面板] State changes received and stored in memory:', aiResponse.stateChanges);
      }


      // 检查角色死亡状态（在状态更新后）
      const currentSaveData = gameStateStore.toSaveData();
      if (currentSaveData) {
        // 检查气血
        if (currentSaveData.属性?.气血?.当前 !== undefined && currentSaveData.属性.气血.当前 <= 0) {
          toast.error('角色已死亡，气血耗尽');
        }
        // 检查寿命（通过出生日期计算当前年龄，与寿元上限比较）
        const birthDate2 = (currentSaveData as any).角色?.身份?.出生日期;
        const gameTime2 = (currentSaveData as any).元数据?.时间;
        const lifespanLimit2 = currentSaveData.属性?.寿元上限;
        if (birthDate2 && gameTime2 && typeof lifespanLimit2 === 'number') {
          const currentAge2 = calculateAgeFromBirthdate(birthDate2, gameTime2);
          if (currentAge2 >= lifespanLimit2) {
            toast.error('角色已死亡，寿元耗尽');
          }
        }
      }
    } else if (aiResponse) {
      console.log('[日志面板] No state changes received in this response.');
    }

    } catch (aiError) {
      if (isCanceledError(aiError) || !uiStore.isAIProcessing || aiResetToken !== resetSnapshot) {
        console.log('[AI处理失败] 已取消，停止后续处理');
        aiResponse = null;
        return;
      }
      console.error('[AI处理失败]', aiError);
      hasError = true;

      // 显示错误提示
      const errorMsg = aiError instanceof Error ? aiError.message : '未知错误';
      toast.error(`AI处理失败: ${errorMsg}`);

      // 🔥 清理流式输出状态（失败时清除所有流式内容）
      uiStore.setAIProcessing(false);
      streamingMessageIndex.value = null;
      uiStore.setStreamingContent('');
      rawStreamingContent.value = '';
      uiStore.setCurrentGenerationId(null);
      persistAIProcessingState();

      // 重要：不设置任何响应对象，确保后续处理跳过
      aiResponse = null;
    }

    // 系统消息直接覆盖当前叙述
    if (aiResponse && aiResponse.system_messages && Array.isArray(aiResponse.system_messages) && aiResponse.system_messages.length > 0) {
      // currentNarrative 现在自动显示最新短期记忆
    }

    // 🔥 [关键修复] 无论成功失败，都在这里清除AI处理状态
    // 成功的提示
    if (!hasError && aiResponse) {
      toast.success('天机重现');
      // 清空已发送的图片
      clearImages();
    }

    // 🔥 统一清除AI处理状态（成功路径）
    if (!hasError) {
      console.log('[AI响应处理] 处理完成，清除AI处理状态');
      uiStore.setAIProcessing(false);
      streamingMessageIndex.value = null;
      uiStore.setCurrentGenerationId(null);
      // 🔥 关键修复：清除流式内容，防止下次显示旧内容
      uiStore.resetStreamingState();
      rawStreamingContent.value = '';
      persistAIProcessingState();
    }

  } catch (error: unknown) {
    if (isCanceledError(error) || !uiStore.isAIProcessing || aiResetToken !== resetSnapshot) {
      console.log('[AI交互] 已取消，停止处理');
      return;
    }
    console.error('[AI交互] 处理失败:', error);
    hasError = true;

    // 显示错误提示
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    toast.error(`请求失败: ${errorMessage}`);

    // 🔥 清理流式输出状态（失败时清除所有流式内容）
    uiStore.setAIProcessing(false);
    streamingMessageIndex.value = null;
    uiStore.setStreamingContent('');
    rawStreamingContent.value = '';
    uiStore.setCurrentGenerationId(null);
    persistAIProcessingState();
  } finally {
    // 🔥 兜底机制：确保状态一定被清除
    if (isAIProcessing.value) {
      console.warn('[AI响应处理] finally块：状态未清除，强制清除（兜底）');
      uiStore.setAIProcessing(false);
      streamingMessageIndex.value = null;
      uiStore.resetStreamingState();
      rawStreamingContent.value = '';
      uiStore.setCurrentGenerationId(null);
      persistAIProcessingState();
    }

    // 最终统一存档（仅成功时）
    if (aiResponse) {
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
  }
};

// （移除逐条总结逻辑）不再对溢出的短期记忆逐条生成总结

// 键盘事件处理
// 格式化当前时间（用于显示当前北京时间 - 现实世界时间）
const formatCurrentTime = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');

  // 返回格式：2025-01-15 14:30:25（现实世界北京时间）
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
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
        短期记忆长度: memories?.length || 0,
        当前显示内容: currentNarrative.value?.content?.substring(0, 50) + '...'
      });

      // 🔥 [核心修复] 优先从叙事历史加载最新内容并同步指令日志
      if (gameStateStore.narrativeHistory && gameStateStore.narrativeHistory.length > 0) {
        const latestNarrative = gameStateStore.narrativeHistory[gameStateStore.narrativeHistory.length - 1];

        // 🔥 [关键修复] 每次加载存档都要同步指令日志到最新叙事的stateChanges
        if (latestNarrative.stateChanges) {
          uiStore.setCurrentMessageStateChanges(latestNarrative.stateChanges);
          console.log('[主面板] ✅ 已同步指令日志到最新叙事', {
            变更数量: latestNarrative.stateChanges.changes?.length || 0
          });
        }

        // 如果短期记忆为空，从叙事历史同步内容
        if (!memories || memories.length === 0) {
          if (latestNarrative.content) {
            gameStateStore.addToShortTermMemory(latestNarrative.content);
            console.log('[主面板] ✅ 已从叙事历史同步内容到短期记忆');
          }
        }
      } else if (memories && memories.length > 0) {
        // 回退：从短期记忆加载（旧版本存档，没有叙事历史）
        console.log('[主面板] ⚠️ 从短期记忆加载（无叙事历史）');
        // currentNarrative 现在自动显示最新短期记忆
      } else {
        // 未找到记忆或叙事历史，显示欢迎信息
        console.log('[主面板] 未找到叙事记录，显示欢迎信息');
        // currentNarrative 现在自动显示最新短期记忆
      }
      await syncGameState();
    } else {
      // 没有激活的角色
      // currentNarrative 现在自动显示最新短期记忆
    }
    nextTick(() => {
      if (contentAreaRef.value) {
        contentAreaRef.value.scrollTop = contentAreaRef.value.scrollHeight;
      }
    });
  } catch (error) {
    console.error('[主面板] 初始化存档数据失败:', error);
    // currentNarrative 现在自动显示最新短期记忆
  }
};

// 重置面板状态以进行存档切换
const resetPanelState = () => {
  console.log('[主面板] 检测到存档切换，正在重置面板状态...');
  actionQueue.clearActions();
  // currentNarrative 现在自动显示最新短期记忆
  inputText.value = '';
  latestMessageText.value = null;

  // --- 重置命令日志相关状态 ---

  // isAIProcessing 在切换存档时应重置为 false
  uiStore.setAIProcessing(false);
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

    // 监听来自其他面板的“填充/发送到对话”事件（替代复制提示词）
    chatBus.on('prefill', handleChatPrefill);
    chatBus.on('send', handleChatSend);

    // 🔥 监听酒馆助手的生成事件
    if (isTavernEnvFlag) {
      const helper = getTavernHelper();
      if (helper) {
        console.log('[主面板] 注册酒馆事件监听');

      // 🔥 使用全局 eventOn 函数监听流式事件
      const eventOn = (window as unknown as Record<string, unknown>).eventOn;
      const iframe_events = (window as unknown as Record<string, unknown>).TavernHelper as Record<string, unknown>;

      // 🔥 防止重复注册：只在第一次挂载时注册事件监听器（使用全局标志）
      const listenersRegistered = Boolean(globalWindowState[GLOBAL_EVENT_KEY]);
      if (eventOn && iframe_events && typeof eventOn === 'function' && !listenersRegistered) {
        const events = (iframe_events as unknown as { iframe_events: Record<string, string> }).iframe_events;

        // 🔥 创建事件处理函数并保存到全局
        const globalHandlers = globalWindowState[GLOBAL_HANDLERS_KEY] as Record<string, unknown>;

        // 🔥 辅助函数：检查 generationId 是否匹配（支持分步生成的 _step1/_step2 后缀）
        const isMatchingGenerationId = (eventId: string): boolean => {
          const currentId = currentGenerationId.value;
          if (!currentId || !eventId) return false;
          // 精确匹配 或 分步生成后缀匹配（eventId 以 currentId 开头，后面是 _step）
          return eventId === currentId || eventId.startsWith(currentId + '_step');
        };

        globalHandlers.onGenerationStarted = (generationId: string) => {
          if (isMatchingGenerationId(generationId)) {
            const currentId = currentGenerationId.value;
            const isStep2 = currentId ? generationId.startsWith(`${currentId}_step2`) : false;
            if (isStep2) return;
            uiStore.setStreamingContent('');
            rawStreamingContent.value = '';
            console.log('[流式输出] GENERATION_STARTED - 已重置状态');
          }
        };

        globalHandlers.onStreamToken = (chunk: string, generationId: string) => {
          if (isMatchingGenerationId(generationId) && useStreaming.value && chunk) {
            const currentId = currentGenerationId.value;
            const isStep2 = currentId ? generationId.startsWith(`${currentId}_step2`) : false;
            if (isStep2) return;
            // 增量追加到原始内容
            rawStreamingContent.value += chunk;
            uiStore.setStreamingContent(rawStreamingContent.value);
          }
        };

        globalHandlers.onGenerationEnded = (generationId: string) => {
          if (isMatchingGenerationId(generationId)) {
            console.log('[流式输出] GENERATION_ENDED 事件触发，清除AI处理状态');
            // 不在这里立即清除，让 sendMessage 的成功路径处理
            // 这里只是确保事件被触发的日志
          }
        };

        // 🔥 注册事件监听器
        eventOn(events.GENERATION_STARTED, globalHandlers.onGenerationStarted);
        eventOn(events.STREAM_TOKEN_RECEIVED_INCREMENTALLY, globalHandlers.onStreamToken);
        eventOn(events.GENERATION_ENDED, globalHandlers.onGenerationEnded);

        globalWindowState[GLOBAL_EVENT_KEY] = true;
        console.log('[主面板] ✅ 流式事件监听器已注册（全局唯一）');
      } else if (listenersRegistered) {
        console.log('[主面板] ⏭️ 跳过事件监听器注册（全局已注册）');
      }

        console.log('[主面板] ✅ 事件监听器注册完成');
      } else {
        console.warn('[主面板] ⚠️ 酒馆助手不可用，事件监听未注册');
      }
    }

  } catch (error) {
    console.error('[主面板] 首次挂载失败:', error);
    // currentNarrative 现在自动显示最新短期记忆
  }
});

// 组件激活时恢复AI处理状态（适用于keep-alive或面板切换）
onActivated(() => {
  console.log('[主面板] 组件激活，恢复AI处理状态');
  restoreAIProcessingState();
});

// 🔥 组件卸载时清理事件监听器（使用全局标志）
onUnmounted(() => {
  console.log('[主面板] 组件卸载，清理事件监听器');

  chatBus.off('prefill', handleChatPrefill);
  chatBus.off('send', handleChatSend);

  if (!isTavernEnvFlag) {
    return;
  }

  // 尝试移除事件监听器
  try {
    const eventOff = (window as unknown as Record<string, unknown>).eventOff;
    const iframe_events = (window as unknown as Record<string, unknown>).TavernHelper as Record<string, unknown>;

    const listenersRegistered = Boolean(globalWindowState[GLOBAL_EVENT_KEY]);
    if (eventOff && iframe_events && typeof eventOff === 'function' && listenersRegistered) {
      const events = (iframe_events as unknown as { iframe_events: Record<string, string> }).iframe_events;
      const globalHandlers = globalWindowState[GLOBAL_HANDLERS_KEY] as Record<string, unknown>;

      if (globalHandlers.onGenerationStarted) {
        eventOff(events.GENERATION_STARTED, globalHandlers.onGenerationStarted);
      }
      if (globalHandlers.onStreamToken) {
        eventOff(events.STREAM_TOKEN_RECEIVED_INCREMENTALLY, globalHandlers.onStreamToken);
      }
      if (globalHandlers.onGenerationEnded) {
        eventOff(events.GENERATION_ENDED, globalHandlers.onGenerationEnded);
      }

      globalWindowState[GLOBAL_EVENT_KEY] = false;
      globalWindowState[GLOBAL_HANDLERS_KEY] = {};
      console.log('[主面板] ✅ 事件监听器已清理（全局）');
    }
  } catch (error) {
    console.warn('[主面板] ⚠️ 清理事件监听器失败:', error);
  }
});

// 🔥 监听用户滚动，检测是否手动向上滚动
const handleContentScroll = () => {
  if (!contentAreaRef.value) return;
  const el = contentAreaRef.value;
  // 如果距离底部超过 100px，认为用户手动向上滚动了
  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
  userHasScrolledUp.value = distanceFromBottom > 100;
};

// 🔥 监听流式内容变化，自动滚动到底部（可被用户打断）
watch(streamingContent, () => {
  // 如果用户手动向上滚动了，不自动跟随
  if (userHasScrolledUp.value) return;

  if (streamingContent.value && contentAreaRef.value) {
    nextTick(() => {
      contentAreaRef.value!.scrollTop = contentAreaRef.value!.scrollHeight;
    });
  }
});

// 🔥 当新的流式传输开始时，重置滚动状态
watch(isAIProcessing, (newVal, oldVal) => {
  if (newVal && !oldVal) {
    // 新的AI处理开始，重置用户滚动状态
    userHasScrolledUp.value = false;
  }
});

// 🔥 [核心修复] 监听叙事历史变化，自动更新 currentNarrative 为最新一条
watch(() => gameStateStore.narrativeHistory, (newHistory) => {
  if (newHistory && newHistory.length > 0) {
    const latestNarrative = newHistory[newHistory.length - 1];
    // currentNarrative 现在自动显示最新短期记忆

    // 同步更新 uiStore 中的状态变更，确保命令日志可用
    if (latestNarrative.stateChanges) {
      uiStore.setCurrentMessageStateChanges(latestNarrative.stateChanges);
      console.log('[主面板] ✅ 已更新指令日志', {
        变更数量: latestNarrative.stateChanges.changes?.length || 0,
        前3条: latestNarrative.stateChanges.changes?.slice(0, 3).map(c => c.key) || []
      });
    } else {
      console.warn('[主面板] ⚠️ 最新叙事没有状态变更记录');
    }
  }
}, { deep: true });


// 初始化系统连接
const initializeSystemConnections = async () => {
  try {
    console.log('[主面板] 初始化系统连接...');

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
/* 快照回退样式 */
.rollback-group {
  position: relative;
  display: flex;
  gap: 4px;
}

.snapshot-btn {
  position: relative;
}

.snapshot-count {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #3b82f6;
  color: white;
  font-size: 11px;
  font-weight: 700;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.snapshot-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  min-width: 200px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 100;
}

.snapshot-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
}

.snapshot-item:hover {
  background: var(--color-surface-hover);
}

.snapshot-item:last-child {
  border-bottom: none;
}

.snapshot-label {
  font-size: 13px;
  color: var(--color-text);
}

.snapshot-time {
  font-size: 11px;
  color: var(--color-text-secondary);
}

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
  background: var(--color-surface);
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

/* 思维链区域样式 */
.thinking-section {
  margin: 12px 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%);
  border: 1px solid #fcd34d;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0; /* 防止被挤压 */
  min-width: 0; /* 允许内容收缩但不被完全挤压 */
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.thinking-header:hover {
  background: rgba(251, 191, 36, 0.15);
}

.thinking-icon {
  color: #d97706;
  flex-shrink: 0;
}

.thinking-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #92400e;
  flex: 1;
}

.thinking-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 10px;
}

.thinking-badge.streaming {
  color: #b45309;
  background: rgba(251, 191, 36, 0.3);
  animation: pulse 1.5s ease-in-out infinite;
}

.thinking-badge.completed {
  color: #166534;
  background: rgba(34, 197, 94, 0.2);
  animation: none;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.expand-icon {
  color: #b45309;
  flex-shrink: 0;
}

.thinking-content {
  padding: 12px 14px;
  border-top: 1px solid rgba(251, 191, 36, 0.3);
  font-size: 0.85rem;
  color: #78350f;
  line-height: 1.6;
  max-height: 300px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.5);
}

/* 思维链展开动画 */
.thinking-expand-enter-active,
.thinking-expand-leave-active {
  transition: all 0.3s ease;
}

.thinking-expand-enter-from,
.thinking-expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
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
  background-color: var(--color-surface) !important; /* 提亮叙事区域但不刺眼 */
  overflow-x: hidden; /* 防止水平滚动条 */
  overflow-y: auto; /* 允许垂直滚动 */
  padding-right: 12px; /* 给斜体字留出空间，防止被滚动条截断 */
}

/* 流式输出内容样式 */
.streaming-narrative-content {
  margin-top: 16px;
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  animation: fadeIn 0.3s ease-in;
}

/* 用户本回合输入展示（仅UI；不进入记忆/存档） */
.last-user-intent {
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  background: rgba(var(--color-primary-rgb), 0.05);
}

.last-user-intent-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.last-user-intent-header .k {
  font-weight: 700;
  color: var(--color-text);
}

.last-user-intent-header .badge {
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: 700;
}

.last-user-intent-text {
  white-space: pre-wrap;
  line-height: 1.55;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

.streaming-text,
.narrative-text {
  line-height: 1.8;
  color: var(--color-text);
  font-size: var(--base-font-size, 1rem);
  max-width: 100%;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.content-area {
  background-color: var(--color-surface) !important; /* 提亮内容区 */
  padding: 20px 8px 20px 20px; /* 右侧留小间距给滚动条 */
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  /* 显示可见的滚动拇指，轨道透明 */
  scrollbar-color: var(--color-border) transparent;
  box-sizing: border-box;
  min-height: 200px;
  display: flex; /* 让子元素可以撑满高度 */
  box-shadow: none !important; /* 移除阴影 */
}

/* 深色主题下 content-area 背景与内部一致 */
[data-theme="dark"] .content-area {
  background-color: #1E293B !important;
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
  background-color: var(--color-border);
}

/* 悬停时略微增强可见度 */
.content-area:hover::-webkit-scrollbar-thumb {
  background-color: var(--color-text-secondary);
}

.content-area::-webkit-scrollbar-button {
  display: none;
}

.content-area::-webkit-scrollbar-corner {
  background: transparent;
}


/* AI处理状态指示器（生成时显示在顶部） */
.ai-processing-indicator {
  width: 100%;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
  flex-shrink: 0; /* 防止被挤压 */
  box-sizing: border-box;
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

/* 流式状态元数据布局 */
.streaming-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
}

.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--color-primary);
  font-weight: 500;
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
  background: var(--color-surface);
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
  scrollbar-color: transparent transparent;
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
  background-color: transparent;
}

.input-container .game-input:hover::-webkit-scrollbar-thumb {
  background-color: transparent;
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

.action-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  margin-bottom: 16px;
}

.action-option-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  white-space: normal;
  word-break: break-word;
  max-width: 100%;
  text-align: center;
  flex: 0 1 auto;
  min-width: 0;
}

.action-option-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.4);
}

/* 绘图按钮 */
.header-action-btn.image-gen-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-primary);
  /* cursor: pointer; */
  padding: 6px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  margin-right: 4px;
}

.header-action-btn.image-gen-btn:hover:not(:disabled) {
  background: rgba(var(--color-primary-rgb), 0.1);
  transform: scale(1.1);
  box-shadow: 0 0 10px rgba(var(--color-primary-rgb), 0.3);
}

.header-action-btn.image-gen-btn:disabled {
  opacity: 0.6;
  cursor: wait;
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

.header-action-btn.event-btn {
  background: rgba(99, 102, 241, 0.10);
  border: 1px solid rgba(99, 102, 241, 0.20);
  color: rgba(99, 102, 241, 0.95);
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.header-action-btn.event-btn:hover {
  background: rgba(99, 102, 241, 0.16);
  border-color: rgba(99, 102, 241, 0.35);
}

.traveling-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(234, 88, 12, 0.95);
  background: rgba(234, 88, 12, 0.12);
  border: 1px solid rgba(234, 88, 12, 0.25);
  white-space: nowrap;
}

[data-theme="dark"] .header-action-btn.event-btn {
  background: rgba(99, 102, 241, 0.16);
  border-color: rgba(99, 102, 241, 0.25);
  color: rgba(165, 180, 252, 0.95);
}

[data-theme="dark"] .traveling-badge {
  color: rgba(251, 146, 60, 0.95);
  background: rgba(251, 146, 60, 0.16);
  border-color: rgba(251, 146, 60, 0.28);
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
  width: 42px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  min-height: 32px;
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.25);
  margin-left: 8px;
}

.send-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
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
  background: var(--color-background);
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
  background-color: #1E293B !important;
}

/* 深色主题 - 流式输出内容 */
[data-theme="dark"] .streaming-narrative-content {
  background: var(--color-surface);
  border-color: var(--color-border);
}

[data-theme="dark"] .streaming-text {
  color: #e2e8f0;
}


[data-theme="dark"] .ai-processing-display {
  background: var(--color-background) !important;
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
  background: #1E293B !important;
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

/* 思维链深色主题 */
[data-theme="dark"] .thinking-section {
  background: linear-gradient(135deg, #422006 0%, #451a03 100%);
  border-color: #92400e;
}

[data-theme="dark"] .thinking-header:hover {
  background: rgba(251, 191, 36, 0.1);
}

[data-theme="dark"] .thinking-icon {
  color: #fbbf24;
}

[data-theme="dark"] .thinking-title {
  color: #fcd34d;
}

[data-theme="dark"] .thinking-badge.streaming {
  color: #fcd34d;
  background: rgba(251, 191, 36, 0.2);
}

[data-theme="dark"] .thinking-badge.completed {
  color: #86efac;
  background: rgba(34, 197, 94, 0.15);
}

[data-theme="dark"] .expand-icon {
  color: #fbbf24;
}

[data-theme="dark"] .thinking-content {
  background: rgba(0, 0, 0, 0.2);
  border-top-color: rgba(251, 191, 36, 0.2);
  color: #fef3c7;
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
  background: var(--color-surface);
  border-radius: 12px;
  max-width: 480px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.action-config-modal {
  background: var(--color-surface);
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
  background: var(--color-surface);
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
  border-color: rgba(20, 184, 166, 0.2);
  background: rgba(20, 184, 166, 0.03);
}

.quick-action-btn.social:hover {
  border-color: #14b8a6;
  background: rgba(20, 184, 166, 0.08);
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
  background: var(--color-surface);
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
  background: var(--color-surface);
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

/* Cultivation Panel */
.cultivation-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001; /* Higher than action modal */
  backdrop-filter: blur(4px);
}

.cultivation-panel {
  background: linear-gradient(145deg, #f9fafb, #f3f4f6);
  border-radius: 16px;
  width: 90%;
  max-width: 800px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  animation: modal-appear 0.4s cubic-bezier(0.25, 1, 0.5, 1);
}

.cultivation-panel .panel-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cultivation-panel .panel-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 10px;
}

.cultivation-panel .panel-content {
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
}

.cultivation-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.cultivation-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
  border-color: #a5b4fc;
}

.cultivation-card .card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.cultivation-card .card-icon {
  color: #6366f1;
}
.cultivation-zap .card-icon { color: #f59e0b; }
.cultivation-shield .card-icon { color: #3b82f6; }
.cultivation-braincircuit .card-icon { color: #8b5cf6; }

.cultivation-card .card-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #111827;
}

.cultivation-card .card-description {
  font-size: 0.85rem;
  color: #4b5563;
  line-height: 1.6;
  flex-grow: 1;
  margin: 0 0 16px 0;
}

.cultivation-card .card-config {
  margin-bottom: 16px;
}

.cultivation-card .config-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 8px;
  display: block;
}

.cultivation-card .time-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cultivation-card .time-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  outline: none;
  opacity: 0.7;
  transition: opacity .2s;
}
.cultivation-card .time-slider:hover {
  opacity: 1;
}
.cultivation-card .time-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #6366f1;
  cursor: pointer;
  border-radius: 50%;
}
.cultivation-card .time-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #6366f1;
  cursor: pointer;
  border-radius: 50%;
}

.cultivation-card .time-display {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1f2937;
  min-width: 50px;
  text-align: right;
}

.start-cultivation-btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: #4f46e5;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.start-cultivation-btn:hover {
  background: #4338ca;
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);
}

.cultivation-zap .start-cultivation-btn { background: #f59e0b; }
.cultivation-zap .start-cultivation-btn:hover { background: #d97706; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3); }
.cultivation-shield .start-cultivation-btn { background: #3b82f6; }
.cultivation-shield .start-cultivation-btn:hover { background: #2563eb; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3); }
.cultivation-braincircuit .start-cultivation-btn { background: #8b5cf6; }
.cultivation-braincircuit .start-cultivation-btn:hover { background: #7c3aed; box-shadow: 0 4px 10px rgba(139, 92, 246, 0.3); }

/* Dark theme for cultivation panel */
[data-theme="dark"] .cultivation-panel {
  background: linear-gradient(145deg, #1f2937, #111827);
  border-color: #374151;
}
[data-theme="dark"] .cultivation-panel .panel-header {
  border-color: #374151;
}
[data-theme="dark"] .cultivation-panel .panel-header h3 {
  color: #f3f4f6;
}
[data-theme="dark"] .cultivation-card {
  background: #1f2937;
  border-color: #374151;
}
[data-theme="dark"] .cultivation-card:hover {
  border-color: #a5b4fc;
}
[data-theme="dark"] .cultivation-card .card-title {
  color: #f9fafb;
}
[data-theme="dark"] .cultivation-card .card-description {
  color: #9ca3af;
}
[data-theme="dark"] .cultivation-card .config-label {
  color: #9ca3af;
}
[data-theme="dark"] .cultivation-card .time-slider {
  background: #4b5563;
}
[data-theme="dark"] .cultivation-card .time-display {
  color: #f3f4f6;
}


/* 手机端响应式修复 */
@media (max-width: 768px) {
  .main-game-panel {
    width: 100%;
    max-width: 100vw;
    overflow-x: hidden;
  }

  .content-area {
    padding: 4px;
    overflow-x: hidden;
    width: 100%;
    box-sizing: border-box;
  }

  .current-narrative {
    min-width: 0;
    max-width: 100%;
    overflow-x: hidden;
    width: 100%;
  }

  .streaming-narrative-content,
  .narrative-content {
    overflow-x: hidden;
    word-wrap: break-word;
    overflow-wrap: break-word;
    max-width: 100%;
    padding: 8px;
  }

  .streaming-text,
  .narrative-text {
    max-width: 100%;
    overflow-x: hidden;
    word-wrap: break-word;
    overflow-wrap: break-word;
    font-size: 0.85rem;
  }

  .input-wrapper {
    gap: 4px;
    padding: 4px;
    width: 100%;
    box-sizing: border-box;
  }

  .input-container {
    min-width: 0;
    flex: 1;
  }

  .game-input {
    font-size: 0.85rem;
    padding: 6px 8px;
  }

  .send-button {
    padding: 8px 12px;
    flex-shrink: 0;
    min-width: 44px;
  }

  .stream-toggle-inside {
    font-size: 0.75rem;
    padding: 0 6px;
  }
}
</style>
