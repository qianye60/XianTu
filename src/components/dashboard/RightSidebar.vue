<template>
  <div class="right-sidebar">
    <div class="sidebar-header">
      <h3 class="sidebar-title">角色状态</h3>
    </div>

    <div v-if="isDataLoaded && characterInfo" class="sidebar-content">
      <!-- 修行状态 -->
      <div class="vitals-section">
        <h3 class="section-title">修行状态</h3>
        <div class="vitals-grid">
          <div class="vital-item">
            <div class="vital-info">
              <span class="vital-name">🩸 气血</span>
              <span class="vital-text">{{ playerStatus.vitals.qiBlood.current }} / {{ playerStatus.vitals.qiBlood.max }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill health" :style="{ width: getVitalPercent('qiBlood') + '%' }"></div>
            </div>
          </div>

          <div class="vital-item">
            <div class="vital-info">
              <span class="vital-name">✨ 灵气</span>
              <span class="vital-text">{{ playerStatus.vitals.lingQi.current }} / {{ playerStatus.vitals.lingQi.max }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill mana" :style="{ width: getVitalPercent('lingQi') + '%' }"></div>
            </div>
          </div>

          <div class="vital-item">
            <div class="vital-info">
              <span class="vital-name">🧠 神识</span>
              <span class="vital-text">{{ playerStatus.vitals.shenShi.current }} / {{ playerStatus.vitals.shenShi.max }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill spirit" :style="{ width: getVitalPercent('shenShi') + '%' }"></div>
            </div>
          </div>

          <div class="vital-item">
            <div class="vital-info">
              <span class="vital-name">⏳ 寿元</span>
              <span class="vital-text">{{ playerStatus.vitals.lifespan.current }} / {{ playerStatus.vitals.lifespan.max }}年</span>
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
            <span class="realm-name">{{ playerStatus.realm.name }}</span>
            <span class="realm-level">{{ playerStatus.realm.level }}层</span>
          </div>
          <div class="realm-progress">
            <div class="progress-bar">
              <div class="progress-fill cultivation" :style="{ width: realmProgressPercent + '%' }"></div>
            </div>
            <span class="progress-text">{{ playerStatus.realm.progress }} / {{ playerStatus.realm.required }}</span>
          </div>
        </div>

        <div class="status-details">
          <div class="detail-item">
            <span class="detail-label">声望</span>
            <span class="detail-value">{{ playerStatus.reputation }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">位置</span>
            <span class="detail-value">{{ playerStatus.location.description }}</span>
          </div>
        </div>

        <!-- 当前状态显示 -->
        <!-- 隐藏活动和心境状态信息 -->
      </div>

      <!-- 天赋神通 -->
      <div v-if="characterInfo?.talents && characterInfo.talents.length > 0" class="collapsible-section talents-section">
        <div class="section-header" @click="talentsCollapsed = !talentsCollapsed">
          <h3 class="section-title">天赋神通</h3>
          <button class="collapse-toggle" :class="{ 'collapsed': talentsCollapsed }">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
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
              <div class="talent-info">
                <span class="talent-name">{{ talent }}</span>
                <span class="click-hint">点击查看详情</span>
              </div>
              <div class="talent-data">
                <span class="talent-level">Lv.{{ getTalentLevel(talent) }}</span>
                <span class="talent-progress-text">{{ getTalentExp(talent) }}/{{ getTalentMaxExp(talent) }}</span>
              </div>
            </div>
            <div class="talent-progress">
              <div class="progress-bar">
                <div class="progress-fill talent" :style="{ width: getTalentProgress(talent) + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 状态效果 -->
      <div class="collapsible-section status-section">
        <div class="section-header" @click="statusCollapsed = !statusCollapsed">
          <h3 class="section-title">状态效果</h3>
          <button class="collapse-toggle" :class="{ 'collapsed': statusCollapsed }">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 10l4-4H4l4 4z"/>
            </svg>
          </button>
        </div>
        <div v-show="!statusCollapsed" class="status-effects">
          <div v-if="statusEffects.length === 0" class="empty-status">
            <span class="empty-text">暂无状态效果</span>
          </div>
          <div v-else>
            <div
              class="status-effect-card clickable"
              v-for="effect in statusEffects"
              :key="effect.状态名称"
              :class="[effect.类型 === 'BUFF' ? 'buff' : 'debuff']"
              @click="showStatusDetail(effect)"
            >
              <div class="effect-header">
                <div class="effect-info">
                  <span class="effect-name">{{ effect.状态名称 }}</span>
                  <span class="click-hint">点击查看详情</span>
                </div>
                <div class="effect-data">
                  <span class="effect-intensity" v-if="effect.强度">强度{{ effect.强度 }}</span>
                  <span class="effect-time">{{ formatTimeDisplay(effect.时间) }}</span>
                </div>
              </div>
              <div class="effect-description" v-if="effect.状态描述">
                {{ effect.状态描述 }}
              </div>
              <div class="effect-source" v-if="effect.来源">
                来源: {{ effect.来源 }}
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
import { computed, ref, onMounted } from 'vue';
import DetailModal from '@/components/common/DetailModal.vue';
import { getTavernHelper } from '@/utils/tavern';

// 酒馆数据类型定义
interface PlayerStatusData {
  境界?: {
    名称?: string;
    等级?: number;
    修为进度?: number;
    突破所需?: number;
  };
  修为?: {
    当前?: number;
    最大?: number;
  };
  声望?: number;
  气血?: {
    当前?: number;
    最大?: number;
  };
  灵气?: {
    当前?: number;
    最大?: number;
  };
  神识?: {
    当前?: number;
    最大?: number;
  };
  寿命?: {
    当前?: number;
    最大?: number;
  };
  位置?: {
    描述?: string;
  };
  当前活动?: string;
  心境状态?: string;
  状态效果?: Array<{
    状态名称?: string;
    name?: string;
    类型?: string;
    持续时间?: string;
    强度?: string | number;
    剩余时间?: string | number;
    来源?: string;
  }>;
}

interface SaveData {
  玩家角色状态?: PlayerStatusData;
  天赋神通?: Record<string, {
    等级?: number;
    level?: number;
    经验?: {
      当前?: number;
      最大?: number;
    };
    exp?: {
      current?: number;
      max?: number;
    };
  }>;
  [key: string]: unknown;
}

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

interface TavernData {
  characterInfo?: {
    name: string;
    gender: string;
    world: string;
    talents: string[];
    spiritRoot: string;
    talent: string;
    origin: string;
  };
  saveData?: SaveData;
}

const tavernData = ref<TavernData | null>(null);

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

// 获取酒馆数据
const loadTavernData = async () => {
  try {
    const helper = getTavernHelper();
    if (!helper) {
      console.warn('[右侧面板] 酒馆Helper不可用');
      return;
    }

    // 读取全局变量（角色基础信息）
    const globalVars = await helper.getVariables({ type: 'global' });
    // 读取聊天变量（动态游戏数据）
    const chatVars = await helper.getVariables({ type: 'chat' });
    const saveData = chatVars['character.saveData'];

    if (saveData && typeof saveData === 'object') {
      // 角色基础信息
      const characterInfo = {
        name: (globalVars['character.name'] || '未名道友') as string,
        gender: (globalVars['character.gender'] || '未知') as string,
        world: (globalVars['character.world'] || '未知世界') as string,
        talents: (globalVars['character.talents'] || []) as string[],
        spiritRoot: (globalVars['character.spirit_root'] || '未知') as string,
        talent: (globalVars['character.talent_tier'] || '未知') as string,
        origin: (globalVars['character.origin'] || '未知') as string
      };

      tavernData.value = {
        characterInfo,
        saveData: saveData as SaveData
      };

      console.log('[右侧面板] 酒馆数据加载成功:', {
        characterInfo,
        saveData,
        location: (saveData as SaveData)?.玩家角色状态?.位置?.描述
      });
    } else {
      console.warn('[右侧面板] 未找到存档数据');
    }
  } catch (error) {
    console.warn('[右侧面板] 获取酒馆数据失败:', error);
  }
};

// 数据加载状态
const isDataLoaded = computed(() => {
  return tavernData.value?.characterInfo && tavernData.value?.saveData;
});

// 角色基础信息
const characterInfo = computed(() => {
  if (!tavernData.value?.characterInfo) return null;
  return tavernData.value.characterInfo;
});

// 玩家状态信息
const playerStatus = computed(() => {
  const saveData = tavernData.value?.saveData;
  const status = saveData?.玩家角色状态 || {};
  if (!status || Object.keys(status).length === 0) {
    return {
      realm: { name: '凡人', level: 0, progress: 0, required: 100 },
      cultivationExp: { current: 0, max: 100 },
      reputation: 0,
      vitals: {
        qiBlood: { current: 100, max: 100 },
        lingQi: { current: 50, max: 100 },
        shenShi: { current: 30, max: 100 },
        lifespan: { current: 18, max: 100 }
      },
      location: { description: '新手村' },
      activity: '修行',
      mood: '平静'
    };
  }

  return {
    realm: {
      name: status.境界?.名称 || '凡人',
      level: status.境界?.等级 || 0,
      progress: status.境界?.修为进度 || status.修为?.当前 || 0,
      required: status.境界?.突破所需 || status.修为?.最大 || 100
    },
    cultivationExp: {
      current: status.修为?.当前 || 0,
      max: status.修为?.最大 || 100
    },
    reputation: status.声望 || 0,
    vitals: {
      qiBlood: {
        current: status.气血?.当前 || 100,
        max: status.气血?.最大 || 100
      },
      lingQi: {
        current: status.灵气?.当前 || 50,
        max: status.灵气?.最大 || 100
      },
      shenShi: {
        current: status.神识?.当前 || 30,
        max: status.神识?.最大 || 100
      },
      lifespan: {
        current: status.寿命?.当前 || 18,
        max: status.寿命?.最大 || 100
      }
    },
    location: { description: status.位置?.描述 || '新手村' },
    activity: status.当前活动 || '修行',
    mood: status.心境状态 || '平静'
  };
});

// 状态效果 - 基于标准 StatusEffect 接口
const statusEffects = computed(() => {
  const effects = tavernData.value?.saveData?.玩家角色状态?.状态效果 || [];
  return effects.map((effect) => {
    return {
      状态名称: effect.状态名称 || effect.name || '未知状态',
      类型: (effect.类型 === 'BUFF' ? 'BUFF' : 'DEBUFF') as 'BUFF' | 'DEBUFF',
      时间: String(effect.持续时间 || effect.剩余时间 || '永久'),
      状态描述: '', // 从内置描述数据库获取
      强度: typeof effect.强度 === 'number' ? effect.强度 : (effect.强度 ? parseInt(String(effect.强度)) : 1),
      来源: effect.来源
    };
  });
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
  const { progress, required } = playerStatus.value.realm;
  return progress && required ? Math.round((progress / required) * 100) : 0;
});

// 计算生命体征百分比
const getVitalPercent = (type: 'qiBlood' | 'lingQi' | 'shenShi' | 'lifespan') => {
  const vitals = playerStatus.value.vitals[type];
  if (!vitals?.current || !vitals?.max) return 0;
  return Math.round((vitals.current / vitals.max) * 100);
};

// 计算天赋等级
const getTalentLevel = (talent: string): number => {
  const talentData = tavernData.value?.saveData?.天赋神通?.[talent];
  return talentData?.等级 || talentData?.level || 1;
};

// 计算天赋经验
const getTalentExp = (talent: string): number => {
  const talentData = tavernData.value?.saveData?.天赋神通?.[talent];
  return talentData?.经验?.当前 || talentData?.exp?.current || 0;
};

// 计算天赋最大经验
const getTalentMaxExp = (talent: string): number => {
  const talentData = tavernData.value?.saveData?.天赋神通?.[talent];
  return talentData?.经验?.最大 || talentData?.exp?.max || 100;
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
const showStatusDetail = (effect: { 状态名称: string; 类型: string; 时间: string; 强度?: number; 来源?: string }) => {
  // 从酒馆数据中获取详细的状态效果信息
  const statusData = tavernData.value?.saveData?.玩家角色状态;
  const effectsArray = statusData?.状态效果 || [];
  const detailData = effectsArray.find((s) =>
    (s.状态名称 || s.name) === effect.状态名称
  );

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
  if (detailData?.剩余时间) {
    additionalInfo.push({
      label: '剩余时间',
      value: detailData.剩余时间
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

onMounted(async () => {
  await loadTavernData();
});
</script>

<style scoped>
.right-sidebar {
  width: 100%;
  height: 100%;
  padding: 16px;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.sidebar-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
}

[data-theme="dark"] .sidebar-header {
  border-bottom-color: #374151;
}

[data-theme="dark"] .sidebar-title {
  color: #f3f4f6;
}

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
.talents-section {
  border: 1px solid rgba(168, 85, 247, 0.2);
  background: rgba(168, 85, 247, 0.1);
}

.talents-section .section-header {
  background: rgba(168, 85, 247, 0.05);
}

.talents-list {
  padding: 0 16px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 状态效果特定样式 */
.status-section {
  border: 1px solid rgba(34, 197, 94, 0.2);
  background: rgba(34, 197, 94, 0.1);
  margin-bottom: 16px;
  padding: 0;
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.status-section .section-header {
  background: rgba(34, 197, 94, 0.05);
}

.status-effects {
  padding: 0 16px 16px 16px;
  display: flex;
  flex-direction: column;
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
  padding: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.status-effect-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.status-effect-card.buff {
  border-color: rgba(34, 197, 94, 0.3);
  background: rgba(34, 197, 94, 0.15);
}

.status-effect-card.buff:hover {
  background: rgba(34, 197, 94, 0.25);
  border-color: rgba(34, 197, 94, 0.5);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);
}

.status-effect-card.debuff {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.15);
}

.status-effect-card.debuff:hover {
  background: rgba(239, 68, 68, 0.25);
  border-color: rgba(239, 68, 68, 0.5);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
}

.effect-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.effect-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.effect-name {
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
  background: rgba(251, 191, 36, 0.2);
  padding: 2px 6px;
  border-radius: 10px;
}

.effect-time {
  font-size: 0.7rem;
  color: #94a3b8;
}

.effect-description {
  font-size: 0.75rem;
  color: #cbd5e1;
  margin-bottom: 4px;
  line-height: 1.3;
}

.effect-source {
  font-size: 0.7rem;
  color: #94a3b8;
  font-style: italic;
}

.section-title {
  margin: 0 0 10px 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #e2e8f0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 6px;
}

/* 点击提示样式 */
.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.clickable:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(2px);
}

.click-hint {
  font-size: 0.6rem;
  opacity: 0.7;
  margin-left: 4px;
}

.talent-tag.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.talent-tag.clickable:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
}

/* 天赋卡片样式 */
.talent-card {
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.talent-card:hover {
  background: rgba(139, 92, 246, 0.25);
  border-color: rgba(139, 92, 246, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
}

.talent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.talent-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: #a855f7;
}

.talent-level {
  font-size: 0.7rem;
  color: #fbbf24;
  font-weight: 500;
  background: rgba(251, 191, 36, 0.2);
  padding: 2px 6px;
  border-radius: 10px;
}

.talent-progress {
  margin-bottom: 6px;
}

.progress-fill.talent {
  background: linear-gradient(90deg, #7c3aed, #a855f7);
}

.talent-card .click-hint {
  font-size: 0.6rem;
  opacity: 0.8;
  color: #cbd5e1;
}

/* 天赋标签 */
.talents-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.talent-tag {
  font-size: 0.7rem;
  padding: 4px 8px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: white;
  border-radius: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 24px;
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
