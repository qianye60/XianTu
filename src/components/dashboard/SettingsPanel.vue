<template>
  <div class="settings-panel">
    <!-- 头部 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="header-icon">⚙️</div>
        <div class="header-info">
          <h3 class="panel-title">{{ t('游戏设置') }}</h3>
          <span class="settings-subtitle">{{ t('自定义您的游戏体验') }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="resetSettings">
          <RotateCcw :size="16" />
          <span class="btn-text">{{ t('重置') }}</span>
        </button>
        <button class="action-btn primary" @click="saveSettings">
          <Save :size="16" />
          <span class="btn-text">{{ t('保存') }}</span>
        </button>
      </div>
    </div>

    <!-- 设置内容 -->
    <div class="settings-container">
      <!-- 显示设置 -->
      <div class="settings-section">
        <div class="section-header">
          <h4 class="section-title">🎨 {{ t('显示设置') }}</h4>
        </div>
        <div class="settings-list">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('语言设置') }}</label>
              <span class="setting-desc">{{ t('选择界面语言') }}</span>
            </div>
            <div class="setting-control">
              <select v-model="currentLanguage" class="setting-select" @change="onLanguageChange">
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('主题模式') }}</label>
              <span class="setting-desc">{{ t('选择明亮或暗黑主题') }}</span>
            </div>
            <div class="setting-control">
              <select v-model="settings.theme" class="setting-select" @change="onSettingChange">
                <option value="light">{{ t('明亮') }}</option>
                <option value="dark">{{ t('暗黑') }}</option>
                <option value="auto">{{ t('跟随系统') }}</option>
              </select>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('界面缩放') }}</label>
              <span class="setting-desc">{{ t('调整UI界面大小') }}</span>
            </div>
            <div class="setting-control">
              <div class="range-container">
                <input
                  type="range"
                  v-model.number="settings.uiScale"
                  min="80"
                  max="120"
                  step="5"
                  class="setting-range"
                  @input="applyUIScale"
                />
                <span class="range-value">{{ settings.uiScale }}%</span>
              </div>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('文字大小') }}</label>
              <span class="setting-desc">{{ t('调整游戏文字显示大小（像素）') }}</span>
            </div>
            <div class="setting-control">
              <div class="range-container">
                <input
                  type="range"
                  v-model.number="settings.fontSize"
                  min="12"
                  max="24"
                  step="1"
                  class="setting-range"
                  @input="applyFontSize"
                />
                <span class="range-value">{{ settings.fontSize }}px</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 游戏设置 -->
      <div class="settings-section">
        <div class="section-header">
          <h4 class="section-title">🎮 {{ t('游戏设置') }}</h4>
        </div>
        <div class="settings-list">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('快速动画') }}</label>
              <span class="setting-desc">{{ t('加速界面动画和过渡效果') }}</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="settings.fastAnimations" @change="applyAnimationSettings(); onSettingChange()" />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- 游戏功能 -->
      <div class="settings-section">
        <div class="section-header">
          <h4 class="section-title">🎮 {{ t('游戏功能') }}</h4>
        </div>
        <div class="settings-list">
          <!-- 任务系统配置 -->
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('系统任务类型') }}</label>
              <span class="setting-desc">{{ t('选择AI生成任务的风格类型') }}</span>
            </div>
            <div class="setting-control">
              <select v-model="settings.questSystemType" class="setting-select">
                <option value="修仙辅助系统">{{ t('修仙辅助系统') }}</option>
                <option value="道侣养成系统">{{ t('道侣养成系统') }}</option>
                <option value="宗门发展系统">{{ t('宗门发展系统') }}</option>
                <option value="探索冒险系统">{{ t('探索冒险系统') }}</option>
                <option value="战斗挑战系统">{{ t('战斗挑战系统') }}</option>
                <option value="资源收集系统">{{ t('资源收集系统') }}</option>
              </select>
            </div>
          </div>

          <div class="setting-item setting-item-full">
            <div class="setting-info">
              <label class="setting-name">{{ t('自定义任务提示词') }}</label>
              <span class="setting-desc">{{
                t('为AI任务生成添加自定义指令（可选，留空使用默认）')
              }}</span>
            </div>
            <div class="setting-control-full">
              <textarea
                v-model="settings.questSystemPrompt"
                class="setting-textarea"
                :placeholder="t('例如：生成更多战斗类任务，奖励偏向灵石...')"
                rows="3"
              ></textarea>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('行动选项') }}</label>
              <span class="setting-desc">{{ t('AI生成可选的行动建议') }}</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="uiStore.enableActionOptions" />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item setting-item-full">
            <div class="setting-info">
              <label class="setting-name">{{ t('自定义行动选项提示词') }}</label>
              <span class="setting-desc">{{
                t('指导AI生成特定风格的行动选项（可选，留空使用默认）')
              }}</span>
            </div>
            <div class="setting-control-full">
              <textarea
                v-model="uiStore.actionOptionsPrompt"
                class="setting-textarea"
                :placeholder="t('例如：多生成修炼和探索类选项，减少战斗选项...')"
                rows="3"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- AI服务配置 -->
      <div class="settings-section">
        <div class="section-header">
          <h4 class="section-title">🤖 {{ t('AI服务配置') }}</h4>
        </div>
        <div class="settings-list">
          <!-- 道号修改 -->
          <div class="setting-item setting-item-full" v-if="currentPlayerName">
            <div class="setting-info">
              <label class="setting-name">{{ t('修改道号') }}</label>
              <span class="setting-desc">{{ t('修改当前角色的名字') }}</span>
            </div>
            <div class="setting-control-full" style="display: flex; gap: 0.5rem">
              <input
                v-model="newPlayerName"
                class="form-input-inline"
                :placeholder="currentPlayerName"
                style="flex: 1"
              />
              <button
                class="utility-btn primary"
                @click="updatePlayerName"
                :disabled="!newPlayerName || newPlayerName === currentPlayerName"
              >
                <Save :size="16" />
                {{ t('确认') }}
              </button>
            </div>
          </div>

          <div v-if="isTavernEnvFlag" class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('AI模式') }}</label>
              <span class="setting-desc"
                >当前为酒馆环境：默认使用酒馆API。非酒馆环境才需要配置自定义API。</span
              >
            </div>
          </div>

          <template v-if="isTavernEnvFlag">
            <div class="setting-item">
              <div class="setting-info">
                <label class="setting-name">{{ t('🔞 启用成人内容（私密信息）') }}</label>
                <span class="setting-desc">{{
                  t('生成和显示NPC的私密信息模块（包含成人向内容，默认开启）')
                }}</span>
              </div>
              <div class="setting-control">
                <label class="setting-switch">
                  <input type="checkbox" v-model="settings.enableNsfwMode" />
                  <span class="switch-slider"></span>
                </label>
              </div>
            </div>

            <div class="setting-item" v-if="settings.enableNsfwMode">
              <div class="setting-info">
                <label class="setting-name">{{ t('👥 私密信息生成范围') }}</label>
                <span class="setting-desc">{{ t('选择为哪些性别的NPC生成私密信息') }}</span>
              </div>
              <div class="setting-control">
                <select v-model="settings.nsfwGenderFilter" class="setting-select">
                  <option value="female">{{ t('仅女性') }}</option>
                  <option value="male">{{ t('仅男性') }}</option>
                  <option value="all">{{ t('所有性别') }}</option>
                </select>
              </div>
            </div>
          </template>

          <template v-if="!isTavernEnvFlag">
            <div class="setting-item">
              <div class="setting-info">
                <label class="setting-name">{{ t('API提供商') }}</label>
                <span class="setting-desc">{{ t('选择AI服务提供商') }}</span>
              </div>
              <div class="setting-control">
                <select
                  v-model="aiConfig.customAPI.provider"
                  class="setting-select"
                  @change="onProviderChange"
                >
                  <option value="openai">OpenAI</option>
                  <option value="claude">Claude</option>
                  <option value="gemini">Gemini</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="custom">{{ t('自定义(OpenAI兼容)') }}</option>
                </select>
              </div>
            </div>

            <div class="setting-item setting-item-full">
              <div class="setting-info">
                <label class="setting-name">{{ t('API地址') }}</label>
                <span class="setting-desc">{{
                  aiConfig.customAPI.provider === 'custom'
                    ? t('OpenAI兼容的API端点')
                    : t('可使用默认地址或自定义代理')
                }}</span>
              </div>
              <div class="setting-control-full">
                <input
                  v-model="aiConfig.customAPI.url"
                  class="form-input-inline"
                  :placeholder="
                    API_PROVIDER_PRESETS[aiConfig.customAPI.provider]?.url ||
                    'https://api.openai.com'
                  "
                />
              </div>
            </div>

            <div class="setting-item setting-item-full">
              <div class="setting-info">
                <label class="setting-name">{{ t('API密钥') }}</label>
                <span class="setting-desc">{{ t('您的API Key') }}</span>
              </div>
              <div class="setting-control-full">
                <input
                  v-model="aiConfig.customAPI.apiKey"
                  type="password"
                  class="form-input-inline"
                  placeholder="sk-..."
                />
              </div>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <label class="setting-name">{{ t('模型名称') }}</label>
                <span class="setting-desc">{{ t('使用的AI模型') }}</span>
              </div>
              <div class="setting-control">
                <select v-model="aiConfig.customAPI.model" class="setting-select">
                  <option v-for="model in availableModels" :key="model" :value="model">
                    {{ model }}
                  </option>
                </select>
                <button
                  class="utility-btn"
                  @click="fetchModels"
                  :disabled="isFetchingModels"
                  style="margin-left: 0.5rem"
                >
                  <RefreshCw :size="16" :class="{ 'loading-pulse': isFetchingModels }" />
                  {{ isFetchingModels ? t('获取中...') : t('获取') }}
                </button>
              </div>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <label class="setting-name">{{ t('AI API测试') }}</label>
                <span class="setting-desc">{{ t('让AI仅返回“仙途本-连通测试-OK”，检测到即成功') }}</span>
              </div>
              <div class="setting-control" style="display: flex; gap: 0.5rem; align-items: center">
                <button class="utility-btn" @click="testAIApi" :disabled="aiApiTestState === 'testing'">
                  <FlaskConical :size="16" :class="{ 'loading-pulse': aiApiTestState === 'testing' }" />
                  {{ aiApiTestState === 'testing' ? t('测试中...') : t('测试') }}
                </button>
                <span v-if="aiApiTestState === 'success'" class="auth-status verified">{{ t('成功') }}</span>
                <span v-else-if="aiApiTestState === 'fail'" class="auth-status unverified">{{ t('失败') }}</span>
                <button v-if="aiApiTestState !== 'idle'" class="utility-btn" @click="openAIApiTestDetails">
                  <FileText :size="16" />
                  {{ t('详情') }}
                </button>
              </div>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <label class="setting-name">{{ t('温度参数') }}</label>
                <span class="setting-desc">{{ t('控制输出随机性（0-2）') }}</span>
              </div>
              <div class="setting-control">
                <div class="range-container">
                  <input
                    type="range"
                    v-model.number="aiConfig.customAPI.temperature"
                    min="0"
                    max="2"
                    step="0.1"
                    class="setting-range"
                  />
                  <span class="range-value">{{ aiConfig.customAPI.temperature }}</span>
                </div>
              </div>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <label class="setting-name">{{ t('最大Token数') }}</label>
                <span class="setting-desc">{{ t('单次生成的最大长度') }}</span>
              </div>
              <div class="setting-control">
                <input
                  v-model.number="aiConfig.customAPI.maxTokens"
                  type="number"
                  class="setting-select"
                  placeholder="2000"
                  min="100"
                  max="8000"
                />
              </div>
            </div>
          </template>

          <!-- 通用AI设置 -->
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('流式传输') }}</label>
              <span class="setting-desc">{{ t('实时显示AI生成内容') }}</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="streamingEnabled" />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('分步生成') }}</label>
              <span class="setting-desc">{{ t('一次生成分两步：第1步（可流式）先出正文；第2步（非流式）再出记忆/指令/行动选项（会多一次API调用；thinking会自动隐藏）') }}</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="settings.splitResponseGeneration" @change="onSettingChange" />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('记忆总结模式') }}</label>
              <span class="setting-desc">{{ t('Raw模式更准确，标准模式包含预设') }}</span>
            </div>
            <div class="setting-control">
              <select v-model="aiConfig.memorySummaryMode" class="setting-select">
                <option value="raw">{{ t('Raw模式（推荐）') }}</option>
                <option value="standard">{{ t('标准模式') }}</option>
              </select>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('开局生成模式') }}</label>
              <span class="setting-desc">{{ t('角色初始化使用的生成模式') }}</span>
            </div>
            <div class="setting-control">
              <select v-model="aiConfig.initMode" class="setting-select">
                <option value="generate">{{ t('标准模式') }}</option>
                <option value="generateRaw">{{ t('Raw模式') }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- 高级设置 -->
      <div class="settings-section">
        <div class="section-header">
          <h4 class="section-title">{{ t('🔧 高级设置') }}</h4>
        </div>
        <div class="settings-list">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('调试模式') }}</label>
              <span class="setting-desc">{{ t('启用开发者调试信息和详细日志') }}</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="settings.debugMode" @change="onSettingChange" />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item" v-if="settings.debugMode">
            <div class="setting-info">
              <label class="setting-name">{{ t('控制台调试') }}</label>
              <span class="setting-desc">{{ t('在浏览器控制台显示详细调试信息') }}</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="settings.consoleDebug" @change="onSettingChange" />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item" v-if="settings.debugMode">
            <div class="setting-info">
              <label class="setting-name">{{ t('性能监控') }}</label>
              <span class="setting-desc">{{ t('监控组件性能和加载时间') }}</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input
                  type="checkbox"
                  v-model="settings.performanceMonitor"
                  @change="onSettingChange"
                />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('使用系统CoT') }}</label>
              <span class="setting-desc">{{
                t('启用内置思维链提示词（关闭后使用预设中的CoT）')
              }}</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="uiStore.useSystemCot" />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item setting-item-full">
            <div class="setting-info">
              <label class="setting-name">{{ t('自定义正则删标签') }}</label>
              <span class="setting-desc">{{
                t('不用写正则：填要删除的“标签名/文字”；进阶：可写正则（每行一个）')
              }}</span>
            </div>
            <div class="setting-control-full">
              <textarea
                v-model="settings.customStripTags"
                class="setting-textarea"
                :placeholder="t('【简单】要删除的标签名（每行一个）\\n例如：thinking\\nanalysis\\nimage')"
                rows="3"
              ></textarea>
              <textarea
                v-model="settings.customStripText"
                class="setting-textarea"
                :placeholder="t('【简单】要删除的固定文字（每行一个，会按原样删除）\\n例如：千夜\\n[图片]')"
                rows="3"
                style="margin-top: 0.5rem"
              ></textarea>
              <textarea
                v-model="settings.customStripRegex"
                class="setting-textarea"
                :placeholder="t('【进阶】正则规则（每行一个）\\n支持：/pattern/flags 或 纯pattern\\n例如：\\n<thinking>[\\\\s\\\\S]*?<\\\\/thinking>\\n<analysis>[\\\\s\\\\S]*?<\\\\/analysis>')"
                rows="4"
                style="margin-top: 0.5rem"
              ></textarea>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('正则替换规则') }}</label>
              <span class="setting-desc">{{ t('对AI输出进行替换：正则 / 纯文本（用于格式修正、屏蔽词替换等）') }}</span>
            </div>
            <div class="setting-control">
              <button class="utility-btn" @click="showReplaceRulesModal = true">
                {{ t('编辑规则') }} <span v-if="enabledReplaceRulesCount > 0">({{ enabledReplaceRulesCount }})</span>
              </button>
            </div>
          </div>

          <TextReplaceRulesModal
            :open="showReplaceRulesModal"
            :rules="settings.replaceRules"
            @close="showReplaceRulesModal = false"
            @save="handleSaveReplaceRules"
          />

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('提示词管理') }}</label>
              <span class="setting-desc">{{ t('自定义AI提示词和规则') }}</span>
            </div>
            <div class="setting-control">
              <button class="utility-btn" @click="openPromptManagement">
                <FileText :size="16" />
                {{ t('管理') }}
              </button>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('导入设置') }}</label>
              <span class="setting-desc">{{ t('从文件恢复设置配置') }}</span>
            </div>
            <div class="setting-control">
              <button class="utility-btn" @click="importSettings">
                <Upload :size="16" />
                {{ t('导入') }}
              </button>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('清理缓存') }}</label>
              <span class="setting-desc">{{ t('清除游戏临时数据和缓存') }}</span>
            </div>
            <div class="setting-control">
              <button class="utility-btn" @click="clearCache">
                <Trash2 :size="16" />
                {{ t('清理') }}
              </button>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('导出设置') }}</label>
              <span class="setting-desc">{{ t('备份当前设置配置') }}</span>
            </div>
            <div class="setting-control">
              <button class="utility-btn" @click="exportSettings">
                <Download :size="16" />
                {{ t('导出') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue';
import { Save, RotateCcw, Trash2, Download, Upload, FileText, RefreshCw, FlaskConical } from 'lucide-vue-next';
import { toast } from '@/utils/toast';
import { debug } from '@/utils/debug';
import { useI18n } from '@/i18n';
import { aiService } from '@/services/aiService';
import TextReplaceRulesModal from '@/components/common/TextReplaceRulesModal.vue';
import type { TextReplaceRule } from '@/types/textRules';
import { useCharacterStore } from '@/stores/characterStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useUIStore } from '@/stores/uiStore';
import { isTavernEnv } from '@/utils/tavern';

const { t, setLanguage, currentLanguage } = useI18n();
const characterStore = useCharacterStore();
const gameStateStore = useGameStateStore();
const uiStore = useUIStore();
const isTavernEnvFlag = isTavernEnv();

const onLanguageChange = () => {
  setLanguage(currentLanguage.value);
  toast.success('语言设置已更新');
};

// AI服务配置
import { API_PROVIDER_PRESETS, type APIProvider } from '@/services/aiService';

const aiConfig = reactive({
  mode: (isTavernEnvFlag ? 'tavern' : 'custom') as 'tavern' | 'custom',
  streaming: true,
  memorySummaryMode: 'raw' as 'raw' | 'standard',
  initMode: 'generate' as 'generate' | 'generateRaw',
  customAPI: {
    provider: 'openai' as APIProvider,
    url: '',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 16000
  }
});

const streamingEnabled = computed({
  get: () => uiStore.useStreaming,
  set: (val: boolean) => {
    uiStore.useStreaming = val;
    aiConfig.streaming = val;
  }
});

// API提供商切换处理
const onProviderChange = () => {
  const preset = API_PROVIDER_PRESETS[aiConfig.customAPI.provider];
  if (preset && aiConfig.customAPI.provider !== 'custom') {
    aiConfig.customAPI.url = preset.url;
    aiConfig.customAPI.model = preset.defaultModel;
    // 更新可选模型列表
    availableModels.value = [preset.defaultModel];
  }
  aiService.saveConfig(aiConfig);
};

// 可用模型列表
const availableModels = ref<string[]>(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']);
const isFetchingModels = ref(false);

// 道号修改相关
const newPlayerName = ref('');
const currentPlayerName = computed(() => {
  return gameStateStore.character?.名字 || '';
});

// 更新玩家道号
const updatePlayerName = async () => {
  if (!newPlayerName.value || newPlayerName.value === currentPlayerName.value) {
    return;
  }

  try {
    // 更新 gameStateStore 中的角色基础信息
    if (gameStateStore.character) {
      (gameStateStore.character as any).名字 = newPlayerName.value;
    }

    // 同步到 characterStore 并保存到当前存档槽位
    const currentSlotName = characterStore.rootState.当前激活存档?.存档槽位;
    if (currentSlotName) {
      await characterStore.saveToSlot(currentSlotName);
    }

    toast.success(`道号已修改为「${newPlayerName.value}」`);
    newPlayerName.value = ''; // 清空输入框
  } catch (error) {
    console.error('修改道号失败:', error);
    toast.error('修改道号失败，请重试');
  }
};

// 获取模型列表
const fetchModels = async () => {
  if (isFetchingModels.value) return;

  isFetchingModels.value = true;
  try {
    aiService.saveConfig(aiConfig);
    const models = await aiService.fetchModels();
    if (models.length > 0) {
      availableModels.value = models;
      // 保存模型列表到 localStorage
      localStorage.setItem('ai_available_models', JSON.stringify(models));
      toast.success(`成功获取 ${models.length} 个模型`);
    } else {
      toast.warning('未获取到模型列表');
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '获取模型失败');
  } finally {
    isFetchingModels.value = false;
  }
};

const AI_API_TEST_TOKEN = '仙途本-连通测试-OK';
const aiApiTestState = ref<'idle' | 'testing' | 'success' | 'fail'>('idle');
const aiApiTestResponse = ref('');
const aiApiTestError = ref('');

const normalizeAIApiTestText = (text: string): string => {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(
      /[\s"'`“”‘’《》<>()[\]{}，。！？、；：…·—\-_=+~!@#$%^&*|\\/.,?;:]/g,
      ''
    );
};

const openAIApiTestDetails = () => {
  uiStore.showDetailModal({
    title: t('AI API测试详情'),
    content: [
      `Token: ${AI_API_TEST_TOKEN}`,
      `Provider: ${aiConfig.customAPI.provider}`,
      `Model: ${aiConfig.customAPI.model}`,
      `URL: ${aiConfig.customAPI.url || '(empty)'}`,
      aiApiTestError.value ? `Error: ${aiApiTestError.value}` : '',
      '',
      'Response:',
      aiApiTestResponse.value || '(empty)',
    ]
      .filter(Boolean)
      .join('\n'),
  });
};

const testAIApi = async () => {
  if (aiApiTestState.value === 'testing') return;

  aiApiTestState.value = 'testing';
  aiApiTestResponse.value = '';
  aiApiTestError.value = '';

  try {
    const availability = aiService.checkAvailability();
    if (!availability.available) {
      throw new Error(availability.message);
    }

    const prompt = [
      '你正在进行AI API连通性测试。',
      `请仅输出以下字符串（必须包含且尽量一致）：${AI_API_TEST_TOKEN}`,
      '不要输出解释、标点或多余文字。',
    ].join('\n');

    const response = await aiService.generate({
      user_input: prompt,
      should_stream: false,
      generation_id: `ai_api_test_${Date.now()}`,
    });

    const text = String(response ?? '').trim();
    aiApiTestResponse.value = text;

    const ok = normalizeAIApiTestText(text).includes(normalizeAIApiTestText(AI_API_TEST_TOKEN));
    if (!ok) {
      throw new Error(`未检测到特征串「${AI_API_TEST_TOKEN}」`);
    }

    aiApiTestState.value = 'success';
    toast.success(`AI API测试成功：检测到「${AI_API_TEST_TOKEN}」`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    aiApiTestError.value = message;
    aiApiTestState.value = 'fail';
    toast.error(`AI API测试失败：${message}`);
  }
};

// 监听AI配置变化
watch(aiConfig, () => {
  hasUnsavedChanges.value = true;
  aiService.saveConfig(aiConfig);
}, { deep: true });

// 设置数据结构
const settings = reactive({
  // 显示设置
  theme: 'auto',
  uiScale: 100,
  fontSize: 16,

  // 游戏设置
  fastAnimations: false,
  showHints: false,
  splitResponseGeneration: false,

  // 🔞 成人内容（仅酒馆环境可用；非酒馆环境将被忽略/隐藏）
  enableNsfwMode: true,
  nsfwGenderFilter: 'female' as 'all' | 'male' | 'female',


  // 高级设置
  debugMode: false,
  consoleDebug: false,
  performanceMonitor: false,
  customStripRegex: '',
  customStripTags: '',
  customStripText: '',
  replaceRules: [] as TextReplaceRule[],

  // 任务系统相关设置
  questSystemType: '修仙辅助系统', // 系统任务类型
  questSystemPrompt: '', // 自定义任务提示词

  // 游戏体验
  enableSoundEffects: true,
  backgroundMusic: true,
  notificationSounds: true,

  // 数据同步
  validateData: true,
  backupBeforeSave: true,
});

const loading = ref(false);
const hasUnsavedChanges = ref(false);
const showReplaceRulesModal = ref(false);

const enabledReplaceRulesCount = computed(() => {
  const rules = (settings as any).replaceRules as TextReplaceRule[] | undefined;
  if (!Array.isArray(rules)) return 0;
  return rules.filter(r => r && r.enabled).length;
});

const handleSaveReplaceRules = (rules: TextReplaceRule[]) => {
  (settings as any).replaceRules = rules;
  onSettingChange();
};

// 监听所有设置变化
watch(settings, () => {
  hasUnsavedChanges.value = true;
}, { deep: true });

// 监听调试模式变化
watch(() => settings.debugMode, (newValue) => {
  debug.setMode(newValue);
  debug.log('设置面板', `调试模式${newValue ? '已启用' : '已禁用'}`);
});

// 设置变更处理
const onSettingChange = () => {
  hasUnsavedChanges.value = true;
};

// 加载设置
const loadSettings = async () => {
  debug.timeStart('加载设置');
  try {
    // 先从localStorage加载设置
    const savedSettings = localStorage.getItem('dad_game_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      Object.assign(settings, parsed);
      debug.log('设置面板', '设置加载成功', parsed);
    } else {
      debug.log('设置面板', '使用默认设置');
    }

    // 🔥 加载AI服务配置
    const savedAIConfig = aiService.getConfig();
    Object.assign(aiConfig, savedAIConfig);
    // 同步“流式传输”开关到游戏内实际使用的全局开关
    uiStore.useStreaming = aiConfig.streaming !== false;
    aiConfig.streaming = uiStore.useStreaming;
    if (isTavernEnvFlag) {
      aiConfig.mode = 'tavern';
    }
    debug.log('设置面板', 'AI配置加载成功', savedAIConfig);

    // 加载保存的模型列表
    const savedModels = localStorage.getItem('ai_available_models');
    if (savedModels) {
      try {
        const models = JSON.parse(savedModels);
        if (Array.isArray(models) && models.length > 0) {
          availableModels.value = models;
          debug.log('设置面板', `已加载保存的模型列表: ${models.length} 个`);
        }
      } catch (e) {
        debug.warn('设置面板', '解析保存的模型列表失败');
      }
    }

    // 确保已保存的模型名称在可选列表中
    if (savedAIConfig.customAPI?.model && !availableModels.value.includes(savedAIConfig.customAPI.model)) {
      availableModels.value = [savedAIConfig.customAPI.model, ...availableModels.value];
      debug.log('设置面板', `已将保存的模型 ${savedAIConfig.customAPI.model} 添加到可选列表`);
    }

    // 🔥 从gameStateStore加载存档配置
    try {
      const hasActiveSave = !!characterStore.rootState.当前激活存档 && !!characterStore.activeSaveSlot;
      if (gameStateStore.isGameLoaded && hasActiveSave) {
        // 加载任务系统配置
        if (gameStateStore.questSystem?.配置) {
          const questConfig = gameStateStore.questSystem.配置;
          settings.questSystemType = questConfig.系统任务类型;
          settings.questSystemPrompt = questConfig.系统任务提示词 || '';
          debug.log('设置面板', '已从存档读取任务系统配置', questConfig);
        }
      }
    } catch {
      // 如果还没有激活存档，这里会失败，不是问题
      debug.log('设置面板', '当前没有激活的存档，使用localStorage中的设置');
    }

  } catch (error) {
    debug.error('设置面板', '加载设置失败', error);
    toast.error('加载设置失败，将使用默认设置');
  } finally {
    debug.timeEnd('加载设置');
  }
};

// 保存设置
const saveSettings = async () => {
  if (loading.value) return;

  loading.value = true;
  debug.timeStart('保存设置');

  try {
    // 验证设置
    validateSettings();

    // 保存到localStorage
    localStorage.setItem('dad_game_settings', JSON.stringify(settings));
    debug.log('设置面板', '设置已保存到localStorage', settings);

    // 🔥 保存AI服务配置
    aiService.saveConfig(aiConfig);
    debug.log('设置面板', 'AI配置已保存', aiConfig);

    // 🔥 同步设置到存档
    try {
      const { useCharacterStore } = await import('@/stores/characterStore');
      const characterStore = useCharacterStore();
      const { useGameStateStore } = await import('@/stores/gameStateStore');
      const gameStateStore = useGameStateStore();

      // 更新存档中的系统设置
      const hasActiveSave = !!characterStore.rootState.当前激活存档 && !!characterStore.activeSaveSlot;
      if (gameStateStore.isGameLoaded && hasActiveSave) {
        // 同步任务系统配置
        if (gameStateStore.questSystem?.配置) {
          gameStateStore.questSystem.配置.系统任务类型 = settings.questSystemType;
          gameStateStore.questSystem.配置.系统任务提示词 = settings.questSystemPrompt || '';
        }

        // 保存到数据库
        await characterStore.saveCurrentGame();

        debug.log('设置面板', '设置已同步到存档');
      } else {
        debug.warn('设置面板', '当前没有激活的存档，设置仅保存到localStorage');
      }
    } catch (error) {
      debug.error('设置面板', '同步设置到存档失败（非致命）', error);
      // 不抛出错误，允许保存继续
    }

    // 应用设置
    await applySettings();

    hasUnsavedChanges.value = false;
    toast.success('设置已保存并应用');

  } catch (error) {
    debug.error('设置面板', '保存设置失败', error);
    toast.error(`保存设置失败: ${error instanceof Error ? error.message : '未知错误'}`);
  } finally {
    loading.value = false;
    debug.timeEnd('保存设置');
  }
};

// 验证设置
const validateSettings = () => {
  debug.group('设置验证');

  try {
    // 验证UI缩放
    if (settings.uiScale < 50 || settings.uiScale > 200) {
      settings.uiScale = Math.max(50, Math.min(200, settings.uiScale));
      debug.warn('设置面板', `UI缩放值已修正为: ${settings.uiScale}%`);
    }

    if (typeof (settings as any).splitResponseGeneration !== 'boolean') {
      (settings as any).splitResponseGeneration = false;
    }

    // 自定义正则删标签：确保是字符串且限制长度，避免卡顿/存储膨胀
    if (typeof (settings as any).customStripRegex !== 'string') {
      (settings as any).customStripRegex = '';
    } else if ((settings as any).customStripRegex.length > 4000) {
      (settings as any).customStripRegex = (settings as any).customStripRegex.slice(0, 4000);
    }
    if (typeof (settings as any).customStripTags !== 'string') {
      (settings as any).customStripTags = '';
    } else if ((settings as any).customStripTags.length > 2000) {
      (settings as any).customStripTags = (settings as any).customStripTags.slice(0, 2000);
    }
    if (typeof (settings as any).customStripText !== 'string') {
      (settings as any).customStripText = '';
    } else if ((settings as any).customStripText.length > 2000) {
      (settings as any).customStripText = (settings as any).customStripText.slice(0, 2000);
    }

    // 正则替换规则：确保结构正确并限制大小，避免卡顿/存储膨胀
    const rawReplaceRules = (settings as any).replaceRules;
    if (!Array.isArray(rawReplaceRules)) {
      (settings as any).replaceRules = [];
    } else {
      (settings as any).replaceRules = rawReplaceRules.slice(0, 50).map((r: any, idx: number) => ({
        id: typeof r?.id === 'string' ? r.id.slice(0, 80) : `rule_${idx}`,
        enabled: r?.enabled !== false,
        mode: r?.mode === 'text' ? 'text' : 'regex',
        pattern: typeof r?.pattern === 'string' ? r.pattern.slice(0, 500) : '',
        replacement: typeof r?.replacement === 'string' ? r.replacement.slice(0, 1500) : '',
        ignoreCase: !!r?.ignoreCase,
        global: r?.global !== false,
        multiline: !!r?.multiline,
        dotAll: !!r?.dotAll,
      }));
    }


    debug.log('设置面板', '设置验证完成');
  } catch (error) {
    debug.error('设置面板', '设置验证失败', error);
    throw new Error('设置验证失败');
  } finally {
    debug.groupEnd();
  }
};

// 应用设置
const applySettings = async () => {
  debug.group('应用设置');

  try {
    // 应用主题
    applyTheme();

    // 应用UI缩放
    applyUIScale();

    // 应用字体大小
    applyFontSize();

    // 应用动画设置
    applyAnimationSettings();

    // 应用调试模式
    debug.setMode(settings.debugMode);

    debug.log('设置面板', '所有设置已应用');
  } catch (error) {
    debug.error('设置面板', '应用设置时出错', error);
    throw error;
  } finally {
    debug.groupEnd();
  }
};

// 应用主题
const applyTheme = () => {
  let targetTheme = settings.theme;

  if (settings.theme === 'auto') {
    targetTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  document.documentElement.setAttribute('data-theme', targetTheme);
  debug.log('设置面板', `主题已应用: ${targetTheme}`);
};

// 应用UI缩放
const applyUIScale = () => {
  const scaleValue = settings.uiScale / 100;
  document.documentElement.style.setProperty('--ui-scale', scaleValue.toString());
  debug.log('设置面板', `UI缩放已应用: ${settings.uiScale}%`);
};

// 应用字体大小
const applyFontSize = () => {
  const fontSize = `${settings.fontSize}px`;
  document.documentElement.style.setProperty('--base-font-size', fontSize);
  debug.log('设置面板', `字体大小已应用: ${fontSize}`);
};

// 应用动画设置
const applyAnimationSettings = () => {
  const transitionSeconds = settings.fastAnimations ? 0.12 : 0.2;
  document.documentElement.style.setProperty('--transition-fast', `all ${transitionSeconds}s ease-in-out`);
  debug.log('设置面板', `动画速度已应用: ${transitionSeconds}s`);
};

// uiStore 已在脚本顶部初始化
// 重置设置
const resetSettings = () => {
  uiStore.showRetryDialog({
    title: '重置设置',
    message: '确定要重置所有设置为默认值吗？这将清除所有自定义配置。',
    confirmText: '确认重置',
    cancelText: '取消',
    onConfirm: () => {
      debug.log('设置面板', '开始重置设置');
      Object.assign(settings, {
        theme: 'auto',
        uiScale: 100,
        fontSize: 16,
        fastAnimations: false,
        showHints: false,
        splitResponseGeneration: false,
        debugMode: false,
        consoleDebug: false,
        performanceMonitor: false,
        customStripRegex: '',
        customStripTags: '',
        customStripText: '',
        questSystemType: '修仙辅助系统',
        questSystemPrompt: '',
        enableSoundEffects: true,
        backgroundMusic: true,
        notificationSounds: true,
        validateData: true,
        backupBeforeSave: true
      });
      saveSettings();
      toast.info('设置已重置为默认值');
    },
    onCancel: () => {}
  });
};

// 清理缓存
const clearCache = async () => {
  uiStore.showRetryDialog({
    title: '清理缓存',
    message: '确定要清理缓存吗？这将删除临时数据但不会影响存档。',
    confirmText: '确认清理',
    cancelText: '取消',
    onConfirm: async () => {
      debug.log('设置面板', '开始清理缓存');
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('dad_cache_') || key.startsWith('temp_') || key.startsWith('debug_') || key.includes('_temp'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        sessionStorage.clear();
        debug.log('设置面板', `缓存清理完成，共清理 ${keysToRemove.length} 项数据`);
        toast.success(`已清理 ${keysToRemove.length} 项缓存数据`);
      } catch (error) {
        debug.error('设置面板', '清理缓存失败', error);
        toast.error('清理缓存失败');
      }
    },
    onCancel: () => {}
  });
};

// 导出设置
const exportSettings = () => {
  debug.log('设置面板', '开始导出设置');

  try {
    const exportData = {
      settings: settings,
      exportInfo: {
        timestamp: new Date().toISOString(),
        version: '3.7.4',
        userAgent: navigator.userAgent,
        gameVersion: '仙途 v3.7.4'
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `仙途-设置备份-${dateStr}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(link.href);

    debug.log('设置面板', '设置导出成功');
    toast.success('设置已导出');

  } catch (error) {
    debug.error('设置面板', '导出设置失败', error);
    toast.error('导出设置失败');
  }
};

// 导入设置
const importSettings = () => {
  debug.log('设置面板', '开始导入设置');

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (importData.settings) {
        // 验证导入的设置
        const validatedSettings = { ...settings, ...importData.settings };
        Object.assign(settings, validatedSettings);

        await saveSettings();

        debug.log('设置面板', '设置导入成功', importData);
        toast.success('设置导入成功并已应用');
      } else {
        throw new Error('无效的设置文件格式');
      }
    } catch (error) {
      debug.error('设置面板', '导入设置失败', error);
      toast.error('导入设置失败，请检查文件格式');
    }
  };

  input.click();
};

const openPromptManagement = () => {
  // 检查当前是否在游戏中（/game路由下）
  const currentPath = router.currentRoute.value.path;
  if (currentPath.startsWith('/game')) {
    // 在游戏中，跳转到游戏内的提示词管理
    router.push('/game/prompts');
  } else {
    // 不在游戏中（如首页），跳转到独立的提示词管理页面
    router.push('/prompts');
  }
};

import { useRouter } from 'vue-router';
const router = useRouter();

// 组件挂载时加载设置
onMounted(() => {
  debug.log('设置面板', '组件已加载');
  loadSettings();

  // 初始加载时不再强制应用设置，以避免覆盖全局主题
  // applySettings(); // 移除此调用

  // 🔧 开发者控制：如果启用授权验证且未验证，自动弹出验证窗口
});
</script>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  overflow: hidden;
  padding: 1rem;
  gap: 1rem;
  position: relative;
}

/* 头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--color-surface);
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
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
  color: #1e293b;
}

.settings-subtitle {
  font-size: 0.875rem;
  color: #64748b;
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
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.action-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.action-btn.primary {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.action-btn.primary:hover {
  background: #2563eb;
  border-color: #2563eb;
}

/* 设置容器 */
.settings-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 0 0.5rem 3rem 0.5rem;

  /* 滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 116, 139, 0.3) rgba(243, 244, 246, 0.5);
}

.settings-container::-webkit-scrollbar {
  width: 8px;
}

.settings-container::-webkit-scrollbar-track {
  background: rgba(243, 244, 246, 0.5);
  border-radius: 4px;
}

.settings-container::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.3);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.settings-container::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.5);
}

/* 设置区块 */
.settings-section {
  margin-bottom: 1.5rem;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.section-header {
  padding: 1rem 1.25rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.settings-list {
  padding: 0.5rem;
}

/* 设置项 */
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
  cursor: pointer;
}

.setting-desc {
  font-size: 0.875rem;
  color: #64748b;
}

.setting-control {
  display: flex;
  align-items: center;
}

/* 控件样式 */
.setting-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  min-width: 80px;
}

.setting-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.range-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.setting-range {
  width: 100px;
}

.range-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  min-width: 40px;
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

[data-theme='dark'] .setting-select {
  background-color: #374151;
  border-color: #4b5563;
  color: #e5e7eb;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23e5e7eb' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
}

[data-theme='dark'] .setting-select:hover {
  border-color: #6b7280;
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

/* 全宽设置项 */
.setting-item-full {
  flex-direction: column;
  align-items: flex-start;
}

.setting-control-full {
  width: 100%;
  margin-top: 0.5rem;
}

.setting-textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  min-height: 60px;
}

.setting-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.setting-textarea::placeholder {
  color: #9ca3af;
}

[data-theme='dark'] .setting-textarea {
  background: #374151;
  border-color: #4b5563;
  color: #e5e7eb;
}

[data-theme='dark'] .setting-textarea::placeholder {
  color: #6b7280;
}

/* 工具按钮 */
.utility-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.utility-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .setting-control {
    width: 100%;
    justify-content: flex-end;
  }

  .range-container {
    width: 100%;
    justify-content: space-between;
  }

  .header-actions .btn-text {
    display: none;
  }
}

/* 深色主题 */
[data-theme='dark'] .settings-panel {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
}

[data-theme='dark'] .panel-header,
[data-theme='dark'] .settings-section {
  background: #1e293b;
  border-color: #475569;
}

[data-theme='dark'] .section-header {
  background: #334155;
  border-bottom-color: #475569;
}

[data-theme='dark'] .panel-title,
[data-theme='dark'] .section-title,
[data-theme='dark'] .setting-name {
  color: #f1f5f9;
}

[data-theme='dark'] .settings-subtitle,
[data-theme='dark'] .setting-desc {
  color: #94a3b8;
}

[data-theme='dark'] .setting-item:hover {
  background: #334155;
}

[data-theme='dark'] .action-btn,
[data-theme='dark'] .setting-select,
[data-theme='dark'] .utility-btn {
  background: #374151;
  border-color: #4b5563;
  color: #e5e7eb;
}

[data-theme='dark'] .action-btn:hover,
[data-theme='dark'] .utility-btn:hover {
  background: #4b5563;
  border-color: #6b7280;
}

[data-theme='dark'] .switch-slider {
  background-color: #4b5563;
}

/* 授权验证相关样式 */
.form-input-inline {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  min-width: 200px;
  transition: all 0.2s ease;
}

.form-input-inline:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.auth-status {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.auth-status.verified {
  background: #d1fae5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.auth-status.unverified {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.utility-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.utility-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

[data-theme='dark'] .form-input-inline {
  background: #334155;
  border-color: #475569;
  color: #e5e7eb;
}

[data-theme='dark'] .auth-status.verified {
  background: rgba(5, 150, 105, 0.2);
  color: #6ee7b7;
  border-color: rgba(5, 150, 105, 0.3);
}

[data-theme='dark'] .auth-status.unverified {
  background: rgba(220, 38, 38, 0.2);
  color: #fca5a5;
  border-color: rgba(220, 38, 38, 0.3);
}

/* 加载脉冲动画 */
.loading-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
</style>
