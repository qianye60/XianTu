/**
 * AI指令解析系统
 * 解析AI回复中的各种游戏指令，支持多种格式和复杂指令
 * 
 * 支持的指令类型：
 * - tavern_commands: 酒馆变量操作
 * - game_updates: 游戏状态更新
 * - map_changes: 地图变化
 * - inventory_updates: 背包更新
 * - character_updates: 角色状态更新
 * - dialogue_commands: 对话控制指令
 */

import { toast } from './toast';

// 基础指令接口
export interface BaseCommand {
  type: string;
  priority: number;
  timestamp?: string;
}

// 酒馆变量操作指令
export interface TavernCommand extends BaseCommand {
  type: 'tavern';
  operation: 'set' | 'add' | 'delete' | 'push' | 'pull' | 'increment' | 'decrement';
  variable: string;
  value?: any;
  condition?: any;
  description?: string;
}

// 游戏状态更新指令
export interface GameUpdateCommand extends BaseCommand {
  type: 'game_update';
  updates: {
    realm?: {
      name: string;
      level: number;
      progress: number;
      maxProgress: number;
      description?: string;
    };
    attributes?: {
      hp?: { current: number; max: number };
      mana?: { current: number; max: number };
      spirit?: { current: number; max: number };
      cultivation?: { current: number; max: number };
    };
    position?: {
      description: string;
      coordinates?: { x: number; y: number };
      area?: string;
    };
    status?: {
      name: string;
      description: string;
      duration?: number;
      type: 'buff' | 'debuff' | 'neutral';
    }[];
  };
}

// 地图变化指令
export interface MapUpdateCommand extends BaseCommand {
  type: 'map_update';
  changes: {
    discovered?: string[]; // 新发现的地点
    updated?: { name: string; description: string }[]; // 更新的地点信息
    routes?: { from: string; to: string; description?: string }[]; // 新路线
  };
}

// 背包更新指令
export interface InventoryUpdateCommand extends BaseCommand {
  type: 'inventory_update';
  changes: {
    add?: { 
      id: string; 
      name: string; 
      type: string; 
      quality: string; 
      quantity: number;
      description?: string;
      effects?: string[];
    }[];
    remove?: { id: string; quantity: number }[];
    modify?: { id: string; changes: any }[];
    currency?: {
      type: '下品' | '中品' | '上品' | '极品';
      change: number;
    }[];
  };
}

// 角色更新指令
export interface CharacterUpdateCommand extends BaseCommand {
  type: 'character_update';
  updates: {
    skills?: {
      name: string;
      level?: number;
      experience?: number;
      proficiency?: string;
    }[];
    talents?: {
      name: string;
      level?: number;
      description?: string;
    }[];
    relationships?: {
      name: string;
      type: string;
      intimacy: number;
      status?: string;
      description?: string;
    }[];
  };
}

// 对话控制指令
export interface DialogueCommand extends BaseCommand {
  type: 'dialogue';
  action: 'continue' | 'choice' | 'end' | 'interrupt' | 'system_message';
  content?: string;
  choices?: { id: string; text: string; consequences?: string }[];
  metadata?: any;
}

// 联合指令类型
export type GameCommand = 
  | TavernCommand 
  | GameUpdateCommand 
  | MapUpdateCommand 
  | InventoryUpdateCommand 
  | CharacterUpdateCommand 
  | DialogueCommand;

// 解析结果
export interface ParseResult {
  commands: GameCommand[];
  errors: string[];
  warnings: string[];
  rawText?: string;
  metadata?: {
    confidence: number;
    format: string;
    parseTime: number;
  };
}

class AICommandParserClass {
  private debugMode = false;

  /**
   * 主要解析方法
   */
  public parseAIResponse(response: string): ParseResult {
    const startTime = Date.now();
    const result: ParseResult = {
      commands: [],
      errors: [],
      warnings: [],
      rawText: response,
    };

    try {
      // 多种格式解析策略
      const strategies = [
        this.parseJSONBlocks.bind(this),
        this.parseInlineJSON.bind(this),
        this.parseStructuredText.bind(this),
        this.parseKeywordBased.bind(this),
      ];

      let bestResult: ParseResult | null = null;
      let maxCommands = 0;

      for (const strategy of strategies) {
        try {
          const strategyResult = strategy(response);
          if (strategyResult.commands.length > maxCommands) {
            bestResult = strategyResult;
            maxCommands = strategyResult.commands.length;
          }
        } catch (error) {
          result.warnings.push(`解析策略失败: ${error}`);
        }
      }

      if (bestResult) {
        result.commands = bestResult.commands;
        result.errors.push(...bestResult.errors);
        result.warnings.push(...bestResult.warnings);
      }

      // 设置元数据
      result.metadata = {
        confidence: this.calculateConfidence(result),
        format: this.detectFormat(response),
        parseTime: Date.now() - startTime,
      };

      // 验证和清理指令
      result.commands = this.validateAndCleanCommands(result.commands);

      if (this.debugMode) {
        console.log('[指令解析] 解析结果:', result);
      }

    } catch (error) {
      result.errors.push(`解析失败: ${error}`);
    }

    return result;
  }

  /**
   * 解析JSON代码块
   */
  private parseJSONBlocks(response: string): ParseResult {
    const result: ParseResult = { commands: [], errors: [], warnings: [] };
    
    // 匹配各种命令块
    const patterns = [
      { name: 'tavern_commands', regex: /```(?:json\s+)?tavern_commands\s*\n([\s\S]*?)\n```/gi },
      { name: 'game_update', regex: /```(?:json\s+)?game_update\s*\n([\s\S]*?)\n```/gi },
      { name: 'commands', regex: /```(?:json\s+)?commands\s*\n([\s\S]*?)\n```/gi },
      { name: 'json', regex: /```json\s*\n([\s\S]*?)\n```/gi },
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(response)) !== null) {
        try {
          const jsonText = match[1].trim();
          const parsed = JSON.parse(jsonText);
          
          if (Array.isArray(parsed)) {
            parsed.forEach(cmd => {
              const command = this.normalizeCommand(cmd, pattern.name);
              if (command) result.commands.push(command);
            });
          } else if (parsed && typeof parsed === 'object') {
            const command = this.normalizeCommand(parsed, pattern.name);
            if (command) result.commands.push(command);
          }
        } catch (parseError) {
          result.errors.push(`JSON解析失败 (${pattern.name}): ${parseError}`);
        }
      }
    });

    return result;
  }

  /**
   * 解析内联JSON
   */
  private parseInlineJSON(response: string): ParseResult {
    const result: ParseResult = { commands: [], errors: [], warnings: [] };
    
    // 匹配可能的JSON对象
    const jsonRegex = /"(?:tavern_commands|game_update|commands)":\s*(\[[\s\S]*?\]|\{[\s\S]*?\})/g;
    let match;
    
    while ((match = jsonRegex.exec(response)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        
        if (Array.isArray(parsed)) {
          parsed.forEach(cmd => {
            const command = this.normalizeCommand(cmd);
            if (command) result.commands.push(command);
          });
        } else {
          const command = this.normalizeCommand(parsed);
          if (command) result.commands.push(command);
        }
      } catch (parseError) {
        result.warnings.push(`内联JSON解析失败: ${parseError}`);
      }
    }

    return result;
  }

  /**
   * 解析结构化文本
   */
  private parseStructuredText(response: string): ParseResult {
    const result: ParseResult = { commands: [], errors: [], warnings: [] };
    
    // 查找结构化的更新信息
    const sections = [
      { name: '状态更新', type: 'game_update' },
      { name: '属性变化', type: 'game_update' },
      { name: '位置变更', type: 'map_update' },
      { name: '背包更新', type: 'inventory_update' },
      { name: '物品获得', type: 'inventory_update' },
      { name: '技能进步', type: 'character_update' },
    ];

    sections.forEach(section => {
      const sectionRegex = new RegExp(`${section.name}[：:](.*?)(?=\\n\\n|\\n[\\u4e00-\\u9fa5]|$)`, 'gs');
      const match = sectionRegex.exec(response);
      
      if (match) {
        const content = match[1].trim();
        const command = this.parseTextToCommand(content, section.type);
        if (command) result.commands.push(command);
      }
    });

    return result;
  }

  /**
   * 基于关键词的解析
   */
  private parseKeywordBased(response: string): ParseResult {
    const result: ParseResult = { commands: [], errors: [], warnings: [] };
    
    // 检测修炼进度
    const cultivationRegex = /(?:修为|境界).*?提升.*?到.*?([^\n。！?]+)/g;
    let match;
    while ((match = cultivationRegex.exec(response)) !== null) {
      const command: GameUpdateCommand = {
        type: 'game_update',
        priority: 5,
        updates: {
          realm: {
            name: match[1].trim(),
            level: 0,
            progress: 0,
            maxProgress: 100,
          }
        }
      };
      result.commands.push(command);
    }

    // 检测位置变化
    const locationRegex = /(?:来到|到达|前往|进入).*?([^\n。！?]+)/g;
    while ((match = locationRegex.exec(response)) !== null) {
      const command: MapUpdateCommand = {
        type: 'map_update',
        priority: 3,
        changes: {
          discovered: [match[1].trim()]
        }
      };
      result.commands.push(command);
    }

    // 检测物品获得
    const itemRegex = /(?:获得|得到|拾取).*?([^\n。！?]+)/g;
    while ((match = itemRegex.exec(response)) !== null) {
      const command: InventoryUpdateCommand = {
        type: 'inventory_update',
        priority: 4,
        changes: {
          add: [{
            id: `item_${Date.now()}`,
            name: match[1].trim(),
            type: '其他',
            quality: '凡',
            quantity: 1,
          }]
        }
      };
      result.commands.push(command);
    }

    return result;
  }

  /**
   * 规范化指令格式
   */
  private normalizeCommand(rawCmd: any, blockType?: string): GameCommand | null {
    if (!rawCmd || typeof rawCmd !== 'object') return null;

    try {
      // 添加默认属性
      const baseCommand = {
        priority: rawCmd.priority || 5,
        timestamp: new Date().toISOString(),
      };

      // 根据不同类型处理
      if (rawCmd.operation || blockType === 'tavern_commands') {
        return {
          type: 'tavern',
          operation: rawCmd.operation || 'set',
          variable: rawCmd.variable || '',
          value: rawCmd.value,
          condition: rawCmd.condition,
          description: rawCmd.description,
          ...baseCommand,
        } as TavernCommand;
      }

      if (rawCmd.updates || blockType === 'game_update') {
        return {
          type: 'game_update',
          updates: rawCmd.updates || rawCmd,
          ...baseCommand,
        } as GameUpdateCommand;
      }

      if (rawCmd.changes && rawCmd.changes.add) {
        return {
          type: 'inventory_update',
          changes: rawCmd.changes,
          ...baseCommand,
        } as InventoryUpdateCommand;
      }

      if (rawCmd.action || rawCmd.type === 'dialogue') {
        return {
          type: 'dialogue',
          action: rawCmd.action || 'continue',
          content: rawCmd.content,
          choices: rawCmd.choices,
          metadata: rawCmd.metadata,
          ...baseCommand,
        } as DialogueCommand;
      }

      // 尝试智能识别类型
      return this.smartTypeDetection(rawCmd, baseCommand);

    } catch (error) {
      console.error('[指令解析] 规范化失败:', error, rawCmd);
      return null;
    }
  }

  /**
   * 智能类型检测
   */
  private smartTypeDetection(rawCmd: any, baseCommand: any): GameCommand | null {
    const cmdStr = JSON.stringify(rawCmd).toLowerCase();

    if (cmdStr.includes('realm') || cmdStr.includes('境界') || cmdStr.includes('修为')) {
      return {
        type: 'game_update',
        updates: rawCmd,
        ...baseCommand,
      } as GameUpdateCommand;
    }

    if (cmdStr.includes('item') || cmdStr.includes('物品') || cmdStr.includes('背包')) {
      return {
        type: 'inventory_update',
        changes: rawCmd,
        ...baseCommand,
      } as InventoryUpdateCommand;
    }

    if (cmdStr.includes('position') || cmdStr.includes('location') || cmdStr.includes('位置')) {
      return {
        type: 'map_update',
        changes: rawCmd,
        ...baseCommand,
      } as MapUpdateCommand;
    }

    return null;
  }

  /**
   * 文本转指令
   */
  private parseTextToCommand(text: string, type: string): GameCommand | null {
    const baseCommand = {
      priority: 5,
      timestamp: new Date().toISOString(),
    };

    try {
      switch (type) {
        case 'game_update':
          return {
            type: 'game_update',
            updates: this.parseGameUpdateText(text),
            ...baseCommand,
          } as GameUpdateCommand;

        case 'inventory_update':
          return {
            type: 'inventory_update',
            changes: this.parseInventoryText(text),
            ...baseCommand,
          } as InventoryUpdateCommand;

        case 'map_update':
          return {
            type: 'map_update',
            changes: this.parseMapText(text),
            ...baseCommand,
          } as MapUpdateCommand;

        default:
          return null;
      }
    } catch (error) {
      console.error('[指令解析] 文本解析失败:', error);
      return null;
    }
  }

  /**
   * 解析游戏更新文本
   */
  private parseGameUpdateText(text: string): any {
    const updates: any = {};

    // 境界变化
    const realmMatch = text.match(/境界[：:]?\s*([^\n，。]+)/);
    if (realmMatch) {
      updates.realm = {
        name: realmMatch[1].trim(),
        level: 0,
        progress: 0,
        maxProgress: 100,
      };
    }

    // 属性变化
    const hpMatch = text.match(/(?:气血|生命)[：:]?\s*(\d+)(?:\/(\d+))?/);
    if (hpMatch) {
      updates.attributes = updates.attributes || {};
      updates.attributes.hp = {
        current: parseInt(hpMatch[1]),
        max: hpMatch[2] ? parseInt(hpMatch[2]) : parseInt(hpMatch[1]),
      };
    }

    return updates;
  }

  /**
   * 解析背包文本
   */
  private parseInventoryText(text: string): any {
    const changes: any = {};

    // 物品获得
    const itemMatches = text.match(/获得.*?([^\n，。]+)/g);
    if (itemMatches) {
      changes.add = itemMatches.map((match, index) => ({
        id: `item_${Date.now()}_${index}`,
        name: match.replace('获得', '').trim(),
        type: '其他',
        quality: '凡',
        quantity: 1,
      }));
    }

    return changes;
  }

  /**
   * 解析地图文本
   */
  private parseMapText(text: string): any {
    const changes: any = {};

    // 发现地点
    const locationMatches = text.match(/(?:发现|到达|进入).*?([^\n，。]+)/g);
    if (locationMatches) {
      changes.discovered = locationMatches.map(match => 
        match.replace(/(?:发现|到达|进入)/, '').trim()
      );
    }

    return changes;
  }

  /**
   * 验证和清理指令
   */
  private validateAndCleanCommands(commands: GameCommand[]): GameCommand[] {
    return commands.filter(cmd => {
      // 基本验证
      if (!cmd.type || typeof cmd.priority !== 'number') {
        return false;
      }

      // 类型特定验证
      switch (cmd.type) {
        case 'tavern':
          const tavernCmd = cmd as TavernCommand;
          return tavernCmd.operation && tavernCmd.variable;

        case 'game_update':
          const gameCmd = cmd as GameUpdateCommand;
          return gameCmd.updates && Object.keys(gameCmd.updates).length > 0;

        default:
          return true;
      }
    }).sort((a, b) => b.priority - a.priority);
  }

  /**
   * 计算解析置信度
   */
  private calculateConfidence(result: ParseResult): number {
    let confidence = 0;

    // 基于成功解析的指令数量
    confidence += Math.min(result.commands.length * 20, 60);

    // 基于错误数量的扣分
    confidence -= result.errors.length * 10;

    // 基于警告数量的轻微扣分
    confidence -= result.warnings.length * 5;

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * 检测回复格式
   */
  private detectFormat(response: string): string {
    if (response.includes('```json') || response.includes('```tavern_commands')) {
      return 'json_blocks';
    } else if (response.includes('"tavern_commands":')) {
      return 'inline_json';
    } else if (/[：:]/.test(response)) {
      return 'structured_text';
    } else {
      return 'plain_text';
    }
  }

  /**
   * 设置调试模式
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * 获取支持的指令类型
   */
  public getSupportedCommandTypes(): string[] {
    return ['tavern', 'game_update', 'map_update', 'inventory_update', 'character_update', 'dialogue'];
  }
}

// 导出单例实例
export const AICommandParser = new AICommandParserClass();

export default AICommandParser;