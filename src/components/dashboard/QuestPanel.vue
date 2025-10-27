<template>
  <div class="quest-panel">
    <div class="panel-header">
      <h2>任务</h2>
      <div class="header-actions">
        <button @click="showConfigDialog = true" class="config-btn" title="任务系统配置">
          <Settings :size="16" />
        </button>
        <button @click="questStore.generateNewQuest()" :disabled="questStore.isGenerating" class="generate-btn">
          {{ questStore.isGenerating ? '推演中...' : '寻找机缘' }}
        </button>
      </div>
    </div>

    <div class="quest-tabs">
      <button
        :class="{ active: activeTab === 'all' }"
        @click="activeTab = 'all'"
      >
        全部 ({{ questStore.currentQuests.length }})
      </button>
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

    <!-- 任务类型筛选 - 只在"全部"和"进行中"标签页显示 -->
    <div v-if="activeTab !== 'completed'" class="quest-filters">
      <button
        v-for="type in questTypes"
        :key="type"
        :class="['filter-btn', { active: selectedType === type }]"
        @click="toggleTypeFilter(type)"
      >
        {{ type }}
      </button>
    </div>

    <!-- 任务配置对话框 -->
    <div v-if="showConfigDialog" class="config-overlay" @click="showConfigDialog = false">
      <div class="config-dialog" @click.stop>
        <div class="config-header">
          <h3>任务系统配置</h3>
          <button class="close-btn" @click="showConfigDialog = false">×</button>
        </div>
        <div class="config-content">
          <div class="config-section">
            <label class="config-label">系统任务类型</label>
            <select v-model="localConfig.系统任务类型" class="config-select">
              <option value="修仙辅助系统">修仙辅助系统</option>
              <option value="道侣养成系统">道侣养成系统</option>
              <option value="宗门发展系统">宗门发展系统</option>
              <option value="探索冒险系统">探索冒险系统</option>
              <option value="战斗挑战系统">战斗挑战系统</option>
              <option value="资源收集系统">资源收集系统</option>
            </select>
            <span class="config-desc">选择AI生成任务的风格类型</span>
          </div>

          <div class="config-section">
            <label class="config-label">默认任务数量</label>
            <div class="range-input">
              <input
                type="range"
                v-model.number="localConfig.默认任务数量"
                min="1"
                max="10"
                step="1"
              />
              <span class="range-value">{{ localConfig.默认任务数量 }}</span>
            </div>
            <span class="config-desc">任务池中保持的未完成任务数量</span>
          </div>

          <div class="config-section">
            <label class="config-label">
              <input type="checkbox" v-model="localConfig.自动刷新" class="config-checkbox" />
              自动刷新任务
            </label>
            <span class="config-desc">完成任务后自动生成新任务</span>
          </div>

          <div class="config-section full-width">
            <label class="config-label">自定义任务提示词</label>
            <textarea
              v-model="localConfig.系统任务提示词"
              class="config-textarea"
              placeholder="例如：生成更多战斗类任务，奖励偏向灵石..."
              rows="3"
            ></textarea>
            <span class="config-desc">为AI任务生成添加自定义指令（可选）</span>
          </div>
        </div>
        <div class="config-footer">
          <button class="config-btn-secondary" @click="showConfigDialog = false">取消</button>
          <button class="config-btn-primary" @click="saveConfig">保存配置</button>
        </div>
      </div>
    </div>

    <div class="quest-list">
      <div
        v-for="quest in displayQuests"
        :key="quest.任务ID"
        class="quest-item"
        :class="[getQuestTypeClass(quest.任务类型), { completed: quest.任务状态 === '已完成' }]"
      >
        <div class="quest-header">
          <span class="quest-type" :class="getQuestTypeClass(quest.任务类型)">{{ quest.任务类型 }}</span>
          <h3 class="quest-title">{{ quest.任务名称 }}</h3>
          <span v-if="quest.任务状态 === '已完成'" class="quest-status completed">✓ 已完成</span>
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
            <div class="objective-progress-bar">
              <div class="progress-fill" :style="{ width: `${(obj.当前进度 / obj.需求数量) * 100}%` }"></div>
              <span class="progress-text">{{ obj.当前进度 }}/{{ obj.需求数量 }}</span>
            </div>
          </div>
        </div>

        <div class="quest-rewards">
          <span class="reward-label">奖励：</span>
          <span v-if="quest.奖励.修为" class="reward cultivation">修为 +{{ quest.奖励.修为 }}</span>

          <!-- 灵石奖励 -->
          <span v-if="quest.奖励.灵石?.下品" class="reward spirit-stone">下品灵石 ×{{ quest.奖励.灵石.下品 }}</span>
          <span v-if="quest.奖励.灵石?.中品" class="reward spirit-stone">中品灵石 ×{{ quest.奖励.灵石.中品 }}</span>
          <span v-if="quest.奖励.灵石?.上品" class="reward spirit-stone">上品灵石 ×{{ quest.奖励.灵石.上品 }}</span>
          <span v-if="quest.奖励.灵石?.极品" class="reward spirit-stone">极品灵石 ×{{ quest.奖励.灵石.极品 }}</span>

          <!-- 物品奖励 -->
          <span v-if="quest.奖励.物品 && quest.奖励.物品.length > 0" class="reward item">
            {{ quest.奖励.物品.map((i: any) => `${i.名称}×${i.数量}`).join('、') }}
          </span>

          <!-- 声望奖励 -->
          <span v-if="quest.奖励.声望" class="reward reputation">
            {{ quest.奖励.声望.势力名称 }} 声望 {{ quest.奖励.声望.变化值 > 0 ? '+' : '' }}{{ quest.奖励.声望.变化值 }}
          </span>

          <!-- 属性加成 -->
          <span v-if="quest.奖励.属性加成" class="reward attribute">
            {{ formatAttributeBonus(quest.奖励.属性加成) }}
          </span>

          <!-- 技能奖励 -->
          <span v-if="quest.奖励.技能 && quest.奖励.技能.length > 0" class="reward skill">
            技能：{{ quest.奖励.技能.join('、') }}
          </span>

          <!-- 好感度奖励 -->
          <span v-if="quest.奖励.好感度" class="reward favor">
            {{ quest.奖励.好感度.NPC名称 }} 好感度 {{ quest.奖励.好感度.变化值 > 0 ? '+' : '' }}{{ quest.奖励.好感度.变化值 }}
          </span>

          <!-- 自定义描述 -->
          <span v-if="quest.奖励.自定义描述" class="reward custom">{{ quest.奖励.自定义描述 }}</span>
        </div>

        <div class="quest-footer">
          <div v-if="quest.发布者" class="quest-issuer">
            <span class="issuer-label">{{ quest.发布者 === '系统' ? '🤖' : '👤' }}</span>
            <span>{{ quest.发布者 }}</span>
          </div>
          <div v-if="quest.完成时间" class="quest-time">
            完成时间：{{ formatTime(quest.完成时间) }}
          </div>
          <!-- 删除按钮 - 所有任务都可以删除 -->
          <button
            @click="deleteQuest(quest.任务ID)"
            class="delete-quest-btn"
            title="删除任务"
          >
            ×
          </button>
        </div>
      </div>

      <div v-if="displayQuests.length === 0" class="no-quests">
        <p>{{ getEmptyMessage() }}</p>
        <p v-if="activeTab === 'active'" class="hint">点击上方"寻找机缘"按钮获取新任务</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQuestStore } from '@/stores/questStore';
import type { Quest, QuestType, InnateAttributes } from '@/types/game';
import { Settings } from 'lucide-vue-next';

const questStore = useQuestStore();
const activeTab = ref<'all' | 'active' | 'completed'>('active');
const selectedType = ref<QuestType | null>(null);
const showConfigDialog = ref(false);

// 本地配置状态
const localConfig = ref({
  启用系统任务: false,
  系统任务类型: '修仙辅助系统' as string,
  默认任务数量: 3,
  自动刷新: true,
  系统任务提示词: ''
});

// 所有任务类型（无主次之分，一切随机）
const questTypes: QuestType[] = ['宗门', '奇遇', '日常', '系统任务', '道侣培养', '修为提升', '收集资源', '战斗挑战'];

// 初始化配置
watch(() => questStore.questConfig, (newConfig) => {
  if (newConfig) {
    localConfig.value = { ...newConfig };
  }
}, { immediate: true });

// 显示的任务列表
const displayQuests = computed(() => {
  let quests: Quest[] = [];

  if (activeTab.value === 'all') {
    quests = questStore.currentQuests;
  } else if (activeTab.value === 'active') {
    quests = questStore.activeQuests;
  } else {
    quests = questStore.completedQuests;
  }

  // 按类型筛选（只有在选择了类型时才筛选）
  if (selectedType.value && activeTab.value !== 'completed') {
    quests = quests.filter(q => q.任务类型 === selectedType.value);
  }

  return quests;
});

// 切换类型筛选
function toggleTypeFilter(type: QuestType) {
  if (selectedType.value === type) {
    selectedType.value = null; // 取消筛选
  } else {
    selectedType.value = type; // 应用筛选
  }
}

// 保存配置
async function saveConfig() {
  try {
    await questStore.updateQuestConfig(localConfig.value);
    showConfigDialog.value = false;
  } catch (error) {
    console.error('保存任务配置失败:', error);
  }
}

// 获取任务类型样式类名
function getQuestTypeClass(type: QuestType): string {
  const typeMap: Record<QuestType, string> = {
    '宗门': 'type-sect',
    '奇遇': 'type-adventure',
    '日常': 'type-daily',
    '系统任务': 'type-system',
    '道侣培养': 'type-companion',
    '修为提升': 'type-cultivation',
    '收集资源': 'type-collect',
    '战斗挑战': 'type-combat'
  };
  return typeMap[type] || 'type-default';
}

// 格式化属性加成
function formatAttributeBonus(bonus: Partial<InnateAttributes>): string {
  const attrNames: Record<keyof InnateAttributes, string> = {
    根骨: '根骨',
    灵性: '灵性',
    悟性: '悟性',
    气运: '气运',
    魅力: '魅力',
    心性: '心性'
  };

  const parts: string[] = [];
  for (const [key, value] of Object.entries(bonus)) {
    if (value && key in attrNames) {
      parts.push(`${attrNames[key as keyof InnateAttributes]} +${value}`);
    }
  }
  return parts.join('、');
}

// 格式化时间
function formatTime(time: string | any): string {
  if (typeof time === 'string') {
    const date = new Date(time);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  return '未知时间';
}

// 获取空列表提示
function getEmptyMessage(): string {
  if (activeTab.value === 'completed') {
    return '暂无已完成的任务';
  } else if (selectedType.value) {
    return `暂无"${selectedType.value}"类型的任务`;
  } else if (activeTab.value === 'active') {
    return '暂无进行中的任务';
  } else {
    return '暂无任务';
  }
}

// 删除任务
async function deleteQuest(questId: string) {
  try {
    await questStore.deleteQuest(questId);
  } catch (error) {
    console.error('删除任务失败:', error);
  }
}
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
  font-size: 0.9rem;
}

.quest-tabs button.active {
  color: var(--color-primary);
  border-bottom: 2px solid var(--color-primary);
}

/* 任务类型筛选 */
.quest-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: var(--color-background);
  border-radius: 6px;
}

.filter-btn {
  padding: 0.3rem 0.8rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  transition: all 0.2s;
}

.filter-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.filter-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
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

.quest-item.completed {
  opacity: 0.7;
  background: var(--color-surface-light);
}

/* 所有任务类型样式 */
.quest-item.type-main { border-left: 4px solid #ff6b6b; }
.quest-item.type-side { border-left: 4px solid #4ecdc4; }
.quest-item.type-sect { border-left: 4px solid #45b7d1; }
.quest-item.type-adventure { border-left: 4px solid #f9ca24; }
.quest-item.type-daily { border-left: 4px solid #95afc0; }
.quest-item.type-system { border-left: 4px solid #a29bfe; }
.quest-item.type-companion { border-left: 4px solid #fd79a8; }
.quest-item.type-cultivation { border-left: 4px solid #fdcb6e; }
.quest-item.type-collect { border-left: 4px solid #00b894; }
.quest-item.type-combat { border-left: 4px solid #e17055; }

.quest-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.quest-type {
  padding: 0.2rem 0.5rem;
  color: white;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.quest-type.type-main { background: #ff6b6b; }
.quest-type.type-side { background: #4ecdc4; }
.quest-type.type-sect { background: #45b7d1; }
.quest-type.type-adventure { background: #f9ca24; }
.quest-type.type-daily { background: #95afc0; }
.quest-type.type-system { background: #a29bfe; }
.quest-type.type-companion { background: #fd79a8; }
.quest-type.type-cultivation { background: #fdcb6e; }
.quest-type.type-collect { background: #00b894; }
.quest-type.type-combat { background: #e17055; }

.quest-title {
  margin: 0;
  font-size: 1.1rem;
  color: var(--color-text);
  flex: 1;
}

.quest-status.completed {
  padding: 0.2rem 0.5rem;
  background: #00b894;
  color: white;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
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
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.5rem;
  background: var(--color-surface-light);
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.objective.completed {
  opacity: 0.6;
}

.objective.completed .objective-desc {
  text-decoration: line-through;
}

.objective-desc {
  font-size: 0.9rem;
  color: var(--color-text);
}

.objective-progress-bar {
  position: relative;
  height: 20px;
  background: var(--color-background);
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  transition: width 0.3s ease;
}

.progress-text {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
  z-index: 1;
}

.quest-rewards {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.5rem 0;
  padding: 0.5rem;
  background: var(--color-surface-light);
  border-radius: 6px;
}

.reward-label {
  font-weight: 600;
  color: var(--color-text);
  margin-right: 0.3rem;
}

.reward {
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
}

.reward.cultivation {
  background: rgba(253, 203, 110, 0.2);
  color: #fdcb6e;
  border: 1px solid #fdcb6e;
}

.reward.spirit-stone {
  background: rgba(116, 185, 255, 0.2);
  color: #74b9ff;
  border: 1px solid #74b9ff;
}

.reward.item {
  background: rgba(162, 155, 254, 0.2);
  color: #a29bfe;
  border: 1px solid #a29bfe;
}

.reward.reputation {
  background: rgba(255, 107, 107, 0.2);
  color: #ff6b6b;
  border: 1px solid #ff6b6b;
}

.reward.attribute {
  background: rgba(0, 184, 148, 0.2);
  color: #00b894;
  border: 1px solid #00b894;
}

.reward.skill {
  background: rgba(253, 121, 168, 0.2);
  color: #fd79a8;
  border: 1px solid #fd79a8;
}

.reward.favor {
  background: rgba(255, 118, 117, 0.2);
  color: #ff7675;
  border: 1px solid #ff7675;
}

.reward.custom {
  background: rgba(149, 175, 192, 0.2);
  color: #95afc0;
  border: 1px solid #95afc0;
}

.quest-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.85rem;
}

.quest-issuer {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--color-text-secondary);
}

.issuer-label {
  font-size: 1rem;
}

.quest-time {
  color: var(--color-text-secondary);
  font-size: 0.8rem;
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

/* 配置对话框样式 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.config-btn {
  padding: 0.5rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.config-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-1px);
}

.config-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.config-dialog {
  background: var(--color-surface);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.config-header h3 {
  margin: 0;
  color: var(--color-primary);
  font-size: 1.2rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--color-background);
  color: var(--color-text);
}

.config-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.config-section.full-width {
  grid-column: 1 / -1;
}

.config-label {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.config-select {
  padding: 0.5rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.config-select:hover,
.config-select:focus {
  border-color: var(--color-primary);
  outline: none;
}

.config-desc {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-style: italic;
}

.range-input {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.range-input input[type="range"] {
  flex: 1;
  height: 6px;
  background: var(--color-background);
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
}

.range-input input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--color-primary);
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s;
}

.range-input input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.range-input input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: var(--color-primary);
  cursor: pointer;
  border-radius: 50%;
  border: none;
  transition: all 0.2s;
}

.range-value {
  min-width: 30px;
  text-align: center;
  font-weight: 600;
  color: var(--color-primary);
}

.config-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.config-textarea {
  padding: 0.75rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s;
}

.config-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.config-textarea::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.6;
}

.config-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
}

.config-btn-secondary,
.config-btn-primary {
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.config-btn-secondary {
  background: var(--color-background);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.config-btn-secondary:hover {
  background: var(--color-surface-light);
  border-color: var(--color-text-secondary);
}

.config-btn-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: white;
}

.config-btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style>