/**
 * 生图渠道。NAI 与 GPT 图片是独立类型，不走对话接口。
 * 连接测试只请求模型列表，不会触发生图。
 */
import axios from 'axios';
import type { APIConfig } from '@/stores/apiManagementStore';
import {
  buildGptImageBody,
  buildNaiBody,
  gptImagesUrl,
  gptModelsUrl,
  imageErrorMessage,
  naiGenerateUrl,
  naiModelsUrl,
} from '@/services/imagePlaceholders';

export interface GeneratedImage {
  dataUrl: string;
  seed?: number;
}

const NAI_TIMEOUT = 180_000;
const GPT_TIMEOUT = 240_000;

function bearer(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}` };
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const mime = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/png';
  return `data:${mime};base64,${btoa(binary)}`;
}

function pngDataUrl(base64: string): string {
  const raw = base64.trim().replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  return `data:image/png;base64,${raw}`;
}

async function urlToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:image/')) return url;
  const response = await axios.get(url, { responseType: 'blob', timeout: 60_000 });
  return blobToDataUrl(response.data as Blob);
}

export async function listImageModels(api: Pick<APIConfig, 'provider' | 'url' | 'apiKey'>): Promise<string[]> {
  const url = api.provider === 'nai' ? naiModelsUrl(api.url) : gptModelsUrl(api.url);
  const response = await axios.get(url, {
    headers: { ...bearer(api.apiKey), Accept: 'application/json' },
    timeout: 20_000,
  });
  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  return rows.map((row: { id?: string }) => String(row?.id || '').trim()).filter(Boolean);
}

export async function testImageConnection(api: Pick<APIConfig, 'provider' | 'url' | 'apiKey' | 'name'>): Promise<string[]> {
  if (!api.url?.trim() || !api.apiKey?.trim()) throw new Error('请先填写 API 地址和密钥');
  try {
    const models = await listImageModels(api);
    if (!models.length) throw new Error('模型列表为空');
    return models;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(imageErrorMessage(error.response.data, error.response.status));
    }
    throw error instanceof Error ? error : new Error('连接失败');
  }
}

async function postOnce(url: string, body: unknown, headers: Record<string, string>, timeout: number) {
  return axios.post(url, body, {
    headers: { ...headers, 'Content-Type': 'application/json', Accept: 'application/json' },
    timeout,
    validateStatus: () => true,
  });
}

export async function generateNaiImage(api: APIConfig, prompt: string, size: string, idempotencyKey: string): Promise<GeneratedImage> {
  const body = buildNaiBody({
    prompt,
    model: api.model,
    size,
    steps: api.imageSteps,
    scale: api.imageScale,
    negative: api.negativePrompt,
  });
  const url = naiGenerateUrl(api.url);
  const headers = { ...bearer(api.apiKey), 'Idempotency-Key': idempotencyKey };
  let response = await postOnce(url, body, headers, NAI_TIMEOUT);
  if (response.status === 429 || response.status === 503) {
    response = await postOnce(url, body, headers, NAI_TIMEOUT);
  }
  if (response.status !== 201 && response.status !== 200) {
    throw new Error(imageErrorMessage(response.data, response.status));
  }
  const image = response.data?.images?.[0];
  const raw = String(image?.image || '').trim();
  if (!raw) throw new Error('生图接口没有返回图片');
  const seed = Number(image?.seed);
  return { dataUrl: pngDataUrl(raw), seed: Number.isFinite(seed) ? seed : undefined };
}

export async function generateGptImage(api: APIConfig, prompt: string, size: string): Promise<GeneratedImage> {
  const body = buildGptImageBody({ prompt, model: api.model, size });
  const response = await postOnce(gptImagesUrl(api.url), body, bearer(api.apiKey), GPT_TIMEOUT);
  if (response.status < 200 || response.status >= 300) {
    throw new Error(imageErrorMessage(response.data, response.status));
  }
  const item = response.data?.data?.[0];
  if (item?.b64_json) return { dataUrl: pngDataUrl(String(item.b64_json)) };
  if (item?.url) return { dataUrl: await urlToDataUrl(String(item.url)) };
  throw new Error('生图接口没有返回图片');
}

export async function generateStoryImage(api: APIConfig, prompt: string, size: string, idempotencyKey: string): Promise<GeneratedImage> {
  if (api.provider === 'nai') return generateNaiImage(api, prompt, size, idempotencyKey);
  if (api.provider === 'gpt-image') return generateGptImage(api, prompt, size);
  throw new Error('当前渠道不是生图类型');
}
