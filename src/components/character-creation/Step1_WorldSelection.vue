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

      <!-- 中间面板：世界配置 -->
      <div class="config-panel">
        <h3>世界生成配置</h3>
        <div class="config-content">
          <div class="config-item">
            <label>势力规模</label>
            <select v-model="worldConfig.majorFactionsCount" class="config-select">
              <option value="3">小型世界 (约3个势力)</option>
              <option value="5">标准世界 (约5个势力)</option>
              <option value="7">大型世界 (约7个势力)</option>
              <option value="10">庞大世界 (约10个势力)</option>
            </select>
            <small class="config-hint">影响世界政治复杂度</small>
          </div>
          
          <div class="config-item">
            <label>地理密度</label>
            <select v-model="worldConfig.totalLocations" class="config-select">
              <option value="10">稀疏 (约10个地点)</option>
              <option value="15">适中 (约15个地点)</option>
              <option value="20">密集 (约20个地点)</option>
              <option value="25">超密集 (约25个地点)</option>
            </select>
            <small class="config-hint">决定世界地点的丰富程度</small>
          </div>
          
          <div class="config-item">
            <label>特殊属性</label>
            <select v-model="worldConfig.secretRealmsCount" class="config-select">
              <option value="2">稀少 (约2个)</option>
              <option value="4">常见 (约4个)</option>
              <option value="6">丰富 (约6个)</option>
              <option value="8">大量 (约8个)</option>
            </select>
            <small class="config-hint">为部分地点添加特殊属性(机遇/传承/危险)</small>
          </div>
          
          <div class="config-actions">
            <button @click="randomizeConfig" class="random-config-btn">
              🎲 随机配置
            </button>
            <button @click="resetConfig" class="reset-config-btn">
              🔄 重置默认
            </button>
          </div>
        </div>
      </div>

      <!-- 右侧面板：世界详情 -->
      <div class="details-container">
        <div v-if="store.selectedWorld" class="world-details">
          <h2>{{ store.selectedWorld.name }}</h2>
          <p class="era">【{{ store.selectedWorld.era || '时代未知' }}】</p>
          <div class="description-scroll">
            <p>{{ store.selectedWorld.description || '此界一片混沌，尚无描述。' }}</p>
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
import { useCharacterCreationStore } from '../../stores/characterCreationStore';
import type { World } from '../../types';
import CustomCreationModal from './CustomCreationModal.vue';
import { toast } from '../../utils/toast';
import { generateWorld } from '../../utils/tavernAI';

const emit = defineEmits(['ai-generate']);
const store = useCharacterCreationStore();
const isCustomModalVisible = ref(false);

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
  grid-template-columns: 1fr 320px 1.5fr;
  gap: 1.5rem;
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

/* 世界配置面板样式 */
.config-panel {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.config-panel h3 {
  margin: 0 0 1rem 0;
  color: var(--color-primary);
  font-size: 1rem;
  text-align: center;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.config-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex-shrink: 0;
}

.config-item label {
  font-weight: 500;
  color: var(--color-text);
  font-size: 0.85rem;
  line-height: 1.2;
}

.config-select {
  padding: 0.4rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.85rem;
  min-height: 32px;
}

.config-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.config-hint {
  color: var(--color-text-secondary);
  font-size: 0.7rem;
  margin-top: 0.2rem;
  font-style: italic;
  line-height: 1.3;
}

/* 配置操作按钮 */
.config-actions {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.8rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.random-config-btn,
.reset-config-btn {
  flex: 1;
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  min-height: 32px;
}

.random-config-btn:hover {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.reset-config-btn:hover {
  background: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

/* 响应式适配 - 优化的手机端适配，确保三栏内容完整显示 */
@media (max-width: 1400px) {
  .world-layout {
    grid-template-columns: 1fr 300px 1.3fr;
    gap: 1.2rem;
  }
}

@media (max-width: 1200px) {
  .world-layout {
    grid-template-columns: 1fr 280px 1.2fr;
    gap: 1rem;
  }
  
  .config-panel {
    padding: 0.8rem;
  }
  
  .details-container {
    padding: 1.2rem;
  }
}

@media (max-width: 1024px) {
  .world-layout {
    grid-template-columns: 0.8fr 260px 1fr;
    gap: 0.8rem;
  }
  
  .config-panel h3 {
    font-size: 0.9rem;
  }
  
  .config-item label {
    font-size: 0.8rem;
  }
  
  .config-select {
    font-size: 0.8rem;
    padding: 0.35rem;
  }
  
  .random-config-btn,
  .reset-config-btn {
    font-size: 0.75rem;
    padding: 0.4rem 0.5rem;
  }
}

@media (max-width: 768px) {
  .world-layout {
    /* 改为垂直堆叠布局，确保所有三个面板都能显示 */
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr;
    gap: 1rem;
    height: auto;
    overflow: visible;
    padding: 0.8rem;
  }
  
  .left-panel {
    order: 1;
    max-height: 40vh;
  }
  
  .config-panel {
    order: 2;
    padding: 1rem;
  }
  
  .details-container {
    order: 3;
    min-height: 200px;
    flex: 1;
  }
  
  .list-container {
    max-height: 35vh;
    /* 添加触摸滚动优化 */
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }
  
  .config-content {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.8rem;
  }
  
  .config-item {
    gap: 0.3rem;
  }
  
  .config-actions {
    grid-column: 1 / -1;
    gap: 0.6rem;
    margin-top: 0.8rem;
    padding-top: 0.8rem;
  }
  
  .random-config-btn,
  .reset-config-btn {
    font-size: 0.8rem;
    padding: 0.5rem;
  }
  
  /* 优化触摸体验 */
  .list-item,
  .action-item,
  .config-select {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
}

@media (max-width: 640px) {
  .world-layout {
    gap: 0.8rem;
    padding: 0.6rem;
  }
  
  .config-content {
    /* 在小屏幕上改为单列布局 */
    grid-template-columns: 1fr;
    gap: 0.6rem;
  }
  
  .config-actions {
    grid-column: 1;
    flex-direction: column;
    gap: 0.4rem;
  }
  
  .random-config-btn,
  .reset-config-btn {
    font-size: 0.85rem;
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
  
  .config-panel {
    padding: 0.9rem;
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
  
  .config-panel {
    padding: 0.8rem;
    border-radius: 6px;
  }
  
  .config-panel h3 {
    font-size: 0.9rem;
    margin-bottom: 0.8rem;
  }
  
  .config-item {
    gap: 0.4rem;
  }
  
  .config-item label {
    font-size: 0.8rem;
    font-weight: 600;
  }
  
  .config-select {
    font-size: 0.8rem;
    padding: 0.5rem;
    border-radius: 4px;
  }
  
  .config-hint {
    font-size: 0.7rem;
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
  
  .config-panel {
    padding: 0.6rem;
  }
  
  .config-panel h3 {
    font-size: 0.8rem;
    margin-bottom: 0.6rem;
  }
  
  .config-item label {
    font-size: 0.75rem;
  }
  
  .config-select {
    font-size: 0.75rem;
    padding: 0.4rem;
  }
  
  .config-hint {
    font-size: 0.65rem;
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
