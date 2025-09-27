import type { RealmDefinition, RealmStageDefinition, RealmStage } from '../types/game';

// 通用子阶段定义函数
function createStandardStages(realmLevel: number): RealmStageDefinition[] {
  const baseMultiplier = 1 + realmLevel * 0.2;
  
  return [
    {
      stage: '初期' as RealmStage,
      title: '初窥门径',
      breakthrough_difficulty: '普通' as const,
      resource_multiplier: baseMultiplier,
      lifespan_bonus: 0,
      special_abilities: []
    },
    {
      stage: '中期' as RealmStage,
      title: '渐入佳境',
      breakthrough_difficulty: '普通' as const,
      resource_multiplier: baseMultiplier * 1.3,
      lifespan_bonus: Math.floor(realmLevel * 10),
      special_abilities: []
    },
    {
      stage: '后期' as RealmStage,
      title: '炉火纯青',
      breakthrough_difficulty: '困难' as const,
      resource_multiplier: baseMultiplier * 1.6,
      lifespan_bonus: Math.floor(realmLevel * 20),
      special_abilities: []
    },
    {
      stage: '圆满' as RealmStage,
      title: '臻至完美',
      breakthrough_difficulty: '困难' as const,
      resource_multiplier: baseMultiplier * 2,
      lifespan_bonus: Math.floor(realmLevel * 30),
      special_abilities: [`${getRealmName(realmLevel)}圆满气息`, '境界稳固']
    },
    {
      stage: '极境' as RealmStage,
      title: '逆天而行',
      breakthrough_difficulty: '逆天' as const,
      resource_multiplier: baseMultiplier * 3,
      lifespan_bonus: Math.floor(realmLevel * 50),
      special_abilities: [
        '同境无敌',
        '有限越阶战斗',
        '大道烙印',
        '法则亲和提升'
      ],
      can_cross_realm_battle: true
    }
  ];
}

function getRealmName(level: number): string {
  const names = ['凡人', '炼气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '渡劫'];
  return names[level] || '未知境界';
}

// 导出getRealmName函数供其他模块使用
export { getRealmName };

export const REALM_DEFINITIONS: RealmDefinition[] = [
  {
    level: 0,
    name: '凡人',
    title: '凡尘俗子',
    coreFeature: '生老病死，轮回不止',
    lifespan: '约百载',
    activityScope: '凡尘浊世',
    gapDescription: '不入仙门，终为蝼蚁。'
  },
  {
    level: 1,
    name: '炼气',
    title: '问道童子',
    coreFeature: '引气入体，洗涤凡躯',
    lifespan: '约120载',
    activityScope: '凡尘浊世',
    gapDescription: '在凡间已是异人，可施展微末法术，被乡野尊为"仙童"。',
    stages: createStandardStages(1)
  },
  {
    level: 2,
    name: '筑基',
    title: '入道之士',
    coreFeature: '灵气液化，丹田筑基',
    lifespan: '约250载',
    activityScope: '凡尘与元气清都之间',
    gapDescription: '正式脱凡，可御器飞行。降临凡人国度，足以被帝王尊为"护国仙师"。',
    stages: createStandardStages(2)
  },
  {
    level: 3,
    name: '金丹',
    title: '真人',
    coreFeature: '灵液结丹，法力自生',
    lifespan: '500-800载',
    activityScope: '元气清都',
    gapDescription: '在修行界可开宗立派，为一派老祖。其名号在凡间流传，已是神话人物。',
    stages: createStandardStages(3)
  },
  {
    level: 4,
    name: '元婴',
    title: '真君',
    coreFeature: '丹碎婴生，神魂寄托',
    lifespan: '1500-2000载',
    activityScope: '元气清都',
    gapDescription: '元婴不灭，真灵不死。是修行界的绝对霸主，其一言可定一域宗门兴废。',
    stages: createStandardStages(4)
  },
  {
    level: 5,
    name: '化神',
    title: '道君',
    coreFeature: '神游太虚，感悟法则',
    lifespan: '约5000载',
    activityScope: '元气清都与法则天域之间',
    gapDescription: '神识即领域，意念可干涉现实。凡尘之事于他已如观掌纹，不再入眼。',
    stages: createStandardStages(5)
  },
  {
    level: 6,
    name: '炼虚',
    title: '尊者',
    coreFeature: '身融虚空，掌握空间',
    lifespan: '万载以上',
    activityScope: '法则天域',
    gapDescription: '咫尺天涯，可短暂撕裂空间。对低阶修士而言如同神罚。',
    stages: createStandardStages(6)
  },
  {
    level: 7,
    name: '合体',
    title: '大能',
    coreFeature: '法则归体，身即是道',
    lifespan: '与世同君',
    activityScope: '法则天域',
    gapDescription: '一举一动皆引动大道共鸣，其存在本身就是一种天地法则，稳定着一方天域。',
    stages: createStandardStages(7)
  },
  {
    level: 8,
    name: '渡劫',
    title: '问天者',
    coreFeature: '超脱世界，叩问天道',
    lifespan: '不定（劫数）',
    activityScope: '道之巅峰',
    gapDescription: '已是人间道之极致，引动天劫，准备超脱此界。每一次渡劫都是天地盛景。',
    stages: createStandardStages(8)
  }
];

/**
 * 获取特定境界的定义
 */
export function getRealmDefinition(level: number): RealmDefinition | undefined {
  return REALM_DEFINITIONS.find(realm => realm.level === level);
}

/**
 * 获取境界子阶段信息
 */
export function getRealmStageInfo(realmLevel: number, stage: RealmStage) {
  const realm = getRealmDefinition(realmLevel);
  const stageInfo = realm?.stages?.find(s => s.stage === stage);
  
  return {
    realmName: realm?.name || '未知境界',
    stageInfo,
    fullTitle: stageInfo ? `${realm?.name}${stage}·${stageInfo.title}` : `${realm?.name || '未知'}${stage}`
  };
}