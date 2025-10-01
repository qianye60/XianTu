// 通用指令：扮演专家角色，并严格遵循JSON格式 (精简版)
export const ROLE_PLAY_INSTRUCTION = `
# 角色与格式要求
你是精通东方玄幻设定的"天机阁"推演大师。严格按照任务指定的JSON格式输出，不得包含JSON格式外的任何文本。
`;

// 1. 世界生成提示词
export const WORLD_ITEM_GENERATION_PROMPT = `${ROLE_PLAY_INSTRUCTION}
# 任务：生成修仙世界设定
## 要求：
1. 世界命名：富有古典韵味（如：玄黄大界、沧澜古陆）
2. 世界描述：200-400字宏观背景
3. 时代背景：当前时代特征

## JSON输出格式
\`\`\`json
{"name":"世界名称","description":"世界背景...","era":"时代背景"}
\`\`\`
`;

// 2. 天资等级生成
export const TALENT_TIER_ITEM_GENERATION_PROMPT = `${ROLE_PLAY_INSTRUCTION}
# 任务：生成天资等级
## 要求：
1. 名称：体现层次感（如：凡夫俗子、天生灵秀）
2. 总点数：10-50之间
3. 稀有度：1-5（1常见，5传说）
4. **稀有度原则**：稀有度为5的“传说”级天资应极为罕见，可以包含“仙”、“神”等字眼，但生成概率需极低，以体现其珍贵。

## JSON输出格式
\`\`\`json
{"name":"天资名称","description":"描述...","total_points":数字,"rarity":数字,"color":"#颜色"}
\`\`\`
`;

// 3. 出身生成
export const ORIGIN_ITEM_GENERATION_PROMPT = `${ROLE_PLAY_INSTRUCTION}
# 任务：生成出身背景
## 要求：
1. 名称：修仙世界特色（如：书香门第、江湖游侠）
2. 描述：详细背景故事
3. 效果：具体游戏效果

## JSON输出格式
\`\`\`json
{"name":"出身名称","description":"详细描述...","effects":["效果1","效果2"]}
\`\`\`
`;

// 4. 灵根生成
export const SPIRIT_ROOT_ITEM_GENERATION_PROMPT = `${ROLE_PLAY_INSTRUCTION}
# 任务：生成灵根类型
## 要求：
1. 名称：不含等级前缀（如："雷灵根"而非"上品雷灵根"）
2. 等级：下品(1.1x)、中品(1.3x)、上品(1.6x)、极品(2.0x)、神品(2.8x)、特殊、凡品(1.0x)
3. 消耗：下品(3-5)、中品(6-8)、上品(10-12)、极品(15-18)、神品(25-30)、凡品(0-2)
4. **稀有度原则**：“神品”或“仙品”等级的灵根极为珍稀，生成概率需极低。绝大多数情况下应生成“极品”及以下的灵根。

## JSON输出格式
\`\`\`json
{"name":"灵根名称","tier":"等级","description":"描述...","cultivation_speed":"1.6x","special_effects":["效果1"],"base_multiplier":数字,"talent_cost":数字,"rarity":数字}
\`\`\`
`;

// 5. 天赋生成
export const TALENT_ITEM_GENERATION_PROMPT = `${ROLE_PLAY_INSTRUCTION}
# 任务：生成天赋技能
## 要求：
1. 名称：霸气神秘（如：过目不忘、天生神力）
2. 类型：战斗类/辅助类/特殊类
3. **稀有度原则**：“仙品”、“神品”等级的天赋应极为罕见，其效果强大但不能完全破坏平衡。绝大多数天赋应符合常规修仙世界观。

## JSON输出格式
\`\`\`json
{"name":"天赋名称","description":"详细描述...","type":"天赋类型"}
\`\`\`
`;

// 6. 地图生成
export const MAP_GENERATION_PROMPT = `
【专项任务：地图数据生成】

# 任务：生成GeoJSON格式修仙世界地图

## 要求：
**地点类型** (Point)：门派宗门、修炼圣地、城镇、危险秘境、自然地貌
**势力范围** (Polygon)：主要门派和势力的领土边界
**坐标范围**：经度102-109，纬度27.5-33
**数量要求**：15-25个地点，6-10个势力范围

## 地点名称格式规范：
**必须严格遵守以下格式**：
- 格式："大陆名称·具体位置"，可以使用多个 · 分隔表示层级关系
- 示例："东胜神洲·花果山" 或 "天星大陆·玄天宗·外门广场" 或 "南域大陆·青云城"
- 地点名称应体现所属大陆和具体位置的层级关系

## 输出格式：
**必须严格按照以下格式，用json代码块包围：**

\`\`\`json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "大陆名称·地点名称",
        "type": "地点类型",
        "description": "地点描述",
        "danger_level": "安全/普通/危险/极危",
        "suitable_for": "适合境界"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [经度, 纬度]
      }
    }
  ]
}
\`\`\`
`;

// 7. NPC动态更新
export const NPC_DYNAMIC_UPDATE_PROMPT = `
【NPC动态更新系统】

# 触发条件
- 与NPC直接互动、NPC出现在场景、影响NPC的事件发生、时间推进影响状态

# 更新注意
1. **高优先级**：有"当前关注"标记的NPC每次对话都要更新记忆，哪怕不在用户身边。

# 必须更新内容
1. **记忆更新**：添加新记忆条目 {"时间":"游戏时间","事件":"事件描述"}
2. **好感度调整**：友善对话+1~3，帮助+3~8，赠礼+5~15，冒犯-3~-10，敌对-10~-30
3. **境界更新**：使用描述性文本（"练气二层"、"筑基初期"），禁用数值
4. **状态位置**：健康状态、情绪、特殊状态、位置变化
5. **物品背包**：交易、赠送、消耗后的变化

# 数据格式
使用tavern_commands的set操作，一次最多更新3-5个NPC，优先关注标记的NPC。
`;
