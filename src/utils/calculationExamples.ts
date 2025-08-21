/**
 * 计算系统使用示例
 * 展示如何在游戏中集成程序化计算和AI描述
 */

import {
  LuckLevel,
  calculateBreakthroughChance,
  calculateResourceGain,
  calculateCombatPower,
  generateRandomLuck,
  getLuckDescription
} from './calculationSystem';

import {
  processBreakthroughWithAI,
  processCultivationWithAI,
  processCombatWithAI,
  CalculationAIInterface
} from './calculationAIInterface';

import type { RealmStage } from '../types/game';

/**
 * 示例1: 基础数值计算 (纯程序化)
 */
export function basicCalculationExample() {
  console.log('=== 基础计算示例 ===');
  
  // 生成随机气运
  const luck = generateRandomLuck();
  console.log(`当前气运: ${getLuckDescription(luck)} (${luck})`);
  
  // 计算突破成功率
  const breakthrough = calculateBreakthroughChance(3, '后期', luck, 10);
  console.log('突破计算结果:', breakthrough);
  
  // 计算修炼收益
  const cultivation = calculateResourceGain(100, 3, '后期', luck, 8);
  console.log('修炼收益计算:', cultivation);
  
  // 计算战斗力
  const combat = calculateCombatPower(3, '后期', 20, 500, luck);
  console.log('战斗力计算:', combat);
}

/**
 * 示例2: 计算结果+AI描述 (混合模式)
 */
export async function enhancedCalculationExample() {
  console.log('=== 增强计算示例 ===');
  
  // 突破计算+AI描述
  const breakthrough = await processBreakthroughWithAI(
    4, // 元婴境界
    '圆满', // 圆满阶段
    LuckLevel.BLESSED, // 鸿运当头
    15 // 准备加成
  );
  
  console.log('突破结果(含AI描述):', 
    CalculationAIInterface.formatCalculationResult(breakthrough)
  );
  
  // 修炼计算+AI描述
  const cultivation = await processCultivationWithAI(
    200, // 基础修为
    4,   // 元婴境界
    '圆满', // 圆满阶段
    12   // 修炼12小时
  );
  
  console.log('修炼结果(含AI描述):', 
    CalculationAIInterface.formatCalculationResult(cultivation)
  );
}

/**
 * 示例3: 批量计算
 */
export async function batchCalculationExample() {
  console.log('=== 批量计算示例 ===');
  
  const calculations = [
    {
      type: 'breakthrough',
      params: [2, '中期', LuckLevel.NORMAL, 5]
    },
    {
      type: 'cultivation', 
      params: [50, 2, '中期', LuckLevel.LUCKY, 6]
    },
    {
      type: 'combat_power',
      params: [2, '中期', 15, 200, LuckLevel.NORMAL]
    }
  ];
  
  const results = await CalculationAIInterface.batchProcess(calculations);
  
  results.forEach((result, index) => {
    console.log(`批量计算结果 ${index + 1}:`, 
      CalculationAIInterface.formatCalculationResult(result)
    );
  });
}

/**
 * 示例4: 游戏场景集成
 */
export class GameScenarioExample {
  
  /**
   * 突破场景
   */
  static async breakthroughScenario(characterData: {
    realm: number;
    stage: RealmStage;
    preparation: number;
    luck?: LuckLevel;
  }) {
    console.log('=== 突破场景 ===');
    
    const luck = characterData.luck ?? generateRandomLuck();
    console.log(`角色当前状态: ${characterData.realm}级${characterData.stage}`);
    console.log(`准备程度: ${characterData.preparation}分`);
    console.log(`当前气运: ${getLuckDescription(luck)}`);
    
    // 执行突破计算
    const result = await processBreakthroughWithAI(
      characterData.realm,
      characterData.stage,
      luck,
      characterData.preparation
    );
    
    // 根据计算结果决定是否成功
    const roll = Math.random() * 100;
    const success = roll <= result.finalValue;
    
    console.log(`骰子点数: ${roll.toFixed(1)} vs 成功率: ${result.finalValue.toFixed(1)}`);
    console.log(`突破结果: ${success ? '成功！' : '失败'}`);
    
    if (success) {
      console.log('突破成功！角色获得以下提升:');
      // 这里可以添加突破成功后的属性提升逻辑
    } else {
      console.log('突破失败，但获得了宝贵经验:');
      // 这里可以添加失败后的补偿逻辑
    }
    
    return { success, result };
  }
  
  /**
   * 修炼场景
   */
  static async cultivationScenario(characterData: {
    realm: number;
    stage: RealmStage;
    timeAvailable: number;
    baseEfficiency: number;
  }) {
    console.log('=== 修炼场景 ===');
    
    const luck = generateRandomLuck();
    
    // 计算修炼收益
    const result = await processCultivationWithAI(
      characterData.baseEfficiency,
      characterData.realm,
      characterData.stage,
      characterData.timeAvailable,
      luck
    );
    
    console.log(`修炼时长: ${characterData.timeAvailable}小时`);
    console.log(`基础效率: ${characterData.baseEfficiency}/小时`);
    console.log(`当前气运: ${getLuckDescription(luck)}`);
    console.log(`实际收益: ${Math.round(result.finalValue)}点修为`);
    
    // 特殊事件处理
    if (result.criticalSuccess) {
      console.log('🌟 修炼过程中突然顿悟！获得额外收益！');
    } else if (result.criticalFailure) {
      console.log('💥 修炼过程中出现岔子，收益减少...');
    }
    
    return result;
  }
  
  /**
   * 战斗场景
   */
  static async combatScenario(attacker: {
    realm: number;
    stage: RealmStage;
    talents: number;
    equipment: number;
  }, defender: {
    realm: number;
    stage: RealmStage;
    talents: number;
    equipment: number;
  }) {
    console.log('=== 战斗场景 ===');
    
    // 计算双方战斗力
    const attackerPower = await processCombatWithAI(
      attacker.realm,
      attacker.stage,
      attacker.talents,
      attacker.equipment
    );
    
    const defenderPower = await processCombatWithAI(
      defender.realm,
      defender.stage,
      defender.talents,
      defender.equipment
    );
    
    console.log(`攻击方战斗力: ${attackerPower.finalValue}`);
    console.log(`防守方战斗力: ${defenderPower.finalValue}`);
    
    // 战斗结果计算
    const powerRatio = attackerPower.finalValue / defenderPower.finalValue;
    let winChance = 50; // 基础50%
    
    if (powerRatio > 1.5) {
      winChance = 80; // 压倒性优势
    } else if (powerRatio > 1.2) {
      winChance = 65; // 明显优势
    } else if (powerRatio > 0.8) {
      winChance = 50; // 势均力敌
    } else if (powerRatio > 0.6) {
      winChance = 35; // 劣势
    } else {
      winChance = 20; // 明显劣势
    }
    
    const victory = Math.random() * 100 < winChance;
    
    console.log(`胜率评估: ${winChance}%`);
    console.log(`战斗结果: ${victory ? '攻击方胜利' : '防守方胜利'}`);
    
    return {
      victory,
      attackerPower: attackerPower.finalValue,
      defenderPower: defenderPower.finalValue,
      winChance
    };
  }
}

/**
 * 完整游戏流程示例
 */
export async function fullGameExample() {
  console.log('=== 完整游戏流程示例 ===');
  
  // 角色数据
  const character = {
    name: '李逍遥',
    realm: 3,
    stage: '后期' as RealmStage,
    preparation: 12,
    talents: 25,
    equipment: 800
  };
  
  console.log(`角色: ${character.name}`);
  console.log(`当前境界: ${character.realm}级${character.stage}`);
  
  // 1. 修炼阶段
  console.log('\n--- 修炼阶段 ---');
  const cultivationResult = await GameScenarioExample.cultivationScenario({
    realm: character.realm,
    stage: character.stage,
    timeAvailable: 8,
    baseEfficiency: 120
  });
  
  // 2. 尝试突破
  console.log('\n--- 突破阶段 ---');
  const breakthroughResult = await GameScenarioExample.breakthroughScenario({
    realm: character.realm,
    stage: character.stage,
    preparation: character.preparation
  });
  
  // 3. 如果突破成功，更新境界
  if (breakthroughResult.success) {
    if (character.stage === '极境') {
      character.realm += 1;
      character.stage = '初期';
      console.log(`🎉 成功突破到 ${character.realm}级${character.stage}！`);
    } else {
      // 提升到下一个子阶段的逻辑
      const stages: RealmStage[] = ['初期', '中期', '后期', '圆满', '极境'];
      const currentIndex = stages.indexOf(character.stage);
      if (currentIndex < stages.length - 1) {
        character.stage = stages[currentIndex + 1];
        console.log(`🎉 成功突破到 ${character.realm}级${character.stage}！`);
      }
    }
  }
  
  // 4. 战斗场景
  console.log('\n--- 战斗阶段 ---');
  const enemy = {
    realm: character.realm,
    stage: '中期' as RealmStage,
    talents: 20,
    equipment: 600
  };
  
  const combatResult = await GameScenarioExample.combatScenario(character, enemy);
  
  console.log('\n=== 游戏流程结束 ===');
}