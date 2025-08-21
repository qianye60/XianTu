/**
 * 完整的用户输入处理流程
 * 从用户输入 -> 场景识别 -> 计算框架 -> AI生成 -> 最终结果
 */

import { ScenarioRecognizer, SmartScenarioProcessor, TEST_CASES } from './scenarioRecognizer';
import { UniversalCalculationFramework, ScenarioType, InfluenceFactorBuilder } from './universalCalculationFramework';
import { LuckLevel, generateRandomLuck } from './calculationSystem';
import type { RealmStage } from '../types/game';

/**
 * 完整处理流程演示
 */
export class CompleteGameFlowDemo {
  
  /**
   * 处理单个用户输入的完整流程
   */
  static async handleUserInput(
    userInput: string,
    playerData = {
      level: 4,
      stage: '中期' as RealmStage,
      primaryAttr: 75,
      secondaryAttr: 65,
      luck: LuckLevel.NORMAL
    },
    gameContext = {
      currentLocation: '青云山洞府',
      recentActions: ['修炼', '炼丹'],
      nearbyObjects: ['丹炉', '师妹', '飞剑'],
      playerState: '状态良好'
    }
  ) {
    
    console.log(`\n=== 处理用户输入: "${userInput}" ===`);
    
    // 第一步：智能场景识别
    console.log('\n📍 第一步：场景识别');
    const processingResult = await SmartScenarioProcessor.processUserInput(
      userInput, 
      gameContext, 
      playerData
    );
    
    // 如果需要用户确认
    if (processingResult.needConfirmation) {
      console.log('❓ 需要用户确认场景类型');
      console.log(`   识别结果: ${processingResult.recognizedType} (置信度: ${processingResult.confidence.toFixed(2)})`);
      console.log(`   建议选项: ${processingResult.suggestions?.join(', ')}`);
      console.log('   -> 实际游戏中会弹出选择框让用户确认');
      return {
        status: 'need_confirmation',
        ...processingResult
      };
    }
    
    console.log(`✅ 场景识别成功: ${processingResult.recognizedType}`);
    console.log(`   置信度: ${processingResult.confidence.toFixed(2)}`);
    console.log(`   原因: ${processingResult.reasoning}`);
    
    // 第二步：构建影响因子（根据上下文自动推断）
    console.log('\n🔧 第二步：构建影响因子');
    const factors = this.buildFactorsFromContext(gameContext, processingResult.recognizedType);
    console.log(`   自动识别到 ${factors.length} 个影响因子`);
    factors.forEach(f => console.log(`   - ${f.name}: ${f.textEffect}`));
    
    // 第三步：计算框架处理
    console.log('\n⚙️ 第三步：计算处理');
    const calculationResult = await UniversalCalculationFramework.processScenario(
      processingResult.recognizedType as ScenarioType,
      userInput,
      {
        playerLevel: playerData.level,
        playerStage: playerData.stage,
        primaryAttribute: playerData.primaryAttr,
        secondaryAttribute: playerData.secondaryAttr,
        luck: playerData.luck,
        difficulty: this.estimateDifficulty(userInput, gameContext),
        influenceFactors: factors
      }
    );
    
    console.log(`   计算方式: ${calculationResult.calculationMethod}`);
    if (calculationResult.baseSuccessRate) {
      console.log(`   成功率: ${calculationResult.baseSuccessRate.toFixed(1)}%`);
    }
    if (calculationResult.baseEffectValue) {
      console.log(`   效果值: ${calculationResult.baseEffectValue.toFixed(1)}`);
    }
    
    // 第四步：生成AI提示词
    console.log('\n🤖 第四步：生成AI提示词');
    const aiPrompt = this.generateAIPrompt(calculationResult, userInput);
    console.log('   AI提示词已生成（实际游戏中会发送给AI）');
    
    // 第五步：模拟AI响应
    console.log('\n✨ 第五步：模拟AI生成内容');
    const simulatedAIResponse = this.simulateAIResponse(calculationResult, userInput);
    console.log(`   AI生成的游戏内容:\n${simulatedAIResponse}`);
    
    return {
      status: 'success',
      recognizedType: processingResult.recognizedType,
      confidence: processingResult.confidence,
      calculationResult,
      aiPrompt,
      finalContent: simulatedAIResponse
    };
  }
  
  /**
   * 根据上下文自动构建影响因子
   */
  private static buildFactorsFromContext(context: any, scenarioType: ScenarioType): any[] {
    const builder = new InfluenceFactorBuilder();
    
    // 根据附近物品推断影响因子
    context.nearbyObjects?.forEach((obj: string) => {
      if (obj.includes('剑') || obj.includes('刀')) {
        builder.addEquipment(obj, `手持${obj}，攻击力提升`, 10, 'major');
      } else if (obj.includes('丹炉')) {
        builder.addEquipment('丹炉', '有炼丹设备，炼丹成功率提升', 15, 'major');
      } else if (obj.includes('师妹') || obj.includes('美女')) {
        builder.addRelationship('异性在场', '有异性在场，可能影响心境', undefined, 'minor');
      }
    });
    
    // 根据最近行动推断状态
    context.recentActions?.forEach((action: string) => {
      if (action.includes('修炼')) {
        builder.addSpecial('刚刚修炼', '刚完成修炼，灵力充沛', 5, 'minor');
      } else if (action.includes('战斗')) {
        builder.addSpecial('战斗疲劳', '刚经历战斗，略有疲劳', -3, 'minor');
      }
    });
    
    // 根据场景类型添加相关因子
    if (scenarioType === ScenarioType.SOCIAL) {
      builder.addTalent('魅力', '天生具有一定魅力', 5, 'major');
    } else if (scenarioType === ScenarioType.COMBAT) {
      builder.addTalent('战斗经验', '丰富的战斗经验', 10, 'major');
    }
    
    return builder.build();
  }
  
  /**
   * 估算难度
   */
  private static estimateDifficulty(input: string, context: any): number {
    let difficulty = 5; // 基础难度
    
    // 根据用词判断难度
    if (input.includes('大') || input.includes('强')) difficulty += 2;
    if (input.includes('轻松') || input.includes('简单')) difficulty -= 2;
    if (input.includes('困难') || input.includes('艰难')) difficulty += 3;
    
    // 根据上下文调整
    if (context.nearbyObjects?.some((obj: string) => obj.includes('敌人'))) {
      difficulty += 2;
    }
    
    return Math.max(1, Math.min(10, difficulty));
  }
  
  /**
   * 生成AI提示词
   */
  private static generateAIPrompt(calculationResult: any, userInput: string): string {
    return `
【修仙游戏AI助手】请为以下场景生成游戏内容：

用户行动: ${userInput}
场景类型: ${calculationResult.scenarioType}
计算方式: ${calculationResult.calculationMethod}

程序计算结果:
${calculationResult.baseSuccessRate ? `- 成功率: ${calculationResult.baseSuccessRate.toFixed(1)}%` : ''}
${calculationResult.baseEffectValue ? `- 效果值: ${calculationResult.baseEffectValue.toFixed(1)}` : ''}
${calculationResult.calculationBreakdown ? `- 计算详情: ${JSON.stringify(calculationResult.calculationBreakdown, null, 2)}` : ''}

影响因子:
${calculationResult.aiContext.influenceFactors.map((f: any) => 
  `- 【${f.type}】${f.name}: ${f.textEffect} (${f.importance})`
).join('\n')}

场景描述: ${calculationResult.aiContext.scenario}
玩家状态: ${calculationResult.aiContext.playerContext}

请求:
1. 根据程序计算的数值结果，生成生动的场景描述
2. 充分考虑所有影响因子的文字效果
3. 不要修改程序计算的数值，专注于文字渲染
4. 生成有趣且符合修仙世界观的结果

处理建议: ${calculationResult.recommendedApproach}
    `.trim();
  }
  
  /**
   * 模拟AI响应
   */
  private static simulateAIResponse(calculationResult: any, userInput: string): string {
    const type = calculationResult.scenarioType;
    
    switch (type) {
      case ScenarioType.COMBAT:
        return `你握紧手中的${calculationResult.aiContext.influenceFactors.find((f: any) => f.type === 'equipment')?.name || '武器'}，战意昂扬。
基于你的实力评估(${calculationResult.baseEffectValue?.toFixed(1) || 'unknown'})和当前状况，这场战斗${calculationResult.baseSuccessRate > 70 ? '胜算很大' : calculationResult.baseSuccessRate > 40 ? '势均力敌' : '颇为凶险'}。
周围的${calculationResult.aiContext.influenceFactors.filter((f: any) => f.type === 'environment').map((f: any) => f.name).join('、')}为这场对决增添了变数...`;
        
      case ScenarioType.CULTIVATION:
        return `你盘膝而坐，开始修炼。周围的灵气缓缓汇聚，你的修为正在稳步提升。
根据你的修炼条件评估，预计能获得${calculationResult.baseEffectValue?.toFixed(1) || '适量的'}修为增长。
${calculationResult.aiContext.influenceFactors.length > 0 ? `有了${calculationResult.aiContext.influenceFactors.map((f: any) => f.name).join('、')}的辅助，修炼效果更上一层楼。` : ''}`;
        
      case ScenarioType.SOCIAL:
        return `面对眼前的${calculationResult.aiContext.influenceFactors.find((f: any) => f.type === 'relationship')?.name || '人'}，你鼓起勇气开口。
你的魅力和当前状态${calculationResult.baseEffectValue ? `(评分${calculationResult.baseEffectValue.toFixed(1)})` : ''}让你在社交中游刃有余。
${calculationResult.aiContext.influenceFactors.filter((f: any) => f.type === 'environment').length > 0 ? 
  `${calculationResult.aiContext.influenceFactors.filter((f: any) => f.type === 'environment')[0].name}的氛围为你们的对话增添了几分温馨...` : ''}`;
        
      default:
        return `你的行动"${userInput}"正在进行中...
基于当前的评估结果(${calculationResult.baseEffectValue?.toFixed(1) || calculationResult.baseSuccessRate?.toFixed(1) + '%' || '未知'})，
这次行动${calculationResult.calculationMethod === 'ai_judgment' ? '的结果将完全取决于具体情况的发展' : '有着明确的成功预期'}。`;
    }
  }
}

/**
 * 批量测试完整流程
 */
export async function testCompleteFlow() {
  console.log('=== 完整流程测试 ===\n');
  
  const testInputs = [
    '我要攻击那个邪修',
    '修炼太上忘情诀',
    '向师妹表白',
    '炼制九转金丹',
    '我想变强',
    '打死那家伙',
    '好无聊啊',
    '探索这个神秘洞穴'
  ];
  
  for (let i = 0; i < testInputs.length; i++) {
    const input = testInputs[i];
    console.log(`\n${'='.repeat(50)}`);
    console.log(`测试 ${i + 1}/${testInputs.length}: "${input}"`);
    console.log(`${'='.repeat(50)}`);
    
    try {
      const result = await CompleteGameFlowDemo.handleUserInput(input);
      
      if (result.status === 'need_confirmation') {
        console.log('⚠️ 此输入需要用户确认场景类型');
      } else {
        console.log('✅ 处理成功');
        console.log(`最终识别: ${result.recognizedType}`);
        console.log(`置信度: ${result.confidence.toFixed(2)}`);
      }
    } catch (error) {
      console.error('❌ 处理失败:', error);
    }
    
    // 添加延时避免输出混乱
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * 场景识别准确性测试
 */
export function testRecognitionAccuracy() {
  console.log('\n=== 场景识别准确性测试 ===');
  ScenarioRecognizer.testRecognition(TEST_CASES);
}

/**
 * 启动完整测试
 */
export async function runAllTests() {
  console.log('🚀 开始完整测试流程\n');
  
  // 1. 测试场景识别准确性
  testRecognitionAccuracy();
  
  // 2. 测试完整处理流程
  await testCompleteFlow();
  
  console.log('\n✨ 所有测试完成！');
}

export { CompleteGameFlowDemo };