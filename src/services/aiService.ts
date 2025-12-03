/**
 * 统一AI服务 - 支持酒馆和自定义API
 * 提供统一的AI调用接口，支持两种模式：
 * 1. 酒馆模式（SillyTavern）- 默认模式
 * 2. 自定义API模式（OpenAI兼容）
 */
import axios from 'axios';

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

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    try {
      const saved = localStorage.getItem('ai_service_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.config = { ...this.config, ...parsed };
        console.log('[AI服务] 配置已加载:', this.config.mode);
      }
    } catch (e) {
      console.error('[AI服务] 加载配置失败:', e);
    }
  }

  saveConfig(config: Partial<AIConfig>) {
    this.config = { ...this.config, ...config };
    // 自动清理自定义API URL末尾的 /v1 和 / 后缀
    if (this.config.customAPI?.url) {
      this.config.customAPI.url = this.config.customAPI.url
        .replace(/\/v1\/?$/, '')  // 移除末尾的 /v1 或 /v1/
        .replace(/\/+$/, '');      // 移除末尾的斜杠
    }
    localStorage.setItem('ai_service_config', JSON.stringify(this.config));
    console.log('[AI服务] 配置已保存:', this.config.mode);
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
   * 标准生成（带角色卡、聊天历史）
   */
  async generate(options: GenerateOptions): Promise<string> {
    console.log(`[AI服务] 调用generate，模式: ${this.config.mode}`);

    if (this.config.mode === 'tavern') {
      return this.generateWithTavern(options);
    } else {
      return this.generateWithCustomAPI(options);
    }
  }

  /**
   * 纯净生成（不带角色卡）
   */
  async generateRaw(options: GenerateOptions): Promise<string> {
    console.log(`[AI服务] 调用generateRaw，模式: ${this.config.mode}`);

    if (this.config.mode === 'tavern') {
      return this.generateRawWithTavern(options);
    } else {
      return this.generateRawWithCustomAPI(options);
    }
  }

  // ============ 酒馆模式实现 ============
  private async generateWithTavern(options: GenerateOptions): Promise<string> {
    const tavernHelper = this.getTavernHelper();
    if (!tavernHelper) {
      throw new Error('酒馆环境不可用，请切换到自定义API模式或在SillyTavern中打开');
    }

    console.log('[AI服务-酒馆] 调用tavernHelper.generate');
    return await tavernHelper.generate(options);
  }

  private async generateRawWithTavern(options: GenerateOptions): Promise<string> {
    const tavernHelper = this.getTavernHelper();
    if (!tavernHelper) {
      throw new Error('酒馆环境不可用，请切换到自定义API模式或在SillyTavern中打开');
    }

    console.log('[AI服务-酒馆] 调用tavernHelper.generateRaw');
    const result = await tavernHelper.generateRaw(options);
    return String(result);
  }

  private getTavernHelper(): any {
    if (typeof window !== 'undefined' && (window as any).TavernHelper) {
      return (window as any).TavernHelper;
    }
    return null;
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

    return this.callAPI(messages, options.should_stream || false, options.onStreamChunk);
  }

  private async generateRawWithCustomAPI(options: GenerateOptions): Promise<string> {
    if (!this.config.customAPI) {
      throw new Error('自定义API未配置');
    }

    console.log('[AI服务-自定义Raw] 使用ordered_prompts');

    // 过滤掉占位消息
    const messages = (options.ordered_prompts || []).filter(msg => msg.content !== '</input>');

    console.log(`[AI服务-自定义Raw] 消息数量: ${messages.length}`);
    return this.callAPI(messages, options.should_stream || false, options.onStreamChunk);
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
  private async callOpenAICompatibleAPI(
    messages: AIMessage[],
    streaming: boolean,
    onStreamChunk?: (chunk: string) => void
  ): Promise<string> {
    const { url, apiKey, model, temperature, maxTokens } = this.config.customAPI!;

    try {
      if (streaming) {
        return await this.streamingRequestOpenAI(url, apiKey, model, messages, temperature || 0.7, maxTokens || 16000, onStreamChunk);
      } else {
        const response = await axios.post(
          `${url}/v1/chat/completions`,
          {
            model,
            messages,
            temperature: temperature || 0.7,
            max_tokens: maxTokens || 16000,
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
    const { url, apiKey, model, temperature, maxTokens } = this.config.customAPI!;

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

    try {
      if (streaming) {
        return await this.streamingRequestClaude(baseUrl, apiKey, model, systemPrompt, claudeMessages, temperature || 0.7, maxTokens || 16000, onStreamChunk);
      } else {
        const response = await axios.post(
          `${baseUrl}/v1/messages`,
          {
            model,
            max_tokens: maxTokens || 16000,
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
    const { url, apiKey, model, temperature, maxTokens } = this.config.customAPI!;

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

    try {
      if (streaming) {
        return await this.streamingRequestGemini(baseUrl, apiKey, model, systemInstruction, contents, temperature || 0.7, maxTokens || 16000, onStreamChunk);
      } else {
        const response = await axios.post(
          `${baseUrl}/v1beta/models/${model}:${endpoint}?key=${apiKey}`,
          {
            contents,
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
            generationConfig: {
              temperature: temperature || 0.7,
              maxOutputTokens: maxTokens || 16000
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

    return this.processSSEStream(response, (data) => {
      const parsed = JSON.parse(data);
      return parsed.choices[0]?.delta?.content || '';
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
      headers: { 'Content-Type': 'application/json' },
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
    let fullText = '';
    let buffer = '';
    let inThinkingTag = false;
    let thinkingBuffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const content = extractContent(data);
            if (content) {
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

                if (!inThinkingTag) {
                  const possibleTagStart = '<thinking>'.startsWith(thinkingBuffer) ||
                                          '</thinking>'.startsWith(thinkingBuffer);

                  if (!possibleTagStart && thinkingBuffer.length > 0) {
                    fullText += thinkingBuffer;
                    if (onStreamChunk) onStreamChunk(thinkingBuffer);
                    thinkingBuffer = '';
                  } else if (thinkingBuffer.length > 10) {
                    fullText += thinkingBuffer;
                    if (onStreamChunk) onStreamChunk(thinkingBuffer);
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
        fullText += thinkingBuffer;
        if (onStreamChunk) onStreamChunk(thinkingBuffer);
      }
    } finally {
      reader.releaseLock();
    }

    console.log(`[AI服务-流式] 完成，总长度: ${fullText.length}`);
    return fullText;
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
          message: '酒馆环境不可用。请在SillyTavern中打开，或切换到自定义API模式。'
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
