/**
 * @fileoverview tavernAI 主入口文件
 * 统一导出所有AI生成相关的功能
 */

// 重新导出核心功能
export { getTavernHelper, diagnoseAIResponse, generateItemWithTavernAI } from './tavernCore';

// 重新导出游戏元素生成器
export { 
  generateWorld, 
  generateTalentTier, 
  generateOrigin, 
  generateSpiritRoot, 
  generateTalent, 
  generateMapFromWorld,
  // 带提示词的生成函数
  generateWorldWithPrompt,
  generateTalentTierWithPrompt,
  generateOriginWithPrompt,
  generateSpiritRootWithPrompt,
  generateTalentWithPrompt
} from './generators/gameElementGenerators';

// 重新导出游戏大师生成器
export { generateInitialMessage } from './generators/gameMasterGenerators';

// 重新导出提示词（供其他模块使用）
// export * from './prompts/variableOperationRules'; // 已移至酒馆预设
export * from './prompts/dataStructureDefinitions';