/**
 * @file Shared AI Prompt Rules (共享提示词规则)
 * @description 核心规则集，跨文件复用，减少token重复
 */

/**
 * 数据同步铁律 (Data Sync Rules)
 */
export const CORE_SYNC_RULES = `
# 🔴 数据同步铁律 (Data Sync Rule | 最高优先级)

⚠️ text写什么 → commands执行什么 (违反=崩溃)

**检查清单**：
- 修炼? → 时间+进度+灵气+功法
- 突破? → 境界+阶段+进度+上限+寿命(add)
- 受伤? → 气血-
- 获得物品? → set背包(完整结构)
- 消耗物品? → add数量-1 或 delete
- NPC互动? → push记忆+好感±+状态+内心
- 位置移动? → 描述+经纬度

❌ text有变化但commands=[]
✅ 1个变化=1条命令`;

/**
 * 境界阶段命名 (Realm Stage Naming)
 */
export const REALM_STAGE_RULE = `
⚠️ 境界阶段 (Realm Stage)：
✅ 初期/中期/后期/圆满/极境
❌ 一层/二层/一重/第X层
凡人无阶段("")，炼气+用标准名`;

/**
 * JSON格式规则 (JSON Format Rules)
 */
export const JSON_RULES = `
## JSON规则
- 无注释(//, /**/)、无尾逗号
- 双引号、字段加引号、无前导0
- null代替undefined
- 小写true/false`;

/**
 * 六司系统 (Attribute System)
 */
export const INNATE_ATTRIBUTES_RULE = `
⚠️ 六司系统 (Attributes)：
- **先天六司** (Innate)：天生，永不可改
- **后天六司** (Acquired)：装备/大道，可变
- 最终 = 先天×100% + 后天×20%
- 修改：{"action":"add","key":"基础信息.后天六司.根骨","value":1}`;

/**
 * NSFW规则 (简化版)
 */
export const NSFW_RULE = `
🔥 NSFW规则：nsfwMode=true时必须生成私密信息，包含：是否处女/处男、身体部位(敏感度/开发度)、性格倾向、性取向、性癖、性渴望(0-100)、当前性状态、性交次数、性伴侣数量+名单(严禁占位符)`;

/**
 * 操作类型速查 (Action Types)
 */
export const ACTION_TYPES = `
## 操作类型 (Actions)
| Action | 用途 | 示例 |
|--------|------|------|
| set | 替换 | 境界、物品、NPC |
| add | 增减 | 灵石±、时间+ |
| push | 数组+ | 记忆、状态 |
| delete | 删除字段 | 物品(最后1个) |
| pull | 数组- | 删除任务(匹配对象) |`;