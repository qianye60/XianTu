// Based on 后端接口API.json

export interface World {
  id: number;
  name: string;
  description?: string | null;
  era?: string | null;
  // core_rules, creator, created_at are not needed for frontend creation logic
}

export interface TalentTier {
  id: number;
  name: string;
  description?: string | null;
  total_points: number;
  rarity: number;
  color: string;
}

export interface Origin {
  id: number;
  name: string;
  description?: string | null;
  attribute_modifiers?: Record<string, any> | null;
  rarity: number; // Default: 3
  talent_cost: number; // Default: 0
}

export interface SpiritRoot {
  id: number;
  name: string;
  description?: string | null;
  base_multiplier: number;
  talent_cost: number; // Default: 0
}

export interface Talent {
  id: number;
  name: string;
  description?: string | null;
  effects?: any | null; // JSONB in backend, can be any object
  rarity: number; // Default: 2
  talent_cost: number; // Default: 1
}

export interface CharacterCreationData {
  worlds: World[];
  talentTiers: TalentTier[];
  origins: Origin[];
  spiritRoots: SpiritRoot[];
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
  source?: 'cloud'; // 标记来源为云端
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

// 本地（单机）角色类型
export interface LocalCharacter {
  // 基础信息
  id: number; // 使用时间戳作为唯一ID
  character_name: string;
  world_id: number;
  talent_tier_id: number;

  // 核心修行属性
  realm: string; // 境界
  reputation: number; // 声望
  hp: number;
  hp_max: number;
  mana: number;
  mana_max: number;
  spirit: number;
  spirit_max: number;
  lifespan: number; // 寿命
  cultivation_exp: number; // 当前修为
  cultivation_exp_max: number; // 突破所需修为

  // 基础六维
  root_bone: number;
  spirituality: number;
  comprehension: number;
  fortune: number;
  charm: number;
  temperament: number;

  // 游戏进程
  play_time_minutes: number;
  created_at: string;
  last_played?: string;
  source?: 'local' | 'cloud'; // 标记来源
}

// 用于组件中统一处理两种角色类型
export type CharacterData = Character | LocalCharacter;