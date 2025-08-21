<!-- src/components/character-creation/CharacterDetailsModal.vue -->
<!-- 改造版: 兼容角色本体与存档详情 -->
<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-dialog" @click.stop>
      <div class="modal-header">
        <h2>{{ title }}</h2>
        <button @click="closeModal" class="close-btn">×</button>
      </div>

      <div class="modal-body">
        <!-- 模式一：显示存档详情 (GameState) -->
        <div v-if="gameState" class="details-view">
          <div class="info-section">
            <h3>存档核心状态</h3>
            <div class="info-grid compact">
              <div class="info-item">
                <span class="label">境界:</span>
                <span class="value realm-value">{{ gameState.titles?.[0] || '未知' }}</span>
              </div>
              <div class="info-item">
                <span class="label">声望:</span>
                <span class="value">{{ gameState.reputation ?? 0 }}</span>
              </div>
            </div>
          </div>
          <div class="info-section">
            <h3>已获天赋 ({{ gameState.talents.length }} 种)</h3>
            <div v-if="gameState.talents.length" class="talent-list">
              <div v-for="talent in gameState.talents" :key="talent.id" class="talent-item">
                <strong>{{ talent.name }} (Lv.{{ talent.level }})</strong>
                <p>{{ talent.description }}</p>
              </div>
            </div>
            <p v-else>尚未获得任何天赋。</p>
          </div>
        </div>

        <!-- 模式二：显示角色本体详情 (CharacterData) -->
        <div v-else class="details-view">
          <div class="info-section">
            <h3>基础信息</h3>
            <div class="info-grid">
              <!-- ... 此处保留原有的角色基础信息展示 ... -->
               <div class="info-item"><span class="label">角色名称:</span><span class="value">{{ character.character_name }}</span></div>
               <div class="info-item"><span class="label">所在世界:</span><span class="value">{{ getWorldName(character.world_id) }}</span></div>
               <div class="info-item"><span class="label">天资等级:</span><span class="value">{{ getTalentTierName(character.talent_tier?.id) }}</span></div>
               <div class="info-item"><span class="label">创建时间:</span><span class="value">{{ formatDate(character.created_at) }}</span></div>
            </div>
          </div>
          <div class="info-section">
            <h3>先天六司</h3>
            <div class="attributes-display">
              <!-- ... 此处保留原有的六维属性展示 ... -->
              <div class="attr-card"><div class="attr-name">根骨</div><div class="attr-value">{{ character.root_bone }}</div></div>
              <div class="attr-card"><div class="attr-name">灵性</div><div class="attr-value">{{ character.spirituality }}</div></div>
              <div class="attr-card"><div class="attr-name">悟性</div><div class="attr-value">{{ character.comprehension }}</div></div>
              <div class="attr-card"><div class="attr-name">气运</div><div class="attr-value">{{ character.fortune }}</div></div>
              <div class="attr-card"><div class="attr-name">魅力</div><div class="attr-value">{{ character.charm }}</div></div>
              <div class="attr-card"><div class="attr-name">心性</div><div class="attr-value">{{ character.temperament }}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="closeModal" class="btn-cancel">关闭</button>
        <!-- 在存档详情模式下，不显示激活按钮 -->
        <button
          v-if="!gameState && 'is_active' in character && !character.is_active"
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
import { computed } from 'vue'
import { request } from '@/services/request'
import type { CharacterData, World, TalentTier, CharacterGameState } from '@/types'
import { toast } from '@/utils/toast';

const props = defineProps<{
  character: CharacterData
  gameState?: CharacterGameState | null // 新增：可选的存档状态
  saveName?: string // 新增：可选的存档名称
  worlds?: World[] // 改为可选
  talentTiers?: TalentTier[] // 改为可选
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const title = computed(() => {
    if (props.gameState) {
        return `${props.character.character_name} - ${props.saveName || '存档'}详情`;
    }
    return `${props.character.character_name} - 详细信息`;
});

// --- 此处省略了原有的云端同步、激活等逻辑，因为在存档详情模式下不需要 ---
// --- 如果需要在角色详情模式下保留，可以将其保留 ---

const activateCharacter = async () => {
  try {
    await request.post(`/api/v1/characters/${props.character.id}/activate`)
    toast.success('角色激活成功')
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
  return props.worlds?.find(w => w.id === worldId)?.name || `未知世界`
}

const getTalentTierName = (tierId: number) => {
  return props.talentTiers?.find(t => t.id === tierId)?.name || `未知天资`
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

</script>

<style scoped>
/* --- 核心样式 (大部分保留，仅作微调) --- */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-dialog {
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-primary);
  flex-shrink: 0;
}
.modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-family: var(--font-family-serif);
}

.close-btn {
  background: none; border: none; font-size: 1.5rem; cursor: pointer;
  color: var(--color-text-secondary); padding: 0; width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  transition: color 0.2s ease;
}
.close-btn:hover { color: var(--color-text); }

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.info-section {
  margin-bottom: 2rem;
}
.info-section:last-child {
    margin-bottom: 0;
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
  gap: 1rem;
}
.info-grid.compact {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--color-background);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}
.label { color: var(--color-text-secondary); font-weight: 500; }
.value { color: var(--color-text); font-weight: 600; }
.realm-value { color: var(--color-accent); font-weight: bold; }

.attributes-display {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 1rem;
}
.attr-card {
  text-align: center; padding: 1rem; background: var(--color-background);
  border-radius: 10px; border: 1px solid var(--color-border);
}
.attr-name { font-size: 0.9rem; font-weight: 500; margin-bottom: 0.25rem; }
.attr-value { font-size: 1.5rem; font-weight: bold; margin-bottom: 0.25rem; }

/* --- 新增：天赋列表样式 --- */
.talent-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.talent-item {
    background: var(--color-background);
    padding: 1rem;
    border-radius: 8px;
    border-left: 4px solid var(--color-primary);
}
.talent-item strong {
    color: var(--color-text);
    font-size: 1.1rem;
}
.talent-item p {
    margin: 0.5rem 0 0;
    color: var(--color-text-secondary);
}


.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-background-soft);
  border-radius: 0 0 12px 12px;
  flex-shrink: 0;
}

.btn-cancel, .btn-activate {
  padding: 0.6rem 1.2rem; border-radius: 6px; cursor: pointer;
  font-weight: 500; transition: all 0.2s ease;
}
.btn-cancel {
  border: 1px solid var(--color-border); background: transparent; color: var(--color-text);
}
.btn-cancel:hover { background: var(--color-surface-light); }
.btn-activate {
  border: 1px solid var(--color-nature); background: var(--color-nature); color: var(--color-background);
}
.btn-activate:hover { opacity: 0.8; }
</style>