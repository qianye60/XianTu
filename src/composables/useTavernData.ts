import { ref, computed } from 'vue'
import { getTavernHelper } from '@/utils/tavern'
import type { CharacterBaseInfo, WorldInfo, Memory, SaveData } from '@/types/game'

export interface TavernCharacterData extends Partial<CharacterBaseInfo> {
  name?: string
  id?: string
  created?: string
  updated?: string
  [key: string]: unknown
}

export interface TavernWorldInfo extends Partial<WorldInfo> {
  名称?: string
  [key: string]: unknown
}

type TavernVariableValue = string | number | boolean | object | null | undefined

export interface AllTavernData {
  chat: Record<string, TavernVariableValue>
  global: Record<string, TavernVariableValue>
  character: TavernCharacterData | null
  saveData: SaveData | Record<string, TavernVariableValue>
  worldInfo: TavernWorldInfo | null
  memory: Memory | null
}

export function useTavernData() {
  const chatVariables = ref<Record<string, TavernVariableValue>>({})
  const globalVariables = ref<Record<string, TavernVariableValue>>({})
  const characterData = ref<TavernCharacterData | null>(null)
  const saveData = ref<SaveData | Record<string, TavernVariableValue>>({})
  const worldInfo = ref<TavernWorldInfo | null>(null)
  const memoryData = ref<Memory | null>(null)
  
  const allTavernData = computed<AllTavernData>(() => ({
    chat: chatVariables.value,
    global: globalVariables.value,
    character: characterData.value,
    saveData: saveData.value,
    worldInfo: worldInfo.value,
    memory: memoryData.value
  }))

  const refreshTavernData = async () => {
    const helper = getTavernHelper()
    if (!helper) return

    console.log('[酒馆数据] 开始获取变量数据...')

    const [chatVars, globalVars] = await Promise.all([
      Promise.resolve(helper.getVariables({ type: 'chat' })).catch((error) => {
        console.error('[酒馆数据] 获取聊天变量失败:', error)
        return {}
      }),
      Promise.resolve(helper.getVariables({ type: 'global' })).catch((error) => {
        console.error('[酒馆数据] 获取全局变量失败:', error)
        return {}
      })
    ])

    chatVariables.value = (chatVars || {}) as Record<string, TavernVariableValue>
    globalVariables.value = (globalVars || {}) as Record<string, TavernVariableValue>

    if (chatVars) {
      const chat = (chatVars || {}) as Record<string, TavernVariableValue>
      characterData.value = (chat['character'] ||
                           chat['character.profile'] ||
                           chat['character.baseInfo'] ||
                           null) as TavernCharacterData | null

      saveData.value = (chat['character.saveData'] || {}) as SaveData | Record<string, TavernVariableValue>

      if (saveData.value && typeof saveData.value === 'object') {
        const saveDataObj = saveData.value as Record<string, TavernVariableValue>
        worldInfo.value = (saveDataObj['世界信息'] ||
                         saveDataObj['worldInfo'] ||
                         chat['worldInfo'] ||
                         chat['world.info'] ||
                         null) as TavernWorldInfo | null

        memoryData.value = (saveDataObj['记忆'] ||
                          saveDataObj['memory'] ||
                          chat['memory'] ||
                          chat['character.memory'] ||
                          null) as Memory | null
      } else {
        worldInfo.value = (chat['worldInfo'] || chat['world.info'] || null) as TavernWorldInfo | null
        memoryData.value = (chat['memory'] || chat['character.memory'] || null) as Memory | null
      }
    }
  }

  return {
    chatVariables,
    globalVariables,
    characterData,
    saveData,
    worldInfo,
    memoryData,
    allTavernData,
    refreshTavernData
  }
}