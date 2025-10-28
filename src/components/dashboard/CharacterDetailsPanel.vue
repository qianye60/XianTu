<template>
  <div class="character-details-wrapper">
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载角色数据..</p>
    </div>

    <div v-else-if="!baseInfo || !saveData" class="error-container">
      <div class="error-icon">
        <AlertCircle :size="48" />
      </div>
      <p>无法加载角色数据</p>
      <button class="retry-btn" @click="refreshData">重试</button>
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
                    {{ (baseInfo.性别 === '男' ? '♂' : '♀') + ' ' + baseInfo.性别 }}
                  </span>
                  <span class="subtitle-divider">·</span>
                </template>
                <span class="subtitle-item race-text">{{ baseInfo.种族 || '人族' }}</span>
                <span class="subtitle-divider">·</span>
                <span class="subtitle-item age-text">{{ currentAge }}岁</span>
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
                <div class="card-label">境界</div>
                <div class="card-value realm-value">{{ formatRealmDisplay(playerStatus?.境界?.名称) || '凡人' }}</div>
              </div>
            </div>

            <!-- 灵根卡片 -->
            <div class="stat-card spirit-card" v-if="baseInfo.灵根">
              <div class="card-icon">
                <Sparkles :size="20" />
              </div>
              <div class="card-content">
                <div class="card-label">灵根</div>
                <div class="card-value spirit-value">{{ formatSpiritRoot(baseInfo.灵根) }}</div>
              </div>
            </div>

            <!-- 位置卡片 -->
            <div class="stat-card location-card" v-if="playerStatus?.位置?.描述" :title="playerStatus.位置.描述">
              <div class="card-icon">
                <MapPin :size="20" />
              </div>
              <div class="card-content">
                <div class="card-label">位置</div>
                <div class="card-value location-value">{{ playerStatus.位置.描述 }}</div>
              </div>
            </div>

            <!-- 出生卡片 -->
            <div
              class="stat-card origin-card clickable"
              v-if="baseInfo.出生"
              @click="showOriginDetails(baseInfo.出生)"
              :title="typeof baseInfo.出生 === 'object' ? '点击查看详情' : ''"
            >
              <div class="card-icon">
                <Sprout :size="20" />
              </div>
              <div class="card-content">
                <div class="card-label">出生</div>
                <div class="card-value origin-value">{{ getOriginDisplay(baseInfo.出生) }}</div>
              </div>
            </div>

            <!-- 声望卡片 -->
            <div class="stat-card reputation-card" v-if="playerStatus?.声望">
              <div class="card-icon">
                <Star :size="20" />
              </div>
              <div class="card-content">
                <div class="card-label">声望</div>
                <div class="card-value reputation-value">{{ playerStatus.声望 }}</div>
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
                <span class="progress-label">修为进度</span>
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
              <div class="status-icon">✨</div>
              <div class="status-text">等待仙缘</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 主要内容区域 -->
      <div class="content-grid">
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
              <!-- 声望显示 -->
              <div class="vital-item reputation-item">
                <div class="vital-label">声望</div>
                <div class="reputation-display">
                  <span class="reputation-value">
                    {{ playerStatus?.声望 || '籍籍无名' }}
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
              角色背景
            </h3>
            <div class="basic-info-grid">
              <div class="basic-info-item">
                <span class="info-label">境界</span>
                <span class="info-value realm">{{ formatRealmDisplay(playerStatus?.境界) }}</span>
              </div>
              <div v-if="baseInfo.性别" class="basic-info-item">
                <span class="info-label">性别</span>
                <span class="info-value gender" :class="`gender-${baseInfo.性别}`">{{ baseInfo.性别 }}</span>
              </div>
              <div class="basic-info-item">
                <span class="info-label">灵根</span>
                <span class="info-value spirit-root" :class="`root-${getSpiritRootClass(baseInfo.灵根)}`">{{ getSpiritRootDisplay(baseInfo.灵根) }}</span>
              </div>
              <div class="basic-info-item">
                <span class="info-label">年龄</span>
                <span class="info-value">{{ currentAge }}岁</span>
              </div>
              <div v-if="playerStatus?.位置?.描述" class="basic-info-item">
                <span class="info-label">位置</span>
                <span class="info-value location">{{ playerStatus.位置.描述 }}</span>
              </div>
              <div v-else-if="baseInfo.世界" class="basic-info-item">
                <span class="info-label">世界</span>
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
          天赋与灵根
        </h3>
        <div class="talent-content">
          <!-- 天资等级卡片 -->
          <div class="talent-tier-card">
            <div class="tier-header">
              <div class="tier-icon">🌟</div>
              <span class="tier-label">天资等级</span>
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
              <div class="root-icon">⚡</div>
              <span class="root-label">灵根属性</span>
              <span class="click-hint">点击查看详情</span>
            </div>
            <div class="root-main-info">
              <span class="root-name" :class="`root-${getSpiritRootClass(baseInfo.灵根)}`">
                {{ getSpiritRootDisplay(baseInfo.灵根) }}
              </span>
              <div class="property-badges">
                <span class="prop-badge grade-badge" :class="`grade-${getSpiritRootGrade(baseInfo.灵根) || '凡品'}`">
                  {{ getSpiritRootGrade(baseInfo.灵根) || '凡品' }}
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
              <div class="talents-icon">✨</div>
              <span class="talents-label">天赋特质</span>
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
                <div class="talent-name">无</div>
              </div>
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
                  <button class="effect-remove-btn" @click="handleRemoveEffect(effect.状态名称)" title="移除状态效果">
                    <X :size="14" />
                  </button>
                </div>
                <div class="effect-description">{{ getCleanEffectDescription(effect) }}</div>
                <div class="effect-time-info">
                  <span class="effect-created">生成: {{ formatEffectCreatedTime(effect) }}</span>
                  <span class="effect-remaining">剩余: {{ formatEffectRemainingTime(effect) }}</span>
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
              六司属性
            </h3>
            <div class="attributes-display">
              <!-- 最终属性 -->
              <div class="final-attributes">
                <h4 class="attribute-group-title">最终六司</h4>
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

          <!-- 身体部位开发 -->
          <div v-if="bodyParts.length" class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <Sparkles :size="18" />
              </div>
              身体部位开发
            </h3>
            <div class="body-parts-list">
              <div v-for="part in bodyParts" :key="part.name" class="body-part-item">
                <div class="part-header">
                  <span class="part-name">{{ part.name }}</span>                </div>
                <div class="part-description">
                  {{ part.description }}
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
            <div v-if="!fullCultivationTechnique" class="empty-state">
              <div class="empty-icon">
                <BookOpen :size="32" />
              </div>
              <span>尚未修炼功法</span>
            </div>
            <div v-else class="cultivation-display">
              <div class="technique-info">
                <div class="technique-header" @click="toggleTechniqueDetails">
                  <div class="technique-main">
                    <h4 class="technique-name" :class="getItemQualityClass(fullCultivationTechnique, 'text')">
                      {{ fullCultivationTechnique?.名称 }}
                    </h4>
                    <div class="technique-quality">
                      {{ fullCultivationTechnique?.品质?.quality || '未知' }}品{{ fullCultivationTechnique?.品质?.grade ? `${fullCultivationTechnique.品质.grade}阶` : '' }}</div>
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
                    <p>{{ fullCultivationTechnique?.描述 || '此功法奥妙无穷，随修炼加深方可领悟其真意。' }}</p>
                  </div>

                  <div v-if="hasTechniqueEffects && fullCultivationTechnique?.功法效果" class="technique-effects">
                    <h5 class="effects-title">功法效果</h5>
                    <div class="effects-list">
                      <div v-if="fullCultivationTechnique.功法效果.修炼速度加成" class="effect-item">
                        <span class="effect-label">修炼加成：</span>
                        <span class="effect-value">{{ (fullCultivationTechnique.功法效果.修炼速度加成 * 100).toFixed(0) }}%</span>
                      </div>
                      <div v-if="fullCultivationTechnique.功法效果.属性加成" class="effect-item">
                        <span class="effect-label">属性提升：</span>
                        <div class="attribute-bonuses">
                          <span
                            v-for="(value, attr) in fullCultivationTechnique.功法效果.属性加成"
                            :key="attr"
                            class="bonus-tag"
                          >
                            {{ attr }} +{{ value }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else-if="fullCultivationTechnique" class="technique-effects no-effects">
                    <h5 class="effects-title">功法效果</h5>
                    <p class="no-effects-text">此功法无特殊效果</p>
                  </div>
                </div>

                <div class="technique-progress">
                  <div class="progress-item" v-if="fullCultivationTechnique">
                    <span class="progress-label">修炼进度</span>
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
                  <h4 class="skills-title">已掌握技能</h4>
                  <div class="skills-count">({{ totalSkillsCount }}个)</div>
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
                  <!-- 所有已掌握的技�?-->
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
                          熟练度 {{ skill.proficiency }}%
                        </div>
                        <div class="skill-status">
                          <Star :size="12" class="unlock-icon" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 未解锁的功法技能 -->
                  <div v-if="skillsList.length > 0" class="skill-category">
                    <h5 class="category-title">未解锁技能</h5>
                    <div class="skills-grid">
                      <div
                        v-for="skill in skillsList"
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

          <!-- 三千大道 -->
          <div class="info-section">
            <h3 class="section-title">
              <div class="title-icon">
                <Zap :size="18" />
              </div>
              三千大道
            </h3>
            <div v-if="!unlockedDaoList.length" class="empty-state">
              <div class="empty-icon">
                <Sprout :size="32" />
              </div>
              <span>尚未解锁大道</span>
            </div>
            <div v-else class="dao-list">
              <div class="dao-header-section">
                <div class="dao-summary">
                  <span class="dao-count">已解 {{ unlockedDaoList.length }} 条大道</span>
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
                  v-for="daoName in unlockedDaoList.slice(0, 2).map(d => d.道名)"
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
                <div v-if="unlockedDaoList.length > 2" class="more-dao">
                  还有 {{ unlockedDaoList.length - 2 }} 条大道..
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
                <h4 class="sect-name">{{ playerStatus?.宗门信息?.宗门名称 }}</h4>
                <span class="sect-type">{{ playerStatus?.宗门信息?.宗门类型 }}</span>
              </div>
              <div class="sect-details">
                <div class="detail-row">
                  <span class="detail-label">职位</span>
                  <span class="detail-value">{{ playerStatus?.宗门信息?.职位 }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">贡献值</span>
                  <span class="detail-value">{{ playerStatus?.宗门信息?.贡献 }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">关系</span>
                  <span class="detail-value" :class="`relationship-${playerStatus?.宗门信息?.关系}`">
                    {{ playerStatus?.宗门信息?.关系 }}
                  </span>
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

      <!-- 灵根详情弹窗 (Re-designed) -->
      <div v-if="showSpiritRootModal" class="modal-overlay" @click="closeModals">
        <div class="spirit-root-modal" @click.stop>
          <div class="modal-header">
            <h3>{{ getSpiritRootDisplay(baseInfo.灵根) }} 详情</h3>
            <button class="modal-close-btn" @click="closeModals">
              <X :size="20" />
            </button>
          </div>
          <div class="modal-content">
            <div class="spirit-root-detail-grid">
              <div class="detail-card">
                <div class="detail-header">
                  <span class="detail-icon">⚡</span>
                  <span class="detail-title">灵根类型</span>
                </div>
                <div class="detail-value type-value" :class="`root-${getSpiritRootClass(baseInfo.灵根)}`">
                  {{ getSpiritRootDisplay(baseInfo.灵根) }}
                </div>
              </div>
              <div class="detail-card">
                <div class="detail-header">
                  <span class="detail-icon">⭐</span>
                  <span class="detail-title">灵根品级</span>
                </div>
                <div class="detail-value grade-value" :class="`grade-${getSpiritRootGrade(baseInfo.灵根) || '凡品'}`">
                  {{ getSpiritRootGrade(baseInfo.灵根) || '凡品' }}
                </div>
              </div>
              <div class="detail-card">
                <div class="detail-header">
                  <span class="detail-icon">🚀</span>
                  <span class="detail-title">修炼速度</span>
                </div>
                <div class="detail-value speed-value">
                  {{ getSpiritRootCultivationSpeed(baseInfo) }}
                </div>
              </div>
            </div>

            <div v-if="getSpiritRootEffects(baseInfo).length > 0" class="spirit-root-effects-section">
              <h4>特殊效果</h4>
              <div class="effects-grid">
                <span v-for="effect in getSpiritRootEffects(baseInfo)" :key="effect" class="effect-tag-modal">
                  {{ effect }}
                </span>
              </div>
            </div>

            <div v-if="typeof baseInfo.灵根 === 'object' && baseInfo.灵根" class="advanced-details">
              <h4>详细信息</h4>
              <div class="advanced-grid">
                <div v-if="typeof baseInfo.灵根 === 'object' && baseInfo.灵根.base_multiplier" class="advanced-item">
                  <span class="advanced-label">基础倍率:</span>
                  <span class="advanced-value">{{ baseInfo.灵根.base_multiplier }}x</span>
                </div>
                <div v-if="typeof baseInfo.灵根 === 'object' && baseInfo.灵根.cultivation_speed" class="advanced-item">
                  <span class="advanced-label">修炼速度:</span>
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
import { useUIStore } from '@/stores/uiStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import { debug } from '@/utils/debug';
import { calculateFinalAttributes } from '@/utils/attributeCalculation';
import type { CharacterBaseInfo, DaoData, Item, SkillInfo, InnateAttributes, StatusEffect, ItemQuality, Realm, PlayerBodyPart, TechniqueSkill, GameTime, NpcProfile, TechniqueItem } from '@/types/game.d.ts';
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
  Zap, Users, Backpack, Mountain, Bird, Sprout, Handshake, ChevronDown, X, MapPin
} from 'lucide-vue-next';

// 使用 gameStateStore 获取数据
const uiStore = useUIStore();
const characterStore = useCharacterStore();
const gameStateStore = useGameStateStore();
const isLoading = ref(false);

// 从 gameStateStore 获取数据的计算属性
const saveData = computed(() => gameStateStore.toSaveData());
const baseInfo = computed(() => gameStateStore.character);
const playerStatus = computed(() => gameStateStore.playerStatus);
const daoData = computed(() => gameStateStore.thousandDao);
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

// 名字首字，用于头像占位
const nameInitial = computed(() => {
  const n = String(baseInfo.value?.名字 || '').trim();
  return n ? n.charAt(0) : '?';
});

// 自动计算当前年龄
const currentAge = computed(() => {
  const birthdate = baseInfo.value?.出生日期;
  const gameTime = saveData.value?.游戏时间;

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
  if (!saveData.value?.修炼功法 || !saveData.value?.背包?.物品) {
    return null;
  }
  const techniqueId = saveData.value.修炼功法.物品ID;
  if (!techniqueId) {
    return null;
  }
  const techniqueItem = saveData.value.背包.物品[techniqueId];
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
      label: '气血',
      current: safe(playerStatus.value.气血?.当前),
      max: safeMax(playerStatus.value.气血?.上限),
      color: 'red'
    },
    {
      label: '灵气',
      current: safe(playerStatus.value.灵气?.当前),
      max: safeMax(playerStatus.value.灵气?.上限),
      color: 'blue'
    },
    {
      label: '神识',
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

const bodyParts = computed(() => {
  const parts = saveData.value?.身体部位开发;
  if (!parts || typeof parts !== 'object') return [];

  return Object.entries(parts)
    .filter(([, details]) => details && typeof details === 'object')
    .map(([name, details]) => {
      const part = details as PlayerBodyPart;
      return {
        name,
        description: part.特征描述 || '暂无描述',
      };
    });
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
      const requiredProficiency = skillInfo.解锁需要熟练度 ?? 100;
      const isUnlockedByProficiency = (technique.修炼进度 || 0) >= requiredProficiency;
      return !(isExplicitlyUnlocked || isUnlockedByProficiency);
    })
    .map((skillInfo: TechniqueSkill) => {
      const requiredProficiency = skillInfo.解锁需要熟练度 ?? 100;
      return {
        name: skillInfo.技能名称,
        description: skillInfo.技能描述 || '',
        type: '功法技能',
        unlockCondition: requiredProficiency === 0 ? '自动解锁' : `需要熟练度 ${requiredProficiency}%`,
        unlocked: false,
      };
    });
});

// 已学技能（所有已掌握的技能）
const allLearnedSkills = computed((): LearnedSkillDisplay[] => {
  const mastered = saveData.value?.掌握技能 || [];

  let fromTechnique: LearnedSkillDisplay[] = [];
  if (fullCultivationTechnique.value && fullCultivationTechnique.value.功法技能) {
    const technique = fullCultivationTechnique.value;
    if (!technique.功法技能) return [];
    fromTechnique = technique.功法技能
      .filter((skillInfo: TechniqueSkill) => {
        const isExplicitlyUnlocked = (technique.已解锁技能 || []).includes(skillInfo.技能名称);
        const isUnlockedByProficiency = (technique.修炼进度 || 0) >= (skillInfo.解锁需要熟练度 ?? 100);
        return isExplicitlyUnlocked || isUnlockedByProficiency;
      })
      .map((skillInfo: TechniqueSkill) => {
        return {
          name: skillInfo.技能名称,
          proficiency: getPersistentProficiency(skillInfo.技能名称, 'technique'),
          source: technique.名称 || '功法',
          type: '功法技能',
          description: skillInfo.技能描述 || '通过功法修炼掌握',
          unlocked: true,
        };
      });
  }

  const allSkills = [...mastered.map(s => ({
    name: s.技能名称,
    proficiency: s.熟练度,
    source: s.来源,
    type: '掌握技能',
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
  const relations = saveData.value?.人物关系 || {};
  return (Object.values(relations) as NpcProfile[]).filter(npc => npc && npc.名字).length;
});

const averageFavorability = computed(() => {
  if (!saveData.value?.人物关系) return 0;
  const relations = (Object.values(saveData.value.人物关系) as NpcProfile[]).filter(npc => npc && npc.名字);
  if (relations.length === 0) return 0;
  const total = relations.reduce((sum, rel) => sum + (rel.好感度 || 0), 0);
  return Math.round(total / relations.length);
});

// 背包统计
const inventoryItemCount = computed(() => {
  const items = saveData.value?.背包?.物品 || {};
  // 仅统计有效物品：键不以下划线开头，值为对象且包含名称
  return Object.entries(items)
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
      return '等待仙缘';
    case '蛮兽':
    case '灵兽':
      return '野性本能';
    case '动物':
      return '自然状态';
    default:
      return '等待觉醒';
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
  if (!talentTier) return '未知';
  if (typeof talentTier === 'string') return talentTier;
  return talentTier.name || '未知';
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
    .map(t => {
      if (typeof t === 'string') {
        return { name: t, description: '' };
      }
      if (typeof t === 'object' && t !== null) {
        // 修复：正确提取中英文字段的名称和描述
        const talentObj = t as Record<string, unknown>;
        const name = (talentObj.name || talentObj['名称'] || '') as string;
        const description = (talentObj.description || talentObj['描述'] || '') as string;

        // 只有当名称和描述都为空时才过滤掉
        if (!name && !description) return null;

        return {
          name: name || '未知天赋',
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
  const quality = item.品质?.quality || '未知';
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
  const items = saveData.value?.背包?.物品 || {};
  return Object.entries(items)
    .filter(([key, val]) => !String(key).startsWith('_') && val && typeof val === 'object')
    .map(([, val]) => val as Item)
    .filter((item: Item) => item.类型 === type).length;
};

const getSpiritStoneCount = (grade: '下品' | '中品' | '上品' | '极品'): number => {
  return saveData.value?.背包?.灵石?.[grade] || 0;
};

// 清理状态效果描述，去除重复的时间信息
const getCleanEffectDescription = (effect: StatusEffect): string => {
  if (!effect || !effect.状态描述) return '';

  let description = effect.状态描述;
  const duration = effect.时间;

  // 如果描述中包含了时间信息，则移除重复部分
  if (duration && description.includes(duration)) {
    // 移除包含时间信息的句子或短语
    description = description
      .replace(new RegExp(`[^。]*${duration}[^。]*。`, 'g'), '')
      .replace(new RegExp(`持续时间[：][^。]*${duration}[^。]*。`, 'g'), '')
      .replace(new RegExp(`剩余时间[：][^。]*${duration}[^。]*。`, 'g'), '')
      .replace(new RegExp(`时间[：][^。]*${duration}[^。]*。`, 'g'), '')
      .trim();
  }

  return description || '无描述';
};

// 格式化状态效果生成时间
const formatEffectCreatedTime = (effect: StatusEffect): string => {
  if (!effect.生成时间) return '未知';
  const { 年, 月, 日, 小时, 分钟 } = effect.生成时间;
  return `${年}年${月}月${日}日 ${小时 || 0}:${String(分钟 ?? 0).padStart(2, '0')}`;
};

// 格式化状态效果剩余时间
const formatEffectRemainingTime = (effect: StatusEffect): string => {
  if (!saveData.value?.游戏时间) return '未知';
  const remainingMinutes = calculateRemainingMinutes(effect, saveData.value.游戏时间);
  return formatMinutesToDuration(remainingMinutes);
};

// 移除状态效果
const handleRemoveEffect = async (effectName: string) => {
  if (!saveData.value) return;

  const confirmed = confirm(`确定要移除状态效果"${effectName}"吗？`);
  if (!confirmed) return;

  try {
    // 从存档数据中移除
    const success = removeStatusEffect(saveData.value, effectName);

    if (success) {
      // The `removeStatusEffect` mutates the object. Now we need to persist it.
      await characterStore.saveCurrentGame();
      debug.log('角色详情面板', `已移除状态效果: ${effectName}`);
    } else {
      debug.warn('角色详情面板', `移除状态效果失败: ${effectName}`);
    }
  } catch (error) {
    debug.error('角色详情面板', '移除状态效果失败:', error);
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
      stage: '初始阶段',
      currentExp: 0,
      totalExp: 0,
      progressPercent: 0,
      description: '此大道已解锁，但尚未开始修炼'
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
    stageName = stage === 0 ? '未门' : `第${stage}阶段`;
  }

  return {
    name: selectedDao.value,
    stage: stageName,
    currentExp,
    totalExp,
    progressPercent,
    description: dao.描述 || '此道深奥玄妙，需持之以恒方能有所成就'
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
    await characterStore.reloadFromStorage();
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

// 每次面板激活时重新获取数据
onActivated(async () => {
  debug.log('人物详情', '面板激活，刷新数据');
  await refreshData();
});

// 获取出生地显示文本
const getOriginDisplay = (origin: Origin | string | undefined): string => {
  if (!origin) return '待定';
  if (typeof origin === 'string') return origin;
  return (origin as any).名称 || origin.name || '待定';
};

// 显示出身详情
const showOriginDetails = (origin: Origin | string | undefined) => {
  if (origin && typeof origin === 'object') {
    const name = (origin as any).名称 || origin.name;
    const desc = (origin as any).描述 || origin.description;
    uiStore.showDetailModal({
      title: `出身背景: ${name}`,
      content: desc,
    });
  }
};

// 增强的灵根系统 - 简化版
const getSpiritRootDisplay = (spiritRoot: SpiritRoot | string | undefined): string => {
  if (!spiritRoot) return '未知';
  if (typeof spiritRoot === 'string') return spiritRoot;
  const name = (spiritRoot as any).名称 || spiritRoot.name || '未知';
  const tier = (spiritRoot as any).品级 || spiritRoot.tier;
  if (tier && tier !== '未知' && tier !== '凡品') {
    return `${name}(${tier})`;
  }
  return name;
};

// 格式化灵根显示（简洁版，用于顶部）
const formatSpiritRoot = (spiritRoot: SpiritRoot | string | undefined): string => {
  if (!spiritRoot) return '未知';
  if (typeof spiritRoot === 'string') return spiritRoot;
  return (spiritRoot as any).名称 || spiritRoot.name || '未知';
};

const getSpiritRootGrade = (spiritRoot: SpiritRoot | string | undefined): string => {
  if (typeof spiritRoot === 'object' && spiritRoot) {
    return (spiritRoot as any).品级 || spiritRoot.tier || '凡品';
  }
  return '凡品';
};

const getSpiritRootDescription = (spiritRoot: SpiritRoot | string | undefined): string => {
  if (typeof spiritRoot === 'object' && spiritRoot) {
    return (spiritRoot as any).描述 || spiritRoot.description || '未知';
  }
  return '未知';
};

const getSpiritRootClass = (spiritRoot: SpiritRoot | string | undefined): string => {
  if (typeof spiritRoot !== 'object' || !spiritRoot) return 'spirit-unknown';
  const grade = ((spiritRoot as any).品级 || spiritRoot.tier || '').toLowerCase();

  if (grade.includes('神品')) return 'spirit-divine';
  if (grade.includes('极品')) return 'spirit-supreme';
  if (grade.includes('上品')) return 'spirit-superior';
  if (grade.includes('中品')) return 'spirit-medium';
  if (grade.includes('下品')) return 'spirit-inferior';
  if (grade.includes('凡品')) return 'spirit-common';

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
    '特殊': '特殊'
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
  flex-direction: column;
  gap: 16px;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  flex: 1;
}

.header-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--color-surface-light);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.stat-value {
  font-size: 0.9rem;
  color: var(--color-text);
  font-weight: 600;
}

.stat-value.gender.gender-男 {
  color: #3b82f6;
}

.stat-value.gender.gender-女 {
  color: #ec4899;
}

.stat-value.spirit-root {
  color: var(--color-primary);
}

.stat-value.reputation {
  color: var(--color-warning);
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

.age-chip {
  color: var(--color-info);
  background: rgba(var(--color-info-rgb), 0.06);
  border-color: rgba(var(--color-info-rgb), 0.35);
}

.location-chip {
  color: var(--color-success);
  background: rgba(var(--color-success-rgb), 0.06);
  border-color: rgba(var(--color-success-rgb), 0.35);
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
  gap: 8px;
}

.cultivation-compact.mortal {
  padding: 4px 8px;
  background: rgba(var(--color-text-tertiary-rgb), 0.08);
  border: 1px dashed rgba(var(--color-text-tertiary-rgb), 0.25);
  border-radius: 8px;
}

.compact-bar {
  width: 120px;
  height: 6px;
  background: rgba(var(--color-border-rgb), 0.5);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.compact-progress {
  height: 100%;
  background: linear-gradient(90deg,
    var(--color-info) 0%,
    var(--color-success) 80%,
    var(--color-warning) 100%
  );
  width: 0%;
  transition: width 0.3s ease;
  border-radius: 3px;
}

.compact-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  min-width: 28px;
}

.compact-text {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
  min-width: 45px;
  text-align: right;
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

.gender-女 .gender-symbol {
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-hover));
  box-shadow: 0 4px 12px rgba(var(--color-accent-rgb), 0.3);
}

.gender-男 .gender-symbol {
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

.gender-value.gender-女 {
  background: rgba(var(--color-accent-rgb), 0.1);
  color: var(--color-accent);
  border: 1px solid rgba(var(--color-accent-rgb), 0.3);
}

.gender-value.gender-男 {
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
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
  font-weight: 400;
  opacity: 0.9;
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

/* 信息区块优化 */
.info-section {
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
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

/* 生命状态颜�?红蓝金三�?*/
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
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  padding: 12px;
  background: var(--color-surface);
  border-radius: 8px;
  border-left: 3px solid var(--color-primary);
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
  align-items: center;
  margin-bottom: 4px;
}

.effect-name {
  font-weight: 600;
}

.effect-remove-btn {
  padding: 4px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.effect-remove-btn:hover {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: white;
}

.effect-duration {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.effect-description {
  font-size: 0.85rem;
  color: var(--color-text);
  line-height: 1.4;
  margin-bottom: 8px;
}

.effect-time-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

.body-parts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.body-part-item {
  padding: 12px;
  background: var(--color-surface);
  border-radius: 8px;
  border-left: 4px solid var(--color-info);
}

.part-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.part-name {
  font-weight: 600;
  color: var(--color-text);
}

.part-level {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(var(--color-info-rgb), 0.1);
  color: var(--color-info);
}

.part-description {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.effect-created,
.effect-remaining {
  opacity: 0.8;
}

/* 六司属�?*/
.basic-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.basic-info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--color-surface-light);
  border-radius: 6px;
  min-height: 36px;
}

.basic-info-item .info-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.basic-info-item .info-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.basic-info-item .info-value.gender.gender-男 {
  color: #3b82f6;
}

.basic-info-item .info-value.gender.gender-女 {
  color: #ec4899;
}

.basic-info-item .info-value.origin {
  color: var(--color-accent);
}

.basic-info-item .info-value.world {
  color: var(--color-primary);
}

.basic-info-item .info-value.race {
  color: var(--color-info);
}

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

.no-effects-text {
  color: var(--color-text-secondary);
  font-style: italic;
  font-size: 0.85rem;
  padding-top: 8px;
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
  min-width: 2px; /* 确保即使0%时也有最小宽度显�?*/
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
  /* 🔥 移动端点击优化 */
  touch-action: manipulation;
  -webkit-tap-highlight-color: rgba(var(--color-primary-rgb), 0.1);
  user-select: none;
}

.dao-item:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.1);
}

.dao-item:active {
  transform: scale(0.98);
  background: var(--color-surface-hover);
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
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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
.border-quality-神品, .text-quality-神品 { color: #ef4444 !important; }
.border-quality-极品, .text-quality-极品 { color: #f59e0b !important; }
.border-quality-上品, .text-quality-上品 { color: #8b5cf6 !important; }
.border-quality-中品, .text-quality-中品 { color: #3b82f6 !important; }
.border-quality-下品, .text-quality-下品 { color: #10b981 !important; }
.border-quality-凡品, .text-quality-凡品 { color: #84cc16 !important; }
.border-quality-未知, .text-quality-未知 { color: var(--color-text) !important; }

/* 宗门关系颜色 */
.relationship-恶劣 { color: var(--color-danger) !important; }
.relationship-一般 { color: var(--color-text-secondary) !important; }
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

  .header-main {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-right {
    width: 100%;
  }

  .header-stats {
    padding-top: 8px;
    gap: 8px;
  }

  .stat-item {
    flex: 1 1 calc(50% - 4px);
    min-width: 120px;
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
  gap: 8px;
  width: 100%;
}

.spirit-root-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.spirit-root-name-section {
  display: flex;
  justify-content: flex-start;
}

.spirit-root-badges {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

.badge-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.spirit-root-grade {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
  min-width: 32px;
}

.spirit-root-grade.grade-下品 {
  background: linear-gradient(135deg, #8B5CF6, #A78BFA);
  color: white;
}

.spirit-root-grade.grade-中品 {
  background: linear-gradient(135deg, #3B82F6, #60A5FA);
  color: white;
}

.spirit-root-grade.grade-上品 {
  background: linear-gradient(135deg, #10B981, #34D399);
  color: white;
}

.spirit-root-grade.grade-极品 {
  background: linear-gradient(135deg, #F59E0B, #FBBF24);
  color: white;
}

.spirit-root-grade.grade-神品 {
  background: linear-gradient(135deg, #DC2626, #F87171);
  color: white;
}

.spirit-root-grade.grade-仙品 { background: linear-gradient(135deg, #EF4444, #F87171); color: white; }
.spirit-root-grade.grade-天品 { background: linear-gradient(135deg, #EF4444, #F87171); color: white; }

.spirit-root-grade.grade-圣品 {
  background: linear-gradient(135deg, #EC4899, #F472B6);
  color: white;
}

.spirit-root-quality {
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  text-align: center;
  border: 1px solid;
}

.spirit-root-quality.quality-变异 {
  background: rgba(139, 69, 19, 0.1);
  color: #8B4513;
  border-color: #8B4513;
}

.spirit-root-quality.quality-复合 {
  background: rgba(75, 85, 99, 0.1);
  color: #4B5563;
  border-color: #4B5563;
}

.spirit-root-quality.quality-传说 {
  background: linear-gradient(135deg, #7C3AED, #A78BFA);
  color: white;
  border: none;
}

.spirit-root-desc {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-style: italic;
  max-width: 200px;
  text-align: right;
  line-height: 1.4;
  margin-top: 0.25rem;
}

.quality-仙品 { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; }
.quality-天品 { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; }
.quality-地品 { background: linear-gradient(135deg, #a78bfa, #8b5cf6); color: white; }
.quality-玄品 { background: linear-gradient(135deg, #60a5fa, #3b82f6); color: white; }
.quality-黄品 { background: linear-gradient(135deg, #34d399, #10b981); color: white; }
.quality-凡品 { background: linear-gradient(135deg, #9ca3af, #6b7280); color: white; }

/* 修炼速度样式 */
.spirit-root-speed {
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(135deg, #10b981, #34d399);
  color: white;
  border: none;
  margin-left: 4px;
}

/* 灵根特殊效果样式 */
.spirit-root-effects {
  margin-top: 8px;
}

.effects-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.effects-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.effect-tag {
  padding: 2px 6px;
  font-size: 0.7rem;
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-primary);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.2);
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

.talent-description-display {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-top: 4px;
  padding-left: 8px;
  border-left: 2px solid var(--color-border);
}

/* 新的天赋与灵根卡片样式 */
.talent-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 天赋容器样式 */
.talents-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.talents-container.no-talents {
  opacity: 0.7;
}

.talent-item.no-talent {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px;
  background: var(--color-surface-light);
  border-radius: 8px;
  border: 1px dashed var(--color-border);
}

.talent-item.no-talent .talent-name {
  color: var(--color-text-secondary);
  font-style: italic;
  font-size: 0.9rem;
}

.talent-tier-card,
.spirit-root-card,
.talents-card {
  padding: 16px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.spirit-root-card {
  cursor: pointer;
}

.spirit-root-card:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(var(--color-primary-rgb), 0.15);
}

.talent-tier-card:hover,
.talents-card:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-hover);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.1);
}

/* 天资等级描述样式 */
.tier-description {
  margin-top: 12px;
  padding: 10px;
  background: var(--color-background);
  border-radius: 8px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  border-left: 3px solid var(--color-primary);
}

/* 卡片头部样式 */
.tier-header,
.root-header,
.talents-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(var(--color-border-rgb), 0.3);
}

.tier-icon,
.root-icon,
.talents-icon {
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tier-label,
.root-label,
.talents-label {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.9rem;
}

.click-hint {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.spirit-root-card:hover .click-hint {
  opacity: 1;
}

/* 灵根卡片新样式 */
.root-main-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}

.root-name {
  font-size: 1.1rem;
  font-weight: 700;
}

.property-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.prop-badge {
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 999px;
  border: 1px solid transparent;
}

.grade-badge {
  color: white;
  border: none;
}
.grade-凡品 { background: #9ca3af; }
.grade-下品 { background: #10b981; }
.grade-中品 { background: #3b82f6; }
.grade-上品 { background: #8b5cf6; }
.grade-极品 { background: #f59e0b; }
.grade-神品 { background: #ef4444; }
.grade-特殊 { background: linear-gradient(45deg, #f59e0b, #ef4444); }


.speed-badge {
  background: rgba(var(--color-info-rgb), 0.1);
  color: var(--color-info);
  border-color: rgba(var(--color-info-rgb), 0.3);
}

.quality-badge {
  background: rgba(var(--color-accent-rgb), 0.1);
  color: var(--color-accent);
  border-color: rgba(var(--color-accent-rgb), 0.3);
}

.root-description {
  margin-top: 12px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-style: italic;
  line-height: 1.5;
}

.root-effects {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(var(--color-border-rgb), 0.3);
}

.effects-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.root-effects .effect-tag {
  padding: 4px 10px;
  font-size: 0.8rem;
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
  border-radius: 999px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
}

/* 灵根弹窗新样式 */
.detail-value.type-value,
.detail-value.grade-value,
.detail-value.speed-value {
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 1rem;
  display: inline-block;
  margin-top: 4px;
}

.detail-value.grade-value {
  color: white;
}

.detail-value.speed-value {
  background: rgba(var(--color-info-rgb), 0.1);
  color: var(--color-info);
  border: 1px solid rgba(var(--color-info-rgb), 0.3);
}

.talents-count {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-left: auto;
}

/* 声望显示样式 */
.reputation-item .vital-label {
  color: var(--color-warning);
}

.reputation-display {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.reputation-value {
  padding: 4px 12px;
  background: linear-gradient(135deg, rgba(var(--color-warning-rgb), 0.1), rgba(var(--color-warning-rgb), 0.05));
  border: 1px solid rgba(var(--color-warning-rgb), 0.3);
  border-radius: 16px;
  font-weight: 600;
  color: var(--color-warning);
  font-size: 0.85rem;
}

.reputation-number {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  opacity: 0.8;
  margin-left: 4px;
}

/* 灵根详情弹窗样式 */
.spirit-root-modal {
  background: var(--color-surface);
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
  animation: modal-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.spirit-root-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.detail-card {
  padding: 16px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  text-align: center;
  transition: all 0.2s ease;
}

.detail-card:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.1);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(var(--color-border-rgb), 0.3);
}

.detail-icon {
  font-size: 1.2rem;
}

.detail-title {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.9rem;
}

.detail-value {
  font-weight: 700;
  color: var(--color-primary);
  font-size: 1.1rem;
}

.spirit-root-description,
.spirit-root-effects-section,
.advanced-details {
  margin-bottom: 20px;
}

.spirit-root-description h4,
.spirit-root-effects-section h4,
.advanced-details h4 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary);
}

.spirit-root-description p {
  margin: 0;
  color: var(--color-text);
  line-height: 1.6;
  font-style: italic;
}

.effects-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.effects-grid .effect-tag-modal {
  padding: 6px 14px;
  background: rgba(var(--color-success-rgb), 0.1);
  color: var(--color-success);
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 500;
  border: 1px solid rgba(var(--color-success-rgb), 0.3);
  transition: all 0.2s ease;
}

.effects-grid .effect-tag-modal:hover {
  background: rgba(var(--color-success-rgb), 0.2);
  transform: translateY(-1px);
}

.advanced-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.advanced-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--color-surface-light);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.advanced-label {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.advanced-value {
  font-weight: 600;
  color: var(--color-text);
}

/* 响应式优化 */
@media (max-width: 640px) {
  .spirit-root-detail-grid {
    grid-template-columns: 1fr;
  }

  .talent-content {
    gap: 12px;
  }

  .talent-tier-card,
  .spirit-root-card,
  .talents-card {
    padding: 12px;
  }

  .tier-value {
    font-size: 1rem;
    padding: 4px 12px;
  }

  .property-badges {
    justify-content: center;
    gap: 4px;
  }
  }

  .info-value.clickable {
    cursor: pointer;
    text-decoration: underline;
    text-decoration-style: dashed;
    text-underline-offset: 3px;
    transition: color 0.2s, text-decoration-color 0.2s;
  }

  .info-value.clickable:hover {
    text-decoration-style: solid;
    color: var(--color-primary-hover);
  }

  .info-value.origin.clickable {
    color: var(--color-accent);
  }

  .info-value.origin.clickable:hover {
    color: var(--color-accent-hover);
  }

/* ==================== 全新顶部卡片设计 ==================== */
.character-header-card {
  position: relative;
  background: linear-gradient(135deg, #1a1f35 0%, #0f1419 100%);
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.header-bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 50%, rgba(168, 85, 247, 0.15) 0%, transparent 50%);
  pointer-events: none;
}

.header-content {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 24px;
  padding: 28px;
  align-items: center;
}

.profile-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar-wrapper {
  position: relative;
}

.avatar-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
  position: relative;
  z-index: 2;
}

.avatar-text {
  color: #fff;
  font-size: 2rem;
  font-weight: 800;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.avatar-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%);
  border-radius: 50%;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
}

.identity-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.character-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  letter-spacing: 0.5px;
}

.character-subtitle {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.subtitle-item {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.gender-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 600;
}

.gender-badge.gender-男 {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.gender-badge.gender-女 {
  background: rgba(236, 72, 153, 0.2);
  color: #f472b6;
  border: 1px solid rgba(236, 72, 153, 0.3);
}

.subtitle-divider {
  color: rgba(255, 255, 255, 0.3);
}

.age-text, .origin-text, .race-text {
  color: rgba(255, 255, 255, 0.7);
}

.core-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  flex: 1;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  flex-shrink: 0;
}

.realm-card .card-icon {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.2));
  color: #60a5fa;
}

.spirit-card .card-icon {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(147, 51, 234, 0.2));
  color: #c084fc;
}

.location-card .card-icon {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2));
  color: #34d399;
}

.reputation-card .card-icon {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2));
  color: #fbbf24;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.card-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-value {
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.4;
  word-break: break-all;
}

.location-value {
  font-size: 0.9rem;
  line-height: 1.3;
}

.cultivation-section {
  min-width: 200px;
}

.cultivation-progress-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
}

.progress-percentage {
  font-size: 1.1rem;
  font-weight: 700;
  color: #60a5fa;
}

.progress-bar-container {
  position: relative;
}

.progress-bar-bg {
  height: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  overflow: hidden;
  position: relative;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 999px;
  position: relative;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-bar-shine {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  /* 移除动画效果 */
}

.progress-text {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

.cultivation-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.status-icon {
  font-size: 1.5rem;
}

.status-text {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .header-content {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .core-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .cultivation-section {
    min-width: auto;
  }
}

@media (max-width: 768px) {
  .header-content {
    padding: 20px;
  }

  .profile-section {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .character-subtitle {
    justify-content: center;
  }

  .core-stats-grid {
    grid-template-columns: 1fr;
  }

  .avatar-circle {
    width: 64px;
    height: 64px;
  }

  .avatar-text {
    font-size: 1.5rem;
  }

  .character-title {
    font-size: 1.5rem;
  }
}
  </style>
