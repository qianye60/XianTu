<template>
  <div class="preview-container">
    <h2 class="title">最终预览</h2>
    <p class="subtitle">请确认你的选择，此为踏入仙途的最后一步。</p>

    <div class="preview-grid">
      <!-- Character Name -->
      <div class="preview-item name-item">
        <label for="characterName">道号:</label>
        <input 
          type="text" 
          id="characterName" 
          class="named" 
          v-model="store.characterPayload.character_name" 
          placeholder="{{user}}" 
          @mousedown.stop
          @click.stop
          @select.stop
        />
      </div>

      <!-- Gender Selection -->
      <div class="preview-item gender-item">
        <h3>性别</h3>
        <div class="gender-control">
          <label class="gender-label">
            <input type="radio" name="gender" value="男" v-model="store.characterPayload.gender">
            <span>男</span>
          </label>
          <label class="gender-label">
            <input type="radio" name="gender" value="女" v-model="store.characterPayload.gender">
            <span>女</span>
          </label>
          <label class="gender-label">
            <input type="radio" name="gender" value="双性" v-model="store.characterPayload.gender">
            <span>双性</span>
          </label>
        </div>
      </div>

      <!-- Birth Age -->
      <div class="preview-item age-item">
        <h3>初始年龄</h3>
        <div class="age-control">
          <button type="button" @click="decrementAge" :disabled="store.characterPayload.current_age <= 0" class="age-btn">-</button>
          <span class="age-display">{{ store.characterPayload.current_age }} 岁</span>
          <button type="button" @click="incrementAge" :disabled="store.characterPayload.current_age >= 18" class="age-btn">+</button>
        </div>
      </div>

      <!-- World -->
      <div class="preview-item">
        <h3>所选世界</h3>
        <h4>{{ store.selectedWorld?.name || '未选择' }}</h4>
        <p class="item-description">{{ store.selectedWorld?.description || '暂无描述' }}</p>
      </div>

      <!-- Talent Tier -->
      <div class="preview-item">
        <h3>天资</h3>
        <h4 :style="{ color: store.selectedTalentTier?.color || 'inherit' }">
          {{ store.selectedTalentTier?.name || '未选择' }}
        </h4>
        <p class="item-description">{{ store.selectedTalentTier?.description || '暂无描述' }}</p>
      </div>

      <!-- Origin -->
      <div class="preview-item">
        <h3>出身</h3>
        <h4>{{ store.selectedOrigin?.name || '随机出身' }}</h4>
        <p class="item-description">{{ store.selectedOrigin?.description || '暂无描述' }}</p>
      </div>

      <!-- Spirit Root -->
      <div class="preview-item">
        <h3>灵根</h3>
        <h4>{{ store.selectedSpiritRoot?.name || '随机灵根' }}</h4>
        <p class="item-description">{{ store.selectedSpiritRoot?.description || '暂无描述' }}</p>
      </div>

      <!-- Talents -->
      <div class="preview-item talents-item">
        <h3>天赋</h3>
        <ul v-if="store.selectedTalents.length">
          <li v-for="talent in store.selectedTalents" :key="talent.id">
            <strong>{{ talent.name }}</strong>
            <p class="item-description">{{ talent.description }}</p>
          </li>
        </ul>
        <p v-else>未选择任何天赋</p>
      </div>

      <!-- Attributes -->
      <div v-if="props.isLocalCreation" class="preview-item attributes-item">
        <h3>先天六司</h3>
        <ul>
          <li>根骨: {{ store.attributes.root_bone }}</li>
          <li>灵性: {{ store.attributes.spirituality }}</li>
          <li>悟性: {{ store.attributes.comprehension }}</li>
          <li>气运: {{ store.attributes.fortune }}</li>
          <li>魅力: {{ store.attributes.charm }}</li>
          <li>心性: {{ store.attributes.temperament }}</li>
        </ul>
      </div>

      <!-- Cloud Mode Placeholder -->
      <div v-else class="preview-item cloud-info-item">
        <h3>命格天定</h3>
        <p class="cloud-info-text">
          联机模式下，角色的初始命格将由所选世界的天道法则在云端生成，以确保公平与平衡。
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCharacterCreationStore } from '../../stores/characterCreationStore'
const store = useCharacterCreationStore()

const props = defineProps<{
  isLocalCreation: boolean
}>()

const incrementAge = () => {
  if (store.characterPayload.current_age < 18) {
    store.characterPayload.current_age++
  }
}

const decrementAge = () => {
  if (store.characterPayload.current_age > 0) {
    store.characterPayload.current_age--
  }
}
</script>

<style scoped>
/* 主容器 */
.preview-container {
  height: 100%;
  padding: 2rem;
  box-sizing: border-box;
  overflow-y: auto;
}

/* 标题 */
.title {
  text-align: center;
  color: var(--color-accent);
  margin: 0 0 0.5rem 0;
  font-family: var(--font-family-serif);
  font-size: 2rem;
  font-weight: 600;
}

.subtitle {
  text-align: center;
  color: var(--color-text-secondary);
  margin: 0 0 2rem 0;
  font-size: 1rem;
  opacity: 0.8;
}

/* 网格布局 */
.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

/* 基础卡片样式 */
.preview-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preview-item h3 {
  margin: 0;
  color: var(--color-primary);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.preview-item p {
  margin: 0;
  font-size: 1rem;
  color: var(--color-text);
  line-height: 1.5;
}

.preview-item h4 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.item-description {
  font-size: 0.9rem !important;
  color: var(--color-text-secondary) !important;
  margin-top: 0.5rem !important;
  opacity: 0.9;
}

.talents-item li .item-description {
  margin-top: 0.25rem !important;
  padding-left: 0.5rem;
  border-left: 2px solid var(--color-border);
}

/* 名字输入 */
.name-item {
  grid-column: 1 / -1;
}

.name-item label {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 0.5rem;
  display: block;
}

.name-item input {
  width: 100%;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.name-item input:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* 性别选择 */
.gender-control {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.gender-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
  color: var(--color-text);
}

.gender-label:hover {
  background: var(--color-surface-light);
}

.gender-label input[type="radio"] {
  width: 16px;
  height: 16px;
  margin: 0;
}

/* 年龄控制 */
.age-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.age-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.age-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.age-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.age-display {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  min-width: 60px;
  text-align: center;
}

/* 列表样式 */
.preview-item ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.preview-item li {
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background: var(--color-surface-light);
  border-radius: 4px;
  color: var(--color-text);
  line-height: 1.4;
}

.preview-item li strong {
  display: block;
  margin-bottom: 0.25rem;
  color: var(--color-primary);
}

/* 云端信息 */
.cloud-info-item {
  text-align: center;
  background: var(--color-surface-light);
  border: 1px dashed var(--color-border);
}

.cloud-info-text {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  font-style: italic;
}

/* 响应式 */
@media (max-width: 768px) {
  .preview-container {
    padding: 1rem;
  }
  
  .preview-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .gender-control {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-around;
  }
  
  .gender-label {
    flex: 1;
    min-width: 80px;
    justify-content: center;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .preview-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 暗色主题 */
[data-theme="dark"] .preview-item {
  background: #1f2937;
  border-color: #374151;
}

[data-theme="dark"] .name-item input {
  background: #111827;
  border-color: #374151;
  color: #f9fafb;
}

[data-theme="dark"] .gender-label:hover {
  background: #374151;
}

[data-theme="dark"] .age-btn {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

[data-theme="dark"] .preview-item li {
  background: #374151;
  color: #e5e7eb;
}

[data-theme="dark"] .cloud-info-item {
  background: #374151;
}

@media (max-width: 480px) {
  .preview-container {
    padding: 1rem;
  }

  .title {
    font-size: 1.6rem;
  }

  .subtitle {
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
  }

  .preview-item {
    padding: 1rem;
    gap: 0.8rem;
  }

  .preview-item h3 {
    font-size: 1rem;
  }

  .preview-item h4 {
    font-size: 1rem;
  }

  .item-description {
    font-size: 0.85rem !important;
  }

  .name-item label {
    font-size: 1rem;
  }

  .name-item input {
    padding: 0.6rem;
    font-size: 0.9rem;
  }

  .gender-label {
    font-size: 0.9rem;
    padding: 0.4rem;
  }

  .age-control {
    gap: 0.8rem;
  }

  .age-btn {
    width: 28px;
    height: 28px;
    font-size: 0.9rem;
  }

  .age-display {
    font-size: 1rem;
  }

  .preview-item li {
    padding: 0.6rem;
  }
}
</style>
