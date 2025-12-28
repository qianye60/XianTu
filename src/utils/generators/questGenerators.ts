import { generateWithRawPrompt } from '@/utils/tavernCore';
import type { Quest, SaveData, QuestType } from '@/types/game';

const QUEST_GENERATION_PROMPT = `
# 任务生成系统

## 当前状态
- 玩家姓名：{{玩家姓名}}
- 境界：{{当前境界}}
- 位置：{{当前位置}}

## 核心原则
🎲 **任务完全随机生成，不依赖当前剧情**
- 任务内容与最近发生的事件无关
- 每次生成都是独立的随机事件
- 不要延续之前的故事线
- 可以是突发事件、偶遇、系统触发等

## 生成规则
1. **随机性优先**：任务内容随机生成，不受剧情限制
2. **境界适配**：任务难度和目标数量要符合当前境界
3. **奖励诱惑力**：奖励必须对当前境界有吸引力，不能太少
4. **目标明确**：任务目标具体可量化
5. **世界观融合**：符合修仙世界观

## 任务类型说明
**可用任务类型**（无主次之分，完全随机）:
- **宗门**: 宗门内的任务
- **奇遇**: 偶然触发的机缘
- **日常**: 可重复的日常任务
- **系统任务**: 通用系统任务
- **道侣培养**: 与特定NPC的关系发展任务
- **修为提升**: 修炼突破类任务
- **收集资源**: 采集物品类任务
- **战斗挑战**: 战斗击杀类任务

⚠️ **注意**：本游戏没有主线支线之分，所有任务类型平等，一切由玩家自由探索

## 奖励标准（根据境界）
**🔥 重要：奖励必须有诱惑力，不能太少！**

### 修为奖励参考（单个任务）
- **练气初期**：200-500 修为
- **练气中期**：500-1200 修为
- **练气后期**：1200-2500 修为
- **练气圆满**：2500-5000 修为
- **筑基初期**：5000-10000 修为
- **筑基中期**：10000-20000 修为
- **筑基后期**：20000-40000 修为
- **更高境界**：按倍数递增

### 灵石奖励参考
- **练气期**：下品灵石 50-200
- **筑基期**：下品灵石 200-500，或中品灵石 10-50
- **金丹期**：中品灵石 50-200，或上品灵石 5-20

### 物品奖励
- 根据境界给予相应品质的丹药、法器、材料
- 练气期：凡品、黄品物品
- 筑基期：黄品、玄品物品
- 金丹期：玄品、地品物品

⚠️ **奖励底线**：奖励不能低于当前境界的最低标准，否则玩家没有动力完成任务

## 输出格式
使用标签格式创建任务：

<narrative>
任务触发的剧情描述（200-500字）
</narrative>

<memory>
简短的任务触发摘要
</memory>

<commands>
push|任务系统.当前任务列表|{"任务ID":"quest_支线_1000_0315_001","任务名称":"任务标题","任务描述":"详细描述","任务类型":"宗门","任务状态":"进行中","目标列表":[{"描述":"击败3只黑风狼","类型":"击杀","目标ID":"monster_黑风狼","需求数量":3,"当前进度":0,"已完成":false}],"奖励":{"修为":100,"灵石":{"下品":50},"物品":[{"物品ID":"item_healing_pill","名称":"疗伤丹","数量":2}]},"发布者":"村长李大山","AI生成":true,"创建时间":"{{当前游戏时间}}"}
</commands>

<options>
立即前往执行任务
先做准备再出发
询问更多任务细节
暂时搁置此任务
查看其他任务
</options>

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

<narrative>
任务进度更新的描述
</narrative>

<memory>
任务进度变化摘要
</memory>

<commands>
set|任务系统.当前任务列表.{{任务ID}}.目标列表.0.当前进度|1
set|任务系统.当前任务列表.{{任务ID}}.目标列表.0.已完成|false
</commands>

<options>
继续执行任务
暂时休息调整
查看任务详情
放弃当前任务
寻求帮助
</options>
`;

const QUEST_COMPLETE_PROMPT = `
# 任务完成系统

## 完成的任务
{{任务JSON}}

## 发放奖励
根据任务奖励配置发放奖励

## 输出格式

<narrative>
任务完成的庆祝描述和奖励发放场景（200-300字）
</narrative>

<memory>
任务完成摘要和获得的奖励
</memory>

<commands>
set|任务系统.当前任务列表.0.任务状态|已完成
set|任务系统.当前任务列表.0.完成时间|{{当前游戏时间}}
add|玩家角色状态.境界.当前进度|{{奖励修为}}
add|背包.灵石.下品|{{奖励灵石}}
add|任务系统.任务统计.完成总数|1
</commands>

<options>
查看新的可接任务
继续探索当前区域
返回休息调整状态
与任务发布者交谈
整理获得的奖励
</options>

## 奖励类型说明
- **修为**: add|玩家角色状态.境界.当前进度|数值
- **灵石**: add|背包.灵石.品级|数值
- **物品**: set|背包.物品.物品ID|{物品对象}
- **声望**: add|玩家角色状态.声望|数值
- **好感度**: add|人物关系.NPC名称.好感度|数值
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
    };

    // 读取任务系统配置
    const questConfig = saveData.任务系统?.配置;
    let prompt = QUEST_GENERATION_PROMPT
      .replace('{{玩家姓名}}', context.玩家姓名)
      .replace('{{当前境界}}', context.当前境界)
      .replace('{{当前位置}}', context.当前位置);

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

    // 尝试解析标签格式
    const commandsMatch = response.match(/<commands>([\s\S]*?)<\/commands>/i);
    if (commandsMatch) {
      const commandLines = commandsMatch[1].trim().split('\n');
      for (const line of commandLines) {
        const parts = line.trim().split('|');
        if (parts.length >= 3 && parts[0].toLowerCase() === 'push' && parts[1] === '任务系统.当前任务列表') {
          try {
            return JSON.parse(parts.slice(2).join('|'));
          } catch {
            console.warn('解析任务JSON失败:', parts.slice(2).join('|'));
          }
        }
      }
    }

    // 兼容旧的JSON格式
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[1]);
        const questCommand = result.tavern_commands?.find(
          (cmd: any) => cmd.action === 'push' && cmd.key === '任务系统.当前任务列表'
        );
        return questCommand?.value || null;
      } catch {
        console.warn('解析JSON失败');
      }
    }

    return null;
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

    // 尝试解析标签格式
    const commandsMatch = response.match(/<commands>([\s\S]*?)<\/commands>/i);
    if (commandsMatch) {
      const commands: any[] = [];
      const commandLines = commandsMatch[1].trim().split('\n');
      for (const line of commandLines) {
        const parts = line.trim().split('|');
        if (parts.length >= 2) {
          let value: any = parts.slice(2).join('|').trim();
          if (value.startsWith('{') || value.startsWith('[')) {
            try { value = JSON.parse(value); } catch {}
          } else if (!isNaN(Number(value))) {
            value = Number(value);
          } else if (value === 'true') value = true;
          else if (value === 'false') value = false;
          commands.push({ action: parts[0].trim(), key: parts[1].trim(), value });
        }
      }
      const narrativeMatch = response.match(/<narrative>([\s\S]*?)<\/narrative>/i);
      return { text: narrativeMatch?.[1]?.trim() || '', tavern_commands: commands };
    }

    // 兼容旧的JSON格式
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1]); } catch {}
    }
    return null;
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

    // 尝试解析标签格式
    const commandsMatch = response.match(/<commands>([\s\S]*?)<\/commands>/i);
    if (commandsMatch) {
      const commands: any[] = [];
      const commandLines = commandsMatch[1].trim().split('\n');
      for (const line of commandLines) {
        const parts = line.trim().split('|');
        if (parts.length >= 2) {
          let value: any = parts.slice(2).join('|').trim();
          if (value.startsWith('{') || value.startsWith('[')) {
            try { value = JSON.parse(value); } catch {}
          } else if (!isNaN(Number(value))) {
            value = Number(value);
          } else if (value === 'true') value = true;
          else if (value === 'false') value = false;
          commands.push({ action: parts[0].trim(), key: parts[1].trim(), value });
        }
      }
      const narrativeMatch = response.match(/<narrative>([\s\S]*?)<\/narrative>/i);
      return { text: narrativeMatch?.[1]?.trim() || '', tavern_commands: commands };
    }

    // 兼容旧的JSON格式
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1]); } catch {}
    }
    return null;
  } catch (error) {
    console.error('完成任务失败:', error);
    return null;
  }
}