/**
 * @fileoverview 世界感知提示词系统
 * 集成世界势力、地理位置等信息的智能提示词生成器
 */

import { getTavernHelper } from '../tavern';

/**
 * 势力接口
 */
export interface Faction {
  name: string;
  type: string;
  strength: number;
  territory: string;
  philosophy?: string;
  leaders?: Array<{ name: string; title: string }>;
  specialties?: string[];
  description: string;
}

/**
 * 世界事件接口
 */
export interface WorldEvent {
  title?: string;
  name?: string;
  description?: string;
  summary?: string;
}

/**
 * 世界上下文接口
 */
export interface WorldContext {
  factions: Faction[];           // 世界势力
  currentLocation: string;       // 当前位置
  playerFaction?: string;        // 玩家所属势力
  worldEvents: WorldEvent[];     // 世界事件
  nearbyFactions: Faction[];     // 附近势力
  territoryStatus: string;       // 领土状态
}

/**
 * 世界感知GM提示词生成器
 */
export class WorldAwareGMPrompts {
  /**
   * 生成包含世界背景的GM提示词
   */
  static async generateWorldAwarePrompt(config: {
    userAction: string;
    characterData: Record<string, unknown>;
    basePrompt: string;
  }): Promise<string> {
    try {
      // 从酒馆变量获取世界背景信息
      const worldContext = await this.getWorldContext();
      
      // 分析用户行动涉及的势力
      const relevantFactions = this.analyzeRelevantFactions(config.userAction, worldContext);
      
      // 构建增强的GM提示词
      return this.buildEnhancedPrompt({
        ...config,
        worldContext,
        relevantFactions
      });
      
    } catch (error) {
      console.error('[世界感知提示词] 生成失败:', error);
      // 返回基础提示词作为备选
      return config.basePrompt;
    }
  }

  /**
   * 获取世界上下文信息
   */
  private static async getWorldContext(): Promise<WorldContext> {
    const tavern = getTavernHelper();
    if (!tavern) {
      return {
        factions: [],
        currentLocation: '未知',
        worldEvents: [],
        nearbyFactions: [],
        territoryStatus: '中立区域'
      };
    }

    const [variables] = await Promise.all([
      tavern.getVariables({ type: 'chat' })
    ]);

    const factions = (variables['world_factions'] as Faction[]) || [];
    const worldEvents = (variables['world_events'] as WorldEvent[]) || [];
    const playerLocation = (variables['player_location'] as string) || '未知区域';

    // 分析附近势力
    const nearbyFactions = this.findNearbyFactions(playerLocation, factions);
    
    // 分析领土状态
    const territoryStatus = this.analyzeTerritoryStatus(playerLocation, factions);

    return {
      factions,
      currentLocation: playerLocation,
      worldEvents,
      nearbyFactions,
      territoryStatus
    };
  }

  /**
   * 分析相关势力
   */
  private static analyzeRelevantFactions(userAction: string, worldContext: WorldContext): Faction[] {
    const action = userAction.toLowerCase();
    const relevantFactions: Faction[] = [];

    // 检查是否提到具体势力名称
    worldContext.factions.forEach(faction => {
      if (action.includes(faction.name?.toLowerCase())) {
        relevantFactions.push(faction);
      }
    });

    // 如果没有明确提到势力，添加附近的势力
    if (relevantFactions.length === 0) {
      relevantFactions.push(...worldContext.nearbyFactions.slice(0, 2));
    }

    return relevantFactions;
  }

  /**
   * 寻找附近势力
   */
  private static findNearbyFactions(location: string, factions: Faction[]): Faction[] {
    // 简单的地理匹配逻辑
    return factions.filter(faction => {
      if (!faction.territory) return false;
      
      const locationLower = location.toLowerCase();
      const territoryLower = faction.territory.toLowerCase();
      
      // 检查地域关键词匹配
      const locationKeywords = ['东荒', '西荒', '南荒', '北荒', '中州'];
      for (const keyword of locationKeywords) {
        if (locationLower.includes(keyword) && territoryLower.includes(keyword)) {
          return true;
        }
      }
      
      return false;
    }).slice(0, 3);
  }

  /**
   * 分析领土状态
   */
  private static analyzeTerritoryStatus(location: string, factions: Faction[]): string {
    const nearbyFactions = this.findNearbyFactions(location, factions);
    
    if (nearbyFactions.length === 0) {
      return '中立区域';
    }
    
    if (nearbyFactions.length === 1) {
      return `${nearbyFactions[0].name}势力范围`;
    }
    
    return '多方势力交界区';
  }

  /**
   * 构建增强的GM提示词
   */
  private static buildEnhancedPrompt(config: {
    userAction: string;
    characterData: Record<string, unknown>;
    basePrompt: string;
    worldContext: WorldContext;
    relevantFactions: Faction[];
  }): string {
    const { userAction, basePrompt, worldContext, relevantFactions } = config;

    // 构建势力背景信息
    const factionInfo = this.buildFactionInfo(relevantFactions);
    
    // 构建地理背景信息
    const locationInfo = this.buildLocationInfo(worldContext);
    
    // 构建世界事件背景
    const eventInfo = this.buildEventInfo(worldContext.worldEvents);

    return `
${basePrompt}

## **🌍 世界背景感知**

### **📍 当前位置状况:**
- **所在区域:** ${worldContext.currentLocation}
- **领土归属:** ${worldContext.territoryStatus}
- **区域特色:** ${locationInfo}

### **⚔️ 相关势力信息:**
${factionInfo}

### **📰 世界动态:**
${eventInfo}

### **🎯 行动分析:**
玩家行动: "${userAction}"

请基于以上世界背景信息，创造符合当前世界格局的游戏体验。特别注意：

1. **势力影响:** 考虑相关势力对玩家行动的可能反应
2. **地理因素:** 结合当前位置的特殊性质
3. **世界事件:** 如有相关的世界事件，应适当融入剧情
4. **关系网络:** 考虑不同势力间的关系对剧情的影响

## **📋 势力数据操作指南**

在需要更新势力相关信息时，请使用以下tavern_commands格式：
\`\`\`json
{
  "action": "set/add/push",
  "scope": "chat",
  "key": "world_factions[势力索引].字段名" 或 "player_faction_relations.势力名",
  "value": "新值"
}
\`\`\`

现在请基于这个丰富的世界背景创造精彩的游戏体验！`;
  }

  /**
   * 构建势力信息
   */
  private static buildFactionInfo(relevantFactions: Faction[]): string {
    if (relevantFactions.length === 0) {
      return '- 当前区域无明显势力影响';
    }

    return relevantFactions.map((faction, index) => {
      const leaders = faction.leaders && faction.leaders.length > 0
        ? faction.leaders.map((l) => `${l.name}(${l.title})`).join('、')
        : '未知';
        
      return `
**${index + 1}. ${faction.name}**
- 势力类型: ${this.getFactionTypeDesc(faction.type)}
- 势力强度: ${faction.strength}/100
- 势力范围: ${faction.territory}
- 核心理念: ${faction.philosophy || '未知'}
- 主要领袖: ${leaders}
- 专长领域: ${faction.specialties ? faction.specialties.join('、') : '未知'}
- 势力描述: ${faction.description}`;
    }).join('\n');
  }

  /**
   * 构建位置信息
   */
  private static buildLocationInfo(worldContext: WorldContext): string {
    const { currentLocation, territoryStatus } = worldContext;
    
    // 基于位置名称推断地理特征
    const locationFeatures = this.inferLocationFeatures(currentLocation);
    
    return `${territoryStatus}，${locationFeatures}`;
  }

  /**
   * 构建事件信息
   */
  private static buildEventInfo(worldEvents: WorldEvent[]): string {
    if (!worldEvents || worldEvents.length === 0) {
      return '- 世界相对平静，无重大事件';
    }

    const recentEvents = worldEvents.slice(-3); // 最近3个事件
    return recentEvents.map((event, index) => 
      `- ${event.title || event.name || `事件${index + 1}`}: ${event.description || event.summary || '详情未知'}`
    ).join('\n');
  }

  /**
   * 获取势力类型描述
   */
  private static getFactionTypeDesc(type: string): string {
    const typeMap: { [key: string]: string } = {
      'sect': '修仙宗门',
      'family': '修仙世家', 
      'alliance': '修士联盟',
      'empire': '修仙帝国',
      'academy': '修仙学院',
      'merchant': '商会组织',
      'cult': '魔道邪派'
    };
    
    return typeMap[type] || '未知类型';
  }

  /**
   * 推断位置特征
   */
  private static inferLocationFeatures(location: string): string {
    const locationLower = location.toLowerCase();
    
    if (locationLower.includes('山') || locationLower.includes('峰')) {
      return '多山地形，灵气充沛，适宜修炼';
    }
    
    if (locationLower.includes('城') || locationLower.includes('镇')) {
      return '繁华都市，人流密集，商贸兴盛';
    }
    
    if (locationLower.includes('谷') || locationLower.includes('峡')) {
      return '幽静峡谷，易守难攻，常有隐秘';
    }
    
    if (locationLower.includes('湖') || locationLower.includes('河')) {
      return '水域丰富，水行灵气浓郁';
    }
    
    if (locationLower.includes('荒') || locationLower.includes('野')) {
      return '地广人稀，充满未知和危险';
    }
    
    return '地理环境独特，各有特色';
  }
}

/**
 * 势力感知的角色初始化提示词
 */
export function generateFactionAwareInitPrompt(characterData: Record<string, unknown>): Promise<string> {
  return WorldAwareGMPrompts.generateWorldAwarePrompt({
    userAction: '开始修仙之路',
    characterData,
    basePrompt: `
# **🚀 修仙世界角色初始化**

请为玩家创造一个精彩的修仙世界开局，考虑以下角色信息：
**角色基础信息：**
- 姓名：${(characterData as any)?.角色基础信息?.名字 || '无名'}
- 出身：${(characterData as any)?.角色基础信息?.出身 || '未知'}
- 年龄：${(characterData as any)?.角色基础信息?.年龄 || '未知'}岁
请基于世界势力格局和角色背景，创造一个引人入胜的开局剧情。`
  });
}

/**
 * 势力感知的对话提示词
 */
export function generateFactionAwareDialoguePrompt(config: {
  userAction: string;
  characterData: Record<string, unknown>;
  conversationHistory: string[];
}): Promise<string> {
  const basePrompt = `
# **💬 修仙世界对话系统**

请基于玩家的行动和对话历史，继续发展剧情。
**玩家行动：** ${config.userAction}

**对话历史：**
${config.conversationHistory.slice(-5).join('\n')}

请创造自然流畅的剧情发展。`;

  return WorldAwareGMPrompts.generateWorldAwarePrompt({
    userAction: config.userAction,
    characterData: config.characterData,
    basePrompt
  });
}