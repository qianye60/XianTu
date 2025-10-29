<template>
  <div v-if="visible" class="modal-overlay" @click.self="closeModal">
    <div class="modal-container">
      <!-- Header -->
      <div class="modal-header">
        <h2 class="modal-title">📤 导出预设</h2>
        <button class="modal-close" @click="closeModal">×</button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <div v-if="isLoading" class="loading-state">
          <div class="spinner"></div>
          <p>正在加载预设列表...</p>
        </div>

        <div v-else-if="presets.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <p>暂无可导出的预设</p>
          <p class="empty-hint">请先保存一些预设后再进行导出</p>
        </div>

        <div v-else>
          <!-- 导出模式选择 -->
          <div class="export-options">
            <label class="option-label">
              <input
                type="radio"
                v-model="exportMode"
                value="all"
                class="radio-input"
              />
              <span class="option-text">
                <span class="option-title">导出全部预设</span>
                <span class="option-desc">导出所有 {{ presets.length }} 个预设</span>
              </span>
            </label>

            <label class="option-label">
              <input
                type="radio"
                v-model="exportMode"
                value="selected"
                class="radio-input"
              />
              <span class="option-text">
                <span class="option-title">导出选中预设</span>
                <span class="option-desc">选择要导出的预设</span>
              </span>
            </label>
          </div>

          <!-- 预设列表 (仅在选中模式下显示) -->
          <div v-if="exportMode === 'selected'" class="presets-list">
            <div class="list-header">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  @change="toggleSelectAll"
                  class="checkbox-input"
                />
                <span>全选/取消全选</span>
              </label>
              <span class="selected-count">已选择 {{ selectedPresetIds.length }} 个</span>
            </div>

            <div class="preset-items">
              <label
                v-for="preset in presets"
                :key="preset.id"
                class="preset-item"
                :class="{ selected: selectedPresetIds.includes(preset.id) }"
              >
                <input
                  type="checkbox"
                  :value="preset.id"
                  v-model="selectedPresetIds"
                  class="checkbox-input"
                />
                <div class="preset-info">
                  <div class="preset-header">
                    <h3 class="preset-name">{{ preset.name || '未命名预设' }}</h3>
                    <span class="preset-date">{{ formatDate(preset.savedAt) }}</span>
                  </div>
                  <p v-if="preset.description" class="preset-description">
                    {{ preset.description }}
                  </p>
                  <div v-if="preset.data" class="preset-tags">
                    <span v-if="preset.data.world" class="info-tag">{{ preset.data.world.name }}</span>
                    <span v-if="preset.data.talentTier" class="info-tag">{{ preset.data.talentTier.name }}</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <!-- 导出信息 -->
          <div class="export-info">
            <div class="info-item">
              <span class="info-label">📦 导出数量：</span>
              <span class="info-value">{{ getExportCount() }} 个预设</span>
            </div>
            <div class="info-item">
              <span class="info-label">📄 文件格式：</span>
              <span class="info-value">JSON</span>
            </div>
            <div class="info-item">
              <span class="info-label">📅 导出时间：</span>
              <span class="info-value">{{ currentTime }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="btn btn-cancel" @click="closeModal">取消</button>
        <button
          class="btn btn-confirm"
          @click="handleExport"
          :disabled="!canExport || isExporting"
        >
          <span v-if="isExporting">⏳ 导出中...</span>
          <span v-else>📥 导出预设</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { loadPresets, exportPresets, type CharacterPreset } from '@/utils/presetManager';
import { toast } from '@/utils/toast';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
  exported: [];
}>();

const presets = ref<CharacterPreset[]>([]);
const exportMode = ref<'all' | 'selected'>('all');
const selectedPresetIds = ref<string[]>([]);
const isLoading = ref(false);
const isExporting = ref(false);
const currentTime = ref('');
let timeInterval: number | null = null;

const isAllSelected = computed(() => {
  return presets.value.length > 0 && selectedPresetIds.value.length === presets.value.length;
});

const canExport = computed(() => {
  if (presets.value.length === 0) return false;
  if (exportMode.value === 'all') return true;
  return selectedPresetIds.value.length > 0;
});

onMounted(() => {
  updateCurrentTime();
  timeInterval = window.setInterval(updateCurrentTime, 1000);
});

onUnmounted(() => {
  if (timeInterval !== null) {
    clearInterval(timeInterval);
  }
});

function updateCurrentTime() {
  const now = new Date();
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      exportMode.value = 'all';
      selectedPresetIds.value = [];
      await loadPresetsList();
    }
  }
);

async function loadPresetsList() {
  isLoading.value = true;
  try {
    console.log('[预设导出对话框] 开始加载预设列表');
    const loadedPresets = await loadPresets();
    presets.value = loadedPresets;
    console.log('[预设导出对话框] 成功加载', presets.value.length, '个预设');
  } catch (error) {
    console.error('[预设导出对话框] 加载预设列表失败:', error);
    toast.error('加载预设列表失败');
    presets.value = [];
  } finally {
    isLoading.value = false;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return '今天';
  } else if (days === 1) {
    return '昨天';
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedPresetIds.value = [];
  } else {
    selectedPresetIds.value = presets.value.map(p => p.id);
  }
}

function getExportCount(): number {
  if (exportMode.value === 'all') {
    return presets.value.length;
  }
  return selectedPresetIds.value.length;
}

function closeModal() {
  if (!isExporting.value) {
    emit('close');
  }
}

async function handleExport() {
  if (!canExport.value || isExporting.value) {
    return;
  }

  isExporting.value = true;
  const toastId = 'export-preset-toast';
  toast.loading('正在导出预设...', { id: toastId });

  try {
    // 根据导出模式选择要导出的预设ID
    const presetIds = exportMode.value === 'all' 
      ? undefined 
      : selectedPresetIds.value;

    await exportPresets(presetIds);

    const count = getExportCount();
    toast.success(`成功导出 ${count} 个预设！`, { id: toastId });
    
    emit('exported');
    emit('close');
  } catch (error) {
    console.error('[预设导出对话框] 导出失败:', error);
    const message = error instanceof Error ? error.message : '导出失败';
    toast.error(`导出失败: ${message}`, { id: toastId });
  } finally {
    isExporting.value = false;
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.modal-container {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-text);
}

.modal-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  min-height: 200px;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(var(--color-primary-rgb), 0.2);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state p {
  margin: 0.5rem 0;
  color: var(--color-text-secondary);
}

.empty-hint {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  opacity: 0.7;
  max-width: 300px;
}

/* Export Options */
.export-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.option-label {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-label:hover {
  border-color: var(--color-primary);
  background: var(--color-surface-lighter);
}

.radio-input {
  margin-top: 0.2rem;
  cursor: pointer;
}

.option-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.option-title {
  font-weight: 600;
  color: var(--color-text);
}

.option-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

/* Presets List */
.presets-list {
  margin-bottom: 1.5rem;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--color-surface-light);
  border-radius: 6px;
  margin-bottom: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--color-text);
}

.checkbox-input {
  cursor: pointer;
}

.selected-count {
  font-size: 0.85rem;
  color: var(--color-primary);
  font-weight: 500;
}

.preset-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 300px;
  overflow-y: auto;
  padding: 0.25rem;
}

.preset-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preset-item:hover {
  border-color: var(--color-primary);
  background: var(--color-surface-lighter);
}

.preset-item.selected {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.1), rgba(var(--color-accent-rgb), 0.1));
}

.preset-info {
  flex: 1;
}

.preset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.preset-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
}

.preset-date {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.preset-description {
  margin: 0.25rem 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.3;
}

.preset-tags {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.info-tag {
  padding: 0.2rem 0.6rem;
  background: rgba(var(--color-primary-rgb), 0.1);
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
  border-radius: 10px;
  font-size: 0.7rem;
  color: var(--color-primary);
}

/* Export Info */
.export-info {
  padding: 1rem;
  background: rgba(var(--color-primary-rgb), 0.05);
  border: 1px solid rgba(var(--color-primary-rgb), 0.1);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.info-label {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.info-value {
  color: var(--color-text);
  font-family: 'Monaco', 'Courier New', monospace;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-light);
}

.btn {
  padding: 0.7rem 1.5rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-cancel {
  background: var(--color-surface-lighter);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-cancel:hover:not(:disabled) {
  background: rgba(var(--color-text-rgb), 0.05);
  border-color: var(--color-text-secondary);
}

.btn-confirm {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  border: none;
  min-width: 120px;
}

.btn-confirm:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.4);
  transform: translateY(-2px);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .modal-container {
    width: 95%;
    max-width: 100%;
    border-radius: 8px;
  }

  .modal-header {
    padding: 1rem;
  }

  .modal-title {
    font-size: 1.1rem;
  }

  .modal-content {
    padding: 1rem;
  }

  .modal-footer {
    padding: 1rem;
    flex-direction: column-reverse;
    gap: 0.75rem;
  }

  .btn {
    width: 100%;
    padding: 0.8rem 1rem;
  }
}
</style>