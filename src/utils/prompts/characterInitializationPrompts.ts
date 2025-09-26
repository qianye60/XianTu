/**
 * @fileoverview 角色初始化AI提示词
 * 包含三千大道系统的初始化指导
 */

import { 
  COMMON_DAO_RULES, 
  COMMON_NPC_RULES, 
  COMMON_ITEM_RULES, 
  CHARACTER_INITIALIZATION_RULES,
  COMMON_CHARACTER_PROTECTION
} from './commonPromptRules';
import { THOUSAND_DAO_INITIALIZATION_PROMPT } from './thousandDaoPrompts';

export const CHARACTER_INITIALIZATION_PROMPT = `
# 角色初始化完成 - 游戏开始指导

## 三千大道系统初始化
${THOUSAND_DAO_INITIALIZATION_PROMPT}

## 初始化后的AI响应指导

当角色创建完成并进入游戏世界时，你应该：

1. **欢迎玩家进入修仙世界**
   描述角色当前所在的环境、身份和状态

2. **根据角色背景生成初始人脉**
   - 仔细阅读角色的出身、经历、师承、家族等完整背景信息
   - 从背景文本中提取合理的人际关系，动态生成相应数量的初始NPC
   - 每个NPC都应该有完整的角色信息和与主角的具体关系描述
   - 设定合理的初始好感度，体现不同关系的亲疏远近
   - **使用GM指令创建人物关系**：
     使用tavern_commands格式：action为"set"，key为"人物关系.人物标识"，value为完整的NpcProfile对象
     包含：角色基础信息、外貌描述、角色存档信息、NPC行为、人物关系、人物好感度、人物记忆等字段

3. **AI动态生成起始物品**
   - 根据角色的出生背景、家境、年龄合理分配起始物品
   - **使用GM指令添加物品**：
     使用tavern_commands格式：action为"set"，key为"背包.物品.物品ID"，value为完整的Item对象
     包含：物品ID、物品名称、物品类型、稀有度、物品描述、物品数量、使用效果、装备增幅、功法效果、功法技能等字段

4. **根据角色背景适当解锁起始大道**
   例如：
   - 出身炼丹世家 → 解锁"丹道"
   - 师承剑修门派 → 解锁"剑道"  
   - 天赋异禀 → 解锁特殊大道
   - 普通出身 → 暂不解锁，等待机缘

5. **设置初始游戏目标**
   根据世界背景和角色设定，给出合适的短期目标

## 大道解锁的时机建议

### 剧情驱动解锁
- 遇到师父、前辈传授时
- 获得功法秘籍时
- 特殊环境感悟时
- 完成重要任务后

### 机缘偶得解锁
- 意外发现古迹遗址
- 救助他人获得传承
- 天材地宝引发感悟
- 生死关头顿悟新道

记住：每条大道的解锁都应该有合理的剧情依据，让玩家感受到成长的喜悦和探索的乐趣。

${CHARACTER_INITIALIZATION_RULES}

${COMMON_NPC_RULES}

${COMMON_ITEM_RULES}

${COMMON_DAO_RULES}
`;

export const GAME_START_INITIALIZATION_PROMPT = `
# 游戏开始 - 系统初始化完成

${COMMON_CHARACTER_PROTECTION}

## 系统状态
角色数据已全部载入，三千大道系统已初始化为空白状态。现在开始你的修仙之旅！

详细规则请参考 commonPromptRules.ts 中的通用规则。

## 技术要求
记住使用酒馆变量系统来管理所有的大道数据和人物关系数据！
严格保持用户选择的基础信息不变！
`;