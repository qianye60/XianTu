import type { Origin, Talent, SpiritRoot } from '@/core/rules/characterCreation'

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

export const DEFAULT_SPIRIT_ROOTS: Omit<SpiritRoot, 'id'>[] = [
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
