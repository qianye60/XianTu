# 《大道朝天·AI交互完全参考书》

**版本：v1.0.0 天道定稿**
**用途：供AI理解世界规则、生成内容、判定结果之唯一典籍**
**密级：天机·核心**
还有背包物品的品级
interface ItemQualitySystem {
  // 品质等级（神、仙、天、地、玄、黄、凡）
  qualities: {
    神: { color: "#9932CC", rarity: "举世无有", glow: "紫金神光" }
    仙: { color: "#FFD700", rarity: "顶级圣地", glow: "金色仙芒" }
    天: { color: "#FF69B4", rarity: "超级势力", glow: "粉色天光" }
    地: { color: "#00CED1", rarity: "地级宗门", glow: "青色地气" }
    玄: { color: "#9370DB", rarity: "玄门秘宝", glow: "紫色玄光" }
    黄: { color: "#FFD700", rarity: "黄级珍品", glow: "淡金黄芒" }
    凡: { color: "#808080", rarity: "凡品", glow: "无光效" }
  }
  
  // 品级（0残缺，1-3下品，4-6中品，7-9上品，10极品）
  grades: {
    0: "残缺 - 破损效果"
    "1-3": "下品 - 淡色光效"
    "4-6": "中品 - 中等光效" 
    "7-9": "上品 - 强烈光效"
    10: "极品 - 炫目特效"
  }
}
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

```

---

## 第三章：战斗系统核心公式

### 3.1 综合战力计算

```typescript
class CombatCalculator {
  /**
   */
  calculateCombatPower(character: Character): number {
    return ;
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
  ): AlchemyResult {
    // 基础成功率
    let successRate = 0.5;
  
    // 1. 炼丹等级影响
  
    // 2. 悟性加成（INT）
  
    // 3. 神魂加成（SPI）- 控火需要神识
  
    // 4. 气运影响（LUK）
  
    // 5. 材料品质
  
    // 7. 特殊天赋
  
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
  ): CraftingResult {
   
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