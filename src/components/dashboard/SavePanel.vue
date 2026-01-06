<template>
  <div class="save-panel">
    <!-- 存档容器 -->
    <div class="saves-container">
      <!-- 当前存档状态 -->
      <div class="current-save-section" v-if="currentSave">
        <div class="section-header">
          <h4 class="section-title">
            <History v-if="currentSave.存档名 === '上次对话'" :size="16" class="last-save-icon" />
            <Clock
              v-else-if="currentSave.存档名 === '时间点存档'"
              :size="16"
              class="time-save-icon"
            />
            当前进度 - {{ currentSave.存档名 }}
          </h4>
        </div>
        <div class="current-save-card">
          <div class="save-preview">
            <div class="preview-avatar">{{ currentSave.角色名字?.[0] || '道' }}</div>
            <div class="preview-info">
              <div class="character-name">{{ currentSave.角色名字 || '无名道友' }}</div>
              <div class="character-details">
                <span class="detail-item">{{ currentSave.境界 || '凡人' }}</span>
                <span class="detail-separator">·</span>
                <span class="detail-item">{{ currentSave.位置 || '未知' }}</span>
              </div>
              <!-- 特殊存档说明 -->
              <div v-if="currentSave.存档名 === '上次对话'" class="current-save-hint last">
                每次对话前自动备份，可用于回退到上次对话前的状态
              </div>
              <div v-else-if="currentSave.存档名 === '时间点存档'" class="current-save-hint time">
                按设定时间间隔自动覆盖保存，防止长时间游玩数据丢失
              </div>
            </div>
          </div>
          <div class="save-stats">
            <div class="stat-item">
              <span class="stat-label">{{ t('创建时间') }}</span>
              <span class="stat-value">{{ formatTime(currentSave.保存时间 || '') }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">{{ t('最后保存') }}</span>
              <span class="stat-value">{{
                formatTime(currentSave.最后保存时间 ?? currentSave.保存时间 ?? '')
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 存档列表 -->
      <div class="saves-section">
        <div class="section-header">
          <h4 class="section-title">存档列表</h4>
          <div class="header-actions">
            <button
              class="new-save-btn"
              @click="createNewSave"
              :disabled="loading"
              title="新建存档"
            >
              <Plus :size="16" />
            </button>
            <div class="saves-count">{{ savesList.length }}/10</div>
          </div>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"><RefreshCw :size="18" class="animate-spin" /></div>
          <div class="loading-text">{{ t('正在加载存档...') }}</div>
        </div>

        <div v-else-if="savesList.length === 0" class="empty-state">
          <div class="empty-icon"><Save :size="32" /></div>
          <div class="empty-text">{{ t('修仙路上尚未留存，创建存档记录道途') }}</div>
          <div class="empty-hint">{{ t('开始游戏后可以创建存档') }}</div>
        </div>

        <div v-else class="saves-list">
          <div
            v-for="(save, index) in savesList"
            :key="save.id"
            class="save-card"
            :class="{ active: save.id === currentSave?.id }"
            @click="selectSave(save)"
          >
            <div class="card-header">
              <div class="save-preview small">
                <div class="preview-avatar small">{{ save.角色名字?.[0] || '道' }}</div>
                <div class="preview-info">
                  <div class="save-name">
                    <History v-if="save.存档名 === '上次对话'" :size="14" class="last-save-icon" />
                    <Clock
                      v-else-if="save.存档名 === '时间点存档'"
                      :size="14"
                      class="time-save-icon"
                    />
                    {{ save.存档名 || save.id || `存档${index + 1}` }}
                  </div>
                  <div class="character-name-small">{{ save.角色名字 || '无名道友' }}</div>
                  <!-- 显示最后保存时间 -->
                  <div class="save-time">
                    {{ formatTime(save.最后保存时间 ?? save.保存时间 ?? null) }}
                  </div>
                </div>
              </div>
              <div class="card-actions">
                <button
                  class="card-btn"
                  @click.stop="loadSave(save)"
                  :disabled="loading"
                  v-if="
                    save.id !== currentSave?.id &&
                    save.存档名 !== '上次对话' &&
                    save.存档名 !== '时间点存档'
                  "
                  title="读取存档"
                >
                  <Play :size="14" />
                </button>
                <button
                  class="card-btn warning"
                  @click.stop="rollbackFromLastConversation(save)"
                  :disabled="loading || !currentSave"
                  v-if="save.存档名 === '上次对话'"
                  title="用上次对话的数据覆盖当前存档（回滚）"
                >
                  <RefreshCw :size="14" />
                </button>
                <button
                  class="card-btn info"
                  @click.stop="exportSingleSave(save)"
                  :disabled="loading"
                  title="导出此存档"
                >
                  <Download :size="14" />
                </button>
                <button
                  class="card-btn primary"
                  @click.stop="overwriteSave(save)"
                  :disabled="loading || !currentSave"
                  title="用当前进度覆盖此存档"
                  v-if="save.存档名 !== '上次对话' && save.存档名 !== '时间点存档'"
                >
                  <Save :size="14" />
                </button>
                <button
                  class="card-btn danger"
                  @click.stop="deleteSave(save)"
                  :disabled="loading || isUndeletableSave(save)"
                  :title="getDeleteTooltip(save)"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>

            <div class="card-content">
              <div class="save-details">
                <div class="detail-row">
                  <span class="detail-label">境界:</span>
                  <span class="detail-value">{{ save.境界 || '凡人' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">位置:</span>
                  <span class="detail-value">{{ save.位置 || '未知' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">修改:</span>
                  <span class="detail-value">{{
                    formatTime(save.最后保存时间 ?? save.保存时间 ?? '')
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 自动存档设置 -->
      <div class="auto-save-settings-section">
        <div class="section-header">
          <h4 class="section-title">{{ t('自动存档设置') }}</h4>
        </div>
        <div class="settings-list">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('对话前自动备份') }}</label>
              <span class="setting-desc">每次对话前自动备份，用于回退到上次对话前的状态</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="conversationAutoSaveEnabled" />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('时间点存档') }}</label>
              <span class="setting-desc">按设定时间间隔自动覆盖保存，防止长时间游玩数据丢失</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="timeBasedSaveEnabled" />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>
          <div class="setting-item" v-if="timeBasedSaveEnabled">
            <div class="setting-info">
              <label class="setting-name">{{ t('存档间隔') }}</label>
              <span class="setting-desc">自动存档的时间间隔（真实时间）</span>
            </div>
            <div class="setting-control">
              <input
                type="number"
                min="1"
                v-model.number="timeBasedSaveInterval"
                class="interval-input"
              />
              <span class="unit-label">分钟</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 存档操作 -->
      <div class="operations-section">
        <div class="section-header">
          <h4 class="section-title">{{ t('存档操作') }}</h4>
        </div>
        <div class="operations-list">
          <button
            class="operation-btn"
            @click="exportCharacter"
            :disabled="loading || !characterStore.activeCharacterProfile"
          >
            <Download :size="16" />
            <div class="btn-content">
              <span class="btn-title">导出角色</span>
              <span class="btn-desc">导出当前角色及其所有存档</span>
            </div>
          </button>

          <button
            class="operation-btn"
            @click="exportSaves"
            :disabled="loading || savesList.length === 0"
          >
            <Download :size="16" />
            <div class="btn-content">
              <span class="btn-title">导出所有存档</span>
              <span class="btn-desc">{{ t('备份所有存档到文件') }}</span>
            </div>
          </button>

          <button class="operation-btn" @click="importSaves" :disabled="loading">
            <Upload :size="16" />
            <div class="btn-content">
              <span class="btn-title">导入存档</span>
              <span class="btn-desc">{{ t('从文件恢复存档') }}</span>
            </div>
          </button>

          <button
            class="operation-btn danger"
            @click="clearAllSaves"
            :disabled="loading || savesList.length === 0"
          >
            <Trash2 :size="16" />
            <div class="btn-content">
              <span class="btn-title">{{ t('清空存档') }}</span>
              <span class="btn-desc">{{ t('删除所有存档数据') }}</span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      @change="handleImportFile"
      style="display: none"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { panelBus } from '@/utils/panelBus';
import { RefreshCw, Save, Play, Trash2, Download, Upload, History, Clock, Plus } from 'lucide-vue-next';
import { useCharacterStore } from '@/stores/characterStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useI18n } from '@/i18n';
import { toast } from '@/utils/toast';
import { debug } from '@/utils/debug';
import type { SaveSlot } from '@/types/game';
import { createDadBundle, unwrapDadBundle } from '@/utils/dadBundle';
import { isSaveDataV3, migrateSaveDataToLatest } from '@/utils/saveMigration';
import { validateSaveDataV3 } from '@/utils/saveValidationV3';

const { t } = useI18n();

const characterStore = useCharacterStore();
const gameStateStore = useGameStateStore();
const loading = ref(false);
const fileInput = ref<HTMLInputElement>();

// 自动存档设置
const conversationAutoSaveEnabled = computed({
  get: () => gameStateStore.conversationAutoSaveEnabled,
  set: (value: boolean) => {
    gameStateStore.setConversationAutoSaveEnabled(value);
    toast.info(`对话前自动备份已${value ? '开启' : '关闭'}`);
  }
});

const timeBasedSaveEnabled = computed({
  get: () => gameStateStore.timeBasedSaveEnabled,
  set: (value: boolean) => {
    gameStateStore.setTimeBasedSaveEnabled(value);
    if (value) {
      toast.success(`时间点存档已启用，间隔${timeBasedSaveInterval.value}分钟`);
    } else {
      toast.info('时间点存档已禁用');
    }
  }
});

const timeBasedSaveInterval = computed({
  get: () => gameStateStore.timeBasedSaveInterval,
  set: (value: number) => {
    gameStateStore.setTimeBasedSaveInterval(value);
    toast.success(`存档间隔已设置为${value}分钟`);
  }
});

// 获取存档列表
const savesList = computed(() => {
  // 仅过滤掉 null 的槽位，保留所有有效存档，包括没有数据的自动存档槽位
  return characterStore.saveSlots.filter((slot: SaveSlot) => {
    if (!slot) return false;
    // 修复：确保存档有有效的标识信息
    return slot.存档名 || slot.id;
  });
});

// 获取当前存档
const currentSave = computed(() => {
  return characterStore.activeSaveSlot;
});

// 是否可以存档
const canSave = computed(() => {
  // 检查是否有激活的角色配置或游戏状态数据
  return characterStore.activeCharacterProfile !== null ||
         (gameStateStore.character !== null && gameStateStore.character !== undefined);
});

// 计算可删除的存档数量（排除三个不可删除的存档）
const deletableSavesCount = computed(() => {
  // 三个不可删除的存档：当前激活存档、"上次对话"存档、"时间点存档"
  const undeletableNames = new Set([
    currentSave.value?.存档名,  // 当前激活存档
    '上次对话',                 // 上次对话存档（重roll用）
    '时间点存档'                // 时间点存档（定时覆盖）
  ]);

  return savesList.value.filter(save => {
    // 如果是不可删除的存档，跳过
    if (undeletableNames.has(save.存档名)) {
      return false;
    }
    // 其他普通存档可以删除
    return true;
  }).length;
});

// 判断存档是否不可删除
const isUndeletableSave = (save: SaveSlot): boolean => {
  // 三个不可删除的存档：
  // 1. 当前激活存档
  // 2. "上次对话"存档（用于重roll）
  // 3. "时间点存档"（定时覆盖的固定存档）

  if (save.存档名 === '上次对话') {
    return true; // "上次对话"存档不可删除
  }

  if (save.存档名 === '时间点存档') {
    return true; // "时间点存档"不可删除
  }

  if (save.id === currentSave.value?.id) {
    return true; // 当前激活存档不可删除
  }

  if (deletableSavesCount.value <= 1) {
    return true; // 最后一个可删除存档不能删除
  }

  return false;
};

// 获取删除按钮的提示文本
const getDeleteTooltip = (save: SaveSlot): string => {
  if (save.存档名 === '上次对话') {
    return '上次对话存档不可删除（用于重roll）';
  }

  if (save.存档名 === '时间点存档') {
    return '时间点存档不可删除（定时自动覆盖）';
  }

  if (save.id === currentSave.value?.id) {
    return '当前激活存档不可删除';
  }

  if (deletableSavesCount.value <= 1) {
    return '最后一个普通存档不可删除';
  }

  return '删除存档';
};

// 刷新存档列表
const refreshSaves = async () => {
  loading.value = true;
  try {
    await characterStore.loadSaves();
    // 移除频繁的刷新成功提示，避免干扰正常操作
    // toast.success('存档列表已刷新');
  } catch (error) {
    debug.error('存档面板', '刷新失败', error);
    toast.error('刷新存档列表失败');
  } finally {
    loading.value = false;
  }
};

// 快速存档
const quickSave = async () => {
  if (!canSave.value) {
    toast.warning('当前没有可存档的游戏状态');
    return;
  }

  loading.value = true;
  try {
    await characterStore.saveCurrentGame({ notifyIfNoActive: true });
    toast.success('快速存档完成');
  } catch (error) {
    debug.error('存档面板', '快速存档失败', error);
    toast.error('快速存档失败');
  } finally {
    loading.value = false;
  }
};

// 新建存档
const createNewSave = async () => {
  if (!canSave.value) {
    toast.warning('当前没有可存档的游戏状态');
    return;
  }

  // 弹出输入框让用户输入存档名
  const saveName = window.prompt('请输入新存档的名称：', `存档_${new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })}`);

  if (!saveName || saveName.trim() === '') {
    toast.info('已取消新建存档');
    return;
  }

  loading.value = true;
  try {
    // 先保存当前数据
    await characterStore.saveCurrentGame({ notifyIfNoActive: true });

    // 再另存为新存档
    const newSlotId = await characterStore.saveAsNewSlot(saveName.trim());

    if (newSlotId) {
      // 刷新存档列表
      await refreshSaves();
    }
  } catch (error) {
    debug.error('存档面板', '新建存档失败', error);
    toast.error('新建存档失败');
  } finally {
    loading.value = false;
  }
};

// 覆盖存档
const overwriteSave = async (save: SaveSlot) => {
  if (!canSave.value) {
    toast.warning('当前没有可存档的游戏状态');
    return;
  }

  uiStore.showRetryDialog({
    title: '覆盖存档',
    message: `确定要用当前游戏进度覆盖存档"${save.存档名}"吗？原存档数据将丢失。`,
    confirmText: '确认覆盖',
    cancelText: '取消',
    onConfirm: async () => {
      loading.value = true;
      try {
        // 先保存当前数据
        await characterStore.saveCurrentGame({ notifyIfNoActive: true });

        // 覆盖指定存档
        await characterStore.saveToSlot(save.存档名);

        toast.success(`已覆盖存档: ${save.存档名}`);

        // 刷新存档列表
        await refreshSaves();
      } catch (error) {
        debug.error('存档面板', '覆盖存档失败', error);
        toast.error('覆盖存档失败');
      } finally {
        loading.value = false;
      }
    },
    onCancel: () => {}
  });
};

// 从上次对话回滚
const rollbackFromLastConversation = async (save: SaveSlot) => {
  if (!currentSave.value) {
    toast.warning('没有当前激活的存档');
    return;
  }

  const { useUIStore } = await import('@/stores/uiStore');
  const uiStore = useUIStore();

  uiStore.showRetryDialog({
    title: '回滚到上次对话',
    message: `确定要将"${save.存档名}"的数据覆盖到当前存档"${currentSave.value.存档名}"吗？当前进度将被替换为上次对话前的状态。`,
    confirmText: '确认回滚',
    cancelText: '取消',
    onConfirm: async () => {
      loading.value = true;
      try {
        await characterStore.rollbackToLastConversation();
        toast.success('已回滚到上次对话前的状态');
        // 刷新存档列表以更新元数据
        await refreshSaves();
      } catch (error) {
        debug.error('存档面板', '回滚失败', error);
        toast.error(`回滚失败: ${error instanceof Error ? error.message : '未知错误'}`);
      } finally {
        loading.value = false;
      }
    },
    onCancel: () => {}
  });
};

// 选择存档
const selectSave = (save: SaveSlot) => {
  debug.log('存档面板', '选择存档', save);
};

// 加载存档
const loadSave = async (save: SaveSlot) => {
  if (!save) return;

  loading.value = true;
  try {
    // 使用存档名作为槽位key
    await characterStore.loadGameById(save.存档名);
    toast.success(`已加载存档: ${save.存档名}`);
  } catch (error) {
    debug.error('存档面板', '加载失败', error);
    toast.error('加载存档失败');
  } finally {
    loading.value = false;
  }
};

// 删除存档
import { useUIStore } from '@/stores/uiStore';
const uiStore = useUIStore();
const deleteSave = async (save: SaveSlot) => {
  uiStore.showRetryDialog({
    title: '删除存档',
    message: `确定要删除存档"${save.存档名 || '存档'}"吗？此操作不可撤销。`,
    confirmText: '确认删除',
    cancelText: '取消',
    onConfirm: async () => {
      loading.value = true;
      try {
        // save.id 实际上是存档槽位的 key，例如 "存档1"
        await characterStore.deleteSaveById(save.存档名);
        toast.success('存档已删除');
        // 刷新列表
        await refreshSaves();
      } catch (error) {
        debug.error('存档面板', '删除失败', error);
        toast.error('删除存档失败');
      } finally {
        loading.value = false;
      }
    },
    onCancel: () => {}
  });
};

// 导出单个存档
const exportSingleSave = async (save: SaveSlot) => {
  try {
    console.log('[单个存档导出] 开始导出存档:', save.存档名);

    // 从IndexedDB加载完整的存档数据
    const characterId = characterStore.rootState.当前激活存档?.角色ID;
    if (!characterId) {
      toast.error('无法获取角色ID');
      return;
    }

    const { loadSaveData } = await import('@/utils/indexedDBManager');
    const fullSaveData = await loadSaveData(characterId, save.存档名);

    if (!fullSaveData) {
      toast.error('无法加载存档数据');
      return;
    }

    // 修复：使用与 CharacterManagement.vue 一致的格式，支持互相导入
    const v3SaveData = isSaveDataV3(fullSaveData as any) ? (fullSaveData as any) : migrateSaveDataToLatest(fullSaveData as any).migrated;
    const validation = validateSaveDataV3(v3SaveData as any);
    if (!validation.isValid) {
      throw new Error(validation.errors[0] || '存档结构校验失败');
    }

    const exportData = createDadBundle('saves', {
      characterId,
      characterName: characterStore.activeCharacterProfile?.角色?.名字,
      saves: [{
        ...save,
        存档数据: v3SaveData  // V3-only
      }]
    });

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    const fileName = `仙途-${save.存档名}-${new Date().toISOString().split('T')[0]}.json`;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }, 100);

    console.log('[单个存档导出] 导出成功，文件名:', fileName);
    toast.success(`已导出存档: ${save.存档名}`);
  } catch (error) {
    console.error('[单个存档导出] 导出失败:', error);
    toast.error(`导出存档失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

// 导出整个角色（包含所有存档）
const exportCharacter = async () => {
  try {
    console.log('[角色导出] 开始导出角色...');

    const characterId = characterStore.rootState.当前激活存档?.角色ID;
    if (!characterId) {
      toast.error('无法获取角色ID');
      return;
    }

    const characterProfile = characterStore.activeCharacterProfile;
    if (!characterProfile) {
      toast.error('无法获取角色信息');
      return;
    }

    // 加载所有存档的完整数据
    const { loadSaveData } = await import('@/utils/indexedDBManager');
    const savesWithFullData = await Promise.all(
      savesList.value.map(async (save) => {
        const fullData = await loadSaveData(characterId, save.存档名);
        return {
          ...save,
          存档数据: fullData, // 统一字段名
        };
      }),
    );

    const normalizedSaves = savesWithFullData.map((s) => {
      const rawSaveData = (s as any).存档数据;
      if (!rawSaveData) {
        throw new Error(`存档「${s.存档名}」缺少存档数据，无法导出`);
      }
      const v3SaveData = isSaveDataV3(rawSaveData as any) ? rawSaveData : migrateSaveDataToLatest(rawSaveData as any).migrated;
      const validation = validateSaveDataV3(v3SaveData as any);
      if (!validation.isValid) {
        throw new Error(`存档「${s.存档名}」校验失败：${validation.errors[0] || '未知原因'}`);
      }
      return { ...s, 存档数据: v3SaveData };
    });

    const exportData = createDadBundle('character', {
      角色ID: characterId,
      角色信息: JSON.parse(JSON.stringify(characterProfile)),
      存档列表: normalizedSaves,
    });

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    console.log('[角色导出] 数据大小:', (dataStr.length / 1024).toFixed(2), 'KB');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    const characterName = characterProfile.角色?.名字 || '未命名角色';
    const fileName = `仙途-角色-${characterName}-${new Date().toISOString().split('T')[0]}.json`;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }, 100);

    console.log('[角色导出] 导出成功，文件名:', fileName);
    toast.success(`已导出角色: ${characterName} (含 ${savesWithFullData.length} 个存档)`);
  } catch (error) {
    console.error('[角色导出] 导出失败:', error);
    toast.error(`导出角色失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

// 导出所有存档
const exportSaves = async () => {
  try {
    console.log('[存档导出] 开始导出存档...');
    console.log('[存档导出] savesList.value:', savesList.value);
    console.log('[存档导出] savesList 数量:', savesList.value.length);

    if (!savesList.value || savesList.value.length === 0) {
      toast.warning('没有可导出的存档');
      console.warn('[存档导出] 没有可导出的存档');
      return;
    }

    const characterId = characterStore.rootState.当前激活存档?.角色ID;
    if (!characterId) {
      toast.error('无法获取角色ID');
      return;
    }

    // 修复：从 IndexedDB 加载每个存档的完整数据
    const { loadSaveData } = await import('@/utils/indexedDBManager');
    const savesWithFullData = await Promise.all(
      savesList.value.map(async (save) => {
        const fullData = await loadSaveData(characterId, save.存档名);
        return {
          ...save,
          存档数据: fullData  // 使用与 CharacterManagement.vue 一致的字段名
        };
      })
    );

    const normalizedSaves = savesWithFullData.map((s) => {
      const rawSaveData = (s as any).存档数据;
      const v3SaveData = isSaveDataV3(rawSaveData as any) ? rawSaveData : migrateSaveDataToLatest(rawSaveData as any).migrated;
      const validation = validateSaveDataV3(v3SaveData as any);
      if (!validation.isValid) {
        throw new Error(`存档「${s.存档名}」校验失败：${validation.errors[0] || '未知原因'}`);
      }
      return { ...s, 存档数据: v3SaveData };
    });

    const exportData = createDadBundle('saves', {
      characterId,
      characterName: characterStore.activeCharacterProfile?.角色?.名字,
      saves: normalizedSaves,
    });

    console.log('[存档导出] 导出数据:', exportData);

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    console.log('[存档导出] 数据大小:', (dataStr.length / 1024).toFixed(2), 'KB');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    const fileName = `仙途-存档备份-${new Date().toISOString().split('T')[0]}.json`;
    link.download = fileName;

    // 添加到DOM并触发点击
    document.body.appendChild(link);
    link.click();

    // 清理
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }, 100);

    console.log('[存档导出] 导出成功，文件名:', fileName);
    toast.success(`已导出 ${savesList.value.length} 个存档`);
  } catch (error) {
    console.error('[存档导出] 导出失败:', error);
    debug.error('存档面板', '导出失败', error);
    toast.error(`导出存档失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

// 导入存档
const importSaves = () => {
  fileInput.value?.click();
};

// 处理导入文件
// 统一格式: { type: 'saves', saves: [...] }
const handleImportFile = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  loading.value = true;
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    const unwrapped = unwrapDadBundle(data);
    if (unwrapped.type !== 'saves' || !Array.isArray(unwrapped.payload?.saves)) {
      throw new Error('无效的存档文件格式，请使用本游戏导出的存档文件');
    }

    const savesToImport = unwrapped.payload.saves;
    if (savesToImport.length === 0) {
      throw new Error('文件中没有找到有效的存档数据');
    }

    const activeCharId = characterStore.rootState.当前激活存档?.角色ID;
    if (!activeCharId) {
      throw new Error('无法导入存档，当前没有激活的角色');
    }

    for (const save of savesToImport) {
      await characterStore.importSave(activeCharId, save);
    }

    await refreshSaves();
    toast.success(`成功导入 ${savesToImport.length} 个存档`);
  } catch (error) {
    debug.error('存档面板', '导入失败', error);
    toast.error('导入存档失败: ' + (error as Error).message);
  } finally {
    loading.value = false;
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  }
};

// 清空所有存档
const clearAllSaves = async () => {
  uiStore.showRetryDialog({
    title: '清空所有存档',
    message: '确定要删除所有存档吗？此操作不可撤销！',
    confirmText: '继续',
    cancelText: '取消',
    onConfirm: () => {
      uiStore.showRetryDialog({
        title: '再次确认',
        message: '再次确认：这将永久删除所有存档数据！',
        confirmText: '确认清空',
        cancelText: '取消',
        onConfirm: async () => {
          loading.value = true;
          try {
            await characterStore.clearAllSaves();
            toast.success('所有存档已清空');
          } catch (error) {
            debug.error('存档面板', '清空失败', error);
            toast.error('清空存档失败');
          } finally {
            loading.value = false;
          }
        },
        onCancel: () => {}
      });
    },
    onCancel: () => {}
  });
};

// 格式化时间
const formatTime = (timestamp: number | string | null | undefined): string => {
  if (!timestamp) return '未知';

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '未知';

  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 格式化游戏时长
const formatPlayTime = (minutes: number | undefined): string => {
  if (!minutes || minutes < 1) return '--';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}小时${mins}分钟`;
  }
  return `${mins}分钟`;
};

onMounted(() => {
  refreshSaves();
  // 统一顶栏动作
  panelBus.on('refresh', () => refreshSaves());
  panelBus.on('save', () => quickSave());
});
</script>

<style scoped>
.save-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  overflow: hidden;
  padding: 1rem;
  gap: 1rem;
  position: relative;
}

/* 工具栏移除：统一到顶栏动作 */

/* 头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #bae6fd;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  font-size: 1.5rem;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.panel-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #0369a1;
}

.save-subtitle {
  font-size: 0.875rem;
  color: #0284c7;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #bae6fd;
  border-radius: 0.5rem;
  background: white;
  color: #0369a1;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.action-btn:hover {
  background: #f0f9ff;
  border-color: #0284c7;
}

.action-btn.primary {
  background: #0284c7;
  border-color: #0284c7;
  color: white;
}

.action-btn.primary:hover {
  background: #0369a1;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 存档容器 */
.saves-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 0 0.5rem 3rem 0.5rem;

  /* 滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(2, 132, 199, 0.3) rgba(243, 244, 246, 0.5);
}

.saves-container::-webkit-scrollbar {
  width: 8px;
}

.saves-container::-webkit-scrollbar-track {
  background: rgba(243, 244, 246, 0.5);
  border-radius: 4px;
}

.saves-container::-webkit-scrollbar-thumb {
  background: rgba(2, 132, 199, 0.3);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.saves-container::-webkit-scrollbar-thumb:hover {
  background: rgba(2, 132, 199, 0.5);
}

/* 区块样式 */
.current-save-section,
.saves-section,
.operations-section {
  margin-bottom: 1.5rem;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #bae6fd;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: #f0f9ff;
  border-bottom: 1px solid #bae6fd;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #0369a1;
}

.saves-count {
  font-size: 0.875rem;
  color: #0c4a6e;
  background: white;
  padding: 0.25rem 0.75rem;
  border-radius: 0.5rem;
  font-weight: 600;
  border: 1px solid #bae6fd;
}

/* 当前存档卡片 */
.current-save-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.save-preview {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.save-preview.small {
  gap: 0.75rem;
}

.preview-avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #0284c7, #0369a1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.25rem;
}

.preview-avatar.small {
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1rem;
}

.preview-info {
  flex: 1;
}

.character-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #0369a1;
  margin-bottom: 0.25rem;
}

.save-name {
  font-size: 1rem;
  font-weight: 700;
  color: #1e40af;
  margin-bottom: 0.15rem;
}

.character-name-small {
  font-size: 0.8rem;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 0.15rem;
}

.character-details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
}

.detail-separator {
  color: #cbd5e1;
}

.save-time {
  font-size: 0.875rem;
  color: #64748b;
}

/* 特殊存档说明提示 */
.save-hint {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  margin-top: 0.25rem;
  display: inline-block;
  font-weight: 500;
}

.save-hint.auto {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.save-hint.last {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

/* 当前进度的特殊存档说明 */
.current-save-hint {
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  margin-top: 0.75rem;
  display: block;
  font-weight: 500;
  line-height: 1.5;
}

.current-save-hint.auto {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border-left: 3px solid #10b981;
}

.current-save-hint.last {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  border-left: 3px solid #3b82f6;
}

.save-stats {
  display: flex;
  gap: 2rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
}

.stat-value {
  font-size: 0.875rem;
  color: #0369a1;
  font-weight: 600;
}

/* 存档列表 */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
}

.loading-spinner,
.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.loading-text,
.empty-text {
  font-size: 1rem;
  font-weight: 600;
  color: #0369a1;
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 0.875rem;
  color: #64748b;
}

.saves-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
}

.save-card {
  border: 1px solid #e0f2fe;
  border-radius: 0.5rem;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-card:hover {
  background: #f0f9ff;
  border-color: #bae6fd;
  transform: translateY(-1px);
}

.save-card.active {
  background: #e0f2fe;
  border-color: #0284c7;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e0f2fe;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.card-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid #bae6fd;
  border-radius: 0.375rem;
  background: white;
  color: #0284c7;
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-btn:hover {
  background: #f0f9ff;
  border-color: #0284c7;
}

.card-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card-btn.primary {
  color: #10b981;
  border-color: #d1fae5;
}

.card-btn.primary:hover {
  background: #f0fdf4;
  border-color: #10b981;
}

.card-btn.danger {
  color: #ef4444;
  border-color: #fecaca;
}

.card-btn.danger:hover {
  background: #fef2f2;
  border-color: #ef4444;
}

.card-btn.warning {
  color: #f59e0b;
  border-color: #fef3c7;
}

.card-btn.warning:hover {
  background: #fffbeb;
  border-color: #f59e0b;
}

.card-btn.info {
  color: #0284c7;
  border-color: #bae6fd;
}

.card-btn.info:hover {
  background: #f0f9ff;
  border-color: #0284c7;
}

/* 新建存档按钮 */
.new-save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid #10b981;
  border-radius: 0.375rem;
  background: white;
  color: #10b981;
  cursor: pointer;
  transition: all 0.2s ease;
}

.new-save-btn:hover {
  background: #f0fdf4;
  border-color: #059669;
  color: #059669;
}

.new-save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.save-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.detail-label {
  color: #64748b;
}

.detail-value {
  color: #0369a1;
  font-weight: 500;
}

/* 操作列表 */
.operations-list {
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.operation-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 0.5rem;
}

.operation-btn:hover {
  background: #f0f9ff;
}

.operation-btn.primary {
  background: linear-gradient(135deg, #0369a1 0%, #0284c7 100%);
  color: white;
}

.operation-btn.primary:hover {
  background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(3, 105, 161, 0.3);
}

.operation-btn.primary .btn-title,
.operation-btn.primary .btn-desc {
  color: white;
}

.operation-btn.danger:hover {
  background: #fef2f2;
  color: #ef4444;
}

.operation-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
}

.btn-title {
  font-weight: 500;
  color: #0369a1;
}

.btn-desc {
  font-size: 0.875rem;
  color: #64748b;
}

.operation-btn.danger .btn-title {
  color: #ef4444;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .save-stats {
    gap: 1rem;
  }

  .card-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .save-preview {
    justify-content: center;
  }

  .card-actions {
    justify-content: center;
  }

  .header-actions .btn-text {
    display: none;
  }
}

/* 深色主题 */
[data-theme='dark'] .save-panel {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
}

[data-theme='dark'] .panel-header,
[data-theme='dark'] .current-save-section,
[data-theme='dark'] .saves-section,
[data-theme='dark'] .operations-section {
  background: #1e293b;
  border-color: #475569;
}

/* 存档名图标样式 */
.auto-save-icon,
.last-save-icon {
  display: inline-block;
  margin-right: 0.25rem;
  vertical-align: middle;
}

.auto-save-icon {
  color: #10b981;
}

.last-save-icon {
  color: #3b82f6;
}

[data-theme='dark'] .section-header {
  background: #334155;
  border-bottom-color: #475569;
}

[data-theme='dark'] .panel-title,
[data-theme='dark'] .section-title,
[data-theme='dark'] .character-name,
[data-theme='dark'] .save-name {
  color: #0ea5e9;
}

[data-theme='dark'] .character-name-small {
  color: #94a3b8;
}

[data-theme='dark'] .save-subtitle,
[data-theme='dark'] .saves-count {
  color: #38bdf8;
}

[data-theme='dark'] .action-btn,
[data-theme='dark'] .card-btn {
  background: #374151;
  border-color: #475569;
  color: #0ea5e9;
}

[data-theme='dark'] .action-btn:hover,
[data-theme='dark'] .card-btn:hover {
  background: #4b5563;
}

[data-theme='dark'] .card-btn.primary {
  color: #10b981;
  border-color: #065f46;
}

[data-theme='dark'] .card-btn.primary:hover {
  background: #065f46;
}

[data-theme='dark'] .card-btn.warning {
  color: #f59e0b;
  border-color: #78350f;
}

[data-theme='dark'] .card-btn.warning:hover {
  background: #78350f;
}

[data-theme='dark'] .card-btn.info {
  color: #0ea5e9;
  border-color: #0c4a6e;
}

[data-theme='dark'] .card-btn.info:hover {
  background: #0c4a6e;
}

[data-theme='dark'] .new-save-btn {
  background: #374151;
  border-color: #10b981;
  color: #10b981;
}

[data-theme='dark'] .new-save-btn:hover {
  background: #065f46;
  border-color: #059669;
}

[data-theme='dark'] .save-card {
  background: #374151;
  border-color: #4b5563;
}

[data-theme='dark'] .save-card:hover {
  background: #4b5563;
}

[data-theme='dark'] .save-card.active {
  background: #1e40af;
  border-color: #0ea5e9;
}

[data-theme='dark'] .operation-btn:hover {
  background: #374151;
}

[data-theme='dark'] .btn-title {
  color: #e5e7eb;
}

/* 自动存档设置 */
.auto-save-settings-section {
  margin-bottom: 1.5rem;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #bae6fd;
  overflow: hidden;
}

.settings-list {
  padding: 0.5rem;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-radius: 0.5rem;
  transition: background 0.2s ease;
}

.setting-item:hover {
  background: #f8fafc;
}

.setting-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.setting-name {
  font-weight: 500;
  color: #1e293b;
}

.setting-desc {
  font-size: 0.875rem;
  color: #64748b;
}

.setting-control {
  display: flex;
  align-items: center;
}

/* 开关样式 */
.setting-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.setting-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: 0.2s;
  border-radius: 24px;
}

.switch-slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}

input:checked + .switch-slider {
  background-color: #3b82f6;
}

input:checked + .switch-slider:before {
  transform: translateX(20px);
}

/* 下拉选择框样式 */
.setting-select {
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background-color: white;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 12px;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: border-color 0.2s ease;
  appearance: none;
  min-width: 120px;
}

.setting-select:hover {
  border-color: #94a3b8;
}

.setting-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

[data-theme='dark'] .auto-save-settings-section {
  background: #1e293b;
  border-color: #475569;
}

[data-theme='dark'] .setting-item:hover {
  background: #334155;
}

[data-theme='dark'] .setting-name {
  color: #f1f5f9;
}

[data-theme='dark'] .setting-desc {
  color: #94a3b8;
}

[data-theme='dark'] .switch-slider {
  background-color: #4b5563;
}

[data-theme='dark'] .setting-select {
  background-color: #374151;
  border-color: #4b5563;
  color: #e5e7eb;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23e5e7eb' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
}

.interval-input {
  width: 60px;
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  text-align: center;
  margin-right: 0.5rem;
}

.unit-label {
  color: #64748b;
}

[data-theme='dark'] .interval-input {
  background-color: #374151;
  border-color: #4b5563;
  color: #e5e7eb;
}

[data-theme='dark'] .unit-label {
  color: #94a3b8;
}
</style>
