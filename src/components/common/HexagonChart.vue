<template>
  <div class="hexagon-chart-container">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
      <!-- 定义渐变 -->
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="rgba(255, 215, 0, 0.3)" />
          <stop offset="50%" stop-color="rgba(218, 165, 32, 0.25)" />
          <stop offset="100%" stop-color="rgba(255, 223, 0, 0.2)" />
        </linearGradient>
        <linearGradient id="darkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="rgba(100, 181, 246, 0.3)" />
          <stop offset="100%" stop-color="rgba(100, 181, 246, 0.1)" />
        </linearGradient>
      </defs>
      
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
import type { AttributeKey, InnateAttributesEnglish } from '@/types/game';
import { useI18n } from '@/i18n';

const { t } = useI18n();

const props = withDefaults(defineProps<{
  stats: Partial<InnateAttributesEnglish>;
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
  root_bone: t('根骨'),
  spirituality: t('灵性'),
  comprehension: t('悟性'),
  fortune: t('气运'),
  charm: t('魅力'),
  temperament: t('心性'),
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

/* 浅色主题 - 金辉仙光 */
.grid-line {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 1;
  opacity: 0.2;
}

.data-polygon {
  fill: url(#goldGradient);
  stroke: var(--color-primary);
  stroke-width: 2.5;
  filter: drop-shadow(0 0 8px rgba(218, 165, 32, 0.3));
  transition: all 0.3s ease;
}

.data-polygon:hover {
  filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.5));
}

.data-point {
  fill: var(--color-accent);
  stroke: rgba(255, 255, 255, 0.9);
  stroke-width: 2;
  filter: drop-shadow(0 0 4px rgba(255, 140, 0, 0.4));
}

.data-value-text {
  fill: var(--color-text);
  font-size: 12px;
  font-weight: bold;
  font-family: var(--font-family-serif);
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8);
}

.label-text {
  fill: var(--color-primary);
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-family-serif);
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.9);
}

/* 深色主题 - 夜空星辰 */
[data-theme="dark"] .grid-line {
  stroke: #64b5f6;
  opacity: 0.4;
}

[data-theme="dark"] .data-polygon {
  fill: url(#darkGradient);
  stroke: #64b5f6;
}

[data-theme="dark"] .data-point {
  fill: #ba68c8;
  stroke: rgba(30, 30, 60, 0.8);
}

[data-theme="dark"] .data-value-text {
  fill: #e1e4e8;
}

[data-theme="dark"] .label-text {
  fill: #64b5f6;
}
</style>
