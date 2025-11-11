import { cotCorePrompt, getCotCorePrompt } from './cot/cotCore';
import * as coreRules from './definitions/coreRules';
import * as businessRules from './definitions/businessRules';
import * as textFormats from './definitions/textFormats';
import * as worldStandards from './definitions/worldStandards';
import { SAVE_DATA_STRUCTURE, DATA_STRUCTURE_EXAMPLES } from './definitions/dataDefinitions';
import { ACTION_OPTIONS_RULES } from './definitions/actionOptions';
import { QUEST_SYSTEM_RULES } from './definitions/questSystemRules';

// 导出常用的规则常量
export { SAVE_DATA_STRUCTURE as DATA_STRUCTURE_DEFINITIONS };

/**
 * 组装最终的系统Prompt
 * @param activePrompts - 一个包含了当前需要激活的prompt模块名称的数组
 * @param customActionPrompt - 自定义行动选项提示词（可选）
 * @returns {string} - 拼接好的完整prompt字符串
 */
export function assembleSystemPrompt(activePrompts: string[], customActionPrompt?: string): string {
  const promptSections = [
    // 核心规则（JSON格式、响应格式、数据结构严格性）
    Object.values(coreRules).filter(rule => typeof rule === 'string').join('\n\n'),
    // 业务规则（境界系统、三千大道、NPC规则、命令路径构建、NSFW规则）
    Object.values(businessRules).filter(rule => typeof rule === 'string').join('\n\n'),
    // 数据结构定义
    SAVE_DATA_STRUCTURE,
    DATA_STRUCTURE_EXAMPLES,
    // 文本格式与命名
    Object.values(textFormats).join('\n\n'),
    // 世界设定参考
    Object.values(worldStandards).join('\n\n'),
  ];

  // 根据激活列表来添加可选模块
  if (activePrompts.includes('actionOptions')) {
    const customPromptSection = customActionPrompt
      ? `**用户自定义要求**：${customActionPrompt}\n\n请严格按照以上自定义要求生成行动选项。`
      : '（无特殊要求，按默认规则生成）';
    const actionRules = ACTION_OPTIONS_RULES.replace('{{CUSTOM_ACTION_PROMPT}}', customPromptSection);
    promptSections.push(actionRules);
  }

  if (activePrompts.includes('questSystem')) {
    promptSections.push(QUEST_SYSTEM_RULES);
  }

  if (activePrompts.includes('cot')) {
    promptSections.push(cotCorePrompt); // 将COT放在最后面
  }

  return promptSections.join('\n\n---\n\n');
}
