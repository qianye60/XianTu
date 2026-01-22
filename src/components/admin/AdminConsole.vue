<template>
  <div class="admin-console" :class="{ fullscreen: !embedded }">
    <div class="admin-panel">
      <div class="admin-header">
        <div class="admin-title-row">
          <div class="admin-title-left">
            <h2 class="admin-title">后端管理</h2>
            <span class="status" :class="{ ok: backendReady && isAdmin, warn: !backendReady || !isAdmin }">
              {{ statusText }}
            </span>
          </div>
          <div class="admin-header-actions">
            <button class="btn btn-secondary sm" @click="goBack">返回</button>
            <button v-if="backendReady && isAdmin" class="btn btn-secondary sm" @click="logout">退出</button>
          </div>
        </div>
        <p class="admin-subtitle">世界/出身/天赋/天资/灵根 与 联机数据管理</p>
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
          <div class="admin-layout">
            <AdminSidebar
              :groups="tabGroups"
              :active-tab="activeTab"
              :busy="isBusy"
              @select="setActiveTab"
              @refresh="refreshActive"
            />

            <section class="admin-main">
              <div class="main-head">
                <div class="main-title">{{ tabLabel }}</div>
                <div class="main-actions">
                  <button class="btn btn-secondary sm" :disabled="isBusy" @click="refreshActive">刷新</button>
                </div>
              </div>

              <div class="main-scroll">
                <AdminSavesSection
                  ref="savesRef"
                  :active="activeTab === 'saves'"
                  :busy="isBusy"
                  :set-busy="setBusy"
                />
                <AdminPlayersSection
                  ref="playersRef"
                  :active="activeTab === 'online'"
                  :busy="isBusy"
                  :set-busy="setBusy"
                  :is-super-admin="isSuperAdmin"
                />
                <AdminCharactersSection
                  ref="charactersRef"
                  :active="activeTab === 'characters'"
                  :busy="isBusy"
                />
                <AdminBanSection
                  ref="banRef"
                  :active="activeTab === 'ban_records'"
                  :busy="isBusy"
                  :set-busy="setBusy"
                />
                <AdminAppealsSection
                  ref="appealsRef"
                  :active="activeTab === 'appeals'"
                  :busy="isBusy"
                  :set-busy="setBusy"
                />
                <AdminAdminsSection
                  ref="adminsRef"
                  :active="activeTab === 'admins'"
                  :busy="isBusy"
                  :set-busy="setBusy"
                  :is-super-admin="isSuperAdmin"
                  :current-admin-id="adminMe?.id ?? null"
                />
                <AdminCrudSection
                  v-if="isCrudTab"
                  ref="crudRef"
                  :active="isCrudTab"
                  :busy="isBusy"
                  :set-busy="setBusy"
                  :title="tabLabel"
                  :path="crudPath"
                />
                <AdminRulesSection
                  ref="rulesRef"
                  :active="activeTab === 'rules'"
                  :busy="isBusy"
                  :set-busy="setBusy"
                />
                <AdminCodesSection
                  ref="codesRef"
                  :active="activeTab === 'codes'"
                  :busy="isBusy"
                  :set-busy="setBusy"
                />
                <AdminWorkshopSection
                  ref="workshopRef"
                  :active="activeTab === 'workshop'"
                  :busy="isBusy"
                  :set-busy="setBusy"
                />
                <AdminSystemSection
                  ref="systemRef"
                  :active="activeTab === 'system'"
                  :busy="isBusy"
                  :set-busy="setBusy"
                  :is-super-admin="isSuperAdmin"
                />
              </div>
            </section>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AdminSidebar from '@/components/admin/AdminSidebar.vue';
import AdminSavesSection from '@/components/admin/sections/AdminSavesSection.vue';
import AdminPlayersSection from '@/components/admin/sections/AdminPlayersSection.vue';
import AdminCharactersSection from '@/components/admin/sections/AdminCharactersSection.vue';
import AdminBanSection from '@/components/admin/sections/AdminBanSection.vue';
import AdminAppealsSection from '@/components/admin/sections/AdminAppealsSection.vue';
import AdminAdminsSection from '@/components/admin/sections/AdminAdminsSection.vue';
import AdminCrudSection from '@/components/admin/sections/AdminCrudSection.vue';
import AdminRulesSection from '@/components/admin/sections/AdminRulesSection.vue';
import AdminCodesSection from '@/components/admin/sections/AdminCodesSection.vue';
import AdminWorkshopSection from '@/components/admin/sections/AdminWorkshopSection.vue';
import AdminSystemSection from '@/components/admin/sections/AdminSystemSection.vue';
import { toast } from '@/utils/toast';
import { adminRequest } from '@/services/adminRequest';
import { fetchBackendVersion, isBackendConfigured } from '@/services/backendConfig';

const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false
});

const router = useRouter();

const backendConfigured = ref(isBackendConfigured());
const backendReady = ref(false);
const adminMe = ref<{ id: number; user_name: string; role?: string } | null>(null);
const adminToken = computed(() => localStorage.getItem('admin_access_token') || '');
const isAdmin = computed(() => !!adminMe.value);
const isSuperAdmin = computed(() => adminMe.value?.role === 'super_admin');

const statusText = computed(() => {
  if (!backendReady.value) return '后端不可用';
  if (isAdmin.value) return isSuperAdmin.value ? '超级仙官' : '仙官权限';
  if (adminToken.value) return '令牌失效/无权限';
  return '未登录';
});

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
  { id: 'rules', label: '核心规则', group: '开局配置' },
  { id: 'codes', label: '兑换码', group: '其他' },
  { id: 'workshop', label: '创意工坊', group: '其他' },
  { id: 'system', label: '系统设置', group: '其他' }
 ] as const;

type TabId = (typeof allTabs)[number]['id'];

const tabGroups = [
  { label: '数据管理', tabs: allTabs.filter(t => t.group === '数据管理') },
  { label: '用户管理', tabs: allTabs.filter(t => t.group === '用户管理') },
  { label: '开局配置', tabs: allTabs.filter(t => t.group === '开局配置') },
  { label: '其他', tabs: allTabs.filter(t => t.group === '其他') }
];

const activeTab = ref<TabId>('saves');
const tabLabel = computed(() => allTabs.find(t => t.id === activeTab.value)?.label || '管理');

const busyCount = ref(0);
const isBusy = computed(() => busyCount.value > 0);
const setBusy = (next: boolean) => {
  busyCount.value += next ? 1 : -1;
  if (busyCount.value < 0) busyCount.value = 0;
};

const crudTabSet = new Set<TabId>(['worlds', 'origins', 'talents', 'talent_tiers', 'spirit_roots']);
const isCrudTab = computed(() => crudTabSet.has(activeTab.value));
const crudPath = computed(() => {
  switch (activeTab.value) {
    case 'worlds': return '/api/v1/worlds/';
    case 'origins': return '/api/v1/origins/';
    case 'talents': return '/api/v1/talents/';
    case 'talent_tiers': return '/api/v1/talent_tiers/';
    case 'spirit_roots': return '/api/v1/spirit_roots/';
    default: return '';
  }
});

const savesRef = ref<{ refresh: () => void } | null>(null);
const playersRef = ref<{ refresh: () => void } | null>(null);
const charactersRef = ref<{ refresh: () => void } | null>(null);
const banRef = ref<{ refresh: () => void } | null>(null);
const appealsRef = ref<{ refresh: () => void } | null>(null);
const adminsRef = ref<{ refresh: () => void } | null>(null);
const crudRef = ref<{ refresh: () => void } | null>(null);
const rulesRef = ref<{ refresh: () => void } | null>(null);
const codesRef = ref<{ refresh: () => void } | null>(null);
const workshopRef = ref<{ refresh: () => void } | null>(null);
const systemRef = ref<{ refresh: () => void } | null>(null);

const refreshActive = () => {
  switch (activeTab.value) {
    case 'saves':
      savesRef.value?.refresh();
      break;
    case 'online':
      playersRef.value?.refresh();
      break;
    case 'characters':
      charactersRef.value?.refresh();
      break;
    case 'ban_records':
      banRef.value?.refresh();
      break;
    case 'appeals':
      appealsRef.value?.refresh();
      break;
    case 'admins':
      adminsRef.value?.refresh();
      break;
    case 'codes':
      codesRef.value?.refresh();
      break;
    case 'workshop':
      workshopRef.value?.refresh();
      break;
    case 'system':
      systemRef.value?.refresh();
      break;
    case 'rules':
      rulesRef.value?.refresh();
      break;
    default:
      if (crudTabSet.has(activeTab.value)) crudRef.value?.refresh();
      break;
  }
};

const setActiveTab = (tabId: string) => {
  if (activeTab.value === tabId) return;
  activeTab.value = tabId as TabId;
};

const checkBackend = async () => {
  backendConfigured.value = isBackendConfigured();
  if (!backendConfigured.value) {
    backendReady.value = false;
    return;
  }
  const version = await fetchBackendVersion();
  backendReady.value = !!version;
  if (!backendReady.value) {
    toast.error('后端连接失败');
  }
};

const ensureAdmin = async () => {
  if (!adminToken.value) {
    adminMe.value = null;
    return;
  }
  try {
    adminMe.value = await adminRequest.get<{ id: number; user_name: string; role?: string }>('/api/v1/admin/me');
    localStorage.setItem('is_admin', 'true');
  } catch {
    adminMe.value = null;
    localStorage.removeItem('is_admin');
    localStorage.removeItem('admin_access_token');
  }
};

const goBack = () => {
  if (props.embedded) {
    router.push('/game');
  } else {
    router.push('/');
  }
};
const goLogin = () => router.push('/login');

const logout = () => {
  localStorage.removeItem('is_admin');
  localStorage.removeItem('admin_access_token');
  adminMe.value = null;
  toast.info('已退出登录');
  router.push('/login');
};

onMounted(async () => {
  await checkBackend();
  if (!backendReady.value) return;
  await ensureAdmin();
});
</script>

<style src="./adminStyles.css"></style>
