<template>
  <div class="event-panel">
    <div class="event-toolbar">
      <div class="title">
        <span class="title-text">世界事件</span>
        <span class="meta" v-if="nextEventText">· 下次事件：{{ nextEventText }}</span>
      </div>
      <button class="tool-btn" @click="showConfig = !showConfig">
        {{ showConfig ? '隐藏配置' : '事件配置' }}
      </button>
    </div>

    <!-- 配置区域 -->
    <div v-if="showConfig" class="config-section">
      <div class="config-item">
        <div class="config-label">
          <span class="label-text">启用世界事件</span>
          <span class="label-hint">游戏时间推进时自动发生影响世界的事件</span>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" v-model="config.enabled" @change="saveConfig" />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="config-item">
        <div class="config-label">
          <span class="label-text">事件间隔（最小）</span>
          <span class="label-hint">随机事件最短间隔（年）</span>
        </div>
        <input
          type="number"
          class="config-input"
          min="1"
          step="1"
          v-model.number="config.minYears"
          @change="saveConfig"
        />
      </div>

      <div class="config-item">
        <div class="config-label">
          <span class="label-text">事件间隔（最大）</span>
          <span class="label-hint">随机事件最长间隔（年）</span>
        </div>
        <input
          type="number"
          class="config-input"
          min="1"
          step="1"
          v-model.number="config.maxYears"
          @change="saveConfig"
        />
      </div>

      <div class="config-item config-item-full">
        <div class="config-label">
          <span class="label-text">自定义事件提示词</span>
          <span class="label-hint">为世界事件生成添加自定义指令（可选）</span>
        </div>
        <textarea
          v-model="config.prompt"
          class="config-textarea"
          placeholder="例如：更偏向宗门大战、秘境现世、好友遭遇，并尽量让事件影响玩家..."
          rows="3"
          @change="saveConfig"
        ></textarea>
      </div>

      <div class="config-actions">
        <button class="action-btn" @click="resetNextEventTime">
          重新抽取下次事件时间
        </button>
      </div>
    </div>

    <div class="event-list">
      <div v-if="events.length === 0" class="empty-state">
        <div class="empty-title">暂无事件记录</div>
        <div class="empty-hint">事件会随游戏时间推进自动发生。</div>
      </div>

      <div v-else class="events">
        <div v-for="e in events" :key="e.事件ID" class="event-item">
          <div class="event-header">
            <span class="event-type">{{ e.事件类型 }}</span>
            <span class="event-name">{{ e.事件名称 }}</span>
            <span class="event-time">{{ formatGameTime(e.发生时间) }}</span>
          </div>
          <div class="event-desc">{{ e.事件描述 }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useCharacterStore } from '@/stores/characterStore';
import type { GameEvent, GameTime } from '@/types/game';
import { toast } from '@/utils/toast';

const gameStateStore = useGameStateStore();
const characterStore = useCharacterStore();

const showConfig = ref(false);

const eventSystem = computed(() => (gameStateStore as any).eventSystem);

const events = computed<GameEvent[]>(() => {
  const list = (eventSystem.value?.事件记录 || []) as GameEvent[];
  return [...list].slice().reverse();
});

const nextEventText = computed(() => {
  const t = eventSystem.value?.下次事件时间 as GameTime | null | undefined;
  if (!t) return '';
  return formatGameTime(t);
});

// 配置对象
const config = reactive({
  enabled: true,
  minYears: 1,
  maxYears: 10,
  prompt: '',
});

// 加载配置
const loadConfig = () => {
  if (eventSystem.value?.配置) {
    const cfg = eventSystem.value.配置 as any;
    config.enabled = cfg.启用随机事件 !== false;
    config.minYears = Number(cfg.最小间隔年 ?? 1);
    config.maxYears = Number(cfg.最大间隔年 ?? 10);
    config.prompt = String(cfg.事件提示词 ?? '');
  }
};

// 保存配置
const saveConfig = async () => {
  try {
    if (eventSystem.value?.配置) {
      const cfg = eventSystem.value.配置 as any;
      cfg.启用随机事件 = config.enabled;
      cfg.最小间隔年 = Math.max(1, Math.floor(config.minYears));
      cfg.最大间隔年 = Math.max(cfg.最小间隔年, Math.floor(config.maxYears));
      cfg.事件提示词 = config.prompt || '';

      // 保存到数据库
      await characterStore.saveCurrentGame();
      toast.success('事件配置已保存');
    }
  } catch (error) {
    console.error('保存事件配置失败:', error);
    toast.error('保存配置失败，请重试');
  }
};

// 重置下次事件时间
const resetNextEventTime = async () => {
  try {
    if (eventSystem.value) {
      (eventSystem.value as any).下次事件时间 = null;
      await characterStore.saveCurrentGame();
      toast.success('已重新抽取下次世界事件时间');
    }
  } catch (error) {
    console.error('重置下次事件失败:', error);
    toast.error('重置失败，请重试');
  }
};

function formatGameTime(time: GameTime): string {
  return `${time.年}年${time.月}月${time.日}日 ${String(time.小时).padStart(2, '0')}:${String(time.分钟).padStart(2, '0')}`;
}

onMounted(() => {
  loadConfig();
});
</script>

<style scoped>
.event-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.event-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.title-text {
  font-weight: 700;
  color: var(--color-text);
}

.meta {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.tool-btn {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-btn:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-hover);
}

/* 配置区域 */
.config-section {
  padding: 12px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-light);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.config-item-full {
  flex-direction: column;
  align-items: stretch;
}

.config-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.label-text {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.9rem;
}

.label-hint {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.config-input {
  width: 100px;
  padding: 6px 8px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.9rem;
}

.config-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.config-textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
  min-height: 60px;
  margin-top: 6px;
}

.config-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.config-textarea::placeholder {
  color: var(--color-text-muted);
}

/* 开关样式 */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
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

.toggle-slider:before {
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

input:checked + .toggle-slider {
  background-color: var(--color-primary);
}

input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.config-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.action-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-hover);
}

.event-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px;
}

.empty-state {
  padding: 18px;
  border: 1px dashed var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}

.empty-title {
  font-weight: 600;
  margin-bottom: 6px;
}

.empty-hint {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.event-item {
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  margin-bottom: 10px;
}

.event-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: baseline;
  margin-bottom: 8px;
}

.event-type {
  font-size: 0.78rem;
  color: var(--color-primary);
  border: 1px solid rgba(var(--color-primary-rgb), 0.35);
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.event-name {
  font-weight: 700;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-time {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.event-desc {
  color: var(--color-text);
  line-height: 1.55;
  white-space: pre-wrap;
}
</style>

