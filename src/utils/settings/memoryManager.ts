/**
 * @fileoverview 记忆管理器 - 处理分层记忆和API调用
 */

import type { MemorySystem } from '../prompts/aiSystemConverter';
import type { AIMemorySettings } from './memorySettings';
import { getTavernHelper } from '../tavern';
import { toast } from '../toast';
import type { MemoryEntry } from '@/types/game';


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
      timestamp: new Date(),
      metadata,
      tags: []
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
   * 添加到短期记忆（FIFO队列）
   */
  private async addToShortTermMemory(entry: MemoryEntry): Promise<void> {
    // 从队头插入新记忆
    this.memorySystem.short_term.unshift(entry.content);

    // 队列满了，弹出最旧的记忆（队尾）
    if (this.memorySystem.short_term.length > this.settings.memory.shortTerm.maxLength) {
      const oldest = this.memorySystem.short_term.pop();

      if (this.settings.memory.shortTerm.autoConvert && oldest) {
        // 转移到中期记忆队列
        this.memorySystem.mid_term.unshift(oldest);
        console.log('[记忆-短期→中期] 直接转移');

        // 检查中期队列是否需要总结
        await this.checkMidTermOverflow();
      }
    }
  }

  /**
   * 添加到中期记忆（FIFO队列）
   */
  private async addToMidTermMemory(entry: MemoryEntry): Promise<void> {
    // 从队头插入新记忆
    this.memorySystem.mid_term.unshift(entry.content);

    // 检查中期队列是否需要总结
    await this.checkMidTermOverflow();
  }

  /**
   * 检查中期记忆是否超出阈值，需要总结压缩
   */
  private async checkMidTermOverflow(): Promise<void> {
    if (!this.settings.memory.midTerm.autoSummarize) {
      return;
    }

    const threshold = this.settings.memory.midTerm.summarizeThreshold;
    if (this.memorySystem.mid_term.length > threshold) {
      // 超过阈值，把最旧的一批记忆总结成长期记忆
      const batchSize = Math.floor(threshold / 2); // 每次总结一半
      const oldMemories = this.memorySystem.mid_term.splice(-batchSize); // 从队尾取出最旧的

      await this.summarizeAndArchive(oldMemories);
    }
  }

  /**
   * 将多条记忆总结并归档到长期记忆
   */
  private async summarizeAndArchive(memories: string[]): Promise<void> {
    if (memories.length === 0) return;

    const summaryPrompt = this.buildSummaryPrompt(memories);

    try {
      const summary = await this.callSecondaryAPI(summaryPrompt, 'memory_summarize');

      // 将总结加入长期记忆队列
      this.memorySystem.long_term.unshift(summary);

      // 管理长期记忆长度（FIFO）
      this.manageLongTermMemory();

      console.log(`[记忆-中期→长期] 已总结${memories.length}条记忆`);
      toast.success('记忆已整理完毕');

    } catch (error) {
      console.error('[记忆管理] 总结失败:', error);
      // 总结失败，将记忆放回中期队列
      this.memorySystem.mid_term.push(...memories);
      toast.warning('记忆整理失败，已保留原始记忆');
    }
  }

  /**
   * 管理长期记忆长度（FIFO队列）
   */
  private manageLongTermMemory(): void {
    if (!this.settings.memory.longTerm.unlimited &&
        this.settings.memory.longTerm.maxLength) {
      while (this.memorySystem.long_term.length > this.settings.memory.longTerm.maxLength) {
        this.memorySystem.long_term.pop(); // 弹出最旧的
      }
    }
  }

  /**
   * 构建总结提示词（限制长度避免token爆炸）
   */
  private buildSummaryPrompt(memories: string[]): string {
    // 截断每条记忆，避免完整传输导致token爆炸
    const MAX_MEMORY_LENGTH = 200; // 每条记忆最多200字符
    const truncatedMemories = memories.map(m =>
      m.length > MAX_MEMORY_LENGTH ? m.substring(0, MAX_MEMORY_LENGTH) + '...' : m
    );

    return `
# 记忆整理任务
将以下${memories.length}条记忆整理成简洁总结：

${truncatedMemories.map((memory, index) => `${index + 1}. ${memory}`).join('\n')}

**要求**: 保留关键人物、地点、事件结果，删除重复细节，200字内，直接返回总结。
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

    const result = await helper.generateRaw({
      user_input: prompt,
      max_tokens: 8000
    });
    return String(result);
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
    const result = await helper.generateRaw({
      user_input: prompt,
      temperature: this.settings.api.secondaryAPI.temperature || 0.3,
      max_tokens: this.settings.api.secondaryAPI.maxTokens || 8000
    });
    return String(result);
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
    queueLength: number;
    activeRequests: number;
  } {
    return {
      shortTermCount: this.memorySystem.short_term.length,
      midTermCount: this.memorySystem.mid_term.length,
      longTermCount: this.memorySystem.long_term.length,
      queueLength: this.apiQueue.length,
      activeRequests: this.activeRequests
    };
  }

  /**
   * 清空指定层级的记忆
   */
  clearMemory(level: 'short' | 'mid' | 'long' | 'all'): void {
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
      case 'all':
        this.memorySystem = {
          short_term: [],
          mid_term: [],
          long_term: []
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
