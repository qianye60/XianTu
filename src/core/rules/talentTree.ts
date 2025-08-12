import type { Talent } from '@/types/core'

export const TALENT_TREE: Talent[] = [
  {
    id: 'fast-learner',
    name: '闻一知十',
    description: '修炼速度提高10%。',
    cost: 2,
  },
  {
    id: 'strong-body',
    name: '龙象之躯',
    description: '根骨基础值增加5点。',
    cost: 3,
  },
  {
    id: 'silver-tongue',
    name: '道貌岸然',
    description: '魅力基础值增加5点，更容易获得他人好感。',
    cost: 3,
  },
  {
    id: 'alchemist-apprentice',
    name: '丹道初解',
    description: '解锁初级炼丹术，有几率炼制出低阶丹药。',
    cost: 5,
    prerequisites: [],
  },
  {
    id: 'sword-intent',
    name: '剑心通明',
    description: '剑法类功法威力提升。',
    levels: [
      { cost: 3, description: '剑法类功法威力提升5%。' },
      { cost: 5, description: '剑法类功法威力提升10%。' },
      { cost: 7, description: '剑法类功法威力提升15%，解锁“御剑”能力。' },
    ],
  },
  {
    id: 'lucky-star',
    name: '气运之子',
    description: '福缘基础值增加10点，更容易遇到奇遇。',
    cost: 7,
  },
]
