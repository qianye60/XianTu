
<template>
  <div class="right-sidebar">
    <div class="sidebar-header">
      <h3 class="sidebar-title">
        <Activity :size="18" class="title-icon" />
        <span>角色状态</span>
      </h3>
    </div>

    <div v-if="isDataLoaded && characterInfo" class="sidebar-content">
      <!-- 修行状态 -->
      <div class="vitals-section">
        <h3 class="section-title">
          <Heart :size="14" class="section-icon" />
          <span>修行状态</span>
        </h3>
        <div class="vitals-list">
          <div class="vital-item">
            <div class="vital-info">
              <span class="vital-name">
                <Droplet :size="12" class="vital-icon blood" />
                <span>气血</span>
              </span>
              <span class="vital-text">{{ playerStatus?.气血?.当前 }} / {{ playerStatus?.气血?.上限 }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill health" :style="{ width: getVitalPercent('气血') + '%' }"></div>
            </div>
          </div>

          <div class="vital-item">
            <div class="vital-info">
              <span class="vital-name">
                <Sparkles :size="12" class="vital-icon mana" />
                <span>灵气</span>
              </span>
              <span class="vital-text">{{ playerStatus?.灵气?.当前 }} / {{ playerStatus?.灵气?.上限 }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill mana" :style="{ width: getVitalPercent('灵气') + '%' }"></div>
            </div>
          </div>

          <div class="vital-item">
            <div class="vital-info">
              <span class="vital-name">
                <Brain :size="12" class="vital-icon spirit" />
                <span>神识</span>
              </span>
              <span class="vital-text">{{ playerStatus?.神识?.当前 }} / {{ playerStatus?.神识?.上限 }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill spirit" :style="{ width: getVitalPercent('神识') + '%' }"></div>
            </div>
          </div>

          <div class="vital-item">
            <div class="vital-info">
              <span class="vital-name">
                <Clock :size="12" class="vital-icon lifespan" />
                <span>寿元</span>
              </span>
              <span class="vital-text">{{ currentAge }} / {{ playerStatus?.寿命?.上限 }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill lifespan" :style="{ width: getLifespanPercent() + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 境界状态 -->
      <div class="cultivation-section">
        <h3 class="section-title">
          <Star :size="14" class="section-icon" />
          <span>境界状态</span>
        </h3>
        <div class="realm-display">
          <div class="realm-info">
            <span class="realm-name">{{ formatRealmDisplay(playerStatus?.境界?.名称) }}</span>
            <span v-if="playerStatus?.境界?.突破描述" class="realm-breakthrough">{{ playerStatus?.境界?.突破描述 }}</span>
          </div>
          <!-- 凡人境界显示等待引气入体 -->
          <div v-if="playerStatus?.境界?.名称 === '凡人'" class="realm-mortal">
            <span class="mortal-text">等待仙缘，引气入体</span>
          </div>
          <!-- 修炼境界显示进度条 -->
          <div v-else class="realm-progress">
            <div class="progress-bar">
              <div class="progress-fill cultivation" :style="{ width: realmProgressPercent + '%' }"></div>
            </div>
            <span class="progress-text">{{ realmProgressPercent }}%</span>
          </div>
        </div>

        <!-- 声望显示 -->
        <div class="reputation-display">
          <div class="reputation-item">
            <div class="reputation-info">
              <span class="reputation-label">
                <Star :size="12" class="vital-icon reputation" />
                <span>声望</span>
              </span>
              <span class="reputation-value" :class="getReputationClass()">
                {{ getReputationDisplay() }}
              </span>
            </div>
          </div>
        </div>
      </div>


      <!-- 天赋神通 -->
      <div class="collapsible-section talents-section">
        <div class="section-header" @click="talentsCollapsed = !talentsCollapsed">
          <h3 class="section-title">
            <Star :size="14" class="section-icon gold" />
            <span>天赋神通</span>
          </h3>
          <button class="collapse-toggle" :class="{ 'collapsed': talentsCollapsed }">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 10l4-4H4l4 4z"/>
            </svg>
          </button>
        </div>
        <div v-show="!talentsCollapsed" class="talents-list">
          <div
            v-for="talent in characterInfo.天赋"
            :key="typeof talent === 'string' ? talent : talent.name"
            class="talent-card clickable"
            @click="showTalentDetail(typeof talent === 'string' ? talent : talent.name)"
          >
            <div class="talent-header">
              <span class="talent-name">{{ typeof talent === 'string' ? talent : talent.name }}</span>
            </div>
          </div>

          <!-- 空状态显示 -->
          <div v-if="!characterInfo.天赋 || characterInfo.天赋.length === 0" class="empty-talents">
            <div class="empty-icon">✨</div>
            <div class="empty-text">暂无天赋神通</div>
          </div>
        </div>
      </div>

      <!-- 状态效果 -->
      <div class="collapsible-section status-section">
        <div class="section-header" @click="statusCollapsed = !statusCollapsed">
          <h3 class="section-title">
            <Zap :size="14" class="section-icon" />
            <span>状态效果</span>
          </h3>
          <button class="collapse-toggle" :class="{ 'collapsed': statusCollapsed }">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 10l4-4H4l4 4z"/>
            </svg>
          </button>
        </div>
        <div v-show="!statusCollapsed" class="status-effects">
          <div v-if="statusEffects.length === 0" class="empty-status">
            <span class="empty-text">清净无为</span>
          </div>
          <div v-else class="status-tags-container">
            <div
              v-for="effect in statusEffects"
              :key="effect.状态名称"
              class="status-tag clickable"
              :class="[(String(effect.类型).toLowerCase() === 'buff') ? 'buff' : 'debuff']"
              @click="showStatusDetail(effect)"
              :title="`${effect.状态名称}${effect.强度 ? ` - 强度${effect.强度}` : ''}${formatTimeDisplay(effect.时间) ? ` - ${formatTimeDisplay(effect.时间)}` : ''}`"
            >
              <span class="tag-icon">{{ String(effect.类型).toLowerCase() === 'buff' ? '增' : '减' }}</span>
              <span class="tag-name">{{ effect.状态名称 }}</span>
              <span v-if="effect.强度" class="tag-intensity">{{ effect.强度 }}</span>
              <span v-if="formatTimeDisplay(effect.时间)" class="tag-time">{{ formatTimeDisplay(effect.时间) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 无角色数据 -->
    <div v-else class="no-character">
      <div class="no-char-text">请选择角色开启修仙之旅</div>
    </div>

    <!-- 详情模态框 -->
    <DetailModal />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Activity, Sparkles, Heart, Droplet, Brain, Clock, Star, Zap } from 'lucide-vue-next';
import { LOCAL_TALENTS } from '@/data/creationData';
import DetailModal from '@/components/common/DetailModal.vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useUIStore } from '@/stores/uiStore';
import type { StatusEffect } from '@/types/game.d.ts';
import { formatRealmWithStage } from '@/utils/realmUtils';
import { calculateAgeFromBirthdate } from '@/utils/lifespanCalculator';


const gameStateStore = useGameStateStore();
const uiStore = useUIStore();

// 数据加载状态
const isDataLoaded = computed(() => gameStateStore.isGameLoaded && !!gameStateStore.character);

// 直接使用中文字段访问数据
const characterInfo = computed(() => gameStateStore.character);
const playerStatus = computed(() => gameStateStore.playerStatus);
const statusEffects = computed(() => (gameStateStore.playerStatus?.状态效果 || []) as StatusEffect[]);

// 自动计算当前年龄（基于出生日期）
const currentAge = computed(() => {
  const birthdate = characterInfo.value?.出生日期;
  const gameTime = gameStateStore.gameTime;

  if (birthdate && gameTime) {
    return calculateAgeFromBirthdate(birthdate, gameTime);
  }

  // 兜底：返回寿命当前值
  return gameStateStore.playerStatus?.寿命?.当前 || 0;
});

// 收缩状态
const talentsCollapsed = ref(false);
const statusCollapsed = ref(false);

// 模态框状态（通过 uiStore 管理，不再需要本地状态）

// 时间显示格式化
const formatTimeDisplay = (time: string | undefined): string => {
  if (!time || time === '未指定') return '';
  if (time === '永久') return '永久';

  // 处理数字形式的时间（分钟）
  if (/^\d+$/.test(time)) {
    const minutes = parseInt(time);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}时${mins}分` : `${hours}时`;
    }
    return `${minutes}分钟`;
  }

  return time;
};



// 计算百分比的工具方法
const realmProgressPercent = computed(() => {
  if (!gameStateStore.playerStatus?.境界) return 0;
  const progress = gameStateStore.playerStatus.境界.当前进度;
  const maxProgress = gameStateStore.playerStatus.境界.下一级所需;
  return progress && maxProgress ? Math.round((progress / maxProgress) * 100) : 0;
});

// 计算生命体征百分比
const getVitalPercent = (type: '气血' | '灵气' | '神识') => {
  if (!gameStateStore.playerStatus) return 0;
  const vital = gameStateStore.playerStatus[type];
  if (!vital?.当前 || !vital?.上限) return 0;
  return Math.round((vital.当前 / vital.上限) * 100);
};

// 计算寿命百分比（使用计算后的年龄）
const getLifespanPercent = () => {
  const maxLifespan = gameStateStore.playerStatus?.寿命?.上限;
  if (!maxLifespan) return 0;
  return Math.round((currentAge.value / maxLifespan) * 100);
};

// 获取天赋数据
const getTalentData = (talent: string): any => {
  // 从角色基础信息的天赋列表中查找
  const baseInfoValue = gameStateStore.character;
  if (baseInfoValue?.天赋 && Array.isArray(baseInfoValue.天赋)) {
    const talentDetail = baseInfoValue.天赋.find((t: any) => t.名称 === talent);
    if (talentDetail) {
      return talentDetail;
    }
  }

  // 向后兼容：从三千大道系统中查找
  const daoDataValue = gameStateStore.thousandDao;
  const daoProgress = daoDataValue?.大道列表?.[talent];
  return daoProgress;
};

// 显示天赋详情
const showTalentDetail = (talent: string) => {
  // 首先尝试从角色的天赋列表中查找(AI生成的自定义天赋)
  const baseInfoValue = characterInfo.value;
  const customTalent = baseInfoValue?.天赋?.find((t: any) => t.name === talent);

  // 然后从LOCAL_TALENTS中查找天赋信息(前端内嵌天赋)
  const localTalent = LOCAL_TALENTS.find(t => t.name === talent);

  // 优先使用自定义天赋数据,其次使用内嵌天赋数据
  const talentInfo = customTalent ? {
    description: customTalent.description || '自定义天赋'
  } : localTalent ? {
    description: localTalent.description
  } : {
    description: `天赋《${talent}》的详细描述暂未开放，请期待后续更新。`
  };

  // 构建详情内容文本（只显示描述）
  const contentText = talentInfo.description;

  uiStore.showDetailModal({
    title: talent,
    content: contentText
  });
};

// 显示状态效果详情
const showStatusDetail = (effect: StatusEffect) => {
  const descriptionText = effect.状态描述 || `${effect.状态名称}状态生效中`;
  const isBuff = String(effect.类型).toLowerCase() === 'buff';

  // 构建详情HTML - 使用卡片式布局
  let htmlContent = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- 状态类型标识 -->
      <div style="display: flex; align-items: center; justify-content: center; padding: 1rem; border-radius: 12px; background: ${isBuff ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))'}; border: 2px solid ${isBuff ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};">
        <span style="font-size: 2.5rem; margin-right: 0.75rem;">${isBuff ? '✨' : '⚠️'}</span>
        <div>
          <div style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 0.25rem;">状态类型</div>
          <div style="font-size: 1.25rem; font-weight: 700; color: ${isBuff ? 'var(--color-success)' : 'var(--color-danger)'};">${isBuff ? '增益状态' : '负面状态'}</div>
        </div>
      </div>

      <!-- 状态描述 -->
      <div style="padding: 1.25rem; background: var(--color-surface-light); border-radius: 12px; border-left: 4px solid ${isBuff ? 'var(--color-success)' : 'var(--color-danger)'};">
        <div style="font-size: 0.8rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">状态说明</div>
        <div style="line-height: 1.7; color: var(--color-text); font-size: 0.95rem;">${descriptionText}</div>
      </div>

      <!-- 详细信息网格 -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
  `;

  // 来源信息
  if (effect.来源) {
    htmlContent += `
      <div style="padding: 1rem; background: var(--color-surface); border-radius: 10px; border: 1px solid var(--color-border);">
        <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: 0.5rem;">来源</div>
        <div style="font-size: 1rem; font-weight: 600; color: var(--color-accent);">${effect.来源}</div>
      </div>
    `;
  }

  // 强度信息
  if (effect.强度) {
    const strengthLevel = effect.强度 >= 8 ? '极强' : effect.强度 >= 5 ? '中等' : '轻微';
    const strengthColor = effect.强度 >= 8 ? '#f59e0b' : effect.强度 >= 5 ? '#3b82f6' : '#6b7280';
    htmlContent += `
      <div style="padding: 1rem; background: var(--color-surface); border-radius: 10px; border: 1px solid var(--color-border);">
        <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: 0.5rem;">效果强度</div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 1rem; font-weight: 700; color: ${strengthColor};">${strengthLevel}</span>
          <span style="font-size: 0.85rem; color: var(--color-text-secondary);">(${effect.强度}/10)</span>
        </div>
        <div style="margin-top: 0.5rem; height: 6px; background: var(--color-surface-light); border-radius: 3px; overflow: hidden;">
          <div style="height: 100%; width: ${effect.强度 * 10}%; background: linear-gradient(90deg, ${strengthColor}, ${strengthColor}cc); transition: width 0.5s ease;"></div>
        </div>
      </div>
    `;
  }

  // 持续时间信息
  const durationMinutes = effect.持续时间分钟;
  if (durationMinutes) {
    const durationDisplay = durationMinutes === 99999 ? '永久' :
                           durationMinutes >= 1440 ? `${Math.floor(durationMinutes / 1440)}天` :
                           durationMinutes >= 60 ? `${Math.floor(durationMinutes / 60)}时${durationMinutes % 60 > 0 ? durationMinutes % 60 + '分' : ''}` :
                           `${durationMinutes}分钟`;
    htmlContent += `
      <div style="padding: 1rem; background: var(--color-surface); border-radius: 10px; border: 1px solid var(--color-border);">
        <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: 0.5rem;">持续时间</div>
        <div style="font-size: 1rem; font-weight: 600; color: var(--color-primary);">${durationDisplay}</div>
      </div>
    `;
  }

  // 生成时间信息
  const genTime = effect.生成时间;
  if (genTime) {
    htmlContent += `
      <div style="padding: 1rem; background: var(--color-surface); border-radius: 10px; border: 1px solid var(--color-border);">
        <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: 0.5rem;">生成时间</div>
        <div style="font-size: 0.9rem; font-weight: 500; color: var(--color-text);">${genTime.年}年${genTime.月}月${genTime.日}日 ${String(genTime.小时).padStart(2, '0')}:${String(genTime.分钟).padStart(2, '0')}</div>
      </div>
    `;
  }

  htmlContent += `
      </div>
    </div>
  `;

  uiStore.showDetailModal({
    title: effect.状态名称,
    content: htmlContent
  });
};

// 显示境界：统一返回"境界+阶段"（初期/中期/后期/圆满），凡人不加阶段
const formatRealmDisplay = (name?: string): string => {
  const progress = playerStatus.value?.境界?.当前进度;
  const maxProgress = playerStatus.value?.境界?.下一级所需;
  const stage = playerStatus.value?.境界?.阶段;
  return formatRealmWithStage({ name, 阶段: stage, progress, maxProgress });
};

// 获取声望显示文本
const getReputationDisplay = (): string => {
  const reputation = playerStatus.value?.声望;
  if (reputation === undefined || reputation === null) {
    return '籍籍无名';
  }

  const repValue = Number(reputation);

  // 负数声望（恶名）
  if (repValue < 0) {
    if (repValue <= -5000) return `恶名昭彰 (${repValue})`;
    if (repValue <= -1000) return `臭名远扬 (${repValue})`;
    if (repValue <= -500) return `声名狼藉 (${repValue})`;
    if (repValue <= -100) return `恶名在外 (${repValue})`;
    return `小有恶名 (${repValue})`;
  }

  // 正数声望
  if (repValue >= 10000) return `传说人物 (${repValue})`;
  if (repValue >= 5000) return `名满天下 (${repValue})`;
  if (repValue >= 3000) return `威震四方 (${repValue})`;
  if (repValue >= 1000) return `名动一方 (${repValue})`;
  if (repValue >= 500) return `声名远播 (${repValue})`;
  if (repValue >= 100) return `小有名气 (${repValue})`;

  return '籍籍无名';
};

// 获取声望CSS类名
const getReputationClass = (): string => {
  const reputation = playerStatus.value?.声望;
  if (reputation === undefined || reputation === null) {
    return 'reputation-neutral';
  }

  const repValue = Number(reputation);

  if (repValue < 0) {
    if (repValue <= -5000) return 'reputation-evil-legendary';
    if (repValue <= -1000) return 'reputation-evil-high';
    if (repValue <= -500) return 'reputation-evil-medium';
    if (repValue <= -100) return 'reputation-evil-low';
    return 'reputation-evil-minor';
  }

  if (repValue >= 10000) return 'reputation-legendary';
  if (repValue >= 5000) return 'reputation-famous';
  if (repValue >= 3000) return 'reputation-renowned';
  if (repValue >= 1000) return 'reputation-notable';
  if (repValue >= 500) return 'reputation-known';
  if (repValue >= 100) return 'reputation-minor';

  return 'reputation-neutral';
};
</script>

<style scoped>
.right-sidebar {
  width: 100%;
  height: 100%;
  padding: 16px;
  box-sizing: border-box;
  font-family: var(--font-family-sans-serif);
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
}

.sidebar-header {
  margin-bottom: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
  background: transparent;
}

.sidebar-title {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  text-align: center;
}

.title-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}
.title-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 9999px;
  background: var(--color-primary);
  color: #fff;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.2px;
}

/* 移除深色主题硬编码，使用CSS变量自动适配 */

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.sidebar-content::-webkit-scrollbar {
  width: 4px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

[data-theme="dark"] .sidebar-content::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb-color);
}

/* 角色基本信息样式 */
.character-info-section {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.character-basic {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.character-basic .detail-item {
  background: var(--color-surface-hover);
  border-radius: 6px;
  padding: 8px;
  font-size: 0.75rem;
}

.character-basic .detail-label {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.character-basic .detail-value {
  color: var(--color-text);
  font-weight: 600;
}

/* 角色状态区域样式 */
.character-state-section {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.character-states {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.state-item {
  background: var(--color-surface-hover);
  border-radius: 6px;
  padding: 8px;
}

.state-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  margin-bottom: 4px;
  display: block;
}

.state-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.state-text {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  text-align: center;
}

.progress-fill.cultivation {
  background: linear-gradient(90deg, #8b5cf6, #a78bfa);
}

/* 收缩区域通用样式 */
.collapsible-section {
  margin-bottom: 16px;
  padding: 0;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
  border-radius: 8px 8px 0 0;
}

.section-header:hover {
  background: var(--color-surface-hover);
}

.collapse-toggle {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapse-toggle:hover {
  color: var(--color-text);
  background: var(--color-surface-hover);
}

.collapse-toggle svg {
  transform: rotate(0deg);
  transition: transform 0.2s ease;
}

.collapse-toggle.collapsed svg {
  transform: rotate(-90deg);
}

.status-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}

.current-status {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

.current-status .status-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 0;
}

.detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 6px 8px;
  background: var(--color-surface-hover);
  border-radius: 4px;
  font-size: 0.75rem;
}

.detail-label {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.detail-value {
  color: var(--color-text);
  font-weight: 600;
}

/* 六维灵根区域样式 */
.attributes-section {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.attributes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.attribute-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.attribute-item:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-hover);
}

.attr-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.attr-name {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.attr-value {
  font-size: 0.85rem;
  color: var(--color-text);
  font-weight: 700;
}

.attr-quality {
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  border: 1px solid;
}

/* 属性品质颜色 */
.quality-purple .attr-quality {
  background: #8b5cf6;
  color: white;
  border-color: #8b5cf6;
}

.quality-orange .attr-quality {
  background: #f59e0b;
  color: white;
  border-color: #f59e0b;
}

.quality-blue .attr-quality {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.quality-green .attr-quality {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.quality-gray .attr-quality {
  background: #6b7280;
  color: white;
  border-color: #6b7280;
}

/* 灵根和声望信息 */
.spiritual-info {
  border-top: 1px solid var(--color-border);
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-row {
  display: flex;
}

.info-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: var(--color-surface);
  border-radius: 4px;
  font-size: 0.75rem;
}

.info-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.info-icon {
  flex-shrink: 0;
}

.info-icon.spiritual {
  color: var(--color-accent);
}

.info-icon.reputation {
  color: var(--color-warning);
}

.info-value {
  color: var(--color-text);
  font-weight: 600;
}

/* 图标颜色 */
.section-icon.attributes {
  color: var(--color-accent);
}

/* 通用区块样式 */
.ai-chat-section,
.info-section,
.cultivation-section,
.vitals-section,
.attributes-section,
.location-section,
.wealth-section {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

/* 天赋神通特定样式 */
.talents-list {
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 空状态样式 */
.empty-talents {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
  gap: 0.5rem;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.7;
}

.empty-text {
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.empty-hint {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  line-height: 1.4;
  max-width: 200px;
}

/* 状态效果特定样式 */
.status-effects {
  padding: 0 16px 16px;
}

.empty-status {
  padding: 20px;
  text-align: center;
}
.empty-text {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-style: italic;
}

/* 新的标签式状态效果样式 - 紧凑且美观 */
.status-tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;
  backdrop-filter: blur(4px);
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
}

.status-tag.buff {
  background: linear-gradient(135deg, rgba(var(--color-success-rgb), 0.2), rgba(var(--color-success-rgb), 0.1));
  border-color: rgba(var(--color-success-rgb), 0.4);
  color: var(--color-success);
}

.status-tag.debuff {
  background: linear-gradient(135deg, rgba(var(--color-error-rgb), 0.2), rgba(var(--color-error-rgb), 0.1));
  border-color: rgba(var(--color-error-rgb), 0.4);
  color: var(--color-danger);
}

.status-tag:hover {
  transform: translateY(-1px) scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.status-tag.buff:hover {
  background: linear-gradient(135deg, rgba(var(--color-success-rgb), 0.3), rgba(var(--color-success-rgb), 0.15));
  border-color: rgba(var(--color-success-rgb), 0.6);
  box-shadow: 0 4px 12px rgba(var(--color-success-rgb), 0.3);
}

.status-tag.debuff:hover {
  background: linear-gradient(135deg, rgba(var(--color-error-rgb), 0.3), rgba(var(--color-error-rgb), 0.15));
  border-color: rgba(var(--color-error-rgb), 0.6);
  box-shadow: 0 4px 12px rgba(var(--color-error-rgb), 0.3);
}

.tag-icon {
  font-size: 0.8rem;
  flex-shrink: 0;
}

.tag-name {
  font-weight: 600;
  flex-shrink: 0;
}

.tag-intensity {
  font-size: 0.65rem;
  background: rgba(var(--color-warning-rgb), 0.8);
  color: var(--color-text);
  padding: 1px 4px;
  border-radius: 8px;
  font-weight: 600;
  flex-shrink: 0;
}

.tag-time {
  font-size: 0.65rem;
  opacity: 0.8;
  font-weight: 400;
  flex-shrink: 0;
}
/* 标题样式 - 图标和文字在一行 */
.section-title {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  padding-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title span {
  flex: 1;
}

.section-icon {
  color: var(--color-primary);
  opacity: 0.8;
  flex-shrink: 0;
}

.section-icon.gold {
  color: var(--color-warning);
}

.vital-icon {
  flex-shrink: 0;
}

.vital-icon.blood { color: var(--vital-health); }
.vital-icon.mana { color: var(--vital-lingqi); }
.vital-icon.spirit { color: var(--vital-spirit); }
.vital-icon.lifespan { color: var(--vital-lifespan); }
.vital-icon.reputation { color: var(--color-warning); }

/* 声望显示样式 */
.reputation-display {
  margin-top: 8px;
  border-top: 1px solid var(--color-border);
  padding-top: 8px;
}

.reputation-item {
  background: var(--color-surface);
  border-radius: 6px;
  padding: 8px;
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.reputation-item:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-hover);
}

.reputation-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reputation-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.reputation-value {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;
}

/* 声望等级配色 */
.reputation-neutral {
  color: var(--color-text-secondary);
  background: rgba(128, 128, 128, 0.1);
  border: 1px solid rgba(128, 128, 128, 0.3);
}

/* 正面声望 */
.reputation-minor {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.reputation-known {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.reputation-notable {
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.reputation-renowned {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.reputation-famous {
  color: #f97316;
  background: rgba(249, 115, 22, 0.1);
  border: 1px solid rgba(249, 115, 22, 0.3);
}

.reputation-legendary {
  color: #dc2626;
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.2), rgba(239, 68, 68, 0.1));
  border: 1px solid rgba(220, 38, 38, 0.4);
  box-shadow: 0 0 8px rgba(220, 38, 38, 0.3);
}

/* 负面声望（恶名） */
.reputation-evil-minor {
  color: #6b7280;
  background: rgba(107, 114, 128, 0.1);
  border: 1px solid rgba(107, 114, 128, 0.3);
}

.reputation-evil-low {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.reputation-evil-medium {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.1);
  border: 1px solid rgba(220, 38, 38, 0.3);
}

.reputation-evil-high {
  color: #991b1b;
  background: rgba(153, 27, 27, 0.1);
  border: 1px solid rgba(153, 27, 27, 0.3);
}

.reputation-evil-legendary {
  color: #7f1d1d;
  background: linear-gradient(135deg, rgba(127, 29, 29, 0.2), rgba(153, 27, 27, 0.1));
  border: 1px solid rgba(127, 29, 29, 0.4);
  box-shadow: 0 0 8px rgba(127, 29, 29, 0.4);
}

.reputation-number {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  opacity: 0.8;
}

/* 点击提示样式 */
.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}
.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border-color: rgba(var(--color-accent-rgb), 0.5);
}

/* 天赋卡片样式 - 增强美观性 */
.talent-card {
  background: linear-gradient(135deg, rgba(var(--color-accent-rgb), 0.15), rgba(var(--color-accent-rgb), 0.1));
  border: 1px solid rgba(var(--color-accent-rgb), 0.3);
  border-left: 4px solid var(--color-accent);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
  position: relative;
  overflow: hidden;
}

.talent-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg,
    rgba(var(--color-accent-rgb), 0.1) 0%,
    rgba(var(--color-accent-rgb), 0.05) 50%,
    rgba(var(--color-accent-rgb), 0.1) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.talent-card:hover::before {
  opacity: 1;
}

.talent-card:hover {
  background: linear-gradient(135deg, rgba(var(--color-accent-rgb), 0.2), rgba(var(--color-accent-rgb), 0.15));
  border-color: rgba(var(--color-accent-rgb), 0.5);
  transform: translateX(6px) translateY(-2px);
  box-shadow: 0 8px 32px rgba(var(--color-accent-rgb), 0.25), 0 0 0 1px rgba(var(--color-accent-rgb), 0.2);
}

.talent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
}

.talent-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-accent);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.talent-level {
  font-size: 0.75rem;
  color: var(--color-warning);
  font-weight: 600;
  background: linear-gradient(135deg, rgba(var(--color-warning-rgb), 0.2), rgba(var(--color-warning-rgb), 0.1));
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid rgba(var(--color-warning-rgb), 0.3);
  backdrop-filter: blur(4px);
}

.talent-progress {
  margin-top: 10px;
  position: relative;
  z-index: 1;
}

.progress-fill.talent {
  background: linear-gradient(90deg, var(--color-accent), var(--color-accent-hover), rgba(var(--color-accent-rgb), 0.9));
  box-shadow: 0 2px 8px rgba(var(--color-accent-rgb), 0.3);
}

/* 生命体征样式 */
.vitals-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.vital-item {
  background: var(--color-surface);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.vital-item:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-hover);
}

.vital-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.vital-name {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.vital-text {
  font-size: 0.75rem;
  color: var(--color-text);
  font-weight: 600;
}

.progress-bar {
  height: 6px;
  background: var(--color-surface-light);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}


.progress-fill.health { background: var(--vital-health); }
.progress-fill.mana { background: var(--vital-lingqi); }
.progress-fill.spirit { background: var(--vital-spirit); }
/* 寿元进度条统一紫色 */
.progress-fill.lifespan { background: var(--vital-lifespan); }

/* 修为状态样式 */
.realm-display {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 10px;
}

.realm-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  flex-direction: column;
  gap: 4px;
}

.realm-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-accent);
}

.realm-breakthrough {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
  opacity: 0.8;
}

.realm-level {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

/* 凡人境界特殊样式 */
.realm-mortal {
  padding: 8px;
  background: rgba(var(--color-primary-rgb), 0.05);
  border-radius: 4px;
  text-align: center;
  border: 1px dashed rgba(var(--color-primary-rgb), 0.3);
}

.mortal-text {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-style: italic;
  opacity: 0.8;
}

.realm-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-text {
  font-size: 0.65rem;
  color: var(--color-text-muted);
  text-align: center;
}

/* 状态效果样式 */
.status-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.status-effect {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.status-effect.buff {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
}

.status-effect.debuff {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
}

.status-effect:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.effect-name {
  font-size: 0.65rem;
}

.effect-time {
  font-size: 0.6rem;
  opacity: 0.8;
}

/* 无角色数据样式 */
.no-character {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 10px;
}

.no-char-text {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  font-style: italic;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .right-sidebar {
    padding: 12px;
  }

  .sidebar-title {
    font-size: 0.9rem;
  }

  .section-title {
    font-size: 0.8rem;
  }

  .vitals-list {
    gap: 8px;
  }

  .vital-item {
    padding: 6px;
  }

  .vital-name {
    font-size: 0.7rem;
  }

  .vital-text {
    font-size: 0.65rem;
  }

  .talent-card {
    padding: 10px;
  }

  .talent-name {
    font-size: 0.8rem;
  }

  .status-effect-card {
    padding: 8px 10px;
  }

  .effect-name {
    font-size: 0.75rem;
  }

  .status-tags-container {
    gap: 6px;
    padding: 8px;
  }

  .status-tag {
    font-size: 0.7rem;
    padding: 4px 8px;
    gap: 4px;
  }

  .tag-intensity {
    font-size: 0.6rem;
    padding: 1px 3px;
  }

  .tag-time {
    font-size: 0.6rem;
  }

  .detail-item {
    padding: 5px 6px;
    font-size: 0.7rem;
  }

  .attributes-grid {
    gap: 6px;
  }

  .attribute-item {
    padding: 6px;
  }

  .attr-name {
    font-size: 0.7rem;
  }

  .attr-value {
    font-size: 0.8rem;
  }

  .attr-quality {
    font-size: 0.6rem;
    padding: 1px 4px;
  }

  .info-item {
    padding: 5px 6px;
    font-size: 0.7rem;
  }

  .realm-name {
    font-size: 0.8rem;
  }

  .progress-bar {
    height: 5px;
  }
}

@media (max-width: 480px) {
  .right-sidebar {
    padding: 8px;
  }

  .sidebar-header {
    margin-bottom: 12px;
    padding-bottom: 8px;
  }

  .vitals-section,
  .cultivation-section,
  .collapsible-section {
    margin-bottom: 12px;
    padding: 10px;
  }

  .attributes-section {
    margin-bottom: 12px;
    padding: 10px;
  }

  .attributes-grid {
    gap: 4px;
  }

  .attribute-item {
    padding: 5px;
  }

  .attr-name {
    font-size: 0.65rem;
  }

  .attr-value {
    font-size: 0.75rem;
  }

  .attr-quality {
    font-size: 0.55rem;
    padding: 1px 3px;
  }

  .status-details {
    grid-template-columns: 1fr;
  }

  .talents-list {
    padding: 0 12px 12px;
  }

  .status-effects {
    padding: 0 12px 12px;
  }

  .status-tags-container {
    gap: 4px;
    padding: 6px;
  }

  .status-tag {
    font-size: 0.65rem;
    padding: 3px 6px;
    gap: 3px;
  }

  .tag-intensity {
    font-size: 0.55rem;
    padding: 1px 2px;
  }

  .tag-time {
    font-size: 0.55rem;
  }
}

/* 平板设备优化 */
@media (min-width: 769px) and (max-width: 1024px) {
  .right-sidebar {
    padding: 14px;
  }

  .vital-item {
    padding: 7px;
  }

  .talent-card {
    padding: 11px;
  }
}

/* 大屏幕优化 */
@media (min-width: 1440px) {
  .right-sidebar {
    padding: 20px;
  }

  .sidebar-title {
    font-size: 1.1rem;
  }

  .section-title {
    font-size: 0.9rem;
  }

  .vital-name {
    font-size: 0.8rem;
  }

  .talent-name {
    font-size: 0.9rem;
  }

  .effect-name {
    font-size: 0.85rem;
  }

  .status-tags-container {
    gap: 10px;
    padding: 16px;
  }

  .status-tag {
    font-size: 0.8rem;
    padding: 8px 12px;
  }
}

/* 深色主题适配：使用CSS变量自动适配 */
@media (prefers-color-scheme: dark) {
  .right-sidebar {
    background: var(--color-surface);
  }

  .vitals-section,
  .cultivation-section,
  .collapsible-section {
    background: var(--color-surface-light);
  }

  .status-tag.buff {
    background: linear-gradient(135deg, rgba(var(--color-success-rgb), 0.15), rgba(var(--color-success-rgb), 0.08));
    border-color: rgba(var(--color-success-rgb), 0.3);
    color: var(--color-success);
  }

  .status-tag.debuff {
    background: linear-gradient(135deg, rgba(var(--color-error-rgb), 0.15), rgba(var(--color-error-rgb), 0.08));
    border-color: rgba(var(--color-error-rgb), 0.3);
    color: var(--color-danger);
  }

  .status-tag.buff:hover {
    background: linear-gradient(135deg, rgba(var(--color-success-rgb), 0.25), rgba(var(--color-success-rgb), 0.12));
    border-color: rgba(var(--color-success-rgb), 0.5);
    color: var(--color-success);
    box-shadow: 0 4px 12px rgba(var(--color-success-rgb), 0.2);
  }

  .status-tag.debuff:hover {
    background: linear-gradient(135deg, rgba(var(--color-error-rgb), 0.25), rgba(var(--color-error-rgb), 0.12));
    border-color: rgba(var(--color-error-rgb), 0.5);
    color: var(--color-danger);
    box-shadow: 0 4px 12px rgba(var(--color-error-rgb), 0.2);
  }

  .tag-intensity {
    background: rgba(var(--color-warning-rgb), 0.9);
    color: var(--color-text);
  }
}
</style>



