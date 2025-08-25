/**
 * 智能场景识别系统 - 用户可配置的识别方式
 * 支持: AI识别、精准文字匹配、混合模式
 */

import { LuckLevel } from './calculationSystem';
import type { RealmStage } from '../types/game';

// 识别方式配置
export interface RecognitionSettings {
  method: 'ai_only' | 'text_only' | 'hybrid' | 'auto';
  textMatchPrecision: 'strict' | 'moderate' | 'loose';
  aiBackupEnabled: boolean;
  cacheEnabled: boolean;
}

// 精准文字匹配规则
export interface PreciseMatchRule {
  scenario: string;
  patterns: {
    exact: string[];           // 精确匹配
    prefix: string[];          // 前缀匹配
    suffix: string[];          // 后缀匹配
    contains: string[];        // 包含匹配
    regex: RegExp[];           // 正则匹配
  };
  contextRequirements?: {
    location?: string[];
    objects?: string[];
    playerState?: string[];
  };
  confidence: number;
  programmaticCalculable: boolean;
}

/**
 * 精准文字匹配规则数据库
 */
class PreciseMatchRules {
  private static rules: PreciseMatchRule[] = [
    
    // === 战斗类 - 可程序化计算 ===
    {
      scenario: 'combat',
      patterns: {
        exact: ['攻击', '战斗', '决斗', '厮杀', '交手', '对战'],
        prefix: ['攻击', '击败', '打败', '杀死', '斩杀'],
        suffix: ['攻击', '挑战', '决斗'],
        contains: ['VS', '对战', '切磋', '比武'],
        regex: [/攻击.+/, /与.+战斗/, /挑战.+/, /向.+发起/]
      },
      contextRequirements: {
        objects: ['敌人', '对手', '魔修', '妖兽', '武器']
      },
      confidence: 0.95,
      programmaticCalculable: true
    },
    
    // === 突破类 - 可程序化计算 ===
    {
      scenario: 'breakthrough',
      patterns: {
        exact: ['突破', '进阶', '晋级', '冲关', '渡劫'],
        prefix: ['突破到', '冲击', '尝试突破'],
        suffix: ['突破', '进阶', '境界'],
        contains: ['结丹', '凝婴', '化神', '合体'],
        regex: [/突破.+境/, /冲击.+级/, /进阶.+期/]
      },
      contextRequirements: {
        playerState: ['修为圆满', '瓶颈', '准备突破']
      },
      confidence: 0.98,
      programmaticCalculable: true
    },
    
    // === 修炼类 - 可程序化计算 ===
    {
      scenario: 'cultivation',
      patterns: {
        exact: ['修炼', '练功', '打坐', '冥想', '运功', '吐纳'],
        prefix: ['修炼', '练习', '参悟'],
        suffix: ['功法', '心法', '诀'],
        contains: ['炼化', '感悟', '领悟'],
        regex: [/修炼.+/, /练习.+功/, /参悟.+/, /闭关.+/]
      },
      contextRequirements: {
        location: ['洞府', '静室', '练功房']
      },
      confidence: 0.92,
      programmaticCalculable: true
    },
    
    // === 炼丹类 - 部分程序化计算 ===
    {
      scenario: 'alchemy',
      patterns: {
        exact: ['炼丹', '炼药', '制丹', '熬药', '配药'],
        prefix: ['炼制', '制作'],
        suffix: ['丹', '药', '丹药'],
        contains: ['丹炉', '药材', '丹方'],
        regex: [/炼制.+丹/, /制作.+药/, /炼.+丹药/]
      },
      contextRequirements: {
        objects: ['丹炉', '药材', '火种']
      },
      confidence: 0.96,
      programmaticCalculable: true
    },
    
    // === 炼器类 - 部分程序化计算 ===
    {
      scenario: 'crafting',
      patterns: {
        exact: ['炼器', '锻造', '打造', '铸造'],
        prefix: ['炼制', '锻造', '打造'],
        suffix: ['器', '剑', '刀', '法器'],
        contains: ['材料', '炉火', '锤子'],
        regex: [/炼制.+器/, /打造.+/, /锻造.+/]
      },
      contextRequirements: {
        objects: ['炉火', '材料', '工具']
      },
      confidence: 0.94,
      programmaticCalculable: true
    },
    
    // === 社交类 - 不可程序化，需AI ===
    {
      scenario: 'social',
      patterns: {
        exact: ['表白', '告白', '求爱', '勾引', '调戏', '聊天', '交谈'],
        prefix: ['向', '对', '和'],
        suffix: ['说话', '表白', '聊天'],
        contains: ['师姐', '师妹', '美女', '佳人'],
        regex: [/对.+说/, /向.+表达/, /和.+聊天/, /追求.+/]
      },
      contextRequirements: {
        objects: ['师姐', '师妹', '女修', '美女']
      },
      confidence: 0.88,
      programmaticCalculable: false
    },
    
    // === 探索类 - 不可程序化，需AI ===
    {
      scenario: 'exploration',
      patterns: {
        exact: ['探索', '搜索', '寻找', '查看', '调查', '前往', '进入'],
        prefix: ['前往', '进入', '探索', '寻找'],
        suffix: ['地方', '洞穴', '遗迹'],
        contains: ['秘境', '宝藏', '洞穴', '遗迹'],
        regex: [/前往.+/, /探索.+/, /寻找.+/, /进入.+/]
      },
      confidence: 0.75,
      programmaticCalculable: false
    },
    
    // === 破阵类 - 混合计算 ===
    {
      scenario: 'formation_breaking',
      patterns: {
        exact: ['破阵', '解阵', '破解阵法', '破坏阵法'],
        prefix: ['破解', '解开', '破坏'],
        suffix: ['阵', '阵法', '禁制'],
        contains: ['阵眼', '阵纹', '机关'],
        regex: [/破解.+阵/, /解开.+/, /破坏.+阵法/]
      },
      contextRequirements: {
        objects: ['阵法', '禁制', '机关', '阵眼']
      },
      confidence: 0.91,
      programmaticCalculable: true
    },
    
    // === 服用丹药类 - 混合计算 ===
    {
      scenario: 'pill_consumption',
      patterns: {
        exact: ['服用', '吃药', '服药', '炼化'],
        prefix: ['服用', '吃', '炼化'],
        suffix: ['丹', '药', '丹药'],
        contains: ['药力', '药效', '炼化'],
        regex: [/服用.+丹/, /吃.+药/, /炼化.+/]
      },
      contextRequirements: {
        objects: ['丹药', '灵丹', '药物']
      },
      confidence: 0.93,
      programmaticCalculable: true
    }
  ];
  
  /**
   * 精准匹配主方法
   */
  static match(
    input: string, 
    context: any, 
    precision: 'strict' | 'moderate' | 'loose'
  ): { rule: PreciseMatchRule; score: number; reasoning: string[] } | null {
    
    const matches: Array<{
      rule: PreciseMatchRule;
      score: number;
      reasoning: string[];
    }> = [];
    
    for (const rule of this.rules) {
      const matchResult = this.calculateRuleScore(input, context, rule, precision);
      if (matchResult.score > 0) {
        matches.push({
          rule,
          score: matchResult.score,
          reasoning: matchResult.reasoning
        });
      }
    }
    
    // 按得分排序
    matches.sort((a, b) => b.score - a.score);
    
    // 根据精度要求决定是否接受结果
    const minScore = this.getMinScoreForPrecision(precision);
    const bestMatch = matches[0];
    
    if (bestMatch && bestMatch.score >= minScore) {
      return bestMatch;
    }
    
    return null;
  }
  
  /**
   * 计算规则匹配得分
   */
  private static calculateRuleScore(
    input: string,
    context: any,
    rule: PreciseMatchRule,
    precision: 'strict' | 'moderate' | 'loose'
  ): { score: number; reasoning: string[] } {
    
    let score = 0;
    const reasoning: string[] = [];
    const inputLower = input.toLowerCase();
    
    // 1. 精确匹配 (最高权重)
    const exactMatches = rule.patterns.exact.filter(word => 
      inputLower === word || inputLower.includes(word)
    );
    if (exactMatches.length > 0) {
      score += exactMatches.length * 30;
      reasoning.push(`精确匹配: ${exactMatches.join(', ')}`);
    }
    
    // 2. 前缀匹配
    const prefixMatches = rule.patterns.prefix.filter(prefix =>
      inputLower.startsWith(prefix)
    );
    if (prefixMatches.length > 0) {
      score += prefixMatches.length * 25;
      reasoning.push(`前缀匹配: ${prefixMatches.join(', ')}`);
    }
    
    // 3. 后缀匹配
    const suffixMatches = rule.patterns.suffix.filter(suffix =>
      inputLower.endsWith(suffix)
    );
    if (suffixMatches.length > 0) {
      score += suffixMatches.length * 25;
      reasoning.push(`后缀匹配: ${suffixMatches.join(', ')}`);
    }
    
    // 4. 包含匹配
    const containsMatches = rule.patterns.contains.filter(word =>
      inputLower.includes(word)
    );
    if (containsMatches.length > 0) {
      score += containsMatches.length * 20;
      reasoning.push(`包含匹配: ${containsMatches.join(', ')}`);
    }
    
    // 5. 正则匹配
    const regexMatches = rule.patterns.regex.filter(regex =>
      regex.test(input)
    );
    if (regexMatches.length > 0) {
      score += regexMatches.length * 35;
      reasoning.push(`模式匹配: ${regexMatches.length}个`);
    }
    
    // 6. 上下文匹配加成
    if (context && rule.contextRequirements) {
      score += this.calculateContextBonus(context, rule.contextRequirements, reasoning);
    }
    
    // 7. 根据精度要求调整分数
    score *= this.getPrecisionMultiplier(precision);
    
    // 8. 基础置信度加成
    score *= rule.confidence;
    
    return { score, reasoning };
  }
  
  /**
   * 计算上下文加成
   */
  private static calculateContextBonus(
    context: any,
    requirements: any,
    reasoning: string[]
  ): number {
    
    let bonus = 0;
    
    // 位置匹配
    if (requirements.location && context.location) {
      const locationMatches = requirements.location.filter((loc: string) =>
        context.location.includes(loc)
      );
      if (locationMatches.length > 0) {
        bonus += locationMatches.length * 10;
        reasoning.push(`位置匹配: ${locationMatches.join(', ')}`);
      }
    }
    
    // 物品匹配
    if (requirements.objects && context.nearbyObjects) {
      const objectMatches = requirements.objects.filter((obj: string) =>
        context.nearbyObjects.some((contextObj: string) => contextObj.includes(obj))
      );
      if (objectMatches.length > 0) {
        bonus += objectMatches.length * 15;
        reasoning.push(`物品匹配: ${objectMatches.join(', ')}`);
      }
    }
    
    // 状态匹配
    if (requirements.playerState && context.playerState) {
      const stateMatches = requirements.playerState.filter((state: string) =>
        context.playerState.includes(state)
      );
      if (stateMatches.length > 0) {
        bonus += stateMatches.length * 12;
        reasoning.push(`状态匹配: ${stateMatches.join(', ')}`);
      }
    }
    
    return bonus;
  }
  
  /**
   * 获取精度要求的最低分数
   */
  private static getMinScoreForPrecision(precision: 'strict' | 'moderate' | 'loose'): number {
    switch (precision) {
      case 'strict': return 80;
      case 'moderate': return 50;
      case 'loose': return 25;
    }
  }
  
  /**
   * 获取精度修正系数
   */
  private static getPrecisionMultiplier(precision: 'strict' | 'moderate' | 'loose'): number {
    switch (precision) {
      case 'strict': return 1.2;
      case 'moderate': return 1.0;
      case 'loose': return 0.8;
    }
  }
  
  /**
   * 添加自定义规则
   */
  static addCustomRule(rule: PreciseMatchRule): void {
    this.rules.push(rule);
  }
  
  /**
   * 获取所有可程序化计算的场景
   */
  static getProgrammaticScenarios(): string[] {
    return this.rules
      .filter(rule => rule.programmaticCalculable)
      .map(rule => rule.scenario);
  }
}

/**
 * 程序化计算引擎
 */
class ProgrammaticCalculationEngine {
  
  /**
   * 执行程序化计算
   */
  static calculate(
    scenario: string,
    input: string,
    playerData: {
      realm: number;
      stage: RealmStage;
      attributes: Record<string, number>;
      luck: LuckLevel;
    },
    context?: any
  ): {
    canCalculate: boolean;
    result?: {
      successRate?: number;
      effectValue?: number;
      difficulty: string;
      factors: Record<string, number>;
    };
    needsAI: boolean;
    reasoning: string;
  } {
    
    // 检查是否可程序化计算
    const programmaticScenarios = PreciseMatchRules.getProgrammaticScenarios();
    
    if (!programmaticScenarios.includes(scenario)) {
      return {
        canCalculate: false,
        needsAI: true,
        reasoning: `${scenario}场景需要AI处理复杂逻辑`
      };
    }
    
    // 执行对应场景的计算
    switch (scenario) {
      case 'combat':
        return this.calculateCombat(playerData, context);
      case 'breakthrough':
        return this.calculateBreakthrough(playerData, context);
      case 'cultivation':
        return this.calculateCultivation(playerData, context);
      case 'alchemy':
        return this.calculateAlchemy(playerData, context);
      case 'crafting':
        return this.calculateCrafting(playerData, context);
      case 'formation_breaking':
        return this.calculateFormationBreaking(playerData, context);
      case 'pill_consumption':
        return this.calculatePillConsumption(playerData, context);
      default:
        return {
          canCalculate: false,
          needsAI: true,
          reasoning: `未实现${scenario}的程序化计算`
        };
    }
  }
  
  /**
   * 战斗计算
   */
  private static calculateCombat(playerData: any, context: any) {
    const baseAttack = playerData.attributes.strength || 50;
    const realmBonus = playerData.realm * 15;
    const stageMultiplier = this.getStageMultiplier(playerData.stage);
    const luckModifier = playerData.luck * 8;
    
    // 武器加成（从上下文推断）
    let weaponBonus = 0;
    if (context?.nearbyObjects?.some((obj: string) => obj.includes('剑'))) {
      weaponBonus = 20;
    }
    
    const totalPower = baseAttack + realmBonus + stageMultiplier + weaponBonus;
    const successRate = Math.min(95, Math.max(5, totalPower * 0.8 + luckModifier));
    
    return {
      canCalculate: true,
      result: {
        successRate,
        effectValue: totalPower,
        difficulty: this.assessDifficulty(successRate),
        factors: {
          baseAttack,
          realmBonus,
          stageMultiplier,
          weaponBonus,
          luckModifier
        }
      },
      needsAI: true, // 仍需要AI生成描述
      reasoning: '基于属性、境界、装备的战斗力计算'
    };
  }
  
  /**
   * 突破计算
   */
  private static calculateBreakthrough(playerData: any, context: any) {
    const constitution = playerData.attributes.constitution || 50;
    const currentRealm = playerData.realm;
    
    // 境界越高突破越难
    const difficultyMultiplier = Math.pow(1.5, currentRealm);
    const baseRate = Math.max(10, 80 - difficultyMultiplier);
    
    // 阶段影响
    const stageBonus = this.getBreakthroughStageBonus(playerData.stage);
    
    // 体质影响
    const constitutionBonus = (constitution - 50) * 0.5;
    
    // 气运影响
    const luckModifier = playerData.luck * 10;
    
    // 环境加成
    let environmentBonus = 0;
    if (context?.location?.includes('灵泉') || context?.location?.includes('洞天')) {
      environmentBonus = 15;
    }
    
    const finalRate = Math.min(95, Math.max(1, 
      baseRate + stageBonus + constitutionBonus + luckModifier + environmentBonus
    ));
    
    return {
      canCalculate: true,
      result: {
        successRate: finalRate,
        difficulty: this.assessBreakthroughDifficulty(currentRealm, playerData.stage),
        factors: {
          baseRate,
          stageBonus,
          constitutionBonus,
          luckModifier,
          environmentBonus
        }
      },
      needsAI: true,
      reasoning: '基于境界、体质、环境的突破成功率计算'
    };
  }
  
  /**
   * 修炼计算
   */
  private static calculateCultivation(playerData: any, context: any) {
    const intelligence = playerData.attributes.intelligence || 50;
    const constitution = playerData.attributes.constitution || 50;
    
    // 基础效率
    const baseEfficiency = (intelligence + constitution) / 2;
    
    // 境界修正
    const realmMultiplier = 1 + playerData.realm * 0.2;
    
    // 环境加成
    let environmentMultiplier = 1;
    if (context?.location?.includes('洞府')) environmentMultiplier += 0.3;
    if (context?.location?.includes('灵泉')) environmentMultiplier += 0.5;
    
    // 功法加成（简化处理）
    const techniqueMultiplier = 1.2; // 假设有功法
    
    const finalEfficiency = baseEfficiency * realmMultiplier * environmentMultiplier * techniqueMultiplier;
    
    return {
      canCalculate: true,
      result: {
        effectValue: finalEfficiency,
        difficulty: '正常',
        factors: {
          baseEfficiency,
          realmMultiplier,
          environmentMultiplier,
          techniqueMultiplier
        }
      },
      needsAI: true,
      reasoning: '基于资质、境界、环境的修炼效率计算'
    };
  }
  
  /**
   * 炼丹计算
   */
  private static calculateAlchemy(playerData: any, context: any) {
    const intelligence = playerData.attributes.intelligence || 50;
    
    // 基础炼丹能力
    const baseSkill = intelligence;
    
    // 丹炉加成
    let furnaceBonus = 0;
    if (context?.nearbyObjects?.some((obj: string) => obj.includes('丹炉'))) {
      furnaceBonus = 25;
    }
    
    // 材料质量影响（简化）
    const materialQuality = 1.1; // 假设普通材料
    
    const successRate = Math.min(90, (baseSkill + furnaceBonus) * materialQuality * 0.8);
    
    return {
      canCalculate: true,
      result: {
        successRate,
        difficulty: this.assessDifficulty(successRate),
        factors: {
          baseSkill,
          furnaceBonus,
          materialQuality: materialQuality * 100 - 100
        }
      },
      needsAI: true,
      reasoning: '基于智力、设备、材料的炼丹成功率计算'
    };
  }
  
  /**
   * 炼器计算
   */
  private static calculateCrafting(playerData: any, context: any) {
    const strength = playerData.attributes.strength || 50;
    const intelligence = playerData.attributes.intelligence || 50;
    
    // 炼器需要力量和智慧
    const baseSkill = (strength + intelligence) / 2;
    
    // 工具和炉火加成
    let equipmentBonus = 0;
    if (context?.nearbyObjects?.some((obj: string) => obj.includes('炉火'))) {
      equipmentBonus += 15;
    }
    if (context?.nearbyObjects?.some((obj: string) => obj.includes('锤子'))) {
      equipmentBonus += 10;
    }
    
    const successRate = Math.min(85, (baseSkill + equipmentBonus) * 0.9);
    
    return {
      canCalculate: true,
      result: {
        successRate,
        difficulty: this.assessDifficulty(successRate),
        factors: {
          baseSkill,
          equipmentBonus
        }
      },
      needsAI: true,
      reasoning: '基于力量、智力、工具的炼器成功率计算'
    };
  }
  
  /**
   * 破阵计算
   */
  private static calculateFormationBreaking(playerData: any, context: any) {
    const intelligence = playerData.attributes.intelligence || 50;
    
    // 阵法知识（简化为智力）
    const formationKnowledge = intelligence;
    
    // 境界加成（高境界对低级阵法有优势）
    const realmBonus = playerData.realm * 10;
    
    const successRate = Math.min(80, (formationKnowledge + realmBonus) * 0.7);
    
    return {
      canCalculate: true,
      result: {
        successRate,
        difficulty: this.assessDifficulty(successRate),
        factors: {
          formationKnowledge,
          realmBonus
        }
      },
      needsAI: true,
      reasoning: '基于智力、境界的破阵能力计算'
    };
  }
  
  /**
   * 服用丹药计算
   */
  private static calculatePillConsumption(playerData: any, context: any) {
    const constitution = playerData.attributes.constitution || 50;
    
    // 体质影响药物吸收
    const absorptionRate = constitution * 1.2;
    
    // 境界影响（高境界可以更好地炼化药力）
    const realmBonus = playerData.realm * 5;
    
    const effectiveness = Math.min(95, absorptionRate + realmBonus);
    
    return {
      canCalculate: true,
      result: {
        effectValue: effectiveness,
        difficulty: '正常',
        factors: {
          absorptionRate,
          realmBonus
        }
      },
      needsAI: true,
      reasoning: '基于体质、境界的药物吸收效率计算'
    };
  }
  
  // 辅助方法
  private static getStageMultiplier(stage: RealmStage): number {
    const multipliers = { '初期': 5, '中期': 10, '后期': 15, '圆满': 25, '极境': 40 };
    return multipliers[stage] || 0;
  }
  
  private static getBreakthroughStageBonus(stage: RealmStage): number {
    const bonuses = { '初期': -10, '中期': -5, '后期': 0, '圆满': 10, '极境': -20 };
    return bonuses[stage] || 0;
  }
  
  private static assessDifficulty(rate: number): string {
    if (rate >= 80) return '简单';
    if (rate >= 60) return '普通';
    if (rate >= 40) return '困难';
    if (rate >= 20) return '极难';
    return '几乎不可能';
  }
  
  private static assessBreakthroughDifficulty(realm: number, stage: RealmStage): string {
    if (realm <= 2) return '普通';
    if (realm <= 4) return '困难';
    if (realm <= 6) return '极难';
    return '逆天';
  }
}

export { PreciseMatchRules, ProgrammaticCalculationEngine };