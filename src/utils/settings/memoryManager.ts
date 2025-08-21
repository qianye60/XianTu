/**
 * @fileoverview 记忆管理器 - 处理分层记忆和API调用
 */

import type { MemorySystem } from '../prompts/comprehensiveAISystem';
import type { AIMemorySettings } from './memorySettings';
import { getTavernHelper } from '../tavern';
import { toast } from '../toast';

/**
 * 记忆条目接口
 */
export interface MemoryEntry {
  id: string;
  content: string;
  timestamp: number;
  type: 'user_action' | 'ai_response' | 'system_event' | 'summary';
  importance: number; // 1-10，重要性评分
  category: 'combat' | 'social' | 'cultivation' | 'exploration' | 'other';
  metadata?: {
    location?: string;
    npcs?: string[];
    items?: string[];
    skills?: string[];
  };
}

/**
 * API请求队列项
 */
interface APIRequest {
  id: string;
  type: 'memory_summarize' | 'map_update' | 'npc_status' | 'world_events';
  prompt: string;
  priority: number; // 1-10，优先级
  retryCount: number;
  onSuccess: (result: string) => void;
  onError: (error: Error) => void;
}

/**
 * AI记忆管理器
 */
export class AIMemoryManager {
  private settings: AIMemorySettings;
  private memorySystem: MemorySystem;
  private apiQueue: APIRequest[] = [];
  private isProcessingQueue = false;
  private activeRequests = 0;

  constructor(settings: AIMemorySettings, initialMemory?: MemorySystem) {
    this.settings = settings;
    this.memorySystem = initialMemory || {
      short_term: [],
      mid_term: [],
      long_term: [],
      npc_interactions: {}
    };
  }

  /**
   * 添加新的记忆条目
   */
  async addMemoryEntry(
    content: string,
    type: MemoryEntry['type'],
    category: MemoryEntry['category'] = 'other',
    importance: number = 5,
    metadata?: MemoryEntry['metadata']
  ): Promise<void> {
    const entry: MemoryEntry = {
      id: this.generateId(),
      content,
      type,
      category,
      importance,
      timestamp: Date.now(),
      metadata
    };

    // 根据重要性和类型决定放入哪个记忆层级
    if (importance >= 8 || type === 'summary') {
      // 高重要性直接进入中期记忆
      await this.addToMidTermMemory(entry);
    } else {
      // 普通记忆进入短期记忆
      await this.addToShortTermMemory(entry);
    }
  }

  /**
   * 添加到短期记忆
   */
  private async addToShortTermMemory(entry: MemoryEntry): Promise<void> {
    this.memorySystem.short_term.unshift(entry.content);

    // 检查是否需要转换到中期记忆
    if (this.memorySystem.short_term.length > this.settings.memory.shortTerm.maxLength) {
      if (this.settings.memory.shortTerm.autoConvert) {
        await this.convertShortToMidTerm();
      } else {
        // 如果不自动转换，直接删除最旧的记忆
        this.memorySystem.short_term.pop();
      }
    }
  }

  /**
   * 添加到中期记忆
   */
  private async addToMidTermMemory(entry: MemoryEntry): Promise<void> {
    this.memorySystem.mid_term.unshift(entry.content);

    // 检查是否需要总结
    if (this.memorySystem.mid_term.length >= this.settings.memory.midTerm.summarizeThreshold &&
        this.settings.memory.midTerm.autoSummarize) {
      await this.triggerMidTermSummary();
    }
  }

  /**
   * 将短期记忆转换为中期记忆
   */
  private async convertShortToMidTerm(): Promise<void> {
    const oldestShortTerm = this.memorySystem.short_term.pop();
    if (oldestShortTerm) {
      // 直接转换，不需要总结（按用户要求）
      this.memorySystem.mid_term.unshift(oldestShortTerm);
      
      console.log('[记忆管理] 短期记忆已转换为中期记忆:', oldestShortTerm.substring(0, 50) + '...');
      
      // 检查中期记忆是否需要总结
      if (this.memorySystem.mid_term.length >= this.settings.memory.midTerm.summarizeThreshold) {
        await this.triggerMidTermSummary();
      }
    }
  }

  /**
   * 触发中期记忆总结
   */
  private async triggerMidTermSummary(): Promise<void> {
    if (this.memorySystem.mid_term.length < this.settings.memory.midTerm.summarizeThreshold) {
      return;
    }

    const memoriesToSummarize = this.memorySystem.mid_term.splice(
      this.settings.memory.midTerm.summarizeThreshold - 5 // 保留最新的5条
    );

    if (memoriesToSummarize.length === 0) return;

    const summaryPrompt = this.buildSummaryPrompt(memoriesToSummarize);

    try {
      const summary = await this.callSecondaryAPI(summaryPrompt, 'memory_summarize');
      
      // 将总结添加到长期记忆
      this.memorySystem.long_term.unshift(summary);
      
      // 管理长期记忆长度
      this.manageLongTermMemory();
      
      console.log('[记忆管理] 中期记忆已成功总结并转入长期记忆');
      toast.success('记忆已整理完毕');
      
    } catch (error) {
      console.error('[记忆管理] 记忆总结失败:', error);
      // 如果总结失败，将记忆重新放回
      this.memorySystem.mid_term.push(...memoriesToSummarize);
      toast.warning('记忆整理暂时失败，已保留原始记忆');
    }
  }

  /**
   * 管理长期记忆长度
   */
  private manageLongTermMemory(): void {
    if (!this.settings.memory.longTerm.unlimited && 
        this.settings.memory.longTerm.maxLength) {
      while (this.memorySystem.long_term.length > this.settings.memory.longTerm.maxLength) {
        this.memorySystem.long_term.pop();
      }
    }
  }

  /**
   * 构建总结提示词
   */
  private buildSummaryPrompt(memories: string[]): string {
    return `
## **记忆整理任务**

你需要将以下${memories.length}条中期记忆整理成一份简洁的总结，保留关键信息：

### **待整理的记忆:**
${memories.map((memory, index) => `${index + 1}. ${memory}`).join('\n')}

### **整理要求:**
- 保留重要的人物、地点、物品、技能信息
- 突出关键决定和重要事件的结果
- 删除重复和琐碎的细节
- 保持时间顺序和因果关系
- 字数控制在200字以内

### **输出格式:**
直接返回整理后的记忆总结，不要包含额外的解释或标记。
`;
  }

  /**
   * 调用副API
   */
  private async callSecondaryAPI(prompt: string, type: APIRequest['type']): Promise<string> {
    return new Promise((resolve, reject) => {
      const request: APIRequest = {
        id: this.generateId(),
        type,
        prompt,
        priority: this.getTypePriority(type),
        retryCount: 0,
        onSuccess: resolve,
        onError: reject
      };

      this.apiQueue.push(request);
      this.processAPIQueue();
    });
  }

  /**
   * 处理API请求队列
   */
  private async processAPIQueue(): Promise<void> {
    if (this.isProcessingQueue || this.apiQueue.length === 0) {
      return;
    }

    if (this.activeRequests >= this.settings.api.conflictResolution.concurrentLimit) {
      return;
    }

    this.isProcessingQueue = true;
    
    // 按优先级排序
    this.apiQueue.sort((a, b) => b.priority - a.priority);
    
    const request = this.apiQueue.shift();
    if (!request) {
      this.isProcessingQueue = false;
      return;
    }

    this.activeRequests++;
    
    try {
      const result = await this.executeAPIRequest(request);
      request.onSuccess(result);
    } catch (error) {
      if (request.retryCount < this.settings.api.conflictResolution.retrySettings.maxRetries) {
        request.retryCount++;
        // 重新加入队列，降低优先级
        request.priority = Math.max(1, request.priority - 1);
        this.apiQueue.push(request);
        
        await new Promise(resolve => 
          setTimeout(resolve, this.settings.api.conflictResolution.retrySettings.retryDelay)
        );
      } else {
        request.onError(error as Error);
      }
    } finally {
      this.activeRequests--;
      this.isProcessingQueue = false;
      
      // 继续处理队列中的其他请求
      if (this.apiQueue.length > 0) {
        setTimeout(() => this.processAPIQueue(), 100);
      }
    }
  }

  /**
   * 执行API请求
   */
  private async executeAPIRequest(request: APIRequest): Promise<string> {
    const { secondaryAPI } = this.settings.api;
    
    if (!secondaryAPI.enabled || !secondaryAPI.usageScenarios.includes(request.type)) {
      // 如果副API未启用或不支持此场景，回退到主API
      return this.callPrimaryAPI(request.prompt);
    }

    switch (secondaryAPI.type) {
      case 'tavern_secondary':
        return this.callTavernSecondaryAPI(request.prompt);
      
      case 'openai':
        return this.callOpenAI(request.prompt);
      
      case 'anthropic':
        return this.callAnthropic(request.prompt);
      
      case 'local':
      case 'custom':
        return this.callCustomAPI(request.prompt);
      
      default:
        throw new Error(`不支持的API类型: ${secondaryAPI.type}`);
    }
  }

  /**
   * 调用SillyTavern主API
   */
  private async callPrimaryAPI(prompt: string): Promise<string> {
    const helper = getTavernHelper();
    if (!helper) {
      throw new Error('无法连接到SillyTavern主API');
    }

    return helper.generateRaw(prompt);
  }

  /**
   * 调用SillyTavern副API（如果存在）
   */
  private async callTavernSecondaryAPI(prompt: string): Promise<string> {
    const helper = getTavernHelper();
    if (!helper) {
      throw new Error('无法连接到SillyTavern副API');
    }

    // 使用较低的参数设置进行后台任务
    return helper.generateRaw(prompt, {
      temperature: this.settings.api.secondaryAPI.temperature || 0.3,
      max_tokens: this.settings.api.secondaryAPI.maxTokens || 1000
    });
  }

  /**
   * 调用OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const { secondaryAPI } = this.settings.api;
    
    if (!secondaryAPI.apiKey) {
      throw new Error('OpenAI API密钥未配置');
    }

    const response = await fetch(secondaryAPI.endpoint || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secondaryAPI.apiKey}`
      },
      body: JSON.stringify({
        model: secondaryAPI.model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: secondaryAPI.maxTokens || 1000,
        temperature: secondaryAPI.temperature || 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API请求失败: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * 调用Anthropic API
   */
  private async callAnthropic(prompt: string): Promise<string> {
    const { secondaryAPI } = this.settings.api;
    
    if (!secondaryAPI.apiKey) {
      throw new Error('Anthropic API密钥未配置');
    }

    const response = await fetch(secondaryAPI.endpoint || 'https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': secondaryAPI.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: secondaryAPI.model || 'claude-3-haiku-20240307',
        max_tokens: secondaryAPI.maxTokens || 1000,
        temperature: secondaryAPI.temperature || 0.3,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API请求失败: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  }

  /**
   * 调用自定义API
   */
  private async callCustomAPI(prompt: string): Promise<string> {
    const { secondaryAPI } = this.settings.api;
    
    if (!secondaryAPI.endpoint) {
      throw new Error('自定义API端点未配置');
    }

    const response = await fetch(secondaryAPI.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secondaryAPI.apiKey && { 'Authorization': `Bearer ${secondaryAPI.apiKey}` })
      },
      body: JSON.stringify({
        prompt,
        max_tokens: secondaryAPI.maxTokens || 1000,
        temperature: secondaryAPI.temperature || 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`自定义API请求失败: ${response.statusText}`);
    }

    const data = await response.json();
    // 尝试不同的响应格式
    return data.response || data.text || data.content || data.choices?.[0]?.text || '';
  }

  /**
   * 获取任务类型优先级
   */
  private getTypePriority(type: APIRequest['type']): number {
    const priorities = {
      'memory_summarize': 8, // 记忆总结优先级高
      'npc_status': 6,
      'map_update': 4,
      'world_events': 2
    };
    return priorities[type] || 1;
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 更新设置
   */
  updateSettings(newSettings: AIMemorySettings): void {
    this.settings = newSettings;
  }

  /**
   * 获取当前记忆系统状态
   */
  getMemorySystem(): MemorySystem {
    return { ...this.memorySystem };
  }

  /**
   * 获取记忆统计信息
   */
  getMemoryStats(): {
    shortTermCount: number;
    midTermCount: number;
    longTermCount: number;
    npcInteractionCount: number;
    queueLength: number;
    activeRequests: number;
  } {
    return {
      shortTermCount: this.memorySystem.short_term.length,
      midTermCount: this.memorySystem.mid_term.length,
      longTermCount: this.memorySystem.long_term.length,
      npcInteractionCount: Object.keys(this.memorySystem.npc_interactions).length,
      queueLength: this.apiQueue.length,
      activeRequests: this.activeRequests
    };
  }

  /**
   * 清空指定层级的记忆
   */
  clearMemory(level: 'short' | 'mid' | 'long' | 'npc' | 'all'): void {
    switch (level) {
      case 'short':
        this.memorySystem.short_term = [];
        break;
      case 'mid':
        this.memorySystem.mid_term = [];
        break;
      case 'long':
        this.memorySystem.long_term = [];
        break;
      case 'npc':
        this.memorySystem.npc_interactions = {};
        break;
      case 'all':
        this.memorySystem = {
          short_term: [],
          mid_term: [],
          long_term: [],
          npc_interactions: {}
        };
        break;
    }
    
    console.log(`[记忆管理] 已清空${level === 'all' ? '所有' : level}记忆`);
  }

  /**
   * 导出记忆数据
   */
  exportMemory(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      memorySystem: this.memorySystem,
      settings: this.settings
    }, null, 2);
  }

  /**
   * 导入记忆数据
   */
  importMemory(data: string): void {
    try {
      const imported = JSON.parse(data);
      if (imported.memorySystem) {
        this.memorySystem = imported.memorySystem;
      }
      if (imported.settings) {
        this.settings = imported.settings;
      }
      console.log('[记忆管理] 记忆数据导入成功');
      toast.success('记忆数据导入成功');
    } catch (error) {
      console.error('[记忆管理] 记忆数据导入失败:', error);
      toast.error('记忆数据导入失败');
    }
  }
}