<template>
  <div class="online-travel-map-panel">
    <div class="panel-header">
      <div class="title">
        <span class="title-text">联机地图</span>
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
      <div class="empty-hint">开始穿越后，这里会展示对方世界的地图与可移动地点。</div>
    </div>

    <div v-else class="content">
      <div class="map-area">
        <div v-if="isLoading" class="map-overlay muted">加载中...</div>
        <div v-else-if="errorText" class="map-overlay error">{{ errorText }}</div>
        <div v-else-if="!graph || graph.pois.length === 0" class="map-overlay muted">暂无地图数据</div>
        <div v-else-if="isPlaceholderGraph" class="map-overlay muted">
          对方世界没有同步地图数据（或后端返回了占位地点），已隐藏占位点位。
        </div>
        <svg v-else class="map-svg" :viewBox="viewBox" aria-label="联机地图" role="img">
          <g class="edges">
            <line
              v-for="e in edgeLines"
              :key="`${e.fromId}->${e.toId}`"
              :x1="e.x1"
              :y1="e.y1"
              :x2="e.x2"
              :y2="e.y2"
              class="edge-line"
            />
          </g>

          <g class="nodes">
            <g
              v-for="p in graph.pois"
              :key="p.id"
              class="node"
              :class="{
                current: p.id === graph.viewer_poi_id,
                reachable: isReachable(p.id),
                unreachable: p.id !== graph.viewer_poi_id && !isReachable(p.id),
              }"
              @click="handleMove(p.id)"
            >
              <circle :cx="p.x" :cy="p.y" r="18" class="node-dot" />
              <text :x="p.x + 26" :y="p.y + 5" class="node-label">
                {{ poiDisplayName(p) }} (#{{ p.id }})
              </text>
            </g>
          </g>
        </svg>
      </div>

      <div class="side">
        <div class="card">
          <div class="card-title">当前位置</div>
          <div class="card-value">{{ currentPoiLabel }}</div>
          <div v-if="ownerLocLabel" class="card-sub">世界主人：{{ ownerLocLabel }}</div>
        </div>

        <div class="card">
          <div class="card-title">可移动地点</div>

          <div v-if="isLoading" class="muted">加载中...</div>
          <div v-else-if="errorText" class="error">{{ errorText }}</div>
          <div v-else-if="!graph || graph.pois.length === 0" class="muted">暂无地点数据</div>
          <div v-else-if="isPlaceholderGraph" class="muted">
            对方世界没有同步地图数据（或后端返回了占位地点），已隐藏占位点位。
          </div>
          <div v-else class="poi-list">
            <button
              v-for="p in graph.pois"
              :key="p.id"
              class="poi-item"
              :class="{ active: p.id === graph.viewer_poi_id, reachable: isReachable(p.id) }"
              @click="handleMove(p.id)"
              :disabled="isLoading || p.id === graph.viewer_poi_id || !isReachable(p.id)"
            >
              <span class="poi-name">{{ poiDisplayName(p) }}</span>
              <span class="poi-meta">#{{ p.id }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import { toast } from '@/utils/toast';
import {
  getActiveTravelSession,
  getMapGraph,
  getTravelWorldSnapshot,
  moveInWorld,
  type MapGraphResponse,
  type TravelStartResponse,
  type TravelWorldSnapshotResponse,
} from '@/services/onlineTravel';

const gameStateStore = useGameStateStore();

const isLoading = ref(false);
const errorText = ref('');

const session = ref<TravelStartResponse | null>(null);
const graph = ref<MapGraphResponse | null>(null);
const snapshot = ref<TravelWorldSnapshotResponse | null>(null);

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

const PLACEHOLDER_POI_KEYS = new Set([
  'safehouse',
  'market',
  'wild',
  'forest',
  'mountain',
  'river',
  'spirit_spring',
  'ancient_ruins',
  'cave',
  'temple',
  'demon_nest',
]);

function poiDisplayName(poi: { id: number; poi_key: string; state?: unknown }): string {
  const state = poi?.state && typeof poi.state === 'object' ? (poi.state as any) : null;
  const n = state?.名称 ?? state?.name ?? state?.display_name ?? null;
  if (typeof n === 'string' && n.trim()) return n.trim();

  const key = String(poi.poi_key || '').trim();
  if (key && !PLACEHOLDER_POI_KEYS.has(key)) return key;
  return `地点 #${poi.id}`;
}

const poiById = computed(() => {
  const pois = graph.value?.pois ?? [];
  return new Map(pois.map((p) => [p.id, p] as const));
});

const currentPoiLabel = computed(() => {
  if (!graph.value?.viewer_poi_id) return '未知';
  const poi = poiById.value.get(graph.value.viewer_poi_id);
  return poi ? `${poiDisplayName(poi as any)} (#${poi.id})` : `#${graph.value.viewer_poi_id}`;
});

const ownerLocLabel = computed(() => {
  const loc = snapshot.value?.owner_location;
  if (!loc || typeof loc !== 'object') return '';
  const d = (loc as any).描述 ?? (loc as any).description ?? (loc as any).位置 ?? (loc as any).location ?? (loc as any).地点 ?? null;
  if (typeof d === 'string' && d.trim()) return d.trim();
  const legacy = (loc as any).描述 ?? (loc as any).location ?? (loc as any).位置 ?? null;
  if (typeof legacy === 'string' && legacy.trim()) return legacy.trim();
  const legacy2 = (loc as any).描述 ?? (loc as any).location ?? (loc as any).位置 ?? null;
  return typeof legacy2 === 'string' ? legacy2 : '';
});

const isPlaceholderGraph = computed(() => {
  const pois = graph.value?.pois ?? [];
  if (pois.length === 0) return false;
  return pois.every((p) => PLACEHOLDER_POI_KEYS.has(String(p.poi_key || '').trim()));
});

const viewBox = computed(() => {
  const pois = graph.value?.pois ?? [];
  if (pois.length === 0) return '0 0 600 400';
  let minX = pois[0].x;
  let maxX = pois[0].x;
  let minY = pois[0].y;
  let maxY = pois[0].y;
  for (const p of pois) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const pad = 80;
  const w = Math.max(200, maxX - minX + pad * 2);
  const h = Math.max(200, maxY - minY + pad * 2);
  return `${minX - pad} ${minY - pad} ${w} ${h}`;
});

type EdgeLine = { fromId: number; toId: number; x1: number; y1: number; x2: number; y2: number };
const edgeLines = computed<EdgeLine[]>(() => {
  const g = graph.value;
  if (!g) return [];
  const byId = poiById.value;
  const out: EdgeLine[] = [];
  for (const e of g.edges) {
    const a = byId.get(e.from_poi_id);
    const b = byId.get(e.to_poi_id);
    if (!a || !b) continue;
    out.push({ fromId: e.from_poi_id, toId: e.to_poi_id, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }
  return out;
});

const isReachable = (poiId: number): boolean => {
  if (!graph.value) return false;
  const from = graph.value.viewer_poi_id;
  if (!from) return false;
  return graph.value.edges.some((e) => e.from_poi_id === from && e.to_poi_id === poiId);
};

const refreshAll = async () => {
  if (!sessionId.value) return;
  isLoading.value = true;
  errorText.value = '';
  try {
    const active = await getActiveTravelSession();
    if (!active) {
      session.value = null;
      graph.value = null;
      snapshot.value = null;
      return;
    }
    session.value = active;
    graph.value = await getMapGraph(active.target_world_instance_id, active.entry_map_id, active.session_id);
    try {
      snapshot.value = await getTravelWorldSnapshot(active.session_id);
    } catch {
      snapshot.value = null;
    }
  } catch (e: any) {
    errorText.value = e?.message || '加载联机地图失败';
  } finally {
    isLoading.value = false;
  }
};

const handleMove = async (poiId: number) => {
  if (isLoading.value) return;
  if (!sessionId.value || !targetWorldId.value) return;
  if (!graph.value) return;
  if (isPlaceholderGraph.value) {
    toast.warning('对方世界未同步地图数据，无法移动');
    return;
  }
  if (!isReachable(poiId)) return;

  isLoading.value = true;
  try {
    await moveInWorld(targetWorldId.value, poiId, sessionId.value);
    await refreshAll();
  } catch (e: any) {
    toast.error(e?.message || '移动失败');
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
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 12px;
  min-height: 0;
  flex: 1;
}

.map-area {
  min-height: 0;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  overflow: hidden;
  background: var(--color-surface, #fff);
  position: relative;
}

.map-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 12px;
}

.map-svg {
  width: 100%;
  height: 100%;
  display: block;
  background:
    radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.10), transparent 42%),
    radial-gradient(circle at 80% 60%, rgba(16, 185, 129, 0.10), transparent 46%),
    linear-gradient(180deg, rgba(2, 6, 23, 0.02), rgba(2, 6, 23, 0.00));
}

.edge-line {
  stroke: rgba(100, 116, 139, 0.55);
  stroke-width: 2;
}

.node {
  cursor: pointer;
}

.node.unreachable {
  cursor: not-allowed;
  opacity: 0.65;
}

.node-dot {
  fill: rgba(99, 102, 241, 0.12);
  stroke: rgba(99, 102, 241, 0.60);
  stroke-width: 2;
}

.node.current .node-dot {
  fill: rgba(245, 158, 11, 0.20);
  stroke: rgba(245, 158, 11, 0.75);
}

.node.reachable:not(.current) .node-dot {
  fill: rgba(34, 197, 94, 0.16);
  stroke: rgba(34, 197, 94, 0.60);
}

.node-label {
  font-size: 14px;
  fill: rgba(15, 23, 42, 0.95);
  user-select: none;
}

.node.unreachable .node-label {
  fill: rgba(100, 116, 139, 0.9);
}

.node.current .node-label {
  font-weight: 700;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.card {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  background: var(--color-surface, #fff);
  padding: 12px;
}

.card-title {
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--color-text, #111827);
}

.card-value {
  font-weight: 600;
  color: var(--color-text, #111827);
}

.card-sub {
  margin-top: 6px;
  color: var(--color-text-muted, #6b7280);
  font-size: 0.85rem;
}

.muted {
  color: var(--color-text-muted, #6b7280);
  font-size: 0.9rem;
}

.error {
  color: #dc2626;
  font-size: 0.9rem;
}

.poi-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 52vh;
  overflow: auto;
  padding-right: 4px;
}

.poi-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #fff);
  cursor: pointer;
  text-align: left;
}

.poi-item.reachable {
  border-color: rgba(34, 197, 94, 0.45);
}

.poi-item.active {
  border-color: rgba(99, 102, 241, 0.6);
  background: rgba(99, 102, 241, 0.08);
}

.poi-item:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.poi-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.poi-meta {
  color: var(--color-text-muted, #6b7280);
  font-size: 0.85rem;
  flex: 0 0 auto;
}

@media (max-width: 980px) {
  .content {
    grid-template-columns: 1fr;
  }
  .poi-list {
    max-height: 40vh;
  }
}
</style>
