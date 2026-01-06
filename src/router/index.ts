import { createRouter, createMemoryHistory } from 'vue-router';
import ModeSelection from '../views/ModeSelection.vue';
import CharacterCreation from '../views/CharacterCreation.vue';
import LoginView from '../views/LoginView.vue';
import WorkshopView from '../views/WorkshopView.vue';
import GameView from '../views/GameView.vue';
import AccountCenter from '../views/AccountCenter.vue';

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

    return () =>
      h(CharacterManagement, {
        fullscreen: true,
        onClose: handleClose,
        onCharacterSelected: handleCharacterSelected,
      });
  },
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
import GameMapPanel from '../components/dashboard/GameMapPanel.vue'; // 新的游戏地图组件（使用Pixi.js）
import QuestPanel from '../components/dashboard/QuestPanel.vue';
import SectPanel from '../components/dashboard/SectPanel.vue';
import SectSystemPanel from '../components/dashboard/SectSystemPanel.vue';
import SectMembersContent from '../components/dashboard/components/SectMembersContent.vue';
import SectMissionsContent from '../components/dashboard/components/SectMissionsContent.vue';
import SectLibraryContent from '../components/dashboard/components/SectLibraryContent.vue';
import SectContributionContent from '../components/dashboard/components/SectContributionContent.vue';
import GameVariablePanel from '../components/dashboard/GameVariablePanel.vue';
import PromptManagementPanel from '../components/dashboard/PromptManagementPanel.vue';
import OnlineTravelPanel from '../components/dashboard/OnlineTravelPanel.vue';

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
    path: '/workshop',
    name: 'Workshop',
    component: WorkshopView,
  },
  {
    path: '/account',
    name: 'AccountCenter',
    component: AccountCenter,
  },
  {
    // 提示词管理 - 独立顶级路由，不需要加载游戏数据
    path: '/prompts',
    name: 'PromptsStandalone',
    component: PromptManagementPanel,
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
        component: GameMapPanel, // 使用新的游戏地图组件
      },
      {
        path: 'quests',
        name: 'Quests',
        component: QuestPanel,
      },
      {
        path: 'sect',
        name: 'Sect',
        component: SectSystemPanel,
        children: [
          {
            path: '',
            redirect: { name: 'SectOverview' },
          },
          {
            path: 'overview',
            name: 'SectOverview',
            component: SectPanel,
          },
          {
            path: 'members',
            name: 'SectMembers',
            component: SectMembersContent,
          },
          {
            path: 'missions',
            name: 'SectMissions',
            component: SectMissionsContent,
          },
          {
            path: 'library',
            name: 'SectLibrary',
            component: SectLibraryContent,
          },
          {
            path: 'contribution',
            name: 'SectContribution',
            component: SectContributionContent,
          },
        ],
      },
      {
        path: 'game-variables',
        name: 'GameVariables',
        component: GameVariablePanel,
      },
      {
        path: 'prompts',
        name: 'Prompts',
        component: PromptManagementPanel,
      },
      {
        path: 'travel',
        name: 'Travel',
        component: OnlineTravelPanel,
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

export default router;
