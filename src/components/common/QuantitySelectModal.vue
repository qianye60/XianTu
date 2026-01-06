<template>
  <div v-if="visible" class="quantity-modal-overlay" @click="handleOverlayClick">
    <div class="quantity-modal" @click.stop>
      <div class="modal-header">
        <h3>{{ title || '选择数量' }}</h3>
        <button class="close-btn" @click="$emit('close')">
          <span>关闭</span>
          <X :size="16" />
        </button>
      </div>
      
      <div class="modal-body">
        <div class="item-info">
          <div class="item-icon">{{ getItemIcon(item?.类型) }}</div>
          <div class="item-details">
            <div class="item-name">{{ item?.名称 }}</div>
            <div class="item-type">{{ item?.类型 }}</div>
            <div class="available-quantity">可用数量：{{ item?.数量 || 0 }}</div>
            <div v-if="description" class="item-description">{{ description }}</div>
          </div>
        </div>
        
        <div class="quantity-selector">
          <label for="quantity">{{ actionLabel || '选择数量' }}：</label>
          <div class="quantity-controls">
            <button 
              class="quantity-btn" 
              @click="decreaseQuantity"
              :disabled="selectedQuantity <= 1"
            >
              -
            </button>
            <input 
              id="quantity"
              v-model.number="selectedQuantity" 
              type="number" 
              :min="1" 
              :max="item?.数量 || 1"
              class="quantity-input"
            />
            <button 
              class="quantity-btn" 
              @click="increaseQuantity"
              :disabled="selectedQuantity >= (item?.数量 || 1)"
            >
              +
            </button>
          </div>
        </div>
        
        <div class="quantity-shortcuts">
          <button 
            v-for="preset in presetQuantities" 
            :key="preset.value"
            class="preset-btn"
            @click="setQuantity(preset.value)"
            :disabled="preset.value > (item?.数量 || 1)"
          >
            {{ preset.label }}
          </button>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="cancel-btn" @click="$emit('close')">取消</button>
        <button 
          class="confirm-btn" 
          :class="actionType === 'discard' ? 'discard-confirm' : ''"
          @click="handleConfirm" 
          :disabled="selectedQuantity <= 0"
        >
          {{ confirmText || '确定' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X } from 'lucide-vue-next';

interface Item {
  物品ID: string;
  名称: string;
  类型: string;
  数量: number;
  描述?: string;
}

interface Props {
  visible: boolean;
  item: Item | null;
  title?: string;
  actionLabel?: string;
  actionType?: 'use' | 'discard' | 'other';
  confirmText?: string;
  description?: string;
}

interface Emits {
  (e: 'close'): void;
  (e: 'confirm', quantity: number): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const selectedQuantity = ref(1);

// 预设数量选项
const presetQuantities = computed(() => {
  const maxQuantity = props.item?.数量 || 1;
  const presets = [
    { label: '1个', value: 1 },
    { label: '5个', value: 5 },
    { label: '10个', value: 10 },
    { label: '全部', value: maxQuantity }
  ];
  
  return presets.filter(preset => preset.value <= maxQuantity);
});

// 监听item变化，重置数量
watch(() => props.item, (newItem) => {
  if (newItem) {
    selectedQuantity.value = 1;
  }
});

function increaseQuantity() {
  if (selectedQuantity.value < (props.item?.数量 || 1)) {
    selectedQuantity.value++;
  }
}

function decreaseQuantity() {
  if (selectedQuantity.value > 1) {
    selectedQuantity.value--;
  }
}

function setQuantity(quantity: number) {
  selectedQuantity.value = Math.min(quantity, props.item?.数量 || 1);
}

function handleConfirm() {
  if (selectedQuantity.value > 0 && selectedQuantity.value <= (props.item?.数量 || 1)) {
    emit('confirm', selectedQuantity.value);
  }
}

function handleOverlayClick() {
  emit('close');
}

function getItemIcon(type?: string): string {
  const iconMap: Record<string, string> = {
    '装备': '⚔️',
    '功法': '📜',
    '丹药': '💊',
    '材料': '💎',
    '其他': '📦'
  };
  return iconMap[type || '其他'] || '📦';
}
</script>

<style scoped>
.quantity-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000; /* 确保在最上层 */
  backdrop-filter: blur(4px);
}

.quantity-modal {
  background: var(--color-surface);
  border: 1px solid var(--color-primary-border);
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  color: var(--color-text);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modal-appear 0.3s ease-out;
  overflow: hidden;
}

@keyframes modal-appear {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-primary-light);
}

.modal-header h3 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.25rem;
  font-weight: 600;
}

.close-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
  border-color: var(--color-primary);
}

.modal-body {
  padding: 24px;
}

.item-info {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: var(--color-surface-light);
  border-radius: 8px;
}

.item-icon {
  font-size: 32px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.item-details {
  flex: 1;
}

.item-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
}

.item-type {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.available-quantity {
  font-size: 0.85rem;
  color: var(--color-primary);
  font-weight: 500;
}

.quantity-selector {
  margin-bottom: 20px;
}

.quantity-selector label {
  display: block;
  margin-bottom: 12px;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.quantity-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quantity-btn {
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.quantity-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.quantity-btn:disabled {
  background: var(--color-surface-light);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.quantity-input {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 8px 12px;
  border-radius: 8px;
  width: 100px;
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.quantity-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
}

.quantity-shortcuts {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.preset-btn {
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
}

.preset-btn:hover:not(:disabled) {
  background: var(--color-surface-hover);
  color: var(--color-text);
  border-color: var(--color-border-hover);
}

.preset-btn:disabled {
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px 24px 24px;
  border-top: 1px solid var(--color-border);
}

.cancel-btn, .confirm-btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}

.cancel-btn {
  background: var(--color-surface-hover);
  color: var(--color-text-secondary);
}

.cancel-btn:hover {
  background: var(--color-surface-light);
  color: var(--color-text);
}

.confirm-btn {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.confirm-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.confirm-btn:disabled {
  background: var(--color-surface-light);
  border-color: var(--color-border);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.discard-confirm {
  background: var(--color-danger) !important;
  border-color: var(--color-danger) !important;
}

.discard-confirm:hover:not(:disabled) {
  background: var(--color-danger-hover) !important;
}

.item-description {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-top: 4px;
  font-style: italic;
}
</style>