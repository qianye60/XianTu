/**
 * 各服务商实际发请求时，拼在「API 地址」后面的路径。
 * OpenAI 走 Chat Completions（/v1/chat/completions），不是 Responses API（/v1/responses）。
 */
import type { APIProvider } from '@/services/aiService';
import { gptImagesUrl, gptModelsUrl, naiGenerateUrl, naiModelsUrl } from '@/services/imagePlaceholders';

function isLocalApiHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  if (host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return false;
}

export function trimApiBase(url: string): string {
  const trimmed = (url || '').trim().replace(/\/+$/, '');
  if (!/^http:\/\//i.test(trimmed)) return trimmed;
  try {
    if (isLocalApiHost(new URL(trimmed).hostname)) return trimmed;
  } catch {
    return trimmed;
  }
  // 公网 http 会被 301 到 https，跳转响应没有跨域头，浏览器会直接失败。
  return trimmed.replace(/^http:\/\//i, 'https://');
}

export function joinApiUrl(base: string, path: string): string {
  const root = trimApiBase(base);
  const suffix = path.startsWith('/') || path.startsWith('?') ? path : `/${path}`;
  return root ? `${root}${suffix}` : suffix;
}

/** 对话 / Embedding 的主请求路径。Gemini 的模型名写在路径里。 */
export function chatRequestPath(provider: APIProvider, model = ''): string {
  switch (provider) {
    case 'zhipu':
      return '/api/paas/v4/chat/completions';
    case 'volcengine':
      return '/api/v3/chat/completions';
    case 'claude':
      return '/v1/messages';
    case 'gemini': {
      const name = model.trim() || '{模型}';
      return `/v1beta/models/${name}:generateContent`;
    }
    case 'siliconflow-embedding':
      return '/v1/embeddings';
    case 'nai':
      return '/ai/generate-image';
    case 'gpt-image':
      return '/v1/images/generations';
    default:
      return '/v1/chat/completions';
  }
}

export function geminiStreamPath(model = ''): string {
  const name = model.trim() || '{模型}';
  return `/v1beta/models/${name}:streamGenerateContent`;
}

/** 拉取模型列表的路径。Claude 没有这个接口。 */
export function modelsRequestPath(provider: APIProvider): string {
  switch (provider) {
    case 'zhipu':
      return '/api/paas/v4/models';
    case 'volcengine':
      return '/api/v3/models';
    case 'gemini':
      return '/v1beta/models';
    case 'siliconflow-embedding':
      return '/v1/models?sub_type=embedding';
    case 'nai':
      return '/models';
    case 'gpt-image':
      return '/v1/models';
    case 'claude':
      return '';
    default:
      return '/v1/models';
  }
}

export function apiFormatLabel(provider: APIProvider): string {
  switch (provider) {
    case 'openai':
      return 'OpenAI 兼容格式（Chat Completions），不是 Responses API';
    case 'deepseek':
    case 'custom':
      return 'OpenAI 兼容格式（Chat Completions）';
    case 'zhipu':
      return '智谱 Chat Completions';
    case 'volcengine':
      return '火山方舟 Chat Completions（OpenAI 兼容）';
    case 'claude':
      return 'Anthropic Messages';
    case 'gemini':
      return 'Gemini generateContent';
    case 'siliconflow-embedding':
      return 'OpenAI 兼容 Embedding';
    case 'nai':
      return 'NAI 生图（POST /ai/generate-image，测试连接只请求 /models）';
    case 'gpt-image':
      return 'OpenAI 兼容生图（POST /v1/images/generations）';
    default:
      return 'OpenAI 兼容格式（Chat Completions）';
  }
}

export interface ApiRequestPreview {
  format: string;
  method: 'POST';
  base: string;
  path: string;
  url: string;
  streamPath: string;
  modelsPath: string;
  modelsUrl: string;
  warning: string;
}

function splitUrl(full: string): { base: string; path: string } {
  try {
    const url = new URL(full);
    return { base: url.origin, path: `${url.pathname}${url.search}` };
  } catch {
    return { base: '', path: full };
  }
}

export function previewApiRequest(provider: APIProvider, rawUrl: string, model?: string): ApiRequestPreview {
  if (provider === 'nai' || provider === 'gpt-image') {
    const fallback = provider === 'nai' ? 'https://create.suanbohe.com/api' : 'https://api.openai.com';
    const source = rawUrl.trim() || fallback;
    const generate = provider === 'nai' ? naiGenerateUrl(source) : gptImagesUrl(source);
    const models = provider === 'nai' ? naiModelsUrl(source) : gptModelsUrl(source);
    const gen = splitUrl(generate);
    const list = splitUrl(models);
    return {
      format: apiFormatLabel(provider),
      method: 'POST',
      base: gen.base,
      path: gen.path,
      url: generate,
      streamPath: '',
      modelsPath: list.path,
      modelsUrl: models,
      warning: '',
    };
  }
  const base = trimApiBase(rawUrl);
  const path = chatRequestPath(provider, model);
  const modelsPath = modelsRequestPath(provider);
  const streamPath = provider === 'gemini' ? geminiStreamPath(model) : '';
  let warning = '';
  if (base) {
    const lower = base.toLowerCase();
    const doubledV1 = path.startsWith('/v1/') && /\/v1$/i.test(base);
    const alreadyPathed = /\/(chat\/completions|messages|embeddings)(\/|$)/i.test(lower)
      || /:(stream)?generatecontent/i.test(lower)
      || /\/v1beta\/models\//i.test(lower);
    if (doubledV1) {
      warning = '地址末尾已经是 /v1，请求时还会再拼一次下面的路径。地址只填到域名即可。';
    } else if (alreadyPathed) {
      warning = '地址里已经写了接口路径。这里只填服务根地址，后面的路径由程序拼接。';
    }
  }
  return {
    format: apiFormatLabel(provider),
    method: 'POST',
    base,
    path,
    url: joinApiUrl(base, path),
    streamPath,
    modelsPath,
    modelsUrl: modelsPath ? joinApiUrl(base, modelsPath) : '',
    warning,
  };
}
