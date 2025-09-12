<template>
  <div v-if="isDataReady" class="game-view">
    <!-- 顶部栏 -->
    <TopBar />

    <!-- 主要内容区域 -->
    <div class="game-content" :class="{ 'panel-mode': isPanelOpen }">
      <!-- 左侧功能栏 -->
      <div class="left-sidebar" :class="{ collapsed: leftSidebarCollapsed }">
        <div class="sidebar-wrapper">
          <LeftSidebar :collapsed="leftSidebarCollapsed" />
        </div>
      </div>

      <!-- 左侧收缩按钮 -->
      <button 
        class="collapse-btn left" 
        v-show="!isPanelOpen"
        @click="leftSidebarCollapsed = !leftSidebarCollapsed"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline :points="leftSidebarCollapsed ? '9,18 15,12 9,6' : '15,18 9,12 15,6'"/>
        </svg>
      </button>

      <!-- 主游戏区域 -->
      <div class="main-content">
        <!-- 功能面板覆盖层 -->
        <div v-if="isPanelOpen" class="panel-overlay">
          <div class="panel-header">
            <h2 class="panel-title">
              <component :is="currentPanelIcon" :size="20" class="panel-title-icon" />
              {{ currentPanelTitle }}
            </h2>
            <button class="panel-close-btn" @click="closePanel" title="关闭面板">
              <X :size="20" />
            </button>
          </div>
          <div class="panel-content">
            <router-view />
          </div>
        </div>
        
        <!-- 正常路由视图 -->
        <router-view v-else-if="!uiStore.showCharacterManagement" />

        <!-- 角色管理面板 -->
        <div v-if="uiStore.showCharacterManagement" class="panel-overlay">
          <div class="panel-header">
            <h2 class="panel-title">
              <Users2 :size="20" class="panel-title-icon" />
              角色管理
            </h2>
            <button class="panel-close-btn" @click="uiStore.closeCharacterManagement()" title="关闭面板">
              <X :size="20" />
            </button>
          </div>
          <div class="panel-content">
            <CharacterManagement @back="uiStore.closeCharacterManagement" />
          </div>
        </div>
      </div>

      <!-- 右侧收缩按钮 -->
      <button 
        class="collapse-btn right" 
        :class="{ collapsed: rightSidebarCollapsed }" 
        v-show="!isPanelOpen"
        @click="rightSidebarCollapsed = !rightSidebarCollapsed"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline :points="rightSidebarCollapsed ? '15,18 9,12 15,6' : '9,18 15,12 9,6'"/>
        </svg>
      </button>

      <!-- 右侧区域: 角色信息栏 -->
      <div 
        class="right-panel-area" 
        :class="{ collapsed: rightSidebarCollapsed }"
        v-show="!isPanelOpen"
      >
        <div class="sidebar-wrapper">
          <RightSidebar />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useCharacterStore } from '@/stores/characterStore';
import { useUIStore } from '@/stores/uiStore';
import { useRouter, useRoute } from 'vue-router';
import { X, Package, User, Brain, Users, BookOpen, Zap, Settings, Save, Map, Scroll, Home, Box, Users2 } from 'lucide-vue-next';
import TopBar from '@/components/dashboard/TopBar.vue'
import LeftSidebar from '@/components/dashboard/LeftSidebar.vue'
import RightSidebar from '@/components/dashboard/RightSidebar.vue'
import CharacterManagement from '@/components/character-creation/CharacterManagement.vue';

const characterStore = useCharacterStore();
const uiStore = useUIStore();
const router = useRouter();
const route = useRoute();

// 侧边栏收缩状态
const leftSidebarCollapsed = ref(false);
const rightSidebarCollapsed = ref(false);

// 面板状态管理
const panelRoutes = new Set([
  'Inventory', 'CharacterDetails', 'Memory', 'Relationships', 
  'Cultivation', 'Techniques', 'ThousandDao', 'Settings', 'Save', 'WorldMap', 
  'Quests', 'Sect'
]);

// 左侧功能面板（不应该影响左侧收缩按钮）
const leftPanelRoutes = new Set([
  'Inventory', 'CharacterDetails', 'Quests', 'WorldMap'
]);

// 右侧相关面板（应该影响右侧收缩按钮）  
const rightPanelRoutes = new Set([
  'Memory', 'Relationships', 'Cultivation', 'Techniques', 'ThousandDao', 'Settings', 'Save', 'Sect'
]);

const panelTitles: Record<string, { title: string; icon: string }> = {
  'Inventory': { title: '背包物品', icon: 'Package' },
  'CharacterDetails': { title: '人物详情', icon: 'User' }, 
  'Memory': { title: '记忆中心', icon: 'Brain' },
  'Relationships': { title: '江湖人脉', icon: 'Users' },
  'Cultivation': { title: '修炼系统', icon: 'BookOpen' },
  'Techniques': { title: '修炼功法', icon: 'Zap' }, 
  'ThousandDao': { title: '三千大道', icon: 'Scroll' },
  'Settings': { title: '系统设置', icon: 'Settings' },
  'Save': { title: '保存游戏', icon: 'Save' },
  'WorldMap': { title: '世界地图', icon: 'Map' },
  'Quests': { title: '任务系统', icon: 'Scroll' },
  'Sect': { title: '宗门事务', icon: 'Home' }
};

const isPanelOpen = computed(() => {
  return panelRoutes.has(String(route.name));
});

const currentPanelTitle = computed(() => {
  const routeName = String(route.name);
  const panelInfo = panelTitles[routeName];
  return panelInfo?.title || '功能面板';
});

const currentPanelIcon = computed(() => {
  const routeName = String(route.name);
  const panelInfo = panelTitles[routeName];
  return panelInfo?.icon || 'Box';
});

const closePanel = () => {
  // 关闭面板时返回到主游戏面板，而不是重复路由到/game
  if (route.name !== 'GameMain') {
    router.push('/game');
  }
};

const isDataReady = computed(() => {
  return !!characterStore.activeCharacterProfile && !!characterStore.activeSaveSlot?.存档数据;
});

// 监听面板状态变化，智能调整布局
watch(isPanelOpen, (isOpen) => {
  if (isOpen) {
    const currentRoute = String(route.name);
    // 只有右侧相关面板才收起右侧边栏
    if (rightPanelRoutes.has(currentRoute)) {
      rightSidebarCollapsed.value = true;
    }
    // 左侧功能面板不影响侧边栏状态
  }
  // 注意：我们不在面板关闭时自动展开侧边栏，让用户保持之前的偏好
});
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
  gap: 0; /* 移除缝隙 */
  padding: 0; /* 移除内边距 */
  position: relative;
  min-height: 0;
  border-top: 1px solid var(--color-border);
  height: calc(100vh - 60px); /* 明确设置高度，减去顶部栏高度 */
}

.left-sidebar {
  width: 240px;
  background: var(--color-surface);
  transition: all 0.3s ease;
  z-index: 10;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-border);
  flex-shrink: 0;
}

.left-sidebar.collapsed {
  width: 0;
  overflow: hidden;
}

.right-panel-area {
  width: 280px;
  background: var(--color-surface);
  transition: all 0.3s ease;
  border-left: 1px solid var(--color-border);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.right-panel-area.collapsed {
  width: 0;
  overflow: hidden;
}


.sidebar-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  background: var(--color-background); /* 使用背景色 */
  margin: 0; /* 移除左右margin */
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 收缩按钮样式 */
.collapse-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 48px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  color: var(--color-text-secondary);
}

.collapse-btn:hover {
  background: var(--color-surface-light);
  color: var(--color-text);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 左侧收缩按钮 */
.collapse-btn.left {
  left: 240px;
  border-radius: 0 8px 8px 0;
  transition: left 0.3s ease, background 0.2s ease;
}

/* 左侧栏收缩时，按钮移动到最左侧 */
.left-sidebar.collapsed ~ .collapse-btn.left {
  left: 0;
}

/* 右侧收缩按钮 */
.collapse-btn.right {
  right: 280px;
  border-radius: 8px 0 0 8px;
  transition: right 0.3s ease, background 0.2s ease;
}

/* 右侧栏收缩时，按钮移动到最右侧 */
.right-panel-area.collapsed ~ .collapse-btn.right,
.collapse-btn.right.collapsed {
  right: 0;
}

/* 当右侧栏收缩时 */
.right-panel-area.collapsed {
  width: 0;
  overflow: hidden;
}

/* 面板覆盖模式样式 - 只隐藏右侧栏，保留左侧栏 */
.game-content.panel-mode .right-panel-area {
  display: none;
}

.panel-overlay {
  width: 100%;
  height: 100%;
  background: var(--color-background);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  border-radius: 0; /* 只有标题栏直角 */
  flex-shrink: 0;
}

.panel-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}

.panel-close-btn {
  background: none;
  border: none;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.panel-close-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: var(--color-primary);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.3s ease;
  opacity: 0.1;
  z-index: -1;
}

.panel-close-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.panel-close-btn:hover::before {
  width: 100%;
  height: 100%;
}

.panel-close-btn:active {
  transform: scale(0.95);
}

.panel-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 面板模式下隐藏右侧栏 */
.game-content.panel-mode .right-panel-area {
  display: none;
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

/* 移动端适配 - 隐藏收缩按钮 */
@media (max-width: 768px) {
  .collapse-btn {
    display: none;
  }
  
  .left-sidebar {
    width: 200px;
  }
  
  .right-panel-area {
    width: 240px;
  }
  
  .game-content {
    gap: 0;
  }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
  .left-sidebar {
    width: 180px;
  }
  
  .right-panel-area {
    width: 200px;
  }
  
  /* 小屏幕上面板全屏显示 */
  .panel-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;
  }
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