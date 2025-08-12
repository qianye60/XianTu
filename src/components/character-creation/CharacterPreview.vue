<template>
  <div class="panel character-preview">
    <h3 class="panel-title">【 命盘一览 】</h3>
    <div v-if="props.characterData" class="info-grid">
      <div class="info-item">
        <label>道号</label>
        <span>{{ props.characterData.name }}</span>
      </div>
      <div class="info-item">
        <label>出身</label>
        <span>{{ props.characterData.origin.name }}</span>
      </div>
      <div class="info-item">
        <label>灵根</label>
        <span>{{ props.characterData.spiritRoot.name }}</span>
      </div>
      <div class="info-item full-width">
        <label>天赋</label>
        <span>{{ props.characterData.talents.map((t: any) => t.name).join('、 ') }}</span>
      </div>
      <div class="info-item" v-for="(name, key) in CORE_ATTRIBUTES" :key="key">
        <label>{{ name }}</label>
        <span>{{ props.characterData.attributes[key as keyof typeof props.characterData.attributes] }}</span>
      </div>
    </div>
    <div class="description-box">
      <label>命格判词</label>
      <p>{{ props.characterData.description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CORE_ATTRIBUTES, type CharacterSheet } from '@/core/rules/characterCreation'

const props = defineProps<{
  characterData: CharacterSheet
}>()
</script>

<style scoped>
.character-preview {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: rgba(10, 20, 30, 0.5);
  border: 1px solid rgba(255, 215, 0, 0.4);
  border-radius: 10px;
  padding: 1.5rem;
}
.panel-title {
  text-align: center;
  color: #ffd700;
  margin-bottom: 1rem;
  font-size: 1.5rem;
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}
.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.2);
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.info-item.full-width {
  grid-column: 1 / -1;
}
.info-item label {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
}
.info-item span {
  font-weight: bold;
  color: #ffd700;
  text-align: right;
}
.description-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.description-box label {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
}
.description-box p {
  background-color: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.75rem;
  color: #fff;
  margin: 0;
  line-height: 1.6;
}
</style>
