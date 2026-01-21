/**
 * @fileoverview SaveData数据结构定义
 *
 * 【职责】
 * - 定义精简版SaveData数据结构（AI实际接收的数据）
 * - 提供数据结构示例
 * - 说明字段类型和约束
 *
 * 【设计原则】
 * - 纯数据结构定义
 * - 不包含操作规则
 * - 作为数据字典使用
 *
 * 【精简版存档说明】
 * AI接收的是精简版存档，不包含以下字段：
 * - 元数据：只保留"时间"，移除版本号/存档ID/存档名/游戏版本/创建时间/更新时间/游戏时长秒
 * - 社交.记忆：只保留中期记忆和长期记忆，短期记忆通过inject单独发送，隐式中期记忆不发送
 * - 系统：整个域不发送（配置/设置/缓存/行动队列/历史/扩展/联机）
 */

const CHARACTER_STRUCTURE = `
## 1. 角色（V3：角色.*）

### 1.1 身份（Mostly Read-only，路径：\`角色.身份\`）
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
- 先天六司: {根骨, 灵性, 悟性, 气运, 魅力, 心性} (只读，1-10，对修炼/战斗加成占比70%)
- 后天六司: {根骨, 灵性, 悟性, 气运, 魅力, 心性} (可修改，每项上限20，单次增加1-3点，对加成占比30%)
  - 获取方式：装备增幅、天赋效果、服用丹药、机缘奇遇(最多+5)、大道感悟、境界突破
  - 等价原则：先天1点 ≈ 后天2.33点效果

### 1.2 属性（Modifiable，路径：\`角色.属性\`）
- 境界: {名称, 阶段, 当前进度, 下一级所需, 突破描述} (突破时必须更新突破描述)
- 声望: number
- 气血: {当前, 上限}
- 灵气: {当前, 上限}
- 神识: {当前, 上限}
- 寿命: {当前, 上限}

### 1.3 位置（路径：\`角色.位置\`）
- 位置: {描述:"大陆·地点", x, y, 灵气浓度}
  - 描述: string (必填，格式"大陆·区域·地点")
  - x: number (横坐标，范围 0-10000)
  - y: number (纵坐标，范围 0-10000)
  - 灵气浓度: number (必填，1-100，影响修炼速度)
    - 1-20: 灵气稀薄（凡间城镇、荒野）
    - 21-40: 灵气普通（普通修炼场所）
    - 41-60: 灵气充沛（宗门福地、灵脉附近）
    - 61-80: 灵气浓郁（秘境、洞府核心）
    - 81-100: 灵气极盛（仙迹、上古遗址）

### 1.4 效果（buff/debuff，数组；路径：\`角色.效果\`）
- 效果: [{状态名称, 类型:"buff"|"debuff", 生成时间, 持续时间分钟, 状态描述, 强度?, 来源?}]
  - 生成时间字段必填：使用当前 \`元数据.时间\` 的完整对象，格式：{年, 月, 日, 小时, 分钟}

### 1.5 装备（Equipment，路径：\`角色.装备\`）
- 装备1: string|null (装备ID或null)
- 装备2: string|null
- 装备3: string|null
- 装备4: string|null
- 装备5: string|null
- 装备6: string|null

### 1.6 法身（酒馆端；路径：\`角色.身体\`）
酒馆端用于展示/管理“法身（身体数据）”。
- **基础体格字段**：酒馆端始终允许/推荐生成（用于法身面板展示）。
- **敏感字段**：仅当 **系统.配置.nsfwMode=true** 时才允许/才生成（避免在关闭NSFW时输出不合规内容）。

- 身高?: number (cm)（基础体格）
- 体重?: number (kg)（基础体格）
- 体脂率?: number (%)（基础体格）
- 三围?: {胸围:number, 腰围:number, 臀围:number}（基础体格）
- 外观特征?: string[]（基础体格）
- 肤色?: string（基础体格）
- 发色?: string（基础体格）
- 瞳色?: string（基础体格）
- 纹身与印记?: string[]（基础体格）
- 穿刺?: string[]（基础体格）

- 胸部描述?: string（敏感；仅NSFW）
- 私处描述?: string（敏感；仅NSFW）
- 生殖器描述?: string（敏感；仅NSFW）
- 敏感点?: string[]（敏感；仅NSFW）
- 开发度?: {部位名称: number} (0-100)（敏感；仅NSFW）

- 部位?: object (预留)
- 部位开发?: object (预留；用于变量面板/扩展系统写入)

`

const DAO_STRUCTURE = `
## 2. 大道（Modifiable，路径：\`角色.大道\`）
- 大道列表: {道名: DaoData对象}

### DaoData对象必需字段
- 道名: string (如"剑道"、"丹道")
- 描述: string (大道描述)
- 阶段列表: DaoStage[] (大道的所有阶段定义，数组)
- 是否解锁: boolean (是否已解锁此道)
- 当前阶段: number (阶段索引，0为"入门")
- 当前经验: number (当前经验值)
- 总经验: number (总累计经验)

### DaoStage对象字段
- 名称: string (如"入门"、"小成"、"大成"等，必须提供有意义的名称，禁止使用"第1阶"、"第2阶"等)
- 描述: string (阶段描述)
- 突破经验: number (突破到此阶段所需的累计经验)

重要：阶段列表必须包含6-10个阶段，每个阶段必须有有意义的"名称"（如：入门→小成→大成→圆满→化境→返璞→归真→至臻），禁止使用"第1阶"、"第2阶"等数字命名。突破经验应递增。

`

const INVENTORY_STRUCTURE = `
## 3. 背包与物品 (Inventory & Items - Modifiable，路径：\`角色.背包\`)

### 3.1 背包 (Inventory)
- 货币?: {币种ID: CurrencyAsset}
- 货币设置?: {禁用币种: string[], 基准币种?: string}
- 灵石: {下品:number, 中品:number, 上品:number, 极品:number}（兼容旧存档；系统会从货币自动同步，不建议直接定价依赖）
- 物品: {物品ID: Item对象}

CurrencyAsset（币种结构体，建议字段）：
- 币种: string（建议与币种ID一致，如：灵石_下品 / 铜币 / 银两 / 金锭）
- 名称: string
- 数量: number
- 价值度: number（相对基准币种的价值，默认基准=下品灵石=1）
- 描述?: string
- 图标?: string（lucide 名称，如 Gem / Coins / HandCoins / BadgeDollarSign）

提示：地区差异/波动可记录在 \`世界.信息.经济.地区波动.<当前地点描述>.货币波动\`（系数建议 0.6~1.6）

### 3.2 物品通用字段（所有类型必需）
- 物品ID: string (格式: {类型}_时间戳_随机数，如 equip_1704067200000_abc123)
- 名称: string (物品名称)
- 类型: "装备"|"功法"|"丹药"|"材料"|"其他"
- 品质: {quality: "凡"|"黄"|"玄"|"地"|"天"|"仙"|"神", grade: 0-10}
- 数量: number (默认1)
- 描述: string (物品描述)

### 3.3 物品类型 (Item Types)

#### 3.3.1 装备物品
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

#### 3.3.2 功法物品
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
- 功法技能: array (必填，技能列表，不可为空；至少1个，且第1个技能熟练度要求=0)
  - 元素格式: {技能名称:string, 技能描述:string, 熟练度要求:number, 消耗?:string}
  - 消耗格式：只允许 灵气/神识/气血/寿元 四种资源，必须用百分比；寿元用时长描述如"寿元5年"
  - 可组合消耗：如"灵气20%+神识10%"、"气血30%+灵气15%"
  - 示例: [{"技能名称":"引气入体","技能描述":"引导天地灵气沿任脉入丹田，凝聚灵力护体","熟练度要求":0,"消耗":"灵气5%"},{"技能名称":"御剑诀","技能描述":"以神识驭剑，剑随心动，可攻敌于十丈之外","熟练度要求":30,"消耗":"灵气12%+神识8%"},{"技能名称":"剑意斩神","技能描述":"凝聚剑意外放，直攻敌人神魂，无视肉身防御","熟练度要求":70,"消耗":"神识30%"}]
- 修炼进度: number (必填，0-100，表示修炼百分比)
- 已解锁技能: array (必填，已解锁的技能名称列表，可以为空数组[])
  - 示例: ["基础剑气", "御剑术"]
- 已装备: boolean (必填，true=正在修炼，false=未修炼)

#### 3.3.3 消耗品与材料
完整结构: {物品ID:string, 名称:string, 类型:"丹药"|"材料"|"其他", 品质:{quality:"凡"|"黄"|"玄"|"地"|"天"|"仙"|"神", grade:0-10}, 数量:number, 描述:string, 使用效果?:string}

字段说明:
- 物品ID: string (必填，唯一标识，格式: item_时间戳_随机数)
- 名称: string (必填，物品名称)
- 类型: "丹药"|"材料"|"其他" (必填)
  - 丹药: 可直接使用的消耗品，如回复丹、增益丹等
  - 材料: 用于炼丹、炼器等的原材料
  - 其他: 任务物品、收藏品等杂项
- 品质: object (必填，同装备)
- 数量: number (必填，可叠加)
- 描述: string (必填，物品描述)
- 使用效果: string (可选，描述物品的使用效果；丹药类建议填写，材料类通常没有)
  - 示例: "恢复500点气血，并在1小时内提升气血恢复速度50%"

### 3.4 角色.修炼.修炼功法（当前修炼引用）
- 物品ID: string (指向背包中的功法ID)
- 名称: string

### 3.5 角色.技能.掌握技能（只读）
- [{技能名称, 技能描述, 来源, 消耗, 熟练度, 使用次数}]

`

const RELATIONS_STRUCTURE = `
## 4. 关系（NPC档案字典，可修改，路径：\`社交.关系\`）

### 4.1 NPC数据结构
- 名字: string (NPC唯一标识)
- 性别: "男"|"女"|"其他"
- 种族: string (默认"人族")
- 出生: string (出身背景)
- 年龄: number (系统自动计算得到；创建/更新时允许省略)
- 出生日期: {年: number, 月: number, 日: number}
  - 出生日期.年 必须 < 当前游戏时间.年（元数据.时间.年）
  - 计算公式：出生日期.年 = 当前游戏时间.年 - NPC年龄
  - 例如：当前时间是仙道1000年，NPC 25岁 → 出生日期.年 = 1000 - 25 = 975
  - 例如：当前时间是仙道1年，NPC 18岁 → 出生日期.年 = 1 - 18 = -17（负数是合法的）
- 外貌描述: string (外貌特征描述)
- 性格特征: string[] (性格标签数组)
- 境界: {名称: string, 阶段: string}
- 灵根: {名称: string, 品级: string}
- 天赋: [{名称: string, 描述: string}]
- 先天六司: {根骨: number, 灵性: number, 悟性: number, 气运: number, 魅力: number, 心性: number}
  - 取值范围：1-10（整数）
- 属性: {气血: {当前, 上限}, 灵气: {当前, 上限}, 神识: {当前, 上限}, 寿元上限: number}
- 与玩家关系: string (如"陌生人"/"朋友"/"师徒"/"道侣"/"仇敌")
- 好感度: number (-100~100)
- 人格底线: string[] (NPC绝不会做的事)
- 记忆: string[] (NPC对玩家的记忆)
- 记忆总结: string[] (记忆的总结)
- 当前位置: {描述: string, x?: number, y?: number}
- 势力归属: string (所属宗门/势力)
- 当前外貌状态: string (当前穿着、表情等)
- 当前内心想法: string (NPC此刻的想法)
- 背包: {灵石: {下品, 中品, 上品, 极品}, 物品: {}}
- 实时关注: boolean (若为true，即使NPC不在玩家身边，每回合也要推演并更新其动态：位置、状态、内心想法等)
- 私密信息?: PrivacyProfile (仅NSFW模式)

### 4.2 关系矩阵/关系网（可选，路径：社交.关系矩阵）
- edges: [{from,to,relation?,score?,tags?,updatedAt?}]

### 4.3 NSFW：PrivacyProfile（路径：社交.关系.{NPC名}.私密信息）
- 是否为处女: boolean
- 性格倾向/性取向/当前性状态/体液分泌状态: string
- 身体部位: [{部位名称, 敏感度:0-100, 开发度:0-100, 特征描述}]
- 性癖好/性伴侣名单/特殊体质: string[]
- 性渴望程度/性交总次数: number

### 4.4 NSFW：BodyPartDevelopment（身体部位开发条目）
- 部位名称: string (如：胸部/小穴/菊穴/嘴唇/耳朵等)
- 敏感度: number (0-100)
- 开发度: number (0-100；统一使用"开发度"字段名)
- 特殊印记?: string
- 特征描述: string

`

const MEMORY_STRUCTURE = `
## 5. 记忆 (Player Memory - Read-only)
- 短期记忆?: [string] (不在精简存档中，由系统/注入发送)
- 中期记忆: [string]
- 长期记忆: [string]

`

const WORLD_INFO_STRUCTURE = `
## 6. 世界（World - Modifiable；联机模式通常只读）
- 地图: {continents[], factions[], features[]}
- 大陆信息: [{名称, 描述, 地理特征, ...}] (只读，由世界生成器创建)

### 6.1 势力信息 (可修改)
路径: 世界.信息.势力信息[索引]
- id?: string|number (可选)
- 名称: string
- 类型: "修仙宗门"|"魔道宗门"|"修仙世家"|...
- 等级: "超级"|"一流"|"二流"|"三流"
- 位置: string | {x, y}
- 描述: string
- 特色: string[]
- 与玩家关系: "敌对"|"中立"|"友好"
- 声望值: number (-100~100)
- 可否加入: boolean
- 加入条件: string[]
- 加入好处: string[]
- 成员数量: { 总数, 按境界, 按职位 }
  - 总数: number
  - 按境界: { "练气": number, "筑基": number, ... }
  - 按职位: { "外门弟子": number, "内门弟子": number, ... }
- 领导层: { 宗主, 宗主修为, 副宗主?, 长老数量?, 最强修为?, 综合战力? }
  - 宗主: string
  - 宗主修为: string
  - 综合战力: number (1-100)
- 势力范围详情: { 控制区域, 影响范围, 战略价值 }
  - 控制区域: string[]
  - 影响范围: string
  - 战略价值: number (1-10)

### 6.2 地点信息 (可修改)
路径: 世界.信息.地点信息
- 名称: string
- 类型: string
- 位置: string
- coordinates: {x: number, y: number}
- 描述: string
- 安全等级?: string
- 开放状态?: string

`

const GAME_STATE_STRUCTURE = `
## 7. 时间与宗门

### 7.1 时间（路径：元数据.时间）
- 年: number (当前年份)
- 月: number (1-12)
- 日: number (1-31)
- 小时: number (0-23)
- 分钟: number (0-59)

### 7.2 宗门系统（路径：社交.宗门）
- 版本: number
- 当前宗门: string (宗门名称)
- 成员信息: {宗门名称, 宗门类型, 职位, 贡献, 关系, 声望, 加入日期, 描述}
- 宗门档案: {宗门名: WorldFaction对象}
- 宗门成员: {宗门名: string[]}
- 宗门藏经阁: {宗门名: 功法物品[]}
- 宗门贡献商店: {宗门名: 商品[]}
- 宗门任务: {宗门名: SectTaskItem[]}
- 宗门任务状态: {宗门名: {已初始化, 最后更新时间, 演变次数}}
- 宗门经营?: {宗门名: SectManagementState}
- 宗门战争?: SectWarSystem

### 7.3 宗门任务（SectTaskItem）
- 任务ID: string
- 任务名称: string
- 任务描述: string
- 任务类型: string (采集/狩猎/护送/探索/炼制等)
- 难度: string (简单/普通/困难/极难)
- 贡献奖励: number
- 额外奖励?: string
- 状态: string (可接取/进行中/已完成)
- 期限?: string
- 发布人?: string
- 要求?: string

### 7.4 宗门经营（SectManagementState，宗主面板）
- 宗门名称: string
- 战力?: number (0-100)
- 安定?: number (0-100)
- 外门训练度?: number (0-100，影响战力与战损)
- 府库?: {灵石, 灵材, 丹药?, 阵材?}
- 设施?: {练功房?, 藏经阁?, 炼丹房?, 护山大阵?} (各设施等级0-10)
- 最近结算?: string
- 月报?: [{时间, 摘要, 变化?}]

### 7.5 宗门战争（SectWarSystem）
- 当前?: SectWarState|null
- 历史?: SectWarState[]

SectWarState:
- 战争ID: string
- 状态: 备战|进行中|停战|胜利|失败
- 发起方: string
- 守方: string
- 阶段列表: [侦察, 交锋, 破阵, 攻山, 善后]
- 阶段索引: number (0-based)
- 当前阶段: string
- 我方: {宗门名称, 战力, 外门, 内门, 核心, 士气?}
- 敌方: {宗门名称, 战力, 外门, 内门, 核心, 士气?}
- 累计伤亡?: {我方?, 敌方?}
- 战报?: [{时间, 阶段, 摘要, 我方变化?, 敌方变化?}]
- 上一次?: object (上一步结算结果)

`

const EVENT_SYSTEM_STRUCTURE = `
## 8. 事件系统（路径：社交.事件）
- 配置: {启用随机事件, 最小间隔年, 最大间隔年, 事件提示词}
- 下次事件时间: GameTime|null
- 事件记录: [事件对象]

### 8.1 事件对象结构 (GameEvent)
- 事件ID: string（如 event_1704067200000_abc123）
- 事件名称: string
- 事件类型: string（如：宗门大战/世界变革/异宝降世/秘境现世/人物风波）
- 事件描述: string（包含地点、涉及势力/人物、直接后果）
- 影响等级?: "轻微"|"中等"|"重大"|"灾难"
- 影响范围?: string
- 相关人物?: string[]
- 相关势力?: string[]
- 事件来源: "随机"|"玩家影响"|"系统"
- 发生时间: {年, 月, 日, 小时, 分钟}

`

const SYSTEM_CONFIG_STRUCTURE = `
## 9. 系统.配置 (SystemConfig - Read-only)
- nsfwMode: boolean
- nsfwGenderFilter: "all"|"female"|"male"

`

export const SAVE_DATA_STRUCTURE = `
# 【数据结构定义】精简版SaveData结构

> **重要**：你收到的是精简版存档，结构如下：
> - 元数据：只有"时间"字段
> - 角色：完整（身份/属性/位置/效果/身体/背包/装备/功法/修炼/大道/技能）
> - 社交：关系/宗门/任务/事件 + 记忆（只有中期和长期，短期记忆单独发送）
> - 世界：完整
> - 系统：不发送（配置/缓存/历史等由系统管理）

${CHARACTER_STRUCTURE}
${DAO_STRUCTURE}
${INVENTORY_STRUCTURE}
${RELATIONS_STRUCTURE}
${MEMORY_STRUCTURE}
${WORLD_INFO_STRUCTURE}
${GAME_STATE_STRUCTURE}
${EVENT_SYSTEM_STRUCTURE}
${SYSTEM_CONFIG_STRUCTURE}
`.trim()

export const DATA_STRUCTURE_EXAMPLES = ``

export function stripNsfwContent(input: string): string {
  return input
    .split('\n')
    .filter((line) => !/nsfw|私密信息|身体部位开发|法身|角色\.身体|privacy/i.test(line))
    .join('\n')
    .trim();
}

export function getSaveDataStructureForEnv(isTavern: boolean): string {
  if (isTavern) return SAVE_DATA_STRUCTURE;
  return stripNsfwContent(SAVE_DATA_STRUCTURE);
}
