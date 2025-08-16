<template>
  <div class="character-management">
    <div class="header">
      <h2>我的角色</h2>
      <button 
        @click="showCreateModal = true" 
        class="create-character-btn"
        :disabled="userStore.user?.is_banned || characters.length >= 5"
      >
        创建新角色 ({{ characters.length }}/5)
      </button>
    </div>

    <!-- 封号提示 -->
    <div v-if="userStore.user?.is_banned" class="ban-notice">
      <h3>账号已被封禁</h3>
      <p>您的账号已被封禁，无法访问或创建角色。如有疑问请联系管理员。</p>
      <button @click="checkBanStatus" class="check-ban-btn">检查封禁状态</button>
    </div>

    <!-- 角色列表 -->
    <div v-else class="character-grid">
      <div 
        v-for="character in characters" 
        :key="character.id"
        class="character-card"
        :class="{ 
          'active': character.is_active,
          'inaccessible': !character.is_accessible
        }"
      >
        <div class="character-header">
          <h3>{{ character.character_name }}</h3>
          <div class="character-badges">
            <span v-if="character.is_active" class="badge active">当前角色</span>
            <span v-if="!character.is_accessible" class="badge banned">无法访问</span>
          </div>
        </div>

        <div class="character-info">
          <p><strong>世界:</strong> {{ getWorldName(character.world_id) }}</p>
          <p><strong>天资:</strong> {{ getTalentTierName(character.talent_tier_id) }}</p>
          <p><strong>创建时间:</strong> {{ formatDate(character.created_at) }}</p>
          <p v-if="character.last_played"><strong>最后游戏:</strong> {{ formatDate(character.last_played) }}</p>
          <p><strong>游戏时长:</strong> {{ formatPlayTime(character.play_time_minutes) }}</p>
        </div>

        <div class="character-attributes">
          <div class="attribute-grid">
            <div class="attr-item">
              <span class="attr-name">根骨</span>
              <span class="attr-value">{{ character.root_bone }}</span>
            </div>
            <div class="attr-item">
              <span class="attr-name">灵性</span>
              <span class="attr-value">{{ character.spirituality }}</span>
            </div>
            <div class="attr-item">
              <span class="attr-name">悟性</span>
              <span class="attr-value">{{ character.comprehension }}</span>
            </div>
            <div class="attr-item">
              <span class="attr-name">气运</span>
              <span class="attr-value">{{ character.fortune }}</span>
            </div>
            <div class="attr-item">
              <span class="attr-name">魅力</span>
              <span class="attr-value">{{ character.charm }}</span>
            </div>
            <div class="attr-item">
              <span class="attr-name">心性</span>
              <span class="attr-value">{{ character.temperament }}</span>
            </div>
          </div>
        </div>

        <div class="character-actions">
          <button 
            v-if="!character.is_active && character.is_accessible"
            @click="activateCharacter(character.id)"
            class="btn-activate"
          >
            激活角色
          </button>
          <button 
            v-if="character.is_active && character.is_accessible"
            @click="setTavernCharacterName(character.character_name)"
            class="btn-tavern"
          >
            设为酒馆角色
          </button>
          <button 
            v-if="character.is_accessible"
            @click="viewCharacterDetails(character)"
            class="btn-details"
          >
            查看详情
          </button>
          <button 
            v-if="character.is_accessible"
            @click="deleteCharacter(character)"
            class="btn-delete"
          >
            删除角色
          </button>
        </div>

        <!-- 同步状态 -->
        <div v-if="character.is_active" class="sync-status">
          <div class="sync-info">
            <span :class="getSyncStatusClass(character.id)">
              {{ getSyncStatusText(character.id) }}
            </span>
            <button @click="syncCharacter(character.id)" class="btn-sync">
              手动同步
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建角色模态框 -->
    <CharacterCreationModal 
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCharacterCreated"
    />

    <!-- 角色详情模态框 -->
    <CharacterDetailsModal
      v-if="selectedCharacter"
      :character="selectedCharacter"
      @close="selectedCharacter = null"
      @updated="loadCharacters"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { request } from '@/services/request'
import CharacterCreationModal from './CharacterCreationModal.vue'
import CharacterDetailsModal from './CharacterDetailsModal.vue'
import { useUserStore } from '@/stores/userStore'
import type { Character, World, TalentTier } from '@/types'

// In a real app, this might be better in a dedicated static data store
const staticData = ref<{ worlds: World[], talentTiers: TalentTier[] }>({
  worlds: [],
  talentTiers: []
})

const userStore = useUserStore()
const characters = ref<Character[]>([])
const showCreateModal = ref(false)
const selectedCharacter = ref<Character | null>(null)
const syncStates = ref<Map<number, { has_unsaved_data: boolean, last_sync_time?: string }>>(new Map())

const loadStaticData = async () => {
  try {
    // Assuming these endpoints exist
    const [worlds, talentTiers] = await Promise.all([
      request.get<World[]>('/api/v1/characters/worlds'),
      request.get<TalentTier[]>('/api/v1/characters/talent_tiers')
    ])
    staticData.value = { worlds, talentTiers }
  } catch (error) {
    console.error('加载静态数据失败:', error)
  }
}

const loadCharacters = async () => {
  try {
    const data = await request.get<Character[]>('/api/v1/characters/my')
    characters.value = data
    
    const activeCharacter = characters.value.find(c => c.is_active)
    if (activeCharacter) {
      await setTavernCharacterName(activeCharacter.character_name, true) // silently update
      await loadSyncStatus(activeCharacter.id)
    }
  } catch (error) {
    console.error('加载角色列表失败:', error)
  }
}

const loadSyncStatus = async (characterId: number) => {
  try {
    const data = await request.get<{ has_unsaved_data: boolean, last_sync_time?: string }>(`/api/v1/characters/${characterId}/sync_status`)
    syncStates.value.set(characterId, data)
  } catch (error) {
    console.error(`加载角色 ${characterId} 同步状态失败:`, error)
  }
}

const activateCharacter = async (characterId: number) => {
  try {
    await request.post(`/api/v1/characters/${characterId}/activate`)
    await loadCharacters()
  } catch (error) {
    console.error('激活角色失败:', error)
  }
}

const syncCharacter = async (characterId: number) => {
  try {
    await request.post(`/api/v1/characters/${characterId}/sync`)
    await loadSyncStatus(characterId)
    // Consider using a less intrusive notification system than alert
  } catch (error) {
    console.error('同步失败:', error)
  }
}

const deleteCharacter = async (character: Character) => {
  if (confirm(`确定要删除角色"${character.character_name}"吗？此操作不可恢复。`)) {
    try {
      await request.delete(`/api/v1/characters/${character.id}`)
      await loadCharacters()
    } catch (error) {
      console.error('删除角色失败:', error)
    }
  }
}

const checkBanStatus = async () => {
  try {
    const response = await request.get<{ message: string, is_banned: boolean }>('/api/v1/ban/check_ban_status')
    if (!response.is_banned) {
      await userStore.loadUserInfo() // This will update the user object
    }
  } catch (error) {
    console.error('检查封禁状态失败:', error)
  }
}

const viewCharacterDetails = (character: Character) => {
  selectedCharacter.value = character
}

const setTavernCharacterName = async (characterName: string, silent = false) => {
  if (window.SillyTavern?.executeSlashCommands) {
    try {
      await window.SillyTavern.executeSlashCommands(`/rename-char ${characterName}`)
      if (!silent) {
        // toast(`酒馆角色名已设置为: ${characterName}`)
      }
      console.log(`酒馆角色名已设置为: ${characterName}`)
    } catch (error) {
      console.error('设置酒馆角色名失败:', error)
      if (!silent) {
        // toast.error('设置酒馆角色名失败')
      }
    }
  } else if (!silent) {
    // toast.warn('请在SillyTavern环境中使用此功能')
  }
}

const onCharacterCreated = () => {
  showCreateModal.value = false
  loadCharacters()
}

const getSyncStatusClass = (characterId: number) => {
  const state = syncStates.value.get(characterId)
  if (!state) return 'sync-unknown'
  return state.has_unsaved_data ? 'sync-dirty' : 'sync-clean'
}

const getSyncStatusText = (characterId: number) => {
  const state = syncStates.value.get(characterId)
  if (!state) return '同步状态未知'
  return state.has_unsaved_data ? '有未保存数据' : '已同步'
}

// 辅助函数
const getWorldName = (worldId: number) => {
  return staticData.value.worlds.find(w => w.id === worldId)?.name || `未知世界`
}

const getTalentTierName = (tierId: number) => {
  return staticData.value.talentTiers.find(t => t.id === tierId)?.name || `未知天资`
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
  await userStore.loadUserInfo()
  await loadStaticData()
  await loadCharacters()
})
</script>

<style scoped>
.character-management {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.create-character-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}

.create-character-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.ban-notice {
  background: #ffebee;
  border: 1px solid #f44336;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  color: #d32f2f;
}

.check-ban-btn {
  background: #f44336;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.character-card {
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 20px;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
}

.character-card.active {
  border-color: #4caf50;
  box-shadow: 0 0 15px rgba(76, 175, 80, 0.3);
}

.character-card.inaccessible {
  opacity: 0.6;
  background: #f5f5f5;
}

.character-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.character-badges {
  display: flex;
  gap: 5px;
}

.badge {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.badge.active {
  background: #e8f5e8;
  color: #2e7d32;
}

.badge.banned {
  background: #ffebee;
  color: #c62828;
}

.character-info {
  margin-bottom: 15px;
}

.character-info p {
  margin: 5px 0;
  font-size: 14px;
}

.attribute-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 15px;
}

.attr-item {
  display: flex;
  justify-content: space-between;
  padding: 5px 8px;
  background: #f9f9f9;
  border-radius: 4px;
  font-size: 13px;
}

.attr-name {
  color: #666;
}

.attr-value {
  font-weight: 600;
  color: #333;
}

.character-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.character-actions button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
}

.btn-activate {
  background: #4caf50;
  color: white;
}

.btn-tavern {
  background: #ff9800;
  color: white;
}

.btn-details {
  background: #2196f3;
  color: white;
}

.btn-delete {
  background: #f44336;
  color: white;
}

.sync-status {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.sync-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sync-clean {
  color: #4caf50;
  font-weight: 500;
}

.sync-dirty {
  color: #ff9800;
  font-weight: 500;
}

.sync-unknown {
  color: #999;
}

.btn-sync {
  background: #607d8b;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}
</style>