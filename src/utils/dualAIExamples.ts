/**
 * 双AI系统使用示例和配置指南
 * 演示如何配置和使用辅助AI + 主AI的完整流程
 */

import { DualAISystem, processUserInputDualAI, checkDualAIConfiguration } from './dualAISystem';
import { LuckLevel } from './calculationSystem';

/**
 * 完整的双AI使用示例
 */
export async function dualAIUsageExample() {
  console.log('=== 双AI系统使用示例 ===\n');
  
  // 检查系统配置
  console.log('🔍 检查系统配置...');
  const config = checkDualAIConfiguration();
  console.log(`辅助AI: ${config.assistantAI ? '✅' : '❌'}`);
  console.log(`主AI: ${config.mainAI ? '✅' : '❌'}`);
  console.log(`建议: ${config.recommendation}\n`);
  
  // 模拟游戏上下文
  const gameContext = {
    location: '青云山洞府',
    recentActions: ['修炼太上忘情诀', '炼制回气丹'],
    nearbyObjects: ['师妹', '丹炉', '飞剑', '古籍'],
    playerState: '精神饱满'
  };
  
  const playerData = {
    realm: 4,
    stage: '后期' as const,
    attributes: {
      strength: 75,
      intelligence: 80,
      charm: 60,
      constitution: 85
    },
    luck: LuckLevel.LUCKY
  };
  
  // 测试不同类型的用户输入
  const testInputs = [
    {
      input: '我要突破到元婴圆满',
      description: '突破场景 - 应该使用程序计算基础成功率'
    },
    {
      input: '向师妹表达爱意',
      description: '社交场景 - 应该完全交给AI判断'
    },
    {
      input: '攻击那个入侵的魔修',
      description: '战斗场景 - 混合处理，程序算战力，AI算过程'
    },
    {
      input: '炼制九转金丹',
      description: '炼丹场景 - 混合处理，考虑材料和技艺'
    },
    {
      input: '我想去外面看看',
      description: '模糊输入 - 测试默认处理'
    }
  ];
  
  for (let i = 0; i < testInputs.length; i++) {
    const test = testInputs[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`测试 ${i + 1}: ${test.description}`);
    console.log(`用户输入: "${test.input}"`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      const startTime = Date.now();
      const result = await processUserInputDualAI(test.input, gameContext, playerData);
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ 处理完成 (${totalTime}ms)`);
      console.log('📝 最终生成内容:');
      console.log(result);
      
    } catch (error) {
      console.error('❌ 处理失败:', error);
    }
    
    // 添加延时避免API限制
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * 详细的双AI流程演示
 */
export async function detailedDualAIDemo() {
  console.log('\n=== 详细双AI流程演示 ===\n');
  
  const dualAI = new DualAISystem();
  
  // 第一步：辅助AI处理
  console.log('📍 第一步：辅助AI场景识别');
  const assistantResult = await dualAI.assistantAIProcess({
    type: 'scenario_recognition',
    userInput: '我要突破到金丹期',
    gameContext: {
      location: '静心室',
      nearbyObjects: ['蒲团', '香炉', '护法阵'],
      playerState: '心境平和'
    },
    playerData: {
      realm: 2,
      stage: '圆满',
      attributes: { constitution: 75, intelligence: 70 },
      luck: LuckLevel.BLESSED
    }
  });
  
  if (assistantResult) {
    console.log('🤖 辅助AI分析结果:');
    console.log(`场景类型: ${assistantResult.scenario_type}`);
    console.log(`置信度: ${assistantResult.confidence}`);
    console.log(`推荐处理: ${assistantResult.recommended_processing}`);
    console.log(`成功率: ${assistantResult.basic_calculation?.success_rate?.toFixed(1)}%`);
    console.log(`关键因素: ${assistantResult.factors_to_consider.join(', ')}`);
    console.log(`理由: ${assistantResult.reasoning}`);
    
    // 第二步：主AI处理
    console.log('\n🎭 第二步：主AI内容生成');
    const finalContent = await dualAI.mainAIProcess(
      assistantResult,
      '我要突破到金丹期',
      {
        name: '李逍遥',
        境界: '筑基圆满',
        天赋: ['绝世天才', '剑心通明'],
        状态: ['心境平和', '灵力充沛'],
        装备: ['护心镜', '聚灵珠'],
        环境: '静心室中灵气浓郁'
      }
    );
    
    console.log('✨ 主AI生成内容:');
    console.log(finalContent);
  } else {
    console.log('❌ 辅助AI处理失败');
  }
}

/**
 * 配置指南和最佳实践
 */
export function dualAIConfigurationGuide() {
  console.log('\n=== 双AI系统配置指南 ===\n');
  
  console.log('📋 配置步骤:');
  console.log('1. 主AI (必需): 确保在SillyTavern环境中运行');
  console.log('2. 辅助AI (可选): 在设置中配置第二API');
  console.log('');
  
  console.log('🔧 辅助AI配置选项:');
  console.log('- OpenAI GPT-3.5/4: 快速准确，成本较高');
  console.log('- Anthropic Claude: 理解能力强，适合复杂场景');
  console.log('- 本地模型: 无成本，但需要足够性能');
  console.log('- 自定义API: 支持其他兼容接口');
  console.log('');
  
  console.log('⚡ 性能优化建议:');
  console.log('- 辅助AI使用轻量模型 (如GPT-3.5-turbo)');
  console.log('- 设置合理的超时时间 (5-10秒)');
  console.log('- 配置重试机制应对网络问题');
  console.log('- 启用本地缓存减少重复请求');
  console.log('');
  
  console.log('💰 成本控制:');
  console.log('- 辅助AI每次调用约100-300 tokens');
  console.log('- 主AI根据生成内容长度变化');
  console.log('- 建议设置每日使用限额');
  console.log('- 可以关闭辅助AI仅使用主AI');
  console.log('');
  
  console.log('🛡️ 备用方案:');
  console.log('- 辅助AI失败时自动使用关键词匹配');
  console.log('- 主AI失败时提供基础文本响应');
  console.log('- 完全离线时使用程序化处理');
}

/**
 * 性能基准测试
 */
export async function performanceBenchmark() {
  console.log('\n=== 双AI系统性能测试 ===\n');
  
  const testCases = [
    '攻击敌人',
    '修炼功法', 
    '突破境界',
    '炼制丹药',
    '与师妹交谈',
    '探索洞穴',
    '参悟武学',
    '处理门派事务'
  ];
  
  let totalTime = 0;
  let successCount = 0;
  const results: Array<{input: string; time: number; success: boolean}> = [];
  
  console.log('开始性能测试...\n');
  
  for (const testCase of testCases) {
    const startTime = Date.now();
    
    try {
      await processUserInputDualAI(testCase, {}, {
        realm: 3,
        stage: '中期',
        attributes: { strength: 70 },
        luck: LuckLevel.NORMAL
      });
      
      const time = Date.now() - startTime;
      totalTime += time;
      successCount++;
      
      results.push({ input: testCase, time, success: true });
      console.log(`✅ "${testCase}" - ${time}ms`);
      
    } catch (error) {
      const time = Date.now() - startTime;
      results.push({ input: testCase, time, success: false });
      console.log(`❌ "${testCase}" - 失败 (${time}ms)`);
    }
    
    // 避免API限制
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 性能统计:');
  console.log(`成功率: ${successCount}/${testCases.length} (${(successCount/testCases.length*100).toFixed(1)}%)`);
  console.log(`平均响应时间: ${(totalTime/testCases.length).toFixed(0)}ms`);
  console.log(`最快响应: ${Math.min(...results.map(r => r.time))}ms`);
  console.log(`最慢响应: ${Math.max(...results.map(r => r.time))}ms`);
  
  const fastCount = results.filter(r => r.time < 3000).length;
  console.log(`3秒内响应: ${fastCount}/${testCases.length} (${(fastCount/testCases.length*100).toFixed(1)}%)`);
}

/**
 * 故障排查助手
 */
export async function troubleshootDualAI() {
  console.log('\n=== 双AI系统故障排查 ===\n');
  
  const config = checkDualAIConfiguration();
  
  console.log('🔍 系统检查:');
  console.log(`辅助AI状态: ${config.assistantAI ? '✅ 正常' : '❌ 未配置'}`);
  console.log(`主AI状态: ${config.mainAI ? '✅ 正常' : '❌ 未配置'}`);
  
  if (!config.assistantAI) {
    console.log('\n🛠️ 辅助AI问题排查:');
    console.log('- 检查是否在设置中启用了第二API');
    console.log('- 验证API密钥是否正确配置');
    console.log('- 确认API端点URL是否可访问');
    console.log('- 检查网络连接状态');
  }
  
  if (!config.mainAI) {
    console.log('\n🛠️ 主AI问题排查:');
    console.log('- 确认是否在SillyTavern环境中运行');
    console.log('- 检查TavernHelper是否正确加载');
    console.log('- 验证iframe权限设置');
  }
  
  // 测试辅助AI连接
  if (config.assistantAI) {
    console.log('\n🧪 测试辅助AI连接...');
    try {
      const dualAI = new DualAISystem();
      const result = await dualAI.assistantAIProcess({
        type: 'scenario_recognition',
        userInput: '测试连接'
      });
      
      if (result) {
        console.log('✅ 辅助AI连接正常');
      } else {
        console.log('❌ 辅助AI响应异常');
      }
    } catch (error) {
      console.log('❌ 辅助AI连接失败:', error);
    }
  }
  
  // 测试主AI连接
  if (config.mainAI) {
    console.log('\n🧪 测试主AI连接...');
    try {
      const dualAI = new DualAISystem();
      const result = await dualAI.mainAIProcess(
        {
          scenario_type: 'test',
          confidence: 1,
          factors_to_consider: [],
          recommended_processing: 'balanced',
          reasoning: '连接测试'
        },
        '测试连接',
        {}
      );
      
      if (result && result.trim()) {
        console.log('✅ 主AI连接正常');
      } else {
        console.log('❌ 主AI响应异常');
      }
    } catch (error) {
      console.log('❌ 主AI连接失败:', error);
    }
  }
  
  console.log(`\n💡 建议: ${config.recommendation}`);
}

// 导出所有功能
export {
  dualAIUsageExample,
  detailedDualAIDemo,
  dualAIConfigurationGuide,
  performanceBenchmark,
  troubleshootDualAI
};