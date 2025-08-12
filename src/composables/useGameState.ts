import { ref, computed, onMounted } from 'vue'
import { getUserInfo } from '@/services/tavern'
// import { getCharacter as getCharacterFromApi } from '@/services/api' // TODO: Refactor for new API
import type { WorldState, CharacterSheet } from '@/core/rules/characterCreation'
import { useGameMode } from './useGameMode'

const characterSlots = ref<WorldState[]>([])
const activeSlotIndex = ref<number | null>(null)

export function useGameState() {
  const { initializeGameMode, hasModeSelected } = useGameMode()

  const loadGameState = async () => {
    initializeGameMode()

    if (!hasModeSelected.value) {
      console.log('未选择游戏模式，暂停加载游戏状态。')
      return
    }

    characterSlots.value = []
    activeSlotIndex.value = null

    try {
      // TODO: Refactor this entire function for the new online mode,
      // which will involve fetching a list of characters for the current user/world.
      console.log('TODO: Refactor loadGameState for online mode.')
    } catch (error) {
      console.error('加载游戏状态时出错:', error)
    }
  }

  onMounted(async () => {
    // 确保在加载状态前，模式已初始化
    initializeGameMode()
    if (hasModeSelected.value) {
      await loadGameState()
    }
  })

  // 计算属性：返回当前活跃的角色世界状态
  const activeCharacter = computed<WorldState | null>(() => {
    if (activeSlotIndex.value !== null && characterSlots.value[activeSlotIndex.value]) {
      return characterSlots.value[activeSlotIndex.value]
    }
    return null
  })

  // 计算属性：判断是否存在任何角色存档
  const isAnyCharacterCreated = computed(() => characterSlots.value.length > 0)

  // 方法：设置当前活跃的存档
  const setActiveCharacter = (index: number) => {
    if (index >= 0 && index < characterSlots.value.length) {
      activeSlotIndex.value = index
    } else {
      console.error(`尝试设置一个无效的存档索引: ${index}`)
    }
  }

  // 方法：添加一个新的存档
  const addNewCharacterSlot = (newWorldState: WorldState) => {
    characterSlots.value.push(newWorldState)
    // 自动将新存档设为活跃
    activeSlotIndex.value = characterSlots.value.length - 1
  }

  return {
    characterSlots, // 所有存档的列表
    activeCharacter, // 当前活跃的存档 (替代旧的 worldState)
    isAnyCharacterCreated, // 替代旧的 isCharacterCreated
    loadGameState,
    setActiveCharacter,
    addNewCharacterSlot,
  }
}
