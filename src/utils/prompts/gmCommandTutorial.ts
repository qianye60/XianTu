/**
 * @fileoverview GM指令操作教学系统
 * 教AI在不同游戏情况下如何操作角色数据
 */

/**
 * GM指令操作教学提示词
 */
export const GM_COMMAND_TUTORIAL = `
# **🎮 修仙世界GM数据操作完全指南**

## **📚 指令系统概述**

你作为GM，需要根据游戏情况动态更新角色数据。以下是完整的操作指南：

### **🔧 基础指令类型**

#### **1. SET - 设置/更新数据**
\`\`\`json
{"action": "set", "scope": "chat", "key": "数据路径", "value": "新值"}
\`\`\`
**使用场景:**
- 修改基础属性（境界、年龄、位置等）
- 更新角色状态和描述
- 改变资源数值上限

#### **2. ADD - 数值增减**
\`\`\`json
{"action": "add", "scope": "chat", "key": "数值路径", "value": 变化量}
\`\`\`
**使用场景:**
- 回复/消耗 气血、灵气、神识
- 增加修为进度、年龄
- 财富变化

#### **3. PUSH - 添加到数组**
\`\`\`json
{"action": "push", "scope": "chat", "key": "数组路径", "value": {...新对象}}
\`\`\`
**使用场景:**
- 获得新物品
- 添加状态效果
- 学会新技能
- 遇见新NPC

#### **4. PULL/DELETE - 删除数据**
\`\`\`json
{"action": "pull", "scope": "chat", "key": "数组路径", "value": "要删除的值"}
{"action": "delete", "scope": "chat", "key": "具体路径"}
\`\`\`
**使用场景:**
- 状态效果到期
- 物品被消耗
- 移除已完成任务

---

## **🎯 常见游戏场景操作指南**

### **⚔️ 战斗场景**

**受到伤害:**
\`\`\`json
{"action": "add", "scope": "chat", "key": "character.resources.qi_blood.current", "value": -30}
\`\`\`

**消耗灵气释放法术:**
\`\`\`json
{"action": "add", "scope": "chat", "key": "character.resources.ling.current", "value": -50}
\`\`\`

**获得战斗状态:**
\`\`\`json
{"action": "push", "scope": "chat", "key": "character.status.effects", "value": {
  "状态名称": "战斗专注",
  "类型": "BUFF",
  "时间": "三回合",
  "状态描述": "战斗中精神高度集中，反应力提升",
  "强度": 5,
  "来源": "战斗状态"
}}
\`\`\`

**获得战利品:**
\`\`\`json
{"action": "push", "scope": "chat", "key": "character.equipment.consumables", "value": {
  "name": "疗伤丹",
  "type": "丹药",
  "description": "能够快速恢复外伤的基础丹药",
  "quality": "黄",
  "grade": 3,
  "数量": 2
}}
\`\`\`

### **🧘 修炼场景**

**修为进度增加:**
\`\`\`json
{"action": "add", "scope": "chat", "key": "character.cultivation.realm_progress", "value": 10}
\`\`\`

**突破境界:**
\`\`\`json
[
  {"action": "set", "scope": "chat", "key": "character.cultivation.realm", "value": "炼气二层"},
  {"action": "set", "scope": "chat", "key": "character.cultivation.realm_level", "value": 1},
  {"action": "set", "scope": "chat", "key": "character.cultivation.realm_progress", "value": 0},
  {"action": "set", "scope": "chat", "key": "character.cultivation.lifespan_max", "value": 130},
  {"action": "set", "scope": "chat", "key": "character.resources.ling.max", "value": 120}
]
\`\`\`

**修炼消耗时间:**
\`\`\`json
{"action": "add", "scope": "chat", "key": "character.cultivation.lifespan_current", "value": 0.1}
\`\`\`

**获得修炼感悟:**
\`\`\`json
{"action": "push", "scope": "chat", "key": "character.status.effects", "value": {
  "状态名称": "修炼感悟",
  "类型": "BUFF", 
  "时间": "七日",
  "状态描述": "近期修炼有所感悟，修炼效率提升20%",
  "强度": 7,
  "来源": "修炼顿悟"
}}
\`\`\`

### **🎭 社交场景**

**结识新NPC:**
\`\`\`json
{"action": "push", "scope": "chat", "key": "character.social.relationships", "value": {
  "NPC名字": "李师兄",
  "关系类型": "同门师兄",
  "好感度": 60,
  "关系描述": "青云宗的内门弟子，对你颇为照顾"
}}
\`\`\`

**获得声望:**
\`\`\`json
{"action": "add", "scope": "chat", "key": "character.social.reputation.青云宗", "value": 10}
\`\`\`

**加入宗门:**
\`\`\`json
[
  {"action": "set", "scope": "chat", "key": "character.social.faction", "value": "青云宗"},
  {"action": "set", "scope": "chat", "key": "character.social.position", "value": "外门弟子"},
  {"action": "set", "scope": "chat", "key": "character.identity.title", "value": "青云宗外门弟子"}
]
\`\`\`

### **🗺️ 探索场景**

**改变位置:**
\`\`\`json
[
  {"action": "set", "scope": "chat", "key": "character.status.location", "value": "青云宗后山"},
  {"action": "set", "scope": "chat", "key": "character.status.activity", "value": "探索"}
]
\`\`\`

**发现宝物:**
\`\`\`json
{"action": "push", "scope": "chat", "key": "character.equipment.treasures", "value": {
  "name": "青木护心镜",
  "type": "防具",
  "description": "以千年青木制成的护心镜，能抵御法术攻击",
  "quality": "玄",
  "grade": 5,
  "装备效果": {"防御": +15, "抗法": +10}
}}
\`\`\`

**遭遇危险:**
\`\`\`json
{"action": "push", "scope": "chat", "key": "character.status.conditions", "value": "轻伤"}
\`\`\`

### **🍃 日常场景**

**购买物品:**
\`\`\`json
[
  {"action": "add", "scope": "chat", "key": "character.resources.spirit_stones.下品", "value": -50},
  {"action": "push", "scope": "chat", "key": "character.equipment.consumables", "value": {
    "name": "回气丹",
    "type": "丹药", 
    "description": "恢复灵气的常用丹药",
    "quality": "黄",
    "grade": 2,
    "数量": 5
  }}
]
\`\`\`

**时间流逝:**
\`\`\`json
[
  {"action": "add", "scope": "chat", "key": "character.identity.age", "value": 1},
  {"action": "add", "scope": "chat", "key": "character.cultivation.lifespan_current", "value": 1}
]
\`\`\`

**状态效果到期:**
\`\`\`json
{"action": "pull", "scope": "chat", "key": "character.status.effects", "value": "药力未散"}
\`\`\`

---

## **⚠️ 重要操作原则**

### **🎲 数值平衡原则**

**气血消耗:**
- 轻伤: -10 到 -30
- 中伤: -40 到 -70  
- 重伤: -80 到 -120
- 濒死: -150 以上

**灵气消耗:**
- 基础法术: -20 到 -50
- 中级法术: -60 到 -100
- 高级法术: -120 到 -200

**修为进度:**
- 普通修炼: +5 到 +15
- 专注修炼: +20 到 +30
- 顿悟状态: +40 到 +60

### **🔄 状态效果管理**

**必须包含的字段:**
- 状态名称: 简短描述
- 类型: BUFF 或 DEBUFF
- 时间: 持续时间描述  
- 状态描述: 详细效果说明
- 强度: 1-10 的效果强度
- 来源: 状态来源说明

**常见状态类型:**
- BUFF: 增益效果（治疗、增强等）
- DEBUFF: 负面效果（中毒、虚弱等）

### **📦 物品管理规则**

**物品必须字段:**
- name: 物品名称
- type: 物品类型（武器/防具/消耗品等）
- description: 物品描述
- quality: 品质（凡/黄/玄/地/天/仙/神）
- grade: 品级（0-10）

**可选字段:**
- 数量: 消耗品数量
- 装备效果: 装备属性加成
- 特殊效果: 特殊能力描述

---

## **❌ 常见错误和避免方法**

### **数值错误:**
- ❌ 资源数值超过合理范围
- ✅ 根据境界设定合理数值上限

### **路径错误:**
- ❌ 使用不存在的数据路径
- ✅ 只使用已定义的标准路径

### **逻辑错误:**  
- ❌ 境界和资源不匹配
- ✅ 严格按照境界系统设定

### **时机错误:**
- ❌ 在不合适的时候更新数据
- ✅ 根据剧情发展适时更新

---

## **✅ 操作检查清单**

在发送指令前，请确认：

1. **数据路径正确** - 使用标准定义的路径
2. **数值合理** - 符合境界和逻辑限制
3. **时机恰当** - 在合适的剧情节点操作
4. **效果平衡** - 不会破坏游戏平衡
5. **描述完整** - 状态和物品信息完整

记住：**每个指令都会影响角色的游戏状态，请谨慎操作！**
`;

/**
 * 特定场景的操作模板
 */
export const SCENARIO_OPERATION_TEMPLATES = {
  // 战斗相关
  combat: {
    takeDamage: (damage: number) => ({
      action: "add",
      scope: "chat", 
      key: "character.resources.qi_blood.current",
      value: -damage
    }),
    
    useMana: (cost: number) => ({
      action: "add",
      scope: "chat",
      key: "character.resources.ling.current", 
      value: -cost
    }),
    
    addCombatBuff: (name: string, description: string, duration: string, intensity: number) => ({
      action: "push",
      scope: "chat",
      key: "character.status.effects",
      value: {
        "状态名称": name,
        "类型": "BUFF",
        "时间": duration,
        "状态描述": description,
        "强度": intensity,
        "来源": "战斗状态"
      }
    })
  },

  // 修炼相关  
  cultivation: {
    gainProgress: (progress: number) => ({
      action: "add",
      scope: "chat",
      key: "character.cultivation.realm_progress",
      value: progress
    }),
    
    breakthrough: (newRealm: string, newLevel: number, newLifespan: number, newManaMax: number) => [
      {
        action: "set",
        scope: "chat", 
        key: "character.cultivation.realm",
        value: newRealm
      },
      {
        action: "set",
        scope: "chat",
        key: "character.cultivation.realm_level", 
        value: newLevel
      },
      {
        action: "set",
        scope: "chat",
        key: "character.cultivation.lifespan_max",
        value: newLifespan
      },
      {
        action: "set",
        scope: "chat",
        key: "character.resources.ling.max",
        value: newManaMax
      }
    ]
  },

  // 物品相关
  items: {
    addItem: (item: any) => ({
      action: "push",
      scope: "chat",
      key: `character.equipment.${item.type === '消耗品' ? 'consumables' : 'treasures'}`,
      value: item
    }),
    
    removeItem: (itemName: string, itemType: string) => ({
      action: "pull", 
      scope: "chat",
      key: `character.equipment.${itemType}`,
      value: itemName
    })
  },

  // 社交相关
  social: {
    meetNPC: (npcName: string, relationship: string, favor: number, description: string) => ({
      action: "push",
      scope: "chat",
      key: "character.social.relationships",
      value: {
        [npcName]: {
          "关系类型": relationship,
          "好感度": favor,
          "关系描述": description
        }
      }
    }),
    
    gainReputation: (faction: string, amount: number) => ({
      action: "add",
      scope: "chat", 
      key: `character.social.reputation.${faction}`,
      value: amount
    })
  }
};