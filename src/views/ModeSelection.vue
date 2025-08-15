<template>
  <div class="mode-selection-container">
    <video autoplay muted loop playsinline class="video-background" src="http://38.55.124.252:13145/1394774d3043156d.mp4"></video>
    <div class="video-overlay"></div>

    <div class="selection-content">
      <h1 class="main-title">
        <span class="title-char">道</span>
        <span class="title-char">途</span>
        <span class="title-char">选</span>
        <span class="title-char">择</span>
      </h1>
      <p class="sub-title">道友，请择汝之修行模式</p>

      <div class="paths-container">
        <div class="path-card single-path" @click="selectPath('single')">
          <div class="path-glow"></div>
          <div class="path-icon">
            <!-- Lucide Icon: user-round -->
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
          </div>
          <h2 class="path-title">单机闭关</h2>
          <p class="path-description">
            独自修行，不依赖天网灵脉<br/>
            所有数据存于本地洞府
          </p>
          <div class="features">
            <span class="feature-tag">本地存储</span>
            <span class="feature-tag">隐私保护</span>
            <span class="feature-tag">无需联网</span>
          </div>
        </div>

        <div class="path-card multi-path" @click="selectPath('multi')">
          <div class="path-glow"></div>
          <div class="path-icon">
            <!-- Lucide Icon: network -->
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></svg>
          </div>
          <h2 class="path-title">联机共修</h2>
          <p class="path-description">
            连接天网灵脉，享受云端修行体验<br/>
            数据实时同步
          </p>
           <div class="features">
            <span class="feature-tag">云端同步</span>
            <span class="feature-tag">跨设备访问</span>
            <span class="feature-tag">数据备份</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom actions are now handled globally in App.vue -->
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['path-selected']);

const selectPath = (mode: 'single' | 'multi') => {
  emit('path-selected', mode);
};
</script>

<style scoped>
/* ... (previous styles) ... */
.sub-title {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
  margin-bottom: 2.5rem;
  letter-spacing: 0.1em;
  opacity: 0.8;
}

.features {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.feature-tag {
  display: inline-block;
  padding: 0.3rem 0.8rem;
  font-size: 0.75rem;
  background: rgba(136, 192, 208, 0.1);
  border: 1px solid rgba(136, 192, 208, 0.2);
  border-radius: 12px;
  color: #88c0d0;
  font-weight: 500;
  letter-spacing: 0.05em;
  transition: all 0.3s ease;
}

.path-card:hover .feature-tag {
  background: rgba(229, 192, 123, 0.15);
  border-color: rgba(229, 192, 123, 0.3);
  color: #e5c07b;
}

/* ... (rest of the styles) ... */
/* 响应式布局 - 身法自如 */
@media (max-width: 768px) {
  .selection-content {
    padding: 1.5rem 1rem; /* 减小左右内边距 */
    width: 95%; /* 稍微加宽以利用空间 */
  }

  .main-title {
    font-size: 2rem;
    margin-bottom: 1.5rem;
  }

  .sub-title {
    font-size: 1rem;
    margin-bottom: 2rem;
  }

  .paths-container {
    flex-direction: column;
    gap: 1.5rem;
  }

  .path-card {
    border-radius: 1rem;
    padding: 1.2rem; /* 减小卡片内边距 */
  }

  .path-title {
    font-size: 1.4rem;
  }

  .path-description {
    font-size: 0.9rem;
  }

  .bottom-actions {
    bottom: 1rem;
    right: 1rem;
  }
  .action-btn{
    z-index: 10;
  }
}
</style>
