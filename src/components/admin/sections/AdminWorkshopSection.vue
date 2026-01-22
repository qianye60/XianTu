<template>
  <div v-if="active" class="section">
    <div class="section-head">
      <div class="section-title">创意工坊（后台）</div>
      <div class="section-sub">审核/隐藏/删除玩家上传内容</div>
    </div>

    <div class="toolbar">
      <input v-model="query" class="input" placeholder="搜索标题/作者/说明..." />
      <select v-model="type" class="input">
        <option value="">全部类型</option>
        <option value="settings">设置</option>
        <option value="prompts">提示词</option>
        <option value="saves">单机存档</option>
        <option value="start_config">开局配置</option>
      </select>
      <label class="pill" style="display:flex; gap:8px; align-items:center;">
        <input v-model="includeDeleted" type="checkbox" />
        包含已删除
      </label>
      <button class="btn" :disabled="busy" @click="loadWorkshop">加载</button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-else-if="loading" class="loading">加载中…</div>
    <div v-else class="table workshop">
      <div class="row header" style="min-width: 1100px;">
        <div class="cell id">ID</div>
        <div class="cell">类型</div>
        <div class="cell name">标题</div>
        <div class="cell">作者</div>
        <div class="cell num">下载</div>
        <div class="cell num">点赞</div>
        <div class="cell">状态</div>
        <div class="cell time">创建时间</div>
        <div class="cell actions">操作</div>
      </div>
      <div v-for="it in items" :key="it.id" class="row" style="min-width: 1100px;">
        <div class="cell id">#{{ it.id }}</div>
        <div class="cell">{{ it.type }}</div>
        <div class="cell name">{{ it.title }}</div>
        <div class="cell">{{ it.author_name }}</div>
        <div class="cell num">{{ it.downloads }}</div>
        <div class="cell num">{{ it.likes }}</div>
        <div class="cell">
          <span v-if="it.is_deleted" class="pill warn">已删除</span>
          <span v-else-if="it.is_public" class="pill success">公开</span>
          <span v-else class="pill">隐藏</span>
        </div>
        <div class="cell time">{{ formatDate(String(it.created_at || '')) }}</div>
        <div class="cell actions">
          <button class="btn sm" :disabled="busy" @click="setVisibility(it, { is_public: !it.is_public })">
            {{ it.is_public ? '隐藏' : '公开' }}
          </button>
          <button class="btn sm" :disabled="busy" @click="setVisibility(it, { is_deleted: !it.is_deleted })">
            {{ it.is_deleted ? '恢复' : '删除' }}
          </button>
          <button class="btn sm danger" :disabled="busy" @click="deleteHard(it)">彻底删除</button>
        </div>
      </div>
    </div>

    <div class="toolbar" style="margin-top: 0.75rem;">
      <span class="pill">共 {{ total }} 条 · 第 {{ page }} / {{ totalPages }} 页</span>
      <button class="btn btn-secondary sm" :disabled="busy || page <= 1" @click="page--; loadWorkshop()">上一页</button>
      <button class="btn sm" :disabled="busy || page >= totalPages" @click="page++; loadWorkshop()">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { adminRequest } from '@/services/adminRequest';
import { toast } from '@/utils/toast';
import { formatDate } from '@/components/admin/adminUtils';

type WorkshopAdminItemRow = {
  id: number;
  type: string;
  title: string;
  description?: string | null;
  author_name: string;
  downloads: number;
  likes: number;
  is_public: boolean;
  is_deleted: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type WorkshopAdminListResponse = {
  items: WorkshopAdminItemRow[];
  total: number;
  page: number;
  page_size: number;
};

const props = defineProps<{
  active: boolean;
  busy: boolean;
  setBusy: (next: boolean) => void;
}>();

const loading = ref(false);
const error = ref('');
const query = ref('');
const type = ref<string>('');
const includeDeleted = ref(false);
const page = ref(1);
const pageSize = ref(50);
const total = ref(0);
const items = ref<WorkshopAdminItemRow[]>([]);

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

const loadWorkshop = async () => {
  const tabActive = props.active;
  loading.value = true;
  error.value = '';
  try {
    const qs = new URLSearchParams();
    if (query.value.trim()) qs.set('q', query.value.trim());
    if (type.value) qs.set('item_type', type.value);
    qs.set('include_deleted', String(includeDeleted.value));
    qs.set('page', String(page.value));
    qs.set('page_size', String(pageSize.value));
    const res = await adminRequest.get<WorkshopAdminListResponse>(`/api/v1/admin/workshop/items?${qs.toString()}`);
    if (!tabActive) return;
    items.value = res?.items || [];
    total.value = Number(res?.total ?? 0);
  } catch (e: any) {
    error.value = e?.message || '加载失败';
  } finally {
    loading.value = false;
  }
};

const setVisibility = async (item: WorkshopAdminItemRow, patch: { is_public?: boolean; is_deleted?: boolean }) => {
  props.setBusy(true);
  try {
    await adminRequest.post(`/api/v1/admin/workshop/items/${item.id}/visibility`, patch);
    toast.success('已更新');
    await loadWorkshop();
  } catch (e: any) {
    toast.error(e?.message || '更新失败');
  } finally {
    props.setBusy(false);
  }
};

const deleteHard = async (item: WorkshopAdminItemRow) => {
  if (!confirm(`确定彻底删除工坊内容：${item.title} (#${item.id})？此操作不可恢复。`)) return;
  props.setBusy(true);
  try {
    await adminRequest.delete(`/api/v1/admin/workshop/items/${item.id}`);
    toast.success('已彻底删除');
    await loadWorkshop();
  } catch (e: any) {
    toast.error(e?.message || '删除失败');
  } finally {
    props.setBusy(false);
  }
};

defineExpose({
  refresh: loadWorkshop
});

watch(
  () => props.active,
  (value) => {
    if (value && items.value.length === 0 && !loading.value) loadWorkshop();
  },
  { immediate: true }
);
</script>
