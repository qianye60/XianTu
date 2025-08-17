<template>
  <div class="spirit-root-selection-container">
    <div v-if="store.isLoading" class="loading-state">天地玄黄，探查灵根...</div>
    <div v-else-if="store.error" class="error-state">天机混沌：{{ store.error }}</div>

    <div v-else class="spirit-root-layout">
      <!-- 左侧面板：列表和操作按钮 -->
      <div class="spirit-root-left-panel">
        <div class="spirit-root-list-container">
          <div
            class="spirit-root-item"
            :class="{ selected: isRandomSelected }"
            @click="handleSelectRandom"
          >
            <span class="spirit-root-name">随机灵根</span>
            <span class="spirit-root-cost">0 点</span>
          </div>
          <div class="divider"></div>
          <div
            v-for="root in store.creationData.spiritRoots"
            :key="root.id"
            class="spirit-root-item"
            :class="{
              selected: store.characterPayload.spirit_root_id === root.id,
              disabled: !canSelect(root),
            }"
            @click="handleSelectSpiritRoot(root)"
          >
            <span class="spirit-root-name">{{ root.name }}</span>
            <span class="spirit-root-cost">{{ root.talent_cost }} 点</span>
          </div>
        </div>

        <!-- 功能按钮 -->
        <div class="single-actions-container">
          <button
            v-if="store.isLocalCreation"
            @click="isCustomModalVisible = true"
            class="action-item shimmer-on-hover"
          >
            <span class="action-name">自定义灵根</span>
          </button>
          <button @click="handleAIGenerate" class="action-item shimmer-on-hover">
            <span class="action-name">AI推演</span>
          </button>
        </div>
      </div>

      <!-- 右侧详情 -->
      <div class="spirit-root-details-container">
        <div v-if="store.selectedSpiritRoot || isRandomSelected" class="spirit-root-details">
          <h2>{{ selectedDisplayName }}</h2>
          <div class="description-scroll">
            <p>{{ selectedDescription }}</p>
          </div>
          <div class="cost-display">消耗天道点: {{ selectedCost }}</div>
        </div>
        <div v-else class="placeholder">请选择一种灵根，或听天由命。</div>
      </div>
    </div>

    <CustomCreationModal
      :visible="isCustomModalVisible"
      title="自定义灵根"
      :fields="customSpiritRootFields"
      :validationFn="validateCustomSpiritRoot"
      @close="isCustomModalVisible = false"
      @submit="handleCustomSubmit"
    />

    <LoadingModal :visible="isGeneratingAI" message="天机推演中..." />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCharacterCreationStore } from '../../stores/characterCreationStore'
import type { SpiritRoot } from '../../types'
import CustomCreationModal from './CustomCreationModal.vue'
import LoadingModal from '../LoadingModal.vue'
import { toast } from '../../utils/toast'
import { generateSpiritRootWithTavernAI } from '../../utils/tavernAI'
import { saveGameData } from '../../utils/tavern';

const emit = defineEmits(['ai-generate'])
const store = useCharacterCreationStore()
const isCustomModalVisible = ref(false)
const isGeneratingAI = ref(false)

const customSpiritRootFields = [
  { key: 'name', label: '灵根名称', type: 'text', placeholder: '例如：混沌灵根' },
  { key: 'description', label: '灵根描述', type: 'textarea', placeholder: '描述这个灵根的特性...' },
  { key: 'base_multiplier', label: '修炼倍率', type: 'text', placeholder: '例如：1.5' },
  { key: 'talent_cost', label: '消耗天道点', type: 'text', placeholder: '例如：10' },
] as const

function validateCustomSpiritRoot(data: any) {
    const errors: Record<string, string> = {};
    if (!data.name?.trim()) errors.name = '灵根名称不可为空';
    if (isNaN(parseFloat(data.base_multiplier))) errors.base_multiplier = '修炼倍率必须为数字';
    if (isNaN(parseInt(data.talent_cost, 10))) errors.talent_cost = '消耗点数必须为数字';
    return {
        valid: Object.keys(errors).length === 0,
        errors: Object.values(errors),
    };
}

async function handleCustomSubmit(data: any) {
  const newRoot: SpiritRoot = {
    id: Date.now(),
    name: data.name,
    description: data.description || '',
    base_multiplier: parseFloat(data.base_multiplier) || 1.0,
    talent_cost: parseInt(data.talent_cost, 10) || 0,
  }

  try {
    store.addSpiritRoot(newRoot);
    await saveGameData(store.creationData);
    handleSelectSpiritRoot(newRoot);
    isCustomModalVisible.value = false;
    toast.success(`自定义灵根 "${newRoot.name}" 已保存！`);
  } catch (e) {
    console.error('保存自定义灵根失败:', e);
    toast.error('保存自定义灵根失败！');
  }
}

const isRandomSelected = computed(() => store.characterPayload.spirit_root_id === null);

const selectedDisplayName = computed(() => {
  if (isRandomSelected.value) return '随机灵根'
  return store.selectedSpiritRoot?.name || ''
})

const selectedDescription = computed(() => {
  if (isRandomSelected.value)
    return '大道五十，天衍四九，人遁其一。选择此项，你的灵根将完全随机生成，可能一步登天，亦可能平庸无奇。'
  return store.selectedSpiritRoot?.description || '灵根信息不明。'
})

const selectedCost = computed(() => {
  if (isRandomSelected.value) return 0
  return store.selectedSpiritRoot?.talent_cost || 0
})

const canSelect = (root: SpiritRoot): boolean => {
  if (store.characterPayload.spirit_root_id === root.id) {
    return true;
  }
  const currentCost = store.selectedSpiritRoot?.talent_cost ?? 0;
  const availablePoints = store.remainingTalentPoints + currentCost;
  return availablePoints >= root.talent_cost;
}

function handleSelectSpiritRoot(root: SpiritRoot) {
  if (!canSelect(root)) {
    toast.warning('天道点不足，无法选择此灵根。')
    return
  }
  const newRootId = store.characterPayload.spirit_root_id === root.id ? null : root.id;
  store.selectSpiritRoot(newRootId);
}

function handleSelectRandom() {
  store.selectSpiritRoot(null);
}

async function _handleLocalAIGenerate() {
  isGeneratingAI.value = true
  try {
    const newRoot = await generateSpiritRootWithTavernAI()
    store.addSpiritRoot(newRoot);
    await saveGameData(store.creationData);
    handleSelectSpiritRoot(newRoot);
    toast.success(`AI推演灵根 "${newRoot.name}" 已保存！`);
  } catch (e: any) {
    // Error handled in tavernAI
  } finally {
    isGeneratingAI.value = false
  }
}

function handleAIGenerate() {
  if (store.isLocalCreation) {
    _handleLocalAIGenerate()
  } else {
    emit('ai-generate')
  }
}

// fetchData 和 defineExpose 不再需要
</script>

<style scoped>
.spirit-root-selection-container {
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

.spirit-root-layout {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
  height: 100%;
  overflow: hidden;
}

.spirit-root-left-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-surface);
}

.spirit-root-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.spirit-root-list-container::-webkit-scrollbar { width: 8px; }
.spirit-root-list-container::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); border-radius: 4px; }
.spirit-root-list-container::-webkit-scrollbar-thumb { background: rgba(136, 192, 208, 0.3); border-radius: 4px; }
.spirit-root-list-container::-webkit-scrollbar-thumb:hover { background: rgba(136, 192, 208, 0.5); }

.spirit-root-item {
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

.spirit-root-item:hover {
  background: rgba(136, 192, 208, 0.1);
}

.spirit-root-item.selected {
  background: rgba(136, 192, 208, 0.2);
  color: #88c0d0;
  border-left: 3px solid #88c0d0;
  font-weight: 600;
}

.spirit-root-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: transparent;
  color: var(--color-text-disabled);
}
.spirit-root-item.disabled:hover {
  background: var(--color-surface-danger);
}

.spirit-root-name {
  font-weight: 500;
}

.spirit-root-cost {
  color: var(--color-accent);
}

.divider {
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(136, 192, 208, 0.2), transparent);
  margin: 0.5rem 0;
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

.spirit-root-details-container {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1.5rem;
  background: var(--color-surface);
}

.spirit-root-details {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.spirit-root-details h2 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #88c0d0;
  flex-shrink: 0;
}

.description-scroll {
  flex: 1;
  overflow-y: auto;
  line-height: 1.6;
  padding-right: 0.5rem;
  min-height: 0;
}

.description-scroll p {
  margin: 0;
  white-space: pre-wrap;
  color: var(--color-text-secondary);
}

.description-scroll::-webkit-scrollbar { width: 8px; }
.description-scroll::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); border-radius: 4px; }
.description-scroll::-webkit-scrollbar-thumb { background: rgba(136, 192, 208, 0.3); border-radius: 4px; }
.description-scroll::-webkit-scrollbar-thumb:hover { background: rgba(136, 192, 208, 0.5); }

.cost-display {
  text-align: right;
  font-weight: bold;
  color: var(--color-accent);
  flex-shrink: 0;
  margin-top: 1rem;
}
</style>