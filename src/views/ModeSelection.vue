<!-- src/views/ModeSelection.vue -->
<template>
  <div class="mode-selection-container">
    <VideoBackground />

    <div class="selection-content">
      <div class="header-container">
        <div class="title-version-row">
          <h1 class="main-title">大 道 朝 天</h1>
          <span class="version-tag">V2.7.2 正式版</span><!--{{ appVersion }}-->
        </div>
        <p class="sub-title">仙路求索 · 万道归天</p>
      </div>

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

        <!-- Right Gate: Multiplayer (temporarily disabled) -->
        <div class="gate-card right-gate disabled" @click="selectPath('cloud')">
          <div class="gate-icon">
            <!-- Icon: 联机共修 -->
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="gate-text">
            <h2 class="gate-title">联机共修（未开放）</h2>
            <p class="gate-description">功能研发中，敬请期待</p>
            <p class="gate-detail">当前版本已封锁联机入口，不影响单机闭关体验</p>
          </div>
        </div>
      </div>

      <!-- 隐私说明 -->
      <div class="privacy-notice">
        <p>本联机谨遵天道法则：<strong>不存储任何对话记录</strong></p>
        <p>仅保留法身属性、境界进度等修行要素，确保道友隐私清净无染</p>
      </div>

      <div class="footer-actions">
        <button class="scroll-btn" @click="enterCharacterSelection">
          <span>续 前 世 因 缘</span>
        </button>
      </div>
    </div>

    <!-- 右下角设置按钮 -->
    <button class="floating-settings-btn" @click="showSettings = true" title="设置">
      <Settings :size="24" />
    </button>

    <!-- 设置模态框 -->
    <div v-if="showSettings" class="settings-modal-overlay" @click="showSettings = false">
      <div class="settings-modal-content" @click.stop>
        <div class="modal-header">
          <h3>游戏设置</h3>
          <button class="close-btn" @click="showSettings = false">
            <X :size="20" />
          </button>
        </div>
        <div class="modal-body">
          <SettingsPanel />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import VideoBackground from '@/components/common/VideoBackground.vue';
import SettingsPanel from '@/components/dashboard/SettingsPanel.vue';
import { Settings, X } from 'lucide-vue-next';
import { useUIStore } from '@/stores/uiStore';

const showSettings = ref(false);

// 后端API服务器地址
const API_BASE_URL = 'http://127.0.0.1:12345';

const appVersion = ref('...');

onMounted(async () => {
  // try {
  //   const response = await fetch(`${API_BASE_URL}/api/v1/version`);
  //   if (response.ok) {
  //     const data = await response.json();
  //     appVersion.value = `V${data.version}`;
  //   } else {
  //     appVersion.value = 'V_.__._';
  //   }
  // } catch (error) {
  //   console.error('Failed to fetch app version:', error);
  //   appVersion.value = 'N/A';
  // }
});

const emit = defineEmits<{
  (e: 'start-creation', mode: 'single' | 'cloud'): void;
  (e: 'show-character-list'): void;
}>();

const uiStore = useUIStore();
const selectPath = (mode: 'single' | 'cloud') => {

  // 全局封锁联机模式
  if (mode === 'cloud') {
    uiStore.showRetryDialog({
      title: '功能未开放',
      message: '联机共修开发中，当前版本已封锁入口。请先选择“单机闭关”。',
      confirmText: '知道了',
      cancelText: '取消',
      onConfirm: () => {},
      onCancel: () => {}
    });
    return;
  }

  emit('start-creation', mode);
};

const enterCharacterSelection = () => {
  emit('show-character-list');
};
</script>

<style scoped>
.mode-selection-container {
  width: 100%;
  height: auto;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  box-sizing: border-box;
  background: transparent;
  overflow: hidden; /* 移除滚动 */
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
  /* 调整到合适高度，确保内容完全可见 */
  height: auto;
  max-height: 90vh;
  max-width: 1000px;
  width: 90%;
  overflow-y: auto;  /* 允许内部滚动 */
  overflow-x: hidden;
  /* 隐藏滚动条但保持滚动功能 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* 隐藏Webkit浏览器的滚动条 */
.selection-content::-webkit-scrollbar {
  display: none;
}


.header-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-bottom: 1.5rem; /* 减少底部间距 */
}

.title-version-row {
  position: relative;
  display: flex;
  justify-content: center; /* Center the title */
  align-items: center;
  width: 100%;
  margin-bottom: 0.5rem; /* Space between title row and subtitle */
}

.version-tag {
  position: absolute;
  right: 0;
  top: 0; /* Align to the top of the container */
  font-size: 0.8rem; /* Adjusted size */
  font-family: 'Consolas', 'monospace';
  color: var(--color-warning);
  padding: 0.2rem 0.6rem;
  background: rgba(var(--color-warning-rgb, 255, 193, 7), 0.1);
  border: 1px solid rgba(var(--color-warning-rgb, 255, 193, 7), 0.4);
  border-radius: 4px;
  opacity: 0.85;
  font-weight: bold;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.main-title {
  font-family: var(--font-family-serif);
  font-size: 3.5rem;
  font-weight: 500;
  letter-spacing: 0.5em;
  color: var(--color-text);
  text-shadow: 0 0 25px rgba(var(--color-primary-rgb), 0.5);
  margin: 0;
  text-align: center;
  /* Add padding to compensate for letter-spacing and ensure true centering */
  padding-left: 0.5em;
}

.sub-title {
  font-size: 1.2rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.1em;
  opacity: 0.9;
  margin: 0;
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

.gate-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.gate-icon {
  display: flex;
  justify-content: center;
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
  margin-top: 1rem; /* 减少顶部间距 */
  padding: 0.8rem; /* 减少内边距 */
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
  margin-top: 1rem; /* 减少顶部间距 */
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
  /* Prevent squishing and keep text on one line */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  white-space: nowrap;
  flex: 0 0 auto;
  max-width: 100%;
}

.scroll-btn:hover {
  background: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-primary);
  box-shadow: 0 0 15px rgba(var(--color-primary-rgb), 0.3);
}

.footer-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem; /* 减少顶部间距 */
}


@media (max-width: 640px) {
  .footer-actions {
    margin-top: 1.5rem;
  }
  .mode-selection-container {
    padding: 1rem;
    height: auto;
    min-height: 100%;
    align-items: center; /* 居中显示 */
    justify-content: center;
  }

  .selection-content {
    padding: 1.5rem;
    height: auto;
    max-height: 95vh;
    overflow-y: auto; /* 移动端允许滚动 */
    overflow-x: hidden;
    /* 隐藏滚动条但保持滚动功能 */
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
    gap: 1.5rem;
  }

  /* 移动端也隐藏滚动条 */
  .selection-content::-webkit-scrollbar {
    display: none;
  }

  .main-title {
    font-size: 2.5rem;
  }

  .header-container {
    margin-bottom: 2rem;
    flex-shrink: 0;
  }

  /* 移动端版本号移到底部 */
  .title-version-row {
    flex-direction: column;
    gap: 0.5rem;
  }

  .version-tag {
    position: static; /* 取消绝对定位 */
    align-self: center; /* 居中显示 */
    margin-top: 0.5rem;
  }

  .gate-container {
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    flex-shrink: 0;
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
    margin-top: 1.5rem;
    padding: 1rem;
    max-width: 100%;
    flex-shrink: 0;
  }

  .privacy-notice p {
    font-size: 0.85rem;
  }

  .scroll-btn {
    margin-top: 1.5rem;
    margin-bottom: 1rem;
    flex-shrink: 0;
    padding: 0.8rem 2rem;
    font-size: 0.95rem;
  }
}

/* 浮动设置按钮 */
.floating-settings-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-surface-transparent);
  backdrop-filter: blur(10px);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.floating-settings-btn:hover {
  background: var(--color-surface);
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.floating-settings-btn:active {
  transform: scale(0.95);
}

/* 设置模态框 */
.settings-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.settings-modal-content {
  background: var(--color-surface);
  border-radius: 16px;
  width: 100%;
  max-width: 800px;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .floating-settings-btn {
    bottom: 16px;
    right: 16px;
    width: 48px;
    height: 48px;
  }

  .settings-modal-content {
    max-width: 95vw;
    max-height: 90vh;
  }

  .modal-header {
    padding: 16px 20px;
  }
}

/* 超小屏幕优化（手机竖屏） */
@media (max-width: 480px) {
  .mode-selection-container {
    padding: 0.5rem;
  }

  .selection-content {
    padding: 1rem;
    border-radius: 15px;
    gap: 1rem;
  }

  .main-title {
    font-size: 2rem;
    letter-spacing: 0.3em;
    padding-left: 0.3em;
  }

  .header-container {
    margin-bottom: 1.5rem;
  }

  .version-tag {
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
  }

  .gate-container {
    gap: 1rem;
  }

  .gate-card {
    padding: 1.5rem 1rem;
  }

  .gate-title {
    font-size: 1.4rem;
  }

  .privacy-notice {
    margin-top: 1rem;
    padding: 0.8rem;
  }

  .scroll-btn {
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    padding: 0.7rem 1.5rem;
    font-size: 0.9rem;
  }
}
</style>
