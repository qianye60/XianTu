import { defineStore } from 'pinia';
import { ref } from 'vue';

interface RetryDialogConfig {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string; // 可选：自定义确认按钮文本
  cancelText?: string;  // 可选：自定义取消按钮文本
}

export const useUIStore = defineStore('ui', () => {
  const isLoading = ref(false);
  const loadingText = ref('');
  const showRetryDialogState = ref(false);
  const retryDialogConfig = ref<RetryDialogConfig | null>(null);
  const wasLoadingBeforeDialog = ref(false); // 记录显示弹窗前的loading状态
  const showCharacterManagement = ref(false);

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

  return {
    isLoading,
    loadingText,
    showRetryDialogState,
    retryDialogConfig,
    startLoading,
    stopLoading,
    updateLoadingText,
    showRetryDialog,
    hideRetryDialog,
    confirmRetry,
    cancelRetry,
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
  };
});
