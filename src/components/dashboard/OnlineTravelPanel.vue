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
                <div v-if="session" class="session-info-box session-info-standalone">
                  <div class="session-header">
                    <div class="session-label">{{ t('当前会话') }} #{{ session.session_id }}</div>
                    <!-- 🔥 心跳状态指示器 -->
                    <div class="heartbeat-indicator" :class="`heartbeat-${heartbeatStatus}`">
                      <div class="heartbeat-dot"></div>
                      <span class="heartbeat-text">{{ heartbeatMessage || '通信正常' }}</span>
                    </div>
                  </div>
                  <button class="action-btn" @click="handleEndTravel" :disabled="isLoading">
                    <CornerUpLeft :size="16" />
                    {{ t('返回原世界') }}
                  </button>
                </div>
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
              <div v-if="getReportPreview(r)" class="report-preview">{{ getReportPreview(r) }}</div>
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
import { ArrowRight, CalendarCheck, Coins, CornerUpLeft, Globe, Lock, RefreshCw, ScrollText, Shield, FileText, Save } from 'lucide-vue-next';

const tabs = [
  { id: 'travel', label: '穿越', icon: Globe },
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
  getTravelWorldSnapshot,
  getTravelSessionLogs,
  getTravelProfile,
  getTravelableWorlds,
  getTravelSessionStatus,
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
  type TravelWorldSnapshotResponse,
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
const travelSnapshot = ref<TravelWorldSnapshotResponse | null>(null);
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

// 🔥 新增：心跳状态
const heartbeatStatus = ref<'normal' | 'warning' | 'error'>('normal');
const lastHeartbeatTime = ref<Date | null>(null);
const heartbeatMessage = ref('');

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

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const onlineBackupPrefix = 'dad_online_world_backup_';
const getBackupKey = () => {
  const active = characterStore.rootState?.当前激活存档;
  const characterId = active?.角色ID ?? 'unknown';
  return `${onlineBackupPrefix}${characterId}`;
};

// 🔥 修复：增强备份读取，支持多个备份 key 的降级策略
const readWorldBackup = (): { worldInfo: WorldInfo | null; location: PlayerLocation | null; relationships: any | null; onlineState: any | null; backupKey?: string } | null => {
  // 尝试多个可能的备份 key
  const active = characterStore.rootState?.当前激活存档;
  const characterId = active?.角色ID ?? 'unknown';
  const possibleKeys = [
    `${onlineBackupPrefix}${characterId}`,  // 当前角色ID
    `${onlineBackupPrefix}latest`,  // 最新备份（降级策略）
  ];

  for (const key of possibleKeys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const backup = JSON.parse(raw);
      // 验证备份数据的完整性
      if (backup && typeof backup === 'object') {
        console.log(`[联机穿越] 找到备份: ${key}`, {
          hasWorldInfo: !!backup.worldInfo,
          hasLocation: !!backup.location,
          hasRelationships: !!backup.relationships,
          hasOnlineState: !!backup.onlineState,
        });
        return { ...backup, backupKey: key };
      }
    } catch (e) {
      console.warn(`[联机穿越] 备份解析失败: ${key}`, e);
      localStorage.removeItem(key);
    }
  }
  return null;
};

const storeWorldBackup = (force: boolean = false) => {
  const key = getBackupKey();
  if (!force && localStorage.getItem(key)) {
    console.log('[联机穿越] 世界备份已存在，跳过');
    return;
  }
  const payload = {
    worldInfo: gameStateStore.worldInfo ? cloneJson(gameStateStore.worldInfo) : null,
    location: gameStateStore.location ? cloneJson(gameStateStore.location) : null,
    relationships: gameStateStore.relationships ? cloneJson(gameStateStore.relationships) : null,
    onlineState: gameStateStore.onlineState ? cloneJson(gameStateStore.onlineState) : null,
    timestamp: new Date().toISOString(),  // 🔥 添加时间戳
    characterId: characterStore.rootState?.当前激活存档?.角色ID,  // 🔥 添加角色ID
  };
  console.log('[联机穿越] 保存世界备份:', {
    key,
    hasWorldInfo: !!payload.worldInfo,
    hasLocation: !!payload.location,
    hasRelationships: !!payload.relationships,
    hasOnlineState: !!payload.onlineState,
    characterId: payload.characterId,
  });

  // 🔥 修复：同时保存到当前角色ID的key和"latest"的key（降级策略）
  localStorage.setItem(key, JSON.stringify(payload));
  localStorage.setItem(`${onlineBackupPrefix}latest`, JSON.stringify(payload));
};

const restoreWorldBackup = async (options: { persist?: boolean } = {}) => {
  const backup = readWorldBackup();
  if (backup) {
    console.log('[联机穿越] 恢复世界备份:', {
      hasWorldInfo: !!backup.worldInfo,
      hasLocation: !!backup.location,
      hasRelationships: !!backup.relationships,
      hasOnlineState: !!backup.onlineState,
      backupKey: backup.backupKey,
      timestamp: (backup as any).timestamp,
      characterId: (backup as any).characterId,
    });

    // 🔥 修复：验证备份的角色ID是否匹配（如果有的话）
    const currentCharId = characterStore.rootState?.当前激活存档?.角色ID;
    const backupCharId = (backup as any).characterId;
    if (backupCharId && currentCharId && backupCharId !== currentCharId) {
      console.warn('[联机穿越] 备份角色ID不匹配，但仍然恢复', {
        current: currentCharId,
        backup: backupCharId,
      });
      // 继续恢复，但给出警告
      toast.warning(t('备份角色ID不匹配，可能存在数据不一致'));
    }

    if (backup.worldInfo) gameStateStore.updateState('worldInfo', backup.worldInfo);
    if (backup.location) gameStateStore.updateState('location', backup.location);
    if (backup.relationships) gameStateStore.updateState('relationships', backup.relationships);
    if (backup.onlineState) gameStateStore.updateState('onlineState', backup.onlineState);

    // 🔥 修复：清理所有相关的备份 key
    if (backup.backupKey) {
      localStorage.removeItem(backup.backupKey);
    }
    localStorage.removeItem(getBackupKey());
    localStorage.removeItem(`${onlineBackupPrefix}latest`);

    if (options.persist) await characterStore.saveCurrentGame();
    console.log('[联机穿越] 世界备份恢复成功');
    return true;
  }

  console.warn('[联机穿越] 未找到世界备份，尝试清理联机状态');
  // 如果没有备份，至少清理联机状态
  if (gameStateStore.onlineState && (gameStateStore.onlineState as any).房间ID) {
    const currentOnline = gameStateStore.onlineState as any;
    console.log('[联机穿越] 清理联机状态:', {
      房间ID: currentOnline.房间ID,
      模式: currentOnline.模式,
    });

    gameStateStore.updateState('onlineState', {
      ...(gameStateStore.onlineState || {}),
      房间ID: null,
      穿越目标: null,
    });
    if (options.persist) await characterStore.saveCurrentGame();
    console.log('[联机穿越] 联机状态已清理');
  }
  return false;
};

const buildOnlineLocation = (mapGraph: MapGraphResponse, worldLabel: string): PlayerLocation => {
  // 从世界信息中获取地图配置
  const worldInfo = mapGraph.world_info as any;
  const mapConfig = worldInfo?.['地图配置'] || { width: 10000, height: 10000 };
  const width = Number(mapConfig.width) || 10000;
  const height = Number(mapConfig.height) || 10000;

  // 生成随机落点坐标（在地图范围内，避开边缘10%区域）
  const margin = 0.1;
  const x = Math.round(width * margin + Math.random() * width * (1 - 2 * margin));
  const y = Math.round(height * margin + Math.random() * height * (1 - 2 * margin));

  return {
    描述: `${worldLabel}（穿越落点）`,
    x,
    y,
    灵气浓度: 20
  };
};

/**
 * 清理关系数据，为入侵者创建"陌生人视角"的NPC数据
 *
 * 入侵者是外来者，NPC不认识入侵者
 * 清空NPC的所有记忆和与玩家的关系
 */
const sanitizeRelationshipsForInvader = (rels: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  for (const [key, npc] of Object.entries(rels)) {
    if (npc && typeof npc === 'object') {
      sanitized[key] = {
        ...npc,
        // 核心重置：入侵者对NPC来说是陌生人
        与玩家关系: '陌生人',
        好感度: 0,
        // 清空NPC的所有记忆（入侵者不应该知道NPC的过往）
        记忆: [],
        记忆总结: [],
        // 内心想法重置为中性
        当前内心想法: '...',
        // 入侵者不继承关注状态
        实时关注: false,
      };
    } else {
      sanitized[key] = npc;
    }
  }
  return sanitized;
};

const syncTravelState = async (
  mapGraph: MapGraphResponse,
  activeSession: TravelStartResponse,
  snapshot?: TravelWorldSnapshotResponse | null,
  isInitialTravel: boolean = false
) => {
  storeWorldBackup();

  const worldLabel = selectedWorld.value?.owner_username
    ? `${selectedWorld.value.owner_username}的世界`
    : `联机世界 #${activeSession.target_world_instance_id}`;

  // 优先使用 mapGraph.world_info（来自 /graph 接口），其次使用 snapshot.world_info
  const rawWorldInfo = mapGraph.world_info ?? snapshot?.world_info;
  const worldInfo =
    rawWorldInfo && typeof rawWorldInfo === 'object'
      ? (rawWorldInfo as any as WorldInfo)
      : ({
        世界名称: worldLabel,
        大陆信息: [],
        势力信息: [],
        地点信息: [],
        地图配置: { width: 1200, height: 900 },
        生成时间: new Date().toISOString(),
        世界背景: '',
        世界纪元: '联机',
        特殊设定: [],
        版本: 'online',
      } as any as WorldInfo);

  gameStateStore.updateState('worldInfo', worldInfo);

  // 只在首次穿越时设置位置，恢复会话时保留玩家已有的位置
  if (isInitialTravel) {
    const location = buildOnlineLocation(mapGraph, worldLabel);
    gameStateStore.updateState('location', location);
  }

  // 入侵者保留自己原来的叙事历史和记忆，不做任何修改
  // （备份机制已经在 storeWorldBackup 中保存了原始状态）

  // 优先使用 mapGraph.relationships，其次使用 snapshot.relationships
  // 入侵者不应继承世界主人的好感度关系，需要重置为陌生人状态
  const rels = mapGraph.relationships ?? snapshot?.relationships;
  if (rels && typeof rels === 'object') {
    const sanitizedRels = sanitizeRelationshipsForInvader(rels as Record<string, any>);
    gameStateStore.updateState('relationships', sanitizedRels as any);
  }

  const currentOnline = gameStateStore.onlineState ?? {
    模式: '联机',
    房间ID: null,
    玩家ID: null,
    只读路径: ['世界'],
    世界曝光: false,
    冲突策略: '服务器',
  };

  // 调试日志：追踪世界主人位置数据
  const ownerLocation = mapGraph.owner_location ?? snapshot?.owner_location ?? null;
  console.log('[联机穿越] 世界主人位置数据:', {
    'mapGraph.owner_location': mapGraph.owner_location,
    'snapshot?.owner_location': snapshot?.owner_location,
    '最终使用': ownerLocation
  });

  gameStateStore.updateState('onlineState', {
    ...currentOnline,
    模式: '联机',
    房间ID: String(activeSession.session_id),
    只读路径: (currentOnline as any).只读路径 ?? ['世界'],
    穿越目标: {
      ...((currentOnline as any).穿越目标 ?? {}),
      世界ID: activeSession.target_world_instance_id,
      主人用户名: snapshot?.owner_username ?? selectedWorld.value?.owner_username ?? null,
      世界主人位置: ownerLocation,
      世界主人档案: (() => {
        const base = mapGraph.owner_base_info ?? snapshot?.owner_base_info;
        if (!base || typeof base !== 'object') return null;
        const b = base as any;
        // 存储完整的角色信息用于AI代理
        return {
          // 基本信息
          名字: b.名字 ?? b.name ?? null,
          性别: b.性别 ?? b.gender ?? null,
          种族: b.种族 ?? b.race ?? null,
          世界: b.世界?.name ?? b.世界 ?? null,
          // 修为信息
          境界: b.境界 ?? b.cultivation_level ?? null,
          修为进度: b.修为进度 ?? null,
          // 属性值
          气血: b.气血 ?? null,
          灵气: b.灵气 ?? null,
          神识: b.神识 ?? null,
          寿命: b.寿命 ?? null,
          // 六司属性
          先天六司: b.先天六司 ?? null,
          后天六司: b.后天六司 ?? null,
          // 其他
          门派: b.门派 ?? b.sect ?? null,
          功法: b.功法 ?? null,
          技能: b.技能 ?? b.skills ?? null,
          特质: b.特质 ?? b.traits ?? null,
          // 保留原始数据以防遗漏
          _raw: b,
        };
      })(),
      存档版本: snapshot?.save_version ?? null,
      游戏时间: snapshot?.game_time ?? null,
    },
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
  } catch {
    sessionLogs.value = null;
    // request.ts 已统一处理错误弹窗
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

const refreshGraph = async (isInitialTravel: boolean = false) => {
  if (!session.value) {
    graph.value = null;
    return;
  }
  graph.value = await getMapGraph(session.value.target_world_instance_id, session.value.entry_map_id, session.value.session_id);
  travelSnapshot.value = null;
  try {
    travelSnapshot.value = await getTravelWorldSnapshot(session.value.session_id);
  } catch {
    travelSnapshot.value = null;
  }
  if (graph.value) {
    await syncTravelState(graph.value, session.value, travelSnapshot.value, isInitialTravel);
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

    // 🔥 更新心跳状态
    lastHeartbeatTime.value = new Date();
    heartbeatStatus.value = 'normal';
    heartbeatMessage.value = '通信正常';

    if (status.state !== 'active') {
      // 会话已结束
      const wasEvicted = status.end_reason === 'owner_online' || status.end_reason === 'kicked';
      const endedSessionId = session.value.session_id;

      stopSessionPolling();
      session.value = null;
      graph.value = null;
      await restoreWorldBackup({ persist: true });

      // 添加返回叙事消息
      let returnContent = '';
      if (wasEvicted) {
        if (status.end_reason === 'owner_online') {
          returnContent = `【强制驱逐】你突然感到一股强大的排斥力量！` +
            `世界主人已经上线，这个世界的真正主人回归了。` +
            `虚空裂隙被强行撕开，你被一股不可抗拒的力量推出了这个世界。` +
            `\n\n当你回过神来，发现自己已经回到了自己的世界。`;
        } else {
          returnContent = `【强制驱逐】你突然感到一股强大的排斥力量！` +
            `世界主人发现了你的存在，决定将你驱逐出境。` +
            `虚空裂隙被强行撕开，你被一股不可抗拒的力量推出了这个世界。` +
            `\n\n当你回过神来，发现自己已经回到了自己的世界。`;
        }
      } else {
        returnContent = `【穿越结束】虚空裂隙再次出现，将你从异世界拉回。` +
          `当你睁开眼睛时，发现自己已经回到了熟悉的世界。` +
          `周围的一切都如你离开时一样，仿佛时间在你离开期间被冻结了。`;
      }

      const returnMessage = {
        type: 'system' as const,
        content: returnContent,
        time: new Date().toISOString(),
        actionOptions: ['查看自身状态', '回忆穿越经历', '继续当前活动'],
      };
      if (gameStateStore.narrativeHistory) {
        gameStateStore.narrativeHistory.push(returnMessage);
      }

      gameStateStore.addToShortTermMemory(
        `你的联机穿越结束了，已返回自己的世界。` +
        `原世界在你离开期间处于时间冻结状态，一切如你离开时一样。`
      );

      await characterStore.saveCurrentGame();
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

      // 添加返回叙事消息
      const returnMessage = {
        type: 'system' as const,
        content: `【穿越结束】虚空裂隙突然消失，你被强制拉回了自己的世界。` +
          `当你回过神来，发现自己已经回到了熟悉的地方。` +
          `周围的一切都如你离开时一样。`,
        time: new Date().toISOString(),
        actionOptions: ['查看自身状态', '继续当前活动'],
      };
      if (gameStateStore.narrativeHistory) {
        gameStateStore.narrativeHistory.push(returnMessage);
      }

      gameStateStore.addToShortTermMemory(
        `你的联机穿越会话已结束，已返回自己的世界。`
      );

      await characterStore.saveCurrentGame();
      if (endedSessionId) {
        await loadSessionLogs(endedSessionId);
      }
      activeTab.value = 'logs';
      toast.warning(t('穿越会话已结束'));
    } else {
      // 🔥 其他错误：更新心跳状态为警告
      heartbeatStatus.value = 'warning';
      heartbeatMessage.value = '通信异常，正在重试...';
      console.warn('[联机穿越] 心跳检测失败:', e);
    }
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
  } catch {
    // request.ts 已统一处理错误弹窗
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
  } catch {
    // request.ts 已统一处理错误弹窗
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
  } catch {
    // request.ts 已统一处理错误弹窗
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
  } catch {
    // request.ts 已统一处理错误弹窗
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
    await refreshGraph(true);  // 首次穿越，设置初始位置
    startSessionPolling();
    toast.success(t('穿越成功'));
  } catch {
    // request.ts 已统一处理错误弹窗
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
      travelSnapshot.value = null;
      await restoreWorldBackup({ persist: true });

      // 添加返回叙事消息到历史记录（让用户在界面上看到）
      const returnMessage = {
        type: 'system' as const,
        content: `【穿越结束】虚空裂隙再次出现，将你从异世界拉回。` +
          `当你睁开眼睛时，发现自己已经回到了熟悉的世界。` +
          `周围的一切都如你离开时一样，仿佛时间在你离开期间被冻结了。` +
          `NPC们并不知道你曾经离开过，对他们来说，你只是短暂地失神了片刻。` +
          `\n\n你的联机穿越之旅结束了，但那段经历将永远留在你的记忆中。`,
        time: new Date().toISOString(),
        actionOptions: ['查看自身状态', '回忆穿越经历', '继续当前活动'],
      };
      if (gameStateStore.narrativeHistory) {
        gameStateStore.narrativeHistory.push(returnMessage);
      }

      // 同时添加到短期记忆
      gameStateStore.addToShortTermMemory(
        `你结束了联机穿越，通过虚空通道返回了自己的世界。` +
        `原世界在你离开期间处于时间冻结状态，一切如你离开时一样，NPC们并不知道你曾经离开过。`
      );

      await characterStore.saveCurrentGame();
      await refreshReports();
      await loadSessionLogs(endedSessionId);
      activeTab.value = 'logs';
    } catch {
      // request.ts 已统一处理错误弹窗
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
  } catch {
    // request.ts 已统一处理错误弹窗
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

const getReportPreview = (r: InvasionReportOut): string => {
  const summary = (r as any)?.summary;
  if (!summary || typeof summary !== 'object') return '';
  const notes = (summary as any).notes;
  if (!Array.isArray(notes) || notes.length === 0) return '';
  const first = notes[0];
  const text = first && typeof first === 'object' ? (first as any).note : null;
  if (typeof text !== 'string' || !text.trim()) return '';
  return text.trim();
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
    await refreshGraph(true);  // 首次穿越，设置初始位置
    startSessionPolling();
    const owner = selectedWorld.value?.owner_username || '对方';
    const continents = gameStateStore.worldInfo?.大陆信息 || [];
    const continentName = continents.length > 0 ? (continents[0].名称 || continents[0].name || '未知大陆') : '未知大陆';
    const playerLocation = gameStateStore.location as any;
    const locationDesc = playerLocation?.描述 || continentName;

    // 添加穿越消息到叙事历史（正文），让AI能看到穿越发生了
    const travelMessage = {
      type: 'system' as const,
      content: `【穿越事件】时空裂隙突然出现，你被一股神秘力量卷入其中。` +
        `当你再次睁开眼睛时，发现自己已经来到了一个完全陌生的世界——「${owner}」的世界。` +
        `你降临在${locationDesc}，坐标(${playerLocation?.x ?? '未知'}, ${playerLocation?.y ?? '未知'})。` +
        `\n\n这里的一切都是陌生的，没有人认识你。你是一个外来者，一个穿越者。` +
        `你保留着原世界的所有记忆，但这个世界的人并不知道"穿越"是什么。` +
        `如果你提到原世界、寻找原世界的人、或者说一些这个世界的人听不懂的话，他们可能会觉得你在说胡话，或者认为你修炼走火入魔了。` +
        `\n\n你需要小心行事，探索这个新世界。世界主人「${owner}」可能在某处活动，你可以选择寻找他，或者独自探索。`,
      time: new Date().toISOString(),
      actionOptions: ['观察四周环境', '寻找附近的人', '查看自己的状态', `打听「${owner}」的消息`],
    };
    if (gameStateStore.narrativeHistory) {
      gameStateStore.narrativeHistory.push(travelMessage);
    }

    // 同时添加到短期记忆
    gameStateStore.addToShortTermMemory(
      `【穿越到异世界】你通过虚空裂隙穿越到了「${owner}」的世界。` +
      `这是一个完全陌生的世界，你降临在${continentName}，坐标(${playerLocation?.x ?? '未知'}, ${playerLocation?.y ?? '未知'})。` +
      `你是一个外来者，保留着原世界的记忆，但这里的人都不认识你。` +
      `如果你提到原世界或说一些奇怪的话，这里的人可能会觉得你在说胡话。` +
      `世界主人「${owner}」可能在某处活动，你可以选择寻找他或独自探索。`
    );
    await characterStore.saveCurrentGame();
    toast.success(t('穿越成功'));
  } catch {
    // request.ts 已统一处理错误弹窗，此处不再重复
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

.session-info-standalone {
  margin-bottom: 1rem;
}

/* 🔥 会话头部布局 */
.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

/* 🔥 心跳状态指示器 */
.heartbeat-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.heartbeat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: heartbeat-pulse 2s ease-in-out infinite;
}

.heartbeat-normal .heartbeat-dot {
  background-color: #10b981;
}

.heartbeat-warning .heartbeat-dot {
  background-color: #f59e0b;
}

.heartbeat-error .heartbeat-dot {
  background-color: #ef4444;
}

.heartbeat-normal .heartbeat-text {
  color: #10b981;
}

.heartbeat-warning .heartbeat-text {
  color: #f59e0b;
}

.heartbeat-error .heartbeat-text {
  color: #ef4444;
}

@keyframes heartbeat-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.2);
  }
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
.owner-loc { font-size: 0.8rem; color: var(--color-text-secondary); margin-bottom: 0.5rem; }
.report-preview { margin-top: 0.35rem; font-size: 0.8rem; color: var(--color-text-secondary); }

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
