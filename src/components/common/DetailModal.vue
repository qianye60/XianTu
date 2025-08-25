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
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.modal-icon {
  font-size: 1.5rem;
}

.modal-title {
  flex: 1;
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.2s;
  color: #6b7280;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
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
  padding: 1.5rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.content-scroll::-webkit-scrollbar {
  width: 6px;
}

.content-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.content-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.text-content {
  color: #374151;
  line-height: 1.6;
  white-space: pre-line;
}

.structured-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.content-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.5rem;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.text-block {
  color: #374151;
  line-height: 1.5;
}

.list-block {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.list-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.item-bullet {
  color: #3b82f6;
  font-weight: bold;
  margin-top: 0.125rem;
}

.item-text {
  color: #374151;
  line-height: 1.5;
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
  padding: 0.5rem 0.75rem;
  background: #f9fafb;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
}

.row-label {
  font-weight: 500;
  color: #374151;
}

.row-value {
  color: #1f2937;
  font-weight: 600;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-shrink: 0;
}

.modal-btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.modal-btn.secondary {
  background: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}

.modal-btn.secondary:hover {
  background: #e5e7eb;
  color: #1f2937;
}

/* 深色主题 */
[data-theme="dark"] .detail-modal {
  background: #1f2937;
  color: #f3f4f6;
}

[data-theme="dark"] .modal-header {
  border-bottom-color: #374151;
}

[data-theme="dark"] .modal-title {
  color: #f3f4f6;
}

[data-theme="dark"] .close-btn {
  color: #9ca3af;
}

[data-theme="dark"] .close-btn:hover {
  background: #374151;
  color: #e5e7eb;
}

[data-theme="dark"] .section-title {
  color: #f3f4f6;
  border-bottom-color: #374151;
}

[data-theme="dark"] .text-content,
[data-theme="dark"] .text-block,
[data-theme="dark"] .item-text {
  color: #d1d5db;
}

[data-theme="dark"] .table-row {
  background: #374151;
  border-color: #4b5563;
}

[data-theme="dark"] .row-label {
  color: #d1d5db;
}

[data-theme="dark"] .row-value {
  color: #f3f4f6;
}

[data-theme="dark"] .modal-footer {
  border-top-color: #374151;
}

[data-theme="dark"] .modal-btn.secondary {
  background: #374151;
  color: #d1d5db;
  border-color: #4b5563;
}

[data-theme="dark"] .modal-btn.secondary:hover {
  background: #4b5563;
  color: #f3f4f6;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .detail-modal {
    max-width: calc(100vw - 2rem);
    max-height: 90vh;
  }
  
  .modal-header {
    padding: 1rem;
  }
  
  .content-scroll {
    padding: 1rem;
  }
  
  .modal-footer {
    padding: 1rem;
  }
}
</style>