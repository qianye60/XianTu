<template>
  <div class="world-selection-container">
    <div v-if="store.isLoading" class="loading-state">正在推演诸天万界...</div>
    <div v-else-if="store.error" class="error-state">天机紊乱：{{ store.error }}</div>

    <div v-else class="world-layout">
      <!-- 左侧面板：世界列表 -->
      <div class="left-panel">
        <div class="list-container">
          <div v-if="worldsList.length === 0" class="no-worlds-message">
            <div class="no-worlds-icon">🌌</div>
            <div class="no-worlds-text">
              {{ store.isLocalCreation ? '暂无本地世界数据' : '暂无云端世界数据' }}
            </div>
            <div v-if="!store.isLocalCreation" class="no-worlds-hint">
              请检查网络连接或联系管理员
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
            {{ world.name }}
          </div>
        </div>
        <!-- 功能按钮 -->
        <div class="single-actions-container">
          <!-- 单机模式下的按钮 -->
          <template v-if="store.isLocalCreation">
            <button @click="isCustomModalVisible = true" class="action-item shimmer-on-hover">
              <span class="action-name">自定义世界</span>
            </button>
          </template>

          <!-- AI推演按钮（两种模式都有） -->
          <button @click="handleAIGenerate" class="action-item shimmer-on-hover">
            <span class="action-name">AI推演</span>
          </button>
        </div>
      </div>

      <!-- 右侧面板：世界详情 + 地图生成选项 -->
      <div class="details-container">
        <div v-if="activeWorld" class="world-details">
          <div class="details-header">
            <h2 class="details-title">{{ activeWorld.name }}</h2>
            <button class="map-settings-btn" @click="showMapOptions = !showMapOptions" title="地图生成选项">
              <Settings :size="16" />
              <span class="btn-text">设置</span>
            </button>
          </div>
          <p class="era">【{{ activeWorld.era || '时代未知' }}】</p>

          <!-- 地图生成选项（移入右侧详情内，避免整体高度溢出） -->
          <div class="map-options" v-show="showMapOptions">
            <div class="map-options-header">地图生成选项</div>
            <div class="map-options-grid">
              <label class="option-item">
                <span class="option-label">主要势力</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  v-model.number="worldConfig.majorFactionsCount"
                />
              </label>
              <label class="option-item">
                <span class="option-label">地点总数</span>
                <input
                  type="number"
                  min="5"
                  max="100"
                  step="1"
                  v-model.number="worldConfig.totalLocations"
                />
              </label>
              <label class="option-item">
                <span class="option-label">秘境数量</span>
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="1"
                  v-model.number="worldConfig.secretRealmsCount"
                />
              </label>
            </div>
            <div class="map-options-actions">
              <button class="opt-btn" @click="randomizeConfig">随机</button>
              <button class="opt-btn" @click="resetConfig">重置</button>
            </div>
          </div>

          <div class="description-scroll" v-show="!showMapOptions">
            <p>{{ activeWorld.description || '此界一片混沌，尚无描述。' }}</p>
          </div>
        </div>
        <div v-else class="placeholder">
          请择一方大千世界，以定道基。
        </div>
      </div>
    </div>

    <CustomCreationModal
      :visible="isCustomModalVisible"
      title="自定义世界"
      :fields="customWorldFields"
      :validationFn="validateCustomWorld"
      @close="isCustomModalVisible = false"
      @submit="handleCustomSubmit"
    />

    <!-- AI生成逻辑已移至toast通知 -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Settings } from 'lucide-vue-next';
import { useCharacterCreationStore } from '../../stores/characterCreationStore';
import type { World } from '../../types';
import CustomCreationModal from './CustomCreationModal.vue';
import { toast } from '../../utils/toast';
import { generateWorld } from '../../utils/tavernAI';

const emit = defineEmits(['ai-generate']);
const store = useCharacterCreationStore();
const activeWorld = ref<World | null>(null); // For hover details view - 仿照天赋选择
const isCustomModalVisible = ref(false);
const showMapOptions = ref(false);

// 世界生成配置
const worldConfig = ref({
  majorFactionsCount: 5,
  totalLocations: 15,
  secretRealmsCount: 4
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

async function _handleLocalAIGenerate() {
  const toastId = 'ai-generate-world';
  toast.loading('天机推演中，请稍候...', { id: toastId });
  try {
    const newWorld = await generateWorld();
    if (newWorld) {
      newWorld.source = 'local'; // 显式设置来源为本地
      store.addWorld(newWorld); // 只更新内存
      handleSelectWorld(newWorld); // 自动选中
      toast.success(`AI推演世界 "${newWorld.name}" 已保存！`, { id: toastId });
    } else {
      // 如果 generateWorld 返回 null 或 undefined，也需要关闭loading
      toast.hide(toastId);
    }
  } catch (e: any) {
    // 错误在 tavernAI 中已通过toast提示，这里只需确保关闭loading
    toast.hide(toastId);
  }
}

function handleAIGenerate() {
  if (store.isLocalCreation) {
    _handleLocalAIGenerate();
  } else {
    emit('ai-generate');
  }
}

function handleSelectWorld(world: World) {
  store.selectWorld(world.id);
  // 保存世界生成配置到store，供后续使用
  store.setWorldGenerationConfig(worldConfig.value);
}

// 随机配置功能
function randomizeConfig() {
  const factionOptions = [3, 5, 7, 10];
  const locationOptions = [10, 15, 20, 25];
  const realmOptions = [2, 4, 6, 8];
  
  worldConfig.value = {
    majorFactionsCount: factionOptions[Math.floor(Math.random() * factionOptions.length)],
    totalLocations: locationOptions[Math.floor(Math.random() * locationOptions.length)],
    secretRealmsCount: realmOptions[Math.floor(Math.random() * realmOptions.length)]
  };
  
  // 立即保存配置到store
  store.setWorldGenerationConfig(worldConfig.value);
  toast.info('已随机生成世界配置');
}

// 重置为默认配置
function resetConfig() {
  worldConfig.value = {
    majorFactionsCount: 5,
    totalLocations: 15,
    secretRealmsCount: 4
  };
  
  // 立即保存配置到store
  store.setWorldGenerationConfig(worldConfig.value);
  toast.info('已重置为默认配置');
}

// fetchData 方法已不再需要，组件现在通过计算属性自动响应store的变化
</script>

<style scoped>
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
  padding: 0.8rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
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

.map-options-header {
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 0.6rem;
}

.map-options-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
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
  .world-layout {
    /* 改为垂直堆叠布局 */
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    gap: 1rem;
    height: auto;
    overflow: visible;
    padding: 0.8rem;
  }
  
  .left-panel {
    order: 1;
    max-height: 40vh;
  }
  
  .details-container {
    order: 2;
    min-height: 300px;
  }
  
  .list-container {
    max-height: 35vh;
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
}

@media (max-width: 640px) {
  .world-layout {
    gap: 0.8rem;
    padding: 0.6rem;
  }
  
  .left-panel {
    max-height: 35vh;
  }
  
  .list-container {
    max-height: 30vh;
    padding: 0.5rem;
  }
  
  .list-item {
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
  
  .details-container {
    padding: 1rem;
    min-height: 180px;
  }
}

@media (max-width: 480px) {
  .world-selection-container {
    padding: 0.4rem;
    height: 100vh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .world-layout {
    gap: 0.6rem;
    padding: 0;
    height: auto;
    min-height: calc(100vh - 2rem);
  }
  
  .left-panel {
    max-height: 32vh;
    border-radius: 6px;
  }
  
  .list-container {
    max-height: 28vh;
    padding: 0.4rem;
  }
  
  .list-item {
    padding: 0.6rem 0.8rem;
    font-size: 0.9rem;
    margin-bottom: 0.3rem;
    border-radius: 4px;
  }
  
  .details-container {
    padding: 1rem;
    min-height: 150px;
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
