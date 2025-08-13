<template>
  <div class="birth-origin-selector">
    <h3 class="selector-title">【 选择出身 】</h3>
    <div class="custom-section">
      <button @click="toggleCustomPanel" class="toggle-btn">
        {{ isCustomPanelOpen ? '收起自定义' : '展开自定义' }}
      </button>
      <div v-if="isCustomPanelOpen" class="custom-panel">
        <div class="section-actions">
          <button @click="generateAIOrigins" class="btn btn-ai" :disabled="isGenerating">
            {{ isGenerating ? 'AI生成中...' : 'AI生成出身' }}
          </button>
          <button @click="addCustomOrigin" class="btn btn-sm">手动添加</button>
        </div>
        <div v-if="customOrigins.length > 0" class="custom-items">
          <div v-for="(origin, index) in customOrigins" :key="index" class="custom-item">
            <input v-model="origin.name" placeholder="出身名称" class="item-input" />
            <textarea
              v-model="origin.description"
              placeholder="出身描述"
              class="item-textarea"
            ></textarea>
            <button @click="removeCustomOrigin(index)" class="btn btn-danger btn-sm">删除</button>
          </div>
        </div>
        <button @click="applyCustomOrigins" class="btn btn-primary">应用自定义出身</button>
      </div>
    </div>
    <div class="origins-grid">
      <div
        v-for="origin in origins"
        :key="origin.id"
        class="origin-card"
        :class="{ selected: modelValue?.id === origin.id }"
        @click="selectOrigin(origin)"
      >
        <h4 class="origin-name">{{ origin.name }}</h4>
        <p class="origin-desc">{{ origin.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCoreSettings, generateAIContent } from '@/services/api'
import type { Origin } from '@/core/rules/characterCreation'

const props = defineProps<{
  modelValue: Origin | null
  origins: Origin[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Origin | null]
  'update:origins': [value: Origin[]]
}>()

const selectOrigin = (origin: Origin) => {
  emit('update:modelValue', origin)
}

const isCustomPanelOpen = ref(false)
const isGenerating = ref(false)
const customOrigins = ref<Partial<Origin>[]>([])

const toggleCustomPanel = () => {
  isCustomPanelOpen.value = !isCustomPanelOpen.value
}

const generateAIOrigins = async () => {
  if (isGenerating.value) return
  isGenerating.value = true
  try {
    const settings = await getCoreSettings();
    const prompt = `根据以下游戏设定，生成三个仙侠风格的角色出身：\n\n**属性说明:**\n${JSON.stringify(settings.attributes, null, 2)}\n\n**修仙元素:**\n${settings.cultivation_elements.join(', ')}\n\n每个出身需包含名称(name)、描述(description)和属性修正(attributeModifiers)，例如：{ INT: 2, SPI: 1, LUK: 1 }。以JSON数组格式返回。`;
    const aiResult = await generateAIContent(prompt);
    const aiOrigins = JSON.parse(aiResult);
    customOrigins.value.push(...aiOrigins);
  } catch (error) {
    console.error('AI生成出身失败:', error)
  } finally {
    isGenerating.value = false
  }
}

const addCustomOrigin = () => {
  customOrigins.value.push({
    name: '',
    description: '',
    attributeModifiers: {},
  })
}

const removeCustomOrigin = (index: number) => {
  customOrigins.value.splice(index, 1)
}

const applyCustomOrigins = () => {
  const validOrigins: Origin[] = customOrigins.value
    .filter(o => o.name && o.description)
    .map((o, index) => ({
      id: `custom-${Date.now()}-${index}`,
      name: o.name!,
      description: o.description!,
      attributeModifiers: o.attributeModifiers || {},
      type: 'origin',
    }))

  emit('update:origins', [...(props.origins || []), ...validOrigins])
  customOrigins.value = []
  isCustomPanelOpen.value = false
}
</script>

<style scoped>
.birth-origin-selector {
  width: 100%;
}

.selector-title {
  text-align: center;
  color: var(--color-primary);
  margin-bottom: 2rem;
  font-size: 1.5rem;
  font-family: var(--font-family-serif);
  font-weight: bold;
}

.origins-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
}

.origin-card {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  min-width: 250px;
  flex: 1;
  max-width: 350px;
}

.origin-card:hover {
  transform: translateY(-3px);
  border-color: var(--color-primary);
  box-shadow: 0 6px 20px rgba(var(--color-primary-rgb), 0.2);
}

.origin-card.selected {
  border-color: var(--color-primary);
  background: var(--color-surface-light);
  box-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.3);
}

.origin-name {
  font-size: 1.4rem;
  color: var(--color-text);
  margin-bottom: 1rem;
  font-family: var(--font-family-serif);
  font-weight: bold;
}

.origin-card.selected .origin-name {
  color: var(--color-primary);
}

.origin-desc {
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
  line-height: 1.6;
  font-style: italic;
}

.origin-card.selected .origin-desc {
  color: var(--color-text);
}

.origin-story {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .origins-grid {
    flex-direction: column;
    align-items: center;
  }

  .origin-card {
    width: 100%;
    max-width: 400px;
    min-width: unset;
    padding: 1.5rem;
  }

  .selector-title {
    font-size: 1.3rem;
    margin-bottom: 1.5rem;
  }

  .origin-name {
    font-size: 1.2rem;
  }
}
</style>
