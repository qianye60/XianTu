<template>
  <div class="sect-panel">
    <div class="panel-content">
      <div class="sect-container">
        <!-- 左侧：宗门列表 -->
        <div class="sect-list">
          <div class="list-header">
            <h3 class="panel-title">宗门事务</h3>
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
              <p>正在读取宗门信息...</p>
            </div>
            <div v-else-if="filteredSects.length === 0" class="empty-state">
              <Building :size="48" class="empty-icon" />
              <p class="empty-text">暂无宗门信息</p>
              <p class="empty-hint">世界信息将由AI根据游戏进程生成</p>
              <!-- 调试信息显示 -->
              <div class="debug-info" style="margin-top: 1rem; font-size: 0.8rem; color: #666; text-align: left;">
                <details>
                  <summary style="cursor: pointer;">调试信息 (点击展开)</summary>
                  <div style="margin-top: 0.5rem;">
                    <p>存档数据存在: {{ !!characterStore.activeSaveSlot?.存档数据 }}</p>
                    <p>存档数据字段: {{ characterStore.activeSaveSlot?.存档数据 ? Object.keys(characterStore.activeSaveSlot.存档数据).join(', ') : '无' }}</p>
                    <p>世界信息存在: {{ !!characterStore.activeSaveSlot?.存档数据?.世界信息 }}</p>
                    <p>世界信息.势力信息存在: {{ !!characterStore.activeSaveSlot?.存档数据?.世界信息?.势力信息 }}</p>
                    <p>世界信息.势力信息数量: {{ characterStore.activeSaveSlot?.存档数据?.世界信息?.势力信息?.length || 0 }}</p>
                    <p>宗门系统存在: {{ !!(characterStore.activeSaveSlot?.存档数据 as any)?.宗门系统 }}</p>
                    <p>宗门系统.availableSects数量: {{ (characterStore.activeSaveSlot?.存档数据 as any)?.宗门系统?.availableSects?.length || 0 }}</p>
                    <p>筛选后数量: {{ filteredSects.length }}</p>
                    <button @click="loadTestData" style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: #9333ea; color: white; border: none; border-radius: 4px; cursor: pointer;">
                      加载测试数据
                    </button>
                    <button @click="syncFromTavern" style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: #22c55e; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 0.5rem;">
                      从酒馆同步数据
                    </button>
                    <button @click="forceRefresh" style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 0.5rem;">
                      强制刷新
                    </button>
                  </div>
                </details>
              </div>
            </div>
            <div v-else class="sect-list-content">
              <div
                v-for="sect in filteredSects"
                :key="sect.名称"
                class="sect-card"
                :class="{
                  selected: selectedSect?.名称 === sect.名称,
                  [`type-${getSectTypeClass(sect.类型)}`]: true,
                  'can-join': sect.canJoin
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
                  <div class="sect-stats">
                    <span class="power-rating">实力 {{ sect.powerRating || extractPowerFromDescription(sect.实力评估) || '未知' }}</span>
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
                  <span class="power-badge">
                    实力 {{ selectedSect.powerRating || extractPowerFromDescription(selectedSect.实力评估) || '未知' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 详情主体 -->
            <div class="detail-body">
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
                    <span class="info-label">总部位置</span>
                    <span class="info-value">{{ getLocationName(selectedSect) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">实力评估</span>
                    <span class="info-value">{{ selectedSect.powerRating || selectedSect.实力评估 || '未知' }}</span>
                  </div>
                </div>

                <!-- 宗门领导层 -->
                <div v-if="selectedSect.leadership" class="leadership-info">
                  <h6 class="leadership-title">宗门领导</h6>

                  <div class="leader-grid">
                    <div class="leader-item primary-leader">
                      <span class="leader-role">宗主</span>
                      <span class="leader-name">{{ selectedSect.leadership.宗主 }}</span>
                      <span class="leader-realm" v-if="selectedSect.leadership.宗主修为">{{ selectedSect.leadership.宗主修为 }}</span>
                    </div>
                    <div v-if="selectedSect.leadership.副宗主" class="leader-item">
                      <span class="leader-role">副宗主</span>
                      <span class="leader-name">{{ selectedSect.leadership.副宗主 }}</span>
                    </div>
                  </div>

                  <div class="sect-strength">
                    <div class="strength-item">
                      <span class="strength-label">长老数量</span>
                      <span class="strength-value">{{ selectedSect.leadership.长老数量 }}位</span>
                    </div>
                    <div class="strength-item">
                      <span class="strength-label">最强修为</span>
                      <span class="strength-value peak-power">{{ selectedSect.leadership.最强修为 }}</span>
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
                    <span class="relationship-value" :class="getRelationshipClass(selectedSect.与玩家关系 || '中立')">
                      {{ selectedSect.与玩家关系 || '中立' }}
                    </span>
                  </div>
                  <div class="relationship-item">
                    <span class="relationship-label">声望值</span>
                    <span class="relationship-value">{{ selectedSect.声望值 || 0 }}</span>
                  </div>
                </div>
              </div>

              <!-- 势力范围 -->
              <div class="detail-section" v-if="selectedSect.territoryInfo">
                <h5 class="section-title">
                  <Map :size="16" />
                  <span>势力范围</span>
                </h5>
                <div class="territory-info">
                  <div class="influence-description">
                    <strong>影响范围：</strong>{{ selectedSect.territoryInfo.influenceRange || '未知' }}
                  </div>

                  <div v-if="selectedSect.territoryInfo.controlledAreas?.length" class="controlled-areas">
                    <strong>控制区域：</strong>
                    <div class="areas-list">
                      <span
                        v-for="area in selectedSect.territoryInfo.controlledAreas"
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
                          :style="{ width: `${(selectedSect.territoryInfo.strategicValue || 5) * 10}%` }"
                        ></div>
                      </div>
                      <span class="value-text">{{ selectedSect.territoryInfo.strategicValue || 5 }}/10</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 加入条件 -->
              <div class="detail-section" v-if="selectedSect.canJoin">
                <h5 class="section-title">
                  <UserPlus :size="16" />
                  <span>加入条件</span>
                </h5>
                <div class="join-requirements">
                  <div v-if="selectedSect.joinRequirements?.length" class="requirements-list">
                    <div
                      v-for="requirement in selectedSect.joinRequirements"
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
                <div v-if="selectedSect.benefits?.length" class="join-benefits">
                  <h6 class="benefits-title">加入好处</h6>
                  <div class="benefits-list">
                    <div
                      v-for="benefit in selectedSect.benefits"
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
                      <span class="status-value position">{{ playerSectInfo?.position || '散修' }}</span>
                    </div>
                    <div class="status-item">
                      <span class="status-label">贡献点</span>
                      <span class="status-value contribution">{{ playerSectInfo?.contribution || 0 }}</span>
                    </div>
                    <div class="status-item">
                      <span class="status-label">声望</span>
                      <span class="status-value reputation">{{ playerSectInfo?.reputation || 0 }}</span>
                    </div>
                    <div class="status-item">
                      <span class="status-label">加入时间</span>
                      <span class="status-value join-date">{{ formatJoinDate(playerSectInfo?.joinDate) }}</span>
                    </div>
                  </div>
                </div>

                <!-- 宗门任务 -->
                <div class="sect-actions">
                  <h6 class="actions-title">宗门事务</h6>
                  <div class="action-buttons">
                    <button class="sect-action-btn" @click="showSectMissions">
                      <Scroll :size="16" />
                      <span>宗门任务</span>
                    </button>
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
            <p class="placeholder-hint">江湖中的宗门势力等你探索</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCharacterStore } from '@/stores/characterStore';
import type { WorldFaction, SectMemberInfo } from '@/types/game';
import {
  Building, Users, Heart, UserPlus, Crown, CheckCircle,
  Gift, Scroll, Coins, Book, Search, Loader2,
  ChevronRight, Map
} from 'lucide-vue-next';
import { toast } from '@/utils/toast';

const characterStore = useCharacterStore();
const isLoading = ref(false);
const selectedSect = ref<WorldFaction | null>(null);
const searchQuery = ref('');

// 获取世界中的宗门势力数据 - 统一数据源，支持多种数据结构
const sectSystemData = computed(() => {
  const saveData = characterStore.activeSaveSlot?.存档数据;

  console.log('[宗门系统] 开始获取数据');
  console.log('[宗门系统] saveData存在:', !!saveData);
  console.log('[宗门系统] 完整存档数据结构:', Object.keys(saveData || {}));

  if (!saveData) {
    console.log('[宗门系统] 存档数据不存在，返回空数组');
    return { availableSects: [] };
  }

  let availableSects: any[] = [];

  // 方案1：从世界信息.势力信息中获取宗门数据
  const worldInfo = saveData.世界信息;
  if (worldInfo?.势力信息) {
    console.log('[宗门系统] 发现世界信息.势力信息，数量:', worldInfo.势力信息.length);
    console.log('[宗门系统] 势力信息类型:', worldInfo.势力信息.map((f: any) => f.类型));

    // 筛选出宗门类型的势力
    const sectFactions = worldInfo.势力信息.filter((faction: any) => {
      if (!faction.类型) return false;

      const type = faction.类型.toLowerCase();
      // 排除明显不是宗门的类型
      const excludeTypes = ['秘境', '遗迹', '禁地', '森林', '山脉', '湖泊', '城池'];
      const shouldExclude = excludeTypes.some(exclude => type.includes(exclude.toLowerCase()));

      if (shouldExclude) {
        console.log('[宗门系统] 排除非宗门势力:', faction.名称, faction.类型);
        return false;
      }

      console.log('[宗门系统] 包含势力:', faction.名称, faction.类型);
      return true;
    });

    availableSects = sectFactions;
  }

  // 方案2：从宗门系统.availableSects中获取数据
  const sectSystem = (saveData as any).宗门系统;
  if (sectSystem?.availableSects && sectSystem.availableSects.length > 0) {
    console.log('[宗门系统] 发现宗门系统.availableSects，数量:', sectSystem.availableSects.length);
    availableSects = [...availableSects, ...sectSystem.availableSects];
  }

  // 方案3：检查是否有直接的宗门相关字段
  Object.keys(saveData).forEach(key => {
    const lowerKey = key.toLowerCase();
    if ((lowerKey.includes('宗门') || lowerKey.includes('sect')) && Array.isArray((saveData as any)[key])) {
      console.log('[宗门系统] 发现可能的宗门数据字段:', key, '数量:', (saveData as any)[key].length);
      availableSects = [...availableSects, ...(saveData as any)[key]];
    }
  });

  // 去重
  const uniqueSects = availableSects.filter((sect, index, arr) =>
    arr.findIndex(s => s.名称 === sect.名称) === index
  );

  console.log('[宗门系统] 最终宗门数量:', uniqueSects.length);
  console.log('[宗门系统] 最终宗门列表:', uniqueSects.map((s: any) => s.名称));

  return { availableSects: uniqueSects };
});

// 玩家的宗门信息
const playerSectInfo = computed((): SectMemberInfo | undefined => {
  const saveData = characterStore.activeSaveSlot?.存档数据;
  return saveData?.玩家角色状态?.宗门信息;
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

  // 按实力排序 - 优先使用powerRating，如果没有则尝试解析实力评估字符串
  return filtered.sort((a, b) => {
    const aPower = a.powerRating || extractPowerFromDescription(a.实力评估) || 0;
    const bPower = b.powerRating || extractPowerFromDescription(b.实力评估) || 0;
    return bPower - aPower;
  });
});

// 从实力评估字符串中提取数值的辅助函数
const extractPowerFromDescription = (description: string | number | undefined): number => {
  if (typeof description === 'number') return description;
  if (!description || typeof description !== 'string') return 0;
  const match = description.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

// 获取位置名称
const getLocationName = (sect: any): string => {
  // 检查是否有直接的位置名称
  if (sect.位置名称 && typeof sect.位置名称 === 'string') {
    return sect.位置名称;
  }

  // 从宗门名称推断位置（基于参考数据）
  const locationMap: Record<string, string> = {
    '太素道宫': '太素山',
    '问剑崖': '洗剑池',
    '万魂幡': '幽魂岛',
    '东方世家': '长春谷',
    '四海通会': '通天城'
  };

  if (sect.名称 && locationMap[sect.名称]) {
    return locationMap[sect.名称];
  }

  // 格式化坐标位置
  return formatLocation(sect.位置);
};

// 格式化位置信息
const formatLocation = (location: any): string => {
  if (!location) return '未知';
  if (typeof location === 'string') return location;
  if (typeof location === 'object') {
    // 如果是坐标对象，返回简单的描述
    if (location.longitude && location.latitude) {
      return `经度: ${location.longitude}, 纬度: ${location.latitude}`;
    }
  }
  return '未知';
};

// 获取宗门特色列表
const getSectSpecialties = (sect: any): string[] => {
  const specialties: string[] = [];

  // 新格式：specialties数组
  if (sect.specialties && Array.isArray(sect.specialties)) {
    specialties.push(...sect.specialties);
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

// 检查是否有领导层信息（已简化，现在只检查leadership字段）
const hasLeadershipInfo = (sect: WorldFaction): boolean => {
  return !!(sect.leadership);
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
  return playerSectInfo.value?.sectName === sect.名称;
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

const selectSect = (sect: WorldFaction) => {
  selectedSect.value = selectedSect.value?.名称 === sect.名称 ? null : sect;
};

// 占位函数
const requestJoinSect = (sect: WorldFaction) => {
  toast.info(`申请加入 ${sect.名称}（功能开发中）`);
};

const showSectMissions = () => toast.info('宗门任务（功能开发中）');
const showContribution = () => toast.info('贡献兑换（功能开发中）');
const showSectLibrary = () => toast.info('宗门藏书（功能开发中）');
const showSectMembers = () => toast.info('同门师兄弟（功能开发中）');

// 测试数据加载函数
const loadTestData = () => {
  if (!characterStore.activeSaveSlot?.存档数据) {
    toast.warning('没有激活的存档数据');
    return;
  }

  const testSects = [
    {
      名称: '太素道宫',
      类型: '修仙宗门',
      等级: '三流',
      位置: '太素山',
      势力范围: ['太素山', '周边地区'],
      描述: '传承万载的古老宗门，讲求清静无为，道法自然。门人弟子不多，但个个根基扎实，尤擅符箓阵法，其护山大阵"两仪微尘阵"号称万法不侵。',
      特色: '符箓之道',
      实力评估: '96',
      与玩家关系: '中立',
      声望值: 0,
      powerRating: 96,
      specialties: ['符箓之道', '阵法禁制'],
      memberCount: {
        total: 800,
        byRealm: {
          练气: 500,
          筑基: 200,
          金丹: 80,
          元婴: 15,
          化神: 4,
          炼虚: 1,
          合体: 0,
          大乘: 0,
          渡劫: 0,
          真仙: 0
        },
        byPosition: {
          散修: 0,
          外门弟子: 500,
          内门弟子: 200,
          核心弟子: 80,
          传承弟子: 15,
          执事: 3,
          长老: 1,
          副掌门: 0,
          掌门: 1
        }
      },
      leadership: {
        宗主: '太素真人',
        宗主修为: '化神中期',
        长老数量: 1,
        最强修为: '化神中期'
      }
    },
    {
      名称: '问剑崖',
      类型: '修仙宗门',
      等级: '三流',
      位置: '神霄洲',
      势力范围: ['洗剑池', '剑意谷'],
      描述: '神霄洲的剑修圣地，门人皆是好勇斗狠之辈。其道统核心为"以战养战"，认为唯有在生死搏杀中方能勘破剑道真意。行事霸道，护短至极。',
      特色: '庚金剑诀',
      实力评估: '94',
      与玩家关系: '中立',
      声望值: 0,
      powerRating: 94,
      specialties: ['庚金剑诀', '剑意淬体'],
      memberCount: {
        total: 600,
        byRealm: {
          练气: 400,
          筑基: 150,
          金丹: 40,
          元婴: 8,
          化神: 2,
          炼虚: 0,
          合体: 0,
          大乘: 0,
          渡劫: 0,
          真仙: 0
        },
        byPosition: {
          散修: 0,
          外门弟子: 400,
          内门弟子: 150,
          核心弟子: 40,
          传承弟子: 8,
          执事: 1,
          长老: 1,
          副掌门: 0,
          掌门: 1
        }
      }
    }
  ];

  // 直接注入测试数据
  if (!characterStore.activeSaveSlot?.存档数据?.世界信息) {
    if (characterStore.activeSaveSlot?.存档数据) {
      characterStore.activeSaveSlot.存档数据.世界信息 = {
        世界名称: '朝天大陆',
        世界背景: '此方世界名为"朝天大陆"，乃是一处天道完整、灵气充沛的上善之地。其核心法则是"万灵竞渡，一步登天"，无论是人、妖、精、怪，皆有缘法踏上修行之路，叩问长生。',
        大陆信息: [],
        势力信息: [],
        地点信息: [],
        生成信息: {
          生成时间: new Date().toISOString(),
          世界背景: '此方世界名为"朝天大陆"，乃是一处天道完整、灵气充沛的上善之地。',
          世界纪元: '朝天历元年',
          特殊设定: [],
          版本: '1.0'
        }
      };
    }
  }
  if (characterStore.activeSaveSlot?.存档数据?.世界信息) {
    characterStore.activeSaveSlot.存档数据.世界信息.势力信息 = testSects;
  }

  // 立即保存
  characterStore.commitToStorage();
  toast.success('测试数据已加载！');
};

// 从酒馆同步数据
const syncFromTavern = async () => {
  try {
    await characterStore.syncFromTavern();
    toast.success('已从酒馆同步数据');
  } catch (error) {
    console.error('[宗门系统] 同步失败:', error);
    toast.error('同步失败: ' + (error instanceof Error ? error.message : '未知错误'));
  }
};

// 强制刷新
const forceRefresh = () => {
  characterStore.reloadFromStorage();
  toast.info('已强制刷新数据');
};

onMounted(() => {
  console.log('[宗门系统] 宗门事务面板已载入');
  console.log('[宗门系统] characterStore状态:', characterStore);
  console.log('[宗门系统] activeSaveSlot:', characterStore.activeSaveSlot);
  console.log('[宗门系统] 存档数据:', characterStore.activeSaveSlot?.存档数据);
  console.log('[宗门系统] 世界信息:', characterStore.activeSaveSlot?.存档数据?.世界信息);
  console.log('[宗门系统] 势力信息:', characterStore.activeSaveSlot?.存档数据?.世界信息?.势力信息);
  console.log('[宗门系统] sectSystemData:', sectSystemData.value);
  console.log('[宗门系统] filteredSects:', filteredSects.value);

  // 添加数据监控
  setInterval(() => {
    console.log('[宗门系统] 定时检查 - 筛选后宗门数量:', filteredSects.value?.length || 0);
    console.log('[宗门系统] 定时检查 - 是否加载中:', isLoading.value);
    console.log('[宗门系统] 定时检查 - 存档数据存在:', !!characterStore.activeSaveSlot?.存档数据);
    console.log('[宗门系统] 定时检查 - 世界信息存在:', !!characterStore.activeSaveSlot?.存档数据?.世界信息);
    console.log('[宗门系统] 定时检查 - 势力信息存在:', !!characterStore.activeSaveSlot?.存档数据?.世界信息?.势力信息);
  }, 5000);
});
</script>

<style scoped>
.sect-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  padding: 1rem;
}

.panel-content {
  flex: 1;
  overflow: hidden;
}

.sect-container {
  height: 100%;
  display: flex;
  background: var(--color-surface);
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.sect-list {
  width: 350px;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

.list-header {
  padding: 1.5rem 1rem 1rem 1rem;
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

.power-rating {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
}

.arrow-icon {
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
  padding: 1.5rem;
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

.type-badge, .level-badge, .power-badge {
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
.power-badge { background: rgba(34, 197, 94, 0.1); color: #22c55e; }

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
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
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

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .sect-container {
    flex-direction: column;
  }

  .sect-list {
    width: 100%;
    height: 300px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .member-status {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    grid-template-columns: 1fr;
  }
}
</style>
