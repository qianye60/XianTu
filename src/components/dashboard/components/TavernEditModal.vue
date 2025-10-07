<template>
  <div v-if="editingItem" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ localEditingItem.key ? '编辑变量' : '新增变量' }}</h3>
        <button @click="$emit('close')" class="close-btn">
          <X :size="16" />
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>变量名 (Key)</label>
          <input
            v-model="localEditingItem.key"
            class="form-input"
            :disabled="!!editingItem.key"
            placeholder="请输入变量名"
          />
          <p v-if="!!editingItem.key" class="form-hint-text">
            ℹ️ 编辑模式下无法修改变量名
          </p>
        </div>
        <div class="form-group">
          <label>变量值 (Value)</label>
          <div class="value-type-selector">
            <button
              v-for="type in valueTypes"
              :key="type.value"
              @click="selectValueType(type.value as 'string' | 'number' | 'boolean' | 'object' | 'array')"
              :class="['type-btn', { active: selectedType === type.value }]"
            >
              {{ type.label }}
            </button>
          </div>
          <textarea
            v-model="editingValue"
            class="form-textarea"
            :class="{ 'has-error': jsonError }"
            rows="10"
            :placeholder="getPlaceholder()"
          ></textarea>
          <div v-if="jsonError" class="error-message">
            ⚠️ {{ jsonError }}
          </div>
          <div v-else class="form-hint">
            <p>{{ getHintText() }}</p>
          </div>
        </div>
        <div class="preview-section" v-if="previewData">
          <label>预览</label>
          <pre class="preview-content">{{ previewData }}</pre>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="$emit('close')" class="cancel-btn">取消</button>
        <button
          @click="handleSave"
          class="save-btn"
          :disabled="!canSave"
        >
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

const emit = defineEmits<{
  close: []
  save: [item: EditingItem]
}>()

const localEditingItem = ref<EditingItem>({ type: '', key: '', value: '' })
const selectedType = ref<'string' | 'number' | 'boolean' | 'object' | 'array'>('string')
const jsonError = ref('')

// 值类型选项
const valueTypes = [
  { value: 'string', label: '字符串' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔值' },
  { value: 'object', label: '对象' },
  { value: 'array', label: '数组' }
]

const editingValue = computed({
  get: () => {
    if (!localEditingItem.value) return ''
    const value = localEditingItem.value.value

    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2)
    }
    return String(value ?? '')
  },
  set: (value: string) => {
    if (localEditingItem.value) {
      localEditingItem.value.value = value
      validateJSON()
    }
  }
})

// 预览数据
const previewData = computed(() => {
  if (jsonError.value || !editingValue.value) return null

  try {
    if (selectedType.value === 'object' || selectedType.value === 'array') {
      const parsed = JSON.parse(editingValue.value)
      return JSON.stringify(parsed, null, 2)
    }
    return null
  } catch {
    return null
  }
})

// 是否可以保存
const canSave = computed(() => {
  return localEditingItem.value.key.trim() !== '' &&
         editingValue.value.trim() !== '' &&
         !jsonError.value
})

// 验证 JSON
const validateJSON = () => {
  jsonError.value = ''

  if (!editingValue.value.trim()) {
    return
  }

  if (selectedType.value === 'object' || selectedType.value === 'array') {
    try {
      const parsed = JSON.parse(editingValue.value)

      if (selectedType.value === 'array' && !Array.isArray(parsed)) {
        jsonError.value = '期望是数组类型，但解析结果不是数组'
      } else if (selectedType.value === 'object' && (Array.isArray(parsed) || typeof parsed !== 'object')) {
        jsonError.value = '期望是对象类型，但解析结果不是对象'
      }
    } catch (e) {
      jsonError.value = 'JSON 格式错误: ' + (e instanceof Error ? e.message : '未知错误')
    }
  }
}

// 选择值类型
const selectValueType = (type: typeof selectedType.value) => {
  selectedType.value = type

  // 自动填充默认值
  if (!editingValue.value) {
    switch (type) {
      case 'string':
        editingValue.value = ''
        break
      case 'number':
        editingValue.value = '0'
        break
      case 'boolean':
        editingValue.value = 'true'
        break
      case 'object':
        editingValue.value = '{}'
        break
      case 'array':
        editingValue.value = '[]'
        break
    }
  }

  validateJSON()
}

// 获取占位符文本
const getPlaceholder = () => {
  switch (selectedType.value) {
    case 'string':
      return '请输入字符串值，例如: Hello World'
    case 'number':
      return '请输入数字值，例如: 123 或 3.14'
    case 'boolean':
      return '请输入 true 或 false'
    case 'object':
      return '请输入 JSON 对象，例如: {"name": "张三", "age": 25}'
    case 'array':
      return '请输入 JSON 数组，例如: [1, 2, 3] 或 ["a", "b", "c"]'
    default:
      return '请输入值'
  }
}

// 获取提示文本
const getHintText = () => {
  switch (selectedType.value) {
    case 'string':
      return '✅ 直接输入文本内容即可'
    case 'number':
      return '✅ 输入数字，支持整数和小数'
    case 'boolean':
      return '✅ 输入 true 或 false'
    case 'object':
      return '✅ 使用 JSON 格式，例如: {"key": "value"}'
    case 'array':
      return '✅ 使用 JSON 数组格式，例如: [1, 2, 3]'
    default:
      return '支持字符串、数字、布尔值、对象和数组'
  }
}

// 保存处理
const handleSave = () => {
  if (!canSave.value) return

  // 更新 localEditingItem 的值为正确的类型
  try {
    let finalValue: any = editingValue.value

    switch (selectedType.value) {
      case 'number':
        finalValue = Number(editingValue.value)
        if (isNaN(finalValue)) {
          jsonError.value = '无效的数字格式'
          return
        }
        break
      case 'boolean':
        finalValue = editingValue.value.toLowerCase() === 'true'
        break
      case 'object':
      case 'array':
        finalValue = JSON.parse(editingValue.value)
        break
      case 'string':
      default:
        finalValue = editingValue.value
        break
    }

    localEditingItem.value.value = finalValue
    emit('save', localEditingItem.value)
  } catch (e) {
    jsonError.value = '保存失败: ' + (e instanceof Error ? e.message : '未知错误')
  }
}

// 检测值类型
const detectValueType = (value: any) => {
  if (value === null || value === undefined) return 'string'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  return 'string'
}

watch(() => props.editingItem, (newItem) => {
  if (newItem) {
    localEditingItem.value = { ...newItem }
    selectedType.value = detectValueType(newItem.value)
    jsonError.value = ''
    validateJSON()
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

.form-hint-text {
  margin: 0.25rem 0 0 0;
  font-size: 0.75rem;
  color: var(--color-info);
}

.value-type-selector {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.type-btn {
  padding: 0.375rem 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s;
}

.type-btn:hover {
  background: var(--color-hover);
  border-color: var(--color-primary);
  color: var(--color-text);
}

.type-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
  font-weight: 500;
}

.form-textarea.has-error {
  border-color: var(--color-danger);
}

.error-message {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--color-danger);
  border-radius: 4px;
  color: var(--color-danger);
  font-size: 0.75rem;
}

.form-hint {
  margin-top: 0.5rem;
}

.form-hint p {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-success);
}

.preview-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.preview-section label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--color-text);
  font-size: 0.875rem;
}

.preview-content {
  margin: 0;
  padding: 0.75rem;
  background: var(--color-code-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.75rem;
  font-family: 'Consolas', 'Monaco', monospace;
  max-height: 150px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
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

.save-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
