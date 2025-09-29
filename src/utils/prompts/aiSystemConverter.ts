/**
 * @fileoverview AI系统数据转换器 (v2.0 - 精简版)
 * 保留核心接口定义，移除未使用的转换函数
 */

/**
 * 记忆系统接口
 */
export interface MemorySystem {
  short_term: string[];
  mid_term: string[];
  long_term: string[];
  npc_interactions: {
    [npcName: string]: {
      relationship: string;
      favor: number;
      memories: string[];
      last_interaction: string;
      interaction_count: number;
    };
  };
}

/**
 * 位置信息系统
 */
export interface LocationContext {
  current_location: {
    name: string;
    description: string;
    type: string;
    spirit_density: number;
    danger_level: number;
    special_effects?: string[];
  };
  nearby_npcs?: string[];
  available_actions?: string[];
  environmental_factors?: string[];
}

// 注意：原有的复杂转换函数已被移除，因为它们未在项目中使用
// 如需要数据转换，建议直接使用现有的存档数据结构