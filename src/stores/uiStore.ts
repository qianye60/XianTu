import { defineStore } from 'pinia';
import { ref, shallowRef, computed, type Component } from 'vue';
import { sanitizeAITextForDisplay } from '@/utils/textSanitizer';
import { isBackendConfigured, fetchBackendVersion } from '@/services/backendConfig';

interface RetryDialogConfig {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string; // 可选：自定义确认按钮文本
  cancelText?: string;  // 可选：自定义取消按钮文本
  neutralText?: string; // 可选：新增第三个中立按钮的文本
  onNeutral?: () => void; // 可选：新增第三个中立按钮的回调
}

interface DetailModalConfig {
  title: string;
  content?: string; // Keep for backward compatibility
  component?: Component;
  props?: Record<string, any>;
  className?: string;
}

// Toast 类型定义
interface ToastOptions {
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export const useUIStore = defineStore('ui', () => {
  // --- Toast (消息提示) ---
  const showToastState = ref(false);
  const toastMessage = ref('');
  const toastOptions = ref<ToastOptions>({});

  const isLoading = ref(false);
  const loadingText = ref('');
  const isAIProcessing = ref(false); // AI处理状态（持久化，切换面板时不丢失）

  // 🔥 流式响应状态（全局持久化，切换页面不丢失）
  const streamingContent = ref('');
  const rawStreamingContent = ref('');
  const currentGenerationId = ref<string | null>(null);
  const streamingTimestamp = ref<number | null>(null);

  const showRetryDialogState = ref(false);
  const retryDialogConfig = ref<RetryDialogConfig | null>(null);
  const wasLoadingBeforeDialog = ref(false); // 记录显示弹窗前的loading状态
  const showCharacterManagement = ref(false);

  // --- 新增：通用详情弹窗状态 ---
  const showDetailModalState = ref(false);
  const detailModalTitle = ref('');
  const detailModalContent = ref('');
  const detailModalComponent = shallowRef<Component | null>(null);
  const detailModalProps = ref<Record<string, any> | null>(null);
  const detailModalClass = ref('');

  // --- 新增：数据验证错误弹窗状态 ---
  const showDataValidationError = ref(false);
  const dataValidationErrorMessages = ref<string[]>([]);
  const onDataValidationConfirm = ref<(() => void) | null>(null);
  const dataValidationContext = ref<'creation' | 'loading'>('creation'); // 'creation' 或 'loading'

  // --- 新增：状态变更日志查看器状态 ---
  const showStateChangeViewer = ref(false);
  const stateChangeLogToShow = ref<any | null>(null); // 存储要显示的日志

  // 当前消息的状态变更日志（仅内存存储，不持久化到本地）
  // 每次新消息来时会被清空覆盖
  const currentMessageStateChanges = ref<any | null>(null);

  // 用户输入框内容持久化
  const userInputText = ref('');

  // 🔥 [NPC自动生成设置] 控制AI是否在人物数量不足时自动生成NPC
  const autoGenerateNpc = ref(true); // 默认开启
  const minNpcCount = ref(3); // 最少NPC数量

  // 🔥 [行动选项设置] 控制AI是否生成行动选项
  const enableActionOptions = ref(localStorage.getItem('enableActionOptions') !== 'false'); // 默认开启
  const actionOptionsPrompt = ref(localStorage.getItem('actionOptionsPrompt') || ''); // 自定义行动选项提示词

  // 🔥 [流式传输设置] 控制是否启用流式传输（全局持久化）
  const useStreaming = ref(localStorage.getItem('useStreaming') !== 'false'); // 默认开启

  // 🔥 [CoT设置] 控制是否使用系统CoT（默认关闭）
  const useSystemCot = ref(localStorage.getItem('useSystemCot') === 'true');

  // 🔥 [后端状态管理] 统一管理后端连接状态
  const backendStatus = ref({
    configured: isBackendConfigured(),
    connected: false,
    lastChecked: 0
  });

  // 检查后端连接状态
  const checkBackendConnection = async (): Promise<boolean> => {
    if (!backendStatus.value.configured) {
      backendStatus.value.connected = false;
      return false;
    }

    try {
      const version = await fetchBackendVersion();
      backendStatus.value.connected = !!version;
      backendStatus.value.lastChecked = Date.now();
      return backendStatus.value.connected;
    } catch {
      backendStatus.value.connected = false;
      return false;
    }
  };

  // 计算属性：后端是否可用（已配置且已连接）
  const isBackendAvailable = computed(() =>
    backendStatus.value.configured && backendStatus.value.connected
  );

  // 计算属性：后端是否已配置（不检查连接状态）
  const isBackendConfiguredComputed = computed(() => backendStatus.value.configured);

  function openCharacterManagement() {
    showCharacterManagement.value = true;
  }

  function closeCharacterManagement() {
    showCharacterManagement.value = false;
  }

  function startLoading(text = '正在加载...') {
    isLoading.value = true;
    loadingText.value = text;
  }

  function stopLoading() {
    isLoading.value = false;
    loadingText.value = '';
  }

  function setAIProcessing(value: boolean) {
    isAIProcessing.value = value;
    // 同步持久化到sessionStorage
    if (value) {
      sessionStorage.setItem('ai-processing-state', 'true');
      sessionStorage.setItem('ai-processing-timestamp', Date.now().toString());
    } else {
      sessionStorage.removeItem('ai-processing-state');
      sessionStorage.removeItem('ai-processing-timestamp');
    }
  }

  // 🔥 流式响应状态管理
  function setStreamingContent(content: string) {
    rawStreamingContent.value = content;
    streamingContent.value = sanitizeAITextForDisplay(content);
  }

  function appendStreamingContent(chunk: string) {
    rawStreamingContent.value += chunk;
    streamingContent.value = sanitizeAITextForDisplay(rawStreamingContent.value);
  }

  function clearStreamingContent() {
    streamingContent.value = '';
    rawStreamingContent.value = '';
  }

  function setCurrentGenerationId(id: string | null) {
    currentGenerationId.value = id;
  }

  function startStreaming(generationId: string) {
    currentGenerationId.value = generationId;
    streamingContent.value = '';
    rawStreamingContent.value = '';
    streamingTimestamp.value = Date.now();
    isAIProcessing.value = true;
  }

  function stopStreaming() {
    currentGenerationId.value = null;
    streamingTimestamp.value = null;
    isAIProcessing.value = false;
  }

  function resetStreamingState() {
    streamingContent.value = '';
    rawStreamingContent.value = '';
    currentGenerationId.value = null;
    streamingTimestamp.value = null;
    isAIProcessing.value = false;
    sessionStorage.removeItem('ai-processing-state');
    sessionStorage.removeItem('ai-processing-timestamp');
  }

  function updateLoadingText(text: string) {
    if (isLoading.value) {
      loadingText.value = text;
    }
  }

  function showRetryDialog(config: RetryDialogConfig) {
    // 记录当前的loading状态并暂停loading，确保弹窗显示在最上层
    wasLoadingBeforeDialog.value = isLoading.value;
    if (isLoading.value) {
      isLoading.value = false;
    }
    
    retryDialogConfig.value = config;
    showRetryDialogState.value = true;
  }

  function hideRetryDialog() {
    showRetryDialogState.value = false;
    retryDialogConfig.value = null;
    
    // 恢复之前的loading状态
    if (wasLoadingBeforeDialog.value) {
      isLoading.value = true;
      wasLoadingBeforeDialog.value = false;
    }
  }

  function confirmRetry() {
    if (retryDialogConfig.value) {
      retryDialogConfig.value.onConfirm();
      hideRetryDialog();
    }
  }

  function cancelRetry() {
    if (retryDialogConfig.value) {
      retryDialogConfig.value.onCancel();
      hideRetryDialog();
    }
  }

  function neutralAction() {
    if (retryDialogConfig.value && retryDialogConfig.value.onNeutral) {
      retryDialogConfig.value.onNeutral();
      hideRetryDialog();
    }
  }

  // --- 新增：数据验证错误弹窗方法 ---
  function showDataValidationErrorDialog(messages: string[], onConfirm: () => void, context: 'creation' | 'loading' = 'creation') {
    dataValidationErrorMessages.value = messages;
    onDataValidationConfirm.value = onConfirm;
    dataValidationContext.value = context; // 设置上下文
    showDataValidationError.value = true;
  }

  function hideDataValidationErrorDialog() {
    showDataValidationError.value = false;
    dataValidationErrorMessages.value = [];
    onDataValidationConfirm.value = null;
  }

  function confirmDataValidationError() {
    if (onDataValidationConfirm.value) {
      onDataValidationConfirm.value();
    }
    hideDataValidationErrorDialog();
  }

  // --- 新增：状态变更日志查看器方法 ---
  function openStateChangeViewer(log: any) {
    stateChangeLogToShow.value = log;
    showStateChangeViewer.value = true;
  }

  function closeStateChangeViewer() {
    showStateChangeViewer.value = false;
    stateChangeLogToShow.value = null;
  }

  // 设置当前消息的状态变更（会覆盖之前的）
  function setCurrentMessageStateChanges(log: any) {
    currentMessageStateChanges.value = log ? { ...log, _ts: Date.now() } : null;
  }

  // 清空当前消息的状态变更
  function clearCurrentMessageStateChanges() {
    currentMessageStateChanges.value = null;
  }

  // --- 新增：通用详情弹窗方法 ---
  function showDetailModal(config: DetailModalConfig) {
    detailModalTitle.value = config.title;
    detailModalContent.value = config.content || '';
    detailModalComponent.value = config.component || null;
    detailModalProps.value = config.props || null;
    detailModalClass.value = config.className || '';
    showDetailModalState.value = true;
  }

  function hideDetailModal() {
    showDetailModalState.value = false;
    // Optional: Reset content after hiding to prevent flash of old content
    setTimeout(() => {
      detailModalTitle.value = '';
      detailModalContent.value = '';
      detailModalComponent.value = null;
      detailModalProps.value = null;
      detailModalClass.value = '';
    }, 300); // Match transition duration
  }

  // --- 新增：Toast (消息提示) 方法 ---
  function showToast(message: string, options: ToastOptions = {}) {
    toastMessage.value = message;
    toastOptions.value = {
      type: options.type || 'info',
      duration: options.duration || 3000,
    };
    showToastState.value = true;
  }

  function hideToast() {
    showToastState.value = false;
  }

  return {
    // Toast
    showToastState,
    toastMessage,
    toastOptions,
    showToast,
    hideToast,

    isLoading,
    loadingText,
    isAIProcessing, // 暴露AI处理状态

    // 🔥 流式响应状态
    streamingContent,
    currentGenerationId,
    streamingTimestamp,
    setStreamingContent,
    appendStreamingContent,
    clearStreamingContent,
    setCurrentGenerationId,
    startStreaming,
    stopStreaming,
    resetStreamingState,

    showRetryDialogState,
    retryDialogConfig,
    startLoading,
    stopLoading,
    setAIProcessing, // 暴露设置AI处理状态的方法
    updateLoadingText,
    showRetryDialog,
    hideRetryDialog,
    confirmRetry,
    cancelRetry,
    neutralAction, // 暴露中立按钮动作
    showCharacterManagement,
    openCharacterManagement,
    closeCharacterManagement,

    // 暴露数据验证相关状态和方法
    showDataValidationError,
    dataValidationErrorMessages,
    dataValidationContext, // 暴露上下文
    showDataValidationErrorDialog,
    hideDataValidationErrorDialog,
    confirmDataValidationError,

    // 暴露状态变更日志查看器相关状态和方法
    showStateChangeViewer,
    stateChangeLogToShow,
    currentMessageStateChanges, // 当前消息的状态变更（内存）
    openStateChangeViewer,
    closeStateChangeViewer,
    setCurrentMessageStateChanges, // 设置当前消息的状态变更
    clearCurrentMessageStateChanges, // 清空当前消息的状态变更

    // 🔥 [NPC自动生成设置] 暴露NPC自动生成相关状态
    autoGenerateNpc,
    minNpcCount,

    // 🔥 [行动选项设置] 暴露行动选项开关
    enableActionOptions: computed({
      get: () => enableActionOptions.value,
      set: (val) => {
        enableActionOptions.value = val;
        localStorage.setItem('enableActionOptions', String(val));
      }
    }),
    actionOptionsPrompt: computed({
      get: () => actionOptionsPrompt.value,
      set: (val) => {
        actionOptionsPrompt.value = val;
        localStorage.setItem('actionOptionsPrompt', val);
      }
    }),

    // 🔥 [流式传输设置] 暴露流式传输开关（全局持久化）
    useStreaming: computed({
      get: () => useStreaming.value,
      set: (val) => {
        useStreaming.value = val;
        localStorage.setItem('useStreaming', String(val));
      }
    }),

    // 🔥 [CoT设置] 暴露系统CoT开关（全局持久化）
    useSystemCot: computed({
      get: () => useSystemCot.value,
      set: (val) => {
        useSystemCot.value = val;
        localStorage.setItem('useSystemCot', String(val));
      }
    }),

    // 暴露用户输入框内容
    userInputText,

    // 🔥 [后端状态管理] 暴露后端状态相关
    backendStatus,
    checkBackendConnection,
    isBackendAvailable,
    isBackendConfiguredComputed,

    // 暴露通用详情弹窗相关
    showDetailModalState,
    detailModalTitle,
    detailModalContent,
    detailModalComponent,
    detailModalProps,
    detailModalClass,
    showDetailModal,
    hideDetailModal,
  };
});
