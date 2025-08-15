<template>
  <div class="attribute-allocator">
    <h3 class="allocator-title">【 先天六司，点化灵犀 】</h3>
    <div class="points-display">
      剩余点数: <span class="points-value">{{ remainingPoints }}</span>
    </div>
    <div class="attributes-grid">
      <div v-for="(attr, key) in CORE_ATTRIBUTES" :key="key" class="attribute-row">
        <span class="attribute-name">{{ attr }}</span>
        <div class="attribute-controls">
          <button
            @click="decrement(key as CoreAttribute)"
            :disabled="!canDecrement(key as CoreAttribute)"
            class="control-btn decrease"
          >
            -
          </button>
          <span class="attribute-value">{{ attributes.attributes[key as CoreAttribute] }}</span>
          <button 
            @click="increment(key as CoreAttribute)" 
            :disabled="remainingPoints <= 0"
            class="control-btn increase"
          >
            +
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  CORE_ATTRIBUTES,
  type CoreAttribute,
  type AttributeDistribution,
  type CharacterSheet,
} from '@/core/rules/characterCreation'

const props = defineProps<{
  modelValue?: AttributeDistribution | null
  characterData?: CharacterSheet
  talentTier?: { total_points: number } | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: AttributeDistribution]
}>()

// 初始化属性值
const initializeAttributes = (): AttributeDistribution => {
  const baseAttributes: Record<CoreAttribute, number> = {
    ROOT_BONE: 10,
    SPIRITUALITY: 10,
    COMPREHENSION: 10,
    FORTUNE: 10,
    CHARM: 10,
    TEMPERAMENT: 10,
  }

  // 如果有出身加成，应用它们
  if (props.characterData?.origin?.attributeModifiers) {
    const bonuses = props.characterData.origin.attributeModifiers
    Object.keys(bonuses).forEach((key) => {
      if (key in baseAttributes) {
        baseAttributes[key as CoreAttribute] += bonuses[key as CoreAttribute] || 0
      }
    })
  }

  // 如果有灵根加成，应用它们（灵根通常通过effects字段影响属性）
  if (props.characterData?.spiritRoot?.effects) {
    // 灵根的effects可能是字符串或对象，需要解析
    let effects = props.characterData.spiritRoot.effects
    if (typeof effects === 'string') {
      try {
        effects = JSON.parse(effects)
      } catch (e) {
        // 忽略解析错误
      }
    }
    
    if (effects && typeof effects === 'object') {
      const effectsArray = Array.isArray(effects) ? effects : [effects]
      effectsArray.forEach(effect => {
        if (effect.type === 'ATTRIBUTE_MODIFIER' && effect.target in baseAttributes) {
          baseAttributes[effect.target as CoreAttribute] += effect.value || 0
        }
      })
    }
  }

  // 如果有天赋加成，应用它们
  if (props.characterData?.talents) {
    props.characterData.talents.forEach(talent => {
      if (talent.effects) {
        let effects = talent.effects
        if (typeof effects === 'string') {
          try {
            effects = JSON.parse(effects)
          } catch (e) {
            return
          }
        }
        
        const effectsArray = Array.isArray(effects) ? effects : [effects]
        effectsArray.forEach(effect => {
          if (effect.type === 'ATTRIBUTE_MODIFIER' && effect.target in baseAttributes) {
            baseAttributes[effect.target as CoreAttribute] += effect.value || 0
          }
        })
      }
    })
  }

  return {
    attributes: baseAttributes,
    pointsSpent: 0
  }
}

const attributes = ref<AttributeDistribution>(
  props.modelValue || initializeAttributes()
)

const totalPoints = computed(() => {
  // 从天资等级获取总点数，默认20点
  return props.talentTier?.total_points || 20
})

const getBaseValue = (key: CoreAttribute): number => {
  let base = 10
  
  // 出身加成
  if (props.characterData?.origin?.attributeModifiers) {
    base += props.characterData.origin.attributeModifiers[key] || 0
  }
  
  // 灵根加成（通过effects字段）
  if (props.characterData?.spiritRoot?.effects) {
    let effects = props.characterData.spiritRoot.effects
    if (typeof effects === 'string') {
      try {
        effects = JSON.parse(effects)
      } catch (e) {
        // 忽略解析错误
      }
    }
    
    if (effects && typeof effects === 'object') {
      const effectsArray = Array.isArray(effects) ? effects : [effects]
      effectsArray.forEach(effect => {
        if (effect.type === 'ATTRIBUTE_MODIFIER' && effect.target === key) {
          base += effect.value || 0
        }
      })
    }
  }
  
  // 天赋加成
  if (props.characterData?.talents) {
    props.characterData.talents.forEach(talent => {
      if (talent.effects) {
        let effects = talent.effects
        if (typeof effects === 'string') {
          try {
            effects = JSON.parse(effects)
          } catch (e) {
            return
          }
        }
        
        const effectsArray = Array.isArray(effects) ? effects : [effects]
        effectsArray.forEach(effect => {
          if (effect.type === 'ATTRIBUTE_MODIFIER' && effect.target === key) {
            base += effect.value || 0
          }
        })
      }
    })
  }
  
  return base
}

const pointsSpent = computed(() => {
  return Object.keys(CORE_ATTRIBUTES).reduce((sum, key) => {
    const attrKey = key as CoreAttribute
    const baseValue = getBaseValue(attrKey)
    return sum + (attributes.value.attributes[attrKey] - baseValue)
  }, 0)
})

const remainingPoints = computed(() => totalPoints.value - pointsSpent.value)

const canDecrement = (key: CoreAttribute): boolean => {
  const baseValue = getBaseValue(key)
  return attributes.value.attributes[key] > baseValue
}

const increment = (key: CoreAttribute) => {
  if (remainingPoints.value > 0) {
    attributes.value.attributes[key]++
  }
}

const decrement = (key: CoreAttribute) => {
  if (canDecrement(key)) {
    attributes.value.attributes[key]--
  }
}

watch(
  attributes,
  (newValue) => {
    emit('update:modelValue', {
      attributes: newValue.attributes,
      pointsSpent: pointsSpent.value,
    })
  },
  { deep: true },
)

// 监听角色数据变化，重新初始化
watch(
  () => props.characterData,
  () => {
    attributes.value = initializeAttributes()
  },
  { deep: true }
)

// 如果没有初始值，立即发送一个
if (!props.modelValue) {
  emit('update:modelValue', attributes.value)
}
</script>

<style scoped>
.attribute-allocator {
  padding: 2rem;
  background: rgba(30, 40, 50, 0.7);
  border: 1px solid rgba(var(--color-primary-rgb), 0.4);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.allocator-title {
  text-align: center;
  color: var(--color-primary);
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  font-family: var(--font-family-serif);
}

.points-display {
  text-align: center;
  margin-bottom: 2rem;
  font-size: 1.2rem;
  color: var(--color-text-secondary);
}

.points-value {
  color: var(--color-primary);
  font-weight: bold;
  font-size: 1.4rem;
}

.attributes-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 500px;
  margin: 0 auto;
}

.attribute-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  padding: 1rem 1.5rem;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.attribute-row:hover {
  background: rgba(0, 0, 0, 0.4);
  transform: translateX(5px);
}

.attribute-name {
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--color-text);
  font-family: var(--font-family-serif);
  min-width: 80px;
}

.attribute-controls {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.control-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  font-size: 1.3rem;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.2s ease;
  font-weight: bold;
}

.control-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: var(--color-background);
  transform: scale(1.1);
}

.control-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.control-btn:disabled {
  border-color: var(--color-border);
  color: var(--color-text-disabled);
  cursor: not-allowed;
  opacity: 0.5;
}

.attribute-value {
  font-size: 1.3rem;
  font-weight: bold;
  color: var(--color-text);
  min-width: 40px;
  text-align: center;
  font-family: monospace;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .attribute-allocator {
    padding: 1.5rem;
  }
  
  .attributes-grid {
    max-width: 100%;
  }
  
  .attribute-row {
    padding: 0.8rem 1rem;
  }
  
  .attribute-controls {
    gap: 1rem;
  }
}
</style>