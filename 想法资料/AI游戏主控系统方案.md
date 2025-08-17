# AI游戏主控系统 (AI Game Master) 方案

本文档旨在响应用户的深度反馈，将项目的AI交互模型从“内容生成器”升级为“智能游戏主控 (GM)”。此方案将作为后续所有核心AI功能开发的根本大法。

## 一、 系统核心目标

构建一个能够接收复杂游戏状态、并以结构化指令返回叙事与状态变更的闭环AI系统。

## 二、 [第一阶段] 坤舆再造：地图生成PLUS

为满足更宏大的世界观，`MAP_GENERATION_PROMPT` 需要再次升级。

**1. 新的地图数据结构:**

AI需要生成包含“大洲”层级的地理信息。

```json
{
  "mapData": {
    "type": "FeatureCollection",
    "features": [
      // Feature 1: 大洲范围
      {
        "type": "Feature",
        "geometry": { "type": "Polygon", "coordinates": [/* ... */] },
        "properties": {
          "featureType": "continent",
          "name": "东胜神洲",
          "description": "灵气充裕，人杰地灵，乃正道宗门汇聚之地。"
        }
      },
      // Feature 2: 坐落于大洲内的势力
      {
        "type": "Feature",
        "geometry": { "type": "Polygon", "coordinates": [/* ... */] },
        "properties": {
          "featureType": "faction_territory",
          "continent": "东胜神洲", // 归属的大洲
          "name": "青云宗",
          "factionType": "宗门", // 势力类型
          "description": "东胜神洲三大剑宗之一。",
          "style": { "fillColor": "#1d4ed8", "fillOpacity": 0.4 }
        }
      },
      // Feature 3: 坐落于势力内的城镇
      {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [/* ... */] },
        "properties": {
          "featureType": "city",
          "continent": "东胜神洲",
          "faction": "青云宗", // 归属的势力
          "name": "云来城",
          "description": "青云宗山脚下的凡人城市。"
        }
      }
    ]
  }
}
```

**2. `MAP_GENERATION_PROMPT` v2 改造要点:**
   - 明确要求生成1-2个`continent`类型的`Polygon`。
   - 要求后续生成的`faction_territory`和`city`等，必须包含`continent`属性，指明其归属。
   - 丰富势力类型，要求生成“宗门/修仙世家/凡俗王朝/散修联盟”等不同类型的势力。

## 三、 [第二阶段] 天道法则：定义GM请求/响应格式

我们将创建一套标准化的TypeScript接口来定义新的交互格式。

**1. GM请求体 (`GM_Request`)**

```typescript
// 将存放于 src/types/AIGameMaster.d.ts
interface GM_Request {
  character: CharacterData; // 完整的角色数据
  world: {
    lorebook: string; // 世界书核心内容
    mapInfo: any; // 当前地图信息 (GeoJSON)
    time: string; // 当前游戏时间
  };
  memory: {
    short_term: string[]; // 近期对话历史
    mid_term: string[];   // 中期记忆摘要
    long_term: string[];  // 长期关键记忆
  };
  // ... 其他根据用户设想需要添加的字段 ...
}
```

**2. GM响应体 (`GM_Response`)**

```typescript
// 将存放于 src/types/AIGameMaster.d.ts
interface GM_Response {
  text: string;           // AI生成的主要叙事内容
  text_min?: string;        // 叙事的摘要，用于中期记忆
  around?: string;        // 周围环境、人物、声音的描述
  update?: {
    character?: Partial<CharacterData>; // 角色属性的增量更新
    inventory?: { add?: any[]; remove?: any[]; }; // 背包变更
    map?: { add?: any[]; remove?: any[]; update?: any[]; }; // 地图元素变更
    relationships?: { [name: string]: { change: number; type: string; }; }; // 人物关系变更
    quests?: { add?: any[]; remove?: any[]; update?: any[]; }; // 任务变更
  };
}
```

## 四、 [第三阶段] 降世真言：重构初始消息生成

`INITIAL_MESSAGE_PROMPT` 将被彻底重构为一个真正的“GM指令”。

**1. `INITIAL_MESSAGE_PROMPT` v2 改造要点:**
   - **角色扮演:** 指令AI扮演“大道化身”或“天道主宰”，作为游戏世界的GM。
   - **输入:** 明确告知AI，它将收到一个`GM_Request`格式的JSON对象。
   - **核心任务:**
     1.  **推演过往:** “如果角色年龄不为0，请根据其出身、天赋、灵根和气运，用【text】字段，简要叙述从其出生到当前年龄的关键经历。”
     2.  **选定或创造降生点:** “根据角色的气运，从地图中选择一个合理的初始位置。如果不存在合适的安全地点（如村庄、城镇），你可以在一个势力的边缘地带，使用`update.map.add`指令为角色创造一个初始降生点（如‘无名小村’、‘破旧的山神庙’）。”
     3.  **赋予初始状态:** “根据角色的出身和过往经历，使用`update`指令，为其赋予合理的初始状态。例如，猎户出身可能`update.inventory.add`一把‘旧猎弓’；若经历过奇遇，可能`update.character`中增加一项‘神秘技艺’。”
   - **输出:** 明确要求AI**必须**返回一个`GM_Response`格式的JSON对象。

**2. 新的工具函数:**
   - `src/utils/AIGameMaster.ts` 将被创建，用于存放：
     - `buildGmRequest()`: 构建发送给AI的请求体。
     - `processGmResponse()`: 解析AI返回的响应体，并将其应用到前端的状态上（例如，调用Pinia store更新角色属性，或触发酒馆变量更新）。

## 五、 实施路线图

为稳妥起见，建议按以下步骤推进：
1.  **立法**: 创建 `src/types/AIGameMaster.d.ts` 文件，定义 `GM_Request` 和 `GM_Response` 接口。
2.  **坤舆再造**: 更新 `src/utils/tavernAI.ts` 中的 `MAP_GENERATION_PROMPT` 以生成包含大洲的地图。
3.  **铸造核心**: 创建 `src/utils/AIGameMaster.ts` 文件，并初步实现 `buildGmRequest` 和 `processGmResponse` 的框架。
4.  **重构降世**: 更新 `src/utils/tavernAI.ts` 中的 `INITIAL_MESSAGE_PROMPT`，并重构 `generateInitialMessage` 函数，使其调用新的GM工具函数。
5.  **法器升级**: 大幅重构 `src/views/MapView.vue`，使其调用 `AIGameMaster` 工具，并能正确处理和展示 `GM_Response` 的复杂数据。

此方案工程浩大，但一旦完成，将使“大道朝天”的交互体验产生质的飞跃。