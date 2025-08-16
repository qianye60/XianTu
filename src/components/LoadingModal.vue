<template>
  <Teleport to="body">
    <transition name="indicator-fade">
      <div v-if="visible" class="loading-indicator-container">
        <div class="loading-indicator">
          <div class="spinner"></div>
          <div class="message">{{ message }}</div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  visible: boolean;
  message?: string;
}

withDefaults(defineProps<Props>(), {
  message: '天机推演中...'
});
</script>

<style scoped>
.loading-indicator-container {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: none;
}

.loading-indicator {
  display: flex;
  align-items: center;
  background-color: rgba(20, 25, 40, 0.9);
  color: var(--color-text-primary);
  padding: 0.75rem 1.5rem;
  border-radius: 50px;
  border: 1px solid var(--color-primary-light);
  box-shadow: 0 4px 20px rgba(var(--color-primary-rgb), 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(var(--color-primary-rgb), 0.3);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.75rem;
}

.message {
  font-size: 0.95rem;
  font-weight: 500;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.indicator-fade-enter-active,
.indicator-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.indicator-fade-enter-from,
.indicator-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>