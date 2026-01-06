<template>
  <div class="world-selection-container">
    <div v-if="store.isLoading" class="loading-state">{{ $t('正在推演诸天万界...') }}</div>
    <div v-else-if="store.error" class="error-state">{{ $t('天机紊乱') }}：{{ store.error }}</div>

    <div v-else class="world-layout">
      <!-- 左侧面板：世界列表 -->
      <div class="left-panel">
        <!-- 顶部功能按钮 -->
        <div class="top-actions-container">
          <button
            v-if="store.isLocalCreation"
            @click="isCustomModalVisible = true"
            class="action-item shimmer-on-hover"
          >
            <span class="action-name">{{ $t('自定义世界') }}</span>
          </button>
          <button @click="handleAIGenerate" class="action-item shimmer-on-hover">
            <span class="action-name">{{ $t('AI推演') }}</span>
          </button>
        </div>

        <div class="list-container">
          <div v-if="worldsList.length === 0" class="no-worlds-message">
            <div class="no-worlds-icon">🌌</div>
            <div class="no-worlds-text">
              {{ store.isLocalCreation ? $t('暂无本地世界数据') : $t('暂无云端世界数据') }}
            </div>
            <div v-if="!store.isLocalCreation" class="no-worlds-hint">
              {{ $t('请检查网络连接或联系管理员') }}
            </div>
          </div>
          <div v-else
            v-for="world in worldsList"
            :key="world.id"
            class="list-item"
            :class="{ selected: store.characterPayload.world_id === world.id }"
            @click="handleSelectWorld(world)"
            @mouseover="activeWorld = world"
          >
            <div class="item-content">
              <span class="item-name">{{ world.name }}</span>
            </div>
            <div v-if="world.source === 'cloud'" class="action-buttons">
              <button @click.stop="openEditModal(world)" class="edit-btn" :title="$t('编辑此项')">
                <Edit :size="14" />
              </button>
              <button @click.stop="handleDeleteWorld(world.id)" class="delete-btn" :title="$t('删除此项')">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧面板：世界详情 + 地图生成选项 -->
      <div class="details-container">
        <div v-if="activeWorld" class="world-details">
          <div class="details-header">
            <h2 class="details-title">{{ activeWorld.name }}</h2>
            <button class="map-settings-btn" @click="showMapOptions = !showMapOptions" :title="$t('地图生成选项')">
              <Settings :size="16" />
              <span class="btn-text">{{ $t('设置') }}</span>
            </button>
          </div>
          <p class="era">【{{ activeWorld.era || $t('时代未知') }}】</p>

          <!-- 地图生成选项（移入右侧详情内，避免整体高度溢出） -->
          <div class="map-options" v-show="showMapOptions">
            <div class="map-options-header">{{ $t('世界规模配置') }}</div>

            <!-- 配置警告提示 -->
            <div class="config-warning" v-if="isConfigRisky">
              <div class="warning-icon">⚠️</div>
              <div class="warning-text">
                <div class="warning-title">{{ $t('配置过高警告') }}</div>
                <div class="warning-desc">{{ $t('当前配置可能导致生成失败，建议调整至合理范围') }}</div>
              </div>
            </div>

            <!-- 核心游戏配置 -->
            <div class="map-options-grid">
              <label class="option-item">
                <span class="option-label">{{ $t('主要势力') }}</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  v-model.number="worldConfig.majorFactionsCount"
                  :class="{ 'config-risky': worldConfig.majorFactionsCount > 8 }"
                />
                <span class="config-hint">{{ $t('推荐: 3-8') }}</span>
              </label>
              <label class="option-item">
                <span class="option-label">{{ $t('地点总数') }}</span>
                <input
                  type="number"
                  min="5"
                  max="100"
                  step="1"
                  v-model.number="worldConfig.totalLocations"
                  :class="{ 'config-risky': worldConfig.totalLocations > 15 }"
                />
                <span class="config-hint">{{ $t('推荐: 8-15') }}</span>
              </label>
              <label class="option-item">
                <span class="option-label">{{ $t('秘境数量') }}</span>
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="1"
                  v-model.number="worldConfig.secretRealmsCount"
                  :class="{ 'config-risky': worldConfig.secretRealmsCount > 10 }"
                />
                <span class="config-hint">{{ $t('推荐: 3-10') }}</span>
              </label>
              <label class="option-item">
                <span class="option-label">{{ $t('大陆数量') }}</span>
                <input
                  type="number"
                  min="3"
                  max="7"
                  step="1"
                  v-model.number="worldConfig.continentCount"
                  :title="$t('大陆数量决定世界的宏观格局，3-7片大陆形成不同的地缘政治结构')"
                />
                <span class="config-hint">{{ $t('范围: 3-7') }}</span>
              </label>
            </div>

            <div class="map-options-actions">
              <button class="opt-btn" @click="randomizeConfig">{{ $t('随机') }}</button>
              <button class="opt-btn" @click="resetConfig">{{ $t('重置') }}</button>
            </div>
          </div>

          <div class="description-scroll" v-show="!showMapOptions">
            <p>{{ activeWorld.description || $t('此界一片混沌，尚无描述。') }}</p>
          </div>
        </div>
        <div v-else class="placeholder">
          {{ $t('请择一方大千世界，以定道基。') }}
        </div>
      </div>
    </div>

    <CustomCreationModal
      :visible="isCustomModalVisible"
      :title="$t('自定义世界')"
      :fields="customWorldFields"
      :validationFn="validateCustomWorld"
      @close="isCustomModalVisible = false"
      @submit="handleCustomSubmit"
    />

    <!-- 编辑模态框 -->
    <CustomCreationModal
      :visible="isEditModalVisible"
      :title="$t('编辑世界')"
      :fields="customWorldFields"
      :validationFn="validateCustomWorld"
      :initialData="editInitialData"
      @close="isEditModalVisible = false; editingWorld = null"
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
import { ref, computed, watch } from 'vue';
import { Settings, Trash2, Edit } from 'lucide-vue-next';
import { useCharacterCreationStore } from '../../stores/characterCreationStore';
import type { World } from '../../types';
import CustomCreationModal from './CustomCreationModal.vue';
import AIPromptModal from './AIPromptModal.vue';
import { toast } from '../../utils/toast';
import { generateWithRawPrompt } from '../../utils/tavernCore';
import { WORLD_ITEM_GENERATION_PROMPT } from '../../utils/prompts/tasks/gameElementPrompts';
import { parseJsonFromText } from '@/utils/jsonExtract';

const emit = defineEmits(['ai-generate']);
const store = useCharacterCreationStore();
const activeWorld = ref<World | null>(null); // For hover details view - 仿照天赋选择
const isCustomModalVisible = ref(false);
const showMapOptions = ref(false);
const isEditModalVisible = ref(false);
const isAIPromptModalVisible = ref(false);
const editingWorld = ref<World | null>(null);

// --- 世界生成配置 ---

// 创建一个稳定的默认配置
const createDefaultWorldConfig = () => ({
  majorFactionsCount: 5,
  totalLocations: 12,
  secretRealmsCount: 5,
  continentCount: 4
});

// 从 store 读取已保存的配置，如果没有则使用默认配置
const getInitialConfig = () => {
  const savedConfig = store.worldGenerationConfig;
  if (savedConfig && savedConfig.majorFactionsCount) {
    console.log('[世界配置] 从store恢复已保存的配置:', savedConfig);
    return {
      majorFactionsCount: savedConfig.majorFactionsCount,
      totalLocations: savedConfig.totalLocations,
      secretRealmsCount: savedConfig.secretRealmsCount,
      continentCount: savedConfig.continentCount
    };
  }
  // 如果没有保存的配置，使用默认值（不是随机值）
  console.log('[世界配置] 使用默认配置');
  return createDefaultWorldConfig();
};

const worldConfig = ref(getInitialConfig());

// 监听配置变化并自动保存到store
watch(worldConfig, (newConfig) => {
  store.setWorldGenerationConfig(newConfig);
  console.log('[世界配置] 配置已更新并保存:', newConfig);
}, { deep: true });

const worldsList = computed(() => {
  const allWorlds = store.creationData.worlds;
  console.log("【世界选择】所有世界数据:", allWorlds);
  console.log("【世界选择】当前模式:", store.isLocalCreation ? '本地' : '联机');

  if (store.isLocalCreation) {
    // 单机模式显示本地数据和云端同步的数据
    const availableWorlds = allWorlds.filter(world =>
      world.source === 'local' || world.source === 'cloud'
    );
    console.log("【世界选择】单机模式可用世界列表:", availableWorlds);
    return availableWorlds;
  } else {
    // 联机模式：优先显示云端数据，如果没有则回退到本地数据
    const cloudWorlds = allWorlds.filter(world =>
      world.source === 'cloud'
    );
    console.log("【世界选择】联机模式云端世界列表:", cloudWorlds);
    console.log("【世界选择】云端世界数量:", cloudWorlds.length);

    if (cloudWorlds.length === 0) {
      console.warn("【世界选择】警告：联机模式下没有云端世界数据，回退到本地数据！");
      // 回退显示本地数据
      const localWorlds = allWorlds.filter(world => world.source === 'local');
      console.log("【世界选择】回退使用本地世界:", localWorlds);
      return localWorlds;
    }

    return cloudWorlds;
  }
});

// 根据 types/index.ts 中的 World 接口定义字段
const customWorldFields = [
  { key: 'name', label: '世界名称', type: 'text', placeholder: '例如：九霄界' },
  { key: 'era', label: '时代背景', type: 'text', placeholder: '例如：仙道昌隆' },
  { key: 'description', label: '世界描述', type: 'textarea', placeholder: '描述这个世界的背景故事、修炼体系特点等...' }
] as const;

function validateCustomWorld(data: any) {
  const errors: Record<string, string> = {};
  if (!data.name?.trim()) {
    errors.name = '世界名称不可为空';
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors: Object.values(errors), // Return an array of strings
  };
}

async function handleCustomSubmit(data: any) {
  const newWorld: World = {
    id: Date.now(),
    name: data.name,
    era: data.era,
    description: data.description,
    source: 'local',
  };

  try {
    store.addWorld(newWorld);
    // await saveGameData(store.creationData); // NOTE: 持久化由Pinia插件自动处理
    handleSelectWorld(newWorld); // Auto-select the newly created world
    isCustomModalVisible.value = false;
    toast.success(`自定义世界 "${newWorld.name}" 已成功保存！`);
  } catch (e) {
    console.error('保存自定义世界失败:', e);
    toast.error('保存自定义世界失败！');
  }
}

function handleAIGenerate() {
  if (store.isLocalCreation) {
    isAIPromptModalVisible.value = true;
  } else {
    emit('ai-generate');
  }
}

async function handleAIPromptSubmit(userPrompt: string) {
  const toastId = 'ai-generate-world';
  toast.loading('天机推演中，请稍候...', { id: toastId });

  try {
    const aiResponse = await generateWithRawPrompt(userPrompt, WORLD_ITEM_GENERATION_PROMPT, false);

    if (!aiResponse) {
      toast.error('AI推演失败', { id: toastId });
      return;
    }

    console.log('【AI推演-世界】完整响应:', aiResponse);

    // 解析AI返回的JSON
    let parsedWorld: any;
    try {
      parsedWorld = parseJsonFromText(aiResponse);
    } catch (parseError) {
      console.error('【AI推演-世界】JSON解析失败:', parseError);
      toast.error('AI推演结果格式错误，无法解析', { id: toastId });
      return;
    }

    // 验证必需字段
    if (!parsedWorld.name) {
      toast.error('AI推演结果缺少世界名称', { id: toastId });
      return;
    }

    // 创建世界对象
    const newWorld: World = {
      id: Date.now(),
      name: parsedWorld.name || parsedWorld.名称 || '未命名世界',
      era: parsedWorld.era || parsedWorld.时代背景 || '',
      description: parsedWorld.description || parsedWorld.描述 || parsedWorld.世界描述 || '',
      source: 'local'
    };

    // 保存并选择世界
    store.addWorld(newWorld);
    handleSelectWorld(newWorld);
    isAIPromptModalVisible.value = false;

    toast.success(`AI推演完成！世界 "${newWorld.name}" 已生成`, { id: toastId });

  } catch (e: any) {
    console.error('【AI推演-世界】失败:', e);
    toast.error(`AI推演失败: ${e.message}`, { id: toastId });
  }
}

function handleSelectWorld(world: World) {
  store.selectWorld(world.id);
  // 保存世界生成配置到store，供后续使用
  store.setWorldGenerationConfig(worldConfig.value);
}

// 随机配置功能
function randomizeConfig() {
  const factionOptions = [3, 4, 5, 6, 7];
  const locationOptions = [8, 10, 12, 15, 18];
  const realmOptions = [3, 4, 5, 6, 8];
  const continentOptions = [3, 4, 5, 6];

  worldConfig.value = {
    majorFactionsCount: factionOptions[Math.floor(Math.random() * factionOptions.length)],
    totalLocations: locationOptions[Math.floor(Math.random() * locationOptions.length)],
    secretRealmsCount: realmOptions[Math.floor(Math.random() * realmOptions.length)],
    continentCount: continentOptions[Math.floor(Math.random() * continentOptions.length)]
  };

  store.setWorldGenerationConfig(worldConfig.value);
  toast.info('已随机生成世界配置');
}

// 重置为稳定的默认配置
function resetConfig() {
  worldConfig.value = createDefaultWorldConfig();
  store.setWorldGenerationConfig(worldConfig.value);
  toast.info('已重置为默认配置');
}

// 检查配置是否存在风险
const isConfigRisky = computed(() => {
  return worldConfig.value.majorFactionsCount > 8 ||
         worldConfig.value.totalLocations > 15 ||
         worldConfig.value.secretRealmsCount > 10;
});

// 编辑功能
function openEditModal(world: World) {
  editingWorld.value = world;
  isEditModalVisible.value = true;
}

// 删除功能
async function handleDeleteWorld(id: number) {
  try {
    await store.removeWorld(id);
    console.log(`【世界选择】成功删除世界 ID: ${id}`);
  } catch (error) {
    console.error(`【世界选择】删除世界失败 ID: ${id}`, error);
  }
}

async function handleEditSubmit(data: any) {
  if (!editingWorld.value) return;
  
  // 创建更新数据对象
  const updateData: Partial<World> = {
    name: data.name,
    era: data.era,
    description: data.description
  };

  try {
    const success = store.updateWorld(editingWorld.value.id, updateData);
    if (success) {
      isEditModalVisible.value = false;
      editingWorld.value = null;
      toast.success(`世界 "${updateData.name}" 已更新！`);
    } else {
      toast.error('更新世界失败！');
    }
  } catch (e) {
    console.error('更新世界失败:', e);
    toast.error('更新世界失败！');
  }
}

// 编辑模态框的初始数据
const editInitialData = computed(() => {
  if (!editingWorld.value) return {};
  
  return {
    name: editingWorld.value.name,
    era: editingWorld.value.era,
    description: editingWorld.value.description
  };
});

// fetchData 方法已不再需要，组件现在通过计算属性自动响应store的变化
</script>

<style scoped>
/* ========== 深色玻璃拟态风格 ========== */
.world-selection-container {
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

.world-layout {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1.5rem;
  height: 100%;
  overflow: hidden;
}

/* ========== 左侧面板 ========== */
.left-panel {
  display: flex;
  flex-direction: column;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  overflow: hidden;
}

/* 顶部功能按钮 */
.top-actions-container {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(30, 41, 59, 0.3);
  justify-content: flex-end;
}

.top-actions-container .action-item {
  padding: 0.5rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.6);
  color: #cbd5e1;
  cursor: pointer;
  transition: all 0.25s ease;
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
  letter-spacing: 0.05em;
}

.top-actions-container .action-item:hover {
  background: rgba(51, 65, 85, 0.8);
  border-color: rgba(147, 197, 253, 0.3);
  color: #f1f5f9;
}

.list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(147, 197, 253, 0.3) transparent;
}

.list-container::-webkit-scrollbar {
  width: 6px;
}

.list-container::-webkit-scrollbar-track {
  background: transparent;
}

.list-container::-webkit-scrollbar-thumb {
  background: rgba(147, 197, 253, 0.3);
  border-radius: 3px;
}

.list-container::-webkit-scrollbar-thumb:hover {
  background: rgba(147, 197, 253, 0.5);
}

/* ========== 选项卡样式 ========== */
.list-item {
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

.list-item:hover {
  background: rgba(51, 65, 85, 0.6);
  border-color: rgba(147, 197, 253, 0.2);
}

.list-item.selected {
  background: rgba(30, 58, 138, 0.4);
  border-color: rgba(147, 197, 253, 0.4);
  box-shadow: 0 0 0 1px rgba(147, 197, 253, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-grow: 1;
}

.item-name {
  flex-grow: 1;
  font-weight: 500;
  color: #f1f5f9;
}

.list-item.selected .item-name {
  color: #bfdbfe;
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

.list-item:hover .action-buttons {
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

/* ========== 右侧详情面板 ========== */
.details-container {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.world-details {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.details-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.details-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #93c5fd;
  text-shadow: 0 0 20px rgba(147, 197, 253, 0.3);
}

.map-settings-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.6);
  color: #cbd5e1;
  cursor: pointer;
  transition: all 0.25s ease;
  font-size: 0.85rem;
}

.map-settings-btn:hover {
  background: rgba(51, 65, 85, 0.8);
  border-color: rgba(147, 197, 253, 0.3);
  color: #f1f5f9;
}

.world-details h2 {
  margin-top: 0;
  color: #93c5fd;
  flex-shrink: 0;
}

.world-details .era {
  font-style: italic;
  color: #fbbf24;
  margin-bottom: 1rem;
  flex-shrink: 0;
  font-size: 0.9rem;
}

.description-scroll {
  flex: 1;
  overflow-y: auto;
  line-height: 1.7;
  padding-right: 0.5rem;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(147, 197, 253, 0.3) transparent;
}

.description-scroll::-webkit-scrollbar {
  width: 6px;
}

.description-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.description-scroll::-webkit-scrollbar-thumb {
  background: rgba(147, 197, 253, 0.3);
  border-radius: 3px;
}

.description-scroll p {
  margin: 0;
  white-space: pre-wrap;
  color: #94a3b8;
}

/* ========== 地图生成选项样式 ========== */
.map-options {
  margin-top: 0.8rem;
  border: 1px dashed rgba(147, 197, 253, 0.2);
  border-radius: 8px;
  padding: 1rem;
  background: rgba(30, 41, 59, 0.4);
  flex: 1 1 auto;
  overflow: auto;
}

.config-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.25);
  border-radius: 8px;
}

.warning-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.warning-text {
  flex: 1;
}

.warning-title {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
  color: #fbbf24;
}

.warning-desc {
  font-size: 0.8rem;
  color: #94a3b8;
  line-height: 1.4;
}

.option-item input.config-risky {
  border-color: rgba(251, 191, 36, 0.5);
  background-color: rgba(251, 191, 36, 0.05);
}

.config-hint {
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 0.2rem;
}

.map-options-header {
  font-weight: 600;
  color: #93c5fd;
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
}

.map-options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
}

.geo-grid {
  margin-top: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.range-inputs input {
  flex: 1;
  min-width: 0;
}

.range-inputs span {
  color: #64748b;
}

.option-item {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.option-label {
  font-size: 0.8rem;
  color: #94a3b8;
}

.option-item input {
  width: 100%;
  padding: 0.5rem 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: rgba(30, 41, 59, 0.6);
  color: #f1f5f9;
  font-size: 0.85rem;
}

.option-item input:focus {
  outline: none;
  border-color: rgba(147, 197, 253, 0.4);
}

.map-options-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.opt-btn {
  padding: 0.5rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: rgba(30, 41, 59, 0.6);
  color: #cbd5e1;
  cursor: pointer;
  transition: all 0.25s ease;
  font-size: 0.85rem;
}

.opt-btn:hover {
  background: rgba(51, 65, 85, 0.8);
  border-color: rgba(147, 197, 253, 0.3);
  color: #f1f5f9;
}

/* 高级选项 */
.advanced-section {
  margin-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 0.75rem;
}

.advanced-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.25rem 0;
  transition: color 0.2s;
}

.advanced-toggle:hover {
  color: #94a3b8;
}

.advanced-content {
  margin-top: 0.75rem;
}

/* ========== 空状态 ========== */
.no-worlds-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
  color: #64748b;
}

.no-worlds-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.no-worlds-text {
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: #94a3b8;
}

.no-worlds-hint {
  font-size: 0.85rem;
  opacity: 0.7;
  font-style: italic;
}

/* ========== 亮色主题适配 ========== */
[data-theme="light"] .left-panel,
[data-theme="light"] .details-container {
  background: rgba(248, 250, 252, 0.8);
  border-color: rgba(0, 0, 0, 0.08);
}

[data-theme="light"] .top-actions-container {
  background: rgba(241, 245, 249, 0.8);
  border-color: rgba(0, 0, 0, 0.06);
}

[data-theme="light"] .top-actions-container .action-item {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(0, 0, 0, 0.1);
  color: #475569;
}

[data-theme="light"] .top-actions-container .action-item:hover {
  background: rgba(241, 245, 249, 0.95);
  border-color: rgba(59, 130, 246, 0.3);
  color: #1e293b;
}

[data-theme="light"] .list-item {
  background: rgba(255, 255, 255, 0.6);
}

[data-theme="light"] .list-item:hover {
  background: rgba(241, 245, 249, 0.95);
  border-color: rgba(59, 130, 246, 0.2);
}

[data-theme="light"] .list-item.selected {
  background: rgba(219, 234, 254, 0.8);
  border-color: rgba(59, 130, 246, 0.4);
}

[data-theme="light"] .item-name {
  color: #1e293b;
}

[data-theme="light"] .list-item.selected .item-name {
  color: #1e40af;
}

[data-theme="light"] .details-title,
[data-theme="light"] .world-details h2 {
  color: #2563eb;
}

[data-theme="light"] .description-scroll p {
  color: #475569;
}

[data-theme="light"] .map-options {
  background: rgba(241, 245, 249, 0.8);
  border-color: rgba(59, 130, 246, 0.2);
}

[data-theme="light"] .option-item input {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(0, 0, 0, 0.1);
  color: #1e293b;
}

[data-theme="light"] .opt-btn {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(0, 0, 0, 0.1);
  color: #475569;
}

[data-theme="light"] .opt-btn:hover {
  background: rgba(241, 245, 249, 0.95);
  border-color: rgba(59, 130, 246, 0.3);
}

.action-name {
  font-weight: 500;
}

/* 响应式适配 */
@media (max-width: 1024px) {
  .world-layout {
    grid-template-columns: 1fr 1.5fr;
    gap: 1.2rem;
  }
}

@media (max-width: 640px) {
  .top-actions-container {
    flex-wrap: wrap;
    justify-content: stretch;
    gap: 0.5rem;
  }
  .top-actions-container .action-item {
    flex: 1 1 45%;
    text-align: center;
    min-width: 120px;
  }
  .world-layout {
    /* 改为垂直堆叠布局 */
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: 100%;
    overflow: hidden;
    padding: 0;
  }

  .left-panel {
    order: 1;
    flex-shrink: 0;
    max-height: 35vh;
    overflow: hidden;
  }

  .details-container {
    order: 2;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .list-container {
    max-height: calc(35vh - 60px); /* 减去顶部按钮高度 */
    overflow-y: auto;
    /* 添加触摸滚动优化 */
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }

  /* 优化触摸体验 */
  .list-item,
  .action-item {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .map-options-grid { grid-template-columns: 1fr; }

  /* 细节优化 */
  .list-item {
    padding: 0.7rem 0.9rem;
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

  .details-container {
    padding: 0.75rem;
  }
}

@media (max-width: 480px) {
  .top-actions-container {
    flex-direction: column;
    align-items: stretch;
    padding: 0.4rem;
    gap: 0.4rem;
  }
  .top-actions-container .action-item {
    flex: 1 1 100%;
    text-align: center;
  }

  .world-selection-container {
    padding: 0.3rem;
    height: 100%;
  }

  .world-layout {
    gap: 0.5rem;
  }

  .left-panel {
    max-height: 32vh;
  }

  .list-container {
    max-height: calc(32vh - 110px); /* 减去顶部按钮堆叠后的高度 */
    padding: 0.4rem;
  }

  .list-item {
    padding: 0.6rem 0.8rem;
    font-size: 0.9rem;
    margin-bottom: 0.3rem;
    border-radius: 4px;
  }

  .details-container {
    padding: 0.75rem;
    border-radius: 6px;
  }

  .world-details h2 {
    font-size: 1.2rem;
    margin-bottom: 0.5rem;
  }

  .world-details .era {
    font-size: 0.9rem;
    margin-bottom: 0.8rem;
  }

  .description-scroll {
    font-size: 0.9rem;
    line-height: 1.5;
    padding-right: 0.3rem;
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

  .placeholder {
    font-size: 1rem;
    padding: 1rem;
    text-align: center;
    min-height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

@media (max-width: 360px) {
  .world-selection-container {
    padding: 0.3rem;
  }
  
  .world-layout {
    gap: 0.4rem;
    padding: 0;
  }
  
  .left-panel {
    max-height: 28vh;
  }
  
  .list-container {
    max-height: 24vh;
    padding: 0.3rem;
  }
  
  .list-item {
    padding: 0.5rem 0.6rem;
    font-size: 0.85rem;
    margin-bottom: 0.2rem;
  }
  
  .details-container {
    padding: 0.8rem;
    min-height: 120px;
  }
  
  .world-details h2 {
    font-size: 1.1rem;
    margin-bottom: 0.4rem;
  }
  
  .world-details .era {
    font-size: 0.8rem;
    margin-bottom: 0.6rem;
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
  }
}
</style>
