<template>
  <div class="online-travel-map-panel">
    <div class="panel-header">
      <div class="title">
        <span class="title-text">联机世界信息</span>
        <span v-if="sessionId" class="meta">· 会话 #{{ sessionId }}</span>
        <span v-if="targetWorldId" class="meta">· 世界 #{{ targetWorldId }}</span>
        <span v-if="ownerUsername" class="meta">· 主人：{{ ownerUsername }}</span>
      </div>
      <div class="actions">
        <button class="tool-btn" @click="refreshAll" :disabled="isLoading">
          刷新
        </button>
      </div>
    </div>

    <div v-if="!sessionId || !targetWorldId" class="empty-state">
      <div class="empty-title">未处于联机穿越中</div>
      <div class="empty-hint">开始穿越后，这里会展示对方世界的信息。</div>
    </div>

    <div v-else class="content">
      <div v-if="isLoading" class="loading-state">加载中...</div>
      <div v-else-if="errorText" class="error-state">{{ errorText }}</div>
      <div v-else-if="!worldInfo" class="empty-state">
        <div class="empty-title">暂无世界数据</div>
        <div class="empty-hint">对方世界尚未生成或同步世界信息。</div>
      </div>
      <div v-else class="world-info-container">
        <!-- 世界基本信息 -->
        <div class="info-section">
          <div class="section-title">世界概况</div>
          <div class="info-grid">
            <div class="info-item" v-if="worldInfo.世界名称">
              <span class="label">名称：</span>{{ worldInfo.世界名称 }}
            </div>
            <div class="info-item" v-if="worldInfo.世界纪元">
              <span class="label">纪元：</span>{{ worldInfo.世界纪元 }}
            </div>
            <div class="info-item" v-if="worldInfo.版本">
              <span class="label">版本：</span>{{ worldInfo.版本 }}
            </div>
          </div>
          <div class="info-desc" v-if="worldInfo.世界背景">{{ worldInfo.世界背景 }}</div>
        </div>

        <!-- 大陆信息 -->
        <div class="info-section" v-if="continents.length > 0">
          <div class="section-title">大陆信息 ({{ continents.length }})</div>
          <div class="list-container">
            <div v-for="(c, i) in continents" :key="i" class="list-item">
              <div class="item-name">{{ c.名称 || c.name || `大陆${i+1}` }}</div>
              <div class="item-desc" v-if="c.描述 || c.description">{{ c.描述 || c.description }}</div>
            </div>
          </div>
        </div>

        <!-- 势力信息 -->
        <div class="info-section" v-if="factions.length > 0">
          <div class="section-title">势力信息 ({{ factions.length }})</div>
          <div class="list-container">
            <div v-for="(f, i) in factions" :key="i" class="list-item">
              <div class="item-name">{{ f.名称 || f.name || `势力${i+1}` }}</div>
              <div class="item-meta" v-if="f.类型 || f.type">类型：{{ f.类型 || f.type }}</div>
              <div class="item-desc" v-if="f.描述 || f.description">{{ f.描述 || f.description }}</div>
            </div>
          </div>
        </div>

        <!-- 地点信息 -->
        <div class="info-section" v-if="locations.length > 0">
          <div class="section-title">地点信息 ({{ locations.length }})</div>
          <div class="list-container">
            <div v-for="(l, i) in locations" :key="i" class="list-item">
              <div class="item-name">{{ l.名称 || l.name || `地点${i+1}` }}</div>
              <div class="item-meta" v-if="l.类型 || l.type">类型：{{ l.类型 || l.type }}</div>
              <div class="item-meta" v-if="l.所属势力">所属：{{ l.所属势力 }}</div>
              <div class="item-desc" v-if="l.描述 || l.description">{{ l.描述 || l.description }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import {
  getActiveTravelSession,
  getMapGraph,
  type MapGraphResponse,
  type TravelStartResponse,
} from '@/services/onlineTravel';

const gameStateStore = useGameStateStore();

const isLoading = ref(false);
const errorText = ref('');

const session = ref<TravelStartResponse | null>(null);
const graph = ref<MapGraphResponse | null>(null);

const onlineState = computed(() => gameStateStore.onlineState as any);
const sessionId = computed(() => {
  const id = onlineState.value?.房间ID;
  return id ? Number(id) : null;
});
const targetWorldId = computed(() => {
  const id = onlineState.value?.穿越目标?.世界ID;
  return typeof id === 'number' ? id : (id ? Number(id) : null);
});
const ownerUsername = computed(() => onlineState.value?.穿越目标?.主人用户名 ?? null);

// 从 graph 中获取原始世界数据
const worldInfo = computed(() => graph.value?.world_info ?? null);
const continents = computed(() => {
  const info = worldInfo.value as any;
  if (!info) return [];
  return (info.大陆信息 ?? info.continents ?? []) as any[];
});
const factions = computed(() => {
  const info = worldInfo.value as any;
  if (!info) return [];
  return (info.势力信息 ?? info.factions ?? []) as any[];
});
const locations = computed(() => {
  const info = worldInfo.value as any;
  if (!info) return [];
  return (info.地点信息 ?? info.locations ?? []) as any[];
});

const refreshAll = async () => {
  if (!sessionId.value) return;
  isLoading.value = true;
  errorText.value = '';
  try {
    const active = await getActiveTravelSession();
    if (!active) {
      session.value = null;
      graph.value = null;
      return;
    }
    session.value = active;
    graph.value = await getMapGraph(active.target_world_instance_id, active.entry_map_id, active.session_id);
  } catch (e: any) {
    errorText.value = e?.message || '加载世界信息失败';
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  refreshAll();
});

watch([sessionId, targetWorldId], () => {
  refreshAll();
});
</script>

<style scoped>
.online-travel-map-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  box-sizing: border-box;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  background: var(--color-surface, #fff);
}

.title {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.title-text {
  font-weight: 700;
  color: var(--color-text, #111827);
}

.meta {
  color: var(--color-text-muted, #6b7280);
  font-size: 0.85rem;
}

.actions {
  display: flex;
  gap: 8px;
}

.tool-btn {
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #fff);
  color: var(--color-text, #111827);
  padding: 6px 10px;
  border-radius: 10px;
  cursor: pointer;
}

.tool-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty-state {
  flex: 1;
  border: 1px dashed var(--color-border, #e2e8f0);
  border-radius: 12px;
  background: var(--color-surface, #fff);
  padding: 18px;
  display: grid;
  place-items: center;
  text-align: center;
  gap: 6px;
}

.empty-title {
  font-weight: 700;
  color: var(--color-text, #111827);
}

.empty-hint {
  color: var(--color-text-muted, #6b7280);
  font-size: 0.9rem;
}

.content {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.loading-state,
.error-state {
  padding: 24px;
  text-align: center;
  color: var(--color-text-muted, #6b7280);
}

.error-state {
  color: #dc2626;
}

.world-info-container {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px;
}

.info-section {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  background: var(--color-surface, #fff);
  padding: 14px;
}

.section-title {
  font-weight: 700;
  color: var(--color-text, #111827);
  margin-bottom: 10px;
  font-size: 0.95rem;
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  margin-bottom: 8px;
}

.info-item {
  font-size: 0.9rem;
  color: var(--color-text, #111827);
}

.info-item .label {
  color: var(--color-text-muted, #6b7280);
}

.info-desc {
  font-size: 0.85rem;
  color: var(--color-text-muted, #6b7280);
  line-height: 1.5;
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.list-item {
  padding: 10px 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-bg, #f8fafc);
}

.item-name {
  font-weight: 600;
  color: var(--color-text, #111827);
  margin-bottom: 4px;
}

.item-meta {
  font-size: 0.8rem;
  color: var(--color-text-muted, #6b7280);
}

.item-desc {
  font-size: 0.85rem;
  color: var(--color-text-muted, #6b7280);
  margin-top: 4px;
  line-height: 1.4;
}
</style>
