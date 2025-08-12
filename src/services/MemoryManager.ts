import { onMessageStream, upsertWorldInfoEntry } from './tavern'
import { saveWorldState } from './tavern'
import { getMemorySummary } from './summarizationApi'
import type { Ref } from 'vue'
import type { WorldState } from '@/core/rules/characterCreation'

// 此处存放由外部注入的“神识”，即当前活跃角色的响应式状态
let activeCharacterState: Ref<WorldState | null> | null = null

/**
 * @file MemoryManager.ts
 * @description 核心记忆管理器 (Core Memory Manager)
 * 负责监听对话流，在适当时机触发AI进行自我总结，并将总结出的记忆进行分层存储。
 * Manages the chat flow, triggers AI self-summarization at appropriate times,
 * and stores the resulting memories in a tiered system.
 */

const DIALOGUE_TURNS_PER_SUMMARY = 10 // 每10轮对话总结一次
let turnCounter = 0
let conversationBuffer: string[] = []

/**
 * 初始化记忆管理器，开始监听对话
 * Initializes the memory manager and starts listening to the conversation.
 */
export function initializeMemoryManager(gameStateRef: Ref<WorldState | null>) {
  activeCharacterState = gameStateRef
  // 真正开始监听对话流
  onMessageStream((message: any) => {
    // 此处我们假设 message 是一个包含用户和AI发言的对象
    // 例如: { name: 'user', is_user: true, mes: '你好' }
    // 我们只关心AI的发言，作为一轮对话的结束
    if (!message.is_user) {
      const fullMessage = `${message.name}: ${message.mes}`
      handleNewMessage(fullMessage)
    }
  })
  console.log('【记忆熔炉】已注入神识，开始监听对话流转...')
}

/**
 * 处理新消息
 * @param message 新消息的内容
 */
async function handleNewMessage(message: string) {
  conversationBuffer.push(message)
  turnCounter++

  if (turnCounter >= DIALOGUE_TURNS_PER_SUMMARY) {
    await triggerMemoryRefinement()
    turnCounter = 0
    conversationBuffer = []
  }
}

/**
 * 触发记忆炼化流程
 * Triggers the memory refinement process.
 */
async function triggerMemoryRefinement() {
  console.log('【记忆炼化】达到对话阈值，开始提炼记忆...')

  const conversationText = conversationBuffer.join('\n')
  const prompt = `
You are a master storyteller's assistant. Your task is to distill the essence of a conversation into a structured memory format.
Based on the following dialogue, identify key events, character developments, and crucial information.
Respond ONLY with a valid JSON object, with no other text before or after it.
The JSON object must have two keys:
1. "summary": A concise string (max 200 chars) summarizing the scene's outcome. This is for short-term recall.
2. "karma_flags": An array of strings, each being a critical, third-person memory or "karmic event" that defines the character's journey (e.g., "Made a powerful enemy in the Crimson Cult," "Discovered the ancient sword 'Soulfire'"). These are for long-term recall. If no significant long-term memories were formed, return an empty array.

Conversation:
---
${conversationText}
---
`
  // 调用真正的炼丹炉
  const summaryResult = await getMemorySummary(prompt, conversationText)

  try {
    if (summaryResult) {
      const { summary, karma_flags } = summaryResult

      // TODO: 存储中期记忆 (地魂)
      console.log(`【地魂归位】场景摘要已更新: ${summary}`)

      // 存储长期记忆 (天魂)
      if (activeCharacterState?.value) {
        const character = activeCharacterState.value.character
        if (!character.memory_shards) {
          character.memory_shards = []
        }
        // 确保不添加空的或无效的记忆
        const valid_flags = karma_flags.filter((flag) => flag && flag.trim() !== '')
        if (valid_flags.length > 0) {
          character.memory_shards.push(...valid_flags)

          // 执笔刻印：将每一条天魂记忆都写入世界设定
          for (const flag of valid_flags) {
            await upsertWorldInfoEntry({
              key: flag,
              content: `[发生过的事情]: ${flag}`,
            })
          }

          await saveWorldState(activeCharacterState.value)
          console.log('【天魂烙印】长期记忆已更新并存入命盘与世界法则中:', valid_flags)
        }
      } else {
        console.error('【记忆熔炉】错误：无活跃角色状态，无法烙印天魂。')
      }
    }
  } catch (error) {
    console.error('【记忆炼化失败】处理AI返回结果时出错:', error)
  }
}
