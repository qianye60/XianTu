<template>
  <div class="character-details-wrapper custom-scrollbar">
    <!-- 加载状态 -->
    <transition name="fade" mode="out-in">
      <div v-if="isLoading" class="state-container loading">
        <div class="loading-spinner"></div>
        <p class="state-text">{{ t('感悟天地灵气中...') }}</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="!baseInfo || !saveData" class="state-container error">
        <div class="error-icon-wrapper">
          <AlertCircle :size="48" />
        </div>
        <p class="state-text">{{ t('无法探知角色数据') }}</p>
        <button class="retry-btn" @click="refreshData">
          <span>{{ t('重新探查') }}</span>
        </button>
      </div>

      <!-- 主要内容 -->
      <div v-else-if="baseInfo" class="character-details-content">

       <!-- 顶部角色信息卡片 -->
        <div class="character-header-card glass-panel">
          <div class="header-bg-decoration"></div>

          <div class="header-content">
            <!-- 左侧：头像身份 -->
            <div class="profile-section">
              <div class="avatar-container">
                <div class="avatar-circle" :data-realm="extractRealmName(playerStatus?.境界?.名称)">
                  <span class="avatar-text">{{ nameInitial }}</span>
                </div>
                <!-- 境界光环特效 -->
                <div class="realm-aura"></div>
              </div>

              <div class="identity-info">
                <h1 class="character-name text-gradient">{{ baseInfo.名字 }}</h1>
                <div class="character-tags">
                  <div v-if="baseInfo.性别" class="tag-badge gender" :class="baseInfo.性别 === '男' ? 'male' : 'female'">
                    {{ baseInfo.性别 === '男' ? '♂' : '♀' }} {{ t(baseInfo.性别) }}
                  </div>
                  <span class="meta-chip">{{ t(baseInfo.种族 || '人族') }}</span>
                  <span class="meta-chip">{{ currentAge }} {{ t('岁') }}</span>
                  <button type="button" class="meta-chip link-chip" @click="showOriginDetails(baseInfo.出生)">
                    {{ getOriginDisplay(baseInfo.出生) }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 中间：核心数值 -->
            <div class="stats-overview">
              <div class="stat-mini-card">
                <div class="icon-box realm"><Mountain :size="18" /></div>
                <div class="stat-info">
                  <span class="label">{{ t('境界') }}</span>
                  <span class="value highlight">{{ formatRealmDisplay(playerStatus?.境界) || t('凡人') }}</span>
                </div>
              </div>

              <div class="stat-mini-card" v-if="hasSpiritRoot">
                <div class="icon-box spirit"><Sparkles :size="18" /></div>
                <div class="stat-info">
                  <span class="label">{{ t('灵根') }}</span>
                  <span class="value" :class="getSpiritRootClass(baseInfo.灵根)">{{ formatSpiritRoot(baseInfo.灵根) }}</span>
                </div>
              </div>

              <div class="stat-mini-card" v-if="playerLocation?.描述">
                <div class="icon-box location"><MapPin :size="18" /></div>
                <div class="stat-info">
                  <span class="label">{{ t('所在') }}</span>
                  <span class="value wrap" :title="playerLocation.描述">{{ playerLocation.描述 }}</span>
                </div>
              </div>
            </div>

            <!-- 右侧：修为进度 -->
            <div class="cultivation-block">
              <div v-if="isAnimalStage(playerStatus?.境界?.名称)" class="animal-stage">
                <Sprout :size="20" class="floating-icon"/>
                <span>{{ getAnimalStageDisplay() }}</span>
              </div>
              <div v-else-if="hasValidCultivation()" class="progress-wrapper">
                <div class="progress-top">
                  <span class="progress-label">{{ t('修为瓶颈') }}</span>
                  <span class="progress-percent">{{ getCultivationProgress() }}%</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" :style="{ width: getCultivationProgress() + '%' }">
                    <div class="flow-effect"></div>
                  </div>
                </div>
                <div class="progress-details">{{ formatCultivationText() }}</div>
              </div>
              <div v-else class="waiting-stage">
                <Sparkles :size="16" /> {{ waitingStageText }}
              </div>
            </div>
          </div>
        </div>


        <!-- 标签页导航 -->
        <div class="tabs-nav-wrapper">
          <div class="tabs-nav">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              class="nav-tab"
              :class="{ active: activeTab === tab.id }"
            >
              <component :is="tab.icon" :size="16" />
              <span>{{ t(tab.label) }}</span>
              <div class="active-indicator" v-if="activeTab === tab.id"></div>
            </button>
          </div>
        </div>

        <!-- 内容区域 (带过渡动画) -->
        <transition name="slide-fade" mode="out-in">
          <!-- 1. 角色信息 -->
          <div v-if="activeTab === 'character'" class="tab-pane">
            <div class="pane-grid">

              <!-- 基本信息 -->
              <section class="info-card glass-panel">
                 <div class="card-header">
                  <Heart :size="20" class="header-icon red" />
                  <h3>{{ t('📋 基本信息') }}</h3>
                </div>
                <div class="vitals-container">
                  <div class="vital-row" v-for="vital in vitalsData" :key="vital.label">
                    <div class="vital-meta">
                      <span class="vital-name">{{ vital.label }}</span>
                      <span class="vital-nums">{{ vital.current }} <span class="divider">/</span> {{ vital.max }}</span>
                    </div>
                    <div class="vital-track">
                      <div class="vital-bar" :class="vital.color" :style="{ width: getPercentage(vital.current, vital.max) + '%' }"></div>
                    </div>
                  </div>
                   <!-- 声望独立行 -->
                  <div class="reputation-badge">
                     <span class="rep-label">{{ t('声望') }}</span>
                     <span class="rep-value">{{ playerStatus?.声望 || t('籍籍无名') }}</span>
                  </div>
                </div>
              </section>

              <!-- 天赋灵根 -->
              <section class="info-card glass-panel">
                <div class="card-header">
                  <Zap :size="20" class="header-icon purple" />
                  <h3>{{ t('天赋资质') }}</h3>
                </div>

                <div class="talent-layout">
                  <!-- 灵根卡片 -->
                  <div class="spirit-root-banner clickable" @click="showSpiritRootModal = true" :class="baseInfo ? getSpiritRootClass(baseInfo.灵根) : 'spirit-common'">
                    <div class="banner-content">
                       <span class="root-type">{{ t('灵根') }}</span>
                       <div class="root-main">
                         <span class="root-name">{{ getSpiritRootDisplay(baseInfo.灵根) }}</span>
                         <span class="root-grade badge">{{ t(getSpiritRootGrade(baseInfo.灵根) || '凡品') }}</span>
                       </div>
                       <span class="tap-hint">{{ t('查看详情') }}</span>
                    </div>
                    <div class="banner-bg-icon"><Zap /></div>
                  </div>

                  <!-- 天赋列表 -->
                  <div class="talents-grid">
                    <div class="talent-chip tier-chip">
                       <span class="chip-label">{{ t('天资') }}</span>
                       <span class="chip-val tier-text">{{ getTalentTierName(baseInfo.天资) }}</span>
                    </div>

                    <template v-if="getTalentList(baseInfo.天赋)?.length">
                      <div
                        v-for="talent in getTalentList(baseInfo.天赋)"
                        :key="talent.name"
                        class="talent-chip trait-chip"
                        :title="talent.description"
                      >
                        {{ talent.name }}
                      </div>
                    </template>
                    <div v-else class="talent-chip empty">{{ t('无特殊天赋') }}</div>
                  </div>
                </div>
              </section>

              <!-- 六司属性 -->
              <section class="info-card glass-panel full-width">
                 <div class="card-header">
                  <BarChart3 :size="20" class="header-icon blue" />
                  <h3>{{ t('六司属性') }}</h3>
                </div>
                <div class="attributes-wrapper">
                  <!-- 最终属性 -->
                  <div class="attr-group final">
                    <div v-for="(value, key) in finalAttributes" :key="key" class="attr-box big">
                      <span class="attr-key">{{ t(String(key)) }}</span>
                      <span class="attr-val">{{ value }}</span>
                    </div>
                  </div>
                  <!-- 详情分割线 -->
                   <div class="attr-divider">
                     <span>{{ t('先天') }} / {{ t('后天加成') }}</span>
                   </div>
                   <div class="attr-breakdown">
                     <div class="breakdown-col">
                        <div v-for="(value, key) in innateAttributesWithDefaults" :key="key" class="mini-attr">
                           <span class="k">{{ t(String(key)) }}</span><span class="v">{{value}}</span>
                        </div>
                     </div>
                      <div class="breakdown-col">
                        <div v-for="(value, key) in acquiredAttributes" :key="key" class="mini-attr green">
                            <span class="k">{{ t(String(key)) }}</span><span class="v">{{ formatSignedNumber(value) }}</span>
                         </div>
                      </div>
                    </div>
                 </div>
               </section>

            </div>
          </div>

          <!-- 2. 修炼体系 -->
          <div v-else-if="activeTab === 'cultivation'" class="tab-pane">
            <div class="pane-grid">
               <!-- 功法 -->
               <section class="info-card glass-panel">
                  <div class="card-header">
                    <BookOpen :size="20" class="header-icon gold" />
                    <h3>{{ t('主修功法') }}</h3>
                  </div>

                  <div v-if="!fullCultivationTechnique" class="empty-placeholder">
                    <BookOpen :size="40" opacity="0.5"/>
                    <p>{{ t('尚未修习任何功法') }}</p>
                  </div>

                  <div v-else class="technique-container">
                    <div class="technique-master-card clickable" @click="toggleTechniqueDetails" :class="getItemQualityClass(fullCultivationTechnique)">
                       <div class="tm-header">
                         <span class="tm-name">{{ fullCultivationTechnique?.名称 }}</span>
                         <div class="tm-badges">
                            <span class="badge">{{ t(fullCultivationTechnique?.品质?.quality || '未知') }}</span>
                            <ChevronDown :size="16" :class="{ 'rotate-180': showTechniqueDetails }" class="transition-icon"/>
                         </div>
                       </div>
                       <!-- 进度条 -->
                       <div class="tm-progress">
                          <span>{{ t('领悟重数') }}</span>
                          <div class="bar-bg"><div class="bar-fg" :style="{width: (fullCultivationTechnique.修炼进度 || 0) + '%'}"></div></div>
                          <span>{{ fullCultivationTechnique.修炼进度 || 0 }}%</span>
                       </div>
                    </div>

                    <transition name="expand">
                      <div v-show="showTechniqueDetails" class="technique-detail-panel">
                        <div class="detail-section">
                          <div class="section-label">{{ t('功法描述') }}</div>
                          <p class="desc-text">{{ t(fullCultivationTechnique?.描述 || '此功法奥妙无穷。') }}</p>
                        </div>

                        <div v-if="hasTechniqueEffects" class="detail-section">
                          <div class="section-label">{{ t('功法效果') }}</div>
                          <div class="effects-box">
                            <div class="effect-row" v-if="fullCultivationTechnique.功法效果?.修炼速度加成">
                              <Rocket :size="16" class="effect-icon" />
                              <span class="effect-label">{{ t('修炼速度') }}</span>
                              <span class="effect-value">+{{ (fullCultivationTechnique.功法效果.修炼速度加成 * 100).toFixed(0) }}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </transition>
                  </div>
               </section>

               <!-- 技能列表 -->
               <section class="info-card glass-panel">
                  <div class="card-header">
                    <Zap :size="20" class="header-icon blue"/>
                    <h3>{{ t('神通技能') }} <span class="count-badge">{{ totalSkillsCount }}</span></h3>
                  </div>

                  <div class="skills-grid-wrapper custom-scrollbar">
                     <div v-for="skill in allLearnedSkills" :key="skill.name"
                          class="skill-card clickable" @click="showSkillDetails(skill)">
                        <div class="skill-icon-placeholder">{{ skill.name[0] }}</div>
                        <div class="skill-info">
                           <div class="skill-name">{{ skill.name }}</div>
                           <div class="skill-meta">{{ skill.source }}</div>
                        </div>
                        <div class="skill-prof">
                           {{ skill.proficiency }}%
                        </div>
                     </div>
                     <div v-if="allLearnedSkills.length === 0" class="empty-placeholder text-sm">
                        {{ t('尚未领悟神通') }}
                     </div>
                  </div>
               </section>

               <!-- 三千大道 -->
               <section class="info-card glass-panel full-width">
                  <div class="card-header toggle-header" @click="toggleDaoDetails">
                     <div class="flex-row">
                        <Mountain :size="20" class="header-icon ink" />
                        <h3>{{ t('三千大道') }}</h3>
                     </div>
                     <div class="header-actions">
                        <span class="text-mini">{{ t('已感悟') }} {{ unlockedDaoList.length }}</span>
                        <ChevronDown :size="16" :class="{ 'rotate-180': showDaoDetails }" />
                     </div>
                  </div>

                  <div class="dao-grid" v-show="showDaoDetails || unlockedDaoList.length > 0">
                     <div v-for="dao in (showDaoDetails ? unlockedDaoList : unlockedDaoList.slice(0, 4))"
                          :key="dao.道名" class="dao-pill clickable" @click="showDaoInfo(dao.道名)">
                        <span class="dao-char">{{ dao.道名[0] }}</span>
                        <div class="dao-content">
                           <div class="dao-name">{{ dao.道名 }}</div>
                           <div class="dao-progress-mini">
                              <div class="fill" :style="{width: getDaoProgress(dao.道名) + '%'}"></div>
                           </div>
                        </div>
                     </div>
                  </div>
               </section>
            </div>
          </div>

          <!-- 3. 社交 & 4. 物品 & 5. 身体 保持相同的卡片结构风格 -->
           <div v-else-if="activeTab === 'social'" class="tab-pane">
             <div class="pane-grid">
                <section class="info-card glass-panel">
                  <div class="card-header"><Users :size="20" class="header-icon"/> <h3>{{ t('人际关系') }}</h3></div>
                  <div class="stat-row">
                     <div class="stat-item big-num">
                        <span>{{ relationshipCount }}</span>
                        <label>{{ t('结识之人') }}</label>
                     </div>
                     <div class="stat-item big-num">
                        <span>{{ averageFavorability }}</span>
                        <label>{{ t('人心所向') }}</label>
                     </div>
                   </div>
                 </section>

                <section class="info-card glass-panel">
                  <div class="card-header"><Handshake :size="20" class="header-icon"/> <h3>{{ t('结缘录') }}</h3></div>
                  <div class="relationship-list custom-scrollbar">
                    <div v-for="npc in topRelationships" :key="npc.名字" class="relationship-row">
                      <div class="rel-main">
                        <div class="rel-name">{{ npc.名字 }}</div>
                        <div class="rel-meta">
                          <span class="rel-tag">{{ npc.与玩家关系 || t('陌生人') }}</span>
                          <span v-if="isSpecialNpc(npc)" class="rel-tag special">{{ t('特殊') }}</span>
                          <span class="rel-dot">·</span>
                          <span class="rel-realm">{{ formatRealmDisplay(npc.境界) }}</span>
                        </div>
                      </div>
                      <div class="rel-fav" :class="getFavorabilityClass(npc.好感度)">{{ npc.好感度 }}</div>
                    </div>
                    <div v-if="topRelationships.length === 0" class="empty-placeholder text-sm">
                      <Users :size="36" opacity="0.5" />
                      <p>{{ t('尚未结识他人') }}</p>
                    </div>
                  </div>
                </section>

                <section class="info-card glass-panel" v-if="playerSectInfo">
                   <div class="card-header"><Mountain :size="20" class="header-icon"/> <h3>{{ playerSectInfo.宗门名称 }}</h3></div>
                   <div class="sect-grid">
                     <div class="kv"><span class="k">{{ t('职位') }}</span><span class="v">{{ playerSectInfo.职位 }}</span></div>
                     <div class="kv"><span class="k">{{ t('关系') }}</span><span class="v">{{ playerSectInfo.关系 }}</span></div>
                     <div class="kv"><span class="k">{{ t('贡献') }}</span><span class="v">{{ playerSectInfo.贡献 }}</span></div>
                     <div class="kv"><span class="k">{{ t('声望') }}</span><span class="v highlight">{{ playerSectInfo.声望 }}</span></div>
                   </div>
                </section>
             </div>
           </div>

            <div v-else-if="activeTab === 'inventory'" class="tab-pane">
              <div class="pane-grid">
                <section class="info-card glass-panel">
                  <div class="card-header"><Backpack :size="20" class="header-icon"/> <h3>{{ t('储物袋') }}</h3></div>
                  <div class="inventory-stats-grid">
                     <div class="inv-stat">
                        <span class="num">{{ inventoryItemCount }}</span>
                        <span class="lbl">{{ t('物品') }}</span>
                     </div>
                      <div class="inv-stat">
                        <span class="num gold-text">{{ spiritStoneEquivalent }}</span>
                        <span class="lbl">{{ t('灵石折算') }}</span>
                     </div>
                  </div>
                  <div class="spirit-stones-grid">
                    <div class="stone-kv"><span class="k">{{ t('下品') }}</span><span class="v">{{ getSpiritStoneCount('下品') }}</span></div>
                    <div class="stone-kv"><span class="k">{{ t('中品') }}</span><span class="v">{{ getSpiritStoneCount('中品') }}</span></div>
                    <div class="stone-kv"><span class="k">{{ t('上品') }}</span><span class="v">{{ getSpiritStoneCount('上品') }}</span></div>
                    <div class="stone-kv"><span class="k">{{ t('极品') }}</span><span class="v">{{ getSpiritStoneCount('极品') }}</span></div>
                  </div>
                </section>

                <section class="info-card glass-panel">
                  <div class="card-header"><Sparkles :size="20" class="header-icon gold"/> <h3>{{ t('物品一览') }}</h3></div>
                  <div class="inventory-preview custom-scrollbar">
                    <div v-for="item in inventoryPreviewItems" :key="item.物品ID" class="inv-row" :class="getItemQualityClass(item)">
                      <div class="inv-main">
                        <div class="inv-name">{{ item.名称 }}</div>
                        <div class="inv-meta">{{ t(item.类型) }}</div>
                      </div>
                      <div class="inv-qty">×{{ item.数量 }}</div>
                    </div>
                    <div v-if="inventoryPreviewItems.length === 0" class="empty-placeholder text-sm">
                      <Backpack :size="36" opacity="0.5" />
                      <p>{{ t('储物袋空空如也') }}</p>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div v-else-if="activeTab === 'body' && isTavernEnvFlag" class="tab-pane">
                <div class="info-card glass-panel">
                  <BodyStatsPanel :body-stats="bodyStatsForPanel || undefined" :lifespan="lifespanForBodyPanelDisplay" />
                </div>
            </div>
         </transition>

      </div>
    </transition>

    <!-- 弹窗组件复用 (样式优化) -->
    <Transition name="modal-fade">
        <div v-if="showSkillModal || showDaoModal || showSpiritRootModal || showOriginModal" class="modal-overlay" @click="closeModals">
           <!-- 具体的弹窗内容，保持逻辑不变，只应用新样式类 -->
           <div class="modal-card glass-panel" @click.stop>
               <!-- ... 内容插槽, 这里使用简化的示例，实际项目中保留原v-if逻辑 ... -->
               <button class="close-float" @click="closeModals"><X /></button>

              <!-- 灵根详情示例 -->
               <div v-if="showSpiritRootModal && baseInfo" class="modal-inner">
                  <h2 class="modal-title">{{ getSpiritRootDisplay(baseInfo.灵根) }}</h2>
                  <div class="modal-body-scroller custom-scrollbar">
                     <div class="detail-grid">
                        <div class="d-item"><label>{{ t('品级') }}</label> <span>{{ t(getSpiritRootGrade(baseInfo.灵根)) }}</span></div>
                        <div class="d-item"><label>{{ t('修炼加成') }}</label> <span class="highlight">{{ getSpiritRootCultivationSpeed(baseInfo) }}</span></div>
                     </div>
                     <div v-if="getSpiritRootElements(baseInfo.灵根).length" class="tags-row">
                       <span v-for="el in getSpiritRootElements(baseInfo.灵根)" :key="el" class="tag-pill">{{ el }}</span>
                     </div>
                   <div class="d-desc-box">{{ getSpiritRootDescription(baseInfo.灵根) }}</div>
                  </div>
               </div>

                <!-- 出身详情 -->
                <div v-if="showOriginModal" class="modal-inner">
                  <h2 class="modal-title">{{ getOriginModalContent()?.name }}</h2>
                  <p class="modal-subtitle">{{ t('出身') }}</p>
                  <div class="d-desc-box">{{ getOriginModalContent()?.description }}</div>
                </div>

                <!-- 技能详情 -->
               <div v-if="showSkillModal" class="modal-inner">
                 <h2 class="modal-title">{{ getSkillModalContent()?.name }}</h2>
                  <p class="modal-subtitle">{{ getSkillModalContent()?.type }} · {{ getSkillModalContent()?.source }}</p>
                 <div class="d-desc-box">{{ getSkillModalContent()?.description }}</div>
                 <div class="skill-stat-row">
                    <span>{{ t('熟练度') }}: {{ getSkillModalContent()?.proficiency }}</span>
                 </div>
              </div>

              <!-- 大道详情 -->
               <div v-if="showDaoModal" class="modal-inner">
                  <h2 class="modal-title">{{ getDaoModalContent()?.name }}</h2>
                  <div class="progress-big">
                     <div class="fill" :style="{width: getDaoModalContent()?.progressPercent + '%'}"></div>
                     <span class="text">{{ getDaoModalContent()?.progressPercent }}%</span>
                  </div>
                  <div class="detail-grid">
                    <div class="d-item"><label>{{ t('阶段') }}</label> <span>{{ getDaoModalContent()?.stage }}</span></div>
                    <div class="d-item"><label>{{ t('经验') }}</label> <span>{{ getDaoModalContent()?.exp }}</span></div>
                  </div>
                  <p>{{ getDaoModalContent()?.description }}</p>
               </div>

           </div>
        </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue';
import { useI18n } from '@/i18n';
import { useCharacterStore } from '@/stores/characterStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import BodyStatsPanel from '@/components/dashboard/components/BodyStatsPanel.vue';
import { calculateFinalAttributes } from '@/utils/attributeCalculation';
import { calculateAgeFromBirthdate, type GameTime as LifespanGameTime } from '@/utils/lifespanCalculator';
import { formatRealmWithStage } from '@/utils/realmUtils';
import { isTavernEnv } from '@/utils/tavern';
import type { DaoData, InnateAttributes, Inventory, Item, ItemQuality, MasteredSkill, NpcProfile, SaveData, TechniqueItem } from '@/types/game';
import type { Origin, TalentTier, SpiritRoot } from '@/types';
import {
  AlertCircle,
  Backpack,
  BarChart3,
  BookOpen,
  ChevronDown,
  Handshake,
  Heart,
  MapPin,
  Mountain,
  Rocket,
  Sparkles,
  Sprout,
  Users,
  X,
  Zap,
} from 'lucide-vue-next';

// --- 类型定义移至此处或保持在 types 文件中 ---
type LearnedSkillDisplay = {
  name: string;
  type: string;
  source: string;
  proficiency: number;
  description?: string;
  unlocked: boolean;
};

const { t } = useI18n();
const characterStore = useCharacterStore();
const gameStateStore = useGameStateStore();
const isTavernEnvFlag = ref(isTavernEnv());
const isRefreshing = ref(false);
const isLoading = computed(() => isRefreshing.value || !gameStateStore.isGameLoaded);

const extractRealmName = (realm?: string) => {
  if (!realm) return 'mortal';
  // 默认境界体系
  if (realm.includes('炼气')) return 'qi-refining';
  if (realm.includes('筑基')) return 'foundation';
  if (realm.includes('金丹')) return 'golden-core';
  if (realm.includes('元婴')) return 'nascent-soul';
  if (realm.includes('化神')) return 'soul-formation';
  if (realm.includes('炼虚')) return 'void-refining';
  if (realm.includes('合体')) return 'body-integration';
  if (realm.includes('渡劫')) return 'tribulation';
  // 凡人/无境界
  if (realm.includes('凡人') || realm === '凡人') return 'mortal';
  // 自定义境界 - 返回 'custom' 使用通用高亮样式
  return 'custom';
};

// ... 你的所有其他 computed (baseInfo, playerStatus, fullCultivationTechnique 等) ...
// ... 你的所有 methods (refreshData, formatCultivationText 等) ...

// 重新加上 onMounted 等生命周期
onMounted(() => { isTavernEnvFlag.value = isTavernEnv(); });
onActivated(() => { isTavernEnvFlag.value = isTavernEnv(); });

const saveData = computed(() => gameStateStore.toSaveData());
const baseInfo = computed(() => gameStateStore.character);
const playerStatus = computed(() => gameStateStore.attributes);
const playerLocation = computed(() => gameStateStore.location);
const playerSectInfo = computed(() => gameStateStore.sectMemberInfo);
const daoData = computed(() => gameStateStore.thousandDao);
const bodyStats = computed(() => gameStateStore.body || null);
const gameTime = computed(() => gameStateStore.gameTime);
const inventory = computed<Inventory | null>(() => gameStateStore.inventory);
const relationships = computed<Record<string, NpcProfile> | null>(() => gameStateStore.relationships);

// UI State
const activeTab = ref<string>('character');
const showSkillModal = ref(false);
const showDaoModal = ref(false);
const showSpiritRootModal = ref(false);
const showOriginModal = ref(false);
const showTechniqueDetails = ref(false);
const showDaoDetails = ref(false);
const selectedSkill = ref<LearnedSkillDisplay | null>(null);
const selectedDao = ref<string | null>(null);
const selectedOrigin = ref<Origin | string | Record<string, unknown> | null>(null);

// Tabs configuration
const tabs = computed(() => {
  const base = [
    { id: 'character', label: '角色', icon: Users },
    { id: 'cultivation', label: '修炼', icon: BookOpen },
    { id: 'social', label: '社交', icon: Handshake },
    { id: 'inventory', label: '物品', icon: Backpack },
  ];
  if (isTavernEnvFlag.value) base.push({ id: 'body', label: '法身', icon: Heart });
  return base;
});

// Basic character info
const nameInitial = computed(() => (baseInfo.value?.名字 || '').slice(0, 1) || '?');
const currentAge = computed(() => {
  const birth = baseInfo.value?.出生日期;
  const now = gameTime.value;
  if (birth && now) return calculateAgeFromBirthdate(birth as LifespanGameTime, now as LifespanGameTime);
  return 0;
});

// Vitals data
const vitalsData = computed(() => {
  if (!playerStatus.value) return [];
  const s = playerStatus.value;
  return [
    { label: t('气血'), current: s.气血?.当前 || 0, max: s.气血?.上限 || 100, color: 'red-bar' },
    { label: t('灵气'), current: s.灵气?.当前 || 0, max: s.灵气?.上限 || 100, color: 'blue-bar' },
    { label: t('神识'), current: s.神识?.当前 || 0, max: s.神识?.上限 || 100, color: 'gold-bar' },
    { label: t('寿元'), current: currentAge.value || 0, max: s.寿命?.上限 || 100, color: 'purple-bar' },
  ];
});

const buildInnateDefaults = (raw?: Partial<InnateAttributes> | null): InnateAttributes => ({
  根骨: Number(raw?.根骨 ?? 0),
  灵性: Number(raw?.灵性 ?? 0),
  悟性: Number(raw?.悟性 ?? 0),
  气运: Number(raw?.气运 ?? 0),
  魅力: Number(raw?.魅力 ?? 0),
  心性: Number(raw?.心性 ?? 0),
});

const innateAttributesWithDefaults = computed<InnateAttributes>(() => buildInnateDefaults(baseInfo.value?.先天六司));

const sixSiResult = computed(() => {
  if (!saveData.value) return null;
  return calculateFinalAttributes(innateAttributesWithDefaults.value, saveData.value as unknown as SaveData);
});

const finalAttributes = computed<InnateAttributes>(() => sixSiResult.value?.最终六司 ?? innateAttributesWithDefaults.value);
const acquiredAttributes = computed<InnateAttributes>(() => sixSiResult.value?.后天六司 ?? buildInnateDefaults(null));

const formatSignedNumber = (value: unknown): string => {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  if (isNaN(n) || n === 0) return '0';
  return n > 0 ? `+${n}` : String(n);
};

const fullCultivationTechnique = computed((): TechniqueItem | null => {
  const inv = inventory.value?.物品;
  if (!inv) return null;

  const refId = (gameStateStore.cultivationTechnique as unknown as { 物品ID?: string } | null)?.物品ID;
  if (refId && inv[refId]) return inv[refId] as TechniqueItem;

  const found = Object.values(inv).find((item) => {
    if (item.类型 !== '功法') return false;
    const technique = item as TechniqueItem;
    return item.已装备 === true || technique.修炼中 === true;
  });
  return (found as TechniqueItem) || null;
});

const hasTechniqueEffects = computed(() => {
  const effects = fullCultivationTechnique.value?.功法效果;
  return !!effects && typeof effects === 'object' && Object.keys(effects).length > 0;
});

// Skills
const allLearnedSkills = computed((): LearnedSkillDisplay[] => {
  const learnedSkills = (gameStateStore.masteredSkills || []) as MasteredSkill[];
  return learnedSkills.map((skill) => ({
    name: skill.技能名称 || '',
    type: t('掌握技能'),
    source: skill.来源 || t('未知'),
    proficiency: typeof skill.熟练度 === 'number' ? skill.熟练度 : Number(skill.熟练度 ?? 0),
    description: skill.技能描述 || '',
    unlocked: true,
  }));
});

const totalSkillsCount = computed(() => allLearnedSkills.value.length);

const daoList = computed<Record<string, DaoData>>(() => {
  const raw = daoData.value as unknown;
  if (!raw || typeof raw !== 'object') return {};
  const list = (raw as { 大道列表?: unknown }).大道列表;
  if (!list || typeof list !== 'object') return {};
  return list as Record<string, DaoData>;
});

const unlockedDaoList = computed((): DaoData[] => {
  return Object.values(daoList.value)
    .filter((d) => Boolean(d?.是否解锁))
    .sort((a, b) => getDaoProgress(b.道名) - getDaoProgress(a.道名));
});

const inventoryItemCount = computed(() => {
  const items = inventory.value?.物品;
  if (!items) return 0;
  return Object.keys(items).length;
});

type SpiritStoneGrade = '下品' | '中品' | '上品' | '极品';
const getSpiritStoneCount = (grade: SpiritStoneGrade): number => {
  const stones = inventory.value?.灵石;
  if (!stones) return 0;
  return stones[grade] ?? 0;
};

const spiritStoneEquivalent = computed(() => {
  const low = getSpiritStoneCount('下品');
  const mid = getSpiritStoneCount('中品');
  const high = getSpiritStoneCount('上品');
  const top = getSpiritStoneCount('极品');
  return low + mid * 100 + high * 10000 + top * 1000000;
});

const inventoryPreviewItems = computed<Item[]>(() => {
  const items = inventory.value?.物品;
  if (!items) return [];

  const qualityRank: Record<string, number> = { 仙: 1, 神: 2, 圣: 3, 道: 4, 天: 5, 地: 6, 玄: 7, 黄: 8, 凡: 9 };
  return Object.values(items)
    .filter((it): it is Item => !!it && typeof it === 'object')
    .sort((a, b) => {
      const qa = qualityRank[a.品质?.quality ?? '凡'] ?? 99;
      const qb = qualityRank[b.品质?.quality ?? '凡'] ?? 99;
      if (qa !== qb) return qa - qb;
      const ta = String(a.类型 || '');
      const tb = String(b.类型 || '');
      if (ta !== tb) return ta.localeCompare(tb, 'zh-Hans-CN');
      return String(a.名称 || '').localeCompare(String(b.名称 || ''), 'zh-Hans-CN');
    })
    .slice(0, 12);
});

const relationshipList = computed<NpcProfile[]>(() => {
  const rel = relationships.value || {};
  return Object.values(rel) as NpcProfile[];
});

const relationshipCount = computed(() => relationshipList.value.length);

const averageFavorability = computed(() => {
  if (relationshipList.value.length === 0) return 0;
  const sum = relationshipList.value.reduce((acc, npc) => acc + npc.好感度, 0);
  return Math.round(sum / relationshipList.value.length);
});

const topRelationships = computed(() => {
  return [...relationshipList.value].sort((a, b) => b.好感度 - a.好感度).slice(0, 10);
});

const getFavorabilityClass = (favorability: number) => {
  if (favorability >= 60) return 'fav-high';
  if (favorability >= 20) return 'fav-mid';
  if (favorability <= -20) return 'fav-low';
  return 'fav-neutral';
};

const isSpecialNpc = (npc: NpcProfile): boolean => {
  const ext = (npc as any)?.扩展 as any;
  return Boolean(ext?.specialNpcId || ext?.specialNpc);
};

const isMeaningfulBodyStats = (stats: unknown): boolean => {
  if (!stats || typeof stats !== 'object') return false;
  const s = stats as Record<string, unknown>;
  const hasNumber = (key: string) => typeof s[key] === 'number' && !Number.isNaN(s[key]);
  const hasText = (key: string) => typeof s[key] === 'string' && s[key].trim().length > 0 && s[key] !== '待AI生成';
  const three = s['三围'];
  const hasThree = (() => {
    if (!three || typeof three !== 'object') return false;
    const t = three as Record<string, unknown>;
    return typeof t.胸围 === 'number' && typeof t.腰围 === 'number' && typeof t.臀围 === 'number';
  })();
  return (
    hasNumber('身高') ||
    hasNumber('体重') ||
    hasNumber('体脂率') ||
    hasThree ||
    hasText('肤色') ||
    hasText('发色') ||
    hasText('瞳色') ||
    hasText('胸部描述') ||
    hasText('私处描述') ||
    hasText('生殖器描述') ||
    (Array.isArray(s['敏感点']) && s['敏感点'].length > 0) ||
    (Array.isArray(s['纹身与印记']) && s['纹身与印记'].length > 0)
  );
};

const bodyStatsForPanel = computed(() => (isMeaningfulBodyStats(bodyStats.value) ? bodyStats.value : null));

const lifespanForBodyPanelDisplay = computed(() => {
  const ls = playerStatus.value?.寿命;
  if (!ls) return undefined;
  const current = ls.当前;
  const max = ls.上限;
  if (typeof current !== 'number' || typeof max !== 'number' || max <= 0) return undefined;
  return { current, max };
});

const refreshData = async () => {
  isRefreshing.value = true;
  try {
    const active = characterStore.rootState.当前激活存档;
    if (active?.角色ID && active?.存档槽位) {
      await characterStore.loadGame(active.角色ID, active.存档槽位);
      return;
    }
    await characterStore.reloadFromStorage();
  } finally {
    isRefreshing.value = false;
  }
};

const getPercentage = (current: number, max: number): number => {
  if (!max || max === 0) return 0;
  return Math.min(100, Math.round((current / max) * 100));
};

const showOriginDetails = (origin: Origin | string | Record<string, unknown> | undefined) => {
  selectedOrigin.value = origin ?? null;
  showOriginModal.value = true;
};

const getOriginDisplay = (origin: Origin | string | Record<string, unknown> | undefined): string => {
  if (!origin) return t('未知');
  if (typeof origin === 'string') return origin;
  const originObj = origin as Record<string, unknown>;
  return String(originObj.name ?? originObj.名称 ?? t('未知'));
};

const getOriginModalContent = () => {
  const origin = selectedOrigin.value;
  if (!origin) return null;
  if (typeof origin === 'string') return { name: origin, description: t('此身来处，尘缘未了。') };
  const originObj = origin as Record<string, unknown>;
  return {
    name: String(originObj.name ?? originObj.名称 ?? t('未知')),
    description: String(originObj.description ?? originObj.描述 ?? t('此身来处，尘缘未了。')),
  };
};

const formatRealmDisplay = (realm?: unknown): string => {
  if (!realm) return t('凡人');
  return formatRealmWithStage(realm);
};

const hasSpiritRoot = computed(() => {
  const root = baseInfo.value?.灵根 as unknown;
  if (!root) return false;
  if (typeof root === 'string') return root.trim().length > 0 && root.trim() !== '未知灵根';
  if (typeof root === 'object') {
    const obj = root as Record<string, unknown>;
    return typeof obj.name === 'string' || typeof obj.名称 === 'string';
  }
  return false;
});

const getSpiritRootClass = (spiritRoot: SpiritRoot | string | undefined): string => {
  if (!spiritRoot) return 'spirit-common';
  const grade = getSpiritRootGrade(spiritRoot);
  if (grade === '天品' || grade === '仙品') return 'spirit-divine';
  if (grade === '地品') return 'spirit-earth';
  return 'spirit-common';
};

const formatSpiritRoot = (spiritRoot: SpiritRoot | string | undefined): string => {
  if (!spiritRoot) return t('无');
  if (typeof spiritRoot === 'string') return spiritRoot;
  return getSpiritRootDisplay(spiritRoot);
};

const getSpiritRootDisplay = (spiritRoot: SpiritRoot | string | undefined): string => {
  if (!spiritRoot) return t('无灵根');
  if (typeof spiritRoot === 'string') return spiritRoot;
  const obj = spiritRoot as unknown as Record<string, unknown>;
  if (typeof obj.name === 'string' && obj.name.trim()) return obj.name;
  if (typeof obj.名称 === 'string' && obj.名称.trim()) return obj.名称;
  return t('未知灵根');
};

const getSpiritRootGrade = (spiritRoot: SpiritRoot | string | undefined): string => {
  if (!spiritRoot) return '凡品';
  if (typeof spiritRoot === 'object' && 'tier' in spiritRoot && spiritRoot.tier) return String(spiritRoot.tier);
  const rootObj = spiritRoot as unknown as Record<string, unknown>;
  if (typeof spiritRoot === 'object' && (rootObj.品级 || rootObj.品阶)) return String(rootObj.品级 ?? rootObj.品阶);
  return '凡品';
};

const getSpiritRootCultivationSpeed = (info: { 灵根?: unknown } | null): string => {
  const spiritRoot = info?.灵根;
  if (!spiritRoot || typeof spiritRoot !== 'object') return '1.0x';
  const rootObj = spiritRoot as Record<string, unknown>;

  if (typeof rootObj.cultivation_speed === 'string') return rootObj.cultivation_speed;

  let bonus: number | null = null;
  let bonusIsPercent = false;
  if (typeof rootObj.修炼加成 === 'number') {
    bonus = rootObj.修炼加成;
  } else if (typeof rootObj.修炼加成 === 'string') {
    const raw = rootObj.修炼加成.trim();
    if (raw.endsWith('%')) {
      bonusIsPercent = true;
      bonus = Number(raw.slice(0, -1));
    } else {
      bonus = Number(raw);
    }
  }

  if (typeof bonus === 'number' && !Number.isNaN(bonus)) {
    const pct = bonusIsPercent ? bonus : (Math.abs(bonus) >= 10 ? bonus : bonus * 100);
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toFixed(0)}%`;
  }

  if (typeof rootObj.修炼速度 === 'number' || typeof rootObj.修炼速度 === 'string') {
    return `${String(rootObj.修炼速度)}x`;
  }

  if (typeof rootObj.base_multiplier === 'number' || typeof rootObj.base_multiplier === 'string') {
    return `${String(rootObj.base_multiplier)}x`;
  }

  return '1.0x';
};

const getSpiritRootElements = (spiritRoot: SpiritRoot | string | undefined): string[] => {
  if (!spiritRoot || typeof spiritRoot !== 'object') return [];
  const obj = spiritRoot as unknown as Record<string, unknown>;
  const attrs = obj.属性;
  if (Array.isArray(attrs)) return attrs.map((x) => String(x)).filter(Boolean);
  return [];
};

const getSpiritRootDescription = (spiritRoot: SpiritRoot | string | undefined): string => {
  if (!spiritRoot) return t('无灵根，无法修炼');
  if (typeof spiritRoot === 'object' && 'description' in spiritRoot && spiritRoot.description) {
    return String(spiritRoot.description);
  }
  const rootObj = spiritRoot as unknown as Record<string, unknown>;
  if (typeof spiritRoot === 'object' && (rootObj.描述 || rootObj.description)) return String(rootObj.描述 ?? rootObj.description);
  return t('此灵根可用于修炼');
};

const getAnimalStageDisplay = (): string => {
  const realm = playerStatus.value?.境界;
  if (!realm) return t('妖兽阶段');
  return `${formatRealmDisplay(realm)} · ${t('蜕变中')}`;
};

const isAnimalStage = (realm?: string): boolean => {
  if (!realm) return false;
  return realm.includes('妖兽') || realm.includes('灵兽');
};

const hasValidCultivation = (): boolean => {
  const realm = playerStatus.value?.境界;
  if (!realm) return false;
  if (isAnimalStage(realm.名称)) return false;
  // 凡人境界不显示修为瓶颈
  if (realm.名称 === '凡人') return false;
  const max = Number(realm.下一级所需 ?? 0);
  return max > 0;
};

const waitingStageText = computed(() => {
  const desc = playerStatus.value?.境界?.突破描述;
  if (desc) return `${t('等待仙缘')} · ${desc}`;
  return t('等待仙缘');
});

const getCultivationProgress = (): number => {
  const realm = playerStatus.value?.境界;
  if (!realm) return 0;
  const current = Number(realm.当前进度 ?? 0);
  const max = Number(realm.下一级所需 ?? 0);
  if (!max) return 0;
  return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
};

const formatCultivationText = (): string => {
  const realm = playerStatus.value?.境界;
  if (!realm) return '';
  const current = Number(realm.当前进度 ?? 0);
  const max = Number(realm.下一级所需 ?? 0);
  const target = String(realm.突破描述 ?? t('下一步'));
  if (!max) return target;
  return `${current} / ${max} · ${target}`;
};

const getTalentTierName = (tier: TalentTier | string | undefined): string => {
  if (!tier) return t('普通');
  if (typeof tier === 'string') return t(tier);
  if (typeof tier === 'object' && 'name' in tier) return t(tier.name);
  return t('普通');
};

const getTalentList = (talents: unknown): Array<{name: string, description: string}> => {
  if (!talents) return [];
  if (Array.isArray(talents)) {
    return talents.map((t: Record<string, unknown>) => ({
      name: (t.名称 || t.name || '') as string,
      description: (t.描述 || t.description || '') as string
    }));
  }
  return [];
};

const toggleTechniqueDetails = () => {
  showTechniqueDetails.value = !showTechniqueDetails.value;
};

const getItemQualityClass = (item: { 品质?: ItemQuality | { quality: string } | string } | null): string => {
  if (!item?.品质) return 'quality-common';
  const quality = typeof item.品质 === 'string' ? item.品质 : (item.品质 as ItemQuality).quality;
  const q = String(quality || '凡').trim();
  const map: Record<string, string> = {
    仙: 'xian',
    神: 'shen',
    圣: 'sheng',
    道: 'dao',
    天: 'tian',
    地: 'di',
    玄: 'xuan',
    黄: 'huang',
    凡: 'common',
  };
  return `quality-${map[q] ?? 'common'}`;
};

const showSkillDetails = (skill: LearnedSkillDisplay) => {
  selectedSkill.value = skill;
  showSkillModal.value = true;
};

const getSkillModalContent = () => {
  return selectedSkill.value;
};

const toggleDaoDetails = () => {
  showDaoDetails.value = !showDaoDetails.value;
};

const showDaoInfo = (daoName: string) => {
  selectedDao.value = daoName;
  showDaoModal.value = true;
};

const getDaoProgress = (daoName: string): number => {
  const dao = daoList.value[daoName];
  if (!dao) return 0;
  const current = Number(dao.当前经验 ?? 0);
  const total = Number(dao.总经验 ?? 0);
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((current / total) * 100)));
};

const getDaoModalContent = () => {
  if (!selectedDao.value) return null;
  const dao = daoList.value[selectedDao.value];
  if (!dao) return null;

  const stageIndex = Number(dao.当前阶段 ?? 0);
  const stageList = dao.阶段列表;
  let stageName = t('入门');

  if (Array.isArray(stageList) && stageList.length > 0 && stageList[stageIndex]) {
    stageName = stageList[stageIndex]?.名称 || t('入门');
  } else if (typeof dao.当前阶段 === 'string') {
    stageName = dao.当前阶段;
  }

  const current = Number(dao.当前经验 ?? 0);
  const total = Number(dao.总经验 ?? 0);

  return {
    name: dao.道名 as string,
    progressPercent: getDaoProgress(dao.道名 as string),
    description: String(dao.描述 ?? t('此道奥妙无穷')),
    stage: String(stageName),
    exp: total ? `${current} / ${total}` : String(current),
  };
};

const closeModals = () => {
  showSkillModal.value = false;
  showDaoModal.value = false;
  showSpiritRootModal.value = false;
  showOriginModal.value = false;
};
</script>

<style scoped>
/* ========== 仙途主题变量 ========== */
.character-details-wrapper {
  /* 主色调 - 深邃星空 */
  --xiantu-bg-deep: #080c14;
  --xiantu-bg-base: #0d1320;
  --xiantu-bg-elevated: #131a2b;

  /* 卡片背景 */
  --card-bg: rgba(19, 26, 43, 0.85);
  --card-bg-hover: rgba(25, 34, 55, 0.9);

  /* 边框色 */
  --border-color: rgba(100, 180, 220, 0.12);
  --border-hover: rgba(100, 180, 220, 0.35);
  --border-active: rgba(100, 200, 255, 0.5);

  /* 文字色 */
  --text-primary: #e8eef5;
  --text-secondary: #a0aec0;
  --text-muted: #64748b;
  --text-highlight: #f0f6ff;

  /* 主题强调色 - 灵韵青 */
  --accent-primary: #5cc4e8;
  --accent-primary-dim: rgba(92, 196, 232, 0.15);
  --accent-primary-glow: rgba(92, 196, 232, 0.4);

  /* 辅助强调色 - 仙金 */
  --accent-gold: #e8c55c;
  --accent-gold-dim: rgba(232, 197, 92, 0.15);

  /* 功能色 */
  --accent-green: #5ce8a0;
  --accent-red: #e85c6c;
  --accent-purple: #a87ce8;
  --accent-blue: #5c8ce8;
  --accent-orange: #e8a05c;

  /* 圆角 */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;

  /* 阴影 */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
}

/* ========== 主容器 ========== */
.character-details-wrapper {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--xiantu-bg-base);
  padding: 16px;
  position: relative;
}

/* 格子纹理背景 */
.character-details-wrapper::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(92, 196, 232, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(92, 196, 232, 0.02) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
  z-index: 0;
}

.character-details-wrapper > * {
  position: relative;
  z-index: 1;
}

@media (min-width: 640px) {
  .character-details-wrapper {
    padding: 20px;
  }
}

@media (min-width: 1024px) {
  .character-details-wrapper {
    padding: 24px;
  }
}

/* ========== 自定义滚动条 ========== */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, var(--accent-cyan), #00ffc8);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--accent-cyan);
}

/* ========== 状态容器 ========== */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 16px;
  padding: 40px 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-cyan);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.state-text {
  color: var(--text-secondary);
  font-size: 14px;
}

.error-icon-wrapper {
  color: var(--accent-red);
  opacity: 0.8;
}

.retry-btn {
  padding: 10px 24px;
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--accent-cyan);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: rgba(0, 212, 255, 0.1);
  border-color: var(--border-hover);
}

/* ========== 玻璃面板基础样式 ========== */
.glass-panel {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(10px);
  position: relative;
}

.glass-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.3), transparent);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

/* ========== 顶部角色卡片 ========== */
.character-header-card {
  padding: 16px;
  margin-bottom: 16px;
}

@media (min-width: 640px) {
  .character-header-card {
    padding: 20px;
    margin-bottom: 20px;
  }
}

.header-bg-decoration {
  display: none;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 768px) {
  .header-content {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 20px;
  }
}

@media (min-width: 1200px) {
  .header-content {
    flex-wrap: nowrap;
    align-items: center;
  }
}

/* ========== 头像区域 ========== */
.profile-section {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.avatar-container {
  position: relative;
  flex-shrink: 0;
}

.avatar-circle {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.3);
  transition: all 0.2s ease;
}

@media (min-width: 640px) {
  .avatar-circle {
    width: 64px;
    height: 64px;
  }
}

.avatar-text {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent-cyan);
}

@media (min-width: 640px) {
  .avatar-text {
    font-size: 26px;
  }
}

.realm-aura {
  display: none;
}

/* 境界颜色变体 */
.avatar-circle[data-realm="qi-refining"] {
  background: rgba(156, 163, 175, 0.1);
  border-color: rgba(156, 163, 175, 0.3);
}
.avatar-circle[data-realm="qi-refining"] .avatar-text { color: #9ca3af; }

.avatar-circle[data-realm="foundation"] {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
}
.avatar-circle[data-realm="foundation"] .avatar-text { color: #10b981; }

.avatar-circle[data-realm="golden-core"] {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
}
.avatar-circle[data-realm="golden-core"] .avatar-text { color: #3b82f6; }

.avatar-circle[data-realm="nascent-soul"] {
  background: rgba(168, 85, 247, 0.1);
  border-color: rgba(168, 85, 247, 0.3);
}
.avatar-circle[data-realm="nascent-soul"] .avatar-text { color: #a855f7; }

.avatar-circle[data-realm="soul-formation"] {
  background: rgba(236, 72, 153, 0.1);
  border-color: rgba(236, 72, 153, 0.3);
}
.avatar-circle[data-realm="soul-formation"] .avatar-text { color: #ec4899; }

.avatar-circle[data-realm="void-refining"] {
  background: rgba(249, 115, 22, 0.1);
  border-color: rgba(249, 115, 22, 0.3);
}
.avatar-circle[data-realm="void-refining"] .avatar-text { color: #f97316; }

.avatar-circle[data-realm="body-integration"] {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}
.avatar-circle[data-realm="body-integration"] .avatar-text { color: #ef4444; }

.avatar-circle[data-realm="tribulation"],
.avatar-circle[data-realm="custom"] {
  background: rgba(255, 215, 0, 0.1);
  border-color: rgba(255, 215, 0, 0.3);
}
.avatar-circle[data-realm="tribulation"] .avatar-text,
.avatar-circle[data-realm="custom"] .avatar-text { color: #ffd700; }

/* ========== 身份信息 ========== */
.identity-info {
  min-width: 0;
}

.character-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  line-height: 1.2;
}

@media (min-width: 640px) {
  .character-name {
    font-size: 24px;
  }
}

.text-gradient {
  background: linear-gradient(90deg, var(--accent-cyan), #00ffc8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.character-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.tag-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  font-size: 12px;
  border-radius: var(--radius-sm);
  font-weight: 500;
}

.tag-badge.gender.male {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.tag-badge.gender.female {
  background: rgba(236, 72, 153, 0.15);
  color: #f472b6;
  border: 1px solid rgba(236, 72, 153, 0.3);
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  font-size: 12px;
  background: rgba(0, 212, 255, 0.08);
  border: 1px solid rgba(0, 212, 255, 0.2);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
}

.link-chip {
  cursor: pointer;
  transition: all 0.2s ease;
}

.link-chip:hover {
  background: rgba(92, 196, 232, 0.15);
  border-color: rgba(92, 196, 232, 0.4);
  color: var(--accent-primary);
}

/* ========== 核心数值区域 ========== */
.stats-overview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

@media (min-width: 480px) {
  .stats-overview {
    flex-direction: row;
    flex-wrap: wrap;
  }
}

@media (min-width: 768px) {
  .stats-overview {
    flex: 1;
    min-width: 280px;
  }
}

.stat-mini-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--xiantu-bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  min-width: 120px;
  flex: 1 1 auto;
}

.icon-box {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-box.realm {
  color: var(--accent-gold);
}

.icon-box.spirit {
  color: var(--accent-primary);
}

.icon-box.location {
  color: var(--accent-green);
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stat-info .label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-info .value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-info .value.wrap {
  white-space: normal;
  word-break: break-all;
  line-height: 1.3;
}

.stat-info .value.highlight {
  color: var(--accent-gold);
}

/* ========== 修为进度区域 ========== */
.cultivation-block {
  flex-shrink: 0;
  min-width: 180px;
  max-width: 100%;
}

@media (min-width: 768px) {
  .cultivation-block {
    max-width: 240px;
  }
}

.animal-stage,
.waiting-stage {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--xiantu-bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 13px;
}

.floating-icon {
  color: var(--accent-green);
}

.progress-wrapper {
  padding: 12px 16px;
  background: var(--xiantu-bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.progress-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 12px;
  color: var(--text-muted);
}

.progress-percent {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-primary);
}

.progress-track {
  height: 6px;
  background: rgba(92, 196, 232, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-primary), #7dd8f0);
  border-radius: 3px;
  position: relative;
}

.flow-effect {
  display: none;
}

.progress-details {
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
}

/* ========== 标签页导航 ========== */
.tabs-nav-wrapper {
  margin-bottom: 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.tabs-nav-wrapper::-webkit-scrollbar {
  display: none;
}

.tabs-nav {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--xiantu-bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  min-width: max-content;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  white-space: nowrap;
}

.nav-tab:hover {
  color: var(--text-secondary);
  background: rgba(92, 196, 232, 0.05);
}

.nav-tab.active {
  color: var(--accent-primary);
  background: rgba(92, 196, 232, 0.1);
}

.active-indicator {
  display: none;
}

/* ========== 内容面板和网格 ========== */
.tab-pane {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.pane-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 768px) {
  .pane-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.info-card {
  padding: 16px;
}

@media (min-width: 640px) {
  .info-card {
    padding: 20px;
  }
}

.info-card.full-width {
  grid-column: 1 / -1;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.card-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-icon {
  color: var(--text-muted);
  width: auto;
  height: auto;
  background: none;
  border: none;
  border-radius: 0;
  font-size: inherit;
}

.header-icon.red { color: var(--accent-red); }
.header-icon.blue { color: var(--accent-blue); }
.header-icon.gold { color: var(--accent-gold); }
.header-icon.purple { color: var(--accent-purple); }
.header-icon.ink { color: var(--text-secondary); }

/* ========== 生命值条 ========== */
.vitals-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vital-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vital-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.vital-name {
  font-size: 12px;
  color: var(--text-secondary);
}

.vital-nums {
  font-size: 12px;
  color: var(--text-muted);
  font-family: monospace;
}

.vital-nums .divider {
  opacity: 0.5;
  margin: 0 2px;
}

.vital-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  overflow: hidden;
}

.vital-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.vital-bar.red-bar { background: var(--accent-red); }
.vital-bar.blue-bar { background: var(--accent-blue); }
.vital-bar.gold-bar { background: var(--accent-gold); }
.vital-bar.purple-bar { background: var(--accent-purple); }

.reputation-badge {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--xiantu-bg-elevated);
  border-radius: var(--radius-sm);
  margin-top: 4px;
}

.rep-label {
  font-size: 12px;
  color: var(--text-muted);
}

.rep-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--accent-gold);
}

/* ========== 天赋灵根 ========== */
.talent-layout {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.spirit-root-banner {
  padding: 14px 16px;
  border-radius: var(--radius-md);
  position: relative;
  overflow: hidden;
}

.spirit-root-banner.spirit-common {
  background: rgba(156, 163, 175, 0.1);
  border: 1px solid rgba(156, 163, 175, 0.2);
}

.spirit-root-banner.spirit-earth {
  background: rgba(92, 196, 232, 0.1);
  border: 1px solid rgba(92, 196, 232, 0.25);
}

.spirit-root-banner.spirit-divine {
  background: var(--accent-gold-dim);
  border: 1px solid rgba(232, 197, 92, 0.3);
}

.banner-content {
  position: relative;
  z-index: 1;
}

.root-type {
  font-size: 11px;
  color: var(--text-muted);
  display: block;
  margin-bottom: 4px;
}

.root-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.root-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.root-grade.badge {
  font-size: 11px;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
}

.tap-hint {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 6px;
  display: block;
}

.banner-bg-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.08;
  color: var(--text-primary);
}

.banner-bg-icon svg {
  width: 48px;
  height: 48px;
}

.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.clickable:hover {
  border-color: var(--border-hover);
}

/* ========== 天赋标签 ========== */
.talents-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.talent-chip {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: var(--radius-sm);
  background: var(--xiantu-bg-elevated);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.talent-chip.tier-chip {
  display: flex;
  align-items: center;
  gap: 6px;
}

.chip-label {
  color: var(--text-muted);
}

.chip-val.tier-text {
  color: var(--accent-primary);
  font-weight: 500;
}

.talent-chip.trait-chip {
  color: var(--accent-purple);
  background: rgba(168, 124, 232, 0.1);
  border-color: rgba(168, 124, 232, 0.2);
}

.talent-chip.empty {
  color: var(--text-muted);
  font-style: italic;
}

/* ========== 六司属性 ========== */
.attributes-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.attr-group.final {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

@media (min-width: 640px) {
  .attr-group.final {
    grid-template-columns: repeat(6, 1fr);
  }
}

.attr-box {
  text-align: center;
  padding: 12px 8px;
  background: var(--xiantu-bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.attr-box .attr-key {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.attr-box .attr-val {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: var(--accent-primary);
}

.attr-divider {
  text-align: center;
  position: relative;
  padding: 8px 0;
}

.attr-divider::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
}

.attr-divider span {
  position: relative;
  background: var(--card-bg);
  padding: 0 12px;
  font-size: 11px;
  color: var(--text-muted);
}

.attr-breakdown {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.breakdown-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mini-attr {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--xiantu-bg-elevated);
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.mini-attr .k {
  color: var(--text-muted);
}

.mini-attr .v {
  color: var(--text-secondary);
}

.mini-attr.green .v {
  color: var(--accent-green);
}

/* ========== 功法卡片 ========== */
.technique-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.technique-master-card {
  padding: 14px 16px;
  background: var(--xiantu-bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.tm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.tm-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.tm-badges {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tm-badges .badge {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--accent-gold-dim);
  color: var(--accent-gold);
  border-radius: var(--radius-sm);
}

.transition-icon {
  color: var(--text-muted);
  transition: transform 0.2s ease;
}

.rotate-180 {
  transform: rotate(180deg);
}

.tm-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--text-muted);
}

.tm-progress .bar-bg {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
  overflow: hidden;
}

.tm-progress .bar-fg {
  height: 100%;
  background: var(--accent-gold);
  border-radius: 2px;
}

/* 功法详情面板 */
.technique-detail-panel {
  padding: 14px;
  background: var(--xiantu-bg-deep);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.detail-section {
  margin-bottom: 12px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 6px;
  text-transform: uppercase;
}

.desc-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

.effects-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.effect-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.effect-icon {
  color: var(--accent-primary);
}

.effect-label {
  color: var(--text-muted);
}

.effect-value {
  color: var(--accent-green);
  font-weight: 500;
  margin-left: auto;
}

/* ========== 技能网格 ========== */
.skills-grid-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}

.skill-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--xiantu-bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.skill-icon-placeholder {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-primary-dim);
  border-radius: var(--radius-sm);
  color: var(--accent-primary);
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.skill-info {
  flex: 1;
  min-width: 0;
}

.skill-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.skill-meta {
  font-size: 11px;
  color: var(--text-muted);
}

.skill-prof {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-primary);
}

/* ========== 三千大道 ========== */
.toggle-header {
  cursor: pointer;
}

.toggle-header:hover {
  background: rgba(255, 255, 255, 0.02);
}

.flex-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.text-mini {
  font-size: 11px;
  color: var(--text-muted);
}

.dao-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

@media (min-width: 640px) {
  .dao-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.dao-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--xiantu-bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.dao-char {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-gold-dim);
  border-radius: var(--radius-sm);
  color: var(--accent-gold);
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.dao-content {
  flex: 1;
  min-width: 0;
}

.dao-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.dao-progress-mini {
  height: 3px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
  overflow: hidden;
}

.dao-progress-mini .fill {
  height: 100%;
  background: var(--accent-gold);
  border-radius: 2px;
}

/* ========== 社交页面 ========== */
.stat-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-item.big-num {
  text-align: center;
  padding: 16px;
  background: var(--xiantu-bg-elevated);
  border-radius: var(--radius-md);
}

.stat-item.big-num span {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: var(--accent-primary);
}

.stat-item.big-num label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
  display: block;
}

.relationship-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.relationship-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--xiantu-bg-elevated);
  border-radius: var(--radius-md);
}

.rel-main {
  min-width: 0;
}

.rel-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.rel-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.rel-tag {
  padding: 1px 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.rel-tag.special {
  background: var(--accent-gold-dim);
  color: var(--accent-gold);
}

.rel-dot {
  opacity: 0.3;
}

.rel-fav {
  font-size: 14px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
}

.rel-fav.fav-high {
  background: rgba(92, 232, 160, 0.15);
  color: var(--accent-green);
}

.rel-fav.fav-mid {
  background: var(--accent-primary-dim);
  color: var(--accent-primary);
}

.rel-fav.fav-neutral {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
}

.rel-fav.fav-low {
  background: rgba(232, 92, 108, 0.15);
  color: var(--accent-red);
}

/* ========== 宗门信息 ========== */
.sect-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.kv {
  display: flex;
  justify-content: space-between;
  padding: 8px 10px;
  background: var(--xiantu-bg-elevated);
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.kv .k {
  color: var(--text-muted);
}

.kv .v {
  color: var(--text-secondary);
}

.kv .v.highlight {
  color: var(--accent-gold);
}

/* ========== 物品页面 ========== */
.inventory-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.inv-stat {
  text-align: center;
  padding: 14px;
  background: var(--xiantu-bg-elevated);
  border-radius: var(--radius-md);
}

.inv-stat .num {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--accent-primary);
}

.inv-stat .num.gold-text {
  color: var(--accent-gold);
}

.inv-stat .lbl {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
  display: block;
}

.spirit-stones-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

@media (min-width: 480px) {
  .spirit-stones-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stone-kv {
  display: flex;
  justify-content: space-between;
  padding: 8px 10px;
  background: var(--xiantu-bg-elevated);
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.stone-kv .k {
  color: var(--text-muted);
}

.stone-kv .v {
  color: var(--accent-gold);
  font-weight: 500;
}

/* 物品列表 */
.inventory-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
}

.inv-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--xiantu-bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.inv-main {
  min-width: 0;
}

.inv-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.inv-meta {
  font-size: 11px;
  color: var(--text-muted);
}

.inv-qty {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: monospace;
}

/* 品质颜色 */
.quality-xian .inv-name { color: #ff6b9d; }
.quality-shen .inv-name { color: #ffd700; }
.quality-sheng .inv-name { color: #ff8c00; }
.quality-dao .inv-name { color: #e85c6c; }
.quality-tian .inv-name { color: #a87ce8; }
.quality-di .inv-name { color: #5c8ce8; }
.quality-xuan .inv-name { color: #5ce8a0; }
.quality-huang .inv-name { color: #e8c55c; }
.quality-common .inv-name { color: var(--text-secondary); }

/* ========== 空状态占位符 ========== */
.empty-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: var(--text-muted);
  text-align: center;
}

.empty-placeholder p {
  margin: 8px 0 0;
  font-size: 13px;
}

.empty-placeholder.text-sm {
  padding: 20px 12px;
}

.empty-placeholder.text-sm p {
  font-size: 12px;
}

.count-badge {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--accent-primary-dim);
  color: var(--accent-primary);
  border-radius: 10px;
  margin-left: 6px;
}

/* ========== 弹窗样式 ========== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(8, 12, 20, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 1000;
}

.modal-card {
  width: 100%;
  max-width: 420px;
  max-height: 80vh;
  padding: 24px;
  position: relative;
}

.close-float {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-float:hover {
  background: rgba(232, 92, 108, 0.1);
  border-color: var(--accent-red);
  color: var(--accent-red);
}

.modal-inner {
  padding-right: 24px;
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.modal-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0 0 16px;
}

.modal-body-scroller {
  max-height: 50vh;
  overflow-y: auto;
}

/* 弹窗详情网格 */
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}

.d-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: var(--xiantu-bg-elevated);
  border-radius: var(--radius-sm);
}

.d-item label {
  font-size: 11px;
  color: var(--text-muted);
}

.d-item span {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.d-item span.highlight {
  color: var(--accent-green);
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.tag-pill {
  padding: 4px 10px;
  font-size: 12px;
  background: var(--accent-primary-dim);
  color: var(--accent-primary);
  border-radius: var(--radius-sm);
}

.d-desc-box {
  padding: 12px;
  background: var(--xiantu-bg-elevated);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* 大进度条 */
.progress-big {
  height: 24px;
  background: var(--xiantu-bg-elevated);
  border-radius: var(--radius-md);
  overflow: hidden;
  position: relative;
  margin-bottom: 14px;
}

.progress-big .fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-gold), #f0d878);
  border-radius: var(--radius-md);
}

.progress-big .text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.skill-stat-row {
  padding: 10px 12px;
  background: var(--xiantu-bg-elevated);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-secondary);
}

/* ========== 过渡动画 ========== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
