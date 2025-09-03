<template>
  <div v-if="isDataReady" class="game-view">
    <!-- 顶部栏 -->
    <TopBar />

    <!-- 主要内容区域 -->
    <div class="game-content">
      <!-- 左侧功能栏 -->
      <div class="left-sidebar" :class="{ collapsed: leftSidebarCollapsed }">
        <div class="sidebar-wrapper">
          <LeftSidebar :collapsed="leftSidebarCollapsed" />
        </div>
      </div>

      <!-- 左侧收缩按钮 -->
      <button class="collapse-btn left" @click="leftSidebarCollapsed = !leftSidebarCollapsed">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline :points="leftSidebarCollapsed ? '9,18 15,12 9,6' : '15,18 9,12 15,6'"/>
        </svg>
      </button>

      <!-- 主游戏区域 -->
      <div class="main-content">
        <router-view />
      </div>

      <!-- 右侧收缩按钮 -->
      <button class="collapse-btn right" :class="{ collapsed: rightSidebarCollapsed }" @click="rightSidebarCollapsed = !rightSidebarCollapsed">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline :points="rightSidebarCollapsed ? '15,18 9,12 15,6' : '9,18 15,12 9,6'"/>
        </svg>
      </button>

      <!-- 右侧区域: 角色信息栏 -->
      <div class="right-panel-area" :class="{ collapsed: rightSidebarCollapsed }">
        <div class="sidebar-wrapper">
          <RightSidebar :collapsed="rightSidebarCollapsed" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCharacterStore } from '@/stores/characterStore';
import TopBar from '@/components/dashboard/TopBar.vue'
import LeftSidebar from '@/components/dashboard/LeftSidebar.vue'
import RightSidebar from '@/components/dashboard/RightSidebar.vue'

const characterStore = useCharacterStore();

// 侧边栏收缩状态
const leftSidebarCollapsed = ref(false);
const rightSidebarCollapsed = ref(false);

const isDataReady = computed(() => {
  return !!characterStore.activeCharacterProfile && !!characterStore.activeSaveSlot?.存档数据;
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
  border-radius: 0 8px 8px 0;
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

.collapse-btn.left {
  left: 240px;
  border-radius: 0 8px 8px 0;
}

.collapse-btn.right {
  right: 280px;
  border-radius: 8px 0 0 8px;
}

.left-sidebar.collapsed + .collapse-btn.left {
  left: 0;
}

/* 右侧收缩按钮位置调整 */
.collapse-btn.right {
  right: 280px;
  border-radius: 8px 0 0 8px;
}

.collapse-btn.right.collapsed {
  right: 0;
}

/* 当右侧栏收缩时 */
.right-panel-area.collapsed {
  width: 0;
  overflow: hidden;
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