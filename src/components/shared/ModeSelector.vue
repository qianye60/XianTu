<template>
  <div class="mode-selector-overlay">
    <div class="mode-selector-panel">
      <header class="panel-header">
        <h2 class="title">【 道途选择 】</h2>
        <p class="subtitle">道友，请择汝之修行模式</p>
      </header>

      <main class="mode-options">
        <div
          class="mode-card offline-mode"
          @click="selectMode('offline')"
          :class="{ selected: selectedMode === 'offline' }"
        >
          <div class="mode-icon">
            <i class="fas fa-mountain"></i>
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
            <i class="fas fa-globe"></i>
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
        <button class="btn btn-complete" :disabled="!selectedMode" @click="confirmMode">
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

const emit = defineEmits<{
  'mode-selected': [mode: 'online' | 'offline']
}>()

const selectedMode = ref<'online' | 'offline' | null>(null)

const selectMode = (mode: 'online' | 'offline') => {
  selectedMode.value = mode
}

const confirmMode = () => {
  if (selectedMode.value) {
    emit('mode-selected', selectedMode.value)
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
  background: linear-gradient(
    135deg,
    rgba(15, 23, 42, 0.95) 0%,
    rgba(30, 41, 59, 0.95) 50%,
    rgba(15, 23, 42, 0.95) 100%
  );
  backdrop-filter: blur(12px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.8s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.mode-selector-panel {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 3rem;
  max-width: 900px;
  width: 90%;
  box-shadow:
    0 25px 50px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  animation: slideUp 0.6s ease-out 0.2s both;
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
  text-align: center;
  margin-bottom: 3rem;
}

.title {
  font-family: var(--font-family-serif);
  font-size: 2.5rem;
  color: var(--color-primary);
  margin-bottom: 1rem;
  text-shadow: 0 0 20px rgba(140, 115, 90, 0.6);
  letter-spacing: 0.1em;
}

.subtitle {
  font-size: 1.2rem;
  color: var(--color-text-secondary);
  opacity: 0.9;
}

.mode-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 3rem;
}

.mode-card {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 2.5rem;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
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
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.mode-card.selected {
  border-color: var(--color-accent);
  background: linear-gradient(145deg, rgba(90, 140, 140, 0.15) 0%, rgba(90, 140, 140, 0.08) 100%);
  box-shadow:
    0 0 30px rgba(90, 140, 140, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transform: translateY(-4px);
}

.mode-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.mode-icon i {
  font-size: 3rem;
  color: var(--color-accent);
  opacity: 0.8;
  transition: all 0.3s ease;
}

.mode-card:hover .mode-icon i {
  transform: scale(1.1);
  opacity: 1;
}

.mode-title {
  font-size: 1.5rem;
  color: var(--color-text);
  margin-bottom: 1rem;
  text-align: center;
  font-weight: 600;
}

.mode-description {
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 1.5rem;
  text-align: center;
}

.privacy-note {
  color: var(--color-accent);
  font-style: italic;
  opacity: 0.8;
}

.mode-features {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.feature {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-footer {
  text-align: center;
}

.mode-hint {
  margin-top: 1rem;
  color: var(--color-accent);
  font-style: italic;
  opacity: 0.9;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .mode-selector-panel {
    padding: 2rem;
    margin: 1rem;
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
