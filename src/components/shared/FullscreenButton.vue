<template>
  <button @click="toggleFullscreen" class="fullscreen-btn" title="切换全屏">
    <svg v-if="!isFullscreen" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-maximize">
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
    <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-minimize">
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const isFullscreen = ref(false);

const updateFullscreenStatus = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.error(`进入全屏模式失败: ${err.message} (${err.name})`);
    });
  } else {
    document.exitFullscreen();
  }
};

onMounted(() => {
  document.addEventListener('fullscreenchange', updateFullscreenStatus);
});

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', updateFullscreenStatus);
});
</script>

<style scoped>
.fullscreen-btn {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  width: 50px;
  height: 50px;
  background-color: rgba(var(--color-surface-rgb), 0.8);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  color: var(--color-text);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  backdrop-filter: blur(5px);
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.fullscreen-btn:hover {
  background-color: rgba(var(--color-primary-rgb), 0.2);
  color: var(--color-primary);
  transform: scale(1.1);
  box-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.4);
}

.fullscreen-btn svg {
  width: 24px;
  height: 24px;
}
</style>
