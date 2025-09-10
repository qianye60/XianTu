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
            <div class="stat-display">
              <span class="stat-value reputation">{{ playerStatus?.声望 || 0 }}</span>
            </div>
          </div>
          <div class="stat-item">
            <span class="stat-label">修为</span>
            <div class="stat-display cultivation">
              <div class="cultivation-bar">
                <div class="cultivation-progress" :style="{ width: getCultivationProgress() + '%' }"></div>
              </div>
              <span class="cultivation-text">{{ playerStatus?.修为?.当前 || 0 }}/{{ playerStatus?.修为?.最大 || 100 }}</span>
            </div>
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
                      <div class="progress-fill" :style="{ width: Math.max(2, cultivationData.功法.修炼进度 || 0) + '%' }"></div>
                    </div>
                    <span class="progress-text">{{ cultivationData.功法.修炼进度 || 0 }}%</span>
                  </div>
                  <div class="progress-item">
                    <span class="progress-label">熟练度</span>
                    <div class="progress-bar">
                      <div class="progress-fill" :style="{ width: Math.max(2, cultivationData.熟练度 || 0) + '%' }"></div>
                    </div>
                    <span class="progress-text">{{ cultivationData.熟练度 || 0 }}%</span>
                  </div>
                </div>
              </div>

              <!-- 已学技能 -->
              <div v-if="cultivationData.已解锁技能?.length || allLearnedSkills.length" class="learned-skills">
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
                      v-for="skill in allLearnedSkills.slice(0, 3)"
                      :key="skill.name"
                      class="skill-tag compact"
                    >
                      {{ skill.name }}
                    </span>
                    <span v-if="totalSkillsCount > 3" class="more-skills">...</span>
                  </div>
                </div>

                <div v-show="showSkillsDetails" class="skills-details">
                  <!-- 所有已掌握的技能 -->
                  <div v-if="allLearnedSkills.length" class="skill-category">
                    <h5 class="category-title">所有技能</h5>
                    <div class="skills-grid">
                      <div
                        v-for="skill in allLearnedSkills"
                        :key="skill.name"
                        class="skill-card"
                        @click="showSkillDetails(skill)"
                      >
                        <div class="skill-name">{{ skill.name }}</div>
                        <div class="skill-type">{{ skill.type }}</div>
                        <div class="skill-source">{{ skill.source }}</div>
                        <div class="skill-proficiency-mini">
                          熟练度: {{ skill.proficiency }}%
                        </div>
                        <div class="skill-status">
                          <Star :size="12" class="unlock-icon" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 未解锁的功法技能 -->
                  <div v-if="skillsList.some(s => !s.unlocked)" class="skill-category">
                    <h5 class="category-title">未解锁技能</h5>
                    <div class="skills-grid">
                      <div
                        v-for="skill in skillsList.filter(s => !s.unlocked)"
                        :key="skill.name"
                        class="skill-card skill-locked"
                        @click="showSkillDetails(skill)"
                      >
                        <div class="skill-name">{{ skill.name }}</div>
                        <div class="skill-type">{{ skill.type }}</div>
                        <div class="skill-unlock">
                          {{ skill.unlockCondition }}
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
                <h4 class="sect-name">{{ playerStatus?.宗门信息?.sectName }}</h4>
                <span class="sect-type">{{ playerStatus?.宗门信息?.sectType }}</span>
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

    <!-- 技能详情弹窗 -->
    <div v-if="showSkillModal" class="modal-overlay" @click="closeModals">
      <div class="skill-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ getSkillModalContent()?.name }}</h3>
          <button class="modal-close-btn" @click="closeModals">
            <X :size="20" />
          </button>
        </div>
        <div class="modal-content">
          <div class="skill-detail-grid">
            <div class="skill-detail-item">
              <span class="detail-label">类型</span>
              <span class="detail-value">{{ getSkillModalContent()?.type }}</span>
            </div>
            <div class="skill-detail-item">
              <span class="detail-label">状态</span>
              <span class="detail-value" :class="`status-${getSkillModalContent()?.status === '已解锁' ? 'unlocked' : 'locked'}`">
                {{ getSkillModalContent()?.status }}
              </span>
            </div>
            <div class="skill-detail-item">
              <span class="detail-label">熟练度</span>
              <span class="detail-value">{{ getSkillModalContent()?.proficiency ? getSkillModalContent()?.proficiency + '%' : '未知' }}</span>
            </div>
            <div class="skill-detail-item">
              <span class="detail-label">解锁条件</span>
              <span class="detail-value">{{ getSkillModalContent()?.condition }}</span>
            </div>
            <div class="skill-detail-item">
              <span class="detail-label">技能来源</span>
              <span class="detail-value">{{ getSkillModalContent()?.source }}</span>
            </div>
          </div>
          <div class="skill-description">
            <h4>技能描述</h4>
            <p>{{ getSkillModalContent()?.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 大道详情弹窗 -->
    <div v-if="showDaoModal" class="modal-overlay" @click="closeModals">
      <div class="dao-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ getDaoModalContent()?.name }}</h3>
          <button class="modal-close-btn" @click="closeModals">
            <X :size="20" />
          </button>
        </div>
        <div class="modal-content">
          <div class="dao-progress-section">
            <div class="dao-stage-info">
              <span class="stage-label">当前阶段</span>
              <span class="stage-value">{{ getDaoModalContent()?.stage }}</span>
            </div>
            <div class="dao-progress-bar">
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" :style="{ width: (getDaoModalContent()?.progressPercent || 0) + '%' }"></div>
              </div>
              <span class="progress-text">{{ getDaoModalContent()?.progressPercent }}%</span>
            </div>
          </div>
          <div class="dao-stats-grid">
            <div class="dao-stat-item">
              <span class="stat-label">当前经验</span>
              <span class="stat-value">{{ getDaoModalContent()?.currentExp }}</span>
            </div>
            <div class="dao-stat-item">
              <span class="stat-label">总经验</span>
              <span class="stat-value">{{ getDaoModalContent()?.totalExp }}</span>
            </div>
          </div>
          <div class="dao-description">
            <h4>修炼感悟</h4>
            <p>{{ getDaoModalContent()?.description }}</p>
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
  AlertCircle, Heart, Sparkles, Star, BarChart3, BookOpen,
  Zap, Users, Backpack, Mountain, Bird, Sprout, Handshake, ChevronDown, X
} from 'lucide-vue-next';

const characterStore = useCharacterStore();
const isLoading = ref(false);

// 界面状态
const showTechniqueDetails = ref(false);
const showSkillsDetails = ref(false);
const showDaoDetails = ref(false);
const showSkillModal = ref(false);
const showDaoModal = ref(false);
const selectedSkill = ref<SkillInfo | string | null>(null);
const selectedDao = ref<string | null>(null);

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
      color: 'red'
    },
    {
      label: '灵气',
      current: playerStatus.value.灵气?.当前 || 0,
      max: playerStatus.value.灵气?.最大 || 1,
      color: 'blue'
    },
    {
      label: '神识',
      current: playerStatus.value.神识?.当前 || 0,
      max: playerStatus.value.神识?.最大 || 1,
      color: 'gold'
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
  const technique = cultivationData.value.功法;
  const cultivationInfo = cultivationData.value;

  if (!technique?.功法技能) return [];

  const skills: SkillInfo[] = [];

  for (const [skillName, skillInfo] of Object.entries(technique.功法技能)) {
    // 检查是否已解锁
    const unlocked = checkSkillUnlocked(skillName, technique, cultivationInfo);

    skills.push({
      name: skillName,
      description: skillInfo.技能描述,
      type: skillInfo.技能类型,
      unlockCondition: skillInfo.解锁条件,
      unlocked
    });
  }

  return skills;
});

// 已学技能（所有已掌握的技能）
const allLearnedSkills = computed(() => {
  const technique = cultivationData.value.功法;
  const cultivationInfo = cultivationData.value;

  if (!technique && !cultivationInfo?.已解锁技能?.length) return [];

  const skills: any[] = [];
  const skillNameSet = new Set(); // 防止重复添加技能

  // 从已解锁技能获取（直接学会的技能）
  if (cultivationInfo?.已解锁技能?.length) {
    cultivationInfo.已解锁技能.forEach(skillName => {
      if (!skillNameSet.has(skillName)) {
        skillNameSet.add(skillName);
        skills.push({
          name: skillName,
          proficiency: getPersistentProficiency(skillName, 'direct'),
          source: '修炼习得',
          type: '主动技能',
          description: '通过修炼功法直接掌握的技能',
          unlocked: true
        });
      }
    });
  }

  // 从功法技能定义获取（达到条件解锁的技能）
  if (technique?.功法技能) {
    Object.entries(technique.功法技能).forEach(([skillName, skillInfo]) => {
      if (!skillNameSet.has(skillName)) {
        // 检查是否已解锁
        const unlocked = checkSkillUnlocked(skillName, technique, cultivationInfo);
        if (unlocked) {
          skillNameSet.add(skillName);
          skills.push({
            name: skillName,
            proficiency: getPersistentProficiency(skillName, 'technique'),
            source: '功法传承',
            type: skillInfo.技能类型 || '主动技能',
            description: skillInfo.技能描述 || '通过功法修炼掌握的技能',
            unlocked: true
          });
        }
      }
    });
  }

  return skills;
});

// 获取持久化的熟练度（根据技能名和来源生成固定熟练度）
const getPersistentProficiency = (skillName: string, source: string): number => {
  // 使用技能名和来源生成一个固定的种子
  const seed = skillName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + source.length;
  // 基于种子生成 30-95 之间的固定值
  return 30 + (seed % 66);
};

// 检查技能是否已解锁
const checkSkillUnlocked = (skillName: string, technique: any, cultivationInfo: any): boolean => {
  if (!technique.功法技能?.[skillName]) return false;

  const skillInfo = technique.功法技能[skillName];
  const unlockCondition = skillInfo.解锁条件 || '';

  // 解析解锁条件
  if (unlockCondition.includes('修炼进度达到')) {
    const match = unlockCondition.match(/修炼进度达到(\d+)%/);
    const requiredProgress = parseInt(match?.[1] || '0');
    return (technique.修炼进度 || 0) >= requiredProgress;
  }

  if (unlockCondition.includes('熟练度达到')) {
    const match = unlockCondition.match(/熟练度达到(\d+)%/);
    const requiredProficiency = parseInt(match?.[1] || '0');
    return (cultivationInfo.熟练度 || 0) >= requiredProficiency;
  }

  if (unlockCondition.includes('突破次数')) {
    const match = unlockCondition.match(/突破次数达到(\d+)/);
    const requiredBreakthroughs = parseInt(match?.[1] || '0');
    return (cultivationInfo.突破次数 || 0) >= requiredBreakthroughs;
  }

  // 如果没有明确条件，默认已解锁
  return true;
};

const totalSkillsCount = computed(() => {
  return allLearnedSkills.value.length;
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
const getCultivationProgress = (): number => {
  const current = playerStatus.value?.修为?.当前 || 0;
  const max = playerStatus.value?.修为?.最大 || 100;
  return Math.round((current / max) * 100);
};

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
  selectedDao.value = daoName;
  showDaoModal.value = true;
};

const showSkillDetails = (skill: SkillInfo | string) => {
  selectedSkill.value = skill;
  showSkillModal.value = true;
};

const closeModals = () => {
  showSkillModal.value = false;
  showDaoModal.value = false;
  selectedSkill.value = null;
  selectedDao.value = null;
};

const getDaoModalContent = () => {
  if (!selectedDao.value) return null;

  const progress = (daoData.value.大道进度 as Record<string, DaoProgress>)?.[selectedDao.value];
  if (!progress) {
    return {
      name: selectedDao.value,
      stage: '初始阶段',
      currentExp: 0,
      totalExp: 0,
      progressPercent: 0,
      description: '此大道已解锁，但尚未开始修炼。'
    };
  }

  const stage = progress.当前阶段 || 0;
  const currentExp = progress.当前经验 || 0;
  const totalExp = progress.总经验 || 0;
  const progressPercent = getDaoProgress(selectedDao.value);

  return {
    name: selectedDao.value,
    stage: `第${stage}阶段`,
    currentExp,
    totalExp,
    progressPercent,
    description: '此道深奥玄妙，需持之以恒方能有所成就。'
  };
};

const getSkillModalContent = () => {
  if (!selectedSkill.value) return null;

  // 处理已掌握技能
  if (typeof selectedSkill.value === 'object' && 'proficiency' in selectedSkill.value) {
    const skill = selectedSkill.value as any;
    return {
      name: skill.name,
      type: skill.type,
      status: '已解锁',
      condition: '已掌握',
      description: skill.description,
      source: skill.source,
      proficiency: skill.proficiency
    };
  }

  // 处理字符串技能名（向后兼容）
  if (typeof selectedSkill.value === 'string') {
    return {
      name: selectedSkill.value,
      type: '功法技能',
      status: '已解锁',
      condition: '修炼完成',
      description: '通过修炼功法获得的技能',
      source: '功法修炼'
    };
  }

  // 处理功法技能对象
  const skill = selectedSkill.value as SkillInfo;
  return {
    name: skill.name,
    type: skill.type,
    status: skill.unlocked ? '已解锁' : '未解锁',
    condition: skill.unlocked ? '修炼完成' : skill.unlockCondition,
    description: skill.description,
    source: '功法传承'
  };
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

/* 角色头部信息优化 */
.character-header {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 32px;
  background: linear-gradient(135deg, var(--color-surface), rgba(var(--color-primary-rgb), 0.05));
  border-bottom: 2px solid var(--color-border);
  position: relative;
  overflow: hidden;
}

.character-header::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 200px;
  height: 100%;
  background: linear-gradient(45deg, transparent, rgba(var(--color-primary-rgb), 0.1), transparent);
  pointer-events: none;
}

.character-avatar {
  position: relative;
}

.avatar-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  font-weight: bold;
  color: white;
  box-shadow: 0 8px 24px rgba(var(--color-primary-rgb), 0.4);
  border: 4px solid rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
}

.avatar-circle::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transform: rotate(45deg);
  animation: avatar-shine 3s ease-in-out infinite;
}

@keyframes avatar-shine {
  0%, 100% { transform: rotate(45deg) translateX(-200%); }
  50% { transform: rotate(45deg) translateX(200%); }
}

.gender-女 .avatar-circle {
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-hover));
  box-shadow: 0 8px 24px rgba(var(--color-accent-rgb), 0.4);
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
  gap: 20px;
  min-width: 120px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary);
}

.stat-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value.reputation {
  color: var(--color-warning);
  text-shadow: 0 1px 2px rgba(245, 158, 11, 0.3);
}

.stat-display.cultivation {
  width: 100%;
  min-width: 100px;
}

.cultivation-bar {
  width: 100%;
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.cultivation-progress {
  height: 100%;
  background: linear-gradient(90deg, var(--color-info), var(--color-success));
  border-radius: 4px;
  transition: width 0.5s ease;
  box-shadow: 0 1px 2px rgba(59, 130, 246, 0.3);
}

.cultivation-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-info);
  white-space: nowrap;
}

/* 内容网格 */
.content-grid {
  display: grid;
  grid-template-columns: 350px 1fr 320px;
  gap: 24px;
  padding: 24px;
}

/* 信息区块优化 */
.info-section {
  background: linear-gradient(135deg, var(--color-surface), rgba(var(--color-surface-rgb), 0.8));
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.info-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent), var(--color-success));
}

.info-section:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: rgba(var(--color-primary-rgb), 0.3);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 20px 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-text);
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(var(--color-border-rgb), 0.3);
  position: relative;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 40px;
  height: 2px;
  background: var(--color-primary);
  border-radius: 1px;
}

.title-icon {
  color: var(--color-primary);
  flex-shrink: 0;
  padding: 8px;
  background: rgba(var(--color-primary-rgb), 0.1);
  border-radius: 8px;
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

.bar-danger { background: linear-gradient(90deg, #dc2626, #ef4444); }
.bar-info { background: linear-gradient(90deg, #2563eb, #3b82f6); }
.bar-accent { background: linear-gradient(90deg, #f59e0b, #fbbf24); }

/* 生命状态颜色 - 红蓝金三色 */
.bar-red {
  background: linear-gradient(90deg, #dc2626, #ef4444);
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
}
.bar-blue {
  background: linear-gradient(90deg, #2563eb, #3b82f6);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
}
.bar-gold {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

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

.skill-proficiency-mini {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  margin-top: 4px;
  padding: 2px 4px;
  background: rgba(var(--color-info-rgb), 0.1);
  border-radius: 4px;
  width: fit-content;
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
  height: 12px; /* 增加高度让进度条更明显 */
  background: #e2e8f0; /* 使用更明显的背景色 */
  border: 1px solid #cbd5e1; /* 添加边框增强可见性 */
  border-radius: 6px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.1); /* 添加内阴影增强立体感 */
}

.progress-fill {
  height: 100%;
  min-width: 2px; /* 确保即使在0%时也有最小宽度显示 */
  background: linear-gradient(90deg, #22c55e, #3b82f6); /* 使用明确的绿蓝渐变 */
  transition: width 0.3s ease;
  border-radius: 4px; /* 稍微圆润的角 */
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

/* 自定义弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(8px);
  animation: overlay-fade-in 0.3s ease-out;
}

@keyframes overlay-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.skill-modal, .dao-modal {
  background: var(--color-surface);
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
  animation: modal-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

@keyframes modal-slide-up {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px 20px 28px;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(135deg, var(--color-surface-light), rgba(var(--color-primary-rgb), 0.05));
  position: relative;
}

.modal-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent), var(--color-success));
}

.modal-header h3 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text);
  background: linear-gradient(135deg, var(--color-text), var(--color-primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.modal-close-btn {
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  padding: 8px;
  border-radius: 10px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.3s ease;
}

.modal-close-btn:hover {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: white;
  transform: scale(1.1);
}

.modal-content {
  padding: 24px 28px 28px 28px;
  overflow-y: auto;
  max-height: calc(80vh - 80px);
}

/* 技能详情样式 */
.skill-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.skill-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--color-surface-light);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.skill-detail-item:hover {
  background: var(--color-surface-hover);
  border-color: rgba(var(--color-primary-rgb), 0.3);
}

.detail-label {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.detail-value {
  font-weight: 600;
  color: var(--color-text);
}

.status-unlocked {
  color: var(--color-success);
  background: rgba(var(--color-success-rgb), 0.1);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
}

.status-locked {
  color: var(--color-warning);
  background: rgba(var(--color-warning-rgb), 0.1);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
}

.skill-description {
  background: linear-gradient(135deg, var(--color-surface-light), rgba(var(--color-info-rgb), 0.05));
  border-radius: 12px;
  padding: 20px;
  border-left: 4px solid var(--color-info);
}

.skill-description h4 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-info);
}

.skill-description p {
  margin: 0;
  color: var(--color-text);
  line-height: 1.6;
  font-style: italic;
}

/* 大道详情样式 */
.dao-progress-section {
  margin-bottom: 20px;
  padding: 20px;
  background: linear-gradient(135deg, var(--color-surface-light), rgba(var(--color-success-rgb), 0.05));
  border-radius: 12px;
  border: 1px solid rgba(var(--color-success-rgb), 0.2);
}

.dao-stage-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.stage-label {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.stage-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-success);
  background: rgba(var(--color-success-rgb), 0.1);
  padding: 4px 12px;
  border-radius: 16px;
}

.dao-progress-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar-bg {
  flex: 1;
  height: 12px;
  background: var(--color-border);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-success), var(--color-info));
  border-radius: 6px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(var(--color-success-rgb), 0.4);
}

.progress-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-success);
  min-width: 45px;
  text-align: right;
}

.dao-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.dao-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: var(--color-surface-light);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  text-align: center;
  transition: all 0.2s ease;
}

.dao-stat-item:hover {
  background: var(--color-surface-hover);
  border-color: rgba(var(--color-primary-rgb), 0.3);
  transform: translateY(-2px);
}

.stat-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
  font-weight: 500;
}

.stat-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-primary);
}

.dao-description {
  background: linear-gradient(135deg, var(--color-surface-light), rgba(var(--color-warning-rgb), 0.05));
  border-radius: 12px;
  padding: 20px;
  border-left: 4px solid var(--color-warning);
}

.dao-description h4 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-warning);
}

.dao-description p {
  margin: 0;
  color: var(--color-text);
  line-height: 1.6;
  font-style: italic;
}

/* 响应式优化 */
@media (max-width: 768px) {
  .skill-detail-grid {
    grid-template-columns: 1fr;
  }

  .dao-stats-grid {
    grid-template-columns: 1fr;
  }

  .modal-content {
    padding: 20px 24px 24px 24px;
  }

  .modal-header {
    padding: 20px 24px 16px 24px;
  }

  .modal-header h3 {
    font-size: 1.2rem;
  }
}
</style>
