<template>
  <div class="character-details-panel">
    <!-- 角色头像卡片 -->
    <div class="character-header-card">
      <div class="card-gradient"></div>
      <div class="avatar-section">
        <div class="character-avatar" :class="getAvatarClass()">
          <span class="avatar-text">{{ getAvatarText() }}</span>
          <div class="avatar-glow"></div>
        </div>
        <div class="character-basic-info">
          <h2 class="character-name">{{ characterData.名字 }}</h2>
          <div class="character-subtitle">{{ characterData.天资 }} · {{ characterData.灵根 }}</div>
          <div class="character-details">
            <div class="detail-row">
              <span class="detail-icon">🏛️</span>
              <span class="detail-label">出身</span>
              <span class="detail-value">{{ characterData.出生 || '普通' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">👤</span>
              <span class="detail-label">性别</span>
              <span class="detail-value">{{ characterData.性别 }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">🌍</span>
              <span class="detail-label">世界</span>
              <span class="detail-value">{{ characterData.世界 }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">📍</span>
              <span class="detail-label">位置</span>
              <span class="detail-value">{{ playerStatus.位置?.描述 || '未知位置' }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="status-indicators">
        <div class="status-item realm-status">
          <div class="status-icon">🌟</div>
          <div class="status-info">
            <span class="status-label">修为境界</span>
            <span class="status-value realm">{{ currentRealm.名称 }}</span>
            <div class="status-progress">
              <div class="progress-mini">
                <div class="progress-fill-mini" :style="{ width: realmProgress + '%' }"></div>
              </div>
              <span class="progress-text-mini">{{ Math.round(realmProgress) }}%</span>
            </div>
          </div>
        </div>
        <div class="status-item age-status">
          <div class="status-icon">⚖️</div>
          <div class="status-info">
            <span class="status-label">寿命</span>
            <span class="status-value age">{{ playerStatus.寿命?.当前 || 18 }}/{{ playerStatus.寿命?.最大 || 100 }}年</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 先天六司卡片 -->
    <div class="innate-attributes-card">
      <div class="card-header">
        <div class="header-icon">⚡</div>
        <h3 class="card-title">先天六司</h3>
        <div class="attributes-summary">{{ getTotalAttributes() }}点</div>
      </div>
      <div class="attributes-grid">
        <div 
          v-for="(value, key) in characterData.先天六司" 
          :key="key" 
          class="attribute-card"
          :class="getAttributeQuality(value)"
        >
          <div class="attribute-icon">{{ getAttributeIcon(key) }}</div>
          <div class="attribute-info">
            <div class="attribute-name">{{ key }}</div>
            <div class="attribute-value">{{ value }}</div>
            <div class="attribute-rating">{{ getAttributeRating(value) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 实时状态卡片 -->
    <div class="status-card">
      <div class="card-header">
        <div class="header-icon">❤️</div>
        <h3 class="card-title">实时状态</h3>
        <button class="refresh-btn" @click="refreshStatus" :disabled="loading">
          <RefreshCw :size="14" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
      <div class="status-bars">
        <div class="status-bar-item">
          <div class="bar-header">
            <span class="bar-label">气血</span>
            <span class="bar-value">{{ playerStatus.气血?.当前 || 0 }}/{{ playerStatus.气血?.最大 || 100 }}</span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill hp" 
              :style="{ width: getProgressPercent(playerStatus.气血) + '%' }"
            ></div>
          </div>
        </div>
        
        <div class="status-bar-item">
          <div class="bar-header">
            <span class="bar-label">灵气</span>
            <span class="bar-value">{{ playerStatus.灵气?.当前 || 0 }}/{{ playerStatus.灵气?.最大 || 100 }}</span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill mana" 
              :style="{ width: getProgressPercent(playerStatus.灵气) + '%' }"
            ></div>
          </div>
        </div>
        
        <div class="status-bar-item">
          <div class="bar-header">
            <span class="bar-label">神识</span>
            <span class="bar-value">{{ playerStatus.神识?.当前 || 0 }}/{{ playerStatus.神识?.最大 || 100 }}</span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill spirit" 
              :style="{ width: getProgressPercent(playerStatus.神识) + '%' }"
            ></div>
          </div>
        </div>
        
        <div class="status-bar-item">
          <div class="bar-header">
            <span class="bar-label">寿命</span>
            <span class="bar-value">{{ playerStatus.寿命?.当前 || 0 }}/{{ playerStatus.寿命?.最大 || 100 }}年</span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill lifespan" 
              :style="{ width: getProgressPercent(playerStatus.寿命) + '%' }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 修炼信息卡片 -->
    <div class="cultivation-info-card">
      <div class="card-header">
        <div class="header-icon">🔥</div>
        <h3 class="card-title">修炼信息</h3>
      </div>
      <div class="cultivation-content">
        <div class="realm-section">
          <div class="realm-info">
            <div class="current-realm">
              <span class="realm-name">{{ currentRealm.名称 }}</span>
              <div class="realm-progress-info">
                <span class="progress-text">{{ currentRealm.当前进度 }}/{{ currentRealm.下一级所需 }}</span>
                <span class="progress-percent">{{ getRealmProgressPercent() }}%</span>
              </div>
            </div>
            <div class="realm-progress-bar">
              <div 
                class="realm-progress-fill" 
                :style="{ width: getRealmProgressPercent() + '%' }"
              ></div>
            </div>
          </div>
          <div class="breakthrough-desc">
            <span class="desc-label">突破描述：</span>
            <span class="desc-content">{{ currentRealm.突破描述 || '继续修炼，积累修为' }}</span>
          </div>
        </div>
        
        <div class="cultivation-stats">
          <div class="stat-item">
            <span class="stat-label">声望</span>
            <span class="stat-value reputation">{{ playerStatus.声望 || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">位置</span>
            <span class="stat-value location">{{ playerStatus.位置?.描述 || '未知' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 天赋灵根卡片 -->
    <div class="talent-spiritual-root-card">
      <div class="card-header">
        <div class="header-icon">🌿</div>
        <h3 class="card-title">天赋与灵根</h3>
      </div>
      <div class="talent-root-content">
        <div class="talents-section">
          <div class="section-title">天赋</div>
          <div class="talents-list">
            <div 
              v-for="talent in characterData.天赋" 
              :key="talent"
              class="talent-badge"
            >
              {{ talent }}
            </div>
            <div v-if="!characterData.天赋?.length" class="empty-talents">
              暂无特殊天赋
            </div>
          </div>
        </div>
        
        <div class="spiritual-root-section">
          <div class="section-title">灵根</div>
          <div class="spiritual-root-info">
            <div class="root-name">{{ characterData.灵根 }}</div>
            <div class="root-description">{{ getSpiritualRootDescription() }}</div>
          </div>
        </div>
        
        <div class="aptitude-section">
          <div class="section-title">天资</div>
          <div class="aptitude-info">
            <div class="aptitude-value" :class="getAptitudeClass()">
              {{ characterData.天资 }}
            </div>
            <div class="aptitude-description">{{ getAptitudeDescription() }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 状态效果卡片 -->
    <div v-if="statusEffects.length > 0" class="status-effects-card">
      <div class="card-header">
        <div class="header-icon">✨</div>
        <h3 class="card-title">状态效果</h3>
        <div class="effects-count">{{ statusEffects.length }}个</div>
      </div>
      <div class="effects-list">
        <div 
          v-for="effect in statusEffects" 
          :key="effect.状态名称"
          class="effect-item"
          :class="effect.类型 === 'BUFF' ? 'buff' : 'debuff'"
        >
          <div class="effect-icon">
            {{ effect.类型 === 'BUFF' ? '⬆️' : '⬇️' }}
          </div>
          <div class="effect-info">
            <div class="effect-name">{{ effect.状态名称 }}</div>
            <div class="effect-desc">{{ effect.状态描述 }}</div>
            <div class="effect-meta">
              <span class="effect-time">{{ effect.时间 }}</span>
              <span v-if="effect.强度" class="effect-strength">强度:{{ effect.强度 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { RefreshCw } from 'lucide-vue-next';
import { useCharacterStore } from '@/stores/characterStore';
import { getTavernHelper } from '@/utils/tavern';
import { toast } from '@/utils/toast';
import type { CharacterBaseInfo, PlayerStatus, StatusEffect, Realm } from '@/types/game';

const characterStore = useCharacterStore();

// 响应式数据
const loading = ref(false);
const playerStatus = ref<PlayerStatus>({
  境界: { 等级: 0, 名称: '凡人', 当前进度: 0, 下一级所需: 100, 突破描述: '' },
  声望: 0,
  位置: { 描述: '未知', 坐标: { X: 0, Y: 0 } },
  气血: { 当前: 100, 最大: 100 },
  灵气: { 当前: 100, 最大: 100 },
  神识: { 当前: 100, 最大: 100 },
  寿命: { 当前: 18, 最大: 100 },
  修为: { 当前: 0, 最大: 1000 },
  状态效果: []
});

const statusEffects = computed(() => playerStatus.value.状态效果 || []);

// 角色数据
const characterData = computed((): CharacterBaseInfo => {
  const profile = characterStore.activeCharacterProfile;
  return profile?.角色基础信息 || {
    名字: '未知修士',
    性别: '未知',
    世界: '未知世界',
    天资: '普通',
    出生: '未知',
    灵根: '无灵根',
    天赋: [],
    先天六司: {
      根骨: 50,
      灵性: 50,
      悟性: 50,
      气运: 50,
      魅力: 50,
      心性: 50
    }
  };
});

const currentRealm = computed((): Realm => {
  return playerStatus.value.境界 || {
    等级: 0,
    名称: '凡人',
    当前进度: 0,
    下一级所需: 100,
    突破描述: ''
  };
});

const currentAge = computed((): number => {
  const maxAge = playerStatus.value.寿命?.最大 || 100;
  const currentLifespan = playerStatus.value.寿命?.当前 || 18;
  return maxAge - currentLifespan + 18;
});

const realmProgress = computed((): number => {
  const realm = currentRealm.value;
  return realm.下一级所需 > 0 ? (realm.当前进度 / realm.下一级所需) * 100 : 0;
});

// 获取头像类样式
const getAvatarClass = (): string => {
  const gender = characterData.value.性别;
  return gender === '女' ? 'female' : 'male';
};

// 获取头像文字
const getAvatarText = (): string => {
  return characterData.value.名字?.charAt(0) || '修';
};

// 获取总属性点数
const getTotalAttributes = (): number => {
  const attrs = characterData.value.先天六司;
  return Object.values(attrs).reduce((sum, val) => sum + val, 0);
};

// 获取属性图标
const getAttributeIcon = (key: string): string => {
  const iconMap: Record<string, string> = {
    '根骨': '🦴',
    '灵性': '✨',
    '悟性': '🧠',
    '气运': '🍀',
    '魅力': '💫',
    '心性': '💎'
  };
  return iconMap[key] || '📊';
};

// 获取属性品质
const getAttributeQuality = (value: number): string => {
  if (value >= 90) return 'legendary';
  if (value >= 80) return 'epic';
  if (value >= 70) return 'rare';
  if (value >= 60) return 'uncommon';
  return 'common';
};

// 获取属性评级
const getAttributeRating = (value: number): string => {
  if (value >= 95) return '完美';
  if (value >= 90) return '绝世';
  if (value >= 85) return '超凡';
  if (value >= 80) return '卓越';
  if (value >= 75) return '优秀';
  if (value >= 70) return '良好';
  if (value >= 60) return '一般';
  if (value >= 50) return '普通';
  if (value >= 40) return '较差';
  return '糟糕';
};

// 获取进度百分比
const getProgressPercent = (stat: { 当前: number; 最大: number } | undefined): number => {
  if (!stat || !stat.最大) return 0;
  return Math.min(100, Math.max(0, (stat.当前 / stat.最大) * 100));
};

// 获取境界进度百分比
const getRealmProgressPercent = (): number => {
  const realm = currentRealm.value;
  if (!realm.下一级所需) return 0;
  return Math.min(100, Math.max(0, (realm.当前进度 / realm.下一级所需) * 100));
};

// 获取灵根描述
const getSpiritualRootDescription = (): string => {
  const root = characterData.value.灵根;
  const descMap: Record<string, string> = {
    '五行均衡': '五行之力均衡，修炼稳定',
    '单灵根': '天赋异禀，专精一道',
    '双灵根': '双属性并修，变化多端',
    '三灵根': '三系共存，修炼复杂',
    '四灵根': '四象俱全，根基深厚',
    '无灵根': '天生无法感应灵气'
  };
  return descMap[root] || '修炼路漫漫';
};

// 获取天资等级
const getAptitudeClass = (): string => {
  const aptitude = characterData.value.天资;
  const classMap: Record<string, string> = {
    '绝世': 'legendary',
    '超凡': 'epic', 
    '卓越': 'rare',
    '优秀': 'uncommon',
    '良好': 'common',
    '一般': 'common',
    '普通': 'common'
  };
  return classMap[aptitude] || 'common';
};

// 获取天资描述
const getAptitudeDescription = (): string => {
  const aptitude = characterData.value.天资;
  const descMap: Record<string, string> = {
    '绝世': '万中无一的修炼奇才',
    '超凡': '天赋异禀，前途无量',
    '卓越': '资质上佳，进展神速',
    '优秀': '天分不错，勤能补拙',
    '良好': '中等偏上，稳步前行',
    '一般': '平常之资，需要努力',
    '普通': '普通资质，需要机缘'
  };
  return descMap[aptitude] || '修炼靠自己';
};

// 刷新状态
const refreshStatus = async () => {
  loading.value = true;
  try {
    await loadPlayerStatus();
    toast.success('状态已刷新');
  } catch (error) {
    console.error('[人物详情] 刷新状态失败:', error);
    toast.error('刷新失败');
  } finally {
    loading.value = false;
  }
};

// 加载玩家状态
const loadPlayerStatus = async () => {
  try {
    const activeSave = characterStore.activeSaveSlot;
    if (activeSave?.存档数据) {
      const saveData = activeSave.存档数据;
      if (saveData.玩家角色状态) {
        playerStatus.value = saveData.玩家角色状态;
      }
    }

    // 尝试从酒馆获取实时数据
    const helper = getTavernHelper();
    if (helper) {
      const chatVars = await helper.getVariables({ type: 'chat' });
      const character = chatVars.character as any;
      
      if (character?.status) {
        // 更新实时状态
        Object.assign(playerStatus.value, character.status);
      }
    }
  } catch (error) {
    console.error('[人物详情] 加载玩家状态失败:', error);
  }
};

onMounted(() => {
  loadPlayerStatus();
});
</script>

<style scoped>
.character-details-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  min-height: 0;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  overflow-y: auto;
  padding: 1rem;
  padding-bottom: 3rem; /* 增加底部边距确保能滚动到底 */
  
  /* 改进的滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(59, 130, 246, 0.3) rgba(243, 244, 246, 0.5);
}

/* Webkit 滚动条样式 */
.character-details-panel::-webkit-scrollbar {
  width: 8px;
}

.character-details-panel::-webkit-scrollbar-track {
  background: rgba(243, 244, 246, 0.5);
  border-radius: 4px;
}

.character-details-panel::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.3);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.character-details-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.5);
}

/* 角色头像卡片 */
.character-header-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.character-avatar {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.25rem;
  color: white;
}

.character-avatar.male {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.character-avatar.female {
  background: linear-gradient(135deg, #ec4899, #be185d);
}

.character-basic-info {
  flex: 1;
}

.character-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.8), 0 0 10px rgba(59, 130, 246, 0.3);
  background: linear-gradient(135deg, #1e293b, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  /* 提供fallback颜色以防渐变失效 */
  position: relative;
}

.character-details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
}

.detail-label {
  color: #6b7280;
  font-weight: 500;
}

.detail-value {
  color: #111827;
  font-weight: 700;
}

.status-indicators {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border: 1px solid #f3f4f6;
}

.status-icon {
  font-size: 1.25rem;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.status-label {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}

.status-value.realm {
  color: #dc2626;
  font-weight: 700;
}

.status-value.age {
  color: #059669;
  font-weight: 600;
}

/* 先天六司卡片 */
.innate-attributes-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.header-icon {
  font-size: 1.25rem;
}

.card-title {
  flex: 1;
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
}

.attributes-summary {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.attributes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.attribute-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.attribute-card.common { background: #f9fafb; }
.attribute-card.uncommon { background: #f0f9ff; border-color: #bae6fd; }
.attribute-card.rare { background: #f0fdf4; border-color: #bbf7d0; }
.attribute-card.epic { background: #fdf4ff; border-color: #f3e8ff; }
.attribute-card.legendary { background: #fef3c7; border-color: #fde68a; }

.attribute-icon {
  font-size: 1.25rem;
}

.attribute-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.attribute-name {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}

.attribute-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
}

.attribute-rating {
  font-size: 0.625rem;
  color: #6b7280;
  font-weight: 500;
}

/* 实时状态卡片 */
.status-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.refresh-btn {
  width: 2rem;
  height: 2rem;
  border: none;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-btn:hover {
  background: #e5e7eb;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.status-bars {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.status-bar-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.bar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bar-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.bar-value {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
}

.progress-bar {
  height: 0.5rem;
  background: #f3f4f6;
  border-radius: 0.25rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.progress-fill.hp { background: linear-gradient(90deg, #dc2626, #ef4444); }
.progress-fill.mana { background: linear-gradient(90deg, #2563eb, #3b82f6); }
.progress-fill.spirit { background: linear-gradient(90deg, #7c3aed, #8b5cf6); }
.progress-fill.lifespan { background: linear-gradient(90deg, #059669, #10b981); }

/* 修炼信息卡片 */
.cultivation-info-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.realm-section {
  margin-bottom: 1rem;
}

.realm-info {
  margin-bottom: 0.75rem;
}

.current-realm {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.realm-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #dc2626;
}

.realm-progress-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.125rem;
}

.progress-text {
  font-size: 0.75rem;
  color: #6b7280;
}

.progress-percent {
  font-size: 0.875rem;
  font-weight: 600;
  color: #059669;
}

.realm-progress-bar {
  height: 0.75rem;
  background: #f3f4f6;
  border-radius: 0.375rem;
  overflow: hidden;
}

.realm-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #d97706);
  transition: width 0.3s ease;
}

.breakthrough-desc {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;
}

.desc-label {
  font-weight: 500;
}

.desc-content {
  color: #374151;
}

.cultivation-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.stat-value.reputation {
  color: #dc2626;
  font-weight: 600;
}

.stat-value.location {
  color: #3b82f6;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 天赋灵根卡片 */
.talent-spiritual-root-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.talent-root-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.talents-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.talent-badge {
  padding: 0.375rem 0.75rem;
  background: #f0f9ff;
  color: #1e40af;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid #bfdbfe;
}

.empty-talents {
  color: #6b7280;
  font-size: 0.875rem;
  font-style: italic;
}

.spiritual-root-info,
.aptitude-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.root-name,
.aptitude-value {
  font-size: 1rem;
  font-weight: 600;
}

.aptitude-value.common { color: #6b7280; }
.aptitude-value.uncommon { color: #2563eb; }
.aptitude-value.rare { color: #059669; }
.aptitude-value.epic { color: #7c3aed; }
.aptitude-value.legendary { color: #dc2626; }

.root-description,
.aptitude-description {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;
}

/* 状态效果卡片 */
.status-effects-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.effects-count {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
}

.effects-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 12rem;
  overflow-y: auto;
}

.effect-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid;
}

.effect-item.buff {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.effect-item.debuff {
  background: #fef2f2;
  border-color: #fecaca;
}

.effect-icon {
  font-size: 1rem;
}

.effect-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.effect-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: #111827;
}

.effect-desc {
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;
}

.effect-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.625rem;
  color: #9ca3af;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
}

.action-btn.primary {
  background: #3b82f6;
  color: white;
}

.action-btn.primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.action-btn.secondary {
  background: #f9fafb;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.action-btn.secondary:hover {
  background: #f3f4f6;
  transform: translateY(-1px);
}

/* 深色主题适配 */
[data-theme="dark"] .character-details-panel {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}

[data-theme="dark"] .character-header-card,
[data-theme="dark"] .innate-attributes-card,
[data-theme="dark"] .status-card,
[data-theme="dark"] .cultivation-info-card,
[data-theme="dark"] .talent-spiritual-root-card,
[data-theme="dark"] .status-effects-card {
  background: #1e293b;
  border-color: #475569;
}

[data-theme="dark"] .character-name,
[data-theme="dark"] .card-title,
[data-theme="dark"] .detail-value,
[data-theme="dark"] .attribute-value,
[data-theme="dark"] .bar-label,
[data-theme="dark"] .realm-name,
[data-theme="dark"] .section-title,
[data-theme="dark"] .effect-name {
  color: #f1f5f9;
}

/* 深色主题下的角色姓名特殊处理 */
[data-theme="dark"] .character-name {
  color: #f1f5f9;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8), 0 0 10px rgba(130, 163, 245, 0.5);
  background: linear-gradient(135deg, #f1f5f9, #82a3f5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

[data-theme="dark"] .card-header {
  border-color: #374151;
}

[data-theme="dark"] .status-item,
[data-theme="dark"] .attribute-card,
[data-theme="dark"] .stat-item {
  background: #374151;
  border-color: #475569;
}

[data-theme="dark"] .progress-bar,
[data-theme="dark"] .realm-progress-bar {
  background: #374151;
}

[data-theme="dark"] .talent-badge {
  background: #1e293b;
  border-color: #475569;
  color: #93c5fd;
}

[data-theme="dark"] .effect-item.buff {
  background: #1e293b;
  border-color: #374151;
}

[data-theme="dark"] .effect-item.debuff {
  background: #1e293b;
  border-color: #374151;
}

[data-theme="dark"] .action-btn.secondary {
  background: #374151;
  border-color: #475569;
  color: #cbd5e1;
}

[data-theme="dark"] .action-btn.secondary:hover {
  background: #475569;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .character-details-panel {
    gap: 0.75rem;
  }
  
  .attributes-grid,
  .status-indicators,
  .cultivation-stats {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .character-details {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .effects-list {
    max-height: 8rem;
  }
}

@media (max-width: 480px) {
  .avatar-section {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }
  
  .character-header-card,
  .innate-attributes-card,
  .status-card,
  .cultivation-info-card,
  .talent-spiritual-root-card,
  .status-effects-card {
    padding: 1rem;
  }
}
</style>