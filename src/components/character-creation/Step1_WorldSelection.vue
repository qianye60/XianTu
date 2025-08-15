<template>
  <div class="world-selection-container">
    <div v-if="isLoading" class="loading-state">正在推演诸天万界...</div>
    <div v-else-if="error" class="error-state">天机紊乱，无法窥得世界列表：{{ error }}</div>
    
    <div v-else class="world-layout">
      <div class="world-list-container">
        <div 
          v-for="world in worlds" 
          :key="world.id" 
          class="world-item"
          :class="{ selected: store.selectedWorld?.id === world.id }"
          @click="selectWorld(world)"
        >
          {{ world.name }}
        </div>
      </div>

      <div class="world-details-container">
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useCharacterCreationStore, type World } from '../../stores/characterCreationStore';
import { LOCAL_WORLDS } from '../../data/localData';

const store = useCharacterCreationStore();
const worlds = ref<World[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);

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
      const response = await fetch('http://127.0.0.1:12345/api/v1/worlds');
      if (!response.ok) {
        throw new Error(`天网灵脉响应异常: ${response.status}`);
      }
      worlds.value = await response.json();
      
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

.world-list-container {
  overflow-y: auto;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 0.5rem;
}

.world-item {
  padding: 0.8rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border-left: 3px solid transparent;
}

.world-item:hover {
  background: rgba(229, 192, 123, 0.1);
}

.world-item.selected {
  background: rgba(229, 192, 123, 0.2);
  color: #e5c07b;
  border-left: 3px solid #e5c07b;
}

.world-details-container {
  border: 1px solid #444;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
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
.world-list-container::-webkit-scrollbar,
.description-scroll::-webkit-scrollbar {
  width: 8px;
}

.world-list-container::-webkit-scrollbar-track,
.description-scroll::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.world-list-container::-webkit-scrollbar-thumb,
.description-scroll::-webkit-scrollbar-thumb {
  background: rgba(229, 192, 123, 0.3);
  border-radius: 4px;
}

.world-list-container::-webkit-scrollbar-thumb:hover,
.description-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(229, 192, 123, 0.5);
}
</style>