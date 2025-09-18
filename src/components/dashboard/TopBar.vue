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
        <span class="separator">·</span>
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

const characterStore = useCharacterStore()
const isFullscreen = ref(false)


const characterName = computed(() => {
  return characterStore.activeCharacterProfile?.角色基础信息?.名字 || ''
})

const characterRealm = computed(() => {
  const save = characterStore.activeSaveSlot
  return save?.存档数据?.玩家角色状态?.境界?.名称 || '凡人'
})

const currentLocation = computed(() => {
  const save = characterStore.activeSaveSlot
  return save?.存档数据?.玩家角色状态?.位置?.描述 || '青云镇'
})

const gameTime = computed(() => {
  const save = characterStore.activeSaveSlot
  if (save?.存档数据?.游戏时间) {
    const time = save.存档数据.游戏时间
    const formattedMinutes = time.分钟.toString().padStart(2, '0')
    const formattedHours = time.小时.toString().padStart(2, '0')
    return `仙道${time.年}年${time.月}月${time.日}日 ${formattedHours}:${formattedMinutes}`
  }
  return '仙道元年1月1日 00:00'
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
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(0,0,0,0.06);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.left-section {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.game-title { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 0; letter-spacing: 0.2px; }

.character-quick-info { display: flex; align-items: center; gap: 8px; padding: 4px 10px; background: rgba(241,245,249,0.8); border-radius: 14px; border: 1px solid #e2e8f0; }

.character-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #334155;
}

.character-realm {
  font-size: 0.75rem;
  color: #7c3aed;
  font-weight: 500;
  padding: 2px 6px;
  background: rgba(124, 58, 237, 0.1);
  border-radius: 10px;
}

.center-section {
  flex: 1;
  display: flex;
  justify-content: center;
}

.location-time-info { display: flex; align-items: center; gap: 8px; padding: 4px 12px; background: rgba(248,250,252,0.75); border: 1px solid #e2e8f0; border-radius: 10px; white-space: nowrap; }

.location-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: #059669;
}

.separator {
  font-size: 0.8rem;
  color: #94a3b8;
  font-weight: 500;
}

.time-value {
  font-size: 0.8rem;
  color: #475569;
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

.fullscreen-btn { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.6); border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-size: 16px; color: #64748b; transition: all 0.2s ease; }

.fullscreen-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #334155;
}

/* 手机端适配 */
@media (max-width: 767px) {
  .top-bar { padding: 0 12px; height: 50px; }
  
  .game-title {
    font-size: 1rem;
  }
  
  .character-quick-info {
    gap: 6px;
    padding: 3px 8px;
  }
  
  .character-name {
    font-size: 0.75rem;
  }
  
  .character-realm {
    font-size: 0.65rem;
    padding: 1px 4px;
  }
  
  .center-section {
    flex: 0.8;
  }
  
  .location-time-info {
    padding: 4px 10px;
    gap: 6px;
  }
  
  .location-text {
    font-size: 0.75rem;
  }
  
  .separator {
    font-size: 0.7rem;
  }
  
  .time-value {
    font-size: 0.7rem;
  }
  
  .fullscreen-btn {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }
  
  .left-section {
    gap: 8px;
    flex: 1.2;
  }
  
  .right-section {
    gap: 8px;
    flex: 0.8;
  }
}

/* 平板适配 */
@media (min-width: 768px) and (max-width: 1024px) {
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
