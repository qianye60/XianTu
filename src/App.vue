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
    <DetailModal />
    <!-- 全局操作按钮 - 只在非游戏界面显示 -->
    <!--
    <div v-if="!isInGameView" class="global-actions">
      <label class="theme-toggle" @click.prevent="toggleTheme">
        <input type="checkbox" ref="globalThemeCheckbox" :checked="!isDarkMode" />
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" class="moon">
          <path
            d="M223.5 32C100 32 0 132.3 0 256S100 480 223.5 480c60.6 0 115.5-24.2 155.8-63.4c5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6c-96.9 0-175.5-78.8-175.5-176c0-65.8 36-123.1 89.3-153.3c6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z"
          ></path>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="sun">
          <path
            d="M361.5 1.2c5 2.1 8.6 6.6 9.6 11.9L391 121l107.9 19.8c5.3 1 9.8 4.6 11.9 9.6s1.5 10.7-1.6 15.2L446.9 256l62.3 90.3c3.1 4.5 3.7 10.2 1.6 15.2s-6.6 8.6-11.9 9.6L391 391 371.1 498.9c-1 5.3-4.6 9.8-9.6 11.9s-10.7 1.5-15.2-1.6L256 446.9l-90.3 62.3c-4.5 3.1-10.2 3.7-15.2 1.6s-8.6-6.6-9.6-11.9L121 391 13.1 371.1c-5.3-1-9.8-4.6-11.9-9.6s-1.5-10.7 1.6-15.2L65.1 256 2.8 165.7c-3.1-4.5-3.7-10.2-1.6-15.2s6.6-8.6 11.9-9.6L121 121 140.9 13.1c1-5.3 4.6-9.8 9.6-11.9s10.7-1.5 15.2 1.6L256 65.1 346.3 2.8c4.5-3.1 10.2-3.7 15.2-1.6zM160 256a96 96 0 1 1 192 0 96 96 0 1 1 -192 0zm224 0a128 128 0 1 0 -256 0 128 128 0 1 0 256 0z"
          ></path>
        </svg>
      </label>
      <label class="fullscreen-toggle" @click.prevent="toggleFullscreen">
        <input type="checkbox" ref="globalFullscreenCheckbox" />
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="expand">
          <path
            d="M32 32C14.3 32 0 46.3 0 64v96c0 17.7 14.3 32 32 32s32-14.3 32-32V96h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H64V352zM320 32c-17.7 0-32 14.3-32 32s14.3 32 32 32h64v64c0 17.7 14.3 32 32 32s32-14.3 32-32V64c0-17.7-14.3-32-32-32H320zM448 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v64H320c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V352z"
          ></path>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="compress">
          <path
            d="M160 64c0-17.7-14.3-32-32-32s-32 14.3-32 32v64H32c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V64zM32 320c-17.7 0-32 14.3-32 32s14.3 32 32 32H96v64c0 17.7 14.3 32 32 32s32-14.3 32-32V352c0-17.7-14.3-32-32-32H32zM352 64c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H352V64zM320 320c-17.7 0-32 14.3-32 32v96c0 17.7 14.3 32 32 32s32-14.3 32-32V384h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H320z"
          ></path>
        </svg>
      </label>
      <a
        href="https://ddct.top"
        target="_blank"
        rel="noopener noreferrer"
        class="theme-toggle"
        title="教程"
      >
        <HelpCircle :size="24" />
      </a>
    </div>
    -->

    <!-- 全局操作按钮（合并菜单） - 只在非游戏界面显示 -->
    <ActionMenu v-if="!isInGameView" position="top-right" openTitle="功能" closeTitle="关闭">
      <template #menu="{ close }">
        <button class="action-menu-item" @click="showSettingsModal = true; close()">
          <Settings :size="18" />
          <span>设置</span>
        </button>
        <button class="action-menu-item" :class="{ 'is-disabled': !backendReady }" @click="openWorkshop(close)">
          <Store :size="18" />
          <span>创意工坊</span>
        </button>
        <button class="action-menu-item" @click="toggleTheme(); close()">
          <component :is="isDarkMode ? Sun : Moon" :size="18" />
          <span>{{ isDarkMode ? '切换到亮色' : '切换到暗色' }}</span>
        </button>
        <button class="action-menu-item" @click="toggleFullscreen(); close()">
          <component :is="isFullscreenMode ? Minimize2 : Maximize2" :size="18" />
          <span>{{ isFullscreenMode ? '退出全屏' : '进入全屏' }}</span>
        </button>
        <a href="游戏介绍.html" target="_blank" class="action-menu-item" @click="close()">
          <Globe :size="18" />
          <span>官网介绍</span>
        </a>
        <button class="action-menu-item" @click="showHelp(); close()">
          <HelpCircle :size="18" />
          <span>教程 / 说明</span>
        </button>
      </template>
    </ActionMenu>

    <!-- 路由视图将在这里渲染所有页面 -->
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component
          :is="Component"
          @start-creation="handleStartCreation"
          @show-character-list="handleShowCharacterList"
          @back="handleBack"
          @creation-complete="handleCreationComplete"
          @loggedIn="handleLoggedIn"
          @login="handleGoToLogin"
          @show-help="showHelp"
        />
      </transition>
    </router-view>

    <!-- Settings Modal -->
    <div v-if="showSettingsModal" class="settings-modal-overlay" @click.self="showSettingsModal = false">
      <div class="settings-modal-content">
        <div class="settings-modal-header">
          <h3>设置</h3>
          <button class="close-btn" @click="showSettingsModal = false">&times;</button>
        </div>
        <div class="settings-modal-body">
          <SettingsPanel />
        </div>
      </div>
    </div>

    <!-- Author Info Modal -->
    <div v-if="showAuthorModal" class="game-info-overlay" @click.self="showAuthorModal = false">
      <div class="game-info-modal">
        <!-- 顶部标题区域 -->
        <div class="game-info-header">
          <div class="header-bg"></div>
          <div class="header-content">
            <div class="game-title">
              <span class="title-icon">⚔️</span>
              <span class="title-text">仙途</span>
              <span class="version-tag">v{{ appVersion }}</span>
            </div>
            <p class="game-subtitle">AI驱动的沉浸式修仙文字冒险</p>
          </div>
          <button class="close-btn" @click="showAuthorModal = false">
            <span>&times;</span>
          </button>
        </div>

        <!-- 内容区域 -->
        <div class="game-info-body">
          <!-- 警告提示 -->
          <div class="warning-banner">
            <span class="warning-icon">⚠️</span>
            <span>游玩尽量使用推荐预设，在了解原理后可自行更换调整，<strong>禁止打开COT</strong></span>
          </div>

          <!-- 关于游戏 -->
          <div class="info-card">
            <div class="card-header">
              <span class="card-icon">📜</span>
              <h4>关于游戏</h4>
            </div>
            <p class="card-desc">
              《仙途》是一款基于AI驱动的沉浸式修仙文字冒险游戏，结合SillyTavern与Gemini AI，为玩家打造无限可能的修仙世界。
            </p>
          </div>

          <!-- 核心功能 -->
          <div class="info-card">
            <div class="card-header">
              <span class="card-icon">✨</span>
              <h4>核心功能</h4>
            </div>
            <div class="feature-grid">
              <div class="feature-item">
                <span class="feature-icon">🎲</span>
                <div class="feature-text">
                  <strong>智能判定</strong>
                  <span>全方位计算判定</span>
                </div>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🌟</span>
                <div class="feature-text">
                  <strong>三千大道</strong>
                  <span>探索独特修仙之道</span>
                </div>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📖</span>
                <div class="feature-text">
                  <strong>动态剧情</strong>
                  <span>AI实时生成故事</span>
                </div>
              </div>
              <div class="feature-item">
                <span class="feature-icon">💾</span>
                <div class="feature-text">
                  <strong>多存档</strong>
                  <span>多角色多周目</span>
                </div>
              </div>
              <div class="feature-item">
                <span class="feature-icon">⚔️</span>
                <div class="feature-text">
                  <strong>深度RPG</strong>
                  <span>境界突破装备炼制</span>
                </div>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🗺️</span>
                <div class="feature-text">
                  <strong>世界探索</strong>
                  <span>自由探索触发奇遇</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 作者信息 -->
          <div class="info-card author-card">
            <div class="card-header">
              <span class="card-icon">👨‍💻</span>
              <h4>作者信息</h4>
            </div>
            <div class="author-info">
              <div class="author-row">
                <span class="label">作者</span>
                <span class="value">千夜</span>
              </div>
              <div class="author-row">
                <span class="label">GitHub</span>
                <a href="https://github.com/qianye60" target="_blank" rel="noopener noreferrer" class="value link">
                  github.com/qianye60
                </a>
              </div>
              <div class="author-row">
                <span class="label">技术栈</span>
                <span class="value tech">Vue 3 + TypeScript + SillyTavern</span>
              </div>
            </div>
          </div>

          <!-- 版权声明 -->
          <div class="info-card copyright-card">
            <div class="card-header">
              <span class="card-icon">⚖️</span>
              <h4>版权声明</h4>
            </div>
            <div class="copyright-content">
              <p class="copyright-title">© 2025 千夜 · Apache License 2.0</p>
              <div class="license-items">
                <span class="license-tag allow">✓ 个人/商用</span>
                <span class="license-tag allow">✓ 修改发布</span>
                <span class="license-tag allow">✓ 复制分发</span>
                <span class="license-tag require">ⓘ 保留声明</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watchEffect, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import $ from 'jquery'; // 导入 jQuery
import { HelpCircle, Maximize2, Minimize2, Moon, Sun, Settings, Store, Globe } from 'lucide-vue-next'; // 导入图标
import ToastContainer from './components/common/ToastContainer.vue';
import GlobalLoadingOverlay from './components/common/GlobalLoadingOverlay.vue';
import RetryConfirmDialog from './components/common/RetryConfirmDialog.vue';
import DataValidationErrorDialog from './components/common/DataValidationErrorDialog.vue';
import StateChangeViewer from './components/common/StateChangeViewer.vue';
import DetailModal from './components/common/DetailModal.vue';
import ActionMenu from './components/common/ActionMenu.vue';
import SettingsPanel from './components/dashboard/SettingsPanel.vue';
import './style.css';
import { useCharacterCreationStore } from './stores/characterCreationStore';
import { useCharacterStore } from './stores/characterStore';
import { useUIStore } from './stores/uiStore';
import { toast } from './utils/toast';
import { getTavernHelper } from './utils/tavern'; // 添加导入
import { fetchBackendVersion, isBackendConfigured } from '@/services/backendConfig';
import { getFullscreenElement, isFullscreenEnabled, requestFullscreen, exitFullscreen, explainFullscreenError } from './utils/fullscreen';
import type { CharacterBaseInfo } from '@/types/game';
import type { CharacterCreationPayload, Talent, World, TalentTier } from '@/types';

const appVersion = ref(APP_VERSION);

// --- 响应式状态定义 ---
const isLoggedIn = ref(false);
const isDarkMode = ref(localStorage.getItem('theme') !== 'light');
const isFullscreenMode = ref(localStorage.getItem('fullscreen') === 'true');
const showAuthorModal = ref(false);
const showSettingsModal = ref(false);
const backendReady = ref(isBackendConfigured());

// --- 路由与视图管理 ---
const router = useRouter();
const route = useRoute();
type ViewName = 'ModeSelection' | 'CharacterCreation' | 'Login' | 'CharacterManagement' | 'GameView';

// 判断是否在游戏界面（包括所有游戏子路由）
const isInGameView = computed(() => {
  return route.path.startsWith('/game');
});

watch(isInGameView, (inGame) => {
  if (inGame) showSettingsModal.value = false;
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
    // 全局封锁联机模式：未配置后端则禁止进入 cloud
    if (mode === 'cloud' && !backendReady.value) {
      toast.info('未配置后端服务器，联机共修不可用');
      switchView('ModeSelection');
      return;
    }
    const targetMode = mode === 'cloud' ? 'cloud' : 'single';
    creationStore.setMode(targetMode);
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
  if (!backendReady.value) {
    toast.info('未配置后端服务器，登录不可用');
    return;
  }
  switchView('Login');
};

const openWorkshop = (close: () => void) => {
  if (!backendReady.value) {
    toast.info('未配置后端服务器，创意工坊不可用');
    return;
  }
  router.push('/workshop');
  close();
};

const handleCreationComplete = async (rawPayload: CharacterCreationPayload) => {
  console.log('接收到创角指令...', rawPayload);
  console.log('[App.vue] 种族字段检查:', rawPayload.race);

  // 防止重复创建角色
  if (uiStore.isLoading) {
    console.warn('[App.vue] 角色创建已在进行中，忽略重复请求');
    return;
  }

  // 确保 characterStore 已初始化
  if (!characterStore.initialized) {
    console.log('[App.vue] characterStore 未初始化，等待初始化完成...');
    await characterStore.initializeStore();
  }

  uiStore.startLoading('开始铸造法身...');

  // 在外层生成charId，确保重试时使用同一个ID
  const charId = `char_${Date.now()}`;

  const attemptCreation = async (): Promise<boolean> => {
    try {
      // 如果之前创建失败，先清理残留数据
      if (characterStore.rootState.角色列表[charId]) {
        console.log('[角色创建] 检测到残留数据，清理中...');
        delete characterStore.rootState.角色列表[charId];
        await characterStore.commitMetadataToStorage();
      }
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
        根骨: rawPayload.baseAttributes.root_bone ?? 0,
        灵性: rawPayload.baseAttributes.spirituality ?? 0,
        悟性: rawPayload.baseAttributes.comprehension ?? 0,
        气运: rawPayload.baseAttributes.fortune ?? 0,
        魅力: rawPayload.baseAttributes.charm ?? 0,
        心性: rawPayload.baseAttributes.temperament ?? 0
      } : {
        根骨: 0, 灵性: 0, 悟性: 0, 气运: 0, 魅力: 0, 心性: 0
      };

      const baseInfo: CharacterBaseInfo = {
        名字: personaName, // 使用从酒馆获取的Persona名字
        性别: (rawPayload.gender === '女' || rawPayload.gender === '其他' ? rawPayload.gender : '男') as '男' | '女' | '其他',
        出生日期: { 年: 0, 月: 1, 日: 1 }, // 临时占位符，后续由角色初始化流程计算
        种族: rawPayload.race ?? '人族', // 添加种族，使用 ?? 避免空字符串被当作 falsy
        世界: rawPayload.world || { name: '未知世界' } as any,
        天资: rawPayload.talentTier || { name: '凡品' } as any,
        出生: rawPayload.origin || '随机出身',
        灵根: rawPayload.spiritRoot || '随机灵根',
        天赋: (rawPayload.talents?.map((t: Talent) => ({
          id: t.id,
          name: t.name,
          description: t.description || '',
          talent_cost: t.talent_cost,
          rarity: t.rarity
        })) || []) as Talent[],
        先天六司: convertedAttributes,
        后天六司: {
          根骨: 0,
          灵性: 0,
          悟性: 0,
          气运: 0,
          魅力: 0,
          心性: 0,
        }
      };

      const creationPayload = {
        charId: charId, // 使用外层定义的charId
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
      await characterStore.commitMetadataToStorage();

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

      // 清理失败的角色数据
      if (characterStore.rootState.角色列表[charId]) {
        console.log('[角色创建] 创建失败，清理残留数据...');
        delete characterStore.rootState.角色列表[charId];
        await characterStore.commitMetadataToStorage();
      }

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
          message: `角色创建过程中遇到问题：\n\n${errorMessage}\n\n是否重新尝试创建角色？`,
          confirmText: '重新创建',
          cancelText: '返回主页重新开始',
          onConfirm: async () => {
            console.log('[角色创建] 用户选择重新创建');
            resolve(await attemptCreation()); // 递归重试，使用相同的charId
          },
          onCancel: () => {
            console.log('[角色创建] 用户选择返回主页重新开始');
            toast.info('已返回主页，可重新开始生成');
            creationStore.resetCharacter();
            router.push('/');
            resolve(false);
          }
        });
      });
    }
  };

  try {
    console.log('[App.vue] 开始执行attemptCreation...');

    const success = await attemptCreation();

    console.log('[App.vue] attemptCreation执行完成,结果:', success);

    if (!success) {
      // 用户取消或选择返回创建页面，不做任何操作
      // 保持在当前的角色创建页面
      console.log('[角色创建] 保持在角色创建页面');
    }
  } catch (error) {
    // 最终兜底错误处理
    console.error("[App.vue] 角色创建流程出现严重错误：", error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    toast.error(`角色创建失败: ${errorMsg}`);
    if (errorMsg.includes('超时')) {
      toast.error("创建过程超时,请检查网络连接和SillyTavern状态");
    }
    // 不要自动跳转,让用户可以重试
  } finally {
    console.log('[App.vue] finally: 停止loading');
    uiStore.stopLoading();
  }
};

// --- 主题与全屏 ---
watchEffect(() => {
  const theme = isDarkMode.value ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
});

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
};

const toggleFullscreen = () => {
  if (!getFullscreenElement()) {
    requestFullscreen(document.documentElement as any).then(() => {
      isFullscreenMode.value = true;
      localStorage.setItem('fullscreen', 'true');
      console.log('[全屏] 已进入全屏模式并保存状态');
    }).catch(err => {
      console.error('无法进入全屏模式:', err);
      toast.error(explainFullscreenError(err));
    });
  } else {
    exitFullscreen().then(() => {
      isFullscreenMode.value = false;
      localStorage.setItem('fullscreen', 'false');
      console.log('[全屏] 已退出全屏模式并保存状态');
    }).catch(err => {
      console.error('无法退出全屏模式:', err);
      toast.error(explainFullscreenError(err));
    });
  }
};

// 全屏状态恢复函数
const restoreFullscreenIfNeeded = () => {
  // 大多数浏览器不允许在非用户手势下自动进入全屏，这里仅做“状态纠正”，不强行 requestFullscreen。
  if (isFullscreenMode.value && !getFullscreenElement()) {
    console.log('[全屏] 检测到需要恢复全屏状态');
    console.warn('[全屏] 浏览器限制：无法自动恢复全屏，请手动点击全屏按钮。');
    isFullscreenMode.value = false;
    localStorage.setItem('fullscreen', 'false');
  }
};

const showHelp = () => {
  showAuthorModal.value = true;
};

// --- 生命周期钩子 ---
onMounted(async () => {
  if (backendReady.value) {
    const backendVersion = await fetchBackendVersion();
    if (backendVersion) {
      appVersion.value = backendVersion;
    }
  }
  // 0. 等待 characterStore 初始化完成（加载 IndexedDB 数据）
  console.log('[App] 等待 characterStore 初始化...');
  await characterStore.initializeStore();
  console.log('[App] ✅ characterStore 初始化完成');

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
    const isCurrentlyFullscreen = !!getFullscreenElement();
    isFullscreenMode.value = isCurrentlyFullscreen;
    localStorage.setItem('fullscreen', isCurrentlyFullscreen.toString());
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

  // 5. 定时保存当前存档 - 每5分钟
  const saveInterval = setInterval(async () => {
    try {
      const activeSlot = characterStore.activeSaveSlot;
      if (activeSlot?.存档数据) {
        console.log('[定时保存] 保存当前存档...');
        await characterStore.saveCurrentGame();
        console.log('[定时保存] 保存成功');
      }
    } catch (error) {
      console.error('[定时保存] 保存失败:', error);
    }
  }, 5 * 60 * 1000); // 5分钟

  // 统一的清理逻辑
  onUnmounted(() => {
    // 清理定时保存定时器
    clearInterval(saveInterval);
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

// 6. 监听路由变化，在路由切换后恢复全屏状态
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

<style scoped>
/* ============ 游戏信息弹窗样式 ============ */
.game-info-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
}

.game-info-modal {
  background: var(--color-surface);
  border-radius: 16px;
  max-width: 520px;
  width: 100%;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
  border: 1px solid var(--color-border);
  animation: modalFadeIn 0.25s ease-out;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 顶部标题区域 */
.game-info-header {
  position: relative;
  padding: 1.5rem 1.5rem 1.25rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
}

.game-info-header .header-bg {
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  opacity: 0.5;
}

.game-info-header .header-content {
  position: relative;
  z-index: 1;
}

.game-info-header .game-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.game-info-header .title-icon {
  font-size: 1.75rem;
}

.game-info-header .title-text {
  font-size: 1.75rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.05em;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.game-info-header .version-tag {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 0.25rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 0.5rem;
  backdrop-filter: blur(4px);
}

.game-info-header .game-subtitle {
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.9rem;
  margin: 0.5rem 0 0;
  font-weight: 500;
}

.game-info-header .close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  line-height: 1;
  transition: all 0.2s;
  backdrop-filter: blur(4px);
}

.game-info-header .close-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

/* 内容区域 */
.game-info-body {
  padding: 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 警告横幅 */
.warning-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.08) 100%);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 10px;
  font-size: 0.85rem;
  color: var(--color-text);
}

.warning-banner .warning-icon {
  font-size: 1rem;
}

.warning-banner strong {
  color: #dc2626;
  font-weight: 700;
}

/* 信息卡片 */
.info-card {
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1rem;
}

.info-card .card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.info-card .card-icon {
  font-size: 1.1rem;
}

.info-card .card-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
}

.info-card .card-desc {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

/* 功能网格 */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.6rem;
  background: var(--color-surface);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.feature-item .feature-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.feature-item .feature-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.feature-item .feature-text strong {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text);
}

.feature-item .feature-text span {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

/* 作者信息 */
.author-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.author-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.author-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.author-row .label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  min-width: 50px;
}

.author-row .value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.author-row .value.link {
  color: var(--color-primary);
  text-decoration: none;
  transition: color 0.2s;
}

.author-row .value.link:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}

.author-row .value.tech {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 0.8rem;
  background: var(--color-code-bg);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

/* 版权声明 */
.copyright-content .copyright-title {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.license-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.license-tag {
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.license-tag.allow {
  background: rgba(34, 197, 94, 0.12);
  color: #16a34a;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.license-tag.require {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.25);
}

/* 深色主题适配 */
[data-theme='dark'] .game-info-header {
  background: linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%);
}

[data-theme='dark'] .warning-banner {
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.12) 0%, rgba(251, 191, 36, 0.05) 100%);
  border-color: rgba(251, 191, 36, 0.25);
}

[data-theme='dark'] .warning-banner strong {
  color: #f87171;
}

[data-theme='dark'] .license-tag.allow {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border-color: rgba(34, 197, 94, 0.3);
}

[data-theme='dark'] .license-tag.require {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border-color: rgba(59, 130, 246, 0.3);
}

/* 滚动条美化 */
.game-info-body::-webkit-scrollbar {
  width: 6px;
}

.game-info-body::-webkit-scrollbar-track {
  background: transparent;
}

.game-info-body::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

.game-info-body::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-secondary);
}

.settings-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  padding: 20px;
}

.settings-modal-content {
  background: var(--color-surface, #ffffff);
  border-radius: 14px;
  width: min(760px, 100%);
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
  border: 1px solid var(--color-border);
  animation: modalIn 0.2s ease;
}

.settings-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-light);
  color: var(--color-text);
}

.settings-modal-header h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--color-text);
}

.settings-modal-body {
  flex: 1;
  overflow: auto;
}

.close-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 1.5rem;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--color-surface-hover);
}
</style>
