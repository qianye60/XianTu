<template>
  <div class="talent-selection-container">
    <div v-if="store.isLoading" class="loading-state">于时光长河中搜寻天赋...</div>
    <div v-else-if="store.error" class="error-state">天机紊乱：{{ store.error }}</div>

    <div v-else class="talent-layout">
      <!-- 左侧面板：列表和操作按钮 -->
      <div class="talent-left-panel">
        <div class="talent-list-container">
          <div
            v-for="talent in store.creationData.talents"
            :key="talent.id"
            class="talent-item"
            :class="{
              selected: isSelected(talent),
              disabled: !canSelect(talent),
            }"
            @click="handleToggleTalent(talent)"
            @mouseover="activeTalent = talent"
          >
            <span class="talent-name">{{ talent.name }}</span>
            <span class="talent-cost">{{ talent.talent_cost }} 点</span>
          </div>
        </div>

        <!-- 功能按钮 -->
        <div class="single-actions-container">
          <button
            v-if="store.isLocalCreation"
            @click="isCustomModalVisible = true"
            class="action-item shimmer-on-hover"
          >
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
          <div class="cost-display">消耗天道点: {{ activeTalent.talent_cost }}</div>
        </div>
        <div v-else class="placeholder">请选择天赋。</div>
      </div>
    </div>

    <CustomCreationModal
      :visible="isCustomModalVisible"
      title="自定义天赋"
      :fields="customTalentFields"
      :validationFn="validateCustomTalent"
      @close="isCustomModalVisible = false"
      @submit="handleCustomSubmit"
    />

    <LoadingModal :visible="isGeneratingAI" message="天机推演中..." />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCharacterCreationStore } from '../../stores/characterCreationStore'
import type { Talent } from '../../types'
import CustomCreationModal from './CustomCreationModal.vue'
import LoadingModal from '../LoadingModal.vue'
import { toast } from '../../utils/toast'
import { generateTalentWithTavernAI } from '../../utils/tavernAI'
import { saveGameData } from '../../utils/tavern';

const emit = defineEmits(['ai-generate'])
const store = useCharacterCreationStore()
const activeTalent = ref<Talent | null>(null) // For details view on hover/click
const isCustomModalVisible = ref(false)
const isGeneratingAI = ref(false)

const customTalentFields = [
  { key: 'name', label: '天赋名称', type: 'text', placeholder: '例如：道心天成' },
  { key: 'description', label: '天赋描述', type: 'textarea', placeholder: '描述此天赋的效果...' },
  { key: 'talent_cost', label: '消耗天道点', type: 'text', placeholder: '例如：5' },
] as const

function validateCustomTalent(data: any) {
    const errors: Record<string, string> = {};
    if (!data.name?.trim()) errors.name = '天赋名称不可为空';
    const cost = Number(data.talent_cost);
    if (isNaN(cost) || cost < 0) errors.talent_cost = '消耗点数必须为非负数';
    return {
        valid: Object.keys(errors).length === 0,
        errors: Object.values(errors),
    };
}

async function handleCustomSubmit(data: any) {
  const newTalent: Talent = {
    id: Date.now(),
    name: data.name,
    description: data.description || '',
    talent_cost: parseInt(data.talent_cost, 10) || 0,
    effects: null,
    rarity: 1,
  }

  try {
    store.addTalent(newTalent);
    await saveGameData(store.creationData);
    isCustomModalVisible.value = false;
    toast.success(`自定义天赋 "${newTalent.name}" 已保存！`);
  } catch (e) {
    console.error('保存自定义天赋失败:', e);
    toast.error('保存自定义天赋失败！');
  }
}

const isSelected = (talent: Talent): boolean => {
  return store.characterPayload.selected_talent_ids.includes(talent.id);
}

const canSelect = (talent: Talent): boolean => {
  if (isSelected(talent)) {
    return true; // Always allow deselecting
  }
  return store.remainingTalentPoints >= talent.talent_cost;
}

function handleToggleTalent(talent: Talent) {
  activeTalent.value = talent;
  if (!canSelect(talent)) {
    toast.warning('天道点不足，无法选择此天赋。');
    return;
  }
  store.toggleTalent(talent.id);
}

async function _handleLocalAIGenerate() {
  isGeneratingAI.value = true;
  try {
    const newTalent = await generateTalentWithTavernAI();
    store.addTalent(newTalent);
    await saveGameData(store.creationData);
    toast.success(`AI推演天赋 "${newTalent.name}" 已保存！`);
  } catch (e: any) {
    // Error handled in tavernAI
  } finally {
    isGeneratingAI.value = false;
  }
}

function handleAIGenerate() {
  if (store.isLocalCreation) {
    _handleLocalAIGenerate();
  } else {
    emit('ai-generate');
  }
}

// fetchData 和 defineExpose 不再需要
</script>

<style scoped>
.talent-selection-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.loading-state,
.error-state,
.placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 1.2rem;
  color: var(--color-text-secondary);
}

.talent-layout {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
  height: 100%;
  overflow: hidden;
}

.talent-left-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-surface);
}

.talent-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.talent-list-container::-webkit-scrollbar { width: 8px; }
.talent-list-container::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); border-radius: 4px; }
.talent-list-container::-webkit-scrollbar-thumb { background: rgba(180, 142, 173, 0.3); border-radius: 4px; }
.talent-list-container::-webkit-scrollbar-thumb:hover { background: rgba(180, 142, 173, 0.5); }

.talent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  font-weight: 600;
}

.talent-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: transparent;
  color: var(--color-text-disabled);
}
.talent-item.disabled:hover {
  background: var(--color-surface-danger);
}

.talent-name {
  font-weight: 500;
}

.talent-cost {
  color: var(--color-accent);
}

.single-actions-container {
  border-top: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem;
  display: flex;
  gap: 0.5rem;
}

.action-item {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.8rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border: 1px solid var(--color-border);
  background: var(--color-surface-light);
  color: var(--color-text);
  font-size: 1rem;
}

.action-item:hover {
  background: var(--color-surface-lighter);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.action-name {
  font-weight: 500;
}

.talent-details-container {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1.5rem;
  background: var(--color-surface);
}

.talent-details {
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

.description-scroll p {
  margin: 0;
  white-space: pre-wrap;
  color: var(--color-text-secondary);
}

.description-scroll::-webkit-scrollbar { width: 8px; }
.description-scroll::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); border-radius: 4px; }
.description-scroll::-webkit-scrollbar-thumb { background: rgba(180, 142, 173, 0.3); border-radius: 4px; }
.description-scroll::-webkit-scrollbar-thumb:hover { background: rgba(180, 142, 173, 0.5); }

.cost-display {
  text-align: right;
  font-weight: bold;
  color: var(--color-accent);
  flex-shrink: 0;
}
</style>