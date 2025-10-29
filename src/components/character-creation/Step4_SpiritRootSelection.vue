<template>
  <div class="spirit-root-selection-container">
    <div v-if="store.isLoading" class="loading-state">天地玄黄，探查灵根...</div>
    <div v-else-if="store.error" class="error-state">天机混沌：{{ store.error }}</div>

    <div v-else class="spirit-root-layout">
      <!-- 左侧面板：选择和操作 -->
      <div class="spirit-root-left-panel">
        <!-- 顶部功能按钮 -->
        <div class="top-actions-container">
          <button
            v-if="store.isLocalCreation"
            @click="isAdvancedCustomVisible = true"
            class="action-item shimmer-on-hover"
          >
            <span class="action-name">高级自定义</span>
          </button>
          <button 
            @click="handleAIGenerate" 
            class="action-item shimmer-on-hover"
          >
            <span class="action-name">AI推演</span>
          </button>
        </div>

        <!-- 选择模式切换 -->
        <div class="selection-mode-tabs">
          <button 
            :class="{ active: selectionMode === 'preset' }"
            @click="selectionMode = 'preset'"
            class="mode-tab"
          >
            预设灵根
          </button>
          <button 
            :class="{ active: selectionMode === 'custom' }"
            @click="selectionMode = 'custom'"
            class="mode-tab"
          >
            组合选择
          </button>
        </div>

        <!-- 预设灵根模式 -->
        <div v-if="selectionMode === 'preset'" class="preset-mode">
          <div class="spirit-root-list-container">
            <div
              class="spirit-root-item"
              :class="{ selected: isRandomSelected }"
              @click="handleSelectRandom"
              @mouseover="activeSpiritRoot = 'random'"
            >
              <span class="spirit-root-name">随机灵根</span>
              <span class="spirit-root-cost">0 点</span>
            </div>
            <div class="divider"></div>
            <div
              v-for="root in filteredSpiritRoots"
              :key="root.id"
              class="spirit-root-item"
              :class="{
                selected: store.characterPayload.spirit_root_id === root.id,
                disabled: !canSelect(root),
              }"
              @click="handleSelectSpiritRoot(root)"
              @mouseover="activeSpiritRoot = root"
            >
              <div class="item-content">
                <div class="spirit-root-name-container">
                  <span class="spirit-root-name">{{ getSpiritRootBaseName(root.name) }}</span>
                  <span v-if="getSpiritRootTier(root)" class="spirit-root-tier" :class="`tier-${getSpiritRootTier(root)}`">
                    {{ getSpiritRootTier(root) }}
                  </span>
                </div>
                <span class="spirit-root-cost">{{ root.talent_cost }} 点</span>
              </div>
              <div v-if="root.source === 'cloud'" class="action-buttons">
                <button @click.stop="openEditModal(root)" class="edit-btn" title="编辑此项">
                  <Edit :size="14" />
                </button>
                <button @click.stop="handleDeleteSpiritRoot(root.id)" class="delete-btn" title="删除此项">
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 组合选择模式 -->
        <div v-if="selectionMode === 'custom'" class="custom-mode">
          <div class="custom-selection-container">
            <!-- 灵根类型选择 -->
            <div class="selection-group">
              <label class="selection-label">灵根类型</label>
              <div class="spirit-type-grid">
                <button
                  v-for="type in spiritRootTypes"
                  :key="type.key"
                  :class="{ selected: customSpirit.type === type.key }"
                  @click="customSpirit.type = type.key"
                  class="type-button"
                  :style="{ '--element-color': type.color }"
                >
                  <span class="type-icon">{{ type.icon }}</span>
                  <span class="type-name">{{ type.name }}</span>
                </button>
              </div>
            </div>

            <!-- 品级选择 -->
            <div class="selection-group">
              <label class="selection-label">灵根品级</label>
              <div class="tier-selection">
                <button
                  v-for="tier in spiritRootTiers"
                  :key="tier.key"
                  :class="[
                    'tier-button',
                    `tier-${tier.key}`,
                    { selected: customSpirit.tier === tier.key }
                  ]"
                  @click="customSpirit.tier = tier.key"
                >
                  <span class="tier-name">{{ tier.name }}</span>
                  <span class="tier-multiplier">{{ tier.multiplier }}x</span>
                  <span class="tier-cost">{{ tier.cost }}点</span>
                </button>
              </div>
            </div>

            <!-- 预览和确认 -->
            <div class="custom-preview">
              <div class="preview-title">预览</div>
              <div class="preview-content">
                <div class="preview-name">
                  <span>{{ getCustomSpiritName() }}</span>
                  <span v-if="customSpirit.tier !== 'none'" class="preview-tier" :class="`tier-${customSpirit.tier}`">
                    {{ getSpiritTierName(customSpirit.tier) }}
                  </span>
                </div>
                <div class="preview-stats">
                  <div class="stat">修炼倍率: {{ getCustomSpiritMultiplier() }}x</div>
                  <div class="stat">消耗点数: {{ getCustomSpiritCost() }}点</div>
                </div>
              </div>
              <button 
                @click="confirmCustomSpirit"
                :disabled="!isCustomSpiritValid()"
                class="confirm-custom-button"
              >
                确认选择
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧详情 -->
      <div class="spirit-root-details-container">
        <div v-if="activeSpiritRoot || (selectionMode === 'custom' && customSpirit.type !== 'none')" class="spirit-root-details">
          <h2>{{ getActiveDisplayName() }}</h2>
          <div class="description-scroll">
            <p>{{ getActiveDescription() }}</p>
          </div>
          <div class="stats-display">
            <div class="stat-item">
              <span class="stat-label">修炼倍率:</span>
              <span class="stat-value">{{ getActiveMultiplier() }}x</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">消耗天道点:</span>
              <span class="stat-value">{{ getActiveCost() }}点</span>
            </div>
          </div>
        </div>
        <div v-else class="placeholder">请选择一种灵根，或听天由命。</div>
      </div>
    </div>

    <!-- 高级自定义模态框 -->
    <CustomCreationModal
      :visible="isAdvancedCustomVisible"
      title="高级自定义灵根"
      :fields="advancedCustomFields"
      :validationFn="validateAdvancedCustom"
      @close="isAdvancedCustomVisible = false"
      @submit="handleAdvancedCustomSubmit"
    />
    
    <!-- 编辑模态框 -->
    <CustomCreationModal
      :visible="isEditModalVisible"
      title="编辑灵根"
      :fields="advancedCustomFields"
      :validationFn="validateAdvancedCustom"
      :initialData="editInitialData"
      @close="isEditModalVisible = false; editingSpiritRoot = null"
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
import { ref, computed, reactive } from 'vue'
import { Trash2, Edit } from 'lucide-vue-next'
import { useCharacterCreationStore } from '../../stores/characterCreationStore'
import type { SpiritRoot } from '../../types'
import CustomCreationModal, { type ModalField } from './CustomCreationModal.vue'
import AIPromptModal from './AIPromptModal.vue'
import { toast } from '../../utils/toast'
import { generateWithRawPrompt } from '../../utils/tavernCore'
import { SPIRIT_ROOT_ITEM_GENERATION_PROMPT } from '../../utils/prompts/tasks/gameElementPrompts'

const emit = defineEmits(['ai-generate'])
const store = useCharacterCreationStore()
// UI状态
const activeSpiritRoot = ref<SpiritRoot | 'random' | null>(null)
const selectionMode = ref<'preset' | 'custom'>('preset')
const isAdvancedCustomVisible = ref(false)
const isEditModalVisible = ref(false)
const isAIPromptModalVisible = ref(false)
const editingSpiritRoot = ref<SpiritRoot | null>(null)

// 自定义灵根状态
const customSpirit = reactive({
  type: 'none' as string,
  tier: 'none' as string
})

// 灵根类型配置
const spiritRootTypes = [
  { key: 'fire', name: '火', icon: '🔥', color: '#ef4444', desc: '烈火焚天，爆发力强' },
  { key: 'water', name: '水', icon: '💧', color: '#3b82f6', desc: '水流不息，绵延悠长' },
  { key: 'wood', name: '木', icon: '🌿', color: '#10b981', desc: '生机盎然，治愈修复' },
  { key: 'metal', name: '金', icon: '⚔️', color: '#f59e0b', desc: '锋锐无匹，切金断玉' },
  { key: 'earth', name: '土', icon: '🗿', color: '#8b5cf6', desc: '厚德载物，防御超群' },
  { key: 'wind', name: '风', icon: '💨', color: '#06b6d4', desc: '风驰电掣，身法如神' },
  { key: 'thunder', name: '雷', icon: '⚡', color: '#eab308', desc: '雷霆万钧，毁天灭地' },
  { key: 'ice', name: '冰', icon: '❄️', color: '#0ea5e9', desc: '冰霜刺骨，万物凋零' },
  { key: 'light', name: '光', icon: '☀️', color: '#f97316', desc: '光明普照，净化邪恶' },
  { key: 'dark', name: '暗', icon: '🌑', color: '#6b7280', desc: '幽暗深邃，诡异莫测' },
  { key: 'space', name: '空间', icon: '🌀', color: '#7c3aed', desc: '虚空挪移，空间掌控' },
  { key: 'time', name: '时间', icon: '⏰', color: '#ec4899', desc: '时光流转，逆转乾坤' }
]

// 灵根品级配置 - 完整的修仙品级体系
const spiritRootTiers = [
  { key: 'common', name: '凡品', multiplier: 1.0, cost: 0, desc: '平平无奇的普通灵根' },
  { key: 'low', name: '下品', multiplier: 1.1, cost: 3, desc: '略有天赋，勉强可用' },
  { key: 'middle', name: '中品', multiplier: 1.3, cost: 6, desc: '资质尚可，小有成就' },
  { key: 'high', name: '上品', multiplier: 1.6, cost: 10, desc: '天赋卓越，前途无量' },
  { key: 'supreme', name: '极品', multiplier: 2.0, cost: 15, desc: '万中无一，天之骄子' },
  { key: 'heaven', name: '仙品', multiplier: 2.4, cost: 20, desc: '天降异象，举世罕见' },
  { key: 'divine', name: '神品', multiplier: 2.8, cost: 25, desc: '神鬼莫测，逆天改命' },
  { key: 'special', name: '特殊', multiplier: 0, cost: 0, desc: '特殊体质，另有奥妙' }
]

const filteredSpiritRoots = computed(() => {
  if (store.isLocalCreation) {
    return store.creationData.spiritRoots.filter(root => 
      root.source === 'local' || root.source === 'cloud'
    );
  } else {
    return store.creationData.spiritRoots.filter(root => 
      root.source === 'cloud'
    );
  }
});

// 高级自定义字段 - 使用动态列表格式
const advancedCustomFields: readonly ModalField[] = [
  { key: 'name', label: '灵根名称', type: 'text', placeholder: '例如：混沌灵根' },
  { key: 'tier', label: '品级', type: 'select', options: spiritRootTiers.map(t => ({ value: t.key, label: t.name })) },
  { key: 'description', label: '灵根描述', type: 'textarea', placeholder: '描述这个灵根的特性和背景故事...' },
  { key: 'base_multiplier', label: '修炼倍率', type: 'text', placeholder: '例如：1.5' },
  { key: 'talent_cost', label: '消耗天道点', type: 'text', placeholder: '例如：10' },
  {
    key: 'special_effects',
    label: '特殊效果',
    type: 'dynamic-list',
    columns: [
      {
        key: 'effect',
        placeholder: '效果描述，如：雷系法术威力+80%'
      }
    ]
  }
]

// 为自定义灵根数据定义完整类型 - 与标准数据格式保持一致
type CustomSpiritRootData = {
  name: string;
  tier: string;
  description: string;
  base_multiplier: string;
  talent_cost: string;
  special_effects: { effect: string }[];
};

function validateCustomSpiritRoot(data: Partial<CustomSpiritRootData>) {
    const errors: Record<string, string> = {};

    // 必填字段验证
    if (!data.name?.trim()) errors.name = '灵根名称不可为空';
    if (!data.tier) errors.tier = '请选择品级';
    if (!data.description?.trim()) errors.description = '灵根描述不可为空';

    // 数值字段验证
    if (data.base_multiplier === undefined || isNaN(parseFloat(data.base_multiplier))) {
      errors.base_multiplier = '修炼倍率必须为数字';
    }
    if (data.talent_cost === undefined || isNaN(parseInt(data.talent_cost, 10))) {
      errors.talent_cost = '消耗点数必须为数字';
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors: Object.values(errors),
    };
}

async function handleCustomSubmit(data: CustomSpiritRootData) {
  // 处理特殊效果数组 - 处理动态列表格式
  const specialEffects = data.special_effects?.length
    ? data.special_effects
        .filter(item => item.effect?.trim())
        .map(item => item.effect.trim())
    : [];

  // 创建完整的标准化灵根对象
  const newRoot: SpiritRoot = {
    id: Date.now(),
    name: data.name,
    tier: spiritRootTiers.find(t => t.key === data.tier)?.name || data.tier,
    description: data.description,
    special_effects: specialEffects,
    base_multiplier: parseFloat(data.base_multiplier) || 1.0,
    talent_cost: parseInt(data.talent_cost, 10) || 0,
    rarity: 1,
    source: 'cloud' as const // 自定义的都算作cloud
  }

  try {
    store.addSpiritRoot(newRoot);
    handleSelectSpiritRoot(newRoot);
    isAdvancedCustomVisible.value = false;
    toast.success(`自定义灵根 "${newRoot.name}" 已保存！`);
  } catch (e) {
    console.error('保存自定义灵根失败:', e);
    toast.error('保存自定义灵根失败！');
  }
}

const isRandomSelected = computed(() => store.characterPayload.spirit_root_id === null);

// New computed properties for hover display
const activeDisplayName = computed(() => {
 if (activeSpiritRoot.value === 'random') return '随机灵根'
 if (activeSpiritRoot.value && typeof activeSpiritRoot.value === 'object') return activeSpiritRoot.value.name
 return ''
});

const activeDescription = computed(() => {
 if (activeSpiritRoot.value === 'random')
   return '大道五十，天衍四九，人遁其一。选择此项，你的灵根将完全随机生成，可能一步登天，亦可能平庸无奇。'
 if (activeSpiritRoot.value && typeof activeSpiritRoot.value === 'object') return activeSpiritRoot.value.description || '灵根信息不明。'
 return '灵根信息不明。'
});

const activeCost = computed(() => {
 if (activeSpiritRoot.value === 'random') return 0
 if (activeSpiritRoot.value && typeof activeSpiritRoot.value === 'object') return activeSpiritRoot.value.talent_cost || 0
 return 0
});

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

function handleAIGenerate() {
  if (store.isLocalCreation) {
    isAIPromptModalVisible.value = true;
  } else {
    emit('ai-generate')
  }
}

async function handleAIPromptSubmit(userPrompt: string) {
  const toastId = 'ai-generate-spirit-root';
  toast.loading('天机推演中，请稍候...', { id: toastId });

  try {
    const aiResponse = await generateWithRawPrompt(userPrompt, SPIRIT_ROOT_ITEM_GENERATION_PROMPT, false);

    if (!aiResponse) {
      toast.error('AI推演失败', { id: toastId });
      return;
    }

    console.log('【AI推演-灵根】完整响应:', aiResponse);

    // 解析AI返回的JSON
    let parsedRoot: any;
    try {
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      parsedRoot = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('【AI推演-灵根】JSON解析失败:', parseError);
      toast.error('AI推演结果格式错误，无法解析', { id: toastId });
      return;
    }

    // 验证必需字段
    if (!parsedRoot.name && !parsedRoot.名称) {
      toast.error('AI推演结果缺少灵根名称', { id: toastId });
      return;
    }

    // 创建灵根对象
    const newRoot: SpiritRoot = {
      id: Date.now(),
      name: parsedRoot.name || parsedRoot.名称 || '未命名灵根',
      tier: parsedRoot.tier || parsedRoot.品级 || parsedRoot.等级 || '',
      description: parsedRoot.description || parsedRoot.描述 || parsedRoot.说明 || '',
      base_multiplier: parsedRoot.base_multiplier || parsedRoot.修炼倍率 || 1.0,
      talent_cost: parsedRoot.talent_cost || parsedRoot.天道点消耗 || parsedRoot.点数消耗 || 5,
      rarity: parsedRoot.rarity || parsedRoot.稀有度 || 3,
      source: 'local'
    };

    // 保存并选择灵根
    store.addSpiritRoot(newRoot);
    handleSelectSpiritRoot(newRoot);
    isAIPromptModalVisible.value = false;

    toast.success(`AI推演完成！灵根 "${newRoot.name}" 已生成`, { id: toastId });

  } catch (e: any) {
    console.error('【AI推演-灵根】失败:', e);
    toast.error(`AI推演失败: ${e.message}`, { id: toastId });
  }
}

// 解析灵根名称和等级
function getSpiritRootBaseName(name: string): string {
  // 现在名称中不再包含品级前缀，直接返回名称
  return name;
}

function getSpiritRootTier(root: SpiritRoot): string {
  // 直接使用tier字段
  return root.tier || '';
}

// 自定义灵根相关函数
function getCustomSpiritName(): string {
  if (customSpirit.type === 'none') return '请选择灵根类型';
  const typeInfo = spiritRootTypes.find(t => t.key === customSpirit.type);
  return typeInfo ? `${typeInfo.name}灵根` : '未知灵根';
}

function getCustomSpiritMultiplier(): number {
  if (customSpirit.tier === 'none') return 1.0;
  const tierInfo = spiritRootTiers.find(t => t.key === customSpirit.tier);
  return tierInfo ? tierInfo.multiplier : 1.0;
}

function getCustomSpiritCost(): number {
  if (customSpirit.tier === 'none') return 0;
  const tierInfo = spiritRootTiers.find(t => t.key === customSpirit.tier);
  return tierInfo ? tierInfo.cost : 0;
}

function getSpiritTierName(tierKey: string): string {
  const tierInfo = spiritRootTiers.find(t => t.key === tierKey);
  return tierInfo ? tierInfo.name : '';
}

function isCustomSpiritValid(): boolean {
  return customSpirit.type !== 'none' && customSpirit.tier !== 'none';
}

function confirmCustomSpirit() {
  if (!isCustomSpiritValid()) {
    toast.warning('请完整选择灵根类型和品级');
    return;
  }
  
  const typeInfo = spiritRootTypes.find(t => t.key === customSpirit.type);
  const tierInfo = spiritRootTiers.find(t => t.key === customSpirit.tier);
  
  if (!typeInfo || !tierInfo) {
    toast.error('选择的灵根配置无效');
    return;
  }
  
  const newRoot: SpiritRoot = {
    id: Date.now(),
    name: `${typeInfo.name}灵根`,
    description: `${tierInfo.desc}的${typeInfo.desc}`,
    base_multiplier: tierInfo.multiplier,
    talent_cost: tierInfo.cost,
    tier: tierInfo.name,
    source: 'cloud' as const
  };
  
  store.addSpiritRoot(newRoot);
  handleSelectSpiritRoot(newRoot);
  toast.success(`自定义灵根 "${newRoot.name}" 已创建！`);
  
  // 重置选择
  customSpirit.type = 'none';
  customSpirit.tier = 'none';
}

// 活跃显示相关函数
function getActiveDisplayName(): string {
  if (selectionMode.value === 'custom' && customSpirit.type !== 'none') {
    return getCustomSpiritName();
  }
  return activeDisplayName.value;
}

function getActiveDescription(): string {
  if (selectionMode.value === 'custom' && customSpirit.type !== 'none') {
    const typeInfo = spiritRootTypes.find(t => t.key === customSpirit.type);
    const tierInfo = spiritRootTiers.find(t => t.key === customSpirit.tier);
    if (typeInfo && tierInfo && customSpirit.tier !== 'none') {
      return `${tierInfo.desc}的${typeInfo.desc}`;
    } else if (typeInfo) {
      return typeInfo.desc;
    }
    return '请选择灵根品级';
  }
  return activeDescription.value;
}

function getActiveMultiplier(): string {
  if (selectionMode.value === 'custom' && customSpirit.type !== 'none') {
    return getCustomSpiritMultiplier().toString();
  }
  if (activeSpiritRoot.value === 'random') return '随机'
  if (activeSpiritRoot.value && typeof activeSpiritRoot.value === 'object') return (activeSpiritRoot.value.base_multiplier || 1.0).toString()
  return '1.0'
}

function getActiveCost(): string {
  if (selectionMode.value === 'custom' && customSpirit.type !== 'none') {
    return getCustomSpiritCost().toString();
  }
  return activeCost.value.toString();
}

// 高级自定义相关
function validateAdvancedCustom(data: Partial<CustomSpiritRootData>) {
  return validateCustomSpiritRoot(data);
}

function handleAdvancedCustomSubmit(data: CustomSpiritRootData) {
  handleCustomSubmit(data);
}

// 编辑功能
function openEditModal(root: SpiritRoot) {
  editingSpiritRoot.value = root;
  isEditModalVisible.value = true;
}

// 删除功能
async function handleDeleteSpiritRoot(id: number) {
  try {
    await store.removeSpiritRoot(id);
    console.log(`【灵根选择】成功删除灵根 ID: ${id}`);
  } catch (error) {
    console.error(`【灵根选择】删除灵根失败 ID: ${id}`, error);
  }
}

async function handleEditSubmit(data: CustomSpiritRootData) {
  if (!editingSpiritRoot.value) return;
  
  // 处理特殊效果数组
  const specialEffects = data.special_effects?.length
    ? data.special_effects
        .filter(item => item.effect?.trim())
        .map(item => item.effect.trim())
    : [];

  // 创建更新数据对象
  const updateData: Partial<SpiritRoot> = {
    name: data.name,
    tier: spiritRootTiers.find(t => t.key === data.tier)?.name || data.tier,
    description: data.description,
    cultivation_speed: `${data.base_multiplier}x`,
    special_effects: specialEffects,
    base_multiplier: parseFloat(data.base_multiplier) || 1.0,
    talent_cost: parseInt(data.talent_cost, 10) || 0
  };

  try {
    const success = store.updateSpiritRoot(editingSpiritRoot.value.id, updateData);
    if (success) {
      isEditModalVisible.value = false;
      editingSpiritRoot.value = null;
      toast.success(`灵根 "${updateData.name}" 已更新！`);
    } else {
      toast.error('更新灵根失败！');
    }
  } catch (e) {
    console.error('更新灵根失败:', e);
    toast.error('更新灵根失败！');
  }
}

// 编辑模态框的初始数据
const editInitialData = computed(() => {
  if (!editingSpiritRoot.value) return {};

  return {
    name: editingSpiritRoot.value.name,
    tier: spiritRootTiers.find(t => t.name === editingSpiritRoot.value!.tier)?.key || 'common',
    description: editingSpiritRoot.value.description,
    base_multiplier: editingSpiritRoot.value.base_multiplier?.toString() || '1.0',
    talent_cost: editingSpiritRoot.value.talent_cost.toString(),
    special_effects: editingSpiritRoot.value.special_effects?.map(effect => ({ effect })) || []
  };
});

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

/* 预设模式样式 */
.preset-mode {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.spirit-root-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0.5rem 1rem 0.5rem;
  min-height: 0;
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

.spirit-root-item:hover .action-buttons {
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

.spirit-root-name-container {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.spirit-root-tier {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-align: center;
  min-width: 28px;
  flex-shrink: 0;
}

.spirit-root-tier.tier-下品 {
  background: linear-gradient(135deg, #8B5CF6, #A78BFA);
  color: white;
}

.spirit-root-tier.tier-中品 {
  background: linear-gradient(135deg, #3B82F6, #60A5FA);
  color: white;
}

.spirit-root-tier.tier-上品 {
  background: linear-gradient(135deg, #10B981, #34D399);
  color: white;
}

.spirit-root-tier.tier-极品 {
  background: linear-gradient(135deg, #F59E0B, #FBBF24);
  color: white;
}

.spirit-root-tier.tier-天品 {
  background: linear-gradient(135deg, #EF4444, #F87171);
  color: white;
}

.spirit-root-tier.tier-神品 {
  background: linear-gradient(135deg, #DC2626, #F87171);
  color: white;
}

.spirit-root-tier.tier-特殊 {
  background: linear-gradient(135deg, #7C3AED, #A78BFA);
  color: white;
  border: 1px solid #A78BFA;
}

.spirit-root-tier.tier-凡品 {
  background: rgba(156, 163, 175, 0.2);
  color: #6B7280;
  border: 1px solid #9CA3AF;
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

/* 响应式适配 - 手机端优化 */
@media (max-width: 1200px) {
  .spirit-root-layout {
    grid-template-columns: 1fr 1.8fr;
    gap: 1.5rem;
  }
}

@media (max-width: 1024px) {
  .spirit-root-layout {
    grid-template-columns: 1fr 1.5fr;
    gap: 1.2rem;
  }
  
  .spirit-root-details h2 {
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
  .spirit-root-layout {
    /* 改为垂直堆叠布局 */
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    gap: 1rem;
    height: auto;
    overflow: visible;
    padding: 0.8rem;
  }
  
  .spirit-root-left-panel {
    order: 1;
    /* 移除max-height限制，让flex布局正常工作 */
  }
  
  .spirit-root-details-container {
    order: 2;
    min-height: 300px;
  }
  
  .spirit-root-list-container {
    /* 移除max-height限制，让flex布局正常工作 */
    /* 添加触摸滚动优化 */
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }
  
  /* 优化触摸体验 */
  .spirit-root-item,
  .action-item {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
}

@media (max-width: 640px) {
  .spirit-root-layout {
    gap: 0.8rem;
    padding: 0.6rem;
  }
  
  
  .spirit-root-list-container {
    padding: 0.5rem;
  }
  
  .spirit-root-item {
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
  
  .spirit-root-details-container {
    padding: 1.2rem;
    min-height: 250px;
  }
  
  .spirit-root-details h2 {
    font-size: 1.4rem;
    margin-bottom: 0.8rem;
  }
}

@media (max-width: 480px) {
  .top-actions-container {
    flex-direction: column;
    align-items: stretch;
  }
  .spirit-root-selection-container {
    padding: 0.4rem;
    height: auto;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .spirit-root-layout {
    gap: 0.6rem;
    padding: 0;
    height: auto;
    min-height: 0;
  }
  
  .spirit-root-left-panel {
    border-radius: 6px;
  }
  
  .spirit-root-list-container {
    padding: 0.4rem;
  }
  
  .spirit-root-item {
    padding: 0.6rem 0.8rem;
    font-size: 0.9rem;
    margin-bottom: 0.3rem;
    border-radius: 4px;
  }
  
  .spirit-root-name {
    font-size: 0.9rem;
  }
  
  .spirit-root-cost {
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
  
  .spirit-root-details-container {
    padding: 1rem;
    min-height: 200px;
    border-radius: 6px;
  }
  
  .spirit-root-details h2 {
    font-size: 1.3rem;
    margin-bottom: 0.6rem;
  }
  
  .description-scroll {
    font-size: 0.9rem;
    line-height: 1.5;
    padding-right: 0.3rem;
  }
  
  .cost-display {
    font-size: 1rem;
    text-align: center;
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
  .spirit-root-selection-container {
    padding: 0.3rem;
  }
  
  .spirit-root-layout {
    gap: 0.4rem;
  }
  
  
  .spirit-root-list-container {
    padding: 0.3rem;
  }
  
  .spirit-root-item {
    padding: 0.5rem 0.6rem;
    font-size: 0.85rem;
    margin-bottom: 0.2rem;
  }
  
  .spirit-root-name {
    font-size: 0.8rem;
  }
  
  .spirit-root-cost {
    font-size: 0.75rem;
  }
  
  .spirit-root-details-container {
    padding: 0.8rem;
    min-height: 180px;
  }
  
  .spirit-root-details h2 {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }
  
  .description-scroll {
    font-size: 0.85rem;
    line-height: 1.4;
  }
  
  .cost-display {
    font-size: 0.9rem;
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

/* 自定义模式样式 */
.stats-display {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.stat-value {
  color: var(--color-accent);
  font-weight: 600;
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

/* 选择模式标签页 */
.selection-mode-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-light);
}

.mode-tab {
  flex: 1;
  padding: 0.8rem 1rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.mode-tab.active {
  color: var(--color-primary);
  background: var(--color-surface);
  border-bottom: 2px solid var(--color-primary);
}

.mode-tab:hover:not(.active) {
  background: rgba(136, 192, 208, 0.1);
  color: var(--color-text);
}

/* 自定义模式样式 */
.custom-mode {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.custom-selection-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.selection-group {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.selection-label {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.9rem;
}

.spirit-type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 0.5rem;
}

.type-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.8rem 0.5rem;
  border: 2px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 70px;
}

.type-button:hover {
  border-color: var(--element-color, var(--color-primary));
  background: rgba(136, 192, 208, 0.1);
}

.type-button.selected {
  border-color: var(--element-color, var(--color-primary));
  background: var(--element-color, var(--color-primary));
  color: white;
}

.type-icon {
  font-size: 1.2rem;
}

.type-name {
  font-size: 0.8rem;
  font-weight: 500;
}

.tier-selection {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tier-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 1rem;
  border: 2px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tier-button:hover {
  border-color: var(--color-primary);
  background: rgba(136, 192, 208, 0.1);
}

.tier-button.selected {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: white;
}

.tier-button.tier-common {
  border-color: #9CA3AF;
}

.tier-button.tier-low {
  border-color: #8B5CF6;
}

.tier-button.tier-middle {
  border-color: #3B82F6;
}

.tier-button.tier-high {
  border-color: #10B981;
}

.tier-button.tier-supreme {
  border-color: #F59E0B;
}

.tier-button.tier-heaven {
  border-color: #FF6B35;
}

.tier-button.tier-divine {
  border-color: #DC2626;
}

.tier-button.tier-special {
  border-color: #7C3AED;
}

.tier-name {
  font-weight: 600;
}

.tier-multiplier {
  color: var(--color-accent);
  font-size: 0.9rem;
}

.tier-cost {
  color: var(--color-text-secondary);
  font-size: 0.8rem;
}

.custom-preview {
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface-light);
}

.preview-title {
  font-weight: 600;
  margin-bottom: 0.8rem;
  color: var(--color-text);
}

.preview-content {
  margin-bottom: 1rem;
}

.preview-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.8rem;
  font-weight: 600;
  color: var(--color-primary);
}

.preview-tier {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  background: var(--color-accent);
  color: white;
}

.preview-stats {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.preview-stats .stat {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.confirm-custom-button {
  width: 100%;
  padding: 0.8rem;
  border: none;
  border-radius: 6px;
  background: var(--color-primary);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.confirm-custom-button:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.confirm-custom-button:disabled {
  background: var(--color-border);
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

.actions-container {
  border-top: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem;
  display: flex;
  gap: 0.5rem;
}

/* 兼容新等级名称“仙品” */
.spirit-root-tier.tier-仙品 { background: linear-gradient(135deg, #EF4444, #F87171); color: white; }
</style>
