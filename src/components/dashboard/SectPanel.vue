<template>
  <div class="sect-panel game-panel">
    <!-- 头部信息 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="header-icon">🏛️</div>
        <div class="header-info">
          <h3 class="panel-title">宗门大观</h3>
          <span class="world-status">{{ worldStatus }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="refreshWorldData" :disabled="isLoading">
          <div class="spinner" v-if="isLoading"></div>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M3 21v-5h5"/>
          </svg>
          <span class="btn-text">刷新</span>
        </button>
      </div>
    </div>

    <!-- 当前宗门状态 -->
    <div class="current-sect-card" v-if="playerSectInfo">
      <div class="sect-banner" :style="{ background: getSectGradient(playerSectInfo.type) }">
        <div class="sect-info">
          <h4 class="sect-name">{{ playerSectInfo.name }}</h4>
          <span class="sect-type">{{ playerSectInfo.type }}</span>
          <span class="sect-level">{{ playerSectInfo.等级 }}</span>
        </div>
        <div class="sect-emblem">{{ getSectEmblem(playerSectInfo.type) }}</div>
      </div>
      
      <div class="sect-details">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">职位</span>
            <span class="value position" :class="playerSectInfo.position">{{ playerSectInfo.position || '未知' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">贡献</span>
            <span class="value contribution">{{ playerSectInfo.contribution || 0 }}</span>
          </div>
          <div class="detail-item">
            <span class="label">关系</span>
            <span class="value relationship" :class="playerSectInfo.relationship">{{ playerSectInfo.relationship || '中立' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">声望</span>
            <span class="value reputation">{{ playerSectInfo.声望值 || 0 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 未加入宗门状态 -->
    <div v-else class="no-sect-card">
      <div class="no-sect-icon">🌟</div>
      <h4 class="no-sect-title">独行修士</h4>
      <p class="no-sect-desc">大道三千，条条通天。散修虽无宗门庇护，却有无限可能。</p>
      <div class="sect-discovery">
        <span class="discovery-text">已发现 {{ allSects.length }} 个宗门势力</span>
      </div>
    </div>

    <!-- 功能选项卡 -->
    <div class="sect-tabs">
      <button 
        v-for="tab in sectTabs"
        :key="tab.key"
        class="sect-tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-name">{{ tab.name }}</span>
        <span v-if="tab.count" class="tab-count">{{ tab.count }}</span>
      </button>
    </div>

    <!-- 内容区域 -->
    <div class="panel-content">
      <!-- 宗门总览 -->
      <div v-if="activeTab === 'overview'" class="overview-content">
        <div class="world-summary">
          <h5>天下大势</h5>
          <div class="world-stats">
            <div class="stat-item">
              <span class="stat-label">宗门势力</span>
              <span class="stat-value">{{ sectCount }}个</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">城镇据点</span>
              <span class="stat-value">{{ cityCount }}个</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">危险禁地</span>
              <span class="stat-value">{{ dangerousCount }}个</span>
            </div>
          </div>
        </div>
        
        <div class="sects-list">
          <h5>天下宗门</h5>
          <div class="sects-grid">
            <div 
              v-for="sect in allSects"
              :key="sect.名称"
              class="sect-card"
              :class="getSectClass(sect)"
              @click="selectSect(sect)"
            >
              <div class="card-header">
                <div class="sect-emblem small">{{ getSectEmblem(sect.类型) }}</div>
                <div class="sect-basic-info">
                  <h6 class="sect-name">{{ sect.名称 }}</h6>
                  <span class="sect-type">{{ sect.类型 }}</span>
                </div>
                <div class="sect-level-badge" :class="`level-${sect.等级}`">
                  {{ sect.等级 }}
                </div>
              </div>
              
              <div class="card-body">
                <p class="sect-desc">{{ sect.描述 }}</p>
                <div class="sect-features">
                  <span v-for="feature in sect.特色" :key="feature" class="feature-tag">
                    {{ feature }}
                  </span>
                </div>
                
                <div class="sect-stats">
                  <div class="stat-group">
                    <span class="stat-label">实力</span>
                    <div class="power-bar">
                      <div class="power-fill" :style="{ width: sect.实力评估 + '%' }"></div>
                    </div>
                    <span class="stat-value">{{ sect.实力评估 }}</span>
                  </div>
                  
                  <div class="relationship-status">
                    <span class="relation-label">与我关系：</span>
                    <span class="relation-value" :class="`relation-${sect.与玩家关系}`">
                      {{ sect.与玩家关系 }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 地理分布 -->
      <div v-else-if="activeTab === 'geography'" class="geography-content">
        <div class="continent-overview">
          <h5>大陆分布</h5>
          <div class="continents-grid">
            <div 
              v-for="continent in continentData" 
              :key="continent.name"
              class="continent-card"
              @click="selectContinent(continent)"
              :class="{ active: selectedContinent?.name === continent.name }"
            >
              <h6 class="continent-name">{{ continent.name }}</h6>
              <div class="continent-stats">
                <span class="sect-count">{{ continent.sectCount }}个宗门</span>
                <span class="location-count">{{ continent.locationCount }}处要地</span>
              </div>
              <div class="continent-features">
                <span v-for="feature in continent.特征" :key="feature" class="feature-tag small">
                  {{ feature }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="selectedContinent" class="continent-details">
          <h5>{{ selectedContinent.name }}详情</h5>
          <div class="continent-description">
            <p>{{ selectedContinent.描述 }}</p>
          </div>
          
          <div class="locations-in-continent">
            <h6>主要据点</h6>
            <div class="locations-list">
              <div 
                v-for="location in getContinentLocations(selectedContinent.name)"
                :key="location.名称"
                class="location-item"
                :class="getLocationClass(location)"
              >
                <div class="location-info">
                  <span class="location-name">{{ location.名称 }}</span>
                  <span class="location-type">{{ location.类型 }}</span>
                  <span class="location-safety" :class="`safety-${location.安全等级?.replace(/\s+/g, '')}`">
                    {{ location.安全等级 }}
                  </span>
                </div>
                <p class="location-desc">{{ location.描述 }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 关系网络 -->
      <div v-else-if="activeTab === 'relations'" class="relations-content">
        <div class="relations-overview">
          <h5>势力关系</h5>
          <div class="relations-summary">
            <div class="relation-stats">
              <div class="stat-item friendly">
                <span class="stat-count">{{ relationshipStats.友好 }}</span>
                <span class="stat-label">友好势力</span>
              </div>
              <div class="stat-item neutral">
                <span class="stat-count">{{ relationshipStats.中立 }}</span>
                <span class="stat-label">中立势力</span>
              </div>
              <div class="stat-item hostile">
                <span class="stat-count">{{ relationshipStats.敌对 }}</span>
                <span class="stat-label">敌对势力</span>
              </div>
            </div>
          </div>
        </div>

        <div class="my-relations">
          <h6>我的关系网</h6>
          <div v-if="playerRelations.length === 0" class="no-relations">
            <p>暂无建立的势力关系</p>
            <small>随着游戏进程发展，将建立与各大势力的复杂关系</small>
          </div>
          <div v-else class="relations-list">
            <div 
              v-for="relation in playerRelations" 
              :key="relation.sectName"
              class="relation-item"
              :class="`relation-${relation.status}`"
            >
              <div class="relation-header">
                <span class="sect-name">{{ relation.sectName }}</span>
                <span class="relation-status">{{ relation.status }}</span>
              </div>
              <div class="relation-details">
                <div class="detail-row">
                  <span class="detail-label">声望值：</span>
                  <span class="detail-value">{{ relation.reputation }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">影响因子：</span>
                  <span class="detail-value">{{ relation.influence }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 宗门档案 -->
      <div v-else-if="activeTab === 'archives'" class="archives-content">
        <div class="selected-sect-details" v-if="selectedSect">
          <div class="sect-header-detail">
            <div class="sect-banner-large" :style="{ background: getSectGradient(selectedSect.类型) }">
              <div class="banner-content">
                <div class="sect-emblem large">{{ getSectEmblem(selectedSect.类型) }}</div>
                <div class="sect-main-info">
                  <h3 class="sect-name-large">{{ selectedSect.名称 }}</h3>
                  <div class="sect-meta">
                    <span class="sect-type-large">{{ selectedSect.类型 }}</span>
                    <span class="sect-level-large">{{ selectedSect.等级 }}势力</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="sect-full-info">
            <div class="info-section">
              <h6>宗门简介</h6>
              <p class="sect-description-full">{{ selectedSect.描述 }}</p>
            </div>

            <div class="info-section">
              <h6>宗门特色</h6>
              <div class="features-grid">
                <div v-for="feature in selectedSect.特色" :key="feature" class="feature-detail">
                  <span class="feature-name">{{ feature }}</span>
                  <p class="feature-desc">{{ getFeatureDescription(feature) }}</p>
                </div>
              </div>
            </div>

            <div class="info-section">
              <h6>实力评估</h6>
              <div class="power-analysis">
                <div class="power-overview">
                  <div class="power-score">
                    <span class="score-value">{{ selectedSect.实力评估 }}</span>
                    <span class="score-max">/100</span>
                  </div>
                  <div class="power-level">{{ getPowerLevel(selectedSect.实力评估) }}</div>
                </div>
                <div class="power-breakdown">
                  <div class="power-bar-container">
                    <div class="power-bar-full">
                      <div class="power-fill-full" :style="{ width: selectedSect.实力评估 + '%' }"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="info-section">
              <h6>地理位置</h6>
              <div class="location-info">
                <div class="coordinates">
                  <span class="coord-label">坐标：</span>
                  <span class="coord-value">
                    {{ selectedSect.位置?.longitude.toFixed(2) }}, {{ selectedSect.位置?.latitude.toFixed(2) }}
                  </span>
                </div>
                <div class="territory-info" v-if="selectedSect.势力范围">
                  <span class="territory-label">势力范围：</span>
                  <span class="territory-desc">
                    经度 {{ getTerritorySummary(selectedSect.势力范围).lonRange }}，
                    纬度 {{ getTerritorySummary(selectedSect.势力范围).latRange }}
                  </span>
                </div>
              </div>
            </div>

            <div class="info-section">
              <h6>与我的关系</h6>
              <div class="player-relation-detail">
                <div class="relation-status-large" :class="`status-${selectedSect.与玩家关系}`">
                  {{ selectedSect.与玩家关系 }}
                </div>
                <div class="relation-reputation">
                  <span class="rep-label">声望值：</span>
                  <span class="rep-value">{{ selectedSect.声望值 || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="no-selection">
          <div class="no-selection-icon">📋</div>
          <p>请从宗门总览中选择一个宗门查看详细档案</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCharacterStore } from '@/stores/characterStore';
import { toast } from '@/utils/toast';

// 从酒馆数据结构提取的接口定义
interface SectInfo {
  名称: string;
  类型: string;
  等级: string;
  位置: {
    longitude: number;
    latitude: number;
  };
  势力范围?: Array<{ longitude: number; latitude: number; }>;
  描述: string;
  特色: string[];
  实力评估: number;
  与玩家关系: string;
  声望值: number;
}

interface LocationInfo {
  名称: string;
  类型: string;
  位置: {
    longitude: number;
    latitude: number;
  };
  描述: string;
  安全等级: string;
  开放状态: string;
  相关势力?: string[];
  特殊功能?: string[];
}

const characterStore = useCharacterStore();
const isLoading = ref(false);
const activeTab = ref('overview');
const selectedSect = ref<SectInfo | null>(null);
const selectedContinent = ref<any>(null);

// 获取世界信息
const worldInfo = computed(() => {
  const saveData = characterStore.activeSaveSlot?.存档数据;
  return saveData?.世界信息 || null;
});

const worldStatus = computed(() => {
  if (!worldInfo.value) return '未知世界';
  return `${worldInfo.value.世界名称} • ${worldInfo.value.生成信息?.世界纪元 || '时间未知'}`;
});

// 获取玩家当前宗门信息
const playerSectInfo = computed(() => {
  const saveData = characterStore.activeSaveSlot?.存档数据;
  const sectInfo = saveData?.玩家角色状态?.宗门信息;
  if (!sectInfo) return null;
  
  return {
    name: sectInfo.name,
    type: sectInfo.type,
    等级: '未知',
    position: sectInfo.position,
    contribution: sectInfo.contribution,
    relationship: sectInfo.relationship,
    声望值: sectInfo.reputation || 0
  };
});

// 从世界信息中提取所有宗门
const allSects = computed((): SectInfo[] => {
  if (!worldInfo.value?.势力信息) return [];
  
  return worldInfo.value.势力信息.map((sect: any) => ({
    名称: sect.名称,
    类型: sect.类型,
    等级: sect.等级,
    位置: sect.位置,
    势力范围: sect.势力范围,
    描述: sect.描述,
    特色: sect.特色 || [],
    实力评估: sect.实力评估 || 0,
    与玩家关系: sect.与玩家关系 || '中立',
    声望值: sect.声望值 || 0
  }));
});

// 从世界信息中提取所有地点
const allLocations = computed((): LocationInfo[] => {
  if (!worldInfo.value?.地点信息) return [];
  
  return worldInfo.value.地点信息.map((location: any) => ({
    名称: location.名称,
    类型: location.类型,
    位置: location.位置 || location.coordinates,
    描述: location.描述,
    安全等级: location.安全等级,
    开放状态: location.开放状态,
    相关势力: location.相关势力,
    特殊功能: location.特殊功能
  }));
});

// 大陆数据
const continentData = computed(() => {
  if (!worldInfo.value?.大陆信息) return [];
  
  return worldInfo.value.大陆信息.map((continent: any) => {
    const continentSects = allSects.value.filter(sect => 
      isInContinent(sect.位置, continent.大洲边界)
    );
    const continentLocations = allLocations.value.filter(location => 
      isInContinent(location.位置, continent.大洲边界)
    );
    
    return {
      name: continent.名称,
      描述: continent.描述,
      特征: continent.地理特征 || [],
      sectCount: continentSects.length,
      locationCount: continentLocations.length,
      大洲边界: continent.大洲边界
    };
  });
});

// 统计数据
const sectCount = computed(() => allSects.value.length);
const cityCount = computed(() => 
  allLocations.value.filter(loc => loc.类型 === 'city_town').length
);
const dangerousCount = computed(() => 
  allLocations.value.filter(loc => loc.安全等级 === '极危险' || loc.安全等级 === '危险').length
);

// 关系统计
const relationshipStats = computed(() => {
  const stats = { 友好: 0, 中立: 0, 敌对: 0 };
  allSects.value.forEach(sect => {
    if (sect.与玩家关系 === '友好' || sect.与玩家关系 === '盟友') {
      stats.友好++;
    } else if (sect.与玩家关系 === '敌对' || sect.与玩家关系 === '仇敌') {
      stats.敌对++;
    } else {
      stats.中立++;
    }
  });
  return stats;
});

const playerRelations = computed(() => {
  return allSects.value
    .filter(sect => sect.与玩家关系 !== '中立' && sect.声望值 !== 0)
    .map(sect => ({
      sectName: sect.名称,
      status: sect.与玩家关系,
      reputation: sect.声望值,
      influence: Math.floor(sect.实力评估 * (sect.声望值 / 100))
    }));
});

// 选项卡配置
const sectTabs = computed(() => [
  { key: 'overview', name: '总览', icon: '🌐', count: allSects.value.length },
  { key: 'geography', name: '分布', icon: '🗺️', count: continentData.value.length },
  { key: 'relations', name: '关系', icon: '🤝', count: playerRelations.value.length },
  { key: 'archives', name: '档案', icon: '📚', count: null }
]);

// 工具函数
const getSectGradient = (type: string) => {
  const gradients = {
    '修仙宗门': 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    '正道宗门': 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    '魔道宗门': 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
    '魔道势力': 'linear-gradient(135deg, #7c2d12 0%, #451a03 100%)',
    '修仙世家': 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
    '散修联盟': 'linear-gradient(135deg, #d97706 0%, #92400e 100%)',
    '中立势力': 'linear-gradient(135deg, #6b7280 0%, #374151 100%)'
  };
  return gradients[type as keyof typeof gradients] || gradients['中立势力'];
};

const getSectEmblem = (type: string) => {
  const emblems = {
    '修仙宗门': '⚔️',
    '正道宗门': '🏛️',
    '魔道宗门': '🔥',
    '魔道势力': '💀',
    '修仙世家': '🏰',
    '散修联盟': '⚡',
    '中立势力': '⚖️'
  };
  return emblems[type as keyof typeof emblems] || '🏛️';
};

const getSectClass = (sect: SectInfo) => {
  const classes = [`sect-type-${sect.类型?.replace(/\s+/g, '')}`];
  
  if (sect.等级 === '一流') classes.push('tier-top');
  else if (sect.等级 === '二流') classes.push('tier-high');
  else if (sect.等级 === '三流') classes.push('tier-medium');
  
  if (sect.与玩家关系 !== '中立') classes.push('has-relation');
  
  return classes.join(' ');
};

const getLocationClass = (location: LocationInfo) => {
  const classes = [`location-type-${location.类型}`];
  
  if (location.安全等级) {
    classes.push(`safety-${location.安全等级.replace(/\s+/g, '')}`);
  }
  
  return classes.join(' ');
};

const getPowerLevel = (power: number) => {
  if (power >= 95) return '震古烁今';
  if (power >= 90) return '绝世强者';
  if (power >= 80) return '一方霸主';
  if (power >= 70) return '名门大派';
  if (power >= 60) return '中坚力量';
  if (power >= 40) return '新兴势力';
  return '初创宗门';
};

const getFeatureDescription = (feature: string) => {
  const descriptions = {
    '无情剑道': '以绝情绝义之心修剑道，剑气如霜',
    '天机推演': '窥探天机，推演未来吉凶祸福',
    '血祭秘法': '以生灵精血为祭，修炼邪门功法',
    '炼魂成幡': '炼化魂魄，制作魂幡类法宝',
    '阴阳合气之术': '调和阴阳二气，修炼特殊功法',
    '血脉传承': '依靠血脉之力传承神通秘术',
    '海战之法': '精通海上作战和水系法术',
    '情报交易': '收集买卖各种情报消息',
    '傀儡机关术': '制作操控各种机关傀儡',
    '阵法营造': '精通各种阵法的布置和破解'
  };
  return descriptions[feature as keyof typeof descriptions] || '该宗门的独特技艺';
};

const getTerritorySummary = (territory: Array<{ longitude: number; latitude: number; }>) => {
  if (!territory || territory.length === 0) return { lonRange: '未知', latRange: '未知' };
  
  const lons = territory.map(t => t.longitude);
  const lats = territory.map(t => t.latitude);
  
  return {
    lonRange: `${Math.min(...lons).toFixed(1)}°-${Math.max(...lons).toFixed(1)}°`,
    latRange: `${Math.min(...lats).toFixed(1)}°-${Math.max(...lats).toFixed(1)}°`
  };
};

const isInContinent = (position: { longitude: number; latitude: number; }, boundary: Array<{ longitude: number; latitude: number; }>) => {
  if (!position || !boundary || boundary.length < 3) return false;
  
  // 简单的点在多边形内判断（射线法）
  const { longitude: x, latitude: y } = position;
  let inside = false;
  
  for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
    const xi = boundary[i].longitude, yi = boundary[i].latitude;
    const xj = boundary[j].longitude, yj = boundary[j].latitude;
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
};

const getContinentLocations = (continentName: string) => {
  const continent = continentData.value.find(c => c.name === continentName);
  if (!continent) return [];
  
  return allLocations.value.filter(location => 
    isInContinent(location.位置, continent.大洲边界)
  );
};

// 交互函数
const selectSect = (sect: SectInfo) => {
  selectedSect.value = sect;
  activeTab.value = 'archives';
};

const selectContinent = (continent: any) => {
  selectedContinent.value = selectedContinent.value?.name === continent.name ? null : continent;
};

const refreshWorldData = async () => {
  isLoading.value = true;
  try {
    await characterStore.syncFromTavern();
    toast.success('世界数据已更新');
  } catch (error) {
    console.error('[宗门系统] 刷新数据失败:', error);
    toast.error('刷新失败');
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  console.log('[宗门系统] 宗门大观已载入');
});
</script>

<style scoped>
.sect-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 头部样式 */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: var(--color-surface);
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
  margin: 1rem 1rem 0 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 1.5rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.panel-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-primary);
}

.world-status {
  font-size: 0.875rem;
  color: var(--color-accent);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 6px;
  color: #3b82f6;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border);
  border-top: 2px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* 当前宗门卡片 */
.current-sect-card {
  margin: 16px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.sect-banner {
  padding: 16px 20px;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sect-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sect-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.sect-type {
  font-size: 0.8rem;
  opacity: 0.9;
}

.sect-level {
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 10px;
  display: inline-block;
  width: fit-content;
}

.sect-emblem {
  font-size: 2rem;
  opacity: 0.8;
}

.sect-details {
  padding: 16px 20px;
}

.detail-grid {
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
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.value {
  font-weight: 600;
  font-size: 0.9rem;
}

/* 未加入宗门状态 */
.no-sect-card {
  margin: 16px;
  padding: 32px 20px;
  background: white;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.no-sect-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.6;
}

.no-sect-title {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.no-sect-desc {
  margin: 0 0 16px 0;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.sect-discovery {
  padding: 8px 16px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 8px;
  color: var(--color-primary);
  font-size: 0.85rem;
}

/* 选项卡 */
.sect-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-light);
  margin: 0 16px;
}

.sect-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 8px;
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  position: relative;
}

.sect-tab:hover {
  background: rgba(59, 130, 246, 0.05);
  color: var(--color-text);
}

.sect-tab.active {
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-primary);
  font-weight: 600;
  border-bottom: 2px solid var(--color-primary);
}

.tab-icon {
  font-size: 1rem;
}

.tab-count {
  background: var(--color-primary);
  color: white;
  font-size: 0.7rem;
  padding: 1px 5px;
  border-radius: 8px;
  min-width: 16px;
  text-align: center;
}

/* 内容区域 */
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 总览内容 */
.world-summary {
  background: white;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.world-summary h5 {
  margin: 0 0 12px 0;
  color: var(--color-text);
  font-weight: 600;
}

.world-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-primary);
}

/* 宗门列表 */
.sects-list h5 {
  margin: 0 0 16px 0;
  color: var(--color-text);
  font-weight: 600;
}

.sects-grid {
  display: grid;
  gap: 16px;
}

.sect-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.2s ease;
}

.sect-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
  border-color: var(--color-primary);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.sect-emblem.small {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.sect-basic-info {
  flex: 1;
  min-width: 0;
}

.sect-basic-info .sect-name {
  margin: 0 0 4px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.sect-basic-info .sect-type {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.sect-level-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
  flex-shrink: 0;
}

.level-一流 {
  background: linear-gradient(45deg, #ffd700, #ffed4e);
  color: #92400e;
}

.level-二流 {
  background: linear-gradient(45deg, #c0c0c0, #e5e7eb);
  color: #374151;
}

.level-三流 {
  background: linear-gradient(45deg, #cd7f32, #d97706);
  color: white;
}

.card-body .sect-desc {
  margin: 0 0 12px 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.sect-features {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.feature-tag {
  padding: 2px 8px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-primary);
  border-radius: 12px;
  font-size: 0.75rem;
}

.sect-stats {
  border-top: 1px solid var(--color-border);
  padding-top: 12px;
}

.stat-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.stat-group .stat-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  min-width: 30px;
}

.power-bar {
  flex: 1;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.power-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-danger), var(--color-warning), var(--color-success));
  transition: width 0.3s ease;
}

.stat-group .stat-value {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
  min-width: 25px;
}

.relationship-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
}

.relation-label {
  color: var(--color-text-secondary);
}

.relation-value {
  font-weight: 500;
}

.relation-中立 { color: var(--color-text-secondary); }
.relation-友好 { color: var(--color-success); }
.relation-敌对 { color: var(--color-danger); }
.relation-盟友 { color: var(--color-info); }

/* 地理分布内容 */
.continent-overview h5 {
  margin: 0 0 16px 0;
  color: var(--color-text);
  font-weight: 600;
}

.continents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.continent-card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.continent-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.continent-card.active {
  border-color: var(--color-primary);
  background: rgba(59, 130, 246, 0.05);
}

.continent-name {
  margin: 0 0 8px 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
}

.continent-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.sect-count, .location-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.continent-features {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.feature-tag.small {
  padding: 1px 6px;
  font-size: 0.7rem;
}

/* 大陆详情 */
.continent-details {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.continent-details h5 {
  margin: 0 0 12px 0;
  color: var(--color-text);
  font-weight: 600;
}

.continent-description p {
  margin: 0 0 16px 0;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.locations-in-continent h6 {
  margin: 0 0 12px 0;
  color: var(--color-text);
  font-weight: 600;
}

.locations-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.location-item {
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 12px;
}

.location-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.location-name {
  font-weight: 600;
  color: var(--color-text);
}

.location-type {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.location-safety {
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 500;
}

.safety-安全 {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.safety-普通 {
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-primary);
}

.safety-危险 {
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-warning);
}

.safety-极危险 {
  background: rgba(220, 38, 38, 0.1);
  color: var(--color-danger);
}

.location-desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

/* 关系网络内容 */
.relations-overview h5 {
  margin: 0 0 16px 0;
  color: var(--color-text);
  font-weight: 600;
}

.relations-summary {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.relation-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.relation-stats .stat-item {
  text-align: center;
  padding: 12px;
  border-radius: 8px;
}

.stat-item.friendly {
  background: rgba(16, 185, 129, 0.1);
}

.stat-item.neutral {
  background: rgba(107, 114, 128, 0.1);
}

.stat-item.hostile {
  background: rgba(220, 38, 38, 0.1);
}

.stat-count {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-item.friendly .stat-count {
  color: var(--color-success);
}

.stat-item.neutral .stat-count {
  color: var(--color-text-secondary);
}

.stat-item.hostile .stat-count {
  color: var(--color-danger);
}

.my-relations h6 {
  margin: 0 0 12px 0;
  color: var(--color-text);
  font-weight: 600;
}

.no-relations {
  background: white;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.no-relations p {
  margin: 0 0 8px 0;
  color: var(--color-text-secondary);
}

.no-relations small {
  color: var(--color-text-muted);
}

.relations-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.relation-item {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.relation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.relation-header .sect-name {
  font-weight: 600;
  color: var(--color-text);
}

.relation-status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.relation-details {
  display: flex;
  gap: 16px;
}

.detail-row {
  font-size: 0.8rem;
}

.detail-label {
  color: var(--color-text-secondary);
}

.detail-value {
  color: var(--color-text);
  font-weight: 500;
}

/* 宗门档案内容 */
.selected-sect-details {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.sect-banner-large {
  padding: 24px;
  color: white;
  position: relative;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.sect-emblem.large {
  font-size: 3rem;
  opacity: 0.9;
}

.sect-name-large {
  margin: 0 0 8px 0;
  font-size: 1.8rem;
  font-weight: 700;
}

.sect-meta {
  display: flex;
  gap: 12px;
  align-items: center;
}

.sect-type-large {
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  font-size: 0.9rem;
}

.sect-level-large {
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  font-size: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.sect-full-info {
  padding: 20px;
}

.info-section {
  margin-bottom: 24px;
}

.info-section h6 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.sect-description-full {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
  font-size: 0.95rem;
}

.features-grid {
  display: grid;
  gap: 12px;
}

.feature-detail {
  background: var(--color-surface-light);
  border-radius: 8px;
  padding: 12px;
}

.feature-name {
  font-weight: 600;
  color: var(--color-text);
  display: block;
  margin-bottom: 4px;
}

.feature-desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.power-analysis {
  background: var(--color-surface-light);
  border-radius: 8px;
  padding: 16px;
}

.power-overview {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.power-score {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.score-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-primary);
}

.score-max {
  font-size: 1rem;
  color: var(--color-text-secondary);
}

.power-level {
  font-size: 0.9rem;
  color: var(--color-accent);
  font-weight: 500;
}

.power-bar-full {
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}

.power-fill-full {
  height: 100%;
  background: linear-gradient(90deg, var(--color-danger), var(--color-warning), var(--color-success));
  transition: width 0.3s ease;
}

.location-info {
  background: var(--color-surface-light);
  border-radius: 8px;
  padding: 16px;
}

.coordinates, .territory-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.coordinates:last-child, .territory-info:last-child {
  margin-bottom: 0;
}

.coord-label, .territory-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  min-width: 50px;
}

.coord-value, .territory-desc {
  font-size: 0.85rem;
  color: var(--color-text);
  font-family: monospace;
}

.player-relation-detail {
  background: var(--color-surface-light);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.relation-status-large {
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
}

.status-中立 {
  background: rgba(107, 114, 128, 0.1);
  color: var(--color-text-secondary);
}

.status-友好 {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.status-敌对 {
  background: rgba(220, 38, 38, 0.1);
  color: var(--color-danger);
}

.relation-reputation {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rep-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.rep-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.no-selection {
  background: white;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.no-selection-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.6;
}

.no-selection p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .panel-header {
    padding: 12px;
    margin: 8px;
  }
  
  .current-sect-card, .no-sect-card {
    margin: 8px;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .sect-tabs {
    margin: 0 8px;
  }
  
  .panel-content {
    padding: 8px;
  }
  
  .world-stats {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .continents-grid {
    grid-template-columns: 1fr;
  }
  
  .relation-stats {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .banner-content {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .sect-meta {
    justify-content: center;
  }
  
  .power-overview {
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  
  .player-relation-detail {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>