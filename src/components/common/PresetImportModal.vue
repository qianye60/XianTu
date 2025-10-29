<template>
  <div v-if="visible" class="modal-overlay" @click.self="closeModal">
    <div class="modal-container">
      <!-- Header -->
      <div class="modal-header">
        <h2 class="modal-title">📥 导入预设</h2>
        <button class="modal-close" @click="closeModal">×</button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- 文件选择区域 -->
        <div class="upload-area" :class="{ 'drag-over': isDragOver }" @drop.prevent="handleDrop" @dragover.prevent="isDragOver = true" @dragleave.prevent="isDragOver = false">
          <input
            ref="fileInputRef"
            type="file"
            accept=".json,application/json"
            @change="handleFileSelect"
            class="file-input"
          />
          <div class="upload-content">
            <div class="upload-icon">📁</div>
            <p class="upload-text">拖放JSON文件到此处，或点击选择文件</p>
            <button class="btn-select" @click="triggerFileInput">选择文件</button>
            <p class="upload-hint">仅支持通过本应用导出的预设JSON文件</p>
          </div>
        </div>

        <!-- 已选择文件信息 -->
        <div v-if="selectedFile" class="file-info">
          <div class="file-header">
            <span class="file-icon">📄</span>
            <span class="file-name">{{ selectedFile.name }}</span>
            <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
            <button class="btn-remove" @click="removeFile">×</button>
          </div>
        </div>

        <!-- 导入选项 -->
        <div v-if="selectedFile" class="import-options">
          <label class="option-label">
            <input
              type="radio"
              v-model="importMode"
              value="merge"
              class="radio-input"
            />
            <span class="option-text">
              <span class="option-title">合并模式</span>
              <span class="option-desc">将导入的预设添加到现有预设中（推荐）</span>
            </span>
          </label>

          <label class="option-label">
            <input
              type="radio"
              v-model="importMode"
              value="replace"
              class="radio-input"
            />
            <span class="option-text">
              <span class="option-title">替换模式</span>
              <span class="option-desc warning">将清除所有现有预设，仅保留导入的预设</span>
            </span>
          </label>
        </div>

        <!-- 导入结果 -->
        <div v-if="importResult" class="import-result" :class="importResult.type">
          <div class="result-icon">
            {{ importResult.type === 'success' ? '✅' : importResult.type === 'warning' ? '⚠️' : '❌' }}
          </div>
          <div class="result-content">
            <p class="result-message">{{ importResult.message }}</p>
            <div v-if="importResult.details" class="result-details">
              <span v-if="importResult.details.success > 0" class="detail-item success">
                成功导入: {{ importResult.details.success }} 个
              </span>
              <span v-if="importResult.details.failed > 0" class="detail-item error">
                导入失败: {{ importResult.details.failed }} 个
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="btn btn-cancel" @click="closeModal">
          {{ importResult ? '关闭' : '取消' }}
        </button>
        <button
          v-if="!importResult"
          class="btn btn-confirm"
          @click="handleImport"
          :disabled="!selectedFile || isImporting"
        >
          <span v-if="isImporting">⏳ 导入中...</span>
          <span v-else>📤 开始导入</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { importPresets } from '@/utils/presetManager';
import { toast } from '@/utils/toast';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
  imported: [result: { success: number; failed: number }];
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const importMode = ref<'merge' | 'replace'>('merge');
const isImporting = ref(false);
const isDragOver = ref(false);
const importResult = ref<{
  type: 'success' | 'warning' | 'error';
  message: string;
  details?: { success: number; failed: number };
} | null>(null);

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      // 重置状态
      selectedFile.value = null;
      importMode.value = 'merge';
      importResult.value = null;
      isDragOver.value = false;
    }
  }
);

function triggerFileInput() {
  fileInputRef.value?.click();
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    validateAndSetFile(file);
  }
}

function handleDrop(event: DragEvent) {
  isDragOver.value = false;
  const file = event.dataTransfer?.files[0];
  if (file) {
    validateAndSetFile(file);
  }
}

function validateAndSetFile(file: File) {
  // 验证文件类型
  if (!file.name.endsWith('.json') && file.type !== 'application/json') {
    toast.error('请选择JSON格式的文件');
    return;
  }

  // 验证文件大小（限制为10MB）
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    toast.error('文件大小超过限制（最大10MB）');
    return;
  }

  selectedFile.value = file;
  importResult.value = null;
}

function removeFile() {
  selectedFile.value = null;
  importResult.value = null;
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

function closeModal() {
  if (!isImporting.value) {
    emit('close');
  }
}

async function handleImport() {
  if (!selectedFile.value || isImporting.value) {
    return;
  }

  // 如果是替换模式，需要确认
  if (importMode.value === 'replace') {
    const confirmed = window.confirm(
      '替换模式将删除所有现有预设！\n\n此操作不可撤销，确定要继续吗？'
    );
    if (!confirmed) {
      return;
    }
  }

  isImporting.value = true;
  const toastId = 'import-preset-toast';
  toast.loading('正在导入预设...', { id: toastId });

  try {
    const result = await importPresets(selectedFile.value, importMode.value);
    
    console.log('[预设导入对话框] 导入完成:', result);

    // 设置导入结果
    if (result.success > 0 && result.failed === 0) {
      importResult.value = {
        type: 'success',
        message: `成功导入 ${result.success} 个预设！`,
        details: result
      };
      toast.success(`成功导入 ${result.success} 个预设！`, { id: toastId });
    } else if (result.success > 0 && result.failed > 0) {
      importResult.value = {
        type: 'warning',
        message: '部分预设导入成功',
        details: result
      };
      toast.warning(`成功: ${result.success} 个，失败: ${result.failed} 个`, { id: toastId });
    } else {
      importResult.value = {
        type: 'error',
        message: '预设导入失败',
        details: result
      };
      toast.error('预设导入失败', { id: toastId });
    }

    emit('imported', result);
  } catch (error) {
    console.error('[预设导入对话框] 导入失败:', error);
    const message = error instanceof Error ? error.message : '导入失败';
    
    importResult.value = {
      type: 'error',
      message: `导入失败: ${message}`
    };
    
    toast.error(`导入失败: ${message}`, { id: toastId });
  } finally {
    isImporting.value = false;
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
}

/* Upload Area */
.upload-area {
  border: 2px dashed var(--color-border);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  background: var(--color-surface-light);
}

.upload-area:hover {
  border-color: var(--color-primary);
  background: var(--color-surface-lighter);
}

.upload-area.drag-over {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.1), rgba(var(--color-accent-rgb), 0.1));
  transform: scale(1.02);
}

.file-input {
  display: none;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.upload-icon {
  font-size: 3rem;
  opacity: 0.6;
}

.upload-text {
  margin: 0;
  color: var(--color-text);
  font-size: 1rem;
}

.btn-select {
  padding: 0.6rem 1.5rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-select:hover {
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.4);
  transform: translateY(-2px);
}

.upload-hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  opacity: 0.7;
}

/* File Info */
.file-info {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--color-surface-lighter);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.file-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.file-icon {
  font-size: 1.5rem;
}

.file-name {
  flex: 1;
  font-weight: 500;
  color: var(--color-text);
  word-break: break-all;
}

.file-size {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.btn-remove {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.btn-remove:hover {
  background-color: rgba(var(--color-danger-rgb), 0.1);
  color: var(--color-danger);
}

/* Import Options */
.import-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
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

.option-desc.warning {
  color: var(--color-warning);
}

/* Import Result */
.import-result {
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.import-result.success {
  background: rgba(var(--color-success-rgb), 0.1);
  border: 1px solid rgba(var(--color-success-rgb), 0.3);
}

.import-result.warning {
  background: rgba(var(--color-warning-rgb), 0.1);
  border: 1px solid rgba(var(--color-warning-rgb), 0.3);
}

.import-result.error {
  background: rgba(var(--color-danger-rgb), 0.1);
  border: 1px solid rgba(var(--color-danger-rgb), 0.3);
}

.result-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.result-content {
  flex: 1;
}

.result-message {
  margin: 0 0 0.5rem 0;
  font-weight: 500;
  color: var(--color-text);
}

.result-details {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.detail-item {
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

.detail-item.success {
  background: rgba(var(--color-success-rgb), 0.2);
  color: var(--color-success);
}

.detail-item.error {
  background: rgba(var(--color-danger-rgb), 0.2);
  color: var(--color-danger);
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

  .upload-area {
    padding: 1.5rem;
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