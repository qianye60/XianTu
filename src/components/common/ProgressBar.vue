<template>
  <div
    class="progress"
    :class="size"
    role="progressbar"
    :aria-valuenow="clamped"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div class="progress-bar" :style="{ width: clamped + '%' }"></div>
    <div v-if="showLabel" class="progress-label">{{ labelText }}</div>
  </div>
  
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue'

interface ProgressBarProps {
  value: number
  max?: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  format?: ((value: number) => string) | null
}

const props = withDefaults(defineProps<ProgressBarProps>(), {
  max: 100,
  showLabel: true,
  size: 'md',
  format: null,
})

const clamped = computed(() => {
  const raw = props.max === 1 ? props.value * 100 : (props.value / props.max) * 100
  const pct = Math.max(0, Math.min(100, raw))
  return Math.round(pct)
})

const labelText = computed(() => {
  if (props.format) return props.format(props.value)
  return `${clamped.value}%`
})
</script>

<style scoped>
.progress {
  position: relative;
  width: 100%;
  height: 8px;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
  overflow: hidden;
}

.progress.sm { height: 6px; }
.progress.md { height: 8px; }
.progress.lg { height: 16px; }

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--color-success), var(--color-primary));
  border-radius: 999px;
  transition: width 0.25s ease;
  min-width: 2px; /* 确保即使0%也能看到一点进度条 */
}

.progress-label {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  font-size: 12px;
  color: rgba(0, 0, 0, 0.75);
  pointer-events: none;
}
</style>
