<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2 class="realm-title">{{ realmData.name }} - {{ realmData.title }}</h2>
        <button class="close-btn" @click="closeModal">×</button>
      </div>
      
      <div class="modal-body">
        <div class="realm-info-grid">
          <div class="info-section">
            <h3>核心标志</h3>
            <p>{{ realmData.coreFeature }}</p>
          </div>
          
          <div class="info-section">
            <h3>寿元</h3>
            <p class="lifespan">{{ realmData.lifespan }}</p>
          </div>
          
          <div class="info-section">
            <h3>主要活动层次</h3>
            <p>{{ realmData.activityScope }}</p>
          </div>
          
          <div class="progress-section">
            <h3>修行进度</h3>
            <div class="progress-container">
              <div class="progress-bar">
                <div class="progress" :style="{ width: progressPercent + '%' }"></div>
              </div>
              <span class="progress-text">{{ currentProgress }} / {{ maxProgress }}</span>
            </div>
          </div>
        </div>
        
        <div class="realm-gap-section">
          <h3>仙凡之别</h3>
          <p class="gap-description">{{ realmData.gapDescription }}</p>
        </div>
        
        <div class="breakthrough-section">
          <h3>突破之道</h3>
          <p class="breakthrough-description">{{ breakthroughDescription }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';

interface RealmModalData {
  name: string;
  title: string;
  coreFeature: string;
  lifespan: string;
  activityScope: string;
  gapDescription: string;
}

interface Props {
  isVisible: boolean;
  realmData: RealmModalData;
  currentProgress: number;
  maxProgress: number;
  breakthroughDescription: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: []
}>();

const progressPercent = computed(() => {
  if (props.maxProgress === 0) return 0;
  return Math.min((props.currentProgress / props.maxProgress) * 100, 100);
});

const closeModal = () => {
  emit('close');
};

const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeModal();
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeyPress);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyPress);
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: linear-gradient(135deg, #F8F6F0 0%, #E8F4F8 100%);
  border-radius: 16px;
  padding: 0;
  min-width: 500px;
  max-width: 700px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { 
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  background: linear-gradient(135deg, #66BB6A 0%, #81C784 100%);
  color: white;
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.realm-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 2rem;
  cursor: pointer;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.1);
}

.modal-body {
  padding: 2rem;
  overflow-y: auto;
}

.realm-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.info-section,
.progress-section {
  background: rgba(255, 255, 255, 0.6);
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid rgba(129, 199, 132, 0.2);
}

.progress-section {
  grid-column: 1 / -1;
}

.info-section h3,
.progress-section h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #424242;
  border-bottom: 2px solid #66BB6A;
  padding-bottom: 0.5rem;
}

.info-section p {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
  line-height: 1.5;
}

.lifespan {
  font-weight: 600;
  color: #FF9800 !important;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.progress-bar {
  flex: 1;
  height: 12px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: linear-gradient(90deg, #FFD54F, #FFA726);
  border-radius: 6px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
  min-width: 80px;
}

.realm-gap-section,
.breakthrough-section {
  background: rgba(255, 255, 255, 0.8);
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(129, 199, 132, 0.2);
}

.realm-gap-section:last-child,
.breakthrough-section:last-child {
  margin-bottom: 0;
}

.realm-gap-section h3,
.breakthrough-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #424242;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.realm-gap-section h3::before {
  content: '✨';
  font-size: 1.2rem;
}

.breakthrough-section h3::before {
  content: '⚡';
  font-size: 1.2rem;
}

.gap-description,
.breakthrough-description {
  margin: 0;
  font-size: 0.95rem;
  color: #555;
  line-height: 1.6;
  white-space: pre-line;
}

/* 暗色主题适配 */
[data-theme="dark"] .modal-content {
  background: linear-gradient(135deg, #1a1b26 0%, #293348 100%);
}

[data-theme="dark"] .modal-header {
  background: linear-gradient(135deg, #82A3F5 0%, #A3C1F7 100%);
}

[data-theme="dark"] .info-section,
[data-theme="dark"] .progress-section {
  background: rgba(41, 51, 72, 0.6);
  border-color: rgba(130, 163, 245, 0.2);
}

[data-theme="dark"] .realm-gap-section,
[data-theme="dark"] .breakthrough-section {
  background: rgba(41, 51, 72, 0.8);
  border-color: rgba(130, 163, 245, 0.2);
}

[data-theme="dark"] .info-section h3,
[data-theme="dark"] .progress-section h3,
[data-theme="dark"] .realm-gap-section h3,
[data-theme="dark"] .breakthrough-section h3 {
  color: #ffffff;
  border-color: #82A3F5;
}

[data-theme="dark"] .info-section p,
[data-theme="dark"] .progress-text,
[data-theme="dark"] .gap-description,
[data-theme="dark"] .breakthrough-description {
  color: #d0d0d0;
}

[data-theme="dark"] .progress-bar {
  background: rgba(255, 255, 255, 0.1);
}

@media (max-width: 768px) {
  .modal-content {
    min-width: 90vw;
    max-width: 90vw;
    margin: 1rem;
  }
  
  .realm-info-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .modal-header {
    padding: 1rem 1.5rem;
  }
  
  .modal-body {
    padding: 1.5rem;
  }
}
</style>