/** 剧情正文里的插图标记，以及 NAI / GPT 生图请求体。 */

export interface ParsedImage {
  prompt: string;
  size: string;
}

export interface StoryImageRecord {
  id: string;
  prompt: string;
  size: string;
  status: 'pending' | 'loading' | 'done' | 'failed';
  dataUrl: string;
  error: string;
  seed?: number;
  narrativeIndex: number;
  idempotencyKey: string;
  createdAt: string;
}

export const IMAGE_PROMPT_RULES = `
[剧情插图]
需要出画面时，在 text 正文中单独插入一行：[[image prompt="画面描述" size="1024x1024"]]
prompt 只写看得见的人物、场景、光线和构图，不要写剧情解说。
size 只能是 1024x1024、832x1216、1216x832 之一。
没有需要出图的回合不要写这个标记。标记不要放进 mid_term_memory，也不要写成 tavern_commands。
`.trim();

const ALLOWED_SIZES = ['1024x1024', '832x1216', '1216x832'] as const;

export function normalizeImageSize(raw: string): string {
  const value = String(raw || '').trim().toLowerCase().replace('*', 'x').replace(/\s+/g, '');
  return (ALLOWED_SIZES as readonly string[]).includes(value) ? value : '1024x1024';
}

function readAttr(source: string, key: string): string {
  const quoted = source.match(new RegExp(`${key}\\s*=\\s*"([^"]*)"`, 'i'));
  if (quoted?.[1]) return quoted[1].trim();
  const single = source.match(new RegExp(`${key}\\s*=\\s*'([^']*)'`, 'i'));
  if (single?.[1]) return single[1].trim();
  return '';
}

function removeBrokenTail(reply: string): string {
  const lower = reply.toLowerCase();
  const start = lower.lastIndexOf('[[image');
  if (start < 0) return reply;
  if (reply.indexOf(']]', start) >= 0) return reply;
  return reply.slice(0, start);
}

export function parseImagePlaceholders(reply: string): ParsedImage[] {
  const source = removeBrokenTail(reply || '');
  const images: ParsedImage[] = [];
  const regex = /\[\[\s*image([\s\S]*?)\]\]/gi;
  let match: RegExpExecArray | null = regex.exec(source);
  while (match) {
    const attrs = match[1] || '';
    const prompt = readAttr(attrs, 'prompt');
    if (prompt) images.push({ prompt, size: normalizeImageSize(readAttr(attrs, 'size')) });
    match = regex.exec(source);
  }
  return images;
}

export function stripImagePlaceholders(reply: string): string {
  const source = removeBrokenTail(reply || '');
  return source
    .replace(/\[\[\s*image[\s\S]*?\]\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function takeImagePlaceholders(reply: string): { text: string; images: ParsedImage[] } {
  return {
    text: stripImagePlaceholders(reply),
    images: parseImagePlaceholders(reply),
  };
}

export function parseSize(size: string): { width: number; height: number } {
  const [w, h] = normalizeImageSize(size).split('x').map((n) => Number(n));
  return { width: w, height: h };
}

/** NAI 宽高必须是 64 的倍数，总像素不超过 1,048,576。 */
export function snapNaiSize(width: number, height: number): { width: number; height: number } {
  const snap = (n: number) => Math.max(64, Math.round(n / 64) * 64);
  let w = snap(width);
  let h = snap(height);
  while (w * h > 1_048_576 && (w > 64 || h > 64)) {
    if (w >= h) w -= 64;
    else h -= 64;
  }
  return { width: w, height: h };
}

/** gpt-image 只接受这三档。竖图映射到 1024x1536，横图映射到 1536x1024。 */
export function gptImageSize(size: string): string {
  const { width, height } = parseSize(size);
  if (width === height) return '1024x1024';
  return height > width ? '1024x1536' : '1536x1024';
}

export function naiGenerateUrl(baseUrl: string): string {
  let root = String(baseUrl || '').trim().replace(/\/+$/, '');
  root = root.replace(/\/ai\/generate-image\/?$/i, '').replace(/\/models\/?$/i, '');
  if (!/\/api$/i.test(root)) root = `${root}/api`;
  return `${root}/ai/generate-image`;
}

export function naiModelsUrl(baseUrl: string): string {
  return naiGenerateUrl(baseUrl).replace(/\/ai\/generate-image$/i, '/models');
}

export function gptImagesUrl(baseUrl: string): string {
  let root = String(baseUrl || '').trim().replace(/\/+$/, '');
  root = root.replace(/\/images\/generations\/?$/i, '');
  if (/\/v1$/i.test(root)) return `${root}/images/generations`;
  return `${root}/v1/images/generations`;
}

export function gptModelsUrl(baseUrl: string): string {
  return gptImagesUrl(baseUrl).replace(/\/images\/generations$/i, '/models');
}

export function buildNaiBody(input: {
  prompt: string;
  model: string;
  size: string;
  steps?: number;
  scale?: number;
  negative?: string;
}): Record<string, unknown> {
  const parsed = parseSize(input.size);
  const { width, height } = snapNaiSize(parsed.width, parsed.height);
  const steps = Math.min(28, Math.max(1, Math.round(input.steps ?? 23)));
  const scale = Number.isFinite(input.scale) ? Number(input.scale) : 5;
  return {
    input: input.prompt,
    model: input.model || 'nai-diffusion-4-5-full',
    action: 'generate',
    parameters: {
      width,
      height,
      steps,
      scale,
      n_samples: 1,
      uc: input.negative || '',
    },
  };
}

export function buildGptImageBody(input: { prompt: string; model: string; size: string }): Record<string, unknown> {
  const model = input.model || 'gpt-image-1';
  const body: Record<string, unknown> = {
    model,
    prompt: input.prompt,
    n: 1,
    size: gptImageSize(input.size),
  };
  if (model.toLowerCase().includes('gpt-image')) body.output_format = 'png';
  else body.response_format = 'b64_json';
  return body;
}

export function imageErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === 'object') {
    const row = data as Record<string, unknown>;
    const nested = row.error;
    if (nested && typeof nested === 'object') {
      const message = String((nested as Record<string, unknown>).message || '').trim();
      if (message) return message;
    }
    const message = String(row.message || row.detail || '').trim();
    const code = String(row.code || '').trim();
    if (message && code) return `${message} (${code})`;
    if (message) return message;
  }
  return `生图失败（HTTP ${status}）`;
}
