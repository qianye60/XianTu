/**
 * 统一AI服务 - 支持酒馆和自定义API
 *
 * 双模式架构：
 * 1. 酒馆模式（Tavern）:
 *    - 主API（main）: 永远通过酒馆TavernHelper调用，使用酒馆配置的API
 *    - 辅助功能（cot/text_optimization等）: 如果配置了独立API，则使用自定义API调用
 *
 * 2. 网页模式（Web/Custom）:
 *    - 所有功能都通过配置的自定义API调用
 *    - 可为不同功能分配不同的API
 */
import axios from 'axios';
import type { APIUsageType, APIConfig as StoreAPIConfig } from '@/stores/apiManagementStore';

// ============ API提供商类型 ============
export type APIProvider = 'openai' | 'claude' | 'gemini' | 'deepseek' | 'custom';

// ============ 配置接口 ============
export interface AIConfig {
  mode: 'tavern' | 'custom';
  streaming?: boolean;
  memorySummaryMode?: 'raw' | 'standard';
  initMode?: 'generate' | 'generateRaw';
  customAPI?: {
    provider: APIProvider;  // API提供商
    url: string;
    apiKey: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
}

// API提供商预设配置
export const API_PROVIDER_PRESETS: Record<APIProvider, { url: string; defaultModel: string; name: string }> = {
  openai: { url: 'https://api.openai.com', defaultModel: 'gpt-4o', name: 'OpenAI' },
  claude: { url: 'https://api.anthropic.com', defaultModel: 'claude-sonnet-4-20250514', name: 'Claude' },
  gemini: { url: 'https://generativelanguage.googleapis.com', defaultModel: 'gemini-2.0-flash', name: 'Gemini' },
  deepseek: { url: 'https://api.deepseek.com', defaultModel: 'deepseek-chat', name: 'DeepSeek' },
  custom: { url: '', defaultModel: '', name: '自定义(OpenAI兼容)' }
};

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateOptions {
  user_input?: string;
  ordered_prompts?: AIMessage[];
  should_stream?: boolean;
  generation_id?: string;
  /** 功能类型，用于多API配置时选择对应的API，不填则使用主API */
  usageType?: APIUsageType;
  injects?: Array<{
    content: string;
    role: 'system' | 'assistant' | 'user';
    depth: number;
    position: 'in_chat' | 'none';
  }>;
  overrides?: {
    world_info_before?: string;
    world_info_after?: string;
  };
  onStreamChunk?: (chunk: string) => void;
}

// ============ AI服务类 ============
class AIService {
  private config: AIConfig = {
    mode: 'tavern',
    streaming: true,
    memorySummaryMode: 'raw',
    initMode: 'generate',
    customAPI: {
      provider: 'openai',
      url: '',
      apiKey: '',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 16000  // 输出token上限
    }
  };

  // 用于取消正在进行的请求
  private abortController: AbortController | null = null;
  private isAborted = false;

  constructor() {
    this.loadConfig();
  }

  /**
   * 取消所有正在进行的请求（包括重试中的请求）
   */
  cancelAllRequests() {
    console.log('[AI服务] 取消所有请求');
    this.isAborted = true;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * 重置取消状态（在新请求开始前调用）
   */
  private resetAbortState() {
    this.isAborted = false;
    this.abortController = new AbortController();
  }

  private syncModeWithEnvironment() {
    this.config.mode = this.isTavernEnvironment() ? 'tavern' : 'custom';
  }

  private loadConfig() {
    try {
      const saved = localStorage.getItem('ai_service_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.config = { ...this.config, ...parsed };
        console.log('[AI服务] 配置已加载:', this.config.mode);
        // 强制按运行环境选择默认模式：酒馆=酒馆API，非酒馆=自定义API
        this.syncModeWithEnvironment();
        return;
      }
      // 没有保存配置时：酒馆默认用酒馆模式，网页版默认用自定义API
      this.syncModeWithEnvironment();
    } catch (e) {
      console.error('[AI服务] 加载配置失败:', e);
    }
  }

  saveConfig(config: Partial<AIConfig>) {
    this.config = { ...this.config, ...config };
    // 强制按运行环境选择默认模式：酒馆=酒馆API，非酒馆=自定义API
    this.syncModeWithEnvironment();
    // 自动清理自定义API URL末尾的 /v1 和 / 后缀
    if (this.config.customAPI?.url) {
      this.config.customAPI.url = this.config.customAPI.url
        .replace(/\/v1\/?$/, '')  // 移除末尾的 /v1 或 /v1/
        .replace(/\/+$/, '');      // 移除末尾的斜杠
    }
    localStorage.setItem('ai_service_config', JSON.stringify(this.config));
    console.log('[AI服务] 配置已保存:', this.config.mode);
  }

  /**
   * 直接使用指定API配置进行测试（绕过环境检测，强制直连）
   */
  async testAPIDirectly(apiConfig: {
    provider: APIProvider;
    url: string;
    apiKey: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  }, testPrompt: string): Promise<string> {
    console.log(`[AI服务] 直接测试API: ${apiConfig.url}, model: ${apiConfig.model}`);

    // 临时保存当前配置
    const originalConfig = this.config.customAPI ? { ...this.config.customAPI } : null;
    const originalMode = this.config.mode;

    try {
      // 强制使用custom模式和指定的API配置
      this.config.mode = 'custom';
      this.config.customAPI = {
        provider: apiConfig.provider,
        url: apiConfig.url.replace(/\/v1\/?$/, '').replace(/\/+$/, ''),
        apiKey: apiConfig.apiKey,
        model: apiConfig.model,
        temperature: apiConfig.temperature ?? 0.7,
        maxTokens: apiConfig.maxTokens ?? 1000
      };

      // 直接调用自定义API（不走环境检测）
      return await this.generateWithCustomAPI({
        user_input: testPrompt,
        should_stream: false
      });
    } finally {
      // 恢复原配置
      this.config.mode = originalMode;
      if (originalConfig) {
        this.config.customAPI = originalConfig;
      }
    }
  }

  getConfig(): AIConfig {
    return { ...this.config };
  }

  /**
   * 获取可用模型列表
   */
  async fetchModels(): Promise<string[]> {
    if (!this.config.customAPI?.url || !this.config.customAPI?.apiKey) {
      throw new Error('请先配置API地址和密钥');
    }

    try {
      const baseUrl = this.config.customAPI.url.replace(/\/+$/, '');
      const response = await axios.get(`${baseUrl}/v1/models`, {
        headers: { 'Authorization': `Bearer ${this.config.customAPI.apiKey}` }
      });

      return response.data.data?.map((m: any) => m.id) || [];
    } catch (error) {
      console.error('[AI服务] 获取模型列表失败:', error);
      throw new Error('获取模型列表失败');
    }
  }

  /**
   * 根据 usageType 获取对应的 API 配置
   * 返回 null 表示使用默认配置
   */
  private getAPIConfigForUsageType(usageType?: APIUsageType): StoreAPIConfig | null {
    if (!usageType) return null;

    try {
      // 动态导入 store 避免循环依赖
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useAPIManagementStore } = require('@/stores/apiManagementStore');
      const apiStore = useAPIManagementStore();

      // 获取该功能分配的 API
      const apiConfig = apiStore.getAPIForType(usageType);
      if (!apiConfig) return null;

      // 如果是默认 API，返回 null 表示使用主配置
      if (apiConfig.id === 'default') return null;

      return apiConfig;
    } catch (e) {
      console.warn('[AI服务] 获取功能API配置失败，使用默认配置:', e);
      return null;
    }
  }

  /**
   * 标准生成（带角色卡、聊天历史）
   *
   * 酒馆端逻辑：
   * - usageType='main' 或未指定 → 永远走酒馆TavernHelper
   * - 其他usageType且配置了独立API → 走自定义API
   *
   * 网页端逻辑：
   * - 根据usageType查找对应API配置
   * - 如果没有配置独立API，使用默认API
   */
  async generate(options: GenerateOptions): Promise<string> {
    // 重置取消状态
    this.resetAbortState();

    this.syncModeWithEnvironment();
    const usageType = options.usageType || 'main';
    console.log(`[AI服务] 调用generate，模式: ${this.config.mode}, usageType: ${usageType}`);

    // 酒馆模式特殊处理
    if (this.config.mode === 'tavern') {
      // 检查是否配置了独立API（非default）
      const apiConfig = this.getAPIConfigForUsageType(usageType);

      // 如果配置了独立API，直接请求，不走酒馆代理
      if (apiConfig) {
        console.log(`[AI服务-酒馆] 功能[${usageType}]使用独立API直连: ${apiConfig.name}`);
        return this.generateWithAPIConfig(options, {
          provider: apiConfig.provider,
          url: apiConfig.url,
          apiKey: apiConfig.apiKey,
          model: apiConfig.model,
          temperature: apiConfig.temperature,
          maxTokens: apiConfig.maxTokens
        });
      }

      // 没有配置独立API（使用default），走酒馆
      console.log(`[AI服务-酒馆] 功能[${usageType}]使用酒馆TavernHelper`);
      return this.generateWithTavern(options);
    }

    // 网页模式：检查是否需要使用特定功能的 API 配置
    const apiConfig = this.getAPIConfigForUsageType(usageType);
    if (apiConfig) {
      console.log(`[AI服务-网页] 使用功能[${usageType}]分配的API: ${apiConfig.name}`);
      return this.generateWithAPIConfig(options, {
        provider: apiConfig.provider,
        url: apiConfig.url,
        apiKey: apiConfig.apiKey,
        model: apiConfig.model,
        temperature: apiConfig.temperature,
        maxTokens: apiConfig.maxTokens
      });
    }

    // 网页模式默认
    return this.generateWithCustomAPI(options);
  }

  /**
   * 纯净生成（不带角色卡）
   *
   * 酒馆端逻辑：
   * - usageType='main' 或未指定 → 永远走酒馆TavernHelper
   * - 其他usageType且配置了独立API → 走自定义API
   *
   * 网页端逻辑：
   * - 根据usageType查找对应API配置
   * - 如果没有配置独立API，使用默认API
   */
  async generateRaw(options: GenerateOptions): Promise<string> {
    this.syncModeWithEnvironment();
    const usageType = options.usageType || 'main';
    console.log(`[AI服务] 调用generateRaw，模式: ${this.config.mode}, usageType: ${usageType}`);

    // 酒馆模式特殊处理
    if (this.config.mode === 'tavern') {
      // 检查是否配置了独立API（非default）
      const apiConfig = this.getAPIConfigForUsageType(usageType);

      // 如果配置了独立API，直接请求，不走酒馆代理
      if (apiConfig) {
        console.log(`[AI服务-酒馆] 功能[${usageType}]使用独立API直连(Raw): ${apiConfig.name}`);
        return this.generateRawWithAPIConfig(options, {
          provider: apiConfig.provider,
          url: apiConfig.url,
          apiKey: apiConfig.apiKey,
          model: apiConfig.model,
          temperature: apiConfig.temperature,
          maxTokens: apiConfig.maxTokens
        });
      }

      // 没有配置独立API（使用default），走酒馆
      console.log(`[AI服务-酒馆] 功能[${usageType}]使用酒馆TavernHelper(Raw)`);
      return this.generateRawWithTavern(options);
    }

    // 网页模式：检查是否需要使用特定功能的 API 配置
    const apiConfig = this.getAPIConfigForUsageType(usageType);
    if (apiConfig) {
      console.log(`[AI服务-网页] 使用功能[${usageType}]分配的API: ${apiConfig.name}`);
      return this.generateRawWithAPIConfig(options, {
        provider: apiConfig.provider,
        url: apiConfig.url,
        apiKey: apiConfig.apiKey,
        model: apiConfig.model,
        temperature: apiConfig.temperature,
        maxTokens: apiConfig.maxTokens
      });
    }

    // 网页模式默认
    return this.generateRawWithCustomAPI(options);
  }

  /**
   * 使用指定的API配置进行生成
   * 适用于多API配置场景，可以为不同功能使用不同的API
   */
  async generateWithAPIConfig(
    options: GenerateOptions,
    apiConfig: {
      provider: APIProvider;
      url: string;
      apiKey: string;
      model: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    console.log(`[AI服务] 使用指定API配置生成，provider: ${apiConfig.provider}, model: ${apiConfig.model}`);

    // 临时保存当前配置（深拷贝以避免引用问题）
    const originalConfig = this.config.customAPI ? { ...this.config.customAPI } : null;

    try {
      // 使用指定的API配置
      this.config.customAPI = {
        provider: apiConfig.provider,
        url: apiConfig.url,
        apiKey: apiConfig.apiKey,
        model: apiConfig.model,
        temperature: apiConfig.temperature ?? 0.7,
        maxTokens: apiConfig.maxTokens ?? 16000
      };

      // 强制使用custom模式
      const result = await this.generateWithCustomAPI(options);

      return result;
    } finally {
      // 恢复原配置
      if (originalConfig) {
        this.config.customAPI = originalConfig;
      }
    }
  }

  /**
   * 使用指定的API配置进行纯净生成（不带角色卡）
   */
  async generateRawWithAPIConfig(
    options: GenerateOptions,
    apiConfig: {
      provider: APIProvider;
      url: string;
      apiKey: string;
      model: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    console.log(`[AI服务] 使用指定API配置进行纯净生成，provider: ${apiConfig.provider}, model: ${apiConfig.model}`);

    // 临时保存当前配置（深拷贝以避免引用问题）
    const originalConfig = this.config.customAPI ? { ...this.config.customAPI } : null;

    try {
      // 使用指定的API配置
      this.config.customAPI = {
        provider: apiConfig.provider,
        url: apiConfig.url,
        apiKey: apiConfig.apiKey,
        model: apiConfig.model,
        temperature: apiConfig.temperature ?? 0.7,
        maxTokens: apiConfig.maxTokens ?? 16000
      };

      // 强制使用custom模式
      const result = await this.generateRawWithCustomAPI(options);

      return result;
    } finally {
      // 恢复原配置
      if (originalConfig) {
        this.config.customAPI = originalConfig;
      }
    }
  }

  // ============ 酒馆模式实现 ============
  private async generateWithTavern(options: GenerateOptions): Promise<string> {
    const tavernHelper = this.getTavernHelper();
    if (!tavernHelper) {
      throw new Error(this.isTavernEnvironment()
        ? '酒馆环境不可用，请切换到自定义API模式或在SillyTavern中打开'
        : '当前环境不可用，请切换到自定义API模式');
    }

    console.log('[AI服务-酒馆] 调用tavernHelper.generate');
    try {
      return await this.withRetry('tavern.generate', () => tavernHelper.generate(options));
    } catch (error) {
      throw this.toUserFacingError(error);
    }
  }

  private async generateRawWithTavern(options: GenerateOptions): Promise<string> {
    const tavernHelper = this.getTavernHelper();
    if (!tavernHelper) {
      throw new Error(this.isTavernEnvironment()
        ? '酒馆环境不可用，请切换到自定义API模式或在SillyTavern中打开'
        : '当前环境不可用，请切换到自定义API模式');
    }

    console.log('[AI服务-酒馆] 调用tavernHelper.generateRaw');
    try {
      const result = await this.withRetry('tavern.generateRaw', () => tavernHelper.generateRaw(options));
      return String(result);
    } catch (error) {
      throw this.toUserFacingError(error);
    }
  }

  private async withRetry<T>(
    label: string,
    fn: () => Promise<T>,
    opts?: { retries?: number; baseDelayMs?: number },
  ): Promise<T> {
    const retries = opts?.retries ?? 2; // 总尝试次数 = 1 + retries
    const baseDelayMs = opts?.baseDelayMs ?? 800;

    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      // 检查是否已取消
      if (this.isAborted) {
        console.log(`[AI服务] ${label} 请求已被取消，停止重试`);
        throw new Error('请求已取消');
      }

      try {
        return await fn();
      } catch (error) {
        // 再次检查取消状态
        if (this.isAborted) {
          console.log(`[AI服务] ${label} 请求已被取消，停止重试`);
          throw new Error('请求已取消');
        }

        lastError = error;
        const retryable = this.isRetryableError(error);
        if (!retryable || attempt >= retries) break;

        const jitter = Math.floor(Math.random() * 250);
        const delay = baseDelayMs * Math.pow(2, attempt) + jitter;
        console.warn(`[AI服务] ${label} 失败，准备重试 (${attempt + 1}/${retries + 1})，${delay}ms`, error);

        // 使用可中断的延迟
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, delay);
          // 如果在等待期间被取消，立即结束
          const checkAbort = setInterval(() => {
            if (this.isAborted) {
              clearTimeout(timer);
              clearInterval(checkAbort);
              reject(new Error('请求已取消'));
            }
          }, 100);
          // 正常完成时清理检查器
          setTimeout(() => clearInterval(checkAbort), delay + 10);
        });
      }
    }
    throw lastError;
  }

  private isRetryableError(error: unknown): boolean {
    const message = (() => {
      if (!error) return '';
      if (typeof error === 'string') return error;
      if (error instanceof Error) return error.message || '';
      return String(error);
    })();

    // axios / fetch-like errors
    const status = (() => {
      const anyErr = error as any;
      return anyErr?.status ?? anyErr?.response?.status ?? anyErr?.cause?.status ?? anyErr?.cause?.response?.status;
    })();

    if (typeof status === 'number') {
      return [408, 409, 425, 429, 500, 502, 503, 504].includes(status);
    }

    // SillyTavern/OpenAI proxy errors often只有 message
    if (/service unavailable/i.test(message)) return true;
    if (/\b(429|500|502|503|504)\b/.test(message)) return true;
    if (/timeout|timed out|network error|fetch failed/i.test(message)) return true;

    return false;
  }

  private toUserFacingError(error: unknown): Error {
    const anyErr = error as any;
    const message = (() => {
      if (!error) return '未知错误';
      if (typeof error === 'string') return error;
      if (error instanceof Error) return error.message || '未知错误';
      return String(error);
    })();

    const status = anyErr?.status ?? anyErr?.response?.status ?? anyErr?.cause?.status ?? anyErr?.cause?.response?.status;

    // 重点提示：503/服务不可用（用户日志里就是这个）
    if (status === 503 || /service unavailable/i.test(message)) {
      const e = new Error(
        'AI 服务暂不可用（Service Unavailable/503）。我已自动重试仍失败：如果在 SillyTavern 内使用，请检查当前 API 提供方/代理/额度是否正常；也可能是上游临时故障，稍后再试。'
      );
      (e as any).cause = error;
      return e;
    }

    if (status === 429 || /\b429\b/.test(message)) {
      const e = new Error('AI 请求过于频繁（429）。我已自动重试，仍失败请稍后再试或降低并发/频率。');
      (e as any).cause = error;
      return e;
    }

    // 保留原始信息，但避免直接把对象打印到 toast 里
    const e = new Error(message || 'AI 调用失败');
    (e as any).cause = error;
    return e;
  }

  /**
   * 递归向上查找 TavernHelper，兼容多层 iframe 嵌套
   * 最多查找 5 层，防止无限循环
   */
  private getTavernHelper(): any {
    if (typeof window === 'undefined') return null;

    // 先检查当前 window
    if ((window as any).TavernHelper) {
      return (window as any).TavernHelper;
    }

    try {
      // 尝试直接访问 top（最顶层窗口）
      if (window.top && window.top !== window && (window.top as any).TavernHelper) {
        return (window.top as any).TavernHelper;
      }
    } catch {
      // 跨域访问失败，忽略
    }

    // 逐层向上查找，最多 5 层
    let currentWindow: Window = window;
    for (let i = 0; i < 5; i++) {
      try {
        if (currentWindow.parent && currentWindow.parent !== currentWindow) {
          if ((currentWindow.parent as any).TavernHelper) {
            return (currentWindow.parent as any).TavernHelper;
          }
          currentWindow = currentWindow.parent;
        } else {
          break;
        }
      } catch {
        // 跨域访问失败，停止向上查找
        break;
      }
    }

    return null;
  }

  private isTavernEnvironment(): boolean {
    return !!this.getTavernHelper();
  }

  // ============ 自定义API模式实现 ============
  private async generateWithCustomAPI(options: GenerateOptions): Promise<string> {
    if (!this.config.customAPI) {
      throw new Error('自定义API未配置');
    }

    console.log('[AI服务-自定义] 构建消息列表');

    // 构建消息列表
    const messages: AIMessage[] = [];

    // 处理 injects（注入的系统提示词）
    if (options.injects && options.injects.length > 0) {
      // 按 depth 排序（depth越大越靠前）
      const sortedInjects = [...options.injects].sort((a, b) => b.depth - a.depth);
      sortedInjects.forEach(inject => {
        // 跳过占位消息
        if (inject.content === '</input>') {
          return;
        }
        messages.push({
          role: inject.role,
          content: inject.content
        });
      });
      console.log(`[AI服务-自定义] 已添加 ${messages.length} 条inject消息`);
    }

    // 添加用户输入
    if (options.user_input) {
      messages.push({
        role: 'user',
        content: options.user_input
      });
      console.log('[AI服务-自定义] 已添加用户输入');
    }

    const shouldStream = options.should_stream ?? this.config.streaming ?? false;
    return this.callAPI(messages, shouldStream, options.onStreamChunk);
  }

  private async generateRawWithCustomAPI(options: GenerateOptions): Promise<string> {
    if (!this.config.customAPI) {
      throw new Error('自定义API未配置');
    }

    console.log('[AI服务-自定义Raw] 使用ordered_prompts');

    // 过滤掉占位消息
    const messages = (options.ordered_prompts || []).filter(msg => msg.content !== '</input>');

    console.log(`[AI服务-自定义Raw] 消息数量: ${messages.length}`);
    const shouldStream = options.should_stream ?? this.config.streaming ?? false;
    return this.callAPI(messages, shouldStream, options.onStreamChunk);
  }

  private async callAPI(
    messages: AIMessage[],
    streaming: boolean,
    onStreamChunk?: (chunk: string) => void
  ): Promise<string> {
    const { provider, url, apiKey, model, temperature, maxTokens } = this.config.customAPI!;

    console.log(`[AI服务-API调用] Provider: ${provider}, URL: ${url}, Model: ${model}, 消息数: ${messages.length}, 流式: ${streaming}`);

    // 根据provider选择不同的调用方式
    switch (provider) {
      case 'claude':
        return this.callClaudeAPI(messages, streaming, onStreamChunk);
      case 'gemini':
        return this.callGeminiAPI(messages, streaming, onStreamChunk);
      case 'openai':
      case 'deepseek':
      case 'custom':
      default:
        return this.callOpenAICompatibleAPI(messages, streaming, onStreamChunk);
    }
  }

  // OpenAI兼容格式（OpenAI、DeepSeek、自定义）
  private estimateTokensForText(text: string): number {
    if (!text) return 0;
    let cjkCount = 0;
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      if (code >= 0x4e00 && code <= 0x9fff) cjkCount++;
    }
    const nonCjkCount = Math.max(0, text.length - cjkCount);
    return cjkCount + Math.ceil(nonCjkCount / 4);
  }

  private estimateTokensForMessages(messages: Array<{ content: string }>): number {
    const overheadPerMessage = 8;
    return messages.reduce((sum, msg) => sum + overheadPerMessage + this.estimateTokensForText(msg.content || ''), 0);
  }

  private getApproxContextWindow(provider: APIProvider, model: string): number | null {
    const m = (model || '').toLowerCase();

    // Provider/model with known large context windows
    if (provider === 'claude' || m.includes('claude')) return 200_000;
    if (provider === 'gemini' || m.includes('gemini')) return 1_000_000;

    // Many OpenAI-compatible providers expose these model names; match by model string first.
    if (m.includes('deepseek')) return 64_000;
    if (m.includes('moonshot') || m.includes('kimi')) return 128_000;

    // OpenAI-compatible defaults
    if (m.includes('gpt-4o') || m.includes('gpt-4.1') || m.includes('o1') || m.includes('o3')) return 128_000;
    if (m.includes('gpt-4')) return 128_000;
    if (m.includes('gpt-3.5')) return 16_385;

    // Unknown model: don't guess (this project often uses 10k+ token prompts).
    return null;
  }

  private clampMaxTokensForContext(
    provider: APIProvider,
    model: string,
    messagesForEstimate: Array<{ content: string }>,
    requestedMaxTokens: number
  ): number {
    const contextWindow = this.getApproxContextWindow(provider, model);
    if (!contextWindow) return requestedMaxTokens;

    const inputTokens = this.estimateTokensForMessages(messagesForEstimate);
    const safety = 512;
    const available = contextWindow - inputTokens - safety;

    if (available < 256) {
      throw new Error(`API上下文长度不足：输入过长（估算输入≈${inputTokens} tokens），请减少世界/提示词长度或更换更大上下文模型。`);
    }

    const clamped = Math.min(requestedMaxTokens, Math.max(256, available));
    if (clamped < requestedMaxTokens) {
      console.warn(`[AI服务] maxTokens过大，已自动下调：${requestedMaxTokens} -> ${clamped}（估算输入≈${inputTokens}，模型上下文≈${contextWindow}）`);
    }
    return clamped;
  }

  private isStreamUnsupportedError(message: string): boolean {
    const m = (message || '').toLowerCase();
    return (
      (m.includes('stream') && (m.includes('not supported') || m.includes('unsupported') || m.includes('invalid') || m.includes('unknown'))) ||
      m.includes('text/event-stream') ||
      m.includes('sse')
    );
  }

  private async callOpenAICompatibleAPI(
    messages: AIMessage[],
    streaming: boolean,
    onStreamChunk?: (chunk: string) => void
  ): Promise<string> {
    const { provider, url, apiKey, model, temperature, maxTokens } = this.config.customAPI!;
    const safeMaxTokens = this.clampMaxTokensForContext(provider, model, messages, maxTokens || 16000);

    try {
      if (streaming) {
        try {
          return await this.streamingRequestOpenAI(url, apiKey, model, messages, temperature || 0.7, safeMaxTokens, onStreamChunk);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!this.isStreamUnsupportedError(msg)) throw e;
          console.warn('[AI服务-OpenAI兼容] 当前API可能不支持流式传输，已自动降级为非流式请求。');

          const response = await axios.post(
            `${url}/v1/chat/completions`,
            {
              model,
              messages,
              temperature: temperature || 0.7,
              max_tokens: safeMaxTokens,
              stream: false
            },
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              timeout: 120000
            }
          );

          const content = response.data.choices[0].message.content;
          console.log(`[AIæœåŠ¡-OpenAI] å“åº”é•¿åº¦: ${content.length}`);
          return content;
        }
      } else {
        const response = await axios.post(
          `${url}/v1/chat/completions`,
          {
            model,
            messages,
            temperature: temperature || 0.7,
            max_tokens: safeMaxTokens,
            stream: false
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 120000
          }
        );

        const content = response.data.choices[0].message.content;
        console.log(`[AI服务-OpenAI] 响应长度: ${content.length}`);
        return content;
      }
    } catch (error) {
      console.error('[AI服务-OpenAI] 失败:', error);
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`API错误 ${error.response.status}: ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
          throw new Error('网络错误：无法连接到API服务器');
        }
      }
      throw new Error(`OpenAI API调用失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // Claude API格式
  private async callClaudeAPI(
    messages: AIMessage[],
    streaming: boolean,
    onStreamChunk?: (chunk: string) => void
  ): Promise<string> {
    const { provider, url, apiKey, model, temperature, maxTokens } = this.config.customAPI!;

    // 转换消息格式：提取system消息，其余转为Claude格式
    let systemPrompt = '';
    const claudeMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt += (systemPrompt ? '\n\n' : '') + msg.content;
      } else {
        claudeMessages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
      }
    }

    // 确保第一条是user消息（Claude要求）
    if (claudeMessages.length === 0 || claudeMessages[0].role !== 'user') {
      claudeMessages.unshift({ role: 'user', content: '请开始。' });
    }

    const baseUrl = url || 'https://api.anthropic.com';
    const safeMaxTokens = this.clampMaxTokensForContext(
      provider,
      model,
      [
        ...(systemPrompt ? [{ content: systemPrompt }] : []),
        ...claudeMessages.map(m => ({ content: m.content })),
      ],
      maxTokens || 16000
    );

    try {
      if (streaming) {
        try {
          return await this.streamingRequestClaude(baseUrl, apiKey, model, systemPrompt, claudeMessages, temperature || 0.7, safeMaxTokens, onStreamChunk);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!this.isStreamUnsupportedError(msg)) throw e;
          console.warn('[AI服务-Claude] 当前API可能不支持流式传输，已自动降级为非流式请求。');

          const response = await axios.post(
            `${baseUrl}/v1/messages`,
            {
              model,
              max_tokens: safeMaxTokens,
              system: systemPrompt || undefined,
              messages: claudeMessages,
              temperature: temperature || 0.7
            },
            {
              headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
              },
              timeout: 120000
            }
          );

          const content = response.data.content[0]?.text || '';
          console.log(`[AI服务-Claude] 响应长度: ${content.length}`);
          return content;
        }
      } else {
        const response = await axios.post(
          `${baseUrl}/v1/messages`,
          {
            model,
            max_tokens: safeMaxTokens,
            system: systemPrompt || undefined,
            messages: claudeMessages,
            temperature: temperature || 0.7
          },
          {
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json'
            },
            timeout: 120000
          }
        );

        const content = response.data.content[0]?.text || '';
        console.log(`[AI服务-Claude] 响应长度: ${content.length}`);
        return content;
      }
    } catch (error) {
      console.error('[AI服务-Claude] 失败:', error);
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`Claude API错误 ${error.response.status}: ${JSON.stringify(error.response.data)}`);
        }
      }
      throw new Error(`Claude API调用失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // Gemini API格式
  private async callGeminiAPI(
    messages: AIMessage[],
    streaming: boolean,
    onStreamChunk?: (chunk: string) => void
  ): Promise<string> {
    const { provider, url, apiKey, model, temperature, maxTokens } = this.config.customAPI!;

    // 转换为Gemini格式
    let systemInstruction = '';
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction += (systemInstruction ? '\n\n' : '') + msg.content;
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }

    // 确保至少有一条消息
    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: '请开始。' }] });
    }

    const baseUrl = url || 'https://generativelanguage.googleapis.com';
    const endpoint = streaming ? 'streamGenerateContent' : 'generateContent';
    const safeMaxTokens = this.clampMaxTokensForContext(
      provider,
      model,
      [
        ...(systemInstruction ? [{ content: systemInstruction }] : []),
        ...contents.map(c => ({ content: (c.parts || []).map(p => p.text).join('\n') })),
      ],
      maxTokens || 16000
    );

    try {
      if (streaming) {
        try {
          return await this.streamingRequestGemini(baseUrl, apiKey, model, systemInstruction, contents, temperature || 0.7, safeMaxTokens, onStreamChunk);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!this.isStreamUnsupportedError(msg)) throw e;
          console.warn('[AI服务-Gemini] 当前API可能不支持流式传输，已自动降级为非流式请求。');

          const response = await axios.post(
            `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              contents,
              systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
              generationConfig: {
                temperature: temperature || 0.7,
                maxOutputTokens: safeMaxTokens
              }
            },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 120000
            }
          );

          const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          console.log(`[AI服务-Gemini] 响应长度: ${content.length}`);
          return content;
        }
      } else {
        const response = await axios.post(
          `${baseUrl}/v1beta/models/${model}:${endpoint}?key=${apiKey}`,
          {
            contents,
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
            generationConfig: {
              temperature: temperature || 0.7,
              maxOutputTokens: safeMaxTokens
            }
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 120000
          }
        );

        const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log(`[AI服务-Gemini] 响应长度: ${content.length}`);
        return content;
      }
    } catch (error) {
      console.error('[AI服务-Gemini] 失败:', error);
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`Gemini API错误 ${error.response.status}: ${JSON.stringify(error.response.data)}`);
        }
      }
      throw new Error(`Gemini API调用失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // OpenAI格式流式请求
  private async streamingRequestOpenAI(
    url: string,
    apiKey: string,
    model: string,
    messages: AIMessage[],
    temperature: number,
    maxTokens: number,
    onStreamChunk?: (chunk: string) => void
  ): Promise<string> {
    console.log('[AI服务-OpenAI流式] 开始');

    const response = await fetch(`${url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`API错误 ${response.status}: ${await response.text()}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
      throw new Error(`Stream unsupported (content-type=${contentType || 'unknown'})`);
    }

    return this.processSSEStream(response, (data) => {
      const parsed = JSON.parse(data);
      const delta = parsed.choices[0]?.delta;
      // 🔥 兼容 Gemini/DeepSeek 等模型的 reasoning_content 字段
      // 这些模型会先输出 reasoning_content（思维链），然后输出 content（实际内容）
      // reasoning_content 会被包裹在 <thinking> 标签中，由 processSSEStream 过滤
      if (delta?.reasoning_content) {
        return `<thinking>${delta.reasoning_content}</thinking>`;
      }
      return delta?.content || '';
    }, onStreamChunk);
  }

  // Claude格式流式请求
  private async streamingRequestClaude(
    url: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    temperature: number,
    maxTokens: number,
    onStreamChunk?: (chunk: string) => void
  ): Promise<string> {
    console.log('[AI服务-Claude流式] 开始');

    const response = await fetch(`${url}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt || undefined,
        messages,
        temperature,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API错误 ${response.status}: ${await response.text()}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
      throw new Error(`Stream unsupported (content-type=${contentType || 'unknown'})`);
    }

    return this.processSSEStream(response, (data) => {
      const parsed = JSON.parse(data);
      // Claude流式响应格式：content_block_delta事件
      if (parsed.type === 'content_block_delta') {
        return parsed.delta?.text || '';
      }
      return '';
    }, onStreamChunk);
  }

  // Gemini格式流式请求
  private async streamingRequestGemini(
    url: string,
    apiKey: string,
    model: string,
    systemInstruction: string,
    contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
    temperature: number,
    maxTokens: number,
    onStreamChunk?: (chunk: string) => void
  ): Promise<string> {
    console.log('[AI服务-Gemini流式] 开始');

    const response = await fetch(`${url}/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`, {
      method: 'POST',
      headers: { 'Accept': 'text/event-stream', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API错误 ${response.status}: ${await response.text()}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
      throw new Error(`Stream unsupported (content-type=${contentType || 'unknown'})`);
    }

    return this.processSSEStream(response, (data) => {
      const parsed = JSON.parse(data);
      return parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }, onStreamChunk);
  }

  // 通用SSE流处理（带thinking标签过滤）
  private async processSSEStream(
    response: Response,
    extractContent: (data: string) => string,
    onStreamChunk?: (chunk: string) => void
  ): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const decoder = new TextDecoder();
    let rawFullText = '';
    let buffer = '';
    let inThinkingTag = false;
    let thinkingBuffer = '';
    const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
    const yieldToUi = () => new Promise<void>((resolve) => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => resolve());
      } else {
        setTimeout(resolve, 0);
      }
    });
    let lastYieldAt = nowMs();
    let pendingChars = 0;
    const maybeYield = async (addedChars: number) => {
      if (!onStreamChunk) return;
      pendingChars += addedChars;
      const now = nowMs();
      if (pendingChars >= 80 || now - lastYieldAt >= 60) {
        pendingChars = 0;
        lastYieldAt = now;
        await yieldToUi();
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          let data = trimmed.slice(5);
          if (data.startsWith(' ')) data = data.slice(1);
          if (data === '[DONE]') continue;

          try {
            const content = extractContent(data);
            if (content) {
              rawFullText += content;
              // 处理thinking标签过滤
              for (let i = 0; i < content.length; i++) {
                const char = content[i];
                thinkingBuffer += char;

                if (thinkingBuffer.includes('<thinking>')) {
                  inThinkingTag = true;
                  thinkingBuffer = '';
                  continue;
                }

                if (inThinkingTag && thinkingBuffer.includes('</thinking>')) {
                  inThinkingTag = false;
                  thinkingBuffer = '';
                  continue;
                }

                // 容错：部分模型可能不会输出 </thinking>，但会直接开始输出 ```json
                // 此时为了避免把后续JSON也吞掉，检测到代码块起始后自动结束 thinking 过滤。
                if (inThinkingTag) {
                  const jsonFenceIndex = thinkingBuffer.indexOf('```json');
                  const anyFenceIndex = thinkingBuffer.indexOf('```');
                  const fenceIndex = jsonFenceIndex !== -1 ? jsonFenceIndex : anyFenceIndex;

                  if (fenceIndex !== -1) {
                    const carry = thinkingBuffer.slice(fenceIndex);
                    inThinkingTag = false;
                    thinkingBuffer = '';
                    if (onStreamChunk) onStreamChunk(carry);
                    await maybeYield(carry.length);
                    continue;
                  }
                }

                if (!inThinkingTag) {
                  const possibleTagStart = '<thinking>'.startsWith(thinkingBuffer) ||
                                          '</thinking>'.startsWith(thinkingBuffer);

                    if (!possibleTagStart && thinkingBuffer.length > 0) {
                      if (onStreamChunk) {
                        console.log('[AI服务-流式] 发送chunk到前端:', thinkingBuffer.length, '字符');
                        onStreamChunk(thinkingBuffer);
                      }
                      await maybeYield(thinkingBuffer.length);
                      thinkingBuffer = '';
                    } else if (thinkingBuffer.length > 10) {
                      if (onStreamChunk) {
                        console.log('[AI服务-流式] 发送chunk到前端(缓冲区过大):', thinkingBuffer.length, '字符');
                        onStreamChunk(thinkingBuffer);
                      }
                      await maybeYield(thinkingBuffer.length);
                      thinkingBuffer = '';
                    }
                  }
                }
            }
          } catch (e) {
            console.warn('[AI服务-流式] 解析chunk失败:', data.substring(0, 100));
          }
        }
      }

      if (!inThinkingTag && thinkingBuffer.length > 0) {
        if (onStreamChunk) onStreamChunk(thinkingBuffer);
        await maybeYield(thinkingBuffer.length);
      }
    } finally {
      reader.releaseLock();
    }

    console.log(`[AI服务-流式] 完成，总长度: ${rawFullText.length}`);
    return rawFullText;
  }

  /**
   * 检查当前模式是否可用
   */
  checkAvailability(): { available: boolean; message: string } {
    if (this.config.mode === 'tavern') {
      const tavernHelper = this.getTavernHelper();
      if (!tavernHelper) {
        return {
          available: false,
          message: this.isTavernEnvironment()
            ? '酒馆环境不可用。请在SillyTavern中打开，或切换到自定义API模式。'
            : '当前环境不可用，请切换到自定义API模式。'
        };
      }
      return { available: true, message: '酒馆模式已就绪' };
    } else {
      if (!this.config.customAPI?.url || !this.config.customAPI?.apiKey) {
        return {
          available: false,
          message: '自定义API未配置。请在设置中配置API地址和密钥。'
        };
      }
      return { available: true, message: '自定义API模式已就绪' };
    }
  }
}

export const aiService = new AIService();
