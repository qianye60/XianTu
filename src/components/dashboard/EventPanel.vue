<template>
  <div class="event-panel">
    <div class="event-toolbar">
      <div class="title">
        <span class="title-text">世界事件</span>
        <span class="meta">· 下次事件：{{ nextEventText || '未卜' }}</span>
      </div>
      <div class="toolbar-actions">
        <button class="tool-btn subtle" @click="resetNextEventTime">
          {{ nextEventText ? '重新抽取' : '抽取' }}
        </button>
        <button class="tool-btn" @click="showConfig = !showConfig">
          {{ showConfig ? '隐藏配置' : '事件配置' }}
        </button>
      </div>
    </div>

    <!-- 配置区域 -->
    <div v-if="showConfig" class="config-section">
      <!-- 基础配置 -->
      <div class="config-group">
        <div class="group-title">基础设置</div>

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
      </div>

      <!-- 事件类型开关 -->
      <div class="config-group">
        <div class="group-title">事件类型</div>

        <div class="event-types-grid">
          <div v-for="(enabled, type) in config.eventTypes" :key="type" class="event-type-item">
            <label class="event-type-label">
              <input type="checkbox" v-model="config.eventTypes[type]" @change="saveConfig" />
              <span class="event-type-name">{{ type }}</span>
            </label>
          </div>
        </div>

        <!-- 特殊NPC概率 -->
        <div class="config-item config-item-full" v-if="config.eventTypes['特殊NPC']">
          <div class="config-label">
            <span class="label-text">特殊NPC触发概率</span>
            <span class="label-hint">当触发事件时，有此概率生成特殊NPC登场事件（{{ config.specialNpcProbability }}%）</span>
          </div>
          <input
            type="range"
            class="config-slider"
            min="0"
            max="100"
            step="5"
            v-model.number="config.specialNpcProbability"
            @change="saveConfig"
          />
        </div>
      </div>

      <!-- 自定义提示词 -->
      <div class="config-group">
        <div class="group-title">自定义提示词</div>

        <div class="config-item config-item-full">
          <div class="config-label">
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
      </div>

      <!-- 自定义事件模板 -->
      <div class="config-group">
        <div class="group-title">
          自定义事件模板
          <button class="add-btn" @click="showAddCustomEvent = true">+ 添加</button>
        </div>

        <div v-if="config.customEvents.length === 0" class="empty-hint">
          暂无自定义事件，点击"添加"创建
        </div>

        <div v-else class="custom-events-list">
          <div v-for="(event, index) in config.customEvents" :key="event.id" class="custom-event-item">
            <div class="custom-event-header">
              <label class="custom-event-checkbox">
                <input type="checkbox" v-model="event.启用" @change="saveConfig" />
                <span class="custom-event-name">{{ event.名称 }}</span>
              </label>
              <div class="custom-event-actions">
                <button class="icon-btn" @click="editCustomEvent(index)" title="编辑">✏️</button>
                <button class="icon-btn" @click="deleteCustomEvent(index)" title="删除">🗑️</button>
              </div>
            </div>
            <div class="custom-event-info">
              <span class="custom-event-type">{{ event.类型 }}</span>
              <span class="custom-event-level">{{ event.影响等级 }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="config-actions">
        <button class="action-btn" @click="resetNextEventTime">
          重新抽取下次事件时间
        </button>
      </div>
    </div>

    <!-- 自定义事件编辑弹窗 -->
    <div v-if="showAddCustomEvent || editingEventIndex !== null" class="modal-overlay" @click.self="closeCustomEventModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingEventIndex !== null ? '编辑' : '添加' }}自定义事件</h3>
          <button class="close-btn" @click="closeCustomEventModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label>事件名称</label>
            <input v-model="customEventForm.名称" type="text" placeholder="例如：神秘宝藏现世" />
          </div>
          <div class="form-item">
            <label>事件类型</label>
            <select v-model="customEventForm.类型">
              <option value="宗门大战">宗门大战</option>
              <option value="世界变革">世界变革</option>
              <option value="异宝降世">异宝降世</option>
              <option value="秘境现世">秘境现世</option>
              <option value="人物风波">人物风波</option>
              <option value="势力变动">势力变动</option>
              <option value="天灾人祸">天灾人祸</option>
            </select>
          </div>
          <div class="form-item">
            <label>影响等级</label>
            <select v-model="customEventForm.影响等级">
              <option value="轻微">轻微</option>
              <option value="中等">中等</option>
              <option value="重大">重大</option>
              <option value="灾难">灾难</option>
            </select>
          </div>
          <div class="form-item">
            <label>事件描述模板</label>
            <textarea
              v-model="customEventForm.描述模板"
              placeholder="支持占位符：{玩家名}、{位置}、{境界}&#10;例如：{玩家名}在{位置}发现了一处神秘洞府..."
              rows="4"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeCustomEventModal">取消</button>
          <button class="confirm-btn" @click="saveCustomEvent">保存</button>
        </div>
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
            <div class="event-actions">
              <button class="icon-btn event-delete-btn" title="删除" @click="deleteEventById(e.事件ID)">🗑️</button>
            </div>
          </div>
          <!-- 事件元信息 -->
          <div class="event-meta">
            <span v-if="e.影响等级" class="meta-tag" :class="'level-' + e.影响等级">{{ e.影响等级 }}</span>
            <span v-if="e.影响范围" class="meta-tag scope">{{ e.影响范围 }}</span>
            <span v-if="e.事件来源" class="meta-tag source">{{ e.事件来源 }}</span>
          </div>
          <!-- 相关人物/势力 -->
          <div v-if="(e.相关人物 && e.相关人物.length) || (e.相关势力 && e.相关势力.length)" class="event-relations">
            <span v-if="e.相关人物 && e.相关人物.length" class="relation-group">
              <span class="relation-label">相关人物:</span>
              <span v-for="(person, idx) in e.相关人物" :key="idx" class="relation-item person">{{ person }}</span>
            </span>
            <span v-if="e.相关势力 && e.相关势力.length" class="relation-group">
              <span class="relation-label">相关势力:</span>
              <span v-for="(faction, idx) in e.相关势力" :key="idx" class="relation-item faction">{{ faction }}</span>
            </span>
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
import type { EventSystem, GameEvent, GameTime, CustomEventTemplate } from '@/types/game';
import { toast } from '@/utils/toast';

const gameStateStore = useGameStateStore();
const characterStore = useCharacterStore();

const showConfig = ref(false);
const showAddCustomEvent = ref(false);
const editingEventIndex = ref<number | null>(null);

const eventSystem = computed<EventSystem>(() => gameStateStore.eventSystem);

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
  eventTypes: {
    '宗门大战': true,
    '世界变革': true,
    '异宝降世': true,
    '秘境现世': true,
    '人物风波': true,
    '势力变动': true,
    '天灾人祸': true,
    '特殊NPC': true,
  } as Record<string, boolean>,
  specialNpcProbability: 20,
  customEvents: [] as CustomEventTemplate[],
});

// 自定义事件表单
const customEventForm = reactive({
  名称: '',
  类型: '世界变革' as any,
  描述模板: '',
  影响等级: '中等' as any,
});

// 加载配置
const loadConfig = () => {
  if (eventSystem.value?.配置) {
    const cfg = eventSystem.value.配置;
    config.enabled = cfg.启用随机事件 !== false;
    config.minYears = Number(cfg.最小间隔年 ?? 1);
    config.maxYears = Number(cfg.最大间隔年 ?? 10);
    config.prompt = String(cfg.事件提示词 ?? '');

    // 加载事件类型开关
    if (cfg.启用事件类型) {
      Object.keys(config.eventTypes).forEach(type => {
        if (type in cfg.启用事件类型!) {
          config.eventTypes[type] = cfg.启用事件类型![type as keyof typeof cfg.启用事件类型] !== false;
        }
      });
    }

    // 加载特殊NPC概率
    config.specialNpcProbability = Number(cfg.特殊NPC概率 ?? 20);

    // 加载自定义事件
    config.customEvents = (cfg.自定义事件 || []).map(e => ({ ...e }));
  }
};

// 保存配置
const saveConfig = async () => {
  try {
    if (eventSystem.value?.配置) {
      const cfg = eventSystem.value.配置;
      cfg.启用随机事件 = config.enabled;
      cfg.最小间隔年 = Math.max(1, Math.floor(config.minYears));
      cfg.最大间隔年 = Math.max(cfg.最小间隔年, Math.floor(config.maxYears));
      cfg.事件提示词 = config.prompt || '';

      // 保存事件类型开关
      if (!cfg.启用事件类型) cfg.启用事件类型 = {};
      Object.keys(config.eventTypes).forEach(type => {
        cfg.启用事件类型![type as keyof typeof cfg.启用事件类型] = config.eventTypes[type];
      });

      // 保存特殊NPC概率
      cfg.特殊NPC概率 = config.specialNpcProbability;

      // 保存自定义事件
      cfg.自定义事件 = config.customEvents.map(e => ({ ...e }));

      // 保存到数据库
      await characterStore.saveCurrentGame();
      toast.success('事件配置已保存');
    }
  } catch (error) {
    console.error('保存事件配置失败:', error);
    toast.error('保存配置失败，请重试');
  }
};

// 编辑自定义事件
const editCustomEvent = (index: number) => {
  const event = config.customEvents[index];
  customEventForm.名称 = event.名称;
  customEventForm.类型 = event.类型;
  customEventForm.描述模板 = event.描述模板;
  customEventForm.影响等级 = event.影响等级;
  editingEventIndex.value = index;
};

// 删除自定义事件
const deleteCustomEvent = async (index: number) => {
  if (confirm('确定要删除这个自定义事件吗？')) {
    config.customEvents.splice(index, 1);
    await saveConfig();
    toast.success('已删除自定义事件');
  }
};

// 关闭自定义事件弹窗
const closeCustomEventModal = () => {
  showAddCustomEvent.value = false;
  editingEventIndex.value = null;
  customEventForm.名称 = '';
  customEventForm.类型 = '世界变革';
  customEventForm.描述模板 = '';
  customEventForm.影响等级 = '中等';
};

// 保存自定义事件
const saveCustomEvent = async () => {
  if (!customEventForm.名称.trim()) {
    toast.error('请输入事件名称');
    return;
  }
  if (!customEventForm.描述模板.trim()) {
    toast.error('请输入事件描述模板');
    return;
  }

  const eventData: CustomEventTemplate = {
    id: editingEventIndex.value !== null
      ? config.customEvents[editingEventIndex.value].id
      : `custom_${Date.now()}`,
    名称: customEventForm.名称.trim(),
    类型: customEventForm.类型,
    描述模板: customEventForm.描述模板.trim(),
    影响等级: customEventForm.影响等级,
    启用: true,
  };

  if (editingEventIndex.value !== null) {
    config.customEvents[editingEventIndex.value] = eventData;
    toast.success('已更新自定义事件');
  } else {
    config.customEvents.push(eventData);
    toast.success('已添加自定义事件');
  }

  await saveConfig();
  closeCustomEventModal();
};

// 重置下次事件时间
const resetNextEventTime = async () => {
  try {
    const now = gameStateStore.gameTime;
    if (!now) {
      toast.error('无法获取当前游戏时间');
      return;
    }

    const minYears = Math.max(1, Math.floor(config.minYears));
    const maxYears = Math.max(minYears, Math.floor(config.maxYears));
    const years = Math.floor(Math.random() * (maxYears - minYears + 1)) + minYears;

    const newTime: GameTime = {
      年: now.年 + years,
      月: now.月,
      日: now.日,
      小时: now.小时,
      分钟: now.分钟,
    };

    // 使用 store 的通用更新方法，确保嵌套对象响应式更新
    gameStateStore.updateState('eventSystem.下次事件时间', newTime);
    await characterStore.saveCurrentGame();
    toast.success('已重新抽取下次世界事件时间');
  } catch (error) {
    console.error('重置下次事件失败:', error);
    toast.error('重置失败，请重试');
  }
};

const deleteEventById = async (eventId: string) => {
  try {
    const list = (eventSystem.value?.事件记录 || []) as GameEvent[];
    const index = list.findIndex(e => e.事件ID === eventId);
    if (index === -1) return;

    const target = list[index];
    const ok = confirm(`确定要删除这条事件记录吗？\n\n【${target.事件类型}】${target.事件名称}`);
    if (!ok) return;

    const next = [...list];
    next.splice(index, 1);
    gameStateStore.updateState('eventSystem.事件记录', next);
    await characterStore.saveCurrentGame();
    toast.success('已删除事件记录');
  } catch (error) {
    console.error('删除事件记录失败:', error);
    toast.error('删除失败，请重试');
  }
};

function formatGameTime(time: GameTime): string {
  const hh = String(time.小时 ?? 0).padStart(2, '0');
  const mm = String(time.分钟 ?? 0).padStart(2, '0');
  return `${time.年}年${time.月}月${time.日}日 ${hh}:${mm}`;
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

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-btn.subtle {
  color: var(--color-text-secondary);
}

/* 配置区域 */
.config-section {
  padding: 12px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-light);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 70vh;
  overflow-y: auto;
}

/* 配置分组 */
.config-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.group-title {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-text);
  padding-bottom: 6px;
  border-bottom: 2px solid var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.add-btn {
  padding: 4px 10px;
  font-size: 0.85rem;
  border-radius: 6px;
  border: 1px solid var(--color-primary);
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
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

/* 事件类型网格 */
.event-types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.event-type-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 10px;
  transition: all 0.2s ease;
}

.event-type-item:hover {
  border-color: var(--color-primary);
  background: var(--color-surface-hover);
}

.event-type-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.event-type-label input[type="checkbox"] {
  cursor: pointer;
}

.event-type-name {
  font-size: 0.9rem;
  color: var(--color-text);
}

/* 滑块样式 */
.config-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--color-border);
  outline: none;
  margin-top: 8px;
  cursor: pointer;
}

.config-slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.config-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.config-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.config-slider::-moz-range-thumb:hover {
  transform: scale(1.2);
}

/* 自定义事件列表 */
.custom-events-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.custom-event-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px;
  transition: all 0.2s ease;
}

.custom-event-item:hover {
  border-color: var(--color-primary);
}

.custom-event-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.custom-event-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex: 1;
}

.custom-event-checkbox input[type="checkbox"] {
  cursor: pointer;
}

.custom-event-name {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.9rem;
}

.custom-event-actions {
  display: flex;
  gap: 6px;
}

.icon-btn {
  padding: 4px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
  border-radius: 4px;
}

.icon-btn:hover {
  background: var(--color-surface-hover);
  transform: scale(1.1);
}

.custom-event-info {
  display: flex;
  gap: 8px;
  font-size: 0.8rem;
}

.custom-event-type,
.custom-event-level {
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--color-surface-light);
  color: var(--color-text-secondary);
}

.empty-hint {
  padding: 12px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}

/* 弹窗样式 */
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
  padding: 20px;
}

.modal-content {
  background: var(--color-surface);
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--color-text);
}

.close-btn {
  padding: 4px 8px;
  border: none;
  background: transparent;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
  border-radius: 4px;
}

.close-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.form-item {
  margin-bottom: 16px;
}

.form-item label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.9rem;
}

.form-item input[type="text"],
.form-item select,
.form-item textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.9rem;
  font-family: inherit;
}

.form-item input:focus,
.form-item select:focus,
.form-item textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-item textarea {
  resize: vertical;
  min-height: 80px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
}

.cancel-btn,
.confirm-btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.cancel-btn {
  background: var(--color-surface);
  color: var(--color-text);
}

.cancel-btn:hover {
  background: var(--color-surface-hover);
}

.confirm-btn {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.confirm-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
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
  grid-template-columns: auto 1fr auto auto;
  gap: 10px;
  align-items: baseline;
  margin-bottom: 8px;
}

.event-actions {
  display: flex;
  justify-content: flex-end;
}

.event-delete-btn {
  color: var(--color-text-secondary);
}

.event-delete-btn:hover {
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.08);
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

/* 事件元信息 */
.event-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.meta-tag {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--color-surface-light);
  color: var(--color-text-secondary);
}

.meta-tag.level-轻微 {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.meta-tag.level-中等 {
  background: rgba(234, 179, 8, 0.15);
  color: #eab308;
}

.meta-tag.level-重大 {
  background: rgba(249, 115, 22, 0.15);
  color: #f97316;
}

.meta-tag.level-灾难 {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.meta-tag.scope {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.meta-tag.source {
  background: rgba(139, 92, 246, 0.12);
  color: #8b5cf6;
}

/* 相关人物/势力 */
.event-relations {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 0.82rem;
}

.relation-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.relation-label {
  color: var(--color-text-secondary);
}

.relation-item {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.78rem;
}

.relation-item.person {
  background: rgba(236, 72, 153, 0.12);
  color: #ec4899;
}

.relation-item.faction {
  background: rgba(20, 184, 166, 0.12);
  color: #14b8a6;
}
</style>
