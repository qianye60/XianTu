<template>
  <div class="spirit-root-selector">
    <h3 class="selector-title">【 择定灵根 】</h3>
    <!--
      [ARCHITECT'S NOTE] Temporarily disabling the custom/AI panel.
      The underlying logic was lost during a previous file operation.
      This section is preserved but commented out to allow for future restoration.
    <div class="custom-section">
      <button @click="toggleCustomPanel" class="toggle-btn">
        {{ isCustomPanelOpen ? '收起自定义' : '展开自定义' }}
      </button>
      <div v-if="isCustomPanelOpen" class="custom-panel">
        <div class="section-actions">
          <button @click="generateAISpiritRoots" class="btn btn-ai" :disabled="isGenerating">
            {{ isGenerating ? 'AI生成中...' : 'AI生成灵根' }}
          </button>
          <button @click="addCustomSpiritRoot" class="btn btn-sm">手动添加</button>
        </div>
        <div v-if="customSpiritRoots.length > 0" class="custom-items">
          <div v-for="(root, index) in customSpiritRoots" :key="index" class="custom-item">
            <input v-model="root.name" placeholder="灵根名称" class="item-input" />
            <textarea
              v-model="root.description"
              placeholder="灵根描述"
              class="item-textarea"
            ></textarea>
            <input
              v-model.number="root.base_multiplier"
              type="number"
              step="0.1"
              placeholder="基础倍率"
              class="item-input small"
            />
            <button @click="removeCustomSpiritRoot(index)" class="btn btn-danger btn-sm">
              删除
            </button>
          </div>
        </div>
        <button @click="applyCustomSpiritRoots" class="btn btn-primary">应用自定义灵根</button>
      </div>
    </div>
    -->
    <div class="intro-text">
      <p>道友，天地灵根千千万万，缘分天定。请抽取三根灵根，择其一而定。</p>
    </div>

    <!-- 抽取结果 -->
    <div v-if="drawnRoots.length > 0" class="roots-grid">
      <div
        v-for="root in drawnRoots"
        :key="root.id"
        class="root-card"
        :class="{ selected: modelValue?.id === root.id }"
        @click="selectRoot(root)"
      >
        <h4 class="root-name">{{ root.name }}</h4>
        <p class="root-desc">{{ root.description }}</p>
        <div v-if="root.effects" class="root-effects">
          <span class="effects-label">灵根效果:</span>
          <span class="effects-text">{{ formatEffects(root.effects) }}</span>
        </div>
      </div>
    </div>

    <!-- 抽取按钮 -->
    <div class="action-buttons">
      <button
        @click="drawRoots"
        class="dao-btn draw-btn"
        :disabled="isDrawing"
      >
        {{ drawnRoots.length > 0 ? '重新抽取灵根' : '抽取灵根' }}
        {{ isDrawing ? '(抽取中...)' : '' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import _ from 'lodash'
import type { SpiritRoot } from '@/core/rules/characterCreation'

// [ARCHITECT'S NOTE] The import for 'generateTavernAI' was removed as it was causing a compile error.
// The associated functionality has been temporarily disabled in the template.
// import { generateTavernAI } from '@/services/tavern'

const props = defineProps<{
  modelValue: SpiritRoot | null
  spiritRoots: SpiritRoot[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SpiritRoot | null]
  'update:spiritRoots': [value: SpiritRoot[]]
}>()

const drawnRoots = ref<SpiritRoot[]>([])
const isDrawing = ref(false)

const selectRoot = (root: SpiritRoot) => {
  emit('update:modelValue', root)
}

const drawRoots = async () => {
  if (props.spiritRoots.length === 0) return

  isDrawing.value = true

  // 模拟抽取过程的延迟
  await new Promise(resolve => setTimeout(resolve, 800))

  // 随机抽取3个灵根
  const numToDraw = Math.min(3, props.spiritRoots.length)
  drawnRoots.value = _.sampleSize(props.spiritRoots, numToDraw)

  // 清除之前的选择
  emit('update:modelValue', null)

  isDrawing.value = false
}

// 格式化灵根效果显示
const formatEffects = (effects: any): string => {
  if (!effects) return '无特殊效果'

  if (typeof effects === 'string' && !effects.startsWith('{') && !effects.startsWith('[')) {
    return effects
  }

  let parsedEffects: any = effects
  if (typeof effects === 'string') {
    try {
      parsedEffects = JSON.parse(effects)
    } catch (e) {
      return effects
    }
  }

  if (Array.isArray(parsedEffects)) {
    return parsedEffects
      .map((effect: any) => {
        if (effect.type === 'ATTRIBUTE_MODIFIER') {
          const attrNames: Record<string, string> = {
            CON: '根骨',
            INT: '悟性',
            SPI: '神识',
            LUK: '气运',
            CHA: '仪容',
            BKG: '家世',
          }
          const attrName = attrNames[effect.target] || effect.target
          const value = effect.value > 0 ? `+${effect.value}` : `${effect.value}`
          return `${attrName} ${value}`
        }
        return JSON.stringify(effect)
      })
      .join(', ')
  }

  return String(parsedEffects)
}

// 当灵根数据加载时自动抽取一次
watch(
  () => props.spiritRoots,
  (newRoots) => {
    if (newRoots && newRoots.length > 0 && drawnRoots.value.length === 0) {
      drawRoots()
    }
  },
  { deep: true, immediate: true }
)

/*
  [ARCHITECT'S NOTE] The following logic for custom/AI spirit roots has been commented out
  to prevent compile errors. It can be restored when the underlying features are fixed.

const isCustomPanelOpen = ref(false)
const isGenerating = ref(false)
const customSpiritRoots = ref<Partial<SpiritRoot>[]>([])

const toggleCustomPanel = () => {
  isCustomPanelOpen.value = !isCustomPanelOpen.value
}

const generateAISpiritRoots = async () => {
  if (isGenerating.value) return
  isGenerating.value = true
  try {
    const prompt = `生成三个仙侠风格的灵根，每个灵根包含名称(name)、描述(description)和基础倍率(base_multiplier)，例如：1.3。以JSON数组格式返回。`;
    // const aiResult = await generateTavernAI(prompt);
    // const aiSpiritRoots = JSON.parse(aiResult);
    // customSpiritRoots.value.push(...aiSpiritRoots);
    console.log("AI generation is currently disabled.");
  } catch (error) {
    console.error('AI生成灵根失败:', error)
  } finally {
    isGenerating.value = false
  }
}

const addCustomSpiritRoot = () => {
  customSpiritRoots.value.push({
    name: '',
    description: '',
    base_multiplier: 1.0,
  })
}

const removeCustomSpiritRoot = (index: number) => {
  customSpiritRoots.value.splice(index, 1)
}

const applyCustomSpiritRoots = () => {
  const validSpiritRoots: SpiritRoot[] = customSpiritRoots.value
    .filter((r): r is { name: string, description: string } & Partial<SpiritRoot> => !!r.name && !!r.description)
    .map((r, index) => ({
      id: `custom-${Date.now()}-${index}`,
      name: r.name!,
      description: r.description!,
      base_multiplier: r.base_multiplier || 1.0,
      aptitude: 0, // Default aptitude for custom roots
      type: 'spirit_root',
      effects: '' // Default effects
    }))

  emit('update:spiritRoots', [...props.spiritRoots, ...validSpiritRoots])
  customSpiritRoots.value = []
  isCustomPanelOpen.value = false
}
*/
</script>

<style scoped>
.spirit-root-selector {
  width: 100%;
}

.selector-title {
  text-align: center;
  color: var(--color-primary);
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  font-family: var(--font-family-serif);
  font-weight: bold;
}

.intro-text {
  text-align: center;
  margin-bottom: 2rem;
}

.intro-text p {
  color: var(--color-text-secondary);
  font-size: 1rem;
  line-height: 1.6;
  font-style: italic;
  margin: 0;
}

.roots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.root-card {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: center;
}

.root-card:hover {
  transform: translateY(-3px);
  border-color: var(--color-primary);
  box-shadow: 0 6px 20px rgba(var(--color-primary-rgb), 0.2);
}

.root-card.selected {
  border-color: var(--color-primary);
  background: var(--color-surface-light);
  box-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.3);
}

.root-name {
  font-size: 1.3rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: var(--color-text);
  font-family: var(--font-family-serif);
}

.root-card.selected .root-name {
  color: var(--color-primary);
}

.root-desc {
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin: 0 0 1rem 0;
  line-height: 1.5;
  flex-grow: 1;
}

.root-card.selected .root-desc {
  color: var(--color-text);
}

.root-effects {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.effects-label {
  font-size: 0.85rem;
  color: var(--color-accent);
  font-weight: bold;
  font-family: var(--font-family-serif);
}

.effects-text {
  font-size: 0.9rem;
  color: var(--color-primary);
  font-weight: 500;
  background: rgba(var(--color-primary-rgb), 0.1);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border-left: 3px solid var(--color-primary);
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.dao-btn {
  background: transparent;
  border: 2px solid var(--color-primary);
  color: var(--color-primary);
  padding: 0.75rem 2rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: var(--font-family-serif);
  font-size: 1rem;
  font-weight: bold;
}

.dao-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: var(--color-background);
  box-shadow: 0 0 15px rgba(var(--color-primary-rgb), 0.4);
}

.dao-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.draw-btn {
  min-width: 160px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .roots-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .root-card {
    min-height: 150px;
    padding: 1.5rem;
  }

  .selector-title {
    font-size: 1.3rem;
    margin-bottom: 1rem;
  }

  .intro-text {
    margin-bottom: 1.5rem;
  }

  .dao-btn {
    padding: 0.6rem 1.5rem;
    font-size: 0.9rem;
  }
}
</style>
