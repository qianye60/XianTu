<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-dialog" @click.stop>
      <div class="modal-header">
        <h2>{{ character.character_name }} - 详细信息</h2>
        <button @click="closeModal" class="close-btn">×</button>
      </div>

      <div class="modal-body">
        <div class="character-basic-info">
          <div class="info-section">
            <h3>基础信息</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">角色名称:</span>
                <span class="value">{{ character.character_name }}</span>
              </div>
              <div class="info-item">
                <span class="label">所在世界:</span>
                <span class="value">{{ getWorldName(character.world_id) }}</span>
              </div>
              <div class="info-item">
                <span class="label">天资等级:</span>
                <span class="value">{{ getTalentTierName(character.talent_tier_id) }}</span>
              </div>
              <div class="info-item">
                <span class="label">创建时间:</span>
                <span class="value">{{ formatDate(character.created_at) }}</span>
              </div>
              <div class="info-item">
                <span class="label">最后游戏:</span>
                <span class="value">{{ character.last_played ? formatDate(character.last_played) : '从未游戏' }}</span>
              </div>
              <div class="info-item">
                <span class="label">总游戏时长:</span>
                <span class="value">{{ formatPlayTime(character.play_time_minutes) }}</span>
              </div>
            </div>
          </div>

          <div class="info-section">
            <h3>先天六司</h3>
            <div class="attributes-display">
              <div class="attr-card">
                <div class="attr-name">根骨</div>
                <div class="attr-value">{{ character.root_bone }}</div>
                <div class="attr-desc">体质根基</div>
              </div>
              <div class="attr-card">
                <div class="attr-name">灵性</div>
                <div class="attr-value">{{ character.spirituality }}</div>
                <div class="attr-desc">灵气亲和</div>
              </div>
              <div class="attr-card">
                <div class="attr-name">悟性</div>
                <div class="attr-value">{{ character.comprehension }}</div>
                <div class="attr-desc">理解天赋</div>
              </div>
              <div class="attr-card">
                <div class="attr-name">气运</div>
                <div class="attr-value">{{ character.fortune }}</div>
                <div class="attr-desc">机缘造化</div>
              </div>
              <div class="attr-card">
                <div class="attr-name">魅力</div>
                <div class="attr-value">{{ character.charm }}</div>
                <div class="attr-desc">容貌气质</div>
              </div>
              <div class="attr-card">
                <div class="attr-name">心性</div>
                <div class="attr-value">{{ character.temperament }}</div>
                <div class="attr-desc">道心坚韧</div>
              </div>
            </div>
          </div>

          <!-- 游戏状态信息 -->
          <div v-if="gameState" class="info-section">
            <h3>修炼状态</h3>
            <div class="game-state-grid">
              <div class="state-item">
                <span class="label">当前境界:</span>
                <span class="value">{{ gameState.current_realm_id || '凡人' }}</span>
              </div>
              <div class="state-item">
                <span class="label">修炼进度:</span>
                <span class="value">{{ gameState.cultivation_progress.toFixed(1) }}%</span>
              </div>
              <div class="state-item">
                <span class="label">修炼经验:</span>
                <span class="value">{{ gameState.cultivation_experience.toLocaleString() }}</span>
              </div>
              <div class="state-item">
                <span class="label">当前位置:</span>
                <span class="value">{{ gameState.current_location || '未知' }}</span>
              </div>
              <div class="state-item">
                <span class="label">灵石:</span>
                <span class="value">{{ gameState.spiritual_stones.toLocaleString() }}</span>
              </div>
              <div class="state-item">
                <span class="label">生命值:</span>
                <span class="value">{{ gameState.health_points }}/100</span>
              </div>
            </div>
          </div>

          <!-- 修炼状态 (本地角色) -->
          <div v-if="'realm' in character" class="info-section">
            <h3>修行状态</h3>
             <div class="core-stats-grid">
              <div class="stat-item">
                <span class="label">境界:</span>
                <span class="value realm-value">{{ character.realm }}</span>
              </div>
               <div class="stat-item">
                <span class="label">声望:</span>
                <span class="value">{{ character.reputation }}</span>
              </div>
              <div class="stat-item">
                <span class="label">寿命:</span>
                <span class="value">{{ character.lifespan }}</span>
              </div>
               <div class="stat-item">
                <span class="label">气血:</span>
                <span class="value">{{ character.hp }}/{{ character.hp_max }}</span>
              </div>
              <div class="stat-item">
                <span class="label">灵气:</span>
                <span class="value">{{ character.mana }}/{{ character.mana_max }}</span>
              </div>
              <div class="stat-item">
                <span class="label">神识:</span>
                <span class="value">{{ character.spirit }}/{{ character.spirit_max }}</span>
              </div>
            </div>
          </div>

          <!-- 同步状态 (云端角色) -->
          <div v-if="'is_active' in character && character.is_active" class="info-section">
            <h3>同步状态</h3>
            <div class="sync-section">
              <div class="sync-status-display">
                <span :class="syncStatusClass">{{ syncStatusText }}</span>
                <div class="sync-actions">
                  <button @click="syncCharacter" class="sync-btn">
                    {{ syncing ? '同步中...' : '手动同步' }}
                  </button>
                  <button @click="refreshGameState" class="refresh-btn">
                    刷新状态
                  </button>
                </div>
              </div>
              <div v-if="syncInfo" class="sync-details">
                <p><strong>最后同步:</strong> {{ syncInfo.last_sync_time ? formatDate(syncInfo.last_sync_time) : '从未同步' }}</p>
                <p><strong>数据版本:</strong> {{ syncInfo.version }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="closeModal" class="btn-cancel">关闭</button>
        <button
          v-if="'is_active' in character && !character.is_active && character.is_accessible"
          @click="activateCharacter"
          class="btn-activate"
        >
          激活此角色
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { request } from '@/services/request'
import type { CharacterData, World, TalentTier } from '@/types'

// GameState and SyncInfo can remain as local interfaces if not used elsewhere
interface GameState {
  // ... (content remains the same)
  id: number
  character_id: number
  current_realm_id?: number
  cultivation_progress: number
  cultivation_experience: number
  current_location?: string
  current_scene?: string
  spiritual_stones: number
  health_points: number
  spiritual_power: number
  inventory: Record<string, unknown>
  equipped_items: Record<string, unknown>
  learned_skills: string[]
  cultivation_methods: string[]
  relationships: Record<string, unknown>
  faction_reputation: Record<string, unknown>
  active_quests: Record<string, unknown>[]
  completed_quests: Record<string, unknown>[]
  achievements: string[]
  last_sync_time: string
  version: number
  is_dirty: boolean
}

interface SyncInfo {
  has_unsaved_data: boolean
  last_sync_time?: string
  version: number
  character_last_played?: string
}

import { toast } from '@/utils/toast';

const props = defineProps<{
  character: CharacterData
  worlds: World[]
  talentTiers: TalentTier[]
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const gameState = ref<GameState | null>(null)
const syncInfo = ref<SyncInfo | null>(null)
const syncing = ref(false)

const syncStatusClass = computed(() => {
  if (!syncInfo.value) return 'sync-unknown'
  return syncInfo.value.has_unsaved_data ? 'sync-dirty' : 'sync-clean'
})

const syncStatusText = computed(() => {
  if (!syncInfo.value) return '同步状态未知'
  return syncInfo.value.has_unsaved_data ? '有未保存数据' : '已同步'
})

const loadGameState = async () => {
  // 云端角色才有游戏状态
  if (props.character.source !== 'cloud') return;

  try {
    // FIX: API路径需要 world_id
    const response = await request.get<GameState>(`/api/v1/worlds/${props.character.world_id}/characters/${props.character.id}/game_state`);
    gameState.value = response;
  } catch (error) {
    console.error('加载游戏状态失败:', error);
    // 根据用户要求，静默失败，不弹出toast
    // toast.error('获取角色修炼状态失败');
  }
}


const loadSyncInfo = async () => {
  try {
    const response = await request.get<SyncInfo>(`/api/v1/characters/${props.character.id}/sync_status`)
    syncInfo.value = response
  } catch (error) {
    console.error('加载同步状态失败:', error)
  }
}

const syncCharacter = async () => {
  syncing.value = true
  try {
    await request.post(`/api/v1/characters/${props.character.id}/sync`)
    await loadSyncInfo()
    toast.success('同步成功')
  } catch (error) {
    console.error('同步失败:', error)
    toast.error('同步失败')
  } finally {
    syncing.value = false
  }
}

const refreshGameState = async () => {
  await Promise.all([loadGameState(), loadSyncInfo()])
}

const activateCharacter = async () => {
  try {
    await request.post(`/api/v1/characters/${props.character.id}/activate`)
    emit('updated')
    emit('close')
  } catch (error) {
    console.error('激活角色失败:', error)
    toast.error('激活角色失败')
  }
}

const closeModal = () => {
  emit('close')
}

// 辅助函数
const getWorldName = (worldId: number) => {
  return props.worlds.find(w => w.id === worldId)?.name || `未知世界`
}

const getTalentTierName = (tierId: number) => {
  return props.talentTiers.find(t => t.id === tierId)?.name || `未知天资`
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const formatPlayTime = (minutes: number) => {
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}小时${mins}分钟`
}

onMounted(async () => {
  // Only load game state from cloud for cloud characters
  if ('is_active' in props.character) {
    await loadGameState()
    if (props.character.is_active) {
      await loadSyncInfo()
    }
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-dialog {
  /* The global .modal-dialog class handles background, color, border, etc. */
  /* We only define layout-specific overrides here. */
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}
.close-btn:hover {
    color: var(--color-text);
}

.modal-body {
  padding: 1.5rem;
}

.info-section {
  margin-bottom: 2rem;
}

.info-section h3 {
  margin-bottom: 1rem;
  color: var(--color-accent);
  border-bottom: 2px solid var(--color-accent);
  padding-bottom: 0.5rem;
  font-family: var(--font-family-serif);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--color-background);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.label {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.value {
  color: var(--color-text);
  font-weight: 600;
}

.attributes-display {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
}

.attr-card {
  text-align: center;
  padding: 1rem;
  background: var(--color-background);
  color: var(--color-text);
  border-radius: 10px;
  border: 1px solid var(--color-border);
}

.attr-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 5px;
}

.attr-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
}

.attr-desc {
  font-size: 11px;
  opacity: 0.8;
}

.game-state-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.state-item, .core-stats-grid .stat-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--color-background);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-primary);
}

.realm-value {
  color: var(--color-accent);
  font-weight: bold;
}

.sync-section {
  background: var(--color-background);
  padding: 1.25rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.sync-status-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.sync-clean {
  color: var(--color-nature);
  font-weight: 600;
}

.sync-dirty {
  color: var(--color-accent);
  font-weight: 600;
}

.sync-unknown {
  color: var(--color-text-secondary);
  font-weight: 600;
}

.sync-actions {
  display: flex;
  gap: 10px;
}

.sync-btn, .refresh-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  background: transparent;
  color: var(--color-text);
  transition: all 0.2s ease;
}
.sync-btn:hover, .refresh-btn:hover {
    background: var(--color-surface-light);
    border-color: var(--color-primary);
}

.sync-details {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: 0 0 12px 12px;
}

.btn-cancel {
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
}
.btn-cancel:hover {
    background: var(--color-surface-light);
}

.btn-activate {
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  border: 1px solid var(--color-nature);
  background: var(--color-nature);
  color: var(--color-background);
}
.btn-activate:hover {
    opacity: 0.8;
}
</style>