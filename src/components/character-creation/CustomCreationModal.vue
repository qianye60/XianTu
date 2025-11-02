<template>
  <transition name="modal-fade">
    <div v-if="visible" class="modal-overlay" @click.self="close">
      <div class="modal-dialog">
        <h2 class="modal-title">{{ title }}</h2>

        <div class="form-fields">
          <div v-for="field in visibleFields" :key="field.key" class="form-group">
            <label :for="field.key">{{ field.label }}</label>
            <input
              v-if="field.type === 'text' || field.type === 'color' || field.type === 'number'"
              :id="field.key"
              v-model="formData[field.key]"
              :placeholder="field.placeholder"
              :type="field.type"
            />
            <textarea
              v-else-if="field.type === 'textarea'"
              :id="field.key"
              v-model="formData[field.key]"
              :placeholder="field.placeholder"
              rows="5"
            ></textarea>
            <select
              v-else-if="field.type === 'select'"
              :id="field.key"
              v-model="formData[field.key]"
            >
              <option v-for="opt in field.options" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <!-- 动态列表字段 -->
            <div v-else-if="field.type === 'dynamic-list'" class="dynamic-list-container">
              <div class="list-header">
                <span>{{ field.label }}</span>
                <button @click="addListItem(field)" class="add-btn" type="button">+ {{ $t('添加') }}</button>
              </div>
              <div v-if="Array.isArray(formData[field.key]) && (formData[field.key] as unknown[]).length > 0" class="list-items">
                <div v-for="(item, index) in (formData[field.key] as Record<string, unknown>[])" :key="index" class="list-item">
                  <div class="item-inputs">
                    <select v-if="field.columns[0].type === 'select'" v-model="(item as any)[field.columns[0].key]" class="item-input">
                      <option v-for="opt in field.columns[0].options" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                    <input v-else v-model="(item as any)[field.columns[0].key]" :placeholder="field.columns[0].placeholder" class="item-input" />
                    
                    <input v-if="field.columns[1]" v-model="(item as any)[field.columns[1].key]" :placeholder="field.columns[1].placeholder" class="item-input" />
                    <input v-if="field.columns[2]" v-model="(item as any)[field.columns[2].key]" :placeholder="field.columns[2].placeholder" class="item-input" type="number" step="0.1" />
                  </div>
                  <button @click="removeListItem(field, index)" class="remove-btn" type="button">×</button>
                </div>
              </div>
              <div v-else class="empty-list">
                <span>{{ $t('暂无数据') }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="errors.length" class="error-messages">
          <p v-for="(error, index) in errors" :key="index">* {{ error }}</p>
        </div>

        <div class="modal-actions">
          <button @click="close" class="btn btn-secondary">{{ $t('关闭') }}</button>
          <button @click="submit" class="btn">{{ $t('确认') }}</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';

type BaseField = {
  key: string;
  label: string;
  placeholder?: string;
  condition?: (data: Record<string, unknown>) => boolean;
};

type InputField = BaseField & { type: 'text' | 'textarea' | 'color' | 'number' };
type SelectField = BaseField & { type: 'select'; options: readonly { value: string; label: string }[] };
type DynamicListField = BaseField & {
  type: 'dynamic-list';
  columns: {
    key: string;
    placeholder?: string;
    type?: 'text' | 'select';
    options?: readonly { value: string; label: string }[];
  }[];
};
export type ModalField = InputField | SelectField | DynamicListField;

const props = defineProps<{
  visible: boolean;
  title: string;
  fields: readonly ModalField[];
  validationFn: (data: Record<string, unknown>) => { valid: boolean; errors: string[] };
  initialData?: Record<string, unknown>; // 新增：用于编辑模式的初始数据
}>();

const emit = defineEmits(['close', 'submit']);

const formData = ref<Record<string, unknown>>({});
const errors = ref<string[]>([]);

// Computed property to filter visible fields based on conditions
const visibleFields = computed(() => {
  return props.fields.filter(field => {
    if (!field.condition) return true;
    return field.condition(formData.value);
  });
});

// Initialize form data when fields change or when initialData is provided
watch(() => [props.fields, props.initialData] as const, ([newFields, initialData]) => {
  const newFormData: Record<string, unknown> = {};

  newFields.forEach((field) => {
    const initialValue = initialData?.[field.key];
    if (field.type === 'select') {
      newFormData[field.key] = initialValue ?? field.options?.[0]?.value ?? '';
    } else if (field.type === 'dynamic-list') {
      // Ensure we have an array, deep copy if it exists to avoid mutation of props
      newFormData[field.key] = Array.isArray(initialValue) ? JSON.parse(JSON.stringify(initialValue)) : [];
    } else {
      newFormData[field.key] = initialValue ?? '';
    }
  });
  formData.value = newFormData;
}, { immediate: true, deep: true });

function addListItem(field: DynamicListField) {
  const list = formData.value[field.key];
  if (!Array.isArray(list)) {
    // If it's not an array, initialize it as an empty one.
    formData.value[field.key] = [];
  }
  
  const newItem: Record<string, string | number> = {};
  field.columns.forEach(column => {
    if (column.type === 'select' && column.options) {
      newItem[column.key] = column.options[0]?.value || '';
    } else {
      newItem[column.key] = '';
    }
  });
  
  // After ensuring it's an array, we can safely push.
  (formData.value[field.key] as unknown[]).push(newItem);
}

function removeListItem(field: DynamicListField, index: number) {
  const list = formData.value[field.key];
  if (Array.isArray(list)) {
    list.splice(index, 1);
  }
}

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

.modal-dialog {
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-radius: 12px;
  padding: 2rem;
  overflow: hidden;
}

.modal-title {
  margin-top: 0;
  color: var(--color-primary);
  text-align: center;
  margin-bottom: 1.5rem;
  flex-shrink: 0;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
  overflow-y: auto;
  flex: 1;
  padding-right: 0.5rem;
}

.form-fields::-webkit-scrollbar {
  width: 8px;
}

.form-fields::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.form-fields::-webkit-scrollbar-thumb {
  background: rgba(var(--color-primary-rgb), 0.3);
  border-radius: 4px;
}

.form-fields::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--color-primary-rgb), 0.5);
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 1rem;
  transition: var(--transition-fast);
}

input[type="color"] {
  padding: 0.25rem;
  height: 2.5rem;
}

input[type="color"] {
  padding: 0.25rem;
  height: 2.5rem;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 10px rgba(var(--color-primary-rgb), 0.3);
}

.error-messages {
    color: var(--color-danger);
    margin-bottom: 1rem;
    font-size: 0.9rem;
    flex-shrink: 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
  flex-shrink: 0;
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

/* 动态列表样式 */
.dynamic-list-container {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface-light);
  padding: 1rem;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.add-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.add-btn:hover {
  background: var(--color-primary-dark);
}

.list-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.item-inputs {
  display: flex;
  gap: 0.5rem;
  flex: 1;
}

.item-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.9rem;
}

.item-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 5px rgba(var(--color-primary-rgb), 0.3);
}

.remove-btn {
  background: var(--color-danger);
  color: white;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.remove-btn:hover {
  background: #dc2626;
  transform: scale(1.1);
}

.empty-list {
  text-align: center;
  color: var(--color-text-secondary);
  font-style: italic;
  padding: 2rem;
}

@media (max-width: 600px) {
  .modal-dialog {
    padding: 1.5rem;
    width: 95%;
    max-height: 90vh;
  }
  .item-inputs {
    flex-direction: column;
  }
  .modal-actions {
    flex-direction: column-reverse;
    gap: 0.5rem;
  }
  .modal-actions .btn {
    width: 100%;
  }
}
</style>
