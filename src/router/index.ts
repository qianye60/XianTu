import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'

// 静态路由配置 - 避免iframe环境下的复杂问题
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'ModeSelector',
    component: () => import('@/components/shared/ModeSelector.vue'),
    meta: { title: '选择道途' }
  },
  {
    path: '/login',
    name: 'Login', 
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { title: '道友登入' }
  },
  {
    path: '/create-offline',
    name: 'CharacterCreationOffline',
    component: () => import('@/views/offline/CharacterCreationOffline.vue'),
    meta: { title: '单机创角' }
  },
  {
    path: '/create-online',
    name: 'CharacterCreationOnline',
    component: () => import('@/views/online/CharacterCreationOnline.vue'),
    meta: { title: '联机创角' }
  },
  {
    path: '/game',
    name: 'MainGame',
    component: () => import('@/views/MainGame.vue'),
    meta: { title: '大道遨游' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 简化的导航守卫 - 针对iframe环境优化
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = `大道朝天 - ${to.meta.title}`
  }
  
  // iframe环境下的特殊处理
  const isInIframe = window !== window.parent
  if (isInIframe) {
    console.log('[Router-iframe] 导航:', from.path, '->', to.path)
    
    // 防止导航回到父窗口端口
    if (to.path.includes('8000')) {
      console.warn('[Router-iframe] 阻止套娃导航')
      next(false)
      return
    }
  }
  
  next()
})

export default router