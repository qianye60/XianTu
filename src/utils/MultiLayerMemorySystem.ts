/**
 * 多层记忆管理系统
 * 实现短期/中期/长期记忆的分层管理和自动转化
 * 
 * 记忆层次：
 * - 短期记忆(Current Context): 最新5条完整消息
 * - 中期记忆(Mid-term Memory): 总结摘要，20条消息触发转化
 * - 长期记忆(Long-term Memory): 关键事件和宏观信息，最多30条
 */

import { getTavernHelper } from './tavern';
import { toast } from './toast';

// 消息接口
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    location?: string;
    realm?: string;
    actions?: string[];
  };
}

// 中期记忆条目
export interface MidTermMemory {
  id: string;
  summary: string;
  timeRange: {
    start: string;
    end: string;
  };
  messageCount: number;
  keyEvents: string[];
  characters: string[];
  locations: string[];
  priority: number;
}

// 长期记忆条目
export interface LongTermMemory {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: 'character' | 'relationship' | 'location' | 'event' | 'cultivation' | 'item' | 'faction';
  relatedMemories: string[]; // 相关记忆ID
  tags: string[];
  importance: number;
}

// 记忆配置
export interface MemoryConfig {
  shortTermLimit: number; // 短期记忆条数限制
  midTermTrigger: number; // 中期记忆转化触发条数
  midTermKeep: number; // 中期记忆转化时保留的最新条数
  autoSummaryEnabled: boolean; // 是否启用自动总结
  summaryApiEndpoint?: string; // 总结API端点
  midTermFormat?: string; // 中期记忆自定义格式
  longTermFormat?: string; // 长期记忆自定义格式
}

class MultiLayerMemorySystemClass {
  private shortTermMemories: ChatMessage[] = [];
  private midTermMemories: MidTermMemory[] = [];
  private longTermMemories: LongTermMemory[] = [];
  
  // 默认中期记忆格式模板
  private readonly DEFAULT_MID_TERM_FORMAT = `请将以下对话总结为中期记忆，使用此JSON格式：
{
  "summary": "核心事件概述(不超过50字)",
  "keyEvents": ["关键事件1", "关键事件2"],
  "characters": ["涉及人物1", "涉及人物2"], 
  "locations": ["地点1", "地点2"],
  "items": ["重要物品1", "重要物品2"],
  "cultivation": "修炼相关进展",
  "relationships": "人际关系变化",
  "priority": 数字1-10
}`;

  // 默认长期记忆格式模板
  private readonly DEFAULT_LONG_TERM_FORMAT = `请将以下中期记忆总结为长期记忆，使用此JSON格式：
{
  "title": "简洁标题(不超过20字)",
  "category": "事件类型(cultivation/relationship/location/item/event)",
  "essence": "核心内容(不超过30字)",
  "impact": "重要影响(不超过20字)",
  "tags": ["标签1", "标签2", "标签3"],
  "importance": 数字1-10
}`;

  private config: MemoryConfig = {
    shortTermLimit: 5,
    midTermTrigger: 20,
    midTermKeep: 8,
    autoSummaryEnabled: true,
  };

  private tavernHelper: Record<string, any> | null = null;
  private summaryInProgress = false;

  constructor() {
    this.initializeSystem();
  }

  /**
   * 初始化记忆系统
   */
  private async initializeSystem() {
    try {
      this.tavernHelper = getTavernHelper();
      await this.loadMemoriesFromStorage();
      console.log('[记忆系统] 初始化完成');
    } catch (error) {
      console.error('[记忆系统] 初始化失败:', error);
    }
  }

  /**
   * 添加新消息到短期记忆
   * 实现：消息接收之后短期正文要存入text，中期等短期达标范围了就转化
   * 支持0延迟转化：优先使用AI预生成的隐形中期记忆
   */
  public addMessage(message: ChatMessage): void {
    // 添加到短期记忆
    this.shortTermMemories.push(message);

    console.log(`[多层记忆系统] 添加消息到短期记忆: ${message.content.substring(0, 50)}...`);
    console.log(`[多层记忆系统] 当前短期记忆数量: ${this.shortTermMemories.length}/${this.config.shortTermLimit}`);

    // 维护短期记忆限制
    if (this.shortTermMemories.length > this.config.shortTermLimit) {
      const removedMessages = this.shortTermMemories.splice(
        0, 
        this.shortTermMemories.length - this.config.shortTermLimit
      );
      console.log('[多层记忆系统] 短期记忆溢出，移除消息:', removedMessages.length, '条');
      
      // 0延迟转化：尝试使用AI预生成的中期记忆
      this.tryZeroDelayConversion(removedMessages);
    }

    // 检查是否需要触发中期记忆转化
    this.checkMidTermTrigger();

    // 保存到存储
    this.saveMemoriesToStorage();
  }

  /**
   * 0延迟转化：优先使用AI预生成的隐形中期记忆
   * 这是用户要求的核心功能：避免重新生成，直接使用AI已经准备好的摘要
   */
  private tryZeroDelayConversion(removedMessages: ChatMessage[]): void {
    try {
      if (!this.tavernHelper) return;
      
      // 异步获取AI预生成的中期记忆
      this.tavernHelper.getVariables({ type: 'chat' }).then((chatVars: Record<string, unknown>) => {
        const hiddenMidTermMemory = chatVars['mid_term_memory'];
        
        if (hiddenMidTermMemory && typeof hiddenMidTermMemory === 'string') {
          console.log('[0延迟转化] 发现AI预生成的中期记忆，直接使用');
          
          // 解析预生成的记忆内容
          let parsedMemory: Record<string, any> | null = null;
          try {
            // 尝试解析JSON格式的记忆 - 直接处理不用正则
            if (hiddenMidTermMemory.includes('{') && hiddenMidTermMemory.includes('}')) {
              const startIndex = hiddenMidTermMemory.indexOf('{');
              const lastIndex = hiddenMidTermMemory.lastIndexOf('}');
              if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
                const jsonStr = hiddenMidTermMemory.substring(startIndex, lastIndex + 1);
                parsedMemory = JSON.parse(jsonStr);
              }
            }
          } catch {
            console.warn('[0延迟转化] 解析AI记忆失败，使用纯文本格式');
          }
          
          // 创建中期记忆条目
          const midTermMemory: MidTermMemory = {
            id: `mid_${Date.now()}_instant`,
            summary: parsedMemory?.summary || hiddenMidTermMemory.substring(0, 100),
            timeRange: {
              start: removedMessages[0]?.timestamp || new Date().toISOString(),
              end: removedMessages[removedMessages.length - 1]?.timestamp || new Date().toISOString(),
            },
            messageCount: removedMessages.length,
            keyEvents: parsedMemory?.keyEvents || ['对话记录'],
            characters: parsedMemory?.characters || [],
            locations: parsedMemory?.locations || [],
            priority: parsedMemory?.priority || 5,
          };
          
          // 直接添加到中期记忆
          this.midTermMemories.push(midTermMemory);
          
          // 清除酒馆中的预生成记忆，避免重复使用
          if (this.tavernHelper) {
            this.tavernHelper.insertOrAssignVariables({ 'mid_term_memory': null }, { type: 'chat' })
              .catch((e: unknown) => console.warn('[0延迟转化] 清除预生成记忆失败:', e));
          }
          
          console.log('[0延迟转化] 成功完成记忆转化:', midTermMemory.summary.substring(0, 50) + '...');
          this.saveMemoriesToStorage();
          return;
        }
        
        console.log('[0延迟转化] 未找到AI预生成记忆，将在稍后进行标准转化');
      }).catch((error: unknown) => {
        console.warn('[0延迟转化] 获取预生成记忆失败:', error);
      });
      
    } catch (error) {
      console.error('[0延迟转化] 执行失败:', error);
    }
  }

  /**
   * 检查是否需要触发中期记忆转化
   * 当总消息数达到用户设定的midTermTrigger阈值时自动触发转化
   */
  private checkMidTermTrigger(): void {
    const totalMessages = this.shortTermMemories.length + 
      this.midTermMemories.reduce((sum, mem) => sum + mem.messageCount, 0);

    // 使用用户可配置的midTermTrigger阈值
    if (totalMessages >= this.config.midTermTrigger && 
        !this.summaryInProgress && 
        this.config.autoSummaryEnabled) {
      console.log(`[多层记忆系统] 总消息数达到转化阈值 ${totalMessages}/${this.config.midTermTrigger}，触发中期记忆转化`);
      this.triggerMidTermConversion();
    }
  }

  /**
   * 在发送正文请求前调用：
   * 若累计消息数达到中期记忆阈值，则先执行一次中期记忆总结。
   * 返回是否执行了总结。
   */
  public async ensureMidTermSummaryIfNeeded(): Promise<boolean> {
    try {
      const totalMessages = this.shortTermMemories.length +
        this.midTermMemories.reduce((sum, mem) => sum + mem.messageCount, 0);

      if (
        this.config.autoSummaryEnabled &&
        !this.summaryInProgress &&
        totalMessages >= this.config.midTermTrigger
      ) {
        await this.triggerMidTermConversion();
        return true;
      }
    } catch (error) {
      console.error('[记忆系统] ensureMidTermSummaryIfNeeded 失败:', error);
    }
    return false;
  }

  /**
   * 触发中期记忆转化
   */
  private async triggerMidTermConversion(): Promise<void> {
    if (this.summaryInProgress) return;
    this.summaryInProgress = true;

    try {
      console.log('[记忆系统] 开始中期记忆转化');

      // 获取需要转化的消息
      const messagesToSummarize = [...this.shortTermMemories];
      
      if (messagesToSummarize.length === 0) {
        return;
      }

      // 生成中期记忆摘要
      const midTermMemory = await this.generateMidTermSummary(messagesToSummarize);
      
      if (midTermMemory) {
        // 添加到中期记忆
        this.midTermMemories.push(midTermMemory);
        
        // 保留最新的几条短期记忆，其余的已经被总结了
        this.shortTermMemories = this.shortTermMemories.slice(-this.config.midTermKeep);
        
        console.log('[记忆系统] 中期记忆转化完成，生成摘要:', midTermMemory.summary.substring(0, 100) + '...');
        toast.success(`记忆已整理，生成摘要: ${midTermMemory.keyEvents.length}个关键事件`);
      }

      // 检查是否需要转化长期记忆
      await this.checkLongTermConversion();

    } catch (error) {
      console.error('[记忆系统] 中期记忆转化失败:', error);
      toast.error('记忆整理失败');
    } finally {
      this.summaryInProgress = false;
      this.saveMemoriesToStorage();
    }
  }

  /**
   * 生成中期记忆摘要
   */
  private async generateMidTermSummary(messages: ChatMessage[]): Promise<MidTermMemory | null> {
    try {
      if (!this.tavernHelper) {
        throw new Error('酒馆连接未建立');
      }

      // 构建对话文本
      const messagesText = messages.map(msg => 
        `[${msg.role}] ${msg.content}`
      ).join('\n\n');

      // 使用自定义格式或默认格式
      const formatTemplate = this.config.midTermFormat || this.DEFAULT_MID_TERM_FORMAT;
      
      const summaryPrompt = `${formatTemplate}

对话内容：
${messagesText}

请严格按照上述JSON格式返回，确保所有字段都有值，字符数不超过限制。`;

      // 发送总结请求
      const response = await this.sendSummaryRequest(summaryPrompt);
      const summaryData = this.parseSummaryResponse(response);

      if (summaryData) {
        const midTermMemory: MidTermMemory = {
          id: `mid_${Date.now()}`,
          summary: summaryData.summary || '记忆摘要',
          timeRange: {
            start: messages[0]?.timestamp || new Date().toISOString(),
            end: messages[messages.length - 1]?.timestamp || new Date().toISOString(),
          },
          messageCount: messages.length,
          keyEvents: summaryData.keyEvents || [],
          characters: summaryData.characters || [],
          locations: summaryData.locations || [],
          priority: summaryData.priority || 5,
        };

        return midTermMemory;
      }

    } catch (error) {
      console.error('[记忆系统] 中期记忆生成失败:', error);
    }

    return null;
  }

  /**
   * 检查长期记忆转化
   */
  private async checkLongTermConversion(): Promise<void> {
    // 如果中期记忆积累过多，转化为长期记忆
    if (this.midTermMemories.length > 15) {
      await this.convertToLongTermMemory();
    }
  }

  /**
   * 转化为长期记忆
   */
  private async convertToLongTermMemory(): Promise<void> {
    try {
      console.log('[记忆系统] 开始长期记忆转化');

      // 选择优先级高的中期记忆进行转化
      const highPriorityMemories = this.midTermMemories
        .filter(mem => mem.priority >= 6)
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5);

      for (const midMem of highPriorityMemories) {
        const longTermMemory = await this.generateLongTermMemory(midMem);
        if (longTermMemory) {
          this.longTermMemories.push(longTermMemory);
        }
      }

      // 移除已转化的中期记忆
      this.midTermMemories = this.midTermMemories.filter(
        mem => !highPriorityMemories.includes(mem)
      );

      // 维护长期记忆限制 - 移除，长期记忆不设限制
      // 长期记忆会随着时间积累，体现游戏历程的完整性

      console.log('[记忆系统] 长期记忆转化完成');

    } catch (error) {
      console.error('[记忆系统] 长期记忆转化失败:', error);
    }
  }

  /**
   * 生成长期记忆
   */
  private async generateLongTermMemory(midMem: MidTermMemory): Promise<LongTermMemory | null> {
    try {
      if (!this.tavernHelper) {
        throw new Error('酒馆连接未建立');
      }

      // 构建中期记忆文本
      const midTermText = `
摘要: ${midMem.summary}
关键事件: ${midMem.keyEvents.join(', ')}
涉及人物: ${midMem.characters.join(', ')}
相关地点: ${midMem.locations.join(', ')}
重要程度: ${midMem.priority}/10
时间范围: ${midMem.timeRange.start} 至 ${midMem.timeRange.end}
`;

      // 使用自定义格式或默认格式
      const formatTemplate = this.config.longTermFormat || this.DEFAULT_LONG_TERM_FORMAT;
      
      const summaryPrompt = `${formatTemplate}

中期记忆内容：
${midTermText}

请将上述中期记忆精炼为长期记忆，严格按照JSON格式返回，内容要简洁但保留核心信息。`;

      // 发送总结请求
      const response = await this.sendSummaryRequest(summaryPrompt);
      const summaryData = this.parseSummaryResponse(response);

      if (summaryData) {
        const longTermMemory: LongTermMemory = {
          id: `long_${Date.now()}`,
          title: summaryData.title || this.generateMemoryTitle(midMem),
          description: summaryData.essence || midMem.summary,
          timestamp: midMem.timeRange.end,
          category: (summaryData.category as LongTermMemory['category']) || this.categorizeMemory(midMem),
          importance: summaryData.importance || Math.min(10, midMem.priority + 1),
          relatedMemories: [],
          tags: summaryData.tags || [...midMem.characters, ...midMem.locations, ...midMem.keyEvents.slice(0, 3)],
        };

        return longTermMemory;
      }

      // 回退到简单版本
      const category = this.categorizeMemory(midMem);
      
      const longTermMemory: LongTermMemory = {
        id: `long_${Date.now()}`,
        title: this.generateMemoryTitle(midMem),
        description: midMem.summary,
        timestamp: midMem.timeRange.end,
        category,
        importance: Math.min(10, midMem.priority + 1),
        relatedMemories: [],
        tags: [...midMem.characters, ...midMem.locations, ...midMem.keyEvents.slice(0, 3)],
      };

      return longTermMemory;

    } catch (error) {
      console.error('[记忆系统] 长期记忆生成失败:', error);
      return null;
    }
  }

  /**
   * 记忆分类
   */
  private categorizeMemory(midMem: MidTermMemory): LongTermMemory['category'] {
    const summary = midMem.summary.toLowerCase();
    const events = midMem.keyEvents.join(' ').toLowerCase();
    
    if (summary.includes('修炼') || summary.includes('突破') || events.includes('境界')) {
      return 'cultivation';
    } else if (summary.includes('关系') || midMem.characters.length > 1) {
      return 'relationship';
    } else if (midMem.locations.length > 0) {
      return 'location';
    } else if (summary.includes('物品') || summary.includes('装备')) {
      return 'item';
    } else {
      return 'event';
    }
  }

  /**
   * 生成记忆标题
   */
  private generateMemoryTitle(midMem: MidTermMemory): string {
    if (midMem.keyEvents.length > 0) {
      return midMem.keyEvents[0];
    } else if (midMem.locations.length > 0) {
      return `在${midMem.locations[0]}的经历`;
    } else if (midMem.characters.length > 0) {
      return `与${midMem.characters[0]}的互动`;
    } else {
      return '重要事件记录';
    }
  }

  /**
   * 发送总结请求
   */
  private async sendSummaryRequest(prompt: string): Promise<string> {
    if (this.config.summaryApiEndpoint && this.tavernHelper) {
      // 使用独立的总结API
      // 这里需要实现HTTP请求逻辑
      console.log('[记忆系统] 使用独立总结API');
    }

    // 回退到酒馆API
    if (this.tavernHelper) {
      const response = await this.tavernHelper.generateResponse(prompt);
      return response;
    }
    throw new Error('Tavern helper not initialized');
  }

  /**
   * 解析总结响应 - 简化版不用正则
   */
  private parseSummaryResponse(response: string): Record<string, any> | null {
    try {
      // 查找 ```json 标记
      const jsonStart = response.indexOf('```json');
      const jsonEnd = response.indexOf('```', jsonStart + 7);
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        // 提取JSON内容
        const jsonContent = response.substring(jsonStart + 7, jsonEnd).trim();
        return JSON.parse(jsonContent);
      }

      // 尝试直接解析
      const lines = response.split('\n');
      const jsonLine = lines.find(line => line.trim().startsWith('{'));
      if (jsonLine) {
        return JSON.parse(jsonLine);
      }

    } catch (error) {
      console.error('[记忆系统] 总结响应解析失败:', error);
    }

    return null;
  }

  /**
   * 生成用于AI对话的上下文
   */
  public generateContextForAI(): string {
    let context = '';

    // 添加长期记忆
    if (this.longTermMemories.length > 0) {
      context += '\n[长期记忆]\n';
      this.longTermMemories
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 10)
        .forEach(mem => {
          context += `- ${mem.title}: ${mem.description}\n`;
        });
    }

    // 添加中期记忆
    if (this.midTermMemories.length > 0) {
      context += '\n[中期记忆]\n';
      this.midTermMemories
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5)
        .forEach(mem => {
          context += `- ${mem.summary}\n`;
        });
    }

    // 添加短期记忆
    if (this.shortTermMemories.length > 0) {
      context += '\n[最新对话]\n';
      this.shortTermMemories.forEach(msg => {
        context += `[${msg.role}] ${msg.content}\n`;
      });
    }

    return context;
  }

  /**
   * 保存记忆到本地存储
   */
  private saveMemoriesToStorage(): void {
    try {
      const memoryData = {
        shortTerm: this.shortTermMemories,
        midTerm: this.midTermMemories,
        longTerm: this.longTermMemories,
        config: this.config,
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem('game-memory-system', JSON.stringify(memoryData));
    } catch (error) {
      console.error('[记忆系统] 保存失败:', error);
    }
  }

  /**
   * 从本地存储加载记忆
   */
  private loadMemoriesFromStorage(): void {
    try {
      const stored = localStorage.getItem('game-memory-system');
      if (stored) {
        const memoryData = JSON.parse(stored);
        this.shortTermMemories = memoryData.shortTerm || [];
        this.midTermMemories = memoryData.midTerm || [];
        this.longTermMemories = memoryData.longTerm || [];
        if (memoryData.config) {
          this.config = { ...this.config, ...memoryData.config };
        }
        console.log('[记忆系统] 从本地存储加载记忆完成');
      }
    } catch (error) {
      console.error('[记忆系统] 加载失败:', error);
    }
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveMemoriesToStorage();
    console.log('[记忆系统] 配置已更新:', this.config);
  }

  /**
   * 获取记忆统计
   */
  public getMemoryStats(): Record<string, unknown> {
    return {
      shortTerm: {
        count: this.shortTermMemories.length,
        limit: this.config.shortTermLimit,
      },
      midTerm: {
        count: this.midTermMemories.length,
        totalMessages: this.midTermMemories.reduce((sum, mem) => sum + mem.messageCount, 0),
      },
      longTerm: {
        count: this.longTermMemories.length,
      },
      config: this.config,
    };
  }

  /**
   * 清理记忆
   */
  public clearMemories(type?: 'short' | 'mid' | 'long' | 'all'): void {
    switch (type) {
      case 'short':
        this.shortTermMemories = [];
        break;
      case 'mid':
        this.midTermMemories = [];
        break;
      case 'long':
        this.longTermMemories = [];
        break;
      default:
        this.shortTermMemories = [];
        this.midTermMemories = [];
        this.longTermMemories = [];
    }
    this.saveMemoriesToStorage();
    console.log('[记忆系统] 记忆已清理:', type || 'all');
  }

  /**
   * 手动触发摘要
   */
  public async triggerManualSummary(): Promise<void> {
    if (this.shortTermMemories.length > 0) {
      await this.triggerMidTermConversion();
      toast.success('记忆摘要已生成');
    } else {
      toast.warning('没有可供总结的短期记忆');
    }
  }

  /**
   * 处理记忆更新（从AI响应中处理记忆相关更新）
   */
  public async processMemoryUpdates(memoryUpdates: Record<string, any>): Promise<void> {
    try {
      if (!memoryUpdates) return;

      // 处理新增的短期记忆
      if (memoryUpdates.shortTermAdditions && Array.isArray(memoryUpdates.shortTermAdditions)) {
        for (const messageContent of memoryUpdates.shortTermAdditions) {
          const message: ChatMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            role: 'system',
            content: messageContent,
            timestamp: new Date().toISOString(),
          };
          this.addMessage(message);
        }
      }

      // 处理直接添加的记忆消息
      if (memoryUpdates.messages && Array.isArray(memoryUpdates.messages)) {
        for (const message of memoryUpdates.messages) {
          if (message.role && message.content) {
            const chatMessage: ChatMessage = {
              id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              role: message.role,
              content: message.content,
              timestamp: message.timestamp || new Date().toISOString(),
              metadata: message.metadata,
            };
            this.addMessage(chatMessage);
          }
        }
      }

      // 处理长期记忆更新
      if (memoryUpdates.longTermMemories && Array.isArray(memoryUpdates.longTermMemories)) {
        for (const ltMemory of memoryUpdates.longTermMemories) {
          const longTermMemory: LongTermMemory = {
            id: ltMemory.id || `long_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: ltMemory.title || '重要事件',
            description: ltMemory.description || '',
            timestamp: ltMemory.timestamp || new Date().toISOString(),
            category: ltMemory.category || 'event',
            importance: ltMemory.importance || 5,
            relatedMemories: ltMemory.relatedMemories || [],
            tags: ltMemory.tags || [],
          };
          this.longTermMemories.push(longTermMemory);
        }
      }

      // 处理配置更新
      if (memoryUpdates.configUpdate) {
        this.updateConfig(memoryUpdates.configUpdate);
      }

      // 如果有强制摘要请求
      if (memoryUpdates.triggerSummary) {
        await this.triggerManualSummary();
      }

      console.log('[记忆系统] 记忆更新处理完成');
    } catch (error) {
      console.error('[记忆系统] 处理记忆更新失败:', error);
      throw error;
    }
  }
}

// 单例模式实现
class MultiLayerMemorySystemSingleton {
  private static instance: MultiLayerMemorySystemClass | null = null;

  public static getInstance(): MultiLayerMemorySystemClass {
    if (!this.instance) {
      this.instance = new MultiLayerMemorySystemClass();
    }
    return this.instance;
  }
}

// 导出单例访问器
export const MultiLayerMemorySystem = {
  getInstance: () => MultiLayerMemorySystemSingleton.getInstance()
};

export default MultiLayerMemorySystem;
