import type { Origin, Talent, SpiritRoot, World } from '@/core/rules/characterCreation'

export const DEFAULT_WORLDS: World[] = [
  {
    id: 1,
    name: '朝天大陆',
    type: '古典仙侠',
    description:
      '此乃万道之始，众生朝天之界。此界的核心法则是森严的境界壁垒，不同生命层次之间宛如天渊之隔。修行初阶，修士尚在凡尘浊世中挣扎，于稀薄灵气中寻觅仙缘，在王朝更迭中见证沧桑；待到道途中段，方能接触真正的元气清都，此处宗门林立，为争夺修行资源而合纵连横；唯有臻至上境，才能触及那传说中的法则天域，一念引动天地异象。修士的毕生所求，便是突破这层层无形的壁垒，跨越仙凡之堑，最终在道之巅峰叩问本源，与天争命。此界道途万千，剑修、佛门、儒道、魔道、艺道百花齐放，共同构成了波澜壮阔的修仙画卷。',
    features: ['森严境界壁垒', '仙凡之别', '百家争鸣', '财侣法地'],
    cultivation_bonus: '经典模式，修行速度基准',
  },
  {
    id: 2,
    name: '混沌星域',
    type: '无尽星海',
    description:
      '此方宇宙，并无统一的大陆，而是由无尽的星辰与破碎的位面构成。各个星系文明迥异，修行体系千差万别。有驾驭星舰、身着机甲的科技修士，以高能灵晶炮轰碎星辰；也有吐纳恒星真火、肉身横渡虚空的古法修士；更有与星兽共生，掌控引力的异族文明。修士需乘坐“虚空渡舟”，在不同的“星岸”之间穿梭，交易特产，学习异域功法，探索隐藏在陨石带深处的上古遗迹。在这里，生存是第一法则，没有永恒的道友，只有永恒的利益。宇宙风暴、虚空巨兽、文明猎手是每一个星际旅者的噩梦，但无尽的未知也意味着无尽的机缘。',
    features: ['星际穿梭', '科技与修真并存', '多元文明体系', '黑暗森林法则'],
    cultivation_bonus: '领悟异种功法概率 +30%',
  },
  {
    id: 3,
    name: '荒古大地',
    type: '蛮荒纪元',
    description:
      '一片被时光遗忘的古老大陆，天地间充斥着狂暴而原始的荒古之气。这里没有宗门，没有仙城，只有以血脉划分的原始部落。人类并非此地主宰，体型如山峦的太古凶兽、生而能掌控法则的纯血神魔后裔，才是这片大地的主人。修士的修行，更像是一种血脉的返祖与觉醒，他们将凶兽的精魄炼入体内，获得其神通；在神魔遗骸边感悟，继承其部分法则。此界的战斗血腥而直接，每一次狩猎都是生死一线的搏杀。修士以部落图腾为信仰，争夺稀少的“生命源地”，以求在残酷的环境中延续族群的火种。',
    features: ['太古凶兽横行', '血脉返祖修行', '部落图腾信仰', '机缘与危险并存'],
    cultivation_bonus: '战斗经验获取 +50%，炼体功法效果 +15%',
  },
]

export const DEFAULT_ORIGINS: Omit<Origin, 'id'>[] = [
  {
    name: '凡人俗子',
    description: '生于尘世，归于尘土，未曾接触过仙道，一切皆是未知。',
    attributeModifiers: { CON: 0, INT: 0, SPI: 0, CHA: 0, LUK: 0, BKG: 0 },
    type: 'origin',
  },
  {
    name: '书香门第',
    description: '出身于官宦或书香世家，自幼饱读诗书，见识不凡。',
    attributeModifiers: { CON: -1, INT: 2, SPI: 0, CHA: 1, LUK: 0, BKG: 1 },
    type: 'origin',
  },
  {
    name: '将门虎子',
    description: '生于武将之家，从小熬炼筋骨，体魄强健，心志坚毅。',
    attributeModifiers: { CON: 2, INT: -1, SPI: 1, CHA: 0, LUK: 0, BKG: 1 },
    type: 'origin',
  },
  {
    name: '山野遗孤',
    description: '自幼在山林间与野兽为伴，生存能力极强，心性纯粹。',
    attributeModifiers: { CON: 1, INT: 0, SPI: 2, CHA: -1, LUK: 1, BKG: -2 },
    type: 'origin',
  },
]

export const DEFAULT_TALENTS: Talent[] = [
  {
    name: '过目不忘',
    description: '天生记忆力超群，任何功法典籍只需一览便能铭记于心。',
    effects: '悟性(INT) +3',
    type: 'talent',
    id: 'bookworm',
  },
  {
    name: '钢筋铁骨',
    description: '天生筋骨强健，是万中无一的炼体奇才。',
    effects: '根骨(CON) +3',
    type: 'talent',
    id: 'strong_body',
  },
  {
    name: '天生福将',
    description: '气运惊人，总能在危难之时逢凶化吉。',
    effects: '气运(LUK) +3',
    type: 'talent',
    id: 'lucky_star',
  },
  {
    name: '口若悬河',
    description: '能言善辩，令人如沐春风，极具说服力。',
    effects: '仪容(CHA) +3',
    type: 'talent',
    id: 'silver_tongue',
  },
  {
    name: '家财万贯',
    description: '你家非常有钱，修行之路可以用灵石铺平。',
    effects: '家世(BKG) +3',
    type: 'talent',
    id: 'rich_family',
  },
  {
    name: '神识敏锐',
    description: '神识远超常人，对灵气和危险的感知极为敏锐。',
    effects: '神识(SPI) +3',
    type: 'talent',
    id: 'sharp_mind',
  },
]

// 为单机模式扩展更多天赋
export const EXTENDED_TALENTS: Talent[] = [
  ...DEFAULT_TALENTS,
  {
    name: '金刚不坏',
    description: '天生皮肤坚韧，刀剑难伤，是炼体的不二之选。',
    effects: '根骨(CON) +2, 受到物理伤害时有20%几率免疫',
    type: 'talent',
    id: 'steel_body',
  },
  {
    name: '天纵奇才',
    description: '对任何功法都能快速领悟，是万年难遇的修行天才。',
    effects: '悟性(INT) +2, 神识(SPI) +2',
    type: 'talent',
    id: 'genius',
  },
  {
    name: '紫府道种',
    description: '生而带有先天道种，注定在道法一途有惊世成就。',
    effects: '神识(SPI) +4, 悟性(INT) +1',
    type: 'talent',
    id: 'dao_seed',
  },
  {
    name: '天生帝皇相',
    description: '生而不凡，天生具有统御天下的帝王之相。',
    effects: '仪容(CHA) +2, 家世(BKG) +2, 气运(LUK) +1',
    type: 'talent',
    id: 'emperor_fate',
  }
]

export const DEFAULT_SPIRIT_ROOTS: Omit<SpiritRoot, 'id' | 'effects'>[] = [
  {
    name: '五行杂灵根',
    description: '五行皆有，却无一精通，修行速度缓慢，被视为废灵根。',
    aptitude: 10,
    type: 'spirit_root',
  },
  {
    name: '金灵根',
    description: '金属性天生亲和，修行金系功法事半功倍，攻击锐利无匹。',
    aptitude: 50,
    type: 'spirit_root',
  },
  {
    name: '木灵根',
    description: '木属性天生亲和，善于操控草木，回复能力强，生机勃勃。',
    aptitude: 50,
    type: 'spirit_root',
  },
  {
    name: '水灵根',
    description: '水属性天生亲和，功法灵动多变，绵柔悠长。',
    aptitude: 50,
    type: 'spirit_root',
  },
  {
    name: '火灵根',
    description: '火属性天生亲和，功法爆裂霸道，破坏力惊人。',
    aptitude: 50,
    type: 'spirit_root',
  },
  {
    name: '土灵根',
    description: '土属性天生亲和，防御力极强，稳重如山。',
    aptitude: 50,
    type: 'spirit_root',
  },
  {
    name: '天灵根（混沌）',
    description: '传说中的至高灵根，五行归一，万法皆通，修行一日千里。',
    aptitude: 100,
    type: 'spirit_root',
  },
]

// 为单机模式扩展更多灵根
export const EXTENDED_SPIRIT_ROOTS: SpiritRoot[] = [
  ...DEFAULT_SPIRIT_ROOTS.map((root, index) => ({
    ...root,
    id: index.toString(),
    effects: '无特殊效果',
  })),
  {
    id: '7',
    name: '双灵根（金水）',
    description: '拥有金水双属性，攻防兼备，较为罕见。',
    aptitude: 70,
    type: 'spirit_root',
    effects: '金、水系法术效果 +10%',
  },
  {
    id: '8',
    name: '双灵根（木火）',
    description: '拥有木火双属性，生机与爆发并存，颇为难得。',
    aptitude: 70,
    type: 'spirit_root',
    effects: '木、火系法术效果 +10%',
  },
  {
    id: '9',
    name: '异灵根（雷）',
    description: '稀有的雷属性灵根，掌控雷霆之力，威力无穷。',
    aptitude: 80,
    type: 'spirit_root',
    effects: '雷系法术威力 +20%，对妖邪有克制效果',
  },
  {
    id: '10',
    name: '异灵根（冰）',
    description: '稀有的冰属性灵根，冰封万物，攻防一体。',
    aptitude: 80,
    type: 'spirit_root',
    effects: '冰系法术有几率冻结敌人',
  },
  {
    id: '11',
    name: '异灵根（风）',
    description: '稀有的风属性灵根，身法如风，来去无踪。',
    aptitude: 80,
    type: 'spirit_root',
    effects: '战斗中闪避率提升',
  }
]

// 扩展更多出身
export const EXTENDED_ORIGINS: Origin[] = [
  ...DEFAULT_ORIGINS.map((origin, index) => ({ ...origin, id: index.toString() })),
  {
    id: '4',
    name: '商贾之家',
    description: '出身富商之家，自幼经商，精通算计，人脉广泛。',
    attributeModifiers: { CON: 0, INT: 1, SPI: 0, CHA: 2, LUK: 1, BKG: 2 },
    type: 'origin',
  },
  {
    id: '5',
    name: '江湖浪子',
    description: '自幼流浪江湖，见多识广，但居无定所，命运多舛。',
    attributeModifiers: { CON: 1, INT: 1, SPI: 1, CHA: 1, LUK: -1, BKG: -2 },
    type: 'origin',
  },
  {
    id: '6',
    name: '药王谷弟子',
    description: '出身医道世家，精通药理，对生死之道有独特理解。',
    attributeModifiers: { CON: 0, INT: 2, SPI: 1, CHA: 0, LUK: 1, BKG: 1 },
    type: 'origin',
  },
  {
    id: '7',
    name: '皇室血脉',
    description: '贵为皇室子嗣，天生尊贵，但也背负沉重命运。',
    attributeModifiers: { CON: 0, INT: 1, SPI: 0, CHA: 3, LUK: 1, BKG: 3 },
    type: 'origin',
  },
  {
    id: '8',
    name: '武林世家',
    description: '出身武学世家，自幼习武，根基深厚。',
    attributeModifiers: { CON: 2, INT: 0, SPI: 1, CHA: 0, LUK: 0, BKG: 2 },
    type: 'origin',
  },
  {
    id: '9',
    name: '隐士之后',
    description: '祖辈为避世隐士，传承古法，与世无争。',
    attributeModifiers: { CON: 0, INT: 1, SPI: 3, CHA: -1, LUK: 2, BKG: 0 },
    type: 'origin',
  }
]
