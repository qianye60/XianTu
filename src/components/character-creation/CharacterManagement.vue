<template>
  <div class="character-management">
    <div class="header">
      <h2>选择已有法身</h2>

      <div class="header-actions">
        <button @click="goBack" class="btn-back">
          返回道途
        </button>
      </div>
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
          'active': 'is_active' in character && character.is_active,
          'inaccessible': 'is_accessible' in character && !character.is_accessible
        }"
      >
        <div class="character-header">
          <h3>{{ character.character_name }}</h3>
          <div class="status-tags">
            <span class="status-tag mode-tag" :class="`mode-${character.source}`">
              {{ character.source === 'cloud' ? '联机共修' : '单机闭关' }}
            </span>
            <span v-if="character.source === 'cloud'" class="status-tag user-tag" :class="userStore.user?.is_banned ? 'status-banned' : 'status-ok'">
              {{ userStore.user?.is_banned ? '账号封禁' : '道籍正常' }}
            </span>
          </div>
        </div>

        <div class="character-attributes">
          <div class="realm-info">
            <span class="realm-tag">{{ 'realm' in character ? character.realm : '??' }}</span>
            <span class="reputation-tag">声望: {{ 'reputation' in character ? character.reputation : '??' }}</span>
          </div>
          <div class="core-stats-grid">
            <div class="stat-item">
              <div class="stat-header">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stat-icon"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                <span class="stat-name">气血</span>
              </div>
              <span class="stat-value">{{ 'hp' in character ? character.hp : '??' }}/{{ 'hp_max' in character ? character.hp_max : '??' }}</span>
            </div>
            <div class="stat-item">
              <div class="stat-header">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stat-icon"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7z"/></svg>
                <span class="stat-name">灵气</span>
              </div>
              <span class="stat-value">{{ 'mana' in character ? character.mana : '??' }}/{{ 'mana_max' in character ? character.mana_max : '??' }}</span>
            </div>
            <div class="stat-item">
              <div class="stat-header">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stat-icon"><path d="M12 2a10 10 0 0 0-2 19.5A10 10 0 0 0 22 12h-2a8 8 0 0 1-8 8 8 8 0 0 1-8-8 8 8 0 0 1 8-8V2zM12 12a2 2 0 1 0 4 0 2 2 0 1 0-4 0z"/></svg>
                <span class="stat-name">神识</span>
              </div>
              <span class="stat-value">{{ 'spirit' in character ? character.spirit : '??' }}/{{ 'spirit_max' in character ? character.spirit_max : '??' }}</span>
            </div>
            <div class="stat-item">
              <div class="stat-header">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stat-icon"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>
                <span class="stat-name">寿命</span>
              </div>
              <span class="stat-value">{{ 'lifespan' in character ? character.lifespan : '??' }}</span>
            </div>
          </div>
          <div class="attribute-grid">
            <div class="attr-item"><span class="attr-name">根骨</span><span class="attr-value">{{ character.root_bone }}</span></div>
            <div class="attr-item"><span class="attr-name">灵性</span><span class="attr-value">{{ character.spirituality }}</span></div>
            <div class="attr-item"><span class="attr-name">悟性</span><span class="attr-value">{{ character.comprehension }}</span></div>
            <div class="attr-item"><span class="attr-name">气运</span><span class="attr-value">{{ character.fortune }}</span></div>
            <div class="attr-item"><span class="attr-name">魅力</span><span class="attr-value">{{ character.charm }}</span></div>
            <div class="attr-item"><span class="attr-name">心性</span><span class="attr-value">{{ character.temperament }}</span></div>
          </div>
        </div>

        <div class="character-info">
          <p><strong>世界:</strong> {{ getWorldName(character.world_id) }}</p>
          <p><strong>天资:</strong> {{ getTalentTierName(character.talent_tier_id) }}</p>
          <p><strong>创建时间:</strong> {{ formatDate(character.created_at) }}</p>
        </div>

        <div class="character-actions">
          <button
            v-if="!('is_accessible' in character) || character.is_accessible"
            @click="selectCharacter(character)"
            class="btn btn-select"
          >
            登入仙途
          </button>

          <button
            v-if="character.source === 'cloud' && 'is_active' in character && !character.is_active && character.is_accessible"
            @click="activateCharacter(character.id)"
            class="btn btn-activate"
          >
            激活
          </button>
          <button
            @click="setTavernCharacterName(character.character_name)"
            class="btn btn-tavern"
          >
            同步酒馆
          </button>
          <button
            @click="viewCharacterDetails(character)"
            class="btn btn-details"
          >
            详情
          </button>
          <button
            @click="deleteCharacter(character)"
            class="btn btn-delete"
          >
            删除
          </button>
        </div>

        <!-- 同步状态 (仅联机) -->
        <div v-if="'is_active' in character && character.is_active" class="sync-status">
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
import CharacterDetailsModal from './CharacterDetailsModal.vue'
import { useUserStore } from '@/stores/userStore'
import type { Character, World, TalentTier, CharacterData, LocalCharacter } from '@/types'
import { loadLocalCharacters, deleteLocalCharacter } from '@/data/localData'
import { toast } from '@/utils/toast'

const emit = defineEmits<{
  (e: 'select', character: CharacterData): void;
  (e: 'back'): void;
}>()

const staticData = ref<{ worlds: World[], talentTiers: TalentTier[] }>({ worlds: [], talentTiers: [] })
const userStore = useUserStore()
const characters = ref<CharacterData[]>([])
const selectedCharacter = ref<CharacterData | null>(null)
const syncStates = ref<Map<number, { has_unsaved_data: boolean, last_sync_time?: string }>>(new Map())

const loadStaticData = async () => {
  try {
    const [worlds, talentTiers] = await Promise.all([
      request.get<World[]>('/api/v1/worlds/worlds'),
      request.get<TalentTier[]>('/api/v1/talent_tiers/')
    ])
    staticData.value = { worlds, talentTiers }
  } catch (error) {
    console.error('加载静态数据失败:', error)
    toast.error('世界法则加载失败，部分信息可能无法显示。')
  }
}

const loadCharacters = async () => {
  const allCharacters: CharacterData[] = [];

  const [localResult, cloudResult] = await Promise.allSettled([
    loadLocalCharacters(),
    request.get<Character[]>('/api/v1/characters/my')
  ]);

  if (localResult.status === 'fulfilled') {
    const localChars = localResult.value.map(c => ({ ...c, source: 'local' as const }));
    allCharacters.push(...localChars);
  } else {
    console.error('加载本地角色失败:', localResult.reason);
    toast.error('本地洞府存档加载失败。');
  }

  if (cloudResult.status === 'fulfilled') {
    const cloudChars = cloudResult.value.map(c => ({ ...c, source: 'cloud' as const }));
    allCharacters.push(...cloudChars);
    const activeCharacter = cloudResult.value.find(c => c.is_active);
    if (activeCharacter) {
      await setTavernCharacterName(activeCharacter.character_name, true);
      await loadSyncStatus(activeCharacter.id);
    }
  } else {
    console.error('加载云端角色失败:', cloudResult.reason);
    toast.warning('云端角色同步失败，可能无法连接仙界。');
  }

  characters.value = allCharacters;
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
    toast.success('同步成功！')
  } catch (error) {
    console.error('同步失败:', error)
    toast.error('同步失败！')
  }
}

const deleteCharacter = async (character: CharacterData) => {
  if (confirm(`确定要删除角色"${character.character_name}"吗？此操作不可恢复。`)) {
    if (character.source === 'local') {
      await deleteLocalCharacter(character.id);
      toast.success('本地角色已删除。');
    } else {
      try {
        await request.delete(`/api/v1/characters/${character.id}`)
        toast.success('云端角色已删除。');
      } catch (error) {
        console.error('删除角色失败:', error)
      }
    }
    // 无论成功与否，都重新加载以刷新列表
    await loadCharacters();
  }
}

const checkBanStatus = async () => {
  try {
    const response = await request.get<{ message: string, is_banned: boolean }>('/api/v1/ban/check_ban_status')
    if (!response.is_banned) {
      await userStore.loadUserInfo()
    }
  } catch (error) {
    console.error('检查封禁状态失败:', error)
  }
}

const viewCharacterDetails = (character: CharacterData) => {
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


const selectCharacter = (character: CharacterData) => {
  emit('select', character)
}

const goBack = () => {
  emit('back')
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
  border-radius: 2rem;
  min-width: 80vw;
  border: 2px rgba(187, 154, 247, 0.5);
  background-color: #1a1b26;
  background-image: radial-gradient(circle at 10% 10%, rgba(122, 162, 247, 0.05), transparent 30%),
                    radial-gradient(circle at 90% 80%, rgba(187, 154, 247, 0.05), transparent 30%);
  color: #c0caf5;
  min-height: 80vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}
.header h2 {
  color: #bb9af7;
  text-shadow: 0 0 5px rgba(187, 154, 247, 0.5);
}

.header-actions { display: flex; align-items: center; gap: 1rem; }

.create-character-btn, .btn-back {
  background: linear-gradient(135deg, #c43ffc 0%, hsl(276, 100%, 24%) 100%);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}
.create-character-btn:hover, .btn-back:hover {
  box-shadow: 0 0 15px rgba(129, 129, 129, 0.785);
  transform: translateY(-2px);
}
.create-character-btn:disabled {
  background: #414868;
  color: #565f89;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.ban-notice {
  background: rgba(247, 118, 142, 0.1);
  border: 1px solid #f7768e;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  color: #f7768e;
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.character-card {
  border: 1px solid transparent;
  background-image: linear-gradient(#24283b, #24283b), linear-gradient(135deg, #414868, #7aa2f7);
  background-origin: border-box;
  background-clip: content-box, border-box;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  transition: all 0.3s ease;
  color: #c0caf5;
  display: flex;
  flex-direction: column;
}
.character-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(122, 162, 247, 0.3);
  background-image: linear-gradient(#24283b, #24283b), linear-gradient(135deg, #7aa2f7, #bb9af7);
}
.character-card.active {
  background-image: linear-gradient(#24283b, #24283b), linear-gradient(135deg, #9ece6a, #e0af68);
  box-shadow: 0 0 20px rgba(158, 206, 106, 0.4);
}

.character-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}
.character-header h3 {
  color: #e0af68;
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  text-shadow: 0 0 8px rgba(224, 175, 104, 0.5);
}

.status-tags { display: flex; gap: 0.5rem; flex-shrink: 0; }
.status-tag {
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 500;
  color: white;
}
.mode-tag.mode-multi { background: linear-gradient(135deg, #2196f3, #21cbf3); }
.mode-tag.mode-single { background: linear-gradient(135deg, #4caf50, #81c784); }
.user-tag.status-ok { background: #78909c; }
.user-tag.status-banned { background: #f7768e; }

.character-attributes { margin-bottom: 15px; }
.realm-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid;
  border-image-slice: 1;
  border-image-source: linear-gradient(to right, transparent, #414868, transparent);
}
.realm-tag {
  background-color: #bb9af7;
  color: #1a1b26;
  padding: 4px 10px;
  border-radius: 15px;
  font-weight: bold;
}
.reputation-tag { color: #e0af68; font-size: 14px; }

.core-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px; }
.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(30, 32, 46, 0.8);
  padding: 6px 10px;
  border-radius: 6px;
}
.stat-header {
  display: flex;
  align-items: center;
  gap: 6px;
}
.stat-icon {
  color: #7aa2f7;
  flex-shrink: 0;
}
.stat-name { color: #a9b1d6; }
.stat-value { font-weight: 600; color: #c0caf5; font-family: 'Consolas', 'monospace'; }

.attribute-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.attr-item { display: flex; justify-content: space-between; padding: 5px 8px; background: #1e202e; border-radius: 4px; font-size: 13px; }
.attr-name { color: #787c99; }
.attr-value { font-weight: 600; color: #c0caf5; }

.character-info {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid;
  border-image-slice: 1;
  border-image-source: linear-gradient(to right, transparent, #414868, transparent);
}
.character-info p { margin: 4px 0; font-size: 13px; color: #a9b1d6; }
.character-info strong { color: #787c99; }

.character-actions { display: flex; gap: 10px; margin-top: auto; flex-wrap: wrap; }
.btn {
  flex-grow: 1;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #414868;
  cursor: pointer;
  font-weight: 500;
  text-align: center;
  transition: all 0.2s ease;
  font-size: 13px;
}
.btn-select {
  background: linear-gradient(135deg, #9ece6a, #b9f27c);
  color: #1a1b26;
  border-color: #9ece6a;
  box-shadow: 0 2px 10px rgba(158, 206, 106, 0.3);
}
.btn-select:hover {
  box-shadow: 0 4px 15px rgba(185, 242, 124, 0.5);
  transform: scale(1.05);
}
.btn-activate { background: #7aa2f7; color: #1a1b26; }
.btn-tavern { background: #e0af68; color: #1a1b26; }
.btn-details { background: #414868; color: #c0caf5; }
.btn-details:hover { background: #565f89; }
.btn-delete { background: #f7768e; color: #1a1b26; }

.sync-status { margin-top: 15px; padding-top: 15px; border-top: 1px solid #414868; }
.sync-info { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
.sync-clean { color: #9ece6a; }
.sync-dirty { color: #e0af68; }
.btn-sync {
  background: none;
  border: 1px solid #787c99;
  color: #a9b1d6;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
}
</style>
