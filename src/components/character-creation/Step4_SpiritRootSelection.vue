<template>
  <div class="spirit-root-selection-container">
    <div v-if="isLoading" class="loading-state">天地玄黄，探查灵根...</div>
    <div v-else-if="error" class="error-state">天机混沌，无法探查：{{ error }}</div>

    <div v-else class="spirit-root-layout">
      <!-- 左侧面板：列表和操作按钮 -->
      <div class="spirit-root-left-panel">
        <div class="spirit-root-list-container">
          <div
            class="spirit-root-item"
            :class="{
              selected: isRandomSelected
            }"
            @click="selectRandomSpiritRoot"
          >
            <span class="spirit-root-name">随机灵根</span>
            <span class="spirit-root-cost">0 点</span>
          </div>
          <div class="divider"></div>
          <div
            v-for="root in spiritRoots"
            :key="root.id"
            class="spirit-root-item"
            :class="{
              selected: store.selectedSpiritRoot?.id === root.id,
              disabled: !canSelectSpiritRoot(root)
            }"
            @click="selectSpiritRoot(root)"
          >
            <span class="spirit-root-name">{{ root.name }}</span>
            <span class="spirit-root-cost">{{ root.talent_cost }} 点</span>
          </div>
        </div>

        <!-- 功能按钮 -->
        <div class="single-actions-container">
          <div class="divider"></div>
          <button v-if="store.mode === 'single'" @click="isCustomModalVisible = true" class="action-item shimmer-on-hover">
            <span class="action-name">自定义灵根</span>
          </button>
          <button @click="handleAIGenerate" class="action-item shimmer-on-hover">
            <span class="action-name">AI推演</span>
          </button>
        </div>
      </div>

      <!-- 右侧详情 -->
      <div class="spirit-root-details-container">
        <div v-if="store.selectedSpiritRoot || isRandomSelected" class="spirit-root-details">
          <h2>{{ selectedDisplayName }}</h2>
          <div class="description-scroll">
            <p>{{ selectedDescription }}</p>
          </div>
          <div class="cost-display">
            消耗天道点: {{ selectedCost }}
          </div>
        </div>
        <div v-else class="placeholder">
          请选择一种灵根，或听天由命。
        </div>
      </div>
    </div>

    <CustomCreationModal
      :visible="isCustomModalVisible"
      title="自定义灵根"
      :fields="customSpiritRootFields"
      :validationFn="(data) => validateCustomData('spirit_root', data)"
      @close="isCustomModalVisible = false"
      @submit="handleCustomSubmit"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useCharacterCreationStore, type SpiritRoot } from '../../stores/characterCreationStore';
import { LOCAL_SPIRIT_ROOTS } from '../../data/localData';
import { request } from '../../services/request';
import CustomCreationModal from './CustomCreationModal.vue';
import { generateSpiritRootWithTavernAI, validateCustomData } from '../../utils/tavernAI';
import { toast } from '../../utils/toast';

const emit = defineEmits(['ai-generate']);
const store = useCharacterCreationStore();
const spiritRoots = ref<SpiritRoot[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const isRandomSelected = ref(false);
const isCustomModalVisible = ref(false);

const customSpiritRootFields = [
  { key: 'name', label: '灵根名称', type: 'text', placeholder: '例如：混沌灵根' },
  { key: 'description', label: '灵根描述', type: 'textarea', placeholder: '描述这个灵根的特性...' },
  { key: 'base_multiplier', label: '修炼倍率', type: 'text', placeholder: '例如：1.5' },
  { key: 'talent_cost', label: '消耗天道点', type: 'text', placeholder: '例如：10' },
] as const;

function handleCustomSubmit(data: any) {
  const newRoot: SpiritRoot = {
    id: Date.now(),
    name: data.name,
    description: data.description,
    base_multiplier: parseFloat(data.base_multiplier) || 1.0,
    talent_cost: parseInt(data.talent_cost, 10) || 0,
  };
  spiritRoots.value.unshift(newRoot);
  selectSpiritRoot(newRoot);
}

const selectedDisplayName = computed(() => {
  if (isRandomSelected.value) return '随机灵根';
  return store.selectedSpiritRoot?.name || '';
});

const selectedDescription = computed(() => {
  if (isRandomSelected.value) return '大道五十，天衍四九，人遁其一。选择此项，你的灵根将完全随机生成，可能一步登天，亦可能平庸无奇。';
  return store.selectedSpiritRoot?.description || '灵根信息不明。';
});

const selectedCost = computed(() => {
  if (isRandomSelected.value) return 0;
  return store.selectedSpiritRoot?.talent_cost || 0;
});

async function fetchSpiritRoots() {
  // 单机模式使用本地数据
  if (store.mode === 'single') {
    try {
      spiritRoots.value = LOCAL_SPIRIT_ROOTS.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        base_multiplier: r.base_multiplier,
        talent_cost: r.talent_cost
      }));

      setTimeout(() => {
        isLoading.value = false;
      }, 300);
    } catch (e: any) {
      error.value = '加载本地数据失败';
      isLoading.value = false;
    }
  } else {
    // 联机模式请求后端
    if (!store.selectedWorld) {
      error.value = "尚未选择世界，无法获取灵根数据。";
      isLoading.value = false;
      return;
    }

    try {
      const data = await request<any>(`/api/v1/creation_data?world_id=${store.selectedWorld.id}`);
      spiritRoots.value = data.spirit_roots || [];
    } catch (e: any) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  }
}

const canSelectSpiritRoot = (root: SpiritRoot) => {
  if (store.mode === 'multi') {
    return true; // In multi mode, server handles validation
  }
  if (store.selectedSpiritRoot?.id === root.id) {
    return true; // Always allow deselecting
  }
  const currentCost = store.selectedSpiritRoot?.talent_cost ?? 0;
  const availablePoints = store.remainingTalentPoints + currentCost;
  return availablePoints >= root.talent_cost;
};

function selectSpiritRoot(root: SpiritRoot) {
  if (store.mode === 'single' && !canSelectSpiritRoot(root)) {
    toast.warning("天道点不足，无法选择此灵根。");
    return;
  }
  store.selectedSpiritRoot = root;
  isRandomSelected.value = false;
}

function selectRandomSpiritRoot() {
  isRandomSelected.value = true;
  store.selectedSpiritRoot = null;
}

async function _handleLocalAIGenerate() {
  isLoading.value = true;
  error.value = null;
  try {
    const newRoot = await generateSpiritRootWithTavernAI();
    spiritRoots.value.unshift(newRoot);
    selectSpiritRoot(newRoot);
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
    const newRoot = await request<SpiritRoot>('/api/v1/ai_redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, type: 'spirit_root' }),
    });
    spiritRoots.value.unshift(newRoot);
    selectSpiritRoot(newRoot);
    toast.success('天机接引成功！');
  } catch (e: any) {
    error.value = `AI推演失败: ${e.message}`;
  } finally {
    isLoading.value = false;
  }
}

defineExpose({
  handleAIGenerateWithCode,
  fetchData: fetchSpiritRoots,  // 暴露数据获取方法
});

onMounted(() => {
  fetchSpiritRoots();
  // Check if random was previously selected
  if (!store.selectedSpiritRoot) {
    isRandomSelected.value = true;
  }
});
</script>

<style scoped>
.spirit-root-selection-container {
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

.spirit-root-layout {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
  height: 100%;
  overflow: hidden;
}

/* 左侧面板容器 */
.spirit-root-left-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.spirit-root-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  transition: var(--transition-fast);
}

/* 美化滚动条 */
.spirit-root-list-container::-webkit-scrollbar {
  width: 8px;
}

.spirit-root-list-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.spirit-root-list-container::-webkit-scrollbar-thumb {
  background: rgba(136, 192, 208, 0.3);
  border-radius: 4px;
}

.spirit-root-list-container::-webkit-scrollbar-thumb:hover {
  background: rgba(136, 192, 208, 0.5);
}

.spirit-root-item {
  display: flex;
  justify-content: space-between;
  padding: 0.8rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border-left: 3px solid transparent;
}

.spirit-root-item:hover {
  background: rgba(136, 192, 208, 0.1);
}

.spirit-root-item.selected {
  background: rgba(136, 192, 208, 0.2);
  color: #88c0d0;
  border-left: 3px solid #88c0d0;
}

.spirit-root-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: transparent;
  color: #888;
}

.spirit-root-name {
  font-weight: 500;
}

.spirit-root-cost {
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
    rgba(136, 192, 208, 0.3),
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

/* 右侧详情容器 */
.spirit-root-details-container {
  border: 1px solid #444;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

.spirit-root-details {
  padding: 1rem;
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
  padding-bottom: 0.5rem;
  min-height: 0;
}

.description-scroll p {
  margin: 0;
  white-space: pre-wrap;
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
  background: rgba(136, 192, 208, 0.3);
  border-radius: 4px;
}

.description-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(136, 192, 208, 0.5);
}

.cost-display {
  text-align: right;
  font-weight: bold;
  color: var(--color-accent);
  flex-shrink: 0;
  margin-top: 1rem;
}

/* 自定义面板 */
.custom-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.custom-panel {
  background: var(--color-surface);
  border: 2px solid var(--color-primary);
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.custom-panel h2 {
  margin-top: 0;
  color: var(--color-primary);
  text-align: center;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text);
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 1rem;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 10px rgba(var(--color-primary-rgb), 0.3);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}
</style>
