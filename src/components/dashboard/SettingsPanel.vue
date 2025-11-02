<template>
  <div class="settings-panel">
    <!-- 头部 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="header-icon">⚙️</div>
        <div class="header-info">
          <h3 class="panel-title">{{ t('游戏设置') }}</h3>
          <span class="settings-subtitle">{{ t('自定义您的游戏体验') }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="resetSettings">
          <RotateCcw :size="16" />
          <span class="btn-text">{{ t('重置') }}</span>
        </button>
        <button class="action-btn primary" @click="saveSettings">
          <Save :size="16" />
          <span class="btn-text">{{ t('保存') }}</span>
        </button>
      </div>
    </div>

    <!-- 设置内容 -->
    <div class="settings-container">
      <!-- 显示设置 -->
      <div class="settings-section">
        <div class="section-header">
          <h4 class="section-title">🎨 {{ t('显示设置') }}</h4>
        </div>
        <div class="settings-list">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('语言设置') }}</label>
              <span class="setting-desc">{{ t('选择界面语言') }}</span>
            </div>
            <div class="setting-control">
              <select v-model="currentLanguage" class="setting-select" @change="onLanguageChange">
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('主题模式') }}</label>
              <span class="setting-desc">{{ t('选择明亮或暗黑主题') }}</span>
            </div>
            <div class="setting-control">
              <select v-model="settings.theme" class="setting-select" @change="onSettingChange">
                <option value="light">{{ t('明亮') }}</option>
                <option value="dark">{{ t('暗黑') }}</option>
                <option value="auto">{{ t('跟随系统') }}</option>
              </select>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('界面缩放') }}</label>
              <span class="setting-desc">{{ t('调整UI界面大小') }}</span>
            </div>
            <div class="setting-control">
              <div class="range-container">
                <input
                  type="range"
                  v-model.number="settings.uiScale"
                  min="80"
                  max="120"
                  step="5"
                  class="setting-range"
                  @input="applyUIScale"
                >
                <span class="range-value">{{ settings.uiScale }}%</span>
              </div>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('文字大小') }}</label>
              <span class="setting-desc">{{ t('调整游戏文字显示大小') }}</span>
            </div>
            <div class="setting-control">
              <select v-model="settings.fontSize" class="setting-select" @change="applyFontSize">
                <option value="small">{{ t('小') }}</option>
                <option value="medium">{{ t('中') }}</option>
                <option value="large">{{ t('大') }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- 游戏设置 -->
      <div class="settings-section">
        <div class="section-header">
          <h4 class="section-title">🎮 {{ t('游戏设置') }}</h4>
        </div>
        <div class="settings-list">

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('快速动画') }}</label>
              <span class="setting-desc">{{ t('加速界面动画和过渡效果') }}</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="settings.fastAnimations">
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('显示提示') }}</label>
              <span class="setting-desc">{{ t('显示操作提示和帮助信息') }}</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="settings.showHints">
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('行动选项') }}</label>
              <span class="setting-desc">{{ t('AI生成可选的行动建议') }}</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="uiStore.enableActionOptions">
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

        </div>
      </div>

      <!-- 游戏功能 -->
      <div class="settings-section">
        <div class="section-header">
          <h4 class="section-title">🎮 {{ t('游戏功能') }}</h4>
        </div>
        <div class="settings-list">
          <!-- 任务系统配置 -->
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('系统任务类型') }}</label>
              <span class="setting-desc">{{ t('选择AI生成任务的风格类型') }}</span>
            </div>
            <div class="setting-control">
              <select v-model="settings.questSystemType" class="setting-select">
                <option value="修仙辅助系统">{{ t('修仙辅助系统') }}</option>
                <option value="道侣养成系统">{{ t('道侣养成系统') }}</option>
                <option value="宗门发展系统">{{ t('宗门发展系统') }}</option>
                <option value="探索冒险系统">{{ t('探索冒险系统') }}</option>
                <option value="战斗挑战系统">{{ t('战斗挑战系统') }}</option>
                <option value="资源收集系统">{{ t('资源收集系统') }}</option>
              </select>
            </div>
          </div>

          <div class="setting-item setting-item-full">
            <div class="setting-info">
              <label class="setting-name">{{ t('自定义任务提示词') }}</label>
              <span class="setting-desc">{{ t('为AI任务生成添加自定义指令（可选，留空使用默认）') }}</span>
            </div>
            <div class="setting-control-full">
              <textarea
                v-model="settings.questSystemPrompt"
                class="setting-textarea"
                :placeholder="t('例如：生成更多战斗类任务，奖励偏向灵石...')"
                rows="3"
              ></textarea>
            </div>
          </div>

          <div class="setting-item setting-item-full">
            <div class="setting-info">
              <label class="setting-name">{{ t('自定义行动选项提示词') }}</label>
              <span class="setting-desc">{{ t('指导AI生成特定风格的行动选项（可选，留空使用默认）') }}</span>
            </div>
            <div class="setting-control-full">
              <textarea
                v-model="uiStore.actionOptionsPrompt"
                class="setting-textarea"
                :placeholder="t('例如：多生成修炼和探索类选项，减少战斗选项...')"
                rows="3"
              ></textarea>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('🔞 启用成人内容（私密信息）') }}</label>
              <span class="setting-desc">{{ t('生成和显示NPC的私密信息模块（包含成人向内容，默认开启）') }}</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="settings.enableNsfwMode">
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item" v-if="settings.enableNsfwMode">
            <div class="setting-info">
              <label class="setting-name">{{ t('👥 私密信息生成范围') }}</label>
              <span class="setting-desc">{{ t('选择为哪些性别的NPC生成私密信息') }}</span>
            </div>
            <div class="setting-control">
              <select v-model="settings.nsfwGenderFilter" class="setting-select">
                <option value="all">{{ t('所有NPC') }}</option>
                <option value="female">{{ t('仅女性') }}</option>
                <option value="male">{{ t('仅男性') }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- 高级设置 -->
      <div class="settings-section">
        <div class="section-header">
          <h4 class="section-title">{{ t('🔧 高级设置') }}</h4>
        </div>
        <div class="settings-list">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('调试模式') }}</label>
              <span class="setting-desc">{{ t('启用开发者调试信息和详细日志') }}</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="settings.debugMode" @change="onSettingChange">
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item" v-if="settings.debugMode">
            <div class="setting-info">
              <label class="setting-name">{{ t('控制台调试') }}</label>
              <span class="setting-desc">{{ t('在浏览器控制台显示详细调试信息') }}</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="settings.consoleDebug" @change="onSettingChange">
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item" v-if="settings.debugMode">
            <div class="setting-info">
              <label class="setting-name">{{ t('性能监控') }}</label>
              <span class="setting-desc">{{ t('监控组件性能和加载时间') }}</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="settings.performanceMonitor" @change="onSettingChange">
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('导入设置') }}</label>
              <span class="setting-desc">{{ t('从文件恢复设置配置') }}</span>
            </div>
            <div class="setting-control">
              <button class="utility-btn" @click="importSettings">
                <Upload :size="16" />
                {{ t('导入') }}
              </button>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('清理缓存') }}</label>
              <span class="setting-desc">{{ t('清除游戏临时数据和缓存') }}</span>
            </div>
            <div class="setting-control">
              <button class="utility-btn" @click="clearCache">
                <Trash2 :size="16" />
                {{ t('清理') }}
              </button>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('导出设置') }}</label>
              <span class="setting-desc">{{ t('备份当前设置配置') }}</span>
            </div>
            <div class="setting-control">
              <button class="utility-btn" @click="exportSettings">
                <Download :size="16" />
                {{ t('导出') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 授权验证弹窗（由开发者在配置文件中控制） -->
    <AuthVerificationModal
      v-model:visible="showAuthModal"
      :server-url="settings.authServerUrl"
      @verified="handleAuthVerified"
      @cancel="handleAuthCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue';
import { Save, RotateCcw, Trash2, Download, Upload } from 'lucide-vue-next';
import { toast } from '@/utils/toast';
import { debug } from '@/utils/debug';
import AuthVerificationModal from '@/components/common/AuthVerificationModal.vue';
import { useI18n } from '@/i18n';
import { AUTH_CONFIG } from '@/config/authConfig';

const { t, setLanguage, currentLanguage } = useI18n();

const onLanguageChange = () => {
  setLanguage(currentLanguage.value);
  toast.success('语言设置已更新');
};

// 设置数据结构
const settings = reactive({
  // 显示设置
  theme: 'auto',
  uiScale: 100,
  fontSize: 'medium',

  // 游戏设置
  fastAnimations: false,
  showHints: true,


  // 高级设置
  debugMode: false,
  consoleDebug: false,
  performanceMonitor: false,

  // 任务系统相关设置
  questSystemType: '修仙辅助系统', // 系统任务类型
  questSystemPrompt: '', // 自定义任务提示词

  enableNsfwMode: true, // 默认开启成人内容
  nsfwGenderFilter: 'all', // 默认所有NPC ('all' | 'female' | 'male')

  // 游戏体验
  enableSoundEffects: true,
  backgroundMusic: true,
  notificationSounds: true,

  // 数据同步
  autoSyncTavern: true,
  validateData: true,
  backupBeforeSave: true,

  // 授权验证设置（用户不可见）
  authServerUrl: 'http://38.55.124.252:12300', // 授权服务器地址
  authAppId: 'v28_8542ec92' // 默认应用ID
});

const loading = ref(false);
const hasUnsavedChanges = ref(false);

// 授权验证相关状态
const showAuthModal = ref(false);
const authStatus = computed(() => {
  const verified = localStorage.getItem('auth_verified') === 'true';
  const appId = localStorage.getItem('auth_app_id') || '';
  const expiresAt = localStorage.getItem('auth_expires_at') || '';
  return {
    verified,
    appId,
    expiresAt
  };
});

// 监听所有设置变化
watch(settings, () => {
  hasUnsavedChanges.value = true;
}, { deep: true });

// 监听调试模式变化
watch(() => settings.debugMode, (newValue) => {
  debug.setMode(newValue);
  debug.log('设置面板', `调试模式${newValue ? '已启用' : '已禁用'}`);
});

// 设置变更处理
const onSettingChange = () => {
  hasUnsavedChanges.value = true;
};

// 加载设置
const loadSettings = async () => {
  debug.timeStart('加载设置');
  try {
    // 先从localStorage加载设置
    const savedSettings = localStorage.getItem('dad_game_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      Object.assign(settings, parsed);
      debug.log('设置面板', '设置加载成功', parsed);
    } else {
      debug.log('设置面板', '使用默认设置');
    }

    // 🔥 从gameStateStore加载存档配置
    try {
      const { useGameStateStore } = await import('@/stores/gameStateStore');
      const gameStateStore = useGameStateStore();

      if (gameStateStore.isGameLoaded) {
        // 加载NSFW设置
        if (gameStateStore.systemConfig) {
          const 存档中的nsfwMode = gameStateStore.systemConfig.nsfwMode;
          const 存档中的nsfwGenderFilter = gameStateStore.systemConfig.nsfwGenderFilter;

          if (存档中的nsfwMode !== undefined) {
            settings.enableNsfwMode = 存档中的nsfwMode;
            debug.log('设置面板', `已从存档读取nsfwMode: ${存档中的nsfwMode}`);
          }

          if (存档中的nsfwGenderFilter !== undefined) {
            settings.nsfwGenderFilter = 存档中的nsfwGenderFilter;
            debug.log('设置面板', `已从存档读取nsfwGenderFilter: ${存档中的nsfwGenderFilter}`);
          }
        }

        // 加载任务系统配置
        if (gameStateStore.questSystem?.配置) {
          const questConfig = gameStateStore.questSystem.配置;
          settings.questSystemType = questConfig.系统任务类型;
          settings.questSystemPrompt = questConfig.系统任务提示词 || '';
          debug.log('设置面板', '已从存档读取任务系统配置', questConfig);
        }
      }
    } catch {
      // 如果还没有激活存档，这里会失败，不是问题
      debug.log('设置面板', '当前没有激活的存档，使用localStorage中的设置');
    }

  } catch (error) {
    debug.error('设置面板', '加载设置失败', error);
    toast.error('加载设置失败，将使用默认设置');
  } finally {
    debug.timeEnd('加载设置');
  }
};

// 保存设置
const saveSettings = async () => {
  if (loading.value) return;

  loading.value = true;
  debug.timeStart('保存设置');

  try {
    // 验证设置
    validateSettings();

    // 保存到localStorage
    localStorage.setItem('dad_game_settings', JSON.stringify(settings));
    debug.log('设置面板', '设置已保存到localStorage', settings);

    // 🔥 同步设置到存档
    try {
      const { useCharacterStore } = await import('@/stores/characterStore');
      const characterStore = useCharacterStore();
      const { useGameStateStore } = await import('@/stores/gameStateStore');
      const gameStateStore = useGameStateStore();

      // 更新存档中的系统设置
      if (gameStateStore.isGameLoaded) {
        // 同步NSFW设置
        if (gameStateStore.systemConfig) {
          gameStateStore.systemConfig.nsfwMode = settings.enableNsfwMode;
          gameStateStore.systemConfig.nsfwGenderFilter = settings.nsfwGenderFilter;
        }

        // 同步任务系统配置
        if (gameStateStore.questSystem?.配置) {
          gameStateStore.questSystem.配置.系统任务类型 = settings.questSystemType;
          gameStateStore.questSystem.配置.系统任务提示词 = settings.questSystemPrompt || '';
        }

        // 保存到数据库
        await characterStore.saveCurrentGame();

        debug.log('设置面板', '设置已同步到存档');
      } else {
        debug.warn('设置面板', '当前没有激活的存档，设置仅保存到localStorage');
      }
    } catch (error) {
      debug.error('设置面板', '同步设置到存档失败（非致命）', error);
      // 不抛出错误，允许保存继续
    }

    // 应用设置
    await applySettings();

    hasUnsavedChanges.value = false;
    toast.success('设置已保存并应用');

  } catch (error) {
    debug.error('设置面板', '保存设置失败', error);
    toast.error(`保存设置失败: ${error instanceof Error ? error.message : '未知错误'}`);
  } finally {
    loading.value = false;
    debug.timeEnd('保存设置');
  }
};

// 验证设置
const validateSettings = () => {
  debug.group('设置验证');
  
  try {
    // 验证UI缩放
    if (settings.uiScale < 50 || settings.uiScale > 200) {
      settings.uiScale = Math.max(50, Math.min(200, settings.uiScale));
      debug.warn('设置面板', `UI缩放值已修正为: ${settings.uiScale}%`);
    }
    
    
    debug.log('设置面板', '设置验证完成');
  } catch (error) {
    debug.error('设置面板', '设置验证失败', error);
    throw new Error('设置验证失败');
  } finally {
    debug.groupEnd();
  }
};

// 应用设置
const applySettings = async () => {
  debug.group('应用设置');
  
  try {
    // 应用主题
    applyTheme();
    
    // 应用UI缩放
    applyUIScale();
    
    // 应用字体大小
    applyFontSize();
    
    // 应用动画设置
    applyAnimationSettings();
    
    // 应用调试模式
    debug.setMode(settings.debugMode);
    
    debug.log('设置面板', '所有设置已应用');
  } catch (error) {
    debug.error('设置面板', '应用设置时出错', error);
    throw error;
  } finally {
    debug.groupEnd();
  }
};

// 应用主题
const applyTheme = () => {
  let targetTheme = settings.theme;
  
  if (settings.theme === 'auto') {
    targetTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  document.documentElement.setAttribute('data-theme', targetTheme);
  debug.log('设置面板', `主题已应用: ${targetTheme}`);
};

// 应用UI缩放
const applyUIScale = () => {
  const scaleValue = settings.uiScale / 100;
  document.documentElement.style.setProperty('--ui-scale', scaleValue.toString());
  debug.log('设置面板', `UI缩放已应用: ${settings.uiScale}%`);
};

// 应用字体大小
const applyFontSize = () => {
  const fontSizeMap: Record<string, string> = {
    small: '0.875rem',
    medium: '1rem',
    large: '1.125rem'
  };
  
  const fontSize = fontSizeMap[settings.fontSize] || '1rem';
  document.documentElement.style.setProperty('--base-font-size', fontSize);
  debug.log('设置面板', `字体大小已应用: ${settings.fontSize} (${fontSize})`);
};

// 应用动画设置
const applyAnimationSettings = () => {
  const animationSpeed = settings.fastAnimations ? '0.5' : '1';
  document.documentElement.style.setProperty('--animation-speed', animationSpeed);
  debug.log('设置面板', `动画速度已应用: ${animationSpeed}x`);
};

import { useUIStore } from '@/stores/uiStore';
const uiStore = useUIStore();
// 重置设置
const resetSettings = () => {
  uiStore.showRetryDialog({
    title: '重置设置',
    message: '确定要重置所有设置为默认值吗？这将清除所有自定义配置。',
    confirmText: '确认重置',
    cancelText: '取消',
    onConfirm: () => {
      debug.log('设置面板', '开始重置设置');
      Object.assign(settings, {
        theme: 'auto',
        uiScale: 100,
        fontSize: 'medium',
        fastAnimations: false,
        showHints: true,
        debugMode: false,
        consoleDebug: false,
        performanceMonitor: false,
        questSystemType: '修仙辅助系统',
        questSystemPrompt: '',
        enableNsfwMode: true, // 默认开启
        nsfwGenderFilter: 'all', // 默认所有NPC
        enableSoundEffects: true,
        backgroundMusic: true,
        notificationSounds: true,
        autoSyncTavern: true,
        validateData: true,
        backupBeforeSave: true
      });
      saveSettings();
      toast.info('设置已重置为默认值');
    },
    onCancel: () => {}
  });
};

// 清理缓存
const clearCache = async () => {
  uiStore.showRetryDialog({
    title: '清理缓存',
    message: '确定要清理缓存吗？这将删除临时数据但不会影响存档。',
    confirmText: '确认清理',
    cancelText: '取消',
    onConfirm: async () => {
      debug.log('设置面板', '开始清理缓存');
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('dad_cache_') || key.startsWith('temp_') || key.startsWith('debug_') || key.includes('_temp'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        sessionStorage.clear();
        debug.log('设置面板', `缓存清理完成，共清理 ${keysToRemove.length} 项数据`);
        toast.success(`已清理 ${keysToRemove.length} 项缓存数据`);
      } catch (error) {
        debug.error('设置面板', '清理缓存失败', error);
        toast.error('清理缓存失败');
      }
    },
    onCancel: () => {}
  });
};

// 导出设置
const exportSettings = () => {
  debug.log('设置面板', '开始导出设置');
  
  try {
    const exportData = {
      settings: settings,
      exportInfo: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        userAgent: navigator.userAgent,
        gameVersion: '大道朝天 v1.0.0'
      }
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `大道朝天-设置备份-${dateStr}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(link.href);
    
    debug.log('设置面板', '设置导出成功');
    toast.success('设置已导出');
    
  } catch (error) {
    debug.error('设置面板', '导出设置失败', error);
    toast.error('导出设置失败');
  }
};

// 导入设置
const importSettings = () => {
  debug.log('设置面板', '开始导入设置');
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      if (importData.settings) {
        // 验证导入的设置
        const validatedSettings = { ...settings, ...importData.settings };
        Object.assign(settings, validatedSettings);
        
        await saveSettings();
        
        debug.log('设置面板', '设置导入成功', importData);
        toast.success('设置导入成功并已应用');
      } else {
        throw new Error('无效的设置文件格式');
      }
    } catch (error) {
      debug.error('设置面板', '导入设置失败', error);
      toast.error('导入设置失败，请检查文件格式');
    }
  };
  
  input.click();
};

// 授权验证相关方法
const openAuthModal = () => {
  showAuthModal.value = true;
};

const handleAuthVerified = (data: any) => {
  debug.log('设置面板', '授权验证成功', data);
  toast.success('授权验证成功');
  showAuthModal.value = false;
};

const handleAuthCancel = () => {
  debug.log('设置面板', '用户取消授权验证');
  showAuthModal.value = false;
};

const clearAuthVerification = () => {
  uiStore.showRetryDialog({
    title: '清除授权验证',
    message: '确定要清除当前的授权验证信息吗？清除后需要重新验证。',
    confirmText: '确认清除',
    cancelText: '取消',
    onConfirm: () => {
      localStorage.removeItem('auth_verified');
      localStorage.removeItem('auth_app_id');
      localStorage.removeItem('auth_machine_code');
      localStorage.removeItem('auth_expires_at');
      toast.success('授权验证信息已清除');
      debug.log('设置面板', '授权验证信息已清除');
    },
    onCancel: () => {}
  });
};

// 组件挂载时加载设置
onMounted(() => {
  debug.log('设置面板', '组件已加载');
  loadSettings();

  // 初始加载时不再强制应用设置，以避免覆盖全局主题
  // applySettings(); // 移除此调用

  // 🔧 开发者控制：如果启用授权验证且未验证，自动弹出验证窗口
  if (AUTH_CONFIG.ENABLE_AUTH && AUTH_CONFIG.AUTO_SHOW_ON_STARTUP) {
    const isVerified = localStorage.getItem('auth_verified') === 'true';
    if (!isVerified) {
      setTimeout(() => {
        showAuthModal.value = true;
        toast.info('请先完成授权验证');
      }, 1000);
    }
  }
});
</script>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  overflow: hidden;
  padding: 1rem;
  gap: 1rem;
  position: relative;
}

/* 头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--color-surface);
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  font-size: 1.5rem;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.panel-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.settings-subtitle {
  font-size: 0.875rem;
  color: #64748b;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.action-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.action-btn.primary {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.action-btn.primary:hover {
  background: #2563eb;
  border-color: #2563eb;
}

/* 设置容器 */
.settings-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 0 0.5rem 3rem 0.5rem;
  
  /* 滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 116, 139, 0.3) rgba(243, 244, 246, 0.5);
}

.settings-container::-webkit-scrollbar {
  width: 8px;
}

.settings-container::-webkit-scrollbar-track {
  background: rgba(243, 244, 246, 0.5);
  border-radius: 4px;
}

.settings-container::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.3);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.settings-container::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.5);
}

/* 设置区块 */
.settings-section {
  margin-bottom: 1.5rem;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.section-header {
  padding: 1rem 1.25rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.settings-list {
  padding: 0.5rem;
}

/* 设置项 */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-radius: 0.5rem;
  transition: background 0.2s ease;
}

.setting-item:hover {
  background: #f8fafc;
}

.setting-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.setting-name {
  font-weight: 500;
  color: #1e293b;
  cursor: pointer;
}

.setting-desc {
  font-size: 0.875rem;
  color: #64748b;
}

.setting-control {
  display: flex;
  align-items: center;
}

/* 控件样式 */
.setting-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  min-width: 80px;
}

.setting-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.range-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.setting-range {
  width: 100px;
}

.range-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  min-width: 40px;
}

/* 下拉选择框样式 */
.setting-select {
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background-color: white;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 12px;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: border-color 0.2s ease;
  appearance: none;
  min-width: 120px;
}

.setting-select:hover {
  border-color: #94a3b8;
}

.setting-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

[data-theme="dark"] .setting-select {
  background-color: #374151;
  border-color: #4b5563;
  color: #e5e7eb;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23e5e7eb' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
}

[data-theme="dark"] .setting-select:hover {
  border-color: #6b7280;
}

/* 开关样式 */
.setting-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.setting-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: 0.2s;
  border-radius: 24px;
}

.switch-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}

input:checked + .switch-slider {
  background-color: #3b82f6;
}

input:checked + .switch-slider:before {
  transform: translateX(20px);
}

/* 全宽设置项 */
.setting-item-full {
  flex-direction: column;
  align-items: flex-start;
}

.setting-control-full {
  width: 100%;
  margin-top: 0.5rem;
}

.setting-textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  min-height: 60px;
}

.setting-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.setting-textarea::placeholder {
  color: #9ca3af;
}

[data-theme="dark"] .setting-textarea {
  background: #374151;
  border-color: #4b5563;
  color: #e5e7eb;
}

[data-theme="dark"] .setting-textarea::placeholder {
  color: #6b7280;
}

/* 工具按钮 */
.utility-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.utility-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .setting-control {
    width: 100%;
    justify-content: flex-end;
  }
  
  .range-container {
    width: 100%;
    justify-content: space-between;
  }
  
  .header-actions .btn-text {
    display: none;
  }
}

/* 深色主题 */
[data-theme="dark"] .settings-panel {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
}

[data-theme="dark"] .panel-header,
[data-theme="dark"] .settings-section {
  background: #1e293b;
  border-color: #475569;
}

[data-theme="dark"] .section-header {
  background: #334155;
  border-bottom-color: #475569;
}

[data-theme="dark"] .panel-title,
[data-theme="dark"] .section-title,
[data-theme="dark"] .setting-name {
  color: #f1f5f9;
}

[data-theme="dark"] .settings-subtitle,
[data-theme="dark"] .setting-desc {
  color: #94a3b8;
}

[data-theme="dark"] .setting-item:hover {
  background: #334155;
}

[data-theme="dark"] .action-btn,
[data-theme="dark"] .setting-select,
[data-theme="dark"] .utility-btn {
  background: #374151;
  border-color: #4b5563;
  color: #e5e7eb;
}

[data-theme="dark"] .action-btn:hover,
[data-theme="dark"] .utility-btn:hover {
  background: #4b5563;
  border-color: #6b7280;
}

[data-theme="dark"] .switch-slider {
  background-color: #4b5563;
}

/* 授权验证相关样式 */
.form-input-inline {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  min-width: 200px;
  transition: all 0.2s ease;
}

.form-input-inline:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.auth-status {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.auth-status.verified {
  background: #d1fae5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.auth-status.unverified {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.utility-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.utility-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

[data-theme="dark"] .form-input-inline {
  background: #334155;
  border-color: #475569;
  color: #e5e7eb;
}

[data-theme="dark"] .auth-status.verified {
  background: rgba(5, 150, 105, 0.2);
  color: #6ee7b7;
  border-color: rgba(5, 150, 105, 0.3);
}

[data-theme="dark"] .auth-status.unverified {
  background: rgba(220, 38, 38, 0.2);
  color: #fca5a5;
  border-color: rgba(220, 38, 38, 0.3);
}

/* 旋转动画 */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
