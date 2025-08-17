<!-- src/components/game-view/GameLayout.vue -->
<template>
  <div class="game-layout">
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
  </div>
</template>

<script setup lang="ts">
// This component is purely for layout, so no script logic is needed.
</script>

<style scoped>
/* 核心布局 - 从 GameView.vue 迁移而来 */
.game-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: var(--color-background);
  color: var(--color-text);
  overflow: hidden;
}

.game-header, .game-footer {
  flex-shrink: 0;
  padding: 0.75rem 1.5rem;
  background-color: var(--color-surface-light);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.game-footer {
  border-top: 1px solid var(--color-border);
  border-bottom: none;
}

.game-body {
  flex-grow: 1;
  display: flex;
  overflow: hidden;
}

.game-sidebar {
  flex-shrink: 0;
  width: 280px;
  padding: 1.5rem 1rem;
  background-color: var(--color-surface);
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  transition: width 0.3s ease;
}

.right-sidebar {
  border-left: 1px solid var(--color-border);
  border-right: none;
}

.game-main-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 响应式布局 */
@media (max-width: 1024px) {
  .game-sidebar {
    width: 240px;
  }
}

@media (max-width: 768px) {
  .game-body {
    flex-direction: column;
    overflow-y: auto; /* 允许机身在内容溢出时滚动 */
  }
  .game-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
    max-height: 30vh; /* 限制侧边栏高度，避免占据过多空间 */
    flex-shrink: 1; /* 允许侧边栏在空间不足时收缩 */
  }
  .right-sidebar {
    border-left: none;
    border-bottom: none; /* 最后一个元素不需要底部边框 */
  }
}
</style>