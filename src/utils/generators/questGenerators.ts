import { generateWithRawPrompt } from '@/utils/tavernCore';
import type { Quest, SaveData } from '@/types/game';

const QUEST_GENERATION_PROMPT = `
# 任务生成系统

## 当前状态
- 玩家姓名：{{玩家姓名}}
- 境界：{{当前境界}}
- 位置：{{当前位置}}
- 最近事件：{{最近记忆}}

## 生成规则
1. 任务必须符合当前境界和位置
2. 任务目标具体明确，可量化
3. 奖励与难度相匹配
4. 融入修仙世界观

## 任务类型说明
**传统RPG任务**:
- **主线**: 推动剧情的核心任务
- **支线**: 可选的额外任务
- **宗门**: 宗门内的任务
- **奇遇**: 偶然触发的机缘
- **日常**: 可重复的日常任务

**系统任务** (需启用配置):
- **系统任务**: 通用系统任务
- **道侣培养**: 与特定NPC的关系发展任务
- **修为提升**: 修炼突破类任务
- **收集资源**: 采集物品类任务
- **战斗挑战**: 战斗击杀类任务

## 输出格式
使用 tavern_commands 创建任务：

\`\`\`json
{
  "text": "任务触发的剧情描述（200-500字）",
  "tavern_commands": [
    {
      "action": "push",
      "key": "任务系统.当前任务列表",
      "value": {
        "任务ID": "quest_支线_1000_0315_001",
        "任务名称": "任务标题",
        "任务描述": "详细描述",
        "任务类型": "支线",
        "任务状态": "进行中",
        "目标列表": [
          {
            "描述": "击败3只黑风狼",
            "类型": "击杀",
            "目标ID": "monster_黑风狼",
            "需求数量": 3,
            "当前进度": 0,
            "已完成": false
          }
        ],
        "奖励": {
          "修为": 100,
          "灵石": { "下品": 50 },
          "物品": [
            { "物品ID": "item_healing_pill", "名称": "疗伤丹", "数量": 2 }
          ]
        },
        "发布者": "村长李大山",
        "AI生成": true,
        "创建时间": "{{当前游戏时间}}"
      }
    }
  ]
}
\`\`\`

## 目标类型说明
- **击杀**: 目标ID为怪物名称，如 "monster_黑风狼"
- **采集**: 目标ID为物品ID，如 "item_灵草"
- **对话**: 目标ID为NPC名称，如 "npc_张长老"
- **到达**: 目标ID为地点描述，如 "location_青云峰"
- **使用物品**: 目标ID为物品ID
`;

const QUEST_UPDATE_PROMPT = `
# 任务更新系统

## 当前任务
{{当前任务JSON}}

## 玩家行为
{{玩家最近行为}}

## 更新规则
1. 根据玩家行为更新任务进度
2. 判断是否触发任务演化
3. 检查是否完成所有目标

## 输出格式
\`\`\`json
{
  "text": "任务进度更新的描述",
  "tavern_commands": [
    {
      "action": "set",
      "key": "任务系统.当前任务列表.{{任务ID}}.目标列表.0.当前进度",
      "value": 1
    },
    {
      "action": "set",
      "key": "任务系统.当前任务列表.{{任务ID}}.目标列表.0.已完成",
      "value": false
    }
  ]
}
\`\`\`
`;

const QUEST_COMPLETE_PROMPT = `
# 任务完成系统

## 完成的任务
{{任务JSON}}

## 发放奖励
根据任务奖励配置，使用 tavern_commands 发放：

\`\`\`json
{
  "text": "任务完成的庆祝描述和奖励发放场景（200-300字）",
  "tavern_commands": [
    // 1. 设置任务状态和完成时间
    {
      "action": "set",
      "key": "任务系统.当前任务列表.0.任务状态",
      "value": "已完成"
    },
    {
      "action": "set",
      "key": "任务系统.当前任务列表.0.完成时间",
      "value": {{当前游戏时间}}
    },
    // 2. 发放奖励
    {
      "action": "add",
      "key": "玩家角色状态.境界.当前进度",
      "value": {{奖励修为}}
    },
    {
      "action": "add",
      "key": "背包.灵石.下品",
      "value": {{奖励灵石}}
    },
    {
      "action": "set",
      "key": "背包.物品.{{物品ID}}",
      "value": {{物品对象}}
    },
    // 3. 移动到已完成列表
    {
      "action": "push",
      "key": "任务系统.已完成任务",
      "value": {{完整Quest对象}}
    },
    // 4. 从当前列表移除
    {
      "action": "pull",
      "key": "任务系统.当前任务列表",
      "value": {"任务ID": "{{任务ID}}"}
    },
    // 5. 更新统计
    {
      "action": "add",
      "key": "任务系统.任务统计.完成总数",
      "value": 1
    },
    {
      "action": "add",
      "key": "任务系统.任务统计.{{任务类型}}完成",
      "value": 1
    }
  ]
}
\`\`\`

## 奖励类型说明
- **修为**: 增加 玩家角色状态.境界.当前进度
- **灵石**: 增加 背包.灵石.{品级}
- **物品**: 设置 背包.物品.{物品ID}
- **声望**: 增加 玩家角色状态.声望
- **属性加成**: 增加 角色基础信息.后天六司.{属性}
- **好感度**: 增加 人物关系.{NPC名称}.好感度
- **技能**: 需要通过剧情描述,系统会自动添加到掌握技能
`;

/**
 * 生成新任务
 */
export async function generateQuest(saveData: SaveData): Promise<Quest | null> {
  try {
    const context = {
      玩家姓名: saveData.角色基础信息.名字,
      当前境界: `${saveData.玩家角色状态.境界.名称}${saveData.玩家角色状态.境界.阶段}`,
      当前位置: saveData.玩家角色状态.位置.描述,
      最近记忆: saveData.记忆.短期记忆?.slice(-3).join('；') || '无',
    };

    // 读取任务系统配置
    const questConfig = saveData.任务系统?.配置;
    let prompt = QUEST_GENERATION_PROMPT
      .replace('{{玩家姓名}}', context.玩家姓名)
      .replace('{{当前境界}}', context.当前境界)
      .replace('{{当前位置}}', context.当前位置)
      .replace('{{最近记忆}}', context.最近记忆);

    // 如果有配置，添加系统任务类型说明
    if (questConfig) {
      const systemTypeHint = `\n\n## 系统任务风格\n当前系统类型：${questConfig.系统任务类型}\n请根据此风格生成相应的任务。`;
      prompt += systemTypeHint;

      // 如果有自定义提示词，追加到末尾
      if (questConfig.系统任务提示词) {
        prompt += `\n\n## 自定义要求\n${questConfig.系统任务提示词}`;
      }
    }

    const response = await generateWithRawPrompt('生成一个适合当前情况的任务', prompt, false);

    // 解析AI返回的JSON
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      throw new Error('AI响应格式错误');
    }

    const result = JSON.parse(jsonMatch[1]);

    // 从 tavern_commands 中提取任务数据
    const questCommand = result.tavern_commands?.find(
      (cmd: any) => cmd.action === 'push' && cmd.key === '任务系统.当前任务列表'
    );

    return questCommand?.value || null;
  } catch (error) {
    console.error('生成任务失败:', error);
    return null;
  }
}

/**
 * 更新任务进度
 */
export async function updateQuestProgress(
  quest: Quest,
  playerAction: string
): Promise<any> {
  try {
    const prompt = QUEST_UPDATE_PROMPT
      .replace('{{当前任务JSON}}', JSON.stringify(quest, null, 2))
      .replace('{{玩家最近行为}}', playerAction);

    const response = await generateWithRawPrompt('更新任务进度', prompt, false);
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[1]);
  } catch (error) {
    console.error('更新任务进度失败:', error);
    return null;
  }
}

/**
 * 完成任务并发放奖励
 */
export async function completeQuest(quest: Quest): Promise<any> {
  try {
    const prompt = QUEST_COMPLETE_PROMPT
      .replace('{{任务JSON}}', JSON.stringify(quest, null, 2))
      .replace('{{奖励修为}}', String(quest.奖励.修为 || 0))
      .replace('{{奖励灵石}}', String(quest.奖励.灵石?.下品 || 0));

    const response = await generateWithRawPrompt('完成任务', prompt, false);
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[1]);
  } catch (error) {
    console.error('完成任务失败:', error);
    return null;
  }
}