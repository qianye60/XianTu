<template>
  <div class="world-background-selector">
    <h3 class="selector-title">【 世界背景选择 】</h3>
    <p class="selector-subtitle">
      道友，请选择你的修行世界背景，不同的世界将影响你的修行环境和际遇。
    </p>

    <div v-if="backgrounds && backgrounds.length > 0" class="selector-container">
      <!-- 左侧：世界卡片网格 -->
      <div class="backgrounds-grid">
        <div
          v-for="background in backgrounds"
          :key="background.id"
          class="background-card"
          :class="{ selected: modelValue?.id === background.id }"
          @click="selectBackground(background)"
        >
          <div class="card-inner">
            <div class="background-header">
              <h4 class="background-name">{{ background.name }}</h4>
              <div v-if="modelValue?.id === background.id" class="selected-badge">
                <span>✓</span>
              </div>
            </div>
            <p class="background-brief">{{ getBriefDescription(background.description) }}</p>
            
            <!-- 世界特性标签 -->
            <div v-if="background.features && background.features.length > 0" class="feature-tags">
              <span v-for="(feature, index) in background.features.slice(0, 2)" :key="index" class="feature-tag">
                {{ feature }}
              </span>
              <span v-if="background.features.length > 2" class="feature-tag more">
                +{{ background.features.length - 2 }}
              </span>
            </div>
          </div>
          
          <!-- 选中光效 -->
          <div v-if="modelValue?.id === background.id" class="selected-glow"></div>
        </div>
      </div>

      <!-- 右侧：详细信息展示区 -->
      <div class="detail-panel">
        <div v-if="modelValue" class="detail-content">
          <!-- 世界标题 -->
          <div class="detail-header">
            <h3 class="detail-title">{{ modelValue.name }}</h3>
            <div class="title-underline"></div>
          </div>

          <!-- 世界描述 -->
          <div class="detail-description">
            <p>{{ modelValue.description || '此界天道隐秘，尚未揭示其真容...' }}</p>
          </div>

          <!-- 世界特色 -->
          <div v-if="modelValue.features && modelValue.features.length > 0" class="detail-features">
            <h4 class="section-title">
              <span class="icon">✦</span>
              世界特色
            </h4>
            <ul class="features-list">
              <li v-for="feature in modelValue.features" :key="feature" class="feature-item">
                <span class="feature-icon">◈</span>
                <span class="feature-text">{{ feature }}</span>
              </li>
            </ul>
          </div>

          <!-- 修行加成 -->
          <div v-if="modelValue.cultivation_bonus" class="detail-bonus">
            <h4 class="section-title">
              <span class="icon">☯</span>
              修行加成
            </h4>
            <div class="bonus-content">
              <div class="bonus-card">
                <span class="bonus-value">{{ modelValue.cultivation_bonus }}</span>
              </div>
            </div>
          </div>

          <!-- 额外信息 -->
          <div class="detail-extra">
            <div class="extra-item">
              <span class="extra-label">世界编号：</span>
              <span class="extra-value">#{{ modelValue.id }}</span>
            </div>
          </div>
        </div>

        <!-- 未选择世界时的提示 -->
        <div v-else class="no-selection">
          <div class="no-selection-icon">☯</div>
          <p class="no-selection-text">请选择一个世界背景</p>
          <p class="no-selection-hint">点击左侧世界卡片查看详细信息</p>
        </div>
      </div>
    </div>

    <div v-else class="no-data-prompt">
      <p>未能探知任何世界背景，请检查天道连接或本地秘藏。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { World } from '@/core/rules/characterCreation'

const props = defineProps<{
  modelValue: World | null
  backgrounds: World[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: World | null]
}>()

const selectBackground = (background: World) => {
  emit('update:modelValue', background)
}

// 获取简短描述
const getBriefDescription = (description: string | null) => {
  if (!description) return '神秘的世界，等待探索...'
  return description.length > 60 ? description.substring(0, 60) + '...' : description
}

// Watch for incoming data and set a default selection if none exists
watch(
  () => props.backgrounds,
  (newBackgrounds) => {
    if (!props.modelValue && newBackgrounds && newBackgrounds.length > 0) {
      selectBackground(newBackgrounds[0])
    }
  },
  { immediate: true },
)

onMounted(() => {
  // Initial check in case modelValue is already set but we need to ensure it's valid
  if (!props.modelValue && props.backgrounds && props.backgrounds.length > 0) {
    selectBackground(props.backgrounds[0])
  }
})
</script>

<style scoped>
.world-background-selector {
  width: 100%;
}

.selector-title {
  text-align: center;
  color: var(--color-primary);
  margin-bottom: 1rem;
  font-size: 1.5rem;
  font-family: var(--font-family-serif);
  text-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.5);
}

.selector-subtitle {
  text-align: center;
  color: var(--color-text-secondary);
  margin-bottom: 2rem;
  font-size: 1rem;
}

.selector-container {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 2rem;
  margin-bottom: 2rem;
  min-height: 500px;
}

/* 左侧：世界卡片网格 */
.backgrounds-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
  align-content: start;
}

.background-card {
  position: relative;
  background: linear-gradient(135deg, rgba(30, 40, 50, 0.8), rgba(20, 30, 40, 0.9));
  border: 2px solid rgba(var(--color-primary-rgb), 0.3);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 160px;
  overflow: hidden;
}

.card-inner {
  position: relative;
  padding: 1.5rem;
  z-index: 1;
}

.background-card:hover {
  transform: translateY(-8px) scale(1.02);
  border-color: rgba(var(--color-primary-rgb), 0.6);
  box-shadow: 
    0 15px 35px rgba(0, 0, 0, 0.5),
    0 0 30px rgba(var(--color-primary-rgb), 0.2);
}

.background-card.selected {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, 
    rgba(var(--color-primary-rgb), 0.15), 
    rgba(var(--color-primary-rgb), 0.05));
  box-shadow: 
    0 10px 30px rgba(0, 0, 0, 0.4),
    0 0 40px rgba(var(--color-primary-rgb), 0.3),
    inset 0 0 20px rgba(var(--color-primary-rgb), 0.1);
}

.selected-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, 
    rgba(var(--color-primary-rgb), 0.3) 0%, 
    transparent 70%);
  animation: rotate 10s linear infinite;
  pointer-events: none;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.background-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
}

.background-name {
  color: var(--color-text);
  margin: 0;
  font-size: 1.2rem;
  font-family: var(--font-family-serif);
  font-weight: 600;
}

.background-card.selected .background-name {
  color: var(--color-primary);
  text-shadow: 0 0 10px rgba(var(--color-primary-rgb), 0.5);
}

.selected-badge {
  width: 24px;
  height: 24px;
  background: var(--color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-background);
  font-weight: bold;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.background-brief {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 1rem 0;
}

.feature-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.feature-tag {
  padding: 0.25rem 0.75rem;
  background: rgba(var(--color-accent-rgb), 0.2);
  border: 1px solid rgba(var(--color-accent-rgb), 0.4);
  border-radius: 20px;
  font-size: 0.75rem;
  color: var(--color-accent);
}

.feature-tag.more {
  background: rgba(var(--color-primary-rgb), 0.2);
  border-color: rgba(var(--color-primary-rgb), 0.4);
  color: var(--color-primary);
}

/* 右侧：详细信息面板 */
.detail-panel {
  background: linear-gradient(135deg, rgba(25, 35, 45, 0.9), rgba(15, 25, 35, 0.95));
  border: 2px solid rgba(var(--color-primary-rgb), 0.3);
  border-radius: 20px;
  padding: 2rem;
  backdrop-filter: blur(20px);
  box-shadow: 
    0 10px 40px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 1rem;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.detail-panel::-webkit-scrollbar {
  width: 6px;
}

.detail-panel::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.detail-panel::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom, var(--color-primary), var(--color-accent));
  border-radius: 3px;
}

.detail-content {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.detail-header {
  margin-bottom: 1.5rem;
  text-align: center;
}

.detail-title {
  color: var(--color-primary);
  font-size: 1.8rem;
  font-family: var(--font-family-serif);
  margin: 0 0 0.5rem 0;
  text-shadow: 0 0 30px rgba(var(--color-primary-rgb), 0.5);
}

.title-underline {
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, 
    transparent, 
    var(--color-primary), 
    transparent);
  margin: 0 auto;
}

.detail-description {
  margin-bottom: 2rem;
  padding: 1.2rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border-left: 3px solid var(--color-primary);
}

.detail-description p {
  color: var(--color-text);
  font-size: 0.95rem;
  line-height: 1.7;
  margin: 0;
}

.section-title {
  color: var(--color-accent);
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-title .icon {
  color: var(--color-primary);
  font-size: 1.2rem;
}

.detail-features {
  margin-bottom: 2rem;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem;
  margin-bottom: 0.5rem;
  background: rgba(var(--color-primary-rgb), 0.05);
  border-radius: 8px;
  border-left: 2px solid var(--color-primary);
  transition: all 0.3s ease;
}

.feature-item:hover {
  background: rgba(var(--color-primary-rgb), 0.1);
  transform: translateX(5px);
}

.feature-icon {
  color: var(--color-primary);
  font-size: 0.8rem;
}

.feature-text {
  color: var(--color-text);
  font-size: 0.9rem;
}

.detail-bonus {
  margin-bottom: 2rem;
}

.bonus-card {
  padding: 1.2rem;
  background: linear-gradient(135deg, 
    rgba(var(--color-primary-rgb), 0.2),
    rgba(var(--color-accent-rgb), 0.1));
  border-radius: 12px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.4);
  text-align: center;
}

.bonus-value {
  color: var(--color-primary);
  font-size: 1.1rem;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(var(--color-primary-rgb), 0.5);
}

.detail-extra {
  padding-top: 1.5rem;
  border-top: 1px solid rgba(var(--color-primary-rgb), 0.2);
}

.extra-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
  font-size: 0.85rem;
}

.extra-label {
  color: var(--color-text-secondary);
}

.extra-value {
  color: var(--color-text);
  font-weight: 500;
}

/* 未选择状态 */
.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
}

.no-selection-icon {
  font-size: 4rem;
  color: rgba(var(--color-primary-rgb), 0.3);
  margin-bottom: 1rem;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.no-selection-text {
  color: var(--color-text);
  font-size: 1.2rem;
  margin: 0 0 0.5rem 0;
}

.no-selection-hint {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin: 0;
}

.no-data-prompt {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary);
  font-style: italic;
  background: rgba(30, 40, 50, 0.6);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .selector-container {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .detail-panel {
    position: static;
    max-height: none;
  }

  .backgrounds-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

@media (max-width: 768px) {
  .backgrounds-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .background-card {
    min-height: 140px;
  }

  .detail-panel {
    padding: 1.5rem;
  }
}
</style>