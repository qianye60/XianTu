<template>
  <div class="online-travel-panel">
    <!-- 状态提示 -->
    <div v-if="!uiStore.isBackendConfiguredComputed" class="notice error-indicator">
      {{ t('未配置后端服务器，联机/穿越不可用') }}
    </div>
    <div v-else-if="!backendReady" class="notice error-indicator">
      {{ t('后端未连接，联机/穿越不可用') }}
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
          <button class="action-btn primary" @click="handleSignin" :disabled="isLoading || signedIn">
            <CalendarCheck :size="16" />
            <span>{{ signedIn ? t('已签到') : t('签到') }}</span>
          </button>
        </div>
      </div>

      <!-- 标签内容 -->
      <div class="tab-content">
        <!-- 穿越标签 -->
        <div v-if="activeTab === 'travel'" class="travel-tab">
          <div class="travel-layout">
            <!-- 左侧: 世界列表 -->
            <div class="worlds-list-panel">
              <!-- 搜索和筛选 -->
              <div class="filter-bar">
                <div class="search-box">
                  <input
                    v-model="searchQuery"
                    :placeholder="t('搜索用户名...')"
                    class="search-input"
                    :disabled="isLoadingWorlds"
                  />
                </div>
                <select v-model="visibilityFilter" class="filter-select" :disabled="isLoadingWorlds">
                  <option value="">{{ t('全部') }}</option>
                  <option value="public">{{ t('公开') }}</option>
                  <option value="hidden">{{ t('隐藏') }}</option>
                </select>
              </div>

              <!-- 穿越点显示 -->
              <div class="travel-points-bar">
                <Coins :size="16" class="points-icon" />
                <span class="points-label">{{ t('穿越点') }}:</span>
                <span class="points-value">{{ travelPoints }}</span>
              </div>

              <!-- 世界列表 -->
              <div class="worlds-list">
                <div v-if="isLoadingWorlds && worldsList.length === 0" class="loading-state">
                  {{ t('加载中...') }}
                </div>
                <div v-else-if="worldsList.length === 0" class="empty-state">
                  <Globe :size="48" class="empty-icon" />
                  <p>{{ t('暂无可穿越的世界') }}</p>
                </div>
                <div v-else>
                  <div
                    v-for="world in worldsList"
                    :key="world.world_instance_id"
                    class="world-card"
                    :class="{ selected: selectedWorld?.world_instance_id === world.world_instance_id }"
                    @click="selectWorld(world)"
                  >
                    <div class="world-info">
                      <div class="owner-name">{{ world.owner_username }}</div>
                      <div class="world-meta">
                        <span class="badge" :class="`badge-${world.visibility_mode}`">
                          {{ world.visibility_mode }}
                        </span>
                        <span class="badge" :class="world.owner_online ? 'badge-online' : 'badge-offline'">
                          {{ world.owner_online ? t('在线') : t('离线') }}
                        </span>
                        <span class="world-id">#{{ world.world_instance_id }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- 加载更多 -->
                  <button
                    v-if="hasMore"
                    class="load-more-btn"
                    @click="loadMore"
                    :disabled="isLoadingWorlds"
                  >
                    {{ isLoadingWorlds ? t('加载中...') : t('加载更多') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 右侧: 操作面板（顶部栏切换：穿越目标 / 我的世界） -->
            <div class="travel-action-panel">
              <div class="action-panel-header">
                <button
                  class="panel-tab"
                  :class="{ active: actionPanelMode === 'target' }"
                  @click="actionPanelMode = 'target'"
                >
                  {{ t('穿越目标') }}
                </button>
                <button
                  class="panel-tab"
                  :class="{ active: actionPanelMode === 'myworld' }"
                  @click="actionPanelMode = 'myworld'"
                >
                  {{ t('我的世界') }}
                </button>
              </div>

              <div class="action-panel-body">
                <template v-if="actionPanelMode === 'target'">
                  <div v-if="selectedWorld" class="selected-world-detail">
                    <h3>{{ selectedWorld.owner_username }} {{ t('的世界') }}</h3>

                    <div class="detail-info">
                      <div class="info-row">
                        <span class="info-label">{{ t('世界ID') }}</span>
                        <span class="info-value">#{{ selectedWorld.world_instance_id }}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">{{ t('可见性') }}</span>
                        <span class="badge" :class="`badge-${selectedWorld.visibility_mode}`">
                          {{ selectedWorld.visibility_mode }}
                        </span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">{{ t('状态') }}</span>
                        <span class="badge" :class="selectedWorld.owner_online ? 'badge-online' : 'badge-offline'">
                          {{ selectedWorld.owner_online ? t('在线') : t('离线') }}
                        </span>
                      </div>
                    </div>

                    <!-- 邀请码输入(仅hidden/locked) -->
                    <div v-if="selectedWorld.visibility_mode !== 'public'" class="invite-code-section">
                      <label>{{ t('邀请码') }}</label>
                      <input
                        v-model="inviteCode"
                        :placeholder="t('输入邀请码...')"
                        class="invite-code-input"
                        :disabled="isLoading"
                      />
                    </div>

                    <!-- 穿越按钮 -->
                    <div class="action-buttons">
                      <button
                        class="action-btn primary"
                        @click="handleStartTravelToSelected"
                        :disabled="!canTravelToSelected || isLoading"
                      >
                        <ArrowRight :size="16" />
                        {{ t('穿越到此世界') }}
                      </button>
                      <div v-if="selectedWorld.owner_online" class="inline-hint danger">
                        {{ t('世界主人在线中，需等待下线才能进入') }}
                      </div>
                      <div v-else-if="selectedWorld.allow_offline_travel === false" class="inline-hint danger">
                        {{ t('该世界未开启下线代理，无法穿越') }}
                      </div>

                      <!-- 当前会话信息 -->
                      <div v-if="session" class="session-info-box">
                        <div class="session-label">{{ t('当前会话') }} #{{ session.session_id }}</div>
                        <button class="action-btn" @click="handleEndTravel" :disabled="isLoading">
                          <CornerUpLeft :size="16" />
                          {{ t('返回') }}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div v-else class="empty-selection">
                    <Globe :size="64" class="empty-icon" />
                    <p>{{ t('请从左侧选择一个世界') }}</p>
                  </div>
                </template>

                <template v-else>
                  <div v-if="myWorld" class="my-world-info">
                    <div class="info-title"><Shield :size="16" />{{ t('我的世界') }}</div>
                    <div class="info-row"><span class="muted">ID</span><span>#{{ myWorld.world_instance_id }}</span></div>
                    <div class="info-row">
                      <span class="muted">{{ t('隐私') }}</span>
                      <span class="badge" :class="`badge-${myWorld.visibility_mode}`">{{ myWorld.visibility_mode }}</span>
                    </div>
                    <div class="info-row">
                      <span class="muted">{{ t('下线代理') }}</span>
                      <span class="badge" :class="(myWorld.allow_offline_travel ?? true) ? 'badge-online' : 'badge-locked'">
                        {{ (myWorld.allow_offline_travel ?? true) ? t('开启') : t('关闭') }}
                      </span>
                    </div>
                    <div v-if="myPresence" class="info-row">
                      <span class="muted">{{ t('在线状态') }}</span>
                      <span class="badge" :class="myPresence.is_online ? 'badge-online' : 'badge-offline'">
                        {{ myPresence.is_online ? t('在线') : t('离线') }}
                      </span>
                    </div>

                    <div class="my-world-actions">
                      <button class="action-btn sm" @click="toggleVisibility" :disabled="isLoading">
                        <Lock :size="14" />{{ t('切换隐私') }}
                      </button>
                      <button class="action-btn sm" @click="toggleOfflineAgent" :disabled="isLoading">
                        <Globe :size="14" />{{ t('切换下线代理') }}
                      </button>
                      <button class="action-btn sm" @click="refreshPresence" :disabled="isLoading">
                        <RefreshCw :size="14" />{{ t('刷新状态') }}
                      </button>
                    </div>

                    <!-- 离线代理提示词配置 -->
                    <div v-if="myWorld.allow_offline_travel ?? true" class="offline-prompt-section">
                      <div class="section-label">
                        <span>{{ t('离线代理提示词') }}</span>
                        <span class="hint-text">{{ t('其他玩家遇到你时，AI将根据此提示词扮演你的角色') }}</span>
                      </div>
                      <textarea
                        v-model="offlinePromptDraft"
                        :placeholder="t('例如：我是一个冷静理智的剑修，不喜欢多话，遇到危险会优先自保...')"
                        class="offline-prompt-textarea"
                        rows="4"
                        :disabled="isLoading"
                      ></textarea>
                      <div class="prompt-actions">
                        <button
                          class="action-btn sm primary"
                          @click="saveOfflinePrompt"
                          :disabled="isLoading || offlinePromptDraft === (myWorld.offline_agent_prompt || '')"
                        >
                          <Save :size="14" />{{ t('保存提示词') }}
                        </button>
                        <span v-if="offlinePromptDraft !== (myWorld.offline_agent_prompt || '')" class="unsaved-hint">
                          {{ t('有未保存的更改') }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div v-else class="empty-selection">
                    <Shield :size="64" class="empty-icon" />
                    <p>{{ t('我的世界加载失败') }}</p>
                  </div>
                </template>
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
          <div v-else class="map-layout map-layout-v2">
            <div class="map-canvas map-canvas-v2">
              <GameMapPanel />
            </div>
            <div class="poi-sidebar">
              <div class="current-loc">{{ t('当前位置') }}: {{ currentPoiLabel }}</div>
              <div class="poi-list">
                <button v-for="p in graph.pois" :key="p.id" class="poi-item"
                  :class="{ active: p.id === graph.viewer_poi_id, reachable: isReachable(p.id) }"
                  @click="handleMove(p.id)" :disabled="isLoading || p.id === graph.viewer_poi_id || !isReachable(p.id)">
                  <span class="poi-name">{{ poiKeyToName(p.poi_key) }}</span>
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

        <!-- 会话日志 -->
        <div v-else-if="activeTab === 'logs'" class="logs-tab">
          <div v-if="!sessionLogs" class="empty-state">
            <FileText :size="48" class="empty-icon" />
            <p>{{ t('暂无会话日志') }}</p>
          </div>
          <div v-else class="logs-layout">
            <div class="reports-header">
              <span class="muted">{{ t('会话') }} #{{ sessionLogs.session_id }} · {{ t('事件') }} {{ sessionLogs.events.length }}</span>
              <button class="action-btn sm" @click="loadSessionLogs(sessionLogs.session_id)" :disabled="isLoading">
                <RefreshCw :size="14" />{{ t('刷新') }}
              </button>
            </div>
            <div v-if="sessionLogs.events.length === 0" class="empty-state">
              <p>{{ t('暂无事件') }}</p>
            </div>
            <div v-else class="log-list">
              <div v-for="(e, idx) in sessionLogs.events" :key="idx" class="log-item">
                <span class="log-time">{{ e.created_at }}</span>
                <span class="log-type">{{ formatEventType(e.event_type) }}</span>
                <span v-if="e.poi_id != null" class="log-meta">poi #{{ e.poi_id }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { toast } from '@/utils/toast';
import { useI18n } from '@/i18n';
import { useUIStore } from '@/stores/uiStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import type { WorldInfo, PlayerLocation } from '@/types/game';
import { ArrowRight, CalendarCheck, Coins, CornerUpLeft, Globe, Lock, Map as MapIcon, RefreshCw, ScrollText, Shield, FileText, Save } from 'lucide-vue-next';
import GameMapPanel from '@/components/dashboard/GameMapPanel.vue';

const tabs = [
  { id: 'travel', label: '穿越', icon: Globe },
  { id: 'map', label: '地图', icon: MapIcon },
  { id: 'reports', label: '入侵报告', icon: ScrollText },
  { id: 'logs', label: '会话日志', icon: FileText },
];
const activeTab = ref('travel');
import {
  endTravel,
  getActiveTravelSession,
  getMapGraph,
  getMyInvasionReports,
  getMyWorldInstance,
  getTravelSessionLogs,
  getTravelProfile,
  getTravelableWorlds,
  getTravelSessionStatus,
  moveInWorld,
  signinTravel,
  startTravel,
  updateMyWorldPolicy,
  updateMyWorldVisibility,
  updateMyWorldOfflinePrompt,
  type MapGraphResponse,
  type TravelStartResponse,
  type TravelSessionStatusResponse,
  type TravelableWorld,
  type TravelSessionLogsResponse,
  type WorldInstanceSummary,
  type InvasionReportOut,
} from '@/services/onlineTravel';

import { getMyPresence, type PresenceStatusResponse } from '@/services/presence';

const { t } = useI18n();
const uiStore = useUIStore();
const characterStore = useCharacterStore();
const gameStateStore = useGameStateStore();

const isLoading = ref(false);
const travelPoints = ref(0);
const signedIn = ref(false);
const targetUsername = ref('');
const inviteCode = ref('');
const apiError = ref('');

const myWorld = ref<WorldInstanceSummary | null>(null);
const session = ref<TravelStartResponse | null>(null);
const graph = ref<MapGraphResponse | null>(null);
const reports = ref<InvasionReportOut[]>([]);
const sessionLogs = ref<TravelSessionLogsResponse | null>(null);
const myPresence = ref<PresenceStatusResponse | null>(null);
const offlinePromptDraft = ref(''); // 离线代理提示词草稿

// 新增: 世界列表相关
const worldsList = ref<TravelableWorld[]>([]);
const selectedWorld = ref<TravelableWorld | null>(null);
const searchQuery = ref('');
const visibilityFilter = ref('');
const isLoadingWorlds = ref(false);
const currentPage = ref(0);
const pageSize = 20;
const hasMore = ref(true);
const searchDebounceTimer = ref<number | null>(null);
const sessionPollTimer = ref<number | null>(null);
const SESSION_POLL_INTERVAL = 30000; // 30秒轮询一次

// 使用 uiStore 的统一后端状态
const backendReady = computed(() => uiStore.isBackendAvailable);
const isOnlineMode = computed(() => characterStore.activeCharacterProfile?.模式 === '联机');
const canStart = computed(
  () => travelPoints.value > 0 && targetUsername.value.trim().length > 0 && backendReady.value && isOnlineMode.value
);

const actionPanelMode = ref<'target' | 'myworld'>('target');

// 新增: 是否可以穿越到选中的世界
const canTravelToSelected = computed(() => {
  return (
    selectedWorld.value !== null &&
    !session.value &&
    travelPoints.value > 0 &&
    backendReady.value &&
    isOnlineMode.value &&
    selectedWorld.value.owner_online !== true &&
    selectedWorld.value.allow_offline_travel !== false &&
    (selectedWorld.value.visibility_mode === 'public' || inviteCode.value.trim().length > 0)
  );
});

const poiById = computed(() => {
  const pois = graph.value?.pois ?? [];
  return new Map(pois.map((p) => [p.id, p] as const));
});

const currentPoiLabel = computed(() => {
  if (!graph.value?.viewer_poi_id) return t('未知');
  const poi = poiById.value.get(graph.value.viewer_poi_id);
  return poi ? `${poiKeyToName(poi.poi_key)} (#${poi.id})` : `#${graph.value.viewer_poi_id}`;
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

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const onlineBackupPrefix = 'dad_online_world_backup_';
const getBackupKey = () => {
  const active = characterStore.rootState?.当前激活存档;
  const characterId = active?.角色ID ?? 'unknown';
  return `${onlineBackupPrefix}${characterId}`;
};

const readWorldBackup = (): { worldInfo: WorldInfo | null; location: PlayerLocation | null; onlineState: any | null } | null => {
  const raw = localStorage.getItem(getBackupKey());
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(getBackupKey());
    return null;
  }
};

const storeWorldBackup = (force: boolean = false) => {
  const key = getBackupKey();
  if (!force && localStorage.getItem(key)) return;
  const payload = {
    worldInfo: gameStateStore.worldInfo ? cloneJson(gameStateStore.worldInfo) : null,
    location: gameStateStore.location ? cloneJson(gameStateStore.location) : null,
    onlineState: gameStateStore.onlineState ? cloneJson(gameStateStore.onlineState) : null,
  };
  localStorage.setItem(key, JSON.stringify(payload));
};

const restoreWorldBackup = async (options: { persist?: boolean } = {}) => {
  const backup = readWorldBackup();
  if (backup) {
    if (backup.worldInfo) gameStateStore.updateState('worldInfo', backup.worldInfo);
    if (backup.location) gameStateStore.updateState('location', backup.location);
    if (backup.onlineState) gameStateStore.updateState('onlineState', backup.onlineState);
    localStorage.removeItem(getBackupKey());
    if (options.persist) await characterStore.saveCurrentGame();
    return true;
  }

  if (gameStateStore.onlineState && (gameStateStore.onlineState as any).房间ID) {
    gameStateStore.updateState('onlineState', {
      ...(gameStateStore.onlineState || {}),
      房间ID: null,
    });
    if (options.persist) await characterStore.saveCurrentGame();
  }
  return false;
};

const poiKeyToName = (key: string): string => {
  const normalized = String(key || '').trim();
  if (!normalized) return '未知地点';
  const map: Record<string, string> = {
    safehouse: '安全屋',
    market: '坊市',
    wild: '荒野',
    forest: '灵森',
    mountain: '名山',
    river: '灵河',
    spirit_spring: '灵泉',
    ancient_ruins: '古遗迹',
    cave: '幽洞',
    temple: '古庙',
    demon_nest: '魔巢',
  };
  return map[normalized] || normalized;
};

const poiToWorldLocationType = (poi: { poi_key?: string; type?: string }): string => {
  const key = poi?.poi_key ? String(poi.poi_key) : '';
  const t = poi?.type ? String(poi.type) : '';
  if (key === 'market' || t === 'town') return 'city_town';
  if (key === 'safehouse' || t === 'safehouse') return 'blessed_land';
  if (key === 'wild' || t === 'wild') return 'dangerous_area';
  return t || 'special_other';
};

const buildWorldInfoFromGraph = (mapGraph: MapGraphResponse, worldLabel: string): WorldInfo => {
  const pois = mapGraph.pois || [];
  const maxX = pois.reduce((m, p) => Math.max(m, Number(p.x) || 0), 0);
  const maxY = pois.reduce((m, p) => Math.max(m, Number(p.y) || 0), 0);
  const mapWidth = Math.max(1200, maxX + 300);
  const mapHeight = Math.max(900, maxY + 300);

  const locations = pois.map((poi) => ({
    名称: poiKeyToName(poi.poi_key) || `POI ${poi.id}`,
    类型: poiToWorldLocationType(poi),
    位置: poiKeyToName(poi.poi_key) || `坐标(${poi.x}, ${poi.y})`,
    coordinates: { x: poi.x, y: poi.y },
    描述: poi.poi_key ? `联机地点：${poiKeyToName(poi.poi_key)}` : '联机地点',
    特色: '',
    安全等级: '较安全' as const,
    开放状态: '开放' as const,
  }));

  return {
    世界名称: worldLabel,
    大陆信息: [],
    势力信息: [],
    地点信息: locations,
    地图配置: { width: mapWidth, height: mapHeight },
    生成时间: new Date().toISOString(),
    世界背景: mapGraph.map_key ? `联机地图：${mapGraph.map_key}` : '联机世界',
    世界纪元: '联机',
    特殊设定: [],
    版本: 'online',
  };
};

const calculateSpiritDensity = (poi: any): number => {
  if (!poi) return 20;

  // 根据类型设定灵气浓度范围
  let min = 10, max = 30;

  switch (poi.type) {
    case 'sect_power': // 宗门
      min = 50; max = 90;
      break;
    case 'safehouse':
    case 'blessed_land': // 洞天福地
      min = 70; max = 100;
      break;
    case 'treasure_land': // 奇珍异地
      min = 60; max = 90;
      break;
    case 'natural_landmark': // 名山大川
      min = 30; max = 70;
      break;
    case 'dangerous_area': // 凶险之地
      min = 20; max = 80;
      break;
    case 'town':
    case 'city_town': // 城镇
      min = 15; max = 40;
      break;
    default: // 其他
      min = 10; max = 30;
  }

  // 基于POI ID的确定性随机，保证同一个地点的灵气浓度不变
  let seedVal = 0;
  if (typeof poi.id === 'number') {
    seedVal = poi.id;
  } else if (typeof poi.id === 'string') {
    for (let i = 0; i < poi.id.length; i++) seedVal += poi.id.charCodeAt(i);
  }

  const seed = (seedVal || 0) * 123.45;
  const rand = Math.abs(Math.sin(seed)); // 0-1

  if (isNaN(rand)) return 20; // 安全兜底

  return Math.floor(min + rand * (max - min));
};

const buildOnlineLocation = (mapGraph: MapGraphResponse, worldLabel: string): PlayerLocation => {
  const viewerId = mapGraph.viewer_poi_id ?? mapGraph.pois?.[0]?.id;
  const viewerPoi = viewerId ? mapGraph.pois.find((poi) => poi.id === viewerId) : undefined;
  const label = viewerPoi?.poi_key ? `${poiKeyToName(viewerPoi.poi_key)}` : worldLabel;
  const spiritDensity = calculateSpiritDensity(viewerPoi);

  return {
    描述: label,
    x: viewerPoi?.x,
    y: viewerPoi?.y,
    灵气浓度: spiritDensity
  };
};

const syncTravelState = async (mapGraph: MapGraphResponse, activeSession: TravelStartResponse) => {
  storeWorldBackup();

  const worldLabel = selectedWorld.value?.owner_username
    ? `${selectedWorld.value.owner_username}的世界`
    : `联机世界 #${activeSession.target_world_instance_id}`;
  const worldInfo = buildWorldInfoFromGraph(mapGraph, worldLabel);
  const location = buildOnlineLocation(mapGraph, worldLabel);

  gameStateStore.updateState('worldInfo', worldInfo);
  gameStateStore.updateState('location', location);

  const currentOnline = gameStateStore.onlineState ?? {
    模式: '联机',
    房间ID: null,
    玩家ID: null,
    只读路径: ['世界'],
    世界曝光: false,
    冲突策略: '服务器',
  };

  gameStateStore.updateState('onlineState', {
    ...currentOnline,
    模式: '联机',
    房间ID: String(activeSession.session_id),
    只读路径: (currentOnline as any).只读路径 ?? ['世界'],
  });
};

const refreshProfile = async () => {
  try {
    const profile = await getTravelProfile();
    travelPoints.value = profile.travel_points;
    signedIn.value = !!profile.signed_in;
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

const refreshPresence = async () => {
  try {
    myPresence.value = await getMyPresence();
  } catch {
    myPresence.value = null;
  }
};

const loadSessionLogs = async (sessionId: number) => {
  try {
    sessionLogs.value = await getTravelSessionLogs(sessionId);
  } catch (e: any) {
    sessionLogs.value = null;
    toast.error(e?.message || t('获取会话日志失败'));
  }
};

const formatEventType = (eventType: string): string => {
  const map: Record<string, string> = {
    travel_start: '穿越开始',
    travel_end: '返回原世界',
    travel_evicted: '被驱逐（主人上线）',
    move: '移动',
    world_action_move: '移动',
  };
  return map[eventType] || eventType;
};

const refreshGraph = async () => {
  if (!session.value) {
    graph.value = null;
    return;
  }
  graph.value = await getMapGraph(session.value.target_world_instance_id, session.value.entry_map_id, session.value.session_id);
  if (graph.value) {
    await syncTravelState(graph.value, session.value);
  }
};

const restoreActiveSession = async () => {
  try {
    const activeSession = await getActiveTravelSession();
    if (activeSession) {
      session.value = activeSession;
      await refreshGraph();
      startSessionPolling(); // 启动轮询
    } else {
      session.value = null;
      graph.value = null;
      stopSessionPolling(); // 停止轮询
      await restoreWorldBackup();
    }
  } catch {
    // keep existing session state if the probe fails
  }
};

// 轮询检查会话状态（检测是否被驱逐）
const checkSessionStatus = async () => {
  if (!session.value) return;

  try {
    const status = await getTravelSessionStatus(session.value.session_id);

    if (status.state !== 'active') {
      // 会话已结束
      const wasEvicted = status.end_reason === 'owner_online' || status.end_reason === 'kicked';
      const endedSessionId = session.value.session_id;

      stopSessionPolling();
      session.value = null;
      graph.value = null;
      await restoreWorldBackup({ persist: true });
      await refreshReports();
      await loadSessionLogs(endedSessionId);
      activeTab.value = 'logs';

      if (wasEvicted) {
        if (status.end_reason === 'owner_online') {
          toast.warning(t('世界主人已上线，你被驱逐出了该世界'));
        } else {
          toast.warning(t('你已被驱逐出该世界'));
        }
      }
    }
  } catch (e: any) {
    // 404 意味着会话已不存在
    if (e?.status === 404 || e?.response?.status === 404) {
      const endedSessionId = session.value?.session_id;
      stopSessionPolling();
      session.value = null;
      graph.value = null;
      await restoreWorldBackup({ persist: true });
      if (endedSessionId) {
        await loadSessionLogs(endedSessionId);
      }
      activeTab.value = 'logs';
      toast.warning(t('穿越会话已结束'));
    }
    // 其他错误静默忽略，下次轮询再试
  }
};

// 启动会话状态轮询
const startSessionPolling = () => {
  stopSessionPolling(); // 先清理旧的定时器
  if (!session.value) return;

  sessionPollTimer.value = window.setInterval(() => {
    checkSessionStatus();
  }, SESSION_POLL_INTERVAL);
};

// 停止会话状态轮询
const stopSessionPolling = () => {
  if (sessionPollTimer.value) {
    clearInterval(sessionPollTimer.value);
    sessionPollTimer.value = null;
  }
};

const refreshAll = async () => {
  if (!backendReady.value) return;
  isLoading.value = true;
  try {
    await refreshProfile();
    await refreshMyWorld();
    await refreshPresence();
    await refreshReports();
    await restoreActiveSession();
  } finally {
    isLoading.value = false;
  }
};

const handleSignin = async () => {
  if (isLoading.value || signedIn.value) return;
  isLoading.value = true;
  try {
    const res = await signinTravel();
    travelPoints.value = res.travel_points;
    signedIn.value = !!res.signed_in;
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

const toggleOfflineAgent = async () => {
  if (!myWorld.value) return;
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    const current = myWorld.value.allow_offline_travel ?? true;
    const next = !current;
    myWorld.value = await updateMyWorldPolicy(next);
    toast.success(next ? t('已开启下线代理') : t('已关闭下线代理'));
  } catch (e: any) {
    toast.error(e?.message || t('切换失败'));
  } finally {
    isLoading.value = false;
  }
};

const saveOfflinePrompt = async () => {
  if (!myWorld.value) return;
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    myWorld.value = await updateMyWorldOfflinePrompt(offlinePromptDraft.value.trim());
    toast.success(t('离线代理提示词已保存'));
  } catch (e: any) {
    toast.error(e?.message || t('保存失败'));
  } finally {
    isLoading.value = false;
  }
};

const handleStartTravel = async () => {
  if (session.value) {
    toast.info(t('已有进行中的穿越，会话结束后才能继续'));
    return;
  }
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    session.value = await startTravel(targetUsername.value.trim(), inviteCode.value.trim() || undefined);
    travelPoints.value = session.value.travel_points_left;
    storeWorldBackup(true);
    await characterStore.saveCurrentGame();
    await refreshGraph();
    startSessionPolling();
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
      const endedSessionId = session.value.session_id;
      const res = await endTravel(endedSessionId);
      toast.success(res.message);
      stopSessionPolling();
      session.value = null;
      graph.value = null;
      await restoreWorldBackup({ persist: true });
      await refreshReports();
      await loadSessionLogs(endedSessionId);
      activeTab.value = 'logs';
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

// 新增: 加载可穿越世界列表
const loadWorlds = async (reset: boolean = false) => {
  if (!backendReady.value) return;

  if (reset) {
    currentPage.value = 0;
    worldsList.value = [];
    hasMore.value = true;
  }

  isLoadingWorlds.value = true;
  try {
    const worlds = await getTravelableWorlds(
      currentPage.value * pageSize,
      pageSize,
      visibilityFilter.value || undefined,
      searchQuery.value.trim() || undefined
    );

    if (worlds.length < pageSize) {
      hasMore.value = false;
    }

    if (reset) {
      worldsList.value = worlds;
    } else {
      worldsList.value = [...worldsList.value, ...worlds];
    }
  } catch (e: any) {
    toast.error(e?.message || t('加载世界列表失败'));
  } finally {
    isLoadingWorlds.value = false;
  }
};

// 新增: 加载更多
const loadMore = () => {
  if (isLoadingWorlds.value || !hasMore.value) return;
  currentPage.value++;
  loadWorlds(false);
};

// 新增: 选择世界
const selectWorld = (world: TravelableWorld) => {
  selectedWorld.value = world;
  inviteCode.value = ''; // 清空邀请码
  actionPanelMode.value = 'target';
};

// 新增: 穿越到选中的世界
const handleStartTravelToSelected = async () => {
  if (!selectedWorld.value) return;
  if (session.value) {
    toast.info(t('已有进行中的穿越，会话结束后才能继续'));
    return;
  }
  if (isLoading.value) return;

  isLoading.value = true;
  try {
    session.value = await startTravel(
      selectedWorld.value.owner_username,
      inviteCode.value.trim() || undefined
    );
    travelPoints.value = session.value.travel_points_left;
    storeWorldBackup(true);

    // 存储离线代理提示词到游戏状态
    if (session.value.owner_offline_agent_prompt || session.value.owner_character_info) {
      gameStateStore.updateState('onlineState', {
        ...(gameStateStore.onlineState || {}),
        穿越目标: {
          世界ID: session.value.target_world_instance_id,
          离线代理提示词: session.value.owner_offline_agent_prompt || null,
          角色信息: session.value.owner_character_info || null,
        },
      });
    }

    await characterStore.saveCurrentGame();
    await refreshGraph();
    startSessionPolling();
    toast.success(t('穿越成功'));
  } catch (e: any) {
    toast.error(e?.message || t('穿越失败'));
  } finally {
    isLoading.value = false;
  }
};

// 监听搜索和筛选变化 - 防抖处理
watch([searchQuery, visibilityFilter], () => {
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value);
  }

  searchDebounceTimer.value = window.setTimeout(() => {
    loadWorlds(true);
  }, 500);
});

// 监听 myWorld 变化，同步离线提示词到草稿
watch(myWorld, (newWorld) => {
  if (newWorld) {
    offlinePromptDraft.value = newWorld.offline_agent_prompt || '';
  }
}, { immediate: true });

onMounted(async () => {
  try {
    await uiStore.checkBackendConnection();
    if (!backendReady.value) return;
    await refreshProfile();
    await refreshMyWorld();
    await refreshPresence();
    await refreshReports();
    await restoreActiveSession();
    await loadWorlds(true); // 新增: 加载可穿越世界列表
  } catch (e: any) {
    console.warn('[OnlineTravelPanel] init failed', e);
  }
});

// 🔥 修复：组件卸载时清理定时器和防抖定时器，避免内存泄漏
onUnmounted(() => {
  stopSessionPolling();
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value);
    searchDebounceTimer.value = null;
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
  margin: 5px;
  transition: all 0.15s;
}
.action-btn:hover { border-color: var(--color-primary); }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.action-btn.primary { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
.action-btn.sm { padding: 0.35rem 0.6rem; font-size: 0.75rem; }

.tab-content { flex: 1; overflow-y: auto; padding: 1rem; }

/* Travel Tab */
.travel-layout {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 1rem;
  height: 100%;
}

/* 左侧世界列表面板 */
.worlds-list-panel {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  max-height: 600px;
}

.filter-bar {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  background: rgba(var(--color-primary-rgb), 0.05);
}

.search-box {
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.875rem;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.filter-select {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.875rem;
  cursor: pointer;
}

.travel-points-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  background: rgba(var(--color-primary-rgb), 0.05);
}

.points-icon {
  color: var(--color-primary);
}

.points-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.points-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary);
}

.worlds-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.empty-icon {
  opacity: 0.4;
  margin-bottom: 1rem;
}

.world-card {
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  cursor: pointer;
  transition: all 0.2s;
}

.world-card:hover {
  border-color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.05);
}

.world-card.selected {
  border-color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.1);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.world-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.owner-name {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--color-text);
}

.world-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.badge {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
}

.badge-public {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.badge-hidden {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.badge-locked {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.badge-online {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.badge-offline {
  background: rgba(107, 114, 128, 0.15);
  color: #94a3b8;
}

.world-id {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.inline-hint {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  line-height: 1.2;
  color: var(--color-text-secondary);
}

.inline-hint.danger {
  color: #ef4444;
}

.load-more-btn {
  width: 100%;
  padding: 0.75rem;
  margin-top: 0.5rem;
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.load-more-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.05);
}

.load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 右侧穿越操作面板 */
.travel-action-panel {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.25rem;
  gap: 1rem;
}

.action-panel-header {
  display: flex;
  gap: 0.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.panel-tab {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
}

.panel-tab.active {
  background: rgba(var(--color-primary-rgb), 0.08);
  border-color: rgba(var(--color-primary-rgb), 0.35);
  color: var(--color-text);
}

.panel-tab:hover:not(.active) {
  border-color: var(--color-primary);
  color: var(--color-text);
}

.action-panel-body {
  flex: 1;
  min-height: 0;
}

.selected-world-detail h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  color: var(--color-text);
}

.detail-info {
  margin-bottom: 1.5rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--color-border);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.info-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.invite-code-section {
  margin-bottom: 1.5rem;
}

.invite-code-section label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.invite-code-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.875rem;
}

.invite-code-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.session-info-box {
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: rgba(var(--color-primary-rgb), 0.05);
}

.session-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
}

.empty-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-selection .empty-icon {
  opacity: 0.3;
  margin-bottom: 1rem;
}

.my-world-info {
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  width: 100%;
}

.my-world-actions {
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* 离线代理提示词配置区域 */
.offline-prompt-section {
  margin-top: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(147, 51, 234, 0.05));
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 0.5rem;
}

.section-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
  font-weight: 500;
  color: var(--color-text);
}

.section-label .hint-text {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--color-text-secondary);
  font-style: italic;
}

.offline-prompt-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  min-height: 80px;
  background: white;
  color: var(--color-text);
  transition: border-color 0.2s ease;
}

.offline-prompt-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.offline-prompt-textarea:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
  opacity: 0.6;
}

.prompt-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.unsaved-hint {
  font-size: 0.75rem;
  color: #f59e0b;
  font-style: italic;
}

.info-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--color-text);
}

.muted {
  color: var(--color-text-secondary);
  font-size: 0.8rem;
}

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

.map-canvas-v2 {
  padding: 0;
  overflow: hidden;
  min-height: 380px;
}

:deep(.game-map-panel) {
  height: 100%;
}

:deep(.game-map-panel .map-container) {
  height: 100%;
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

.log-list { display: flex; flex-direction: column; gap: 0.4rem; }
.log-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  font-size: 0.875rem;
}
.log-time { color: var(--color-text-secondary); font-size: 0.8rem; }
.log-type { color: var(--color-text); font-weight: 600; }
.log-meta { color: var(--color-text-secondary); font-size: 0.8rem; }

.muted { color: var(--color-text-secondary); font-size: 0.8rem; }

@media (max-width: 768px) {
  .travel-layout {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .worlds-list-panel {
    max-height: 40vh;
  }

  .filter-bar {
    flex-direction: column;
    gap: 0.5rem;
  }

  .travel-action-panel {
    padding: 1rem;
  }

  .map-layout {
    grid-template-columns: 1fr;
  }

  .poi-map {
    height: 250px;
  }
}
</style>
