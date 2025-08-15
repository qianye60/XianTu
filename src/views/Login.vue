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
import { ref } from 'vue';
import { toast } from '../utils/toast';

const emit = defineEmits(['loggedIn', 'back']);

const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const isLoading = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const isRegisterMode = ref(false);

const toggleMode = () => {
  isRegisterMode.value = !isRegisterMode.value;
  error.value = null;
  successMessage.value = null;
  password.value = '';
  confirmPassword.value = '';
};

const handleRegister = async () => {
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的令牌不一致！';
    return;
  }

  isLoading.value = true;
  error.value = null;
  successMessage.value = null;
  
  try {
    const response = await fetch('http://127.0.0.1:12345/api/v1/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username.value,
            password: password.value,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '注册失败，请重试。');
    }
    
    const data = await response.json();
    successMessage.value = '注册成功！正在为您登入...';
    toast.success('道号注册成功，欢迎踏入修仙之路！');
    
    // 自动登录
    setTimeout(() => {
      handleLogin();
    }, 1000);

  } catch (e: any) {
    error.value = e.message;
    toast.error(e.message);
  } finally {
    isLoading.value = false;
  }
};

const handleLogin = async () => {
  isLoading.value = true;
  error.value = null;
  successMessage.value = null;
  
  try {
    const response = await fetch('http://127.0.0.1:12345/api/v1/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username.value,
            password: password.value,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '道号或令牌错误，请重试。');
    }
    
    const data = await response.json();
    
    // 保存token和用户名到localStorage
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('username', username.value);
    
    toast.success('登入成功，天机已连通！');
    emit('loggedIn');

  } catch (e: any) {
    error.value = e.message;
    toast.error(e.message);
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