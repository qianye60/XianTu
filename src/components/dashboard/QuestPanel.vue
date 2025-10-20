<template>
  <div class="quest-panel">
    <div class="panel-header">
      <h2>任务</h2>
      <button @click="questStore.generateNewQuest()" :disabled="questStore.isGenerating" class="generate-btn">
        {{ questStore.isGenerating ? '推演中...' : '寻找机缘' }}
      </button>
    </div>

    <div class="quest-tabs">
      <button
        :class="{ active: activeTab === 'active' }"
        @click="activeTab = 'active'"
      >
        进行中 ({{ questStore.activeQuests.length }})
      </button>
      <button
        :class="{ active: activeTab === 'completed' }"
        @click="activeTab = 'completed'"
      >
        已完成 ({{ questStore.completedQuests.length }})
      </button>
    </div>

    <div class="quest-list">
      <div
        v-for="quest in displayQuests"
        :key="quest.任务ID"
        class="quest-item"
        :class="[quest.任务类型]"
      >
        <div class="quest-header">
          <span class="quest-type">{{ quest.任务类型 }}</span>
          <h3 class="quest-title">{{ quest.任务名称 }}</h3>
        </div>

        <p class="quest-description">{{ quest.任务描述 }}</p>

        <div class="quest-objectives">
          <div
            v-for="(obj, idx) in quest.目标列表"
            :key="idx"
            class="objective"
            :class="{ completed: obj.已完成 }"
          >
            <span class="objective-desc">{{ obj.描述 }}</span>
            <span class="objective-progress">{{ obj.当前进度 }}/{{ obj.需求数量 }}</span>
          </div>
        </div>

        <div class="quest-rewards">
          <span class="reward-label">奖励：</span>
          <span v-if="quest.奖励.修为" class="reward">修为 +{{ quest.奖励.修为 }}</span>
          <span v-if="quest.奖励.灵石?.下品" class="reward">下品灵石 +{{ quest.奖励.灵石.下品 }}</span>
          <span v-if="quest.奖励.物品" class="reward">
            {{ quest.奖励.物品.map((i: { 名称: string; }) => i.名称).join('、') }}
          </span>
        </div>

        <div v-if="quest.发布者" class="quest-issuer">
          发布者：{{ quest.发布者 }}
        </div>
      </div>

      <div v-if="displayQuests.length === 0" class="no-quests">
        <p>{{ activeTab === 'active' ? '暂无进行中的任务' : '暂无已完成的任务' }}</p>
        <p v-if="activeTab === 'active'" class="hint">点击上方"寻找机缘"按钮获取新任务</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuestStore } from '@/stores/questStore';

const questStore = useQuestStore();
const activeTab = ref<'active' | 'completed'>('active');

const displayQuests = computed(() => {
  return activeTab.value === 'active' ? questStore.activeQuests : questStore.completedQuests;
});
</script>

<style scoped>
.quest-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  background: var(--color-surface);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.panel-header h2 {
  margin: 0;
  color: var(--color-primary);
}

.generate-btn {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.quest-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 2px solid var(--color-border);
}

.quest-tabs button {
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.3s;
}

.quest-tabs button.active {
  color: var(--color-primary);
  border-bottom: 2px solid var(--color-primary);
}

.quest-list {
  flex: 1;
  overflow-y: auto;
}

.quest-item {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  transition: all 0.3s;
}

.quest-item:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.quest-item.主线 { border-left: 4px solid #ff6b6b; }
.quest-item.支线 { border-left: 4px solid #4ecdc4; }
.quest-item.宗门 { border-left: 4px solid #45b7d1; }
.quest-item.奇遇 { border-left: 4px solid #f9ca24; }
.quest-item.日常 { border-left: 4px solid #95afc0; }

.quest-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.quest-type {
  padding: 0.2rem 0.5rem;
  background: var(--color-primary);
  color: white;
  border-radius: 4px;
  font-size: 0.75rem;
}

.quest-title {
  margin: 0;
  font-size: 1.1rem;
  color: var(--color-text);
}

.quest-description {
  color: var(--color-text-secondary);
  margin: 0.5rem 0;
  line-height: 1.5;
}

.quest-objectives {
  margin: 1rem 0;
}

.objective {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background: var(--color-surface-light);
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.objective.completed {
  opacity: 0.6;
  text-decoration: line-through;
}

.objective-progress {
  font-weight: 600;
  color: var(--color-primary);
}

.quest-rewards {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.5rem 0;
}

.reward-label {
  font-weight: 600;
  color: var(--color-text);
}

.reward {
  padding: 0.2rem 0.5rem;
  background: rgba(var(--color-primary-rgb), 0.1);
  border-radius: 4px;
  color: var(--color-primary);
  font-size: 0.9rem;
}

.quest-issuer {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  font-style: italic;
}

.no-quests {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.no-quests .hint {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  opacity: 0.7;
}
</style>