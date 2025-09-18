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
    
    const handleCharacterSelected = (character: any) => {
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
import CultivationPanel from '../components/dashboard/CultivationPanel.vue';
import SkillsPanel from '../components/dashboard/SkillsPanel.vue'; // 现在是功法面板
import ThousandDaoPanel from '../components/dashboard/ThousandDaoPanel.vue'; // 新的三千大道面板
import SettingsPanel from '../components/dashboard/SettingsPanel.vue';
import SavePanel from '../components/dashboard/SavePanel.vue';
import WorldMapPanel from '../components/dashboard/WorldMapPanel.vue';
import QuestPanel from '../components/dashboard/QuestPanel.vue';
import SectPanel from '../components/dashboard/SectPanel.vue';
import TavernDataPanel from '../components/dashboard/TavernDataPanel.vue';

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
        path: 'cultivation',
        name: 'Cultivation',
        component: CultivationPanel,
      },
      {
        path: 'techniques',
        name: 'Techniques',
        component: SkillsPanel, // 功法面板
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
        path: 'tavern-data',
        name: 'TavernData',
        component: TavernDataPanel,
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