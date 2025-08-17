<template>
  <div id="app-container">
    <div class="global-actions">
      <button @click="toggleTheme" class="theme-toggle">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
      </button>
      <button @click="toggleFullscreen" class="fullscreen-toggle">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
      </button>
    </div>
    <component
          :is="activeView"
          @start-creation="handleStartCreation"
          @show-character-list="handleShowCharacterList"
          :onBack="handleBack"
          @loggedIn="handleLoggedIn"
          @creation-complete="handleCreationComplete"
          :character="activeCharacter"
        />
  </div>
</template>

<script setup lang="ts">
import { shallowRef, ref, onMounted } from 'vue'
import ModeSelection from './views/ModeSelection.vue'
import CharacterCreation from './views/CharacterCreation.vue'
import CharacterManagement from './components/character-creation/CharacterManagement.vue'
import LoginView from './views/LoginView.vue'
import GameView from './views/GameView.vue'
import './style.css'
import { useCharacterCreationStore } from './stores/characterCreationStore'
import { verifyStoredToken } from './services/request'
import { toast } from './utils/toast'
import type { LocalCharacterWithGameData } from './data/localData'

const isLoggedIn = ref(false);
const activeCharacter = ref<LocalCharacterWithGameData | null>(null);

// --- 核心视图管理 ---
const views = {
  ModeSelection,
  CharacterCreation,
  CharacterManagement,
  Login: LoginView,
  GameView,
}
type ViewName = keyof typeof views;
const activeView = shallowRef<any>(views.ModeSelection)

const store = useCharacterCreationStore();

const switchView = (viewName: ViewName) => {
  const component = views[viewName]
  if (component) {
    activeView.value = component
  } else {
    activeView.value = ModeSelection
  }
}

const handleStartCreation = (mode: 'single' | 'cloud') => {
  store.setMode(mode);
  if (mode === 'single') {
    switchView('CharacterCreation');
  } else {
    // 联机创角，必须登录
    if (isLoggedIn.value) {
      switchView('CharacterCreation');
    } else {
      toast.error('联机共修需先登入道籍！');
      switchView('Login');
    }
  }
}

const handleShowCharacterList = () => {
  // 查看角色列表（尤其是联机），必须登录
  if (isLoggedIn.value) {
    switchView('CharacterManagement');
  } else {
    toast.error('查看云端法身需先登入道籍！');
    switchView('Login');
  }
}

const handleBack = () => {
  // 只重置角色创建的进度，而不是整个 store
  store.resetCharacter();
  switchView('ModeSelection');
}

const handleLoggedIn = () => {
  isLoggedIn.value = true;
  // 登录后不应自动跳转到创角，而是返回模式选择，让用户决定是创角还是读档
  switchView('ModeSelection');
}

const handleCreationComplete = (character: LocalCharacterWithGameData) => {
  activeCharacter.value = character;
  switchView('GameView');
}

// --- 主题切换 ---
const isDarkMode = ref(true);
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light');
}

const checkInitialLoginStatus = async () => {
  isLoggedIn.value = await verifyStoredToken();
  if (isLoggedIn.value) {
    toast.info('检测到有效身份令牌');
  }
};


onMounted(() => {
  document.documentElement.setAttribute('data-theme', 'dark');

  // 在后台检查初始登录状态，不阻塞UI
  checkInitialLoginStatus();

  // 启动心跳阵法，每小时检查一次令牌状态
  setInterval(async () => {
    // 只在联机模式且非登录界面时检查
    if (store.mode === 'cloud' && activeView.value !== views.Login) {
      const isValid = await verifyStoredToken();
      if (!isValid) {
        isLoggedIn.value = false;
        toast.error('身份令牌已失效，请重新登入。');
        switchView('Login');
      } else {
        isLoggedIn.value = true;
      }
    }
  }, 3600 * 1000); // 1小时
})


// --- 全屏切换 ---
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}
</script>

<style>
#app-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}
.global-actions {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  gap: 0.5rem;
}
.global-actions button {
  background: rgba(40, 40, 40, 0.7);
  border: 1px solid #555;
  color: #c8ccd4;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.2s ease;
}
.global-actions button:hover {
  background: #e5c07b;
  color: #1a1a1a;
}
</style>
