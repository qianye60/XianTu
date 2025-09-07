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
              <span class="value realm" :class="`realm-${playerStatus?.境界?.名称}`">
                {{ playerStatus?.境界?.名称 }} 第{{ playerStatus?.境界?.等级 }}层
              </span>
            </div>
            <div class="detail-item">
              <span class="label">年龄</span>
              <span class="value">{{ playerStatus?.寿命?.当前 }}岁</span>
            </div>
            <div class="detail-item">
              <span class="label">出身</span>
              <span class="value">{{ baseInfo.出生 }}</span>
            </div>
            <div class="detail-item">
              <span class="label">位置</span>
              <span class="value">{{ playerStatus?.位置?.描述 }}</span>
            </div>
          </div>
        </div>
        <div class="character-stats">
          <div class="stat-item">
            <span class="stat-label">声望</span>
            <span class="stat-value">{{ playerStatus?.声望 || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">修为</span>
            <span class="stat-value">{{ playerStatus?.修为?.当前 || 0 }}/{{ playerStatus?.修为?.最大 || 100 }}</span>
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
            <div v-if="!playerStatus?.状态效果?.length" class="empty-state">
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
                    <div v-for="(value, key) in innateAttributesWithDefaults" :key="key" class="attribute-item innate">
                      <span class="attr-name">{{ key }}</span>
                      <span class="attr-value">{{ value }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="acquired-attrs">
                  <h4 class="attribute-group-title">后天加成</h4>
                  <div class="attributes-grid compact">
                    <div v-for="(value, key) in acquiredAttributes" :key="key" class="attribute-item acquired" 
                         :class="{ 'has-bonus': value > 0 }">
                      <span class="attr-name">{{ key }}</span>
                      <span class="attr-value">{{ value > 0 ? `+${value}` : value }}</span>
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
                <div class="technique-header" @click="toggleTechniqueDetails">
                  <div class="technique-main">
                    <h4 class="technique-name" :class="getItemQualityClass(cultivationData.功法, 'text')">
                      {{ cultivationData.功法.名称 }}
                    </h4>
                    <div class="technique-quality">
                      {{ cultivationData.功法.品质?.quality || '凡' }}品{{ cultivationData.功法.品质?.grade || 0 }}级
                    </div>
                  </div>
                  <div class="technique-toggle">
                    <ChevronDown 
                      :size="16" 
                      :class="{ 'rotated': showTechniqueDetails }"
                      class="toggle-icon"
                    />
                  </div>
                </div>
                
                <!-- 功法详情（可折叠） -->
                <div v-show="showTechniqueDetails" class="technique-details">
                  <div class="technique-description">
                    <p>{{ cultivationData.功法.描述 || '此功法奥妙无穷，随修炼加深方可领悟其真意。' }}</p>
                  </div>
                  
                  <div v-if="cultivationData.功法.功法效果" class="technique-effects">
                    <h5 class="effects-title">功法效果</h5>
                    <div class="effects-list">
                      <div v-if="cultivationData.功法.功法效果.修炼速度加成" class="effect-item">
                        <span class="effect-label">修炼加成：</span>
                        <span class="effect-value">{{ (cultivationData.功法.功法效果.修炼速度加成 * 100).toFixed(0) }}%</span>
                      </div>
                      <div v-if="cultivationData.功法.功法效果.属性加成" class="effect-item">
                        <span class="effect-label">属性提升：</span>
                        <div class="attribute-bonuses">
                          <span 
                            v-for="(value, attr) in cultivationData.功法.功法效果.属性加成" 
                            :key="attr"
                            class="bonus-tag"
                          >
                            {{ attr }} +{{ value }}
                          </span>
                        </div>
                      </div>
                    </div>
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
              <div v-if="cultivationData.已解锁技能?.length || skillsList.length" class="learned-skills">
                <div class="skills-header" @click="toggleSkillsDetails">
                  <h4 class="skills-title">已掌握技能</h4>
                  <div class="skills-count">({{ totalSkillsCount }}个)</div>
                  <ChevronDown 
                    :size="14" 
                    :class="{ 'rotated': showSkillsDetails }"
                    class="toggle-icon"
                  />
                </div>
                
                <div v-show="!showSkillsDetails" class="skills-preview">
                  <div class="skills-list-compact">
                    <span 
                      v-for="skill in (cultivationData.已解锁技能 || []).slice(0, 3)" 
                      :key="skill" 
                      class="skill-tag compact"
                    >
                      {{ skill }}
                    </span>
                    <span 
                      v-for="skill in skillsList.slice(0, 3 - (cultivationData.已解锁技能?.length || 0))" 
                      :key="skill.name" 
                      class="skill-tag compact"
                    >
                      {{ skill.name }}
                    </span>
                    <span v-if="totalSkillsCount > 3" class="more-skills">...</span>
                  </div>
                </div>
                
                <div v-show="showSkillsDetails" class="skills-details">
                  <!-- 从功法直接学会的技能 -->
                  <div v-if="cultivationData.已解锁技能?.length" class="skill-category">
                    <h5 class="category-title">修炼习得</h5>
                    <div class="skills-grid">
                      <div 
                        v-for="skillName in cultivationData.已解锁技能" 
                        :key="skillName"
                        class="skill-card"
                        @click="showSkillDetails(skillName)"
                      >
                        <div class="skill-name">{{ skillName }}</div>
                        <div class="skill-source">功法修炼</div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- 从功法定义中学会的技能 -->
                  <div v-if="skillsList.length" class="skill-category">
                    <h5 class="category-title">功法传承</h5>
                    <div class="skills-grid">
                      <div 
                        v-for="skill in skillsList" 
                        :key="skill.name"
                        class="skill-card"
                        :class="{ 'skill-locked': !skill.unlocked }"
                        @click="showSkillDetails(skill)"
                      >
                        <div class="skill-name">{{ skill.name }}</div>
                        <div class="skill-type">{{ skill.type }}</div>
                        <div class="skill-unlock" v-if="!skill.unlocked">
                          {{ skill.unlockCondition }}
                        </div>
                        <div class="skill-status" v-else>
                          <Star :size="12" class="unlock-icon" />
                        </div>
                      </div>
                    </div>
                  </div>
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
              <div class="dao-header-section">
                <div class="dao-summary">
                  <span class="dao-count">已解锁 {{ daoData.已解锁大道.length }} 条大道</span>
                  <button class="dao-expand-btn" @click="toggleDaoDetails">
                    <span>{{ showDaoDetails ? '收起' : '展开' }}</span>
                    <ChevronDown 
                      :size="14" 
                      :class="{ 'rotated': showDaoDetails }"
                      class="toggle-icon"
                    />
                  </button>
                </div>
              </div>

              <div v-show="!showDaoDetails" class="dao-preview">
                <div 
                  v-for="daoName in daoData.已解锁大道.slice(0, 2)" 
                  :key="daoName" 
                  class="dao-item compact"
                  @click="showDaoInfo(daoName)"
                >
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
                <div v-if="daoData.已解锁大道.length > 2" class="more-dao">
                  还有 {{ daoData.已解锁大道.length - 2 }} 条大道...
                </div>
              </div>

              <div v-show="showDaoDetails" class="dao-details">
                <div 
                  v-for="daoName in daoData.已解锁大道" 
                  :key="daoName" 
                  class="dao-item detailed"
                  @click="showDaoInfo(daoName)"
                >
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
                  
                  <div class="dao-stats">
                    <div class="stat-item">
                      <span class="stat-label">当前经验</span>
                      <span class="stat-value">{{ getDaoCurrentExp(daoName) }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">总经验</span>
                      <span class="stat-value">{{ getDaoTotalExp(daoName) }}</span>
                    </div>
                  </div>
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
                    <span class="stone-count">{{ getSpiritStoneCount(grade.name as '下品' | '中品' | '上品' | '极品') }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 宗门信息 -->
          <div class="info-section" v-if="playerStatus?.宗门信息">
            <h3 class="section-title">
              <div class="title-icon">
                <Mountain :size="18" />
              </div>
              宗门信息
            </h3>
            <div class="sect-info">
              <div class="sect-header">
                <h4 class="sect-name">{{ playerStatus?.宗门信息?.name }}</h4>
                <span class="sect-type">{{ playerStatus?.宗门信息?.type }}</span>
              </div>
              <div class="sect-details">
                <div class="detail-row">
                  <span class="detail-label">职位</span>
                  <span class="detail-value">{{ playerStatus?.宗门信息?.position }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">贡献度</span>
                  <span class="detail-value">{{ playerStatus?.宗门信息?.contribution }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">关系</span>
                  <span class="detail-value" :class="`relationship-${playerStatus?.宗门信息?.relationship}`">
                    {{ playerStatus?.宗门信息?.relationship }}
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
import { debug } from '@/utils/debug';
import { calculateFinalAttributes } from '@/utils/attributeCalculation';
import type { DaoProgress, Item, SkillInfo, InnateAttributes } from '@/types/game.d.ts';
import { 
  AlertCircle, Heart, Sparkles, Sword, Star, BarChart3, BookOpen, 
  Zap, Users, Backpack, Mountain, Bird, Sprout, Handshake, ChevronDown 
} from 'lucide-vue-next';

const characterStore = useCharacterStore();
const isLoading = ref(false);

// 界面状态
const showTechniqueDetails = ref(false);
const showSkillsDetails = ref(false);
const showDaoDetails = ref(false);

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

// 默认六司属性结构
const defaultAttributes: InnateAttributes = {
  根骨: 0,
  灵性: 0,
  悟性: 0,
  气运: 0,
  魅力: 0,
  心性: 0
};

// 获取完整的先天六司（含默认值）
const innateAttributesWithDefaults = computed((): InnateAttributes => {
  const innate = baseInfo.value?.先天六司 || {} as Partial<InnateAttributes>;
  return {
    根骨: innate.根骨 ?? 0,
    灵性: innate.灵性 ?? 0,
    悟性: innate.悟性 ?? 0,
    气运: innate.气运 ?? 0,
    魅力: innate.魅力 ?? 0,
    心性: innate.心性 ?? 0
  };
});

// 属性计算
const finalAttributes = computed((): InnateAttributes => {
  if (!saveData.value) return innateAttributesWithDefaults.value;
  const result = calculateFinalAttributes(innateAttributesWithDefaults.value, saveData.value);
  return result?.最终六司 || innateAttributesWithDefaults.value;
});

const acquiredAttributes = computed((): InnateAttributes => {
  if (!saveData.value) return defaultAttributes;
  const result = calculateFinalAttributes(innateAttributesWithDefaults.value, saveData.value);
  return result?.后天六司 || defaultAttributes;
});

const hasAcquiredBonus = computed(() => {
  return Object.values(acquiredAttributes.value).some(value => value > 0);
});

// 技能相关计算属性
const skillsList = computed((): SkillInfo[] => {
  if (!cultivationData.value.功法?.功法技能) return [];
  
  const technique = cultivationData.value.功法;
  if (!technique?.功法技能) return [];

  const currentProgress = cultivationData.value.熟练度 || 0;
  const skills: SkillInfo[] = [];
  
  for (const [skillName, skillInfo] of Object.entries(technique.功法技能)) {
    const unlockCondition = skillInfo.解锁条件;
    let unlocked = false;
    
    // 简单的解锁条件判断
    if (unlockCondition.includes('修炼进度')) {
      const requiredProgress = parseInt(unlockCondition.match(/\d+/)?.[0] || '0');
      unlocked = (technique.修炼进度 || 0) >= requiredProgress;
    } else if (unlockCondition.includes('熟练度')) {
      const requiredProgress = parseInt(unlockCondition.match(/\d+/)?.[0] || '0');
      unlocked = currentProgress >= requiredProgress;
    }
    
    skills.push({
      name: skillName,
      description: skillInfo.技能描述,
      type: skillInfo.技能类型,
      unlockCondition,
      unlocked
    });
  }
  
  return skills;
});

const totalSkillsCount = computed(() => {
  return (cultivationData.value.已解锁技能?.length || 0) + skillsList.value.length;
});

// 装备槽位
const equipmentSlots = computed((): { name: string; item: Item | null }[] => {
  const equipment = saveData.value?.装备栏;
  const inventory = saveData.value?.背包?.物品;

  const slotNames = ['法宝1', '法宝2', '法宝3', '法宝4', '法宝5', '法宝6'];

  if (!equipment || !inventory) {
    return slotNames.map(name => ({ name, item: null }));
  }

  return slotNames.map(slotKey => {
    const key = slotKey as keyof typeof equipment;
    const itemId = equipment[key];
    const item = itemId ? (inventory[itemId] || null) : null;
    return { name: slotKey, item };
  });
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

const getItemQualityClass = (item: Item | null, type: 'border' | 'text' = 'border'): string => {
  if (!item) return '';
  const quality = item.品质?.quality || '凡';
  return `${type}-quality-${quality}`;
};

const getDaoStage = (daoName: string): number => {
  const progress = (daoData.value.大道进度 as Record<string, DaoProgress>)?.[daoName];
  return progress?.当前阶段 || 0;
};

const getDaoProgress = (daoName: string): number => {
  const progress = (daoData.value.大道进度 as Record<string, DaoProgress>)?.[daoName];
  if (!progress) return 0;
  const currentExp = progress.当前经验 || 0;
  const stage = progress.当前阶段 || 0;
  const nextStageExp = (stage + 1) * 100;
  return Math.min(100, Math.round((currentExp / nextStageExp) * 100));
};

const getDaoCurrentExp = (daoName: string): number => {
  const progress = (daoData.value.大道进度 as Record<string, DaoProgress>)?.[daoName];
  return progress?.当前经验 || 0;
};

const getDaoTotalExp = (daoName: string): number => {
  const progress = (daoData.value.大道进度 as Record<string, DaoProgress>)?.[daoName];
  return progress?.总经验 || 0;
};

const getItemTypeCount = (type: string): number => {
  const items = saveData.value?.背包?.物品 || {};
  return Object.values(items).filter((item: Item) => item.类型 === type).length;
};

const getSpiritStoneCount = (grade: '下品' | '中品' | '上品' | '极品'): number => {
  return saveData.value?.背包?.灵石?.[grade] || 0;
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

// 界面交互方法
const toggleTechniqueDetails = () => {
  showTechniqueDetails.value = !showTechniqueDetails.value;
};

const toggleSkillsDetails = () => {
  showSkillsDetails.value = !showSkillsDetails.value;
};

const toggleDaoDetails = () => {
  showDaoDetails.value = !showDaoDetails.value;
};

const showDaoInfo = (daoName: string) => {
  const progress = (daoData.value.大道进度 as Record<string, DaoProgress>)?.[daoName];
  if (!progress) {
    alert(`大道：${daoName}\n\n状态：已解锁\n当前进度：初始阶段\n说明：此大道已解锁，但尚未开始修炼。`);
    return;
  }
  
  const stage = progress.当前阶段 || 0;
  const currentExp = progress.当前经验 || 0;
  const totalExp = progress.总经验 || 0;
  const progressPercent = getDaoProgress(daoName);
  
  alert(`${daoName}\n\n当前阶段：第${stage}阶段\n当前经验：${currentExp}\n总经验：${totalExp}\n进度：${progressPercent}%\n\n修炼感悟：此道深奥玄妙，需持之以恒方能有所成就。`);
};

const showSkillDetails = (skill: SkillInfo | string) => {
  if (typeof skill === 'string') {
    // 简单技能名称
    alert(`技能：${skill}\n\n来源：功法修炼\n说明：通过修炼功法获得的技能`);
  } else {
    // 详细技能信息
    const status = skill.unlocked ? '已解锁' : '未解锁';
    const condition = skill.unlocked ? '修炼完成' : skill.unlockCondition;
    alert(`${skill.name}\n\n类型：${skill.type}\n状态：${status}\n条件：${condition}\n\n${skill.description}`);
  }
};

const refreshData = async () => {
  isLoading.value = true;
  try {
    await characterStore.syncFromTavern();
  } catch (error) {
    debug.error('人物详情', '刷新数据失败', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  debug.log('人物详情', '组件挂载，同步数据');
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
  white-space: nowrap;
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
  min-height: 44px;
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
  background: rgba(var(--color-border-rgb), 0.1);
}

.attribute-item.acquired.has-bonus {
  background: rgba(var(--color-success-rgb), 0.1);
  border: 1px solid rgba(var(--color-success-rgb), 0.2);
}

.attr-name {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.attr-value {
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
}

.attribute-item.acquired.has-bonus .attr-value {
  color: var(--color-success);
}

.attribute-breakdown {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* 功法系统交互样式 */
.technique-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.technique-header:hover {
  background: var(--color-surface-hover);
}

.technique-main {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.technique-toggle {
  margin-left: 12px;
}

.toggle-icon {
  transition: transform 0.3s ease;
  color: var(--color-text-secondary);
}

.toggle-icon.rotated {
  transform: rotate(180deg);
}

.technique-details {
  margin-top: 12px;
  padding: 16px;
  background: var(--color-surface-light);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.technique-description {
  margin-bottom: 16px;
}

.technique-description p {
  margin: 0;
  color: var(--color-text);
  line-height: 1.6;
  font-style: italic;
}

.technique-effects {
  border-top: 1px solid var(--color-border);
  padding-top: 12px;
}

.effects-title {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.effects-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.effect-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}

.effect-label {
  color: var(--color-text-secondary);
  min-width: 80px;
}

.effect-value {
  color: var(--color-success);
  font-weight: 600;
}

.attribute-bonuses {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.bonus-tag {
  padding: 2px 6px;
  background: rgba(var(--color-success-rgb), 0.1);
  color: var(--color-success);
  border-radius: 4px;
  font-size: 0.75rem;
  border: 1px solid rgba(var(--color-success-rgb), 0.3);
}

/* 技能系统样式 */
.skills-header {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.skills-header:hover {
  background: var(--color-surface-hover);
}

.skills-count {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  margin-left: auto;
}

.skills-preview {
  margin-top: 12px;
}

.skills-list-compact {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.skill-tag.compact {
  padding: 4px 8px;
  font-size: 0.8rem;
}

.more-skills {
  color: var(--color-text-secondary);
  font-style: italic;
  font-size: 0.8rem;
  padding: 4px 8px;
}

.skills-details {
  margin-top: 16px;
  padding: 16px;
  background: var(--color-surface-light);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.skill-category {
  margin-bottom: 20px;
}

.skill-category:last-child {
  margin-bottom: 0;
}

.category-title {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-primary);
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(var(--color-primary-rgb), 0.2);
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.skill-card {
  padding: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.skill-card:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.1);
}

.skill-card.skill-locked {
  opacity: 0.6;
  border-color: var(--color-border);
  border-style: dashed;
}

.skill-card.skill-locked:hover {
  border-color: var(--color-warning);
}

.skill-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text);
  margin-bottom: 4px;
}

.skill-type {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.skill-source {
  font-size: 0.75rem;
  color: var(--color-accent);
  font-style: italic;
}

.skill-unlock {
  font-size: 0.75rem;
  color: var(--color-warning);
  font-style: italic;
}

.skill-status {
  display: flex;
  align-items: center;
  gap: 4px;
}

.unlock-icon {
  color: var(--color-success);
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
  cursor: pointer;
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
  gap: 12px;
}

.dao-header-section {
  margin-bottom: 12px;
}

.dao-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.dao-count {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.dao-expand-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid var(--color-border);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.dao-expand-btn:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.dao-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dao-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dao-item {
  padding: 12px;
  background: var(--color-surface-light);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.2s ease;
}

.dao-item:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.1);
}

.dao-item.compact {
  padding: 8px 10px;
}

.dao-item.detailed {
  padding: 16px;
}

.more-dao {
  padding: 8px 12px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  font-style: italic;
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  background: var(--color-surface-light);
}

.dao-stats {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(var(--color-border-rgb), 0.5);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.dao-stats .stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.dao-stats .stat-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}

.dao-stats .stat-value {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
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
    gap: 16px;
  }
  
  .right-column {
    grid-template-columns: 1fr;
  }
  
  .attributes-grid {
    grid-template-columns: 1fr;
  }
  
  .attributes-grid.compact {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  
  .attribute-breakdown {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .equipment-grid {
    grid-template-columns: 1fr;
  }
  
  .stones-grid {
    grid-template-columns: 1fr;
  }
  
  .relationship-stats {
    grid-template-columns: 1fr;
  }
  
  /* 确保文字不会换行 */
  .attr-name, .attr-value {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .attribute-item {
    min-height: 40px;
    padding: 8px 10px;
  }
}

@media (max-width: 480px) {
  .avatar-circle {
    width: 60px;
    height: 60px;
    font-size: 2rem;
  }
  
  .character-name {
    font-size: 1.5rem;
  }
  
  .attributes-grid.compact {
    grid-template-columns: 1fr;
  }
  
  .attribute-item {
    padding: 8px;
    min-height: 36px;
  }
  
  .attr-name {
    font-size: 0.85rem;
  }
  
  .attr-value {
    font-size: 0.9rem;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>