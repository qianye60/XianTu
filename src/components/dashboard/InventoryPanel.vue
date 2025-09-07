<template>
  <!-- 移除容器，让内容直接填充GameView提供的panel-content区域 -->
  <div class="inventory-content">
    <!-- 标签页导航 -->
    <div class="tabs-header">
      <div class="tabs-nav">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" :size="16" />
          <span>{{ tab.label }}</span>
        </button>
      </div>
      
      <!-- 搜索和筛选区域 -->
      <div class="tools-section" v-if="activeTab === 'items'">
        <div class="search-box">
          <Search :size="16" class="search-icon" />
          <input 
            type="text" 
            v-model="searchQuery" 
            :placeholder="isMobile ? '搜索...' : '搜索物品...'" 
          />
        </div>
        <div class="filter-buttons">
          <select v-model="selectedCategory" class="filter-select">
            <option value="all">全部物品</option>
            <option v-for="cat in itemCategories" :key="cat" :value="cat">
              {{ cat }}
            </option>
          </select>
          <select v-model="sortBy" class="filter-select">
            <option value="default">默认排序</option>
            <option value="quality">品质排序</option>
            <option value="name">名称排序</option>
          </select>
          <button 
            class="refresh-btn"
            @click="refreshFromTavern"
            :disabled="refreshing"
            title="从酒馆同步最新数据"
          >
            <RotateCcw :size="16" :class="{ 'spinning': refreshing }" />
          </button>
        </div>
      </div>
    </div>

    <!-- 标签内容 -->
    <div class="tab-content">
      <!-- 物品标签 -->
      <div v-if="activeTab === 'items'" class="items-tab">
        <!-- 移动端：模态框详情 -->
        <div v-if="showItemModal && isMobile" class="item-modal-overlay" @click="closeModal">
          <div class="item-modal" @click.stop>
            <div class="modal-header">
              <h3 :class="getItemQualityClass(selectedItem, 'text')">{{ selectedItem?.名称 }}</h3>
              <button class="modal-close-btn" @click="closeModal">
                <X :size="20" />
              </button>
            </div>
            <div class="modal-content">
              <div class="modal-icon-simple" :class="getItemQualityClass(selectedItem)">
                <div class="item-type-text">{{ selectedItem?.类型 }}</div>
              </div>
              <div class="modal-info">
                <div class="modal-meta">{{ selectedItem?.类型 }} / {{ selectedItem?.品质?.quality || '凡品' }}</div>
                <p class="modal-description">{{ selectedItem?.描述 }}</p>
                <div v-if="selectedItem?.装备增幅" class="modal-attributes">
                  <h4>装备增幅</h4>
                  <div class="attribute-text">{{ formatItemAttributes(selectedItem.装备增幅) }}</div>
                </div>
              </div>
            </div>
            <div class="modal-actions">
              <!-- 法宝：装备和丢弃 -->
              <template v-if="selectedItem?.类型 === '法宝'">
                <button class="action-btn equip-btn" @click="equipItem(selectedItem)">装备</button>
                <button class="action-btn discard-btn" @click="discardItem(selectedItem)">丢弃</button>
              </template>
              <!-- 功法：修炼和丢弃 -->
              <template v-else-if="selectedItem?.类型 === '功法'">
                <button class="action-btn cultivate-btn" @click="cultivateItem(selectedItem)">修炼</button>
                <button class="action-btn discard-btn" @click="discardItem(selectedItem)">丢弃</button>
              </template>
              <!-- 其他物品：使用和丢弃 -->
              <template v-else>
                <button class="action-btn use-btn" @click="useItem(selectedItem)">使用</button>
                <button class="action-btn discard-btn" @click="discardItem(selectedItem)">丢弃</button>
              </template>
            </div>
          </div>
        </div>

        <div class="items-grid">
          <div v-if="loading" class="grid-placeholder">
            <div class="loading-spinner"></div>
            <p>加载中...</p>
          </div>
          <div v-else-if="filteredItems.length === 0" class="grid-placeholder">
            <BoxSelect :size="48" />
            <p v-if="selectedCategory === 'all'">空空如也</p>
            <p v-else-if="selectedCategory === '法宝'">暂无法宝</p>
            <p v-else-if="selectedCategory === '功法'">暂无功法</p>
            <p v-else-if="selectedCategory === '其他'">暂无其他物品</p>
            <p v-else>暂无{{ selectedCategory }}</p>
            <span v-if="selectedCategory !== 'all'" class="filter-tip">
              可以试试搜索其他分类
            </span>
          </div>
          <div
            v-else
            v-for="item in filteredItems"
            :key="item.物品ID"
            class="item-card"
            :class="[getItemQualityClass(item), getItemTypeClass(item.类型, 'card')]"
            @click="selectItem(item)"
            @dblclick="handleDoubleClick(item)"
          >
            <div class="item-header">
              <div class="item-type-badge" :class="getItemTypeClass(item.类型)">{{ item.类型 }}</div>
              <div class="item-quality-badge" :class="getItemQualityClass(item, 'badge')">
                {{ getItemQualityText(item) }}
              </div>
            </div>
            <div class="item-body">
              <div class="item-name" :title="item.名称">{{ item.名称 }}</div>
              <div class="item-meta">
                <div class="item-quantity" v-if="item.数量 > 1">x{{ item.数量 }}</div>
                <div class="item-grade" v-if="item.品质?.grade">
                  {{ item.品质.grade }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 桌面端物品详情侧边栏 -->
        <div v-if="!isMobile" class="item-details-sidebar">
          <div v-if="selectedItem" class="details-content">
            <div class="details-header">
              <div class="details-icon-large" :class="getItemQualityClass(selectedItem)">
                <div class="item-type-text-large">{{ selectedItem.类型 }}</div>
              </div>
              <div class="details-title-area">
                <h3 :class="getItemQualityClass(selectedItem, 'text')">{{ selectedItem.名称 }}</h3>
                <div class="details-meta">{{ selectedItem.类型 }} / {{ selectedItem.品质?.quality || '凡品' }}</div>
              </div>
            </div>
            <div class="details-body">
              <p class="details-description">{{ selectedItem.描述 }}</p>
              <div v-if="selectedItem.装备增幅" class="details-attributes">
                <h4>装备增幅</h4>
                <div class="attribute-text">{{ formatItemAttributes(selectedItem.装备增幅) }}</div>
              </div>
            </div>
            <div class="details-actions">
              <!-- 法宝：装备和丢弃 -->
              <template v-if="selectedItem?.类型 === '法宝'">
                <button class="action-btn equip-btn" @click="equipItem(selectedItem)">装备</button>
                <button class="action-btn discard-btn" @click="discardItem(selectedItem)">丢弃</button>
              </template>
              <!-- 功法：修炼和丢弃 -->
              <template v-else-if="selectedItem?.类型 === '功法'">
                <button class="action-btn cultivate-btn" @click="cultivateItem(selectedItem)">修炼</button>
                <button class="action-btn discard-btn" @click="discardItem(selectedItem)">丢弃</button>
              </template>
              <!-- 其他物品：使用和丢弃 -->
              <template v-else>
                <button class="action-btn use-btn" @click="useItem(selectedItem)">使用</button>
                <button class="action-btn discard-btn" @click="discardItem(selectedItem)">丢弃</button>
              </template>
            </div>
          </div>
          <div v-else class="details-placeholder">
            <BoxSelect :size="48" />
            <p>选择物品查看详情</p>
          </div>
        </div>
      </div>

      <!-- 灵石标签 -->
      <div v-if="activeTab === 'currency'" class="currency-tab">
        <div class="currency-grid">
          <div 
            v-for="grade in spiritStoneGrades" 
            :key="grade.name"
            class="currency-card"
            :class="grade.colorClass"
          >
            <div class="currency-card-top">
              <div class="currency-icon">
                <Gem :size="isMobile ? 32 : 40" />
              </div>
              <div class="currency-info">
                <div class="currency-amount">{{ inventory.灵石[grade.name] || 0 }}</div>
                <div class="currency-label">{{ grade.name }}灵石</div>
              </div>
            </div>
            <div v-if="grade.canExchange || grade.canExchangeDown" class="currency-exchange">
              <button 
                v-if="grade.canExchange"
                class="exchange-btn"
                @click="handleExchange(grade.name, 'up')"
                :disabled="(inventory.灵石[grade.name] || 0) < 100"
                :title="`兑换为${grade.exchangeUp}灵石 (100:1)`"
              >
                ↑ 兑换
              </button>
              <button 
                v-if="grade.canExchangeDown"
                class="exchange-btn down"
                @click="handleExchange(grade.name, 'down')"
                :disabled="(inventory.灵石[grade.name] || 0) < 1"
                :title="`分解为${grade.exchangeDown}灵石 (1:100)`"
              >
                ↓ 分解
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, Component } from 'vue';
import { Search, BoxSelect, Gem, Package, X, RotateCcw } from 'lucide-vue-next';
import { useCharacterStore } from '@/stores/characterStore';
import type { Item, Inventory } from '@/types/game';
import { toast } from '@/utils/toast';

const characterStore = useCharacterStore();
const loading = ref(false);
const refreshing = ref(false);
const selectedItem = ref<Item | null>(null);
const searchQuery = ref('');
const selectedCategory = ref('all');
const sortBy = ref('default');
const activeTab = ref('items');
const showItemModal = ref(false);

// 响应式检测
const isMobile = computed(() => {
  return window.innerWidth <= 768;
});

// 标签配置
const tabs = computed(() => [
  { id: 'items', label: '物品', icon: Package },
  { id: 'currency', label: '灵石', icon: Gem }
]);

const inventory = computed<Inventory>(() => {
  console.log('[背包面板] 调试 - activeSaveSlot:', characterStore.activeSaveSlot);
  console.log('[背包面板] 调试 - 存档数据:', characterStore.activeSaveSlot?.存档数据);
  console.log('[背包面板] 调试 - 背包数据:', characterStore.activeSaveSlot?.存档数据?.背包);
  
  return characterStore.activeSaveSlot?.存档数据?.背包 || { 
    灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 }, 
    物品: {} 
  };
});

const itemList = computed<Item[]>(() => Object.values(inventory.value.物品 || {}));

const itemCategories = computed(() => {
  // 固定三个分类：法宝、功法、其他
  const predefinedCategories = ['法宝', '功法', '其他'];
  const existingCategories: string[] = [];
  
  // 只显示背包中实际存在的分类
  predefinedCategories.forEach(category => {
    const hasItems = itemList.value.some(item => item.类型 === category);
    if (hasItems) {
      existingCategories.push(category);
    }
  });
  
  return existingCategories;
});

const qualityOrder: { [key: string]: number } = { '凡': 1, '人': 2, '地': 3, '天': 4, '仙': 5, '神': 6 };

const filteredItems = computed(() => {
  let items = [...itemList.value];

  if (searchQuery.value) {
    items = items.filter(item => item.名称.includes(searchQuery.value));
  }

  if (selectedCategory.value !== 'all') {
    items = items.filter(item => item.类型 === selectedCategory.value);
  }

  if (sortBy.value === 'quality') {
    items.sort((a, b) => (qualityOrder[b.品质?.quality || '凡'] || 0) - (qualityOrder[a.品质?.quality || '凡'] || 0));
  } else if (sortBy.value === 'name') {
    items.sort((a, b) => a.名称.localeCompare(b.名称));
  }
  
  return items;
});

// 格式化物品属性显示
const formatItemAttributes = (attributes: any): string => {
  if (!attributes || typeof attributes !== 'object') {
    return '无特殊属性';
  }
  
  // 将属性对象转换为简洁的文本显示
  const attrArray = Object.entries(attributes).map(([key, value]) => `${key}+${value}`);
  return attrArray.join('、') || '无特殊属性';
};

// 获取物品类型样式
const getItemTypeClass = (type: string, variant: string = 'badge'): string => {
  const typeClasses: Record<string, Record<string, string>> = {
    '法宝': {
      badge: 'type-artifact',
      card: 'card-artifact'
    },
    '功法': {
      badge: 'type-technique',
      card: 'card-technique'
    },
    '其他': {
      badge: 'type-other', 
      card: 'card-other'
    }
  };
  
  return typeClasses[type]?.[variant] || (variant === 'card' ? 'card-other' : 'type-other');
};

// 获取物品品质文本
const getItemQualityText = (item: Item | null): string => {
  if (!item || !item.品质) return '凡';
  
  const quality = item.品质.quality;
  const qualityMap: Record<string, string> = {
    '凡': '凡品',
    '黄': '黄品',
    '玄': '玄品',
    '地': '地品',
    '天': '天品',
    '仙': '仙品',
    '神': '神品'
  };
  
  return qualityMap[quality] || '凡品';
};

// 从背包中移除物品的辅助函数
const removeItemFromInventory = async (item: Item) => {
  if (!characterStore.activeSaveSlot?.存档数据?.背包?.物品) {
    throw new Error('背包数据不存在');
  }
  
  // 从背包中移除物品
  delete characterStore.activeSaveSlot.存档数据.背包.物品[item.物品ID];
  await characterStore.commitToStorage();
  
  console.log('[背包面板] 物品移除成功:', item.名称);
  
  // 如果当前选中的是被移除的物品，清除选择
  if (selectedItem.value?.物品ID === item.物品ID) {
    selectedItem.value = null;
  }
  
  // 关闭弹窗
  if (isMobile.value) {
    showItemModal.value = false;
  }
};

// 同步数据到酒馆变量
const syncToTavernVariables = async () => {
  try {
    if (typeof window === 'undefined' || !window.parent?.TavernHelper) {
      console.warn('[背包面板] 酒馆环境不可用，跳过同步');
      return;
    }
    
    const saveData = characterStore.activeSaveSlot?.存档数据;
    if (!saveData) {
      console.warn('[背包面板] 存档数据不存在，跳过同步');
      return;
    }
    
    // 同步背包数据
    if (saveData.背包) {
      window.parent.TavernHelper.setVariableValue('背包数据', JSON.stringify(saveData.背包));
    }
    
    // 同步装备栏数据
    if (saveData.装备栏) {
      window.parent.TavernHelper.setVariableValue('装备栏数据', JSON.stringify(saveData.装备栏));
    }
    
    // 同步修炼功法数据
    if (saveData.修炼功法) {
      window.parent.TavernHelper.setVariableValue('修炼功法数据', JSON.stringify(saveData.修炼功法));
    }
    
    console.log('[背包面板] 数据已同步到酒馆变量');
  } catch (error) {
    console.error('[背包面板] 同步酒馆变量失败:', error);
  }
};

// 双击处理
const handleDoubleClick = (item: Item) => {
  if (item.类型 === '法宝') {
    equipItem(item);
  } else if (item.类型 === '功法') {
    cultivateItem(item);
  } else {
    useItem(item);
  }
};

// 功法修炼功能
const cultivateItem = async (item: Item) => {
  if (!item || item.类型 !== '功法') {
    toast.error('只能修炼功法类物品');
    return;
  }
  
  console.log('[背包面板] 修炼功法:', item.名称);
  
  try {
    // 检查存档数据是否存在
    if (!characterStore.activeSaveSlot?.存档数据) {
      toast.error('存档数据不存在，无法修炼功法');
      return;
    }
    
    // 检查是否有修炼功法数据结构
    if (!characterStore.activeSaveSlot.存档数据.修炼功法) {
      toast.warning('修炼功法槽位未初始化');
      return;
    }
    
    // 将功法添加到修炼功法槽位中
    const skillSlots = characterStore.activeSaveSlot.存档数据.修炼功法;
    
    // 检查是否已经在修炼其他功法
    if (skillSlots.功法 && skillSlots.功法.物品ID !== item.物品ID) {
      const confirm = window.confirm(`当前正在修炼《${skillSlots.功法.名称}》，确定要切换到《${item.名称}》吗？`);
      if (!confirm) return;
      
      // 将之前的功法放回背包
      const previousSkill = skillSlots.功法;
      if (previousSkill.物品ID && characterStore.activeSaveSlot.存档数据.背包?.物品) {
        characterStore.activeSaveSlot.存档数据.背包.物品[previousSkill.物品ID] = {
          物品ID: previousSkill.物品ID,
          名称: previousSkill.名称,
          类型: previousSkill.类型,
          品质: previousSkill.品质,
          描述: previousSkill.描述,
          功法效果: previousSkill.功法效果 || {},
          功法技能: previousSkill.功法技能 || {},
          数量: 1
        };
        console.log('[背包面板] 之前的功法已放回背包:', previousSkill.名称);
      }
    }
    
    // 装备功法到修炼槽位 - 创建完整的功法数据
    const skillData = {
      物品ID: item.物品ID || '',
      名称: item.名称,
      类型: item.类型,
      品质: item.品质,
      描述: item.描述,
      功法效果: item.功法效果 || {},
      功法技能: item.功法技能 || {},
      修炼进度: skillSlots.功法?.修炼进度 || 0,
      数量: 1
    };
    skillSlots.功法 = skillData;
    
    // 初始化修炼数据
    if (!skillSlots.熟练度) skillSlots.熟练度 = 0;
    if (!skillSlots.已解锁技能) skillSlots.已解锁技能 = [];
    
    // 从背包移除已装备的功法
    await removeItemFromInventory(item);
    
    // 保存数据到存储
    await characterStore.commitToStorage();
    
    // 同步到酒馆变量
    await syncToTavernVariables();
    
    console.log('[背包面板] 功法修炼成功，已同步到酒馆变量:', item.名称);
    toast.success(`开始修炼《${item.名称}》`);
    
    // 关闭弹窗
    if (isMobile.value) {
      showItemModal.value = false;
    }
    selectedItem.value = null;
    
  } catch (error) {
    console.error('[背包面板] 修炼失败:', error);
    toast.error('修炼功法失败');
  }
};

// 使用物品功能
const useItem = async (item: Item) => {
  if (!item) {
    return;
  }
  
  console.log('[背包面板] 使用物品:', item.名称);
  
  try {
    if (item.使用效果) {
      // 有明确使用效果的物品
      const confirm = window.confirm(`确定要使用《${item.名称}》吗？\n\n效果：${item.使用效果}`);
      if (!confirm) return;
      
      // 这里可以根据物品的使用效果实现具体逻辑
      // 比如恢复气血、提升修为等
      
      // 减少物品数量
      if (item.数量 > 1) {
        item.数量 -= 1;
        await characterStore.commitToStorage();
        toast.success(`使用了《${item.名称}》，剩余${item.数量}个`);
      } else {
        // 数量为1时，使用后移除物品
        await removeItemFromInventory(item);
        toast.success(`使用了《${item.名称}》，物品已用完`);
      }
    } else {
      // 没有明确使用效果的物品
      const confirm = window.confirm(`《${item.名称}》暂无特殊效果，确定要使用吗？`);
      if (!confirm) return;
      
      toast.info(`使用了《${item.名称}》，但似乎没有产生明显效果`);
    }
    
    // 关闭弹窗
    if (isMobile.value) {
      showItemModal.value = false;
    }
    selectedItem.value = null;
    
  } catch (error) {
    console.error('[背包面板] 使用失败:', error);
    toast.error('使用物品失败');
  }
};

// 丢弃物品功能
const discardItem = async (item: Item) => {
  if (!item) {
    return;
  }
  
  // 确认丢弃
  const itemQuality = item.品质?.quality || '凡';
  const qualityColor = itemQuality === '凡' ? '' : `【${itemQuality}品】`;
  if (!confirm(`确定要丢弃 ${qualityColor}${item.名称} 吗？\n\n此操作不可撤销！`)) {
    return;
  }
  
  console.log('[背包面板] 丢弃物品:', item.名称);
  
  try {
    await removeItemFromInventory(item);
    toast.success(`已丢弃《${item.名称}》`);
    
    // 关闭弹窗
    if (isMobile.value) {
      showItemModal.value = false;
    }
    selectedItem.value = null;
    
  } catch (error) {
    console.error('[背包面板] 丢弃失败:', error);
    toast.error('丢弃物品失败');
  }
};
const equipItem = async (item: Item) => {
  if (!item || item.类型 !== '法宝') {
    toast.error('只能装备法宝类物品');
    return;
  }
  
  console.log('[背包面板] 装备法宝:', item.名称);
  
  try {
    // 检查存档数据是否存在
    if (!characterStore.activeSaveSlot?.存档数据) {
      toast.error('存档数据不存在，无法装备法宝');
      return;
    }
    
    // 检查是否有装备栏数据结构
    if (!characterStore.activeSaveSlot.存档数据.装备栏) {
      toast.warning('装备栏未初始化');
      return;
    }
    
    // 将物品添加到装备栏中
    const equipmentSlot = characterStore.activeSaveSlot.存档数据.装备栏;
    
    // 找到空的法宝位置
    let equipped = false;
    let replacedItem = null;
    
    for (let i = 1; i <= 6; i++) {
      const slotKey = `法宝${i}` as keyof typeof equipmentSlot;
      if (!equipmentSlot[slotKey]) {
        equipmentSlot[slotKey] = item.物品ID;
        equipped = true;
        console.log(`[背包面板] 法宝装备到${slotKey}:`, item.名称);
        toast.success(`《${item.名称}》已装备到${slotKey}`);
        break;
      }
    }
    
    if (!equipped) {
      // 装备栏已满，询问是否替换
      const confirm = window.confirm('装备栏已满，是否替换法宝1的装备？');
      if (confirm) {
        const oldItemId = equipmentSlot.法宝1;
        equipmentSlot.法宝1 = item.物品ID;
        toast.success(`《${item.名称}》已替换装备到法宝1`);
        
        // 可以考虑将被替换的装备放回背包，这里先跳过
      } else {
        toast.info('取消装备操作');
        return;
      }
    }
    
    // 从背包移除已装备物品
    await removeItemFromInventory(item);
    
    // 保存数据到存储
    await characterStore.commitToStorage();
    
    // 同步到酒馆变量
    await syncToTavernVariables();
    
    console.log('[背包面板] 法宝装备成功，已同步到酒馆变量');
    
    // 关闭弹窗
    if (isMobile.value) {
      showItemModal.value = false;
    }
    selectedItem.value = null;
    
  } catch (error) {
    console.error('[背包面板] 装备失败:', error);
    toast.error('装备法宝失败');
  }
};

const getItemQualityClass = (item: Item | null, type: 'border' | 'text' | 'badge' = 'border'): string => {
  if (!item) return '';
  const quality = item.品质?.quality || '凡';
  return `${type}-quality-${quality}`;
};

const spiritStoneGrades = [
  { 
    name: '极品', 
    colorClass: 'grade-legend',
    canExchange: false, // 最高级，不能向上兑换
    canExchangeDown: true,
    exchangeDown: '上品'
  },
  { 
    name: '上品', 
    colorClass: 'grade-epic',
    canExchange: true,
    canExchangeDown: true,
    exchangeUp: '极品',
    exchangeDown: '中品'
  },
  { 
    name: '中品', 
    colorClass: 'grade-rare',
    canExchange: true,
    canExchangeDown: true,
    exchangeUp: '上品',
    exchangeDown: '下品'
  },
  { 
    name: '下品', 
    colorClass: 'grade-common',
    canExchange: true,
    canExchangeDown: false, // 最低级，不能向下分解
    exchangeUp: '中品'
  },
] as const;


// 选择物品
const selectItem = (item: Item) => {
  selectedItem.value = item;
  if (isMobile.value) {
    showItemModal.value = true;
  }
};

// 关闭模态框
const closeModal = () => {
  showItemModal.value = false;
};

// 灵石兑换功能
const handleExchange = (currentGrade: '下品' | '中品' | '上品' | '极品', direction: 'up' | 'down') => {
  const gradeInfo = spiritStoneGrades.find(g => g.name === currentGrade);
  if (!gradeInfo) return;

  if (direction === 'up' && gradeInfo.canExchange && gradeInfo.exchangeUp) {
    // 向上兑换：100个当前等级 → 1个高级
    const currentAmount = inventory.value.灵石[currentGrade] || 0;
    if (currentAmount >= 100) {
      // 更新存档数据
      if (characterStore.activeSaveSlot?.存档数据?.背包?.灵石) {
        (characterStore.activeSaveSlot.存档数据.背包.灵石[currentGrade] as number) = currentAmount - 100;
        const targetGrade = gradeInfo.exchangeUp as '下品' | '中品' | '上品' | '极品';
        const targetAmount = characterStore.activeSaveSlot.存档数据.背包.灵石[targetGrade] || 0;
        (characterStore.activeSaveSlot.存档数据.背包.灵石[targetGrade] as number) = targetAmount + 1;
        characterStore.commitToStorage();
      }
    }
  } else if (direction === 'down' && gradeInfo.canExchangeDown && gradeInfo.exchangeDown) {
    // 向下分解：1个当前等级 → 100个低级
    const currentAmount = inventory.value.灵石[currentGrade] || 0;
    if (currentAmount >= 1) {
      // 更新存档数据
      if (characterStore.activeSaveSlot?.存档数据?.背包?.灵石) {
        (characterStore.activeSaveSlot.存档数据.背包.灵石[currentGrade] as number) = currentAmount - 1;
        const targetGrade = gradeInfo.exchangeDown as '下品' | '中品' | '上品' | '极品';
        const targetAmount = characterStore.activeSaveSlot.存档数据.背包.灵石[targetGrade] || 0;
        (characterStore.activeSaveSlot.存档数据.背包.灵石[targetGrade] as number) = targetAmount + 100;
        characterStore.commitToStorage();
      }
    }
  }
};

// 手动刷新数据
const refreshFromTavern = async () => {
  if (refreshing.value) return;
  
  refreshing.value = true;
  try {
    console.log('[背包面板] 手动刷新酒馆数据...');
    await characterStore.syncFromTavern();
  } catch (error) {
    console.error('[背包面板] 刷新数据失败:', error);
  } finally {
    refreshing.value = false;
  }
};

onMounted(async () => {
  console.log('[背包面板] 组件挂载，开始同步酒馆数据...');
  
  try {
    // 从酒馆同步最新数据
    await characterStore.syncFromTavern();
  } catch (error) {
    console.error('[背包面板] 同步酒馆数据失败:', error);
  }
  
  if (!selectedItem.value && filteredItems.value.length > 0) {
    selectedItem.value = filteredItems.value[0];
  }
});
</script>

<style scoped>
.inventory-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  overflow: hidden;
}

/* 移动端模态框 */
.item-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.item-modal {
  background: var(--color-surface);
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modal-appear 0.3s ease-out;
}

@keyframes modal-appear {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-light);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.modal-close-btn {
  background: none;
  border: none;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}

.modal-close-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.modal-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.modal-icon-simple {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  border: 3px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  background: var(--color-surface-hover);
  font-weight: bold;
  font-size: 14px;
  color: var(--color-text);
}

.modal-info {
  width: 100%;
}

.modal-meta {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin-bottom: 12px;
}

.modal-description {
  color: var(--color-text);
  line-height: 1.6;
  margin-bottom: 16px;
}

.modal-attributes {
  background: var(--color-surface-light);
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
}

.modal-attributes h4 {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.modal-actions {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
}

/* 主内容区域 */
.inventory-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 标签导航 */
.tabs-header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 16px;
}

.tabs-nav {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.tab-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.tab-btn.active {
  background: var(--color-primary);
  color: white;
}

/* 工具栏 */
.tools-section {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-secondary);
  z-index: 1;
}

.search-box input {
  width: 100%;
  padding: 10px 12px 10px 40px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  font-size: 14px;
  transition: all 0.2s ease;
}

.search-box input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
}

.filter-buttons {
  display: flex;
  gap: 8px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  font-size: 13px;
  min-width: 80px;
}

.refresh-btn {
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--color-surface-hover);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-btn .spinning {
  animation: spin 1s linear infinite;
}

/* 标签内容 */
.tab-content {
  flex: 1;
  overflow: hidden;
}

/* 物品标签 */
.items-tab {
  display: flex;
  height: 100%;
}

.items-grid {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  align-content: start;
}

.grid-placeholder {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--color-text-secondary);
  text-align: center;
}

.filter-tip {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-top: 8px;
  opacity: 0.8;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top: 3px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.item-card {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  aspect-ratio: 1;
  position: relative;
  overflow: hidden;
}

.item-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-color: var(--color-primary);
}

/* 物品卡片头部 */
.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
  margin-bottom: 4px;
}

/* 物品卡片主体 */
.item-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
}

/* 物品底部元信息 */
.item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-top: 4px;
  font-size: 10px;
}

/* 物品类型徽章 - 不同类型不同颜色 */
.item-type-badge {
  font-size: 8px;
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.type-artifact { 
  background: rgba(255, 215, 0, 0.2); 
  color: #FFD700; 
  border: 1px solid rgba(255, 215, 0, 0.4);
}

.type-technique { 
  background: rgba(138, 43, 226, 0.2); 
  color: #8A2BE2; 
  border: 1px solid rgba(138, 43, 226, 0.4);
}

.type-other { 
  background: rgba(169, 169, 169, 0.2); 
  color: #A9A9A9; 
  border: 1px solid rgba(169, 169, 169, 0.4);
}

/* 物品品质徽章 - 不同品质不同颜色 */
.item-quality-badge {
  font-size: 7px;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-quality-凡 { background: rgba(128, 128, 128, 0.2); color: #808080; }
.badge-quality-黄 { background: rgba(255, 215, 0, 0.2); color: #DAA520; }
.badge-quality-玄 { background: rgba(75, 0, 130, 0.2); color: #9370DB; }
.badge-quality-地 { background: rgba(139, 69, 19, 0.2); color: #A0522D; }
.badge-quality-天 { background: rgba(30, 144, 255, 0.2); color: #1E90FF; }
.badge-quality-仙 { background: rgba(255, 20, 147, 0.2); color: #FF1493; }
.badge-quality-神 { background: rgba(255, 0, 0, 0.2); color: #DC143C; }

/* 物品卡片边框品质颜色 */
.border-quality-凡 { border-color: #808080; }
.border-quality-黄 { border-color: #DAA520; }
.border-quality-玄 { border-color: #9370DB; }
.border-quality-地 { border-color: #A0522D; }
.border-quality-天 { border-color: #1E90FF; }
.border-quality-仙 { border-color: #FF1493; }
.border-quality-神 { border-color: #DC143C; }

/* 物品卡片整体背景色根据类型 */
.card-artifact { 
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.05), var(--color-surface)); 
}
.card-technique { 
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.05), var(--color-surface)); 
}
.card-other { 
  background: var(--color-surface); 
}

/* 物品名称 */
.item-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text);
  margin: 2px 0;
  text-align: center;
  line-height: 1.2;
  word-break: break-word;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

/* 物品数量显示 */
.item-quantity {
  background: rgba(var(--color-primary-rgb), 0.8);
  color: white;
  border-radius: 3px;
  padding: 1px 3px;
  font-size: 9px;
  font-weight: 600;
  min-width: 16px;
  text-align: center;
}

/* 物品等级/品阶显示 */
.item-grade {
  font-size: 9px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.item-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-color: var(--color-primary);
}

.item-quantity {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: var(--color-primary);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
}

.item-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text);
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
}

/* 桌面端详情侧边栏 */
.item-details-sidebar {
  width: 320px;
  border-left: 1px solid var(--color-border);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
}

.details-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.details-header {
  padding: 20px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 16px;
}

.details-icon-large {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
  flex-shrink: 0;
  font-weight: bold;
  font-size: 12px;
  color: var(--color-text);
}

.details-title-area h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.details-meta {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.details-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.details-description {
  color: var(--color-text);
  line-height: 1.6;
  margin-bottom: 20px;
}

.details-attributes h4 {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.details-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  text-align: center;
}

.details-actions {
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: 8px;
}

/* 灵石标签 */
.currency-tab {
  padding: 24px;
  overflow-y: auto;
}

.currency-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  width: 100%;
}

.currency-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.3s ease;
  cursor: default;
}

.currency-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.currency-card-top {
  display: flex;
  align-items: center;
  gap: 16px;
}

.currency-icon {
  flex-shrink: 0;
}

.currency-info {
  flex: 1;
}

.currency-amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
}

.currency-label {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

/* 兑换功能 */
.currency-exchange {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.exchange-btn {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-primary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.exchange-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.exchange-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
}

.exchange-btn:hover:not(:disabled)::before {
  left: 100%;
}

.exchange-btn.down {
  border-color: var(--color-warning);
  color: var(--color-warning);
}

.exchange-btn.down:hover:not(:disabled) {
  background: var(--color-warning);
  color: white;
  box-shadow: 0 4px 12px rgba(var(--color-warning-rgb), 0.3);
}

.exchange-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.exchange-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

/* 按钮样式 */
.action-btn {
  flex: 1;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface-hover);
  color: var(--color-text);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--color-surface-light);
  transform: translateY(-1px);
}

.use-btn {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.use-btn:hover {
  background: var(--color-primary-hover);
}

.discard-btn {
  background: var(--color-error);
  border-color: var(--color-error);
  color: white;
}

.discard-btn:hover {
  background: var(--color-error-hover);
}

/* 属性文本显示 */
.attribute-text {
  background: var(--color-background);
  border-radius: 6px;
  padding: 12px;
  font-size: 0.9rem;
  color: var(--color-text);
  line-height: 1.4;
  word-break: break-all;
}

.item-info-wrapper {
  position: relative;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;
}

.item-type-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-align: center;
  min-width: 36px;
}

.type-artifact {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fca5a5;
}

.type-technique {
  background: #dbeafe;
  color: #2563eb;
  border: 1px solid #93c5fd;
}

.type-other {
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.item-type-text {
  font-size: 10px;
  font-weight: bold;
  text-align: center;
}

.item-type-text-large {
  font-size: 12px;
  font-weight: bold;
  text-align: center;
}

.cultivate-btn {
  background: var(--color-info);
  border-color: var(--color-info);
  color: white;
}

.cultivate-btn:hover {
  background: var(--color-info-hover);
}

.equip-btn {
  background: var(--color-success);
  border-color: var(--color-success);
  color: white;
}

.equip-btn:hover {
  background: var(--color-success-hover);
}

/* 品质样式 */
.border-quality-神, .grade-legend { border-color: #ef4444 !important; color: #ef4444; }
.border-quality-仙, .grade-epic { border-color: #f59e0b !important; color: #f59e0b; }
.border-quality-天, .grade-rare { border-color: #8b5cf6 !important; color: #8b5cf6; }
.border-quality-地, .grade-uncommon { border-color: #3b82f6 !important; color: #3b82f6; }
.border-quality-人, .grade-common { border-color: #10b981 !important; color: #10b981; }
.border-quality-凡 { border-color: var(--color-border) !important; }

.text-quality-神 { color: #ef4444 !important; }
.text-quality-仙 { color: #f59e0b !important; }
.text-quality-天 { color: #8b5cf6 !important; }
.text-quality-地 { color: #3b82f6 !important; }
.text-quality-人 { color: #10b981 !important; }
.text-quality-凡 { color: var(--color-text) !important; }

/* 移动端适配 */
@media (max-width: 768px) {
  .tabs-header {
    padding: 12px;
  }
  
  .tools-section {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  
  .search-box {
    min-width: auto;
  }
  
  .filter-buttons {
    justify-content: space-between;
  }
  
  .filter-select {
    flex: 1;
  }
  
  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    padding: 12px;
    gap: 10px;
  }
  
  .item-card {
    padding: 10px;
    aspect-ratio: 0.85;
  }
  
  .item-name {
    font-size: 11px;
  }
  
  .currency-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }
  
  .currency-card {
    padding: 16px;
  }
  
  .currency-amount {
    font-size: 1.25rem;
  }
}

@media (max-width: 480px) {
  .tabs-nav {
    justify-content: center;
  }
  
  .tab-btn {
    flex: 1;
    justify-content: center;
  }
  
  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  }
  
  .currency-grid {
    grid-template-columns: 1fr;
  }
  
  .currency-card {
    padding: 14px;
  }
}

@media (min-width: 1200px) {
  .currency-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 20px;
  }
}
</style>