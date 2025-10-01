<template>
  <div class="top-bar">
    <div class="left-section">
      <h1 class="game-title">大道朝天</h1>
      <div class="character-quick-info" v-if="characterName">
        <span class="character-name">{{ characterName }}</span>
        <span class="character-realm">{{ characterRealm }}</span>
      </div>
    </div>

    <div class="center-section">
      <div class="location-time-info">
        <span class="location-text">{{ currentLocation }}</span>
        <span class="separator">|</span>
        <span class="time-value">{{ gameTime }}</span>
      </div>
    </div>

    <div class="right-section">
      <button @click="toggleFullscreen" class="fullscreen-btn">
        <Maximize v-if="!isFullscreen" :size="16" />
        <Minimize v-else :size="16" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { Maximize, Minimize } from 'lucide-vue-next'
import { useCharacterStore } from '@/stores/characterStore'
import { formatRealmWithStage } from '@/utils/realmUtils'

const characterStore = useCharacterStore()
const isFullscreen = ref(false)

const characterName = computed(() => {
  try {
    return characterStore.activeCharacterProfile?.角色基础信息?.名字 || ''
  } catch (e) {
    console.error('[TopBar] Error getting characterName:', e)
    return ''
  }
})

const characterRealm = computed(() => {
  try {
    const save = characterStore.activeSaveSlot
    return formatRealmWithStage(save?.存档数据?.玩家角色状态?.境界)
  } catch (e) {
    console.error('[TopBar] Error getting characterRealm:', e)
    return '凡人'
  }
})

const currentLocation = computed(() => {
  try {
    const save = characterStore.activeSaveSlot
    return save?.存档数据?.玩家角色状态?.位置?.描述 || '初始地'
  } catch (e) {
    console.error('[TopBar] Error getting currentLocation:', e)
    return '初始地'
  }
})

const gameTime = computed(() => {
  try {
    const save = characterStore.activeSaveSlot
    if (save?.存档数据?.游戏时间) {
      const time = save.存档数据.游戏时间
      const formattedMinutes = time.分钟.toString().padStart(2, '0')
      const formattedHours = time.小时.toString().padStart(2, '0')
      return `仙道${time.年}年${time.月}月${time.日}日 ${formattedHours}:${formattedMinutes}`
    }
    return '仙道元年1月1日 00:00'
  } catch (e) {
    console.error('[TopBar] Error getting gameTime:', e)
    return '仙道元年1月1日 00:00'
  }
})

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.error('无法进入全屏模式:', err)
    })
  } else {
    document.exitFullscreen().catch(err => {
      console.error('无法退出全屏模式:', err)
    })
  }
}

onMounted(() => {
  console.log('[TopBar] Component mounted')
  const handleFullscreenChange = () => {
    isFullscreen.value = !!document.fullscreenElement
  }

  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
})
</script>

<style scoped>
.top-bar {
  width: 100%;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  box-sizing: border-box;
  background: var(--color-surface, #f8f9fa);
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
  min-height: 56px;
}

.left-section {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.game-title { font-size: 1.1rem; font-weight: 700; color: var(--color-text); margin: 0; letter-spacing: 0.2px; white-space: nowrap; }

.character-quick-info { display: flex; align-items: center; gap: 8px; padding: 4px 10px; background: var(--color-surface-light); border-radius: 14px; border: 1px solid var(--color-border); }

.character-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.character-realm {
  font-size: 0.75rem;
  color: var(--color-accent);
  font-weight: 500;
  padding: 2px 6px;
  background: var(--color-accent-light);
  border-radius: 10px;
}

.center-section {
  flex: 1;
  display: flex;
  justify-content: center;
}

.location-time-info { display: flex; align-items: center; gap: 8px; padding: 4px 12px; background: var(--color-surface-light); border: 1px solid var(--color-border); border-radius: 10px; white-space: nowrap; }

.location-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-success);
}

.separator {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.time-value {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  font-family: 'Courier New', monospace;
}

.right-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
}

.fullscreen-btn { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; background: var(--color-surface-light); border: 1px solid var(--color-border); border-radius: 8px; cursor: pointer; font-size: 16px; color: var(--color-text-secondary); transition: all 0.2s ease; }

.fullscreen-btn:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-hover);
  color: var(--color-text);
}

/* 手机端适配 */
@media (max-width: 767px) {
  .top-bar {
    padding: 0 8px;
    height: 50px;
    min-height: 50px;
    flex-wrap: nowrap;
  }

  .game-title {
    font-size: 0.9rem;
    white-space: nowrap;
    writing-mode: horizontal-tb;
  }

  .character-quick-info {
    gap: 4px;
    padding: 2px 6px;
    flex-shrink: 1;
    min-width: 0;
  }

  .character-name {
    font-size: 0.7rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 60px;
  }

  .character-realm {
    font-size: 0.6rem;
    padding: 1px 3px;
    white-space: nowrap;
  }

  .center-section {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .location-time-info {
    padding: 3px 6px;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: center;
    max-width: 100%;
  }

  .location-text {
    font-size: 0.7rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 80px;
  }

  .separator {
    font-size: 0.65rem;
  }

  .time-value {
    font-size: 0.65rem;
    white-space: nowrap;
  }

  .fullscreen-btn {
    width: 26px;
    height: 26px;
    font-size: 14px;
    flex-shrink: 0;
  }

  .left-section {
    gap: 6px;
    flex: 0 1 auto;
    min-width: 0;
  }

  .right-section {
    gap: 6px;
    flex: 0 0 auto;
  }
}

/* 超小屏幕适配 */
@media (max-width: 375px) {
  .top-bar {
    padding: 0 4px;
  }

  .game-title {
    font-size: 0.8rem;
  }

  .character-quick-info {
    gap: 3px;
    padding: 2px 4px;
  }

  .character-name {
    font-size: 0.65rem;
    max-width: 50px;
  }

  .location-text {
    font-size: 0.65rem;
    max-width: 60px;
  }

  .time-value {
    font-size: 0.6rem;
  }
}

/* 平板适配 */
@media (min-width: 641px) and (max-width: 1024px) {
  .top-bar {
    padding: 0 16px;
  }
  
  .game-title {
    font-size: 1.1rem;
  }
  
  .left-section {
    gap: 12px;
  }
  
  .right-section {
    gap: 10px;
  }
}

/* 深色主题 */
[data-theme="dark"] .top-bar {
  background: #1e293b;
  border-bottom-color: #334155;
}

[data-theme="dark"] .game-title {
  color: #f1f5f9;
}

[data-theme="dark"] .character-quick-info {
  background: #334155;
  border-color: #475569;
}

[data-theme="dark"] .character-name {
  color: #e2e8f0;
}

[data-theme="dark"] .character-realm {
  background: rgba(167, 139, 250, 0.2);
  color: #a78bfa;
}

[data-theme="dark"] .location-time-info {
  background: #334155;
  border-color: #475569;
}

[data-theme="dark"] .location-text {
  color: #34d399;
}

[data-theme="dark"] .separator {
  color: #64748b;
}

[data-theme="dark"] .time-value {
  color: #cbd5e1;
}

[data-theme="dark"] .fullscreen-btn {
  background: transparent;
  border-color: #475569;
  color: #94a3b8;
}

[data-theme="dark"] .fullscreen-btn:hover {
  background: #334155;
  border-color: #64748b;
  color: #e2e8f0;
}
</style>
