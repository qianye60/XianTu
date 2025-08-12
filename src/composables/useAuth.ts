import { ref, computed } from 'vue'
import { registerUser as registerUserApi } from '@/services/api'

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

  // 登录/注册逻辑
  // 在我们当前的简化模型中，登录和注册是同一个操作
  const loginOrRegister = async (userName: string) => {
    try {
      // 尝试调用后端的注册接口
      const user = await registerUserApi(userName)
      currentUser.value = user
      localStorage.setItem('currentUser', JSON.stringify(user))
      console.log(`道友 ${user.user_name} (ID: ${user.id}) 已成功登入。`)
      return { success: true, user }
    } catch (error: any) {
      // 如果错误是409 (Conflict)，说明用户已存在，我们可以视为登录成功
      // 在一个真正的登录系统中，这里会是调用登录接口
      if (error.response && error.response.status === 409) {
        console.log(`道号 ${userName} 已存在，尝试获取用户信息...`)
        // 此处暂时简化，实际应用中需要一个 "get user by name" 的接口
        // 我们暂时返回一个模拟的用户信息，或提示用户“登录成功”
        // 为了流程能继续，我们先假设一个登录接口并返回用户信息
        // TODO: Implement a proper login endpoint
        console.warn('尚未实现真正的登录接口，暂时无法获取已存在用户的信息。')
        return { success: false, message: '道号已存在，但目前尚无登录功能。' }
      }
      console.error('登入/注册失败:', error)
      return { success: false, message: error.message || '发生未知错误' }
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
    loginOrRegister,
    logout,
    initializeAuth,
  }
}
