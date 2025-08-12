<template>
  <div class="main-game-container">
    <!-- 各类面板 -->
    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
    <UgcUploader v-if="showUgcUploader" @close="showUgcUploader = false" />
    <WorldBookEditor v-if="showWorldBookEditor" @close="showWorldBookEditor = false" />

    <!-- 左侧：万界殿 - 存档管理 -->
    <div class="sidebar">
      <h2 class="sidebar-title">万界殿</h2>
      <ul class="character-slots">
        <li
          v-for="(slot, index) in characterSlots"
          :key="slot.character.name + index"
          class="slot-item"
          :class="{ active: activeCharacter === slot }"
          @click="setActiveCharacter(index)"
        >
          {{ slot.character.name }}
        </li>
      </ul>
      <div class="sidebar-buttons">
        <button class="sidebar-button" @click="showWorldBookEditor = true">世界书</button>
        <button class="sidebar-button" @click="showUgcUploader = true">传法台</button>
        <button class="sidebar-button" @click="showSettings = true">炼丹房</button>
        <button class="sidebar-button" @click="handleCreateCharacter">开辟新命盘</button>
      </div>
    </div>

    <!-- 右侧：主洞天 - 角色信息 -->
    <div class="main-content">
      <div v-if="activeCharacter" class="character-sheet">
        <h1 class="character-name">{{ activeCharacter?.character.name }}</h1>
        <p class="character-description">{{ activeCharacter?.character.description }}</p>

        <div class="attribute-grid">
          <div
            v-for="(value, key) in activeCharacter?.character.attributes"
            :key="key"
            class="attribute-item"
          >
            <span class="attribute-name">{{
              CORE_ATTRIBUTES[key as keyof typeof CORE_ATTRIBUTES]
            }}</span>
            <span class="attribute-value">{{ value }}</span>
          </div>
        </div>

        <div class="memory-shards">
          <h3 class="shards-title">天魂记忆碎片</h3>
          <ul v-if="activeCharacter?.character.memory_shards.length > 0">
            <li v-for="shard in activeCharacter?.character.memory_shards" :key="shard">
              {{ shard }}
            </li>
          </ul>
          <p v-else>记忆长河一片空寂...</p>
        </div>
      </div>
      <div v-else class="no-character-prompt">
        <p>万界殿空无一物，请先开辟新命盘。</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGameState } from '@/composables/useGameState'
import { CORE_ATTRIBUTES } from '@/core/rules/characterCreation'
import SettingsPanel from '@/components/SettingsPanel.vue'
import UgcUploader from '@/components/UgcUploader.vue'
import WorldBookEditor from '@/components/WorldBookEditor.vue'

const { characterSlots, activeCharacter, setActiveCharacter, loadGameState } = useGameState()

const showSettings = ref(false)
const showUgcUploader = ref(false)
const showWorldBookEditor = ref(false)

onMounted(loadGameState)

const handleCreateCharacter = () => {
  characterSlots.value = []
}
</script>

<style scoped>
.main-game-container {
  display: flex;
  height: 100vh;
  background: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-family-serif);
}

.sidebar {
  width: 280px;
  background: var(--color-surface);
  padding: 1.5rem;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
}

.sidebar-title {
  font-size: 1.8rem;
  color: var(--color-primary);
  text-align: center;
  margin-bottom: 2rem;
  text-shadow: 0 0 10px var(--color-primary-hover);
}

.character-slots {
  list-style: none;
  padding: 0;
  margin: 0;
  flex-grow: 1;
  overflow-y: auto;
}

.slot-item {
  padding: 0.75rem 1.25rem;
  margin-bottom: 0.75rem;
  background: var(--color-surface-light);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 5px solid transparent;
  font-size: 1.1rem;
}

.slot-item:hover {
  background: var(--color-primary-hover);
  color: var(--color-background);
  transform: translateX(5px);
  border-left-color: var(--color-accent);
}

.slot-item.active {
  background: var(--color-primary);
  color: var(--color-background);
  font-weight: bold;
  border-left-color: var(--color-accent-hover);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.sidebar-buttons {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sidebar-button {
  padding: 0.75rem;
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  font-size: 1rem;
  transition: all 0.3s;
}

.sidebar-button:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  color: var(--color-background);
}

.main-content {
  flex-grow: 1;
  padding: 3rem;
  overflow-y: auto;
}

.character-sheet {
  max-width: 900px;
  margin: 0 auto;
}

.character-name {
  font-size: 3.5rem;
  color: var(--color-primary);
  margin-bottom: 1rem;
  font-weight: bold;
}

.character-description {
  font-size: 1.2rem;
  color: var(--color-text-secondary);
  margin-bottom: 3rem;
  line-height: 1.7;
  font-style: italic;
  border-left: 3px solid var(--color-accent);
  padding-left: 1rem;
}

.attribute-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.attribute-item {
  background: var(--color-surface);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  border: 1px solid var(--color-border);
  transition: all 0.3s ease;
}

.attribute-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.attribute-name {
  display: block;
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.75rem;
}

.attribute-value {
  font-size: 2rem;
  font-weight: bold;
  color: var(--color-primary);
}

.memory-shards {
  background: var(--color-surface-light);
  padding: 2rem;
  border-radius: 12px;
}

.shards-title {
  font-size: 1.8rem;
  color: var(--color-primary);
  margin-bottom: 1.5rem;
}

.memory-shards ul {
  list-style-type: '✧ ';
  padding-left: 2rem;
  color: var(--color-text);
}

.memory-shards li {
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
}

.no-character-prompt {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 1.8rem;
  color: var(--color-text-secondary);
}
</style>
