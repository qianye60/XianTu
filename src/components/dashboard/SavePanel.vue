<template>
  <div class="save-panel">

    <!-- 存档容器 -->
    <div class="saves-container">
      <!-- 当前存档状态 -->
      <div class="current-save-section" v-if="currentSave">
        <div class="section-header">
          <h4 class="section-title">📍 当前进度</h4>
        </div>
        <div class="current-save-card">
          <div class="save-preview">
            <div class="preview-avatar">{{ currentSave.角色名字?.[0] || '道' }}</div>
            <div class="preview-info">
              <div class="character-name">{{ currentSave.角色名字 || '无名道友' }}</div>
              <div class="character-details">
                <span class="detail-item">{{ currentSave.境界 || '凡人' }}</span>
                <span class="detail-separator">·</span>
                <span class="detail-item">{{ currentSave.位置 || '未知' }}</span>
              </div>
            </div>
          </div>
          <div class="save-stats">
            <div class="stat-item">
              <span class="stat-label">游戏时间</span>
              <span class="stat-value">{{ formatPlayTime(currentSave.游戏时长 || 0) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">最后保存</span>
              <span class="stat-value">{{ formatTime(currentSave.最后保存时间 || currentSave.保存时间 || '') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 存档列表 -->
      <div class="saves-section">
        <div class="section-header">
          <h4 class="section-title">💿 存档列表</h4>
          <div class="saves-count">{{ savesList.length }}/10</div>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="loading-spinner">⏳</div>
          <div class="loading-text">正在加载存档...</div>
        </div>

        <div v-else-if="savesList.length === 0" class="empty-state">
          <div class="empty-icon">📂</div>
          <div class="empty-text">修仙路上尚未留存，创建存档记录道途</div>
          <div class="empty-hint">开始游戏后可以创建存档</div>
        </div>

        <div v-else class="saves-list">
          <div 
            v-for="(save, index) in savesList" 
            :key="save.id"
            class="save-card"
            :class="{ 'active': save.id === currentSave?.id }"
            @click="selectSave(save)"
          >
            <div class="card-header">
              <div class="save-preview small">
                <div class="preview-avatar small">{{ save.角色名字?.[0] || '道' }}</div>
                <div class="preview-info">
                  <div class="character-name">{{ save.角色名字 || `存档${index + 1}` }}</div>
                  <div class="save-time">{{ formatTime(save.最后保存时间 || save.保存时间 || '') }}</div>
                </div>
              </div>
              <div class="card-actions">
                <button 
                  class="card-btn" 
                  @click.stop="loadSave(save)"
                  :disabled="loading"
                  v-if="save.id !== currentSave?.id"
                >
                  <Play :size="14" />
                </button>
                <button 
                  class="card-btn danger" 
                  @click.stop="deleteSave(save)"
                  :disabled="loading"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>

            <div class="card-content">
              <div class="save-details">
                <div class="detail-row">
                  <span class="detail-label">境界:</span>
                  <span class="detail-value">{{ save.境界 || '凡人' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">位置:</span>
                  <span class="detail-value">{{ save.位置 || '未知' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">时长:</span>
                  <span class="detail-value">{{ formatPlayTime(save.游戏时长 || 0) }}</span>
                </div>
              </div>
              
              <div class="save-progress" v-if="save.修为进度 !== undefined">
                <div class="progress-label">修为进度</div>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: (save.修为进度 || 0) + '%' }"></div>
                </div>
                <div class="progress-text">{{ save.修为进度 || 0 }}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 存档操作 -->
      <div class="operations-section">
        <div class="section-header">
          <h4 class="section-title">🛠️ 存档操作</h4>
        </div>
        <div class="operations-list">
          <button class="operation-btn" @click="exportSaves" :disabled="loading || savesList.length === 0">
            <Download :size="16" />
            <div class="btn-content">
              <span class="btn-title">导出存档</span>
              <span class="btn-desc">备份所有存档到文件</span>
            </div>
          </button>
          
          <button class="operation-btn" @click="importSaves" :disabled="loading">
            <Upload :size="16" />
            <div class="btn-content">
              <span class="btn-title">导入存档</span>
              <span class="btn-desc">从文件恢复存档</span>
            </div>
          </button>
          
          <button class="operation-btn danger" @click="clearAllSaves" :disabled="loading || savesList.length === 0">
            <Trash2 :size="16" />
            <div class="btn-content">
              <span class="btn-title">清空存档</span>
              <span class="btn-desc">删除所有存档数据</span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input ref="fileInput" type="file" accept=".json" @change="handleImportFile" style="display: none">
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { panelBus } from '@/utils/panelBus';
import { RefreshCw, Save, Play, Trash2, Download, Upload } from 'lucide-vue-next';
import { useCharacterStore } from '@/stores/characterStore';
import { toast } from '@/utils/toast';
import { debug } from '@/utils/debug';
import type { SaveSlot } from '@/types/game';

const characterStore = useCharacterStore();
const loading = ref(false);
const fileInput = ref<HTMLInputElement>();

// 获取存档列表
const savesList = computed(() => {
  return characterStore.saveSlots.filter((slot: SaveSlot) => slot !== null && slot.存档数据 !== null);
});

// 获取当前存档
const currentSave = computed(() => {
  return characterStore.activeSaveSlot;
});

// 是否可以存档
const canSave = computed(() => {
  return characterStore.activeCharacterProfile !== null;
});

// 刷新存档列表
const refreshSaves = async () => {
  loading.value = true;
  try {
    await characterStore.loadSaves();
    toast.success('存档列表已刷新');
  } catch (error) {
    debug.error('存档面板', '刷新失败', error);
    toast.error('刷新存档列表失败');
  } finally {
    loading.value = false;
  }
};

// 快速存档
const quickSave = async () => {
  if (!canSave.value) {
    toast.warning('当前没有可存档的游戏状态');
    return;
  }

  loading.value = true;
  try {
    await characterStore.saveCurrentGame();
    toast.success('快速存档完成');
  } catch (error) {
    debug.error('存档面板', '快速存档失败', error);
    toast.error('快速存档失败');
  } finally {
    loading.value = false;
  }
};

// 选择存档
const selectSave = (save: SaveSlot) => {
  debug.log('存档面板', '选择存档', save);
};

// 加载存档
const loadSave = async (save: SaveSlot) => {
  if (!save) return;
  
  loading.value = true;
  try {
    await characterStore.loadGameById(save.id!);
    toast.success(`已加载存档: ${save.角色名字 || '存档'}`);
  } catch (error) {
    debug.error('存档面板', '加载失败', error);
    toast.error('加载存档失败');
  } finally {
    loading.value = false;
  }
};

// 删除存档
import { useUIStore } from '@/stores/uiStore';
const uiStore = useUIStore();
const deleteSave = async (save: SaveSlot) => {
  uiStore.showRetryDialog({
    title: '删除存档',
    message: `确定要删除存档"${save.角色名字 || '存档'}"吗？此操作不可撤销。`,
    confirmText: '确认删除',
    cancelText: '取消',
    onConfirm: async () => {
      loading.value = true;
      try {
        await characterStore.deleteSaveById(save.id!);
        toast.success('存档已删除');
      } catch (error) {
        debug.error('存档面板', '删除失败', error);
        toast.error('删除存档失败');
      } finally {
        loading.value = false;
      }
    },
    onCancel: () => {}
  });
};

// 导出存档
const exportSaves = () => {
  try {
    const exportData = {
      saves: savesList.value,
      exportTime: new Date().toISOString(),
      version: '1.0.0'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `大道朝天-存档备份-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    toast.success('存档已导出');
  } catch (error) {
    debug.error('存档面板', '导出失败', error);
    toast.error('导出存档失败');
  }
};

// 导入存档
const importSaves = () => {
  fileInput.value?.click();
};

// 处理导入文件
const handleImportFile = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  loading.value = true;
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.saves || !Array.isArray(data.saves)) {
      throw new Error('无效的存档文件格式');
    }

    // 导入存档
    for (const save of data.saves) {
      await characterStore.importSave(save);
    }

    await refreshSaves();
    toast.success(`成功导入 ${data.saves.length} 个存档`);
  } catch (error) {
    debug.error('存档面板', '导入失败', error);
    toast.error('导入存档失败: ' + (error as Error).message);
  } finally {
    loading.value = false;
    // 清空文件输入
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  }
};

// 清空所有存档
const clearAllSaves = async () => {
  uiStore.showRetryDialog({
    title: '清空所有存档',
    message: '确定要删除所有存档吗？此操作不可撤销！',
    confirmText: '继续',
    cancelText: '取消',
    onConfirm: () => {
      uiStore.showRetryDialog({
        title: '再次确认',
        message: '再次确认：这将永久删除所有存档数据！',
        confirmText: '确认清空',
        cancelText: '取消',
        onConfirm: async () => {
          loading.value = true;
          try {
            await characterStore.clearAllSaves();
            toast.success('所有存档已清空');
          } catch (error) {
            debug.error('存档面板', '清空失败', error);
            toast.error('清空存档失败');
          } finally {
            loading.value = false;
          }
        },
        onCancel: () => {}
      });
    },
    onCancel: () => {}
  });
};

// 格式化时间
const formatTime = (timestamp: number | string | null | undefined): string => {
  if (!timestamp) return '未知';
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '未知';
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 格式化游戏时长
const formatPlayTime = (minutes: number | undefined): string => {
  if (!minutes || minutes < 1) return '少于1分钟';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}小时${mins}分钟`;
  }
  return `${mins}分钟`;
};

onMounted(() => {
  refreshSaves();
  // 统一顶栏动作
  panelBus.on('refresh', () => refreshSaves());
  panelBus.on('save', () => quickSave());
});
</script>

<style scoped>
.save-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  overflow: hidden;
  padding: 1rem;
  gap: 1rem;
  position: relative;
}

/* 工具栏移除：统一到顶栏动作 */

/* 头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #bae6fd;
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
  color: #0369a1;
}

.save-subtitle {
  font-size: 0.875rem;
  color: #0284c7;
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
  border: 1px solid #bae6fd;
  border-radius: 0.5rem;
  background: white;
  color: #0369a1;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.action-btn:hover {
  background: #f0f9ff;
  border-color: #0284c7;
}

.action-btn.primary {
  background: #0284c7;
  border-color: #0284c7;
  color: white;
}

.action-btn.primary:hover {
  background: #0369a1;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 存档容器 */
.saves-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 0 0.5rem 3rem 0.5rem;
  
  /* 滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(2, 132, 199, 0.3) rgba(243, 244, 246, 0.5);
}

.saves-container::-webkit-scrollbar {
  width: 8px;
}

.saves-container::-webkit-scrollbar-track {
  background: rgba(243, 244, 246, 0.5);
  border-radius: 4px;
}

.saves-container::-webkit-scrollbar-thumb {
  background: rgba(2, 132, 199, 0.3);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.saves-container::-webkit-scrollbar-thumb:hover {
  background: rgba(2, 132, 199, 0.5);
}

/* 区块样式 */
.current-save-section,
.saves-section,
.operations-section {
  margin-bottom: 1.5rem;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #bae6fd;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: #f0f9ff;
  border-bottom: 1px solid #bae6fd;
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #0369a1;
}

.saves-count {
  font-size: 0.875rem;
  color: #0284c7;
  background: #e0f2fe;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
}

/* 当前存档卡片 */
.current-save-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.save-preview {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.save-preview.small {
  gap: 0.75rem;
}

.preview-avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #0284c7, #0369a1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.25rem;
}

.preview-avatar.small {
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1rem;
}

.preview-info {
  flex: 1;
}

.character-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #0369a1;
  margin-bottom: 0.25rem;
}

.character-details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
}

.detail-separator {
  color: #cbd5e1;
}

.save-time {
  font-size: 0.875rem;
  color: #64748b;
}

.save-stats {
  display: flex;
  gap: 2rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
}

.stat-value {
  font-size: 0.875rem;
  color: #0369a1;
  font-weight: 600;
}

/* 存档列表 */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
}

.loading-spinner,
.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.loading-text,
.empty-text {
  font-size: 1rem;
  font-weight: 600;
  color: #0369a1;
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 0.875rem;
  color: #64748b;
}

.saves-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
}

.save-card {
  border: 1px solid #e0f2fe;
  border-radius: 0.5rem;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-card:hover {
  background: #f0f9ff;
  border-color: #bae6fd;
  transform: translateY(-1px);
}

.save-card.active {
  background: #e0f2fe;
  border-color: #0284c7;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e0f2fe;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.card-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid #bae6fd;
  border-radius: 0.375rem;
  background: white;
  color: #0284c7;
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-btn:hover {
  background: #f0f9ff;
  border-color: #0284c7;
}

.card-btn.danger {
  color: #ef4444;
  border-color: #fecaca;
}

.card-btn.danger:hover {
  background: #fef2f2;
  border-color: #ef4444;
}

.card-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.save-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.detail-label {
  color: #64748b;
}

.detail-value {
  color: #0369a1;
  font-weight: 500;
}

.save-progress {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.progress-label {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
}

.progress-bar {
  height: 0.5rem;
  background: #e0f2fe;
  border-radius: 0.25rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #0284c7, #0369a1);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.75rem;
  color: #0284c7;
  font-weight: 500;
  text-align: right;
}

/* 操作列表 */
.operations-list {
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.operation-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 0.5rem;
}

.operation-btn:hover {
  background: #f0f9ff;
}

.operation-btn.danger:hover {
  background: #fef2f2;
  color: #ef4444;
}

.operation-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
}

.btn-title {
  font-weight: 500;
  color: #0369a1;
}

.btn-desc {
  font-size: 0.875rem;
  color: #64748b;
}

.operation-btn.danger .btn-title {
  color: #ef4444;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .save-stats {
    gap: 1rem;
  }
  
  .card-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .save-preview {
    justify-content: center;
  }
  
  .card-actions {
    justify-content: center;
  }
  
  .header-actions .btn-text {
    display: none;
  }
}

/* 深色主题 */
[data-theme="dark"] .save-panel {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
}

[data-theme="dark"] .panel-header,
[data-theme="dark"] .current-save-section,
[data-theme="dark"] .saves-section,
[data-theme="dark"] .operations-section {
  background: #1e293b;
  border-color: #475569;
}

[data-theme="dark"] .section-header {
  background: #334155;
  border-bottom-color: #475569;
}

[data-theme="dark"] .panel-title,
[data-theme="dark"] .section-title,
[data-theme="dark"] .character-name {
  color: #0ea5e9;
}

[data-theme="dark"] .save-subtitle,
[data-theme="dark"] .saves-count {
  color: #38bdf8;
}

[data-theme="dark"] .action-btn,
[data-theme="dark"] .card-btn {
  background: #374151;
  border-color: #475569;
  color: #0ea5e9;
}

[data-theme="dark"] .action-btn:hover,
[data-theme="dark"] .card-btn:hover {
  background: #4b5563;
}

[data-theme="dark"] .save-card {
  background: #374151;
  border-color: #4b5563;
}

[data-theme="dark"] .save-card:hover {
  background: #4b5563;
}

[data-theme="dark"] .save-card.active {
  background: #1e40af;
  border-color: #0ea5e9;
}

[data-theme="dark"] .operation-btn:hover {
  background: #374151;
}

[data-theme="dark"] .btn-title {
  color: #e5e7eb;
}
</style>
