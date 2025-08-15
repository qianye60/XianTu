<template>
  <div class="talent-tier-selection">
    <div v-if="isLoading" class="loading-state">感应天道，测算天资...</div>
    <div v-else-if="error" class="error-state">天机混沌，无法测算：{{ error }}</div>

    <div v-else class="tier-layout">
      <!-- 左侧面板：列表和操作按钮 -->
      <div class="tier-left-panel">
        <div class="tiers-list-container">
          <div
            v-for="tier in talentTiers"
            :key="tier.id"
            class="tier-item"
            :class="{ selected: store.selectedTalentTier?.id === tier.id }"
            :style="{ '--tier-glow-color': tier.color }"
            @click="selectTalentTier(tier)"
          >
            <span class="tier-name">{{ tier.name }}</span>
            <span class="tier-points">{{ tier.total_points }} 点</span>
          </div>
        </div>

        <!-- 单机模式功能按钮 -->
        <div v-if="store.mode === 'single'" class="single-actions-container">
          <div class="divider"></div>
          <button @click="customTalentTier" class="action-item">
            <span class="action-name">自定义天资</span>
          </button>
          <button @click="aiGenerateTalentTier" class="action-item">
            <span class="action-name">AI推演</span>
          </button>
        </div>
      </div>

      <!-- 右侧详情 -->
      <div class="tier-details-container">
        <div v-if="store.selectedTalentTier" class="tier-details">
          <h2 :style="{ color: store.selectedTalentTier.color }">
            {{ store.selectedTalentTier.name }}
          </h2>
          <div class="description-scroll">
            <p>{{ store.selectedTalentTier.description }}</p>
          </div>
          <div class="points-display">
            天道点: {{ store.selectedTalentTier.total_points }}
          </div>
        </div>
        <div v-else class="placeholder">
          请选择你的天资等级，这将决定你的起点。
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useCharacterCreationStore, type TalentTier } from '../../stores/characterCreationStore';
import { LOCAL_TALENT_TIERS } from '../../data/localData';

const store = useCharacterCreationStore();
const talentTiers = ref<TalentTier[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);

function customTalentTier() {
  // 自定义天资功能
  alert("自定义天资功能正在建设中。");
}

async function aiGenerateTalentTier() {
  // AI推演天资
  isLoading.value = true;
  error.value = null;

  try {
    // 这里应该调用SillyTavern的AI接口
    // 暂时使用模拟数据
    const aiGeneratedTier: TalentTier = {
      id: Date.now(),
      name: '天命之子',
      description: 'AI推演结果：你是天道眷顾之人，生而知之，天赋异禀。修行路上必定一帆风顺，前途不可限量。',
      total_points: 35,
      color: '#9400D3',
      rarity: 0
    };

    // 添加到列表顶部
    talentTiers.value.unshift(aiGeneratedTier);
    // 自动选择
    store.selectedTalentTier = aiGeneratedTier;
    store.talentPoints = aiGeneratedTier.total_points;

    setTimeout(() => {
      isLoading.value = false;
    }, 1000);
  } catch (e: any) {
    error.value = 'AI推演失败';
    isLoading.value = false;
  }
}

async function fetchTalentTiers() {
  // 单机模式使用本地数据
  if (store.mode === 'single') {
    try {
      // 使用本地的天资等级数据
      const tiers: TalentTier[] = LOCAL_TALENT_TIERS.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        total_points: t.total_points,
        color: t.color,
        rarity: 0 // 本地数据不需要rarity，设置默认值
      }));
      talentTiers.value = tiers;

      // 模拟加载延迟
      setTimeout(() => {
        isLoading.value = false;
      }, 300);
    } catch (e: any) {
      error.value = '加载本地数据失败';
      isLoading.value = false;
    }
  } else {
    // 联机模式请求后端
    try {
      const response = await fetch('http://127.0.0.1:12345/api/v1/talent_tiers/');
      if (!response.ok) {
        throw new Error(`天网灵脉响应异常: ${response.status}`);
      }
      const tiers: TalentTier[] = await response.json();
      talentTiers.value = tiers.sort((a, b) => a.rarity - b.rarity);
    } catch (e: any) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  }
}

function selectTalentTier(tier: TalentTier) {
  store.selectedTalentTier = tier;
  store.talentPoints = tier.total_points;
}

onMounted(() => {
  fetchTalentTiers();
});
</script>

<style scoped>
.talent-tier-selection {
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

.tier-layout {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
  height: 100%;
  overflow: hidden;
}

/* 左侧面板容器 */
.tier-left-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.tiers-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  transition: var(--transition-fast);
}

/* 美化滚动条 */
.tiers-list-container::-webkit-scrollbar {
  width: 8px;
}

.tiers-list-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.tiers-list-container::-webkit-scrollbar-thumb {
  background: rgba(229, 192, 123, 0.3);
  border-radius: 4px;
}

.tiers-list-container::-webkit-scrollbar-thumb:hover {
  background: rgba(229, 192, 123, 0.5);
}

.tier-item {
  display: flex;
  justify-content: space-between;
  padding: 0.8rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border-left: 3px solid transparent;
}

.tier-item:hover {
  background: rgba(var(--tier-glow-color-rgb, 229, 192, 123), 0.1);
}

.tier-item.selected {
  background: rgba(var(--tier-glow-color-rgb, 229, 192, 123), 0.2);
  color: var(--tier-glow-color, #e5c07b);
  border-left: 3px solid var(--tier-glow-color, #e5c07b);
}

.tier-name {
  font-weight: 500;
  color: var(--tier-glow-color, inherit);
}

.tier-points {
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

/* 右侧详情容器 */
.tier-details-container {
  border: 1px solid #444;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.tier-details {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.tier-details h2 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 2rem;
  text-align: center;
  flex-shrink: 0;
  text-shadow: 0 0 20px currentColor;
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
  color: rgba(255, 255, 255, 0.8);
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

.points-display {
  text-align: center;
  font-weight: bold;
  color: var(--color-accent);
  font-size: 1.2rem;
  padding: 1rem;
  background: rgba(var(--color-primary-rgb), 0.1);
  border-top: 1px solid var(--color-border);
}

/* 为不同天资等级设置颜色变量 */
.tier-item:nth-child(1) {
  --tier-glow-color: #8B4513;
  --tier-glow-color-rgb: 139, 69, 19;
}

.tier-item:nth-child(2) {
  --tier-glow-color: #808080;
  --tier-glow-color-rgb: 128, 128, 128;
}

.tier-item:nth-child(3) {
  --tier-glow-color: #4169E1;
  --tier-glow-color-rgb: 65, 105, 225;
}

.tier-item:nth-child(4) {
  --tier-glow-color: #9932CC;
  --tier-glow-color-rgb: 153, 50, 204;
}

.tier-item:nth-child(5) {
  --tier-glow-color: #FFD700;
  --tier-glow-color-rgb: 255, 215, 0;
}

.tier-item:nth-child(6) {
  --tier-glow-color: #FF0000;
  --tier-glow-color-rgb: 255, 0, 0;
}
</style>
