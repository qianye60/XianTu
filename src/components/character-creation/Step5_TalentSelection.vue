<template>
  <div class="talent-selection-container">
    <div v-if="store.isLoading" class="loading-state">{{ $t('于时光长河中搜寻天赋...') }}</div>
    <div v-else-if="store.error" class="error-state">{{ $t('天机紊乱') }}：{{ store.error }}</div>

    <div v-else class="talent-layout">
      <!-- 左侧面板：列表和操作按钮 -->
      <div class="talent-left-panel">
        <!-- 顶部功能按钮 -->
        <div class="top-actions-container">
          <button
            v-if="store.isLocalCreation"
            @click="isCustomModalVisible = true"
            class="action-item shimmer-on-hover"
          >
            <span class="action-name">{{ $t('自定义天赋') }}</span>
          </button>
          <button @click="handleAIGenerate" class="action-item shimmer-on-hover">
            <span class="action-name">{{ $t('AI推演') }}</span>
          </button>
        </div>

        <div class="talent-list-container">
          <div
            v-for="talent in filteredTalents"
            :key="talent.id"
            class="talent-item"
            :class="{
              selected: isSelected(talent),
            }"
            @click="handleToggleTalent(talent)"
            @mouseover="activeTalent = talent"
          >
            <div class="item-content">
              <span class="talent-name">{{ talent.name }}</span>
              <span class="talent-cost">{{ talent.talent_cost || 0 }}{{ $t('点') }}</span>
            </div>
            <div v-if="talent.source === 'cloud' || talent.source === 'local'" class="action-buttons">
              <button @click.stop="openEditModal(talent)" class="edit-btn" :title="$t('编辑此项')">
                <Edit :size="14" />
              </button>
              <button @click.stop="handleDeleteTalent(talent.id)" class="delete-btn" :title="$t('删除此项')">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="talent-details-container">
        <div v-if="activeTalent" class="talent-details">
          <h2>{{ activeTalent.name }}</h2>
          <div class="description-scroll">
            <p>{{ activeTalent.description || $t('此天赋之玄妙，需自行领悟。') }}</p>
          </div>
        </div>
        <div v-else class="placeholder">{{ $t('请选择天赋。') }}</div>
      </div>
    </div>

    <CustomCreationModal
      :visible="isCustomModalVisible"
      :title="$t('自定义天赋')"
      :fields="customTalentFields"
      :validationFn="validateCustomTalent"
      @close="isCustomModalVisible = false"
      @submit="handleCustomSubmit"
    />

    <!-- 编辑模态框 -->
    <CustomCreationModal
      :visible="isEditModalVisible"
      :title="$t('编辑天赋')"
      :fields="customTalentFields"
      :validationFn="validateCustomTalent"
      :initialData="editInitialData"
      @close="isEditModalVisible = false; editingTalent = null"
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
import type { Talent } from '../../types'
import CustomCreationModal, { type ModalField } from './CustomCreationModal.vue'
import AIPromptModal from './AIPromptModal.vue'
import { toast } from '../../utils/toast'
import { generateWithRawPrompt } from '../../utils/tavernCore'
import { TALENT_ITEM_GENERATION_PROMPT } from '../../utils/prompts/tasks/gameElementPrompts'
import { parseJsonFromText } from '@/utils/jsonExtract'

const emit = defineEmits(['ai-generate'])
const store = useCharacterCreationStore()
const activeTalent = ref<Talent | null>(null) // For details view on hover/click
const isCustomModalVisible = ref(false)
const isEditModalVisible = ref(false)
const isAIPromptModalVisible = ref(false)
const editingTalent = ref<Talent | null>(null)

const filteredTalents = computed(() => {
  const allTalents = store.creationData.talents;
  console.log("【天赋选择】所有天赋数据:", allTalents.length, "个");
  console.log("【天赋选择】当前模式:", store.isLocalCreation ? '本地' : '联机');
  
  if (store.isLocalCreation) {
    // 单机模式显示本地数据和云端同步的数据
    const availableTalents = allTalents.filter(talent => 
      talent.source === 'local' || talent.source === 'cloud'
    );
    console.log("【天赋选择】单机模式可用天赋数量:", availableTalents.length);
    return availableTalents;
  } else {
    // 联机模式显示所有数据，包括本地数据作为后备
    const availableTalents = allTalents.length > 0 ? allTalents : [];
    console.log("【天赋选择】联机模式天赋数量:", availableTalents.length);
    
    if (availableTalents.length === 0) {
      console.warn("【天赋选择】警告：联机模式下没有找到任何天赋数据！");
    }
    
    return availableTalents;
  }
});

// 自定义天赋字段 - 支持简单描述和结构化格式
// 根据 types/index.ts 中的 Talent 接口定义字段
const customTalentFields: ModalField[] = [
  { key: 'name', label: '天赋名称', type: 'text', placeholder: '例如：道心天成' },
  { key: 'description', label: '天赋描述', type: 'textarea', placeholder: '描述此天赋的本质...' },
  { key: 'talent_cost', label: '天道点消耗', type: 'number', placeholder: '例如：3' },
  { key: 'rarity', label: '稀有度', type: 'number', placeholder: '1-10，数值越高越稀有' },
  {
    key: 'effects',
    label: '天赋效果',
    type: 'dynamic-list',
    columns: [
      {
        key: '类型',
        placeholder: '效果类型',
        type: 'select',
        options: [
          { value: '属性加成', label: '属性加成' },
          { value: '技能解锁', label: '技能解锁' },
          { value: '特殊能力', label: '特殊能力' },
          { value: '修炼加成', label: '修炼加成' }
        ]
      },
      { key: '目标', placeholder: '目标（如：根骨、悟性）' },
      { key: '数值', placeholder: '数值（如：+2、+10%）' }
    ]
  }
]

// 自定义天赋数据类型 - 与标准数据格式保持一致
type CustomTalentData = {
  name: string;
  description: string;
  talent_cost: number | string;
  rarity: number | string;
  effects: Array<{
    类型: string;
    目标?: string;
    数值: number | string;
  }>;
};

function validateCustomTalent(data: Partial<CustomTalentData>) {
    const errors: Record<string, string> = {};

    // 必填字段验证
    if (!data.name?.trim()) errors.name = '天赋名称不可为空';
    if (!data.description?.trim()) errors.description = '天赋描述不可为空';

    // 数值字段验证
    const talentCost = Number(data.talent_cost);
    if (data.talent_cost === undefined || data.talent_cost === null || data.talent_cost === '' || isNaN(talentCost)) {
        errors.talent_cost = '天道点消耗必须填写';
    } else if (talentCost < 0) {
        errors.talent_cost = '天道点消耗不能为负数';
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

async function handleCustomSubmit(data: CustomTalentData) {
  // 处理天赋效果数组
  const effects = Array.isArray(data.effects)
    ? data.effects
        .filter(effect => effect.类型 && effect.数值)
        .map(effect => ({
          类型: effect.类型,
          目标: effect.目标 || undefined,
          数值: Number(effect.数值) || 0
        }))
    : [];

  // 创建完整的天赋对象
  const newTalent: Talent = {
    id: Date.now(),
    name: data.name,
    description: data.description,
    talent_cost: Number(data.talent_cost) || 0,
    rarity: Number(data.rarity) || 1,
    effects: effects.length > 0 ? effects : undefined,
    source: 'local' as const,
  }

  try {
    store.addTalent(newTalent);
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

function handleToggleTalent(talent: Talent) {
  activeTalent.value = talent;
  store.toggleTalent(talent.id);
}

function handleAIGenerate() {
  if (store.isLocalCreation) {
    // 打开AI推演输入弹窗
    isAIPromptModalVisible.value = true;
  } else {
    emit('ai-generate');
  }
}

async function handleAIPromptSubmit(userPrompt: string) {
  const toastId = 'ai-generate-talent';
  toast.loading('天机推演中，请稍候...', { id: toastId });

  try {
    const aiResponse = await generateWithRawPrompt(userPrompt, TALENT_ITEM_GENERATION_PROMPT, false);

    if (!aiResponse) {
      toast.error('AI推演失败', { id: toastId });
      return;
    }

    console.log('【AI推演-天赋】完整响应:', aiResponse);

    // 解析AI返回的JSON
    let parsedTalent: any;
    try {
      parsedTalent = parseJsonFromText(aiResponse);
    } catch (parseError) {
      console.error('【AI推演-天赋】JSON解析失败:', parseError);
      toast.error('AI推演结果格式错误，无法解析', { id: toastId });
      return;
    }

    // 验证必需字段
    if (!parsedTalent.name && !parsedTalent.名称) {
      toast.error('AI推演结果缺少天赋名称', { id: toastId });
      return;
    }

    // 创建天赋对象
    const newTalent: Talent = {
      id: Date.now(),
      name: parsedTalent.name || parsedTalent.名称 || '未命名天赋',
      description: parsedTalent.description || parsedTalent.描述 || parsedTalent.说明 || '',
      talent_cost: parsedTalent.talent_cost || parsedTalent.点数消耗 || 1,
      rarity: parsedTalent.rarity || parsedTalent.稀有度 || 1,
      source: 'local'
    };

    // 保存并选择天赋
    store.addTalent(newTalent);
    handleToggleTalent(newTalent);
    isAIPromptModalVisible.value = false;

    toast.success(`AI推演完成！天赋 "${newTalent.name}" 已生成`, { id: toastId });

  } catch (e: any) {
    console.error('【AI推演-天赋】失败:', e);
    toast.error(`AI推演失败: ${e.message}`, { id: toastId });
  }
}

// 编辑功能
function openEditModal(talent: Talent) {
  editingTalent.value = talent;
  isEditModalVisible.value = true;
}

// 删除功能
async function handleDeleteTalent(id: number) {
  try {
    await store.removeTalent(id);
    console.log(`【天赋选择】成功删除天赋 ID: ${id}`);
  } catch (error) {
    console.error(`【天赋选择】删除天赋失败 ID: ${id}`, error);
  }
}

async function handleEditSubmit(data: CustomTalentData) {
  if (!editingTalent.value) return;

  // 处理天赋效果数组
  const effects = Array.isArray(data.effects)
    ? data.effects
        .filter(effect => effect.类型 && effect.数值)
        .map(effect => ({
          类型: effect.类型,
          目标: effect.目标 || undefined,
          数值: Number(effect.数值) || 0
        }))
    : [];

  // 创建更新数据对象
  const updateData: Partial<Talent> = {
    name: data.name,
    description: data.description,
    talent_cost: Number(data.talent_cost) || 0,
    rarity: Number(data.rarity) || 1,
    effects: effects.length > 0 ? effects : undefined
  };

  try {
    const success = store.updateTalent(editingTalent.value.id, updateData);
    if (success) {
      isEditModalVisible.value = false;
      editingTalent.value = null;
      toast.success(`天赋 "${updateData.name}" 已更新！`);
    } else {
      toast.error('更新天赋失败！');
    }
  } catch (e) {
    console.error('更新天赋失败:', e);
    toast.error('更新天赋失败！');
  }
}

// 编辑模态框的初始数据
const editInitialData = computed(() => {
  if (!editingTalent.value) return {};
  return {
    name: editingTalent.value.name,
    description: editingTalent.value.description,
    talent_cost: editingTalent.value.talent_cost || 0,
    rarity: editingTalent.value.rarity || 1,
    effects: editingTalent.value.effects || []
  };
});

// fetchData 和 defineExpose 不再需要
</script>

<style scoped>
.talent-selection-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ========== 深色玻璃拟态风格 ========== */
.loading-state, .error-state, .placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 1.1rem;
  color: #94a3b8;
  font-style: italic;
}

.talent-layout {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1.5rem;
  height: 100%;
  overflow: hidden;
}

/* ========== 左侧面板 ========== */
.talent-left-panel {
  display: flex;
  flex-direction: column;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  overflow: hidden;
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

.talent-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(147, 197, 253, 0.3) transparent;
}

.talent-list-container::-webkit-scrollbar { width: 6px; }
.talent-list-container::-webkit-scrollbar-track { background: transparent; }
.talent-list-container::-webkit-scrollbar-thumb { background: rgba(147, 197, 253, 0.3); border-radius: 3px; }
.talent-list-container::-webkit-scrollbar-thumb:hover { background: rgba(147, 197, 253, 0.5); }

/* ========== 选项卡样式 ========== */
.talent-item {
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

.item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-grow: 1;
  gap: 0.5rem;
}

.talent-cost {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  white-space: nowrap;
  flex-shrink: 0;
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

.talent-item:hover .action-buttons {
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

.talent-item:hover {
  background: rgba(51, 65, 85, 0.6);
  border-color: rgba(147, 197, 253, 0.2);
}

.talent-item.selected {
  background: rgba(30, 58, 138, 0.4);
  border-color: rgba(147, 197, 253, 0.4);
  box-shadow: 0 0 0 1px rgba(147, 197, 253, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.talent-name {
  font-weight: 500;
  color: #f1f5f9;
}

.talent-item.selected .talent-name {
  color: #bfdbfe;
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

/* ========== 右侧详情面板 ========== */
.talent-details-container {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.talent-details {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.talent-details h2 {
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

.description-scroll p {
  margin: 0;
  white-space: pre-wrap;
  color: #94a3b8;
}

.description-scroll::-webkit-scrollbar { width: 6px; }
.description-scroll::-webkit-scrollbar-track { background: transparent; }
.description-scroll::-webkit-scrollbar-thumb { background: rgba(147, 197, 253, 0.3); border-radius: 3px; }

/* 响应式适配 - 手机端优化 */
@media (max-width: 1200px) {
  .talent-layout {
    grid-template-columns: 1fr 1.8fr;
    gap: 1.5rem;
  }
}

@media (max-width: 1024px) {
  .talent-layout {
    grid-template-columns: 1fr 1.5fr;
    gap: 1.2rem;
  }
  
  .talent-details h2 {
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
  .talent-layout {
    /* 改为垂直堆叠布局 */
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    gap: 1rem;
    height: auto;
    overflow: visible;
    padding: 0.8rem;
  }
  
  .talent-left-panel {
    order: 1;
    max-height: 40vh;
  }
  
  .talent-details-container {
    order: 2;
    min-height: 300px;
  }
  
  .talent-list-container {
    max-height: 35vh;
    /* 添加触摸滚动优化 */
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }
  
  /* 优化触摸体验 */
  .talent-item,
  .action-item {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
}

@media (max-width: 640px) {
  .talent-layout {
    gap: 0.8rem;
    padding: 0.6rem;
  }
  
  .talent-left-panel {
    max-height: 35vh;
  }
  
  .talent-list-container {
    max-height: 30vh;
    padding: 0.5rem;
  }
  
  .talent-item {
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
  
  .talent-details-container {
    padding: 1.2rem;
    min-height: 250px;
  }
  
  .talent-details h2 {
    font-size: 1.4rem;
    margin-bottom: 0.8rem;
  }
}

@media (max-width: 480px) {
  .top-actions-container {
    flex-direction: column;
    align-items: stretch;
  }
  .talent-selection-container {
    padding: 0.4rem;
    height: auto;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .talent-layout {
    gap: 0.6rem;
    padding: 0;
    height: auto;
    min-height: 0;
  }

  .talent-left-panel {
    max-height: none;
    border-radius: 6px;
  }
  
  .talent-list-container {
    max-height: 26vh;
    padding: 0.4rem;
  }
  
  .talent-item {
    padding: 0.6rem 0.8rem;
    font-size: 0.9rem;
    margin-bottom: 0.3rem;
    border-radius: 4px;
  }
  
  .talent-name {
    font-size: 0.9rem;
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
  
  .talent-details-container {
    padding: 1rem;
    min-height: 200px;
    border-radius: 6px;
  }
  
  .talent-details h2 {
    font-size: 1.3rem;
    margin-bottom: 0.6rem;
  }
  
  .description-scroll {
    font-size: 0.9rem;
    line-height: 1.5;
    padding-right: 0.3rem;
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

@media (max-width: 360px) {
  .talent-selection-container {
    padding: 0.3rem;
  }
  
  .talent-layout {
    gap: 0.4rem;
  }
  
  .talent-left-panel {
    max-height: 28vh;
  }
  
  .talent-list-container {
    max-height: 24vh;
    padding: 0.3rem;
  }
  
  .talent-item {
    padding: 0.5rem 0.6rem;
    font-size: 0.85rem;
    margin-bottom: 0.2rem;
  }
  
  .talent-name {
    font-size: 0.8rem;
  }
  
  .talent-details-container {
    padding: 0.8rem;
    min-height: 180px;
  }
  
  .talent-details h2 {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }
  
  .description-scroll {
    font-size: 0.85rem;
    line-height: 1.4;
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

/* ========== 亮色主题适配 ========== */
[data-theme="light"] .talent-left-panel,
[data-theme="light"] .talent-details-container {
  background: rgba(248, 250, 252, 0.8);
  border-color: rgba(0, 0, 0, 0.08);
}

[data-theme="light"] .talent-item {
  background: rgba(255, 255, 255, 0.6);
}

[data-theme="light"] .talent-item:hover {
  background: rgba(241, 245, 249, 0.95);
  border-color: rgba(59, 130, 246, 0.2);
}

[data-theme="light"] .talent-item.selected {
  background: rgba(219, 234, 254, 0.8);
  border-color: rgba(59, 130, 246, 0.4);
}

[data-theme="light"] .talent-name {
  color: #1e293b;
}

[data-theme="light"] .talent-item.selected .talent-name {
  color: #1e40af;
}

[data-theme="light"] .talent-details h2 {
  color: #2563eb;
}

[data-theme="light"] .description-scroll p {
  color: #475569;
}
</style>
