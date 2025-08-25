/**
 * @fileoverview 优化的AI请求数据结构系统
 * 智能数据筛选、压缩传输、上下文感知的AI请求优化器
 */

import type { SaveData } from '../../types/game';
import type { GameCharacter, GM_Request } from '../../types/AIGameMaster';
import type { MemorySystem, LocationContext } from '../prompts/comprehensiveAISystem';

/**
 * 优化后的AI请求数据结构
 */
export interface OptimizedAIRequest {
  // 核心数据（总是包含）
  core: {
    character_id: string;
    name: string;
    realm: string;
    location: string;
    timestamp: number;
  };
  
  // 上下文相关数据（智能选择）
  context: {
    attributes?: Partial<GameCharacter['attributes']>;
    resources?: Partial<GameCharacter['resources']>;
    cultivation?: Partial<GameCharacter['cultivation']>;
    social?: Partial<GameCharacter['social']>;
    status?: Partial<GameCharacter['status']>;
  };
  
  // 记忆数据（智能压缩）
  memory: {
    relevant_short?: string[];
    relevant_mid?: string[];
    relevant_long?: string[];
    npc_context?: Record<string, any>;
  };
  
  // 环境数据（按需加载）
  environment?: {
    location_details?: LocationContext;
    nearby_elements?: string[];
    available_actions?: string[];
  };
  
  // 元数据（优化信息）
  meta: {
    request_type: 'combat' | 'social' | 'cultivation' | 'exploration' | 'general';
    priority_focus: string[];
    token_budget: number;
    compression_level: 'low' | 'medium' | 'high';
  };
}

/**
 * 数据选择策略接口
 */
export interface DataSelectionStrategy {
  selectAttributes: (character: GameCharacter, context: string) => Partial<GameCharacter['attributes']>;
  selectResources: (character: GameCharacter, context: string) => Partial<GameCharacter['resources']>;
  selectMemories: (memory: MemorySystem, context: string, limit: number) => Partial<MemorySystem>;
  selectEnvironment: (location: LocationContext, context: string) => Partial<LocationContext>;
}

/**
 * 智能AI请求优化器
 */
export class AIRequestOptimizer {
  private static cache = new Map<string, any>();
  private static cacheExpiry = new Map<string, number>();
  private static readonly CACHE_TTL = 300000; // 5分钟缓存
  
  /**
   * 优化AI请求数据结构
   */
  static optimizeRequest(
    character: GameCharacter,
    memory: MemorySystem,
    location: LocationContext,
    userAction: string,
    options: {
      tokenBudget?: number;
      compressionLevel?: 'low' | 'medium' | 'high';
      priorityFocus?: string[];
    } = {}
  ): OptimizedAIRequest {
    const {
      tokenBudget = 2000,
      compressionLevel = 'medium',
      priorityFocus = []
    } = options;

    // 分析请求类型
    const requestType = this.analyzeRequestType(userAction);
    
    // 选择数据选择策略
    const strategy = this.getDataSelectionStrategy(requestType, compressionLevel);
    
    // 构建优化请求
    const optimizedRequest: OptimizedAIRequest = {
      core: {
        character_id: `${character.identity.name}_${Date.now()}`,
        name: character.identity.name,
        realm: character.cultivation?.realm || '凡人',
        location: character.status?.location || '未知',
        timestamp: Date.now()
      },
      
      context: this.buildContext(character, strategy, userAction),
      memory: this.optimizeMemory(memory, requestType, tokenBudget * 0.3), // 30%预算给记忆
      environment: this.shouldIncludeEnvironment(requestType) ? 
        this.optimizeEnvironment(location, requestType) : undefined,
      
      meta: {
        request_type: requestType,
        priority_focus: priorityFocus,
        token_budget: tokenBudget,
        compression_level: compressionLevel
      }
    };

    return optimizedRequest;
  }

  /**
   * 分析请求类型
   */
  private static analyzeRequestType(userAction: string): OptimizedAIRequest['meta']['request_type'] {
    const lowerAction = userAction.toLowerCase();
    
    if (this.matchKeywords(lowerAction, ['战斗', '攻击', '防御', '对战', '比武'])) {
      return 'combat';
    }
    if (this.matchKeywords(lowerAction, ['交谈', '对话', '拜访', '询问', '社交'])) {
      return 'social';
    }
    if (this.matchKeywords(lowerAction, ['修炼', '炼气', '打坐', '领悟', '突破'])) {
      return 'cultivation';
    }
    if (this.matchKeywords(lowerAction, ['探索', '前往', '寻找', '调查', '搜索'])) {
      return 'exploration';
    }
    
    return 'general';
  }

  /**
   * 获取数据选择策略
   */
  private static getDataSelectionStrategy(
    requestType: string, 
    compressionLevel: string
  ): DataSelectionStrategy {
    const strategies = {
      combat: new CombatDataStrategy(),
      social: new SocialDataStrategy(),
      cultivation: new CultivationDataStrategy(),
      exploration: new ExplorationDataStrategy(),
      general: new GeneralDataStrategy()
    };

    return strategies[requestType as keyof typeof strategies] || strategies.general;
  }

  /**
   * 构建上下文数据
   */
  private static buildContext(
    character: GameCharacter,
    strategy: DataSelectionStrategy,
    userAction: string
  ): OptimizedAIRequest['context'] {
    return {
      attributes: strategy.selectAttributes(character, userAction),
      resources: strategy.selectResources(character, userAction),
      cultivation: this.extractRelevantCultivation(character.cultivation),
      social: this.extractRelevantSocial(character.social, userAction),
      status: this.extractRelevantStatus(character.status, userAction)
    };
  }

  /**
   * 优化记忆数据
   */
  private static optimizeMemory(
    memory: MemorySystem,
    requestType: string,
    tokenBudget: number
  ): OptimizedAIRequest['memory'] {
    // 根据请求类型筛选相关记忆
    const relevantKeywords = this.getRelevantKeywords(requestType);
    
    const selectRelevantMemories = (memories: string[], maxCount: number) => {
      return memories
        .filter(memory => relevantKeywords.some(keyword => memory.includes(keyword)))
        .slice(0, maxCount);
    };

    return {
      relevant_short: selectRelevantMemories(memory.short_term || [], 3),
      relevant_mid: selectRelevantMemories(memory.mid_term || [], 5),
      relevant_long: selectRelevantMemories(memory.long_term || [], 2),
      npc_context: this.compressNPCContext(memory.npc_interactions, requestType)
    };
  }

  /**
   * 优化环境数据
   */
  private static optimizeEnvironment(
    location: LocationContext,
    requestType: string
  ): OptimizedAIRequest['environment'] {
    const isLocationRelevant = ['exploration', 'combat'].includes(requestType);
    
    return {
      location_details: isLocationRelevant ? {
        current_location: {
          name: location.current_location.name,
          type: location.current_location.type,
          spirit_density: location.current_location.spirit_density,
          danger_level: location.current_location.danger_level
        }
      } as LocationContext : undefined,
      
      nearby_elements: location.nearby_npcs?.slice(0, 3) || [],
      available_actions: location.available_actions?.slice(0, 5) || []
    };
  }

  /**
   * 缓存管理
   */
  static getCachedData(key: string): any {
    const now = Date.now();
    const expiry = this.cacheExpiry.get(key);
    
    if (expiry && now > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  static setCachedData(key: string, data: any): void {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  /**
   * 数据压缩
   */
  static compressData(data: any, level: 'low' | 'medium' | 'high'): any {
    switch (level) {
      case 'low':
        return data; // 不压缩
      
      case 'medium':
        return this.removeEmptyFields(data);
      
      case 'high':
        return this.aggressiveCompress(data);
      
      default:
        return data;
    }
  }

  // 辅助方法
  private static matchKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  private static shouldIncludeEnvironment(requestType: string): boolean {
    return ['exploration', 'combat'].includes(requestType);
  }

  private static getRelevantKeywords(requestType: string): string[] {
    const keywordMap = {
      combat: ['战斗', '攻击', '受伤', '胜利', '败北'],
      social: ['对话', '交谈', 'NPC', '关系', '好感'],
      cultivation: ['修炼', '突破', '境界', '功法', '领悟'],
      exploration: ['探索', '发现', '位置', '移动', '到达'],
      general: ['获得', '完成', '决定', '选择']
    };
    
    return keywordMap[requestType as keyof typeof keywordMap] || keywordMap.general;
  }

  private static extractRelevantCultivation(cultivation: any) {
    return cultivation ? {
      realm: cultivation.realm,
      realm_progress: cultivation.realm_progress,
      lifespan_remaining: cultivation.lifespan_remaining
    } : undefined;
  }

  private static extractRelevantSocial(social: any, userAction: string) {
    if (!social || !userAction.includes('交谈') && !userAction.includes('对话')) {
      return undefined;
    }
    
    return {
      faction: social.faction,
      reputation: social.reputation
    };
  }

  private static extractRelevantStatus(status: any, userAction: string) {
    return status ? {
      conditions: status.conditions?.slice(0, 3), // 只保留前3个状态
      location: status.location,
      activity: status.activity
    } : undefined;
  }

  private static compressNPCContext(npcInteractions: any, requestType: string): any {
    if (!npcInteractions || requestType !== 'social') {
      return {};
    }
    
    // 只返回最相关的NPC信息
    const relevantNPCs = Object.entries(npcInteractions)
      .sort(([, a]: any, [, b]: any) => b.interaction_count - a.interaction_count)
      .slice(0, 3)
      .reduce((acc, [name, data]) => {
        acc[name] = {
          relationship: (data as any).relationship,
          favor: (data as any).favor
        };
        return acc;
      }, {} as any);
      
    return relevantNPCs;
  }

  private static removeEmptyFields(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const cleaned = Array.isArray(obj) ? [] : {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined && value !== '' && 
          !(Array.isArray(value) && value.length === 0)) {
        (cleaned as any)[key] = this.removeEmptyFields(value);
      }
    }
    
    return cleaned;
  }

  private static aggressiveCompress(data: any): any {
    // 激进压缩：只保留最关键的数据
    const compressed = this.removeEmptyFields(data);
    
    // 进一步压缩数组
    if (compressed.context?.attributes) {
      // 只保留非默认值的属性
      const attrs = compressed.context.attributes;
      compressed.context.attributes = Object.entries(attrs)
        .filter(([, value]) => value !== 10) // 10是默认值
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    }
    
    return compressed;
  }
}

// 数据选择策略实现
class CombatDataStrategy implements DataSelectionStrategy {
  selectAttributes(character: GameCharacter): Partial<GameCharacter['attributes']> {
    return {
      STR: character.attributes.STR,
      CON: character.attributes.CON,
      DEX: character.attributes.DEX,
      LUK: character.attributes.LUK
    };
  }

  selectResources(character: GameCharacter): Partial<GameCharacter['resources']> {
    return character.resources; // 战斗需要所有资源信息
  }

  selectMemories(memory: MemorySystem, context: string, limit: number) {
    // 选择战斗相关记忆
    return {
      short_term: memory.short_term.filter(m => m.includes('战斗')).slice(0, limit),
      mid_term: memory.mid_term.filter(m => m.includes('战斗')).slice(0, limit),
      long_term: memory.long_term.filter(m => m.includes('战斗')).slice(0, Math.floor(limit/2))
    };
  }

  selectEnvironment(location: LocationContext): Partial<LocationContext> {
    return {
      current_location: {
        name: location.current_location.name,
        danger_level: location.current_location.danger_level,
        special_effects: location.current_location.special_effects
      }
    } as Partial<LocationContext>;
  }
}

class SocialDataStrategy implements DataSelectionStrategy {
  selectAttributes(character: GameCharacter): Partial<GameCharacter['attributes']> {
    return {
      INT: character.attributes.INT,
      SPI: character.attributes.SPI,
      LUK: character.attributes.LUK
    };
  }

  selectResources(): Partial<GameCharacter['resources']> {
    return {}; // 社交不需要资源信息
  }

  selectMemories(memory: MemorySystem, context: string, limit: number) {
    return {
      short_term: memory.short_term.filter(m => m.includes('对话') || m.includes('交谈')).slice(0, limit),
      mid_term: memory.mid_term.slice(0, limit), // 社交需要更多中期记忆
      npc_interactions: memory.npc_interactions
    };
  }

  selectEnvironment(): Partial<LocationContext> {
    return {}; // 社交对环境要求不高
  }
}

class CultivationDataStrategy implements DataSelectionStrategy {
  selectAttributes(character: GameCharacter): Partial<GameCharacter['attributes']> {
    return {
      INT: character.attributes.INT,
      SPI: character.attributes.SPI,
      CON: character.attributes.CON
    };
  }

  selectResources(character: GameCharacter): Partial<GameCharacter['resources']> {
    return {
      ling: character.resources.ling,
      shen: character.resources.shen
    };
  }

  selectMemories(memory: MemorySystem, context: string, limit: number) {
    return {
      short_term: memory.short_term.filter(m => m.includes('修炼')).slice(0, limit),
      mid_term: memory.mid_term.filter(m => m.includes('突破') || m.includes('境界')).slice(0, limit),
      long_term: memory.long_term.slice(0, limit) // 修炼需要长期记忆
    };
  }

  selectEnvironment(location: LocationContext): Partial<LocationContext> {
    return {
      current_location: {
        spirit_density: location.current_location.spirit_density,
        special_effects: location.current_location.special_effects
      }
    } as Partial<LocationContext>;
  }
}

class ExplorationDataStrategy implements DataSelectionStrategy {
  selectAttributes(character: GameCharacter): Partial<GameCharacter['attributes']> {
    return {
      DEX: character.attributes.DEX,
      INT: character.attributes.INT,
      LUK: character.attributes.LUK
    };
  }

  selectResources(character: GameCharacter): Partial<GameCharacter['resources']> {
    return {
      qi: character.resources.qi // 探索需要体力
    };
  }

  selectMemories(memory: MemorySystem, context: string, limit: number) {
    return {
      short_term: memory.short_term.slice(0, limit),
      mid_term: memory.mid_term.filter(m => m.includes('探索') || m.includes('发现')).slice(0, limit)
    };
  }

  selectEnvironment(location: LocationContext): Partial<LocationContext> {
    return location; // 探索需要完整环境信息
  }
}

class GeneralDataStrategy implements DataSelectionStrategy {
  selectAttributes(character: GameCharacter): Partial<GameCharacter['attributes']> {
    // 返回所有属性但是压缩版本
    return character.attributes;
  }

  selectResources(character: GameCharacter): Partial<GameCharacter['resources']> {
    return character.resources;
  }

  selectMemories(memory: MemorySystem, context: string, limit: number) {
    return {
      short_term: memory.short_term.slice(0, Math.floor(limit * 0.6)),
      mid_term: memory.mid_term.slice(0, Math.floor(limit * 0.3)),
      long_term: memory.long_term.slice(0, Math.floor(limit * 0.1))
    };
  }

  selectEnvironment(location: LocationContext): Partial<LocationContext> {
    return {
      current_location: {
        name: location.current_location.name,
        type: location.current_location.type
      }
    } as Partial<LocationContext>;
  }
}

// 导出优化器
export const aiRequestOptimizer = AIRequestOptimizer;