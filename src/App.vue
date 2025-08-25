<template>
  <div id="app-container">
    <!-- 全局操作按钮 - 只在非GameView页面显示 -->
    <div v-if="activeView !== views.GameView" class="global-actions">
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

    <LoadingModal :visible="isInitializing" :message="loadingMessage" />

    <component
      v-show="!isInitializing"
      :is="activeView"
      @start-creation="handleStartCreation"
      @show-character-list="handleShowCharacterList"
      @back="handleBack"
      @loggedIn="handleLoggedIn"
      @creation-complete="handleCreationComplete"
      @select="handleCharacterSelect"
      @login="handleGoToLogin"
    />
  </div>
</template>

<script setup lang="ts">
import { shallowRef, ref, onMounted } from 'vue';
import ModeSelection from './views/ModeSelection.vue';
import CharacterCreation from './views/CharacterCreation.vue';
import LoginView from './views/LoginView.vue';
import GameView from './views/GameView.vue';
import CharacterManagement from './components/character-creation/CharacterManagement.vue';
import LoadingModal from './components/LoadingModal.vue';
import './style.css';
import { useCharacterCreationStore } from './stores/characterCreationStore';
import { useCharacterStore } from './stores/characterStore';
import { verifyStoredToken } from './services/request';
import { toast } from './utils/toast';
import type { CharacterBaseInfo, InnateAttributes, SaveData } from '@/types/game';
import { initializeCharacter } from '@/services/characterInitialization';

const isLoggedIn = ref(false);
const isInitializing = ref(false);
const loadingMessage = ref('正在开天辟地，衍化万物...');

// 添加全局按钮引用
const globalThemeCheckbox = ref<HTMLInputElement>();
const globalFullscreenCheckbox = ref<HTMLInputElement>();

// --- 核心视图管理 ---
const views = {
  ModeSelection,
  CharacterCreation,
  Login: LoginView,
  CharacterManagement,
  GameView,
};
type ViewName = keyof typeof views;
const activeView = shallowRef<any>(views.ModeSelection);

const creationStore = useCharacterCreationStore();
const characterStore = useCharacterStore();

const switchView = (viewName: ViewName) => {
  activeView.value = views[viewName] || ModeSelection;
};

const handleStartCreation = async (mode: 'single' | 'cloud') => {
  isInitializing.value = true;
  loadingMessage.value = '正在连接天地法则...';
  try {
    creationStore.setMode(mode);
    // await creationStore.initializeStore(mode); // 假设创角store有初始化逻辑

    if (mode === 'single') {
      switchView('CharacterCreation');
    } else {
      isLoggedIn.value = await verifyStoredToken();
      if (isLoggedIn.value) {
        try {
          // 首先获取所有云端数据
          loadingMessage.value = '正在获取云端创世数据...';
          await creationStore.fetchAllCloudData();
          
          // 检查是否成功获取到云端世界数据
          const cloudWorlds = creationStore.creationData.worlds.filter(w => w.source === 'cloud');
          if (cloudWorlds.length === 0) {
            throw new Error('未获取到任何云端世界数据');
          }
          
          console.log('【应用】云端创世数据获取完成');
          // 然后再进入创角界面
          switchView('CharacterCreation');
        } catch (fetchError) {
          console.error("获取云端数据失败:", fetchError);
          toast.error("无法连接到服务器获取创世数据，请检查网络连接后重试。");
          // 获取失败时返回模式选择界面
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
  } finally {
    isInitializing.value = false;
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

// 统一的角色/存档选择处理器
const handleCharacterSelect = async (selection: { charId: string, slotKey: string }) => {
  console.log(`接收到选择指令... 角色ID: ${selection.charId}, 存档槽: ${selection.slotKey}`);
  
  // 显示加载状态
  isInitializing.value = true;
  loadingMessage.value = '正在进入世界...';
  
  try {
    const success = await characterStore.loadGame(selection.charId, selection.slotKey);
    
    if (success) {
      console.log('存档加载成功，切换到游戏视图');
      // 确保数据已完全加载后再切换视图
      await new Promise(resolve => setTimeout(resolve, 500));
      switchView('GameView');
    } else {
      console.error('存档加载失败');
      toast.error('存档加载失败，请重试');
      // 加载失败时留在角色管理界面
    }
  } catch (error) {
    console.error('存档加载过程出错:', error);
    toast.error('进入游戏时发生错误：' + (error instanceof Error ? error.message : '未知错误'));
  } finally {
    isInitializing.value = false;
  }
};

const handleCreationComplete = async (rawPayload: any) => {
  console.log('接收到创角指令...', rawPayload);

  // 立即设置加载状态，防止用户多次点击
  if (isInitializing.value) {
    console.log('正在初始化中，请稍候...');
    return;
  }

  isInitializing.value = true;
  loadingMessage.value = '正在铸造法身，演化天机...';

  try {
    // 1. 将原始数据转换为 CharacterBaseInfo 结构
    // 重要：需要将英文键名转换为中文键名
    const convertedAttributes = rawPayload.baseAttributes ? {
      根骨: rawPayload.baseAttributes.root_bone || 5,
      灵性: rawPayload.baseAttributes.spirituality || 5,
      悟性: rawPayload.baseAttributes.comprehension || 5,
      气运: rawPayload.baseAttributes.fortune || 5,
      魅力: rawPayload.baseAttributes.charm || 5,
      心性: rawPayload.baseAttributes.temperament || 5
    } : {
      根骨: 5,
      灵性: 5,
      悟性: 5,
      气运: 5,
      魅力: 5,
      心性: 5
    };

    console.log('转换后的先天六司属性：', convertedAttributes);

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

    // 2. 准备 store 需要的 CreationPayload
    const charId = `char_${Date.now()}`;
    const creationPayload = {
      charId: charId,
      baseInfo: baseInfo,
      world: rawPayload.world,
      mode: rawPayload.mode as '单机' | '联机',
      age: rawPayload.age,
    };

    // 3. 调用 store 创建角色基础档案（注意：这是异步函数！）
    const createdBaseInfo = await characterStore.createNewCharacter(creationPayload);

    if (!createdBaseInfo) {
      console.error("角色创建失败，请检查 characterStore 的日志。");
      toast.error("角色创建失败");
      isInitializing.value = false;
      return;
    }

    // 4. 注意：createNewCharacter 已经包含了初始化和保存逻辑
    // 不需要再重复执行，否则会覆盖数据

    // 5. 只需要确保激活存档已设置
    console.log('角色创建完成，当前rootState:', characterStore.rootState);

    // 验证角色是否真的创建成功
    const profile = characterStore.rootState.角色列表[charId];
    if (!profile) {
      console.error('严重错误：角色创建后无法在角色列表中找到！');
      toast.error('角色数据保存失败');
      isInitializing.value = false;
      switchView('ModeSelection');
      return;
    }

    console.log('成功找到创建的角色:', profile);

    // 6. 设置当前激活存档（不调用loadGame避免异步问题）
    loadingMessage.value = '正在进入游戏世界...';
    const slotKey = profile?.模式 === '单机' ? '存档1' : '存档';
    characterStore.rootState.当前激活存档 = { 角色ID: charId, 存档槽位: slotKey };
    characterStore.commitToStorage();

    // 7. 延迟一下确保数据保存完成，然后进入游戏
    await new Promise(resolve => setTimeout(resolve, 500));

    // 8. 确保所有数据都已保存并生成完毕后，才进入游戏
    toast.success(`【${createdBaseInfo.名字}】已成功踏入修行之路！`);

    // 9. 关闭加载状态
    isInitializing.value = false;

    // 10. 最后切换到游戏视图
    switchView('GameView');

  } catch (error) {
    console.error("角色创建过程出错：", error);
    toast.error("法身铸造过程中出现意外，请重试");
    isInitializing.value = false;
    // 失败后返回模式选择页面
    switchView('ModeSelection');
  }
};

// --- 主题与全屏 ---
const isDarkMode = ref(true);

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  const theme = isDarkMode.value ? 'dark' : 'light';

  // 设置根元素主题
  document.documentElement.setAttribute('data-theme', theme);

  // 更新全局按钮状态
  if (globalThemeCheckbox.value) {
    globalThemeCheckbox.value.checked = theme === 'light';
  }

  // 设置CSS变量以适配所有页面
  const root = document.documentElement;
  if (isDarkMode.value) {
    // 暗色主题 (参照图片风格)
    root.style.setProperty('--color-background', '#1a1b26'); // 深邃的背景，以防视频加载失败
    root.style.setProperty('--color-background-transparent', 'rgba(26, 27, 38, 0.85)');
    root.style.setProperty('--color-surface', '#293348');
    root.style.setProperty('--color-surface-transparent', 'rgba(41, 51, 72, 0.6)'); // 调整透明度以匹配参考图
    root.style.setProperty('--color-surface-light', '#414868');
    root.style.setProperty('--color-primary', '#82a3f5'); // 图片中的图标和点缀色
    root.style.setProperty('--color-primary-rgb', '130, 163, 245');
    root.style.setProperty('--color-accent', '#c0caf5'); // 用于主要标题
    root.style.setProperty('--color-text', '#ffffff'); // 纯白色文字
    root.style.setProperty('--color-text-secondary', '#d0d0d0'); // 浅灰色次要文字
    root.style.setProperty('--color-border', 'rgba(173, 216, 230, 0.5)'); // 增强发光边框
    root.style.setProperty('--color-success', '#9ece6a');
    root.style.setProperty('--color-warning', '#ffd500');
    root.style.setProperty('--color-error', '#f7768e');
    root.style.setProperty('--color-info', '#7dcfff');
  } else {
    // 亮色主题 (纯净透明)
    root.style.setProperty('--color-background', '#f0f0f0');
    root.style.setProperty('--color-background-transparent', 'rgba(240, 240, 240, 0.85)');
    root.style.setProperty('--color-surface', '#ffffff');
    root.style.setProperty('--color-surface-transparent', 'rgba(255, 255, 255, 0.75)'); // 纯白透明
    root.style.setProperty('--color-surface-light', '#e5e6eb');
    root.style.setProperty('--color-primary', '#2e5cb8');
    root.style.setProperty('--color-primary-rgb', '46, 92, 184');
    root.style.setProperty('--color-accent', '#7c4dff');
    root.style.setProperty('--color-text', '#1a1a1a');
    root.style.setProperty('--color-text-secondary', '#666666');
    root.style.setProperty('--color-border', 'rgba(0, 0, 0, 0.1)'); // 清晰的灰色边框
    root.style.setProperty('--color-success', '#4caf50');
    root.style.setProperty('--color-warning', '#ff9800');
    root.style.setProperty('--color-error', '#f44336');
    root.style.setProperty('--color-info', '#2196f3');
  }

  // 保存主题偏好到本地存储
  localStorage.setItem('theme', theme);
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => {
      if (globalFullscreenCheckbox.value) {
        globalFullscreenCheckbox.value.checked = true;
      }
    }).catch(err => {
      console.error('无法进入全屏模式:', err);
    });
  } else if (document.exitFullscreen) {
    document.exitFullscreen().then(() => {
      if (globalFullscreenCheckbox.value) {
        globalFullscreenCheckbox.value.checked = false;
      }
    }).catch(err => {
      console.error('无法退出全屏模式:', err);
    });
  }
};

onMounted(async () => {
  // 预加载视频背景
  try {
    console.log('[App] 开始预加载视频背景...');
    // const { VideoCache } = await import('@/utils/videoCache');
    // VideoCache.getInstance(); // 这会自动开始预加载默认视频
    console.log('[App] 视频背景预加载已启动');
  } catch (error) {
    console.warn('[App] 视频背景预加载失败:', error);
  }

  // 默认深色主题
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    isDarkMode.value = false;
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    isDarkMode.value = true;
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark'); // 确保保存
  }
  
  // 初始化全局按钮状态
  if (globalThemeCheckbox.value) {
    globalThemeCheckbox.value.checked = !isDarkMode.value;
  }
  if (globalFullscreenCheckbox.value) {
    globalFullscreenCheckbox.value.checked = !!document.fullscreenElement;
  }
  
  // 监听全屏状态变化
  const handleFullscreenChange = () => {
    if (globalFullscreenCheckbox.value) {
      globalFullscreenCheckbox.value.checked = !!document.fullscreenElement;
    }
  };
  
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);
  
  // 应用主题样式
  const theme = isDarkMode.value ? 'dark' : 'light';
  const root = document.documentElement;
  if (isDarkMode.value) {
    // 暗色主题 (参照图片风格)
    root.style.setProperty('--color-background', '#1a1b26'); // 深邃的背景，以防视频加载失败
    root.style.setProperty('--color-background-transparent', 'rgba(26, 27, 38, 0.85)');
    root.style.setProperty('--color-surface', '#293348');
    root.style.setProperty('--color-surface-transparent', 'rgba(41, 51, 72, 0.6)'); // 调整透明度以匹配参考图
    root.style.setProperty('--color-surface-light', '#414868');
    root.style.setProperty('--color-primary', '#82a3f5'); // 图片中的图标和点缀色
    root.style.setProperty('--color-primary-rgb', '130, 163, 245');
    root.style.setProperty('--color-accent', '#c0caf5'); // 用于主要标题
    root.style.setProperty('--color-text', '#ffffff'); // 纯白色文字
    root.style.setProperty('--color-text-secondary', '#d0d0d0'); // 浅灰色次要文字
    root.style.setProperty('--color-border', 'rgba(173, 216, 230, 0.5)'); // 增强发光边框
    root.style.setProperty('--color-success', '#9ece6a');
    root.style.setProperty('--color-warning', '#ffd500');
    root.style.setProperty('--color-error', '#f7768e');
    root.style.setProperty('--color-info', '#7dcfff');
  } else {
    // 亮色主题 (纯净透明)
    root.style.setProperty('--color-background', '#f0f0f0');
    root.style.setProperty('--color-background-transparent', 'rgba(240, 240, 240, 0.85)');
    root.style.setProperty('--color-surface', '#ffffff');
    root.style.setProperty('--color-surface-transparent', 'rgba(255, 255, 255, 0.75)'); // 纯白透明
    root.style.setProperty('--color-surface-light', '#e5e6eb');
    root.style.setProperty('--color-primary', '#2e5cb8');
    root.style.setProperty('--color-primary-rgb', '46, 92, 184');
    root.style.setProperty('--color-accent', '#7c4dff');
    root.style.setProperty('--color-text', '#1a1a1a');
    root.style.setProperty('--color-text-secondary', '#666666');
    root.style.setProperty('--color-border', 'rgba(0, 0, 0, 0.1)'); // 清晰的灰色边框
    root.style.setProperty('--color-success', '#4caf50');
    root.style.setProperty('--color-warning', '#ff9800');
    root.style.setProperty('--color-error', '#f44336');
    root.style.setProperty('--color-info', '#2196f3');
  }
});
</script>

<style>
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
