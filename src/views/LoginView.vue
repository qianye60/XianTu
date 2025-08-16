<template>
  <div class="login-container">
    <div class="login-panel">
      <h2 class="title">{{ isRegisterMode ? '初入道门' : '登入洞天' }}</h2>
      <p class="subtitle">{{ isRegisterMode ? '注册新道号，踏入修仙之路。' : '验证道友身份，以便同步云端天机。' }}</p>

      <form @submit.prevent="isRegisterMode ? handleRegister() : handleLogin()">
        <div class="form-group">
          <label for="username">道号</label>
          <input type="text" id="username" v-model="username" placeholder="请输入您的道号" required />
        </div>

        <div class="form-group">
          <label for="password">令牌</label>
          <input type="password" id="password" v-model="password" placeholder="请输入您的身份令牌" required />
        </div>

        <div v-if="isRegisterMode" class="form-group">
          <label for="confirmPassword">确认令牌</label>
          <input type="password" id="confirmPassword" v-model="confirmPassword" placeholder="请再次输入令牌" required />
        </div>

        <!-- Cloudflare Turnstile Widget -->
        <div ref="turnstileContainer" class="form-group turnstile-container"></div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div v-if="successMessage" class="success-message">
          {{ successMessage }}
        </div>

        <div class="form-actions">
           <button type="button" @click="$emit('back')" class="btn btn-secondary">返回</button>
           <button type="submit" class="btn" :class="{ 'is-loading': isLoading }" :disabled="isLoading">
             <span class="btn-text">{{ isRegisterMode ? '注册' : '登入' }}</span>
           </button>
        </div>

        <div class="form-footer">
          <a href="#" @click.prevent="toggleMode" class="link">
            {{ isRegisterMode ? '已有道号？立即登入' : '初来乍到？注册道号' }}
          </a>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { toast } from '../utils/toast';
import { request } from '../services/request';

declare global {
  interface Window {
    turnstile: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'expired-callback': () => void;
      }) => string | undefined;
      reset: (widgetId: string) => void;
    };
    onTurnstileLoad: () => void;
  }
}

const emit = defineEmits(['loggedIn', 'back']);

const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const isLoading = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const isRegisterMode = ref(false);
const turnstileToken = ref<string | null>(null);
const turnstileContainer = ref<HTMLElement | null>(null);
const turnstileWidgetId = ref<string | null>(null);
const isDev = process.env.NODE_ENV === 'development';

const renderTurnstile = () => {
  if (turnstileContainer.value && window.turnstile) {
    // 如果已有部件，先重置
    if (turnstileWidgetId.value) {
      window.turnstile.reset(turnstileWidgetId.value);
    } else {
      const widgetId = window.turnstile.render(turnstileContainer.value, {
        sitekey: isDev ? '1x00000000000000000000AA' : '0x4AAAAAABsSt_IBcfz18lmt', // 开发环境使用测试密钥
        callback: (token) => {
          turnstileToken.value = token;
        },
        'expired-callback': () => {
          turnstileToken.value = null;
        },
      });
      turnstileWidgetId.value = widgetId || null;
    }
  }
};

onMounted(() => {
  // Define the global callback
  window.onTurnstileLoad = () => {
    renderTurnstile();
  };

  // If the script is already loaded, render it immediately
  if (window.turnstile) {
    renderTurnstile();
  }
});

onUnmounted(() => {
  // Clean up the global callback
  (window as any).onTurnstileLoad = undefined;
});

const toggleMode = () => {
  isRegisterMode.value = !isRegisterMode.value;
  error.value = null;
  successMessage.value = null;
  password.value = '';
  confirmPassword.value = '';
  turnstileToken.value = null;

  // Reset the widget on mode toggle
  nextTick(() => {
     if (turnstileWidgetId.value && window.turnstile) {
        window.turnstile.reset(turnstileWidgetId.value);
     }
  });
};

const handleRegister = async () => {
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的令牌不一致！';
    return;
  }

  if (!turnstileToken.value && !isDev) {
    error.value = '请先完成人机验证。';
    toast.error('请先完成人机验证。');
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

    successMessage.value = '注册成功！正在为您登入...';
    toast.success('道号注册成功，欢迎踏入修仙之路！');

    // 自动登录
    setTimeout(() => {
      handleLogin();
    }, 1000);

  } catch (e: unknown) {
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
  }
};

const handleLogin = async () => {
  if (!turnstileToken.value && !isDev) {
    error.value = '请先完成人机验证。';
    toast.error('请先完成人机验证。');
    return;
  }

  isLoading.value = true;
  error.value = null;
  successMessage.value = null;

  try {
    const data = await request<any>('/api/v1/auth/token', {
      method: 'POST',
      body: JSON.stringify({
        username: username.value,
        password: password.value,
        turnstile_token: turnstileToken.value,
      }),
    });

    // 保存token和用户名到localStorage
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('username', username.value);

    toast.success('登入成功，天机已连通！');
    emit('loggedIn');

  } catch (e: unknown) {
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

.turnstile-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1.5rem;
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
