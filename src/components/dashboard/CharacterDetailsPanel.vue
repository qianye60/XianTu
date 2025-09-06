<template>
  <div class="character-details-content" v-if="baseInfo && playerStatus">
    <!-- Left Column: Core Identity -->
    <div class="details-column left-column">
      <div class="info-card identity-card">
        <div class="avatar" :class="baseInfo.性别 === '女' ? 'female' : 'male'">
          {{ baseInfo.名字?.charAt(0) }}
        </div>
        <div class="identity-info">
          <h3 class="character-name">{{ baseInfo.名字 }}</h3>
          <p class="character-title">{{ playerStatus.境界?.名称 }} / {{ baseInfo.出生 }}</p>
        </div>
      </div>

      <div class="info-card">
        <h4 class="card-title">核心状态</h4>
        <div class="core-stats">
          <div class="stat-item">
            <span>寿元</span>
            <span class="stat-value">{{ playerStatus.寿命?.当前 }} / {{ playerStatus.寿命?.最大 }}</span>
          </div>
           <div class="stat-item">
            <span>声望</span>
            <span class="stat-value">{{ playerStatus.声望 }}</span>
          </div>
        </div>
      </div>

      <div class="info-card">
        <h4 class="card-title">天赋与灵根</h4>
        <div class="tags-container">
          <span class="tag talent">{{ baseInfo.天资 }}</span>
          <span class="tag spiritual-root">{{ baseInfo.灵根 }}</span>
        </div>
      </div>
    </div>

    <!-- Middle Column: Real-time Vitals & Attributes -->
    <div class="details-column middle-column">
      <div class="info-card vitals-card">
        <h4 class="card-title">实时状态</h4>
        <div class="progress-bar-group">
          <ProgressBar
            v-for="vital in vitalsData"
            :key="vital.label"
            :label="vital.label"
            :current="vital.current"
            :max="vital.max"
            :color="vital.color"
          />
        </div>
      </div>

      <!-- 属性显示卡片 -->
      <div class="info-card attributes-card">
        <h4 class="card-title">六司属性</h4>
        <div v-if="attributeData" class="attributes-container">
          <!-- 最终属性显示 -->
          <div class="final-attributes">
            <h5 class="attribute-section-title">总计</h5>
            <div class="attributes-grid">
              <div v-for="(value, key) in attributeData.最终六司" :key="`final-${key}`" class="attribute-item final">
                <span class="attribute-name">{{ key }}</span>
                <span class="attribute-value">{{ value }}</span>
              </div>
            </div>
          </div>

          <!-- 先天与后天分解 -->
          <div class="attribute-breakdown">
            <div class="innate-section">
              <h5 class="attribute-section-title">先天</h5>
              <div class="attributes-grid compact">
                <div v-for="(value, key) in attributeData.先天六司" :key="`innate-${key}`" class="attribute-item compact">
                  <span class="attribute-name">{{ key }}</span>
                  <span class="attribute-value innate">{{ value }}</span>
                </div>
              </div>
            </div>

            <div class="acquired-section" v-if="hasAcquiredBonuses">
              <h5 class="attribute-section-title">后天</h5>
              <div class="attributes-grid compact">
                <div v-for="(value, key) in attributeData.后天六司" :key="`acquired-${key}`" class="attribute-item compact" v-show="value > 0">
                  <span class="attribute-name">{{ key }}</span>
                  <span class="attribute-value acquired">+{{ value }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="attributes-grid">
          <div v-for="(value, key) in baseInfo?.先天六司 || {}" :key="key" class="attribute-item">
            <span class="attribute-name">{{ key }}</span>
            <span class="attribute-value">{{ value }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Column: Status Effects -->
    <div class="details-column right-column">
      <div class="info-card effects-card">
        <h4 class="card-title">状态效果</h4>
        <div class="effects-list">
          <div v-if="!playerStatus.状态效果 || playerStatus.状态效果.length === 0" class="no-effects">
            无
          </div>
          <div v-for="effect in playerStatus.状态效果" :key="effect.状态名称" class="effect-item" :class="effect.类型.toLowerCase()">
            <div class="effect-header">
              <strong>{{ effect.状态名称 }}</strong>
              <span class="effect-duration">{{ effect.时间 }}</span>
            </div>
            <p class="effect-description">{{ effect.状态描述 }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="loading-placeholder">
    加载角色数据中...
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useCharacterStore } from '../../stores/characterStore';
import ProgressBar from '../shared/ProgressBar.vue';
import { calculateFinalAttributes } from '../../utils/attributeCalculation';

const characterStore = useCharacterStore();
const baseInfo = computed(() => characterStore.activeCharacterProfile?.角色基础信息);
const playerStatus = computed(() => characterStore.activeSaveSlot?.存档数据?.玩家角色状态);
const saveData = computed(() => characterStore.activeSaveSlot?.存档数据);

// 计算先天、后天和最终属性
const attributeData = computed(() => {
  if (!baseInfo.value?.先天六司 || !saveData.value) {
    return null;
  }
  
  return calculateFinalAttributes(baseInfo.value.先天六司, saveData.value);
});

// 检查是否有后天加成
const hasAcquiredBonuses = computed(() => {
  if (!attributeData.value) return false;
  
  return Object.values(attributeData.value.后天六司).some(value => value > 0);
});

type VitalData = {
  label: string;
  current: number;
  max: number;
  color: 'danger' | 'info' | 'accent';
};

const vitalsData = computed<VitalData[]>(() => {
  if (!playerStatus.value) return [];
  return [
    {
      label: '气血',
      current: playerStatus.value.气血?.当前 || 0,
      max: playerStatus.value.气血?.最大 || 1,
      color: 'danger'
    },
    {
      label: '灵气',
      current: playerStatus.value.灵气?.当前 || 0,
      max: playerStatus.value.灵气?.最大 || 1,
      color: 'info'
    },
    {
      label: '神识',
      current: playerStatus.value.神识?.当前 || 0,
      max: playerStatus.value.神识?.最大 || 1,
      color: 'accent'
    },
  ];
});

</script>

<style scoped>
.character-details-content {
  display: grid;
  grid-template-columns: 300px 1fr 280px;
  gap: 16px;
  padding: 16px;
  height: 100%;
  background-color: var(--color-background);
}

.details-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.info-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 12px 0;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 8px;
}

/* Left Column */
.identity-card {
  display: flex;
  align-items: center;
  gap: 16px;
}
.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  color: white;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover));
}
.avatar.female {
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-hover));
}
.character-name {
  font-size: 1.5rem;
  margin: 0;
}
.character-title {
  margin: 4px 0 0 0;
  color: var(--color-text-secondary);
}

.core-stats .stat-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}
.stat-value {
  font-weight: 500;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.875rem;
}
.talent {
  background-color: rgba(var(--color-success-rgb), 0.1);
  color: var(--color-success);
}
.spiritual-root {
  background-color: rgba(var(--color-info-rgb), 0.1);
  color: var(--color-info);
}


/* Middle Column */
.progress-bar-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 属性显示样式 */
.attributes-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.attribute-section-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--color-text-secondary);
}

.final-attributes {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.attribute-breakdown {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.attributes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.attributes-grid.compact {
  grid-template-columns: 1fr;
  gap: 8px;
}

.attribute-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background-color: var(--color-surface-hover);
  border-radius: 4px;
}

.attribute-item.compact {
  padding: 6px 8px;
}

.attribute-item.final {
  background-color: rgba(var(--color-primary-rgb), 0.1);
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
}

.attribute-name {
  color: var(--color-text-secondary);
}

.attribute-value {
  font-weight: bold;
}

.attribute-value.innate {
  color: var(--color-text);
}

.attribute-value.acquired {
  color: var(--color-success);
}

/* Right Column */
.effects-card {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}
.effects-list {
  flex-grow: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.no-effects {
  color: var(--color-text-secondary);
  text-align: center;
  margin-top: 24px;
}
.effect-item {
  border-left: 3px solid;
  padding: 8px 12px;
  background-color: var(--color-surface-hover);
}
.effect-item.buff {
  border-color: var(--color-success);
}
.effect-item.debuff {
  border-color: var(--color-danger);
}
.effect-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}
.effect-duration {
  color: var(--color-text-secondary);
}
.effect-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 4px 0 0 0;
}

.loading-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
}

/* --- Responsive Design --- */

@media (max-width: 1200px) {
  .character-details-content {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
  }
  .left-column {
    grid-row: 1;
    grid-column: 1 / 2;
  }
  .middle-column {
    grid-row: 1;
    grid-column: 2 / 3;
  }
  .right-column {
    grid-row: 2;
    grid-column: 1 / 3;
  }
}

@media (max-width: 768px) {
  .character-details-content {
    grid-template-columns: 1fr;
    padding: 8px;
    gap: 8px;
  }
  .left-column, .middle-column, .right-column {
    grid-column: 1 / 2;
  }
   .left-column { grid-row: 1; }
   .middle-column { grid-row: 2; }
   .right-column { grid-row: 3; }
   
   .attributes-grid {
    grid-template-columns: 1fr;
   }
   
   .attribute-breakdown {
    grid-template-columns: 1fr;
   }
}
</style>