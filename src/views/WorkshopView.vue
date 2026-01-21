<template>
  <div class="workshop-container">
    <VideoBackground />

    <div class="workshop-panel">
      <!-- 顶部标题区域 - 增加层次感 -->
      <div class="header-section">
        <div class="header-bg"></div>
        <div class="header-content">
          <div class="title-row">
            <div class="title-group">
              <div class="title-icon-wrapper">
                <Store :size="20" />
              </div>
              <h2 class="title">创意工坊</h2>
            </div>
            <div v-if="backendReady" class="auth-pill" :class="{ ok: authState === 'authed', warn: authState !== 'authed' }">
              <CheckCircle v-if="authState === 'authed'" :size="14" />
              <AlertCircle v-else-if="authState === 'unauthed'" :size="14" />
              <Loader2 v-else :size="14" class="spin" />
              <span v-if="authState === 'checking'">检测中</span>
              <span v-else-if="authState === 'authed'">已验证</span>
              <span v-else>未验证</span>
              <button v-if="authState !== 'authed'" class="pill-link" @click="goLogin">去验证</button>
              <button class="pill-link" @click="refreshAuth">
                <RefreshCw :size="12" />
              </button>
            </div>
            <div v-else class="auth-pill warn">
              <AlertCircle :size="14" />
              <span>未配置后端</span>
            </div>
          </div>
          <p class="subtitle">分享设置、提示词、开局配置、存档</p>
          <p class="notice">
            <Info :size="12" />
            工坊内容仅对<strong>单机本地</strong>生效，联机模式由后端控制
          </p>
        </div>
      </div>

      <div v-if="!backendReady" class="backend-locked">
        <ServerOff :size="48" class="locked-icon" />
        <p>未配置后端服务器，创意工坊不可用</p>
        <div class="actions">
          <button class="btn btn-secondary" @click="goBack">
            <ArrowLeft :size="16" />
            返回
          </button>
        </div>
      </div>

      <template v-else>
      <div class="tabs">
        <button class="tab" :class="{ active: activeTab === 'browse' }" @click="switchTab('browse')">
          <Compass :size="16" />
          <span>浏览</span>
        </button>
        <button class="tab" :class="{ active: activeTab === 'mine' }" @click="switchTab('mine')">
          <User :size="16" />
          <span>我的发布</span>
        </button>
        <button class="tab" :class="{ active: activeTab === 'upload' }" @click="switchTab('upload')">
          <Upload :size="16" />
          <span>上传</span>
        </button>
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
          <div class="search-input-wrapper">
            <Search :size="14" class="search-icon" />
            <input v-model="query" class="input search-input" :placeholder="isMineTab ? '搜索标题 / 说明' : '搜索标题 / 作者 / 说明'" />
          </div>
          <select v-model.number="pageSize" class="input page-size-select">
            <option v-for="size in pageSizeOptions" :key="size" :value="size">
              每页 {{ size }} 个
            </option>
          </select>
          <button class="btn btn-icon-only" @click="refreshList" :disabled="loadingList" title="刷新">
            <RefreshCw :size="16" :class="{ spin: loadingList }" />
          </button>
        </div>

        <div v-if="isMineTab" class="manage-bar">
          <div class="manage-title">
            <Folder :size="16" />
            我的发布管理
          </div>
          <div class="manage-meta">仅显示自己发布的内容 · 共 {{ total }} 条</div>
        </div>

        <div v-if="loadingList" class="loading">
          <Loader2 :size="24" class="spin" />
          <span>加载中…</span>
        </div>
        <div v-else-if="items.length === 0" class="empty">
          <Package :size="40" class="empty-icon" />
          <p>暂无内容</p>
        </div>
        <div v-else class="item-list">
          <div
            v-for="item in items"
            :key="item.id"
            class="item-card"
            @click="openDetailModal(item)"
          >
            <div class="item-header">
              <div class="item-type-badge">
                <component :is="typeIcon[item.type]" :size="12" />
                {{ typeLabel[item.type] || item.type }}
              </div>
              <div class="item-stats">
                <span class="stat-item downloads" :title="`${item.downloads} 次下载`">
                  <Download :size="11" />
                  <span class="stat-value">{{ item.downloads }}</span>
                </span>
              </div>
            </div>
            <div class="item-title" :title="item.title">{{ item.title }}</div>
            <div v-if="item.description" class="item-desc">{{ item.description }}</div>
            <div class="item-meta">
              <span class="meta-author" :title="item.author_name">
                <UserCircle :size="12" />
                {{ item.author_name }}
              </span>
              <span v-if="item.game_version" class="meta-version">{{ item.game_version }}</span>
            </div>
            <div v-if="item.tags?.length" class="tags">
              <span v-for="t in item.tags" :key="t" class="tag">{{ t }}</span>
            </div>
            <div class="item-actions" @click.stop>
              <button class="btn btn-sm btn-primary" @click="openDownload(item.id)">
                <Download :size="14" />
                下载
              </button>
              <button v-if="isMineTab" class="btn btn-sm danger" @click="deleteItem(item)">
                <Trash2 :size="14" />
                删除
              </button>
            </div>
          </div>
        </div>

        <div v-if="totalPages > 1" class="pagination">
          <div class="page-meta">
            <span>共 {{ total }} 条</span>
            <span>第 {{ page }} / {{ totalPages }} 页</span>
          </div>
          <div class="page-controls">
            <button class="btn btn-secondary btn-sm" @click="goPrevPage" :disabled="page <= 1">
              <ChevronLeft :size="16" />
              上一页
            </button>
            <button class="btn btn-sm" @click="goNextPage" :disabled="page >= totalPages">
              下一页
              <ChevronRight :size="16" />
            </button>
          </div>
        </div>
      </div>

      <div v-else class="upload scroll-content">
        <div v-if="authState !== 'authed'" class="upload-locked">
          <Lock :size="32" class="locked-icon" />
          <p>上传需要先完成账号验证（用于标识作者与权限控制）</p>
          <div class="actions">
            <button class="btn btn-secondary" @click="goLogin">去验证</button>
            <button class="btn" @click="refreshAuth">
              <RefreshCw :size="14" />
              刷新
            </button>
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
                <Settings :size="14" />
                从本地读取设置
              </button>
              <button v-if="uploadType === 'prompts'" class="btn btn-secondary" @click="loadLocalPrompts">
                <FileText :size="14" />
                从本地导出提示词
              </button>
              <label class="file-btn btn btn-secondary">
                <File :size="14" />
                选择 JSON 文件
                <input type="file" accept=".json,application/json" @change="handleUploadFile" hidden />
              </label>
              <span class="hint" v-if="payloadHint">
                <CheckCircle :size="12" />
                {{ payloadHint }}
              </span>
            </div>
          </div>

          <div class="actions upload-actions">
            <button class="btn btn-secondary" @click="goBack">
              <ArrowLeft :size="16" />
              返回
            </button>
            <button class="btn btn-primary" @click="submitUpload" :disabled="uploading">
              <Upload :size="16" v-if="!uploading" />
              <Loader2 :size="16" class="spin" v-else />
              {{ uploading ? '上传中…' : '上传到工坊' }}
            </button>
          </div>
        </div>
      </div>

      </template>

      <!-- 底部返回按钮 -->
      <div v-if="backendReady && activeTab !== 'upload'" class="footer-actions">
        <button class="btn btn-secondary" @click="goBack">
          <ArrowLeft :size="16" />
          返回
        </button>
      </div>

    </div>


    <!-- 详情弹窗 -->
    <div v-if="detailModal.open" class="modal-overlay" @click.self="closeDetailModal">
      <div class="modal detail-modal">
        <div class="modal-header">
          <h3>
            <component :is="typeIcon[detailModal.item?.type || 'settings']" :size="18" />
            {{ detailModal.item?.title }}
          </h3>
          <button class="close-btn" @click="closeDetailModal">
            <X :size="18" />
          </button>
        </div>
        <div class="modal-body">
          <div class="detail-content">
            <div class="detail-row">
              <span class="detail-label">类型</span>
              <span class="detail-value">
                <span class="item-type-badge">
                  <component :is="typeIcon[detailModal.item?.type || 'settings']" :size="12" />
                  {{ typeLabel[detailModal.item?.type || ''] }}
                </span>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">作者</span>
              <span class="detail-value">
                <UserCircle :size="14" />
                {{ detailModal.item?.author_name }}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">下载次数</span>
              <span class="detail-value downloads-value">
                <Download :size="14" />
                {{ detailModal.item?.downloads }}
              </span>
            </div>
            <div v-if="detailModal.item?.game_version" class="detail-row">
              <span class="detail-label">游戏版本</span>
              <span class="detail-value">{{ detailModal.item?.game_version }}</span>
            </div>
            <div v-if="detailModal.item?.tags?.length" class="detail-row">
              <span class="detail-label">标签</span>
              <div class="detail-tags">
                <span v-for="t in detailModal.item?.tags" :key="t" class="tag">{{ t }}</span>
              </div>
            </div>
            <div v-if="detailModal.item?.description" class="detail-row desc-row">
              <span class="detail-label">说明</span>
              <p class="detail-desc">{{ detailModal.item?.description }}</p>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="closeDetailModal">关闭</button>
            <button class="btn btn-primary" @click="openDownloadFromDetail">
              <Download :size="16" />
              下载
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 下载/导入弹窗 -->
    <div v-if="downloadModal.open" class="modal-overlay" @click.self="closeDownloadModal">
      <div class="modal">
        <div class="modal-header">
          <h3>
            <Download :size="18" />
            下载内容
          </h3>
          <button class="close-btn" @click="closeDownloadModal">
            <X :size="18" />
          </button>
        </div>
        <div v-if="downloadModal.loading" class="modal-body loading-body">
          <Loader2 :size="24" class="spin" />
          <span>加载中…</span>
        </div>
        <div v-else class="modal-body">
          <div class="modal-info">
            <div class="modal-title">{{ downloadModal.item?.title }}</div>
            <div class="modal-sub">
              <span v-if="downloadModal.item">
                <component :is="typeIcon[downloadModal.item.type]" :size="12" />
                {{ typeLabel[downloadModal.item.type] || downloadModal.item.type }}
              </span>
              <span v-if="downloadModal.item?.author_name">
                <UserCircle :size="12" />
                {{ downloadModal.item.author_name }}
              </span>
              <span v-if="downloadModal.item?.game_version">{{ downloadModal.item.game_version }}</span>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" @click="downloadAsFile">
              <FileDown :size="16" />
              下载为文件
            </button>
            <button v-if="downloadModal.item?.type === 'settings'" class="btn btn-primary" @click="applySettingsFromPayload">
              <Import :size="16" />
              导入到本地设置
            </button>
            <button v-if="downloadModal.item?.type === 'prompts'" class="btn btn-primary" @click="applyPromptsFromPayload">
              <Import :size="16" />
              导入到本地提示词
            </button>
            <button v-if="downloadModal.item?.type === 'start_config'" class="btn btn-primary" @click="applyStartConfigFromPayload">
              <Import :size="16" />
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
            <button class="btn btn-primary" :disabled="!targetCharId" @click="applySavesFromPayload">
              <Import :size="16" />
              导入存档
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from 'vue';
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
import {
  Store, CheckCircle, AlertCircle, Loader2, RefreshCw, Info, ServerOff, ArrowLeft,
  Compass, User, Upload, Search, Folder, Package, Download, UserCircle, Trash2,
  ChevronLeft, ChevronRight, Lock, Settings, FileText, File, X, FileDown, Import,
  ScrollText, Save, PlayCircle
} from 'lucide-vue-next';

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

// 类型对应的图标
const typeIcon: Record<string, Component> = {
  settings: Settings,
  prompts: ScrollText,
  saves: Save,
  start_config: PlayCircle,
};

// 详情弹窗
const detailModal = ref<{
  open: boolean;
  item: WorkshopItemOut | null;
}>({
  open: false,
  item: null,
});

const openDetailModal = (item: WorkshopItemOut) => {
  detailModal.value.open = true;
  detailModal.value.item = item;
};

const closeDetailModal = () => {
  detailModal.value.open = false;
  detailModal.value.item = null;
};

const openDownloadFromDetail = () => {
  if (detailModal.value.item) {
    openDownload(detailModal.value.item.id);
    closeDetailModal();
  }
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
  align-items: center;
  justify-content: center;
  padding: 16px;
  padding-top: calc(16px + env(safe-area-inset-top));
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  overflow: hidden;
}

.workshop-panel {
  width: 100%;
  max-width: 960px;
  max-height: calc(100vh - 32px);
  max-height: calc(100svh - 32px);
  max-height: calc(100dvh - 32px);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 0;
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

/* 顶部标题区域 - 层次感设计 */
.header-section {
  flex: 0 0 auto;
  position: relative;
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(180deg,
    rgba(147, 197, 253, 0.08) 0%,
    rgba(147, 197, 253, 0.02) 50%,
    transparent 100%
  );
}

.header-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(147, 197, 253, 0.1) 0%, transparent 70%);
  pointer-events: none;
}

.header-content {
  position: relative;
  z-index: 1;
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
  gap: 0.65rem;
}

.title-icon-wrapper {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(147, 197, 253, 0.2) 0%, rgba(147, 197, 253, 0.1) 100%);
  border: 1px solid rgba(147, 197, 253, 0.3);
  color: var(--color-primary);
}

.title {
  margin: 0;
  font-family: var(--font-family-serif);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

.auth-pill {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  user-select: none;
  white-space: nowrap;
  font-size: 0.8rem;
}

.auth-pill.ok {
  border-color: rgba(16, 185, 129, 0.4);
  background: rgba(16, 185, 129, 0.08);
  color: #10b981;
}

.auth-pill.warn {
  border-color: rgba(251, 191, 36, 0.4);
  background: rgba(251, 191, 36, 0.08);
  color: #f59e0b;
}

.pill-link {
  border: none;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0.15rem 0.3rem;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: background 0.15s;
}

.pill-link:hover {
  background: rgba(147, 197, 253, 0.15);
}

.subtitle {
  margin: 0.5rem 0 0;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.notice {
  margin: 0.35rem 0 0;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

/* Tabs */
.tabs {
  flex: 0 0 auto;
  margin: 0.75rem 1.5rem 0;
  display: flex;
  gap: 0.35rem;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 4px;
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
}

.tab:hover {
  color: var(--color-text);
  background: rgba(147, 197, 253, 0.05);
}

.tab.active {
  background: var(--color-surface);
  border-color: rgba(147, 197, 253, 0.3);
  color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Content Area */
.scroll-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 0 1.5rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(147, 197, 253, 0.3) transparent;
}

.scroll-content::-webkit-scrollbar {
  width: 5px;
}

.scroll-content::-webkit-scrollbar-track {
  background: transparent;
}

.scroll-content::-webkit-scrollbar-thumb {
  background: rgba(147, 197, 253, 0.25);
  border-radius: 3px;
}

.scroll-content::-webkit-scrollbar-thumb:hover {
  background: rgba(147, 197, 253, 0.4);
}

/* Filters */
.filters {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.6rem;
  align-items: center;
  flex-wrap: wrap;
}

.filters > select.input {
  width: auto;
  min-width: 120px;
}

.search-input-wrapper {
  flex: 1;
  min-width: 180px;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-input {
  padding-left: 2.2rem;
}

.page-size-select {
  width: auto;
  min-width: 100px;
}

.btn-icon-only {
  padding: 0.55rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Manage Bar */
.manage-bar {
  margin-top: 0.75rem;
  padding: 0.6rem 0.9rem;
  border-radius: 10px;
  background: rgba(147, 197, 253, 0.06);
  border: 1px solid rgba(147, 197, 253, 0.15);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.manage-title {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.manage-meta {
  color: var(--color-text-muted);
  font-size: 0.78rem;
}

/* Input */
.input {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
  font-size: 0.85rem;
  transition: border-color 0.15s;
}

.input:focus {
  border-color: var(--color-primary);
}

select.input {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.6rem center;
  padding-right: 2rem;
  cursor: pointer;
}

select.input option {
  background: var(--color-surface);
  color: var(--color-text);
}

.textarea {
  min-height: 80px;
  resize: vertical;
}

/* Loading & Empty */
.loading {
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.empty {
  margin-top: 2rem;
  padding: 2rem;
  border-radius: 12px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  color: var(--color-text-muted);
}

.empty-icon {
  opacity: 0.4;
}

.locked-icon {
  opacity: 0.5;
  color: var(--color-text-muted);
}

/* Item List */
.item-list {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.75rem;
  padding-bottom: 0.5rem;
}

/* Item Card */
.item-card {
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 165px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.item-card:hover {
  border-color: rgba(147, 197, 253, 0.5);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.item-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--color-primary);
  border: 1px solid rgba(147, 197, 253, 0.3);
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: rgba(147, 197, 253, 0.08);
  white-space: nowrap;
}

.item-stats {
  display: flex;
  gap: 0.35rem;
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  background: transparent;
}

.stat-item.downloads {
  color: #10b981;
}

.stat-value {
  font-weight: 600;
}

.item-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.35;
  margin-bottom: 0.35rem;
  word-break: break-word;
}

.item-desc {
  color: var(--color-text-secondary);
  font-size: 0.78rem;
  line-height: 1.45;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 0.35rem;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.6rem;
  font-size: 0.72rem;
  margin-bottom: 0.35rem;
}

.meta-author {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--color-text-muted);
}

.meta-version {
  color: var(--color-text-muted);
  opacity: 0.7;
  font-size: 0.68rem;
}

.tags {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
  overflow: hidden;
  max-height: 1.4rem;
  margin-bottom: 0.35rem;
}

.tag {
  font-size: 0.65rem;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-light);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.item-actions {
  margin-top: auto;
  padding-top: 0.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.4rem;
}

/* Buttons */
.btn {
  padding: 0.5rem 0.85rem;
  border-radius: 7px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-light);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.82rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.btn:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-hover);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 0.35rem 0.65rem;
  font-size: 0.78rem;
}

.btn-secondary {
  background: var(--color-surface);
}

.btn-primary {
  background: linear-gradient(135deg, rgba(147, 197, 253, 0.15) 0%, rgba(147, 197, 253, 0.08) 100%);
  border-color: rgba(147, 197, 253, 0.4);
  color: var(--color-primary);
}

.btn-primary:hover {
  background: linear-gradient(135deg, rgba(147, 197, 253, 0.25) 0%, rgba(147, 197, 253, 0.15) 100%);
  border-color: rgba(147, 197, 253, 0.5);
}

.btn.danger {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
}

.btn.danger:hover {
  background: rgba(239, 68, 68, 0.15);
}

/* Pagination */
.pagination {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.page-meta {
  display: flex;
  gap: 0.75rem;
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.page-controls {
  display: flex;
  gap: 0.5rem;
}

/* Upload */
.upload-locked {
  margin-top: 2rem;
  padding: 2rem;
  border-radius: 12px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.upload-form {
  margin-top: 1rem;
  display: grid;
  gap: 0.8rem;
}

.form-row {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  gap: 0.6rem;
  align-items: start;
}

.label {
  color: var(--color-text);
  font-weight: 600;
  font-size: 0.82rem;
  padding-top: 0.5rem;
}

.content-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.file-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.hint {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: #10b981;
  font-size: 0.8rem;
}

.actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-start;
  gap: 0.6rem;
}

.upload-actions {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
}

/* Footer */
.footer-actions {
  flex: 0 0 auto;
  padding: 0.75rem 1.5rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-light);
}

.backend-locked {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
  color: var(--color-text-secondary);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1600;
  padding: 16px;
}

.modal {
  width: min(640px, 100%);
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
}

.detail-modal {
  width: min(520px, 100%);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(180deg, rgba(147, 197, 253, 0.05) 0%, transparent 100%);
}

.modal-header h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  width: 30px;
  height: 30px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}

.close-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.modal-body {
  padding: 1rem;
  overflow: auto;
}

.loading-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.modal-info {
  padding: 0.8rem 0.9rem;
  border-radius: 10px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
}

.modal-title {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.95rem;
}

.modal-sub {
  margin-top: 0.4rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.modal-sub span {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.modal-actions {
  margin-top: 0.9rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.import-saves {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

/* Detail Modal */
.detail-content {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.detail-label {
  flex: 0 0 70px;
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.detail-value {
  flex: 1;
  color: var(--color-text);
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.downloads-value {
  color: #10b981;
  font-weight: 600;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.desc-row {
  flex-direction: column;
  gap: 0.4rem;
}

.detail-desc {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Animation */
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Media Queries */
@media (max-height: 700px) {
  .header-section {
    padding: 1rem 1.25rem 0.75rem;
  }

  .title-icon-wrapper {
    width: 32px;
    height: 32px;
  }

  .title {
    font-size: 1.2rem;
  }
}

@media (max-width: 768px) {
  .workshop-container {
    padding: 10px;
    padding-top: calc(10px + env(safe-area-inset-top));
    padding-bottom: calc(10px + env(safe-area-inset-bottom));
  }

  .header-section {
    padding: 1rem 1rem 0.75rem;
  }

  .tabs {
    margin: 0.6rem 1rem 0;
  }

  .scroll-content {
    padding: 0 1rem;
  }

  .footer-actions {
    padding: 0.6rem 1rem;
  }

  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .filters > select.input,
  .page-size-select {
    width: 100%;
  }

  .search-input-wrapper {
    width: 100%;
  }

  .btn-icon-only {
    width: 100%;
    justify-content: center;
  }

  .item-list {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.6rem;
  }

  .item-card {
    min-height: 150px;
    padding: 0.75rem 0.85rem;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 0.3rem;
  }

  .label {
    padding-top: 0;
  }

  .upload-actions {
    flex-direction: column-reverse;
    gap: 0.5rem;
  }

  .upload-actions .btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .workshop-container {
    padding: 8px;
    padding-top: calc(8px + env(safe-area-inset-top));
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
  }

  .workshop-panel {
    border-radius: 12px;
  }

  .header-section {
    padding: 0.85rem 0.85rem 0.65rem;
  }

  .title-row {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .auth-pill {
    font-size: 0.72rem;
    padding: 0.25rem 0.5rem;
  }

  .tabs {
    margin: 0.5rem 0.85rem 0;
  }

  .tab {
    padding: 0.4rem 0.5rem;
    font-size: 0.78rem;
  }

  .tab span {
    display: none;
  }

  .scroll-content {
    padding: 0 0.85rem;
  }

  .footer-actions {
    padding: 0.5rem 0.85rem;
  }

  .item-list {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .item-card {
    min-height: auto;
    padding: 0.7rem 0.8rem;
  }

  .item-card:hover {
    transform: none;
  }

  .item-title {
    font-size: 0.9rem;
    -webkit-line-clamp: 2;
  }

  .item-desc {
    -webkit-line-clamp: 2;
  }
}
</style>
