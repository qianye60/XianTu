import { computed, type Ref } from 'vue'
import type { CharacterBaseInfo, WorldInfo, Memory, SaveData } from '@/types/game'

type TavernVariableValue = string | number | boolean | object | null | undefined

interface TavernCharacterData extends Partial<CharacterBaseInfo> {
  name?: string
  id?: string
  created?: string
  updated?: string
  [key: string]: unknown
}

interface TavernWorldInfo extends Partial<WorldInfo> {
  名称?: string
  [key: string]: unknown
}

interface UseTavernVariablesParams {
  chatVariables: Ref<Record<string, TavernVariableValue>>
  globalVariables: Ref<Record<string, TavernVariableValue>>
  characterData: Ref<TavernCharacterData | null>
  saveData: Ref<SaveData | Record<string, TavernVariableValue>>
  worldInfo: Ref<TavernWorldInfo | null>
  memoryData: Ref<Memory | null>
  searchQuery: Ref<string>
}

export function useTavernVariables(params: UseTavernVariablesParams) {
  const {
    chatVariables,
    globalVariables,
    characterData,
    saveData,
    worldInfo,
    memoryData,
    searchQuery
  } = params

  const filteredChatVariables = computed(() => {
    if (!searchQuery.value) return chatVariables.value
    const query = searchQuery.value.toLowerCase()
    const filtered: Record<string, TavernVariableValue> = {}
    Object.entries(chatVariables.value).forEach(([key, value]) => {
      if (key.toLowerCase().includes(query) ||
          JSON.stringify(value).toLowerCase().includes(query)) {
        filtered[key] = value
      }
    })
    return filtered
  })

  const filteredGlobalVariables = computed(() => {
    if (!searchQuery.value) return globalVariables.value
    const query = searchQuery.value.toLowerCase()
    const filtered: Record<string, TavernVariableValue> = {}
    Object.entries(globalVariables.value).forEach(([key, value]) => {
      if (key.toLowerCase().includes(query) ||
          JSON.stringify(value).toLowerCase().includes(query)) {
        filtered[key] = value
      }
    })
    return filtered
  })

  const shortMem = computed<any[]>(() => {
    const mem: any = memoryData.value || {}
    return Array.isArray(mem['短期记忆']) ? mem['短期记忆'] : Array.isArray(mem.short_term) ? mem.short_term : []
  })

  const midMem = computed<any[]>(() => {
    const mem: any = memoryData.value || {}
    return Array.isArray(mem['中期记忆']) ? mem['中期记忆'] : Array.isArray(mem.mid_term) ? mem.mid_term : []
  })

  const longMem = computed<any[]>(() => {
    const mem: any = memoryData.value || {}
    return Array.isArray(mem['长期记忆']) ? mem['长期记忆'] : Array.isArray(mem.long_term) ? mem.long_term : []
  })

  const getDataCount = (type: string): number => {
    switch (type) {
      case 'chat':
        return Object.keys((searchQuery.value ? filteredChatVariables.value : chatVariables.value)).length
      case 'global':
        return Object.keys((searchQuery.value ? filteredGlobalVariables.value : globalVariables.value)).length
      case 'character': {
        const data = characterData.value as Record<string, unknown> | null
        return data && typeof data === 'object' ? Object.keys(data).length : 0
      }
      case 'saveData': {
        const data = saveData.value as Record<string, unknown> | null
        return data && typeof data === 'object' ? Object.keys(data).length : 0
      }
      case 'worldInfo': {
        const info = worldInfo.value as Record<string, unknown>
        if (info && typeof info === 'object') {
          const continents = Array.isArray(info['大陆信息']) ? info['大陆信息'].length : 0
          const factions = Array.isArray(info['势力信息']) ? info['势力信息'].length : 0
          const locations = Array.isArray(info['地点信息']) ? info['地点信息'].length : 0
          const sum = continents + factions + locations
          return sum > 0 ? sum : Object.keys(info).length
        }
        return 0
      }
      case 'memory':
        return (shortMem.value?.length || 0) + (midMem.value?.length || 0) + (longMem.value?.length || 0)
      case 'raw':
        return 0
      default:
        return 0
    }
  }

  const getMemoryCount = (): number => {
    return (shortMem.value?.length || 0) + (midMem.value?.length || 0) + (longMem.value?.length || 0)
  }

  const getWorldItemCount = (): number => {
    if (!worldInfo.value) return 0
    let count = 0
    const info = worldInfo.value as Record<string, unknown>
    if (Array.isArray(info['势力信息'])) count += info['势力信息'].length
    if (Array.isArray(info['地点信息'])) count += info['地点信息'].length
    if (Array.isArray(info['大陆信息'])) count += info['大陆信息'].length
    return count
  }

  return {
    filteredChatVariables,
    filteredGlobalVariables,
    shortMem,
    midMem,
    longMem,
    getDataCount,
    getMemoryCount,
    getWorldItemCount
  }
}