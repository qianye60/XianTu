import { ref, computed } from 'vue'
import { registerUser as registerUserApi, loginUser as loginUserApi } from '@/services/api'
import { useGameState } from './useGameState'

// 定义用户信息的结构
interface User {
  id: number
  user_name: string
}

// 全局响应式的当前用户信息
const currentUser = ref<User | null>(null)

export function useAuth() {
  // 检查本地存储中是否已有用户信息
  const initializeAuth = () => {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      currentUser.value = JSON.parse(storedUser)
    }
  }

  // 计算属性，判断当前是否已登录
  const isLoggedIn = computed(() => !!currentUser.value)

  // 注册逻辑
  const register = async (userName: string, password: string) => {
    const { loadGameState } = useGameState()
    try {
      const user = await registerUserApi(userName, password)
      currentUser.value = user
      localStorage.setItem('currentUser', JSON.stringify(user))
      console.log(`道友 ${user.user_name} (ID: ${user.id}) 已成功接引。`)
      await loadGameState() // 注册成功后立即加载游戏状态
      return { success: true, user }
    } catch (error: any) {
      console.error('注册新道号时发生错误:', error)
      return {
        success: false,
        message: error.message || '注册失败，请稍后再试',
      }
    }
  }

  // 登录逻辑
  const login = async (userName:string, password: string) => {
    const { loadGameState } = useGameState()
    try {
      const user = await loginUserApi(userName, password)
      currentUser.value = user
      localStorage.setItem('currentUser', JSON.stringify(user))
      console.log(`道友 ${user.user_name} (ID: ${user.id}) 已成功登入。`)
      await loadGameState() // 登录成功后立即加载游戏状态
      return { success: true, user }
    } catch (error: any) {
      console.error('登入时发生错误:', error)
      return {
        success: false,
        message: error.message || '登入失败，请检查道号和凭证',
      }
    }
  }

  // 登出逻辑
  const logout = () => {
    currentUser.value = null
    localStorage.removeItem('currentUser')
    // 可能还需要清除其他与用户相关的数据
    console.log('道友已登出。')
  }

  return {
    currentUser,
    isLoggedIn,
    login,
    register,
    logout,
    initializeAuth,
  }
}
