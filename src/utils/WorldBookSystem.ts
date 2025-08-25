/**
 * 世界书系统
 * 管理多个世界书，支持世界背景设定、规则管理和用户自定义
 * 
 * 功能包括：
 * - 多世界书管理
 * - 世界背景设定存储
 * - 用户自定义世界书
 * - 世界书版本控制
 * - 内容审核和管理
 * - 世界书模板系统
 */

import { toast } from './toast';

// 世界书类别枚举
export enum WorldBookCategory {
  XIANXIA = '仙侠',
  FANTASY = '奇幻',
  SCIFI = '科幻',
  MODERN = '现代',
  HISTORICAL = '历史',
  HYBRID = '混合',
  CUSTOM = '自定义'
}

// 世界书权限枚举
export enum WorldBookPermission {
  PUBLIC = '公开',
  PRIVATE = '私有',
  SHARED = '共享',
  PREMIUM = '付费'
}

// 境界系统定义
export interface RealmSystem {
  name: string;
  description: string;
  levels: RealmLevel[];
  breakthroughRules: string[];
  attributes: {
    lifespan: string;
    abilities: string[];
    resources: string[];
  };
}

export interface RealmLevel {
  name: string;
  level: number;
  description: string;
  requirements: {
    experience: number;
    items?: string[];
    conditions?: string[];
  };
  benefits: {
    lifespanIncrease: number;
    attributeMultipliers: Record<string, number>;
    newAbilities: string[];
  };
  colorCode: string; // 显示颜色
}

// 势力系统定义
export interface FactionSystem {
  name: string;
  description: string;
  factions: WorldFaction[];
  relationshipRules: string[];
  conflictSystems: string[];
}

export interface WorldFaction {
  id: string;
  name: string;
  type: string;
  description: string;
  territory: string[];
  strength: number;
  influence: number;
  relationships: Record<string, string>;
  specialties: string[];
  history: string;
}

// 地理系统定义
export interface GeographySystem {
  name: string;
  description: string;
  regions: WorldRegion[];
  climateRules: string[];
  resourceDistribution: Record<string, string[]>;
}

export interface WorldRegion {
  id: string;
  name: string;
  type: string;
  description: string;
  climate: string;
  terrain: string;
  dangerLevel: number;
  spiritualEnergy: number;
  resources: string[];
  inhabitants: string[];
  landmarks: string[];
}

// 修炼系统定义
export interface CultivationSystem {
  name: string;
  description: string;
  techniques: CultivationTechnique[];
  resources: CultivationResource[];
  rules: string[];
}

export interface CultivationTechnique {
  id: string;
  name: string;
  type: string;
  rarity: string;
  description: string;
  requirements: string[];
  effects: string[];
  levels: {
    name: string;
    requirements: string[];
    benefits: string[];
  }[];
}

export interface CultivationResource {
  id: string;
  name: string;
  type: string;
  rarity: string;
  description: string;
  locations: string[];
  uses: string[];
  value: number;
}

// 世界书内容接口
export interface WorldBookContent {
  id: string;
  name: string;
  version: string;
  category: WorldBookCategory;
  permission: WorldBookPermission;
  
  // 基础信息
  title: string;
  subtitle?: string;
  description: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  
  // 世界设定
  worldSetting: {
    overview: string; // 世界概述
    history: string; // 历史背景
    cosmology: string; // 宇宙观
    timeline: string; // 时间线
    languages: string[]; // 语言系统
    cultures: string[]; // 文化体系
  };
  
  // 核心系统
  realmSystem: RealmSystem;
  factionSystem: FactionSystem;
  geographySystem: GeographySystem;
  cultivationSystem: CultivationSystem;
  
  // 规则设定
  gameRules: {
    combatSystem: string;
    itemSystem: string;
    economicSystem: string;
    socialSystem: string;
    magicSystem?: string;
    technologyLevel?: string;
  };
  
  // 特色内容
  uniqueFeatures: {
    specialMechanics: string[]; // 特殊机制
    customItems: any[]; // 自定义物品
    customSkills: any[]; // 自定义技能
    customEvents: any[]; // 自定义事件
  };
  
  // 元数据
  metadata: {
    tags: string[];
    difficulty: 'easy' | 'normal' | 'hard' | 'nightmare';
    playerCount: 'single' | 'multi';
    estimatedPlaytime: number; // 预估游戏时长（小时）
    contentRating: string;
    compatibility: string[]; // 兼容版本
  };
  
  // 统计信息
  stats: {
    downloads: number;
    ratings: number;
    averageRating: number;
    reviews: WorldBookReview[];
  };
}

// 世界书评价
export interface WorldBookReview {
  id: string;
  userId: string;
  userName: string;
  rating: number; // 1-5星
  comment: string;
  createdAt: string;
  helpful: number; // 有用数
}

// 世界书模板
export interface WorldBookTemplate {
  id: string;
  name: string;
  description: string;
  category: WorldBookCategory;
  structure: {
    sections: TemplateSection[];
    requiredFields: string[];
    optionalFields: string[];
  };
  examples: Record<string, any>;
}

export interface TemplateSection {
  id: string;
  name: string;
  description: string;
  required: boolean;
  fields: TemplateField[];
  subsections?: TemplateSection[];
}

export interface TemplateField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'json';
  description: string;
  required: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    options?: string[];
    pattern?: string;
  };
  defaultValue?: any;
}

class WorldBookSystemClass {
  private worldBooks: Map<string, WorldBookContent> = new Map();
  private templates: Map<string, WorldBookTemplate> = new Map();
  private activeWorldBookId: string | null = null;

  constructor() {
    this.initializeWorldBookSystem();
  }

  /**
   * 初始化世界书系统
   */
  private async initializeWorldBookSystem() {
    try {
      await this.loadWorldBooks();
      this.initializeDefaultWorldBooks();
      this.initializeTemplates();
      console.log('[世界书系统] 初始化完成');
    } catch (error) {
      console.error('[世界书系统] 初始化失败:', error);
    }
  }

  /**
   * 初始化默认世界书
   */
  private initializeDefaultWorldBooks() {
    // 创建默认的"大道朝天"世界书
    const defaultWorldBook: WorldBookContent = {
      id: 'dadao_chaotian_default',
      name: '大道朝天·默认',
      version: '1.0.0',
      category: WorldBookCategory.XIANXIA,
      permission: WorldBookPermission.PUBLIC,
      title: '大道朝天',
      subtitle: '修仙世界设定集',
      description: '经典的修仙世界设定，包含完整的境界体系、势力分布和修炼规则。',
      author: '系统默认',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      worldSetting: {
        overview: '这是一个修仙者追求长生不老、逆天改命的世界。天地灵气充沛，修炼者通过吸收灵气提升境界，追求大道至理。',
        history: '远古时期，天地初开，灵气浓郁。诸多强者开宗立派，传承至今。历经数万年发展，形成了如今的修仙界格局。',
        cosmology: '世界分为凡人界、修仙界、仙界三层。修炼者通过提升境界，最终可飞升仙界。',
        timeline: '当前为修仙历3000年，正值各大宗门争雄的时代。',
        languages: ['通用语', '古仙语', '阵法语'],
        cultures: ['正道文化', '魔道文化', '散修文化', '世俗文化'],
      },

      realmSystem: {
        name: '九阶境界体系',
        description: '从凡人到仙人的九个主要境界，每个境界又分为初期、中期、后期、圆满四个阶段。',
        levels: [
          {
            name: '凡人',
            level: 0,
            description: '未踏入修仙之路的普通人',
            requirements: { experience: 0 },
            benefits: {
              lifespanIncrease: 0,
              attributeMultipliers: { hp: 1, mana: 1, spirit: 1 },
              newAbilities: [],
            },
            colorCode: '#8B7355'
          },
          {
            name: '练气',
            level: 1,
            description: '初入修仙门径，开始炼化天地灵气',
            requirements: {
              experience: 1000,
              conditions: ['拥有灵根', '掌握基础功法'],
            },
            benefits: {
              lifespanIncrease: 50,
              attributeMultipliers: { hp: 1.2, mana: 2.0, spirit: 1.5 },
              newAbilities: ['灵气感应', '基础法术'],
            },
            colorCode: '#4A90E2'
          },
          {
            name: '筑基',
            level: 2,
            description: '筑建道基，为更高境界打下根基',
            requirements: {
              experience: 5000,
              items: ['筑基丹'],
              conditions: ['练气圆满', '渡筑基雷劫'],
            },
            benefits: {
              lifespanIncrease: 100,
              attributeMultipliers: { hp: 1.8, mana: 3.0, spirit: 2.0 },
              newAbilities: ['神识外放', '御器飞行', '中级法术'],
            },
            colorCode: '#7B68EE'
          },
          {
            name: '金丹',
            level: 3,
            description: '凝聚金丹，法力大增',
            requirements: {
              experience: 20000,
              conditions: ['筑基圆满', '感悟丹道', '渡金丹雷劫'],
            },
            benefits: {
              lifespanIncrease: 300,
              attributeMultipliers: { hp: 3.0, mana: 5.0, spirit: 3.0 },
              newAbilities: ['金丹神通', '高级法术', '炼丹能力'],
            },
            colorCode: '#FFD700'
          },
          {
            name: '元婴',
            level: 4,
            description: '元婴出窍，神通广大',
            requirements: {
              experience: 50000,
              conditions: ['金丹圆满', '元婴感悟', '渡元婴雷劫'],
            },
            benefits: {
              lifespanIncrease: 500,
              attributeMultipliers: { hp: 5.0, mana: 8.0, spirit: 5.0 },
              newAbilities: ['元婴出窍', '空间法术', '创造小世界'],
            },
            colorCode: '#FF6347'
          },
          {
            name: '化神',
            level: 5,
            description: '神魂合一，接近仙道',
            requirements: {
              experience: 100000,
              conditions: ['元婴圆满', '化神感悟', '心魔考验'],
            },
            benefits: {
              lifespanIncrease: 1000,
              attributeMultipliers: { hp: 8.0, mana: 12.0, spirit: 8.0 },
              newAbilities: ['神魂不灭', '时间法术', '法则感悟'],
            },
            colorCode: '#DA70D6'
          },
        ],
        breakthroughRules: [
          '每次境界突破都需要渡过相应的雷劫',
          '境界越高，雷劫威力越大',
          '失败的雷劫会导致修为倒退或身死道消',
          '某些特殊体质可以减轻雷劫威力',
        ],
        attributes: {
          lifespan: '境界越高，寿命越长，最高可达数万年',
          abilities: ['法术威力', '神识范围', '飞行速度', '法宝威力'],
          resources: ['灵气容量', '法力恢复', '神识强度', '肉身强度'],
        },
      },

      factionSystem: {
        name: '修仙界势力格局',
        description: '以宗门为主导，家族、商会、散修组织为辅的多元化势力结构。',
        factions: [
          {
            id: 'tianxuan_sect',
            name: '天玄宗',
            type: '正道宗门',
            description: '正道三大宗门之首，以剑道闻名天下',
            territory: ['天玄山脉', '云雾峰', '剑心谷'],
            strength: 95,
            influence: 90,
            relationships: {
              'blood_demon_sect': 'hostile',
              'qin_empire': 'ally',
            },
            specialties: ['剑道', '阵法', '炼丹'],
            history: '建立于修仙历156年，由天玄道人创立，传承至今已有近三千年历史。',
          },
        ],
        relationshipRules: [
          '正道与魔道势不两立',
          '同一阵营内部也可能存在竞争',
          '中立势力可以与各方保持贸易关系',
        ],
        conflictSystems: [
          '宗门战争',
          '资源争夺',
          '传承竞争',
          '领域扩张',
        ],
      },

      geographySystem: {
        name: '修仙界地理',
        description: '广阔的修仙世界，包含多个大陆和无数秘境',
        regions: [
          {
            id: 'central_continent',
            name: '中州大陆',
            type: '主大陆',
            description: '修仙界的核心区域，灵气最为浓郁',
            climate: '温带',
            terrain: '平原丘陵',
            dangerLevel: 5,
            spiritualEnergy: 8,
            resources: ['上品灵石', '千年灵药', '天材地宝'],
            inhabitants: ['各大宗门', '修仙世家', '散修'],
            landmarks: ['天玄山', '血海深渊', '万宝城'],
          },
        ],
        climateRules: [
          '灵气浓度影响当地气候',
          '某些特殊区域拥有独特的气候现象',
        ],
        resourceDistribution: {
          '灵石矿脉': ['深山', '地下', '灵脉汇聚处'],
          '灵药': ['秘境', '险地', '古战场'],
          '炼器材料': ['火山', '深海', '雷击之地'],
        },
      },

      cultivationSystem: {
        name: '修炼体系',
        description: '以功法为核心的修炼系统，辅以丹药、法宝等资源',
        techniques: [
          {
            id: 'tianxuan_sword',
            name: '天玄剑诀',
            type: '剑道功法',
            rarity: '天级',
            description: '天玄宗镇宗功法，以剑道见长',
            requirements: ['天玄宗弟子', '剑道天赋'],
            effects: ['剑气纵横', '御剑飞行', '剑意加成'],
            levels: [
              {
                name: '入门篇',
                requirements: ['基础剑法'],
                benefits: ['剑气基础运用'],
              },
            ],
          },
        ],
        resources: [
          {
            id: 'qi_gathering_pill',
            name: '聚气丹',
            type: '基础丹药',
            rarity: '凡级',
            description: '辅助练气期修炼的基础丹药',
            locations: ['药店', '宗门'],
            uses: ['提升修炼速度', '恢复灵气'],
            value: 100,
          },
        ],
        rules: [
          '功法品级越高，修炼效果越好',
          '不同功法之间可能存在冲突',
          '某些功法需要特定的体质或天赋',
        ],
      },

      gameRules: {
        combatSystem: '回合制战斗，法术与法宝结合',
        itemSystem: '神仙天地玄黄凡品质分级',
        economicSystem: '以灵石为主要货币',
        socialSystem: '宗门等级制度',
      },

      uniqueFeatures: {
        specialMechanics: ['雷劫系统', '飞升机制', '秘境探索'],
        customItems: [],
        customSkills: [],
        customEvents: [],
      },

      metadata: {
        tags: ['仙侠', '修炼', '宗门', '飞升'],
        difficulty: 'normal',
        playerCount: 'single',
        estimatedPlaytime: 100,
        contentRating: 'T',
        compatibility: ['1.0.0'],
      },

      stats: {
        downloads: 0,
        ratings: 0,
        averageRating: 0,
        reviews: [],
      },
    };

    if (!this.worldBooks.has(defaultWorldBook.id)) {
      this.worldBooks.set(defaultWorldBook.id, defaultWorldBook);
      this.activeWorldBookId = defaultWorldBook.id;
    }
  }

  /**
   * 初始化模板系统
   */
  private initializeTemplates() {
    const xianxiaTemplate: WorldBookTemplate = {
      id: 'xianxia_template',
      name: '仙侠世界模板',
      description: '标准的仙侠修仙世界设定模板',
      category: WorldBookCategory.XIANXIA,
      structure: {
        sections: [
          {
            id: 'basic_info',
            name: '基础信息',
            description: '世界书的基本设定信息',
            required: true,
            fields: [
              {
                id: 'title',
                name: '世界标题',
                type: 'text',
                description: '世界的名称',
                required: true,
                validation: { minLength: 2, maxLength: 50 },
              },
              {
                id: 'description',
                name: '世界描述',
                type: 'textarea',
                description: '世界的简要描述',
                required: true,
                validation: { minLength: 10, maxLength: 500 },
              },
            ],
          },
          {
            id: 'realm_system',
            name: '境界体系',
            description: '修炼境界的定义和规则',
            required: true,
            fields: [
              {
                id: 'realm_levels',
                name: '境界等级',
                type: 'json',
                description: '各个境界的详细设定',
                required: true,
              },
            ],
          },
        ],
        requiredFields: ['title', 'description', 'realm_levels'],
        optionalFields: ['subtitle', 'custom_mechanics'],
      },
      examples: {
        title: '我的修仙世界',
        description: '这是一个充满奇遇的修仙世界...',
      },
    };

    this.templates.set(xianxiaTemplate.id, xianxiaTemplate);
  }

  /**
   * 创建新的世界书
   */
  public async createWorldBook(
    name: string,
    templateId?: string,
    customData?: Partial<WorldBookContent>
  ): Promise<string | null> {
    try {
      const worldBookId = `wb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      let newWorldBook: WorldBookContent;

      if (templateId) {
        const template = this.templates.get(templateId);
        if (!template) {
          toast.error('模板不存在');
          return null;
        }

        // 基于模板创建
        newWorldBook = this.createFromTemplate(worldBookId, name, template, customData);
      } else {
        // 创建空白世界书
        newWorldBook = this.createBlankWorldBook(worldBookId, name, customData);
      }

      this.worldBooks.set(worldBookId, newWorldBook);
      await this.saveWorldBooks();

      toast.success(`世界书"${name}"创建成功`);
      return worldBookId;

    } catch (error) {
      console.error('[世界书系统] 创建世界书失败:', error);
      toast.error('创建世界书失败');
      return null;
    }
  }

  /**
   * 基于模板创建世界书
   */
  private createFromTemplate(
    id: string,
    name: string,
    template: WorldBookTemplate,
    customData?: Partial<WorldBookContent>
  ): WorldBookContent {
    const now = new Date().toISOString();
    
    // 基础模板结构
    const baseWorldBook: WorldBookContent = {
      id,
      name,
      version: '1.0.0',
      category: template.category,
      permission: WorldBookPermission.PRIVATE,
      title: name,
      description: '',
      author: 'User',
      createdAt: now,
      updatedAt: now,
      
      worldSetting: {
        overview: '',
        history: '',
        cosmology: '',
        timeline: '',
        languages: [],
        cultures: [],
      },
      
      realmSystem: {
        name: '',
        description: '',
        levels: [],
        breakthroughRules: [],
        attributes: {
          lifespan: '',
          abilities: [],
          resources: [],
        },
      },
      
      factionSystem: {
        name: '',
        description: '',
        factions: [],
        relationshipRules: [],
        conflictSystems: [],
      },
      
      geographySystem: {
        name: '',
        description: '',
        regions: [],
        climateRules: [],
        resourceDistribution: {},
      },
      
      cultivationSystem: {
        name: '',
        description: '',
        techniques: [],
        resources: [],
        rules: [],
      },
      
      gameRules: {
        combatSystem: '',
        itemSystem: '',
        economicSystem: '',
        socialSystem: '',
      },
      
      uniqueFeatures: {
        specialMechanics: [],
        customItems: [],
        customSkills: [],
        customEvents: [],
      },
      
      metadata: {
        tags: [],
        difficulty: 'normal',
        playerCount: 'single',
        estimatedPlaytime: 0,
        contentRating: 'E',
        compatibility: ['1.0.0'],
      },
      
      stats: {
        downloads: 0,
        ratings: 0,
        averageRating: 0,
        reviews: [],
      },
    };

    // 应用自定义数据
    if (customData) {
      Object.assign(baseWorldBook, customData);
    }

    return baseWorldBook;
  }

  /**
   * 创建空白世界书
   */
  private createBlankWorldBook(
    id: string,
    name: string,
    customData?: Partial<WorldBookContent>
  ): WorldBookContent {
    return this.createFromTemplate(id, name, {
      id: 'blank',
      name: 'Blank Template',
      description: '',
      category: WorldBookCategory.CUSTOM,
      structure: { sections: [], requiredFields: [], optionalFields: [] },
      examples: {},
    }, customData);
  }

  /**
   * 获取世界书
   */
  public getWorldBook(id: string): WorldBookContent | null {
    return this.worldBooks.get(id) || null;
  }

  /**
   * 获取所有世界书
   */
  public getAllWorldBooks(): WorldBookContent[] {
    return Array.from(this.worldBooks.values());
  }

  /**
   * 获取当前激活的世界书
   */
  public getActiveWorldBook(): WorldBookContent | null {
    return this.activeWorldBookId ? this.worldBooks.get(this.activeWorldBookId) || null : null;
  }

  /**
   * 设置激活的世界书
   */
  public setActiveWorldBook(id: string): boolean {
    if (this.worldBooks.has(id)) {
      this.activeWorldBookId = id;
      localStorage.setItem('active-worldbook-id', id);
      toast.success('世界书已切换');
      return true;
    }
    return false;
  }

  /**
   * 更新世界书
   */
  public async updateWorldBook(
    id: string,
    updates: Partial<WorldBookContent>
  ): Promise<boolean> {
    try {
      const worldBook = this.worldBooks.get(id);
      if (!worldBook) {
        toast.error('世界书不存在');
        return false;
      }

      // 更新内容
      const updatedWorldBook = {
        ...worldBook,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      this.worldBooks.set(id, updatedWorldBook);
      await this.saveWorldBooks();

      toast.success('世界书更新成功');
      return true;

    } catch (error) {
      console.error('[世界书系统] 更新世界书失败:', error);
      toast.error('更新世界书失败');
      return false;
    }
  }

  /**
   * 删除世界书
   */
  public async deleteWorldBook(id: string): Promise<boolean> {
    try {
      if (!this.worldBooks.has(id)) {
        toast.error('世界书不存在');
        return false;
      }

      // 不能删除当前激活的世界书
      if (id === this.activeWorldBookId) {
        toast.error('不能删除当前使用的世界书');
        return false;
      }

      this.worldBooks.delete(id);
      await this.saveWorldBooks();

      toast.success('世界书删除成功');
      return true;

    } catch (error) {
      console.error('[世界书系统] 删除世界书失败:', error);
      toast.error('删除世界书失败');
      return false;
    }
  }

  /**
   * 导出世界书
   */
  public async exportWorldBook(id: string): Promise<string | null> {
    try {
      const worldBook = this.worldBooks.get(id);
      if (!worldBook) {
        toast.error('世界书不存在');
        return null;
      }

      const exportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        worldBook: worldBook,
      };

      return JSON.stringify(exportData, null, 2);

    } catch (error) {
      console.error('[世界书系统] 导出世界书失败:', error);
      toast.error('导出世界书失败');
      return null;
    }
  }

  /**
   * 导入世界书
   */
  public async importWorldBook(
    importString: string,
    newName?: string
  ): Promise<string | null> {
    try {
      const importData = JSON.parse(importString);
      
      if (!importData.worldBook) {
        toast.error('无效的世界书格式');
        return null;
      }

      const worldBook: WorldBookContent = importData.worldBook;
      const newId = `wb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // 更新导入的世界书
      worldBook.id = newId;
      worldBook.name = newName || `${worldBook.name}_导入`;
      worldBook.createdAt = now;
      worldBook.updatedAt = now;
      worldBook.stats = {
        downloads: 0,
        ratings: 0,
        averageRating: 0,
        reviews: [],
      };

      this.worldBooks.set(newId, worldBook);
      await this.saveWorldBooks();

      toast.success(`世界书"${worldBook.name}"导入成功`);
      return newId;

    } catch (error) {
      console.error('[世界书系统] 导入世界书失败:', error);
      toast.error('导入世界书失败');
      return null;
    }
  }

  /**
   * 获取模板列表
   */
  public getTemplates(): WorldBookTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 验证世界书内容
   */
  public validateWorldBook(worldBook: WorldBookContent): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基础验证
    if (!worldBook.title || worldBook.title.length < 2) {
      errors.push('世界标题至少需要2个字符');
    }

    if (!worldBook.description || worldBook.description.length < 10) {
      errors.push('世界描述至少需要10个字符');
    }

    // 境界系统验证
    if (!worldBook.realmSystem.levels || worldBook.realmSystem.levels.length === 0) {
      warnings.push('建议添加至少一个境界等级');
    }

    // 势力系统验证
    if (!worldBook.factionSystem.factions || worldBook.factionSystem.factions.length === 0) {
      warnings.push('建议添加至少一个势力');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 保存世界书数据
   */
  private async saveWorldBooks(): Promise<void> {
    try {
      const worldBooksData = {
        worldBooks: Array.from(this.worldBooks.entries()),
        activeWorldBookId: this.activeWorldBookId,
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem('game-worldbooks', JSON.stringify(worldBooksData));

    } catch (error) {
      console.error('[世界书系统] 保存失败:', error);
    }
  }

  /**
   * 加载世界书数据
   */
  private async loadWorldBooks(): Promise<void> {
    try {
      const stored = localStorage.getItem('game-worldbooks');
      if (stored) {
        const worldBooksData = JSON.parse(stored);
        
        if (worldBooksData.worldBooks) {
          this.worldBooks = new Map(worldBooksData.worldBooks);
        }
        
        if (worldBooksData.activeWorldBookId) {
          this.activeWorldBookId = worldBooksData.activeWorldBookId;
        }

        console.log('[世界书系统] 加载完成:', this.worldBooks.size, '本世界书');
      }

      // 检查本地存储的激活世界书ID
      const activeId = localStorage.getItem('active-worldbook-id');
      if (activeId && this.worldBooks.has(activeId)) {
        this.activeWorldBookId = activeId;
      }

    } catch (error) {
      console.error('[世界书系统] 加载失败:', error);
    }
  }
}

// 导出单例实例
export const WorldBookSystem = new WorldBookSystemClass();

export default WorldBookSystem;