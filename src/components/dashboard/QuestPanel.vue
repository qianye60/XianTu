<template>
  <div class="quest-panel game-panel" :class="{ 'mobile-layout': isMobile }">

    <!-- 任务分类选项卡 -->
    <div class="quest-tabs" :class="{ 'mobile-tabs': isMobile }">
      <button 
        v-for="tab in questTabs"
        :key="tab.key"
        class="quest-tab"
        :class="{ active: activeTab === tab.key, 'mobile-tab': isMobile }"
        @click="activeTab = tab.key"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-name" v-if="!isMobile || activeTab === tab.key">{{ tab.name }}</span>
        <span class="tab-count" v-if="tab.count > 0">{{ tab.count }}</span>
      </button>
    </div>

    <!-- 任务列表容器 -->
    <div class="panel-content" :class="{ 'mobile-content': isMobile }">
      <div v-if="isLoading" class="quest-loading">
        <div class="loading-spinner"></div>
        <p>正在加载任务...</p>
      </div>

      <div v-else-if="currentQuests.length === 0" class="empty-quests">
        <div class="empty-icon">📝</div>
        <p class="empty-title">{{ getEmptyMessage() }}</p>
        <p class="empty-desc">{{ getEmptyDescription() }}</p>
        <button class="discover-btn" @click="discoverQuests">
          探索新任务
        </button>
      </div>

      <div v-else class="quest-list" :class="{ 'mobile-list': isMobile }">
        <div 
          v-for="quest in currentQuests"
          :key="quest.id"
          class="quest-card"
          :class="[quest.type, quest.priority, { 'mobile-card': isMobile }]"
          @click="viewQuestDetail(quest)"
        >
          <div class="quest-header" :class="{ 'mobile-header': isMobile }">
            <div class="quest-info">
              <h4 class="quest-title" :class="{ 'mobile-title': isMobile }">{{ quest.title }}</h4>
              <span class="quest-type-tag" :class="{ 'mobile-tag': isMobile }">{{ getQuestTypeLabel(quest.type) }}</span>
            </div>
            <div class="quest-status" :class="{ 'mobile-status': isMobile }">
              <span class="quest-progress" v-if="!isMobile || quest.progress !== quest.maxProgress">{{ quest.progress }}/{{ quest.maxProgress }}</span>
              <div class="progress-bar" :class="{ 'mobile-progress': isMobile }">
                <div class="progress-fill" :style="{ width: getQuestProgress(quest) + '%' }"></div>
              </div>
            </div>
          </div>
          
          <p class="quest-description" :class="{ 'mobile-description': isMobile }" v-if="!isMobile">{{ quest.description }}</p>
          
          <div class="quest-footer" :class="{ 'mobile-footer': isMobile }">
            <div class="quest-rewards" :class="{ 'mobile-rewards': isMobile }">
              <span class="reward-label" v-if="!isMobile">奖励:</span>
              <span class="reward-text">{{ quest.rewards.join(', ') }}</span>
            </div>
            <div class="quest-time" :class="{ 'mobile-time': isMobile }">
              <span v-if="quest.timeLimit">⏰ {{ formatTimeLimit(quest.timeLimit) }}</span>
              <span v-else class="no-limit" v-if="!isMobile">无时限</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 移动端任务详情模态窗口 -->
    <div v-if="showQuestModal && isMobile" class="quest-modal-overlay" @click="closeQuestModal">
      <div class="quest-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">{{ selectedQuest?.title }}</h3>
          <button class="modal-close-btn" @click="closeQuestModal">
            <X :size="20" />
          </button>
        </div>
        
        <div class="modal-content">
          <div class="quest-type-section">
            <span class="quest-type-tag">{{ getQuestTypeLabel(selectedQuest?.type) }}</span>
            <span class="quest-priority-tag" :class="selectedQuest?.priority">{{ selectedQuest?.priority }}</span>
          </div>
          
          <div class="quest-progress-section">
            <div class="progress-header">
              <span class="progress-label">任务进度</span>
              <span class="progress-text">{{ selectedQuest?.progress }}/{{ selectedQuest?.maxProgress }}</span>
            </div>
            <div class="progress-bar-large">
              <div class="progress-fill" :style="{ width: getQuestProgress(selectedQuest) + '%' }"></div>
            </div>
          </div>
          
          <div class="quest-description-section">
            <h4>任务描述</h4>
            <p class="quest-description-full">{{ selectedQuest?.description }}</p>
          </div>
          
          <div class="quest-details-section">
            <div class="detail-item">
              <span class="detail-label">任务奖励</span>
              <span class="detail-value">{{ selectedQuest?.rewards.join(', ') }}</span>
            </div>
            <div class="detail-item" v-if="selectedQuest?.timeLimit">
              <span class="detail-label">时间限制</span>
              <span class="detail-value">{{ formatTimeLimit(selectedQuest.timeLimit) }}</span>
            </div>
          </div>
          
          <div class="modal-actions">
            <button v-if="selectedQuest?.status === 'completed'" class="quest-action-btn completed" disabled>
              ✅ 已完成
            </button>
            <button v-else-if="selectedQuest?.status === 'failed'" class="quest-action-btn failed" disabled>
              ❌ 已失败
            </button>
            <button v-else class="quest-action-btn primary" @click="completeQuest(selectedQuest?.id)">
              完成任务
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { X } from 'lucide-vue-next';
import { panelBus } from '@/utils/panelBus';

// 任务数据类型（占位）
interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'main' | 'side' | 'daily' | 'event';
  priority: 'low' | 'medium' | 'high';
  progress: number;
  maxProgress: number;
  rewards: string[];
  timeLimit?: number; // 剩余时间（分钟）
  status: 'available' | 'active' | 'completed' | 'failed';
}

// 当前状态
const activeTab = ref('active');
const isLoading = ref(false);

// 移动端相关状态
const isMobile = computed(() => {
  return window.innerWidth <= 768;
});

const showQuestModal = ref(false);
const selectedQuest = ref<Quest | null>(null);

// 占位数据
const mockQuests: Quest[] = [];

// 任务选项卡配置
const questTabs = computed(() => [
  { key: 'active', name: '进行中', icon: '⏳', count: 0 },
  { key: 'available', name: '可接取', icon: '📄', count: 0 },
  { key: 'completed', name: '已完成', icon: '✅', count: 0 },
  { key: 'daily', name: '每日任务', icon: '🔄', count: 0 }
]);

// 当前显示的任务列表
const currentQuests = computed(() => {
  // 这里将来会根据 activeTab 筛选任务
  return mockQuests.filter(quest => {
    switch (activeTab.value) {
      case 'active':
        return quest.status === 'active';
      case 'available':
        return quest.status === 'available';
      case 'completed':
        return quest.status === 'completed';
      case 'daily':
        return quest.type === 'daily';
      default:
        return false;
    }
  });
});

// 任务概要
const questSummary = computed(() => {
  return '任务系统暂未启用';
});

// 工具函数（占位）
const getEmptyMessage = () => {
  const messages = {
    active: '暂无进行中的任务',
    available: '暂无可接取的任务',
    completed: '还未完成任何任务',
    daily: '今日任务已全部完成'
  };
  return messages[activeTab.value as keyof typeof messages] || '暂无任务';
};

const getEmptyDescription = () => {
  const descriptions = {
    active: '完成当前任务或探索新的机缘',
    available: '多与NPC交流，探索世界获取新任务',
    completed: '完成任务将在此处显示历史记录',
    daily: '明日子时将刷新新的每日任务'
  };
  return descriptions[activeTab.value as keyof typeof descriptions] || '';
};

const getQuestTypeLabel = (type: string) => {
  const labels = {
    main: '主线',
    side: '支线', 
    daily: '每日',
    event: '事件'
  };
  return labels[type as keyof typeof labels] || type;
};

const getQuestProgress = (quest: Quest) => {
  return quest.maxProgress > 0 ? Math.round((quest.progress / quest.maxProgress) * 100) : 0;
};

const formatTimeLimit = (minutes: number) => {
  if (minutes >= 1440) {
    const days = Math.floor(minutes / 1440);
    return `${days}天`;
  } else if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}时${mins}分` : `${hours}时`;
  } else {
    return `${minutes}分钟`;
  }
};

// 占位函数
const refreshQuests = () => {
  console.log('[任务系统] 刷新任务 - 功能待实现');
};

const discoverQuests = () => {
  console.log('[任务系统] 探索任务 - 功能待实现');
};

const viewQuestDetail = (quest: Quest) => {
  if (isMobile.value) {
    selectedQuest.value = quest;
    showQuestModal.value = true;
  } else {
    console.log('[任务系统] 查看任务详情 - 功能待实现', quest);
  }
};

// 移动端模态窗口相关函数
const closeQuestModal = () => {
  showQuestModal.value = false;
  selectedQuest.value = null;
};

const completeQuest = (questId?: string) => {
  if (questId) {
    console.log('[任务系统] 完成任务:', questId);
    closeQuestModal();
  }
};

onMounted(() => {
  console.log('[任务系统] 面板已挂载，等待功能实现');
});

// 统一顶栏动作
panelBus.on('refresh', () => refreshQuests());
</script>

<style scoped>
.panel-toolbar { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-bottom: 1px solid var(--color-border); background: var(--color-surface); }
.tool-btn { width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--color-border); background: var(--color-surface); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: var(--transition-fast); }
.tool-btn:hover { background: var(--color-surface-hover); }
.quest-panel {
  background: linear-gradient(135deg, 
    rgba(139, 69, 19, 0.1), 
    rgba(160, 82, 45, 0.05),
    rgba(205, 133, 63, 0.02)
  );
  background-size: 200% 200%;
  animation: questBgMove 8s ease-in-out infinite;
  position: relative;
  overflow: hidden;
}

.quest-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 20% 30%, rgba(255, 215, 0, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(139, 69, 19, 0.05) 0%, transparent 50%);
  pointer-events: none;
}

@keyframes questBgMove {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.panel-header {
  background: linear-gradient(135deg, 
    rgba(139, 69, 19, 0.2),
    rgba(160, 82, 45, 0.15),
    rgba(205, 133, 63, 0.1)
  );
  border: 2px solid rgba(139, 69, 19, 0.3);
  box-shadow: 
    0 4px 12px rgba(139, 69, 19, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.panel-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(255, 215, 0, 0.1),
    transparent
  );
  animation: headerShine 3s ease-in-out infinite;
}

@keyframes headerShine {
  0% { left: -100%; }
  100% { left: 100%; }
}

.header-icon {
  background: linear-gradient(135deg, 
    rgba(255, 215, 0, 0.2), 
    rgba(255, 193, 7, 0.3)
  );
  border-radius: 50%;
  padding: 8px;
  border: 2px solid rgba(255, 215, 0, 0.4);
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.3);
}

.panel-title {
  color: #8b4513;
  text-shadow: 0 2px 4px rgba(139, 69, 19, 0.3);
  font-weight: 700;
}

.quest-summary {
  color: #a0522d;
}

.action-btn {
  background: linear-gradient(135deg, 
    rgba(139, 69, 19, 0.15), 
    rgba(160, 82, 45, 0.2)
  );
  border: 1px solid rgba(139, 69, 19, 0.4);
  color: #8b4513;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.action-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(255, 215, 0, 0.2),
    transparent
  );
  transition: left 0.3s ease;
}

.action-btn:hover::before {
  left: 100%;
}

.action-btn:hover {
  background: linear-gradient(135deg, 
    rgba(139, 69, 19, 0.25), 
    rgba(160, 82, 45, 0.3)
  );
  border-color: rgba(139, 69, 19, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  gap: 12px;
}

.header-icon {
  font-size: 1.5rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.panel-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-primary);
}

.quest-summary {
  font-size: 0.875rem;
  color: var(--color-accent);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 6px;
  color: #7c3aed;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.3);
}

.quest-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.quest-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
  color: #6b7280;
}

.quest-tab:hover {
  background: rgba(139, 92, 246, 0.05);
  color: #374151;
}

.quest-tab.active {
  background: rgba(139, 92, 246, 0.1);
  color: #7c3aed;
  font-weight: 600;
  border-bottom: 2px solid #7c3aed;
}

.tab-count {
  background: rgba(139, 92, 246, 0.2);
  color: #7c3aed;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.quest-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 加载状态 */
.quest-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #6b7280;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #7c3aed;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

/* 空状态 */
.empty-quests {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  text-align: center;
  color: #6b7280;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: #374151;
}

.empty-desc {
  font-size: 0.9rem;
  margin-bottom: 20px;
  line-height: 1.4;
}

.discover-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.discover-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}

/* 任务列表 */
.quest-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quest-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.quest-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.quest-card.main {
  border-left: 4px solid #f59e0b;
}

.quest-card.side {
  border-left: 4px solid #10b981;
}

.quest-card.daily {
  border-left: 4px solid #3b82f6;
}

.quest-card.event {
  border-left: 4px solid #ef4444;
}

.quest-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.quest-info {
  flex: 1;
}

.quest-title {
  margin: 0 0 4px 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #374151;
  line-height: 1.3;
}

.quest-type-tag {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  background: #f3f4f6;
  color: #6b7280;
}

.quest-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  min-width: 80px;
}

.quest-progress {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}

.progress-bar {
  width: 60px;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #7c3aed, #a855f7);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.quest-description {
  margin: 0 0 12px 0;
  font-size: 0.85rem;
  color: #6b7280;
  line-height: 1.4;
}

.quest-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.quest-rewards {
  flex: 1;
}

.reward-label {
  font-size: 0.75rem;
  color: #9ca3af;
  font-weight: 500;
}

.reward-text {
  font-size: 0.75rem;
  color: #f59e0b;
  font-weight: 500;
  margin-left: 4px;
}

.quest-time {
  font-size: 0.7rem;
  color: #ef4444;
  font-weight: 500;
}

.no-limit {
  color: #10b981;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 深色主题适配 */
[data-theme="dark"] .quest-panel {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}

[data-theme="dark"] .panel-header {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.1));
  border-bottom-color: rgba(139, 92, 246, 0.2);
}

[data-theme="dark"] .panel-title {
  color: #e2e8f0;
}

[data-theme="dark"] .quest-summary {
  color: #94a3b8;
}

[data-theme="dark"] .quest-tabs {
  background: rgba(0, 0, 0, 0.2);
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .quest-tab {
  color: #94a3b8;
}

[data-theme="dark"] .quest-tab:hover {
  background: rgba(139, 92, 246, 0.1);
  color: #e2e8f0;
}

[data-theme="dark"] .quest-tab.active {
  background: rgba(139, 92, 246, 0.2);
  color: #a855f7;
}

[data-theme="dark"] .quest-card {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .quest-title {
  color: #e2e8f0;
}

[data-theme="dark"] .quest-description {
  color: #94a3b8;
}

[data-theme="dark"] .empty-title {
  color: #e2e8f0;
}

[data-theme="dark"] .empty-quests {
  color: #94a3b8;
}

/* 移动端适配样式 */
@media (max-width: 768px) {
  .quest-panel.mobile-layout {
    padding: 0;
  }

  .quest-tabs.mobile-tabs {
    display: flex;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding: 8px;
    gap: 8px;
  }

  .quest-tabs.mobile-tabs::-webkit-scrollbar {
    display: none;
  }

  .quest-tab.mobile-tab {
    min-width: 60px;
    padding: 8px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    white-space: nowrap;
  }

  .quest-tab.mobile-tab .tab-name {
    display: none;
  }

  .quest-tab.mobile-tab.active .tab-name {
    display: inline;
    margin-left: 4px;
  }

  .panel-content.mobile-content {
    padding: 8px;
  }

  .quest-list.mobile-list {
    gap: 8px;
  }

  .quest-card.mobile-card {
    padding: 12px;
    border-radius: 8px;
  }

  .quest-header.mobile-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .quest-title.mobile-title {
    font-size: 0.9rem;
    margin: 0;
  }

  .quest-type-tag.mobile-tag {
    font-size: 0.7rem;
    padding: 2px 6px;
  }

  .quest-status.mobile-status {
    width: 100%;
  }

  .progress-bar.mobile-progress {
    height: 6px;
    margin-top: 4px;
  }

  .quest-footer.mobile-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .quest-rewards.mobile-rewards {
    font-size: 0.8rem;
  }

  .quest-time.mobile-time {
    font-size: 0.75rem;
    align-self: flex-end;
  }
}

/* 移动端模态窗口样式 */
.quest-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.quest-modal {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
}

.modal-close-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #6b7280;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-content {
  padding: 20px;
}

.quest-type-section {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.quest-priority-tag {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.quest-priority-tag.high {
  background: #fef2f2;
  color: #dc2626;
}

.quest-priority-tag.normal {
  background: #f0f9ff;
  color: #0284c7;
}

.quest-priority-tag.low {
  background: #f7fee7;
  color: #65a30d;
}

.quest-progress-section {
  margin-bottom: 20px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-label {
  font-weight: 500;
  color: #374151;
}

.progress-text {
  font-size: 0.9rem;
  color: #6b7280;
}

.progress-bar-large {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.quest-description-section {
  margin-bottom: 20px;
}

.quest-description-section h4 {
  margin: 0 0 8px 0;
  font-size: 1rem;
  font-weight: 500;
  color: #374151;
}

.quest-description-full {
  margin: 0;
  line-height: 1.5;
  color: #6b7280;
}

.quest-details-section {
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 500;
  color: #374151;
}

.detail-value {
  color: #6b7280;
  text-align: right;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.quest-action-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.quest-action-btn.primary {
  background: #3b82f6;
  color: white;
}

.quest-action-btn.primary:hover {
  background: #2563eb;
}

.quest-action-btn.completed {
  background: #10b981;
  color: white;
  cursor: not-allowed;
}

.quest-action-btn.failed {
  background: #ef4444;
  color: white;
  cursor: not-allowed;
}

/* 暗色主题适配 */
[data-theme="dark"] .quest-modal {
  background: #1e293b;
}

[data-theme="dark"] .modal-header {
  border-bottom-color: #334155;
}

[data-theme="dark"] .modal-title {
  color: #e2e8f0;
}

[data-theme="dark"] .modal-close-btn {
  color: #94a3b8;
}

[data-theme="dark"] .modal-close-btn:hover {
  background: #334155;
  color: #e2e8f0;
}

[data-theme="dark"] .progress-label,
[data-theme="dark"] .quest-description-section h4,
[data-theme="dark"] .detail-label {
  color: #e2e8f0;
}

[data-theme="dark"] .progress-text,
[data-theme="dark"] .quest-description-full,
[data-theme="dark"] .detail-value {
  color: #94a3b8;
}

[data-theme="dark"] .progress-bar-large {
  background: #374151;
}

[data-theme="dark"] .detail-item {
  border-bottom-color: #374151;
}
</style>
