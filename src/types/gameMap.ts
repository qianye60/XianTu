// 游戏地图类型定义

/**
 * 游戏地图坐标系统（像素坐标）
 * 不再使用经纬度，改用简单的笛卡尔坐标系
 */
export interface GameCoordinates {
  x: number;  // 0 - 10000
  y: number;  // 0 - 10000
}

/**
 * 地图配置
 */
export interface GameMapConfig {
  width: number;      // 地图总宽度（像素）
  height: number;     // 地图总高度（像素）
  tileSize: number;   // 网格大小
  minZoom?: number;   // 最小缩放级别
  maxZoom?: number;   // 最大缩放级别
}

/**
 * 地图图层枚举
 * 用于管理不同类型元素的渲染顺序
 */
export enum MapLayer {
  BACKGROUND = 0,   // 背景层
  TERRAIN = 1,      // 地形层
  CONTINENT = 2,    // 大陆层
  TERRITORY = 3,    // 势力范围层
  LOCATION = 4,     // 地点标记层
  PLAYER = 5,       // 玩家层
  UI = 6           // UI层
}

/**
 * 地图事件类型
 */
export interface MapEventData {
  locationClick?: {
    id: string;
    name: string;
    coordinates: GameCoordinates;
  };
  continentClick?: {
    id: string;
    name: string;
  };
  playerMove?: {
    from: GameCoordinates;
    to: GameCoordinates;
  };
}

/**
 * 地图渲染选项
 */
export interface MapRenderOptions {
  showGrid?: boolean;           // 显示网格
  showLabels?: boolean;         // 显示标签
  showTerritories?: boolean;    // 显示势力范围
  showFog?: boolean;            // 显示迷雾
  enableInteraction?: boolean;  // 启用交互
}

/**
 * 地点图标配置
 */
export interface LocationIconConfig {
  type: string;
  color: string;
  size: number;
  scale?: number;
}

/**
 * 视口状态
 */
export interface ViewportState {
  x: number;
  y: number;
  scale: number;
  screenWidth: number;
  screenHeight: number;
}
