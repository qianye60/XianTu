/**
 * 回合结束后，把正文里的插图标记交给当前生图渠道。
 * 图片记在存档的图廊里，和织界一样可以下载、导出、删除。
 */
import { useAPIManagementStore, type APIConfig } from '@/stores/apiManagementStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import { isImageProvider } from '@/data/apiProviders';
import { generateStoryImage } from '@/services/imageGenerationService';
import type { ParsedImage, StoryImageRecord } from '@/services/imagePlaceholders';

export type { StoryImageRecord };

const inflight = new Set<string>();
let running = false;

export function listEnabledImageApis(): APIConfig[] {
  const store = useAPIManagementStore();
  return store.apiConfigs.filter((item) => item.enabled && isImageProvider(item.provider));
}

export function resolveImageApi(): APIConfig | null {
  const store = useAPIManagementStore();
  if (!store.isFunctionEnabled('image')) return null;
  const imageApis = listEnabledImageApis();
  if (!imageApis.length) return null;
  const assignment = store.apiAssignments.find((item) => item.type === 'image');
  if (assignment && assignment.apiId !== 'default') {
    const picked = imageApis.find((item) => item.id === assignment.apiId);
    if (picked) return picked;
  }
  // 开了开关但没指定渠道：只有一个生图 API 时直接用它，避免“开了等于没开”
  return imageApis.length === 1 ? imageApis[0] : null;
}

/** 打开剧情生图。没有可用渠道时返回 false。 */
export function enableStoryImage(preferredApiId?: string): { ok: boolean; message: string; api: APIConfig | null } {
  const store = useAPIManagementStore();
  const imageApis = listEnabledImageApis();
  if (!imageApis.length) {
    store.setFunctionEnabled('image', false);
    return { ok: false, message: '请先新增并启用一个 NAI 或 GPT 生图渠道', api: null };
  }
  const preferred = preferredApiId
    ? imageApis.find((item) => item.id === preferredApiId)
    : undefined;
  const assignedId = store.apiAssignments.find((item) => item.type === 'image')?.apiId;
  const current = assignedId && assignedId !== 'default'
    ? imageApis.find((item) => item.id === assignedId)
    : undefined;
  const api = preferred || current || (imageApis.length === 1 ? imageApis[0] : null);
  if (!api) {
    store.setFunctionEnabled('image', true);
    return { ok: false, message: '已打开开关，请再选择要用的生图渠道', api: null };
  }
  store.assignAPI('image', api.id);
  store.setFunctionEnabled('image', true);
  return { ok: true, message: `剧情生图已开启，使用 ${api.name}`, api };
}

export function createStoryImageRecords(images: ParsedImage[], narrativeIndex: number): StoryImageRecord[] {
  const now = new Date().toISOString();
  return images.map((image, index) => ({
    id: `img_${Date.now()}_${narrativeIndex}_${index}`,
    prompt: image.prompt,
    size: image.size,
    status: 'pending',
    dataUrl: '',
    error: '',
    narrativeIndex,
    idempotencyKey: crypto.randomUUID(),
    createdAt: now,
  }));
}

export function appendStoryImages(saveData: { 系统?: { 图廊?: StoryImageRecord[] } }, images: ParsedImage[], narrativeIndex: number) {
  if (!images.length) return;
  if (!saveData.系统) saveData.系统 = {};
  if (!Array.isArray(saveData.系统.图廊)) saveData.系统.图廊 = [];
  const records = createStoryImageRecords(images, narrativeIndex);
  saveData.系统.图廊.push(...records);
  try {
    const game = useGameStateStore();
    game.imageGallery = [...(game.imageGallery || []), ...records];
  } catch {
    // Pinia 尚未就绪时只写存档即可
  }
}

function patchRecord(id: string, patch: Partial<StoryImageRecord>) {
  const game = useGameStateStore();
  const current = game.imageGallery.find((item) => item.id === id);
  if (!current) return;
  Object.assign(current, patch);
  game.imageGallery = [...game.imageGallery];
}

async function persist() {
  try {
    await useCharacterStore().saveCurrentGame({ notifyIfNoActive: false });
  } catch (error) {
    console.warn('[图廊] 保存失败', error);
  }
}

export async function runPendingStoryImages() {
  if (running) return;
  running = true;
  try {
    const game = useGameStateStore();
    const api = resolveImageApi();
    const queue = game.imageGallery.filter((item) => item.status === 'pending' || item.status === 'loading');
    if (!queue.length) return;
    if (!api) {
      for (const item of queue) {
        if (item.status === 'done') continue;
        patchRecord(item.id, { status: 'failed', error: '生图未开启，或还没有选择生图渠道' });
      }
      await persist();
      return;
    }
    const { toast } = await import('@/utils/toast');
    if (queue.some((item) => item.status === 'pending')) {
      toast.info(`正在用 ${api.name} 生成剧情插图…`);
    }
    for (const item of queue) {
      if (inflight.has(item.id)) continue;
      inflight.add(item.id);
      patchRecord(item.id, { status: 'loading', error: '' });
      try {
        const image = await generateStoryImage(api, item.prompt, item.size, item.idempotencyKey);
        patchRecord(item.id, { status: 'done', dataUrl: image.dataUrl, seed: image.seed, error: '' });
      } catch (error) {
        const message = error instanceof Error ? error.message : '图片生成失败';
        patchRecord(item.id, {
          status: 'failed',
          error: message,
        });
        toast.error(`剧情插图失败：${message}`);
      } finally {
        inflight.delete(item.id);
        await persist();
      }
    }
  } finally {
    running = false;
  }
}

export function retryStoryImage(id: string) {
  const game = useGameStateStore();
  const item = game.imageGallery.find((row) => row.id === id);
  if (!item) return;
  item.status = 'pending';
  item.error = '';
  item.dataUrl = '';
  item.idempotencyKey = crypto.randomUUID();
  game.imageGallery = [...game.imageGallery];
  void runPendingStoryImages();
}

export function deleteStoryImage(id: string) {
  const game = useGameStateStore();
  game.imageGallery = game.imageGallery.filter((item) => item.id !== id);
  void persist();
}
