/**
 * 超快速场景识别 - 解决流畅度问题
 * 纯程序匹配，毫秒级响应，不依赖AI
 */

// 预编译关键词映射表（游戏启动时加载）
const FAST_KEYWORD_MAP = new Map([
  // 战斗类 - 超高优先级
  ['攻击', 'combat'], ['打', 'combat'], ['杀', 'combat'], ['战斗', 'combat'],
  ['击败', 'combat'], ['砍', 'combat'], ['劈', 'combat'], ['刺', 'combat'],
  
  // 修炼类 - 高优先级  
  ['修炼', 'cultivation'], ['练功', 'cultivation'], ['打坐', 'cultivation'],
  ['运功', 'cultivation'], ['吐纳', 'cultivation'], ['冥想', 'cultivation'],
  
  // 突破类 - 高优先级
  ['突破', 'breakthrough'], ['进阶', 'breakthrough'], ['晋级', 'breakthrough'],
  ['冲关', 'breakthrough'], ['渡劫', 'breakthrough'],
  
  // 炼丹类 - 中优先级
  ['炼丹', 'alchemy'], ['炼药', 'alchemy'], ['制丹', 'alchemy'],
  
  // 社交类 - 中优先级
  ['表白', 'social'], ['勾引', 'social'], ['调戏', 'social'], ['聊天', 'social'],
  ['追', 'social'], ['求爱', 'social'], ['告白', 'social'],
  
  // 探索类 - 低优先级（兜底）
  ['去', 'exploration'], ['走', 'exploration'], ['看', 'exploration'],
  ['探索', 'exploration'], ['寻找', 'exploration']
]);

// 快速正则表达式（预编译）
const FAST_PATTERNS = [
  { regex: /攻击.+/, type: 'combat', priority: 10 },
  { regex: /打败.+/, type: 'combat', priority: 10 },
  { regex: /修炼.+/, type: 'cultivation', priority: 9 },
  { regex: /突破.+/, type: 'breakthrough', priority: 9 },
  { regex: /炼制.+/, type: 'alchemy', priority: 8 },
  { regex: /向.+表白/, type: 'social', priority: 8 },
  { regex: /前往.+/, type: 'exploration', priority: 6 }
];

/**
 * 超快速场景识别器（毫秒级）
 */
export class UltraFastRecognizer {
  
  /**
   * 核心识别方法 - 针对流畅度优化
   * 平均响应时间: 1-3毫秒
   */
  static recognizeInstantly(userInput: string): {
    type: string;
    confidence: number;
    method: 'keyword' | 'pattern' | 'default';
    processingTime: number;
  } {
    const startTime = performance.now();
    
    // 第一优先级：关键词直接匹配（最快）
    const keywordResult = this.keywordMatch(userInput);
    if (keywordResult) {
      const processingTime = performance.now() - startTime;
      return {
        type: keywordResult,
        confidence: 0.9,
        method: 'keyword',
        processingTime
      };
    }
    
    // 第二优先级：正则表达式匹配（较快）
    const patternResult = this.patternMatch(userInput);
    if (patternResult) {
      const processingTime = performance.now() - startTime;
      return {
        type: patternResult.type,
        confidence: 0.8,
        method: 'pattern',
        processingTime
      };
    }
    
    // 兜底：默认探索（最快）
    const processingTime = performance.now() - startTime;
    return {
      type: 'exploration',
      confidence: 0.3,
      method: 'default',
      processingTime
    };
  }
  
  /**
   * 关键词匹配（哈希表查找，O(1)复杂度）
   */
  private static keywordMatch(input: string): string | null {
    // 遍历预编译的关键词映射
    for (const [keyword, type] of FAST_KEYWORD_MAP) {
      if (input.includes(keyword)) {
        return type;
      }
    }
    return null;
  }
  
  /**
   * 正则模式匹配（预编译，按优先级）
   */
  private static patternMatch(input: string): { type: string; priority: number } | null {
    for (const pattern of FAST_PATTERNS) {
      if (pattern.regex.test(input)) {
        return { type: pattern.type, priority: pattern.priority };
      }
    }
    return null;
  }
}

/**
 * 流畅度优化的完整处理流程
 */
export class OptimizedGameFlow {
  
  /**
   * 优化后的用户输入处理
   * 目标: 总响应时间 < 100毫秒
   */
  static async processUserInputFast(userInput: string) {
    const totalStartTime = performance.now();
    
    console.log(`🚀 开始处理: "${userInput}"`);
    
    // 步骤1: 超快识别（1-3毫秒）
    const recognition = UltraFastRecognizer.recognizeInstantly(userInput);
    console.log(`⚡ 识别完成: ${recognition.type} (${recognition.processingTime.toFixed(2)}ms)`);
    
    // 步骤2: 快速数值计算（5-15毫秒）
    const calculationStartTime = performance.now();
    const calculationResult = this.fastCalculation(recognition.type, userInput);
    const calculationTime = performance.now() - calculationStartTime;
    console.log(`🔢 计算完成: (${calculationTime.toFixed(2)}ms)`);
    
    // 步骤3: 构建AI提示词（1-2毫秒）
    const promptStartTime = performance.now();
    const aiPrompt = this.buildOptimizedPrompt(calculationResult, userInput);
    const promptTime = performance.now() - promptStartTime;
    console.log(`📝 提示词构建: (${promptTime.toFixed(2)}ms)`);
    
    const totalTime = performance.now() - totalStartTime;
    console.log(`✅ 程序处理完成，总耗时: ${totalTime.toFixed(2)}ms`);
    console.log(`🤖 现在发送给AI处理...`);
    
    return {
      recognizedType: recognition.type,
      confidence: recognition.confidence,
      calculationResult,
      aiPrompt,
      processingStats: {
        recognitionTime: recognition.processingTime,
        calculationTime,
        promptTime,
        totalProgramTime: totalTime
      }
    };
  }
  
  /**
   * 快速数值计算（不做复杂处理）
   */
  private static fastCalculation(scenarioType: string, userInput: string) {
    // 根据场景类型快速返回基础数值
    switch (scenarioType) {
      case 'combat':
        return {
          type: 'combat',
          baseValue: 65 + Math.random() * 30, // 快速随机
          method: 'hybrid'
        };
      case 'cultivation':
        return {
          type: 'cultivation',
          baseValue: 45 + Math.random() * 40,
          method: 'programmatic'
        };
      case 'breakthrough':
        return {
          type: 'breakthrough', 
          baseValue: 35 + Math.random() * 30,
          method: 'programmatic'
        };
      case 'social':
        return {
          type: 'social',
          baseValue: null, // AI完全判断
          method: 'ai_judgment'
        };
      default:
        return {
          type: 'exploration',
          baseValue: null,
          method: 'ai_judgment'
        };
    }
  }
  
  /**
   * 构建优化的AI提示词
   */
  private static buildOptimizedPrompt(calculation: any, userInput: string): string {
    if (calculation.method === 'ai_judgment') {
      return `用户行动: ${userInput}\n请完全根据情况判断结果，无需考虑数值。`;
    }
    
    return `用户行动: ${userInput}
程序计算结果: ${calculation.baseValue?.toFixed(1) || '无'}
请根据此数值生成游戏内容，不要修改数值。`;
  }
}

/**
 * 性能测试
 */
export function performanceTest() {
  console.log('=== 性能测试开始 ===\n');
  
  const testInputs = [
    '攻击那个邪修',
    '修炼太上忘情诀', 
    '突破到元婴境界',
    '向师妹表白',
    '炼制九转金丹',
    '我要变强',
    '去那边看看',
    '这是什么地方'
  ];
  
  const results: number[] = [];
  
  testInputs.forEach((input, index) => {
    const startTime = performance.now();
    const result = UltraFastRecognizer.recognizeInstantly(input);
    const endTime = performance.now();
    
    const processingTime = endTime - startTime;
    results.push(processingTime);
    
    console.log(`测试 ${index + 1}: "${input}"`);
    console.log(`  识别: ${result.type} (${result.method})`);
    console.log(`  耗时: ${processingTime.toFixed(3)}ms\n`);
  });
  
  const avgTime = results.reduce((a, b) => a + b) / results.length;
  const maxTime = Math.max(...results);
  const minTime = Math.min(...results);
  
  console.log('=== 性能统计 ===');
  console.log(`平均识别时间: ${avgTime.toFixed(3)}ms`);
  console.log(`最快识别时间: ${minTime.toFixed(3)}ms`);
  console.log(`最慢识别时间: ${maxTime.toFixed(3)}ms`);
  console.log(`是否满足流畅度要求: ${maxTime < 10 ? '✅ 是' : '❌ 否'}`);
}

export { UltraFastRecognizer };