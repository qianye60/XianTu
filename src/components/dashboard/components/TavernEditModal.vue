<template>
  <div v-if="editingItem" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>编辑变量</h3>
        <button @click="$emit('close')" class="close-btn">
          <X :size="16" />
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Key</label>
          <input v-model="localEditingItem.key" class="form-input" />
        </div>
        <div class="form-group">
          <label>Value</label>
          <textarea
            v-model="editingValue"
            class="form-textarea"
            rows="10"
            placeholder="JSON格式或字符串"
          ></textarea>
        </div>
        <div class="form-hint">
          <p>Supports JSON objects/arrays, or plain strings/numbers</p>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="$emit('close')" class="cancel-btn">取消</button>
        <button @click="$emit('save')" class="save-btn">
          <Save :size="14" />
          <span>保存</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X, Save } from 'lucide-vue-next'

interface EditingItem {
  type: string
  key: string
  value: any
}

interface Props {
  editingItem: EditingItem | null
}

const props = defineProps<Props>()

defineEmits<{
  close: []
  save: []
}>()

const localEditingItem = ref<EditingItem>({ type: '', key: '', value: '' })

const editingValue = computed({
  get: () => {
    if (!localEditingItem.value) return ''
    return typeof localEditingItem.value.value === 'object'
      ? JSON.stringify(localEditingItem.value.value, null, 2)
      : String(localEditingItem.value.value)
  },
  set: (value: string) => {
    if (localEditingItem.value) {
      localEditingItem.value.value = value
    }
  }
})

watch(() => props.editingItem, (newItem) => {
  if (newItem) {
    localEditingItem.value = { ...newItem }
  }
}, { immediate: true })
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--color-background);
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--color-hover);
  color: var(--color-text);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--color-text);
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: var(--color-primary);
}

.form-textarea {
  width: 100%;
  min-height: 150px;
  padding: 0.75rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.875rem;
  font-family: 'Consolas', 'Monaco', monospace;
  outline: none;
  transition: border-color 0.2s;
  resize: vertical;
}

.form-textarea:focus {
  border-color: var(--color-primary);
}

.form-hint {
  margin-top: 0.5rem;
}

.form-hint p {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.cancel-btn {
  padding: 0.75rem 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: var(--color-hover);
  border-color: var(--color-text-secondary);
  color: var(--color-text);
}

.save-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--color-primary);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.save-btn:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
}
</style>
