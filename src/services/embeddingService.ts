import axios from 'axios';
import type { APIProvider } from '@/services/aiService';

export interface EmbeddingRequestConfig {
  provider: APIProvider;
  url: string;
  apiKey: string;
  model: string;
}

export function normalizeBaseUrl(url: string): string {
  return (url || '').toString().trim().replace(/\/v1\/?$/, '').replace(/\/+$/, '');
}

function isDashScopeHost(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === 'dashscope.aliyuncs.com' || u.hostname === 'dashscope-intl.aliyuncs.com';
  } catch {
    const lower = (url || '').toString().toLowerCase();
    return lower.includes('dashscope.aliyuncs.com') || lower.includes('dashscope-intl.aliyuncs.com');
  }
}

function isSiliconFlowHost(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === 'api.siliconflow.cn' || u.hostname.endsWith('.siliconflow.cn');
  } catch {
    const lower = (url || '').toString().toLowerCase();
    return lower.includes('siliconflow.cn');
  }
}

function buildDashScopeEmbeddingsEndpoint(urlOrBase: string): string {
  const trimmed = (urlOrBase || '').trim().replace(/\/+$/, '');
  const fullPath = '/api/v1/services/embeddings/text-embedding/text-embedding';

  // 用户可能直接填了完整端点
  if (trimmed.includes(fullPath)) return trimmed;

  try {
    const u = new URL(trimmed);
    const path = (u.pathname || '').replace(/\/+$/, '');

    // normalizeBaseUrl 可能把 https://dashscope.aliyuncs.com/api/v1 变成 https://dashscope.aliyuncs.com/api
    if (path === '/api') return `${u.origin}${fullPath}`;

    // 用户可能误填了 OpenAI 兼容路径（/compatible-mode/v1），这里强制回到原生 /api/v1
    return `${u.origin}${fullPath}`;
  } catch {
    // 兜底：字符串拼接（尽量避免重复 /api）
    if (trimmed.endsWith('/api')) return `${trimmed}/v1/services/embeddings/text-embedding/text-embedding`;
    return `${trimmed}${fullPath}`;
  }
}

export function normalizeToUnitVector(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (!norm) return vec;
  return vec.map(v => v / norm);
}

export async function createEmbeddings(
  config: EmbeddingRequestConfig,
  inputs: string[],
): Promise<number[][]> {
  const provider = config.provider;
  const baseUrl = normalizeBaseUrl(config.url);
  const apiKey = (config.apiKey || '').trim();
  const model = (config.model || '').trim();

  if (!baseUrl) throw new Error('Embedding API 地址未配置');
  if (!apiKey) throw new Error('Embedding API Key 未配置');
  if (!model) throw new Error('Embedding 模型未配置');

  // 阿里云百炼（DashScope）Embedding：不支持 OpenAI 兼容 /v1/embeddings，需要走原生端点
  if (isDashScopeHost(baseUrl)) {
    const endpoint = buildDashScopeEmbeddingsEndpoint(baseUrl);
    const resp = await axios.post(
      endpoint,
      {
        model,
        input: { texts: inputs },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    // DashScope: { output: { embeddings: [{ text_index, embedding: number[] }] } }
    const embeddings = resp.data?.output?.embeddings;
    if (!Array.isArray(embeddings) || embeddings.length !== inputs.length) {
      throw new Error('Embedding 响应格式异常（DashScope）');
    }

    const ordered = embeddings
      .map((e: any) => ({ index: Number(e?.text_index), embedding: e?.embedding }))
      .sort((a, b) => a.index - b.index);

    return ordered.map((e: any) => {
      if (!Array.isArray(e?.embedding)) throw new Error('Embedding 响应缺少 embedding（DashScope）');
      return e.embedding as number[];
    });
  }

  // 硅基流动（SiliconFlow）Embedding：使用 OpenAI 兼容格式
  if (isSiliconFlowHost(baseUrl) || provider === 'siliconflow-embedding') {
    const resp = await axios.post(
      `${baseUrl}/v1/embeddings`,
      {
        model,
        input: inputs,
        encoding_format: 'float',
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const data = resp.data?.data;
    if (!Array.isArray(data) || data.length !== inputs.length) {
      throw new Error('Embedding 响应格式异常（SiliconFlow）');
    }

    // 按 index 排序确保顺序正确
    const sorted = [...data].sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0));
    return sorted.map((d: any) => {
      const embedding = d?.embedding;
      if (!Array.isArray(embedding)) throw new Error('Embedding 响应缺少 embedding（SiliconFlow）');
      return embedding as number[];
    });
  }

  if (provider === 'openai' || provider === 'deepseek' || provider === 'custom') {
    const resp = await axios.post(
      `${baseUrl}/v1/embeddings`,
      {
        model,
        input: inputs,
        encoding_format: 'float',
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const data = resp.data?.data;
    if (!Array.isArray(data) || data.length !== inputs.length) {
      throw new Error('Embedding 响应格式异常');
    }

    return data.map((d: any) => {
      const embedding = d?.embedding;
      if (!Array.isArray(embedding)) throw new Error('Embedding 响应缺少 embedding');
      return embedding as number[];
    });
  }

  throw new Error(`当前 provider 不支持 Embedding：${provider}`);
}
