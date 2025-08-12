<template>
  <div id="app-container">
    <transition name="fade" mode="out-in">
      <!-- 乾坤镜根据状态，衍化不同视图 -->
      <ModeSelector v-if="!hasModeSelected" @mode-selected="handleModeSelection" />
      <LoginView v-else-if="isOnlineMode && !isLoggedIn" />
      <WorldSelector
        v-else-if="isOnlineMode && isLoggedIn && !selectedWorld"
        @world-selected="handleWorldSelected"
        @back="goBackToModeSelector"
      />
      <CharacterCreationOnline
        v-else-if="isOnlineMode && isLoggedIn && selectedWorld"
        :world-id="selectedWorld.id"
        @back="goBackToModeSelector"
      />
      <component v-else :is="offlineComponent" />
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch, ref } from 'vue'
import type { World } from '@/services/api'
import { useGameState } from '@/composables/useGameState'
import { useGameMode } from '@/composables/useGameMode'
import { useAuth } from '@/composables/useAuth'
import { initializeMemoryManager } from '@/services/MemoryManager'

// --- 视图组件 ---
import CharacterCreationFinal from './views/CharacterCreationFinal.vue'
import MainGame from './views/MainGame.vue'
import ModeSelector from './components/shared/ModeSelector.vue'
import LoginView from './views/auth/LoginView.vue'
import WorldSelector from './views/online/WorldSelector.vue'

import CharacterCreationOnline from './views/online/CharacterCreationOnline.vue'

import { CHENWU_WHITE_BACKGROUND } from '@/assets/backgrounds'
import '@/style.css'

declare const TavernHelper: any

// --- 核心状态管理 ---
const { isAnyCharacterCreated, loadGameState, activeCharacter } = useGameState()
const { setGameMode, hasModeSelected, isOnlineMode, initializeGameMode, clearGameMode } =
  useGameMode()
const { isLoggedIn, initializeAuth } = useAuth()

// --- 核心流程控制 ---
const selectedWorld = ref<World | null>(null)

// 离线模式的组件逻辑
const offlineComponent = computed(() => {
  return isAnyCharacterCreated.value ? MainGame : CharacterCreationFinal
})

// --- 事件处理 ---

// 处理模式选择
const handleModeSelection = async (mode: 'online' | 'offline') => {
  setGameMode(mode)

  if (typeof TavernHelper !== 'undefined' && TavernHelper.toastr) {
    const modeText = mode === 'offline' ? '单机闭关' : '联机共修'
    TavernHelper.toastr.success(`已选择${modeText}模式，开始修行之路！`)
  }

  // 如果是离线模式，则像以前一样加载游戏状态
  if (mode === 'offline') {
    await loadGameState()
  }
  // 如果是在线模式，则等待用户登录，登录成功后 App.vue 会自动切换视图
}

const handleWorldSelected = (world: World) => {
  selectedWorld.value = world
}

// 返回模式选择界面
const goBackToModeSelector = () => {
  selectedWorld.value = null
  clearGameMode()
}

// --- 生命周期钩子 ---

onMounted(() => {
  // 初始化所有核心状态
  initializeGameMode()
  initializeAuth()

  // 如果是离线模式且已选择，则加载游戏
  if (!isOnlineMode.value && hasModeSelected.value) {
    loadGameState()
  }

  if (typeof TavernHelper !== 'undefined') {
    TavernHelper.setBackground(CHENWU_WHITE_BACKGROUND)
  }
})

onUnmounted(() => {
  TavernHelper.setBackground(null)
})

// 监视当前角色状态，为其注入神识
watch(
  activeCharacter,
  (newCharacter) => {
    if (newCharacter) {
      console.log('【天道枢纽】检测到命盘激活，为识海洞天注灵...')
      initializeMemoryManager(activeCharacter)
    }
  },
  { immediate: true },
)
</script>

<style>
/* 移除 scoped，让样式成为全局法则 */
#app-container {
  width: 100%;
  padding: var(--spacing-8, 2rem);
  box-sizing: border-box;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
