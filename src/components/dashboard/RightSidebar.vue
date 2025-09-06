<template>
  <div class="right-sidebar">
    <div class="sidebar-header">
      <h3 class="sidebar-title">
        <Activity :size="18" class="title-icon" />
        角色状态
      </h3>
    </div>

    <div v-if="isDataLoaded && characterInfo" class="sidebar-content">
      <!-- 修行状态 -->
      <div class="vitals-section">
        <h3 class="section-title">修行状态</h3>
        <div class="vitals-grid">
          <div class="vital-item">
            <div class="vital-info">
              <span class="vital-name">🩸 气血</span>
              <span class="vital-text">{{ playerStatus?.vitals.qiBlood.current }} / {{ playerStatus?.vitals.qiBlood.max }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill health" :style="{ width: getVitalPercent('qiBlood') + '%' }"></div>
            </div>
          </div>

          <div class="vital-item">
            <div class="vital-info">
              <span class="vital-name">✨ 灵气</span>
              <span class="vital-text">{{ playerStatus?.vitals.lingQi.current }} / {{ playerStatus?.vitals.lingQi.max }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill mana" :style="{ width: getVitalPercent('lingQi') + '%' }"></div>
            </div>
          </div>

          <div class="vital-item">
            <div class="vital-info">
              <span class="vital-name">🧠 神识</span>
              <span class="vital-text">{{ playerStatus?.vitals.shenShi.current }} / {{ playerStatus?.vitals.shenShi.max }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill spirit" :style="{ width: getVitalPercent('shenShi') + '%' }"></div>
            </div>
          </div>

          <div class="vital-item">
            <div class="vital-info">
              <span class="vital-name">⏳ 寿元</span>
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
        <h3 class="section-title">境界状态</h3>
        <div class="realm-display">
          <div class="realm-info">
            <span class="realm-name">{{ playerStatus?.realm.name }}</span>
            <span class="realm-level">{{ playerStatus?.realm.level }}层</span>
          </div>
          <div class="realm-progress">
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
          <h3 class="section-title">🌟 天赋神通</h3>
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
          <h3 class="section-title">⚡ 状态效果</h3>
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
          <div v-else class="status-grid">
            <div
              v-for="effect in statusEffects"
              :key="effect.状态名称"
              class="status-effect-card clickable"
              :class="[effect.类型 === 'BUFF' ? 'buff' : 'debuff']"
              @click="showStatusDetail(effect)"
            >
              <div class="effect-header">
                <div class="effect-info">
                  <span class="effect-name">{{ effect.状态名称 }}</span>
                </div>
                <div class="effect-data">
                  <span v-if="effect.强度" class="effect-intensity">强度 {{ effect.强度 }}</span>
                  <span class="effect-time">{{ formatTimeDisplay(effect.时间) }}</span>
                </div>
              </div>
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
      :content="modalData.content"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Activity } from 'lucide-vue-next';
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
  content: (TextSection | ListSection | TableSection)[];
}>({
  title: '',
  icon: '',
  content: []
});

// 时间显示格式化
const formatTimeDisplay = (time: string): string => {
  if (!time || time === '永久') return '永久';

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
    return daoPath.阶段列表[currentStageIndex].突破经验 || 100;
  }
  return 100;
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
    icon: '✨',
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
  // 状态效果描述数据库
  const effectDescriptions: Record<string, {
    description: string;
    effects: string[];
    severity: string;
    treatment: string;
  }> = {
    '中毒': {
      description: '体内毒素侵蚀，持续损失气血。',
      effects: ['每分钟减少气血5点', '移动速度降低20%', '修炼效率降低30%'],
      severity: '严重',
      treatment: '服用解毒丹、寻找医师治疗、修炼解毒功法'
    },
    '真气运行': {
      description: '真气在经脉中有序运行，提升各项能力。',
      effects: ['灵气恢复速度+30%', '修炼效率+20%', '抗毒能力+15%'],
      severity: '轻微',
      treatment: '无需治疗，自然状态'
    },
    '疲劳': {
      description: '长时间活动导致的身体疲惫状态。',
      effects: ['所有行动效率-25%', '修炼速度-40%', '容易受伤'],
      severity: '一般',
      treatment: '充足休息、服用补气丹、温泉浸泡'
    },
    '疗伤': {
      description: '正在治疗伤势，身体机能逐渐恢复。',
      effects: ['气血恢复速度+50%', '伤势愈合加速', '免疫部分负面状态'],
      severity: '轻微',
      treatment: '无需治疗，恢复中'
    },
    '入定': {
      description: '深入冥想状态，心神专注于修炼。',
      effects: ['神识恢复速度+40%', '修炼领悟+60%', '移动速度-50%'],
      severity: '轻微',
      treatment: '无需治疗，修炼状态'
    },
    '突破前兆': {
      description: '即将突破当前境界的征兆，体内灵气波动剧烈。',
      effects: ['修为获得翻倍', '突破成功率+30%', '容易引起天象异变'],
      severity: '特殊',
      treatment: '无需治疗，关键时期'
    },
    '心魔': {
      description: '修炼时产生的心理障碍，影响修炼进度。',
      effects: ['修炼效率-50%', '突破失败率+40%', '易产生幻觉'],
      severity: '严重',
      treatment: '心境调节、请教高人、历练红尘'
    }
  };

  const effectInfo = effectDescriptions[effect.状态名称] || {
    description: `状态效果【${effect.状态名称}】的详细信息暂未开放。`,
    effects: ['效果未知'],
    severity: '未知',
    treatment: '无相关信息'
  };

  // 从实际数据中获取更多信息
  const additionalInfo: { label: string; value: string | number }[] = [];
  if (effect.强度) {
    additionalInfo.push({
      label: '效果强度',
      value: effect.强度
    });
  }
  if (effect.剩余时间) {
    additionalInfo.push({
      label: '剩余时间',
      value: effect.剩余时间
    });
  }
  if (effect.来源) {
    additionalInfo.push({
      label: '产生原因',
      value: effect.来源
    });
  }

  const content: (TextSection | ListSection | TableSection)[] = [
    {
      type: 'text',
      data: effectInfo.description
    } as TextSection,
    {
      title: '状态效果',
      type: 'list',
      data: effectInfo.effects
    } as ListSection,
    {
      title: '基本信息',
      type: 'table',
      data: [
        { label: '类型', value: effect.类型 === 'BUFF' ? '增益效果' : '减益效果' },
        { label: '持续时间', value: effect.时间 },
        { label: '严重程度', value: effectInfo.severity },
        ...additionalInfo
      ]
    } as TableSection
  ];

  if (effectInfo.treatment && effectInfo.treatment !== '无需治疗，自然状态' && effectInfo.treatment !== '无相关信息') {
    content.push({
      title: '处理建议',
      type: 'text',
      data: effectInfo.treatment
    } as TextSection);
  }

  modalData.value = {
    title: effect.状态名称,
    icon: effect.类型 === 'BUFF' ? '⬆️' : '⬇️',
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
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.title-icon {
  color: var(--color-primary);
  flex-shrink: 0;
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
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.character-basic {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.character-basic .detail-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 8px;
  font-size: 0.75rem;
}

.character-basic .detail-label {
  color: #cbd5e1;
  font-weight: 500;
}

.character-basic .detail-value {
  color: #e0e7ff;
  font-weight: 600;
}

/* 角色状态区域样式 */
.character-state-section {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.character-states {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.state-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 8px;
}

.state-label {
  font-size: 0.75rem;
  color: #cbd5e1;
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
  color: #94a3b8;
  text-align: center;
}

.progress-fill.cultivation {
  background: linear-gradient(90deg, #8b5cf6, #a78bfa);
}

/* 收缩区域通用样式 */
.collapsible-section {
  margin-bottom: 16px;
  padding: 0;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
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
  background: rgba(255, 255, 255, 0.05);
}

.collapse-toggle {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapse-toggle:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.1);
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
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  font-size: 0.75rem;
}

.detail-label {
  color: #cbd5e1;
  font-weight: 500;
}

.detail-value {
  color: #f1f5f9;
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
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
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
.status-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
.empty-status {
  padding: 20px;
  text-align: center;
}
.empty-text {
  font-size: 0.8rem;
  color: #64748b;
  font-style: italic;
}
/* 状态效果卡片样式 */
.status-effect-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px 12px;
  transition: all 0.3s ease;
}
.status-effect-card.buff {
  border-left: 3px solid #22c55e;
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05));
}
.status-effect-card.debuff {
  border-left: 3px solid #ef4444;
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05));
}
.effect-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.effect-info .effect-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: #e2e8f0;
}
.effect-data {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.effect-intensity {
  font-size: 0.7rem;
  color: #fbbf24;
  font-weight: 500;
}
.effect-time {
  font-size: 0.7rem;
  color: #94a3b8;
}
.section-title {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #e2e8f0;
  padding-bottom: 6px;
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

/* 天赋卡片样式 */
.talent-card {
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-left: 3px solid #a855f7;
  border-radius: 8px;
  padding: 12px;
  transition: all 0.3s ease;
}
.talent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.talent-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #d8b4fe;
}
.talent-level {
  font-size: 0.75rem;
  color: #fbbf24;
  font-weight: 500;
  background: rgba(251, 191, 36, 0.15);
  padding: 2px 8px;
  border-radius: 10px;
}
.talent-progress {
  margin-top: 8px;
}
.progress-fill.talent {
  background: linear-gradient(90deg, #8b5cf6, #c084fc);
}

/* 生命体征样式 */
.vitals-grid {
  display: grid;
  gap: 8px;
}

.vital-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 8px;
}

.vital-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.vital-name {
  font-size: 0.75rem;
  color: #cbd5e1;
  font-weight: 500;
}

.vital-text {
  font-size: 0.7rem;
  color: #94a3b8;
}

.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
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
  background: rgba(255, 255, 255, 0.05);
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
  color: #fbbf24;
}

.realm-level {
  font-size: 0.75rem;
  color: #d1d5db;
}

.realm-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-text {
  font-size: 0.65rem;
  color: #9ca3af;
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
  color: #64748b;
  font-style: italic;
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
}
</style>
