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

      <!-- 地图控制按钮 -->
      <div class="map-controls">
        <button @click="centerToPlayer" title="定位到玩家位置" class="control-btn">
          <Target :size="16" />
        </button>
        <button @click="toggleFullscreen" title="全屏显示" class="control-btn">
          <Maximize2 :size="16" />
        </button>
        <button @click="reloadMap" title="重新加载地图" class="control-btn">
          <RefreshCw :size="16" />
        </button>
        <div class="map-status-mini">{{ mapStatus }}</div>
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
    <div class="map-legend">
      <div class="legend-title">{{ worldName }}图例</div>
      <div class="legend-items">
        <!-- 名山大川 - 山形图标 -->
        <div class="legend-item">
          <svg class="legend-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <polygon points="12,6 4,20 20,20" fill="#2D7D32" opacity="0.8"/>
          </svg>
          <span>名山大川</span>
        </div>
        <!-- 宗门势力 - 建筑图标 -->
        <div class="legend-item">
          <svg class="legend-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="6" width="12" height="12" fill="#1565C0" opacity="0.8"/>
            <rect x="10" y="12" width="4" height="6" fill="white" opacity="0.9"/>
          </svg>
          <span>宗门势力</span>
        </div>
        <!-- 城镇坊市 - 圆形图标 -->
        <div class="legend-item">
          <svg class="legend-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8" fill="#F57C00" opacity="0.8"/>
            <circle cx="12" cy="12" r="3" fill="white" opacity="0.9"/>
          </svg>
          <span>城镇坊市</span>
        </div>
        <!-- 洞天福地 - 星形图标 -->
        <div class="legend-item">
          <svg class="legend-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8" fill="#7B1FA2" opacity="0.7"/>
            <polygon points="12,5 13.5,9.5 18,10 14.5,13 15.5,17.5 12,15 8.5,17.5 9.5,13 6,10 10.5,9.5" fill="white" opacity="0.9"/>
          </svg>
          <span>洞天福地</span>
        </div>
        <!-- 奇珍异地 - 菱形图标 -->
        <div class="legend-item">
          <svg class="legend-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <polygon points="12,4 20,12 12,20 4,12" fill="#388E3C" opacity="0.8"/>
          </svg>
          <span>奇珍异地</span>
        </div>
        <!-- 凶险之地 - 警告图标 -->
        <div class="legend-item">
          <svg class="legend-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8" fill="#D32F2F" opacity="0.8"/>
            <line x1="12" y1="8" x2="12" y2="14" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="17" r="1.5" fill="white"/>
          </svg>
          <span>凶险之地</span>
        </div>
        <!-- 其他特殊 - 闪电图标 -->
        <div class="legend-item">
          <svg class="legend-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <polygon points="13,4 8,14 12,14 11,20 16,10 12,10" fill="#6B7280" opacity="0.8"/>
          </svg>
          <span>其他特殊</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { Target, Maximize2, RefreshCw } from 'lucide-vue-next';
import { GameMapManager } from '@/utils/gameMapManager';
import { normalizeLocationsData, normalizeContinentBounds } from '@/utils/coordinateConverter';
import { useGameStateStore } from '@/stores/gameStateStore';
import { toast } from '@/utils/toast';
import { getFullscreenElement, requestFullscreen, exitFullscreen, explainFullscreenError } from '@/utils/fullscreen';
import type { WorldLocation } from '@/types/location';
import type { GameCoordinates } from '@/types/gameMap';

const gameStateStore = useGameStateStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const mapContainerRef = ref<HTMLDivElement | null>(null);
const mapManager = ref<GameMapManager | null>(null);
const selectedLocation = ref<WorldLocation | null>(null);
const selectedContinent = ref<any | null>(null);
const mapStatus = ref('初始化中...');
const popupPosition = ref({ x: 0, y: 0 });

const worldName = computed(() => gameStateStore.worldInfo?.世界名称 || '修仙界');
const worldBackground = computed(() => gameStateStore.worldInfo?.世界背景 || '');

// 地点类型中文名称映射
const locationTypeNames: Record<string, string> = {
  natural_landmark: '名山大川',
  sect_power: '宗门势力',
  city_town: '城镇坊市',
  blessed_land: '洞天福地',
  treasure_land: '奇珍异地',
  dangerous_area: '凶险之地',
  special_other: '其他特殊',
};

const getLocationTypeName = (type: string): string => {
  return locationTypeNames[type] || '未知类型';
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

  // 水平方向调整
  if (left + popupWidth / 2 > containerRect.width - padding) {
    left = containerRect.width - popupWidth / 2 - padding;
  }
  if (left - popupWidth / 2 < padding) {
    left = popupWidth / 2 + padding;
  }

  // 垂直方向调整（弹窗在点击位置上方）
  if (top - popupHeight < padding) {
    // 如果上方空间不足，显示在下方
    top = top + 60;
  } else {
    top = top - 20;
  }

  return {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    transform: 'translate(-50%, -100%)',
    zIndex: '2000',
  };
});

onMounted(async () => {
  if (canvasRef.value && mapContainerRef.value) {
    try {
      mapStatus.value = '正在初始化地图...';

      // 等待下一帧，确保 DOM 完全渲染
      await new Promise(resolve => requestAnimationFrame(resolve));

      // 获取容器尺寸并设置 canvas 尺寸
      const rect = mapContainerRef.value.getBoundingClientRect();
      const canvas = canvasRef.value;
      canvas.width = rect.width;
      canvas.height = rect.height;

      console.log('[地图] Canvas 尺寸:', { width: rect.width, height: rect.height });

      // 初始化地图管理器
      mapManager.value = new GameMapManager(canvas, {
        width: 10000,
        height: 10000,
        tileSize: 100,
        minZoom: 0.1,
        maxZoom: 4,
      });

      // 监听地图事件
      mapManager.value.on('locationClick', (data: unknown) => {
        handleLocationClick(data);
      });

      mapManager.value.on('continentClick', (data: unknown) => {
        handleContinentClick(data);
      });

      // 加载地图数据
      await loadMapData();

      // 监听窗口大小变化
      window.addEventListener('resize', handleResize);

      // 监听全屏变化
      document.addEventListener('fullscreenchange', handleFullscreenChange);

      mapStatus.value = '地图加载完成';
    } catch (error) {
      console.error('[地图] 初始化失败:', error);
      mapStatus.value = '地图加载失败';
      toast.error('地图初始化失败: ' + (error as Error).message);
    }
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  mapManager.value?.destroy();
});

// 监听玩家位置变化
watch(
  () => gameStateStore.playerStatus?.位置,
  (newPos) => {
    if (newPos && mapManager.value) {
      const playerName = gameStateStore.character?.名字 || '道友';
      mapManager.value.updatePlayerPosition(newPos as GameCoordinates, playerName);
    }
  },
  { deep: true }
);

/**
 * 加载地图数据
 */
const loadMapData = async () => {
  try {
    mapStatus.value = '正在加载世界数据...';

    const worldInfo = gameStateStore.worldInfo;
    if (!worldInfo) {
      toast.warning('未找到世界数据');
      mapStatus.value = '未找到世界数据';
      return;
    }

    let locationCount = 0;

    // 加载大陆
    if (worldInfo.大陆信息 && Array.isArray(worldInfo.大陆信息)) {
      worldInfo.大陆信息.forEach((continent: any) => {
        try {
          // 标准化大陆边界坐标
          if (continent.大洲边界 || continent.continent_bounds) {
            const bounds = continent.大洲边界 || continent.continent_bounds;
            continent.continent_bounds = normalizeContinentBounds(bounds);
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
      const factions = normalizeLocationsData(worldInfo.势力信息);
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
      const locations = normalizeLocationsData(worldInfo.地点信息);
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
    const playerPos = gameStateStore.playerStatus?.位置;
    if (playerPos) {
      const playerName = gameStateStore.character?.名字 || '道友';
      mapManager.value?.updatePlayerPosition(playerPos as GameCoordinates, playerName);
      console.log('[地图] 已更新玩家位置');
    }

    mapStatus.value = `已加载 ${locationCount} 个地点`;
    toast.success('地图加载完成');
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
 * 定位到玩家
 */
const centerToPlayer = () => {
  const playerPos = gameStateStore.playerStatus?.位置;
  console.log('[地图] 玩家位置数据:', playerPos);

  if (!playerPos) {
    toast.warning('无法定位玩家位置：位置数据为空');
    return;
  }

  // 检查坐标是否有效
  const x = Number(playerPos.x);
  const y = Number(playerPos.y);

  if (isNaN(x) || isNaN(y)) {
    console.error('[地图] 玩家坐标无效:', { x: playerPos.x, y: playerPos.y });
    toast.warning('无法定位玩家位置：坐标数据无效');
    return;
  }

  console.log('[地图] 定位到玩家:', { x, y });
  mapManager.value?.centerTo(x, y, true);
  mapManager.value?.setZoom(1.5, true);
  toast.success('已定位到当前位置');
};

/**
 * 切换全屏
 */
const toggleFullscreen = () => {
  if (mapContainerRef.value) {
    if (getFullscreenElement()) {
      exitFullscreen().catch((err) => {
        console.error('[地图] 无法退出全屏模式:', err);
        toast.error(explainFullscreenError(err));
      });
    } else {
      requestFullscreen(mapContainerRef.value as any).catch((err) => {
        console.error('[地图] 无法进入全屏模式:', err);
        toast.error(explainFullscreenError(err));
      });
    }
  }
};

/**
 * 处理全屏变化
 */
const handleFullscreenChange = () => {
  // 延迟调整大小，等待全屏动画完成
  setTimeout(() => {
    handleResize();
  }, 100);
};

/**
 * 重新加载地图
 */
const reloadMap = async () => {
  if (!mapManager.value) return;
  
  toast.info('正在重新加载地图...');
  
  try {
    // 简单地清空并重新加载，不销毁整个应用
    mapManager.value.clear();
    
    // 等待清理完成
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 重新加载数据
    await loadMapData();
    
    toast.success('地图重新加载完成');
  } catch (error) {
    console.error('[地图] 重新加载失败:', error);
    toast.error('地图重新加载失败');
  }
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
</script>

<style scoped>
.game-map-panel {
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

/* 地图控制按钮 */
.map-controls {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1000;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.98);
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #64748b;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.control-btn:hover {
  background: white;
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateX(3px) scale(1.05);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.map-status-mini {
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.98);
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.8rem;
  color: #374151;
  font-weight: 600;
  white-space: nowrap;
  writing-mode: vertical-rl;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

/* 地图图例 */
.map-legend {
  position: absolute;
  bottom: 24px;
  right: 24px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  padding: 20px;
  z-index: 1000;
  min-width: 200px;
  max-width: 280px;
  border: 2px solid rgba(59, 130, 246, 0.3);
  pointer-events: auto;
}

.legend-title {
  font-weight: 700;
  color: #1e40af;
  margin-bottom: 16px;
  font-size: 1.1rem;
  text-align: center;
  border-bottom: 3px solid #3b82f6;
  padding-bottom: 10px;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
}

.legend-items::-webkit-scrollbar {
  width: 6px;
}

.legend-items::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.legend-items::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.3);
  border-radius: 3px;
}

.legend-items::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.5);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.95rem;
  color: #374151;
  padding: 6px 8px;
  font-weight: 600;
  border-radius: 8px;
  transition: background 0.2s;
}

.legend-item:hover {
  background: rgba(59, 130, 246, 0.05);
}

.legend-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: block;
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

/* 响应式设计 */
@media (max-width: 640px) {
  .map-legend {
    bottom: 10px;
    right: 10px;
    padding: 8px;
    min-width: 120px;
  }

  .map-controls {
    top: 8px;
    left: 8px;
    gap: 4px;
  }

  .control-btn {
    width: 32px;
    height: 32px;
  }

  .location-popup {
    min-width: auto;
    max-width: calc(100vw - 40px);
  }
}
</style>
