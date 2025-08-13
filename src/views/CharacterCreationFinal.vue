<template>
  <CharacterCreationCore
    :character-name="userName"
    :steps="steps"
    :worlds="characterData.worlds"
    :origins="characterData.origins"
    :talents="characterData.talents"
    :spirit-roots="characterData.spiritRoots"
    :is-loading="isLoading"
    loading-text="天机推演中，正在为您开辟洞天，请稍候..."
    @finalize="handleFinalize"
    @back="handleBack"
  >
    <template #header-extension>
      <div v-if="isUsingLocalData" class="server-sync-section">
        <p class="local-data-hint">当前使用本地数据，可尝试从天宫灵脉获取更多选项</p>
        <button
          @click="loadServerData"
          :disabled="isLoadingServerData"
          class="btn btn-secondary sync-btn"
        >
          {{ isLoadingServerData ? '正在连接天宫灵脉...' : '获取天宫数据' }}
        </button>
      </div>
      <div v-else class="server-sync-section">
        <p class="server-data-hint">已从天宫灵脉获取数据</p>
      </div>
    </template>

  </CharacterCreationCore>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getOrigins, getTalents, getSpiritRoots, getWorldBackgrounds } from '@/services/api'
import {
  DEFAULT_WORLDS,
  EXTENDED_ORIGINS,
  EXTENDED_TALENTS,
  EXTENDED_SPIRIT_ROOTS,
} from '@/core/data/database_seed'
import { useGameMode } from '@/composables/useGameMode'
import { type World, type Origin, type Talent, type SpiritRoot, type CharacterSheet, type WorldState } from '@/core/rules/characterCreation'
import { getUserInfo } from '@/services/tavern'
import { useGameState } from '@/composables/useGameState'

import CharacterCreationCore from '@/components/character-creation/CharacterCreationCore.vue'


const { addNewCharacterSlot } = useGameState()
const { clearGameMode } = useGameMode()

const isLoading = ref(true)
const isLoadingServerData = ref(false)
const isUsingLocalData = ref(false)
const userName = ref('道友')

const steps = [
  { id: 'world', name: '择世界', icon: 'fas fa-globe' },
  { id: 'origin', name: '择出身', icon: 'fas fa-scroll' },
  { id: 'spirit-root', name: '觅灵根', icon: 'fas fa-seedling' },
  { id: 'talents', name: '选天赋', icon: 'fas fa-star' },
  { id: 'attributes', name: '定根骨', icon: 'fas fa-fist-raised' },
  { id: 'preview', name: '观命盘', icon: 'fas fa-book-open' },
]

const characterData = reactive<{
  worlds: World[]
  origins: Origin[]
  talents: Talent[]
  spiritRoots: SpiritRoot[]
}>({
  worlds: [],
  origins: [],
  talents: [],
  spiritRoots: []
})

const handleFinalize = (finalSheet: CharacterSheet) => {
  console.log('Final character sheet received from core component:', finalSheet)

  const newWorldState: WorldState = {
    character: finalSheet,
    time: { year: 1, month: 1, day: 1 },
    location: '新手村',
    events: [],
    flags: {},
  }

  addNewCharacterSlot(newWorldState)
  console.log(`命盘【${finalSheet.name}】已成功缔造！`);
  clearGameMode()
}

const handleBack = () => {
  clearGameMode()
}


const loadServerData = async () => {
  isLoadingServerData.value = true
  try {
    const [worldsData, originsData, talentsData, spiritRootsData] = await Promise.all([
      getWorldBackgrounds(),
      getOrigins(),
      getTalents(),
      getSpiritRoots(),
    ])
    characterData.worlds = worldsData
    characterData.origins = originsData
    characterData.talents = talentsData
    characterData.spiritRoots = spiritRootsData
    isUsingLocalData.value = false
    console.log('成功从天宫灵脉获取修行数据！');
  } catch (error) {
    console.error('获取服务器数据失败:', error)
    console.error('无法连接天宫灵脉，请检查网络连接或稍后再试。');
  } finally {
    isLoadingServerData.value = false
  }
}

const useLocalData = () => {
  characterData.worlds = DEFAULT_WORLDS
  characterData.origins = EXTENDED_ORIGINS
  characterData.talents = EXTENDED_TALENTS
  characterData.spiritRoots = EXTENDED_SPIRIT_ROOTS
  isUsingLocalData.value = true
}

onMounted(async () => {
  isLoading.value = true
  try {
    const userData = await getUserInfo()
    userName.value = userData.name
    useLocalData()
  } catch (error) {
    console.error('初始化失败:', error)
    console.error('身份识别失败，将使用默认道号。');
    useLocalData()
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.server-sync-section {
  padding: 1rem;
  background-color: rgba(var(--color-primary-rgb), 0.05);
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
}

.local-data-hint, .server-data-hint {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin: 0;
  font-style: italic;
}

.server-data-hint {
  color: var(--color-nature, #22c55e);
}

.sync-btn {
  font-size: 0.9rem;
  padding: 0.5rem 1.5rem;
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-primary) 100%);
  border: none;
  color: white;
  border-radius: 20px;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.sync-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.sync-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
