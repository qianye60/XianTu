<template>
  <div class="dao-panel">
    <!-- 头部统计 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="header-icon">🌌</div>
        <div class="header-info">
          <h3 class="panel-title">三千大道</h3>
          <span class="dao-count">{{ totalDaoCount }}条大道</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="refreshDaoData" :disabled="loading">
          <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
          <span class="btn-text">刷新</span>
        </button>
      </div>
    </div>

    <!-- 大道分类筛选 -->
    <div class="filter-section">
      <div class="filter-tabs">
        <button 
          v-for="category in daoCategories" 
          :key="category.key"
          class="filter-tab"
          :class="{ active: activeFilter === category.key }"
          @click="setActiveFilter(category.key)"
        >
          <span class="tab-icon">{{ category.icon }}</span>
          <span class="tab-name">{{ category.name }}</span>
          <span class="tab-count">{{ getCategoryCount(category.key) }}</span>
        </button>
      </div>
    </div>

    <!-- 大道列表 -->
    <div class="dao-container">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner">⏳</div>
        <div class="loading-text">正在加载大道数据...</div>
      </div>
      
      <div v-else-if="filteredDaoPaths.length === 0" class="empty-state">
        <div class="empty-icon">📿</div>
        <div class="empty-text">{{ getEmptyText() }}</div>
        <div class="empty-hint">通过修炼和机缘可以解锁更多大道</div>
      </div>

      <div v-else class="dao-list">
        <div 
          v-for="dao in filteredDaoPaths" 
          :key="dao.道名"
          class="dao-card"
          :class="getDaoLevelClass(dao.道名)"
          @click="selectDao(dao.道名)"
        >
          <div class="dao-icon">{{ getDaoIcon(dao.道名) }}</div>
          
          <div class="dao-info">
            <div class="dao-name">{{ dao.道名 }}</div>
            <div class="dao-stage">{{ getCurrentStageName(dao.道名) }}</div>
            <div class="dao-description">{{ dao.描述 }}</div>
            
            <div class="progress-section">
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: getProgressPercent(dao.道名) + '%' }"
                ></div>
              </div>
              <div class="progress-text">
                {{ getCurrentExp(dao.道名) }} / {{ getNextStageRequirement(dao.道名) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { RefreshCw } from 'lucide-vue-next';
import { useCharacterStore } from '@/stores/characterStore';
import { getTavernHelper } from '@/utils/tavern';
import { toast } from '@/utils/toast';
import type { ThousandDaoSystem, DaoPath, DaoProgress } from '@/types/game';

const characterStore = useCharacterStore();
const loading = ref(false);
const activeFilter = ref('all');

// 三千大道数据
const daoSystemData = ref<ThousandDaoSystem | null>(null);

// 大道分类
const daoCategories = [
  { key: 'all', name: '全部', icon: '🌌' },
  { key: 'unlocked', name: '已解锁', icon: '✨' },
  { key: 'progressing', name: '修炼中', icon: '🔥' },
  { key: 'mastered', name: '已精通', icon: '👑' },
];

// 解析大道数据
const allDaoPaths = computed((): DaoPath[] => {
  if (!daoSystemData.value?.大道路径定义) {
    return [];
  }
  
  return Object.values(daoSystemData.value.大道路径定义);
});

// 筛选后的大道
const filteredDaoPaths = computed(() => {
  const allPaths = allDaoPaths.value;
  
  switch (activeFilter.value) {
    case 'unlocked':
      return allPaths.filter(path => isUnlocked(path.道名));
    case 'progressing':
      return allPaths.filter(path => isProgressing(path.道名));
    case 'mastered':
      return allPaths.filter(path => isMastered(path.道名));
    default:
      return allPaths;
  }
});

// 总大道数量
const totalDaoCount = computed(() => daoSystemData.value?.已解锁大道.length || 0);

// 判断大道状态
const isUnlocked = (daoName: string): boolean => {
  return daoSystemData.value?.已解锁大道.includes(daoName) || false;
};

const isProgressing = (daoName: string): boolean => {
  const progress = daoSystemData.value?.大道进度[daoName];
  return progress ? progress.当前阶段 > 0 && progress.当前阶段 < getMaxStage(daoName) : false;
};

const isMastered = (daoName: string): boolean => {
  const progress = daoSystemData.value?.大道进度[daoName];
  return progress ? progress.当前阶段 >= getMaxStage(daoName) : false;
};

// 获取大道最大阶段
const getMaxStage = (daoName: string): number => {
  const daoPath = daoSystemData.value?.大道路径定义[daoName];
  return daoPath ? daoPath.阶段列表.length - 1 : 0;
};

// 获取当前阶段名称
const getCurrentStageName = (daoName: string): string => {
  const progress = daoSystemData.value?.大道进度[daoName];
  const daoPath = daoSystemData.value?.大道路径定义[daoName];
  
  if (!progress || !daoPath) return '未解锁';
  
  const stageIndex = progress.当前阶段;
  return daoPath.阶段列表[stageIndex]?.名称 || '未知阶段';
};

// 获取当前经验
const getCurrentExp = (daoName: string): number => {
  const progress = daoSystemData.value?.大道进度[daoName];
  return progress?.当前经验 || 0;
};

// 获取下一阶段经验需求
const getNextStageRequirement = (daoName: string): number => {
  const progress = daoSystemData.value?.大道进度[daoName];
  const daoPath = daoSystemData.value?.大道路径定义[daoName];
  
  if (!progress || !daoPath) return 0;
  
  const currentStage = daoPath.阶段列表[progress.当前阶段];
  return currentStage?.突破经验 || 0;
};

// 获取进度百分比
const getProgressPercent = (daoName: string): number => {
  const currentExp = getCurrentExp(daoName);
  const required = getNextStageRequirement(daoName);
  
  if (required === 0) return 100;
  return Math.min(100, (currentExp / required) * 100);
};

// 获取分类数量
const getCategoryCount = (category: string): number => {
  switch (category) {
    case 'all': 
      return allDaoPaths.value.length;
    case 'unlocked':
      return allDaoPaths.value.filter(path => isUnlocked(path.道名)).length;
    case 'progressing':
      return allDaoPaths.value.filter(path => isProgressing(path.道名)).length;
    case 'mastered':
      return allDaoPaths.value.filter(path => isMastered(path.道名)).length;
    default:
      return 0;
  }
};

// 获取空状态文本
const getEmptyText = (): string => {
  switch (activeFilter.value) {
    case 'unlocked':
      return '尚未解锁任何大道';
    case 'progressing':
      return '当前没有修炼中的大道';
    case 'mastered':
      return '尚未精通任何大道';
    default:
      return '大道茫茫，机缘未至';
  }
};

// 获取大道图标
const getDaoIcon = (daoName: string): string => {
  const iconMap: Record<string, string> = {
    '丹道': '💊', '器道': '⚔️', '符道': '📜', '阵道': '🔮',
    '剑道': '⚔️', '刀道': '🔪', '拳道': '👊', '身法道': '🏃',
    '音律道': '🎵', '画道': '🎨', '茶道': '🍃', '医道': '⚕️',
    '占卜道': '🔮', '傀儡道': '🎭', '毒道': '☠️', '兽道': '🦅'
  };
  return iconMap[daoName] || '✨';
};

// 获取大道等级样式
const getDaoLevelClass = (daoName: string): string => {
  const progress = daoSystemData.value?.大道进度[daoName];
  if (!progress) return 'locked';
  
  const stageIndex = progress.当前阶段;
  if (stageIndex === 0) return 'not-started';
  if (stageIndex <= 2) return 'beginner';
  if (stageIndex <= 4) return 'intermediate';
  if (stageIndex <= 6) return 'advanced';
  return 'master';
};

// 设置活跃筛选器
const setActiveFilter = (filterKey: string) => {
  activeFilter.value = filterKey;
};

// 选择大道
const selectDao = (daoName: string) => {
  toast.info(`查看${daoName}详情`);
};

// 刷新大道数据
const refreshDaoData = async () => {
  loading.value = true;
  try {
    await loadDaoData();
    toast.success('大道数据已刷新');
  } catch (error) {
    console.error('[三千大道] 刷新失败:', error);
    toast.error('刷新失败');
  } finally {
    loading.value = false;
  }
};

// 加载大道数据
const loadDaoData = async () => {
  try {
    // 首先从角色存档中加载
    const activeSave = characterStore.activeSaveSlot;
    if (activeSave?.存档数据?.三千大道) {
      daoSystemData.value = activeSave.存档数据.三千大道;
      console.log('[三千大道] 从存档加载数据:', daoSystemData.value);
    }

    // 尝试从酒馆变量获取更新的数据
    const helper = getTavernHelper();
    if (helper) {
      const chatVars = await helper.getVariables({ type: 'chat' });
      
      // 检查酒馆中的大道数据
      if (chatVars['三千大道']) {
        const tavernDaoData = chatVars['三千大道'];
        if (tavernDaoData) {
          daoSystemData.value = tavernDaoData;
          console.log('[三千大道] 从酒馆加载数据:', daoSystemData.value);
        }
      }
    }

    // 如果没有数据，创建默认空系统
    if (!daoSystemData.value) {
      daoSystemData.value = {
        已解锁大道: [],
        大道进度: {},
        大道路径定义: {},
      };
      console.log('[三千大道] 创建默认空系统');
    }

  } catch (error) {
    console.error('[三千大道] 加载数据失败:', error);
  }
};

onMounted(() => {
  loadDaoData();
});
</script>

<style scoped>
.dao-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(135deg, #fff9f0 0%, #fffaf5 100%);
  overflow: hidden;
  position: relative;
}

/* 头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--color-surface);
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
  margin: 1rem 1rem 0 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  font-size: 1.5rem;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.panel-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-primary);
}

.dao-count {
  font-size: 0.875rem;
  color: var(--color-accent);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-surface);
  color: var(--color-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.action-btn:hover {
  background: var(--color-surface-light);
  border-color: var(--color-primary);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 筛选器 */
.filter-section {
  margin: 1rem;
  padding: 0.75rem 1rem;
  background: var(--color-surface);
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}

.filter-tabs {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.filter-tabs::-webkit-scrollbar {
  display: none;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 1.5rem;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.875rem;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.filter-tab:hover {
  background: var(--color-surface-light);
}

.filter-tab.active {
  background: var(--color-primary);
  color: var(--color-background);
}

.tab-count {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 0.75rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
  min-width: 1.25rem;
  text-align: center;
}

.filter-tab.active .tab-count {
  background: rgba(255, 255, 255, 0.2);
}

/* 大道容器 */
.dao-container {
  flex: 1;
  margin: 0 1rem 1rem 1rem;
  overflow-y: auto;
  min-height: 0;
  
  /* 改进的滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(var(--color-primary-rgb), 0.3) rgba(243, 244, 246, 0.5);
}

/* Webkit 滚动条样式 */
.dao-container::-webkit-scrollbar {
  width: 8px;
}

.dao-container::-webkit-scrollbar-track {
  background: rgba(243, 244, 246, 0.5);
  border-radius: 4px;
}

.dao-container::-webkit-scrollbar-thumb {
  background: rgba(var(--color-primary-rgb), 0.3);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.dao-container::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--color-primary-rgb), 0.5);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
}

.loading-spinner,
.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.loading-text,
.empty-text {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

/* 大道列表 */
.dao-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dao-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--color-surface);
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: fit-content;
}

.dao-card:hover {
  background: var(--color-surface-light);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.15);
}

.dao-icon {
  font-size: 2rem;
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-light);
  border-radius: 50%;
  flex-shrink: 0;
}

.dao-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dao-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-primary);
  line-height: 1.2;
  word-wrap: break-word;
}

.dao-stage {
  font-size: 0.875rem;
  color: var(--color-accent);
  font-weight: 500;
}

.dao-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  word-wrap: break-word;
  flex: 1;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-top: auto;
}

.progress-bar {
  height: 0.5rem;
  background: var(--color-border-light);
  border-radius: 0.25rem;
  overflow: hidden;
  flex-shrink: 0;
  min-width: 120px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), var(--color-primary));
  transition: width 0.3s ease;
  min-width: 2px;
}

.progress-text {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-align: center;
  white-space: nowrap;
}

/* 大道等级样式 */
.dao-card.locked { 
  opacity: 0.5;
  border-left: 4px solid #6b7280; 
}
.dao-card.not-started { 
  border-left: 4px solid var(--color-border); 
}
.dao-card.beginner { 
  border-left: 4px solid #84cc16; 
}
.dao-card.intermediate { 
  border-left: 4px solid #06b6d4; 
}
.dao-card.advanced { 
  border-left: 4px solid #8b5cf6; 
}
.dao-card.master { 
  border-left: 4px solid var(--color-accent);
  box-shadow: 0 0 20px rgba(var(--color-accent-rgb), 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dao-panel {
    padding: 0;
  }
  
  .panel-header {
    margin: 0.5rem;
    padding: 0.75rem;
  }
  
  .filter-section {
    margin: 0.5rem;
  }
  
  .dao-container {
    margin: 0 0.5rem 0.5rem 0.5rem;
  }
  
  .dao-card {
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
  }
  
  .dao-icon {
    align-self: center;
  }
  
  .progress-bar {
    min-width: 100px;
  }
  
  .header-actions .btn-text {
    display: none;
  }
  
  .filter-tabs {
    justify-content: center;
    flex-wrap: wrap;
  }
}
</style>