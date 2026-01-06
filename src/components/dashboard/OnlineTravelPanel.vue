<template>
  <div class="online-travel-panel">
    <!-- 状态提示 -->
    <div v-if="!backendReady" class="notice error-indicator">
      {{ t('未配置后端服务器，联机/穿越不可用') }}
    </div>
    <div v-else-if="!isOnlineMode" class="notice warning-indicator">
      {{ t('当前不是联机存档，无法使用穿越功能') }}
    </div>

    <template v-else>
      <!-- 标签页导航 -->
      <div class="tabs-header">
        <div class="tabs-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab-btn"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <component :is="tab.icon" :size="16" />
            <span>{{ t(tab.label) }}</span>
          </button>
        </div>
        <div class="header-actions">
          <button class="action-btn" @click="refreshAll" :disabled="isLoading">
            <RefreshCw :size="16" />
          </button>
          <button class="action-btn primary" @click="handleSignin" :disabled="isLoading">
            <CalendarCheck :size="16" />
            <span>{{ t('签到') }}</span>
          </button>
        </div>
      </div>

      <!-- 标签内容 -->
      <div class="tab-content">
        <!-- 穿越标签 -->
        <div v-if="activeTab === 'travel'" class="travel-tab">
          <div class="two-column">
            <div class="left-col">
              <!-- 穿越点 -->
              <div class="stat-card">
                <div class="stat-icon"><Coins :size="20" /></div>
                <div class="stat-info">
                  <div class="stat-value">{{ travelPoints }}</div>
                  <div class="stat-label">{{ t('穿越点') }}</div>
                </div>
              </div>
              <!-- 我的世界 -->
              <div class="info-card" v-if="myWorld">
                <div class="info-title"><Shield :size="16" />{{ t('我的世界') }}</div>
                <div class="info-row"><span class="muted">ID</span><span>#{{ myWorld.world_instance_id }}</span></div>
                <div class="info-row"><span class="muted">{{ t('隐私') }}</span><span class="badge">{{ myWorld.visibility_mode }}</span></div>
                <button class="action-btn sm" @click="toggleVisibility" :disabled="isLoading">
                  <Lock :size="14" />{{ t('切换隐私') }}
                </button>
              </div>
            </div>
            <div class="right-col">
              <!-- 发起穿越 -->
              <div class="form-card">
                <div class="form-title"><Globe :size="16" />{{ t('发起穿越') }}</div>
                <div class="form-row">
                  <label>{{ t('目标用户名') }}</label>
                  <input v-model="targetUsername" :placeholder="t('输入要穿越的玩家用户名')" :disabled="isLoading" />
                </div>
                <div class="form-row">
                  <label>{{ t('邀请码(可选)') }}</label>
                  <input v-model="inviteCode" :placeholder="t('用于 hidden/locked 世界')" :disabled="isLoading" />
                </div>
                <div class="form-actions">
                  <button class="action-btn primary" @click="handleStartTravel" :disabled="!canStart || isLoading">
                    <ArrowRight :size="16" />{{ t('穿越') }}
                  </button>
                  <button class="action-btn" v-if="session" @click="handleEndTravel" :disabled="isLoading">
                    <CornerUpLeft :size="16" />{{ t('返回') }}
                  </button>
                </div>
                <div v-if="session" class="session-info">session #{{ session.session_id }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 地图标签 -->
        <div v-else-if="activeTab === 'map'" class="map-tab">
          <div v-if="!session || !graph" class="empty-state">
            <MapIcon :size="48" class="empty-icon" />
            <p>{{ t('请先发起穿越') }}</p>
          </div>
          <div v-else class="map-layout">
            <div class="map-canvas">
              <svg :viewBox="viewBox" class="poi-map">
                <g class="edges">
                  <line v-for="e in graph.edges" :key="e.id"
                    :x1="poiById.get(e.from_poi_id)?.x ?? 0" :y1="poiById.get(e.from_poi_id)?.y ?? 0"
                    :x2="poiById.get(e.to_poi_id)?.x ?? 0" :y2="poiById.get(e.to_poi_id)?.y ?? 0"
                    class="edge-line" />
                </g>
                <g class="nodes">
                  <g v-for="p in graph.pois" :key="p.id" class="node"
                    :class="{ active: p.id === graph.viewer_poi_id, reachable: isReachable(p.id) }"
                    :transform="`translate(${p.x}, ${p.y})`" @click="handleMove(p.id)">
                    <circle r="10" /><text x="14" y="5">{{ p.poi_key }}</text>
                  </g>
                </g>
              </svg>
            </div>
            <div class="poi-sidebar">
              <div class="current-loc">{{ t('当前位置') }}: {{ currentPoiLabel }}</div>
              <div class="poi-list">
                <button v-for="p in graph.pois" :key="p.id" class="poi-item"
                  :class="{ active: p.id === graph.viewer_poi_id, reachable: isReachable(p.id) }"
                  @click="handleMove(p.id)" :disabled="isLoading || p.id === graph.viewer_poi_id || !isReachable(p.id)">
                  <span class="poi-name">{{ p.poi_key }}</span>
                  <span class="poi-meta">#{{ p.id }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 报告标签 -->
        <div v-else-if="activeTab === 'reports'" class="reports-tab">
          <div class="reports-header">
            <span class="muted">{{ t('最近 50 条入侵报告') }}</span>
            <button class="action-btn sm" @click="refreshReports" :disabled="isLoading">
              <RefreshCw :size="14" />{{ t('刷新') }}
            </button>
          </div>
          <div v-if="reports.length === 0" class="empty-state">
            <ScrollText :size="48" class="empty-icon" />
            <p>{{ t('暂无报告') }}</p>
          </div>
          <div v-else class="report-list">
            <div v-for="r in reports" :key="r.id" class="report-item">
              <span :class="['badge', r.unread ? 'unread' : 'read']">{{ r.unread ? t('未读') : t('已读') }}</span>
              <span>world: {{ r.world_instance_id }}</span>
              <span class="muted">{{ r.created_at }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { toast } from '@/utils/toast';
import { useI18n } from '@/i18n';
import { isBackendConfigured } from '@/services/backendConfig';
import { useCharacterStore } from '@/stores/characterStore';
import { ArrowRight, CalendarCheck, Coins, CornerUpLeft, Globe, Lock, Map as MapIcon, RefreshCw, ScrollText, Shield } from 'lucide-vue-next';

const tabs = [
  { id: 'travel', label: '穿越', icon: Globe },
  { id: 'map', label: '地图', icon: MapIcon },
  { id: 'reports', label: '报告', icon: ScrollText },
];
const activeTab = ref('travel');
import {
  endTravel,
  getMapGraph,
  getMyInvasionReports,
  getMyWorldInstance,
  getTravelProfile,
  moveInWorld,
  signinTravel,
  startTravel,
  updateMyWorldVisibility,
  type MapGraphResponse,
  type TravelStartResponse,
  type WorldInstanceSummary,
  type InvasionReportOut,
} from '@/services/onlineTravel';

const { t } = useI18n();
const characterStore = useCharacterStore();

const isLoading = ref(false);
const travelPoints = ref(0);
const targetUsername = ref('');
const inviteCode = ref('');
const apiError = ref('');

const myWorld = ref<WorldInstanceSummary | null>(null);
const session = ref<TravelStartResponse | null>(null);
const graph = ref<MapGraphResponse | null>(null);
const reports = ref<InvasionReportOut[]>([]);

const backendReady = computed(() => isBackendConfigured());
const isOnlineMode = computed(() => characterStore.activeCharacterProfile?.模式 === '联机');
const canStart = computed(
  () => travelPoints.value > 0 && targetUsername.value.trim().length > 0 && backendReady.value && isOnlineMode.value
);

const poiById = computed(() => {
  const pois = graph.value?.pois ?? [];
  return new Map(pois.map((p) => [p.id, p] as const));
});

const currentPoiLabel = computed(() => {
  if (!graph.value?.viewer_poi_id) return t('未知');
  const poi = poiById.value.get(graph.value.viewer_poi_id);
  return poi ? `${poi.poi_key} (#${poi.id})` : `#${graph.value.viewer_poi_id}`;
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
  const pad = 60;
  const w = Math.max(200, maxX - minX + pad * 2);
  const h = Math.max(160, maxY - minY + pad * 2);
  return `${minX - pad} ${minY - pad} ${w} ${h}`;
});

const refreshProfile = async () => {
  try {
    const profile = await getTravelProfile();
    travelPoints.value = profile.travel_points;
    apiError.value = '';
  } catch (e: any) {
    apiError.value = e?.message || '穿越服务暂不可用';
  }
};

const refreshReports = async () => {
  try {
    reports.value = await getMyInvasionReports();
  } catch {
    reports.value = [];
  }
};

const refreshMyWorld = async () => {
  try {
    myWorld.value = await getMyWorldInstance();
  } catch {
    myWorld.value = null;
  }
};

const refreshGraph = async () => {
  if (!session.value) {
    graph.value = null;
    return;
  }
  graph.value = await getMapGraph(session.value.target_world_instance_id, session.value.entry_map_id, session.value.session_id);
};

const refreshAll = async () => {
  if (!backendReady.value) return;
  isLoading.value = true;
  try {
    await refreshProfile();
    await refreshMyWorld();
    await refreshReports();
    await refreshGraph();
  } finally {
    isLoading.value = false;
  }
};

const handleSignin = async () => {
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    const res = await signinTravel();
    travelPoints.value = res.travel_points;
    toast.success(res.message);
  } catch (e: any) {
    toast.error(e?.message || '签到失败');
  } finally {
    isLoading.value = false;
  }
};

const toggleVisibility = async () => {
  if (!myWorld.value) return;
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    const next = myWorld.value.visibility_mode === 'public' ? 'hidden' : myWorld.value.visibility_mode === 'hidden' ? 'locked' : 'public';
    myWorld.value = await updateMyWorldVisibility(next);
    toast.success(`世界隐私已切换为 ${myWorld.value.visibility_mode}`);
  } catch (e: any) {
    toast.error(e?.message || '切换失败');
  } finally {
    isLoading.value = false;
  }
};

const handleStartTravel = async () => {
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    session.value = await startTravel(targetUsername.value.trim(), inviteCode.value.trim() || undefined);
    travelPoints.value = session.value.travel_points_left;
    await refreshGraph();
    toast.success(t('穿越成功'));
  } catch (e: any) {
    toast.error(e?.message || t('穿越失败'));
  } finally {
    isLoading.value = false;
  }
};

const handleEndTravel = async () => {
  if (!session.value) return;
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    const res = await endTravel(session.value.session_id);
    toast.success(res.message);
    session.value = null;
    graph.value = null;
    await refreshReports();
  } catch (e: any) {
    toast.error(e?.message || t('返回失败'));
  } finally {
    isLoading.value = false;
  }
};

const isReachable = (poiId: number): boolean => {
  if (!graph.value) return false;
  const from = graph.value.viewer_poi_id;
  if (!from) return false;
  return graph.value.edges.some((e) => e.from_poi_id === from && e.to_poi_id === poiId);
};

const handleMove = async (poiId: number) => {
  if (!session.value || !graph.value) return;
  if (!isReachable(poiId)) return;
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    await moveInWorld(session.value.target_world_instance_id, poiId, session.value.session_id);
    await refreshGraph();
  } catch (e: any) {
    toast.error(e?.message || '移动失败');
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  try {
    if (!backendReady.value) return;
    await refreshProfile();
    await refreshMyWorld();
    await refreshReports();
  } catch (e: any) {
    console.warn('[OnlineTravelPanel] init failed', e);
  }
});
</script>

<style scoped>
.online-travel-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
}

.notice {
  margin: 1rem;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}
.error-indicator { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
.warning-indicator { background: rgba(245,158,11,0.1); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }

/* Tabs */
.tabs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}
.tabs-nav { display: flex; gap: 0.25rem; }
.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}
.tab-btn:hover { background: var(--color-background); color: var(--color-text); }
.tab-btn.active { background: var(--color-primary); color: #fff; }

.header-actions { display: flex; gap: 0.5rem; }
.action-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}
.action-btn:hover { border-color: var(--color-primary); }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.action-btn.primary { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
.action-btn.sm { padding: 0.35rem 0.6rem; font-size: 0.75rem; }

.tab-content { flex: 1; overflow-y: auto; padding: 1rem; }

/* Travel Tab */
.two-column { display: grid; grid-template-columns: 1fr 1.5fr; gap: 1rem; }
.left-col, .right-col { display: flex; flex-direction: column; gap: 1rem; }

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}
.stat-icon { color: var(--color-primary); }
.stat-value { font-size: 1.75rem; font-weight: 700; color: var(--color-primary); }
.stat-label { font-size: 0.8rem; color: var(--color-text-secondary); }

.info-card, .form-card {
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}
.info-title, .form-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--color-text);
}
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.875rem;
}
.info-row:last-of-type { border-bottom: none; }

.form-row { margin-bottom: 0.75rem; }
.form-row label { display: block; font-size: 0.8rem; color: var(--color-text-secondary); margin-bottom: 0.25rem; }
.form-row input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.875rem;
}
.form-row input:focus { outline: none; border-color: var(--color-primary); }
.form-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
.session-info { margin-top: 0.5rem; font-size: 0.75rem; color: var(--color-text-secondary); }

/* Map Tab */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--color-text-secondary);
}
.empty-icon { opacity: 0.4; margin-bottom: 1rem; }

.map-layout { display: grid; grid-template-columns: 1.5fr 1fr; gap: 1rem; height: 100%; }
.map-canvas {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 0.5rem;
}
.poi-map { width: 100%; height: 350px; }
.edge-line { stroke: var(--color-border); stroke-width: 2; }
.node { cursor: pointer; }
.node circle { fill: rgba(var(--color-primary-rgb),0.15); stroke: var(--color-primary); stroke-width: 2; }
.node text { font-size: 11px; fill: var(--color-text); }
.node.reachable circle { fill: rgba(34,197,94,0.15); stroke: #22c55e; }
.node.active circle { fill: rgba(var(--color-accent-rgb),0.25); stroke: var(--color-accent); }

.poi-sidebar {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
}
.current-loc { font-weight: 600; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--color-border); }
.poi-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.4rem; }
.poi-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  cursor: pointer;
  transition: all 0.15s;
}
.poi-item:hover:not(:disabled) { border-color: var(--color-primary); }
.poi-item:disabled { opacity: 0.5; cursor: not-allowed; }
.poi-item.active { background: rgba(var(--color-accent-rgb),0.1); border-color: var(--color-accent); }
.poi-item.reachable { border-color: #22c55e; }
.poi-name { font-weight: 500; font-size: 0.875rem; }
.poi-meta { font-size: 0.75rem; color: var(--color-text-secondary); }

/* Reports Tab */
.reports-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.report-list { display: flex; flex-direction: column; gap: 0.5rem; }
.report-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.875rem;
}
.badge { padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 500; }
.badge.unread { background: rgba(245,158,11,0.15); color: #f59e0b; }
.badge.read { background: rgba(107,114,128,0.15); color: #6b7280; }

.muted { color: var(--color-text-secondary); font-size: 0.8rem; }

@media (max-width: 768px) {
  .two-column, .map-layout { grid-template-columns: 1fr; }
  .poi-map { height: 250px; }
}
</style>
