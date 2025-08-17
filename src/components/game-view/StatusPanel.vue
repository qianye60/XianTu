<!-- src/components/game-view/StatusPanel.vue -->
<template>
  <div class="status-panel">
    <h3 class="sidebar-title">状态面板</h3>
    <div v-if="status" class="status-list">
      <div
        class="status-item"
        v-for="(value, key) in status"
        :key="key"
        :class="{ highlight: highlightedKeys.has(key) }"
      >
        <span class="status-key">{{ statusLabels[key] || key }}:</span>
        <span class="status-value">{{ value }}</span>
      </div>
    </div>
    <div v-else class="loading-state">
      <p>等待法身数据...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

// 定义传入的props类型
export interface CharacterStatus {
  name: string;
  realm: string;
  hp: string;
  mana: string;
  spirit: string;
  lifespan: number;
  reputation: number;
  // 新增：修为
  cultivation_exp: number;
  cultivation_exp_max: number;
  // 新增：六维命格
  root_bone: number;
  spirituality: number;
  comprehension: number;
  fortune: number;
  charm: number;
  temperament: number;
}

const props = defineProps<{
  status: CharacterStatus | null;
}>();

const highlightedKeys = ref(new Set());

watch(() => props.status, (newStatus, oldStatus) => {
  if (!newStatus || !oldStatus) return;

  const changedKeys = new Set();
  for (const key in newStatus) {
    if (newStatus[key as keyof CharacterStatus] !== oldStatus[key as keyof CharacterStatus]) {
      changedKeys.add(key);
    }
  }

  if (changedKeys.size > 0) {
    highlightedKeys.value = changedKeys;
    setTimeout(() => {
      highlightedKeys.value.clear();
    }, 1200); // 动画持续时间
  }
}, { deep: true });


// 状态标签的中文映射
const statusLabels: Record<string, string> = {
  name: '名号',
  realm: '境界',
  hp: '气血',
  mana: '灵力',
  spirit: '神识',
  lifespan: '寿元',
  reputation: '声望',
};
</script>

<style scoped>
/* 样式从 GameView.vue 迁移并调整 */
.status-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
}

.sidebar-title {
  text-align: center;
  color: #e5c07b;
  font-size: 1.2em;
  margin: 0 0 0.5rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #444;
  flex-shrink: 0;
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.status-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.95em;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #333;
}

.status-key {
  color: #a0a0a0;
}

.status-value {
  color: #e0e0e0;
  font-weight: bold;
  transition: all 0.3s ease;
}

.loading-state {
  color: #a0a0a0;
  text-align: center;
  margin-top: 2rem;
}

/* --- 高亮动画 --- */
.status-item.highlight .status-value {
  color: #a3be8c; /* 亮绿色 */
  text-shadow: 0 0 10px #a3be8c;
  transform: scale(1.05);
}
</style>