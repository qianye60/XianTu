<template>
  <transition name="modal-fade">
    <div v-if="uiStore.showDetailModalState" class="modal-overlay" @click="closeModal">
      <div class="modal-container" :class="uiStore.detailModalClass" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">{{ uiStore.detailModalTitle }}</h3>
          <button class="modal-close-button" @click="closeModal">
            <span>关闭</span>
            <X :size="16" />
          </button>
        </div>
        <div class="modal-content">
          <!-- Render component if provided -->
          <component
            v-if="uiStore.detailModalComponent"
            :is="uiStore.detailModalComponent"
            v-bind="uiStore.detailModalProps"
          />
          <!-- Fallback to HTML content -->
          <div v-else v-html="uiStore.detailModalContent"></div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useUIStore } from '@/stores/uiStore';
import { X } from 'lucide-vue-next';

const uiStore = useUIStore();

const closeModal = () => {
  uiStore.hideDetailModal();
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.06), rgba(15, 23, 42, 0.02)) , var(--color-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  box-shadow: 0 16px 40px rgba(0,0,0,0.35);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-container.modal-wide {
  width: min(96vw, 960px);
  max-width: 960px;
  max-height: 88svh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(59, 130, 246, 0.02));
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.modal-close-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.modal-close-button:hover {
  color: var(--color-text);
  border-color: var(--color-primary);
  background: var(--color-surface-hover);
}

.modal-content {
  padding: 1.5rem;
  overflow-y: auto;
  line-height: 1.6;
  color: var(--color-text);
  white-space: pre-wrap; /* Allows line breaks in the content */
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
