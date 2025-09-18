<template>
  <div class="map-panel">
    <!-- 世界信息显示区域 (顶部) -->
    <div v-if="worldBackground" class="world-info-header">
      <div class="world-name">{{ worldName }}</div>
      <div class="world-background">{{ worldBackground }}</div>
    </div>
    
    <!-- 修仙世界地图容器 -->
    <div class="custom-map-container" ref="mapContainer">
      <!-- 地图内控制按钮 (左侧) -->
      <div class="map-controls-left">
        <button class="control-btn" @click="centerToPlayer" title="定位到玩家位置">
          <Target :size="14" />
        </button>
        <button class="control-btn" @click="toggleFullscreen" title="全屏显示">
          <Maximize2 :size="14" />
        </button>
        <button class="control-btn" @click="debugMapData" title="调试地图数据">
          📊
        </button>
        <div class="map-status-mini">{{ mapStatus }}</div>
      </div>

      <!-- SVG 修仙世界地图 -->
      <svg
        class="world-map-svg"
        :viewBox="`0 0 ${mapWidth} ${mapHeight}`"
        @wheel="handleZoom"
        @mousedown="startPan"
        @mousemove="handlePan"
        @mouseup="endPan"
        @mouseleave="endPan"
        style="user-select: none; -webkit-user-select: none; -moz-user-select: none;"
      >
        <!-- 地图定义和效果 -->
        <defs>
          <pattern id="gridPattern" patternUnits="userSpaceOnUse" width="50" height="50">
            <rect width="50" height="50" fill="none" stroke="#E5E7EB" stroke-width="0.5" opacity="0.3"/>
          </pattern>

          <!-- 简洁混沌虚空背景 -->
          <radialGradient id="chaosVoid" cx="50%" cy="50%">
            <stop offset="0%" style="stop-color:#374151;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1f2937;stop-opacity:1" />
          </radialGradient>

          <!-- 简化的混沌效果 -->
          <filter id="chaosEffect" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence baseFrequency="0.005 0.005" numOctaves="1" result="turbulence"/>
            <feColorMatrix in="turbulence" type="saturate" values="0" result="grayscale"/>
            <feComponentTransfer in="grayscale">
              <feFuncA type="discrete" tableValues="0 0.1 0.2"/>
            </feComponentTransfer>
            <feComposite in2="SourceGraphic" operator="multiply" result="composite"/>
          </filter>

          <!-- 地点光辉效果 -->
          <filter id="locationGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- 白色背景 -->
        <rect width="100%" height="100%" fill="white"/>
        
        <!-- 世界边界网格 (仅在大陆区域显示) -->
        <rect width="100%" height="100%" fill="url(#gridPattern)" opacity="0.05"/>

        <!-- 地图内容组 (支持平移和缩放) -->
        <g :transform="`translate(${panX}, ${panY}) scale(${zoomLevel})`">

          <!-- 大洲层 -->
          <g class="continent-layer">
            <g v-for="continent in cultivationContinents" :key="'continent-' + continent.id">
              <!-- 大洲范围多边形 - 优化紧密分布的显示效果 -->
              <polygon
                v-if="(continent.continent_bounds || continent.大洲边界) && (continent.continent_bounds || continent.大洲边界)!.length > 0"
                :points="(continent.continent_bounds || continent.大洲边界)!.map((point: { longitude: number; latitude: number; }) => {
                  const coords = geoToVirtual(point.longitude, point.latitude);
                  return `${coords.x},${coords.y}`;
                }).join(' ')"
                fill="rgba(59, 130, 246, 0.12)"
                stroke="#3B82F6"
                stroke-width="2.5"
                stroke-dasharray="8,4"
                fill-opacity="0.12"
                stroke-opacity="0.8"
                class="continent-polygon"
                @click="selectContinent(continent)"
              />
              
              <!-- 大洲名称标签 -->
              <text
                v-if="(continent.continent_bounds || continent.大洲边界) && (continent.continent_bounds || continent.大洲边界)!.length > 0"
                :x="getContinentCenter(continent.continent_bounds || continent.大洲边界 || []).x"
                :y="getContinentCenter(continent.continent_bounds || continent.大洲边界 || []).y"
                class="continent-name-label"
                text-anchor="middle"
                fill="#3B82F6"
                font-weight="bold"
                font-size="18px"
                opacity="0.8"
              >
                {{ continent.name || continent.名称 }}
              </text>
            </g>
          </g>

          <!-- 势力范围层 -->
          <g class="territory-bounds-layer">
            <g v-for="location in cultivationLocations.filter(loc => loc.isTerritory && loc.territoryBounds && loc.territoryBounds.length > 0)" :key="'territory-' + location.id">
              <!-- 势力范围多边形 -->
              <polygon
                :points="(location.territoryBounds || []).map(point => `${point.x},${point.y}`).join(' ')"
                :fill="location.color"
                :stroke="location.iconColor"
                stroke-width="2"
                fill-opacity="0.15"
                stroke-opacity="0.6"
                class="territory-polygon"
                @click="selectLocation(location)"
                @mouseenter="onLocationHover(location)"
                @mouseleave="onLocationLeave"
              />

              <!-- 势力名称标签 (在范围中心) -->
              <text
                :x="getTerritoryCenter(location.territoryBounds || []).x"
                :y="getTerritoryCenter(location.territoryBounds || []).y"
                class="territory-name-label"
                text-anchor="middle"
                :fill="location.iconColor"
                font-weight="bold"
                font-size="14px"
              >
                {{ location.name }}
              </text>
            </g>
          </g>

          <!-- 地点标记层 -->
          <g class="location-markers-layer">
            <g v-for="location in cultivationLocations.filter(loc => !loc.isTerritory)" :key="'location-' + location.id">
              <g
                :transform="`translate(${location.coordinates?.x || 0}, ${location.coordinates?.y || 0})`"
                class="location-marker"
                @click="selectLocation(location)"
                @mouseenter="onLocationHover(location)"
                @mouseleave="onLocationLeave"
              >
                <!-- 地点类型图标 -->
                <g class="location-icon-group">
                  <!-- ⛰️ 名山大川 -->
                  <g v-if="location.type === 'natural_landmark'">
                    <foreignObject 
                      :x="-getIconSize(location.type).offset" 
                      :y="-getIconSize(location.type).offset" 
                      :width="getIconSize(location.type).size" 
                      :height="getIconSize(location.type).size"
                    >
                      <div 
                        style="display: flex; align-items: center; justify-content: center;" 
                        :style="{ width: getIconSize(location.type).size + 'px', height: getIconSize(location.type).size + 'px' }"
                      >
                        <Mountain :size="getIconSize(location.type).size - 4" :color="location.iconColor" />
                      </div>
                    </foreignObject>
                  </g>

                  <!-- 🏛️ 宗门势力 -->
                  <g v-else-if="location.type === 'sect_power'">
                    <foreignObject 
                      :x="-getIconSize(location.type).offset" 
                      :y="-getIconSize(location.type).offset" 
                      :width="getIconSize(location.type).size" 
                      :height="getIconSize(location.type).size"
                    >
                      <div 
                        style="display: flex; align-items: center; justify-content: center;" 
                        :style="{ width: getIconSize(location.type).size + 'px', height: getIconSize(location.type).size + 'px' }"
                      >
                        <Building2 :size="getIconSize(location.type).size - 4" :color="location.iconColor" />
                      </div>
                    </foreignObject>
                  </g>

                  <!-- 🏮 城镇坊市 -->
                  <g v-else-if="location.type === 'city_town'">
                    <foreignObject 
                      :x="-getIconSize(location.type).offset" 
                      :y="-getIconSize(location.type).offset" 
                      :width="getIconSize(location.type).size" 
                      :height="getIconSize(location.type).size"
                    >
                      <div 
                        style="display: flex; align-items: center; justify-content: center;" 
                        :style="{ width: getIconSize(location.type).size + 'px', height: getIconSize(location.type).size + 'px' }"
                      >
                        <Home :size="getIconSize(location.type).size - 4" :color="location.iconColor" />
                      </div>
                    </foreignObject>
                  </g>

                  <!-- ⛩️ 洞天福地 -->
                  <g v-else-if="location.type === 'blessed_land'">
                    <foreignObject 
                      :x="-getIconSize(location.type).offset" 
                      :y="-getIconSize(location.type).offset" 
                      :width="getIconSize(location.type).size" 
                      :height="getIconSize(location.type).size"
                    >
                      <div 
                        style="display: flex; align-items: center; justify-content: center;" 
                        :style="{ width: getIconSize(location.type).size + 'px', height: getIconSize(location.type).size + 'px' }"
                      >
                        <Sparkles :size="getIconSize(location.type).size - 4" :color="location.iconColor" />
                      </div>
                    </foreignObject>
                  </g>

                  <!-- 💰 奇珍异地 -->
                  <g v-else-if="location.type === 'treasure_land'">
                    <foreignObject 
                      :x="-getIconSize(location.type).offset" 
                      :y="-getIconSize(location.type).offset" 
                      :width="getIconSize(location.type).size" 
                      :height="getIconSize(location.type).size"
                    >
                      <div 
                        style="display: flex; align-items: center; justify-content: center;" 
                        :style="{ width: getIconSize(location.type).size + 'px', height: getIconSize(location.type).size + 'px' }"
                      >
                        <Gem :size="getIconSize(location.type).size - 4" :color="location.iconColor" />
                      </div>
                    </foreignObject>
                  </g>

                  <!-- ☠️ 凶险之地 -->
                  <g v-else-if="location.type === 'dangerous_area'">
                    <foreignObject 
                      :x="-getIconSize(location.type).offset" 
                      :y="-getIconSize(location.type).offset" 
                      :width="getIconSize(location.type).size" 
                      :height="getIconSize(location.type).size"
                    >
                      <div 
                        style="display: flex; align-items: center; justify-content: center;" 
                        :style="{ width: getIconSize(location.type).size + 'px', height: getIconSize(location.type).size + 'px' }"
                      >
                        <Skull :size="getIconSize(location.type).size - 4" :color="location.iconColor" />
                      </div>
                    </foreignObject>
                  </g>

                  <!-- 🌟 其他特殊 -->
                  <g v-else-if="location.type === 'special_other'">
                    <foreignObject 
                      :x="-getIconSize(location.type).offset" 
                      :y="-getIconSize(location.type).offset" 
                      :width="getIconSize(location.type).size" 
                      :height="getIconSize(location.type).size"
                    >
                      <div 
                        style="display: flex; align-items: center; justify-content: center;" 
                        :style="{ width: getIconSize(location.type).size + 'px', height: getIconSize(location.type).size + 'px' }"
                      >
                        <Zap :size="getIconSize(location.type).size - 4" :color="location.iconColor" />
                      </div>
                    </foreignObject>
                  </g>

                  <!-- 默认图标 -->
                  <g v-else>
                    <circle :r="getIconSize('default').offset - 2" :fill="location.iconColor" stroke="white" stroke-width="1"/>
                    <text class="location-icon-text" text-anchor="middle" dy="2" fill="white" font-size="10px">?</text>
                  </g>
                </g>

                <!-- 地点名称标签 -->
                <text
                  class="location-name-label"
                  text-anchor="middle"
                  y="18"
                  :fill="location.iconColor"
                >
                  {{ location.name }}
                </text>
              </g>
            </g>
          </g>


          <!-- 玩家位置层 -->
          <g v-if="playerPosition" class="player-position-layer">
            <g :transform="`translate(${playerPosition.x}, ${playerPosition.y})`">
              <!-- 玩家灵气光环 (扩大) -->
              <circle class="player-aura" r="20" fill="#EF4444" opacity="0.4">
                <animate attributeName="r" values="15;25;15" dur="3s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="3s" repeatCount="indefinite"/>
              </circle>
              <!-- 玩家标记 (扩大) -->
              <polygon points="0,-12 -8,8 8,8" fill="#DC2626" stroke="white" stroke-width="2"/>
              <circle r="3" fill="white"/>
            </g>

            <!-- 玩家名称 -->
            <text
              :x="playerPosition.x"
              :y="playerPosition.y + 25"
              class="player-name-label"
              text-anchor="middle"
              fill="#DC2626"
            >
              {{ playerName }}
            </text>
          </g>

        </g>
      </svg>
    </div>

    <!-- 选中详情显示面板 (动态位置在地点顶部) -->
    <div v-if="selectedInfo" class="selected-info-overlay" :style="getPopupPosition()">
      <div class="selected-info">
        <div class="info-header">
          <h4>{{ selectedInfo.name }}</h4>
          <button @click="selectedInfo = null" class="close-info">×</button>
        </div>
        <div class="info-content">
          <p class="info-type">{{ selectedInfo.type === '大洲' ? '大洲' : internalTypeToChineseName(selectedInfo.type) }}</p>
          <p class="info-desc">{{ selectedInfo.description }}</p>
          <div v-if="selectedInfo.danger_level" class="info-detail">
            <strong>安全等级：</strong>{{ selectedInfo.danger_level }}
          </div>
          
          
          <!-- 大洲特有信息 -->
          <div v-if="selectedInfo.climate" class="info-detail">
            <strong>气候类型：</strong>{{ selectedInfo.climate }}
          </div>
          <div v-if="selectedInfo.terrain_features && selectedInfo.terrain_features.length > 0" class="info-detail">
            <strong>地形特征：</strong>{{ Array.isArray(selectedInfo.terrain_features) ? selectedInfo.terrain_features.join('、') : selectedInfo.terrain_features }}
          </div>
          <div v-if="selectedInfo.natural_barriers && selectedInfo.natural_barriers.length > 0" class="info-detail">
            <strong>天然屏障：</strong>{{ Array.isArray(selectedInfo.natural_barriers) ? selectedInfo.natural_barriers.join('、') : selectedInfo.natural_barriers }}
          </div>
        </div>
      </div>
    </div>

    <!-- 地图图例 (右下角) -->
    <div class="map-legend">
      <div class="legend-title">{{ worldName }}图例</div>
      <div class="legend-items">
        <div class="legend-item">
          <div class="legend-icon">
            <Mountain :size="16" color="#2D7D32" />
          </div>
          <span>名山大川</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon">
            <Building2 :size="16" color="#1565C0" />
          </div>
          <span>宗门势力</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon">
            <Home :size="16" color="#F57C00" />
          </div>
          <span>城镇坊市</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon">
            <Sparkles :size="16" color="#7B1FA2" />
          </div>
          <span>洞天福地</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon">
            <Gem :size="16" color="#388E3C" />
          </div>
          <span>奇珍异地</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon">
            <Skull :size="16" color="#D32F2F" />
          </div>
          <span>凶险之地</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon">
            <Zap :size="16" color="#6B7280" />
          </div>
          <span>其他特殊</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Target, Maximize2, Mountain, Building2, Home, Sparkles, Gem, Skull, Zap } from 'lucide-vue-next';
import { getTavernHelper } from '@/utils/tavern';
import { toast } from '@/utils/toast';
import type { WorldLocation } from '@/types/location';
import type { CultivationContinent } from '@/types/worldMap';

// --- 类型定义 ---
// Note: Local CultivationLocation interface is removed, using WorldLocation from types.

// 额外的辅助类型，移除 any 使用，保证属性访问安全
type LngLat = { longitude: number; latitude: number };

// 酒馆变量：包含可能用到的已知键，其他键保持宽松
type CharacterSaveData = {
  世界信息?: {
    世界名称?: string;
    世界背景?: string;
    大陆信息?: unknown[];
    势力信息?: unknown[];
    地点信息?: unknown[];
  };
  玩家角色状态?: {
    位置?: {
      坐标?: {
        X?: number; Y?: number; x?: number; y?: number;
        longitude?: number; latitude?: number;
      }
    }
  };
};

type PlayerLocationMarker = {
  coordinates?: { x?: number; y?: number; longitude?: number; latitude?: number };
};

type TavernVariables = Record<string, unknown> & {
  ['character.saveData']?: CharacterSaveData;
  ['player_location_marker']?: PlayerLocationMarker;
};

// 原始势力/地点输入的最小形状（只描述本组件访问到的字段）
interface RawFaction {
  id?: string;
  name?: string; 名称?: string;
  type?: string; 类型?: string;
  color?: string;
  描述?: string; description?: string;
  位置?: LngLat | string;
  headquarters?: LngLat | string;
  总部位置?: LngLat | string;
  势力范围?: LngLat[];
  territory_bounds?: LngLat[];
  territoryBounds?: LngLat[];
}

interface RawLocation {
  id?: string;
  name?: string; 名称?: string;
  type?: string; 类型?: string;
  描述?: string; description?: string;
  coordinates?: LngLat | { x?: number; y?: number };
  位置?: LngLat;
  安全等级?: string; danger_level?: string;
  适合境界?: string[]; suitable_for?: string[];
}

type MayHaveImportance = { importance?: unknown; 重要?: unknown; is_key?: unknown; isKey?: unknown };

// 地图尺寸配置
const mapWidth = ref(3000);  // 扩大地图宽度 2000 -> 3000
const mapHeight = ref(2100); // 扩大地图高度 1400 -> 2100 (保持3:2.1比例)

// 地图边界限制 - 防止过度缩放和平移
const minZoom = 0.2;
const maxZoom = 5.0;
// 动态计算平移范围，基于缩放级别
const getMaxPanX = () => Math.max(1000, mapWidth.value * zoomLevel.value * 0.8);
const getMaxPanY = () => Math.max(700, mapHeight.value * zoomLevel.value * 0.8);

// 地图交互状态
const zoomLevel = ref(1);
const panX = ref(0);
const panY = ref(0);
const isPanning = ref(false);
const lastPanPoint = ref({ x: 0, y: 0 });
const dragDistance = ref(0); // 拖拽距离，用于区分点击和拖拽

// 选中信息显示
const selectedInfo = ref<({
  id?: string;
  name: string;
  type: string;
  description: string;
  danger_level?: string;
  suitable_for?: string;
  screenPosition?: { x: number; y: number };
  // 大洲特有属性
  climate?: string;
  terrain_features?: string[];
  natural_barriers?: string[];
  // 出生地特有属性
  population?: string;
  governance?: string;
  features?: string[];
  landmarks?: string[];
}) | null>(null);

// 组件状态
const mapContainer = ref<HTMLElement | null>(null);
const mapStatus = ref('正在加载修仙世界...');
const playerName = ref('');

// 修仙世界数据 - 只从酒馆变量加载
const cultivationLocations = ref<WorldLocation[]>([]);
const cultivationContinents = ref<CultivationContinent[]>([]);

// 世界信息计算属性
const worldName = computed(() => {
  const variables = tavernVariables.value;
  const worldInfo = variables['character.saveData']?.世界信息;
  return worldInfo?.世界名称 || '修仙界';
});

const worldBackground = computed(() => {
  const variables = tavernVariables.value;
  const worldInfo = variables['character.saveData']?.世界信息;
  return worldInfo?.世界背景 || '';
});


// 明确初始化类型，避免 {} 被推断为不完全的 Record 结构
const tavernVariables = ref<TavernVariables>({} as TavernVariables);

// 玩家位置 - 从酒馆变量获取
const playerPosition = computed(() => {
  // 方法1：尝试从player_location_marker获取位置（新的位置标点系统）
  const locationMarker = tavernVariables.value?.['player_location_marker'];
  if (locationMarker && locationMarker.coordinates) {
    console.log('[玩家定位] 从位置标点获取坐标:', locationMarker.coordinates);

    const coords = locationMarker.coordinates;
    // 地理坐标格式转换
    if (coords.longitude !== undefined && coords.latitude !== undefined) {
      const virtualPos = geoToVirtual(coords.longitude, coords.latitude);
      console.log('[玩家定位] 标点转换结果:', virtualPos);
      return virtualPos;
    }
    // 虚拟坐标格式
    else if (coords.x !== undefined && coords.y !== undefined) {
      return { x: coords.x, y: coords.y };
    }
  }

  // 方法2：从SaveData中的玩家位置获取（原有逻辑）
  if (!tavernVariables.value?.['character.saveData']?.玩家角色状态?.位置?.坐标) {
    return null;
  }

  const coords = tavernVariables.value['character.saveData'].玩家角色状态.位置.坐标;
  console.log('[玩家定位] 原始坐标数据:', coords);

  // 处理不同的坐标格式
  let longitude: number | undefined, latitude: number | undefined;

  // Vector2格式 (X,Y大写) - 这是正确的数据结构格式
  if (coords.X !== undefined && coords.Y !== undefined) {
    // 如果是虚拟坐标，直接返回
    return { x: coords.X, y: coords.Y };
  }
  // x,y格式 (小写) - 兼容处理
  else if (coords.x !== undefined && coords.y !== undefined) {
    return { x: coords.x, y: coords.y };
  }
  // 地理坐标格式
  else if (coords.longitude && coords.latitude) {
    longitude = coords.longitude;
    latitude = coords.latitude;
  }

  // 转换地理坐标到虚拟坐标
  if (longitude !== undefined && latitude !== undefined) {
    const virtualPos = geoToVirtual(longitude, latitude);
    console.log('[玩家定位] 转换结果:', virtualPos);
    return virtualPos;
  }

  console.warn('[玩家定位] 无法解析坐标格式:', coords);
  return null;
});

// 延迟显示Toast消息，确保视觉间隔
let toastDelayCounter = 0;
const showToastWithDelay = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
  // 每个消息增加200ms延迟，确保视觉错开
  setTimeout(() => {
    toast[type](message);
  }, toastDelayCounter * 200);
  toastDelayCounter++;

  // 重置计数器，避免累积过多延迟
  if (toastDelayCounter > 5) {
    toastDelayCounter = 0;
  }
};

// 地图交互处理 - 增加边界限制
const handleZoom = (event: WheelEvent) => {
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.1 : 0.1;
  zoomLevel.value = Math.max(minZoom, Math.min(maxZoom, zoomLevel.value + delta));
};

const startPan = (event: MouseEvent) => {
  isPanning.value = true;
  lastPanPoint.value = { x: event.clientX, y: event.clientY };
  dragDistance.value = 0; // 重置拖拽距离

  // 开始拖拽时关闭弹窗
  if (selectedInfo.value) {
    selectedInfo.value = null;
  }
};

const handlePan = (event: MouseEvent) => {
  if (!isPanning.value) return;

  const deltaX = event.clientX - lastPanPoint.value.x;
  const deltaY = event.clientY - lastPanPoint.value.y;

  // 累计拖拽距离
  dragDistance.value += Math.abs(deltaX) + Math.abs(deltaY);

  // 动态计算平移范围限制
  const maxPanX = getMaxPanX();
  const maxPanY = getMaxPanY();

  // 限制平移范围
  panX.value = Math.max(-maxPanX, Math.min(maxPanX, panX.value + deltaX));
  panY.value = Math.max(-maxPanY, Math.min(maxPanY, panY.value + deltaY));

  lastPanPoint.value = { x: event.clientX, y: event.clientY };
};

const endPan = () => {
  isPanning.value = false;
};

const toggleFullscreen = () => {
  if (mapContainer.value) {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      mapContainer.value.requestFullscreen();
    }
  }
};

// 鼠标悬浮处理 - 修复样式抽搐问题
const hoveredLocation = ref<string | null>(null);

const onLocationHover = (location: WorldLocation) => {
  hoveredLocation.value = location.id;
};

const onLocationLeave = () => {
  hoveredLocation.value = null;
};


// 选择处理 - 只有在没有明显拖动时才触发
const selectLocation = (location: WorldLocation) => {
  // 如果正在拖动或拖动距离超过阈值，不触发选择
  if (isPanning.value || dragDistance.value > 5) {
    return;
  }

  console.log('[坤舆图志] 选中地点:', location.name);
  console.log('[坤舆图志] 是否全屏模式:', !!document.fullscreenElement);

  // 计算地点在屏幕上的位置
  const screenPosition = calculateScreenPosition(location.coordinates?.x || 0, location.coordinates?.y || 0);
  
  console.log('[坤舆图志] 地点屏幕位置:', screenPosition);

  selectedInfo.value = {
    id: location.id,
    name: location.name,
    type: location.type,
    description: location.description,
    danger_level: location.danger_level,
    suitable_for: location.suitable_for,
    screenPosition: screenPosition
  };

  console.log('[坤舆图志] 弹窗数据已设置，selectedInfo存在:', !!selectedInfo.value);
};

// 选择大洲
const selectContinent = (continent: CultivationContinent) => {
  // 如果正在拖动或拖动距离超过阈值，不触发选择
  if (isPanning.value || dragDistance.value > 5) {
    return;
  }

  console.log('[坤舆图志] 选中大洲:', continent.name || continent.名称);
  console.log('[坤舆图志] 是否全屏模式:', !!document.fullscreenElement);

  // 计算大洲中心在屏幕上的位置，兼容中英文字段名
  const bounds = continent.continent_bounds || continent.大洲边界 || [];
  const center = getContinentCenter(bounds);
  const screenPosition = calculateScreenPosition(center.x, center.y);
  
  console.log('[坤舆图志] 大洲屏幕位置:', screenPosition);

  selectedInfo.value = {
    id: continent.id,
    name: continent.name || continent.名称 || '未知大洲',
    type: '大洲',
    description: continent.description || continent.描述 || '广阔的修仙大陆',
    climate: continent.climate || continent.气候,
    terrain_features: continent.terrain_features || continent.地理特征,
    natural_barriers: continent.natural_barriers || continent.天然屏障,
    screenPosition: screenPosition
  };
};

// 计算地点在屏幕上的坐标
const calculateScreenPosition = (worldX: number, worldY: number): { x: number; y: number } => {
  if (!mapContainer.value) {
    return { x: 0, y: 0 };
  }

  const containerRect = mapContainer.value.getBoundingClientRect();

  // 考虑平移和缩放的影响
  const transformedX = (worldX * zoomLevel.value) + panX.value;
  const transformedY = (worldY * zoomLevel.value) + panY.value;

  // 转换为相对于容器的坐标
  const relativeX = (transformedX / mapWidth.value) * containerRect.width;
  const relativeY = (transformedY / mapHeight.value) * containerRect.height;

  return {
    x: relativeX,
    y: relativeY
  };
};

// 计算势力范围中心点
const getTerritoryCenter = (bounds: { x: number; y: number }[]): { x: number; y: number } => {
  if (!bounds || bounds.length === 0) {
    return { x: 0, y: 0 };
  }

  const sumX = bounds.reduce((sum, point) => sum + point.x, 0);
  const sumY = bounds.reduce((sum, point) => sum + point.y, 0);

  return {
    x: sumX / bounds.length,
    y: sumY / bounds.length
  };
};

// 计算大洲范围中心点
const getContinentCenter = (bounds: { longitude: number; latitude: number }[]): { x: number; y: number } => {
  if (!bounds || bounds.length === 0) {
    return { x: 0, y: 0 };
  }

  const sumLng = bounds.reduce((sum, point) => sum + point.longitude, 0);
  const sumLat = bounds.reduce((sum, point) => sum + point.latitude, 0);
  
  const centerLng = sumLng / bounds.length;
  const centerLat = sumLat / bounds.length;

  return geoToVirtual(centerLng, centerLat);
};

// 计算弹窗位置样式
const getPopupPosition = (): Record<string, string> => {
  if (!selectedInfo.value?.screenPosition) {
    return {
      position: 'absolute',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '9999'
    };
  }

  const { x, y } = selectedInfo.value.screenPosition;
  const popupWidth = 350; // 弹窗预估宽度
  const popupHeight = 200; // 弹窗预估高度

  // 检查是否在全屏模式
  const isFullscreen = !!document.fullscreenElement;
  
  // 根据全屏状态获取容器尺寸
  let containerWidth: number;
  let containerHeight: number;
  
  if (isFullscreen) {
    // 全屏模式使用屏幕尺寸
    containerWidth = window.innerWidth;
    containerHeight = window.innerHeight;
  } else {
    // 普通模式使用容器尺寸
    containerWidth = mapContainer.value?.clientWidth || 800;
    containerHeight = mapContainer.value?.clientHeight || 600;
  }

  // 确保弹窗不会超出容器边界
  let popupX = x - popupWidth / 2;
  let popupY = y - popupHeight - 30; // 在地点顶部30px处显示

  // 边界检查
  if (popupX < 10) popupX = 10;
  if (popupX + popupWidth > containerWidth - 10) {
    popupX = containerWidth - popupWidth - 10;
  }

  if (popupY < 10) {
    popupY = y + 30; // 如果顶部放不下，显示在地点下方
  }
  if (popupY + popupHeight > containerHeight - 10) {
    popupY = containerHeight - popupHeight - 10;
  }

  return {
    position: isFullscreen ? 'fixed' : 'absolute',
    left: `${popupX}px`,
    top: `${popupY}px`,
    transform: 'none',
    zIndex: isFullscreen ? '99999' : '1001'
  };
};

// GeoJSON坐标到虚拟坐标的转换 (基于实际数据范围)
const geoToVirtual = (lng: number, lat: number): { x: number; y: number } => {
  // 动态计算实际数据的坐标范围 - 针对紧密分布的大陆优化
  let minLng = 107.0, maxLng = 114.0, minLat = 33.0, maxLat = 38.0;
  
  // 如果有大陆数据，使用实际的最小最大值
  if (cultivationContinents.value.length > 0) {
    const allCoords: {longitude: number, latitude: number}[] = [];
    
    cultivationContinents.value.forEach(continent => {
      const bounds = continent.continent_bounds || continent.大洲边界;
      if (bounds && Array.isArray(bounds)) {
        bounds.forEach((point: LngLat) => {
          if (point.longitude && point.latitude) {
            allCoords.push({
              longitude: point.longitude,
              latitude: point.latitude
            });
          }
        });
      }
    });
    
    if (allCoords.length > 0) {
      minLng = Math.min(...allCoords.map(c => c.longitude));
      maxLng = Math.max(...allCoords.map(c => c.longitude));
      minLat = Math.min(...allCoords.map(c => c.latitude));
      maxLat = Math.max(...allCoords.map(c => c.latitude));
      
      // 为紧密分布的大陆减少边距，让大陆占据更多空间 - 从5%进一步减少到2%
      const lngPadding = (maxLng - minLng) * 0.02; // 从5%减少到2%
      const latPadding = (maxLat - minLat) * 0.02;
      minLng -= lngPadding;
      maxLng += lngPadding;
      minLat -= latPadding;
      maxLat += latPadding;
    }
  }
  
  // 映射到地图尺寸，为紧密大陆优化显示 - 让大陆占据更多屏幕空间
  const x = ((lng - minLng) / (maxLng - minLng)) * (mapWidth.value * 0.96) + (mapWidth.value * 0.02);
  const y = ((maxLat - lat) / (maxLat - minLat)) * (mapHeight.value * 0.96) + (mapHeight.value * 0.02);
  
  console.log(`[坐标转换] 范围(${minLng.toFixed(2)}-${maxLng.toFixed(2)}, ${minLat.toFixed(2)}-${maxLat.toFixed(2)}) 输入(${lng}, ${lat}) -> 输出(${x.toFixed(1)}, ${y.toFixed(1)})`);
  
  return { x, y };
};

// 地图类型转换
const mapLocationTypeToInternal = (type: string): string => {
  const typeMap: Record<string, string> = {
    // 新的标准类型标识（直接映射）
    'natural_landmark': 'natural_landmark',
    'sect_power': 'sect_power',
    'city_town': 'city_town',
    'blessed_land': 'blessed_land',
    'treasure_land': 'treasure_land',
    'dangerous_area': 'dangerous_area',
    'special_other': 'special_other',

    // 中文类型映射（向后兼容）
    '名山大川': 'natural_landmark',
    '宗门势力': 'sect_power',
    '城镇坊市': 'city_town',
    '洞天福地': 'blessed_land',
    '奇珍异地': 'treasure_land',
    '凶险之地': 'dangerous_area',
    '其他特殊': 'special_other',

    // 旧类型兼容映射
    '门派宗门': 'sect_power',
    '城镇': 'city_town',
    '危险秘境': 'blessed_land',
    '自然地貌': 'natural_landmark',
    '修炼圣地': 'blessed_land',
    '古战场遗迹': 'dangerous_area',
    '天材地宝产地': 'treasure_land',
    '灵兽栖息地': 'dangerous_area',
    '传承洞府': 'blessed_land',
    '跨界传送阵': 'special_other',
    '魔域入口': 'dangerous_area',
    '仙人遗府': 'blessed_land',

    // AI生成的通用类型映射
    'major_city': 'city_town',
    'sect_headquarters': 'sect_power',
    'secret_realm': 'blessed_land',
    'cultivation_site': 'blessed_land',
    'mountain': 'natural_landmark',
    'village': 'city_town',
    'battlefield_ruins': 'dangerous_area',
    'treasure_source': 'treasure_land',
    'spirit_beast_habitat': 'dangerous_area',
    'inheritance_cave': 'blessed_land',
    'teleportation_array': 'special_other',
    'demon_realm_gate': 'dangerous_area',
    'immortal_mansion': 'blessed_land'
  };
  return typeMap[type] || 'special_other'; // 默认归类为其他特殊
};

// 内部类型转换为中文显示
const internalTypeToChineseName = (type: string): string => {
  const typeMap: Record<string, string> = {
    // 新的修仙世界图例类型
    'natural_landmark': '名山大川',
    'sect_power': '宗门势力',
    'city_town': '城镇坊市',
    'blessed_land': '洞天福地',
    'treasure_land': '奇珍异地',
    'dangerous_area': '凶险之地',
    'special_other': '其他特殊',

    // 旧类型兼容
    'sect_headquarters': '宗门势力',
    'major_city': '城镇坊市',
    'secret_realm': '洞天福地',
    'mountain': '名山大川',
    'cultivation_site': '洞天福地',
    'trade_center': '城镇坊市',
    'village': '城镇坊市',
    'neutral_zone': '其他特殊',
    'immortal_empire': '宗门势力',
    'orthodox_sect': '宗门势力',
    'demonic_cult': '宗门势力',
    'immortal_family': '宗门势力',
    'merchant_guild': '宗门势力',
    'neutral_academy': '宗门势力',
    'rogue_alliance': '宗门势力',
    'demon_tribe': '宗门势力',
    // 新增特殊地点类型
    'battlefield_ruins': '凶险之地',
    'treasure_source': '奇珍异地',
    'spirit_beast_habitat': '凶险之地',
    'inheritance_cave': '洞天福地',
    'teleportation_array': '其他特殊',
    'demon_realm_gate': '凶险之地',
    'immortal_mansion': '洞天福地'
  };
  return typeMap[type] || '其他特殊';
};

const getLocationSize = (type: string): number => {
  const sizeMap: Record<string, number> = {
    '门派宗门': 10,
    '城镇': 8,
    '危险秘境': 6,
    '自然地貌': 4,
    '修炼圣地': 5
  };
  return sizeMap[type] || 4;
};

const getLocationIconSize = (type: string): 'small' | 'medium' | 'large' => {
  if (type === '门派宗门') return 'large';
  if (type === '城镇' || type === '危险秘境') return 'medium';
  return 'small';
};

// 根据地点类型获取颜色
const getLocationColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    // 新的修仙世界图例颜色
    'natural_landmark': '#2D7D32',    // 🏔️ 名山大川 - 深绿
    'sect_power': '#1565C0',          // 🏯 宗门势力 - 深蓝
    'city_town': '#F57C00',           // 🏘️ 城镇坊市 - 橙色
    'blessed_land': '#7B1FA2',        // ⛩️ 洞天福地 - 紫色
    'treasure_land': '#388E3C',       // 💎 奇珍异地 - 绿色
    'dangerous_area': '#D32F2F',      // ⚔️ 凶险之地 - 红色
    'special_other': '#6B7280',       // 🌟 其他特殊 - 灰色

    // 旧类型兼容映射
    'sect_headquarters': '#1565C0',   // 映射到宗门势力
    'major_city': '#F57C00',          // 映射到城镇坊市
    'secret_realm': '#7B1FA2',        // 映射到洞天福地
    'mountain': '#2D7D32',            // 映射到名山大川
    'cultivation_site': '#7B1FA2',    // 映射到洞天福地
    'village': '#F57C00',             // 映射到城镇坊市
    'battlefield_ruins': '#D32F2F',   // 映射到凶险之地
    'treasure_source': '#388E3C',     // 映射到奇珍异地
    'spirit_beast_habitat': '#D32F2F', // 映射到凶险之地
    'inheritance_cave': '#7B1FA2',    // 映射到洞天福地
    'teleportation_array': '#6B7280', // 映射到其他特殊
    'demon_realm_gate': '#D32F2F',    // 映射到凶险之地
    'immortal_mansion': '#7B1FA2'     // 映射到洞天福地
  };

  return colorMap[type] || '#6B7280';
};

// 初始化地图 - 从酒馆变量加载完整的修仙世界数据
const initializeMap = async () => {
  try {
    mapStatus.value = '正在从天机阁加载世界数据...';

    const helper = getTavernHelper();
    if (!helper) {
      console.warn('[坤舆图志] 酒馆Helper不可用');
      mapStatus.value = '酒馆系统不可用，请重新生成世界后再打开地图';
      return;
    }

    const chatVars = await helper.getVariables({ type: 'chat' });
    const globalVars = await helper.getVariables({ type: 'global' });

    // 更新tavernVariables供playerPosition使用
    // 合并聊天与全局变量；在类型上断言为 TavernVariables 以满足下游读取
    tavernVariables.value = ((chatVars && globalVars) ? { ...chatVars, ...globalVars } : {}) as TavernVariables;

    // 从全局变量获取玩家信息
    playerName.value = (globalVars['character.name'] as string) || '道友';

    // 加载修仙世界数据
    // chatVars 类型为 Record<string, unknown>，满足 TavernVariables 的结构要求
    await loadCultivationWorldFromTavern(chatVars as TavernVariables);

    // 如果没有加载到数据，提示用户而非加载默认地图
    if (cultivationLocations.value.length === 0) {
      console.warn('[坤舆图志] 未找到世界数据');
      mapStatus.value = '未找到世界数据，请重新生成世界';
    }

    mapStatus.value = '修仙世界加载完成';
    showToastWithDelay('坤舆图志已连通天机', 'success');

  } catch (error) {
    console.error('[坤舆图志] 地图初始化失败:', error);
    mapStatus.value = '天机阁连接失败';
    showToastWithDelay('世界数据加载失败: ' + (error as Error).message, 'error');

    // 出错时不再加载默认地图
  }
};

// 添加测试数据用于验证地图功能
const addTestData = () => {
  console.log('[坤舆图志] 添加测试数据');

  // 测试地点数据 - 明确分布在不同坐标
  const testLocations: WorldLocation[] = [
    // 左上角
    {
      id: 'test_1',
      name: '西北山脉',
      type: 'natural_landmark',
      coordinates: geoToVirtual(102.0, 48.0),
      description: '测试地点1 - 西北角',
      x: 0, y: 0,
      size: 8, color: '#2D7D32', iconColor: '#2D7D32', iconSize: 'medium', isTerritory: false
    },
    // 右上角
    {
      id: 'test_2',
      name: '东北城市',
      type: 'city_town',
      coordinates: geoToVirtual(107.0, 47.0),
      description: '测试地点2 - 东北角',
      x: 0, y: 0,
      size: 10, color: '#F57C00', iconColor: '#F57C00', iconSize: 'medium', isTerritory: false
    },
    // 左下角
    {
      id: 'test_3',
      name: '西南宗门',
      type: 'sect_power',
      coordinates: geoToVirtual(103.0, 42.0),
      description: '测试地点3 - 西南角',
      x: 0, y: 0,
      size: 12, color: '#1565C0', iconColor: '#1565C0', iconSize: 'large', isTerritory: false
    },
    // 右下角
    {
      id: 'test_4',
      name: '东南秘境',
      type: 'blessed_land',
      coordinates: geoToVirtual(106.0, 41.0),
      description: '测试地点4 - 东南角',
      x: 0, y: 0,
      size: 8, color: '#7B1FA2', iconColor: '#7B1FA2', iconSize: 'medium', isTerritory: false
    },
    // 中心点
    {
      id: 'test_5',
      name: '中央之地',
      type: 'special_other',
      coordinates: geoToVirtual(104.5, 44.5),
      description: '测试地点5 - 中心位置',
      x: 0, y: 0,
      size: 15, color: '#6B7280', iconColor: '#6B7280', iconSize: 'large', isTerritory: false
    }
  ];

  // 更新坐标
  testLocations.forEach(loc => {
    loc.x = loc.coordinates?.x || 0;
    loc.y = loc.coordinates?.y || 0;
    console.log(`[测试数据] ${loc.name}: 地理坐标未知 -> 虚拟坐标(${loc.x.toFixed(1)}, ${loc.y.toFixed(1)})`);
  });

  cultivationLocations.value = testLocations;
  console.log('[坤舆图志] ✅ 测试数据加载完成，共', cultivationLocations.value.length, '个地点');
};

// 从酒馆变量加载GeoJSON格式的修仙世界数据 - 根据实际SaveData结构
const loadCultivationWorldFromTavern = async (variables: TavernVariables) => {
  try {
    console.log('[坤舆图志] 开始加载酒馆世界数据...');
    console.log('[坤舆图志] 接收到的variables:', variables);

    // 清空现有数据
    cultivationLocations.value = [];
    cultivationContinents.value = [];

    // 加载大洲数据
    await loadContinentsData(variables);

    // 加载势力数据
    await loadFactionsData(variables);

    // 加载地点数据
    await loadLocationsData(variables);

    if (cultivationLocations.value.length === 0) {
      showToastWithDelay('未找到有效的地点数据，将显示测试数据', 'warning');
      addTestData(); // 添加测试数据以便调试
    } else {
      showToastWithDelay(`成功加载 ${cultivationLocations.value.length} 个修仙地点`, 'success');
      mapStatus.value = `已加载 ${cultivationLocations.value.length} 个地点`;
      
      // 打印加载的数据供调试
      console.log('[坤舆图志] 加载完成的数据统计:', {
        大陆数量: cultivationContinents.value.length,
        地点数量: cultivationLocations.value.length,
        前5个大陆: cultivationContinents.value.slice(0, 5).map(c => ({
          名称: c.名称 || c.name,
          边界点数: (c.大洲边界 || c.continent_bounds)?.length || 0
        })),
        前5个地点: cultivationLocations.value.slice(0, 5).map(l => ({
          名称: l.name,
          类型: l.type,
          坐标: l.coordinates
        }))
      });
    }

  } catch (error) {
    console.error('[坤舆图志] 加载修仙世界数据失败:', error);
    mapStatus.value = '数据加载失败';
    showToastWithDelay('加载世界数据失败: ' + (error as Error).message, 'error');
  }
};

// 加载大洲数据 - 从character.saveData.世界信息读取
const loadContinentsData = async (variables: TavernVariables) => {
  try {
    console.log('🏔️ [大陆加载] 开始加载大陆数据，可用变量:', Object.keys(variables));
    
    const worldInfo = variables['character.saveData']?.世界信息;
    const continentsData = worldInfo?.大陆信息 || [];
    
    console.log('🏔️ [大陆加载] 从世界信息读取到大陆数量:', continentsData.length);
    console.log('🏔️ [大陆加载] 世界信息结构:', worldInfo);
    
    if (continentsData.length === 0) {
      console.warn('🏔️ [大陆加载] 没有找到大陆数据');
      return;
    }
    
    console.log('🏔️ [大陆加载] 最终大陆数据:', continentsData);

    if (Array.isArray(continentsData)) {
      continentsData.forEach((continent: unknown, index: number) => {
        try {
          const continentObj = continent as CultivationContinent;
          // 处理不同的数据结构格式
          const continentName = continentObj.名称 || continentObj.name || `大陆${index + 1}`;
          console.log(`[坤舆图志] ✅ 已加载大洲: ${continentName}`);
          cultivationContinents.value.push(continentObj);
        } catch (continentError) {
          console.error(`[坤舆图志] 处理大洲${index + 1}时出错:`, continentError);
        }
      });
    }
  } catch (error) {
    console.error('[坤舆图志] 加载大洲数据失败:', error);
  }
};

// 加载势力数据 - 从character.saveData.世界信息读取
const loadFactionsData = async (variables: TavernVariables) => {
  try {
    console.log('⚔️ [势力加载] 开始加载势力数据');
    
    const worldInfo = variables['character.saveData']?.世界信息;
    const factionsData = worldInfo?.势力信息 || [];
    
    console.log('⚔️ [势力加载] 从世界信息读取到势力数量:', factionsData.length);
    
    if (factionsData.length === 0) {
      console.warn('⚔️ [势力加载] 没有找到势力数据');
      return;
    }
    
    console.log('⚔️ [势力加载] 最终势力数据:', factionsData);

    if (Array.isArray(factionsData)) {
      factionsData.forEach((faction: unknown, index: number) => {
        try {
          const factionObj = faction as RawFaction;
          // 处理势力范围边界
          let territoryBounds: { x: number; y: number }[] = [];
          // 兼容多种字段名格式
          const territoryData = factionObj.势力范围 || factionObj.territory_bounds || factionObj.territoryBounds;
          if (territoryData && Array.isArray(territoryData) && territoryData.length >= 3) {
            territoryBounds = territoryData.map((point: LngLat) => {
              const virtualCoords = geoToVirtual(point.longitude, point.latitude);
              return { x: virtualCoords.x, y: virtualCoords.y };
            });
          }

          // 总部位置
          let headquarters: { x: number; y: number } | undefined;
          const hqData = factionObj.位置 || factionObj.headquarters || factionObj.总部位置;
          if (hqData && typeof hqData === 'object' && 'longitude' in hqData && 'latitude' in hqData) {
            const hqCoords = hqData as LngLat;
            headquarters = geoToVirtual(hqCoords.longitude, hqCoords.latitude);
          } else if (typeof hqData === 'string') {
            const m = hqData.match(/(-?\d+\.?\d*)\D+(-?\d+\.?\d*)/);
            if (m) {
              const lng = parseFloat(m[1]);
              const lat = parseFloat(m[2]);
              const clampedLng = isFinite(lng) ? Math.min(114, Math.max(107, lng)) : 110;
              const clampedLat = isFinite(lat) ? Math.min(38, Math.max(33, lat)) : 35;
              headquarters = geoToVirtual(clampedLng, clampedLat);
            }
          }

          // 如果仍无总部，使用全局回退经纬度生成一个
          if (!headquarters) {
            const v = geoToVirtual(110, 36);
            headquarters = { x: v.x, y: v.y };
          }

          // 如果缺少势力范围，基于总部生成一个小多边形作为回退
          if ((!territoryBounds || territoryBounds.length < 3) && headquarters) {
            const hx = headquarters.x, hy = headquarters.y;
            territoryBounds = [
              { x: hx - 60, y: hy - 40 },
              { x: hx + 70, y: hy - 20 },
              { x: hx + 50, y: hy + 60 },
              { x: hx - 50, y: hy + 40 }
            ];
          }

          // 处理不同的数据结构格式
          const factionName = factionObj.名称 || factionObj.name || `势力${index + 1}`;
          const factionType = factionObj.类型 || factionObj.type || '中立宗门';

          const location: WorldLocation = {
            id: factionObj.id || `faction_${index}`,
            name: factionName,
            type: factionType,
            coordinates: headquarters || getTerritoryCenter(territoryBounds),
            description: factionObj.描述 || factionObj.description || '',
            x: headquarters?.x || getTerritoryCenter(territoryBounds).x,
            y: headquarters?.y || getTerritoryCenter(territoryBounds).y,
            size: 15, // 势力范围大一些
            color: factionObj.color || getLocationColor(factionType),
            iconColor: factionObj.color || getLocationColor(factionType),
            iconSize: 'large',
            isTerritory: true,
            territoryBounds: territoryBounds,
            headquarters: headquarters
          };

          cultivationLocations.value.push(location);
          console.log(`[坤舆图志] ✅ 已加载势力: ${location.name} (${location.type})`);

        } catch (factionError) {
          console.error(`[坤舆图志] 处理势力${index + 1}时出错:`, factionError);
        }
      });
    }
  } catch (error) {
    console.error('[坤舆图志] 加载势力数据失败:', error);
  }
};

// 加载地点数据 - 从character.saveData.世界信息读取
const loadLocationsData = async (variables: TavernVariables) => {
  try {
    console.log('🏯 [地点加载] 开始加载地点数据');
    
    const worldInfo = variables['character.saveData']?.世界信息;
    const locationsData = worldInfo?.地点信息 || [];
    
    console.log('🏯 [地点加载] 从世界信息读取到地点数量:', locationsData.length);
    
    if (locationsData.length === 0) {
      console.warn('🏯 [地点加载] 没有找到地点数据');
      return;
    }
    
    console.log('🏯 [地点加载] 最终地点数据:', locationsData);

    if (Array.isArray(locationsData)) {
      locationsData.forEach((location: unknown, index: number) => {
        try {
          const locationObj = location as RawLocation;
          // 处理坐标 - 兼容不同的数据格式
          let coordinates: { x: number; y: number };
          if (locationObj.coordinates && typeof locationObj.coordinates === 'object' && 'longitude' in locationObj.coordinates) {
            // WorldLocation中的coordinates字段：{ coordinates: { longitude, latitude } }
            const coords = locationObj.coordinates as LngLat;
            coordinates = geoToVirtual(coords.longitude, coords.latitude);
            console.log(`🏯 [地点加载] 使用coordinates字段加载地点: ${locationObj.名称 || locationObj.name}`, locationObj.coordinates);
          } else if (locationObj.位置 && typeof locationObj.位置 === 'object' && 'longitude' in locationObj.位置) {
            // 新格式：{ 位置: { longitude, latitude } }
            const pos = locationObj.位置 as LngLat;
            coordinates = geoToVirtual(Number(pos.longitude), Number(pos.latitude));
            console.log(`🏯 [地点加载] 使用位置字段加载地点: ${locationObj.名称 || locationObj.name}`, locationObj.位置);
          } else {
            // 生成合理经纬度范围再转换，避免像素随机导致分布失真
            const fallbackLng = 107 + Math.random() * 7; // 107-114
            const fallbackLat = 33 + Math.random() * 5;  // 33-38
            coordinates = geoToVirtual(fallbackLng, fallbackLat);
            console.warn(`🏯 [地点加载] 地点坐标缺失，使用经纬度回退: ${locationObj.名称 || locationObj.name}`, { longitude: fallbackLng, latitude: fallbackLat });
          }

          // 处理不同的数据结构格式
          const locationName = locationObj.名称 || locationObj.name || `地点${index + 1}`;
          const locationType = locationObj.类型 || locationObj.type || '其他';

          const worldLocation: WorldLocation = {
            id: locationObj.id || `location_${index}`,
            name: locationName,
            type: mapLocationTypeToInternal(locationType),
            coordinates: coordinates,
            description: locationObj.描述 || locationObj.description || '',
            x: coordinates.x,
            y: coordinates.y,
            size: getLocationSize(locationType),
            color: getLocationColor(mapLocationTypeToInternal(locationType)),
            iconColor: getLocationColor(mapLocationTypeToInternal(locationType)),
            iconSize: getLocationIconSize(locationType),
            danger_level: locationObj.安全等级 || locationObj.danger_level || '较安全',
            suitable_for: Array.isArray(locationObj.适合境界) ? locationObj.适合境界.join(', ') :
                         Array.isArray(locationObj.suitable_for) ? locationObj.suitable_for.join(', ') :
                         (locationObj.适合境界 || locationObj.suitable_for || ''),
            isTerritory: false
          };

          cultivationLocations.value.push(worldLocation);
          console.log(`[坤舆图志] ✅ 已加载地点: ${worldLocation.name} (${worldLocation.type})`);

        } catch (locationError) {
          console.error(`[坤舆图志] 处理地点${index + 1}时出错:`, locationError);
        }
      });
      // 过滤掉名称为两字的普通地点，避免标签堆叠；
      // 若AI标注了重要性（importance/重要/is_key），则放行两字名称。
      cultivationLocations.value = cultivationLocations.value.filter(loc => {
        const extLoc = loc as unknown as MayHaveImportance;
        const important = Boolean(extLoc?.importance) || Boolean(extLoc?.重要) || Boolean(extLoc?.is_key) || Boolean(extLoc?.isKey);
        if (loc.isTerritory) return true;
        if (important) return true;
        return Boolean(loc.name && (loc.name as string).length > 2);
      });
    }

    // 主要数据结构检查 - 只检查character.saveData.世界信息
    const searchPaths = [
      { path: ['character.saveData', '世界信息'], desc: 'character.saveData.世界信息' }
    ];

    type WorldInfoData = { 地点信息: unknown[] };
    let worldData: WorldInfoData | null = null;
    let dataPath = '';

    // 遍历搜索路径查找旧格式数据
    for (const search of searchPaths) {
      let current: unknown = variables;
      let pathValid = true;

      for (const segment of search.path) {
        if (current && typeof current === 'object' && current !== null) {
          const currentObj = current as Record<string, unknown>;
          if (currentObj[segment] !== undefined) {
            current = currentObj[segment];
          } else {
            pathValid = false;
            break;
          }
        } else {
          pathValid = false;
          break;
        }
      }

      if (pathValid && current) {
        // 检查是否是世界信息数据
        if (typeof current === 'object' && current !== null) {
          const currentObj = current as Record<string, unknown>;
          const locs = currentObj['地点信息'];
          if (Array.isArray(locs)) {
            worldData = { 地点信息: locs as unknown[] };
            dataPath = search.desc;
            break;
          }
        }
      }
    }

    // 如果找到世界信息数据，输出调试信息
    if (worldData && worldData.地点信息) {
      console.log(`[坤舆图志] ✅ 从"${dataPath}"找到 ${worldData.地点信息.length} 个地点信息`);
      console.log('[坤舆图志] 地点数据详情:', worldData.地点信息);
    } else {
      console.warn('[坤舆图志] 未找到有效的地点数据');
    }

  } catch (error) {
    console.error('[坤舆图志] 加载地点数据失败:', error);
  }
};

// 调试地图数据 - 详细检查变量结构
const debugMapData = async () => {
  try {
    const helper = getTavernHelper();
    if (!helper) {
      showToastWithDelay('酒馆系统不可用', 'error');
      return;
    }

    // 测试坐标转换函数
    console.log('[调试] ===== 测试坐标转换 =====');
    const testCoords = [
      { lng: 102.0, lat: 27.5, desc: '西南角' },
      { lng: 109.0, lat: 33.0, desc: '东北角' },
      { lng: 104.0, lat: 30.0, desc: '中心点' },
      { lng: 105.5, lat: 31.5, desc: '偏东北' }
    ];

    testCoords.forEach(test => {
      const virtual = geoToVirtual(test.lng, test.lat);
      console.log(`[调试] ${test.desc} (${test.lng}, ${test.lat}) -> (${virtual.x.toFixed(1)}, ${virtual.y.toFixed(1)})`);
    });

    // 获取所有类型的变量进行对比
    console.log('[调试] ===== 开始详细调试 =====');

    const chatVars = await helper.getVariables({ type: 'chat' });
    const globalVars = await helper.getVariables({ type: 'global' });

    console.log('[调试] Chat变量键值:', Object.keys(chatVars));
    console.log('[调试] Global变量键值:', Object.keys(globalVars));

    // 检查势力和地点数据 - 优先检查新数据结构
    const saveData = chatVars['character.saveData'] as CharacterSaveData | undefined;
    if (saveData?.世界信息) {
      console.log('[调试] ===== 找到新的世界数据结构 =====');
      console.log('[调试] character.saveData.世界信息:', saveData.世界信息);
      
      if (saveData.世界信息.大陆信息) {
        console.log('[调试] 大陆信息数量:', saveData.世界信息.大陆信息.length);
      }
      if (saveData.世界信息.势力信息) {
        console.log('[调试] 势力信息数量:', saveData.世界信息.势力信息.length);
      }
      if (saveData.世界信息.地点信息) {
        console.log('[调试] 地点信息数量:', saveData.世界信息.地点信息.length);
      }
    } else {
      console.log('[调试] ===== 未找到新的世界数据结构，检查旧格式 =====');
    }

    // 检查旧格式数据
    if (chatVars['world_factions']) {
      console.log('[调试] ===== 找到旧格式势力数据 =====');
      console.log('[调试] world_factions:', chatVars['world_factions']);
    }

    if (chatVars['world_locations']) {
      console.log('[调试] ===== 找到旧格式地点数据 =====');
      console.log('[调试] world_locations:', chatVars['world_locations']);
    }

    if (chatVars['world_continents']) {
      console.log('[调试] ===== 找到旧格式大陆数据 =====');
      console.log('[调试] world_continents:', chatVars['world_continents']);
    }

    // 检查所有聊天变量的详细结构
    console.log('[调试] ===== Chat变量详细内容 =====');
    Object.entries(chatVars).forEach(([key, value]) => {
      console.log(`[调试] "${key}":`, typeof value, value);

      // 特别检查可能包含world数据的变量
      if (value && typeof value === 'object') {
        const valueKeys = Object.keys(value);
        console.log(`[调试] "${key}" 的属性:`, valueKeys);

        if (valueKeys.includes('world')) {
          console.log(`[调试] "${key}.world":`, (value as Record<string, unknown>)['world']);
        }
        if (valueKeys.includes('mapData')) {
          console.log(`[调试] "${key}.mapData":`, (value as Record<string, unknown>)['mapData']);
        }
      }
    });

    // 尝试重新加载数据
    await loadCultivationWorldFromTavern(chatVars as TavernVariables);
    
    // 调试坐标数据
    console.log('[调试] ===== 当前加载的地点坐标 =====');
    cultivationLocations.value.forEach((location, index) => {
      console.log(`[调试] ${index + 1}. ${location.name}:`);
      console.log(`  - 原始坐标: ${JSON.stringify(location.coordinates)}`);
      console.log(`  - 显示坐标: (${location.x}, ${location.y})`);
      console.log(`  - 类型: ${location.type}, 是否势力: ${location.isTerritory}`);
    });
    
    console.log('[调试] ===== 坐标范围统计 =====');
    const xCoords = cultivationLocations.value.map(loc => loc.x);
    const yCoords = cultivationLocations.value.map(loc => loc.y);
    console.log(`[调试] X坐标范围: ${Math.min(...xCoords).toFixed(1)} - ${Math.max(...xCoords).toFixed(1)}`);
    console.log(`[调试] Y坐标范围: ${Math.min(...yCoords).toFixed(1)} - ${Math.max(...yCoords).toFixed(1)}`);
    
    const uniqueX = new Set(xCoords.map(x => x.toFixed(1)));
    const uniqueY = new Set(yCoords.map(y => y.toFixed(1)));
    console.log(`[调试] 不同X坐标数量: ${uniqueX.size}/${xCoords.length}`);
    console.log(`[调试] 不同Y坐标数量: ${uniqueY.size}/${yCoords.length}`);
    
    if (uniqueX.size === 1 && uniqueY.size === 1) {
      console.error('[调试] ❌ 发现问题：所有地点都在同一个坐标！');
      console.log('[调试] 可能的原因：');
      console.log('[调试] 1. AI生成的坐标超出了geoToVirtual函数的处理范围');
      console.log('[调试] 2. 坐标转换函数有bug');
      console.log('[调试] 3. 数据解析有问题');
    } else {
      console.log(`[调试] ✅ 坐标分布正常，有${uniqueX.size}个不同X坐标，${uniqueY.size}个不同Y坐标`);
    }

  } catch (error) {
    console.error('[调试] 调试过程出错:', error);
    showToastWithDelay('调试失败: ' + (error as Error).message, 'error');
  }
};


// 定位到玩家
const centerToPlayer = () => {
  if (!playerPosition.value) {
    showToastWithDelay('无法定位玩家位置', 'warning');
    return;
  }

  // 将玩家位置居中显示
  panX.value = (mapWidth.value / 2) - playerPosition.value.x * zoomLevel.value;
  panY.value = (mapHeight.value / 2) - playerPosition.value.y * zoomLevel.value;
  zoomLevel.value = 1.5;

  showToastWithDelay('已定位到当前位置', 'success');
};

// 根据地点类型计算图标尺寸
const getIconSize = (locationType: string) => {
  const iconSizes = {
    // 大型地理实体 (比较大的图标)
    'natural_landmark': { size: 20, offset: 10 },  // 名山大川 - 大
    'sect_power': { size: 18, offset: 9 },         // 宗门势力 - 较大  
    'city_town': { size: 18, offset: 9 },          // 城镇坊市 - 较大
    
    // 中型地理实体 (中等图标)
    'blessed_land': { size: 16, offset: 8 },       // 洞天福地 - 中等
    'treasure_land': { size: 16, offset: 8 },      // 奇珍异地 - 中等
    'dangerous_area': { size: 16, offset: 8 },     // 凶险之地 - 中等
    
    // 小型地理实体 (较小图标)
    'special_other': { size: 14, offset: 7 },      // 其他特殊 - 小
    'default': { size: 16, offset: 8 }             // 默认 - 中等
  };
  
  return iconSizes[locationType as keyof typeof iconSizes] || iconSizes.default;
};

// 地图生命周期
onMounted(async () => {
  await initializeMap();
});

</script>

<style scoped>
.map-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
}

/* 世界信息头部 */
.world-info-header {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 16px;
  backdrop-filter: blur(8px);
}

.world-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e40af;
  text-shadow: 0 1px 2px rgba(30, 64, 175, 0.1);
}

.world-background {
  font-size: 0.85rem;
  color: #64748b;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 地图内控制按钮 (左侧) */
.map-controls-left {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 1000;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #64748b;
}

.control-btn:hover {
  background: white;
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.map-status-mini {
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.7rem;
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
  writing-mode: vertical-rl;
}

/* 地图容器 */
.custom-map-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
  background: linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%);
}

/* SVG地图样式 */
.world-map-svg {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.world-map-svg:active {
  cursor: grabbing;
}

/* 大洲层样式 - 针对紧密分布优化 */
.continent-layer .continent-polygon {
  cursor: pointer;
  transition: fill-opacity 0.3s ease, stroke-width 0.3s ease, stroke-opacity 0.3s ease;
}

.continent-layer .continent-polygon:hover {
  fill-opacity: 0.18; /* 稍微提高以更好地显示紧密分布的大陆 */
  stroke-width: 3;
  stroke-opacity: 1.0;
  stroke-dasharray: 6,2; /* 缩短虚线间距以更好地显示边界 */
}

.continent-name-label {
  font-family: '微软雅黑', 'SimHei', sans-serif;
  pointer-events: none;
  user-select: none;
  font-size: 16px; /* 稍微增大字体以更好地显示紧密大陆名称 */
  font-weight: bold;
}

/* 势力范围样式 */
.territory-bounds-layer .territory-polygon {
  cursor: pointer;
  transition: fill-opacity 0.2s ease, stroke-width 0.2s ease;
}

.territory-bounds-layer .territory-polygon:hover {
  fill-opacity: 0.25;
  stroke-width: 3;
}

.territory-name-label {
  font-size: 14px;
  font-weight: bold;
  font-family: '微软雅黑', 'SimHei', sans-serif;
  pointer-events: none;
}

.headquarters-marker {
  cursor: pointer;
  transition: transform 0.2s ease;
}

/* 地点标记样式 - 修复抽搐问题 */
.location-marker {
  cursor: pointer;
  transition: none; /* 移除transition避免抽搐 */
}

.location-marker:hover .location-icon-group {
  transform: scale(1.1);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.location-icon-group {
  transition: transform 0.15s ease, filter 0.15s ease;
}

/* 选中详情显示面板 (动态位置在地点顶部) */
.selected-info-overlay {
  position: absolute;
  z-index: 1001;
  pointer-events: none; /* 允许点击穿透到地图 */
}

.selected-info {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  min-width: 300px;
  max-width: 400px;
  pointer-events: auto; /* 弹窗内容可以交互 */
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.info-header h4 {
  margin: 0;
  color: #1e40af;
  font-size: 1rem;
  font-weight: 600;
}

.close-info {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #64748b;
  font-size: 1.2rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-info:hover {
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}

.info-content {
  font-size: 0.875rem;
  line-height: 1.5;
}

.info-type {
  color: #6366f1;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.info-desc {
  color: #4b5563;
  margin: 0 0 12px 0;
}

.info-detail {
  color: #6b7280;
  margin: 6px 0;
  font-size: 0.8rem;
}

/* 地图图例 (右下角) */
.map-legend {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 12px;
  z-index: 1000;
  min-width: 140px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.legend-title {
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  font-size: 0.875rem;
  text-align: center;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 4px;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: #6b7280;
  padding: 2px;
}

.legend-icon {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  flex-shrink: 0;
}


/* 动画效果 */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* SVG元素样式 */
.location-name-label {
  font-size: 11px;
  font-weight: 600;
  font-family: '微软雅黑', 'SimHei', sans-serif;
  pointer-events: none; /* 防止标签干扰鼠标事件 */
}

.location-icon-text {
  font-size: 9px;
  font-weight: bold;
  font-family: '微软雅黑', sans-serif;
  pointer-events: none;
}

.player-name-label {
  font-size: 12px;
  font-weight: 700;
  font-family: '微软雅黑', sans-serif;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .map-legend {
    bottom: 10px;
    right: 10px;
    padding: 8px;
    min-width: 120px;
  }

  .map-controls-left {
    top: 8px;
    left: 8px;
    gap: 4px;
  }

  .control-btn {
    width: 28px;
    height: 28px;
  }

  .selected-info-overlay {
    top: 10px;
    left: 10px;
    right: 10px;
    transform: none;
  }

  .selected-info {
    min-width: auto;
    max-width: none;
  }
}

/* 全屏模式优化 */
.map-panel:fullscreen {
  background: #1a1a2e;
  z-index: 999999; /* 确保全屏容器在最高层 */
}

.map-panel:fullscreen .custom-map-container {
  border: none;
  border-radius: 0;
}

.map-panel:fullscreen .map-legend {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  z-index: 999998;
}

.map-panel:fullscreen .selected-info {
  background: rgba(0, 0, 0, 0.9) !important;
  color: white !important;
  pointer-events: auto !important;
  z-index: 999999 !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  position: fixed !important; /* 确保在全屏模式下使用fixed定位 */
}

.map-panel:fullscreen .selected-info-overlay {
  z-index: 999999 !important;
  pointer-events: none !important;
  position: fixed !important; /* 全屏模式下使用fixed定位 */
}

.map-panel:fullscreen .selected-info-overlay .selected-info {
  pointer-events: auto !important;
  position: relative !important; /* 内部弹窗使用relative定位 */
}

.map-panel:fullscreen .close-info {
  color: white !important;
}

.map-panel:fullscreen .close-info:hover {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #ff6b6b !important;
}

/* 全屏模式下确保弹窗文本可见 */
.map-panel:fullscreen .selected-info * {
  color: white !important;
}

.map-panel:fullscreen .selected-info .info-header h4 {
  color: #60a5fa !important; /* 蓝色标题在黑色背景下更明显 */
}
</style>
