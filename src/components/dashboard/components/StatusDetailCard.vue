<template>
  <div class="status-detail-card">
    <div class="card-header" :class="isBuff ? 'buff' : 'debuff'">
      <span class="type-icon">{{ isBuff ? '✨' : '⚠️' }}</span>
      <span class="type-text">{{ isBuff ? '增益状态' : '负面状态' }}</span>
    </div>

    <div class="card-body">
      <div class="description" :class="isBuff ? 'buff-border' : 'debuff-border'">
        {{ effect.状态描述 || `${effect.状态名称}状态生效中` }}
      </div>

      <div class="details-grid">
        <div v-if="effect.来源" class="detail-item">
          <div class="item-label">来源</div>
          <div class="item-value source">{{ effect.来源 }}</div>
        </div>

        <div v-if="effect.强度" class="detail-item">
          <div class="item-label">效果强度</div>
          <div class="item-value strength">
            <span class="strength-text" :style="{ color: strengthColor }">{{ strengthLevel }}</span>
            <span class="strength-value">({{ effect.强度 }}/10)</span>
          </div>
          <div class="strength-bar">
            <div class="bar-fill" :style="{ width: `${effect.强度 * 10}%`, backgroundColor: strengthColor }"></div>
          </div>
        </div>

        <div v-if="durationDisplay" class="detail-item">
          <div class="item-label">持续时间</div>
          <div class="item-value duration">{{ durationDisplay }}</div>
        </div>

        <div v-if="effect.生成时间" class="detail-item">
          <div class="item-label">生成时间</div>
          <div class="item-value time">{{ formatGenerationTime(effect.生成时间) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { StatusEffect, GameTime } from '@/types/game';

const props = defineProps<{
  effect: StatusEffect;
}>();

const isBuff = computed(() => String(props.effect.类型).toLowerCase() === 'buff');

const strengthLevel = computed(() => {
  const strength = props.effect.强度 || 0;
  if (strength >= 8) return '极强';
  if (strength >= 5) return '中等';
  return '轻微';
});

const strengthColor = computed(() => {
  const strength = props.effect.强度 || 0;
  if (strength >= 8) return '#f59e0b';
  if (strength >= 5) return '#3b82f6';
  return '#6b7280';
});

const durationDisplay = computed(() => {
  const duration = props.effect.持续时间分钟;
  if (duration === undefined || duration === null) return '';
  if (duration === 99999) return '永久';
  if (duration >= 1440) return `${Math.floor(duration / 1440)}天`;
  if (duration >= 60) {
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    return mins > 0 ? `${hours}时${mins}分` : `${hours}时`;
  }
  return `${duration}分钟`;
});

const formatGenerationTime = (time: GameTime) => {
  if (!time) return '';
  return `${time.年}年${time.月}月${time.日}日 ${String(time.小时).padStart(2, '0')}:${String(time.分钟).padStart(2, '0')}`;
};
</script>

<style scoped>
.status-detail-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  font-size: 0.8rem;
}

.card-header {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.65rem;
  border-radius: 6px;
  border: 1px solid;
  align-self: flex-start;
}
.card-header.buff {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
}
.card-header.debuff {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

.type-icon {
  font-size: 1rem;
  line-height: 1;
}

.type-text {
  font-size: 0.8rem;
  font-weight: 600;
}
.card-header.buff .type-text { color: #10b981; }
.card-header.debuff .type-text { color: #ef4444; }

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.description {
  padding: 0.5rem 0.65rem;
  background: var(--color-surface-light);
  border-radius: 6px;
  border-left: 2px solid;
  line-height: 1.4;
  color: var(--color-text);
}
.description.buff-border { border-color: #10b981; }
.description.debuff-border { border-color: #ef4444; }

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.detail-item {
  padding: 0.65rem;
  background: var(--color-surface);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.item-label {
  font-size: 0.65rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

.item-value {
  font-size: 0.85rem;
  font-weight: 600;
}
.item-value.source { color: var(--color-accent); }
.item-value.duration { color: var(--color-primary); }
.item-value.time { font-size: 0.75rem; font-weight: 500; color: var(--color-text); }

.strength {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.2rem;
}
.strength-text { font-size: 0.9rem; font-weight: 700; }
.strength-value { font-size: 0.7rem; color: var(--color-text-secondary); }

.strength-bar {
  height: 4px;
  background: var(--color-surface-light);
  border-radius: 2px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  transition: width 0.3s ease;
}

@media (max-width: 480px) {
  .status-detail-card {
    gap: 0.5rem;
    font-size: 0.75rem;
  }

  .card-header {
    gap: 0.4rem;
    padding: 0.3rem 0.5rem;
    border-radius: 5px;
  }

  .type-icon { font-size: 0.9rem; }
  .type-text { font-size: 0.75rem; }

  .description {
    padding: 0.4rem 0.5rem;
    font-size: 0.75rem;
  }

  .details-grid {
    grid-template-columns: 1fr;
    gap: 0.4rem;
  }

  .detail-item {
    padding: 0.5rem;
    gap: 0.25rem;
  }

  .item-label { font-size: 0.6rem; }
  .item-value { font-size: 0.8rem; }
  .item-value.time { font-size: 0.7rem; }

  .strength { margin-bottom: 0.1rem; }
  .strength-text { font-size: 0.85rem; }
  .strength-value { font-size: 0.65rem; }
}
</style>