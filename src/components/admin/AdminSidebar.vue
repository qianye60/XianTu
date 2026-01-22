<template>
  <aside class="admin-sidebar">
    <div class="sidebar-top">
      <div class="sidebar-meta">
        <div class="meta-title">功能导航</div>
        <div class="meta-sub">按模块管理后端数据</div>
      </div>
      <div class="sidebar-actions">
        <button class="btn sm" :disabled="busy" @click="$emit('refresh')">刷新</button>
      </div>
    </div>

    <div class="sidebar-scroll">
      <div v-for="group in groups" :key="group.label" class="nav-group">
        <div class="nav-group-label">{{ group.label }}</div>
        <div class="nav-items">
          <button
            v-for="tab in group.tabs"
            :key="tab.id"
            type="button"
            class="nav-item"
            :class="{ active: activeTab === tab.id }"
            @click="$emit('select', tab.id)"
          >
            <span class="nav-title">{{ tab.label }}</span>
            <span v-if="tab.badge" class="nav-badge">{{ tab.badge }}</span>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
type TabItem = { id: string; label: string; badge?: string };
type TabGroup = { label: string; tabs: TabItem[] };

defineProps<{
  groups: TabGroup[];
  activeTab: string;
  busy: boolean;
}>();

defineEmits<{
  (e: 'select', tabId: string): void;
  (e: 'refresh'): void;
}>();
</script>

<style scoped>
.admin-sidebar {
  border: 1px solid rgba(var(--color-border-rgb), 0.55);
  border-radius: 12px;
  background: linear-gradient(160deg, rgba(var(--color-surface-rgb), 0.9), rgba(var(--color-surface-rgb), 0.78));
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.sidebar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--color-border-rgb), 0.5);
  background: rgba(var(--color-surface-rgb), 0.6);
  backdrop-filter: blur(10px);
}

.sidebar-meta { min-width: 0; }
.meta-title { font-weight: 900; }
.meta-sub { font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 2px; }

.sidebar-actions { display: flex; gap: 8px; flex: 0 0 auto; }

.sidebar-scroll {
  padding: 10px;
  overflow: auto;
  min-height: 0;
  overflow-x: hidden;
}

.nav-group { display: grid; gap: 8px; margin-bottom: 12px; }
.nav-group:last-child { margin-bottom: 0; }
.nav-group-label {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-left: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-items { display: grid; gap: 8px; }
.nav-item {
  text-align: left;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(var(--color-border-rgb), 0.6);
  background: rgba(var(--color-background-rgb), 0.7);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.nav-item:hover:not(.active) { border-color: rgba(var(--color-primary-rgb), 0.25); }
.nav-item.active {
  background: rgba(var(--color-primary-rgb), 0.1);
  border-color: rgba(var(--color-primary-rgb), 0.4);
  color: var(--color-text);
  font-weight: 700;
}

.nav-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.nav-badge {
  border: 1px solid rgba(var(--color-border-rgb), 0.6);
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: rgba(var(--color-primary-rgb), 0.08);
}

.btn {
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.sm { padding: 0.35rem 0.6rem; border-radius: 8px; font-size: 0.85rem; }
</style>
