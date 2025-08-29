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
        <div class="collapse-btn left-btn" v-if="!isMobile" @click="toggleLeft" :class="{ collapsed: leftCollapsed }">
          <div class="button-content">
            <ChevronRight v-if="leftCollapsed" :size="16" />
            <ChevronLeft v-else :size="16" />
          </div>
          <span class="button-tooltip">{{ leftCollapsed ? '展开功能栏' : '收缩功能栏' }}</span>
        </div>

        <!-- 主游戏区域 -->
        <div class="main-content">
          <MainGamePanel />
        </div>

        <!-- 右侧收缩按钮 -->
        <div class="collapse-btn right-btn" v-if="!isMobile" @click="toggleRight" :class="{ collapsed: rightCollapsed }">
          <div class="button-content">
            <ChevronLeft v-if="rightCollapsed" :size="16" />
            <ChevronRight v-else :size="16" />
          </div>
          <span class="button-tooltip">{{ rightCollapsed ? '展开角色信息' : '收缩角色信息' }}</span>
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
import WorldMapPanel from '@/components/dashboard/WorldMapPanel.vue'
import QuestPanel from '@/components/dashboard/QuestPanel.vue'
import SectPanel from '@/components/dashboard/SectPanel.vue'

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
        props: { title: '三千大道' },
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
        props: { title: '世界地图' },
        slot: WorldMapPanel
      }
    case 'quests':
      return {
        component: FunctionPanel,
        props: { title: '任务系统' },
        slot: QuestPanel
      }
    case 'sect':
      return {
        component: FunctionPanel,
        props: { title: '宗门系统' },
        slot: SectPanel
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
  width: 100%;
  height: 100%;
  background: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  display: flex;
  flex-direction: column;
}

.game-content {
  flex: 1;
  display: flex;
  align-items: stretch;
  gap: 0;
  padding: 8px;
  position: relative;
  min-height: 0;
  flex: 1;
}

/* 功能面板覆盖区域 */
.function-panel-overlay {
  position: absolute;
  top: 8px;
  left: 256px;
  right: 8px;
  bottom: 8px;
  background: white;
  z-index: 100;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: left 0.3s ease;
  display: flex;
  flex-direction: column;
}

.function-panel-overlay.left-collapsed {
  left: 8px;
}

.left-sidebar {
  width: 240px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  z-index: 10;
  display: flex;
  flex-direction: column;
}

.right-sidebar {
  width: 280px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  z-index: 10;
  display: flex;
  flex-direction: column;
}

.sidebar-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin: 0 8px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.collapse-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 80px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 15;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  color: #64748b;
  overflow: hidden;
}

.collapse-btn:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  transform: translateY(-52%) scale(1.05);
  color: #334155;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.collapse-btn:active {
  transform: translateY(-48%) scale(0.98);
}

.collapse-btn.collapsed {
  color: #10b981;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-color: #10b981;
}

.collapse-btn.collapsed:hover {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
}

.left-btn {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  left: 248px; /* 左侧面板宽度 240px + 边距 8px */
  border-left: none;
  transition: left 0.3s ease;
}

.left-btn.collapsed {
  left: 8px;
}

.right-btn {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  right: 288px; /* 右侧面板宽度 280px + 边距 8px */
  border-right: none;
  transition: right 0.3s ease;
}

.right-btn.collapsed {
  right: 8px;
}

.button-content {
  transition: none;
}

.button-tooltip {
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 1000;
}

.collapse-btn:hover .button-tooltip {
  opacity: 1;
  visibility: visible;
  bottom: -35px;
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

/* 手机端适配 */
@media (max-width: 767px) {
  .game-content {
    padding: 4px;
    position: relative;
  }

  .function-panel-overlay {
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    bottom: 60px;
    background: white;
    z-index: 1000;
    border-radius: 0;
    box-shadow: none;
  }

  .function-panel-overlay.left-collapsed {
    left: 0;
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
    width: 100%;
    height: 100%;
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
    height: auto;
    max-height: calc(100% - 60px);
    background: white;
    border-radius: 0 8px 8px 0;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    overflow: auto;
  }

  .right-sidebar .sidebar-wrapper {
    border-radius: 8px 0 0 8px;
  }

  .collapse-btn {
    display: none;
  }
}

/* 深色主题 */
[data-theme="dark"] .game-view {
  background: #0f172a;
}

[data-theme="dark"] .left-sidebar,
[data-theme="dark"] .right-sidebar,
[data-theme="dark"] .main-content {
  background: #1e293b;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .collapse-btn {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border-color: #475569;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  color: #94a3b8;
}

[data-theme="dark"] .collapse-btn:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
  color: #e2e8f0;
  background: linear-gradient(135deg, #334155 0%, #475569 100%);
}

[data-theme="dark"] .collapse-btn.collapsed {
  color: #34d399;
  background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
  border-color: #34d399;
}

[data-theme="dark"] .collapse-btn.collapsed:hover {
  background: linear-gradient(135deg, #065f46 0%, #047857 100%);
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
</style>
