<template>
  <div v-if="isVisible" class="auth-modal-overlay" @click.self="handleCancel">
    <div class="auth-modal">
      <div class="auth-modal-header">
        <h3 class="auth-modal-title">🔐 {{ $t('授权验证') }}</h3>
        <button class="auth-modal-close" @click="handleCancel" :aria-label="$t('关闭')">×</button>
      </div>

      <div class="auth-modal-body">
        <div class="auth-info">
          <p class="auth-description">
            {{ $t('欢迎使用授权系统快速入门功能。请输入您的兑换码和机器码进行验证。') }}
          </p>
        </div>

        <div class="auth-form">
          <div class="form-group">
            <label class="form-label">{{ $t('应用 ID') }}</label>
            <input
              v-model="formData.appId"
              type="text"
              class="form-input"
              :placeholder="$t('请输入应用ID')"
              :disabled="isVerifying"
            />
          </div>

          <div class="form-group">
            <label class="form-label">{{ $t('兑换码') }}</label>
            <input
              v-model="formData.code"
              type="text"
              class="form-input"
              :placeholder="$t('请输入兑换码')"
              :disabled="isVerifying"
            />
          </div>

          <div class="form-group">
            <label class="form-label">{{ $t('机器码') }}</label>
            <div class="machine-code-group">
              <input
                v-model="formData.machineCode"
                type="text"
                class="form-input"
                :placeholder="$t('自动生成或手动输入')"
                :disabled="isVerifying"
              />
              <button
                class="generate-btn"
                @click="generateMachineCode"
                :disabled="isVerifying"
                :title="$t('生成机器码')"
              >
                🔄
              </button>
            </div>
            <span class="form-hint">{{ $t('使用统一机器码系统自动生成') }}</span>
          </div>

          <div class="form-group">
            <label class="form-label">{{ $t('绑定类型') }}</label>
            <select v-model="formData.bindingType" class="form-select" :disabled="isVerifying">
              <option value="machine_only">{{ $t('仅机器码') }}</option>
              <option value="ip_only">{{ $t('仅IP') }}</option>
              <option value="both">{{ $t('双重绑定') }}</option>
            </select>
          </div>
        </div>

        <div v-if="errorMessage" class="auth-error">
          ⚠️ {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="auth-success">
          ✅ {{ successMessage }}
        </div>
      </div>

      <div class="auth-modal-footer">
        <button
          class="auth-btn auth-btn-cancel"
          @click="handleCancel"
          :disabled="isVerifying"
        >
          {{ $t('取消') }}
        </button>
        <button
          class="auth-btn auth-btn-verify"
          @click="handleVerify"
          :disabled="isVerifying || !isFormValid"
        >
          <span v-if="isVerifying">{{ $t('验证中...') }}</span>
          <span v-else>{{ $t('验证授权') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { toast } from '@/utils/toast';
import { generateMachineCode as generateMachineCodeUtil } from '@/utils/machineCode';

// Props
interface Props {
  visible?: boolean;
  serverUrl?: string;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  serverUrl: 'http://38.55.124.252:12300'
});

// Emits
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'verified', data: any): void;
  (e: 'cancel'): void;
}>();

// State
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const isVerifying = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

// 当前版本的应用ID（更新版本时修改这里）
const CURRENT_APP_ID = 'v30_3c7fb661';

const formData = reactive({
  appId: CURRENT_APP_ID,
  code: '',
  machineCode: '',
  bindingType: 'both' as 'machine_only' | 'ip_only' | 'both'
});

// Computed
const isFormValid = computed(() => {
  return formData.appId.trim() !== '' &&
         formData.code.trim() !== '' &&
         formData.machineCode.trim() !== '';
});

// Methods
const generateMachineCode = async () => {
  try {
    const machineCode = await generateMachineCodeUtil();
    formData.machineCode = machineCode;
  } catch (error) {
    console.error('[机器码生成] 失败:', error);
    toast.error('机器码生成失败');
  }
};

const handleVerify = async () => {
  if (!isFormValid.value || isVerifying.value) return;

  isVerifying.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    // 调用验证API
    const response = await fetch(`${props.serverUrl}/server.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'redeem',
        app_id: formData.appId,
        code: formData.code,
        machine_code: formData.machineCode,
        binding_type: formData.bindingType
      })
    });

    const result = await response.json();

    if (result.success) {
      successMessage.value = '验证成功！授权已激活';

      // 保存验证信息到localStorage
      localStorage.setItem('auth_verified', 'true');
      localStorage.setItem('auth_timestamp', Date.now().toString()); // 🔴 添加时间戳
      localStorage.setItem('auth_app_id', formData.appId);
      localStorage.setItem('auth_machine_code', formData.machineCode);
      localStorage.setItem('auth_expires_at', result.data?.expires_at || '');

      toast.success('授权验证成功');

      // 延迟关闭弹窗
      setTimeout(() => {
        emit('verified', result.data);
        handleClose();
      }, 1500);
    } else {
      errorMessage.value = result.message || '验证失败，请检查输入信息';
      toast.error(errorMessage.value);
    }
  } catch (error) {
    console.error('验证请求失败:', error);
    errorMessage.value = '网络请求失败，请检查服务器连接';
    toast.error(errorMessage.value);
  } finally {
    isVerifying.value = false;
  }
};

const handleCancel = () => {
  if (isVerifying.value) return;
  emit('cancel');
  handleClose();
};

const handleClose = () => {
  isVisible.value = false;
  // 重置表单（保留 appId 和 machineCode）
  setTimeout(() => {
    formData.code = '';
    formData.bindingType = 'both';
    errorMessage.value = '';
    successMessage.value = '';
  }, 300);
};

// Lifecycle
onMounted(() => {
  // 检查并更新旧版本的应用ID
  const cachedAppId = localStorage.getItem('auth_app_id');
  if (cachedAppId && cachedAppId !== CURRENT_APP_ID) {
    // 版本不匹配，清除旧授权
    console.log(`[授权] 检测到旧版本授权 (${cachedAppId})，已清除`);
    localStorage.removeItem('auth_verified');
    localStorage.removeItem('auth_app_id');
    localStorage.removeItem('auth_expires_at');
    toast.info('检测到版本更新，请重新验证授权');
  }

  // 优先从 localStorage 读取已缓存的机器码
  const cachedMachineCode = localStorage.getItem('auth_machine_code');
  if (cachedMachineCode) {
    formData.machineCode = cachedMachineCode;
  } else if (formData.machineCode === '') {
    // 只有在没有缓存且表单为空时才生成新机器码
    generateMachineCode();
  }
});
</script>

<style scoped>
.auth-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.auth-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.auth-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.auth-modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
}

.auth-modal-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 1.5rem;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.auth-modal-close:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

.auth-modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.auth-info {
  margin-bottom: 1.5rem;
}

.auth-description {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.form-input,
.form-select {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  background: white;
  color: #374151;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input:disabled,
.form-select:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
  opacity: 0.6;
}

.machine-code-group {
  display: flex;
  gap: 0.5rem;
}

.machine-code-group .form-input {
  flex: 1;
}

.generate-btn {
  padding: 0.75rem 1rem;
  background: #667eea;
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-size: 1.25rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.generate-btn:hover:not(:disabled) {
  background: #5568d3;
  transform: rotate(180deg);
}

.generate-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
}

.form-hint {
  font-size: 0.75rem;
  color: #9ca3af;
}

.auth-error {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 0.875rem;
}

.auth-success {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #d1fae5;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
  color: #059669;
  font-size: 0.875rem;
}

.auth-modal-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.auth-btn {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.auth-btn-cancel {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
}

.auth-btn-cancel:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.auth-btn-verify {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.auth-btn-verify:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 深色主题 */
[data-theme="dark"] .auth-modal {
  background: #1e293b;
}

[data-theme="dark"] .auth-modal-header {
  border-bottom-color: #334155;
}

[data-theme="dark"] .auth-description {
  color: #94a3b8;
}

[data-theme="dark"] .form-label {
  color: #e5e7eb;
}

[data-theme="dark"] .form-input,
[data-theme="dark"] .form-select {
  background: #334155;
  border-color: #475569;
  color: #e5e7eb;
}

[data-theme="dark"] .form-input:disabled,
[data-theme="dark"] .form-select:disabled {
  background: #1e293b;
}

[data-theme="dark"] .auth-modal-footer {
  background: #0f172a;
  border-top-color: #334155;
}

[data-theme="dark"] .auth-btn-cancel {
  background: #334155;
  border-color: #475569;
  color: #e5e7eb;
}

[data-theme="dark"] .auth-btn-cancel:hover:not(:disabled) {
  background: #475569;
}

/* 响应式 */
@media (max-width: 640px) {
  .auth-modal {
    width: 95%;
    max-height: 95vh;
  }

  .auth-modal-header,
  .auth-modal-body,
  .auth-modal-footer {
    padding: 1rem;
  }

  .auth-modal-footer {
    flex-direction: column;
  }
}
</style>
