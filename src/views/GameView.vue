<template>
  <div class="game-view-container">
    <LoadingModal :visible="isGeneratingWorld" message="正在开辟鸿蒙，生成此方世界..." />

    <div v-if="character" class="character-panel">
      <h1>道友：{{ character.character_name }}</h1>
      <p>境界：{{ character.realm }}</p>
    </div>

    <div v-if="worldData" class="world-panel">
        <h2>世界：{{ worldData.continentName }}</h2>
        <p>{{ worldData.continentDescription }}</p>
        <!-- TODO: Render factions -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { LocalCharacterWithGameData } from '../data/localData'
import { saveLocalCharacter } from '../data/localData'
import { generateWorldData, updateWorldBook } from '../utils/tavernAI'
import LoadingModal from '../components/LoadingModal.vue'

const props = defineProps<{
  character: LocalCharacterWithGameData | null
}>()

const isGeneratingWorld = ref(false)
const worldData = ref<any>(null) // 用于存储生成的世界信息

onMounted(async () => {
  if (props.character) {
    // 检查角色的世界数据是否已存在且有效
    if (props.character.worldData && props.character.worldData.continentName) {
      worldData.value = props.character.worldData
    } else {
      // 如果不存在，则开始生成
      isGeneratingWorld.value = true
      try {
        const generatedData = await generateWorldData();
        worldData.value = generatedData;
        
        // 将生成的世界数据保存回角色存档
        const updatedCharacter = {
          ...props.character,
          worldData: generatedData
        };
        await saveLocalCharacter(updatedCharacter);
        
        // 将世界书也一并更新
        await updateWorldBook(generatedData);

      } catch (error) {
        console.error('生成世界失败:', error)
        // 可以在这里添加一个错误状态，让UI显示生成失败
      } finally {
        isGeneratingWorld.value = false
      }
    }
  }
})
</script>

<style scoped>
.game-view-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
  background: var(--color-background);
  padding: 2rem;
  box-sizing: border-box;
}

.character-panel, .world-panel {
  background: var(--color-surface);
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  margin-bottom: 1rem;
  text-align: center;
}

h1 {
  color: var(--color-primary);
}
</style>