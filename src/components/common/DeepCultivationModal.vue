<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="deep-cultivation-modal">
      <div class="modal-header">
        <h3>{{ $t('深度修炼') }}</h3>
        <button class="close-btn" @click="handleClose">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-content">
        <!-- 功法信息 -->
        <div v-if="technique" class="technique-info-section">
          <div class="info-header">
            <div class="technique-icon" :class="getTechniqueQualityClass">📖</div>
            <div class="technique-details">
              <h4 class="technique-name" :class="getTechniqueQualityClass">{{ technique.名称 }}</h4>
              <div class="technique-quality">
                {{ technique.品质?.quality || '凡' }}品 {{ technique.品质?.grade || 0 }}阶
              </div>
            </div>
          </div>

          <!-- 当前修炼进度 -->
          <div class="progress-section">
            <div class="progress-label">
              <span>{{ $t('当前修炼进度') }}</span>
              <span class="progress-percent">{{ currentProgress }}%</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" :style="{ width: currentProgress + '%' }"></div>
            </div>
          </div>

          <!-- 功法效果 -->
          <div v-if="technique.功法效果" class="effects-section">
            <h5>{{ $t('功法效果') }}</h5>
            <ul class="effects-list">
              <li v-if="technique.功法效果.修炼速度加成">
                <span class="effect-icon">🚀</span>
                {{ $t('修炼速度: +{0}%').replace('{0}', ((technique.功法效果.修炼速度加成 - 1) * 100).toFixed(0)) }}
              </li>
              <li v-if="technique.功法效果.属性加成">
                <span class="effect-icon">💪</span>
                {{ $t('属性加成:') }}
                <span v-for="(value, key) in technique.功法效果.属性加成" :key="key" class="attr-bonus">
                  {{ key }}+{{ value }}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <!-- 修炼天数选择 -->
        <div class="cultivation-days-section">
          <label class="section-label">{{ $t('选择修炼天数') }}</label>
          <p class="section-hint">{{ $t('AI将根据修炼天数生成详细的修炼过程和结果') }}</p>

          <div class="input-group">
            <input
              v-model.number="selectedDays"
              type="number"
              :min="1"
              :max="3650"
              :step="1"
              class="days-input"
              :placeholder="$t('输入天数')"
            />
            <span class="input-unit">{{ $t('天') }}</span>
          </div>

          <!-- 快捷选择 -->
          <div class="preset-buttons">
            <button
              v-for="preset in presetDays"
              :key="preset.value"
              class="preset-btn"
              :class="{ active: selectedDays === preset.value }"
              @click="selectedDays = preset.value"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-cancel" @click="handleClose">{{ $t('取消') }}</button>
        <button
          class="btn btn-confirm"
          :disabled="!isValidDays"
          @click="handleConfirm"
        >
          {{ $t('开始修炼') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X } from 'lucide-vue-next';
import type { TechniqueItem } from '@/types/game';
import { useI18n } from '@/i18n';

const { t } = useI18n();

interface Props {
  visible: boolean;
  technique: TechniqueItem | null;
  currentProgress?: number;
}

interface Emits {
  (e: 'close'): void;
  (e: 'confirm', days: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  currentProgress: 0
});

const emit = defineEmits<Emits>();

const selectedDays = ref(7);

const presetDays = [
  { label: '1天', value: 1 },
  { label: '7天', value: 7 },
  { label: '30天', value: 30 },
  { label: '90天', value: 90 },
  { label: '180天', value: 180 },
  { label: '365天', value: 365 }
];

const isValidDays = computed(() => {
  return selectedDays.value >= 1 && selectedDays.value <= 3650;
});

const getTechniqueQualityClass = computed(() => {
  const quality = props.technique?.品质?.quality || '凡';
  return `quality-${quality}`;
});

const handleClose = () => {
  emit('close');
};

const handleConfirm = () => {
  if (isValidDays.value) {
    emit('confirm', selectedDays.value);
  }
};

// 重置选择当弹窗关闭时
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    selectedDays.value = 7;
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 20px;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.deep-cultivation-modal {
  background: var(--color-surface);
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(135deg, var(--color-surface-light), rgba(var(--color-primary-rgb), 0.05));
}

.modal-header h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--color-danger);
  color: white;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 功法信息区域 */
.technique-info-section {
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.technique-icon {
  font-size: 2.5rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.1), rgba(var(--color-accent-rgb), 0.1));
}

.technique-icon.quality-神 { background: linear-gradient(135deg, rgba(220, 38, 38, 0.2), rgba(248, 113, 113, 0.2)); }
.technique-icon.quality-仙 { background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(251, 191, 36, 0.2)); }
.technique-icon.quality-天 { background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(192, 132, 252, 0.2)); }
.technique-icon.quality-地 { background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(96, 165, 250, 0.2)); }
.technique-icon.quality-玄 { background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(52, 211, 153, 0.2)); }
.technique-icon.quality-黄 { background: linear-gradient(135deg, rgba(250, 204, 21, 0.2), rgba(253, 224, 71, 0.2)); }

.technique-details {
  flex: 1;
}

.technique-name {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: var(--color-text);
}

.technique-name.quality-神 { color: #dc2626; }
.technique-name.quality-仙 { color: #f59e0b; }
.technique-name.quality-天 { color: #a855f7; }
.technique-name.quality-地 { color: #3b82f6; }
.technique-name.quality-玄 { color: #10b981; }
.technique-name.quality-黄 { color: #facc15; }

.technique-quality {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* 进度条 */
.progress-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.progress-percent {
  color: var(--color-primary);
  font-size: 1rem;
}

.progress-bar-bg {
  height: 12px;
  background: rgba(var(--color-border-rgb), 0.3);
  border-radius: 999px;
  overflow: hidden;
  position: relative;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  border-radius: 999px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.progress-bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shine 2s infinite;
}

@keyframes shine {
  to {
    left: 100%;
  }
}

/* 效果列表 */
.effects-section {
  border-top: 1px solid var(--color-border);
  padding-top: 12px;
}

.effects-section h5 {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.effects-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.effects-list li {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.effect-icon {
  font-size: 1rem;
}

.attr-bonus {
  padding: 2px 8px;
  background: rgba(var(--color-success-rgb), 0.1);
  color: var(--color-success);
  border-radius: 4px;
  font-weight: 500;
  margin-left: 4px;
}

/* 修炼天数选择区域 */
.cultivation-days-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-label {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.section-hint {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.days-input {
  flex: 1;
  padding: 12px 16px;
  font-size: 1.1rem;
  font-weight: 600;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface-light);
  color: var(--color-text);
  transition: all 0.2s;
}

.days-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.input-unit {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

/* 快捷按钮 */
.preset-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.preset-btn {
  padding: 10px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface-light);
  color: var(--color-text);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
}

.preset-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

/* 提示信息 */
.cultivation-hints {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: rgba(var(--color-info-rgb), 0.05);
  border: 1px solid rgba(var(--color-info-rgb), 0.2);
  border-radius: 8px;
}

.hint-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.hint-icon {
  font-size: 1rem;
}

/* 底部按钮 */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-light);
  border-radius: 0 0 16px 16px;
}

.btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: var(--color-surface-hover);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-cancel:hover {
  background: var(--color-border);
}

.btn-confirm {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .deep-cultivation-modal {
    max-width: 100%;
    border-radius: 16px 16px 0 0;
    max-height: 95vh;
  }

  .modal-header {
    padding: 20px;
  }

  .modal-content {
    padding: 20px;
  }

  .preset-buttons {
    grid-template-columns: repeat(2, 1fr);
  }

  .modal-footer {
    padding: 16px 20px;
  }
}
</style>
