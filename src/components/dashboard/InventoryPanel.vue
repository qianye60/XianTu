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
          <span>{{ t(tab.label) }}</span>
        </button>
      </div>

      <!-- 搜索和筛选区域 -->
      <div class="tools-section" v-if="activeTab === 'items'">
        <div class="search-box">
          <Search :size="16" class="search-icon" />
          <input
            type="text"
            v-model="searchQuery"
            :placeholder="isMobile ? t('搜索...') : t('搜索物品...')"
          />
        </div>
        <div class="filter-buttons">
          <select v-model="selectedCategory" class="filter-select">
            <option value="all">{{ t('全部物品') }}</option>
            <option v-for="cat in itemCategories" :key="cat" :value="cat">
              {{ t(cat) }}
            </option>
          </select>
          <select v-model="sortBy" class="filter-select">
            <option value="default">{{ t('默认排序') }}</option>
            <option value="quality">{{ t('品质排序') }}</option>
            <option value="name">{{ t('名称排序') }}</option>
          </select>
          <button
            v-if="isTavernEnvFlag"
            class="refresh-btn"
            @click="refreshFromTavern"
            :disabled="refreshing"
            :title="t('从酒馆同步最新数据')"
          >
            <RotateCcw :size="16" :class="{ spinning: refreshing }" />
          </button>
        </div>
      </div>
    </div>

    <!-- 标签内容 -->
    <div class="tab-content">
      <!-- 物品标签 -->
      <div v-if="activeTab === 'items'" class="items-tab">
        <!-- 自定义确认弹窗 -->
        <div
          v-if="showCustomConfirm"
          class="custom-confirm-overlay"
          @click="showCustomConfirm = false"
        >
          <div class="custom-confirm-modal" @click.stop>
            <div class="confirm-header">
              <h3>{{ confirmTitle }}</h3>
              <button class="confirm-close-btn" @click="showCustomConfirm = false">
                <X :size="20" />
              </button>
            </div>
            <div class="confirm-content">
              <p>{{ confirmMessage }}</p>
            </div>
            <div class="confirm-actions">
              <button class="confirm-btn cancel-btn" @click="showCustomConfirm = false">
                {{ t('取消') }}
              </button>
              <button class="confirm-btn confirm-btn" @click="handleConfirm">{{ t('确定') }}</button>
            </div>
          </div>
        </div>

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
                <div class="modal-meta">
                  {{ t(selectedItem?.类型 ?? '未知') }} / {{ selectedItem?.品质?.quality ? t(selectedItem.品质.quality) : t('未知') }}
                  <span
                    v-if="selectedItem?.品质?.grade !== undefined"
                    class="grade-display"
                    :class="getGradeClass(selectedItem.品质.grade)"
                  >
                    {{ t(getGradeText(selectedItem.品质.grade)) }}({{ selectedItem.品质.grade }})
                  </span>
                </div>
                <p class="modal-description">{{ selectedItem?.描述 }}</p>
                <div
                  v-if="selectedItem?.类型 === '装备' && selectedItem?.装备增幅"
                  class="modal-attributes"
                >
                  <h4>{{ t('装备增幅:') }}</h4>
                  <div class="attribute-text">
                    {{ typeof selectedItem.装备增幅 === 'string' ? selectedItem.装备增幅 : formatItemAttributes(selectedItem.装备增幅) }}
                  </div>
                </div>
                <div
                  v-if="selectedItem?.类型 === '装备' && selectedItem?.特殊效果"
                  class="modal-attributes"
                >
                  <h4>{{ t('特殊效果:') }}</h4>
                  <div class="attribute-text">
                    {{ typeof selectedItem.特殊效果 === 'string' ? selectedItem.特殊效果 : formatItemAttributes(selectedItem.特殊效果) }}
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-actions">
              <!-- 装备：装备和丢弃 -->
              <template v-if="selectedItem?.类型 === '装备'">
                <button
                  class="action-btn"
                  :class="isEquipped(selectedItem) ? 'unequip-btn' : 'equip-btn'"
                  :disabled="equipBusy"
                  @click="toggleEquip(selectedItem)"
                >
                  {{ isEquipped(selectedItem) ? t('卸下') : t('装备') }}
                </button>
                <button class="action-btn discard-btn" @click="discardItem(selectedItem)">
                  {{ t('丢弃') }}
                </button>
              </template>
              <!-- 功法：修炼和丢弃 -->
              <template v-else-if="selectedItem?.类型 === '功法'">
                <button
                  class="action-btn"
                  :class="isCultivating(selectedItem) ? 'stop-cultivate-btn' : 'cultivate-btn'"
                  :disabled="cultivateBusy"
                  @click="toggleCultivate(selectedItem)"
                >
                  {{ isCultivating(selectedItem) ? t('停止修炼') : t('修炼') }}
                </button>
                <button class="action-btn discard-btn" @click="discardItem(selectedItem)">
                  {{ t('丢弃') }}
                </button>
              </template>
              <!-- 其他物品：使用和丢弃 -->
              <template v-else-if="selectedItem">
                <button class="action-btn use-btn" @click="useItem(selectedItem)">{{ t('使用') }}</button>
                <button class="action-btn discard-btn" @click="discardItem(selectedItem)">
                  {{ t('丢弃') }}
                </button>
              </template>
            </div>
          </div>
        </div>

        <div class="items-grid">
          <div v-if="loading" class="grid-placeholder">
            <div class="loading-spinner"></div>
            <p>{{ t('加载中...') }}</p>
          </div>
          <div v-else-if="filteredItems.length === 0" class="grid-placeholder">
            <BoxSelect :size="48" />
            <p v-if="selectedCategory === 'all'">{{ t('空空如也') }}</p>
            <p v-else-if="selectedCategory === '装备'">{{ t('暂无装备') }}</p>
            <p v-else-if="selectedCategory === '功法'">{{ t('暂无功法') }}</p>
            <p v-else-if="selectedCategory === '其他'">{{ t('暂无其他物品') }}</p>
            <p v-else>{{ t('暂无{0}').replace('{0}', t(selectedCategory)) }}</p>
            <span v-if="selectedCategory !== 'all'" class="filter-tip"> {{ t('可以试试搜索其他分类') }} </span>
          </div>
          <div
            v-else
            v-for="item in filteredItems"
            :key="item.物品ID"
            class="item-card"
            :class="getItemQualityClass(item, 'card')"
            @click="selectItem(item)"
          >
            <!-- 物品图标和品质 -->
            <div class="item-top-section">
              <div class="item-icon-area" :class="getItemQualityClass(item, 'border')">
                <div class="item-type-icon">{{ getItemTypeIcon(item.类型) }}</div>
                <div class="item-quality-badge" :class="getItemQualityClass(item, 'text')">
                  {{ item.品质?.quality ? t(item.品质.quality) : t('未知') }}
                </div>
              </div>
            </div>

            <!-- 数量显示 -->
            <div v-if="item.数量 > 1" class="item-quantity-display">×{{ item.数量 }}</div>

            <!-- 物品名称 -->
            <div class="item-name-section">
              <div class="item-name" :title="item.名称">{{ item.名称 }}</div>
            </div>

            <!-- 底部信息：类型和品级 -->
            <div class="item-bottom-section">
              <div class="item-type-label">{{ t(item.类型) }}</div>
              <div
                v-if="item.品质?.grade !== undefined"
                class="item-grade-info"
                :class="getGradeClass(item.品质.grade)"
              >
                {{ t(getGradeText(item.品质.grade)) }}({{ item.品质.grade }})
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
                <h3>{{ selectedItem.名称 }}</h3>
                <div class="details-meta">
                  {{ t(selectedItem.类型) }} / {{ selectedItem.品质?.quality ? t(selectedItem.品质.quality) : t('未知') }}
                  <span
                    v-if="selectedItem.品质?.grade !== undefined"
                    class="grade-display"
                    :class="getGradeClass(selectedItem.品质.grade)"
                  >
                    {{ t(getGradeText(selectedItem.品质.grade)) }}({{ selectedItem.品质.grade }})
                  </span>
                </div>
              </div>
            </div>
            <div class="details-body">
              <p class="details-description">{{ selectedItem.描述 }}</p>

              <!-- 功法特有属性 -->
              <template v-if="selectedItem.类型 === '功法'">
                <!-- 功法效果 -->
                <div v-if="selectedItem.功法效果" class="details-attributes">
                  <h4>{{ t('功法效果:') }}</h4>
                  <div class="attribute-text">
                    {{ typeof selectedItem.功法效果 === 'string' ? selectedItem.功法效果 : JSON.stringify(selectedItem.功法效果) }}
                  </div>
                </div>

                <!-- 功法技能 -->
                <div
                  v-if="selectedItem.功法技能 && Array.isArray(selectedItem.功法技能) && selectedItem.功法技能.length > 0"
                  class="details-attributes"
                >
                  <h4>{{ t('功法技能:') }}</h4>
                  <div class="technique-skills">
                    <div
                      v-for="(skill, index) in selectedItem.功法技能"
                      :key="index"
                      class="skill-item"
                    >
                      <div class="skill-header">
                        <span class="skill-name">{{ skill.技能名称 }}</span>
                        <span v-if="skill.解锁需要熟练度" class="skill-unlock-requirement">
                          {{ t('需要:') }} {{ skill.解锁需要熟练度 }}%
                        </span>
                      </div>
                      <div class="skill-description">{{ skill.技能描述 }}</div>
                      <div v-if="skill.消耗" class="skill-cost">{{ t('消耗:') }} {{ skill.消耗 }}</div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- 装备装备增幅 -->
              <div
                v-if="selectedItem.类型 === '装备' && selectedItem.装备增幅"
                class="details-attributes"
              >
                <h4>{{ t('装备增幅:') }}</h4>
                <div class="attribute-text">{{ typeof selectedItem.装备增幅 === 'string' ? selectedItem.装备增幅 : formatItemAttributes(selectedItem.装备增幅) }}</div>
              </div>

              <!-- 装备特殊效果 -->
              <div
                v-if="selectedItem.类型 === '装备' && selectedItem.特殊效果"
                class="details-attributes"
              >
                <h4>{{ t('特殊效果:') }}</h4>
                <div class="attribute-text">{{ typeof selectedItem.特殊效果 === 'string' ? selectedItem.特殊效果 : formatItemAttributes(selectedItem.特殊效果) }}</div>
              </div>
            </div>
            <div class="details-actions">
              <!-- 装备：装备和丢弃 -->
              <template v-if="selectedItem?.类型 === '装备'">
                <button
                  class="action-btn"
                  :class="isEquipped(selectedItem) ? 'unequip-btn' : 'equip-btn'"
                  :disabled="equipBusy"
                  @click="toggleEquip(selectedItem)"
                >
                  {{ isEquipped(selectedItem) ? t('卸下') : t('装备') }}
                </button>
                <button class="action-btn discard-btn" @click="discardItem(selectedItem)">
                  {{ t('丢弃') }}
                </button>
              </template>
              <!-- 功法：修炼和丢弃 -->
              <template v-else-if="selectedItem?.类型 === '功法'">
                <button
                  class="action-btn"
                  :class="isCultivating(selectedItem) ? 'stop-cultivate-btn' : 'cultivate-btn'"
                  :disabled="cultivateBusy"
                  @click="toggleCultivate(selectedItem)"
                >
                  {{ isCultivating(selectedItem) ? t('停止修炼') : t('修炼') }}
                </button>
                <button class="action-btn discard-btn" @click="discardItem(selectedItem)">
                  {{ t('丢弃') }}
                </button>
              </template>
              <!-- 其他物品：使用和丢弃 -->
              <template v-else>
                <button class="action-btn use-btn" @click="useItem(selectedItem!)">{{ t('使用') }}</button>
                <button class="action-btn discard-btn" @click="discardItem(selectedItem!)">
                  {{ t('丢弃') }}
                </button>
              </template>
            </div>
          </div>
          <div v-else class="details-placeholder">
            <BoxSelect :size="48" />
            <p>{{ t('选择物品查看详情') }}</p>
          </div>
        </div>
      </div>

      <!-- 装备标签 -->
      <div v-if="activeTab === 'equipment'" class="equipment-tab">
        <div class="equipment-content">
          <div class="equipment-grid">
            <div
              v-for="(slot, index) in equipmentSlots"
              :key="index"
              class="equipment-slot"
              :class="{ 'has-equipment': slot.item, 'empty-slot': !slot.item }"
            >
              <div class="slot-header">
                <div class="slot-name">{{ slot.name }}</div>
                <div v-if="slot.item" class="slot-actions">
                  <button
                    class="action-btn unequip-btn"
                    :disabled="equipBusy"
                    @click="unequipItem(slot)"
                    :title="t('卸下装备')"
                  >
                    <X :size="12" />
                  </button>
                </div>
              </div>

              <div v-if="slot.item" class="equipment-item" :class="getItemQualityClass(slot.item)">
                <div class="item-icon" :class="getItemQualityClass(slot.item, 'border')">
                  <div class="item-type-text">{{ t('装备') }}</div>
                </div>
                <div class="item-info">
                  <div
                    class="item-name"
                    :class="getItemQualityClass(slot.item, 'text')"
                    :title="slot.item.名称"
                  >
                    {{ slot.item.名称 }}
                  </div>
                  <div class="item-quality">
                    {{ slot.item.品质?.quality ? t(slot.item.品质.quality) : '？' }}{{t('品')}}
                    <span
                      v-if="slot.item.品质?.grade !== undefined"
                      class="item-grade"
                      :class="getGradeClass(slot.item.品质.grade)"
                    >
                      {{ t(getGradeText(slot.item.品质.grade)) }}({{ slot.item.品质.grade }})
                    </span>
                  </div>
                  <div v-if="slot.item.描述" class="item-description" :title="slot.item.描述">
                    {{ slot.item.描述 }}
                  </div>
                  <div v-if="slot.item.类型 === '装备' && slot.item.装备增幅" class="item-effects">
                    <div class="effects-title">{{ t('增幅效果：') }}</div>
                    <div class="effects-text">{{ typeof slot.item.装备增幅 === 'string' ? slot.item.装备增幅 : formatItemAttributes(slot.item.装备增幅) }}</div>
                  </div>
                  <div v-if="slot.item.类型 === '装备' && slot.item.特殊效果" class="item-effects">
                    <div class="effects-title">{{ t('特殊效果：') }}</div>
                    <div class="effects-text">{{ typeof slot.item.特殊效果 === 'string' ? slot.item.特殊效果 : formatItemAttributes(slot.item.特殊效果) }}</div>
                  </div>
                </div>
              </div>

              <div v-else class="empty-equipment-slot">
                <div class="empty-icon">
                  <Package :size="24" />
                </div>
                <div class="empty-text">{{ t('空槽位') }}</div>
                <div class="empty-hint">{{ t('可装备装备') }}</div>
              </div>
            </div>
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
              <div class="currency-icon" :class="`icon-${grade.colorClass}`">
                <Gem :size="isMobile ? 32 : 40" />
              </div>
              <div class="currency-info">
                <div class="currency-amount">{{ (gameStateStore.inventory?.灵石?.[grade.name] || 0) }}</div>
                <div class="currency-label">{{ t(grade.name) }}{{t('灵石')}}</div>
              </div>
            </div>
            <div v-if="grade.canExchange || grade.canExchangeDown" class="currency-exchange">
              <button
                v-if="grade.canExchange"
                class="exchange-btn"
                @click="handleExchange(grade.name, 'up')"
                :disabled="((gameStateStore.inventory?.灵石?.[grade.name] || 0) < 100)"
                :title="t('兑换为{0}灵石 (100:1)').replace('{0}', t(grade.exchangeUp))"
              >
                {{ t('↑ 兑换') }}
              </button>
              <button
                v-if="grade.canExchangeDown"
                class="exchange-btn down"
                @click="handleExchange(grade.name, 'down')"
                :disabled="((gameStateStore.inventory?.灵石?.[grade.name] || 0) < 1)"
                :title="t('分解为{0}灵石 (1:100)').replace('{0}', t(grade.exchangeDown))"
              >
                {{ t('↓ 分解') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 数量选择弹窗 -->
  <QuantitySelectModal
    :visible="showQuantityModal"
    :item="quantityModalItem"
    :title="quantityModalTitle"
    :action-label="quantityModalActionLabel"
    :action-type="quantityModalType"
    :confirm-text="quantityModalConfirmText"
    :description="quantityModalDescription"
    @close="handleQuantityClose"
    @confirm="handleQuantityConfirm"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, BoxSelect, Gem, Package, X, RotateCcw, Sword } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { useCharacterStore } from '@/stores/characterStore'
import { useGameStateStore } from '@/stores/gameStateStore'
import { useActionQueueStore } from '@/stores/actionQueueStore'
import { EnhancedActionQueueManager } from '@/utils/enhancedActionQueue'
import { isTavernEnv } from '@/utils/tavern'
import type { Item, ConsumableItem } from '@/types/game'
import { toast } from '@/utils/toast'
import { debug } from '@/utils/debug'
import QuantitySelectModal from '@/components/common/QuantitySelectModal.vue'

const { t } = useI18n()
const characterStore = useCharacterStore()
const gameStateStore = useGameStateStore()
const actionQueue = useActionQueueStore()
const enhancedActionQueue = EnhancedActionQueueManager.getInstance()
const isTavernEnvFlag = isTavernEnv()
const loading = ref(false)
const refreshing = ref(false)
const selectedItem = ref<Item | null>(null)
const searchQuery = ref('')
const selectedCategory = ref('all')
const sortBy = ref('default')
const activeTab = ref('items')
const showCustomConfirm = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const showQuantityModal = ref(false)
const quantityModalItem = ref<Item | null>(null)
const quantityModalTitle = ref('')
const quantityModalActionLabel = ref('')
const quantityModalType = ref<'use' | 'discard' | 'other'>('use')
const quantityModalConfirmText = ref('')
const quantityModalDescription = ref('')
const quantityModalCallback = ref<((quantity: number) => void) | null>(null)
const showItemModal = ref(false)
const confirmCallback = ref<(() => void) | null>(null)

// 操作锁，防止连点导致状态错乱或数据不同步
const equipBusy = ref(false)
const cultivateBusy = ref(false)

// 响应式检测
const isMobile = computed(() => {
  return window.innerWidth <= 768
})

// 标签配置
const tabs = computed(() => [
  { id: 'items', label: '物品', icon: Package },
  { id: 'equipment', label: '装备', icon: Sword },
  { id: 'currency', label: '灵石', icon: Gem },
])

// 装备槽位（短路径：装备）
const equipmentSlots = computed(() => {
  const equipment = gameStateStore.equipment
  const slotKeys = ['装备1', '装备2', '装备3', '装备4', '装备5', '装备6'] as const

  if (!equipment) {
    return slotKeys.map((slotKey) => ({ name: t(slotKey), slotKey, item: null }))
  }

  return slotKeys.map((slotKey) => {
    const equippedValue = (equipment as any)[slotKey] as unknown
    let item: Item | null = null

    const itemId =
      typeof equippedValue === 'string'
        ? equippedValue
        : typeof equippedValue === 'object' && equippedValue !== null && '物品ID' in equippedValue
          ? String((equippedValue as any).物品ID || '')
          : ''

    if (itemId) {
      // 从背包获取完整物品信息（背包.物品 是 Record<string, Item>）
      const bag = gameStateStore.inventory?.物品 || {} // 物品是对象
      const fromInv = bag[itemId] // 直接通过物品ID获取
      if (fromInv && typeof fromInv === 'object') {
        item = fromInv as Item
      } else {
        // 如果背包中没有找到，构造一个最小对象
        item = {
          物品ID: itemId,
          名称:
            typeof equippedValue === 'object' && equippedValue !== null && '名称' in equippedValue
              ? String((equippedValue as any).名称 || itemId)
              : itemId,
          类型: '装备',
          品质: { quality: '凡', grade: 1 },
          描述: '装备数据缺失',
          数量: 1,
          已装备: true,
        } as Item
      }
    } else {
      item = null
    }

    return { name: t(slotKey), slotKey, item }
  })
})

// 卸下装备功能
const unequipItem = async (slot: { name: string; slotKey: string; item: Item | null }) => {
  if (equipBusy.value) return
  if (!slot.item) return
  equipBusy.value = true
  const itemToUnequip = slot.item

  debug.log(t('背包面板'), t('卸下装备'), itemToUnequip.名称)

  try {
    // 检查数据是否存在
    if (!gameStateStore.equipment) {
      toast.error(t('装备栏数据不存在'))
      return
    }

    // 检查背包是否存在
    if (!gameStateStore.inventory?.物品) {
      toast.error(t('背包数据不存在'))
      return
    }

    // 获取存档数据
    const saveData = gameStateStore.toSaveData()
    if (!saveData) {
      toast.error(t('存档数据不存在'))
      return
    }

    const saveAny = saveData as any
    if (!saveAny.角色) saveAny.角色 = {}
    if (!saveAny.角色.装备) {
      saveAny.角色.装备 = { 装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null }
    }
    const slotKey = slot.slotKey as keyof typeof saveAny.角色.装备

    // 清空装备槽位
    saveAny.角色.装备[slotKey] = null

    // 清除物品的已装备标记
    if (saveAny.角色?.背包?.物品?.[itemToUnequip.物品ID]) {
      saveAny.角色.背包.物品[itemToUnequip.物品ID].已装备 = false
    }

    // 移除装备属性加成
    const { removeEquipmentBonus } = await import('@/utils/equipmentBonusApplier')
    removeEquipmentBonus(saveData, itemToUnequip.物品ID)

    // 更新 gameStateStore 并保存
    gameStateStore.loadFromSaveData(saveData)
    await gameStateStore.saveGame()

    // 添加到操作队列
    actionQueue.addAction({
      type: 'unequip',
      itemName: itemToUnequip.名称,
      itemType: itemToUnequip.类型,
      description: t('卸下了《{0}》装备').replace('{0}', itemToUnequip.名称),
    })

    toast.success(t('已卸下《{0}》').replace('{0}', itemToUnequip.名称))
    debug.log(t('背包面板'), t('装备卸下成功'), itemToUnequip.名称)
  } catch (error) {
    debug.error(t('背包面板'), t('卸下装备失败'), error)
    toast.error(t('卸下装备失败'))
  } finally {
    equipBusy.value = false
  }
}

const itemList = computed<Item[]>(() => {
  const items = gameStateStore.inventory?.物品 || {}
  // 物品现在是对象格式 Record<string, Item>
  // 过滤掉以 _ 开头的元数据字段（如 _AI装备流程提醒）
  return Object.entries(items)
    .filter(([key, val]) => {
      // 过滤掉元数据字段
      if (key.startsWith('_')) {
        return false
      }
      // 过滤掉无效值
      return val && typeof val === 'object'
    })
    .map(([, val]) => {
      const item = val as Partial<Item>

      // 🔍 调试：检查品质数据是否缺失
      if (!item.品质 && (item.类型 === '功法' || item.类型 === '装备')) {
        console.warn(t('[背包面板-警告] 物品缺少品质数据:'), {
          物品ID: item.物品ID,
          名称: item.名称,
          类型: item.类型,
          完整数据: item
        });
      }

      return {
        ...item,
        物品ID: String(item.物品ID || ''),
        名称: String(item.名称 || ''),
        类型: String(item.类型 || '其他') as '装备' | '功法' | '丹药' | '材料' | '其他',
        品质: item.品质 || { quality: '凡', grade: 1 },
        描述: String(item.描述 || ''),
        数量: Number(item.数量 || 1),
      } as Item
    })
    .filter((item: Item) => item.名称 && item.类型)
})

const itemCategories = computed(() => {
  // 五个分类：装备、功法、丹药、材料、其他
  return ['装备', '功法', '丹药', '材料', '其他']
})

// 品质排序映射，兼容 "*阶" 与简写
const qualityOrder: { [key: string]: number } = {
  凡: 1,
  凡阶: 1,
  黄: 2,
  黄阶: 2,
  玄: 3,
  玄阶: 3,
  地: 4,
  地阶: 4,
  天: 5,
  天阶: 5,
  仙: 6,
  仙阶: 6,
  神: 7,
  神阶: 7,
}

const filteredItems = computed(() => {
  let items = [...itemList.value]

  // 标准化物品类型和品质：允许装备、功法、丹药、材料、其他五种类型，并确保品质格式正确
  const validTypes = ['装备', '功法', '丹药', '材料', '其他']
  items = items.map((item) => {
    // 标准化类型：不在有效类型列表中的归为"其他"
    const normalizedType = validTypes.includes(item.类型) ? item.类型 : '其他'

    // 标准化品质字段
    let normalizedQuality = item.品质
    if (!normalizedQuality || typeof normalizedQuality !== 'object') {
      // 如果品质字段缺失或格式错误，设置默认值
      normalizedQuality = { quality: '凡', grade: 1 }
    } else {
      // 确保quality字段正确
      if (
        !normalizedQuality.quality ||
        !['凡', '黄', '玄', '地', '天', '仙', '神'].includes(normalizedQuality.quality)
      ) {
        normalizedQuality.quality = '凡'
      }
      // 确保grade字段正确
      if (
        typeof normalizedQuality.grade !== 'number' ||
        normalizedQuality.grade < 0 ||
        normalizedQuality.grade > 10
      ) {
        normalizedQuality.grade = 1
      }
    }

    return {
      ...item,
      类型: normalizedType,
      品质: normalizedQuality,
    }
  })

  if (searchQuery.value) {
    items = items.filter((item) => item.名称.includes(searchQuery.value))
  }

  if (selectedCategory.value !== 'all') {
    items = items.filter((item) => item.类型 === selectedCategory.value)
  }

  if (sortBy.value === 'quality') {
    const rank = (q: unknown) => qualityOrder[String(q ?? '凡')] || 0
    items.sort((a, b) => rank(b.品质?.quality) - rank(a.品质?.quality))
  } else if (sortBy.value === 'name') {
    items.sort((a, b) => a.名称.localeCompare(b.名称))
  }

  return items
})

// 格式化物品属性显示（支持嵌套对象，如「后天六司」）
const formatItemAttributes = (attributes: Record<string, unknown>): string => {
  if (!attributes || typeof attributes !== 'object') {
    return '无特殊属性'
  }

  const parts: string[] = []

  for (const [key, value] of Object.entries(attributes)) {
    if (value === null || value === undefined) continue

    if (typeof value === 'object' && !Array.isArray(value)) {
      // 处理如「后天六司」这类嵌套对象
      const nested = Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
        .map(([k, v]) => `${k}+${v}`)
        .join('、')
      if (nested) parts.push(`${key}(${nested})`)
    } else {
      parts.push(`${key}+${value}`)
    }
  }

  return parts.length ? parts.join('、') : '无特殊属性'
}

// 格式化功法属性加成显示
const formatAttributeBonus = (attributeBonus: Record<string, unknown>): string => {
  if (!attributeBonus || typeof attributeBonus !== 'object') {
    return '无属性加成'
  }
  const parts: string[] = []
  for (const [key, value] of Object.entries(attributeBonus)) {
    if (value && typeof value === 'number') {
      parts.push(`${key}+${value}`)
    }
  }
  return parts.length > 0 ? parts.join('、') : '无属性加成'
}

// 获取物品类型图标
const getItemTypeIcon = (type: string): string => {
  const typeIcons: Record<string, string> = {
    装备: '⚔️',
    功法: '📜',
    丹药: '💊',
    材料: '💎',
    其他: '📦',
  }
  return typeIcons[type] || '📦'
}

// 质量等阶规范化（兼容 “凡阶/黄阶/…” 与 “凡/黄/…”；未知返回 '未知'）
const getNormalizedQuality = (quality: unknown): string => {
  const raw = String(quality || '').trim()
  if (!raw) return '未知'
  const s = raw.endsWith('阶') ? raw.slice(0, -1) : raw
  const allowed = ['凡', '黄', '玄', '地', '天', '仙', '神']
  return allowed.includes(s) ? s : '未知'
}

// 获取品级文本显示
const getGradeText = (grade: number): string => {
  if (grade === 0) return '残缺'
  if (grade >= 1 && grade <= 3) return '下品'
  if (grade >= 4 && grade <= 6) return '中品'
  if (grade >= 7 && grade <= 9) return '上品'
  if (grade === 10) return '极品'
  return '未知'
}

// 获取品级样式
const getGradeClass = (grade: number): string => {
  if (grade === 0) return 'grade-broken'
  if (grade >= 1 && grade <= 3) return 'grade-low'
  if (grade >= 4 && grade <= 6) return 'grade-mid'
  if (grade >= 7 && grade <= 9) return 'grade-high'
  if (grade === 10) return 'grade-perfect'
  return 'grade-unknown'
}

// 从背包中移除物品的辅助函数
const removeItemFromInventory = async (item: Item) => {
  const items = gameStateStore.inventory?.物品
  if (!items || typeof items !== 'object') {
    throw new Error(t('背包数据不存在或格式不正确'))
  }

  // [REFACTORED] 从对象中移除物品
  delete items[item.物品ID]

  // 保存数据
  await characterStore.saveCurrentGame()

  debug.log(t('背包面板'), t('物品移除成功'), item.名称)

  // 如果当前选中的是被移除的物品，清除选择
  if (selectedItem.value?.物品ID === item.物品ID) {
    selectedItem.value = null
  }

  // 关闭弹窗
  if (isMobile.value) {
    showItemModal.value = false
  }
}

// 更新背包中物品的辅助函数
const updateItemInInventory = async (item: Item) => {
  const items = gameStateStore.inventory?.物品
  if (!items || typeof items !== 'object') {
    throw new Error(t('背包数据不存在或格式不正确'))
  }

  // [REFACTORED] 更新对象中的物品
  if (items[item.物品ID]) {
    items[item.物品ID] = item

    // 保存数据
    await characterStore.saveCurrentGame()

    debug.log(t('背包面板'), t('物品更新成功'), item.名称)
  } else {
    throw new Error(t('尝试更新一个不存在于背包的物品: {0}').replace('{0}', item.名称))
  }

  // 如果当前选中的是被更新的物品，更新选择
  if (selectedItem.value?.物品ID === item.物品ID) {
    selectedItem.value = item
  }
}

// 切换修炼状态
const toggleCultivate = async (item: Item) => {
  if (cultivateBusy.value) return
  if (item.类型 !== '功法') {
    toast.error(t('只有功法才能修炼'))
    return
  }
  cultivateBusy.value = true
  try {
    if (isCultivating(item)) {
      await enhancedActionQueue.stopCultivation(item)
    } else {
      await enhancedActionQueue.cultivateItem(item)
    }
  } finally {
    cultivateBusy.value = false
  }
}

// 使用物品功能 - 数量选择弹窗
const useItem = async (item: Item) => {
  if (!item) {
    return
  }

  debug.log(t('背包面板'), t('使用物品'), item.名称)

  // 如果物品数量大于1，弹出数量选择弹窗
  if (item.数量 > 1) {
    quantityModalItem.value = item
    quantityModalTitle.value = t('使用物品')
    quantityModalActionLabel.value = t('使用数量')
    quantityModalType.value = 'use'
    quantityModalConfirmText.value = t('确定使用')
    // 丹药、材料、其他类型都可能有使用效果
    const consumableTypes = ['丹药', '材料', '其他']
    quantityModalDescription.value = (consumableTypes.includes(item.类型) && '使用效果' in item ? (item as ConsumableItem).使用效果 : '') || t('暂无特殊效果')
    quantityModalCallback.value = (quantity: number) => useItemWithQuantity(item, quantity)
    showQuantityModal.value = true
    return
  }

  // 数量为1时直接使用
  await useItemWithQuantity(item, 1)
}

const useItemWithQuantity = async (item: Item, quantity: number) => {
  try {
    // 丹药、材料、其他类型可以直接使用
    const consumableTypes = ['丹药', '材料', '其他']
    if (!consumableTypes.includes(item.类型)) {
      toast.error(t('该物品无法直接使用'))
      return
    }
    // 使用增强版动作队列管理器
    await enhancedActionQueue.useItem(item, quantity)

    // 更新UI状态
    if (isMobile.value) {
      showItemModal.value = false
    }
    selectedItem.value = null

    debug.log(t('背包面板'), t('使用物品成功'), item.名称)
  } catch (error) {
    debug.error(t('背包面板'), t('使用物品失败'), error)
    toast.error(t('使用物品失败'))
  }
}

// 数量选择弹窗的处理函数
const handleQuantityConfirm = async (quantity: number) => {
  if (quantityModalCallback.value) {
    await quantityModalCallback.value(quantity)
  }
  handleQuantityClose()
}

const handleQuantityClose = () => {
  showQuantityModal.value = false
  quantityModalItem.value = null
  quantityModalTitle.value = ''
  quantityModalActionLabel.value = ''
  quantityModalType.value = 'use'
  quantityModalConfirmText.value = ''
  quantityModalDescription.value = ''
  quantityModalCallback.value = null
}

// 丢弃物品功能 - 支持数量选择
const discardItem = async (item: Item) => {
  if (!item) {
    return
  }

  // 如果物品数量大于1，弹出数量选择弹窗
  if (item.数量 > 1) {
    const itemQuality = item.品质?.quality || '凡'
    const qualityColor = itemQuality === '凡' ? '' : `【${t(itemQuality)}】`

    quantityModalItem.value = item
    quantityModalTitle.value = t('丢弃物品')
    quantityModalActionLabel.value = t('丢弃数量')
    quantityModalType.value = 'discard'
    quantityModalConfirmText.value = t('确定丢弃')
    quantityModalDescription.value = `${qualityColor}${item.名称} - ${t('此操作不可撤销！')}`
    quantityModalCallback.value = (quantity: number) => discardItemWithQuantity(item, quantity)
    showQuantityModal.value = true
    return
  }

  // 数量为1时使用确认弹窗
  const itemQuality = item.品质?.quality || '凡'
  const qualityColor = itemQuality === '凡' ? '' : `【${t(itemQuality)}】`
  confirmTitle.value = t('丢弃物品')
  confirmMessage.value = t('确定要丢弃 {0}{1} 吗？\n\n此操作不可撤销！').replace('{0}', qualityColor).replace('{1}', item.名称)
  confirmCallback.value = async () => {
    await discardItemWithQuantity(item, 1)
  }
  showCustomConfirm.value = true
}

const discardItemWithQuantity = async (item: Item, quantity: number) => {
  debug.log(t('背包面板'), t('丢弃物品'), { 物品名称: item.名称, 数量: quantity })
  try {
    if (quantity >= item.数量) {
      // 全部丢弃
      await removeItemFromInventory(item)
      toast.success(t('已丢弃《{0}》').replace('{0}', item.名称))
    } else {
      // 部分丢弃，减少数量
      const updatedItem = { ...item, 数量: item.数量 - quantity }
      await updateItemInInventory(updatedItem)
      toast.success(t('已丢弃 {0} 个《{1}》').replace('{0}', quantity.toString()).replace('{1}', item.名称))
    }

    if (isMobile.value) {
      showItemModal.value = false
    }
    selectedItem.value = null
  } catch (error) {
    debug.error(t('背包面板'), t('丢弃失败'), error)
    toast.error(t('丢弃物品失败'))
  }
}
const toggleEquip = async (item: Item) => {
  if (!item || equipBusy.value) return
  if (item.类型 !== '装备') {
    toast.error(t('只有装备才能穿戴'))
    return
  }
  equipBusy.value = true

  try {
    if (isEquipped(item)) {
      // 卸下装备
      await enhancedActionQueue.unequipItem(item)
    } else {
      // 装备物品
      await enhancedActionQueue.equipItem(item)
    }
  } catch (error) {
    console.error('装备切换失败:', error)
    toast.error(t('装备操作失败，请稍后重试'))
  } finally {
    equipBusy.value = false
  }
}

// 检查物品是否已装备 - 直接检查背包物品的已装备字段
const isEquipped = (item: Item | null): boolean => {
  if (!item || !item.物品ID) return false

  const inventoryItems = gameStateStore.inventory?.物品
  if (!inventoryItems) return false

  // 背包物品是对象，不是数组
  const currentItemState = inventoryItems[item.物品ID]
  if (!currentItemState) return false

  return currentItemState.已装备 === true
}

// 检查功法是否正在修炼 - 以 角色.修炼.修炼功法 为准
const isCultivating = (item: Item | null): boolean => {
  if (!item || !item.物品ID) return false

  const cultivatingId = (gameStateStore.cultivation as any)?.修炼功法?.物品ID
  return cultivatingId === item.物品ID
}

const getItemQualityClass = (
  item: Item | null,
  type: 'border' | 'text' | 'badge' | 'card' = 'border',
): string => {
  if (!item) return ''
  const q = getNormalizedQuality(item.品质?.quality)
  if (q === '未知') return ''
  return `${type}-quality-${q}`
}

const spiritStoneGrades = [
  {
    name: '极品',
    colorClass: 'grade-legend',
    canExchange: false, // 最高级，不能向上兑换
    canExchangeDown: true,
    exchangeDown: '上品',
  },
  {
    name: '上品',
    colorClass: 'grade-epic',
    canExchange: true,
    canExchangeDown: true,
    exchangeUp: '极品',
    exchangeDown: '中品',
  },
  {
    name: '中品',
    colorClass: 'grade-rare',
    canExchange: true,
    canExchangeDown: true,
    exchangeUp: '上品',
    exchangeDown: '下品',
  },
  {
    name: '下品',
    colorClass: 'grade-common',
    canExchange: true,
    canExchangeDown: false, // 最低级，不能向下分解
    exchangeUp: '中品',
  },
] as const

// 选择物品
const selectItem = (item: Item) => {
  selectedItem.value = item
  if (isMobile.value) {
    showItemModal.value = true
  }
}

// 处理确认回调
const handleConfirm = () => {
  if (confirmCallback.value) {
    confirmCallback.value()
  }
  showCustomConfirm.value = false
}

// 关闭模态框
const closeModal = () => {
  showItemModal.value = false
}

// 灵石兑换功能
const handleExchange = async (
  currentGrade: '下品' | '中品' | '上品' | '极品',
  direction: 'up' | 'down',
) => {
  const gradeInfo = spiritStoneGrades.find((g) => g.name === currentGrade)
  if (!gradeInfo) return

  if (direction === 'up' && gradeInfo.canExchange && gradeInfo.exchangeUp) {
    // 向上兑换：100个当前等级 → 1个高级
    const currentAmount = gameStateStore.inventory?.灵石?.[currentGrade] || 0
    if (currentAmount >= 100) {
      // 更新数据
      if (gameStateStore.inventory?.灵石) {
        ;(gameStateStore.inventory.灵石[currentGrade] as number) = currentAmount - 100
        const targetGrade = gradeInfo.exchangeUp as '下品' | '中品' | '上品' | '极品'
        const targetAmount = gameStateStore.inventory.灵石[targetGrade] || 0
        ;(gameStateStore.inventory.灵石[targetGrade] as number) = targetAmount + 1

        // 保存数据
        await characterStore.saveCurrentGame()
      }
    }
  } else if (direction === 'down' && gradeInfo.canExchangeDown && gradeInfo.exchangeDown) {
    // 向下分解：1个当前等级 → 100个低级
    const currentAmount = gameStateStore.inventory?.灵石?.[currentGrade] || 0
    if (currentAmount >= 1) {
      // 更新数据
      if (gameStateStore.inventory?.灵石) {
        ;(gameStateStore.inventory.灵石[currentGrade] as number) = currentAmount - 1
        const targetGrade = gradeInfo.exchangeDown as '下品' | '中品' | '上品' | '极品'
        const targetAmount = gameStateStore.inventory.灵石[targetGrade] || 0
        ;(gameStateStore.inventory.灵石[targetGrade] as number) = targetAmount + 100

        // 保存数据
        await characterStore.saveCurrentGame()
      }
    }
  }
}

// 手动刷新数据
const refreshFromTavern = async () => {
  if (refreshing.value) return

  refreshing.value = true
  try {
    debug.log(t('背包面板'), t('手动刷新酒馆数据'))
    await characterStore.reloadFromStorage()
  } catch (error) {
    debug.error(t('背包面板'), t('刷新数据失败'), error)
  } finally {
    refreshing.value = false
  }
}

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

/* 自定义确认弹窗样式 */
.custom-confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.custom-confirm-modal {
  background: var(--color-surface);
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modal-appear 0.3s ease-out;
  border: 1px solid var(--color-primary-border);
}

.confirm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-primary-light);
}

.confirm-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.confirm-close-btn {
  background: none;
  border: none;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}

.confirm-close-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.confirm-content {
  padding: 24px;
}

.confirm-content p {
  margin: 0;
  color: var(--color-text);
  line-height: 1.6;
  white-space: pre-line;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  padding: 16px 24px 24px 24px;
  justify-content: flex-end;
}

.confirm-btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}

.cancel-btn {
  background: var(--color-surface-hover);
  color: var(--color-text-secondary);
}

.cancel-btn:hover {
  background: var(--color-surface-light);
  color: var(--color-text);
}

.confirm-btn.confirm-btn {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.confirm-btn.confirm-btn:hover {
  background: var(--color-primary-hover);
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
  border: 1px solid var(--color-primary-border);
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
  background: var(--color-primary-light);
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
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.grade-display {
  font-size: 0.8rem;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid currentColor;
  white-space: nowrap;
}

/* 品级颜色样式 */
.grade-display.grade-broken {
  background: #6b7280;
  color: white;
  border-color: #6b7280;
}

.grade-display.grade-low {
  background: #10b981; /* 绿色 - 下品 */
  color: white;
  border-color: #10b981;
}

.grade-display.grade-mid {
  background: #3b82f6; /* 蓝色 - 中品 */
  color: white;
  border-color: #3b82f6;
}

.grade-display.grade-high {
  background: #8b5cf6; /* 紫色 - 上品 */
  color: white;
  border-color: #8b5cf6;
}

.grade-display.grade-perfect {
  background: #f59e0b; /* 金色 - 极品 */
  color: white;
  border-color: #f59e0b;
}

.grade-display.grade-unknown {
  background: #9ca3af;
  color: white;
  border-color: #9ca3af;
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
  font-weight: 600;
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
  flex-shrink: 0;
  border-radius: 12px 12px 0 0;
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
  min-width: 150px;
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
  color: var(--color-text);
  font-size: 13px;
  min-width: 80px;
}

.filter-select option {
  background: var(--color-surface);
  color: var(--color-text);
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
  padding: 20px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 18px;
  align-content: start;
  background: var(--color-background);
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
  to {
    transform: rotate(360deg);
  }
}

/* 物品卡片 - 重新设计美观布局 */
.item-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  height: 140px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.item-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: var(--color-surface-light);
}

/* 顶部区域：图标和品质 */
.item-top-section {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  margin-bottom: 8px;
}

.item-icon-area {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
  position: relative;
}

.item-type-icon {
  font-size: 24px;
  opacity: 0.9;
}

.item-quality-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  font-size: 10px;
  font-weight: bold;
  padding: 3px 6px;
  border-radius: 6px;
  background: var(--color-surface);
  border: 1px solid currentColor;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 2;
  min-width: 20px;
  text-align: center;
}

/* 数量显示 - 更大更显眼 */
.item-quantity-display {
  position: absolute;
  top: 6px;
  right: 6px;
  /* 仅改变文字颜色，不改背景 */
  background: transparent;
  color: var(--color-accent, #7c4dff);
  font-size: 12px;
  font-weight: 700;
  padding: 0;
  border-radius: 0;
  box-shadow: none;
  border: none;
  z-index: 4;
  min-width: 0;
  text-align: right;
}

/* 名称区域 */
.item-name-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 4px;
}

.item-name {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

/* 底部区域：类型和品级 */
.item-bottom-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
  margin-top: auto;
  padding-top: 4px;
}

.item-type-label {
  font-size: 9px;
  color: var(--color-text-secondary);
  background: var(--color-background);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}

.item-grade-info {
  font-size: 8px;
  font-weight: bold;
  padding: 2px 4px;
  border-radius: 4px;
  border: 1px solid currentColor;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

/* 品级样式 - 简化版本 */
.grade-broken {
  background: #6b7280;
  color: white;
}

.grade-low {
  background: #10b981; /* 绿色 - 下品 */
  color: white;
}

.grade-mid {
  background: #3b82f6; /* 蓝色 - 中品 */
  color: white;
}

.grade-high {
  background: #8b5cf6; /* 紫色 - 上品 */
  color: white;
}

.grade-perfect {
  background: #f59e0b; /* 金色 - 极品 */
  color: white;
}

.grade-unknown {
  background: #9ca3af;
  color: white;
}

/* 灵石品质样式 - 颜色递增 */
.grade-common {
  background: linear-gradient(135deg, #9ca3af, #6b7280);
  border-color: #9ca3af;
  color: white;
  box-shadow: 0 2px 8px rgba(156, 163, 175, 0.3);
}

.grade-rare {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-color: #3b82f6;
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

.grade-epic {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  border-color: #8b5cf6;
  color: white;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
}

.grade-legend {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border-color: #f59e0b;
  color: white;
  box-shadow: 0 2px 12px rgba(245, 158, 11, 0.5);
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
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
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
  font-weight: 600;
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
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.3s ease;
  cursor: default;
  position: relative;
  overflow: hidden;
}

.currency-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.currency-card.grade-common::before {
  background: linear-gradient(90deg, #9ca3af, #6b7280);
}

.currency-card.grade-rare::before {
  background: linear-gradient(90deg, #3b82f6, #2563eb);
}

.currency-card.grade-epic::before {
  background: linear-gradient(90deg, #8b5cf6, #7c3aed);
}

.currency-card.grade-legend::before {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.currency-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.currency-card:hover::before {
  opacity: 1;
}

.currency-card-top {
  display: flex;
  align-items: center;
  gap: 16px;
}

.currency-icon {
  flex-shrink: 0;
  color: var(--color-text-secondary);
  transition: color 0.3s ease;
}

/* 灵石图标颜色 */
.icon-grade-common {
  color: #9ca3af;
}

.icon-grade-rare {
  color: #3b82f6;
}

.icon-grade-epic {
  color: #8b5cf6;
}

.icon-grade-legend {
  color: #f59e0b;
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

/* 功法效果样式 */
.skill-effects {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.effect-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
}

.effect-label {
  font-weight: 600;
  color: var(--color-text-secondary);
  min-width: 80px;
}

.effect-value {
  color: var(--color-success);
  font-weight: 500;
}

.special-abilities {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.ability-tag {
  background: var(--color-primary);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

/* 功法技能样式 */
.technique-skills {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skill-item {
  background: var(--color-background);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--color-border);
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.skill-name {
  font-weight: 600;
  color: var(--color-text);
}

.skill-type {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.skill-type.type-攻击 {
  background: var(--color-error);
  color: white;
}

.skill-type.type-防御 {
  background: var(--color-info);
  color: white;
}

.skill-type.type-辅助 {
  background: var(--color-success);
  color: white;
}

.skill-type.type-移动 {
  background: var(--color-warning);
  color: white;
}

.skill-type.type-其他 {
  background: var(--color-text-secondary);
  color: white;
}

.skill-description {
  color: var(--color-text);
  font-size: 0.9rem;
  line-height: 1.4;
  margin-bottom: 6px;
}

.skill-unlock-requirement {
  font-size: 0.75rem;
  color: var(--color-warning);
  font-weight: 600;
  padding: 2px 8px;
  background: rgba(var(--color-warning-rgb), 0.1);
  border-radius: 4px;
  margin-left: auto;
}

.skill-cost {
  color: var(--color-info);
  font-size: 0.8rem;
  font-weight: 500;
  margin-top: 4px;
}

.skill-unlock {
  color: var(--color-text-secondary);
  font-size: 0.8rem;
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

/* 品质样式系统 - 内联文字样式，不填充整行 */
/* 神阶 - 深红色（最高品质） */
.text-quality-神,
.text-quality-神阶 {
  color: white !important;
  background: linear-gradient(135deg, #dc2626, #b91c1c) !important;
  border: 1px solid #dc2626 !important;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3) !important;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5) !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  display: inline !important;
  white-space: nowrap !important;
}

/* 仙阶 - 粉紫色 */
.text-quality-仙,
.text-quality-仙阶 {
  color: white !important;
  background: linear-gradient(135deg, #ec4899, #db2777) !important;
  border: 1px solid #ec4899 !important;
  box-shadow: 0 2px 8px rgba(236, 72, 153, 0.3) !important;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5) !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  display: inline !important;
  white-space: nowrap !important;
}

/* 天阶 - 蓝色 */
.text-quality-天,
.text-quality-天阶 {
  color: white !important;
  background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
  border: 1px solid #3b82f6 !important;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3) !important;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5) !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  display: inline !important;
  white-space: nowrap !important;
}

/* 地阶 - 橙色 */
.text-quality-地,
.text-quality-地阶 {
  color: white !important;
  background: linear-gradient(135deg, #f59e0b, #d97706) !important;
  border: 1px solid #f59e0b !important;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3) !important;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5) !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  display: inline !important;
  white-space: nowrap !important;
}

/* 玄阶 - 紫色 */
.text-quality-玄,
.text-quality-玄阶 {
  color: white !important;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed) !important;
  border: 1px solid #8b5cf6 !important;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3) !important;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5) !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  display: inline !important;
  white-space: nowrap !important;
}

/* 黄阶 - 金黄色 */
.text-quality-黄,
.text-quality-黄阶 {
  color: white !important;
  background: linear-gradient(135deg, #eab308, #ca8a04) !important;
  border: 1px solid #eab308 !important;
  box-shadow: 0 2px 8px rgba(234, 179, 8, 0.3) !important;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5) !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  display: inline !important;
  white-space: nowrap !important;
}

/* 凡阶 - 灰色（最低品质） */
.text-quality-凡,
.text-quality-凡阶 {
  color: white !important;
  background: linear-gradient(135deg, #6b7280, #4b5563) !important;
  border: 1px solid #6b7280 !important;
  box-shadow: 0 2px 8px rgba(107, 114, 128, 0.3) !important;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5) !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  display: inline !important;
  white-space: nowrap !important;
}

/* 边框样式也需要修复 */
.border-quality-神 {
  border-color: #dc2626 !important;
}

.border-quality-仙 {
  border-color: #ec4899 !important;
}

.border-quality-天 {
  border-color: #3b82f6 !important;
}

.border-quality-地 {
  border-color: #f59e0b !important;
}

.border-quality-玄 {
  border-color: #8b5cf6 !important;
}

.border-quality-凡 {
  border-color: #6b7280 !important;
}

.border-quality-凡 {
  border-color: #6b7280 !important;
}

/* 装备标签页样式 */
.equipment-tab {
  height: 100%;
  overflow-y: auto;
}
.item-grade {
  border-radius: 5px;
  border: 2px solid #9ca3af;
}
.equipment-content {
  padding: 20px;
}

.equipment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--color-border);
}

.equipment-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text);
}

.equipment-stats {
  display: flex;
  align-items: center;
  gap: 16px;
}

.equipment-stats .stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.equipment-stats .stat-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.equipment-stats .stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-primary);
}

/* 装备网格 */
.equipment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.equipment-slot {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
  min-height: 160px;
  position: relative;
}

.equipment-slot.has-equipment {
  border-color: var(--color-success);
  box-shadow: 0 4px 12px rgba(var(--color-success-rgb), 0.1);
}

.equipment-slot.has-equipment:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(var(--color-success-rgb), 0.2);
}

.equipment-slot.empty-slot {
  border-style: dashed;
  border-color: var(--color-border);
}

.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.slot-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--color-surface-light);
  display: inline-block;
}

.slot-actions {
  display: flex;
  gap: 4px;
}

/* 卸下按钮样式优化 */
.unequip-btn {
  padding: 8px 12px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: 1px solid #ef4444;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
  position: relative;
  overflow: hidden;
}

.unequip-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.unequip-btn:hover {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
}

.unequip-btn:hover::before {
  left: 100%;
}

.unequip-btn:active {
  transform: translateY(0);
}

/* 详情区域的卸下按钮保持与其他 action-btn 一致且不上浮 */
.action-btn.unequip-btn {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: white;
  border-radius: 8px;
}

.action-btn.unequip-btn:hover {
  background: var(--color-danger-hover);
  transform: none;
  box-shadow: none;
}

/* 装备物品显示 - 优化样式 */
.equipment-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  background: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
}

.equipment-item:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.1);
  transform: translateY(-2px);
}

.item-icon {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  border: 3px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-light);
  flex-shrink: 0;
  font-weight: bold;
  transition: all 0.3s ease;
}

.item-type-text {
  font-size: 12px;
  font-weight: bold;
  text-align: center;
  color: var(--color-text);
  line-height: 1.2;
  word-break: break-word;
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-name {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0;
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  color: var(--color-text);
}

.item-quality {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  border-radius: 6px;
  margin-bottom: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  width: fit-content;
}

.item-description {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  background: var(--color-surface-light);
  padding: 8px 12px;
  border-radius: 8px;
  border-left: 3px solid var(--color-primary);
}

.item-effects {
  background: var(--color-surface-light);
  padding: 8px;
  border-radius: 6px;
  border-left: 3px solid var(--color-info);
}

.effects-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-info);
  margin-bottom: 4px;
}

.effects-text {
  font-size: 0.8rem;
  color: var(--color-text);
  line-height: 1.3;
}

/* 空装备槽位 */
.empty-equipment-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 120px;
  gap: 8px;
}

.empty-icon {
  color: var(--color-text-muted);
  opacity: 0.5;
}

.empty-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.empty-hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-style: italic;
}

/* 移动端适配 - 优化卡片显示 */
@media (max-width: 640px) {
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
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    padding: 16px;
    gap: 12px;
  }

  .item-card {
    height: 130px;
    padding: 6px;
  }

  .item-icon-area {
    width: 40px;
    height: 40px;
  }

  .item-type-icon {
    font-size: 20px;
  }

  .item-name {
    font-size: 11px;
  }

  .item-type-label {
    font-size: 8px;
    padding: 1px 4px;
  }

  .item-grade-info {
    font-size: 7px;
    padding: 1px 3px;
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

  /* 装备页面移动端适配 */
  .equipment-content {
    padding: 12px;
  }

  .equipment-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .equipment-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .equipment-slot {
    min-height: 140px;
    padding: 12px;
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
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
    padding: 12px;
  }

  .item-card {
    height: 120px;
    padding: 5px;
  }

  .item-icon-area {
    width: 32px;
    height: 32px;
  }

  .item-type-icon {
    font-size: 16px;
  }

  .item-name {
    font-size: 10px;
  }

  .item-type-label {
    font-size: 7px;
    padding: 1px 3px;
  }

  .item-grade-info {
    font-size: 6px;
    padding: 1px 2px;
  }

  .item-quality-badge {
    font-size: 6px;
    padding: 1px 2px;
  }

  .item-quantity-badge {
    font-size: 8px;
    padding: 1px 4px;
  }

  .currency-grid {
    grid-template-columns: 1fr;
  }

  .currency-card {
    padding: 14px;
  }
}
</style>
