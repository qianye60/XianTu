import { ref, computed } from 'vue'

// 游戏模式类型
export type GameMode = 'online' | 'offline'

// 全局游戏模式状态
const gameMode = ref<GameMode | null>(null)
const isInitialized = ref(false)

export function useGameMode() {
  // 初始化游戏模式
  const initializeGameMode = () => {
    if (typeof window !== 'undefined' && !isInitialized.value) {
      const savedMode = localStorage.getItem('gameMode') as GameMode | null
      if (savedMode) {
        gameMode.value = savedMode
      }
      isInitialized.value = true
    }
  }

  // 设置游戏模式
  const setGameMode = (mode: GameMode) => {
    gameMode.value = mode
    if (typeof window !== 'undefined') {
      localStorage.setItem('gameMode', mode)
    }
  }

  // 清除游戏模式
  const clearGameMode = () => {
    gameMode.value = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gameMode')
    }
    isInitialized.value = false
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
    isOnlineMode,
    isOfflineMode,
    hasModeSelected,
    getModeDisplayName,
    initializeGameMode,
    setGameMode,
    clearGameMode,
  }
}
