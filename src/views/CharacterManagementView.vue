<!-- src/views/CharacterManagementView.vue -->
<template>
  <div class="character-management-view">
    <div class="header">
      <h2 class="view-title">唤醒旧识</h2>
      <button @click="goBack" class="btn">
        返回道途
      </button>
    </div>

    <!-- 加载中提示 -->
    <div v-if="isLoading" class="loading-shroud">
      <div class="spinner"></div>
      <p>正在从天地法则中唤醒旧识...</p>
    </div>

    <!-- 封号提示 -->
    <div v-else-if="userStore.user?.is_banned" class="ban-notice">
      <h3>道籍封禁</h3>
      <p>你的道籍已被封禁，无法访问或创建法身。如有疑问请联系天道管理员。</p>
      <button @click="checkBanStatus" class="btn btn-secondary">检查封禁状态</button>
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
            <span class="status-tag" :class="`mode-${character.source}`">
              {{ character.source === 'cloud' ? '联机共修' : '单机闭关' }}
            </span>
          </div>
        </div>

        <div class="character-body">
          <div class="realm-info">
            <span class="realm-tag">{{ 'realm' in character ? character.realm : '江湖新秀' }}</span>
            <span class="reputation-tag">声望: {{ 'reputation' in character ? character.reputation : '0' }}</span>
          </div>
          <div class="core-stats-grid">
            <div class="stat-item">气血: <span>{{ 'hp' in character ? character.hp : '??' }}/{{ 'hp_max' in character ? character.hp_max : '??' }}</span></div>
            <div class="stat-item">灵力: <span>{{ 'mana' in character ? character.mana : '??' }}/{{ 'mana_max' in character ? character.mana_max : '??' }}</span></div>
            <div class="stat-item">神识: <span>{{ 'spirit' in character ? character.spirit : '??' }}/{{ 'spirit_max' in character ? character.spirit_max : '??' }}</span></div>
            <div class="stat-item">寿元: <span>{{ 'lifespan' in character ? character.lifespan : '??' }}</span></div>
          </div>
        </div>

        <!-- 六维图单独作为一个区域 -->
        <div class="hexagon-section">
          <HexagonChart :stats="extractSixDimensions(character)" :size="180" />
        </div>

        <div class="character-footer">
          <div class="character-info">
            <p><strong>世界:</strong> {{ getWorldName(character.world_id) }}</p>
            <p><strong>创建于:</strong> {{ formatDate(character.created_at) }}</p>
          </div>
          <div class="character-actions">
            <button
              v-if="!('is_accessible' in character) || character.is_accessible"
              @click="selectCharacter(character)"
              class="btn btn-primary"
            >
              登入仙途
            </button>
            <button
              @click="viewCharacterDetails(character)"
              class="btn btn-secondary"
            >
              详情
            </button>
            <button
              @click="deleteCharacter(character)"
              class="btn btn-danger"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 角色详情模态框 -->
    <CharacterDetailsModal
      v-if="selectedCharacter"
      :character="selectedCharacter"
      :worlds="staticData.worlds"
      :talent-tiers="staticData.talentTiers"
      @close="selectedCharacter = null"
      @updated="loadCharacters"
    />
  </div>
</template>

<script setup lang="ts">
import HexagonChart from '@/components/common/HexagonChart.vue';
// Logic remains the same as the original component
import { ref, onMounted } from 'vue'
import { request } from '@/services/request'
import CharacterDetailsModal from '@/components/character-creation/CharacterDetailsModal.vue'
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
const isLoading = ref(true);
const syncStates = ref<Map<number, { has_unsaved_data: boolean, last_sync_time?: string }>>(new Map())

const loadStaticData = async () => {
  try {
    const [worlds, talentTiers] = await Promise.all([
      request.get<World[]>('/api/v1/worlds/'),
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
    toast.error('本地洞府存档加载失败。');
  }

  if (cloudResult.status === 'fulfilled') {
    const cloudChars = cloudResult.value.map(c => ({ ...c, source: 'cloud' as const }));
    allCharacters.push(...cloudChars);
  } else {
    toast.warning('云端角色同步失败，可能无法连接仙界。');
  }

  characters.value = allCharacters;
}

const deleteCharacter = async (character: CharacterData) => {
  if (confirm(`确定要删除法身 "${character.character_name}" 吗？此操作不可恢复。`)) {
    if (character.source === 'local') {
      await deleteLocalCharacter(character.id);
      toast.success('本地法身已删除。');
    } else {
      try {
        await request.delete(`/api/v1/characters/${character.id}`)
        toast.success('云端法身已删除。');
      } catch (error) {
        console.error('删除角色失败:', error)
      }
    }
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

const selectCharacter = (character: CharacterData) => {
  emit('select', character)
}

const goBack = () => {
  emit('back')
}

// 辅助函数
const getWorldName = (worldId: number) => {
  return staticData.value.worlds.find(w => w.id === worldId)?.name || `未知世界`
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}

const extractSixDimensions = (character: CharacterData) => {
  return {
    root_bone: 'root_bone' in character ? character.root_bone : 0,
    spirituality: 'spirituality' in character ? character.spirituality : 0,
    comprehension: 'comprehension' in character ? character.comprehension : 0,
    fortune: 'fortune' in character ? character.fortune : 0,
    charm: 'charm' in character ? character.charm : 0,
    temperament: 'temperament' in character ? character.temperament : 0,
  };
};

onMounted(async () => {
  isLoading.value = true;
  try {
    // 并行加载所有需要的数据
    await Promise.all([
      userStore.loadUserInfo(),
      loadStaticData(),
      loadCharacters()
    ]);
  } catch (error) {
    console.error("加载角色管理数据时出错:", error);
    toast.error("数据加载失败，请稍后再试。");
  } finally {
    isLoading.value = false;
  }
})
</script>

<style scoped>
.character-management-view {
  width: 100%;
  height: 100%;
  padding: 2rem;
  box-sizing: border-box;
  background-color: var(--color-background);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  gap: 2rem;
  position: relative; /* 为加载遮罩提供定位上下文 */
}

.loading-shroud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(var(--color-background-rgb), 0.8);
  backdrop-filter: blur(5px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
  color: var(--color-primary);
}

.spinner {
  border: 4px solid rgba(var(--color-text-rgb), 0.2);
  border-left-color: var(--color-primary);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.view-title {
  font-family: var(--font-family-serif);
  color: var(--color-primary);
  font-size: 2rem;
  margin: 0;
  text-shadow: 0 0 10px rgba(var(--color-primary-rgb), 0.3);
}

.ban-notice {
  background: var(--color-danger-bg);
  border: 1px solid var(--color-danger);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  color: var(--color-danger);
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  overflow-y: auto;
  flex-grow: 1;
  padding-right: 1rem; /* For scrollbar spacing */
}

.character-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: all 0.3s ease;
  margin-top: 5px; /* 为悬浮上移特效预留空间 */
}
.character-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(var(--color-primary-rgb), 0.1);
  border-color: var(--color-primary);
}
.character-card.active {
  border-color: var(--color-special);
  box-shadow: 0 0 20px rgba(var(--color-special-rgb), 0.3);
}

.character-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.character-header h3 {
  color: var(--color-accent);
  margin: 0;
  font-size: 1.5rem;
}

.status-tag {
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid;
}
.mode-cloud { 
  color: var(--color-info);
  border-color: var(--color-info);
  background-color: rgba(var(--color-info-rgb), 0.1);
}
.mode-local {
  color: var(--color-success);
  border-color: var(--color-success);
  background-color: rgba(var(--color-success-rgb), 0.1);
}

.character-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.realm-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}
.realm-tag {
  background-color: var(--color-primary);
  color: var(--color-background);
  padding: 4px 10px;
  border-radius: 15px;
  font-weight: bold;
  font-size: 0.9em;
}
.reputation-tag { color: var(--color-accent); font-size: 0.9em; }

.core-stats-grid {
  display: grid;
  /* 恢复为更优的两列自动填充布局 */
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem 1rem;
  font-size: 0.9em;
  color: var(--color-text-secondary);
}

.hexagon-section {
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid var(--color-border);
}
.stat-item {
  display: flex;
  justify-content: space-between; /* 标签和值分开 */
  white-space: nowrap; /* 防止标签和值内部换行 */
}
.stat-item span {
  font-weight: bold;
  color: var(--color-text);
  font-family: 'Consolas', 'monospace';
}

.character-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap; /* 允许换行 */
  gap: 1rem;
}
.character-info {
  font-size: 0.85em;
  color: var(--color-text-secondary);
  line-height: 1.6;
  flex-grow: 1; /* 占据多余空间 */
}
.character-info p { margin: 0; }
.character-info strong { color: var(--color-text); }

.character-actions {
  display: flex; 
  gap: 0.5rem; 
  flex-shrink: 0;
}

/* General Button Styles - can be moved to a global file */
.btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background-color: var(--color-surface-light);
  color: var(--color-text);
  cursor: pointer;
  font-weight: 500;
  text-align: center;
  transition: all 0.2s ease;
}
.btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.btn-primary {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-background);
}
.btn-primary:hover {
  background-color: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-background);
}
.btn-secondary:hover {
  background-color: var(--color-surface-heavy);
}
.btn-danger {
  border-color: var(--color-danger);
  color: var(--color-danger);
}
.btn-danger:hover {
  background-color: var(--color-danger);
  color: var(--color-background);
}
</style>