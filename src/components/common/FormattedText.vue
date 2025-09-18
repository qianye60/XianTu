<template>
  <div class="formatted-text">
    <span
      v-for="(part, index) in parsedText"
      :key="index"
      :class="getPartClass(part.type)"
    >
      {{ part.content }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface TextPart {
  type: 'environment' | 'psychology' | 'dialogue' | 'normal'
  content: string
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
          contentStart: zhDialogStart + 1,
          contentEnd: zhDialogEnd
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

    // 添加标记内容（不包括标记符号）
    const markedContent = processedText.slice(nextMarker.contentStart, nextMarker.contentEnd)
    if (markedContent.trim()) {
      parts.push({
        type: nextMarker.type,
        content: markedContent
      })
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
</script>

<style scoped>
.formatted-text {
  white-space: pre-wrap;
  word-wrap: break-word;
  text-align: justify;
  text-indent: 2em;
  margin: 0;
  line-height: 1.8;
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
  color: #ea580c;
  font-weight: 600;
}

/* 普通文本 */
.text-normal {
  color: var(--color-text);
}
</style>
