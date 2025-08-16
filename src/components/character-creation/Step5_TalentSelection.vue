<template>
  <div class="talent-selection-container">
    <div v-if="isLoading" class="loading-state">于时光长河中搜寻天赋...</div>
    <div v-else-if="error" class="error-state">天机紊乱，无法搜寻：{{ error }}</div>

    <div v-else class="talent-layout">
      <!-- 左侧面板：列表和操作按钮 -->
      <div class="talent-left-panel">
        <div class="talent-list-container">
          <div
            v-for="talent in talents"
            :key="talent.id"
            class="talent-item"
            :class="{
              selected: isSelected(talent),
              disabled: !canSelect(talent)
            }"
            @click="toggleTalent(talent)"
          >
            <span class="talent-name">{{ talent.name }}</span>
            <span class="talent-cost">{{ talent.talent_cost }} 点</span>
          </div>
        </div>

        <!-- 功能按钮 -->
        <div class="single-actions-container">
          <div class="divider"></div>
          <button v-if="store.mode === 'single'" @click="isCustomModalVisible = true" class="action-item shimmer-on-hover">
            <span class="action-name">自定义天赋</span>
          </button>
          <button @click="handleAIGenerate" class="action-item shimmer-on-hover">
            <span class="action-name">AI推演</span>
          </button>
        </div>
      </div>

      <div class="talent-details-container">
        <div v-if="activeTalent" class="talent-details">
          <h2>{{ activeTalent.name }}</h2>
          <div class="description-scroll">
            <p>{{ activeTalent.description || '此天赋之玄妙，需自行领悟。' }}</p>
          </div>
          <div class="cost-display">
            消耗天道点: {{ activeTalent.talent_cost }}
          </div>
        </div>
        <div v-else class="placeholder">
          请选择天赋。
        </div>
      </div>
    </div>

    <CustomCreationModal
      :visible="isCustomModalVisible"
      title="自定义天赋"
      :fields="customTalentFields"
      :validationFn="(data) => validateCustomData('talent', data)"
      @close="isCustomModalVisible = false"
      @submit="handleCustomSubmit"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useCharacterCreationStore, type Talent } from '../../stores/characterCreationStore';
import { LOCAL_TALENTS } from '../../data/localData';
import { request } from '../../services/request';
import CustomCreationModal from './CustomCreationModal.vue';
import { generateTalentWithTavernAI, validateCustomData } from '../../utils/tavernAI';
import { toast } from '../../utils/toast';

const emit = defineEmits(['ai-generate']);
const store = useCharacterCreationStore();
const talents = ref<Talent[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const activeTalent = ref<Talent | null>(null);
const isCustomModalVisible = ref(false);

const customTalentFields = [
  { key: 'name', label: '天赋名称', type: 'text', placeholder: '例如：道心天成' },
  { key: 'description', label: '天赋描述', type: 'textarea', placeholder: '描述此天赋的效果...' },
  { key: 'talent_cost', label: '消耗天道点', type: 'text', placeholder: '例如：5' }
] as const;

function handleCustomSubmit(data: any) {
  const newTalent: Talent = {
    id: Date.now(),
    name: data.name,
    description: data.description,
    talent_cost: parseInt(data.talent_cost, 10) || 0,
    effects: null,
    rarity: 1
  };
  talents.value.unshift(newTalent);
  // Custom talents are not auto-selected to avoid complex point validation here
  activeTalent.value = newTalent;
}

async function fetchTalents() {
  // 单机模式使用本地数据
  if (store.mode === 'single') {
    try {
      console.log('Loading local talents:', LOCAL_TALENTS);
      const localTalents: Talent[] = LOCAL_TALENTS.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || null,
        talent_cost: t.talent_cost,
        effects: t.effects || null,
        rarity: 1 // 默认稀有度
      }));

      talents.value = localTalents;
      console.log('Talents loaded:', talents.value);

      // 模拟加载延迟
      setTimeout(() => {
        isLoading.value = false;
      }, 300);
    } catch (e: any) {
      console.error('Failed to load talents:', e);
      error.value = '加载本地数据失败: ' + e.message;
      isLoading.value = false;
    }
    return;
  }

  // 联机模式请求后端
  if (!store.selectedWorld) {
    error.value = "尚未选择世界，无法获取天赋数据。";
    isLoading.value = false;
    return;
  }
  try {
    const data = await request<any>(`/api/v1/creation_data?world_id=${store.selectedWorld.id}`);
    talents.value = data.talents || [];
  } catch (e: any) {
    error.value = e.message;
  } finally {
    isLoading.value = false;
  }
}

const isSelected = (talent: Talent) => {
  return store.selectedTalents.some(t => t.id === talent.id);
};

const canSelect = (talent: Talent) => {
  if (store.mode === 'multi') {
    return true; // In multi mode, server handles validation
  }
  if (isSelected(talent)) {
    return true; // Always allow deselecting
  }
  return store.remainingTalentPoints >= talent.talent_cost;
};

function toggleTalent(talent: Talent) {
  activeTalent.value = talent;
  const index = store.selectedTalents.findIndex(t => t.id === talent.id);
  if (index > -1) {
    // Deselect
    store.selectedTalents.splice(index, 1);
  } else {
    // Select if possible
    if (store.mode === 'single' && !canSelect(talent)) {
      toast.warning("天道点不足，无法选择此天赋。");
      return;
    }
    store.selectedTalents.push(talent);
  }
}

async function _handleLocalAIGenerate() {
  isLoading.value = true;
  error.value = null;
  try {
    const newTalent = await generateTalentWithTavernAI();
    talents.value.unshift(newTalent);
    // AI generated talents are not auto-selected
    activeTalent.value = newTalent;
  } catch (e: any) {
    error.value = `AI推演失败: ${e.message}`;
    toast.error(error.value);
  } finally {
    isLoading.value = false;
  }
}

async function handleAIGenerateWithCode(code: string) {
  isLoading.value = true;
  error.value = null;
  try {
    const newTalent = await request<Talent>('/api/v1/ai_redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, type: 'talent' }),
    });
    talents.value.unshift(newTalent);
    activeTalent.value = newTalent; // Show the new talent in details view
    toast.success('天机接引成功！');
  } catch (e: any) {
    error.value = `AI推演失败: ${e.message}`;
  } finally {
    isLoading.value = false;
  }
}

function handleAIGenerate() {
  if (store.mode === 'single') {
    _handleLocalAIGenerate();
  } else {
    emit('ai-generate');
  }
}

defineExpose({
  handleAIGenerateWithCode,
  fetchData: fetchTalents,  // 暴露数据获取方法
});

onMounted(() => {
  fetchTalents();
});
</script>

<style scoped>
.talent-selection-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.loading-state, .error-state, .placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 1.2rem;
  color: #888;
}

.talent-layout {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
  height: 100%;
  overflow: hidden;
}

/* 左侧面板容器 */
.talent-left-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.talent-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  transition: var(--transition-fast);
}

/* 美化滚动条 */
.talent-list-container::-webkit-scrollbar {
  width: 8px;
}

.talent-list-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.talent-list-container::-webkit-scrollbar-thumb {
  background: rgba(180, 142, 173, 0.3);
  border-radius: 4px;
}

.talent-list-container::-webkit-scrollbar-thumb:hover {
  background: rgba(180, 142, 173, 0.5);
}

.talent-item {
  display: flex;
  justify-content: space-between;
  padding: 0.8rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border-left: 3px solid transparent;
}

.talent-item:hover {
  background: rgba(180, 142, 173, 0.1);
}

.talent-item.selected {
  background: rgba(180, 142, 173, 0.2);
  color: #b48ead;
  border-left: 3px solid #b48ead;
}

.talent-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: transparent;
  color: #888;
}

.talent-name {
  font-weight: 500;
}

.talent-cost {
  color: var(--color-accent);
}

.talent-details-container {
  border: 1px solid #444;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

.talent-details {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.talent-details h2 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #b48ead;
  flex-shrink: 0;
}

.description-scroll {
  flex: 1;
  overflow-y: auto;
  line-height: 1.6;
  margin-bottom: 1rem;
  padding-right: 0.5rem;
}

/* 美化详情滚动条 */
.description-scroll::-webkit-scrollbar {
  width: 8px;
}

.description-scroll::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.description-scroll::-webkit-scrollbar-thumb {
  background: rgba(180, 142, 173, 0.3);
  border-radius: 4px;
}

.description-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(180, 142, 173, 0.5);
}

.cost-display {
  text-align: right;
  font-weight: bold;
  color: var(--color-accent);
  flex-shrink: 0;
}

/* 单机模式功能按钮样式 */
.single-actions-container {
  border-top: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem;
}

.divider {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(180, 142, 173, 0.3),
    transparent
  );
  margin: 0.5rem 0;
}

.action-item {
  display: flex;
  justify-content: space-between;
  padding: 0.8rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border: none;
  background: transparent;
  color: var(--color-text);
  width: 100%;
  text-align: left;
  font-size: 1rem;
}

.action-item:hover {
  background: rgba(var(--color-primary-rgb), 0.1);
}

.action-name {
  font-weight: 500;
  color: var(--color-primary);
}
</style>
