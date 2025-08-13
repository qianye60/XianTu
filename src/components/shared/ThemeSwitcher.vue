<template>
  <button @click="toggleTheme" class="theme-switcher">
    <transition name="fade" mode="out-in">
      <svg
        v-if="theme === 'light'"
        key="sun"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="lucide lucide-sun"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
      <svg
        v-else
        key="moon"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="lucide lucide-moon"
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </transition>
  </button>
</template>

<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'

const { theme, toggleTheme } = useTheme()
</script>

<style scoped>
.theme-switcher {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.theme-switcher:hover {
  color: var(--color-primary);
  background-color: var(--color-surface-light);
}

.theme-switcher svg {
  width: 20px;
  height: 20px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .theme-switcher {
    padding: 0.75rem;
    /* 增加触摸目标大小 */
    min-width: 44px;
    min-height: 44px;
  }
  
  .theme-switcher svg {
    width: 22px;
    height: 22px;
  }
}

@media (max-width: 480px) {
  .theme-switcher {
    padding: 0.6rem;
    min-width: 40px;
    min-height: 40px;
  }
  
  .theme-switcher svg {
    width: 20px;
    height: 20px;
  }
}
</style>
