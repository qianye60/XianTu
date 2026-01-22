<template>
  <div v-if="active" class="section">
    <div class="section-head">
      <div class="section-title">联机数据 · 玩家管理</div>
      <div class="section-sub">修改穿越点、封禁/解封、更新账号信息</div>
    </div>

    <div class="toolbar">
      <input v-model="playerQuery" class="input" placeholder="搜索道号/ID..." />
      <button class="btn" :disabled="busy" @click="loadPlayers">加载</button>
      <span class="pill">总数：{{ players.length }}</span>
    </div>

    <div v-if="playersError" class="error">{{ playersError }}</div>
    <div v-else-if="playersLoading" class="loading">加载中…</div>
    <div v-else class="table players">
      <div class="row header">
        <div class="cell id">ID</div>
        <div class="cell name">道号</div>
        <div class="cell time">注册时间</div>
        <div class="cell num">角色数</div>
        <div class="cell num">穿越点</div>
        <div class="cell">状态</div>
        <div class="cell actions">操作</div>
      </div>
      <div v-for="p in filteredPlayers" :key="p.id" class="row">
        <div class="cell id">#{{ p.id }}</div>
        <div class="cell name">
          <span class="pill" :class="{ banned: !!p.is_banned }">{{ p.user_name }}</span>
        </div>
        <div class="cell time">{{ formatDate(p.created_at) }}</div>
        <div class="cell num">{{ p.character_count }}</div>
        <div class="cell num">
          <input v-model.number="p._draft_travel_points" class="input small" type="number" min="0" />
        </div>
        <div class="cell">
          <span v-if="p.is_banned" class="pill warn">封禁中</span>
          <span v-else class="pill success">正常</span>
        </div>
        <div class="cell actions">
          <button class="btn sm" :disabled="busy" @click="saveTravelPoints(p)">保存</button>
          <button class="btn sm" :disabled="busy || !isSuperAdmin" @click="openEdit(p)">编辑</button>
          <button
            v-if="!p.is_banned"
            class="btn sm danger"
            :disabled="busy || !isSuperAdmin"
            @click="openBan(p)"
          >
            封禁
          </button>
          <button
            v-else
            class="btn sm"
            :disabled="busy || !isSuperAdmin"
            @click="unbanPlayer(p)"
          >
            解封
          </button>
          <button class="btn sm danger" :disabled="busy || !isSuperAdmin" @click="deleteUser(p)">删除</button>
        </div>
      </div>
    </div>

    <div v-if="editModalOpen" class="modal-overlay" @click.self="closeEdit">
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title">编辑玩家 · {{ editDraft.user_name }}</div>
          <button class="btn sm" @click="closeEdit">关闭</button>
        </div>
        <div class="modal-body">
          <label class="field">
            <span class="label">道号</span>
            <input v-model="editDraft.user_name" class="input" />
          </label>
          <label class="field">
            <span class="label">重置密码（可空）</span>
            <input v-model="editDraft.password" class="input" type="password" />
          </label>
          <label class="field">
            <span class="label">封禁状态</span>
            <select v-model="editDraft.is_banned" class="input">
              <option :value="false">正常</option>
              <option :value="true">封禁</option>
            </select>
          </label>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" @click="closeEdit">取消</button>
          <button class="btn primary" :disabled="busy || !isSuperAdmin" @click="saveEdit">保存</button>
        </div>
      </div>
    </div>

    <div v-if="banModalOpen" class="modal-overlay" @click.self="closeBan">
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title">封禁玩家 · {{ banDraft.user_name }}</div>
          <button class="btn sm" @click="closeBan">关闭</button>
        </div>
        <div class="modal-body">
          <label class="field">
            <span class="label">封禁类型</span>
            <select v-model="banDraft.ban_type" class="input">
              <option value="temporary">临时</option>
              <option value="permanent">永久</option>
            </select>
          </label>
          <label v-if="banDraft.ban_type === 'temporary'" class="field">
            <span class="label">结束时间</span>
            <input v-model="banDraft.ban_end_time" class="input" type="datetime-local" />
          </label>
          <label class="field">
            <span class="label">原因</span>
            <textarea v-model="banDraft.reason" class="textarea" rows="4"></textarea>
          </label>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" @click="closeBan">取消</button>
          <button class="btn primary" :disabled="busy || !banDraft.reason" @click="banPlayer">确认封禁</button>
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

type PlayerRow = {
  id: number;
  user_name: string;
  created_at: string;
  is_banned: boolean;
  character_count: number;
  travel_points: number;
  _draft_travel_points: number;
};

const props = defineProps<{
  active: boolean;
  busy: boolean;
  setBusy: (next: boolean) => void;
  isSuperAdmin: boolean;
}>();

const playersLoading = ref(false);
const playersError = ref('');
const playerQuery = ref('');
const players = ref<PlayerRow[]>([]);

const editModalOpen = ref(false);
const editDraft = reactive({
  id: 0,
  user_name: '',
  password: '',
  is_banned: false
});

const banModalOpen = ref(false);
const banDraft = reactive({
  id: 0,
  user_name: '',
  ban_type: 'temporary',
  ban_end_time: '',
  reason: ''
});

const loadPlayers = async () => {
  const tabActive = props.active;
  playersLoading.value = true;
  playersError.value = '';
  try {
    const rows = await adminRequest.get<any[]>('/api/v1/users/');
    if (!tabActive) return;
    players.value = (rows || []).map((r) => {
      const travelPoints = Number(r?.travel_points ?? 0);
      return {
        id: Number(r?.id),
        user_name: String(r?.user_name ?? ''),
        created_at: String(r?.created_at ?? ''),
        is_banned: !!r?.is_banned,
        character_count: Number(r?.character_count ?? 0),
        travel_points: travelPoints,
        _draft_travel_points: travelPoints
      } satisfies PlayerRow;
    });
  } catch (e: any) {
    playersError.value = e?.message || '加载失败';
  } finally {
    playersLoading.value = false;
  }
};

const filteredPlayers = computed(() => {
  const q = playerQuery.value.trim();
  if (!q) return players.value;
  return players.value.filter(p => p.user_name.includes(q) || String(p.id).includes(q));
});

const saveTravelPoints = async (player: PlayerRow) => {
  const next = Number(player._draft_travel_points);
  if (!Number.isFinite(next) || next < 0) {
    toast.error('穿越点必须为非负整数');
    return;
  }
  props.setBusy(true);
  try {
    const res = await adminRequest.put<{ user_id: number; travel_points: number }>(
      `/api/v1/users/${player.id}/travel_points`,
      { travel_points: Math.floor(next) }
    );
    player.travel_points = Number(res?.travel_points ?? Math.floor(next));
    player._draft_travel_points = player.travel_points;
    toast.success('已更新穿越点');
  } catch (e: any) {
    toast.error(e?.message || '更新失败');
  } finally {
    props.setBusy(false);
  }
};

const openEdit = (player: PlayerRow) => {
  editDraft.id = player.id;
  editDraft.user_name = player.user_name;
  editDraft.password = '';
  editDraft.is_banned = player.is_banned;
  editModalOpen.value = true;
};

const closeEdit = () => {
  editModalOpen.value = false;
};

const saveEdit = async () => {
  props.setBusy(true);
  try {
    const payload: Record<string, any> = {
      user_name: editDraft.user_name,
      is_banned: editDraft.is_banned
    };
    if (editDraft.password) payload.password = editDraft.password;
    await adminRequest.put(`/api/v1/users/${editDraft.id}`, payload);
    toast.success('已更新玩家信息');
    editModalOpen.value = false;
    await loadPlayers();
  } catch (e: any) {
    toast.error(e?.message || '更新失败');
  } finally {
    props.setBusy(false);
  }
};

const openBan = (player: PlayerRow) => {
  banDraft.id = player.id;
  banDraft.user_name = player.user_name;
  banDraft.ban_type = 'temporary';
  banDraft.ban_end_time = '';
  banDraft.reason = '';
  banModalOpen.value = true;
};

const closeBan = () => {
  banModalOpen.value = false;
};

const banPlayer = async () => {
  if (!banDraft.reason.trim()) {
    toast.error('请填写封禁原因');
    return;
  }
  props.setBusy(true);
  try {
    const payload: Record<string, any> = {
      player_id: banDraft.id,
      reason: banDraft.reason.trim(),
      ban_type: banDraft.ban_type
    };
    if (banDraft.ban_type === 'temporary') {
      if (!banDraft.ban_end_time) {
        toast.error('临时封禁需要结束时间');
        return;
      }
      payload.ban_end_time = new Date(banDraft.ban_end_time).toISOString();
    }
    await adminRequest.post('/api/v1/ban/ban_player', payload);
    toast.success('已封禁');
    banModalOpen.value = false;
    await loadPlayers();
  } catch (e: any) {
    toast.error(e?.message || '封禁失败');
  } finally {
    props.setBusy(false);
  }
};

const unbanPlayer = async (player: PlayerRow) => {
  props.setBusy(true);
  try {
    await adminRequest.post(`/api/v1/ban/unban_player/${player.id}`, {});
    toast.success('已解封');
    await loadPlayers();
  } catch (e: any) {
    toast.error(e?.message || '解封失败');
  } finally {
    props.setBusy(false);
  }
};

const deleteUser = async (player: PlayerRow) => {
  if (!confirm(`确定删除用户 ${player.user_name} (#${player.id})？此操作不可恢复。`)) return;
  props.setBusy(true);
  try {
    await adminRequest.delete(`/api/v1/users/${player.id}`);
    toast.success('已删除用户');
    await loadPlayers();
  } catch (e: any) {
    toast.error(e?.message || '删除失败');
  } finally {
    props.setBusy(false);
  }
};

defineExpose({
  refresh: loadPlayers
});

watch(
  () => props.active,
  (value) => {
    if (value && players.value.length === 0 && !playersLoading.value) loadPlayers();
  },
  { immediate: true }
);
</script>
