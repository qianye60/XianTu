<template>
  <nav class="nav" :class="{ 'lang-en': currentLanguage === 'en' }" :aria-label="t('游戏功能')">
    <div class="nav-scroll">
      <section v-for="section in navSections" :key="section.title" class="nav-group">
        <h3 class="nav-group-title" :title="t(section.title)"><span>{{ currentLanguage === 'en' ? t(section.title) : section.short }}</span></h3>
        <ul class="nav-list">
          <li v-for="item in section.items" :key="item.key">
            <button
              type="button"
              class="nav-item"
              :class="{ active: isActive(item.path) }"
              :disabled="item.disabled"
              :aria-current="isActive(item.path) ? 'page' : undefined"
              :title="t(item.desc)"
              @click="item.onClick"
            >
              <span class="nav-icon"><component :is="item.icon" :size="15" :stroke-width="1.75" /></span>
              <span class="nav-name">{{ t(item.label) }}</span>
            </button>
          </li>
        </ul>
      </section>

    </div>

    <footer class="nav-foot">
      <button type="button" class="nav-exit" :title="`${t('现实时间')} ${currentRealTime}`" @click="handleBackToMenu">
        <span class="nav-exit-seal">{{ t('归') }}</span>
        <span class="nav-exit-text">{{ t('返回道途') }}</span>
      </button>
      <div class="nav-meta">
        <a
          href="https://github.com/qianye60/XianTu"
          target="_blank"
          rel="noopener noreferrer"
          class="nav-link"
          :title="displayVersion ? `GitHub · V${displayVersion}` : 'GitHub'"
          aria-label="GitHub"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        </a>
        <button type="button" class="nav-link sponsor" :title="t('赞助支持')" :aria-label="t('赞助支持')" @click="showSponsorModal = true">
          <Heart :size="14" />
        </button>
      </div>
    </footer>

    <teleport to="body">
      <div v-if="showSponsorModal" class="cc-modal-overlay" @click.self="showSponsorModal = false">
        <div class="cc-modal" role="dialog" aria-modal="true" :aria-label="t('赞助支持（自愿）')">
          <div class="cc-modal-head">
            <h2 class="cc-modal-title">{{ t('赞助支持（自愿）') }}</h2>
            <button type="button" class="cc-modal-close" :aria-label="t('关闭')" @click="showSponsorModal = false">
              <X :size="18" />
            </button>
          </div>
          <div class="cc-modal-body">
            <div class="sponsor-grid">
              <figure class="sponsor-qr">
                <img src="https://ddct.top/zhifubao.jpg" :alt="t('支付宝赞助二维码')" loading="lazy" />
                <figcaption>{{ t('支付宝') }}</figcaption>
              </figure>
              <figure class="sponsor-qr">
                <img src="https://ddct.top/weixing.jpg" :alt="t('微信赞助二维码')" loading="lazy" />
                <figcaption>{{ t('微信') }}</figcaption>
              </figure>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Package, User, Users, BookOpen, Zap, Brain, Map, Save, Settings, Home, Bell, Database, Clock, FileText, Plug, Heart, Shield, Hammer, X, BadgeCheck, Images } from 'lucide-vue-next';
import { useCharacterStore } from '@/stores/characterStore';
import { toast } from '@/utils/toast';
import { useUIStore } from '@/stores/uiStore';
import { useI18n } from '@/i18n';

const router = useRouter();
const route = useRoute();
const characterStore = useCharacterStore();
const uiStore = useUIStore();
const { t, currentLanguage } = useI18n();

// 版本号相关
const showSponsorModal = ref(false);
const displayVersion = '5.0';

// 实时北京时间
const currentRealTime = ref('');
let timeInterval: number | null = null;

const updateRealTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  currentRealTime.value = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

onMounted(() => {
  updateRealTime();
  timeInterval = window.setInterval(updateRealTime, 1000);

});

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval);
  }
});

// 使用 store 的 getters 获取数据
const activeCharacter = computed(() => characterStore.activeCharacterProfile);
const isAdmin = computed(() => localStorage.getItem('is_admin') === 'true');
// 功能目录（数据驱动，模板只负责渲染）
type NavItem = {
  key: string;
  label: string;
  desc: string;
  icon: typeof User;
  path?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
};

const navSections = computed<Array<{ title: string; short: string; items: NavItem[] }>>(() => {
  const systemItems: NavItem[] = [
    { key: 'save', label: '保存游戏', desc: '保存当前进度', icon: Save, path: '/game/save', onClick: handleSaveGame, disabled: !activeCharacter.value },
    { key: 'variables', label: '游戏变量', desc: '查看游戏数据', icon: Database, path: '/game/game-variables', onClick: handleGameVariables },
    { key: 'prompts', label: '提示词管理', desc: '自定义提示词', icon: FileText, path: '/game/prompts', onClick: handlePrompts },
    { key: 'api', label: 'API管理', desc: '多API配置', icon: Plug, path: '/game/api-management', onClick: handleAPIManagement },
    { key: 'account', label: '道友账户', desc: '签到领取公益额度', icon: BadgeCheck, path: '/game/account', onClick: () => router.push('/game/account') },
    { key: 'settings', label: '系统设置', desc: '偏好设置', icon: Settings, path: '/game/settings', onClick: handleSettings },
  ];
  if (isAdmin.value) {
    systemItems.push({ key: 'admin', label: '仙官后台', desc: '管理员控制台', icon: Shield, path: '/game/backend-admin', onClick: handleBackendAdmin });
  }

  return [
    {
      title: '角色信息',
      short: '角色',
      items: [
        { key: 'details', label: '人物属性', desc: '修为境界状态', icon: User, path: '/game/character-details', onClick: handleCharacterDetails },
        { key: 'inventory', label: '背包物品', desc: '管理道具装备', icon: Package, path: '/game/inventory', onClick: handleInventory },
      ],
    },
    {
      title: '修炼系统',
      short: '修炼',
      items: [
        { key: 'techniques', label: '功法技能', desc: '修炼突破晋级', icon: BookOpen, path: '/game/techniques', onClick: handleTechniques },
        { key: 'dao', label: '大道感悟', desc: '领悟天地法则', icon: Zap, path: '/game/thousand-dao', onClick: handleThousandDao },
        { key: 'crafting', label: '炼制工坊', desc: '炼丹炼器炼天地', icon: Hammer, path: '/game/crafting', onClick: handleCrafting },
      ],
    },
    {
      title: '事件探索',
      short: '探索',
      items: [
        { key: 'events', label: '世界事件', desc: '世界变革与危机', icon: Bell, path: '/game/events', onClick: handleEvents },
        { key: 'map', label: '世界地图', desc: '探索天下各地', icon: Map, path: '/game/world-map', onClick: handleWorldMap },
      ],
    },
    {
      title: '社交势力',
      short: '社交',
      items: [
        { key: 'sect', label: '宗门事务', desc: '门派事务管理', icon: Home, path: '/game/sect', onClick: handleSect },
        { key: 'npcs', label: '人物名录', desc: '结识的人物与好感', icon: Users, path: '/game/npcs', onClick: openNpcList },
        { key: 'memory', label: '记忆档案', desc: '重要事件回顾', icon: Brain, path: '/game/memory', onClick: handleMemoryCenter },
        { key: 'gallery', label: '图廊', desc: '本局生成的剧情插图', icon: Images, path: '/game/gallery', onClick: () => router.push('/game/gallery'), disabled: !activeCharacter.value },
      ],
    },
    { title: '系统功能', short: '系统', items: systemItems },
  ];
});

const isActive = (path?: string) => {
  if (!path) return false;
  return route.path === path || route.path.startsWith(path + '/');
};

const handleSaveGame = async () => {
  router.push('/game/save');
};

const handleInventory = () => {
  router.push('/game/inventory');
};

const handleCharacterDetails = () => {
  router.push('/game/character-details');
};

const openNpcList = () => {
  router.push('/game/npcs');
};

const handleEvents = () => {
  router.push('/game/events');
};

const handleSect = () => {
  router.push('/game/sect');
};

const handleTechniques = () => {
  router.push('/game/techniques');
};

const handleThousandDao = () => {
  router.push('/game/thousand-dao');
};

const handleCrafting = () => {
  router.push('/game/crafting');
};

const handleMemoryCenter = () => {
  router.push('/game/memory');
};

const handleWorldMap = () => {
  router.push('/game/world-map');
};

const handlePrompts = () => {
  router.push('/game/prompts');
};

const handleSettings = () => {
  router.push('/game/settings');
};

const handleAPIManagement = () => {
  router.push('/game/api-management');
};

const handleGameVariables = () => {
  router.push('/game/game-variables');
};

const handleBackendAdmin = () => {
  router.push('/game/backend-admin');
};

const handleBackToMenu = () => {
  uiStore.showRetryDialog({
    title: t('返回道途'),
    message: t('您想如何退出当前游戏？'),
    confirmText: t('保存并退出'),
    cancelText: t('取消'),
    neutralText: t('不保存直接退出'),
    onConfirm: async () => {
      console.log('[返回道途] 用户选择保存并退出...');
      try {
        // 使用 gameStateStore 的 saveBeforeExit 保存
        const { useGameStateStore } = await import('@/stores/gameStateStore');
        const gameStateStore = useGameStateStore();
        await gameStateStore.saveBeforeExit();
        toast.success(t('游戏已保存'));
      } catch (error) {
        console.error('[返回道途] 保存游戏失败:', error);
        toast.error(t('游戏保存失败，但仍会继续退出。'));
      }
      await exitToMenu();
    },
    onNeutral: async () => {
      console.log('[返回道途] 用户选择不保存直接退出...');
      toast.info(t('游戏进度未保存'));
      await exitToMenu(); // 传入 false 表示不保存
    },
    onCancel: () => {
      console.log('[返回道途] 用户取消操作');
    }
  });
};

// 封装一个统一的退出函数，避免代码重复
const exitToMenu = async () => {
  // 🔥 [新架构] 不再需要清理酒馆上下文，数据已在IndexedDB中管理
  console.log('[返回道途] 准备返回主菜单');

  characterStore.rootState.当前激活存档 = null;
  await characterStore.commitMetadataToStorage();
  console.log('[返回道途] 已重置激活存档状态');

  uiStore.stopLoading();
  await router.push('/');
  console.log('[返回道途] 已跳转至主菜单');
};
</script>

<style scoped>
.nav {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.nav-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.9rem 0.6rem 0.6rem 0.5rem;
}

/* 分组：左侧竖排书脊签 + 右侧条目 */
.nav-group {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  column-gap: 0.4rem;
}

.nav-group + .nav-group {
  margin-top: 0.7rem;
}

.nav-group-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  margin: 0;
  padding-top: 0.45rem;
  font-size: 12px;
  font-weight: 500;
  color: color-mix(in srgb, var(--cc-gold) 82%, var(--cc-text-2));
}

/* 竖排书签：两字，细金框 */
.nav-group-title span {
  writing-mode: vertical-rl;
  padding: 0.4rem 0 0.25rem;
  width: 20px;
  border: 1px solid rgba(var(--cc-gold-rgb), 0.32);
  border-radius: 3px;
  background: rgba(var(--cc-gold-rgb), 0.06);
  letter-spacing: 0.25em;
  line-height: 18px;
  text-align: center;
}

.nav-group-title::after {
  content: '';
  flex: 1;
  width: 1px;
  min-height: 6px;
  margin-bottom: 0.4rem;
  background: linear-gradient(to bottom, rgba(var(--cc-gold-rgb), 0.4), rgba(var(--cc-gold-rgb), 0));
}

/* 英文：竖排不可读，退回横排组名 */
.lang-en .nav-group {
  display: block;
}

.lang-en .nav-group-title {
  flex-direction: row;
  gap: 0.5rem;
  margin-bottom: 0.2rem;
  padding: 0 0.55rem;
}

.lang-en .nav-group-title span {
  writing-mode: horizontal-tb;
  width: auto;
  padding: 0;
  border: none;
  background: none;
  letter-spacing: 0.08em;
}

.lang-en .nav-group-title::after {
  width: auto;
  height: 1px;
  min-height: 0;
  margin: 0;
  background: linear-gradient(to right, rgba(var(--cc-gold-rgb), 0.4), rgba(var(--cc-gold-rgb), 0));
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  height: 38px;
  padding: 0 0.55rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--cc-text-2);
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.nav-item:hover:not(:disabled) {
  background: var(--gm-block-hover);
  color: var(--cc-text);
}

.nav-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.nav-item.active {
  background: linear-gradient(90deg, rgba(var(--cc-gold-rgb), 0.17), rgba(var(--cc-gold-rgb), 0.02) 85%);
  color: var(--cc-text);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 9px;
  bottom: 9px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--cc-gold);
  box-shadow: 0 0 8px rgba(var(--cc-gold-rgb), 0.5);
}

/* 玉牌图标：平时只是淡色线图，悬停 / 当前页点亮成方牌 */
.nav-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  color: color-mix(in srgb, var(--cc-gold) 55%, var(--cc-text-3));
  transition: color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.nav-item:hover:not(:disabled) .nav-icon {
  color: var(--cc-gold);
  box-shadow: inset 0 0 0 1px rgba(var(--cc-gold-rgb), 0.35);
}

.nav-item.active .nav-icon {
  color: var(--cc-gold);
  background: rgba(var(--cc-gold-rgb), 0.14);
  box-shadow: inset 0 0 0 1px rgba(var(--cc-gold-rgb), 0.55);
}

.nav-name {
  font-size: 14.5px;
  letter-spacing: 0.16em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lang-en .nav-name {
  font-size: 14px;
  letter-spacing: 0.02em;
}

/* ---------- 底栏：一行「归 返回道途 · 版本 · GitHub · 赞助」 ---------- */
.nav-foot {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.55rem 0.6rem 0.6rem;
  border-top: 1px solid var(--gm-rail-line);
}

.nav-exit {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  height: 34px;
  padding: 0 0.5rem 0 0.35rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--cc-text-2);
  font-size: 14px;
  letter-spacing: 0.16em;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
}

.nav-exit-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: var(--cc-seal);
  color: var(--cc-seal-text);
  font-family: var(--cc-calligraphy);
  font-size: 15px;
  letter-spacing: 0;
  line-height: 1;
}

.lang-en .nav-exit-seal {
  font-family: inherit;
  font-size: 10px;
}

.nav-exit-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-exit:hover {
  background: rgba(var(--cc-danger-rgb), 0.1);
  color: var(--cc-text);
}

.nav-meta {
  display: flex;
  align-items: center;
  gap: 0.1rem;
  flex-shrink: 0;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--cc-text-3);
  cursor: pointer;
  transition: color 0.2s ease;
}

.nav-link:hover {
  color: var(--cc-gold);
}

.nav-link.sponsor:hover {
  color: var(--cc-seal);
}

/* ---------- 赞助弹窗 ---------- */
.sponsor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.sponsor-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.sponsor-qr img {
  width: 100%;
  max-width: 200px;
  aspect-ratio: 1;
  object-fit: contain;
  border-radius: 6px;
  background: #fff;
}

.sponsor-qr figcaption {
  font-size: 14px;
  letter-spacing: 0.2em;
  color: var(--cc-text-2);
}

@media (max-height: 820px) {
  .nav-item {
    height: 34px;
  }

  .nav-group + .nav-group {
    margin-top: 0.45rem;
  }
}

@media (max-width: 480px) {
  .sponsor-grid {
    grid-template-columns: 1fr;
  }
}
</style>
