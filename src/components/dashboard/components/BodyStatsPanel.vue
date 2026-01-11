<template>
  <div class="body-stats-panel">
    <!-- 警告提示 (仅在开发/调试时显示，或者作为沉浸式提示) -->
    <div class="privacy-notice">
      <Lock :size="14" />
      <span>{{ envNoticeText }}</span>
    </div>

    <div v-if="!bodyStats" class="empty-stats">
      <div class="empty-icon"><FileQuestion :size="32" /></div>
      <p>{{ t('暂无详细身体数据') }}</p>
      <p class="sub-text">{{ t('请在酒馆中完善角色设定') }}</p>
    </div>

    <div v-else class="stats-container">
      <!-- 寿元状态 -->
      <div v-if="lifespan" class="stat-section lifespan-section">
        <h3 class="section-title">
          <Clock :size="18" class="title-icon" />
          {{ t('寿元') }}
        </h3>
        <div class="lifespan-display">
          <div class="lifespan-info">
            <span class="lifespan-current">{{ lifespan.current }}</span>
            <span class="lifespan-divider">/</span>
            <span class="lifespan-max">{{ lifespan.max }}</span>
            <span class="lifespan-unit">{{ t('岁') }}</span>
          </div>
          <div class="lifespan-bar">
            <div class="lifespan-fill" :style="{ width: lifespanPercent + '%' }" :class="{ warning: lifespanPercent > 70, danger: lifespanPercent > 90 }"></div>
          </div>
          <div class="lifespan-hint">{{ t('剩余') }} {{ lifespan.max - lifespan.current }} {{ t('年') }}</div>
        </div>
      </div>

      <!-- 基础体格 -->
      <div class="stat-section">
        <h3 class="section-title">
          <Ruler :size="18" class="title-icon" />
          {{ t('基础体格') }}
        </h3>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="label">{{ t('身高') }}</span>
            <span class="value">{{ bodyStats.身高 || '???' }} <span class="unit">cm</span></span>
          </div>
          <div class="stat-card">
            <span class="label">{{ t('体重') }}</span>
            <span class="value">{{ bodyStats.体重 || '???' }} <span class="unit">kg</span></span>
          </div>
          <div v-if="bodyStats.体脂率" class="stat-card">
            <span class="label">{{ t('体脂率') }}</span>
            <span class="value">{{ bodyStats.体脂率 }} <span class="unit">%</span></span>
          </div>
        </div>
        <div v-if="bodyStats.外观特征 && bodyStats.外观特征.length" class="tags-container">
          <span v-for="tag in bodyStats.外观特征" :key="tag" class="feature-tag">{{ tag }}</span>
        </div>
      </div>

      <!-- 三围数据 -->
      <div class="stat-section" v-if="bodyStats.三围">
        <h3 class="section-title">
          <Activity :size="18" class="title-icon" />
          {{ t('身材数据') }}
        </h3>
        <div class="measurements-display">
          <div class="measurement-item">
            <div class="measure-circle">
              <span class="measure-val">{{ bodyStats.三围.胸围 || '?' }}</span>
              <span class="measure-label">{{ t('胸围') }}</span>
            </div>
          </div>
          <div class="measurement-divider">-</div>
          <div class="measurement-item">
            <div class="measure-circle">
              <span class="measure-val">{{ bodyStats.三围.腰围 || '?' }}</span>
              <span class="measure-label">{{ t('腰围') }}</span>
            </div>
          </div>
          <div class="measurement-divider">-</div>
          <div class="measurement-item">
            <div class="measure-circle">
              <span class="measure-val">{{ bodyStats.三围.臀围 || '?' }}</span>
              <span class="measure-label">{{ t('臀围') }}</span>
            </div>
          </div>
        </div>
        <div v-if="bodyStats.罩杯" class="cup-display">
          <span class="cup-label">{{ t('罩杯') }}</span>
          <span class="cup-value">{{ bodyStats.罩杯 }}</span>
        </div>
      </div>

      <!-- 详细描述 -->
      <div class="stat-section" v-if="bodyStats.胸部描述 || bodyStats.私处描述 || bodyStats.生殖器描述">
        <h3 class="section-title">
          <FileText :size="18" class="title-icon" />
          {{ t('详细特征') }}
        </h3>
        <div class="description-list">
          <div v-if="bodyStats.胸部描述" class="desc-item">
            <span class="desc-label">{{ t('胸部') }}</span>
            <p class="desc-content">{{ bodyStats.胸部描述 }}</p>
          </div>
          <div v-if="bodyStats.私处描述" class="desc-item">
            <span class="desc-label">{{ t('私处') }}</span>
            <p class="desc-content">{{ bodyStats.私处描述 }}</p>
          </div>
          <div v-if="bodyStats.生殖器描述" class="desc-item">
            <span class="desc-label">{{ t('生殖器') }}</span>
            <p class="desc-content">{{ bodyStats.生殖器描述 }}</p>
          </div>
        </div>
      </div>

      <!-- 敏感点与开发 -->
      <div class="stat-section" v-if="hasSensitiveData">
        <h3 class="section-title">
          <Flame :size="18" class="title-icon" />
          {{ t('敏感与开发') }}
        </h3>
        
        <div v-if="bodyStats.敏感点 && bodyStats.敏感点.length" class="sensitive-points">
          <span class="sub-title">{{ t('敏感点') }}:</span>
          <div class="points-list">
            <span v-for="point in bodyStats.敏感点" :key="point" class="point-tag">{{ point }}</span>
          </div>
        </div>

        <div v-if="bodyStats.开发度" class="development-list">
          <div v-for="(val, key) in bodyStats.开发度" :key="key" class="dev-item">
            <div class="dev-header">
              <span class="dev-name">{{ key }}</span>
              <span class="dev-val">{{ val }}%</span>
            </div>
            <div class="dev-bar">
              <div class="dev-fill" :style="{ width: val + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 纹身与印记 -->
      <div class="stat-section" v-if="bodyStats.纹身与印记 && bodyStats.纹身与印记.length">
        <h3 class="section-title">
          <Stamp :size="18" class="title-icon" />
          {{ t('纹身与印记') }}
        </h3>
        <ul class="markings-list">
          <li v-for="mark in bodyStats.纹身与印记" :key="mark" class="marking-item">
            {{ mark }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onActivated, ref } from 'vue';
import { useI18n } from '@/i18n';
import { Lock, Ruler, Activity, FileText, Flame, Stamp, FileQuestion, Clock } from 'lucide-vue-next';
import type { BodyStats } from '@/types/game';
import { isTavernEnv } from '@/utils/tavern';
import { getNsfwSettingsFromStorage } from '@/utils/nsfw';

const props = defineProps<{
  bodyStats?: BodyStats | unknown;
  lifespan?: { current: number; max: number };
}>();

const { t } = useI18n();

// Type guard or safe casting
const bodyStats = computed(() => props.bodyStats as BodyStats | undefined);

const isTavernEnvFlag = ref(isTavernEnv());
const nsfwMode = ref(true);

const refreshEnv = () => {
  isTavernEnvFlag.value = isTavernEnv();
  nsfwMode.value = getNsfwSettingsFromStorage().nsfwMode;
};

onMounted(refreshEnv);
onActivated(refreshEnv);

const envNoticeText = computed(() => {
  const envText = isTavernEnvFlag.value ? t('酒馆环境') : t('网页环境');
  const nsfwText = nsfwMode.value ? t('成人内容：开启') : t('成人内容：关闭');
  return `${t('私密档案')} · ${envText} · ${nsfwText}`;
});

const hasSensitiveData = computed(() => {
  if (!bodyStats.value) return false;
  return (bodyStats.value.敏感点 && bodyStats.value.敏感点.length > 0) ||
         (bodyStats.value.开发度 && Object.keys(bodyStats.value.开发度).length > 0);
});

// 寿元百分比
const lifespanPercent = computed(() => {
  if (!props.lifespan) return 0;
  return Math.min(100, Math.round((props.lifespan.current / props.lifespan.max) * 100));
});

</script>

<style scoped>
.body-stats-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: fade-in 0.3s ease;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.privacy-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(var(--color-primary-rgb), 0.1);
  border: 1px dashed var(--color-primary);
  border-radius: 8px;
  color: var(--color-primary);
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--color-text-secondary);
  text-align: center;
  background: var(--color-surface-light);
  border-radius: 12px;
  border: 1px dashed var(--color-border);
}

.empty-icon {
  margin-bottom: 12px;
  opacity: 0.5;
}

/* 寿元样式 */
.lifespan-section {
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.08) 0%, rgba(56, 189, 248, 0.05) 100%);
  border: 1px solid rgba(34, 211, 238, 0.2);
}

.lifespan-display {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.lifespan-info {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-family: monospace;
}

.lifespan-current {
  font-size: 1.5rem;
  font-weight: 700;
  color: #22d3ee;
}

.lifespan-divider {
  color: var(--color-text-secondary);
  font-size: 1rem;
}

.lifespan-max {
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.lifespan-unit {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-left: 4px;
}

.lifespan-bar {
  height: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.lifespan-fill {
  height: 100%;
  background: linear-gradient(90deg, #22d3ee, #38bdf8);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.lifespan-fill.warning {
  background: linear-gradient(90deg, #fbbf24, #f59e0b);
}

.lifespan-fill.danger {
  background: linear-gradient(90deg, #f87171, #ef4444);
}

.lifespan-hint {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  text-align: right;
}

.sub-text {
  font-size: 0.85rem;
  opacity: 0.8;
  margin-top: 4px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.title-icon {
  color: var(--color-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: var(--color-surface);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.value {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.unit {
  font-size: 0.8rem;
  font-weight: normal;
  color: var(--color-text-secondary);
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.feature-tag {
  padding: 4px 10px;
  background: var(--color-surface-hover);
  border-radius: 12px;
  font-size: 0.85rem;
  color: var(--color-text);
}

.measurements-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 20px;
  background: var(--color-surface);
  border-radius: 12px;
}

.measurement-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.measure-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2px solid var(--color-accent);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(var(--color-accent-rgb), 0.05);
}

.measure-val {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-accent);
}

.measure-label {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.measurement-divider {
  font-size: 1.5rem;
  color: var(--color-border);
  font-weight: 300;
}

.cup-display {
  text-align: center;
  font-size: 1rem;
  color: var(--color-text);
}

.cup-value {
  font-weight: 700;
  color: var(--color-accent);
  margin-left: 4px;
}

.description-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.desc-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.desc-label {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.desc-content {
  margin: 0;
  padding: 12px;
  background: var(--color-surface);
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--color-text);
}

.sensitive-points {
  margin-bottom: 16px;
}

.sub-title {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.points-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.point-tag {
  padding: 4px 10px;
  background: rgba(var(--color-danger-rgb), 0.1);
  color: var(--color-danger);
  border: 1px solid rgba(var(--color-danger-rgb), 0.2);
  border-radius: 12px;
  font-size: 0.85rem;
}

.development-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dev-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dev-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.dev-bar {
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}

.dev-fill {
  height: 100%;
  background: linear-gradient(90deg, #f472b6, #ec4899);
  border-radius: 4px;
}

.markings-list {
  list-style: disc;
  padding-left: 20px;
  margin: 0;
  color: var(--color-text);
}

.marking-item {
  margin-bottom: 4px;
}
</style>
