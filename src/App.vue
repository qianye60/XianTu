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
      <a href="https://ddct.top" target="_blank" rel="noopener noreferrer" class="theme-toggle" title="教程">
        <HelpCircle :size="24" />
      </a>
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
          <h3>🎮 大道朝天 - 游戏信息</h3>
          <button class="close-btn" @click="showAuthorModal = false">&times;</button>
        </div>
        <div class="author-modal-body">
          <div class="version-badge">V1.0 Beta</div>

          <div class="info-section">
            <h4>📝 关于游戏</h4>
            <p>《大道朝天》是一款基于AI驱动的沉浸式修仙文字冒险游戏，结合SillyTavern与Gemini AI，为玩家打造无限可能的修仙世界。</p>
            <p> <span style="color: yellow;">游玩尽量使用推荐预设，在了解原理后可自行更换调整，<span style="color: red;">禁止打开COT</span></span></p>
          </div>

          <div class="info-section">
            <h4>✨ 核心功能</h4>
            <ul class="feature-list">
              <li>🎲 <strong>智能判定系统</strong> - 根据境界、属性、装备、大道等全方位计算判定</li>
              <li>🌟 <strong>三千大道系统</strong> - 探索修炼独特的修仙之道，提升实力</li>
              <li>📖 <strong>动态剧情生成</strong> - AI实时生成个性化的修仙故事</li>
              <li>💾 <strong>多存档管理</strong> - 支持多角色、多周目游玩</li>
              <li>⚔️ <strong>深度RPG系统</strong> - 境界突破、功法学习、装备炼制、NPC互动</li>
              <li>🗺️ <strong>世界探索</strong> - 自由探索朝天大陆，触发奇遇事件</li>
              <li>🎨 <strong>精美UI</strong> - 修仙风格界面，支持亮暗双主题</li>
              <li>💬 <strong>格式化文本</strong> - 环境描写、心理活动、对话、判定结果分别渲染</li>
            </ul>
          </div>

          <div class="info-section">
            <h4>👨‍💻 作者信息</h4>
            <p><strong>作者:</strong> 千夜</p>
            <p>
              <strong>GitHub:</strong>
              <a href="https://github.com/qianye60" target="_blank" rel="noopener noreferrer">
                https://github.com/qianye60
              </a>
            </p>
            <p class="tech-stack"><strong>技术栈:</strong> Vue 3 + TypeScript + SillyTavern</p>
          </div>

          <div class="info-section">
            <h4>📢 版本说明</h4>
            <p class="version-note">当前为<strong>V1.0 Beta</strong>测试版本，部分功能仍在开发完善中。欢迎反馈建议！</p>
          </div>

          <div class="info-section">
            <h4>⚖️ 版权声明</h4>
            <div class="copyright-notice">
              <p>© 2025 千夜 版权所有</p>
              <p>本作品采用 <strong>CC BY-NC-ND 4.0</strong> 协议授权</p>
              <ul class="copyright-list">
                <li>✅ <strong>允许</strong> - 个人免费使用、学习交流</li>
                <li>✅ <strong>允许</strong> - 分享转发时须注明原作者</li>
                <li>❌ <strong>禁止</strong> - 商业用途（包括但不限于售卖、收费推广等）</li>
                <li>❌ <strong>禁止</strong> - 修改后重新发布</li>
                <li>❌ <strong>禁止</strong> - 移除或修改版权信息</li>
              </ul>
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
import { HelpCircle } from 'lucide-vue-next'; // 导入图标
import ToastContainer from './components/common/ToastContainer.vue';
import GlobalLoadingOverlay from './components/common/GlobalLoadingOverlay.vue';
import RetryConfirmDialog from './components/common/RetryConfirmDialog.vue';
import DataValidationErrorDialog from './components/common/DataValidationErrorDialog.vue';
import StateChangeViewer from './components/common/StateChangeViewer.vue';
import DetailModal from './components/common/DetailModal.vue';
import './style.css';
import { useCharacterCreationStore } from './stores/characterCreationStore';
import { useCharacterStore } from './stores/characterStore';
import { useUIStore } from './stores/uiStore';
import { toast } from './utils/toast';
import { getTavernHelper, isTavernEnv } from './utils/tavern'; // 添加导入
import type { CharacterBaseInfo } from '@/types/game';
import type { CharacterCreationPayload, Talent, World, TalentTier } from '@/types';

// --- 响应式状态定义 ---
const isLoggedIn = ref(false);
const isDarkMode = ref(localStorage.getItem('theme') !== 'light');
const globalThemeCheckbox = ref<HTMLInputElement>();
const globalFullscreenCheckbox = ref<HTMLInputElement>();
const isFullscreenMode = ref(localStorage.getItem('fullscreen') === 'true');
const showAuthorModal = ref(false);
const isTavernEnvFlag = ref(isTavernEnv());

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
    // 全局封锁联机模式：只有酒馆环境允许进入 cloud
    if (mode !== 'single' && !isTavernEnvFlag.value) {
      toast.info('联机共修开发中，当前版本暂未开放');
      switchView('ModeSelection');
      return;
    }
    const targetMode = (mode === 'cloud' && isTavernEnvFlag.value) ? 'cloud' : 'single';
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
 switchView('Login');
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
          cancelText: '返回创建页面',
          onConfirm: async () => {
            console.log('[角色创建] 用户选择重新创建');
            resolve(await attemptCreation()); // 递归重试，使用相同的charId
          },
          onCancel: () => {
            console.log('[角色创建] 用户选择返回创建页面');
            toast.info('已返回角色创建页面，您可以调整设置后重新开始');
            router.push('/creation'); // 跳转回角色创建页面
            resolve(false); // 返回到角色创建页面
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
onMounted(async () => {
  // SillyTavern 可能在页面加载后才注入 TavernHelper，这里短暂轮询以避免误判为“非酒馆环境”
  const start = Date.now();
  const poll = setInterval(() => {
    isTavernEnvFlag.value = isTavernEnv();
    if (isTavernEnvFlag.value || Date.now() - start > 5000) {
      clearInterval(poll);
    }
  }, 200);
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
/* 作者信息模态框样式 */
.author-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
}

.author-modal {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.author-modal-header {
  padding: 1.5rem 2rem;
  border-bottom: 2px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px 16px 0 0;
}

.author-modal-header h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
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
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

.author-modal-body {
  padding: 2rem;
}

.version-badge {
  display: inline-block;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.5rem 1.25rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(102, 126, 234, 0.3);
}

.info-section {
  margin-bottom: 2rem;
}

.info-section:last-child {
  margin-bottom: 0;
}

.info-section h4 {
  color: #1e293b;
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-section p {
  color: #475569;
  line-height: 1.7;
  margin: 0.5rem 0;
}

.info-section a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}

.info-section a:hover {
  color: #764ba2;
  text-decoration: underline;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-list li {
  padding: 0.75rem 0;
  color: #475569;
  line-height: 1.6;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}

.feature-list li:last-child {
  border-bottom: none;
}

.feature-list strong {
  color: #1e293b;
  font-weight: 600;
}

.tech-stack {
  color: #64748b;
  font-size: 0.95rem;
  padding: 1rem;
  background: #f1f5f9;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.version-note {
  color: #475569;
  font-size: 0.95rem;
  line-height: 1.6;
  padding: 1rem;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 8px;
  border-left: 4px solid #f59e0b;
}

.version-note strong {
  color: #92400e;
}

.copyright-notice {
  padding: 1.25rem;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border-radius: 8px;
  border: 2px solid #dc2626;
}

.copyright-notice p {
  margin: 0.5rem 0;
  color: #1e293b;
}

.copyright-notice p:first-child {
  font-weight: 700;
  font-size: 1.05rem;
  color: #dc2626;
  margin-bottom: 0.75rem;
}

.copyright-notice strong {
  color: #dc2626;
  font-weight: 700;
}

.copyright-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
}

.copyright-list li {
  padding: 0.5rem 0;
  color: #475569;
  line-height: 1.5;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid #fee2e2;
}

.copyright-list li:last-child {
  border-bottom: none;
}

.copyright-list strong {
  color: #1e293b;
  font-weight: 600;
}

.copyright-warning {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #dc2626;
  color: white;
  border-radius: 6px;
  font-weight: 600;
  text-align: center;
}

/* 深色主题 */
[data-theme="dark"] .author-modal {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

[data-theme="dark"] .author-modal-header {
  border-bottom-color: #334155;
}

[data-theme="dark"] .info-section h4 {
  color: #f1f5f9;
}

[data-theme="dark"] .info-section p {
  color: #cbd5e1;
}

[data-theme="dark"] .feature-list li {
  color: #cbd5e1;
  border-bottom-color: #334155;
}

[data-theme="dark"] .feature-list strong {
  color: #f1f5f9;
}

[data-theme="dark"] .tech-stack {
  background: #0f172a;
  color: #94a3b8;
  border-left-color: #667eea;
}

[data-theme="dark"] .version-note {
  background: linear-gradient(135deg, #422006 0%, #713f12 100%);
  color: #fde68a;
  border-left-color: #f59e0b;
}

[data-theme="dark"] .version-note strong {
  color: #fbbf24;
}

[data-theme="dark"] .copyright-notice {
  background: linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%);
  border-color: #dc2626;
}

[data-theme="dark"] .copyright-notice p {
  color: #fecaca;
}

[data-theme="dark"] .copyright-notice p:first-child {
  color: #fca5a5;
}

[data-theme="dark"] .copyright-notice strong {
  color: #fca5a5;
}

[data-theme="dark"] .copyright-list li {
  color: #fecaca;
  border-bottom-color: #7f1d1d;
}

[data-theme="dark"] .copyright-list strong {
  color: #fef2f2;
}

[data-theme="dark"] .copyright-warning {
  background: #dc2626;
  color: white;
}

/* 滚动条美化 */
.author-modal::-webkit-scrollbar {
  width: 8px;
}

.author-modal::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.author-modal::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.author-modal::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

[data-theme="dark"] .author-modal::-webkit-scrollbar-track {
  background: #0f172a;
}

[data-theme="dark"] .author-modal::-webkit-scrollbar-thumb {
  background: #475569;
}

[data-theme="dark"] .author-modal::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}
</style>
