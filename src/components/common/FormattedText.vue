<template>
  <div class="formatted-text">
    <template v-for="(part, index) in parsedText" :key="index">
      <span v-if="part.type !== 'judgement-card'" :class="getPartClass(part.type)">
        {{ part.content }}
      </span>
      <div v-else-if="isJudgementData(part.content)" class="judgement-card" :class="{
        'is-success': isSuccessResult(part.content.result),
        'is-failure': isFailureResult(part.content.result)
      }">
        <div class="card-header">
          <svg v-if="isSuccessResult(part.content.result)" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <svg v-else-if="isFailureResult(part.content.result)" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span>{{ part.content.title }}</span>
        </div>
        <div class="card-body">
          <div class="result-text">{{ part.content.result }}</div>
          <div class="dice-roll">
            <span class="label">骰点</span>
            <span class="value">{{ part.content.dice }}</span>
          </div>
          <div class="attribute-check">
            <span class="label">属性</span>
            <span class="value">{{ part.content.attribute }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface JudgementData {
  title: string
  result: '成功' | '失败' | string
  dice: string
  attribute: string
}

interface TextPart {
  type: 'environment' | 'psychology' | 'dialogue' | 'judgement-card' | 'normal'
  content: string | JudgementData
}

const isJudgementData = (content: any): content is JudgementData => {
  return typeof content === 'object' && content !== null && 'title' in content
}

const props = defineProps<{
  text: string
}>()

const parsedText = computed(() => {
  const parts: TextPart[] = []
  const text = props.text || ''
  
  if (!text.trim()) {
    return [{ type: 'normal', content: text }]
  }

  let currentIndex = 0
  // 统一换行并规范化引号（压缩重复的中英文引号，避免解析异常）
  const processedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/“{2,}/g, '“')
    .replace(/”{2,}/g, '”')
    .replace(/"{2,}/g, '"')

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
    
    // 心理描写 ``
    const psyStart = processedText.indexOf('`', currentIndex)
    if (psyStart !== -1) {
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
    
    // 对话：支持半角双引号 "" 与中文引号 “ ”
    // 半角引号
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
    // 中文引号
    const zhDialogStart = processedText.indexOf('“', currentIndex)
    if (zhDialogStart !== -1) {
      const zhDialogEnd = processedText.indexOf('”', zhDialogStart + 1)
      if (zhDialogEnd !== -1) {
        markers.push({
          start: zhDialogStart,
          end: zhDialogEnd + 1,
          type: 'dialogue' as const,
          // 包含引号本身
          contentStart: zhDialogStart,
          contentEnd: zhDialogEnd + 1
        })
      }
    }
    
    // 判定结果 〖〗
    const judgementStart = processedText.indexOf('〖', currentIndex)
    if (judgementStart !== -1) {
      const judgementEnd = processedText.indexOf('〗', judgementStart + 1)
      if (judgementEnd !== -1) {
        markers.push({ 
          start: judgementStart, 
          end: judgementEnd + 1, 
          type: 'judgement' as const,
          contentStart: judgementStart + 1,
          contentEnd: judgementEnd
        })
      }
    }

    // 过滤和排序标记
    const validMarkers = markers
      .filter(m => m.start >= currentIndex && m.contentStart < m.contentEnd)
      .sort((a, b) => a.start - b.start)

    if (validMarkers.length === 0) {
      // 没有更多标记，剩余的都是普通文本
      if (currentIndex < processedText.length) {
        parts.push({
          type: 'normal',
          content: processedText.slice(currentIndex)
        })
      }
      break
    }

    const nextMarker = validMarkers[0]

    // 添加标记前的普通文本
    if (nextMarker.start > currentIndex) {
      const normalText = processedText.slice(currentIndex, nextMarker.start)
      if (normalText) {
        parts.push({
          type: 'normal',
          content: normalText
        })
      }
    }

    // 添加标记内容
    const markedContent = processedText.slice(nextMarker.contentStart, nextMarker.contentEnd)
    if (markedContent.trim()) {
      if (nextMarker.type === 'judgement') {
        // 使用简单的分隔符解析判定内容
        // 格式: "感悟判定:失败,骰点:98,悟性:5"
        const contentParts = markedContent.split(',').map(p => p.trim())
        
        if (contentParts.length >= 2) {
          const titleResult = contentParts[0].split(':')
          const diceInfo = contentParts.find(p => p.includes('骰点'))
          const attrInfo = contentParts.find(p => !p.includes('骰点') && p !== contentParts[0])
          
          if (titleResult.length === 2) {
            parts.push({
              type: 'judgement-card',
              content: {
                title: titleResult[0].trim(),
                result: titleResult[1].trim(),
                dice: diceInfo ? diceInfo.split(':')[1]?.trim() || '未知' : '未知',
                attribute: attrInfo || '未知属性'
              }
            })
          } else {
            // 解析失败，作为普通文本处理
            parts.push({ type: 'normal', content: `〖${markedContent}〗` })
          }
        } else {
          // 解析失败，作为普通文本处理
          parts.push({ type: 'normal', content: `〖${markedContent}〗` })
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
</script>

<style scoped>
.formatted-text {
  white-space: pre-wrap;
  word-wrap: break-word;
  text-align: justify;
  text-indent: 2em;
  margin: 0;
  line-height: 1.8;
  padding-bottom: 1.5rem;
}

/* 环境描写 - 青色 */
.text-environment {
  color: #0891b2;
  font-weight: 500;
}

/* 心理描写 - 紫色 */
.text-psychology {
  color: #7c3aed;
  font-style: italic;
  font-weight: 500;
}

/* 对话 - 橙色 */
.text-dialogue {
  color: #c2410c;
  font-weight: 500;
  font-style: italic;
  background-color: rgba(251, 146, 60, 0.08);
  padding: 0.1em 0.3em;
  border-radius: 4px;
  margin: 0 0.1em;
}

/* 普通文本 */
.text-normal {
  color: var(--color-text);
}

/* 判定卡片样式 */
.judgement-card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  margin: 1rem 0;
  background: linear-gradient(135deg, var(--color-background-soft) 0%, var(--color-background) 100%);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  text-indent: 0;
  padding: 1rem 1.5rem;
  border-left-width: 4px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.judgement-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, var(--gradient-color, #6366f1) 50%, transparent 100%);
  opacity: 0.6;
}

.judgement-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
}

.judgement-card.is-success {
  border-left-color: #10b981;
  --gradient-color: #10b981;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.02) 0%, var(--color-background) 100%);
}

.judgement-card.is-failure {
  border-left-color: #ef4444;
  --gradient-color: #ef4444;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.02) 0%, var(--color-background) 100%);
}

.card-header {
  display: flex;
  align-items: center;
  font-weight: 700;
  font-size: 1.1em;
  margin-bottom: 1rem;
  color: var(--color-heading);
  position: relative;
}

.card-header::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 30px;
  height: 2px;
  background: var(--gradient-color, #6366f1);
  border-radius: 1px;
}

.card-header svg {
  margin-right: 0.5rem;
  color: var(--gradient-color, #6366f1);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.card-body {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 1rem;
  align-items: center;
}

.result-text {
  font-size: 1.2em;
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  text-align: center;
  position: relative;
  background: var(--color-background-muted);
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.is-success .result-text {
  color: #059669;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
  border-color: rgba(16, 185, 129, 0.2);
}

.is-failure .result-text {
  color: #dc2626;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%);
  border-color: rgba(239, 68, 68, 0.2);
}

.dice-roll, .attribute-check {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem;
  background: var(--color-background-muted);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.dice-roll:hover, .attribute-check:hover {
  background: var(--color-background-soft);
  transform: translateY(-1px);
}

.dice-roll .label, .attribute-check .label {
  font-size: 0.8em;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.dice-roll .value, .attribute-check .value {
  font-size: 1.4em;
  font-weight: 700;
  color: var(--color-heading);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.dice-roll .value {
  color: #6366f1;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 深色主题适配 */
[data-theme="dark"] .judgement-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, var(--color-background) 100%);
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .result-text,
[data-theme="dark"] .dice-roll,
[data-theme="dark"] .attribute-check {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.dice-roll, .attribute-check {
  display: flex;
  flex-direction: column;
  text-align: center;
  background-color: var(--color-background-mute);
  padding: 0.4rem;
  border-radius: 6px;
}

.label {
  font-size: 0.8em;
  color: var(--color-text-muted);
  margin-bottom: 0.2rem;
}

.value {
  font-weight: 600;
  font-size: 1.1em;
  color: var(--color-text);
}
</style>
