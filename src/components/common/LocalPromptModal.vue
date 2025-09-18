<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 class="modal-title">自定义AI推演</h3>
        <button class="close-button" @click="handleClose">×</button>
      </div>
      
      <div class="modal-body">
        <p class="modal-subtitle">{{ getPromptHint() }}</p>
        
        <div class="prompt-section">
          <label class="prompt-label">提示词 (可选)</label>
          <textarea 
            v-model="userPrompt"
            class="prompt-input"
            :placeholder="getPlaceholderText()"
            rows="4"
            maxlength="500"
            @keyup.ctrl.enter="confirm"
          />
          <div class="char-count">{{ userPrompt.length }}/500</div>
        </div>

        <div class="suggested-prompts" v-if="getSuggestedPrompts().length > 0">
          <h4 class="suggestions-title">建议提示词</h4>
          <div class="suggestions-grid">
            <button 
              v-for="suggestion in getSuggestedPrompts()"
              :key="suggestion"
              class="suggestion-button"
              @click="userPrompt = suggestion"
            >
              {{ suggestion }}
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="cancel-button" @click="handleClose">取消</button>
        <button 
          class="confirm-button" 
          @click="confirm"
        >
          开始推演
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  visible: boolean;
  type: 'world' | 'talent_tier' | 'origin' | 'spirit_root' | 'talent';
}>();

const emit = defineEmits<{
  close: [];
  confirm: [prompt?: string];
}>();

const userPrompt = ref('');

// 根据类型提供不同的提示和建议
const getPromptHint = () => {
  const hints = {
    world: '描述你希望的世界风格、时代背景或特色设定（可含对话，使用中文引号“”，每句仅一对）',
    talent_tier: '描述你希望的天资类型、特点或能力倾向（可含对话，使用中文引号“”，每句仅一对）',  
    origin: '描述你希望的出身背景、家族或成长环境（可含对话，使用中文引号“”，每句仅一对）',
    spirit_root: '描述你希望的灵根属性、特色或修炼倾向（可含对话，使用中文引号“”，每句仅一对）',
    talent: '描述你希望的天赋能力、特殊技能或神通（可含对话，使用中文引号“”，每句仅一对）'
  };
  return hints[props.type] || '请输入自定义提示词';
};

const getPlaceholderText = () => {
  const placeholders = {
    world: '例如：现代都市修仙世界，灵气复苏，科技与修真并存...',
    talent_tier: '例如：擅长炼丹制器的天才，拥有超强的感知能力...',
    origin: '例如：修仙世家的没落子弟，身负血海深仇...',
    spirit_root: '例如：罕见的雷属性变异灵根，天生引雷...',
    talent: '例如：能够看透事物本质的天眼神通...'
  };
  return placeholders[props.type] || '请输入提示词...';
};

const getSuggestedPrompts = () => {
  const suggestions = {
    world: [
      '现代都市修仙，灵气复苏',
      '古代仙侠世界，门派林立', 
      '末法时代，修真没落',
      '星际修仙，宇宙征途'
    ],
    talent_tier: [
      '天生剑心，剑道天才',
      '丹道奇才，炼丹天赋',
      '阵法大师，天机推算',
      '体修霸体，肉身无双'
    ],
    origin: [
      '修仙世家的没落子弟',
      '凡人出身的天选之子',
      '魔门弟子改邪归正',
      '上古传承的最后血脉'
    ],
    spirit_root: [
      '雷属性变异灵根',
      '罕见的时间属性',
      '混沌属性至尊灵根',
      '五行俱全的废柴灵根'
    ],
    talent: [
      '透视本质的天眼神通',
      '预知未来的天机术',
      '不死不灭的重生能力',
      '操控时空的神级天赋'
    ]
  };
  return suggestions[props.type] || [];
};

const handleClose = () => {
  userPrompt.value = '';
  emit('close');
};

const confirm = () => {
  emit('confirm', userPrompt.value.trim() || undefined);
  userPrompt.value = '';
};

// 监听visible变化，重置输入
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    userPrompt.value = '';
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

.modal-dialog {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  animation: slideIn 0.3s ease-out;
  box-shadow: 0 20px 60px rgba(139, 92, 246, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(139, 92, 246, 0.2);
}

.modal-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #e2e8f0;
  background: linear-gradient(135deg, #a855f7, #8b5cf6);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-button:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.1);
}

.modal-body {
  padding: 24px;
}

.modal-subtitle {
  color: #94a3b8;
  margin-bottom: 20px;
  font-size: 0.9rem;
  line-height: 1.4;
}

.prompt-section {
  margin-bottom: 24px;
}

.prompt-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 8px;
}

.prompt-input {
  width: 100%;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(139, 92, 246, 0.2);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.9rem;
  line-height: 1.4;
  resize: vertical;
  min-height: 100px;
  transition: border-color 0.2s ease;
  font-family: inherit;
  box-sizing: border-box;
}

.prompt-input:focus {
  outline: none;
  border-color: rgba(139, 92, 246, 0.5);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.prompt-input::placeholder {
  color: #64748b;
}

.char-count {
  text-align: right;
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 4px;
}

.suggested-prompts {
  margin-bottom: 24px;
}

.suggestions-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #cbd5e1;
  margin-bottom: 12px;
}

.suggestions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.suggestion-button {
  padding: 8px 12px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 6px;
  color: #cbd5e1;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  line-height: 1.3;
}

.suggestion-button:hover {
  background: rgba(139, 92, 246, 0.2);
  border-color: rgba(139, 92, 246, 0.5);
  color: #e2e8f0;
  transform: translateY(-1px);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid rgba(139, 92, 246, 0.2);
}

.cancel-button, .confirm-button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-button {
  background: rgba(100, 116, 139, 0.2);
  color: #cbd5e1;
}

.cancel-button:hover {
  background: rgba(100, 116, 139, 0.3);
  color: #e2e8f0;
}

.confirm-button {
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  color: white;
}

.confirm-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.confirm-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { 
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 深色主题适配 */
[data-theme="dark"] .modal-dialog {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border-color: rgba(139, 92, 246, 0.4);
}

[data-theme="dark"] .prompt-input {
  background: rgba(0, 0, 0, 0.5);
  border-color: rgba(139, 92, 246, 0.3);
}

[data-theme="dark"] .suggestion-button {
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.4);
}
</style>
