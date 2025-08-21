/**
 * 真实混合计算系统
 * 程序处理基础数值，AI处理所有文字描述和复杂逻辑
 */

import { LuckLevel } from './calculationSystem';
import type { RealmStage } from '../types/game';

// 玩家的完整信息（包含大量文字描述）
export interface PlayerFullInfo {
  // 基础数值（程序可处理）
  realm: number;
  stage: RealmStage;
  baseAttributes: {
    strength: number;
    intelligence: number; 
    charm: number;
    constitution: number;
  };
  luck: LuckLevel;
  
  // 文字描述（只能AI处理）
  talents: string[];          // ["天生剑体", "过目不忘", "废柴之躯"]
  currentState: string[];     // ["心境不宁", "走火入魔边缘", "顿悟状态"]
  equipment: string[];        // ["祖传玉佩（正在发热）", "破损飞剑"]
  relationships: string[];    // ["师父失望", "师妹关心", "仇家追杀"]
  environment: string[];      // ["灵气稀薄", "心魔频现", "天雷将至"]
  recentEvents: string[];     // ["刚刚失恋", "获得机缘", "师兄惨死"]
  
  // 混合信息（程序+AI共同处理）
  skills: Array<{
    name: string;
    level: number;
    description: string;
  }>;
}

// 计算请求
export interface CalculationRequest {
  action: string;
  player: PlayerFullInfo;
  targetInfo?: any;  // 目标信息（敌人、物品等）
  contextInfo?: any; // 场景上下文
}

// 混合计算结果
export interface HybridCalculationResult {
  // 程序计算部分
  programmaticPart: {
    baseSuccessRate?: number;
    baseEffectValue?: number;
    numericFactors: {
      realm: number;
      attributes: number;
      luck: number;
      skills: number;
    };
    calculation_confidence: number; // 程序计算的可信度
  };
  
  // 交给AI的信息包
  aiDecisionPart: {
    scenario: string;
    playerTextInfo: {
      talents: string[];
      currentState: string[];
      equipment: string[];
      relationships: string[];
      environment: string[];
      recentEvents: string[];
    };
    programmaticResults: any;
    decisionPrompt: string;
    expectedAITasks: string[];
  };
  
  processingMethod: 'light_program_heavy_ai' | 'balanced' | 'heavy_program_light_ai';
}

/**
 * 真实混合计算引擎
 */
export class RealHybridCalculationEngine {
  
  /**
   * 核心计算方法：程序算基础，AI处理复杂度
   */
  static async calculate(request: CalculationRequest): Promise<HybridCalculationResult> {
    
    console.log(`🔄 开始混合计算: ${request.action}`);
    
    // 第一步：程序计算能算的基础数值
    const programmaticResult = this.calculateProgrammaticPart(request);
    console.log(`📊 程序计算完成，基础成功率: ${programmaticResult.baseSuccessRate?.toFixed(1)}%`);
    
    // 第二步：整理所有文字信息交给AI
    const aiDecisionPart = this.prepareAIDecisionPart(request, programmaticResult);
    console.log(`🤖 准备AI决策包，包含${aiDecisionPart.playerTextInfo.talents.length}个天赋等复杂信息`);
    
    // 第三步：确定处理方式
    const processingMethod = this.determineProcessingMethod(request.action);
    
    return {
      programmaticPart: programmaticResult,
      aiDecisionPart,
      processingMethod
    };
  }
  
  /**
   * 程序计算部分：只处理明确的数值
   */
  private static calculateProgrammaticPart(request: CalculationRequest) {
    const { player } = request;
    
    // 境界基础值
    const realmFactor = player.realm * 10 + this.getStageMultiplier(player.stage);
    
    // 属性影响（根据行动类型选择主属性）
    const primaryAttr = this.selectPrimaryAttribute(request.action, player.baseAttributes);
    const attributeFactor = (primaryAttr - 50) * 0.5; // 50为基准
    
    // 气运数值影响
    const luckFactor = player.luck * 5;
    
    // 技能等级数值影响
    const skillFactor = this.calculateSkillFactor(request.action, player.skills);
    
    // 基础成功率计算（纯数值）
    const baseSuccessRate = Math.max(5, Math.min(95, 
      40 + realmFactor + attributeFactor + luckFactor + skillFactor
    ));
    
    // 计算置信度：程序能处理多少？
    const calculationConfidence = this.assessCalculationConfidence(player);
    
    return {
      baseSuccessRate,
      baseEffectValue: baseSuccessRate * 2, // 简单换算
      numericFactors: {
        realm: realmFactor,
        attributes: attributeFactor,
        luck: luckFactor,
        skills: skillFactor
      },
      calculation_confidence: calculationConfidence
    };
  }
  
  /**
   * 准备AI决策包：所有文字信息+程序结果
   */
  private static prepareAIDecisionPart(request: CalculationRequest, programmaticResult: any) {
    const { player, action } = request;
    
    // 构建给AI的决策提示
    const decisionPrompt = this.buildAIDecisionPrompt(action, programmaticResult);
    
    // AI需要处理的任务
    const expectedAITasks = this.getAITasks(action, programmaticResult.calculation_confidence);
    
    return {
      scenario: `${action}（在${player.environment.join('、')}的环境中）`,
      playerTextInfo: {
        talents: player.talents,
        currentState: player.currentState,
        equipment: player.equipment,
        relationships: player.relationships,
        environment: player.environment,
        recentEvents: player.recentEvents
      },
      programmaticResults: programmaticResult,
      decisionPrompt,
      expectedAITasks
    };
  }
  
  /**
   * 构建AI决策提示词
   */
  private static buildAIDecisionPrompt(action: string, programmaticResult: any): string {
    const confidence = programmaticResult.calculation_confidence;
    
    if (confidence > 0.8) {
      // 程序计算可信度高，AI主要做描述
      return `程序已计算出${action}的基础成功率为${programmaticResult.baseSuccessRate.toFixed(1)}%。
请根据玩家的天赋、状态、装备等文字描述，对这个成功率进行合理调整（可以±20%），并生成详细的过程描述。
重点考虑文字描述的影响，如"天生剑体"、"心境不宁"等因素。`;
    } else if (confidence > 0.5) {
      // 程序计算中等可信，AI需要大幅调整
      return `程序计算出${action}的基础参考值为${programmaticResult.baseSuccessRate.toFixed(1)}%，但这只是粗略估算。
请根据玩家的所有文字描述信息，重新评估成功率（可以±50%），并判断可能的结果。
特别注意天赋、状态、环境、人际关系等复杂因素的影响。`;
    } else {
      // 程序计算可信度低，AI几乎完全重新判断
      return `程序无法准确计算${action}的成功率（参考值${programmaticResult.baseSuccessRate.toFixed(1)}%仅供参考）。
请根据玩家的天赋、状态、装备、环境、人际关系、最近发生的事件等所有信息，完全重新判断这次行动的结果。
你可以忽略程序计算值，完全根据文字描述的逻辑来决定。`;
    }
  }
  
  /**
   * 确定AI需要处理的具体任务
   */
  private static getAITasks(action: string, confidence: number): string[] {
    const baseTasks = ['生成过程描述', '考虑文字因素影响'];
    
    if (confidence < 0.7) {
      baseTasks.push('重新评估成功率');
      baseTasks.push('判断意外事件可能性');
    }
    
    if (action.includes('突破')) {
      baseTasks.push('分析心境和天赋影响');
      baseTasks.push('考虑环境和时机');
      baseTasks.push('判断是否有特殊机缘');
    } else if (action.includes('社交') || action.includes('表白')) {
      baseTasks.push('分析人际关系');
      baseTasks.push('考虑魅力和情商');
      baseTasks.push('判断对方反应');
    }
    
    return baseTasks;
  }
  
  /**
   * 评估程序计算的可信度
   */
  private static assessCalculationConfidence(player: PlayerFullInfo): number {
    let confidence = 0.7; // 基础可信度
    
    // 文字描述越多，程序计算越不可信
    const textFactorCount = 
      player.talents.length + 
      player.currentState.length + 
      player.equipment.length + 
      player.relationships.length;
    
    // 每个文字因素降低5%可信度
    confidence -= textFactorCount * 0.05;
    
    // 特殊状态大幅影响可信度
    if (player.currentState.some(state => 
      state.includes('走火入魔') || 
      state.includes('顿悟') ||
      state.includes('心魔')
    )) {
      confidence -= 0.3;
    }
    
    // 特殊天赋影响可信度
    if (player.talents.some(talent => 
      talent.includes('绝世') || 
      talent.includes('废柴') ||
      talent.includes('天生')
    )) {
      confidence -= 0.2;
    }
    
    return Math.max(0.1, Math.min(0.9, confidence));
  }
  
  // 辅助方法
  private static getStageMultiplier(stage: RealmStage): number {
    const multipliers = { '初期': 0, '中期': 3, '后期': 6, '圆满': 10, '极境': 15 };
    return multipliers[stage] || 0;
  }
  
  private static selectPrimaryAttribute(action: string, attrs: any): number {
    if (action.includes('战斗') || action.includes('攻击')) return attrs.strength;
    if (action.includes('突破') || action.includes('修炼')) return attrs.constitution;
    if (action.includes('炼丹') || action.includes('阵法')) return attrs.intelligence;
    if (action.includes('社交') || action.includes('表白')) return attrs.charm;
    return (attrs.strength + attrs.intelligence + attrs.charm + attrs.constitution) / 4;
  }
  
  private static calculateSkillFactor(action: string, skills: any[]): number {
    const relevantSkills = skills.filter(skill => 
      action.includes(skill.name) || skill.name.includes(action.slice(0, 2))
    );
    return relevantSkills.reduce((sum, skill) => sum + skill.level, 0) * 0.5;
  }
  
  private static determineProcessingMethod(action: string): 'light_program_heavy_ai' | 'balanced' | 'heavy_program_light_ai' {
    if (action.includes('社交') || action.includes('表白') || action.includes('探索')) {
      return 'light_program_heavy_ai';
    } else if (action.includes('修炼') || action.includes('炼丹')) {
      return 'heavy_program_light_ai';
    } else {
      return 'balanced';
    }
  }
}

/**
 * 使用示例
 */
export async function hybridCalculationExample() {
  console.log('=== 真实混合计算示例 ===\n');
  
  // 模拟一个复杂的玩家信息
  const player: PlayerFullInfo = {
    realm: 4,
    stage: '后期',
    baseAttributes: {
      strength: 75,
      intelligence: 60,
      charm: 45,
      constitution: 80
    },
    luck: LuckLevel.NORMAL,
    
    // 大量文字描述 - 程序无法处理
    talents: [
      '天生剑体（对剑法有超凡理解）',
      '心魔缠身（容易受到内心负面情绪影响）',
      '绝世天才（修炼速度是常人的十倍）'
    ],
    currentState: [
      '心境不宁（刚刚失恋，难以集中精神）',
      '剑意将成（距离领悟剑意只差一步）',
      '师父失望（因为最近表现不佳）'
    ],
    equipment: [
      '祖传玉佩（正在发热，似乎有异象）',
      '破损飞剑（跟随多年，有特殊感情）',
      '护心镜（师妹送的，带有她的祝福）'
    ],
    relationships: [
      '师妹关心（担心你的状态）',
      '师兄嫉妒（因为你天赋更好）',
      '仇家追杀（三个月后必有一战）'
    ],
    environment: [
      '剑意灵泉旁（最适合剑修突破的地方）',
      '月圆之夜（灵气最为充沛）',
      '心魔频现（环境中有心魔作祟）'
    ],
    recentEvents: [
      '师妹被魔修掳走又救回',
      '获得古代剑谱残页',
      '在生死战中顿悟'
    ],
    
    skills: [
      { name: '太虚剑法', level: 8, description: '威力强大但消耗巨大' },
      { name: '凝神诀', level: 6, description: '有助于稳定心境' }
    ]
  };
  
  // 突破请求
  const request: CalculationRequest = {
    action: '突破到元婴圆满境界',
    player,
    contextInfo: {
      urgency: '三个月后有生死战，必须尽快提升实力',
      opportunity: '剑意灵泉千年难遇，错过再无机会'
    }
  };
  
  // 执行混合计算
  const result = await RealHybridCalculationEngine.calculate(request);
  
  console.log('🔍 计算结果分析:');
  console.log(`程序计算基础成功率: ${result.programmaticPart.baseSuccessRate?.toFixed(1)}%`);
  console.log(`程序计算可信度: ${(result.programmaticPart.calculation_confidence * 100).toFixed(1)}%`);
  console.log(`处理方式: ${result.processingMethod}`);
  
  console.log('\n🤖 交给AI的信息:');
  console.log(`场景: ${result.aiDecisionPart.scenario}`);
  console.log(`天赋因素: ${result.aiDecisionPart.playerTextInfo.talents.length}个`);
  console.log(`状态因素: ${result.aiDecisionPart.playerTextInfo.currentState.length}个`);
  console.log(`环境因素: ${result.aiDecisionPart.playerTextInfo.environment.length}个`);
  
  console.log('\n📋 AI需要处理的任务:');
  result.aiDecisionPart.expectedAITasks.forEach(task => {
    console.log(`- ${task}`);
  });
  
  console.log('\n💬 AI决策提示:');
  console.log(result.aiDecisionPart.decisionPrompt);
  
  console.log('\n✨ 模拟AI可能的处理:');
  console.log(`AI分析: "虽然程序算出${result.programmaticPart.baseSuccessRate?.toFixed(1)}%成功率，但考虑到"`);
  console.log(`- 绝世天才+天生剑体: 成功率+30%`);
  console.log(`- 心境不宁+心魔缠身: 成功率-25%`);
  console.log(`- 剑意灵泉+月圆之夜: 成功率+20%`);
  console.log(`- 祖传玉佩发热异象: 可能有奇遇+15%`);
  console.log(`- 最终AI判断成功率: 约75%，但过程会有波折..."`);
}

export { RealHybridCalculationEngine };