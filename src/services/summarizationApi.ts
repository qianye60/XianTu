/**
 * @file summarizationApi.ts
 * @description 独立的AI记忆提炼服务 (Independent AI Memory Summarization Service)
 * 此服务专门负责与用户配置的、用于提炼总结的AI模型进行通信。
 * This service is dedicated to communicating with the user-configured AI model for summarization.
 */

import { useSettingsStore } from '@/stores/settings'

interface SummarizationResponse {
  summary: string
  karma_flags: string[]
}

/**
 * 调用外部AI模型，提炼对话内容的摘要和长期记忆点。
 * Calls an external AI model to refine a summary and long-term memory points from the dialogue.
 *
 * @param prompt The system prompt guiding the AI's task.
 * @param conversationText The conversation buffer to be summarized.
 * @returns A promise that resolves to the structured summary response, or null if an error occurs.
 */
export async function getMemorySummary(
  prompt: string,
  conversationText: string,
): Promise<SummarizationResponse | null> {
  const settingsStore = useSettingsStore()
  const apiUrl = settingsStore.summarizationApiUrl
  const apiKey = settingsStore.summarizationApiKey

  if (!apiUrl || !apiKey) {
    console.error('【炼丹失败】未在藏经阁中找到有效的丹火地址或催火法咒。')
    return null
  }

  console.log(`【心法自炼】催动真火，开始向【${apiUrl}】发起请求...`)

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // 可以选择一个经济高效的模型
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: conversationText,
          },
        ],
        // 强制要求模型返回JSON对象，此为OpenAI兼容API的妙用
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`【炼丹失败】记忆提炼API请求失败，状态码: ${response.status}`, errorBody)
      return null
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      console.error('【炼丹失败】API返回的数据中未找到有效内容。')
      return null
    }

    // 开炉验丹：解析AI返回的JSON字符串
    try {
      const parsedContent = JSON.parse(content) as SummarizationResponse
      console.log('【炼丹功成】成功提炼记忆精华:', parsedContent)
      return parsedContent
    } catch (e) {
      console.error('【丹药有毒】无法解析AI返回的JSON内容:', content, e)
      // TODO: 在此可以加入“纠错再炼”的逻辑
      return null
    }
  } catch (error) {
    console.error('【真火失控】向记忆提炼API发起网络请求时发生未知错误:', error)
    return null
  }
}
