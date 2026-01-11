<template>
  <div class="character-details-wrapper">
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>{{ t('加载角色数据..') }}</p>
    </div>

    <div v-else-if="!baseInfo || !saveData" class="error-container">
      <div class="error-icon">
        <AlertCircle :size="48" />
      </div>
      <p>{{ t('无法加载角色数据') }}</p>
      <button class="retry-btn" @click="refreshData">{{ t('重试') }}</button>
    </div>

    <div v-else-if="baseInfo" class="character-details-content">
      <!-- 顶部角色信息卡片 - 全新设计 -->
      <div class="character-header-card">
        <!-- 背景装饰 -->
        <div class="header-bg-decoration"></div>

        <!-- 主要信息区 -->
        <div class="header-content">
          <!-- 左侧：头像和基础信息 -->
          <div class="profile-section">
            <div class="avatar-wrapper">
              <div class="avatar-circle" :title="baseInfo.名字">
                <span class="avatar-text">{{ nameInitial }}</span>
              </div>
              <div class="avatar-glow"></div>
            </div>

            <div class="identity-info">
              <h1 class="character-title">{{ baseInfo.名字 }}</h1>
              <div class="character-subtitle">
                <template v-if="baseInfo.性别">
                  <span class="subtitle-item" :class="`gender-badge gender-${baseInfo.性别}`">
                    {{ (baseInfo.性别 === '男' ? '♂' : '♀') + ' ' + t(baseInfo.性别) }}
                  </span>
                  <span class="subtitle-divider">·</span>
                </template>
                <span class="subtitle-item race-text">{{ t(baseInfo.种族 || '人族') }}</span>
                <span class="subtitle-divider">·</span>
                <span class="subtitle-item age-text">{{ currentAge }}{{ t('岁') }}</span>
                <span class="subtitle-divider">·</span>
                <span class="subtitle-item origin-text">
                  {{ getOriginDisplay(baseInfo.出生) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 中间：核心数据卡片组 -->
          <div class="core-stats-grid">
            <!-- 境界卡片 -->
            <div class="stat-card realm-card">
              <div class="card-icon">
                <Mountain :size="20" />
              </div>
              <div class="card-content">
                <div class="card-label">{{ t('境界') }}</div>
                <div class="card-value realm-value">{{ formatRealmDisplay(playerStatus?.境界?.名称) || t('凡人') }}</div>
              </div>
            </div>

            <!-- 灵根卡片 -->
            <div class="stat-card spirit-card" v-if="baseInfo.灵根">
              <div class="card-icon">
                <Sparkles :size="20" />
              </div>
              <div class="card-content">
                <div class="card-label">{{ t('灵根') }}</div>
                <div class="card-value spirit-value">{{ formatSpiritRoot(baseInfo.灵根) }}</div>
              </div>
            </div>

            <!-- 位置卡片 -->
            <div class="stat-card location-card" v-if="playerLocation?.描述" :title="playerLocation.描述">
              <div class="card-icon">
                <MapPin :size="20" />
              </div>
              <div class="card-content">
                <div class="card-label">{{ t('位置') }}</div>
                <div class="card-value location-value">{{ playerLocation.描述 }}</div>
              </div>
            </div>

            <!-- 法身（仅酒馆端） -->
            <div
              v-if="isTavernEnvFlag"
              class="stat-card body-card clickable"
              @click="activeTab = 'body'"
              :title="t('点击查看身体档案')"
            >
              <div class="card-icon">
                <Heart :size="20" />
              </div>
              <div class="card-content">
                <div class="card-label">{{ t('法身') }}</div>
                <div class="card-value body-value">{{ bodySummary }}</div>
              </div>
            </div>

            <!-- 出生卡片 -->
            <div
              class="stat-card origin-card clickable"
              v-if="baseInfo.出生"
              @click="showOriginDetails(baseInfo.出生)"
              :title="typeof baseInfo.出生 === 'object' ? t('点击查看详情') : ''"
            >
              <div class="card-icon">
                <Sprout :size="20" />
              </div>
              <div class="card-content">
                <div class="card-label">{{ t('出生') }}</div>
                <div class="card-value origin-value">{{ getOriginDisplay(baseInfo.出生) }}</div>
              </div>
            </div>
          </div>

          <!-- 右侧：修为进度 -->
          <div class="cultivation-section">
            <div v-if="isAnimalStage(playerStatus?.境界?.名称)" class="cultivation-status mortal-status">
              <div class="status-icon">🌱</div>
              <div class="status-text">{{ getAnimalStageDisplay() }}</div>
            </div>
            <div v-else-if="hasValidCultivation()" class="cultivation-progress-card">
              <div class="progress-header">
                <span class="progress-label">{{ t('修为进度') }}</span>
                <span class="progress-percentage">{{ getCultivationProgress() }}%</span>
              </div>
              <div class="progress-bar-container">
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" :style="{ width: getCultivationProgress() + '%' }">
                    <div class="progress-bar-shine"></div>
                  </div>
                </div>
              </div>
              <div class="progress-text">{{ formatCultivationText() }}</div>
            </div>
            <div v-else class="cultivation-status waiting-status">
              <div class="status-icon"><Sparkles :size="18" /></div>
              <div class="status-text">{{ t('等待仙缘') }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 标签页导航 -->
      <div class="tabs-nav">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="['tab-btn', { active: activeTab === tab.id }]"
        >
          <component :is="tab.icon" :size="16" />
          <span>{{ t(tab.label) }}</span>
        </button>
      </div>

      <!-- 角色信息标签页 -->
      <div v-if="activeTab === 'character'" class="tab-content">
        <div class="content-grid">
          <!-- 生命状态 -->
      <div class="info-section">
        <h3 class="section-title">
          <div class="title-icon">
            <Heart :size="18" />
          </div>
          {{ t('生命状态') }}
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
              <!-- 声望显示 -->
              <div class="vital-item reputation-item">
                <div class="vital-label">{{ t('声望') }}</div>
                <div class="reputation-display">
                  <span class="reputation-value">
                    {{ playerStatus?.声望 || t('籍籍无名') }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 角色基础信息 -->
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <Users :size="18" />
              </div>
              {{ t('角色背景') }}
            </h3>
            <div class="basic-info-grid">
              <div class="basic-info-item">
                <span class="info-label">{{ t('境界') }}</span>
                <span class="info-value realm">{{ formatRealmDisplay(playerStatus?.境界) }}</span>
              </div>
              <div v-if="baseInfo.性别" class="basic-info-item">
                <span class="info-label">{{ t('性别') }}</span>
                <span class="info-value gender" :class="`gender-${baseInfo.性别}`">{{ t(baseInfo.性别) }}</span>
              </div>
              <div class="basic-info-item">
                <span class="info-label">{{ t('灵根') }}</span>
                <span class="info-value spirit-root" :class="`root-${getSpiritRootClass(baseInfo.灵根)}`">{{ getSpiritRootDisplay(baseInfo.灵根) }}</span>
              </div>
              <div class="basic-info-item">
                <span class="info-label">{{ t('年龄') }}</span>
                <span class="info-value">{{ currentAge }}{{ t('岁') }}</span>
              </div>
              <div v-if="playerLocation?.描述" class="basic-info-item">
                <span class="info-label">{{ t('位置') }}</span>
                <span class="info-value location">{{ playerLocation.描述 }}</span>
              </div>
              <div v-else-if="baseInfo.世界" class="basic-info-item">
                <span class="info-label">{{ t('世界') }}</span>
                <span class="info-value world">{{ baseInfo.世界 }}</span>
              </div>
            </div>
          </div>

          <!-- 天赋与灵根 -->
      <div class="info-section">
        <h3 class="section-title">
          <div class="title-icon">
            <Sparkles :size="18" />
          </div>
          {{ t('天赋与灵根') }}
        </h3>
        <div class="talent-content">
          <!-- 天资等级卡片 -->
          <div class="talent-tier-card">
            <div class="tier-header">
              <div class="tier-icon"><Star :size="18" /></div>
              <span class="tier-label">{{ t('天资等级') }}</span>
            </div>
            <div class="tier-value-display">
              <span class="tier-value" :class="`tier-${getTalentTierName(baseInfo.天资)}`">{{ getTalentTierName(baseInfo.天资) }}</span>
            </div>
            <div v-if="getTalentTierDescription(baseInfo.天资)" class="tier-description">
              {{ getTalentTierDescription(baseInfo.天资) }}
            </div>
          </div>

          <!-- 灵根属性卡片 (Re-designed) -->
          <div class="spirit-root-card" @click="showSpiritRootDetails">
            <div class="root-header">
              <div class="root-icon"><Zap :size="18" /></div>
              <span class="root-label">{{ t('灵根属性') }}</span>
              <span class="click-hint">{{ t('点击查看详情') }}</span>
            </div>
            <div class="root-main-info">
              <span class="root-name" :class="`root-${getSpiritRootClass(baseInfo.灵根)}`">
                {{ getSpiritRootDisplay(baseInfo.灵根) }}
              </span>
              <div class="property-badges">
                <span class="prop-badge grade-badge" :class="`grade-${getSpiritRootGrade(baseInfo.灵根) || '凡品'}`">
                  {{ t(getSpiritRootGrade(baseInfo.灵根) || '凡品') }}
                </span>
                <span class="prop-badge speed-badge">
                  {{ getSpiritRootCultivationSpeed(baseInfo) }}
                </span>
              </div>
            </div>
            <div v-if="getSpiritRootDescription(baseInfo.灵根)" class="root-description">
              {{ getSpiritRootDescription(baseInfo.灵根) }}
            </div>
            <div v-if="getSpiritRootEffects(baseInfo).length > 0" class="root-effects">
              <div class="effects-tags">
                <span v-for="effect in getSpiritRootEffects(baseInfo)" :key="effect" class="effect-tag">
                  {{ effect }}
                </span>
              </div>
            </div>
          </div>

          <!-- 天赋列表卡片 -->
          <div class="talents-card">
            <div class="talents-header">
              <div class="talents-icon"><Sparkles :size="18" /></div>
              <span class="talents-label">{{ t('天赋特质') }}</span>
              <span v-if="getTalentList(baseInfo.天赋)?.length" class="talents-count">({{ getTalentList(baseInfo.天赋).length }})</span>
            </div>
            <div v-if="getTalentList(baseInfo.天赋)?.length" class="talents-container">
              <div v-for="talent in getTalentList(baseInfo.天赋)" :key="talent.name"
                   class="talent-item" :title="talent.description">
                <div class="talent-name"><strong>{{ talent.name }}</strong></div>
                <div v-if="talent.description" class="talent-description-display">
                  {{ talent.description }}
                </div>
              </div>
            </div>
            <div v-else class="talents-container no-talents">
              <div class="talent-item no-talent">
                <div class="talent-name">{{ t('无') }}</div>
              </div>
            </div>
          </div>
        </div>
          </div>

          <!-- 六司属性 -->
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <BarChart3 :size="18" />
              </div>
              {{ t('六司属性') }}
            </h3>
            <div class="attributes-display">
              <!-- 最终属性 -->
              <div class="final-attributes">
                <h4 class="attribute-group-title">{{ t('最终六司') }}</h4>
                <div class="attributes-grid">
                  <div v-for="(value, key) in finalAttributes" :key="key" class="attribute-item final">
                    <span class="attr-name">{{ t(String(key)) }}</span>
                    <span class="attr-value">{{ value }}</span>
                  </div>
                </div>
              </div>

              <!-- 属性详情 -->
              <div class="attribute-breakdown">
                <div class="innate-attrs">
                  <h4 class="attribute-group-title">{{ t('先天六司') }}</h4>
                  <div class="attributes-grid compact">
                    <div v-for="(value, key) in innateAttributesWithDefaults" :key="key" class="attribute-item innate">
                      <span class="attr-name">{{ t(String(key)) }}</span>
                      <span class="attr-value">{{ value }}</span>
                    </div>
                  </div>
                </div>

                <div class="acquired-attrs">
                  <h4 class="attribute-group-title">{{ t('后天六司') }}</h4>
                  <div class="attributes-grid compact">
                    <div v-for="(value, key) in acquiredAttributes" :key="key" class="attribute-item acquired"
                         :class="{ 'has-bonus': value > 0 }">
                      <span class="attr-name">{{ t(String(key)) }}</span>
                      <span class="attr-value">{{ value > 0 ? `+${value}` : value }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- 身体档案标签页（仅酒馆端） -->
      <div v-if="isTavernEnvFlag && activeTab === 'body'" class="tab-content">
        <div class="content-grid">
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <Heart :size="18" />
              </div>
              {{ t('身体档案') }}
            </h3>
            <BodyStatsPanel :body-stats="bodyStats" :lifespan="lifespanForBodyPanel" />
          </div>
        </div>
      </div>

      <!-- 修炼体系标签页 -->
      <div v-if="activeTab === 'cultivation'" class="tab-content">
        <div class="content-grid">
          <!-- 修炼功法 -->
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <BookOpen :size="18" />
              </div>
              {{ t('修炼功法') }}
            </h3>
            <div v-if="!fullCultivationTechnique" class="empty-state">
              <div class="empty-icon">
                <BookOpen :size="32" />
              </div>
              <span>{{ t('尚未修炼功法') }}</span>
            </div>
            <div v-else class="cultivation-display">
              <div class="technique-info">
                <div class="technique-header" @click="toggleTechniqueDetails">
                  <div class="technique-main">
                    <h4 class="technique-name" :class="getItemQualityClass(fullCultivationTechnique, 'text')">
                      {{ fullCultivationTechnique?.名称 }}
                    </h4>
                    <div class="technique-quality">
                      {{ t(fullCultivationTechnique?.品质?.quality || '未知') }}{{ t('品') }}{{ fullCultivationTechnique?.品质?.grade ? `${fullCultivationTechnique.品质.grade}${t('阶')}` : '' }}</div>
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
                    <p>{{ t(fullCultivationTechnique?.描述 || '此功法奥妙无穷，随修炼加深方可领悟其真意。') }}</p>
                  </div>

                  <div v-if="hasTechniqueEffects && fullCultivationTechnique?.功法效果" class="technique-effects">
                    <h5 class="effects-title">{{ t('功法效果') }}</h5>
                    <div class="effects-list">
                      <div v-if="fullCultivationTechnique.功法效果.修炼速度加成" class="effect-item">
                        <span class="effect-label">{{ t('修炼加成：') }}</span>
                        <span class="effect-value">{{ (fullCultivationTechnique.功法效果.修炼速度加成 * 100).toFixed(0) }}%</span>
                      </div>
                      <div v-if="fullCultivationTechnique.功法效果.属性加成" class="effect-item">
                        <span class="effect-label">{{ t('属性提升：') }}</span>
                        <div class="attribute-bonuses">
                          <span
                            v-for="(value, attr) in fullCultivationTechnique.功法效果.属性加成"
                            :key="attr"
                            class="bonus-tag"
                          >
                            {{ t(String(attr)) }} +{{ value }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else-if="fullCultivationTechnique" class="technique-effects no-effects">
                    <h5 class="effects-title">{{ t('功法效果') }}</h5>
                    <p class="no-effects-text">{{ t('此功法无特殊效果') }}</p>
                  </div>
                </div>

                <div class="technique-progress">
                  <div class="progress-item" v-if="fullCultivationTechnique">
                    <span class="progress-label">{{ t('修为进度') }}</span>
                    <div class="progress-bar">
                      <div class="progress-fill" :style="{ width: Math.max(2, fullCultivationTechnique.修炼进度 || 0) + '%' }"></div>
                    </div>
                    <span class="progress-text">{{ fullCultivationTechnique.修炼进度 || 0 }}%</span>
                  </div>
                </div>
              </div>

              <!-- 已学技能 -->
              <div v-if="allLearnedSkills.length" class="learned-skills">
                <div class="skills-header" @click="toggleSkillsDetails">
                  <h4 class="skills-title">{{ t('已掌握技能') }}</h4>
                  <div class="skills-count">({{ totalSkillsCount }}{{ t('个') }})</div>
                  <ChevronDown
                    :size="14"
                    :class="{ 'rotated': isSkillsExpanded }"
                    class="toggle-icon"
                  />
                </div>

                <div v-show="!isSkillsExpanded" class="skills-preview">
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

                <div v-show="isSkillsExpanded" class="skills-details">
                  <!-- 所有已掌握的技能 -->
                  <div v-if="allLearnedSkills.length" class="skill-category">
                    <h5 class="category-title">{{ t('所有技能') }}</h5>
                    <div class="skills-grid">
                      <div
                        v-for="skill in allLearnedSkills"
                        :key="skill.name"
                        class="skill-card"
                        @click="showSkillDetails(skill)"
                      >
                        <div class="skill-name">{{ skill.name }}</div>
                        <div class="skill-type">{{ t(skill.type) }}</div>
                        <div class="skill-source">{{ skill.source }}</div>
                        <div class="skill-proficiency-mini">
                          {{ t('熟练度') }} {{ skill.proficiency }}%
                        </div>
                        <div class="skill-status">
                          <Star :size="12" class="unlock-icon" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 未解锁的功法技能 -->
                  <div v-if="skillsList.length > 0" class="skill-category">
                    <h5 class="category-title">{{ t('未解锁技能') }}</h5>
                    <div class="skills-grid">
                      <div
                        v-for="skill in skillsList"
                        :key="skill.name"
                        class="skill-card skill-locked"
                        @click="showSkillDetails(skill)"
                      >
                        <div class="skill-name">{{ skill.name }}</div>
                        <div class="skill-type">{{ t(skill.type) }}</div>
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

          <!-- 三千大道 -->
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <Zap :size="18" />
              </div>
              {{ t('三千大道') }}
            </h3>
            <div v-if="!unlockedDaoList.length" class="empty-state">
              <div class="empty-icon">
                <Sprout :size="32" />
              </div>
              <span>{{ t('尚未解锁大道') }}</span>
            </div>
            <div v-else class="dao-list">
              <div class="dao-header-section">
                <div class="dao-summary">
                  <span class="dao-count">{{ t('已解') }} {{ unlockedDaoList.length }} {{ t('条大道') }}</span>
                  <button class="dao-expand-btn" @click="toggleDaoDetails">
                    <span>{{ showDaoDetails ? t('收起') : t('展开') }}</span>
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
                  v-for="daoName in unlockedDaoList.slice(0, 2).map(d => d.道名)"
                  :key="daoName"
                  class="dao-item compact"
                  @click="showDaoInfo(daoName)"
                >
                  <div class="dao-header">
                    <span class="dao-name">{{ daoName }}</span>
                    <span class="dao-stage">{{ t('第') }}{{ getDaoStage(daoName) }}{{ t('阶段') }}</span>
                  </div>
                  <div class="dao-progress">
                    <div class="progress-bar small">
                      <div class="progress-fill" :style="{ width: getDaoProgress(daoName) + '%' }"></div>
                    </div>
                    <span class="progress-text small">{{ getDaoProgress(daoName) }}%</span>
                  </div>
                </div>
                <div v-if="unlockedDaoList.length > 2" class="more-dao">
                  {{ t('还有') }} {{ unlockedDaoList.length - 2 }} {{ t('条大道..') }}
                </div>
              </div>

              <div v-show="showDaoDetails" class="dao-details">
                <div
                  v-for="daoName in unlockedDaoList.map(d => d.道名)"
                  :key="daoName"
                  class="dao-item detailed"
                  @click="showDaoInfo(daoName)"
                >
                  <div class="dao-header">
                    <span class="dao-name">{{ daoName }}</span>
                    <span class="dao-stage">{{ t('第') }}{{ getDaoStage(daoName) }}{{ t('阶段') }}</span>
                  </div>
                  <div class="dao-progress">
                    <div class="progress-bar small">
                      <div class="progress-fill" :style="{ width: getDaoProgress(daoName) + '%' }"></div>
                    </div>
                    <span class="progress-text small">{{ getDaoProgress(daoName) }}%</span>
                  </div>

                  <div class="dao-stats">
                    <div class="stat-item">
                      <span class="stat-label">{{ t('当前经验') }}</span>
                      <span class="stat-value">{{ getDaoCurrentExp(daoName) }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">{{ t('总经验') }}</span>
                      <span class="stat-value">{{ getDaoTotalExp(daoName) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- 社交关系标签页 -->
      <div v-if="activeTab === 'social'" class="tab-content">
        <div class="content-grid">
          <!-- 人际关系 -->
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <Users :size="18" />
              </div>
              {{ t('人际关系') }}
            </h3>
            <div v-if="!relationshipCount" class="empty-state">
              <div class="empty-icon">
                <Handshake :size="32" />
              </div>
              <span>{{ t('暂无人际关系') }}</span>
            </div>
            <div v-else class="relationships-summary">
              <div class="relationship-stats">
                <div class="stat-item">
                  <span class="stat-label">{{ t('总人数') }}</span>
                  <span class="stat-value">{{ relationshipCount }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">{{ t('平均好感') }}</span>
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
              {{ t('背包概览') }}
            </h3>
            <div class="inventory-summary">
              <div class="inventory-stats">
                <div class="stat-group">
                  <div class="stat-item">
                    <span class="stat-label">{{ t('物品总数') }}</span>
                    <span class="stat-value">{{ inventoryItemCount }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">{{ t('法宝数量') }}</span>
                    <span class="stat-value">{{ getItemTypeCount('法宝') }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">{{ t('功法数量') }}</span>
                    <span class="stat-value">{{ getItemTypeCount('功法') }}</span>
                  </div>
                </div>
              </div>

              <div class="spirit-stones">
                <h4 class="stones-title">{{ t('灵石储备') }}</h4>
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
          <div class="info-section" v-if="playerSectInfo">
            <h3 class="section-title">
              <div class="title-icon">
                <Mountain :size="18" />
              </div>
              {{ t('宗门信息') }}
            </h3>
            <div class="sect-info">
              <div class="sect-header">
                <h4 class="sect-name">{{ playerSectInfo?.宗门名称 }}</h4>
                <span class="sect-type">{{ playerSectInfo?.宗门类型 }}</span>
              </div>
              <div class="sect-details">
                <div class="detail-row">
                  <span class="detail-label">{{ t('职位') }}</span>
                  <span class="detail-value">{{ playerSectInfo?.职位 }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">{{ t('贡献值') }}</span>
                  <span class="detail-value">{{ playerSectInfo?.贡献 }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">{{ t('关系') }}</span>
                  <span class="detail-value" :class="`relationship-${playerSectInfo?.关系}`">
                    {{ playerSectInfo?.关系 }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 背包物品标签页 -->
      <div v-if="activeTab === 'inventory'" class="tab-content">
        <div class="content-grid">
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <Backpack :size="18" />
              </div>
              {{ t('背包概览') }}
            </h3>
            <p>{{ t('背包功能开发中...') }}</p>
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
                <span class="detail-label">{{ t('类型') }}</span>
                <span class="detail-value">{{ t(getSkillModalContent()?.type ?? '未知') }}</span>
              </div>
              <div class="skill-detail-item">
                <span class="detail-label">{{ t('状态') }}</span>
                <span class="detail-value" :class="`status-${getSkillModalContent()?.status === '已解锁' ? 'unlocked' : 'locked'}`">
                  {{ t(getSkillModalContent()?.status ?? '未知') }}
                </span>
              </div>
              <div class="skill-detail-item">
                <span class="detail-label">{{ t('熟练度') }}</span>
                <span class="detail-value">{{ getSkillModalContent()?.proficiency ? getSkillModalContent()?.proficiency + '%' : t('未知') }}</span>
              </div>
              <div class="skill-detail-item">
                <span class="detail-label">{{ t('解锁条件') }}</span>
                <span class="detail-value">{{ getSkillModalContent()?.condition }}</span>
              </div>
              <div class="skill-detail-item">
                <span class="detail-label">{{ t('技能来源') }}</span>
                <span class="detail-value">{{ getSkillModalContent()?.source }}</span>
              </div>
            </div>
            <div class="skill-description">
              <h4>{{ t('技能描述') }}</h4>
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
                <span class="stage-label">{{ t('当前阶段') }}</span>
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
                <span class="stat-label">{{ t('当前经验') }}</span>
                <span class="stat-value">{{ getDaoModalContent()?.currentExp }}</span>
              </div>
              <div class="dao-stat-item">
                <span class="stat-label">{{ t('总经验') }}</span>
                <span class="stat-value">{{ getDaoModalContent()?.totalExp }}</span>
              </div>
            </div>
            <div class="dao-description">
              <h4>{{ t('修炼感悟') }}</h4>
              <p>{{ getDaoModalContent()?.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 灵根详情弹窗 (Re-designed) -->
      <div v-if="showSpiritRootModal" class="modal-overlay" @click="closeModals">
        <div class="spirit-root-modal" @click.stop>
          <div class="modal-header">
            <h3>{{ getSpiritRootDisplay(baseInfo.灵根) }} {{ t('详情') }}</h3>
            <button class="modal-close-btn" @click="closeModals">
              <X :size="20" />
            </button>
          </div>
          <div class="modal-content">
            <div class="spirit-root-detail-grid">
                <div class="detail-card">
                  <div class="detail-header">
                  <span class="detail-icon"><Zap :size="14" /></span>
                  <span class="detail-title">{{ t('灵根类型') }}</span>
                </div>
                <div class="detail-value type-value" :class="`root-${getSpiritRootClass(baseInfo.灵根)}`">
                  {{ getSpiritRootDisplay(baseInfo.灵根) }}
                </div>
              </div>
              <div class="detail-card">
                <div class="detail-header">
                  <span class="detail-icon"><Star :size="14" /></span>
                  <span class="detail-title">{{ t('灵根品级') }}</span>
                </div>
                <div class="detail-value grade-value" :class="`grade-${getSpiritRootGrade(baseInfo.灵根) || '凡品'}`">
                  {{ t(getSpiritRootGrade(baseInfo.灵根) || '凡品') }}
                </div>
              </div>
              <div class="detail-card">
                <div class="detail-header">
                  <span class="detail-icon"><Rocket :size="14" /></span>
                  <span class="detail-title">{{ t('修炼速度') }}</span>
                </div>
                <div class="detail-value speed-value">
                  {{ getSpiritRootCultivationSpeed(baseInfo) }}
                </div>
              </div>
            </div>

            <div v-if="getSpiritRootEffects(baseInfo).length > 0" class="spirit-root-effects-section">
              <h4>{{ t('特殊效果') }}</h4>
              <div class="effects-grid">
                <span v-for="effect in getSpiritRootEffects(baseInfo)" :key="effect" class="effect-tag-modal">
                  {{ effect }}
                </span>
              </div>
            </div>

            <div v-if="typeof baseInfo.灵根 === 'object' && baseInfo.灵根" class="advanced-details">
              <h4>{{ t('详细信息') }}</h4>
              <div class="advanced-grid">
                <div v-if="typeof baseInfo.灵根 === 'object' && baseInfo.灵根.base_multiplier" class="advanced-item">
                  <span class="advanced-label">{{ t('基础倍率:') }}</span>
                  <span class="advanced-value">{{ baseInfo.灵根.base_multiplier }}x</span>
                </div>
                <div v-if="typeof baseInfo.灵根 === 'object' && baseInfo.灵根.cultivation_speed" class="advanced-item">
                  <span class="advanced-label">{{ t('修炼速度:') }}</span>
                  <span class="advanced-value">{{ baseInfo.灵根.cultivation_speed }}</span>
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
import { ref, computed, onMounted, onActivated } from 'vue';
import { useI18n } from '@/i18n';
import { useUIStore } from '@/stores/uiStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import { isTavernEnv } from '@/utils/tavern';
import { debug } from '@/utils/debug';
import { calculateFinalAttributes } from '@/utils/attributeCalculation';
import { escapeRegExp } from '@/utils/regex';
import BodyStatsPanel from '@/components/dashboard/components/BodyStatsPanel.vue';
import type { CharacterBaseInfo, DaoData, Item, SkillInfo, InnateAttributes, StatusEffect, ItemQuality, Realm, TechniqueSkill, GameTime, NpcProfile, TechniqueItem, MasteredSkill } from '@/types/game.d.ts';
import type { Origin, TalentTier, SpiritRoot } from '@/types';

const calculateAgeFromBirthdate = (birthdate: GameTime, currentTime: GameTime): number => {
  let age = currentTime.年 - birthdate.年;
  if (currentTime.月 < birthdate.月 || (currentTime.月 === birthdate.月 && currentTime.日 < birthdate.日)) {
    age--;
  }
  return Math.max(0, age);
};
import { formatRealmWithStage } from '@/utils/realmUtils';
import {
  calculateRemainingMinutes,
  formatMinutesToDuration,
  removeStatusEffect
} from '@/utils/statusEffectManager';
import {
  AlertCircle, Heart, Sparkles, Star, BarChart3, BookOpen,
  Zap, Users, Backpack, Mountain, Sprout, Handshake, ChevronDown, X, MapPin, Rocket
} from 'lucide-vue-next';

// 使用 gameStateStore 获取数据
const { t } = useI18n();
const uiStore = useUIStore();
const characterStore = useCharacterStore();
const gameStateStore = useGameStateStore();
const isTavernEnvFlag = ref(isTavernEnv());
const isLoading = ref(false);

onMounted(() => {
  isTavernEnvFlag.value = isTavernEnv();
});

onActivated(() => {
  isTavernEnvFlag.value = isTavernEnv();
});

// 从 gameStateStore 获取数据的计算属性
const saveData = computed(() => gameStateStore.toSaveData());
const baseInfo = computed(() => gameStateStore.character);
const playerStatus = computed(() => gameStateStore.attributes);
const playerLocation = computed(() => gameStateStore.location);
const playerSectInfo = computed(() => gameStateStore.sectMemberInfo);
const daoData = computed(() => gameStateStore.thousandDao);
const bodyStats = computed(() => gameStateStore.body || null);
const lifespanForBodyPanel = computed(() => {
  const life = playerStatus.value?.寿命;
  if (!life) return undefined;
  const current = Number((life as any).当前 ?? 0);
  const max = Number((life as any).上限 ?? 0);
  if (!max) return undefined;
  return { current, max };
});

const bodySummary = computed(() => {
  if (!isTavernEnvFlag.value) return '';
  const body: any = bodyStats.value;
  const height = Number(body?.身高);
  const weight = Number(body?.体重);
  if (Number.isFinite(height) && height > 0 && Number.isFinite(weight) && weight > 0) {
    return `${height}cm · ${weight}kg`;
  }
  if (body && typeof body === 'object') return t('待完善');
  return t('未建立');
});
const showDaoDetails = ref(false);
const showSkillModal = ref(false);
const showDaoModal = ref(false);
const showSpiritRootModal = ref(false);
const showTechniqueDetails = ref(false);
const isSkillsExpanded = ref(false);

// 将LearnedSkillDisplay 类型定义移到顶层作用域
type LearnedSkillDisplay = {
  name: string;
  type: string;
  source: string;
  proficiency: number;
  description?: string;
  unlocked: boolean;
};

const selectedSkill = ref<SkillInfo | LearnedSkillDisplay | string | null>(null);
const selectedDao = ref<string | null>(null);

// 标签页状态
const activeTab = ref<string>('character');

// 标签页配置
const tabs = computed(() => {
  const base = [
    { id: 'character', label: '角色信息', icon: Users },
    { id: 'cultivation', label: '修炼体系', icon: BookOpen },
    { id: 'social', label: '社交关系', icon: Users },
    { id: 'inventory', label: '背包物品', icon: Backpack },
  ];

  if (isTavernEnvFlag.value) {
    base.push({ id: 'body', label: '身体档案', icon: Heart });
  }

  return base;
});

// 名字首字，用于头像占位
const nameInitial = computed(() => {
  const n = String(baseInfo.value?.名字 || '').trim();
  return n ? n.charAt(0) : '?';
});

// 自动计算当前年龄
const currentAge = computed(() => {
  const birthdate = baseInfo.value?.出生日期;
  const gameTime = saveData.value?.元数据?.时间;

  if (birthdate && gameTime) {
    // 为可选的 birthdate 属性提供默认值以匹配 GameTime 类型
    const fullBirthdate: GameTime = {
      年: birthdate.年,
      月: birthdate.月,
      日: birthdate.日,
      小时: birthdate.小时 ?? 0,
      分钟: birthdate.分钟 ?? 0,
    };
    return calculateAgeFromBirthdate(fullBirthdate, gameTime);
  }

  // 兜底：返回寿命的当前值
  return playerStatus.value?.寿命?.当前 || 0;
});

// fullCultivationTechnique数据 - 从背包中解析完整功法数据
const fullCultivationTechnique = computed((): TechniqueItem | null => {
  if (!saveData.value?.角色?.修炼?.修炼功法 || !saveData.value?.角色?.背包?.物品) {
    return null;
  }
  const techniqueId = saveData.value.角色?.修炼?.修炼功法?.物品ID;
  if (!techniqueId) {
    return null;
  }
  const techniqueItem = saveData.value.角色.背包.物品[techniqueId];
  if (techniqueItem && techniqueItem.类型 === '功法') {
    // 明确类型转换为TechniqueItem
    return techniqueItem as TechniqueItem;
  }
  return null;
});


const unlockedDaoList = computed((): DaoData[] => {
  if (!daoData.value?.大道列表) return [];
  return (Object.values(daoData.value.大道列表) as DaoData[]).filter(d => d.是否解锁);
});

// 生命状态数据
const vitalsData = computed(() => {
  if (!playerStatus.value) return [];

  const safe = (n: unknown) => (typeof n === 'number' ? n : Number(n || 0)) || 0;
  const safeMax = (n: unknown) => {
    const v = (typeof n === 'number' ? n : Number(n || 0));
    return isNaN(v) ? 0 : Math.max(0, v);
  };
  return [
    {
      label: t('气血'),
      current: safe(playerStatus.value.气血?.当前),
      max: safeMax(playerStatus.value.气血?.上限),
      color: 'red'
    },
    {
      label: t('灵气'),
      current: safe(playerStatus.value.灵气?.当前),
      max: safeMax(playerStatus.value.灵气?.上限),
      color: 'blue'
    },
    {
      label: t('神识'),
      current: safe(playerStatus.value.神识?.当前),
      max: safeMax(playerStatus.value.神识?.上限),
      color: 'gold'
    }
  ];
});


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
    灵性: clamp0to10(innate.灵性), // 修正：使用灵性而非灵气
    悟性: clamp0to10(innate.悟性),
    气运: clamp0to10(innate.气运),
    魅力: clamp0to10(innate.魅力),
    心性: clamp0to10(innate.心性)  // 修正：使用心性而非心境
  };
});

// 属性计算
const finalAttributes = computed((): InnateAttributes => {
  if (!saveData.value) return innateAttributesWithDefaults.value;
  const result = calculateFinalAttributes(innateAttributesWithDefaults.value, saveData.value);
  return result?.最终六司 || innateAttributesWithDefaults.value;
});


const acquiredAttributes = computed((): InnateAttributes => {
  const defaultAttributes: InnateAttributes = { 根骨: 0, 灵性: 0, 悟性: 0, 气运: 0, 魅力: 0, 心性: 0 }; // 修正：使用标准六司名称
  if (!saveData.value) return defaultAttributes;
  const result = calculateFinalAttributes(innateAttributesWithDefaults.value, saveData.value);
  return result?.后天六司 || defaultAttributes;
});

const hasTechniqueEffects = computed(() => {
  const effects = fullCultivationTechnique.value?.功法效果;
  if (!effects) return false;
  const hasSpeedBonus = effects.修炼速度加成 && effects.修炼速度加成 > 0;
  const hasAttributeBonus = effects.属性加成 && Object.keys(effects.属性加成).length > 0;
  return hasSpeedBonus || hasAttributeBonus;
});

// 技能相关计算属性
const skillsList = computed((): SkillInfo[] => {
  const technique = fullCultivationTechnique.value;
  if (!technique || !technique.功法技能) return [];

  return technique.功法技能
    .filter((skillInfo: TechniqueSkill) => {
      const isExplicitlyUnlocked = (technique.已解锁技能 || []).includes(skillInfo.技能名称);
      const requiredProficiency = skillInfo.熟练度要求 ?? 100;
      const isUnlockedByProficiency = (technique.修炼进度 || 0) >= requiredProficiency;
      return !(isExplicitlyUnlocked || isUnlockedByProficiency);
    })
    .map((skillInfo: TechniqueSkill) => {
      const requiredProficiency = skillInfo.熟练度要求 ?? 100;
      return {
        name: skillInfo.技能名称,
        description: skillInfo.技能描述 || '',
        type: t('功法技能'),
        unlockCondition: requiredProficiency === 0 ? t('自动解锁') : t('需要熟练度 {0}%').replace('{0}', String(requiredProficiency)),
        unlocked: false,
      };
    });
});

// 已学技能（所有已掌握的技能）
const allLearnedSkills = computed((): LearnedSkillDisplay[] => {
  const mastered = saveData.value?.技能?.掌握技能 || [];

  let fromTechnique: LearnedSkillDisplay[] = [];
  if (fullCultivationTechnique.value && fullCultivationTechnique.value.功法技能) {
    const technique = fullCultivationTechnique.value;
    if (!technique.功法技能) return [];
    fromTechnique = technique.功法技能
      .filter((skillInfo: TechniqueSkill) => {
        const isExplicitlyUnlocked = (technique.已解锁技能 || []).includes(skillInfo.技能名称);
        const isUnlockedByProficiency = (technique.修炼进度 || 0) >= (skillInfo.熟练度要求 ?? 100);
        return isExplicitlyUnlocked || isUnlockedByProficiency;
      })
      .map((skillInfo: TechniqueSkill) => {
        return {
          name: skillInfo.技能名称,
          proficiency: getPersistentProficiency(skillInfo.技能名称, 'technique'),
          source: technique.名称 || t('功法'),
          type: t('功法技能'),
          description: skillInfo.技能描述 || t('通过功法修炼掌握'),
          unlocked: true,
        };
      });
  }

  const allSkills = [...mastered.map((s: MasteredSkill) => ({
    name: s.技能名称,
    proficiency: s.熟练度,
    source: s.来源,
    type: t('掌握技能'),
    description: s.技能描述,
    unlocked: true,
  })), ...fromTechnique];

  // 去重
  const uniqueSkills = new Map<string, LearnedSkillDisplay>();
  allSkills.forEach(skill => {
    if (!uniqueSkills.has(skill.name)) {
      uniqueSkills.set(skill.name, skill);
    }
  });

  return Array.from(uniqueSkills.values());
});

const totalSkillsCount = computed(() => {
  return allLearnedSkills.value.length;
});

// 人际关系统计
const relationshipCount = computed(() => {
  const relations = saveData.value?.社交?.关系 || {};
  return (Object.values(relations) as NpcProfile[]).filter(npc => npc && npc.名字).length;
});

const averageFavorability = computed(() => {
  if (!saveData.value?.社交?.关系) return 0;
  const relations = (Object.values(saveData.value.社交.关系) as NpcProfile[]).filter(npc => npc && npc.名字);
  if (relations.length === 0) return 0;
  const total = relations.reduce((sum, rel) => sum + (rel.好感度 || 0), 0);
  return Math.round(total / relations.length);
});

// 背包统计
const inventoryItemCount = computed(() => {
  const items = saveData.value?.角色?.背包?.物品 || {};
  // 仅统计有效物品：键不以下划线开头，值为对象且包含名称
  return Object.entries(items)
    .filter(([key, val]) => !String(key).startsWith('_') && val && typeof val === 'object' && typeof (val as Item).名称 === 'string')
    .length;
});

const spiritStoneGrades = [
  { name: t('下品'), class: 'grade-common' },
  { name: t('中品'), class: 'grade-rare' },
  { name: t('上品'), class: 'grade-epic' },
  { name: t('极品'), class: 'grade-legend' }
];

// 方法
// 判断是否为凡人动物阶段（没有修为的阶段）
const isAnimalStage = (realmName?: string): boolean => {
  if (!realmName) return true;
  const animalStages = ['凡人', '蛮兽', '灵兽', '动物', '凡物', '普通人'];
  return animalStages.includes(realmName);
};

// 获取凡人/动物阶段的显示文本
const getAnimalStageDisplay = (): string => {
  const realmName = playerStatus.value?.境界?.名称;
  switch (realmName) {
    case '凡人':
    case '普通人':
      return t('等待仙缘');
    case '蛮兽':
    case '灵兽':
      return t('野性本能');
    case '动物':
      return t('自然状态');
    default:
      return t('等待觉醒');
  }
};

// 检查是否有有效的修为数据
const hasValidCultivation = (): boolean => {
  const current = playerStatus.value?.境界?.当前进度;
  const max = playerStatus.value?.境界?.下一级所需;
  return typeof current === 'number' && typeof max === 'number' && max > 0;
};

// 格式化修为显示文本
const formatCultivationText = (): string => {
  const current = playerStatus.value?.境界?.当前进度 || 0;
  const max = playerStatus.value?.境界?.下一级所需 || 100;

  // 如果数值很大，使用简化显示
  if (max >= 10000) {
    const currentK = Math.floor(current / 1000);
    const maxK = Math.floor(max / 1000);
    if (currentK > 0 && maxK > 0) {
      return `${currentK}k/${maxK}k`;
    }
  }

  return `${current}/${max}`;
};

// 显示境界：统一返回"境界+阶段"（初期/中期/后期/圆满），凡人不加阶段
const formatRealmDisplay = (realmInput?: string | Realm): string => {
  // 如果传入的是对象（Realm类型）
  if (realmInput && typeof realmInput === 'object') {
    const name = realmInput.名称 || '';
    const stage = realmInput.阶段 || '';
    const progress = realmInput.当前进度;
    const maxProgress = realmInput.下一级所需;
    return formatRealmWithStage({ name, 阶段: stage, 当前进度: progress, 下一级所需: maxProgress });
  }

  // 如果传入的是字符串（name）
  const name = typeof realmInput === 'string' ? realmInput : undefined;
  const progress = playerStatus.value?.境界?.当前进度;
  const maxProgress = playerStatus.value?.境界?.下一级所需;
  const stage = playerStatus.value?.境界?.阶段;
  return formatRealmWithStage({ name, 阶段: stage, 当前进度: progress, 下一级所需: maxProgress });
};

const getCultivationProgress = (): number => {
  const current = playerStatus.value?.境界?.当前进度 || 0;
  const max = playerStatus.value?.境界?.下一级所需 || 100;
  return Math.round((current / max) * 100);
};



// 获取天资等级名称
const getTalentTierName = (talentTier: TalentTier | string | undefined): string => {
  if (!talentTier) return t('未知');
  if (typeof talentTier === 'string') return talentTier;
  return talentTier.name || t('未知');
};

// 获取天资等级描述
const getTalentTierDescription = (talentTier: TalentTier | string | undefined): string => {
  if (typeof talentTier === 'object' && talentTier) {
    return talentTier.description || '';
  }
  return '';
};

const getTalentList = (talents: unknown): { name: string; description: string }[] => {
  let processedTalents: unknown[] = [];

  if (!talents) {
    return [];
  }

  if (Array.isArray(talents)) {
    processedTalents = talents;
  } else if (typeof talents === 'string') {
    try {
      // Try to parse it as a JSON array
      const parsed = JSON.parse(talents);
      if (Array.isArray(parsed)) {
        processedTalents = parsed;
      } else if (typeof parsed === 'string') {
        // It's a valid JSON but not an array (e.g., a string literal "天赋1"), treat as single talent
        processedTalents = [{ name: parsed, description: '' }];
      }
    } catch (error) {
      // It's not a JSON string, so treat the whole string as a single talent name
      processedTalents = [{ name: talents, description: '' }];
    }
  } else if (typeof talents === 'object' && talents !== null) {
    // Handle the case where it's a single talent object, not in an array
    processedTalents = [talents];
  }

  return processedTalents
    .map(talent => {
      if (typeof talent === 'string') {
        return { name: talent, description: '' };
      }
      if (typeof talent === 'object' && talent !== null) {
        // 修复：正确提取中英文字段的名称和描述
        const talentObj = talent as Record<string, unknown>;
        const name = (talentObj.name || talentObj['名称'] || '') as string;
        const description = (talentObj.description || talentObj['描述'] || '') as string;

        // 只有当名称和描述都为空时才过滤掉
        if (!name && !description) return null;

        return {
          name: name || t('未知天赋'),
          description: description,
        };
      }
      return null;
    })
    .filter(Boolean) as { name: string; description: string }[];
};


const getPercentage = (current: number, max: number): number => {
  return Math.round((current / max) * 100);
};

const getItemQualityClass = (item: { 品质?: ItemQuality } | null, type: 'border' | 'text' = 'border'): string => {
  if (!item) return '';
  const quality = item.品质?.quality || t('未知');
  return `${type}-quality-${quality}`;
};

const getDaoData = (daoName: string): DaoData | undefined => {
  return daoData.value?.大道列表?.[daoName];
};

const getDaoStage = (daoName: string): number => {
  return getDaoData(daoName)?.当前阶段 || 0;
};

const getDaoProgress = (daoName: string): number => {
  const dao = getDaoData(daoName);
  if (!dao) return 0;
  const currentStageIndex = dao.当前阶段 || 0;
  const currentStage = dao.阶段列表?.[currentStageIndex];
  if (!currentStage) return 0;
  const nextStageExp = currentStage.突破经验;
  if (nextStageExp <= 0) return 100;
  return Math.min(100, Math.round((dao.当前经验 / nextStageExp) * 100));
};

const getDaoCurrentExp = (daoName: string): number => {
  return getDaoData(daoName)?.当前经验 || 0;
};

const getDaoTotalExp = (daoName: string): number => {
  return getDaoData(daoName)?.总经验 || 0;
};

const getItemTypeCount = (type: string): number => {
  const items = saveData.value?.角色?.背包?.物品 || {};
  return Object.entries(items)
    .filter(([key, val]) => !String(key).startsWith('_') && val && typeof val === 'object')
    .map(([, val]) => val as Item)
    .filter((item: Item) => item.类型 === type).length;
};

const getSpiritStoneCount = (grade: '下品' | '中品' | '上品' | '极品'): number => {
return saveData.value?.角色?.背包?.灵石?.[t(grade) as '下品' | '中品' | '上品' | '极品'] || 0;
};

// 清理状态效果描述，去除重复的时间信息
const _getCleanEffectDescription = (effect: StatusEffect): string => {
  if (!effect || !effect.状态描述) return '';

  let description = effect.状态描述;
  const durationText = effect.时间 == null ? '' : String(effect.时间);

  // 如果描述中包含了时间信息，则移除重复部分
  if (durationText && description.includes(durationText)) {
    const escapedDuration = escapeRegExp(durationText);
    // 移除包含时间信息的句子或短语
    description = description
      .replace(new RegExp(`[^。]*${escapedDuration}[^。]*。`, 'g'), '')
      .replace(new RegExp(t('持续时间[：][^。]*{0}[^。]*。').replace('{0}', escapedDuration), 'g'), '')
      .replace(new RegExp(t('剩余时间[：][^。]*{0}[^。]*。').replace('{0}', escapedDuration), 'g'), '')
      .replace(new RegExp(t('时间[：][^。]*{0}[^。]*。').replace('{0}', escapedDuration), 'g'), '')
      .trim();
  }

  return description || t('无描述');
};

// 格式化状态效果生成时间
const _formatEffectCreatedTime = (effect: StatusEffect): string => {
  if (!effect.生成时间) return t('未知');
  const { 年, 月, 日, 小时, 分钟 } = effect.生成时间;
  return t('{0}年{1}月{2}日 {3}:{4}').replace('{0}', String(年)).replace('{1}', String(月)).replace('{2}', String(日)).replace('{3}', String(小时 || 0)).replace('{4}', String(分钟 ?? 0).padStart(2, '0'));
};

// 格式化状态效果剩余时间
const _formatEffectRemainingTime = (effect: StatusEffect): string => {
  if (!saveData.value?.元数据?.时间) return t('未知');
  const remainingMinutes = calculateRemainingMinutes(effect, saveData.value.元数据.时间);
  return formatMinutesToDuration(remainingMinutes);
};

// 移除状态效果
const _handleRemoveEffect = async (effectName: string) => {
  const confirmed = confirm(t('确定要移除状态效果"{0}"吗？').replace('{0}', effectName));
  if (!confirmed) return;

  try {
    if (!saveData.value) {
      debug.error(t('角色详情面板'), t('存档数据不存在'));
      return;
    }

    // 使用 statusEffectManager 移除状态效果
    const removed = removeStatusEffect(saveData.value, effectName);

    if (removed) {
      await characterStore.saveCurrentGame();
      debug.log(t('角色详情面板'), t('已移除状态效果: {0}').replace('{0}', effectName));
    } else {
      debug.warn(t('角色详情面板'), t('未找到状态效果: {0}').replace('{0}', effectName));
    }
  } catch (error) {
    debug.error(t('角色详情面板'), t('移除状态效果失败:'), error);
  }
};

// 获取持久化的熟练度（根据技能名和来源生成固定熟练度）
const getPersistentProficiency = (skillName: string, source: string): number => {
  // 使用技能名和来源生成一个固定的种子
  const seed = skillName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + source.length;
  // 基于种子生成 30-95 之间的固定值
  return 30 + (seed % 66);
};

// 界面交互方法
const toggleTechniqueDetails = () => {
  showTechniqueDetails.value = !showTechniqueDetails.value;
};

const toggleSkillsDetails = () => {
  isSkillsExpanded.value = !isSkillsExpanded.value;
};

const toggleDaoDetails = () => {
  showDaoDetails.value = !showDaoDetails.value;
};

const showDaoInfo = (daoName: string) => {
  selectedDao.value = daoName;
  showDaoModal.value = true;
};

const showSkillDetails = (skill: SkillInfo | LearnedSkillDisplay | string) => {
  selectedSkill.value = skill;
  showSkillModal.value = true;
};

const showSpiritRootDetails = () => {
  showSpiritRootModal.value = true;
};

const closeModals = () => {
  showSkillModal.value = false;
  showDaoModal.value = false;
  showSpiritRootModal.value = false;
  selectedSkill.value = null;
  selectedDao.value = null;
};

const getDaoModalContent = () => {
  if (!selectedDao.value) return null;
  const dao = getDaoData(selectedDao.value);
  if (!dao) {
    return {
      name: selectedDao.value,
      stage: t('初始阶段'),
      currentExp: 0,
      totalExp: 0,
      progressPercent: 0,
      description: t('此大道已解锁，但尚未开始修炼')
    };
  }

  const stage = dao.当前阶段 || 0;
  const currentExp = dao.当前经验 || 0;
  const totalExp = dao.总经验 || 0;
  const progressPercent = getDaoProgress(selectedDao.value);

  // 获取阶段名称，优先使用阶段列表中的名称
  let stageName: string;
  if (dao.阶段列表?.[stage]) {
    stageName = dao.阶段列表[stage].名称;
  } else {
    stageName = stage === 0 ? t('未门') : t('第{0}阶段').replace('{0}', String(stage));
  }

  return {
    name: selectedDao.value,
    stage: stageName,
    currentExp,
    totalExp,
    progressPercent,
    description: dao.描述 || t('此道深奥玄妙，需持之以恒方能有所成就')
  };
};

const getSkillModalContent = () => {
  if (!selectedSkill.value) return null;

  // 处理已掌握技能
  if (typeof selectedSkill.value === 'object' && 'proficiency' in selectedSkill.value) {
    const skill = selectedSkill.value as LearnedSkillDisplay;
    return {
      name: skill.name,
      type: skill.type,
      status: t('已解锁'),
      condition: t('已掌握'),
      description: skill.description,
      source: skill.source,
      proficiency: skill.proficiency
    };
  }

  // 处理字符串技能名（向后兼容）
  if (typeof selectedSkill.value === 'string') {
    return {
      name: selectedSkill.value,
      type: t('功法技能'),
      status: t('已解锁'),
      condition: t('修炼完成'),
      description: t('通过修炼功法获得的技能'),
      source: t('功法修炼')
    };
  }

  // 处理功法技能对象
  const skill = selectedSkill.value as SkillInfo;
  return {
    name: skill.name,
    type: skill.type,
    status: skill.unlocked ? t('已解锁') : t('未解锁'),
    condition: skill.unlocked ? t('修炼完成') : skill.unlockCondition,
    description: skill.description,
    source: t('功法传承')
  };
};

const refreshData = async () => {
  isLoading.value = true;
  try {
    // 🔥 修复：从存储重新加载后，需要同步到 gameStateStore
    await characterStore.reloadFromStorage();

    // 重新加载当前游戏到 gameStateStore
    const gameStateStore = useGameStateStore();
    const currentSaveData = gameStateStore.getCurrentSaveData();
    if (currentSaveData) {
      gameStateStore.loadFromSaveData(currentSaveData);
      debug.log(t('人物详情'), t('已同步最新数据到 gameStateStore'));
    }
  } catch (error) {
    debug.error(t('人物详情'), t('刷新数据失败'), error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  debug.log(t('人物详情'), t('组件挂载，同步数据'));
  // 🔥 修复：首次挂载时不需要重新加载，直接使用 gameStateStore 中的数据
  // await refreshData();
});

// 每次面板激活时重新获取数据
onActivated(async () => {
  debug.log(t('人物详情'), t('面板激活'));
  // 🔥 修复：面板激活时不需要重新加载存储数据，gameStateStore 中已经是最新的
  // await refreshData();
});

// 获取出生地显示文本
const getOriginDisplay = (origin: Origin | string | undefined): string => {
  if (!origin) return t('待定');
  if (typeof origin === 'string') return origin;
  return (origin as any).名称 || origin.name || t('待定');
};

// 显示出身详情
const showOriginDetails = (origin: Origin | string | undefined) => {
  if (origin && typeof origin === 'object') {
    const name = (origin as any).名称 || origin.name;
    const desc = (origin as any).描述 || origin.description;
    uiStore.showDetailModal({
      title: t('出身背景: {0}').replace('{0}', name),
      content: desc,
    });
  }
};

// 增强的灵根系统 - 简化版
const getSpiritRootDisplay = (spiritRoot: SpiritRoot | string | undefined): string => {
  if (!spiritRoot) return t('未知');
  if (typeof spiritRoot === 'string') return spiritRoot;
  const name = (spiritRoot as any).名称 || spiritRoot.name || t('未知');
  let tier = (spiritRoot as any).品级 || spiritRoot.tier;
  if (tier && typeof tier === 'object') {
    tier = tier.quality || tier.grade || t('未知');
  }
  if (tier && tier !== t('未知') && tier !== t('凡品')) {
    return `${name}(${t(tier)})`;
  }
  return name;
};

// 格式化灵根显示（简洁版，用于顶部）
const formatSpiritRoot = (spiritRoot: SpiritRoot | string | undefined): string => {
  if (!spiritRoot) return t('未知');
  if (typeof spiritRoot === 'string') return spiritRoot;
  return (spiritRoot as any).名称 || spiritRoot.name || t('未知');
};

const getSpiritRootGrade = (spiritRoot: SpiritRoot | string | undefined): string => {
  if (typeof spiritRoot === 'object' && spiritRoot) {
    return (spiritRoot as any).品级 || spiritRoot.tier || t('凡品');
  }
  return t('凡品');
};

const getSpiritRootDescription = (spiritRoot: SpiritRoot | string | undefined): string => {
  if (typeof spiritRoot === 'object' && spiritRoot) {
    return (spiritRoot as any).描述 || spiritRoot.description || t('未知');
  }
  return t('未知');
};

const getSpiritRootClass = (spiritRoot: SpiritRoot | string | undefined): string => {
  if (typeof spiritRoot !== 'object' || !spiritRoot) return 'spirit-unknown';
  let grade = (spiritRoot as any).品级 || spiritRoot.tier || '';
  // 处理对象类型的 tier/品级
  if (typeof grade === 'object' && grade) {
    grade = grade.quality || grade.grade || '';
  }
  // 安全转换为字符串并转小写
  const gradeStr = String(grade).toLowerCase();

  if (gradeStr.includes('神品')) return 'spirit-divine';
  if (gradeStr.includes('极品')) return 'spirit-supreme';
  if (gradeStr.includes('上品')) return 'spirit-superior';
  if (gradeStr.includes('中品')) return 'spirit-medium';
  if (gradeStr.includes('下品')) return 'spirit-inferior';
  if (gradeStr.includes('凡品')) return 'spirit-common';

  return 'spirit-unknown';
};

// 获取灵根修炼速度
const getSpiritRootCultivationSpeed = (baseInfo: CharacterBaseInfo | undefined): string => {
  const spiritRoot = baseInfo?.灵根;
  if (spiritRoot && typeof spiritRoot === 'object') {
    const spiritRootObj = spiritRoot as { base_multiplier?: number; cultivation_speed?: string };
    if ('base_multiplier' in spiritRootObj && spiritRootObj.base_multiplier) {
      return `${spiritRootObj.base_multiplier}x`;
    }
    if ('cultivation_speed' in spiritRootObj && spiritRootObj.cultivation_speed) {
      return spiritRootObj.cultivation_speed;
    }
  }

  // 如果没有详情，根据品级推断基础修炼速度
  const grade = getSpiritRootGrade(spiritRoot);

  const speedMap: Record<string, string> = {
    '凡品': '1.0x',
    '下品': '1.1x',
    '中品': '1.3x',
    '上品': '1.6x',
    '极品': '2.0x',
    '神品': '2.8x',
    '特殊': t('特殊')
  };

  return speedMap[grade] || '1.0x';
};

// 获取灵根特殊效果
const getSpiritRootEffects = (baseInfo: CharacterBaseInfo | undefined): string[] => {
  const spiritRoot = baseInfo?.灵根;
  if (spiritRoot && typeof spiritRoot === 'object') {
    const spiritRootObj = spiritRoot as { special_effects?: string[] };
    if ('special_effects' in spiritRootObj && Array.isArray(spiritRootObj.special_effects)) {
      return spiritRootObj.special_effects;
    }
  }
  return [];
};
</script>

<style scoped>
.character-details-wrapper {
  padding: 1rem;
  height: 100%;
  overflow: auto;
  background: var(--color-background);
  color: var(--color-text);
}

.character-details-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* Loading / Error */
.loading-container,
.error-container {
  min-height: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 1.5rem;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border-radius: 9999px;
  border: 3px solid rgba(var(--color-primary-rgb), 0.18);
  border-top-color: var(--color-primary);
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-icon {
  color: rgba(239, 68, 68, 0.9);
}

.retry-btn {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  padding: 0.6rem 0.9rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.retry-btn:hover {
  border-color: var(--color-primary);
  transform: translateY(-1px);
}

/* Header card */
.character-header-card {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: linear-gradient(
      135deg,
      rgba(var(--color-primary-rgb), 0.12) 0%,
      rgba(var(--color-accent-rgb), 0.08) 45%,
      rgba(255, 255, 255, 0.02) 100%
    ),
    var(--color-surface);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.header-bg-decoration {
  position: absolute;
  inset: -30%;
  background: radial-gradient(circle at 20% 25%, rgba(var(--color-primary-rgb), 0.22), transparent 55%),
    radial-gradient(circle at 75% 60%, rgba(var(--color-accent-rgb), 0.18), transparent 55%);
  filter: blur(22px);
  opacity: 0.9;
  pointer-events: none;
}

.header-content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.25fr 2fr 1fr;
  gap: 1rem;
  padding: 1.25rem;
  align-items: center;
}

.profile-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
}

.avatar-wrapper {
  position: relative;
  width: 64px;
  height: 64px;
  flex: 0 0 auto;
}

.avatar-circle {
  width: 64px;
  height: 64px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--color-primary-rgb), 0.14);
  border: 1px solid rgba(var(--color-primary-rgb), 0.35);
  color: var(--color-text);
  font-weight: 800;
  font-size: 1.35rem;
  letter-spacing: 0.02em;
  user-select: none;
}

.avatar-glow {
  position: absolute;
  inset: -14px;
  border-radius: 9999px;
  background: radial-gradient(circle at center, rgba(var(--color-primary-rgb), 0.25), transparent 65%);
  filter: blur(10px);
  opacity: 0.9;
  pointer-events: none;
}

.identity-info {
  min-width: 0;
}

.character-title {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
  line-height: 1.1;
}

.character-subtitle {
  margin-top: 0.4rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.5rem;
  align-items: center;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.subtitle-divider {
  opacity: 0.6;
}

.gender-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.55rem;
  border-radius: 9999px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(255, 255, 255, 0.05);
}

.core-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  align-content: start;
}

.stat-card {
  border-radius: 14px;
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  min-width: 0;
}

.stat-card.clickable {
  cursor: pointer;
}

.stat-card:hover {
  border-color: rgba(var(--color-primary-rgb), 0.55);
  transform: translateY(-1px);
}

.stat-card .card-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-primary);
  flex: 0 0 auto;
}

.stat-card .card-content {
  min-width: 0;
}

.stat-card .card-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.15rem;
}

.stat-card .card-value {
  font-weight: 700;
  color: var(--color-text);
  font-size: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.body-card .card-icon {
  background: rgba(239, 68, 68, 0.12);
  color: rgba(239, 68, 68, 0.95);
}

.cultivation-section {
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
}

.cultivation-progress-card,
.cultivation-status {
  width: 100%;
  max-width: 260px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 14px;
  padding: 0.85rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.5rem;
}

.progress-label {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.progress-percentage {
  font-weight: 800;
}

.progress-bar-bg {
  height: 10px;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(var(--color-primary-rgb), 0.8), rgba(var(--color-accent-rgb), 0.85));
  border-radius: 9999px;
  position: relative;
}

.progress-bar-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
  transform: translateX(-60%);
  animation: shine 2.4s ease-in-out infinite;
}

@keyframes shine {
  0% {
    transform: translateX(-70%);
  }
  50% {
    transform: translateX(0%);
  }
  100% {
    transform: translateX(70%);
  }
}

.progress-text {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

/* Tabs */
.tabs-nav {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.5rem 0.25rem;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.9rem;
}

.tab-btn:hover {
  border-color: rgba(var(--color-primary-rgb), 0.55);
  color: var(--color-text);
}

.tab-btn.active {
  background: rgba(var(--color-primary-rgb), 0.14);
  border-color: rgba(var(--color-primary-rgb), 0.55);
  color: var(--color-text);
}

/* Content */
.tab-content {
  padding: 0.25rem;
}

.content-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 1.25rem;
  overflow: hidden;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.info-section:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border-color: rgba(var(--color-primary-rgb), 0.3);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 1.25rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-text);
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--color-border);
}

.title-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.15), rgba(var(--color-accent-rgb), 0.1));
  color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.15);
}

/* Vitals */
.vitals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.vital-item {
  padding: 1rem;
  background: linear-gradient(135deg, var(--color-background) 0%, var(--color-surface-light) 100%);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  transition: all 0.2s ease;
}

.vital-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: rgba(var(--color-primary-rgb), 0.3);
}

.vital-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.vital-bar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bar-container {
  height: 12px;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.1);
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.bar-fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.3s ease;
  position: relative;
  overflow: hidden;
}

.bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.bar-red {
  background: linear-gradient(90deg, #ef4444, #f87171);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
}

.bar-blue {
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
}

.bar-gold {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.3);
}

.vital-text {
  font-size: 0.85rem;
  color: var(--color-text);
  font-weight: 600;
  display: flex;
  justify-content: space-between;
}

.reputation-item {
  grid-column: span 1;
}

.reputation-display {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  background: linear-gradient(135deg, rgba(var(--color-accent-rgb), 0.1), rgba(var(--color-primary-rgb), 0.05));
  border-radius: 10px;
  border: 1px solid rgba(var(--color-accent-rgb), 0.2);
}

.reputation-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-accent);
}

/* 基础信息网格 */
.basic-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.85rem;
}

.basic-info-item {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.85rem 1rem;
  background: linear-gradient(135deg, var(--color-surface-light) 0%, var(--color-background) 100%);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.basic-info-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  border-color: rgba(var(--color-primary-rgb), 0.25);
}

.info-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
}

.info-value.realm {
  color: var(--color-primary);
  font-size: 1.05rem;
}

.info-value.gender {
  font-weight: 600;
}

.info-value.gender.gender-男 {
  color: #3b82f6;
}

.info-value.gender.gender-女 {
  color: #ec4899;
}

.info-value.spirit-root {
  color: var(--color-accent);
}

.info-value.location {
  color: var(--color-text);
  font-size: 0.95rem;
}

/* 属性显示 */
.attributes-display {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.final-attributes {
  padding: 1.25rem;
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.08), rgba(var(--color-accent-rgb), 0.05));
  border: 2px solid rgba(var(--color-primary-rgb), 0.2);
  border-radius: 14px;
}

.attribute-group-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 1rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.attributes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.85rem;
}

.attributes-grid.compact {
  grid-template-columns: repeat(6, 1fr);
  gap: 0.65rem;
}

.attribute-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.85rem 0.65rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.attribute-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: rgba(var(--color-primary-rgb), 0.3);
}

.attribute-item.final {
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.1), rgba(var(--color-accent-rgb), 0.05));
  border-color: rgba(var(--color-primary-rgb), 0.25);
}

.attribute-item.innate {
  background: var(--color-surface-light);
}

.attribute-item.acquired {
  background: var(--color-background);
}

.attribute-item.acquired.has-bonus {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(16, 185, 129, 0.05));
  border-color: rgba(34, 197, 94, 0.25);
}

.attr-name {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.attr-value {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-text);
}

.attribute-item.final .attr-value {
  color: var(--color-primary);
  font-size: 1.4rem;
}

.attribute-item.acquired.has-bonus .attr-value {
  color: #10b981;
}

.attribute-breakdown {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.innate-attrs,
.acquired-attrs {
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.skill-modal,
.dao-modal,
.spirit-root-modal {
  width: min(820px, 100%);
  max-height: 85vh;
  overflow: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-close-btn {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  border-radius: 10px;
  padding: 0.4rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.modal-close-btn:hover {
  border-color: rgba(var(--color-primary-rgb), 0.55);
  transform: translateY(-1px);
}

.modal-content {
  padding: 1rem;
}

@media (max-width: 980px) {
  .header-content {
    grid-template-columns: 1fr;
    gap: 0.85rem;
  }
  .cultivation-section {
    justify-content: flex-start;
  }
  .cultivation-progress-card,
  .cultivation-status {
    max-width: none;
  }
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
