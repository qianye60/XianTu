<template>
  <div class="attribute-allocation-container">
    <div class="header">
      <h2>先天六命分配</h2>
      <div class="points-display">
        剩余天道点: <span>{{ store.remainingTalentPoints }}</span>
      </div>
    </div>

    <div class="attributes-list">
      <div v-for="(value, key) in store.attributes" :key="key" class="attribute-item">
        <div class="attribute-info">
          <span class="attribute-name">{{ attributeNames[key as AttributeKey] }}</span>
          <p class="attribute-desc">{{ attributeDescriptions[key as AttributeKey] }}</p>
        </div>
        <div class="attribute-controls">
          <button @click="decrement(key as AttributeKey)" :disabled="value <= minValue || store.mode === 'multi'">-</button>
          <span class="attribute-value">{{ value }}</span>
          <button @click="increment(key as AttributeKey)" :disabled="store.remainingTalentPoints <= 0 || value >= maxValue || store.mode === 'multi'">+</button>
        </div>
      </div>
    </div>
     <div class="actions" v-if="store.mode === 'single'">
      <button @click="resetPoints" class="btn btn-secondary">重置</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCharacterCreationStore } from '../../stores/characterCreationStore';

const store = useCharacterCreationStore();

const minValue = 0;
const maxValue = 10;

const attributeNames = {
  root_bone: '根骨',
  spirituality: '灵性',
  comprehension: '悟性',
  luck: '气运',
  charm: '魅力',
  temperament: '心性',
};

const attributeDescriptions = {
  root_bone: '决定气血上限、恢复速度、寿命上限。影响炼体修行、抗打击能力。',
  spirituality: '决定灵气上限、吸收效率。影响修炼速度、法术威力。',
  comprehension: '决定神识上限、学习效率。影响功法领悟、技能掌握速度。',
  luck: '决定奇遇概率、物品掉落品质。影响天材地宝获取、贵人相助。',
  charm: '决定初始好感度、社交加成。影响NPC互动、门派声望获取。',
  temperament: '决定心魔抗性、意志力。影响走火入魔抵抗、关键抉择。',
};

type AttributeKey = keyof typeof attributeNames;

function increment(key: AttributeKey) {
  if (store.remainingTalentPoints > 0 && store.attributes[key] < maxValue) {
    store.attributes[key]++;
  }
}

function decrement(key: AttributeKey) {
  if (store.attributes[key] > minValue) {
    store.attributes[key]--;
  }
}

function resetPoints() {
  for (const key in store.attributes) {
    store.attributes[key as AttributeKey] = minValue;
  }
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

.attribute-controls button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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
}
.actions button {
    padding: 0.5rem 1.5rem;
}
</style>