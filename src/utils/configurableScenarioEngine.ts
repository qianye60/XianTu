/**
 * 场景识别配置系统
 * 让用户选择识别方式：AI识别、精准文字匹配、或混合模式
 */

import { PreciseMatchRules, ProgrammaticCalculationEngine } from './preciseTextMatching';
import { DualAISystem } from './dualAISystem';
import { LuckLevel } from './calculationSystem';
import type { RealmStage } from '../types/game';

// 用户配置选项
export interface ScenarioRecognitionConfig {
  recognitionMethod: 'ai_primary' | 'text_primary' | 'hybrid' | 'text_only';
  textMatchPrecision: 'strict' | 'moderate' | 'loose';
  enableProgrammaticCalculation: boolean;
  aiBackupEnabled: boolean;
  cacheResults: boolean;
  userPreferences: {
    preferSpeed: boolean;      // 优先速度还是准确性
    preferCost: boolean;       // 优先成本控制
    preferAccuracy: boolean;   // 优先准确性
  };
}

// 默认配置
export const DEFAULT_CONFIG: ScenarioRecognitionConfig = {
  recognitionMethod: 'hybrid',
  textMatchPrecision: 'moderate',
  enableProgrammaticCalculation: true,
  aiBackupEnabled: true,
  cacheResults: true,
  userPreferences: {
    preferSpeed: true,
    preferCost: false,
    preferAccuracy: false
  }
};

/**
 * 配置化场景识别引擎
 */
export class ConfigurableScenarioEngine {
  private config: ScenarioRecognitionConfig;
  private dualAI: DualAISystem;
  private cache: Map<string, any> = new Map();
  
  constructor(config: ScenarioRecognitionConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.dualAI = new DualAISystem();
  }
  
  /**
   * 主要处理方法 - 根据配置选择处理方式
   */
  async process(
    userInput: string,
    gameContext?: any,
    playerData?: {
      realm: number;
      stage: RealmStage;
      attributes: Record<string, number>;
      luck: LuckLevel;
    }
  ): Promise<{
    scenario: string;
    confidence: number;
    method: string;
    calculation?: any;
    finalContent: string;
    processingTime: number;
    costEstimate: number;
  }> {
    
    const startTime = Date.now();
    console.log(`🎯 开始处理: "${userInput}" (方式: ${this.config.recognitionMethod})`);
    
    // 检查缓存
    const cacheKey = this.generateCacheKey(userInput, gameContext, playerData);
    if (this.config.cacheResults && this.cache.has(cacheKey)) {
      console.log('📦 使用缓存结果');
      return this.cache.get(cacheKey);
    }
    
    let result;
    
    // 根据配置选择处理方式
    switch (this.config.recognitionMethod) {
      case 'text_only':
        result = await this.processTextOnly(userInput, gameContext, playerData);
        break;
      case 'text_primary':
        result = await this.processTextPrimary(userInput, gameContext, playerData);
        break;
      case 'ai_primary':
        result = await this.processAIPrimary(userInput, gameContext, playerData);
        break;
      case 'hybrid':
        result = await this.processHybrid(userInput, gameContext, playerData);
        break;
    }
    
    result.processingTime = Date.now() - startTime;
    
    // 缓存结果
    if (this.config.cacheResults) {
      this.cache.set(cacheKey, result);
    }
    
    console.log(`✅ 处理完成 (${result.processingTime}ms, 成本: ${result.costEstimate})`);
    return result;
  }
  
  /**
   * 纯文字匹配模式
   */
  private async processTextOnly(userInput: string, gameContext: any, playerData: any) {
    console.log('📝 使用纯文字匹配模式');
    
    const matchResult = PreciseMatchRules.match(
      userInput, 
      gameContext, 
      this.config.textMatchPrecision
    );
    
    if (!matchResult) {
      return {
        scenario: 'unknown',
        confidence: 0.1,
        method: 'text_fallback',
        finalContent: `无法识别"${userInput}"，请尝试更具体的描述。`,
        costEstimate: 0
      };
    }
    
    const { rule, score, reasoning } = matchResult;
    
    // 尝试程序化计算
    let calculation = null;
    if (this.config.enableProgrammaticCalculation && playerData) {
      const calcResult = ProgrammaticCalculationEngine.calculate(
        rule.scenario,
        userInput,
        playerData,
        gameContext
      );
      
      if (calcResult.canCalculate && calcResult.result) {
        calculation = calcResult.result;
      }
    }
    
    // 生成文字结果
    const finalContent = this.generateTextBasedContent(
      rule.scenario,
      userInput,
      calculation,
      reasoning
    );
    
    return {
      scenario: rule.scenario,
      confidence: score / 100,
      method: 'text_only',
      calculation,
      finalContent,
      costEstimate: 0
    };
  }
  
  /**
   * 文字优先模式（文字匹配失败时用AI）
   */
  private async processTextPrimary(userInput: string, gameContext: any, playerData: any) {
    console.log('📝➡️🤖 使用文字优先模式');
    
    // 先尝试文字匹配
    const matchResult = PreciseMatchRules.match(
      userInput, 
      gameContext, 
      this.config.textMatchPrecision
    );
    
    if (matchResult && matchResult.score >= 60) {
      console.log('✅ 文字匹配成功，使用文字结果');
      return this.processTextOnly(userInput, gameContext, playerData);
    }
    
    // 文字匹配失败，使用AI
    if (this.config.aiBackupEnabled) {
      console.log('🤖 文字匹配失败，启用AI备用');
      const aiResult = await this.dualAI.processComplete(userInput, gameContext, playerData);
      
      return {
        scenario: aiResult.assistantResult.scenario_type,
        confidence: aiResult.assistantResult.confidence,
        method: 'text_primary_ai_backup',
        finalContent: aiResult.finalContent,
        costEstimate: this.estimateAICost(aiResult.finalContent)
      };
    }
    
    // 都失败了
    return {
      scenario: 'unknown',
      confidence: 0.2,
      method: 'text_primary_failed',
      finalContent: `识别失败：${userInput}。建议启用AI备用或使用更明确的指令。`,
      costEstimate: 0
    };
  }
  
  /**
   * AI优先模式（AI失败时用文字）
   */
  private async processAIPrimary(userInput: string, gameContext: any, playerData: any) {
    console.log('🤖➡️📝 使用AI优先模式');
    
    try {
      // 先尝试AI处理
      const aiResult = await this.dualAI.processComplete(userInput, gameContext, playerData);
      
      if (aiResult.assistantResult.confidence >= 0.6) {
        console.log('✅ AI处理成功');
        return {
          scenario: aiResult.assistantResult.scenario_type,
          confidence: aiResult.assistantResult.confidence,
          method: 'ai_primary',
          finalContent: aiResult.finalContent,
          costEstimate: this.estimateAICost(aiResult.finalContent)
        };
      }
    } catch (error) {
      console.warn('🤖 AI处理失败:', error);
    }
    
    // AI失败，使用文字匹配
    console.log('📝 AI失败，启用文字备用');
    const textResult = await this.processTextOnly(userInput, gameContext, playerData);
    textResult.method = 'ai_primary_text_backup';
    
    return textResult;
  }
  
  /**
   * 混合模式（AI和文字结合）
   */
  private async processHybrid(userInput: string, gameContext: any, playerData: any) {
    console.log('🔄 使用混合模式');
    
    // 并行执行文字匹配和AI识别
    const [textResult, aiPromise] = await Promise.allSettled([
      // 文字匹配（快速）
      Promise.resolve(PreciseMatchRules.match(
        userInput, 
        gameContext, 
        this.config.textMatchPrecision
      )),
      // AI识别（较慢）
      this.dualAI.assistantAIProcess({
        type: 'scenario_recognition',
        userInput,
        gameContext,
        playerData
      })
    ]);
    
    // 分析结果
    const textMatch = textResult.status === 'fulfilled' ? textResult.value : null;
    const aiResult = aiPromise.status === 'fulfilled' ? aiPromise.value : null;
    
    // 决定使用哪个结果
    let finalScenario: string;
    let finalConfidence: number;
    let finalMethod: string;
    let calculation: any = null;
    
    if (textMatch && textMatch.score >= 70) {
      // 文字匹配很确定
      finalScenario = textMatch.rule.scenario;
      finalConfidence = textMatch.score / 100;
      finalMethod = 'hybrid_text_dominant';
      
      // 尝试程序化计算
      if (this.config.enableProgrammaticCalculation && playerData) {
        const calcResult = ProgrammaticCalculationEngine.calculate(
          finalScenario,
          userInput,
          playerData,
          gameContext
        );
        if (calcResult.canCalculate) {
          calculation = calcResult.result;
        }
      }
      
    } else if (aiResult && aiResult.confidence >= 0.7) {
      // AI识别很确定
      finalScenario = aiResult.scenario_type;
      finalConfidence = aiResult.confidence;
      finalMethod = 'hybrid_ai_dominant';
      
    } else if (textMatch && aiResult) {
      // 两者都不太确定，综合判断
      if (textMatch.score / 100 > aiResult.confidence) {
        finalScenario = textMatch.rule.scenario;
        finalConfidence = textMatch.score / 100;
        finalMethod = 'hybrid_text_preferred';
      } else {
        finalScenario = aiResult.scenario_type;
        finalConfidence = aiResult.confidence;
        finalMethod = 'hybrid_ai_preferred';
      }
      
    } else {
      // 都失败了
      finalScenario = 'exploration';
      finalConfidence = 0.3;
      finalMethod = 'hybrid_fallback';
    }
    
    // 生成最终内容
    let finalContent: string;
    if (finalMethod.includes('ai') && aiResult) {
      // 使用AI生成内容
      finalContent = await this.dualAI.mainAIProcess(aiResult, userInput, playerData);
    } else {
      // 使用程序生成内容
      finalContent = this.generateTextBasedContent(
        finalScenario,
        userInput,
        calculation,
        textMatch?.reasoning || []
      );
    }
    
    return {
      scenario: finalScenario,
      confidence: finalConfidence,
      method: finalMethod,
      calculation,
      finalContent,
      costEstimate: finalMethod.includes('ai') ? this.estimateAICost(finalContent) : 0
    };
  }
  
  /**
   * 生成基于文字匹配的内容
   */
  private generateTextBasedContent(
    scenario: string,
    userInput: string,
    calculation: any,
    reasoning: string[]
  ): string {
    
    let content = `你决定${userInput}。\n\n`;
    
    if (calculation) {
      if (calculation.successRate) {
        content += `基于当前评估，成功率约为 ${calculation.successRate.toFixed(1)}%（${calculation.difficulty}）。\n`;
      }
      if (calculation.effectValue) {
        content += `预期效果值：${calculation.effectValue.toFixed(1)}。\n`;
      }
      
      if (calculation.factors) {
        content += `\n影响因素：\n`;
        Object.entries(calculation.factors).forEach(([key, value]: [string, any]) => {
          if (value !== 0) {
            content += `- ${key}: ${value > 0 ? '+' : ''}${value}\n`;
          }
        });
      }
    }
    
    // 添加场景特定描述
    content += '\n' + this.getScenarioDescription(scenario);
    
    if (reasoning.length > 0) {
      content += `\n\n（识别依据：${reasoning.join('，')}）`;
    }
    
    return content;
  }
  
  /**
   * 获取场景描述
   */
  private getScenarioDescription(scenario: string): string {
    const descriptions = {
      'combat': '你进入战斗状态，准备迎接挑战...',
      'breakthrough': '你开始尝试突破更高境界，内心既兴奋又紧张...',
      'cultivation': '你静心凝神，开始修炼功法，感受灵气的流动...',
      'alchemy': '你点燃丹炉，开始炼制丹药，控制着火候和药材的融合...',
      'crafting': '你开始锻造器物，每一锤都凝聚着你的心血...',
      'social': '你鼓起勇气，准备进行这次重要的交流...',
      'exploration': '你踏出脚步，开始探索未知的领域...',
      'formation_breaking': '你仔细观察阵法的纹路，寻找破解的关键...',
      'pill_consumption': '你小心翼翼地服下丹药，感受药力在体内流转...'
    };
    
    return descriptions[scenario as keyof typeof descriptions] || '你开始了新的行动...';
  }
  
  /**
   * 估算AI成本
   */
  private estimateAICost(content: string): number {
    // 简化的成本估算（基于内容长度）
    const tokens = content.length / 3; // 粗略估算
    return tokens * 0.001; // 假设每千tokens 0.001元
  }
  
  /**
   * 生成缓存键
   */
  private generateCacheKey(userInput: string, gameContext: any, playerData: any): string {
    return `${userInput}_${JSON.stringify(gameContext)}_${JSON.stringify(playerData)}`;
  }
  
  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ScenarioRecognitionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ 配置已更新:', this.config);
  }
  
  /**
   * 获取当前配置
   */
  getConfig(): ScenarioRecognitionConfig {
    return { ...this.config };
  }
  
  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ 缓存已清理');
  }
  
  /**
   * 获取性能统计
   */
  getStats(): {
    cacheHitRate: number;
    totalRequests: number;
    averageProcessingTime: number;
  } {
    // 这里应该实现真正的统计逻辑
    return {
      cacheHitRate: 0.15,
      totalRequests: 100,
      averageProcessingTime: 1500
    };
  }
}

/**
 * 配置推荐器
 */
export class ConfigurationRecommender {
  
  /**
   * 根据用户偏好推荐配置
   */
  static recommend(userNeeds: {
    prioritizeSpeed?: boolean;
    prioritizeCost?: boolean;
    prioritizeAccuracy?: boolean;
    hasAIAccess?: boolean;
    gameComplexity?: 'simple' | 'moderate' | 'complex';
  }): ScenarioRecognitionConfig {
    
    const config = { ...DEFAULT_CONFIG };
    
    if (userNeeds.prioritizeSpeed) {
      config.recognitionMethod = 'text_primary';
      config.textMatchPrecision = 'loose';
      config.cacheResults = true;
      config.userPreferences.preferSpeed = true;
    }
    
    if (userNeeds.prioritizeCost) {
      config.recognitionMethod = userNeeds.hasAIAccess ? 'text_primary' : 'text_only';
      config.aiBackupEnabled = false;
      config.userPreferences.preferCost = true;
    }
    
    if (userNeeds.prioritizeAccuracy) {
      config.recognitionMethod = userNeeds.hasAIAccess ? 'hybrid' : 'text_only';
      config.textMatchPrecision = 'strict';
      config.aiBackupEnabled = true;
      config.userPreferences.preferAccuracy = true;
    }
    
    if (userNeeds.gameComplexity === 'complex') {
      config.recognitionMethod = 'ai_primary';
      config.enableProgrammaticCalculation = true;
    }
    
    return config;
  }
  
  /**
   * 配置说明
   */
  static explainConfig(config: ScenarioRecognitionConfig): string {
    let explanation = '当前配置说明：\n\n';
    
    switch (config.recognitionMethod) {
      case 'text_only':
        explanation += '🔤 仅使用文字匹配 - 速度最快，成本最低，但准确性有限\n';
        break;
      case 'text_primary':
        explanation += '🔤➡️🤖 文字优先 - 优先文字匹配，失败时使用AI备用\n';
        break;
      case 'ai_primary':
        explanation += '🤖➡️🔤 AI优先 - 优先AI识别，失败时使用文字备用\n';
        break;
      case 'hybrid':
        explanation += '🔄 混合模式 - AI和文字结合，准确性最高\n';
        break;
    }
    
    explanation += `📐 文字匹配精度：${config.textMatchPrecision}（严格/中等/宽松）\n`;
    explanation += `⚙️ 程序化计算：${config.enableProgrammaticCalculation ? '启用' : '禁用'}\n`;
    explanation += `🔄 AI备用：${config.aiBackupEnabled ? '启用' : '禁用'}\n`;
    explanation += `📦 结果缓存：${config.cacheResults ? '启用' : '禁用'}\n`;
    
    return explanation;
  }
}

// 便捷使用函数
export async function processUserAction(
  userInput: string,
  config?: Partial<ScenarioRecognitionConfig>,
  gameContext?: any,
  playerData?: any
): Promise<string> {
  
  const engine = new ConfigurableScenarioEngine(
    config ? { ...DEFAULT_CONFIG, ...config } : DEFAULT_CONFIG
  );
  
  const result = await engine.process(userInput, gameContext, playerData);
  return result.finalContent;
}

export { ConfigurableScenarioEngine, ConfigurationRecommender };