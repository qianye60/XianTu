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
      
      <!-- 遮罩层 -->
      <div v-if="isCharacterPanelOpen" class="panel-overlay" @click="toggleCharacterPanel"></div>

      <!-- 无角色提示 -->
      <div v-if="Object.keys(characterStore.rootState.角色列表).length === 0" class="empty-state">
        <div class="empty-icon">🌟</div>
        <h2>道途未启</h2>
        <p>尚未创建任何法身，请返回道途开启修仙之旅</p>
        <button @click="goBack" class="btn-create">踏入仙途</button>
      </div>

      <!-- 角色管理界面 -->
      <div v-else class="management-layout">
        <!-- 左侧：角色列表 -->
        <section class="characters-panel" :class="{ 'is-open': isCharacterPanelOpen }">
          <div class="panel-header">
            <h2>角色列表</h2>
            <div class="character-count">{{ allCharacterCount }} 个角色</div>
          </div>

          <div class="characters-grid">
            <div v-for="(profile, charId) in characterStore.rootState.角色列表"
                 :key="charId"
                 class="character-card"
                 :class="{
                   'active': selectedCharId === charId,
                   'single-mode': profile.模式 === '单机',
                   'online-mode': profile.模式 === '联机'
                 }"
                 @click="selectCharacter(charId)">

              <!-- 卡片头部 -->
              <div class="card-header">
                <div class="char-avatar" :class="profile.模式">
                  <span class="avatar-text">{{ profile.角色基础信息.名字[0] }}</span>
                  <div class="mode-indicator">{{ profile.模式 === '单机' ? '单' : '联' }}</div>
                </div>
                <div class="char-info">
                  <h3 class="char-name">{{ profile.角色基础信息.名字 }}</h3>
                  <div class="char-meta">
                    <span class="world">{{ profile.角色基础信息.世界 }}</span>
                    <span class="talent">{{ profile.角色基础信息.天资 }}</span>
                  </div>
                </div>
                <div class="save-count">
                  <span class="count">{{ getSaveCount(profile) }}</span>
                  <span class="label">存档</span>
                </div>
              </div>

              <!-- 卡片底部操作 -->
              <div class="card-actions">
                <button @click.stop="showCharacterDetails(charId)" class="btn-details">详情</button>
                <button @click.stop="handleDeleteCharacter(charId)" class="btn-delete">删除</button>
              </div>
            </div>
          </div>
        </section>

        <!-- 右侧：存档详情 -->
        <section class="saves-panel">
          <div class="panel-header">
            <h2>存档管理</h2>
            <div v-if="selectedCharacter" class="selected-char-info">
              {{ selectedCharacter.角色基础信息.名字 }} - {{ selectedCharacter.模式 }}模式
            </div>
          </div>

          <!-- 未选择角色 -->
          <div v-if="!selectedCharacter" class="no-selection">
            <div class="no-selection-icon">📋</div>
            <p>请选择左侧角色查看存档详情</p>
          </div>

          <!-- 单机模式存档 -->
          <div v-else-if="selectedCharacter.模式 === '单机'" class="saves-container">
            <div class="saves-section">
              <!-- 自动存档区 -->
              <div class="auto-saves-section">
                <h3>自动存档</h3>
                <div class="auto-saves-grid">
                  <!-- 上次对话存档 -->
                  <div class="save-card auto-save"
                       :class="{ 'has-data': selectedCharacter.存档列表?.['上次对话']?.存档数据 }"
                       @click="selectedCharacter.存档列表?.['上次对话']?.存档数据 && handleSelect(selectedCharId!, '上次对话', true)"
                       :style="{ cursor: selectedCharacter.存档列表?.['上次对话']?.存档数据 ? 'pointer' : 'default' }">
                    <div v-if="selectedCharacter.存档列表?.['上次对话']?.存档数据" class="save-data">
                      <div class="save-header">
                        <h4 class="save-name">上次对话</h4>
                        <div class="save-badges">
                          <span class="realm-badge">{{ getRealmName(selectedCharacter.存档列表['上次对话'].存档数据.玩家角色状态?.境界) }}</span>
                          <span class="age-badge">{{ selectedCharacter.存档列表['上次对话'].存档数据.玩家角色状态?.寿命?.当前 || 18 }}岁</span>
                        </div>
                      </div>

                      <div class="save-stats">
                        <div class="stat-grid">
                          <div class="stat">
                            <span class="label">气血</span>
                            <span class="value">{{ selectedCharacter.存档列表['上次对话'].存档数据.玩家角色状态?.气血?.当前 || 0 }}/{{ selectedCharacter.存档列表['上次对话'].存档数据.玩家角色状态?.气血?.最大 || 0 }}</span>
                          </div>
                          <div class="stat">
                            <span class="label">灵气</span>
                            <span class="value">{{ selectedCharacter.存档列表['上次对话'].存档数据.玩家角色状态?.灵气?.当前 || 0 }}/{{ selectedCharacter.存档列表['上次对话'].存档数据.玩家角色状态?.灵气?.最大 || 0 }}</span>
                          </div>
                          <div class="stat">
                            <span class="label">神识</span>
                            <span class="value">{{ selectedCharacter.存档列表['上次对话'].存档数据.玩家角色状态?.神识?.当前 || 0 }}/{{ selectedCharacter.存档列表['上次对话'].存档数据.玩家角色状态?.神识?.最大 || 0 }}</span>
                          </div>
                          <div class="stat">
                            <span class="label">声望</span>
                            <span class="value">{{ selectedCharacter.存档列表['上次对话'].存档数据.玩家角色状态?.声望 || 0 }}</span>
                          </div>
                        </div>
                      </div>

                      <div class="save-footer">
                        <span class="location">{{ selectedCharacter.存档列表['上次对话'].存档数据.玩家角色状态?.位置?.描述 || '未知之地' }}</span>
                        <span class="save-time">{{ formatTime(selectedCharacter.存档列表['上次对话'].保存时间) }}</span>
                      </div>
                    </div>

                    <div v-else class="save-empty">
                      <div class="empty-slot-icon">🤖</div>
                      <span class="empty-text">暂无自动存档</span>
                      <span class="auto-save-desc">游戏会自动保存</span>
                    </div>
                  </div>

                  <!-- 快速存档 -->
                  <div class="save-card auto-save"
                       :class="{ 'has-data': selectedCharacter.存档列表?.['自动存档']?.存档数据 }"
                       @click="selectedCharacter.存档列表?.['自动存档']?.存档数据 && handleSelect(selectedCharId!, '自动存档', true)"
                       :style="{ cursor: selectedCharacter.存档列表?.['自动存档']?.存档数据 ? 'pointer' : 'default' }">
                    <div v-if="selectedCharacter.存档列表?.['自动存档']?.存档数据" class="save-data">
                      <div class="save-header">
                        <h4 class="save-name">自动存档</h4>
                        <div class="save-badges">
                          <span class="realm-badge">{{ getRealmName(selectedCharacter.存档列表['自动存档'].存档数据.玩家角色状态?.境界) }}</span>
                          <span class="age-badge">{{ selectedCharacter.存档列表['自动存档'].存档数据.玩家角色状态?.寿命?.当前 || 18 }}岁</span>
                        </div>
                      </div>

                      <div class="save-stats">
                        <div class="stat-grid">
                          <div class="stat">
                            <span class="label">气血</span>
                            <span class="value">{{ selectedCharacter.存档列表['自动存档'].存档数据.玩家角色状态?.气血?.当前 || 0 }}/{{ selectedCharacter.存档列表['自动存档'].存档数据.玩家角色状态?.气血?.最大 || 0 }}</span>
                          </div>
                          <div class="stat">
                            <span class="label">灵气</span>
                            <span class="value">{{ selectedCharacter.存档列表['自动存档'].存档数据.玩家角色状态?.灵气?.当前 || 0 }}/{{ selectedCharacter.存档列表['自动存档'].存档数据.玩家角色状态?.灵气?.最大 || 0 }}</span>
                          </div>
                          <div class="stat">
                            <span class="label">神识</span>
                            <span class="value">{{ selectedCharacter.存档列表['自动存档'].存档数据.玩家角色状态?.神识?.当前 || 0 }}/{{ selectedCharacter.存档列表['自动存档'].存档数据.玩家角色状态?.神识?.最大 || 0 }}</span>
                          </div>
                          <div class="stat">
                            <span class="label">声望</span>
                            <span class="value">{{ selectedCharacter.存档列表['自动存档'].存档数据.玩家角色状态?.声望 || 0 }}</span>
                          </div>
                        </div>
                      </div>

                      <div class="save-footer">
                        <span class="location">{{ selectedCharacter.存档列表['自动存档'].存档数据.玩家角色状态?.位置?.描述 || '未知之地' }}</span>
                        <span class="save-time">{{ formatTime(selectedCharacter.存档列表['自动存档'].保存时间) }}</span>
                      </div>
                    </div>

                    <div v-else class="save-empty">
                      <div class="empty-slot-icon">💾</div>
                      <span class="empty-text">暂无自动存档</span>
                      <span class="auto-save-desc">游戏会自动保存</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 手动存档区 - 仅单机模式显示 -->
              <div v-if="selectedCharacter.模式 === '单机'" class="manual-saves-section">
                <div class="manual-saves-header">
                  <h3>手动存档</h3>
                  <div class="save-info-text">
                    <span>存档通过游戏内保存功能创建</span>
                  </div>
                </div>

                <div class="manual-saves-grid">
                  <div v-for="(slot, slotKey) in getManualSaves(selectedCharacter)"
                       :key="slotKey"
                       class="save-card manual-save"
                       :class="{ 'has-data': slot.存档数据 }"
                       @click="slot.存档数据 && handleSelect(selectedCharId!, String(slotKey), true)"
                       :style="{ cursor: slot.存档数据 ? 'pointer' : 'default' }">

                     <div v-if="slot.存档数据" class="save-data">
                       <div class="save-header">
                         <h4 class="save-name">{{ slot.存档名 || slotKey }}</h4>
                        <div class="save-actions">
                          <button @click.stop="handleEditSaveName(selectedCharId!, String(slotKey))"
                                  class="btn-edit-save"
                                  title="重命名">编</button>
                          <button @click.stop="handleDeleteSave(selectedCharId!, String(slotKey))"
                                  class="btn-delete-save"
                                  :class="{ 'disabled': !canDeleteSave(selectedCharacter, String(slotKey)) }"
                                  :disabled="!canDeleteSave(selectedCharacter, String(slotKey))"
                                  :title="canDeleteSave(selectedCharacter, String(slotKey)) ? '删除存档' : '无法删除：至少需要保留一个存档'">删</button>
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
                            <span class="value">{{ slot.存档数据.玩家角色状态?.气血?.当前 || 0 }}/{{ slot.存档数据.玩家角色状态?.气血?.最大 || 0 }}</span>
                          </div>
                          <div class="stat">
                            <span class="label">灵气</span>
                            <span class="value">{{ slot.存档数据.玩家角色状态?.灵气?.当前 || 0 }}/{{ slot.存档数据.玩家角色状态?.灵气?.最大 || 0 }}</span>
                          </div>
                          <div class="stat">
                            <span class="label">神识</span>
                            <span class="value">{{ slot.存档数据.玩家角色状态?.神识?.当前 || 0 }}/{{ slot.存档数据.玩家角色状态?.神识?.最大 || 0 }}</span>
                          </div>
                          <div class="stat">
                            <span class="label">声望</span>
                            <span class="value">{{ slot.存档数据.玩家角色状态?.声望 || 0 }}</span>
                          </div>
                        </div>
                      </div>

                      <div class="save-footer">
                        <span class="location">{{ slot.存档数据.玩家角色状态?.位置?.描述 || '未知之地' }}</span>
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
                      <span class="value">{{ selectedCharacter.存档.存档数据.玩家角色状态?.气血?.当前 || 0 }}/{{ selectedCharacter.存档.存档数据.玩家角色状态?.气血?.最大 || 0 }}</span>
                    </div>
                    <div class="stat">
                      <span class="label">灵气</span>
                      <span class="value">{{ selectedCharacter.存档.存档数据.玩家角色状态?.灵气?.当前 || 0 }}/{{ selectedCharacter.存档.存档数据.玩家角色状态?.灵气?.最大 || 0 }}</span>
                    </div>
                    <div class="stat">
                      <span class="label">神识</span>
                      <span class="value">{{ selectedCharacter.存档.存档数据.玩家角色状态?.神识?.当前 || 0 }}/{{ selectedCharacter.存档.存档数据.玩家角色状态?.神识?.最大 || 0 }}</span>
                    </div>
                    <div class="stat">
                      <span class="label">声望</span>
                      <span class="value">{{ selectedCharacter.存档.存档数据.玩家角色状态?.声望 || 0 }}</span>
                    </div>
                  </div>
                </div>

                <div class="save-footer">
                  <span class="location">{{ selectedCharacter.存档.存档数据.玩家角色状态?.位置?.描述 || '未知之地' }}</span>
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
                  <span class="value">{{ detailsCharacter.角色基础信息.世界 }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">天资</span>
                  <span class="value">{{ detailsCharacter.角色基础信息.天资 }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">出身</span>
                  <span class="value">{{ detailsCharacter.角色基础信息.出生 }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">灵根</span>
                  <span class="value">{{ detailsCharacter.角色基础信息.灵根 }}</span>
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
                  <span v-for="talent in detailsCharacter.角色基础信息.天赋" :key="talent" class="talent-tag">
                    {{ talent }}
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
import { verifyStoredToken } from '@/services/request';
import HexagonChart from '@/components/common/HexagonChart.vue';
import VideoBackground from '@/components/common/VideoBackground.vue';
import { ArrowLeft } from 'lucide-vue-next';
import type { CharacterProfile, SaveSlot } from '@/types/game';
import "@/style.css";

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
  (e: 'character-selected', character: any): void;
}>();

const isFullscreen = computed(() => props.fullscreen);

const router = useRouter();
const characterStore = useCharacterStore();
const isLoggedIn = ref(false);
const selectedCharId = ref<string | null>(null);
const showDetailsModal = ref(false);
const detailsCharacter = ref<CharacterProfile | null>(null);
const promptInput = ref<HTMLInputElement | null>(null);
const isCharacterPanelOpen = ref(false);

// 响应式屏幕尺寸检测
const screenWidth = ref(window.innerWidth);

// 监听屏幕尺寸变化
const updateScreenWidth = () => {
  screenWidth.value = window.innerWidth;
  // 在768px-480px之间时默认展开面板
  if (screenWidth.value > 480 && screenWidth.value <= 768) {
    isCharacterPanelOpen.value = true;
  }
};

onMounted(() => {
  window.addEventListener('resize', updateScreenWidth);
  updateScreenWidth(); // 初始化时设置
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
  onConfirm: (value?: string) => {},
  onCancel: () => {}
});


// 检查登录状态
verifyStoredToken().then(result => {
  isLoggedIn.value = result;
});

// 计算属性
const allCharacterCount = computed(() => Object.keys(characterStore.rootState.角色列表).length);

const selectedCharacter = computed(() => {
  if (!selectedCharId.value) return null;
  return characterStore.rootState.角色列表[selectedCharId.value];
});

// 方法
const toggleCharacterPanel = () => {
  isCharacterPanelOpen.value = !isCharacterPanelOpen.value;
};

const selectCharacter = (charId: string) => {
  selectedCharId.value = charId;
  isCharacterPanelOpen.value = false; // 在移动端选择后自动关闭面板
};

const getSaveCount = (profile: CharacterProfile) => {
  if (profile.模式 === '单机') {
    const saves = Object.values(profile.存档列表 || {}).filter((slot: SaveSlot) => slot.存档数据);
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
    console.log('设置活跃角色...');
    try {
      await characterStore.setActiveCharacterInTavern(charId);
    } catch (e) {
      console.warn('跳过酒馆同步（单机环境）', e);
    }
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
    const isAutoSave = slotKey === '上次对话' || slotKey === '自动存档';
    const title = isAutoSave ? '创建新存档' : '开启新征程';
    const message = isAutoSave
      ? `是否在【${slotKey}】位置创建新的存档开始游戏？`
      : `是否在存档位 "${slotKey}" 开始一段新的修行？`;

    showConfirm(
      title,
      message,
      async () => {
        console.log('确认创建新存档...');
        try {
          await characterStore.setActiveCharacterInTavern(charId);
        } catch (e) {
          console.warn('跳过酒馆同步（单机环境）', e);
        }
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
    `确定要彻底删除角色"${charName}"及其所有修行记录吗？此操作不可恢复。`,
    () => {
      characterStore.deleteCharacter(charId);
      if (selectedCharId.value === charId) {
        selectedCharId.value = null;
      }
    }
  );
};

const handleDeleteSave = (charId: string, slotKey: string) => {
  const character = characterStore.rootState.角色列表[charId];
  const charName = character?.角色基础信息.名字;
  const saveName = slotKey === '上次对话' ? '上次对话存档' : slotKey === '自动存档' ? '自动存档' : slotKey;

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
    `确定要删除角色"${charName}"的"${saveName}"吗？此操作不可恢复。`,
    () => {
      characterStore.deleteSave(charId, slotKey);
    }
  );
};

// 检查是否可以删除存档的逻辑
const canDeleteSave = (character: CharacterProfile | null, slotKey: string): boolean => {
  if (!character || character.模式 === '联机') {
    // 联机模式不允许删除存档
    return false;
  }

  // 统计当前有数据的存档数量
  let saveCount = 0;
  const savesList = character.存档列表 || {};

  Object.entries(savesList).forEach(([key, save]) => {
    if (save.存档数据) {
      saveCount++;
    }
  });

  // 如果要删除的存档有数据，且总共只有1个有数据的存档，则不允许删除
  const targetSave = savesList[slotKey];
  if (targetSave?.存档数据 && saveCount <= 1) {
    return false;
  }

  return true;
};

const getManualSaves = (character: CharacterProfile | null) => {
  if (!character?.存档列表) return {};

  const manualSaves: Record<string, any> = {};

  // 过滤出手动存档（排除自动存档）
  Object.entries(character.存档列表).forEach(([key, value]) => {
    if (key !== '上次对话' && key !== '自动存档') {
      manualSaves[key] = value;
    }
  });

  return manualSaves;
};

const handleEditSaveName = (charId: string, slotKey: string) => {
  const currentSave = characterStore.rootState.角色列表[charId]?.存档列表?.[slotKey];
  const currentName = currentSave?.存档名 || slotKey;

  showPrompt(
    '重命名存档',
    '请输入新的存档名称：',
    currentName,
    '',
    (newName) => {
      if (newName && newName.trim() && newName.trim() !== currentName) {
        const cleanName = newName.trim();

        const existingSaves = characterStore.rootState.角色列表[charId]?.存档列表;
        if (existingSaves && cleanName !== slotKey && existingSaves[cleanName]) {
          showAlert('重命名失败', '存档名称已存在，请使用其他名称。');
          return;
        }

        characterStore.renameSave(charId, slotKey, cleanName);
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

// 境界名称映射
const getRealmName = (realm: unknown): string => {
  let level: number;

  if (typeof realm === 'object' && realm !== null) {
    level = (realm as Record<string, unknown>).level as number ||
           (realm as Record<string, unknown>).等级 as number ||
           (realm as Record<string, unknown>).境界 as number || 0;
  } else if (typeof realm === 'number') {
    level = realm;
  } else {
    level = parseInt(String(realm)) || 0;
  }

  const realms = [
    '凡人', '炼气', '筑基', '金丹', '元婴',
    '化神', '炼虚', '合体', '渡劫期'
  ];
  return realms[level] || `境界${level}`;
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
    onConfirm: (value) => {
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
    modalState.value.onConfirm(modalState.value.inputValue);
  } else {
    modalState.value.onConfirm();
  }
};

const handleModalCancel = () => {
  modalState.value.onCancel();
  closeModal();
};

const closeModal = () => {
  modalState.value.show = false;
};
</script>

<style scoped>
/* --- 自定义对话框样式 --- */
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
  z-index: 1100;
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
  border: none;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-dialog-confirm {
  background: var(--color-primary);
  color: white;
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


/* 全屏布局 */
.character-management-panel {
  width: 100%;
  height: 100%;
  background: var(--color-background);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 全屏模式样式 */
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

/* 全屏内容区域 */
.main-content.fullscreen-content {
  position: relative;
  flex: 1;
  overflow: hidden;
}

/* 头部 */
.top-header {
  flex-shrink: 0;
  background: var(--color-surface-transparent);
  backdrop-filter: blur(15px);
  border-bottom: 1px solid var(--color-border);
  padding: 1rem 2rem;
  z-index: 1001;
  position: relative;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}

.header-left-side {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.page-title {
  font-size: 1.8rem;
  color: var(--color-accent);
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.btn-back {
  padding: 0.6rem 1.2rem;
  background: var(--color-primary);
  color: white;
  border: 1px solid var(--color-primary);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.btn-back:hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
}

/* 主体内容 */
.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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

.btn-create {
  padding: 1rem 2rem;
  background: linear-gradient(135deg, var(--color-success), var(--color-info));
  color: white;
  border: 1px solid var(--color-success);
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 1rem;
  transition: all 0.3s;
}

.btn-create:hover {
  transform: scale(1.05);
}

/* 管理布局 */
.management-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 0;
  overflow: hidden;
}

/* 面板通用样式 */
.panel-header {
  padding: 1.5rem 2rem;
  background: var(--color-surface-transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--color-text);
  font-weight: 600;
}

.character-count, .selected-char-info {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

/* 左侧角色面板 */
.characters-panel {
  background: var(--color-surface-transparent);
  backdrop-filter: blur(15px);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

.characters-grid {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem;
  /* 移动端滚动优化 */
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: rgba(59, 130, 246, 0.6) rgba(229, 231, 235, 0.2);
}

.characters-grid::-webkit-scrollbar {
  width: 8px;
  background: rgba(229, 231, 235, 0.2);
  border-radius: 4px;
}

.characters-grid::-webkit-scrollbar-track {
  background: rgba(229, 231, 235, 0.2);
  border-radius: 4px;
}

.characters-grid::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.6);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.characters-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.8);
}

/* 角色卡片 */
.character-card {
  background: var(--color-background-transparent);
  backdrop-filter: blur(10px);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.2rem;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--color-text);
  /* 移动端触摸优化 */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.character-card:hover {
  border-color: var(--color-primary);
  transform: translateX(6px);
  box-shadow: 0 6px 20px rgba(var(--color-primary-rgb), 0.2);
}

/* 移动端触摸反馈 */
@media (hover: none) and (pointer: coarse) {
  .character-card:active {
    transform: scale(0.98) translateX(3px);
    transition: transform 0.1s ease;
  }
}

.character-card.active {
  border-color: var(--color-success);
  background: rgba(var(--color-success-rgb), 0.1);
  transform: translateX(6px);
}

.character-card.single-mode {
  border-left: 4px solid var(--color-success);
}

.character-card.online-mode {
  border-left: 4px solid var(--color-primary);
}

/* 卡片头部 */
.card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.char-avatar {
  position: relative;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-success), var(--color-info));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  font-size: 1.3rem;
  flex-shrink: 0;
}

.char-avatar.联机 {
  background: linear-gradient(135deg, var(--color-primary), var(--color-info));
}

.mode-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 18px;
  height: 18px;
  background: rgba(102, 101, 101, 0.342);
  color: var(--color-warning);
  border-radius: 50%;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.char-info {
  flex: 1;
}

.char-name {
  margin: 0 0 0.3rem 0;
  font-size: 1.1rem;
  color: var(--color-warning);
  font-weight: 600;
}

.char-meta {
  display: flex;
  gap: 0.8rem;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.save-count {
  text-align: center;
  flex-shrink: 0;
}

.save-count .count {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-accent);
}

.save-count .label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

/* 卡片操作 */
.card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.btn-details, .btn-delete {
  flex: 1;
  padding: 0.5rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s;
}

.btn-details {
  background: rgba(var(--color-info-rgb), 0.1);
  color: var(--color-info);
  border: 2px solid #19f7ff;
}

.btn-details:hover {
  background: rgba(var(--color-info-rgb), 0.2);
}

.btn-delete {
  background: rgba(var(--color-error-rgb), 0.1);
  color: var(--color-error);
  border: 2px solid #ff0000;
}

.btn-delete:hover {
  background: rgba(var(--color-error-rgb), 0.2);
}

/* 右侧存档面板 */
.saves-panel {
  background: var(--color-background-transparent);
  display: flex;
  flex-direction: column;
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

/* 存档容器 */
.saves-container, .online-saves-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.5rem;
  max-height: calc(100vh - 200px);
  /* 移动端滚动优化 */
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

.manual-saves-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  max-height: 60vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.5rem 0;
  /* 优化滚动体验 */
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

.auto-saves-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  /* 移动端优化 */
  min-height: fit-content;
}

/* 存档卡片 */
.save-card, .online-save-card {
  background: var(--color-surface-transparent);
  backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.2rem;
  cursor: pointer;
  transition: all 0.3s;
  color: var(--color-text);
  /* 移动端触摸优化 */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.save-card:hover, .online-save-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(var(--color-primary-rgb), 0.15);
}

/* 移动端触摸反馈 */
@media (hover: none) and (pointer: coarse) {
  .save-card:active, .online-save-card:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
  }
}

.save-card.has-data {
  border-left: 4px solid var(--color-success);
}

/* 存档数据 */
.save-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.save-name {
  margin: 0;
  font-size: 1.1rem;
  color: var(--color-warning);
  font-weight: 600;
}

.save-badges {
  display: flex;
  gap: 0.5rem;
}

.realm-badge, .age-badge {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
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
.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
  margin-bottom: 1rem;
}

.stat {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.stat .label {
  color: var(--color-text-secondary);
}

.stat .value {
  color: var(--color-text);
  font-weight: 600;
}

/* 存档底部 */
.save-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  padding-top: 0.8rem;
  border-top: 1px solid var(--color-border);
}

.sync-status {
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
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
  min-height: 120px;
}

.empty-slot-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  opacity: 0.6;
}

.empty-text {
  margin-bottom: 0.8rem;
}

.empty-desc {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  opacity: 0.8;
}

.btn-start, .btn-play, .btn-sync {
  padding: 0.5rem 1rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s;
}

.btn-start:hover, .btn-play:hover, .btn-sync:hover {
  background: var(--color-primary-dark);
}

/* 自动存档区域 */
.auto-saves-section {
  margin-bottom: 2rem;
}

.auto-saves-section h3 {
  margin: 0 0 1rem 0;
  color: var(--color-warning);
  font-size: 1.1rem;
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
  margin-bottom: 1rem;
}

.manual-saves-header h3 {
  margin: 0;
  color: var(--color-warning);
  font-size: 1.1rem;
  font-weight: 600;
}

.save-info-text {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  font-style: italic;
}

.manual-saves-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
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

/* 禁用状态样式 */
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

.auto-save-desc {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  display: block;
  margin-top: 0.3rem;
}
.online-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

/* 登录提示 */
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
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 1rem;
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
  z-index: 1000;
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
  border: none;
  font-size: 1.5rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
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

.btn-toggle-panel {
  display: none;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  width: 40px;
  height: 40px;
  cursor: pointer;
  padding: 0;
  align-items: center;
  justify-content: center;
}

.hamburger-icon {
  display: block;
  width: 20px;
  height: 2px;
  background: var(--color-text);
  position: relative;
  transition: background 0.2s;
}
.hamburger-icon::before,
.hamburger-icon::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 2px;
  background: var(--color-text);
  left: 0;
  transition: transform 0.2s;
}
.hamburger-icon::before {
  top: -6px;
}
.hamburger-icon::after {
  bottom: -6px;
}

.panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1199;
}


/* 响应式 - 优化的手机端适配 */
@media (max-width: 1200px) {
  .management-layout {
    grid-template-columns: 350px 1fr;
  }

  .manual-saves-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

@media (max-width: 1024px) {
  .management-layout {
    grid-template-columns: 320px 1fr;
  }

  .top-header {
    padding: 0.8rem 1.5rem;
  }

  .page-title {
    font-size: 1.6rem;
  }

  .details-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

@media (max-width: 768px) {
  .top-header {
    padding: 0.8rem 1rem;
  }

  .header-content {
    padding: 0;
  }

  .page-title {
    font-size: 1.4rem;
  }

  .btn-toggle-panel {
    display: flex;
  }

  .management-layout {
    /* 保持双栏布局，但调整比例 */
    grid-template-columns: 280px 1fr;
    gap: 0;
  }

  .characters-panel {
    /* 在平板模式下仍然显示，但可以通过按钮控制 */
    position: relative;
    transform: none;
    width: 100%;
    max-width: none;
    z-index: auto;
    box-shadow: none;
    border-right: 1px solid var(--color-border);
    background: var(--color-surface-transparent);
    /* 添加折叠功能 */
    transition: margin-left 0.3s ease-in-out;
  }

  .characters-panel:not(.is-open) {
    margin-left: -280px;
  }

  .characters-panel.is-open {
    margin-left: 0;
  }

  /* 当左侧面板隐藏时，右侧面板占满宽度 */
  .saves-panel {
    transition: margin-left 0.3s ease-in-out;
  }

  .panel-header {
    padding: 1rem;
  }

  .saves-container, .online-saves-container {
    padding: 1rem;
    max-height: calc(100vh - 150px);
  }

  .auto-saves-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
  }

  .manual-saves-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 0.8rem;
    max-height: 50vh;
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
    padding: 0.8rem;
  }

  .character-card {
    padding: 1rem;
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

@media (max-width: 480px) {
  .top-header {
    padding: 0.6rem 0.8rem;
  }

  .page-title {
    font-size: 1.2rem;
  }

  .btn-back {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }

  /* 在真正的手机屏幕上才使用固定定位侧滑 */
  .management-layout {
    grid-template-columns: 1fr;
    position: relative;
  }

  .characters-panel {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 90%;
    max-width: 280px;
    z-index: 1200;
    transform: translateX(-100%);
    transition: transform 0.3s ease-in-out;
    box-shadow: 4px 0 20px rgba(0,0,0,0.3);
    border-right: 1px solid var(--color-border);
    background: var(--color-surface);
    margin-left: 0; /* 重置margin */
  }

  .characters-panel.is-open {
    transform: translateX(0);
  }

  /* 重置saves-panel的margin */
  .saves-panel {
    margin-left: 0;
  }

  .characters-grid {
    padding: 0.5rem;
  }

  .character-card {
    padding: 0.8rem;
    margin-bottom: 0.8rem;
  }

  .card-header {
    margin-bottom: 0.8rem;
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
    max-height: calc(100vh - 120px);
  }

  .auto-saves-grid {
    grid-template-columns: 1fr;
    gap: 0.6rem;
  }

  .manual-saves-grid {
    grid-template-columns: 1fr;
    gap: 0.6rem;
    max-height: 45vh;
  }

  .save-card, .online-save-card {
    padding: 1rem;
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
  }

  .details-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .detail-section {
    padding: 1rem;
  }
}

@media (max-width: 360px) {
  .top-header {
    padding: 0.5rem;
  }

  .header-left-side {
    gap: 0.5rem;
  }

  .page-title {
    font-size: 1.1rem;
  }

  .btn-back {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
  }

  .characters-panel {
    width: 95%;
    max-width: 260px;
  }

  .character-card {
    padding: 0.6rem;
  }

  .save-card {
    padding: 0.8rem;
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
}
</style>
