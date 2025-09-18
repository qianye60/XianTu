<template>
  <div class="settings-panel">
    <!-- 头部 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="header-icon">⚙️</div>
        <div class="header-info">
          <h3 class="panel-title">游戏设置</h3>
          <span class="settings-subtitle">自定义您的游戏体验</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="resetSettings">
          <RotateCcw :size="16" />
          <span class="btn-text">重置</span>
        </button>
        <button class="action-btn primary" @click="saveSettings">
          <Save :size="16" />
          <span class="btn-text">保存</span>
        </button>
      </div>
    </div>

    <!-- 设置内容 -->
    <div class="settings-container">
      <!-- 显示设置 -->
      <div class="settings-section">
        <div class="section-header">
          <h4 class="section-title">🎨 显示设置</h4>
        </div>
        <div class="settings-list">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">主题模式</label>
              <span class="setting-desc">选择明亮或暗黑主题</span>
            </div>
            <div class="setting-control">
              <select v-model="settings.theme" class="setting-select" @change="onSettingChange">
                <option value="light">明亮</option>
                <option value="dark">暗黑</option>
                <option value="auto">跟随系统</option>
              </select>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">界面缩放</label>
              <span class="setting-desc">调整UI界面大小</span>
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
              <label class="setting-name">文字大小</label>
              <span class="setting-desc">调整游戏文字显示大小</span>
            </div>
            <div class="setting-control">
              <select v-model="settings.fontSize" class="setting-select">
                <option value="small">小</option>
                <option value="medium">中</option>
                <option value="large">大</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- 游戏设置 -->
      <div class="settings-section">
        <div class="section-header">
          <h4 class="section-title">🎮 游戏设置</h4>
        </div>
        <div class="settings-list">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">自动存档</label>
              <span class="setting-desc">每隔一定时间自动保存游戏</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="settings.autoSave">
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item" v-if="settings.autoSave">
            <div class="setting-info">
              <label class="setting-name">存档间隔</label>
              <span class="setting-desc">自动存档的时间间隔</span>
            </div>
            <div class="setting-control">
              <select v-model="settings.autoSaveInterval" class="setting-select">
                <option :value="1">1分钟</option>
                <option :value="5">5分钟</option>
                <option :value="10">10分钟</option>
                <option :value="15">15分钟</option>
              </select>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">快速动画</label>
              <span class="setting-desc">加速界面动画和过渡效果</span>
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
              <label class="setting-name">显示提示</label>
              <span class="setting-desc">显示操作提示和帮助信息</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="settings.showHints">
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- 游戏功能 -->
      <div class="settings-section">
        <div class="section-header">
          <h4 class="section-title">🎮 游戏功能</h4>
        </div>
        <div class="settings-list">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">任务系统</label>
              <span class="setting-desc">启用任务追踪和完成系统</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="settings.enableQuestSystem">
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item" v-if="settings.enableQuestSystem">
            <div class="setting-info">
              <label class="setting-name">任务提醒</label>
              <span class="setting-desc">新任务和完成时的通知提醒</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="settings.questNotifications">
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item" v-if="settings.enableQuestSystem">
            <div class="setting-info">
              <label class="setting-name">自动接取任务</label>
              <span class="setting-desc">自动接取适合等级的任务</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="settings.autoAcceptQuests">
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- 高级设置 -->
      <div class="settings-section">
        <div class="section-header">
          <h4 class="section-title">🔧 高级设置</h4>
        </div>
        <div class="settings-list">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">调试模式</label>
              <span class="setting-desc">启用开发者调试信息和详细日志</span>
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
              <label class="setting-name">控制台调试</label>
              <span class="setting-desc">在浏览器控制台显示详细调试信息</span>
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
              <label class="setting-name">性能监控</label>
              <span class="setting-desc">监控组件性能和加载时间</span>
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
              <label class="setting-name">导入设置</label>
              <span class="setting-desc">从文件恢复设置配置</span>
            </div>
            <div class="setting-control">
              <button class="utility-btn" @click="importSettings">
                <Upload :size="16" />
                导入
              </button>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">清理缓存</label>
              <span class="setting-desc">清除游戏临时数据和缓存</span>
            </div>
            <div class="setting-control">
              <button class="utility-btn" @click="clearCache">
                <Trash2 :size="16" />
                清理
              </button>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">导出设置</label>
              <span class="setting-desc">备份当前设置配置</span>
            </div>
            <div class="setting-control">
              <button class="utility-btn" @click="exportSettings">
                <Download :size="16" />
                导出
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import { Save, RotateCcw, Trash2, Download, Upload } from 'lucide-vue-next';
import { toast } from '@/utils/toast';
import { debug } from '@/utils/debug';

// 设置数据结构
const settings = reactive({
  // 显示设置
  theme: 'auto',
  uiScale: 100,
  fontSize: 'medium',
  
  // 游戏设置
  autoSave: true,
  autoSaveInterval: 5,
  fastAnimations: false,
  showHints: true,
  
  // 高级设置
  debugMode: false,
  consoleDebug: false,
  performanceMonitor: false,
  
  // 任务系统相关设置
  enableQuestSystem: true,
  questNotifications: true,
  autoAcceptQuests: false,
  
  // 游戏体验
  enableSoundEffects: true,
  backgroundMusic: true,
  notificationSounds: true,
  
  // 数据同步
  autoSyncTavern: true,
  validateData: true,
  backupBeforeSave: true
});

const loading = ref(false);
const hasUnsavedChanges = ref(false);

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
const loadSettings = () => {
  debug.timeStart('加载设置');
  try {
    const savedSettings = localStorage.getItem('dad_game_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      Object.assign(settings, parsed);
      debug.log('设置面板', '设置加载成功', parsed);
    } else {
      debug.log('设置面板', '使用默认设置');
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
    
    // 验证自动存档间隔
    const validIntervals = [1, 5, 10, 15, 30];
    if (!validIntervals.includes(settings.autoSaveInterval)) {
      settings.autoSaveInterval = 5;
      debug.warn('设置面板', '自动存档间隔已重置为5分钟');
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
        autoSave: true,
        autoSaveInterval: 5,
        fastAnimations: false,
        showHints: true,
        debugMode: false,
        consoleDebug: false,
        performanceMonitor: false,
        enableQuestSystem: true,
        questNotifications: true,
        autoAcceptQuests: false,
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

// 组件挂载时加载设置
onMounted(() => {
  debug.log('设置面板', '组件已加载');
  loadSettings();
  
  // 延迟应用设置，避免初始加载冲突
  setTimeout(() => {
    applySettings();
  }, 100);
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
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #cbd5e1;
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
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: white;
  color: #475569;
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
@media (max-width: 768px) {
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

/* 旋转动画 */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
