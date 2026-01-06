<template>
  <div class="origin-selection-container">
    <div v-if="store.isLoading" class="loading-state">{{ $t('追溯过往，探寻出身...') }}</div>
    <div v-else-if="store.error" class="error-state">{{ $t('因果不明') }}：{{ store.error }}</div>

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
            <span class="action-name">{{ $t('自定义出身') }}</span>
          </button>
          <button @click="handleAIGenerate" class="action-item shimmer-on-hover">
            <span class="action-name">{{ $t('AI推演') }}</span>
          </button>
        </div>

        <div class="origin-list-container">
          <div
           class="origin-item"
           :class="{ selected: isRandomSelected }"
           @click="handleSelectRandom"
           @mouseover="activeOrigin = 'random'"
          >
           <span class="origin-name">{{ $t('随机出身') }}</span>
           <span class="origin-cost">{{ $t('0 点') }}</span>
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
              <span class="origin-cost">{{ origin.talent_cost }} {{ $t('点') }}</span>
            </div>
            <div v-if="origin.source === 'cloud'" class="action-buttons">
              <button @click.stop="openEditModal(origin)" class="edit-btn" :title="$t('编辑此项')">
                <Edit :size="14" />
              </button>
              <button @click.stop="handleDeleteOrigin(origin.id)" class="delete-btn" :title="$t('删除此项')">
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
          <div class="cost-display">{{ $t('消耗天道点: {0}').replace('{0}', String(activeCost)) }}</div>
        </div>
        <div v-else class="placeholder">{{ $t('请选择一处出身，或听天由命。') }}</div>
      </div>
    </div>

    <CustomCreationModal
      :visible="isCustomModalVisible"
      :title="$t('自定义出身')"
      :fields="customOriginFields"
      :validationFn="validateCustomOrigin"
      @close="isCustomModalVisible = false"
      @submit="handleCustomSubmit"
    />

    <!-- 编辑模态框 -->
    <CustomCreationModal
      :visible="isEditModalVisible"
      :title="$t('编辑出身')"
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
import { ORIGIN_ITEM_GENERATION_PROMPT } from '../../utils/prompts/tasks/gameElementPrompts'
import { parseJsonFromText } from '@/utils/jsonExtract'

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


// 自定义出身字段 - 重新设计为背景设定
// 根据 types/index.ts 中的 Origin 接口定义字段
const customOriginFields: ModalField[] = [
  { key: 'name', label: '出身名称', type: 'text', placeholder: '例如：山野遗孤' },
  { key: 'description', label: '出身描述', type: 'textarea', placeholder: '描述此出身的背景故事和成长经历...' },
  { key: 'talent_cost', label: '天道点消耗', type: 'number', placeholder: '选择此出身需要消耗的天道点，可为负数表示奖励' },
  { key: 'rarity', label: '稀有度', type: 'number', placeholder: '1-10，数值越高越稀有' },
  {
    key: 'attribute_modifiers',
    label: '属性修正',
    type: 'dynamic-list',
    columns: [
      {
        key: 'attribute',
        placeholder: '属性名称',
        type: 'select',
        options: [
          { value: '根骨', label: '根骨' },
          { value: '灵性', label: '灵性' },
          { value: '悟性', label: '悟性' },
          { value: '气运', label: '气运' },
          { value: '魅力', label: '魅力' },
          { value: '心性', label: '心性' }
        ]
      },
      { key: 'value', placeholder: '修正值（可为负数）', type: 'text' }
    ]
  },
  {
    key: 'background_effects',
    label: '背景效果',
    type: 'dynamic-list',
    columns: [
      { key: 'type', placeholder: '效果类型（如：技能、资源、关系）' },
      { key: 'description', placeholder: '效果描述' }
    ]
  }
] as const

// 为自定义出身数据定义完整类型
type CustomOriginData = {
  name: string;
  description: string;
  talent_cost: string | number;
  rarity: string | number;
  attribute_modifiers: Array<{ attribute: string; value: string }>;
  background_effects: Array<{ type: string; description: string }>;
};

function validateCustomOrigin(data: Partial<CustomOriginData>) {
    const errors: Record<string, string> = {};

    // 必填字段验证
    if (!data.name?.trim()) errors.name = '出身名称不可为空';
    if (!data.description?.trim()) errors.description = '出身描述不可为空';

    // 数值字段验证
    const talentCost = Number(data.talent_cost);
    if (data.talent_cost !== undefined && data.talent_cost !== '' && isNaN(talentCost)) {
      errors.talent_cost = '天道点消耗必须是数字';
    }

    const rarity = Number(data.rarity);
    if (data.rarity !== undefined && data.rarity !== '' && (isNaN(rarity) || rarity < 1 || rarity > 10)) {
      errors.rarity = '稀有度必须在1-10之间';
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors: Object.values(errors),
    };
}

async function handleCustomSubmit(data: CustomOriginData) {
  // 处理属性修正：将数组转换为对象格式
  const attributeModifiers: Record<string, number> = {};
  if (Array.isArray(data.attribute_modifiers)) {
    data.attribute_modifiers.forEach(mod => {
      if (mod.attribute && mod.value) {
        attributeModifiers[mod.attribute] = Number(mod.value) || 0;
      }
    });
  }

  // 处理背景效果
  const backgroundEffects = Array.isArray(data.background_effects)
    ? data.background_effects.filter(effect => effect.type && effect.description)
    : [];

  // 创建完整的标准化出身对象
  const newOrigin: Origin = {
    id: Date.now(),
    name: data.name,
    description: data.description,
    talent_cost: Number(data.talent_cost) || 0,
    attribute_modifiers: attributeModifiers,
    background_effects: backgroundEffects,
    rarity: Number(data.rarity) || 1,
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
      parsedOrigin = parseJsonFromText(aiResponse);
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

  // 处理属性修正
  const attributeModifiers: Record<string, number> = {};
  if (Array.isArray(data.attribute_modifiers)) {
    data.attribute_modifiers.forEach(mod => {
      if (mod.attribute && mod.value) {
        attributeModifiers[mod.attribute] = Number(mod.value) || 0;
      }
    });
  }

  // 处理背景效果
  const backgroundEffects = Array.isArray(data.background_effects)
    ? data.background_effects.filter(effect => effect.type && effect.description)
    : [];

  // 创建更新数据对象
  const updateData: Partial<Origin> = {
    name: data.name,
    description: data.description,
    talent_cost: Number(data.talent_cost) || 0,
    rarity: Number(data.rarity) || 1,
    attribute_modifiers: attributeModifiers,
    background_effects: backgroundEffects
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

  // 转换属性修正对象为数组格式
  const attributeModifiers = editingOrigin.value.attribute_modifiers
    ? Object.entries(editingOrigin.value.attribute_modifiers).map(([attribute, value]) => ({
        attribute,
        value: String(value)
      }))
    : [];

  return {
    name: editingOrigin.value.name,
    description: editingOrigin.value.description,
    talent_cost: editingOrigin.value.talent_cost.toString(),
    rarity: editingOrigin.value.rarity.toString(),
    attribute_modifiers: attributeModifiers,
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
/* ========== 深色玻璃拟态风格 ========== */
.origin-selection-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.loading-state, .error-state, .placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 1.1rem;
  color: #94a3b8;
  font-style: italic;
}

.origin-layout {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1.5rem;
  height: 100%;
  overflow: hidden;
}

/* ========== 左侧面板 ========== */
.origin-left-panel {
  display: flex;
  flex-direction: column;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  overflow: hidden;
}

.origin-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(147, 197, 253, 0.3) transparent;
}

.origin-list-container::-webkit-scrollbar { width: 6px; }
.origin-list-container::-webkit-scrollbar-track { background: transparent; }
.origin-list-container::-webkit-scrollbar-thumb { background: rgba(147, 197, 253, 0.3); border-radius: 3px; }
.origin-list-container::-webkit-scrollbar-thumb:hover { background: rgba(147, 197, 253, 0.5); }

/* ========== 选项卡样式 ========== */
.origin-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.9rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
  border: 1px solid transparent;
  background: rgba(30, 41, 59, 0.4);
}

.origin-item:hover {
  background: rgba(51, 65, 85, 0.6);
  border-color: rgba(147, 197, 253, 0.2);
}

.origin-item.selected {
  background: rgba(30, 58, 138, 0.4);
  border-color: rgba(147, 197, 253, 0.4);
  box-shadow: 0 0 0 1px rgba(147, 197, 253, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.origin-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.origin-item.disabled:hover {
  background: rgba(30, 41, 59, 0.4);
  border-color: transparent;
}

.item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-grow: 1;
}

.origin-name {
  font-weight: 500;
  color: #f1f5f9;
}

.origin-item.selected .origin-name {
  color: #bfdbfe;
}

.origin-cost {
  color: #fbbf24;
  font-size: 0.85rem;
  font-weight: 500;
}

/* 按钮组容器 */
.action-buttons {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
  margin-left: 0.5rem;
}

.origin-item:hover .action-buttons {
  opacity: 1;
}

.edit-btn, .delete-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.35rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.edit-btn:hover {
  color: #93c5fd;
  background: rgba(147, 197, 253, 0.1);
}

.delete-btn:hover {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
}

.divider {
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(147, 197, 253, 0.2), transparent);
  margin: 0.5rem 0;
}

.action-name {
  font-weight: 500;
}

/* ========== 右侧详情面板 ========== */
.origin-details-container {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.origin-details {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.origin-details h2 {
  margin: 0 0 1rem 0;
  color: #93c5fd;
  flex-shrink: 0;
  font-size: 1.5rem;
  text-shadow: 0 0 20px rgba(147, 197, 253, 0.3);
}

.description-scroll {
  flex: 1;
  overflow-y: auto;
  line-height: 1.7;
  margin-bottom: 1rem;
  padding-right: 0.5rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(147, 197, 253, 0.3) transparent;
}

.description-scroll::-webkit-scrollbar { width: 6px; }
.description-scroll::-webkit-scrollbar-track { background: transparent; }
.description-scroll::-webkit-scrollbar-thumb { background: rgba(147, 197, 253, 0.3); border-radius: 3px; }

.description-scroll p {
  margin: 0;
  white-space: pre-wrap;
  color: #94a3b8;
}

.cost-display {
  text-align: right;
  font-weight: 600;
  color: #fbbf24;
  flex-shrink: 0;
}

/* ========== 亮色主题适配 ========== */
[data-theme="light"] .origin-left-panel,
[data-theme="light"] .origin-details-container {
  background: rgba(248, 250, 252, 0.8);
  border-color: rgba(0, 0, 0, 0.08);
}

[data-theme="light"] .origin-item {
  background: rgba(255, 255, 255, 0.6);
}

[data-theme="light"] .origin-item:hover {
  background: rgba(241, 245, 249, 0.95);
  border-color: rgba(59, 130, 246, 0.2);
}

[data-theme="light"] .origin-item.selected {
  background: rgba(219, 234, 254, 0.8);
  border-color: rgba(59, 130, 246, 0.4);
}

[data-theme="light"] .origin-name {
  color: #1e293b;
}

[data-theme="light"] .origin-item.selected .origin-name {
  color: #1e40af;
}

[data-theme="light"] .origin-details h2 {
  color: #2563eb;
}

[data-theme="light"] .description-scroll p {
  color: #475569;
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

/* 顶部功能按钮 - 深色玻璃拟态风格 */
.top-actions-container {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid rgba(147, 197, 253, 0.15);
  background: rgba(30, 41, 59, 0.3);
  justify-content: flex-end;
}

.top-actions-container .action-item {
  padding: 0.5rem 1rem;
  border: 1px solid rgba(147, 197, 253, 0.3);
  border-radius: 6px;
  background: rgba(30, 41, 59, 0.6);
  color: #93c5fd;
  cursor: pointer;
  transition: all 0.25s ease;
  font-size: 0.9rem;
  white-space: nowrap;
}

.top-actions-container .action-item:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: #93c5fd;
  color: #bfdbfe;
}

/* 亮色主题顶部按钮 */
[data-theme="light"] .top-actions-container {
  background: rgba(241, 245, 249, 0.6);
  border-bottom-color: rgba(59, 130, 246, 0.15);
}

[data-theme="light"] .top-actions-container .action-item {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(59, 130, 246, 0.3);
  color: #2563eb;
}

[data-theme="light"] .top-actions-container .action-item:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
  color: #1e40af;
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
