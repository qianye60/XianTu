<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal-dialog">
      <!-- 第一步：输入兑换码 -->
      <div v-if="currentStep === 'code'" class="step-content">
        <h2 class="modal-title">{{ title }}</h2>
        <p class="modal-subtitle">请输入兑换码以接引天机进行AI推演。</p>
        <form @submit.prevent="submitCode">
          <div class="form-group">
            <input
              v-model="code"
              type="text"
              placeholder="请输入兑换码"
              class="code-input"
              ref="inputRef"
            />
          </div>
          <div v-if="error" class="error-message">{{ error }}</div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="handleClose">
              取消
            </button>
            <button type="submit" class="btn" :disabled="!code.trim() || isValidating">
              {{ isValidating ? '验证中...' : '下一步' }}
            </button>
          </div>
        </form>
      </div>

      <!-- 第二步：输入提示词 -->
      <div v-else-if="currentStep === 'prompt'" class="step-content">
        <h2 class="modal-title">自定义AI推演</h2>
        <p class="modal-subtitle">{{ getPromptHint() }}</p>
        
        <div class="prompt-section">
          <label class="prompt-label">提示词 (可选)</label>
          <textarea 
            v-model="userPrompt"
            class="prompt-input"
            :placeholder="getPlaceholderText()"
            rows="4"
            maxlength="500"
            @keyup.ctrl.enter="submitPrompt"
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

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="goBack">
            返回
          </button>
          <button type="button" class="btn" @click="submitPrompt">
            开始推演
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = defineProps<{
  visible: boolean;
  title: string;
  type?: 'world' | 'talent_tier' | 'origin' | 'spirit_root' | 'talent';
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', data: { code: string; prompt?: string }): void;
}>();

const code = ref('');
const userPrompt = ref('');
const error = ref('');
const inputRef = ref<HTMLInputElement | null>(null);
const currentStep = ref<'code' | 'prompt'>('code');
const isValidating = ref(false);

// 根据类型提供不同的提示和建议
const getPromptHint = () => {
  const hints = {
    world: '描述你希望的世界风格、时代背景或特色设定（可含对话，使用中文引号“”，每句仅一对）',
    talent_tier: '描述你希望的天资类型、特点或能力倾向（可含对话，使用中文引号“”，每句仅一对）',  
    origin: '描述你希望的出身背景、家族或成长环境（可含对话，使用中文引号“”，每句仅一对）',
    spirit_root: '描述你希望的灵根属性、特色或修炼倾向（可含对话，使用中文引号“”，每句仅一对）',
    talent: '描述你希望的天赋能力、特殊技能或神通（可含对话，使用中文引号“”，每句仅一对）'
  };
  return hints[props.type || 'world'] || '请输入自定义提示词';
};

const getPlaceholderText = () => {
  const placeholders = {
    world: '例如：现代都市修仙世界，灵气复苏，科技与修真并存...',
    talent_tier: '例如：擅长炼丹制器的天才，拥有超强的感知能力...',
    origin: '例如：修仙世家的没落子弟，身负血海深仇...',
    spirit_root: '例如：罕见的雷属性变异灵根，天生引雷...',
    talent: '例如：能够看透事物本质的天眼神通...'
  };
  return placeholders[props.type || 'world'] || '请输入提示词...';
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
  return suggestions[props.type || 'world'] || [];
};

watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    resetModal();
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
});

const resetModal = () => {
  error.value = '';
  code.value = '';
  userPrompt.value = '';
  currentStep.value = 'code';
  isValidating.value = false;
};

const handleClose = () => {
  resetModal();
  emit('close');
};

const goBack = () => {
  currentStep.value = 'code';
  error.value = '';
};

const submitCode = async () => {
  if (!code.value.trim()) {
    error.value = '兑换码不可为空。';
    return;
  }
  
  // 这里可以添加兑换码预验证逻辑
  isValidating.value = true;
  error.value = '';
  
  try {
    // 模拟验证过程
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 验证通过，进入提示词输入步骤
    currentStep.value = 'prompt';
  } catch (err) {
    error.value = '兑换码验证失败，请检查后重试。';
  } finally {
    isValidating.value = false;
  }
};

const submitPrompt = () => {
  // 提交兑换码和提示词
  emit('submit', { 
    code: code.value.trim(), 
    prompt: userPrompt.value.trim() || undefined 
  });
  resetModal();
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
  animation: fadeIn 0.2s ease-out;
}

.modal-dialog {
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(139, 92, 246, 0.2);
  animation: slideIn 0.3s ease-out;
}

.step-content {
  padding: 24px;
}

.modal-title {
  margin-top: 0;
  color: #e2e8f0;
  text-align: center;
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
  font-weight: 600;
  background: linear-gradient(135deg, #a855f7, #8b5cf6);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.modal-subtitle {
  text-align: center;
  color: #94a3b8;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  line-height: 1.4;
}

.form-group {
  margin-bottom: 1rem;
}

.code-input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(139, 92, 246, 0.2);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 1rem;
  box-sizing: border-box;
  text-align: center;
  transition: border-color 0.2s ease;
}

.code-input:focus {
  outline: none;
  border-color: rgba(139, 92, 246, 0.5);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.code-input::placeholder {
  color: #64748b;
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

.error-message {
  color: #ef4444;
  text-align: center;
  margin-bottom: 1rem;
  min-height: 1.2em;
  font-size: 0.85rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 1.5rem;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  color: white;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-secondary {
  background: rgba(100, 116, 139, 0.2);
  color: #cbd5e1;
}

.btn-secondary:hover {
  background: rgba(100, 116, 139, 0.3);
  color: #e2e8f0;
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

[data-theme="dark"] .code-input,
[data-theme="dark"] .prompt-input {
  background: rgba(0, 0, 0, 0.5);
  border-color: rgba(139, 92, 246, 0.3);
}

[data-theme="dark"] .suggestion-button {
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.4);
}

@media (max-width: 480px) {
  .modal-dialog {
    padding: 1.5rem 1rem;
    width: 95%;
    max-height: 90vh;
  }
  .modal-title {
    font-size: 1.1rem;
  }
  .form-actions {
    flex-direction: column-reverse;
    gap: 0.5rem;
  }
  .form-actions .btn {
    width: 100%;
  }
  .suggestions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
