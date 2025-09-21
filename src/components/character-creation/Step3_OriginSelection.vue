<template>
  <div class="origin-selection-container">
    <div v-if="store.isLoading" class="loading-state">追溯过往，探寻出身...</div>
    <div v-else-if="store.error" class="error-state">因果不明：{{ store.error }}</div>

    <div v-else class="origin-layout">
      <!-- 左侧栏：列表和操作按钮 -->
      <div class="origin-left-panel">
        <div class="origin-list-container">
          <div
           class="origin-item"
           :class="{ selected: isRandomSelected }"
           @click="handleSelectRandom"
           @mouseover="activeOrigin = 'random'"
          >
           <span class="origin-name">随机出身</span>
           <span class="origin-cost">0 点</span>
          </div>
          <div class="divider"></div>
          <div
            v-for="origin in filteredOrigins"
            :key="origin.id"
            class="origin-item"
            :class="{
              selected: store.characterPayload.origin_id === origin.id,
              disabled: !canSelect(origin),
            }"
            @click="handleSelectOrigin(origin)"
            @mouseover="activeOrigin = origin"
          >
            <span class="origin-name">{{ origin.name }}</span>
            <span class="origin-cost">{{ origin.talent_cost }} 点</span>
          </div>
        </div>

        <!-- 功能按钮 -->
        <div class="single-actions-container">
          <button
            v-if="store.isLocalCreation"
            @click="isCustomModalVisible = true"
            class="action-item shimmer-on-hover"
          >
            <span class="action-name">自定义出身</span>
          </button>
          <button @click="handleAIGenerate" class="action-item shimmer-on-hover">
            <span class="action-name">AI推演</span>
          </button>
        </div>
      </div>

      <!-- 右侧详情 -->
      <div class="origin-details-container">
        <div v-if="activeOrigin" class="origin-details">
          <h2>{{ activeDisplayName }}</h2>
          <div class="description-scroll">
            <p>{{ activeDescription }}</p>
          </div>
          <div class="cost-display">消耗天道点: {{ activeCost }}</div>
        </div>
        <div v-else class="placeholder">请选择一处出身，或听天由命。</div>
      </div>
    </div>

    <CustomCreationModal
      :visible="isCustomModalVisible"
      title="自定义出身"
      :fields="customOriginFields"
      :validationFn="validateCustomOrigin"
      @close="isCustomModalVisible = false"
      @submit="handleCustomSubmit"
    />
    <!-- AI生成逻辑已移至toast通知 -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCharacterCreationStore } from '../../stores/characterCreationStore'
import type { Origin } from '../../types'
import CustomCreationModal from './CustomCreationModal.vue'
import { toast } from '../../utils/toast'
import { generateOrigin } from '../../utils/tavernAI'

const emit = defineEmits(['ai-generate'])
const store = useCharacterCreationStore()
const activeOrigin = ref<Origin | 'random' | null>(null) // For hover details view - 仿照天赋选择
const isCustomModalVisible = ref(false)

const filteredOrigins = computed(() => {
  const allOrigins = store.creationData.origins;
  console.log("【出身选择】所有出身数据:", allOrigins);
  console.log("【出身选择】当前模式:", store.isLocalCreation ? '本地' : '联机');
  
  if (store.isLocalCreation) {
    // 单机模式显示本地数据和云端同步的数据
    const availableOrigins = allOrigins.filter(origin => 
      origin.source === 'local' || origin.source === 'cloud'
    );
    console.log("【出身选择】单机模式可用出身列表:", availableOrigins);
    return availableOrigins;
  } else {
    const cloudOrigins = allOrigins.filter(origin => 
      origin.source === 'cloud'
    );
    console.log("【出身选择】联机模式出身列表:", cloudOrigins);
    console.log("【出身选择】云端出身数量:", cloudOrigins.length);
    
    if (cloudOrigins.length === 0) {
      console.warn("【出身选择】警告：联机模式下没有找到云端出身数据！");
      console.log("【出身选择】所有出身的source分布:", allOrigins.reduce((acc: Record<string, number>, o) => {
        acc[o.source] = (acc[o.source] || 0) + 1;
        return acc;
      }, {}));
    }
    
    return cloudOrigins;
  }
});

const customOriginFields = [
  { key: 'name', label: '出身名称', type: 'text', placeholder: '例如：山野遗孤' },
  { key: 'description', label: '出身描述', type: 'textarea', placeholder: '描述此出身的背景故事...' },
  { key: 'talent_cost', label: '消耗天道点', type: 'text', placeholder: '例如：0' },
] as const

// 为自定义出身数据定义类型
type CustomOriginData = {
  name: string;
  description: string;
  talent_cost: string;
};

function validateCustomOrigin(data: Partial<CustomOriginData>) {
    const errors: Record<string, string> = {};
    if (!data.name?.trim()) errors.name = '出身名称不可为空';
    const cost = Number(data.talent_cost);
    if (isNaN(cost) || cost < 0) errors.talent_cost = '消耗点数必须为非负数';
    return {
        valid: Object.keys(errors).length === 0,
        errors: Object.values(errors),
    };
}

async function handleCustomSubmit(data: CustomOriginData) {
  const newOrigin: Origin = {
    id: Date.now(),
    name: data.name,
    description: data.description || '',
    talent_cost: parseInt(data.talent_cost, 10) || 0,
    attribute_modifiers: {},
    rarity: 1,
  }

  try {
    store.addOrigin(newOrigin);
    // await saveGameData(store.creationData); // NOTE: 持久化由Pinia插件自动处理
    handleSelectOrigin(newOrigin);
    isCustomModalVisible.value = false;
    toast.success(`自定义出身 "${newOrigin.name}" 已保存！`);
  } catch (e) {
    console.error('保存自定义出身失败:', e);
    toast.error('保存自定义出身失败！');
  }
}

async function _handleLocalAIGenerate() {
  if (!store.selectedWorld) {
    toast.error('请先择一方大千世界，方可推演出身。');
    return;
  }
  const toastId = 'ai-generate-origin';
  toast.loading('天机推演中，请稍候...', { id: toastId });
  try {
    const newOrigin = await generateOrigin()
    if (newOrigin) {
      store.addOrigin(newOrigin);
      handleSelectOrigin(newOrigin);
      toast.success(`AI推演出身 "${newOrigin.name}" 已保存！`, { id: toastId });
    } else {
      // 如果 newOrigin 为 null，也需要隐藏加载提示
      toast.error('AI未能成功推演出身，请稍后再试。', { id: toastId });
    }
  } catch (e: unknown) {
    console.error("AI出身推演时发生意外错误:", e);
    // Error handled in tavernAI, just dismiss loading
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

const canSelect = (origin: Origin): boolean => {
  // If it's already selected, we can always deselect it
  if (store.characterPayload.origin_id === origin.id) {
    return true;
  }
  const currentCost = store.selectedOrigin?.talent_cost ?? 0;
  const availablePoints = store.remainingTalentPoints + currentCost;
  return availablePoints >= origin.talent_cost;
}

function handleSelectOrigin(origin: Origin) {
  if (!canSelect(origin)) {
    toast.warning('天道点不足，无法选择此出身。')
    return
  }
  // Toggle selection
  const newOriginId = store.characterPayload.origin_id === origin.id ? null : origin.id;
  store.selectOrigin(newOriginId);
}

function handleSelectRandom() {
 store.selectOrigin(null);
}

const isRandomSelected = computed(() => store.characterPayload.origin_id === null);

const selectedDisplayName = computed(() => {
 if (isRandomSelected.value) return '随机出身'
 return store.selectedOrigin?.name || ''
});

const selectedDescription = computed(() => {
 if (isRandomSelected.value)
   return '天道无常，造化弄人。选择此项，你的出身将完全随机生成。是生于帝王之家，或为山野遗孤，皆在天道一念之间。'
 return store.selectedOrigin?.description || '身世如谜，过往一片空白。'
});

const selectedCost = computed(() => {
 if (isRandomSelected.value) return 0
 return store.selectedOrigin?.talent_cost || 0
});

// New computed properties for hover display
const activeDisplayName = computed(() => {
 if (activeOrigin.value === 'random') return '随机出身'
 if (activeOrigin.value && typeof activeOrigin.value === 'object') return activeOrigin.value.name
 return ''
});

const activeDescription = computed(() => {
 if (activeOrigin.value === 'random')
   return '天道无常，造化弄人。选择此项，你的出身将完全随机生成。是生于帝王之家，或为山野遗孤，皆在天道一念之间。'
 if (activeOrigin.value && typeof activeOrigin.value === 'object') return activeOrigin.value.description || '身世如谜，过往一片空白。'
 return '身世如谜，过往一片空白。'
});

const activeCost = computed(() => {
 if (activeOrigin.value === 'random') return 0
 if (activeOrigin.value && typeof activeOrigin.value === 'object') return activeOrigin.value.talent_cost || 0
 return 0
});

// fetchData 和 defineExpose 不再需要
</script>

<style scoped>
.origin-selection-container {
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

.origin-layout {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
  height: 100%;
  overflow: hidden;
}

.origin-left-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-surface);
}

.origin-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.origin-list-container::-webkit-scrollbar { width: 8px; }
.origin-list-container::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); border-radius: 4px; }
.origin-list-container::-webkit-scrollbar-thumb { background: rgba(var(--color-primary-rgb), 0.3); border-radius: 4px; }
.origin-list-container::-webkit-scrollbar-thumb:hover { background: rgba(var(--color-primary-rgb), 0.5); }

.origin-item {
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

.origin-item:hover {
  background: var(--color-surface-light);
}

.origin-item.selected {
  background: rgba(var(--color-primary-rgb), 0.2);
  color: var(--color-primary);
  font-weight: 600;
  border-left: 3px solid var(--color-primary);
}

.origin-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: transparent;
  color: var(--color-text-disabled);
}
.origin-item.disabled:hover {
  background: var(--color-surface-danger);
}

.origin-name {
  font-weight: 500;
}

.origin-cost {
  color: var(--color-accent);
}

.divider {
 height: 1px;
 background: linear-gradient(to right, transparent, rgba(var(--color-primary-rgb), 0.2), transparent);
 margin: 0.5rem 0;
}

.single-actions-container {
  border-top: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem;
  display: flex;
  flex-wrap: wrap;
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

.origin-details-container {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1.5rem;
  background: var(--color-surface);
}

.origin-details {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.origin-details h2 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--color-primary);
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
.description-scroll::-webkit-scrollbar-thumb { background: rgba(var(--color-primary-rgb), 0.3); border-radius: 4px; }
.description-scroll::-webkit-scrollbar-thumb:hover { background: rgba(var(--color-primary-rgb), 0.5); }

.cost-display {
  text-align: right;
  font-weight: bold;
  color: var(--color-accent);
  flex-shrink: 0;
}

/* 响应式适配 - 手机端优化 */
@media (max-width: 1200px) {
  .origin-layout {
    grid-template-columns: 1fr 1.8fr;
    gap: 1.5rem;
  }
}

@media (max-width: 1024px) {
  .origin-layout {
    grid-template-columns: 1fr 1.5fr;
    gap: 1.2rem;
  }
  
  .origin-details h2 {
    font-size: 1.6rem;
  }
}

@media (max-width: 640px) {
  .origin-layout {
    /* 改为垂直堆叠布局 */
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    gap: 1rem;
    height: auto;
    overflow: visible;
    padding: 0.8rem;
  }
  
  .origin-left-panel {
    order: 1;
    max-height: 40vh;
  }
  
  .origin-details-container {
    order: 2;
    min-height: 300px;
  }
  
  .origin-list-container {
    max-height: 35vh;
    /* 添加触摸滚动优化 */
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }
  
  /* 优化触摸体验 */
  .origin-item,
  .action-item {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
}

@media (max-width: 640px) {
  .origin-layout {
    gap: 0.8rem;
    padding: 0.6rem;
  }
  
  .origin-left-panel {
    max-height: 35vh;
  }
  
  .origin-list-container {
    max-height: 30vh;
    padding: 0.5rem;
  }
  
  .origin-item {
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
  
  .origin-details-container {
    padding: 1.2rem;
    min-height: 250px;
  }
  
  .origin-details h2 {
    font-size: 1.4rem;
    margin-bottom: 0.8rem;
  }
}

@media (max-width: 480px) {
  .origin-selection-container {
    padding: 0.4rem;
    height: 100vh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .origin-layout {
    gap: 0.6rem;
    padding: 0;
    height: auto;
    min-height: calc(100vh - 2rem);
  }
  
  .origin-left-panel {
    max-height: 30vh;
    border-radius: 6px;
  }
  
  .origin-list-container {
    max-height: 26vh;
    padding: 0.4rem;
  }
  
  .origin-item {
    padding: 0.6rem 0.8rem;
    font-size: 0.9rem;
    margin-bottom: 0.3rem;
    border-radius: 4px;
  }
  
  .origin-name {
    font-size: 0.9rem;
  }
  
  .origin-cost {
    font-size: 0.8rem;
  }
  
  .divider {
    margin: 0.3rem 0;
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
  
  .origin-details-container {
    padding: 1rem;
    min-height: 200px;
    border-radius: 6px;
  }
  
  .origin-details h2 {
    font-size: 1.3rem;
    margin-bottom: 0.6rem;
  }
  
  .description-scroll {
    font-size: 0.9rem;
    line-height: 1.5;
    padding-right: 0.3rem;
    margin-bottom: 0.8rem;
  }
  
  .cost-display {
    font-size: 1rem;
    text-align: center;
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
  .origin-selection-container {
    padding: 0.3rem;
  }
  
  .origin-layout {
    gap: 0.4rem;
  }
  
  .origin-left-panel {
    max-height: 28vh;
  }
  
  .origin-list-container {
    max-height: 24vh;
    padding: 0.3rem;
  }
  
  .origin-item {
    padding: 0.5rem 0.6rem;
    font-size: 0.85rem;
    margin-bottom: 0.2rem;
  }
  
  .origin-name {
    font-size: 0.8rem;
  }
  
  .origin-cost {
    font-size: 0.75rem;
  }
  
  .origin-details-container {
    padding: 0.8rem;
    min-height: 180px;
  }
  
  .origin-details h2 {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }
  
  .description-scroll {
    font-size: 0.85rem;
    line-height: 1.4;
    margin-bottom: 0.6rem;
  }
  
  .cost-display {
    font-size: 0.9rem;
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