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
- **法宝**: 修炼者的武器装备，增强实力
- **功法**: 修炼的心法秘籍，决定修炼方向

### **世界构成:**
- **凡尘浊世**: 凡人生活的区域，灵气稀薄
- **元气清都**: 修炼者聚集地，灵气充裕
- **法则天域**: 高阶修士活动范围，蕴含天地法则
- **道之巅峰**: 至高境界，接近天道本源`;

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
} = {}): string {
  const {
    includeRealmSystem = true,
    includeItemQuality = true,
    includeCultivationSetting = false,
    includeStatusEffect = false
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

  return prompt.trim();
}