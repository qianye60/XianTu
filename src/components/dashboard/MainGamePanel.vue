<template>
  <div class="story">
    <div ref="contentAreaRef" class="story-scroll" @scroll="handleContentScroll">
      <article class="page">
        <!-- 回合印记 -->
        <header class="turn-bar">
          <span class="turn-line" aria-hidden="true"></span>
          <template v-if="isAIProcessing">
            <span class="turn-state">
              <span class="pulse-dot" aria-hidden="true"></span>
              {{ streamingContent ? `${t('天机流转')} · ${streamingCharCount} ${t('字')}` : t('天道感应中...') }}
            </span>
            <button type="button" class="turn-btn" :title="t('如果长时间无响应，点击此处重置状态')" @click="forceResetAIProcessingState">
              <RotateCcw :size="14" /><span>{{ t('重置') }}</span>
            </button>
          </template>
          <template v-else>
            <span class="turn-time">{{ gameTimeLabel }}</span>
            <button v-if="snapshots.length > 0" type="button" class="turn-btn" :title="t('回退到上一条对话')" @click="rollbackToLastSnapshot">
              <History :size="14" /><span>{{ t('回退') }}</span><em>{{ snapshots.length }}</em>
            </button>
            <button type="button" class="turn-btn" :title="t('世界事件')" @click="openEventsPanel">
              <Bell :size="14" /><span>{{ t('事件') }}</span>
            </button>
            <button
              type="button"
              class="turn-btn"
              :disabled="currentNarrativeStateChanges.length === 0"
              :title="currentNarrativeStateChanges.length > 0 ? t('查看本次对话的变更日志') : t('本次对话无变更记录')"
              @click="showStateChanges(currentNarrative.stateChanges)"
            >
              <FileClock :size="14" /><span>{{ t('变更') }}</span><em>{{ currentNarrativeStateChanges.length }}</em>
            </button>
          </template>
          <span class="turn-line" aria-hidden="true"></span>
        </header>

        <!-- 思维链 -->
        <section v-if="thinkingContent || lastThinkingContent" class="thinking" :class="{ open: thinkingExpanded }">
          <button type="button" class="thinking-head" :aria-expanded="thinkingExpanded" @click="uiStore.toggleThinkingExpanded()">
            <BrainCircuit :size="15" />
            <span class="thinking-title">{{ t('思维过程') }}</span>
            <span class="thinking-state" :class="{ live: isThinkingPhase }">{{ isThinkingPhase ? t('思考中...') : t('已完成') }}</span>
            <ChevronDown :size="15" class="thinking-caret" />
          </button>
          <div v-if="thinkingExpanded" class="thinking-body">
            <FormattedText :text="thinkingContent || lastThinkingContent" />
          </div>
        </section>

        <!-- 玩家上一句 -->
        <div v-if="uiStore.lastSentUserIntentText && (streamingContent || !isAIProcessing)" class="intent">
          <span class="gm-seal" aria-hidden="true">{{ t('我') }}</span>
          <p class="intent-text">{{ uiStore.lastSentUserIntentText }}</p>
          <span v-if="uiStore.lastSentUserIntentSource === 'action_option'" class="gm-chip gold">{{ t('行动推荐') }}</span>
          <span v-else-if="uiStore.lastSentUserIntentSource === 'mixed'" class="gm-chip gold">{{ t('含推荐') }}</span>
        </div>

        <!-- 正文 -->
        <div v-if="isAIProcessing && streamingContent" class="prose">
          <FormattedText :text="streamingContent" />
        </div>
        <template v-else-if="currentNarrative">
          <div class="prose">
            <FormattedText :text="currentNarrative.content" />
          </div>
          <section v-if="turnImages.length" class="story-images" :aria-label="t('本回合插图')">
            <figure v-for="image in turnImages" :key="image.id">
              <img v-if="image.dataUrl" :src="image.dataUrl" :alt="image.prompt" />
              <figcaption v-else>{{ image.status === 'failed' ? (image.error || t('图片生成失败')) : t('图片生成中...') }}</figcaption>
            </figure>
          </section>

          <section
            v-if="uiStore.enableActionOptions && currentNarrative.actionOptions?.length"
            class="choices"
            :class="{ busy: isAIProcessing, single: currentNarrative.actionOptions.length > 6 }"
            :aria-label="t('行动选项')"
          >
            <h3 class="choices-title">{{ t('何去何从') }}</h3>
            <ol class="choice-list">
              <li v-for="(option, index) in currentNarrative.actionOptions" :key="index">
                <button type="button" class="choice" :disabled="isAIProcessing" @click="selectActionOption(option)">
                  <span class="choice-no">{{ optionNumeral(index) }}</span>
                  <span class="choice-text">{{ option }}</span>
                </button>
              </li>
            </ol>
          </section>
        </template>
        <div v-else class="gm-empty" data-glyph="机">
          <p>{{ t('静待天机变化...') }}</p>
        </div>
      </article>
    </div>

    <!-- 输入区 -->
    <footer class="composer">
      <div class="composer-inner">
        <div v-if="actionQueue.pendingActions.length > 0" class="queue">
          <span class="queue-label">{{ t('最近操作') }}</span>
          <ul class="queue-list">
            <li v-for="(action, index) in actionQueue.pendingActions" :key="action.id" class="gm-chip">
              <span class="queue-text">{{ action.description }}</span>
              <button
                type="button"
                class="queue-x"
                :title="isUndoableAction(action) ? t('撤回并恢复') : t('删除此动作')"
                :aria-label="isUndoableAction(action) ? t('撤回并恢复') : t('删除此动作')"
                @click="removeActionFromQueue(index)"
              >
                <X :size="12" />
              </button>
            </li>
          </ul>
          <button type="button" class="queue-clear" @click="clearActionQueue">{{ t('清空') }}</button>
        </div>

        <div class="input-row" :class="{ focused: isInputFocused }">
          <div v-if="showMemorySection" class="memo">
            <button
              type="button"
              class="memo-btn"
              :class="{ open: memoryExpanded }"
              :aria-expanded="memoryExpanded"
              :title="t('短期记忆')"
              @click="toggleMemory"
            >
              <ScrollText :size="15" />
              <span>{{ t('短期记忆') }}</span>
              <em v-if="recentMemories.length">{{ recentMemories.length }}</em>
            </button>
            <div v-if="memoryExpanded" class="memo-pop">
              <ol v-if="recentMemories.length" class="memo-list">
                <li v-for="(memory, index) in recentMemories" :key="index">{{ memory }}</li>
              </ol>
              <p v-else class="memo-empty">{{ t('脑海中一片清净，尚未留下修行痕迹...') }}</p>
            </div>
          </div>

          <input ref="imageInputRef" type="file" multiple accept="image/*" hidden @change="handleImageSelect" />

          <div class="input-box">
            <div v-if="selectedImages.length > 0" class="thumbs">
              <div v-for="(image, index) in selectedImages" :key="index" class="thumb">
                <img :src="getImagePreviewUrl(image)" :alt="image.name" />
                <button type="button" :aria-label="t('移除图片')" @click="removeImage(index)"><X :size="12" /></button>
              </div>
            </div>
            <textarea
              ref="inputRef"
              v-model="inputText"
              class="game-input"
              rows="1"
              wrap="soft"
              :placeholder="hasActiveCharacter ? t('请输入您的选择或行动...') : t('请先选择角色...')"
              :disabled="!hasActiveCharacter || isAIProcessing"
              @focus="isInputFocused = true"
              @blur="isInputFocused = false"
              @keydown="handleKeyDown"
              @input="handleInput"
            ></textarea>
          </div>

          <button
            type="button"
            class="send"
            :class="{ stop: isAIProcessing }"
            :disabled="isAIProcessing ? false : (!inputText.trim() || !hasActiveCharacter)"
            :title="isAIProcessing ? t('取消本次请求') : t('发送')"
            :aria-label="isAIProcessing ? t('取消本次请求') : t('发送')"
            @click="isAIProcessing ? cancelCurrentRequest() : sendMessage()"
          >
            <Loader2 v-if="isAIProcessing" :size="16" class="cc-spin" />
            <span v-else>{{ t('落笔') }}</span>
          </button>
        </div>

        <div v-if="thinkingLevelVisible" class="thinking-control-row">
          <div class="thinking-control-label">
            <BrainCircuit :size="14" />
            <span>{{ t('思考强度') }}</span>
          </div>
          <div class="thinking-levels" role="radiogroup" :aria-label="t('思考强度')">
            <button
              v-for="option in thinkingLevelOptions"
              :key="option.value"
              type="button"
              role="radio"
              :aria-checked="currentThinkingLevel === option.value"
              :class="{ active: currentThinkingLevel === option.value }"
              :title="t(option.hint)"
              :disabled="isAIProcessing"
              @click="updateCurrentThinkingLevel(option.value)"
            >
              {{ t(option.label) }}
            </button>
          </div>
          <small v-if="mainAPI?.model" class="thinking-model">{{ mainAPI.model }}</small>
        </div>

        <PublicQuotaBar />
      </div>

      <!-- 快捷行动（入口未开放，保留逻辑） -->
      <div v-if="showActionModal" class="cc-modal-overlay" @click.self="hideActionSelector">
        <div class="cc-modal" role="dialog" aria-modal="true" :aria-label="t('快捷行动')">
          <div class="cc-modal-head">
            <h2 class="cc-modal-title">{{ t('快捷行动') }}</h2>
            <button type="button" class="cc-modal-close" :aria-label="t('关闭')" @click="hideActionSelector"><X :size="18" /></button>
          </div>
          <div class="cc-modal-body quick-grid">
            <button v-for="action in flatActions" :key="action.name" type="button" class="cc-btn" @click="selectAction(action)">{{ action.name }}</button>
          </div>
        </div>
      </div>

      <div v-if="selectedAction" class="cc-modal-overlay" @click.self="cancelAction">
        <div class="cc-modal" role="dialog" aria-modal="true" :aria-label="selectedAction.name">
          <div class="cc-modal-head">
            <h2 class="cc-modal-title">{{ selectedAction.name }}</h2>
            <button type="button" class="cc-modal-close" :aria-label="t('关闭')" @click="cancelAction"><X :size="18" /></button>
          </div>
          <div class="cc-modal-body">
            <p class="cc-hint">{{ selectedAction.description }}</p>
            <div v-if="selectedAction.timeRequired" class="cc-field">
              <label>{{ t('修炼时间') }}</label>
              <div class="cc-segmented">
                <button
                  v-for="timeOption in timeOptions"
                  :key="timeOption.value"
                  type="button"
                  :class="{ active: selectedTime === timeOption.value }"
                  @click="selectedTime = timeOption.value"
                >
                  {{ timeOption.label }}
                </button>
              </div>
              <label class="time-custom">
                {{ t('自定义：') }}
                <input v-model.number="customTime" type="number" min="1" max="365" class="cc-input" />
                {{ t('天') }}
              </label>
            </div>
            <div v-if="selectedAction.options" class="cc-field">
              <label>{{ t('选项') }}</label>
              <div class="cc-segmented">
                <label v-for="option in selectedAction.options" :key="option.key">
                  <input v-model="selectedOption" type="radio" :name="'option-' + selectedAction.name" :value="option.key" />
                  <span>{{ option.label }}</span>
                </label>
              </div>
            </div>
          </div>
          <div class="cc-modal-foot">
            <button type="button" class="cc-btn" @click="cancelAction">{{ t('取消') }}</button>
            <button type="button" class="cc-btn primary" @click="confirmAction">{{ t('确认') }}</button>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated, onUnmounted, nextTick, computed, watch } from 'vue';
import {
  Loader2, ChevronDown, ScrollText, RotateCcw, Shield, BrainCircuit, Bell, History, FileClock, X
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
import { aiService, type APIProvider, type ThinkingLevel } from '@/services/aiService';
import { useAPIManagementStore } from '@/stores/apiManagementStore';
import { extractStreamingNarrative, extractTextFromJsonResponse } from '@/utils/textSanitizer';
import FormattedText from '@/components/common/FormattedText.vue';
import PublicQuotaBar from '@/components/publicApi/PublicQuotaBar.vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import { getSnapshots, snapshotVersion } from '@/utils/snapshotManager';
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
// 流式原文可能是 {"text":"…"} 这样的 JSON，显示前取出正文并还原转义
const streamingContent = computed(() => extractStreamingNarrative(uiStore.streamingContent));
const currentGenerationId = computed(() => uiStore.currentGenerationId);
const streamingCharCount = computed(() => streamingContent.value.length);

// 🔥 思维链状态
const thinkingContent = computed(() => uiStore.thinkingContent);
const isThinkingPhase = computed(() => uiStore.isThinkingPhase);
const thinkingExpanded = computed(() => uiStore.thinkingExpanded);

const THINKING_PROVIDERS: APIProvider[] = ['claude', 'gemini', 'deepseek', 'volcengine'];
const thinkingLevelOptions: Array<{ value: ThinkingLevel; label: string; hint: string }> = [
  { value: 'default', label: '默认', hint: '由模型自行决定思考深度' },
  { value: 'off', label: '关', hint: '关闭思考，回复更快' },
  { value: 'low', label: '低', hint: '浅层思考，速度优先' },
  { value: 'medium', label: '中', hint: '适中思考' },
  { value: 'high', label: '高', hint: '深入思考，更慢、更耗额度' },
];
const apiStore = useAPIManagementStore();
const mainAPI = computed(() => apiStore.getAPIForType('main'));
const thinkingLevelVisible = computed(() => {
  const api = mainAPI.value;
  if (!api || !THINKING_PROVIDERS.includes(api.provider)) return false;
  if (isTavernEnv() && api.id === 'default') return false;
  return true;
});
const currentThinkingLevel = computed(() => mainAPI.value?.thinkingLevel || 'default');
const updateCurrentThinkingLevel = (level: ThinkingLevel) => {
  const api = mainAPI.value;
  if (!api || isAIProcessing.value || level === currentThinkingLevel.value) return;
  apiStore.updateAPI(api.id, { thinkingLevel: level });
};

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
// 行动选项序号：壹贰叁…
const OPTION_NUMERALS = ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾'];
const optionNumeral = (index: number) => OPTION_NUMERALS[index] ?? String(index + 1);

// 回合印记显示游戏内时间
const gameTimeLabel = computed(() => {
  const g = gameStateStore.gameTime as any;
  if (!g) return formatCurrentTime();
  const pad = (n: unknown) => String(n ?? 0).padStart(2, '0');
  return `${t('仙道')}${g.年}${t('年')}${g.月}${t('月')}${g.日}${t('日')} ${pad(g.小时)}:${pad(g.分钟)}`;
});

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

const stopCurrentRequest = (notice: string) => {
  if (!uiStore.isAIProcessing) return;
  aiService.cancelAllRequests();
  aiResetToken += 1;
  uiStore.resetStreamingState();
  streamingMessageIndex.value = null;
  rawStreamingContent.value = '';
  persistAIProcessingState();
  toast.info(notice);
};

const cancelCurrentRequest = () => stopCurrentRequest(t('已取消本次请求'));

// 强制清除AI处理状态的方法
const forceResetAIProcessingState = () => {
  console.log('[强制重置] 清除AI处理状态和会话存储');
  stopCurrentRequest(t('AI处理状态已重置'));
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

const turnImages = computed(() => {
  const history = gameStateStore.narrativeHistory || [];
  const index = history.length - 1;
  if (index < 0) return [];
  return (gameStateStore.imageGallery || []).filter((item) => item.narrativeIndex === index);
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
  void snapshotVersion.value;
  const active = characterStore.rootState.当前激活存档;
  if (!active) return [];
  return getSnapshots(active.角色ID, active.存档槽位);
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

// 回退最近一回合：列表按时间从旧到新，取最后一档
const rollbackToLastSnapshot = async () => {
  const list = snapshots.value;
  if (list.length === 0) return;
  await rollbackToSnapshot(list[list.length - 1].id);
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
        finalText = extractTextFromJsonResponse(uiStore.streamingContent);
        console.log('[AI响应处理] 使用 streamingContent 提取后作为最终文本，长度:', finalText.length);
      } else {
        console.warn('[AI响应处理] 未找到任何有效的文本内容');
      }
      // 上游解析失败时 text 可能仍是整段 JSON（{"text":"…\"…"}），这里再剥一次外壳
      if (/^\s*(?:```(?:json)?\s*)?\{\s*"(?:text|正文)"\s*:/i.test(finalText)) {
        finalText = extractTextFromJsonResponse(finalText);
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
    const lineHeight = 1.5; // 与CSS中的line-height一致
    const fontSize = 0.95; // rem（15.2px）
    const padding = 22; // 11px * 2
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
.story {
  --page-w: 820px;

  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.story-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1.5rem 2rem 2.5rem;
}

.page {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
  width: 100%;
  max-width: var(--page-w);
  margin: 0 auto;
}

/* ---------- 回合印记 ---------- */
.turn-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-height: 32px;
  font-size: 13px;
  color: var(--cc-text-2);
}

.turn-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--cc-gold-rgb), 0.35));
}

.turn-line:last-child {
  background: linear-gradient(90deg, rgba(var(--cc-gold-rgb), 0.35), transparent);
}

.turn-time {
  padding: 0 0.4rem;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
  color: var(--cc-text);
}

.turn-state {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  letter-spacing: 0.15em;
  color: var(--cc-gold);
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--cc-gold);
  animation: mg-pulse 1.4s ease-in-out infinite;
}

.turn-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  height: 28px;
  padding: 0 0.6rem;
  border: 1px solid var(--cc-border);
  border-radius: 14px;
  background: var(--gm-block);
  color: var(--cc-text-2);
  font-size: 13px;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.turn-btn svg {
  color: var(--cc-gold);
}

.turn-btn em {
  font-style: normal;
  font-size: 12px;
  color: var(--cc-text-3);
}

.turn-btn:hover:not(:disabled) {
  color: var(--cc-text);
  border-color: rgba(var(--cc-gold-rgb), 0.55);
}

.turn-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ---------- 思维链 ---------- */
.thinking {
  border-left: 2px solid color-mix(in srgb, var(--gm-cultivation) 60%, transparent);
  background: var(--gm-block);
}

.thinking-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.55rem 0.85rem;
  border: none;
  background: none;
  color: var(--cc-text-2);
  font-size: 14px;
  letter-spacing: 0.15em;
  text-align: left;
  cursor: pointer;
}

.thinking-head > svg:first-child {
  color: var(--gm-cultivation);
}

.thinking-title {
  flex: 1;
}

.thinking-state {
  font-size: 12px;
  color: var(--cc-text-3);
}

.thinking-state.live {
  color: var(--gm-cultivation);
  animation: mg-pulse 1.6s ease-in-out infinite;
}

.thinking-caret {
  transform: rotate(-90deg);
  transition: transform 0.25s ease;
}

.thinking.open .thinking-caret {
  transform: none;
}

.thinking-body {
  max-height: 320px;
  overflow-y: auto;
  padding: 0 1rem 0.9rem;
  font-size: 14px;
  line-height: 1.8;
  color: var(--cc-text-2);
}

/* ---------- 玩家输入 ---------- */
.intent {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.65rem 0.9rem;
  border-radius: 6px;
  background: var(--gm-block);
}

.intent .gm-seal {
  margin-top: 0.15rem;
}

.intent-text {
  flex: 1;
  margin: 0;
  font-size: 15px;
  line-height: 1.75;
  color: var(--cc-text-2);
  white-space: pre-wrap;
  word-break: break-word;
}

/* ---------- 正文 ---------- */
.prose {
  font-size: var(--narrative-size, 17px);
  line-height: var(--narrative-leading, 2);
  letter-spacing: 0.04em;
  color: var(--cc-text);
}

.story-images {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 280px));
  gap: 0.75rem;
  margin-top: 1rem;
}

.story-images figure {
  margin: 0;
}

.story-images img {
  width: 100%;
  border-radius: 10px;
  display: block;
}

.story-images figcaption {
  margin: 0;
  color: var(--cc-text-3);
  font-size: 0.86rem;
}

/* ---------- 行动签 ---------- */
.choices {
  margin-top: 0.25rem;
}

.choices-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0 0 0.9rem;
  font-family: var(--cc-calligraphy);
  font-size: 22px;
  font-weight: 400;
  letter-spacing: 0.4em;
  color: var(--cc-gold);
}

.choices-title::before,
.choices-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--cc-gold-rgb), 0.45));
}

.choices-title::after {
  background: linear-gradient(90deg, rgba(var(--cc-gold-rgb), 0.45), transparent);
}

.choice-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.choices.single .choice-list {
  grid-template-columns: 1fr;
}

.choice-list li:last-child:nth-child(odd) {
  grid-column: 1 / -1;
}

.choice {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  width: 100%;
  height: 100%;
  padding: 0.75rem 0.95rem;
  border: 1px solid var(--cc-border);
  border-radius: 8px;
  background: var(--gm-block);
  color: var(--cc-text);
  font-size: 15px;
  line-height: 1.7;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.choice:hover:not(:disabled) {
  border-color: rgba(var(--cc-gold-rgb), 0.6);
  background: var(--cc-selected-bg);
  transform: translateY(-1px);
}

.choice:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.choice-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: 1px solid rgba(var(--cc-gold-rgb), 0.5);
  border-radius: 4px;
  font-family: var(--cc-calligraphy);
  font-size: 17px;
  line-height: 1;
  color: var(--cc-gold);
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.choice:hover:not(:disabled) .choice-no {
  border-color: var(--cc-seal);
  background: var(--cc-seal);
  color: var(--cc-seal-text);
}

.choice-text {
  min-width: 0;
  padding-top: 0.1rem;
  word-break: break-word;
}

/* ---------- 输入区 ---------- */
.composer {
  position: relative;
  flex-shrink: 0;
  padding: 0.5rem 2rem 1rem;
}

.composer-inner {
  max-width: var(--page-w);
  margin: 0 auto;
}

.queue {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.queue-label {
  flex-shrink: 0;
  font-size: 13px;
  letter-spacing: 0.15em;
  color: var(--cc-gold);
}

.queue-list {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 0.35rem;
  min-width: 0;
  max-height: 64px;
  overflow-y: auto;
  margin: 0;
  padding: 0;
  list-style: none;
}

.queue-list .gm-chip {
  padding-right: 0.25rem;
}

.queue-text {
  max-width: 16em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.queue-x {
  display: inline-flex;
  padding: 2px;
  border: none;
  border-radius: 3px;
  background: none;
  color: var(--cc-text-3);
  cursor: pointer;
}

.queue-x:hover {
  color: var(--cc-danger);
}

.queue-clear {
  flex-shrink: 0;
  border: none;
  background: none;
  color: var(--cc-text-2);
  font-size: 13px;
  cursor: pointer;
}

.queue-clear:hover {
  color: var(--cc-danger);
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 0.55rem;
}

.input-row.focused .input-box {
  border-color: rgba(var(--cc-gold-rgb), 0.55);
  box-shadow: 0 0 0 3px rgba(var(--cc-gold-rgb), 0.08);
}

.thinking-control-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-top: 0.45rem;
}

.thinking-control-label {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
  font-size: 13px;
  letter-spacing: 0.12em;
  color: var(--cc-text-2);
}

.thinking-control-label svg {
  color: var(--cc-gold);
}

.thinking-levels {
  display: flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--cc-border);
  border-radius: 6px;
  background: var(--cc-inset);
}

.thinking-levels button {
  min-width: 2.6em;
  padding: 0.18rem 0.55rem;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--cc-text-2);
  font-family: inherit;
  font-size: 13px;
  letter-spacing: 0.08em;
  cursor: pointer;
}

.thinking-levels button:hover:not(:disabled) {
  color: var(--cc-text);
}

.thinking-levels button.active {
  color: var(--cc-accent);
  background: var(--cc-surface-hover);
  border-color: rgba(var(--cc-gold-rgb), 0.5);
}

.thinking-levels button:focus-visible {
  outline: 2px solid var(--cc-accent);
  outline-offset: 1px;
}

.thinking-levels button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.thinking-model {
  margin-left: auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--cc-text-3);
}

.memo {
  position: relative;
  flex-shrink: 0;
}

.memo-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  height: 42px;
  padding: 0 0.7rem;
  border: 1px solid var(--cc-border);
  border-radius: 6px;
  background: var(--gm-block);
  color: var(--cc-text-2);
  font-size: 13px;
  letter-spacing: 0.08em;
  cursor: pointer;
}

.memo-btn svg {
  color: var(--cc-gold);
}

.memo-btn em {
  min-width: 1.4em;
  padding: 0 0.3em;
  border-radius: 8px;
  background: rgba(var(--cc-gold-rgb), 0.15);
  color: var(--cc-gold);
  font-size: 12px;
  font-style: normal;
  text-align: center;
}

.memo-btn:hover,
.memo-btn.open {
  color: var(--cc-text);
}

.memo-pop {
  position: absolute;
  left: -0.4rem;
  bottom: calc(100% + 0.9rem);
  z-index: 20;
  width: min(560px, 80vw);
  max-height: 60vh;
  overflow-y: auto;
  padding: 0.75rem;
  border: 1px solid var(--cc-shell-border);
  border-radius: 8px;
  background: var(--cc-solid-bg);
  box-shadow: var(--cc-shell-shadow);
}

.memo-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.memo-list li {
  padding: 0.6rem 0.8rem;
  border-radius: 6px;
  background: var(--gm-block);
  font-size: 14px;
  line-height: 1.75;
  color: var(--cc-text-2);
  white-space: pre-wrap;
}

.memo-empty {
  margin: 0;
  padding: 1rem;
  text-align: center;
  font-size: 14px;
  color: var(--cc-text-2);
}

.input-box {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--cc-border);
  border-radius: 6px;
  background: color-mix(in srgb, var(--cc-inset) 82%, transparent);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.3rem;
}

.thumb {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 4px;
  overflow: hidden;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb button {
  position: absolute;
  top: 2px;
  right: 2px;
  display: inline-flex;
  padding: 2px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  cursor: pointer;
}

.game-input {
  display: block;
  box-sizing: border-box;
  width: 100%;
  height: 42px;
  max-height: 120px;
  padding: 9px 0.75rem;
  border: none;
  background: transparent;
  color: var(--cc-text);
  font-family: inherit;
  font-size: 15.2px;
  line-height: 1.5;
  resize: none;
  overflow-y: hidden;
}

.game-input::placeholder {
  color: var(--cc-text-3);
  letter-spacing: 0.1em;
}

.game-input:focus,
.game-input:focus-visible {
  outline: none;
}

.send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  height: 42px;
  padding: 0 0.95rem;
  border: 1px solid rgba(var(--cc-gold-rgb), 0.38);
  border-radius: 6px;
  background: var(--gm-block);
  color: var(--cc-text-2);
  font-family: var(--cc-calligraphy);
  font-size: 18px;
  letter-spacing: 0.16em;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.send:hover:not(:disabled) {
  border-color: rgba(var(--cc-gold-rgb), 0.75);
  background: color-mix(in srgb, var(--cc-gold) 12%, var(--gm-block));
  color: var(--cc-gold);
}

.send.stop {
  border-color: color-mix(in srgb, var(--cc-seal) 55%, var(--cc-border));
  color: var(--cc-seal);
  cursor: pointer;
}

.send.stop:hover {
  border-color: var(--cc-seal);
  background: color-mix(in srgb, var(--cc-seal) 12%, var(--gm-block));
  color: var(--cc-seal);
}

.send:disabled {
  border-color: var(--cc-border);
  background: transparent;
  color: var(--cc-text-3);
  cursor: not-allowed;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
}

.time-custom {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.time-custom .cc-input {
  width: 90px;
}

@keyframes mg-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

/* ---------- 响应式 ---------- */
@media (max-width: 1024px) {
  .story-scroll {
    padding: 1.25rem 1.25rem 2rem;
  }

  .composer {
    padding: 0.5rem 1.25rem 0.9rem;
  }
}

@media (max-width: 768px) {
  .turn-btn span {
    display: none;
  }

  .choice-list {
    grid-template-columns: 1fr;
  }

  .memo-btn span {
    display: none;
  }

  .send {
    padding: 0 0.7rem;
    letter-spacing: 0.08em;
  }

  .thinking-model {
    display: none;
  }
}

@media (max-width: 480px) {
  .story-scroll {
    padding: 0.9rem 0.8rem 1.5rem;
  }

  .composer {
    padding: 0.4rem 0.6rem 0.7rem;
  }

  .prose {
    font-size: 16px;
    line-height: 1.9;
  }
}
</style>
