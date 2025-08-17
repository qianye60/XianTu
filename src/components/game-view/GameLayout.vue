<!-- src/components/game-view/GameLayout.vue -->
<template>
  <div
    class="game-layout"
    :class="{
      'left-sidebar-collapsed': isLeftSidebarCollapsed,
      'right-sidebar-collapsed': isRightSidebarCollapsed,
    }"
  >
    <header class="game-header">
      <slot name="header"></slot>
    </header>

    <div class="game-body">
      <aside class="game-sidebar left-sidebar">
        <slot name="left-sidebar"></slot>
      </aside>

      <main class="game-main-content">
        <slot name="main-content"></slot>
      </main>

      <aside class="game-sidebar right-sidebar">
        <slot name="right-sidebar"></slot>
      </aside>
    </div>

    <footer class="game-footer">
      <slot name="footer"></slot>
    </footer>

    <!-- 侧边栏开关 -->
    <button @click="toggleLeftSidebar" class="sidebar-toggle left-toggle" title="切换左面板">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
    </button>
    <button @click="toggleRightSidebar" class="sidebar-toggle right-toggle" title="切换右面板">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="15" y1="3" x2="15" y2="21"></line></svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const isLeftSidebarCollapsed = ref(false);
const isRightSidebarCollapsed = ref(false);

const toggleLeftSidebar = () => {
  isLeftSidebarCollapsed.value = !isLeftSidebarCollapsed.value;
};

const toggleRightSidebar = () => {
  isRightSidebarCollapsed.value = !isRightSidebarCollapsed.value;
};
</script>

<style scoped>
:root {
  --left-sidebar-width-desktop: 280px;
  --right-sidebar-width-desktop: 300px;
  --sidebar-transition-duration: 0.3s;
}

.game-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: var(--color-background);
  color: var(--color-text);
  overflow: hidden;
  
  --left-sidebar-width: var(--left-sidebar-width-desktop);
  --right-sidebar-width: var(--right-sidebar-width-desktop);
}

.game-layout.left-sidebar-collapsed {
  --left-sidebar-width: 0px;
}
.game-layout.right-sidebar-collapsed {
  --right-sidebar-width: 0px;
}

.game-header, .game-footer {
  flex-shrink: 0;
  padding: 0.75rem 1.5rem;
  background-color: var(--color-surface-light);
  border-bottom: 1px solid var(--color-border);
  z-index: 10;
}

.game-footer {
  border-top: 1px solid var(--color-border);
  border-bottom: none;
}

.game-body {
  flex-grow: 1;
  display: grid;
  grid-template-columns: var(--left-sidebar-width) 1fr var(--right-sidebar-width);
  overflow: hidden;
  transition: grid-template-columns var(--sidebar-transition-duration) ease;
}

.game-sidebar {
  flex-shrink: 0;
  padding: 1.5rem 1rem;
  background-color: var(--color-surface);
  overflow-y: auto;
  transition: width var(--sidebar-transition-duration) ease, padding var(--sidebar-transition-duration) ease;
  width: 100%;
}

.left-sidebar {
  border-right: 1px solid var(--color-border);
}
.right-sidebar {
  border-left: 1px solid var(--color-border);
}

.left-sidebar-collapsed .left-sidebar,
.right-sidebar-collapsed .right-sidebar {
    padding-left: 0;
    padding-right: 0;
    overflow: hidden;
}

.game-main-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-toggle {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  background-color: var(--color-surface-light);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  width: 24px;
  height: 60px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--sidebar-transition-duration) ease;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  padding: 0;
  border-radius: 0 8px 8px 0;
}
.sidebar-toggle:hover {
  background-color: var(--color-primary);
  color: var(--color-background);
}

.left-toggle {
  left: var(--left-sidebar-width);
  border-left: none;
}
.left-sidebar-collapsed .left-toggle {
  left: 0;
}

.right-toggle {
  right: var(--right-sidebar-width);
  border-right: none;
  border-radius: 8px 0 0 8px;
}
.right-sidebar-collapsed .right-toggle {
  right: 0;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .game-layout {
    --left-sidebar-width: 100%;
    --right-sidebar-width: 100%;
  }

  .game-body {
    display: flex; /* 恢复为flex布局以便于绝对定位的上下文 */
    position: relative;
  }

  .game-sidebar {
    position: absolute;
    top: 0;
    height: 100%;
    width: 80%;
    max-width: 300px;
    z-index: 100;
    box-shadow: 0 0 20px rgba(0,0,0,0.5);
    transform: translateX(0);
  }

  .left-sidebar {
    left: 0;
    border-right: 1px solid var(--color-border);
  }
  .left-sidebar-collapsed .left-sidebar {
    transform: translateX(-100%);
  }
  
  .right-sidebar {
    right: 0;
    border-left: 1px solid var(--color-border);
  }
  .right-sidebar-collapsed .right-sidebar {
    transform: translateX(100%);
  }

  .sidebar-toggle {
    display: block; /* 在移动端明确显示 */
    top: 60px;
    height: 40px;
    width: 40px;
    writing-mode: horizontal-tb;
    border-radius: 50%;
  }
  
  .left-toggle {
    left: 1rem;
    transform: none;
  }
  
  .right-toggle {
    right: 1rem;
    left: auto;
    transform: none;
  }

  /* 当侧边栏打开时，可以添加一个遮罩层 */
  .game-layout:not(.left-sidebar-collapsed)::after,
  .game-layout:not(.right-sidebar-collapsed)::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 99;
  }
}

/* 全屏状态下的样式修正 */
:fullscreen .game-layout,
.game-layout:fullscreen {
  height: 100%;
  width: 100%;
}
</style>