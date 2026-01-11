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

