/**
 * 智能场景识别系统
 * 解决用户输入与计算类型匹配的问题
 * 支持模糊匹配、上下文推理、兜底机制
 */

import { ScenarioType } from './universalCalculationFramework';

// 场景识别规则
interface ScenarioRule {
  type: ScenarioType;
  keywords: string[];           // 关键词匹配
  patterns: RegExp[];          // 正则表达式匹配
  contextClues: string[];      // 上下文线索
  confidence: number;          // 匹配置信度
  description: string;         // 场景描述
}

// 游戏上下文信息
interface GameContext {
  currentLocation?: string;    // 当前位置
  recentActions?: string[];    // 最近行动
  nearbyObjects?: string[];    // 附近物品/人物
  playerState?: string;        // 玩家状态
  timeOfDay?: string;         // 时间
}

/**
 * 场景识别器
 */
export class ScenarioRecognizer {
  private static rules: ScenarioRule[] = [
    // 战斗类
    {
      type: ScenarioType.COMBAT,
      keywords: ['攻击', '战斗', '打', '杀', '击败', '对战', '决斗', '厮杀', '交手'],
      patterns: [/攻击.+/, /与.+战斗/, /打败.+/, /向.+发起/, /.+打我/],
      contextClues: ['敌人', '怪物', '对手', '危险', '武器', '法术'],
      confidence: 0.9,
      description: '战斗相关行动'
    },
    
    // 突破类
    {
      type: ScenarioType.BREAKTHROUGH,
      keywords: ['突破', '进阶', '晋级', '冲关', '渡劫', '结丹', '凝婴'],
      patterns: [/突破.+境/, /冲击.+/, /尝试进阶/, /准备突破/],
      contextClues: ['境界', '修为', '瓶颈', '丹田', '灵力'],
      confidence: 0.95,
      description: '境界突破'
    },
    
    // 修炼类
    {
      type: ScenarioType.CULTIVATION,
      keywords: ['修炼', '打坐', '冥想', '练功', '吐纳', '运功', '炼化'],
      patterns: [/修炼.+/, /练习.+功/, /参悟.+/, /闭关.+/],
      contextClues: ['功法', '心法', '灵气', '丹田', '经脉'],
      confidence: 0.9,
      description: '修炼练功'
    },
    
    // 炼丹类
    {
      type: ScenarioType.ALCHEMY,
      keywords: ['炼丹', '炼药', '制丹', '熬药', '配药'],
      patterns: [/炼制.+丹/, /制作.+药/, /炼.+丹药/],
      contextClues: ['丹炉', '药材', '火候', '丹方', '灵草'],
      confidence: 0.95,
      description: '炼丹制药'
    },
    
    // 炼器类
    {
      type: ScenarioType.CRAFTING,
      keywords: ['炼器', '锻造', '打造', '制作', '铸造', '炼制装备'],
      patterns: [/炼制.+器/, /打造.+/, /锻造.+/, /制作.+装备/],
      contextClues: ['材料', '炉火', '铁锤', '法器', '灵器'],
      confidence: 0.95,
      description: '炼器锻造'
    },
    
    // 破阵类
    {
      type: ScenarioType.FORMATION_BREAKING,
      keywords: ['破阵', '解阵', '破解', '阵法', '机关'],
      patterns: [/破解.+阵/, /解开.+/, /破坏.+阵法/],
      contextClues: ['阵纹', '阵眼', '禁制', '符文', '机关'],
      confidence: 0.9,
      description: '破解阵法'
    },
    
    // 社交类
    {
      type: ScenarioType.SOCIAL,
      keywords: ['表白', '勾引', '调戏', '搭讪', '聊天', '交谈', '拜访', '求爱'],
      patterns: [/对.+说/, /向.+表达/, /和.+聊天/, /追求.+/, /勾引.+/],
      contextClues: ['美女', '师姐', '师妹', '女修', '佳人', '心仪'],
      confidence: 0.85,
      description: '社交互动'
    },
    
    // 探索类
    {
      type: ScenarioType.EXPLORATION,
      keywords: ['探索', '搜索', '寻找', '查看', '调查', '前往', '进入'],
      patterns: [/前往.+/, /探索.+/, /搜索.+/, /寻找.+/, /进入.+/],
      contextClues: ['洞穴', '遗迹', '秘境', '宝藏', '地图'],
      confidence: 0.7,
      description: '探索冒险'
    },
    
    // 谈判类
    {
      type: ScenarioType.NEGOTIATION,
      keywords: ['谈判', '交易', '买卖', '讨价还价', '商议', '协商'],
      patterns: [/与.+谈判/, /和.+交易/, /向.+购买/, /出售.+/],
      contextClues: ['商人', '价格', '灵石', '交易', '市场'],
      confidence: 0.8,
      description: '谈判交易'
    },
    
    // 吸收丹药类
    {
      type: ScenarioType.PILL_ABSORPTION,
      keywords: ['服用', '吸收', '炼化', '消化丹药', '吃丹'],
      patterns: [/服用.+丹/, /吸收.+/, /炼化.+药力/],
      contextClues: ['丹药', '药力', '药效', '灵丹'],
      confidence: 0.9,
      description: '服用炼化丹药'
    },
    
    // 驯兽类
    {
      type: ScenarioType.BEAST_TAMING,
      keywords: ['驯服', '收服', '驯兽', '收为坐骑', '契约'],
      patterns: [/驯服.+/, /收服.+兽/, /与.+签订契约/],
      contextClues: ['妖兽', '灵兽', '坐骑', '宠物', '契约'],
      confidence: 0.9,
      description: '驯服妖兽'
    }
  ];
  
  /**
   * 主要识别方法
   */
  static recognizeScenario(
    userInput: string, 
    gameContext?: GameContext
  ): {
    type: ScenarioType;
    confidence: number;
    matchedRule: ScenarioRule;
    reasoning: string;
  } {
    
    console.log(`[场景识别] 用户输入: "${userInput}"`);
    
    const matches: Array<{
      rule: ScenarioRule;
      score: number;
      reasons: string[];
    }> = [];
    
    // 对每个规则进行匹配打分
    for (const rule of this.rules) {
      const matchResult = this.calculateMatchScore(userInput, rule, gameContext);
      if (matchResult.score > 0) {
        matches.push({
          rule,
          score: matchResult.score,
          reasons: matchResult.reasons
        });
      }
    }
    
    // 按得分排序
    matches.sort((a, b) => b.score - a.score);
    
    // 如果没有匹配，使用默认处理
    if (matches.length === 0) {
      console.log(`[场景识别] 无法识别，使用默认处理`);
      return this.getDefaultScenario(userInput, gameContext);
    }
    
    const bestMatch = matches[0];
    const confidence = Math.min(bestMatch.score / 100, 1); // 归一化到0-1
    
    console.log(`[场景识别] 最佳匹配: ${bestMatch.rule.type} (置信度: ${confidence.toFixed(2)})`);
    console.log(`[场景识别] 匹配原因: ${bestMatch.reasons.join(', ')}`);
    
    return {
      type: bestMatch.rule.type,
      confidence,
      matchedRule: bestMatch.rule,
      reasoning: bestMatch.reasons.join(', ')
    };
  }
  
  /**
   * 计算匹配得分
   */
  private static calculateMatchScore(
    input: string, 
    rule: ScenarioRule, 
    context?: GameContext
  ): { score: number; reasons: string[] } {
    
    let score = 0;
    const reasons: string[] = [];
    
    // 1. 关键词匹配
    const keywordMatches = rule.keywords.filter(keyword => 
      input.includes(keyword)
    );
    if (keywordMatches.length > 0) {
      score += keywordMatches.length * 20;
      reasons.push(`关键词匹配: ${keywordMatches.join(', ')}`);
    }
    
    // 2. 正则表达式匹配
    const patternMatches = rule.patterns.filter(pattern => 
      pattern.test(input)
    );
    if (patternMatches.length > 0) {
      score += patternMatches.length * 25;
      reasons.push(`模式匹配: ${patternMatches.length}个`);
    }
    
    // 3. 上下文线索
    if (context) {
      const contextText = [
        context.currentLocation,
        ...(context.recentActions || []),
        ...(context.nearbyObjects || []),
        context.playerState
      ].filter(Boolean).join(' ');
      
      const contextMatches = rule.contextClues.filter(clue =>
        contextText.includes(clue)
      );
      
      if (contextMatches.length > 0) {
        score += contextMatches.length * 15;
        reasons.push(`上下文匹配: ${contextMatches.join(', ')}`);
      }
    }
    
    // 4. 基础置信度加成
    if (score > 0) {
      score *= rule.confidence;
      reasons.push(`基础置信度: ${rule.confidence}`);
    }
    
    return { score, reasons };
  }
  
  /**
   * 默认场景处理（兜底机制）
   */
  private static getDefaultScenario(
    input: string, 
    context?: GameContext
  ): {
    type: ScenarioType;
    confidence: number;
    matchedRule: ScenarioRule;
    reasoning: string;
  } {
    
    // 根据上下文推测
    if (context?.nearbyObjects?.some(obj => 
      ['敌人', '怪物', '对手'].some(enemy => obj.includes(enemy))
    )) {
      console.log(`[默认处理] 检测到敌人，推测为战斗`);
      return {
        type: ScenarioType.COMBAT,
        confidence: 0.5,
        matchedRule: this.rules.find(r => r.type === ScenarioType.COMBAT)!,
        reasoning: '上下文推测：附近有敌人'
      };
    }
    
    // 检查是否包含人际互动词汇
    const socialWords = ['说', '问', '看', '告诉', '询问'];
    if (socialWords.some(word => input.includes(word))) {
      console.log(`[默认处理] 检测到社交词汇，推测为社交`);
      return {
        type: ScenarioType.SOCIAL,
        confidence: 0.4,
        matchedRule: this.rules.find(r => r.type === ScenarioType.SOCIAL)!,
        reasoning: '默认推测：包含社交词汇'
      };
    }
    
    // 最终兜底：探索
    console.log(`[默认处理] 无法识别，默认为探索`);
    return {
      type: ScenarioType.EXPLORATION,
      confidence: 0.3,
      matchedRule: this.rules.find(r => r.type === ScenarioType.EXPLORATION)!,
      reasoning: '默认处理：无法识别的行动归类为探索'
    };
  }
  
  /**
   * 添加自定义规则
   */
  static addCustomRule(rule: ScenarioRule): void {
    this.rules.push(rule);
    console.log(`[场景识别] 添加自定义规则: ${rule.type}`);
  }
  
  /**
   * 批量测试识别效果
   */
  static testRecognition(testCases: Array<{
    input: string;
    expected: ScenarioType;
    context?: GameContext;
  }>): void {
    
    console.log('=== 场景识别测试 ===');
    let correct = 0;
    
    testCases.forEach((testCase, index) => {
      const result = this.recognizeScenario(testCase.input, testCase.context);
      const isCorrect = result.type === testCase.expected;
      
      console.log(`测试 ${index + 1}: "${testCase.input}"`);
      console.log(`  预期: ${testCase.expected}`);
      console.log(`  识别: ${result.type} (置信度: ${result.confidence.toFixed(2)})`);
      console.log(`  结果: ${isCorrect ? '✅正确' : '❌错误'}`);
      console.log(`  原因: ${result.reasoning}\n`);
      
      if (isCorrect) correct++;
    });
    
    console.log(`识别准确率: ${correct}/${testCases.length} (${(correct/testCases.length*100).toFixed(1)}%)`);
  }
}

/**
 * 智能场景处理器 - 整合识别和计算
 */
export class SmartScenarioProcessor {
  
  /**
   * 处理用户输入的完整流程
   */
  static async processUserInput(
    userInput: string,
    gameContext?: GameContext,
    playerData?: any
  ) {
    
    console.log('\n=== 智能场景处理开始 ===');
    
    // 1. 场景识别
    const recognition = ScenarioRecognizer.recognizeScenario(userInput, gameContext);
    
    // 2. 如果置信度太低，询问用户确认
    if (recognition.confidence < 0.6) {
      console.log(`[处理器] 置信度较低(${recognition.confidence.toFixed(2)})，建议向用户确认`);
      
      // 生成确认提示
      const suggestions = this.generateAlternatives(userInput, gameContext);
      return {
        needConfirmation: true,
        recognizedType: recognition.type,
        confidence: recognition.confidence,
        suggestions,
        userInput
      };
    }
    
    // 3. 继续使用计算框架处理
    console.log(`[处理器] 识别成功，使用${recognition.type}计算框架`);
    
    return {
      needConfirmation: false,
      recognizedType: recognition.type,
      confidence: recognition.confidence,
      reasoning: recognition.reasoning,
      // 这里会调用之前的UniversalCalculationFramework
      readyForCalculation: true
    };
  }
  
  /**
   * 生成可能的替代选项
   */
  private static generateAlternatives(input: string, context?: GameContext): string[] {
    const alternatives = [];
    
    // 基于输入生成建议
    if (input.includes('攻击') || input.includes('打')) {
      alternatives.push('战斗');
    }
    if (input.includes('修炼') || input.includes('练功')) {
      alternatives.push('修炼');
    }
    if (input.includes('说') || input.includes('聊')) {
      alternatives.push('社交对话');
    }
    
    // 如果没有明确建议，提供通用选项
    if (alternatives.length === 0) {
      alternatives.push('探索环境', '与NPC对话', '查看物品');
    }
    
    return alternatives;
  }
}

// 预设测试用例
export const TEST_CASES = [
  { input: '我要攻击那个魔修', expected: ScenarioType.COMBAT },
  { input: '修炼太上忘情诀', expected: ScenarioType.CULTIVATION },
  { input: '突破到元婴境界', expected: ScenarioType.BREAKTHROUGH },
  { input: '炼制九转金丹', expected: ScenarioType.ALCHEMY },
  { input: '锻造一把飞剑', expected: ScenarioType.CRAFTING },
  { input: '破解这个阵法', expected: ScenarioType.FORMATION_BREAKING },
  { input: '向师姐表白', expected: ScenarioType.SOCIAL },
  { input: '探索这个洞穴', expected: ScenarioType.EXPLORATION },
  { input: '和商人讨价还价', expected: ScenarioType.NEGOTIATION },
  { input: '服用疗伤丹药', expected: ScenarioType.PILL_ABSORPTION },
  { input: '驯服这只火鸾', expected: ScenarioType.BEAST_TAMING },
  
  // 模糊输入测试
  { input: '打他', expected: ScenarioType.COMBAT },
  { input: '我要变强', expected: ScenarioType.CULTIVATION },
  { input: '好想要那个美女', expected: ScenarioType.SOCIAL },
  { input: '这是什么地方', expected: ScenarioType.EXPLORATION }
];

export { ScenarioRecognizer, SmartScenarioProcessor };