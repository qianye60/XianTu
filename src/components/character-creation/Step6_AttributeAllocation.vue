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

const minValue = 0
const maxValue = 10

const attributeNames = {
  root_bone: '根骨',
  spirituality: '灵性',
  comprehension: '悟性',
  luck: '气运',
  charm: '魅力',
  temperament: '心性',
}

const attributeDescriptions = {
  root_bone: '决定气血上限、恢复速度、寿命上限。影响炼体修行、抗打击能力。',
  spirituality: '决定灵气上限、吸收效率。影响修炼速度、法术威力。',
  comprehension: '决定神识上限、学习效率。影响功法领悟、技能掌握速度。',
  luck: '决定奇遇概率、物品掉落品质。影响天材地宝获取、贵人相助。',
  charm: '决定初始好感度、社交加成。影响NPC互动、门派声望获取。',
  temperament: '决定心魔抗性、意志力。影响走火入魔抵抗、关键抉择。',
}

type AttributeKey = keyof typeof attributeNames

function increment(key: AttributeKey) {
  // 如果已经不能再增加点数了，就不要增加
  if (store.remainingTalentPoints <= 0) {
    return
  }
  // 检查属性值是否达到上限
  if (store.attributes[key] >= maxValue) {
    return
  }
  store.attributes[key]++
}

function decrement(key: AttributeKey) {
  if (store.attributes[key] > minValue) {
    store.attributes[key]--
  }
}

function resetPoints() {
  // 重置所有属性为最小值
  Object.keys(store.attributes).forEach((key) => {
    store.attributes[key as AttributeKey] = minValue
  })
}

function randomizePoints() {
  // 先重置所有属性
  resetPoints()

  // 获取可用点数
  const availablePoints = store.remainingTalentPoints
  let remainingPoints = availablePoints
  const attributeKeys = Object.keys(store.attributes) as AttributeKey[]

  // 随机分配点数
  while (remainingPoints > 0) {
    const randomKey = attributeKeys[Math.floor(Math.random() * attributeKeys.length)]
    if (store.attributes[randomKey] < maxValue) {
      store.attributes[randomKey]++
      remainingPoints--
    }

    // 防止死循环：如果所有属性都达到最大值则停止
    if (attributeKeys.every((key) => store.attributes[key] >= maxValue)) {
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
  const extraPoints = availablePoints % attributeCount

  // 均衡分配点数
  const attributeKeys = Object.keys(store.attributes) as AttributeKey[]
  attributeKeys.forEach((key, index) => {
    // 基础分配
    let points = pointsPerAttribute
    // 如果有余数，前面几个属性多分配1点
    if (index < extraPoints) {
      points++
    }
    // 确保不超过最大值也不小于最小值
    store.attributes[key] = Math.min(Math.max(points, minValue), maxValue)
  })
}
</script>

<style scoped>
.attribute-allocation-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: #c8ccd4;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #444;
}

.points-display .negative {
  color: #ff6b6b !important;
}

h2 {
  margin: 0;
  color: #e5c07b;
}

.points-display {
  font-size: 1.2rem;
}

.points-display span {
  font-weight: bold;
  color: #88c0d0;
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
  border-bottom: 1px solid #333;
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
  color: #e5c07b;
}

.attribute-desc {
  font-size: 0.85rem;
  color: #888;
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
  background: #333;
  border: 1px solid #555;
  color: #e5c07b;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: center;
  align-items: center;
}

.attribute-controls button:hover:not(:disabled) {
  background: #e5c07b;
  color: #1a1a1a;
}

.attribute-controls button:disabled,
.attribute-controls button.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: #444;
  border-color: #666;
  color: #999;
}

.attribute-value {
  font-size: 1.4rem;
  font-weight: bold;
  min-width: 30px;
  text-align: center;
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
  border: 1px solid #555;
  background: #333;
  color: #c8ccd4;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.actions button:hover {
  background: #444;
}

.actions .btn-secondary {
  border-color: #6c757d;
}

.actions .btn-secondary:hover {
  background: #6c757d;
  color: white;
}

.actions .btn-warning {
  border-color: #f39c12;
  color: #f39c12;
}

.actions .btn-warning:hover {
  background: #f39c12;
  color: #1a1a1a;
}

.actions .btn-success {
  border-color: #27ae60;
  color: #27ae60;
}

.actions .btn-success:hover {
  background: #27ae60;
  color: white;
}
</style>
