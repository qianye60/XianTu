/**
 * @fileoverview 修仙世界势力生成模板
 * 包含真实的修仙世界势力类型和生成逻辑
 */

import { getTavernHelper } from '../tavern';
import type { CultivationWorldSettings, BirthplaceGeneration } from './gameWorldConfig';

/**
 * 势力模板接口
 */
export interface FactionTemplate {
  id: string;
  namePatterns: string[];         // 名称模式
  type: string;                   // 势力类型
  description: string;            // 描述模板
  philosophies: string[];         // 理念选择
  specialties: string[];          // 专长领域
  strengthRange: [number, number]; // 实力范围
  territories: string[];          // 可能的领土
  leaderTitles: string[];        // 领导头衔
  leaderRealms: string[];        // 领导境界
  colors: string[];              // 势力颜色
  emblems: string[];             // 势力标志
  requirements?: {               // 生成要求
    minWorldScale?: string;
    requiredAge?: string[];
    conflictLevel?: string[];
  };
}

/**
 * 修仙世界势力模板库
 */
export const CULTIVATION_FACTION_TEMPLATES: { [key: string]: FactionTemplate } = {
  // 正道宗门
  orthodox_major_sect: {
    id: 'orthodox_major_sect',
    namePatterns: ['${prefix}宗', '${prefix}派', '${prefix}门'],
    type: 'orthodox_sect',
    description: '修仙界的正道大宗，以${specialty}闻名天下，门下弟子遍布修仙界',
    philosophies: ['正道修行，济世救人', '以德服人，以理化众', '天道酬勤，厚德载物'],
    specialties: ['剑道', '阵法', '丹药', '器械', '符箓', '遁法'],
    strengthRange: [80, 95],
    territories: ['名山大川', '灵脉汇聚处', '古老仙山', '云海仙岛'],
    leaderTitles: ['掌门', '宗主', '教主'],
    leaderRealms: ['化神期', '炼虚期', '合体期', '渡劫期'],
    colors: ['#2563EB', '#059669', '#7C3AED', '#DC2626'],
    emblems: ['剑', '道', '天', '仙', '灵', '玄'],
    requirements: {
      minWorldScale: 'small'
    }
  },

  orthodox_medium_sect: {
    id: 'orthodox_medium_sect',
    namePatterns: ['${prefix}院', '${prefix}阁', '${prefix}堂'],
    type: 'orthodox_sect',
    description: '正道中等宗门，在${specialty}方面颇有建树，是修仙界的中坚力量',
    philosophies: ['守正不阿，匡扶正义', '修身齐家，治国平天下', '自强不息，厚德载物'],
    specialties: ['炼丹', '制符', '阵法', '医道', '音律', '卜算'],
    strengthRange: [60, 79],
    territories: ['清秀山峦', '灵泉福地', '古镇名城', '书院学府'],
    leaderTitles: ['院主', '阁主', '堂主', '长老'],
    leaderRealms: ['金丹期', '元婴期', '化神期'],
    colors: ['#0891B2', '#16A34A', '#9333EA', '#DC6B19'],
    emblems: ['书', '鼎', '符', '医', '音', '卜']
  },

  // 魔道势力
  demonic_major_cult: {
    id: 'demonic_major_cult',
    namePatterns: ['${prefix}教', '${prefix}魔宗', '${prefix}邪派'],
    type: 'demonic_cult',
    description: '魔道大势力，以${specialty}称霸一方，行事诡异莫测，令正道闻风丧胆',
    philosophies: ['弱肉强食，适者生存', '我命由我不由天', '快意恩仇，无拘无束'],
    specialties: ['血炼之术', '魔功秘法', '蛊毒', '幻术', '夺舍', '炼魂'],
    strengthRange: [75, 92],
    territories: ['魔渊深谷', '血海凶地', '鬼蜮森林', '邪恶禁地'],
    leaderTitles: ['教主', '魔主', '邪帝', '魔尊'],
    leaderRealms: ['化神期', '炼虚期', '合体期'],
    colors: ['#DC2626', '#7F1D1D', '#991B1B', '#450A0A'],
    emblems: ['魔', '血', '骨', '鬼', '邪', '煞'],
    requirements: {
      conflictLevel: ['tense', 'active', 'chaotic']
    }
  },

  // 修仙世家
  immortal_family: {
    id: 'immortal_family',
    namePatterns: ['${prefix}氏', '${prefix}家', '${prefix}族'],
    type: 'immortal_family',
    description: '传承千年的修仙世家，以${specialty}传家，族中高手如云，底蕴深厚',
    philosophies: ['家族至上，血脉传承', '祖训不可违，家法森严', '兴我家族，光耀门庭'],
    specialties: ['家传功法', '秘传丹方', '古老阵法', '血脉神通', '传承法宝', '家族秘术'],
    strengthRange: [70, 88],
    territories: ['祖传庄园', '世代领地', '家族秘境', '古老府邸'],
    leaderTitles: ['家主', '族长', '太上长老'],
    leaderRealms: ['元婴期', '化神期', '炼虚期'],
    colors: ['#059669', '#0F766E', '#0D9488', '#14B8A6'],
    emblems: ['家', '族', '血', '传', '古', '世']
  },

  // 仙朝帝国
  immortal_empire: {
    id: 'immortal_empire',
    namePatterns: ['${prefix}朝', '${prefix}国', '${prefix}帝国'],
    type: 'immortal_empire',
    description: '修仙界的帝国势力，以${specialty}治国，政治军事并重，统治广袤疆土',
    philosophies: ['君临天下，万民归心', '帝王之道，统一八荒', '皇权神授，天命所归'],
    specialties: ['帝王术', '军阵', '国运神通', '封神册', '龙气', '帝威'],
    strengthRange: [85, 98],
    territories: ['帝都王城', '广袤疆域', '边疆重镇', '皇家秘境'],
    leaderTitles: ['皇帝', '帝君', '天子', '圣上'],
    leaderRealms: ['炼虚期', '合体期', '渡劫期', '大乘期'],
    colors: ['#D97706', '#F59E0B', '#EAB308', '#CA8A04'],
    emblems: ['皇', '帝', '龙', '凤', '印', '玺'],
    requirements: {
      minWorldScale: 'medium',
      worldAge: ['classical', 'golden', 'decline']
    }
  },

  // 商会组织
  merchant_guild: {
    id: 'merchant_guild',
    namePatterns: ['${prefix}商会', '${prefix}商行', '${prefix}贸易联盟'],
    type: 'merchant_guild',
    description: '修仙界的商业势力，以${specialty}起家，财力雄厚，关系网遍布天下',
    philosophies: ['和气生财，诚信为本', '天下熙熙，皆为利来', '商道即修道'],
    specialties: ['贸易网络', '珍宝鉴定', '炼器制药', '信息收集', '护卫培养', '金融法术'],
    strengthRange: [60, 80],
    territories: ['繁华商城', '贸易要道', '港口码头', '商会总部'],
    leaderTitles: ['会长', '总裁', '商主', '大掌柜'],
    leaderRealms: ['金丹期', '元婴期', '化神期'],
    colors: ['#DC6B19', '#EA580C', '#F97316', '#FB923C'],
    emblems: ['财', '宝', '金', '银', '商', '贸']
  },

  // 中立学院
  neutral_academy: {
    id: 'neutral_academy',
    namePatterns: ['${prefix}学院', '${prefix}书院', '${prefix}学府'],
    type: 'neutral_academy',
    description: '修仙界的学术机构，以${specialty}立身，中立不党，专注学问和传承',
    philosophies: ['学而时习之，不亦乐乎', '有教无类，因材施教', '知识就是力量'],
    specialties: ['古籍研究', '功法理论', '法则参悟', '历史考据', '预言推演', '学术交流'],
    strengthRange: [55, 75],
    territories: ['学院山城', '藏书楼', '研究秘境', '学者聚居地'],
    leaderTitles: ['院长', '大学者', '首席', '博士'],
    leaderRealms: ['元婴期', '化神期', '炼虚期'],
    colors: ['#7C3AED', '#8B5CF6', '#A855F7', '#C084FC'],
    emblems: ['学', '书', '智', '文', '理', '知']
  },

  // 散修联盟
  rogue_alliance: {
    id: 'rogue_alliance',
    namePatterns: ['${prefix}联盟', '${prefix}同盟', '${prefix}互助会'],
    type: 'rogue_alliance',
    description: '散修组成的松散联盟，以${specialty}为纽带，互帮互助，抵御大势力压迫',
    philosophies: ['自由自在，无拘无束', '散修团结，共抗强权', '天下散修是一家'],
    specialties: ['游击战术', '情报网络', '生存技能', '小团体作战', '隐蔽术', '逃生之道'],
    strengthRange: [50, 70],
    territories: ['边境小镇', '隐秘基地', '流动据点', '中立区域'],
    leaderTitles: ['盟主', '首领', '大哥', '带头人'],
    leaderRealms: ['筑基期', '金丹期', '元婴期'],
    colors: ['#6B7280', '#9CA3AF', '#D1D5DB', '#6366F1'],
    emblems: ['散', '盟', '义', '联', '合', '团']
  },

  // 妖族部落
  demon_tribe: {
    id: 'demon_tribe',
    namePatterns: ['${prefix}族', '${prefix}部', '${prefix}山'],
    type: 'demon_tribe',
    description: '妖族聚居的部落，以${specialty}为生，保持着古老的传统和强大的血脉力量',
    philosophies: ['血脉至上，强者为王', '自然法则，弱肉强食', '守护家园，传承血脉'],
    specialties: ['妖族神通', '血脉觉醒', '变化之术', '兽语沟通', '自然法则', '原始力量'],
    strengthRange: [65, 85],
    territories: ['深山密林', '妖族圣地', '天然洞府', '古老部落'],
    leaderTitles: ['族长', '大王', '妖皇', '部主'],
    leaderRealms: ['金丹期', '元婴期', '化神期', '炼虚期'],
    colors: ['#16A34A', '#15803D', '#166534', '#14532D'],
    emblems: ['妖', '兽', '族', '血', '野', '原'],
    requirements: {
      conflictLevel: ['tense', 'active']
    }
  }
};

/**
 * 地点模板
 */
export interface LocationTemplate {
  id: string;
  namePatterns: string[];
  type: string;
  description: string;
  importance: number;         // 重要性等级 1-10
  factionTypes: string[];     // 适合的势力类型
  features: string[];         // 地点特征
}

/**
 * 地点模板库
 */
export const LOCATION_TEMPLATES: { [key: string]: LocationTemplate } = {
  // 主要城市
  major_city: {
    id: 'major_city',
    namePatterns: ['${prefix}城', '${prefix}都', '${prefix}京'],
    type: 'major_city',
    description: '修仙界的繁华都市，人口众多，商贾云集，是重要的政治经济中心',
    importance: 9,
    factionTypes: ['immortal_empire', 'merchant_guild', 'neutral_academy'],
    features: ['繁华街市', '修士聚集', '贸易中心', '信息枢纽']
  },

  // 宗门山门
  sect_mountain: {
    id: 'sect_mountain',
    namePatterns: ['${prefix}山', '${prefix}峰', '${prefix}岭'],
    type: 'sect_headquarters',
    description: '宗门的山门所在，灵气充沛，建筑宏伟，是修行的圣地',
    importance: 8,
    factionTypes: ['orthodox_sect', 'demonic_cult'],
    features: ['灵气充沛', '山门雄伟', '弟子众多', '传承深厚']
  },

  // 贸易重镇
  trade_hub: {
    id: 'trade_hub',
    namePatterns: ['${prefix}镇', '${prefix}坊', '${prefix}市'],
    type: 'trade_center',
    description: '重要的贸易枢纽，各路商队在此汇聚，奇珍异宝琳琅满目',
    importance: 7,
    factionTypes: ['merchant_guild', 'rogue_alliance'],
    features: ['贸易繁荣', '货物众多', '消息灵通', '鱼龙混杂']
  },

  // 秘境入口
  secret_realm: {
    id: 'secret_realm',
    namePatterns: ['${prefix}秘境', '${prefix}遗迹', '${prefix}洞天'],
    type: 'secret_realm',
    description: '神秘的秘境入口，传说中隐藏着古老的传承和珍贵的宝物',
    importance: 8,
    factionTypes: ['any'],
    features: ['神秘莫测', '危险重重', '宝物众多', '传承古老']
  }
};

/**
 * 真实修仙世界势力生成器
 */
export class CultivationWorldGenerator {
  private worldSettings: CultivationWorldSettings;
  private characterBackground?: string;
  
  constructor(settings: CultivationWorldSettings, characterBackground?: string) {
    this.worldSettings = settings;
    this.characterBackground = characterBackground;
  }

  /**
   * 生成完整的修仙世界
   */
  async generateWorld(): Promise<any> {
    const tavern = getTavernHelper();
    if (!tavern) {
      throw new Error('酒馆系统不可用');
    }

    // 构建世界生成提示词
    const worldPrompt = this.buildWorldGenerationPrompt();

    try {
      // 调用AI生成世界
      const response = await tavern.generateRaw(worldPrompt, {
        temperature: 0.8,
        max_tokens: 6000
      });

      console.log('[修仙世界生成器] AI响应:', response);

      // 解析并保存世界数据
      await this.parseAndSaveWorldData(response);

      return {
        success: true,
        message: '修仙世界生成完成',
        settings: this.worldSettings
      };

    } catch (error) {
      console.error('[修仙世界生成器] 生成失败:', error);
      throw error;
    }
  }

  /**
   * 构建世界生成提示词
   */
  private buildWorldGenerationPrompt(): string {
    const factionCount = this.worldSettings.majorFactionsCount;
    const backgroundInfo = this.characterBackground ? 
      `\n角色出身: ${this.characterBackground}` : '';

    return `
# **🌍 修仙世界生成任务**

请为修仙世界生成 ${factionCount} 个主要势力，创造一个真实完整的修仙世界。

## **🎯 世界设定**
- **世界规模:** ${this.getScaleDescription()}
- **势力分布:** ${this.getPowerDescription()}
- **世界年代:** ${this.getAgeDescription()}
- **冲突等级:** ${this.getConflictDescription()}${backgroundInfo}

## **📋 势力生成要求**

### **势力类型分配:**
${this.getFactionTypeRequirements()}

### **势力强度分布:**
- 超级势力 (90-100): ${Math.ceil(factionCount * 0.1)}个
- 一流势力 (75-89): ${Math.ceil(factionCount * 0.2)}个
- 二流势力 (60-74): ${Math.ceil(factionCount * 0.4)}个
- 三流势力 (45-59): 其余

## **🏛️ 势力模板参考**

${this.buildFactionTemplateGuide()}

## **🗺️ 世界地理要求**

请同时生成以下地理信息：
- 主要城市: ${this.worldSettings.majorCitiesCount}个
- 贸易重镇: ${this.worldSettings.tradingHubsCount}个
- 秘境: ${this.worldSettings.secretRealmsCount}个
- 中立区域: ${this.worldSettings.neutralZonesCount}个

${this.getCharacterBirthplaceRequirement()}

## **📤 输出格式**

请返回以下JSON格式，**必须**通过tavern_commands保存所有数据:

\`\`\`json
{
  "text": "修仙世界生成完成的详细描述",
  "around": "整个修仙世界的总体格局和氛围",
  "mid_term_memory": "世界生成记录：\\n- 世界规模: ${this.getScaleDescription()}\\n- 主要势力: [列出势力名称]\\n- 世界特色: [描述世界特点]",
  "tavern_commands": [
    {
      "action": "set",
      "scope": "chat",
      "key": "world_factions",
      "value": [
        {
          "id": "势力唯一ID",
          "name": "势力名称",
          "type": "势力类型",
          "strength": 实力数值,
          "territory": "势力范围描述",
          "description": "势力详细描述",
          "philosophy": "核心理念",
          "specialties": ["专长1", "专长2"],
          "color": "#颜色代码",
          "borderColor": "#边框颜色",
          "textColor": "#FFFFFF",
          "emblem": "势力标志",
          "leaders": [
            {
              "name": "领袖姓名",
              "title": "职位头衔",
              "realm": "修炼境界",
              "age": 年龄,
              "personality": ["性格特点"],
              "abilities": ["特殊能力"]
            }
          ],
          "resources": {
            "disciples": 弟子数量,
            "territory_size": 领土大小,
            "wealth": 财富等级,
            "artifacts": ["重要法宝"],
            "techniques": ["功法秘籍"],
            "influence": 影响力数值
          },
          "relationships": {},
          "founded": "建立时间",
          "currentGoals": ["当前目标"],
          "secrets": ["势力秘密"]
        }
      ]
    },
    {
      "action": "set",
      "scope": "chat",
      "key": "world_locations",
      "value": [
        {
          "id": "地点ID",
          "name": "地点名称",
          "type": "地点类型",
          "coordinates": {"x": x坐标, "y": y坐标},
          "description": "地点描述",
          "importance": 重要性等级,
          "controlledBy": "控制势力ID",
          "features": ["地点特征"]
        }
      ]
    },
    {
      "action": "set",
      "scope": "chat",
      "key": "player_birthplace",
      "value": {
        "name": "出生地名称",
        "type": "出生地类型",
        "coordinates": {"x": x坐标, "y": y坐标},
        "description": "出生地详细描述",
        "factionAffiliation": "所属势力",
        "initialConnections": ["初始关系"],
        "specialFeatures": ["特殊特征"]
      }
    },
    {
      "action": "set",
      "scope": "chat",
      "key": "world_generation_info",
      "value": {
        "seed": "${this.worldSettings.randomSeed}",
        "scale": "${this.worldSettings.worldScale}",
        "powerStructure": "${this.worldSettings.powerStructure}",
        "worldAge": "${this.worldSettings.worldAge}",
        "conflictLevel": "${this.worldSettings.conflictLevel}",
        "generationTime": "当前时间",
        "characterBackground": "${this.characterBackground || '无'}",
        "majorConflicts": ["主要冲突1", "主要冲突2"],
        "worldThemes": ["世界主题1", "世界主题2"]
      }
    }
  ]
}
\`\`\`

请确保生成的修仙世界具有：
1. **真实感** - 符合修仙小说的世界观
2. **多样性** - 势力类型丰富，各有特色
3. **平衡性** - 势力强弱分布合理
4. **关联性** - 势力间有复杂的关系网络
5. **成长性** - 为角色发展留下充分空间

现在开始生成这个真实的修仙世界！
`;
  }

  // 辅助方法
  private getScaleDescription(): string {
    const descriptions = {
      small: '小世界 - 紧凑精致',
      medium: '中世界 - 平衡发展', 
      large: '大世界 - 广阔复杂',
      epic: '史诗世界 - 恢弘壮阔'
    };
    return descriptions[this.worldSettings.worldScale] || '中等世界';
  }

  private getPowerDescription(): string {
    const descriptions = {
      balanced: '势力均衡 - 各派实力相近',
      hierarchical: '等级分明 - 强弱层次清楚',
      chaotic: '群雄割据 - 实力分布混乱',
      hegemony: '一家独大 - 存在绝对强者'
    };
    return descriptions[this.worldSettings.powerStructure] || '势力均衡';
  }

  private getAgeDescription(): string {
    const descriptions = {
      ancient: '上古时期 - 神话传说时代',
      classical: '古典时期 - 成熟稳定时代',
      golden: '黄金时期 - 繁荣鼎盛时代',
      turbulent: '乱世时期 - 变化动荡时代',
      decline: '末法时期 - 衰落萧条时代'
    };
    return descriptions[this.worldSettings.worldAge] || '古典时期';
  }

  private getConflictDescription(): string {
    const descriptions = {
      peaceful: '相对和平 - 各派相安无事',
      tense: '暗流涌动 - 小冲突不断', 
      active: '争斗不断 - 公开冲突频繁',
      chaotic: '天下大乱 - 全面战争状态'
    };
    return descriptions[this.worldSettings.conflictLevel] || '暗流涌动';
  }

  private getFactionTypeRequirements(): string {
    const requirements = [];
    
    if (this.worldSettings.hasAncientSects) {
      requirements.push('- 上古宗门: 1-2个（传承古老的神秘势力）');
    }
    
    if (this.worldSettings.hasDemonicFactions) {
      requirements.push('- 魔道势力: 2-3个（邪恶强大的魔教）');
    }
    
    if (this.worldSettings.hasImmortalEmpires) {
      requirements.push('- 仙朝帝国: 1个（统治广阔疆域的帝国）');
    }
    
    if (this.worldSettings.hasNeutralAcademies) {
      requirements.push('- 中立学院: 1个（专注学术的中立机构）');
    }
    
    requirements.push('- 正道宗门: 至少40%');
    requirements.push('- 修仙世家: 15-20%');
    requirements.push('- 商会组织: 10-15%');
    requirements.push('- 其他势力: 补充至总数');
    
    return requirements.join('\n');
  }

  private buildFactionTemplateGuide(): string {
    const guides = [];
    
    // 选择合适的模板
    const templates = Object.values(CULTIVATION_FACTION_TEMPLATES).filter(template => {
      if (template.requirements?.minWorldScale) {
        const scaleOrder = { small: 1, medium: 2, large: 3, epic: 4 };
        if (scaleOrder[this.worldSettings.worldScale] < scaleOrder[template.requirements.minWorldScale]) {
          return false;
        }
      }
      
      if (template.requirements?.conflictLevel) {
        if (!template.requirements.conflictLevel.includes(this.worldSettings.conflictLevel)) {
          return false;
        }
      }
      
      return true;
    });

    templates.slice(0, 4).forEach(template => {
      guides.push(`
**${template.type.toUpperCase()}:**
- 命名: ${template.namePatterns.join('、')}
- 理念: ${template.philosophies[0]}
- 专长: ${template.specialties.slice(0, 3).join('、')}
- 实力: ${template.strengthRange[0]}-${template.strengthRange[1]}
- 领袖: ${template.leaderTitles.join('、')}
`);
    });

    return guides.join('\n');
  }

  private getCharacterBirthplaceRequirement(): string {
    if (!this.characterBackground) return '';

    return `
## **🏠 角色出生地要求**

根据角色出身"${this.characterBackground}"，请生成符合以下要求的出生地：
- 必须符合出身背景的合理性
- 要与相关势力有适当的关联
- 提供合适的初始人脉关系
- 为后续发展提供足够的可能性
`;
  }

  /**
   * 解析并保存世界数据
   */
  private async parseAndSaveWorldData(response: string): Promise<void> {
    // AI的响应会自动通过tavern_commands保存数据
    // 这里只需要等待数据保存完成
    console.log('[修仙世界生成器] 世界数据已保存到酒馆变量系统');
  }
}