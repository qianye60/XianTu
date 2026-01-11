<template>
  <div class="sect-system-panel">
    <div class="sect-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        class="sect-tab"
        :class="{ active: isActiveTab(tab.name) }"
        @click="goToTab(tab.name)"
      >
        <component :is="tab.icon" :size="14" />
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <div class="sect-system-content">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Home, Users, BookOpen, Coins } from 'lucide-vue-next';
import { useGameStateStore } from '@/stores/gameStateStore';

const route = useRoute();
const router = useRouter();
const gameStateStore = useGameStateStore();

// 判断是否已加入宗门
const hasJoinedSect = computed(() => {
  const sectInfo = gameStateStore.sectMemberInfo;
  return sectInfo && sectInfo.宗门名称;
});

// 所有Tab定义
const allTabs = [
  { name: 'SectOverview', label: '宗门概览', icon: Home, requireJoin: false },
  { name: 'SectMembers', label: '宗门成员', icon: Users, requireJoin: true },
  { name: 'SectLibrary', label: '宗门藏经', icon: BookOpen, requireJoin: true },
  { name: 'SectContribution', label: '贡献兑换', icon: Coins, requireJoin: true },
];

// 根据是否加入宗门过滤Tab
const tabs = computed(() => {
  return allTabs.filter(tab => !tab.requireJoin || hasJoinedSect.value);
});

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

.sect-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 4px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 8px;
}

.sect-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sect-tab:hover {
  color: var(--color-text);
  border-color: rgba(var(--color-primary-rgb), 0.35);
  background: var(--color-surface);
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

@media (max-width: 768px) {
  .sect-tabs {
    padding: 6px;
  }

  .sect-tab {
    font-size: 0.75rem;
    padding: 5px 8px;
  }
}
</style>
