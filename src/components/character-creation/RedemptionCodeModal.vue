<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-panel">
      <h2 class="modal-title">{{ title }}</h2>
      <p class="modal-subtitle">请输入兑换码以接引天机进行AI推演。</p>
      <form @submit.prevent="submitCode">
        <div class="form-group">
          <input
            v-model="code"
            type="text"
            placeholder="请输入兑换码"
            class="code-input"
            ref="inputRef"
          />
        </div>
        <div v-if="error" class="error-message">{{ error }}</div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            取消
          </button>
          <button type="submit" class="btn" :disabled="!code.trim()">
            确认
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = defineProps<{
  visible: boolean;
  title: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', code: string): void;
}>();

const code = ref('');
const error = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    error.value = '';
    code.value = '';
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
});

const submitCode = () => {
  if (!code.value.trim()) {
    error.value = '兑换码不可为空。';
    return;
  }
  emit('submit', code.value.trim());
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.modal-title {
  margin-top: 0;
  color: var(--color-primary);
  text-align: center;
  margin-bottom: 0.5rem;
}

.modal-subtitle {
  text-align: center;
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.form-group {
  margin-bottom: 1rem;
}

.code-input {
  width: 100%;
  padding: 0.8rem 1rem;
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 1rem;
  box-sizing: border-box;
  text-align: center;
  transition: var(--transition-fast);
}

.code-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 10px rgba(var(--color-primary-rgb), 0.3);
}

.error-message {
  color: var(--color-danger);
  text-align: center;
  margin-bottom: 1rem;
  min-height: 1.2em;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}
</style>