<template>
  <div class="workshop-container">
    <VideoBackground />

    <div class="workshop-panel">
      <div class="header">
        <div class="title-row">
          <h2 class="title">创意工坊</h2>
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
        <p class="subtitle">用于玩家之间上传/分享：设置、提示词、开局配置、存档等内容</p>
        <p class="notice">
          说明：创意工坊内容只对<strong>单机本地</strong>生效；联机模式的数据由后端权威控制（用于防作弊），不会被工坊内容覆盖。
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
        <button class="tab" :class="{ active: activeTab === 'browse' }" @click="activeTab = 'browse'">浏览</button>
        <button class="tab" :class="{ active: activeTab === 'upload' }" @click="activeTab = 'upload'">上传</button>
      </div>

      <div v-if="activeTab === 'browse'" class="browse">
        <div class="filters">
          <select v-model="filterType" class="input">
            <option value="">全部类型</option>
            <option value="settings">设置</option>
            <option value="prompts">提示词</option>
            <option value="saves">单机存档</option>
            <option value="start_config">开局配置</option>
          </select>
          <input v-model="query" class="input" placeholder="搜索标题 / 作者 / 说明" />
          <button class="btn btn-secondary" @click="refreshList" :disabled="loadingList">刷新</button>
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
              <button class="btn" @click="openDownload(item.id)">下载</button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="upload">
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

      <div class="actions">
        <button class="btn btn-secondary" @click="goBack">返回</button>
        <button class="btn" @click="activeTab = 'upload'">去上传</button>
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
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import VideoBackground from '@/components/common/VideoBackground.vue';
import { verifyStoredToken } from '@/services/request';
import { toast } from '@/utils/toast';
import { promptStorage } from '@/services/promptStorage';
import { createWorkshopItem, downloadWorkshopItem, listWorkshopItems, type WorkshopItemOut, type WorkshopItemType } from '@/services/workshop';
import { useCharacterStore } from '@/stores/characterStore';
import { fetchBackendVersion, isBackendConfigured } from '@/services/backendConfig';

const router = useRouter();
const characterStore = useCharacterStore();

const backendReady = ref(isBackendConfigured());
const appVersion = ref(APP_VERSION);

const authState = ref<'checking' | 'authed' | 'unauthed'>('checking');
const activeTab = ref<'browse' | 'upload'>('browse');

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
  } catch (_e) {
    authState.value = 'unauthed';
  }
};

onMounted(async () => {
  if (!backendReady.value) return;
  const backendVersion = await fetchBackendVersion();
  if (backendVersion) {
    appVersion.value = backendVersion;
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

// --- 浏览 ---
const filterType = ref<WorkshopItemType | ''>('');
const query = ref('');
const items = ref<WorkshopItemOut[]>([]);
const loadingList = ref(false);

const refreshList = async () => {
  if (!backendReady.value) {
    items.value = [];
    return;
  }
  loadingList.value = true;
  try {
    const res = await listWorkshopItems({ type: filterType.value, q: query.value, page: 1, pageSize: 20 });
    items.value = res.items || [];
  } catch (_e) {
    items.value = [];
  } finally {
    loadingList.value = false;
  }
};

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
  } catch (_e) {
    closeDownloadModal();
  } finally {
    downloadModal.value.loading = false;
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
  const settings = payload?.settings ?? payload;
  if (!settings || typeof settings !== 'object') {
    toast.error('设置内容格式不正确');
    return;
  }
  localStorage.setItem('dad_game_settings', JSON.stringify(settings));
  toast.success('已导入本地设置（如未生效请刷新页面）');
};

const applyPromptsFromPayload = async () => {
  const payload = downloadModal.value.payload as any;
  if (!payload || typeof payload !== 'object') {
    toast.error('提示词内容格式不正确');
    return;
  }
  const count = await promptStorage.importPrompts(payload);
  toast.success(`已导入 ${count} 条提示词（如未生效请刷新页面）`);
};

const localCharacters = computed(() => {
  const list = (characterStore.allCharacterProfiles as any[]) || [];
  return list
    .filter((c: any) => c?.模式 === '单机')
    .map((c: any) => ({
      角色ID: c.角色ID,
      name: c?.角色基础信息?.名字 || c.角色ID,
    }));
});

const applySavesFromPayload = async () => {
  if (!targetCharId.value) return;
  const payload = downloadModal.value.payload as any;
  if (payload?.type !== 'saves' || !Array.isArray(payload.saves)) {
    toast.error('存档内容格式不正确');
    return;
  }
  for (const save of payload.saves) {
    await characterStore.importSave(targetCharId.value, save);
  }
  toast.success(`已导入 ${payload.saves.length} 个存档到本地单机角色`);
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
  } catch (_err) {
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
      exportInfo: { timestamp: new Date().toISOString(), version: appVersion.value, gameVersion: `仙途 v${appVersion.value}` },
    };
    payloadHint.value = '已从本地读取 dad_game_settings';
    if (!uploadTitle.value) uploadTitle.value = `设置-${appVersion.value}`;
  } catch (_e) {
    toast.error('读取本地设置失败');
  }
};

const loadLocalPrompts = async () => {
  try {
    const data = await promptStorage.exportAll();
    uploadPayload.value = data;
    payloadHint.value = '已从本地导出提示词';
    if (!uploadTitle.value) uploadTitle.value = `提示词-${appVersion.value}`;
  } catch (_e) {
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

  if (uploadType.value === 'saves') {
    const payload = uploadPayload.value as any;
    if (payload?.type !== 'saves' || !Array.isArray(payload.saves)) {
      toast.error('单机存档必须使用游戏导出的存档文件（type=saves）');
      return;
    }
  }

  uploading.value = true;
  try {
    await createWorkshopItem({
      type: uploadType.value,
      title,
      description: uploadDesc.value.trim() || undefined,
      tags: parseTags(uploadTagsText.value),
      payload: uploadPayload.value,
      game_version: `仙途 v${appVersion.value}`,
      data_version: '1',
    });
    toast.success('上传成功');
    uploadTitle.value = '';
    uploadDesc.value = '';
    uploadTagsText.value = '';
    uploadPayload.value = null;
    payloadHint.value = '';
    activeTab.value = 'browse';
    await refreshList();
  } catch (_e) {
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
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  box-sizing: border-box;
  overflow: auto;
}

.workshop-panel {
  width: 100%;
  max-width: 720px;
  background: var(--mode-selection-bg, rgba(15, 23, 42, 0.75));
  border: 1px solid var(--mode-selection-border, rgba(255, 255, 255, 0.08));
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 2.5rem;
  color: var(--mode-selection-text, #e2e8f0);
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.title {
  margin: 0;
  font-family: var(--font-family-serif);
  font-size: 2rem;
  color: var(--mode-selection-accent, #93c5fd);
}

.auth-pill {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(30, 41, 59, 0.50);
  color: #e2e8f0;
  user-select: none;
  white-space: nowrap;
}

.auth-pill.ok {
  border-color: rgba(34, 197, 94, 0.30);
}

.auth-pill.warn {
  border-color: rgba(251, 191, 36, 0.25);
}

.pill-link {
  border: none;
  background: transparent;
  color: var(--mode-selection-accent, #93c5fd);
  cursor: pointer;
  padding: 0;
}

.pill-link:hover {
  text-decoration: underline;
}

.subtitle {
  margin: 0.75rem 0 0;
  color: var(--mode-selection-subtitle, #94a3b8);
  line-height: 1.6;
}

.notice {
  margin: 0.6rem 0 0;
  color: rgba(148, 163, 184, 0.9);
  font-size: 0.92rem;
  line-height: 1.6;
}

.actions {
  margin-top: 2rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.btn {
  flex: 1;
  padding: 0.9rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--mode-selection-card-border, rgba(255, 255, 255, 0.08));
  background: rgba(51, 65, 85, 0.7);
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:hover {
  background: rgba(51, 65, 85, 0.9);
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(30, 41, 59, 0.6);
}

.tabs {
  margin-top: 1.25rem;
  display: flex;
  gap: 0.75rem;
  background: rgba(30, 41, 59, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 6px;
}

.tab {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(226, 232, 240, 0.85);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab.active {
  background: rgba(51, 65, 85, 0.75);
  border-color: rgba(147, 197, 253, 0.22);
  color: #e2e8f0;
}

.filters {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: 160px 1fr auto;
  gap: 0.75rem;
}

.input {
  width: 100%;
  padding: 0.75rem 0.9rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(15, 23, 42, 0.35);
  color: #e2e8f0;
  outline: none;
}

.textarea {
  min-height: 84px;
  resize: vertical;
}

.loading {
  margin-top: 1.25rem;
  color: rgba(148, 163, 184, 0.9);
}

.empty {
  margin-top: 1.25rem;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  background: rgba(30, 41, 59, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.item-list {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.9rem;
}

.item-card {
  padding: 1rem 1.1rem;
  border-radius: 14px;
  background: var(--mode-selection-card-bg, rgba(30, 41, 59, 0.45));
  border: 1px solid var(--mode-selection-card-border, rgba(255, 255, 255, 0.06));
}

.item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.item-title {
  font-weight: 800;
  font-size: 1.05rem;
  color: #e2e8f0;
}

.item-type {
  font-size: 0.85rem;
  color: rgba(148, 163, 184, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.10);
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.35);
  white-space: nowrap;
}

.item-desc {
  margin-top: 0.5rem;
  color: rgba(148, 163, 184, 0.95);
  line-height: 1.6;
}

.item-meta {
  margin-top: 0.6rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  color: rgba(148, 163, 184, 0.9);
  font-size: 0.9rem;
}

.tags {
  margin-top: 0.6rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  font-size: 0.8rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(15, 23, 42, 0.35);
  color: rgba(226, 232, 240, 0.85);
}

.item-actions {
  margin-top: 0.9rem;
  display: flex;
  justify-content: flex-end;
}

.upload-locked {
  margin-top: 1.25rem;
  padding: 1rem 1.25rem;
  border-radius: 14px;
  background: rgba(30, 41, 59, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.upload-form {
  margin-top: 1.25rem;
  display: grid;
  gap: 0.9rem;
}

.form-row {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 0.75rem;
  align-items: start;
}

.label {
  color: rgba(226, 232, 240, 0.85);
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
  color: rgba(148, 163, 184, 0.9);
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
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.10);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.05rem;
  color: #e2e8f0;
}

.close-btn {
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(15, 23, 42, 0.55);
  color: rgba(226, 232, 240, 0.9);
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
  background: rgba(30, 41, 59, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.modal-title {
  font-weight: 800;
  color: #e2e8f0;
}

.modal-sub {
  margin-top: 0.45rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  color: rgba(148, 163, 184, 0.9);
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
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

@media (max-width: 768px) {
  .workshop-panel { padding: 2rem 1.5rem; }
  .filters { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
  .label { padding-top: 0; }
}
</style>
