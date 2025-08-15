<template>
  <div id="app-container">
    <video src="http://38.55.124.252:13145/1394774d3043156d.mp4" autoplay loop muted playsinline class="background-video"></video>
    <div class="content-wrapper">
      <!-- 优化：只在真正需要加载时显示遮罩 -->
      <div v-if="isInitialLoading || isLoadingView" class="loading-overlay">
        <div class="spinner"></div>
        天机推演中，请稍候...
      </div>
      <!-- 优化：移除 mode="out-in" 减少切换延迟 -->
      <transition v-else name="fade">
        <component :is="currentView" :key="currentView.name" />
      </transition>
      <FullscreenButton />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref } from 'vue'
import FullscreenButton from '@/components/shared/FullscreenButton.vue'
import { useGameState } from '@/composables/useGameState'
import { useGameMode } from '@/composables/useGameMode'
import { useTheme } from '@/composables/useTheme' // 导入主题心法
import { useAuth } from '@/composables/useAuth'
import { initializeMemoryManager } from '@/services/MemoryManager'

import { CHENWU_WHITE_BACKGROUND } from '@/assets/backgrounds'
import '@/style.css'

declare const TavernHelper: {
  toastr: {
    success: (message: string) => void
  }
  setBackground: (background: string | null) => void
}

// --- 核心状态管理 ---
const {
  activeCharacter,
  isLoading: isGameStateLoading,
  loadGameState,
} = useGameState()
const { initializeGameMode, currentView, isLoadingView } = useGameMode()
const { initializeAuth } = useAuth()
const { initializeTheme } = useTheme() // 获取主题初始化法咒

// --- 核心流程控制 ---
const isInitialLoading = ref(false) // 优化：仅用于初始加载

// --- 生命周期钩子 ---

onMounted(async () => {
  isInitialLoading.value = true
  try {
    // 初始化核心服务
    initializeTheme() // 启动主题心法！
    initializeAuth()
    await initializeGameMode() // 改为 await
    await loadGameState()

    // if (typeof TavernHelper !== 'undefined') {
    //   // 贫道注：此处原为设置静态背景图，现已由视频天幕替代。
    //   TavernHelper.setBackground(CHENWU_WHITE_BACKGROUND)
    // }
  } finally {
    isInitialLoading.value = false
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
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden; /* 防止根元素出现滚动条 */
}

.background-video {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  object-fit: cover;
  z-index: 0; /* 作为基座 */
  filter: brightness(0.4); /* 再次调暗，为文字提供更稳定的背景 */
}

#app-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.content-wrapper {
  position: relative;
  z-index: 1; /* 浮于天幕之上 */
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: auto;
  box-sizing: border-box;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column; /* 让文字在转圈动画下方 */
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.8); /* 加深背景遮罩 */
  color: var(--color-accent); /* 使用醒目的强调色作为文字颜色 */
  font-size: 1.5rem;
  font-family: var(--font-family-serif);
  z-index: 10000; /* 确保在最顶层 */
}

.spinner {
  margin-bottom: 20px; /* 让文字和转圈动画有间距 */
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 4px solid var(--color-accent);
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 响应式适配不再需要，交由具体内容面板处理 */

/* 优化：加快过渡动画速度 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.05s ease; /* 从0.1s减少到0.05s */
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>