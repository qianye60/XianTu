<template>
  <div class="toast-container">
    <transition-group name="toast-fade" tag="div">
      <div v-for="toast in toasts" :key="toast.id" :class="['toast', `toast-${toast.type}`]">
        <div class="toast-icon">
          <!-- You can use SVGs or an icon library here -->
          <span v-if="toast.type === 'success'">✅</span>
          <span v-else-if="toast.type === 'error'">❌</span>
          <span v-else-if="toast.type === 'warning'">⚠️</span>
          <span v-else-if="toast.type === 'info'">ℹ️</span>
          <div v-else-if="toast.type === 'loading'" class="spinner"></div>
        </div>
        <div class="toast-message" v-html="toast.message"></div>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { toasts } from '@/utils/toast';
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
}

.toast {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  color: var(--color-text);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  min-width: 250px;
  max-width: 400px;
  margin-bottom: 8px;
}

.toast-icon {
  margin-right: 12px;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
}

.toast-message {
  word-break: break-word;
  font-size: 0.95rem;
  line-height: 1.4;
}

/* Toast Types */
.toast-success {
  border-left: 5px solid var(--color-success);
}
.toast-error {
  border-left: 5px solid var(--color-error);
}
.toast-warning {
  border-left: 5px solid var(--color-warning);
}
.toast-info {
  border-left: 5px solid var(--color-info);
}
.toast-loading {
  border-left: 5px solid var(--color-primary);
}

/* Spinner for loading */
.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(128, 128, 128, 0.3);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Transitions */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.5s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
