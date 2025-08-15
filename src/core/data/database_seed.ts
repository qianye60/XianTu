import type { World, Origin, Talent, SpiritRoot } from '@/core/rules/characterCreation'
import { CoreAttribute } from '@/core/rules/characterCreation'

export const DEFAULT_WORLDS: World[] = [
  {
    id: 1,
    name: '苍穹界',
    type: 'cultivation',
    description: '天地初开，道法自然。这是一个古老而神秘的修仙世界，灵气充沛，机缘无数。',
    features: ['灵气充沛', '古老传承', '宗门林立'],
    cultivation_bonus: '修炼速度+10%'
  },
  {
    id: 2,
    name: '九州大陆',
    type: 'cultivation',
    description: '九州大陆广袤无垠，分为九大域，各域风格迥异，修仙文明繁荣昌盛。',
    features: ['地域广阔', '文明繁荣', '资源丰富'],
    cultivation_bonus: '悟性+5'
  },
  {
    id: 3,
    name: '玄天秘境',
    type: 'cultivation',
    description: '神秘的秘境世界，充满未知的危险与机遇，是勇者的试炼场。',
    features: ['危机四伏', '机缘众多', '法则混乱'],
    cultivation_bonus: '战斗经验+20%'
  }
]

export const EXTENDED_ORIGINS: Origin[] = [
  {
    id: 1,
    name: '凡人出身',
    description: '出身平凡，无任何修仙背景',
    attributeModifiers: {},
    rarity: 1,
    talent_cost: 0,
    type: 'origin'
  },
  {
    id: 2,
    name: '修仙世家',
    description: '出身修仙世家，自幼接触修行',
    attributeModifiers: {
      [CoreAttribute.COMPREHENSION]: 5,
      [CoreAttribute.ROOT_BONE]: 3,
      [CoreAttribute.FORTUNE]: 2
    },
    rarity: 2,
    talent_cost: 3,
    type: 'origin'
  },
  {
    id: 3,
    name: '宗门弟子',
    description: '某个宗门的外门弟子',
    attributeModifiers: {
      [CoreAttribute.COMPREHENSION]: 3,
      [CoreAttribute.ROOT_BONE]: 5,
      [CoreAttribute.CHARM]: 2
    },
    rarity: 2,
    talent_cost: 3,
    type: 'origin'
  }
]

export const EXTENDED_TALENTS: Talent[] = [
  {
    id: 1,
    name: '天生慧根',
    description: '悟性极高，学习功法事半功倍',
    rarity: 3,
    talent_cost: 3,
    effects: JSON.stringify([{
      type: 'ATTRIBUTE_MODIFIER',
      target: CoreAttribute.COMPREHENSION,
      value: 10
    }]),
    type: 'talent',
    effectType: 'ATTRIBUTE_MODIFIER',
    attributeTarget: CoreAttribute.COMPREHENSION,
    effectValue: 10
  },
  {
    id: 2,
    name: '灵体',
    description: '天生灵体，修炼速度大幅提升',
    rarity: 4,
    talent_cost: 5,
    effects: JSON.stringify([{
      type: 'ATTRIBUTE_MODIFIER',
      target: CoreAttribute.ROOT_BONE,
      value: 10
    }]),
    type: 'talent',
    effectType: 'ATTRIBUTE_MODIFIER',
    attributeTarget: CoreAttribute.ROOT_BONE,
    effectValue: 10
  },
  {
    id: 3,
    name: '福星高照',
    description: '运气极佳，常遇机缘',
    rarity: 3,
    talent_cost: 3,
    effects: JSON.stringify([{
      type: 'ATTRIBUTE_MODIFIER',
      target: CoreAttribute.FORTUNE,
      value: 10
    }]),
    type: 'talent',
    effectType: 'ATTRIBUTE_MODIFIER',
    attributeTarget: CoreAttribute.FORTUNE,
    effectValue: 10
  }
]

export const EXTENDED_SPIRIT_ROOTS: SpiritRoot[] = [
  {
    id: 1,
    name: '五灵根',
    description: '五行俱全，但修炼速度较慢',
    aptitude: 50,
    talent_cost: 0,
    base_multiplier: 0.5,
    effects: JSON.stringify({
      cultivation_speed: 0.5,
      breakthrough_difficulty: 1.5
    }),
    type: 'spirit_root'
  },
  {
    id: 2,
    name: '三灵根',
    description: '三种属性灵根，修炼速度中等',
    aptitude: 70,
    talent_cost: 3,
    base_multiplier: 1.0,
    effects: JSON.stringify({
      cultivation_speed: 1.0,
      breakthrough_difficulty: 1.0
    }),
    type: 'spirit_root'
  },
  {
    id: 3,
    name: '天灵根',
    description: '单一属性灵根，修炼速度极快',
    aptitude: 100,
    talent_cost: 10,
    base_multiplier: 3.0,
    effects: JSON.stringify({
      cultivation_speed: 3.0,
      breakthrough_difficulty: 0.5,
      special_effects: ['修炼速度+200%', '突破瓶颈难度-50%']
    }),
    type: 'spirit_root'
  }
]