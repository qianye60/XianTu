<template>
  <div class="auth-container">
    <div class="auth-panel">
      <header class="auth-header">
        <h1 class="title">登入 / 注册道号</h1>
        <p class="subtitle">道友，请报上你的名号，以入大道之门。</p>
      </header>

      <main class="auth-main">
        <div class="input-group">
          <label for="username" class="input-label">道号</label>
          <input
            id="username"
            v-model="userName"
            type="text"
            class="input-field"
            placeholder="例如：青莲剑仙"
            @keyup.enter="handleLogin"
            :disabled="isLoading"
          />
        </div>
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      </main>

      <footer class="auth-footer">
        <button
          @click="handleLogin"
          class="btn btn-primary"
          :disabled="isLoading || !userName.trim()"
        >
          <span v-if="isLoading">验证天机中...</span>
          <span v-else>进入大道</span>
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'

const userName = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

const { loginOrRegister } = useAuth()

const handleLogin = async () => {
  if (!userName.value.trim() || isLoading.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const result = await loginOrRegister(userName.value.trim())
    if (!result.success) {
      errorMessage.value = result.message || '登入失败，请稍后再试。'
    }
    // On success, the parent component (App.vue) will detect the isLoggedIn state change
    // and automatically switch the view. We don't need to do anything else here.
  } catch (error: any) {
    errorMessage.value = error.message || '发生了未知错误。'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--color-background);
}

.auth-panel {
  width: 100%;
  max-width: 450px;
  padding: 3rem 2.5rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.auth-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.title {
  font-family: var(--font-family-serif);
  font-size: 2rem;
  color: var(--color-primary);
  margin-bottom: 0.75rem;
}

.subtitle {
  font-size: 1rem;
  color: var(--color-text-secondary);
}

.input-group {
  margin-bottom: 1.5rem;
}

.input-label {
  display: block;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
}

.input-field {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  background-color: var(--color-background);
  border: 1px solid var(--color-border-hover);
  border-radius: 8px;
  color: var(--color-text);
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
</style>
