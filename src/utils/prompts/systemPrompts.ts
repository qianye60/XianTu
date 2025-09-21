/**
 * @fileoverview 全局系统提示词
 * 包含境界系统、物品品质系统等通用设定，供各个AI提示词模块复用
 */

import { generateQualitySystemPrompt } from '@/data/itemQuality';

/**
 * 境界系统说明提示词
 */
export const REALM_SYSTEM_PROMPT = `## **境界系统 (重要参考):**
根据此世界的修行体系，共有九大境界：
- **境界0 - 凡人**: 生老病死，约百载寿命，活动于凡尘浊世
- **境界1 - 炼气**: 引气入体洗涤凡躯，约120载寿命，可施展微末法术
- **境界2 - 筑基**: 灵气液化筑基，约250载寿命，可御器飞行，脱凡入道
- **境界3 - 金丹**: 灵液结丹法力自生，500-800载寿命，可开宗立派
- **境界4 - 元婴**: 丹碎婴生神魂寄托，1500-2000载寿命，元婴不灭
- **境界5 - 化神**: 神游太虚感悟法则，约5000载寿命，神识成域
- **境界6 - 炼虚**: 身融虚空掌握空间，万载以上寿命，撕裂空间
- **境界7 - 合体**: 法则归体身即是道，与世同君，道之显化
- **境界8 - 渡劫**: 超脱世界叩问天道，劫数不定，准备飞升`;

/**
 * 物品品质系统说明提示词
 */
export const ITEM_QUALITY_PROMPT = generateQualitySystemPrompt();

/**
 * 完整的世界设定系统提示词（境界+物品品质）
 */
export const WORLD_SYSTEM_PROMPT = `${REALM_SYSTEM_PROMPT}

${ITEM_QUALITY_PROMPT}`;

/**
 * 修仙世界通用设定说明
 */
export const CULTIVATION_WORLD_SETTING = `## **修仙世界通用设定:**

### **基础概念:**
- **气血**: 生命力的体现，影响身体强度和恢复能力
- **灵气**: 修炼的根本，用于施展法术和提升境界
- **神识**: 精神力的表现，影响感知范围和法术威力
- **修为**: 修炼进度，决定境界突破的条件

### **修炼资源:**
- **灵石**: 修炼货币，分下品、中品、上品、极品四等
- **丹药**: 辅助修炼的药物，可快速恢复或提升属性
- **装备**: 修炼者的武器装备，增强实力
- **功法**: 修炼的心法秘籍，决定修炼方向

### **世界构成:**
- **凡尘浊世**: 凡人生活的区域，灵气稀薄
- **元气清都**: 修炼者聚集地，灵气充裕
- **法则天域**: 高阶修士活动范围，蕴含天地法则
- **道之巅峰**: 至高境界，接近天道本源`;

/**
 * NPC系统完整说明
 */
export const NPC_SYSTEM_PROMPT = `## **NPC系统说明:**

### **NPC数据结构(NpcProfile类型):**
所有NPC必须严格遵循以下结构:
- **角色基础信息**: CharacterBaseInfo类型
  * 名字: string (必需)
  * 性别: string (必需)
  * 年龄?: number
  * 世界?: string
  * 天资?: string
  * 出生?: string | {名称,描述}
  * 灵根?: string | {名称,品质,描述}
  * 天赋?: string[] | {名称,描述}[]
  * 先天六司: {根骨,灵性,悟性,气运,魅力,心性}
  
- **外貌描述?**: string (10-20字简短特征)

- **角色存档信息**: 
  * 时间: ISO字符串
  * 装备: Record<string, string | null>
  * 功法: {主修功法: string|null, 已学技能: string[]}
  * 状态: StatusEffect[]
  * 境界: number (0-8对应凡人到渡劫)
  * 声望: number
  * 位置: {描述: string, 坐标: {X,Y}}
  * 气血/灵气/神识/寿命: 当前值和最大值
  * 背包: Inventory类型(同玩家)

- **AI行为**: 
  * 行为模式: string
  * 日常路线: [{时间,位置,行为}]

- **交互数据**:
  * 人物关系: string (描述与玩家关系)
  * 人物好感度: number (-100到100)
  * 人物记忆: string[] (格式:"[日期][地点]事件")
  * 最后互动时间: string | null

- **背包?** (可选，商人/重要NPC):
  * 物品: Record<string, Item>
  * Item格式与玩家完全一致

### **NPC交互系统:**
- **交易**: 双方背包物品交换
- **赠送**: 物品从一方转移到另一方
- **偷窃**: 成功后转移物品，影响好感度
- **对话**: 增加记忆，可能触发任务
- **战斗**: 影响关系，可能掉落物品

### **NPC生成原则:**
- 根据剧情自然生成，不强制数量
- 商人NPC必须有背包和物品
- 重要NPC应有详细的AI行为
- 记忆系统遵循统一格式

### **初始人脉生成指导:**
- **根据背景故事生成**: 仔细阅读角色的出身、经历、师承等背景文本，从中提取合理的人际关系
- **动态数量**: 人脉数量应根据背景的丰富程度自然决定，而非固定数值
- **关系类型示例**:
  * 散修背景: 可能有1-3个机缘相识的道友、曾经的恩人或仇人
  * 宗门弟子: 可能有师父、师兄弟、同门好友、竞争对手等3-6人
  * 世家子弟: 可能有家族成员、门客、世交好友、商业伙伴等4-8人
  * 特殊背景: 根据具体描述灵活生成，可能包括神秘导师、旧识故人等
- **好感度设定**: 根据关系性质合理设定初始好感度(-50到+80之间)
- **生成时机**: 在角色正式进入游戏世界时，基于完整的背景信息一次性生成所有初始人脉
- **避免重复**: 确保生成的人物各有特色，避免同质化`;

/**
 * 游戏数据结构完整说明
 */
export const GAME_DATA_STRUCTURE_PROMPT = `## **游戏数据结构说明:**

### **SaveData存档结构:**
- **玩家角色状态**: PlayerStatus类型
- **装备栏**: Equipment类型(装备1-6)
- **三千大道**: ThousandDaoSystem类型
- **背包**: Inventory类型
  * 灵石: {下品,中品,上品,极品}
  * 物品: Record<string, Item>
- **人物关系**: Record<string, NpcProfile>
- **宗门系统**: SectSystemData类型
- **记忆**: Memory类型
  * 短期记忆: string[] (格式:"[时辰][地点]事件")
  * 中期记忆: string[] (格式:"[日期]核心事件")
  * 长期记忆: string[] (重要事件)
- **游戏时间**: GameTime类型
- **修炼功法**: {功法,熟练度,已解锁技能,修炼时间,突破次数}

### **物品系统(Item类型):**
- **基础字段**: 物品ID,名称,类型,品质,数量,描述
- **类型枚举**: 装备|功法|其他
- **品质系统**: {quality:凡/黄/玄/地/天/仙/神, grade:0-10}
- **可选字段**: 装备增幅,装备特效,使用效果,功法效果,功法技能

### **状态效果(StatusEffect类型):**
- **必需字段**: 状态名称,类型(buff|debuff),时间,状态描述
- **可选字段**: 强度(1-10),来源,剩余时间
- **时间格式**: 具体值如"30分钟"|"1小时"|"3天"|"永久"`;

/**
 * 角色状态效果系统说明
 */
export const STATUS_EFFECT_SYSTEM = `## **状态效果系统:**

### **状态类型:**
- **BUFF**: 增益效果，提升角色能力
- **DEBUFF**: 减益效果，降低角色能力

### **状态强度:**
- **1-3**: 轻微影响
- **4-6**: 中等影响  
- **7-9**: 强烈影响
- **10**: 极致影响

### **常见状态:**
- **修炼类**: 入定、顿悟、走火入魔
- **战斗类**: 重伤、虚弱、亢奋
- **药物类**: 药力未散、中毒、滋补
- **环境类**: 灵气滋养、瘴气侵蚀`;

/**
 * 生成完整的AI系统提示词
 * @param includeRealmSystem 是否包含境界系统
 * @param includeItemQuality 是否包含物品品质系统
 * @param includeCultivationSetting 是否包含修仙世界设定
 * @param includeStatusEffect 是否包含状态效果系统
 */
export function generateSystemPrompt(options: {
  includeRealmSystem?: boolean;
  includeItemQuality?: boolean;
  includeCultivationSetting?: boolean;
  includeStatusEffect?: boolean;
  includeNPCSystem?: boolean;
  includeDataStructure?: boolean;
} = {}): string {
  const {
    includeRealmSystem = true,
    includeItemQuality = true,
    includeCultivationSetting = false,
    includeStatusEffect = false,
    includeNPCSystem = false,
    includeDataStructure = false
  } = options;

  let prompt = '';

  if (includeRealmSystem) {
    prompt += REALM_SYSTEM_PROMPT + '\n\n';
  }

  if (includeItemQuality) {
    prompt += ITEM_QUALITY_PROMPT + '\n\n';
  }

  if (includeCultivationSetting) {
    prompt += CULTIVATION_WORLD_SETTING + '\n\n';
  }

  if (includeStatusEffect) {
    prompt += STATUS_EFFECT_SYSTEM + '\n\n';
  }

  if (includeNPCSystem) {
    prompt += NPC_SYSTEM_PROMPT + '\n\n';
  }

  if (includeDataStructure) {
    prompt += GAME_DATA_STRUCTURE_PROMPT + '\n\n';
  }

  return prompt.trim();
}