<template>
  <div class="origin-selection-container">
    <div v-if="isLoading" class="loading-state">追溯过往，探寻出身...</div>
    <div v-else-if="error" class="error-state">因果不明，无法探寻：{{ error }}</div>

    <div v-else class="origin-layout">
      <!-- 左侧栏：列表和操作按钮 -->
      <div class="origin-left-panel">
        <div class="origin-list-container">
          <div
            v-for="origin in origins"
            :key="origin.id"
            class="origin-item"
            :class="{
              selected: store.selectedOrigin?.id === origin.id,
              disabled: !canSelectOrigin(origin)
            }"
            @click="selectOrigin(origin)"
          >
            <span class="origin-name">{{ origin.name }}</span>
            <span class="origin-cost">{{ origin.talent_cost }} 点</span>
          </div>
        </div>

        <!-- 功能按钮 -->
        <div class="single-actions-container">
          <div class="divider"></div>
          <button v-if="store.mode === 'single'" @click="isCustomModalVisible = true" class="action-item shimmer-on-hover">
            <span class="action-name">自定义出身</span>
          </button>
          <button @click="handleAIGenerate" class="action-item shimmer-on-hover">
            <span class="action-name">AI推演</span>
          </button>
        </div>
      </div>

      <!-- 右侧详情 -->
      <div class="origin-details-container">
        <div v-if="store.selectedOrigin" class="origin-details">
          <h2>{{ store.selectedOrigin.name }}</h2>
          <div class="description-scroll">
            <p>{{ store.selectedOrigin.description || '身世如谜，过往一片空白。' }}</p>
          </div>
          <div class="cost-display">
            消耗天道点: {{ store.selectedOrigin.talent_cost }}
          </div>
        </div>
        <div v-else class="placeholder">
          请选择一处出身。
        </div>
      </div>
    </div>

    <CustomCreationModal
      :visible="isCustomModalVisible"
      title="自定义出身"
      :fields="customOriginFields"
      :validationFn="(data) => validateCustomData('origin', data)"
      @close="isCustomModalVisible = false"
      @submit="handleCustomSubmit"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useCharacterCreationStore, type Origin } from '../../stores/characterCreationStore';
import { LOCAL_ORIGINS } from '../../data/localData';
import { request } from '../../services/request';
import CustomCreationModal from './CustomCreationModal.vue';
import { generateOriginWithTavernAI, validateCustomData } from '../../utils/tavernAI';
import { toast } from '../../utils/toast';

const emit = defineEmits(['ai-generate']);
const store = useCharacterCreationStore();
const origins = ref<Origin[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const isCustomModalVisible = ref(false);

const creationData = ref<any>(null);

const customOriginFields = [
  { key: 'name', label: '出身名称', type: 'text', placeholder: '例如：山野遗孤' },
  { key: 'description', label: '出身描述', type: 'textarea', placeholder: '描述此出身的背景故事...' },
  { key: 'talent_cost', label: '消耗天道点', type: 'text', placeholder: '例如：0' }
] as const;

function handleCustomSubmit(data: any) {
  const newOrigin: Origin = {
    id: Date.now(),
    name: data.name,
    description: data.description,
    talent_cost: parseInt(data.talent_cost, 10) || 0,
    attribute_modifiers: null,
  };
  origins.value.unshift(newOrigin);
  selectOrigin(newOrigin);
}

async function fetchCreationData() {
  // 单机模式使用本地数据
  if (store.mode === 'single') {
    // 单机模式不需要检查是否选择了世界，使用本地数据即可
    try {
      // 使用本地的出身数据（从localData.ts导入）
      const localOrigins: Origin[] = LOCAL_ORIGINS.map(o => ({
        id: o.id,
        name: o.name,
        description: o.description,
        attribute_modifiers: o.attribute_modifiers,
        talent_cost: o.talent_cost
      }));

      creationData.value = { origins: localOrigins };
      origins.value = localOrigins;

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
    if (!store.selectedWorld) {
      error.value = "尚未选择世界，无法获取出身数据。";
      isLoading.value = false;
      return;
    }

    try {
      const data = await request<any>(`/api/v1/creation_data?world_id=${store.selectedWorld.id}`);
      creationData.value = data;
      origins.value = data.origins || [];
    } catch (e: any) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  }
}

const canSelectOrigin = (origin: Origin) => {
  if (store.mode === 'multi') {
    return true; // In multi mode, server handles validation
  }
  if (store.selectedOrigin?.id === origin.id) {
    return true; // Always allow deselecting the current one
  }
  const currentCost = store.selectedOrigin?.talent_cost ?? 0;
  const availablePoints = store.remainingTalentPoints + currentCost;
  return availablePoints >= origin.talent_cost;
};

function selectOrigin(origin: Origin) {
  if (store.mode === 'single' && !canSelectOrigin(origin)) {
    toast.warning("天道点不足，无法选择此出身。");
    return;
  }
  store.selectedOrigin = origin;
}

async function _handleLocalAIGenerate() {
  if (!store.selectedWorld) {
    error.value = "请先选择一个世界，方能推演相应出身。";
    toast.error(error.value);
    return;
  }

  isLoading.value = true;
  error.value = null;
  try {
    const newOrigin = await generateOriginWithTavernAI(store.selectedWorld);
    origins.value.unshift(newOrigin);
    // AI生成的出身，直接选中，不校验点数
    store.selectedOrigin = newOrigin;
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
    emit('ai-generate');
  }
}

async function handleAIGenerateWithCode(code: string) {
  isLoading.value = true;
  error.value = null;
  try {
    const newOrigin = await request<Origin>('/api/v1/ai_redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, type: 'origin' }),
    });
    origins.value.unshift(newOrigin);
    store.selectedOrigin = newOrigin;
    toast.success('天机接引成功！');
  } catch (e: any) {
    error.value = `AI推演失败: ${e.message}`;
  } finally {
    isLoading.value = false;
  }
}


onMounted(() => {
  fetchCreationData();
});

defineExpose({
  handleAIGenerateWithCode,
  fetchData: fetchCreationData,  // 暴露数据获取方法
});
</script>

<style scoped>
.origin-selection-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.loading-state, .error-state, .placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 1.2rem;
  color: #888;
}

.origin-layout {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
  height: 100%;
  overflow: hidden;
}

/* 左侧面板容器 */
.origin-left-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.origin-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  transition: var(--transition-fast);
}

/* 美化滚动条 */
.origin-list-container::-webkit-scrollbar {
  width: 8px;
}

.origin-list-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.origin-list-container::-webkit-scrollbar-thumb {
  background: rgba(229, 192, 123, 0.3);
  border-radius: 4px;
}

.origin-list-container::-webkit-scrollbar-thumb:hover {
  background: rgba(229, 192, 123, 0.5);
}

.origin-item {
  display: flex;
  justify-content: space-between;
  padding: 0.8rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border-left: 3px solid transparent;
}

.origin-item:hover {
  background: rgba(229, 192, 123, 0.1);
}

.origin-item.selected {
  background: rgba(229, 192, 123, 0.2);
  color: #e5c07b;
  border-left: 3px solid #e5c07b;
}

.origin-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: transparent;
  color: #888;
}

.origin-name {
  font-weight: 500;
}

.origin-cost {
  color: var(--color-accent);
}

.origin-details-container {
  border: 1px solid #444;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

.origin-details {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.origin-details h2 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #e5c07b;
  flex-shrink: 0;
}

.description-scroll {
  flex: 1;
  overflow-y: auto;
  line-height: 1.6;
  margin-bottom: 1rem;
  padding-right: 0.5rem;
}

/* 美化详情容器滚动条 */
.description-scroll::-webkit-scrollbar {
  width: 8px;
}

.description-scroll::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.description-scroll::-webkit-scrollbar-thumb {
  background: rgba(229, 192, 123, 0.3);
  border-radius: 4px;
}

.description-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(229, 192, 123, 0.5);
}

.cost-display {
  text-align: right;
  font-weight: bold;
  color: var(--color-accent);
}

/* 单机模式功能按钮样式 */
.single-actions-container {
    border-top: 1px solid var(--color-border);
    background: rgba(0, 0, 0, 0.3);
    padding: 0.5rem;
}

.divider {
    height: 1px;
    background: linear-gradient(
      to right,
      transparent,
      rgba(229, 192, 123, 0.3),
      transparent
    );
    margin: 0.5rem 0;
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

.action-item:hover {
    background: rgba(var(--color-primary-rgb), 0.1);
}

.action-name {
    font-weight: 500;
    color: var(--color-primary);
}

.action-cost {
    color: var(--color-accent);
}
</style>
