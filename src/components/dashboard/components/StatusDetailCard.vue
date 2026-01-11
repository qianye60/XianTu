<template>
  <div class="status-detail-card">
    <div class="card-header" :class="isBuff ? 'buff' : 'debuff'">
      <span class="type-icon">{{ isBuff ? '+' : '-' }}</span>
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
            <span class="strength-value">({{ effect.强度 }}/100)</span>
          </div>
          <div class="strength-bar">
            <div class="bar-fill" :style="{ width: `${Math.min(effect.强度, 100)}%`, backgroundColor: strengthColor }"></div>
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
  if (strength >= 80) return '极强';
  if (strength >= 60) return '强';
  if (strength >= 40) return '中等';
  if (strength >= 20) return '一般';
  return '轻微';
});

const strengthColor = computed(() => {
  const strength = props.effect.强度 || 0;
  if (strength >= 80) return '#ef4444';
  if (strength >= 60) return '#f59e0b';
  if (strength >= 40) return '#3b82f6';
  if (strength >= 20) return '#10b981';
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
  gap: 0.85rem;
  font-size: 0.85rem;
}

.card-header {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  border: 1px solid;
  align-self: flex-start;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
}
.card-header.buff {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(16, 185, 129, 0.08));
  border-color: rgba(16, 185, 129, 0.35);
}
.card-header.debuff {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(239, 68, 68, 0.08));
  border-color: rgba(239, 68, 68, 0.35);
}

.type-icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 700;
  background: rgba(15, 23, 42, 0.08);
}

.type-text {
  font-size: 0.85rem;
  font-weight: 600;
}
.card-header.buff .type-text { color: #10b981; }
.card-header.debuff .type-text { color: #ef4444; }

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.description {
  padding: 0.75rem 0.9rem;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.04), rgba(15, 23, 42, 0.02));
  border-radius: 10px;
  border: 1px solid var(--color-border);
  border-left: 3px solid;
  line-height: 1.5;
  color: var(--color-text);
}
.description.buff-border { border-color: #10b981; }
.description.debuff-border { border-color: #ef4444; }

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem;
}

.detail-item {
  padding: 0.7rem 0.8rem;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.02), rgba(15, 23, 42, 0.01));
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.item-label {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

.item-value {
  font-size: 0.9rem;
  font-weight: 600;
}
.item-value.source { color: var(--color-accent); }
.item-value.duration { color: var(--color-primary); }
.item-value.time { font-size: 0.75rem; font-weight: 500; color: var(--color-text); }

.strength {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}
.strength-text { font-size: 0.9rem; font-weight: 700; }
.strength-value { font-size: 0.7rem; color: var(--color-text-secondary); }

.strength-bar {
  height: 6px;
  background: rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 999px;
}

@media (max-width: 480px) {
  .status-detail-card {
    gap: 0.5rem;
    font-size: 0.75rem;
  }

  .card-header {
    gap: 0.4rem;
    padding: 0.35rem 0.55rem;
    border-radius: 8px;
  }

  .type-icon { width: 20px; height: 20px; font-size: 0.8rem; }
  .type-text { font-size: 0.75rem; }

  .description {
    padding: 0.55rem 0.65rem;
    font-size: 0.75rem;
  }

  .details-grid {
    grid-template-columns: 1fr;
    gap: 0.45rem;
  }

  .detail-item {
    padding: 0.55rem;
    gap: 0.3rem;
  }

  .item-label { font-size: 0.6rem; }
  .item-value { font-size: 0.8rem; }
  .item-value.time { font-size: 0.7rem; }

  .strength { margin-bottom: 0.1rem; }
  .strength-text { font-size: 0.85rem; }
  .strength-value { font-size: 0.65rem; }
}
</style>
