/**
 * AI计算接口系统
 * 连接程序化计算结果与AI生成的描述性内容
 */

import type { CalculationResult, LuckLevel } from './calculationSystem';
import type { RealmStage } from '../types/game';
import { 
  calculateBreakthroughChance,
  calculateResourceGain,
  calculateCombatPower,
  calculateLifespan,
  getLuckDescription,
  generateRandomLuck
} from './calculationSystem';

// AI生成内容的类型定义
export interface AIGeneratedContent {
  title?: string;           // 事件标题
  description: string;      // 主要描述
  effects?: string[];       // 效果列表
  flavorText?: string;      // 风味文本
  consequences?: string[];  // 后续影响
}

// 完整的计算+AI结果
export interface EnhancedCalculationResult extends CalculationResult {
  aiContent?: AIGeneratedContent;
  calculationType: string;
  timestamp: number;
}

// AI提示词模板类型
export interface PromptTemplate {
  systemPrompt: string;
  userPrompt: string;
  parameters: Record<string, any>;
}

/**
 * 计算结果与AI内容整合器
 */
export class CalculationAIInterface {
  
  /**
   * 突破计算+AI描述生成
   */
  static async processBreakthrough(
    currentRealm: number,
    currentStage: RealmStage,
    luck: LuckLevel,
    preparationBonus: number = 0
  ): Promise<EnhancedCalculationResult> {
    
    // 执行数值计算
    const calculation = calculateBreakthroughChance(currentRealm, currentStage, luck, preparationBonus);
    
    // 构建AI提示词
    const prompt = this.buildBreakthroughPrompt(calculation, currentRealm, currentStage, luck);
    
    return {
      ...calculation,
      calculationType: 'breakthrough',
      timestamp: Date.now(),
      // AI内容将由外部AI服务填充
      aiContent: {
        description: `突破成功率: ${calculation.finalValue.toFixed(1)}%`,
        effects: this.buildCalculationBreakdown(calculation)
      }
    };
  }

  /**
   * 修炼资源计算+AI描述生成
   */
  static async processCultivation(
    baseAmount: number,
    realmLevel: number,
    stage: RealmStage,
    luck: LuckLevel,
    timeSpent: number = 1
  ): Promise<EnhancedCalculationResult> {
    
    const calculation = calculateResourceGain(baseAmount, realmLevel, stage, luck, timeSpent);
    
    return {
      ...calculation,
      calculationType: 'cultivation',
      timestamp: Date.now(),
      aiContent: {
        description: `修炼${timeSpent}小时，获得${Math.round(calculation.finalValue)}点修为`,
        effects: this.buildCalculationBreakdown(calculation)
      }
    };
  }

  /**
   * 战斗力计算+AI描述生成
   */
  static async processCombatEvaluation(
    realmLevel: number,
    stage: RealmStage,
    talentBonus: number = 0,
    equipmentBonus: number = 0,
    luck: LuckLevel = generateRandomLuck()
  ): Promise<EnhancedCalculationResult> {
    
    const calculation = calculateCombatPower(realmLevel, stage, talentBonus, equipmentBonus, luck);
    
    return {
      ...calculation,
      calculationType: 'combat_power',
      timestamp: Date.now(),
      aiContent: {
        description: `当前战斗力: ${calculation.finalValue}`,
        effects: this.buildCalculationBreakdown(calculation)
      }
    };
  }

  /**
   * 构建突破提示词
   */
  private static buildBreakthroughPrompt(
    calculation: CalculationResult,
    realmLevel: number,
    stage: RealmStage,
    luck: LuckLevel
  ): PromptTemplate {
    
    const systemPrompt = `你是一个修真世界的叙述者。根据提供的数值计算结果，生成生动的突破过程描述。
    
重要要求：
1. 数值计算已完成，你只需要添加文字描述和氛围渲染
2. 不要修改任何数值，专注于描述过程和感受
3. 根据成功率高低调整描述的紧张程度
4. 根据气运等级添加相应的氛围描述
5. 如果有暴击成功/失败，要重点描述异常事件`;

    const userPrompt = `境界突破详情：
当前境界: ${realmLevel}级${stage}
突破成功率: ${calculation.finalValue.toFixed(1)}%
气运状态: ${getLuckDescription(luck)}
计算详情: 基础${calculation.baseValue.toFixed(1)}% + 气运修正${calculation.modifiers.luck.toFixed(1)}% + 随机因素${calculation.modifiers.random.toFixed(1)}%
${calculation.criticalSuccess ? '触发暴击成功！' : ''}
${calculation.criticalFailure ? '触发暴击失败！' : ''}

请生成突破过程的详细描述，包括：
1. 突破前的准备和心境
2. 突破过程中的感受和变化  
3. 根据成功率描述紧张程度
4. 气运对过程的影响`;

    return {
      systemPrompt,
      userPrompt,
      parameters: {
        realmLevel,
        stage,
        luck,
        successRate: calculation.finalValue,
        criticalSuccess: calculation.criticalSuccess,
        criticalFailure: calculation.criticalFailure
      }
    };
  }

  /**
   * 构建计算明细
   */
  private static buildCalculationBreakdown(calculation: CalculationResult): string[] {
    const breakdown: string[] = [];
    
    breakdown.push(`基础值: ${calculation.baseValue.toFixed(1)}`);
    
    if (calculation.modifiers.luck !== 0) {
      breakdown.push(`气运修正: ${calculation.modifiers.luck > 0 ? '+' : ''}${calculation.modifiers.luck.toFixed(1)}`);
    }
    
    if (calculation.modifiers.random !== 0) {
      breakdown.push(`随机因素: ${calculation.modifiers.random > 0 ? '+' : ''}${calculation.modifiers.random.toFixed(1)}`);
    }
    
    if (calculation.modifiers.realm !== 0) {
      breakdown.push(`境界加成: ${calculation.modifiers.realm > 0 ? '+' : ''}${calculation.modifiers.realm.toFixed(1)}`);
    }
    
    if (calculation.modifiers.special !== 0) {
      breakdown.push(`特殊效果: ${calculation.modifiers.special > 0 ? '+' : ''}${calculation.modifiers.special.toFixed(1)}`);
    }
    
    breakdown.push(`最终结果: ${calculation.finalValue.toFixed(1)}`);
    
    return breakdown;
  }

  /**
   * 生成通用计算提示词
   */
  static buildCalculationPrompt(
    calculationType: string,
    calculation: CalculationResult,
    context: Record<string, any>
  ): PromptTemplate {
    
    const systemPrompt = `你是修真世界的叙述AI。你的任务是为程序化计算结果添加生动的文字描述。

核心原则：
1. 程序已完成所有数值计算，你只负责文字增幅和氛围渲染
2. 绝对不要修改、重新计算或质疑任何数值
3. 专注于描述过程、感受、环境变化和后续影响
4. 根据结果的好坏调整描述的积极/消极倾向
5. 适当加入修真世界的专业术语和氛围`;

    const userPrompt = `计算类型: ${calculationType}
计算结果: ${JSON.stringify(calculation, null, 2)}
上下文信息: ${JSON.stringify(context, null, 2)}

请为这个计算结果生成：
1. 主要描述 (2-3句话概括结果)
2. 过程描述 (详细的进行过程)
3. 效果列表 (具体的影响和变化)
4. 后续影响 (可能的长期效果)

注意：只做文字增幅，不要改动任何数值！`;

    return {
      systemPrompt,
      userPrompt,
      parameters: {
        calculationType,
        calculation,
        context
      }
    };
  }

  /**
   * 格式化计算结果供显示
   */
  static formatCalculationResult(result: EnhancedCalculationResult): string {
    let output = `【${result.calculationType}计算结果】\n`;
    output += `最终数值: ${result.finalValue.toFixed(1)}\n`;
    output += `计算明细:\n`;
    
    const breakdown = this.buildCalculationBreakdown(result);
    breakdown.forEach(line => {
      output += `  ${line}\n`;
    });
    
    if (result.criticalSuccess) {
      output += `✨ 暴击成功！\n`;
    }
    
    if (result.criticalFailure) {
      output += `💥 暴击失败！\n`;
    }
    
    if (result.aiContent?.description) {
      output += `\n${result.aiContent.description}`;
    }
    
    return output;
  }

  /**
   * 批量处理多个计算
   */
  static async batchProcess(
    calculations: Array<{
      type: string;
      params: any[];
      context?: Record<string, any>;
    }>
  ): Promise<EnhancedCalculationResult[]> {
    
    const results: EnhancedCalculationResult[] = [];
    
    for (const calc of calculations) {
      let result: EnhancedCalculationResult;
      
      switch (calc.type) {
        case 'breakthrough':
          result = await this.processBreakthrough(calc.params[0], calc.params[1], calc.params[2], calc.params[3]);
          break;
        case 'cultivation':
          result = await this.processCultivation(calc.params[0], calc.params[1], calc.params[2], calc.params[3], calc.params[4]);
          break;
        case 'combat_power':
          result = await this.processCombatEvaluation(calc.params[0], calc.params[1], calc.params[2], calc.params[3], calc.params[4]);
          break;
        default:
          throw new Error(`未知的计算类型: ${calc.type}`);
      }
      
      results.push(result);
    }
    
    return results;
  }
}

/**
 * 快捷调用函数 - 突破计算
 */
export async function processBreakthroughWithAI(
  currentRealm: number,
  currentStage: RealmStage,
  luck?: LuckLevel,
  preparationBonus: number = 0
): Promise<EnhancedCalculationResult> {
  const finalLuck = luck ?? generateRandomLuck();
  return CalculationAIInterface.processBreakthrough(currentRealm, currentStage, finalLuck, preparationBonus);
}

/**
 * 快捷调用函数 - 修炼计算
 */
export async function processCultivationWithAI(
  baseAmount: number,
  realmLevel: number,
  stage: RealmStage,
  timeSpent: number = 1,
  luck?: LuckLevel
): Promise<EnhancedCalculationResult> {
  const finalLuck = luck ?? generateRandomLuck();
  return CalculationAIInterface.processCultivation(baseAmount, realmLevel, stage, finalLuck, timeSpent);
}

/**
 * 快捷调用函数 - 战斗力评估
 */
export async function processCombatWithAI(
  realmLevel: number,
  stage: RealmStage,
  talentBonus: number = 0,
  equipmentBonus: number = 0,
  luck?: LuckLevel
): Promise<EnhancedCalculationResult> {
  const finalLuck = luck ?? generateRandomLuck();
  return CalculationAIInterface.processCombatEvaluation(realmLevel, stage, talentBonus, equipmentBonus, finalLuck);
}

