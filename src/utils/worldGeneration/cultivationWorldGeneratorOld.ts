/**
 * @fileoverview 修仙世界势力生成模板
 * 包含真实的修仙世界势力类型和生成逻辑
 */

import { getTavernHelper } from '../tavern';
import type { CultivationWorldSettings, BirthplaceGeneration } from './gameWorldConfig';
import { EnhancedWorldPromptBuilder, type WorldPromptConfig } from './enhancedWorldPrompts';

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
      requiredAge: ['classical', 'golden', 'decline']
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
  private userConfig?: any; // 用户自定义配置
  
  constructor(settings: CultivationWorldSettings, characterBackground?: string, userConfig?: any) {
    this.worldSettings = settings;
    this.characterBackground = characterBackground;
    this.userConfig = userConfig;
    
    console.log('[修仙世界生成器] 初始化配置:', {
      characterBackground,
      userConfig
    });
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
    
    // 添加完整提示词的日志输出
    console.log('[修仙世界生成器] 完整提示词长度:', worldPrompt.length);
    console.log('[修仙世界生成器] 完整提示词内容:');
    console.log('='.repeat(50));
    console.log(worldPrompt);
    console.log('='.repeat(50));

    try {
      // 调用AI生成世界
      const response = await tavern.generateRaw({
        user_input: worldPrompt,
        custom_api: {
          temperature: 0.8
        }
      });

      console.log('[修仙世界生成器] AI响应:', response);

      // 解析并保存世界数据
      await this.parseAndSaveWorldData(String(response));

      return {
        success: true,
        message: '修仙世界生成完成',
        settings: this.worldSettings
      };

    } catch (error: any) {
      console.error('[修仙世界生成器] 生成失败:', error);
      
      // 提供更详细的错误信息
      if (error?.message === 'Bad Request') {
        throw new Error('API请求格式错误，可能是提示词过长或包含无效字符');
      } else if (error?.message && error.message.includes('token')) {
        throw new Error('API token 无效或已过期');
      } else if (error?.message && error.message.includes('timeout')) {
        throw new Error('API请求超时，请稍后重试');
      } else {
        throw new Error(`世界生成失败: ${error?.message || '未知错误'}`);
      }
    }
  }

  private buildWorldGenerationPrompt(): string {
    // 构建配置对象
    const promptConfig: WorldPromptConfig = {
      factionCount: this.userConfig?.majorFactionsCount || 7,
      totalLocations: this.userConfig?.totalLocations || 25,
      secretRealms: this.userConfig?.secretRealmsCount || 8,
      characterBackground: this.characterBackground,
      worldBackground: this.userConfig?.worldBackground,
      worldEra: this.userConfig?.worldEra,
      worldName: this.userConfig?.worldName
    };
    
    // 使用增强提示词构建器
    return EnhancedWorldPromptBuilder.buildPrompt(promptConfig);
  }
    
    // 动态计算地点分布
    const headquarters = finalFactionCount; // 每个势力一个总部
    const remainingLocations = finalLocationCount - headquarters;
    const cities = Math.floor(remainingLocations * (0.2 + Math.random() * 0.3)); // 20%-50%
    const specialSites = Math.floor(remainingLocations * (0.15 + Math.random() * 0.25)); // 15%-40%
    const dangerZones = Math.floor(remainingLocations * (0.1 + Math.random() * 0.2)); // 10%-30%
    const otherSites = Math.max(0, remainingLocations - cities - specialSites - dangerZones);
    
    // 动态计算秘境分布
    const opportunityRealms = Math.floor(finalSecretRealmCount * (0.3 + Math.random() * 0.3)); // 30%-60%
    const heritageRealms = Math.floor(finalSecretRealmCount * (0.2 + Math.random() * 0.3)); // 20%-50%
    const dangerousRealms = Math.max(0, finalSecretRealmCount - opportunityRealms - heritageRealms);
    
    const backgroundInfo = this.characterBackground ? 
      `\n角色出身: ${this.characterBackground}` : '';
    
    // 世界背景信息
    const worldBackgroundInfo = this.userConfig?.worldBackground ? 
      `\n世界背景: ${this.userConfig.worldBackground}` : '';
    const worldEraInfo = this.userConfig?.worldEra ? 
      `\n世界时代: ${this.userConfig.worldEra}` : '';
    const worldNameInfo = this.userConfig?.worldName ? 
      `\n世界名称: ${this.userConfig.worldName}` : '';

    // 生成唯一的随机种子确保每次都不同
    const uniqueSeed = Date.now() + Math.floor(Math.random() * 1000000);
    const sessionId = Math.random().toString(36).substring(7);

    // 调试日志
    console.log('[世界生成器] 用户配置:', this.userConfig);
    console.log('[世界生成器] 最终数量 - 势力:', finalFactionCount, '地点:', finalLocationCount, '秘境:', finalSecretRealmCount);
    console.log('[世界生成器] 生成种子:', uniqueSeed, '会话ID:', sessionId);

    return `
# 诸天万界势力地图生成任务

**生成会话ID**: ${sessionId}
**随机种子**: ${uniqueSeed}
**关键要求**: 根据世界背景动态适应，避免固化思维，每次生成都要有显著不同

## 世界设定信息
${backgroundInfo}${worldBackgroundInfo}${worldEraInfo}${worldNameInfo}

## 核心生成要求

### 🌟 重要原则
1. **世界适应性**: 必须严格按照世界背景来确定势力类型和名称，不要套用固定模板
2. **随机多样性**: 同样参数下每次生成的结果都应该有显著差异
3. **势力分布合理性**: 不同等级势力要有合理的地理分布和相互关系

### 📊 本次生成参数 (带随机变化)
- **势力总数**: ${finalFactionCount}个 (原始配置: ${factionCount})
- **地点总数**: ${finalLocationCount}个 (原始配置: ${totalLocations})  
- **秘境总数**: ${finalSecretRealmCount}个 (原始配置: ${secretRealms})

### 1. 主要势力生成 (${finalFactionCount}个)

**势力实力分级** (本次随机分布):
- 🏆 **顶级势力** (90-100分): ${superFactions}个
- ⭐ **一流势力** (75-89分): ${topFactions}个
- 📈 **二流势力** (60-74分): ${normalFactions}个

**势力类型适应指南**:
根据世界背景，势力类型应该符合该世界的设定：

- **传统修仙世界**: 宗门、世家、魔道、仙朝、商会等
- **现代都市修仙**: 大型集团、政府机构、秘密组织、财团、军方等
- **科幻修仙**: 星际联邦、机械军团、生物公司、能源巨头、太空殖民地等
- **魔法世界**: 魔法学院、骑士团、法师塔、商业联盟、王国等
- **武侠江湖**: 门派、帮会、朝廷、镖局、商帮等
- **神话背景**: 神庭、魔界、妖族、仙界、人间王朝等
- **蒸汽朋克**: 工业巨头、发明家联盟、贵族议会、机械公会等

**势力信息要求**:
- 势力名称: 必须完全符合世界背景，避免使用模板变量
- 势力类型: 根据世界设定灵活确定，不要固化
- 专长领域: 要符合该世界的技术/魔法/修炼体系
- 地理分布: 考虑势力间的制衡和冲突关系
- 内部结构: 领导者称谓要符合势力类型

### 2. 重要地点生成 (${finalLocationCount}个)

**地点分布** (本次随机分布):
- 🏛️ **势力总部**: ${headquarters}个 (对应各势力)
- 🏙️ **主要城镇**: ${cities}个
- ⚡ **特殊功能地点**: ${specialSites}个
- ⚠️ **危险区域**: ${dangerZones}个
- 🗺️ **其他特色地点**: ${otherSites}个

**地点类型要求**:
必须使用以下7个标准地点类型之一，确保AI能统一生成：

1. **🏔️ 名山大川** - 自然地理标志
   - 类型标识: "natural_landmark"
   - 包含: 名山、大河、湖泊、峡谷、奇峰、灵泉等
   - 示例: 昆仑山、黄河、太湖、天山、九华山、青城山

2. **🏯 宗门势力** - 各大势力总部  
   - 类型标识: "sect_power"
   - 包含: 宗门山门、家族府邸、帝国都城、商会总部等
   - 示例: 青云宗、李家大院、天机阁、万宝商会

3. **🏘️ 城镇坊市** - 人员聚集地
   - 类型标识: "city_town" 
   - 包含: 主城、县城、集镇、坊市、村落等
   - 示例: 长安城、临安府、青州镇、万宝坊

4. **⛩️ 洞天福地** - 修炼和传承圣地
   - 类型标识: "blessed_land"
   - 包含: 洞府、秘境、传承地、修炼圣地、仙人遗迹等
   - 示例: 蜀山剑池、太清洞天、玄天秘境、仙人洞府

5. **💎 奇珍异地** - 资源产出之地
   - 类型标识: "treasure_land" 
   - 包含: 灵石矿脉、灵药园、天材地宝产地等
   - 示例: 紫晶矿脉、百草谷、天蚕丝产地、龙血树林

6. **⚔️ 凶险之地** - 危险区域
   - 类型标识: "dangerous_area"
   - 包含: 魔域、古战场、妖兽巢穴、死地禁区等  
   - 示例: 血海魔域、上古战场、万妖林、死亡沙漠

7. **🌟 其他特殊** - 独特的特殊地点
   - 类型标识: "special_other"
   - 包含: 传送阵、时空裂缝、异界入口、神器遗留地、天象异常区等
   - 示例: 跨界传送阵、时空乱流、星辰祭坛、上古封印地

**重要**: 每个地点的type字段必须严格使用上述7个类型标识之一！

### 3. 特殊属性标记 (${finalSecretRealmCount}个地点获得特殊属性)

在上述${finalLocationCount}个基础地点中，将有${finalSecretRealmCount}个地点获得额外的特殊属性标记，使其成为更加独特和重要的区域：

**特殊属性分布** (本次随机分布):
- 🎯 **机遇之地**: ${opportunityRealms}个 (在任意基础类型上添加"获得力量/资源"属性)
- 📜 **传承遗迹**: ${heritageRealms}个 (在任意基础类型上添加"知识/技能传承"属性)
- ☠️ **危险禁地**: ${dangerousRealms}个 (在任意基础类型上添加"高风险高回报"属性)

**说明**: 特殊属性是对基础地点类型的增强，例如：
- 一个"城镇坊市"(city_town)可能同时是"机遇之地"
- 一个"名山大川"(natural_landmark)可能同时是"传承遗迹"
- 一个"洞天福地"(blessed_land)可能同时是"危险禁地"

这样可以创造出更丰富的地点组合，避免单一分类的限制。

### 4. 增加变化性的要求

**确保每次生成不同**:
1. **名称创新**: 即使是同类型势力，名称也要有创意变化
2. **地理分布**: 势力和地点的分布要有不同的模式
3. **势力关系**: 每次生成的势力间关系和冲突要有变化
4. **专长差异**: 同类型势力的专长要有不同的侧重点
5. **文化特色**: 加入不同的文化元素和背景故事

### 5. JSON输出格式

\`\`\`json
{
  "generation_info": {
    "session_id": "${sessionId}",
    "seed": ${uniqueSeed},
    "world_type": "[根据背景判断的世界类型]",
    "generation_notes": "[本次生成的特色说明]"
  },
  "factions": [
    {
      "id": "faction_1",
      "name": "[完全符合世界背景的具体名称]",
      "type": "[符合世界背景的势力类型]", 
      "description": "[势力描述，要有世界特色]",
      "territory": "[控制区域]",
      "strength": [60-100的数值],
      "leader": "[符合势力类型的领导者称谓]",
      "specialties": ["[专长1]", "[专长2]"],
      "culture_notes": "[该势力的文化特色]",
      "headquarters": {
        "name": "[总部名称]",
        "coordinates": {"longitude": [115.0-120.0], "latitude": [35.0-42.0]}
      }
    }
  ],
  "locations": [
    {
      "id": "loc_1",
      "name": "[符合世界背景的地点名称]",
      "type": "[必须使用7个标准类型之一]",
      "coordinates": {"longitude": [115.0-120.0], "latitude": [35.0-42.0]},
      "description": "[地点描述，要有世界特色]", 
      "danger_level": "[安全/普通/危险/极危险]",
      "suitable_for": ["[适合群体1]", "[适合群体2]"],
      "controlled_by": "[控制势力，可选]",
      "special_features": ["[特色1]", "[特色2]"],
      "special_attributes": ["[机遇之地/传承遗迹/危险禁地，可选]"]
    }
  ]
}
\`\`\`

### 6. 最终检查清单
- ✅ 所有名称都完全符合世界背景
- ✅ 势力类型符合世界设定，不是固化模板
- ✅ 地点分布合理，有地理逻辑
- ✅ 每个生成要素都有本次特有的特色
- ✅ JSON格式完整可解析
- ✅ 坐标在指定范围内(经度115.0-120.0，纬度35.0-42.0)

**核心提醒: 本次生成必须与之前的任何生成结果有显著差异，展现诸天万界的无穷可能性！**
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
