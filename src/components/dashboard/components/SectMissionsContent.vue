<template>
  <div class="sect-missions">
    <!-- 玩家信息栏 -->
    <div class="player-info-bar">
      <div class="info-item">
        <span class="info-label">职位</span>
        <span class="info-value position">{{ playerPosition }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">贡献点</span>
        <span class="info-value contribution">{{ playerContribution }}</span>
      </div>
    </div>

    <!-- 任务分类标签 -->
    <div class="mission-tabs">
      <button
        v-for="tab in missionTabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <component :is="tab.icon" :size="14" />
        <span>{{ tab.label }}</span>
        <span v-if="getMissionCount(tab.key) > 0" class="count-badge">{{ getMissionCount(tab.key) }}</span>
      </button>
    </div>

    <!-- 任务列表 -->
    <div class="mission-list">
      <div v-if="filteredMissions.length === 0" class="empty-state">
        <Scroll :size="48" class="empty-icon" />
        <p class="empty-text">暂无{{ currentTabLabel }}任务</p>
        <p class="empty-hint">宗门任务由AI根据剧情生成，请在对话中询问宗门任务</p>
        <button class="ask-btn" @click="sendPrompt('我想领取宗门任务')">
          <MessageCircle :size="14" />
          <span>询问AI领取任务</span>
        </button>
      </div>

      <div v-else class="missions">
        <div
          v-for="mission in filteredMissions"
          :key="mission.id"
          class="mission-card"
          :class="[`difficulty-${mission.difficulty}`, { completed: mission.status === '已完成' }]"
        >
          <div class="mission-header">
            <div class="mission-title">
              <span class="mission-name">{{ mission.name }}</span>
              <span class="mission-type" :class="`type-${mission.type}`">{{ mission.type }}</span>
            </div>
            <span class="mission-difficulty" :class="`diff-${mission.difficulty}`">
              {{ getDifficultyLabel(mission.difficulty) }}
            </span>
          </div>

          <p class="mission-desc">{{ mission.description }}</p>

          <!-- 任务目标 -->
          <div class="mission-objectives">
            <div
              v-for="(obj, idx) in mission.objectives"
              :key="idx"
              class="objective-item"
              :class="{ done: obj.current >= obj.target }"
            >
              <CheckCircle v-if="obj.current >= obj.target" :size="14" class="obj-icon done" />
              <Circle v-else :size="14" class="obj-icon" />
              <span class="obj-text">{{ obj.text }}</span>
              <span class="obj-progress">{{ obj.current }}/{{ obj.target }}</span>
            </div>
          </div>

          <!-- 任务奖励 -->
          <div class="mission-rewards">
            <span class="rewards-label">奖励：</span>
            <div class="reward-tags">
              <span v-if="mission.rewards.contribution" class="reward-tag contribution">
                <Coins :size="12" /> {{ mission.rewards.contribution }} 贡献
              </span>
              <span v-if="mission.rewards.experience" class="reward-tag experience">
                <Zap :size="12" /> {{ mission.rewards.experience }} 修为
              </span>
              <span v-if="mission.rewards.reputation" class="reward-tag reputation">
                <Star :size="12" /> {{ mission.rewards.reputation }} 声望
              </span>
              <span v-for="item in mission.rewards.items || []" :key="item" class="reward-tag item">
                <Package :size="12" /> {{ item }}
              </span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="mission-actions">
            <button
              v-if="mission.status === '进行中'"
              class="action-btn complete"
              @click="sendPrompt(`我要提交宗门任务「${mission.name}」`)"
            >
              <CheckCircle :size="14" />
              <span>提交任务</span>
            </button>
            <button
              v-else-if="mission.status === '可接取'"
              class="action-btn accept"
              @click="sendPrompt(`我想接取宗门任务「${mission.name}」`)"
            >
              <Plus :size="14" />
              <span>接取任务</span>
            </button>
            <span v-else class="status-badge completed">
              <CheckCircle :size="14" />
              已完成
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 提示信息 -->
    <div class="missions-tips">
      <Info :size="14" />
      <span>宗门任务由AI动态生成，点击按钮将直接发送到对话</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import {
  Scroll, MessageCircle, CheckCircle, Circle, Coins, Zap, Star, Package,
  Plus, Info, Swords, Calendar, Crown
} from 'lucide-vue-next';
import { toast } from '@/utils/toast';
import { sendChat } from '@/utils/chatBus';

const gameStateStore = useGameStateStore();
const activeTab = ref<string>('all');

// 任务分类标签
const missionTabs = [
  { key: 'all', label: '全部', icon: Scroll },
  { key: '日常', label: '日常', icon: Calendar },
  { key: '宗门', label: '宗门', icon: Crown },
  { key: '战斗', label: '战斗', icon: Swords }
];

// 玩家宗门信息
const playerSectInfo = computed(() => gameStateStore.sectMemberInfo);
const playerPosition = computed(() => playerSectInfo.value?.职位 || '散修');
const playerContribution = computed(() => playerSectInfo.value?.贡献 || 0);

// 当前标签名称
const currentTabLabel = computed(() => {
  const tab = missionTabs.find(t => t.key === activeTab.value);
  return tab?.label || '';
});

// 从任务系统获取宗门任务
const sectMissions = computed(() => {
  const questSystem = gameStateStore.questSystem;
  if (!questSystem) return [];

  const allQuests = [
    ...(questSystem.当前任务列表 ? Object.values(questSystem.当前任务列表) : [])
  ];

  // 筛选宗门相关任务
  return allQuests
    .filter((quest: any) => quest.任务类型 === '宗门' || quest.来源 === '宗门')
    .map((quest: any) => ({
      id: quest.任务ID,
      name: quest.任务名称,
      description: quest.任务描述,
      type: quest.任务类型 || '宗门',
      difficulty: mapDifficulty(quest.难度),
      status: quest.任务状态,
      objectives: (quest.目标列表 || []).map((obj: any) => ({
        text: obj.目标描述,
        current: obj.当前进度 || 0,
        target: obj.目标进度 || 1
      })),
      rewards: {
        contribution: quest.奖励?.贡献 || quest.奖励?.声望 || 0,
        experience: quest.奖励?.修为 || 0,
        reputation: quest.奖励?.宗门声望 || 0,
        items: quest.奖励?.物品 || []
      }
    }));
});

// 过滤后的任务
const filteredMissions = computed(() => {
  if (activeTab.value === 'all') return sectMissions.value;
  return sectMissions.value.filter(m => m.type === activeTab.value);
});

// 获取各分类任务数量
function getMissionCount(tabKey: string): number {
  if (tabKey === 'all') return sectMissions.value.length;
  return sectMissions.value.filter(m => m.type === tabKey).length;
}

// 难度映射
function mapDifficulty(difficulty: string | undefined): string {
  const map: Record<string, string> = {
    '简单': 'easy',
    '普通': 'normal',
    '困难': 'hard',
    '极难': 'extreme'
  };
  return map[difficulty || '普通'] || 'normal';
}

// 难度标签
function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    'easy': '简单',
    'normal': '普通',
    'hard': '困难',
    'extreme': '极难'
  };
  return labels[difficulty] || '普通';
}

function sendPrompt(text: string) {
  sendChat(text);
  toast.success('已发送到对话');
}
</script>

<style scoped>
.sect-missions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 60vh;
  overflow-y: auto;
}

.player-info-bar {
  display: flex;
  gap: 1.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(168, 85, 247, 0.05));
  border-radius: 8px;
  border: 1px solid rgba(147, 51, 234, 0.2);
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.info-value {
  font-weight: 600;
  font-size: 0.9rem;
}

.info-value.position { color: #9333ea; }
.info-value.contribution { color: #f59e0b; }

.mission-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  border-color: rgba(147, 51, 234, 0.3);
  color: var(--color-text);
}

.tab-btn.active {
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(168, 85, 247, 0.05));
  border-color: rgba(147, 51, 234, 0.4);
  color: #9333ea;
}

.count-badge {
  background: #9333ea;
  color: white;
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 10px;
  font-weight: 600;
}

.mission-list {
  flex: 1;
  overflow-y: auto;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.empty-icon {
  opacity: 0.5;
  margin-bottom: 0.5rem;
}

.empty-text {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.empty-hint {
  font-size: 0.8rem;
  opacity: 0.7;
  margin-bottom: 1rem;
}

.ask-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  background: linear-gradient(135deg, #9333ea, #7c3aed);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ask-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);
}

.missions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mission-card {
  padding: 1rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.mission-card:hover {
  border-color: rgba(147, 51, 234, 0.3);
}

.mission-card.completed {
  opacity: 0.7;
}

.mission-card.difficulty-easy { border-left: 3px solid #22c55e; }
.mission-card.difficulty-normal { border-left: 3px solid #3b82f6; }
.mission-card.difficulty-hard { border-left: 3px solid #f59e0b; }
.mission-card.difficulty-extreme { border-left: 3px solid #ef4444; }

.mission-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.mission-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.mission-name {
  font-weight: 600;
  color: var(--color-text);
}

.mission-type {
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 500;
}

.mission-type.type-日常 { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.mission-type.type-宗门 { background: rgba(147, 51, 234, 0.1); color: #9333ea; }
.mission-type.type-战斗 { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

.mission-difficulty {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.diff-easy { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
.diff-normal { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.diff-hard { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.diff-extreme { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

.mission-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
}

.mission-objectives {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
}

.objective-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.objective-item.done {
  color: #22c55e;
}

.obj-icon {
  flex-shrink: 0;
}

.obj-icon.done {
  color: #22c55e;
}

.obj-text {
  flex: 1;
}

.obj-progress {
  font-weight: 500;
  font-size: 0.75rem;
}

.mission-rewards {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.rewards-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.reward-tags {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.reward-tag {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 500;
}

.reward-tag.contribution { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.reward-tag.experience { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.reward-tag.reputation { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.reward-tag.item { background: rgba(34, 197, 94, 0.1); color: #22c55e; }

.mission-actions {
  display: flex;
  justify-content: flex-end;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border: none;
  border-radius: 5px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.accept {
  background: linear-gradient(135deg, #9333ea, #7c3aed);
  color: white;
}

.action-btn.complete {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: #22c55e;
  font-weight: 500;
}

.missions-tips {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 6px;
  font-size: 0.75rem;
  color: #3b82f6;
}
</style>
