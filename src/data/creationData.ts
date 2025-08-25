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
//                           本地灵根数据 (预留)
// =======================================================================
export const LOCAL_SPIRIT_ROOTS: Omit<SpiritRoot, 'source'>[] = [
  { id: 1, name: '金灵根', description: '操控金铁，锋锐无匹。修行金系功法事半功倍，攻击至上。', base_multiplier: 1.5, talent_cost: 10 },
  { id: 2, name: '木灵根', description: '亲和草木，生机盎然。修行木系功法极快，擅长治疗与控制。', base_multiplier: 1.5, talent_cost: 10 },
  { id: 3, name: '水灵根', description: '御水之脉，绵延不绝。修行水系功法，法力悠长，变化多端。', base_multiplier: 1.5, talent_cost: 10 },
  { id: 4, name: '火灵根', description: '天生火脉，焚尽八荒。修行火系功法，威力绝伦，爆发力强。', base_multiplier: 1.5, talent_cost: 10 },
  { id: 5, name: '土灵根', description: '大地之子，厚德载物。修行土系功法，防御惊人，稳如泰山。', base_multiplier: 1.5, talent_cost: 10 },
  { id: 6, name: '混沌灵根', description: '万法归一，包容万象。可修行所有属性功法，无瓶颈，但初期进展缓慢。', base_multiplier: 2.0, talent_cost: 20 },
  { id: 7, name: '天妒之体', description: '天道所妒，灵气不亲。修行速度极为缓慢，但一旦突破，根基无比扎实。', base_multiplier: 0.5, talent_cost: -5 },
  { id: 8, name: '凡人灵根', description: '五行皆有，却驳杂不堪，修炼速度慢如龟爬。', base_multiplier: 1.0, talent_cost: 0 },
];


// =======================================================================
//                           本地天赋数据 (预留)
// =======================================================================
export const LOCAL_TALENTS: Omit<Talent, 'source'>[] = [
  { id: 1, name: '天命主角', description: '气运惊人，总是能在绝境中逢生，获得意想不到的机缘。', talent_cost: 15, rarity: 5, effects: null },
  { id: 2, name: '剑道独尊', description: '天生剑心通明，任何剑法一看便会，且威力倍增。', talent_cost: 12, rarity: 5, effects: null },
  { id: 3, name: '丹道圣手', description: '对药理有超凡的领悟力，炼丹成功率与品质大幅提升。', talent_cost: 12, rarity: 5, effects: null },
  { id: 4, name: '阵法大师', description: '对阵法有极高的天赋，学习和布置阵法的效率大大提高。', talent_cost: 8, rarity: 4, effects: null },
  { id: 5, name: '炼器鬼才', description: '天生对各种材料有敏锐的感知，炼器时更容易出现极品。', talent_cost: 8, rarity: 4, effects: null },
  { id: 6, name: '多宝童子', description: '出门历练时，更容易发现天材地宝。', talent_cost: 7, rarity: 4, effects: null },
  { id: 7, name: '体修奇才', description: '肉身天生强横，气血旺盛，适合修炼体修功法。', talent_cost: 5, rarity: 3, effects: null },
  { id: 8, name: '神识过人', description: '天生神识强大，不易被心魔入侵，施展神识秘术效果更佳。', talent_cost: 5, rarity: 3, effects: null },
  { id: 9, name: '身法鬼魅', description: '身法飘逸，战斗中闪避能力更强。', talent_cost: 4, rarity: 3, effects: null },
  { id: 10, name: '农夫之子', description: '出身凡人，心性坚韧，对灵植有额外的亲和力。', talent_cost: 2, rarity: 2, effects: null },
  { id: 11, name: '过目不忘', description: '记忆力超群，学习功法秘籍速度加快。', talent_cost: 2, rarity: 2, effects: null },
  { id: 12, name: '老实人', description: '与人交易时，不容易被欺骗。', talent_cost: 1, rarity: 1, effects: null },
];
