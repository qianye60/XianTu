<!-- src/components/game-view/StatusPanel.vue -->
<template>
  <div class="status-panel">
    <h3 class="sidebar-title">玄光宝镜</h3>
    <div v-if="status" class="status-content">
      <!-- 核心状态 -->
      <div class="core-stats">
        <div class="status-item">
          <span class="status-key">{{ statusLabels.name }}:</span>
          <span class="status-value name">{{ status.name }}</span>
        </div>
        <div class="status-item">
          <span class="status-key">{{ statusLabels.realm }}:</span>
          <span class="status-value realm">{{ status.realm }}</span>
        </div>
        <div class="status-item">
          <span class="status-key">{{ statusLabels.hp }}:</span>
          <span class="status-value" :class="getBarClass('hp')">{{ status.hp }}</span>
        </div>
        <div class="status-item">
          <span class="status-key">{{ statusLabels.mana }}:</span>
          <span class="status-value" :class="getBarClass('mana')">{{ status.mana }}</span>
        </div>
         <div class="status-item">
          <span class="status-key">{{ statusLabels.lifespan }}:</span>
          <span class="status-value">{{ status.lifespan }} 载</span>
        </div>
      </div>

      <!-- 修为进度 -->
      <div class="cultivation-progress">
        <div class="progress-label">
          <span>{{ statusLabels.cultivation }}</span>
          <span>{{ status.cultivation_exp }} / {{ status.cultivation_exp_max }}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar-inner" :style="{ width: cultivationPercentage + '%' }"></div>
        </div>
      </div>

      <!-- 六合命盘 -->
      <div class="hexagon-chart">
        <h4 class="chart-title">六合命盘</h4>
        <svg viewBox="0 0 200 200">
          <!-- 背景网格 -->
          <polygon v-for="i in 4" :key="`bg-${i}`" :points="hexagonBasePoints(i * 25)" class="hex-grid" />
          <line v-for="i in 6" :key="`line-${i}`" x1="100" y1="100" :x2="hexagonPoints[i-1].x" :y2="hexagonPoints[i-1].y" class="hex-grid-lines"/>
          
          <!-- 数据区域 -->
          <polygon :points="hexagonDataPoints" class="hex-data-area" />
          
          <!-- 标签 -->
          <text v-for="(label, index) in attributeLabels" :key="label.key" :x="hexagonLabelPoints[index].x" :y="hexagonLabelPoints[index].y" class="hex-label">
            {{ label.name }}
          </text>
        </svg>
      </div>
    </div>
    <div v-else class="loading-state">
      <p>等待法身数据...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';

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

// --- 修为进度计算 ---
const cultivationPercentage = computed(() => {
  if (!props.status || props.status.cultivation_exp_max === 0) {
    return 0;
  }
  return (props.status.cultivation_exp / props.status.cultivation_exp_max) * 100;
});

// --- 命盘图表计算 ---
const attributeLabels = computed(() => [
  { key: 'root_bone', name: '根骨' },
  { key: 'spirituality', name: '灵性' },
  { key: 'comprehension', name: '悟性' },
  { key: 'fortune', name: '气运' },
  { key: 'charm', name: '魅力' },
  { key: 'temperament', name: '心性' },
]);

const getHexagonPoint = (center: number, radius: number, angle: number) => {
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  };
};

const hexagonPoints = computed(() => {
  const center = 100;
  const radius = 80;
  const points = [];
  for (let i = 0; i < 6; i++) {
    // 偏移-90度使第一个点在顶部
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    points.push(getHexagonPoint(center, radius, angle));
  }
  return points;
});

const hexagonLabelPoints = computed(() => {
  const center = 100;
  const radius = 95; // 标签放在六边形外部
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    points.push(getHexagonPoint(center, radius, angle));
  }
  return points;
});

const hexagonBasePoints = (radius: number) => {
  const center = 100;
  let points = '';
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const p = getHexagonPoint(center, radius, angle);
    points += `${p.x},${p.y} `;
  }
  return points.trim();
};

const hexagonDataPoints = computed(() => {
  if (!props.status) return '';
  const center = 100;
  const radius = 80;
  let points = '';
  const maxStatValue = 20; // 假设六维属性最大值为20，用于归一化

  attributeLabels.value.forEach((attr, i) => {
    const value = props.status![attr.key as keyof CharacterStatus] as number;
    const statRatio = Math.max(0, Math.min(value / maxStatValue, 1));
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const p = getHexagonPoint(center, radius * statRatio, angle);
    points += `${p.x},${p.y} `;
  });

  return points.trim();
});


// --- 状态标签的中文映射 ---
const statusLabels: Record<string, string> = {
  name: '道号',
  realm: '境界',
  hp: '气血',
  mana: '灵力',
  spirit: '神识',
  lifespan: '寿元',
  reputation: '声望',
  cultivation: '当前修为',
};

// --- 状态变化高亮 ---
const getBarClass = (key: 'hp' | 'mana' | 'spirit') => {
  // 简化的逻辑，未来可扩展
  if (!props.status) return '';
  const [current, max] = props.status[key].split(' / ').map(Number);
  if (current / max < 0.3) return 'low';
  return '';
};
</script>

<style scoped>
.status-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  color: var(--color-text);
  background: var(--color-surface-translucent);
  padding: 1rem;
  border-radius: 8px;
}

.sidebar-title {
  text-align: center;
  color: var(--color-primary);
  font-size: 1.2em;
  margin: 0 0 0.5rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  font-family: var(--font-family-serif);
}

.status-content {
  overflow-y: auto;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* 核心状态 */
.core-stats {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.status-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.9em;
}
.status-key {
  color: var(--color-text-secondary);
}
.status-value {
  color: var(--color-text);
  font-weight: bold;
}
.status-value.name { color: var(--color-accent); font-size: 1.1em; }
.status-value.realm { color: var(--color-special); }
.status-value.low { color: var(--color-danger); }

/* 修为进度 */
.cultivation-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.85em;
  color: var(--color-text-secondary);
}
.progress-bar {
  width: 100%;
  height: 10px;
  background-color: var(--color-background-muted);
  border-radius: 5px;
  overflow: hidden;
}
.progress-bar-inner {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  border-radius: 5px;
  transition: width 0.5s ease-in-out;
  box-shadow: 0 0 8px rgba(var(--color-primary-rgb), 0.5);
}

/* 六合命盘 */
.hexagon-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.chart-title {
  font-size: 1em;
  color: var(--color-primary);
  margin: 0;
  font-family: var(--font-family-serif);
}
.hexagon-chart svg {
  width: 100%;
  max-width: 200px;
}
.hex-grid {
  fill: none;
  stroke: var(--color-border);
  stroke-width: 0.5;
}
.hex-grid-lines {
  stroke: var(--color-border);
  stroke-width: 0.5;
}
.hex-data-area {
  fill: rgba(var(--color-primary-rgb), 0.3);
  stroke: var(--color-primary);
  stroke-width: 1.5;
  transition: all 0.5s ease-in-out;
}
.hex-label {
  fill: var(--color-text-secondary);
  font-size: 10px;
  text-anchor: middle;
  dominant-baseline: middle;
}

.loading-state {
  color: var(--color-text-secondary);
  text-align: center;
  margin-top: 2rem;
}
</style>