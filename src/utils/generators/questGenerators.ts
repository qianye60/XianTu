import { generateWithRawPrompt } from '@/utils/tavernCore';
import { QUEST_GENERATION_PROMPT, QUEST_UPDATE_PROMPT, QUEST_COMPLETE_PROMPT } from '@/utils/prompts/questPrompts';
import type { Quest, SaveData } from '@/types/game';

/**
 * 生成新任务
 */
export async function generateQuest(saveData: SaveData): Promise<Quest | null> {
  try {
    const context = {
      玩家姓名: saveData.玩家角色状态.基础信息.姓名,
      当前境界: saveData.玩家角色状态.修为.境界,
      当前位置: saveData.玩家角色状态.位置.描述,
      最近记忆: saveData.玩家角色状态.记忆.slice(-3).map(m => m.事件).join('；')
    };

    const prompt = QUEST_GENERATION_PROMPT
      .replace('{{玩家姓名}}', context.玩家姓名)
      .replace('{{当前境界}}', context.当前境界)
      .replace('{{当前位置}}', context.当前位置)
      .replace('{{最近记忆}}', context.最近记忆);

    const response = await generateWithRawPrompt('生成一个适合当前情况的任务', prompt, false);

    // 解析AI返回的JSON
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      throw new Error('AI响应格式错误');
    }

    const result = JSON.parse(jsonMatch[1]);

    // 从 tavern_commands 中提取任务数据
    const questCommand = result.tavern_commands?.find(
      (cmd: any) => cmd.key.startsWith('任务系统.当前任务列表.')
    );

    return questCommand?.value || null;
  } catch (error) {
    console.error('生成任务失败:', error);
    return null;
  }
}

/**
 * 更新任务进度
 */
export async function updateQuestProgress(
  quest: Quest,
  playerAction: string
): Promise<any> {
  try {
    const prompt = QUEST_UPDATE_PROMPT
      .replace('{{当前任务JSON}}', JSON.stringify(quest, null, 2))
      .replace('{{玩家最近行为}}', playerAction);

    const response = await generateWithRawPrompt('更新任务进度', prompt, false);
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[1]);
  } catch (error) {
    console.error('更新任务进度失败:', error);
    return null;
  }
}

/**
 * 完成任务并发放奖励
 */
export async function completeQuest(quest: Quest): Promise<any> {
  try {
    const prompt = QUEST_COMPLETE_PROMPT
      .replace('{{任务JSON}}', JSON.stringify(quest, null, 2))
      .replace('{{奖励修为}}', String(quest.奖励.修为 || 0))
      .replace('{{奖励灵石}}', String(quest.奖励.灵石?.下品 || 0));

    const response = await generateWithRawPrompt('完成任务', prompt, false);
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[1]);
  } catch (error) {
    console.error('完成任务失败:', error);
    return null;
  }
}