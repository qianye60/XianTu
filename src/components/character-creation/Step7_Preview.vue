<template>
  <div class="preview-container">
    <h2 class="title">{{ $t('最终预览') }}</h2>
    <p class="subtitle">{{ $t('请确认你的选择，此为踏入仙途的最后一步。') }}</p>

    <div class="preview-grid">
      <!-- Character Name -->
      <div class="preview-item name-item">
        <label for="characterName">{{ $t('道号:') }}</label>
        <input
          type="text"
          id="characterName"
          class="named readonly-input"
          v-model="store.characterPayload.character_name"
          :placeholder="$t('正在从酒馆获取...')"
          readonly
          @mousedown.stop
          @click.stop
          @select.stop
        />
      </div>

      <!-- Character Race -->
      <div class="preview-item race-item input-field">
        <label for="characterRace">{{ $t('种族:') }}</label>
        <input
          type="text"
          id="characterRace"
          class="named"
          v-model="store.characterPayload.race"
          :placeholder="$t('人族')"
          @mousedown.stop
          @click.stop
          @select.stop
        />
      </div>

      <!-- Gender Selection -->
      <div class="preview-item gender-item">
        <h3>{{ $t('性别') }}</h3>
        <div class="gender-control">
          <label class="gender-label">
            <input type="radio" name="gender" value="男" v-model="store.characterPayload.gender">
            <span>{{ $t('男') }}</span>
          </label>
          <label class="gender-label">
            <input type="radio" name="gender" value="女" v-model="store.characterPayload.gender">
            <span>{{ $t('女') }}</span>
          </label>
          <label class="gender-label">
            <input type="radio" name="gender" value="双性" v-model="store.characterPayload.gender">
            <span>{{ $t('双性') }}</span>
          </label>
        </div>
      </div>

      <!-- Streaming Mode Selection -->
      <div class="preview-item streaming-item">
        <h3>{{ $t('开局模式') }}</h3>
        <div class="streaming-control">
          <label class="streaming-label">
            <input type="radio" name="streaming" :value="true" v-model="store.useStreamingStart">
            <span>{{ $t('流式开局') }}</span>
          </label>
          <label class="streaming-label">
            <input type="radio" name="streaming" :value="false" v-model="store.useStreamingStart">
            <span>{{ $t('非流式开局') }}</span>
          </label>
        </div>
        <p class="streaming-hint">
          {{ store.useStreamingStart ? $t('流式开局：更快，可能被中断') : $t('非流式开局：一次性生成完整内容，更稳定可靠') }}
        </p>
      </div>

      <!-- Generate Mode Selection -->
      <div class="preview-item generate-mode-item">
        <h3>{{ $t('生成方式') }}</h3>
        <div class="generate-mode-control">
          <label class="generate-mode-label">
            <input type="radio" name="generateMode" value="generate" v-model="store.generateMode">
            <span>{{ $t('标准模式') }}</span>
          </label>
          <label class="generate-mode-label">
            <input type="radio" name="generateMode" value="generateRaw" v-model="store.generateMode">
            <span>{{ $t('纯净模式') }}</span>
          </label>
        </div>
        <p class="generate-mode-hint">
          {{ store.generateMode === 'generate' ? $t('标准模式：使用角色卡预设和聊天历史，更符合角色设定') : $t('纯净模式：仅使用系统提示词，生成更纯粹的开局内容') }}
        </p>
      </div>

      <!-- Birth Age -->
      <div class="preview-item age-item">
        <h3>{{ $t('初始年龄') }}</h3>
        <div class="age-control">
          <button type="button" @click="decrementAge" :disabled="store.characterPayload.current_age <= 0" class="age-btn">-</button>
          <input
            type="number"
            v-model.number="store.characterPayload.current_age"
            class="age-input"
            min="0"
            @input="validateAge"
          />
          <span class="age-unit">{{ $t('岁') }}</span>
          <button type="button" @click="incrementAge" class="age-btn">+</button>
        </div>
      </div>

      <!-- World -->
      <div class="preview-item">
        <h3>{{ $t('所选世界') }}</h3>
        <h4>{{ store.selectedWorld?.name || $t('未选择') }}</h4>
        <p class="item-description">{{ store.selectedWorld?.description || $t('暂无描述') }}</p>
      </div>

      <!-- Talent Tier -->
      <div class="preview-item">
        <h3>{{ $t('天资') }}</h3>
        <h4 :style="{ color: store.selectedTalentTier?.color || 'inherit' }">
          {{ store.selectedTalentTier?.name || $t('未选择') }}
        </h4>
        <p class="item-description">{{ store.selectedTalentTier?.description || $t('暂无描述') }}</p>
      </div>

      <!-- Origin -->
      <div class="preview-item">
        <h3>{{ $t('出身') }}</h3>
        <h4>{{ store.selectedOrigin?.name || $t('随机出身') }}</h4>
        <p class="item-description">{{ store.selectedOrigin?.description || $t('暂无描述') }}</p>
      </div>

      <!-- Spirit Root -->
      <div class="preview-item">
        <h3>{{ $t('灵根') }}</h3>
        <h4>{{ store.selectedSpiritRoot?.name || $t('随机灵根') }}</h4>
        <p class="item-description">{{ store.selectedSpiritRoot?.description || $t('暂无描述') }}</p>
      </div>

      <!-- Talents -->
      <div class="preview-item talents-item">
        <h3>{{ $t('天赋') }}</h3>
        <ul v-if="store.selectedTalents.length">
          <li v-for="talent in store.selectedTalents" :key="talent.id">
            <strong>{{ talent.name }}</strong>
            <p class="item-description">{{ talent.description }}</p>
          </li>
        </ul>
        <p v-else>{{ $t('未选择任何天赋') }}</p>
      </div>

      <!-- Attributes -->
      <div v-if="props.isLocalCreation" class="preview-item attributes-item">
        <h3>{{ $t('先天六司') }}</h3>
        <ul>
          <li>{{ $t('根骨') }}: {{ store.attributes.root_bone }}</li>
          <li>{{ $t('灵性') }}: {{ store.attributes.spirituality }}</li>
          <li>{{ $t('悟性') }}: {{ store.attributes.comprehension }}</li>
          <li>{{ $t('气运') }}: {{ store.attributes.fortune }}</li>
          <li>{{ $t('魅力') }}: {{ store.attributes.charm }}</li>
          <li>{{ $t('心性') }}: {{ store.attributes.temperament }}</li>
        </ul>
      </div>

      <!-- Cloud Mode Placeholder -->
      <div v-else class="preview-item cloud-info-item">
        <h3>{{ $t('命格天定') }}</h3>
        <p class="cloud-info-text">
          {{ $t('联机模式下，角色的初始命格将由所选世界的天道法则在云端生成，以确保公平与平衡。') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useCharacterCreationStore } from '../../stores/characterCreationStore'
import { getTavernHelper } from '@/utils/tavern'

const store = useCharacterCreationStore()

const props = defineProps<{
  isLocalCreation: boolean
}>()

// 从酒馆获取当前Persona名字（只在名字为空时获取，避免重试时覆盖）
onMounted(async () => {
  // 如果已经有名字了，不要重新获取（避免重试时覆盖）
  if (store.characterPayload.character_name && store.characterPayload.character_name !== '无名者') {
    console.log('[Step7_Preview] 已有角色名字，跳过获取:', store.characterPayload.character_name)
    return
  }

  try {
    const helper = getTavernHelper()
    if (helper) {
      // 优先使用宏解析，这是最可靠的方式
      const personaName = await helper.substitudeMacros('{{user}}');
      console.log('[Step7_Preview] 解析宏 {{user}} ->', personaName);

      if (personaName && personaName !== '{{user}}' && typeof personaName === 'string' && personaName.trim()) {
        store.characterPayload.character_name = personaName.trim()
        console.log('[Step7_Preview] ✅ 从酒馆宏获取用户名字:', personaName)
      } else {
        // 如果宏解析失败，回退到旧的全局变量方法
        console.warn('[Step7_Preview] ⚠️ 宏 {{user}} 解析失败, 尝试从全局变量获取')
        const vars = await helper.getVariables({ type: 'global' })
        console.log('[Step7_Preview] 酒馆全局变量:', vars)

        const fallbackName = vars['persona.name'] || vars['name'] || vars['user_name']
        console.log('[Step7_Preview] 检测到Persona名字 (fallback):', fallbackName)

        if (fallbackName && typeof fallbackName === 'string' && fallbackName.trim()) {
          store.characterPayload.character_name = fallbackName.trim()
          console.log('[Step7_Preview] ✅ 从酒馆获取Persona名字 (fallback):', fallbackName)
        } else {
          console.warn('[Step7_Preview] ⚠️ 未获取到有效的Persona名字，保持默认值')
        }
      }
    } else {
      console.warn('[Step7_Preview] ⚠️ 酒馆助手不可用')
    }
  } catch (error) {
    console.error('[Step7_Preview] ❌ 无法从酒馆获取Persona名字:', error)
  }
})

const incrementAge = () => {
  store.characterPayload.current_age++
}

const decrementAge = () => {
  if (store.characterPayload.current_age > 0) {
    store.characterPayload.current_age--
  }
}

const validateAge = () => {
  // 确保年龄不为负数
  if (store.characterPayload.current_age < 0) {
    store.characterPayload.current_age = 0
  }
  // 确保年龄是整数
  store.characterPayload.current_age = Math.floor(store.characterPayload.current_age)
}
</script>

<style scoped>
/* 主容器 */
.preview-container {
  height: 100%;
  padding: 2rem;
  box-sizing: border-box;
  overflow-y: auto;
}

/* 标题 */
.title {
  text-align: center;
  color: var(--color-accent);
  margin: 0 0 0.5rem 0;
  font-family: var(--font-family-serif);
  font-size: 2rem;
  font-weight: 600;
}

.subtitle {
  text-align: center;
  color: var(--color-text-secondary);
  margin: 0 0 2rem 0;
  font-size: 1rem;
  opacity: 0.8;
}

/* 网格布局 */
.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

/* 基础卡片样式 */
.preview-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preview-item h3 {
  margin: 0;
  color: var(--color-primary);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.preview-item p {
  margin: 0;
  font-size: 1rem;
  color: var(--color-text);
  line-height: 1.5;
}

.preview-item h4 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.item-description {
  font-size: 0.9rem !important;
  color: var(--color-text-secondary) !important;
  margin-top: 0.5rem !important;
  opacity: 0.9;
}

.talents-item li .item-description {
  margin-top: 0.25rem !important;
  padding-left: 0.5rem;
  border-left: 2px solid var(--color-border);
}

/* 名字输入 */
.name-item, .race-item {
  grid-column: span 2;
}

@media (min-width: 769px) {
  .name-item, .race-item {
    grid-column: 1 / -1;
  }
}

.name-item label {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 0.5rem;
  display: block;
}

.name-item input, .input-field input {
  width: 100%;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.input-field input {
    background: var(--color-surface);
}

.name-item input:focus, .input-field input:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* 只读输入框样式 */
.readonly-input {
  background: var(--color-surface-light) !important;
  cursor: not-allowed !important;
  opacity: 0.8;
  user-select: none;
}

.readonly-input:focus {
  border-color: var(--color-border) !important;
}

/* 性别选择 */
.gender-control {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.gender-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
  color: var(--color-text);
}

.gender-label:hover {
  background: var(--color-surface-light);
}

.gender-label input[type="radio"] {
  width: 16px;
  height: 16px;
  margin: 0;
}

/* 开局模式选择 */
.streaming-control {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.streaming-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
  color: var(--color-text);
  transition: all 0.2s ease;
}

.streaming-label:hover {
  background: var(--color-surface-light);
}

.streaming-label input[type="radio"] {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--color-primary);
}

.streaming-hint {
  font-size: 0.85rem !important;
  color: var(--color-text-secondary) !important;
  margin-top: 0.5rem !important;
  padding: 0.5rem;
  background: var(--color-surface-light);
  border-radius: 4px;
  border-left: 3px solid var(--color-primary);
  line-height: 1.4;
}

/* 生成方式选择 */
.generate-mode-control {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.generate-mode-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
  color: var(--color-text);
  transition: all 0.2s ease;
}

.generate-mode-label:hover {
  background: var(--color-surface-light);
}

.generate-mode-label input[type="radio"] {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--color-primary);
}

.generate-mode-hint {
  font-size: 0.85rem !important;
  color: var(--color-text-secondary) !important;
  margin-top: 0.5rem !important;
  padding: 0.5rem;
  background: var(--color-surface-light);
  border-radius: 4px;
  border-left: 3px solid var(--color-primary);
  line-height: 1.4;
}

/* 年龄控制 */
.age-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.age-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.age-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.age-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.age-display {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  min-width: 60px;
  text-align: center;
}

.age-input {
  width: 80px;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
  transition: all 0.2s ease;
}

.age-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.age-input::-webkit-inner-spin-button,
.age-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.age-input[type="number"] {
  -moz-appearance: textfield;
}

.age-unit {
  font-size: 1rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* 列表样式 */
.preview-item ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.preview-item li {
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background: var(--color-surface-light);
  border-radius: 4px;
  color: var(--color-text);
  line-height: 1.4;
}

.preview-item li strong {
  display: block;
  margin-bottom: 0.25rem;
  color: var(--color-primary);
}

/* 云端信息 */
.cloud-info-item {
  text-align: center;
  background: var(--color-surface-light);
  border: 1px dashed var(--color-border);
}

.cloud-info-text {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  font-style: italic;
}

/* 响应式 */
@media (max-width: 768px) {
  .preview-container {
    padding: 1rem;
  }

  .preview-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .gender-control {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-around;
  }

  .gender-label {
    flex: 1;
    min-width: 80px;
    justify-content: center;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .preview-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 暗色主题 */
[data-theme="dark"] .preview-item {
  background: #1f2937;
  border-color: #374151;
}

[data-theme="dark"] .name-item input {
  background: #111827;
  border-color: #374151;
  color: #f9fafb;
}

[data-theme="dark"] .readonly-input {
  background: #374151 !important;
}

[data-theme="dark"] .gender-label:hover {
  background: #374151;
}

[data-theme="dark"] .age-btn {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

[data-theme="dark"] .preview-item li {
  background: #374151;
  color: #e5e7eb;
}

[data-theme="dark"] .cloud-info-item {
  background: #374151;
}

@media (max-width: 480px) {
  .preview-container {
    padding: 1rem;
  }

  .title {
    font-size: 1.6rem;
  }

  .subtitle {
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
  }

  .preview-item {
    padding: 1rem;
    gap: 0.8rem;
  }

  .preview-item h3 {
    font-size: 1rem;
  }

  .preview-item h4 {
    font-size: 1rem;
  }

  .item-description {
    font-size: 0.85rem !important;
  }

  .name-item label {
    font-size: 1rem;
  }

  .name-item input {
    padding: 0.6rem;
    font-size: 0.9rem;
  }

  .gender-label {
    font-size: 0.9rem;
    padding: 0.4rem;
  }

  .age-control {
    gap: 0.8rem;
  }

  .age-btn {
    width: 28px;
    height: 28px;
    font-size: 0.9rem;
  }

  .age-display {
    font-size: 1rem;
  }

  .preview-item li {
    padding: 0.6rem;
  }
}
</style>
