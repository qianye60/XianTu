<template>
  <div class="thousand-dao-content">
    <!-- 主要内容 -->
    <div class="dao-main">
      <div v-if="loading" class="loading-placeholder">
        <div class="loading-spinner"></div>
        <p>加载三千大道数据中...</p>
      </div>

      <!-- 大道概览 -->
      <div v-else class="dao-overview">
        <div class="dao-stats">
          <div class="stat-card">
            <div class="stat-icon">🎯</div>
            <div class="stat-info">
              <div class="stat-value">{{ unlockedDaosCount }}</div>
              <div class="stat-label">已解锁大道</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">⚡</div>
            <div class="stat-info">
              <div class="stat-value">{{ totalDaoExperience }}</div>
              <div class="stat-label">总修行经验</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🏆</div>
            <div class="stat-info">
              <div class="stat-value">{{ highestStageCount }}</div>
              <div class="stat-label">高阶段大道</div>
            </div>
          </div>
        </div>

        <!-- 大道列表 -->
        <div class="dao-sections">
          <!-- 已解锁大道 -->
          <div class="dao-section">
            <h4 class="section-title">
              <span class="title-icon">✨</span>
              已解锁大道 ({{ unlockedDaosCount }})
            </h4>
            <div v-if="unlockedDaosCount === 0" class="empty-state">
              <div class="empty-icon">🌱</div>
              <p>尚未解锁任何大道</p>
              <span class="empty-tip">通过修炼、感悟和机遇来解锁新的大道</span>
            </div>
            <div v-else class="dao-grid">
              <div 
                v-for="daoName in daoSystem.已解锁大道" 
                :key="daoName"
                class="dao-card"
                :class="{ 'selected': selectedDao === daoName }"
                @click="selectDao(daoName)"
              >
                <div class="dao-card-header">
                  <h5 class="dao-name">{{ daoName }}</h5>
                  <div class="dao-stage">
                    {{ getDaoStageDisplay(daoName) }}
                  </div>
                </div>
                <div class="dao-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: getDaoProgressPercent(daoName) + '%' }"></div>
                  </div>
                  <span class="progress-text">{{ getDaoProgressPercent(daoName) }}%</span>
                </div>
                <div class="dao-experience">
                  {{ getDaoExperienceDisplay(daoName) }}
                </div>
              </div>
            </div>
          </div>

          <!-- 可解锁大道提示 -->
          <div class="dao-section">
            <h4 class="section-title">
              <span class="title-icon">🔮</span>
              大道感悟
            </h4>
            <div class="dao-discover-hint">
              <div class="discover-card">
                <div class="discover-icon">🌌</div>
                <div class="discover-content">
                  <h5>无量大道，由心而生</h5>
                  <p>大道三千，各有奥妙。通过修炼、感悟、机遇，可解锁更多大道路径。</p>
                  <ul class="discover-methods">
                    <li>🧘 深度修炼现有功法</li>
                    <li>💫 感悟天地自然规律</li>
                    <li>🎁 获得特殊机缘造化</li>
                    <li>📚 研习古籍典藏</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 大道详情侧边栏 -->
      <div v-if="selectedDao && selectedDaoProgress" class="dao-details-sidebar">
        <div class="details-header">
          <h3>{{ selectedDao }}</h3>
          <button class="close-details" @click="selectedDao = null">
            <X :size="20" />
          </button>
        </div>
        <div class="details-content">
          <div class="detail-section">
            <h4>修行境界</h4>
            <div class="stage-info">
              <div class="stage-display">
                <span class="stage-name">{{ getCurrentStageName(selectedDao) }}</span>
                <span class="stage-number">第{{ selectedDaoProgress.当前阶段 }}阶段</span>
              </div>
              <div class="stage-progress">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: getDaoProgressPercent(selectedDao) + '%' }"></div>
                </div>
                <span class="progress-detail">
                  {{ selectedDaoProgress.当前经验 }} / {{ getNextStageRequirement(selectedDao) }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="detail-section" v-if="getDaoPath(selectedDao)">
            <h4>大道描述</h4>
            <p class="dao-description">{{ getDaoPath(selectedDao)?.描述 || '此道深奥，需要进一步感悟才能理解其精髓。' }}</p>
          </div>
          
          <div class="detail-section">
            <h4>修行统计</h4>
            <div class="dao-stats-detail">
              <div class="stat-row">
                <span>当前经验:</span>
                <span class="stat-highlight">{{ selectedDaoProgress.当前经验 }}</span>
              </div>
              <div class="stat-row">
                <span>总经验:</span>
                <span class="stat-highlight">{{ selectedDaoProgress.总经验 }}</span>
              </div>
              <div class="stat-row">
                <span>修行状态:</span>
                <span class="status-badge unlocked">正在修行</span>
              </div>
              <div class="stat-row" v-if="getNextStageName(selectedDao)">
                <span>下一境界:</span>
                <span class="next-stage">{{ getNextStageName(selectedDao) }}</span>
              </div>
            </div>
          </div>

          <!-- 大道阶段列表 -->
          <div class="detail-section" v-if="getDaoPath(selectedDao)?.阶段列表?.length">
            <h4>境界阶段</h4>
            <div class="stages-list">
              <div 
                v-for="(stage, index) in getDaoPath(selectedDao)?.阶段列表" 
                :key="index"
                class="stage-item"
                :class="{ 
                  'completed': index < selectedDaoProgress.当前阶段,
                  'current': index === selectedDaoProgress.当前阶段,
                  'locked': index > selectedDaoProgress.当前阶段
                }"
              >
                <div class="stage-marker">
                  <span v-if="index < selectedDaoProgress.当前阶段">✅</span>
                  <span v-else-if="index === selectedDaoProgress.当前阶段">🔥</span>
                  <span v-else>🔒</span>
                </div>
                <div class="stage-details">
                  <div class="stage-name">{{ stage.名称 }}</div>
                  <div class="stage-desc">{{ stage.描述 }}</div>
                  <div class="stage-req">需要经验: {{ stage.突破经验 }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="details-actions">
          <button class="action-btn cultivate-dao" @click="cultivateDao(selectedDao)">
            <Zap :size="16" />
            深入感悟此道
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { RotateCcw, X, Zap } from 'lucide-vue-next';
import { useCharacterStore } from '@/stores/characterStore';
import { useActionQueueStore } from '@/stores/actionQueueStore';
import type { DaoProgress, DaoPath, ThousandDaoSystem } from '@/types/game.d.ts';
import { panelBus } from '@/utils/panelBus';

const characterStore = useCharacterStore();
const actionQueueStore = useActionQueueStore();
const loading = ref(false);
const selectedDao = ref<string | null>(null);

// 获取三千大道系统数据
const daoSystem = computed((): ThousandDaoSystem => {
  return characterStore.activeSaveSlot?.存档数据?.三千大道 || {
    已解锁大道: [],
    大道进度: {},
    大道路径定义: {}
  };
});

// 已解锁大道数量
const unlockedDaosCount = computed(() => {
  return daoSystem.value.已解锁大道.length;
});

// 选中的大道进度数据
const selectedDaoProgress = computed((): DaoProgress | null => {
  if (!selectedDao.value) return null;
  return daoSystem.value.大道进度[selectedDao.value] || null;
});

// 总修行经验
const totalDaoExperience = computed(() => {
  return Object.values(daoSystem.value.大道进度).reduce((total, progress) => {
    return total + (progress.总经验 || 0);
  }, 0);
});

// 高阶段大道数量（阶段>=5的大道）
const highestStageCount = computed(() => {
  return Object.values(daoSystem.value.大道进度).filter(progress => {
    return (progress.当前阶段 || 0) >= 5;
  }).length;
});

// 获取大道路径定义
const getDaoPath = (daoName: string): DaoPath | null => {
  return daoSystem.value.大道路径定义[daoName] || null;
};

// 获取大道阶段显示
const getDaoStageDisplay = (daoName: string): string => {
  const progress = daoSystem.value.大道进度[daoName];
  if (!progress) return '未门';
  
  const stage = progress.当前阶段 || 0;
  const daoPath = getDaoPath(daoName);
  
  if (daoPath?.阶段列表?.[stage]) {
    return daoPath.阶段列表[stage].名称;
  }
  
  return stage === 0 ? '未门' : `第${stage}阶段`;
};

// 获取大道进度百分比
const getDaoProgressPercent = (daoName: string): number => {
  const progress = daoSystem.value.大道进度[daoName];
  if (!progress) return 0;
  
  const currentExp = progress.当前经验 || 0;
  const nextStageReq = getNextStageRequirement(daoName);
  
  if (nextStageReq === 0) return 100;
  return Math.min(100, Math.round((currentExp / nextStageReq) * 100));
};

// 获取大道经验显示
const getDaoExperienceDisplay = (daoName: string): string => {
  const progress = daoSystem.value.大道进度[daoName];
  if (!progress) return '经验: 0';
  
  return `经验: ${progress.当前经验}/${getNextStageRequirement(daoName)} (总: ${progress.总经验})`;
};

// 获取当前阶段名称
const getCurrentStageName = (daoName: string): string => {
  const progress = daoSystem.value.大道进度[daoName];
  if (!progress) return '未门';
  
  const daoPath = getDaoPath(daoName);
  const stage = progress.当前阶段 || 0;
  
  return daoPath?.阶段列表?.[stage]?.名称 || (stage === 0 ? '未门' : `第${stage}阶段`);
};

// 获取下一阶段名称
const getNextStageName = (daoName: string): string | null => {
  const progress = daoSystem.value.大道进度[daoName];
  if (!progress) return null;
  
  const daoPath = getDaoPath(daoName);
  const nextStage = (progress.当前阶段 || 0) + 1;
  
  return daoPath?.阶段列表?.[nextStage]?.名称 || null;
};

// 获取下一阶段所需经验
const getNextStageRequirement = (daoName: string): number => {
  const progress = daoSystem.value.大道进度[daoName];
  if (!progress) return 100;
  
  const daoPath = getDaoPath(daoName);
  const currentStage = progress.当前阶段 || 0;
  
  if (daoPath?.阶段列表?.[currentStage]?.突破经验) {
    return daoPath.阶段列表[currentStage].突破经验;
  }
  
  // 默认经验计算：每阶段所需经验递增
  return (currentStage + 1) * 100;
};

// 选择大道
const selectDao = (daoName: string) => {
  selectedDao.value = selectedDao.value === daoName ? null : daoName;
};

// 修炼大道
const cultivateDao = (daoName: string) => {
  console.log('[三千大道面板] 开始感悟大道:', daoName);
  
  // 添加修炼大道动作到队列
  actionQueueStore.addAction({
    type: 'cultivate',
    itemName: daoName,
    itemType: '大道',
    description: `深入感悟《${daoName}》，领悟其中奥义`
  });
  
  console.log('[三千大道面板] 已将修炼大道动作加入队列');
};

// 刷新大道数据
const refreshDaoData = async () => {
  loading.value = true;
  try {
    await characterStore.syncFromTavern();
  } catch (error) {
    console.error('[三千大道面板] 刷新数据失败:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  console.log('[三千大道面板] 组件挂载，同步数据...');
  try {
    await characterStore.syncFromTavern();
  } catch (error) {
    console.error('[三千大道面板] 同步数据失败:', error);
  }
  panelBus.on('refresh', () => refreshDaoData());
});
</script>

<style scoped>
.thousand-dao-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  overflow: hidden;
}

/* 顶栏动作统一处理 */

/* 头部样式 */
.dao-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: var(--color-primary);
  border-radius: 10px;
  color: white;
}

.panel-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.panel-subtitle {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 主要内容 */
.dao-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.dao-overview {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 大道统计 */
.dao-stats {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-surface-light);
}

.stat-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--color-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.stat-icon {
  font-size: 1.5rem;
  opacity: 0.8;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.stat-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

/* 大道章节 */
.dao-sections {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.dao-section {
  margin-bottom: 2rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.title-icon {
  font-size: 1rem;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-tip {
  font-size: 0.85rem;
  margin-top: 8px;
  opacity: 0.8;
}

/* 大道网格 */
.dao-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.dao-card {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.dao-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.15);
}

.dao-card.selected {
  border-color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.05);
}

.dao-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.dao-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.dao-stage {
  background: var(--color-info);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* 进度条 */
.dao-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-success), var(--color-info));
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 600;
  min-width: 35px;
}

.dao-experience {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

/* 发现提示 */
.dao-discover-hint {
  padding: 0;
}

.discover-card {
  display: flex;
  gap: 20px;
  padding: 24px;
  background: linear-gradient(135deg, var(--color-surface) 0%, rgba(var(--color-primary-rgb), 0.05) 100%);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  align-items: flex-start;
}

.discover-icon {
  font-size: 3rem;
  opacity: 0.8;
  flex-shrink: 0;
}

.discover-content h5 {
  margin: 0 0 12px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.discover-content p {
  margin: 0 0 16px 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.discover-methods {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.discover-methods li {
  padding: 8px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--color-text);
  transition: all 0.2s ease;
}

.discover-methods li:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
}

/* 阶段显示增强 */
.stage-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stage-name {
  font-weight: 600;
  color: var(--color-primary);
}

.stage-number {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  background: var(--color-surface-light);
  padding: 2px 8px;
  border-radius: 12px;
}

.progress-detail {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

/* 统计高亮 */
.stat-highlight {
  font-weight: 600;
  color: var(--color-primary);
}

.next-stage {
  font-weight: 500;
  color: var(--color-info);
}

/* 阶段列表 */
.stages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 4px;
}

.stage-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.stage-item.completed {
  background: rgba(var(--color-success-rgb), 0.1);
  border: 1px solid rgba(var(--color-success-rgb), 0.3);
}

.stage-item.current {
  background: rgba(var(--color-primary-rgb), 0.1);
  border: 1px solid rgba(var(--color-primary-rgb), 0.3);
  box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.15);
}

.stage-item.locked {
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  opacity: 0.7;
}

.stage-marker {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
}

.stage-details {
  flex: 1;
}

.stage-details .stage-name {
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
}

.stage-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin-bottom: 4px;
}

.stage-req {
  font-size: 0.8rem;
  color: var(--color-info);
  font-weight: 500;
}

/* 增强按钮样式 */
.cultivate-dao {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-info));
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.cultivate-dao::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s ease;
}

.cultivate-dao:hover::before {
  left: 100%;
}

.cultivate-dao:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
}

/* 大道详情侧边栏 */
.dao-details-sidebar {
  width: 320px;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--color-border);
}

.details-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.close-details {
  background: none;
  border: none;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}

.close-details:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.details-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  font-weight: 600;
}

.stage-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.current-stage {
  font-weight: 500;
  color: var(--color-text);
}

.dao-description {
  color: var(--color-text);
  line-height: 1.6;
  margin: 0;
}

.dao-stats-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.unlocked {
  background: var(--color-success);
  color: white;
}

/* 详情操作 */
.details-actions {
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
}

.cultivate-dao {
  width: 100%;
  padding: 10px 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cultivate-dao:hover {
  background: var(--color-primary-hover);
}

/* 加载状态 */
.loading-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top: 3px solid var(--color-primary);
  border-radius: 50%;
  margin-bottom: 16px;
  opacity: 0.8;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .thousand-dao-content {
    padding: 0;
  }

  .dao-header {
    padding: 1rem;
    position: sticky;
    top: 0;
    z-index: 100;
    background: var(--color-surface);
  }

  .header-left {
    gap: 0.5rem;
  }

  .panel-title {
    font-size: 1.1rem;
  }

  .panel-subtitle {
    display: none;
  }

  .refresh-btn {
    padding: 0.5rem;
    font-size: 0.8rem;
  }

  .dao-main {
    flex-direction: column;
    padding: 0;
  }
  
  .dao-stats {
    padding: 1rem;
    gap: 0.75rem;
  }

  .stat-card {
    padding: 1rem;
    min-height: 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .stat-icon {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
  }

  .stat-value {
    font-size: 1.25rem;
    margin-bottom: 0.25rem;
  }

  .stat-label {
    font-size: 0.8rem;
  }

  .dao-sections {
    padding: 1rem;
  }

  .dao-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .dao-card {
    padding: 1rem;
  }

  .dao-card-header {
    margin-bottom: 0.75rem;
  }

  .dao-name {
    font-size: 0.95rem;
  }

  .dao-stage {
    font-size: 0.7rem;
  }
  
  .dao-details-sidebar {
    width: 100%;
    max-height: 60vh;
    border-left: none;
    border-top: 1px solid var(--color-border);
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 200;
    border-radius: 1rem 1rem 0 0;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  }

  .details-header {
    padding: 1rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
    border-radius: 1rem 1rem 0 0;
  }

  .details-header h3 {
    font-size: 1.1rem;
  }

  .details-content {
    padding: 1rem;
    max-height: calc(60vh - 120px);
    overflow-y: auto;
  }

  .detail-section {
    margin-bottom: 1.5rem;
  }

  .detail-section h4 {
    font-size: 0.85rem;
    margin-bottom: 0.75rem;
  }

  .details-actions {
    padding: 1rem;
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
  }

  .cultivate-dao {
    padding: 0.75rem;
    font-size: 0.9rem;
  }
}
</style>
