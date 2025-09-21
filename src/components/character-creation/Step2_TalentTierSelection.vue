<template>
  <div class="talent-tier-selection">
    <div v-if="store.isLoading" class="loading-state">感应天道，测算天资...</div>
    <div v-else-if="store.error" class="error-state">天机混沌：{{ store.error }}</div>

    <div v-else class="tier-layout">
      <!-- 左侧面板：列表和操作按钮 -->
      <div class="tier-left-panel">
        <div class="tiers-list-container">
          <div
            v-for="tier in filteredTalentTiers"
            :key="tier.id"
            class="tier-item"
            :class="{ selected: store.characterPayload.talent_tier_id === tier.id }"
            :style="{ '--tier-glow-color': tier.color, '--tier-glow-color-rgb': hexToRgb(tier.color) }"
            @click="handleSelectTalentTier(tier)"
            @mouseover="activeTier = tier"
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
        <div v-if="activeTier" class="tier-details">
          <h2 :style="{ color: activeTier.color }">
            {{ activeTier.name }}
          </h2>
          <div class="description-scroll">
            <p>{{ activeTier.description }}</p>
          </div>
          <div class="points-display">天道点: {{ activeTier.total_points }}</div>
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

    <!-- AI生成逻辑已移至toast通知 -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCharacterCreationStore } from '../../stores/characterCreationStore'
import type { TalentTier } from '../../types'
import CustomCreationModal from './CustomCreationModal.vue'
import { toast } from '../../utils/toast'
import { generateTalentTier } from '../../utils/tavernAI'

interface CustomTierData {
  name: string
  description: string
  total_points: string
  color: string
}

const emit = defineEmits(['ai-generate'])
const store = useCharacterCreationStore()
const activeTier = ref<TalentTier | null>(null) // For hover details view - 仿照天赋选择
const isCustomModalVisible = ref(false)

const filteredTalentTiers = computed(() => {
  const allTiers = store.creationData.talentTiers;
  console.log("【天资选择】所有天资数据:", allTiers);
  console.log("【天资选择】当前模式:", store.isLocalCreation ? '本地' : '联机');
  console.log("【天资选择】数据明细:", allTiers.map(t => ({ name: t.name, source: t.source, id: t.id })));
  
  if (store.isLocalCreation) {
    // 单机模式显示本地数据和云端同步的数据
    const availableTiers = allTiers.filter(tier => 
      tier.source === 'local' || tier.source === 'cloud'
    );
    console.log("【天资选择】单机模式可用天资列表:", availableTiers);
    return availableTiers;
  } else {
    // 联机模式显示所有数据，包括本地数据作为后备
    const availableTiers = allTiers.length > 0 ? allTiers : [];
    console.log("【天资选择】联机模式天资列表:", availableTiers);
    console.log("【天资选择】联机模式天资数量:", availableTiers.length);
    
    if (availableTiers.length === 0) {
      console.warn("【天资选择】警告：联机模式下没有找到任何天资数据！");
    }
    
    return availableTiers;
  }
});

const customTierFields = [
  { key: 'name', label: '天资名称', type: 'text', placeholder: '例如：凡人' },
  { key: 'description', label: '天资描述', type: 'textarea', placeholder: '描述此天资的特点...' },
  { key: 'total_points', label: '天道点', type: 'text', placeholder: '例如：10' },
  { key: 'color', label: '辉光颜色', type: 'text', placeholder: '例如：#808080' },
] as const

function validateCustomTier(data: Partial<CustomTierData>) {
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
    // await saveGameData(store.creationData); // NOTE: 持久化由Pinia插件自动处理
    handleSelectTalentTier(newTier);
    isCustomModalVisible.value = false;
    toast.success(`自定义天资 "${newTier.name}" 已保存！`);
  } catch (e) {
    console.error('保存自定义天资失败:', e);
    toast.error('保存自定义天资失败！');
  }
}

async function _handleLocalAIGenerate() {
  const toastId = 'ai-generate-talent-tier';
  toast.loading('天机推演中，请稍候...', { id: toastId });
  try {
    const newTier = await generateTalentTier()
    if (newTier) {
      store.addTalentTier(newTier);
      handleSelectTalentTier(newTier);
      toast.success(`AI推演天资 "${newTier.name}" 已保存！`, { id: toastId });
    } else {
      toast.error('AI未能成功推演天资，请稍后再试。', { id: toastId });
    }
  } catch (e: unknown) {
    console.error("AI天资推演时发生意外错误:", e);
    // Error toast handled in tavernAI, just dismiss loading
    toast.hide(toastId);
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
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

/* 响应式适配 - 手机端优化 */
@media (max-width: 1200px) {
  .tier-layout {
    grid-template-columns: 1fr 1.8fr;
    gap: 1.5rem;
  }
}

@media (max-width: 1024px) {
  .tier-layout {
    grid-template-columns: 1fr 1.5fr;
    gap: 1.2rem;
  }
  
  .tier-details h2 {
    font-size: 1.8rem;
  }
}

@media (max-width: 640px) {
  .tier-layout {
    /* 改为垂直堆叠布局 */
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    gap: 1rem;
    height: auto;
    overflow: visible;
    padding: 0.8rem;
  }
  
  .tier-left-panel {
    order: 1;
    max-height: 40vh;
  }
  
  .tier-details-container {
    order: 2;
    min-height: 300px;
  }
  
  .tiers-list-container {
    max-height: 35vh;
    /* 添加触摸滚动优化 */
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }
  
  /* 优化触摸体验 */
  .tier-item,
  .action-item {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
}

@media (max-width: 640px) {
  .tier-layout {
    gap: 0.8rem;
    padding: 0.6rem;
  }
  
  .tier-left-panel {
    max-height: 35vh;
  }
  
  .tiers-list-container {
    max-height: 30vh;
    padding: 0.5rem;
  }
  
  .tier-item {
    padding: 0.7rem;
    font-size: 0.95rem;
    margin-bottom: 0.4rem;
  }
  
  .single-actions-container {
    padding: 0.5rem;
    gap: 0.4rem;
  }
  
  .action-item {
    padding: 0.7rem 1rem;
    font-size: 0.9rem;
  }
  
  .tier-details-container {
    padding: 1.2rem;
    min-height: 250px;
  }
  
  .tier-details h2 {
    font-size: 1.6rem;
    margin-bottom: 0.8rem;
  }
  
  .points-display {
    font-size: 1.1rem;
  }
}

@media (max-width: 480px) {
  .talent-tier-selection {
    padding: 0.4rem;
    height: 100vh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .tier-layout {
    gap: 0.6rem;
    padding: 0;
    height: auto;
    min-height: calc(100vh - 2rem);
  }
  
  .tier-left-panel {
    max-height: 30vh;
    border-radius: 6px;
  }
  
  .tiers-list-container {
    max-height: 26vh;
    padding: 0.4rem;
  }
  
  .tier-item {
    padding: 0.6rem 0.8rem;
    font-size: 0.9rem;
    margin-bottom: 0.3rem;
    border-radius: 4px;
  }
  
  .tier-name {
    font-size: 0.9rem;
  }
  
  .tier-points {
    font-size: 0.8rem;
  }
  
  .single-actions-container {
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.4rem;
  }
  
  .action-item {
    padding: 0.6rem;
    font-size: 0.85rem;
    border-radius: 4px;
  }
  
  .tier-details-container {
    padding: 1rem;
    min-height: 200px;
    border-radius: 6px;
  }
  
  .tier-details h2 {
    font-size: 1.4rem;
    margin-bottom: 0.6rem;
    text-align: center;
  }
  
  .description-scroll {
    font-size: 0.9rem;
    line-height: 1.5;
    padding-right: 0.3rem;
  }
  
  .points-display {
    font-size: 1rem;
    text-align: center;
    padding-top: 0.8rem;
    margin-top: 0.8rem;
  }
  
  .placeholder {
    font-size: 1rem;
    padding: 1rem;
    text-align: center;
    min-height: 150px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

@media (max-width: 360px) {
  .talent-tier-selection {
    padding: 0.3rem;
  }
  
  .tier-layout {
    gap: 0.4rem;
  }
  
  .tier-left-panel {
    max-height: 28vh;
  }
  
  .tiers-list-container {
    max-height: 24vh;
    padding: 0.3rem;
  }
  
  .tier-item {
    padding: 0.5rem 0.6rem;
    font-size: 0.85rem;
    margin-bottom: 0.2rem;
  }
  
  .tier-name {
    font-size: 0.8rem;
  }
  
  .tier-points {
    font-size: 0.75rem;
  }
  
  .tier-details-container {
    padding: 0.8rem;
    min-height: 180px;
  }
  
  .tier-details h2 {
    font-size: 1.2rem;
    margin-bottom: 0.5rem;
  }
  
  .description-scroll {
    font-size: 0.85rem;
    line-height: 1.4;
  }
  
  .points-display {
    font-size: 0.9rem;
    padding-top: 0.6rem;
    margin-top: 0.6rem;
  }
  
  .action-item {
    padding: 0.5rem;
    font-size: 0.8rem;
  }
  
  .placeholder {
    font-size: 0.9rem;
    padding: 0.8rem;
    min-height: 120px;
  }
}
</style>