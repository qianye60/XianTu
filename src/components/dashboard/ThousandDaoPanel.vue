<template>
  <div class="dao-panel">
    <!-- 顶部统计卡片 -->
    <div class="dao-stats-header">
      <div class="stats-card">
        <div class="stats-icon enlightened">
          <Sparkles :size="20" />
        </div>
        <div class="stats-info">
          <span class="stats-value">{{ unlockedDaosCount }}</span>
          <span class="stats-label">已悟大道</span>
        </div>
      </div>
      <div class="stats-card">
        <div class="stats-icon experience">
          <Zap :size="20" />
        </div>
        <div class="stats-info">
          <span class="stats-value">{{ formatNumber(totalDaoExperience) }}</span>
          <span class="stats-label">总悟道值</span>
        </div>
      </div>
      <div class="stats-actions">
        <button class="action-btn-icon" @click="openDaoExplore" title="探索新道">
          <Compass :size="18" />
        </button>
        <button class="action-btn-icon" @click="startMeditation" title="冥想感悟">
          <Moon :size="18" />
        </button>
      </div>
    </div>

    <!-- 筛选和排序栏 -->
    <div v-if="unlockedDaosCount > 0" class="dao-filter-bar">
      <div class="filter-tags">
        <button
          v-for="category in daoCategories"
          :key="category.key"
          class="filter-tag"
          :class="{ active: activeCategory === category.key }"
          @click="activeCategory = category.key"
        >
          <component :is="category.icon" :size="14" />
          <span>{{ category.label }}</span>
          <span class="tag-count">{{ getCategoryCount(category.key) }}</span>
        </button>
      </div>
      <div class="sort-dropdown">
        <select v-model="activeSortKey" class="sort-select">
          <option v-for="option in sortOptions" :key="option.key" :value="option.key">
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="dao-content">
      <!-- 无大道时的快速入门 -->
      <div v-if="unlockedDaosCount === 0" class="dao-empty">
        <div class="empty-illustration">
          <div class="empty-icon-wrapper">
            <Sparkles :size="48" />
          </div>
          <div class="empty-rings">
            <div class="ring ring-1"></div>
            <div class="ring ring-2"></div>
            <div class="ring ring-3"></div>
          </div>
        </div>
        <h3 class="empty-title">尚未领悟任何大道</h3>
        <p class="empty-desc">天地法则蕴含无穷奥秘，静心感悟方能窥见一二</p>
        <div class="quick-actions">
          <button class="action-btn primary" @click="comprehendFromSkill">
            <BookOpen :size="16" />
            从功法领悟
          </button>
          <button class="action-btn secondary" @click="comprehendFromNature">
            <Sparkles :size="16" />
            观天地悟道
          </button>
        </div>
      </div>

      <!-- 大道列表 -->
      <div v-else class="dao-list">
        <div
          v-for="daoName in sortedDaosList"
          :key="daoName"
          class="dao-card"
          :class="{ active: selectedDao === daoName }"
          @click="selectDao(daoName)"
        >
          <div class="dao-card-header">
            <div class="dao-icon">
              <Sparkles :size="18" />
            </div>
            <div class="dao-title-group">
              <span class="dao-name">{{ daoName }}</span>
              <span class="dao-stage-badge" :class="getDaoStageClass(daoName)">
                {{ getDaoStageDisplay(daoName) }}
              </span>
            </div>
          </div>

          <div class="dao-card-body">
            <div class="dao-progress-wrapper">
              <div class="dao-progress-bar">
                <div
                  class="dao-progress-fill"
                  :style="{ width: getDaoProgressPercent(daoName) + '%' }"
                ></div>
                <div class="dao-progress-glow"></div>
              </div>
              <span class="dao-progress-text">{{ getDaoProgressPercent(daoName) }}%</span>
            </div>
            <div class="dao-exp-info">
              <span class="exp-current">{{ formatNumber(getDaoData(daoName)?.当前经验 ?? 0) }}</span>
              <span class="exp-divider">/</span>
              <span class="exp-required">{{ formatNumber(getNextStageRequirement(daoName)) }}</span>
            </div>
          </div>

          <!-- 快捷操作 -->
          <div class="dao-card-actions" @click.stop>
            <button class="dao-action-btn cultivate" @click="cultivateDao(daoName)" title="感悟">
              <Zap :size="14" />
            </button>
            <button class="dao-action-btn meditate" @click="meditateDao(daoName)" title="参悟">
              <Moon :size="14" />
            </button>
            <button
              v-if="canBreakthroughDao(daoName)"
              class="dao-action-btn breakthrough"
              @click="attemptDaoBreakthrough(daoName)"
              title="突破"
            >
              <TrendingUp :size="14" />
            </button>
          </div>
        </div>
      </div>

      <!-- 选中大道的详情面板 -->
      <div v-if="selectedDao && selectedDaoProgress" class="dao-detail-panel">
        <div class="detail-header">
          <div class="detail-title-group">
            <div class="detail-icon">
              <Sparkles :size="24" />
            </div>
            <div>
              <h3 class="detail-title">{{ selectedDao }}</h3>
              <span class="detail-stage">{{ getDaoStageDisplay(selectedDao) }}</span>
            </div>
          </div>
          <button class="close-btn" @click="selectedDao = null">
            <span>关闭</span>
            <X :size="16" />
          </button>
        </div>

        <div class="detail-body">
          <!-- 核心数据卡片 -->
          <div class="detail-stats-grid">
            <div class="detail-stat-card">
              <div class="stat-card-icon">
                <Award :size="16" />
              </div>
              <div class="stat-card-content">
                <span class="stat-card-value">{{ getDaoStageDisplay(selectedDao) }}</span>
                <span class="stat-card-label">当前阶段</span>
              </div>
            </div>
            <div class="detail-stat-card">
              <div class="stat-card-icon">
                <Zap :size="16" />
              </div>
              <div class="stat-card-content">
                <span class="stat-card-value">{{ formatNumber(selectedDaoProgress.当前经验 ?? 0) }}</span>
                <span class="stat-card-label">当前经验</span>
              </div>
            </div>
            <div class="detail-stat-card">
              <div class="stat-card-icon">
                <Target :size="16" />
              </div>
              <div class="stat-card-content">
                <span class="stat-card-value">{{ formatNumber(getNextStageRequirement(selectedDao)) }}</span>
                <span class="stat-card-label">突破所需</span>
              </div>
            </div>
            <div class="detail-stat-card">
              <div class="stat-card-icon progress-icon">
                <TrendingUp :size="16" />
              </div>
              <div class="stat-card-content">
                <span class="stat-card-value">{{ getDaoProgressPercent(selectedDao) }}%</span>
                <span class="stat-card-label">进度</span>
              </div>
            </div>
          </div>

          <!-- 阶段进度轨道 -->
          <div class="stage-progress-section" v-if="getDaoData(selectedDao)?.阶段列表?.length">
            <h4 class="section-title">修炼阶段</h4>
            <div class="stage-timeline">
              <div
                v-for="(stage, index) in getDaoData(selectedDao)?.阶段列表"
                :key="index"
                class="stage-node"
                :class="{
                  done: index < (selectedDaoProgress?.当前阶段 ?? 0),
                  current: index === (selectedDaoProgress?.当前阶段 ?? 0),
                  locked: index > (selectedDaoProgress?.当前阶段 ?? 0)
                }"
              >
                <div class="node-marker">
                  <Check v-if="index < (selectedDaoProgress?.当前阶段 ?? 0)" :size="12" />
                  <span v-else class="node-number">{{ index + 1 }}</span>
                </div>
                <div class="node-content">
                  <span class="node-name">{{ stage.名称 }}</span>
                  <span class="node-desc">{{ stage.描述 }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 突破指引 -->
          <div v-if="canBreakthroughDao(selectedDao)" class="breakthrough-guide">
            <div class="guide-header">
              <TrendingUp :size="16" />
              <span>突破指引</span>
            </div>
            <div class="guide-content">
              <p class="guide-desc">当前悟道值已达到突破要求，可尝试突破至下一阶段</p>
              <ul class="guide-tips">
                <li>确保状态良好，无负面效果干扰</li>
                <li>选择灵气充沛之地进行突破</li>
                <li>准备护道丹药以防万一</li>
              </ul>
              <div class="breakthrough-chance">
                <span class="chance-label">预估成功率:</span>
                <span class="chance-value">{{ getDaoBreakthroughChance(selectedDao) }}%</span>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="detail-actions">
            <button class="action-btn primary large" @click="cultivateDao(selectedDao)">
              <Zap :size="18" />
              感悟此道
            </button>
            <button class="action-btn secondary large" @click="meditateDao(selectedDao)">
              <Moon :size="18" />
              深度参悟
            </button>
            <button
              v-if="canBreakthroughDao(selectedDao)"
              class="action-btn warning large"
              @click="attemptDaoBreakthrough(selectedDao)"
            >
              <TrendingUp :size="18" />
              尝试突破
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { X, Zap, Moon, TrendingUp, Compass, BookOpen, Sparkles, Check, Award, Target, Flame, Scale, Sword, Sun } from 'lucide-vue-next';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useActionQueueStore } from '@/stores/actionQueueStore';
import type { DaoData, ThousandDaoSystem } from '@/types/game.d.ts';
import { toast } from '@/utils/toast';

const gameStateStore = useGameStateStore();
const actionQueueStore = useActionQueueStore();
const selectedDao = ref<string | null>(null);

// 筛选和排序状态
const activeCategory = ref('all');
const activeSortKey = ref('progress');

// 大道分类定义
const daoCategories = [
  { key: 'all', label: '全部', icon: Sparkles },
  { key: 'nature', label: '自然', icon: Sun },
  { key: 'concept', label: '法则', icon: Scale },
  { key: 'combat', label: '战斗', icon: Sword },
  { key: 'cultivation', label: '修行', icon: Flame },
];

// 排序选项
const sortOptions = [
  { key: 'progress', label: '按进度' },
  { key: 'stage', label: '按阶段' },
  { key: 'experience', label: '按经验' },
  { key: 'name', label: '按名称' },
];

// 获取大道分类
const getDaoCategory = (daoName: string): string => {
  const categoryMap: Record<string, string> = {
    '剑': 'combat', '刀': 'combat', '拳': 'combat', '枪': 'combat', '戟': 'combat',
    '金': 'nature', '木': 'nature', '水': 'nature', '火': 'nature', '土': 'nature',
    '风': 'nature', '雷': 'nature', '冰': 'nature', '雪': 'nature',
    '因果': 'concept', '轮回': 'concept', '时间': 'concept', '空间': 'concept', '命运': 'concept',
    '丹': 'cultivation', '炼器': 'cultivation', '阵': 'cultivation', '符': 'cultivation',
  };
  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (daoName.includes(keyword)) return category;
  }
  return 'other';
};

// 获取分类数量
const getCategoryCount = (categoryKey: string): number => {
  if (categoryKey === 'all') return unlockedDaosList.value.length;
  return unlockedDaosList.value.filter(daoName => getDaoCategory(daoName) === categoryKey).length;
};

// 格式化数字
const formatNumber = (num: number): string => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
};

// 三千大道数据
const daoSystem = computed((): ThousandDaoSystem => {
  return gameStateStore.thousandDao || { 大道列表: {} };
});

// 已解锁大道
const unlockedDaosList = computed(() => {
  return Object.entries(daoSystem.value.大道列表)
    .filter(([_, daoData]) => daoData.是否解锁)
    .map(([daoName]) => daoName);
});

const unlockedDaosCount = computed(() => unlockedDaosList.value.length);

// 筛选后的大道列表
const filteredDaosList = computed(() => {
  if (activeCategory.value === 'all') return unlockedDaosList.value;
  return unlockedDaosList.value.filter(daoName => getDaoCategory(daoName) === activeCategory.value);
});

// 排序后的大道列表
const sortedDaosList = computed(() => {
  const list = [...filteredDaosList.value];
  switch (activeSortKey.value) {
    case 'progress':
      return list.sort((a, b) => getDaoProgressPercent(b) - getDaoProgressPercent(a));
    case 'stage':
      return list.sort((a, b) => {
        const stageA = getDaoData(a)?.当前阶段 ?? 0;
        const stageB = getDaoData(b)?.当前阶段 ?? 0;
        return stageB - stageA;
      });
    case 'experience':
      return list.sort((a, b) => {
        const expA = getDaoData(a)?.总经验 ?? 0;
        const expB = getDaoData(b)?.总经验 ?? 0;
        return expB - expA;
      });
    case 'name':
      return list.sort((a, b) => a.localeCompare(b, 'zh-CN'));
    default:
      return list;
  }
});

const selectedDaoProgress = computed((): DaoData | null => {
  if (!selectedDao.value) return null;
  return daoSystem.value.大道列表[selectedDao.value] || null;
});

const totalDaoExperience = computed(() => {
  return Object.values(daoSystem.value.大道列表).reduce((total, daoData) => {
    return total + (daoData.总经验 ?? 0);
  }, 0);
});

// 获取大道数据
const getDaoData = (daoName: string): DaoData | null => {
  return daoSystem.value.大道列表[daoName] || null;
};

// 获取阶段样式类
const getDaoStageClass = (daoName: string): string => {
  const daoData = getDaoData(daoName);
  if (!daoData) return 'stage-0';
  const stage = daoData.当前阶段 ?? 0;
  if (stage >= 5) return 'stage-max';
  if (stage >= 3) return 'stage-high';
  if (stage >= 1) return 'stage-mid';
  return 'stage-low';
};

// 获取大道阶段显示
const getDaoStageDisplay = (daoName: string): string => {
  const daoData = getDaoData(daoName);
  if (!daoData) return '未悟';
  const stage = daoData.当前阶段 ?? 0;
  return daoData.阶段列表?.[stage]?.名称 || `第${stage}阶`;
};

// 获取大道进度百分比
const getDaoProgressPercent = (daoName: string): number => {
  const daoData = getDaoData(daoName);
  if (!daoData) return 0;
  const currentExp = daoData.当前经验 ?? 0;
  const required = getNextStageRequirement(daoName);
  return Math.min(100, Math.round((currentExp / required) * 100));
};

// 获取下一阶段所需经验
const getNextStageRequirement = (daoName: string): number => {
  const daoData = getDaoData(daoName);
  if (!daoData) return 100;
  const currentStage = daoData.当前阶段 ?? 0;
  return daoData.阶段列表?.[currentStage]?.突破经验 ?? (currentStage + 1) * 100;
};

// 获取突破成功率预估
const getDaoBreakthroughChance = (daoName: string): number => {
  const daoData = getDaoData(daoName);
  if (!daoData) return 0;
  const stage = daoData.当前阶段 ?? 0;
  // 阶段越高，突破越难
  const baseChance = Math.max(30, 90 - stage * 10);
  return baseChance;
};

// 选择大道
const selectDao = (daoName: string) => {
  selectedDao.value = selectedDao.value === daoName ? null : daoName;
};

// 判断是否可突破
const canBreakthroughDao = (daoName: string): boolean => {
  const daoData = getDaoData(daoName);
  if (!daoData) return false;
  const currentExp = daoData.当前经验 ?? 0;
  return currentExp >= getNextStageRequirement(daoName);
};

// === 功能操作 ===

// 感悟大道
const cultivateDao = (daoName: string) => {
  actionQueueStore.addAction({
    type: 'comprehend',
    itemName: daoName,
    itemType: '大道',
    description: `感悟《${daoName}》`
  });
  toast.success(`开始感悟《${daoName}》`);
};

// 深度参悟
const meditateDao = (daoName: string) => {
  actionQueueStore.addAction({
    type: 'meditate',
    itemName: daoName,
    itemType: '参悟',
    description: `深度参悟《${daoName}》`
  });
  toast.info(`进入《${daoName}》参悟状态`);
};

// 尝试突破
const attemptDaoBreakthrough = (daoName: string) => {
  actionQueueStore.addAction({
    type: 'dao_breakthrough',
    itemName: daoName,
    itemType: '突破',
    description: `尝试突破《${daoName}》境界`
  });
  toast.warning(`尝试突破《${daoName}》`);
};

// 探索新道
const openDaoExplore = () => {
  actionQueueStore.addAction({
    type: 'explore',
    itemName: '大道',
    itemType: '探索',
    description: '探索未知大道，寻求新的感悟'
  });
  toast.info('开始探索新的大道...');
};

// 冥想感悟
const startMeditation = () => {
  actionQueueStore.addAction({
    type: 'meditate',
    itemName: '天地',
    itemType: '冥想',
    description: '静心冥想，感悟天地法则'
  });
  toast.info('进入冥想状态...');
};

// 从功法领悟
const comprehendFromSkill = () => {
  actionQueueStore.addAction({
    type: 'comprehend',
    itemName: '功法',
    itemType: '领悟',
    description: '从已修炼的功法中领悟大道'
  });
  toast.info('尝试从功法中领悟大道...');
};

// 观天地悟道
const comprehendFromNature = () => {
  actionQueueStore.addAction({
    type: 'comprehend',
    itemName: '天地',
    itemType: '悟道',
    description: '观察天地自然，感悟大道法则'
  });
  toast.info('开始观天地悟道...');
};
</script>

<style scoped>
.dao-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
}

/* 顶部统计区 */
.dao-stats-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  border-radius: 12px 12px 0 0;
}

.stats-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  min-width: 100px;
}

.stats-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
}

.stats-icon.enlightened {
  background: linear-gradient(135deg, rgba(130, 163, 245, 0.2), rgba(192, 202, 245, 0.2));
  color: var(--color-primary);
}

.stats-icon.experience {
  background: linear-gradient(135deg, rgba(255, 213, 0, 0.2), rgba(255, 179, 0, 0.2));
  color: var(--color-warning);
}

.stats-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stats-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.2;
}

.stats-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.stats-actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.action-btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn-icon:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.1);
}

/* 筛选和排序栏 */
.dao-filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: var(--color-surface);
  border-radius: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tag:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.filter-tag.active {
  background: rgba(var(--color-primary-rgb), 0.1);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.tag-count {
  font-size: 0.65rem;
  padding: 1px 5px;
  background: rgba(var(--color-primary-rgb), 0.15);
  border-radius: 8px;
  font-weight: 600;
}

.sort-dropdown {
  flex-shrink: 0;
}

.sort-select {
  padding: 6px 10px;
  font-size: 0.75rem;
  color: var(--color-text);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  outline: none;
  transition: all 0.2s;
}

.sort-select:hover,
.sort-select:focus {
  border-color: var(--color-primary);
}

/* 空状态插图 */
.empty-illustration {
  position: relative;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon-wrapper {
  position: relative;
  z-index: 2;
  color: var(--color-primary);
  opacity: 0.6;
}

.empty-rings {
  position: absolute;
  inset: 0;
}

.ring {
  position: absolute;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  opacity: 0.4;
}

.ring-1 {
  inset: 20%;
}

.ring-2 {
  inset: 10%;
}

.ring-3 {
  inset: 0;
}

.empty-title {
  margin: 0;
  font-size: 1rem;
  color: var(--color-text);
}

.empty-desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  text-align: center;
  max-width: 350px;
}

/* 大道卡片 */
.dao-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.dao-card:hover {
  border-color: var(--color-primary);
}

.dao-card.active {
  border-color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.05);
}

.dao-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dao-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, rgba(130, 163, 245, 0.15), rgba(192, 202, 245, 0.15));
  border-radius: 8px;
  color: var(--color-primary);
}

.dao-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.dao-card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dao-progress-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dao-progress-bar {
  flex: 1;
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.dao-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-info));
  border-radius: 3px;
  transition: width 0.3s ease;
}

.dao-progress-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  animation: glow-sweep 2s infinite;
}

@keyframes glow-sweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.dao-progress-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  min-width: 36px;
  text-align: right;
}

.dao-exp-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
}

.exp-current {
  color: var(--color-primary);
  font-weight: 600;
}

.exp-divider {
  color: var(--color-text-muted);
}

.exp-required {
  color: var(--color-text-secondary);
}

.dao-card-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.dao-card:hover .dao-card-actions {
  opacity: 1;
}

.dao-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.dao-action-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.dao-action-btn.cultivate:hover {
  border-color: var(--color-warning);
  color: var(--color-warning);
}

.dao-action-btn.breakthrough {
  border-color: #f59e0b;
  color: #f59e0b;
}

.dao-action-btn.breakthrough:hover {
  background: #f59e0b;
  color: white;
}

/* 阶段徽章 */
.dao-stage-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 500;
}

.dao-stage-badge.stage-low {
  background: rgba(var(--color-info-rgb), 0.15);
  color: var(--color-info);
}

.dao-stage-badge.stage-mid {
  background: rgba(var(--color-success-rgb), 0.15);
  color: var(--color-success);
}

.dao-stage-badge.stage-high {
  background: rgba(var(--color-warning-rgb), 0.15);
  color: var(--color-warning);
}

.dao-stage-badge.stage-max {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 140, 0, 0.2));
  color: #ffa500;
}

/* 详情面板 */
.dao-detail-panel {
  margin-top: 12px;
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.detail-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, rgba(130, 163, 245, 0.2), rgba(192, 202, 245, 0.2));
  border-radius: 10px;
  color: var(--color-primary);
}

.detail-title {
  margin: 0;
  font-size: 1.1rem;
  color: var(--color-text);
}

.detail-stage {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.detail-body {
  margin-top: 16px;
}

.detail-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.detail-stat-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--color-background);
  border-radius: 8px;
}

.stat-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(var(--color-primary-rgb), 0.1);
  border-radius: 6px;
  color: var(--color-primary);
}

.stat-card-icon.progress-icon {
  background: rgba(var(--color-success-rgb), 0.1);
  color: var(--color-success);
}

.stat-card-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-card-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
}

.stat-card-label {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

/* 阶段进度区 */
.stage-progress-section {
  margin-bottom: 16px;
}

.section-title {
  margin: 0 0 10px 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.stage-timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stage-node {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  background: var(--color-background);
  border-radius: 8px;
  border-left: 3px solid var(--color-border);
}

.stage-node.done {
  border-left-color: var(--color-success);
}

.stage-node.current {
  border-left-color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.05);
}

.stage-node.locked {
  opacity: 0.5;
}

.node-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  flex-shrink: 0;
}

.stage-node.done .node-marker {
  background: var(--color-success);
  border-color: var(--color-success);
  color: white;
}

.stage-node.current .node-marker {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.node-number {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.node-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.node-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text);
}

.node-desc {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

/* 突破指引 */
.breakthrough-guide {
  margin-bottom: 16px;
  padding: 14px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.05));
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 10px;
  border-left: 4px solid #f59e0b;
}

.guide-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #f59e0b;
}

.guide-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.guide-desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.guide-tips {
  margin: 0;
  padding-left: 20px;
  list-style: disc;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.guide-tips li {
  margin-bottom: 4px;
}

.breakthrough-chance {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 8px;
  margin-top: 6px;
}

.chance-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.chance-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f59e0b;
}

.detail-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 工具栏 */
.dao-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.toolbar-left {
  display: flex;
  gap: 16px;
  font-size: 0.9rem;
}

.dao-count {
  color: var(--color-primary);
  font-weight: 600;
}

.dao-exp {
  color: var(--color-text-secondary);
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* 主内容 */
.dao-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 12px;
}

/* 空状态 */
.dao-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  color: var(--color-text-secondary);
}

.quick-actions {
  display: flex;
  gap: 12px;
}

/* 大道列表 */
.dao-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dao-name {
  font-weight: 600;
  color: var(--color-text);
}

/* 通用按钮 */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.action-btn.primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.action-btn.primary:hover {
  opacity: 0.9;
}

.action-btn.secondary {
  background: #ffb534d0;
  border-color: var(--color-border);
}

.action-btn.warning {
  background: #f59e0b;
  border-color: #f59e0b;
  color: white;
}

.action-btn.warning:hover {
  opacity: 0.9;
}

.action-btn.large {
  padding: 12px 20px;
}

.close-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.close-btn:hover {
  color: var(--color-text);
  border-color: var(--color-primary);
  background: var(--color-surface-hover);
}

/* 响应式 */
@media (max-width: 640px) {
  .dao-stats-header {
    flex-wrap: wrap;
  }

  .stats-card {
    min-width: auto;
    flex: 1;
  }

  .quick-actions {
    flex-direction: column;
  }

  .detail-stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
