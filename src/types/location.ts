/**
 * @fileoverview Location related type definitions
 */

/**
 * Represents a location in the world
 * 使用游戏坐标系统 (0-10000)，不再使用经纬度
 */
export interface WorldLocation {
  id: string;
  name: string;
  type: LocationType | string; // Allow string for wider compatibility
  coordinates: { x: number; y: number }; // 游戏坐标 (0-10000)
  size?: number;
  color?: string;
  iconColor?: string;
  iconSize?: 'small' | 'medium' | 'large';
  faction?: string;
  description: string;
  描述?: string; // 中文字段兼容
  population?: string;
  governance?: string; // Added for birthplace info
  features?: string[]; // Added for birthplace info
  landmarks?: string[]; // Added for birthplace info
  specialFeatures?: string[];
  danger_level?: string;
  suitable_for?: string;
  controlled_by?: string; // 控制势力

  // For territories
  isTerritory?: boolean;
  territoryBounds?: { x: number; y: number }[];
  headquarters?: { x: number; y: number };

  // 势力相关字段（中文）
  名称?: string;
  类型?: string;
  等级?: string;
  特色?: string[];
  与玩家关系?: string;
  leadership?: {
    宗主?: string;
    宗主修为?: string;
    [key: string]: any;
  };
  领导层?: {
    宗主?: string;
    宗主修为?: string;
    [key: string]: any;
  };
  memberCount?: {
    total?: number;
    [key: string]: any;
  };
  成员数量?: {
    总数?: number;
    total?: number;
    [key: string]: any;
  };

  // 兼容旧数据（已废弃，仅用于数据迁移）
  x?: number;
  y?: number;
}

/**
 * Represents the type of a location
 */
export type LocationType =
  | 'city'
  | 'sect'
  | 'secret_realm'
  | 'village'
  | 'market'
  | 'major_city'
  | 'sect_headquarters'
  | 'trade_center'
  // Added from WorldMapPanel
  | 'natural_landmark'
  | 'sect_power'
  | 'city_town'
  | 'blessed_land'
  | 'treasure_land'
  | 'dangerous_area'
  | 'special_other';
