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
  };
});
