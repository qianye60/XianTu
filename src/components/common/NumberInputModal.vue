<template>
  <div v-if="visible" class="number-modal-overlay" @click="handleOverlayClick">
    <div class="number-modal" @click.stop>
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <div class="modal-body">
        <div v-if="description" class="modal-description">{{ description }}</div>

        <div class="number-input-group">
          <label :for="inputId">{{ label }}：</label>
          <div class="input-controls">
            <button
              class="control-btn"
              @click="decrease"
              :disabled="inputValue <= min"
            >
              -
            </button>
            <input
              :id="inputId"
              v-model.number="inputValue"
              type="number"
              :min="min"
              :max="max"
              :step="step"
              class="number-input"
              @keyup.enter="handleConfirm"
            />
            <button
              class="control-btn"
              @click="increase"
              :disabled="inputValue >= max"
            >
              +
            </button>
          </div>
          <div v-if="hint" class="input-hint">{{ hint }}</div>
        </div>

        <div v-if="presets && presets.length > 0" class="preset-buttons">
          <button
            v-for="preset in presets"
            :key="preset"
            class="preset-btn"
            @click="inputValue = preset"
            :disabled="preset > max || preset < min"
          >
            {{ preset }}
          </button>
        </div>
      </div>

      <div class="modal-footer">
        <button class="cancel-btn" @click="handleClose">取消</button>
        <button
          class="confirm-btn"
          @click="handleConfirm"
          :disabled="!isValid"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface Props {
  visible: boolean;
  title?: string;
  description?: string;
  label?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  presets?: number[];
  confirmText?: string;
}

interface Emits {
  (e: 'close'): void;
  (e: 'confirm', value: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  title: '输入数值',
  label: '数值',
  min: 1,
  max: 999,
  step: 1,
  defaultValue: 1,
  confirmText: '确定'
});

const emit = defineEmits<Emits>();

const inputValue = ref(props.defaultValue);
const inputId = computed(() => `number-input-${Math.random().toString(36).substr(2, 9)}`);

const isValid = computed(() => {
  return inputValue.value >= props.min && inputValue.value <= props.max;
});

watch(() => props.visible, (newVal) => {
  if (newVal) {
    inputValue.value = props.defaultValue;
  }
});

watch(() => props.defaultValue, (newVal) => {
  inputValue.value = newVal;
});

const decrease = () => {
  if (inputValue.value > props.min) {
    inputValue.value = Math.max(props.min, inputValue.value - props.step);
  }
};

const increase = () => {
  if (inputValue.value < props.max) {
    inputValue.value = Math.min(props.max, inputValue.value + props.step);
  }
};

const handleClose = () => {
  emit('close');
};

const handleConfirm = () => {
  if (isValid.value) {
    emit('confirm', inputValue.value);
  }
};

const handleOverlayClick = () => {
  handleClose();
};
</script>

<style scoped>
.number-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.number-modal {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 2px solid rgba(106, 156, 255, 0.3);
  border-radius: 12px;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  color: #e0e0e0;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(106, 156, 255, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #6a9cff;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: #888;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.modal-body {
  padding: 24px;
}

.modal-description {
  margin-bottom: 20px;
  color: #b0b0b0;
  font-size: 14px;
  line-height: 1.5;
}

.number-input-group {
  margin-bottom: 16px;
}

.number-input-group label {
  display: block;
  margin-bottom: 8px;
  color: #e0e0e0;
  font-size: 14px;
  font-weight: 500;
}

.input-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-btn {
  width: 36px;
  height: 36px;
  background: rgba(106, 156, 255, 0.1);
  border: 1px solid rgba(106, 156, 255, 0.3);
  border-radius: 6px;
  color: #6a9cff;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover:not(:disabled) {
  background: rgba(106, 156, 255, 0.2);
  border-color: rgba(106, 156, 255, 0.5);
}

.control-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.number-input {
  flex: 1;
  height: 36px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(106, 156, 255, 0.3);
  border-radius: 6px;
  padding: 0 12px;
  color: #e0e0e0;
  font-size: 16px;
  text-align: center;
  transition: all 0.2s;
}

.number-input:focus {
  outline: none;
  border-color: #6a9cff;
  background: rgba(0, 0, 0, 0.4);
}

.input-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #888;
}

.preset-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-btn {
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(106, 156, 255, 0.2);
  border-radius: 6px;
  color: #b0b0b0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover:not(:disabled) {
  background: rgba(106, 156, 255, 0.1);
  border-color: rgba(106, 156, 255, 0.4);
  color: #e0e0e0;
}

.preset-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid rgba(106, 156, 255, 0.2);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn,
.confirm-btn {
  padding: 8px 24px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #b0b0b0;
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #e0e0e0;
}

.confirm-btn {
  background: linear-gradient(135deg, #6a9cff 0%, #4a7fcf 100%);
  color: #fff;
  font-weight: 500;
}

.confirm-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #7aacff 0%, #5a8fdf 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(106, 156, 255, 0.3);
}

.confirm-btn:active:not(:disabled) {
  transform: translateY(0);
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 移除浏览器默认的number input箭头 */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}
</style>
