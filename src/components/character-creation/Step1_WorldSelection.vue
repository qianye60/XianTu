<template>
  <div class="world-selection-container">
    <div v-if="store.isLoading" class="loading-state">正在推演诸天万界...</div>
    <div v-else-if="store.error" class="error-state">天机紊乱：{{ store.error }}</div>

    <div v-else class="world-layout">
      <!-- 左侧面板 -->
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

      <!-- 右侧详情 -->
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

    <!-- AI生成等待弹窗 -->
    <LoadingModal :visible="isGeneratingAI" message="天机推演中..." />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCharacterCreationStore } from '../../stores/characterCreationStore';
import type { World } from '../../types';
import CustomCreationModal from './CustomCreationModal.vue';
import LoadingModal from '../LoadingModal.vue';
import { toast } from '../../utils/toast';
import { generateWorld } from '../../utils/tavernAI';

const emit = defineEmits(['ai-generate']);
const store = useCharacterCreationStore();
const isCustomModalVisible = ref(false);
const isGeneratingAI = ref(false); // Local loading state for AI generation

const worldsList = computed(() => {
  const allWorlds = store.creationData.worlds;
  console.log("【世界选择】所有世界数据:", allWorlds);
  console.log("【世界选择】当前模式:", store.isLocalCreation ? '本地' : '联机');
  
  if (store.isLocalCreation) {
    const localWorlds = allWorlds.filter(world => 
      world.source === 'local'
    );
    console.log("【世界选择】本地模式世界列表:", localWorlds);
    return localWorlds;
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
  isGeneratingAI.value = true;
  try {
    const newWorld = await generateWorld();
    if (newWorld) {
      store.addWorld(newWorld); // 只更新内存
      // await saveGameData(store.creationData); // NOTE: 持久化由Pinia插件自动处理
      handleSelectWorld(newWorld); // 自动选中
      toast.success(`AI推演世界 "${newWorld.name}" 已保存！`);
    }
  } catch (e: any) {
    // 错误在 tavernAI 中已提示
  } finally {
    isGeneratingAI.value = false;
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
  border-left: 3px solid transparent;
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
</style>