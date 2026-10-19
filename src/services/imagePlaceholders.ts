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
"story_image":{"prompt":"1 young man, half body, sharp fox eyes, black hair tied with a white jade pin, layered white silk robe with silver cloud embroidery, right hand resting on a bronze sword, standing before a mossy stone stele, misty pine forest behind, cool morning light from the left, face large and detailed","size":"832x1216"}

或在 text 正文末尾单独一行（属性必须用单引号）：
[[image prompt='同上这样的具体画面' size='832x1216']]

规则：
1. prompt 用英文写看得见的画面，要具体，不要一句概括，不要剧情解说、心理独白或对话框。
2. 必须写到：前景人数（最多 2 人）、景别（半身或膝上，脸要大）、五官与发型、服装颜色层次和纹样、姿态和手在做什么、地点与前景道具、光线方向和颜色。
3. 人多的场面只画最近的一到两人，不要远景小人，不要一排人站着。
4. size 只能是 1024x1024、832x1216、1216x832 之一。有人物用 832x1216；只有风景、没有近景人物时才用 1216x832。
5. story_image 与标记二选一即可；不要放进 mid_term_memory，也不要写成 tavern_commands。
6. 纯对话、纯内心、无画面推进的回合可以不插；其余有画面的回合默认都要插，每回合最多 1 个。
7. 禁止写成 [[image prompt="..."]]（双引号会破坏 JSON）。
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
  const snippet = cleaned.slice(0, 480);
  const place = String(location || '').trim();
  const prompt = [
    place ? `location: ${place}` : '',
    `visible moment: ${snippet}`,
  ].filter(Boolean).join('. ');
  return { prompt, size: '832x1216' };
}

/** 发给画图接口前补上景别和细节，避免一句概括被画成远景群像。 */
export function enrichStoryImagePrompt(prompt: string): string {
  const text = String(prompt || '').replace(/\s+/g, ' ').trim();
  if (!text) return text;
  if (text.length > 700) {
    return /no text/i.test(text) ? text : `${text} no text, no watermark, sharp face, detailed hands.`;
  }
  return [
    text,
    'Compose one clear foreground with at most two nearest people, half body or knee-up, faces about one third of the frame, sharp eyes, detailed skin, detailed hands, individual hair strands.',
    'Clothing is layered silk with specific colors, embroidery, jewelry and weapons. Background stays soft and secondary.',
    'Chinese xianxia anime, cinematic light, no text, no watermark, no tiny distant crowd, no extra limbs.',
  ].join(' ');
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

export interface NaiImagePayload {
  base64?: string;
  bytes?: Uint8Array;
  url?: string;
  mime: string;
  seed?: number;
}

function mimeFromName(name: string): string {
  if (/\.jpe?g$/i.test(name)) return 'image/jpeg';
  if (/\.webp$/i.test(name)) return 'image/webp';
  return 'image/png';
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array | null> {
  if (!data.length) return null;
  try {
    const stream = new DecompressionStream('deflate-raw');
    const copy = data.slice();
    const source = new Blob([copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength)]);
    const buffer = await new Response(source.stream().pipeThrough(stream)).arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

function findZipEnd(view: DataView): number {
  const start = Math.max(0, view.byteLength - 22 - 65535);
  for (let offset = view.byteLength - 22; offset >= start; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  return -1;
}

/** NovelAI 原生接口成功时返回 ZIP，里面是 PNG。尺寸以中央目录为准。 */
async function imageFromZip(bytes: Uint8Array): Promise<NaiImagePayload | null> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = findZipEnd(view);
  if (end < 0) return null;
  let offset = view.getUint32(end + 16, true);
  const count = view.getUint16(end + 10, true);
  for (let index = 0; index < count && offset + 46 <= bytes.length; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;
    if (!/\.(png|jpe?g|webp)$/i.test(name) || localOffset + 30 > bytes.length) continue;
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.length) continue;
    const compressed = bytes.subarray(dataStart, dataEnd);
    const raw = method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : null;
    if (!raw?.length) continue;
    return { bytes: raw, mime: mimeFromName(name) };
  }
  return null;
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function imageFromJson(data: unknown): NaiImagePayload | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  const first = Array.isArray(row.images) ? row.images[0] : undefined;
  const item = first && typeof first === 'object' ? first as Record<string, unknown> : {};
  const nested = Array.isArray(row.data) ? row.data[0] as Record<string, unknown> | undefined : undefined;
  const base64 = firstString(
    typeof first === 'string' ? first : '',
    item.image,
    item.b64_json,
    item.b64,
    item.base64,
    row.image,
    row.b64_json,
    nested?.b64_json,
    nested?.image,
  );
  const url = firstString(item.url, row.url, nested?.url);
  const seed = Number(item.seed ?? row.seed);
  if (base64) return { base64, mime: 'image/png', seed: Number.isFinite(seed) ? seed : undefined };
  if (/^https?:\/\//i.test(url) || url.startsWith('data:image/')) {
    return { url, mime: 'image/png', seed: Number.isFinite(seed) ? seed : undefined };
  }
  return null;
}

/**
 * 把生图响应还原成图片。
 * 蛋糕站 / NovelAI 原生接口返回 ZIP；部分中转返回 JSON。
 */
export async function readNaiPayload(payload: ArrayBuffer): Promise<NaiImagePayload | null> {
  const bytes = new Uint8Array(payload);
  if (!bytes.length) return null;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return imageFromZip(bytes);
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return { bytes, mime: 'image/png' };
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return { bytes, mime: 'image/jpeg' };
  const text = new TextDecoder().decode(bytes).trim();
  if (!text.startsWith('{') && !text.startsWith('[')) return null;
  try {
    return imageFromJson(JSON.parse(text));
  } catch {
    return null;
  }
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
