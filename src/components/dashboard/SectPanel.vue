<template>
  <div class="sect-panel">
    <div class="panel-content">
      <div class="sect-container">
        <!-- 左侧：宗门列表 -->
        <div class="sect-list">
          <div class="list-header">
            <h3 class="panel-title">势力宗门</h3>
            <div class="search-bar">
              <Search :size="16" />
              <input
                v-model="searchQuery"
                placeholder="搜索宗门..."
                class="search-input"
              />
            </div>
          </div>

          <div class="list-content">
            <div v-if="isLoading" class="loading-state">
              <Loader2 :size="32" class="animate-spin" />
              <p>{{ t('正在读取宗门信息...') }}</p>
            </div>
            <div v-else-if="filteredSects.length === 0" class="empty-state">
              <Building :size="48" class="empty-icon" />
              <p class="empty-text">{{ t('暂无宗门信息') }}</p>
              <p class="empty-hint">{{ t('世界信息将由AI根据游戏进程生成') }}</p>
              <div class="empty-actions">
                <button class="empty-action-btn primary" @click="sendSectGenerationPrompt">生成势力信息</button>
                <button class="empty-action-btn" @click="forceRefresh">刷新</button>
              </div>
              <p class="empty-prompt-hint">提示：点击“生成势力信息”会自动发送到对话并写入 <code>世界.信息.势力信息</code>。</p>
            </div>
            <div v-else class="sect-list-content">
              <div
                v-for="sect in filteredSects"
                :key="sect.名称"
                class="sect-card"
                :class="{
                  selected: selectedSect?.名称 === sect.名称,
                  [`type-${getSectTypeClass(sect.类型)}`]: true,
                  'can-join': sect.可否加入
                }"
                @click="selectSect(sect)"
              >
                <div class="sect-icon">
                  <span class="sect-emoji">{{ getSectEmoji(sect.类型) }}</span>
                </div>

                <div class="sect-info">
                  <div class="sect-name">{{ sect.名称 }}</div>
                  <div class="sect-meta">
                    <span class="sect-type">{{ sect.类型 }}</span>
                  </div>

                </div>
                <ChevronRight :size="16" class="arrow-icon" />
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：宗门详情 -->
        <div class="sect-detail">
          <div v-if="selectedSect" class="detail-content">
            <!-- 详情头部 -->
            <div class="detail-header">
              <div class="detail-icon">
                <span class="sect-emoji-large">{{ getSectEmoji(selectedSect.类型) }}</span>
              </div>
              <div class="detail-info">
                <h3 class="detail-name">{{ selectedSect.名称 }}</h3>
                <div class="detail-badges">
                  <span class="type-badge" :class="`type-${getSectTypeClass(selectedSect.类型)}`">
                    {{ selectedSect.类型 }}
                  </span>
                  <span class="level-badge" :class="`level-${selectedSect.等级}`">
                    {{ formatSectLevel(selectedSect.等级) }}
                  </span>

                </div>
              </div>
            </div>

            <!-- 详情主体 -->
            <div class="detail-body">
              <!-- 成员统计 -->
              <div class="detail-section" v-if="selectedSect.成员数量">
                <h5 class="section-title">
                  <Users :size="16" />
                  <span>成员统计</span>
                </h5>
                <div class="member-stats">
                  <!-- 总体统计 -->
                  <div class="total-members">
                    <span class="total-label">总人数</span>
                    <span class="total-value">{{ selectedSect.成员数量?.总数 || selectedSect.成员数量?.total || 0 }}人</span>
                  </div>

                  <!-- 境界分布 -->
                  <div class="realm-distribution" v-if="selectedSect.成员数量?.按境界 || selectedSect.成员数量?.byRealm">
                    <h6 class="distribution-title">境界分布</h6>
                    <div class="realm-stats">
                      <div
                        v-for="(count, realm) in (selectedSect.成员数量?.按境界 || selectedSect.成员数量?.byRealm)"
                        :key="realm"
                        class="realm-item"
                      >
                        <span class="realm-name">{{ formatRealmName(String(realm)) }}</span>
                        <span class="realm-count">{{ count }}人</span>
                      </div>
                    </div>
                  </div>

                  <!-- 职位分布 -->
                  <div class="position-distribution" v-if="selectedSect.成员数量?.按职位 || selectedSect.成员数量?.byPosition">
                    <h6 class="distribution-title">职位分布</h6>
                    <div class="position-stats">
                      <div
                        v-for="(count, position) in (selectedSect.成员数量?.按职位 || selectedSect.成员数量?.byPosition)"
                        :key="position"
                        class="position-item"
                        v-show="count > 0"
                      >
                        <span class="position-name">{{ position }}</span>
                        <span class="position-count">{{ count }}人</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 基础信息 -->
              <div class="detail-section">
                <h5 class="section-title">
                  <Building :size="16" />
                  <span>基础信息</span>
                </h5>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">宗门类型</span>
                    <span class="info-value">{{ selectedSect.类型 }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">宗门等级</span>
                    <span class="info-value">{{ selectedSect.等级 }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">所在大洲</span>
                    <span class="info-value">{{ getContinentName(selectedSect) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">主要资源</span>
                    <span class="info-value">{{ getMainResources(selectedSect) }}</span>
                  </div>

                </div>

                <!-- 宗门领导层 -->
                <div v-if="selectedLeadership" class="leadership-info">
                  <h6 class="leadership-title">宗门领导</h6>

                  <div class="leader-grid">
                    <div class="leader-item primary-leader">
                      <span class="leader-role">宗主</span>
                      <span class="leader-name">{{ selectedLeadership.宗主 }}</span>
                      <span class="leader-realm" v-if="selectedLeadership.宗主修为">{{ selectedLeadership.宗主修为 }}</span>
                    </div>
                    <div v-if="selectedLeadership.副宗主" class="leader-item">
                      <span class="leader-role">副宗主</span>
                      <span class="leader-name">{{ selectedLeadership.副宗主 }}</span>
                    </div>
                    <div v-if="selectedLeadership.圣女" class="leader-item">
                      <span class="leader-role">圣女</span>
                      <span class="leader-name">{{ selectedLeadership.圣女 }}</span>
                    </div>
                  </div>

                  <div class="sect-strength">
                    <div class="strength-item">
                      <span class="strength-label">最强修为</span>
                      <span class="strength-value peak-power">{{ selectedLeadership.最强修为 || selectedLeadership.宗主修为 }}</span>
                    </div>
                    <div v-if="selectedLeadership?.综合战力" class="strength-item">
                      <span class="strength-label">综合战力</span>
                      <span class="strength-value power-rating" :class="getPowerRatingClass(selectedLeadership.综合战力 || 0)">
                        {{ selectedLeadership.综合战力 || 0 }}/100
                        <span class="power-level">({{ getPowerLevel(selectedLeadership.综合战力 || 0) }})</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div class="sect-description">
                  <h6 class="desc-title">宗门描述</h6>
                  <p class="desc-text">{{ selectedSect.描述 }}</p>
                </div>

                <!-- 宗门特色 -->
                <div class="sect-specialties" v-if="getSectSpecialties(selectedSect).length > 0">
                  <h6 class="specialties-title">宗门特色</h6>
                  <div class="specialties-tags">
                    <span
                      v-for="specialty in getSectSpecialties(selectedSect)"
                      :key="specialty"
                      class="specialty-tag"
                    >
                      {{ specialty }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 关系状态 -->
              <div class="detail-section">
                <h5 class="section-title">
                  <Heart :size="16" />
                  <span>关系状态</span>
                </h5>
                <div class="relationship-info">
                  <div class="relationship-item">
                    <span class="relationship-label">与你的关系</span>
                    <span class="relationship-value" :class="getRelationshipClass(getRelationshipText(selectedSect.与玩家关系))">
                      {{ getRelationshipText(selectedSect.与玩家关系) }}
                    </span>
                  </div>
                  <div class="relationship-item">
                    <span class="relationship-label">声望值</span>
                    <span class="relationship-value reputation-value" :class="getReputationClass(getReputationValue(selectedSect.声望值))">
                      {{ getReputationValue(selectedSect.声望值) }}
                      <span class="reputation-level">({{ getReputationLevel(getReputationValue(selectedSect.声望值)) }})</span>
                    </span>
                  </div>
                </div>
              </div>

              <!-- 势力范围 -->
              <div class="detail-section" v-if="selectedSect.势力范围详情">
                <h5 class="section-title">
                  <Map :size="16" />
                  <span>势力范围</span>
                </h5>
                <div class="territory-info">
                  <div class="influence-description">
                    <strong>影响范围：</strong>{{ selectedSect.势力范围详情.影响范围 || '未知' }}
                  </div>

                  <div v-if="selectedSect.势力范围详情.控制区域?.length" class="controlled-areas">
                    <strong>控制区域：</strong>
                    <div class="areas-list">
                      <span
                        v-for="area in selectedSect.势力范围详情.控制区域"
                        :key="area"
                        class="area-tag"
                      >
                        {{ area }}
                      </span>
                    </div>
                  </div>

                  <div class="strategic-value">
                    <strong>战略价值：</strong>
                    <div class="value-display">
                      <div class="value-bar">
                        <div
                          class="value-fill"
                          :style="{ width: `${(selectedSect.势力范围详情.战略价值 || 5) * 10}%` }"
                        ></div>
                      </div>
                      <span class="value-text">{{ selectedSect.势力范围详情.战略价值 || 5 }}/10</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 加入条件 -->
              <div class="detail-section" v-if="selectedSect.可否加入">
                <h5 class="section-title">
                  <UserPlus :size="16" />
                  <span>加入条件</span>
                </h5>
                <div class="join-requirements">
                  <div v-if="selectedSect.加入条件?.length" class="requirements-list">
                    <div
                      v-for="requirement in selectedSect.加入条件"
                      :key="requirement"
                      class="requirement-item"
                    >
                      <CheckCircle :size="14" class="requirement-icon" />
                      <span class="requirement-text">{{ requirement }}</span>
                    </div>
                  </div>
                  <div v-else class="no-requirements">
                    <p>暂无特殊加入条件</p>
                  </div>
                </div>

                <!-- 加入好处 -->
                <div v-if="selectedSect.加入好处?.length" class="join-benefits">
                  <h6 class="benefits-title">加入好处</h6>
                  <div class="benefits-list">
                    <div
                      v-for="benefit in selectedSect.加入好处"
                      :key="benefit"
                      class="benefit-item"
                    >
                      <Gift :size="14" class="benefit-icon" />
                      <span class="benefit-text">{{ benefit }}</span>
                    </div>
                  </div>
                </div>

                <!-- 加入按钮 -->
                <div class="join-actions">
                  <button class="join-btn" @click="requestJoinSect(selectedSect)">
                    <UserPlus :size="16" />
                    <span>申请加入</span>
                  </button>
                </div>
              </div>

              <!-- 已加入宗门信息 -->
              <div class="detail-section" v-if="isCurrentSect(selectedSect)">
                <h5 class="section-title">
                  <Crown :size="16" />
                  <span>我的宗门身份</span>
                </h5>
                <div class="current-member-info">
                  <div class="member-status">
                    <div class="status-item">
                      <span class="status-label">职位</span>
                      <span class="status-value position">{{ playerSectInfo?.职位 || '散修' }}</span>
                    </div>
                    <div class="status-item">
                      <span class="status-label">贡献点</span>
                      <span class="status-value contribution">{{ playerSectInfo?.贡献 || 0 }}</span>
                    </div>
                    <div class="status-item">
                      <span class="status-label">声望</span>
                      <span class="status-value reputation">{{ playerSectInfo?.声望 || 0 }}</span>
                    </div>
                    <div class="status-item">
                      <span class="status-label">加入时间</span>
                      <span class="status-value join-date">{{ formatJoinDate(playerSectInfo?.加入日期) }}</span>
                    </div>
                  </div>
                  <div class="member-actions">
                    <button class="leave-btn" @click="requestLeaveSect(selectedSect)">
                      <LogOut :size="16" />
                      <span>退出宗门</span>
                    </button>
                  </div>
                </div>

                <!-- 宗门功能 -->
                <div class="sect-actions">
                  <h6 class="actions-title">宗门势力</h6>
                  <div class="action-buttons">
                    <button class="sect-action-btn" @click="showContribution">
                      <Coins :size="16" />
                      <span>贡献兑换</span>
                    </button>
                    <button class="sect-action-btn" @click="showSectLibrary">
                      <Book :size="16" />
                      <span>宗门藏书</span>
                    </button>
                    <button class="sect-action-btn" @click="showSectMembers">
                      <Users :size="16" />
                      <span>同门师兄弟</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="no-selection">
            <Building :size="64" class="placeholder-icon" />
            <p class="placeholder-text">选择一个宗门查看详细信息</p>
            <p class="placeholder-hint">尘世间的宗门势力等你探索</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useCharacterStore } from '@/stores/characterStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useI18n } from '@/i18n';
import { isTavernEnv } from '@/utils/tavern';
import type { WorldFaction, SectMemberInfo, WorldInfo } from '@/types/game';
import {
  Building, Users, Heart, UserPlus, Crown, CheckCircle,
  Gift, Coins, Book, Search, Loader2,
  ChevronRight, Map, LogOut
} from 'lucide-vue-next';
import { toast } from '@/utils/toast';
import { sendChat } from '@/utils/chatBus';
import { validateAndFixSectDataList } from '@/utils/worldGeneration/sectDataValidator';
import { createJoinedSectState } from '@/utils/sectSystemFactory';

const characterStore = useCharacterStore();
const gameStateStore = useGameStateStore();
const router = useRouter();
const { t } = useI18n();
const isTavernEnvFlag = isTavernEnv();
const isLoading = ref(false);
const selectedSect = ref<WorldFaction | null>(null);
const searchQuery = ref('');

const selectedLeadership = computed(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sect = selectedSect.value as any;
  return sect?.领导层 || sect?.leadership || null;
});

const buildSectGenerationPrompt = () => {
  const mapConfig = (gameStateStore.worldInfo as any)?.地图配置;
  const width = Number(mapConfig?.width) || 10000;
  const height = Number(mapConfig?.height) || 10000;

  return `你是GM，请根据当前剧情与世界设定，生成/补全「世界.信息.势力信息」（数组）。\n\n要求：\n- 每条势力至少包含：名称、类型、等级、描述、宗门驻地、主要资源、可否加入、加入条件、领导层、成员数量、势力范围详情、与玩家关系、声望值。\n- 坐标范围：x 0-${width}，y 0-${height}（游戏坐标，左上角为原点）。\n- 势力必须包含「位置」坐标（对象，含x/y）与「势力范围」（至少4个坐标点）。\n- 内容要与当前世界一致，避免与已存在信息冲突。\n- 严格输出一个 JSON 对象（不要代码块/解释/额外文本，不要 <thinking>）：\n{\n  \"text\": \"【系统】势力信息已补全。\",\n  \"mid_term_memory\": \"\",\n  \"tavern_commands\": [\n    {\"action\":\"set\",\"key\":\"世界.信息.势力信息\",\"value\":[/*...势力数组...*/]}\n  ],\n  \"action_options\": []\n}`;
};

const sendSectGenerationPrompt = () => {
  sendChat(buildSectGenerationPrompt());
  toast.success('已发送到对话');
};

// 获取世界中的宗门势力数据 - 统一数据源（V3：世界.信息.势力信息）
const sectSystemData = computed(() => {
  const data = gameStateStore.getCurrentSaveData();

  if (!data) {
    return { availableSects: [] };
  }

  let availableSects: WorldFaction[] = [];
  const sectSystem = gameStateStore.sectSystem;

  // 从 世界.信息.势力信息 中获取宗门数据
  const worldInfo = (data as any)?.世界?.信息 as WorldInfo | undefined;
  if (worldInfo?.势力信息) {
    // 筛选出宗门类型的势力
    const sectFactions = worldInfo.势力信息.filter((faction: WorldFaction) => {
      if (!faction.类型) return false;

      const type = faction.类型.toLowerCase();
      // 排除明显不是宗门的类型
      const excludeTypes = ['秘境', '遗迹', '禁地', '森林', '山脉', '湖泊', '城池'];
      const shouldExclude = excludeTypes.some(exclude => type.includes(exclude.toLowerCase()));

      if (shouldExclude) return false;
      return true;
    });

    availableSects = sectFactions;
  }

  if (availableSects.length === 0 && sectSystem?.宗门档案 && Object.keys(sectSystem.宗门档案).length > 0) {
    availableSects = Object.values(sectSystem.宗门档案);
  }
  // 去重并应用数据验证
  const uniqueSects = availableSects.filter((sect, index, arr) =>
    arr.findIndex(s => s.名称 === sect.名称) === index
  );

  // 应用宗门数据验证和修复
  const validatedSects = validateAndFixSectDataList(uniqueSects);

  return { availableSects: validatedSects };
});

// 玩家的宗门信息
const playerSectInfo = computed((): SectMemberInfo | undefined => {
  return gameStateStore.sectMemberInfo || undefined;
});

// 获取所有宗门列表
const allSects = computed(() => sectSystemData.value.availableSects);

// 过滤后的宗门列表（只保留搜索功能）
const filteredSects = computed(() => {
  let filtered = [...allSects.value];

  // 搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(sect =>
      sect.名称.toLowerCase().includes(query) ||
      sect.类型.toLowerCase().includes(query) ||
      (sect.描述 && sect.描述.toLowerCase().includes(query))
    );
  }

  // 仅按"等级（几流）"排序，不再使用数值实力
  const order = ['超级', '一流', '二流', '三流', '末流'];
  const rank = (lvl: string | undefined) => {
    if (!lvl) return 999;
    const idx = order.findIndex(k => lvl.includes(k));
    return idx === -1 ? 999 : idx;
  };
  return filtered.sort((a, b) => rank(a.等级) - rank(b.等级));
});

// 获取大洲名称
const getContinentName = (sect: WorldFaction): string => {
  // 优先使用大洲字段
  if (sect.所在大洲) return sect.所在大洲;

  // 从世界信息中查找
  const worldInfo = gameStateStore.worldInfo as WorldInfo | undefined;
  const continents = worldInfo?.continents || worldInfo?.大陆信息;
  if (continents) {
    for (const continent of continents) {
      if (sect.id && (continent.主要势力?.includes(sect.id) || continent.factions?.includes(sect.id))) {
        return continent.名称 || continent.name || '未命名大洲';
      }
      if (continent.主要势力?.includes(sect.名称) || continent.factions?.includes(sect.名称)) {
        return continent.名称 || continent.name || '未命名大洲';
      }
    }
  }

  // 从世界信息的势力信息中查找
  if (worldInfo?.势力信息) {
    for (const faction of worldInfo.势力信息) {
      if ((faction.id && sect.id && faction.id === sect.id) || (faction.名称 === sect.名称)) {
        if (faction.所在大洲) {
          return faction.所在大洲;
        }
      }
    }
  }

  // 如果都找不到，根据位置推测
  if (sect.位置 && typeof sect.位置 === 'object' && 'x' in sect.位置 && 'y' in sect.位置) {
    const lng = sect.位置.x;
    const lat = sect.位置.y;

    // 简单的地理分区推测（可根据实际坐标范围调整）
    if (lng < 110 && lat > 40) return '北境雪域';
    if (lng < 110 && lat < 30) return '南疆荒漠';
    if (lng > 120 && lat > 35) return '东海群岛';
    if (lng > 120 && lat < 35) return '东南丛林';
    return '中土大陆';
  }

  return '未知大洲';
};

// 获取主要资源
const getMainResources = (sect: WorldFaction): string => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectAsAny = sect as any;
  // 优先使用已有的资源信息
  if (sectAsAny.主要资源 && Array.isArray(sectAsAny.主要资源)) {
    return sectAsAny.主要资源.slice(0, 3).join('、');
  }
  if (sectAsAny.resources && Array.isArray(sectAsAny.resources)) {
    return sectAsAny.resources.slice(0, 3).join('、');
  }

  // 根据宗门类型推测资源
  const type = sect.类型 || '';
  if (type.includes('剑')) return '神铁、剑谱、磨剑石';
  if (type.includes('丹')) return '灵药、丹炉、药圃';
  if (type.includes('符') || type.includes('阵')) return '符纸、阵法、法器';
  if (type.includes('魔') || type.includes('邪')) return '魔石、煞气、秘法';
  if (type.includes('商')) return '灵石、珍宝、情报';
  if (type.includes('世家')) return '传承、人脉、底蕴';

  return '灵石、功法、修炼资源';
};

// 获取宗门特色列表
const getSectSpecialties = (sect: WorldFaction): string[] => {
  const specialties: string[] = [];

  // 新格式：特色列表数组
  if (sect.特色列表 && Array.isArray(sect.特色列表)) {
    specialties.push(...sect.特色列表);
  }

  // 旧格式：特色字段（可能是数组或字符串）
  if (sect.特色) {
    if (Array.isArray(sect.特色)) {
      specialties.push(...sect.特色);
    } else if (typeof sect.特色 === 'string') {
      specialties.push(sect.特色);
    }
  }

  // 去重
  return Array.from(new Set(specialties));
};

// 格式化关系文本
const getRelationshipText = (relationship: unknown): string => {
  if (typeof relationship === 'object' && relationship !== null && 'name' in relationship) {
    return String((relationship as { name: string }).name);
  }
  return String(relationship || '中立');
};

// 格式化声望值
const getReputationValue = (reputation: unknown): number => {
  if (typeof reputation === 'object' && reputation !== null && 'value' in reputation) {
    return Number((reputation as { value: number }).value);
  }
  return Number(reputation) || 0;
};

// 工具函数
const getSectEmoji = (type: string): string => {
  const emojiMap: Record<string, string> = {
    '正道宗门': '⛩️',
    '修仙宗门': '⛩️',
    '魔道宗门': '🏴',
    '魔道势力': '🏴',
    '中立宗门': '🏯',
    '修仙世家': '🏘️',
    '世家': '🏘️',
    '商会': '🏪',
    '商会组织': '🏪',
    '散修联盟': '🤝'
  };
  return emojiMap[type] || '🏛️';
};

const getSectTypeClass = (type: string): string => {
  const classMap: Record<string, string> = {
    '正道宗门': 'righteous',
    '修仙宗门': 'righteous',
    '魔道宗门': 'demonic',
    '魔道势力': 'demonic',
    '中立宗门': 'neutral',
    '修仙世家': 'family',
    '世家': 'family',
    '商会': 'merchant',
    '商会组织': 'merchant',
    '散修联盟': 'alliance'
  };
  return classMap[type] || 'neutral';
};

const getPowerLevel = (power: number): string => {
  if (power >= 90) return '天下无双';
  if (power >= 80) return '称霸一方';
  if (power >= 70) return '实力雄厚';
  if (power >= 60) return '颇有实力';
  if (power >= 50) return '中等水平';
  if (power >= 40) return '略有实力';
  return '实力一般';
};

const getPowerRatingClass = (power: number): string => {
  if (power >= 90) return 'power-legendary';
  if (power >= 80) return 'power-supreme';
  if (power >= 70) return 'power-strong';
  if (power >= 60) return 'power-good';
  if (power >= 50) return 'power-average';
  if (power >= 40) return 'power-weak';
  return 'power-poor';
};

const getReputationLevel = (reputation: number): string => {
  if (reputation >= 25) return '声名远扬';
  if (reputation >= 20) return '享有盛誉';
  if (reputation >= 15) return '名声在外';
  if (reputation >= 10) return '小有名气';
  if (reputation >= 5) return '略有声望';
  return '默默无闻';
};

const getReputationClass = (reputation: number): string => {
  if (reputation >= 25) return 'reputation-legendary';
  if (reputation >= 20) return 'reputation-excellent';
  if (reputation >= 15) return 'reputation-good';
  if (reputation >= 10) return 'reputation-fair';
  if (reputation >= 5) return 'reputation-low';
  return 'reputation-none';
};

const getRelationshipClass = (relationship: string): string => {
  const classMap: Record<string, string> = {
    '仇敌': 'enemy',
    '敌对': 'hostile',
    '冷淡': 'cold',
    '中立': 'neutral',
    '友好': 'friendly',
    '盟友': 'ally',
    '附庸': 'vassal'
  };
  return classMap[relationship] || 'neutral';
};

const isCurrentSect = (sect: WorldFaction): boolean => {
  return playerSectInfo.value?.宗门名称 === sect.名称;
};

const formatJoinDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '未知';
  try {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  } catch {
    return '未知';
  }
};

// 格式化宗门等级，避免重复显示"宗门"
const formatSectLevel = (level: string): string => {
  if (!level) return '未知';
  // 如果等级已经包含"宗门"，直接返回
  if (level.includes('宗门')) return level;
  // 否则添加"宗门"后缀
  return level + '宗门';
};

// 格式化境界名称，智能处理"期"后缀
const formatRealmName = (realm: string): string => {
  if (!realm) return '未知';

  // 如果已经包含"期"，直接返回
  if (realm.includes('期')) return realm;

  // 如果是完整的境界描述（如"练气初期"），直接返回
  const fullRealmPattern = /(练气|筑基|金丹|元婴|化神|炼虚|合体|渡劫)(初期|中期|后期|圆满|极境)/;
  if (fullRealmPattern.test(realm)) return realm;

  // 如果只是境界名称（如"练气"、"筑基"），添加"期"后缀
  const simpleRealmPattern = /^(练气|筑基|金丹|元婴|化神|炼虚|合体|渡劫)$/;
  if (simpleRealmPattern.test(realm)) return realm + '期';

  // 其他情况直接返回
  return realm;
};

const selectSect = (sect: WorldFaction) => {
  selectedSect.value = selectedSect.value?.名称 === sect.名称 ? null : sect;
};

const confirmLeave = (currentName: string, nextName?: string) => {
  const tip = nextName
    ? `你已加入${currentName}，是否退出并加入${nextName}？退出后将清空该宗门的贡献与兑换数据。`
    : `确定退出${currentName}？退出后将清空该宗门的贡献与兑换数据。`;
  return window.confirm(tip);
};

const applyLeave = (sectName: string) => {
  gameStateStore.updateState('sectMemberInfo', null);
  gameStateStore.updateState('sectSystem', null);
  toast.success(`已退出 ${sectName}`);
};

const requestLeaveSect = (sect: WorldFaction | null) => {
  const currentName = playerSectInfo.value?.宗门名称;
  if (!currentName) {
    toast.info('尚未加入宗门');
    return;
  }
  if (!confirmLeave(currentName)) return;
  applyLeave(currentName);
  if (sect?.名称 && selectedSect.value?.名称 === sect.名称) {
    selectedSect.value = null;
  }
};

const requestJoinSect = (sect: WorldFaction) => {
  if (!sect.可否加入) {
    toast.warning('该宗门暂不接受加入');
    return;
  }

  const currentName = playerSectInfo.value?.宗门名称;
  if (currentName === sect.名称) {
    toast.info(`你已加入 ${sect.名称}`);
    return;
  }

  if (currentName && currentName !== sect.名称) {
    const shouldSwitch = confirmLeave(currentName, sect.名称);
    if (!shouldSwitch) return;
    applyLeave(currentName);
  }

  const { sectSystem, memberInfo } = createJoinedSectState(sect);
  gameStateStore.updateState('sectMemberInfo', memberInfo);
  gameStateStore.updateState('sectSystem', sectSystem);
  toast.success(`已加入 ${sect.名称}`);
};

const showContribution = () => {
  router.push({ name: 'SectContribution' });
};

const showSectLibrary = () => {
  router.push({ name: 'SectLibrary' });
};

const showSectMembers = () => {
  router.push({ name: 'SectMembers' });
};

// 强制刷新
const forceRefresh = () => {
  characterStore.reloadFromStorage();
  toast.info('已强制刷新数据');
};

</script>

<style scoped>
.sect-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
}

.panel-content {
  flex: 1;
  overflow: hidden;
}

.sect-container {
  height: 100%;
  display: flex;
  background: var(--color-surface);
  overflow: hidden;
}

.sect-list {
  width: 280px; /* 窄一点 */
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

.list-header {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.panel-title {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary);
  text-align: center;
}

.search-bar {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.5rem;
}

.search-bar svg {
  color: var(--color-text-secondary);
  margin-right: 0.5rem;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text);
  font-size: 0.875rem;
}

.list-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-icon {
  opacity: 0.5;
  margin-bottom: 1rem;
}

.empty-text {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 0.8rem;
  opacity: 0.8;
}

.empty-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.empty-action-btn {
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.85rem;
}

.empty-action-btn:hover {
  transform: translateY(-1px);
  border-color: var(--color-primary);
}

.empty-action-btn.primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.empty-action-btn.primary:hover {
  filter: brightness(1.05);
}

.empty-prompt-hint {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  opacity: 0.8;
}

.empty-prompt-hint code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  padding: 0.1rem 0.35rem;
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.sect-list-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sect-card {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sect-card:hover {
  border-color: #9333ea;
  box-shadow: 0 2px 8px rgba(147, 51, 234, 0.1);
  transform: translateY(-1px);
}

.sect-card.selected {
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(168, 85, 247, 0.1));
  border-color: #9333ea;
  box-shadow: 0 4px 12px rgba(147, 51, 234, 0.15);
}

.sect-card.can-join {
  border-left: 3px solid #22c55e;
}

.sect-icon {
  position: relative;
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.sect-emoji {
  font-size: 2rem;
  display: block;
}

.sect-level {
  position: absolute;
  bottom: -2px;
  right: -2px;
  padding: 1px 4px;
  border-radius: 8px;
  font-size: 0.6rem;
  font-weight: 700;
  color: white;
}

.level-一流 { background: #ef4444; }
.level-二流 { background: #f59e0b; }
.level-三流 { background: #3b82f6; }
.level-末流 { background: #6b7280; }

.sect-info {
  flex: 1;
  min-width: 0;
}

.sect-name {
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.25rem;
  font-size: 1rem;
}

.sect-meta {
  margin-bottom: 0.5rem;
}

.sect-type {
  background: rgba(147, 51, 234, 0.1);
  color: #9333ea;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.sect-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.member-count {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
}
\n/* .power-rating removed */\n.arrow-icon {
  color: var(--color-border-hover);
  transition: transform 0.2s;
}

.sect-card.selected .arrow-icon {
  transform: rotate(90deg);
  color: #9333ea;
}

.sect-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.detail-content {
  height: 100%;
  padding: 1rem;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.detail-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #9333ea, #7c3aed);
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(147, 51, 234, 0.3);
}

.sect-emoji-large {
  font-size: 2rem;
}

.detail-info {
  flex: 1;
}

.detail-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
}

.detail-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.type-badge, .level-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.type-badge.type-righteous { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.type-badge.type-demonic { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.type-badge.type-neutral { background: rgba(107, 114, 128, 0.1); color: #6b7280; }
.type-badge.type-merchant { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.type-badge.type-family { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
.type-badge.type-alliance { background: rgba(168, 85, 247, 0.1); color: #a855f7; }

.level-badge { background: rgba(168, 85, 247, 0.1); color: #a855f7; }

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-section {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
}

.section-title {
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;            /* 图标与标题同一行 */
  align-items: center;      /* 垂直居中对齐 */
  gap: 8px;                 /* 图标与文字间距 */
}

.section-title svg {
  flex-shrink: 0;           /* 防止图标被压缩换行 */
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.info-value {
  font-size: 0.875rem;
  color: var(--color-text);
  font-weight: 600;
}

.sect-description {
  margin-top: 1rem;
}

.desc-title {
  margin: 0 0 0.5rem 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.desc-text {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

.sect-specialties {
  margin-top: 1rem;
}

.specialties-title {
  margin: 0 0 0.5rem 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.specialties-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.specialty-tag {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(147, 51, 234, 0.1));
  color: #9333ea;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid rgba(147, 51, 234, 0.2);
}

.member-overview {
  text-align: center;
  margin-bottom: 1.5rem;
}

.total-members {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.total-number {
  font-size: 2rem;
  font-weight: 700;
  color: #9333ea;
}

.total-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.member-breakdown {
  margin-bottom: 1.5rem;
}

.breakdown-title {
  margin: 0 0 0.75rem 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.realm-stats, .position-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.realm-stat, .position-stat {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.realm-name, .position-name {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  min-width: 60px;
}

.realm-bar, .position-bar {
  flex: 1;
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.realm-fill {
  height: 100%;
  background: linear-gradient(90deg, #9333ea, #7c3aed);
  transition: width 0.3s ease;
}

.position-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  transition: width 0.3s ease;
}

.realm-count, .position-count {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
  min-width: 30px;
  text-align: right;
}

.relationship-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.relationship-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.relationship-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.relationship-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.reputation-value {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.reputation-level {
  font-size: 0.75rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-weight: 500;
}

.reputation-legendary {
  color: #f59e0b;
}
.reputation-legendary .reputation-level {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.reputation-excellent {
  color: #8b5cf6;
}
.reputation-excellent .reputation-level {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.reputation-good {
  color: #3b82f6;
}
.reputation-good .reputation-level {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.reputation-fair {
  color: #22c55e;
}
.reputation-fair .reputation-level {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.reputation-low {
  color: #6b7280;
}
.reputation-low .reputation-level {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  border: 1px solid rgba(107, 114, 128, 0.2);
}

.reputation-none {
  color: var(--color-text-secondary);
}
.reputation-none .reputation-level {
  background: rgba(var(--color-text-secondary-rgb), 0.1);
  color: var(--color-text-secondary);
  border: 1px solid rgba(var(--color-text-secondary-rgb), 0.2);
}

.join-requirements {
  margin-bottom: 1rem;
}

.requirements-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.requirement-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.requirement-icon {
  color: #22c55e;
}

.requirement-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.no-requirements {
  text-align: center;
  padding: 1rem;
  color: var(--color-text-secondary);
}

.join-benefits {
  margin-bottom: 1rem;
}

.benefits-title {
  margin: 0 0 0.5rem 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.benefits-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.benefit-icon {
  color: #3b82f6;
}

.benefit-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.join-actions {
  text-align: center;
}

.join-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.join-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.current-member-info {
  margin-bottom: 1.5rem;
}

.member-status {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.member-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.75rem;
}

.leave-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.leave-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.status-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.status-value {
  font-size: 0.875rem;
  color: var(--color-text);
  font-weight: 600;
}

.status-value.position {
  color: #9333ea;
}

.status-value.contribution {
  color: #f59e0b;
}

.status-value.reputation {
  color: #3b82f6;
}

.sect-actions {
  margin-top: 1rem;
}

.actions-title {
  margin: 0 0 0.75rem 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.sect-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 0.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sect-action-btn:hover {
  border-color: #9333ea;
  background: rgba(147, 51, 234, 0.05);
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: var(--color-text-secondary);
}

.placeholder-icon {
  opacity: 0.5;
  margin-bottom: 1rem;
}

.placeholder-text {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.placeholder-hint {
  font-size: 0.85rem;
  opacity: 0.8;
}

/* 势力范围相关样式 */
.territory-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 成员统计样式 */
.member-stats {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.total-members {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: rgba(var(--color-primary-rgb), 0.05);
  border-radius: 8px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.1);
}

.total-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.total-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-primary);
}

.distribution-title {
  margin: 0 0 0.75rem 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.realm-stats, .position-stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 0.5rem;
  max-height: none; /* 允许完整显示 */
}

.realm-item, .position-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.realm-item:hover, .position-item:hover {
  background: var(--color-surface);
  border-color: rgba(var(--color-primary-rgb), 0.2);
}

.realm-name, .position-name {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.realm-count, .position-count {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text);
}

/* 宗门领导层样式 */
.leadership-info {
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(var(--color-primary-rgb), 0.05);
  border-radius: 8px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.1);
}

.leadership-title {
  margin: 0 0 1rem 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.leader-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.leader-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-surface);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.leader-item.primary-leader {
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.1), rgba(var(--color-accent-rgb), 0.05));
  border-color: rgba(var(--color-primary-rgb), 0.3);
}

.leader-role {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  min-width: 3rem;
  text-align: center;
}

.leader-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.leader-realm {
  font-size: 0.75rem;
  color: var(--color-accent);
  background: rgba(var(--color-accent-rgb), 0.1);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-weight: 500;
  margin-left: auto;
}

.sect-strength {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgba(var(--color-success-rgb), 0.05);
  border-radius: 6px;
  border: 1px solid rgba(var(--color-success-rgb), 0.1);
}

.strength-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.strength-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.strength-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.strength-value.peak-power {
  color: var(--color-accent);
  text-shadow: 0 0 4px rgba(var(--color-accent-rgb), 0.3);
}

.strength-value.power-rating {
  color: var(--color-primary);
  font-weight: 700;
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.1), rgba(var(--color-accent-rgb), 0.05));
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.power-level {
  font-size: 0.75rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-weight: 500;
}

.power-legendary {
  color: #dc2626 !important;
  border-color: rgba(220, 38, 38, 0.3) !important;
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.1), rgba(239, 68, 68, 0.05)) !important;
}
.power-legendary .power-level {
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.power-supreme {
  color: #7c3aed !important;
  border-color: rgba(124, 58, 237, 0.3) !important;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(139, 92, 246, 0.05)) !important;
}
.power-supreme .power-level {
  background: rgba(124, 58, 237, 0.1);
  color: #7c3aed;
  border: 1px solid rgba(124, 58, 237, 0.2);
}

.power-strong {
  color: #2563eb !important;
  border-color: rgba(37, 99, 235, 0.3) !important;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(59, 130, 246, 0.05)) !important;
}
.power-strong .power-level {
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  border: 1px solid rgba(37, 99, 235, 0.2);
}

.power-good {
  color: #059669 !important;
  border-color: rgba(5, 150, 105, 0.3) !important;
  background: linear-gradient(135deg, rgba(5, 150, 105, 0.1), rgba(16, 185, 129, 0.05)) !important;
}
.power-good .power-level {
  background: rgba(5, 150, 105, 0.1);
  color: #059669;
  border: 1px solid rgba(5, 150, 105, 0.2);
}

.power-average {
  color: #d97706 !important;
  border-color: rgba(217, 119, 6, 0.3) !important;
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.1), rgba(245, 158, 11, 0.05)) !important;
}
.power-average .power-level {
  background: rgba(217, 119, 6, 0.1);
  color: #d97706;
  border: 1px solid rgba(217, 119, 6, 0.2);
}

.power-weak {
  color: #6b7280 !important;
  border-color: rgba(107, 114, 128, 0.3) !important;
  background: linear-gradient(135deg, rgba(107, 114, 128, 0.1), rgba(156, 163, 175, 0.05)) !important;
}
.power-weak .power-level {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  border: 1px solid rgba(107, 114, 128, 0.2);
}

.power-poor {
  color: var(--color-text-secondary) !important;
  border-color: rgba(var(--color-text-secondary-rgb), 0.3) !important;
  background: linear-gradient(135deg, rgba(var(--color-text-secondary-rgb), 0.1), rgba(var(--color-text-secondary-rgb), 0.05)) !important;
}
.power-poor .power-level {
  background: rgba(var(--color-text-secondary-rgb), 0.1);
  color: var(--color-text-secondary);
  border: 1px solid rgba(var(--color-text-secondary-rgb), 0.2);
}

.influence-description {
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.5;
}

.controlled-areas {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.areas-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.area-tag {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1));
  color: #3b82f6;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.strategic-value {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.value-display {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.value-bar {
  flex: 1;
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}

.value-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #16a34a);
  transition: width 0.3s ease;
}

.value-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  min-width: 40px;
}

/* 回退显示样式 */
.fallback-leadership {
  padding: 1rem;
  background: rgba(var(--color-warning-rgb), 0.05);
  border-radius: 8px;
  border: 1px solid rgba(var(--color-warning-rgb), 0.1);
}

.leadership-description {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

/* 数据缺失提示样式 */
.missing-data-notice {
  background: rgba(var(--color-warning-rgb), 0.05);
  border: 1px solid rgba(var(--color-warning-rgb), 0.2);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}

.notice-title {
  margin: 0 0 0.5rem 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-warning);
}

.notice-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.notice-text {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.notice-hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
  opacity: 0.8;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .sect-panel {
    padding: 0;
  }

  .panel-content {
    padding: 0;
  }

  .sect-container {
    flex-direction: column;
    border-radius: 0;
    border: none;
  }

  .sect-list {
    width: 100%;
    height: 30vh;
    min-height: 250px;
    max-height: 350px;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }

  .list-header {
    padding: 1rem;
    position: sticky;
    top: 0;
    z-index: 100;
    background: var(--color-surface);
  }

  .panel-title {
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
  }

  .search-bar {
    padding: 0.5rem;
  }

  .search-input {
    font-size: 0.9rem;
  }

  .list-content {
    padding: 0.5rem;
  }

  .sect-card {
    padding: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .sect-name {
    font-size: 0.95rem;
  }

  .sect-type {
    font-size: 0.7rem;
    padding: 1px 6px;
  }

  /* .power-rating removed */

  .sect-detail {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .detail-content {
    padding: 0.75rem;
    height: auto;
  }

  .detail-header {
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
  }

  .detail-icon {
    width: 40px;
    height: 40px;
  }

  .sect-emoji-large {
    font-size: 1.25rem;
  }

  .detail-name {
    font-size: 1rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .member-status {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .action-buttons {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.4rem;
  }

  .sect-action-btn {
    padding: 0.6rem 0.4rem;
    font-size: 0.75rem;
    justify-content: center;
    white-space: normal; /* 允许文本换行 */
    height: 100%; /* 确保按钮在换行后高度一致 */
  }

  .detail-section {
    padding: 0.6rem;
    margin-bottom: 0.75rem;
  }

  .section-title {
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
    padding-bottom: 0.4rem;
  }

  .realm-stats, .position-stats {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .leader-grid {
    gap: 0.5rem;
  }

  .leader-item {
    padding: 0.5rem;
  }

  .leader-role {
    font-size: 0.7rem;
    padding: 0.2rem 0.4rem;
    min-width: 2.5rem;
  }

  .leader-name {
    font-size: 0.8rem;
  }

  .leader-realm {
    font-size: 0.7rem;
  }
}
</style>
