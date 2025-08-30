<template>
  <div class="map-panel">
    <!-- 地图控制按钮 -->
    <div class="map-controls">
      <button class="control-btn" @click="refreshMapData" :disabled="loading" title="重新生成世界">
        <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
      </button>
      <button class="control-btn" @click="centerToPlayer" title="定位到玩家位置">
        <Target :size="16" />
      </button>
      <div class="map-status-mini">{{ mapStatus }}</div>
    </div>

    <!-- 自定义修仙世界地图容器 -->
    <div class="custom-map-container" ref="mapContainer">
      <!-- SVG 地图画布 -->
      <svg 
        class="world-map-svg" 
        :viewBox="`0 0 ${mapWidth} ${mapHeight}`"
        @wheel="handleZoom"
        @mousedown="startPan"
        @mousemove="handlePan"
        @mouseup="endPan"
        @mouseleave="endPan"
      >
        <!-- 地图背景网格 -->
        <defs>
          <pattern id="gridPattern" patternUnits="userSpaceOnUse" width="50" height="50">
            <rect width="50" height="50" fill="none" stroke="#E5E7EB" stroke-width="0.5" opacity="0.3"/>
          </pattern>
          
          <!-- 地形纹理 -->
          <pattern id="mountainPattern" patternUnits="userSpaceOnUse" width="20" height="20">
            <rect width="20" height="20" fill="#F3F4F6"/>
            <path d="M0 15 L5 8 L10 12 L15 5 L20 10 L20 20 L0 20 Z" fill="#E5E7EB"/>
          </pattern>
          
          <pattern id="waterPattern" patternUnits="userSpaceOnUse" width="30" height="30">
            <rect width="30" height="30" fill="#DBEAFE"/>
            <path d="M0 15 Q7.5 10 15 15 T30 15" stroke="#3B82F6" stroke-width="1" fill="none" opacity="0.4"/>
          </pattern>
          
          <!-- 势力光辉效果 -->
          <filter id="factionGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- 世界背景 -->
        <rect width="100%" height="100%" fill="url(#gridPattern)" opacity="0.1"/>
        
        <!-- 世界边界 -->
        <rect 
          x="50" y="50" 
          :width="mapWidth - 100" 
          :height="mapHeight - 100" 
          fill="none" 
          stroke="#6B7280" 
          stroke-width="3" 
          stroke-dasharray="10,5"
          opacity="0.6"
        />
        
        <!-- 地图内容组 -->
        <g :transform="`translate(${panX}, ${panY}) scale(${zoomLevel})`">
          
          <!-- 地形背景层 -->
          <g class="terrain-background">
            <!-- 山脉区域 -->
            <ellipse 
              cx="300" cy="200" rx="120" ry="80" 
              fill="url(#mountainPattern)" 
              opacity="0.3"
              transform="rotate(-15 300 200)"
            />
            <ellipse 
              cx="800" cy="300" rx="100" ry="60" 
              fill="url(#mountainPattern)" 
              opacity="0.3"
              transform="rotate(25 800 300)"
            />
            
            <!-- 水域 -->
            <ellipse 
              cx="600" cy="600" rx="150" ry="100" 
              fill="url(#waterPattern)" 
              opacity="0.4"
            />
          </g>
          
          <!-- 势力影响范围层 -->
          <g class="faction-influence-layer">
            <g v-for="territory in factionTerritories" :key="'influence-' + territory.id">
              <!-- 势力影响圈 -->
              <circle 
                :cx="territory.centerX" 
                :cy="territory.centerY" 
                :r="territory.influenceRadius || 80"
                :fill="territory.color" 
                opacity="0.1"
                :stroke="territory.borderColor"
                stroke-width="1"
                stroke-dasharray="3,3"
                class="influence-circle"
              />
            </g>
          </g>
          
          <!-- 势力领土边界层 -->
          <g class="territory-boundary-layer">
            <g v-for="territory in factionTerritories" :key="'territory-' + territory.id">
              <path 
                :d="territory.boundary" 
                :fill="territory.color" 
                :stroke="territory.borderColor" 
                stroke-width="2" 
                fill-opacity="0.15" 
                class="territory-boundary"
                filter="url(#factionGlow)"
                @click="selectTerritory(territory)"
                @mouseenter="hoveredTerritory = territory"
                @mouseleave="hoveredTerritory = null"
              />
              
              <!-- 势力核心标记 -->
              <g :transform="`translate(${territory.centerX}, ${territory.centerY})`">
                <!-- 势力标志背景 -->
                <circle 
                  r="25" 
                  :fill="territory.color" 
                  :stroke="territory.borderColor" 
                  stroke-width="2"
                  opacity="0.9"
                />
                <!-- 势力标志文字 -->
                <text 
                  class="faction-emblem-text"
                  text-anchor="middle" 
                  dy="6"
                  :fill="territory.textColor"
                >
                  {{ territory.emblem }}
                </text>
              </g>
              
              <!-- 势力名称 -->
              <text 
                :x="territory.centerX" 
                :y="territory.centerY - 40" 
                class="faction-name-text"
                text-anchor="middle"
                :fill="territory.textColor"
              >
                {{ territory.name }}
              </text>
            </g>
          </g>
          
          <!-- 地点标记层 -->
          <g class="location-markers-layer">
            <g v-for="location in worldLocations" :key="'location-' + location.id">
              <g 
                :transform="`translate(${location.x}, ${location.y})`"
                @click="selectLocation(location)"
                @mouseenter="hoveredLocation = location"
                @mouseleave="hoveredLocation = null"
                class="location-marker"
              >
                <!-- 地点类型图标 -->
                <g v-if="location.type === 'major_city'">
                  <rect x="-8" y="-8" width="16" height="16" :fill="location.color" rx="2"/>
                  <rect x="-6" y="-6" width="5" height="5" fill="white" opacity="0.8"/>
                  <rect x="1" y="-6" width="5" height="5" fill="white" opacity="0.8"/>
                  <rect x="-6" y="1" width="5" height="5" fill="white" opacity="0.8"/>
                  <rect x="1" y="1" width="5" height="5" fill="white" opacity="0.8"/>
                </g>
                
                <g v-else-if="location.type === 'sect_headquarters'">
                  <polygon points="0,-12 -8,8 8,8" :fill="location.color" stroke="#FFD700" stroke-width="1"/>
                  <circle r="3" fill="#FFD700"/>
                </g>
                
                <g v-else-if="location.type === 'trade_center'">
                  <rect x="-6" y="-6" width="12" height="12" :fill="location.color" rx="1"/>
                  <text class="location-icon-text" text-anchor="middle" dy="3" fill="white">市</text>
                </g>
                
                <g v-else-if="location.type === 'secret_realm'">
                  <circle r="8" fill="#8B5CF6" opacity="0.8"/>
                  <path d="M-4,-4 L0,4 L4,-4 Z" fill="#A855F7"/>
                  <circle r="2" fill="white"/>
                </g>
                
                <g v-else>
                  <circle r="4" :fill="location.color" stroke="white" stroke-width="1"/>
                </g>
                
                <!-- 地点名称标签 -->
                <text 
                  class="location-name-label"
                  text-anchor="middle"
                  y="20"
                  :fill="location.color"
                >
                  {{ location.name }}
                </text>
              </g>
            </g>
          </g>
          
          <!-- 玩家位置层 -->
          <g v-if="playerPosition" class="player-position-layer">
            <g :transform="`translate(${playerPosition.x}, ${playerPosition.y})`">
              <!-- 玩家光环动画 -->
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
        
        <!-- 悬停信息层 -->
        <g v-if="hoveredLocation || hoveredTerritory" class="hover-info-layer">
          <g v-if="hoveredLocation" :transform="`translate(${Math.min(hoveredLocation.x * zoomLevel + panX + 40, mapWidth - 220)}, ${Math.max(hoveredLocation.y * zoomLevel + panY - 60, 10)})`">
            <rect width="200" height="80" fill="rgba(0,0,0,0.85)" stroke="#FFD700" stroke-width="1" rx="5"/>
            <text x="10" y="18" class="hover-info-title" fill="#FFD700">{{ hoveredLocation.name }}</text>
            <text x="10" y="35" class="hover-info-text" fill="#FFF">{{ hoveredLocation.description?.substring(0, 40) }}...</text>
            <text x="10" y="50" class="hover-info-text" fill="#AAA">类型：{{ getLocationTypeName(hoveredLocation.type) }}</text>
            <text x="10" y="65" class="hover-info-text" fill="#AAA">势力：{{ hoveredLocation.faction || '中立' }}</text>
          </g>
          
          <g v-if="hoveredTerritory" :transform="`translate(${Math.min(hoveredTerritory.centerX * zoomLevel + panX + 40, mapWidth - 220)}, ${Math.max(hoveredTerritory.centerY * zoomLevel + panY - 60, 10)})`">
            <rect width="200" height="80" fill="rgba(0,0,0,0.85)" stroke="#FFD700" stroke-width="1" rx="5"/>
            <text x="10" y="18" class="hover-info-title" fill="#FFD700">{{ hoveredTerritory.name }}</text>
            <text x="10" y="35" class="hover-info-text" fill="#FFF">{{ hoveredTerritory.description?.substring(0, 40) }}...</text>
            <text x="10" y="50" class="hover-info-text" fill="#AAA">实力：{{ hoveredTerritory.strength || 'Unknown' }}</text>
            <text x="10" y="65" class="hover-info-text" fill="#AAA">范围：{{ hoveredTerritory.territory || 'Unknown' }}</text>
          </g>
        </g>
      </svg>
    </div>
    
    <!-- 地图图例 -->
    <div class="map-legend">
      <div class="legend-title">坤舆图志</div>
      <div class="legend-sections">
        <div class="legend-section">
          <h4>势力范围</h4>
          <div class="legend-items">
            <div v-for="faction in majorFactions" :key="faction.id" class="legend-item">
              <div class="legend-icon" :style="{ backgroundColor: faction.color }"></div>
              <span>{{ faction.name }}</span>
            </div>
          </div>
        </div>
        <div class="legend-section">
          <h4>地点类型</h4>
          <div class="legend-items">
            <div class="legend-item">
              <div class="legend-icon sect-icon">🏛️</div>
              <span>宗门</span>
            </div>
            <div class="legend-item">
              <div class="legend-icon city-icon">🏘️</div>
              <span>城市</span>
            </div>
            <div class="legend-item">
              <div class="legend-icon secret-icon">✨</div>
              <span>秘境</span>
            </div>
            <div class="legend-item">
              <div class="legend-icon player-icon">🧙‍♂️</div>
              <span>当前位置</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { RefreshCw, Target } from 'lucide-vue-next';
import { useCharacterStore } from '@/stores/characterStore';
import { getTavernHelper } from '@/utils/tavern';
import { toast } from '@/utils/toast';
import type { Vector2 } from '@/types/game';
import { CultivationWorldGenerator } from '@/utils/worldGeneration/cultivationWorldGenerator';
import { WorldGenerationConfig } from '@/utils/worldGeneration/gameWorldConfig';

// 地图尺寸配置
const mapWidth = ref(1200);
const mapHeight = ref(800);

// 地图交互状态
const zoomLevel = ref(1);
const panX = ref(0);
const panY = ref(0);
const isPanning = ref(false);
const lastPanPoint = ref({ x: 0, y: 0 });
const hoveredLocation = ref<WorldLocation | null>(null);

// 组件状态
const characterStore = useCharacterStore();
const mapContainer = ref<HTMLElement | null>(null);
const loading = ref(false);
const mapStatus = ref('正在加载地图...');

// 势力接口定义
interface Faction {
  id: string;
  name: string;
  color: string;
  borderColor: string;
  textColor: string;
  emblem: string;
  description: string;
  strength: number;
  territory: string;
}

// 地点接口定义
interface WorldLocation {
  id: string;
  name: string;
  type: 'city' | 'sect' | 'secret_realm' | 'village' | 'market';
  x: number;
  y: number;
  size: number;
  color: string;
  faction?: string;
  description: string;
  population?: string;
  specialFeatures?: string[];
}

// 势力范围接口
interface TerritoryData {
  id: string;
  factionId: string;
  name: string;
  boundary: string; // SVG path
  centerX: number;
  centerY: number;
  color: string;
  borderColor: string;
  textColor: string;
  emblem: string;
}

// 地形接口
interface TerrainFeature {
  id: string;
  name: string;
  path: string; // SVG path
  labelX: number;
  labelY: number;
}

interface TerrainData {
  mountains: TerrainFeature[];
  forests: TerrainFeature[];
  waters: TerrainFeature[];
}

// 贸易路线接口
interface TradeRoute {
  id: string;
  name: string;
  path: string; // SVG path
  from: string;
  to: string;
}

// 主要势力数据 - 从酒馆变量获取
const majorFactions = ref<Faction[]>([]);
const isGeneratingFactions = ref(false);

// 世界地点数据
const worldLocations = ref<WorldLocation[]>([
  // 青云宗势力范围
  { id: 'qy_main', name: '青云主峰', type: 'sect', x: 300, y: 200, size: 8, color: '#2563EB', faction: 'qingyun', description: '青云宗山门，剑气冲霄', population: '弟子三万' },
  { id: 'qy_city1', name: '青云城', type: 'city', x: 280, y: 240, size: 6, color: '#3B82F6', faction: 'qingyun', description: '青云宗山脚繁华城市', population: '十万人' },
  { id: 'qy_market', name: '天剑坊', type: 'market', x: 320, y: 220, size: 4, color: '#60A5FA', faction: 'qingyun', description: '专门打造法剑的市集' },
  
  // 天魔宗势力范围
  { id: 'tm_main', name: '血魔殿', type: 'sect', x: 350, y: 600, size: 8, color: '#DC2626', faction: 'tianmo', description: '天魔宗总坛，魔气森森', population: '魔徒两万' },
  { id: 'tm_city1', name: '魔渊城', type: 'city', x: 320, y: 580, size: 6, color: '#EF4444', faction: 'tianmo', description: '魔道修士聚集地', population: '八万人' },
  { id: 'tm_secret1', name: '万魔窟', type: 'secret_realm', x: 380, y: 620, size: 5, color: '#F87171', faction: 'tianmo', description: '古魔传承之地，危险重重' },
  
  // 无极剑宗势力范围
  { id: 'wj_main', name: '剑谷', type: 'sect', x: 150, y: 400, size: 8, color: '#7C3AED', faction: 'wuji', description: '万剑朝宗，剑意冲天', population: '剑修一万五千' },
  { id: 'wj_city1', name: '剑心城', type: 'city', x: 180, y: 420, size: 6, color: '#8B5CF6', faction: 'wuji', description: '剑修云集的城市', population: '六万人' },
  { id: 'wj_secret1', name: '剑冢', type: 'secret_realm', x: 120, y: 380, size: 5, color: '#A855F7', faction: 'wuji', description: '历代剑修埋剑之地，剑意不灭' },
  
  // 玄天道宗势力范围
  { id: 'xt_main', name: '玄天观', type: 'sect', x: 600, y: 150, size: 8, color: '#059669', faction: 'xuantian', description: '道法自然，玄机无穷', population: '道士八千' },
  { id: 'xt_city1', name: '天机城', type: 'city', x: 580, y: 180, size: 6, color: '#10B981', faction: 'xuantian', description: '精通占卜推演的城市', population: '五万人' },
  
  // 万法塔势力范围
  { id: 'wf_main', name: '万法塔', type: 'sect', x: 500, y: 400, size: 8, color: '#D97706', faction: 'wanfa', description: '法术研究圣地，藏书万卷', population: '法师五千' },
  { id: 'wf_city1', name: '学府城', type: 'city', x: 480, y: 430, size: 6, color: '#F59E0B', faction: 'wanfa', description: '学者和法师聚集地', population: '七万人' },
  
  // 碧霄宫势力范围
  { id: 'bx_main', name: '碧霄宫', type: 'sect', x: 450, y: 650, size: 8, color: '#EC4899', faction: 'bixiao', description: '仙子云集，美若天仙', population: '女修三千' },
  { id: 'bx_city1', name: '花都', type: 'city', x: 420, y: 680, size: 6, color: '#F472B6', faction: 'bixiao', description: '花海中的美丽城市', population: '四万人' },
  
  // 中立地区
  { id: 'neutral1', name: '天下第一楼', type: 'market', x: 400, y: 350, size: 5, color: '#6B7280', description: '中立贸易集市，各派云集', population: '流动人口三万' },
  { id: 'neutral2', name: '散修联盟', type: 'city', x: 250, y: 350, size: 5, color: '#9CA3AF', description: '散修聚集地', population: '散修两万' },
  
  // 秘境
  { id: 'secret1', name: '上古遗迹', type: 'secret_realm', x: 350, y: 300, size: 4, color: '#8B5CF6', description: '上古修士留下的神秘遗迹' },
  { id: 'secret2', name: '龙骨山', type: 'secret_realm', x: 550, y: 500, size: 4, color: '#8B5CF6', description: '传说中的真龙陨落之地' },
  { id: 'secret3', name: '幽冥谷', type: 'secret_realm', x: 200, y: 600, size: 4, color: '#8B5CF6', description: '鬼修出没的危险之地' }
]);

// 势力范围数据
const factionTerritories = computed<TerritoryData[]>(() => [
  {
    id: 'territory_qingyun',
    factionId: 'qingyun',
    name: '青云宗',
    boundary: 'M200,100 Q350,120 400,200 Q380,280 320,300 Q250,290 200,250 Q180,180 200,100 Z',
    centerX: 290,
    centerY: 200,
    color: '#2563EB',
    borderColor: '#1D4ED8',
    textColor: '#FFFFFF',
    emblem: '青'
  },
  {
    id: 'territory_tianmo',
    factionId: 'tianmo',
    name: '天魔宗',
    boundary: 'M280,520 Q400,540 420,620 Q400,700 350,720 Q280,700 260,650 Q270,580 280,520 Z',
    centerX: 340,
    centerY: 620,
    color: '#DC2626',
    borderColor: '#B91C1C',
    textColor: '#FFFFFF',
    emblem: '魔'
  },
  {
    id: 'territory_wuji',
    factionId: 'wuji',
    name: '无极剑宗',
    boundary: 'M80,320 Q180,340 220,400 Q200,480 150,500 Q100,480 80,420 Q70,370 80,320 Z',
    centerX: 150,
    centerY: 410,
    color: '#7C3AED',
    borderColor: '#6D28D9',
    textColor: '#FFFFFF',
    emblem: '剑'
  },
  {
    id: 'territory_xuantian',
    factionId: 'xuantian',
    name: '玄天道宗',
    boundary: 'M520,80 Q650,100 680,180 Q660,240 600,260 Q540,240 520,200 Q510,140 520,80 Z',
    centerX: 600,
    centerY: 170,
    color: '#059669',
    borderColor: '#047857',
    textColor: '#FFFFFF',
    emblem: '道'
  },
  {
    id: 'territory_wanfa',
    factionId: 'wanfa',
    name: '万法塔',
    boundary: 'M420,320 Q550,340 570,420 Q550,480 500,500 Q450,480 430,440 Q415,380 420,320 Z',
    centerX: 495,
    centerY: 410,
    color: '#D97706',
    borderColor: '#B45309',
    textColor: '#FFFFFF',
    emblem: '塔'
  },
  {
    id: 'territory_bixiao',
    factionId: 'bixiao',
    name: '碧霄宫',
    boundary: 'M380,620 Q480,640 500,700 Q480,760 430,780 Q380,760 360,720 Q370,670 380,620 Z',
    centerX: 440,
    centerY: 700,
    color: '#EC4899',
    borderColor: '#DB2777',
    textColor: '#FFFFFF',
    emblem: '宫'
  }
]);

// 地形数据
const terrainData = ref<TerrainData>({
  mountains: [
    { id: 'mountain1', name: '青云山脉', path: 'M150,80 Q300,60 450,120 Q420,160 380,140 Q320,120 280,140 Q220,160 180,120 Z', labelX: 300, labelY: 100 },
    { id: 'mountain2', name: '剑谷群峰', path: 'M50,300 Q150,280 250,340 Q220,380 180,360 Q120,340 100,360 Q80,380 60,340 Z', labelX: 150, labelY: 320 },
    { id: 'mountain3', name: '北荒雪山', path: 'M550,50 Q700,30 750,100 Q720,140 680,120 Q620,100 580,120 Q560,140 550,100 Z', labelX: 650, labelY: 70 }
  ],
  forests: [
    { id: 'forest1', name: '迷雾森林', path: 'M100,450 Q200,430 300,490 Q280,530 240,510 Q180,490 140,510 Q110,530 100,490 Z', labelX: 200, labelY: 470 },
    { id: 'forest2', name: '花海林', path: 'M350,650 Q450,630 550,690 Q530,730 490,710 Q430,690 390,710 Q360,730 350,690 Z', labelX: 450, labelY: 670 }
  ],
  waters: [
    { id: 'water1', name: '天池', path: 'M400,250 Q480,240 520,280 Q500,320 460,310 Q420,300 400,310 Q390,320 390,280 Z', labelX: 450, labelY: 280 },
    { id: 'water2', name: '流云河', path: 'M0,400 Q200,380 400,420 Q600,440 800,460', labelX: 400, labelY: 430 }
  ]
});

// 贸易路线数据
const tradeRoutes = ref<TradeRoute[]>([
  { id: 'route1', name: '青云-天下第一楼', path: 'M290,200 Q340,250 400,350', from: 'qingyun', to: 'neutral1' },
  { id: 'route2', name: '天魔-天下第一楼', path: 'M340,620 Q370,500 400,350', from: 'tianmo', to: 'neutral1' },
  { id: 'route3', name: '剑宗-散修联盟', path: 'M150,410 Q200,380 250,350', from: 'wuji', to: 'neutral2' }
]);

// 玩家位置相关
const playerPosition = computed(() => {
  const activeSave = characterStore.activeSaveSlot;
  const position = activeSave?.存档数据?.玩家角色状态?.位置?.坐标;
  
  if (position) {
    // 将游戏坐标映射到地图坐标系
    const x = Math.max(50, Math.min(mapWidth.value - 50, position.X * 0.3 + 400));
    const y = Math.max(50, Math.min(mapHeight.value - 50, position.Y * 0.3 + 300));
    return { x, y };
  }
  
  return { x: 400, y: 350 }; // 默认位置（天下第一楼）
});

const playerName = computed(() => {
  return characterStore.activeSaveSlot?.角色基础信息?.名字 || '无名道友';
});

// 地图交互处理
const handleZoom = (event: WheelEvent) => {
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.1 : 0.1;
  zoomLevel.value = Math.max(0.5, Math.min(3, zoomLevel.value + delta));
};

const startPan = (event: MouseEvent) => {
  isPanning.value = true;
  lastPanPoint.value = { x: event.clientX, y: event.clientY };
};

const handlePan = (event: MouseEvent) => {
  if (!isPanning.value) return;
  
  const deltaX = event.clientX - lastPanPoint.value.x;
  const deltaY = event.clientY - lastPanPoint.value.y;
  
  panX.value += deltaX;
  panY.value += deltaY;
  
  lastPanPoint.value = { x: event.clientX, y: event.clientY };
};

const endPan = () => {
  isPanning.value = false;
};

const selectTerritory = (territory: TerritoryData) => {
  console.log('选中势力:', territory.name);
  toast.success(`选中势力: ${territory.name}`);
};

const selectLocation = (location: WorldLocation) => {
  console.log('选中地点:', location.name);
  toast.success(`选中地点: ${location.name}`);
};

// 初始化地图
const initializeMap = async () => {
  try {
    mapStatus.value = '正在生成世界势力...';
    await generateWorldFactions();
    mapStatus.value = '地图加载完成';
    toast.success('坤舆图志已就绪');
  } catch (error) {
    console.error('[坤舆图志] 地图初始化失败:', error);
    mapStatus.value = '地图加载失败';
    toast.error('地图初始化失败');
  }
};

// 生成世界势力
const generateWorldFactions = async () => {
  if (isGeneratingFactions.value) return;
  
  isGeneratingFactions.value = true;
  
  try {
    const tavern = getTavernHelper();
    if (!tavern) {
      throw new Error('酒馆系统不可用');
    }

    // 检查是否已有世界势力数据
    const variables = await tavern.getVariables({ type: 'chat' });
    const existingFactions = variables['world_factions'];
    if (existingFactions && existingFactions.length > 0) {
      console.log('[坤舆图志] 发现现有势力数据，直接加载');
      loadFactionsFromTavern(existingFactions);
      return;
    }

    // 获取角色信息
    const activeCharacter = characterStore.activeCharacterProfile.value;
    const characterBackground = activeCharacter?.角色基础信息?.出身;
    
    console.log('[坤舆图志] 开始生成真实修仙世界...');
    
    // 创建世界生成配置（使用经典修仙预设）
    const worldConfig = new WorldGenerationConfig('classic_cultivation');
    
    // 根据角色出身调整世界设置
    if (characterBackground) {
      worldConfig.adjustForCharacterBackground(characterBackground);
    }
    
    // 创建世界生成器
    const worldGenerator = new CultivationWorldGenerator(
      worldConfig.getSettings(), 
      characterBackground
    );
    
    // 生成世界
    await worldGenerator.generateWorld();
    
    // 等待数据保存完成后重新加载
    setTimeout(async () => {
      const newVariables = await tavern.getVariables({ type: 'chat' });
      const newFactions = newVariables['world_factions'];
      
      if (newFactions && newFactions.length > 0) {
        loadFactionsFromTavern(newFactions);
        await loadWorldLocations(); // 同时加载世界地点
        toast.success(`成功生成 ${newFactions.length} 个修仙势力的真实世界`);
      } else {
        await loadDefaultFactions();
        toast.warning('使用默认势力数据');
      }
    }, 2000); // 增加等待时间，确保AI完成数据保存
    
  } catch (error) {
    console.error('[坤舆图志] 势力生成失败:', error);
    await loadDefaultFactions();
    toast.warning('使用默认势力数据');
  } finally {
    isGeneratingFactions.value = false;
  }
};

// 加载世界地点数据
const loadWorldLocations = async () => {
  try {
    const tavern = getTavernHelper();
    if (!tavern) return;
    
    const variables = await tavern.getVariables({ type: 'chat' });
    const locations = variables['world_locations'];
    
    if (locations && Array.isArray(locations)) {
      // 将AI生成的地点数据映射到地图显示格式
      worldLocations.value = locations.map(location => ({
        id: location.id || `loc_${Date.now()}`,
        name: location.name || '未知地点',
        type: location.type || 'city',
        x: location.coordinates?.x || Math.random() * 800 + 200,
        y: location.coordinates?.y || Math.random() * 600 + 100,
        size: location.importance || 5,
        color: getLocationColor(location.type),
        faction: location.controlledBy,
        description: location.description || '神秘的地点',
        population: location.population,
        specialFeatures: location.features
      }));
      
      console.log(`[坤舆图志] 加载了 ${worldLocations.value.length} 个世界地点`);
    }
  } catch (error) {
    console.error('[坤舆图志] 加载世界地点失败:', error);
  }
};

// 根据地点类型获取颜色
const getLocationColor = (type: string): string => {
  const colorMap: { [key: string]: string } = {
    'major_city': '#DC2626',
    'sect_headquarters': '#7C3AED', 
    'trade_center': '#059669',
    'secret_realm': '#EC4899',
    'city': '#DC2626',
    'sect': '#7C3AED',
    'market': '#059669',
    'village': '#6B7280'
  };
  
  return colorMap[type] || '#6B7280';
};

// 从酒馆变量加载势力数据
const loadFactionsFromTavern = (factionsData: any[]) => {
  try {
    majorFactions.value = factionsData.map(faction => ({
      id: faction.id || `faction_${Date.now()}`,
      name: faction.name || '未知势力',
      color: faction.color || '#6B7280',
      borderColor: faction.borderColor || '#4B5563', 
      textColor: faction.textColor || '#FFFFFF',
      emblem: faction.emblem || '势',
      description: faction.description || '神秘的修炼势力',
      strength: faction.strength || 50,
      territory: faction.territory || '未知区域'
    }));
    
    console.log(`[坤舆图志] 从酒馆变量加载了 ${majorFactions.value.length} 个势力`);
    updateFactionTerritories();
  } catch (error) {
    console.error('[坤舆图志] 加载酒馆势力数据失败:', error);
    loadDefaultFactions();
  }
};

// 加载默认势力数据
const loadDefaultFactions = async () => {
  majorFactions.value = [
    {
      id: 'qingyun',
      name: '青云宗',
      color: '#2563EB',
      borderColor: '#1D4ED8',
      textColor: '#FFFFFF',
      emblem: '青',
      description: '东荒第一大宗，剑修圣地',
      strength: 95,
      territory: '东荒北部'
    },
    {
      id: 'tianmo',
      name: '天魔宗',
      color: '#DC2626',
      borderColor: '#B91C1C',
      textColor: '#FFFFFF',
      emblem: '魔',
      description: '魔道圣地，与青云宗世代为敌',
      strength: 90,
      territory: '东荒南部'
    },
    {
      id: 'wuji',
      name: '无极剑宗',
      color: '#7C3AED',
      borderColor: '#6D28D9',
      textColor: '#FFFFFF',
      emblem: '剑',
      description: '剑道至尊，万剑朝宗',
      strength: 88,
      territory: '西荒剑谷'
    }
  ];
  
  updateFactionTerritories();
};

// 更新势力范围数据
const updateFactionTerritories = () => {
  // 这里可以根据AI生成的势力数据动态创建势力范围
  // 暂时保持现有的静态数据结构
};

// 刷新地图数据
const refreshMapData = async () => {
  loading.value = true;
  mapStatus.value = '正在重新生成世界...';
  
  try {
    // 重新生成世界势力
    await generateWorldFactions();
    toast.success('世界势力已重新生成');
    mapStatus.value = '地图数据最新';
  } catch (error) {
    console.error('[坤舆图志] 刷新失败:', error);
    toast.error('刷新地图失败');
    mapStatus.value = '刷新失败';
  } finally {
    loading.value = false;
  }
};

// 定位到玩家
const centerToPlayer = () => {
  if (!playerPosition.value) return;
  
  // 将玩家位置居中显示
  panX.value = (mapWidth.value / 2) - playerPosition.value.x * zoomLevel.value;
  panY.value = (mapHeight.value / 2) - playerPosition.value.y * zoomLevel.value;
  zoomLevel.value = 1.5;
  
  toast.success('已定位到当前位置');
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

/* 头部控制 */
.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  font-size: 1.5rem;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.panel-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e40af;
}

.map-status {
  font-size: 0.875rem;
  color: #64748b;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: white;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.action-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 地图容器 */
.custom-map-container {
  flex: 1;
  width: 100%;
  position: relative;
  z-index: 1;
  background: radial-gradient(ellipse at center, #f8fafc 0%, #e2e8f0 100%);
  overflow: hidden;
  border-radius: 0.5rem;
}

.world-map-svg {
  width: 100%;
  height: 100%;
  cursor: grab;
  border-radius: 0.5rem;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #f8fafc 100%);
}

.world-map-svg:active {
  cursor: grabbing;
}

/* 地图图例 */
.map-legend {
  position: absolute;
  top: 80px;
  right: 10px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-radius: 0.75rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 1.25rem;
  z-index: 1000;
  max-width: 220px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.legend-title {
  font-weight: 700;
  color: #1e40af;
  margin-bottom: 1rem;
  font-size: 1rem;
  text-align: center;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 0.5rem;
}

.legend-section {
  margin-bottom: 1rem;
}

.legend-section h4 {
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: #6b7280;
  padding: 0.25rem;
  border-radius: 0.375rem;
  transition: background-color 0.2s ease;
}

.legend-item:hover {
  background-color: rgba(59, 130, 246, 0.1);
}

.legend-icon {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

/* SVG地图元素样式 */
.terrain-layer {
  opacity: 0.8;
}

.terrain-label {
  font-size: 12px;
  font-weight: 600;
  text-anchor: middle;
  pointer-events: none;
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8);
}

.mountain-label {
  fill: #7c2d12;
}

.forest-label {
  fill: #14532d;
}

.water-label {
  fill: #1e3a8a;
}

.territory-boundary {
  transition: all 0.3s ease;
  cursor: pointer;
}

.territory-boundary:hover {
  fill-opacity: 0.4;
  stroke-width: 4;
  filter: drop-shadow(0 0 8px rgba(0, 0, 0, 0.3));
}

.territory-name {
  font-size: 16px;
  font-weight: 700;
  text-anchor: middle;
  pointer-events: none;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  font-family: '微软雅黑', sans-serif;
}

.faction-emblem {
  font-size: 12px;
  font-weight: 900;
  fill: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.location-name {
  font-size: 11px;
  font-weight: 600;
  pointer-events: none;
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.9);
  font-family: '微软雅黑', sans-serif;
}

.location-name.city {
  fill: #dc2626;
}

.location-name.sect {
  fill: #7c3aed;
}

.location-name.secret_realm {
  fill: #ec4899;
}

.market-emblem {
  font-size: 10px;
  font-weight: 900;
  pointer-events: none;
}

.location-name.market {
  fill: #059669;
}

.city-marker {
  transition: all 0.3s ease;
  cursor: pointer;
}

.city-marker:hover {
  r: 8;
  filter: drop-shadow(0 0 6px rgba(0, 0, 0, 0.4));
}

.player-aura {
  cursor: pointer;
}

.player-name {
  font-size: 12px;
  font-weight: 700;
  fill: #dc2626;
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.9);
  pointer-events: none;
}

.info-title {
  font-size: 12px;
  font-weight: 700;
}

.info-text {
  font-size: 10px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .map-legend {
    position: static;
    margin: 1rem;
    max-width: none;
  }
  
  .header-actions .btn-text {
    display: none;
  }
  
  .territory-name {
    font-size: 14px;
  }
  
  .location-name {
    font-size: 10px;
  }
}
</style>

<style>
/* 全局样式 - 自定义地图图标 */
.custom-icon-wrapper {
  background: none !important;
  border: none !important;
}

.custom-map-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  border: 2px solid #3388ff;
}

.icon-emoji {
  font-size: 16px;
  line-height: 1;
}

/* 自定义弹窗样式 */
.custom-popup .leaflet-popup-content {
  margin: 0;
  padding: 0;
}

.map-popup {
  padding: 1rem;
  min-width: 200px;
}

.popup-title {
  margin: 0 0 0.5rem 0;
  color: #1e40af;
  font-size: 1rem;
  font-weight: 600;
}

.popup-type {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #e0f2fe;
  color: #0369a1;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.popup-description {
  margin: 0.5rem 0 0 0;
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.5;
}

.player-popup {
  padding: 1rem;
  min-width: 200px;
}

.player-popup h4 {
  margin: 0 0 0.5rem 0;
  color: #dc2626;
  font-size: 1rem;
}

.player-popup p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
  color: #64748b;
}
</style>