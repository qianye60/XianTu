/**
 * 统一AI服务 - 支持酒馆和自定义API
 * 提供统一的AI调用接口，支持两种模式：
 * 1. 酒馆模式（SillyTavern）- 默认模式
 * 2. 自定义API模式（OpenAI兼容）
 */
import axios from 'axios';

// ============ 配置接口 ============
export interface AIConfig {
  mode: 'tavern' | 'custom';
  streaming?: boolean;
  memorySummaryMode?: 'raw' | 'standard';
  initMode?: 'generate' | 'generateRaw';
  customAPI?: {
    url: string;
    apiKey: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
}

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
      url: '',
      apiKey: '',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 20000
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

    return this.callOpenAICompatibleAPI(messages, options.should_stream || false, options.onStreamChunk);
  }

  private async generateRawWithCustomAPI(options: GenerateOptions): Promise<string> {
    if (!this.config.customAPI) {
      throw new Error('自定义API未配置');
    }

    console.log('[AI服务-自定义Raw] 使用ordered_prompts');

    // 过滤掉占位消息
    const messages = (options.ordered_prompts || []).filter(msg => msg.content !== '</input>');

    console.log(`[AI服务-自定义Raw] 消息数量: ${messages.length}`);
    return this.callOpenAICompatibleAPI(messages, options.should_stream || false, options.onStreamChunk);
  }

  private async callOpenAICompatibleAPI(
    messages: AIMessage[],
    streaming: boolean,
    onStreamChunk?: (chunk: string) => void
  ): Promise<string> {
    const { url, apiKey, model, temperature, maxTokens } = this.config.customAPI!;

    console.log(`[AI服务-API调用] URL: ${url}, Model: ${model}, 消息数: ${messages.length}, 流式: ${streaming}`);

    try {
      if (streaming) {
        // 流式传输
        return await this.streamingRequest(url, apiKey, model, messages, temperature || 0.7, maxTokens || 2000, onStreamChunk);
      } else {
        // 非流式传输
        const response = await axios.post(
          `${url}/v1/chat/completions`,
          {
            model,
            messages,
            temperature: temperature || 0.7,
            max_tokens: maxTokens || 2000,
            stream: false
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 120000 // 2分钟超时
          }
        );

        const content = response.data.choices[0].message.content;
        console.log(`[AI服务-API调用] 响应长度: ${content.length}`);
        return content;
      }
    } catch (error) {
      console.error('[AI服务-API调用] 失败:', error);
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`API错误 ${error.response.status}: ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
          throw new Error('网络错误：无法连接到API服务器');
        }
      }
      throw new Error(`自定义API调用失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private async streamingRequest(
    url: string,
    apiKey: string,
    model: string,
    messages: AIMessage[],
    temperature: number,
    maxTokens: number,
    onStreamChunk?: (chunk: string) => void
  ): Promise<string> {
    console.log('[AI服务-流式] 开始流式请求');

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

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';
    let inThinkingTag = false; // 标记是否在thinking标签内
    let thinkingBuffer = ''; // 缓存可能的thinking标签

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
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              // 处理thinking标签过滤
              for (let i = 0; i < content.length; i++) {
                const char = content[i];
                thinkingBuffer += char;

                // 检测thinking标签开始
                if (thinkingBuffer.includes('<thinking>')) {
                  inThinkingTag = true;
                  thinkingBuffer = '';
                  continue;
                }

                // 检测thinking标签结束
                if (inThinkingTag && thinkingBuffer.includes('</thinking>')) {
                  inThinkingTag = false;
                  thinkingBuffer = '';
                  continue;
                }

                // 如果不在thinking标签内，且缓冲区不包含可能的标签开始
                if (!inThinkingTag) {
                  // 检查缓冲区是否可能是标签的开始部分
                  const possibleTagStart = '<thinking>'.startsWith(thinkingBuffer) ||
                                          '</thinking>'.startsWith(thinkingBuffer);
                  
                  if (!possibleTagStart && thinkingBuffer.length > 0) {
                    // 输出缓冲区内容（不是标签）
                    fullText += thinkingBuffer;
                    if (onStreamChunk) {
                      onStreamChunk(thinkingBuffer);
                    }
                    thinkingBuffer = '';
                  } else if (thinkingBuffer.length > 10) {
                    // 缓冲区太长，不可能是标签，输出
                    fullText += thinkingBuffer;
                    if (onStreamChunk) {
                      onStreamChunk(thinkingBuffer);
                    }
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

      // 处理剩余缓冲区
      if (!inThinkingTag && thinkingBuffer.length > 0) {
        fullText += thinkingBuffer;
        if (onStreamChunk) {
          onStreamChunk(thinkingBuffer);
        }
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
