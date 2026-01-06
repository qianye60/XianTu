<template>
  <div class="quest-panel">
    <!-- 顶部工具栏 -->
    <div class="quest-toolbar">
      <div class="toolbar-left">
        <div class="tab-btns">
          <button :class="{ active: activeTab === 'active' }" @click="activeTab = 'active'">
            进行中 ({{ questStore.activeQuests.length }})
          </button>
          <button :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">
            全部 ({{ questStore.currentQuests.length }})
          </button>
        </div>
      </div>
      <div class="toolbar-right">
        <button class="tool-btn" @click="showConfigDialog = true" title="配置">
          <Settings :size="16" />
        </button>
        <button class="tool-btn primary" @click="questStore.generateNewQuest()" :disabled="questStore.isGenerating">
          <Plus :size="16" />
          {{ questStore.isGenerating ? '推演中...' : '寻找机缘' }}
        </button>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="quest-list">
      <div v-if="displayQuests.length === 0" class="empty-state">
        <p>暂无任务</p>
        <button class="action-btn primary" @click="questStore.generateNewQuest()">
          <Sparkles :size="16" />
          寻找机缘
        </button>
      </div>

      <div
        v-for="quest in displayQuests"
        :key="quest.任务ID"
        class="quest-item"
        :class="{
          completed: quest.任务状态 === '已完成',
          tracked: questStore.trackedQuestId === quest.任务ID
        }"
      >
        <div class="quest-main" @click="toggleQuestDetail(quest.任务ID)">
          <div class="quest-header">
            <span class="quest-type-tag" :class="getTypeClass(quest.任务类型)">{{ quest.任务类型 }}</span>
            <span class="quest-name">{{ quest.任务名称 }}</span>
            <span v-if="quest.任务状态 === '已完成'" class="status-done">✓</span>
          </div>

          <!-- 目标进度条 -->
          <div class="quest-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: getQuestProgress(quest) + '%' }"></div>
            </div>
            <span class="progress-text">{{ getQuestProgress(quest) }}%</span>
          </div>
        </div>

        <!-- 快捷操作 -->
        <div class="quest-actions">
          <button v-if="!quest.任务状态 || quest.任务状态 === '未接取'" class="act-btn accept" @click.stop="acceptQuest(quest)" title="接取">
            <CheckCircle :size="14" />
          </button>
          <button v-if="quest.任务状态 === '进行中'" class="act-btn track" :class="{ active: questStore.trackedQuestId === quest.任务ID }" @click.stop="trackQuest(quest)" title="追踪">
            <Target :size="14" />
          </button>
          <button v-if="quest.任务状态 === '进行中'" class="act-btn abandon" @click.stop="abandonQuest(quest.任务ID)" title="放弃">
            <XCircle :size="14" />
          </button>
          <button class="act-btn delete" @click.stop="deleteQuest(quest.任务ID)" title="删除">
            <Trash2 :size="14" />
          </button>
        </div>

        <!-- 展开详情 -->
        <div v-if="expandedQuestId === quest.任务ID" class="quest-detail">
          <p class="quest-desc">{{ quest.任务描述 }}</p>

          <!-- 目标列表 -->
          <div class="objectives">
            <div v-for="(obj, idx) in quest.目标列表" :key="idx" class="objective" :class="{ done: obj.已完成 }">
              <span class="obj-check">{{ obj.已完成 ? '✓' : '○' }}</span>
              <span class="obj-text">{{ obj.描述 }}</span>
              <span class="obj-progress">{{ obj.当前进度 }}/{{ obj.需求数量 }}</span>
            </div>
          </div>

          <!-- 奖励 -->
          <div class="rewards" v-if="quest.奖励">
            <span class="reward-label">奖励:</span>
            <span v-if="quest.奖励.修为" class="reward">修为+{{ quest.奖励.修为 }}</span>
            <span v-if="quest.奖励.灵石?.下品" class="reward">灵石×{{ quest.奖励.灵石.下品 }}</span>
            <span v-if="quest.奖励.物品?.length" class="reward">{{ quest.奖励.物品.map((i: any) => i.名称).join('、') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 配置对话框 -->
    <div v-if="showConfigDialog" class="config-overlay" @click="showConfigDialog = false">
      <div class="config-dialog" @click.stop>
        <div class="config-header">
          <h3>任务配置</h3>
          <button class="close-btn" @click="showConfigDialog = false">×</button>
        </div>
        <div class="config-body">
          <div class="config-row">
            <label>任务风格</label>
            <select v-model="localConfig.系统任务类型">
              <option value="修仙辅助系统">修仙辅助</option>
              <option value="道侣养成系统">道侣养成</option>
              <option value="宗门发展系统">宗门发展</option>
              <option value="探索冒险系统">探索冒险</option>
              <option value="战斗挑战系统">战斗挑战</option>
            </select>
          </div>
          <div class="config-row">
            <label>自动刷新</label>
            <input type="checkbox" v-model="localConfig.自动刷新" />
          </div>
          <div class="config-row">
            <label>自定义提示</label>
            <textarea v-model="localConfig.系统任务提示词" placeholder="可选：自定义任务生成指令" rows="2"></textarea>
          </div>
        </div>
        <div class="config-footer">
          <button class="btn" @click="showConfigDialog = false">取消</button>
          <button class="btn primary" @click="saveConfig">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQuestStore } from '@/stores/questStore';
import { useUIStore } from '@/stores/uiStore';
import type { Quest } from '@/types/game';
import { Settings, Plus, CheckCircle, Target, XCircle, Trash2, Sparkles } from 'lucide-vue-next';

const questStore = useQuestStore();
const uiStore = useUIStore();

const activeTab = ref<'all' | 'active'>('active');
const showConfigDialog = ref(false);
const expandedQuestId = ref<string | null>(null);

const localConfig = ref({
  启用系统任务: false,
  系统任务类型: '修仙辅助系统',
  默认任务数量: 3,
  自动刷新: true,
  系统任务提示词: ''
});

watch(() => questStore.questConfig, (cfg) => {
  if (cfg) localConfig.value = { ...cfg };
}, { immediate: true });

const displayQuests = computed(() => {
  return activeTab.value === 'active' ? questStore.activeQuests : questStore.currentQuests;
});

const getQuestProgress = (quest: Quest): number => {
  if (!quest.目标列表?.length) return 0;
  const total = quest.目标列表.reduce((sum, obj) => sum + obj.需求数量, 0);
  const current = quest.目标列表.reduce((sum, obj) => sum + obj.当前进度, 0);
  return total > 0 ? Math.round((current / total) * 100) : 0;
};

const getTypeClass = (type: string): string => {
  const map: Record<string, string> = {
    '宗门': 'type-sect', '奇遇': 'type-adventure', '日常': 'type-daily',
    '系统任务': 'type-system', '道侣培养': 'type-companion',
    '修为提升': 'type-cultivation', '收集资源': 'type-collect', '战斗挑战': 'type-combat'
  };
  return map[type] || '';
};

const toggleQuestDetail = (questId: string) => {
  expandedQuestId.value = expandedQuestId.value === questId ? null : questId;
};

const acceptQuest = async (quest: Quest) => {
  await questStore.acceptQuest(quest.任务ID);
  uiStore.showToast(`已接取: ${quest.任务名称}`, { type: 'success' });
};

const trackQuest = (quest: Quest) => {
  questStore.setTrackedQuest(quest.任务ID);
  uiStore.showToast(`追踪: ${quest.任务名称}`, { type: 'info' });
};

const abandonQuest = (questId: string) => {
  uiStore.showRetryDialog({
    title: '放弃任务',
    message: '确定放弃此任务？进度将重置。',
    confirmText: '确定',
    cancelText: '取消',
    onConfirm: async () => {
      await questStore.abandonQuest(questId);
      uiStore.showToast('已放弃任务', { type: 'warning' });
    },
    onCancel: () => {}
  });
};

const deleteQuest = async (questId: string) => {
  await questStore.deleteQuest(questId);
};

const saveConfig = async () => {
  await questStore.updateQuestConfig(localConfig.value);
  showConfigDialog.value = false;
};
</script>

<style scoped>
.quest-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
}

/* 工具栏 */
.quest-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.tab-btns {
  display: flex;
  gap: 4px;
}

.tab-btns button {
  padding: 6px 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btns button.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
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
}

.tool-btn.primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 任务列表 */
.quest-list {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--color-text-secondary);
}

/* 任务项 */
.quest-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
}

.quest-item:hover {
  border-color: var(--color-primary);
}

.quest-item.completed {
  opacity: 0.6;
}

.quest-item.tracked {
  border-color: var(--color-info);
  box-shadow: 0 0 0 1px var(--color-info);
}

.quest-main {
  padding: 12px;
  cursor: pointer;
}

.quest-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.quest-type-tag {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  color: white;
  background: var(--color-text-secondary);
}

.quest-type-tag.type-sect { background: #45b7d1; }
.quest-type-tag.type-adventure { background: #f9ca24; color: #333; }
.quest-type-tag.type-daily { background: #95afc0; }
.quest-type-tag.type-system { background: #a29bfe; }
.quest-type-tag.type-companion { background: #fd79a8; }
.quest-type-tag.type-cultivation { background: #fdcb6e; color: #333; }
.quest-type-tag.type-collect { background: #00b894; }
.quest-type-tag.type-combat { background: #e17055; }

.quest-name {
  flex: 1;
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.95rem;
}

.status-done {
  color: #22c55e;
  font-weight: bold;
}

.quest-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.3s;
}

.progress-text {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  min-width: 35px;
}

/* 快捷操作 */
.quest-actions {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  background: var(--color-background);
  border-top: 1px solid var(--color-border);
}

.act-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.act-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.act-btn.accept:hover { border-color: #22c55e; color: #22c55e; }
.act-btn.track.active { background: var(--color-info); border-color: var(--color-info); color: white; }
.act-btn.abandon:hover { border-color: #f59e0b; color: #f59e0b; }
.act-btn.delete:hover { border-color: #ef4444; color: #ef4444; }

/* 任务详情 */
.quest-detail {
  padding: 12px;
  border-top: 1px solid var(--color-border);
  background: var(--color-background);
}

.quest-desc {
  margin: 0 0 12px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.objectives {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.objective {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--color-surface);
  border-radius: 4px;
  font-size: 0.85rem;
}

.objective.done {
  opacity: 0.6;
}

.objective.done .obj-text {
  text-decoration: line-through;
}

.obj-check {
  color: var(--color-text-secondary);
}

.objective.done .obj-check {
  color: #22c55e;
}

.obj-text {
  flex: 1;
  color: var(--color-text);
}

.obj-progress {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.rewards {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 0.8rem;
}

.reward-label {
  color: var(--color-text-secondary);
}

.reward {
  padding: 2px 6px;
  background: rgba(var(--color-primary-rgb), 0.1);
  border-radius: 4px;
  color: var(--color-primary);
}

/* 配置对话框 */
.config-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.config-dialog {
  background: var(--color-surface);
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.config-header h3 {
  margin: 0;
  font-size: 1rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--color-text-secondary);
}

.config-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.config-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.config-row label {
  font-size: 0.85rem;
  color: var(--color-text);
  font-weight: 500;
}

.config-row select,
.config-row textarea {
  padding: 8px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.9rem;
}

.config-row input[type="checkbox"] {
  width: 18px;
  height: 18px;
}

.config-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.9rem;
}

.btn.primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

/* 通用按钮 */
.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.9rem;
}

.action-btn.primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}
</style>
