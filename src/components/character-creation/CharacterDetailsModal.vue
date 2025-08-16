<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
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

          <!-- 同步状态 -->
          <div v-if="character.is_active" class="info-section">
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
          v-if="!character.is_active && character.is_accessible"
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

interface Character {
  id: number
  character_name: string
  world_id: number
  talent_tier_id: number
  root_bone: number
  spirituality: number
  comprehension: number
  fortune: number
  charm: number
  temperament: number
  is_active: boolean
  is_deleted: boolean
  is_accessible: boolean
  last_played?: string
  play_time_minutes: number
  created_at: string
}

interface GameState {
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

const props = defineProps<{
  character: Character
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
  try {
    const response = await request.get<GameState>(`/api/v1/characters/${props.character.id}/game_state`)
    gameState.value = response
  } catch (error) {
    console.error('加载游戏状态失败:', error)
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
    alert('同步成功')
  } catch (error) {
    console.error('同步失败:', error)
    alert('同步失败')
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
    alert('激活角色失败')
  }
}

const closeModal = () => {
  emit('close')
}

// 辅助函数
const getWorldName = (worldId: number) => {
  return `世界${worldId}`
}

const getTalentTierName = (tierId: number) => {
  return `天资等级${tierId}`
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
  await loadGameState()
  if (props.character.is_active) {
    await loadSyncInfo()
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

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  border-bottom: 1px solid #eee;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 30px;
}

.info-section {
  margin-bottom: 30px;
}

.info-section h3 {
  margin-bottom: 15px;
  color: #333;
  border-bottom: 2px solid #4caf50;
  padding-bottom: 5px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 15px;
  background: #f9f9f9;
  border-radius: 8px;
}

.label {
  color: #666;
  font-weight: 500;
}

.value {
  color: #333;
  font-weight: 600;
}

.attributes-display {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
}

.attr-card {
  text-align: center;
  padding: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 10px;
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

.state-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 15px;
  background: #e3f2fd;
  border-radius: 8px;
  border-left: 4px solid #2196f3;
}

.sync-section {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
}

.sync-status-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.sync-clean {
  color: #4caf50;
  font-weight: 600;
}

.sync-dirty {
  color: #ff9800;
  font-weight: 600;
}

.sync-unknown {
  color: #999;
  font-weight: 600;
}

.sync-actions {
  display: flex;
  gap: 10px;
}

.sync-btn, .refresh-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.sync-btn {
  background: #607d8b;
  color: white;
}

.refresh-btn {
  background: #9e9e9e;
  color: white;
}

.sync-details {
  font-size: 14px;
  color: #666;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  padding: 20px 30px;
  border-top: 1px solid #eee;
  background: #f9f9f9;
  border-radius: 0 0 12px 12px;
}

.btn-cancel {
  padding: 10px 20px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}

.btn-activate {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: #4caf50;
  color: white;
  cursor: pointer;
  font-weight: 500;
}
</style>