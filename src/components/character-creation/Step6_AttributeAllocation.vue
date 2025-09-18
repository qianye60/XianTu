<template>
  <div class="attribute-allocation-container">
    <div class="header">
      <h2>先天六命分配</h2>
      <div class="points-display">
        剩余天道点:
        <span :class="{ negative: store.remainingTalentPoints < 0 }">{{
          store.remainingTalentPoints
        }}</span>
      </div>
    </div>

    <div class="attributes-list">
      <div v-for="(value, key) in store.attributes" :key="key" class="attribute-item">
        <div class="attribute-info">
          <span class="attribute-name">{{ attributeNames[key as AttributeKey] }}</span>
          <p class="attribute-desc">{{ attributeDescriptions[key as AttributeKey] }}</p>
        </div>
        <div class="attribute-controls">
          <button @click="decrement(key as AttributeKey)" :disabled="value <= minValue">-</button>
          <span class="attribute-value">{{ value }}</span>
          <button
            @click="increment(key as AttributeKey)"
            :disabled="store.remainingTalentPoints <= 0 || value >= maxValue"
            :class="{ disabled: store.remainingTalentPoints <= 0 || value >= maxValue }"
          >
            +
          </button>
        </div>
      </div>
    </div>

    <div class="actions">
      <button @click="resetPoints" class="btn btn-secondary">🔄 重置</button>
      <button @click="randomizePoints" class="btn btn-warning">🎲 随机</button>
      <button @click="balancePoints" class="btn btn-success">⚖️ 均衡</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCharacterCreationStore } from '../../stores/characterCreationStore'

const store = useCharacterCreationStore()

const minValue = 0 // 属性基础值
const maxValue = 10 // 属性最大值

const attributeNames = {
  root_bone: '根骨',
  spirituality: '灵性',
  comprehension: '悟性',
  fortune: '气运',
  charm: '魅力',
  temperament: '心性',
}

const attributeDescriptions = {
  root_bone: '决定气血上限、恢复速度、寿命上限。影响炼体修行、抗打击能力。',
  spirituality: '决定灵气上限、吸收效率。影响修炼速度、法术威力。',
  comprehension: '决定神识上限、学习效率。影响功法领悟、技能掌握速度。',
  fortune: '决定各种概率、物品掉落品质。影响天材地宝获取、贵人相助。',
  charm: '决定初始好感度、社交加成。影响NPC互动、门派声望获取。',
  temperament: '决定心魔抗性、意志力。影响走火入魔抵抗、关键抉择。',
}

type AttributeKey = keyof typeof attributeNames

function increment(key: AttributeKey) {
  if (store.remainingTalentPoints > 0 && store.attributes[key] < maxValue) {
    store.setAttribute(key, store.attributes[key] + 1)
  }
}

function decrement(key: AttributeKey) {
  if (store.attributes[key] > minValue) {
    store.setAttribute(key, store.attributes[key] - 1)
  }
}

function resetPoints() {
  // 重置所有属性为最小值 0
  Object.keys(store.attributes).forEach((key) => {
    store.setAttribute(key as AttributeKey, 0)
  })
}

function randomizePoints() {
  // 先重置所有属性为基础值
  resetPoints()

  // 获取可用于分配的点数 (初始天道点)
  let pointsToAllocate = store.remainingTalentPoints
  const attributeKeys = Object.keys(store.attributes) as AttributeKey[]

  // 随机分配点数
  while (pointsToAllocate > 0) {
    const randomKey = attributeKeys[Math.floor(Math.random() * attributeKeys.length)]
    const currentValue = store.attributes[randomKey]
    
    if (currentValue < maxValue) {
      store.setAttribute(randomKey, currentValue + 1)
      pointsToAllocate--
    }

    // 防止死循环：如果所有属性都达到最大值则停止
    const allMaxed = attributeKeys.every((key) => store.attributes[key] >= maxValue)
    if (allMaxed) {
      break
    }
  }
}

function balancePoints() {
  // 先重置所有属性
  resetPoints()

  // 获取可用点数，如果为负数则不分配
  const availablePoints = Math.max(0, store.remainingTalentPoints)
  if (availablePoints <= 0) return

  // 计算每个属性应分配的基础点数
  const attributeCount = Object.keys(store.attributes).length
  const pointsPerAttribute = Math.floor(availablePoints / attributeCount)
  let extraPoints = availablePoints % attributeCount

  // 均衡分配点数
  const attributeKeys = Object.keys(store.attributes) as AttributeKey[]
  attributeKeys.forEach((key) => {
    // 基础分配
    let pointsToAdd = pointsPerAttribute
    // 如果有余数，前面几个属性多分配1点
    if (extraPoints > 0) {
      pointsToAdd++
      extraPoints--
    }
    // 确保不超过最大值
    const finalValue = Math.min(minValue + pointsToAdd, maxValue)
    store.setAttribute(key, finalValue)
  })
}
</script>

<style scoped>
.attribute-allocation-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--color-text);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.points-display .negative {
  color: var(--color-error) !important;
}

h2 {
  margin: 0;
  color: var(--color-accent);
}

.points-display {
  font-size: 1.2rem;
  color: var(--color-text-secondary);
}

.points-display span {
  font-weight: bold;
  color: var(--color-primary);
  font-size: 1.5rem;
}

.attributes-list {
  overflow-y: auto;
  flex-grow: 1;
}

.attribute-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid var(--color-border);
}

.attribute-item:last-child {
  border-bottom: none;
}

.attribute-info {
  flex-basis: 70%;
}

.attribute-name {
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--color-accent);
}

.attribute-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0.3rem 0 0 0;
  line-height: 1.4;
}

.attribute-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.attribute-controls button {
  width: 35px;
  height: 35px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-accent);
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: center;
  align-items: center;
}

.attribute-controls button:hover:not(:disabled) {
  background: var(--color-accent);
  color: var(--color-surface);
  border-color: var(--color-accent);
}

.attribute-controls button:disabled,
.attribute-controls button.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: var(--color-surface-light);
  border-color: var(--color-border);
  color: var(--color-text-muted);
}

.attribute-value {
  font-size: 1.4rem;
  font-weight: bold;
  min-width: 30px;
  text-align: center;
  color: var(--color-text);
}

.actions {
  padding-top: 1rem;
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.actions button {
  padding: 0.5rem 1.5rem;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.actions button:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-hover);
}

.actions .btn-secondary {
  border-color: var(--color-text-secondary);
  color: var(--color-text-secondary);
}

.actions .btn-secondary:hover {
  background: var(--color-text-secondary);
  color: var(--color-surface);
}

.actions .btn-warning {
  border-color: var(--color-warning);
  color: var(--color-warning);
}

.actions .btn-warning:hover {
  background: var(--color-warning);
  color: var(--color-surface);
}

.actions .btn-success {
  border-color: var(--color-success);
  color: var(--color-success);
}

.actions .btn-success:hover {
  background: var(--color-success);
  color: var(--color-surface);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .attribute-item {
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem 0;
  }
  
  .attribute-info {
    flex-basis: auto;
    text-align: center;
  }
  
  .attribute-controls {
    justify-content: center;
    gap: 1.5rem;
  }
  
  .attribute-controls button {
    width: 40px;
    height: 40px;
    font-size: 1.8rem;
  }
  
  .attribute-value {
    font-size: 1.6rem;
    min-width: 40px;
  }
  
  .actions {
    gap: 1rem;
  }
  
  .actions button {
    padding: 0.75rem 2rem;
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .header h2 {
    font-size: 1.5rem;
  }
  
  .points-display {
    font-size: 1rem;
  }
  
  .points-display span {
    font-size: 1.3rem;
  }
  
  .attribute-name {
    font-size: 1rem;
  }
  
  .attribute-desc {
    font-size: 0.8rem;
  }
  
  .attribute-controls button {
    width: 36px;
    height: 36px;
    font-size: 1.6rem;
  }
  
  .attribute-value {
    font-size: 1.4rem;
  }
  
  .actions {
    flex-direction: column;
    align-items: center;
  }
  
  .actions button {
    width: 100%;
    max-width: 200px;
  }
}
</style>
