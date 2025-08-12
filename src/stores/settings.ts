import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { syncWorldBook } from '@/services/tavern'

const SETTINGS_STORAGE_KEY = 'xianxia_world_settings'

const DEFAULT_WORLDBOOK = `
# 世界核心设定：大道朝天

## 境界划分
*   凡人境：炼气、筑基、金丹、元婴
*   仙人境：化神、返虚、合道、大乘

## 炼丹规则
*   丹药等级：一品至九品，九品之上为仙品。
*   炼丹需丹炉、药材、真火。悟性与神识影响成丹率与品质。

## 炼器规则
*   法宝等级：法器、灵器、法宝、灵宝。
*   炼器需熔炉、材料、地火。根骨与神识影响成功率与器物品质。
`

export const useSettingsStore = defineStore('settings', () => {
  // 从本地存储中读取初始值，若无则使用默认值
  const storedSettings = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}')

  const summarizationApiUrl = ref<string>(
    storedSettings.summarizationApiUrl || 'https://api.openai.com/v1/chat/completions',
  )
  const summarizationApiKey = ref<string>(storedSettings.summarizationApiKey || '')
  const worldBookContent = ref<string>(storedSettings.worldBookContent || DEFAULT_WORLDBOOK)

  // 监视所有设置的变化，并将其持久化存入本地存储
  watch(
    () => ({
      summarizationApiUrl: summarizationApiUrl.value,
      summarizationApiKey: summarizationApiKey.value,
      worldBookContent: worldBookContent.value,
    }),
    (newSettings) => {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings))
      console.log('【藏经阁】已将新设定存入本地记忆。')
    },
    { deep: true },
  )

  // 单独监视世界书，实现自动同步
  watch(
    worldBookContent,
    (newContent) => {
      syncWorldBook(newContent)
    },
    { immediate: true }, // 立即执行一次，以同步初始状态
  )

  return {
    summarizationApiUrl,
    summarizationApiKey,
    worldBookContent,
  }
})
