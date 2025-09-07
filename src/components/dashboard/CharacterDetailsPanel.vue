<template>
  <div class="character-details-wrapper">
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载角色数据中...</p>
    </div>
    
    <div v-else-if="!baseInfo || !saveData" class="error-container">
      <div class="error-icon">
        <AlertCircle :size="48" />
      </div>
      <p>无法加载角色数据</p>
      <button class="retry-btn" @click="refreshData">重试</button>
    </div>
    
    <div v-else class="character-details-content">
      <!-- 顶部角色基本信息 -->
      <div class="character-header">
        <div class="character-avatar" :class="`gender-${baseInfo.性别}`">
          <div class="avatar-circle">
            {{ baseInfo.名字?.charAt(0) }}
          </div>
          <div class="avatar-decoration"></div>
        </div>
        <div class="character-info">
          <h1 class="character-name">{{ baseInfo.名字 }}</h1>
          <div class="character-details">
            <div class="detail-item">
              <span class="label">境界</span>
              <span class="value realm" :class="`realm-${playerStatus.境界?.名称}`">
                {{ playerStatus.境界?.名称 }} 第{{ playerStatus.境界?.等级 }}层
              </span>
            </div>
            <div class="detail-item">
              <span class="label">年龄</span>
              <span class="value">{{ playerStatus.寿命?.当前 }}岁</span>
            </div>
            <div class="detail-item">
              <span class="label">出身</span>
              <span class="value">{{ baseInfo.出生 }}</span>
            </div>
            <div class="detail-item">
              <span class="label">位置</span>
              <span class="value">{{ playerStatus.位置?.描述 }}</span>
            </div>
          </div>
        </div>
        <div class="character-stats">
          <div class="stat-item">
            <span class="stat-label">声望</span>
            <span class="stat-value">{{ playerStatus.声望 || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">修为</span>
            <span class="stat-value">{{ playerStatus.修为?.当前 || 0 }}/{{ playerStatus.修为?.最大 || 100 }}</span>
          </div>
        </div>
      </div>

      <!-- 主要内容区域 -->
      <div class="content-grid">
        <!-- 左侧栏 -->
        <div class="left-column">
          <!-- 生命状态 -->
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <Heart :size="18" />
              </div>
              生命状态
            </h3>
            <div class="vitals-grid">
              <div class="vital-item" v-for="vital in vitalsData" :key="vital.label">
                <div class="vital-label">{{ vital.label }}</div>
                <div class="vital-bar">
                  <div class="bar-container">
                    <div 
                      class="bar-fill" 
                      :class="`bar-${vital.color}`"
                      :style="{ width: getPercentage(vital.current, vital.max) + '%' }"
                    ></div>
                  </div>
                  <div class="vital-text">{{ vital.current }}/{{ vital.max }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 天赋与灵根 -->
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <Sparkles :size="18" />
              </div>
              天赋与灵根
            </h3>
            <div class="talent-grid">
              <div class="talent-item">
                <span class="talent-label">天资等级</span>
                <span class="talent-value tier" :class="`tier-${baseInfo.天资}`">{{ baseInfo.天资 }}</span>
              </div>
              <div class="talent-item">
                <span class="talent-label">灵根属性</span>
                <span class="talent-value spirit-root" :class="`root-${baseInfo.灵根}`">{{ baseInfo.灵根 }}</span>
              </div>
              <div class="talent-list" v-if="baseInfo.天赋?.length">
                <div class="talent-tags">
                  <span v-for="talent in baseInfo.天赋" :key="talent" class="talent-tag">
                    {{ talent }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 装备与法宝 -->
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <Sword :size="18" />
              </div>
              装备法宝
            </h3>
            <div class="equipment-grid">
              <div 
                v-for="(slot, index) in equipmentSlots" 
                :key="index" 
                class="equipment-slot"
                :class="{ 'has-equipment': slot.item }"
              >
                <div class="slot-name">{{ slot.name }}</div>
                <div v-if="slot.item" class="equipment-item" :class="getItemQualityClass(slot.item)">
                  <div class="item-name">{{ slot.item.名称 }}</div>
                  <div class="item-quality">{{ slot.item.品质?.quality || '凡' }}品{{ slot.item.品质?.grade || 0 }}级</div>
                </div>
                <div v-else class="empty-slot">空</div>
              </div>
            </div>
          </div>

          <!-- 状态效果 -->
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <Star :size="18" />
              </div>
              状态效果
            </h3>
            <div v-if="!playerStatus.状态效果?.length" class="empty-state">
              <div class="empty-icon">
                <Bird :size="32" />
              </div>
              <span>当前无状态效果</span>
            </div>
            <div v-else class="effects-list">
              <div v-for="effect in playerStatus.状态效果" :key="effect.状态名称" 
                   class="effect-item" :class="`effect-${effect.类型}`">
                <div class="effect-header">
                  <span class="effect-name">{{ effect.状态名称 }}</span>
                  <span class="effect-duration">{{ effect.时间 }}</span>
                </div>
                <div class="effect-description">{{ effect.状态描述 }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 中间栏 -->
        <div class="middle-column">
          <!-- 六司属性 -->
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <BarChart3 :size="18" />
              </div>
              六司属性
            </h3>
            <div class="attributes-display">
              <!-- 最终属性 -->
              <div class="final-attributes">
                <h4 class="attribute-group-title">总计属性</h4>
                <div class="attributes-grid">
                  <div v-for="(value, key) in finalAttributes" :key="key" class="attribute-item final">
                    <span class="attr-name">{{ key }}</span>
                    <span class="attr-value">{{ value }}</span>
                  </div>
                </div>
              </div>
              
              <!-- 属性详情 -->
              <div class="attribute-breakdown">
                <div class="innate-attrs">
                  <h4 class="attribute-group-title">先天属性</h4>
                  <div class="attributes-grid compact">
                    <div v-for="(value, key) in baseInfo.先天六司" :key="key" class="attribute-item innate">
                      <span class="attr-name">{{ key }}</span>
                      <span class="attr-value">{{ value }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="acquired-attrs" v-if="hasAcquiredBonus">
                  <h4 class="attribute-group-title">后天加成</h4>
                  <div class="attributes-grid compact">
                    <div v-for="(value, key) in acquiredAttributes" :key="key" 
                         class="attribute-item acquired" v-show="value > 0">
                      <span class="attr-name">{{ key }}</span>
                      <span class="attr-value">+{{ value }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 修炼功法 -->
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <BookOpen :size="18" />
              </div>
              修炼功法
            </h3>
            <div v-if="!cultivationData.功法" class="empty-state">
              <div class="empty-icon">
                <BookOpen :size="32" />
              </div>
              <span>尚未修炼功法</span>
            </div>
            <div v-else class="cultivation-display">
              <div class="technique-info">
                <div class="technique-header">
                  <h4 class="technique-name" :class="getItemQualityClass(cultivationData.功法, 'text')">
                    {{ cultivationData.功法.名称 }}
                  </h4>
                  <div class="technique-quality">
                    {{ cultivationData.功法.品质?.quality || '凡' }}品{{ cultivationData.功法.品质?.grade || 0 }}级
                  </div>
                </div>
                <div class="technique-progress">
                  <div class="progress-item">
                    <span class="progress-label">修炼进度</span>
                    <div class="progress-bar">
                      <div class="progress-fill" :style="{ width: (cultivationData.功法.修炼进度 || 0) + '%' }"></div>
                    </div>
                    <span class="progress-text">{{ cultivationData.功法.修炼进度 || 0 }}%</span>
                  </div>
                  <div class="progress-item">
                    <span class="progress-label">熟练度</span>
                    <div class="progress-bar">
                      <div class="progress-fill" :style="{ width: (cultivationData.熟练度 || 0) + '%' }"></div>
                    </div>
                    <span class="progress-text">{{ cultivationData.熟练度 || 0 }}%</span>
                  </div>
                </div>
              </div>
              
              <!-- 已学技能 -->
              <div v-if="cultivationData.已解锁技能?.length" class="learned-skills">
                <h4 class="skills-title">已掌握技能</h4>
                <div class="skills-list">
                  <span v-for="skill in cultivationData.已解锁技能" :key="skill" class="skill-tag">
                    {{ skill }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧栏 -->
        <div class="right-column">
          <!-- 三千大道 -->
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <Zap :size="18" />
              </div>
              三千大道
            </h3>
            <div v-if="!daoData.已解锁大道?.length" class="empty-state">
              <div class="empty-icon">
                <Sprout :size="32" />
              </div>
              <span>尚未解锁大道</span>
            </div>
            <div v-else class="dao-list">
              <div v-for="daoName in daoData.已解锁大道" :key="daoName" class="dao-item">
                <div class="dao-header">
                  <span class="dao-name">{{ daoName }}</span>
                  <span class="dao-stage">第{{ getDaoStage(daoName) }}阶段</span>
                </div>
                <div class="dao-progress">
                  <div class="progress-bar small">
                    <div class="progress-fill" :style="{ width: getDaoProgress(daoName) + '%' }"></div>
                  </div>
                  <span class="progress-text small">{{ getDaoProgress(daoName) }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 人际关系 -->
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <Users :size="18" />
              </div>
              人际关系
            </h3>
            <div v-if="!relationshipCount" class="empty-state">
              <div class="empty-icon">
                <Handshake :size="32" />
              </div>
              <span>暂无人际关系</span>
            </div>
            <div v-else class="relationships-summary">
              <div class="relationship-stats">
                <div class="stat-item">
                  <span class="stat-label">总人数</span>
                  <span class="stat-value">{{ relationshipCount }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">平均好感</span>
                  <span class="stat-value">{{ averageFavorability }}%</span>
                </div>
              </div>
              <div class="relationship-categories">
                <div v-for="category in relationshipCategories" :key="category.type" class="category-item">
                  <span class="category-name">{{ category.name }}</span>
                  <span class="category-count">{{ category.count }}人</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 背包概览 -->
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <Backpack :size="18" />
              </div>
              背包概览
            </h3>
            <div class="inventory-summary">
              <div class="inventory-stats">
                <div class="stat-group">
                  <div class="stat-item">
                    <span class="stat-label">物品总数</span>
                    <span class="stat-value">{{ inventoryItemCount }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">法宝数量</span>
                    <span class="stat-value">{{ getItemTypeCount('法宝') }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">功法数量</span>
                    <span class="stat-value">{{ getItemTypeCount('功法') }}</span>
                  </div>
                </div>
              </div>
              
              <div class="spirit-stones">
                <h4 class="stones-title">灵石储备</h4>
                <div class="stones-grid">
                  <div v-for="grade in spiritStoneGrades" :key="grade.name" 
                       class="stone-item" :class="grade.class">
                    <span class="stone-name">{{ grade.name }}</span>
                    <span class="stone-count">{{ getSpiritStoneCount(grade.name) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 宗门信息 -->
          <div class="info-section" v-if="playerStatus.宗门信息">
            <h3 class="section-title">
              <div class="title-icon">
                <Mountain :size="18" />
              </div>
              宗门信息
            </h3>
            <div class="sect-info">
              <div class="sect-header">
                <h4 class="sect-name">{{ playerStatus.宗门信息.name }}</h4>
                <span class="sect-type">{{ playerStatus.宗门信息.type }}</span>
              </div>
              <div class="sect-details">
                <div class="detail-row">
                  <span class="detail-label">职位</span>
                  <span class="detail-value">{{ playerStatus.宗门信息.position }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">贡献度</span>
                  <span class="detail-value">{{ playerStatus.宗门信息.contribution }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">关系</span>
                  <span class="detail-value" :class="`relationship-${playerStatus.宗门信息.relationship}`">
                    {{ playerStatus.宗门信息.relationship }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCharacterStore } from '@/stores/characterStore';
import { calculateFinalAttributes } from '@/utils/attributeCalculation';
import { 
  AlertCircle, Heart, Sparkles, Sword, Star, BarChart3, BookOpen, 
  Zap, Users, Backpack, Mountain, Bird, Sprout, Handshake 
} from 'lucide-vue-next';

const characterStore = useCharacterStore();
const isLoading = ref(false);

// 基础数据
const baseInfo = computed(() => characterStore.activeCharacterProfile?.角色基础信息);
const playerStatus = computed(() => characterStore.activeSaveSlot?.存档数据?.玩家角色状态);
const saveData = computed(() => characterStore.activeSaveSlot?.存档数据);

// 修炼功法数据
const cultivationData = computed(() => {
  return saveData.value?.修炼功法 || {
    功法: null,
    熟练度: 0,
    已解锁技能: [],
    修炼时间: 0,
    突破次数: 0
  };
});

// 三千大道数据
const daoData = computed(() => {
  return saveData.value?.三千大道 || {
    已解锁大道: [],
    大道进度: {}
  };
});

// 生命状态数据
const vitalsData = computed(() => {
  if (!playerStatus.value) return [];
  return [
    {
      label: '气血',
      current: playerStatus.value.气血?.当前 || 0,
      max: playerStatus.value.气血?.最大 || 1,
      color: 'danger'
    },
    {
      label: '灵气',
      current: playerStatus.value.灵气?.当前 || 0,
      max: playerStatus.value.灵气?.最大 || 1,
      color: 'info'
    },
    {
      label: '神识',
      current: playerStatus.value.神识?.当前 || 0,
      max: playerStatus.value.神识?.最大 || 1,
      color: 'accent'
    }
  ];
});

// 属性计算
const finalAttributes = computed(() => {
  if (!baseInfo.value?.先天六司 || !saveData.value) return {};
  const result = calculateFinalAttributes(baseInfo.value.先天六司, saveData.value);
  return result?.最终六司 || {};
});

const acquiredAttributes = computed(() => {
  if (!baseInfo.value?.先天六司 || !saveData.value) return {};
  const result = calculateFinalAttributes(baseInfo.value.先天六司, saveData.value);
  return result?.后天六司 || {};
});

const hasAcquiredBonus = computed(() => {
  return Object.values(acquiredAttributes.value).some(value => value > 0);
});

// 装备槽位
const equipmentSlots = computed(() => {
  const equipment = saveData.value?.装备栏 || {};
  const inventory = saveData.value?.背包?.物品 || {};
  
  return [
    { name: '法宝1', item: equipment.法宝1 ? inventory[equipment.法宝1] : null },
    { name: '法宝2', item: equipment.法宝2 ? inventory[equipment.法宝2] : null },
    { name: '法宝3', item: equipment.法宝3 ? inventory[equipment.法宝3] : null },
    { name: '法宝4', item: equipment.法宝4 ? inventory[equipment.法宝4] : null },
    { name: '法宝5', item: equipment.法宝5 ? inventory[equipment.法宝5] : null },
    { name: '法宝6', item: equipment.法宝6 ? inventory[equipment.法宝6] : null },
  ];
});

// 人际关系统计
const relationshipCount = computed(() => {
  return Object.keys(saveData.value?.人物关系 || {}).length;
});

const averageFavorability = computed(() => {
  const relationships = saveData.value?.人物关系 || {};
  const relations = Object.values(relationships);
  if (relations.length === 0) return 0;
  
  const total = relations.reduce((sum, rel) => sum + (rel.人物好感度 || 0), 0);
  return Math.round(total / relations.length);
});

const relationshipCategories = computed(() => {
  const relationships = saveData.value?.人物关系 || {};
  const categories: Record<string, number> = {};
  
  Object.values(relationships).forEach(rel => {
    const relation = rel.人物关系 || '其他';
    categories[relation] = (categories[relation] || 0) + 1;
  });
  
  return Object.entries(categories).map(([type, count]) => ({
    type,
    name: getRelationshipName(type),
    count
  }));
});

// 背包统计
const inventoryItemCount = computed(() => {
  return Object.keys(saveData.value?.背包?.物品 || {}).length;
});

const spiritStoneGrades = [
  { name: '下品', class: 'grade-common' },
  { name: '中品', class: 'grade-rare' },
  { name: '上品', class: 'grade-epic' },
  { name: '极品', class: 'grade-legend' }
];

// 方法
const getPercentage = (current: number, max: number): number => {
  return Math.round((current / max) * 100);
};

const getItemQualityClass = (item: any, type: 'border' | 'text' = 'border'): string => {
  if (!item) return '';
  const quality = item.品质?.quality || '凡';
  return `${type}-quality-${quality}`;
};

const getDaoStage = (daoName: string): number => {
  return daoData.value.大道进度?.[daoName]?.当前阶段 || 0;
};

const getDaoProgress = (daoName: string): number => {
  const progress = daoData.value.大道进度?.[daoName];
  if (!progress) return 0;
  const currentExp = progress.当前经验 || 0;
  const stage = progress.当前阶段 || 0;
  const nextStageExp = (stage + 1) * 100;
  return Math.min(100, Math.round((currentExp / nextStageExp) * 100));
};

const getItemTypeCount = (type: string): number => {
  const items = saveData.value?.背包?.物品 || {};
  return Object.values(items).filter((item: any) => item.类型 === type).length;
};

const getSpiritStoneCount = (grade: string): number => {
  return saveData.value?.背包?.灵石?.[grade as keyof typeof saveData.value.背包.灵石] || 0;
};

const getRelationshipName = (type: string): string => {
  const nameMap: Record<string, string> = {
    '父亲': '家人',
    '母亲': '家人',
    '兄弟': '家人',
    '姐妹': '家人',
    '师父': '师门',
    '同门': '师门',
    '朋友': '朋友',
    '青梅竹马': '红颜',
    '道侣': '道侣',
    '敌人': '仇敌',
    '其他': '其他'
  };
  return nameMap[type] || type;
};

const refreshData = async () => {
  isLoading.value = true;
  try {
    await characterStore.syncFromTavern();
  } catch (error) {
    console.error('[人物详情] 刷新数据失败:', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  console.log('[人物详情] 组件挂载，同步数据...');
  await refreshData();
});
</script>

<style scoped>
.character-details-wrapper {
  width: 100%;
  height: 100%;
  background: var(--color-background);
  overflow-y: auto;
}

/* 加载和错误状态 */
.loading-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top: 3px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.error-icon {
  margin-bottom: 16px;
  color: var(--color-danger);
}

.retry-btn {
  margin-top: 16px;
  padding: 8px 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

/* 角色头部信息 */
.character-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 24px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.character-avatar {
  position: relative;
}

.avatar-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: bold;
  color: white;
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
}

.gender-女 .avatar-circle {
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-hover));
  box-shadow: 0 4px 12px rgba(var(--color-accent-rgb), 0.3);
}

.character-info {
  flex: 1;
}

.character-name {
  margin: 0 0 16px 0;
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text);
}

.character-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.value {
  font-weight: 600;
  color: var(--color-text);
}

.realm {
  color: var(--color-warning);
  font-weight: 700;
}

.character-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary);
}

/* 内容网格 */
.content-grid {
  display: grid;
  grid-template-columns: 350px 1fr 320px;
  gap: 24px;
  padding: 24px;
}

/* 信息区块 */
.info-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.title-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}

/* 生命状态 */
.vitals-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.vital-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vital-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text);
}

.vital-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-container {
  flex: 1;
  height: 12px;
  background: var(--color-border);
  border-radius: 6px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.bar-danger { background: var(--color-danger); }
.bar-info { background: var(--color-info); }
.bar-accent { background: var(--color-accent); }

.vital-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  min-width: 60px;
}

/* 天赋与灵根 */
.talent-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.talent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--color-surface-light);
  border-radius: 8px;
}

.talent-label {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.talent-value {
  font-weight: 600;
}

.tier, .spirit-root {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.85rem;
}

.tier {
  background: rgba(var(--color-success-rgb), 0.1);
  color: var(--color-success);
}

.spirit-root {
  background: rgba(var(--color-info-rgb), 0.1);
  color: var(--color-info);
}

.talent-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.talent-tag {
  padding: 4px 10px;
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

/* 装备网格 */
.equipment-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.equipment-slot {
  padding: 12px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  text-align: center;
  transition: all 0.2s ease;
}

.equipment-slot.has-equipment {
  border-color: var(--color-success);
  background: rgba(var(--color-success-rgb), 0.05);
}

.slot-name {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.equipment-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.item-quality {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.empty-slot {
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

/* 状态效果 */
.effects-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.effect-item {
  padding: 12px;
  border-radius: 8px;
  border-left: 4px solid;
}

.effect-buff {
  border-color: var(--color-success);
  background: rgba(var(--color-success-rgb), 0.1);
}

.effect-debuff {
  border-color: var(--color-danger);
  background: rgba(var(--color-danger-rgb), 0.1);
}

.effect-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.effect-name {
  font-weight: 600;
}

.effect-duration {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.effect-description {
  font-size: 0.85rem;
  color: var(--color-text);
  line-height: 1.4;
}

/* 六司属性 */
.attributes-display {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.attribute-group-title {
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.attributes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.attributes-grid.compact {
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.attribute-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--color-surface-light);
}

.attribute-item.final {
  background: rgba(var(--color-primary-rgb), 0.1);
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
  font-weight: 600;
}

.attribute-item.innate {
  background: var(--color-surface-hover);
}

.attribute-item.acquired {
  background: rgba(var(--color-success-rgb), 0.1);
}

.attr-name {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.attr-value {
  font-weight: 600;
  color: var(--color-text);
}

.attribute-item.acquired .attr-value {
  color: var(--color-success);
}

.attribute-breakdown {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* 修炼功法 */
.cultivation-display {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.technique-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.technique-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.technique-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.technique-quality {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  padding: 4px 8px;
  background: var(--color-surface-hover);
  border-radius: 12px;
}

.technique-progress {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.progress-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-label {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  min-width: 80px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-success), var(--color-info));
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  min-width: 40px;
}

.learned-skills {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skills-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-tag {
  padding: 6px 12px;
  background: var(--color-info);
  color: white;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 500;
}

/* 三千大道 */
.dao-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dao-item {
  padding: 12px;
  background: var(--color-surface-light);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.dao-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.dao-name {
  font-weight: 600;
  color: var(--color-text);
}

.dao-stage {
  font-size: 0.8rem;
  background: var(--color-info);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
}

.dao-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar.small {
  height: 6px;
}

.progress-text.small {
  font-size: 0.8rem;
  min-width: 35px;
}

/* 人际关系 */
.relationships-summary {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.relationship-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.relationship-categories {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--color-surface-light);
  border-radius: 6px;
}

.category-name {
  font-size: 0.9rem;
  color: var(--color-text);
}

.category-count {
  font-weight: 600;
  color: var(--color-primary);
}

/* 背包概览 */
.inventory-summary {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.inventory-stats .stat-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.spirit-stones {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stones-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.stones-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.stone-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
}

.grade-common { background: rgba(128, 128, 128, 0.1); }
.grade-rare { background: rgba(59, 130, 246, 0.1); }
.grade-epic { background: rgba(147, 51, 234, 0.1); }
.grade-legend { background: rgba(245, 158, 11, 0.1); }

.stone-name {
  color: var(--color-text);
}

.stone-count {
  font-weight: 600;
  color: var(--color-text);
}

/* 宗门信息 */
.sect-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sect-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sect-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.sect-type {
  font-size: 0.8rem;
  padding: 4px 8px;
  background: var(--color-primary);
  color: white;
  border-radius: 12px;
}

.sect-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.detail-value {
  font-weight: 600;
  color: var(--color-text);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-icon {
  margin-bottom: 8px;
  opacity: 0.6;
  color: var(--color-text-muted);
}

/* 品质颜色 */
.border-quality-神, .text-quality-神 { color: #ef4444 !important; }
.border-quality-仙, .text-quality-仙 { color: #f59e0b !important; }
.border-quality-天, .text-quality-天 { color: #8b5cf6 !important; }
.border-quality-地, .text-quality-地 { color: #3b82f6 !important; }
.border-quality-玄, .text-quality-玄 { color: #10b981 !important; }
.border-quality-黄, .text-quality-黄 { color: #84cc16 !important; }
.border-quality-凡, .text-quality-凡 { color: var(--color-text) !important; }

/* 宗门关系颜色 */
.relationship-恶劣 { color: var(--color-danger) !important; }
.relationship-一般 { color: var(--color-text-secondary) !important; }
.relationship-良好 { color: var(--color-success) !important; }
.relationship-亲密 { color: var(--color-info) !important; }

/* 响应式设计 */
@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  
  .right-column {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
  
  .right-column .info-section {
    margin-bottom: 0;
  }
}

@media (max-width: 768px) {
  .character-header {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }
  
  .character-details {
    grid-template-columns: 1fr;
    text-align: center;
  }
  
  .content-grid {
    grid-template-columns: 1fr;
    padding: 16px;
  }
  
  .right-column {
    grid-template-columns: 1fr;
  }
  
  .attributes-grid {
    grid-template-columns: 1fr;
  }
  
  .equipment-grid {
    grid-template-columns: 1fr;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>