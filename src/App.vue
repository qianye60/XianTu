<template>
  <div id="app-container">
    <div class="global-actions">
      <button @click="toggleTheme" class="theme-toggle">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
      </button>
      <button @click="toggleFullscreen" class="fullscreen-toggle">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
      </button>
    </div>
    <component
      :is="activeView"
      @path-selected="handlePathSelection"
      @back="switchView('ModeSelection')"
      @loggedIn="switchView('CharacterCreation')"
    />
  </div>
</template>

<script setup lang="ts">
import { shallowRef, ref, onMounted } from 'vue'
import ModeSelection from './views/ModeSelection.vue'
import CharacterCreation from './views/CharacterCreation.vue'
import Login from './views/Login.vue'
import './style.css'
import { useCharacterCreationStore } from './stores/characterCreationStore'


// --- 核心视图管理 ---
const views = {
  ModeSelection,
  CharacterCreation,
  Login,
}
type ViewName = keyof typeof views;
const activeView = shallowRef<typeof ModeSelection | typeof CharacterCreation | typeof Login>(views.ModeSelection)

const store = useCharacterCreationStore();

const switchView = (viewName: ViewName) => {
  const component = views[viewName]
  if (component) {
    activeView.value = component
  } else {
    activeView.value = ModeSelection
  }
}

const handlePathSelection = (mode: 'single' | 'multi') => {
    store.setMode(mode);
    if (mode === 'single') {
        switchView('CharacterCreation');
    } else {
        switchView('Login');
    }
}

// --- 主题切换 ---
const isDarkMode = ref(true);
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light');
}
onMounted(() => {
  document.documentElement.setAttribute('data-theme', 'dark');
  // Reset store on initial load
  store.reset();
})


// --- 全屏切换 ---
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}
</script>

<style>
#app-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}
.global-actions {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  gap: 0.5rem;
}
.global-actions button {
  background: rgba(40, 40, 40, 0.7);
  border: 1px solid #555;
  color: #c8ccd4;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.2s ease;
}
.global-actions button:hover {
  background: #e5c07b;
  color: #1a1a1a;
}
</style>
