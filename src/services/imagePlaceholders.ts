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

/**
 * 插图规则。
 * 重要：标记属性必须用单引号。双引号嵌在 JSON 的 "text" 里会把整段 JSON 弄坏，
 * 宽松解析也会在 prompt=" 处截断，整张图就丢了。
 */
export const IMAGE_PROMPT_RULES = `
[剧情插图 · 已开启]
本局已开启生图。有外景、人物对峙、战斗、法术、仪式或关键道具登场的回合，必须额外给出画面（优先 JSON 字段，其次正文标记）：

推荐（不会破坏 JSON）：
"story_image":{"prompt":"可见的人物外貌服装场景光线构图，英文或中英短标签","size":"1024x1024"}

或在 text 正文末尾单独一行（属性必须用单引号）：
[[image prompt='画面描述' size='1024x1024']]

规则：
1. prompt 只写看得见的内容，不要写剧情解说、心理独白或对话框。
2. size 只能是 1024x1024、832x1216、1216x832 之一；竖构图用 832x1216，横构图用 1216x832。
3. story_image 与标记二选一即可；不要放进 mid_term_memory，也不要写成 tavern_commands。
4. 纯对话、纯内心、无画面推进的回合可以不插；其余有画面的回合默认都要插，每回合最多 1 个。
5. 禁止写成 [[image prompt="..."]]（双引号会破坏 JSON）。
`.trim();

const ALLOWED_SIZES = ['1024x1024', '832x1216', '1216x832'] as const;

export function normalizeImageSize(raw: string): string {
  const value = String(raw || '').trim().toLowerCase().replace('*', 'x').replace(/\s+/g, '');
  return (ALLOWED_SIZES as readonly string[]).includes(value) ? value : '1024x1024';
}

function readAttr(source: string, key: string): string {
  const single = source.match(new RegExp(`${key}\\s*=\\s*'([^']*)'`, 'i'));
  if (single?.[1]) return single[1].trim();
  const quoted = source.match(new RegExp(`${key}\\s*=\\s*"([^"]*)"`, 'i'));
  if (quoted?.[1]) return quoted[1].trim();
  return '';
}

function removeBrokenTail(reply: string): string {
  const lower = reply.toLowerCase();
  const start = lower.lastIndexOf('[[image');
  if (start < 0) return reply;
  if (reply.indexOf(']]', start) >= 0) return reply;
  return reply.slice(0, start);
}

function pushImage(images: ParsedImage[], prompt: string, size = ''): void {
  const cleaned = String(prompt || '').trim();
  if (!cleaned) return;
  if (images.some((item) => item.prompt === cleaned)) return;
  images.push({ prompt: cleaned, size: normalizeImageSize(size) });
}

/** 从 JSON 对象里抽出 story_image / image 等字段。 */
export function parseStoryImagesFromObject(obj: unknown): ParsedImage[] {
  if (!obj || typeof obj !== 'object') return [];
  const row = obj as Record<string, unknown>;
  const images: ParsedImage[] = [];

  const takeOne = (value: unknown) => {
    if (!value) return;
    if (typeof value === 'string') {
      pushImage(images, value);
      return;
    }
    if (typeof value === 'object') {
      const item = value as Record<string, unknown>;
      pushImage(
        images,
        String(item.prompt || item.画面 || item.description || ''),
        String(item.size || item.尺寸 || ''),
      );
    }
  };

  takeOne(row.story_image);
  takeOne(row.storyImage);
  takeOne(row.image);
  if (Array.isArray(row.story_images)) row.story_images.forEach(takeOne);
  if (Array.isArray(row.storyImages)) row.storyImages.forEach(takeOne);

  return images.slice(0, 1);
}

export function parseImagePlaceholders(reply: string): ParsedImage[] {
  const source = removeBrokenTail(reply || '');
  const images: ParsedImage[] = [];

  // [[image|prompt|size]] 管道写法，彻底避开引号
  const pipe = /\[\[\s*image\s*\|\s*([^|\]]+?)\s*(?:\|\s*([^|\]]*?)\s*)?\]\]/gi;
  let pipeMatch: RegExpExecArray | null = pipe.exec(source);
  while (pipeMatch) {
    pushImage(images, pipeMatch[1] || '', pipeMatch[2] || '');
    pipeMatch = pipe.exec(source);
  }

  // [[image prompt='...' size='...']] 或双引号旧写法
  const regex = /\[\[\s*image([\s\S]*?)\]\]/gi;
  let match: RegExpExecArray | null = regex.exec(source);
  while (match) {
    const attrs = match[1] || '';
    if (attrs.includes('|') && !/prompt\s*=/i.test(attrs)) {
      match = regex.exec(source);
      continue;
    }
    const prompt = readAttr(attrs, 'prompt');
    if (prompt) pushImage(images, prompt, readAttr(attrs, 'size'));
    match = regex.exec(source);
  }
  return images.slice(0, 1);
}

export function stripImagePlaceholders(reply: string): string {
  const source = removeBrokenTail(reply || '');
  return source
    .replace(/\[\[\s*image\s*\|[\s\S]*?\]\]/gi, '')
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

/**
 * 汇总正文标记、原始响应恢复、JSON 字段里的插图。
 * raw 用于 JSON 被双引号写坏时，仍能从原文捞出标记。
 */
export function harvestStoryImages(input: {
  text?: string;
  raw?: string;
  obj?: unknown;
}): { text: string; images: ParsedImage[] } {
  const images: ParsedImage[] = [];
  for (const item of parseStoryImagesFromObject(input.obj)) pushImage(images, item.prompt, item.size);
  if (input.text) {
    for (const item of parseImagePlaceholders(input.text)) pushImage(images, item.prompt, item.size);
  }
  if (input.raw && input.raw !== input.text) {
    for (const item of parseImagePlaceholders(input.raw)) pushImage(images, item.prompt, item.size);
  }
  return {
    text: stripImagePlaceholders(input.text || ''),
    images: images.slice(0, 1),
  };
}

/** 模型没给标记时，用正文拼一张兜底提示词，避免“开了等于没开”。 */
export function buildFallbackStoryImage(narrative: string, location?: string): ParsedImage | null {
  const cleaned = String(narrative || '')
    .replace(/【[^】]*】/g, ' ')
    .replace(/〔[^〕]*〕/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length < 36) return null;
  const snippet = cleaned.slice(0, 260);
  const place = String(location || '').trim();
  const prompt = [
    'Chinese xianxia illustration, ink-wash and detailed painting, cinematic lighting, no text, no watermark',
    place ? `location: ${place}` : '',
    `scene: ${snippet}`,
  ].filter(Boolean).join('. ');
  return { prompt, size: '1024x1024' };
}

export function ensureStoryImages(
  existing: ParsedImage[],
  narrative: string,
  location?: string,
): ParsedImage[] {
  if (existing.length) return existing.slice(0, 1);
  const fallback = buildFallbackStoryImage(narrative, location);
  return fallback ? [fallback] : [];
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
  const model = input.model || 'gpt-image-2.5-sunburst';
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
