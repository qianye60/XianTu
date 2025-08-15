<template>
  <div class="auth-container">
    <div class="card-panel auth-panel">
      <header class="auth-header">
        <div class="header-content">
          <div class="mode-tabs">
            <button
              @click="switchMode('login')"
              :class="['tab-button', { active: mode === 'login' }]"
            >
              道友登入
            </button>
            <button
              @click="switchMode('register')"
              :class="['tab-button', { active: mode === 'register' }]"
            >
              道友注册
            </button>
          </div>
          <ThemeSwitcher />
        </div>
        <h1 class="title">{{ mode === 'login' ? '道友登入' : '接引新道友' }}</h1>
        <p class="subtitle">{{ mode === 'login' ? '道友，请报上你的名号与凭证。' : '道友，请选择你的道号与凭证。' }}</p>
      </header>

      <main class="auth-main">
        <div class="input-group">
          <label for="username" class="input-label">道号</label>
          <input
            id="username"
            v-model="userName"
            type="text"
            class="input-field"
            placeholder="例如：千夜"
            @keyup.enter="focusPassword"
            :disabled="isLoading"
          />
        </div>

        <div class="input-group">
          <label for="password" class="input-label">凭证</label>
          <input
            id="password"
            ref="passwordInput"
            v-model="password"
            type="password"
            class="input-field"
            placeholder="请输入密码"
            @keyup.enter="handleSubmit"
            :disabled="isLoading"
          />
        </div>

        <!-- Captcha for registration -->
        <div v-if="mode === 'register'" class="input-group">
          <label for="captcha" class="input-label">验证码</label>
          <div class="captcha-container">
            <input
              id="captcha"
              v-model="captchaInput"
              type="text"
              class="input-field captcha-input"
              placeholder="请输入验证码"
              @keyup.enter="handleSubmit"
              :disabled="isLoading"
            />
            <div class="captcha-image" @click="handleCaptchaClick">{{ captchaText }}</div>
          </div>
        </div>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      </main>

      <footer class="auth-footer">
        <button
          @click="handleSubmit"
          class="btn btn-primary"
          :class="{ 'is-loading': isLoading }"
          :disabled="isLoading || !userName.trim() || !password.trim() || (mode === 'register' && !captchaInput.trim())"
        >
          <span v-if="!isLoading" class="btn-text">
            {{ mode === 'login' ? '道友登入' : '接引入门' }}
          </span>
          <span v-else class="btn-text loading-text">
            <i class="loading-icon"></i>
            神识连接中...
          </span>
        </button>
        <button
          @click="handleClose"
          class="btn btn-secondary mt-4"
          :disabled="isLoading"
        >
          <span v-if="!isLoading">暂不登录，返回</span>
          <span v-else>返回中...</span>
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useGameMode } from '@/composables/useGameMode'
import { useCaptcha } from '@/composables/useCaptcha'
import ThemeSwitcher from '@/components/shared/ThemeSwitcher.vue'


type AuthMode = 'login' | 'register'

const mode = ref<AuthMode>('login')
const userName = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const passwordInput = ref<HTMLInputElement>()

const { login, register } = useAuth()
const { clearGameMode } = useGameMode()
const { captchaText, captchaInput, generateCaptcha, validateCaptcha } = useCaptcha()

watch(mode, (newMode) => {
  if (newMode === 'register') {
    generateCaptcha()
  }
})

onMounted(() => {
  if (mode.value === 'register') {
    generateCaptcha()
  }
})

const switchMode = (newMode: AuthMode) => {
  mode.value = newMode
  errorMessage.value = ''
}

const handleCaptchaClick = () => {
  generateCaptcha()
}

const focusPassword = async () => {
  await nextTick()
  passwordInput.value?.focus()
}

const handleSubmit = async () => {
  if (!userName.value.trim() || !password.value.trim() || isLoading.value) return

  if (mode.value === 'register') {
    if (!validateCaptcha()) {
      errorMessage.value = '验证码不正确'
      generateCaptcha() // Regenerate captcha
      return
    }
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const result = mode.value === 'login'
      ? await login(userName.value.trim(), password.value)
      : await register(userName.value.trim(), password.value)

    if (!result.success) {
      errorMessage.value = result.message || (mode.value === 'login' ? '登入失败，请稍后再试。' : '注册失败，请稍后再试。')
    }
    // On success, the parent component (App.vue) will detect the isLoggedIn state change
    // and automatically switch the view. We don't need to do anything else here.
  } catch (error: unknown) {
    errorMessage.value = (error as Error).message || '发生了未知错误。'
  } finally {
    isLoading.value = false
  }
}

const handleClose = () => {
  // 立即禁用按钮，提供即时反馈
  isLoading.value = true
  // 使用 nextTick 确保 DOM 更新后再执行跳转
  nextTick(() => {
    clearGameMode()
    // 跳转后自动恢复状态
    setTimeout(() => {
      isLoading.value = false
    }, 100)
  })
}
</script>

<style scoped>
/* ... existing styles ... */

.captcha-container {
  display: flex;
  align-items: center;
}

.captcha-input {
  flex-grow: 1;
}

.captcha-image {
  margin-left: 10px;
  padding: 10px;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  font-family: monospace;
  font-size: 1.5em;
  letter-spacing: 5px;
  text-decoration: line-through;
  color: #555;
}

.auth-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    var(--color-background) 0%,
    var(--color-surface-light) 50%,
    var(--color-background) 100%
  );
  background-size: 400% 400%;
  backdrop-filter: blur(12px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  overflow-y: auto;
  animation:
    fadeIn 0.8s ease-out,
    flow-background 30s ease-in-out infinite;
}

@keyframes flow-background {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.auth-panel {
  width: 100%;
  max-width: 600px;
  padding: 3rem;
  /* 深色半透明背景，确保文字清晰 */
  background: linear-gradient(135deg, rgba(30, 40, 50, 0.9) 0%, rgba(20, 30, 40, 0.95) 100%);
  border: 1px solid rgba(var(--color-primary-rgb), 0.3);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(15px);
  animation: slideUp 0.6s ease-out 0.2s both;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .auth-container {
    padding: 1rem;
  }

  .auth-panel {
    padding: 2rem 1.5rem;
    margin: 0;
    max-width: 100%;
    border-radius: 16px;
    min-height: auto;
  }

  .header-content {
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .header-content :deep(.theme-switcher) {
    position: static;
    margin-top: 0;
  }

  .mode-tabs {
    width: 100%;
    max-width: 300px;
  }

  .tab-button {
    padding: 0.6rem 0.8rem;
    font-size: 0.85rem;
  }

  .title {
    font-size: 1.8rem;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    font-size: 1rem;
    margin-bottom: 1rem;
  }

  .input-group {
    max-width: 100%;
    margin-bottom: 1.25rem;
  }

  .input-field {
    width: 100%;
    padding: 0.8rem 1rem;
    font-size: 1rem;
  }

  .btn-primary {
    padding: 0.9rem;
    font-size: 1rem;
  }
}

/* 小屏幕手机优化 */
@media (max-width: 480px) {
  .auth-container {
    padding: 0.5rem;
  }

  .auth-panel {
    padding: 1.5rem 1rem;
    border-radius: 12px;
  }

  .title {
    font-size: 1.6rem;
  }

  .subtitle {
    font-size: 0.9rem;
  }

  .mode-tabs {
    max-width: 280px;
  }

  .tab-button {
    padding: 0.5rem 0.6rem;
    font-size: 0.8rem;
  }

  .input-field {
    padding: 0.75rem 0.9rem;
    font-size: 0.95rem;
  }

  .btn-primary {
    padding: 0.85rem;
    font-size: 0.95rem;
  }
}

/* 横屏模式优化 */
@media (max-height: 600px) and (orientation: landscape) {
  .auth-container {
    padding: 0.5rem;
    align-items: flex-start;
    justify-content: flex-start;
    padding-top: 2rem;
  }

  .auth-panel {
    max-width: 500px;
    padding: 1.5rem;
  }

  .title {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    font-size: 0.9rem;
    margin-bottom: 0.8rem;
  }

  .auth-header {
    margin-bottom: 1.5rem;
  }

  .input-group {
    margin-bottom: 1rem;
  }
}

/* 大屏幕优化 */
@media (min-width: 1200px) {
  .auth-panel {
    max-width: 650px;
    padding: 3.5rem;
  }

  .title {
    font-size: 2.2rem;
  }

  .subtitle {
    font-size: 1.1rem;
  }
}

.auth-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.header-content {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  position: relative;
  margin-bottom: 1.5rem;
}

.header-content .mode-tabs {
  margin-bottom: 0;
}

.header-content :deep(.theme-switcher) {
  position: absolute;
  right: 0;
  top: 0;
}

.mode-tabs {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
  background-color: rgba(20, 30, 40, 0.5);
  border-radius: 8px;
  padding: 4px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
}

.tab-button {
  flex: 1;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button:hover {
  color: rgba(255, 255, 255, 0.9);
  background-color: rgba(var(--color-primary-rgb), 0.2);
}

.tab-button.active {
  color: var(--color-primary);
  background-color: rgba(var(--color-primary-rgb), 0.3);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.title {
  font-family: var(--font-family-serif);
  font-size: 2rem;
  color: var(--color-primary);
  margin-bottom: 0.75rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5), 0 0 20px rgba(var(--color-primary-rgb), 0.3);
}

.subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.input-group {
  max-width: 300px;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 1.5rem;
}

.input-label {
  display: block;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 0.5rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.input-field {
  width: 90%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  background-color: rgba(20, 30, 40, 0.6);
  border: 1px solid rgba(var(--color-primary-rgb), 0.3);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.input-field:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.2);
}

.error-message {
  color: var(--color-danger);
  font-size: 0.9rem;
  text-align: center;
  margin-top: -1rem;
  margin-bottom: 1.5rem;
  min-height: 1.2em;
}

.auth-footer {
  margin-top: 2rem;
}

.btn-primary {
  width: 100%;
  padding: 0.85rem;
  font-size: 1.1rem;
  font-family: var(--font-family-sans-serif);
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--color-border); /* 明确的边框 */
  color: var(--color-text-secondary);
  padding: 0.85rem;
  width: 100%;
  font-size: 1rem; /* 与主按钮字体大小协调 */
  font-family: var(--font-family-sans-serif);
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px; /* 与其他元素统一圆角 */
}

.btn-secondary:hover {
  background-color: var(--color-surface);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.mt-4 {
  margin-top: 1rem;
}
.btn-primary.is-loading {
  cursor: wait;
}

.loading-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
}

.loading-icon {
  display: inline-block;
  width: 1.2em;
  height: 1.2em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
