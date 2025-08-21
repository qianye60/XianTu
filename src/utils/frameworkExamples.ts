/**
 * 通用计算框架使用示例
 * 展示不同场景下程序计算 + AI整合的完整流程
 */

import { 
  ScenarioType, 
  UniversalCalculationFramework, 
  InfluenceFactorBuilder,
  processGameScenario 
} from './universalCalculationFramework';
import { LuckLevel } from './calculationSystem';
import type { RealmStage } from '../types/game';

/**
 * 示例1：战斗场景（混合计算）
 * 程序计算基础战斗力，AI根据装备、技能、环境等做最终判断
 */
export async function combatExample() {
  console.log('=== 战斗场景示例 ===');
  
  // 构建影响因子
  const factors = new InfluenceFactorBuilder()
    .addEquipment('青锋剑', '削铁如泥，剑身有淡淡青光，攻击时有概率触发剑气', 15, 'major')
    .addEquipment('玄铁护甲', '防御卓越，能减少30%物理伤害', 20, 'major')
    .addTalent('剑心通明', '对剑法的理解达到炉火纯青的境界，剑招威力+50%', 25, 'critical')
    .addEnvironment('雷雨夜', '电闪雷鸣，影响视线，但雷电之力可能被引导', undefined, 'minor')
    .addRelationship('师门声誉', '如果败给魔道中人，将有损师门清誉', undefined, 'major')
    .addSpecial('愤怒状态', '看到师兄被害，内心愤怒，战意高涨', 10, 'major')
    .build();
  
  const result = await processGameScenario(
    ScenarioType.COMBAT,
    '在雷雨夜的山崖上，与杀害师兄的魔道高手决一死战',
    {
      level: 4,        // 元婴境界
      stage: '后期',   // 元婴后期
      primaryAttr: 75, // 攻击力
      secondaryAttr: 65, // 防御力
      luck: LuckLevel.LUCKY
    },
    7, // 高难度敌人
    factors
  );
  
  console.log('战斗计算结果:', result);
  console.log('\n程序提供给AI的信息:');
  console.log('- 基础战斗数值:', result.baseEffectValue);
  console.log('- 所有影响因子:', result.aiContext.influenceFactors.length, '个');
  console.log('- AI需要整合的信息:', result.aiContext);
  console.log('- 推荐处理方式:', result.recommendedApproach);
  
  // AI将根据这些信息生成类似这样的内容：
  console.log('\n=== AI可能生成的战斗描述 ===');
  console.log(`雷电交加的夜晚，你手持青锋剑面对杀师仇人。愤怒让你的剑意更加凌厉，
每一剑都带着复仇的怒火。玄铁护甲在雷光下闪闪发亮，为你提供可靠的防护。
师门的声誉和师兄的仇恨让你不能败，剑心通明的境界让你的剑招威力大增...
基于战斗力评估(${result.baseEffectValue?.toFixed(1)})和所有影响因素，这场战斗...`);
}

/**
 * 示例2：炼丹场景（混合计算）
 * 程序计算基础成功率，AI根据丹方、材料、环境等做调整
 */
export async function alchemyExample() {
  console.log('\n=== 炼丹场景示例 ===');
  
  const factors = new InfluenceFactorBuilder()
    .addEquipment('紫阳炉', '上品丹炉，火候控制精准，成丹率+20%', 20, 'critical')
    .addEquipment('千年雪莲', '主药材品质极佳，药力充足', 15, 'critical')
    .addEquipment('普通辅药', '品质一般的辅助药材', -5, 'minor')
    .addTalent('炼丹宗师', '对火候和药性的把控已达大师级别', 30, 'critical')
    .addEnvironment('药王谷', '灵气浓郁，适合炼丹的圣地', 10, 'major')
    .addSpecial('心神宁静', '经过三日斋戒，心境平和', 5, 'minor')
    .build();
  
  const result = await processGameScenario(
    ScenarioType.ALCHEMY,
    '在药王谷炼制突破元婴境界的九转金丹',
    {
      level: 3,        // 金丹境界
      stage: '圆满',   // 金丹圆满
      primaryAttr: 85, // 炼丹技能
      secondaryAttr: 70, // 精神力
      luck: LuckLevel.BLESSED
    },
    8, // 九转金丹难度很高
    factors
  );
  
  console.log('炼丹计算结果:', result);
  console.log('\n=== 提交给AI的完整信息包 ===');
  console.log('计算方式:', result.calculationMethod);
  console.log('基础成功率/效果值:', result.baseEffectValue || result.baseSuccessRate);
  console.log('所有文字描述因子:', 
    result.aiContext.influenceFactors.map(f => `${f.name}: ${f.textEffect}`).join('\n  ')
  );
}

/**
 * 示例3：社交场景（AI完全判断）
 * 程序只提供基础信息，AI完全自主判断
 */
export async function socialExample() {
  console.log('\n=== 社交场景示例（勾引女修） ===');
  
  const factors = new InfluenceFactorBuilder()
    .addEquipment('白玉折扇', '温润如玉，显得风流倜傥', undefined, 'minor')
    .addTalent('天生魅惑', '天生具有吸引异性的气质', undefined, 'critical')
    .addEnvironment('月下花园', '月色朦胧，花香阵阵，气氛浪漫', undefined, 'major')
    .addRelationship('同门师妹', '青梅竹马，但一直把你当兄长看待', undefined, 'critical')
    .addSpecial('刚刚突破', '境界突破后的自信让魅力大增', undefined, 'minor')
    .build();
  
  const result = await processGameScenario(
    ScenarioType.SOCIAL,
    '月下花园向青梅竹马的师妹表达爱意，试图改变她心中的定位',
    {
      level: 4,
      stage: '初期',
      primaryAttr: 60, // 魅力
      secondaryAttr: 55, // 情商
      luck: LuckLevel.NORMAL
    },
    6, // 青梅竹马转恋人有一定难度
    factors
  );
  
  console.log('社交场景结果:', result);
  console.log('\n=== AI完全自主判断 ===');
  console.log('程序只提供了:', result.aiContext.gameParameters);
  console.log('AI需要综合判断:', result.aiContext.influenceFactors.length, '个影响因子');
  console.log('建议结果类型:', result.aiContext.suggestedOutcomes);
  console.log('\nAI将基于文字描述、人物关系、环境氛围等完全自主决定结果');
}

/**
 * 示例4：复杂场景 - 破阵（混合计算）
 * 需要智力计算 + 阵法知识 + 灵感顿悟等
 */
export async function formationBreakingExample() {
  console.log('\n=== 破阵场景示例 ===');
  
  const factors = new InfluenceFactorBuilder()
    .addTalent('阵法大师', '对各种阵法都有深入研究', 25, 'critical')
    .addEquipment('测灵罗盘', '可以感知阵法灵力流向', 10, 'major')
    .addEnvironment('古代遗迹', '阵法年代久远，有些阵纹已经模糊', -5, 'major')
    .addSpecial('时间紧迫', '身后有追兵，必须尽快破阵', -10, 'major')
    .addSpecial('灵感涌现', '刚刚参悟阵法心得，思路清晰', 15, 'minor')
    .build();
  
  const result = await processGameScenario(
    ScenarioType.FORMATION_BREAKING,
    '在古代遗迹中破解护宝大阵，身后有敌人追击',
    {
      level: 5,
      stage: '中期',
      primaryAttr: 90, // 智力/阵法水平
      secondaryAttr: 75, // 精神力
      luck: LuckLevel.UNLUCKY // 被追杀，运气不好
    },
    9, // 古代大阵难度极高
    factors
  );
  
  console.log('破阵计算结果:', result);
  console.log('\n这种复杂场景程序和AI的分工:');
  console.log('程序负责:', '基础智力计算、阵法技能数值、时间紧迫的数值惩罚');
  console.log('AI负责:', '阵法的具体样式、破解过程的描述、灵感顿悟的时机、追兵的威胁等');
}

/**
 * 示例5：完整的游戏流程演示
 */
export async function fullGameFlowExample() {
  console.log('\n=== 完整游戏流程演示 ===');
  
  // 1. 先修炼提升实力
  console.log('\n1. 修炼阶段 (程序精确计算)');
  const cultivationFactors = new InfluenceFactorBuilder()
    .addEnvironment('洞天福地', '灵气浓度是外界的10倍', 20, 'critical')
    .addEquipment('聚灵阵法', '自制的小型聚灵阵', 5, 'minor')
    .addTalent('悟性极佳', '修炼效率比常人高出一倍', 25, 'critical')
    .build();
    
  const cultivationResult = await processGameScenario(
    ScenarioType.CULTIVATION,
    '在洞天福地中修炼《太上忘情诀》',
    { level: 3, stage: '圆满', primaryAttr: 80, luck: LuckLevel.BLESSED },
    3, // 修炼难度不高
    cultivationFactors
  );
  
  console.log('修炼效果:', cultivationResult.baseEffectValue, '- 程序精确计算，AI添加描述');
  
  // 2. 尝试突破
  console.log('\n2. 突破阶段 (程序精确计算)');
  const breakthroughResult = await processGameScenario(
    ScenarioType.BREAKTHROUGH,
    '尝试从金丹圆满突破到元婴初期',
    { level: 3, stage: '圆满', primaryAttr: 80, luck: LuckLevel.BLESSED },
    7, // 大境界突破难度高
    cultivationFactors
  );
  
  console.log('突破成功率:', breakthroughResult.baseSuccessRate?.toFixed(1) + '%', '- 程序精确计算');
  
  // 3. 突破成功后遇到敌人
  console.log('\n3. 突破后战斗 (混合计算)');
  const postBreakthroughCombat = await processGameScenario(
    ScenarioType.COMBAT,
    '刚突破就遇到觊觎洞府的元婴中期修士',
    { level: 4, stage: '初期', primaryAttr: 85, luck: LuckLevel.NORMAL },
    8, // 对手境界更高
    new InfluenceFactorBuilder()
      .addSpecial('刚刚突破', '境界不稳，但战意高昂', 5, 'major')
      .addEnvironment('自家洞府', '地利优势，熟悉地形', 10, 'major')
      .addTalent('越级战斗经验', '经常以弱胜强', 15, 'critical')
      .build()
  );
  
  console.log('战斗评估:', combatResult.baseEffectValue, '- 程序提供基础，AI做最终判断');
  
  // 4. 战后进行社交
  console.log('\n4. 战后社交 (AI完全判断)');
  const postCombatSocial = await processGameScenario(
    ScenarioType.SOCIAL,
    '击败敌人后，向路过的女修炫耀战果',
    { level: 4, stage: '初期', primaryAttr: 60, luck: LuckLevel.LUCKY },
    4, // 刚胜利，魅力加成
    new InfluenceFactorBuilder()
      .addSpecial('刚刚胜利', '击败高阶修士，气势正盛', undefined, 'critical')
      .addEnvironment('洞府门前', '自己的地盘，更有底气', undefined, 'minor')
      .build()
  );
  
  console.log('社交效果: AI完全自主判断 -', '程序只提供参考信息');
  
  console.log('\n=== 流程总结 ===');
  console.log('程序的职责: 处理数值密集的计算，提供量化的基础信息');
  console.log('AI的职责: 整合所有信息，生成有趣生动的游戏内容');
  console.log('最终玩家看到的: 都是AI生成的完整游戏体验，数值只是隐藏在背后的支撑');
}

/**
 * AI提示词生成示例
 * 展示如何将计算结果转换为AI提示词
 */
export function generateAIPromptExample(calculationResult: any) {
  const prompt = `
【游戏场景生成请求】

场景类型: ${calculationResult.scenarioType}
计算方式: ${calculationResult.calculationMethod}

程序计算结果:
${calculationResult.baseSuccessRate ? `成功率: ${calculationResult.baseSuccessRate.toFixed(1)}%` : ''}
${calculationResult.baseEffectValue ? `效果值: ${calculationResult.baseEffectValue.toFixed(1)}` : ''}

玩家情况: ${calculationResult.aiContext.playerContext}

所有影响因子:
${calculationResult.aiContext.influenceFactors.map((factor: any) => 
  `- 【${factor.type}】${factor.name}: ${factor.textEffect} (重要度: ${factor.importance})`
).join('\n')}

场景描述: ${calculationResult.aiContext.scenario}

请求内容:
1. 基于程序计算的数值结果和所有影响因子，生成生动的场景描述
2. 不要修改任何程序计算出的数值，只负责文字渲染和氛围营造
3. 充分考虑所有装备、天赋、环境、关系等文字描述的影响
4. 生成有趣的结果，包括可能的后续发展

建议结果类型: ${calculationResult.aiContext.suggestedOutcomes?.join(', ')}
处理建议: ${calculationResult.recommendedApproach}
`;
  
  return prompt;
}

// 导出所有示例函数
export {
  combatExample,
  alchemyExample, 
  socialExample,
  formationBreakingExample,
  fullGameFlowExample,
  generateAIPromptExample
};