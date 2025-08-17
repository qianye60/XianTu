<template>
  <div class="preview-container">
    <h2 class="title">最终预览</h2>
    <p class="subtitle">请确认你的选择，此为踏入仙途的最后一步。</p>

    <div class="preview-grid">
      <!-- Character Name -->
      <div class="preview-item name-item">
        <label for="characterName">道号:</label>
        <input type="text" id="characterName" class="named" v-model="store.characterPayload.character_name" />
      </div>

      <!-- Birth Age -->
      <div class="preview-item age-item">
        <label for="birthAge">转世因果·初始年龄:</label>
        <input
          type="number"
          id="birthAge"
          v-model.number="store.characterPayload.birth_age"
          min="0"
          max="18"
          placeholder="16"
        />
        <span class="age-hint">0-18岁</span>
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
        <p>{{ store.selectedOrigin?.name || '未选择' }}</p>
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
      <div class="preview-item attributes-item">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCharacterCreationStore } from '../../stores/characterCreationStore'
const store = useCharacterCreationStore()
</script>

<style scoped>
.named{
  min-wight: 0;
}
.preview-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: #c8ccd4;
}

.title {
  text-align: center;
  color: #e5c07b;
  margin-top: 0;
}

.subtitle {
  text-align: center;
  color: #888;
  margin-bottom: 2rem;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  overflow-y: auto;
  flex-grow: 1;
  padding: 0.5rem;
}

.preview-item {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid #444;
  border-radius: 8px;
  padding: 1rem;
}

.preview-item h3 {
  margin-top: 0;
  color: #88c0d0;
  border-bottom: 1px solid #555;
  padding-bottom: 0.5rem;
  margin-bottom: 0.8rem;
  font-size: 1rem;
}

.preview-item p {
  margin: 0;
  font-size: 1.1rem;
}

.name-item {
  grid-column: 1 / 3;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.age-item {
  grid-column: 3 / -1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.name-item label,
.age-item label {
  font-size: 1.1rem;
  font-weight: bold;
  color: #e5c07b;
  white-space: nowrap;
}

.name-item input,
.age-item input {
  flex-grow: 1;
  background: #2a2a2a;
  border: 1px solid #555;
  color: white;
  padding: 0.8rem;
  border-radius: 6px;
  font-size: 1.1rem;
}

.age-item input {
  max-width: 80px;
  text-align: center;
}

.age-hint {
  font-size: 0.8rem;
  color: #888;
  white-space: nowrap;
}

.talents-item,
.attributes-item {
  grid-row: span 2;
}

.preview-item ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.preview-item li {
  margin-bottom: 0.5rem;
}
</style>
