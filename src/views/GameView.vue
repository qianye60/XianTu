<template>
  <div class="game-view">
    <!-- 顶部栏 -->
    <TopBar />
    
    <!-- 移动端底部导航 -->
    <div class="mobile-nav" v-if="isMobile">
      <button 
        @click="toggleLeft" 
        :class="['nav-btn', { active: !leftCollapsed }]"
      >
        <Menu :size="20" />
        <span>功能</span>
      </button>
      <button 
        @click="toggleRight" 
        :class="['nav-btn', { active: !rightCollapsed }]"
      >
        <User :size="20" />
        <span>角色</span>
      </button>
    </div>
    
    <!-- 主要内容区域 -->
    <div class="game-content">
      <!-- 左侧功能栏 -->
      <div 
        :class="['left-sidebar', { 'mobile-overlay': isMobile }]" 
        v-show="!leftCollapsed"
        @click="handleMobileOverlayClick"
      >
        <div class="sidebar-wrapper" @click.stop>
          <LeftSidebar @open-panel="openFunctionPanel" />
        </div>
      </div>
      
      <!-- 功能面板覆盖区域 -->
      <div v-if="currentPanel" class="function-panel-overlay" :class="{ 'left-collapsed': leftCollapsed }">
        <component 
          :is="currentRightComponent.component" 
          v-bind="currentRightComponent.props"
          @close="closeRightPanel"
        >
          <component 
            v-if="currentRightComponent.slot" 
            :is="currentRightComponent.slot" 
          />
        </component>
      </div>
      
      <!-- 正常布局（当没有功能面板时） -->
      <template v-else>
        <!-- 左侧收缩按钮 -->
        <div class="collapse-btn left-btn" v-if="!isMobile">
          <button @click="toggleLeft" class="collapse-button">
            <ChevronRight v-if="leftCollapsed" :size="32" />
            <ChevronLeft v-else :size="32" />
          </button>
        </div>
        
        <!-- 主游戏区域 -->
        <div class="main-content">
          <MainGamePanel />
        </div>
        
        <!-- 右侧收缩按钮 -->
        <div class="collapse-btn right-btn" v-if="!isMobile">
          <button @click="toggleRight" class="collapse-button">
            <ChevronLeft v-if="rightCollapsed" :size="32" />
            <ChevronRight v-else :size="32" />
          </button>
        </div>
        
        <!-- 右侧信息栏 -->
        <div 
          :class="['right-sidebar', { 'mobile-overlay': isMobile }]" 
          v-show="!rightCollapsed"
          @click="handleMobileOverlayClick"
        >
          <div class="sidebar-wrapper" @click.stop>
            <RightSidebar />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ChevronLeft, ChevronRight, Menu, User } from 'lucide-vue-next'
import TopBar from '@/components/dashboard/TopBar.vue'
import LeftSidebar from '@/components/dashboard/LeftSidebar.vue'
import MainGamePanel from '@/components/dashboard/MainGamePanel.vue'
import RightSidebar from '@/components/dashboard/RightSidebar.vue'
import MemoryCenterPanel from '@/components/dashboard/MemoryCenterPanel.vue'
import FunctionPanel from '@/components/dashboard/FunctionPanel.vue'
import CharacterDetailsPanel from '@/components/dashboard/CharacterDetailsPanel.vue'
import InventoryPanel from '@/components/dashboard/InventoryPanel.vue'
import RelationshipsPanel from '@/components/dashboard/RelationshipsPanel.vue'
import CultivationPanel from '@/components/dashboard/CultivationPanel.vue'
import SkillsPanel from '@/components/dashboard/SkillsPanel.vue'
import SettingsPanel from '@/components/dashboard/SettingsPanel.vue'
import SavePanel from '@/components/dashboard/SavePanel.vue'

const leftCollapsed = ref(false)
const rightCollapsed = ref(false)
const screenWidth = ref(window.innerWidth)
const currentPanel = ref('')

// 计算当前右侧显示的组件
const currentRightComponent = computed(() => {
  if (!currentPanel.value) {
    return RightSidebar
  }
  
  // 返回包装后的功能面板组件
  switch (currentPanel.value) {
    case 'memory':
      return {
        component: FunctionPanel,
        props: { title: '记忆中心' },
        slot: MemoryCenterPanel
      }
    case 'character-details':
      return {
        component: FunctionPanel,
        props: { title: '人物详情' },
        slot: CharacterDetailsPanel
      }
    case 'inventory':
      return {
        component: FunctionPanel,
        props: { title: '背包系统' },
        slot: InventoryPanel
      }
    case 'relationships':
      return {
        component: FunctionPanel,
        props: { title: '人物关系' },
        slot: RelationshipsPanel
      }
    case 'cultivation':
      return {
        component: FunctionPanel,
        props: { title: '功法系统' },
        slot: CultivationPanel
      }
    case 'skills':
      return {
        component: FunctionPanel,
        props: { title: '道法技艺' },
        slot: SkillsPanel
      }
    case 'settings':
      return {
        component: FunctionPanel,
        props: { title: '游戏设置' },
        slot: SettingsPanel
      }
    case 'save':
      return {
        component: FunctionPanel,
        props: { title: '存档管理' },
        slot: SavePanel
      }
    case 'world-map':
      return {
        component: FunctionPanel,
        props: { title: '世界地图' }
      }
    case 'online-play':
      return {
        component: FunctionPanel,
        props: { title: '拜访道友' }
      }
    default:
      return RightSidebar
  }
})

const isMobile = computed(() => screenWidth.value < 768)

const handleResize = () => {
  screenWidth.value = window.innerWidth
  // 手机端默认收起侧边栏
  if (isMobile.value) {
    leftCollapsed.value = true
    rightCollapsed.value = true
  } else {
    // 桌面端默认展开
    leftCollapsed.value = false
    rightCollapsed.value = false
  }
}

const toggleLeft = () => {
  leftCollapsed.value = !leftCollapsed.value
}

const toggleRight = () => {
  rightCollapsed.value = !rightCollapsed.value
}

const handleMobileOverlayClick = (event: Event) => {
  if (isMobile.value && event.target === event.currentTarget) {
    leftCollapsed.value = true
    rightCollapsed.value = true
  }
}

// 打开功能面板
const openFunctionPanel = (panelType: string) => {
  currentPanel.value = panelType
  
  // 桌面端：确保右侧面板显示
  if (!isMobile.value) {
    rightCollapsed.value = false
  } else {
    // 手机端：隐藏左右侧栏，让功能面板全屏显示
    leftCollapsed.value = true
    rightCollapsed.value = true
  }
}

// 关闭功能面板，回到默认状态
const closeRightPanel = () => {
  currentPanel.value = ''
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  handleResize() // 初始化设置
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.game-view {
  width: 100vw;
  height: 100vh;
  background: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.game-content {
  flex: 1;
  display: flex;
  gap: 0;
  padding: 8px;
  overflow: hidden;
  position: relative; /* 为覆盖层提供定位上下文 */
}

/* 功能面板覆盖区域 */
.function-panel-overlay {
  position: absolute;
  top: 8px; /* 考虑padding */
  left: 256px; /* 左侧栏宽度 + gap */
  right: 8px; /* 考虑padding */
  bottom: 8px; /* 考虑padding */
  background: white;
  z-index: 100;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: left 0.3s ease;
  overflow: hidden; /* 确保父容器不会滚动 */
  display: flex;
  flex-direction: column;
}

/* 左侧栏收缩时的覆盖区域调整 */
.function-panel-overlay.left-collapsed {
  left: 8px; /* 左侧栏收缩时从边缘开始 */
}

.left-sidebar {
  width: 240px;
  height: 100%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  z-index: 10;
}

.right-sidebar {
  width: 280px;
  height: 100%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  z-index: 10;
}

.sidebar-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.main-content {
  flex: 1;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin: 0 8px;
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  position: relative;
  z-index: 15;
}

.left-btn {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  margin-left: -10px;
}

.right-btn {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  margin-right: -10px;
}

.collapse-button {
  width: 20px;
  height: 100%;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapse-button:hover {
  color: #334155;
  background: rgba(100, 116, 139, 0.1);
}

/* 移动端底部导航 */
.mobile-nav {
  display: none;
  background: white;
  border-top: 1px solid #e2e8f0;
  padding: 8px;
  gap: 8px;
  justify-content: space-around;
  z-index: 20;
}

.nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #64748b;
  font-size: 0.75rem;
}

.nav-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.nav-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.nav-btn.active:hover {
  background: #2563eb;
}

/* 小屏幕桌面端适配 (针对950*800等分辨率) */
@media (min-width: 768px) and (max-width: 1200px) {
  .game-content {
    padding: 6px;
  }
  
  /* 调整功能面板定位避免间隔过大 */
  .function-panel-overlay {
    left: calc(220px + 12px); /* 缩小的左侧栏宽度 + padding */
    right: 6px;
    top: 6px;
    bottom: 6px;
  }
  
  .function-panel-overlay.left-collapsed {
    left: 6px;
  }
  
  .left-sidebar {
    width: 220px; /* 缩小左侧栏以节省空间 */
  }
  
  .main-content {
    margin: 0 3px; /* 减小间距 */
  }
  
  .collapse-btn {
    width: 30px;
  }
  
  .collapse-button {
    width: 30px;
    height: 30px;
  }
}

/* 超小桌面端适配 (如950*800) */
@media (min-width: 768px) and (max-width: 1000px) {
  .left-sidebar {
    width: 200px; /* 进一步缩小左侧栏 */
  }
  
  .function-panel-overlay {
    left: calc(200px + 12px); /* 更紧凑的布局 */
  }
  
  .main-content {
    margin: 0 2px; /* 最小间距 */
  }
}

/* 手机端适配 */
@media (max-width: 767px) {
  .game-content {
    padding: 4px;
    position: relative;
  }
  
  /* 手机端功能面板覆盖整个屏幕 */
  .function-panel-overlay {
    position: fixed;
    top: 60px; /* 顶部栏高度 */
    left: 0;
    right: 0;
    bottom: 60px; /* 底部导航高度 */
    background: white;
    z-index: 1000;
    border-radius: 0;
    box-shadow: none;
  }
  
  .function-panel-overlay.left-collapsed {
    left: 0; /* 手机端不需要考虑左侧栏 */
  }
  
  .main-content {
    margin: 0;
  }
  
  .mobile-nav {
    display: flex;
  }
  
  .left-sidebar.mobile-overlay,
  .right-sidebar.mobile-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 100;
    display: flex;
    align-items: flex-start;
    padding-top: 60px;
  }
  
  .right-sidebar.mobile-overlay {
    justify-content: flex-end;
  }
  
  .sidebar-wrapper {
    width: 85%;
    max-width: 320px;
    height: calc(100vh - 60px);
    background: white;
    border-radius: 0 8px 8px 0;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    overflow: hidden;
  }
  
  .right-sidebar .sidebar-wrapper {
    border-radius: 8px 0 0 8px;
  }
  
  .collapse-btn {
    display: none;
  }
}

/* 平板适配 */
@media (min-width: 768px) and (max-width: 1024px) {
  .left-sidebar {
    width: 200px;
  }
  
  .right-sidebar {
    width: 240px;
  }
  
  .main-content {
    margin: 0 6px;
  }
}

/* 深色主题 */
[data-theme="dark"] .game-view {
  background: #0f172a;
}

[data-theme="dark"] .left-sidebar,
[data-theme="dark"] .right-sidebar,
[data-theme="dark"] .main-content,
[data-theme="dark"] .collapse-btn {
  background: #1e293b;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .collapse-button {
  color: #94a3b8;
}

[data-theme="dark"] .collapse-button:hover {
  color: #e2e8f0;
  background: rgba(148, 163, 184, 0.1);
}

[data-theme="dark"] .mobile-nav {
  background: #1e293b;
  border-top-color: #334155;
}

[data-theme="dark"] .nav-btn {
  color: #94a3b8;
  border-color: #334155;
}

[data-theme="dark"] .nav-btn:hover {
  background: #334155;
  border-color: #475569;
}

[data-theme="dark"] .nav-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

[data-theme="dark"] .nav-btn.active:hover {
  background: #2563eb;
}

[data-theme="dark"] .left-sidebar.mobile-overlay,
[data-theme="dark"] .right-sidebar.mobile-overlay {
  background: rgba(0, 0, 0, 0.7);
}

[data-theme="dark"] .sidebar-wrapper {
  background: #1e293b;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

/* 动画 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .settings-modal-content {
    width: 95vw;
    max-height: 95vh;
  }
  
  .settings-modal-header {
    padding: 15px 20px;
  }
  
  .settings-modal-header h2 {
    font-size: 1.25rem;
  }
}
</style>