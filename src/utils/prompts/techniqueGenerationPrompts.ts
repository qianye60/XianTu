/**
 * 功法生成专用提示词系统
 * 支持完整的功法数据结构生成，包括技能、效果、等级等
 */

import { generateSystemPrompt } from './systemPrompts';

/**
 * 功法品质等级定义
 */
export const TECHNIQUE_QUALITIES = {
  '凡': { grade: [0, 2], description: '凡俗功法，修炼缓慢但基础扎实' },
  '黄': { grade: [1, 3], description: '黄阶功法，小有特色，适合入门' },
  '玄': { grade: [2, 5], description: '玄阶功法，颇有玄妙，效果显著' },
  '地': { grade: [3, 7], description: '地阶功法，威力不俗，难得一见' },
  '天': { grade: [5, 8], description: '天阶功法，威能惊人，传承稀少' },
  '仙': { grade: [7, 9], description: '仙阶功法，近乎仙术，世间罕见' },
  '神': { grade: [9, 10], description: '神阶功法，传说级功法，可遇不可求' }
} as const;

/**
 * 功法类型分类
 */
export const TECHNIQUE_TYPES = {
  '心法': '基础修炼功法，提升修为和内力',
  '身法': '轻功移动类功法，提升敏捷和闪避',
  '攻击功法': '战斗攻击类功法，提升攻击力',
  '防御功法': '防护类功法，提升防御和抗性',
  '辅助功法': '辅助修炼类功法，提供各种加成',
  '特殊功法': '独特效果的功法，如炼丹、阵法等'
} as const;

/**
 * 生成功法的主要提示词
 */
export function generateTechniqueCreationPrompt(config: {
  characterName: string;
  characterRealm: string;
  characterSpirit: string[];
  desiredQuality?: keyof typeof TECHNIQUE_QUALITIES;
  desiredType?: keyof typeof TECHNIQUE_TYPES;
  storyContext?: string;
}): string {
  const { 
    characterName, 
    characterRealm, 
    characterSpirit, 
    desiredQuality = '玄',
    desiredType = '心法',
    storyContext = '' 
  } = config;

  const qualityInfo = TECHNIQUE_QUALITIES[desiredQuality];
  const typeInfo = TECHNIQUE_TYPES[desiredType];

  return `
${generateSystemPrompt({ includeRealmSystem: true })}

## **🌟 功法创造大师AI**

你是负责为《${characterName}》创造独特修仙功法的专业AI。请根据角色背景和修仙世界观，创造一部完整的功法。

### **📋 角色信息：**
- **角色姓名：** ${characterName}
- **当前境界：** ${characterRealm}
- **灵根属性：** ${characterSpirit.join('、')}
- **故事背景：** ${storyContext}

### **🎯 功法要求：**
- **期望品质：** ${desiredQuality}阶 (${qualityInfo.description})
- **功法类型：** ${desiredType} - ${typeInfo}
- **等级范围：** ${qualityInfo.grade[0]}-${qualityInfo.grade[1]}级

### **💎 功法创造原则：**

#### **1. 命名创新：**
- 必须原创命名，避免俗套（如"九阳神功"、"易筋经"等）
- 体现功法特色和修炼境界
- 融入五行、阴阳、星辰、自然等修仙元素
- 示例风格：《太虚混元诀》、《星辰引气术》、《九转金丹法》

#### **2. 品质对应效果：**
- **凡阶：** 修炼速度加成1.0-1.2倍，1-2个基础技能
- **黄阶：** 修炼速度加成1.2-1.5倍，2-3个技能，小幅属性加成
- **玄阶：** 修炼速度加成1.5-2.0倍，3-4个技能，明显属性加成
- **地阶：** 修炼速度加成2.0-2.5倍，4-5个技能，显著属性加成，特殊能力
- **天阶：** 修炼速度加成2.5-3.0倍，5-6个技能，大幅属性加成，强力特殊能力
- **仙阶：** 修炼速度加成3.0-4.0倍，6-7个技能，巨大属性加成，仙术级特殊能力
- **神阶：** 修炼速度加成4.0-5.0倍，7-8个技能，传说级属性加成，神级特殊能力

#### **3. 技能设计原则：**
- 技能解锁条件要合理递进（修炼进度20%→40%→60%→80%等）
- 技能类型要丰富：攻击、防御、辅助、移动、其他
- 技能描述要具体，体现修仙世界的玄奥
- 高品质功法的技能要更强大、更神奇

#### **4. 灵根适配：**
根据角色灵根属性设计相应的功法效果：
${characterSpirit.map(spirit => {
  const spiritEffects = {
    '金': '锋锐之力，攻击提升，金系法术加成',
    '木': '生机之力，恢复能力，治疗效果加成',
    '水': '柔韧之力，法力恢复，水系法术加成', 
    '火': '炽热之力，爆发威力，火系法术加成',
    '土': '厚重之力，防御提升，土系法术加成',
    '风': '轻灵之力，速度提升，风系法术加成',
    '雷': '雷霆之力，爆发攻击，雷系法术加成',
    '冰': '冰寒之力，控制效果，冰系法术加成',
    '光': '光明之力，净化效果，光系法术加成',
    '暗': '暗影之力，隐匿效果，暗系法术加成',
    '混沌': '混沌之力，全能加成，适应所有法术'
  };
  return `- **${spirit}灵根：** ${spiritEffects[spirit] || '特殊属性加成'}`;
}).join('\n')}

### **📖 请生成完整的功法JSON结构：**

\`\`\`json
{
  "物品ID": "technique_{{生成唯一ID}}",
  "名称": "{{原创功法名称}}",
  "类型": "功法",
  "品质": {
    "quality": "${desiredQuality}",
    "grade": {{${qualityInfo.grade[0]}-${qualityInfo.grade[1]}范围内的数值}}
  },
  "数量": 1,
  "描述": "{{详细的功法介绍，包含修炼方法、来历、特色等，至少100字}}",
  "功法效果": {
    "修炼速度加成": {{对应品质的加成倍数}},
    "属性加成": {
      {{根据功法类型和灵根属性设计的属性加成}}
    },
    "特殊能力": [{{功法特有的特殊效果，数组格式}}]
  },
  "功法技能": {
    {{根据品质等级生成相应数量的技能，每个技能包含解锁条件、描述、类型}}
  }
}
\`\`\`

### **💫 创造要求：**
1. **必须原创命名**，体现修仙世界的古典韵味
2. **技能要有层次感**，从基础到高深逐步解锁
3. **效果要平衡**，符合品质等级的强度
4. **描述要生动**，让玩家感受到功法的奥妙
5. **适配角色**，考虑灵根、境界、背景等因素

请立即生成一部完整的${desiredQuality}阶${desiredType}！
`;
}

/**
 * 功法升级提示词
 */
export function generateTechniqueUpgradePrompt(config: {
  characterName: string;
  currentTechnique: any;
  targetQuality: keyof typeof TECHNIQUE_QUALITIES;
  upgradeReason: string;
}): string {
  const { characterName, currentTechnique, targetQuality, upgradeReason } = config;
  
  return `
${generateSystemPrompt({ includeRealmSystem: true })}

## **⚡ 功法进阶大师AI**

《${characterName}》的功法《${currentTechnique.名称}》即将进阶！请基于原有功法创造升级版本。

### **📈 升级信息：**
- **原功法：** ${currentTechnique.名称} (${currentTechnique.品质?.quality || '未知'}阶${currentTechnique.品质?.grade || 0}级)
- **目标品质：** ${targetQuality}阶
- **升级原因：** ${upgradeReason}

### **🔄 升级原则：**
1. **保持核心特色**，在原有基础上增强
2. **提升效果数值**，符合新品质等级
3. **添加新技能**，体现功法进步
4. **优化描述**，体现升级后的变化
5. **合理命名**，可以是原名的进阶版本

请生成升级后的完整功法JSON结构！
`;
}

/**
 * 功法技能单独生成提示词
 */
export function generateTechniqueSkillPrompt(config: {
  techniqueName: string;
  skillType: '攻击' | '防御' | '辅助' | '移动' | '其他';
  unlockCondition: string;
  powerLevel: number; // 1-10
}): string {
  const { techniqueName, skillType, unlockCondition, powerLevel } = config;
  
  return `
## **⚔️ 功法技能创造AI**

为功法《${techniqueName}》创造一个新的${skillType}类技能。

### **🎯 技能要求：**
- **技能类型：** ${skillType}
- **解锁条件：** ${unlockCondition}
- **威力等级：** ${powerLevel}/10

### **💡 技能设计原则：**
${skillType === '攻击' ? '- 体现攻击威力和特殊效果\n- 考虑范围、精准度、后坐力等' :
  skillType === '防御' ? '- 体现防护能力和持续时间\n- 考虑防护类型、消耗、限制等' :
  skillType === '辅助' ? '- 体现辅助效果和持续时间\n- 考虑增益类型、影响范围等' :
  skillType === '移动' ? '- 体现移动能力和灵活性\n- 考虑距离、速度、消耗等' :
  '- 体现独特效果和实用性\n- 考虑特殊情况下的作用'}

请生成技能JSON结构：
\`\`\`json
{
  "技能名称": {
    "解锁条件": "${unlockCondition}",
    "技能描述": "{{详细的技能效果描述}}",
    "技能类型": "${skillType}"
  }
}
\`\`\`
`;
}