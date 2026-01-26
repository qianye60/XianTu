<!-- src/views/ModeSelection.vue -->
<template>
  <div class="mode-selection-container">
    <VideoBackground />

    <div class="selection-content">
      <!-- 右上角信息 -->
      <div class="top-info">
        <div class="status-indicator" :class="backendReady ? 'online' : 'offline'">
          <span class="status-dot"></span>
          <span>{{ backendReady ? $t('已连接') : $t('离线') }}</span>
        </div>
        <div class="version-tag">V{{ displayVersion }}</div>
      </div>

      <!-- 标题区域 -->
      <div class="header-section">
        <h1 class="main-title"><span class="header-title">{{ $t('仙') }}</span> {{ $t('途') }}</h1>
        <p class="sub-title">{{ $t('闲时坐看涛生灭，千秋不过酒一壶') }}</p>
      </div>

      <!-- 道途选择 -->
      <div class="paths-section">
        <div class="section-header">
          <span class="line"></span>
          <span class="text">{{ $t('择一道途') }}</span>
          <span class="line"></span>
        </div>

        <div class="gate-container">
          <!-- 单机模式 -->
          <div
            class="gate-card"
            :class="{ selected: selectedMode === 'single' }"
            @click="selectPath('single')"
          >
            <div class="gate-icon">
              <div class="icon-bg"></div>
              <User :size="36" :stroke-width="1.5" />
            </div>
            <div class="gate-info">
              <h2 class="gate-title">{{ $t('独自修行') }}</h2>
              <p class="gate-desc">{{ $t('避世清修 · 心无旁骛') }}</p>
              <p class="gate-detail">{{ $t('独居洞府，专心修炼，所有进度本地存储') }}</p>
              <div class="gate-tags">
                <span class="tag-local">{{ $t('本地存储') }}</span>
                <span class="tag-offline">{{ $t('离线可用') }}</span>
              </div>
            </div>
            <div v-if="selectedMode === 'single'" class="check-mark">
              <Check :size="18" />
            </div>
          </div>

          <!-- 联机模式 -->
          <div
            class="gate-card"
            :class="{ selected: selectedMode === 'cloud', disabled: !backendReady }"
            @click="selectPath('cloud')"
          >
            <div class="gate-icon">
              <div class="icon-bg"></div>
              <Users :size="36" :stroke-width="1.5" />
            </div>
            <div class="gate-info">
              <h2 class="gate-title">{{ $t('联机共修') }}</h2>
              <p class="gate-desc">{{ backendReady ? $t('道友相伴 · 共证大道') : $t('仙门未启 · 暂不可入') }}</p>
              <p class="gate-detail">{{ $t('云端存档，多端同步，与道友共闯仙途') }}</p>
              <div class="gate-tags">
                <span class="tag-cloud">{{ $t('云端同步') }}</span>
                <span class="tag-secure">{{ $t('数据安全') }}</span>
              </div>
            </div>
            <div v-if="selectedMode === 'cloud'" class="check-mark">
              <Check :size="18" />
            </div>
            <div v-if="!backendReady" class="disabled-mask">
              <Lock :size="20" />
              <span>{{ $t('未启用') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="actions-section">
        <transition name="fade-up">
          <div v-if="selectedMode" class="action-group">
            <button class="btn-primary" @click="startNewGame">
              <Sparkles :size="18" />
              <span>{{ $t('初入仙途') }}</span>
            </button>
            <button class="btn-secondary" @click="enterCharacterSelection">
              <History :size="18" />
              <span>{{ $t('续前世因缘') }}</span>
            </button>
          </div>
        </transition>
        <button v-if="!selectedMode" class="btn-ghost" @click="enterCharacterSelection">
          <History :size="18" />
          <span>{{ $t('续前世因缘') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from '@/i18n';
import VideoBackground from '@/components/common/VideoBackground.vue';
import { Sparkles, History, User, Users, Check, Lock } from 'lucide-vue-next';
import { useUIStore } from '@/stores/uiStore';
import { isBackendConfigured, fetchBackendVersion } from '@/services/backendConfig';
import { verifyStoredToken } from '@/services/request';

const selectedMode = ref<'single' | 'cloud' | null>(null);
const backendReady = ref(false);
const backendVersion = ref<string | null>(null);

const { t } = useI18n();

const displayVersion = computed(() => (
  backendReady.value ? (backendVersion.value ?? t('同步中')) : APP_VERSION
));

onMounted(async () => {
  // 真正检测后端连接状态，而不是只检查配置
  if (isBackendConfigured()) {
    const version = await fetchBackendVersion();
    if (version) {
      backendReady.value = true;
      backendVersion.value = version;
    }
  }
});

const emit = defineEmits<{
  (e: 'start-creation', mode: 'single' | 'cloud'): void;
  (e: 'show-character-list'): void;
  (e: 'go-to-login'): void;
}>();

const uiStore = useUIStore();

// 检查是否已登录
const _isLoggedIn = () => {
  const token = localStorage.getItem('access_token');
  return !!token;
};

const selectPath = async (mode: 'single' | 'cloud') => {
  if (mode === 'cloud' && !backendReady.value) {
    uiStore.showRetryDialog({
      title: t('联机未启用'),
      message: t('未配置后端服务器，无法使用联机共修与登录功能。请先选择"单机闯关"。'),
      confirmText: t('知道了'),
      cancelText: t('取消'),
      onConfirm: () => {},
      onCancel: () => {}
    });
    return;
  }

  // 联机模式：验证 token 有效性
  if (mode === 'cloud') {
    const token = localStorage.getItem('access_token');
    if (token) {
      const isValid = await verifyStoredToken();
      if (!isValid) {
        // token 无效，清除并提示重新登录
        localStorage.removeItem('access_token');
        localStorage.removeItem('username');
        console.log('[ModeSelection] Token 无效，已清除');
      }
    }
  }

  if (selectedMode.value === mode) {
    selectedMode.value = null;
  } else {
    selectedMode.value = mode;
  }
};

const startNewGame = async () => {
  if (!selectedMode.value) return;

  // 联机模式需要先登录并验证 token 有效性
  if (selectedMode.value === 'cloud') {
    const isValid = await verifyStoredToken();
    if (!isValid) {
      uiStore.showRetryDialog({
        title: t('请先登录'),
        message: t('联机共修需要先登录账号，是否前往登录？'),
        confirmText: t('前往登录'),
        cancelText: t('取消'),
        onConfirm: () => {
          emit('go-to-login');
        },
        onCancel: () => {}
      });
      return;
    }
  }

  emit('start-creation', selectedMode.value);
};

const enterCharacterSelection = async () => {
  emit('show-character-list');
};
</script>

<style scoped>
  .header-title{
  background: linear-gradient(135deg, #60a5fa 0%, #818cf8 50%, #a78bfa 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 8px rgba(96, 165, 250, 0.6)) drop-shadow(0 0 12px rgba(129, 140, 248, 0.4));
  animation: glow-pulse 3s ease-in-out infinite;
  }

@keyframes glow-pulse {
  0%, 100% {
    filter: drop-shadow(0 0 8px rgba(96, 165, 250, 0.6)) drop-shadow(0 0 12px rgba(129, 140, 248, 0.4));
  }
  50% {
    filter: drop-shadow(0 0 12px rgba(96, 165, 250, 0.8)) drop-shadow(0 0 18px rgba(129, 140, 248, 0.5));
  }
}
/* 容器 - 可滚动 */
.mode-selection-container {
  width: 100%;
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  padding-top: calc(2rem + env(safe-area-inset-top));
  padding-bottom: calc(2rem + env(safe-area-inset-bottom));
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

/* 主内容区 */
.selection-content {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.88) 0%, rgba(30, 41, 59, 0.85) 100%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 2.5rem 3rem;
  border: 1px solid rgba(147, 197, 253, 0.12);
  box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.5);
  max-width: 820px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  position: relative;
  max-height: none;
  overflow: visible;
}

/* 版本号 - 青蓝色发光 */
.version-tag {
  font-size: 0.75rem;
  font-weight: 600;
  color: #67e8f9;
  padding: 0.25rem 0.6rem;
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.12) 0%, rgba(56, 189, 248, 0.08) 100%);
  border: 1px solid rgba(34, 211, 238, 0.35);
  border-radius: 6px;
  text-shadow: 0 0 8px rgba(34, 211, 238, 0.5);
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.15);
  transition: all 0.3s ease;
}

.version-tag:hover {
  color: #a5f3fc;
  border-color: rgba(34, 211, 238, 0.5);
  box-shadow: 0 0 16px rgba(34, 211, 238, 0.25);
  text-shadow: 0 0 12px rgba(34, 211, 238, 0.7);
}

/* 右上角信息 */
.top-info {
  position: absolute;
  top: 1.25rem;
  right: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* 状态指示器 */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
}

.status-indicator.online {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ade80;
}

.status-indicator.offline {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.25);
  color: #fca5a5;
}

.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

/* 标题区域 */
.header-section {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.main-title {
  font-family: var(--font-family-serif);
  font-size: 3.5rem;
  font-weight: 400;
  letter-spacing: 0.5em;
  color: #f8fafc;
  margin: 0;
  text-shadow: 0 0 40px rgba(147, 197, 253, 0.3);
}

.sub-title {
  padding: 0.5rem;
  font-size: 1.1rem;
  color: #94a3b8;
  letter-spacing: 0.15em;
  margin: 0;
}

/* 道途选择 */
.paths-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.section-header .line {
  width: 60px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(147, 197, 253, 0.4), transparent);
}

.section-header .text {
  padding: 0.5rem;
  font-family: var(--font-family-serif);
  font-size: 1rem;
  color: #64748b;
  letter-spacing: 0.2em;
}

/* 卡片容器 */
.gate-container {
  padding: 0.5rem;
  display: flex;
  gap: 1.5rem;
}

/* 卡片 */
.gate-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.75rem 1.75rem;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
  min-height: 120px;
}

.gate-card:hover {
  background: rgba(30, 41, 59, 0.7);
  border-color: rgba(147, 197, 253, 0.2);
  transform: translateY(-2px);
}

.gate-card.selected {
  background: rgba(30, 58, 138, 0.4);
  border-color: rgba(147, 197, 253, 0.35);
}

.gate-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.gate-card.disabled:hover {
  transform: none;
  background: rgba(30, 41, 59, 0.5);
  border-color: rgba(255, 255, 255, 0.06);
}

/* 卡片图标 */
.gate-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #93c5fd;
  flex-shrink: 0;
  position: relative;
  width: 72px;
  height: 72px;
}

.icon-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(147, 197, 253, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
  border: 1px solid rgba(147, 197, 253, 0.15);
  border-radius: 16px;
}

.gate-icon svg {
  position: relative;
  z-index: 1;
}

.gate-card:hover .gate-icon,
.gate-card.selected .gate-icon {
  color: #bfdbfe;
}

.gate-card:hover .icon-bg,
.gate-card.selected .icon-bg {
  background: linear-gradient(135deg, rgba(147, 197, 253, 0.15) 0%, rgba(59, 130, 246, 0.08) 100%);
  border-color: rgba(147, 197, 253, 0.25);
}

/* 卡片信息 */
.gate-info {
  flex: 1;
  min-width: 0;
}

.gate-title {
  font-family: var(--font-family-serif);
  font-size: 1.35rem;
  font-weight: 400;
  margin: 0 0 0.35rem 0;
  color: #f1f5f9;
  letter-spacing: 0.1em;
}

.gate-desc {
  font-size: 0.9rem;
  color: #94a3b8;
  margin: 0 0 0.4rem 0;
}

.gate-detail {
  font-size: 0.8rem;
  color: #64748b;
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
}

.gate-tags {
  display: flex;
  gap: 0.6rem;
}

.gate-tags span {
  font-size: 0.75rem;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
}

/* 本地存储 - 琥珀色 */
.tag-local {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.25);
}

/* 离线可用 - 青色 */
.tag-offline {
  color: #22d3d1;
  background: rgba(34, 211, 209, 0.1);
  border: 1px solid rgba(34, 211, 209, 0.25);
}

/* 云端同步 - 蓝色 */
.tag-cloud {
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.12);
  border: 1px solid rgba(96, 165, 250, 0.25);
}

/* 数据安全 - 绿色 */
.tag-secure {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.25);
}

/* 选中标记 */
.check-mark {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4ade80;
}

/* 禁用遮罩 */
.disabled-mask {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(2px);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  color: #94a3b8;
  font-size: 0.8rem;
}

/* 操作按钮区域 */
.actions-section {
  display: flex;
  justify-content: center;
  min-height: 52px;
  padding-bottom: 0.5rem;
}

.action-group {
  display: flex;
  gap: 1rem;
}

/* 按钮基础 */
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  font-family: var(--font-family-serif);
  font-size: 1rem;
  letter-spacing: 0.08em;
  padding: 0.85rem 1.75rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover {
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
}

.btn-secondary {
  background: rgba(51, 65, 85, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}

.btn-secondary:hover {
  background: rgba(51, 65, 85, 0.8);
  border-color: rgba(147, 197, 253, 0.2);
}

.btn-ghost {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
}

.btn-ghost:hover {
  background: rgba(51, 65, 85, 0.4);
  color: #e2e8f0;
}

/* 过渡动画 */
.fade-up-enter-active,
.fade-up-leave-active {
  transition: all 0.3s ease;
}

.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* 亮色主题 */
[data-theme="light"] .selection-content {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.92) 100%);
  border-color: rgba(59, 130, 246, 0.15);
  box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.12);
}

[data-theme="light"] .main-title {
  color: #1e293b;
  text-shadow: none;
}

[data-theme="light"] .sub-title {
  color: #64748b;
}

[data-theme="light"] .gate-card {
  background: rgba(248, 250, 252, 0.8);
  border-color: rgba(0, 0, 0, 0.06);
}

[data-theme="light"] .gate-card:hover,
[data-theme="light"] .gate-card.selected {
  background: rgba(239, 246, 255, 0.9);
}

[data-theme="light"] .gate-title {
  color: #1e293b;
}

[data-theme="light"] .gate-icon {
  color: #3b82f6;
}

[data-theme="light"] .icon-bg {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.04) 100%);
  border-color: rgba(59, 130, 246, 0.15);
}

[data-theme="light"] .gate-detail {
  color: #94a3b8;
}

[data-theme="light"] .btn-secondary {
  background: rgba(248, 250, 252, 0.9);
  border-color: rgba(0, 0, 0, 0.08);
  color: #475569;
}

[data-theme="light"] .btn-ghost {
  color: #64748b;
  border-color: rgba(0, 0, 0, 0.08);
}

[data-theme="light"] .version-tag {
  color: #0891b2;
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(56, 189, 248, 0.1) 100%);
  border-color: rgba(34, 211, 238, 0.35);
  text-shadow: none;
  box-shadow: 0 0 8px rgba(34, 211, 238, 0.1);
}

/* 响应式 */
@media (max-width: 768px) {
  .mode-selection-container {
    padding: 0.75rem;
    align-items: flex-start;
    padding-top: calc(0.75rem + env(safe-area-inset-top));
    padding-left: calc(0.75rem + env(safe-area-inset-left));
    padding-right: calc(0.75rem + env(safe-area-inset-right));
    min-height: 100vh;
    min-height: 100svh;
  }

  .selection-content {
    padding: 3.5rem 1rem 1.5rem;
    gap: 1.25rem;
    max-height: none;
    min-height: auto;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }

  .top-info {
    position: static;
    display: flex;
    justify-content: center;
    margin-bottom: 0.5rem;
    gap: 0.5rem;
  }

  .header-section {
    padding-top: 0;
  }

  .main-title {
    font-size: 2.75rem;
    letter-spacing: 0.2em;
    margin-right: -0.2em;
  }

  .sub-title {
    font-size: 0.85rem;
    letter-spacing: 0.06em;
  }

  .gate-container {
    flex-direction: column;
    padding: 0;
  }

  .gate-card {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 0.75rem 0.75rem;
    min-height: auto;
    gap: 0.5rem;
  }

  .gate-icon {
    width: 40px;
    height: 40px;
  }

  .gate-icon svg {
    width: 20px;
    height: 20px;
  }

  .gate-info {
    width: 100%;
  }

  .gate-title {
    font-size: 1rem;
    margin-bottom: 0.15rem;
  }

  .gate-desc {
    font-size: 0.75rem;
    margin-bottom: 0.25rem;
  }

  .gate-detail {
    display: none;
  }

  .gate-tags {
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .gate-tags span {
    white-space: nowrap;
    font-size: 0.65rem;
    padding: 0.15rem 0.4rem;
  }

  .section-header .line {
    width: 30px;
  }

  .section-header .text {
    font-size: 0.8rem;
    letter-spacing: 0.1em;
  }

  .action-group {
    flex-direction: column;
    width: 100%;
    gap: 0.5rem;
  }

  button {
    width: 100%;
    min-height: 38px;
    font-size: 0.85rem;
    padding: 0.5rem 0.75rem;
  }
}

@media (max-width: 480px) {
  .mode-selection-container {
    padding: 0.5rem;
    padding-top: calc(0.5rem + env(safe-area-inset-top));
    padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
  }

  .selection-content {
    padding: 1rem 0.75rem;
    gap: 1rem;
    max-height: none;
    width: 100%;
  }

  .top-info {
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
  }

  .main-title {
    font-size: 2.5rem;
    letter-spacing: 0.15em;
    margin-right: -0.15em;
  }

  .sub-title {
    font-size: 0.8rem;
  }

  .gate-card {
    padding: 0.6rem;
    gap: 0.4rem;
  }

  .gate-title {
    font-size: 0.95rem;
  }

  .gate-desc {
    font-size: 0.7rem;
  }

  button {
    padding: 0.45rem 0.6rem;
    font-size: 0.8rem;
    min-height: 36px;
  }

  .version-tag,
  .status-indicator {
    font-size: 0.65rem;
    padding: 0.15rem 0.4rem;
  }
}
</style>
