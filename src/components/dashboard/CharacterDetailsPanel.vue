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

              <!-- 属性状态组 -->
              <section class="info-card glass-panel">
                 <div class="card-header">
                  <Heart :size="20" class="header-icon red" />
                  <h3>{{ t('生命本源') }}</h3>
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
    hasThree ||
    hasText('胸部描述') ||
    hasText('私处描述') ||
    hasText('生殖器描述')
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

  const bonus =
    typeof rootObj.修炼加成 === 'number'
      ? rootObj.修炼加成
      : (typeof rootObj.修炼加成 === 'string' ? Number(rootObj.修炼加成) : null);
  if (typeof bonus === 'number' && !isNaN(bonus)) {
    const pct = bonus * 100;
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
  .divider{
    background-color: #ffffff00;
  }
/*
   核心设计理念：
   1. 磨砂玻璃 (Glassmorphism) 作为主要容器风格
   2. 渐变色作为修仙气息的点缀
   3. 高级灰/深色模式适配
*/

/* 基础容器 */
.character-details-wrapper {
  padding: 1.5rem;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  container-type: inline-size;
  color: var(--color-text);
  background: radial-gradient(circle at top left, rgba(var(--color-primary-rgb), 0.05), transparent 40%),
              var(--color-background);
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* 玻璃拟态面板通用类 */
.glass-panel {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

/* 状态容器 (Loading/Error) */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1.5rem;
}
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(var(--color-primary-rgb), 0.2);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
.retry-btn {
  padding: 0.6rem 2rem;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  transition: opacity 0.2s;
}
.retry-btn:hover { opacity: 0.9; }

/* 头部卡片增强 */
.character-header-card {
  position: relative;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, rgba(var(--color-surface-rgb), 0.8), rgba(var(--color-background-rgb), 0.9));
}

.header-bg-decoration {
  position: absolute;
  top: -50%; left: -50%; width: 200%; height: 200%;
  background: radial-gradient(circle, rgba(var(--color-primary-rgb), 0.08) 0%, transparent 60%);
  pointer-events: none;
  animation: breathe 8s ease-in-out infinite;
}

.header-content {
  display: grid;
  grid-template-columns: 1.4fr 1.2fr 1fr;
  gap: 2rem;
  position: relative;
  z-index: 2;
  align-items: center;
}

/* 头像区域 */
.profile-section {
  display: flex;
  gap: 1.2rem;
  align-items: center;
  min-width: 0;
}
.avatar-container {
  position: relative;
  --avatar-size: 80px;
  width: var(--avatar-size);
  height: var(--avatar-size);
  flex: 0 0 var(--avatar-size);
  min-width: var(--avatar-size);
}
.avatar-circle {
  width: 100%; height: 100%;
  border-radius: 50%;
  background: var(--color-surface);
  border: 2px solid rgba(255,255,255,0.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 2rem; font-weight: bold;
  color: var(--color-text);
  box-shadow: 0 0 15px rgba(0,0,0,0.2);
  position: relative; z-index: 2;
  aspect-ratio: 1 / 1;
}

.identity-info { min-width: 0; }

/* 境界光效 */
.avatar-circle[data-realm='mortal'] { border-color: #a0a0a0; }
.avatar-circle[data-realm='qi-refining'] { border-color: #90cdf4; color: #90cdf4; }
.avatar-circle[data-realm='foundation'] { border-color: #68d391; color: #68d391; }
.avatar-circle[data-realm='golden-core'] { border-color: #ffd700; color: #ffd700; }
.avatar-circle[data-realm='nascent-soul'] { border-color: #f687b3; color: #f687b3; }
.avatar-circle[data-realm='soul-formation'] { border-color: #b794f4; color: #b794f4; }
.avatar-circle[data-realm='void-refining'] { border-color: #63b3ed; color: #63b3ed; }
.avatar-circle[data-realm='body-integration'] { border-color: #fc8181; color: #fc8181; }
.avatar-circle[data-realm='tribulation'] { border-color: #faf089; color: #faf089; }
/* 自定义境界 - 使用渐变色彩 */
.avatar-circle[data-realm='custom'] { border-color: #a78bfa; color: #a78bfa; }

.realm-aura {
  position: absolute; inset: -5px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent, var(--color-primary), transparent);
  animation: spin 4s linear infinite;
  opacity: 0.5;
  filter: blur(8px);
}

.character-name {
  font-size: 1.8rem;
  margin: 0 0 0.5rem 0;
  font-weight: 800;
  letter-spacing: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.text-gradient {
  background: linear-gradient(to right, var(--color-text), var(--color-primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.character-tags {
  display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem;
  font-size: 0.9rem; color: var(--color-text-secondary);
}
.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  font: inherit;
}
.link-chip {
  appearance: none;
  -webkit-appearance: none;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  user-select: none;
  color: var(--color-text-secondary);
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}
.link-chip:hover {
  color: var(--color-text);
  border-color: rgba(var(--color-primary-rgb), 0.35);
  background: rgba(var(--color-primary-rgb), 0.08);
}
.link-chip:active { transform: translateY(1px); }
.link-chip { outline: none; }
.tag-badge {
  padding: 0.1rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}
.tag-badge.male { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
.tag-badge.female { background: rgba(236, 72, 153, 0.15); color: #f472b6; }
.divider-dot { width: 3px; height: 3px; background: var(--color-background); border-radius: 50%; opacity: 0.5; }
.click-text { cursor: pointer; border-bottom: 1px dashed currentColor; transition: color 0.2s; }
.click-text:hover { color: var(--color-primary); }

/* 中间数值区 */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 1rem;
  align-items: stretch;
}
.stat-mini-card {
  display: flex; align-items: center; gap: 0.8rem;
  padding: 0.8rem;
  background: rgba(0,0,0,0.1);
  border-radius: 12px;
  min-width: 0;
}
.icon-box {
  width: 36px; height: 36px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: #fff;
}
.icon-box.realm { background: linear-gradient(135deg, #6366f1, #4f46e5); }
.icon-box.spirit { background: linear-gradient(135deg, #ec4899, #be185d); }
.icon-box.location { background: linear-gradient(135deg, #10b981, #059669); }
.stat-info { display: flex; flex-direction: column; line-height: 1.2; }
.stat-info .label { font-size: 0.75rem; color: var(--color-text-secondary); }
.stat-info .value { font-weight: 700; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
.stat-info .value.wrap { white-space: normal; overflow: visible; text-overflow: clip; }
.stat-info .value.highlight { color: var(--color-primary); }

/* 修为进度条 */
.cultivation-block {
    padding-left: 1rem;
    border-left: 1px solid rgba(255,255,255,0.1);
}
.progress-wrapper { width: 100%; }
.progress-top { display: flex; justify-content: space-between; margin-bottom: 0.4rem; font-size: 0.85rem;}
.progress-track {
    height: 8px;
    background: rgba(0,0,0,0.3);
    border-radius: 4px;
    overflow: hidden;
    position: relative;
}
.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
    position: relative;
    border-radius: 4px;
    transition: width 0.5s ease;
}
.flow-effect {
    position: absolute; top: 0; left: 0; bottom: 0; right: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    transform: translateX(-100%);
    animation: flow 2s infinite;
}
.progress-details { margin-top: 0.4rem; font-size: 0.75rem; color: var(--color-text-secondary); text-align: right; }

/* 导航 */
.tabs-nav-wrapper { margin-bottom: 1.5rem; }
.tabs-nav {
  display: flex;
  gap: 1rem;
  border-bottom: 2px solid rgba(255,255,255,0.05);
  padding-bottom: 2px;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
}
.tabs-nav::-webkit-scrollbar { height: 0; }
.nav-tab {
    background: none; border: none;
    color: var(--color-text-secondary);
    padding: 0.8rem 1.2rem;
    font-size: 1rem;
    cursor: pointer;
    display: flex; align-items: center; gap: 0.5rem;
    position: relative;
    transition: all 0.3s;
    flex: 0 0 auto;
    white-space: nowrap;
}
.nav-tab:hover { color: var(--color-text); }
.nav-tab.active { color: var(--color-primary); font-weight: 600; }
.active-indicator {
    position: absolute; bottom: -4px; left: 0; width: 100%; height: 3px;
    background: var(--color-primary);
    border-radius: 3px 3px 0 0;
    box-shadow: 0 -2px 8px rgba(var(--color-primary-rgb), 0.5);
}

/* 内容网格 */
.pane-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
    gap: 1.5rem;
}
.full-width { grid-column: 1 / -1; }

.info-card { padding: 1.2rem; display: flex; flex-direction: column; gap: 1rem; }
.card-header { display: flex; align-items: center; gap: 0.8rem; margin-bottom: 0.5rem; }
.card-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; }
.header-icon { padding: 6px; border-radius: 8px; background: rgba(255,255,255,0.05); }
.header-icon.red { color: #f87171; background: rgba(248, 113, 113, 0.1); }
.header-icon.blue { color: #60a5fa; background: rgba(96, 165, 250, 0.1); }
.header-icon.purple { color: #c084fc; background: rgba(192, 132, 252, 0.1); }
.header-icon.gold { color: #fbbf24; background: rgba(251, 191, 36, 0.1); }
.header-icon.ink { color: #e5e7eb; background: rgba(229, 231, 235, 0.06); }

.empty-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 1.25rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.12);
  border: 1px dashed rgba(255, 255, 255, 0.08);
  color: var(--color-text-secondary);
  text-align: center;
}
.text-sm { font-size: 0.9rem; }

/* 状态条组件 */
.vital-row { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.8rem; }
.vital-meta { display: flex; justify-content: space-between; font-size: 0.85rem; }
.vital-name { font-weight: 600; }
.vital-track { height: 10px; background: rgba(0,0,0,0.2); border-radius: 5px; overflow: hidden; }
.vital-bar { height: 100%; border-radius: 5px; }
.vital-bar.red-bar { background: linear-gradient(90deg, #ef4444, #f87171); box-shadow: 0 0 8px rgba(239, 68, 68, 0.4); }
.vital-bar.blue-bar { background: linear-gradient(90deg, #3b82f6, #60a5fa); box-shadow: 0 0 8px rgba(59, 130, 246, 0.4); }
.vital-bar.gold-bar { background: linear-gradient(90deg, #f59e0b, #fbbf24); box-shadow: 0 0 8px rgba(245, 158, 11, 0.4); }

.reputation-badge {
    display: flex; justify-content: space-between; padding: 0.5rem 0.8rem;
    background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); margin-top: auto;
}
.rep-value { font-weight: bold; color: var(--color-accent); }

/* 天赋灵根区 */
.spirit-root-banner {
    position: relative;
    padding: 1rem; border-radius: 12px;
    background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.2), rgba(var(--color-primary-rgb), 0.05));
    border: 1px solid rgba(var(--color-primary-rgb), 0.3);
    margin-bottom: 1rem;
    overflow: hidden;
}
/* 灵根样式复用你的 class 逻辑，这里做通用处理 */
.spirit-divine { background: linear-gradient(135deg, #4c1d95 0%, #2e1065 100%); border-color: #a78bfa; color: #fff; }
.spirit-earth { background: linear-gradient(135deg, #064e3b 0%, #052e16 100%); border-color: rgba(52, 211, 153, 0.6); color: #ecfdf5; }
.spirit-common { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }

.banner-content { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 0.4rem; }
.root-type { font-size: 0.75rem; text-transform: uppercase; opacity: 0.8; }
.root-main { display: flex; align-items: center; gap: 0.5rem; }
.root-name { font-size: 1.2rem; font-weight: bold; }
.root-grade { font-size: 0.75rem; padding: 2px 6px; background: rgba(0,0,0,0.2); border-radius: 4px; }
.banner-bg-icon { position: absolute; right: -10px; bottom: -10px; opacity: 0.1; transform: scale(3); }
.tap-hint { font-size: 0.7rem; margin-top: 0.5rem; opacity: 0.6; }

.talents-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.talent-chip { padding: 0.3rem 0.8rem; border-radius: 6px; font-size: 0.85rem; border: 1px solid transparent; }
.tier-chip { background: rgba(251, 191, 36, 0.1); border-color: rgba(251, 191, 36, 0.3); color: #fbbf24; display: flex; gap: 0.5rem;}
.tier-text { font-weight: bold; }
.trait-chip { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
.trait-chip:hover { border-color: var(--color-primary); }

/* 属性块 */
.attributes-wrapper { display: flex; flex-direction: column; gap: 1rem; }
.attr-group.final { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.8rem; }
.attr-box { background: rgba(var(--color-primary-rgb), 0.05); padding: 0.8rem; border-radius: 8px; text-align: center; border: 1px solid rgba(var(--color-primary-rgb), 0.1); }
.attr-key { display: block; font-size: 0.8rem; color: var(--color-text-secondary); margin-bottom: 0.2rem; }
.attr-val { font-size: 1.4rem; font-weight: 800; color: var(--color-primary); }

.attr-divider { text-align: center; font-size: 0.75rem; color: var(--color-text-secondary); position: relative; margin: 0.5rem 0; opacity: 0.6; }
.attr-divider::before, .attr-divider::after { content: ''; position: absolute; top: 50%; width: 35%; height: 1px; background: currentColor; }
.attr-divider::before { left: 0; } .attr-divider::after { right: 0; }

.attr-breakdown { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.85rem; }
.mini-attr { display: flex; justify-content: space-between; padding: 0.3rem 0; border-bottom: 1px dashed rgba(255,255,255,0.1); }
.mini-attr.green .v { color: #4ade80; }

/* 社交 & 物品 */
.stat-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
.stat-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.stat-item.big-num > span { font-size: 1.6rem; font-weight: 800; color: var(--color-text); line-height: 1; }
.stat-item.big-num > label { font-size: 0.85rem; color: var(--color-text-secondary); }

.relationship-list { display: flex; flex-direction: column; gap: 0.6rem; max-height: 320px; overflow: auto; padding-right: 0.4rem; }
.relationship-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.7rem 0.8rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.rel-main { min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
.rel-name { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rel-meta { font-size: 0.8rem; color: var(--color-text-secondary); display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; }
.rel-tag { padding: 0.1rem 0.45rem; border-radius: 999px; background: rgba(0, 0, 0, 0.18); border: 1px solid rgba(255, 255, 255, 0.06); }
.rel-tag.special { background: rgba(245, 158, 11, 0.14); border-color: rgba(245, 158, 11, 0.28); color: #fbbf24; }
.rel-dot { opacity: 0.6; }
.rel-fav {
  flex: 0 0 auto;
  min-width: 56px;
  text-align: right;
  font-weight: 800;
}
.fav-high { color: #4ade80; }
.fav-mid { color: #60a5fa; }
.fav-neutral { color: var(--color-text); opacity: 0.85; }
.fav-low { color: #fb7185; }

.sect-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.kv { display: flex; justify-content: space-between; gap: 0.8rem; padding: 0.6rem 0.75rem; border-radius: 12px; background: rgba(0,0,0,0.14); border: 1px solid rgba(255,255,255,0.05); }
.kv .k { color: var(--color-text-secondary); font-size: 0.85rem; }
.kv .v { font-weight: 700; }
.kv .v.highlight { color: var(--color-accent); }

.inventory-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
.inv-stat {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.inv-stat .num { font-size: 1.6rem; font-weight: 800; line-height: 1; }
.inv-stat .lbl { font-size: 0.85rem; color: var(--color-text-secondary); }
.gold-text { color: #fbbf24; }

.spirit-stones-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; }
.stone-kv {
  padding: 0.6rem 0.7rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.stone-kv .k { font-size: 0.8rem; color: var(--color-text-secondary); }
.stone-kv .v { font-weight: 800; }

.inventory-preview { display: flex; flex-direction: column; gap: 0.6rem; max-height: 320px; overflow: auto; padding-right: 0.4rem; }
.inv-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.7rem 0.8rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.inv-main { min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
.inv-name { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.inv-meta { font-size: 0.8rem; color: var(--color-text-secondary); }
.inv-qty { font-weight: 800; color: var(--color-text); opacity: 0.9; }

/* 品质点缀（只做轻量边框/光泽） */
.quality-common { border-color: rgba(255, 255, 255, 0.06); }
.quality-huang { border-color: rgba(250, 204, 21, 0.25); }
.quality-xuan { border-color: rgba(96, 165, 250, 0.25); }
.quality-di { border-color: rgba(52, 211, 153, 0.25); }
.quality-tian { border-color: rgba(192, 132, 252, 0.3); }
.quality-dao { border-color: rgba(251, 191, 36, 0.32); }
.quality-sheng { border-color: rgba(244, 114, 182, 0.3); }
.quality-shen { border-color: rgba(34, 211, 238, 0.3); }
.quality-xian { border-color: rgba(163, 230, 53, 0.3); }

/* 功法与技能 */
.technique-master-card {
    background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.08), rgba(0,0,0,0.15));
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 1.2rem;
    transition: all 0.3s;
}
.technique-master-card:hover {
    background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.12), rgba(0,0,0,0.2));
    border-color: rgba(var(--color-primary-rgb), 0.3);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}
.tm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; }
.tm-name { font-weight: 800; font-size: 1.15rem; color: var(--color-text); }
.tm-badges { display: flex; gap: 0.6rem; align-items: center; }
.tm-progress { display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; color: var(--color-text-secondary); }
.bar-bg { flex: 1; height: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden; position: relative; }
.bar-fg { height: 100%; background: linear-gradient(90deg, var(--color-primary), var(--color-accent)); border-radius: 4px; box-shadow: 0 0 8px rgba(var(--color-primary-rgb), 0.4); transition: width 0.3s ease; }

.technique-detail-panel {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.detail-section {
    margin-bottom: 1rem;
}

.detail-section:last-child {
    margin-bottom: 0;
}

.section-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    margin-bottom: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.desc-text {
    margin: 0;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    border-left: 3px solid var(--color-primary);
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--color-text);
}

.effects-box {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.effect-row {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 0.8rem 1rem;
    background: rgba(var(--color-primary-rgb), 0.08);
    border-radius: 8px;
    border: 1px solid rgba(var(--color-primary-rgb), 0.2);
}

.effect-icon {
    color: var(--color-primary);
}

.effect-label {
    flex: 1;
    font-weight: 600;
    color: var(--color-text);
}

.effect-value {
    color: #4ade80;
    font-weight: 800;
    font-size: 1rem;
}

/* 展开动画 */
.expand-enter-active, .expand-leave-active {
    transition: all 0.3s ease;
    overflow: hidden;
}
.expand-enter-from, .expand-leave-to {
    opacity: 0;
    max-height: 0;
}
.expand-enter-to, .expand-leave-from {
    opacity: 1;
    max-height: 500px;
}

.skills-grid-wrapper { display: flex; flex-direction: column; gap: 0.8rem; max-height: 250px; overflow-y: auto; padding-right: 0.5rem; }
.skill-card {
    display: flex; align-items: center; gap: 0.8rem;
    padding: 0.6rem; border-radius: 8px;
    background: rgba(255,255,255,0.03);
    border: 1px solid transparent;
    transition: all 0.2s;
}
.skill-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(var(--color-primary-rgb), 0.3); transform: translateX(2px); }
.skill-icon-placeholder { width: 32px; height: 32px; border-radius: 6px; background: #374151; display: flex; align-items: center; justify-content: center; font-weight: bold; }
.skill-info { flex: 1; }
.skill-name { font-weight: 600; font-size: 0.95rem; }
.skill-meta { font-size: 0.75rem; color: var(--color-text-secondary); }
.skill-prof { font-weight: bold; color: var(--color-primary); font-size: 0.9rem; }

/* 大道 */
.toggle-header { cursor: pointer; display: flex; justify-content: space-between; align-items: center; width: 100%; }
.flex-row { display: flex; align-items: center; gap: 0.8rem; }
.header-actions { display: flex; align-items: center; gap: 0.5rem; color: var(--color-text-secondary); }
.dao-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.8rem; padding-top: 1rem; }
.dao-pill { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem; background: rgba(0,0,0,0.2); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); }
.dao-pill:hover { border-color: var(--color-primary); }
.dao-char { width: 28px; height: 28px; border-radius: 50%; background: var(--color-text); color: var(--color-background); display: flex; align-items: center; justify-content: center; font-weight: bold; font-family: 'Kaiti', serif; }
.dao-content { flex: 1; min-width: 0; }
.dao-name { font-size: 0.9rem; margin-bottom: 2px; }
.dao-progress-mini { height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; }
.dao-progress-mini .fill { height: 100%; background: var(--color-text); }

/* 通用交互类 */
.clickable { cursor: pointer; user-select: none; }
.transition-icon { transition: transform 0.2s ease; }
.rotate-180 { transform: rotate(180deg); }

/* 过渡动画 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.25s ease-out; }
.slide-fade-enter-from { opacity: 0; transform: translateY(10px); }
.slide-fade-leave-to { opacity: 0; transform: translateY(-10px); }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.3s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

/* 关键帧 */
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes flow { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
@keyframes breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }

/* 滚动条美化 */
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }

/* 响应式适配 */
@media (max-width: 768px) {
  .header-content { grid-template-columns: 1fr; gap: 1.5rem; }
  .stats-overview { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
  .character-details-wrapper { padding: 1rem; }
  .tabs-nav { overflow-x: auto; padding-bottom: 0.5rem; }
  .nav-tab { white-space: nowrap; }
}

/* 侧栏/窄容器适配（按面板宽度，而不是按窗口宽度） */
@container (max-width: 620px) {
  .header-content { grid-template-columns: 1fr; gap: 1.25rem; }
  .cultivation-block { border-left: none; padding-left: 0; }
  .pane-grid { grid-template-columns: 1fr; }
  .attr-group.final { grid-template-columns: repeat(2, 1fr); }
  .spirit-stones-grid { grid-template-columns: repeat(2, 1fr); }
  .sect-grid { grid-template-columns: 1fr; }
}

@container (max-width: 420px) {
  .avatar-container { --avatar-size: 64px; }
  .nav-tab { padding: 0.65rem 0.85rem; font-size: 0.95rem; }
}

/* 模态框样式 */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); padding: 2rem;}
.modal-card { width: 100%; max-width: 500px; padding: 2rem; position: relative; background: var(--color-surface); max-height: 80vh; overflow-y: auto;}
.close-float { position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: var(--color-text-secondary); cursor: pointer; }
.modal-title { font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--color-primary); }
.modal-subtitle { margin: 0 0 1rem; font-size: 0.9rem; color: var(--color-text-secondary); }
.modal-body-scroller { max-height: 60vh; overflow: auto; padding-right: 0.5rem; }

.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin: 0.8rem 0 1rem; }
.d-item { display: flex; justify-content: space-between; gap: 1rem; padding: 0.6rem 0.75rem; border-radius: 12px; background: rgba(0,0,0,0.14); border: 1px solid rgba(255,255,255,0.06); }
.d-item label { color: var(--color-text-secondary); }
.d-item .highlight { color: var(--color-primary); font-weight: 800; }
.d-desc-box { padding: 0.9rem 1rem; border-radius: 12px; background: rgba(0,0,0,0.18); border: 1px solid rgba(255,255,255,0.06); line-height: 1.65; white-space: pre-wrap; }
.skill-stat-row { margin-top: 0.9rem; display: flex; justify-content: flex-end; color: var(--color-text-secondary); font-size: 0.9rem; }

.tags-row { display: flex; flex-wrap: wrap; gap: 0.45rem; margin: -0.2rem 0 1rem; }
.tag-pill { padding: 0.2rem 0.55rem; border-radius: 999px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); font-size: 0.85rem; color: var(--color-text-secondary); }

.progress-big { position: relative; height: 10px; background: rgba(0,0,0,0.3); border-radius: 999px; overflow: hidden; margin: 0.8rem 0 1.2rem; }
.progress-big .fill { height: 100%; background: linear-gradient(90deg, var(--color-primary), var(--color-accent)); border-radius: 999px; }
.progress-big .text { position: absolute; right: 0; top: -1.5rem; font-size: 0.85rem; color: var(--color-text-secondary); }
</style>
