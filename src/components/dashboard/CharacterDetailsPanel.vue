<template>
  <div class="character-details-wrapper">
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载角色数据�?..</p>
    </div>

    <div v-else-if="!baseInfo || !saveData" class="error-container">
      <div class="error-icon">
        <AlertCircle :size="48" />
      </div>
      <p>无法加载角色数据</p>
      <button class="retry-btn" @click="refreshData">重试</button>
    </div>

    <div v-else class="character-details-content">
      <!-- 顶部角色基本信息（全新布局�?-->
      <div class="character-header header-modern">
        <div class="header-left">
          <div class="avatar-circle" :title="baseInfo.名字">
            <span class="avatar-initial">{{ nameInitial }}</span>
          </div>
          <div class="title-area">
            <h1 class="character-name">{{ baseInfo.名字 }}</h1>
            <div class="meta-chips">
              <span class="meta-chip realm-chip" :class="`realm-${playerStatus?.境界?.名称}`">
                {{ formatRealmDisplay(playerStatus?.境界?.名称, playerStatus?.境界?.等级) }}
              </span>
              <span class="meta-chip">{{ playerStatus?.寿命?.当前 }}�?/span>
              <span v-if="playerStatus?.位置?.描述" class="meta-chip">{{ getLocationName(playerStatus?.位置?.描述) }}</span>
            </div>
          </div>
        </div>
        <div class="header-right">
          <div class="reputation-badge" :title="'声望'">
            <span class="rep-label">声望</span>
            <span class="rep-value">{{ playerStatus?.声望 || 0 }}</span>
          </div>
          <div v-if="playerStatus?.境界?.名称 === '凡人'" class="cultivation-compact mortal">
            <span class="mortal-hint">等待仙缘</span>
          </div>
          <div v-else class="cultivation-compact">
            <span class="compact-label">修为</span>
            <div class="compact-bar" title="修为进度">
              <div class="compact-progress" :style="{ width: getCultivationProgress() + '%' }"></div>
            </div>
            <span class="compact-text">{{ playerStatus?.修为?.当前 || 0 }}/{{ playerStatus?.修为?.最�?|| 100 }}</span>
          </div>
        </div>
      </div>

      <!-- 主要内容区域 -->
      <div class="content-grid">
        <!-- 左侧�?-->
        <div class="left-column">
          <!-- 生命状�?-->
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <Heart :size="18" />
              </div>
              生命状�?            </h3>
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

          <!-- 天赋与灵�?-->
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <Sparkles :size="18" />
              </div>
              天赋与灵�?            </h3>
            <div class="talent-grid">
              <div class="talent-item">
                <span class="talent-label">天资等级</span>
                <span class="talent-value tier" :class="`tier-${baseInfo.天资}`">{{ baseInfo.天资 }}</span>
              </div>
              <div class="talent-item">
                <span class="talent-label">灵根属�?/span>
                <div class="spirit-root-display">
                  <span class="talent-value spirit-root" :class="`root-${getSpiritRootClass(baseInfo.灵根)}`">
                    {{ getSpiritRootDisplay(baseInfo.灵根) }}
                  </span>
                  <span v-if="getSpiritRootQuality(baseInfo.灵根)" class="spirit-root-quality" :class="`quality-${getSpiritRootQuality(baseInfo.灵根)}`">
                    {{ getSpiritRootQuality(baseInfo.灵根) }}
                  </span>
                  <div v-if="getSpiritRootDescription(baseInfo.灵根)" class="spirit-root-desc">
                    {{ getSpiritRootDescription(baseInfo.灵根) }}
                  </div>
                </div>
              </div>
              <div class="talent-list" v-if="getTalentList(baseInfo.天赋)?.length">
                <div class="talent-tags">
                  <div v-for="talent in getTalentList(baseInfo.天赋)" :key="talent.名称 || talent" class="talent-tag" :title="talent.描述">
                    {{ talent.名称 || talent }}
                    <div v-if="talent.描述" class="talent-description">
                      {{ talent.描述 }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 状态效�?-->
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <Star :size="18" />
              </div>
              状态效�?            </h3>
            <div v-if="!playerStatus?.状态效�?.length" class="empty-state">
              <div class="empty-icon">
                <Bird :size="32" />
              </div>
              <span>当前无状态效�?/span>
            </div>
            <div v-else class="effects-list">
              <div v-for="effect in playerStatus.状态效�? :key="effect.状态名�?
                   class="effect-item" :class="`effect-${effect.类型}`">
                <div class="effect-header">
                  <span class="effect-name">{{ effect.状态名�?}}</span>
                  <span class="effect-duration">{{ effect.时间 }}</span>
                </div>
                <div class="effect-description">{{ getCleanEffectDescription(effect) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 中间�?-->
        <div class="middle-column">
          <!-- 六司属�?-->
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <BarChart3 :size="18" />
              </div>
              六司属�?            </h3>
            <div class="attributes-display">
              <!-- 最终属�?-->
              <div class="final-attributes">
                <h4 class="attribute-group-title">最终六�?/h4>
                <div class="attributes-grid">
                  <div v-for="(value, key) in finalAttributes" :key="key" class="attribute-item final">
                    <span class="attr-name">{{ key }}</span>
                    <span class="attr-value">{{ value }}</span>
                  </div>
                </div>
              </div>

              <!-- 属性详�?-->
              <div class="attribute-breakdown">
                <div class="innate-attrs">
                  <h4 class="attribute-group-title">先天六司</h4>
                  <div class="attributes-grid compact">
                    <div v-for="(value, key) in innateAttributesWithDefaults" :key="key" class="attribute-item innate">
                      <span class="attr-name">{{ key }}</span>
                      <span class="attr-value">{{ value }}</span>
                    </div>
                  </div>
                </div>

                <div class="acquired-attrs">
                  <h4 class="attribute-group-title">后天六司</h4>
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
                      {{ cultivationData.功法.品质?.quality || '�? }}品{{ cultivationData.功法.品质?.grade || 0 }}�?                    </div>
                  </div>
                  <div class="technique-toggle">
                    <ChevronDown
                      :size="16"
                      :class="{ 'rotated': showTechniqueDetails }"
                      class="toggle-icon"
                    />
                  </div>
                </div>

                <!-- 功法详情（可折叠�?-->
                <div v-show="showTechniqueDetails" class="technique-details">
                  <div class="technique-description">
                    <p>{{ cultivationData.功法.描述 || '此功法奥妙无穷，随修炼加深方可领悟其真意�? }}</p>
                  </div>

                  <div v-if="cultivationData.功法.功法效果" class="technique-effects">
                    <h5 class="effects-title">功法效果</h5>
                    <div class="effects-list">
                      <div v-if="cultivationData.功法.功法效果.修炼速度加成" class="effect-item">
                        <span class="effect-label">修炼加成�?/span>
                        <span class="effect-value">{{ (cultivationData.功法.功法效果.修炼速度加成 * 100).toFixed(0) }}%</span>
                      </div>
                      <div v-if="cultivationData.功法.功法效果.属性加�? class="effect-item">
                        <span class="effect-label">属性提升：</span>
                        <div class="attribute-bonuses">
                          <span
                            v-for="(value, attr) in cultivationData.功法.功法效果.属性加�?
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
                    <span class="progress-label">熟练�?/span>
                    <div class="progress-bar">
                      <div class="progress-fill" :style="{ width: Math.max(2, cultivationData.熟练�?|| 0) + '%' }"></div>
                    </div>
                    <span class="progress-text">{{ cultivationData.熟练�?|| 0 }}%</span>
                  </div>
                </div>
              </div>

              <!-- 已学技�?-->
              <div v-if="cultivationData.已解锁技�?.length || allLearnedSkills.length" class="learned-skills">
                <div class="skills-header" @click="toggleSkillsDetails">
                  <h4 class="skills-title">已掌握技�?/h4>
                  <div class="skills-count">({{ totalSkillsCount }}�?</div>
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
                  <!-- 所有已掌握的技�?-->
                  <div v-if="allLearnedSkills.length" class="skill-category">
                    <h5 class="category-title">所有技�?/h5>
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
                          熟练�? {{ skill.proficiency }}%
                        </div>
                        <div class="skill-status">
                          <Star :size="12" class="unlock-icon" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 未解锁的功法技�?-->
                  <div v-if="skillsList.some(s => !s.unlocked)" class="skill-category">
                    <h5 class="category-title">未解锁技�?/h5>
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

        <!-- 右侧�?-->
        <div class="right-column">
          <!-- 三千大道 -->
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <Zap :size="18" />
              </div>
              三千大道
            </h3>
            <div v-if="!daoData.已解锁大�?.length" class="empty-state">
              <div class="empty-icon">
                <Sprout :size="32" />
              </div>
              <span>尚未解锁大道</span>
            </div>
            <div v-else class="dao-list">
              <div class="dao-header-section">
                <div class="dao-summary">
                  <span class="dao-count">已解�?{{ daoData.已解锁大�?length }} 条大�?/span>
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
                  v-for="daoName in daoData.已解锁大�?slice(0, 2)"
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
                <div v-if="daoData.已解锁大�?length > 2" class="more-dao">
                  还有 {{ daoData.已解锁大�?length - 2 }} 条大�?..
                </div>
              </div>

              <div v-show="showDaoDetails" class="dao-details">
                <div
                  v-for="daoName in daoData.已解锁大�?
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
                      <span class="stat-label">总经�?/span>
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
                  <span class="stat-label">总人�?/span>
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
                  <span class="detail-label">贡献�?/span>
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

    <!-- 技能详情弹�?-->
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
              <span class="detail-label">状�?/span>
              <span class="detail-value" :class="`status-${getSkillModalContent()?.status === '已解�? ? 'unlocked' : 'locked'}`">
                {{ getSkillModalContent()?.status }}
              </span>
            </div>
            <div class="skill-detail-item">
              <span class="detail-label">熟练�?/span>
              <span class="detail-value">{{ getSkillModalContent()?.proficiency ? getSkillModalContent()?.proficiency + '%' : '未知' }}</span>
            </div>
            <div class="skill-detail-item">
              <span class="detail-label">解锁条件</span>
              <span class="detail-value">{{ getSkillModalContent()?.condition }}</span>
            </div>
            <div class="skill-detail-item">
              <span class="detail-label">技能来�?/span>
              <span class="detail-value">{{ getSkillModalContent()?.source }}</span>
            </div>
          </div>
          <div class="skill-description">
            <h4>技能描�?/h4>
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
              <span class="stat-label">总经�?/span>
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
import type { DaoProgress, Item, SkillInfo, InnateAttributes, SaveData, StatusEffect, NpcProfile } from '@/types/game.d.ts';
import {
  AlertCircle, Heart, Sparkles, Star, BarChart3, BookOpen,
  Zap, Users, Backpack, Mountain, Bird, Sprout, Handshake, ChevronDown, X
} from 'lucide-vue-next';

const characterStore = useCharacterStore();
const isLoading = ref(false);

// 界面状�?const showTechniqueDetails = ref(false);
const showSkillsDetails = ref(false);
const showDaoDetails = ref(false);
const showSkillModal = ref(false);
const showDaoModal = ref(false);
const selectedSkill = ref<SkillInfo | LearnedSkillDisplay | string | null>(null);
const selectedDao = ref<string | null>(null);

// 基础数据
const baseInfo = computed(() => characterStore.activeCharacterProfile?.角色基础信息);
// 名字首字，用于头像占�?const nameInitial = computed(() => {
  const n = String(baseInfo.value?.名字 || '').trim();
  return n ? n.charAt(0) : '�?;
});
const playerStatus = computed(() => characterStore.activeSaveSlot?.存档数据?.玩家角色状�?;
const saveData = computed(() => characterStore.activeSaveSlot?.存档数据);

// 修炼功法数据
const cultivationData = computed(() => {
  return saveData.value?.修炼功法 || {
    功法: null,
    熟练�? 0,
    已解锁技�? [],
    修炼时间: 0,
    突破次数: 0
  };
});

// 三千大道数据
const daoData = computed(() => {
  return saveData.value?.三千大道 || {
    已解锁大�? [],
    大道进度: {}
  };
});

// 生命状态数�?- 统一使用vitals结构
const vitalsData = computed(() => {
  if (!playerStatus.value) return [];
  
  // 优先使用vitals结构，如果不存在则回退到旧的结�?  const vitals = playerStatus.value.vitals;
  if (vitals) {
    const safe = (n: unknown) => (typeof n === 'number' ? n : Number(n ?? 0)) || 0;
    const safeMax = (n: unknown) => {
      const v = (typeof n === 'number' ? n : Number(n || 0));
      return isNaN(v) ? 0 : Math.max(0, v);
    };
    return [
      {
        label: '气血',
        current: safe(vitals.qiBlood?.current),
        max: safeMax(vitals.qiBlood?.max),
        color: 'red'
      },
      {
        label: '灵气', 
        current: safe(vitals.lingQi?.current),
        max: safeMax(vitals.lingQi?.max),
        color: 'blue'
      },
      {
        label: '神识',
        current: safe(vitals.shenShi?.current),
        max: safeMax(vitals.shenShi?.max),
        color: 'gold'
      }
    ];
  }
  
  // 回退到旧的数据结�?  const safe = (n: unknown) => (typeof n === 'number' ? n : Number(n || 0)) || 0;
  const safeMax = (n: unknown) => {
    const v = (typeof n === 'number' ? n : Number(n || 0));
    return isNaN(v) ? 0 : Math.max(0, v);
  };
  return [
    {
      label: '气血',
      current: safe(playerStatus.value.气血?.当前),
      max: safeMax(playerStatus.value.气血?.最�?,
      color: 'red'
    },
    {
      label: '灵气',
      current: safe(playerStatus.value.灵气?.当前),
      max: safeMax(playerStatus.value.灵气?.最�?,
      color: 'blue'
    },
    {
      label: '神识',
      current: safe(playerStatus.value.神识?.当前),
      max: safeMax(playerStatus.value.神识?.最�?,
      color: 'gold'
    }
  ];
});

// 默认六司属性结�?const defaultAttributes: InnateAttributes = {
  根骨: 0,
  灵�? 0,
  悟�? 0,
  气运: 0,
  魅力: 0,
  心�? 0
};

// 获取完整的先天六司（含默认值）
const clamp0to10 = (n: unknown): number => {
  const v = typeof n === 'number' ? n : Number(n || 0);
  if (isNaN(v)) return 0;
  return Math.max(0, Math.min(10, Math.round(v)));
};

const innateAttributesWithDefaults = computed((): InnateAttributes => {
  const innate = baseInfo.value?.先天六司 || ({} as Partial<InnateAttributes>);
  return {
    根骨: clamp0to10(innate.根骨),
    灵�? clamp0to10(innate.灵�?,
    悟�? clamp0to10(innate.悟�?,
    气运: clamp0to10(innate.气运),
    魅力: clamp0to10(innate.魅力),
    心�? clamp0to10(innate.心�?
  };
});

// 属性计�?const finalAttributes = computed((): InnateAttributes => {
  if (!saveData.value) return innateAttributesWithDefaults.value;
  const result = calculateFinalAttributes(innateAttributesWithDefaults.value, saveData.value);
  return result?.最终六�?|| innateAttributesWithDefaults.value;
});

// 显示境界：凡人阶段不展示"第X�?层次，其它境界保留层�?function formatRealmDisplay(name?: string, level?: number): string {
  const realmName = name || '未知';
  if (realmName === '凡人') return realmName;
  if (typeof level === 'number' && level > 0) return `${realmName} �?{level}层`;
  return realmName;
}

// 提取位置名称：从描述中提取地名，去除多余的叙事内�?function getLocationName(description: string): string {
  if (!description) return '未知';
  
  // 尝试匹配常见的地名模�?  const patterns = [
    /^([^，�?]+[城镇村庄宗山峰谷洞府坊市])[，�?]/,  // 开头的地名 + 标点
    /([^，�?]*[城镇村庄宗山峰谷洞府坊市])/,          // 包含地名标识的词
    /^([^，�?]{2,8})[，�?]/,                      // 开头的短词�?  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // 如果没有匹配到，返回�?0个字�?  return description.substring(0, 10) + (description.length > 10 ? '...' : '');
}

const acquiredAttributes = computed((): InnateAttributes => {
  if (!saveData.value) return defaultAttributes;
  const result = calculateFinalAttributes(innateAttributesWithDefaults.value, saveData.value);
  return result?.后天六司 || defaultAttributes;
});

// 技能相关计算属�?const skillsList = computed((): SkillInfo[] => {
  const technique = cultivationData.value.功法;
  const cultivationInfo = cultivationData.value;

  if (!technique?.功法技�? return [];

  const skills: SkillInfo[] = [];

  for (const [skillName, skillInfo] of Object.entries(technique.功法技�?) {
    // 检查是否已解锁
    const unlocked = checkSkillUnlocked(skillName, technique, cultivationInfo);

    skills.push({
      name: skillName,
      description: skillInfo.技能描�?
      type: skillInfo.技能类�?
      unlockCondition: skillInfo.解锁条件,
      unlocked
    });
  }

  return skills;
});

// 已学技能（所有已掌握的技能）
type LearnedSkillDisplay = {
  name: string;
  type: string;
  source: string;
  proficiency: number;
  description?: string;
  unlocked: true;
};
const allLearnedSkills = computed(() => {
  const technique = cultivationData.value.功法;
  const cultivationInfo = cultivationData.value;

  if (!technique && !cultivationInfo?.已解锁技�?.length) return [];

  const skills: LearnedSkillDisplay[] = [];
  const skillNameSet = new Set(); // 防止重复添加技�?
  // 从已解锁技能获取（直接学会的技能）
  if (cultivationInfo?.已解锁技�?.length) {
    cultivationInfo.已解锁技�?forEach(skillName => {
      if (!skillNameSet.has(skillName)) {
        skillNameSet.add(skillName);
        skills.push({
          name: skillName,
          proficiency: getPersistentProficiency(skillName, 'direct'),
          source: '修炼习得',
          type: '主动技�?,
          description: '通过修炼功法直接掌握的技�?,
          unlocked: true
        });
      }
    });
  }

  // 从功法技能定义获取（达到条件解锁的技能）
  if (technique?.功法技�? {
    Object.entries(technique.功法技�?.forEach(([skillName, skillInfo]) => {
      if (!skillNameSet.has(skillName)) {
        // 检查是否已解锁
        const unlocked = checkSkillUnlocked(skillName, technique, cultivationInfo);
        if (unlocked) {
          skillNameSet.add(skillName);
          skills.push({
            name: skillName,
            proficiency: getPersistentProficiency(skillName, 'technique'),
            source: '功法传承',
            type: skillInfo.技能类�?|| '主动技�?,
            description: skillInfo.技能描�?|| '通过功法修炼掌握的技�?,
            unlocked: true
          });
        }
      }
    });
  }

  return skills;
});

// 获取持久化的熟练度（根据技能名和来源生成固定熟练度�?const getPersistentProficiency = (skillName: string, source: string): number => {
  // 使用技能名和来源生成一个固定的种子
  const seed = skillName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + source.length;
  // 基于种子生成 30-95 之间的固定�?  return 30 + (seed % 66);
};

// 检查技能是否已解锁
const checkSkillUnlocked = (skillName: string, technique: Item, cultivationInfo: SaveData['��������']): boolean => {
  if (!technique.功法技�?.[skillName]) return false;

  const skillInfo = technique.功法技能[skillName];
  const unlockCondition = skillInfo.解锁条件 || '';

  // 解析解锁条件
  if (unlockCondition.includes('修炼进度达到')) {
    const match = unlockCondition.match(/修炼进度达到(\d+)%/);
    const requiredProgress = parseInt(match?.[1] || '0');
    return (technique.修炼进度 || 0) >= requiredProgress;
  }

  if (unlockCondition.includes('熟练度达�?)) {
    const match = unlockCondition.match(/熟练度达�?\d+)%/);
    const requiredProficiency = parseInt(match?.[1] || '0');
    return (cultivationInfo.熟练�?|| 0) >= requiredProficiency;
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
  const relations = saveData.value?.人物关系 || {};
  // 仅统计有效NPC：排除临时标识符和无效数�?  return Object.entries(relations)
    .filter(([key, val]) => {
      // 排除以下划线开头或临时标识符的�?      if (String(key).startsWith('_') || String(key).startsWith('npc_init_')) return false;
      // 必须是对象且有完整的角色基础信息
      if (!val || typeof val !== 'object') return false;
      const npc = val as NpcProfile;
      return npc.角色基础信息 && npc.角色基础信息.名字;
    })
    .length;
});

const averageFavorability = computed(() => {
  const relationsObj = saveData.value?.人物关系 || {};
  const relations = Object.entries(relationsObj)
    .filter(([key, val]) => {
      // 排除以下划线开头或临时标识符的�?      if (String(key).startsWith('_') || String(key).startsWith('npc_init_')) return false;
      // 必须是对象且有完整的角色基础信息
      if (!val || typeof val !== 'object') return false;
      const npc = val as NpcProfile;
      return npc.角色基础信息 && npc.角色基础信息.名字;
    })
    .map(([, val]) => val as NpcProfile);
  if (relations.length === 0) return 0;
  const total = relations.reduce((sum, rel) => sum + (rel.人物好感�?|| 0), 0);
  return Math.round(total / relations.length);
});

  return Object.entries(categories).map(([type, count]) => ({
    type,
    name: getRelationshipName(type),
    count
  }));
});

// 背包统计
const inventoryItemCount = computed(() => {
  const items = saveData.value?.背包?.物品 || {};
  // 仅统计有效物品：键不以下划线开头，值为对象且包含名�?  return Object.entries(items)
    .filter(([key, val]) => !String(key).startsWith('_') && val && typeof val === 'object' && typeof (val as Item).名称 === 'string')
    .length;
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
  const max = playerStatus.value?.修为?.最�?|| 100;
  return Math.round((current / max) * 100);
};


const getSpiritRootDisplay = (spiritRoot: string | { 名称: string; 品质: string; 描述: string } | undefined): string => {
  if (!spiritRoot) return '未知';
  if (typeof spiritRoot === 'string') return spiritRoot;
  return spiritRoot.名称 || '未知';
};

const getSpiritRootQuality = (spiritRoot: string | { 名称: string; 品质: string; 描述: string } | undefined): string => {
  if (!spiritRoot || typeof spiritRoot === 'string') return '';
  return spiritRoot.品质 || '';
};

const getSpiritRootDescription = (spiritRoot: string | { 名称: string; 品质: string; 描述: string } | undefined): string => {
  if (!spiritRoot || typeof spiritRoot === 'string') return '';
  return spiritRoot.描述 || '';
};

const getSpiritRootClass = (spiritRoot: string | { 名称: string; 品质: string; 描述: string } | undefined): string => {
  const display = getSpiritRootDisplay(spiritRoot);
  return display.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const getTalentList = (talents: string[] | Array<{ 名称: string; 描述: string }> | undefined): Array<{ 名称: string; 描述?: string }> => {
  if (!talents) return [];
  if (Array.isArray(talents)) {
    return talents.map(talent => {
      if (typeof talent === 'string') {
        return { 名称: talent };
      }
      return talent;
    });
  }
  return [];
};

const getPercentage = (current: number, max: number): number => {
  return Math.round((current / max) * 100);
};

const getItemQualityClass = (item: Item | null, type: 'border' | 'text' = 'border'): string => {
  if (!item) return '';
  const quality = item.品质?.quality || '�?;
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
  return progress?.总经�?|| 0;
};

const getItemTypeCount = (type: string): number => {
  const items = saveData.value?.背包?.物品 || {};
  return Object.entries(items)
    .filter(([key, val]) => !String(key).startsWith('_') && val && typeof val === 'object')
    .map(([, val]) => val as Item)
    .filter((item: Item) => item.类型 === type).length;
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

// 清理状态效果描述，去除重复的时间信�?const getCleanEffectDescription = (effect: StatusEffect): string => {
  if (!effect || !effect.状态描�? return '';
  
  let description = effect.状态描�?
  const duration = effect.时间;
  
  // 如果描述中包含了时间信息，则移除重复部分
  if (duration && description.includes(duration)) {
    // 移除包含时间信息的句子或短语
    description = description
      .replace(new RegExp(`[^。]*${duration}[^。]*�?`, 'g'), '')
      .replace(new RegExp(`持续时间[�?][^。]*${duration}[^。]*�?`, 'g'), '')
      .replace(new RegExp(`剩余时间[�?][^。]*${duration}[^。]*�?`, 'g'), '')
      .replace(new RegExp(`时间[�?][^。]*${duration}[^。]*�?`, 'g'), '')
      .trim()
      .replace(/^[，。、\s]+|[，。、\s]+$/g, ''); // 清理开头和结尾的标点符�?  }
  
  return description || '此状态效果正在生效中�?;
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
      description: '此大道已解锁，但尚未开始修炼�?
    };
  }

  const stage = progress.当前阶段 || 0;
  const currentExp = progress.当前经验 || 0;
  const totalExp = progress.总经�?|| 0;
  const progressPercent = getDaoProgress(selectedDao.value);

  return {
    name: selectedDao.value,
    stage: `�?{stage}阶段`,
    currentExp,
    totalExp,
    progressPercent,
    description: '此道深奥玄妙，需持之以恒方能有所成就�?
  };
};

const getSkillModalContent = () => {
  if (!selectedSkill.value) return null;

  // 处理已掌握技�?  if (typeof selectedSkill.value === 'object' && 'proficiency' in selectedSkill.value) {
    const skill = selectedSkill.value as LearnedSkillDisplay;
    return {
      name: skill.name,
      type: skill.type,
      status: '已解�?,
      condition: '已掌�?,
      description: skill.description,
      source: skill.source,
      proficiency: skill.proficiency
    };
  }

  // 处理字符串技能名（向后兼容）
  if (typeof selectedSkill.value === 'string') {
    return {
      name: selectedSkill.value,
      type: '功法技�?,
      status: '已解�?,
      condition: '修炼完成',
      description: '通过修炼功法获得的技�?,
      source: '功法修炼'
    };
  }

  // 处理功法技能对�?  const skill = selectedSkill.value as SkillInfo;
  return {
    name: skill.name,
    type: skill.type,
    status: skill.unlocked ? '已解�? : '未解�?,
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
  debug.log('人物详情', '组件挂载，同步数�?);
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

/* 加载和错误状�?*/
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

/* 角色头部信息简化版 */
.character-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 24px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  border-radius: 12px 12px 0 0;
}

/* 新版头部布局 */
.header-modern {
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.avatar-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary), var(--color-info));
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(var(--color-primary-rgb), 0.3);
  flex-shrink: 0;
}

.avatar-initial {
  color: #fff;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 1px;
}

.title-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.meta-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  white-space: nowrap;
}

.realm-chip {
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.06);
  border-color: rgba(var(--color-primary-rgb), 0.35);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.reputation-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(var(--color-warning-rgb), 0.12);
  border: 1px solid rgba(var(--color-warning-rgb), 0.35);
  border-radius: 10px;
}

.rep-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.rep-value {
  font-weight: 700;
  color: var(--color-warning);
}

.cultivation-compact {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.cultivation-compact.mortal {
  padding: 6px 10px;
  background: rgba(var(--color-primary-rgb), 0.06);
  border: 1px dashed rgba(var(--color-primary-rgb), 0.35);
  border-radius: 10px;
}

.compact-bar {
  width: 160px;
  height: 8px;
  background: var(--color-border);
  border-radius: 999px;
  overflow: hidden;
}

.compact-progress {
  height: 100%;
  background: linear-gradient(90deg, var(--color-info), var(--color-success));
  width: 0%;
  transition: width 0.4s ease;
}

.compact-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.compact-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-info);
}

.character-gender {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 80px;
}

.gender-symbol {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  color: white;
  margin-bottom: 8px;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover));
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
}

.gender-�?.gender-symbol {
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-hover));
  box-shadow: 0 4px 12px rgba(var(--color-accent-rgb), 0.3);
}

.gender-�?.gender-symbol {
  background: linear-gradient(135deg, var(--color-info), var(--color-info-hover));
  box-shadow: 0 4px 12px rgba(var(--color-info-rgb), 0.3);
}

.gender-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-align: center;
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

.gender-value {
  padding: 4px 12px;
  border-radius: 16px;
  font-weight: 600;
  font-size: 0.9rem;
}

.gender-value.gender-�?{
  background: rgba(var(--color-accent-rgb), 0.1);
  color: var(--color-accent);
  border: 1px solid rgba(var(--color-accent-rgb), 0.3);
}

.gender-value.gender-�?{
  background: transparent;
  color: var(--color-text);
  border: none;
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

/* 凡人修炼状态样�?*/
.stat-display.mortal-state {
  padding: 8px 16px;
  background: rgba(var(--color-primary-rgb), 0.05);
  border-radius: 6px;
  border: 1px dashed rgba(var(--color-primary-rgb), 0.3);
}

.mortal-hint {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-style: italic;
  opacity: 0.8;
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

/* 内容网格 - 改为更灵活的响应式布局 */
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  padding: 16px;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

/* 确保每个栏目都能适应容器 */
.left-column,
.middle-column, 
.right-column {
  min-width: 0; /* 防止内容溢出 */
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
  box-sizing: border-box;
}

/* 信息区块优化 */
.info-section {
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: none;
  transition: border-color 0.2s ease, background-color 0.2s ease;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  min-width: 0;
}

.info-section:hover {
  transform: none;
  box-shadow: none;
  border-color: var(--color-border-hover);
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

/* 生命状�?*/
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

.bar-danger { background: linear-gradient(90deg, var(--color-danger), var(--color-danger-hover)); }
.bar-info { background: linear-gradient(90deg, var(--color-info), var(--color-info-hover)); }
.bar-accent { background: linear-gradient(90deg, var(--color-warning), var(--color-warning-hover)); }

/* 生命状态颜�?- 红蓝金三�?*/
.bar-red { background: linear-gradient(90deg, var(--vital-health), var(--vital-health)); }
.bar-blue { background: linear-gradient(90deg, var(--vital-lingqi), var(--vital-lingqi)); }
.bar-gold { background: linear-gradient(90deg, var(--vital-spirit), var(--vital-spirit)); }

.vital-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  min-width: 60px;
}

/* 天赋与灵�?*/
.talent-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.talent-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px;
  background: var(--color-surface-light);
  border-radius: 8px;
}

.talent-label {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin-right: 1rem;
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

/* 状态效�?*/
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

/* 六司属�?*/
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.attributes-grid.compact {
  grid-template-columns: repeat(3, minmax(80px, 1fr));
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
  min-width: 80px; /* 确保有足够空间显示完整属性名 */
  width: 100%;
  box-sizing: border-box;
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
  flex: 1 1 auto;
  min-width: 0;
  overflow: visible;
  text-overflow: initial;
  padding-right: 8px;
}

.attr-value {
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: visible;
  text-overflow: initial;
  flex-shrink: 0;
  min-width: auto;
}

.attribute-item.acquired.has-bonus .attr-value {
  color: var(--color-success);
}

.attribute-breakdown {
  display: grid;
  grid-template-columns: 1fr;
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

/* 技能系统样�?*/
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
  height: 12px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(var(--color-border-rgb), 0.15);
}

.progress-fill {
  height: 100%;
  min-width: 2px; /* 确保即使�?%时也有最小宽度显�?*/
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-hover));
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

/* 空状�?*/
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
.border-quality-�? .text-quality-�?{ color: #ef4444 !important; }
.border-quality-�? .text-quality-�?{ color: #f59e0b !important; }
.border-quality-�? .text-quality-�?{ color: #8b5cf6 !important; }
.border-quality-�? .text-quality-�?{ color: #3b82f6 !important; }
.border-quality-�? .text-quality-�?{ color: #10b981 !important; }
.border-quality-�? .text-quality-�?{ color: #84cc16 !important; }
.border-quality-�? .text-quality-�?{ color: var(--color-text) !important; }

/* 宗门关系颜色 */
.relationship-恶劣 { color: var(--color-danger) !important; }
.relationship-一�?{ color: var(--color-text-secondary) !important; }
.relationship-良好 { color: var(--color-success) !important; }
.relationship-亲密 { color: var(--color-info) !important; }

/* 响应式设�?*/
@media (max-width: 1400px) {
  .content-grid {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
    padding: 12px;
  }
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 12px;
  }

  .right-column {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 12px;
  }

  .right-column .info-section {
    margin-bottom: 0;
  }
}

@media (max-width: 900px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 8px;
  }
  
  .right-column {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

@media (max-width: 640px) {
  .character-header {
    flex-direction: column;
    text-align: center;
    gap: 12px;
    padding: 16px;
  }
  .header-left { justify-content: center; }
  .header-right { width: 100%; justify-content: center; flex-wrap: wrap; }
  .compact-bar { width: 60%; }

  .character-details {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 8px;
  }

  .content-grid {
    grid-template-columns: 1fr;
    padding: 8px;
    gap: 12px;
  }

  .right-column {
    grid-template-columns: 1fr;
  }

  .info-section {
    padding: 12px;
    margin-bottom: 12px;
    border-radius: 8px;
  }

  .attributes-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .attributes-grid.compact {
    grid-template-columns: repeat(2, minmax(70px, 1fr));
    gap: 8px;
  }

  .attribute-breakdown {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .stones-grid {
    grid-template-columns: 1fr;
  }

  .relationship-stats {
    grid-template-columns: 1fr;
  }

  /* 确保文字显示完整 */
  .attr-name, .attr-value {
    white-space: nowrap;
    overflow: visible;
    text-overflow: initial;
  }

  .attribute-item {
    min-height: 36px;
    padding: 8px;
    min-width: 70px; /* 确保移动端也有足够空�?*/
    width: 100%;
  }

  .character-name {
    font-size: 1.6rem;
  }

  .section-title {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .character-details-wrapper {
    font-size: 14px;
  }

  .character-header {
    padding: 12px;
    gap: 8px;
  }

  .gender-symbol {
    width: 40px;
    height: 40px;
    font-size: 1.3rem;
  }

  .character-name {
    font-size: 1.4rem;
  }

  .content-grid {
    padding: 6px;
    gap: 8px;
  }

  .info-section {
    padding: 10px;
    margin-bottom: 8px;
    border-radius: 6px;
  }

  .section-title {
    font-size: 0.9rem;
    margin-bottom: 12px;
  }

  .attributes-grid.compact {
    grid-template-columns: repeat(2, minmax(60px, 1fr));
    gap: 6px;
  }

  .attribute-item {
    padding: 6px;
    min-height: 32px;
    min-width: 60px; /* 确保超小屏幕也有足够空间 */
  }

  .attr-name {
    font-size: 0.8rem;
  }

  .attr-value {
    font-size: 0.85rem;
  }

  .skill-card {
    padding: 8px;
  }

  .dao-item {
    padding: 8px;
  }

  .technique-progress {
    gap: 8px;
  }

  .progress-item {
    gap: 8px;
  }

  .progress-label {
    min-width: 60px;
    font-size: 0.8rem;
  }
}

/* 自定义弹窗样�?*/
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

/* 技能详情样�?*/
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

/* 响应式优�?*/
@media (max-width: 640px) {
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

/* 新的结构化数据样�?*/
.spirit-root-display {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.spirit-root-quality {
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-weight: 500;
}

.quality-天品 { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; }
.quality-地品 { background: linear-gradient(135deg, #a78bfa, #8b5cf6); color: white; }
.quality-玄品 { background: linear-gradient(135deg, #60a5fa, #3b82f6); color: white; }
.quality-黄品 { background: linear-gradient(135deg, #34d399, #10b981); color: white; }
.quality-凡品 { background: linear-gradient(135deg, #9ca3af, #6b7280); color: white; }

.spirit-root-desc {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  max-width: 200px;
  text-align: right;
  line-height: 1.4;
  margin-top: 0.25rem;
}

.talent-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-end;
  flex-direction: column;
}

.talent-tag {
  position: relative;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(147, 51, 234, 0.1));
  color: #9333ea;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid rgba(147, 51, 234, 0.2);
  cursor: help;
}

.talent-description {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 0.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  max-width: 200px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  white-space: normal;
}

.talent-tag:hover .talent-description {
  opacity: 1;
}
</style>
















