<template>
  <div v-if="visible" class="modal-overlay" @click.self="closeModal">
    <div class="modal-container">
      <!-- Header -->
      <div class="modal-header">
        <h2 class="modal-title">💾 保存预设</h2>
        <button class="modal-close" @click="closeModal">×</button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <div class="form-group">
          <label class="form-label">预设名称 <span class="required">*</span></label>
          <input
            v-model="presetName"
            type="text"
            class="form-input"
            placeholder="请输入预设名称（如：剑修预设、治愈系预设等）"
            @keyup.enter="handleSubmit"
            maxlength="50"
            autofocus
          />
          <div class="char-count">{{ presetName.length }}/50</div>
        </div>

        <div class="form-group">
          <label class="form-label">预设描述 <span class="optional">（可选）</span></label>
          <textarea
            v-model="presetDescription"
            class="form-textarea"
            placeholder="输入此预设的描述信息..."
            maxlength="200"
            rows="4"
          ></textarea>
          <div class="char-count">{{ presetDescription.length }}/200</div>
        </div>

        <!-- 预设内容预览 -->
        <div v-if="characterData" class="preset-preview">
          <div class="preview-header">📋 预设内容预览</div>
          <div class="preview-tags">
            <span v-if="characterData.world" class="info-tag">{{ characterData.world.name }}</span>
            <span v-if="characterData.talentTier" class="info-tag">{{ characterData.talentTier.name }}</span>
            <span v-if="characterData.origin" class="info-tag">{{ characterData.origin.name }}</span>
            <span v-if="characterData.spiritRoot" class="info-tag">{{ characterData.spiritRoot.name }}</span>
            <span v-if="characterData.talents && characterData.talents.length > 0" class="info-tag talent-tag">
              {{ characterData.talents.length }} 个天赋
            </span>
          </div>
        </div>

        <div class="preset-info">
          <div class="info-item">
            <span class="info-label">📅 保存时间：</span>
            <span class="info-value">{{ currentTime }}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="btn btn-cancel" @click="closeModal">取消</button>
        <button
          class="btn btn-confirm"
          @click="handleSubmit"
          :disabled="!presetName.trim() || isSubmitting"
        >
          <span v-if="isSubmitting">💫 保存中...</span>
          <span v-else>✨ 保存预设</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import type { World, TalentTier, Origin, SpiritRoot, Talent } from '@/types';

// 接收来自父组件的角色创建数据
const props = defineProps<{
  visible: boolean;
  characterData?: {
    character_name?: string;
    gender?: '男' | '女' | '其他';
    race?: string;
    current_age?: number;
    world: World | null;
    talentTier: TalentTier | null;
    origin: Origin | null;
    spiritRoot: SpiritRoot | null;
    talents: Talent[];
    baseAttributes: {
      root_bone: number;
      spirituality: number;
      comprehension: number;
      fortune: number;
      charm: number;
      temperament: number;
    };
  };
}>();

const emit = defineEmits<{
  close: [];
  submit: [data: {
    presetName: string;
    presetDescription: string;
    characterData: typeof props.characterData;
  }];
}>();

const presetName = ref('');
const presetDescription = ref('');
const currentTime = ref('');
const isSubmitting = ref(false);
let timeInterval: number | null = null;

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
  (newVal) => {
    if (newVal) {
      presetName.value = '';
      presetDescription.value = '';
      updateCurrentTime();
      // 自动聚焦
      setTimeout(() => {
        const input = document.querySelector('.form-input') as HTMLInputElement;
        input?.focus();
      }, 100);
    }
  }
);

function closeModal() {
  if (!isSubmitting.value) {
    emit('close');
  }
}

function handleSubmit() {
  if (!presetName.value.trim() || isSubmitting.value) {
    return;
  }

  isSubmitting.value = true;

  // 模拟提交延迟
  setTimeout(() => {
    emit('submit', {
      presetName: presetName.value.trim(),
      presetDescription: presetDescription.value.trim(),
      characterData: props.characterData
    });
    isSubmitting.value = false;
  }, 300);
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
  max-width: 500px;
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

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text);
}

.required {
  color: var(--color-danger);
}

.optional {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-weight: normal;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface-light);
  color: var(--color-text);
  font-size: 0.9rem;
  font-family: inherit;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-surface-lighter);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.char-count {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-align: right;
}

.preset-preview {
  padding: 1rem;
  background: rgba(var(--color-accent-rgb), 0.05);
  border: 1px solid rgba(var(--color-accent-rgb), 0.15);
  border-radius: 8px;
  margin-top: 1rem;
}

.preview-header {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.75rem;
}

.preview-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.info-tag {
  padding: 0.3rem 0.7rem;
  background: rgba(var(--color-primary-rgb), 0.1);
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
  border-radius: 12px;
  font-size: 0.75rem;
  color: var(--color-primary);
}

.info-tag.talent-tag {
  background: rgba(var(--color-accent-rgb), 0.1);
  border-color: rgba(var(--color-accent-rgb), 0.3);
  color: var(--color-accent);
  font-weight: 500;
}

.preset-info {
  padding: 1rem;
  background: rgba(var(--color-primary-rgb), 0.05);
  border: 1px solid rgba(var(--color-primary-rgb), 0.1);
  border-radius: 6px;
  margin-top: 1rem;
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

  .form-group {
    margin-bottom: 1rem;
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