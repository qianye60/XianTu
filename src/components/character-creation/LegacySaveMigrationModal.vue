<template>
  <div v-if="open" class="legacy-modal-overlay" @click.self="emit('close')">
    <div class="legacy-modal">
      <div class="legacy-modal-header">
        <div class="title">
          <Wrench :size="18" />
          <span>旧存档转化</span>
        </div>
        <button class="icon-btn" @click="emit('close')" title="关闭">
          <X :size="18" />
        </button>
      </div>

      <div class="legacy-modal-body">
        <p class="hint">
          选择旧存档/旧导出文件后，会先检测并转换为当前格式，再进行校验。
          <template v-if="standalone">
            如果是角色包文件，可以直接创建新角色。
          </template>
          <template v-else>
            你可以下载转换后的文件，或导入到当前选中单机角色。
          </template>
        </p>

        <div class="file-row">
          <button class="btn" @click="pickFile">
            <Upload :size="16" />
            选择 JSON 文件
          </button>
          <span v-if="fileName" class="file-name">{{ fileName }}</span>
          <span v-else class="file-name muted">未选择文件</span>
        </div>

        <div v-if="analysis" class="result">
          <div class="summary-grid">
            <div class="kv"><span class="k">识别类型</span><span class="v">{{ analysis.typeLabel }}</span></div>
            <div class="kv"><span class="k">存档数量</span><span class="v">{{ analysis.totalSaves }}</span></div>
            <div class="kv"><span class="k">需要转换</span><span class="v">{{ analysis.needsMigration }}</span></div>
            <div class="kv"><span class="k">校验失败</span><span class="v">{{ analysis.invalidSaves }}</span></div>
          </div>

          <details v-if="analysis.legacyKeys.length" class="details">
            <summary>检测到的旧 key（合并展示）</summary>
            <div class="chips">
              <span v-for="k in analysis.legacyKeys" :key="k" class="chip">{{ k }}</span>
            </div>
          </details>

          <details v-if="analysis.errors.length" class="details">
            <summary>转换/校验问题</summary>
            <ul class="errors">
              <li v-for="(e, idx) in analysis.errors" :key="idx">{{ e }}</li>
            </ul>
          </details>

          <details class="details">
            <summary>转换后的导出结构</summary>
            <pre class="json-preview">{{ JSON.stringify(convertedPreview, null, 2) }}</pre>
          </details>
        </div>
      </div>

      <div class="legacy-modal-actions">
        <button class="btn btn-secondary" @click="emit('close')">关闭</button>
        <button class="btn" :disabled="!convertedBundle || analysis?.hasFatalErrors" @click="downloadConverted">
          <Download :size="16" />
          转换并下载
        </button>
        <button
          class="btn"
          v-if="canImport"
          :disabled="!convertedSaves || analysis?.hasFatalErrors"
          @click="importToSelectedCharacter"
        >
          <ArrowDownToLine :size="16" />
          导入到当前角色
        </button>
        <button
          class="btn btn-primary"
          v-if="canCreateCharacter"
          :disabled="analysis?.hasFatalErrors"
          @click="createNewCharacter"
        >
          <UserPlus :size="16" />
          创建新角色
        </button>
      </div>

      <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="onFileChange" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowDownToLine, Download, Upload, UserPlus, Wrench, X } from 'lucide-vue-next'
import { toast } from '@/utils/toast'
import { createDadBundle, unwrapDadBundle } from '@/utils/dadBundle'
import { detectLegacySaveData, isSaveDataV3, migrateSaveDataToLatest } from '@/utils/saveMigration'
import { validateSaveDataV3 } from '@/utils/saveValidationV3'
import { useCharacterStore } from '@/stores/characterStore'

interface Props {
  open: boolean
  targetCharId?: string | null
  targetCharName?: string
  standalone?: boolean  // 独立模式：不需要选择角色，可以创建新角色
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'imported', count: number): void
  (e: 'character-created', charId: string): void  // 新角色创建成功
}>()

const characterStore = useCharacterStore()

const fileInput = ref<HTMLInputElement | null>(null)
const fileName = ref<string>('')

type SaveLike = { 存档名?: string; 存档数据?: unknown } & Record<string, any>

type SourceInfo =
  | { label: string; exportType: 'saves'; exportPayloadBase: Record<string, any>; saves: SaveLike[] }
  | { label: string; exportType: 'character'; exportPayloadBase: Record<string, any>; saves: SaveLike[] }

type Analysis = {
  typeLabel: string
  totalSaves: number
  needsMigration: number
  invalidSaves: number
  legacyKeys: string[]
  errors: string[]  // 🔥 现在只用于显示，不阻止操作
  hasFatalErrors: boolean  // 🔥 新增：是否有致命错误（阻止操作）
}

const analysis = ref<Analysis | null>(null)
const convertedBundle = ref<unknown>(null)
const convertedSaves = ref<SaveLike[] | null>(null)
const sourceInfo = ref<SourceInfo | null>(null)  // 保存源信息用于判断是否为角色包

const convertedPreview = computed(() => {
  if (!convertedBundle.value) return null
  const unwrapped = unwrapDadBundle(convertedBundle.value)
  return unwrapped.isBundle ? { schema: 'dad.bundle', type: unwrapped.type } : convertedBundle.value
})

const canImport = computed(() => {
  if (!props.targetCharId) return false
  const profile = (characterStore.rootState.角色列表 as any)?.[props.targetCharId]
  if (!profile || profile.模式 !== '单机') return false
  return Array.isArray(convertedSaves.value) && convertedSaves.value.length > 0
})

// 是否可以创建新角色（独立模式 + 角色包类型 + 有存档数据）
const canCreateCharacter = computed(() => {
  if (!props.standalone) return false
  if (!sourceInfo.value) return false
  if (sourceInfo.value.exportType !== 'character') return false
  if (!Array.isArray(convertedSaves.value) || convertedSaves.value.length === 0) return false
  if (analysis.value?.hasFatalErrors) return false  // 🔥 使用 hasFatalErrors 代替 errors.length
  return true
})

const pickFile = () => {
  fileInput.value?.click()
}

const normalizeSavesFromUnknown = (raw: any): SourceInfo => {
  const unwrapped = unwrapDadBundle(raw)

  // 1) dad.bundle / legacy typed exports
  if (unwrapped.type === 'saves' && Array.isArray(unwrapped.payload?.saves)) {
    return {
      label: '存档包',
      exportType: 'saves',
      exportPayloadBase: { ...(unwrapped.payload || {}) },
      saves: unwrapped.payload.saves,
    }
  }
  if (unwrapped.type === 'character' && Array.isArray(unwrapped.payload?.存档列表)) {
    return {
      label: '角色包',
      exportType: 'character',
      exportPayloadBase: { ...(unwrapped.payload || {}) },
      saves: unwrapped.payload.存档列表,
    }
  }

  // 2) raw single SaveSlot
  if (raw && typeof raw === 'object' && raw.存档数据) {
    return { label: '单个存档', exportType: 'saves', exportPayloadBase: {}, saves: [raw] }
  }

  // 3) raw save data (old/new)
  if (raw && typeof raw === 'object') {
    const detection = detectLegacySaveData(raw)
    if (detection.needsMigration || isSaveDataV3(raw)) {
      return {
        label: '存档数据',
        exportType: 'saves',
        exportPayloadBase: {},
        saves: [
          {
            存档名: '转换存档',
            存档数据: raw,
          },
        ],
      }
    }
  }

  throw new Error('无法识别文件类型：请使用本游戏导出的存档/角色文件，或直接选择存档数据 JSON')
}

const convertSaves = (source: SourceInfo) => {
  const errors: string[] = []
  const warnings: string[] = []  // 🔥 新增：区分错误和警告
  const legacyKeys = new Set<string>()
  let needsMigration = 0
  let invalidSaves = 0

  const nowIso = new Date().toISOString()

  const normalizedSaves = source.saves.map((slot, idx) => {
    const rawSaveData = slot?.存档数据 ?? slot
    const detection = detectLegacySaveData(rawSaveData)
    if (detection.needsMigration) needsMigration++
    detection.legacyKeysFound.forEach((k) => legacyKeys.add(k))

    // 🔥 兼容旧格式：尝试迁移，如果失败则使用原始数据
    let v3 = rawSaveData
    try {
      v3 = isSaveDataV3(rawSaveData) ? rawSaveData : migrateSaveDataToLatest(rawSaveData as any).migrated
      const validation = validateSaveDataV3(v3 as any)
      if (!validation.isValid) {
        invalidSaves++
        // 🔥 改为警告而不是错误，不阻止导入
        warnings.push(
          `第 ${idx + 1} 个存档「${slot?.存档名 ?? '未命名'}」校验警告：${validation.errors[0] || '未知原因'}`
        )
      }
    } catch (migrateError) {
      // 🔥 迁移失败时使用原始数据，只记录警告
      warnings.push(
        `第 ${idx + 1} 个存档「${slot?.存档名 ?? '未命名'}」迁移失败，将使用原始格式`
      )
      console.warn('[旧存档转化] 迁移失败:', migrateError)
    }

    const nextName = String(slot?.存档名 ?? `导入存档_${idx + 1}`)

    return {
      ...slot,
      存档名: nextName,
      保存时间: slot?.保存时间 ?? nowIso,
      最后保存时间: slot?.最后保存时间 ?? slot?.保存时间 ?? nowIso,
      存档数据: v3,
    }
  })

  analysis.value = {
    typeLabel: source.label,
    totalSaves: source.saves.length,
    needsMigration,
    invalidSaves,
    legacyKeys: Array.from(legacyKeys).sort((a, b) => a.localeCompare(b, 'zh')),
    errors: [...errors, ...warnings],  // 🔥 合并错误和警告用于显示
    hasFatalErrors: errors.length > 0,  // 🔥 只有真正的错误才阻止操作
  }

  convertedSaves.value = normalizedSaves
  if (source.exportType === 'character') {
    convertedBundle.value = createDadBundle(
      'character',
      { ...(source.exportPayloadBase || {}), 存档列表: normalizedSaves },
      { exportedAt: nowIso },
    )
  } else {
    convertedBundle.value = createDadBundle(
      'saves',
      { ...(source.exportPayloadBase || {}), saves: normalizedSaves },
      { exportedAt: nowIso },
    )
  }
}

const onFileChange = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    fileName.value = file.name
    analysis.value = null
    convertedBundle.value = null
    convertedSaves.value = null
    sourceInfo.value = null

    const text = await file.text()
    const raw = JSON.parse(text)
    const source = normalizeSavesFromUnknown(raw)
    sourceInfo.value = source  // 保存源信息
    convertSaves(source)

    const result = analysis.value as Analysis | null
    if (result?.hasFatalErrors) {
      toast.error('检测到致命错误，无法导入')
    } else if (result && result.errors.length) {
      // 🔥 有警告但没有致命错误，仍然可以导入
      toast.warning('检测到一些兼容性问题（可继续导入）')
    } else if (result && (result.needsMigration ?? 0) > 0) {
      toast.success('旧存档已转换为当前格式（未写入本地，需手动下载/导入）')
    } else {
      toast.info('文件已是当前格式（可直接下载或导入）')
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误'
    analysis.value = { typeLabel: '未知', totalSaves: 0, needsMigration: 0, invalidSaves: 0, legacyKeys: [], errors: [msg], hasFatalErrors: true }
    sourceInfo.value = null
    toast.error(`读取/解析失败：${msg}`)
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}

const downloadConverted = () => {
  if (!convertedBundle.value) return
  const blob = new Blob([JSON.stringify(convertedBundle.value, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  const dateStr = new Date().toISOString().split('T')[0]
  link.download = `仙途-旧存档转化-${dateStr}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
  toast.success('已下载转换后的文件')
}

const importToSelectedCharacter = async () => {
  if (!props.targetCharId) return
  if (!convertedSaves.value?.length) return

  const charName = props.targetCharName || props.targetCharId
  try {
    for (const save of convertedSaves.value) {
      await characterStore.importSave(props.targetCharId, save as any)
    }
    toast.success(`已导入 ${convertedSaves.value.length} 个存档到角色「${charName}」`)
    emit('imported', convertedSaves.value.length)
  } catch (err) {
    toast.error(`导入失败：${err instanceof Error ? err.message : '未知错误'}`)
  }
}

// 从旧版本角色包创建新角色
const createNewCharacter = async () => {
  if (!sourceInfo.value || sourceInfo.value.exportType !== 'character') {
    toast.error('当前文件不是角色包，无法创建新角色')
    return
  }
  if (!convertedSaves.value?.length) {
    toast.error('没有可用的存档数据')
    return
  }

  try {
    const payload = sourceInfo.value.exportPayloadBase
    const characterData = payload?.角色信息 || payload
    const normalizedProfile = JSON.parse(JSON.stringify(characterData || {}))

    // 兼容旧字段：角色基础信息 → 角色
    if (!normalizedProfile.角色 && normalizedProfile.角色基础信息) {
      normalizedProfile.角色 = normalizedProfile.角色基础信息
      delete normalizedProfile.角色基础信息
    }

    if (!normalizedProfile?.角色) {
      toast.error('角色数据不完整，无法创建')
      return
    }

    // 清空原有存档列表，由导入的存档列表接管
    normalizedProfile.存档列表 = {}
    normalizedProfile._导入存档列表 = convertedSaves.value

    // 使用 characterStore.importCharacter 创建新角色
    const newCharId = await characterStore.importCharacter(normalizedProfile)

    if (newCharId) {
      emit('character-created', newCharId)
    } else {
      toast.error('角色创建失败')
    }
  } catch (err) {
    toast.error(`创建角色失败：${err instanceof Error ? err.message : '未知错误'}`)
  }
}
</script>

<style scoped>
.legacy-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10050;
  padding: 1rem;
}

.legacy-modal {
  width: 100%;
  max-width: 860px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.35);
}

.legacy-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
}

.icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0.25rem;
  border-radius: 8px;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-text);
}

.legacy-modal-body {
  padding: 1rem;
}

.hint {
  margin: 0 0 0.75rem;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.file-name {
  font-size: 0.9rem;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-name.muted {
  color: var(--color-text-secondary);
}

.result {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 0.9rem;
  background: rgba(255, 255, 255, 0.02);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}

.kv {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 0.6rem 0.7rem;
  background: rgba(0, 0, 0, 0.12);
}

.k {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.v {
  display: block;
  font-weight: 700;
  margin-top: 0.15rem;
}

.details {
  margin-top: 0.6rem;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.5rem;
}

.chip {
  border: 1px solid var(--color-border);
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  font-size: 0.8rem;
}

.errors {
  margin: 0.5rem 0 0;
  padding-left: 1.1rem;
  color: #ffb4b4;
}

.json-preview {
  margin: 0.5rem 0 0;
  max-height: 220px;
  overflow: auto;
  padding: 0.75rem;
  background: var(--color-code-bg);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.8rem;
}

.legacy-modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.9rem 1rem;
  border-top: 1px solid var(--color-border);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.8rem;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-primary);
  color: #fff;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn.btn-secondary {
  background: transparent;
  color: var(--color-text);
}

.btn.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.06);
}

@media (max-width: 760px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
