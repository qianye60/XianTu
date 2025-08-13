import { ref, computed } from 'vue'
import { getUserInfo } from '@/services/tavern'
// import { getCharacter as getCharacterFromApi } from '@/services/api' // TODO: Refactor for new API
import type { WorldState, CharacterSheet } from '@/core/rules/characterCreation'

const characterSlots = ref<WorldState[]>([])
const activeSlotIndex = ref<number | null>(null)

export function useGameState() {
  const isLoading = ref(false)

  const loadGameState = async () => {
    isLoading.value = true
    try {
      // 尝试从本地存储加载角色数据
      try {
        const savedSlots = localStorage.getItem('characterSlots')
        const savedActiveIndex = localStorage.getItem('activeSlotIndex')
        
        if (savedSlots) {
          characterSlots.value = JSON.parse(savedSlots)
        } else {
          characterSlots.value = []
        }
        
        if (savedActiveIndex) {
          activeSlotIndex.value = parseInt(savedActiveIndex)
        } else {
          activeSlotIndex.value = null
        }
        
        console.log('从本地存储加载角色数据完成，共', characterSlots.value.length, '个存档')
      } catch (error) {
        console.error('从本地存储加载角色数据失败:', error)
        characterSlots.value = []
        activeSlotIndex.value = null
      }

      // TODO: Refactor this entire function for the new online mode,
      // which will involve fetching a list of characters for the current user/world.
      console.log('TODO: Refactor loadGameState for online mode.')

    } catch (error) {
      console.error('加载游戏状态时出错:', error)
    } finally {
      // 无论成功、失败或提前返回，最终都确保关闭加载状态
      isLoading.value = false
    }
  }

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

  // 保存数据到本地存储
  const saveToLocalStorage = () => {
    try {
      localStorage.setItem('characterSlots', JSON.stringify(characterSlots.value))
      localStorage.setItem('activeSlotIndex', activeSlotIndex.value?.toString() || '')
      console.log('角色数据已保存到本地存储')
    } catch (error) {
      console.error('保存角色数据到本地存储失败:', error)
    }
  }

  // 方法：设置当前活跃的存档
  const setActiveCharacterWithSave = (index: number) => {
    setActiveCharacter(index)
    saveToLocalStorage()
  }

  // 方法：添加一个新的存档
  const addNewCharacterSlot = (newWorldState: WorldState) => {
    characterSlots.value.push(newWorldState)
    // 自动将新存档设为活跃
    activeSlotIndex.value = characterSlots.value.length - 1
    saveToLocalStorage()
  }

  return {
    isLoading,
    characterSlots, // 所有存档的列表
    activeCharacter, // 当前活跃的存档 (替代旧的 worldState)
    isAnyCharacterCreated, // 替代旧的 isCharacterCreated
    loadGameState,
    setActiveCharacter: setActiveCharacterWithSave,
    addNewCharacterSlot,
  }
}
