/**
 * @fileoverview 智能提示词路由系统
 * 根据用户行动智能选择最合适的AI提示词，提升交互体验
 */

import { 
  generateCultivationPrompt, 
  generateSkillLearningPrompt, 
  generateBreakthroughPrompt,
  generateCultivationInsightPrompt
} from './optimizedCultivationPrompts';
import { 
  generateNPCInteractionPrompt, 
  generateChoiceBranchPrompt,
  generateWorldEventPrompt
} from './optimizedInteractionPrompts';
import { generateComprehensiveAIPrompt } from './comprehensiveAISystem';
import type { GameCharacter, GM_Request } from '../../types/AIGameMaster';

/**
 * 用户行动类型检测
 */
export interface ActionAnalysis {
  primaryType: 'cultivation' | 'interaction' | 'exploration' | 'combat' | 'general';
  subType?: string;
  confidence: number;
  keywords: string[];
  context: any;
}

/**
 * 提示词选择配置
 */
interface PromptConfig {
  character: GameCharacter;
  memory: any;
  location: any;
  userAction: string;
  worldTime: string;
  difficulty: 'normal' | 'medium' | 'hard';
}

/**
 * 智能行动分析器
 */
export class ActionAnalyzer {
  private static cultivationKeywords = [
    '修炼', '打坐', '炼气', '修行', '练功', '闭关', '静修', 
    '运功', '调息', '冥想', '感悟', '顿悟', '专修'
  ];

  private static skillKeywords = [
    '学习', '修习', '练习', '研读', '领悟', '掌握', '功法', 
    '秘籍', '心法', '武技', '法术', '神通'
  ];

  private static breakthroughKeywords = [
    '突破', '进阶', '晋升', '跨越', '冲击', '境界', '瓶颈',
    '冲关', '破境', '升级', '进级'
  ];

  private static interactionKeywords = [
    '交谈', '对话', '询问', '请教', '拜访', '会面', '商议',
    '寻找', '找', '见', '问', '说', '告诉', '求助'
  ];

  private static explorationKeywords = [
    '探索', '前往', '去', '移动', '行走', '飞行', '传送',
    '寻找', '搜索', '查看', '观察', '调查', '打探'
  ];

  private static combatKeywords = [
    '攻击', '战斗', '打斗', '对战', '挑战', '比武', '决斗',
    '施展', '使用', '释放', '发动', '反击', '防御'
  ];

  /**
   * 分析用户行动类型
   */
  static analyzeAction(userAction: string): ActionAnalysis {
    const action = userAction.toLowerCase();
    const analyses: ActionAnalysis[] = [];

    // 检测修炼类行动
    const cultivationMatch = this.checkKeywords(action, this.cultivationKeywords);
    if (cultivationMatch.count > 0) {
      analyses.push({
        primaryType: 'cultivation',
        subType: this.detectCultivationSubtype(action),
        confidence: Math.min(0.9, cultivationMatch.count * 0.3 + cultivationMatch.strength),
        keywords: cultivationMatch.matched,
        context: { type: 'cultivation' }
      });
    }

    // 检测技能学习
    const skillMatch = this.checkKeywords(action, this.skillKeywords);
    if (skillMatch.count > 0) {
      analyses.push({
        primaryType: 'cultivation',
        subType: 'skill_learning',
        confidence: Math.min(0.85, skillMatch.count * 0.3 + skillMatch.strength),
        keywords: skillMatch.matched,
        context: { type: 'skill_learning' }
      });
    }

    // 检测突破行动
    const breakthroughMatch = this.checkKeywords(action, this.breakthroughKeywords);
    if (breakthroughMatch.count > 0) {
      analyses.push({
        primaryType: 'cultivation',
        subType: 'breakthrough',
        confidence: Math.min(0.95, breakthroughMatch.count * 0.4 + breakthroughMatch.strength),
        keywords: breakthroughMatch.matched,
        context: { type: 'breakthrough' }
      });
    }

    // 检测互动行动
    const interactionMatch = this.checkKeywords(action, this.interactionKeywords);
    if (interactionMatch.count > 0) {
      analyses.push({
        primaryType: 'interaction',
        subType: this.detectInteractionTarget(action),
        confidence: Math.min(0.8, interactionMatch.count * 0.25 + interactionMatch.strength),
        keywords: interactionMatch.matched,
        context: { type: 'interaction' }
      });
    }

    // 检测探索行动
    const explorationMatch = this.checkKeywords(action, this.explorationKeywords);
    if (explorationMatch.count > 0) {
      analyses.push({
        primaryType: 'exploration',
        confidence: Math.min(0.7, explorationMatch.count * 0.2 + explorationMatch.strength),
        keywords: explorationMatch.matched,
        context: { type: 'exploration' }
      });
    }

    // 检测战斗行动
    const combatMatch = this.checkKeywords(action, this.combatKeywords);
    if (combatMatch.count > 0) {
      analyses.push({
        primaryType: 'combat',
        confidence: Math.min(0.9, combatMatch.count * 0.35 + combatMatch.strength),
        keywords: combatMatch.matched,
        context: { type: 'combat' }
      });
    }

    // 如果没有明确匹配，返回通用类型
    if (analyses.length === 0) {
      return {
        primaryType: 'general',
        confidence: 0.5,
        keywords: [],
        context: { type: 'general' }
      };
    }

    // 返回置信度最高的分析结果
    return analyses.sort((a, b) => b.confidence - a.confidence)[0];
  }

  /**
   * 关键词匹配检测
   */
  private static checkKeywords(text: string, keywords: string[]): {
    count: number;
    strength: number;
    matched: string[];
  } {
    const matched: string[] = [];
    let totalStrength = 0;

    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        matched.push(keyword);
        // 根据关键词长度和在文本中的位置计算权重
        const position = text.indexOf(keyword);
        const positionWeight = position === 0 ? 0.3 : position < 10 ? 0.2 : 0.1;
        const lengthWeight = keyword.length * 0.05;
        totalStrength += positionWeight + lengthWeight;
      }
    }

    return {
      count: matched.length,
      strength: totalStrength,
      matched
    };
  }

  /**
   * 检测修炼子类型
   */
  private static detectCultivationSubtype(action: string): string {
    if (this.checkKeywords(action, this.breakthroughKeywords).count > 0) {
      return 'breakthrough';
    }
    if (this.checkKeywords(action, this.skillKeywords).count > 0) {
      return 'skill_learning';
    }
    if (action.includes('专修') || action.includes('主修')) {
      return 'main_skill_cultivation';
    }
    return 'general_cultivation';
  }

  /**
   * 检测互动目标
   */
  private static detectInteractionTarget(action: string): string {
    const npcIndicators = ['师父', '长老', '师兄', '师妹', '掌门', '宗主', '前辈'];
    if (npcIndicators.some(indicator => action.includes(indicator))) {
      return 'npc_interaction';
    }
    return 'general_interaction';
  }
}

/**
 * 智能提示词路由器
 */
export class PromptRouter {
  /**
   * 根据行动分析选择最佳提示词
   */
  static selectOptimalPrompt(config: PromptConfig): string {
    const analysis = ActionAnalyzer.analyzeAction(config.userAction);
    
    console.log(`[提示词路由] 行动分析结果:`, {
      type: analysis.primaryType,
      subType: analysis.subType,
      confidence: analysis.confidence,
      keywords: analysis.keywords
    });

    // 根据分析结果选择相应的专精提示词
    switch (analysis.primaryType) {
      case 'cultivation':
        return this.generateCultivationPrompt(analysis, config);
      
      case 'interaction':
        return this.generateInteractionPrompt(analysis, config);
      
      case 'exploration':
        return this.generateExplorationPrompt(analysis, config);
      
      case 'combat':
        return this.generateCombatPrompt(analysis, config);
      
      default:
        return this.generateGeneralPrompt(config);
    }
  }

  /**
   * 生成修炼专精提示词
   */
  private static generateCultivationPrompt(analysis: ActionAnalysis, config: PromptConfig): string {
    const { character, userAction, location } = config;
    
    switch (analysis.subType) {
      case 'breakthrough':
        return generateBreakthroughPrompt({
          characterName: character.identity.name,
          currentRealm: character.cultivation?.realm || '凡人',
          nextRealm: this.getNextRealm(character.cultivation?.realm || '凡人'),
          accumulatedProgress: character.cultivation?.realm_progress || 0,
          breakthroughMethod: userAction,
          environmentBonus: location?.current_location?.spirit_density || 5
        });

      case 'skill_learning':
        const skillName = this.extractSkillName(userAction);
        return generateSkillLearningPrompt({
          characterName: character.identity.name,
          skillName: skillName,
          skillType: this.inferSkillType(skillName),
          learningMethod: userAction,
          characterTalents: character.qualities?.talents?.map(t => t.name) || [],
          currentIntelligence: character.attributes?.INT || 5
        });

      case 'main_skill_cultivation':
        return generateCultivationPrompt({
          characterName: character.identity.name,
          currentRealm: character.cultivation?.realm || '凡人',
          realmProgress: character.cultivation?.realm_progress || 0,
          mainSkill: character.cultivation_arts?.main_technique,
          cultivationAction: userAction,
          currentLocation: location?.current_location?.name || '未知',
          spiritDensity: location?.current_location?.spirit_density || 5
        });

      default:
        return generateCultivationPrompt({
          characterName: character.identity.name,
          currentRealm: character.cultivation?.realm || '凡人',
          realmProgress: character.cultivation?.realm_progress || 0,
          cultivationAction: userAction,
          currentLocation: location?.current_location?.name || '未知',
          spiritDensity: location?.current_location?.spirit_density || 5
        });
    }
  }

  /**
   * 生成互动专精提示词
   */
  private static generateInteractionPrompt(analysis: ActionAnalysis, config: PromptConfig): string {
    const { memory, userAction, location } = config;
    
    if (analysis.subType === 'npc_interaction') {
      const npcName = this.extractNPCName(userAction);
      return generateNPCInteractionPrompt({
        npcName: npcName,
        npcType: this.inferNPCType(npcName, userAction),
        relationshipLevel: this.getNPCRelationship(npcName, memory),
        previousInteractions: this.getNPCInteractionHistory(npcName, memory),
        playerAction: userAction,
        contextLocation: location?.current_location?.name || '未知'
      });
    }

    // 如果不是明确的NPC互动，使用综合AI提示词
    return this.generateGeneralPrompt(config);
  }

  /**
   * 生成探索专精提示词
   */
  private static generateExplorationPrompt(analysis: ActionAnalysis, config: PromptConfig): string {
    // 探索类行动暂时使用通用提示词，可根据需要扩展
    return this.generateGeneralPrompt(config);
  }

  /**
   * 生成战斗专精提示词
   */
  private static generateCombatPrompt(analysis: ActionAnalysis, config: PromptConfig): string {
    // 战斗类行动暂时使用通用提示词，可根据需要扩展
    return this.generateGeneralPrompt(config);
  }

  /**
   * 生成通用提示词
   */
  private static generateGeneralPrompt(config: PromptConfig): string {
    return generateComprehensiveAIPrompt({
      character: config.character,
      memory: config.memory,
      location: config.location,
      worldTime: config.worldTime,
      difficulty: config.difficulty
    });
  }

  // 辅助方法
  private static getNextRealm(currentRealm: string): string {
    const realmMap: { [key: string]: string } = {
      '凡人': '炼气期',
      '炼气期': '筑基期',
      '筑基期': '金丹期',
      '金丹期': '元婴期',
      '元婴期': '化神期',
      '化神期': '炼虚期',
      '炼虚期': '合体期',
      '合体期': '渡劫期'
    };
    return realmMap[currentRealm] || '未知境界';
  }

  private static extractSkillName(action: string): string {
    // 简单的技能名称提取逻辑，可根据需要完善
    const skillPatterns = [
      /学习(.+?)功法/,
      /修习(.+?)心法/,
      /练习(.+?)技能/,
      /研读(.+?)秘籍/
    ];

    for (const pattern of skillPatterns) {
      const match = action.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return '未知功法';
  }

  private static inferSkillType(skillName: string): string {
    if (skillName.includes('剑') || skillName.includes('刀') || skillName.includes('拳')) {
      return 'combat';
    }
    if (skillName.includes('身法') || skillName.includes('轻功')) {
      return 'movement';
    }
    if (skillName.includes('炼气') || skillName.includes('导引')) {
      return 'cultivation';
    }
    return 'auxiliary';
  }

  private static extractNPCName(action: string): string {
    const npcPatterns = [
      /找(.+?)师父/,
      /见(.+?)长老/,
      /拜访(.+?)前辈/,
      /询问(.+?)师兄/
    ];

    for (const pattern of npcPatterns) {
      const match = action.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // 如果没有匹配到具体名称，尝试提取通用称谓
    if (action.includes('师父')) return '师父';
    if (action.includes('长老')) return '长老';
    if (action.includes('掌门')) return '掌门';
    
    return '未知NPC';
  }

  private static inferNPCType(npcName: string, action: string): string {
    if (npcName.includes('师父') || action.includes('师父')) return '师父';
    if (npcName.includes('长老') || action.includes('长老')) return '长老';
    if (npcName.includes('掌门') || action.includes('掌门')) return '掌门';
    if (npcName.includes('师兄') || action.includes('师兄')) return '师兄';
    if (npcName.includes('师妹') || action.includes('师妹')) return '师妹';
    return '普通NPC';
  }

  private static getNPCRelationship(npcName: string, memory: any): number {
    return memory?.npc_interactions?.[npcName]?.favor || 5;
  }

  private static getNPCInteractionHistory(npcName: string, memory: any): string[] {
    return memory?.npc_interactions?.[npcName]?.memories || [];
  }
}

/**
 * 提示词质量评估器
 */
export class PromptQualityAssessor {
  /**
   * 评估提示词质量
   */
  static assessPromptQuality(prompt: string, context: {
    actionType: string;
    complexity: number;
    characterLevel: number;
  }): {
    score: number;
    suggestions: string[];
    strongPoints: string[];
  } {
    const suggestions: string[] = [];
    const strongPoints: string[] = [];
    let score = 0;

    // 检查提示词长度
    if (prompt.length > 1000) {
      score += 20;
      strongPoints.push('提示词长度充分，信息详尽');
    } else {
      suggestions.push('考虑增加更多细节描述');
    }

    // 检查结构化程度
    if (prompt.includes('###') || prompt.includes('##')) {
      score += 15;
      strongPoints.push('提示词结构清晰');
    } else {
      suggestions.push('建议使用更清晰的结构化格式');
    }

    // 检查JSON格式要求
    if (prompt.includes('```json')) {
      score += 25;
      strongPoints.push('包含明确的JSON输出格式要求');
    } else {
      suggestions.push('应包含具体的JSON输出格式示例');
    }

    // 检查角色特定信息
    if (prompt.includes('角色') || prompt.includes('character')) {
      score += 20;
      strongPoints.push('考虑了角色特定信息');
    }

    // 检查上下文相关性
    if (prompt.includes('环境') || prompt.includes('位置')) {
      score += 20;
      strongPoints.push('包含环境和位置上下文');
    }

    return { score, suggestions, strongPoints };
  }
}