<template>
  <div class="hexagon-chart-container">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
      <g :transform="`translate(${center}, ${center})`">
        <!-- Hexagon Grid Lines -->
        <polygon v-for="level in gridLevels" :key="`grid-${level}`" :points="getHexagonPoints(level / gridLevels)" class="grid-line" />
        
        <!-- Radial Lines -->
        <line v-for="(point, index) in axisPoints" :key="`axis-${index}`" x1="0" y1="0" :x2="point.x" :y2="point.y" class="grid-line" />

        <!-- Data Polygon -->
        <polygon :points="dataPoints" class="data-polygon" />

        <!-- Data Points & Numeric Values -->
        <g v-for="(point, index) in dataPathPoints" :key="`data-point-${index}`">
          <circle :cx="point.x" :cy="point.y" r="3" class="data-point" />
          <text
            :x="point.x"
            :y="point.y"
            class="data-value-text"
            :text-anchor="getLabelAnchor(index, true)"
            :dominant-baseline="getLabelBaseline(index, true)"
          >
            {{ point.value }}
          </text>
        </g>

        <!-- Stat Labels -->
        <text
          v-for="(label, index) in labels"
          :key="label.key"
          :x="label.x"
          :y="label.y"
          class="label-text"
          :text-anchor="getLabelAnchor(index)"
          :dominant-baseline="getLabelBaseline(index)"
        >
          {{ label.name }}
        </text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AttributeKey } from '@/types';

interface Stats {
  root_bone: number;
  spirituality: number;
  comprehension: number;
  fortune: number;
  charm: number;
  temperament: number;
}

const props = withDefaults(defineProps<{
  stats: Partial<Stats>;
  size?: number;
  maxValue?: number;
}>(), {
  size: 160,
  maxValue: 10, // 六维属性最大值为10
});

const center = computed(() => props.size / 2);
const radius = computed(() => props.size / 2 * 0.7); // 70% of half size to leave space for labels
const gridLevels = 5;

const statOrder: AttributeKey[] = ['root_bone', 'spirituality', 'comprehension', 'fortune', 'charm', 'temperament'];
const statNames: Record<AttributeKey, string> = {
  root_bone: '根骨',
  spirituality: '悟性',
  comprehension: '资质',
  fortune: '机缘',
  charm: '魅力',
  temperament: '气质',
};

const getHexagonPoints = (scale = 1) => {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 2 + (Math.PI / 3) * i;
    const x = Math.cos(angle) * radius.value * scale;
    const y = -Math.sin(angle) * radius.value * scale; // SVG y is inverted
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(' ');
};

const dataPathPoints = computed(() => {
  return statOrder.map((key, i) => {
    const value = props.stats[key] ?? 0;
    const scale = Math.max(0, Math.min(1, value / props.maxValue));
    const angle = Math.PI / 2 + (Math.PI / 3) * i;
    // Add a small offset so the point doesn't sit on the axis line if value is 0
    const pointRadius = radius.value * scale + (scale === 0 ? 4 : 0);
    return {
      value: value,
      x: Math.cos(angle) * pointRadius,
      y: -Math.sin(angle) * pointRadius,
    };
  });
});

const dataPoints = computed(() => {
  const points: string[] = [];
  statOrder.forEach((key, i) => {
    const value = props.stats[key] ?? 0;
    const scale = Math.max(0, Math.min(1, value / props.maxValue));
    const angle = Math.PI / 2 + (Math.PI / 3) * i;
    const x = Math.cos(angle) * radius.value * scale;
    const y = -Math.sin(angle) * radius.value * scale;
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  });
  return points.join(' ');
});

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

const labels = computed(() => {
  const labelRadius = radius.value * 1.25; // Position labels outside the hexagon
  return statOrder.map((key, i) => {
    const angle = Math.PI / 2 + (Math.PI / 3) * i;
    return {
      key: key,
      name: statNames[key],
      x: Math.cos(angle) * labelRadius,
      y: -Math.sin(angle) * labelRadius,
    };
  });
});

const getLabelAnchor = (index: number, forValue = false) => {
    const offset = forValue ? -1 : 1;
    if (index === 0 || index === 3) return 'middle';
    if (index === 1 || index === 2) return forValue ? 'end' : 'start';
    return forValue ? 'start' : 'end';
}

const getLabelBaseline = (index: number, forValue = false) => {
    if (index === 0) return forValue ? 'hanging' : 'alphabetic';
    if (index === 3) return forValue ? 'alphabetic' : 'hanging';
    return 'middle';
}

</script>

<style scoped>
.hexagon-chart-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.grid-line {
  fill: none;
  stroke: var(--color-border);
  stroke-width: 1;
  opacity: 0.5;
}

.data-polygon {
  fill: rgba(var(--color-primary-rgb), 0.3);
  stroke: var(--color-primary);
  stroke-width: 2;
  transition: points 0.3s ease-in-out;
}

.data-point {
  fill: var(--color-primary);
  stroke: var(--color-surface);
  stroke-width: 2;
}

.data-value-text {
  fill: var(--color-text);
  font-size: 11px;
  font-weight: bold;
  paint-order: stroke;
  stroke: var(--color-background);
  stroke-width: 2px;
  stroke-linecap: butt;
  stroke-linejoin: miter;
}

.label-text {
  fill: var(--color-text-secondary);
  font-size: 12px;
  font-family: var(--font-family-sans-serif);
}
</style>