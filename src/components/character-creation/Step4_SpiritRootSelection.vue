<template>
  <div class="spirit-root-selection-container">
    <div v-if="isLoading" class="loading-state">天地玄黄，探查灵根...</div>
    <div v-else-if="error" class="error-state">天机混沌，无法探查：{{ error }}</div>

    <div v-else class="spirit-root-layout">
      <!-- 左侧面板：列表和操作按钮 -->
      <div class="spirit-root-left-panel">
        <div class="spirit-root-list-container" :class="{ 'multi-mode': store.mode === 'multi' }">
          <div
            class="spirit-root-item"
            :class="{
              selected: isRandomSelected,
              disabled: store.mode === 'multi'
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
              disabled: !canSelectSpiritRoot(root) || store.mode === 'multi'
            }"
            @click="selectSpiritRoot(root)"
          >
            <span class="spirit-root-name">{{ root.name }}</span>
            <span class="spirit-root-cost">{{ root.talent_cost }} 点</span>
          </div>
        </div>
        
        <!-- 单机模式功能按钮 -->
        <div v-if="store.mode === 'single'" class="single-actions-container">
          <div class="divider"></div>
          <button @click="showCustomPanel = true" class="action-item">
            <span class="action-name">自定义灵根</span>
          </button>
          <button @click="aiGenerateSpiritRoot" class="action-item">
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

    <!-- 自定义灵根面板 -->
    <div v-if="showCustomPanel" class="custom-panel-overlay" @click.self="showCustomPanel = false">
      <div class="custom-panel">
        <h2>自定义灵根</h2>
        <div class="form-group">
          <label>灵根名称</label>
          <input v-model="customRoot.name" type="text" placeholder="例如：混沌灵根" />
        </div>
        <div class="form-group">
          <label>灵根描述</label>
          <textarea v-model="customRoot.description" placeholder="描述这个灵根的特性..." rows="4"></textarea>
        </div>
        <div class="form-group">
          <label>倍率加成</label>
          <input v-model.number="customRoot.base_multiplier" type="number" step="0.1" min="0.1" max="10" />
        </div>
        <div class="form-actions">
          <button @click="showCustomPanel = false" class="btn btn-secondary">取消</button>
          <button @click="confirmCustomRoot" class="btn">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useCharacterCreationStore, type SpiritRoot } from '../../stores/characterCreationStore';
import { LOCAL_SPIRIT_ROOTS } from '../../data/localData';

const store = useCharacterCreationStore();
const spiritRoots = ref<SpiritRoot[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const isRandomSelected = ref(false);
const showCustomPanel = ref(false);

const customRoot = ref({
  name: '',
  description: '',
  base_multiplier: 1.0
});

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
      const response = await fetch(`http://127.0.0.1:12345/api/v1/creation_data?world_id=${store.selectedWorld.id}`);
      if (!response.ok) {
        throw new Error(`天网灵脉响应异常: ${response.status}`);
      }
      const data = await response.json();
      spiritRoots.value = data.spirit_roots || [];
    } catch (e: any) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  }
}

const canSelectSpiritRoot = (root: SpiritRoot) => {
  if (store.selectedSpiritRoot?.id === root.id) {
    return true; // Always allow deselecting
  }
  const currentCost = store.selectedSpiritRoot?.talent_cost ?? 0;
  const availablePoints = store.remainingTalentPoints + currentCost;
  return availablePoints >= root.talent_cost;
};

function selectSpiritRoot(root: SpiritRoot) {
  if (store.mode === 'multi' || !canSelectSpiritRoot(root)) {
    if(store.mode !== 'multi') {
      console.warn("天道点不足，无法选择此灵根。");
    }
    return;
  }
  store.selectedSpiritRoot = root;
  isRandomSelected.value = false;
}

function selectRandomSpiritRoot() {
  if (store.mode === 'multi') return;
  isRandomSelected.value = true;
  store.selectedSpiritRoot = null;
}

async function aiGenerateSpiritRoot() {
  isLoading.value = true;
  error.value = null;
  
  try {
    // AI生成灵根
    const aiTemplates = [
      { name: '时空灵根', description: '极其罕见的变异灵根，能够感知时空之力，修炼速度超乎想象。', base_multiplier: 3.0 },
      { name: '阴阳灵根', description: '天生阴阳同体，可同时修炼阴阳两种属性的功法，威力倍增。', base_multiplier: 2.5 },
      { name: '血脉灵根', description: '血脉中蕴含着古老的力量，随着修为提升会逐渐觉醒。', base_multiplier: 2.0 }
    ];
    
    const template = aiTemplates[Math.floor(Math.random() * aiTemplates.length)];
    const generatedRoot: SpiritRoot = {
      id: Date.now(),
      name: template.name,
      description: template.description,
      base_multiplier: template.base_multiplier,
      talent_cost: 0
    };
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    spiritRoots.value.unshift(generatedRoot);
    store.selectedSpiritRoot = generatedRoot;
    isRandomSelected.value = false;
    
  } catch (e: any) {
    error.value = 'AI推演失败';
  } finally {
    isLoading.value = false;
  }
}

function confirmCustomRoot() {
  if (!customRoot.value.name) {
    alert('请输入灵根名称');
    return;
  }
  
  const newRoot: SpiritRoot = {
    id: Date.now(),
    name: customRoot.value.name,
    description: customRoot.value.description || '自定义灵根',
    base_multiplier: customRoot.value.base_multiplier,
    talent_cost: 0
  };
  
  spiritRoots.value.unshift(newRoot);
  store.selectedSpiritRoot = newRoot;
  isRandomSelected.value = false;
  showCustomPanel.value = false;
  
  // 重置表单
  customRoot.value = {
    name: '',
    description: '',
    base_multiplier: 1.0
  };
}

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

.spirit-root-list-container.multi-mode {
  opacity: 0.6;
  background: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 10px,
    rgba(var(--color-primary-rgb), 0.05) 10px,
    rgba(var(--color-primary-rgb), 0.05) 20px
  );
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
  height: 100%;
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