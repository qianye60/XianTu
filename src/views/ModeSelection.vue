<template>
  <div class="mode-selection-container">
    <video autoplay muted loop playsinline class="video-background" src="http://38.55.124.252:13145/1394774d3043156d.mp4"></video>
    <div class="video-overlay"></div>

    <div class="selection-content">
      <h1 class="main-title">天 命 昭 始</h1>
      <p class="sub-title">一念之差，道途分野</p>

      <div class="astrolabe-container">
        <!-- Left Path: Single Player -->
        <div class="path-half left-path" @click="selectPath('single')">
          <div class="path-icon">
            <!-- Icon: Moon -->
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
          </div>
          <div class="path-text">
            <h2 class="path-title">独步寻道</h2>
            <p class="path-description">闭关清修，自成一界</p>
          </div>
        </div>

        <!-- Separator -->
        <div class="astrolabe-separator"></div>

        <!-- Right Path: Multiplayer -->
        <div class="path-half right-path" @click="selectPath('multi')">
          <div class="path-icon">
            <!-- Icon: Stars -->
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v2"/><path d="M12 19v2"/><path d="M3 12h2"/><path d="M19 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 19.07-1.41-1.41"/><path d="m6.34 6.34-1.41-1.41"/><circle cx="12" cy="12" r="2"/><path d="M12 8a4 4 0 1 0 4 4"/></svg>
          </div>
          <div class="path-text">
            <h2 class="path-title">携缘入世</h2>
            <p class="path-description">入世历劫，广结仙缘</p>
          </div>
        </div>
      </div>

      <button class="scroll-btn" @click="enterCharacterSelection">
        <span>唤 醒 旧 识</span>
      </button>
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
.main-title {
  font-family: var(--font-family-serif);
  font-size: 3rem;
  font-weight: 500;
  letter-spacing: 0.5em;
  color: var(--color-text);
  text-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.5);
  margin-bottom: 0.5rem;
}

.sub-title {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
  margin-bottom: 3rem;
  letter-spacing: 0.1em;
  opacity: 0.9;
}

.astrolabe-container {
  display: flex;
  width: 100%;
  max-width: 800px;
  height: 300px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 150px; /* Make it oval */
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 30px rgba(0,0,0,0.3);
}

.path-half {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  cursor: pointer;
  transition: background-color 0.4s ease, color 0.4s ease;
  position: relative;
  z-index: 2;
}

.left-path {
  justify-content: flex-start;
  padding-left: 4rem;
}

.right-path {
  justify-content: flex-end;
  padding-right: 4rem;
  text-align: right;
}

.path-half:hover {
  background-color: rgba(var(--color-primary-rgb), 0.2);
}

.path-icon {
  color: var(--color-primary);
  margin: 0 1.5rem;
  transition: transform 0.4s ease, color 0.4s ease;
}

.path-half:hover .path-icon {
  transform: scale(1.1);
  color: var(--color-accent);
}

.path-title {
  font-family: var(--font-family-serif);
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
}

.path-description {
  font-size: 1rem;
  color: var(--color-text-secondary);
}

.astrolabe-separator {
  width: 1px;
  height: 60%;
  background: var(--color-border);
  position: absolute;
  left: 50%;
  top: 20%;
  transform: translateX(-50%);
  z-index: 1;
}

.scroll-btn {
  margin-top: 3rem;
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-family: var(--font-family-serif);
  font-size: 1.2rem;
  letter-spacing: 0.3em;
  padding: 0.8rem 2rem;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.scroll-btn:hover {
  background: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-primary);
  box-shadow: 0 0 15px rgba(var(--color-primary-rgb), 0.3);
}

@media (max-width: 768px) {
  .main-title {
    font-size: 2rem;
  }
  .sub-title {
    margin-bottom: 2rem;
  }
  .astrolabe-container {
    flex-direction: column;
    height: auto;
    border-radius: 20px;
  }
  .astrolabe-separator {
    width: 60%;
    height: 1px;
    top: 50%;
    left: 20%;
    transform: translateY(-50%);
  }
  .path-half {
    flex-direction: column;
    text-align: center;
    padding: 2rem 1rem;
  }
  .left-path, .right-path {
    justify-content: center;
    padding: 2rem 1rem;
    text-align: center;
  }
  .path-icon {
    margin-bottom: 1rem;
  }
  .scroll-btn {
    margin-top: 2rem;
  }
}
</style>