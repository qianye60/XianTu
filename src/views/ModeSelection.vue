<!-- src/views/ModeSelection.vue -->
<template>
  <div class="mode-selection-container">
    <VideoBackground />

    <div class="selection-content">
      <div class="title-container">
        <h1 class="main-title">大 道 朝 天</h1>
        <span class="version-tag">V0.1 Alpha</span>
      </div>
      <p class="sub-title">大道朝天，各走一边</p>

      <div class="gate-container">
        <!-- Left Gate: Single Player -->
        <div class="gate-card left-gate" @click="selectPath('single')">
          <div class="gate-icon">
            <!-- Icon: 独修闭关 -->
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/>
              <path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/>
              <path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>
            </svg>
          </div>
          <div class="gate-text">
            <h2 class="gate-title">单机闭关</h2>
            <p class="gate-description">避世清修·心无旁骛</p>
            <p class="gate-detail">独居洞府，专心致志炼就大道根基<br/>所有进度本地存储，断网亦可修行</p>
          </div>
        </div>

        <!-- Right Gate: Multiplayer -->
        <div class="gate-card right-gate" @click="selectPath('cloud')">
          <div class="gate-icon">
            <!-- Icon: 联机共修 -->
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="gate-text">
            <h2 class="gate-title">联机共修</h2>
            <p class="gate-description">入世历练·与道友论道</p>
            <p class="gate-detail">云端同修，可遇其他修士切磋论道<br/>法身数据云端保存，随处可续前缘</p>
          </div>
        </div>
      </div>

      <!-- 隐私说明 -->
      <div class="privacy-notice">
        <p>本联机谨遵天道法则：<strong>不存储任何对话记录</strong></p>
        <p>仅保留法身属性、境界进度等修行要素，确保道友隐私清净无染</p>
      </div>

      <button class="scroll-btn" @click="enterCharacterSelection">
        <span>续 前 世 因 缘</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import VideoBackground from '@/components/common/VideoBackground.vue';

const emit = defineEmits<{
  (e: 'start-creation', mode: 'single' | 'cloud'): void;
  (e: 'show-character-list'): void;
}>();

const selectPath = (mode: 'single' | 'cloud') => {
  // 检测环境并给出建议
  const hasTavernAI = !!(window.parent?.TavernHelper);

  if (mode === 'cloud' && !hasTavernAI) {
    // 联机模式但没有TavernAI环境
    const confirmed = confirm(
      '联机模式需要在TavernAI中运行以保存数据和使用AI功能。\n\n' +
      '当前环境未检测到TavernAI，建议选择单机模式。\n\n' +
      '是否继续使用联机模式？（可能会遇到保存和AI功能问题）'
    );
    if (!confirmed) {
      return; // 用户取消，不继续
    }
  }

  emit('start-creation', mode);
};

const enterCharacterSelection = () => {
  emit('show-character-list');
};
</script>

<style scoped>
.mode-selection-container {
  /* container styles are inherited */
}

.selection-content {
  /* 添加透明磨砂效果 */
  background: var(--color-surface-transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 20px;
  padding: 2rem;
  border: 1px solid var(--color-border);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.title-container {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.version-tag {
  font-size: 1rem;
  font-family: 'Consolas', 'monospace';
  color: var(--color-warning);
  padding: 0.2rem 0.6rem;
  border: 1px solid var(--color-warning);
  border-radius: 4px;
  opacity: 0.7;
  font-weight: bold;
}

.main-title {
  font-family: var(--font-family-serif);
  font-size: 3.5rem;
  font-weight: 500;
  letter-spacing: 0.5em;
  color: var(--color-text);
  text-shadow: 0 0 25px rgba(var(--color-primary-rgb), 0.5);
  margin: 0;
}

.sub-title {
  font-size: 1.2rem;
  color: var(--color-text-secondary);
  margin-bottom: 4rem;
  letter-spacing: 0.1em;
  opacity: 0.9;
}

.gate-container {
  display: flex;
  gap: 2rem;
  width: 100%;
  max-width: 900px;
  justify-content: center;
}

.gate-card {
  flex: 1;
  max-width: 300px;
  padding: 1.5rem 1.5rem;
  background: var(--color-surface-transparent);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  text-align: center;
  transition: all 0.4s ease;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.gate-card:hover {
  transform: translateY(-10px);
  border-color: var(--color-primary);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2), 0 0 20px rgba(var(--color-primary-rgb), 0.3);
  background: var(--color-surface);
}

.gate-icon {
  color: var(--color-primary);
  margin-bottom: 1.5rem;
  transition: all 0.4s ease;
}
.gate-card:hover .gate-icon {
  transform: scale(1.1);
  color: var(--color-accent);
  filter: drop-shadow(0 0 10px rgba(var(--color-accent-rgb), 0.7));
}

.gate-title {
  font-family: var(--font-family-serif);
  font-size: 1.6rem;
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
}

.gate-description {
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
}

.gate-detail {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  line-height: 1.4;
  opacity: 0.8;
}

.privacy-notice {
  margin-top: 2rem;
  padding: 1rem;
  background: rgba(var(--color-warning-rgb), 0.1);
  border: 1px solid rgba(var(--color-warning-rgb), 0.3);
  border-radius: 8px;
  max-width: 600px;
  text-align: center;
}

.privacy-notice p {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0.5rem 0;
  line-height: 1.5;
}

.privacy-notice strong {
  color: var(--color-warning);
}

.scroll-btn {
  margin-top: 2rem;
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-family: var(--font-family-serif);
  font-size: 1rem;
  letter-spacing: 0.3em;
  padding: 0.6rem 2rem;
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
    font-size: 2.5rem;
  }
  .sub-title {
    margin-bottom: 3rem;
  }
  .gate-container {
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }
  .gate-card {
    width: 100%;
    max-width: 350px;
    padding: 2rem 1.5rem;
  }
  .gate-detail {
    font-size: 0.8rem;
  }
  .privacy-notice {
    margin-top: 2rem;
    padding: 1rem;
    max-width: 100%;
  }
  .privacy-notice p {
    font-size: 0.85rem;
  }
  .scroll-btn {
    margin-top: 2rem;
  }
}
</style>
