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
        <p>{{ store.selectedWorld?.name || '未选择' }}</p>
      </div>

      <!-- Talent Tier -->
      <div class="preview-item">
        <h3>天资</h3>
        <p :style="{ color: store.selectedTalentTier?.color || 'inherit' }">
          {{ store.selectedTalentTier?.name || '未选择' }}
        </p>
      </div>

      <!-- Origin -->
      <div class="preview-item">
        <h3>出身</h3>
        <p>{{ store.selectedOrigin?.name || '随机出身' }}</p>
      </div>

      <!-- Spirit Root -->
      <div class="preview-item">
        <h3>灵根</h3>
        <p>{{ store.selectedSpiritRoot?.name || '随机灵根' }}</p>
      </div>

      <!-- Talents -->
      <div class="preview-item talents-item">
        <h3>天赋</h3>
        <ul v-if="store.selectedTalents.length">
          <li v-for="talent in store.selectedTalents" :key="talent.id">{{ talent.name }}</li>
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
.named {
  min-width: 0; /* 修正笔误，允许输入框在flex布局中正确收缩 */
}
.preview-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--color-text);
  padding: 1.5rem;
  box-sizing: border-box;
}

.title {
  text-align: center;
  color: var(--color-accent);
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-family: var(--font-family-serif);
  font-size: 2.2rem;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.subtitle {
  text-align: center;
  color: var(--color-text-secondary);
  margin-bottom: 2rem;
  font-size: 1.1rem;
  font-style: italic;
  opacity: 0.9;
  letter-spacing: 0.05em;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  overflow-y: auto;
  flex-grow: 1;
  padding: 1.5rem;
  justify-content: center;
  align-content: start;
  max-height: calc(100vh - 200px);
}

.preview-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: visible;
  min-height: auto;
  height: auto;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.preview-item:hover {
  border-color: var(--color-primary);
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(var(--color-primary-rgb), 0.15),
              0 4px 12px rgba(0, 0, 0, 0.1);
}

.preview-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(var(--color-primary-rgb), 0.6), 
    transparent
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}

.preview-item:hover::before {
  opacity: 1;
}

.preview-item h3 {
  margin-top: 0;
  color: var(--color-primary);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.6rem;
  margin-bottom: 1rem;
  font-size: 1.1rem;
  font-family: var(--font-family-serif);
  font-weight: 600;
  letter-spacing: 0.03em;
}

.preview-item p, .preview-item li {
  margin: 0;
  font-size: 1rem;
  color: var(--color-text) !important;
  line-height: 1.5;
}

.preview-item span {
  color: var(--color-text) !important;
}

.preview-item ul {
  color: var(--color-text) !important;
}

.name-item {
  grid-column: span 2;
  display: flex;
  align-items: center;
  gap: 1.2rem;
  min-height: auto;
}

.age-item, .gender-item {
  grid-column: span 1;
  min-height: auto;
  height: auto;
}

.age-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 0;
}

.age-btn {
  width: 40px;
  height: 40px;
  border: 2px solid var(--color-border);
  background: linear-gradient(135deg, var(--color-surface-light), var(--color-surface));
  color: var(--color-text);
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.4rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.age-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: radial-gradient(circle, rgba(var(--color-primary-rgb), 0.2), transparent);
  border-radius: 50%;
  transition: all 0.3s ease;
  transform: translate(-50%, -50%);
}

.age-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--color-primary), rgba(var(--color-primary-rgb), 0.9));
  color: var(--color-background);
  border-color: var(--color-primary);
  transform: scale(1.1) translateY(-2px);
  box-shadow: 0 6px 20px rgba(var(--color-primary-rgb), 0.3);
}

.age-btn:hover:not(:disabled)::before {
  width: 100%;
  height: 100%;
}

.age-btn:active:not(:disabled) {
  transform: scale(1.05) translateY(-1px);
}

.age-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: var(--color-surface);
  transform: none;
  box-shadow: none;
}

.age-display {
  font-size: 1rem;
  font-weight: bold;
  color: var(--color-text) !important;
  min-width: 50px;
  text-align: center;
}

.gender-control {
  display: flex;
  gap: 0.8rem;
  align-items: center;
  justify-content: flex-start;
  padding: 1rem 0;
  flex-wrap: wrap;
}

.gender-label {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  padding: 0.6rem 1rem;
  border-radius: 20px;
  background: var(--color-surface-light);
  border: 2px solid var(--color-border);
  transition: all 0.3s ease;
  user-select: none;
  color: var(--color-text) !important;
  white-space: nowrap;
  flex-shrink: 0;
}

.gender-label:hover {
  background: rgba(var(--color-primary-rgb), 0.1);
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.15);
}

.gender-label input[type="radio"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.gender-label input[type="radio"]:checked + span {
  color: var(--color-background);
}

.gender-label:has(input[type="radio"]:checked) {
  background: linear-gradient(135deg, var(--color-primary), rgba(var(--color-primary-rgb), 0.8));
  border-color: var(--color-primary);
  color: var(--color-background);
  box-shadow: 0 6px 20px rgba(var(--color-primary-rgb), 0.3);
  transform: translateY(-3px);
}

.gender-label span {
  position: relative;
  transition: color 0.3s ease;
  font-weight: 600;
}

.name-item label,
.age-item label {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--color-accent);
  white-space: nowrap;
}

.name-item input,
.age-item input {
  flex-grow: 1;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 0.9rem;
  border-radius: 8px;
  font-size: 1.1rem;
  transition: all 0.3s ease;
}
.name-item input:focus,
.age-item input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 15px rgba(var(--color-primary-rgb), 0.3);
}

.age-item input {
  max-width: 80px;
  text-align: center;
}

.age-hint {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.talents-item,
.attributes-item,
.cloud-info-item {
  grid-column: 1 / -1; /* 在较小屏幕上，让它们占据整行 */
  min-height: auto;
  height: auto;
}

.talents-item ul,
.attributes-item ul {
  margin: 0.5rem 0;
  padding: 0;
  max-height: none;
  overflow: visible;
}

.talents-item li,
.attributes-item li {
  margin-bottom: 0.8rem;
  padding-left: 1.2em;
  line-height: 1.4;
  word-wrap: break-word;
}

@media (min-width: 768px) {
  .preview-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
    padding: 2rem;
  }
  
  .talents-item,
  .attributes-item,
  .cloud-info-item {
    grid-column: span 1;
  }
}

@media (min-width: 1024px) {
  .preview-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 2rem;
    padding: 2rem;
  }
  .talents-item {
    grid-column: span 1;
  }
  .attributes-item,
  .cloud-info-item {
    grid-column: span 1;
  }
}

@media (max-width: 767px) {
  .preview-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    padding: 1rem;
  }
  .name-item, 
  .age-item, 
  .gender-item {
    grid-column: span 1;
  }
  .talents-item,
  .attributes-item,
  .cloud-info-item {
    grid-column: span 1;
  }
}

.cloud-info-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  background: rgba(var(--color-primary-rgb), 0.05);
  position: relative;
}

.cloud-info-item::after {
  content: '☁';
  position: absolute;
  top: 0.5rem;
  right: 0.8rem;
  font-size: 1.2rem;
  color: var(--color-primary);
  opacity: 0.6;
}

.cloud-info-text {
  font-size: 1rem;
  color: var(--color-text-secondary) !important;
  line-height: 1.7;
  font-style: italic;
  opacity: 0.9;
}


.preview-item ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.preview-item li {
  margin-bottom: 0.5rem;
  padding-left: 1em;
  position: relative;
}
.preview-item li::before {
  content: '◆';
  position: absolute;
  left: 0;
  color: var(--color-primary);
  font-size: 0.9em;
}
</style>
