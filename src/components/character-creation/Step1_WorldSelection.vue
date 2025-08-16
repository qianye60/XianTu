<template>
  <div class="world-selection-container">
    <div v-if="isLoading" class="loading-state">正在推演诸天万界...</div>
    <div v-else-if="error" class="error-state">天机紊乱，无法窥得世界列表：{{ error }}</div>

    <div v-else class="world-layout">
      <!-- 左侧面板 -->
      <div class="left-panel">
        <div class="list-container">
          <div
            v-for="world in worlds"
            :key="world.id"
            class="list-item"
            :class="{ selected: store.selectedWorld?.id === world.id }"
            @click="selectWorld(world)"
          >
            {{ world.name }}
          </div>
        </div>
        <!-- 功能按钮 -->
        <div class="single-actions-container">
          <button v-if="store.mode === 'single'" @click="isCustomModalVisible = true" class="action-item shimmer-on-hover">
            <span class="action-name">自定义世界</span>
          </button>
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
      :validationFn="(data) => validateCustomData('world', data)"
      @close="isCustomModalVisible = false"
      @submit="handleCustomSubmit"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useCharacterCreationStore, type World } from '../../stores/characterCreationStore';
import { LOCAL_WORLDS } from '../../data/localData';
import { request } from '../../services/request';
import CustomCreationModal from './CustomCreationModal.vue';
import { generateWorldWithTavernAI, validateCustomData } from '../../utils/tavernAI';
import { toast } from '../../utils/toast';

const emit = defineEmits(['ai-generate']);
const store = useCharacterCreationStore();
const worlds = ref<World[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const isCustomModalVisible = ref(false);

const customWorldFields = [
  { key: 'name', label: '世界名称', type: 'text', placeholder: '例如：九霄界' },
  { key: 'era', label: '时代背景', type: 'text', placeholder: '例如：仙道昌隆' },
  { key: 'description', label: '世界描述', type: 'textarea', placeholder: '描述这个世界的背景故事、修炼体系特点等...' }
] as const;

function handleCustomSubmit(data: any) {
  const newWorld: World = {
    id: Date.now(),
    name: data.name,
    era: data.era,
    description: data.description,
  };
  worlds.value.unshift(newWorld);
  selectWorld(newWorld);
}

async function _handleLocalAIGenerate() {
  isLoading.value = true;
  error.value = null;
  try {
    const newWorld = await generateWorldWithTavernAI();
    worlds.value.unshift(newWorld);
    selectWorld(newWorld);
  } catch (e: any) {
    error.value = `AI推演失败: ${e.message}`;
    toast.error(error.value);
  } finally {
    isLoading.value = false;
  }
}

function handleAIGenerate() {
  if (store.mode === 'single') {
    _handleLocalAIGenerate();
  } else {
    // 触发父组件显示兑换码弹窗
    emit('ai-generate');
  }
}

async function handleAIGenerateWithCode(code: string) {
  isLoading.value = true;
  error.value = null;
  try {
    const newWorld = await request<World>('/api/v1/ai_redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, type: 'world' }),
    });
    worlds.value.unshift(newWorld);
    selectWorld(newWorld);
    toast.success('天机接引成功！');
  } catch (e: any) {
    error.value = `AI推演失败: ${e.message}`;
    // 错误已在request中处理，不再重复显示
  } finally {
    isLoading.value = false;
  }
}

defineExpose({
  handleAIGenerateWithCode,
  fetchData: fetchWorlds,  // 暴露数据获取方法
});

async function fetchWorlds() {
  // 单机模式使用本地数据
  if (store.mode === 'single') {
    try {
      // 使用本地的世界数据（从localData.ts导入）
      const localWorlds: World[] = LOCAL_WORLDS.map(w => ({
        id: w.id,
        name: w.name,
        era: w.era,
        description: w.description
      }));

      worlds.value = localWorlds;

      // 默认选择第一个世界
      if (localWorlds.length > 0 && !store.selectedWorld) {
        store.selectedWorld = localWorlds[0];
      }

      // 模拟加载延迟
      setTimeout(() => {
        isLoading.value = false;
      }, 500);
    } catch (e: any) {
      error.value = '加载本地数据失败';
      isLoading.value = false;
    }
  } else {
    // 联机模式才请求后端
    try {
      worlds.value = await request<World[]>('/api/v1/worlds');

      // 默认选择第一个世界
      if (worlds.value.length > 0 && !store.selectedWorld) {
        store.selectedWorld = worlds.value[0];
      }
    } catch (e: any) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  }
}

function selectWorld(world: World) {
  store.selectedWorld = world;
}

onMounted(() => {
  fetchWorlds();
});
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
  color: #888;
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
  background: rgba(229, 192, 123, 0.1);
}

.list-item.selected {
  background: rgba(229, 192, 123, 0.2);
  color: #e5c07b;
  border-left: 3px solid #e5c07b;
}

.details-container {
  border: 1px solid #444;
  flex: 1;
  border-radius: 8px;
  padding: 1rem;
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

.world-details h2 {
  margin-top: 0;
  color: #e5c07b;
  flex-shrink: 0;
}

.world-details .era {
  font-style: italic;
  color: #88c0d0;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.description-scroll {
  flex: 1;
  overflow-y: auto;
  line-height: 1.6;
  padding-right: 0.5rem;
  padding-bottom: 0.5rem; /* 添加底部内边距防止内容被截断 */
  min-height: 0; /* 重要：确保flex子元素可以收缩 */
}

.description-scroll p {
  margin: 0;
  white-space: pre-wrap; /* 保留换行符 */
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
  background: rgba(229, 192, 123, 0.3);
  border-radius: 4px;
}

.list-container::-webkit-scrollbar-thumb:hover,
.description-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(229, 192, 123, 0.5);
}

/* 单机模式功能按钮样式 */
.single-actions-container {
  border-top: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem;
}

.action-item {
  display: flex;
  justify-content: space-between;
  padding: 0.8rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border: none;
  background: transparent;
  color: var(--color-text);
  width: 100%;
  text-align: left;
  font-size: 1rem;
}

.action-item:last-child {
  margin-bottom: 0;
}

.action-item:hover {
  background: rgba(var(--color-primary-rgb), 0.1);
}

.action-name {
  font-weight: 500;
  color: var(--color-primary);
}
</style>
