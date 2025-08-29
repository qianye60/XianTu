<template>
  <div class="enhanced-hexagon-container">
    <!-- 背景光晕效果 -->
    <div class="glow-background"></div>
    
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="hexagon-svg">
      <!-- 定义渐变和滤镜 -->
      <defs>
        <!-- 金色渐变 -->
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffd700" stop-opacity="0.4" />
          <stop offset="50%" stop-color="#daa520" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#ffed4e" stop-opacity="0.25" />
        </linearGradient>
        
        <!-- 光晕滤镜 -->
        <filter id="glowFilter">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        <!-- 点光源效果 -->
        <radialGradient id="pointGlow">
          <stop offset="0%" stop-color="#ff8c00" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#ff8c00" stop-opacity="0"/>
        </radialGradient>
      </defs>
      
      <g :transform="`translate(${center}, ${center})`">
        <!-- 外层装饰圆环 -->
        <circle 
          r="80" 
          fill="none" 
          stroke="url(#goldGradient)" 
          stroke-width="0.5" 
          opacity="0.5"
          stroke-dasharray="5,5"
          class="rotating-ring"
        />
        
        <!-- 网格背景 -->
        <g class="grid-group">
          <!-- 六边形网格 -->
          <polygon 
            v-for="level in 5" 
            :key="`grid-${level}`" 
            :points="getHexagonPoints(level / 5)" 
            class="grid-line"
            :style="{ opacity: 0.1 + level * 0.05 }"
          />
          
          <!-- 放射线 -->
          <line 
            v-for="(point, index) in axisPoints" 
            :key="`axis-${index}`" 
            x1="0" 
            y1="0" 
            :x2="point.x" 
            :y2="point.y" 
            class="axis-line"
          />
        </g>

        <!-- 数据多边形 -->
        <polygon 
          :points="dataPoints" 
          class="data-polygon"
          filter="url(#glowFilter)"
        />
        
        <!-- 数据多边形边框 -->
        <polygon 
          :points="dataPoints" 
          class="data-polygon-stroke"
          fill="none"
        />

        <!-- 顶点装饰 -->
        <g v-for="(point, index) in dataPathPoints" :key="`vertex-${index}`">
          <!-- 光晕背景 -->
          <circle 
            :cx="point.x" 
            :cy="point.y" 
            r="12" 
            fill="url(#pointGlow)"
            opacity="0.5"
          />
          
          <!-- 数据点 -->
          <circle 
            :cx="point.x" 
            :cy="point.y" 
            r="4" 
            class="data-point"
          />
          
          <!-- 数值标签背景 -->
          <rect
            :x="point.x - 12"
            :y="point.y - 22"
            width="24"
            height="16"
            rx="8"
            class="value-background"
          />
          
          <!-- 数值文字 -->
          <text
            :x="point.x"
            :y="point.y - 10"
            class="data-value-text"
            text-anchor="middle"
            dominant-baseline="middle"
          >
            {{ point.value }}
          </text>
        </g>

        <!-- 属性标签 -->
        <g v-for="(label, index) in labels" :key="`label-${index}`">
          <!-- 标签装饰 -->
          <circle
            :cx="label.x"
            :cy="label.y"
            r="20"
            class="label-decoration"
          />
          
          <!-- 标签图标 -->
          <text
            :x="label.x"
            :y="label.y - 8"
            class="label-icon"
            text-anchor="middle"
            dominant-baseline="middle"
          >
            {{ getAttributeIcon(label.key) }}
          </text>
          
          <!-- 标签文字 -->
          <text
            :x="label.x"
            :y="label.y + 8"
            class="label-text"
            text-anchor="middle"
            dominant-baseline="middle"
          >
            {{ label.name }}
          </text>
        </g>
      </g>
    </svg>
    
    <!-- 总评分显示 -->
    <div class="total-score">
      <div class="score-label">总评</div>
      <div class="score-value">{{ totalScore }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  stats: {
    root_bone?: number;
    spirituality?: number;
    comprehension?: number;
    fortune?: number;
    charm?: number;
    temperament?: number;
  };
  size?: number;
  maxValue?: number;
}

const props = withDefaults(defineProps<Props>(), {
  size: 240,
  maxValue: 10,
});

const center = computed(() => props.size / 2);
const radius = computed(() => props.size / 2 * 0.65);

const statOrder = ['root_bone', 'spirituality', 'comprehension', 'fortune', 'charm', 'temperament'];
const statNames: Record<string, string> = {
  root_bone: '根骨',
  spirituality: '灵性',
  comprehension: '悟性',
  fortune: '气运',
  charm: '魅力',
  temperament: '心性',
};

const statIcons: Record<string, string> = {
  root_bone: '🦴',
  spirituality: '✨',
  comprehension: '🧠',
  fortune: '🍀',
  charm: '🌺',
  temperament: '💎',
};

// 计算六边形顶点
const getHexagonPoints = (scale = 1) => {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 2 + (Math.PI / 3) * i;
    const x = Math.cos(angle) * radius.value * scale;
    const y = -Math.sin(angle) * radius.value * scale;
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(' ');
};

// 计算数据点位置
const dataPathPoints = computed(() => {
  return statOrder.map((key, i) => {
    const value = props.stats[key as keyof typeof props.stats] ?? 0;
    const scale = Math.max(0.1, value / props.maxValue); // 最小值0.1保证可见
    const angle = Math.PI / 2 + (Math.PI / 3) * i;
    const pointRadius = radius.value * scale;
    return {
      value,
      x: Math.cos(angle) * pointRadius,
      y: -Math.sin(angle) * pointRadius,
    };
  });
});

// 数据多边形的点
const dataPoints = computed(() => {
  return dataPathPoints.value.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
});

// 轴线端点
const axisPoints = computed(() => {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 2 + (Math.PI / 3) * i;
    points.push({
      x: Math.cos(angle) * radius.value,
      y: -Math.sin(angle) * radius.value
    });
  }
  return points;
});

// 标签位置
const labels = computed(() => {
  const labelRadius = radius.value * 1.35;
  return statOrder.map((key, i) => {
    const angle = Math.PI / 2 + (Math.PI / 3) * i;
    return {
      key,
      name: statNames[key],
      x: Math.cos(angle) * labelRadius,
      y: -Math.sin(angle) * labelRadius,
    };
  });
});

// 获取属性图标
const getAttributeIcon = (key: string) => {
  return statIcons[key] || '⚡';
};

// 计算总评分
const totalScore = computed(() => {
  const sum = Object.values(props.stats).reduce((acc, val) => acc + (val || 0), 0);
  const avg = sum / 6;
  if (avg >= 9) return 'SSS';
  if (avg >= 8) return 'SS';
  if (avg >= 7) return 'S';
  if (avg >= 6) return 'A';
  if (avg >= 5) return 'B';
  if (avg >= 4) return 'C';
  return 'D';
});
</script>

<style scoped>
.enhanced-hexagon-container {
  position: relative;
  display: inline-block;
}

.glow-background {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  height: 80%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  filter: blur(20px);
  animation: pulse 4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
  50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
}

.hexagon-svg {
  position: relative;
  z-index: 1;
}

/* 旋转装饰圆环 */
.rotating-ring {
  animation: rotate 30s linear infinite;
}

@keyframes rotate {
  from { transform-origin: center; transform: rotate(0deg); }
  to { transform-origin: center; transform: rotate(360deg); }
}

/* 网格样式 */
.grid-line {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 0.5;
  stroke-dasharray: 2,2;
}

.axis-line {
  stroke: var(--color-primary);
  stroke-width: 0.5;
  opacity: 0.3;
}

/* 数据多边形 */
.data-polygon {
  fill: url(#goldGradient);
  stroke: none;
  opacity: 0.7;
}

.data-polygon-stroke {
  stroke: var(--color-primary);
  stroke-width: 2;
  opacity: 0.9;
}

/* 数据点 */
.data-point {
  fill: var(--color-accent);
  stroke: white;
  stroke-width: 2;
  filter: drop-shadow(0 0 6px rgba(255, 140, 0, 0.6));
}

/* 数值标签 */
.value-background {
  fill: rgba(255, 255, 255, 0.95);
  stroke: var(--color-primary);
  stroke-width: 1;
}

.data-value-text {
  fill: var(--color-primary);
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-family-serif);
}

/* 属性标签 */
.label-decoration {
  fill: rgba(255, 255, 255, 0.9);
  stroke: var(--color-border-light);
  stroke-width: 1;
}

.label-icon {
  font-size: 14px;
}

.label-text {
  fill: var(--color-text);
  font-size: 11px;
  font-weight: 600;
  font-family: var(--font-family-serif);
}

/* 总评分 */
.total-score {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}

.score-label {
  font-size: 10px;
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}

.score-value {
  font-size: 24px;
  font-weight: 700;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 2px 4px rgba(218, 165, 32, 0.2);
}
</style>