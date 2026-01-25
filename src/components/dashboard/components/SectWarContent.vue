<template>
  <div class="sect-war">
    <div class="empty">
      <div class="title">宗门大战</div>
      <div class="hint">该功能正在升级中，请稍后刷新。</div>
    </div>
  </div>
</template>

<script setup lang="ts">
// NOTE: 临时占位文件，用于恢复构建。后续会在此文件内实现新版“宗门大战”面板。
</script>

<style scoped>
.sect-war {
  display: flex;
  height: 100%;
  min-height: 0;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
}

.empty {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
}

.title {
  font-weight: 800;
  letter-spacing: 0.02em;
  font-size: 1.05rem;
  color: var(--color-text);
}

.hint {
  margin-top: 6px;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}
</style>

