<template>
  <div id="app-container">
    <ToastContainer />
    <GlobalLoadingOverlay />
    <RetryConfirmDialog />
    <DataValidationErrorDialog />
    <StateChangeViewer
      v-if="uiStore.showStateChangeViewer"
      :log="uiStore.stateChangeLogToShow"
      @close="uiStore.closeStateChangeViewer"
    />
    <!-- 全局操作按钮 - 只在非游戏界面显示 -->
    <div v-if="!isInGameView" class="global-actions">
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
      <button class="theme-toggle" @click="showHelp" title="帮助">
        <HelpCircle :size="24" />
      </button>
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
          @login="handleGoToLogin"
        />
      </transition>
    </router-view>

    <!-- Author Info Modal -->
    <div v-if="showAuthorModal" class="author-modal-overlay" @click.self="showAuthorModal = false">
      <div class="author-modal">
        <div class="author-modal-header">
          <h3>作者信息</h3>
          <button class="close-btn" @click="showAuthorModal = false">&times;</button>
        </div>
        <div class="author-modal-body">
          <p><strong>作者:</strong> 千夜</p>
          <p>
            <strong>GitHub:</strong>
            <a href="https://github.com/qianye60" target="_blank" rel="noopener noreferrer">
              https://github.com/qianye60
            </a>
          </p>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watchEffect, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import $ from 'jquery'; // 导入 jQuery
import { HelpCircle } from 'lucide-vue-next'; // 导入图标
import ToastContainer from './components/common/ToastContainer.vue';
import GlobalLoadingOverlay from './components/common/GlobalLoadingOverlay.vue';
import RetryConfirmDialog from './components/common/RetryConfirmDialog.vue';
import DataValidationErrorDialog from './components/common/DataValidationErrorDialog.vue';
import StateChangeViewer from './components/common/StateChangeViewer.vue';
import './style.css';
import { useCharacterCreationStore } from './stores/characterCreationStore';
import { useCharacterStore } from './stores/characterStore';
import { useUIStore } from './stores/uiStore';
import { toast } from './utils/toast';
import { getTavernHelper } from './utils/tavern'; // 添加导入
import type { CharacterBaseInfo } from '@/types/game';
import type { CharacterCreationPayload, Talent } from '@/types';

// --- 响应式状态定义 ---
const isLoggedIn = ref(false);
const isDarkMode = ref(localStorage.getItem('theme') !== 'light');
const globalThemeCheckbox = ref<HTMLInputElement>();
const globalFullscreenCheckbox = ref<HTMLInputElement>();
const isFullscreenMode = ref(localStorage.getItem('fullscreen') === 'true');
const showAuthorModal = ref(false);

// --- 路由与视图管理 ---
const router = useRouter();
const route = useRoute();
type ViewName = 'ModeSelection' | 'CharacterCreation' | 'Login' | 'CharacterManagement' | 'GameView';

// 判断是否在游戏界面（包括所有游戏子路由）
const isInGameView = computed(() => {
  return route.path.startsWith('/game');
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
    // 全局封锁联机模式，强制仅允许单机
    if (mode !== 'single') {
      toast.info('联机共修开发中，当前版本暂未开放');
      switchView('ModeSelection');
      return;
    }
    creationStore.setMode('single');
    if (true) {
      switchView('CharacterCreation');
    }
  } catch (error) {
    console.error("Failed to initialize creation data:", error);
    toast.error("初始化创角数据失败，请稍后重试。");
    switchView('ModeSelection');
  }
};

const handleShowCharacterList = () => {
  // 导航到角色管理页面
  router.push('/management');
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

const handleCreationComplete = async (rawPayload: CharacterCreationPayload) => {
  console.log('接收到创角指令...', rawPayload);

  // 防止重复创建角色
  if (uiStore.isLoading) {
    console.warn('[App.vue] 角色创建已在进行中，忽略重复请求');
    return;
  }

  uiStore.startLoading('开始铸造法身...');

  const attemptCreation = async (): Promise<boolean> => {
    try {
      // 从酒馆获取当前活跃的Persona名字
      let personaName: string = '无名道友';
      try {
        const helper = getTavernHelper();
        if (helper) {
          const vars = await helper.getVariables({ type: 'global' });
          // 尝试获取当前Persona的名字
          const name = vars['persona.name'] || vars['name'] || rawPayload.characterName;
          personaName = (typeof name === 'string' ? name : rawPayload.characterName) || '无名道友';
          console.log('[创角完成] 从酒馆Personas获取名字:', personaName);
        }
      } catch (error) {
        console.warn('[创角完成] 无法从酒馆获取Persona名字，使用用户输入:', error);
        personaName = rawPayload.characterName || '无名道友';
      }

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
        名字: personaName, // 使用从酒馆获取的Persona名字
        性别: rawPayload.gender || '男',
        世界: rawPayload.world?.name || '未知世界', // 保持用户选择的世界
        天资: rawPayload.talentTier?.name || '凡品',
        出生: rawPayload.origin?.name || '随机出身',
        灵根: rawPayload.spiritRoot?.name || '随机灵根',
        天赋: rawPayload.talents?.map((t: Talent) => t.name) || [],
        先天六司: convertedAttributes,
        天资详情: rawPayload.talentTier,
        出身详情: rawPayload.origin,
        灵根详情: rawPayload.spiritRoot || undefined,
        天赋详情: rawPayload.talents,
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

      // 跳转到游戏主界面路由
      await router.push('/game');

      // 路由跳转后，尝试恢复全屏状态
      await new Promise(resolve => setTimeout(resolve, 100)); // 等待路由完全加载
      restoreFullscreenIfNeeded();

      return true; // 创建成功
    } catch (error) {
      console.error("角色创建过程出错：", error);
      const errorMessage = error instanceof Error ? error.message : "法身铸造过程中出现意外";

      // 检查是否是用户主动取消的错误
      if (errorMessage.includes('用户选择终止角色创建') || errorMessage.includes('用户选择不继续重试')) {
        console.log('[角色创建] 用户主动取消创建流程');
        toast.info('角色创建已取消');
        return false; // 用户取消，返回到角色创建页面
      }

      // 其他错误，询问用户是否重试
      return new Promise((resolve) => {
        uiStore.showRetryDialog({
          title: '角色创建失败',
          message: `角色创建过程中遇到问题：\n\n${errorMessage}\n\n是否重新尝试创建角色？\n\n选择"取消"将返回角色创建页面。`,
          confirmText: '重新创建',
          cancelText: '返回创建页面',
          onConfirm: async () => {
            console.log('[角色创建] 用户选择重新创建');
            resolve(await attemptCreation()); // 递归重试
          },
          onCancel: () => {
            console.log('[角色创建] 用户选择返回创建页面');
            toast.info('已返回角色创建页面，您可以调整设置后重新开始');
            resolve(false); // 返回到角色创建页面
          }
        });
      });
    }
  };

  try {
    const success = await attemptCreation();
    if (!success) {
      // 用户取消或选择返回创建页面，不做任何操作
      // 保持在当前的角色创建页面
      console.log('[角色创建] 保持在角色创建页面');
    }
  } catch (error) {
    // 最终兜底错误处理
    console.error("角色创建流程出现严重错误：", error);
    toast.error("角色创建流程出现严重错误，返回模式选择页面");
    switchView('ModeSelection');
  } finally {
    uiStore.stopLoading();
  }
};

// --- 主题与全屏 ---
watchEffect(() => {
  const theme = isDarkMode.value ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);

  if (globalThemeCheckbox.value) {
    globalThemeCheckbox.value.checked = !isDarkMode.value;
  }
});

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => {
      isFullscreenMode.value = true;
      localStorage.setItem('fullscreen', 'true');
      console.log('[全屏] 已进入全屏模式并保存状态');
    }).catch(err => {
      console.error('无法进入全屏模式:', err);
      toast.error('无法进入全屏模式');
    });
  } else if (document.exitFullscreen) {
    document.exitFullscreen().then(() => {
      isFullscreenMode.value = false;
      localStorage.setItem('fullscreen', 'false');
      console.log('[全屏] 已退出全屏模式并保存状态');
    }).catch(err => {
      console.error('无法退出全屏模式:', err);
      toast.error('无法退出全屏模式');
    });
  }
};

// 全屏状态恢复函数
const restoreFullscreenIfNeeded = () => {
  if (isFullscreenMode.value && !document.fullscreenElement) {
    console.log('[全屏] 检测到需要恢复全屏状态');
    document.documentElement.requestFullscreen().then(() => {
      console.log('[全屏] 全屏状态已恢复');
    }).catch(err => {
      console.warn('[全屏] 无法恢复全屏状态:', err);
      // 如果无法恢复全屏，更新状态
      isFullscreenMode.value = false;
      localStorage.setItem('fullscreen', 'false');
    });
  }
};

const showHelp = () => {
  showAuthorModal.value = true;
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

  // 2. 主题已由 watchEffect 处理，此处无需操作

  // 3. 全屏状态同步
  const syncFullscreenState = () => {
    const isCurrentlyFullscreen = !!document.fullscreenElement;
    isFullscreenMode.value = isCurrentlyFullscreen;
    localStorage.setItem('fullscreen', isCurrentlyFullscreen.toString());

    if (globalFullscreenCheckbox.value) {
      globalFullscreenCheckbox.value.checked = isCurrentlyFullscreen;
    }
  };

  document.addEventListener('fullscreenchange', syncFullscreenState);
  document.addEventListener('webkitfullscreenchange', syncFullscreenState);
  document.addEventListener('mozfullscreenchange', syncFullscreenState);
  document.addEventListener('MSFullscreenChange', syncFullscreenState);

  syncFullscreenState(); // 初始检查

  // 4. 页面加载时恢复全屏状态（延迟执行，确保页面完全加载）
  setTimeout(() => {
    restoreFullscreenIfNeeded();
  }, 500);

  // 统一的清理逻辑
  onUnmounted(() => {
    // 清理父窗口resize监听
    if (window.parent !== window) {
      try {
        $(parent.window).off('resize', updateHeight);
      } catch {
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

// 5. 监听路由变化，在路由切换后恢复全屏状态
watch(route, (newRoute, oldRoute) => {
  if (newRoute.path !== oldRoute?.path) {
    console.log(`[全屏] 路由从 ${oldRoute?.path} 切换到 ${newRoute.path}`);
    // 延迟恢复全屏，确保新页面完全加载
    setTimeout(() => {
      restoreFullscreenIfNeeded();
    }, 200);
  }
}, { immediate: false });
</script>
