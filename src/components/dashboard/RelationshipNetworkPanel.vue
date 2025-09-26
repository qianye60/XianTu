<template>
  <div class="relationship-network-panel">
    <div class="panel-content">
      <!-- 人物关系列表 -->
      <div class="relationships-container">
        <!-- 左侧：人物列表 -->
        <div class="relationship-list">
          <div class="list-header">
            <h3 class="panel-title">江湖人脉</h3>
            <div class="search-bar">
              <Search :size="16" />
              <input 
                v-model="searchQuery" 
                placeholder="搜索人物..." 
                class="search-input"
              />
            </div>
          </div>

          <div class="list-content">
            <div v-if="isLoading" class="loading-state">
              <Loader2 :size="32" class="animate-spin" />
              <p>正在读取人际关系...</p>
            </div>
            <div v-else-if="filteredRelationships.length === 0" class="empty-state">
              <Users2 :size="48" class="empty-icon" />
              <p class="empty-text">尚未建立人际关系</p>
              <p class="empty-hint">在游戏中与更多人物互动建立关系</p>
            </div>
            <div v-else class="person-list">
              <div
                v-for="person in filteredRelationships"
                :key="person.角色基础信息.名字"
                class="person-card"
                :class="{ selected: selectedPerson?.角色基础信息.名字 === person.角色基础信息.名字 }"
                @click="selectPerson(person)"
              >
                <div class="person-avatar">
                  <span class="avatar-text">{{ person.角色基础信息.名字.charAt(0) }}</span>
                </div>

                <div class="person-info">
                  <div class="person-name">{{ person.角色基础信息.名字 }}</div>
                  <div class="person-meta">
                    <span class="relationship-type">{{ person.人物关系 || '相识' }}</span>
                  </div>
                  <div class="intimacy-info">
                    <div class="intimacy-bar">
                      <div 
                        class="intimacy-fill" 
                        :class="getIntimacyClass(person.人物好感度)"
                        :style="{ width: Math.max(5, Math.abs(person.人物好感度 || 0)) + '%' }"
                      ></div>
                    </div>
                    <span class="intimacy-value">{{ person.人物好感度 || 0 }}</span>
                  </div>
                </div>
                <ChevronRight :size="16" class="arrow-icon" />
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：人物详情 -->
        <div class="relationship-detail">
          <div v-if="selectedPerson" class="detail-content">
            <!-- 详情头部 -->
            <div class="detail-header">
              <div class="detail-avatar">
                <span class="avatar-text">{{ selectedPerson.角色基础信息.名字.charAt(0) }}</span>
              </div>
              <div class="detail-info">
                <h3 class="detail-name">{{ selectedPerson.角色基础信息.名字 }}</h3>
                <div class="detail-badges">
                  <span class="relationship-badge">{{ selectedPerson.人物关系 || '相识' }}</span>
                  <span class="intimacy-badge" :class="getIntimacyClass(selectedPerson.人物好感度)">
                    好感 {{ selectedPerson.人物好感度 || 0 }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 详情主体 -->
            <div class="detail-body">
              <!-- 基础信息 -->
              <div class="detail-section">
                <h5 class="section-title">基础信息</h5>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">性别</span>
                    <span class="info-value">{{ selectedPerson.角色基础信息.性别 || '未知' }}</span>
                  </div>
                  <div class="info-item" v-if="selectedPerson.角色基础信息.年龄">
                    <span class="info-label">年龄</span>
                    <span class="info-value">{{ selectedPerson.角色基础信息.年龄 }}岁</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">天资</span>
                    <span class="info-value">{{ selectedPerson.角色基础信息.天资 || '未知' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">灵根</span>
                    <span class="info-value">{{ formatSpiritRoot(selectedPerson.角色基础信息.灵根) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">出生</span>
                    <span class="info-value">{{ selectedPerson.角色基础信息.出生 || '未知' }}</span>
                  </div>
                  <div class="info-item" v-if="selectedPerson.角色基础信息.世界">
                    <span class="info-label">所在世界</span>
                    <span class="info-value">{{ selectedPerson.角色基础信息.世界 }}</span>
                  </div>
                </div>
                
                <!-- 天赋显示 -->
                <div v-if="selectedPerson.角色基础信息.天赋?.length" class="talents-section">
                  <h6 class="subsection-title">天赋能力</h6>
                  <div class="talents-grid">
                    <span 
                      v-for="talent in selectedPerson.角色基础信息.天赋" 
                      :key="talent" 
                      class="talent-tag"
                    >
                      {{ talent }}
                    </span>
                  </div>
                </div>
                
                <!-- 先天六司 -->
                <div v-if="selectedPerson.角色基础信息.先天六司" class="attributes-section">
                  <h6 class="subsection-title">先天六司</h6>
                  <div class="attributes-grid">
                    <div class="attribute-item">
                      <span class="attr-label">根骨</span>
                      <span class="attr-value">{{ selectedPerson.角色基础信息.先天六司.根骨 || 0 }}</span>
                    </div>
                    <div class="attribute-item">
                      <span class="attr-label">灵性</span>
                      <span class="attr-value">{{ selectedPerson.角色基础信息.先天六司.灵性 || 0 }}</span>
                    </div>
                    <div class="attribute-item">
                      <span class="attr-label">悟性</span>
                      <span class="attr-value">{{ selectedPerson.角色基础信息.先天六司.悟性 || 0 }}</span>
                    </div>
                    <div class="attribute-item">
                      <span class="attr-label">气运</span>
                      <span class="attr-value">{{ selectedPerson.角色基础信息.先天六司.气运 || 0 }}</span>
                    </div>
                    <div class="attribute-item">
                      <span class="attr-label">魅力</span>
                      <span class="attr-value">{{ selectedPerson.角色基础信息.先天六司.魅力 || 0 }}</span>
                    </div>
                    <div class="attribute-item">
                      <span class="attr-label">心性</span>
                      <span class="attr-value">{{ selectedPerson.角色基础信息.先天六司.心性 || 0 }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 外貌描述 -->
              <div class="detail-section" v-if="selectedPerson.外貌描述">
                <h5 class="section-title">外貌特征</h5>
                <div class="appearance-description">
                  <p class="description-text">{{ selectedPerson.外貌描述 }}</p>
                </div>
              </div>

              <!-- 人物记忆 -->
              <div class="detail-section" v-if="selectedPerson.人物记忆?.length">
                <div class="memory-header">
                  <h5 class="section-title">人物记忆</h5>
                  <div class="memory-count" v-if="totalMemoryPages > 1">
                    {{ selectedPerson.人物记忆.length }} 条记忆
                  </div>
                </div>
                
                <div class="memory-list">
                  <div 
                    v-for="(memory, index) in paginatedMemory" 
                    :key="index" 
                    class="memory-item"
                  >
                    <div class="memory-content">
                      <div class="memory-time">{{ getMemoryTime(memory) }}</div>
                      <div class="memory-event">{{ getMemoryEvent(memory) }}</div>
                    </div>
                    <div class="memory-actions">
                      <button class="memory-btn edit" @click="editMemory((currentMemoryPage - 1) * memoryPageSize + index)">编辑</button>
                      <button class="memory-btn delete" @click="deleteMemory((currentMemoryPage - 1) * memoryPageSize + index)">删除</button>
                    </div>
                  </div>
                </div>
                
                <!-- 分页控件 -->
                <div class="memory-pagination" v-if="totalMemoryPages > 1">
                  <button 
                    class="pagination-btn"
                    :disabled="currentMemoryPage <= 1"
                    @click="goToMemoryPage(currentMemoryPage - 1)"
                  >
                    上一页
                  </button>
                  
                  <div class="pagination-info">
                    {{ currentMemoryPage }} / {{ totalMemoryPages }}
                  </div>
                  
                  <button 
                    class="pagination-btn"
                    :disabled="currentMemoryPage >= totalMemoryPages"
                    @click="goToMemoryPage(currentMemoryPage + 1)"
                  >
                    下一页
                  </button>
                </div>
              </div>
              <!-- NPC背包物品 -->
              <div class="detail-section">
                <h5 class="section-title">随身物品</h5>
                <div class="npc-inventory">
                  <div class="inventory-note">
                    <Info :size="14" />
                    <span>商人或重要人物可能携带物品进行交易</span>
                  </div>
                  <div v-if="hasNpcItems(selectedPerson)" class="npc-items-grid">
                    <div
                      v-for="(item, itemId) in selectedPerson.背包.物品"
                      :key="itemId"
                      class="npc-item-card"
                      :class="getItemQualityClass(item.品质?.quality)"
                    >
                      <div class="item-header">
                        <span class="item-name">{{ item.名称 || itemId }}</span>
                        <span class="item-type">{{ item.类型 || '其他' }}</span>
                      </div>
                      <div class="item-quality" v-if="item.品质">
                        <span class="quality-text">{{ item.品质?.quality || '未知' }}{{ item.品质?.grade ? getGradeText(item.品质.grade) : '' }}</span>
                      </div>
                      <div class="item-quantity" v-if="item.数量 > 1">
                        <span>x{{ item.数量 }}</span>
                      </div>
                      <div class="item-description" v-if="item.描述">
                        <p>{{ item.描述 }}</p>
                      </div>
                      <div class="item-actions">
                        <button 
                          class="trade-btn" 
                          @click="initiateTradeWithNpc(selectedPerson, item)"
                          title="尝试交易此物品"
                        >
                          <ArrowRightLeft :size="12" />
                          交易
                        </button>
                        <button 
                          class="request-btn" 
                          @click="requestItemFromNpc(selectedPerson, item)"
                          title="请求获得此物品"
                        >
                          🙏
                          索要
                        </button>
                        <button 
                          class="steal-btn" 
                          @click="attemptStealFromNpc(selectedPerson, item)"
                          title="尝试偷取此物品"
                        >
                          🥷
                          偷窃
                        </button>
                      </div>
                    </div>
                  </div>
                  <div v-else class="empty-inventory">
                    <Package :size="24" class="empty-icon" />
                    <p>此人身上没有物品</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="no-selection">
            <Users2 :size="64" class="placeholder-icon" />
            <p class="placeholder-text">选择一个人物查看详细信息</p>
            <p class="placeholder-hint">在游戏中与人物互动会建立关系记录</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCharacterStore } from '@/stores/characterStore';
import { useActionQueueStore } from '@/stores/actionQueueStore';
import type { NpcProfile, Item, NpcMemoryItem } from '@/types/game';
import {
  Users2, Search,
  Loader2, ChevronRight, Info, Package, ArrowRightLeft
} from 'lucide-vue-next';
import { toast } from '@/utils/toast';

const characterStore = useCharacterStore();
const actionQueue = useActionQueueStore();
const isLoading = ref(false);
const selectedPerson = ref<NpcProfile | null>(null);
const searchQuery = ref('');

// 记忆分页相关
const memoryPageSize = ref(5); // 每页显示的记忆数量
const currentMemoryPage = ref(1); // 当前页码

// 计算分页后的记忆
const paginatedMemory = computed(() => {
  if (!selectedPerson.value?.人物记忆?.length) return [];
  
  const memories = selectedPerson.value.人物记忆;
  const startIndex = (currentMemoryPage.value - 1) * memoryPageSize.value;
  const endIndex = startIndex + memoryPageSize.value;
  
  return memories.slice(startIndex, endIndex);
});

// 计算总页数
const totalMemoryPages = computed(() => {
  if (!selectedPerson.value?.人物记忆?.length) return 0;
  return Math.ceil(selectedPerson.value.人物记忆.length / memoryPageSize.value);
});

// 切换记忆页面
const goToMemoryPage = (page: number) => {
  if (page >= 1 && page <= totalMemoryPages.value) {
    currentMemoryPage.value = page;
  }
};

// 重置分页状态当选择新人物时
const resetMemoryPagination = () => {
  currentMemoryPage.value = 1;
};

// 获取记忆时间，兼容新旧格式
const getMemoryTime = (memory: any): string => {
  if (typeof memory === 'string') {
    return '未知时间';
  } else if (memory && typeof memory === 'object') {
    return memory.时间 || '未知时间';
  }
  return '未知时间';
};

// 获取记忆事件，兼容新旧格式
const getMemoryEvent = (memory: any): string => {
  if (typeof memory === 'string') {
    return memory;
  } else if (memory && typeof memory === 'object') {
    return memory.事件 || '';
  }
  return '';
};

// 格式化灵根显示
const formatSpiritRoot = (spiritRoot: NpcProfile['角色基础信息']['灵根']): string => {
  if (!spiritRoot) return '未知';
  if (typeof spiritRoot === 'string') return spiritRoot;
  if (typeof spiritRoot === 'object') {
    return `${spiritRoot.名称}(${spiritRoot.品质})`;
  }
  return '未知';
};

const relationships = computed(() => {
  const saveData = characterStore.activeSaveSlot?.存档数据;
  if (!saveData?.人物关系) return [];
  // 仅保留有效NPC：键不以下划线开头，值是对象且包含角色基础信息
  return Object.values(saveData.人物关系)
    .filter(val => val && typeof val === 'object' && val.角色基础信息);
});

// 过滤后的关系列表（只保留搜索功能）
const filteredRelationships = computed(() => {
  let filtered = [...relationships.value];

  // 搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(person => 
      person.角色基础信息.名字.toLowerCase().includes(query) ||
      (person.人物关系 || '').toLowerCase().includes(query)
    );
  }

  // 按好感度排序
  return filtered.sort((a, b) => (b.人物好感度 || 0) - (a.人物好感度 || 0));
});

// 工具函数
const getIntimacyLevel = (intimacy: number | undefined): string => {
  const value = intimacy || 0;
  if (value >= 80) return 'high';
  if (value >= 60) return 'good';
  if (value >= 40) return 'medium';
  if (value >= 20) return 'low';
  if (value >= 0) return 'neutral';
  if (value >= -20) return 'dislike';
  if (value >= -40) return 'hostile';
  return 'enemy';
};

const getIntimacyClass = (intimacy: number | undefined): string => {
  return `intimacy-${getIntimacyLevel(intimacy)}`;
};

const selectPerson = (person: NpcProfile) => {
  const isNewSelection = selectedPerson.value?.角色基础信息.名字 !== person.角色基础信息.名字;
  selectedPerson.value = selectedPerson.value?.角色基础信息.名字 === person.角色基础信息.名字 
    ? null 
    : person;
  
  // 如果选择了新的人物，重置记忆分页
  if (isNewSelection && selectedPerson.value) {
    resetMemoryPagination();
  }
};

onMounted(async () => {
  console.log('[人脉系统] 江湖人脉面板已载入，开始同步数据');
  isLoading.value = true;
  try {
    await characterStore.syncFromTavern();
    // 默认选择第一个人物
    if (filteredRelationships.value.length > 0) {
      selectedPerson.value = filteredRelationships.value[0];
    }
  } catch (error) {
    console.error('[人脉系统] 同步数据失败:', error);
    toast.error('人脉数据同步失败');
  } finally {
    isLoading.value = false;
  }
});
// -- 记忆编辑与删除 --
const findRelationshipKeyByName = (name: string): string | null => {
  const saveData = characterStore.activeSaveSlot?.存档数据;
  if (!saveData?.人物关系) return null;
  return Object.keys(saveData.人物关系).find(key => saveData.人物关系[key]?.角色基础信息?.名字 === name) || null;
};

const editMemory = async (index: number) => {
  if (!selectedPerson.value) return;
  const name = selectedPerson.value.角色基础信息.名字;
  const key = findRelationshipKeyByName(name);
  if (!key) return;
  const saveData = characterStore.activeSaveSlot?.存档数据;
  if (!saveData?.人物关系?.[key]?.人物记忆) return;
  
  const current = saveData.人物关系[key].人物记忆[index];
  
  // 支持旧格式（字符串）和新格式（对象）
  let currentTime = '';
  let currentEvent = '';
  
  if (typeof current === 'string') {
    currentEvent = current;
    currentTime = '未知时间';
  } else if (current && typeof current === 'object') {
    currentTime = current.时间 || '未知时间';
    currentEvent = current.事件 || '';
  }
  
  const newTime = window.prompt('编辑记忆时间', currentTime);
  if (newTime === null) return;
  
  const newEvent = window.prompt('编辑记忆事件', currentEvent);
  if (newEvent === null) return;
  
  saveData.人物关系[key].人物记忆[index] = {
    时间: newTime.trim(),
    事件: newEvent.trim()
    // 注意：不再保存指令数据，只保留时间和事件
  };
  
  selectedPerson.value = { ...saveData.人物关系[key] };
  await characterStore.commitToStorage();
};

import { useUIStore } from '@/stores/uiStore';
const uiStore = useUIStore();
const deleteMemory = async (index: number) => {
  if (!selectedPerson.value) return;
  uiStore.showRetryDialog({
    title: '删除记忆',
    message: '确定要删除这条记忆吗？',
    confirmText: '删除',
    cancelText: '取消',
    onConfirm: async () => {
      const name = selectedPerson.value!.角色基础信息.名字;
      const key = findRelationshipKeyByName(name);
      if (!key) return;
      const saveData = characterStore.activeSaveSlot?.存档数据;
      if (!saveData?.人物关系?.[key]?.人物记忆) return;
      saveData.人物关系[key].人物记忆.splice(index, 1);
      selectedPerson.value = { ...saveData.人物关系[key] };
      await characterStore.commitToStorage();
    },
    onCancel: () => {}
  });
};

// NPC物品相关函数
const hasNpcItems = (person: NpcProfile): boolean => {
  const items = person.背包?.物品;
  return items ? Object.keys(items).length > 0 : false;
};

const getItemQualityClass = (quality?: string): string => {
  if (!quality) return 'quality-unknown';
  return `quality-${quality.toLowerCase()}`;
};

const getGradeText = (grade?: number): string => {
  if (grade === undefined || grade === null) return '';
  if (grade === 0) return '残缺';
  if (grade >= 1 && grade <= 3) return '下品';
  if (grade >= 4 && grade <= 6) return '中品';  
  if (grade >= 7 && grade <= 9) return '上品';
  if (grade === 10) return '极品';
  return '';
};

const initiateTradeWithNpc = (npc: NpcProfile, item: Item) => {
  // NPC交互类操作只能加入队列等待AI响应，不能直接执行
  const actionDescription = `尝试与 ${npc.角色基础信息.名字} 交易 ${item.名称}`;
  
  // 添加到动作队列，等待AI处理
  actionQueue.addAction({
    type: 'npc_trade',
    itemName: item.名称,
    itemType: 'NPC交易',
    description: actionDescription,
    // NPC交互的额外数据
    npcName: npc.角色基础信息.名字,
    itemId: item.物品ID || item.名称,
    tradeType: 'trade' // 交易类型
  });
  
  toast.success(`已将与 ${npc.角色基础信息.名字} 的交易请求加入动作队列`);
  console.log('已排队NPC交易:', { npc: npc.角色基础信息.名字, item: item.名称, type: 'trade' });
};

// 向NPC索要物品
const requestItemFromNpc = (npc: NpcProfile, item: Item) => {
  const actionDescription = `向 ${npc.角色基础信息.名字} 索要 ${item.名称}`;
  
  // 添加到动作队列，等待AI处理
  actionQueue.addAction({
    type: 'npc_request',
    itemName: item.名称,
    itemType: 'NPC索要',
    description: actionDescription,
    // NPC交互的额外数据
    npcName: npc.角色基础信息.名字,
    itemId: item.物品ID || item.名称,
    tradeType: 'request' // 索要类型
  });
  
  toast.success(`已将向 ${npc.角色基础信息.名字} 索要物品的请求加入动作队列`);
  console.log('已排队NPC索要:', { npc: npc.角色基础信息.名字, item: item.名称, type: 'request' });
};

// 尝试从NPC身上偷窃物品
const attemptStealFromNpc = (npc: NpcProfile, item: Item) => {
  const actionDescription = `尝试从 ${npc.角色基础信息.名字} 身上偷取 ${item.名称}`;
  
  // 添加到动作队列，等待AI处理
  actionQueue.addAction({
    type: 'npc_steal',
    itemName: item.名称,
    itemType: 'NPC偷窃',
    description: actionDescription,
    // NPC交互的额外数据
    npcName: npc.角色基础信息.名字,
    itemId: item.物品ID || item.名称,
    tradeType: 'steal' // 偷窃类型
  });
  
  toast.success(`已将偷窃 ${npc.角色基础信息.名字} 物品的计划加入动作队列`);
  console.log('已排队NPC偷窃:', { npc: npc.角色基础信息.名字, item: item.名称, type: 'steal' });
};

</script>

<style scoped>
.relationship-network-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
}

.panel-content {
  flex: 1;
  overflow: hidden;
}

.relationships-container {
  height: 100%;
  display: flex;
  background: var(--color-surface);
  overflow: hidden;
}

.relationship-list {
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

.person-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.person-card {
  display: flex;
  align-items: center;
  padding: 0.75rem; /* 更紧凑 */
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.person-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}

.person-card.selected {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.person-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: white;
  margin-right: 0.75rem;
  flex-shrink: 0;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.avatar-text {
  font-size: 1.2rem;
}

.person-info {
  flex: 1;
  min-width: 0;
}

.person-name {
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.person-meta {
  margin-bottom: 0.5rem;
}

.relationship-type {
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-primary);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.intimacy-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.intimacy-bar {
  flex: 1;
  height: 4px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.intimacy-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.intimacy-high { background: linear-gradient(90deg, #22c55e, #16a34a); }
.intimacy-good { background: linear-gradient(90deg, #3b82f6, #1d4ed8); }
.intimacy-medium { background: linear-gradient(90deg, #8b5cf6, #7c3aed); }
.intimacy-low { background: linear-gradient(90deg, #f59e0b, #d97706); }
.intimacy-neutral { background: linear-gradient(90deg, #6b7280, #4b5563); }
.intimacy-dislike { background: linear-gradient(90deg, #f97316, #ea580c); }
.intimacy-hostile { background: linear-gradient(90deg, #dc2626, #b91c1c); }
.intimacy-enemy { background: linear-gradient(90deg, #ef4444, #dc2626); }

.intimacy-value {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  min-width: 30px;
  text-align: right;
}

.arrow-icon {
  color: var(--color-border-hover);
  transition: transform 0.2s;
}

.person-card.selected .arrow-icon {
  transform: rotate(90deg);
  color: var(--color-primary);
}

.relationship-detail {
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

.detail-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: white;
  font-size: 1.5rem;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
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

.relationship-badge, .intimacy-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.relationship-badge {
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-primary);
}

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

.memory-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.memory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.memory-header .section-title {
  margin: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.memory-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: rgba(59, 130, 246, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
}

.memory-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-top: 1px solid var(--color-border);
  margin-top: 0.5rem;
}

.pagination-btn {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--color-surface);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  min-width: 60px;
  text-align: center;
}

.memory-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 0.75rem;
  background: var(--color-surface);
  border-radius: 6px;
  border-left: 3px solid var(--color-primary);
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--color-text-secondary);
}

.memory-content { 
  flex: 1; 
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.memory-time {
  font-size: 0.75rem;
  color: var(--color-primary);
  font-weight: 600;
  opacity: 0.8;
}

.memory-event {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  line-height: 1.5;
}

.memory-actions { display: flex; gap: 6px; }

.memory-btn {
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  background: var(--color-background);
}
.memory-btn.edit { color: #2563eb; border-color: #bfdbfe; }
.memory-btn.delete { color: #dc2626; border-color: #fecaca; }

/* 简化：外貌描述样式 */
.appearance-description {
  padding: 1rem;
  background: rgba(147, 51, 234, 0.05);
  border-radius: 8px;
  border-left: 3px solid #9333ea;
}

.description-text {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-text);
  margin: 0;
  font-style: italic;
}

/* 天赋和属性样式 */
.talents-section, .attributes-section {
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(59, 130, 246, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.1);
}

.subsection-title {
  margin: 0 0 0.75rem 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.talents-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.talent-tag {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1));
  color: #3b82f6;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.attributes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.attribute-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  background: var(--color-surface);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.attr-label {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.attr-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-primary);
}

/* NPC物品样式 */
.npc-inventory {
  margin-top: 0.75rem;
}

.inventory-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.8rem;
  color: #3b82f6;
}

.npc-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 0.75rem;
}

.npc-item-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem;
  transition: all 0.2s ease;
}

.npc-item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.npc-item-card.quality-凡 {
  border-left: 3px solid #6b7280;
}

.npc-item-card.quality-黄 {
  border-left: 3px solid #f59e0b;
}

.npc-item-card.quality-玄 {
  border-left: 3px solid #8b5cf6;
}

.npc-item-card.quality-地 {
  border-left: 3px solid #06b6d4;
}

.npc-item-card.quality-天 {
  border-left: 3px solid #ec4899;
}

.npc-item-card.quality-仙 {
  border-left: 3px solid #f59e0b;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
}

.npc-item-card.quality-神 {
  border-left: 3px solid #9333ea;
  box-shadow: 0 0 15px rgba(147, 51, 234, 0.4);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.item-name {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.9rem;
}

.item-type {
  background: var(--color-surface);
  color: var(--color-text-secondary);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
}

.item-quality {
  margin-bottom: 0.5rem;
}

.quality-text {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.item-quantity {
  text-align: right;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
  /* 使用主题主色，增强与卡片背景的对比度 */
  color: var(--color-primary);
  font-weight: 700;
}

.item-description {
  margin-bottom: 0.75rem;
}

.item-description p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.item-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.trade-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: linear-gradient(135deg, #059669, #047857);
  color: white;
  border: none;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.trade-btn:hover {
  background: linear-gradient(135deg, #047857, #065f46);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);
}

.trade-btn:active {
  transform: translateY(0);
}

.request-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.request-btn:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.request-btn:active {
  transform: translateY(0);
}

.steal-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: white;
  border: none;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.steal-btn:hover {
  background: linear-gradient(135deg, #b91c1c, #991b1b);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
}

.steal-btn:active {
  transform: translateY(0);
}

.empty-inventory {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-inventory .empty-icon {
  margin-bottom: 0.75rem;
  opacity: 0.5;
}

/* 互动统计样式 */
.interaction-stats {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgba(var(--color-success-rgb), 0.05);
  border-radius: 6px;
  border: 1px solid rgba(var(--color-success-rgb), 0.1);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.stat-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.special-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.special-tag {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1));
  color: #22c55e;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  border: 1px solid rgba(34, 197, 94, 0.2);
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

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .relationship-network-panel {
    padding: 0;
  }

  .panel-content {
    padding: 0;
  }

  .relationships-container {
    flex-direction: column;
    border-radius: 0;
    border: none;
  }
  
  .relationship-list {
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

  .person-card {
    padding: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .person-avatar {
    width: 40px;
    height: 40px;
    margin-right: 0.6rem;
  }

  .avatar-text {
    font-size: 1rem;
  }

  .person-name {
    font-size: 0.95rem;
    margin-bottom: 0.4rem;
  }

  .relationship-type {
    font-size: 0.7rem;
    padding: 1px 6px;
  }

  .intimacy-value {
    font-size: 0.7rem;
    min-width: 25px;
  }

  .relationship-detail {
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
    gap: 0.5rem;
  }

  .detail-avatar {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }

  .detail-name {
    font-size: 1rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .info-item {
    padding: 0.4rem 0.6rem;
    background: var(--color-surface-light);
    border-radius: 4px;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .info-label {
    font-size: 0.8rem;
    margin-bottom: 0;
  }

  .info-value {
    font-size: 0.85rem;
  }

  .talents-section, .attributes-section {
    margin-top: 1rem;
    padding: 0.75rem;
  }

  .subsection-title {
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
  }

  .attributes-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .attribute-item {
    padding: 0.4rem;
  }

  .attr-label {
    font-size: 0.65rem;
  }

  .attr-value {
    font-size: 0.9rem;
  }

  .talent-tag {
    font-size: 0.7rem;
    padding: 0.2rem 0.4rem;
  }

  .memory-list.scrollable {
    max-height: 150px;
  }

  .memory-item {
    padding: 0.6rem;
    font-size: 0.8rem;
  }

  .memory-btn {
    padding: 3px 6px;
    font-size: 11px;
  }

  .detail-section {
    padding: 0.75rem;
    margin-bottom: 1rem;
  }

  .section-title {
    font-size: 0.85rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.4rem;
  }

  .appearance-description {
    padding: 0.75rem;
  }

  .description-text {
    font-size: 0.8rem;
    line-height: 1.5;
  }

  .interaction-stats {
    gap: 0.75rem;
  }

  .stat-item {
    padding: 0.6rem;
  }

  .stat-label {
    font-size: 0.8rem;
  }

  .stat-value {
    font-size: 0.8rem;
  }

  .special-tag {
    font-size: 0.65rem;
    padding: 0.15rem 0.35rem;
  }
}
</style>
