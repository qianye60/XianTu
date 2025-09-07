/**
 * @fileoverview Location related type definitions
 */

/**
 * Represents a location in the world
 */
export interface WorldLocation {
  id: string;
  name: string;
  type: LocationType | string; // Allow string for wider compatibility
  x: number;
  y: number;
  size: number;
  color: string;
  iconColor?: string;
  iconSize?: 'small' | 'medium' | 'large';
  faction?: string;
  description: string;
  population?: string;
  governance?: string; // Added for birthplace info
  features?: string[]; // Added for birthplace info
  landmarks?: string[]; // Added for birthplace info
  specialFeatures?: string[];
  danger_level?: string;
  suitable_for?: string;
  coordinates?: { x: number; y: number }; // For map rendering
  // For territories
  isTerritory?: boolean;
  territoryBounds?: { x: number; y: number }[];
  headquarters?: { x: number; y: number };
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
