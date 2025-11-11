/**
 * @fileoverview World map related type definitions
 */

/**
 * Represents a faction in the world
 */
export interface Faction {
  id: string;
  name: string;
  color: string;
  borderColor: string;
  textColor: string;
  emblem: string;
  description: string;
  strength: number;
  territory: string;
  memberCount?: string;
  specialties?: string[];
}

/**
 * Represents a territory in the world
 */
export interface TerritoryData {
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

/**
 * Represents a terrain feature in the world
 */
export interface TerrainFeature {
  id: string;
  name: string;
  path: string; // SVG path
  labelX: number;
  labelY: number;
}

/**
 * Represents the terrain data of the world
 */
export interface TerrainData {
  mountains: TerrainFeature[];
  forests: TerrainFeature[];
  waters: TerrainFeature[];
}

/**
 * Represents a trade route in the world
 */
export interface TradeRoute {
  id: string;
  name: string;
  path: string; // SVG path
  from: string;
  to: string;
}

/**
 * Represents a continent in the world
 */
export interface CultivationContinent {
  id: string;
  name?: string;
  名称?: string;
  description?: string;
  描述?: string;
  continent_bounds?: { x: number; y: number }[];
  大洲边界?: { x: number; y: number }[];
  climate?: string;
  气候?: string;
  terrain_features?: string[];
  地理特征?: string[];
  natural_barriers?: string[];
  天然屏障?: string[];
  特点?: string;
  主要势力?: string[];
}

/**
 * Represents the configuration for the world map generation
 */
export interface WorldMapConfig {
  width: number; // Virtual width of the map
  height: number; // Virtual height of the map
  minLng: number; // Minimum x for geo-to-virtual conversion
  maxLng: number; // Maximum x
  minLat: number; // Minimum y
  maxLat: number; // Maximum y
}
