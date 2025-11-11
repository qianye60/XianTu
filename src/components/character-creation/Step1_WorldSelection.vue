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

            <!-- 高级选项折叠区 -->
            <div class="advanced-section">
              <button class="advanced-toggle" @click="showAdvancedOptions = !showAdvancedOptions">
                <span>{{ showAdvancedOptions ? '▼' : '▶' }}</span>
                <span>{{ $t('高级选项（地图技术参数）') }}</span>
              </button>

              <div v-show="showAdvancedOptions" class="advanced-content">
                <div class="map-options-grid">
                  <label class="option-item">
                    <span class="option-label">{{ $t('地图宽度') }}</span>
                    <input type="number" min="1000" max="8000" step="100" v-model.number="worldConfig.mapConfig.width" />
                    <span class="config-hint">{{ $t('推荐: 3600') }}</span>
                  </label>
                  <label class="option-item">
                    <span class="option-label">{{ $t('地图高度') }}</span>
                    <input type="number" min="1000" max="8000" step="100" v-model.number="worldConfig.mapConfig.height" />
                    <span class="config-hint">{{ $t('推荐: 2400') }}</span>
                  </label>
                </div>
                <div class="map-options-grid geo-grid">
                  <label class="option-item">
                    <span class="option-label">{{ $t('经度范围') }}</span>
                    <div class="range-inputs">
                      <input type="number" step="0.1" v-model.number="worldConfig.mapConfig.minLng" :placeholder="$t('最小经度')" />
                      <span>-</span>
                      <input type="number" step="0.1" v-model.number="worldConfig.mapConfig.maxLng" :placeholder="$t('最大经度')" />
                    </div>
                  </label>
                  <label class="option-item">
                    <span class="option-label">{{ $t('纬度范围') }}</span>
                    <div class="range-inputs">
                      <input type="number" step="0.1" v-model.number="worldConfig.mapConfig.minLat" :placeholder="$t('最小纬度')" />
                      <span>-</span>
                      <input type="number" step="0.1" v-model.number="worldConfig.mapConfig.maxLat" :placeholder="$t('最大纬度')" />
                    </div>
                  </label>
                </div>
              </div>
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

const emit = defineEmits(['ai-generate']);
const store = useCharacterCreationStore();
const activeWorld = ref<World | null>(null); // For hover details view - 仿照天赋选择
const isCustomModalVisible = ref(false);
const showMapOptions = ref(false);
const showAdvancedOptions = ref(false);
const isEditModalVisible = ref(false);
const isAIPromptModalVisible = ref(false);
const editingWorld = ref<World | null>(null);

// --- 世界生成配置 ---

// 创建一个稳定的默认配置
const createDefaultWorldConfig = () => ({
  majorFactionsCount: 5,
  totalLocations: 12,
  secretRealmsCount: 5,
  continentCount: 4,
  mapConfig: {
    width: 3600,
    height: 2400,
    minLng: 100.0,
    maxLng: 130.0,
    minLat: 25.0,
    maxLat: 45.0,
  }
});

// 初始时使用随机配置，但结构基于默认配置
const worldConfig = ref({
  majorFactionsCount: Math.floor(Math.random() * 3) + 4, // 4-6
  totalLocations: Math.floor(Math.random() * 4) + 10, // 10-13
  secretRealmsCount: Math.floor(Math.random() * 3) + 4, // 4-6
  continentCount: Math.floor(Math.random() * 3) + 3, // 3-5
  mapConfig: { ...createDefaultWorldConfig().mapConfig }
});

// 监听配置变化并自动保存到store
watch(worldConfig, (newConfig) => {
  store.setWorldGenerationConfig(newConfig);
  console.log('[世界配置] 配置已更新:', newConfig);
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
    const cloudWorlds = allWorlds.filter(world =>
      world.source === 'cloud'
    );
    console.log("【世界选择】联机模式世界列表:", cloudWorlds);
    console.log("【世界选择】云端世界数量:", cloudWorlds.length);

    if (cloudWorlds.length === 0) {
      console.warn("【世界选择】警告：联机模式下没有找到云端世界数据！");
      console.log("【世界选择】尝试查看所有世界的source字段:", allWorlds.map(w => ({ name: w.name, source: w.source, id: w.id })));
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
      // 尝试提取JSON（可能包含在代码块中）
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      parsedWorld = JSON.parse(jsonStr.trim());
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

// 随机配置功能（增强版）
function randomizeConfig() {
  const factionOptions = [3, 4, 5, 6, 7];
  const locationOptions = [8, 10, 12, 15, 18];
  const realmOptions = [3, 4, 5, 6, 8];
  const continentOptions = [3, 4, 5, 6];

  // 随机化地理坐标
  const baseMinLng = 90 + Math.random() * 30; // 90-120
  const lngRange = 20 + Math.random() * 20; // 20-40
  const baseMinLat = 20 + Math.random() * 20; // 20-40
  const latRange = 15 + Math.random() * 15; // 15-30

  worldConfig.value = {
    majorFactionsCount: factionOptions[Math.floor(Math.random() * factionOptions.length)],
    totalLocations: locationOptions[Math.floor(Math.random() * locationOptions.length)],
    secretRealmsCount: realmOptions[Math.floor(Math.random() * realmOptions.length)],
    continentCount: continentOptions[Math.floor(Math.random() * continentOptions.length)],
    mapConfig: {
      width: 3600,
      height: 2400,
      minLng: parseFloat(baseMinLng.toFixed(1)),
      maxLng: parseFloat((baseMinLng + lngRange).toFixed(1)),
      minLat: parseFloat(baseMinLat.toFixed(1)),
      maxLat: parseFloat((baseMinLat + latRange).toFixed(1)),
    }
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
  const mapCfg = worldConfig.value.mapConfig;
  return worldConfig.value.majorFactionsCount > 8 ||
         worldConfig.value.totalLocations > 15 ||
         worldConfig.value.secretRealmsCount > 10 ||
         mapCfg.width > 6000 ||
         mapCfg.height > 6000 ||
         mapCfg.minLng >= mapCfg.maxLng ||
         mapCfg.minLat >= mapCfg.maxLat;
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
  font-size: 1.2rem;
  color: var(--color-text-secondary);
}

.world-layout {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
  height: 100%;
  overflow: hidden;
}

.left-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-surface);
}

.list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-grow: 1;
}

.item-name {
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

.list-item:hover .action-buttons {
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

.list-item:hover {
  background: var(--color-surface-light);
}

.list-item.selected {
  background: rgba(var(--color-primary-rgb), 0.2);
  color: var(--color-primary);
  font-weight: 600;
  border-left: 3px solid var(--color-primary);
}

.details-container {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  background: var(--color-surface);
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
}

.map-settings-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface-light);
  color: var(--color-text);
  cursor: pointer;
}

.map-settings-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.world-details h2 {
  margin-top: 0;
  color: var(--color-primary);
  flex-shrink: 0;
}

.world-details .era {
  font-style: italic;
  color: var(--color-accent);
  margin-bottom: 1rem;
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
}

/* 地图生成选项样式 */
.map-options {
  margin-top: 0.8rem;
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  padding: 0.8rem;
  background: var(--color-surface);
  /* 当显示设置时，该区域可占满并内部滚动 */
  flex: 1 1 auto;
  overflow: auto;
}

/* 配置警告样式 */
.config-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 6px;
  color: #856404;
}

.warning-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.warning-text {
  flex: 1;
}

.warning-title {
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
  color: #856404;
}

.warning-desc {
  font-size: 0.85rem;
  color: #6c5ce7;
  line-height: 1.4;
}

/* 风险配置输入框样式 */
.option-item input.config-risky {
  border-color: #ffc107;
  background-color: rgba(255, 193, 7, 0.05);
  box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.1);
}

.option-item input.config-risky:focus {
  border-color: #ff9800;
  box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.2);
}

/* 配置提示文字 */
.config-hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  opacity: 0.8;
  margin-top: 0.2rem;
}

.map-options-header {
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 0.6rem;
}

.map-options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.8rem;
}

.geo-grid {
  margin-top: 0.8rem;
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
  color: var(--color-text-secondary);
}

.option-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.option-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.option-item input {
  width: 100%;
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
}

.map-options-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.6rem;
}

.opt-btn {
  padding: 0.45rem 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface-light);
  cursor: pointer;
}

.opt-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* Custom Scrollbar */
.list-container::-webkit-scrollbar,
.description-scroll::-webkit-scrollbar {
  width: 8px;
}

.list-container::-webkit-scrollbar-track,
.description-scroll::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.list-container::-webkit-scrollbar-thumb,
.description-scroll::-webkit-scrollbar-thumb {
  background: rgba(var(--color-primary-rgb), 0.3);
  border-radius: 4px;
}

.list-container::-webkit-scrollbar-thumb:hover,
.description-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--color-primary-rgb), 0.5);
}

/* 无世界数据时的显示 */
.no-worlds-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
  color: var(--color-text-secondary);
}

.no-worlds-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.no-worlds-text {
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.no-worlds-hint {
  font-size: 0.9rem;
  opacity: 0.7;
  font-style: italic;
}

.single-actions-container {
  border-top: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem;
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
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
}

.action-item:hover {
  background: var(--color-surface-lighter);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.action-name {
  font-weight: 500;
  margin-left: 0.25rem;
}

.action-icon {
  font-size: 1.1em;
  vertical-align: middle;
}

.action-item:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
