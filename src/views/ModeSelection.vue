<!-- src/views/ModeSelection.vue -->
<template>
  <div class="mode-selection-container">
    <VideoBackground />

    <div class="selection-content">
      <div class="header-container">
        <div class="title-version-row">
          <h1 class="main-title">仙 途</h1>
          <span class="version-tag">V{{ appVersion }} {{ $t('正式版') }}</span>
        </div>
        <p class="sub-title">朝游北海暮苍梧，醉卧云霞食朝露</p>
        <!-- 酒馆环境指示器 -->
        <div class="env-indicator" :class="backendReady ? 'backend' : 'offline'">
          <span class="env-dot"></span>
          <span>{{ backendReady ? '后端已连接 · 联机可用' : '未配置后端 · 联机/创意工坊不可用' }}</span>
        </div>
      </div>

      <div class="gate-container">
        <!-- Left Gate: Single Player -->
        <div
          class="gate-card"
          :class="{ selected: selectedMode === 'single' }"
          @click="selectPath('single')"
        >
          <div class="gate-icon">
            <User :size="44" :stroke-width="1.5" />
          </div>
          <h2 class="gate-title">{{ $t('单机闯关') }}</h2>
          <p class="gate-description">{{ $t('避世清修·心无无斧') }}</p>
          <p class="gate-detail">{{ $t('独居洞府，专心致志炼就大道根基') }}<br/>{{ $t('所有进度本地存储，断网亦可修行') }}</p>
        </div>

        <!-- Right Gate: Multiplayer / Tavern -->
        <div
          class="gate-card"
          :class="{ selected: selectedMode === 'cloud', disabled: !backendReady }"
          @click="selectPath('cloud')"
        >
          <div class="gate-icon">
            <Users :size="44" :stroke-width="1.5" />
          </div>
          <h2 class="gate-title">{{ $t('联机共修') }}</h2>
          <p class="gate-description">
            {{ backendReady ? $t('后端已连接，进入联机共修') : $t('未配置后端，联机暂不可用') }}
          </p>
          <p class="gate-detail">
            {{ backendReady ? $t('联机数据由后端权威控制，防止作弊') : $t('由开发者配置后端后开放') }}
          </p>
          <span v-if="!backendReady" class="coming-soon-badge">{{ $t('未启用') }}</span>
        </div>
      </div>

      <!-- 隐私说明 -->
      <div class="privacy-notice">
        <p>{{ $t('本联机谨遵天道法则：不存储任何对话记录') }}</p>
        <p>{{ $t('仅保留法身属性、境界进度等修行要素，确保道友隐私清净无染') }}</p>
      </div>

      <div class="footer-actions">
        <div v-if="selectedMode" class="start-actions-container">
          <button class="action-btn primary" @click="startNewGame">
            <Sparkles :size="18" />
            <span>{{ $t('初入仙途') }}</span>
          </button>
          <button class="action-btn" @click="enterCharacterSelection">
            <History :size="18" />
            <span>{{ $t('续前世因缘') }}</span>
          </button>
        </div>
        <button v-else class="scroll-btn" @click="enterCharacterSelection">
          <span>{{ $t('续前世因缘') }}</span>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import VideoBackground from '@/components/common/VideoBackground.vue';
import { Sparkles, History, User, Users } from 'lucide-vue-next';
import { useUIStore } from '@/stores/uiStore';
import { fetchBackendVersion, isBackendConfigured } from '@/services/backendConfig';

const appVersion = ref(APP_VERSION);

const selectedMode = ref<'single' | 'cloud' | null>(null);
const backendReady = ref(isBackendConfigured());

onMounted(async () => {
  if (!backendReady.value) return;
  const backendVersion = await fetchBackendVersion();
  if (backendVersion) {
    appVersion.value = backendVersion;
  }
});

const emit = defineEmits<{
  (e: 'start-creation', mode: 'single' | 'cloud'): void;
  (e: 'show-character-list'): void;
}>();

const uiStore = useUIStore();

const selectPath = (mode: 'single' | 'cloud') => {
  if (mode === 'cloud' && !backendReady.value) {
    uiStore.showRetryDialog({
      title: '联机未启用',
      message: '未配置后端服务器，无法使用联机共修与登录功能。请先选择"单机闯关"。',
      confirmText: '知道了',
      cancelText: '??',
      onConfirm: () => {},
      onCancel: () => {}
    });
    return;
  }

  if (selectedMode.value === mode) {
    selectedMode.value = null;
  } else {
    selectedMode.value = mode;
  }
};

const startNewGame = () => {
  if (selectedMode.value) {
    emit('start-creation', selectedMode.value);
  }
};

const enterCharacterSelection = async () => {
  emit('show-character-list');
};
</script>

<style scoped>
.mode-selection-container {
  width: 100%;
  height: 100vh;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  box-sizing: border-box;
  background: transparent; /* 透明背景以显示视频 */
  overflow: auto; /* 允许滚动以适应小屏幕 */
  -webkit-overflow-scrolling: touch; /* iOS滚动优化 */
}

.selection-content {
  background: var(--mode-selection-bg, rgba(15, 23, 42, 0.75));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 3rem;
  border: 1px solid var(--mode-selection-border, rgba(255, 255, 255, 0.08));
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  max-height: 90vh;
  max-width: 920px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2.5rem;
}

.header-container {
  text-align: center;
}

.title-version-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.main-title {
  font-family: var(--font-family-serif);
  font-size: 3rem;
  font-weight: 400;
  letter-spacing: 0.5em;
  color: var(--mode-selection-title, #f8fafc);
  margin: 0;
  padding-left: 0.5em;
  text-shadow: 0 0 40px var(--mode-selection-glow, rgba(147, 197, 253, 0.3));
}

.version-tag {
  font-size: 0.7rem;
  font-family: 'SF Mono', 'Consolas', monospace;
  color: #fbbf24;
  padding: 0.25rem 0.6rem;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.25);
  border-radius: 4px;
  font-weight: 500;
  letter-spacing: 0.05em;
}

.sub-title {
  font-size: 1.1rem;
  color: var(--mode-selection-subtitle, #94a3b8);
  letter-spacing: 0.2em;
  margin: 0;
  font-weight: 300;
}

/* 环境指示器 */
.env-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.env-indicator.backend {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ade80;
}

.env-indicator.offline {
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: #fca5a5;
}

.env-indicator .env-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.gate-container {
  display: flex;
  gap: 1.5rem;
  width: 100%;
  justify-content: center;
}

.gate-card {
  flex: 1;
  max-width: 340px;
  padding: 2.5rem 2rem;
  background: var(--mode-selection-card-bg, rgba(30, 41, 59, 0.5));
  border: 1px solid var(--mode-selection-card-border, rgba(255, 255, 255, 0.06));
  border-radius: 12px;
  cursor: pointer;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
}

.gate-card:hover {
  background: var(--mode-selection-card-hover, rgba(30, 41, 59, 0.8));
  border-color: var(--mode-selection-accent, rgba(147, 197, 253, 0.2));
  transform: translateY(-4px);
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.4);
}

.gate-card.selected {
  background: var(--mode-selection-card-selected, rgba(30, 58, 138, 0.4));
  border-color: var(--mode-selection-accent-strong, rgba(147, 197, 253, 0.4));
  box-shadow:
    0 20px 40px -15px rgba(0, 0, 0, 0.4),
    0 0 0 1px var(--mode-selection-accent, rgba(147, 197, 253, 0.1)),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.gate-card.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.gate-icon {
  color: var(--mode-selection-icon, #93c5fd);
  margin-bottom: 1.5rem;
  opacity: 0.9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gate-card:hover .gate-icon {
  opacity: 1;
}

.gate-card.selected .gate-icon {
  color: var(--mode-selection-icon-selected, #bfdbfe);
}

.gate-title {
  font-family: var(--font-family-serif);
  font-size: 1.4rem;
  font-weight: 400;
  margin: 0 0 0.5rem 0;
  color: var(--mode-selection-text, #f1f5f9);
  letter-spacing: 0.1em;
}

.gate-description {
  font-size: 0.95rem;
  color: var(--mode-selection-subtitle, #94a3b8);
  margin: 0 0 0.75rem 0;
  font-weight: 400;
}

.gate-detail {
  font-size: 0.8rem;
  color: var(--mode-selection-muted, #64748b);
  line-height: 1.6;
  margin: 0;
}

.coming-soon-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 0.65rem;
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
  border: 1px solid rgba(248, 113, 113, 0.2);
  font-weight: 500;
  letter-spacing: 0.05em;
}

.privacy-notice {
  padding: 1rem 1.5rem;
  background: rgba(251, 191, 36, 0.05);
  border: 1px solid rgba(251, 191, 36, 0.1);
  border-radius: 8px;
  max-width: 560px;
  text-align: center;
}

.privacy-notice p {
  font-size: 0.8rem;
  color: var(--mode-selection-subtitle, #94a3b8);
  margin: 0.3rem 0;
  line-height: 1.5;
}

.footer-actions {
  display: flex;
  justify-content: center;
}

.start-actions-container {
  display: flex;
  gap: 1rem;
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: var(--mode-selection-btn-bg, rgba(30, 41, 59, 0.6));
  border: 1px solid var(--mode-selection-card-border, rgba(255, 255, 255, 0.08));
  color: var(--mode-selection-btn-text, #cbd5e1);
  font-family: var(--font-family-serif);
  font-size: 0.95rem;
  letter-spacing: 0.15em;
  padding: 0.8rem 1.8rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.action-btn:hover {
  background: var(--mode-selection-btn-hover, rgba(51, 65, 85, 0.8));
  border-color: var(--mode-selection-accent, rgba(147, 197, 253, 0.2));
  color: var(--mode-selection-text, #f1f5f9);
}

.action-btn.primary {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(37, 99, 235, 0.9));
  border-color: rgba(96, 165, 250, 0.3);
  color: #ffffff;
}

.action-btn.primary:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(37, 99, 235, 1));
  box-shadow: 0 8px 25px -8px rgba(59, 130, 246, 0.5);
}

.scroll-btn {
  background: transparent;
  border: 1px solid var(--mode-selection-card-border, rgba(255, 255, 255, 0.1));
  color: var(--mode-selection-subtitle, #94a3b8);
  font-family: var(--font-family-serif);
  font-size: 0.95rem;
  letter-spacing: 0.2em;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.scroll-btn:hover {
  background: var(--mode-selection-card-bg, rgba(30, 41, 59, 0.5));
  border-color: var(--mode-selection-accent, rgba(147, 197, 253, 0.2));
  color: var(--mode-selection-text-hover, #e2e8f0);
}

/* 授权状态徽章 */
.auth-status-badge {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 100;
}

.auth-status-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.9rem;
  background: var(--mode-selection-float-bg, rgba(30, 41, 59, 0.8));
  backdrop-filter: blur(10px);
  border: 1px solid var(--mode-selection-card-border, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.auth-status-content:hover {
  background: var(--mode-selection-float-hover, rgba(51, 65, 85, 0.9));
  border-color: var(--mode-selection-accent, rgba(147, 197, 253, 0.2));
}

.status-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
}

.status-icon.verified {
  background: #10b981;
  color: white;
}

.status-icon.unverified {
  background: #ef4444;
  color: white;
}

.status-text {
  font-size: 0.8rem;
  color: var(--mode-selection-subtitle, #94a3b8);
  font-weight: 500;
}

/* 亮色主题 */
[data-theme="light"] .mode-selection-container {
  --mode-selection-bg: rgba(255, 255, 255, 0.85);
  --mode-selection-border: rgba(0, 0, 0, 0.08);
  --mode-selection-title: #1e293b;
  --mode-selection-glow: rgba(59, 130, 246, 0.2);
  --mode-selection-subtitle: #64748b;
  --mode-selection-text: #1e293b;
  --mode-selection-text-hover: #334155;
  --mode-selection-muted: #94a3b8;
  --mode-selection-card-bg: rgba(248, 250, 252, 0.8);
  --mode-selection-card-border: rgba(0, 0, 0, 0.08);
  --mode-selection-card-hover: rgba(241, 245, 249, 0.95);
  --mode-selection-card-selected: rgba(219, 234, 254, 0.8);
  --mode-selection-accent: rgba(59, 130, 246, 0.3);
  --mode-selection-accent-strong: rgba(59, 130, 246, 0.5);
  --mode-selection-icon: #3b82f6;
  --mode-selection-icon-selected: #2563eb;
  --mode-selection-btn-bg: rgba(248, 250, 252, 0.8);
  --mode-selection-btn-text: #475569;
  --mode-selection-btn-hover: rgba(241, 245, 249, 0.95);
  --mode-selection-float-bg: rgba(255, 255, 255, 0.9);
  --mode-selection-float-hover: rgba(248, 250, 252, 1);
  --mode-selection-modal-bg: #ffffff;
}

/* 响应式 */
@media (max-width: 768px) {
  .selection-content {
    padding: 2rem 1.5rem;
    gap: 2rem;
  }

  .main-title {
    font-size: 2.2rem;
    letter-spacing: 0.3em;
  }

  .title-version-row {
    flex-direction: column;
    gap: 0.5rem;
  }

  .gate-container {
    flex-direction: column;
    align-items: center;
  }

  .gate-card {
    width: 100%;
    max-width: 320px;
    padding: 2rem 1.5rem;
  }

  .start-actions-container {
    flex-direction: column;
    width: 100%;
    max-width: 280px;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .mode-selection-container {
    padding: 0.75rem;
    align-items: flex-start;
    padding-top: 1rem;
  }

  .selection-content {
    padding: 1.25rem 1rem;
    gap: 1.25rem;
    border-radius: 12px;
    max-height: none;
  }

  .main-title {
    font-size: 1.6rem;
    letter-spacing: 0.2em;
  }

  .sub-title {
    font-size: 0.85rem;
  }

  .gate-card {
    padding: 1.25rem 1rem;
  }

  .gate-icon {
    margin-bottom: 1rem;
  }

  .gate-icon svg {
    width: 36px;
    height: 36px;
  }

  .gate-title {
    font-size: 1.1rem;
  }

  .gate-description {
    font-size: 0.85rem;
  }

  .gate-detail {
    font-size: 0.75rem;
  }

  .privacy-notice {
    padding: 0.6rem 0.8rem;
  }

  .privacy-notice p {
    font-size: 0.7rem;
  }

  .action-btn {
    padding: 0.7rem 1.2rem;
    font-size: 0.85rem;
  }

  .auth-status-badge {
    bottom: 12px;
    left: 12px;
  }

  .auth-status-content {
    padding: 0.4rem 0.7rem;
  }

  .status-text {
    font-size: 0.7rem;
  }
}

/* 超小屏幕适配 (360px以下) */
@media (max-width: 360px) {
  .mode-selection-container {
    padding: 0.5rem;
  }

  .selection-content {
    padding: 1rem 0.75rem;
    gap: 1rem;
  }

  .main-title {
    font-size: 1.4rem;
  }

  .sub-title {
    font-size: 0.8rem;
    letter-spacing: 0.1em;
  }

  .gate-card {
    padding: 1rem 0.75rem;
  }

  .gate-title {
    font-size: 1rem;
  }
}
</style>
