<template>
  <div class="spirit-root-revelation">
    <div class="revelation-container">
      <div v-if="!revealedRoot && !isRevealing" class="pre-revelation">
        <h4 class="revelation-title">天命启示</h4>
        <p class="revelation-desc">联机共修模式下，灵根由汝之命格（出身与天赋）感召天地而成，非人力可强择。请静心凝神，感应天命。</p>
        <button @click="revealSpiritRoot" class="dao-btn reveal-btn">
          <i class="lucide-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
          </i>
          感应天命
        </button>
      </div>

      <div v-if="isRevealing" class="revealing-process">
        <div class="lingqi-animation"></div>
        <p class="revealing-text">天机推演中，请稍候...</p>
      </div>

      <div v-if="revealedRoot" class="post-revelation">
        <h4 class="revelation-title">天命已定</h4>
        <div class="root-card revealed">
          <h4 class="root-name">{{ revealedRoot.name }}</h4>
          <p class="root-desc">{{ revealedRoot.description }}</p>
          <div v-if="revealedRoot.effects" class="root-effects">
            <span class="effects-label">灵根效果:</span>
            <span class="effects-text">{{ formatEffects(revealedRoot.effects) }}</span>
          </div>
        </div>
        <button @click="revealSpiritRoot" class="dao-btn reroll-btn">逆天改命 (重试)</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCreationStore } from '@/stores/creation'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { generateAIContent } from '@/services/api'
import type { SpiritRoot } from '@/core/rules/characterCreation'
import { CORE_ATTRIBUTES } from '@/core/rules/characterCreation'

const store = useCreationStore()
const { stepModels } = storeToRefs(store)
const { showToast } = useToast()

const isRevealing = ref(false)
const revealedRoot = ref<SpiritRoot | null>(null)

const revealSpiritRoot = async () => {
  isRevealing.value = true
  revealedRoot.value = null
  store.setStepData('spirit-root', null)

  try {
    const { origin, talents } = stepModels.value
    const prompt = `
      根据以下角色设定，为其生成一个独特的仙侠灵根。
      要求返回一个包含 name, description, effects 的JSON对象。
      effects应为描述性文字。

      角色出身: ${origin?.name} - ${origin?.description}
      角色天赋: ${talents?.map(t => t.name).join(', ')}
    `
    const aiResult = await generateAIContent(prompt)
    const generatedRoot = JSON.parse(aiResult) as Omit<SpiritRoot, 'id' | 'type' | 'aptitude' | 'base_multiplier'>

    const finalRoot: SpiritRoot = {
      ...generatedRoot,
      id: `ai-${Date.now()}`,
      type: 'spirit_root',
      aptitude: 100, // AI生成的默认为中等
      base_multiplier: 1.0,
    }

    revealedRoot.value = finalRoot
    store.setStepData('spirit-root', finalRoot)
    showToast({ title: '天命已昭', message: `你获得了 ${finalRoot.name}!`, type: 'success' })

  } catch (error) {
    console.error('灵根显化失败:', error)
    showToast({ title: '天机混沌', message: '感应天命失败，请再试一次。', type: 'error' })
  } finally {
    isRevealing.value = false
  }
}

const formatEffects = (effects: any): string => {
  if (!effects) return '无特殊效果'
  if (typeof effects === 'string' && !effects.startsWith('{') && !effects.startsWith('[')) return effects

  let parsedEffects: any = effects
  if (typeof effects === 'string') {
    try {
      parsedEffects = JSON.parse(effects)
    } catch (e) {
      return effects
    }
  }
  
  if (Array.isArray(parsedEffects)) {
    return parsedEffects.map(e => e.description || JSON.stringify(e)).join('，')
  }
  
  if(typeof parsedEffects === 'object' && parsedEffects.description) {
    return parsedEffects.description
  }

  return String(effects)
}
</script>

<style scoped>
.spirit-root-revelation {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  width: 100%;
}

.revelation-container {
  text-align: center;
  padding: 2rem;
  background: var(--color-surface-light);
  border-radius: 16px;
  border: 1px solid var(--color-border);
  max-width: 500px;
  width: 100%;
}

.revelation-title {
  font-size: 1.5rem;
  color: var(--color-primary);
  font-family: var(--font-family-serif);
  margin-bottom: 1rem;
}

.revelation-desc {
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin-bottom: 2rem;
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
  font-size: 1.1rem;
  font-weight: bold;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.dao-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: var(--color-background);
  box-shadow: 0 0 15px rgba(var(--color-primary-rgb), 0.4);
}

.reroll-btn {
  margin-top: 1.5rem;
  border-color: var(--color-accent);
  color: var(--color-accent);
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
}
.reroll-btn:hover:not(:disabled) {
  background: var(--color-accent);
  color: var(--color-background);
}

.revealing-process {
  padding: 2rem 0;
}

.lingqi-animation {
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  border-radius: 50%;
  border: 5px solid rgba(var(--color-primary-rgb), 0.2);
  border-top-color: var(--color-primary);
  animation: spin 1.5s infinite cubic-bezier(0.6, 0, 0.4, 1);
  position: relative;
}

.lingqi-animation::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  bottom: 10px;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: var(--color-accent);
  animation: spin 2s infinite linear reverse;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.revealing-text {
  color: var(--color-text-secondary);
  font-style: italic;
  animation: pulse 2s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

.root-card {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
}

.root-card.revealed {
  border-color: var(--color-primary);
  box-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.3);
  animation: fadeIn 1s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.root-name {
  font-size: 1.3rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: var(--color-primary);
  font-family: var(--font-family-serif);
}

.root-desc {
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.root-effects {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.effects-label {
  font-size: 0.85rem;
  color: var(--color-accent);
  font-weight: bold;
}

.effects-text {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-primary);
}
</style>