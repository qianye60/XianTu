<template>
  <div v-if="active" class="section">
    <div class="section-head">
      <div class="section-title">{{ title }}</div>
      <div class="section-sub">增删改查（复杂字段用 JSON 编辑）</div>
    </div>

    <div class="toolbar">
      <input v-model="crudQuery" class="input" placeholder="搜索名称..." />
      <button class="btn" :disabled="busy" @click="loadCrud">加载</button>
      <button class="btn primary" :disabled="busy" @click="openCreate">新增</button>
    </div>

    <div v-if="crudError" class="error">{{ crudError }}</div>
    <div v-else-if="crudLoading" class="loading">加载中…</div>
    <div v-else class="table crud">
      <div class="row header">
        <div class="cell id">ID</div>
        <div class="cell name">名称</div>
        <div class="cell desc">描述</div>
        <div class="cell actions">操作</div>
      </div>
      <div v-for="item in filteredCrudItems" :key="item.id" class="row">
        <div class="cell id">#{{ item.id }}</div>
        <div class="cell name">{{ item.name }}</div>
        <div class="cell desc">{{ item.description || '-' }}</div>
        <div class="cell actions">
          <button class="btn sm" :disabled="busy" @click="openEdit(item)">编辑</button>
          <button class="btn sm danger" :disabled="busy" @click="deleteItem(item)">删除</button>
        </div>
      </div>
    </div>

    <div v-if="editModalOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title">{{ editingItem?.id ? '编辑' : '新增' }} · {{ title }}</div>
          <button class="btn sm" @click="closeModal">关闭</button>
        </div>

        <div class="modal-body">
          <label class="field">
            <span class="label">名称</span>
            <input v-model="editDraft.name" class="input" />
          </label>
          <label class="field">
            <span class="label">描述</span>
            <textarea v-model="editDraft.description" class="textarea" rows="4"></textarea>
          </label>
          <label class="field">
            <span class="label">附加 JSON（可空）</span>
            <textarea v-model="editDraft.extraJson" class="textarea mono" rows="8" placeholder="{ }"></textarea>
          </label>
        </div>

        <div class="actions">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button class="btn primary" :disabled="busy || !editDraft.name" @click="saveItem">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { adminRequest } from '@/services/adminRequest';
import { toast } from '@/utils/toast';
import { parseJsonSafe } from '@/components/admin/adminUtils';

type CrudItem = { id: number; name: string; description?: string; [k: string]: any };

const props = defineProps<{
  active: boolean;
  title: string;
  path: string;
  busy: boolean;
  setBusy: (next: boolean) => void;
}>();

const crudQuery = ref('');
const crudLoading = ref(false);
const crudError = ref('');
const crudItems = ref<CrudItem[]>([]);

const editModalOpen = ref(false);
const editingItem = ref<CrudItem | null>(null);
const editDraft = reactive({
  name: '',
  description: '',
  extraJson: ''
});

const normalizeCrudItem = (raw: any): CrudItem => ({
  ...raw,
  id: Number(raw?.id),
  name: String(raw?.name ?? raw?.名称 ?? ''),
  description: typeof raw?.description === 'string' ? raw.description : (typeof raw?.描述 === 'string' ? raw.描述 : '')
});

const loadCrud = async () => {
  if (!props.path) {
    crudItems.value = [];
    crudLoading.value = false;
    crudError.value = '该模块暂未接入后端接口';
    return;
  }
  crudLoading.value = true;
  crudError.value = '';
  try {
    const rows = await adminRequest.get<any[]>(props.path);
    crudItems.value = (rows || []).map(normalizeCrudItem);
  } catch (e: any) {
    crudError.value = e?.message || '加载失败';
  } finally {
    crudLoading.value = false;
  }
};

const filteredCrudItems = computed(() => {
  const q = crudQuery.value.trim();
  const list = crudItems.value;
  if (!q) return list;
  return list.filter(x => (x.name || '').includes(q) || String(x.id).includes(q));
});

const openCreate = () => {
  editingItem.value = null;
  editDraft.name = '';
  editDraft.description = '';
  editDraft.extraJson = '';
  editModalOpen.value = true;
};

const openEdit = (item: CrudItem) => {
  editingItem.value = item;
  editDraft.name = item.name || '';
  editDraft.description = item.description || '';
  const { id, name, description, ...rest } = item;
  editDraft.extraJson = Object.keys(rest).length ? JSON.stringify(rest, null, 2) : '';
  editModalOpen.value = true;
};

const closeModal = () => {
  editModalOpen.value = false;
};

const saveItem = async () => {
  if (!props.path) return;
  const jsonResult = parseJsonSafe(editDraft.extraJson);
  if (!jsonResult.ok) {
    toast.error(`JSON格式错误: ${jsonResult.error}`);
    return;
  }
  props.setBusy(true);
  try {
    const payload: Record<string, any> = {
      name: editDraft.name,
      description: editDraft.description
    };
    if (jsonResult.data && typeof jsonResult.data === 'object') {
      Object.assign(payload, jsonResult.data);
    }
    if (editingItem.value?.id) {
      await adminRequest.put(`${props.path}${editingItem.value.id}`, payload);
      toast.success('已更新');
    } else {
      await adminRequest.post(props.path, payload);
      toast.success('已创建');
    }
    editModalOpen.value = false;
    await loadCrud();
  } catch (e: any) {
    toast.error(e?.message || '保存失败');
  } finally {
    props.setBusy(false);
  }
};

const deleteItem = async (item: CrudItem) => {
  if (!props.path) return;
  if (!confirm(`确定删除 ${item.name} (#${item.id})？`)) return;
  props.setBusy(true);
  try {
    await adminRequest.delete(`${props.path}${item.id}`);
    toast.success('已删除');
    await loadCrud();
  } catch (e: any) {
    toast.error(e?.message || '删除失败');
  } finally {
    props.setBusy(false);
  }
};

defineExpose({
  refresh: loadCrud
});

watch(
  () => props.active,
  (value) => {
    if (value && crudItems.value.length === 0 && !crudLoading.value) {
      loadCrud();
    }
  },
  { immediate: true }
);

watch(
  () => props.path,
  (next, prev) => {
    if (props.active && next && next !== prev) {
      loadCrud();
    }
  }
);
</script>
