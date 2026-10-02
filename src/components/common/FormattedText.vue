<template>
  <div class="formatted-text">
    <template v-for="(part, index) in parsedText" :key="index">
      <span v-if="part.type !== 'judgement-card'" :class="getPartClass(part.type)">{{ part.content }}</span>
      <div
        v-else-if="isJudgementData(part.content)"
        class="judgement-card"
        :class="[{
          'is-success': isSuccessResult(part.content.result),
          'is-failure': isFailureResult(part.content.result),
          'is-great-success': part.content.result?.includes('大成功'),
          'is-great-failure': part.content.result?.includes('大失败'),
          'is-perfect': part.content.result?.includes('完美')
        }]"
      >
        <div class="jc-seal" aria-hidden="true">
          <CheckCircle2 v-if="isSuccessResult(part.content.result)" :size="22" />
          <XCircle v-else-if="isFailureResult(part.content.result)" :size="22" />
          <Info v-else :size="22" />
        </div>
        <div class="jc-content">
          <div class="jc-head">
            <span class="judgement-title" :class="getTitleClass(part.content.result)">{{ part.content.title }}</span>
            <div class="jc-head-right">
              <span class="judgement-badge">{{ part.content.result }}</span>
              <button type="button" class="jc-help" title="查看判定规则" aria-label="查看判定规则" @click.stop="showJudgementHelp">
                <HelpCircle :size="15" />
              </button>
            </div>
          </div>
          <div class="jc-body">
            <div
              v-if="part.content.lucky"
              class="jc-stat jc-lucky"
              :class="{ 'lucky-positive': parseInt(part.content.lucky) >= 0, 'lucky-negative': parseInt(part.content.lucky) < 0 }"
            >
              <Clover :size="15" class="jc-icon" />
              <span class="jc-label">幸运</span>
              <span class="jc-value lucky-value">{{ part.content.lucky }}</span>
            </div>
            <div v-if="part.content.finalValue" class="jc-stat">
              <Sparkles :size="15" class="jc-icon" />
              <span class="jc-label">判定值</span>
              <span class="jc-value">{{ part.content.finalValue }}</span>
            </div>
            <div v-if="part.content.difficulty" class="jc-stat jc-difficulty">
              <Target :size="15" class="jc-icon" />
              <span class="jc-label">难度</span>
              <span class="jc-value">{{ part.content.difficulty }}</span>
            </div>
            <div v-if="part.content.damage" class="jc-stat">
              <Swords :size="15" class="jc-icon" />
              <span class="jc-label">伤害</span>
              <span class="jc-value">{{ part.content.damage }}</span>
            </div>
            <div v-if="part.content.remainingHp" class="jc-stat">
              <Heart :size="15" class="jc-icon" />
              <span class="jc-label">剩余气血</span>
              <span class="jc-value">{{ part.content.remainingHp }}</span>
            </div>
            <div v-if="part.content.details && part.content.details.length > 0" class="jc-details">
              <div v-for="(detail, idx) in part.content.details" :key="idx" class="jc-detail">
                <span class="jc-detail-label">{{ parseDetailLabel(detail) }}</span>
                <span class="jc-detail-value">{{ parseDetailValue(detail) }}</span>
                <span v-if="parseDetailSource(detail)" class="jc-detail-source">{{ parseDetailSource(detail) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>

  <!-- 判定规则帮助弹窗 -->
  <Teleport to="body">
    <div v-if="showHelpModal" class="cc-modal-overlay" @click.self="closeHelpModal">
      <div class="cc-modal wide help-modal" role="dialog" aria-modal="true" :aria-label="$t('判定规则说明')">
        <div class="cc-modal-head">
          <h2 class="cc-modal-title">{{ $t('判定规则说明') }}</h2>
          <button type="button" class="cc-modal-close" :aria-label="$t('关闭')" @click="closeHelpModal">
            <X :size="18" />
          </button>
        </div>
        <div class="cc-modal-body">
          <section class="help-section">
            <h3 class="cc-section-title">{{ $t('判定计算公式') }} (v8.0)</h3>
            <div class="formula-box">
              <strong>{{ $t('最终判定值') }}</strong> = {{ $t('基础值') }} + {{ $t('幸运点') }} + {{ $t('环境修正') }} + {{ $t('状态修正') }}
            </div>
            <ol class="help-list">
              <li><strong>{{ $t('基础值') }}</strong>：{{ $t('底子 10 + 有效属性加权 + 境界加成。有效属性 = 先天×70% + 后天×30%') }}</li>
              <li><strong>{{ $t('幸运点') }}</strong>：{{ $t('气运越高，区间从 -8～+6 抬到 -3～+16') }}</li>
              <li><strong>{{ $t('环境修正') }}</strong>：{{ $t('灵气浓度影响（修炼/炼丹/战斗），探索社交不受影响') }}</li>
              <li><strong>{{ $t('状态修正') }}</strong>：{{ $t('伤病只取最重一项（最多 -6），加上 Buff/Debuff，合计 -10～+15') }}</li>
            </ol>
          </section>

          <section class="help-section">
            <h3 class="cc-section-title">{{ $t('判定结果') }}</h3>
            <p class="formula-note">
              <strong>{{ $t('判定规则') }}</strong>：{{ $t('判定值与难度对比。基础由属性和境界决定，幸运点随气运波动') }}
            </p>
            <div class="result-list">
              <div class="result-item perfect">
                <span class="result-label">{{ $t('完美') }}</span>
                <span class="result-desc">{{ $t('判定值 ≥ 难度+15') }}</span>
              </div>
              <div class="result-item great-success">
                <span class="result-label">{{ $t('大成功') }}</span>
                <span class="result-desc">{{ $t('判定值 ≥ 难度+8，超额完成') }}</span>
              </div>
              <div class="result-item success">
                <span class="result-label">{{ $t('成功') }}</span>
                <span class="result-desc">{{ $t('判定值 ≥ 难度，达成目标') }}</span>
              </div>
              <div class="result-item failure">
                <span class="result-label">{{ $t('失败') }}</span>
                <span class="result-desc">{{ $t('判定值 < 难度，未达成') }}</span>
              </div>
              <div class="result-item critical-failure">
                <span class="result-label">{{ $t('大失败') }}</span>
                <span class="result-desc">{{ $t('判定值低于难度-12') }}</span>
              </div>
            </div>
          </section>

          <section class="help-section">
            <h3 class="cc-section-title">{{ $t('判定类型与属性配比') }}</h3>
            <dl class="judgement-types">
              <div class="type-item"><dt>{{ $t('战斗判定') }}</dt><dd>{{ $t('进攻：根骨50% + 灵性30% + 气运20%；防御：根骨50% + 心性30% + 灵性20%') }}</dd></div>
              <div class="type-item"><dt>{{ $t('修炼判定') }}</dt><dd>{{ $t('悟性50% + 灵性30% + 心性20%') }}</dd></div>
              <div class="type-item"><dt>{{ $t('炼制判定') }}</dt><dd>{{ $t('悟性50% + 灵性30% + 心性20%') }}</dd></div>
              <div class="type-item"><dt>{{ $t('社交判定') }}</dt><dd>{{ $t('魅力50% + 悟性30% + 心性20%') }}</dd></div>
              <div class="type-item"><dt>{{ $t('探索判定') }}</dt><dd>{{ $t('气运50% + 灵性30% + 悟性20%') }}</dd></div>
              <div class="type-item"><dt>{{ $t('逃跑判定') }}</dt><dd>{{ $t('灵性50% + 气运30% + 根骨20%') }}</dd></div>
            </dl>
          </section>

          <section class="help-section">
            <h3 class="cc-section-title">{{ $t('六司属性说明') }}</h3>
            <div class="attributes-desc">
              <div v-for="attr in ATTRIBUTE_HELP" :key="attr.name" class="attr-card">
                <div class="attr-header">
                  <span class="attr-glyph" aria-hidden="true">{{ attr.name.charAt(0) }}</span>
                  <span class="attr-name">{{ $t(attr.name) }}</span>
                </div>
                <p>{{ $t(attr.desc) }}</p>
              </div>
            </div>
          </section>

          <section class="help-section">
            <h3 class="cc-section-title">{{ $t('提升判定成功率') }}</h3>
            <ul class="help-list">
              <li>{{ $t('先天六司：天赋决定上限，无法改变但影响最大') }}</li>
              <li>{{ $t('提升境界：境界越高，判定基础加成越大（练气+5，筑基+12...）') }}</li>
              <li>{{ $t('修炼后天：后天六司可提升，权重为 30%') }}</li>
              <li>{{ $t('功法与装备：对六司的提升计入后天，从而抬高基础值') }}</li>
              <li>{{ $t('状态效果：buff增强判定，注意避免debuff') }}</li>
              <li>{{ $t('境界压制：有对手时按对手强弱换难度，高一个小阶段为困难，高一个大境界为极难') }}</li>
              <li>{{ $t('打不过就跑：逃跑比正面交手低两档，失败多是吃亏受伤，不会一次判定就丢命') }}</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { CheckCircle2, XCircle, Info, HelpCircle, Clover, Sparkles, Target, Swords, Heart, X } from 'lucide-vue-next'
import { extractStreamingNarrative } from '@/utils/textSanitizer'
import { computeJudgementResult } from '@/utils/judgement'

const ATTRIBUTE_HELP = [
  { name: '根骨', desc: '决定气血上限、恢复速度、寿命上限。影响炼体修行、抗打击能力。' },
  { name: '灵性', desc: '决定灵气上限、吸收效率。影响修炼速度、法术威力。' },
  { name: '悟性', desc: '决定神识上限、学习效率。影响功法领悟、技能掌握速度。' },
  { name: '气运', desc: '决定各种概率、物品掉落品质。影响天材地宝获取、贵人相助。' },
  { name: '魅力', desc: '决定初始好感度、社交加成。影响NPC互动、门派声望获取。' },
  { name: '心性', desc: '决定心魔抗性、意志力。影响走火入魔抵抗、关键抉择。' },
]

const showHelpModal = ref(false)

const showJudgementHelp = () => {
  showHelpModal.value = true
}

const closeHelpModal = () => {
  showHelpModal.value = false
}

interface JudgementData {
  title: string
  result: '成功' | '失败' | '完美' | '大成功' | '大失败' | string
  dice: string
  attribute: string
  difficulty?: string
  bonus?: string
  finalValue?: string
  damage?: string
  remainingHp?: string
  lucky?: string  // 幸运点
  baseValue?: string
  environment?: string
  statusMod?: string
  details?: string[]
}

interface TextPart {
  type: 'environment' | 'psychology' | 'dialogue' | 'judgement-card' | 'normal' | 'quote' | 'bold' | 'italic'
  content: string | JudgementData
}

const isJudgementData = (content: string | JudgementData): content is JudgementData => {
  return typeof content === 'object' && content !== null && 'title' in content
}

const parseNumberValue = (value?: string) => {
  if (!value) return null
  const match = value.match(/[+-]?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

const splitKeyValue = (text: string): { key: string; value: string } | null => {
  const match = text.match(/^([^:：]+)[:：](.+)$/)
  if (!match) return null
  return { key: match[1].trim(), value: match[2].trim() }
}

const MESSAGE_TITLES = new Set(['系统提示', '系统判定', '系统', '状态变化', '状态结算'])

const parseJudgementMarkedContent = (markedContent: string): JudgementData | null => {
  const content = markedContent.trim()
  if (!content) return null

  // 1) 消息类：以“系统提示：...”等开头（不要按逗号拆分，避免把正文逗号当字段分隔）
  const wholeKv = splitKeyValue(content)
  if (wholeKv && MESSAGE_TITLES.has(wholeKv.key)) {
    return {
      title: wholeKv.key,
      result: '提示',
      dice: '',
      attribute: '',
      details: [`内容:${wholeKv.value}`]
    }
  }

  // 2) 判定类：字段用逗号分隔（兼容中文/英文逗号）
  const parts = content
    .split(/[，,]/)
    .map(p => p.trim())
    .filter(Boolean)

  if (parts.length === 0) return null

  const titleResult = splitKeyValue(parts[0])
  if (!titleResult) {
    // 兜底：无法解析为判定结构时，仍用“系统提示”卡片展示，避免渲染错乱
    return {
      title: '系统提示',
      result: '提示',
      dice: '',
      attribute: '',
      details: [`内容:${content}`]
    }
  }

  const judgement: JudgementData = {
    title: titleResult.key,
    result: titleResult.value,
    dice: '',
    attribute: '',
    details: []
  }

  for (let i = 1; i < parts.length; i++) {
    const kv = splitKeyValue(parts[i])
    if (!kv) {
      judgement.details?.push(`备注:${parts[i]}`)
      continue
    }

    const key = kv.key
    const value = kv.value
    if (!key || !value) continue

    if (key.includes('难度')) {
      judgement.difficulty = value
    } else if (key.includes('判定值') || key.includes('最终值') || key.includes('总值')) {
      judgement.finalValue = value
    } else if (key.includes('幸运')) {
      judgement.lucky = value
    } else if (key.includes('基础')) {
      judgement.baseValue = value
      judgement.details?.push(`${key}:${value}`)
    } else if (key.includes('环境')) {
      judgement.environment = value
      judgement.details?.push(`${key}:${value}`)
    } else if (key === '状态' || key.includes('状态修正')) {
      judgement.statusMod = value
      judgement.details?.push(`${key}:${value}`)
    } else if (key.includes('加成')) {
      judgement.bonus = value
    } else if (key.includes('造成伤害')) {
      judgement.damage = value
    } else if (key.includes('剩余气血')) {
      judgement.remainingHp = value
    } else if (key.includes('骰点') || key.includes('骰子')) {
      judgement.dice = value
    } else if (key.includes('备注')) {
      judgement.details?.push(value)
    } else {
      judgement.details?.push(`${key}:${value}`)
    }
  }

  const baseNum = parseNumberValue(judgement.baseValue)
  const luckyNum = parseNumberValue(judgement.lucky)
  const environmentNum = parseNumberValue(judgement.environment)
  const statusNum = parseNumberValue(judgement.statusMod)
  if (baseNum !== null && luckyNum !== null && environmentNum !== null && statusNum !== null) {
    const sum = baseNum + luckyNum + environmentNum + statusNum
    const stated = parseNumberValue(judgement.finalValue)
    if (stated === null || stated !== sum) {
      judgement.details = judgement.details || []
      judgement.details.push(`数值校验:${stated ?? '空'}→${sum}`)
      judgement.finalValue = String(sum)
    }
  }

  const finalValueNum = parseNumberValue(judgement.finalValue)
  const difficultyNum = parseNumberValue(judgement.difficulty)
  if (finalValueNum !== null && difficultyNum !== null) {
    const computedResult = computeJudgementResult(finalValueNum, difficultyNum)
    if (computedResult && computedResult !== judgement.result) {
      judgement.details = judgement.details || []
      judgement.details.push(`结果校验:${judgement.result}→${computedResult}`)
      judgement.result = computedResult
    }
  }

  return judgement
}

const repairCommonAIFormat = (text: string): string => {
  const lines = text.split('\n')
  const out: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()

    // 去掉重复的“系统提示/系统判定”单行标题
    if (line === '系统提示' || line === '系统判定') continue

    // 把裸露的系统行包进 〔〕，避免污染正文解析
    const systemHint = line.match(/^系统提示[:：]\s*(.+)$/)
    if (systemHint) {
      out.push(`〔系统提示：${systemHint[1].trim()}〕`)
      continue
    }

    const systemJudgement = line.match(/^系统判定[:：]\s*(.+)$/)
    if (systemJudgement) {
      out.push(`〔系统判定：${systemJudgement[1].trim()}〕`)
      continue
    }

    // 修复误用的“【当前状态】”面板：转为 〔状态变化：...〕
    if (line === '【当前状态】') {
      const statusLines: string[] = []
      let j = i + 1
      for (; j < lines.length; j++) {
        const candidateRaw = lines[j]
        const candidate = candidateRaw.trim()
        if (!candidate) break
        const firstChar = candidate[0]
        if (firstChar === '【' || firstChar === '〔' || firstChar === '〖' || firstChar === '`' || firstChar === '"' || firstChar === '“' || firstChar === '「') break
        statusLines.push(candidate)
        if (statusLines.length >= 8) {
          j++
          break
        }
      }

      if (statusLines.length > 0) {
        out.push(`〔状态变化：${statusLines.join('；')}〕`)
        i = j - 1
      }
      continue
    }

    out.push(rawLine)
  }

  return out.join('\n')
}

const props = defineProps<{
  text: string
}>()

// 解析普通文本中的Markdown格式（**粗体** 和 *斜体*）
const parseMarkdownInText = (text: string, parts: TextPart[]) => {
  let currentIndex = 0

  while (currentIndex < text.length) {
    // 查找 ** 粗体
    const boldStart = text.indexOf('**', currentIndex)
    // 查找 * 斜体（但要排除 **）
    let italicStart = text.indexOf('*', currentIndex)
    if (italicStart !== -1 && text[italicStart + 1] === '*') {
      italicStart = text.indexOf('*', italicStart + 2)
    }

    // 确定最近的标记
    let nextMarkStart = -1
    let markType: 'bold' | 'italic' | null = null

    if (boldStart !== -1 && (italicStart === -1 || boldStart < italicStart)) {
      nextMarkStart = boldStart
      markType = 'bold'
    } else if (italicStart !== -1) {
      nextMarkStart = italicStart
      markType = 'italic'
    }

    // 没有找到标记，剩余文本作为普通文本
    if (nextMarkStart === -1) {
      if (currentIndex < text.length) {
        parts.push({
          type: 'normal',
          content: text.slice(currentIndex)
        })
      }
      break
    }

    // 添加标记前的普通文本
    if (nextMarkStart > currentIndex) {
      parts.push({
        type: 'normal',
        content: text.slice(currentIndex, nextMarkStart)
      })
    }

    // 查找结束标记
    if (markType === 'bold') {
      const boldEnd = text.indexOf('**', nextMarkStart + 2)
      if (boldEnd !== -1) {
        parts.push({
          type: 'bold',
          content: text.slice(nextMarkStart + 2, boldEnd)
        })
        currentIndex = boldEnd + 2
      } else {
        // 没有找到结束标记，作为普通文本
        parts.push({
          type: 'normal',
          content: text.slice(nextMarkStart)
        })
        break
      }
    } else if (markType === 'italic') {
      const italicEnd = text.indexOf('*', nextMarkStart + 1)
      if (italicEnd !== -1 && text[italicEnd + 1] !== '*') {
        parts.push({
          type: 'italic',
          content: text.slice(nextMarkStart + 1, italicEnd)
        })
        currentIndex = italicEnd + 1
      } else {
        // 没有找到结束标记，作为普通文本
        parts.push({
          type: 'normal',
          content: text.slice(nextMarkStart)
        })
        break
      }
    }
  }
}

// 兜底：旧存档或解析失败时正文可能是 {"text":"…"} 整段 JSON，显示前取出 text 字段并还原转义
const JSON_WRAPPED = /^\s*(?:```(?:json)?\s*)?\{\s*"(?:text|正文)"\s*:/i

const parsedText = computed(() => {
  const parts: TextPart[] = []
  const rawText = props.text || ''
  const text = JSON_WRAPPED.test(rawText) ? extractStreamingNarrative(rawText) : rawText

  if (!text.trim()) {
    return [{ type: 'normal', content: text }]
  }

  let currentIndex = 0
  // 统一换行并规范化引号（压缩重复的中英文引号，避免解析异常）
  // 🔥 增强：将各种Unicode引号统一转换为标准引号，并处理转义反斜杠
  const normalizedText = text
    .replace(/\\\\/g, '\n')     // 处理 \\ 转义的换行符
    .replace(/\\n/g, '\n')       // 处理 \n 换行符
    .replace(/\r\n/g, '\n')      // 统一 Windows 换行符
    .replace(/\r/g, '\n')        // 统一 Mac 换行符

  const processedText = repairCommonAIFormat(normalizedText)

  while (currentIndex < processedText.length) {
    // 查找标记的顺序：先找最近的开始标记
    const markers = []

    // 环境描写 【】
    const envStart = processedText.indexOf('【', currentIndex)
    if (envStart !== -1) {
      const envEnd = processedText.indexOf('】', envStart + 1)
      if (envEnd !== -1) {
        markers.push({
          start: envStart,
          end: envEnd + 1,
          type: 'environment' as const,
          contentStart: envStart + 1,
          contentEnd: envEnd
        })
      }
    }

    // 心理描写 `...`（兼容旧格式 ``...``）
    const psyDoubleStart = processedText.indexOf('``', currentIndex)
    if (psyDoubleStart !== -1) {
      const psyDoubleEnd = processedText.indexOf('``', psyDoubleStart + 2)
      if (psyDoubleEnd !== -1) {
        markers.push({
          start: psyDoubleStart,
          end: psyDoubleEnd + 2,
          type: 'psychology' as const,
          contentStart: psyDoubleStart + 2,
          contentEnd: psyDoubleEnd
        })
      }
    }

    const psyStart = processedText.indexOf('`', currentIndex)
    if (psyStart !== -1 && !processedText.startsWith('``', psyStart)) {
      const psyEnd = processedText.indexOf('`', psyStart + 1)
      if (psyEnd !== -1) {
        markers.push({
          start: psyStart,
          end: psyEnd + 1,
          type: 'psychology' as const,
          contentStart: psyStart + 1,
          contentEnd: psyEnd
        })
      }
    }

    // 对话：半角双引号 ""
    const dialogStart = processedText.indexOf('"', currentIndex)
    if (dialogStart !== -1) {
      const dialogEnd = processedText.indexOf('"', dialogStart + 1)
      if (dialogEnd !== -1) {
        markers.push({
          start: dialogStart,
          end: dialogEnd + 1,
          type: 'dialogue' as const,
          contentStart: dialogStart + 1,
          contentEnd: dialogEnd
        })
      }
    }

    // 引用/独白：中文引号 “ ”
    const quoteStart = processedText.indexOf('“', currentIndex)
    if (quoteStart !== -1) {
      const quoteEnd = processedText.indexOf('”', quoteStart + 1)
      if (quoteEnd !== -1) {
        markers.push({
          start: quoteStart,
          end: quoteEnd + 1,
          type: 'quote' as const,
          // 包含引号本身
          contentStart: quoteStart,
          contentEnd: quoteEnd + 1
        })
      }
    }

    // 🔥 新增：书名号「」也解析为对话
    const bookQuoteStart = processedText.indexOf('「', currentIndex)
    if (bookQuoteStart !== -1) {
      const bookQuoteEnd = processedText.indexOf('」', bookQuoteStart + 1)
      if (bookQuoteEnd !== -1) {
        markers.push({
          start: bookQuoteStart,
          end: bookQuoteEnd + 1,
          type: 'dialogue' as const,
          // 包含书名号本身
          contentStart: bookQuoteStart,
          contentEnd: bookQuoteEnd + 1
        })
      }
    }

    // 判定结果 〔〕（兼容旧格式 〖〗）
    const judgementStart = processedText.indexOf('〔', currentIndex)
    if (judgementStart !== -1) {
      const judgementEnd = processedText.indexOf('〕', judgementStart + 1)
      if (judgementEnd !== -1) {
        markers.push({
          start: judgementStart,
          end: judgementEnd + 1,
          type: 'judgement' as const,
          contentStart: judgementStart + 1,
          contentEnd: judgementEnd,
          wrapStart: '〔',
          wrapEnd: '〕'
        })
      }
    }

    const legacyJudgementStart = processedText.indexOf('〖', currentIndex)
    if (legacyJudgementStart !== -1) {
      const legacyJudgementEnd = processedText.indexOf('〗', legacyJudgementStart + 1)
      if (legacyJudgementEnd !== -1) {
        markers.push({
          start: legacyJudgementStart,
          end: legacyJudgementEnd + 1,
          type: 'judgement' as const,
          contentStart: legacyJudgementStart + 1,
          contentEnd: legacyJudgementEnd,
          wrapStart: '〖',
          wrapEnd: '〗'
        })
      }
    }

    // 过滤和排序标记
    const validMarkers = markers
      .filter(m => m.start >= currentIndex && m.contentStart < m.contentEnd)
      .sort((a, b) => a.start - b.start)

    if (validMarkers.length === 0) {
      // 没有更多标记，剩余文本需要解析Markdown
      if (currentIndex < processedText.length) {
        parseMarkdownInText(processedText.slice(currentIndex), parts)
      }
      break
    }

    const nextMarker = validMarkers[0]

    // 添加标记前的普通文本（需要解析Markdown）
    if (nextMarker.start > currentIndex) {
      const normalText = processedText.slice(currentIndex, nextMarker.start)
      if (normalText) {
        parseMarkdownInText(normalText, parts)
      }
    }

    // 添加标记内容
    const markedContent = processedText.slice(nextMarker.contentStart, nextMarker.contentEnd)
    if (markedContent.trim()) {
      if (nextMarker.type === 'judgement') {
        const judgement = parseJudgementMarkedContent(markedContent)
        if (judgement) {
          parts.push({ type: 'judgement-card', content: judgement })
        } else {
          const wrapStart = nextMarker.wrapStart ?? '〔'
          const wrapEnd = nextMarker.wrapEnd ?? '〕'
          parts.push({ type: 'normal', content: `${wrapStart}${markedContent}${wrapEnd}` })
        }
      } else {
        parts.push({
          type: nextMarker.type,
          content: processedText.slice(nextMarker.start, nextMarker.end)
        })
      }
    }

    currentIndex = nextMarker.end
  }

  return parts.length > 0 ? parts : [{ type: 'normal', content: text }]
})

const getPartClass = (type: string) => {
  return {
    'text-environment': type === 'environment',
    'text-psychology': type === 'psychology',
    'text-dialogue': type === 'dialogue',
    'text-quote': type === 'quote',
    'text-bold': type === 'bold',
    'text-italic': type === 'italic',
    'text-normal': type === 'normal'
  }
}

// 判断成功/失败的辅助函数
const isSuccessResult = (result: string) => {
  return ['成功', '大成功', '完美', '通过'].includes(result)
}

const isFailureResult = (result: string) => {
  return ['失败', '大失败', '失败惨重', '未通过'].includes(result)
}

// 根据结果获取标题样式类
const getTitleClass = (result: string) => {
  if (result?.includes('完美')) return 'title-perfect'
  if (result?.includes('大成功')) return 'title-great-success'
  if (result?.includes('成功') || result?.includes('通过')) return 'title-success'
  if (result?.includes('大失败') || result?.includes('失败惨重')) return 'title-great-failure'
  if (result?.includes('失败') || result?.includes('未通过')) return 'title-failure'
  return ''
}

// 解析详情字段的辅助函数
const parseDetailLabel = (detail: string) => {
  const parts = detail.split(':')
  return parts[0] + ':'
}

const parseDetailValue = (detail: string) => {
  const parts = detail.split(':')
  if (parts.length < 2) return ''

  // 提取数值部分（可能包含括号内容）
  const valueWithSource = parts[1]
  const match = valueWithSource.match(/^([+-]?\d+)/)
  return match ? match[1] : valueWithSource.split('(')[0].trim()
}

const parseDetailSource = (detail: string) => {
  const parts = detail.split(':')
  if (parts.length < 2) return ''

  // 提取括号内的来源信息
  const valueWithSource = parts[1]
  const match = valueWithSource.match(/\(([^)]+)\)/)
  return match ? `(${match[1]})` : ''
}

</script>

<style scoped>
.formatted-text {
  margin: 0;
  padding-bottom: 0.5rem;
  white-space: pre-wrap;
  word-wrap: break-word;
  text-align: justify;
  text-indent: 2em;
  line-height: inherit;
}

/* ---------- 叙事文字色（令牌见 game-theme.css） ---------- */
.text-normal {
  color: inherit;
}

/* 环境描写【】 */
.text-environment {
  color: var(--gm-text-env);
}

/* 心理描写 */
.text-psychology {
  color: var(--gm-text-psy);
  font-style: italic;
}

/* 对话 */
.text-dialogue {
  color: var(--gm-text-dialogue);
  font-weight: 500;
}

/* 引用 / 独白 */
.text-quote {
  color: var(--gm-text-quote);
  font-style: italic;
  font-weight: 500;
}

.text-bold {
  font-weight: 700;
  color: var(--cc-text);
}

.text-italic {
  font-style: italic;
  color: var(--cc-text-2);
}

/* ============================================================
   判定签
   ============================================================ */
.judgement-card {
  --tone: var(--cc-accent);

  position: relative;
  display: flex;
  gap: 0.9rem;
  margin: 0.25rem 0;
  padding: 0.85rem 1rem;
  border: 1px solid var(--cc-border);
  border-left: 3px solid var(--tone);
  border-radius: 4px 6px 6px 4px;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--tone) 9%, transparent), transparent 55%),
    var(--gm-block);
  text-indent: 0;
  text-align: left;
  line-height: 1.5;
  white-space: normal;
}

.judgement-card.is-success { --tone: var(--cc-success); }
.judgement-card.is-great-success,
.judgement-card.is-perfect { --tone: var(--cc-gold); }
.judgement-card.is-failure { --tone: var(--cc-danger); }
.judgement-card.is-great-failure { --tone: var(--gm-cultivation, #a891f2); }

.jc-seal {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--tone) 22%, transparent), var(--cc-inset) 75%);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--tone) 55%, transparent);
  color: var(--tone);
}

.jc-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.jc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.judgement-title {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  color: var(--cc-text);
}

.jc-head-right {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.judgement-badge {
  padding: 0.15rem 0.6rem;
  border-radius: 3px;
  background: var(--tone);
  color: var(--cc-solid-bg);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.15em;
}

.jc-help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--cc-border);
  border-radius: 50%;
  background: var(--cc-surface);
  color: var(--cc-text-3);
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.jc-help:hover {
  color: var(--tone);
  border-color: var(--tone);
}

.jc-body {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.jc-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border: 1px solid var(--cc-border);
  border-radius: 4px;
  background: var(--cc-inset);
  font-size: 0.8rem;
}

.jc-icon {
  color: var(--cc-gold);
}

.jc-label {
  letter-spacing: 0.1em;
  color: var(--cc-text-3);
}

.jc-value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--cc-text);
}

.lucky-positive .jc-icon,
.lucky-positive .lucky-value {
  color: var(--cc-success);
}

.lucky-negative .jc-icon,
.lucky-negative .lucky-value {
  color: var(--cc-danger);
}

.jc-details {
  width: 100%;
  margin-top: 0.15rem;
  padding-top: 0.45rem;
  border-top: 1px dashed var(--cc-divider);
}

.jc-detail {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.15rem 0;
  font-size: 0.8rem;
  color: var(--cc-text-2);
}

.jc-detail::before {
  content: '';
  flex-shrink: 0;
  width: 4px;
  height: 4px;
  margin-right: 0.1rem;
  background: rgba(var(--cc-gold-rgb), 0.6);
  transform: translateY(-2px) rotate(45deg);
}

.jc-detail-label {
  color: var(--cc-text-3);
}

.jc-detail-value {
  min-width: 2rem;
  font-weight: 600;
  color: var(--cc-text);
}

.jc-detail-source {
  font-size: 0.72rem;
  font-style: italic;
  color: var(--cc-text-3);
}

/* ============================================================
   判定规则弹窗（结构用 cc-modal，这里只排版正文）
   ============================================================ */
.help-section + .help-section {
  margin-top: 1.25rem;
}

.help-section .cc-section-title {
  margin-bottom: 0.6rem;
}

.formula-box {
  margin-bottom: 0.6rem;
  padding: 0.7rem 0.9rem;
  border-left: 3px solid var(--cc-gold);
  border-radius: 0 4px 4px 0;
  background: rgba(var(--cc-gold-rgb), 0.08);
  font-size: 0.88rem;
  color: var(--cc-text);
}

.formula-box strong {
  color: var(--cc-gold);
}

.formula-note {
  margin: 0 0 0.6rem;
  font-size: 0.85rem;
  color: var(--cc-text-2);
}

.help-list {
  margin: 0;
  padding-left: 1.3rem;
  font-size: 0.85rem;
  line-height: 1.85;
  color: var(--cc-text-2);
}

.help-list strong {
  color: var(--cc-text);
}

.note {
  color: var(--cc-text-3);
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0.8rem;
  border: 1px solid var(--cc-border);
  border-radius: 4px;
  background: var(--cc-surface);
}

.result-label {
  min-width: 4em;
  font-weight: 700;
  letter-spacing: 0.15em;
}

.result-desc {
  flex: 1;
  font-size: 0.85rem;
  color: var(--cc-text-2);
}

.result-item.perfect .result-label,
.result-item.great-success .result-label { color: var(--cc-gold); }
.result-item.success .result-label { color: var(--cc-success); }
.result-item.failure .result-label { color: var(--cc-danger); }
.result-item.critical-failure .result-label { color: var(--gm-cultivation, #a891f2); }

.judgement-types {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.4rem;
  margin: 0;
}

.type-item {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--cc-border);
  border-radius: 4px;
  background: var(--cc-surface);
}

.type-item dt {
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  color: var(--cc-text);
}

.type-item dd {
  margin: 0.15rem 0 0;
  font-size: 0.78rem;
  color: var(--cc-text-3);
}

.attributes-desc {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.5rem;
}

.attr-card {
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--cc-border);
  border-radius: 4px;
  background: var(--cc-surface);
}

.attr-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.attr-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(var(--cc-gold-rgb), 0.45);
  font-family: var(--cc-calligraphy);
  color: var(--cc-gold);
}

.attr-name {
  font-size: 0.88rem;
  letter-spacing: 0.15em;
  color: var(--cc-text);
}

.attr-card p {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.65;
  color: var(--cc-text-2);
}

@media (max-width: 480px) {
  .judgement-card {
    gap: 0.6rem;
    padding: 0.7rem 0.75rem;
  }

  .jc-seal {
    width: 32px;
    height: 32px;
  }
}
</style>
