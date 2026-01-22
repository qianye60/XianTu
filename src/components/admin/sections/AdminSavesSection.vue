<template>
  <div v-if="active" class="section">
    <div class="section-head">
      <div class="section-title">存档管理</div>
      <div class="section-sub">查看和删除玩家存档</div>
    </div>

    <div class="toolbar">
      <input v-model="saveQuery" class="input" placeholder="搜索角色名/道号/ID..." />
      <button class="btn" :disabled="busy" @click="loadSaves">加载</button>
      <span class="pill">总数：{{ saves.length }}</span>
    </div>

    <div v-if="savesError" class="error">{{ savesError }}</div>
    <div v-else-if="savesLoading" class="loading">加载中…</div>
    <div v-else class="table saves">
      <div class="row header">
        <div class="cell id">ID</div>
        <div class="cell name">道号</div>
        <div class="cell name">角色</div>
        <div class="cell mode">模式</div>
        <div class="cell time">创建时间</div>
        <div class="cell time">更新时间</div>
        <div class="cell num">大小(KB)</div>
        <div class="cell actions">操作</div>
      </div>
      <div v-for="s in filteredSaves" :key="s.id" class="row">
        <div class="cell id">#{{ s.id }}</div>
        <div class="cell name">{{ s.user_name }}</div>
        <div class="cell name">{{ s.character_name }}</div>
        <div class="cell mode">{{ s.mode }}</div>
        <div class="cell time">{{ formatDate(s.created_at) }}</div>
        <div class="cell time">{{ formatDate(s.updated_at) }}</div>
        <div class="cell num">{{ s.size_kb.toFixed(1) }}</div>
        <div class="cell actions">
          <button class="btn sm danger" :disabled="busy" @click="deleteSave(s)">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { adminRequest } from '@/services/adminRequest';
import { toast } from '@/utils/toast';
import { formatDate } from '@/components/admin/adminUtils';

type SaveRow = {
  id: number;
  user_name: string;
  character_name: string;
  mode: string;
  created_at: string;
  updated_at: string;
  size_kb: number;
};

const props = defineProps<{
  active: boolean;
  busy: boolean;
  setBusy: (next: boolean) => void;
}>();

const savesLoading = ref(false);
const savesError = ref('');
const saveQuery = ref('');
const saves = ref<SaveRow[]>([]);

const loadSaves = async () => {
  const tabActive = props.active;
  savesLoading.value = true;
  savesError.value = '';
  try {
    const rows = await adminRequest.get<any[]>('/api/v1/admin/saves');
    if (!tabActive) return;
    saves.value = (rows || []).map((r) => ({
      id: Number(r?.id),
      user_name: String(r?.user_name ?? ''),
      character_name: String(r?.character_name ?? ''),
      mode: String(r?.mode ?? ''),
      created_at: String(r?.created_at ?? ''),
      updated_at: String(r?.updated_at ?? ''),
      size_kb: Number(r?.size_kb ?? 0)
    } satisfies SaveRow));
  } catch (e: any) {
    savesError.value = e?.message || '加载失败';
  } finally {
    savesLoading.value = false;
  }
};

const filteredSaves = computed(() => {
  const q = saveQuery.value.trim();
  if (!q) return saves.value;
  return saves.value.filter(s =>
    s.user_name.includes(q) ||
    s.character_name.includes(q) ||
    String(s.id).includes(q)
  );
});

const deleteSave = async (save: SaveRow) => {
  if (!confirm(`确定删除存档：${save.character_name} (${save.user_name}) #${save.id}？`)) return;
  props.setBusy(true);
  try {
    await adminRequest.delete(`/api/v1/admin/saves/${save.id}`);
    toast.success('已删除存档');
    await loadSaves();
  } catch (e: any) {
    toast.error(e?.message || '删除失败');
  } finally {
    props.setBusy(false);
  }
};

defineExpose({
  refresh: loadSaves
});

watch(
  () => props.active,
  (value) => {
    if (value && saves.value.length === 0 && !savesLoading.value) loadSaves();
  },
  { immediate: true }
);
</script>
