<template>
  <div class="workshop-container">
    <VideoBackground />

    <div class="workshop-panel">
      <div class="header">
        <div class="title-row">
          <div class="title-group">
            <span class="title-icon">✦</span>
            <h2 class="title">创意工坊</h2>
          </div>
          <div v-if="backendReady" class="auth-pill" :class="{ ok: authState === 'authed', warn: authState !== 'authed' }">
            <span v-if="authState === 'checking'">检测中…</span>
            <span v-else-if="authState === 'authed'">已验证</span>
            <span v-else>未验证</span>
            <button v-if="authState !== 'authed'" class="pill-link" @click="goLogin">去验证</button>
            <button class="pill-link" @click="refreshAuth">刷新</button>
          </div>
          <div v-else class="auth-pill warn">
            <span>未配置后端</span>
          </div>
        </div>
        <p class="subtitle">分享设置、提示词、开局配置、存档</p>
        <p class="notice">
          工坊内容仅对<strong>单机本地</strong>生效，联机模式由后端控制。
        </p>
      </div>

      <div v-if="!backendReady" class="backend-locked">
        <p>未配置后端服务器，创意工坊不可用。</p>
        <div class="actions">
          <button class="btn btn-secondary" @click="goBack">返回</button>
        </div>
      </div>

      <template v-else>
      <div class="tabs">
        <button class="tab" :class="{ active: activeTab === 'browse' }" @click="switchTab('browse')">浏览</button>
        <button class="tab" :class="{ active: activeTab === 'mine' }" @click="switchTab('mine')">我的发布</button>
        <button class="tab" :class="{ active: activeTab === 'upload' }" @click="switchTab('upload')">上传</button>
      </div>

      <div v-if="activeTab !== 'upload'" class="browse scroll-content">
        <div class="filters">
          <select v-model="filterType" class="input">
            <option value="">全部类型</option>
            <option value="settings">设置</option>
            <option value="prompts">提示词</option>
            <option value="saves">单机存档</option>
            <option value="start_config">开局配置</option>
          </select>
          <input v-model="query" class="input" :placeholder="isMineTab ? '搜索标题 / 说明' : '搜索标题 / 作者 / 说明'" />
          <select v-model.number="pageSize" class="input">
            <option v-for="size in pageSizeOptions" :key="size" :value="size">
              每页 {{ size }} 个
            </option>
          </select>
          <button class="btn btn-secondary" @click="refreshList" :disabled="loadingList">刷新</button>
        </div>

        <div v-if="isMineTab" class="manage-bar">
          <div class="manage-title">我的发布管理</div>
          <div class="manage-meta">仅显示自己发布的内容 · 共 {{ total }} 条</div>
        </div>

        <div v-if="loadingList" class="loading">加载中…</div>
        <div v-else-if="items.length === 0" class="empty">
          <p>暂无内容</p>
        </div>
        <div v-else class="item-list">
          <div v-for="item in items" :key="item.id" class="item-card">
            <div class="item-top">
              <div class="item-title">{{ item.title }}</div>
              <div class="item-type">{{ typeLabel[item.type] || item.type }}</div>
            </div>
            <div v-if="item.description" class="item-desc">{{ item.description }}</div>
            <div class="item-meta">
              <span>作者：{{ item.author_name }}</span>
              <span v-if="item.game_version">版本：{{ item.game_version }}</span>
              <span>下载：{{ item.downloads }}</span>
            </div>
            <div v-if="item.tags?.length" class="tags">
              <span v-for="t in item.tags" :key="t" class="tag">{{ t }}</span>
            </div>
            <div class="item-actions">
              <button class="btn btn-secondary" @click="openDownload(item.id)">下载</button>
              <button v-if="isMineTab" class="btn danger" @click="deleteItem(item)">删除</button>
            </div>
          </div>
        </div>

        <div v-if="totalPages > 1" class="pagination">
          <div class="page-meta">
            <span>共 {{ total }} 条</span>
            <span>第 {{ page }} / {{ totalPages }} 页</span>
          </div>
          <div class="page-controls">
            <button class="btn btn-secondary" @click="goPrevPage" :disabled="page <= 1">上一页</button>
            <button class="btn" @click="goNextPage" :disabled="page >= totalPages">下一页</button>
          </div>
        </div>
      </div>

      <div v-else class="upload scroll-content">
        <div v-if="authState !== 'authed'" class="upload-locked">
          <p>上传需要先完成账号验证（用于标识作者与权限控制）。</p>
          <div class="actions">
            <button class="btn btn-secondary" @click="goLogin">去验证</button>
            <button class="btn" @click="refreshAuth">刷新</button>
          </div>
        </div>
        <div v-else class="upload-form">
          <div class="form-row">
            <label class="label">类型</label>
            <select v-model="uploadType" class="input">
              <option value="settings">设置</option>
              <option value="prompts">提示词</option>
              <option value="saves">单机存档</option>
              <option value="start_config">开局配置</option>
            </select>
          </div>
          <div class="form-row">
            <label class="label">标题</label>
            <input v-model="uploadTitle" class="input" placeholder="给这个分享起个名字" />
          </div>
          <div class="form-row">
            <label class="label">说明</label>
            <textarea v-model="uploadDesc" class="input textarea" placeholder="可选：写点说明（支持 2000 字以内）" />
          </div>
          <div class="form-row">
            <label class="label">标签</label>
            <input v-model="uploadTagsText" class="input" placeholder="可选：用逗号分隔，如：新手,爽文,慢热" />
          </div>

          <div class="form-row">
            <label class="label">内容</label>
            <div class="content-actions">
              <button v-if="uploadType === 'settings'" class="btn btn-secondary" @click="loadLocalSettings">
                从本地读取设置
              </button>
              <button v-if="uploadType === 'prompts'" class="btn btn-secondary" @click="loadLocalPrompts">
                从本地导出提示词
              </button>
              <label class="file-btn btn btn-secondary">
                选择 JSON 文件
                <input type="file" accept=".json,application/json" @change="handleUploadFile" hidden />
              </label>
              <span class="hint" v-if="payloadHint">{{ payloadHint }}</span>
            </div>
          </div>

          <div class="actions">
            <button class="btn btn-secondary" @click="goBack">返回</button>
            <button class="btn" @click="submitUpload" :disabled="uploading">
              {{ uploading ? '上传中…' : '上传到工坊' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="activeTab !== 'upload'" class="actions">
        <button class="btn btn-secondary" @click="goBack">返回</button>
      </div>
      </template>

    </div>


    <!-- 下载/导入弹窗 -->

    <div v-if="downloadModal.open" class="modal-overlay" @click.self="closeDownloadModal">
      <div class="modal">
        <div class="modal-header">
          <h3>下载内容</h3>
          <button class="close-btn" @click="closeDownloadModal">&times;</button>
        </div>
        <div v-if="downloadModal.loading" class="modal-body">加载中…</div>
        <div v-else class="modal-body">
          <div class="modal-info">
            <div class="modal-title">{{ downloadModal.item?.title }}</div>
            <div class="modal-sub">
              <span v-if="downloadModal.item">类型：{{ typeLabel[downloadModal.item.type] || downloadModal.item.type }}</span>
              <span v-if="downloadModal.item?.author_name">作者：{{ downloadModal.item.author_name }}</span>
              <span v-if="downloadModal.item?.game_version">版本：{{ downloadModal.item.game_version }}</span>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" @click="downloadAsFile">下载为文件</button>
            <button v-if="downloadModal.item?.type === 'settings'" class="btn" @click="applySettingsFromPayload">
              导入到本地设置
            </button>
            <button v-if="downloadModal.item?.type === 'prompts'" class="btn" @click="applyPromptsFromPayload">
              导入到本地提示词
            </button>
            <button v-if="downloadModal.item?.type === 'start_config'" class="btn" @click="applyStartConfigFromPayload">
              应用到开局配置
            </button>
          </div>

          <div v-if="downloadModal.item?.type === 'saves'" class="import-saves">
            <div class="form-row">
              <label class="label">导入到单机角色</label>
              <select v-model="targetCharId" class="input">
                <option value="">请选择角色</option>
                <option v-for="c in localCharacters" :key="c.角色ID" :value="c.角色ID">
                  {{ c.name }}
                </option>
              </select>
            </div>
            <button class="btn" :disabled="!targetCharId" @click="applySavesFromPayload">导入存档</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import VideoBackground from '@/components/common/VideoBackground.vue';
import { verifyStoredToken } from '@/services/request';
import { toast } from '@/utils/toast';
import { promptStorage } from '@/services/promptStorage';
import { createWorkshopItem, deleteWorkshopItem, downloadWorkshopItem, listMyWorkshopItems, listWorkshopItems, type WorkshopItemOut, type WorkshopItemType } from '@/services/workshop';
import { useCharacterStore } from '@/stores/characterStore';
import { fetchBackendVersion, isBackendConfigured } from '@/services/backendConfig';
import { createDadBundle, unwrapDadBundle } from '@/utils/dadBundle';
import { isSaveDataV3, migrateSaveDataToLatest } from '@/utils/saveMigration';
import { validateSaveDataV3 } from '@/utils/saveValidationV3';

const router = useRouter();
const characterStore = useCharacterStore();

const backendReady = ref(isBackendConfigured());
const backendVersion = ref<string | null>(null);
const effectiveVersion = computed(() => {
  if (!backendReady.value) {
    return APP_VERSION;
  }
  return backendVersion.value ?? '';
});
const versionLabel = computed(() => effectiveVersion.value || '未知版本');

const authState = ref<'checking' | 'authed' | 'unauthed'>('checking');
const activeTab = ref<'browse' | 'upload' | 'mine'>('browse');
const page = ref(1);
const pageSize = ref(12);
const total = ref(0);
const pageSizeOptions = [8, 12, 20, 30];
const listMode = computed(() => (activeTab.value === 'mine' ? 'mine' : 'browse'));
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const isMineTab = computed(() => activeTab.value === 'mine');
const isListTab = computed(() => activeTab.value !== 'upload');
const typeLabel: Record<string, string> = {
  settings: '设置',
  prompts: '提示词',
  saves: '单机存档',
  start_config: '开局配置',
};

const refreshAuth = async () => {
  if (!backendReady.value) {
    authState.value = 'unauthed';
    return;
  }
  authState.value = 'checking';
  try {
    const ok = await verifyStoredToken();
    authState.value = ok ? 'authed' : 'unauthed';
  } catch {
    authState.value = 'unauthed';
  }
};

onMounted(async () => {
  if (!backendReady.value) return;
  const fetchedVersion = await fetchBackendVersion();
  if (fetchedVersion) {
    backendVersion.value = fetchedVersion;
  }
  void refreshAuth();
  void refreshList();
});

const goBack = () => {
  router.push('/');
};

const goLogin = () => {
  if (!backendReady.value) {
    toast.info('未配置后端服务器，登录不可用');
    return;
  }
  router.push('/login');
};

const switchTab = (tab: 'browse' | 'upload' | 'mine') => {
  if (tab === 'mine' && authState.value !== 'authed') {
    goLogin();
    return;
  }
  activeTab.value = tab;
};

// --- 浏览 ---
const filterType = ref<WorkshopItemType | ''>('');
const query = ref('');
const items = ref<WorkshopItemOut[]>([]);
const loadingList = ref(false);

const refreshList = async () => {
  if (!backendReady.value) {
    items.value = [];
    total.value = 0;
    return;
  }
  if (listMode.value === 'mine' && authState.value !== 'authed') {
    goLogin();
    return;
  }
  loadingList.value = true;
  try {
    const res = listMode.value === 'mine'
      ? await listMyWorkshopItems({ type: filterType.value, q: query.value, page: page.value, pageSize: pageSize.value })
      : await listWorkshopItems({ type: filterType.value, q: query.value, page: page.value, pageSize: pageSize.value });
    items.value = res.items || [];
    total.value = res.total || 0;
  } catch {
    items.value = [];
    total.value = 0;
  } finally {
    loadingList.value = false;
  }
};

const goPrevPage = () => {
  if (page.value > 1) {
    page.value -= 1;
  }
};

const goNextPage = () => {
  if (page.value < totalPages.value) {
    page.value += 1;
  }
};

watch(activeTab, () => {
  page.value = 1;
  if (isListTab.value) {
    void refreshList();
  }
});

watch(page, () => {
  if (isListTab.value) {
    void refreshList();
  }
});

watch(pageSize, () => {
  page.value = 1;
  if (isListTab.value) {
    void refreshList();
  }
});

watch(filterType, () => {
  page.value = 1;
  if (isListTab.value) {
    void refreshList();
  }
});

// --- 下载/导入 ---
const downloadModal = ref<{
  open: boolean;
  loading: boolean;
  item: WorkshopItemOut | null;
  payload: unknown;
}>({
  open: false,
  loading: false,
  item: null,
  payload: null,
});

const targetCharId = ref('');

const closeDownloadModal = () => {
  downloadModal.value.open = false;
  downloadModal.value.loading = false;
  downloadModal.value.item = null;
  downloadModal.value.payload = null;
  targetCharId.value = '';
};

const openDownload = async (itemId: number) => {
  downloadModal.value.open = true;
  downloadModal.value.loading = true;
  downloadModal.value.item = null;
  downloadModal.value.payload = null;
  try {
    const res = await downloadWorkshopItem(itemId);
    downloadModal.value.item = res.item;
    downloadModal.value.payload = res.payload;
  } catch {
    closeDownloadModal();
  } finally {
    downloadModal.value.loading = false;
  }
};

const deleteItem = async (item: WorkshopItemOut) => {
  if (authState.value !== 'authed') {
    goLogin();
    return;
  }
  const ok = window.confirm(`确定删除「${item.title}」吗？删除后将无法恢复。`);
  if (!ok) return;
  try {
    await deleteWorkshopItem(item.id);
    toast.success('已删除');
    await refreshList();
  } catch {
    // request.ts 已 toast
  }
};

const downloadAsFile = () => {
  if (!downloadModal.value.item) return;
  const payload = downloadModal.value.payload;
  const dataStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().split('T')[0];
  link.download = `仙途-工坊-${downloadModal.value.item.type}-${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

const applySettingsFromPayload = () => {
  const payload = downloadModal.value.payload as any;
  const unwrapped = unwrapDadBundle(payload);

  // 提取设置数据（支持多种格式）
  let settingsData: any = null;

  if (unwrapped.type === 'settings') {
    // dad.bundle 格式
    settingsData = unwrapped.payload;
  } else if (payload?.settings) {
    // 旧导出格式 { settings: {...}, exportInfo: {...} }
    settingsData = payload.settings;
  } else if (unwrapped.type === null && typeof unwrapped.payload === 'object') {
    // 直接是设置对象
    settingsData = unwrapped.payload;
  }

  if (!settingsData || typeof settingsData !== 'object') {
    toast.error('设置内容格式不正确');
    return;
  }

  try {
    // 读取当前设置
    const currentSettings = (() => {
      try {
        const raw = localStorage.getItem('dad_game_settings');
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    })();

    // 合并设置（保留当前设置中未被覆盖的字段）
    const mergedSettings = { ...currentSettings, ...settingsData };

    // 保存到 localStorage
    localStorage.setItem('dad_game_settings', JSON.stringify(mergedSettings));

    toast.success('已导入本地设置（刷新页面后生效）');
    closeDownloadModal();
  } catch (error) {
    console.error('导入设置失败:', error);
    toast.error('导入设置失败，请重试');
  }
};

const applyPromptsFromPayload = async () => {
  const payload = downloadModal.value.payload as any;
  const unwrapped = unwrapDadBundle(payload);

  // 提取提示词数据（支持多种格式）
  let promptsData: any = null;

  if (unwrapped.type === 'prompts') {
    // dad.bundle 格式
    promptsData = unwrapped.payload;
  } else if (typeof payload === 'object' && !Array.isArray(payload)) {
    // 直接是提示词对象
    promptsData = payload;
  }

  if (!promptsData || typeof promptsData !== 'object') {
    toast.error('提示词内容格式不正确');
    return;
  }

  try {
    const count = await promptStorage.importPrompts(promptsData);
    toast.success(`已导入 ${count} 条提示词（刷新页面后生效）`);
    closeDownloadModal();
  } catch (error) {
    console.error('导入提示词失败:', error);
    toast.error('导入提示词失败，请重试');
  }
};

const applyStartConfigFromPayload = () => {
  const payload = downloadModal.value.payload as any;
  const unwrapped = unwrapDadBundle(payload);

  // 提取开局配置数据（支持多种格式）
  let startConfigData: any = null;

  if (unwrapped.type === 'start_config') {
    // dad.bundle 格式
    startConfigData = unwrapped.payload;
  } else if (typeof payload === 'object' && !Array.isArray(payload)) {
    // 直接是开局配置对象
    startConfigData = payload;
  }

  if (!startConfigData || typeof startConfigData !== 'object') {
    toast.error('开局配置格式不正确');
    return;
  }

  try {
    localStorage.setItem('dad_start_config', JSON.stringify(startConfigData));
    toast.success('已应用到本地开局配置（重新打开开局页面生效）');
    closeDownloadModal();
  } catch (error) {
    console.error('导入开局配置失败:', error);
    toast.error('导入开局配置失败，请重试');
  }
};

const localCharacters = computed(() => {
  const list = (characterStore.allCharacterProfiles as any[]) || [];
  return list
    .filter((c: any) => c?.模式 === '单机')
    .map((c: any) => ({
      角色ID: c.角色ID,
      name: c?.角色?.名字 || c.角色ID,
    }));
});

const applySavesFromPayload = async () => {
  if (!targetCharId.value) return;
  const payload = downloadModal.value.payload as any;
  const unwrapped = unwrapDadBundle(payload);

  const saves = (() => {
    if (unwrapped.type === 'saves' && Array.isArray(unwrapped.payload?.saves)) return unwrapped.payload.saves;
    if (unwrapped.type === 'character' && Array.isArray(unwrapped.payload?.存档列表)) return unwrapped.payload.存档列表;
    return null;
  })();

  if (!saves) {
    toast.error('存档内容格式不正确');
    return;
  }

  for (const save of saves) {
    await characterStore.importSave(targetCharId.value, save);
  }
  toast.success(`已导入 ${saves.length} 个存档到本地单机角色`);
};

// --- 上传 ---
const uploadType = ref<WorkshopItemType>('settings');
const uploadTitle = ref('');
const uploadDesc = ref('');
const uploadTagsText = ref('');
const uploadPayload = ref<unknown>(null);
const payloadHint = ref('');
const uploading = ref(false);

const parseTags = (text: string): string[] => {
  return text
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .slice(0, 12);
};

const handleUploadFile = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    uploadPayload.value = JSON.parse(text);
    payloadHint.value = `已读取：${file.name}`;
    if (!uploadTitle.value) uploadTitle.value = file.name.replace(/\.json$/i, '');
  } catch {
    uploadPayload.value = null;
    payloadHint.value = '';
    toast.error('读取文件失败，请确认是有效的 JSON');
  } finally {
    (e.target as HTMLInputElement).value = '';
  }
};

const loadLocalSettings = () => {
  try {
    const raw = localStorage.getItem('dad_game_settings');
    if (!raw) {
      toast.info('本地还没有设置数据');
      return;
    }
    const settings = JSON.parse(raw);
    uploadPayload.value = {
      settings,
      exportInfo: { timestamp: new Date().toISOString(), version: versionLabel.value, gameVersion: `仙途 v${versionLabel.value}` },
    };
    payloadHint.value = '已从本地读取 dad_game_settings';
    if (!uploadTitle.value) uploadTitle.value = `设置-${versionLabel.value}`;
  } catch {
    toast.error('读取本地设置失败');
  }
};

const loadLocalPrompts = async () => {
  try {
    const data = await promptStorage.exportAll();
    uploadPayload.value = data;
    payloadHint.value = '已从本地导出提示词';
    if (!uploadTitle.value) uploadTitle.value = `提示词-${versionLabel.value}`;
  } catch {
    toast.error('导出本地提示词失败');
  }
};

const submitUpload = async () => {
  if (authState.value !== 'authed') {
    toast.info('上传前需要先完成账号验证');
    return;
  }
  const title = uploadTitle.value.trim();
  if (!title) {
    toast.error('请填写标题');
    return;
  }
  if (!uploadPayload.value) {
    toast.error('请先选择/生成要上传的内容');
    return;
  }

  // 统一：工坊上传 payload 全部使用 dad.bundle（导入时仍兼容旧格式）
  const normalizeUploadPayload = (): { bundleType: 'settings' | 'prompts' | 'saves' | 'character' | 'start_config'; bundle: unknown } => {
    const raw = uploadPayload.value as any;
    const unwrapped = unwrapDadBundle(raw);

    if (uploadType.value === 'settings') {
      const settings = unwrapped.type === 'settings' ? unwrapped.payload : raw?.settings ?? raw;
      if (!settings || typeof settings !== 'object') throw new Error('设置内容格式不正确');
      return { bundleType: 'settings', bundle: createDadBundle('settings', settings, { appVersion: versionLabel.value }) };
    }

    if (uploadType.value === 'prompts') {
      const promptsPayload = unwrapped.type === 'prompts' ? unwrapped.payload : raw;
      if (!promptsPayload || typeof promptsPayload !== 'object') throw new Error('提示词内容格式不正确');
      return { bundleType: 'prompts', bundle: createDadBundle('prompts', promptsPayload, { appVersion: versionLabel.value }) };
    }

    if (uploadType.value === 'start_config') {
      const startConfig = unwrapped.type === 'start_config' ? unwrapped.payload : raw;
      if (!startConfig || typeof startConfig !== 'object') throw new Error('开局配置格式不正确');
      return { bundleType: 'start_config', bundle: createDadBundle('start_config', startConfig, { appVersion: versionLabel.value }) };
    }

    // saves：允许上传“存档包 / 角色包”（工坊类型仍为 saves）
    if (uploadType.value === 'saves') {
      const bundleType = unwrapped.type === 'character' ? 'character' : 'saves';

      const saves = (() => {
        if (unwrapped.type === 'saves' && Array.isArray(unwrapped.payload?.saves)) return unwrapped.payload.saves;
        if (unwrapped.type === 'character' && Array.isArray(unwrapped.payload?.存档列表)) return unwrapped.payload.存档列表;

        // 兼容：旧格式（未包裹 dad.bundle）
        if (raw?.type === 'saves' && Array.isArray(raw.saves)) return raw.saves;
        if (raw?.type === 'character' && Array.isArray(raw.character?.存档列表)) return raw.character.存档列表;

        return null;
      })();

      if (!saves) throw new Error('单机存档必须使用游戏导出的存档或角色文件');

      const normalizedSaves = saves.map((s: any) => {
        const rawSaveData = s?.存档数据;
        if (!rawSaveData) throw new Error(`存档「${s?.存档名 ?? '未知'}」缺少存档数据`);
        const v3SaveData = isSaveDataV3(rawSaveData as any) ? rawSaveData : migrateSaveDataToLatest(rawSaveData as any).migrated;
        const validation = validateSaveDataV3(v3SaveData as any);
        if (!validation.isValid) throw new Error(`存档「${s?.存档名 ?? '未知'}」校验失败：${validation.errors[0] || '未知原因'}`);
        return { ...s, 存档数据: v3SaveData };
      });

      if (bundleType === 'character') {
        const payload = {
          角色ID: raw?.角色ID ?? unwrapped.payload?.角色ID,
          角色信息: JSON.parse(JSON.stringify(raw?.角色信息 ?? unwrapped.payload?.角色信息 ?? {})),
          存档列表: normalizedSaves,
        };
        return { bundleType: 'character', bundle: createDadBundle('character', payload, { appVersion: versionLabel.value }) };
      }

      const payload = {
        characterId: raw?.characterId ?? unwrapped.payload?.characterId,
        characterName: raw?.characterName ?? unwrapped.payload?.characterName,
        saves: normalizedSaves,
      };
      return { bundleType: 'saves', bundle: createDadBundle('saves', payload, { appVersion: versionLabel.value }) };
    }

    throw new Error('不支持的上传类型');
  };

  uploading.value = true;
  try {
    const normalized = normalizeUploadPayload();
    await createWorkshopItem({
      type: uploadType.value,
      title,
      description: uploadDesc.value.trim() || undefined,
      tags: parseTags(uploadTagsText.value),
      payload: normalized.bundle,
      game_version: `仙途 v${versionLabel.value}`,
      data_version: '1',
    });
    toast.success('上传成功');
    uploadTitle.value = '';
    uploadDesc.value = '';
    uploadTagsText.value = '';
    uploadPayload.value = null;
    payloadHint.value = '';
    activeTab.value = 'browse';
    page.value = 1;
    await refreshList();
  } catch {
    // request.ts 已 toast
  } finally {
    uploading.value = false;
  }
};
</script>

<style scoped>
.workshop-container {
  width: 100%;
  height: 100vh;
  height: 100svh;
  height: 100dvh;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 12px;
  padding-top: calc(12px + env(safe-area-inset-top));
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  overflow: hidden;
}

.workshop-panel {
  width: 100%;
  max-width: 880px;
  height: 100%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 20px 24px;
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.workshop-panel > .header {
  flex: 0 0 auto;
}

.workshop-panel > .tabs {
  flex: 0 0 auto !important;
  height: auto !important;
  max-height: 50px;
}

.workshop-panel > .actions {
  flex: 0 0 auto;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.title-icon {
  font-size: 1.4rem;
  color: var(--color-primary);
  opacity: 0.8;
}

.title {
  margin: 0;
  font-family: var(--font-family-serif);
  font-size: 1.5rem;
  color: var(--color-primary);
}

.auth-pill {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-light);
  color: var(--color-text);
  user-select: none;
  white-space: nowrap;
}

.auth-pill.ok {
  border-color: var(--color-success);
}

.auth-pill.ok span {
  color: var(--color-success);
}

.auth-pill.warn {
  border-color: var(--color-warning);
}

.auth-pill.warn span:first-child {
  color: var(--color-error);
}

.pill-link {
  border: none;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0;
}

.pill-link:hover {
  text-decoration: underline;
}

.subtitle {
  margin: 0.5rem 0 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.notice {
  margin: 0.4rem 0 0;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.actions {
  margin-top: 1.25rem;
  display: flex;
  justify-content: flex-start;
  gap: 0.75rem;
}

.btn {
  padding: 0.6rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-light);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.btn:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-hover);
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-surface);
}

.tabs {
  margin-top: 1rem;
  margin-bottom: 0.75rem;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0.5rem;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 4px;
  flex: 0 0 auto;
  height: auto;
}

.scroll-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(147, 197, 253, 0.3) transparent;
}

.scroll-content::-webkit-scrollbar {
  width: 6px;
}

.scroll-content::-webkit-scrollbar-track {
  background: transparent;
}

.scroll-content::-webkit-scrollbar-thumb {
  background: rgba(147, 197, 253, 0.3);
  border-radius: 3px;
}

.scroll-content::-webkit-scrollbar-thumb:hover {
  background: rgba(147, 197, 253, 0.5);
}

.tab {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  font-size: 0.9rem;
}

.tab.active {
  background: var(--color-surface);
  border-color: var(--color-primary);
  color: var(--color-text);
}

.filters {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: 160px 1fr 160px auto;
  gap: 0.75rem;
  align-items: center;
}

.manage-bar {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.manage-title {
  font-weight: 700;
  color: var(--color-text);
}

.manage-meta {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.input {
  width: 100%;
  padding: 0.75rem 0.9rem;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
}

select.input {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2.5rem;
  cursor: pointer;
}

select.input option {
  background: var(--color-surface);
  color: var(--color-text);
  padding: 0.5rem;
}

.textarea {
  min-height: 84px;
  resize: vertical;
}

.loading {
  margin-top: 1.25rem;
  color: var(--color-text-secondary);
}

.empty {
  margin-top: 1.25rem;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
}

.item-list {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.item-card {
  padding: 1rem 1.1rem;
  border-radius: 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 180px;
  transition: all 0.2s ease;
}

.item-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-shrink: 0;
}

.item-title {
  font-weight: 700;
  font-size: 1rem;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  line-height: 1.4;
}

.item-type {
  font-size: 0.72rem;
  color: var(--color-primary);
  border: 1px solid rgba(147, 197, 253, 0.3);
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: rgba(147, 197, 253, 0.1);
  white-space: nowrap;
  flex-shrink: 0;
}

.item-desc {
  margin-top: 0.5rem;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  line-height: 1.5;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  flex-shrink: 0;
  min-height: 2.55em;
}

.item-meta {
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.8rem;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  overflow: hidden;
  flex-shrink: 0;
  max-height: 1.8em;
}

.item-meta span {
  white-space: nowrap;
}

.tags {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  overflow: hidden;
  max-height: 1.5rem;
  flex-shrink: 0;
}

.tag {
  font-size: 0.68rem;
  padding: 0.12rem 0.4rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-light);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.item-actions {
  margin-top: auto;
  padding-top: 0.6rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn.danger {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.btn.danger:hover {
  background: rgba(239, 68, 68, 0.18);
}

.pagination {
  margin-top: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-meta {
  display: flex;
  gap: 1rem;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.page-controls {
  display: flex;
  gap: 0.75rem;
}

.upload-locked {
  margin-top: 1.25rem;
  padding: 1rem 1.25rem;
  border-radius: 14px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
}

.upload-form {
  margin-top: 1.25rem;
  display: grid;
  gap: 0.9rem;
}

.form-row {
  display: grid;
  grid-template-columns: 110px minmax(300px, 600px);
  gap: 0.75rem;
  align-items: start;
}

.label {
  color: var(--color-text);
  font-weight: 700;
  font-size: 0.92rem;
  padding-top: 0.55rem;
}

.content-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  align-items: center;
}

.file-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.hint {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1600;
  padding: 18px;
}

.modal {
  width: min(760px, 100%);
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.1rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.05rem;
  color: var(--color-text);
}

.close-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface-light);
  color: var(--color-text-secondary);
  width: 32px;
  height: 32px;
  border-radius: 10px;
  cursor: pointer;
}

.modal-body {
  padding: 1.1rem;
  overflow: auto;
}

.modal-info {
  padding: 0.9rem 1rem;
  border-radius: 12px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
}

.modal-title {
  font-weight: 800;
  color: var(--color-text);
}

.modal-sub {
  margin-top: 0.45rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.modal-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.import-saves {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

@media (max-height: 720px) {
  .workshop-panel {
    padding: 14px;
  }
}

@media (max-height: 600px) {
  .workshop-panel {
    padding: 12px;
  }
}

@media (max-width: 768px) {
  .workshop-container {
    padding: 10px;
    padding-top: calc(10px + env(safe-area-inset-top));
    padding-bottom: calc(10px + env(safe-area-inset-bottom));
  }

  .workshop-panel { padding: 14px; }
  .tabs { gap: 0.25rem; padding: 3px; }
  .tab { padding: 0.5rem 0.4rem; font-size: 0.85rem; }
  .filters { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
  .label { padding-top: 0; }

  .item-list {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.75rem;
  }

  .item-card {
    min-height: 160px;
    padding: 0.85rem 1rem;
  }
}

@media (max-width: 480px) {
  .workshop-container {
    padding: 8px;
    padding-top: calc(8px + env(safe-area-inset-top));
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
  }

  .workshop-panel {
    padding: 12px;
  }

  .item-list {
    grid-template-columns: 1fr;
    gap: 0.6rem;
  }

  .item-card {
    min-height: auto;
    padding: 0.75rem 0.9rem;
  }

  .item-card:hover {
    transform: none;
  }

  .item-title {
    font-size: 0.95rem;
  }

  .item-desc {
    min-height: auto;
  }
}
</style>
