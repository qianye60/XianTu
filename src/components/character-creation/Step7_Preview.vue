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
          class="named"
          v-model="store.characterPayload.character_name"
          :placeholder="$t('请输入道号')"
        />
        <span class="name-hint">{{ $t('可自定义修改') }}</span>
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

      <!-- Start Mode (Streaming / Non-Streaming) -->
      <div v-if="props.isLocalCreation" class="preview-item">
        <h3>{{ $t('开局模式') }}</h3>
        <div class="streaming-control">
          <label class="streaming-label">
            <input type="radio" name="startMode" :value="true" v-model="store.useStreamingStart">
            <span>{{ $t('流式开局') }}</span>
          </label>
          <label class="streaming-label">
            <input type="radio" name="startMode" :value="false" v-model="store.useStreamingStart">
            <span>{{ $t('非流式开局') }}</span>
          </label>
        </div>
        <p class="streaming-hint">
          {{ store.useStreamingStart ? $t('流式开局：更快，可能被中断') : $t('非流式开局：一次性生成完整内容，更稳定可靠') }}
        </p>
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
  if (store.characterPayload.character_name && store.characterPayload.character_name !== '无名者' && store.characterPayload.character_name.trim() !== '') {
    console.log('[Step7_Preview] 已有角色名字，跳过获取:', store.characterPayload.character_name)
    return
  }

  // 尝试从酒馆获取名字
  let nameObtained = false

  try {
    // 直接检查原生 TavernHelper 是否存在
    const nativeTavernHelper = typeof window !== 'undefined' ? (window as any).TavernHelper : null

    if (nativeTavernHelper) {
      // 方法1: 使用 substitudeMacros 解析 {{user}} 宏
      if (!nameObtained && typeof nativeTavernHelper.substitudeMacros === 'function') {
        try {
          const personaName = await nativeTavernHelper.substitudeMacros('{{user}}')
          console.log('[Step7_Preview] substitudeMacros {{user}} ->', personaName)

          if (personaName && personaName !== '{{user}}' && typeof personaName === 'string' && personaName.trim()) {
            store.characterPayload.character_name = personaName.trim()
            console.log('[Step7_Preview] ✅ 从酒馆宏获取用户名字:', personaName)
            nameObtained = true
          }
        } catch (e) {
          console.warn('[Step7_Preview] ⚠️ substitudeMacros 失败:', e)
        }
      }

      // 方法2: 从全局变量获取
      if (!nameObtained && typeof nativeTavernHelper.getVariables === 'function') {
        try {
          const vars = await nativeTavernHelper.getVariables({ type: 'global' })
          const fallbackName = vars['persona.name'] || vars['name'] || vars['user_name'] || vars['user']
          console.log('[Step7_Preview] 全局变量中的名字:', fallbackName)

          if (fallbackName && typeof fallbackName === 'string' && fallbackName.trim()) {
            store.characterPayload.character_name = fallbackName.trim()
            console.log('[Step7_Preview] ✅ 从全局变量获取名字:', fallbackName)
            nameObtained = true
          }
        } catch (e) {
          console.warn('[Step7_Preview] ⚠️ getVariables 失败:', e)
        }
      }

      // 方法3: 从角色数据获取
      if (!nameObtained && typeof nativeTavernHelper.getCharData === 'function') {
        try {
          const charData = await nativeTavernHelper.getCharData()
          if (charData?.name && typeof charData.name === 'string' && charData.name.trim()) {
            store.characterPayload.character_name = charData.name.trim()
            console.log('[Step7_Preview] ✅ 从角色数据获取名字:', charData.name)
            nameObtained = true
          }
        } catch (e) {
          console.warn('[Step7_Preview] ⚠️ getCharData 失败:', e)
        }
      }
    } else {
      console.log('[Step7_Preview] 非酒馆模式，跳过名字获取')
    }
  } catch (error) {
    console.error('[Step7_Preview] ❌ 无法从酒馆获取Persona名字:', error)
  }

  // 如果未能获取到名字，清空默认值让用户自行输入
  if (!nameObtained) {
    store.characterPayload.character_name = ''
    console.log('[Step7_Preview] 📝 未获取到名字，请用户自行输入道号')
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
/* ========== 深色玻璃拟态风格 ========== */
/* 主容器 */
.preview-container {
  height: 100%;
  padding: 2rem;
  box-sizing: border-box;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(147, 197, 253, 0.3) transparent;
}

.preview-container::-webkit-scrollbar { width: 6px; }
.preview-container::-webkit-scrollbar-track { background: transparent; }
.preview-container::-webkit-scrollbar-thumb { background: rgba(147, 197, 253, 0.3); border-radius: 3px; }

/* 标题 */
.title {
  text-align: center;
  color: #93c5fd;
  margin: 0 0 0.5rem 0;
  font-family: var(--font-family-serif);
  font-size: 2rem;
  font-weight: 600;
  text-shadow: 0 0 20px rgba(147, 197, 253, 0.3);
}

.subtitle {
  text-align: center;
  color: #94a3b8;
  margin: 0 0 2rem 0;
  font-size: 1rem;
  font-style: italic;
}

/* 网格布局 */
.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

/* 基础卡片样式 */
.preview-item {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: all 0.25s ease;
}

.preview-item:hover {
  background: rgba(30, 41, 59, 0.7);
  border-color: rgba(147, 197, 253, 0.2);
}

.preview-item h3 {
  margin: 0;
  color: #93c5fd;
  border-bottom: 1px solid rgba(147, 197, 253, 0.2);
  padding-bottom: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.preview-item p {
  margin: 0;
  font-size: 1rem;
  color: #f1f5f9;
  line-height: 1.5;
}

.preview-item h4 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #bfdbfe;
}

.item-description {
  font-size: 0.9rem !important;
  color: #94a3b8 !important;
  margin-top: 0.5rem !important;
}

.talents-item li .item-description {
  margin-top: 0.25rem !important;
  padding-left: 0.5rem;
  border-left: 2px solid rgba(147, 197, 253, 0.3);
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
  color: #93c5fd;
  margin-bottom: 0.5rem;
  display: block;
}

.name-item input, .input-field input {
  width: 100%;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(147, 197, 253, 0.3);
  color: #f1f5f9;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 1rem;
  box-sizing: border-box;
  transition: all 0.25s ease;
}

.input-field input {
  background: rgba(30, 41, 59, 0.4);
}

.name-item input:focus, .input-field input:focus {
  outline: none;
  border-color: #93c5fd;
  box-shadow: 0 0 0 2px rgba(147, 197, 253, 0.1);
}

/* 只读输入框样式 */
.readonly-input {
  background: rgba(30, 41, 59, 0.3) !important;
  cursor: not-allowed !important;
  opacity: 0.7;
  user-select: none;
}

.readonly-input:focus {
  border-color: rgba(147, 197, 253, 0.2) !important;
  box-shadow: none !important;
}

/* 名字提示文字 */
.name-hint {
  font-size: 0.85rem;
  color: #94a3b8;
  margin-top: 0.5rem;
  display: block;
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
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  color: #f1f5f9;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid transparent;
  transition: all 0.25s ease;
}

.gender-label:hover {
  background: rgba(51, 65, 85, 0.6);
  border-color: rgba(147, 197, 253, 0.2);
}

.gender-label input[type="radio"] {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: #93c5fd;
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
  border: 1px solid rgba(147, 197, 253, 0.3);
  background: rgba(30, 41, 59, 0.6);
  color: #93c5fd;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
}

.age-btn:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.3);
  border-color: #93c5fd;
  color: #bfdbfe;
}

.age-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.age-display {
  font-size: 1.1rem;
  font-weight: 600;
  color: #f1f5f9;
  min-width: 60px;
  text-align: center;
}

.age-input {
  width: 80px;
  padding: 0.5rem;
  border: 1px solid rgba(147, 197, 253, 0.3);
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.6);
  color: #f1f5f9;
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
  transition: all 0.25s ease;
}

.age-input:focus {
  outline: none;
  border-color: #93c5fd;
  box-shadow: 0 0 0 2px rgba(147, 197, 253, 0.1);
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
  color: #94a3b8;
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
  background: rgba(30, 41, 59, 0.4);
  border-radius: 8px;
  color: #f1f5f9;
  line-height: 1.4;
  border: 1px solid transparent;
  transition: all 0.25s ease;
}

.preview-item li:hover {
  background: rgba(51, 65, 85, 0.5);
  border-color: rgba(147, 197, 253, 0.15);
}

.preview-item li strong {
  display: block;
  margin-bottom: 0.25rem;
  color: #93c5fd;
}

/* 云端信息 */
.cloud-info-item {
  text-align: center;
  background: rgba(30, 41, 59, 0.3);
  border: 1px dashed rgba(147, 197, 253, 0.3);
}

.cloud-info-text {
  font-size: 0.95rem;
  color: #94a3b8;
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

/* ========== 亮色主题适配 ========== */
[data-theme="light"] .preview-item {
  background: rgba(248, 250, 252, 0.8);
  border-color: rgba(0, 0, 0, 0.08);
}

[data-theme="light"] .preview-item:hover {
  background: rgba(241, 245, 249, 0.95);
  border-color: rgba(59, 130, 246, 0.2);
}

[data-theme="light"] .preview-item h3 {
  color: #2563eb;
  border-bottom-color: rgba(59, 130, 246, 0.2);
}

[data-theme="light"] .preview-item h4 {
  color: #1e40af;
}

[data-theme="light"] .preview-item p {
  color: #1e293b;
}

[data-theme="light"] .title {
  color: #2563eb;
}

[data-theme="light"] .subtitle {
  color: #475569;
}

[data-theme="light"] .name-item label {
  color: #2563eb;
}

[data-theme="light"] .name-item input,
[data-theme="light"] .input-field input {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(59, 130, 246, 0.3);
  color: #1e293b;
}

[data-theme="light"] .gender-label {
  background: rgba(255, 255, 255, 0.6);
  color: #1e293b;
}

[data-theme="light"] .gender-label:hover {
  background: rgba(241, 245, 249, 0.95);
  border-color: rgba(59, 130, 246, 0.2);
}

[data-theme="light"] .age-btn {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(59, 130, 246, 0.3);
  color: #2563eb;
}

[data-theme="light"] .age-btn:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
}

[data-theme="light"] .age-input {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(59, 130, 246, 0.3);
  color: #1e293b;
}

[data-theme="light"] .preview-item li {
  background: rgba(255, 255, 255, 0.6);
  color: #1e293b;
}

[data-theme="light"] .preview-item li:hover {
  background: rgba(241, 245, 249, 0.95);
}

[data-theme="light"] .preview-item li strong {
  color: #2563eb;
}

[data-theme="light"] .cloud-info-item {
  background: rgba(248, 250, 252, 0.6);
  border-color: rgba(59, 130, 246, 0.3);
}

[data-theme="light"] .cloud-info-text {
  color: #475569;
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
