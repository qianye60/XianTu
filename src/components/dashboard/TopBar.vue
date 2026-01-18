<template>
  <div class="top-bar">
    <div class="left-section">
      <h1 class="game-title" v-if="t('仙途') === '仙途'">
        <span class="title-xian">仙</span><span class="title-tu">途</span>
      </h1>
      <h1 class="game-title" v-else>{{ t('仙途') }}</h1>
      <div class="character-quick-info" v-if="characterName">
        <span class="character-name">{{ characterName }}</span>
        <span class="character-realm">{{ characterRealm }}</span>
      </div>
    </div>

    <div class="center-section">
      <div class="location-time-info">
        <span class="location-text">{{ currentLocation }}</span>
        <span class="spirit-density" v-if="spiritDensity > 0" :class="spiritDensityClass" :title="spiritDensityTooltip">
          <span class="spirit-icon-wrapper">
            <span class="spirit-icon">✧</span>
            <span class="spirit-glow"></span>
          </span>
          <span class="spirit-label">{{ t('灵气') }}</span>
          <span class="spirit-value">{{ spiritDensity }}</span>
          <span class="spirit-bar">
            <span class="spirit-bar-fill" :style="{ width: spiritDensity + '%' }"></span>
          </span>
        </span>
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
import { useGameStateStore } from '@/stores/gameStateStore'
import { formatRealmWithStage } from '@/utils/realmUtils'
import { useI18n } from '@/i18n'
import { getFullscreenElement, requestFullscreen, exitFullscreen, explainFullscreenError } from '@/utils/fullscreen'
import type { GameTime } from '@/types/game'

const { t } = useI18n()

/**
 * 从GameTime获取分钟数
 */
function getMinutes(gameTime: GameTime): number {
  return gameTime.分钟 ?? 0;
}

// 使用 gameStateStore 获取数据
const gameStateStore = useGameStateStore()
const isFullscreen = ref(false)

const characterName = computed(() => {
  try {
    return gameStateStore.character?.名字 || ''
  } catch (e) {
    console.error('[TopBar] Error getting characterName:', e)
    return ''
  }
})

const characterRealm = computed(() => {
  try {
    return formatRealmWithStage(gameStateStore.attributes?.境界)
  } catch (e) {
    console.error('[TopBar] Error getting characterRealm:', e)
    return t('凡人')
  }
})

const currentLocation = computed(() => {
  try {
    return gameStateStore.location?.描述 || t('初始地')
  } catch (e) {
    console.error('[TopBar] Error getting currentLocation:', e)
    return t('初始地')
  }
})

const spiritDensity = computed(() => {
  try {
    return gameStateStore.location?.灵气浓度 || 0
  } catch (e) {
    return 0
  }
})

const spiritDensityClass = computed(() => {
  const density = spiritDensity.value
  if (density >= 80) return 'density-very-high'
  if (density >= 60) return 'density-high'
  if (density >= 40) return 'density-medium'
  if (density >= 20) return 'density-low'
  return 'density-very-low'
})

const spiritDensityTooltip = computed(() => {
  const density = spiritDensity.value
  if (density >= 80) return t('灵气充沛 - 极佳修炼环境')
  if (density >= 60) return t('灵气浓郁 - 良好修炼环境')
  if (density >= 40) return t('灵气适中 - 普通修炼环境')
  if (density >= 20) return t('灵气稀薄 - 修炼困难')
  return t('灵气枯竭 - 难以修炼')
})

const gameTime = computed(() => {
  try {
    const time = gameStateStore.gameTime
    if (time) {
      const minutes = getMinutes(time)
      const formattedMinutes = minutes.toString().padStart(2, '0')
      const formattedHours = time.小时.toString().padStart(2, '0')
      return `${t('仙道')}${time.年}${t('年')}${time.月}${t('月')}${time.日}${t('日')} ${formattedHours}:${formattedMinutes}`
    }
    return `${t('仙道')}${t('元年')}1${t('月')}1${t('日')} 00:00`
  } catch (e) {
    console.error('[TopBar] Error getting gameTime:', e)
    return `${t('仙道')}${t('元年')}1${t('月')}1${t('日')} 00:00`
  }
})

const toggleFullscreen = () => {
  if (!getFullscreenElement()) {
    requestFullscreen(document.documentElement as any).catch(err => {
      console.error(explainFullscreenError(err))
    })
  } else {
    exitFullscreen().catch(err => {
      console.error(explainFullscreenError(err))
    })
  }
}

onMounted(() => {
  console.log('[TopBar] Component mounted')
  const handleFullscreenChange = () => {
    isFullscreen.value = !!getFullscreenElement()
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

.game-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--color-text);
  margin: 0;
  letter-spacing: 1px;
  white-space: nowrap;
}

.title-xian {
  color: var(--color-primary);
  text-shadow: 0 0 12px rgba(var(--color-primary-rgb), 0.4);
}

.title-tu {
  color: var(--color-text);
}

.character-quick-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  background: var(--color-surface-light);
  border-radius: 14px;
  border: 1px solid var(--color-border);
}

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

.location-time-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  white-space: nowrap;
}

.location-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-success);
}

.spirit-density {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 197, 253, 0.12) 100%);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 12px;
  margin-left: 8px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.spirit-density:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.4);
}

.spirit-icon-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
}

.spirit-icon {
  font-size: 0.9rem;
  color: #3b82f6;
  position: relative;
  z-index: 2;
  animation: spirit-pulse 2s ease-in-out infinite;
  filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.6));
}

.spirit-glow {
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%);
  border-radius: 50%;
  animation: spirit-glow-pulse 2s ease-in-out infinite;
}

.spirit-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #1e40af;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.spirit-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: #1e40af;
  font-family: 'Courier New', monospace;
  min-width: 24px;
  text-align: right;
}

.spirit-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(59, 130, 246, 0.15);
  overflow: hidden;
}

.spirit-bar-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
  transition: width 0.5s ease;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
}

/* 灵气浓度等级样式 */
.spirit-density.density-very-high {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(192, 132, 252, 0.16) 100%);
  border-color: rgba(168, 85, 247, 0.35);
}

.spirit-density.density-very-high .spirit-icon,
.spirit-density.density-very-high .spirit-label,
.spirit-density.density-very-high .spirit-value {
  color: #7c3aed;
}

.spirit-density.density-very-high .spirit-bar-fill {
  background: linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%);
  box-shadow: 0 0 10px rgba(124, 58, 237, 0.8);
}

.spirit-density.density-very-high .spirit-glow {
  background: radial-gradient(circle, rgba(168, 85, 247, 0.5) 0%, transparent 70%);
}

.spirit-density.density-high {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(74, 222, 128, 0.14) 100%);
  border-color: rgba(34, 197, 94, 0.3);
}

.spirit-density.density-high .spirit-icon,
.spirit-density.density-high .spirit-label,
.spirit-density.density-high .spirit-value {
  color: #15803d;
}

.spirit-density.density-high .spirit-bar-fill {
  background: linear-gradient(90deg, #22c55e 0%, #4ade80 100%);
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.7);
}

.spirit-density.density-high .spirit-glow {
  background: radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, transparent 70%);
}

.spirit-density.density-medium {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 197, 253, 0.12) 100%);
  border-color: rgba(59, 130, 246, 0.25);
}

.spirit-density.density-low {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.08) 0%, rgba(253, 186, 116, 0.12) 100%);
  border-color: rgba(251, 146, 60, 0.25);
}

.spirit-density.density-low .spirit-icon,
.spirit-density.density-low .spirit-label,
.spirit-density.density-low .spirit-value {
  color: #c2410c;
}

.spirit-density.density-low .spirit-bar-fill {
  background: linear-gradient(90deg, #f97316 0%, #fb923c 100%);
  box-shadow: 0 0 6px rgba(249, 115, 22, 0.6);
}

.spirit-density.density-low .spirit-glow {
  background: radial-gradient(circle, rgba(251, 146, 60, 0.3) 0%, transparent 70%);
}

.spirit-density.density-very-low {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(248, 113, 113, 0.12) 100%);
  border-color: rgba(239, 68, 68, 0.25);
}

.spirit-density.density-very-low .spirit-icon,
.spirit-density.density-very-low .spirit-label,
.spirit-density.density-very-low .spirit-value {
  color: #b91c1c;
}

.spirit-density.density-very-low .spirit-bar-fill {
  background: linear-gradient(90deg, #dc2626 0%, #ef4444 100%);
  box-shadow: 0 0 6px rgba(220, 38, 38, 0.6);
}

.spirit-density.density-very-low .spirit-glow {
  background: radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%);
}

@keyframes spirit-pulse {
  0%, 100% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

@keyframes spirit-glow-pulse {
  0%, 100% {
    opacity: 0.4;
    transform: scale(0.9);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.2);
  }
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

.fullscreen-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}

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
    overflow-x: auto;
    overflow-y: hidden;
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

  .spirit-density {
    padding: 3px 6px;
    margin-left: 4px;
    gap: 4px;
  }

  .spirit-icon-wrapper {
    width: 14px;
    height: 14px;
  }

  .spirit-icon {
    font-size: 0.7rem;
  }

  .spirit-label {
    font-size: 0.6rem;
  }

  .spirit-value {
    font-size: 0.65rem;
    min-width: 18px;
  }

  .spirit-bar {
    height: 2px;
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
[data-theme='dark'] .top-bar {
  background: #1e293b;
  border-bottom-color: #334155;
}

[data-theme='dark'] .game-title {
  color: #f1f5f9;
}

[data-theme='dark'] .character-quick-info {
  background: #334155;
  border-color: #475569;
}

[data-theme='dark'] .character-name {
  color: #e2e8f0;
}

[data-theme='dark'] .character-realm {
  background: rgba(167, 139, 250, 0.2);
  color: #a78bfa;
}

[data-theme='dark'] .location-time-info {
  background: #334155;
  border-color: #475569;
}

[data-theme='dark'] .location-text {
  color: #34d399;
}

[data-theme='dark'] .spirit-density {
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.15) 0%, rgba(147, 197, 253, 0.2) 100%);
  border-color: rgba(96, 165, 250, 0.3);
}

[data-theme='dark'] .spirit-density:hover {
  box-shadow: 0 4px 12px rgba(96, 165, 250, 0.3);
  border-color: rgba(96, 165, 250, 0.5);
}

[data-theme='dark'] .spirit-icon {
  color: #60a5fa;
  filter: drop-shadow(0 0 4px rgba(96, 165, 250, 0.7));
}

[data-theme='dark'] .spirit-glow {
  background: radial-gradient(circle, rgba(96, 165, 250, 0.5) 0%, transparent 70%);
}

[data-theme='dark'] .spirit-label {
  color: #93c5fd;
}

[data-theme='dark'] .spirit-value {
  color: #dbeafe;
}

[data-theme='dark'] .spirit-bar {
  background: rgba(96, 165, 250, 0.2);
}

[data-theme='dark'] .spirit-bar-fill {
  background: linear-gradient(90deg, #60a5fa 0%, #93c5fd 100%);
  box-shadow: 0 0 10px rgba(96, 165, 250, 0.8);
}

/* Dark theme - density levels */
[data-theme='dark'] .spirit-density.density-very-high {
  background: linear-gradient(135deg, rgba(192, 132, 252, 0.15) 0%, rgba(216, 180, 254, 0.2) 100%);
  border-color: rgba(192, 132, 252, 0.35);
}

[data-theme='dark'] .spirit-density.density-very-high .spirit-icon,
[data-theme='dark'] .spirit-density.density-very-high .spirit-label {
  color: #c084fc;
}

[data-theme='dark'] .spirit-density.density-very-high .spirit-value {
  color: #e9d5ff;
}

[data-theme='dark'] .spirit-density.density-very-high .spirit-bar-fill {
  background: linear-gradient(90deg, #a78bfa 0%, #c084fc 100%);
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.9);
}

[data-theme='dark'] .spirit-density.density-very-high .spirit-glow {
  background: radial-gradient(circle, rgba(192, 132, 252, 0.6) 0%, transparent 70%);
}

[data-theme='dark'] .spirit-density.density-high {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.12) 0%, rgba(134, 239, 172, 0.18) 100%);
  border-color: rgba(74, 222, 128, 0.3);
}

[data-theme='dark'] .spirit-density.density-high .spirit-icon,
[data-theme='dark'] .spirit-density.density-high .spirit-label {
  color: #4ade80;
}

[data-theme='dark'] .spirit-density.density-high .spirit-value {
  color: #d1fae5;
}

[data-theme='dark'] .spirit-density.density-high .spirit-bar-fill {
  background: linear-gradient(90deg, #34d399 0%, #6ee7b7 100%);
  box-shadow: 0 0 10px rgba(52, 211, 153, 0.8);
}

[data-theme='dark'] .spirit-density.density-high .spirit-glow {
  background: radial-gradient(circle, rgba(74, 222, 128, 0.5) 0%, transparent 70%);
}

[data-theme='dark'] .spirit-density.density-low {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.12) 0%, rgba(253, 186, 116, 0.18) 100%);
  border-color: rgba(251, 146, 60, 0.3);
}

[data-theme='dark'] .spirit-density.density-low .spirit-icon,
[data-theme='dark'] .spirit-density.density-low .spirit-label {
  color: #fb923c;
}

[data-theme='dark'] .spirit-density.density-low .spirit-value {
  color: #fed7aa;
}

[data-theme='dark'] .spirit-density.density-low .spirit-bar-fill {
  background: linear-gradient(90deg, #f97316 0%, #fb923c 100%);
  box-shadow: 0 0 8px rgba(249, 115, 22, 0.7);
}

[data-theme='dark'] .spirit-density.density-low .spirit-glow {
  background: radial-gradient(circle, rgba(251, 146, 60, 0.4) 0%, transparent 70%);
}

[data-theme='dark'] .spirit-density.density-very-low {
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.12) 0%, rgba(252, 165, 165, 0.18) 100%);
  border-color: rgba(248, 113, 113, 0.3);
}

[data-theme='dark'] .spirit-density.density-very-low .spirit-icon,
[data-theme='dark'] .spirit-density.density-very-low .spirit-label {
  color: #f87171;
}

[data-theme='dark'] .spirit-density.density-very-low .spirit-value {
  color: #fecaca;
}

[data-theme='dark'] .spirit-density.density-very-low .spirit-bar-fill {
  background: linear-gradient(90deg, #ef4444 0%, #f87171 100%);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.7);
}

[data-theme='dark'] .spirit-density.density-very-low .spirit-glow {
  background: radial-gradient(circle, rgba(248, 113, 113, 0.4) 0%, transparent 70%);
}

[data-theme='dark'] .separator {
  color: #64748b;
}

[data-theme='dark'] .time-value {
  color: #cbd5e1;
}

[data-theme='dark'] .fullscreen-btn {
  background: transparent;
  border-color: #475569;
  color: #94a3b8;
}

[data-theme='dark'] .fullscreen-btn:hover {
  background: #334155;
  border-color: #64748b;
  color: #e2e8f0;
}
</style>
