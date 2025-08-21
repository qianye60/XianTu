<template>
  <div class="talent-display-container" @click="toggleExpand">
    <div class="talent-header">
      <span class="talent-name">{{ talent.name }}</span>
      <span class="talent-level">Lv.{{ talent.level }}</span>
    </div>
    <div v-if="isExpanded" class="talent-details">
      <p class="talent-description">{{ talent.description }}</p>
      <div class="progress-bar">
        <div class="progress" :style="{ width: talent.progress + '%' }"></div>
        <span class="progress-text">{{ talent.progress }} / 100</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

export interface Talent {
  name: string;
  description: string;
  level: number;
  progress: number;
}

const props = defineProps<{
  talent: Talent;
  compact?: boolean;
}>();

const isExpanded = ref(false);

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};
</script>

<style scoped>
.talent-display-container {
  margin-bottom: 0.6rem;
  padding: 0.7rem 1rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  border-left: 4px solid #81C784;
  transition: all 0.3s ease-out;
  cursor: pointer;
}

.talent-display-container:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateX(3px);
  border-left-color: #FFA726;
}

[data-theme="dark"] .talent-display-container {
  background: rgba(41, 51, 72, 0.6);
  border-left-color: #82a3f5;
}

[data-theme="dark"] .talent-display-container:hover {
  background: rgba(41, 51, 72, 0.9);
  border-left-color: #e0af68;
}

.talent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.talent-name {
  font-size: 0.9rem;
}

.talent-level {
  font-size: 0.8rem;
  color: #757575;
}

[data-theme="dark"] .talent-level {
  color: #d0d0d0;
}

.talent-details {
  margin-top: 0.8rem;
  padding-top: 0.8rem;
  border-top: 1px solid rgba(129, 199, 132, 0.2);
}

[data-theme="dark"] .talent-details {
  border-top-color: rgba(130, 163, 245, 0.2);
}

.talent-description {
  font-size: 0.85rem;
  color: #616161;
  margin: 0 0 0.8rem 0;
}

[data-theme="dark"] .talent-description {
  color: #c0caf5;
}

.progress-bar {
  width: 100%;
  height: 14px;
  background: rgba(245, 245, 245, 0.8);
  border-radius: 7px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(129, 199, 132, 0.2);
}

.progress {
  height: 100%;
  border-radius: 7px;
  background: linear-gradient(90deg, #81C784 0%, #66BB6A 100%);
  transition: width 0.3s ease-out;
}

.progress-text {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  text-align: center;
  line-height: 14px;
  font-size: 0.7rem;
  color: #424242;
  font-weight: 600;
}

[data-theme="dark"] .progress-bar {
  background: rgba(41, 51, 72, 0.8);
  border-color: rgba(130, 163, 245, 0.2);
}

[data-theme="dark"] .progress-text {
  color: #ffffff;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.6);
}
</style>