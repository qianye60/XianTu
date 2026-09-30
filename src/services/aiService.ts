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
import { chatRequestPath, geminiStreamPath, joinApiUrl, modelsRequestPath } from '@/utils/apiEndpoint';
import { JSON_CAPABLE } from '@/data/apiProviders';
import { BUILTIN_API_KEY, builtinProxyBaseUrl } from '@/services/builtinApi';
import { recordBuiltinUsage } from '@/services/builtinUsageLog';

// ============ API提供商类型 ============
export type APIProvider = 'openai' | 'claude' | 'gemini' | 'deepseek' | 'zhipu' | 'volcengine' | 'siliconflow-embedding' | 'nai' | 'gpt-image' | 'custom';
export type ThinkingLevel = 'default' | 'off' | 'low' | 'medium' | 'high';

// ============ 配置接口 ============
export interface AIConfig {
  mode: 'tavern' | 'custom';
  streaming?: boolean;
  memorySummaryMode?: 'raw' | 'standard';
  initMode?: 'generate' | 'generateRaw';
  maxRetries?: number; // API调用失败后的重试次数，默认1
  customAPI?: {
    provider: APIProvider;  // API提供商
    url: string;
    apiKey: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    thinkingLevel?: ThinkingLevel;
    forceJsonOutput?: boolean;
    /** 走服务器内置接口时为 true，请求时再换成登录令牌 */
    builtin?: boolean;
    /** 后端内置名单里的条目编号 */
    builtinServerId?: string;
  };
}

/** 一次请求实际使用的 API 配置（显式传参，不再临时改写 this.config.customAPI） */
type CustomAPIConfig = NonNullable<AIConfig['customAPI']>;

type APIConfigInput = {
  provider: APIProvider;
  url: string;
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  thinkingLevel?: ThinkingLevel;
  forceJsonOutput?: boolean;
  builtin?: boolean;
  builtinServerId?: string;
};

const toCustomAPIConfig = (api: APIConfigInput, defaultMaxTokens = 16000): CustomAPIConfig => ({
  provider: api.provider,
  url: api.url,
  apiKey: api.apiKey,
  model: api.model,
  temperature: api.temperature ?? 0.7,
  maxTokens: api.maxTokens ?? defaultMaxTokens,
  thinkingLevel: api.thinkingLevel ?? 'default',
  forceJsonOutput: api.forceJsonOutput,
  builtin: api.builtin || api.apiKey === BUILTIN_API_KEY,
  builtinServerId: api.builtinServerId,
});

// API提供商预设配置
export const API_PROVIDER_PRESETS: Record<APIProvider, {
  url: string;
  defaultModel: string;
  name: string;
  defaultMaxTokens?: number;
  maxOutputTokens?: number;
}> = {
  openai: { url: 'https://api.openai.com', defaultModel: 'gpt-6-astra', name: 'OpenAI', defaultMaxTokens: 32000, maxOutputTokens: 128000 },
  claude: { url: 'https://api.anthropic.com', defaultModel: 'claude-fable-5-1', name: 'Claude', defaultMaxTokens: 32000, maxOutputTokens: 128000 },
  gemini: { url: 'https://generativelanguage.googleapis.com', defaultModel: 'gemini-3.8-flash', name: 'Gemini', defaultMaxTokens: 16000, maxOutputTokens: 65536 },
  deepseek: { url: 'https://api.deepseek.com', defaultModel: 'deepseek-flash', name: 'DeepSeek', defaultMaxTokens: 64000, maxOutputTokens: 384000 },
  zhipu: { url: 'https://open.bigmodel.cn', defaultModel: 'glm-5.3-flash', name: '智谱AI', defaultMaxTokens: 24000, maxOutputTokens: 128000 },
  volcengine: { url: 'https://ark.cn-beijing.volces.com', defaultModel: 'doubao-seed-evolving', name: '火山引擎(豆包)', defaultMaxTokens: 64000, maxOutputTokens: 256000 },
  'siliconflow-embedding': { url: 'https://api.siliconflow.cn', defaultModel: 'BAAI/bge-m3', name: '硅基流动(Embedding)' },
  nai: { url: 'https://create.suanbohe.com/api', defaultModel: 'nai-diffusion-4-5-full', name: 'NAI 生图' },
  'gpt-image': { url: 'https://api.openai.com', defaultModel: 'gpt-image-2.5-sunburst', name: 'GPT 生图' },
  custom: { url: '', defaultModel: '', name: '自定义(OpenAI兼容)', defaultMaxTokens: 16000, maxOutputTokens: 384000 }
};

const DEEPSEEK_V4_CONTEXT_WINDOW = 1_000_000;
const DEEPSEEK_V4_MAX_OUTPUT_TOKENS = 384_000;

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
  /** 强制JSON格式输出（仅支持OpenAI兼容API，如DeepSeek）*/
  responseFormat?: 'json_object';
}

// ============ AI服务类 ============
class AIService {
  private config: AIConfig = {
    mode: 'tavern',
    streaming: true,
    memorySummaryMode: 'raw',
    initMode: 'generate',
    maxRetries: 1, // 默认重试1次
    customAPI: {
      provider: 'openai',
      url: '',
      apiKey: '',
      model: 'gpt-6-astra',
      temperature: 0.7,
      maxTokens: 16000,
      thinkingLevel: 'default'
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
    const tavernHelper = this.getTavernHelper();
    if (tavernHelper) {
      if (typeof (tavernHelper as any).abortGeneration === 'function') {
        (tavernHelper as any).abortGeneration();
      }
      if (typeof (tavernHelper as any).stopGeneration === 'function') {
        (tavernHelper as any).stopGeneration();
      }
      if (typeof (tavernHelper as any).cancelGeneration === 'function') {
        (tavernHelper as any).cancelGeneration();
      }
    }
  }

  /**
   * 重置取消状态（在新请求开始前调用）
   */
  private resetAbortState() {
    this.isAborted = false;
    this.abortController = new AbortController();
  }

  /**
   * 带重试的执行函数
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const maxRetries = this.config.maxRetries ?? 1;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 在每次尝试前检查是否已取消
        if (this.isAborted) {
          console.log(`[AI服务] ${operationName} 已被取消，停止执行`);
          throw new Error('请求已被取消');
        }

        if (attempt > 0) {
          console.log(`[AI服务] ${operationName} 重试第 ${attempt}/${maxRetries} 次`);
        }

        return await fn();
      } catch (error) {
        lastError = error as Error;

        // 如果是取消操作，立即停止，不重试
        if (this.isAborted || lastError.message?.includes('取消') || lastError.message?.includes('abort')) {
          console.log(`[AI服务] ${operationName} 检测到取消信号，立即停止`);
          throw lastError;
        }

        // 公益额度不足、未登录：重试也不会成功
        if (lastError.message?.includes('额度不足') || lastError.message?.includes('需要先登录云端账号')) {
          throw lastError;
        }

        // 如果还有重试机会，等待后继续
        if (attempt < maxRetries) {
          console.warn(`[AI服务] ${operationName} 失败，准备重试:`, lastError.message);

          // 在延迟期间也检查取消状态
          const delayMs = 1000 * (attempt + 1);
          const checkInterval = 100; // 每100ms检查一次
          for (let waited = 0; waited < delayMs; waited += checkInterval) {
            if (this.isAborted) {
              console.log(`[AI服务] ${operationName} 在重试等待期间被取消`);
              throw new Error('请求已被取消');
            }
            await new Promise(resolve => setTimeout(resolve, Math.min(checkInterval, delayMs - waited)));
          }
        }
      }
    }

    throw lastError || new Error(`${operationName} 失败`);
  }

  private getAbortSignal(): AbortSignal | undefined {
    return this.abortController?.signal;
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
    thinkingLevel?: ThinkingLevel;
    forceJsonOutput?: boolean;
    builtin?: boolean;
    builtinServerId?: string;
  }, testPrompt: string): Promise<string> {
    console.log(`[AI服务] 直接测试API: ${apiConfig.url}, model: ${apiConfig.model}`);

    // 直接用传入的配置请求（不走环境检测，也不改动全局配置，避免影响同时进行的游戏请求）
    return await this.generateWithCustomAPI(
      { user_input: testPrompt, should_stream: false },
      toCustomAPIConfig({ ...apiConfig, url: apiConfig.url.replace(/\/v1\/?$/, '').replace(/\/+$/, '') }, 1000),
    );
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

    const { provider, url, apiKey } = this.config.customAPI;
    const baseUrl = url.replace(/\/+$/, '');

    try {
      switch (provider) {
        case 'gemini': {
          // Gemini API: GET /v1beta/models?key={apiKey}
          // 注意：官方Gemini使用查询参数，但某些中转服务可能使用Bearer token
          try {
            // 首先尝试使用查询参数方式（官方Gemini格式）
            const response = await axios.get(`${joinApiUrl(baseUrl, modelsRequestPath('gemini'))}?key=${apiKey}`, {
              signal: this.getAbortSignal(),
              timeout: 10000
            });

            // 过滤出支持 generateContent 的模型
            const models = response.data.models || [];
            return models
              .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
              .map((m: any) => m.name.replace('models/', ''));
          } catch (error) {
            // 如果查询参数方式失败，尝试使用Bearer token方式（中转服务可能使用）
            if (axios.isAxiosError(error) && error.response?.status === 401) {
              console.warn('[AI服务] Gemini查询参数认证失败，尝试Bearer token方式');
              try {
                const response = await axios.get(joinApiUrl(baseUrl, modelsRequestPath('gemini')), {
                  headers: { 'Authorization': `Bearer ${apiKey}` },
                  signal: this.getAbortSignal(),
                  timeout: 10000
                });

                const models = response.data.models || [];
                return models
                  .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
                  .map((m: any) => m.name.replace('models/', ''));
              } catch (bearerError) {
                console.error('[AI服务] Bearer token方式也失败:', bearerError);
              }
            }

            console.error('[AI服务] Gemini模型列表获取失败:', error);
            // 如果所有方式都失败，返回常用模型
            console.warn('[AI服务] 返回Gemini预设模型列表');
            return [
              'gemini-3.8-flash',
              'gemini-3.7-flash',
              'gemini-3.5-flash-lite',
              'gemini-3.1-pro-preview'
            ];
          }
        }

        case 'claude': {
          // Claude API 不提供模型列表端点，返回常用模型列表
          console.warn('[AI服务] Claude API不支持获取模型列表，返回预设模型');
          return [
            'claude-fable-5-1',
            'claude-opus-5-5',
            'claude-sonnet-5',
            'claude-haiku-4-5'
          ];
        }

        case 'siliconflow-embedding': {
          // 硅基流动 Embedding 模型：使用 sub_type=embedding 过滤
          try {
            const response = await axios.get(joinApiUrl(baseUrl, modelsRequestPath('siliconflow-embedding')), {
              headers: { 'Authorization': `Bearer ${apiKey}` },
              signal: this.getAbortSignal(),
              timeout: 10000
            });

            const models = response.data.data?.map((m: any) => m.id) || [];
            if (models.length > 0) {
              return models;
            }
          } catch (fetchError) {
            console.warn('[AI服务] 获取硅基流动Embedding模型列表失败:', fetchError);
          }
          // 返回预设的 Embedding 模型列表
          return [
            'BAAI/bge-m3',
            'Pro/BAAI/bge-m3',
            'BAAI/bge-large-zh-v1.5',
            'BAAI/bge-large-en-v1.5',
            'Qwen/Qwen3-Embedding-8B',
            'Qwen/Qwen3-Embedding-4B',
            'Qwen/Qwen3-Embedding-0.6B'
          ];
        }

        case 'openai':
        case 'deepseek':
        case 'volcengine':
        case 'custom':
        default: {
          // OpenAI 兼容 API: 不同提供商的 models 端点可能不同
          const modelsEndpoint = this.getModelsEndpoint(baseUrl, provider);
          try {
            const response = await axios.get(modelsEndpoint, {
              headers: { 'Authorization': `Bearer ${apiKey}` },
              signal: this.getAbortSignal(),
              timeout: 10000
            });

            const models = response.data.data?.map((m: any) => m.id) || [];

            // 如果成功获取到模型列表，返回
            if (models.length > 0) {
              return models;
            }

            // 如果返回空列表，根据provider返回预设列表
            console.warn('[AI服务] API返回空模型列表，使用预设列表');
            return this.getPresetModels(provider, baseUrl);
          } catch (fetchError) {
            // 如果获取失败，返回预设模型列表
            console.warn('[AI服务] 获取模型列表失败，使用预设列表:', fetchError);
            return this.getPresetModels(provider, baseUrl);
          }
        }
      }
    } catch (error) {
      console.error('[AI服务] 获取模型列表失败:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('API密钥无效或已过期');
        } else if (error.response?.status === 404) {
          throw new Error('API端点不存在，请检查URL配置是否正确');
        } else if (error.response) {
          throw new Error(`获取模型列表失败: ${error.response.status} ${error.response.statusText}`);
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('请求超时，请检查网络连接');
        }
      }
      throw new Error('获取模型列表失败，请检查网络连接和API配置');
    }
  }

  /**
   * 获取预设模型列表（当API获取失败时使用）
   */
  private getPresetModels(provider: APIProvider, baseUrl: string): string[] {
    // 根据URL判断是否为硅基流动
    if (baseUrl.includes('siliconflow.cn')) {
      console.log('[AI服务] 检测到硅基流动API，返回硅基流动预设模型列表');
      return [
        'Qwen/Qwen3.5-397B-A17B',
        'Qwen/Qwen3.5-35B-A3B',
        'Qwen/Qwen3-Next-80B-A3B-Instruct',
        'deepseek-ai/DeepSeek-V4.1-Flash',
        'deepseek-ai/DeepSeek-V4-Pro',
        'BAAI/bge-m3',
        'Pro/Qwen/Qwen3.5-397B-A17B',
        'Pro/deepseek-ai/DeepSeek-V4.1-Flash'
      ];
    }

    // DeepSeek预设模型
    if (provider === 'deepseek' || baseUrl.includes('deepseek.com')) {
      return [
        'deepseek-flash',
        'deepseek-v4-pro'
      ];
    }

    // OpenAI预设模型
    if (provider === 'openai' || baseUrl.includes('openai.com')) {
      return [
        'gpt-6-astra',
        'gpt-6-sol',
        'gpt-6-luna'
      ];
    }

    // 默认返回通用模型列表
    return [
      'gpt-6-astra',
      'gpt-6-sol',
      'gpt-6-luna',
      'deepseek-flash'
    ];
  }

  /**
   * 根据 usageType 获取对应的 API 配置
   * 返回 null 表示使用默认配置（aiService.customAPI 或酒馆代理）。
   *
   * 额外兜底：
   * - 当某个功能仍使用 default 分配时，如果主流程（main）分配了非 default 的独立 API，
   *   则该功能默认跟随 main，避免出现“主流程能用但某些生成按钮用不了”的割裂体验。
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

      // 该功能明确分配了非 default API：直接使用
      if (apiConfig.id !== 'default') return apiConfig;

      // 该功能仍为 default：如果 main 使用了独立 API，则跟随 main（提升可用性）
      if (usageType !== 'main') {
        const mainApi = apiStore.getAPIForType('main');
        if (mainApi && mainApi.id !== 'default') return mainApi;
      }

      // 🔥 返回 default API 配置（而不是 null），以便读取 forceJsonOutput 等设置
      return apiConfig;
    } catch (e) {
      console.warn('[AI服务] 获取功能API配置失败，使用默认配置:', e);
      return null;
    }
  }

  /**
   * 标准生成（带角色卡、聊天历史，使用 injects + user_input）
   *
   * 路由规则（generate / generateRaw 相同）：
   * - 酒馆端：该功能分配了非 default 的独立 API → 直连该 API；否则走酒馆 TavernHelper
   * - 网页端：使用该功能分配的 API；都没有时使用默认 customAPI
   */
  async generate(options: GenerateOptions): Promise<string> {
    return this.routeGeneration('generate', options);
  }

  /**
   * 纯净生成（不带角色卡，使用 ordered_prompts）。路由规则同 generate。
   */
  async generateRaw(options: GenerateOptions): Promise<string> {
    return this.routeGeneration('raw', options);
  }

  private async routeGeneration(kind: 'generate' | 'raw', options: GenerateOptions): Promise<string> {
    // 重置取消状态（只在最外层重置一次，重试时不再重置）
    this.resetAbortState();
    const usageType = options.usageType || 'main';

    return this.executeWithRetry(async () => {
      this.syncModeWithEnvironment();
      const apiConfig = this.getAPIConfigForUsageType(usageType);

      // 酒馆端：default 表示「使用酒馆配置」，只有非 default 的独立 API 才直连
      const useDirectAPI = this.config.mode === 'tavern' ? !!apiConfig && apiConfig.id !== 'default' : !!apiConfig;

      if (useDirectAPI && apiConfig) {
        console.log(`[AI服务] 功能[${usageType}]使用API直连${kind === 'raw' ? '(Raw)' : ''}: ${apiConfig.name}`);
        const requestOptions = apiConfig.forceJsonOutput && !options.responseFormat
          ? { ...options, responseFormat: 'json_object' as const }
          : options;
        return kind === 'raw'
          ? this.generateRawWithCustomAPI(requestOptions, toCustomAPIConfig(apiConfig))
          : this.generateWithCustomAPI(requestOptions, toCustomAPIConfig(apiConfig));
      }

      if (this.config.mode === 'tavern') {
        return kind === 'raw' ? this.generateRawWithTavern(options) : this.generateWithTavern(options);
      }

      // 网页端且没有分配任何 API：使用默认 customAPI
      return kind === 'raw' ? this.generateRawWithCustomAPI(options) : this.generateWithCustomAPI(options);
    }, `${kind === 'raw' ? 'generateRaw' : 'generate'}[${usageType}]`);
  }

  /**
   * 使用指定的API配置进行生成（显式传参，不改动全局配置，可安全并发）
   */
  async generateWithAPIConfig(options: GenerateOptions, apiConfig: APIConfigInput): Promise<string> {
    return this.generateWithCustomAPI(options, toCustomAPIConfig(apiConfig));
  }

  /**
   * 使用指定的API配置进行纯净生成（不带角色卡）
   */
  async generateRawWithAPIConfig(options: GenerateOptions, apiConfig: APIConfigInput): Promise<string> {
    return this.generateRawWithCustomAPI(options, toCustomAPIConfig(apiConfig));
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
      return await this.withRetry('tavern.generate', async () => {
        // 在调用前检查是否已取消
        if (this.isAborted) {
          throw new Error('请求已被取消');
        }
        return await tavernHelper.generate(options);
      });
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
      const result = await this.withRetry('tavern.generateRaw', async () => {
        // 在调用前检查是否已取消
        if (this.isAborted) {
          throw new Error('请求已被取消');
        }
        return await tavernHelper.generateRaw(options);
      });
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
    const retries = opts?.retries ?? this.config.maxRetries ?? 2;
    const baseDelayMs = opts?.baseDelayMs ?? 800;

    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      // 检查是否已取消
      if (this.isAborted) {
        console.log(`[AI服务] ${label} 请求已被取消，停止重试`);
        throw new Error('请求已取消');
      }

      try {
        // 使用 Promise.race 来同时监听函数执行和取消信号
        let checkInterval: NodeJS.Timeout | null = null;
        const abortPromise = new Promise<never>((_, reject) => {
          checkInterval = setInterval(() => {
            if (this.isAborted) {
              if (checkInterval) clearInterval(checkInterval);
              reject(new Error('请求已被取消'));
            }
          }, 50); // 每50ms检查一次，更快响应
        });

        try {
          const result = await Promise.race([fn(), abortPromise]);
          // 函数正常完成，清理检查器
          if (checkInterval) clearInterval(checkInterval);
          return result;
        } catch (error) {
          // 出错时也要清理检查器
          if (checkInterval) clearInterval(checkInterval);
          throw error;
        }
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
          let timer: NodeJS.Timeout | null = null;
          let checkAbort: NodeJS.Timeout | null = null;

          const cleanup = () => {
            if (timer) clearTimeout(timer);
            if (checkAbort) clearInterval(checkAbort);
          };

          timer = setTimeout(() => {
            cleanup();
            resolve(undefined);
          }, delay);

          // 如果在等待期间被取消，立即结束
          checkAbort = setInterval(() => {
            if (this.isAborted) {
              cleanup();
              reject(new Error('请求已取消'));
            }
          }, 100);
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

  /**
   * 检测 API 是否不支持 response_format 参数
   * 某些中转API（如豆包/Doubao、部分Claude中转）不支持该参数
   */
  private isResponseFormatUnsupported(url: string, model: string, provider?: APIProvider): boolean {
    // 火山引擎(doubao) API 是 OpenAI 兼容的，支持 response_format
    if (provider === 'volcengine') return false;

    const lowerUrl = (url || '').toLowerCase();
    const lowerModel = (model || '').toLowerCase();

    // 某些 Claude 中转服务
    if (lowerUrl.includes('anthropic') || lowerModel.includes('claude')) {
      return true;
    }

    // 通义千问某些版本
    if (lowerUrl.includes('dashscope') && !lowerModel.includes('qwen-max')) {
      return true;
    }

    return false;
  }

  // ============ 自定义API模式实现 ============
  private async generateWithCustomAPI(options: GenerateOptions, api: CustomAPIConfig | undefined = this.config.customAPI): Promise<string> {
    if (!api) {
      throw new Error('自定义API未配置');
    }

    console.log('[AI服务-自定义] 构建消息列表');
    console.log(`[AI服务-自定义] hasOnStreamChunk=${!!options.onStreamChunk}, should_stream=${options.should_stream}`);

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
    // 🔥 读取功能对应的 API 配置的 forceJsonOutput 设置
    const usageType = options.usageType;
    const apiConfig = usageType ? this.getAPIConfigForUsageType(usageType) : null;
    const responseFormat = options.responseFormat || (apiConfig?.forceJsonOutput ? 'json_object' : undefined);
    return this.callAPI(api, messages, shouldStream, options.onStreamChunk, responseFormat, options.usageType);
  }

  private async generateRawWithCustomAPI(options: GenerateOptions, api: CustomAPIConfig | undefined = this.config.customAPI): Promise<string> {
    if (!api) {
      throw new Error('自定义API未配置');
    }

    console.log('[AI服务-自定义Raw] 使用ordered_prompts');

    // 过滤掉占位消息
    const messages = (options.ordered_prompts || []).filter(msg => msg.content !== '</input>');

    console.log(`[AI服务-自定义Raw] 消息数量: ${messages.length}`);
    const shouldStream = options.should_stream ?? this.config.streaming ?? false;
    // 🔥 读取功能对应的 API 配置的 forceJsonOutput 设置
    const usageType = options.usageType;
    const apiConfig = usageType ? this.getAPIConfigForUsageType(usageType) : null;
    const responseFormat = options.responseFormat || (apiConfig?.forceJsonOutput ? 'json_object' : undefined);
    console.log(`[AI服务-自定义Raw] shouldStream=${shouldStream}, hasOnStreamChunk=${!!options.onStreamChunk}, options.should_stream=${options.should_stream}, config.streaming=${this.config.streaming}`);
    return this.callAPI(api, messages, shouldStream, options.onStreamChunk, responseFormat, options.usageType);
  }

  /** 内置 API 不保存上游密钥。格式沿用后端下发的 openai / gemini，请求时再换成登录令牌。 */
  private resolveBuiltinApi(api: CustomAPIConfig): CustomAPIConfig {
    if (!api.builtin && api.apiKey !== BUILTIN_API_KEY) return api;
    const token = localStorage.getItem('access_token') || '';
    if (!token) {
      throw new Error('使用公益 API 需要先登录云端账号');
    }
    const builtinServerId = api.builtinServerId || 'builtin';
    this.assertBuiltinQuota(builtinServerId);
    return {
      ...api,
      builtin: true,
      builtinServerId,
      provider: api.provider === 'gemini' ? 'gemini' : 'custom',
      url: builtinProxyBaseUrl(),
      apiKey: token,
    };
  }

  private builtinStore() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAPIManagementStore } = require('@/stores/apiManagementStore') as typeof import('@/stores/apiManagementStore');
    return useAPIManagementStore();
  }

  private builtinClient(serverId?: string) {
    const configs = this.builtinStore().apiConfigs;
    if (serverId) {
      const found = configs.find((item) => item.builtin && item.builtinServerId === serverId);
      if (found) return found;
    }
    return configs.find((item) => item.builtin);
  }

  /** 余额已知且不够这次的单价时，直接提示去签到，不白跑一趟服务器 */
  private assertBuiltinQuota(serverId?: string) {
    const api = this.builtinClient(serverId);
    const balance = this.builtinStore().builtinBalance;
    if (!api || balance === null) return;
    const cost = api.cost ?? 1;
    if (cost > 0 && balance < cost) {
      this.promptBuiltinQuota();
      throw new Error(`公益额度不足（本次需要 ${cost}，剩余 ${balance}）`);
    }
  }

  private noteBuiltinConsumed(serverId?: string, usageType?: APIUsageType) {
    const api = this.builtinClient(serverId);
    if (!api) return;
    this.builtinStore().consumeBuiltinQuota(api.id);
    recordBuiltinUsage({
      name: api.name,
      model: api.model,
      cost: api.cost ?? 1,
      balance: this.builtinStore().builtinBalance,
      usage: usageType || 'main',
    });
  }

  private noteBuiltinRejected(error: unknown, serverId?: string) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('额度不足')) return;
    void serverId;
    this.builtinStore().markBuiltinQuotaExhausted();
    this.promptBuiltinQuota();
  }

  /** 额度不够时弹提示：没签到引导签到，签过了引导切回自己的 API */
  private promptBuiltinQuota() {
    void import('@/services/builtinQuotaPrompt').then((m) => m.promptBuiltinQuota());
  }

  private withBuiltinId(headers: Record<string, string>, serverId?: string) {
    if (serverId) headers['X-Builtin-Id'] = serverId;
    return headers;
  }

  private async callAPI(
    api: CustomAPIConfig,
    messages: AIMessage[],
    streaming: boolean,
    onStreamChunk?: (chunk: string) => void,
    responseFormat?: 'json_object',
    usageType?: APIUsageType
  ): Promise<string> {
    api = this.resolveBuiltinApi(api);
    const { provider, url, model } = api;

    // 🔥 某些模型/API不支持 response_format: json_object
    const isReasonerModel = model.includes('reasoner') || model.includes('r1');
    const isClaudeModel = model.includes('claude');
    const isUnsupportedAPI = this.isResponseFormatUnsupported(url, model, provider);
    const jsonCapable = !!api.builtin || JSON_CAPABLE.includes(provider);
    const shouldSkipResponseFormat = !jsonCapable || isReasonerModel || isClaudeModel || isUnsupportedAPI;
    const effectiveResponseFormat = (responseFormat && !shouldSkipResponseFormat) ? responseFormat : undefined;
    if (responseFormat && shouldSkipResponseFormat) {
      const reason = isReasonerModel ? 'reasoner模型' : isClaudeModel ? 'Claude模型' : '该API';
      console.log(`[AI服务-API调用] 跳过JSON格式输出（${reason} 不支持 response_format）`);
    }

    // 🔥 DeepSeek 等 API 使用 response_format: json_object 时，要求 prompt 中包含 "json"
    let finalMessages = messages;
    if (effectiveResponseFormat === 'json_object') {
      const hasJsonKeyword = messages.some(msg => msg.content.toLowerCase().includes('json'));
      if (!hasJsonKeyword) {
        finalMessages = [...messages];
        const sysIdx = finalMessages.findIndex(m => m.role === 'system');
        if (sysIdx >= 0) {
          finalMessages[sysIdx] = { ...finalMessages[sysIdx], content: finalMessages[sysIdx].content + '\n\nRespond in JSON format.' };
        } else {
          finalMessages.unshift({ role: 'system', content: 'Respond in JSON format.' });
        }
        console.log('[AI服务-API调用] 已自动添加JSON格式提示（API要求prompt中包含"json"）');
      }
    }

    console.log(`[AI服务-API调用] Provider: ${provider}, URL: ${url}, Model: ${model}, 消息数: ${finalMessages.length}, 流式: ${streaming}`);

    // 根据provider选择不同的调用方式
    try {
      let text: string;
      switch (provider) {
        case 'claude':
          text = await this.callClaudeAPI(api, finalMessages, streaming, onStreamChunk, effectiveResponseFormat);
          break;
        case 'gemini':
          text = await this.callGeminiAPI(api, finalMessages, streaming, onStreamChunk, effectiveResponseFormat);
          break;
        case 'openai':
        case 'deepseek':
        case 'zhipu':
        case 'volcengine':
        case 'custom':
        default:
          text = await this.callOpenAICompatibleAPI(api, finalMessages, streaming, onStreamChunk, effectiveResponseFormat);
      }
      if (api.builtin) this.noteBuiltinConsumed(api.builtinServerId, usageType);
      return text;
    } catch (error) {
      if (api.builtin) this.noteBuiltinRejected(error, api.builtinServerId);
      throw error;
    }
  }

  private getChatEndpoint(url: string, provider: APIProvider): string {
    return joinApiUrl(url, chatRequestPath(provider));
  }

  private getModelsEndpoint(url: string, provider: APIProvider): string {
    return joinApiUrl(url, modelsRequestPath(provider) || '/v1/models');
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
    if (provider === 'deepseek' || m.includes('deepseek')) return DEEPSEEK_V4_CONTEXT_WINDOW;
    if (m.includes('moonshot') || m.includes('kimi')) return 128_000;
    if (provider === 'zhipu' || m.includes('glm')) return 256_000;
    if (provider === 'volcengine' || m.includes('doubao-seed')) return 1_000_000;

    // OpenAI-compatible defaults
    if (m.includes('gpt-6') || m.includes('gpt-5.6') || m.includes('gpt-5')) return 1_050_000;
    if (m.includes('gpt-4o') || m.includes('gpt-4.1') || m.includes('o1') || m.includes('o3')) return 128_000;
    if (m.includes('gpt-4')) return 128_000;
    if (m.includes('gpt-3.5')) return 16_385;

    // Unknown model: don't guess (this project often uses 10k+ token prompts).
    return null;
  }

  private getApproxMaxOutputTokens(provider: APIProvider, model: string): number | null {
    const m = (model || '').toLowerCase();

    if (provider === 'deepseek' || m.includes('deepseek')) return DEEPSEEK_V4_MAX_OUTPUT_TOKENS;
    if (provider === 'gemini' || m.includes('gemini')) return API_PROVIDER_PRESETS.gemini.maxOutputTokens || null;
    if (provider === 'claude' || m.includes('claude')) return API_PROVIDER_PRESETS.claude.maxOutputTokens || null;
    if (provider === 'zhipu' || m.includes('glm')) return API_PROVIDER_PRESETS.zhipu.maxOutputTokens || null;
    if (provider === 'openai' || m.includes('gpt-') || m.includes('o1') || m.includes('o3')) {
      return API_PROVIDER_PRESETS.openai.maxOutputTokens || null;
    }

    return null;
  }

  private clampMaxTokensForOutputLimit(
    provider: APIProvider,
    model: string,
    requestedMaxTokens: number
  ): number {
    const maxOutputTokens = this.getApproxMaxOutputTokens(provider, model);
    if (!maxOutputTokens) return requestedMaxTokens;

    const clamped = Math.min(requestedMaxTokens, maxOutputTokens);
    if (clamped < requestedMaxTokens) {
      console.warn(`[AI服务] maxTokens超过模型输出上限，已自动下调：${requestedMaxTokens} -> ${clamped}（模型最大输出≈${maxOutputTokens}）`);
    }
    return clamped;
  }

  private clampMaxTokensForContext(
    provider: APIProvider,
    model: string,
    messagesForEstimate: Array<{ content: string }>,
    requestedMaxTokens: number
  ): number {
    const outputLimitedMaxTokens = this.clampMaxTokensForOutputLimit(provider, model, requestedMaxTokens);
    const contextWindow = this.getApproxContextWindow(provider, model);
    if (!contextWindow) return outputLimitedMaxTokens;

    const inputTokens = this.estimateTokensForMessages(messagesForEstimate);
    const safety = 512;
    const available = contextWindow - inputTokens - safety;

    if (available < 256) {
      throw new Error(`API上下文长度不足：输入过长（估算输入≈${inputTokens} tokens），请减少世界/提示词长度或更换更大上下文模型。`);
    }

    const clamped = Math.min(outputLimitedMaxTokens, Math.max(256, available));
    if (clamped < outputLimitedMaxTokens) {
      console.warn(`[AI服务] maxTokens过大，已自动下调：${outputLimitedMaxTokens} -> ${clamped}（估算输入≈${inputTokens}，模型上下文≈${contextWindow}）`);
    }
    return clamped;
  }

  private shouldUseMaxCompletionTokens(provider: APIProvider, model: string): boolean {
    const m = (model || '').toLowerCase();
    return provider === 'openai' && (m.startsWith('o1') || m.startsWith('o3') || m.startsWith('o4'));
  }

  private applyMaxTokensParam(requestBody: Record<string, unknown>, provider: APIProvider, model: string, maxTokens: number) {
    if (this.shouldUseMaxCompletionTokens(provider, model)) {
      requestBody.max_completion_tokens = maxTokens;
      return;
    }
    requestBody.max_tokens = maxTokens;
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
    api: CustomAPIConfig,
    messages: AIMessage[],
    streaming: boolean,
    onStreamChunk?: (chunk: string) => void,
    responseFormat?: 'json_object'
  ): Promise<string> {
    const { provider, url, apiKey, model, temperature, maxTokens, thinkingLevel = 'default' } = api;
    if (provider === 'siliconflow-embedding') {
      throw new Error('这是向量模型，不能用对话接口测试。请重新打开页面后再测一次连接。');
    }
    const safeMaxTokens = this.clampMaxTokensForContext(provider, model, messages, maxTokens || 16000);

    // 不同提供商使用不同的API路径
    const chatEndpoint = this.getChatEndpoint(url, provider);

    console.log(`[AI服务-OpenAI兼容] streaming=${streaming}, hasOnStreamChunk=${!!onStreamChunk}`);

    try {
      if (streaming) {
        try {
          return await this.streamingRequestOpenAI(url, apiKey, model, messages, temperature || 0.7, safeMaxTokens, onStreamChunk, responseFormat, provider, thinkingLevel, api.builtinServerId);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!this.isStreamUnsupportedError(msg)) throw e;
          console.warn('[AI服务-OpenAI兼容] 当前API可能不支持流式传输，已自动降级为非流式请求。');

          const requestBody: any = {
            model,
            messages,
            temperature: temperature || 0.7,
            stream: false
          };
          this.applyMaxTokensParam(requestBody, provider, model, safeMaxTokens);
          this.applyThinkingParam(requestBody, provider, thinkingLevel);

          // 如果指定了 JSON 格式，添加 response_format
          // 🔥 注意：某些模型/API不支持 response_format
          const isReasonerModel = model.includes('reasoner') || model.includes('r1');
          const isClaudeModel = model.includes('claude');
          const isUnsupportedAPI = this.isResponseFormatUnsupported(url, model, provider);
          if (responseFormat === 'json_object' && !isReasonerModel && !isClaudeModel && !isUnsupportedAPI) {
            requestBody.response_format = { type: 'json_object' };
            console.log('[AI服务-OpenAI兼容] 启用JSON格式输出(降级非流式)');
          }

          const response = await axios.post(
            chatEndpoint,
            requestBody,
            {
              headers: this.withBuiltinId({
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              }, api.builtinServerId),
              timeout: 60000, // 减少到60秒
              signal: this.getAbortSignal()
            }
          );

          const content = response.data.choices[0].message.content;
          console.log(`[AIæœåŠ¡-OpenAI] å“åº”é•¿åº¦: ${content.length}`);
          return content;
        }
      } else {
        const requestBody: any = {
          model,
          messages,
          temperature: temperature || 0.7,
          stream: false
        };
        this.applyMaxTokensParam(requestBody, provider, model, safeMaxTokens);
        this.applyThinkingParam(requestBody, provider, thinkingLevel);

        // 如果指定了 JSON 格式，添加 response_format
        // 🔥 注意：某些模型/API不支持 response_format
        const isReasonerModel = model.includes('reasoner') || model.includes('r1');
        const isClaudeModel = model.includes('claude');
        const isUnsupportedAPI = this.isResponseFormatUnsupported(url, model);
        if (responseFormat === 'json_object' && !isReasonerModel && !isClaudeModel && !isUnsupportedAPI) {
          requestBody.response_format = { type: 'json_object' };
          console.log('[AI服务-OpenAI兼容] 启用JSON格式输出(非流式)');
        }

        const response = await axios.post(
          chatEndpoint,
          requestBody,
          {
            headers: this.withBuiltinId({
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }, api.builtinServerId),
            timeout: 120000,
            signal: this.getAbortSignal()
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

  private applyThinkingParam(requestBody: Record<string, unknown>, provider: APIProvider, level: ThinkingLevel) {
    if (level === 'default' || (provider !== 'deepseek' && provider !== 'volcengine')) return;
    requestBody.thinking = { type: level === 'off' ? 'disabled' : 'enabled' };
    if (provider === 'deepseek' && level !== 'off') requestBody.reasoning_effort = level;
  }

  // Claude API格式
  private async callClaudeAPI(
    api: CustomAPIConfig,
    messages: AIMessage[],
    streaming: boolean,
    onStreamChunk?: (chunk: string) => void,
    responseFormat?: 'json_object'
  ): Promise<string> {
    const { provider, url, apiKey, model, temperature, maxTokens, thinkingLevel = 'default' } = api;

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
      maxTokens || 8192
    );

    // 构建请求体
    const buildRequestBody = () => {
      const body: any = {
        model,
        max_tokens: safeMaxTokens,
        system: systemPrompt || undefined,
        messages: claudeMessages,
        temperature: temperature || 0.7
      };

      if (thinkingLevel !== 'default') {
        if (thinkingLevel !== 'off') {
          const budget = thinkingLevel === 'low' ? 2048 : thinkingLevel === 'medium' ? 8192 : 16384;
          body.thinking = { type: 'enabled', budget_tokens: budget };
          body.max_tokens = Math.max(body.max_tokens, budget + 1024);
          delete body.temperature;
        }
      }

      // Claude 支持 JSON 模式（通过 prefill 技巧）
      if (responseFormat === 'json_object') {
        console.log('[AI服务-Claude] 启用JSON格式输出（使用prefill技巧）');
        // 在最后一条用户消息后添加助手的 prefill，强制 JSON 输出
        const lastMsg = body.messages[body.messages.length - 1];
        if (lastMsg && lastMsg.role === 'user') {
          body.messages.push({ role: 'assistant', content: '{' });
        }
      }

      return body;
    };

    try {
      if (streaming) {
        try {
          return await this.streamingRequestClaude(baseUrl, apiKey, model, systemPrompt, claudeMessages, temperature || 0.7, safeMaxTokens, onStreamChunk, thinkingLevel);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!this.isStreamUnsupportedError(msg)) throw e;
          console.warn('[AI服务-Claude] 当前API可能不支持流式传输，已自动降级为非流式请求。');

          const response = await axios.post(
            joinApiUrl(baseUrl, chatRequestPath('claude')),
            buildRequestBody(),
            {
              headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
              },
              timeout: 60000, // 减少到60秒
              signal: this.getAbortSignal()
            }
          );

          let content = response.data.content[0]?.text || '';
          // 如果使用了 prefill，需要在返回内容前加上 '{'
          if (responseFormat === 'json_object' && content && !content.startsWith('{')) {
            content = '{' + content;
          }
          console.log(`[AI服务-Claude] 响应长度: ${content.length}`);
          return content;
        }
      } else {
        const response = await axios.post(
          joinApiUrl(baseUrl, chatRequestPath('claude')),
          buildRequestBody(),
          {
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json'
            },
            timeout: 120000,
            signal: this.getAbortSignal()
          }
        );

        let content = response.data.content[0]?.text || '';
        // 如果使用了 prefill，需要在返回内容前加上 '{'
        if (responseFormat === 'json_object' && content && !content.startsWith('{')) {
          content = '{' + content;
        }
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
    api: CustomAPIConfig,
    messages: AIMessage[],
    streaming: boolean,
    onStreamChunk?: (chunk: string) => void,
    responseFormat?: 'json_object'
  ): Promise<string> {
    const { provider, url, apiKey, model, temperature, maxTokens, thinkingLevel = 'default' } = api;

    // 验证必需参数
    if (!model || model.trim() === '') {
      throw new Error('Gemini API调用失败：未指定模型名称');
    }

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
    const safeMaxTokens = this.clampMaxTokensForContext(
      provider,
      model,
      [
        ...(systemInstruction ? [{ content: systemInstruction }] : []),
        ...contents.map(c => ({ content: (c.parts || []).map(p => p.text).join('\n') })),
      ],
      maxTokens || 8192
    );

    // 构建 generationConfig
    const buildGenerationConfig = () => {
      const config: any = {
        temperature: temperature || 0.7,
        maxOutputTokens: safeMaxTokens
      };

      if (thinkingLevel !== 'default') {
        const isGemini3 = /^gemini-3/i.test(model);
        config.thinkingConfig = isGemini3
          ? { thinkingLevel: thinkingLevel === 'off' ? 'low' : thinkingLevel, includeThoughts: thinkingLevel !== 'off' }
          : { thinkingBudget: thinkingLevel === 'off' ? 0 : thinkingLevel === 'low' ? 1024 : thinkingLevel === 'medium' ? 4096 : 8192, includeThoughts: thinkingLevel !== 'off' };
      }

      // Gemini 支持 JSON 模式（通过 response_mime_type）
      if (responseFormat === 'json_object') {
        console.log('[AI服务-Gemini] 启用JSON格式输出（使用response_mime_type）');
        config.response_mime_type = 'application/json';
      }

      return config;
    };

    // 构建请求体
    const requestBody = {
      contents,
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
      generationConfig: buildGenerationConfig()
    };

    // 内置接口走登录令牌，不能把玩家令牌当成 Gemini 的 key 查询参数
    const makeGeminiRequest = async (urlPath: string, useQueryParam: boolean = !api.builtin) => {
      const endpoint = joinApiUrl(baseUrl, urlPath);
      const requestUrl = api.builtin || !useQueryParam
        ? endpoint
        : `${endpoint}?key=${encodeURIComponent(apiKey)}`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (api.builtin || !useQueryParam) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      if (api.builtin && api.builtinServerId) headers['X-Builtin-Id'] = api.builtinServerId;

      return axios.post(requestUrl, requestBody, {
        headers,
        timeout: 120000,
        signal: this.getAbortSignal()
      });
    };

    try {
      if (streaming) {
        try {
          return await this.streamingRequestGemini(baseUrl, apiKey, model, systemInstruction, contents, temperature || 0.7, safeMaxTokens, onStreamChunk, responseFormat, !!api.builtin, thinkingLevel, api.builtinServerId);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!this.isStreamUnsupportedError(msg)) throw e;
          console.warn('[AI服务-Gemini] 当前API可能不支持流式传输，已自动降级为非流式请求。');

          // 尝试查询参数方式
          try {
            const response = await makeGeminiRequest(chatRequestPath('gemini', model), true);
            const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            console.log(`[AI服务-Gemini] 响应长度: ${content.length}`);
            return content;
          } catch (queryError) {
            // 如果查询参数方式失败且是401错误，尝试Bearer token方式
            if (axios.isAxiosError(queryError) && queryError.response?.status === 401) {
              console.warn('[AI服务-Gemini] 查询参数认证失败，尝试Bearer token方式');
              const response = await makeGeminiRequest(chatRequestPath('gemini', model), false);
              const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              console.log(`[AI服务-Gemini] 响应长度: ${content.length}`);
              return content;
            }
            throw queryError;
          }
        }
      } else {
        // 尝试查询参数方式
        try {
          const response = await makeGeminiRequest(chatRequestPath('gemini', model), true);
          const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          console.log(`[AI服务-Gemini] 响应长度: ${content.length}`);
          return content;
        } catch (queryError) {
          // 如果查询参数方式失败且是401错误，尝试Bearer token方式
          if (axios.isAxiosError(queryError) && queryError.response?.status === 401) {
            console.warn('[AI服务-Gemini] 查询参数认证失败，尝试Bearer token方式');
            const response = await makeGeminiRequest(chatRequestPath('gemini', model), false);
            const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            console.log(`[AI服务-Gemini] 响应长度: ${content.length}`);
            return content;
          }
          throw queryError;
        }
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
    onStreamChunk?: (chunk: string) => void,
    responseFormat?: 'json_object',
    provider?: APIProvider,
    thinkingLevel: ThinkingLevel = 'default',
    builtinServerId?: string
  ): Promise<string> {
    console.log('[AI服务-OpenAI流式] 开始');

    const requestBody: any = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true
    };

    if (thinkingLevel !== 'default' && (provider === 'deepseek' || provider === 'volcengine')) {
      requestBody.thinking = { type: thinkingLevel === 'off' ? 'disabled' : 'enabled' };
    }
    if (thinkingLevel !== 'default' && provider === 'deepseek' && thinkingLevel !== 'off') {
      requestBody.reasoning_effort = thinkingLevel;
    }

    // 如果指定了 JSON 格式，添加 response_format
    // 🔥 注意：某些模型/API不支持 response_format
    const isReasonerModel = model.includes('reasoner') || model.includes('r1');
    const isClaudeModel = model.includes('claude');
    const isUnsupportedAPI = this.isResponseFormatUnsupported(url, model);
    const shouldSkipFormat = isReasonerModel || isClaudeModel || isUnsupportedAPI;
    if (responseFormat === 'json_object' && !shouldSkipFormat) {
      requestBody.response_format = { type: 'json_object' };
      console.log('[AI服务-OpenAI流式] 启用JSON格式输出');
    } else if (responseFormat === 'json_object' && shouldSkipFormat) {
      const reason = isReasonerModel ? 'reasoner模型' : isClaudeModel ? 'Claude模型' : '该API';
      console.log(`[AI服务-OpenAI流式] 跳过JSON格式输出（${reason}不支持）`);
    }

    // 不同提供商使用不同的API路径
    const chatEndpoint = this.getChatEndpoint(url, provider ?? 'custom');

    const response = await fetch(chatEndpoint, {
      method: 'POST',
      headers: this.withBuiltinId({
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json'
      }, builtinServerId),
      body: JSON.stringify(requestBody),
      signal: this.getAbortSignal()
    });

    if (!response.ok) {
      throw new Error(`API错误 ${response.status}: ${await response.text()}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
      throw new Error(`Stream unsupported (content-type=${contentType || 'unknown'})`);
    }

    const result = await this.processSSEStream(response, (data) => {
      const parsed = JSON.parse(data);
      const delta = parsed.choices[0]?.delta;

      // DeepSeek Reasoner / R1 等：丢弃 reasoning_content（思维链），只保留正式内容。
      // 注意：部分服务商 / 中转会在每块里附带空的 reasoning_content，不能因此丢掉同一块里的正文。
      const hasActualContent = delta?.content !== undefined && delta?.content !== null && delta?.content !== '';
      return hasActualContent ? delta.content : '';
    }, onStreamChunk);

    return result;
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
    onStreamChunk?: (chunk: string) => void,
    thinkingLevel: ThinkingLevel = 'default'
  ): Promise<string> {
    console.log(`[AI服务-Claude流式] 开始`);

    const requestBody: any = {
      model,
      max_tokens: maxTokens,
      system: systemPrompt || undefined,
      messages,
      temperature,
      stream: true
    };
    if (thinkingLevel !== 'default') {
      if (thinkingLevel !== 'off') {
        const budget = thinkingLevel === 'low' ? 2048 : thinkingLevel === 'medium' ? 8192 : 16384;
        requestBody.thinking = { type: 'enabled', budget_tokens: budget };
        requestBody.max_tokens = Math.max(maxTokens, budget + 1024);
        delete requestBody.temperature;
      }
    }

    const response = await fetch(joinApiUrl(url, chatRequestPath('claude')), {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: this.getAbortSignal()
    });

    if (!response.ok) {
      throw new Error(`Claude API错误 ${response.status}: ${await response.text()}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
      throw new Error(`Stream unsupported (content-type=${contentType || 'unknown'})`);
    }

    // Claude thinking 状态追踪
    let inThinkingPhase = false;

    return this.processSSEStream(response, (data) => {
      const parsed = JSON.parse(data);

      // Claude extended thinking: 处理 thinking content block
      if (parsed.type === 'content_block_start') {
        if (parsed.content_block?.type === 'thinking') {
          inThinkingPhase = true;
          return '<thinking>';
        }
      }

      if (parsed.type === 'content_block_stop' && inThinkingPhase) {
        inThinkingPhase = false;
        return '</thinking>';
      }

      // Claude流式响应格式：content_block_delta事件
      if (parsed.type === 'content_block_delta') {
        // thinking_delta 事件
        if (parsed.delta?.type === 'thinking_delta') {
          return parsed.delta?.thinking || '';
        }
        // 普通 text_delta 事件
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
    onStreamChunk?: (chunk: string) => void,
    responseFormat?: 'json_object',
    bearerAuth = false,
    thinkingLevel: ThinkingLevel = 'default',
    builtinServerId?: string
  ): Promise<string> {
    console.log(`[AI服务-Gemini流式] 开始`);

    const generationConfig: any = {
      temperature,
      maxOutputTokens: maxTokens
    };
    if (responseFormat === 'json_object') {
      generationConfig.response_mime_type = 'application/json';
    }
    if (thinkingLevel !== 'default') {
      const isGemini3 = /^gemini-3/i.test(model);
      generationConfig.thinkingConfig = isGemini3
        ? { thinkingLevel: thinkingLevel === 'off' ? 'low' : thinkingLevel, includeThoughts: thinkingLevel !== 'off' }
        : { thinkingBudget: thinkingLevel === 'off' ? 0 : thinkingLevel === 'low' ? 1024 : thinkingLevel === 'medium' ? 4096 : 8192, includeThoughts: thinkingLevel !== 'off' };
    }

    const streamUrl = bearerAuth
      ? `${joinApiUrl(url, geminiStreamPath(model))}?alt=sse`
      : `${joinApiUrl(url, geminiStreamPath(model))}?key=${apiKey}&alt=sse`;
    const response = await fetch(streamUrl, {
      method: 'POST',
      headers: bearerAuth
        ? this.withBuiltinId({ 'Authorization': `Bearer ${apiKey}`, 'Accept': 'text/event-stream', 'Content-Type': 'application/json' }, builtinServerId)
        : { 'Accept': 'text/event-stream', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig
      }),
      signal: this.getAbortSignal()
    });

    if (!response.ok) {
      throw new Error(`Gemini API错误 ${response.status}: ${await response.text()}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
      throw new Error(`Stream unsupported (content-type=${contentType || 'unknown'})`);
    }

    // Gemini thinking 状态追踪
    let lastWasThought = false;

    return this.processSSEStream(response, (data) => {
      const parsed = JSON.parse(data);
      const parts = parsed.candidates?.[0]?.content?.parts || [];
      let result = '';

      for (const part of parts) {
        // Gemini thinking mode: thought 字段包含思维内容
        if (part.thought) {
          if (!lastWasThought) {
            result += '<thinking>';
            lastWasThought = true;
          }
          result += part.thought;
        } else if (part.text) {
          if (lastWasThought) {
            result += '</thinking>';
            lastWasThought = false;
          }
          result += part.text;
        }
      }

      return result;
    }, onStreamChunk);
  }

  // 通用SSE流处理 - 真流式版本（保留thinking标签，前端处理显示）
  private async processSSEStream(
    response: Response,
    extractContent: (data: string) => string,
    onStreamChunk?: (chunk: string) => void
  ): Promise<string> {
    console.log(`[AI服务-流式] processSSEStream 开始, hasOnStreamChunk=${!!onStreamChunk}`);

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const decoder = new TextDecoder();
    let rawFullText = '';
    let buffer = '';
    let chunkCount = 0;

    // 立即发送内容到前端（真流式，不做任何过滤）
    const sendChunk = (text: string) => {
      if (text && onStreamChunk) {
        chunkCount++;
        if (chunkCount <= 3 || chunkCount % 100 === 0) {
          console.log(`[AI服务-流式] chunk #${chunkCount}: "${text.substring(0, 30)}..."`);
        }
        onStreamChunk(text);
      }
    };

    try {
      while (true) {
        if (this.isAborted) {
          try { await reader.cancel(); } catch { /* ignore */ }
          throw new Error('请求已取消');
        }

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
              // 真流式：立即发送，不做任何缓冲
              sendChunk(content);
            }
          } catch (e) {
            console.warn('[AI服务-流式] 解析chunk失败:', data.substring(0, 100));
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    console.log(`[AI服务-流式] 完成，总长度: ${rawFullText.length}`);
    return rawFullText;
  }

  /**
   * 检查指定功能是否启用了强制JSON输出
   * @param usageType 功能类型
   * @returns 是否启用强制JSON输出
   */
  isForceJsonEnabled(usageType?: APIUsageType): boolean {
    const apiConfig = this.getAPIConfigForUsageType(usageType);
    return apiConfig?.forceJsonOutput === true;
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
      const builtin = !!this.config.customAPI?.builtin || this.config.customAPI?.apiKey === BUILTIN_API_KEY;
      if (builtin) {
        if (!localStorage.getItem('access_token')) {
          return { available: false, message: '公益 API 需要先登录云端账号。' };
        }
        return { available: true, message: '公益 API 已就绪' };
      }
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
