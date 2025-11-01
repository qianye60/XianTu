import { ref } from 'vue'
import { zh, en } from './translations'

export type Language = 'zh' | 'en'

const currentLanguage = ref<Language>((localStorage.getItem('language') as Language) || 'zh')

export const translations = {
  zh,
  en
}

// 旧版本保留用于兼容
const oldTranslations = {
  zh: {
    // 通用
    confirm: '确认',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    close: '关闭',
    search: '搜索',
    loading: '加载中...',
    reset: '重置',
    export: '导出',
    import: '导入',
    clear: '清空',
    add: '添加',
    remove: '移除',
    update: '更新',
    view: '查看',
    download: '下载',
    upload: '上传',

    // 左侧栏
    gameFunctions: '游戏功能',
    cultivation: '修行管理',
    inventory: '背包物品',
    inventoryDesc: '查看道具装备',
    characterDetails: '人物详情',
    characterDetailsDesc: '查看修为境界',
    techniques: '修炼功法',
    techniquesDesc: '功法修炼技能',
    thousandDao: '三千大道',
    thousandDaoDesc: '修炼万法道途',
    worldAffairs: '红尘俗事',
    relationships: '人物关系',
    relationshipsDesc: '人情世故网络',
    sectInfo: '宗门信息',
    sectInfoDesc: '门派势力详情',
    questLog: '任务日志',
    questLogDesc: '当前任务进度',
    worldExplore: '世界探索',
    worldMapBtn: '世界地图',
    worldMapDesc: '坤舆图志',
    memoryCenter: '记忆中心',
    memoryCenterDesc: '重要事件回顾',
    gameVariables: '游戏变量',
    gameVariablesDesc: '查看游戏数据',
    settingsBtn: '系统设置',
    settingsDesc: '偏好设置',
    saveGame: '保存游戏',
    saveGameDesc: '保存当前进度',
    exitGame: '退出游戏',
    exitGameDesc: '返回主菜单',

    // 设置页面
    gameSettings: '游戏设置',
    customizeExperience: '自定义您的游戏体验',
    displaySettings: '显示设置',
    themeMode: '主题模式',
    themeDesc: '选择明亮或暗黑主题',
    light: '明亮',
    dark: '暗黑',
    auto: '跟随系统',
    uiScale: '界面缩放',
    uiScaleDesc: '调整UI界面大小',
    fontSize: '文字大小',
    fontSizeDesc: '调整游戏文字显示大小',
    small: '小',
    medium: '中',
    large: '大',
    gameplaySettings: '游戏设置',
    fastAnimations: '快速动画',
    fastAnimationsDesc: '加速界面动画和过渡效果',
    showHints: '显示提示',
    showHintsDesc: '显示游戏操作提示',
    advancedSettings: '高级设置',
    debugMode: '调试模式',
    debugModeDesc: '开启开发者调试功能',
    dataManagement: '数据管理',
    exportData: '导出数据',
    exportDataDesc: '导出游戏存档',
    importData: '导入数据',
    importDataDesc: '导入游戏存档',
    clearData: '清空数据',
    clearDataDesc: '清空所有游戏数据',
    language: '语言',
    languageSettings: '语言设置',
    chinese: '中文',
    english: 'English',
    selectLanguage: '选择界面语言',
  },
  en: {
    // Common
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    search: 'Search',
    loading: 'Loading...',
    reset: 'Reset',
    export: 'Export',
    import: 'Import',
    clear: 'Clear',
    add: 'Add',
    remove: 'Remove',
    update: 'Update',
    view: 'View',
    download: 'Download',
    upload: 'Upload',

    // Sidebar
    gameFunctions: 'Functions',
    cultivation: 'Cultivation',
    inventory: 'Inventory',
    inventoryDesc: 'Items & equipment',
    characterDetails: 'Character',
    characterDetailsDesc: 'Cultivation realm',
    techniques: 'Techniques',
    techniquesDesc: 'Cultivation methods',
    thousandDao: 'Three Thousand Dao',
    thousandDaoDesc: 'Myriad paths',
    worldAffairs: 'Worldly Affairs',
    relationships: 'Relationships',
    relationshipsDesc: 'Social network',
    sectInfo: 'Sect',
    sectInfoDesc: 'Faction details',
    questLog: 'Quests',
    questLogDesc: 'Current quests',
    worldExplore: 'Exploration',
    worldMapBtn: 'World Map',
    worldMapDesc: 'Explore world',
    memoryCenter: 'Memory',
    memoryCenterDesc: 'Important events',
    gameVariables: 'Variables',
    gameVariablesDesc: 'Game data',
    settingsBtn: 'Settings',
    settingsDesc: 'Preferences',
    saveGame: 'Save',
    saveGameDesc: 'Save progress',
    exitGame: 'Exit',
    exitGameDesc: 'Return to menu',

    // Settings Page
    gameSettings: 'Game Settings',
    customizeExperience: 'Customize your experience',
    displaySettings: 'Display',
    themeMode: 'Theme',
    themeDesc: 'Choose light or dark theme',
    light: 'Light',
    dark: 'Dark',
    auto: 'Auto',
    uiScale: 'UI Scale',
    uiScaleDesc: 'Adjust interface size',
    fontSize: 'Font Size',
    fontSizeDesc: 'Adjust text size',
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    gameplaySettings: 'Gameplay',
    fastAnimations: 'Fast Animations',
    fastAnimationsDesc: 'Speed up UI transitions',
    showHints: 'Show Hints',
    showHintsDesc: 'Display gameplay hints',
    advancedSettings: 'Advanced',
    debugMode: 'Debug Mode',
    debugModeDesc: 'Enable developer tools',
    dataManagement: 'Data Management',
    exportData: 'Export Data',
    exportDataDesc: 'Export save file',
    importData: 'Import Data',
    importDataDesc: 'Import save file',
    clearData: 'Clear Data',
    clearDataDesc: 'Clear all game data',
    language: 'Language',
    languageSettings: 'Language',
    chinese: '中文',
    english: 'English',
    selectLanguage: 'Select UI language',
  }
}

export function useI18n() {
  const t = (key: string): string => {
    const keys = key.split('.')
    let value: any = translations[currentLanguage.value]
    for (const k of keys) {
      value = value?.[k]
    }
    return value || key
  }

  const setLanguage = (lang: Language) => {
    currentLanguage.value = lang
    localStorage.setItem('language', lang)
  }

  return {
    t,
    currentLanguage,
    setLanguage
  }
}
