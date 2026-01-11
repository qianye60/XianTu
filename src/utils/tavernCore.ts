/**
 * Tavern Core Utilities
 * 提供与 TavernAI 环境交互的核心功能
 * 现已支持酒馆和自定义API两种模式
 */

import { aiService } from '@/services/aiService';
import type { APIUsageType } from '@/stores/apiManagementStore';

/**
 * 使用原始提示词生成AI响应
 * @param userPrompt 用户提示词
 * @param systemPrompt 系统提示词
 * @param streaming 是否使用流式输出
 * @returns AI生成的响应文本
 */
export async function generateWithRawPrompt(
  userPrompt: string,
  systemPrompt: string,
  streaming: boolean = false,
  usageType?: APIUsageType
): Promise<string> {
  try {
    // 注意：使用 user 角色而不是 system，避免中转API忽略
    const response = await aiService.generateRaw({
      ordered_prompts: [
        { role: 'user', content: systemPrompt },
        { role: 'user', content: userPrompt },
        { role: 'user', content: "开始任务" }
      ],
      should_stream: streaming,
      usageType,
      overrides: {
        world_info_before: '',
        world_info_after: ''
      }
    });

    if (response && typeof response === 'object' && 'text' in response) {
      return (response as { text: string }).text;
    }

    if (typeof response === 'string') {
      return response;
    }

    return String(response);
  } catch (error) {
    console.error('[TavernCore] 生成响应失败:', error);
    throw error;
  }
}
