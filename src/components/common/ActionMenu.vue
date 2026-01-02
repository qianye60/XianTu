<template>
  <div class="action-menu" :class="positionClass" :style="offsetStyle">
    <transition name="menu-fade">
      <div v-if="open" class="overlay" @click="close"></div>
    </transition>

    <transition name="menu-pop">
      <div v-if="open" class="menu" @click.stop>
        <slot name="menu" :close="close" />
      </div>
    </transition>

    <button
      class="fab"
      :title="open ? closeTitle : openTitle"
      :aria-label="open ? closeTitle : openTitle"
      :aria-expanded="open"
      @click="toggle"
    >
      <component :is="open ? X : Menu" :size="22" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Menu, X } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    position?: 'top-right' | 'bottom-right';
    offsetPx?: number;
    openTitle?: string;
    closeTitle?: string;
  }>(),
  {
    position: 'bottom-right',
    offsetPx: 24,
    openTitle: '菜单',
    closeTitle: '关闭',
  },
);

const open = ref(false);

const close = () => {
  open.value = false;
};

const toggle = () => {
  open.value = !open.value;
};

const positionClass = computed(() => {
  return props.position === 'top-right' ? 'pos-top-right' : 'pos-bottom-right';
});

const offsetStyle = computed(() => {
  const px = `${props.offsetPx}px`;
  if (props.position === 'top-right') return { top: px, right: px };
  return { bottom: px, right: px };
});
</script>

<style scoped>
.action-menu {
  position: fixed;
  z-index: 120;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(2px);
  z-index: 0;
}

.fab {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--color-surface);
  backdrop-filter: blur(10px);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  position: relative;
  z-index: 2;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.fab:hover {
  background: var(--color-surface-hover);
  color: var(--color-primary);
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.menu {
  position: absolute;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  z-index: 2;
  min-width: 160px;
}

:deep(.action-menu-item) {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-light);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
  text-decoration: none; /* For <a> tags */
  font-family: inherit;
  font-size: 0.95rem;
}

:deep(.action-menu-item:hover) {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateX(-2px);
}

:deep(.action-menu-item.is-disabled) {
  opacity: 0.55;
  cursor: not-allowed;
  pointer-events: none;
}

:deep(.action-menu-item span) {
  font-size: 0.95rem;
  letter-spacing: 0.05em;
}

:deep(.action-menu-item.is-danger) {
  border-color: rgba(239, 68, 68, 0.25);
  color: var(--color-error);
}

:deep(.action-menu-item.is-danger:hover) {
  border-color: var(--color-error);
  background: rgba(239, 68, 68, 0.1);
}

.pos-bottom-right .menu {
  bottom: 62px;
}

.pos-top-right .menu {
  top: 62px;
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.18s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
}

.menu-pop-enter-active,
.menu-pop-leave-active {
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.98);
}

@media (max-width: 600px) {
  .action-menu {
    bottom: 12px;
    right: 12px;
    top: auto;
  }

  .pos-top-right {
    top: 12px;
    bottom: auto;
  }

  .fab {
    width: 40px;
    height: 40px;
    border-radius: 10px;
  }

  .pos-bottom-right .menu {
    bottom: 52px;
    min-width: 150px;
  }

  .pos-top-right .menu {
    top: 52px;
    min-width: 150px;
  }
}
</style>
