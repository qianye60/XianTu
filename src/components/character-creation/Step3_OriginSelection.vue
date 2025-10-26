<template>
  <div class="origin-selection-container">
    <div v-if="store.isLoading" class="loading-state">追溯过往，探寻出身...</div>
    <div v-else-if="store.error" class="error-state">因果不明：{{ store.error }}</div>

    <div v-else class="origin-layout">
      <!-- 左侧栏：列表和操作按钮 -->
      <div class="origin-left-panel">
        <!-- 顶部功能按钮 -->
        <div class="top-actions-container">
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
            <div class="item-content">
              <span class="origin-name">{{ origin.name }}</span>
              <span class="origin-cost">{{ origin.talent_cost }} 点</span>
            </div>
            <div v-if="origin.source === 'cloud'" class="action-buttons">
              <button @click.stop="openEditModal(origin)" class="edit-btn" title="编辑此项">
                <Edit :size="14" />
              </button>
              <button @click.stop="handleDeleteOrigin(origin.id)" class="delete-btn" title="删除此项">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
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
    
    <!-- 编辑模态框 -->
    <CustomCreationModal
      :visible="isEditModalVisible"
      title="编辑出身"
      :fields="customOriginFields"
      :validationFn="validateCustomOrigin"
      :initialData="editInitialData"
      @close="isEditModalVisible = false; editingOrigin = null"
      @submit="handleEditSubmit"
    />
    <!-- AI推演输入弹窗 -->
    <AIPromptModal
      :visible="isAIPromptModalVisible"
      @close="isAIPromptModalVisible = false"
      @submit="handleAIPromptSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Trash2, Edit } from 'lucide-vue-next'
import { useCharacterCreationStore } from '../../stores/characterCreationStore'
import type { Origin } from '../../types'
import CustomCreationModal, { type ModalField } from './CustomCreationModal.vue'
import AIPromptModal from './AIPromptModal.vue'
import { toast } from '../../utils/toast'
import { generateWithRawPrompt } from '../../utils/tavernCore'
import { ORIGIN_ITEM_GENERATION_PROMPT } from '../../utils/prompts/gameElementPrompts'

const emit = defineEmits(['ai-generate'])
const store = useCharacterCreationStore()
const activeOrigin = ref<Origin | 'random' | null>(null) // For hover details view - 仿照天赋选择
const isCustomModalVisible = ref(false)
const isEditModalVisible = ref(false)
const isAIPromptModalVisible = ref(false)
const editingOrigin = ref<Origin | null>(null)

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

// 先天属性选项 - 出身影响的是先天属性
const attributeOptions = [
  { value: 'root_bone', label: '先天根骨' },
  { value: 'spirit', label: '先天灵性' },
  { value: 'comprehension', label: '先天悟性' },
  { value: 'luck', label: '先天气运' },
  { value: 'charm', label: '先天魅力' },
  { value: 'temperament', label: '先天心性' }
] as const

// 调整数值选项
const modifierOptions = [
  { value: '-3', label: '-3' },
  { value: '-2', label: '-2' },
  { value: '-1', label: '-1' },
  { value: '0', label: '0' },
  { value: '1', label: '+1' },
  { value: '2', label: '+2' },
  { value: '3', label: '+3' },
  { value: '4', label: '+4' },
  { value: '5', label: '+5' }
] as const

// 出身背景效果类型
const originEffectTypes = [
  { value: '初始资源', label: '初始资源' },
  { value: '社会关系', label: '社会关系' },
  { value: '特殊身份', label: '特殊身份' },
  { value: '传承知识', label: '传承知识' },
  { value: '起始装备', label: '起始装备' }
] as const

// 自定义出身字段 - 重新设计为背景设定
const customOriginFields: ModalField[] = [
  { key: 'name', label: '出身名称', type: 'text', placeholder: '例如：山野遗孤' },
  { key: 'description', label: '出身描述', type: 'textarea', placeholder: '描述此出身的背景故事和成长经历...' }
] as const

// 为自定义出身数据定义完整类型
type CustomOriginData = {
  name: string;
  description: string;
};

function validateCustomOrigin(data: Partial<CustomOriginData>) {
    const errors: Record<string, string> = {};

    // 必填字段验证
    if (!data.name?.trim()) errors.name = '出身名称不可为空';
    if (!data.description?.trim()) errors.description = '出身描述不可为空';

    return {
        valid: Object.keys(errors).length === 0,
        errors: Object.values(errors),
    };
}

async function handleCustomSubmit(data: CustomOriginData) {
  // 创建完整的标准化出身对象
  const newOrigin: Origin = {
    id: Date.now(),
    name: data.name,
    description: data.description,
    talent_cost: 0,
    attribute_modifiers: {},
    background_effects: [],
    rarity: 1,
    source: 'local' as const,
  }

  try {
    store.addOrigin(newOrigin);
    handleSelectOrigin(newOrigin);
    isCustomModalVisible.value = false;
    toast.success(`自定义出身 "${newOrigin.name}" 已保存！`);
  } catch (e) {
    console.error('保存自定义出身失败:', e);
    toast.error('保存自定义出身失败！');
  }
}

function handleAIGenerate() {
  if (store.isLocalCreation) {
    if (!store.selectedWorld) {
      toast.error('请先选择一方大千世界，方可推演出身。');
      return;
    }
    isAIPromptModalVisible.value = true;
  } else {
    emit('ai-generate')
  }
}

async function handleAIPromptSubmit(userPrompt: string) {
  const toastId = 'ai-generate-origin';
  toast.loading('天机推演中，请稍候...', { id: toastId });

  try {
    const aiResponse = await generateWithRawPrompt(userPrompt, ORIGIN_ITEM_GENERATION_PROMPT, false);

    if (!aiResponse) {
      toast.error('AI推演失败', { id: toastId });
      return;
    }

    console.log('【AI推演-出身】完整响应:', aiResponse);

    // 解析AI返回的JSON
    let parsedOrigin: any;
    try {
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      parsedOrigin = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('【AI推演-出身】JSON解析失败:', parseError);
      toast.error('AI推演结果格式错误，无法解析', { id: toastId });
      return;
    }

    // 验证必需字段
    if (!parsedOrigin.name && !parsedOrigin.名称) {
      toast.error('AI推演结果缺少出身名称', { id: toastId });
      return;
    }

    // 解析天道点消耗（支持多种字段名）
    let talentCost = parsedOrigin.talent_cost || parsedOrigin.天道点消耗 || parsedOrigin.消耗天道点;

    // 如果AI没有提供天道点，给予警告并设置默认值
    if (talentCost === undefined || talentCost === null) {
      console.warn('【AI推演-出身】AI未返回天道点消耗字段，使用默认值3');
      toast.warning('AI未设置天道点消耗，已自动设为3点', { id: toastId, duration: 2000 });
      talentCost = 3; // 默认消耗3点，较为合理
    } else {
      // 确保是数字类型
      talentCost = Number(talentCost);
      if (isNaN(talentCost)) {
        console.warn('【AI推演-出身】天道点消耗不是有效数字，使用默认值3');
        talentCost = 3;
      }
    }

    // 创建出身对象
    const newOrigin: Origin = {
      id: Date.now(),
      name: parsedOrigin.name || parsedOrigin.名称 || '未命名出身',
      description: parsedOrigin.description || parsedOrigin.描述 || parsedOrigin.说明 || '',
      talent_cost: talentCost,
      attribute_modifiers: parsedOrigin.attribute_modifiers || parsedOrigin.属性修正 || {},
      background_effects: parsedOrigin.background_effects || parsedOrigin.背景效果 || [],
      rarity: parsedOrigin.rarity || parsedOrigin.稀有度 || 1,
      source: 'local'
    };

    // 保存并选择出身
    store.addOrigin(newOrigin);
    handleSelectOrigin(newOrigin);
    isAIPromptModalVisible.value = false;

    toast.success(`AI推演完成！出身 "${newOrigin.name}" 已生成`, { id: toastId });

  } catch (e: any) {
    console.error('【AI推演-出身】失败:', e);
    toast.error(`AI推演失败: ${e.message}`, { id: toastId });
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

// 编辑功能
function openEditModal(origin: Origin) {
  editingOrigin.value = origin;
  isEditModalVisible.value = true;
}

// 删除功能
async function handleDeleteOrigin(id: number) {
  try {
    await store.removeOrigin(id);
    console.log(`【出身选择】成功删除出身 ID: ${id}`);
  } catch (error) {
    console.error(`【出身选择】删除出身失败 ID: ${id}`, error);
  }
}

async function handleEditSubmit(data: CustomOriginData) {
  if (!editingOrigin.value) return;

  // 创建更新数据对象
  const updateData: Partial<Origin> = {
    name: data.name,
    description: data.description
  };

  try {
    const success = store.updateOrigin(editingOrigin.value.id, updateData);
    if (success) {
      isEditModalVisible.value = false;
      editingOrigin.value = null;
      toast.success(`出身 "${updateData.name}" 已更新！`);
    } else {
      toast.error('更新出身失败！');
    }
  } catch (e) {
    console.error('更新出身失败:', e);
    toast.error('更新出身失败！');
  }
}

// 编辑模态框的初始数据
const editInitialData = computed(() => {
  if (!editingOrigin.value) return {};
  
  return {
    name: editingOrigin.value.name,
    description: editingOrigin.value.description,
    talent_cost: editingOrigin.value.talent_cost.toString(),
    rarity: editingOrigin.value.rarity.toString(),
    background_effects: editingOrigin.value.background_effects || []
  };
});

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

.item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-grow: 1;
}

/* 按钮组容器 */
.action-buttons {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  opacity: 0;
  transition: opacity 0.2s;
  margin-left: 0.5rem;
}

.origin-item:hover .action-buttons {
  opacity: 1;
}

/* 编辑按钮 */
.edit-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.3rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s, color 0.2s, background-color 0.2s;
}

.edit-btn:hover {
  color: var(--color-primary);
  background-color: rgba(59, 130, 246, 0.1);
}

.delete-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.3rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s, color 0.2s, background-color 0.2s;
}

/* 移除原有的删除按钮hover逻辑，因为现在按钮组统一管理 */
.delete-btn:hover {
  color: var(--color-danger);
  background-color: rgba(255, 0, 0, 0.1);
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
  .top-actions-container {
    flex-wrap: wrap;
    justify-content: stretch;
  }
  .top-actions-container .action-item {
    flex-grow: 1;
    text-align: center;
  }
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
  .top-actions-container {
    flex-direction: column;
    align-items: stretch;
  }
  .origin-selection-container {
    padding: 0.4rem;
    height: auto;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .origin-layout {
    gap: 0.6rem;
    padding: 0;
    height: auto;
    min-height: 0;
  }

  .origin-left-panel {
    max-height: none;
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

  .top-actions-container {
    flex-direction: column;
    align-items: stretch;
    padding: 0.5rem;
  }
  .top-actions-container .action-item {
    text-align: center;
  }
}

/* 顶部功能按钮 */
.top-actions-container {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.1);
  justify-content: flex-end;
}

.top-actions-container .action-item {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface-light);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  white-space: nowrap;
}

.top-actions-container .action-item:hover {
  background: var(--color-surface-lighter);
  border-color: var(--color-primary);
  color: var(--color-primary);
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