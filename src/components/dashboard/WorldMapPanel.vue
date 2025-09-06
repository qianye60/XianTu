<template>
  <div class="map-panel">
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
          
          <!-- 地点光辉效果 -->
          <filter id="locationGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- 世界背景网格 -->
        <rect width="100%" height="100%" fill="url(#gridPattern)" opacity="0.1"/>
        
        <!-- 地图内容组 (支持平移和缩放) -->
        <g :transform="`translate(${panX}, ${panY}) scale(${zoomLevel})`">
          
          <!-- 势力范围层 -->
          <g class="territory-bounds-layer">
            <g v-for="location in cultivationLocations.filter(loc => loc.isTerritory && loc.territoryBounds)" :key="'territory-' + location.id">
              <!-- 势力范围多边形 -->
              <polygon 
                :points="location.territoryBounds.map(point => `${point.x},${point.y}`).join(' ')"
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
                :x="getTerritoryCenter(location.territoryBounds).x"
                :y="getTerritoryCenter(location.territoryBounds).y"
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
                :transform="`translate(${location.coordinates.x}, ${location.coordinates.y})`"
                class="location-marker"
                @click="selectLocation(location)"
                @mouseenter="onLocationHover(location)"
                @mouseleave="onLocationLeave"
              >
                <!-- 地点类型图标 -->
                <g class="location-icon-group">
                  <!-- 门派宗门 -->
                  <g v-if="location.type === 'sect_headquarters'">
                    <polygon points="0,-12 -8,8 8,8" :fill="location.iconColor" stroke="#FFD700" stroke-width="1.5"/>
                    <circle r="3" fill="#FFD700"/>
                    <circle r="1.5" fill="white"/>
                  </g>
                  
                  <!-- 城镇 -->
                  <g v-else-if="location.type === 'major_city'">
                    <rect x="-8" y="-8" width="16" height="16" :fill="location.iconColor" rx="2"/>
                    <rect x="-6" y="-6" width="5" height="5" fill="white" opacity="0.9"/>
                    <rect x="1" y="-6" width="5" height="5" fill="white" opacity="0.9"/>
                    <rect x="-6" y="1" width="5" height="5" fill="white" opacity="0.9"/>
                    <rect x="1" y="1" width="5" height="5" fill="white" opacity="0.9"/>
                  </g>
                  
                  <!-- 危险秘境 -->
                  <g v-else-if="location.type === 'secret_realm'">
                    <circle r="8" :fill="location.iconColor" opacity="0.8"/>
                    <path d="M-4,-4 L0,4 L4,-4 Z" fill="#FBBF24"/>
                    <circle r="2.5" fill="white" opacity="0.9">
                      <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite"/>
                    </circle>
                  </g>
                  
                  <!-- 自然地貌 -->
                  <g v-else-if="location.type === 'mountain'">
                    <path d="M-6,-6 L0,-12 L6,-6 L4,6 L-4,6 Z" :fill="location.iconColor"/>
                    <path d="M-4,-4 L0,-8 L4,-4" stroke="white" stroke-width="1" fill="none"/>
                  </g>
                  
                  <!-- 修炼胜地 -->
                  <g v-else-if="location.type === 'cultivation_site'">
                    <circle r="6" :fill="location.iconColor" opacity="0.7"/>
                    <text class="location-icon-text" text-anchor="middle" dy="2" fill="white" font-size="8px">修</text>
                  </g>
                  
                  <!-- 传承洞府 -->
                  <g v-else-if="location.type === 'inheritance_cave'">
                    <rect x="-6" y="-6" width="12" height="12" :fill="location.iconColor" rx="2"/>
                    <text class="location-icon-text" text-anchor="middle" dy="2" fill="white" font-size="7px">传</text>
                  </g>
                  
                  <!-- 古战场遗迹 -->
                  <g v-else-if="location.type === 'battlefield_ruins'">
                    <polygon points="-6,-6 6,-6 5,6 -5,6" :fill="location.iconColor" stroke="#000" stroke-width="1"/>
                    <text class="location-icon-text" text-anchor="middle" dy="1.5" fill="white" font-size="6px">战</text>
                  </g>
                  
                  <!-- 天材地宝产地 -->
                  <g v-else-if="location.type === 'treasure_source'">
                    <circle r="7" :fill="location.iconColor" stroke="#FFD700" stroke-width="1.5"/>
                    <text class="location-icon-text" text-anchor="middle" dy="2" fill="white" font-size="6px">宝</text>
                  </g>
                  
                  <!-- 灵兽栖息地 -->
                  <g v-else-if="location.type === 'spirit_beast_habitat'">
                    <ellipse rx="8" ry="5" :fill="location.iconColor" opacity="0.8"/>
                    <text class="location-icon-text" text-anchor="middle" dy="1.5" fill="white" font-size="6px">兽</text>
                  </g>
                  
                  <!-- 跨界传送阵 -->
                  <g v-else-if="location.type === 'teleportation_array'">
                    <circle r="6" :fill="location.iconColor" stroke="white" stroke-width="1.5"/>
                    <circle r="3" fill="none" stroke="white" stroke-width="0.8"/>
                    <text class="location-icon-text" text-anchor="middle" dy="1.5" fill="white" font-size="5px">阵</text>
                  </g>
                  
                  <!-- 魔域入口 -->
                  <g v-else-if="location.type === 'demon_realm_gate'">
                    <path d="M-6,-6 L6,6 M6,-6 L-6,6" stroke="#DC2626" stroke-width="2"/>
                    <circle r="4" :fill="location.iconColor" opacity="0.7"/>
                    <text class="location-icon-text" text-anchor="middle" dy="1.5" fill="white" font-size="5px">魔</text>
                  </g>
                  
                  <!-- 仙人遗府 -->
                  <g v-else-if="location.type === 'immortal_mansion'">
                    <rect x="-7" y="-7" width="14" height="14" :fill="location.iconColor" rx="1.5" opacity="0.9"/>
                    <circle r="2.5" fill="#FFD700"/>
                    <text class="location-icon-text" text-anchor="middle" dy="1.5" fill="black" font-size="5px">仙</text>
                  </g>
                  
                  <!-- 默认图标 -->
                  <g v-else>
                    <circle r="4" :fill="location.iconColor" stroke="white" stroke-width="1"/>
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
              <!-- 玩家灵气光环 -->
              <circle class="player-aura" r="15" fill="#EF4444" opacity="0.4">
                <animate attributeName="r" values="10;20;10" dur="3s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="3s" repeatCount="indefinite"/>
              </circle>
              <!-- 玩家标记 -->
              <polygon points="0,-10 -6,6 6,6" fill="#DC2626" stroke="white" stroke-width="2"/>
              <circle r="2" fill="white"/>
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
          <p class="info-type">{{ internalTypeToChineseName(selectedInfo.type) }}</p>
          <p class="info-desc">{{ selectedInfo.description }}</p>
          <div v-if="selectedInfo.danger_level" class="info-detail">
            <strong>危险等级：</strong>{{ selectedInfo.danger_level }}
          </div>
          <div v-if="selectedInfo.suitable_for" class="info-detail">
            <strong>适合：</strong>{{ selectedInfo.suitable_for }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- 地图图例 (右下角) -->
    <div class="map-legend">
      <div class="legend-title">图例</div>
      <div class="legend-items">
        <div class="legend-item">
          <div class="legend-icon sect-icon">⛩️</div>
          <span>门派宗门</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon city-icon">🏘️</div>
          <span>城镇</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon secret-icon">💎</div>
          <span>危险秘境</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon nature-icon">🏔️</div>
          <span>自然地貌</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon practice-icon">🧘</div>
          <span>修炼圣地</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Target, Maximize2 } from 'lucide-vue-next';
import { getTavernHelper } from '@/utils/tavern';
import { toast } from '@/utils/toast';
import type { SaveData } from '@/types/game';

// --- 类型定义 ---

/** GeoJSON格式的地点接口 */
interface CultivationLocation {
  id: string;
  name: string;
  type: string;
  coordinates: { x: number; y: number };
  description: string;
  x: number;
  y: number;
  size: number;
  color: string;
  iconColor: string;
  iconSize: 'small' | 'medium' | 'large';
  danger_level?: string;
  suitable_for?: string;
  // 势力范围相关属性
  territoryBounds?: { x: number; y: number }[]; // 势力边界点
  headquarters?: { x: number; y: number }; // 总部位置
  isTerritory?: boolean; // 是否显示为势力范围
}

// 地图尺寸配置
const mapWidth = ref(2000);
const mapHeight = ref(1400);

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
const selectedInfo = ref<{
  id?: string;
  name: string;
  type: string;
  description: string;
  danger_level?: string;
  suitable_for?: string;
  screenPosition?: { x: number; y: number }; // 屏幕位置
} | null>(null);

// 组件状态
const mapContainer = ref<HTMLElement | null>(null);
const loading = ref(false);
const mapStatus = ref('正在加载修仙世界...');
const playerName = ref('');
const playerLocation = ref('');

// 修仙世界数据 - 只从酒馆变量加载
const cultivationLocations = ref<CultivationLocation[]>([]);
const isGeneratingWorld = ref(false);
const tavernVariables = ref<any>({});

// 玩家位置 - 从酒馆变量获取
const playerPosition = computed(() => {
  // 从酒馆获取SaveData中的玩家位置
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

const onLocationHover = (location: CultivationLocation) => {
  hoveredLocation.value = location.id;
};

const onLocationLeave = () => {
  hoveredLocation.value = null;
};

// 选择处理 - 只有在没有明显拖动时才触发
const selectLocation = (location: CultivationLocation) => {
  // 如果正在拖动或拖动距离超过阈值，不触发选择
  if (isPanning.value || dragDistance.value > 5) {
    return;
  }
  
  console.log('[坤舆图志] 选中地点:', location.name);
  
  // 计算地点在屏幕上的位置
  const screenPosition = calculateScreenPosition(location.coordinates.x, location.coordinates.y);
  
  selectedInfo.value = {
    id: location.id,
    name: location.name,
    type: location.type,
    description: location.description,
    danger_level: location.danger_level,
    suitable_for: location.suitable_for,
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

// 计算弹窗位置样式
const getPopupPosition = (): Record<string, string> => {
  if (!selectedInfo.value?.screenPosition) {
    return {
      position: 'absolute',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)'
    };
  }
  
  const { x, y } = selectedInfo.value.screenPosition;
  const popupWidth = 350; // 弹窗预估宽度
  const popupHeight = 200; // 弹窗预估高度
  
  // 确保弹窗不会超出容器边界
  let popupX = x - popupWidth / 2;
  let popupY = y - popupHeight - 30; // 在地点顶部30px处显示
  
  // 边界检查
  if (popupX < 10) popupX = 10;
  if (popupX + popupWidth > (mapContainer.value?.clientWidth || 800) - 10) {
    popupX = (mapContainer.value?.clientWidth || 800) - popupWidth - 10;
  }
  
  if (popupY < 10) {
    popupY = y + 30; // 如果顶部放不下，显示在地点下方
  }
  
  return {
    position: 'absolute',
    left: `${popupX}px`,
    top: `${popupY}px`,
    transform: 'none'
  };
};

// GeoJSON坐标到虚拟坐标的转换 (基于实际数据范围)
const geoToVirtual = (lng: number, lat: number): { x: number; y: number } => {
  // 修仙世界蜀中仙域坐标范围
  const lngMin = 102.0, lngMax = 109.0;
  const latMin = 27.5, latMax = 33.0;
  
  // 保留边距，确保所有点都在可视范围内
  const margin = 100;
  const x = ((lng - lngMin) / (lngMax - lngMin)) * (mapWidth.value - 2 * margin) + margin;
  const y = ((latMax - lat) / (latMax - latMin)) * (mapHeight.value - 2 * margin) + margin;
  
  return {
    x: Math.max(margin, Math.min(mapWidth.value - margin, x)),
    y: Math.max(margin, Math.min(mapHeight.value - margin, y))
  };
};

// 地图类型转换
const mapLocationTypeToInternal = (type: string): string => {
  const typeMap: Record<string, string> = {
    '门派宗门': 'sect_headquarters',
    '城镇': 'major_city', 
    '危险秘境': 'secret_realm',
    '自然地貌': 'mountain',
    '修炼圣地': 'cultivation_site',
    '古战场遗迹': 'battlefield_ruins',
    '天材地宝产地': 'treasure_source',
    '灵兽栖息地': 'spirit_beast_habitat', 
    '传承洞府': 'inheritance_cave',
    '跨界传送阵': 'teleportation_array',
    '魔域入口': 'demon_realm_gate',
    '仙人遗府': 'immortal_mansion'
  };
  return typeMap[type] || 'village';
};

// 内部类型转换为中文显示
const internalTypeToChineseName = (type: string): string => {
  const typeMap: Record<string, string> = {
    'sect_headquarters': '门派宗门',
    'major_city': '主要城市',
    'secret_realm': '危险秘境',
    'mountain': '自然地貌',
    'cultivation_site': '修炼圣地',
    'trade_center': '贸易中心',
    'village': '村镇',
    'neutral_zone': '中立区域',
    'immortal_empire': '仙朝帝国',
    'orthodox_sect': '正道宗门',
    'demonic_cult': '魔道势力',
    'immortal_family': '修仙世家',
    'merchant_guild': '商会组织',
    'neutral_academy': '中立学院',
    'rogue_alliance': '散修联盟',
    'demon_tribe': '妖族部落',
    // 新增特殊地点类型
    'battlefield_ruins': '古战场遗迹',
    'treasure_source': '天材地宝产地',
    'spirit_beast_habitat': '灵兽栖息地',
    'inheritance_cave': '传承洞府',
    'teleportation_array': '跨界传送阵',
    'demon_realm_gate': '魔域入口',
    'immortal_mansion': '仙人遗府'
  };
  return typeMap[type] || type;
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
    'sect_headquarters': '#7C3AED', 
    'major_city': '#DC2626',
    'secret_realm': '#EC4899',
    'mountain': '#8B5A2B',
    'cultivation_site': '#059669',
    'village': '#6B7280',
    // 新增特殊地点颜色
    'battlefield_ruins': '#7F1D1D',      // 古战场 - 暗红
    'treasure_source': '#F59E0B',        // 天材地宝 - 金黄
    'spirit_beast_habitat': '#16A34A',   // 灵兽栖息地 - 绿色
    'inheritance_cave': '#9333EA',       // 传承洞府 - 紫色
    'teleportation_array': '#0EA5E9',    // 传送阵 - 蓝色
    'demon_realm_gate': '#991B1B',       // 魔域入口 - 深红
    'immortal_mansion': '#CA8A04'        // 仙人遗府 - 金色
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
      mapStatus.value = '酒馆系统不可用';
      
      // 添加一些测试数据来验证地图显示
      addTestData();
      return;
    }

    const chatVars = await helper.getVariables({ type: 'chat' });
    const globalVars = await helper.getVariables({ type: 'global' });
    
    // 更新tavernVariables供playerPosition使用
    tavernVariables.value = { ...chatVars, ...globalVars };
    
    // 从全局变量获取玩家信息
    playerName.value = (globalVars['character.name'] as string) || '道友';
    
    // 加载修仙世界数据
    await loadCultivationWorldFromTavern(chatVars);
    
    // 如果没有加载到数据，添加测试数据
    if (cultivationLocations.value.length === 0) {
      console.log('[坤舆图志] 没有找到世界数据，加载测试数据');
      addTestData();
    }
    
    mapStatus.value = '修仙世界加载完成';
    showToastWithDelay('坤舆图志已连通天机', 'success');
    
  } catch (error) {
    console.error('[坤舆图志] 地图初始化失败:', error);
    mapStatus.value = '天机阁连接失败';
    showToastWithDelay('世界数据加载失败: ' + (error as Error).message, 'error');
    
    // 出错时也添加测试数据
    addTestData();
  }
};

// 添加测试数据用于验证地图功能
const addTestData = () => {
  console.log('[坤舆图志] 添加测试数据');
  
  // 测试势力范围数据
  const testFactions: CultivationLocation[] = [
    {
      id: 'test_faction_1',
      name: '青云宗',
      type: 'orthodox_sect',
      coordinates: geoToVirtual(104.5, 30.8),
      description: '蜀中第一大正道宗门，以剑道闻名天下',
      x: 0, y: 0,
      size: 15,
      color: '#2563EB',
      iconColor: '#2563EB',
      iconSize: 'large',
      isTerritory: true,
      territoryBounds: [
        geoToVirtual(103.8, 31.2),
        geoToVirtual(105.2, 31.2), 
        geoToVirtual(105.5, 30.4),
        geoToVirtual(104.8, 29.8),
        geoToVirtual(103.5, 30.2)
      ],
      headquarters: geoToVirtual(104.5, 30.8)
    },
    {
      id: 'test_faction_2', 
      name: '血魔教',
      type: 'demonic_cult',
      coordinates: geoToVirtual(106.5, 29.2),
      description: '邪恶的魔道势力，以血炼之术称霸西南',
      x: 0, y: 0,
      size: 15,
      color: '#DC2626',
      iconColor: '#DC2626', 
      iconSize: 'large',
      isTerritory: true,
      territoryBounds: [
        geoToVirtual(105.9, 29.8),
        geoToVirtual(107.1, 29.8),
        geoToVirtual(107.3, 28.6),
        geoToVirtual(106.2, 28.4),
        geoToVirtual(105.7, 28.9)
      ],
      headquarters: geoToVirtual(106.5, 29.2)
    }
  ];
  
  // 测试地点数据
  const testLocations: CultivationLocation[] = [
    {
      id: 'test_city_1',
      name: '成都仙城',
      type: 'major_city',
      coordinates: geoToVirtual(104.0, 30.6),
      description: '蜀中最大的修士聚集地，商贾云集',
      x: 0, y: 0,
      size: 10,
      color: '#059669',
      iconColor: '#059669',
      iconSize: 'medium',
      isTerritory: false
    },
    {
      id: 'test_realm_1',
      name: '九天秘境',
      type: 'secret_realm', 
      coordinates: geoToVirtual(107.5, 31.8),
      description: '传说中的上古秘境，危险重重但宝物众多',
      x: 0, y: 0,
      size: 8,
      color: '#EC4899',
      iconColor: '#EC4899',
      iconSize: 'medium',
      danger_level: '极高',
      suitable_for: '元婴期以上修士',
      isTerritory: false
    }
  ];
  
  // 更新坐标
  [...testFactions, ...testLocations].forEach(loc => {
    loc.x = loc.coordinates.x;
    loc.y = loc.coordinates.y;
  });
  
  cultivationLocations.value = [...testFactions, ...testLocations];
  console.log('[坤舆图志] ✅ 测试数据加载完成，共', cultivationLocations.value.length, '个地点');
  
  // 打印坐标信息
  cultivationLocations.value.forEach(loc => {
    console.log(`[坤舆图志] ${loc.name}: (${loc.x.toFixed(1)}, ${loc.y.toFixed(1)}) 类型:${loc.isTerritory ? '势力范围' : '地点'}`);
  });
};

// 从酒馆变量加载GeoJSON格式的修仙世界数据 - 根据实际SaveData结构
const loadCultivationWorldFromTavern = async (variables: any) => {
  try {
    console.log('[坤舆图志] 开始加载酒馆世界数据...');
    console.log('[坤舆图志] 接收到的variables:', variables);
    
    // 清空现有数据
    cultivationLocations.value = [];
    
    // 加载势力数据
    await loadFactionsData(variables);
    
    // 加载地点数据
    await loadLocationsData(variables);
    
    if (cultivationLocations.value.length === 0) {
      showToastWithDelay('所有地点数据都无效，无法加载', 'error');
    } else {
      showToastWithDelay(`✅ 成功加载 ${cultivationLocations.value.length} 个修仙地点`, 'success');
      mapStatus.value = `已加载 ${cultivationLocations.value.length} 个地点`;
    }
    
  } catch (error) {
    console.error('[坤舆图志] 加载修仙世界数据失败:', error);
    mapStatus.value = '数据加载失败';
    showToastWithDelay('加载世界数据失败: ' + (error as Error).message, 'error');
  }
};

// 加载势力数据
const loadFactionsData = async (variables: any) => {
  try {
    const factionsData = variables['world_factions'] || [];
    console.log('[坤舆图志] 加载势力数据:', factionsData);
    
    if (Array.isArray(factionsData)) {
      factionsData.forEach((faction: any, index: number) => {
        try {
          // 处理势力范围边界
          let territoryBounds: { x: number; y: number }[] = [];
          if (faction.territoryBounds && Array.isArray(faction.territoryBounds)) {
            territoryBounds = faction.territoryBounds.map((point: any) => {
              const virtualCoords = geoToVirtual(point.longitude, point.latitude);
              return { x: virtualCoords.x, y: virtualCoords.y };
            });
          }
          
          // 总部位置
          let headquarters: { x: number; y: number } | undefined;
          if (faction.headquarters) {
            headquarters = geoToVirtual(faction.headquarters.longitude, faction.headquarters.latitude);
          }
          
          const location: CultivationLocation = {
            id: faction.id || `faction_${index}`,
            name: faction.name,
            type: faction.type,
            coordinates: headquarters || getTerritoryCenter(territoryBounds),
            description: faction.description || '',
            x: headquarters?.x || getTerritoryCenter(territoryBounds).x,
            y: headquarters?.y || getTerritoryCenter(territoryBounds).y,
            size: 15, // 势力范围大一些
            color: faction.color || getLocationColor(faction.type),
            iconColor: faction.color || getLocationColor(faction.type),
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

// 加载地点数据
const loadLocationsData = async (variables: any) => {
  try {
    // 查找世界地点数据
    const locationsData = variables['world_locations'] || [];
    console.log('[坤舆图志] 加载地点数据:', locationsData);
    
    if (Array.isArray(locationsData)) {
      locationsData.forEach((location: any, index: number) => {
        try {
          const virtualCoords = geoToVirtual(location.coordinates.longitude, location.coordinates.latitude);
          
          const locationObj: CultivationLocation = {
            id: location.id || `location_${index}`,
            name: location.name,
            type: mapLocationTypeToInternal(location.type),
            coordinates: virtualCoords,
            description: location.description || '',
            x: virtualCoords.x,
            y: virtualCoords.y,
            size: getLocationSize(location.type),
            color: getLocationColor(mapLocationTypeToInternal(location.type)),
            iconColor: getLocationColor(mapLocationTypeToInternal(location.type)),
            iconSize: getLocationIconSize(location.type),
            danger_level: location.danger_level,
            suitable_for: location.suitable_for,
            isTerritory: false
          };
          
          cultivationLocations.value.push(locationObj);
          console.log(`[坤舆图志] ✅ 已加载地点: ${locationObj.name} (${locationObj.type})`);
          
        } catch (locationError) {
          console.error(`[坤舆图志] 处理地点${index + 1}时出错:`, locationError);
        }
      });
    }
    
    // 旧的GeoJSON格式兼容处理
    const searchPaths = [
      { path: ['world'], desc: '直接world变量' },
      { path: ['character.saveData', '世界舆图'], desc: 'character.saveData.世界舆图' },
      { path: ['character.saveData', '世界信息'], desc: 'character.saveData.世界信息' },
      { path: ['character.saveData', 'world'], desc: 'character.saveData.world' },
      { path: ['character.saveData'], desc: 'character.saveData根级别', checkMapData: true },
      { path: ['世界信息'], desc: '世界信息变量' },
      { path: ['世界舆图'], desc: '世界舆图变量' },
      { path: ['worldData'], desc: 'worldData变量' }
    ];
    
    let worldData = null;
    let dataPath = '';
    
    // 遍历搜索路径查找旧格式数据
    for (const search of searchPaths) {
      let current = variables;
      let pathValid = true;
      
      for (const segment of search.path) {
        if (current && typeof current === 'object' && current[segment] !== undefined) {
          current = current[segment];
        } else {
          pathValid = false;
          break;
        }
      }
      
      if (pathValid && current) {
        if (search.checkMapData && typeof current === 'object') {
          for (const [key, value] of Object.entries(current)) {
            if (value && typeof value === 'object' && value.mapData) {
              worldData = value;
              dataPath = `character.saveData.${key}`;
              break;
            }
          }
          if (worldData) break;
        }
        
        if (current.mapData && current.mapData.type === 'FeatureCollection') {
          worldData = current;
          dataPath = search.desc;
          break;
        }
      }
    }
    
    // 处理旧格式的GeoJSON数据
    if (worldData && worldData.mapData && worldData.mapData.features) {
      console.log(`[坤舆图志] ✅ 从"${dataPath}"找到 ${worldData.mapData.features.length} 个旧格式地点`);
      
      worldData.mapData.features.forEach((feature: any, index: number) => {
        try {
          if (!feature.geometry || !feature.properties) return;
          
          // 处理Point类型的地点
          if (feature.geometry.type === 'Point') {
            const coords = feature.geometry.coordinates;
            if (!coords || !Array.isArray(coords) || coords.length < 2) return;
            
            const virtualCoords = geoToVirtual(coords[0], coords[1]);
            
            const location: CultivationLocation = {
              id: `old_loc_${feature.properties.name}_${index}`,
              name: feature.properties.name,
              type: mapLocationTypeToInternal(feature.properties.type),
              coordinates: virtualCoords,
              description: feature.properties.description,
              x: virtualCoords.x,
              y: virtualCoords.y,
              size: getLocationSize(feature.properties.type),
              color: getLocationColor(mapLocationTypeToInternal(feature.properties.type)),
              iconColor: getLocationColor(mapLocationTypeToInternal(feature.properties.type)),
              iconSize: getLocationIconSize(feature.properties.type),
              danger_level: feature.properties.danger_level,
              suitable_for: feature.properties.suitable_for,
              isTerritory: false
            };
            
            cultivationLocations.value.push(location);
          }
          
          // 处理Polygon类型的势力范围
          else if (feature.geometry.type === 'Polygon' && feature.properties.type === 'faction_territory') {
            const polygonCoords = feature.geometry.coordinates[0]; // 外环坐标
            if (!polygonCoords || !Array.isArray(polygonCoords) || polygonCoords.length < 3) return;
            
            // 转换多边形坐标到虚拟坐标系
            const territoryBounds = polygonCoords.map(([lng, lat]: [number, number]) => {
              return geoToVirtual(lng, lat);
            });
            
            // 计算中心点作为总部位置
            const centerX = territoryBounds.reduce((sum, point) => sum + point.x, 0) / territoryBounds.length;
            const centerY = territoryBounds.reduce((sum, point) => sum + point.y, 0) / territoryBounds.length;
            const headquarters = { x: centerX, y: centerY };
            
            const factionLocation: CultivationLocation = {
              id: `old_faction_${feature.properties.name}_${index}`,
              name: feature.properties.name,
              type: feature.properties.faction_type || 'orthodox_sect',
              coordinates: headquarters,
              description: feature.properties.description,
              x: headquarters.x,
              y: headquarters.y,
              size: 15, // 势力标记稍大
              color: getLocationColor(feature.properties.faction_type || 'orthodox_sect'),
              iconColor: getLocationColor(feature.properties.faction_type || 'orthodox_sect'),
              iconSize: 'large',
              danger_level: feature.properties.danger_level,
              suitable_for: feature.properties.suitable_for,
              isTerritory: true,
              territoryBounds: territoryBounds,
              headquarters: headquarters
            };
            
            cultivationLocations.value.push(factionLocation);
            console.log(`[坤舆图志] ✅ 已加载势力范围: ${factionLocation.name} (${territoryBounds.length}个边界点)`);
          }
          
        } catch (featureError) {
          console.error(`[坤舆图志] 处理旧格式地点${index + 1}时出错:`, featureError);
        }
      });
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
    
    // 检查势力和地点数据
    if (chatVars['world_factions']) {
      console.log('[调试] ===== 找到势力数据 =====');
      console.log('[调试] world_factions:', chatVars['world_factions']);
    }
    
    if (chatVars['world_locations']) {
      console.log('[调试] ===== 找到地点数据 ====='); 
      console.log('[调试] world_locations:', chatVars['world_locations']);
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
          console.log(`[调试] "${key}.world":`, value.world);
        }
        if (valueKeys.includes('mapData')) {
          console.log(`[调试] "${key}.mapData":`, value.mapData);
        }
      }
    });
    
    // 尝试重新加载数据
    await loadCultivationWorldFromTavern(chatVars);
    
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
  text-shadow: 1px 1px 3px rgba(255, 255, 255, 0.9);
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
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8);
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
  text-shadow: 1px 1px 3px rgba(255, 255, 255, 0.9);
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
}

.map-panel:fullscreen .custom-map-container {
  border: none;
  border-radius: 0;
}

.map-panel:fullscreen .map-legend {
  background: rgba(0, 0, 0, 0.8);
  color: white;
}

.map-panel:fullscreen .selected-info {
  background: rgba(0, 0, 0, 0.9) !important;
  color: white !important;
  pointer-events: auto !important;
  z-index: 9999 !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
}

.map-panel:fullscreen .selected-info-overlay {
  z-index: 9999 !important;
  pointer-events: none !important;
  position: fixed !important;
}

.map-panel:fullscreen .selected-info-overlay .selected-info {
  pointer-events: auto !important;
}

.map-panel:fullscreen .close-info {
  color: white !important;
}

.map-panel:fullscreen .close-info:hover {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #ff6b6b !important;
}
</style>