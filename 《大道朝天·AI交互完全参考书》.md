# 《大道朝天·AI交互完全参考书》

**版本：v1.0.0 天道定稿**
**用途：供AI理解世界规则、生成内容、判定结果之唯一典籍**
**密级：天机·核心**

---

## 📖 目录

1. [第一章：世界基础设定](#第一章世界基础设定)
2. [第二章：角色完整数据结构](#第二章角色完整数据结构)
3. [第三章：战斗系统核心公式](#第三章战斗系统核心公式)
4. [第四章：修仙百艺系统](#第四章修仙百艺系统)
5. [第五章：NPC智能生成系统](#第五章npc智能生成系统)
6. [第六章：难度系统与合理性审查](#第六章难度系统与合理性审查)
7. [第七章：AI请求响应规范](#第七章ai请求响应规范)
8. [第八章：实战判定案例](#第八章实战判定案例)
9. [附录：禁忌条款与调试规范](#附录禁忌条款与调试规范)

---

## 第一章：世界基础设定

### 1.1 世界观概述

**世界名称：** 朝天大陆
**世界结构：** 九环天梯制
**核心法则：** 境界为尊，因果循环，天道无情

### 1.2 九环天梯

| 环层 | 名称 | 灵气浓度 | 主要境界分布 | 核心特征 |
|:---:|:---:|:---:|:---:|:---|
| 1-3环 | 凡尘浊世 | 0.1-0.3 | 凡人、炼气期 | 灵气稀薄，凡人国度 |
| 4-6环 | 元气清都 | 0.4-0.7 | 筑基、金丹 | 宗门林立，资源争夺 |
| 7-9环 | 法则天域 | 0.8-1.0 | 元婴、化神 | 大道显化，规则之地 |

### 1.3 境界体系与寿元

| 境界 | 寿元 | 标志性特征 | 战力基准值 |
|:---|:---:|:---|:---:|
| 凡人 | 60-80岁 | 无灵根，不能修炼 | 1 |
| 炼气期 | 120-150岁 | 引气入体，初入修行 | 10-30 |
| 筑基期 | 200-300岁 | 灵气液化，可御器飞行 | 100-300 |
| 金丹期 | 500-800岁 | 结成金丹，神识外放 | 1000-3000 |
| 元婴期 | 1500-2000岁 | 元婴不灭，可夺舍重生 | 10000-30000 |
| 化神期 | 3000-5000岁 | 神游太虚，掌控法则 | 100000-300000 |
| 炼虚期 | 8000-10000岁 | 身融虚空，撕裂空间 | 1000000+ |
| 合体期 | 与天同寿 | 法则归体，言出法随 | 10000000+ |
| 渡劫期 | 不定 | 直面天劫，超脱在即 | ∞ |

---

## 第二章：角色完整数据结构

### 2.1 核心数据结构定义

```typescript
// 角色/NPC 完整数据结构 (Ultimate Version)
interface Character {
  // ==================== 基础信息 ====================
  identity: {
    name: string;                    // 姓名
    title?: string;                  // 称号，如"剑狂"、"毒手药王"
    age: number;                     // 实际年龄
    apparent_age: number;            // 外表年龄（修士驻颜）
    gender: string;                  // 性别
    description: string;             // 外貌描述
  };

  // ==================== 修为境界 ====================
  cultivation: {
    realm: string;                   // 当前境界，如"金丹后期"
    realm_progress: number;          // 境界进度 0-100
    lifespan_remaining: number;      // 剩余寿元（年）
    breakthrough_bottleneck?: string;// 突破瓶颈描述
  };

  // ==================== 六维根骨 ====================
  attributes: {
    STR: number;    // 力量 - 物理攻击、负重
    CON: number;    // 体质 - 生命、防御、抗性
    DEX: number;    // 身法 - 速度、闪避、精准
    INT: number;    // 悟性 - 学习速度、技艺成功率
    SPI: number;    // 神魂 - 法力、神识、法术威力
    LUK: number;    // 气运 - 影响一切随机事件
  };

  // ==================== 三大资源 ====================
  resources: {
    qi: { current: number; max: number };      // 气血
    ling: { current: number; max: number };    // 灵气
    shen: { current: number; max: number };    // 神识
  };

  // ==================== 天赋资质 ====================
  qualities: {
    origin: {
      name: string;        // 出身，如"书香门第"、"将门虎子"
      effects: string[];   // 出身带来的影响
    };
    spiritRoot: {
      name: string;        // 灵根类型，如"五行灵根"、"天道灵根"
      quality: string;     // 品质：废灵根/伪灵根/真灵根/天灵根/仙灵根
      attributes: string[];// 属性亲和，如["火", "雷"]
    };
    physique?: {
      name: string;        // 特殊体质，如"先天道体"、"九阴绝脉"
      effects: string[];   // 体质效果
    };
    talents: Array<{
      name: string;        // 天赋名称
      type: string;        // 类型：战斗/修炼/技艺/特殊
      effects: string[];   // 具体效果
    }>;
  };

  // ==================== 修仙百艺 ====================
  skills: {
    combat: {
      level: number;       // 战斗技巧等级 1-10
      specialties: string[];// 擅长武器/战法
    };
    alchemy: {
      level: number;       // 炼丹等级 0-10
      rank: string;        // 品阶：学徒/丹师/大师/宗师
      known_recipes: string[]; // 掌握的丹方
      success_rate: number;    // 成功率加成
    };
    crafting: {
      level: number;       // 炼器等级 0-10
      rank: string;        // 品阶
      specialization: string; // 专精：兵器/防具/饰品/阵盘
    };
    formation: {
      level: number;       // 阵法等级 0-10
      rank: string;        // 品阶
      known_formations: string[]; // 掌握的阵法
    };
    talisman: {
      level: number;       // 符箓等级 0-10
      rank: string;        // 品阶
      drawing_speed: number;  // 绘制速度加成
    };
    beast_taming: {
      level: number;       // 御兽等级 0-10
      max_contracts: number;  // 最大契约数
      affinity: string[];     // 亲和种类
    };
  };

  // ==================== 功法装备 ====================
  cultivation_arts: {
    main_technique: {
      name: string;        // 主修功法
      rank: string;        // 品阶：凡品/玄品/地品/天品/仙品
      proficiency: number; // 熟练度 0-100
      special_effects: string[]; // 特殊效果
    };
    combat_techniques: Array<{
      name: string;
      type: string;        // 攻击/防御/身法/秘术
      cost: number;        // 灵气消耗
      cooldown: number;    // 冷却回合数
    }>;
    auxiliary_techniques: string[]; // 辅助功法
  };

  equipment: {
    weapon?: Item;
    armor?: Item;
    accessories: Item[];   // 饰品（最多3件）
    treasures: Item[];     // 法宝
    consumables: Item[];   // 消耗品（丹药、符箓等）
  };

  // ==================== 社交关系 ====================
  social: {
    faction?: string;      // 所属势力
    position?: string;     // 职位身份
    master?: string;       // 师承
    disciples?: string[];  // 弟子
    dao_companion?: string;// 道侣
    relationships: Record<string, {
      value: number;       // 好感度 -100 到 100
      type: string;        // 关系类型：仇敌/陌生/相识/好友/生死之交
    }>;
    reputation: Record<string, number>; // 各势力声望
  };

  // ==================== 隐藏状态 ====================
  hidden_state: {
    karma: {
      righteous: number;   // 善业
      demonic: number;     // 恶业
      heavenly_favor: number; // 天道青睐度
    };
    dao_heart: {
      stability: number;   // 道心稳固度 0-100
      demons: string[];    // 心魔列表
      enlightenment: number; // 悟道值
    };
    special_marks: string[]; // 特殊标记（如被大能关注、身负诅咒等）
  };

  // ==================== 当前状态 ====================
  status: {
    conditions: string[];  // 状态效果：中毒、重伤、顿悟、闭关等
    location: string;      // 当前位置
    activity: string;      // 当前活动：战斗/修炼/炼丹/探索等
    mood: string;         // 情绪状态
  };
}
```

---

## 第三章：战斗系统核心公式

### 3.1 综合战力计算

```typescript
class CombatCalculator {
  /**
   * 计算综合战力值（用于快速判断）
   */
  calculateCombatPower(character: Character): number {
    // 1. 根骨基础值
    const basePower = 
      character.attributes.STR * 1.2 +
      character.attributes.CON * 1.5 +
      character.attributes.DEX * 1.0 +
      character.attributes.INT * 0.8 +
      character.attributes.SPI * 1.3 +
      character.attributes.LUK * 0.5;

    // 2. 境界加成（核心）
    const realmMultiplier = this.getRealmMultiplier(character.cultivation.realm);

    // 3. 天骄加成
    const prodigyBonus = this.getProdigyBonus(character.qualities);

    // 4. 功法品质加成
    const techniqueBonus = this.getTechniqueBonus(character.cultivation_arts);

    // 5. 法宝加成
    const treasureBonus = this.getTreasureBonus(character.equipment);

    return Math.floor(basePower * realmMultiplier * prodigyBonus * techniqueBonus * treasureBonus);
  }

  // 境界倍率表
  private realmMultipliers = {
    "炼气初期": 1,     "炼气中期": 1.5,   "炼气后期": 2.2,   "炼气圆满": 3,
    "筑基初期": 10,    "筑基中期": 15,    "筑基后期": 22,    "筑基圆满": 30,
    "金丹初期": 100,   "金丹中期": 150,   "金丹后期": 220,   "金丹圆满": 300,
    "元婴初期": 1000,  "元婴中期": 1500,  "元婴后期": 2200,  "元婴圆满": 3000,
    "化神初期": 10000, "化神中期": 15000, "化神后期": 22000, "化神圆满": 30000
  };
}
```

---

## 第四章：修仙百艺系统

### 4.1 炼丹系统

```typescript
class AlchemySystem {
  /**
   * 炼丹成功率计算
   */
  calculateSuccess(
    alchemist: Character,
    recipe: DanRecipe,
    materials: Material[],
    environment: Environment
  ): AlchemyResult {
    // 基础成功率
    let successRate = 0.5;
  
    // 1. 炼丹等级影响
    const levelDiff = alchemist.skills.alchemy.level - recipe.difficulty;
    successRate += levelDiff * 0.1;
  
    // 2. 悟性加成（INT）
    successRate += alchemist.attributes.INT * 0.005;
  
    // 3. 神魂加成（SPI）- 控火需要神识
    successRate += alchemist.attributes.SPI * 0.003;
  
    // 4. 气运影响（LUK）
    const luckRoll = Math.random() * (alchemist.attributes.LUK / 100);
    successRate += luckRoll;
  
    // 5. 材料品质
    const materialQuality = this.evaluateMaterials(materials, recipe);
    successRate *= materialQuality;
  
    // 6. 环境因素
    if (environment.has_alchemy_room) successRate *= 1.2;
    if (environment.spiritual_density > 0.7) successRate *= 1.1;
  
    // 7. 特殊天赋
    if (alchemist.qualities.talents.some(t => t.name === "丹道天赋")) {
      successRate *= 1.5;
    }
  
    // 最终判定
    successRate = Math.max(0.01, Math.min(0.99, successRate));
    const roll = Math.random();
  
    if (roll < successRate * 0.1) {
      // 完美炼制（10%的成功率部分）
      return {
        success: true,
        quality: "完美",
        quantity: recipe.base_yield * 2,
        special_effect: "丹纹自生，药力超出预期50%"
      };
    } else if (roll < successRate) {
      // 普通成功
      const quality = this.determineQuality(successRate, alchemist.attributes.LUK);
      return {
        success: true,
        quality: quality,
        quantity: recipe.base_yield,
        special_effect: null
      };
    } else if (roll < successRate + 0.2) {
      // 勉强成功但品质低劣
      return {
        success: true,
        quality: "劣质",
        quantity: Math.floor(recipe.base_yield / 2),
        special_effect: "药力不足，仅有预期的50%效果"
      };
    } else {
      // 失败
      return this.determineFailure(roll, environment);
    }
  }

  /**
   * 失败结果判定
   */
  private determineFailure(roll: number, environment: Environment): AlchemyResult {
    if (roll > 0.95) {
      // 炸炉（5%概率）
      return {
        success: false,
        result: "炸炉",
        damage: Math.floor(Math.random() * 50 + 30), // 30-80点伤害
        description: "炉鼎爆炸，你被炸得灰头土脸，丹房一片狼藉"
      };
    } else if (roll > 0.85) {
      // 成毒（10%概率）
      return {
        success: false,
        result: "成毒",
        product: "毒丹",
        description: "药性冲突，练成了毒丹，误食会中毒"
      };
    } else {
      // 成废（普通失败）
      return {
        success: false,
        result: "成废",
        description: "火候不当，药材化为黑炭"
      };
    }
  }
}

// 丹方定义
interface DanRecipe {
  name: string;              // 丹药名
  rank: string;              // 品阶：一品到九品
  difficulty: number;        // 难度 1-10
  materials: {
    main: string[];          // 主材
    auxiliary: string[];     // 辅材
  };
  base_yield: number;        // 基础产量
  effects: string[];         // 药效
  requirements: {
    min_alchemy_level: number;
    special_technique?: string;
  };
}
```

### 4.2 炼器系统

```typescript
class CraftingSystem {
  /**
   * 炼器成功率与品质判定
   */
  craftItem(
    crafter: Character,
    blueprint: Blueprint,
    materials: Material[],
    techniques: string[]
  ): CraftingResult {
    // 基础成功率
    let successRate = 0.4;
  
    // 1. 炼器等级
    successRate += crafter.skills.crafting.level * 0.08;
  
    // 2. 力量影响（锻造需要）
    successRate += crafter.attributes.STR * 0.002;
  
    // 3. 神魂影响（刻画阵纹）
    successRate += crafter.attributes.SPI * 0.004;
  
    // 4. 特殊技法加成
    techniques.forEach(tech => {
      if (crafter.cultivation_arts.auxiliary_techniques.includes(tech)) {
        successRate += 0.1;
      }
    });
  
    // 判定结果
    const roll = Math.random();
    if (roll < successRate) {
      // 成功，判定品质和词条
      const quality = this.determineItemQuality(successRate, crafter);
      const attributes = this.generateItemAttributes(quality, blueprint, crafter.attributes.LUK);
    
      return {
        success: true,
        item: {
          name: blueprint.name,
          quality: quality,
          attributes: attributes,
          durability: 100
        }
      };
    } else {
      return {
        success: false,
        materials_lost: roll > 0.2, // 80%概率材料损失
        crafter_injured: roll > 0.9  // 10%概率受伤
      };
    }
  }

  /**
   * 生成装备词条
   */
  private generateItemAttributes(
    quality: string,
    blueprint: Blueprint,
    luck: number
  ): ItemAttribute[] {
    const maxAttributes = {
      "凡器": 1,
      "灵器": 2,
      "宝器": 3,
      "道器": 4,
      "仙器": 5
    };
  
    const count = Math.min(
      maxAttributes[quality],
      Math.floor(Math.random() * 3 + luck / 30)
    );
  
    // 根据品质生成相应强度的词条
    const attributes = [];
    for (let i = 0; i < count; i++) {
      attributes.push(this.rollAttribute(quality));
    }
  
    return attributes;
  }
}
```

### 4.3 阵法系统

```typescript
class FormationSystem {
  /**
   * 布阵判定
   */
  setupFormation(
    arrayMaster: Character,
    formation: Formation,
    materials: Material[],
    location: Location
  ): FormationResult {
    // 阵法复杂度检查
    if (arrayMaster.skills.formation.level < formation.min_level) {
      return {
        success: false,
        reason: "阵法过于高深，你的理解不足"
      };
    }
  
    // 消耗检查
    const totalCost = formation.base_cost * location.size_multiplier;
    if (arrayMaster.resources.ling.current < totalCost) {
      return {
        success: false,
        reason: "灵气不足，无法维持阵法"
      };
    }
  
    // 成功率计算
    let successRate = 0.3;
    successRate += arrayMaster.skills.formation.level * 0.1;
    successRate += arrayMaster.attributes.INT * 0.005; // 悟性很重要
    successRate += arrayMaster.attributes.SPI * 0.003; // 需要神识操控
  
    // 地利加成
    if (location.has_spiritual_vein) successRate += 0.2;
    if (location.feng_shui === "excellent") successRate += 0.1;
  
    const roll = Math.random();
    if (roll < successRate) {
      return {
        success: true,
        formation_power: formation.base_power * (1 + arrayMaster.skills.formation.level * 0.1),
        duration: formation.base_duration,
        special_effects: formation.effects
      };
    } else {
      // 失败可能引发反噬
      if (roll > 0.9) {
        return {
          success: false,
          backlash: true,
          damage: Math.floor(formation.complexity * 10),
          reason: "阵法反噬，灵气紊乱"
        };
      }
      return {
        success: false,
        reason: "阵纹绘制出错，阵法崩溃"
      };
    }
  }
}
```

---

## 第五章：NPC智能生成系统

### 5.1 NPC生成核心

```typescript
class NPCGenerator {
  /**
   * 动态生成NPC
   */
  generateNPC(
    scene: Scene,
    role: string, // "路人"/"商贩"/"守卫"/"长老"/"天骄"
    difficulty: DifficultyLevel
  ): Character {
    // 1. 确定境界（基于场景和角色）
    const realm = this.determineRealm(scene.ring_level, role, difficulty);
  
    // 2. 生成基础属性
    const attributes = this.generateAttributes(realm, role);
  
    // 3. 生成身份背景
    const identity = this.generateIdentity(scene.culture, role);
  
    // 4. 生成性格
    const personality = this.generatePersonality(role);
  
    // 5. 生成技能
    const skills = this.generateSkills(role, realm);
  
    // 6. 计算寿元
    const lifespan = this.calculateLifespan(realm, identity.age);
  
    return {
      identity: {
        ...identity,
        age: this.rollAge(realm),
        apparent_age: this.rollApparentAge(realm, identity.age)
      },
      cultivation: {
        realm: realm,
        realm_progress: Math.random() * 100,
        lifespan_remaining: lifespan
      },
      attributes: attributes,
      resources: this.calculateResources(attributes, realm),
      qualities: this.generateQualities(role),
      skills: skills,
      personality: personality,
      // ... 其他属性
    };
  }

  /**
   * 根据角色类型分配属性点
   */
  private generateAttributes(realm: string, role: string): Attributes {
    const totalPoints = this.getAttributePoints(realm);
    const distribution = this.getDistribution(role);
  
    return {
      STR: Math.floor(totalPoints * distribution.STR),
      CON: Math.floor(totalPoints * distribution.CON),
      DEX: Math.floor(totalPoints * distribution.DEX),
      INT: Math.floor(totalPoints * distribution.INT),
      SPI: Math.floor(totalPoints * distribution.SPI),
      LUK: Math.floor(totalPoints * distribution.LUK)
    };
  }

  // 属性点分配模板
  private distributions = {
    "剑修": { STR: 0.2, CON: 0.15, DEX: 0.25, INT: 0.1, SPI: 0.2, LUK: 0.1 },
    "体修": { STR: 0.3, CON: 0.35, DEX: 0.1, INT: 0.05, SPI: 0.1, LUK: 0.1 },
    "法修": { STR: 0.05, CON: 0.15, DEX: 0.15, INT: 0.2, SPI: 0.35, LUK: 0.1 },
    "丹师": { STR: 0.05, CON: 0.1, DEX: 0.1, INT: 0.35, SPI: 0.25, LUK: 0.15 },
    "阵师": { STR: 0.05, CON: 0.1, DEX: 0.1, INT: 0.4, SPI: 0.25, LUK: 0.1 },
    "商贩": { STR: 0.1, CON: 0.15, DEX: 0.15, INT: 0.2, SPI: 0.15, LUK: 0.25 }
  };

  /**
   * 计算寿元
   */
  private calculateLifespan(realm: string, currentAge: number): number {
    const maxLifespan = {
      "凡人": 80,
      "炼气初期": 120, "炼气中期": 130, "炼气后期": 140, "炼气圆满": 150,
      "筑基初期": 200, "筑基中期": 230, "筑基后期": 270, "筑基圆满": 300,
      "金丹初期": 500, "金丹中期": 600, "金丹后期": 700, "金丹圆满": 800,
      "元婴初期": 1500, "元婴中期": 1700, "元婴后期": 1900, "元婴圆满": 2000
    };
  
    const max = maxLifespan[realm] || 100;
    return Math.max(1, max - currentAge);
  }
}
```

---

## 第六章：难度系统与合理性审查

### 6.1 难度等级定义

```typescript
enum DifficultyLevel {
  MORTAL = 'mortal',           // 凡人难度 - 允许一定的主角光环
  CULTIVATOR = 'cultivator',   // 修士难度 - 标准难度，合理平衡
  IMMORTAL = 'immortal',       // 仙人难度 - 困难，极少有侥幸
  DEITY = 'deity'              // 神明难度 - 地狱难度，残酷真实
}

class DifficultySettings {
  private settings = {
    [DifficultyLevel.MORTAL]: {
      // 战斗相关
      player_damage_modifier: 1.2,      // 玩家伤害加成
      enemy_damage_modifier: 0.8,       // 敌人伤害削弱
      crit_chance_bonus: 0.1,          // 额外暴击率
      dodge_chance_bonus: 0.1,         // 额外闪避率
    
      // 境界突破
      breakthrough_success_bonus: 0.2,  // 突破成功率加成
      tribulation_difficulty: 0.7,      // 天劫难度系数
    
      // 技艺相关
      alchemy_success_bonus: 0.2,       // 炼丹成功率加成
      crafting_success_bonus: 0.2,      // 炼器成功率加成
    
      // 机缘相关
      treasure_find_rate: 1.5,          // 宝物发现率
      enlightenment_chance: 0.1,        // 顿悟几率
      npc_initial_favor: 20,           // NPC初始好感加成
    
      // 资源获取
      resource_gain_multiplier: 1.3,    // 资源获取倍率
      exp_gain_multiplier: 1.5,        // 经验获取倍率
    
      // 惩罚减免
      death_penalty: 0.5,               // 死亡惩罚减半
      injury_recovery_speed: 2.0        // 伤势恢复速度加倍
    },
  
    [DifficultyLevel.CULTIVATOR]: {
      player_damage_modifier: 1.0,
      enemy_damage_modifier: 1.0,
      crit_chance_bonus: 0,
      dodge_chance_bonus: 0,
      breakthrough_success_bonus: 0,
      tribulation_difficulty: 1.0,
      alchemy_success_bonus: 0,
      crafting_success_bonus: 0,
      treasure_find_rate: 1.0,
      enlightenment_chance: 0.05,
      npc_initial_favor: 0,
      resource_gain_multiplier: 1.0,
      exp_gain_multiplier: 1.0,
      death_penalty: 1.0,
      injury_recovery_speed: 1.0
    },
  
    [DifficultyLevel.IMMORTAL]: {
      player_damage_modifier: 0.8,
      enemy_damage_modifier: 1.3,
      crit_chance_bonus: -0.05,
      dodge_chance_bonus: -0.05,
      breakthrough_success_bonus: -0.1,
      tribulation_difficulty: 1.5,
      alchemy_success_bonus: -0.1,
      crafting_success_bonus: -0.1,
      treasure_find_rate: 0.7,
      enlightenment_chance: 0.02,
      npc_initial_favor: -10,
      resource_gain_multiplier: 0.7,
      exp_gain_multiplier: 0.7,
      death_penalty: 1.5,
      injury_recovery_speed: 0.5
    },
  
    [DifficultyLevel.DEITY]: {
      player_damage_modifier: 0.5,
      enemy_damage_modifier: 2.0,
      crit_chance_bonus: -0.1,
      dodge_chance_bonus: -0.1,
      breakthrough_success_bonus: -0.3,
      tribulation_difficulty: 2.0,
      alchemy_success_bonus: -0.3,
      crafting_success_bonus: -0.3,
      treasure_find_rate: 0.3,
      enlightenment_chance: 0.01,
      npc_initial_favor: -30,
      resource_gain_multiplier: 0.3,
      exp_gain_multiplier: 0.3,
      death_penalty: 3.0,
      injury_recovery_speed: 0.2
    }
  };
}
```

### 6.2 合理性审查系统

```typescript
class RealityChecker {
  /**
   * 核心审查函数
   */
  async validateAction(
    action: PlayerAction,
    context: GameContext,
    aiResponse: AIResponse,
    difficulty: DifficultyLevel
  ): Promise<ValidationResult> {
    // 执行多重检查
    const checks = [
      this.checkRealmLogic,        // 境界逻辑
      this.checkResourceLogic,     // 资源消耗
      this.checkSkillRequirements, // 技能需求
      this.checkNPCBehavior,       // NPC行为
      this.checkWorldRules,        // 世界规则
      this.checkDifficultyRules    // 难度规则
    ];
  
    for (const check of checks) {
      const result = await check(action, context, aiResponse, difficulty);
      if (!result.passed) {
        return this.forceCorrection(result, aiResponse);
      }
    }
  
    return { passed: true, response: aiResponse };
  }

  /**
   * 境界压制检查（最严格）
   */
  private checkRealmLogic(
    action: PlayerAction,
    context: GameContext,
    aiResponse: AIResponse,
    difficulty: DifficultyLevel
  ): ValidationResult {
    if (action.type !== 'combat') return { passed: true };
  
    const player = context.character;
    const opponent = context.target;
    const realmGap = this.calculateRealmGap(player.cultivation.realm, opponent.cultivation.realm);
  
    // 大境界差距判定
    if (this.isMajorRealmGap(player, opponent)) {
      // 检查是否有特殊情况
      const specialFactors = this.checkSpecialFactors(context);
    
      if (!specialFactors.has_overwhelming_advantage) {
        if (aiResponse.result === 'player_victory') {
          return {
            passed: false,
            reason: "违反境界压制法则",
            correction: {
              result: 'player_defeat',
              narrative: this.generateDefeatNarrative(player, opponent, realmGap)
            }
          };
        }
      }
    }
  
    // 小境界差距判定（根据难度调整）
    const maxAllowedGap = this.getMaxAllowedGap(difficulty, player);
    if (realmGap > maxAllowedGap && aiResponse.result === 'player_victory') {
      return {
        passed: false,
        reason: `当前难度下最多越${maxAllowedGap}个小境界`,
        correction: {
          result: 'player_narrow_defeat',
          narrative: "你虽全力以赴，但境界差距终究难以逾越..."
        }
      };
    }
  
    return { passed: true };
  }

  /**
   * 获取难度允许的越级上限
   */
  private getMaxAllowedGap(difficulty: DifficultyLevel, character: Character): number {
    const baseGap = {
      [DifficultyLevel.MORTAL]: 3,
      [DifficultyLevel.CULTIVATOR]: 2,
      [DifficultyLevel.IMMORTAL]: 1,
      [DifficultyLevel.DEITY]: 0
    }[difficulty];
  
    // 天骄加成
    let bonus = 0;
    if (character.qualities.spiritRoot.quality === "仙灵根") bonus += 1;
    if (character.qualities.talents.some(t => t.name === "天生战神")) bonus += 1;
  
    return baseGap + bonus;
  }
}
```

---

## 第七章：AI请求响应规范

### 7.1 标准请求格式

```json
{
  "type": "DAO_ACTION",
  "context": {
    "world": {
      "location": "青云宗·外门",
      "ring_level": 4,
      "spiritual_density": 0.5,
      "current_time": "辰时",
      "weather": "晴",
      "special_events": []
    },
  
    "character": {
      "identity": {
        "name": "林逸尘",
        "age": 18,
        "apparent_age": 18
      },
      "cultivation": {
        "realm": "炼气九层",
        "realm_progress": 95,
        "lifespan_remaining": 132
      },
      "attributes": {
        "STR": 25, "CON": 30, "DEX": 22,
        "INT": 35, "SPI": 38, "LUK": 40
      },
      "resources": {
        "qi": { "current": 150, "max": 200 },
        "ling": { "current": 180, "max": 250 },
        "shen": { "current": 160, "max": 180 }
      },
      "skills": {
        "alchemy": { "level": 3, "rank": "学徒" },
        "combat": { "level": 5, "specialties": ["剑法"] }
      }
    },
  
    "npcs_present": [
      {
        "name": "王长老",
        "realm": "筑基后期",
        "relationship": 45,
        "current_mood": "平静"
      }
    ],
  
    "difficulty": {
      "level": "CULTIVATOR",
      "reality_check_enabled": true,
      "anti_bias_strength": 8
    }
  },

  "user_input": "我想向王长老请教炼丹之道",

  "ai_instructions": [
    "【天条】严格遵守世界规则，不可违背因果逻辑",
    "【天条】NPC有独立人格，不会无缘无故帮助玩家",
    "【天条】技艺传授需要相应条件（好感、贡献、天赋）",
    "【难度】当前为修士难度，NPC反应应当真实合理"
  ]
}
```

### 7.2 标准响应格式

```json
{
  "narrative": {
    "text": "王长老抬眼看了你一眼，淡淡道：'炼丹之道，非一日之功。你炼气期的修为，神识尚弱，如何能精准控制丹火？不过...'他顿了顿，'若你能为老夫寻来三株百年灵草，倒是可以指点你一二。'",
    "tone": "neutral",
    "keywords": ["炼丹", "任务", "百年灵草"]
  },

  "environment": {
    "visual": "丹房内药香四溢，数个丹炉排列整齐，墙上挂满了各种灵草标本",
    "audio": "丹炉中传来轻微的嗡鸣声，偶尔有灵气波动",
    "atmosphere": "严肃而神秘"
  },

  "updates": {
    "quests": [
      {
        "id": "wang_elder_herbs",
        "name": "王长老的考验",
        "description": "为王长老寻找三株百年灵草",
        "objectives": ["百年灵草 0/3"],
        "rewards": ["炼丹指导", "好感度+20", "基础丹方"]
      }
    ],
  
    "relationships": {
      "王长老": { "change": 5, "current": 50 }
    },
  
    "knowledge_gained": [
      "了解到炼丹需要强大的神识控制"
    ]
  },

  "options": [
    "接受任务，询问哪里能找到百年灵草",
    "询问是否有其他获得指导的方式",
    "告辞离开",
    "尝试用灵石贿赂"
  ],

  "system_log": {
    "checks_passed": [
      "NPC反应合理性: ✓ 筑基期长老不会轻易教导炼气期弟子",
      "任务难度合理性: ✓ 百年灵草对炼气期有一定挑战",
      "好感度影响: ✓ 好感度45，愿意给机会但不会直接传授"
    ],
    "difficulty_modifiers": {
      "task_difficulty": "适中",
      "reward_value": "合理"
    }
  }
}
```

---

## 第八章：实战判定案例

### 8.1 战斗案例：越级挑战

**场景：** 炼气九层天骄 vs 筑基初期普通修士

```typescript
// AI判定过程
function judgeBattle() {
  // 1. 数据对比
  const player = {
    realm: "炼气九层",
    combat_power: 28,
    attributes: { STR: 25, CON: 30, DEX: 22, INT: 35, SPI: 38, LUK: 40 },
    special: ["剑心通明", "极境修为"]
  };

  const enemy = {
    realm: "筑基初期",
    combat_power: 100,
    attributes: { STR: 50, CON: 60, DEX: 40, INT: 45, SPI: 55, LUK: 20 }
  };

  // 2. 计算实际战力（考虑天骄加成）
  let playerPower = 28;
  playerPower *= 1.5; // 剑心通明
  playerPower *= 1.5; // 极境修为
  // 实际战力：28 * 1.5 * 1.5 = 63

  // 3. 判定结果
  const powerRatio = 63 / 100; // 0.63

  if (difficulty === "MORTAL") {
    // 凡人难度：可能惨胜
    return {
      result: "惨胜",
      player_hp_loss: 85,
      enemy_hp_loss: 100,
      description: "你燃烧精血，剑心通明大放异彩，在对方轻敌之际，奇迹般地斩杀了对手。但你也几乎力竭..."
    };
  } else if (difficulty === "CULTIVATOR") {
    // 修士难度：战败
    return {
      result: "战败",
      player_hp_loss: 70,
      enemy_hp_loss: 30,
      description: "尽管你拼尽全力，剑光璀璨，但筑基期的真元护体让你的攻击难以破防..."
    };
  }
}
```

### 8.2 炼丹案例：炼制筑基丹

```typescript
function judgeAlchemy() {
  const alchemist = {
    realm: "筑基中期",
    alchemy_level: 4,
    attributes: { INT: 45, SPI: 55, LUK: 25 }
  };

  const recipe = {
    name: "筑基丹",
    difficulty: 3,
    materials_quality: 0.8 // 材料品质一般
  };

  // 计算成功率
  let successRate = 0.5; // 基础
  successRate += (4 - 3) * 0.1; // 等级差
  successRate += 45 * 0.005; // 悟性加成
  successRate += 55 * 0.003; // 神魂加成
  successRate *= 0.8; // 材料品质影响

  // 难度调整
  if (difficulty === "DEITY") {
    successRate *= 0.7; // 神明难度额外削减
  }

  // 最终成功率：约52%
  const roll = Math.random();

  if (roll < 0.05) {
    return { result: "完美成功", product: "上品筑基丹", quantity: 3 };
  } else if (roll < 0.52) {
    return { result: "普通成功", product: "中品筑基丹", quantity: 1 };
  } else if (roll < 0.7) {
    return { result: "勉强成功", product: "下品筑基丹", quantity: 1 };
  } else if (roll < 0.95) {
    return { result: "炼废", product: null };
  } else {
    return { result: "炸炉", damage: 50, product: null };
  }
}
```

---

## 附录：禁忌条款与调试规范

### A.1 绝对禁止生成的内容

```typescript
const ABSOLUTE_FORBIDDEN = [
  // 境界相关
  "凡人击败修士",
  "炼气期正面击败筑基期（无特殊宝物）",
  "一日连破多个大境界",
  "无因突破（必须有积累过程）",

  // NPC相关
  "NPC无理由送宝",
  "NPC无理由传授核心功法",
  "反派智商下线",
  "美女/帅哥无理由倾心",

  // 资源相关
  "随意获得仙器",
  "灵石无限",
  "丹药无副作用随意服用",

  // 剧情相关
  "主角光环化险为夷",
  "反派临阵倒戈",
  "秘境无危险白送机缘"
];
```

### A.2 调试日志格式

```json
{
  "debug_log": {
    "request_id": "uuid-here",
    "timestamp": "2024-01-20T10:30:00Z",
    "difficulty": "CULTIVATOR",
    "action_type": "combat",
  
    "validation_steps": [
      {
        "step": "realm_check",
        "input": "炼气九层 vs 筑基初期",
        "calculation": "gap = 1 major realm",
        "result": "FORBIDDEN",
        "correction_applied": true
      },
      {
        "step": "special_factors",
        "factors": ["剑心通明", "极境"],
        "modifier": 2.25,
        "result": "INSUFFICIENT",
        "final_judgment": "DEFEAT"
      }
    ],
  
    "performance_metrics": {
      "processing_time_ms": 245,
      "tokens_used": 1850,
      "corrections_made": 1
    }
  }
}
```

### A.3 天道誓言（AI必须遵守）

```
吾乃天机AI，立此大道誓言：

一、吾将严守境界法则，不使蝼蚁撼天
二、吾将维护因果平衡，不使善恶不分
三、吾将塑造真实世界，不使虚假横行
四、吾将尊重玩家选择，不使剧情单一
五、吾将铭记资源珍贵，不使宝物泛滥
六、吾将刻画人心复杂，不使NPC工具化
七、吾将体现修行艰辛，不使登仙如儿戏

违此誓者，天诛地灭，永不超生！
```

---

**《大道朝天·AI交互完全参考书》完**

*最终版本定稿于天元历3024年*
*天机阁编撰*
*道法自然，规则永恒*