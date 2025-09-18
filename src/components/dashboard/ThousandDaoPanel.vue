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
              <div class="stat-value">{{ daoStats.已解锁大道?.length || 0 }}</div>
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
              <div class="stat-value">{{ completedDaoCount }}</div>
              <div class="stat-label">圆满大道</div>
            </div>
          </div>
        </div>

        <!-- 大道列表 -->
        <div class="dao-sections">
          <!-- 已解锁大道 -->
          <div class="dao-section">
            <h4 class="section-title">
              <span class="title-icon">✨</span>
              已解锁大道
            </h4>
            <div v-if="unlockedDaos.length === 0" class="empty-state">
              <div class="empty-icon">🌱</div>
              <p>尚未解锁任何大道</p>
              <span class="empty-tip">通过修炼和感悟来解锁新的大道</span>
            </div>
            <div v-else class="dao-grid">
              <div 
                v-for="dao in unlockedDaos" 
                :key="dao.道名"
                class="dao-card"
                :class="{ 'selected': selectedDao === dao.道名 }"
                @click="selectDao(dao.道名)"
              >
                <div class="dao-card-header">
                  <h5 class="dao-name">{{ dao.道名 }}</h5>
                  <div class="dao-stage">第{{ dao.当前阶段 || 0 }}阶段</div>
                </div>
                <div class="dao-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: getDaoProgress(dao) + '%' }"></div>
                  </div>
                  <span class="progress-text">{{ getDaoProgress(dao) }}%</span>
                </div>
                <div class="dao-experience">
                  总经验: {{ dao.总经验 || 0 }}
                </div>
              </div>
            </div>
          </div>

          <!-- 可解锁大道 -->
          <div class="dao-section">
            <h4 class="section-title">
              <span class="title-icon">🔒</span>
              可解锁大道
            </h4>
            <div class="dao-discover-hint">
              <p>通过修炼、感悟和机遇来发现新的大道...</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 大道详情侧边栏 -->
      <div v-if="selectedDao && selectedDaoData" class="dao-details-sidebar">
        <div class="details-header">
          <h3>{{ selectedDaoData.道名 }}</h3>
          <button class="close-details" @click="selectedDao = null">
            <X :size="20" />
          </button>
        </div>
        <div class="details-content">
          <div class="detail-section">
            <h4>修行阶段</h4>
            <div class="stage-info">
              <span class="current-stage">当前：第{{ selectedDaoData.当前阶段 || 0 }}阶段</span>
              <div class="stage-progress">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: getDaoProgress(selectedDaoData) + '%' }"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>修行心得</h4>
            <p class="dao-description">{{ getDaoDescription(selectedDaoData.道名) }}</p>
          </div>
          
          <div class="detail-section">
            <h4>修行统计</h4>
            <div class="dao-stats-detail">
              <div class="stat-row">
                <span>当前经验:</span>
                <span>{{ selectedDaoData.当前经验 || 0 }}</span>
              </div>
              <div class="stat-row">
                <span>总经验:</span>
                <span>{{ selectedDaoData.总经验 || 0 }}</span>
              </div>
              <div class="stat-row">
                <span>是否解锁:</span>
                <span class="status-badge unlocked">已解锁</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="details-actions">
          <button class="action-btn cultivate-dao" @click="cultivateDao(selectedDao)">
            深入感悟
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
import type { DaoProgress } from '@/types/game.d.ts';
import { panelBus } from '@/utils/panelBus';

const characterStore = useCharacterStore();
const loading = ref(false);
const selectedDao = ref<string | null>(null);

// 获取三千大道数据
const daoStats = computed(() => {
  return characterStore.activeSaveSlot?.存档数据?.三千大道 || {
    已解锁大道: [],
    大道进度: {}
  };
});

// 已解锁大道列表
const unlockedDaos = computed(() => {
  const daos = daoStats.value.已解锁大道 || [];
  return daos.map(daoName => {
    return (daoStats.value.大道进度 as Record<string, DaoProgress>)?.[daoName] || {
      道名: daoName,
      当前阶段: 0,
      当前经验: 0,
      总经验: 0,
      是否解锁: true
    };
  });
});

// 选中的大道数据
const selectedDaoData = computed(() => {
  if (!selectedDao.value) return null;
  return (daoStats.value.大道进度 as Record<string, DaoProgress>)?.[selectedDao.value] || null;
});

// 总修行经验
const totalDaoExperience = computed(() => {
  return unlockedDaos.value.reduce((total, dao) => total + (dao.总经验 || 0), 0);
});

// 圆满大道数量
const completedDaoCount = computed(() => {
  return unlockedDaos.value.filter(dao => (dao.当前阶段 || 0) >= 10).length;
});

// 获取大道进度百分比
const getDaoProgress = (dao: DaoProgress): number => {
  const currentExp = dao.当前经验 || 0;
  const stage = dao.当前阶段 || 0;
  const nextStageExp = (stage + 1) * 100; // 简单的经验计算
  return Math.min(100, (currentExp / nextStageExp) * 100);
};

// 获取大道描述
const getDaoDescription = (daoName: string): string => {
  const descriptions: Record<string, string> = {
    '基础修炼大道': '修仙之基，万法之源。通过基础修炼，领悟天地灵气运行规律。',
    '剑道': '剑心通明，剑意无穷。以剑入道，追求极致的攻击与防御平衡。',
    '丹道': '炼化天材地宝，感悟药理精髓。丹成九转，延年益寿。',
    '阵法大道': '布阵天地，借势而为。以阵法困敌，以阵法护己。',
    '符箓大道': '符载天地之力，箓记神鬼之威。符箓双修，神通广大。'
  };
  return descriptions[daoName] || '此道深奥，需要进一步感悟才能理解其精髓。';
};

// 选择大道
const selectDao = (daoName: string) => {
  selectedDao.value = selectedDao.value === daoName ? null : daoName;
};

// 修炼大道
const cultivateDao = (daoName: string) => {
  console.log('[三千大道面板] 开始感悟大道:', daoName);
  // 这里可以添加修炼大道的逻辑
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

.spinning {
  animation: spin 1s linear infinite;
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
  padding: 20px;
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: 12px;
  text-align: center;
  color: var(--color-text-secondary);
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
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 响应式设计 */
@media (max-width: 768px) {
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
