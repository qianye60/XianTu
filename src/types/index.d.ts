export interface World {
  id: number;
  name: string;
}

export interface TalentTier {
  id: number;
  name: string;
  total_points: number;
}

export interface Origin {
  id: number;
  name: string;
  description: string;
  talent_cost: number;
  attribute_modifiers: Record<string, number> | null;
}

export interface SpiritRoot {
  id: number;
  name: string;
  description: string;
  base_multiplier: number;
  talent_cost: number;
}

export interface Talent {
  id: number;
  name: string;
  description: string;
  talent_cost: number;
  rarity: number;
}

export interface CreationData {
  origins: Origin[];
  spirit_roots: SpiritRoot[];
  talents: Talent[];
}

export type AttributeKey = 'root_bone' | 'spirituality' | 'comprehension' | 'fortune' | 'charm' | 'temperament';

export interface Character {
  id: number;
  character_name: string;
  world_id: number;
  talent_tier_id: number;
  root_bone: number;
  spirituality: number;
  comprehension: number;
  fortune: number;
  charm: number;
  temperament: number;
  is_active: boolean;
  is_deleted: boolean;
  is_accessible: boolean;
  last_played?: string;
  play_time_minutes: number;
  created_at: string;
}

export interface CharacterCreationPayload {
  character_name: string;
  world_id: number | '';
  talent_tier_id: number | '';
  birth_age: number;
  root_bone: number;
  spirituality: number;
  comprehension: number;
  fortune: number;
  charm: number;
  temperament: number;
  origin_id: number | null;
  spirit_root_id: number | null;
  selected_talent_ids: number[];
}