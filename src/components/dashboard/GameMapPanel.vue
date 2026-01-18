<template>
  <div class="game-map-panel">
    <!-- 世界信息头部 -->
    <div v-if="worldBackground" class="world-info-header">
      <div class="world-name">{{ worldName }}</div>
      <div class="world-background">{{ worldBackground }}</div>
    </div>

    <!-- Pixi.js Canvas容器 -->
    <div class="map-container" ref="mapContainerRef">
      <canvas ref="canvasRef"></canvas>

      <!-- 初始化地图按钮 (仅在地图为空时显示) -->
      <div v-if="!hasMapContent && !isInitializing" class="initialize-map-overlay">
        <div class="initialize-prompt">
          <div class="prompt-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="map-icon">
              <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" />
              <path d="M9 3v15M15 6v15" />
            </svg>
          </div>
          <h3>地图尚未初始化</h3>
          <p>当前世界还没有生成势力和地点，选择密度后点击按钮开始生成</p>
          <div class="density-selector">
            <label class="density-label">地图密度：</label>
            <div class="density-options">
              <label
                v-for="opt in densityOptions"
                :key="opt.value"
                class="density-option"
                :class="{ active: mapDensity === opt.value }"
              >
                <input type="radio" :value="opt.value" v-model="mapDensity" />
                <span class="option-label">{{ opt.label }}</span>
                <span class="option-desc">{{ opt.desc }}</span>
              </label>
            </div>
          </div>
          <button @click="initializeMap" class="initialize-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12h8M12 8v8" />
            </svg>
            初始化地图
          </button>
        </div>
      </div>

      <!-- 初始化进行中 -->
      <div v-if="isInitializing" class="initialize-map-overlay">
        <div class="initialize-prompt">
          <div class="loading-spinner"></div>
          <h3>正在生成地图内容...</h3>
          <p class="status-text">{{ mapStatus }}</p>
        </div>
      </div>
    </div>

    <!-- 地点信息弹窗 -->
    <div v-if="selectedLocation && !isFactionLocation(selectedLocation)" class="location-popup" :style="popupStyle">
      <div class="popup-header">
        <h4>{{ selectedLocation.name }}</h4>
        <button @click="closePopup" class="close-btn">×</button>
      </div>
      <div class="popup-content">
        <p class="location-type">{{ getLocationTypeName(selectedLocation.type) }}</p>
        <p class="location-desc">{{ selectedLocation.description || selectedLocation.描述 }}</p>
        <div v-if="selectedLocation.danger_level" class="location-detail">
          <strong>安全等级：</strong>{{ selectedLocation.danger_level }}
        </div>
        <div v-if="selectedLocation.suitable_for" class="location-detail">
          <strong>适合境界：</strong>{{ selectedLocation.suitable_for }}
        </div>
        <div v-if="selectedLocation.controlled_by" class="location-detail">
          <strong>控制势力：</strong>{{ selectedLocation.controlled_by }}
        </div>
      </div>
    </div>

    <!-- 势力信息弹窗 -->
    <div v-if="selectedLocation && isFactionLocation(selectedLocation)" class="location-popup faction-popup" :style="popupStyle">
      <div class="popup-header">
        <h4>{{ selectedLocation.name || selectedLocation.名称 }}</h4>
        <button @click="closePopup" class="close-btn">×</button>
      </div>
      <div class="popup-content">
        <p class="location-type">{{ selectedLocation.类型 || selectedLocation.type || '势力' }}</p>
        <p class="location-desc">{{ selectedLocation.description || selectedLocation.描述 }}</p>

        <div v-if="selectedLocation.等级" class="location-detail">
          <strong>势力等级：</strong>{{ selectedLocation.等级 }}
        </div>

        <div v-if="selectedLocation.leadership || selectedLocation.领导层" class="location-detail">
          <strong>掌门：</strong>{{ (selectedLocation.leadership?.宗主 || selectedLocation.领导层?.宗主) }}
          <span v-if="selectedLocation.leadership?.宗主修为 || selectedLocation.领导层?.宗主修为">
            （{{ selectedLocation.leadership?.宗主修为 || selectedLocation.领导层?.宗主修为 }}）
          </span>
        </div>

        <div v-if="selectedLocation.memberCount || selectedLocation.成员数量" class="location-detail">
          <strong>成员数量：</strong>{{ (selectedLocation.memberCount?.total || selectedLocation.成员数量?.总数 || selectedLocation.成员数量?.total) }}人
        </div>

        <div v-if="selectedLocation.特色 && selectedLocation.特色.length > 0" class="location-detail">
          <strong>势力特色：</strong>{{ Array.isArray(selectedLocation.特色) ? selectedLocation.特色.join('、') : selectedLocation.特色 }}
        </div>

        <div v-if="selectedLocation.与玩家关系" class="location-detail">
          <strong>关系：</strong>
          <span :class="getRelationClass(selectedLocation.与玩家关系)">
            {{ selectedLocation.与玩家关系 }}
          </span>
        </div>
      </div>
    </div>

    <!-- 大陆信息弹窗 -->
    <div v-if="selectedContinent" class="location-popup continent-popup" :style="popupStyle">
      <div class="popup-header">
        <h4>{{ selectedContinent.name }}</h4>
        <button @click="closePopup" class="close-btn">×</button>
      </div>
      <div class="popup-content">
        <p class="location-type">大陆</p>
        <p class="location-desc">{{ selectedContinent.description || '广袤的修仙大陆，蕴含无尽机缘与危险。' }}</p>

        <div v-if="selectedContinent.气候" class="location-detail">
          <strong>气候：</strong>{{ selectedContinent.气候 }}
        </div>

        <div v-if="selectedContinent.地理特征 && selectedContinent.地理特征.length > 0" class="location-detail">
          <strong>地理特征：</strong>{{ selectedContinent.地理特征.join('、') }}
        </div>

        <div v-if="selectedContinent.天然屏障 && selectedContinent.天然屏障.length > 0" class="location-detail">
          <strong>天然屏障：</strong>{{ selectedContinent.天然屏障.join('、') }}
        </div>

        <div v-if="selectedContinent.特点" class="location-detail">
          <strong>大陆特点：</strong>{{ selectedContinent.特点 }}
        </div>

        <div v-if="selectedContinent.主要势力 && selectedContinent.主要势力.length > 0" class="location-detail">
          <strong>主要势力：</strong>{{ Array.isArray(selectedContinent.主要势力) ? selectedContinent.主要势力.join('、') : selectedContinent.主要势力 }}
        </div>
      </div>
    </div>

    <!-- 地图图例 -->
    <div class="map-legend" :class="{ collapsed: legendCollapsed }">
      <div class="legend-header" @click="legendCollapsed = !legendCollapsed">
        <div class="legend-title">{{ worldName }}图例{{ props.isOnline ? '（联机）' : '' }}</div>
        <button class="legend-toggle">
          <ChevronUp v-if="!legendCollapsed" :size="16" />
          <ChevronDown v-if="legendCollapsed" :size="16" />
        </button>
      </div>
      <div v-if="!legendCollapsed" class="legend-items">
        <!-- 名山大川 -->
        <div class="legend-item">
          <Mountain :size="16" class="legend-icon mountain" />
          <span>名山大川</span>
        </div>
        <!-- 宗门势力 -->
        <div class="legend-item">
          <Building2 :size="16" class="legend-icon faction" />
          <span>宗门势力</span>
        </div>
        <!-- 城镇坊市 -->
        <div class="legend-item">
          <Store :size="16" class="legend-icon town" />
          <span>城镇坊市</span>
        </div>
        <!-- 洞天福地 -->
        <div class="legend-item">
          <Sparkles :size="16" class="legend-icon blessed" />
          <span>洞天福地</span>
        </div>
        <!-- 奇珍异地 -->
        <div class="legend-item">
          <Gem :size="16" class="legend-icon treasure" />
          <span>奇珍异地</span>
        </div>
        <!-- 凶险之地 -->
        <div class="legend-item">
          <AlertTriangle :size="16" class="legend-icon danger" />
          <span>凶险之地</span>
        </div>
        <!-- 其他特殊 -->
        <div class="legend-item">
          <Zap :size="16" class="legend-icon special" />
          <span>其他特殊</span>
        </div>
        <!-- 玩家位置 -->
        <div class="legend-item">
          <User :size="16" class="legend-icon player" />
          <span>玩家位置</span>
        </div>
        <!-- NPC位置 -->
        <div class="legend-item">
          <Users :size="16" class="legend-icon npc" />
          <span>NPC位置</span>
        </div>
      </div>
    </div>

    <!-- 地图操作按钮 -->
    <div class="map-actions" :class="{ expanded: actionsExpanded }">
      <div class="actions-header" @click="actionsExpanded = !actionsExpanded">
        <Menu :size="16" />
        <span>地图功能</span>
        <ChevronDown v-if="!actionsExpanded" :size="14" class="toggle-icon" />
        <ChevronUp v-else :size="14" class="toggle-icon" />
      </div>
      <div v-if="actionsExpanded" class="actions-content">
        <button
          v-if="hasMapContent"
          @click="showGenerateModal = true"
          class="action-btn"
          :disabled="isGenerating"
        >
          <Plus :size="14" />
          <span>追加生成</span>
        </button>
        <button
          @click="emit('toggle-text-mode')"
          class="action-btn text-mode-btn"
        >
          <FileText :size="14" />
          <span>文字模式</span>
        </button>
      </div>
    </div>

    <!-- 追加生成弹窗 -->
    <div v-if="showGenerateModal" class="generate-modal-overlay" @click.self="showGenerateModal = false">
      <div class="generate-modal">
        <div class="modal-header">
          <h3>追加生成内容</h3>
          <button @click="showGenerateModal = false" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="generate-option">
            <label>
              <input type="checkbox" v-model="generateOptions.locations" />
              生成地点
            </label>
            <input
              type="number"
              v-model.number="generateOptions.locationCount"
              min="1"
              max="10"
              :disabled="!generateOptions.locations"
              class="count-input"
            />
            <span class="count-label">个</span>
          </div>
          <div class="generate-option">
            <label>
              <input type="checkbox" v-model="generateOptions.factions" />
              生成势力
            </label>
            <input
              type="number"
              v-model.number="generateOptions.factionCount"
              min="1"
              max="5"
              :disabled="!generateOptions.factions"
              class="count-input"
            />
            <span class="count-label">个</span>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showGenerateModal = false" class="cancel-btn">取消</button>
          <button
            @click="generateAdditionalContent"
            class="confirm-btn"
            :disabled="isGenerating || (!generateOptions.locations && !generateOptions.factions)"
          >
            {{ isGenerating ? '生成中...' : '开始生成' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { Mountain, Building2, Store, Sparkles, Gem, AlertTriangle, Zap, User, Users, ChevronUp, ChevronDown, Plus, FileText, Menu } from 'lucide-vue-next';
import { GameMapManager } from '@/utils/gameMapManager';
import { normalizeLocationsData, normalizeContinentBounds } from '@/utils/coordinateConverter';
import { useGameStateStore } from '@/stores/gameStateStore';
import { toast } from '@/utils/toast';
import { EnhancedWorldGenerator } from '@/utils/worldGeneration/enhancedWorldGenerator';
import { isTavernEnv } from '@/utils/tavern';
import type { WorldLocation } from '@/types/location';
import type { GameCoordinates } from '@/types/gameMap';
import type { NpcProfile, GameTime } from '@/types/game';

// Props
const props = defineProps<{
  isOnline?: boolean;
}>();

// Emits
const emit = defineEmits<{
  (e: 'toggle-text-mode'): void;
}>();

const gameStateStore = useGameStateStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const mapContainerRef = ref<HTMLDivElement | null>(null);
const mapManager = ref<GameMapManager | null>(null);
const selectedLocation = ref<WorldLocation | null>(null);
const selectedContinent = ref<any | null>(null);
const mapStatus = ref('初始化中...');
const popupPosition = ref({ x: 0, y: 0 });
const isInitializing = ref(false);
const legendCollapsed = ref(false);
const actionsExpanded = ref(false);

// 追加生成相关
const showGenerateModal = ref(false);
const isGenerating = ref(false);
const generateOptions = ref({
  locations: true,
  locationCount: 3,
  factions: false,
  factionCount: 1
});

// 地图密度配置
type MapDensity = 'sparse' | 'normal' | 'dense';
const mapDensity = ref<MapDensity>('normal');
const densityOptions: { value: MapDensity; label: string; desc: string }[] = [
  { value: 'sparse', label: '稀疏', desc: '势力3-4个，地点6-8个' },
  { value: 'normal', label: '正常', desc: '势力5-8个，地点12-16个' },
  { value: 'dense', label: '密集', desc: '势力8-12个，地点20-30个' },
];
const densityMultipliers: Record<MapDensity, { faction: number; location: number }> = {
  sparse: { faction: 0.5, location: 0.5 },
  normal: { faction: 1, location: 1 },
  dense: { faction: 1.5, location: 1.5 },
};

const worldName = computed(() => gameStateStore.worldInfo?.世界名称 || '修仙界');
const worldBackground = computed(() => gameStateStore.worldInfo?.世界背景 || '');
const mapRenderConfig = computed(() => {
  const mapConfig = (gameStateStore.worldInfo as any)?.['地图配置'];
  const width = Number(mapConfig?.width) || 10000;
  const height = Number(mapConfig?.height) || 10000;
  const tileSize = Math.max(80, Math.round(Math.min(width, height) / 80));
  return {
    width,
    height,
    tileSize,
    minZoom: 0.1,
    maxZoom: 4,
  };
});
const mapSizeKey = computed(() => `${mapRenderConfig.value.width}x${mapRenderConfig.value.height}`);

// 检查地图是否有内容 (地点或势力)
const hasMapContent = computed(() => {
  const worldInfo = gameStateStore.worldInfo;
  if (!worldInfo) return false;
  const hasLocations = worldInfo.地点信息?.length > 0;
  const hasFactions = worldInfo.势力信息?.length > 0;
  return hasLocations || hasFactions;
});

// 地点类型中文名称映射（支持英文和中文类型）
const locationTypeNames: Record<string, string> = {
  // 英文类型（兼容旧数据）
  natural_landmark: '名山大川',
  sect_power: '宗门势力',
  city_town: '城镇坊市',
  blessed_land: '洞天福地',
  treasure_land: '奇珍异地',
  dangerous_area: '凶险之地',
  special_other: '其他特殊',
  // 中文类型（新数据）
  '名山大川': '名山大川',
  '城镇坊市': '城镇坊市',
  '洞天福地': '洞天福地',
  '奇珍异地': '奇珍异地',
  '凶险之地': '凶险之地',
  '其他特殊': '其他特殊',
};

const getLocationTypeName = (type: string): string => {
  return locationTypeNames[type] || type || '未知类型';
};

/**
 * 判断是否为势力地点
 */
const isFactionLocation = (location: any): boolean => {
  return location.类型 === '修仙宗门' ||
         location.类型 === '魔道宗门' ||
         location.类型 === '修仙世家' ||
         location.类型 === '散修联盟' ||
         location.类型 === '商会' ||
         location.类型 === '妖族势力' ||
         location.type === 'sect_power' ||
         !!location.leadership ||
         !!location.领导层 ||
         !!location.memberCount ||
         !!location.成员数量;
};

/**
 * 获取关系样式类名
 */
const getRelationClass = (relation: string): string => {
  if (relation === '友好' || relation === '盟友') return 'relation-friendly';
  if (relation === '敌对' || relation === '仇敌') return 'relation-hostile';
  return 'relation-neutral';
};

// 弹窗样式
const popupStyle = computed(() => {
  if (!selectedLocation.value && !selectedContinent.value) return {};

  const containerRect = mapContainerRef.value?.getBoundingClientRect();
  if (!containerRect) return {};

  let left = popupPosition.value.x;
  let top = popupPosition.value.y;

  // 确保弹窗不超出容器边界
  const popupWidth = 320; // 最小宽度
  const popupHeight = 200; // 估计高度
  const padding = 20;
  let showBelow = false; // 是否显示在点击位置下方

  // 水平方向调整
  if (left + popupWidth / 2 > containerRect.width - padding) {
    left = containerRect.width - popupWidth / 2 - padding;
  }
  if (left - popupWidth / 2 < padding) {
    left = popupWidth / 2 + padding;
  }

  // 垂直方向调整
  if (top - popupHeight < padding) {
    // 如果上方空间不足，显示在下方
    top = top + 20;
    showBelow = true;
  } else {
    // 显示在上方，添加小间距
    top = top - 10;
  }

  return {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    // 上方显示时向上偏移100%，下方显示时不偏移
    transform: showBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
    zIndex: '2000',
  };
});

const setupMapManager = async () => {
  if (!canvasRef.value || !mapContainerRef.value) return;

  try {
    mapStatus.value = '正在初始化地图...';

    // 等待下一帧，确保 DOM 完全渲染
    await new Promise(resolve => requestAnimationFrame(resolve));

    // 获取容器尺寸并设置 canvas 尺寸
    const rect = mapContainerRef.value.getBoundingClientRect();
    const canvas = canvasRef.value;

    // 确保canvas有有效的尺寸
    if (rect.width === 0 || rect.height === 0) {
      console.warn('[地图] 容器尺寸无效，使用默认值');
      canvas.width = 800;
      canvas.height = 600;
    } else {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    console.log('[地图] Canvas 尺寸:', { width: canvas.width, height: canvas.height });

    // 重新初始化地图管理器，确保地图尺寸更新
    mapManager.value?.destroy();
    mapManager.value = new GameMapManager(canvas, mapRenderConfig.value);

    // 监听地图事件
    mapManager.value.on('locationClick', (data: unknown) => {
      handleLocationClick(data);
    });

    mapManager.value.on('continentClick', (data: unknown) => {
      handleContinentClick(data);
    });

    // 加载地图数据
    await loadMapData({ silent: true, reset: true });

    mapStatus.value = '地图加载完成';
  } catch (error) {
    console.error('[地图] 初始化失败:', error);
    mapStatus.value = '地图加载失败';
    const errorMessage = (error as Error).message;

    // 提供更有帮助的错误信息
    if (errorMessage.includes('shader') || errorMessage.includes('WebGL')) {
      toast.error('地图初始化失败：显卡不支持或WebGL被禁用。请尝试更新浏览器或显卡驱动。');
    } else if (errorMessage.includes('canvas')) {
      toast.error('地图初始化失败：Canvas元素无效。请刷新页面重试。');
    } else {
      toast.error('地图初始化失败: ' + errorMessage);
    }
  }
};

onMounted(async () => {
  await setupMapManager();

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize);

  // 监听全屏变化
  document.addEventListener('fullscreenchange', handleFullscreenChange);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  mapManager.value?.destroy();
});

// 监听玩家位置变化
watch(
  () => gameStateStore.location,
  (newPos) => {
    if (newPos && mapManager.value) {
      const playerName = gameStateStore.character?.名字 || '道友';
      mapManager.value.updatePlayerPosition(newPos as GameCoordinates, playerName);
    }
  },
  { deep: true }
);

// 监听NPC关系变化，更新NPC位置
watch(
  () => gameStateStore.relationships,
  (relationships) => {
    if (!relationships || !mapManager.value) return;

    const npcs: Array<{ name: string; coordinates: GameCoordinates }> = [];

    Object.entries(relationships).forEach(([npcName, npcData]: [string, any]) => {
      const coords = npcData?.当前位置 || npcData?.位置 || npcData?.coordinates;
      if (coords && Number.isFinite(coords.x) && Number.isFinite(coords.y)) {
        npcs.push({
          name: npcName,
          coordinates: coords as GameCoordinates
        });
      }
    });

    mapManager.value.updateNPCPositions(npcs);
  },
  { deep: true }
);

// 监听联机状态，显示被入侵用户（世界主人）的位置
watch(
  () => {
    const online = gameStateStore.onlineState as any;
    return {
      isOnline: props.isOnline,
      ownerLocation: online?.穿越目标?.世界主人位置,
      ownerName: online?.穿越目标?.世界主人档案?.名字 || online?.穿越目标?.主人用户名
    };
  },
  ({ isOnline, ownerLocation, ownerName }) => {
    if (!mapManager.value) return;

    console.log('[地图] 联机状态变化:', { isOnline, ownerLocation, ownerName });

    if (isOnline && ownerLocation) {
      // 尝试从不同格式中提取坐标
      let x = ownerLocation.x ?? ownerLocation.坐标?.x ?? ownerLocation.coordinates?.x;
      let y = ownerLocation.y ?? ownerLocation.坐标?.y ?? ownerLocation.coordinates?.y;

      // 如果坐标缺失，根据地图配置生成一个默认位置（地图中心偏移）
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        console.warn('[地图] 世界主人位置坐标缺失，使用默认位置:', ownerLocation);
        const mapConfig = mapRenderConfig.value;
        // 使用描述的哈希值来生成一个相对固定的位置（避免每次刷新都变化）
        const desc = ownerLocation.描述 || ownerLocation.description || '未知';
        const hash = desc.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
        x = mapConfig.width * 0.3 + (hash % 100) * (mapConfig.width * 0.004);
        y = mapConfig.height * 0.3 + ((hash * 7) % 100) * (mapConfig.height * 0.004);
      }

      if (Number.isFinite(x) && Number.isFinite(y)) {
        mapManager.value.updateOtherPlayerPosition({ x, y }, ownerName || '世界主人');
        console.log('[地图] 显示世界主人位置:', { x, y, ownerName });
      } else {
        mapManager.value.updateOtherPlayerPosition(null);
      }
    } else {
      // 非联机模式或没有位置信息时清除其他玩家标记
      mapManager.value.updateOtherPlayerPosition(null);
    }
  },
  { deep: true, immediate: true }
);

watch(
  () => mapSizeKey.value,
  (next, prev) => {
    if (!mapManager.value || next === prev) return;
    setupMapManager();
  }
);

// 🔥 修复：使用浅层监听 + 长度检查，避免深度监听导致的无限循环
watch(
  () => [
    gameStateStore.worldInfo?.大陆信息?.length,
    gameStateStore.worldInfo?.势力信息?.length,
    gameStateStore.worldInfo?.地点信息?.length,
  ],
  (newLengths, oldLengths) => {
    // 只有在长度发生变化时才重新加载（避免无限循环）
    if (!mapManager.value || isInitializing.value) return;

    // 检查是否真的有变化
    if (oldLengths && newLengths.every((len, i) => len === oldLengths[i])) {
      return;
    }

    console.log('[地图] 检测到世界数据变化，重新加载地图', { newLengths, oldLengths });
    loadMapData({ silent: true, reset: true });
  }
);

/**
 * 初始化地图 - 生成势力和地点
 */
const initializeMap = async () => {
  const worldInfo = gameStateStore.worldInfo;
  if (!worldInfo) {
    toast.error('未找到世界信息');
    return;
  }

  isInitializing.value = true;
  mapStatus.value = '开始生成地图内容...';

  try {
    const continentCount = worldInfo.大陆信息?.length || 3;
    const multiplier = densityMultipliers[mapDensity.value];
    const factionCount = Math.max(3, Math.round(continentCount * 2 * multiplier.faction));
    const locationCount = Math.max(6, Math.round(continentCount * 4 * multiplier.location));
    const secretRealmsCount = Math.max(2, Math.round(locationCount * 0.25));
    const mapConfig = (worldInfo as any)?.['地图配置'] || {
      width: mapRenderConfig.value.width,
      height: mapRenderConfig.value.height,
      minLng: 0,
      maxLng: mapRenderConfig.value.width,
      minLat: 0,
      maxLat: mapRenderConfig.value.height,
    };

    console.log(`[地图] 密度: ${mapDensity.value}, 势力: ${factionCount}, 地点: ${locationCount}`);

    // 🔥 随机判断是否生成合欢宗（30%概率，仅酒馆环境）
    const shouldGenerateHehuan = isTavernEnv() && Math.random() < 0.3;
    if (shouldGenerateHehuan) {
      console.log('[地图] 🎲 随机触发合欢宗彩蛋');
    }

    // 创建世界生成器
    const generator = new EnhancedWorldGenerator({
      worldName: worldInfo.世界名称,
      worldBackground: worldInfo.世界背景,
      worldEra: worldInfo.世界纪元 || '修真盛世',
      factionCount: factionCount,
      locationCount: locationCount,
      secretRealmsCount: secretRealmsCount,
      continentCount: continentCount,
      mapConfig: mapConfig,
      maxRetries: 3,
      retryDelay: 1000,
      enableHehuanEasterEgg: shouldGenerateHehuan, // 🔥 根据随机结果决定是否生成合欢宗
      onStreamChunk: (chunk: string) => {
        // 更新生成状态显示
        mapStatus.value = chunk;
      }
    });

    console.log('[地图] 开始生成地图内容...');
    const result = await generator.generateValidatedWorld();

    if (result.success && result.worldInfo) {
      console.log('[地图] 地图生成成功，正在更新游戏状态...');

      // 保留现有的大陆信息，只更新势力和地点
      const updatedWorldInfo = {
        ...worldInfo,
        势力信息: result.worldInfo.势力信息 || [],
        地点信息: result.worldInfo.地点信息 || [],
      };

      // 更新游戏状态
      gameStateStore.updateState('worldInfo', updatedWorldInfo);

      // 🔥 如果触发了合欢宗彩蛋，创建灰夫人NPC
      if (shouldGenerateHehuan) {
        const hehuanSect = (result.worldInfo.势力信息 || []).find(
          (f: any) => String(f.名称 || f.name || '').includes('合欢')
        );
        const sectName = hehuanSect?.名称 || (hehuanSect as any)?.name || '合欢宗';
        const gameTime = gameStateStore.gameTime as GameTime;
        const greyLady: NpcProfile = {
          名字: "灰夫人(合欢圣女)",
          性别: "女",
          出生日期: { 年: (gameTime?.年 || 1000) - 200, 月: 1, 日: 1 },
          种族: "人族",
          出生: "合欢宗",
          外貌描述: "身材极度丰满，拥有夸张的丰乳肥臀，腰肢纤细如蛇。面容妖媚，眼神含春，举手投足间散发着惊人的魅惑力。身着轻薄纱衣，曼妙身姿若隐若现。",
          性格特征: ["平易近人", "开放", "双性恋", "M体质", "S体质", "痴女(潜在)"],
          境界: { 名称: "金丹", 阶段: "圆满", 当前进度: 0, 下一级所需: 100, 突破描述: "阴阳调和，丹破婴生" },
          灵根: { name: "天阴灵根", tier: "天品" } as any,
          天赋: [{ name: "合欢圣体", description: "天生媚骨，极适合双修，采补效果翻倍" }] as any,
          先天六司: { 根骨: 8, 灵性: 9, 悟性: 8, 气运: 7, 魅力: 10, 心性: 5 },
          属性: {
            气血: { 当前: 5000, 上限: 5000 },
            灵气: { 当前: 8000, 上限: 8000 },
            神识: { 当前: 3000, 上限: 3000 },
            寿元上限: 500
          },
          与玩家关系: "陌生人",
          好感度: 10,
          当前位置: { 描述: `${sectName}驻地` },
          势力归属: sectName,
          人格底线: [],
          记忆: [
            "我是合欢宗的圣女，人称灰夫人。",
            "我的真实姓名是一个秘密，只有真正征服我的人才能知道。",
            "我渴望体验世间极致的快乐与痛苦，无论是给予还是接受。"
          ],
          当前外貌状态: "衣衫半解，媚眼如丝",
          当前内心想法: "观察着周围的人，寻找能让我感兴趣的猎物",
          背包: { 灵石: { 下品: 5000, 中品: 500, 上品: 50, 极品: 0 }, 物品: {} },
          实时关注: true,
          私密信息: {
            是否为处女: true,
            身体部位: [
              { 部位名称: "后庭", 特征描述: "九曲回廊，紧致幽深，内壁褶皱繁复，仿佛能吞噬一切", 敏感度: 80, 开发度: 0, 特殊印记: "未开发" },
              { 部位名称: "阴道", 特征描述: "春水玉壶，名器天成，常年湿润，紧致如初", 敏感度: 90, 开发度: 0, 特殊印记: "白虎" },
              { 部位名称: "腰部", 特征描述: "七寸盘蛇，柔若无骨，可做出任何高难度姿势", 敏感度: 70, 开发度: 0 },
              { 部位名称: "手", 特征描述: "纤手观音，指若削葱，灵活多变，擅长挑逗", 敏感度: 60, 开发度: 0 },
              { 部位名称: "足", 特征描述: "玲珑鸳鸯，弓足如玉，脚趾圆润可爱，足弓优美", 敏感度: 85, 开发度: 0 },
              { 部位名称: "嘴", 特征描述: "如意鱼唇，樱桃小口，舌头灵活，深喉天赋异禀", 敏感度: 75, 开发度: 0 },
              { 部位名称: "胸部", 特征描述: "乳燕玉峰，波涛汹涌，乳晕粉嫩，乳头敏感易硬", 敏感度: 95, 开发度: 0 },
            ],
            性格倾向: "开放且顺从(待调教)",
            性取向: "双性恋",
            性癖好: ["吞精","BDSM", "足交", "乳交", "捆绑", "调教", "采补", "角色扮演", "支配", "被支配", "露出", "放尿", "凌辱", "刑具"],
            性渴望程度: 80,
            当前性状态: "渴望",
            体液分泌状态: "充沛",
            性交总次数: 0,
            性伴侣名单: [],
            最近一次性行为时间: "无",
            特殊体质: ["合欢圣体", "名器合集"]
          }
        };
        const currentRelations = gameStateStore.relationships || {};
        if (!currentRelations[greyLady.名字]) {
          gameStateStore.updateState('relationships', {
            ...currentRelations,
            [greyLady.名字]: greyLady
          });
          console.log('[地图] 🎲 合欢宗彩蛋：已生成灰夫人NPC');
        }
      }

      // 重新加载地图数据
      await loadMapData({ reset: true });

      toast.success('地图初始化完成！');
      console.log('[地图] 地图初始化完成');
    } else {
      const errorMsg = result.errors?.join(', ') || '生成失败';
      toast.error(`地图生成失败: ${errorMsg}`);
      console.error('[地图] 生成失败:', result.errors);
    }
  } catch (error) {
    console.error('[地图] 初始化失败:', error);
    toast.error('地图初始化失败: ' + (error as Error).message);
  } finally {
    isInitializing.value = false;
    mapStatus.value = '初始化完成';
  }
};

/**
 * 追加生成地点/势力
 */
const generateAdditionalContent = async () => {
  const worldInfo = gameStateStore.worldInfo;
  if (!worldInfo) {
    toast.error('未找到世界信息');
    return;
  }

  const { locations, locationCount, factions, factionCount } = generateOptions.value;
  if (!locations && !factions) {
    toast.warning('请至少选择一种生成类型');
    return;
  }

  isGenerating.value = true;
  showGenerateModal.value = false;

  try {
    const mapConfig = (worldInfo as any)?.['地图配置'] || {
      width: mapRenderConfig.value.width,
      height: mapRenderConfig.value.height,
    };

    // 🔥 随机判断是否生成合欢宗（30%概率，仅酒馆环境且生成势力时）
    const shouldGenerateHehuan = factions && isTavernEnv() && Math.random() < 0.3;
    if (shouldGenerateHehuan) {
      console.log('[地图] 🎲 追加生成：随机触发合欢宗彩蛋');
    }

    const generator = new EnhancedWorldGenerator({
      worldName: worldInfo.世界名称,
      worldBackground: worldInfo.世界背景,
      worldEra: worldInfo.世界纪元 || '修真盛世',
      factionCount: factions ? factionCount : 0,
      locationCount: locations ? locationCount : 0,
      secretRealmsCount: 0,
      continentCount: worldInfo.大陆信息?.length || 1,
      mapConfig: mapConfig,
      maxRetries: 2,
      retryDelay: 500,
      enableHehuanEasterEgg: shouldGenerateHehuan,
      existingFactions: worldInfo.势力信息?.map((f: any) => ({
        名称: f.名称 || f.name,
        位置: f.位置 || f.location,
        势力范围: f.势力范围 || f.territory
      })) || [],
      existingLocations: worldInfo.地点信息?.map((l: any) => ({
        名称: l.名称 || l.name,
        coordinates: l.coordinates || l.坐标
      })) || []
    });

    const result = await generator.generateValidatedWorld();

    if (result.success && result.worldInfo) {
      // 合并新生成的内容到现有数据
      const newFactions = result.worldInfo.势力信息 || [];
      const newLocations = result.worldInfo.地点信息 || [];

      const updatedWorldInfo = {
        ...worldInfo,
        势力信息: [...(worldInfo.势力信息 || []), ...newFactions],
        地点信息: [...(worldInfo.地点信息 || []), ...newLocations],
      };

      gameStateStore.updateState('worldInfo', updatedWorldInfo);

      // 🔥 如果触发了合欢宗彩蛋，创建灰夫人NPC
      if (shouldGenerateHehuan) {
        const hehuanSect = newFactions.find(
          (f: any) => String(f.名称 || f.name || '').includes('合欢')
        );
        const sectName = hehuanSect?.名称 || (hehuanSect as any)?.name || '合欢宗';
        const gameTime = gameStateStore.gameTime as GameTime;
        const greyLady: NpcProfile = {
          名字: "灰夫人(合欢圣女)",
          性别: "女",
          出生日期: { 年: (gameTime?.年 || 1000) - 200, 月: 1, 日: 1 },
          种族: "人族",
          出生: "合欢宗",
          外貌描述: "身材极度丰满，拥有夸张的丰乳肥臀，腰肢纤细如蛇。面容妖媚，眼神含春，举手投足间散发着惊人的魅惑力。身着轻薄纱衣，曼妙身姿若隐若现。",
          性格特征: ["平易近人", "开放", "双性恋", "M体质", "S体质", "痴女(潜在)"],
          境界: { 名称: "金丹", 阶段: "圆满", 当前进度: 0, 下一级所需: 100, 突破描述: "阴阳调和，丹破婴生" },
          灵根: { name: "天阴灵根", tier: "天品" } as any,
          天赋: [{ name: "合欢圣体", description: "天生媚骨，极适合双修，采补效果翻倍" }] as any,
          先天六司: { 根骨: 8, 灵性: 9, 悟性: 8, 气运: 7, 魅力: 10, 心性: 5 },
          属性: {
            气血: { 当前: 5000, 上限: 5000 },
            灵气: { 当前: 8000, 上限: 8000 },
            神识: { 当前: 3000, 上限: 3000 },
            寿元上限: 500
          },
          与玩家关系: "陌生人",
          好感度: 10,
          当前位置: { 描述: `${sectName}驻地` },
          势力归属: sectName,
          人格底线: [],
          记忆: [
            "我是合欢宗的圣女，人称灰夫人。",
            "我的真实姓名是一个秘密，只有真正征服我的人才能知道。",
            "我渴望体验世间极致的快乐与痛苦，无论是给予还是接受。"
          ],
          当前外貌状态: "衣衫半解，媚眼如丝",
          当前内心想法: "观察着周围的人，寻找能让我感兴趣的猎物",
          背包: { 灵石: { 下品: 5000, 中品: 500, 上品: 50, 极品: 0 }, 物品: {} },
          实时关注: true,
          私密信息: {
            是否为处女: true,
            身体部位: [
              { 部位名称: "后庭", 特征描述: "九曲回廊，紧致幽深，内壁褶皱繁复，仿佛能吞噬一切", 敏感度: 80, 开发度: 0, 特殊印记: "未开发" },
              { 部位名称: "阴道", 特征描述: "春水玉壶，名器天成，常年湿润，紧致如初", 敏感度: 90, 开发度: 0, 特殊印记: "白虎" },
              { 部位名称: "腰部", 特征描述: "七寸盘蛇，柔若无骨，可做出任何高难度姿势", 敏感度: 70, 开发度: 0 },
              { 部位名称: "手", 特征描述: "纤手观音，指若削葱，灵活多变，擅长挑逗", 敏感度: 60, 开发度: 0 },
              { 部位名称: "足", 特征描述: "玲珑鸳鸯，弓足如玉，脚趾圆润可爱，足弓优美", 敏感度: 85, 开发度: 0 },
              { 部位名称: "嘴", 特征描述: "如意鱼唇，樱桃小口，舌头灵活，深喉天赋异禀", 敏感度: 75, 开发度: 0 },
              { 部位名称: "胸部", 特征描述: "乳燕玉峰，波涛汹涌，乳晕粉嫩，乳头敏感易硬", 敏感度: 95, 开发度: 0 },
            ],
            性格倾向: "开放且顺从(待调教)",
            性取向: "双性恋",
            性癖好: ["BDSM", "足交", "乳交", "捆绑", "调教", "采补", "角色扮演", "支配", "被支配", "露出", "放尿", "凌辱", "刑具"],
            性渴望程度: 80,
            当前性状态: "渴望",
            体液分泌状态: "充沛",
            性交总次数: 0,
            性伴侣名单: [],
            最近一次性行为时间: "无",
            特殊体质: ["合欢圣体", "名器合集"]
          }
        };
        const currentRelations = gameStateStore.relationships || {};
        if (!currentRelations[greyLady.名字]) {
          gameStateStore.updateState('relationships', {
            ...currentRelations,
            [greyLady.名字]: greyLady
          });
          console.log('[地图] 🎲 追加生成：合欢宗彩蛋已生成灰夫人NPC');
        }
      }

      await loadMapData({ reset: true });

      const msg = [];
      if (newFactions.length) msg.push(`${newFactions.length}个势力`);
      if (newLocations.length) msg.push(`${newLocations.length}个地点`);
      toast.success(`已追加生成: ${msg.join('、')}`);
    } else {
      toast.error('生成失败: ' + (result.errors?.join(', ') || '未知错误'));
    }
  } catch (error) {
    console.error('[地图] 追加生成失败:', error);
    toast.error('生成失败: ' + (error as Error).message);
  } finally {
    isGenerating.value = false;
  }
};

/**
 * 加载地图数据
 */
const loadMapData = async (options?: { silent?: boolean; reset?: boolean }) => {
  try {
    const { silent = false, reset = true } = options ?? {};
    mapStatus.value = '正在加载世界数据...';

    const worldInfo = gameStateStore.worldInfo;
    if (!worldInfo) {
      if (!silent) {
        toast.warning('未找到世界数据');
      }
      mapStatus.value = '未找到世界数据';
      return;
    }

    if (reset) {
      mapManager.value?.clear();
    }

    const mapConfig = mapRenderConfig.value;
    let locationCount = 0;

    // 加载大陆
    if (worldInfo.大陆信息 && Array.isArray(worldInfo.大陆信息)) {
      worldInfo.大陆信息.forEach((continent: any) => {
        try {
          // 标准化大陆边界坐标
          if (continent.大洲边界 || continent.continent_bounds) {
            const bounds = continent.大洲边界 || continent.continent_bounds;
            continent.continent_bounds = normalizeContinentBounds(bounds, mapConfig.width, mapConfig.height);
            continent.大洲边界 = continent.continent_bounds;
          }
          mapManager.value?.addContinent(continent);
        } catch (error) {
          console.error('[地图] 加载大陆失败:', continent, error);
        }
      });
      console.log(`[地图] 已加载 ${worldInfo.大陆信息.length} 个大陆`);
    }

    // 加载势力（带势力范围）
    if (worldInfo.势力信息 && Array.isArray(worldInfo.势力信息)) {
      const factions = normalizeLocationsData(worldInfo.势力信息, mapConfig);
      factions.forEach((faction: WorldLocation) => {
        try {
          // 只添加势力范围，不添加地点标记（避免与地点信息重复）
          if (faction.territoryBounds && faction.territoryBounds.length >= 3) {
            mapManager.value?.addTerritory(faction);
          }
          // 不再自动为势力创建地点标记，地点由"地点信息"数组统一管理
        } catch (error) {
          console.error('[地图] 加载势力失败:', faction, error);
        }
      });
      console.log(`[地图] 已加载 ${factions.length} 个势力范围`);
    }

    // 加载地点（包括所有类型）
    if (worldInfo.地点信息 && Array.isArray(worldInfo.地点信息)) {
      const locations = normalizeLocationsData(worldInfo.地点信息, mapConfig);
      locations.forEach((location: WorldLocation) => {
        try {
          mapManager.value?.addLocation(location);
          locationCount++;
        } catch (error) {
          console.error('[地图] 加载地点失败:', location, error);
        }
      });
      console.log(`[地图] 已加载 ${locations.length} 个地点`);
    }

    // 更新玩家位置
    const playerPos = gameStateStore.location;
    if (playerPos) {
      const playerName = gameStateStore.character?.名字 || '道友';
      mapManager.value?.updatePlayerPosition(playerPos as GameCoordinates, playerName);
      console.log('[地图] 已更新玩家位置');
    }

    // 更新NPC位置（从关系数据中提取）
    const relationships = gameStateStore.relationships;
    if (relationships && typeof relationships === 'object') {
      const npcs: Array<{ name: string; coordinates: GameCoordinates }> = [];

      Object.entries(relationships).forEach(([npcName, npcData]: [string, any]) => {
        // 检查NPC是否有坐标信息
        const coords = npcData?.当前位置 || npcData?.位置 || npcData?.coordinates;
        if (coords && Number.isFinite(coords.x) && Number.isFinite(coords.y)) {
          npcs.push({
            name: npcName,
            coordinates: coords as GameCoordinates
          });
        }
      });

      if (npcs.length > 0) {
        mapManager.value?.updateNPCPositions(npcs);
        console.log(`[地图] 已更新 ${npcs.length} 个NPC位置`);
      }
    }

    // 联机模式下更新世界主人位置
    if (props.isOnline) {
      const online = gameStateStore.onlineState as any;
      const ownerLocation = online?.穿越目标?.世界主人位置;
      const ownerName = online?.穿越目标?.世界主人档案?.名字 || online?.穿越目标?.主人用户名;

      console.log('[地图] loadMapData 检查世界主人位置:', { isOnline: props.isOnline, ownerLocation, ownerName });

      if (ownerLocation) {
        let x = ownerLocation.x ?? ownerLocation.坐标?.x ?? ownerLocation.coordinates?.x;
        let y = ownerLocation.y ?? ownerLocation.坐标?.y ?? ownerLocation.coordinates?.y;

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          const desc = ownerLocation.描述 || ownerLocation.description || '未知';
          const hash = desc.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
          x = mapConfig.width * 0.3 + (hash % 100) * (mapConfig.width * 0.004);
          y = mapConfig.height * 0.3 + ((hash * 7) % 100) * (mapConfig.height * 0.004);
        }

        if (Number.isFinite(x) && Number.isFinite(y)) {
          mapManager.value?.updateOtherPlayerPosition({ x, y }, ownerName || '世界主人');
          console.log('[地图] 已更新世界主人位置:', { x, y, ownerName });
        }
      }
    }

    mapStatus.value = `已加载 ${locationCount} 个地点`;
    if (!silent) {
      toast.success('地图加载完成');
    }
  } catch (error) {
    console.error('[地图] 加载数据失败:', error);
    mapStatus.value = '数据加载失败';
    toast.error('加载地图数据失败: ' + (error as Error).message);
  }
};

/**
 * 处理地点点击
 */
const handleLocationClick = (data: unknown) => {
  console.log('[地图] handleLocationClick 被调用，data:', data);

  if (!data) {
    console.warn('[地图] 点击数据为空');
    return;
  }

  const locationData = data as any;

  // 清除大陆选择
  selectedContinent.value = null;

  // 设置选中的地点
  selectedLocation.value = locationData.location || locationData;
  console.log('[地图] selectedLocation 已设置:', selectedLocation.value);

  // 使用点击位置作为弹窗位置
  if (locationData.clickPosition) {
    popupPosition.value = {
      x: locationData.clickPosition.x,
      y: locationData.clickPosition.y,
    };
    console.log('[地图] 弹窗位置（点击位置）:', popupPosition.value);
  }
};

/**
 * 处理大陆点击
 */
const handleContinentClick = (data: unknown) => {
  console.log('[地图] handleContinentClick 被调用，data:', data);

  if (!data) {
    console.warn('[地图] 点击数据为空');
    return;
  }

  const continentData = data as any;

  // 清除地点选择
  selectedLocation.value = null;

  // 设置选中的大陆
  selectedContinent.value = continentData;
  console.log('[地图] selectedContinent 已设置:', selectedContinent.value);

  // 使用点击位置作为弹窗位置
  if (continentData.clickPosition) {
    popupPosition.value = {
      x: continentData.clickPosition.x,
      y: continentData.clickPosition.y,
    };
    console.log('[地图] 弹窗位置（点击位置）:', popupPosition.value);
  }
};

/**
 * 关闭弹窗
 */
const closePopup = () => {
  selectedLocation.value = null;
  selectedContinent.value = null;
};

/**
 * 处理窗口大小变化
 */
const handleResize = () => {
  if (mapContainerRef.value && mapManager.value) {
    try {
      const rect = mapContainerRef.value.getBoundingClientRect();
      mapManager.value.resize(rect.width, rect.height);
    } catch (e) {
      // 忽略 resize 过程中的错误
      console.warn('[地图] Resize 错误（已忽略）:', e);
    }
  }
};

/**
 * 处理全屏状态变化
 */
const handleFullscreenChange = () => {
  // 全屏状态变化时可能需要调整地图大小
  handleResize();
};
</script>

<style scoped>
.game-map-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-background);
}

/* 世界信息头部 */
.world-info-header {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  backdrop-filter: blur(8px);
}

.world-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e40af;
  text-shadow: 0 1px 2px rgba(30, 64, 175, 0.1);
  white-space: nowrap;
}

.world-background {
  font-size: 0.85rem;
  color: #64748b;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 地图容器 */
.map-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  border: 3px solid #cbd5e1;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #dbeafe 100%);
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.05);
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
}

canvas:active {
  cursor: grabbing;
}

/* 地点信息弹窗 */
.location-popup {
  position: absolute;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  min-width: 320px;
  max-width: 450px;
  pointer-events: auto;
  z-index: 2000;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.popup-header h4 {
  margin: 0;
  color: #1e40af;
  font-size: 1.25rem;
  font-weight: 700;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  cursor: pointer;
  color: #ef4444;
  font-size: 1.4rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.close-btn:hover {
  background: rgba(220, 38, 38, 0.2);
  color: #dc2626;
  transform: scale(1.1);
}

.popup-content {
  font-size: 0.95rem;
  line-height: 1.6;
  max-height: 60vh;
  overflow-y: auto;
}

.location-type {
  color: #6366f1;
  font-weight: 700;
  margin: 0 0 10px 0;
  font-size: 1rem;
}

.location-desc {
  color: #374151;
  margin: 0 0 14px 0;
  font-weight: 500;
  max-height: 150px;
  overflow-y: auto;
  line-height: 1.6;
}

.location-detail {
  color: #6b7280;
  margin: 8px 0;
  font-size: 0.875rem;
  font-weight: 500;
}

.relation-friendly {
  color: #10b981;
  font-weight: 700;
}

.relation-hostile {
  color: #ef4444;
  font-weight: 700;
}

.relation-neutral {
  color: #6b7280;
  font-weight: 600;
}

/* 初始化地图覆盖层 */
.initialize-map-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  z-index: 2000;
}

.initialize-prompt {
  text-align: center;
  padding: 3rem 2rem;
  max-width: 500px;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.prompt-icon {
  margin: 0 auto 1.5rem;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
  border-radius: 50%;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
}

.map-icon {
  width: 48px;
  height: 48px;
  color: white;
}

.initialize-prompt h3 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e40af;
}

.initialize-prompt p {
  margin: 0 0 1.5rem 0;
  font-size: 1rem;
  color: #64748b;
  line-height: 1.6;
}

/* 密度选择器 */
.density-selector {
  margin-bottom: 1.5rem;
  text-align: left;
}

.density-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 0.75rem;
}

.density-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.density-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.density-option:hover {
  border-color: #94a3b8;
  background: #f1f5f9;
}

.density-option.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.density-option input[type="radio"] {
  display: none;
}

.option-label {
  font-weight: 600;
  color: #1e293b;
  min-width: 3rem;
}

.option-desc {
  font-size: 0.85rem;
  color: #64748b;
}

.initialize-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
}

.initialize-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
  background: linear-gradient(135deg, #2563eb, #3b82f6);
}

.initialize-btn:active {
  transform: translateY(0);
}

.btn-icon {
  width: 24px;
  height: 24px;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  margin: 0 auto 1.5rem;
  border: 4px solid rgba(59, 130, 246, 0.2);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.status-text {
  font-size: 0.9rem;
  color: #3b82f6;
  margin-top: 1rem;
  min-height: 1.5rem;
}

/* 地图图例 */
.map-legend {
  position: absolute;
  bottom: 24px;
  right: 24px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  min-width: 200px;
  max-width: 280px;
  border: 2px solid rgba(59, 130, 246, 0.3);
  pointer-events: auto;
  transition: all 0.3s ease;
}

.map-legend.collapsed {
  min-width: auto;
}

.legend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  user-select: none;
  border-radius: 14px 14px 0 0;
  transition: background 0.2s ease;
}

.legend-header:hover {
  background: rgba(59, 130, 246, 0.05);
}

.legend-title {
  font-weight: 700;
  color: #1e40af;
  font-size: 1.05rem;
  flex: 1;
}

.legend-toggle {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.legend-toggle:hover {
  background: rgba(59, 130, 246, 0.1);
  transform: scale(1.1);
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
  padding: 0 20px 20px;
}

.legend-items::-webkit-scrollbar {
  width: 6px;
}

.legend-items::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

.legend-items::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 3px;
}

.legend-items::-webkit-scrollbar-thumb:hover {
  background: transparent;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  color: #374151;
  padding: 8px 10px;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.legend-item:hover {
  background: rgba(59, 130, 246, 0.08);
  transform: translateX(2px);
}

.legend-icon {
  flex-shrink: 0;
}

/* 图标颜色 */
.legend-icon.mountain {
  color: #2D7D32;
}

.legend-icon.faction {
  color: #1565C0;
}

.legend-icon.town {
  color: #F57C00;
}

.legend-icon.blessed {
  color: #7B1FA2;
}

.legend-icon.treasure {
  color: #388E3C;
}

.legend-icon.danger {
  color: #D32F2F;
}

.legend-icon.special {
  color: #6B7280;
}

.legend-icon.player {
  color: #3b82f6;
  animation: pulse-player 2s ease-in-out infinite;
}

.legend-icon.npc {
  color: #8b5cf6;
}

@keyframes pulse-player {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* 全屏模式优化 */
.game-map-panel:fullscreen {
  background: #1a1a2e;
}

.game-map-panel:fullscreen .map-container {
  border: none;
  border-radius: 0;
}

.game-map-panel:fullscreen .map-legend {
  background: rgba(0, 0, 0, 0.8);
  color: white;
}

.game-map-panel:fullscreen .location-popup {
  background: rgba(0, 0, 0, 0.9);
  color: white;
}

/* 地图操作按钮 - 一体化样式，左下角 */
.map-actions {
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  z-index: 100;
  min-width: 100px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.map-actions.expanded {
  min-width: 130px;
}

.actions-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  padding: 10px 14px;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s ease;
  user-select: none;
}

.actions-header:hover {
  background: rgba(59, 130, 246, 0.1);
}

.actions-header .toggle-icon {
  margin-left: auto;
  color: #475569;
}

.actions-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 10px 10px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.action-btn:active:not(:disabled) {
  transform: translateY(0);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.text-mode-btn {
  background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
}

.action-btn.text-mode-btn:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

/* 追加生成弹窗 */
.generate-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.generate-modal {
  background: #1e293b;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  width: 320px;
  max-width: 90vw;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: #e2e8f0;
}

.modal-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.generate-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.generate-option label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #e2e8f0;
  font-size: 14px;
  flex: 1;
}

.count-input {
  width: 50px;
  padding: 4px 8px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 4px;
  color: #e2e8f0;
  font-size: 14px;
  text-align: center;
}

.count-input:disabled {
  opacity: 0.5;
}

.count-label {
  color: #94a3b8;
  font-size: 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid rgba(59, 130, 246, 0.2);
}

.cancel-btn, .confirm-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #94a3b8;
}

.cancel-btn:hover {
  background: rgba(148, 163, 184, 0.1);
}

.confirm-btn {
  background: rgba(59, 130, 246, 0.8);
  border: none;
  color: white;
}

.confirm-btn:hover:not(:disabled) {
  background: rgba(59, 130, 246, 1);
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .world-info-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .world-background {
    max-width: 100%;
    white-space: normal;
    line-height: 1.5;
  }

  .map-legend {
    position: static;
    margin: 10px 0 0;
    width: 100%;
    max-width: none;
    padding: 12px;
  }

  .location-popup {
    min-width: auto;
    max-width: calc(100vw - 40px);
  }
}
</style>
