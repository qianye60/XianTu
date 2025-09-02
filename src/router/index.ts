import { createRouter, createMemoryHistory } from 'vue-router';
import ModeSelection from '../views/ModeSelection.vue';
import CharacterCreation from '../views/CharacterCreation.vue';
import LoginView from '../views/LoginView.vue';
import GameView from '../views/GameView.vue';
import CharacterManagement from '../components/character-creation/CharacterManagement.vue';

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
  },
  {
    path: '/management',
    name: 'CharacterManagement',
    component: CharacterManagement,
  },
];

const router = createRouter({
  history: createMemoryHistory(),
  routes,
});

export default router;