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

// 全局路由守卫 - 授权验证（简化版：只检查本地状态）
router.beforeEach(async (to, from, next) => {
  // 动态导入配置以避免循环依赖
  const { AUTH_CONFIG } = await import('@/config/authConfig');

  // 如果启用了授权验证
  if (AUTH_CONFIG.ENABLE_AUTH) {
    const authVerified = localStorage.getItem('auth_verified');

    // 🔴 简化逻辑：只检查本地是否已授权，不再频繁验证
    if (authVerified === 'true') {
      // 本地已授权，直接放行
      console.log('[路由守卫] 本地已授权，直接放行');
      next();
      return;
    }

    // 如果本地没有授权标记，且不是首页，跳转到首页
    if (to.path !== '/') {
      console.log('[路由守卫] 无授权标记，跳转首页');
      next('/');
    } else {
      next();
    }
    return;
  }

  // 允许通过
  next();
});

export default router;
