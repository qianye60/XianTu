<template>
  <div class="quest-panel">
    <!-- 系统任务开关和配置 -->
    <div class="quest-header">
      <div class="header-title">
        <span class="header-icon">🎯</span>
        <span class="header-text">系统任务</span>
        <span v-if="systemTaskData" class="count-badge">
          {{ activeTasksCount }}/{{ maxTasksLimit }}
        </span>
      </div>
      <div class="header-actions">
        <button
          class="config-btn"
          @click="showConfig = !showConfig"
          :title="showConfig ? '隐藏配置' : '显示配置'"
        >
          ⚙️ 配置
        </button>
      </div>
    </div>

    <!-- 配置面板 -->
    <div v-if="showConfig" class="config-panel">
      <div class="config-row">
        <label class="config-label">系统任务：</label>
        <button
          class="toggle-btn"
          :class="{ 'active': isTaskSystemEnabled }"
          @click="toggleTaskSystem"
        >
          {{ isTaskSystemEnabled ? '✓ 已启用' : '✗ 已禁用' }}
        </button>
      </div>
      <div class="config-row">
        <label class="config-label">任务类型：</label>
        <select v-model="taskType" @change="updateConfig" class="config-select">
          <option value="all">综合系统（全部类型）</option>
          <option value="relationship">交友系统</option>
          <option value="companion">道侣系统</option>
          <option value="cultivation">修炼系统</option>
          <option value="exploration">探索系统</option>
          <option value="combat">战斗系统</option>
          <option value="custom">自定义</option>
        </select>
      </div>
      <div class="config-row">
        <label class="config-label">颁发数量：</label>
        <input
          type="number"
          v-model.number="quantity"
          @change="updateConfig"
          class="config-input"
          min="1"
          max="10"
        />
      </div>
      <div v-if="taskType === 'custom'" class="config-row custom-prompt-row">
        <label class="config-label">自定义规则：</label>
        <textarea
          v-model="customPrompt"
          @change="updateConfig"
          class="config-textarea"
          placeholder="输入任务颁发规则，AI会根据此规则生成任务..."
          rows="4"
        ></textarea>
      </div>
    </div>

    <!-- 进行中的任务 -->
    <div v-if="activeTasks.length > 0" class="tasks-container">
      <div
        v-for="task in activeTasks"
        :key="task.任务ID"
        class="task-card"
        :class="getTaskTypeClass(task.任务类型)"
      >
        <div class="task-header">
          <div class="task-title-area">
            <span class="task-icon">{{ getTaskIcon(task.任务类型) }}</span>
            <h4 class="task-title">{{ task.任务名称 }}</h4>
            <span class="task-type-badge">{{ getTaskTypeName(task.任务类型) }}</span>
          </div>
          <button
            class="expand-btn"
            @click="toggleTaskExpand(task.任务ID)"
            :title="isTaskExpanded(task.任务ID) ? '收起' : '展开'"
          >
            {{ isTaskExpanded(task.任务ID) ? '▲' : '▼' }}
          </button>
        </div>

        <div v-if="isTaskExpanded(task.任务ID)" class="task-body">
          <p class="task-description">{{ task.任务描述 }}</p>

          <!-- 任务条件 -->
          <div class="task-conditions">
            <h5 class="subsection-title">任务条件</h5>
            <div
              v-for="(condition, index) in task.条件"
              :key="index"
              class="condition-item"
              :class="{ completed: condition.完成 }"
            >
              <span class="condition-icon">{{ condition.完成 ? '✓' : '○' }}</span>
              <span class="condition-text">{{ condition.描述 }}</span>
              <div v-if="condition.进度" class="condition-progress">
                <div class="progress-bar-mini">
                  <div
                    class="progress-fill"
                    :style="{ width: getProgressPercent(condition.进度) + '%' }"
                  ></div>
                </div>
                <span class="progress-text-mini">
                  {{ condition.进度.当前 }}/{{ condition.进度.目标 }}
                </span>
              </div>
            </div>
          </div>

          <!-- 任务奖励 -->
          <div class="task-rewards">
            <h5 class="subsection-title">任务奖励</h5>
            <div class="rewards-list">
              <div
                v-for="(reward, index) in task.奖励"
                :key="index"
                class="reward-item"
              >
                <span class="reward-icon">{{ getRewardIcon(reward.类型) }}</span>
                <span class="reward-text">{{ reward.描述 }}</span>
              </div>
            </div>
          </div>

          <!-- 任务有效期和惩罚 -->
          <div v-if="task.有效期 || task.失败惩罚" class="task-footer">
            <div v-if="task.有效期" class="time-limit">
              <span class="footer-label">⏰ 有效期：</span>
              <span class="footer-value">{{ formatTimeLimit(task.有效期) }}</span>
            </div>
            <div v-if="task.失败惩罚" class="failure-penalty">
              <span class="footer-label">⚠️ 失败惩罚：</span>
              <span class="footer-value penalty-text">{{ task.失败惩罚 }}</span>
            </div>
          </div>

          <!-- 颁发时间 -->
          <div class="task-meta">
            <span class="meta-label">颁发时间：</span>
            <span class="meta-value">{{ formatGameTime(task.颁发时间) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 无任务提示 -->
    <div v-else class="empty-tasks">
      <div class="empty-icon">📋</div>
      <div class="empty-text">暂无进行中的任务</div>
      <div class="empty-hint">AI会根据你的配置自动颁发任务</div>
    </div>

    <!-- 已完成任务历史 -->
    <div v-if="completedTasks.length > 0" class="completed-section">
      <button
        class="completed-header"
        @click="showCompleted = !showCompleted"
      >
        <span class="header-icon">✓</span>
        <span class="header-text">已完成任务</span>
        <span class="count-badge">{{ completedTasks.length }}</span>
        <span class="expand-icon">{{ showCompleted ? '▲' : '▼' }}</span>
      </button>
      <div v-if="showCompleted" class="completed-list">
        <div
          v-for="(taskName, index) in completedTasks.slice(0, 20)"
          :key="index"
          class="completed-item"
        >
          <span class="completed-icon">🏆</span>
          <span class="completed-name">{{ taskName }}</span>
        </div>
        <div v-if="completedTasks.length > 20" class="more-hint">
          还有 {{ completedTasks.length - 20 }} 个已完成任务...
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCharacterStore } from '@/stores/characterStore';
import { toast } from '@/utils/toast';
import type { SystemTaskData, SystemTaskType, GameTime } from '@/types/game';

const characterStore = useCharacterStore();

// 状态
const showConfig = ref(false);
const showCompleted = ref(false);
const expandedTasks = ref<Set<string>>(new Set());

// 任务数量限制：硬性上限5个
const maxTasksLimit = 5;

// 计算属性
const systemTaskData = computed((): SystemTaskData | undefined => {
  return characterStore.activeSaveSlot?.存档数据?.系统任务;
});

const isTaskSystemEnabled = computed(() => {
  return systemTaskData.value?.配置?.启用 || false;
});

const taskType = computed({
  get: () => systemTaskData.value?.配置?.任务类型 || 'all',
  set: (value) => {
    if (systemTaskData.value?.配置) {
      systemTaskData.value.配置.任务类型 = value;
    }
  }
});
const quantity = computed({
  get: () => systemTaskData.value?.配置?.颁发数量 || 3,
  set: (value) => {
    if (systemTaskData.value?.配置) {
      systemTaskData.value.配置.颁发数量 = value;
    }
  }
});
const customPrompt = computed({
  get: () => systemTaskData.value?.配置?.自定义提示词 || '',
  set: (value) => {
    if (systemTaskData.value?.配置) {
      systemTaskData.value.配置.自定义提示词 = value;
    }
  }
});

const activeTasks = computed(() => {
  return systemTaskData.value?.进行中任务 || [];
});

const activeTasksCount = computed(() => activeTasks.value.length);

const completedTasks = computed(() => {
  return systemTaskData.value?.已完成任务名称 || [];
});

// 方法

function updateConfig() {
  const saveData = characterStore.activeSaveSlot?.存档数据;

  if (!saveData?.系统任务?.配置) {
    toast.error('系统任务配置不存在');
    return;
  }

  const config = saveData.系统任务.配置;
  const changedPaths: string[] = [];

  // 更新任务类型
  if (config.任务类型 !== taskType.value) {
    config.任务类型 = taskType.value;
    changedPaths.push('系统任务.配置.任务类型');
  }

  // 更新颁发数量
  if (config.颁发数量 !== quantity.value) {
    config.颁发数量 = quantity.value;
    changedPaths.push('系统任务.配置.颁发数量');
  }

  // 更新自定义提示词（如果是自定义类型）
  if (taskType.value === 'custom' && config.自定义提示词 !== customPrompt.value) {
    config.自定义提示词 = customPrompt.value;
    changedPaths.push('系统任务.配置.自定义提示词');
  }

  // 如果有变更，同步到酒馆
  if (changedPaths.length > 0) {
    characterStore.syncToTavernAndSave({ changedPaths });
  }

  toast.success('配置已更新');
}

function toggleTaskSystem() {
  const saveData = characterStore.activeSaveSlot?.存档数据;

  if (!saveData?.系统任务?.配置) {
    toast.error('系统任务配置不存在');
    return;
  }

  // 切换启用状态
  saveData.系统任务.配置.启用 = !saveData.系统任务.配置.启用;

  // 同步到酒馆
  characterStore.syncToTavernAndSave({
    changedPaths: ['系统任务.配置.启用'],
    fullSync: true // 使用完整同步确保配置正确更新
  });

  if (saveData.系统任务.配置.启用) {
    toast.success('✓ 系统任务已启用，AI将根据配置自动颁发任务');
  } else {
    toast.info('✗ 系统任务已禁用');
  }
}

function toggleTaskExpand(taskId: string) {
  if (expandedTasks.value.has(taskId)) {
    expandedTasks.value.delete(taskId);
  } else {
    expandedTasks.value.add(taskId);
  }
}

function isTaskExpanded(taskId: string): boolean {
  return expandedTasks.value.has(taskId);
}

function getTaskTypeClass(type: SystemTaskType): string {
  return `task-type-${type}`;
}

function getTaskIcon(type: SystemTaskType): string {
  const icons: Record<SystemTaskType, string> = {
    all: '🎯',
    relationship: '👥',
    companion: '💑',
    cultivation: '⚡',
    exploration: '🗺️',
    combat: '⚔️',
    custom: '🎲'
  };
  return icons[type] || '📌';
}

function getTaskTypeName(type: SystemTaskType): string {
  const names: Record<SystemTaskType, string> = {
    all: '综合',
    relationship: '交友',
    companion: '道侣',
    cultivation: '修炼',
    exploration: '探索',
    combat: '战斗',
    custom: '自定义'
  };
  return names[type] || type;
}

function getRewardIcon(type: string): string {
  const icons: Record<string, string> = {
    '灵石': '💎',
    '物品': '📦',
    '经验': '✨',
    '属性': '💪',
    '技能': '📜',
    '好感度': '💗'
  };
  return icons[type] || '🎁';
}

function getProgressPercent(progress: { 当前: number; 目标: number }): number {
  if (progress.目标 === 0) return 100;
  return Math.min(100, (progress.当前 / progress.目标) * 100);
}

function formatTimeLimit(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时`;
  if (minutes < 43200) return `${Math.floor(minutes / 1440)}天`;
  return `${Math.floor(minutes / 43200)}月`;
}

function formatGameTime(time: GameTime): string {
  return `仙历${time.年}年${time.月}月${time.日}日`;
}
</script>

<style scoped>
.quest-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  overflow-y: auto;
}

/* 头部 */
.quest-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--color-background-soft);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
}

.header-icon {
  font-size: 1.25rem;
}

.count-badge {
  background: var(--color-primary);
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.toggle-btn,
.config-btn {
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
}

.toggle-btn.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.toggle-btn:hover,
.config-btn:hover {
  background: var(--color-background-mute);
}

/* 配置面板 */
.config-panel {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.config-row {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.custom-prompt-row {
  flex-direction: column;
  align-items: stretch;
}

.config-label {
  min-width: 80px;
  font-weight: 500;
  color: var(--color-text);
  line-height: 2;
}

.config-select,
.config-input,
.config-textarea {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.875rem;
}

.config-textarea {
  resize: vertical;
  font-family: inherit;
}

/* 禁用提示 */
.disabled-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.notice-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.notice-text {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.notice-hint {
  font-size: 0.875rem;
  opacity: 0.8;
}

/* 任务卡片 */
.tasks-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.task-card {
  background: var(--color-background-soft);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
}

.task-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 任务类型样式 */
.task-type-relationship { border-left: 4px solid #3b82f6; }
.task-type-companion { border-left: 4px solid #ec4899; }
.task-type-cultivation { border-left: 4px solid #8b5cf6; }
.task-type-exploration { border-left: 4px solid #10b981; }
.task-type-combat { border-left: 4px solid #ef4444; }
.task-type-custom { border-left: 4px solid #f59e0b; }

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1rem;
  background: var(--color-background-mute);
  cursor: pointer;
}

.task-title-area {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex: 1;
}

.task-icon {
  font-size: 1.25rem;
}

.task-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.task-type-badge {
  background: var(--color-primary);
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 500;
}

.expand-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.task-body {
  padding: 1rem;
  border-top: 1px solid var(--color-border);
}

.task-description {
  margin: 0 0 1rem 0;
  line-height: 1.6;
  color: var(--color-text);
}

.subsection-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 任务条件 */
.task-conditions {
  margin-bottom: 1rem;
}

.condition-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  margin-bottom: 0.375rem;
  background: var(--color-background);
  border-radius: 4px;
  border: 1px solid var(--color-border);
}

.condition-item.completed {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgb(16, 185, 129);
}

.condition-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.condition-text {
  flex: 1;
  font-size: 0.875rem;
}

.condition-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.progress-bar-mini {
  width: 60px;
  height: 6px;
  background: var(--color-background-mute);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.3s;
}

.progress-text-mini {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  min-width: 40px;
}

/* 任务奖励 */
.task-rewards {
  margin-bottom: 1rem;
}

.rewards-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 4px;
  font-size: 0.875rem;
}

.reward-icon {
  font-size: 1rem;
}

/* 任务底部信息 */
.task-footer {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.75rem;
  background: var(--color-background);
  border-radius: 4px;
  margin-bottom: 0.75rem;
}

.time-limit,
.failure-penalty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.footer-label {
  font-weight: 500;
  color: var(--color-text-secondary);
}

.footer-value {
  color: var(--color-text);
}

.penalty-text {
  color: #ef4444;
}

.task-meta {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}

.meta-label {
  font-weight: 500;
}

/* 空状态 */
.empty-tasks {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.empty-text {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 0.875rem;
  opacity: 0.8;
}

/* 已完成任务 */
.completed-section {
  margin-top: auto;
  border-top: 1px solid var(--color-border);
  padding-top: 1rem;
}

.completed-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
  font-weight: 600;
}

.completed-header:hover {
  background: var(--color-background-mute);
}

.expand-icon {
  margin-left: auto;
  font-size: 0.75rem;
}

.completed-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.75rem;
  max-height: 300px;
  overflow-y: auto;
}

.completed-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--color-background-soft);
  border-radius: 4px;
  font-size: 0.875rem;
}

.completed-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.completed-name {
  flex: 1;
  color: var(--color-text-secondary);
}

.more-hint {
  text-align: center;
  padding: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-style: italic;
}
</style>