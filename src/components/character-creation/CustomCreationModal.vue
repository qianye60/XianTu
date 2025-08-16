<template>
  <transition name="modal-fade">
    <div v-if="visible" class="modal-overlay" @click.self="close">
      <div class="modal-content">
        <h2 class="modal-title">{{ title }}</h2>
        
        <div class="form-fields">
          <div v-for="field in fields" :key="field.key" class="form-group">
            <label :for="field.key">{{ field.label }}</label>
            <input 
              v-if="field.type === 'text'"
              :id="field.key"
              v-model="formData[field.key]"
              :placeholder="field.placeholder"
              type="text"
            />
            <textarea 
              v-if="field.type === 'textarea'"
              :id="field.key"
              v-model="formData[field.key]"
              :placeholder="field.placeholder"
              rows="5"
            ></textarea>
          </div>
        </div>

        <div v-if="errors.length" class="error-messages">
          <p v-for="(error, index) in errors" :key="index">* {{ error }}</p>
        </div>

        <div class="modal-actions">
          <button @click="close" class="btn btn-secondary">关闭</button>
          <button @click="submit" class="btn">确认</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from 'vue';

const props = defineProps<{
  visible: boolean;
  title: string;
  fields: readonly {
    key: string;
    label: string;
    type: 'text' | 'textarea';
    placeholder?: string;
  }[];
  validationFn: (data: any) => { valid: boolean; errors: string[] };
}>();

const emit = defineEmits(['close', 'submit']);

const formData = ref<Record<string, any>>({});
const errors = ref<string[]>([]);

// Initialize form data when fields change
watch(() => props.fields, (newFields) => {
  formData.value = {};
  newFields.forEach(field => {
    formData.value[field.key] = '';
  });
}, { immediate: true });

function close() {
  emit('close');
}

function submit() {
  errors.value = [];
  const validationResult = props.validationFn(formData.value);
  if (validationResult.valid) {
    emit('submit', { ...formData.value });
    close();
  } else {
    errors.value = validationResult.errors;
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
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: var(--color-surface);
  border: 1px solid var(--color-primary);
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

.modal-title {
  margin-top: 0;
  color: var(--color-primary);
  text-align: center;
  margin-bottom: 1.5rem;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 1rem;
  transition: var(--transition-fast);
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 10px rgba(var(--color-primary-rgb), 0.3);
}

.error-messages {
    color: var(--color-danger);
    margin-bottom: 1rem;
    font-size: 0.9rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

/* Transition styles */
.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.3s ease;
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-active .modal-content,
.modal-fade-leave-active .modal-content {
  transition: transform 0.3s ease;
}
.modal-fade-enter-from .modal-content,
.modal-fade-leave-to .modal-content {
  transform: scale(0.9);
}
</style>