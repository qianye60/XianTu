<template>
  <div class="sect-system-panel">
    <div class="sect-header">
      <div class="sect-headline">
        <div class="sect-title">
          <div class="sect-mark" aria-hidden="true">
            <component :is="headerIcon" :size="16" />
          </div>
          <div class="sect-title-text">
            <div class="sect-name">
              <span v-if="activeSectName">{{ activeSectName }}</span>
              <span v-else>宗门</span>
              <span v-if="activeSectName && playerRole" class="role-pill" :class="rolePillClass">{{ playerRole }}</span>
              <span v-else-if="!activeSectName" class="role-pill none">未加入</span>
            </div>
            <div class="sect-subtitle">
              <span v-if="activeSectName && isSectLeader" class="sub-strong">可管理宗门事务</span>
              <span v-else-if="activeSectName">宗门事务与发展</span>
              <span v-else>先在「宗门概览」选择势力，或创建/加入自己的宗门</span>
            </div>
          </div>
        </div>

        <div class="sect-metrics" v-if="activeSectName">
          <div class="metric">
            <div class="k">贡献</div>
            <div class="v">{{ playerContribution }}</div>
          </div>
          <div class="metric">
            <div class="k">声望</div>
            <div class="v">{{ playerReputation }}</div>
          </div>
          <div class="metric" v-if="playerJoinDate">
            <div class="k">加入</div>
            <div class="v">{{ formatDateShort(playerJoinDate) }}</div>
          </div>
        </div>
      </div>

      <div class="sect-tabs" role="tablist" aria-label="宗门功能导航">
        <template v-for="(group, groupIndex) in tabGroups" :key="group.group">
          <div class="tab-group-label" aria-hidden="true">{{ group.group }}</div>
          <button
            v-for="tab in group.tabs"
            :key="tab.name"
            class="sect-tab"
            :class="{ active: isActiveTab(tab.name) }"
            role="tab"
            :aria-selected="isActiveTab(tab.name)"
            @click="goToTab(tab.name)"
          >
            <component :is="tab.icon" :size="14" />
            <span>{{ tab.label }}</span>
          </button>
          <div v-if="groupIndex !== tabGroups.length - 1" class="tab-group-divider" aria-hidden="true" />
        </template>
      </div>
    </div>

    <div class="sect-system-content">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Home, Users, BookOpen, Coins, Building2, Swords, ClipboardList, Crown, Building } from 'lucide-vue-next';
import { useGameStateStore } from '@/stores/gameStateStore';
 import { detectPlayerSectLeadership, isLeaderPosition } from '@/utils/sectLeadershipUtils';
import type { WorldFaction, WorldInfo } from '@/types/game';

const route = useRoute();
const router = useRouter();
const gameStateStore = useGameStateStore();

// 获取玩家名字
const playerName = computed(() => gameStateStore.character?.名字 || '');

// 获取所有宗门列表
const allSects = computed(() => {
  const data = gameStateStore.getCurrentSaveData();
  const worldInfo = (data as any)?.世界?.信息 as WorldInfo | undefined;
  return (worldInfo?.势力信息 || []) as WorldFaction[];
});

// 检测玩家宗门领导地位
const leaderInfo = computed(() => {
  return detectPlayerSectLeadership(
    playerName.value,
    allSects.value,
    gameStateStore.sectMemberInfo
  );
});

 const activeSectName = computed(() => {
   const fromMember = String(gameStateStore.sectMemberInfo?.宗门名称 || '').trim();
   if (fromMember) return fromMember;
   const fromSystem = String((gameStateStore.sectSystem as any)?.当前宗门 || '').trim();
   if (fromSystem) return fromSystem;
   return String(leaderInfo.value.sectName || '').trim();
 });
const playerRole = computed(() => {
  if (leaderInfo.value.isLeader && leaderInfo.value.position) return leaderInfo.value.position;
  return gameStateStore.sectMemberInfo?.职位 || '';
});
const playerContribution = computed(() => gameStateStore.sectMemberInfo?.贡献 ?? 0);
const playerReputation = computed(() => gameStateStore.sectMemberInfo?.声望 ?? 0);
const playerJoinDate = computed(() => gameStateStore.sectMemberInfo?.加入日期 || '');

// 判断是否已加入宗门（或是宗门领导）
 const hasJoinedSect = computed(() => {
   return !!(String(gameStateStore.sectMemberInfo?.宗门名称 || '').trim() || String((gameStateStore.sectSystem as any)?.当前宗门 || '').trim() || String(leaderInfo.value.sectName || '').trim());
 });

// 判断是否为宗门高层
const isSectLeader = computed(() => leaderInfo.value.isLeader || isLeaderPosition(String(gameStateStore.sectMemberInfo?.职位 || '')));

type SectTab = {
  name: string;
  label: string;
  icon: any;
  group: string;
  requireJoin?: boolean;
  requireLeader?: boolean;
};

// Tab 目录（按“概览 / 内务 / 宗主”分组）
const allTabs: SectTab[] = [
  { group: '概览', name: 'SectOverview', label: '概览', icon: Home, requireJoin: false },

  { group: '内务', name: 'SectMembers', label: '成员', icon: Users, requireJoin: true },
  { group: '内务', name: 'SectLibrary', label: '藏经', icon: BookOpen, requireJoin: true },
  { group: '内务', name: 'SectTasks', label: '任务', icon: ClipboardList, requireJoin: true },
  { group: '内务', name: 'SectContribution', label: '兑换', icon: Coins, requireJoin: true },

  { group: '宗主', name: 'SectManagement', label: '经营', icon: Building2, requireJoin: true, requireLeader: true },
  { group: '宗主', name: 'SectWar', label: '大战', icon: Swords, requireJoin: true, requireLeader: true },
];

// 根据是否加入宗门过滤Tab
const tabs = computed(() => {
  return allTabs.filter((tab) => {
    if (tab.requireJoin && !hasJoinedSect.value) return false;
    if (tab.requireLeader && !isSectLeader.value) return false;
    return true;
  });
});

const tabGroups = computed(() => {
  const groupsInOrder = ['概览', '内务', '宗主'];
  const map = new Map<string, SectTab[]>();
  for (const g of groupsInOrder) map.set(g, []);
  for (const tab of tabs.value) {
    const list = map.get(tab.group) ?? [];
    list.push(tab);
    map.set(tab.group, list);
  }
  return groupsInOrder
    .map((g) => ({ group: g, tabs: map.get(g) ?? [] }))
    .filter((g) => g.tabs.length > 0);
});

const headerIcon = computed(() => {
  if (!activeSectName.value) return Building;
  if (leaderInfo.value.isMaster) return Crown;
  return Building2;
});

const rolePillClass = computed(() => {
  if (!activeSectName.value) return 'none';
  if (leaderInfo.value.isMaster) return 'master';
  if (leaderInfo.value.isLeader) return 'leader';
  return 'member';
});

const formatDateShort = (iso: string) => {
  // 加入日期多为 ISO 字符串；展示为 YYYY-MM-DD（失败则原样回退）
  const s = String(iso || '').trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
};

const isActiveTab = (name: string) => String(route.name) === name;
const goToTab = (name: string) => {
  router.push({ name });
};
</script>

<style scoped>
.sect-system-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 8px;
  background: var(--color-background);
}

.sect-header {
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background:
    radial-gradient(900px 220px at 8% 0%, rgba(var(--color-primary-rgb), 0.09), transparent 55%),
    radial-gradient(700px 200px at 92% 0%, rgba(var(--color-primary-rgb), 0.06), transparent 60%),
    var(--color-surface);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.sect-headline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 12px 10px 12px;
  border-bottom: 1px solid var(--color-border);
}

.sect-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.sect-mark {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.10);
  border: 1px solid rgba(var(--color-primary-rgb), 0.18);
  flex: 0 0 auto;
}

.sect-title-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.sect-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-family-serif);
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--color-text);
  font-size: 1.02rem;
  line-height: 1.2;
  min-width: 0;
}

.sect-name > span:first-child {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  border: 1px solid var(--color-border);
  background: rgba(var(--color-border-rgb), 0.18);
  color: var(--color-text-secondary);
  flex: 0 0 auto;
}

.role-pill.master {
  border-color: rgba(234, 179, 8, 0.35);
  background: rgba(234, 179, 8, 0.12);
  color: #a16207;
}
.role-pill.leader {
  border-color: rgba(var(--color-primary-rgb), 0.35);
  background: rgba(var(--color-primary-rgb), 0.10);
  color: var(--color-primary);
}
.role-pill.member {
  border-color: rgba(34, 197, 94, 0.30);
  background: rgba(34, 197, 94, 0.10);
  color: #166534;
}
.role-pill.none {
  border-color: rgba(var(--color-border-rgb), 0.5);
  background: rgba(var(--color-border-rgb), 0.14);
  color: var(--color-text-secondary);
}

.sect-subtitle {
  color: var(--color-text-secondary);
  font-size: 0.84rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sect-subtitle .sub-strong {
  color: var(--color-text);
  font-weight: 700;
}

.sect-metrics {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: rgba(var(--color-surface-rgb), 0.6);
  backdrop-filter: blur(8px);
  min-width: 78px;
}

.metric .k {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.metric .v {
  font-weight: 800;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.sect-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 10px;
  background: rgba(var(--color-surface-rgb), 0.7);
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(var(--color-border-rgb), 0.35) transparent;
}

.sect-tabs::-webkit-scrollbar {
  height: 6px;
}
.sect-tabs::-webkit-scrollbar-track {
  background: transparent;
}
.sect-tabs::-webkit-scrollbar-thumb {
  background: rgba(var(--color-border-rgb), 0.35);
  border-radius: 999px;
}

.tab-group-label {
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: rgba(var(--color-border-rgb), 0.08);
  color: var(--color-text-secondary);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  white-space: nowrap;
  flex: 0 0 auto;
}

.tab-group-divider {
  width: 1px;
  height: 18px;
  background: rgba(var(--color-border-rgb), 0.22);
  flex: 0 0 auto;
}

.sect-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  background: rgba(var(--color-background-rgb), 0.6);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex: 0 0 auto;
}

.sect-tab:hover {
  color: var(--color-text);
  border-color: rgba(var(--color-primary-rgb), 0.35);
  background: rgba(var(--color-surface-rgb), 0.72);
}

.sect-tab.active {
  color: var(--color-primary);
  border-color: rgba(var(--color-primary-rgb), 0.5);
  background: rgba(var(--color-primary-rgb), 0.08);
  box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.15);
}

.sect-system-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sect-system-content :deep(> *) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .sect-headline {
    flex-direction: column;
    align-items: stretch;
  }

  .sect-metrics {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .sect-tab {
    font-size: 0.75rem;
    padding: 5px 8px;
  }
}
</style>
