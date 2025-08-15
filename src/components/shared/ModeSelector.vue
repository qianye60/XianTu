<template>
  <div class="mode-selector-overlay">
    <div class="mode-selector-panel">
      <div class="stars-container">
        <div v-for="n in 50" :key="`star-${n}`" class="star"></div>
      </div>
      <header class="panel-header">
        <div class="header-content">
          <h2 class="title">道途选择</h2>
          <ThemeSwitcher />
        </div>
        <p class="subtitle">道友，请择汝之修行模式</p>
      </header>

      <main class="mode-options">
        <div
          class="mode-card offline-mode"
          @click="selectMode('offline')"
          :class="{ selected: selectedMode === 'offline' }"
        >
          <div class="mode-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
            </svg>
          </div>
          <h3 class="mode-title">单机闭关</h3>
          <p class="mode-description">
            独自修行，不依赖天网灵脉，所有数据存于本地洞府。
            <br />
            <small class="privacy-note"> ※ 完全离线模式，无需担心隐私泄露 </small>
          </p>
          <div class="mode-features">
            <span class="feature">✧ 本地存储</span>
            <span class="feature">✧ 隐私保护</span>
            <span class="feature">✧ 无需联网</span>
          </div>
        </div>

        <div
          class="mode-card online-mode"
          @click="selectMode('online')"
          :class="{ selected: selectedMode === 'online' }"
        >
          <div class="mode-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
          </div>
          <h3 class="mode-title">联机共修</h3>
          <p class="mode-description">
            连接天网灵脉，享受云端修行体验，数据实时同步。
            <br />
            <small class="privacy-note"> ※ 仅存储角色物品装备属性，不存储任何个人隐私消息 </small>
          </p>
          <div class="mode-features">
            <span class="feature">✧ 云端同步</span>
            <span class="feature">✧ 跨设备访问</span>
            <span class="feature">✧ 数据备份</span>
          </div>
        </div>
      </main>

      <footer class="panel-footer">
        <button @click="confirmMode" class="btn btn-primary confirm-btn" :disabled="!selectedMode">
          开启修行之路
        </button>
        <p class="mode-hint" v-if="selectedMode">
          已选择：{{ selectedMode === 'offline' ? '单机闭关' : '联机共修' }}模式
        </p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ThemeSwitcher from './ThemeSwitcher.vue'
import { useGameMode } from '@/composables/useGameMode'

const { setGameMode } = useGameMode()
const selectedMode = ref<'online' | 'offline' | null>(null)

const selectMode = (mode: 'online' | 'offline') => {
  selectedMode.value = mode
}

const confirmMode = () => {
  console.log('[ModeSelector] 按下“开启修行之路”法印。')
  if (selectedMode.value) {
    console.log(`[ModeSelector] 已择道途: ${selectedMode.value}，开始传送...`)
    setGameMode(selectedMode.value)
  } else {
    console.log('[ModeSelector] 未择道途，无动于衷。')
  }
}
</script>

<style scoped>
.mode-selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: transparent; /* 移除背景，让下层天幕显现 */
  overflow-y: auto; /* 允许垂直滚动 */
  overflow-x: hidden; /* 禁止横向滚动 */
  display: flex;
  justify-content: center;
  align-items: flex-start; /* 改为顶部对齐，避免内容过长时被截断 */
  z-index: 1000;
  padding: 2rem 1rem; /* 添加适当的内边距 */
  box-sizing: border-box; /* 确保padding不会导致溢出 */
}

.mode-selector-panel {
    position: relative;
    z-index: 10;
    /* 深色半透明背景，确保在任何主题下文字都清晰 */
    background: linear-gradient(145deg, rgba(30, 40, 50, 0.9) 0%, rgba(20, 30, 40, 0.95) 100%);
    border: 1px solid rgba(var(--color-primary-rgb), 0.3);
    border-radius: 20px;
    padding: 3rem;
    max-width: 900px;
    width: 100%;
    margin: auto 0; /* 垂直居中，但不会导致内容被截断 */
    box-shadow:
      0 25px 50px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(15px);
    animation: slideUp 0.6s ease-out 0.2s both;
}

/* 心法三：卷轴化滚动条 */
.mode-selector-overlay::-webkit-scrollbar {
  width: 8px;
}

.mode-selector-overlay::-webkit-scrollbar-track {
  background: transparent;
}

.mode-selector-overlay::-webkit-scrollbar-thumb {
  background-color: rgba(var(--color-primary-rgb), 0.3);
  border-radius: 10px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.mode-selector-overlay::-webkit-scrollbar-thumb:hover {
  background-color: rgba(var(--color-primary-rgb), 0.5);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.panel-header {
  margin-bottom: 3rem;
  text-align: center;
}

.header-content {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.header-content .title {
  margin: 0;
}

.header-content .theme-switcher {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

.title {
  font-family: var(--font-family-serif);
  font-size: 2.5rem;
  color: var(--color-primary);
  margin-bottom: 1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5), 0 0 20px rgba(var(--color-primary-rgb), 0.3);
  letter-spacing: 0.1em;
}

.subtitle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.mode-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 3rem;
}

.mode-card {
  background: rgba(40, 50, 60, 0.8);
  border: 2px solid rgba(var(--color-primary-rgb), 0.2);
  border-radius: 16px;
  padding: 2.5rem;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(5px);
}

.mode-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.6s ease;
}

.mode-card:hover::before {
  left: 100%;
}

.mode-card:hover {
  transform: translateY(-8px);
  background: rgba(50, 60, 70, 0.9);
  border-color: var(--color-primary);
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.mode-card.selected {
  border-color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.25);
  box-shadow:
    0 0 30px rgba(var(--color-primary-rgb), 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transform: translateY(-4px);
}

.mode-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.mode-icon svg {
  width: 3rem;
  height: 3rem;
  color: var(--color-accent);
  opacity: 0.8;
  transition: all 0.3s ease;
}

.mode-card:hover .mode-icon svg {
  transform: scale(1.1);
  opacity: 1;
  color: var(--color-primary);
}

.mode-title {
  font-size: 1.5rem;
  color: var(--color-primary);
  margin-bottom: 1rem;
  text-align: center;
  font-weight: 600;
  text-shadow: 0 0 10px rgba(var(--color-primary-rgb), 0.3);
}

.mode-description {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  margin-bottom: 1.5rem;
  text-align: center;
}

.privacy-note {
  color: var(--color-accent);
  font-style: italic;
  opacity: 0.9;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}

.mode-features {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.feature {
  background: rgba(var(--color-primary-rgb), 0.15);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(var(--color-primary-rgb), 0.3);
}

.panel-footer {
  text-align: center;
}

.confirm-btn {
  padding: 1rem 2.5rem;
  font-size: 1.1rem;
  font-weight: bold;
  background: var(--color-primary);
  color: var(--color-background);
  border: 2px solid var(--color-primary);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: var(--font-family-serif);
  letter-spacing: 0.05em;
}

.confirm-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  box-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.4);
  transform: translateY(-2px);
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.mode-hint {
  margin-top: 1rem;
  color: var(--color-accent);
  font-style: italic;
  opacity: 0.9;
}

/* 星辰 & 流星动画 */
.stars-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  border-radius: 20px;
}

.star {
  position: absolute;
  background-color: #fff;
  border-radius: 50%;
  box-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px var(--color-primary);
  animation: animate-star 10s linear infinite;
  opacity: 0;
}

@keyframes animate-star-1 { /* 右下 */
  0% { transform: translate(0, 0); opacity: 0; }
  10%, 90% { opacity: 1; }
  100% { transform: translate(150px, 150px); opacity: 0; }
}

@keyframes animate-star-2 { /* 左下 */
  0% { transform: translate(0, 0); opacity: 0; }
  10%, 90% { opacity: 1; }
  100% { transform: translate(-120px, 180px); opacity: 0; }
}

@keyframes animate-star-3 { /* 右 */
  0% { transform: translate(0, 0); opacity: 0; }
  10%, 90% { opacity: 1; }
  100% { transform: translate(200px, 50px); opacity: 0; }
}


/* 随机化星辰位置、大小和动画 - 仅示例前10颗 */
.star:nth-child(1) { top: 10%; left: 20%; width: 2px; height: 2px; animation-name: animate-star-1; animation-delay: 0s; animation-duration: 8s; }
.star:nth-child(2) { top: 30%; left: 80%; width: 1px; height: 1px; animation-name: animate-star-2; animation-delay: 1.5s; animation-duration: 10s; }
.star:nth-child(3) { top: 50%; left: 5%; width: 2px; height: 2px; animation-name: animate-star-3; animation-delay: 3s; animation-duration: 7s; }
.star:nth-child(4) { top: 80%; left: 90%; width: 3px; height: 3px; animation-name: animate-star-1; animation-delay: 4.5s; animation-duration: 6s; }
.star:nth-child(5) { top: 5%; left: 50%; width: 1px; height: 1px; animation-name: animate-star-2; animation-delay: 6s; animation-duration: 12s; }
.star:nth-child(6) { top: 60%; left: 60%; width: 2px; height: 2px; animation-name: animate-star-3; animation-delay: 0.5s; animation-duration: 9s; }
.star:nth-child(7) { top: 90%; left: 15%; width: 1px; height: 1px; animation-name: animate-star-1; animation-delay: 2.5s; animation-duration: 11s; }
.star:nth-child(8) { top: 40%; left: 40%; width: 2px; height: 2px; animation-name: animate-star-2; animation-delay: 4s; animation-duration: 8s; }
.star:nth-child(9) { top: 75%; left: 70%; width: 1px; height: 1px; animation-name: animate-star-3; animation-delay: 5.5s; animation-duration: 10s; }
.star:nth-child(10) { top: 25%; left: 95%; width: 3px; height: 3px; animation-name: animate-star-1; animation-delay: 7s; animation-duration: 6s; }
/* ... 可按此法继续添加，以覆盖所有50颗星辰 ... */


/* 响应式设计 */
@media (max-width: 768px) {
  .mode-selector-overlay {
    /* padding: 1rem; -- 遵道友法旨，移除内边距 */
  }

  .mode-selector-panel {
    padding: 1.5rem; /* 相应地减小面板的内边距 */
  }

  .mode-options {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .title {
    font-size: 2rem;
  }

  .mode-card {
    padding: 2rem;
  }
}
</style>
