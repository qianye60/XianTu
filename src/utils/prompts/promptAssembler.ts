import { cotCorePrompt } from './cot/cotCore';
import { FORBIDDEN_WORDS_RULES } from './definitions/coreRules';
import * as coreRules from './definitions/coreRules';
import * as businessRules from './definitions/businessRules';
import * as textFormats from './definitions/textFormats';
import * as worldStandards from './definitions/worldStandards';
import { SAVE_DATA_STRUCTURE, DATA_STRUCTURE_EXAMPLES } from './definitions/dataDefinitions';

// 导出常用的规则常量
export { SAVE_DATA_STRUCTURE as DATA_STRUCTURE_DEFINITIONS };
export { PLAYER_INTENT_AND_JUDGMENT_RULES } from './definitions/businessRules';

/**
 * 组装最终的系统Prompt
 * @param activePrompts - 一个包含了当前需要激活的prompt模块名称的数组
 * @returns {string} - 拼接好的完整prompt字符串
 */
export function assembleSystemPrompt(activePrompts: string[]): string {
  const promptSections = [
    FORBIDDEN_WORDS_RULES,
    Object.values(coreRules).join('\n\n'),
    Object.values(businessRules).join('\n\n'),
    SAVE_DATA_STRUCTURE,
    DATA_STRUCTURE_EXAMPLES,
    Object.values(textFormats).join('\n\n'),
    Object.values(worldStandards).join('\n\n'),
  ];

  // 根据激活列表来添加可选模块
  if (activePrompts.includes('cot')) {
    promptSections.unshift(cotCorePrompt); // 将COT放在最前面
  }

  return promptSections.join('\n\n---\n\n');
}