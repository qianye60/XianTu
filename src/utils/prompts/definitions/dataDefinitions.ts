/**
 * @fileoverview SaveData数据结构定义
 *
 * 【职责】
 * - 定义完整的SaveData数据结构
 * - 提供数据结构示例
 * - 说明字段类型和约束
 *
 * 【设计原则】
 * - 纯数据结构定义
 * - 不包含操作规则
 * - 作为数据字典使用
 */

const CHARACTER_STRUCTURE = `
## 1. 角色信息 (Character Information)

### 1.1 角色基础信息 (Base Info - Mostly Read-only)
- 名字: string (只读)
- 性别: "男"|"女"|"其他" (只读)
- 年龄: number (自动计算，禁改)
- 出生日期: {年, 月, 日, 小时?, 分钟?} (只读)
- 世界: string (只读)
- 种族: string (默认"人族")
- 天资: string (只读)
- 出生: string|{名称, 描述} (只读)
- 灵根: string|{名称, 品级, 描述, 属性[], 修炼加成} (只读)
- 天赋: [{名称, 描述}] (只读)
- 先天六司: {根骨, 灵性, 悟性, 气运, 魅力, 心性} (只读，1-10)
- 后天六司: {根骨, 灵性, 悟性, 气运, 魅力, 心性} (可修改，用add)

### 1.2 玩家角色状态 (Player Status - Modifiable)
- 境界: {名称, 阶段, 当前进度, 下一级所需, 突破描述} (用set更新整个对象，突破时必须更新突破描述)
- 声望: number (用add)
- 气血: {当前, 上限} (当前用add，上限突破时用add)
- 灵气: {当前, 上限} (当前用add，上限突破时用add)
- 神识: {当前, 上限} (当前用add，上限突破时用add)
- 寿命: {当前, 上限} (当前自动增加，上限突破时用add)
- 位置: {描述:"大陆·地点", x, y} (用set更新整个对象，三个字段必须同时设置)
  注意：x/y 使用游戏坐标系统（像素坐标）
  - x: 横坐标，范围 0-10000
  - y: 纵坐标，范围 0-10000
  - 具体范围由世界地图配置决定，参考"地图坐标系统"章节
- 状态效果: [{状态名称, 类型:"buff"|"debuff", 生成时间, 持续时间分钟, 状态描述, 强度?, 来源?}]
  重要规则：
  - 只能用push添加，禁止删除（系统会自动删除过期状态）
  - 类型字段必须严格区分：增益状态用"buff"，减益状态用"debuff"（全小写）
  - 生成时间：{年, 月, 日, 小时, 分钟}（使用当前游戏时间）
  - 持续时间分钟：数值类型，表示持续多少分钟（99999表示永久）
  示例-增益：{"状态名称":"灵气充盈","类型":"buff","生成时间":{...},"持续时间分钟":120,"状态描述":"灵气恢复速度提升50%","强度":5,"来源":"修炼"}
  示例-减益：{"状态名称":"内伤","类型":"debuff","生成时间":{...},"持续时间分钟":1440,"状态描述":"气血恢复速度降低30%","强度":3,"来源":"战斗受伤"}

### 1.3 装备栏 (Equipment - Read-only for AI)
- 装备1: string|null (装备ID或null)
- 装备2: string|null
- 装备3: string|null
- 装备4: string|null
- 装备5: string|null
- 装备6: string|null
`

const DAO_STRUCTURE = `
## 2. 三千大道 (Three Thousand Daos - Modifiable)
- 大道列表: {道名: DaoData对象}
  - 道名: string
  - 描述: string
  - 阶段列表: [{名称, 描述, 突破经验}]
  - 是否解锁: boolean (解锁大道时必须设为true)
  - 当前阶段: number (阶段索引，0为入门)
  - 当前经验: number (用add增加经验)
  - 总经验: number
  重要：操作大道时使用路径: 三千大道.大道列表.{道名}.字段名
  示例-解锁并初始化大道: set|三千大道.大道列表.剑道|{道名:"剑道",描述:"...",是否解锁:true,当前阶段:0,当前经验:0,总经验:0,阶段列表:[...]}
  示例-增加经验: add|三千大道.大道列表.剑道.当前经验|100
`

const INVENTORY_STRUCTURE = `
## 3. 背包与物品 (Inventory & Items - Modifiable)

### 3.1 背包 (Inventory)
- 灵石: {下品:number, 中品:number, 上品:number, 极品:number} (用add增减)
- 物品: {物品ID: Item对象} (用set添加物品，用add修改数量，用delete删除)

### 3.2 物品类型 (Item Types)

#### 3.2.1 装备物品
完整结构: {物品ID:string, 名称:string, 类型:"装备", 品质:{quality:"凡"|"黄"|"玄"|"地"|"天"|"仙"|"神", grade:0-10}, 数量:number, 描述:string, 装备增幅?:object, 特殊效果?:string, 已装备:boolean}

字段说明:
- 物品ID: string (必填，唯一标识，格式: equip_时间戳_随机数)
- 名称: string (必填，装备名称)
- 类型: "装备" (必填，固定值)
- 品质: object (必填)
  - quality: "凡"|"黄"|"玄"|"地"|"天"|"仙"|"神" (品质等级)
  - grade: number (品级，0-10，0=残缺，1-3=下品，4-6=中品，7-9=上品，10=极品)
- 数量: number (必填，通常为1，装备不可叠加)
- 描述: string (必填，装备描述)
- 装备增幅: object (可选，属性加成对象)
  - 格式: {"后天六司": {"根骨": 2, "灵性": 1}, "气血上限": 50, "灵气上限": 30}
  - 后天六司: object (可选，六司加成)
  - 气血上限: number (可选)
  - 灵气上限: number (可选)
  - 神识上限: number (可选)
- 特殊效果: string (可选，描述装备的特殊能力)
  - 示例: "攻击时有10%几率触发火焰伤害"
- 已装备: boolean (必填，true=已装备，false=未装备)

#### 3.2.2 功法物品
完整结构: {物品ID:string, 名称:string, 类型:"功法", 品质:{quality:"凡"|"黄"|"玄"|"地"|"天"|"仙"|"神", grade:0-10}, 数量:number, 描述:string, 功法效果:string, 功法技能:array, 修炼进度:number, 已解锁技能:array, 已装备:boolean}

字段说明:
- 物品ID: string (必填，唯一标识，格式: gongfa_时间戳_随机数)
- 名称: string (必填，功法名称)
- 类型: "功法" (必填，固定值)
- 品质: object (必填，同装备)
- 数量: number (必填，通常为1，功法不可叠加)
- 描述: string (必填，功法描述)
- 功法效果: string (必填，描述功法的效果)
  - 示例: "修炼速度提升300%，对魅惑类术法完全免疫，并能反向掌控施术者心神"
- 功法技能: array (必填，技能列表，可以为空数组[])
  - 元素格式: {技能名称:string, 技能描述:string, 熟练度要求:number, 消耗?:string}
  - 示例: [{"技能名称":"基础剑气","技能描述":"凝聚灵力形成剑气攻击","熟练度要求":0,"消耗":"灵气10点"},{"技能名称":"御剑术","技能描述":"御使飞剑攻敌","熟练度要求":30,"消耗":"灵气50点"}]
- 修炼进度: number (必填，0-100，表示修炼百分比)
- 已解锁技能: array (必填，已解锁的技能名称列表，可以为空数组[])
  - 示例: ["基础剑气", "御剑术"]
- 已装备: boolean (必填，true=正在修炼，false=未修炼)

重要: 修炼进度和已解锁技能存储在背包物品中，用add/set修改
示例: add|背包.物品.gongfa_001.修炼进度|10

#### 3.2.3 丹药物品
完整结构: {物品ID:string, 名称:string, 类型:"丹药", 品质:{quality:"凡"|"黄"|"玄"|"地"|"天"|"仙"|"神", grade:0-10}, 数量:number, 描述:string, 使用效果:string}

字段说明:
- 物品ID: string (必填，唯一标识，格式: pill_时间戳_随机数)
- 名称: string (必填，丹药名称)
- 类型: "丹药" (必填，固定值)
- 品质: object (必填，同装备)
- 数量: number (必填，可叠加)
- 描述: string (必填，丹药描述)
- 使用效果: string (必填，描述丹药的使用效果)
  - 示例: "恢复500点气血，并在1小时内提升气血恢复速度50%"

#### 3.2.4 其他物品
完整结构: {物品ID:string, 名称:string, 类型:"材料"|"其他", 品质:{quality:"凡"|"黄"|"玄"|"地"|"天"|"仙"|"神", grade:0-10}, 数量:number, 描述:string, 使用效果?:string}

字段说明:
- 物品ID: string (必填，唯一标识，格式: item_时间戳_随机数)
- 名称: string (必填，物品名称)
- 类型: "材料"|"其他" (必填)
- 品质: object (必填，同装备)
- 数量: number (必填，可叠加)
- 描述: string (必填，物品描述)
- 使用效果: string (可选，描述物品的使用效果，材料类通常没有)
  - 示例: "使用后获得100点修为"

### 3.3 修炼功法 (Active Cultivation Technique - Read-only Reference)
**【严禁修改】此字段只存储引用，不存储任何数据！**
- 物品ID: string (指向背包中的功法ID)
- 名称: string

**【关键规则】修炼功法的位置和修改方式：**
- [错误] 错误：修改"修炼功法"字段
- [正确] 正确：修改"背包.物品.{功法ID}"字段
- 修炼进度存储位置：背包.物品.{功法ID}.修炼进度
- 已解锁技能存储位置：背包.物品.{功法ID}.已解锁技能
- 功法技能列表存储位置：背包.物品.{功法ID}.功法技能

示例操作：
- 增加修炼进度: add|背包.物品.gongfa_001.修炼进度|10
- 解锁新技能: push|背包.物品.gongfa_001.已解锁技能|御剑术

### 3.4 掌握技能 (Mastered Skills - Auto-calculated, READ-ONLY)
**【完全只读】此字段由系统自动计算，AI严禁通过tavern_commands修改！**
- [{技能名称, 技能描述, 来源, 消耗, 熟练度, 使用次数}]

**【关键规则】掌握技能的位置和来源：**
- [错误] 错误：直接set/push"掌握技能"数组
- [错误] 错误：修改"掌握技能"中的技能名称、描述、来源、消耗
- [正确] 正确：只能通过add增加熟练度：add|掌握技能.御剑术.熟练度|10
- [正确] 正确：只能通过add增加使用次数：add|掌握技能.御剑术.使用次数|1

**【数据来源】掌握技能从哪里来：**
- 系统自动从"背包.物品.{功法ID}.已解锁技能"中提取
- 当功法装备后，已解锁的技能会自动出现在"掌握技能"中
- 技能的基础信息（名称、描述、消耗）来自"背包.物品.{功法ID}.功法技能"数组
`

const RELATIONS_STRUCTURE = `
## 4. 人物关系 (Relationships - Modifiable)

### 🚨 【最高优先级】NPC 创建规则 🚨
**新增 NPC 必须一次性创建完整对象，不能分步添加！**

- **[正确]** 使用 set 操作创建完整的 NPC 对象，包含所有必需字段
- **[错误]** 先创建空对象，再逐个添加字段
- **[错误]** 只添加部分字段，缺少必需字段

**示例 - 正确做法：**
\`\`\`
<commands>
set|人物关系.张三|{"名字":"张三","性别":"男","年龄":25,"出生日期":{"年":975,"月":3,"日":15},"种族":"人族","出生":"散修","外貌描述":"...","性格特征":["..."],"境界":{"名称":"筑基","阶段":"初期"},"灵根":{"名称":"火灵根","品级":"中品"},"天赋":[],"先天六司":{"根骨":5,"灵性":6,"悟性":5,"气运":4,"魅力":5,"心性":6},"与玩家关系":"陌生人","好感度":0,"人格底线":["..."],"记忆":[],"记忆总结":[],"当前位置":{"描述":"...","x":5000,"y":5000},"势力归属":"无","当前外貌状态":"...","当前内心想法":"...","背包":{"灵石":{"下品":0,"中品":0,"上品":0,"极品":0},"物品":{}},"实时关注":false}
</commands>
\`\`\`

**示例 - 错误做法（严禁）：**
\`\`\`
❌ 错误：先创建空对象
set|人物关系.张三|{}
❌ 错误：再添加字段
set|人物关系.张三.名字|张三
\`\`\`

---

### NPC 数据结构
- {NPC名字: NPC档案对象}
  - 名字: string
  - 性别: "男"|"女"|"其他"
  - 年龄: number (自动计算)
  - 出生日期: {年, 月, 日}
  - 种族: string
  - 出生: string
  - 外貌描述: string
  - 性格特征: [string]
  - 境界: {名称, 阶段, 当前进度?, 下一级所需?, 突破描述?} (用set更新整个对象)
  - 灵根: {名称, 品级}
  - 天赋: [{名称, 描述}]
  - 先天六司: {根骨, 灵性, 悟性, 气运, 魅力, 心性}
  - 与玩家关系: string
  - 好感度: number (-100~100，用add)
  - 人格底线: [string]
  - 记忆: [string] (用push添加。遵循【记忆生成铁律】：简洁、不重复、结构化摘要)
  - 记忆总结: [string]
  - 当前位置: {描述, x, y}
  - 势力归属: string
  - 当前外貌状态: string (用set实时更新)
  - 当前内心想法: string (用set实时更新)
  - 背包: {灵石, 物品}
  - 实时关注: boolean
`

const MEMORY_STRUCTURE = `
## 5. 记忆 (Player Memory - Read-only, DO NOT MODIFY)
**核心规则**: AI严禁通过 \`tavern_commands\` 修改任何记忆字段。记忆由系统根据响应JSON中的 \`mid_term_memory\` 字段自动处理。

**数据结构 (仅供参考)**:
- 短期记忆: [string]
- 中期记忆: [string]
- 长期记忆: [string]
`

const WORLD_INFO_STRUCTURE = `
## 6. 世界信息 (World Information - Modifiable)
- 地图: {continents[], factions[], features[]}
- 大陆信息: [{名称, 描述, 地理特征, ...}] (只读,由世界生成器创建)
- 势力信息: [{...}] (可修改,世界中的宗门、世家等)
  - id: string|number (可选)
  - 名称: string
  - 类型: "修仙宗门"|"魔道宗门"|"修仙世家"|...
  - 等级: "超级"|"一流"|"二流"|"三流"
  - 位置: string | {x, y}
  - 描述: string
  - 特色: [string]
  - 与玩家关系: "敌对"|"中立"|"友好" (用set修改)
  - 声望值: number (用add修改)
  - 可否加入: boolean
  - 加入条件: [string]
  - 加入好处: [string]
  - 成员数量: { 总数, 按境界, 按职位 } (用set修改整个对象)
    - 总数: number
    - 按境界: { "练气": number, "筑基": number, ... }
    - 按职位: { "外门弟子": number, "内门弟子": number, ... }
  - 领导层: { 宗主, 宗主修为, 副宗主?, 长老数量?, 最强修为, 综合战力? } (用set修改)
    - 宗主: string (可能因为剧情更换)
    - 宗主修为: string (例如: "元婴后期",可能突破)
    - 综合战力: number (1-100)
  - 势力范围详情: { 控制区域, 影响范围, 战略价值 } (用set修改)
    - 控制区域: [string]
    - 影响范围: string
    - 战略价值: number (1-10)
  
  重要：修改势力信息时使用路径: 世界信息.势力信息[索引].字段名
  示例-修改宗主: set|世界信息.势力信息[0].领导层.宗主|新宗主名字
  示例-增加声望: add|世界信息.势力信息[2].声望值|50
  示例-改变关系: set|世界信息.势力信息[1].与玩家关系|友好
  示例-更新成员: set|世界信息.势力信息[0].成员数量|{"总数":500,"按境界":{"练气":300,"筑基":150},"按职位":{"外门弟子":400,"内门弟子":100}}
  
- 地点信息: [{名称, 类型, 位置, coordinates, ...}] (可修改,用于添加新发现的地点)
  重要：添加新地点使用push操作
  示例-添加地点: push|世界信息.地点信息|{"名称":"xx秘境","类型":"秘境","位置":"东玄大陆·北部","coordinates":{"x":7500,"y":3000},"描述":"...","安全等级":"危险","开放状态":"未发现"}
`

const GAME_STATE_STRUCTURE = `
## 7. 游戏状态 (Game State - Modifiable)

### 7.1 游戏时间 (Game Time)
- 年: number
- 月: number (1-12)
- 日: number (1-30)
- 小时: number (0-23)
- 分钟: number (0-59) (用add推进，自动进位)

### 7.2 宗门信息 (Sect Information)
- 宗门名称: string
- 宗门类型: "正道宗门"|"魔道宗门"|...
- 职位: "外门弟子"|"内门弟子"|...
- 贡献: number (用add)
- 关系: "中立"|"友好"|...
- 声望: number (用add)
- 加入日期: string
- 描述?: string
- 师父?: string
- 同门关系?: [string]
- 宗门职务?: [string]
`

const QUEST_SYSTEM_STRUCTURE = `
## 8. 任务系统 (Quest System - Modifiable)
- 配置: {启用系统任务, 系统任务类型, 自动刷新, 默认任务数量}
- 当前任务列表: [任务对象] (包含所有任务，用push添加新任务。任务是否完成由其内部的'任务状态'字段决定)
- 任务统计: {完成总数, 各类型完成: Record<任务类型, number>}

### 8.1 任务对象结构 (Quest Object)
- 任务ID: string (唯一ID, 格式: quest_类型_时间戳)
- 任务名称: string
- 任务描述: string
- 任务类型: "宗门"|"奇遇"|"日常"|"系统任务"|"道侣培养"|"修为提升"|"收集资源"|"战斗挑战" (无主次之分)
- 任务状态: "进行中"|"已完成"|"已失败"
- 目标列表: [目标对象]
  - 描述: string (例: "击败3只黑风狼")
  - 类型: "击杀"|"采集"|"对话"|"到达"|"使用物品"
  - 目标ID: string (例: "monster_黑风狼", "item_灵草")
  - 需求数量: number
  - 当前进度: number (用add更新)
  - 已完成: boolean
- 奖励: {奖励对象}
  - 修为?: number
  - 灵石?: {下品?, 中品?, 上品?, 极品?}
  - 物品?: [{物品ID, 名称, 数量}]
  - 声望?: {势力名称, 变化值}
  - 属性加成?: {后天六司}
  - 好感度?: {NPC名称, 变化值}
- 发布者?: string (NPC名称或"系统")
- 创建时间: {游戏时间对象} or string
- 完成时间?: {游戏时间对象} or string
- AI生成: boolean (通常为true)
`

const SYSTEM_CONFIG_STRUCTURE = `
## 9. 系统配置 (System Config - Read-only)
- nsfwMode: boolean
- nsfwGenderFilter: "all"|"female"|"male"
`

export const SAVE_DATA_STRUCTURE = `
# 【数据结构定义】完整SaveData结构
${CHARACTER_STRUCTURE}
${DAO_STRUCTURE}
${INVENTORY_STRUCTURE}
${RELATIONS_STRUCTURE}
${MEMORY_STRUCTURE}
${WORLD_INFO_STRUCTURE}
${GAME_STATE_STRUCTURE}
${QUEST_SYSTEM_STRUCTURE}
${SYSTEM_CONFIG_STRUCTURE}
`.trim()

export const DATA_STRUCTURE_EXAMPLES = ``

export function stripNsfwContent(input: string): string {
  return input
    .split('\n')
    .filter((line) => !/nsfw|私密信息|身体部位开发|privacy/i.test(line))
    .join('\n')
    .trim();
}

export function getSaveDataStructureForEnv(isTavern: boolean): string {
  if (isTavern) return SAVE_DATA_STRUCTURE;
  return stripNsfwContent(SAVE_DATA_STRUCTURE);
}
