<template>
  <div class="world-generation-panel">
    <div class="panel-header">
      <h3 class="panel-title">🌍 世界生成设置</h3>
      <p class="panel-subtitle">配置你的专属修仙世界</p>
    </div>

    <div class="config-sections">
      <!-- 预设选择 -->
      <div class="config-section">
        <h4 class="section-title">世界模板</h4>
        <div class="preset-grid">
          <div 
            v-for="(preset, key) in presets" 
            :key="key"
            class="preset-card"
            :class="{ active: selectedPreset === key }"
            @click="selectPreset(key)"
          >
            <div class="preset-icon">{{ preset.icon }}</div>
            <div class="preset-name">{{ preset.name }}</div>
            <div class="preset-description">{{ preset.description }}</div>
          </div>
        </div>
      </div>

      <!-- 自定义设置 -->
      <div v-if="selectedPreset === 'custom'" class="config-section">
        <h4 class="section-title">自定义设置</h4>
        
        <!-- 世界规模 -->
        <div class="setting-group">
          <label class="setting-label">世界规模</label>
          <select v-model="worldConfig.worldScale" class="setting-select">
            <option value="small">小世界 (3-5个大势力)</option>
            <option value="medium">中世界 (6-9个大势力)</option>
            <option value="large">大世界 (10-15个大势力)</option>
            <option value="epic">史诗世界 (16-20个大势力)</option>
          </select>
        </div>

        <!-- 势力分布 -->
        <div class="setting-group">
          <label class="setting-label">势力分布</label>
          <select v-model="worldConfig.powerStructure" class="setting-select">
            <option value="balanced">势力均衡 - 各派实力相近</option>
            <option value="hierarchical">等级分明 - 强弱层次清楚</option>
            <option value="chaotic">群雄割据 - 实力分布混乱</option>
            <option value="hegemony">一家独大 - 存在绝对强者</option>
          </select>
        </div>

        <!-- 世界年代 -->
        <div class="setting-group">
          <label class="setting-label">世界年代</label>
          <select v-model="worldConfig.worldAge" class="setting-select">
            <option value="ancient">上古时期 - 古老传承，神秘莫测</option>
            <option value="classical">古典时期 - 成熟稳定，传统秩序</option>
            <option value="golden">黄金时期 - 繁荣昌盛，英雄辈出</option>
            <option value="turbulent">乱世时期 - 群雄并起，变化剧烈</option>
            <option value="decline">末法时期 - 天地衰落，修行困难</option>
          </select>
        </div>

        <!-- 冲突强度 -->
        <div class="setting-group">
          <label class="setting-label">冲突强度</label>
          <select v-model="worldConfig.conflictLevel" class="setting-select">
            <option value="peaceful">相对和平 - 各派相安无事</option>
            <option value="tense">暗流涌动 - 小冲突不断</option>
            <option value="active">争斗不断 - 公开冲突频繁</option>
            <option value="chaotic">天下大乱 - 全面战争状态</option>
          </select>
        </div>

        <!-- 特殊势力选项 -->
        <div class="setting-group">
          <label class="setting-label">特殊势力</label>
          <div class="checkbox-grid">
            <label class="checkbox-item">
              <input v-model="worldConfig.hasAncientSects" type="checkbox">
              <span>上古宗门</span>
            </label>
            <label class="checkbox-item">
              <input v-model="worldConfig.hasDemonicFactions" type="checkbox">
              <span>魔道势力</span>
            </label>
            <label class="checkbox-item">
              <input v-model="worldConfig.hasImmortalEmpires" type="checkbox">
              <span>仙朝帝国</span>
            </label>
            <label class="checkbox-item">
              <input v-model="worldConfig.hasNeutralAcademies" type="checkbox">
              <span>中立学院</span>
            </label>
          </div>
        </div>
      </div>

      <!-- 出身影响说明 -->
      <div v-if="characterBackground" class="config-section">
        <h4 class="section-title">出身影响</h4>
        <div class="background-influence">
          <div class="influence-item">
            <span class="influence-label">角色出身：</span>
            <span class="influence-value">{{ characterBackground }}</span>
          </div>
          <div class="influence-item">
            <span class="influence-label">推荐出生地：</span>
            <span class="influence-value">{{ backgroundInfluence.birthplaceType }}</span>
          </div>
          <div class="influence-item">
            <span class="influence-label">势力要求：</span>
            <span class="influence-value">{{ backgroundInfluence.requiredFactionTypes.join('、') }}</span>
          </div>
          <div class="influence-item">
            <span class="influence-label">初始关系：</span>
            <span class="influence-value">{{ backgroundInfluence.initialConnections.join('、') }}</span>
          </div>
        </div>
      </div>

      <!-- 世界预览 -->
      <div class="config-section">
        <h4 class="section-title">世界预览</h4>
        <div class="world-preview">
          <div class="preview-card">
            <div class="preview-title">{{ worldDescription }}</div>
            <div class="preview-stats">
              <div class="stat-item">
                <span class="stat-label">主要势力：</span>
                <span class="stat-value">{{ worldConfig.majorFactionsCount }}个</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">次要势力：</span>
                <span class="stat-value">{{ worldConfig.minorFactionsCount }}个</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">秘境数量：</span>
                <span class="stat-value">{{ worldConfig.secretRealmsCount }}个</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">主要城市：</span>
                <span class="stat-value">{{ worldConfig.majorCitiesCount }}个</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="panel-actions">
      <button class="action-btn secondary" @click="randomizeSettings">
        🎲 随机生成
      </button>
      <button class="action-btn primary" @click="confirmSettings">
        ✨ 创建世界
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { 
  WorldGenerationConfig, 
  WORLD_GENERATION_PRESETS,
  BACKGROUND_WORLD_MAPPING,
  WorldScale,
  PowerStructure,
  WorldAge,
  ConflictLevel
} from '@/utils/worldGeneration/gameWorldConfig';

// Props
interface Props {
  characterBackground?: string;
  onWorldConfigChange?: (config: any) => void;
}

const props = withDefaults(defineProps<Props>(), {
  characterBackground: '',
});

// Emits
const emit = defineEmits<{
  worldConfigured: [config: any];
}>();

// 响应式状态
const selectedPreset = ref<string>('classic_cultivation');
const worldConfigGenerator = ref(new WorldGenerationConfig(selectedPreset.value));
const worldConfig = ref(worldConfigGenerator.value.getSettings());

// 预设配置
const presets = ref({
  'beginner_friendly': {
    name: '新手友好',
    icon: '🌱',
    description: '小世界，势力平衡，适合新手体验'
  },
  'classic_cultivation': {
    name: '经典修仙',
    icon: '⚔️',
    description: '传统修仙世界，正邪对立，层次分明'
  },
  'warring_states': {
    name: '群雄争霸',
    icon: '🏺',
    description: '大世界，群雄并起，战乱不断'
  },
  'dharma_ending': {
    name: '末法时代',
    icon: '🌙',
    description: '灵气衰竭，古势力衰落，危机四伏'
  },
  'custom': {
    name: '自定义',
    icon: '🎨',
    description: '完全自定义世界参数'
  }
});

// 计算属性
const worldDescription = computed(() => {
  return worldConfigGenerator.value.getDescription();
});

const backgroundInfluence = computed(() => {
  if (!props.characterBackground) {
    return {
      birthplaceType: '未选择出身',
      requiredFactionTypes: [],
      initialConnections: []
    };
  }
  
  return BACKGROUND_WORLD_MAPPING[props.characterBackground] || {
    birthplaceType: '普通出身',
    requiredFactionTypes: ['无特殊要求'],
    initialConnections: ['普通关系']
  };
});

// 方法
const selectPreset = (presetKey: string) => {
  selectedPreset.value = presetKey;
  
  // 重新生成世界配置
  worldConfigGenerator.value = new WorldGenerationConfig(presetKey);
  
  // 根据角色出身调整配置
  if (props.characterBackground) {
    worldConfigGenerator.value.adjustForCharacterBackground(props.characterBackground);
  }
  
  worldConfig.value = worldConfigGenerator.value.getSettings();
  
  // 通知父组件配置变化
  if (props.onWorldConfigChange) {
    props.onWorldConfigChange(worldConfig.value);
  }
};

const randomizeSettings = () => {
  // 随机选择各项配置
  const scales = Object.values(WorldScale);
  const structures = Object.values(PowerStructure);
  const ages = Object.values(WorldAge);
  const conflicts = Object.values(ConflictLevel);
  
  worldConfig.value.worldScale = scales[Math.floor(Math.random() * scales.length)];
  worldConfig.value.powerStructure = structures[Math.floor(Math.random() * structures.length)];
  worldConfig.value.worldAge = ages[Math.floor(Math.random() * ages.length)];
  worldConfig.value.conflictLevel = conflicts[Math.floor(Math.random() * conflicts.length)];
  
  // 随机特殊势力
  worldConfig.value.hasAncientSects = Math.random() > 0.5;
  worldConfig.value.hasDemonicFactions = Math.random() > 0.5;
  worldConfig.value.hasImmortalEmpires = Math.random() > 0.7;
  worldConfig.value.hasNeutralAcademies = Math.random() > 0.6;
  
  // 重新生成配置
  worldConfigGenerator.value = new WorldGenerationConfig('custom', worldConfig.value);
  worldConfig.value = worldConfigGenerator.value.getSettings();
  
  selectedPreset.value = 'custom';
};

const confirmSettings = () => {
  // 发出世界配置完成事件
  emit('worldConfigured', {
    settings: worldConfig.value,
    generator: worldConfigGenerator.value,
    backgroundInfluence: backgroundInfluence.value
  });
};

// 监听角色出身变化
watch(() => props.characterBackground, (newBackground) => {
  if (newBackground && worldConfigGenerator.value) {
    worldConfigGenerator.value.adjustForCharacterBackground(newBackground);
    worldConfig.value = worldConfigGenerator.value.getSettings();
  }
});

// 监听自定义配置变化
watch(worldConfig, (newConfig) => {
  if (selectedPreset.value === 'custom') {
    worldConfigGenerator.value = new WorldGenerationConfig('custom', newConfig);
    worldConfig.value = worldConfigGenerator.value.getSettings();
  }
}, { deep: true });
</script>

<style scoped>
.world-generation-panel {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 1rem;
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.panel-header {
  text-align: center;
  margin-bottom: 2rem;
}

.panel-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e40af;
  margin: 0 0 0.5rem 0;
}

.panel-subtitle {
  color: #64748b;
  margin: 0;
  font-size: 0.875rem;
}

.config-sections {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.config-section {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.preset-card {
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 1rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.preset-card:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.preset-card.active {
  border-color: #1d4ed8;
  background: #dbeafe;
  box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.1);
}

.preset-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.preset-name {
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.25rem;
}

.preset-description {
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;
}

.setting-group {
  margin-bottom: 1.5rem;
}

.setting-label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.setting-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: white;
  color: #374151;
}

.setting-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.checkbox-item input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
}

.background-influence {
  background: #f3f4f6;
  border-radius: 0.5rem;
  padding: 1rem;
}

.influence-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.influence-item:last-child {
  margin-bottom: 0;
}

.influence-label {
  color: #6b7280;
  font-weight: 500;
}

.influence-value {
  color: #374151;
  font-weight: 600;
}

.world-preview {
  display: flex;
  justify-content: center;
}

.preview-card {
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  color: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  text-align: center;
  min-width: 300px;
}

.preview-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.preview-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  opacity: 0.9;
}

.stat-value {
  font-size: 0.875rem;
  font-weight: 600;
}

.panel-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}

.action-btn {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn.primary {
  background: #1d4ed8;
  color: white;
}

.action-btn.primary:hover {
  background: #1e40af;
  transform: translateY(-1px);
}

.action-btn.secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.action-btn.secondary:hover {
  background: #e5e7eb;
  transform: translateY(-1px);
}

@media (max-width: 640px) {
  .world-generation-panel {
    padding: 1rem;
  }
  
  .preset-grid {
    grid-template-columns: 1fr;
  }
  
  .checkbox-grid {
    grid-template-columns: 1fr;
  }
  
  .preview-stats {
    grid-template-columns: 1fr;
  }
  
  .panel-actions {
    flex-direction: column;
  }
}
</style>