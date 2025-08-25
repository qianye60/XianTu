<template>
  <div class="right-sidebar">
    <div v-if="isDataLoaded" class="sidebar-content">
      <!-- 基础信息 -->
      <div class="info-section">
        <h3 class="section-title">基础信息</h3>
        <div class="basic-info">
          <div class="info-row">
            <span class="label">道号</span>
            <span class="value">{{ tavernData?.characterInfo?.名字 || tavernData?.character?.identity?.name || '无名道友' }}</span>
          </div>
          <div class="info-row">
            <span class="label">性别</span>
            <span class="value">{{ tavernData?.characterInfo?.性别 || tavernData?.character?.identity?.gender || '未知' }}</span>
          </div>
          <div class="info-row">
            <span class="label">境界</span>
            <span class="value">{{ tavernData?.character?.cultivation?.realm || tavernData?.saveData?.玩家角色状态?.境界?.名称 || '凡人' }}</span>
          </div>
          <div class="info-row clickable" @click="showSpiritRootDetail">
            <span class="label">灵根</span>
            <span class="value">{{ getSpiritRootDisplay() }} <span class="click-hint">📝</span></span>
          </div>
          <div class="info-row clickable" @click="showLocationDetail" v-if="getCurrentLocation()">
            <span class="label">位置</span>
            <span class="value">{{ getCurrentLocation() }} <span class="click-hint">🗺️</span></span>
          </div>
          <div class="info-row" v-if="getWealth()">
            <span class="label">财富</span>
            <span class="value">{{ getWealth() }}</span>
          </div>
        </div>
      </div>

      <!-- 修行状态 -->
      <div class="resources-section">
        <h3 class="section-title">修行状态</h3>
        <div class="resource-bars">
          <div class="resource-bar">
            <div class="resource-info">
              <span class="resource-name">气血</span>
              <span class="resource-text">
                {{ getVitalCurrent('qi') || 0 }} / {{ getVitalMax('qi') || 100 }}
              </span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill health" 
                :style="{ width: `${getVitalPercent('qi')}%` }"
              ></div>
            </div>
          </div>

          <div class="resource-bar">
            <div class="resource-info">
              <span class="resource-name">灵气</span>
              <span class="resource-text">
                {{ getVitalCurrent('ling') || 0 }} / {{ getVitalMax('ling') || 100 }}
              </span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill mana" 
                :style="{ width: `${getVitalPercent('ling')}%` }"
              ></div>
            </div>
          </div>

          <div class="resource-bar">
            <div class="resource-info">
              <span class="resource-name">神识</span>
              <span class="resource-text">
                {{ getVitalCurrent('shen') || 0 }} / {{ getVitalMax('shen') || 100 }}
              </span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill exp" 
                :style="{ width: `${getVitalPercent('shen')}%` }"
              ></div>
            </div>
          </div>

          <div class="resource-bar">
            <div class="resource-info">
              <span class="resource-name">寿元</span>
              <span class="resource-text">
                {{ getLifespanCurrent() }} / {{ getLifespanMax() }}年
              </span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill lifespan" 
                :style="{ width: `${getLifespanPercent()}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 六维资质六边形图 -->
      <div class="attributes-section">
        <h3 class="section-title">六维资质</h3>
        <div class="hexagon-container">
          <HexagonChart 
            :stats="hexagonStats" 
            :size="160" 
            :maxValue="20" 
          />
        </div>
      </div>

      <!-- 天赋神通 -->
      <div class="talents-section" v-if="talentsList?.length">
        <h3 class="section-title">天赋神通</h3>
        <div class="talents-list">
          <div 
            class="talent-tag clickable" 
            v-for="talent in talentsList.slice(0, 6)" 
            :key="talent"
            @click="showTalentDetail(talent)"
          >
            {{ talent }} <span class="click-hint">📖</span>
          </div>
          <div class="talent-more" v-if="talentsList.length > 6" @click="showAllTalents">
            +{{ talentsList.length - 6 }} <span class="click-hint">👁️</span>
          </div>
        </div>
      </div>

      <!-- 当前状态 -->
      <div class="status-section">
        <h3 class="section-title">当前状态</h3>
        <div class="status-info">
          <div class="status-item" v-if="currentConditions?.length">
            <div class="conditions-wrapper">
              <div class="conditions-grid">
                <span 
                  class="condition-tag" 
                  v-for="(condition, index) in currentConditions.slice(0, 4)" 
                  :key="condition"
                  :class="getConditionClass(condition)"
                >
                  {{ condition }}
                </span>
              </div>
              <div class="more-conditions" v-if="currentConditions.length > 4">
                <span class="condition-more">
                  +{{ currentConditions.length - 4 }}个状态
                </span>
                <button class="view-all-btn" @click="showAllConditions = !showAllConditions">
                  {{ showAllConditions ? '收起' : '展开' }}
                </button>
              </div>
              <!-- 展开显示所有状态 -->
              <div class="all-conditions" v-if="showAllConditions && currentConditions.length > 4">
                <span 
                  class="condition-tag small" 
                  v-for="condition in currentConditions.slice(4)" 
                  :key="'extra-' + condition"
                  :class="getConditionClass(condition)"
                >
                  {{ condition }}
                </span>
              </div>
            </div>
          </div>
          <div class="status-item" v-else>
            <span class="status-value no-effects">正常</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 无角色数据 -->
    <div v-else class="no-character">
      <div class="no-char-text">暂无角色数据</div>
    </div>

    <!-- 详情模态框 -->
    <DetailModal
      v-model="showDetailModal"
      :title="modalData.title"
      :icon="modalData.icon"
      :content="modalData.content"
      :showFooter="true"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick, watch } from 'vue';
import { useUnifiedCharacterData } from '@/composables/useCharacterData';
import HexagonChart from '@/components/common/HexagonChart.vue';
import DetailModal from '@/components/common/DetailModal.vue';
import type { InnateAttributesEnglish } from '@/types/game';

const { characterData, isDataLoaded } = useUnifiedCharacterData();
const tavernData = ref<any>(null);

// 模态框状态
const showDetailModal = ref(false);
const modalData = ref({
  title: '',
  icon: '',
  content: [] as any[]
});

// 获取酒馆数据 - 参考CharacterManagement的模式
const loadTavernData = async () => {
  try {
    const helper = (window.parent as any)?.TavernHelper;
    if (!helper) return;

    const vars = await helper.getVariables({ type: 'chat' });
    const gameData = vars?.DAD_GameData;
    
    if (gameData) {
      tavernData.value = gameData;
      console.log('[右侧面板] 酒馆数据加载成功:', {
        character: gameData.character,
        characterInfo: gameData.characterInfo,
        saveData: gameData.saveData
      });
    }
  } catch (error) {
    console.warn('[右侧面板] 获取酒馆数据失败:', error);
  }
};

// 获取天赋列表 - 参考CharacterManagement的数据路径
const talentsList = computed(() => {
  // 优先从酒馆数据获取天赋
  const tavernTalents = tavernData.value?.characterInfo?.天赋;
  if (tavernTalents && Array.isArray(tavernTalents)) {
    return tavernTalents;
  }
  
  // 备选路径
  const characterTalents = tavernData.value?.character?.qualities?.talents;
  if (characterTalents && Array.isArray(characterTalents)) {
    return characterTalents.map((t: any) => t.name || t);
  }
  
  // 回退到本地数据
  return characterData.value?.basicInfo?.talents || [];
});

// 获取当前状态列表 - 获取角色状态效果而非活动
const currentConditions = computed(() => {
  // 从存档数据中获取状态效果
  const statusEffects = tavernData.value?.saveData?.玩家角色状态?.状态效果;
  if (statusEffects && Array.isArray(statusEffects)) {
    return statusEffects.map((effect: any) => effect.状态名称 || effect.name || effect);
  }
  
  // 备选路径：从character.status获取
  const conditions = tavernData.value?.character?.status?.conditions;
  if (conditions && Array.isArray(conditions)) {
    return conditions.map((c: any) => c.name || c);
  }
  
  return [];
});

// 六维属性数据 - 参考CharacterManagement的数据访问方式
const sixAttributes = computed(() => {
  const getAttributeValue = (key: string, tavernKey?: string) => {
    // 优先从characterInfo获取先天六司数据
    const innateAttrs = tavernData.value?.characterInfo?.先天六司;
    if (innateAttrs && innateAttrs[key] !== undefined) {
      return innateAttrs[key];
    }
    
    // 备选：从character.attributes获取
    if (tavernData.value?.character?.attributes?.[tavernKey || key]) {
      return tavernData.value.character.attributes[tavernKey || key];
    }
    
    // 回退到本地数据
    const attrs = characterData.value?.attributes;
    if (attrs?.[key]?.value !== undefined) {
      return attrs[key].value;
    }
    
    return 10; // 默认值
  };

  return [
    { key: 'root_bone', name: '根骨', value: getAttributeValue('根骨', 'STR') },
    { key: 'spirituality', name: '灵性', value: getAttributeValue('灵性', 'SPI') },
    { key: 'comprehension', name: '悟性', value: getAttributeValue('悟性', 'INT') },
    { key: 'fortune', name: '气运', value: getAttributeValue('气运', 'LUK') },
    { key: 'charm', name: '魅力', value: getAttributeValue('魅力', 'CHA') },
    { key: 'temperament', name: '心性', value: getAttributeValue('心性', 'WIS') }
  ];
});

// 获取生命值数据 - 参考CharacterManagement的数据访问
const getVitalCurrent = (type: string) => {
  // 优先从saveData获取玩家角色状态
  const playerStatus = tavernData.value?.saveData?.玩家角色状态;
  if (playerStatus) {
    switch (type) {
      case 'qi': return playerStatus.气血?.当前;
      case 'ling': return playerStatus.灵气?.当前;
      case 'shen': return playerStatus.神识?.当前;
    }
  }
  
  // 备选：从character.resources获取
  const resources = tavernData.value?.character?.resources;
  if (resources) {
    switch (type) {
      case 'qi': return resources.qi?.current;
      case 'ling': return resources.ling?.current;
      case 'shen': return resources.shen?.current;
    }
  }
  
  // 回退到本地数据
  const vitals = characterData.value?.status?.vitals;
  switch (type) {
    case 'qi': return vitals?.qiBlood?.current;
    case 'ling': return vitals?.lingQi?.current;
    case 'shen': return vitals?.shenShi?.current;
  }
  return 0;
};

const getVitalMax = (type: string) => {
  // 优先从saveData获取玩家角色状态
  const playerStatus = tavernData.value?.saveData?.玩家角色状态;
  if (playerStatus) {
    switch (type) {
      case 'qi': return playerStatus.气血?.最大;
      case 'ling': return playerStatus.灵气?.最大;
      case 'shen': return playerStatus.神识?.最大;
    }
  }
  
  // 备选：从character.resources获取
  const resources = tavernData.value?.character?.resources;
  if (resources) {
    switch (type) {
      case 'qi': return resources.qi?.max;
      case 'ling': return resources.ling?.max;
      case 'shen': return resources.shen?.max;
    }
  }
  
  // 回退到本地数据
  const vitals = characterData.value?.status?.vitals;
  switch (type) {
    case 'qi': return vitals?.qiBlood?.max;
    case 'ling': return vitals?.lingQi?.max;
    case 'shen': return vitals?.shenShi?.max;
  }
  return 100;
};

const getVitalPercent = (type: string) => {
  const current = getVitalCurrent(type);
  const max = getVitalMax(type);
  if (!current || !max) return 0;
  return Math.round((current / max) * 100);
};

// 获取寿元数据
const getLifespanCurrent = () => {
  const lifespan = tavernData.value?.saveData?.玩家角色状态?.寿命;
  if (lifespan) {
    return lifespan.当前 || 18;
  }
  return tavernData.value?.character?.identity?.age || 18;
};

const getLifespanMax = () => {
  const lifespan = tavernData.value?.saveData?.玩家角色状态?.寿命;
  if (lifespan) {
    return lifespan.最大 || 100;
  }
  // 根据境界推算默认寿元
  const realm = tavernData.value?.saveData?.玩家角色状态?.境界?.等级 || 0;
  const baseLifespan = [80, 120, 200, 350, 600, 1000, 2000, 5000, 10000];
  return baseLifespan[realm] || 80;
};

// 获取灵根显示
const getSpiritRootDisplay = () => {
  const spiritRoot = tavernData.value?.characterInfo?.灵根 || tavernData.value?.character?.qualities?.spiritRoot?.name;
  if (spiritRoot) {
    return spiritRoot;
  }
  // 从先天六司数据推算灵根类型
  const innate = tavernData.value?.characterInfo?.先天六司;
  if (innate) {
    const 灵性 = innate.灵性 || 10;
    if (灵性 >= 18) return '天灵根';
    if (灵性 >= 15) return '地灵根';
    if (灵性 >= 12) return '人灵根';
    return '凡灵根';
  }
  return '未检测';
};

// 获取当前位置
const getCurrentLocation = () => {
  return tavernData.value?.saveData?.玩家角色状态?.位置?.名称 || 
         tavernData.value?.character?.location?.name || 
         tavernData.value?.saveData?.位置?.地区 ||
         null;
};

// 获取财富信息
const getWealth = () => {
  const money = tavernData.value?.saveData?.玩家角色状态?.金钱;
  if (money) {
    const 灵石 = money.灵石 || 0;
    const 金币 = money.金币 || 0;
    if (灵石 > 0 && 金币 > 0) {
      return `${灵石}灵石 ${金币}金`;
    } else if (灵石 > 0) {
      return `${灵石}灵石`;
    } else if (金币 > 0) {
      return `${金币}金`;
    }
  }
  return null;
};

// 点击处理函数
const showSpiritRootDetail = () => {
  const spiritRoot = tavernData.value?.characterInfo?.灵根;
  const innate = tavernData.value?.characterInfo?.先天六司;
  
  const content = [];
  
  // 灵根信息
  content.push({
    title: '灵根信息',
    type: 'table',
    data: [
      { label: '灵根类型', value: getSpiritRootDisplay() },
      { label: '灵性资质', value: innate?.灵性 || 10 }
    ]
  });
  
  // 先天六司
  if (innate) {
    content.push({
      title: '先天六司',
      type: 'table',
      data: [
        { label: '根骨', value: innate.根骨 || 10 },
        { label: '灵性', value: innate.灵性 || 10 },
        { label: '悟性', value: innate.悟性 || 10 },
        { label: '气运', value: innate.气运 || 10 },
        { label: '魅力', value: innate.魅力 || 10 },
        { label: '心性', value: innate.心性 || 10 }
      ]
    });
  }
  
  // 灵根描述
  if (spiritRoot && typeof spiritRoot === 'string' && spiritRoot.length > 10) {
    content.push({
      title: '灵根描述',
      type: 'text',
      data: spiritRoot
    });
  }
  
  modalData.value = {
    title: '灵根详情',
    icon: '✨',
    content
  };
  showDetailModal.value = true;
};

const showLocationDetail = () => {
  const location = getCurrentLocation();
  const locationData = tavernData.value?.saveData?.玩家角色状态?.位置;
  
  const content = [];
  
  // 位置信息
  content.push({
    title: '位置信息',
    type: 'table',
    data: [
      { label: '当前位置', value: location || '未知' }
    ]
  });
  
  if (locationData) {
    const locationDetails = [];
    if (locationData.地区) {
      locationDetails.push({ label: '所属地区', value: locationData.地区 });
    }
    if (locationData.等级) {
      locationDetails.push({ label: '地区等级', value: locationData.等级 });
    }
    if (locationDetails.length > 0) {
      content[0].data.push(...locationDetails);
    }
    
    // 描述
    if (locationData.描述) {
      content.push({
        title: '位置描述',
        type: 'text',
        data: locationData.描述
      });
    }
    
    // 特殊信息
    if (locationData.特殊信息) {
      content.push({
        title: '特殊信息',
        type: 'text',
        data: locationData.特殊信息
      });
    }
  }
  
  modalData.value = {
    title: '位置详情',
    icon: '🗺️',
    content
  };
  showDetailModal.value = true;
};

const showTalentDetail = (talent: string) => {
  const talentsData = tavernData.value?.characterInfo?.天赋数据;
  
  const content = [];
  
  // 天赋基本信息
  content.push({
    title: '天赋信息',
    type: 'table',
    data: [
      { label: '天赋名称', value: talent }
    ]
  });
  
  if (talentsData && talentsData[talent]) {
    const talentData = talentsData[talent];
    
    if (talentData.等级) {
      content[0].data.push({ label: '天赋等级', value: talentData.等级 });
    }
    
    if (talentData.描述) {
      content.push({
        title: '天赋描述',
        type: 'text',
        data: talentData.描述
      });
    }
    
    if (talentData.效果) {
      content.push({
        title: '天赋效果',
        type: 'text',
        data: talentData.效果
      });
    }
  } else {
    content.push({
      title: '天赋说明',
      type: 'text',
      data: '这是一个先天天赋，具体信息需要进一步探索才能知晓。'
    });
  }
  
  modalData.value = {
    title: `${talent} - 天赋详情`,
    icon: '📖',
    content
  };
  showDetailModal.value = true;
};

const showAllTalents = () => {
  const allTalents = talentsList.value;
  
  const content = [
    {
      title: `所有天赋 (${allTalents.length}个)`,
      type: 'list',
      data: allTalents
    }
  ];
  
  modalData.value = {
    title: '天赋列表',
    icon: '👁️',
    content
  };
  showDetailModal.value = true;
};

const getLifespanPercent = () => {
  const current = getLifespanCurrent();
  const max = getLifespanMax();
  if (!current || !max) return 0;
  return Math.round((current / max) * 100);
};
const showAllConditions = ref(false);

// 获取状态效果的样式类
const getConditionClass = (condition: string) => {
  // 根据状态名称判断类型
  if (condition.includes('中毒') || condition.includes('受伤') || condition.includes('衰弱') || condition.includes('禁锢')) {
    return 'condition-debuff';
  }
  if (condition.includes('强化') || condition.includes('加成') || condition.includes('防护') || condition.includes('祝福')) {
    return 'condition-buff';
  }
  return 'condition-neutral';
};

// 转换属性数据为HexagonChart需要的格式
const hexagonStats = computed((): Partial<InnateAttributesEnglish> => {
  const attrs = sixAttributes.value;
  return {
    root_bone: attrs[0]?.value || 10,
    spirituality: attrs[1]?.value || 10, 
    comprehension: attrs[2]?.value || 10,
    fortune: attrs[3]?.value || 10,
    charm: attrs[4]?.value || 10,
    temperament: attrs[5]?.value || 10
  };
});



onMounted(async () => {
  await loadTavernData();
});
</script>

<style scoped>
.right-sidebar {
  width: 100%;
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: rgba(255, 255, 255, 0.02);
}

.sidebar-content {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.sidebar-content::-webkit-scrollbar {
  width: 3px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

/* 通用区块样式 */
.info-section,
.attributes-section,
.talents-section,
.resources-section,
.status-section {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.section-title {
  margin: 0 0 10px 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #e2e8f0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 6px;
}

/* 基础信息样式 */
.basic-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  font-size: 0.75rem;
}

.info-row .label {
  color: #cbd5e1;
  min-width: 40px;
}

.info-row .value {
  color: #f1f5f9;
  font-weight: 500;
  text-align: right;
}

/* 点击提示样式 */
.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.clickable:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(2px);
}

.click-hint {
  font-size: 0.6rem;
  opacity: 0.7;
  margin-left: 4px;
}

.talent-tag.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.talent-tag.clickable:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
}

.talent-more {
  font-size: 0.7rem;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  border-radius: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.talent-more:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

/* 六边形容器 */
.hexagon-container {
  display: flex;
  justify-content: center;
  margin: 12px 0;
}

/* 天赋标签 */
.talents-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.talent-tag {
  font-size: 0.7rem;
  padding: 4px 8px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: white;
  border-radius: 12px;
  font-weight: 500;
}

/* 资源条 */
.resource-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resource-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resource-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.resource-name {
  font-size: 0.75rem;
  color: #cbd5e1;
  font-weight: 500;
}

.resource-text {
  font-size: 0.7rem;
  color: #94a3b8;
}

.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-fill.health {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.progress-fill.mana {
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
}

/* 寿元进度条使用渐变紫色 */
.progress-fill.lifespan {
  background: linear-gradient(90deg, #8b5cf6, #a78bfa);
}

/* 神识进度条使用金色 */
.progress-fill.exp {
  background: linear-gradient(90deg, #ffd700, #f59e0b);
}

/* 当前状态样式 */
.status-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.status-label {
  font-size: 0.75rem;
  color: #cbd5e1;
  min-width: 40px;
}

.status-value {
  font-size: 0.75rem;
  color: #f1f5f9;
  font-weight: 500;
}

.conditions-wrapper {
  width: 100%;
}

.conditions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-bottom: 8px;
}

.more-conditions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.all-conditions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.view-all-btn {
  font-size: 0.65rem;
  padding: 2px 6px;
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.view-all-btn:hover {
  background: rgba(59, 130, 246, 0.3);
}

.condition-tag.small {
  font-size: 0.6rem;
  padding: 1px 4px;
}

.condition-tag {
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
}

/* 状态效果颜色区分 */
.condition-buff {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
}

.condition-debuff {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
}

.condition-neutral {
  background: linear-gradient(135deg, #6b7280, #4b5563);
  color: white;
  box-shadow: 0 2px 4px rgba(107, 114, 128, 0.2);
}

.condition-more {
  font-size: 0.65rem;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  border-radius: 8px;
  font-weight: 500;
}

.no-effects {
  color: #10b981;
  font-weight: 500;
}

/* 无角色数据 */
.no-character {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.no-char-text {
  font-size: 0.9rem;
  color: #64748b;
  font-style: italic;
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .right-sidebar {
    background: rgba(0, 0, 0, 0.2);
  }
  
  .info-section,
  .attributes-section,
  .talents-section,
  .resources-section,
  .status-section {
    background: rgba(255, 255, 255, 0.05);
  }
  
  .radar-chart {
    background: rgba(255, 255, 255, 0.02);
  }
}
</style>