<template>
  <div class="body-stats-panel">
    <div v-if="showNotice" class="privacy-notice">
      <Lock :size="14" />
      <span>{{ envNoticeText }}</span>
    </div>

    <div v-if="!displayBodyStats" class="empty-stats">
      <div class="empty-icon"><FileQuestion :size="32" /></div>
      <p>{{ t('暂无详细身体数据') }}</p>
      <p class="sub-text">{{ isTavernEnvFlag ? t('请在酒馆中完善角色设定') : t('网页端不提供法身数据') }}</p>
    </div>

    <div v-else class="stats-container">
      <!-- 寿元状态 -->
      <div class="stat-section lifespan-section">
        <h3 class="section-title">
          <Clock :size="18" class="title-icon" />
          {{ t('寿元') }}
        </h3>
        <div v-if="lifespan" class="lifespan-display">
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
        <div v-else class="empty-hint">{{ t('寿元数据未生成') }}</div>
      </div>

      <!-- 基础体格 -->
      <div class="stat-section">
        <h3 class="section-title">
          <Ruler :size="18" class="title-icon" />
          {{ t('基础体格') }}
        </h3>
        <div v-if="hasBasicFigure" class="stats-grid">
          <div v-if="typeof displayBodyStats.身高 === 'number'" class="stat-card">
            <span class="label">{{ t('身高') }}</span>
            <span class="value">{{ displayBodyStats.身高 }} <span class="unit">cm</span></span>
          </div>
          <div v-if="typeof displayBodyStats.体重 === 'number'" class="stat-card">
            <span class="label">{{ t('体重') }}</span>
            <span class="value">{{ displayBodyStats.体重 }} <span class="unit">kg</span></span>
          </div>
          <div v-if="typeof displayBodyStats.体脂率 === 'number'" class="stat-card">
            <span class="label">{{ t('体脂率') }}</span>
            <span class="value">{{ displayBodyStats.体脂率 }} <span class="unit">%</span></span>
          </div>
        </div>
        <div v-else class="empty-hint">{{ t('体格数据未生成') }}</div>
        <div v-if="Array.isArray(displayBodyStats.外观特征) && displayBodyStats.外观特征.length" class="tags-container">
          <span v-for="tag in displayBodyStats.外观特征" :key="tag" class="feature-tag">{{ tag }}</span>
        </div>
      </div>

      <!-- 三围数据 -->
      <div class="stat-section">
        <h3 class="section-title">
          <Activity :size="18" class="title-icon" />
          {{ t('身材数据') }}
        </h3>
        <div v-if="hasMeasurements" class="measurements-display">
          <div class="measurement-item">
            <div class="measure-circle">
              <span class="measure-val">{{ displayBodyStats.三围?.胸围 }}</span>
              <span class="measure-label">{{ t('胸围') }}</span>
            </div>
          </div>
          <div class="measurement-divider">-</div>
          <div class="measurement-item">
            <div class="measure-circle">
              <span class="measure-val">{{ displayBodyStats.三围?.腰围 }}</span>
              <span class="measure-label">{{ t('腰围') }}</span>
            </div>
          </div>
          <div class="measurement-divider">-</div>
          <div class="measurement-item">
            <div class="measure-circle">
              <span class="measure-val">{{ displayBodyStats.三围?.臀围 }}</span>
              <span class="measure-label">{{ t('臀围') }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-hint">{{ t('身材数据未生成') }}</div>
        <div v-if="isNonEmptyText(displayBodyStats.罩杯)" class="cup-display">
          <span class="cup-label">{{ t('罩杯') }}</span>
          <span class="cup-value">{{ displayBodyStats.罩杯 }}</span>
        </div>
      </div>

      <!-- 详细描述 -->
      <div class="stat-section">
        <h3 class="section-title">
          <FileText :size="18" class="title-icon" />
          {{ t('详细特征') }}
        </h3>
        <div v-if="hasDescriptions" class="description-list">
          <div v-if="isNonEmptyText(displayBodyStats.胸部描述)" class="desc-item">
            <span class="desc-label">{{ t('胸部') }}</span>
            <p class="desc-content">{{ displayBodyStats.胸部描述 }}</p>
          </div>
          <div v-if="isNonEmptyText(displayBodyStats.私处描述)" class="desc-item">
            <span class="desc-label">{{ t('私处') }}</span>
            <p class="desc-content">{{ displayBodyStats.私处描述 }}</p>
          </div>
          <div v-if="isNonEmptyText(displayBodyStats.生殖器描述)" class="desc-item">
            <span class="desc-label">{{ t('生殖器') }}</span>
            <p class="desc-content">{{ displayBodyStats.生殖器描述 }}</p>
          </div>
        </div>
        <div v-else class="empty-hint">{{ t('详细特征未生成') }}</div>
      </div>

      <!-- 敏感点与开发 -->
      <div class="stat-section">
        <h3 class="section-title">
          <Flame :size="18" class="title-icon" />
          {{ t('敏感与开发') }}
        </h3>

        <div v-if="hasSensitiveData">
          <div v-if="Array.isArray(displayBodyStats.敏感点) && displayBodyStats.敏感点.length" class="sensitive-points">
            <span class="sub-title">{{ t('敏感点') }}:</span>
            <div class="points-list">
              <span v-for="point in displayBodyStats.敏感点" :key="point" class="point-tag">{{ point }}</span>
            </div>
          </div>

          <div v-if="developmentEntries.length" class="development-list">
            <div v-for="entry in developmentEntries" :key="entry.name" class="dev-item">
              <div class="dev-header">
                <span class="dev-name">{{ entry.name }}</span>
                <span class="dev-val">{{ entry.value }}%</span>
              </div>
              <div class="dev-bar">
                <div class="dev-fill" :style="{ width: entry.value + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-hint">{{ t('敏感数据未生成') }}</div>
      </div>

      <!-- 纹身与印记 -->
      <div class="stat-section">
        <h3 class="section-title">
          <Stamp :size="18" class="title-icon" />
          {{ t('纹身与印记') }}
        </h3>
        <ul v-if="Array.isArray(displayBodyStats.纹身与印记) && displayBodyStats.纹身与印记.length" class="markings-list">
          <li v-for="mark in displayBodyStats.纹身与印记" :key="mark" class="marking-item">
            {{ mark }}
          </li>
        </ul>
        <div v-else class="empty-hint">{{ t('暂无纹身与印记') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue';
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

type BodyStatsLike = Partial<BodyStats> & Record<string, unknown>;

const isNonEmptyText = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0 && value !== '待AI生成';
};

const displayBodyStats = computed<BodyStatsLike | null>(() => {
  if (!props.bodyStats || typeof props.bodyStats !== 'object') return null;
  const s = props.bodyStats as BodyStatsLike;

  const hasNumber = (key: string) => typeof s[key] === 'number' && !Number.isNaN(s[key]);
  const three = s['三围'];
  const hasThree = (() => {
    if (!three || typeof three !== 'object') return false;
    const t = three as Record<string, unknown>;
    return typeof t.胸围 === 'number' && typeof t.腰围 === 'number' && typeof t.臀围 === 'number';
  })();

  const hasAny =
    hasNumber('身高') ||
    hasNumber('体重') ||
    hasThree ||
    isNonEmptyText(s['胸部描述']) ||
    isNonEmptyText(s['私处描述']) ||
    isNonEmptyText(s['生殖器描述']) ||
    (Array.isArray(s['外观特征']) && s['外观特征'].length > 0) ||
    (Array.isArray(s['敏感点']) && s['敏感点'].length > 0) ||
    (s['开发度'] && typeof s['开发度'] === 'object' && Object.keys(s['开发度']).length > 0) ||
    (Array.isArray(s['纹身与印记']) && s['纹身与印记'].length > 0);

  return hasAny ? s : null;
});

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
  if (!displayBodyStats.value) return false;
  const s = displayBodyStats.value;
  return (Array.isArray(s.敏感点) && s.敏感点.length > 0) ||
         (s.开发度 && typeof s.开发度 === 'object' && Object.keys(s.开发度).length > 0);
});

const developmentEntries = computed(() => {
  const s = displayBodyStats.value;
  if (!s?.开发度 || typeof s.开发度 !== 'object') return [];
  const entries = Object.entries(s.开发度 as Record<string, unknown>)
    .map(([name, raw]) => ({ name, value: typeof raw === 'number' ? raw : Number(raw) }))
    .filter((e) => Number.isFinite(e.value))
    .map((e) => ({ ...e, value: Math.max(0, Math.min(100, Math.round(e.value))) }));
  return entries;
});

const hasBasicFigure = computed(() => {
  if (!displayBodyStats.value) return false;
  return typeof displayBodyStats.value.身高 === 'number' || typeof displayBodyStats.value.体重 === 'number' || typeof displayBodyStats.value.体脂率 === 'number';
});

const hasMeasurements = computed(() => {
  const s = displayBodyStats.value;
  if (!s?.三围) return false;
  return typeof s.三围.胸围 === 'number' && typeof s.三围.腰围 === 'number' && typeof s.三围.臀围 === 'number';
});

const hasDescriptions = computed(() => {
  const s = displayBodyStats.value;
  if (!s) return false;
  return isNonEmptyText(s.胸部描述) || isNonEmptyText(s.私处描述) || isNonEmptyText(s.生殖器描述);
});

const showNotice = computed(() => isTavernEnvFlag.value && nsfwMode.value);

// 寿元百分比
const lifespanPercent = computed(() => {
  if (!props.lifespan) return 0;
  return Math.min(100, Math.round((props.lifespan.current / props.lifespan.max) * 100));
});

</script>

<style scoped>
/* 核心容器 - 采用玻璃拟态设计 */
.body-stats-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  animation: fade-in 0.3s ease;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 隐私提示 */
.privacy-notice {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1rem;
  background: rgba(var(--color-primary-rgb), 0.08);
  border: 1px solid rgba(var(--color-primary-rgb), 0.25);
  border-radius: 12px;
  color: var(--color-primary);
  font-size: 0.85rem;
  font-weight: 500;
  backdrop-filter: blur(8px);
}

/* 空状态 */
.empty-stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  color: var(--color-text-secondary);
  text-align: center;
  background: rgba(0, 0, 0, 0.12);
  border-radius: 16px;
  border: 1px dashed rgba(255, 255, 255, 0.08);
}

.empty-icon {
  margin-bottom: 1rem;
  opacity: 0.5;
}

.sub-text {
  font-size: 0.85rem;
  opacity: 0.8;
  margin-top: 0.4rem;
}

/* 统计容器 */
.stats-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* 统计区块 - 玻璃拟态卡片 */
.stat-section {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-section:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
}

/* 寿元特殊样式 */
.lifespan-section {
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.1) 0%, rgba(56, 189, 248, 0.05) 100%);
  border-color: rgba(34, 211, 238, 0.25);
}

/* 区块标题 */
.section-title {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 1rem;
  padding-bottom: 0.7rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.title-icon {
  padding: 6px;
  border-radius: 8px;
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
}

/* 空提示 */
.empty-hint {
  padding: 1rem;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.06);
}

/* 寿元显示 */
.lifespan-display {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.lifespan-info {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  font-family: 'Consolas', 'Monaco', monospace;
}

.lifespan-current {
  font-size: 1.8rem;
  font-weight: 800;
  color: #22d3ee;
  text-shadow: 0 0 10px rgba(34, 211, 238, 0.3);
}

.lifespan-divider {
  color: var(--color-text-secondary);
  font-size: 1rem;
  opacity: 0.6;
}

.lifespan-max {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.lifespan-unit {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-left: 0.3rem;
}

.lifespan-bar {
  height: 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 5px;
  overflow: hidden;
  position: relative;
}

.lifespan-fill {
  height: 100%;
  background: linear-gradient(90deg, #22d3ee, #38bdf8);
  border-radius: 5px;
  transition: width 0.5s ease;
  box-shadow: 0 0 10px rgba(34, 211, 238, 0.4);
}

.lifespan-fill.warning {
  background: linear-gradient(90deg, #fbbf24, #f59e0b);
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.4);
}

.lifespan-fill.danger {
  background: linear-gradient(90deg, #f87171, #ef4444);
  box-shadow: 0 0 10px rgba(248, 113, 113, 0.4);
}

.lifespan-hint {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  text-align: right;
  opacity: 0.8;
}

/* 数据网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.8rem;
  margin-bottom: 1rem;
}

.stat-card {
  background: rgba(0, 0, 0, 0.15);
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.2s;
}

.stat-card:hover {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(var(--color-primary-rgb), 0.3);
}

.label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.value {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--color-text);
}

.unit {
  font-size: 0.75rem;
  font-weight: normal;
  color: var(--color-text-secondary);
  opacity: 0.8;
}

/* 标签容器 */
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 0.5rem;
}

.feature-tag {
  padding: 0.4rem 0.8rem;
  background: rgba(var(--color-primary-rgb), 0.1);
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
  border-radius: 999px;
  font-size: 0.85rem;
  color: var(--color-text);
  transition: all 0.2s;
}

.feature-tag:hover {
  background: rgba(var(--color-primary-rgb), 0.15);
  border-color: rgba(var(--color-primary-rgb), 0.3);
}

/* 三围显示 */
.measurements-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 1rem;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.measurement-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.measure-circle {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  border: 2px solid var(--color-accent);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(var(--color-accent-rgb), 0.08);
  box-shadow: 0 0 15px rgba(var(--color-accent-rgb), 0.2);
  transition: all 0.3s;
}

.measure-circle:hover {
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(var(--color-accent-rgb), 0.3);
}

.measure-val {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--color-accent);
}

.measure-label {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  margin-top: 0.2rem;
}

.measurement-divider {
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.2);
  font-weight: 300;
}

.cup-display {
  text-align: center;
  font-size: 1rem;
  color: var(--color-text);
  padding: 0.6rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.cup-label {
  color: var(--color-text-secondary);
  margin-right: 0.5rem;
}

.cup-value {
  font-weight: 800;
  color: var(--color-accent);
}

/* 描述列表 */
.description-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.desc-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.desc-label {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  padding-left: 0.3rem;
}

.desc-content {
  margin: 0;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--color-text);
}

/* 敏感点 */
.sensitive-points {
  margin-bottom: 1rem;
}

.sub-title {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 0.7rem;
}

.points-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.point-tag {
  padding: 0.4rem 0.8rem;
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 999px;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.point-tag:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.35);
}

/* 开发度列表 */
.development-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dev-item {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.dev-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--color-text);
}

.dev-name {
  font-weight: 600;
}

.dev-val {
  font-weight: 700;
  color: #ec4899;
}

.dev-bar {
  height: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.dev-fill {
  height: 100%;
  background: linear-gradient(90deg, #f472b6, #ec4899);
  border-radius: 4px;
  transition: width 0.3s ease;
  box-shadow: 0 0 8px rgba(236, 72, 153, 0.3);
}

/* 纹身列表 */
.markings-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.marking-item {
  padding: 0.6rem 0.8rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  border-left: 3px solid var(--color-accent);
  color: var(--color-text);
  font-size: 0.9rem;
}

/* 响应式 */
@media (max-width: 480px) {
  .measurements-display {
    gap: 1rem;
    padding: 1rem;
  }

  .measure-circle {
    width: 60px;
    height: 60px;
  }

  .measure-val {
    font-size: 1rem;
  }

  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  }
}
</style>
