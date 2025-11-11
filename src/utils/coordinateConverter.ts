// 游戏坐标工具（不再使用经纬度）
import type { GameCoordinates } from '@/types/gameMap';
import type { WorldLocation } from '@/types/location';

/**
 * 验证并标准化地点数据
 * 只接受游戏坐标 (0-10000)，不再支持经纬度
 */
export function normalizeLocationsData(locations: any[]): WorldLocation[] {
  return locations.map((loc, index) => {
    let coordinates: GameCoordinates;

    // 只接受游戏坐标格式
    if (loc.coordinates?.x !== undefined && loc.coordinates?.y !== undefined) {
      coordinates = {
        x: Math.max(0, Math.min(10000, Number(loc.coordinates.x))),
        y: Math.max(0, Math.min(10000, Number(loc.coordinates.y))),
      };
    } else if (loc.位置?.x !== undefined && loc.位置?.y !== undefined) {
      coordinates = {
        x: Math.max(0, Math.min(10000, Number(loc.位置.x))),
        y: Math.max(0, Math.min(10000, Number(loc.位置.y))),
      };
    } else {
      // 缺失坐标时随机生成，确保分散
      coordinates = generateRandomCoords(5000, 5000, 4000);
      console.warn(`[坐标] 地点 "${loc.名称 || loc.name || `地点${index}`}" 缺少坐标，已随机生成: (${coordinates.x.toFixed(0)}, ${coordinates.y.toFixed(0)})`);
    }

    // 处理势力范围（territoryBounds）
    let territoryBounds: GameCoordinates[] | undefined;
    const rawBounds = loc.territoryBounds || loc.势力范围;
    if (rawBounds && Array.isArray(rawBounds) && rawBounds.length >= 3) {
      territoryBounds = rawBounds.map((point: any) => ({
        x: Math.max(0, Math.min(10000, Number(point.x))),
        y: Math.max(0, Math.min(10000, Number(point.y))),
      }));
      console.log(`[坐标] 势力 "${loc.名称 || loc.name}" 有势力范围，共 ${territoryBounds.length} 个边界点`);
    }

    // 标准化字段名称，确保使用英文字段名
    return {
      ...loc,
      id: loc.id || `loc_${index}_${Date.now()}`,
      name: loc.name || loc.名称 || `未命名地点${index}`,
      type: loc.type || loc.类型 || 'special_other',
      description: loc.description || loc.描述 || '',
      coordinates,
      territoryBounds,
      headquarters: coordinates, // 势力总部位置
    };
  });
}

/**
 * 验证并标准化大陆边界数据
 */
export function normalizeContinentBounds(bounds: any[]): GameCoordinates[] {
  return bounds.map((point) => ({
    x: Math.max(0, Math.min(10000, point.x)),
    y: Math.max(0, Math.min(10000, point.y)),
  }));
}

/**
 * 生成随机游戏坐标
 * @param centerX 中心X坐标
 * @param centerY 中心Y坐标
 * @param radius 半径范围
 */
export function generateRandomCoords(
  centerX: number = 5000,
  centerY: number = 5000,
  radius: number = 3000
): GameCoordinates {
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * radius;

  return {
    x: Math.max(0, Math.min(10000, centerX + Math.cos(angle) * distance)),
    y: Math.max(0, Math.min(10000, centerY + Math.sin(angle) * distance)),
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
