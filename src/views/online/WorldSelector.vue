<template>
  <div class="world-selector-container">
    <h1 class="title">诸天万界</h1>
    <p class="subtitle">选择一方世界，开启你的神话</p>

    <div class="header-actions">
      <button @click="$emit('back')" class="back-button">← 返回模式选择</button>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>正在接引万界星光...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>【天机示警】</p>
      <p>{{ error }}</p>
      <button @click="fetchWorlds" class="retry-button">重试</button>
    </div>

    <div v-else class="worlds-grid">
      <div v-for="world in worlds" :key="world.id" class="world-card" @click="selectWorld(world)">
        <div class="world-name">{{ world.name }}</div>
        <div class="world-type">{{ world.type || '凡人界' }}</div>
        <p class="world-description">{{ world.description || '一片等待探索的未知之地。' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, defineEmits, defineProps } from 'vue'
import { useWorlds } from '@/composables/useWorlds'
import type { World } from '@/services/api'

const emit = defineEmits<{
  (e: 'world-selected', world: World): void
  (e: 'back'): void
}>()

const props = defineProps(['onWorldSelected'])

const { worlds, isLoading, error, fetchWorlds } = useWorlds()


const selectWorld = (world: World) => {
  console.log(`【位面迁跃】已选择世界: ${world.name} (ID: ${world.id})`)
  emit('world-selected', world)
  // @ts-ignore
  if (props.onWorldSelected) {
    // @ts-ignore
    props.onWorldSelected(world)
  }
}
</script>

<style scoped>
/* 此处样式为组件私有，故使用 scoped */
.world-selector-container {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--spacing-8);
  text-align: center;
  color: var(--text-color-primary);
}

.title {
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: var(--spacing-2);
  letter-spacing: 4px;
  text-shadow: 0 0 10px var(--primary-color-glow);
}

.subtitle {
  font-size: 1.2rem;
  margin-bottom: var(--spacing-10);
  color: var(--text-color-secondary);
}

.header-actions {
  margin-bottom: var(--spacing-8);
}

.back-button {
  background: none;
  border: 1px solid var(--border-color-default);
  color: var(--text-color-secondary);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--border-radius-medium);
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-button:hover {
  background-color: var(--bg-color-light);
  color: var(--text-color-primary);
  border-color: var(--primary-color);
}

/* 加载与错误状态 */
.loading-state,
.error-state {
  margin-top: var(--spacing-16);
}
.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid var(--border-color-default);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--spacing-4);
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.error-state {
  color: var(--danger-color);
}
.retry-button {
  margin-top: var(--spacing-4);
  padding: var(--spacing-2) var(--spacing-4);
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius-medium);
  cursor: pointer;
  transition: background-color 0.3s ease;
}
.retry-button:hover {
  background-color: var(--primary-color-dark);
}

/* 世界卡片网格 */
.worlds-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--spacing-6);
}

.world-card {
  background-color: var(--bg-color-light);
  border: 1px solid var(--border-color-default);
  border-radius: var(--border-radius-large);
  padding: var(--spacing-6);
  text-align: left;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.world-card:hover {
  transform: translateY(-5px);
  box-shadow:
    0 10px 20px rgba(0, 0, 0, 0.15),
    0 0 15px var(--primary-color-glow);
  border-color: var(--primary-color);
}

.world-name {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: var(--spacing-2);
  color: var(--primary-color);
}

.world-type {
  font-style: italic;
  color: var(--text-color-secondary);
  margin-bottom: var(--spacing-4);
}

.world-description {
  font-size: 0.9rem;
  line-height: 1.5;
}

/* 移动端响应式设计 */
@media (max-width: 768px) {
  .world-selector-container {
    padding: var(--spacing-4);
  }
  
  .title {
    font-size: 2rem;
    letter-spacing: 2px;
    margin-bottom: var(--spacing-4);
  }
  
  .subtitle {
    font-size: 1rem;
    margin-bottom: var(--spacing-6);
  }
  
  .header-actions {
    margin-bottom: var(--spacing-6);
  }
  
  .back-button {
    padding: var(--spacing-3) var(--spacing-5);
    font-size: 0.9rem;
    /* 增加触摸目标大小 */
    min-height: 44px;
  }
  
  .worlds-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--spacing-4);
  }
  
  .world-card {
    padding: var(--spacing-4);
  }
  
  .world-name {
    font-size: 1.3rem;
  }
  
  .world-description {
    font-size: 0.85rem;
  }
}

@media (max-width: 480px) {
  .world-selector-container {
    padding: var(--spacing-3);
  }
  
  .title {
    font-size: 1.8rem;
    letter-spacing: 1px;
  }
  
  .subtitle {
    font-size: 0.9rem;
  }
  
  .worlds-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-3);
  }
  
  .world-card {
    padding: var(--spacing-3);
  }
  
  .world-name {
    font-size: 1.2rem;
  }
  
  .world-type {
    font-size: 0.85rem;
    margin-bottom: var(--spacing-3);
  }
  
  .world-description {
    font-size: 0.8rem;
  }
}
</style>
