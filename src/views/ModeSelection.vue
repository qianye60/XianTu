<template>
  <div class="mode-selection-container">
    <video autoplay muted loop playsinline class="video-background" src="http://38.55.124.252:13145/1394774d3043156d.mp4"></video>
    <div class="video-overlay"></div>

    <!-- 道途选择 -->
    <div class="selection-content">
      <h1 class="main-title">
        <span class="title-char">道</span>
        <span class="title-char">途</span>
        <span class="title-char">选</span>
        <span class="title-char">择</span>
      </h1>
      <p class="sub-title">大道朝天，各走一边</p>

      <button class="portal-btn" @click="enterCharacterSelection">
        <span class="portal-text">登入仙途</span>
        <span class="portal-subtext">选择已有法身</span>
      </button>

      <div class="divider">
        <span>或，开辟新法身</span>
      </div>

      <div class="paths-container">
        <div class="path-card single-path" @click="selectPath('single')">
          <div class="path-glow"></div>
          <div class="path-icon">
            <!-- Lucide Icon: user-round -->
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
          </div>
          <h2 class="path-title">新游戏：单机闭关</h2>
          <p class="path-description">
            所有数据存于本地洞府
          </p>
          <div class="features">
            <span class="feature-tag">本地存储</span>
            <span class="feature-tag">无需联网</span>
          </div>
        </div>

        <div class="path-card multi-path" @click="selectPath('multi')">
          <div class="path-glow"></div>
          <div class="path-icon">
            <!-- Lucide Icon: network -->
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></svg>
          </div>
          <h2 class="path-title">新游戏：联机共修</h2>
          <p class="path-description">
            数据实时云端同步
          </p>
           <div class="features">
            <span class="feature-tag">云端同步</span>
            <span class="feature-tag">跨设备访问</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { CharacterData } from '@/types';

const emit = defineEmits<{
  (e: 'start-creation', mode: 'single' | 'multi'): void;
  (e: 'show-character-list'): void;
  (e: 'game-start', character: CharacterData): void;
}>();

const selectPath = (mode: 'single' | 'multi') => {
  emit('start-creation', mode);
};

const enterCharacterSelection = () => {
  emit('show-character-list');
};
</script>

<style scoped>
/* ... (previous styles) ... */
.sub-title {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
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

.portal-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 320px;
  height: 100px;
  margin-bottom: 1.5rem;
  background: radial-gradient(ellipse at center, rgba(14, 22, 39, 0.8) 0%, rgba(14, 22, 39, 0.95) 100%);
  border: 2px solid rgba(136, 192, 208, 0.3);
  border-radius: 12px;
  color: #d8dee9;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  overflow: hidden;
}

.portal-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: radial-gradient(circle, rgba(229, 192, 123, 0.3) 0%, rgba(229, 192, 123, 0) 70%);
  border-radius: 50%;
  transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
  transform: translate(-50%, -50%);
}

.portal-btn:hover::before {
  width: 300px;
  height: 300px;
}

.portal-btn:hover {
  border-color: rgba(229, 192, 123, 0.7);
  box-shadow: 0 0 40px rgba(229, 192, 123, 0.3);
  transform: translateY(-5px);
}

.portal-text {
  font-size: 1.8rem;
  font-weight: bold;
  letter-spacing: 0.2em;
  text-shadow: 0 0 10px rgba(229, 192, 123, 0.5);
  transition: all 0.3s ease;
  z-index: 1;
}

.portal-subtext {
  font-size: 0.9rem;
  color: #88c0d0;
  letter-spacing: 0.1em;
  transition: all 0.3s ease;
  z-index: 1;
  opacity: 0.8;
}

.portal-btn:hover .portal-text {
  color: #e5c07b;
  text-shadow: 0 0 15px #e5c07b;
}

.portal-btn:hover .portal-subtext {
  color: #e5c07b;
  opacity: 1;
}

.divider {
  width: 100%;
  max-width: 500px;
  text-align: center;
  border-bottom: 1px solid var(--color-border);
  line-height: 0.1em;
  margin: 1.5rem 0;
}

.divider span {
  background: var(--color-surface-translucent);
  padding: 0 15px;
  color: var(--color-text-secondary);
}

.start-game-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(229, 192, 123, 0.4);
}

.character-selection-wrapper {
  width: 100%;
  height: 100%;
  overflow-y: auto;
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
