import type { GameCoordinates } from '@/types/gameMap';
import type { WorldLocation } from '@/types/location';

type MapSize = { width: number; height: number };

const DEFAULT_MAP_SIZE: MapSize = { width: 10000, height: 10000 };

const LOCATION_COLOR_MAP: Record<string, string> = {
  natural_landmark: '#2D7D32',
  sect_power: '#1565C0',
  city_town: '#F57C00',
  blessed_land: '#7B1FA2',
  treasure_land: '#388E3C',
  dangerous_area: '#D32F2F',
  special_other: '#6B7280',
};

const FACTION_COLOR_RULES: Array<{ match: RegExp; color: string }> = [
  { match: /(魔|邪|诡|阴|幽)/i, color: '#7F1D1D' },
  { match: /(正|仙|道|宗门|剑|丹|符|阵)/i, color: '#1D4ED8' },
  { match: /(世家|门阀|家族)/i, color: '#0F766E' },
  { match: /(商会|商盟|商号)/i, color: '#B45309' },
  { match: /(妖|兽|灵族|异族)/i, color: '#047857' },
  { match: /(联盟|散修)/i, color: '#6B7280' },
];

const clampValue = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const resolveMapSize = (mapSize?: Partial<MapSize>): MapSize => ({
  width: Number(mapSize?.width) > 0 ? Number(mapSize?.width) : DEFAULT_MAP_SIZE.width,
  height: Number(mapSize?.height) > 0 ? Number(mapSize?.height) : DEFAULT_MAP_SIZE.height,
});

const resolveFactionColor = (typeText: string) => {
  for (const rule of FACTION_COLOR_RULES) {
    if (rule.match.test(typeText)) return rule.color;
  }
  return '#6B7280';
};

const isKnownLocationType = (typeText: string) => Object.prototype.hasOwnProperty.call(LOCATION_COLOR_MAP, typeText);

const isFactionLike = (loc: Record<string, any>, typeText: string) => {
  if (isKnownLocationType(typeText)) return false;
  if (loc.leadership || loc.领导层 || loc.memberCount || loc.成员数量) return true;
  return /(宗门|世家|商会|联盟|势力|妖族|魔道)/i.test(typeText);
};

/**
 * 验证并标准化地点数据
 * 只接受游戏坐标，不再支持经纬度
 */
export function normalizeLocationsData(locations: any[], mapSize?: Partial<MapSize>): WorldLocation[] {
  const { width: mapWidth, height: mapHeight } = resolveMapSize(mapSize);
  return locations.map((loc, index) => {
    let coordinates: GameCoordinates;
    const rawType = String(loc.type || loc.类型 || 'special_other');
    const isFaction = isFactionLike(loc, rawType);
    const defaultColor = isFaction ? resolveFactionColor(rawType) : (LOCATION_COLOR_MAP[rawType] || '#6B7280');

    // 只接受游戏坐标格式
    if (loc.coordinates?.x !== undefined && loc.coordinates?.y !== undefined) {
      coordinates = {
        x: clampValue(Number(loc.coordinates.x), 0, mapWidth),
        y: clampValue(Number(loc.coordinates.y), 0, mapHeight),
      };
    } else if (loc.位置?.x !== undefined && loc.位置?.y !== undefined) {
      coordinates = {
        x: clampValue(Number(loc.位置.x), 0, mapWidth),
        y: clampValue(Number(loc.位置.y), 0, mapHeight),
      };
    } else {
      // 缺失坐标时随机生成，确保分散
      coordinates = generateRandomCoords(
        mapWidth / 2,
        mapHeight / 2,
        Math.min(mapWidth, mapHeight) * 0.4,
        mapWidth,
        mapHeight
      );
      console.warn(`[坐标] 地点 "${loc.名称 || loc.name || `地点${index}`}" 缺少坐标，已随机生成: (${coordinates.x.toFixed(0)}, ${coordinates.y.toFixed(0)})`);
    }

    // 处理势力范围（territoryBounds）
    let territoryBounds: GameCoordinates[] | undefined;
    const rawBounds = loc.territoryBounds || loc.势力范围;
    if (rawBounds && Array.isArray(rawBounds) && rawBounds.length >= 3) {
      territoryBounds = rawBounds.map((point: any) => ({
        x: clampValue(Number(point.x), 0, mapWidth),
        y: clampValue(Number(point.y), 0, mapHeight),
      }));
      console.log(`[坐标] 势力 "${loc.名称 || loc.name}" 有势力范围，共 ${territoryBounds.length} 个边界点`);
    }

    // 标准化字段名称，确保使用英文字段名
    return {
      ...loc,
      id: loc.id || `loc_${index}_${Date.now()}`,
      name: loc.name || loc.名称 || `未命名地点${index}`,
      type: rawType,
      description: loc.description || loc.描述 || '',
      coordinates,
      territoryBounds,
      headquarters: coordinates, // 势力总部位置
      iconColor: loc.iconColor || defaultColor,
      color: loc.color || defaultColor,
    };
  });
}

/**
 * 验证并标准化大陆边界数据
 */
export function normalizeContinentBounds(
  bounds: any[],
  mapWidth: number = DEFAULT_MAP_SIZE.width,
  mapHeight: number = DEFAULT_MAP_SIZE.height
): GameCoordinates[] {
  return bounds.map((point) => ({
    x: clampValue(Number(point.x), 0, mapWidth),
    y: clampValue(Number(point.y), 0, mapHeight),
  }));
}

/**
 * 生成随机游戏坐标
 */
export function generateRandomCoords(
  centerX: number = 5000,
  centerY: number = 5000,
  radius: number = 3000,
  mapWidth: number = DEFAULT_MAP_SIZE.width,
  mapHeight: number = DEFAULT_MAP_SIZE.height
): GameCoordinates {
  // 为缺省坐标的地点做均匀散点，避免都挤在地图中央
  const marginX = mapWidth * 0.05;
  const marginY = mapHeight * 0.05;

  return {
    x: clampValue(marginX + Math.random() * (mapWidth - marginX * 2), 0, mapWidth),
    y: clampValue(marginY + Math.random() * (mapHeight - marginY * 2), 0, mapHeight),
  };
}

/**
 * 计算两点之间的距离
 */
export function calculateDistance(p1: GameCoordinates, p2: GameCoordinates): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 检查坐标是否在地图范围内
 */
export function isCoordinateValid(coord: GameCoordinates, mapWidth: number = 10000, mapHeight: number = 10000): boolean {
  return coord.x >= 0 && coord.x <= mapWidth && coord.y >= 0 && coord.y <= mapHeight;
}
