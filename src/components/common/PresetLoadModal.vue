<template>
  <div v-if="visible" class="modal-overlay" @click.self="closeModal">
    <div class="modal-container">
      <!-- Header -->
      <div class="modal-header">
        <h2 class="modal-title">📂 加载预设</h2>
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
          <p>暂无保存的预设</p>
          <p class="empty-hint">完成角色创建后,可以保存为预设以便快速开始新游戏</p>
        </div>

        <div v-else class="presets-list">
          <div
            v-for="preset in presets"
            :key="preset.id"
            class="preset-item"
            :class="{ selected: selectedPreset?.id === preset.id }"
            @click="selectedPreset = preset"
          >
            <div class="preset-header">
              <h3 class="preset-name">{{ preset.name || '未命名预设' }}</h3>
              <div class="preset-actions">
                <span class="preset-date">{{ formatDate(preset.savedAt) }}</span>
                <button class="btn-delete" @click.stop="handleDeletePreset(preset.id)">×</button>
              </div>
            </div>
            <p v-if="preset.description" class="preset-description">
              {{ preset.description }}
            </p>
            <div v-if="preset.data" class="preset-info">
              <span v-if="preset.data.world" class="info-tag">{{ preset.data.world.name }}</span>
              <span v-if="preset.data.talentTier" class="info-tag">{{ preset.data.talentTier.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="btn btn-cancel" @click="closeModal">取消</button>
        <button
          class="btn btn-confirm"
          @click="handleLoadPreset"
          :disabled="!selectedPreset || isSubmitting"
        >
          <span v-if="isSubmitting">⏳ 加载中...</span>
          <span v-else>✨ 加载预设</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { loadPresets, deletePreset, type CharacterPreset } from '@/utils/presetManager';
import { toast } from '@/utils/toast';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
  select: [preset: CharacterPreset];
}>();

const presets = ref<CharacterPreset[]>([]);
const selectedPreset = ref<CharacterPreset | null>(null);
const isLoading = ref(false);
const isSubmitting = ref(false);

watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      selectedPreset.value = null;
      await loadPresetsList();
    }
  }
);

async function loadPresetsList() {
  isLoading.value = true;
  try {
    console.log('[预设加载对话框] 开始加载预设列表');
    const loadedPresets = await loadPresets();
    presets.value = loadedPresets;
    console.log('[预设加载对话框] 成功加载', presets.value.length, '个预设');
  } catch (error) {
    console.error('[预设加载对话框] 加载预设列表失败:', error);
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

function closeModal() {
  if (!isSubmitting.value) {
    emit('close');
  }
}

function handleLoadPreset() {
  if (!selectedPreset.value || isSubmitting.value) {
    return;
  }

  isSubmitting.value = true;

  setTimeout(() => {
    if (selectedPreset.value) {
      emit('select', selectedPreset.value);
    }
    isSubmitting.value = false;
  }, 300);
}

async function handleDeletePreset(presetId: string) {
  if (window.confirm('确定要删除这个预设吗？此操作不可撤销。')) {
    try {
      await deletePreset(presetId);
      toast.success('预设已删除');
      await loadPresetsList(); // Refresh the list
      if (selectedPreset.value?.id === presetId) {
        selectedPreset.value = null;
      }
    } catch (error) {
      console.error('[预设加载对话框] 删除预设失败:', error);
      toast.error('删除预设失败');
    }
  }
}
</script>

<style scoped>
.btn-delete {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0 0.5rem;
  border-radius: 4px;
  margin-left: 0.5rem;
  transition: all 0.2s ease;
}

.btn-delete:hover {
  background-color: rgba(var(--color-danger-rgb), 0.1);
  color: var(--color-danger);
}

.preset-actions {
  display: flex;
  align-items: center;
}

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

/* Presets List */
.presets-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preset-item {
  padding: 1rem;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--color-surface-light);
}

.preset-item:hover {
  border-color: var(--color-primary);
  background: var(--color-surface-lighter);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.preset-item.selected {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.1), rgba(var(--color-accent-rgb), 0.1));
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
}

.preset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.preset-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.preset-date {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.preset-description {
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.preset-info {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

.info-tag {
  padding: 0.25rem 0.75rem;
  background: rgba(var(--color-primary-rgb), 0.1);
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
  border-radius: 12px;
  font-size: 0.75rem;
  color: var(--color-primary);
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

  .preset-item {
    padding: 0.75rem;
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