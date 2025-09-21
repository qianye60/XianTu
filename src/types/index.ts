// src/types/index.ts

// --- 核心AI交互结构 (保留) ---
export interface GM_Request {
  action: 'new_game' | 'player_action';
  character_data: any; // 角色卡数据
  player_input?: string; // 玩家输入
  mid_term_memory?: string; // 中期记忆
}

export interface GM_Response {
  narrative: string; // AI生成的旁白
  map_data: any; // AI生成的地图数据
  mid_term_memory: string; // AI总结的中期记忆
  cachedWorldData?: any; // AI缓存的世界数据
}

// --- 创角核心类型定义 ---

export interface World {
  id: number;
  name: string;
  era: string;
  description: string;
  source?: 'local' | 'cloud';
}

export interface TalentTier {
  id: number;
  name: string;
  description: string;
  total_points: number;
  rarity: number;
  color: string;
  source?: 'local' | 'cloud';
}

export interface Origin {
  id: number;
  name: string;
  description: string;
  talent_cost: number;
  attribute_modifiers: Record<string, number>;
  rarity: number;
  source?: 'local' | 'cloud';
}

export interface SpiritRoot {
  id: number;
  name: string;
  tier?: string;
  description: string;
  cultivation_speed?: string;
  special_effects?: string[];
  base_multiplier: number;
  talent_cost: number;
  rarity?: number;
  source?: 'local' | 'cloud';
}

// --- 全新存档与游戏状态结构 ---

export interface Talent {
  id: number; // 统一为数字ID以匹配后端
  name: string;
  description: string;
  level?: number;
  exp?: number;
  exp_max?: number;
  talent_cost: number;
  rarity: number;
  effects?: any;
  source?: 'local' | 'cloud';
}

export interface CharacterGameState {
  mapData: any;
  talents: Talent[];
  reputation: number;
  titles: string[];
  hp?: number; hp_max?: number;
  mana?: number; mana_max?: number;
  spirit?: number; spirit_max?: number;
  lifespan?: number; lifespan_max?: number;
  root_bone?: number;
  spirituality?: number;
  comprehension?: number;
  fortune?: number;
  charm?: number;
  temperament?: number;
}

export type CharacterSaveData = {
  [saveSlotId: string]: CharacterGameState;
};

export type GameSaves = {
  [characterId: string]: CharacterSaveData;
};

// --- 补完核心角色定义 ---

export interface Currency {
  low: number; high: number;
  mid: number; supreme: number;
}

export interface StorageExpansion {
  id: string;
  name: string;
  addedCapacity: number;
}

export interface Item {
  id: string;
  name: string;
  quantity: number;
  description: string;
}

export interface Inventory {
  items: Item[];
  capacity: number;
  expansions: StorageExpansion[];
  currency: Currency;
}

export interface Character {
  id: number;
  character_name: string;
  world_id: number;
  created_at: string;
  inventory: Inventory;
  talents: Talent[];
  reputation: number;
  
  // --- 先天六司 (永不改变) ---
  root_bone: number;
  spirituality: number;
  comprehension: number;
  fortune: number;
  charm: number;
  temperament: number;

  // --- 创角选择 (永不改变) ---
  world?: World | null;
  talent_tier?: TalentTier | null;
  origin?: Origin | null;
  spirit_root?: SpiritRoot | null;

  // --- 动态可变属性 (用于游戏状态) ---
  realm?: string;
  hp?: number; hp_max?: number;
  mana?: number; mana_max?: number;
  spirit?: number; spirit_max?: number;
  lifespan?: number; lifespan_max?: number;
}

/**
 * 【新】统一的角色数据类型，用于各处流转
 * 包含了来源信息和可选的游戏状态预览
 */
export type CharacterData = Character & {
  source: 'local' | 'cloud';
  gameState?: CharacterGameState;
};

/**
 * 角色创建时的载荷类型
 */
export interface CharacterCreationPayload {
  charId: string;
  characterName: string;
  world: World;
  talentTier: TalentTier;
  origin: Origin | null;  // 允许为null，表示随机出身
  spiritRoot: SpiritRoot | null;  // 允许为null，表示随机灵根
  talents: Talent[];
  角色基础信息: any;
  baseAttributes: {
    root_bone: number;
    spirituality: number;
    comprehension: number;
    fortune: number;
    charm: number;
    temperament: number;
  };
  mode: '单机' | '联机';
  age: number;
  gender: string;
}

// --- 创角自定义数据结构 ---

export type DADCustomData = {
  worlds: World[];
  talentTiers: TalentTier[];
  origins: Origin[];
  spiritRoots: SpiritRoot[];
  talents: Talent[];
};
// src/types/index.ts

/**
 * 代表所有游戏存档的集合
 * key是存档名称, value是聊天记录数组
 */
export type AllSaves = Record<string, any[]>;

// --- 新增的类型定义 ---

export interface InitialGameData {
  baseInfo: {
    名字: string;
    先天六司?: {
      根骨?: number;
      灵性?: number;
      悟性?: number;
      气运?: number;
      魅力?: number;
      心性?: number;
    };
    性别?: string;
    世界?: string;
    天资?: string;
    天赋?: string[];
  };
  creationDetails: {
    age: number;
    originName: string;
    spiritRootName: string;
  };
}

export interface WorldInfo {
  世界名称: string;
  大陆信息?: any[];
  势力信息?: any[];
  地点信息?: any[];
}

export interface SaveData {
  世界信息?: WorldInfo;
  玩家角色状态?: any;
  记忆?: {
    短期记忆?: string[];
  };
  对话历史?: any[];
  [key: string]: any;
}