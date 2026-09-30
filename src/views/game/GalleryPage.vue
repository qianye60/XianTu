<template>
  <div class="gallery-page">
    <p class="hint">本局生成的剧情插图存在当前存档里。可以单张下载，也可以把记录导出成 JSON。云端同步不上传图片。</p>
    <EmptyState v-if="!rows.length" glyph="图" title="还没有插图" compact />
    <ul v-else class="grid">
      <li v-for="row in rows" :key="row.id" class="card">
        <div class="frame">
          <img v-if="row.dataUrl" :src="row.dataUrl" :alt="row.prompt" />
          <p v-else class="wait">{{ statusText(row) }}</p>
        </div>
        <p class="prompt">{{ row.prompt }}</p>
        <p class="meta">{{ row.size }}<template v-if="row.seed !== undefined"> · 种子 {{ row.seed }}</template></p>
        <div class="ops">
          <button type="button" class="cc-btn small" :disabled="!row.dataUrl" @click="downloadOne(row)">下载</button>
          <button v-if="row.status === 'failed'" type="button" class="cc-btn small" @click="retryStoryImage(row.id)">重试</button>
          <button type="button" class="cc-btn small danger" @click="remove(row)">删除</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Download, Trash2 } from 'lucide-vue-next';
import EmptyState from '@/components/game/EmptyState.vue';
import { usePageActions } from '@/composables/usePageActions';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useCharacterStore } from '@/stores/characterStore';
import { deleteStoryImage, retryStoryImage, type StoryImageRecord } from '@/services/storyImageRunner';
import { confirmDialog } from '@/composables/useDialog';
import { toast } from '@/utils/toast';

defineOptions({ name: 'GalleryPage' });

const game = useGameStateStore();
const rows = computed(() => [...(game.imageGallery || [])].reverse());

const statusText = (row: StoryImageRecord) => {
  if (row.status === 'loading' || row.status === 'pending') return '正在生成…';
  return row.error || '生成失败';
};

const downloadOne = (row: StoryImageRecord) => {
  if (!row.dataUrl) return;
  const safe = row.prompt.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) || 'story-image';
  const link = document.createElement('a');
  link.href = row.dataUrl;
  link.download = `${safe}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const exportLinks = () => {
  const data = rows.value.map((row, index) => ({
    index: rows.value.length - index,
    prompt: row.prompt,
    size: row.size,
    status: row.status,
    seed: row.seed ?? null,
    error: row.error,
    narrativeIndex: row.narrativeIndex,
    dataUrl: row.dataUrl,
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const name = String(useCharacterStore().activeSaveSlot?.存档名 || 'image-gallery').replace(/[\\/:*?"<>|]/g, '_');
  link.href = url;
  link.download = `${name}-gallery.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast.success(`已导出 ${data.length} 条图廊记录`);
};

const remove = async (row: StoryImageRecord) => {
  const ok = await confirmDialog({ title: '删除插图', message: '从当前存档的图廊中删除这张图片？', confirmText: '删除', danger: true });
  if (!ok) return;
  deleteStoryImage(row.id);
  toast.success('图片记录已删除');
};

usePageActions(computed(() => [
  { key: 'export', title: '导出图廊', icon: Download, onClick: exportLinks, disabled: !rows.value.length },
  { key: 'clear', title: '清空', icon: Trash2, danger: true, disabled: !rows.value.length, onClick: async () => {
    const ok = await confirmDialog({ title: '清空图廊', message: '删除当前存档里的全部插图？', confirmText: '清空', danger: true });
    if (!ok) return;
    game.imageGallery = [];
    void useCharacterStore().saveCurrentGame({ notifyIfNoActive: false });
    toast.success('图廊已清空');
  } },
]));
</script>

<style scoped>
.gallery-page {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-height: 0;
}
.hint {
  margin: 0;
  color: var(--cc-text-3);
  font-size: 0.86rem;
}
.grid {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.8rem;
  margin: 0;
  padding: 0;
}
.card {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.6rem;
  border: 1px solid var(--cc-line);
  border-radius: 12px;
  background: var(--cc-surface);
}
.frame {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: var(--cc-surface-2, rgba(0, 0, 0, 0.04));
}
.frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.wait {
  margin: 0;
  padding: 0.8rem;
  text-align: center;
  color: var(--cc-text-3);
  font-size: 0.84rem;
}
.prompt {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.meta {
  margin: 0;
  color: var(--cc-text-3);
  font-size: 0.78rem;
}
.ops {
  display: flex;
  gap: 0.4rem;
}
</style>
