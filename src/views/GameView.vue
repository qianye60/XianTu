<template>
  <div class="game-view gm-view" :class="{ 'is-mobile': isMobile }">
    <TopBar @toggle-status="rightSidebarCollapsed = !rightSidebarCollapsed" />

    <div v-if="isDataReady" class="shell" :class="{ 'panel-open': isPanelOpen }">
      <aside class="side side-nav" :class="{ collapsed: leftSidebarCollapsed }">
        <LeftSidebar />
      </aside>

      <div
        v-if="isMobile && (!leftSidebarCollapsed || !rightSidebarCollapsed)"
        class="scrim"
        @click="closeSidebars"
      ></div>

      <button
        type="button"
        class="edge-toggle left"
        :class="{ collapsed: leftSidebarCollapsed }"
        :aria-label="leftSidebarCollapsed ? $t('展开功能栏') : $t('收起功能栏')"
        :title="leftSidebarCollapsed ? $t('展开功能栏') : $t('收起功能栏')"
        @click="leftSidebarCollapsed = !leftSidebarCollapsed"
      >
        <template v-if="leftSidebarCollapsed">
          <span class="edge-label">{{ $t('功能') }}</span>
          <ChevronRight :size="15" />
        </template>
        <ChevronLeft v-else :size="15" />
      </button>

      <main class="stage">
        <section v-if="isPanelOpen && !uiStore.showCharacterManagement" class="sheet" :aria-label="$t(currentPanelTitle)">
          <header class="sheet-head">
            <button type="button" class="sheet-back" :title="$t('返回正文')" @click="closePanel">
              <ArrowLeft :size="16" />
              <span>{{ $t('返回') }}</span>
            </button>
            <span class="sheet-sep" aria-hidden="true"></span>
            <span class="sheet-icon" aria-hidden="true"><component :is="currentPanelIcon" :size="17" :stroke-width="1.75" /></span>
            <div class="sheet-heading">
              <h2 class="sheet-title">{{ $t(currentPanelTitle) }}</h2>
              <p v-if="currentPanelDesc" class="sheet-desc">{{ $t(currentPanelDesc) }}</p>
            </div>
            <div class="sheet-tools">
              <button
                v-for="btn in currentPanelActions"
                :key="btn.key"
                type="button"
                class="cc-btn small"
                :class="{ primary: btn.primary, danger: btn.danger }"
                :title="$t(btn.title)"
                :aria-label="$t(btn.title)"
                :disabled="btn.disabled || btn.busy"
                @click="btn.onClick()"
              >
                <Loader2 v-if="btn.busy" :size="14" class="cc-spin" />
                <component :is="btn.icon" v-else-if="btn.icon" :size="14" />
                <span>{{ $t(btn.title) }}</span>
              </button>
            </div>
          </header>
          <div class="sheet-body">
            <router-view v-slot="{ Component }">
              <keep-alive>
                <component :is="Component" />
              </keep-alive>
            </router-view>
          </div>
        </section>

        <router-view v-else-if="!uiStore.showCharacterManagement" v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>

        <section v-if="uiStore.showCharacterManagement" class="sheet" :aria-label="$t('角色管理')">
          <header class="sheet-head">
            <button type="button" class="sheet-back" @click="uiStore.closeCharacterManagement()">
              <ArrowLeft :size="16" />
              <span>{{ $t('返回') }}</span>
            </button>
            <span class="sheet-sep" aria-hidden="true"></span>
            <div class="sheet-heading">
              <h2 class="sheet-title">{{ $t('角色管理') }}</h2>
            </div>
            <div class="sheet-tools"></div>
          </header>
          <div class="sheet-body">
            <CharacterManagement @back="uiStore.closeCharacterManagement" />
          </div>
        </section>
      </main>

      <button
        type="button"
        class="edge-toggle right"
        :class="{ collapsed: rightSidebarCollapsed }"
        :aria-label="rightSidebarCollapsed ? $t('展开状态栏') : $t('收起状态栏')"
        :title="rightSidebarCollapsed ? $t('展开状态栏') : $t('收起状态栏')"
        @click="rightSidebarCollapsed = !rightSidebarCollapsed"
      >
        <template v-if="rightSidebarCollapsed">
          <ChevronLeft :size="15" />
          <span class="edge-label">{{ $t('状态') }}</span>
        </template>
        <ChevronRight v-else :size="15" />
      </button>

      <aside v-show="!isPanelOpen" class="side side-status" :class="{ collapsed: rightSidebarCollapsed }">
        <ErrorBoundary>
          <RightSidebar />
        </ErrorBoundary>
      </aside>
    </div>

    <div v-else class="boot">
      <div class="boot-card">
        <div class="boot-seal" aria-hidden="true"><span>道</span></div>
        <h2 class="boot-title">{{ $t('道法自然，天地初开') }}</h2>
        <p class="boot-msg">{{ $t('正在加载修仙世界...') }}</p>
        <ol class="boot-steps">
          <li class="done"><Check :size="15" />{{ $t('连接天道') }}</li>
          <li class="done"><Check :size="15" />{{ $t('加载角色数据') }}</li>
          <li class="active"><Loader2 :size="15" class="cc-spin" />{{ $t('读取存档信息') }}</li>
        </ol>
        <p class="boot-hint">{{ $t('提示：请在左侧菜单选择角色并加载存档') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useCharacterStore } from '@/stores/characterStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useUIStore } from '@/stores/uiStore';
import { useRouter, useRoute } from 'vue-router';
import { Package, User, Brain, Users, BookOpen, Zap, Settings, Save, Map, Scroll, Bell, Home, Box, Database, FileText, Plug, Hammer, Shield, BadgeCheck, ChevronLeft, ChevronRight, ArrowLeft, Check, Loader2, Images } from 'lucide-vue-next';
import { useCurrentPageActions } from '@/composables/usePageActions';
import { applyUIScale } from '@/utils/readingPrefs';
import { detectSectMigration } from '@/utils/sectMigration';
import TopBar from '@/components/dashboard/TopBar.vue'
import LeftSidebar from '@/components/dashboard/LeftSidebar.vue'
import RightSidebar from '@/components/dashboard/RightSidebar.vue'
import MainGamePanel from '@/components/dashboard/MainGamePanel.vue'
import CharacterManagement from '@/components/character-creation/CharacterManagement.vue';
import ErrorBoundary from '@/components/common/ErrorBoundary.vue';
import SectMigrationModal from '@/components/dashboard/components/SectMigrationModal.vue';

const characterStore = useCharacterStore();
const gameStateStore = useGameStateStore();
const uiStore = useUIStore();
const router = useRouter();
const route = useRoute();

// 侧边栏收缩状态
const leftSidebarCollapsed = ref(false);
const rightSidebarCollapsed = ref(false);

// 移动端适配
const isMobile = ref(false);

// 检测设备并设置初始状态
const checkDeviceAndSetup = () => {
  isMobile.value = window.innerWidth <= 768;

  // 移动端默认收缩侧边栏
  if (isMobile.value) {
    leftSidebarCollapsed.value = true;
    rightSidebarCollapsed.value = true;
  }
};

const closeSidebars = () => {
  leftSidebarCollapsed.value = true;
  rightSidebarCollapsed.value = true;
};

const lastMigrationPromptKey = ref<string | null>(null);

const getActiveSaveKey = () => {
  const active = characterStore.rootState.当前激活存档;
  if (!active) return null;
  return `${active.角色ID}::${active.存档槽位}`;
};

const maybePromptSectMigration = () => {
  if (!gameStateStore.isGameLoaded) return;
  const saveKey = getActiveSaveKey();
  if (!saveKey || lastMigrationPromptKey.value === saveKey) return;

  const saveData = gameStateStore.getCurrentSaveData();
  const check = detectSectMigration(saveData);
  if (!check.needed) {
    return;
  }

  lastMigrationPromptKey.value = saveKey;
  uiStore.showDetailModal({
    title: '宗门存档迁移',
    component: SectMigrationModal,
    props: {
      reasons: check.reasons,
      fromVersion: check.fromVersion,
      toVersion: check.toVersion,
    }
  });
};

// 面板状态管理
const panelRoutes = new Set([
  'Inventory', 'CharacterDetails', 'Memory', 'Gallery',
  'Cultivation', 'Techniques', 'ThousandDao', 'Settings', 'Save', 'WorldMap',
  'Events', 'Crafting', 'Sect', 'SectOverview', 'SectMembers', 'SectManagement', 'SectLibrary', 'SectTasks', 'SectContribution', 'GameVariables',
  'Npcs',
  'Prompts', 'APIManagement', 'GameAccount', 'BackendAdminPanel'
]);

// 不需要角色数据就能访问的面板（设置类）
const noDataRequiredRoutes = new Set([
  'Settings', 'Prompts', 'APIManagement', 'GameAccount', 'BackendAdminPanel'
]);

// 右侧相关面板（应该影响右侧收缩按钮）
const rightPanelRoutes = new Set([
  'Memory', 'Cultivation', 'Techniques', 'ThousandDao', 'Settings', 'Save',
  'Sect', 'SectOverview', 'SectMembers', 'SectManagement', 'SectLibrary', 'SectTasks', 'SectContribution'
]);

type IconComponent = typeof Package;

// 标题 / 副标题与左功能栏保持一致
const panelTitles: Record<string, { title: string; desc?: string; icon: IconComponent }> = {
  Inventory: { title: '背包物品', desc: '管理道具装备', icon: Package },
  CharacterDetails: { title: '人物属性', desc: '修为境界状态', icon: User },
  Memory: { title: '记忆档案', desc: '重要事件回顾', icon: Brain },
  Gallery: { title: '图廊', desc: '本局生成的剧情插图', icon: Images },
  Cultivation: { title: '修炼系统', icon: BookOpen },
  Techniques: { title: '功法技能', desc: '修炼突破晋级', icon: Zap },
  ThousandDao: { title: '大道感悟', desc: '领悟天地法则', icon: Scroll },
  Settings: { title: '系统设置', desc: '显示、阅读与游戏偏好', icon: Settings },
  Save: { title: '保存游戏', desc: '保存当前进度', icon: Save },
  WorldMap: { title: '世界地图', desc: '探索天下各地', icon: Map },
  Events: { title: '世界事件', desc: '世界变革与危机', icon: Bell },
  Crafting: { title: '炼制工坊', desc: '炼丹炼器炼天地', icon: Hammer },
  // 宗门是一个页面 + 标签，子路由只决定选中哪个标签
  Sect: { title: '宗门事务', desc: '门派事务管理', icon: Home },
  SectOverview: { title: '宗门事务', desc: '门派事务管理', icon: Home },
  SectMembers: { title: '宗门事务', desc: '门派事务管理', icon: Home },
  SectManagement: { title: '宗门事务', desc: '门派事务管理', icon: Home },
  SectLibrary: { title: '宗门事务', desc: '门派事务管理', icon: Home },
  SectTasks: { title: '宗门事务', desc: '门派事务管理', icon: Home },
  SectContribution: { title: '宗门事务', desc: '门派事务管理', icon: Home },
  Npcs: { title: '人物名录', desc: '结识的人物与好感', icon: Users },
  GameVariables: { title: '游戏变量', desc: '查看游戏数据', icon: Database },
  Prompts: { title: '提示词管理', desc: '自定义提示词', icon: FileText },
  APIManagement: { title: 'API管理', desc: '多API配置', icon: Plug },
  GameAccount: { title: '道友账户', desc: '签到领取公益额度', icon: BadgeCheck },
  BackendAdminPanel: { title: '仙官后台', icon: Shield }
};

const isPanelOpen = computed(() => {
  return panelRoutes.has(String(route.name));
});

const currentPanelTitle = computed(() => {
  const routeName = String(route.name);
  const panelInfo = panelTitles[routeName];
  return panelInfo?.title || '功能面板';
});

const currentPanelDesc = computed(() => panelTitles[String(route.name)]?.desc || '');

const currentPanelIcon = computed(() => {
  const routeName = String(route.name);
  const panelInfo = panelTitles[routeName];
  return panelInfo?.icon || Box;
});

const closePanel = () => {
  // 关闭面板时返回到主游戏面板，而不是重复路由到/game
  if (route.name !== 'GameMain') {
    router.push('/game');
  }
};

// 页头按钮由当前激活的页面自己声明（usePageActions）
const currentPanelActions = useCurrentPageActions();

const isDataReady = computed(() => {
  // 设置类面板（Settings、APIManagement、Prompts）不需要角色数据即可访问
  const currentRouteName = String(route.name);
  if (noDataRequiredRoutes.has(currentRouteName)) {
    return true;
  }
  // 其他面板需要有角色档案才能显示界面
  return !!characterStore.activeCharacterProfile;
});

// 应用保存的设置
const applySettings = () => {
  try {
    const savedSettings = localStorage.getItem('dad_game_settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);

      // 界面缩放（main.ts 启动时已应用一次，这里兜底）
      if (settings.uiScale) {
        applyUIScale(settings.uiScale);
      }

      // 主题由 useTheme 全局统一管理，这里不再单独覆盖
    }
  } catch (error) {
    console.error('[GameView] 应用设置失败:', error);
  }
};

// 组件挂载时应用设置
onMounted(async () => {
  applySettings();
  checkDeviceAndSetup();

  // 监听窗口大小变化
  window.addEventListener('resize', checkDeviceAndSetup);

  // 🔴 启动游戏内定期授权验证（每30分钟验证一次）
});

// 组件卸载时清理
onBeforeUnmount(() => {
  window.removeEventListener('resize', checkDeviceAndSetup);

  // 🔴 停止定期授权验证
});

watch(
  () => [gameStateStore.isGameLoaded, characterStore.rootState.当前激活存档?.角色ID, characterStore.rootState.当前激活存档?.存档槽位],
  ([isLoaded]) => {
    if (!isLoaded) {
      lastMigrationPromptKey.value = null;
      return;
    }
    maybePromptSectMigration();
  },
  { immediate: true }
);

// 监听面板状态变化，智能调整布局
watch(isPanelOpen, (isOpen) => {
  if (isOpen) {
    const currentRoute = String(route.name);

    // 移动端：打开任何面板时都自动收起左侧边栏
    if (isMobile.value) {
      leftSidebarCollapsed.value = true;
    }

    // 只有右侧相关面板才收起右侧边栏
    if (rightPanelRoutes.has(currentRoute)) {
      rightSidebarCollapsed.value = true;
    }
    // 左侧功能面板不影响侧边栏状态
  }
  // 注意：我们不在面板关闭时自动展开侧边栏，让用户保持之前的偏好
});
</script>

<style scoped>
.game-view {
  --nav-w: 216px;
  --status-w: 280px;

  display: grid;
  grid-template-rows: auto 1fr;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.shell {
  position: relative;
  display: flex;
  min-height: 0;
}

/* ---------- 侧栏 ---------- */
.side {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--gm-rail);
  transition: width 0.28s ease, transform 0.28s ease;
}

.side-nav {
  width: var(--nav-w);
  border-right: 1px solid var(--gm-rail-line);
}

.side-status {
  width: var(--status-w);
  border-left: 1px solid var(--gm-rail-line);
}

.side.collapsed {
  width: 0;
  border-color: transparent;
}

/* 展开时：骑在栏边的小圆钮；收起后：贴边的竖排书签 */
.edge-toggle {
  position: absolute;
  top: 50%;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--gm-rail-line);
  border-radius: 50%;
  background: var(--gm-rail);
  color: var(--cc-text-3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition: left 0.28s ease, right 0.28s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.edge-toggle:hover {
  border-color: rgba(var(--cc-gold-rgb), 0.6);
  color: var(--cc-gold);
  box-shadow: 0 0 0 3px rgba(var(--cc-gold-rgb), 0.12), 0 2px 8px rgba(0, 0, 0, 0.18);
}

.edge-toggle.left {
  left: var(--nav-w);
}

.edge-toggle.right {
  right: var(--status-w);
  transform: translate(50%, -50%);
}

.edge-toggle.collapsed {
  width: 32px;
  height: 104px;
  padding: 0.7rem 0;
  border-color: rgba(var(--cc-gold-rgb), 0.35);
  background: linear-gradient(180deg, rgba(var(--cc-gold-rgb), 0.1), rgba(var(--cc-gold-rgb), 0.03)), var(--gm-rail);
  color: var(--cc-gold);
  transform: translateY(-50%);
}

.edge-toggle.left.collapsed {
  left: 0;
  border-left: none;
  border-radius: 0 8px 8px 0;
}

.edge-toggle.right.collapsed {
  right: 0;
  border-right: none;
  border-radius: 8px 0 0 8px;
}

.edge-toggle.collapsed::before {
  content: '';
  position: absolute;
  top: 14px;
  bottom: 14px;
  width: 2px;
  border-radius: 2px;
  background: var(--cc-gold);
  opacity: 0.7;
}

.edge-toggle.left.collapsed::before {
  left: 0;
}

.edge-toggle.right.collapsed::before {
  right: 0;
}

.edge-toggle.collapsed:hover {
  border-color: rgba(var(--cc-gold-rgb), 0.65);
  background: linear-gradient(180deg, rgba(var(--cc-gold-rgb), 0.18), rgba(var(--cc-gold-rgb), 0.06)), var(--gm-rail);
}

.edge-label {
  writing-mode: vertical-rl;
  font-size: 13px;
  letter-spacing: 0.35em;
  line-height: 1;
}

.shell.panel-open .side-status,
.shell.panel-open .edge-toggle.left,
.shell.panel-open .edge-toggle.right {
  display: none;
}

/* ---------- 中栏 ---------- */
.stage {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* 底部远山 */
.stage::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 34%;
  background: var(--gm-mountains) bottom / 100% 100% no-repeat;
  pointer-events: none;
}

/* ---------- 功能页（盖住中栏） ---------- */
.sheet {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  background: var(--gm-page-bg);
}

.sheet::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 30%;
  background: var(--gm-mountains) bottom / 100% 100% no-repeat;
  pointer-events: none;
}

.sheet-head {
  position: relative;
  box-sizing: border-box;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex-shrink: 0;
  min-width: 0;
  min-height: 64px;
  padding: 0.7rem 1.5rem;
  border-bottom: 1px solid var(--gm-rail-line);
  background: linear-gradient(180deg, rgba(var(--cc-gold-rgb), 0.04), transparent);
}

.sheet-back {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
  height: 34px;
  padding: 0 0.75rem 0 0.55rem;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--cc-text-2);
  font-size: 14px;
  letter-spacing: 0.15em;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.sheet-back:hover {
  border-color: var(--cc-border);
  background: var(--gm-block-hover);
  color: var(--cc-text);
}

.sheet-sep {
  flex-shrink: 0;
  width: 1px;
  height: 26px;
  background: var(--gm-rail-line);
}

.sheet-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(var(--cc-gold-rgb), 0.45);
  border-radius: 7px;
  background: rgba(var(--cc-gold-rgb), 0.1);
  color: var(--cc-gold);
}

.sheet-heading {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 0.9rem;
}

.sheet-title {
  margin: 0;
  font-family: var(--cc-calligraphy);
  font-size: 26px;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: 0.2em;
  color: var(--cc-text);
  white-space: nowrap;
}

.sheet-desc {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.12em;
  color: var(--cc-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sheet-tools {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.4rem;
  flex-shrink: 0;
}

.sheet-body {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  max-width: 1480px;
  margin: 0 auto;
  padding: 0.25rem 1.5rem 1.25rem;
}

/* ---------- 加载态 ---------- */
.boot {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 1.5rem;
  overflow: auto;
}

.boot-card {
  width: min(440px, 100%);
  padding: 2.25rem 2rem;
  border: 1px solid var(--cc-shell-border);
  border-radius: 8px;
  background: var(--cc-shell-bg);
  text-align: center;
}

.boot-seal {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 84px;
  height: 84px;
  margin: 0 auto 1.25rem;
  border: 1px dashed rgba(var(--cc-gold-rgb), 0.5);
  border-radius: 50%;
  animation: gv-spin 16s linear infinite;
}

.boot-seal span {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 62px;
  height: 62px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(var(--cc-gold-rgb), 0.45);
  color: var(--cc-gold);
  font-family: var(--cc-calligraphy);
  font-size: 32px;
  animation: gv-spin 16s linear infinite reverse;
}

.boot-title {
  margin: 0 0 0.4rem;
  font-family: var(--cc-calligraphy);
  font-size: 28px;
  font-weight: 400;
  letter-spacing: 0.15em;
}

.boot-msg {
  margin: 0 0 1.25rem;
  font-size: 15px;
  color: var(--cc-text-2);
}

.boot-steps {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin: 0 0 1.25rem;
  padding: 0;
  list-style: none;
  text-align: left;
}

.boot-steps li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.85rem;
  border-radius: 6px;
  background: var(--gm-block);
  font-size: 14px;
  color: var(--cc-text-2);
}

.boot-steps li.done svg {
  color: var(--cc-success);
}

.boot-steps li.active {
  color: var(--cc-text);
}

.boot-steps li.active svg {
  color: var(--cc-gold);
}

.boot-hint {
  margin: 0;
  font-size: 13px;
  color: var(--cc-text-2);
}

@keyframes gv-spin {
  to { transform: rotate(360deg); }
}

/* ---------- 平板 / 手机 ---------- */
@media (max-width: 1280px) {
  .game-view {
    --nav-w: 200px;
    --status-w: 260px;
  }
}

@media (max-width: 768px) {
  .game-view {
    --nav-w: 260px;
    --status-w: 280px;
  }

  .side {
    position: fixed;
    top: 0;
    bottom: 0;
    z-index: 1000;
    box-shadow: 0 0 32px rgba(0, 0, 0, 0.4);
  }

  .side-nav {
    left: 0;
  }

  .side-status {
    right: 0;
  }

  .side-nav.collapsed {
    width: var(--nav-w);
    transform: translateX(-100%);
    box-shadow: none;
  }

  .side-status.collapsed {
    width: var(--status-w);
    transform: translateX(100%);
    box-shadow: none;
  }

  .scrim {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(0, 0, 0, 0.5);
  }

  .edge-toggle {
    position: fixed;
    z-index: 1001;
  }

  .edge-toggle.collapsed {
    width: 22px;
    height: 76px;
    padding: 0.45rem 0;
    gap: 0.2rem;
  }

  .edge-toggle.collapsed::before {
    top: 10px;
    bottom: 10px;
  }

  .edge-label {
    font-size: 11px;
    letter-spacing: 0.2em;
  }

  .sheet {
    position: fixed;
    z-index: 1100;
  }

  .sheet-head {
    gap: 0.5rem;
    min-height: 54px;
    padding: 0.5rem 0.75rem;
  }

  .sheet-back {
    padding: 0 0.4rem;
  }

  .sheet-back span,
  .sheet-icon,
  .sheet-desc,
  .sheet-tools .cc-btn span {
    display: none;
  }

  .sheet-title {
    font-size: 22px;
  }

  .sheet-body {
    padding: 0 0.75rem 0.75rem;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
