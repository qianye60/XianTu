<template>
  <div id="app-container">
    <ToastContainer />
    <GlobalLoadingOverlay />
    <!-- 全局操作按钮 - 只在非GameView页面显示 -->
    <div v-if="activeView !== 'GameView'" class="global-actions">
      <label class="theme-toggle" @click.prevent="toggleTheme">
        <input type="checkbox" ref="globalThemeCheckbox" :checked="!isDarkMode">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" class="moon">
          <path d="M223.5 32C100 32 0 132.3 0 256S100 480 223.5 480c60.6 0 115.5-24.2 155.8-63.4c5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6c-96.9 0-175.5-78.8-175.5-176c0-65.8 36-123.1 89.3-153.3c6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z"></path>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="sun">
          <path d="M361.5 1.2c5 2.1 8.6 6.6 9.6 11.9L391 121l107.9 19.8c5.3 1 9.8 4.6 11.9 9.6s1.5 10.7-1.6 15.2L446.9 256l62.3 90.3c3.1 4.5 3.7 10.2 1.6 15.2s-6.6 8.6-11.9 9.6L391 391 371.1 498.9c-1 5.3-4.6 9.8-9.6 11.9s-10.7 1.5-15.2-1.6L256 446.9l-90.3 62.3c-4.5 3.1-10.2 3.7-15.2 1.6s-8.6-6.6-9.6-11.9L121 391 13.1 371.1c-5.3-1-9.8-4.6-11.9-9.6s-1.5-10.7 1.6-15.2L65.1 256 2.8 165.7c-3.1-4.5-3.7-10.2-1.6-15.2s6.6-8.6 11.9-9.6L121 121 140.9 13.1c1-5.3 4.6-9.8 9.6-11.9s10.7-1.5 15.2 1.6L256 65.1 346.3 2.8c4.5-3.1 10.2-3.7 15.2-1.6zM160 256a96 96 0 1 1 192 0 96 96 0 1 1 -192 0zm224 0a128 128 0 1 0 -256 0 128 128 0 1 0 256 0z"></path>
        </svg>
      </label>
      <label class="fullscreen-toggle" @click.prevent="toggleFullscreen">
        <input type="checkbox" ref="globalFullscreenCheckbox">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="expand">
          <path d="M32 32C14.3 32 0 46.3 0 64v96c0 17.7 14.3 32 32 32s32-14.3 32-32V96h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H64V352zM320 32c-17.7 0-32 14.3-32 32s14.3 32 32 32h64v64c0 17.7 14.3 32 32 32s32-14.3 32-32V64c0-17.7-14.3-32-32-32H320zM448 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v64H320c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V352z"></path>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="compress">
          <path d="M160 64c0-17.7-14.3-32-32-32s-32 14.3-32 32v64H32c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V64zM32 320c-17.7 0-32 14.3-32 32s14.3 32 32 32H96v64c0 17.7 14.3 32 32 32s32-14.3 32-32V352c0-17.7-14.3-32-32-32H32zM352 64c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H352V64zM320 320c-17.7 0-32 14.3-32 32v96c0 17.7 14.3 32 32 32s32-14.3 32-32V384h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H320z"></path>
        </svg>
      </label>
    </div>

    <!-- 路由视图将在这里渲染所有页面 -->
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component"
          @start-creation="handleStartCreation"
          @show-character-list="handleShowCharacterList"
          @back="handleBack"
          @creation-complete="handleCreationComplete"
          @loggedIn="handleLoggedIn"
          @select="handleCharacterSelect"
          @login="handleGoToLogin"
        />
      </transition>
    </router-view>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import $ from 'jquery'; // 导入 jQuery
import ToastContainer from './components/common/ToastContainer.vue';
import GlobalLoadingOverlay from './components/common/GlobalLoadingOverlay.vue';
import './style.css';
import { useCharacterCreationStore } from './stores/characterCreationStore';
import { useCharacterStore } from './stores/characterStore';
import { useUIStore } from './stores/uiStore';
import { verifyStoredToken } from './services/request';
import { toast } from './utils/toast';
import type { CharacterBaseInfo, InnateAttributes, SaveData } from '@/types/game';
import { initializeCharacter } from '@/services/characterInitialization';

// --- 响应式状态定义 ---
const isLoggedIn = ref(false);
const isDarkMode = ref(true);
const globalThemeCheckbox = ref<HTMLInputElement>();
const globalFullscreenCheckbox = ref<HTMLInputElement>();

// --- 路由与视图管理 ---
const router = useRouter();
const route = useRoute();
type ViewName = 'ModeSelection' | 'CharacterCreation' | 'Login' | 'CharacterManagement' | 'GameView';

const activeView = computed(() => {
  const routeName = String(route.name || '');
  return routeName as ViewName;
});

const switchView = (viewName: ViewName) => {
  const routeMap: Record<ViewName, string> = {
    ModeSelection: '/',
    CharacterCreation: '/creation',
    Login: '/login',
    CharacterManagement: '/management',
    GameView: '/game',
  };
  const path = routeMap[viewName];
  if (path) {
    router.push(path);
  } else {
    console.warn(`未知的视图名称: ${viewName}，将导航至首页。`);
    router.push('/');
  }
};

// --- Pinia Stores ---
const creationStore = useCharacterCreationStore();
const characterStore = useCharacterStore();
const uiStore = useUIStore();

// --- 事件处理器 ---
const handleStartCreation = async (mode: 'single' | 'cloud') => {
  try {
    creationStore.setMode(mode);
    if (mode === 'single') {
      switchView('CharacterCreation');
    } else {
      isLoggedIn.value = await verifyStoredToken();
      if (isLoggedIn.value) {
        try {
          await creationStore.fetchAllCloudData();
          const cloudWorlds = creationStore.creationData.worlds.filter(w => w.source === 'cloud');
          if (cloudWorlds.length === 0) {
            throw new Error('未获取到任何云端世界数据');
          }
          console.log('【应用】云端创世数据获取完成');
          switchView('CharacterCreation');
        } catch (fetchError) {
          console.error("获取云端数据失败:", fetchError);
          toast.error("无法连接到服务器获取创世数据，请检查网络连接后重试。");
          switchView('ModeSelection');
        }
      } else {
        toast.error('联机共修需先登入道籍！');
        switchView('Login');
      }
    }
  } catch (error) {
    console.error("Failed to initialize creation data:", error);
    toast.error("初始化创角数据失败，请稍后重试。");
    switchView('ModeSelection');
  }
};

const handleShowCharacterList = () => {
  switchView('CharacterManagement');
};

const handleBack = () => {
  creationStore.resetCharacter();
  switchView('ModeSelection');
};

const handleLoggedIn = () => {
  isLoggedIn.value = true;
  switchView('ModeSelection');
};

const handleGoToLogin = () => {
 switchView('Login');
};

const handleCharacterSelect = async (selection: { charId: string, slotKey: string }) => {
  console.log(`接收到选择指令... 角色ID: ${selection.charId}, 存档槽: ${selection.slotKey}`);
  try {
    const success = await characterStore.loadGame(selection.charId, selection.slotKey);
    if (success) {
      console.log('存档加载成功，切换到游戏视图');
      await new Promise(resolve => setTimeout(resolve, 500));
      switchView('GameView');
    } else {
      console.error('存档加载失败');
      toast.error('存档加载失败，请重试');
    }
  } catch (error) {
    console.error('存档加载过程出错:', error);
    toast.error('进入游戏时发生错误：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

const handleCreationComplete = async (rawPayload: any) => {
  console.log('接收到创角指令...', rawPayload);
  uiStore.startLoading('开始铸造法身...');
  try {
    const convertedAttributes = rawPayload.baseAttributes ? {
      根骨: rawPayload.baseAttributes.root_bone || 5,
      灵性: rawPayload.baseAttributes.spirituality || 5,
      悟性: rawPayload.baseAttributes.comprehension || 5,
      气运: rawPayload.baseAttributes.fortune || 5,
      魅力: rawPayload.baseAttributes.charm || 5,
      心性: rawPayload.baseAttributes.temperament || 5
    } : {
      根骨: 5, 灵性: 5, 悟性: 5, 气运: 5, 魅力: 5, 心性: 5
    };

    const baseInfo: CharacterBaseInfo = {
      名字: rawPayload.characterName || '无名道友',
      性别: rawPayload.gender || '男',
      世界: rawPayload.world?.name || '未知世界',
      天资: rawPayload.talentTier?.name || '凡品',
      出生: rawPayload.origin?.name || '随机出身',
      灵根: rawPayload.spiritRoot?.name || '随机灵根',
      天赋: rawPayload.talents?.map((t: any) => t.name) || [],
      先天六司: convertedAttributes,
    };

    const charId = `char_${Date.now()}`;
    const creationPayload = {
      charId: charId,
      baseInfo: baseInfo,
      world: rawPayload.world,
      mode: rawPayload.mode as '单机' | '联机',
      age: rawPayload.age,
    };

    const createdBaseInfo = await characterStore.createNewCharacter(creationPayload);
    if (!createdBaseInfo) {
      throw new Error("角色创建失败，请检查 characterStore 的日志。");
    }

    const profile = characterStore.rootState.角色列表[charId];
    if (!profile) {
      throw new Error('严重错误：角色创建后无法在角色列表中找到！');
    }
    
    const slotKey = profile.模式 === '单机' ? '存档1' : '存档';
    characterStore.rootState.当前激活存档 = { 角色ID: charId, 存档槽位: slotKey };
    characterStore.commitToStorage();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success(`【${createdBaseInfo.名字}】已成功踏入修行之路！`);
    switchView('GameView');
  } catch (error) {
    console.error("角色创建过程出错：", error);
    const errorMessage = error instanceof Error ? error.message : "法身铸造过程中出现意外，请重试";
    toast.error(errorMessage);
    switchView('ModeSelection');
  } finally {
    uiStore.stopLoading();
  }
};

// --- 主题与全屏 ---
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  const theme = isDarkMode.value ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);

  if (globalThemeCheckbox.value) {
    globalThemeCheckbox.value.checked = !isDarkMode.value;
  }
  
  // 应用颜色变量
  applyThemeColors(theme);
};

const applyThemeColors = (theme: 'dark' | 'light') => {
  const root = document.documentElement;
  const colors = {
    dark: {
      '--color-background': '#1a1b26',
      '--color-background-transparent': 'rgba(26, 27, 38, 0.85)',
      '--color-surface': '#293348',
      '--color-surface-transparent': 'rgba(41, 51, 72, 0.6)',
      '--color-surface-light': '#414868',
      '--color-primary': '#82a3f5',
      '--color-primary-rgb': '130, 163, 245',
      '--color-accent': '#c0caf5',
      '--color-text': '#ffffff',
      '--color-text-secondary': '#d0d0d0',
      '--color-border': 'rgba(173, 216, 230, 0.5)',
      '--color-success': '#9ece6a',
      '--color-warning': '#ffd500',
      '--color-error': '#f7768e',
      '--color-info': '#7dcfff',
    },
    light: {
      '--color-background': '#f0f0f0',
      '--color-background-transparent': 'rgba(240, 240, 240, 0.85)',
      '--color-surface': '#ffffff',
      '--color-surface-transparent': 'rgba(255, 255, 255, 0.75)',
      '--color-surface-light': '#e5e6eb',
      '--color-primary': '#2e5cb8',
      '--color-primary-rgb': '46, 92, 184',
      '--color-accent': '#7c4dff',
      '--color-text': '#1a1a1a',
      '--color-text-secondary': '#666666',
      '--color-border': 'rgba(0, 0, 0, 0.1)',
      '--color-success': '#4caf50',
      '--color-warning': '#ff9800',
      '--color-error': '#f44336',
      '--color-info': '#2196f3',
    }
  };
  
  const themeColors = colors[theme];
  for (const [key, value] of Object.entries(themeColors)) {
    root.style.setProperty(key, value);
  }
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.error('无法进入全屏模式:', err);
    });
  } else if (document.exitFullscreen) {
    document.exitFullscreen().catch(err => {
      console.error('无法退出全屏模式:', err);
    });
  }
};

// --- 生命周期钩子 ---
onMounted(() => {
  // 1. Iframe 高度适配 (主动查询父窗口模式)
  const updateHeight = () => {
    try {
      // 检查是否在 iframe 中
      if (window.parent === window) {
        return;
      }
      
      const externalDiv = $('#chat', parent.document);
      if (externalDiv.length > 0) {
        const height = externalDiv.height();
        if (height) {
          const calculatedHeight = height * 0.9;
          const newMinHeight = `${calculatedHeight}px`;
          document.documentElement.style.minHeight = newMinHeight;
          console.log(`[App.vue] 主动查询父窗口#chat高度成功，应用min-height: ${newMinHeight}`);
        }
      } else {
        console.warn('[App.vue] 在父窗口中未找到 #chat 元素，无法自动调整高度。');
      }
    } catch (e) {
      console.error('[App.vue] 访问父窗口DOM失败，可能是跨域限制。请确保iframe与父页面同源。', e);
      // 如果跨域，则停止后续尝试
      $(parent.window).off('resize', updateHeight);
    }
  };

  // 初始化并监听父窗口大小变化
  updateHeight();
  $(parent.window).on('resize', updateHeight);
  
  // 2. 初始化主题
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    isDarkMode.value = false;
  }
  toggleTheme(); // 应用初始主题

  // 3. 全屏状态同步
  const syncFullscreenState = () => {
    if (globalFullscreenCheckbox.value) {
      globalFullscreenCheckbox.value.checked = !!document.fullscreenElement;
    }
  };
  
  document.addEventListener('fullscreenchange', syncFullscreenState);
  document.addEventListener('webkitfullscreenchange', syncFullscreenState);
  document.addEventListener('mozfullscreenchange', syncFullscreenState);
  document.addEventListener('MSFullscreenChange', syncFullscreenState);
  
  syncFullscreenState(); // 初始检查

  // 统一的清理逻辑
  onUnmounted(() => {
    // 清理父窗口resize监听
    if (window.parent !== window) {
      try {
        $(parent.window).off('resize', updateHeight);
      } catch (e) {
        // 忽略跨域错误
      }
    }
    // 清理全屏监听
    document.removeEventListener('fullscreenchange', syncFullscreenState);
    document.removeEventListener('webkitfullscreenchange', syncFullscreenState);
    document.removeEventListener('mozfullscreenchange', syncFullscreenState);
    document.removeEventListener('MSFullscreenChange', syncFullscreenState);
  });
});
</script>

<style>
/* 添加页面切换过渡效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

#app-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow-x: hidden;
  position: relative;
}

/* 全局操作按钮样式 */
.global-actions {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  gap: 12px;
  pointer-events: auto;
}

.theme-toggle,
.fullscreen-toggle {
  --color: #a5a5b0;
  --size: 24px;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  color: var(--color);
  font-size: var(--size);
  user-select: none;
  fill: var(--color);
}

.theme-toggle:hover,
.fullscreen-toggle:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 0.95);
}

.theme-toggle:active,
.fullscreen-toggle:active {
  transform: translateY(0);
}

/* 主题切换图标 */
.theme-toggle .moon {
  position: absolute;
  animation: keyframes-fill .5s;
  width: 24px;
  height: 24px;
}

.theme-toggle .sun {
  position: absolute;
  display: none;
  animation: keyframes-fill .5s;
  width: 24px;
  height: 24px;
}

.theme-toggle input:checked ~ .moon {
  display: none;
}

.theme-toggle input:checked ~ .sun {
  display: block;
}

/* 全屏切换图标 */
.fullscreen-toggle .expand {
  position: absolute;
  animation: fullscreen-fill .5s;
  width: 24px;
  height: 24px;
}

.fullscreen-toggle .compress {
  position: absolute;
  display: none;
  animation: fullscreen-fill .5s;
  width: 24px;
  height: 24px;
}

.fullscreen-toggle input:checked ~ .expand {
  display: none;
}

.fullscreen-toggle input:checked ~ .compress {
  display: block;
}

/* 隐藏checkbox */
.theme-toggle input,
.fullscreen-toggle input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

/* 动画效果 */
@keyframes keyframes-fill {
  0% {
    transform: rotate(-360deg) scale(0);
    opacity: 0;
  }
  75% {
    transform: rotate(25deg);
  }
  100% {
    transform: rotate(0deg) scale(1);
    opacity: 1;
  }
}

@keyframes fullscreen-fill {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 暗色主题适配 */
[data-theme="dark"] .theme-toggle,
[data-theme="dark"] .fullscreen-toggle {
  background: rgba(41, 51, 72, 0.9);
  --color: #82A3F5;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .theme-toggle:hover,
[data-theme="dark"] .fullscreen-toggle:hover {
  background: rgba(41, 51, 72, 0.95);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}
</style>