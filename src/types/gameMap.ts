// 游戏地图类型定义

/**
 * 游戏地图坐标系统（像素坐标）
 * 不再使用经纬度，改用简单的笛卡尔坐标系
 */
export interface GameCoordinates {
  x: number // 0 - 10000
  y: number // 0 - 10000
}

/**
 * 地图配置
 */
export interface GameMapConfig {
  width: number // 地图总宽度（像素）
  height: number // 地图总高度（像素）
  tileSize: number // 网格大小
  minZoom?: number // 最小缩放级别
  maxZoom?: number // 最大缩放级别
}

/**
 * 地图图层枚举
 * 用于管理不同类型元素的渲染顺序
 */
export enum MapLayer {
  BACKGROUND = 0, // 背景层
  TERRAIN = 1, // 地形层
  CONTINENT = 2, // 大陆层
  TERRITORY = 3, // 势力范围层
  LOCATION = 4, // 地点标记层
  PLAYER = 5, // 玩家层
  UI = 6, // UI层
}

/**
 * 地图事件类型
 */
export interface MapEventData {
  locationClick?: {
    id: string
    name: string
    coordinates: GameCoordinates
  }
  continentClick?: {
    id: string
    name: string
  }
  playerMove?: {
    from: GameCoordinates
    to: GameCoordinates
  }
}

/**
 * 地图渲染选项
 */
export interface MapRenderOptions {
  showGrid?: boolean // 显示网格
  showLabels?: boolean // 显示标签
  showTerritories?: boolean // 显示势力范围
  showFog?: boolean // 显示迷雾
  enableInteraction?: boolean // 启用交互
}

/**
 * 地点图标配置
 */
export interface LocationIconConfig {
  type: string
  color: string
  size: number
  scale?: number
}

/**
 * 视口状态
 */
export interface ViewportState {
  x: number
  y: number
  scale: number
  screenWidth: number
  screenHeight: number
}

// ─── 区域地图系统 ────────────────────────────────────────────────────────────

/**
 * 区域地图规模
 * 按地点性质划分格子大小，左下角坐标为 (1,1)，x 向右，y 向上
 */
export type RegionMapScale = '1x1' | '3x3' | '5x5' | '7x7' | '9x9'

/** 区域地图规模对应的格子尺寸 */
export const REGION_MAP_SCALE_SIZE: Record<RegionMapScale, number> = {
  '1x1': 1,
  '3x3': 3,
  '5x5': 5,
  '7x7': 7,
  '9x9': 9,
}

/**
 * 建筑类型
 */
export type RegionBuildingType =
  | 'entrance' // 入口：区域进出口，玩家默认落点
  | 'main' // 主体：核心建筑（宗主殿、议事厅等）
  | 'residential' // 居所：生活区域（弟子宿舍、客栈等）
  | 'functional' // 功能：功能性建筑（藏经阁、炼丹房、坊市等）
  | 'restricted' // 禁区：限制进入（禁地、密室等）
  | 'wilderness' // 野外：自然地形（山峰、湖泊、广场等）

/**
 * 区域内的建筑/场景节点
 * 坐标系：左下角为 (1,1)，x 向右增大，y 向上增大
 */
export interface RegionBuilding {
  id: string // 建筑唯一标识（英文，无空格）
  name: string // 建筑名称，如"宗主殿"、"藏经阁"
  gridX: number // 格子 x 坐标（1 起）
  gridY: number // 格子 y 坐标（1 起）
  type: RegionBuildingType // 建筑类型
  description?: string // 建筑描述
  isEntrance?: boolean // 是否为区域入口（至少 1 个必须为 true）
}

/**
 * 区域地图
 * 对应世界地图上某一个地点（WorldLocation）的内部结构
 * 采用格子坐标系，按需由 AI 生成，首次进入该地点时触发
 */
export interface RegionMap {
  id: string // 区域地图唯一标识
  linkedLocationId: string // 关联的世界地图地点标识（WorldLocation 名称或 id）
  name: string // 区域名称（通常与地点名称一致）
  scale: RegionMapScale // 格子规模
  gridWidth: number // 格子宽度（由 scale 决定）
  gridHeight: number // 格子高度（由 scale 决定）
  buildings: RegionBuilding[] // 区域内的建筑列表
  generatedAt: string // 生成时间（ISO 字符串）
}
