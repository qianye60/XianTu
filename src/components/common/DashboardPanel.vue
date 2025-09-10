<template>
  <div class="dashboard-panel">
    <div class="panel-header" v-if="showHeader">
      <div class="header-content">
        <div class="header-icon" v-if="headerIcon">
          <component :is="headerIcon" :size="16" />
        </div>
        <h3 class="panel-title">{{ title }}</h3>
        <span class="panel-subtitle" v-if="subtitle">{{ subtitle }}</span>
        <div class="header-actions">
          <slot name="header-actions"></slot>
          <button v-if="collapsible" @click="toggleCollapse" class="collapse-btn">
            <ChevronDown v-if="!collapsed" :size="14" />
            <ChevronRight v-else :size="14" />
          </button>
        </div>
      </div>
    </div>

    <Transition name="panel-content">
      <div v-show="!collapsed" class="panel-content" :class="{ 'no-padding': noPadding }">
        <slot></slot>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ChevronDown, ChevronRight } from 'lucide-vue-next';

interface Props {
  title: string;
  subtitle?: string;
  headerIcon?: any;
  showHeader?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  noPadding?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showHeader: true,
  collapsible: false,
  defaultCollapsed: false,
  noPadding: false
});

const collapsed = ref(props.defaultCollapsed);

const toggleCollapse = () => {
  collapsed.value = !collapsed.value;
};
</script>

<style scoped>
.dashboard-panel {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.dashboard-panel:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.panel-header {
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 8px;
  /* 防止操作区过多导致溢出，允许换行 */
  flex-wrap: wrap;
}

.header-icon {
  color: #3b82f6;
  display: flex;
  align-items: center;
}

.panel-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1e293b;
  flex-grow: 1;
}

.panel-subtitle {
  font-size: 0.8rem;
  color: #64748b;
  margin-left: auto;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

@media (max-width: 768px) {
  .header-actions {
    width: 100%;
    justify-content: flex-start;
    gap: 6px;
  }
}

.collapse-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: #64748b;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
}

.collapse-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #3b82f6;
}

.panel-content {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.panel-content.no-padding {
  padding: 0;
}

/* 折叠动画 */
.panel-content-enter-active,
.panel-content-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.panel-content-enter-from,
.panel-content-leave-to {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
}

.panel-content-enter-to,
.panel-content-leave-from {
  max-height: 2000px;
  opacity: 1;
}

/* 深色主题 */
[data-theme="dark"] .dashboard-panel {
  background: #1e293b;
  border-color: #475569;
}

[data-theme="dark"] .panel-header {
  background: linear-gradient(135deg, #334155 0%, #475569 100%);
  border-bottom-color: #64748b;
}

[data-theme="dark"] .panel-title {
  color: #f1f5f9;
}

[data-theme="dark"] .panel-subtitle {
  color: #94a3b8;
}

[data-theme="dark"] .header-icon {
  color: #60a5fa;
}

[data-theme="dark"] .collapse-btn {
  color: #94a3b8;
}

[data-theme="dark"] .collapse-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #60a5fa;
}
</style>
