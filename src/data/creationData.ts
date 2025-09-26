import type { World, TalentTier, Origin, SpiritRoot, Talent } from '@/types';

// =======================================================================
//                           本地世界数据
// =======================================================================
export const LOCAL_WORLDS: Omit<World, 'source'>[] = [
  {
    id: 1,
    name: '朝天大陆',
    era: '朝天历元年',
    description: '此方世界名为"朝天大陆"，乃是一处天道完整、灵气充沛的上善之地。其核心法则是"万灵竞渡，一步登天"，无论是人、妖、精、怪，皆有缘法踏上修行之路，叩问长生。\n仙凡之别在此界泾渭分明，宛若天渊。凡人寿不过百载，受生老病死之苦，终归一抔黄土；而修士一旦踏入道途，便能吞吐天地灵气，淬炼己身，寿元动辄千载，更有大能者与天地同寿。凡俗王朝更迭，于修士而言不过是弹指一瞬间。在凡人眼中，修士是高悬于九天的仙神，一言可定一国兴衰，一念可引风雨雷霆。然而，这种力量并非毫无代价。\n此界奉行"大道争锋"的铁则，天道予万物机缘，却也降下无尽凶险。灵脉宝地、神功秘法、天材地宝，皆是有缘者居之，而"缘"字背后，往往是血与火的洗礼。修士之间，为求道途精进，争斗乃是常态。同门可能反目，挚友亦会背叛，杀人夺宝、斩草除根之事屡见不鲜。这是一个极度自由的世界，你可以选择成为守护一方的善仙，亦可成为肆虐八荒的魔头，只要你有足够的实力。但自由的背后，是无处不在的危险，一步踏错，便是万劫不复，身死道消。\n然天道亦有制衡，修士若无故以大法力干涉凡俗王朝更迭、屠戮凡人，便会与此方天地结下因果。虽无业报加身，却会在日后冲击更高境界、渡劫飞升之时，引来更强大的天劫，平添无数变数。故而多数修士选择在山门清修，或于红尘历练，以求勘破心障，证得大道。修仙百艺——炼丹、炼器、符箓、阵法，在此界发展到了极致，共同构筑了一个无比兴盛、却也无比残酷的修仙文明。',
  },
  {
    id: 2,
    name: '九幽魔界',
    era: '魔道昌隆',
    description: '弱肉强食的残酷世界，魔气充盈，天材地宝与致命危险并存。此界修士崇尚力量，修炼魔功，以杀证道，心性稍有不慎便会堕入万劫不复。',
  },
  {
    id: 3,
    name: '灵寰仙界',
    era: '仙道盛世',
    description: '传说中飞升者所处的世界，灵气浓郁成雾，法则清晰可见。此界宗门林立，大能辈出，但也因此竞争更为激烈，每一步都如履薄冰。',
  },
];

// =======================================================================
//                           本地天资数据
// =======================================================================
export const LOCAL_TALENT_TIERS: Omit<TalentTier, 'source'>[] = [
  { id: 1, name: '废柴', description: '资质平平，毫无出奇之处。', total_points: 10, rarity: 1, color: '#808080' },
  { id: 2, name: '凡人', description: '芸芸众生中的一员，不好不坏。', total_points: 20, rarity: 2, color: '#FFFFFF' },
  { id: 3, name: '俊杰', description: '百里挑一的人才，略有不凡。', total_points: 30, rarity: 3, color: '#4169E1' },
  { id: 4, name: '天骄', description: '千年难遇的奇才，注定耀眼。', total_points: 40, rarity: 4, color: '#9932CC' },
  { id: 5, name: '妖孽', description: '万古无一的怪物，逆天而行。', total_points: 50, rarity: 5, color: '#FFD700' },
];

// =======================================================================
//                           本地出身数据
// =======================================================================
export const LOCAL_ORIGINS: Omit<Origin, 'source'>[] = [
  { id: 1, name: '山野遗孤', description: '自幼在山野中长大，与猛兽为伴，磨练出坚韧的意志和过人的体魄。', talent_cost: 0, attribute_modifiers: { root_bone: 1 }, rarity: 3 },
  { id: 2, name: '书香门第', description: '出身于官宦世家，饱读诗书，对天地至理有超乎常人的理解力。', talent_cost: 2, attribute_modifiers: { comprehension: 2 }, rarity: 3 },
  { id: 3, name: '商贾之子', description: '生于富贵之家，精通人情世故，处事圆滑，魅力非凡。', talent_cost: 2, attribute_modifiers: { charm: 2 }, rarity: 3 },
  { id: 4, name: '将门之后', description: '名将的后代，血脉中流淌着勇武与煞气，心性坚定。', talent_cost: 3, attribute_modifiers: { temperament: 2, root_bone: 1 }, rarity: 3 }
];

// =======================================================================
//                           本地灵根数据 (品级优化版本)
// =======================================================================
export const LOCAL_SPIRIT_ROOTS: Omit<SpiritRoot, 'source'>[] = [
  // 上品灵根 - 基础五行
  {
    id: 1,
    name: '金灵根',
    tier: '上品',
    description: '金曰从革，操控金铁，锋锐无匹。修行金系功法事半功倍，是天生的剑修或刀客胚子，攻击性极强。',
    cultivation_speed: '1.6x',
    special_effects: ['金系法术威力+50%', '器物亲和+30%', '金属感知'],
    base_multiplier: 1.6,
    talent_cost: 10,
    rarity: 3
  },
  {
    id: 2,
    name: '木灵根',
    tier: '上品',
    description: '木曰曲直，亲和草木，生机盎然。修行木系功法极快，擅长治疗、控制，且对灵植有天生的亲和力。',
    cultivation_speed: '1.6x',
    special_effects: ['木系法术威力+50%', '生命力恢复+40%', '植物沟通'],
    base_multiplier: 1.6,
    talent_cost: 10,
    rarity: 3
  },
  {
    id: 3,
    name: '水灵根',
    tier: '上品',
    description: '水曰润下，御水之脉，绵延不绝。修行水系功法，法力悠长，变化多端，适应性极强。',
    cultivation_speed: '1.6x',
    special_effects: ['水系法术威力+50%', '灵气恢复+40%', '水体感知'],
    base_multiplier: 1.6,
    talent_cost: 10,
    rarity: 3
  },
  {
    id: 4,
    name: '火灵根',
    tier: '上品',
    description: '火曰炎上，天生火脉，焚尽八荒。修行火系功法，威力绝伦，爆发力强，是炼丹师的绝佳天赋。',
    cultivation_speed: '1.6x',
    special_effects: ['火系法术威力+50%', '爆发伤害+60%', '火焰免疫'],
    base_multiplier: 1.6,
    talent_cost: 10,
    rarity: 3
  },
  {
    id: 5,
    name: '土灵根',
    tier: '上品',
    description: '土爰稼穑，大地之子，厚德载物。修行土系功法，防御惊人，稳如泰山，是天生的阵法师材料。',
    cultivation_speed: '1.6x',
    special_effects: ['土系法术威力+50%', '防御力+40%', '大地感知'],
    base_multiplier: 1.6,
    talent_cost: 10,
    rarity: 3
  },
  
  // 中品灵根 - 常见选择
  {
    id: 9,
    name: '金灵根',
    tier: '中品',
    description: '金行资质尚可，修行金系功法有一定天赋，虽不及上品，但也远超常人。',
    cultivation_speed: '1.3x',
    special_effects: ['金系法术威力+25%', '器物亲和+15%'],
    base_multiplier: 1.3,
    talent_cost: 6,
    rarity: 2
  },
  {
    id: 10,
    name: '火灵根',
    tier: '中品',
    description: '火行资质良好，对火系功法有不错的亲和力，能够顺利地踏上修行之路。',
    cultivation_speed: '1.3x',
    special_effects: ['火系法术威力+25%', '爆发伤害+30%'],
    base_multiplier: 1.3,
    talent_cost: 6,
    rarity: 2
  },
  
  // 极品灵根 - 稀有变异
  {
    id: 11,
    name: '雷灵根',
    tier: '极品',
    description: '万中无一的变异灵根，天生雷体，雷霆万钧。修行雷系功法速度极快，威力绝伦，是天劫的宠儿。',
    cultivation_speed: '2.0x',
    special_effects: ['雷系法术威力+80%', '雷霆免疫', '速度+50%', '穿透攻击'],
    base_multiplier: 2.0,
    talent_cost: 15,
    rarity: 4
  },
  {
    id: 12,
    name: '冰灵根',
    tier: '极品',
    description: '极为罕见的变异灵根，冰霜之躯，万物凋零。修行冰系功法，控制力超凡，能冰封千里。',
    cultivation_speed: '2.0x',
    special_effects: ['冰系法术威力+80%', '减速效果+100%', '冰霜免疫', '空间冻结'],
    base_multiplier: 2.0,
    talent_cost: 15,
    rarity: 4
  },
  
  // 神品灵根 - 传说级别
  {
    id: 6,
    name: '混沌灵根',
    tier: '神品',
    description: '传说中的至高灵根，万法归一，包容万象。可修行所有属性功法，无瓶颈，但初期进展缓慢，后期一日千里。',
    cultivation_speed: '0.8x(前期) → 2.8x(后期)',
    special_effects: ['全系法术亲和', '无属性限制', '越阶战斗+50%', '突破概率+30%'],
    base_multiplier: 2.8,
    talent_cost: 25,
    rarity: 5
  },
  
  // 特殊灵根
  {
    id: 7,
    name: '天妒之体',
    tier: '特殊',
    description: '天道所妒，灵气不亲。修行速度极为缓慢，常人难以忍受。但一旦突破，根基无比扎实，战力远超同阶。',
    cultivation_speed: '0.5x',
    special_effects: ['根基极其稳固', '突破后实力暴增+100%', '天劫抗性+80%', '逆天改命'],
    base_multiplier: 0.5,
    talent_cost: -5,
    rarity: 4
  },
  
  // 凡品和下品灵根
  {
    id: 8,
    name: '五行杂灵根',
    tier: '凡品',
    description: '凡人中最常见的灵根，五行皆有，却驳杂不堪，修炼速度慢如龟爬，仙路渺茫。',
    cultivation_speed: '1.0x',
    special_effects: ['平凡之道', '大器晚成'],
    base_multiplier: 1.0,
    talent_cost: 0,
    rarity: 1
  },
  {
    id: 13,
    name: '风灵根',
    tier: '下品',
    description: '较为常见的异种灵根，微风轻抚，虽然资质一般，但胜在灵活多变，身法迅捷。',
    cultivation_speed: '1.1x',
    special_effects: ['风系法术威力+15%', '移动速度+20%'],
    base_multiplier: 1.1,
    talent_cost: 3,
    rarity: 1
  },
];


// =======================================================================
//                           本地天赋数据 (预留)
// =======================================================================
export const LOCAL_TALENTS: Omit<Talent, 'source'>[] = [
  { 
    id: 1, 
    name: '天命主角', 
    description: '气运惊人，总是能在绝境中逢生，获得意想不到的机缘。', 
    talent_cost: 15, 
    rarity: 5, 
    effects: [
      { 类型: '后天六司', 目标: '气运', 数值: 8 },
      { 类型: '特殊能力', 名称: '逢凶化吉', 数值: 0.1 }
    ]
  },
  {
    id: 2, 
    name: '剑道独尊', 
    description: '天生剑心通明，任何剑法一看便会，且威力倍增。', 
    talent_cost: 12, 
    rarity: 5, 
    effects: [
      { 类型: '技能加成', 技能: '剑法', 数值: 0.2 },
      { 类型: '后天六司', 目标: '根骨', 数值: 3 }
    ]
  },
  {
    id: 3,
    name: '丹道圣手',
    description: '对药理有超凡的领悟力，炼丹成功率与品质大幅提升。',
    talent_cost: 12,
    rarity: 5,
    effects: [
      { 类型: '技能加成', 技能: '炼丹', 数值: 0.15 },
      { 类型: '后天六司', 目标: '悟性', 数值: 2 }
    ]
  },
  {
    id: 4,
    name: '阵法大师',
    description: '对阵法有极高的天赋，学习和布置阵法的效率大大提高。',
    talent_cost: 8,
    rarity: 4,
    effects: [
      { 类型: '技能加成', 技能: '阵法', 数值: 0.12 },
      { 类型: '后天六司', 目标: '悟性', 数值: 2 }
    ]
  },
  {
    id: 5,
    name: '炼器鬼才',
    description: '天生对各种材料有敏锐的感知，炼器时更容易出现极品。',
    talent_cost: 8,
    rarity: 4,
    effects: [
      { 类型: '技能加成', 技能: '炼器', 数值: 0.1 },
      { 类型: '特殊能力', 名称: '材料感知', 数值: 1 }
    ]
  },
  {
    id: 6,
    name: '多宝童子',
    description: '出门历练时，更容易发现天材地宝。',
    talent_cost: 7,
    rarity: 4,
    effects: [
      { 类型: '后天六司', 目标: '气运', 数值: 3 },
      { 类型: '特殊能力', 名称: '寻宝天赋', 数值: 0.15 }
    ]
  },
  {
    id: 7,
    name: '体修奇才',
    description: '肉身天生强横，气血旺盛，适合修炼体修功法。',
    talent_cost: 5,
    rarity: 3,
    effects: [
      { 类型: '后天六司', 目标: '根骨', 数值: 3 },
      { 类型: '特殊能力', 名称: '体修天赋', 数值: 0.1 }
    ]
  },
  {
    id: 8,
    name: '神识过人',
    description: '天生神识强大，不易被心魔入侵，施展神识秘术效果更佳。',
    talent_cost: 5,
    rarity: 3,
    effects: [
      { 类型: '后天六司', 目标: '悟性', 数值: 3 },
      { 类型: '特殊能力', 名称: '心魔抗性', 数值: 0.1 }
    ]
  },
  {
    id: 9,
    name: '身法鬼魅',
    description: '身法飘逸，战斗中闪避能力更强。',
    talent_cost: 4,
    rarity: 3,
    effects: [
      { 类型: '后天六司', 目标: '灵性', 数值: 2 },
      { 类型: '特殊能力', 名称: '闪避天赋', 数值: 0.08 }
    ]
  },
  {
    id: 10,
    name: '农夫之子',
    description: '出身凡人，心性坚韧，对灵植有额外的亲和力。',
    talent_cost: 2,
    rarity: 2,
    effects: [
      { 类型: '后天六司', 目标: '心性', 数值: 1 },
      { 类型: '特殊能力', 名称: '灵植亲和', 数值: 0.1 }
    ]
  },
  {
    id: 11,
    name: '过目不忘',
    description: '记忆力超群，学习功法秘籍速度加快。',
    talent_cost: 2,
    rarity: 2,
    effects: [
      { 类型: '后天六司', 目标: '悟性', 数值: 2 }
    ]
  },
  {
    id: 12,
    name: '老实人',
    description: '与人交易时，不容易被欺骗。',
    talent_cost: 1,
    rarity: 1,
    effects: [
      { 类型: '特殊能力', 名称: '防欺诈', 数值: 1 }
    ]
  },
];
