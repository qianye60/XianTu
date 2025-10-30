<template>
  <transition name="modal-fade">
    <div v-if="uiStore.showDetailModalState" class="modal-overlay" @click="closeModal">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">{{ uiStore.detailModalTitle }}</h3>
          <button class="modal-close-button" @click="closeModal">
            <X :size="24" />
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
}

.modal-container {
  background: var(--color-surface);
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.modal-close-button {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
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