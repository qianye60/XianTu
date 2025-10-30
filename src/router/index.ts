import { createRouter, createMemoryHistory } from 'vue-router';
import ModeSelection from '../views/ModeSelection.vue';
import CharacterCreation from '../views/CharacterCreation.vue';
import LoginView from '../views/LoginView.vue';
import GameView from '../views/GameView.vue';

// 创建一个包装组件来传递fullscreen属性
import { h } from 'vue';
import { useRouter } from 'vue-router';
import CharacterManagement from '../components/character-creation/CharacterManagement.vue';

const FullscreenCharacterManagement = {
  setup() {
    const router = useRouter();
    
    const handleClose = () => {
      router.push('/');
    };
    
    const handleCharacterSelected = (_character: unknown) => {
      router.push('/game');
    };
    
    return () => h(CharacterManagement, { 
      fullscreen: true,
      onClose: handleClose,
      onCharacterSelected: handleCharacterSelected
    });
  }
};

// 静态导入所有组件，避免代码分割
import MainGamePanel from '../components/dashboard/MainGamePanel.vue';
import MemoryCenterPanel from '../components/dashboard/MemoryCenterPanel.vue';
import CharacterDetailsPanel from '../components/dashboard/CharacterDetailsPanel.vue';
import InventoryPanel from '../components/dashboard/InventoryPanel.vue';
import RelationshipNetworkPanel from '../components/dashboard/RelationshipNetworkPanel.vue';
import SkillsPanel from '../components/dashboard/SkillsPanel.vue'; // 功法面板
import ThousandDaoPanel from '../components/dashboard/ThousandDaoPanel.vue'; // 新的三千大道面板
import SettingsPanel from '../components/dashboard/SettingsPanel.vue';
import SavePanel from '../components/dashboard/SavePanel.vue';
import WorldMapPanel from '../components/dashboard/WorldMapPanel.vue';
import QuestPanel from '../components/dashboard/QuestPanel.vue';
import SectPanel from '../components/dashboard/SectPanel.vue';
import GameVariablePanel from '../components/dashboard/GameVariablePanel.vue';

const routes = [
  {
    path: '/',
    name: 'ModeSelection',
    component: ModeSelection,
  },
  {
    path: '/creation',
    name: 'CharacterCreation',
    component: CharacterCreation,
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
  },
  {
    path: '/game',
    name: 'Game',
    component: GameView,
    children: [
      {
        path: '',
        name: 'GameMain',
        component: MainGamePanel,
      },
      {
        path: 'memory',
        name: 'Memory',
        component: MemoryCenterPanel,
      },
      {
        path: 'character-details',
        name: 'CharacterDetails',
        component: CharacterDetailsPanel,
      },
      {
        path: 'inventory',
        name: 'Inventory',
        component: InventoryPanel,
      },
      {
        path: 'relationships',
        name: 'Relationships',
        component: RelationshipNetworkPanel,
      },
      {
        path: 'techniques',
        name: 'Techniques',
        component: SkillsPanel, // 功法面板（合并了原cultivation功能）
      },
      {
        path: 'thousand-dao',
        name: 'ThousandDao', 
        component: ThousandDaoPanel, // 三千大道面板
      },
      {
        path: 'settings',
        name: 'Settings',
        component: SettingsPanel,
      },
      {
        path: 'save',
        name: 'Save',
        component: SavePanel,
      },
      {
        path: 'world-map',
        name: 'WorldMap',
        component: WorldMapPanel,
      },
      {
        path: 'quests',
        name: 'Quests',
        component: QuestPanel,
      },
      {
        path: 'sect',
        name: 'Sect',
        component: SectPanel,
      },
      {
        path: 'game-variables',
        name: 'GameVariables',
        component: GameVariablePanel,
      },
    ],
  },
  {
    path: '/management',
    name: 'CharacterManagement',
    component: FullscreenCharacterManagement,
  },
];

const router = createRouter({
  history: createMemoryHistory(),
  routes,
});

// 全局路由守卫 - 授权验证
router.beforeEach(async (to, from, next) => {
  // 动态导入配置以避免循环依赖
  const { AUTH_CONFIG } = await import('@/config/authConfig');

  // 如果启用了授权验证
  if (AUTH_CONFIG.ENABLE_AUTH) {
    // 始终向服务器验证，不信任本地存储
    try {
      const machineCode = await generateMachineCodeForCheck();
      const response = await fetch(`${AUTH_CONFIG.SERVER_URL}/server.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check',
          app_id: AUTH_CONFIG.APP_ID,
          machine_code: machineCode
        })
      });

      const result = await response.json();

      // 只有服务器验证通过才允许访问
      if (result.success && result.data?.authorized) {
        console.log('[路由守卫] 服务器验证通过');
        localStorage.setItem('auth_verified', 'true');
        localStorage.setItem('auth_app_id', AUTH_CONFIG.APP_ID);
        localStorage.setItem('auth_machine_code', machineCode);
        if (result.data.expires_at) {
          localStorage.setItem('auth_expires_at', result.data.expires_at);
        }
        next();
        return;
      }
    } catch (error) {
      console.warn('[路由守卫] 服务器验证失败', error);
    }

    // 验证失败，且不是在首页，重定向到首页
    if (to.path !== '/') {
      console.log('[路由守卫] 未授权，重定向到首页');
      next('/');
      return;
    }
  }

  // 允许通过
  next();
});

// 生成机器码的辅助函数
async function generateMachineCodeForCheck(): Promise<string> {
  // 如果已有缓存的机器码，直接使用
  const cached = localStorage.getItem('auth_machine_code');
  if (cached) return cached;

  // 否则生成新的机器码
  try {
    if (typeof (window as any).generateStableMachineCode === 'function') {
      return await (window as any).generateStableMachineCode();
    }
  } catch (e) {
    console.warn('生成机器码失败', e);
  }

  // 降级方案
  const userAgent = navigator.userAgent;
  const screen = `${window.screen.width}x${window.screen.height}`;
  const platform = navigator.platform;
  const language = navigator.language;
  const rawString = `${userAgent}-${screen}-${platform}-${language}`;

  const encoder = new TextEncoder();
  const data = encoder.encode(rawString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return `UMC-${hash.substring(0, 8).toUpperCase()}`;
}

export default router;