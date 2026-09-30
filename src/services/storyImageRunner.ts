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

export function resolveImageApi(): APIConfig | null {
  const store = useAPIManagementStore();
  if (!store.isFunctionEnabled('image')) return null;
  const assignment = store.apiAssignments.find((item) => item.type === 'image');
  if (!assignment || assignment.apiId === 'default') return null;
  const api = store.apiConfigs.find((item) => item.id === assignment.apiId && item.enabled);
  if (!api || !isImageProvider(api.provider)) return null;
  return api;
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
  saveData.系统.图廊.push(...createStoryImageRecords(images, narrativeIndex));
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
    for (const item of queue) {
      if (inflight.has(item.id)) continue;
      inflight.add(item.id);
      patchRecord(item.id, { status: 'loading', error: '' });
      try {
        const image = await generateStoryImage(api, item.prompt, item.size, item.idempotencyKey);
        patchRecord(item.id, { status: 'done', dataUrl: image.dataUrl, seed: image.seed, error: '' });
      } catch (error) {
        patchRecord(item.id, {
          status: 'failed',
          error: error instanceof Error ? error.message : '图片生成失败',
        });
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
