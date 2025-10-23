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
    name: '地球',
    era: '灵气复苏元年',
    description: '在2026年的一天，地球经历了一场前所未有的灵气复苏。曾经只存在于神话传说中的"灵气"，如潮水般涌入现代世界。科学无法解释的异象频频发生：城市上空出现极光般的能量波动，深山老林涌现出神秘的灵脉，普通动植物开始变异进化。\n在这个巨变的时代，你是极少数能感知并吸收灵气的"觉醒者"。当全世界还在用科学仪器研究这股神秘能量时，你已经能够将其炼化入体，走上了修真之路。现代化的都市、便捷的网络、发达的科技，与古老的修炼体系碰撞，产生了奇妙的化学反应。\n政府成立了"超自然事务管理局"，各国争相研究灵气应用技术，跨国企业试图将灵气商业化，而古老宗门的后裔们也纷纷出世。在这个灵气与科技并存的时代，你将在钢铁森林中独自修行，探索"科学修真"的奥秘。人类的寿命依然有限，普通人对觉醒者既敬畏又恐惧，而你，必须在两个世界之间找到自己的道路。',
  },
  {
    id: 3,
    name: '赛博修真',
    era: '新纪元2156',
    description: '2156年，人类文明已经踏入星际时代。在赛博朋克的霓虹都市中，义体改造、神经接驳、意识上传已成为常态。然而，一次深空探索意外发现了"灵能水晶"——一种能够增强人类精神力的神秘矿石，彻底改变了世界。\n你是一名边缘跑者，在接触灵能水晶后觉醒了修炼天赋。与传统修真不同，这个时代的修行依托于"义体灵修"体系：将灵能与赛博义体结合，数据流就是灵气，神经网络就是经脉，意识核心就是丹田。你可以通过黑客手段"盗取"企业的修炼数据，可以在虚拟现实中进行"数据闭关"，也可以用纳米机器人构建"机械金丹"。\n巨型企业垄断了灵能资源，赛博修士们为了突破境界不得不接受危险任务。城市下层贫民窟中有人在破旧的胶囊旅馆里修炼，上层则是企业供养的"数据仙人"享受着无尽资源。这是一个孤独修士的时代，在霓虹闪烁、义体横行的世界里，你将用代码和灵能书写属于自己的飞升传说。',
  },
  {
    id: 4,
    name: '魔法纪元',
    era: '第七魔法时代',
    description: '这是一个魔法与灵气融合的奇幻世界。千年前，东方的"修真体系"与西方的"魔法体系"发生了史诗级的碰撞，最终两大文明达成了微妙的平衡。在这个世界，古老的修真宗门与魔法学院并存，道家的符箓与炼金术的魔法阵有着惊人的相似之处。\n你生于边境之地，这里是两大文明的交汇点。你可以选择传统的修真之路，炼气筑基金丹元婴；也可以学习西方的魔法体系，成为元素法师或是死灵术士。更有野心者，试图融合两种体系，创造前所未有的"魔修"之道。\n这个世界充满了机遇与危险。古老的龙族盘踞在灵脉之上，精灵王国守护着世界树的秘密，矮人在地底挖掘着魔晶矿脉，而人类帝国则在两大体系的碰撞中寻找平衡。魔法学院的学生可能会与修真宗门的弟子发生冲突，古老的修士可能需要面对掌握禁咒的大魔法师。在这个融合与冲突并存的时代，你将独自探索两种力量的奥秘，寻找超越极限的可能。',
  },
  {
    id: 5,
    name: '洪荒末世',
    era: '末法时代第三千纪',
    description: '这是一个力量体系凋零的末世。远古时期，神魔横行，大能者手掌星辰、脚踏虚空。然而，随着一场席卷整个大陆的"天道浩劫"，灵气逐渐枯竭，曾经无敌的修真体系已经支离破碎。如今的世界，已是末法时代的第三千年。\n你生于这个衰败的时代，灵脉枯竭、天材地宝近乎绝迹。曾经辉煌的仙门大多已成废墟，唯有少数传承尚存，苟延残喘。修行之路艰难无比，炼气都需要数十年苦功。但正因如此，这是一个回归本真的时代——没有捷径，没有外丹，只有最朴素的苦修和磨砺。\n末法时代的残酷在于，每一次突破都可能是生死劫。资源稀缺，强者为了一株灵草可以血洗一座城。时间在这里变得更加沉重，修士闭关数十年醒来，可能发现整个宗门已经覆灭。这是一个适者生存的时代，也是最考验道心的时代。',
  },
  {
    id: 6,
    name: '星海修仙',
    era: '星际大航海时代',
    description: '修真文明已经突破了星球的束缚，踏入无垠星海。数万年前，第一批渡劫期大能飞升失败，却意外发现了宇宙深处的无数修真星球，开启了星际大航海时代。\n在这个宇宙中，每颗星球都有独特的修真体系和力量源泉。有的星球灵气浓郁如海，有的星球则孕育着特殊的"星辰之力"。修士们驾驭飞舟穿梭星海，探索遗迹，争夺资源。星际势力林立，古老的修真宗门演变成跨星系的修真帝国。\n这里的时间跨度更加恐怖。炼虚期修士闭关百年，可能醒来时已经跨越了数光年。星际航行动辄数十年，修士们在飞舟中修炼、突破、衰老。有人耗尽千年寿元，也无法到达传说中的"道源星"。这是一个孤独的时代，星海茫茫，道路漫长，而时间是最无情的敌人。',
  },
  {
    id: 7,
    name: '武道苍穹',
    era: '武道纪元',
    description: '这是一个以武入道的世界，没有传统的灵气修炼，只有纯粹的武道体系。在这里，力量来源于对身体的极致淬炼和对武道真意的感悟。拳破山河、掌碎虚空，是武者的终极追求。\n武道修行分为淬体、凝气、通玄、化真、破虚、登天六大境界。每一次突破都需要经历生死磨砺，没有丹药捷径，只有血与汗的浇灌。淬体期需要十年打熬筋骨，凝气期需要三十年凝练真气，通玄期需要百年感悟武道真意。\n这个世界同样遵循时间的残酷法则。武者闭关苦修，出关时故人已老。高阶武者一次生死战，可能就是数十年寿命的代价。武道宗门的兴衰更迭，不过是百年一瞬。这里没有长生之道，只有燃烧生命追求武道极致的修罗之路。',
  },
  {
    id: 8,
    name: '诡异世界',
    era: '混沌纪元',
    description: '这是一个被诡异力量侵蚀的扭曲世界。正常的修真体系已经崩坏，取而代之的是融合了诡异之力的"畸变修行"。修士们不再单纯追求境界突破，而是在保持理智与获得力量之间走钢丝。\n诡异之力无处不在，污染着灵脉、腐蚀着功法、扭曲着生灵。传统的修真路已经走不通，修士们必须学会与诡异共存，甚至主动融合诡异之力。但这条路充满代价——每一次力量提升，都伴随着理智的削弱和身体的异化。\n时间在这里变得更加压迫。诡异侵蚀不会停止，修士们必须在完全疯狂前突破到更高境界。有人闭关十年，出来时已经异化成怪物。有人苦修百年，终于登顶，却发现自己已经失去了人性。这是一个绝望的时代，也是最考验意志的修行之路。',
  },
  {
    id: 9,
    name: '斗罗大陆',
    era: '魂师纪元',
    description: '这是一个以武魂为核心的奇幻世界。在这里，每个人都拥有与生俱来的武魂——有的是器武魂如昊天锤、七杀剑，有的是兽武魂如蓝银草、邪眸白虎。武魂的强弱决定了一个人的起点，但真正的强者还需要通过猎杀魂兽，吸收魂环来提升实力。\n\n斗罗大陆的力量体系分为魂师、魂尊、魂宗、魂王、魂帝、魂圣、魂斗罗、封号斗罗九大等级，每提升十级需要吸收一枚魂环。魂环分为十年、百年、千年、万年、十万年五种，魂环年限越高，提供的魂技越强大。但吸收过强的魂环也可能导致身体爆体而亡。\n\n在这个世界，武魂殿统治着整个大陆，两大帝国天斗与星罗分庭抗礼，各大宗门如昊天宗、七宝琉璃宗等暗流涌动。魂师是这个世界最尊贵的职业，但成为强者的道路充满凶险——每一次猎杀魂兽都是生死搏斗，每一次吸收魂环都可能走火入魔。\n\n时间在这里同样残酷。封号斗罗寿命不过三百年，而要从普通魂师修炼到封号斗罗，至少需要数十年甚至百年苦修。魂兽森林深处危机四伏，十万年魂兽更是可以化形为人，拥有不逊于封号斗罗的实力。这是一个天才辈出的时代，也是一个弱肉强食的修罗场。',
  },
  {
    id: 10,
    name: '夜的命名术',
    era: '联邦历776年',
    description: '这是一个被联邦高墙所圈禁的赛博朋克世界。巨型城市在永恒的黑夜与霓虹中呼吸，机械神明在数据网络中俯瞰众生，基因锁链是每个人与生俱来的枷锁。你是在这座囚笼中长大的普通人，直到某一天，你意外觉醒了超凡序列的力量。\n\n在这里，力量意味着一切。财阀、帮派、雇佣兵、觉醒者……无数势力在城市的阴影中盘根错节。为了打破基因的束缚，为了在残酷的法则下活下去，你必须不断战斗、进化，攀登超凡序列的阶梯。\n\n这是一个没有退路的世界。每一次选择都可能通向死亡，每一次战斗都是在与命运豪赌。你将独自面对这个充满压迫与机遇的赛博世界，探索禁忌之地的秘密，成为食物链的顶端，或者，被时代的洪流彻底吞噬。',
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
  { id: 4, name: '将门之后', description: '名将的后代，血脉中流淌着勇武与煞气，心性坚定。', talent_cost: 3, attribute_modifiers: { temperament: 2, root_bone: 1 }, rarity: 3 },
  { id: 5, name: '散修传人', description: '你的师父是一位游戏风尘的强大散修，你继承了他的部分衣钵和见识。', talent_cost: 4, attribute_modifiers: { comprehension: 1, temperament: 1 }, rarity: 4 },
  { id: 6, name: '魔道卧底', description: '你出身名门正派，却被派往魔道执行卧底任务，心性远超常人。', talent_cost: 1, attribute_modifiers: { temperament: 3 }, rarity: 4 },
  { id: 7, name: '重生者', description: '你保留着前世的记忆，虽然修为尽失，但对功法和未来的大事了如指掌。', talent_cost: 5, attribute_modifiers: { comprehension: 2, luck: 1 }, rarity: 5 },
  { id: 8, name: '仙人后裔', description: '你的血脉中流淌着稀薄的仙人之血，天生灵性十足，修炼速度略快于常人。', talent_cost: 6, attribute_modifiers: { spirit: 2, root_bone: 1 }, rarity: 5 },
  { id: 9, name: '夺舍老怪', description: '你是一名夺舍重生的老怪物，虽然占据了年轻的肉体，但灵魂中蕴含着庞大的神识力量。', talent_cost: 7, attribute_modifiers: { comprehension: 3, temperament: -1 }, rarity: 5 },
  { id: 10, name: '山神庙祝', description: '你从小在山神庙长大，日夜与香火为伴，神魂受到滋养，对鬼神之事有特殊感应。', talent_cost: 2, attribute_modifiers: { spirit: 2 }, rarity: 3 },
  { id: 11, name: '渔家少年', description: '常年在江河湖海中讨生活，水性极佳，体魄强健。', talent_cost: 1, attribute_modifiers: { root_bone: 2 }, rarity: 2 },
  { id: 12, name: '王朝皇子', description: '生于凡人王朝的权力之巅，自幼享受锦衣玉食和最好的教育，但与修仙界的接触较少。', talent_cost: 3, attribute_modifiers: { charm: 2, temperament: 1 }, rarity: 4 },
  { id: 13, name: '药童出身', description: '自幼在丹房长大，日夜与灵药为伴，对药理有超常的敏感。', talent_cost: 2, attribute_modifiers: { spirit: 1, comprehension: 1 }, rarity: 3 },
  { id: 14, name: '阵法学徒', description: '师从阵法大师，自小研习阵法纹路，对空间感知极其敏锐。', talent_cost: 3, attribute_modifiers: { comprehension: 2, spirit: 1 }, rarity: 4 },
  { id: 15, name: '猎妖世家', description: '祖上世代以猎妖为生，血脉中蕴含微弱的妖族之力，对妖气极其敏感。', talent_cost: 4, attribute_modifiers: { root_bone: 2, temperament: 1 }, rarity: 4 },
  { id: 16, name: '流浪乞丐', description: '自幼流落街头，饱经风霜，磨练出超凡的意志和适应能力。', talent_cost: -1, attribute_modifiers: { temperament: 2, luck: -1 }, rarity: 2 },
  { id: 17, name: '矿奴余生', description: '曾是灵矿奴隶，在暗无天日的矿洞中挣扎求生，体魄强健但缺乏灵性。', talent_cost: 0, attribute_modifiers: { root_bone: 3, spirit: -1 }, rarity: 2 },
  { id: 18, name: '画师传人', description: '师承名家，精通丹青之道，对符箓有天生的理解力。', talent_cost: 3, attribute_modifiers: { comprehension: 1, charm: 2 }, rarity: 3 },
  { id: 19, name: '古墓守陵人', description: '世代守护古墓，长期与死气阴气打交道，对鬼道有独特感悟。', talent_cost: 2, attribute_modifiers: { temperament: 2, spirit: 1 }, rarity: 4 },
  { id: 20, name: '戏班伶人', description: '自幼学戏，擅长察言观色，魅力非凡，但修道之心不够坚定。', talent_cost: 1, attribute_modifiers: { charm: 3, temperament: -1 }, rarity: 2 },
  { id: 21, name: '星象世家', description: '家族世代观星测运，你自小研习星象之术，对天地规律有独特理解。', talent_cost: 5, attribute_modifiers: { comprehension: 2, luck: 2 }, rarity: 5 },
  { id: 22, name: '部落萨满', description: '出身蛮荒部落，继承了萨满的血脉，对自然之力有天生的亲和。', talent_cost: 4, attribute_modifiers: { spirit: 2, root_bone: 1 }, rarity: 4 },
  { id: 23, name: '孤岛遗民', description: '生于与世隔绝的孤岛，保留着上古时代的原始修行法门。', talent_cost: 3, attribute_modifiers: { temperament: 2, comprehension: 1 }, rarity: 4 },
  { id: 24, name: '亡国遗孤', description: '国破家亡，历经苦难，心性坚韧如铁，但背负着沉重的仇恨。', talent_cost: 2, attribute_modifiers: { temperament: 3, luck: -1 }, rarity: 3 }
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
  {
    id: 14,
    name: '暗灵根',
    tier: '极品',
    description: '极为罕见的变异灵根，与黑暗为伴，掌控阴影之力。修行暗系功法速度极快，擅长隐匿和暗杀。',
    cultivation_speed: '2.0x',
    special_effects: ['暗系法术威力+80%', '隐身能力', '暗夜增幅+50%', '影遁'],
    base_multiplier: 2.0,
    talent_cost: 15,
    rarity: 4
  },
  {
    id: 15,
    name: '光灵根',
    tier: '极品',
    description: '传说中的圣洁灵根，天生亲近光明，驱邪破煞。修行光系功法事半功倍，对邪祟有天然克制。',
    cultivation_speed: '2.0x',
    special_effects: ['光系法术威力+80%', '邪祟克制+100%', '治愈增幅', '圣光庇护'],
    base_multiplier: 2.0,
    talent_cost: 15,
    rarity: 4
  },
  {
    id: 16,
    name: '血灵根',
    tier: '特殊',
    description: '邪道灵根，以血为引，修行迅速但需要大量鲜血滋养。容易走火入魔，但力量增长极快。',
    cultivation_speed: '1.8x',
    special_effects: ['血系法术威力+70%', '吸血恢复', '嗜血狂化', '魔道亲和'],
    base_multiplier: 1.8,
    talent_cost: 10,
    rarity: 4
  },
  {
    id: 17,
    name: '骨灵根',
    tier: '特殊',
    description: '罕见的死灵根，天生亲近死气，能够操控骸骨。修行鬼道功法速度极快，但被正道所不容。',
    cultivation_speed: '1.7x',
    special_effects: ['死灵法术威力+60%', '骸骨操控', '死气免疫', '鬼道天赋'],
    base_multiplier: 1.7,
    talent_cost: 8,
    rarity: 4
  },
  {
    id: 18,
    name: '木灵根',
    tier: '中品',
    description: '木行资质尚可，对木系功法有不错的亲和力，能够顺利踏上修行之路。',
    cultivation_speed: '1.3x',
    special_effects: ['木系法术威力+25%', '生命力恢复+20%'],
    base_multiplier: 1.3,
    talent_cost: 6,
    rarity: 2
  },
  {
    id: 19,
    name: '水灵根',
    tier: '中品',
    description: '水行资质良好，法力绵延不绝，适应性强，修行较为顺畅。',
    cultivation_speed: '1.3x',
    special_effects: ['水系法术威力+25%', '灵气恢复+20%'],
    base_multiplier: 1.3,
    talent_cost: 6,
    rarity: 2
  },
  {
    id: 20,
    name: '土灵根',
    tier: '中品',
    description: '土行资质不错，防御力强，稳扎稳打，是阵法师的良好资质。',
    cultivation_speed: '1.3x',
    special_effects: ['土系法术威力+25%', '防御力+20%'],
    base_multiplier: 1.3,
    talent_cost: 6,
    rarity: 2
  },
  {
    id: 21,
    name: '毒灵根',
    tier: '极品',
    description: '极为罕见的变异灵根，天生百毒不侵，修行毒功速度极快，是毒道修士梦寐以求的体质。',
    cultivation_speed: '2.0x',
    special_effects: ['毒系法术威力+80%', '百毒不侵', '剧毒增幅', '毒素感知'],
    base_multiplier: 2.0,
    talent_cost: 15,
    rarity: 4
  },
  {
    id: 22,
    name: '双生灵根',
    tier: '极品',
    description: '万中无一的双属性灵根，同时拥有两种基础灵根的力量。可修炼两系功法，但初期进展缓慢。',
    cultivation_speed: '1.8x',
    special_effects: ['双系法术亲和', '融合突破+30%', '双修加成'],
    base_multiplier: 1.8,
    talent_cost: 14,
    rarity: 4
  },
  {
    id: 23,
    name: '虚空灵根',
    tier: '神品',
    description: '传说中的至高灵根之一，掌控虚空法则，可穿梭空间。修行极难但潜力无穷。',
    cultivation_speed: '0.9x(前期) → 3.0x(后期)',
    special_effects: ['空间法术精通', '虚空穿梭', '空间锁定', '次元斩'],
    base_multiplier: 3.0,
    talent_cost: 25,
    rarity: 5
  },
  {
    id: 24,
    name: '时间灵根',
    tier: '神品',
    description: '最为稀有的传说灵根，触及时间法则。修炼艰难但一旦有成，可逆转岁月，掌控因果。',
    cultivation_speed: '0.8x(前期) → 3.2x(后期)',
    special_effects: ['时间法术精通', '时光倒流', '因果推演', '时间加速'],
    base_multiplier: 3.2,
    talent_cost: 28,
    rarity: 5
  },
  {
    id: 25,
    name: '星辰灵根',
    tier: '神品',
    description: '吸纳星辰之力的稀世灵根，与星空共鸣。修行缓慢但境界稳固，可借星辰之力突破瓶颈。',
    cultivation_speed: '0.85x(前期) → 2.9x(后期)',
    special_effects: ['星辰之力', '星图演化', '星光庇护', '星陨术'],
    base_multiplier: 2.9,
    talent_cost: 26,
    rarity: 5
  },
  {
    id: 26,
    name: '阴阳灵根',
    tier: '神品',
    description: '至高双生灵根，阴阳调和，太极生两仪。可同时修炼阴阳两种功法，融合后威力倍增。',
    cultivation_speed: '0.9x(前期) → 3.1x(后期)',
    special_effects: ['阴阳调和', '两仪归一', '太极生威', '阴阳逆转'],
    base_multiplier: 3.1,
    talent_cost: 27,
    rarity: 5
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
  {
    id: 13,
    name: '一诺千金',
    description: '你的承诺极具分量，更容易获得他人的信任与好感。',
    talent_cost: 3,
    rarity: 2,
    effects: [
      { 类型: '后天六司', 目标: '魅力', 数值: 2 }
    ]
  },
  {
    id: 14,
    name: '天生毒体',
    description: '百毒不侵，且能更好地驾驭毒功，但常人不敢轻易接近。',
    talent_cost: 6,
    rarity: 4,
    effects: [
      { 类型: '特殊能力', 名称: '毒素免疫', 数值: 1 },
      { 类型: '技能加成', 技能: '毒术', 数值: 0.15 },
      { 类型: '后天六司', 目标: '魅力', 数值: -2 }
    ]
  },
  {
    id: 15,
    name: '画龙点睛',
    description: '在制作符箓时，有一定几率产生意想不到的强大效果。',
    talent_cost: 4,
    rarity: 3,
    effects: [
      { 类型: '技能加成', 技能: '符箓', 数值: 0.1 },
      { 类型: '特殊能力', 名称: '符箓变异', 数值: 0.05 }
    ]
  },
  {
    id: 16,
    name: '顶级魅力',
    description: '天生丽质，气质非凡，魅力超群。无论走到哪里都是众人瞩目的焦点，极容易获得他人的好感与信任。在社交场合如鱼得水，能够以言语和魅力化解大部分冲突。',
    talent_cost: 8,
    rarity: 4,
    effects: [
      { 类型: '后天六司', 目标: '魅力', 数值: 5 },
      { 类型: '特殊能力', 名称: '魅力光环', 数值: 0.2 },
      { 类型: '特殊能力', 名称: '社交天赋', 数值: 0.15 }
    ]
  },
  {
    id: 17,
    name: '道心坚固',
    description: '道心如铁，心魔难侵。突破时更不容易走火入魔，受到诱惑和幻术影响的几率大幅降低。',
    talent_cost: 6,
    rarity: 4,
    effects: [
      { 类型: '后天六司', 目标: '心性', 数值: 3 },
      { 类型: '特殊能力', 名称: '心魔抗性', 数值: 0.3 }
    ]
  },
  {
    id: 18,
    name: '天生神力',
    description: '天生力大无穷，体质远超常人。擅长近战搏杀，气血旺盛。',
    talent_cost: 5,
    rarity: 3,
    effects: [
      { 类型: '后天六司', 目标: '根骨', 数值: 4 },
      { 类型: '特殊能力', 名称: '近战增幅', 数值: 0.2 }
    ]
  },
  {
    id: 19,
    name: '灵觉敏锐',
    description: '六感超凡，对危险有本能的预感。在战斗和探险中能够提前感知到威胁。',
    talent_cost: 4,
    rarity: 3,
    effects: [
      { 类型: '后天六司', 目标: '灵性', 数值: 3 },
      { 类型: '特殊能力', 名称: '危险感知', 数值: 1 }
    ]
  },
  {
    id: 20,
    name: '夜猫子',
    description: '夜晚精神百倍，修炼效率提升。但白天会感到困倦。',
    talent_cost: 1,
    rarity: 2,
    effects: [
      { 类型: '特殊能力', 名称: '夜间修炼加速', 数值: 0.3 }
    ]
  },
  {
    id: 21,
    name: '天道眷顾',
    description: '受天道眷顾，突破时成功率更高，遭遇天劫时威力减弱。',
    talent_cost: 10,
    rarity: 5,
    effects: [
      { 类型: '后天六司', 目标: '气运', 数值: 5 },
      { 类型: '特殊能力', 名称: '突破成功率', 数值: 0.2 },
      { 类型: '特殊能力', 名称: '天劫削弱', 数值: 0.15 }
    ]
  },
  {
    id: 22,
    name: '剑骨天成',
    description: '天生剑骨，与剑有莫名的契合。剑法威力倍增，领悟剑意速度极快。',
    talent_cost: 10,
    rarity: 5,
    effects: [
      { 类型: '后天六司', 目标: '根骨', 数值: 2 },
      { 类型: '技能加成', 技能: '剑法', 数值: 0.25 },
      { 类型: '特殊能力', 名称: '剑意感悟', 数值: 0.2 }
    ]
  },
  {
    id: 23,
    name: '天生道体',
    description: '传说中的道体，天生契合天地大道，修炼任何功法都事半功倍。',
    talent_cost: 18,
    rarity: 5,
    effects: [
      { 类型: '后天六司', 目标: '悟性', 数值: 4 },
      { 类型: '后天六司', 目标: '灵性', 数值: 4 },
      { 类型: '特殊能力', 名称: '万法精通', 数值: 0.3 }
    ]
  },
  {
    id: 24,
    name: '符道奇才',
    description: '对符箓有超凡的领悟，绘制符箓成功率高，威力强大。',
    talent_cost: 7,
    rarity: 4,
    effects: [
      { 类型: '后天六司', 目标: '悟性', 数值: 2 },
      { 类型: '技能加成', 技能: '符箓', 数值: 0.2 },
      { 类型: '特殊能力', 名称: '符箓精通', 数值: 0.15 }
    ]
  },
  {
    id: 25,
    name: '灵兽亲和',
    description: '天生亲和灵兽，更容易收服和沟通灵兽，灵兽战力提升。',
    talent_cost: 6,
    rarity: 4,
    effects: [
      { 类型: '后天六司', 目标: '魅力', 数值: 2 },
      { 类型: '特殊能力', 名称: '灵兽契约', 数值: 0.3 },
      { 类型: '特殊能力', 名称: '灵兽战力', 数值: 0.2 }
    ]
  },
  {
    id: 26,
    name: '天生魔心',
    description: '心性偏向魔道，修炼魔功速度极快，但容易走火入魔。正道功法修炼困难。',
    talent_cost: 5,
    rarity: 4,
    effects: [
      { 类型: '后天六司', 目标: '心性', 数值: -2 },
      { 类型: '特殊能力', 名称: '魔功加速', 数值: 0.4 },
      { 类型: '特殊能力', 名称: '走火入魔', 数值: 0.15 }
    ]
  },
  {
    id: 27,
    name: '器道宗师',
    description: '对炼器有非凡的天赋，炼制的法器品质更高，成功率更高。',
    talent_cost: 9,
    rarity: 4,
    effects: [
      { 类型: '后天六司', 目标: '悟性', 数值: 2 },
      { 类型: '技能加成', 技能: '炼器', 数值: 0.25 },
      { 类型: '特殊能力', 名称: '极品概率', 数值: 0.1 }
    ]
  },
  {
    id: 28,
    name: '孤星命格',
    description: '天煞孤星，注定孤独一生。气运极低，但在绝境中更容易突破。',
    talent_cost: -3,
    rarity: 3,
    effects: [
      { 类型: '后天六司', 目标: '气运', 数值: -5 },
      { 类型: '特殊能力', 名称: '绝境突破', 数值: 0.3 }
    ]
  },
  {
    id: 29,
    name: '先知梦境',
    description: '偶尔能在梦中窥见未来的片段，提前规避危险或把握机缘。',
    talent_cost: 8,
    rarity: 5,
    effects: [
      { 类型: '后天六司', 目标: '悟性', 数值: 2 },
      { 类型: '后天六司', 目标: '气运', 数值: 3 },
      { 类型: '特殊能力', 名称: '预知危险', 数值: 1 }
    ]
  },
  {
    id: 30,
    name: '长生体质',
    description: '天生寿元悠长，比常人更不易衰老，有更多时间追求大道。',
    talent_cost: 12,
    rarity: 5,
    effects: [
      { 类型: '后天六司', 目标: '根骨', 数值: 3 },
      { 类型: '特殊能力', 名称: '寿命延长', 数值: 0.3 }
    ]
  }
];
