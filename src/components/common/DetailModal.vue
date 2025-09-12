<template>
  <Teleport to="body">
    <div class="detail-modal-overlay" v-if="modelValue" @click="closeModal">
      <div class="detail-modal" @click.stop>
        <div class="modal-header">
          <div class="modal-icon">{{ icon }}</div>
          <h3 class="modal-title">{{ title }}</h3>
          <button class="close-btn" @click="closeModal">
            <X :size="20" />
          </button>
        </div>
        
        <div class="modal-content">
          <div class="content-scroll">
            <slot name="content">
              <div v-if="typeof content === 'string'" class="text-content">
                {{ content }}
              </div>
              <div v-else class="structured-content">
                <div v-for="(section, index) in content" :key="index" class="content-section">
                  <h4 v-if="section.title" class="section-title">{{ section.title }}</h4>
                  <div class="section-content">
                    <div v-if="section.type === 'text'" class="text-block">
                      {{ section.data }}
                    </div>
                    <div v-else-if="section.type === 'list'" class="list-block">
                      <div v-for="item in section.data" :key="item" class="list-item">
                        <span class="item-bullet">•</span>
                        <span class="item-text">{{ item }}</span>
                      </div>
                    </div>
                    <div v-else-if="section.type === 'table'" class="table-block">
                      <div v-for="row in section.data" :key="row.label" class="table-row">
                        <span class="row-label">{{ row.label }}:</span>
                        <span class="row-value">{{ row.value }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </slot>
          </div>
        </div>
        
        <div class="modal-footer" v-if="showFooter">
          <slot name="footer">
            <button class="modal-btn secondary" @click="closeModal">关闭</button>
          </slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next';

interface ContentSection {
  title?: string;
  type: 'text' | 'list' | 'table';
  data: any;
}

interface TableRow {
  label: string;
  value: string | number;
}

const props = defineProps<{
  modelValue: boolean;
  title: string;
  icon?: string;
  content?: string | ContentSection[];
  showFooter?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>();

const closeModal = () => {
  emit('update:modelValue', false);
};
</script>

<style scoped>
.detail-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.detail-modal {
  background: var(--color-surface);
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  box-shadow: 
    0 20px 25px -5px rgba(0, 0, 0, 0.1), 
    0 10px 10px -5px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  animation: modalEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

@keyframes modalEnter {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.9);
    filter: blur(10px);
  }
  50% {
    opacity: 0.8;
    filter: blur(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem 1.75rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  background: var(--color-surface-light);
  position: relative;
}

.modal-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 1.75rem;
  right: 1.75rem;
  height: 1px;
  background: linear-gradient(to right, transparent, var(--color-primary), transparent);
  opacity: 0.3;
}

.modal-icon {
  font-size: 1.75rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover));
  color: white;
  box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.3);
}

.modal-title {
  flex: 1;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.025em;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--color-text-secondary);
  position: relative;
  overflow: hidden;
}

.close-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: var(--color-error);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.3s ease;
  opacity: 0.1;
}

.close-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-error);
  transform: scale(1.1);
}

.close-btn:hover::before {
  width: 100%;
  height: 100%;
}

.close-btn:active {
  transform: scale(0.95);
}

.modal-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.content-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 1.75rem;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
  background: var(--color-background);
}

.content-scroll::-webkit-scrollbar {
  width: 6px;
}

.content-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.content-scroll::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
  transition: background 0.2s ease;
}

.content-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--color-primary);
}

.text-content {
  color: var(--color-text);
  line-height: 1.7;
  white-space: pre-line;
  font-size: 0.95rem;
}

.structured-content {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.content-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--color-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.section-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  border-bottom: 2px solid var(--color-primary);
  padding-bottom: 0.5rem;
  position: relative;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 30%;
  height: 2px;
  background: var(--color-primary);
  border-radius: 1px;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.text-block {
  color: var(--color-text);
  line-height: 1.6;
  font-size: 0.95rem;
}

.list-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.list-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.item-bullet {
  color: var(--color-primary);
  font-weight: bold;
  margin-top: 0.125rem;
  font-size: 1.1rem;
}

.item-text {
  color: var(--color-text);
  line-height: 1.5;
  font-size: 0.95rem;
}

.table-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.table-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--color-surface-light);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.table-row:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
  transform: translateX(2px);
}

.row-label {
  font-weight: 500;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.row-value {
  color: var(--color-text);
  font-weight: 600;
  font-size: 0.95rem;
}

.modal-footer {
  padding: 1.25rem 1.75rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-shrink: 0;
  background: var(--color-surface-light);
}

.modal-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  font-size: 0.95rem;
  position: relative;
  overflow: hidden;
}

.modal-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.6s ease;
}

.modal-btn:hover::before {
  left: 100%;
}

.modal-btn.secondary {
  background: var(--color-surface-hover);
  color: var(--color-text);
  border-color: var(--color-border);
}

.modal-btn.secondary:hover {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.25);
}

.modal-btn.secondary:active {
  transform: translateY(0);
}

/* 移动端适配 */
@media (max-width: 640px) {
  .detail-modal {
    max-width: calc(100vw - 1rem);
    max-height: 95vh;
    margin: 0.5rem;
    border-radius: 12px;
  }
  
  .modal-header {
    padding: 1.25rem;
  }
  
  .modal-header::after {
    left: 1.25rem;
    right: 1.25rem;
  }
  
  .modal-icon {
    width: 2.25rem;
    height: 2.25rem;
    font-size: 1.5rem;
  }
  
  .modal-title {
    font-size: 1.1rem;
  }
  
  .content-scroll {
    padding: 1.25rem;
  }
  
  .content-section {
    padding: 1rem;
    gap: 0.75rem;
  }
  
  .modal-footer {
    padding: 1rem 1.25rem;
    flex-direction: column;
  }
  
  .modal-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .detail-modal-overlay {
    padding: 0.5rem;
  }
  
  .detail-modal {
    max-height: 98vh;
  }
  
  .modal-header {
    padding: 1rem;
    gap: 0.5rem;
  }
  
  .modal-icon {
    width: 2rem;
    height: 2rem;
    font-size: 1.25rem;
  }
  
  .modal-title {
    font-size: 1rem;
  }
  
  .content-scroll {
    padding: 1rem;
  }
  
  .structured-content {
    gap: 1.25rem;
  }
  
  .content-section {
    padding: 0.75rem;
  }
  
  .section-title {
    font-size: 1rem;
  }
}
</style>