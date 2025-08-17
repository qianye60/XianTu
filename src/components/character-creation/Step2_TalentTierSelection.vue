<template>
  <div class="talent-tier-selection">
    <div v-if="store.isLoading" class="loading-state">感应天道，测算天资...</div>
    <div v-else-if="store.error" class="error-state">天机混沌：{{ store.error }}</div>

    <div v-else class="tier-layout">
      <!-- 左侧面板：列表和操作按钮 -->
      <div class="tier-left-panel">
        <div class="tiers-list-container">
          <div
            v-for="tier in store.creationData.talentTiers"
            :key="tier.id"
            class="tier-item"
            :class="{ selected: store.characterPayload.talent_tier_id === tier.id }"
            :style="{ '--tier-glow-color': tier.color, '--tier-glow-color-rgb': hexToRgb(tier.color) }"
            @click="handleSelectTalentTier(tier)"
          >
            <span class="tier-name">{{ tier.name }}</span>
            <span class="tier-points">{{ tier.total_points }} 点</span>
          </div>
        </div>

        <!-- 功能按钮 -->
        <div class="single-actions-container">
          <button v-if="store.isLocalCreation" @click="isCustomModalVisible = true" class="action-item shimmer-on-hover">
            <span class="action-name">自定义天资</span>
          </button>
          <button @click="handleAIGenerate" class="action-item shimmer-on-hover">
            <span class="action-name">AI推演</span>
          </button>
        </div>
      </div>

      <!-- 右侧详情 -->
      <div class="tier-details-container">
        <div v-if="store.selectedTalentTier" class="tier-details">
          <h2 :style="{ color: store.selectedTalentTier.color }">
            {{ store.selectedTalentTier.name }}
          </h2>
          <div class="description-scroll">
            <p>{{ store.selectedTalentTier.description }}</p>
          </div>
          <div class="points-display">天道点: {{ store.selectedTalentTier.total_points }}</div>
        </div>
        <div v-else class="placeholder">请选择你的天资等级，这将决定你的起点。</div>
      </div>
    </div>

    <CustomCreationModal
      :visible="isCustomModalVisible"
      title="自定义天资"
      :fields="customTierFields"
      :validationFn="validateCustomTier"
      @close="isCustomModalVisible = false"
      @submit="handleCustomSubmit"
    />

    <!-- AI生成等待弹窗 -->
    <LoadingModal :visible="isGeneratingAI" message="天机推演中..." />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCharacterCreationStore } from '../../stores/characterCreationStore'
import type { TalentTier } from '../../types'
import CustomCreationModal from './CustomCreationModal.vue'
import LoadingModal from '../LoadingModal.vue'
import { toast } from '../../utils/toast'
import { generateTalentTierWithTavernAI } from '../../utils/tavernAI'
import { saveGameData } from '../../utils/tavern';

interface CustomTierData {
  name: string
  description: string
  total_points: string
  color: string
}

const emit = defineEmits(['ai-generate'])
const store = useCharacterCreationStore()
const isCustomModalVisible = ref(false)
const isGeneratingAI = ref(false)

const customTierFields = [
  { key: 'name', label: '天资名称', type: 'text', placeholder: '例如：凡人' },
  { key: 'description', label: '天资描述', type: 'textarea', placeholder: '描述此天资的特点...' },
  { key: 'total_points', label: '天道点', type: 'text', placeholder: '例如：10' },
  { key: 'color', label: '辉光颜色', type: 'text', placeholder: '例如：#808080' },
] as const

function validateCustomTier(data: any) {
    const errors: Record<string, string> = {};
    if (!data.name?.trim()) errors.name = '天资名称不可为空';
    const points = Number(data.total_points);
    if (isNaN(points) || points < 0 || points > 100) errors.total_points = '天道点必须是0-100的数字';
    return {
        valid: Object.keys(errors).length === 0,
        errors: Object.values(errors),
    };
}

async function handleCustomSubmit(data: CustomTierData) {
  const newTier: TalentTier = {
    id: Date.now(),
    name: data.name,
    description: data.description,
    total_points: parseInt(data.total_points, 10) || 10,
    color: data.color || '#808080',
    rarity: 1, // Custom tiers have a default rarity
  }
  
  try {
    store.addTalentTier(newTier);
    await saveGameData(store.creationData);
    handleSelectTalentTier(newTier);
    isCustomModalVisible.value = false;
    toast.success(`自定义天资 "${newTier.name}" 已保存！`);
  } catch (e) {
    console.error('保存自定义天资失败:', e);
    toast.error('保存自定义天资失败！');
  }
}

async function _handleLocalAIGenerate() {
  isGeneratingAI.value = true
  try {
    const newTier = await generateTalentTierWithTavernAI()
    store.addTalentTier(newTier)
    await saveGameData(store.creationData);
    handleSelectTalentTier(newTier)
    toast.success(`AI推演天资 "${newTier.name}" 已保存！`);
  } catch (e: any) {
    // Error toast handled in tavernAI
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

function handleSelectTalentTier(tier: TalentTier) {
  store.selectTalentTier(tier.id)
}

function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '229, 192, 123';
}

// fetchData 和 defineExpose 不再需要，因为父组件会处理初始化
</script>

<style scoped>
.talent-tier-selection {
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

.tier-layout {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
  height: 100%;
  overflow: hidden;
}

.tier-left-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-surface);
}

.tiers-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.tiers-list-container::-webkit-scrollbar { width: 8px; }
.tiers-list-container::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); border-radius: 4px; }
.tiers-list-container::-webkit-scrollbar-thumb { background: rgba(var(--color-primary-rgb), 0.3); border-radius: 4px; }
.tiers-list-container::-webkit-scrollbar-thumb:hover { background: rgba(var(--color-primary-rgb), 0.5); }

.tier-item {
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

.tier-item:hover {
  background: rgba(var(--tier-glow-color-rgb, 229, 192, 123), 0.1);
}

.tier-item.selected {
  background: rgba(var(--tier-glow-color-rgb, 229, 192, 123), 0.2);
  color: var(--tier-glow-color, #e5c07b);
  border-left: 3px solid var(--tier-glow-color, #e5c07b);
  box-shadow: 0 0 15px rgba(var(--tier-glow-color-rgb, 229, 192, 123), 0.3);
}

.tier-name {
  font-weight: 600;
  color: var(--tier-glow-color, inherit);
}

.tier-points {
  color: var(--color-accent);
  font-weight: 500;
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

.tier-details-container {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1.5rem;
  background: var(--color-surface);
}

.tier-details {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.tier-details h2 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 2rem;
  text-align: center;
  flex-shrink: 0;
  text-shadow: 0 0 20px currentColor;
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
.description-scroll::-webkit-scrollbar-thumb { background: rgba(var(--color-primary-rgb), 0.3); border-radius: 4px; }
.description-scroll::-webkit-scrollbar-thumb:hover { background: rgba(var(--color-primary-rgb), 0.5); }

.points-display {
  text-align: center;
  font-weight: bold;
  color: var(--color-accent);
  font-size: 1.2rem;
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}
</style>