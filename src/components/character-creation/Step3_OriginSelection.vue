<template>
  <div class="origin-selection-container">
    <div v-if="isLoading" class="loading-state">追溯过往，探寻出身...</div>
    <div v-else-if="error" class="error-state">因果不明，无法探寻：{{ error }}</div>

    <div v-else class="origin-layout">
      <!-- 左侧栏：列表和操作按钮 -->
      <div class="origin-left-panel">
        <div class="origin-list-container" :class="{ 'multi-mode': store.mode === 'multi' }">
          <div
            v-for="origin in origins"
            :key="origin.id"
            class="origin-item"
            :class="{
              selected: store.selectedOrigin?.id === origin.id,
              disabled: !canSelectOrigin(origin) || store.mode === 'multi'
            }"
            @click="selectOrigin(origin)"
          >
            <span class="origin-name">{{ origin.name }}</span>
            <span class="origin-cost">{{ origin.talent_cost }} 点</span>
          </div>
        </div>

        <!-- 单机模式功能按钮 -->
        <div v-if="store.mode === 'single'" class="single-actions-container">
          <div class="divider"></div>
          <button @click="customOrigin" class="action-item">
            <span class="action-name">自定义出身</span>
          </button>
          <button @click="aiGenerateOrigin" class="action-item">
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

    <!-- 联机模式兑换码 -->
    <div v-if="store.mode === 'multi'" class="redemption-container">
        <div class="redemption-code">
            <input type="text" v-model="redemptionCode" placeholder="输入兑换码以接引天机" />
            <button @click="redeemCode" class="btn">兑换</button>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useCharacterCreationStore, type Origin } from '../../stores/characterCreationStore';
import { LOCAL_ORIGINS } from '../../data/localData';

const store = useCharacterCreationStore();
const origins = ref<Origin[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const redemptionCode = ref('');

const creationData = ref<any>(null);

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
      const response = await fetch(`http://127.0.0.1:12345/api/v1/creation_data?world_id=${store.selectedWorld.id}`);
      if (!response.ok) {
        throw new Error(`天网灵脉响应异常: ${response.status}`);
      }
      const data = await response.json();
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
  if (store.selectedOrigin?.id === origin.id) {
    return true; // Always allow deselecting the current one
  }
  const currentCost = store.selectedOrigin?.talent_cost ?? 0;
  const availablePoints = store.remainingTalentPoints + currentCost;
  return availablePoints >= origin.talent_cost;
};

function selectOrigin(origin: Origin) {
  if (store.mode === 'multi' || !canSelectOrigin(origin)) {
    if (store.mode !== 'multi') {
      console.warn("天道点不足，无法选择此出身。");
    }
    return;
  }
  store.selectedOrigin = origin;
}

function customOrigin() {
  // Placeholder for custom origin logic
  alert("自定义出身功能正在建设中。");
}

async function aiGenerateOrigin() {
  if (store.mode === 'single') {
    // 单机模式使用本地AI生成逻辑
    isLoading.value = true;
    error.value = null;

    try {
      // 模拟AI生成，随机创建一个独特的出身
      const aiTemplates = [
        { name: '神秘来客', description: '来历不明，身上带着异界的气息。没有人知道你从何而来，但所有人都能感受到你身上那股不属于此界的神秘力量。' },
        { name: '轮回转世', description: '前世乃是大能修士，今生虽然记忆模糊，但修炼天赋惊人。偶尔会有零星的记忆闪现，指引着修炼的方向。' },
        { name: '天选之子', description: '出生时天现异象，紫气东来三千里。被认为是应劫而生的天命之人，身负重任却不自知。' },
        { name: '魔道遗孤', description: '父母曾是魔道巨擘，虽已陨落，但血脉中潜藏着惊人的力量。需要强大的意志来驾驭这股力量。' },
        { name: '灵兽化形', description: '本是灵兽，机缘巧合下化为人形。保留了兽类的某些特质，对天地灵气有着异常的敏感。' },
        { name: '时空旅者', description: '来自另一个时空，携带着未来的记忆。对这个世界的发展有着模糊的预知，但因果纠缠让一切充满变数。' },
        { name: '道体天成', description: '天生道体，与天地大道契合。修炼速度远超常人，但也更容易遭受天劫考验。' }
      ];

      const template = aiTemplates[Math.floor(Math.random() * aiTemplates.length)];
      const generatedOrigin: Origin = {
        id: Date.now(),
        name: template.name,
        description: template.description,
        talent_cost: 0, // AI生成的出身不消耗点数
        attribute_modifiers: null
      };

      // 模拟生成延迟
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 添加到列表顶部
      origins.value.unshift(generatedOrigin);
      // 自动选择
      store.selectedOrigin = generatedOrigin;

    } catch (e: any) {
      error.value = 'AI推演失败';
    } finally {
      isLoading.value = false;
    }
  } else {
    // 联机模式请求后端
    isLoading.value = true;
    error.value = null;
    try {
      const response = await fetch('http://127.0.0.1:12345/api/v1/ai/generate_origin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world_id: store.selectedWorld?.id })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'AI推演失败');
      }
      const generatedOrigin = await response.json();

      // Check if this origin already exists in our list
      const existingOrigin = origins.value.find(o => o.id === generatedOrigin.id);
      if (!existingOrigin) {
        origins.value.unshift(generatedOrigin); // Add to the top
      }

      // Automatically select it, ignoring cost for AI generation
      store.selectedOrigin = generatedOrigin;

    } catch (e: any) {
      error.value = `AI推演异常: ${e.message}`;
    } finally {
      isLoading.value = false;
    }
  }
}

async function redeemCode() {
    if (!redemptionCode.value) {
        error.value = "请输入兑换码。";
        return;
    }
    isLoading.value = true;
    error.value = null;

    try {
        const response = await fetch('http://127.0.0.1:12345/api/v1/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: redemptionCode.value })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || '兑换码无效或已使用。');
        }

        const redeemedData = await response.json();

        // --- 将接引的天机注入坤舆宝库 ---
        store.selectedOrigin = redeemedData.origin;
        store.selectedSpiritRoot = redeemedData.spirit_root;
        store.selectedTalents = redeemedData.talents;
        store.talentPoints = redeemedData.talent_tier.total_points;
        store.selectedTalentTier = redeemedData.talent_tier;

        // 注入六司属性
        if (redeemedData.attributes) {
            store.attributes.root_bone = redeemedData.attributes.root_bone;
            store.attributes.spirituality = redeemedData.attributes.spirituality;
            store.attributes.comprehension = redeemedData.attributes.comprehension;
            store.attributes.luck = redeemedData.attributes.luck;
            store.attributes.charm = redeemedData.attributes.charm;
            store.attributes.temperament = redeemedData.attributes.temperament;
        }

        // 牵引至最终预览
        store.goToStep(store.totalSteps);

    } catch (e: any) {
        error.value = `兑换失败: ${e.message}`;
    } finally {
        isLoading.value = false;
    }
}

onMounted(() => {
  fetchCreationData();
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

.origin-list-container.multi-mode {
    opacity: 0.6;
    background: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 10px,
      rgba(var(--color-primary-rgb), 0.05) 10px,
      rgba(var(--color-primary-rgb), 0.05) 20px
    );
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

/* 联机模式兑换码样式 */
.redemption-container {
    position: absolute;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
}

.redemption-code {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.redemption-code input[type="text"] {
    padding: 0.75rem 1rem;
    background: rgba(0,0,0,0.2);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    color: var(--color-text);
    font-size: 1rem;
    min-width: 250px;
}

.redemption-code input[type="text"]:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 10px rgba(var(--color-primary-rgb), 0.3);
}
</style>
