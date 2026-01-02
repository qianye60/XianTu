<template>
  <div class="login-container">
    <div class="login-panel">
      <h2 class="title">{{ isRegisterMode ? $t('初入道门') : $t('登入洞天') }}</h2>
      <p v-if="backendReady" class="subtitle">
        {{ isRegisterMode ? $t('注册新道号，踏入修仙之路。') : $t('验证道友身份，以便同步云端天机。') }}
      </p>
      <p v-else class="subtitle">未配置后端服务器，登录/注册不可用</p>

      <form v-if="backendReady" @submit.prevent="isRegisterMode ? handleRegister() : handleLogin()">
        <div class="form-group">
          <label for="username">{{ $t('道号') }}</label>
          <input type="text" id="username" v-model="username" :placeholder="$t('请输入您的道号')" required />
        </div>

        <div class="form-group">
          <label for="password">{{ $t('令牌') }}</label>
          <input type="password" id="password" v-model="password" :placeholder="$t('请输入您的身份令牌')" required />
        </div>

        <div v-if="isRegisterMode" class="form-group">
          <label for="confirmPassword">{{ $t('确认令牌') }}</label>
          <input type="password" id="confirmPassword" v-model="confirmPassword" :placeholder="$t('请再次输入令牌')" required />
        </div>

        <!-- 邮箱验证（仅注册且启用时显示） -->
        <template v-if="isRegisterMode && emailVerificationEnabled">
          <div class="form-group">
            <label for="email">{{ $t('邮箱') }}</label>
            <div class="email-input-row">
              <input type="email" id="email" v-model="email" :placeholder="$t('请输入您的邮箱')" required />
              <button
                type="button"
                class="btn btn-small"
                @click="sendEmailCode"
                :disabled="sendingCode || emailCooldown > 0"
              >
                {{ emailCooldown > 0 ? `${emailCooldown}s` : (sendingCode ? '发送中...' : '发送验证码') }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="emailCode">{{ $t('验证码') }}</label>
            <input type="text" id="emailCode" v-model="emailCode" :placeholder="$t('请输入邮箱验证码')" required />
          </div>
        </template>

        <!-- Turnstile 人机验证 -->
        <div v-if="turnstileEnabled" class="form-group turnstile-group">
          <div ref="turnstileContainer" class="turnstile-container"></div>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div v-if="successMessage" class="success-message">
          {{ successMessage }}
        </div>

        <div class="form-actions">
           <button type="button" @click="emit('back')" class="btn btn-secondary">{{ $t('返回') }}</button>
           <button type="submit" class="btn" :class="{ 'is-loading': isLoading }" :disabled="isLoading">
             <span class="btn-text">{{ isRegisterMode ? $t('注册') : $t('登入') }}</span>
           </button>
        </div>

        <div class="form-footer">
          <a href="#" @click.prevent="toggleMode" class="link">
            {{ isRegisterMode ? $t('已有道号？立即登入') : $t('初来乍到？注册道号') }}
          </a>
        </div>
      </form>

      <div v-else class="form-actions">
        <button type="button" @click="emit('back')" class="btn btn-secondary">{{ $t('返回') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { toast } from '../utils/toast';
import { request } from '../services/request';
import { waitForTurnstile, renderTurnstile, resetTurnstile, removeTurnstile } from '../services/turnstile';
import { isBackendConfigured } from '@/services/backendConfig';

const emit = defineEmits(['loggedIn', 'back']);

const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const email = ref('');
const emailCode = ref('');
const isLoading = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const isRegisterMode = ref(false);
const backendReady = ref(isBackendConfigured());

// 安全配置（从后端获取）
const turnstileEnabled = ref(false);
const turnstileSiteKey = ref('');
const emailVerificationEnabled = ref(false);

// Turnstile 相关
const turnstileContainer = ref<HTMLElement | null>(null);
const turnstileWidgetId = ref<string | null>(null);
const turnstileToken = ref('');
const pendingAutoLogin = ref(false);

// 邮箱验证码相关
const sendingCode = ref(false);
const emailCooldown = ref(0);
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

// 从后端获取安全配置
const fetchSecuritySettings = async () => {
  try {
    const data = await request<{
      turnstile_enabled: boolean;
      turnstile_site_key: string;
      email_verification_enabled: boolean;
    }>('/api/v1/auth/security-settings');
    turnstileEnabled.value = data.turnstile_enabled;
    turnstileSiteKey.value = data.turnstile_site_key || '';
    emailVerificationEnabled.value = data.email_verification_enabled;
  } catch (e) {
    console.warn('[Security] 获取配置失败:', e);
    turnstileEnabled.value = false;
    emailVerificationEnabled.value = false;
  }
};

const toggleMode = () => {
  isRegisterMode.value = !isRegisterMode.value;
  error.value = null;
  successMessage.value = null;
  pendingAutoLogin.value = false;
  password.value = '';
  confirmPassword.value = '';
  email.value = '';
  emailCode.value = '';
  turnstileToken.value = '';
  if (turnstileEnabled.value) {
    resetTurnstile(turnstileWidgetId.value);
  }
};

// 发送邮箱验证码
const sendEmailCode = async () => {
  if (!email.value) {
    error.value = '请先输入邮箱';
    return;
  }

  // 简单的邮箱格式验证
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(email.value)) {
    error.value = '邮箱格式不正确';
    return;
  }

  sendingCode.value = true;
  error.value = null;

  try {
    const res = await request<{ success: boolean; message: string }>('/api/v1/auth/send-email-code', {
      method: 'POST',
      body: JSON.stringify({
        email: email.value,
        purpose: 'register',
      }),
    });

    if (res.success) {
      toast.success('验证码已发送，请查收邮件');
      // 开始倒计时
      emailCooldown.value = 60;
      cooldownTimer = setInterval(() => {
        emailCooldown.value--;
        if (emailCooldown.value <= 0) {
          if (cooldownTimer) {
            clearInterval(cooldownTimer);
            cooldownTimer = null;
          }
        }
      }, 1000);
    } else {
      error.value = res.message || '发送失败';
    }
  } catch (e: any) {
    error.value = e.detail || e.message || '发送验证码失败';
  } finally {
    sendingCode.value = false;
  }
};

const initTurnstile = async () => {
  if (!turnstileEnabled.value || !turnstileSiteKey.value) return;
  if (!turnstileContainer.value) return;

  const ok = await waitForTurnstile();
  if (!ok) {
    error.value = '人机验证组件加载失败，请检查网络或刷新页面后重试';
    return;
  }

  try {
    removeTurnstile(turnstileWidgetId.value);
    turnstileWidgetId.value = renderTurnstile(turnstileContainer.value, {
      siteKey: turnstileSiteKey.value,
      theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
      onSuccess: (token) => {
        turnstileToken.value = token;
        error.value = null;
        if (pendingAutoLogin.value && !isRegisterMode.value && !isLoading.value) {
          pendingAutoLogin.value = false;
          void handleLogin();
        }
      },
      onExpired: () => {
        turnstileToken.value = '';
      },
      onError: () => {
        turnstileToken.value = '';
        error.value = '无效域。如果此问题仍然存在，请与站点管理员联系。';
      },
    });
  } catch (e) {
    console.error('[Turnstile] render failed:', e);
    error.value = '人机验证组件渲染失败，请刷新页面后重试';
  }
};

// 监听 turnstileEnabled 变化，启用后初始化
watch(turnstileEnabled, (enabled) => {
  if (enabled && turnstileSiteKey.value) {
    setTimeout(() => void initTurnstile(), 100);
  }
});

onMounted(async () => {
  if (!backendReady.value) return;
  await fetchSecuritySettings();
});

onBeforeUnmount(() => {
  removeTurnstile(turnstileWidgetId.value);
  if (cooldownTimer) {
    clearInterval(cooldownTimer);
  }
});

const handleRegister = async () => {
  if (isLoading.value) return;
  if (!backendReady.value) {
    toast.info('未配置后端服务器，注册不可用');
    return;
  }
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的令牌不一致！';
    return;
  }

  // 邮箱验证检查
  if (emailVerificationEnabled.value) {
    if (!email.value) {
      error.value = '请输入邮箱';
      return;
    }
    if (!emailCode.value) {
      error.value = '请输入邮箱验证码';
      return;
    }
  }

  // Turnstile 验证检查
  if (turnstileEnabled.value && !turnstileToken.value) {
    error.value = '请先完成人机验证';
    toast.error(error.value);
    return;
  }

  isLoading.value = true;
  error.value = null;
  successMessage.value = null;

  try {
    const body: Record<string, any> = {
      user_name: username.value,
      password: password.value,
    };

    // 添加邮箱验证信息
    if (emailVerificationEnabled.value) {
      body.email = email.value;
      body.email_code = emailCode.value;
    }

    // 添加 Turnstile token
    if (turnstileEnabled.value && turnstileToken.value) {
      body.turnstile_token = turnstileToken.value;
    }

    await request<any>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    toast.success('道号注册成功，欢迎踏入修仙之路！');

    if (turnstileEnabled.value) {
      successMessage.value = '注册成功！请再次完成人机验证以自动登录...';
      pendingAutoLogin.value = true;
      turnstileToken.value = '';
      resetTurnstile(turnstileWidgetId.value);
      isRegisterMode.value = false;
    } else {
      successMessage.value = '注册成功！正在自动登录...';
      isRegisterMode.value = false;
      await handleLogin();
    }

  } catch (e: unknown) {
    pendingAutoLogin.value = false;
    let errorMessage = '一个未知的错误发生了';
    if (typeof e === 'object' && e !== null) {
      if ('detail' in e && typeof (e as any).detail === 'string') {
        errorMessage = (e as any).detail;
      } else if ('message' in e && typeof (e as any).message === 'string') {
        errorMessage = (e as any).message;
      }
    }
    error.value = errorMessage;
    toast.error(errorMessage);
  } finally {
    isLoading.value = false;
    turnstileToken.value = '';
    if (turnstileEnabled.value) {
      resetTurnstile(turnstileWidgetId.value);
    }
  }
};

const handleLogin = async () => {
  if (isLoading.value) return;
  if (!backendReady.value) {
    toast.info('未配置后端服务器，登录不可用');
    return;
  }

  // Turnstile 验证检查
  if (turnstileEnabled.value && !turnstileToken.value) {
    error.value = '请先完成人机验证';
    toast.error(error.value);
    return;
  }

  isLoading.value = true;
  error.value = null;
  successMessage.value = null;

  try {
    const body: Record<string, any> = {
      username: username.value,
      password: password.value,
    };
    if (turnstileEnabled.value && turnstileToken.value) {
      body.turnstile_token = turnstileToken.value;
    }

    const data = await request<any>('/api/v1/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('username', username.value);

    toast.success('登入成功，天机已连通！');
    emit('loggedIn');

  } catch (e: unknown) {
    pendingAutoLogin.value = false;
    let errorMessage = '一个未知的错误发生了';
    if (typeof e === 'object' && e !== null) {
      if ('detail' in e && typeof (e as any).detail === 'string') {
        errorMessage = (e as any).detail;
      } else if ('message' in e && typeof (e as any).message === 'string') {
        errorMessage = (e as any).message;
      }
    }
    error.value = errorMessage;
    toast.error(errorMessage);
  } finally {
    isLoading.value = false;
    turnstileToken.value = '';
    if (turnstileEnabled.value) {
      resetTurnstile(turnstileWidgetId.value);
    }
  }
};
</script>

<style scoped>
.login-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-panel {
  width: 100%;
  max-width: 400px;
  padding: 2.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 15px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.title {
  text-align: center;
  font-family: var(--font-family-serif);
  font-size: 2rem;
  color: var(--color-accent);
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.subtitle {
  text-align: center;
  color: var(--color-text-secondary);
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.8rem 1rem;
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 1rem;
  box-sizing: border-box;
  transition: var(--transition-fast);
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 10px rgba(var(--color-primary-rgb), 0.3);
}

.email-input-row {
  display: flex;
  gap: 0.5rem;
}

.email-input-row input {
  flex: 1;
}

.btn-small {
  padding: 0.8rem 1rem;
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 100px;
}

.turnstile-group {
  margin-top: 0.25rem;
}

.turnstile-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 72px;
}

.error-message {
    color: var(--color-danger);
    text-align: center;
    margin-bottom: 1rem;
    animation: fadeIn 0.3s ease;
}

.success-message {
    color: #7fb069;
    text-align: center;
    margin-bottom: 1rem;
    animation: fadeIn 0.3s ease;
}

.form-actions {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 2rem;
}

.form-footer {
    text-align: center;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-border);
}

.link {
    color: var(--color-primary);
    text-decoration: none;
    transition: var(--transition-fast);
}

.link:hover {
    color: var(--color-primary-hover);
    text-decoration: underline;
}

.btn {
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-light);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:hover:not(:disabled) {
  background: var(--color-surface-hover);
  border-color: var(--color-border-hover);
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-surface);
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
