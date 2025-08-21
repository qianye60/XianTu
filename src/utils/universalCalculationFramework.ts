/**
 * 通用计算框架
 * 智能分流：程序计算 vs AI判断
 * 解决不同场景计算需求差异巨大的问题
 */

import type { RealmStage } from '../types/game';
import { LuckLevel, generateRandomLuck, getLuckDescription } from './calculationSystem';

// 场景类型枚举
export enum ScenarioType {
  // 程序密集计算型（数值复杂，需要精确计算）
  COMBAT = 'combat',                    // 战斗
  BREAKTHROUGH = 'breakthrough',        // 突破
  CULTIVATION = 'cultivation',          // 修炼
  ALCHEMY = 'alchemy',                 // 炼丹
  CRAFTING = 'crafting',               // 炼器
  FORMATION_BREAKING = 'formation_breaking', // 破阵
  
  // AI判断型（描述复杂，逻辑模糊）
  SOCIAL = 'social',                   // 社交（谈恋爱、勾引）
  EXPLORATION = 'exploration',         // 探索
  NEGOTIATION = 'negotiation',         // 谈判
  MYSTERY = 'mystery',                 // 解谜
  STORY_CHOICE = 'story_choice',       // 剧情选择
  
  // 混合型（程序提供基础，AI做调整）
  PILL_ABSORPTION = 'pill_absorption', // 吸收丹药
  BEAST_TAMING = 'beast_taming',       // 驯兽
  TREASURE_APPRAISAL = 'treasure_appraisal', // 鉴宝
  TEACHING = 'teaching',               // 传授功法
  COMPREHENSION = 'comprehension'      // 感悟参透
}

// 影响因子类型
export interface InfluenceFactor {
  type: 'attribute' | 'equipment' | 'talent' | 'environment' | 'relationship' | 'mood' | 'special';
  name: string;
  description: string;
  numericValue?: number;  // 如果有数值
  textEffect: string;     // 文字描述效果
  importance: 'critical' | 'major' | 'minor'; // 重要程度
}

// 基础计算参数
export interface BaseCalculationParams {
  playerLevel: number;
  playerStage: RealmStage;
  primaryAttribute: number;    // 主要相关属性（如智力、体质、魅力等）
  secondaryAttribute?: number; // 次要属性
  luck: LuckLevel;
  difficulty: number;          // 基础难度 (1-10)
  influenceFactors: InfluenceFactor[];
}

// 计算结果
export interface UniversalCalculationResult {
  scenarioType: ScenarioType;
  calculationMethod: 'programmatic' | 'ai_judgment' | 'hybrid';
  
  // 程序计算部分
  baseSuccessRate?: number;
  baseEffectValue?: number;
  calculationBreakdown?: Record<string, number>;
  
  // AI需要的信息
  aiContext: {
    scenario: string;
    playerContext: string;
    influenceFactors: InfluenceFactor[];
    gameParameters: Record<string, any>;
    suggestedOutcomes?: string[];
  };
  
  // 结果提示
  recommendedApproach: string;
  timestamp: number;
}

/**
 * 通用计算框架核心类
 */
export class UniversalCalculationFramework {
  
  /**
   * 智能路由 - 根据场景类型决定计算方式
   */
  static async processScenario(
    scenarioType: ScenarioType,
    scenarioDescription: string,
    params: BaseCalculationParams
  ): Promise<UniversalCalculationResult> {
    
    const calculationMethod = this.determineCalculationMethod(scenarioType);
    
    switch (calculationMethod) {
      case 'programmatic':
        return this.programmaticCalculation(scenarioType, scenarioDescription, params);
      
      case 'ai_judgment':
        return this.aiJudgmentCalculation(scenarioType, scenarioDescription, params);
      
      case 'hybrid':
        return this.hybridCalculation(scenarioType, scenarioDescription, params);
      
      default:
        throw new Error(`未知的计算方法: ${calculationMethod}`);
    }
  }
  
  /**
   * 决定计算方法
   */
  private static determineCalculationMethod(scenarioType: ScenarioType): 'programmatic' | 'ai_judgment' | 'hybrid' {
    // 纯程序计算：只有数值密集且逻辑简单的场景
    const programmaticTypes = [
      ScenarioType.BREAKTHROUGH,   // 突破成功率相对标准化
      ScenarioType.CULTIVATION     // 修炼收益可以标准化计算
    ];
    
    // 纯AI判断：完全依赖描述和逻辑的场景
    const aiJudgmentTypes = [
      ScenarioType.SOCIAL,         // 谈恋爱、勾引等完全看情况
      ScenarioType.EXPLORATION,    // 探索结果很随机
      ScenarioType.NEGOTIATION,    // 谈判完全看话术和关系
      ScenarioType.MYSTERY,        // 解谜看智慧和线索
      ScenarioType.STORY_CHOICE    // 剧情选择看玩家意图
    ];
    
    // 混合计算：需要基础数值 + 复杂描述判断
    // 包括：战斗、炼丹、炼器、破阵、吸收丹药、驯兽等
    
    if (programmaticTypes.includes(scenarioType)) {
      return 'programmatic';
    } else if (aiJudgmentTypes.includes(scenarioType)) {
      return 'ai_judgment';
    } else {
      return 'hybrid';  // 大部分场景都是混合型！
    }
  }
  
  /**
   * 程序化精确计算（用于数值密集场景）
   */
  private static async programmaticCalculation(
    scenarioType: ScenarioType,
    scenarioDescription: string,
    params: BaseCalculationParams
  ): Promise<UniversalCalculationResult> {
    
    // 基础成功率计算
    let baseSuccessRate = this.calculateBaseSuccessRate(params);
    
    // 属性修正
    const attributeModifier = this.calculateAttributeModifier(params.primaryAttribute, params.secondaryAttribute);
    baseSuccessRate += attributeModifier;
    
    // 气运修正
    const luckModifier = params.luck * 8; // 每级气运±8%
    baseSuccessRate += luckModifier;
    
    // 影响因子数值修正（只计算有明确数值的因子）
    const factorModifier = this.calculateNumericFactorModifier(params.influenceFactors);
    baseSuccessRate += factorModifier;
    
    // 随机因素
    const randomModifier = (Math.random() - 0.5) * 20; // ±10%
    baseSuccessRate += randomModifier;
    
    // 限制在合理范围内
    const finalSuccessRate = Math.max(1, Math.min(99, baseSuccessRate));
    
    return {
      scenarioType,
      calculationMethod: 'programmatic',
      baseSuccessRate: finalSuccessRate,
      calculationBreakdown: {
        base: baseSuccessRate - attributeModifier - luckModifier - factorModifier - randomModifier,
        attribute: attributeModifier,
        luck: luckModifier,
        factors: factorModifier,
        random: randomModifier
      },
      aiContext: {
        scenario: scenarioDescription,
        playerContext: this.buildPlayerContext(params),
        influenceFactors: params.influenceFactors,
        gameParameters: { 
          successRate: finalSuccessRate,
          calculationType: 'programmatic'
        },
        suggestedOutcomes: this.generateProgrammaticOutcomes(finalSuccessRate)
      },
      recommendedApproach: `程序计算成功率: ${finalSuccessRate.toFixed(1)}%。AI请根据此数值和影响因子生成具体结果描述。`,
      timestamp: Date.now()
    };
  }
  
  /**
   * AI判断计算（用于描述密集场景）
   */
  private static async aiJudgmentCalculation(
    scenarioType: ScenarioType,
    scenarioDescription: string,
    params: BaseCalculationParams
  ): Promise<UniversalCalculationResult> {
    
    // 只提供基础参考信息，不做具体计算
    const difficultyHint = this.getDifficultyHint(params.difficulty);
    const attributeHint = this.getAttributeHint(params.primaryAttribute);
    const luckHint = getLuckDescription(params.luck);
    
    return {
      scenarioType,
      calculationMethod: 'ai_judgment',
      aiContext: {
        scenario: scenarioDescription,
        playerContext: this.buildPlayerContext(params),
        influenceFactors: params.influenceFactors,
        gameParameters: {
          difficultyHint,
          attributeHint,
          luckHint,
          calculationType: 'ai_judgment'
        },
        suggestedOutcomes: this.generateAIJudgmentOutcomes(scenarioType)
      },
      recommendedApproach: `完全交给AI判断。基础信息：难度${difficultyHint}，属性${attributeHint}，气运${luckHint}。AI请综合所有因素自主决定结果。`,
      timestamp: Date.now()
    };
  }
  
  /**
   * 混合计算（程序提供基础，AI做调整）
   */
  private static async hybridCalculation(
    scenarioType: ScenarioType,
    scenarioDescription: string,
    params: BaseCalculationParams
  ): Promise<UniversalCalculationResult> {
    
    // 程序计算基础值
    let baseValue = this.calculateBaseEffectValue(params);
    
    // 简单的数值修正
    const attributeModifier = params.primaryAttribute * 0.1;
    const luckModifier = params.luck * 5;
    
    baseValue += attributeModifier + luckModifier;
    
    return {
      scenarioType,
      calculationMethod: 'hybrid',
      baseEffectValue: baseValue,
      calculationBreakdown: {
        base: baseValue - attributeModifier - luckModifier,
        attribute: attributeModifier,
        luck: luckModifier
      },
      aiContext: {
        scenario: scenarioDescription,
        playerContext: this.buildPlayerContext(params),
        influenceFactors: params.influenceFactors,
        gameParameters: {
          baseValue,
          calculationType: 'hybrid'
        },
        suggestedOutcomes: this.generateHybridOutcomes(baseValue)
      },
      recommendedApproach: `程序提供基础值: ${baseValue.toFixed(1)}。AI请根据影响因子（特别是文字描述效果）对此值进行调整，并生成最终结果。`,
      timestamp: Date.now()
    };
  }
  
  /**
   * 计算基础成功率
   */
  private static calculateBaseSuccessRate(params: BaseCalculationParams): number {
    // 境界影响基础成功率
    const realmBonus = params.playerLevel * 5;
    
    // 难度影响
    const difficultyPenalty = params.difficulty * 5;
    
    // 基础50%，受境界和难度影响
    return 50 + realmBonus - difficultyPenalty;
  }
  
  /**
   * 计算属性修正
   */
  private static calculateAttributeModifier(primary: number, secondary?: number): number {
    let modifier = (primary - 50) * 0.3; // 50为基准值
    
    if (secondary) {
      modifier += (secondary - 50) * 0.1;
    }
    
    return modifier;
  }
  
  /**
   * 计算影响因子数值修正
   */
  private static calculateNumericFactorModifier(factors: InfluenceFactor[]): number {
    let total = 0;
    
    factors.forEach(factor => {
      if (factor.numericValue) {
        let weight = 1;
        switch (factor.importance) {
          case 'critical': weight = 2; break;
          case 'major': weight = 1.5; break;
          case 'minor': weight = 0.5; break;
        }
        total += factor.numericValue * weight;
      }
    });
    
    return total;
  }
  
  /**
   * 计算基础效果值（用于混合计算）
   */
  private static calculateBaseEffectValue(params: BaseCalculationParams): number {
    return params.primaryAttribute + params.playerLevel * 10 + (params.secondaryAttribute || 0) * 0.5;
  }
  
  /**
   * 构建玩家上下文信息
   */
  private static buildPlayerContext(params: BaseCalculationParams): string {
    return `境界: ${params.playerLevel}级${params.playerStage} | 主属性: ${params.primaryAttribute} | 气运: ${getLuckDescription(params.luck)}`;
  }
  
  /**
   * 获取难度提示
   */
  private static getDifficultyHint(difficulty: number): string {
    if (difficulty <= 2) return '极易';
    if (difficulty <= 4) return '简单';
    if (difficulty <= 6) return '普通';
    if (difficulty <= 8) return '困难';
    return '极难';
  }
  
  /**
   * 获取属性提示
   */
  private static getAttributeHint(attribute: number): string {
    if (attribute >= 90) return '卓越';
    if (attribute >= 70) return '优秀';
    if (attribute >= 50) return '普通';
    if (attribute >= 30) return '较差';
    return '糟糕';
  }
  
  /**
   * 生成程序化计算的建议结果
   */
  private static generateProgrammaticOutcomes(successRate: number): string[] {
    if (successRate >= 80) {
      return ['大成功', '成功', '小成功'];
    } else if (successRate >= 50) {
      return ['成功', '勉强成功', '失败'];
    } else {
      return ['失败', '大失败', '勉强成功'];
    }
  }
  
  /**
   * 生成AI判断的建议结果
   */
  private static generateAIJudgmentOutcomes(scenarioType: ScenarioType): string[] {
    switch (scenarioType) {
      case ScenarioType.SOCIAL:
        return ['魅力四射，大获成功', '顺利达成目标', '略有进展', '碰壁', '场面尴尬'];
      case ScenarioType.EXPLORATION:
        return ['重大发现', '有所收获', '平淡无奇', '遇到危险', '迷失方向'];
      default:
        return ['大成功', '成功', '普通结果', '失败', '意外发展'];
    }
  }
  
  /**
   * 生成混合计算的建议结果
   */
  private static generateHybridOutcomes(baseValue: number): string[] {
    const effectiveness = baseValue > 100 ? '效果显著' : baseValue > 50 ? '效果一般' : '效果微弱';
    return [
      `${effectiveness}，额外收益`,
      `${effectiveness}，正常结果`,
      `${effectiveness}，略有瑕疵`,
      `效果低于预期`,
      `意想不到的变化`
    ];
  }
}

/**
 * 影响因子构建器
 */
export class InfluenceFactorBuilder {
  private factors: InfluenceFactor[] = [];
  
  addEquipment(name: string, description: string, numericValue?: number, importance: 'critical' | 'major' | 'minor' = 'major'): this {
    this.factors.push({
      type: 'equipment',
      name,
      description,
      numericValue,
      textEffect: description,
      importance
    });
    return this;
  }
  
  addTalent(name: string, description: string, numericValue?: number, importance: 'critical' | 'major' | 'minor' = 'major'): this {
    this.factors.push({
      type: 'talent',
      name,
      description,
      numericValue,
      textEffect: description,
      importance
    });
    return this;
  }
  
  addEnvironment(name: string, description: string, importance: 'critical' | 'major' | 'minor' = 'minor'): this {
    this.factors.push({
      type: 'environment',
      name,
      description,
      textEffect: description,
      importance
    });
    return this;
  }
  
  addRelationship(name: string, description: string, importance: 'critical' | 'major' | 'minor' = 'major'): this {
    this.factors.push({
      type: 'relationship',
      name,
      description,
      textEffect: description,
      importance
    });
    return this;
  }
  
  addSpecial(name: string, description: string, numericValue?: number, importance: 'critical' | 'major' | 'minor' = 'critical'): this {
    this.factors.push({
      type: 'special',
      name,
      description,
      numericValue,
      textEffect: description,
      importance
    });
    return this;
  }
  
  build(): InfluenceFactor[] {
    return [...this.factors];
  }
  
  clear(): this {
    this.factors = [];
    return this;
  }
}

// 导出便捷函数
export async function processGameScenario(
  scenarioType: ScenarioType,
  description: string,
  playerData: {
    level: number;
    stage: RealmStage;
    primaryAttr: number;
    secondaryAttr?: number;
    luck?: LuckLevel;
  },
  difficulty: number,
  factors: InfluenceFactor[]
): Promise<UniversalCalculationResult> {
  
  const params: BaseCalculationParams = {
    playerLevel: playerData.level,
    playerStage: playerData.stage,
    primaryAttribute: playerData.primaryAttr,
    secondaryAttribute: playerData.secondaryAttr,
    luck: playerData.luck || generateRandomLuck(),
    difficulty,
    influenceFactors: factors
  };
  
  return UniversalCalculationFramework.processScenario(scenarioType, description, params);
}