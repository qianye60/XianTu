<template>
  <div class="character-management-panel" :class="{ 'fullscreen': isFullscreen }">
    <VideoBackground v-if="isFullscreen" />

    <!-- 自定义对话框 -->
    <div v-if="modalState.show" class="dialog-overlay" @click="handleModalCancel">
      <div class="dialog-box" @click.stop>
        <h3 class="dialog-title">{{ modalState.title }}</h3>
        <p class="dialog-message">{{ modalState.message }}</p>

        <input
          v-if="modalState.type === 'prompt'"
          v-model="modalState.inputValue"
          :placeholder="modalState.placeholder"
          class="dialog-input"
          ref="promptInput"
        />

        <div class="dialog-actions">
          <button
            v-if="modalState.type !== 'alert'"
            @click="handleModalCancel"
            class="btn-dialog-cancel"
          >
            取消
          </button>
          <button @click="handleModalConfirm" class="btn-dialog-confirm">
            确认
          </button>
        </div>
      </div>
    </div>

    <!-- 主体区域 -->
    <main class="main-content" :class="{ 'fullscreen-content': isFullscreen }">
      <input ref="fileInput" type="file" accept=".json" @change="handleImportFile" style="display: none">
      <!-- 返回按钮 - 仅在全屏模式显示 -->
      <div v-if="isFullscreen" class="fullscreen-header">
        <button @click="handleClose" class="fullscreen-back-btn">
          <ArrowLeft :size="20" />
          <span>返回道途</span>
        </button>
        <div class="fullscreen-title">
          <h1>续前世因缘</h1>
          <p>择一法身，入道重修</p>
        </div>
      </div>

      <!-- 移动端头部导航 -->
      <div class="mobile-header">
        <button
          class="mobile-menu-btn"
          @click="toggleCharacterPanel"
          :class="{ 'active': isCharacterPanelOpen }"
        >
          <div class="hamburger">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span class="menu-text">角色列表</span>
        </button>
        <div class="mobile-title">
          <h2>角色管理</h2>
          <div v-if="selectedCharacter" class="selected-info">
            {{ selectedCharacter.角色基础信息.名字 }} - {{ selectedCharacter.模式 }}模式
          </div>
        </div>
      </div>

      <!-- 遮罩层 -->
      <div v-if="isCharacterPanelOpen && isMobile" class="panel-overlay" @click="isCharacterPanelOpen = false"></div>

      <!-- 无角色提示 -->
      <div v-if="Object.keys(characterStore.rootState.角色列表).length === 0" class="empty-state">
        <div class="empty-icon">🌟</div>
        <h2>道途未启</h2>
        <p>尚未创建任何法身，请返回道途开启修仙之旅</p>
        <div class="empty-actions">
          <button @click="goBack" class="btn-create">踏入仙途</button>
          <button @click="importCharacter" class="btn-import">导入角色</button>
        </div>
      </div>

      <!-- 角色管理界面 -->
      <div v-else class="management-layout">
        <!-- 3行2列网格容器 -->
        <div class="grid-container">
          <!-- 第1行：标题栏 -->
          <div class="grid-header-left">
            <div class="header-title-group">
              <h2>角色列表</h2>
              <div class="character-count">{{ allCharacterCount }} 个角色</div>
            </div>
            <button @click="importCharacter" class="btn-header-action import" title="导入新角色">
              <Upload :size="16" />
              <span>导入</span>
            </button>
          </div>
          <div class="grid-header-right">
            <div class="header-left-content">
              <h2>存档管理</h2>
              <div v-if="selectedCharacter" class="selected-char-info">
                {{ selectedCharacter.角色基础信息.名字 }} - {{ selectedCharacter.模式 }}模式
              </div>
            </div>
            <div v-if="selectedCharacter" class="save-actions-buttons">
              <button @click="exportSaves" class="btn-save-action export" title="导出选中角色的存档">
                <Download :size="18" />
                <span>导出存档</span>
              </button>
              <button @click="importSaves" class="btn-save-action import" title="向选中角色导入存档">
                <Upload :size="18" />
                <span>导入存档</span>
              </button>
            </div>
          </div>

          <!-- 第2行：主要内容区 -->
          <section class="grid-content-left characters-panel" :class="{ 'is-open': isCharacterPanelOpen }">
            <div class="characters-grid">
              <div v-for="(profile, charId) in characterStore.rootState.角色列表"
                   :key="charId"
                   class="character-card"
                   :class="{
                     'active': selectedCharId === String(charId),
                     'single-mode': profile.模式 === '单机',
                     'online-mode': profile.模式 === '联机'
                   }"
                   @click="selectCharacter(String(charId))">

                <!-- 卡片头部 -->
                <div class="card-header">
                  <div class="char-avatar" :class="profile.模式">
                    <span class="avatar-text">{{ profile.角色基础信息.名字[0] }}</span>
                    <div class="mode-indicator">{{ profile.模式 === '单机' ? '单' : '联' }}</div>
                  </div>
                  <div class="char-info">
                    <h3 class="char-name">{{ profile.角色基础信息.名字 }}</h3>
                    <div class="char-meta">
                      <span class="world">{{ profile.角色基础信息.世界.name }}</span>
                      <span class="talent">{{ getFieldName(profile.角色基础信息.天资.name) }}</span>
                    </div>
                  </div>
                  <div class="save-count">
                    <span class="count">{{ getSaveCount(profile) }}</span>
                    <span class="label">存档</span>
                  </div>
                </div>

                <!-- 卡片底部操作 -->
                <div class="card-actions">
                  <button @click.stop="showCharacterDetails(String(charId))" class="btn-details">详情</button>
                  <button @click.stop="exportCharacter(String(charId))" class="btn-export">导出</button>
                  <button @click.stop="handleDeleteCharacter(String(charId))" class="btn-delete">删除</button>
                </div>
              </div>
            </div>
          </section>

          <!-- 右侧：存档详情 -->
          <section class="grid-content-right saves-panel">
            <!-- 未选择角色 -->
            <div v-if="!selectedCharacter" class="no-selection">
              <div class="no-selection-icon">📋</div>
              <p>请选择左侧角色查看存档详情</p>
            </div>

            <!-- 正在加载存档 -->
            <div v-else-if="isLoadingSaves" class="loading-saves">
              <div class="loading-spinner"></div>
              <p>正在加载存档...</p>
            </div>

            <!-- 单机模式存档 -->
            <div v-else-if="selectedCharacter.模式 === '单机'" class="saves-container">
              <div class="saves-section">
                <!-- 手动存档区 - 仅单机模式显示 -->
                <div v-if="selectedCharacter.模式 === '单机'" class="manual-saves-section">
                  <div class="manual-saves-header">
                    <h3>手动存档</h3>
                    <div class="save-info-text">
                      <span>存档通过游戏内保存功能创建</span>
                    </div>
                  </div>

                  <div class="manual-saves-grid">
                    <div v-for="(slot, slotKey) in getAllSaves(selectedCharacter)"
                         :key="slotKey"
                         class="save-card manual-save"
                         :class="{
                           'has-data': slot.存档数据,
                           'auto-save': slotKey === '上次对话' || slotKey === '时间点存档'
                         }"
                         @click="slot.存档数据 && handleSelect(selectedCharId!, String(slotKey), true)"
                         :style="{ cursor: slot.存档数据 ? 'pointer' : 'default' }">
 
                       <div v-if="slot.存档数据" class="save-data">
                         <div class="save-header">
                           <h4 class="save-name">
                             <History v-if="slotKey === '上次对话'" :size="16" class="save-icon last-save-icon" />
                             <Clock v-else-if="slotKey === '时间点存档'" :size="16" class="save-icon time-save-icon" />
                             {{ slot.存档名 || slotKey }}
                           </h4>
                           <div class="save-actions">
                             <button @click.stop="handleEditSaveName(selectedCharId!, String(slotKey))"
                                     class="btn-edit-save"
                                     title="重命名"
                                     :disabled="slotKey === '上次对话' || slotKey === '时间点存档'">编</button>
                             <button @click.stop="handleDeleteSave(selectedCharId!, String(slotKey))"
                                     class="btn-delete-save"
                                     :class="{ 'disabled': !canDeleteSave(selectedCharacter, String(slotKey)) }"
                                     :disabled="!canDeleteSave(selectedCharacter, String(slotKey))"
                                     :title="getDeleteTooltip(selectedCharacter, String(slotKey))">删</button>
                           </div>
                         </div>

                        <div class="save-badges">
                          <span class="realm-badge">{{ getRealmName(slot.存档数据.玩家角色状态?.境界) }}</span>
                          <span class="age-badge">{{ slot.存档数据.玩家角色状态?.寿命?.当前 || 18 }}岁</span>
                        </div>

                        <div class="save-stats">
                          <div class="stat-grid">
                            <div class="stat">
                              <span class="label">气血</span>
                              <span class="value">{{ slot.存档数据.玩家角色状态?.气血?.当前 || 0 }}/{{ slot.存档数据.玩家角色状态?.气血?.上限 || 0 }}</span>
                            </div>
                            <div class="stat">
                              <span class="label">灵气</span>
                              <span class="value">{{ slot.存档数据.玩家角色状态?.灵气?.当前 || 0 }}/{{ slot.存档数据.玩家角色状态?.灵气?.上限 || 0 }}</span>
                            </div>
                            <div class="stat">
                              <span class="label">神识</span>
                              <span class="value">{{ slot.存档数据.玩家角色状态?.神识?.当前 || 0 }}/{{ slot.存档数据.玩家角色状态?.神识?.上限 || 0 }}</span>
                            </div>
                            <div class="stat">
                              <span class="label">声望</span>
                              <span class="value">{{ slot.存档数据.玩家角色状态?.声望 || 0 }}</span>
                            </div>
                          </div>
                        </div>

                        <div class="save-footer">
                          <span class="location">{{ slot.存档数据.玩家角色状态?.位置?.描述 || '初始地' }}</span>
                          <span class="save-time">{{ formatTime(slot.保存时间) }}</span>
                        </div>
                      </div>

                      <div v-else class="save-empty">
                        <div class="empty-slot-icon">📁</div>
                        <span class="empty-text">空存档槽</span>
                        <span class="empty-desc">通过游戏内保存创建</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 联机模式存档 -->
            <div v-else-if="selectedCharacter.模式 === '联机'" class="online-saves-container">
              <div v-if="!isLoggedIn" class="login-prompt">
                <div class="login-icon">🔐</div>
                <h3>需要登录</h3>
                <p>请先登录以管理联机角色存档</p>
                <button @click="handleLogin" class="btn-login">登入道籍</button>
              </div>

              <div v-else-if="selectedCharacter.存档" class="online-save-card">
                <div v-if="selectedCharacter.存档.存档数据" class="save-data">
                  <div class="save-header">
                    <h4 class="save-name">云端存档</h4>
                    <div class="save-badges">
                      <span class="realm-badge">{{ getRealmName(selectedCharacter.存档.存档数据.玩家角色状态?.境界) }}</span>
                      <span class="age-badge">{{ selectedCharacter.存档.存档数据.玩家角色状态?.寿命?.当前 || 18 }}岁</span>
                    </div>
                  </div>

                  <div class="save-stats">
                    <div class="stat-grid">
                      <div class="stat">
                        <span class="label">气血</span>
                        <span class="value">{{ selectedCharacter.存档.存档数据.玩家角色状态?.气血?.当前 || 0 }}/{{ selectedCharacter.存档.存档数据.玩家角色状态?.气血?.上限 || 0 }}</span>
                      </div>
                      <div class="stat">
                        <span class="label">灵气</span>
                        <span class="value">{{ selectedCharacter.存档.存档数据.玩家角色状态?.灵气?.当前 || 0 }}/{{ selectedCharacter.存档.存档数据.玩家角色状态?.灵气?.上限 || 0 }}</span>
                      </div>
                      <div class="stat">
                        <span class="label">神识</span>
                        <span class="value">{{ selectedCharacter.存档.存档数据.玩家角色状态?.神识?.当前 || 0 }}/{{ selectedCharacter.存档.存档数据.玩家角色状态?.神识?.上限 || 0 }}</span>
                      </div>
                      <div class="stat">
                        <span class="label">声望</span>
                        <span class="value">{{ selectedCharacter.存档.存档数据.玩家角色状态?.声望 || 0 }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="save-footer">
                    <span class="location">{{ selectedCharacter.存档.存档数据.玩家角色状态?.位置?.描述 || '初始地' }}</span>
                    <div class="sync-info">
                      <span class="sync-status" :class="{ 'synced': !selectedCharacter.存档.云端同步信息?.需要同步 }">
                        {{ selectedCharacter.存档.云端同步信息?.需要同步 ? '待同步' : '已同步' }}
                      </span>
                    </div>
                  </div>

                  <div class="online-actions">
                    <button @click="handleSelect(selectedCharId!, '存档', true)" class="btn-play">进入游戏</button>
                    <button v-if="selectedCharacter.存档.云端同步信息?.需要同步" class="btn-sync">同步云端</button>
                  </div>
                </div>

                <div v-else class="save-empty">
                  <div class="empty-slot-icon">☁️</div>
                  <span class="empty-text">尚未开始修行</span>
                  <button @click="handleSelect(selectedCharId!, '存档', false)" class="btn-start">开始游戏</button>
                </div>
              </div>
            </div>
          </section>

          <!-- 第3行：底部信息栏（可选） -->
          <div class="grid-footer-left">
            <!-- 预留底部区域 -->
          </div>
          <div class="grid-footer-right">
            <!-- 预留底部区域 -->
          </div>
        </div>
      </div>
    </main>

    <!-- 角色详情弹窗 -->
    <div v-if="showDetailsModal" class="modal-overlay" @click="closeDetailsModal">
      <div class="details-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ detailsCharacter?.角色基础信息.名字 }} - 详细信息</h3>
          <button @click="closeDetailsModal" class="btn-close">×</button>
        </div>

        <div v-if="detailsCharacter" class="modal-content">
          <div class="details-grid">
            <div class="detail-section">
              <h4>基础信息</h4>
              <div class="detail-items">
                <div class="detail-item">
                  <span class="label">道号</span>
                  <span class="value">{{ detailsCharacter.角色基础信息.名字 }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">世界</span>
                  <span class="value">{{ getFieldName(detailsCharacter.角色基础信息.世界) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">天资</span>
                  <span class="value">{{ getFieldName(detailsCharacter.角色基础信息.天资) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">出身</span>
                  <span class="value">{{ getFieldName(detailsCharacter.角色基础信息.出生) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">灵根</span>
                  <span class="value">{{ getFieldName(detailsCharacter.角色基础信息.灵根) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">模式</span>
                  <span class="value">{{ detailsCharacter.模式 }}</span>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <h4>先天六司</h4>
              <div class="attributes-display">
                <HexagonChart
                  v-if="detailsCharacter.角色基础信息.先天六司"
                  :stats="convertToStats(detailsCharacter.角色基础信息.先天六司)"
                  :size="150"
                  :maxValue="10"
                />
              </div>
            </div>

            <div class="detail-section">
              <h4>天赋神通</h4>
              <div class="talents-list">
                <div v-if="detailsCharacter.角色基础信息.天赋?.length" class="talent-items">
                  <span
                    v-for="(talent, index) in detailsCharacter.角色基础信息.天赋"
                    :key="index"
                    class="talent-tag"
                    :title="getTalentDescription(talent)"
                  >
                    {{ getTalentName(talent) }}
                  </span>
                </div>
                <span v-else class="no-talents">暂无天赋</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCharacterStore } from '@/stores/characterStore';
import HexagonChart from '@/components/common/HexagonChart.vue';
import VideoBackground from '@/components/common/VideoBackground.vue';
import { ArrowLeft, Download, Upload, History, Clock } from 'lucide-vue-next';
import type { CharacterProfile, SaveSlot } from '@/types/game';
import "@/style.css";
import { formatRealmWithStage } from '@/utils/realmUtils';
import { toast } from '@/utils/toast';

interface Props {
  fullscreen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  fullscreen: false
});

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'login'): void;
  (e: 'close'): void;
  (e: 'character-selected', character: CharacterProfile): void;
}>();

const isFullscreen = computed(() => props.fullscreen);

const router = useRouter();
const characterStore = useCharacterStore();
// 临时：管理面板不再校验登录状态，默认视为已登录
const isLoggedIn = ref(true);
const selectedCharId = ref<string | null>(null);
const showDetailsModal = ref(false);
const detailsCharacter = ref<CharacterProfile | null>(null);
const promptInput = ref<HTMLInputElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const isCharacterPanelOpen = ref(false);
const loading = ref(false);
const isLoadingSaves = ref(false); // 新增：用于控制存档加载状态
const importMode = ref<'character' | 'saves'>('character');

// 响应式屏幕尺寸检测
const screenWidth = ref(window.innerWidth);

// 监听屏幕尺寸变化
const updateScreenWidth = () => {
  screenWidth.value = window.innerWidth;

  // 根据屏幕尺寸调整面板状态
  if (screenWidth.value > 768) {
    // 桌面端：始终显示面板
    isCharacterPanelOpen.value = true;
  } else if (screenWidth.value <= 480) {
    // 小屏手机：默认关闭面板，避免遮挡主要内容
    isCharacterPanelOpen.value = false;
  }
};

onMounted(async () => {
  window.addEventListener('resize', updateScreenWidth);
  updateScreenWidth(); // 初始化时设置

  // 预加载所有角色的存档数据以正确显示存档数量
  const characterIds = Object.keys(characterStore.rootState.角色列表);
  for (const charId of characterIds) {
    try {
      await characterStore.loadCharacterSaves(charId);
    } catch (error) {
      console.warn(`[CharacterManagement] 预加载角色 ${charId} 存档失败:`, error);
    }
  }

  // 自动选中第一个角色（如果存在）
  const firstCharId = characterIds[0];
  if (firstCharId) {
    selectCharacter(firstCharId);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', updateScreenWidth);
});

// 自定义对话框状态
const modalState = ref({
  show: false,
  type: 'alert' as 'alert' | 'confirm' | 'prompt',
  title: '',
  message: '',
  inputValue: '',
  placeholder: '',
  onConfirm: (() => {}) as (() => void) | ((value: string) => void),
  onCancel: () => {}
});

// 暂停登录校验：避免进入"续前世因缘"时阻断
// verifyStoredToken().then(result => {
//   isLoggedIn.value = result;
// });

// 计算属性
const allCharacterCount = computed(() => Object.keys(characterStore.rootState.角色列表).length);

const selectedCharacter = computed(() => {
  if (!selectedCharId.value) return null;
  return characterStore.rootState.角色列表[selectedCharId.value];
});

// 移动端判断
const isMobile = computed(() => screenWidth.value <= 768);

// 方法
const toggleCharacterPanel = () => {
  isCharacterPanelOpen.value = !isCharacterPanelOpen.value;
};

const selectCharacter = async (charId: string) => {
  if (selectedCharId.value === charId) return; // 如果已经是选中角色，则不重复加载

  selectedCharId.value = charId;
  isLoadingSaves.value = true; // 开始加载

  console.log('[CharacterManagement] 开始选择角色:', charId);

  try {
    // 🔥 核心变更：按需加载所选角色的存档数据
    await characterStore.loadCharacterSaves(charId);

    // 调试：检查加载后的存档数据
    const profile = characterStore.rootState.角色列表[charId];
    if (profile?.存档列表) {
      console.log('[CharacterManagement] 存档加载完成，存档列表:', Object.keys(profile.存档列表));
      Object.entries(profile.存档列表).forEach(([key, slot]: [string, any]) => {
        console.log(`  - ${key}: 有数据=${!!slot.存档数据}`);
      });
    } else {
      console.warn('[CharacterManagement] ⚠️ 角色没有存档列表');
    }
  } catch (error) {
    console.error('[CharacterManagement] 加载存档数据失败:', error);
    toast.error('加载存档数据失败');
  } finally {
    isLoadingSaves.value = false; // 结束加载
  }

  // 在移动端选择角色后自动关闭面板
  if (isMobile.value) {
    isCharacterPanelOpen.value = false;
  }
};

const getSaveCount = (profile: CharacterProfile) => {
  if (profile.模式 === '单机') {
    // 排除"上次对话"，只统计手动存档
    const saves = Object.entries(profile.存档列表 || {})
      .filter(([key, slot]: [string, SaveSlot]) => key !== '上次对话' && slot.存档数据);
    return saves.length;
  } else {
    return profile.存档?.存档数据 ? 1 : 0;
  }
};

const showCharacterDetails = (charId: string) => {
  detailsCharacter.value = characterStore.rootState.角色列表[charId];
  showDetailsModal.value = true;
};

const closeDetailsModal = () => {
  showDetailsModal.value = false;
  detailsCharacter.value = null;
};

const handleSelect = async (charId: string, slotKey: string, hasData: boolean) => {
  console.log('选择存档:', charId, slotKey, hasData);
  const character = characterStore.rootState.角色列表[charId];

  if (hasData) {
    // 对于有数据的存档，直接进入
    console.log('加载存档...');
    // 加载存档并跳转到游戏
    const success = await characterStore.loadGame(charId, slotKey);
    console.log('加载结果:', success);
    if (success) {
      console.log('跳转到游戏界面...');
      if (props.fullscreen) {
        emit('character-selected', character);
      } else {
        router.push('/game');
      }
    } else {
      console.error('存档加载失败');
    }
  } else {
    // 对于空存档，显示确认对话框
    const isAutoSave = slotKey === '上次对话';
    const title = isAutoSave ? '创建新存档' : '开启新征程';
    const message = isAutoSave
      ? `是否在【${slotKey}】位置创建新的存档开始游戏？`
      : `是否在存档位 \"${slotKey}\" 开始一段新的修行？`;

    showConfirm(
      title,
      message,
      async () => {
        console.log('确认创建新存档...');
        // 加载存档并跳转到游戏
        const success = await characterStore.loadGame(charId, slotKey);
        console.log('新存档加载结果:', success);
        if (success) {
          console.log('跳转到游戏界面...');
          if (props.fullscreen) {
            emit('character-selected', character);
          } else {
            router.push('/game');
          }
        }
      }
    );
  }
};

const handleDeleteCharacter = (charId: string) => {
  const charName = characterStore.rootState.角色列表[charId]?.角色基础信息.名字;
  showConfirm(
    '删除角色',
    `确定要彻底删除角色\"${charName}\"及其所有修行记录吗？此操作不可恢复。`,
    async () => {
      // 🔥 修复：如果删除的是当前选中的角色，先清空选中状态
      if (selectedCharId.value === charId) {
        selectedCharId.value = null;
      }

      // 然后执行删除操作
      await characterStore.deleteCharacter(charId);
    }
  );
};

const handleDeleteSave = (charId: string, slotKey: string) => {
  const character = characterStore.rootState.角色列表[charId];
  const charName = character?.角色基础信息.名字;
  const saveName = slotKey === '上次对话' ? '上次对话存档' : slotKey;

  // 检查是否可以删除存档
  if (!canDeleteSave(character, slotKey)) {
    showAlert(
      '无法删除存档',
      '无法删除该存档：角色至少需要保留一个存档。如需删除，请先创建其他存档或删除整个角色。'
    );
    return;
  }

  showConfirm(
    '删除存档',
    `确定要删除角色\"${charName}\"的\"${saveName}\"吗？此操作不可恢复。`,
    () => {
      characterStore.deleteSave(charId, slotKey);
    }
  );
};

// 检查是否可以删除存档的逻辑
const canDeleteSave = (character: CharacterProfile | null, slotKey: string): boolean => {
  if (!character || character.模式 === '联机') {
    return false;
  }

  // 自动存档不可删除
  if (slotKey === '上次对话' || slotKey === '时间点存档') {
    return false;
  }

  const savesList = character.存档列表 || {};
  // 统计有数据的手动存档数量
  const manualSavesWithData = Object.entries(savesList).filter(
    ([key, save]) => key !== '上次对话' && key !== '时间点存档' && save.存档数据
  ).length;

  // 如果要删除的存档是最后一个有数据的手动存档，则不允许删除
  const targetSave = savesList[slotKey];
  if (targetSave?.存档数据 && manualSavesWithData <= 1) {
    return false;
  }

  return true;
};

// 获取删除按钮的提示文本
const getDeleteTooltip = (character: CharacterProfile | null, slotKey: string): string => {
  if (slotKey === '上次对话') {
    return '上次对话存档不可删除（用于回滚）';
  }
  if (slotKey === '时间点存档') {
    return '时间点存档不可删除（定时自动覆盖）';
  }
  if (!canDeleteSave(character, slotKey)) {
    return '无法删除：至少需要保留一个手动存档';
  }
  return '删除存档';
};

const getAllSaves = (character: CharacterProfile | null): Record<string, SaveSlot> => {
  if (!character?.存档列表) return {} as Record<string, SaveSlot>;
  // 返回所有存档，不做过滤
  return character.存档列表;
};

const handleEditSaveName = (charId: string, slotKey: string) => {
  const currentSave = characterStore.rootState.角色列表[charId]?.存档列表?.[slotKey];
  const currentName = currentSave?.存档名 || slotKey;

  showPrompt(
    '重命名存档',
    '请输入新的存档名称：',
    currentName,
    '',
    async (newName) => {
      if (newName && newName.trim() && newName.trim() !== currentName) {
        const cleanName = newName.trim();

        const existingSaves = characterStore.rootState.角色列表[charId]?.存档列表;
        if (existingSaves && cleanName !== slotKey && existingSaves[cleanName]) {
          showAlert('重命名失败', '存档名称已存在，请使用其他名称。');
          return;
        }

        await characterStore.renameSave(charId, slotKey, cleanName);
      }
    }
  );
};

const goBack = () => {
  emit('back'); // Still emit for internal logic, but also close via store
};

const handleClose = () => {
  if (props.fullscreen) {
    emit('close');
  } else {
    goBack();
  }
};

const handleLogin = () => {
  emit('login');
};

// 境界显示：统一为“境界+阶段”（初期/中期/后期/圆满），凡人不加阶段
const getRealmName = (realm: unknown): string => {
  return formatRealmWithStage(realm as { 境界: string; 境界等级?: number; 阶段?: string } | null);
};

// 格式化时间
const formatTime = (timeStr: string | null): string => {
  if (!timeStr) return '未保存';
  const date = new Date(timeStr);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 转换先天六司
const convertToStats = (innateAttrs: Record<string, number>) => {
  return {
    root_bone: innateAttrs['根骨'] || 0,
    spirituality: innateAttrs['灵性'] || 0,
    comprehension: innateAttrs['悟性'] || 0,
    fortune: innateAttrs['气运'] || 0,
    charm: innateAttrs['魅力'] || 0,
    temperament: innateAttrs['心性'] || 0
  };
};

// 获取天赋名称（兼容字符串和对象格式）
const getTalentName = (talent: string | { 名称: string; 描述?: string } | { name: string; description?: string }): string => {
  if (typeof talent === 'string') return talent;
  if (talent && typeof talent === 'object') {
    return (talent as { 名称?: string; name?: string }).名称 || (talent as { 名称?: string; name?: string }).name || '未知天赋';
  }
  return '未知天赋';
};

// 获取天赋描述（兼容字符串和对象格式）
const getTalentDescription = (talent: string | { 名称: string; 描述?: string } | { name: string; description?: string }): string => {
  if (typeof talent === 'string') return `天赋《${talent}》`;
  if (talent && typeof talent === 'object') {
    const desc = (talent as { 描述?: string; description?: string }).描述 || (talent as { 描述?: string; description?: string }).description || '';
    const name = getTalentName(talent as string | { 名称: string; 描述?: string } | { name: string; description?: string });
    return desc || `天赋《${name}》`;
  }
  return '未知天赋';
};

// 通用字段名称获取（兼容字符串和对象格式 { 名称, 描述 } 或 { name, description }）
const getFieldName = (field: string | { 名称?: string; name?: string; 名字?: string } | null): string => {
  if (!field) return '未知';
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field !== null) {
    return field.名称 || field.name || field.名字 || '未知';
  }
  return '未知';
};

// --- 自定义对话框逻辑 ---

const showAlert = (title: string, message: string, onConfirm?: () => void) => {
  modalState.value = {
    show: true,
    type: 'alert',
    title,
    message,
    inputValue: '',
    placeholder: '',
    onConfirm: () => {
      if (onConfirm) onConfirm();
      closeModal();
    },
    onCancel: closeModal
  };
};

const showConfirm = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
  modalState.value = {
    show: true,
    type: 'confirm',
    title,
    message,
    inputValue: '',
    placeholder: '',
    onConfirm: () => {
      onConfirm();
      closeModal();
    },
    onCancel: () => {
      if (onCancel) onCancel();
      closeModal();
    }
  };
};

const showPrompt = (title: string, message: string, initialValue = '', placeholder = '', onConfirm: (value: string) => void, onCancel?: () => void) => {
  modalState.value = {
    show: true,
    type: 'prompt',
    title,
    message,
    inputValue: initialValue,
    placeholder,
    onConfirm: (value: string) => {
      onConfirm(value || '');
      closeModal();
    },
    onCancel: () => {
      if (onCancel) onCancel();
      closeModal();
    }
  };
  nextTick(() => {
    promptInput.value?.focus();
  });
};

const handleModalConfirm = () => {
  if (modalState.value.type === 'prompt') {
    (modalState.value.onConfirm as (value: string) => void)(modalState.value.inputValue);
  } else {
    (modalState.value.onConfirm as () => void)();
  }
};

const handleModalCancel = () => {
  modalState.value.onCancel();
  closeModal();
};

const closeModal = () => {
  modalState.value.show = false;
};

// 导出角色
const exportCharacter = (charId: string) => {
  try {
    const character = characterStore.rootState.角色列表[charId];
    if (!character) {
      toast.error('角色不存在');
      return;
    }

    const exportData = {
      ...character,
      exportTime: new Date().toISOString(),
      version: '1.0.0',
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `大道朝天-${character.角色基础信息.名字}-角色备份-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    toast.success(`角色 "${character.角色基础信息.名字}" 已导出`);
  } catch (error) {
    console.error('导出角色失败', error);
    toast.error('导出角色失败');
  }
};

// 导出存档
const exportSaves = () => {
  if (!selectedCharacter.value) {
    toast.error('请先选择一个角色');
    return;
  }
  try {
    const character = selectedCharacter.value;
    const savesToExport = Object.values(character.存档列表 || {}).filter((slot: SaveSlot) => slot.存档数据);

    if (savesToExport.length === 0) {
      toast.info('该角色没有可导出的存档');
      return;
    }

    const exportData = {
      saves: savesToExport,
      exportTime: new Date().toISOString(),
      version: '1.0.0',
      characterName: character.角色基础信息.名字,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `大道朝天-${character.角色基础信息.名字}-存档备份-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    toast.success('存档已导出');
  } catch (error) {
    console.error('导出失败', error);
    toast.error('导出存档失败');
  }
};

// 导入存档
const importSaves = () => {
  if (!selectedCharacter.value) {
    toast.error('请先选择一个角色以导入存档');
    return;
  }
  importMode.value = 'saves';
  fileInput.value?.click();
};

// 导入角色
const importCharacter = () => {
  importMode.value = 'character';
  fileInput.value?.click();
};

// 处理导入文件
const handleImportFile = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const resetInput = () => {
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  };

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (importMode.value === 'saves') {
      if (!data.saves || !Array.isArray(data.saves)) {
        throw new Error('文件格式无效，请选择一个存档文件。');
      }
      if (!selectedCharId.value || !selectedCharacter.value) {
        toast.error('请先选择一个角色以导入存档');
        resetInput();
        return;
      }

      const charId = selectedCharId.value;
      const charName = selectedCharacter.value.角色基础信息.名字;

      showConfirm(
        '导入存档',
        `确定要将 ${data.saves.length} 个存档导入到角色 "${charName}" 吗？同名存档将被覆盖。`,
        async () => {
          loading.value = true;
          try {
            for (const save of data.saves) {
              await characterStore.importSave(charId, save);
            }
            toast.success(`成功为角色 "${charName}" 导入 ${data.saves.length} 个存档`);
            // 重新加载存档以更新UI
            await selectCharacter(charId);
          } catch (error) {
            console.error('导入存档失败', error);
            toast.error('导入存档失败: ' + (error as Error).message);
          } finally {
            loading.value = false;
            resetInput();
          }
        },
        resetInput
      );
    } else if (importMode.value === 'character') {
      if (!data.角色基础信息 || !data.模式) {
        throw new Error('文件格式无效，请选择一个角色文件。');
      }
      const charName = data.角色基础信息?.名字 || '未知角色';

      showConfirm(
        '导入角色',
        `确定要导入角色 "${charName}" 吗？`,
        async () => {
          loading.value = true;
          try {
            await characterStore.importCharacter(data);
            toast.success(`成功导入角色 "${charName}"`);
          } catch (error) {
            console.error('导入角色失败', error);
            toast.error('导入角色失败: ' + (error as Error).message);
          } finally {
            loading.value = false;
            resetInput();
          }
        },
        resetInput
      );
    }
  } catch (error) {
    console.error('处理导入文件失败', error);
    toast.error('处理导入文件失败: ' + (error as Error).message);
    resetInput();
  }
};
</script>

<style scoped>
/* Unified style tokens for Character Management */
.character-management-panel {
  --cm-radius-sm: 6px;
  --cm-radius-md: 8px;
  --cm-radius-lg: 12px;
  --cm-gap-xs: 0.25rem;
  --cm-gap-sm: 0.5rem;
  --cm-gap-md: 0.8rem;
  --cm-gap-lg: 1rem;
  --cm-border-width: 1px;
  --cm-border-strong: 2px;
  --cm-divider-width: 2px;
  /* Card sizing tokens */
  --cm-card-min-h: 92px;
  --cm-card-padding: 0.9rem;
  --cm-avatar-size: 36px;
  --cm-header-gap: 0.75rem;
  --cm-name-font: 1rem;
  --cm-meta-font: 0.8rem;
  --cm-save-count-minw: 36px;
  --cm-save-count-count-font: 1.05rem;
  --cm-save-count-label-font: 0.7rem;
}
/* 基础样式重置 */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* 自定义对话框样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 20, 30, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  transition: opacity 0.3s ease;
}

.dialog-box {
  background: var(--color-surface-transparent);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  color: var(--color-text);
  transform: scale(0.95);
  opacity: 0;
  animation: dialog-fade-in 0.3s forwards;
}

@keyframes dialog-fade-in {
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.dialog-title {
  font-size: 1.5rem;
  color: var(--color-accent);
  margin: 0 0 1rem 0;
  font-weight: 600;
}

.dialog-message {
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin: 0 0 1.5rem 0;
  line-height: 1.6;
}

.dialog-input {
  width: 100%;
  padding: 0.8rem 1rem;
  background: var(--color-background-transparent);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 1rem;
  margin-bottom: 1.5rem;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.dialog-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.2);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.btn-dialog-confirm,
.btn-dialog-cancel {
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-dialog-confirm {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.btn-dialog-confirm:hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
}

.btn-dialog-cancel {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-dialog-cancel:hover {
  background: var(--color-background);
}

/* 主容器样式 */
.character-management-panel {
  width: 100%;
  height: 100%;
  background: var(--color-background);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.character-management-panel.fullscreen {
  background: var(--color-background);
}

/* 全屏模式头部 */
.fullscreen-header {
  position: relative;
  z-index: 10;
  padding: 2rem;
  background: var(--color-surface-transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fullscreen-back-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.fullscreen-back-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
  border-color: var(--color-primary);
}

.fullscreen-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
}

.fullscreen-title h1 {
  font-family: var(--font-family-serif);
  font-size: 2.5rem;
  font-weight: 500;
  letter-spacing: 0.3em;
  color: var(--color-text);
  text-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.4);
  margin: 0 0 0.5rem 0;
  padding-left: 0.3em;
}

.fullscreen-title p {
  font-size: 1rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.1em;
  opacity: 0.8;
  margin: 0;
}

/* 主体内容 */
.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.main-content.fullscreen-content {
  position: relative;
  flex: 1;
  overflow: hidden;
}

/* 移动端头部导航 */
.mobile-header {
  display: none;
  background: var(--color-surface-transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  padding: 1rem;
  align-items: center;
  gap: 1rem;
  position: sticky;
  top: 0;
  z-index: 100;
}

.mobile-menu-btn {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.8rem 1rem;
  background: linear-gradient(135deg,
    rgba(var(--color-surface-rgb), 0.8),
    rgba(var(--color-background-rgb), 0.6)
  );
  backdrop-filter: blur(10px);
  border: 2px solid rgba(var(--color-border-rgb), 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  font-weight: 600;
  position: relative;
  overflow: hidden;
}

.mobile-menu-btn:hover {
  background: linear-gradient(135deg,
    rgba(var(--color-surface-rgb), 0.9),
    rgba(var(--color-background-rgb), 0.7)
  );
  color: var(--color-primary);
  border-color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.2);
}

.mobile-menu-btn.active {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: white;
  border-color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.4);
}

.hamburger {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 16px;
  height: 12px;
}

.hamburger span {
  display: block;
  height: 2px;
  width: 100%;
  background: currentColor;
  border-radius: 1px;
  transition: transform 0.2s ease;
}

.mobile-menu-btn.active .hamburger span:nth-child(1) {
  transform: rotate(45deg) translate(3px, 3px);
}

.mobile-menu-btn.active .hamburger span:nth-child(2) {
  opacity: 0;
}

.mobile-menu-btn.active .hamburger span:nth-child(3) {
  transform: rotate(-45deg) translate(3px, -3px);
}

.mobile-title {
  flex: 1;
  min-width: 0; /* Allow shrinking and text-overflow to work */
}

.mobile-title h2 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--color-text);
  font-weight: 600;
}

.mobile-title .selected-info {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-top: 0.2rem;
  /* Fix for vertical text issue on small screens */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1100;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h2 {
  color: var(--color-accent);
  margin-bottom: 0.5rem;
}

.empty-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-create, .btn-import {
  padding: 1rem 2rem;
  color: white;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-create {
  background: linear-gradient(135deg, var(--color-success), var(--color-info));
  border: 1px solid var(--color-success);
}

.btn-create:hover {
  transform: scale(1.05);
}

.btn-import {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  border: 1px solid var(--color-primary);
}

.btn-import:hover {
  transform: scale(1.05);
}

/* 管理布局 - 3行2列网格 */
.management-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

/* 3行2列网格布局 - 简洁版本 */
.grid-container {
  display: grid;
  grid-template-columns: 320px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header-left header-right"
    "content-left content-right"
    "footer-left footer-right";
  height: 100%;
  overflow: hidden;
  /* 使用单一垂直分割线 */
  position: relative;
}

/* 统一的垂直分割线 */
.grid-container::before {
  content: '';
  position: absolute;
  left: 320px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-primary);
  z-index: 10;
}

/* 标题栏 - 简化样式 */
.grid-header-left, .grid-header-right {
  padding: 0.8rem 1rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.grid-header-left h2, .grid-header-right h2 {
  margin: 0;
  font-size: 1rem;
  color: var(--color-text);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.btn-header-action {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.8rem;
  border: 1px solid;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s ease;
  background: var(--color-surface);
  flex-shrink: 0;
}

.btn-header-action.import {
  color: var(--color-info);
  border-color: rgba(var(--color-info-rgb), 0.4);
}

.btn-header-action.import:hover {
  background: rgba(var(--color-info-rgb), 0.1);
  border-color: var(--color-info);
}

.character-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-background);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* 右侧标题栏布局 */
.header-left-content {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
  min-width: 0;
}

.selected-char-info {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  background: linear-gradient(135deg,
    rgba(var(--color-primary-rgb), 0.1),
    rgba(var(--color-accent-rgb), 0.05)
  );
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: fit-content;
}

/* 存档操作按钮组 */
.save-actions-buttons {
  display: flex;
  gap: 0.6rem;
  flex-shrink: 0;
}

.btn-save-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border: 2px solid;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg,
    rgba(var(--color-surface-rgb), 0.8),
    rgba(var(--color-background-rgb), 0.6)
  );
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.btn-save-action.export {
  color: var(--color-success);
  border-color: rgba(var(--color-success-rgb), 0.4);
}

.btn-save-action.export:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--color-success), rgba(var(--color-success-rgb), 0.8));
  color: white;
  border-color: var(--color-success);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--color-success-rgb), 0.3);
}

.btn-save-action.import {
  color: var(--color-info);
  border-color: rgba(var(--color-info-rgb), 0.4);
}

.btn-save-action.import:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--color-info), rgba(var(--color-info-rgb), 0.8));
  color: white;
  border-color: var(--color-info);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--color-info-rgb), 0.3);
}

.btn-save-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

.btn-save-action:disabled:hover {
  transform: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

/* 内容区域 - 简化样式 */
.grid-content-left, .grid-content-right {
  background: var(--color-background);
}

/* 底部区域 */
.grid-footer-left, .grid-footer-right {
  min-height: 0;
}

/* 角色面板 - 简化 */
.characters-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.characters-grid {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

/* 角色卡片 - 简化紧凑设计 */
.character-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.6rem;
  margin-bottom: 0.4rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.character-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 1px 4px rgba(var(--color-primary-rgb), 0.2);
}

.character-card.active {
  border-color: var(--color-success);
  background: rgba(var(--color-success-rgb), 0.05);
}

.character-card.single-mode {
  border-left: 3px solid var(--color-success);
}

.character-card.online-mode {
  border-left: 3px solid var(--color-primary);
}

/* 卡片头部 - 简化 */
.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.char-avatar {
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: white;
  font-size: 0.8rem;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--color-success), var(--color-info));
}

.char-avatar.联机 {
  background: linear-gradient(135deg, var(--color-primary), var(--color-info));
}

.mode-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: var(--color-warning);
  border-radius: 50%;
  font-size: 0.45rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  border: 1px solid var(--color-background);
}

.char-info {
  flex: 1;
  min-width: 0;
}

.char-name {
  margin: 0 0 0.1rem 0;
  font-size: 0.85rem;
  color: var(--color-text);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.char-meta {
  display: flex;
  gap: 0.3rem;
  font-size: 0.65rem;
  color: var(--color-text-secondary);
}

.save-count {
  text-align: center;
  flex-shrink: 0;
  min-width: 28px;
}

.save-count .count {
  display: block;
  font-size: 0.9rem;
  font-weight: bold;
  color: var(--color-accent);
  line-height: 1;
}

.save-count .label {
  font-size: 0.6rem;
  color: var(--color-text-secondary);
  line-height: 1;
}

/* 卡片操作 - 简化按钮 */
.card-actions {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}

.btn-details, .btn-export, .btn-delete {
  flex: 1;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 500;
  transition: all 0.2s ease;
  background: var(--color-background);
}

.btn-details {
  color: var(--color-info);
  border-color: var(--color-info);
}

.btn-details:hover {
  background: var(--color-info);
  color: white;
}

.btn-export {
  color: var(--color-success);
  border-color: var(--color-success);
}

.btn-export:hover {
  background: var(--color-success);
  color: white;
}

.btn-delete {
  color: var(--color-error);
  border-color: var(--color-error);
}

.btn-delete:hover {
  background: var(--color-error);
  color: white;
}

/* 右侧存档面板 - 简化 */
.saves-panel {
  background: var(--color-background);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* 无选择状态 */
.no-selection {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
}

.no-selection-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

/* 新增：加载存档样式 */
.loading-saves {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(var(--color-primary-rgb), 0.2);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 存档容器 */
.saves-container, .online-saves-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem;
  height: 0;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: rgba(var(--color-primary-rgb), 0.3) transparent;
}

.saves-container::-webkit-scrollbar,
.online-saves-container::-webkit-scrollbar {
  width: 6px;
}

.saves-container::-webkit-scrollbar-track,
.online-saves-container::-webkit-scrollbar-track {
  background: transparent;
}

.saves-container::-webkit-scrollbar-thumb,
.online-saves-container::-webkit-scrollbar-thumb {
  background: rgba(var(--color-primary-rgb), 0.3);
  border-radius: 3px;
}

.saves-container::-webkit-scrollbar-thumb:hover,
.online-saves-container::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--color-primary-rgb), 0.5);
}

.saves-section {
  overflow-y: auto;
  overflow-x: hidden;
  max-height: 100%;
}

/* 上次对话存档区域 */
.auto-saves-section {
  margin-bottom: 1.5rem;
}

.auto-saves-section h3 {
  margin: 0 0 0.8rem 0;
  color: var(--color-warning);
  font-size: 1rem;
  font-weight: 600;
}

.auto-saves-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

/* 手动存档区域 */
.manual-saves-section {
  margin-bottom: 1rem;
}

.manual-saves-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
}

.manual-saves-header h3 {
  margin: 0;
  color: var(--color-warning);
  font-size: 1rem;
  font-weight: 600;
}

.save-info-text {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-style: italic;
}

.manual-saves-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: rgba(var(--color-primary-rgb), 0.3) transparent;
}

.manual-saves-grid::-webkit-scrollbar {
  width: 6px;
}

.manual-saves-grid::-webkit-scrollbar-track {
  background: transparent;
}

.manual-saves-grid::-webkit-scrollbar-thumb {
  background: rgba(var(--color-primary-rgb), 0.3);
  border-radius: 3px;
}

.manual-saves-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--color-primary-rgb), 0.5);
}

/* 存档卡片 */
.save-card, .online-save-card {
  background: linear-gradient(135deg,
    rgba(var(--color-surface-rgb), 0.9),
    rgba(var(--color-background-rgb), 0.7)
  );
  backdrop-filter: blur(15px);
  border: 2px solid rgba(var(--color-border-rgb), 0.6);
  border-radius: 8px;
  padding: 0.9rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--color-text);
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.save-card::before, .online-save-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg,
    rgba(var(--color-primary-rgb), 0.06),
    rgba(var(--color-accent-rgb), 0.03)
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 8px;
}

.save-card:hover::before, .online-save-card:hover::before {
  opacity: 1;
}

.save-card:hover, .online-save-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow:
    0 4px 15px rgba(var(--color-primary-rgb), 0.15),
    0 2px 8px rgba(0, 0, 0, 0.08);
}

.save-card.has-data {
  border-left: 4px solid var(--color-success);
  border-color: rgba(var(--color-success-rgb), 0.8);
  position: relative;
}

.save-card.auto-save {
  border-left-color: var(--color-info);
  border-color: rgba(var(--color-info-rgb), 0.8);
}

.save-icon {
  display: inline-block;
  margin-right: 0.5rem;
  vertical-align: middle;
  position: relative;
  top: -1px;
}

.last-save-icon {
  color: var(--color-primary);
}

.time-save-icon {
  color: var(--color-warning);
}

.save-card.has-data::after {
  content: '';
  position: absolute;
  top: 0.7rem;
  right: 0.7rem;
  width: 6px;
  height: 6px;
  background: var(--color-success);
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(var(--color-success-rgb), 0.6);
}

/* 存档数据 */
.save-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
}

.save-name {
  margin: 0;
  font-size: 1rem;
  color: var(--color-warning);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.save-badges {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}

.realm-badge, .age-badge {
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
}

.realm-badge {
  background: rgba(var(--color-success-rgb), 0.15);
  color: var(--color-success);
}

.age-badge {
  background: rgba(var(--color-accent-rgb), 0.15);
  color: var(--color-accent);
}

/* 存档统计 */
.save-stats {
  margin-bottom: 0.8rem;
}

.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.stat {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  align-items: center;
}

.stat .label {
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}

.stat .value {
  color: var(--color-text);
  font-weight: 600;
  font-size: 0.8rem;
}

/* 存档底部 */
.save-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  padding-top: 0.6rem;
  border-top: 1px solid rgba(var(--color-border-rgb), 0.2);
}

.save-footer .location {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.sync-status {
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 600;
  font-size: 0.7rem;
}

.sync-status.synced {
  background: rgba(var(--color-success-rgb), 0.15);
  color: var(--color-success);
}

/* 空存档 */
.save-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--color-text-secondary);
  min-height: 100px;
}

.empty-slot-icon {
  font-size: 2rem;
  margin-bottom: 0.4rem;
  opacity: 0.6;
}

.empty-text {
  margin-bottom: 0.6rem;
  font-size: 0.9rem;
}

.empty-desc {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  opacity: 0.8;
}

.auto-save-desc {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  display: block;
  margin-top: 0.3rem;
}

/* 存档操作按钮 */
.save-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-edit-save,
.btn-delete-save {
  cursor: pointer;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;
  font-size: 0.7rem;
  font-weight: 600;
  border: 1px solid;
  backdrop-filter: blur(5px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-edit-save {
  background: rgba(var(--color-info-rgb), 0.1);
  border-color: rgba(var(--color-info-rgb), 0.3);
  color: var(--color-info);
}

.btn-edit-save:hover {
  background: rgba(var(--color-info-rgb), 0.2);
  border-color: rgba(var(--color-info-rgb), 0.5);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(var(--color-info-rgb), 0.2);
}

.btn-delete-save {
  background: rgba(var(--color-error-rgb), 0.1);
  border-color: rgba(var(--color-error-rgb), 0.3);
  color: var(--color-error);
}

.btn-delete-save:hover:not(.disabled):not(:disabled) {
  background: rgba(var(--color-error-rgb), 0.2);
  border-color: rgba(var(--color-error-rgb), 0.5);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(var(--color-error-rgb), 0.2);
}

.btn-delete-save.disabled,
.btn-delete-save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: rgba(128, 128, 128, 0.1) !important;
  border-color: rgba(128, 128, 128, 0.2) !important;
  color: #888 !important;
  transform: none !important;
  box-shadow: none !important;
}

/* 按钮样式 */
.btn-start, .btn-play, .btn-sync {
  padding: 0.6rem 1rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: white;
  border: 1px solid rgba(var(--color-primary-rgb), 0.5);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.25);
  position: relative;
  overflow: hidden;
}

.btn-start:hover, .btn-play:hover, .btn-sync:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.35);
}

.btn-start::before, .btn-play::before, .btn-sync::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
  transition: left 0.4s;
}

.btn-start:hover::before, .btn-play:hover::before, .btn-sync:hover::before {
  left: 100%;
}

/* 联机模式样式 */
.online-saves-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem;
  height: 0;
}

.login-prompt {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
}

.login-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.btn-login {
  padding: 0.8rem 1.5rem;
  background: var(--color-primary);
  color: white;
  border: 1px solid var(--color-primary-active);
  border-radius: 8px;
  cursor: pointer;
  margin-top: 1rem;
}

.online-save-card {
  background: linear-gradient(135deg,
    rgba(var(--color-surface-rgb), 0.9),
    rgba(var(--color-background-rgb), 0.7)
  );
  backdrop-filter: blur(15px);
  border: 2px solid rgba(var(--color-border-rgb), 0.6);
  border-radius: 8px;
  padding: 0.9rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--color-text);
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.online-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

/* 详情弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.details-modal {
  background: var(--color-surface-transparent);
  backdrop-filter: blur(20px);
  border-radius: 15px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid var(--color-border);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  color: var(--color-accent);
}

.btn-close {
  background: none;
  border: 1px solid var(--color-border);
  font-size: 1.5rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.1rem;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.modal-content {
  padding: 2rem;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.detail-section {
  background: linear-gradient(135deg,
    rgba(var(--color-primary-rgb), 0.08),
    rgba(var(--color-accent-rgb), 0.06)
  );
  border: 1px solid rgba(var(--color-primary-rgb), 0.15);
  border-radius: 10px;
  padding: 1.5rem;
  backdrop-filter: blur(8px);
}

.detail-section h4 {
  margin: 0 0 1rem 0;
  color: var(--color-warning);
}

.detail-items {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(var(--color-border-rgb), 0.3);
}

.detail-item .label {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.detail-item .value {
  color: var(--color-text);
  font-weight: 600;
}

.attributes-display {
  display: flex;
  justify-content: center;
}

.talents-list {
  min-height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.talent-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.talent-tag {
  background: rgba(var(--color-accent-rgb), 0.15);
  color: var(--color-accent);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
}

.no-talents {
  color: var(--color-text-secondary);
  font-style: italic;
  text-align: center;
}

/* 响应式适配 */
@media (max-width: 1200px) {
  .grid-container {
    grid-template-columns: 300px 1fr;
  }

  /* 调整分割线位置 */
  .grid-container::before {
    left: 300px;
  }

  .manual-saves-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
}

@media (max-width: 1024px) {
  .grid-container {
    grid-template-columns: 280px 1fr;
  }

  /* 调整分割线位置 */
  .grid-container::before {
    left: 280px;
  }

  .characters-panel {
    max-width: 260px;
  }

  .save-card, .online-save-card {
    padding: 0.8rem;
  }

  .details-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

@media (max-width: 640px) {
  .mobile-header {
    display: flex;
  }

  .character-management-panel {
    height: 100%;
    overflow: hidden;
  }

  .main-content {
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }

  .management-layout {
    flex-direction: column;
    height: 100%;
  }

  .grid-container {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
    grid-template-areas:
      "header-right"
      "content-main"
      "footer-main";
    order: 1;
  }

  /* 移动端隐藏垂直分割线 */
  .grid-container::before {
    display: none;
  }

  .grid-header-left {
    border-right: none;
    border-bottom: 1px solid var(--color-border);
    /* 手机端隐藏左侧标题栏 */
    display: none;
  }

  .grid-header-right {
    padding: 0.8rem;
    flex-direction: column;
    align-items: stretch;
    gap: 0.8rem;
  }

  .header-left-content {
    gap: 0.3rem;
  }

  .save-actions-buttons {
    width: 100%;
    gap: 0.5rem;
  }

  .btn-save-action {
    flex: 1;
    padding: 0.7rem 0.8rem;
    font-size: 0.8rem;
    justify-content: center;
  }

  .btn-save-action span {
    display: inline;
  }

  .grid-content-left,
  .grid-content-right {
    grid-area: content-main;
    position: relative;
    overflow: hidden;
    height: 100%;
  }

  .grid-footer-left,
  .grid-footer-right {
    grid-area: footer-main;
    border-right: none;
  }

  .characters-panel {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 85%;
    max-width: 280px;
    z-index: 1200;
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 30px rgba(0, 0, 0, 0.3);
    border: none;
    background: var(--color-surface);
    backdrop-filter: blur(20px);
    margin: 0;
    padding: 0;
    border-right: none;
  }

  .characters-panel.is-open {
    transform: translateX(0);
  }

  .saves-panel {
    width: 100%;
    border-left: none;
  }

  .saves-container, .online-saves-container {
    padding: 1rem 1.2rem;
    flex: 1;
    min-height: 0;
    max-height: none;
  }

  .auto-saves-grid {
    grid-template-columns: 1fr;
    gap: 0.8rem;
  }

  .manual-saves-grid {
    grid-template-columns: 1fr;
    gap: 0.8rem;
    max-height: 300px;
  }

  .modal-content {
    padding: 1rem;
  }

  .details-modal {
    width: 95%;
    max-height: 85vh;
  }

  .dialog-box {
    width: 95%;
    max-width: 400px;
    padding: 1.5rem;
  }

  .characters-grid {
    padding: 1rem;
  }

  .character-card {
    padding: 1rem;
    margin-bottom: 0.8rem;
    transition: all 0.2s ease;
  }

  .character-card:active {
    transform: scale(0.98);
    background: linear-gradient(135deg,
      rgba(var(--color-primary-rgb), 0.05),
      rgba(var(--color-accent-rgb), 0.03)
    );
  }

  .card-header {
    flex-wrap: wrap;
    gap: 0.8rem;
  }

  .char-info {
    min-width: 120px;
  }

  .char-meta {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}

@media (max-width: 640px) {
  .mobile-header {
    padding: 0.8rem 1rem;
  }

  .mobile-menu-btn {
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
    min-height: 44px;
    min-width: 44px;
  }

  .mobile-title h2 {
    font-size: 1.1rem;
  }

  .mobile-title .selected-info {
    font-size: 0.75rem;
  }

  .characters-panel {
    width: 90%;
    max-width: 300px;
  }

  .character-card {
    padding: 0.9rem;
    position: relative;
    overflow: hidden;
  }

  .character-card::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: rgba(var(--color-primary-rgb), 0.1);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: width 0.3s ease, height 0.3s ease;
    pointer-events: none;
  }

  .character-card:active::after {
    width: 200px;
    height: 200px;
  }

  .save-card, .online-save-card {
    padding: 1rem;
    position: relative;
    overflow: hidden;
  }

  .save-card::after, .online-save-card::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: rgba(var(--color-success-rgb), 0.1);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: width 0.3s ease, height 0.3s ease;
    pointer-events: none;
  }

  .save-card:active::after, .online-save-card:active::after {
    width: 150px;
    height: 150px;
  }

  .auto-saves-grid {
    gap: 0.6rem;
  }

  .manual-saves-grid {
    gap: 0.6rem;
  }
}

@media (max-width: 480px) {
  .empty-actions {
    flex-direction: column;
  }

  .btn-create, .btn-import {
    width: 100%;
  }

  .mobile-header {
    padding: 0.6rem 0.8rem;
  }

  .mobile-menu-btn {
    padding: 0.4rem 0.5rem;
    min-height: 44px;
    min-width: 44px;
  }

  .mobile-title h2 {
    font-size: 1rem;
  }

  .hamburger {
    width: 14px;
    height: 10px;
  }

  .characters-panel {
    width: 95%;
    max-width: 280px;
  }

  .characters-grid {
    padding: 0.8rem;
  }

  .character-card {
    padding: 0.8rem;
    margin-bottom: 0.8rem;
    min-height: 80px;
  }

  .btn-save-action span {
    font-size: 0.75rem;
  }

  .card-header {
    margin-bottom: 0.8rem;
    gap: 0.6rem;
  }

  .char-avatar {
    width: 40px;
    height: 40px;
    font-size: 1.1rem;
  }

  .mode-indicator {
    width: 16px;
    height: 16px;
    font-size: 0.6rem;
  }

  .char-name {
    font-size: 1rem;
  }

  .char-meta {
    font-size: 0.8rem;
  }

  .saves-container, .online-saves-container {
    padding: 0.8rem;
    flex: 1;
    min-height: 0;
    max-height: none;
  }

  .save-card, .online-save-card {
    padding: 0.9rem;
    min-height: 120px;
  }

  .stat-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .save-footer {
    flex-direction: column;
    gap: 0.3rem;
    align-items: flex-start;
  }

  .dialog-box {
    width: 95%;
    padding: 1.2rem;
    max-height: 90vh;
    overflow-y: auto;
  }

  .dialog-title {
    font-size: 1.3rem;
  }

  .dialog-actions {
    flex-direction: column-reverse;
    gap: 0.8rem;
  }

  .btn-dialog-confirm,
  .btn-dialog-cancel {
    width: 100%;
    padding: 0.8rem;
    min-height: 44px;
    font-size: 1rem;
  }

  .details-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .detail-section {
    padding: 1rem;
  }

  .btn-details, .btn-export, .btn-delete {
    min-height: 36px;
    font-size: 0.85rem;
    padding: 0.6rem 0.8rem;
  }

  .btn-start, .btn-play, .btn-sync {
    min-height: 40px;
    padding: 0.7rem 1rem;
    font-size: 0.85rem;
  }
}

@media (max-width: 360px) {
  .mobile-header {
    padding: 0.5rem;
  }

  .mobile-menu-btn {
    padding: 0.3rem 0.4rem;
    gap: 0.3rem;
    min-height: 40px;
    min-width: 40px;
  }

  .mobile-title h2 {
    font-size: 0.95rem;
  }

  .mobile-title .selected-info {
    font-size: 0.7rem;
  }

  .characters-panel {
    width: 100%;
    max-width: 260px;
    min-width: 240px;
  }

  .character-card {
    padding: 0.6rem;
    min-height: 70px;
  }

  .save-card, .online-save-card {
    padding: 0.8rem;
    min-height: 100px;
  }

  .save-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .save-badges {
    align-self: stretch;
    justify-content: flex-start;
  }

  .dialog-box {
    width: 98%;
    padding: 1rem;
    margin: 0.5rem;
    max-height: 95vh;
  }

  .dialog-title {
    font-size: 1.1rem;
  }

  .dialog-message {
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .dialog-input {
    padding: 0.7rem;
    font-size: 0.9rem;
  }

  .btn-dialog-confirm,
  .btn-dialog-cancel {
    padding: 0.7rem;
    font-size: 0.9rem;
    min-height: 40px;
  }

  .character-management-panel {
    height: 100%;
    overflow: hidden;
  }

  .main-content {
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }

  .saves-container, .online-saves-container {
    flex: 1;
    min-height: 0;
    padding: 0.6rem;
    max-height: none;
  }

  .char-name {
    font-size: 0.9rem;
  }

  .char-meta {
    font-size: 0.75rem;
  }

  .save-count .count {
    font-size: 1rem;
  }

  .save-count .label {
    font-size: 0.65rem;
  }
}

/* Style unification overrides */
/* Replace absolute divider with contextual borders */
.grid-container::before { content: none; }
.grid-header-left,
.grid-content-left,
.grid-footer-left {
  border-right: var(--cm-divider-width) solid var(--color-primary);
  box-sizing: border-box;
}

/* Ensure left column fills its grid cell at <=1024px (fix misaligned divider) */
@media (max-width: 1024px) {
  .grid-content-left.characters-panel {
    max-width: none;
    width: 100%;
  }
}

/* Consistent radii across controls */
.dialog-box { border-radius: var(--cm-radius-lg); }
.dialog-input { border-radius: var(--cm-radius-md); }
.btn-dialog-confirm,
.btn-dialog-cancel { border-radius: var(--cm-radius-md); }
.fullscreen-back-btn { border-radius: var(--cm-radius-md); }
.character-card { border-radius: var(--cm-radius-sm); }
.save-card,
.online-save-card { border-radius: var(--cm-radius-md); }
.btn-details,
.btn-delete { border-radius: var(--cm-radius-md); }
.btn-start,
.btn-play,
.btn-sync { border-radius: var(--cm-radius-md); }
.btn-login,
.btn-close { border-radius: var(--cm-radius-md); }

/* Desktop card density adjustments: make character list less flat */
@media (min-width: 769px) {
  .characters-grid { padding: 0.8rem; }
  .character-card {
    min-height: var(--cm-card-min-h);
    padding: var(--cm-card-padding);
  }
  .card-header {
    gap: var(--cm-header-gap);
    margin-bottom: 0.6rem;
  }
  .char-avatar {
    width: var(--cm-avatar-size);
    height: var(--cm-avatar-size);
    font-size: 0.95rem;
  }
  .char-name { font-size: var(--cm-name-font); }
  .char-meta { font-size: var(--cm-meta-font); }
  .save-count { min-width: var(--cm-save-count-minw); }
  .save-count .count { font-size: var(--cm-save-count-count-font); }
  .save-count .label { font-size: var(--cm-save-count-label-font); }
}
</style>
