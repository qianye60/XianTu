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
              <span class="vital-text">{{ playerStatus?.vitals.qiBlood.current }} / {{ playerStatus?.vitals.qiBlood.max }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill health" :style="{ width: getVitalPercent('qiBlood') + '%' }"></div>
            </div>
          </div>

          <div class="vital-item">
            <div class="vital-info">
              <span class="vital-name">
                <Sparkles :size="12" class="vital-icon mana" />
                <span>灵气</span>
              </span>
              <span class="vital-text">{{ playerStatus?.vitals.lingQi.current }} / {{ playerStatus?.vitals.lingQi.max }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill mana" :style="{ width: getVitalPercent('lingQi') + '%' }"></div>
            </div>
          </div>

          <div class="vital-item">
            <div class="vital-info">
              <span class="vital-name">
                <Brain :size="12" class="vital-icon spirit" />
                <span>神识</span>
              </span>
              <span class="vital-text">{{ playerStatus?.vitals.shenShi.current }} / {{ playerStatus?.vitals.shenShi.max }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill spirit" :style="{ width: getVitalPercent('shenShi') + '%' }"></div>
            </div>
          </div>

          <div class="vital-item">
            <div class="vital-info">
              <span class="vital-name">
                <Clock :size="12" class="vital-icon lifespan" />
                <span>寿元</span>
              </span>
              <span class="vital-text">{{ playerStatus?.lifespan.current }} / {{ playerStatus?.lifespan.max }}年</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill lifespan" :style="{ width: getVitalPercent('lifespan') + '%' }"></div>
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
            <span class="realm-name">{{ playerStatus?.realm.name }}</span>
            <span v-if="playerStatus?.realm.name !== '凡人' && playerStatus?.realm.level" class="realm-level">{{ playerStatus?.realm.level }}层</span>
          </div>
          <!-- 凡人境界显示等待引气入体 -->
          <div v-if="playerStatus?.realm.name === '凡人'" class="realm-mortal">
            <span class="mortal-text">等待仙缘，引气入体</span>
          </div>
          <!-- 修炼境界显示进度条 -->
          <div v-else class="realm-progress">
            <div class="progress-bar">
              <div class="progress-fill cultivation" :style="{ width: realmProgressPercent + '%' }"></div>
            </div>
            <span class="progress-text">{{ playerStatus?.realm.progress }} / {{ playerStatus?.realm.maxProgress }}</span>
          </div>
        </div>

        <div class="status-details">
          <div class="detail-item">
            <span class="detail-label">声望</span>
            <span class="detail-value">{{ playerStatus?.reputation.level }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">位置</span>
            <span class="detail-value">{{ characterData?.location.name }}</span>
          </div>
        </div>

        <!-- 当前状态显示 -->
        <!-- 隐藏活动和心境状态信息 -->
      </div>

      <!-- 天赋神通 -->
      <div v-if="characterInfo?.talents && characterInfo.talents.length > 0" class="collapsible-section talents-section">
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
            v-for="talent in characterInfo.talents"
            :key="talent"
            class="talent-card clickable"
            @click="showTalentDetail(talent)"
          >
            <div class="talent-header">
              <span class="talent-name">{{ talent }}</span>
              <span class="talent-level">Lv.{{ getTalentLevel(talent) }}</span>
            </div>
            <div class="talent-progress">
              <div class="progress-bar">
                <div class="progress-fill talent" :style="{ width: getTalentProgress(talent) + '%' }"></div>
              </div>
              <span class="progress-text">{{ getTalentExp(talent) }} / {{ getTalentMaxExp(talent) }}</span>
            </div>
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
              <span class="tag-icon">{{ String(effect.类型).toLowerCase() === 'buff' ? '✨' : '⚡' }}</span>
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
    <DetailModal
      v-model="showModal"
      :title="modalData.title"
      :icon="modalData.icon"
      :iconComponent="modalData.iconComponent"
      :content="modalData.content"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Activity, Sparkles, AlertTriangle, Heart, Droplet, Brain, Clock, Star, Zap } from 'lucide-vue-next';
import DetailModal from '@/components/common/DetailModal.vue';
import { useUnifiedCharacterData } from '@/composables/useCharacterData';
import { useCharacterStore } from '@/stores/characterStore';
import type { StatusEffect } from '@/types/game';

type TextSection = {
  title?: string;
  type: 'text';
  data: string;
};

type ListSection = {
  title?: string;
  type: 'list';
  data: string[];
};

type TableSection = {
  title?: string;
  type: 'table';
  data: { label: string; value: string | number }[];
};

const { characterData, isDataLoaded } = useUnifiedCharacterData();
const characterStore = useCharacterStore();

// 角色基础信息
const characterInfo = computed(() => characterData.value?.basicInfo);
// 玩家状态信息
const playerStatus = computed(() => characterData.value?.status);
// 状态效果
const statusEffects = computed(() => characterData.value?.statusEffects || []);

// 安全地访问存档数据
const saveData = computed(() => characterStore.activeSaveSlot?.存档数据);
const daoData = computed(() => saveData.value?.三千大道);

// 收缩状态
const talentsCollapsed = ref(false);
const statusCollapsed = ref(false);

// 模态框状态
const showModal = ref(false);
const modalData = ref<{
  title: string;
  icon: string;
  iconComponent?: any;
  content: (TextSection | ListSection | TableSection)[];
}>({
  title: '',
  icon: '',
  iconComponent: null,
  content: []
});

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
  if (!playerStatus.value) return 0;
  const { progress, maxProgress } = playerStatus.value.realm;
  return progress && maxProgress ? Math.round((progress / maxProgress) * 100) : 0;
});

// 计算生命体征百分比
const getVitalPercent = (type: 'qiBlood' | 'lingQi' | 'shenShi' | 'lifespan') => {
  if (!playerStatus.value) return 0;
  if (type === 'lifespan') {
    const lifespan = playerStatus.value.lifespan;
    if (!lifespan?.current || !lifespan?.max) return 0;
    return Math.round((lifespan.current / lifespan.max) * 100);
  }
  const vitals = playerStatus.value.vitals[type as keyof typeof playerStatus.value.vitals];
  if (!vitals?.current || !vitals?.max) return 0;
  return Math.round((vitals.current / vitals.max) * 100);
};

// 计算天赋等级
const getTalentLevel = (talent: string): number => {
  const daoProgress = daoData.value?.大道进度[talent];
  return daoProgress?.当前阶段 || 1;
};

// 计算天赋经验
const getTalentExp = (talent: string): number => {
  const daoProgress = daoData.value?.大道进度[talent];
  return daoProgress?.当前经验 || 0;
};

// 计算天赋最大经验
const getTalentMaxExp = (talent: string): number => {
  const daoProgress = daoData.value?.大道进度[talent];
  const currentStageIndex = daoProgress?.当前阶段 || 0;
  const daoPath = daoData.value?.大道路径定义[talent];
  // 确保 daoPath 和 阶段列表 存在
  if (daoPath && daoPath.阶段列表 && daoPath.阶段列表[currentStageIndex]) {
    return daoPath.阶段列表[currentStageIndex].突破经验 || 0;
  }
  return 0;
};

// 计算天赋进度百分比
const getTalentProgress = (talent: string): number => {
  const current = getTalentExp(talent);
  const max = getTalentMaxExp(talent);
  return current && max ? Math.round((current / max) * 100) : 0;
};

// 显示天赋详情
const showTalentDetail = (talent: string) => {
  const level = getTalentLevel(talent);
  const currentExp = getTalentExp(talent);
  const maxExp = getTalentMaxExp(talent);
  const progress = getTalentProgress(talent);

  // 天赋描述数据库
  const talentDescriptions: Record<string, {
    description: string;
    effects: string[];
    maxLevel: number;
  }> = {
    '天命主角': {
      description: '天生主角命格，在危机时刻有更高的概率获得奇遇，化险为夷。',
      effects: ['危险情况下触发幸运事件概率+30%', '获得稀有物品概率+20%', '死亡时有概率复活'],
      maxLevel: 10
    },
    '慧根': {
      description: '悟性超群，修炼功法和技艺时效率提升。',
      effects: ['修炼速度+50%', '功法领悟成功率+25%', '技能经验获取+40%'],
      maxLevel: 8
    },
    '灵眼': {
      description: '能看破虚实，识别他人的境界和隐藏状态。',
      effects: ['可识别他人真实境界', '发现隐藏物品概率+35%', '识破幻术能力+60%'],
      maxLevel: 7
    },
    '天灵根': {
      description: '先天灵根纯净，修炼速度极快，容易引起天地共鸣。',
      effects: ['修炼速度+100%', '突破成功率+40%', '引雷渡劫概率+30%'],
      maxLevel: 5
    },
    '不朽体质': {
      description: '拥有不朽之体，寿元增长，身体恢复能力极强。',
      effects: ['最大寿元+500年', '伤势恢复速度+200%', '抗毒抗病能力+80%'],
      maxLevel: 6
    }
  };

  const talentInfo = talentDescriptions[talent] || {
    description: `天赋【${talent}】的详细描述暂未开放，请期待后续更新。`,
    effects: ['效果未知'],
    maxLevel: 10
  };

  // 根据等级调整效果强度
  const levelBonus = Math.floor((level - 1) * 10);
  const enhancedEffects = talentInfo.effects.map((effect: string) => {
    if (level > 1) {
      return `${effect} (Lv.${level}强化: +${levelBonus}%)`;
    }
    return effect;
  });

  modalData.value = {
    title: `${talent} (Lv.${level})`,
    icon: '',
    iconComponent: Sparkles,
    content: [
      {
        type: 'text',
        data: talentInfo.description
      } as TextSection,
      {
        title: '当前效果',
        type: 'list',
        data: enhancedEffects
      } as ListSection,
      {
        title: '修炼进度',
        type: 'table',
        data: [
          { label: '当前等级', value: `Lv.${level}` },
          { label: '当前经验', value: `${currentExp}/${maxExp}` },
          { label: '进度', value: `${progress}%` },
          { label: '最高等级', value: `Lv.${talentInfo.maxLevel}` }
        ]
      } as TableSection
    ]
  };
  showModal.value = true;
};

// 显示状态效果详情
const showStatusDetail = (effect: StatusEffect) => {
  // 完全使用AI生成的数据，不使用预设数据
  const descriptionText = (effect as any).状态描述 && String((effect as any).状态描述).trim()
    ? String((effect as any).状态描述).trim()
    : `${effect.状态名称}状态生效中`;


  // 从实际数据中获取更多信息
  const additionalInfo: { label: string; value: string | number }[] = [];
  
  // 效果强度 - 更详细的描述
  if (effect.强度) {
    const strengthText = effect.强度 >= 8 ? `极强(${effect.强度}/10)` : 
                         effect.强度 >= 5 ? `中等(${effect.强度}/10)` : 
                         `轻微(${effect.强度}/10)`;
    additionalInfo.push({
      label: '效果强度',
      value: strengthText
    });
  }
  
  // 优先显示剩余时间，如果没有或与总时间相同，则显示总持续时间
  const remainingTime = effect.剩余时间;
  const totalTime = effect.时间;
  
  // 智能时间显示逻辑：避免重复显示相同的时间信息
  if (remainingTime && totalTime && remainingTime !== totalTime) {
    // 如果剩余时间和总时间都存在且不同，优先显示剩余时间
    additionalInfo.push({
      label: '剩余时间',
      value: remainingTime
    });
  } else if (remainingTime) {
    // 如果只有剩余时间，显示为持续时间
    additionalInfo.push({
      label: '持续时间',
      value: remainingTime
    });
  } else if (totalTime) {
    // 如果只有总时间，格式化后显示
    const timeValue = formatTimeDisplay(totalTime);
    additionalInfo.push({
      label: '持续时间',
      value: timeValue || totalTime
    });
  }
  
  if (effect.来源) {
    additionalInfo.push({
      label: '产生原因',
      value: effect.来源
    });
  }

  const content: (TextSection | ListSection | TableSection)[] = [];
  
  // 添加描述
  if (descriptionText) {
    content.push({
      type: 'text',
      data: descriptionText
    } as TextSection);
  }
  
  
  // 构建基本信息表格，显示更多信息
  const tableData: { label: string; value: string | number }[] = [];
  
  // 状态类型
  const typeText = String(effect.类型).toLowerCase() === 'buff' ? '增益状态 ✨' : '负面状态 ⚠️';
  tableData.push({ label: '状态类型', value: typeText });
  
  // 添加其他有效信息（包括已处理的时间信息）
  tableData.push(...additionalInfo);
  
  // 只有当有数据时才添加表格
  if (tableData.length > 0) {
    content.push({
      title: '基本信息',
      type: 'table',
      data: tableData
    } as TableSection);
  }


  modalData.value = {
    title: effect.状态名称,
    icon: '', // 不使用字符串图标
    iconComponent: String(effect.类型).toLowerCase() === 'buff' ? Sparkles : AlertTriangle,
    content
  };
  showModal.value = true;
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
  background: rgba(255, 255, 255, 0.2);
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
  border-top: 1px solid rgba(255, 255, 255, 0.1);
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
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1));
  border-color: rgba(34, 197, 94, 0.4);
  color: #22c55e;
}

.status-tag.debuff {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1));
  border-color: rgba(239, 68, 68, 0.4);
  color: #ef4444;
}

.status-tag:hover {
  transform: translateY(-1px) scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.status-tag.buff:hover {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(34, 197, 94, 0.15));
  border-color: rgba(34, 197, 94, 0.6);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.status-tag.debuff:hover {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.15));
  border-color: rgba(239, 68, 68, 0.6);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
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
  background: rgba(251, 191, 36, 0.8);
  color: #1a1a1a;
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
  color: #fbbf24;
}

.vital-icon {
  flex-shrink: 0;
}

.vital-icon.blood {
  color: #ef4444;
}

.vital-icon.mana {
  color: #3b82f6;
}

.vital-icon.spirit {
  color: #fbbf24;
}

.vital-icon.lifespan {
  color: #a78bfa;
}

/* 点击提示样式 */
.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}
.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border-color: rgba(168, 85, 247, 0.5);
}

/* 天赋卡片样式 - 增强美观性 */
.talent-card {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(168, 85, 247, 0.1));
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-left: 4px solid #a855f7;
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
    rgba(139, 92, 246, 0.1) 0%, 
    rgba(168, 85, 247, 0.05) 50%, 
    rgba(139, 92, 246, 0.1) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.talent-card:hover::before {
  opacity: 1;
}

.talent-card:hover {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(168, 85, 247, 0.15));
  border-color: rgba(168, 85, 247, 0.5);
  transform: translateX(6px) translateY(-2px);
  box-shadow: 0 8px 32px rgba(139, 92, 246, 0.25), 0 0 0 1px rgba(168, 85, 247, 0.2);
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
  color: #d8b4fe;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.talent-level {
  font-size: 0.75rem;
  color: #fbbf24;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(251, 191, 36, 0.1));
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid rgba(251, 191, 36, 0.3);
  backdrop-filter: blur(4px);
}

.talent-progress {
  margin-top: 10px;
  position: relative;
  z-index: 1;
}

.progress-fill.talent {
  background: linear-gradient(90deg, #8b5cf6, #c084fc, #d8b4fe);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
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
  border: 1px solid var(--color-border);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.progress-fill.health {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.progress-fill.mana {
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
}

.progress-fill.spirit {
  background: linear-gradient(90deg, #ffd700, #f59e0b);
}

/* 寿元进度条使用渐变紫色 */
.progress-fill.lifespan {
  background: linear-gradient(90deg, #8b5cf6, #a78bfa);
}

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
  align-items: center;
  margin-bottom: 8px;
}

.realm-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-accent);
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
@media (max-width: 768px) {
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

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .right-sidebar {
    background: rgba(0, 0, 0, 0.2);
  }

  .ai-chat-section,
  .info-section,
  .cultivation-section,
  .vitals-section,
  .attributes-section,
  .status-section,
  .location-section,
  .wealth-section {
    background: rgba(255, 255, 255, 0.05);
  }
  
  /* 深色主题下的状态标签适配 */
  .status-tag.buff {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.08));
    border-color: rgba(34, 197, 94, 0.3);
    color: #34d399;
  }

  .status-tag.debuff {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.08));
    border-color: rgba(239, 68, 68, 0.3);
    color: #f87171;
  }
  
  .status-tag.buff:hover {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(34, 197, 94, 0.12));
    border-color: rgba(34, 197, 94, 0.5);
    color: #10b981;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);
  }

  .status-tag.debuff:hover {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(239, 68, 68, 0.12));
    border-color: rgba(239, 68, 68, 0.5);
    color: #ef4444;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
  }
  
  .tag-intensity {
    background: rgba(251, 191, 36, 0.9);
    color: #000;
  }
}
</style>
