// 本地数据文件 - 从后端种子数据复制

export interface LocalWorld {
  id: number;
  name: string;
  era: string;
  description: string;
}

export interface LocalOrigin {
  id: number;
  name: string;
  description: string;
  attribute_modifiers: Record<string, any> | null;
  talent_cost: number;
}

export interface LocalTalent {
  id: number;
  name: string;
  description: string;
  effects: any[];
  talent_cost: number;
}

export interface LocalSpiritRoot {
  id: number;
  name: string;
  description: string;
  base_multiplier: number;
  talent_cost: number;
}

export interface LocalTalentTier {
  id: number;
  name: string;
  description: string;
  total_points: number;
  color: string;
}

// 世界数据 - 从 seed_worlds.py
export const LOCAL_WORLDS: LocalWorld[] = [
  {
    id: 1,
    name: '朝天大陆',
    era: '朝天历元年',
    description: `此方世界名为"朝天大陆"，乃是一处天道完整、灵气充沛的上善之地。其核心法则是"万灵竞渡，一步登天"，无论是人、妖、精、怪，皆有缘法踏上修行之路，叩问长生。
仙凡之别在此界泾渭分明，宛若天渊。凡人寿不过百载，受生老病死之苦，终归一抔黄土；而修士一旦踏入道途，便能吞吐天地灵气，淬炼己身，寿元动辄千载，更有大能者与天地同寿。凡俗王朝更迭，于修士而言不过是弹指一瞬间。在凡人眼中，修士是高悬于九天的仙神，一言可定一国兴衰，一念可引风雨雷霆。然而，这种力量并非毫无代价。
此界奉行"大道争锋"的铁则，天道予万物机缘，却也降下无尽凶险。灵脉宝地、神功秘法、天材地宝，皆是有缘者居之，而"缘"字背后，往往是血与火的洗礼。修士之间，为求道途精进，争斗乃是常态。同门可能反目，挚友亦会背叛，杀人夺宝、斩草除根之事屡见不鲜。这是一个极度自由的世界，你可以选择成为守护一方的善仙，亦可成为肆虐八荒的魔头，只要你有足够的实力。但自由的背后，是无处不在的危险，一步踏错，便是万劫不复，身死道消。
然天道亦有制衡，修士若无故以大法力干涉凡俗王朝更迭、屠戮凡人，便会与此方天地结下因果。虽无业报加身，却会在日后冲击更高境界、渡劫飞升之时，引来更强大的天劫，平添无数变数。故而多数修士选择在山门清修，或于红尘历练，以求勘破心障，证得大道。修仙百艺——炼丹、炼器、符箓、阵法，在此界发展到了极致，共同构筑了一个无比兴盛、却也无比残酷的修仙文明。`
  }
];

// 天资等级数据 - 从 seed_talent_tiers.py
export const LOCAL_TALENT_TIERS: LocalTalentTier[] = [
  {
    id: 1,
    name: "废柴",
    description: "天资愚钝，资质平庸。修行之路困难重重，唯有靠不懈努力方能有所建树。",
    total_points: 10,
    color: "#8B4513"  // 棕色
  },
  {
    id: 2,
    name: "普通",
    description: "资质平平，无甚出奇之处。修行稳扎稳打，按部就班即可。",
    total_points: 15,
    color: "#808080"  // 灰色
  },
  {
    id: 3,
    name: "优秀",
    description: "颇有天赋，资质不错。修行事半功倍，前景可观。",
    total_points: 20,
    color: "#4169E1"  // 蓝色
  },
  {
    id: 4,
    name: "天才",
    description: "天赋异禀，资质出众。修行如有神助，进境神速。",
    total_points: 30,
    color: "#9932CC"  // 紫色
  },
  {
    id: 5,
    name: "妖孽",
    description: "天才中的天才，资质卓绝。万中无一的修行种子，前途不可限量。",
    total_points: 40,
    color: "#FFD700"  // 金色
  },
  {
    id: 6,
    name: "逆天",
    description: "万古难遇的绝世天才，资质逆天。天道眷顾，必成大器。",
    total_points: 50,
    color: "#FF0000"  // 红色
  }
];

// 出身数据 - 从 seed_rules.py
export const LOCAL_ORIGINS: LocalOrigin[] = [
  {
    id: 1,
    name: '书香门第',
    description: '你出生于凡人学者之家，自幼饱读诗书，神识与悟性远超常人。',
    attribute_modifiers: { INT: 3, SPI: 2 },
    talent_cost: 3
  },
  {
    id: 2,
    name: '将门虎子',
    description: '你生于凡尘将帅之家，千锤百炼，体魄强健，意志坚定。',
    attribute_modifiers: { STR: 3, CON: 2 },
    talent_cost: 3
  },
  {
    id: 3,
    name: '寒门散修',
    description: '你出身贫寒，于红尘中挣扎求生，虽无背景，却磨练出坚韧不拔的道心和远超常人的气运。',
    attribute_modifiers: { CON: 1, LUK: 4 },
    talent_cost: 2
  },
  {
    id: 4,
    name: '修仙世家',
    description: '你出身于一个末流修仙家族，血脉中蕴含稀薄灵气，自幼便有长辈引路，见识不凡。',
    attribute_modifiers: { SPI: 2, INT: 1 },
    talent_cost: 2
  },
  {
    id: 5,
    name: '魔道遗孤',
    description: '你是昔日某个被正道剿灭的魔道宗门的遗孤，身负血海深仇，心性狠辣，行事不择手段。',
    attribute_modifiers: { STR: 2, SPI: 2, LUK: -1 },
    talent_cost: 1
  },
  {
    id: 6,
    name: '平民出身',
    description: '平凡的农家子弟，虽无特殊背景，但生活历练造就了平衡的根基。',
    attribute_modifiers: { STR: 1, CON: 1, INT: 1, SPI: 1 },
    talent_cost: 0
  }
];

// 天赋数据 - 从 seed_rules.py
export const LOCAL_TALENTS: LocalTalent[] = [
  {
    id: 1,
    name: '天生道体',
    description: '传说中的无上体质，与道相合，修行一日千里，万法皆通。',
    effects: [
      { type: 'ATTRIBUTE_MODIFIER', target: 'INT', value: 5 },
      { type: 'ATTRIBUTE_MODIFIER', target: 'SPI', value: 5 }
    ],
    talent_cost: 10
  },
  {
    id: 2,
    name: '气运之子',
    description: '你仿佛被天地所眷顾，洪福齐天，时常能逢凶化吉，于危机中觅得大机缘。',
    effects: [{ type: 'ATTRIBUTE_MODIFIER', target: 'LUK', value: 10 }],
    talent_cost: 8
  },
  {
    id: 3,
    name: '剑心通明',
    description: '天生的剑修胚子，学习任何剑法都能迅速掌握精髓，剑道威力倍增。',
    effects: [{ type: 'SKILL_BONUS', skill: 'combat.sword', value: 0.3 }],
    talent_cost: 4
  },
  {
    id: 4,
    name: '丹道天赋',
    description: '你对药理有着天生的直觉，炼丹时如有神助，成丹率与品质远超常人。',
    effects: [{ type: 'SKILL_BONUS', skill: 'alchemy', value: 0.25 }],
    talent_cost: 4
  },
  {
    id: 5,
    name: '天生神力',
    description: '你的肉身天生便比常人强大，气血旺盛，力量惊人。',
    effects: [
      { type: 'ATTRIBUTE_MODIFIER', target: 'STR', value: 3 },
      { type: 'ATTRIBUTE_MODIFIER', target: 'CON', value: 3 }
    ],
    talent_cost: 3
  },
  {
    id: 6,
    name: '过目不忘',
    description: '你的记忆力超群，任何功法典籍只需看过一遍便能牢记于心。',
    effects: [{ type: 'ATTRIBUTE_MODIFIER', target: 'INT', value: 4 }],
    talent_cost: 2
  },
  {
    id: 7,
    name: '体格健壮',
    description: '你比一般人更健康，不易生病，恢复力更强。',
    effects: [{ type: 'ATTRIBUTE_MODIFIER', target: 'CON', value: 2 }],
    talent_cost: 1
  },
  {
    id: 8,
    name: '小有福源',
    description: '你的运气比普通人好上一些，时常能捡到些小便宜。',
    effects: [{ type: 'ATTRIBUTE_MODIFIER', target: 'LUK', value: 2 }],
    talent_cost: 1
  }
];

// 灵根数据 - 从 seed_rules.py
export const LOCAL_SPIRIT_ROOTS: LocalSpiritRoot[] = [
  {
    id: 1,
    name: '废灵根',
    description: '五行杂乱，灵气难以入体，修行之路崎岖坎坷，常人万倍之功，难得寸进。',
    base_multiplier: 0.2,
    talent_cost: 0
  },
  {
    id: 2,
    name: '伪灵根',
    description: '四五行驳杂之根，吐纳灵气事倍功半，修行缓慢，若无大机缘，终生无望筑基。',
    base_multiplier: 0.5,
    talent_cost: 0
  },
  {
    id: 3,
    name: '真灵根',
    description: '二三行之灵根，虽有驳杂，但已是常人中的佼佼者，宗门遴选之基准。',
    base_multiplier: 1.0,
    talent_cost: 2
  },
  {
    id: 4,
    name: '天灵根 (金)',
    description: '单属性灵根，纯粹无暇。纯金之体，锐意无双，修行金属性功法时速度一日千里。',
    base_multiplier: 2.0,
    talent_cost: 5
  },
  {
    id: 5,
    name: '天灵根 (木)',
    description: '单属性灵根，纯粹无暇。草木精华所钟，生机绵长，疗伤与培植灵药有奇效。',
    base_multiplier: 2.0,
    talent_cost: 5
  },
  {
    id: 6,
    name: '天灵根 (水)',
    description: '单属性灵根，纯粹无暇。与水相合，性情柔韧，法力回复速度远超同侪。',
    base_multiplier: 2.0,
    talent_cost: 5
  },
  {
    id: 7,
    name: '天灵根 (火)',
    description: '单属性灵根，纯粹无暇。天生火德之体，御火之术出神入化，攻击霸道绝伦。',
    base_multiplier: 2.0,
    talent_cost: 5
  },
  {
    id: 8,
    name: '天灵根 (土)',
    description: '单属性灵根，纯粹无暇。与大地同源，防御稳如山岳，立于不败之地。',
    base_multiplier: 2.0,
    talent_cost: 5
  },
  {
    id: 9,
    name: '异灵根 (风)',
    description: '变异灵根，御风而行，身法飘逸无踪，速度天下无双。',
    base_multiplier: 2.5,
    talent_cost: 8
  },
  {
    id: 10,
    name: '异灵根 (雷)',
    description: '变异灵根，掌九天神雷，破除一切邪魔，天生便是战斗的宠儿。',
    base_multiplier: 2.5,
    talent_cost: 8
  },
  {
    id: 11,
    name: '混沌灵根',
    description: '开天辟地之前的先天之气，万法皆通，万劫不磨，无视瓶颈。',
    base_multiplier: 4.0,
    talent_cost: 15
  }
];