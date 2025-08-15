import { ref, computed, shallowRef, watch, type Component } from 'vue'
import { useAuth } from './useAuth'
import { useGameState } from './useGameState'

// --- 视图组件 ---
import CharacterCreationFinal from '@/views/CharacterCreationFinal.vue'
import MainGame from '@/views/MainGame.vue'
import ModeSelector from '@/components/shared/ModeSelector.vue'
import LoginView from '@/views/auth/LoginView.vue'
import CharacterCreationOnline from '@/views/online/CharacterCreationOnline.vue'

// 游戏模式类型
export type GameMode = 'online' | 'offline'

// 全局游戏模式状态
const gameMode = ref<GameMode | null>(null)
const isInitialized = ref(false)
const currentView = shallowRef<Component>(ModeSelector)
const isLoadingView = ref(false)

export function useGameMode() {
  const { isLoggedIn } = useAuth()
  const { isAnyCharacterCreated, loadGameState } = useGameState()

  // 监听登录状态变化，自动跳转
  watch(
    isLoggedIn,
    (newValue, oldValue) => {
      if (gameMode.value === 'online') {
        // 如果是在线模式且登录状态发生变化
        if (newValue && !oldValue) {
          // 从未登录变为已登录，跳转到世界选择
          console.log('[GameMode] 道友登入成功，前往选择世界')
          currentView.value = CharacterCreationOnline
        } else if (!newValue && oldValue) {
          // 从已登录变为未登录，返回登录页
          console.log('[GameMode] 道友登出，返回登入界面')
          currentView.value = LoginView
        }
      }
    },
    { immediate: true }
  )

  // 初始化游戏模式
  const initializeGameMode = async () => {
    if (typeof window !== 'undefined' && !isInitialized.value) {
      const savedMode = localStorage.getItem('gameMode') as GameMode | null
      if (savedMode) {
        gameMode.value = savedMode
        await navigateBasedOnMode(savedMode)
      } else {
        currentView.value = ModeSelector
      }
      isInitialized.value = true
    }
  }

  const navigateBasedOnMode = async (mode: GameMode) => {
    console.log(`[GameMode] 勘验天机，当前道途: ${mode}`)
    if (mode === 'offline') {
      await loadGameState()
      const view = isAnyCharacterCreated.value ? MainGame : CharacterCreationFinal
      console.log(`[GameMode] 择“单机闭关”，本地洞府探查结果: ${isAnyCharacterCreated.value}，前往: ${view.name}`)
      currentView.value = view
    } else {
      const view = isLoggedIn.value ? CharacterCreationOnline : LoginView
      console.log(`[GameMode] 择“联机共修”，验证身份: ${isLoggedIn.value}，前往: ${view.name}`)
      currentView.value = view
    }
  }

  // 设置游戏模式
  const setGameMode = async (mode: GameMode) => {
    console.log(`[GameMode] 道途已择: ${mode}`)
    isLoadingView.value = true
    try {
      gameMode.value = mode
      if (typeof window !== 'undefined') {
        localStorage.setItem('gameMode', mode)
      }
      await navigateBasedOnMode(mode)
    } finally {
      isLoadingView.value = false
    }
  }

  // 清除游戏模式 - 优化版：瞬时切换，无需加载状态
  const clearGameMode = () => {
    console.log('[GameMode] 执行清除游戏模式，返回道途选择')
    gameMode.value = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gameMode')
    }
    // 直接切换视图，无需设置加载状态
    currentView.value = ModeSelector
  }

  // 获取当前游戏模式
  const getCurrentMode = computed(() => gameMode.value)

  // 判断是否为联网模式
  const isOnlineMode = computed(() => gameMode.value === 'online')

  // 判断是否为单机模式
  const isOfflineMode = computed(() => gameMode.value === 'offline')

  // 判断是否已选择模式
  const hasModeSelected = computed(() => gameMode.value !== null)

  // 获取模式显示名称
  const getModeDisplayName = computed(() => {
    switch (gameMode.value) {
      case 'online':
        return '联机共修'
      case 'offline':
        return '单机闭关'
      default:
        return '未选择'
    }
  })

  return {
    gameMode: getCurrentMode,
    currentView: computed(() => currentView.value),
    isOnlineMode,
    isOfflineMode,
    hasModeSelected,
    getModeDisplayName,
    initializeGameMode,
    setGameMode,
    clearGameMode,
    isLoadingView: computed(() => isLoadingView.value),
  }
}
