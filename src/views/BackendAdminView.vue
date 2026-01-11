<template>
  <div class="admin-container">
    <VideoBackground />

    <div class="admin-panel">
      <div class="header">
        <div class="title-row">
          <h2 class="title">后端管理</h2>
          <span class="status" :class="{ ok: backendReady && isAdmin, warn: !backendReady || !isAdmin }">
            {{ backendReady ? (isAdmin ? '仙官权限' : '无权限') : '后端不可用' }}
          </span>
        </div>
        <p class="subtitle">世界/出身/天赋/天资/灵根 与 联机数据管理</p>
      </div>

      <div v-if="!backendConfigured" class="locked">
        <p>未配置后端服务器，无法使用。</p>
        <div class="actions">
          <button class="btn btn-secondary" @click="goBack">返回</button>
        </div>
      </div>

      <div v-else-if="!backendReady" class="locked">
        <p>后端未连接或不可用，请先确认后端运行正常。</p>
        <div class="actions">
          <button class="btn btn-secondary" @click="goBack">返回</button>
          <button class="btn" @click="checkBackend">重试连接</button>
        </div>
      </div>

      <template v-else>
        <div v-if="!isAdmin" class="locked">
          <p>需要仙官权限才能访问后端管理。</p>
          <p class="hint">请在登录页面勾选"仙官登录"后重新登录。</p>
          <div class="actions">
            <button class="btn btn-secondary" @click="goBack">返回</button>
            <button class="btn" @click="goLogin">去登录</button>
          </div>
        </div>

        <template v-else>
          <div class="top-actions">
            <div class="tab-groups">
              <div v-for="group in tabGroups" :key="group.label" class="tab-group">
                <div class="group-label">{{ group.label }}</div>
                <div class="tabs">
                  <button
                    v-for="t in group.tabs"
                    :key="t.id"
                    class="tab"
                    :class="{ active: activeTab === t.id }"
                    @click="activeTab = t.id"
                  >
                    {{ t.label }}
                  </button>
                </div>
              </div>
            </div>
            <div class="actions">
              <button class="btn btn-secondary" @click="logout">退出登录</button>
              <button class="btn" :disabled="isBusy" @click="refreshActive">刷新</button>
            </div>
          </div>

          <div class="content">
            <!-- 存档管理标签页 -->
            <div v-if="activeTab === 'saves'" class="section">
              <div class="section-head">
                <div class="section-title">存档管理</div>
                <div class="section-sub">查看和删除玩家存档</div>
              </div>

              <div class="toolbar">
                <input v-model="saveQuery" class="input" placeholder="搜索角色名/道号..." />
                <button class="btn" :disabled="isBusy" @click="loadSaves">加载</button>
              </div>

              <div v-if="savesError" class="error">{{ savesError }}</div>
              <div v-else-if="savesLoading" class="loading">加载中…</div>
              <div v-else class="table saves">
                <div class="row header">
                  <div class="cell id">ID</div>
                  <div class="cell name">道号</div>
                  <div class="cell name">角色名</div>
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
                    <button class="btn sm danger" :disabled="isBusy" @click="deleteSave(s)">删除</button>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="activeTab === 'online'" class="section">
              <div class="section-head">
                <div class="section-title">联机数据 · 玩家管理</div>
                <div class="section-sub">修改穿越点、查看基础信息</div>
              </div>

              <div class="toolbar">
                <input v-model="playerQuery" class="input" placeholder="搜索道号..." />
                <button class="btn" :disabled="isBusy" @click="loadPlayers">加载</button>
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
                  <div class="cell actions">
                    <button class="btn sm" :disabled="isBusy" @click="saveTravelPoints(p)">保存</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 角色管理标签页 -->
            <div v-else-if="activeTab === 'characters'" class="section">
              <div class="section-head">
                <div class="section-title">角色管理</div>
                <div class="section-sub">查看所有角色信息</div>
              </div>

              <div class="toolbar">
                <input v-model="characterQuery" class="input" placeholder="搜索角色名/道号..." />
                <button class="btn" :disabled="isBusy" @click="loadCharacters">加载</button>
              </div>

              <div v-if="charactersError" class="error">{{ charactersError }}</div>
              <div v-else-if="charactersLoading" class="loading">加载中…</div>
              <div v-else class="table characters">
                <div class="row header">
                  <div class="cell id">ID</div>
                  <div class="cell name">道号</div>
                  <div class="cell name">角色名</div>
                  <div class="cell">世界</div>
                  <div class="cell">境界</div>
                  <div class="cell num">年龄</div>
                  <div class="cell time">创建时间</div>
                </div>
                <div v-for="c in filteredCharacters" :key="c.id" class="row">
                  <div class="cell id">#{{ c.id }}</div>
                  <div class="cell name">{{ c.user_name }}</div>
                  <div class="cell name">{{ c.character_name }}</div>
                  <div class="cell">{{ c.world }}</div>
                  <div class="cell">{{ c.realm }}</div>
                  <div class="cell num">{{ c.age }}</div>
                  <div class="cell time">{{ formatDate(c.created_at) }}</div>
                </div>
              </div>
            </div>

            <div v-else class="section">
              <div class="section-head">
                <div class="section-title">{{ tabLabel }}</div>
                <div class="section-sub">增删改查（复杂字段用 JSON 编辑）</div>
              </div>

              <div class="toolbar">
                <input v-model="crudQuery" class="input" placeholder="搜索名称..." />
                <button class="btn" :disabled="isBusy" @click="loadCrud">加载</button>
                <button class="btn primary" :disabled="isBusy" @click="openCreate">新增</button>
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
                    <button class="btn sm" :disabled="isBusy" @click="openEdit(item)">编辑</button>
                    <button class="btn sm danger" :disabled="isBusy" @click="deleteItem(item)">删除</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="editModalOpen" class="modal-overlay" @click.self="closeModal">
            <div class="modal">
              <div class="modal-head">
                <div class="modal-title">{{ editingItem?.id ? '编辑' : '新增' }} · {{ tabLabel }}</div>
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
                <button class="btn primary" :disabled="isBusy || !editDraft.name" @click="saveItem">保存</button>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import VideoBackground from '@/components/common/VideoBackground.vue';
import { toast } from '@/utils/toast';
import { buildBackendUrl, isBackendConfigured } from '@/services/backendConfig';
import { adminRequest } from '@/services/adminRequest';
import { useUIStore } from '@/stores/uiStore';

type AdminMe = { id: number; user_name: string; role?: string; created_at?: string };

type CrudItem = { id: number; name: string; description?: string; [k: string]: any };

type PlayerRow = {
  id: number;
  user_name: string;
  created_at: string;
  is_banned: boolean;
  character_count: number;
  travel_points: number;
  _draft_travel_points: number;
};

type SaveRow = {
  id: number;
  user_name: string;
  character_name: string;
  mode: string;
  created_at: string;
  updated_at: string;
  size_kb: number;
};

type CharacterRow = {
  id: number;
  user_name: string;
  character_name: string;
  world: string;
  realm: string;
  age: number;
  created_at: string;
};

const router = useRouter();
const uiStore = useUIStore();

const backendConfigured = ref(isBackendConfigured());
const backendReady = ref(false);

const checkBackend = async () => {
  backendConfigured.value = isBackendConfigured();
  if (!backendConfigured.value) {
    backendReady.value = false;
    return;
  }
  backendReady.value = await uiStore.checkBackendConnection();
};

const goBack = () => router.push('/');
const goLogin = () => router.push('/login');

const isBusy = ref(false);

// 检查是否是管理员
const isAdmin = computed(() => localStorage.getItem('is_admin') === 'true');

const logout = () => {
  localStorage.removeItem('is_admin');
  localStorage.removeItem('access_token');
  localStorage.removeItem('username');
  toast.info('已退出登录');
  router.push('/login');
};

// 定义所有标签页
const allTabs = [
  { id: 'saves', label: '存档管理', group: '数据管理' },
  { id: 'online', label: '玩家管理', group: '数据管理' },
  { id: 'characters', label: '角色管理', group: '数据管理' },
  { id: 'ban_records', label: '封号管理', group: '用户管理' },
  { id: 'appeals', label: '申诉管理', group: '用户管理' },
  { id: 'admins', label: '仙官管理', group: '用户管理' },
  { id: 'worlds', label: '世界', group: '开局配置' },
  { id: 'origins', label: '出身', group: '开局配置' },
  { id: 'talents', label: '天赋', group: '开局配置' },
  { id: 'talent_tiers', label: '天资', group: '开局配置' },
  { id: 'spirit_roots', label: '灵根', group: '开局配置' },
  { id: 'codes', label: '兑换码', group: '其他' },
  { id: 'workshop', label: '创意工坊', group: '其他' },
  { id: 'system', label: '系统设置', group: '其他' },
] as const;

type TabId = (typeof allTabs)[number]['id'];

// 按分组组织标签页
const tabGroups = [
  { label: '数据管理', tabs: allTabs.filter(t => t.group === '数据管理') },
  { label: '用户管理', tabs: allTabs.filter(t => t.group === '用户管理') },
  { label: '开局配置', tabs: allTabs.filter(t => t.group === '开局配置') },
  { label: '其他', tabs: allTabs.filter(t => t.group === '其他') },
];

const activeTab = ref<TabId>('worlds');

const tabLabel = computed(() => allTabs.find(t => t.id === activeTab.value)?.label || '管理');

const crudQuery = ref('');
const crudLoading = ref(false);
const crudError = ref('');
const crudItems = ref<CrudItem[]>([]);

const playersLoading = ref(false);
const playersError = ref('');
const playerQuery = ref('');
const players = ref<PlayerRow[]>([]);

const savesLoading = ref(false);
const savesError = ref('');
const saveQuery = ref('');
const saves = ref<SaveRow[]>([]);

const charactersLoading = ref(false);
const charactersError = ref('');
const characterQuery = ref('');
const characters = ref<CharacterRow[]>([]);

const formatDate = (isoText: string) => {
  if (!isoText) return '-';
  const date = new Date(isoText);
  if (Number.isNaN(date.getTime())) return isoText;
  return date.toLocaleString();
};

const getCrudPath = (): string => {
  switch (activeTab.value) {
    case 'worlds': return '/api/v1/worlds/';
    case 'origins': return '/api/v1/origins/';
    case 'talents': return '/api/v1/talents/';
    case 'talent_tiers': return '/api/v1/talent_tiers/';
    case 'spirit_roots': return '/api/v1/spirit_roots/';
    default: return '';
  }
};

const normalizeCrudItem = (raw: any): CrudItem => ({
  ...raw,
  id: Number(raw?.id),
  name: String(raw?.name ?? raw?.名称 ?? ''),
  description: typeof raw?.description === 'string' ? raw.description : (typeof raw?.描述 === 'string' ? raw.描述 : ''),
});

const loadCrud = async () => {
  const path = getCrudPath();
  if (!path) return;
  crudLoading.value = true;
  crudError.value = '';
  try {
    const rows = await adminRequest.get<any[]>(path);
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

const loadPlayers = async () => {
  playersLoading.value = true;
  playersError.value = '';
  try {
    const rows = await adminRequest.get<any[]>('/api/v1/users/');
    players.value = (rows || []).map((r) => {
      const travelPoints = Number(r?.travel_points ?? 0);
      return {
        id: Number(r?.id),
        user_name: String(r?.user_name ?? ''),
        created_at: String(r?.created_at ?? ''),
        is_banned: !!r?.is_banned,
        character_count: Number(r?.character_count ?? 0),
        travel_points: travelPoints,
        _draft_travel_points: travelPoints,
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
  isBusy.value = true;
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
    isBusy.value = false;
  }
};

// 存档管理相关函数
const loadSaves = async () => {
  savesLoading.value = true;
  savesError.value = '';
  try {
    const rows = await adminRequest.get<any[]>('/api/v1/admin/saves');
    saves.value = (rows || []).map((r) => ({
      id: Number(r?.id),
      user_name: String(r?.user_name ?? ''),
      character_name: String(r?.character_name ?? ''),
      mode: String(r?.mode ?? ''),
      created_at: String(r?.created_at ?? ''),
      updated_at: String(r?.updated_at ?? ''),
      size_kb: Number(r?.size_kb ?? 0),
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
  isBusy.value = true;
  try {
    await adminRequest.delete(`/api/v1/admin/saves/${save.id}`);
    toast.success('已删除存档');
    await loadSaves();
  } catch (e: any) {
    toast.error(e?.message || '删除失败');
  } finally {
    isBusy.value = false;
  }
};

// 角色管理相关函数
const loadCharacters = async () => {
  charactersLoading.value = true;
  charactersError.value = '';
  try {
    const rows = await adminRequest.get<any[]>('/api/v1/admin/characters');
    characters.value = (rows || []).map((r) => ({
      id: Number(r?.id),
      user_name: String(r?.user_name ?? ''),
      character_name: String(r?.character_name ?? ''),
      world: String(r?.world ?? ''),
      realm: String(r?.realm ?? ''),
      age: Number(r?.age ?? 0),
      created_at: String(r?.created_at ?? ''),
    } satisfies CharacterRow));
  } catch (e: any) {
    charactersError.value = e?.message || '加载失败';
  } finally {
    charactersLoading.value = false;
  }
};

const filteredCharacters = computed(() => {
  const q = characterQuery.value.trim();
  if (!q) return characters.value;
  return characters.value.filter(c =>
    c.user_name.includes(q) ||
    c.character_name.includes(q) ||
    String(c.id).includes(q)
  );
});

const editModalOpen = ref(false);
const editingItem = ref<CrudItem | null>(null);
const editDraft = reactive({ name: '', description: '', extraJson: '' });

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
  const cloned = { ...item };
  delete (cloned as any).id;
  delete (cloned as any).name;
  delete (cloned as any).description;
  editDraft.extraJson = Object.keys(cloned).length ? JSON.stringify(cloned, null, 2) : '';
  editModalOpen.value = true;
};

const closeModal = () => {
  editModalOpen.value = false;
};

const saveItem = async () => {
  const path = getCrudPath();
  if (!path) return;

  let extra: any = {};
  if (editDraft.extraJson.trim()) {
    try {
      extra = JSON.parse(editDraft.extraJson);
    } catch {
      toast.error('附加 JSON 不是合法 JSON');
      return;
    }
  }

  const payload = { ...extra, name: editDraft.name, description: editDraft.description };

  isBusy.value = true;
  try {
    if (editingItem.value?.id) {
      await adminRequest.put(`${path}${editingItem.value.id}`, payload);
      toast.success('已保存');
    } else {
      await adminRequest.post(path, payload);
      toast.success('已创建');
    }
    editModalOpen.value = false;
    await loadCrud();
  } catch (e: any) {
    toast.error(e?.message || '保存失败');
  } finally {
    isBusy.value = false;
  }
};

const deleteItem = async (item: CrudItem) => {
  const path = getCrudPath();
  if (!path) return;
  if (!confirm(`确定删除：${item.name} (#${item.id})？`)) return;

  isBusy.value = true;
  try {
    await adminRequest.delete(`${path}${item.id}`);
    toast.success('已删除');
    await loadCrud();
  } catch (e: any) {
    toast.error(e?.message || '删除失败');
  } finally {
    isBusy.value = false;
  }
};

const refreshActive = async () => {
  if (activeTab.value === 'saves') {
    await loadSaves();
  } else if (activeTab.value === 'characters') {
    await loadCharacters();
  } else if (activeTab.value === 'online') {
    await loadPlayers();
  } else {
    await loadCrud();
  }
};

watch(activeTab, () => {
  crudQuery.value = '';
  crudError.value = '';
  playersError.value = '';
});

onMounted(async () => {
  await checkBackend();
  if (!backendReady.value) return;
  if (isAdmin.value) await refreshActive();
});
</script>

<style scoped>
.admin-container {
  width: 100%;
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  box-sizing: border-box;
  overflow: auto;
}

.admin-panel {
  width: 100%;
  max-width: 1100px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 2rem;
  color: var(--color-text);
}

.header { margin-bottom: 1.25rem; }
.title-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.title { margin: 0; font-family: var(--font-family-serif); font-size: 2rem; color: var(--color-primary); }
.subtitle { margin: 0.6rem 0 0; color: var(--color-text-secondary); }

.status {
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  font-size: 0.85rem;
}
.status.ok { border-color: rgba(34, 197, 94, 0.4); color: #22c55e; }
.status.warn { border-color: rgba(251, 191, 36, 0.4); color: #fbbf24; }

.locked { padding: 1.25rem; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface-light); }

.login-card { border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface-light); padding: 1.25rem; }
.login-title { font-weight: 800; margin-bottom: 0.75rem; }
.login-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.hint { margin-top: 0.75rem; color: var(--color-text-secondary); font-size: 0.85rem; }

.top-actions { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
.tab-groups { display: flex; flex-direction: row; flex-wrap: wrap; gap: 1.5rem; flex: 1; }
.tab-group { display: flex; flex-direction: column; gap: 0.5rem; min-width: fit-content; }
.group-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-left: 0.25rem;
}
.tabs { display: flex; flex-direction: column; gap: 0.5rem; }
.tab {
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.9rem;
}
.tab:hover:not(.active) { border-color: rgba(var(--color-primary-rgb), 0.2); }
.tab.active { background: rgba(var(--color-primary-rgb), 0.08); border-color: rgba(var(--color-primary-rgb), 0.35); color: var(--color-text); font-weight: 600; }

.content { display: grid; gap: 1rem; }
.section { border: 1px solid var(--color-border); border-radius: 12px; padding: 1rem; background: var(--color-surface-light); }
.section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: 0.75rem; }
.section-title { font-weight: 800; }
.section-sub { color: var(--color-text-secondary); font-size: 0.85rem; }

.toolbar { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem; }

.field { display: grid; gap: 0.35rem; }
.label { font-size: 0.85rem; color: var(--color-text-secondary); }
.input {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background);
  color: var(--color-text);
}
.input.small { padding: 0.35rem 0.5rem; border-radius: 8px; width: 120px; }
.textarea {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background);
  color: var(--color-text);
  resize: vertical;
}
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; }

.actions { display: flex; justify-content: space-between; gap: 0.75rem; margin-top: 1rem; }
.btn {
  padding: 0.6rem 0.9rem;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
}
.btn:hover:not(:disabled) { border-color: var(--color-primary); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.primary { background: var(--color-primary); color: white; border-color: rgba(var(--color-primary-rgb), 0.7); }
.btn.btn-secondary { background: transparent; }
.btn.danger, .btn.sm.danger { border-color: rgba(239, 68, 68, 0.35); color: #ef4444; }
.btn.sm { padding: 0.35rem 0.6rem; border-radius: 8px; font-size: 0.85rem; }

.table { border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden; background: var(--color-surface); }
.table.crud .row { display: grid; grid-template-columns: 90px 200px 1fr 170px; gap: 0.5rem; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--color-border); align-items: center; }
.table.players .row { display: grid; grid-template-columns: 90px 220px 1fr 120px 140px 120px; gap: 0.5rem; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--color-border); align-items: center; }
.table.saves .row { display: grid; grid-template-columns: 80px 150px 150px 100px 1fr 1fr 100px 100px; gap: 0.5rem; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--color-border); align-items: center; }
.table.characters .row { display: grid; grid-template-columns: 80px 150px 180px 120px 120px 100px 1fr; gap: 0.5rem; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--color-border); align-items: center; }
.row.header { background: rgba(var(--color-primary-rgb), 0.06); font-weight: 800; color: var(--color-text); }
.row:last-child { border-bottom: none; }

.cell.actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
.cell.desc { color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.pill { display: inline-flex; padding: 0.2rem 0.6rem; border-radius: 999px; border: 1px solid var(--color-border); background: rgba(var(--color-primary-rgb), 0.06); }
.pill.banned { border-color: rgba(239, 68, 68, 0.35); color: #ef4444; }

.error { color: #ef4444; padding: 0.5rem 0; }
.loading { color: var(--color-text-secondary); padding: 0.5rem 0; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 10000; }
.modal { width: min(720px, 100%); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 16px; box-shadow: 0 25px 60px rgba(0,0,0,0.4); overflow: hidden; }
.modal-head { padding: 1rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--color-border); }
.modal-title { font-weight: 900; }
.modal-body { padding: 1rem; display: grid; gap: 0.75rem; }

@media (max-width: 820px) {
  .login-grid { grid-template-columns: 1fr; }
  .table.crud .row { grid-template-columns: 80px 1fr 120px; grid-template-areas: "id name actions" "desc desc desc"; }
  .table.crud .cell.desc { grid-area: desc; }
  .table.crud .cell.actions { grid-area: actions; }
  .table.players .row { grid-template-columns: 80px 1fr 120px; grid-template-areas: "id name actions" "time time time" "num num num"; }
}
</style>
