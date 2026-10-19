<template>
  <div class="login-container">
    <VideoBackground />

    <div class="login-panel">
      <span class="frame-corner tl" aria-hidden="true"></span>
      <span class="frame-corner tr" aria-hidden="true"></span>
      <span class="frame-corner bl" aria-hidden="true"></span>
      <span class="frame-corner br" aria-hidden="true"></span>

      <header class="header">
        <div class="emblem" aria-hidden="true"><span>{{ emblemChar }}</span></div>
        <h2 class="title">{{ $t(panelTitle) }}</h2>
        <p v-if="backendReady" class="subtitle">{{ $t(panelSubtitle) }}</p>
        <div class="header-rule" aria-hidden="true"></div>
      </header>

      <div v-if="!backendReady" class="cc-state locked">
        <ServerOff :size="18" />
        <span>{{ $t('未配置后端服务器，登录/注册不可用') }}</span>
      </div>

      <form v-else class="login-form" @submit.prevent="submitAuth">
        <div v-if="!isResetMode" class="cc-field">
          <label for="username">{{ $t('道号') }}</label>
          <div class="input-wrap">
            <User :size="15" class="input-icon" aria-hidden="true" />
            <input
              id="username"
              v-model="username"
              type="text"
              class="cc-input"
              autocomplete="username"
              :placeholder="$t('请输入您的道号')"
              required
            />
          </div>
        </div>

        <!-- 注册验证，或凭邮箱找回令牌。找回时放在令牌前面，方便先收邮件里的道号。 -->
        <template v-if="showEmailFields">
          <div class="cc-field">
            <label for="email">{{ $t('邮箱') }}</label>
            <div class="email-row">
              <div class="input-wrap">
                <Mail :size="15" class="input-icon" aria-hidden="true" />
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  class="cc-input"
                  autocomplete="email"
                  :placeholder="$t('请输入您的邮箱')"
                  required
                />
              </div>
              <button
                type="button"
                class="cc-btn code-btn"
                :disabled="sendingCode || emailCooldown > 0"
                @click="sendEmailCode"
              >
                <Loader2 v-if="sendingCode" :size="14" class="cc-spin" />
                <span>{{ emailCooldown > 0 ? `${emailCooldown}s` : (sendingCode ? $t('发送中') : $t('发送验证码')) }}</span>
              </button>
            </div>
          </div>

          <p v-if="isResetMode" class="field-hint">
            {{ $t('验证码邮件会写明绑定的道号，忘了道号也能凭邮件找回。') }}
          </p>

          <div class="cc-field">
            <label for="emailCode">{{ $t('验证码') }}</label>
            <div class="input-wrap">
              <ShieldCheck :size="15" class="input-icon" aria-hidden="true" />
              <input
                id="emailCode"
                v-model="emailCode"
                type="text"
                class="cc-input"
                inputmode="numeric"
                autocomplete="one-time-code"
                :placeholder="$t('请输入邮箱验证码')"
                required
              />
            </div>
          </div>
        </template>

        <div class="cc-field">
          <label for="password">{{ isResetMode ? $t('新令牌') : $t('令牌') }}</label>
          <div class="input-wrap">
            <KeyRound :size="15" class="input-icon" aria-hidden="true" />
            <input
              id="password"
              v-model="password"
              type="password"
              class="cc-input"
              :autocomplete="isRegisterMode || isResetMode ? 'new-password' : 'current-password'"
              :placeholder="isResetMode ? $t('请设置新的身份令牌') : $t('请输入您的身份令牌')"
              required
            />
          </div>
        </div>

        <div v-if="isRegisterMode || isResetMode" class="cc-field">
          <label for="confirmPassword">{{ $t('确认令牌') }}</label>
          <div class="input-wrap">
            <KeyRound :size="15" class="input-icon" aria-hidden="true" />
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              class="cc-input"
              autocomplete="new-password"
              :placeholder="$t('请再次输入令牌')"
              required
            />
          </div>
        </div>

        <!-- Turnstile 人机验证。找回令牌走邮箱验证码和接口限流，不挡在人机验证后面。 -->
        <div v-if="turnstileEnabled && !isResetMode" class="turnstile-container" ref="turnstileContainer"></div>

        <p v-if="error" class="cc-errors" role="alert">{{ error }}</p>
        <p v-else-if="successMessage" class="success-message" role="status">
          <CheckCircle :size="15" />
          <span>{{ successMessage }}</span>
        </p>

        <div class="form-actions">
          <button type="button" class="cc-btn" @click="emit('back')">
            <ArrowLeft :size="15" />
            <span>{{ $t('返回') }}</span>
          </button>
          <button type="submit" class="cc-btn primary" :disabled="isLoading">
            <Loader2 v-if="isLoading" :size="15" class="cc-spin" />
            <KeyRound v-else-if="isResetMode" :size="15" />
            <LogIn v-else-if="!isRegisterMode" :size="15" />
            <UserPlus v-else :size="15" />
            <span>{{ $t(submitLabel) }}</span>
          </button>
        </div>
      </form>

      <footer v-if="backendReady" class="form-footer">
        <template v-if="isResetMode">
          <span class="footer-text">{{ $t('想起道号了？') }}</span>
          <button type="button" class="link-btn" @click="switchMode('login')">
            {{ $t('立即登入') }}
          </button>
        </template>
        <template v-else>
          <span class="footer-text">{{ isRegisterMode ? $t('已有道号？') : $t('初来乍到？') }}</span>
          <button type="button" class="link-btn" @click="toggleMode">
            {{ isRegisterMode ? $t('立即登入') : $t('注册道号') }}
          </button>
          <button v-if="!isRegisterMode" type="button" class="link-btn" @click="switchMode('reset')">
            {{ $t('忘记令牌？') }}
          </button>
        </template>
      </footer>
      <footer v-else class="form-actions single">
        <button type="button" class="cc-btn" @click="emit('back')">
          <ArrowLeft :size="15" />
          <span>{{ $t('返回') }}</span>
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { ArrowLeft, CheckCircle, KeyRound, Loader2, LogIn, Mail, ServerOff, ShieldCheck, User, UserPlus } from 'lucide-vue-next';
import VideoBackground from '@/components/common/VideoBackground.vue';
import { useTheme } from '@/composables/useTheme';
import { toast } from '../utils/toast';
import { request } from '../services/request';
import { waitForTurnstile, renderTurnstile, resetTurnstile, removeTurnstile } from '../services/turnstile';
import { isBackendConfigured } from '@/services/backendConfig';

const emit = defineEmits(['loggedIn', 'back']);
const { resolvedTheme } = useTheme();

const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const email = ref('');
const emailCode = ref('');
const isLoading = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const mode = ref<'login' | 'register' | 'reset'>('login');
const isRegisterMode = computed(() => mode.value === 'register');
const isResetMode = computed(() => mode.value === 'reset');
const backendReady = ref(isBackendConfigured());

const emblemChar = computed(() => {
  if (isRegisterMode.value) return '籍';
  if (isResetMode.value) return '令';
  return '门';
});
const panelTitle = computed(() => {
  if (isRegisterMode.value) return '初入道门';
  if (isResetMode.value) return '找回令牌';
  return '登入洞天';
});
const panelSubtitle = computed(() => {
  if (isRegisterMode.value) return '注册新道号，踏入修仙之路。';
  if (isResetMode.value) return '验证绑定邮箱。邮件里会写上您的道号。';
  return '验证道友身份，以便同步云端天机。';
});
const submitLabel = computed(() => {
  if (isRegisterMode.value) return '注册';
  if (isResetMode.value) return '重置令牌';
  return '登入';
});

// 安全配置（从后端获取）
const turnstileEnabled = ref(false);
const turnstileSiteKey = ref('');
const emailVerificationEnabled = ref(false);
const showEmailFields = computed(() => isResetMode.value || (isRegisterMode.value && emailVerificationEnabled.value));

// Turnstile 相关
const turnstileContainer = ref<HTMLElement | null>(null);
const turnstileWidgetId = ref<string | null>(null);
const turnstileToken = ref('');

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

const switchMode = (next: 'login' | 'register' | 'reset') => {
  mode.value = next;
  error.value = null;
  successMessage.value = null;
  password.value = '';
  confirmPassword.value = '';
  email.value = '';
  emailCode.value = '';
  turnstileToken.value = '';
  if (turnstileEnabled.value) {
    resetTurnstile(turnstileWidgetId.value);
  }
};

const toggleMode = () => {
  switchMode(isRegisterMode.value ? 'login' : 'register');
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
        purpose: isResetMode.value ? 'reset_password' : 'register',
      }),
    });

    if (res.success) {
      toast.success(isResetMode.value
        ? '若该邮箱已绑定道号，验证码已发送，邮件中会写明道号'
        : '验证码已发送，请查收邮件');
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
      theme: resolvedTheme.value,
      onSuccess: (token) => {
        turnstileToken.value = token;
        error.value = null;
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

    // 注册成功后切换到登录模式，让用户手动登录
    mode.value = 'login';
    successMessage.value = '注册成功！请登录您的道号';
    password.value = '';
    confirmPassword.value = '';
    emailCode.value = '';
    turnstileToken.value = '';
    if (turnstileEnabled.value) {
      resetTurnstile(turnstileWidgetId.value);
    }

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
    turnstileToken.value = '';
    if (turnstileEnabled.value) {
      resetTurnstile(turnstileWidgetId.value);
    }
  }
};

const handleResetPassword = async () => {
  if (isLoading.value) return;
  if (!backendReady.value) {
    toast.info('未配置后端服务器，重置不可用');
    return;
  }

  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email.value || !emailPattern.test(email.value)) {
    error.value = '邮箱格式不正确';
    return;
  }
  if (!emailCode.value.trim()) {
    error.value = '请输入邮箱验证码';
    return;
  }
  if (password.value.length < 6) {
    error.value = '令牌至少需要 6 位';
    return;
  }
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的令牌不一致！';
    return;
  }

  isLoading.value = true;
  error.value = null;
  successMessage.value = null;

  try {
    const res = await request<{ success: boolean; message: string; user_name?: string }>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email: email.value.trim(),
        email_code: emailCode.value.trim(),
        new_password: password.value,
      }),
    });

    if (res.user_name) username.value = res.user_name;
    mode.value = 'login';
    password.value = '';
    confirmPassword.value = '';
    emailCode.value = '';
    successMessage.value = res.user_name
      ? `令牌已重置。您的道号是「${res.user_name}」，请用新令牌登入。`
      : '令牌已重置，请用新令牌登入。';
    toast.success('令牌已重置');
  } catch (e: unknown) {
    let errorMessage = '重置令牌失败';
    if (typeof e === 'object' && e !== null) {
      if ('detail' in e && typeof (e as { detail?: unknown }).detail === 'string') {
        errorMessage = (e as { detail: string }).detail;
      } else if ('message' in e && typeof (e as { message?: unknown }).message === 'string') {
        errorMessage = (e as { message: string }).message;
      }
    }
    error.value = errorMessage;
    toast.error(errorMessage);
  } finally {
    isLoading.value = false;
  }
};

const submitAuth = () => {
  if (isRegisterMode.value) return handleRegister();
  if (isResetMode.value) return handleResetPassword();
  return handleLogin();
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
    // 修者登录：走 /api/v1/auth/token（LoginRequest）
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
/* 登录 / 注册 —— 令牌见 styles/xian-tokens.css，通用类见 styles/creation-theme.css */
.login-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100%;
  padding: 1.5rem;
  box-sizing: border-box;
  color: var(--cc-text);
}

.login-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: min(440px, 100%);
  max-height: calc(var(--app-dvh) - 3rem);
  overflow-y: auto;
  padding: 2rem 2.1rem 1.5rem;
  box-sizing: border-box;
  background: var(--cc-shell-bg);
  border: 1px solid var(--cc-shell-border);
  border-radius: 6px;
  box-shadow: var(--cc-shell-shadow);
  backdrop-filter: blur(22px) saturate(1.1);
  -webkit-backdrop-filter: blur(22px) saturate(1.1);
}

.login-panel::before {
  content: '';
  position: absolute;
  inset: 9px;
  border: 1px solid rgba(var(--cc-gold-rgb), 0.16);
  border-radius: 3px;
  pointer-events: none;
}

.frame-corner {
  position: absolute;
  width: 26px;
  height: 26px;
  border: 0 solid var(--cc-gold);
  opacity: 0.85;
  pointer-events: none;
}

.frame-corner.tl { top: 5px; left: 5px; border-top-width: 2px; border-left-width: 2px; }
.frame-corner.tr { top: 5px; right: 5px; border-top-width: 2px; border-right-width: 2px; }
.frame-corner.bl { bottom: 5px; left: 5px; border-bottom-width: 2px; border-left-width: 2px; }
.frame-corner.br { bottom: 5px; right: 5px; border-bottom-width: 2px; border-right-width: 2px; }

/* ---------- 头部 ---------- */
.header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.emblem {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  margin-bottom: 0.85rem;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(var(--cc-accent-rgb), 0.25) 0%, rgba(var(--cc-accent-rgb), 0.05) 75%);
  box-shadow: 0 0 0 1px rgba(var(--cc-gold-rgb), 0.5), 0 0 24px -8px rgba(var(--cc-accent-rgb), 0.6);
  font-family: var(--cc-calligraphy);
  font-size: 1.8rem;
  color: var(--cc-accent);
}

.emblem::before {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1px dashed rgba(var(--cc-gold-rgb), 0.45);
  animation: emblem-spin 40s linear infinite;
}

@keyframes emblem-spin {
  to { transform: rotate(360deg); }
}

.title {
  margin: 0;
  font-family: var(--cc-calligraphy);
  font-size: 2rem;
  font-weight: 400;
  letter-spacing: 0.2em;
  color: var(--cc-text);
}

.subtitle {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  color: var(--cc-text-2);
}

.header-rule {
  position: relative;
  width: 70%;
  height: 1px;
  margin-top: 1.1rem;
  background: linear-gradient(90deg, transparent, rgba(var(--cc-gold-rgb), 0.5), transparent);
}

.header-rule::after {
  content: '';
  position: absolute;
  left: 50%;
  top: -2px;
  width: 5px;
  height: 5px;
  background: var(--cc-gold);
  transform: translateX(-50%) rotate(45deg);
}

.cc-state.locked {
  gap: 0.5rem;
  min-height: 90px;
  font-size: 0.9rem;
  letter-spacing: 0.08em;
  color: var(--cc-warning);
}

/* ---------- 表单 ---------- */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}

.input-icon {
  position: absolute;
  left: 0.8rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--cc-gold);
  opacity: 0.8;
  pointer-events: none;
}

.input-wrap .cc-input {
  min-height: 42px;
  padding-left: 2.35rem;
}

.email-row {
  display: flex;
  gap: 0.5rem;
}

.field-hint {
  margin: -0.35rem 0 0;
  font-size: 0.78rem;
  line-height: 1.55;
  letter-spacing: 0.04em;
  color: var(--cc-text-3);
}

.code-btn {
  flex-shrink: 0;
  min-width: 108px;
  min-height: 42px;
  padding: 0 0.8rem;
  font-size: 0.82rem;
  letter-spacing: 0.06em;
}

.turnstile-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72px;
}

.cc-errors {
  margin: 0;
  line-height: 1.55;
  text-align: center;
}

.success-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin: 0;
  padding: 0.55rem 0.85rem;
  border: 1px solid color-mix(in srgb, var(--cc-success) 45%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, var(--cc-success) 9%, transparent);
  color: var(--cc-success);
  font-size: 0.85rem;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.35rem;
}

.form-actions .cc-btn.primary {
  flex: 1;
  max-width: 220px;
}

.form-actions.single {
  justify-content: center;
}

/* ---------- 底部切换 ---------- */
.form-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.25rem 0.55rem;
  padding-top: 1rem;
  border-top: 1px solid var(--cc-divider);
  font-size: 0.85rem;
  letter-spacing: 0.06em;
}

.footer-text {
  color: var(--cc-text-3);
}

.link-btn {
  padding: 0.15rem 0.35rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--cc-accent);
  font-family: inherit;
  font-size: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: rgba(var(--cc-gold-rgb), 0.5);
  text-underline-offset: 4px;
}

.link-btn:hover {
  text-decoration-color: var(--cc-gold);
}

.login-panel :is(.cc-btn, .link-btn):focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--cc-accent-rgb), 0.3);
}

/* ---------- 响应式 ---------- */
@media (max-width: 480px) {
  .login-container {
    padding: 0;
  }

  .login-panel {
    width: 100%;
    min-height: var(--app-dvh);
    max-height: none;
    justify-content: center;
    padding: 4.5rem 1.25rem 2rem;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }

  .frame-corner {
    display: none;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions .cc-btn,
  .form-actions .cc-btn.primary {
    width: 100%;
    max-width: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .emblem::before {
    animation: none;
  }
}
</style>
