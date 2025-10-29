<template>
  <div class="talent-selection-container">
    <div v-if="store.isLoading" class="loading-state">于时光长河中搜寻天赋...</div>
    <div v-else-if="store.error" class="error-state">天机紊乱：{{ store.error }}</div>

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
            <span class="action-name">自定义天赋</span>
          </button>
          <button @click="handleAIGenerate" class="action-item shimmer-on-hover">
            <span class="action-name">AI推演</span>
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
              <span class="talent-cost">{{ talent.talent_cost || 0 }}点</span>
            </div>
            <div v-if="talent.source === 'cloud' || talent.source === 'local'" class="action-buttons">
              <button @click.stop="openEditModal(talent)" class="edit-btn" title="编辑此项">
                <Edit :size="14" />
              </button>
              <button @click.stop="handleDeleteTalent(talent.id)" class="delete-btn" title="删除此项">
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
            <p>{{ activeTalent.description || '此天赋之玄妙，需自行领悟。' }}</p>
          </div>
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
    
    <!-- 编辑模态框 -->
    <CustomCreationModal
      :visible="isEditModalVisible"
      title="编辑天赋"
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
const customTalentFields: ModalField[] = [
  { key: 'name', label: '天赋名称', type: 'text', placeholder: '例如：道心天成' },
  { key: 'description', label: '天赋描述', type: 'textarea', placeholder: '描述此天赋的本质...' },
  { key: 'talent_cost', label: '天道点消耗', type: 'number', placeholder: '例如：3' },
]

// 自定义天赋数据类型 - 与标准数据格式保持一致
type CustomTalentData = {
  name: string;
  description: string;
  talent_cost: number;
};

function validateCustomTalent(data: Partial<CustomTalentData>) {
    const errors: Record<string, string> = {};

    // 必填字段验证
    if (!data.name?.trim()) errors.name = '天赋名称不可为空';
    if (!data.description?.trim()) errors.description = '天赋描述不可为空';
    if (data.talent_cost === undefined || data.talent_cost === null || isNaN(data.talent_cost)) {
        errors.talent_cost = '天道点消耗必须填写';
    } else if (data.talent_cost < 0) {
        errors.talent_cost = '天道点消耗不能为负数';
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors: Object.values(errors),
    };
}

async function handleCustomSubmit(data: CustomTalentData) {
  // 创建简化的天赋对象
  const newTalent: Talent = {
    id: Date.now(),
    name: data.name,
    description: data.description,
    talent_cost: Number(data.talent_cost) || 0,
    rarity: 1,
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
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      parsedTalent = JSON.parse(jsonStr.trim());
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

  // 创建更新数据对象
  const updateData: Partial<Talent> = {
    name: data.name,
    description: data.description,
    talent_cost: Number(data.talent_cost) || 0,
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

.delete-btn:hover {
  color: var(--color-danger);
  background-color: rgba(255, 0, 0, 0.1);
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

.talent-name {
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
</style>