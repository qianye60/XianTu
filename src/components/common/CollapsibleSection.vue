<template>
  <div class="collapsible-section">
    <div class="section-header" @click="toggle">
      <h4 class="section-title">{{ title }}</h4>
      <span class="toggle-icon" :class="{ open: isOpen }"></span>
    </div>
    <div class="section-content" :class="{ open: isOpen }">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  title: string;
  defaultOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  defaultOpen: false
});

const isOpen = ref(props.defaultOpen);

const toggle = () => {
  isOpen.value = !isOpen.value;
};
</script>

<style scoped>
/* 修仙风格可折叠区块 - 仙气飘渺浅色主题 */
.collapsible-section {
  margin-bottom: 10px;
  background: inherit;
  border: 1px solid rgba(121, 134, 203, 0.2);
  transition: all 0.2s ease;
  font-family: 'SimSun', 'NSimSun', 'STSong', '宋体', serif;
}

.collapsible-section:hover {
  border-color: rgba(121, 134, 203, 0.3);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  background: rgba(121, 134, 203, 0.05);
  border-bottom: 1px solid rgba(121, 134, 203, 0.15);
  transition: all 0.2s ease;
}

.section-header:hover {
  background: rgba(121, 134, 203, 0.08);
  border-bottom-color: rgba(121, 134, 203, 0.2);
}

.section-title {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #7986cb;
  letter-spacing: 0.5px;
}

.toggle-icon {
  width: 0;
  height: 0;
  border-left: 5px solid #7986cb;
  border-top: 3px solid transparent;
  border-bottom: 3px solid transparent;
  transition: all 0.2s ease;
}

.toggle-icon.open {
  transform: rotate(90deg);
  border-left-color: #9c27b0;
}

.section-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
  background: rgba(243, 229, 245, 0.3);
}

.section-content.open {
  max-height: 600px;
  padding: 8px 12px 12px;
}

/* 暗色主题适配 - 夜空星辰 */
[data-theme="dark"] .collapsible-section {
  border-color: rgba(100, 181, 246, 0.2);
}

[data-theme="dark"] .collapsible-section:hover {
  border-color: rgba(100, 181, 246, 0.3);
}

[data-theme="dark"] .section-header {
  background: rgba(100, 181, 246, 0.05);
  border-bottom-color: rgba(100, 181, 246, 0.15);
}

[data-theme="dark"] .section-header:hover {
  background: rgba(100, 181, 246, 0.08);
  border-bottom-color: rgba(100, 181, 246, 0.2);
}

[data-theme="dark"] .section-title {
  color: #64b5f6;
}

[data-theme="dark"] .toggle-icon {
  border-left-color: #64b5f6;
}

[data-theme="dark"] .toggle-icon.open {
  border-left-color: #ba68c8;
}

[data-theme="dark"] .section-content {
  background: rgba(45, 27, 105, 0.3);
}
</style>