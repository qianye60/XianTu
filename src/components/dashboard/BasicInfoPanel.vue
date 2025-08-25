<template>
  <DashboardPanel title="角色信息" :header-icon="User">
    <!-- 角色头像与基本信息 -->
    <div class="character-header">
      <div class="avatar-section">
        <div class="character-avatar" :class="getAvatarClass()">
          <User :size="40" />
        </div>
        <div class="character-badge" :class="getRealmClass()">
          {{ characterData?.status.realm.name }}
        </div>
      </div>
      
      <div class="basic-info">
        <div class="character-name">{{ characterData?.basicInfo.name }}</div>
        <div class="character-title">{{ characterData?.basicInfo.talent }}</div>
        <div class="character-meta">
          <span class="meta-item">{{ characterData?.basicInfo.gender }}</span>
          <span class="meta-separator">·</span>
          <span class="meta-item">{{ characterData?.basicInfo.world }}</span>
          <span class="meta-separator">·</span>
          <span class="meta-item">{{ characterData?.basicInfo.birth }}</span>
        </div>
      </div>
    </div>

    <!-- 修炼状态概览 -->
    <div class="cultivation-overview">
      <div class="overview-grid">
        <div class="status-card realm">
          <div class="card-icon">🏮</div>
          <div class="card-content">
            <div class="card-label">修为境界</div>
            <div class="card-value">{{ characterData?.status.realm.name }}</div>
            <div class="card-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: characterData?.status.realm.progressPercent + '%' }"></div>
              </div>
              <div class="progress-text">{{ characterData?.status.realm.progressPercent }}%</div>
            </div>
          </div>
        </div>

        <div class="status-card lifespan">
          <div class="card-icon">⏳</div>
          <div class="card-content">
            <div class="card-label">寿元状态</div>
            <div class="card-value lifespan-value">{{ characterData?.status.lifespan.current }}/{{ characterData?.status.lifespan.max }}</div>
            <div class="card-extra">剩余{{ characterData?.status.lifespan.remaining }}年</div>
          </div>
        </div>

        <div class="status-card reputation">
          <div class="card-icon">⭐</div>
          <div class="card-content">
            <div class="card-label">声望地位</div>
            <div class="card-value">{{ characterData?.status.reputation.level }}</div>
            <div class="card-extra">{{ characterData?.status.reputation.value }}点</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 精气神状态 -->
    <div class="vitals-section">
      <div class="section-title">
        <Activity :size="18" />
        <span>精气神状态</span>
      </div>
      
      <div class="vitals-grid">
        <div class="vital-item qi-blood">
          <div class="vital-label">气血</div>
          <div class="vital-value">{{ characterData?.status.vitals.qiBlood.current }}/{{ characterData?.status.vitals.qiBlood.max }}</div>
          <div class="vital-bar">
            <div class="vital-fill" :style="{ width: characterData?.status.vitals.qiBlood.percent + '%' }"></div>
          </div>
        </div>

        <div class="vital-item ling-qi">
          <div class="vital-label">灵气</div>
          <div class="vital-value">{{ characterData?.status.vitals.lingQi.current }}/{{ characterData?.status.vitals.lingQi.max }}</div>
          <div class="vital-bar">
            <div class="vital-fill" :style="{ width: characterData?.status.vitals.lingQi.percent + '%' }"></div>
          </div>
        </div>

        <div class="vital-item shen-shi">
          <div class="vital-label">神识</div>
          <div class="vital-value">{{ characterData?.status.vitals.shenShi.current }}/{{ characterData?.status.vitals.shenShi.max }}</div>
          <div class="vital-bar">
            <div class="vital-fill" :style="{ width: characterData?.status.vitals.shenShi.percent + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 先天六司 -->
    <div class="attributes-section">
      <div class="section-title">
        <Zap :size="18" />
        <span>先天六司</span>
      </div>
      
      <div class="attributes-grid">
        <div 
          v-for="(attr, key) in characterData?.attributes" 
          :key="key"
          class="attribute-item"
          :class="`quality-${attr.color}`"
        >
          <div class="attr-icon">{{ getAttributeIcon(key) }}</div>
          <div class="attr-content">
            <div class="attr-name">{{ attr.name }}</div>
            <div class="attr-value">{{ attr.value }}</div>
            <div class="attr-quality" :class="`quality-${attr.color}`">{{ attr.quality }}</div>
          </div>
        </div>
      </div>
    </div>
  </DashboardPanel>
</template>

<script setup lang="ts">
import { User, Activity, Zap } from 'lucide-vue-next';
import DashboardPanel from '@/components/common/DashboardPanel.vue';
import { useUnifiedCharacterData } from '@/composables/useCharacterData';

const { characterData } = useUnifiedCharacterData();

// 方法
const getAvatarClass = () => {
  return 'avatar-default'; // 可根据角色信息动态变化
};

const getRealmClass = () => {
  const realm = characterData.value?.status.realm.name || '';
  if (realm.includes('仙')) return 'realm-immortal';
  if (realm.includes('神')) return 'realm-divine';
  if (realm.includes('圣')) return 'realm-saint';
  return 'realm-mortal';
};

const getAttributeIcon = (key: string | number) => {
  const icons: { [key: string]: string } = {
    '根骨': '🦴',
    '灵性': '✨',
    '悟性': '🧠',
    '气运': '🍀',
    '魅力': '🌺',
    '心性': '💎'
  };
  return icons[String(key)] || '⚡';
};
</script>

<style scoped>
.character-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #fefbff 0%, #f8f9ff 100%);
  border-radius: 12px;
  border: 1px solid #e0e7ff;
}

.avatar-section {
  position: relative;
  flex-shrink: 0;
}

.character-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border: 3px solid white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.character-badge {
  position: absolute;
  bottom: -5px;
  right: -5px;
  padding: 4px 8px;
  font-size: 0.7rem;
  font-weight: 600;
  border-radius: 12px;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.realm-mortal { background: #6b7280; color: white; }
.realm-immortal { background: #7c3aed; color: white; }
.realm-divine { background: #dc2626; color: white; }
.realm-saint { background: #059669; color: white; }

.basic-info {
  flex: 1;
}

.character-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.character-title {
  font-size: 1rem;
  color: #7c3aed;
  font-weight: 600;
  margin-bottom: 8px;
}

.character-meta {
  font-size: 0.9rem;
  color: #64748b;
}

.meta-separator {
  margin: 0 8px;
  opacity: 0.5;
}

/* 状态概览 */
.cultivation-overview {
  margin-bottom: 24px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.status-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-icon {
  font-size: 1.5rem;
  opacity: 0.8;
}

.card-content {
  flex: 1;
}

.card-label {
  font-size: 0.8rem;
  color: #64748b;
  margin-bottom: 4px;
}

.card-value {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.card-extra {
  font-size: 0.75rem;
  color: #94a3b8;
}

.lifespan-value {
  color: #ef4444;
}

.card-progress {
  margin-top: 8px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #f1f5f9;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #7c3aed 0%, #a855f7 100%);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.7rem;
  color: #64748b;
  text-align: center;
}

/* 精气神状态 */
.vitals-section,
.attributes-section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
}

.vitals-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.vital-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.vital-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
  min-width: 40px;
}

.vital-value {
  font-size: 0.8rem;
  color: #64748b;
  min-width: 60px;
  font-family: 'Courier New', monospace;
}

.vital-bar {
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.vital-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.qi-blood .vital-fill {
  background: linear-gradient(90deg, #ef4444 0%, #f87171 100%);
}

.ling-qi .vital-fill {
  background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
}

.shen-shi .vital-fill {
  background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);
}

/* 先天六司 */
.attributes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.attribute-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.attribute-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.attr-icon {
  font-size: 1.2rem;
  opacity: 0.8;
}

.attr-content {
  flex: 1;
  text-align: center;
}

.attr-name {
  font-size: 0.8rem;
  color: #64748b;
  margin-bottom: 4px;
}

.attr-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 2px;
}

.attr-quality {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

/* 品质颜色 */
.quality-purple { background: #a855f7; color: white; }
.quality-orange { background: #f59e0b; color: white; }
.quality-blue { background: #3b82f6; color: white; }
.quality-green { background: #10b981; color: white; }
.quality-gray { background: #6b7280; color: white; }

/* 深色主题 */
[data-theme="dark"] .character-header {
  background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
  border-color: #4b5563;
}

[data-theme="dark"] .character-name {
  color: #f1f5f9;
}

[data-theme="dark"] .character-title {
  color: #a78bfa;
}

[data-theme="dark"] .character-meta {
  color: #94a3b8;
}

[data-theme="dark"] .status-card,
[data-theme="dark"] .vital-item,
[data-theme="dark"] .attribute-item {
  background: #1e293b;
  border-color: #475569;
}

[data-theme="dark"] .card-value,
[data-theme="dark"] .vital-label,
[data-theme="dark"] .attr-value {
  color: #f1f5f9;
}

[data-theme="dark"] .section-title {
  color: #f1f5f9;
  border-bottom-color: #475569;
}
</style>