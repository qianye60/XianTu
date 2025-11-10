<!-- src/views/ModeSelection.vue -->
<template>
  <div class="mode-selection-container">
    <VideoBackground />

    <div class="selection-content">
      <div class="header-container">
        <div class="title-version-row">
          <h1 class="main-title">大 道 朝 天</h1>
          <span class="version-tag">V3.1.5 {{ $t('正式版') }}</span><!--{{ appVersion }}-->
        </div>
        <p class="sub-title">{{ $t('仙路漫漫 · 逆行九天') }}</p>
      </div>

      <div class="gate-container">
        <!-- Left Gate: Single Player -->
        <div
          class="gate-card left-gate"
          :class="{ selected: selectedMode === 'single' }"
          @click="selectPath('single')"
        >
          <div class="gate-icon">
            <!-- Icon: 独修闭关 -->
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/>
              <path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/>
              <path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>
            </svg>
          </div>
          <div class="gate-text">
            <h2 class="gate-title">{{ $t('单机闭关') }}</h2>
            <p class="gate-description">{{ $t('避世清修·心无旁骛') }}</p>
            <p class="gate-detail">{{ $t('独居洞府，专心致志炼就大道根基') }}<br/>{{ $t('所有进度本地存储，断网亦可修行') }}</p>
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
            <h2 class="gate-title">{{ $t('联机共修') }}（{{ $t('未开放') }}）</h2>
            <p class="gate-description">{{ $t('功能研发中，敬请期待') }}</p>
            <p class="gate-detail">{{ $t('当前版本已封锁联机入口，不影响单机闭关体验') }}</p>
          </div>
        </div>
      </div>

      <!-- 隐私说明 -->
      <div class="privacy-notice">
        <p>{{ $t('本联机谨遵天道法则：不存储任何对话记录') }}</p>
        <p>{{ $t('仅保留法身属性、境界进度等修行要素，确保道友隐私清净无染') }}</p>
      </div>

      <div class="footer-actions">
        <!-- 新的开始游戏按钮容器 -->
        <div v-if="selectedMode" class="start-actions-container">
          <button class="action-btn primary" @click="startNewGame">
            <Sparkles :size="20" />
            <span>{{ $t('初入仙途') }}</span>
          </button>
          <button class="action-btn" @click="enterCharacterSelection">
            <History :size="20" />
            <span>{{ $t('续前世因缘') }}</span>
          </button>
        </div>
        <!-- 之前的按钮，现在只在未选择模式时显示 -->
        <button v-else class="scroll-btn" @click="enterCharacterSelection">
          <span>{{ $t('续前世因缘') }}</span>
        </button>
      </div>
    </div>

    <!-- 右下角授权状态 -->
    <div class="auth-status-badge" v-if="AUTH_CONFIG.ENABLE_AUTH">
      <div class="auth-status-content" @click="handleAuthClick">
        <span v-if="isAuthorized" class="status-icon verified">✓</span>
        <span v-else class="status-icon unverified">✗</span>
        <span class="status-text">{{ isAuthorized ? $t('已授权') : $t('未授权') }}</span>
      </div>
    </div>

    <!-- 右下角设置按钮 -->
    <button class="floating-settings-btn" @click="showSettings = true" :title="$t('设置')">
      <Settings :size="24" />
    </button>

    <!-- 授权验证弹窗 -->
    <AuthVerificationModal
      v-if="AUTH_CONFIG.ENABLE_AUTH"
      v-model:visible="showAuthModal"
      :server-url="AUTH_CONFIG.SERVER_URL"
      @verified="handleAuthVerified"
      @cancel="handleAuthCancel"
    />

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
import { ref, onMounted, computed } from 'vue';
import VideoBackground from '@/components/common/VideoBackground.vue';
import SettingsPanel from '@/components/dashboard/SettingsPanel.vue';
import AuthVerificationModal from '@/components/common/AuthVerificationModal.vue';
import { Settings, X, Sparkles, History } from 'lucide-vue-next';
import { useUIStore } from '@/stores/uiStore';
import { AUTH_CONFIG } from '@/config/authConfig';
import { toast } from '@/utils/toast';
import { generateMachineCode } from '@/utils/machineCode';

const showSettings = ref(false);
const showAuthModal = ref(false);
const selectedMode = ref<'single' | 'cloud' | null>(null);

// 使用 ref 而不是 computed，以便手动更新
const isAuthorized = ref(localStorage.getItem('auth_verified') === 'true');

// 检查授权状态的函数
const checkAuthStatus = () => {
  isAuthorized.value = localStorage.getItem('auth_verified') === 'true';
};

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

  // 检查授权状态
  checkAuthStatus();

  // 🔴 每次刷新页面都验证一次（无论本地是否已授权）
  if (AUTH_CONFIG.ENABLE_AUTH) {
    console.log('[ModeSelection] 页面刷新，开始自动验证');

    // 先尝试自动验证（使用机器码）
    (async () => {
      try {
        // 生成或获取机器码
        let machineCode = localStorage.getItem('auth_machine_code');
        if (!machineCode) {
          machineCode = await generateMachineCode();
          localStorage.setItem('auth_machine_code', machineCode);
        }

        console.log('[ModeSelection] 使用机器码自动验证:', machineCode);

        // 尝试自动验证
        const response = await fetch(`${AUTH_CONFIG.SERVER_URL}/server.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'check',
            app_id: AUTH_CONFIG.APP_ID,
            machine_code: machineCode
          })
        });

        if (!response.ok) {
          console.warn('[ModeSelection] 服务器错误，清除本地授权');
          // 服务器错误，清除本地授权
          localStorage.removeItem('auth_verified');
          localStorage.removeItem('auth_app_id');
          localStorage.removeItem('auth_machine_code');
          localStorage.removeItem('auth_expires_at');
          checkAuthStatus();

          // 弹出手动验证窗口
          setTimeout(() => {
            showAuthModal.value = true;
            toast.warning('授权验证失败，请重新验证');
          }, 500);
          return;
        }

        const result = await response.json();

        if (result.success && result.data?.authorized) {
          // ✅ 自动验证成功，静默通过
          console.log('[ModeSelection] 自动验证成功');
          localStorage.setItem('auth_verified', 'true');
          localStorage.setItem('auth_app_id', AUTH_CONFIG.APP_ID);
          localStorage.setItem('auth_machine_code', machineCode);
          localStorage.setItem('auth_expires_at', result.data.expires_at || '');
          checkAuthStatus();
          // 不显示成功提示，静默通过
        } else {
          // ❌ 自动验证失败，清除本地授权，弹窗
          console.warn('[ModeSelection] 自动验证失败，授权无效');
          localStorage.removeItem('auth_verified');
          localStorage.removeItem('auth_app_id');
          localStorage.removeItem('auth_machine_code');
          localStorage.removeItem('auth_expires_at');
          checkAuthStatus();

          setTimeout(() => {
            showAuthModal.value = true;
            toast.warning('授权验证失败，请输入兑换码');
          }, 500);
        }
      } catch (error) {
        console.warn('[ModeSelection] 网络错误，清除本地授权:', error);
        // 网络错误，清除本地授权
        localStorage.removeItem('auth_verified');
        localStorage.removeItem('auth_app_id');
        localStorage.removeItem('auth_machine_code');
        localStorage.removeItem('auth_expires_at');
        checkAuthStatus();

        setTimeout(() => {
          showAuthModal.value = true;
          toast.error('网络错误，请检查连接后重试');
        }, 500);
      }
    })();
  }
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

  // 如果重复点击，则取消选择
  if (selectedMode.value === mode) {
    selectedMode.value = null;
  } else {
    selectedMode.value = mode;
  }
};

const startNewGame = () => {
  // 如果启用授权验证且本地未授权，提示用户验证
  if (AUTH_CONFIG.ENABLE_AUTH && !isAuthorized.value) {
    showAuthModal.value = true;
    toast.warning('请先完成授权验证');
    return;
  }

  if (selectedMode.value) {
    emit('start-creation', selectedMode.value);
  }
};

const enterCharacterSelection = async () => {
  // 如果启用授权验证且本地未授权，提示用户验证
  if (AUTH_CONFIG.ENABLE_AUTH && !isAuthorized.value) {
    showAuthModal.value = true;
    toast.warning('请先完成授权验证');
    return;
  }

  emit('show-character-list');
};

// 授权状态点击处理
const handleAuthClick = () => {
  if (isAuthorized.value) {
    // 已授权，显示授权信息
    const appId = localStorage.getItem('auth_app_id') || '未知';
    const expiresAt = localStorage.getItem('auth_expires_at') || '未知';
    uiStore.showRetryDialog({
      title: '授权信息',
      message: `应用ID: ${appId}\n过期时间: ${expiresAt}\n\n点击"解绑授权"将从服务器删除授权记录`,
      confirmText: '解绑授权',
      cancelText: '关闭',
      onConfirm: async () => {
        try {
          // 调用服务器解绑接口
          const machineCode = localStorage.getItem('auth_machine_code');
          if (!machineCode) {
            toast.error('未找到机器码');
            return;
          }
          const response = await fetch(`${AUTH_CONFIG.SERVER_URL}/server.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'unbind',
              app_id: AUTH_CONFIG.APP_ID,
              machine_code: machineCode
            })
          });

          const result = await response.json();

          if (result.success) {
            // 服务器解绑成功，清除本地状态
            localStorage.removeItem('auth_verified');
            localStorage.removeItem('auth_app_id');
            localStorage.removeItem('auth_machine_code');
            localStorage.removeItem('auth_expires_at');
            toast.success('授权已解绑');
            checkAuthStatus();
          } else {
            // 如果服务器找不到授权记录，也清除本地缓存
            if (result.message && result.message.includes('No matching authorization')) {
              localStorage.removeItem('auth_verified');
              localStorage.removeItem('auth_app_id');
              localStorage.removeItem('auth_machine_code');
              localStorage.removeItem('auth_expires_at');
              toast.info('本地授权状态已清除（服务器无记录）');
              checkAuthStatus();
            } else {
              toast.error(`解绑失败: ${result.message}`);
            }
          }
        } catch (error) {
          console.error('[解绑授权] 请求失败', error);
          toast.error('解绑失败，请检查网络连接');
        }
      },
      onCancel: () => {}
    });
  } else {
    // 未授权，打开验证窗口
    showAuthModal.value = true;
  }
};

// 授权验证成功
const handleAuthVerified = async (data: any) => {
  console.log('[授权验证] 兑换成功', data);
  checkAuthStatus();
  toast.success('授权验证成功！');
  showAuthModal.value = false;
};

// 授权验证取消
const handleAuthCancel = () => {
  console.log('[授权验证] 用户取消验证');
  showAuthModal.value = false;
};
</script>

<style scoped>
.mode-selection-container {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
  background: transparent;
  overflow: hidden;
}

.selection-content {
  background: var(--color-surface-transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 20px;
  padding: 1.5rem;
  border: 1px solid var(--color-border);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  max-height: 95vh;
  max-width: 1000px;
  width: 90%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}


.header-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  flex-shrink: 0;
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

.gate-card.selected {
  transform: translateY(-10px) scale(1.03);
  border-color: var(--color-accent);
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.25), 0 0 25px rgba(var(--color-accent-rgb), 0.4);
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
  width: 100%;
}

.start-actions-container {
  display: flex;
  gap: 1rem;
  justify-content: center;
  animation: fadeIn 0.5s ease-out;
  width: 100%;
  max-width: 500px; /* 限制最大宽度 */
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.action-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: var(--color-surface-transparent);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-family: var(--font-family-serif);
  font-size: 1rem;
  letter-spacing: 0.1em;
  padding: 0.8rem 1.5rem;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.action-btn:hover {
  background: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-primary);
  box-shadow: 0 0 15px rgba(var(--color-primary-rgb), 0.3);
  transform: translateY(-2px);
}

.action-btn.primary {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.4);
}

.action-btn.primary:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  color: var(--color-text-on-primary);
  box-shadow: 0 0 25px rgba(var(--color-primary-rgb), 0.6);
}


@media (max-width: 640px) {
  .footer-actions {
    margin-top: 1rem; /* 统一间距 */
  }

  .start-actions-container {
    flex-direction: column;
    width: 100%;
    max-width: 350px;
  }

  .action-btn {
    font-size: 0.95rem;
    padding: 0.9rem 1.5rem;
    letter-spacing: 0.2em;
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
    gap: 1rem; /* 减少元素间距 */
  }

  /* 移动端也隐藏滚动条 */
  .selection-content::-webkit-scrollbar {
    display: none;
  }

  .main-title {
    font-size: 2.5rem;
  }

  .header-container {
    margin-bottom: 1rem; /* 减少间距 */
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
    gap: 1rem; /* 减少间距 */
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
    margin-top: 1rem; /* 减少间距 */
    padding: 1rem;
    max-width: 100%;
    flex-shrink: 0;
  }

  .privacy-notice p {
    font-size: 0.85rem;
  }

  .scroll-btn {
    margin-top: 1rem; /* 减少间距 */
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
  padding: 0.6rem 1rem;
  background: var(--color-surface-transparent);
  backdrop-filter: blur(10px);
  border: 1px solid var(--color-border);
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.auth-status-content:hover {
  background: var(--color-surface);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.status-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
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
  font-size: 0.875rem;
  color: var(--color-text);
  font-weight: 500;
}

@media (max-width: 768px) {
  .auth-status-badge {
    bottom: 16px;
    left: 16px;
  }

  .auth-status-content {
    padding: 0.5rem 0.8rem;
  }

  .status-text {
    font-size: 0.8rem;
  }
}
</style>
