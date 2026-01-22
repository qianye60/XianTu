<template>
  <div v-if="active" class="section">
    <div class="section-head">
      <div class="section-title">兑换码</div>
      <div class="section-sub">用于联机开局内容投放（后台创建/删除）</div>
    </div>

    <div class="toolbar">
      <input v-model="codeQuery" class="input" placeholder="搜索兑换码/类型/ID..." />
      <button class="btn" :disabled="busy" @click="loadCodes">加载</button>
      <button class="btn primary" :disabled="busy" @click="openCreate">新增兑换码</button>
    </div>

    <div v-if="codesError" class="error">{{ codesError }}</div>
    <div v-else-if="codesLoading" class="loading">加载中…</div>
    <div v-else class="table codes">
      <div class="row header" style="min-width: 980px;">
        <div class="cell id">ID</div>
        <div class="cell name">兑换码</div>
        <div class="cell">类型</div>
        <div class="cell num">次数</div>
        <div class="cell time">创建时间</div>
        <div class="cell actions">操作</div>
      </div>
      <div v-for="c in filteredCodes" :key="c.id" class="row" style="min-width: 980px;">
        <div class="cell id">#{{ c.id }}</div>
        <div class="cell name">{{ c.code }}</div>
        <div class="cell">{{ c.type || '-' }}</div>
        <div class="cell num">{{ c.times_used }} / {{ c.max_uses }}</div>
        <div class="cell time">{{ formatDate(String(c.created_at || '')) }}</div>
        <div class="cell actions">
          <button class="btn sm" :disabled="busy" @click="openEdit(c)">编辑</button>
          <button class="btn sm danger" :disabled="busy" @click="deleteCode(c)">删除</button>
        </div>
      </div>
    </div>

    <div v-if="editOpen" class="modal-overlay" @click.self="closeEdit">
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title">{{ editingCode?.id ? '编辑兑换码' : '新增兑换码' }}</div>
          <button class="btn sm" @click="closeEdit">关闭</button>
        </div>
        <div class="modal-body">
          <label class="field">
            <span class="label">类型</span>
            <input v-model="editDraft.type" class="input" placeholder="例如 start_config" />
          </label>
          <label v-if="!editingCode" class="field">
            <span class="label">Payload JSON</span>
            <textarea v-model="editDraft.payload" class="textarea mono" rows="8" placeholder="{ }"></textarea>
          </label>
          <label v-if="editingCode" class="field">
            <span class="label">兑换码</span>
            <input v-model="editDraft.code" class="input" />
          </label>
          <label class="field">
            <span class="label">最大使用次数</span>
            <input v-model.number="editDraft.max_uses" class="input" type="number" min="-1" />
          </label>
          <p v-if="editingCode" class="hint">注意：编辑模式仅允许修改 code、type、max_uses。</p>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" @click="closeEdit">取消</button>
          <button class="btn primary" :disabled="busy || !editDraft.type" @click="saveCode">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { adminRequest } from '@/services/adminRequest';
import { toast } from '@/utils/toast';
import { formatDate, parseJsonSafe } from '@/components/admin/adminUtils';

type RedemptionCodeRow = {
  id: number;
  code: string;
  type?: string | null;
  max_uses: number;
  times_used: number;
  created_at?: string | null;
};

const props = defineProps<{
  active: boolean;
  busy: boolean;
  setBusy: (next: boolean) => void;
}>();

const codesLoading = ref(false);
const codesError = ref('');
const codeQuery = ref('');
const codes = ref<RedemptionCodeRow[]>([]);

const editOpen = ref(false);
const editingCode = ref<RedemptionCodeRow | null>(null);
const editDraft = reactive({
  type: '',
  payload: '',
  code: '',
  max_uses: 1
});

const loadCodes = async () => {
  const tabActive = props.active;
  codesLoading.value = true;
  codesError.value = '';
  try {
    const rows = await adminRequest.get<any[]>('/api/v1/redemption/admin/codes?skip=0&limit=200');
    if (!tabActive) return;
    codes.value = (rows || []).map((r) => ({
      id: Number(r?.id),
      code: String(r?.code ?? ''),
      type: r?.type == null ? null : String(r?.type),
      max_uses: Number(r?.max_uses ?? 1),
      times_used: Number(r?.times_used ?? 0),
      created_at: r?.created_at == null ? null : String(r?.created_at)
    } satisfies RedemptionCodeRow));
  } catch (e: any) {
    codesError.value = e?.message || '加载失败';
  } finally {
    codesLoading.value = false;
  }
};

const filteredCodes = computed(() => {
  const q = codeQuery.value.trim();
  if (!q) return codes.value;
  return codes.value.filter(c =>
    String(c.id).includes(q) ||
    String(c.code || '').includes(q) ||
    String(c.type || '').includes(q)
  );
});

const openCreate = () => {
  editingCode.value = null;
  editDraft.type = '';
  editDraft.payload = '';
  editDraft.code = '';
  editDraft.max_uses = 1;
  editOpen.value = true;
};

const openEdit = (row: RedemptionCodeRow) => {
  editingCode.value = row;
  editDraft.type = row.type ?? '';
  editDraft.code = row.code;
  editDraft.payload = '';
  editDraft.max_uses = row.max_uses;
  editOpen.value = true;
};

const closeEdit = () => {
  editOpen.value = false;
};

const saveCode = async () => {
  props.setBusy(true);
  try {
    if (editingCode.value?.id) {
      await adminRequest.put(`/api/v1/redemption/admin/codes/${editingCode.value.id}`, {
        code: editDraft.code,
        type: editDraft.type,
        max_uses: editDraft.max_uses
      });
      toast.success('已更新兑换码');
    } else {
      const jsonResult = parseJsonSafe(editDraft.payload);
      if (!jsonResult.ok) {
        toast.error(`JSON格式错误: ${jsonResult.error}`);
        return;
      }
      await adminRequest.post('/api/v1/redemption/admin/codes', {
        type: editDraft.type,
        payload: jsonResult.data ?? {},
        max_uses: editDraft.max_uses
      });
      toast.success('已创建兑换码');
    }
    editOpen.value = false;
    await loadCodes();
  } catch (e: any) {
    toast.error(e?.message || '保存失败');
  } finally {
    props.setBusy(false);
  }
};

const deleteCode = async (row: RedemptionCodeRow) => {
  if (!confirm(`确定删除兑换码：${row.code} (#${row.id})？`)) return;
  props.setBusy(true);
  try {
    await adminRequest.delete(`/api/v1/redemption/admin/codes/${row.id}`);
    toast.success('已删除');
    await loadCodes();
  } catch (e: any) {
    toast.error(e?.message || '删除失败');
  } finally {
    props.setBusy(false);
  }
};

defineExpose({
  refresh: loadCodes
});

watch(
  () => props.active,
  (value) => {
    if (value && codes.value.length === 0 && !codesLoading.value) loadCodes();
  },
  { immediate: true }
);
</script>
