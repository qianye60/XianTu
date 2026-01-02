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

        <div class="form-group turnstile-group">
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
        <button type="button" @click="emit('back')" class="btn btn-secondary">{{ $t('??') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { toast } from '../utils/toast';
import { request } from '../services/request';
import { TURNSTILE_SITE_KEY, waitForTurnstile, renderTurnstile, resetTurnstile, removeTurnstile } from '../services/turnstile';
import { isBackendConfigured } from '@/services/backendConfig';

const emit = defineEmits(['loggedIn', 'back']);

const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const isLoading = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const isRegisterMode = ref(false);
const backendReady = ref(isBackendConfigured());

const turnstileContainer = ref<HTMLElement | null>(null);
const turnstileWidgetId = ref<string | null>(null);
const turnstileToken = ref('');
const pendingAutoLogin = ref(false);

const toggleMode = () => {
  isRegisterMode.value = !isRegisterMode.value;
  error.value = null;
  successMessage.value = null;
  pendingAutoLogin.value = false;
  password.value = '';
  confirmPassword.value = '';
  turnstileToken.value = '';
  resetTurnstile(turnstileWidgetId.value);
};

const initTurnstile = async () => {
  if (!turnstileContainer.value) return;

  const ok = await waitForTurnstile();
  if (!ok) {
    error.value = '人机验证组件加载失败，请检查网络或刷新页面后重试';
    return;
  }

  try {
    removeTurnstile(turnstileWidgetId.value);
    turnstileWidgetId.value = renderTurnstile(turnstileContainer.value, {
      siteKey: TURNSTILE_SITE_KEY,
      theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
      onSuccess: (token) => {
        turnstileToken.value = token;
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
      },
    });
  } catch (e) {
    console.error('[Turnstile] render failed:', e);
    error.value = '人机验证组件渲染失败，请刷新页面后重试';
  }
};

onMounted(() => {
  if (!backendReady.value) return;
  void initTurnstile();
});

onBeforeUnmount(() => {
  removeTurnstile(turnstileWidgetId.value);
});

const handleRegister = async () => {
  if (isLoading.value) return;
  if (!backendReady.value) {
    toast.info('未配置后端服务器，注册不可用');
    return;
  } // 防止重复提交
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的令牌不一致！';
    return;
  }

  if (!turnstileToken.value) {
    error.value = '请先完成人机验证';
    toast.error(error.value);
    return;
  }

  if (!turnstileToken.value) {
    error.value = '请先完成人机验证';
    toast.error(error.value);
    return;
  }

  isLoading.value = true;
  error.value = null;
  successMessage.value = null;

  try {
    const resData = await request<any>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        user_name: username.value,
        password: password.value,
        turnstile_token: turnstileToken.value,
      }),
    });

    successMessage.value = '注册成功！请再次完成人机验证以自动登录...';
    toast.success('道号注册成功，欢迎踏入修仙之路！');

    // Turnstile token 通常为单次有效；注册成功后重置并等待新 token 再自动登录
    pendingAutoLogin.value = true;
    isRegisterMode.value = false;
    turnstileToken.value = '';
    resetTurnstile(turnstileWidgetId.value);

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
    resetTurnstile(turnstileWidgetId.value);
  }
};

const handleLogin = async () => {
  if (isLoading.value) return;
  if (!backendReady.value) {
    toast.info('未配置后端服务器，登录不可用');
    return;
  } // 防止重复提交
  if (!turnstileToken.value) {
    error.value = '请先完成人机验证';
    toast.error(error.value);
    return;
  }

  isLoading.value = true;
  error.value = null;
  successMessage.value = null;

  try {
    const body = {
      username: username.value,
      password: password.value,
      turnstile_token: turnstileToken.value,
    };

    const data = await request<any>('/api/v1/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // 保存token和用户名到localStorage
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
    resetTurnstile(turnstileWidgetId.value);
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

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
