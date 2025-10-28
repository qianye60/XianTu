/**
 * Tavern Core Utilities
 * 提供与 TavernAI 环境交互的核心功能
 */

import { getTavernHelper } from './tavern';
import type { TavernHelper } from '@/types';

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
  streaming: boolean = false
): Promise<string> {
  const tavernHelper: TavernHelper | null = getTavernHelper();

  if (!tavernHelper) {
    throw new Error('TavernAI环境未连接，无法生成响应');
  }

  try {
    // 注意：使用 user 角色而不是 system，避免中转API忽略
    const response = await tavernHelper.generateRaw({
      ordered_prompts: [
        { role: 'user', content: systemPrompt },
        { role: 'user', content: userPrompt },
        { role: 'user', content: "开始任务" }
      ],
      should_stream: streaming,
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
