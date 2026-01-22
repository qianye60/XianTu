<template>
  <div v-if="active" class="section">
    <div class="section-head">
      <div class="section-title">仙官管理</div>
      <div class="section-sub">查看/创建/编辑仙官账号（改密需当前密码）</div>
    </div>

    <div class="toolbar">
      <input v-model="adminQuery" class="input" placeholder="搜索道号/角色/ID..." />
      <button class="btn" :disabled="busy" @click="loadAdmins">加载</button>
      <button class="btn primary" :disabled="busy || !isSuperAdmin" @click="openCreate">新增仙官</button>
    </div>

    <div v-if="adminsError" class="error">{{ adminsError }}</div>
    <div v-else-if="adminsLoading" class="loading">加载中…</div>
    <div v-else class="table admins">
      <div class="row header" style="min-width: 860px;">
        <div class="cell id">ID</div>
        <div class="cell name">道号</div>
        <div class="cell">角色</div>
        <div class="cell">邮箱</div>
        <div class="cell">状态</div>
        <div class="cell time">创建时间</div>
        <div class="cell actions">操作</div>
      </div>
      <div v-for="a in filteredAdmins" :key="a.id" class="row" style="min-width: 860px;">
        <div class="cell id">#{{ a.id }}</div>
        <div class="cell name">{{ a.user_name }}</div>
        <div class="cell">{{ a.role }}</div>
        <div class="cell">{{ a.email || '-' }}</div>
        <div class="cell">
          <span class="pill" :class="a.is_active ? 'success' : 'warn'">{{ a.is_active ? '启用' : '禁用' }}</span>
        </div>
        <div class="cell time">{{ formatDate(String(a.created_at || '')) }}</div>
        <div class="cell actions">
          <button class="btn sm" :disabled="busy" @click="openEdit(a)">编辑</button>
          <button class="btn sm danger" :disabled="busy || a.id === currentAdminId" @click="deleteAdmin(a)">删除</button>
        </div>
      </div>
    </div>

    <div v-if="editOpen" class="modal-overlay" @click.self="closeEdit">
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title">{{ editingAdmin?.id ? '编辑仙官' : '新增仙官' }}</div>
          <button class="btn sm" @click="closeEdit">关闭</button>
        </div>
        <div class="modal-body">
          <label class="field">
            <span class="label">道号</span>
            <input v-model="editDraft.user_name" class="input" />
          </label>
          <label class="field">
            <span class="label">邮箱</span>
            <input v-model="editDraft.email" class="input" />
          </label>
          <label class="field">
            <span class="label">角色</span>
            <select v-model="editDraft.role" class="input" :disabled="!isSuperAdmin">
              <option value="super_admin">超级仙官</option>
              <option value="admin">仙官</option>
              <option value="moderator">巡查使</option>
            </select>
          </label>
          <label class="field">
            <span class="label">状态</span>
            <select v-model="editDraft.is_active" class="input">
              <option :value="true">启用</option>
              <option :value="false">禁用</option>
            </select>
          </label>
          <label class="field">
            <span class="label">密码（新增必填，编辑可空）</span>
            <input v-model="editDraft.password" class="input" type="password" />
          </label>
          <label v-if="requiresCurrentPassword" class="field">
            <span class="label">当前密码</span>
            <input v-model="editDraft.current_password" class="input" type="password" />
          </label>
          <p v-if="requiresCurrentPassword" class="hint">修改自己的用户名或密码需要输入当前密码。</p>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" @click="closeEdit">取消</button>
          <button class="btn primary" :disabled="busy" @click="saveAdmin">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { adminRequest } from '@/services/adminRequest';
import { toast } from '@/utils/toast';
import { formatDate } from '@/components/admin/adminUtils';

type AdminAccountRow = {
  id: number;
  user_name: string;
  role: string;
  email?: string | null;
  is_active: boolean;
  created_at?: string | null;
};

const props = defineProps<{
  active: boolean;
  busy: boolean;
  setBusy: (next: boolean) => void;
  isSuperAdmin: boolean;
  currentAdminId: number | null;
}>();

const adminsLoading = ref(false);
const adminsError = ref('');
const adminQuery = ref('');
const admins = ref<AdminAccountRow[]>([]);

const editOpen = ref(false);
const editingAdmin = ref<AdminAccountRow | null>(null);
const editDraft = reactive({
  id: 0,
  user_name: '',
  email: '',
  role: 'admin',
  is_active: true,
  password: '',
  current_password: ''
});

const loadAdmins = async () => {
  const tabActive = props.active;
  adminsLoading.value = true;
  adminsError.value = '';
  try {
    const rows = await adminRequest.get<any[]>('/api/v1/admin/accounts');
    if (!tabActive) return;
    admins.value = (rows || []).map((r) => ({
      id: Number(r?.id),
      user_name: String(r?.user_name ?? ''),
      role: String(r?.role ?? ''),
      email: r?.email == null ? null : String(r?.email),
      is_active: !!r?.is_active,
      created_at: r?.created_at == null ? null : String(r?.created_at)
    } satisfies AdminAccountRow));
  } catch (e: any) {
    adminsError.value = e?.message || '加载失败';
  } finally {
    adminsLoading.value = false;
  }
};

const filteredAdmins = computed(() => {
  const q = adminQuery.value.trim();
  if (!q) return admins.value;
  return admins.value.filter(a =>
    String(a.id).includes(q) ||
    String(a.user_name || '').includes(q) ||
    String(a.role || '').includes(q)
  );
});

const openCreate = () => {
  editingAdmin.value = null;
  editDraft.id = 0;
  editDraft.user_name = '';
  editDraft.email = '';
  editDraft.role = 'admin';
  editDraft.is_active = true;
  editDraft.password = '';
  editDraft.current_password = '';
  editOpen.value = true;
};

const openEdit = (row: AdminAccountRow) => {
  editingAdmin.value = row;
  editDraft.id = row.id;
  editDraft.user_name = row.user_name;
  editDraft.email = row.email ?? '';
  editDraft.role = row.role;
  editDraft.is_active = row.is_active;
  editDraft.password = '';
  editDraft.current_password = '';
  editOpen.value = true;
};

const closeEdit = () => {
  editOpen.value = false;
};

const requiresCurrentPassword = computed(() => {
  if (!editingAdmin.value) return false;
  if (props.currentAdminId !== editingAdmin.value.id) return false;
  return editDraft.password.length > 0 || editDraft.user_name !== editingAdmin.value.user_name;
});

  const saveAdmin = async () => {
    props.setBusy(true);
    try {
    const payload: Record<string, any> = {
      user_name: editDraft.user_name,
      email: editDraft.email || null,
      role: editDraft.role,
      is_active: editDraft.is_active
    };
    if (editDraft.password) payload.password = editDraft.password;
    if (requiresCurrentPassword.value) {
      if (!editDraft.current_password) {
        toast.error('请输入当前密码');
        return;
      }
      payload.current_password = editDraft.current_password;
    }
    if (editingAdmin.value?.id) {
      await adminRequest.put(`/api/v1/admin/accounts/${editingAdmin.value.id}`, payload);
      toast.success('已更新');
    } else {
      if (!editDraft.password) {
        toast.error('创建仙官需要设置密码');
        return;
      }
      await adminRequest.post('/api/v1/admin/create', {
        user_name: editDraft.user_name,
        email: editDraft.email || null,
        role: editDraft.role,
        is_active: editDraft.is_active,
        password: editDraft.password
      });
      toast.success('已创建');
    }
    editOpen.value = false;
    await loadAdmins();
  } catch (e: any) {
    toast.error(e?.message || '保存失败');
  } finally {
    props.setBusy(false);
  }
};

const deleteAdmin = async (row: AdminAccountRow) => {
  if (!confirm(`确定删除仙官账号：${row.user_name} (#${row.id})？`)) return;
  props.setBusy(true);
  try {
    await adminRequest.delete(`/api/v1/admin/accounts/${row.id}`);
    toast.success('已删除');
    await loadAdmins();
  } catch (e: any) {
    toast.error(e?.message || '删除失败');
  } finally {
    props.setBusy(false);
  }
};

defineExpose({
  refresh: loadAdmins
});

watch(
  () => props.active,
  (value) => {
    if (value && admins.value.length === 0 && !adminsLoading.value) loadAdmins();
  },
  { immediate: true }
);
</script>
