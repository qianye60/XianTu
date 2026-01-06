# 联机穿越（POI 坐标地图）工程文件 v1

## 1. 背景与目标

本工程文件定义“联机模式 + 穿越入侵 + 永久世界改变 + 离线防守（纯规则 AI 优先）”的可实施方案，采用 **POI 坐标地图（点位 + 连接图）** 替代全格子地图，以降低开发与同步复杂度，并满足以下已确认需求：

- 进入对方角色 **主世界**。
- 穿越可随时回去，必须保护好原来的个人存档（隔离世界层与个人层）。
- 掠夺/抄家可 **永久改变对方世界**。
- 玩家下线实体可被杀；上线后 **10 HP**；上线必须知道离线期间发生了什么（服务端生成事实报告）。
- 离线代理：若被入侵者配置并启用 Key，则服务器用其 Key 请求 LLM；若未配置，则 **纯规则 AI（不调用 LLM）**。
- 世界可配置隐私：可不公开、不可被搜索；穿越入口为侧边栏游戏功能，并可引入“签到领取穿越点”等条件玩法。
- 叙事规则必须遵守：合理性审查（拒绝口胡/诡辩/结果导向）与双境叙事（常规上限为当前境界+2 大境界；破格机制三类）。

> 叙事规则的文本规范已存在于：`src/utils/prompts/definitions/businessRules.ts`（后续将把“行动意图 vs 结果裁决”与“穿越/入侵”扩展规则补充到该文件中，作为 LLM 与模板叙事的统一来源）。

---

## 2. 系统分层（关键：可回去、可回溯、可扩展）

### 2.1 两层存储，强隔离

- **个人存档层（CharacterSave）**：角色个人状态与内容（技能、背包、个人记忆、任务、对话历史等）。
  - 现有承载：`server.models.GameSave.save_data`（JSON）。
- **世界共享层（WorldState）**：该角色主世界的公共状态（地图 POI/连接图、建筑/资源库存、世界 NPC、离线玩家实体、阵营警戒、世界事件日志等）。
  - 新增承载：`WorldInstance` + `MapInstance` + `Poi/Edge` + `EntityState` + `WorldEventLog` 等。

穿越/抄家影响 **世界层**（永久改变）；穿越者自身获得/受伤/状态变化写回 **个人层**（差量同步）。

### 2.2 事件溯源与快照（永久改变但可回溯）

世界写入采用：

1) 追加写入 `WorldEventLog`（不可变追加日志，作为事实来源）  
2) 更新世界快照（`WorldInstance.world_state_json` + `MapInstance.map_state_json` 等）  

任何入侵报告、回放、异常审计均以 `WorldEventLog` 为准。

---

## 3. 地图系统（POI 坐标地图）

### 3.1 核心概念

- **POI（Point of Interest）点位**：城镇、洞府、秘境入口、资源点、阵眼、暗道口、传送阵等。每个 POI 具有 `(x,y)` 坐标用于前端渲染与“接触触发”。
- **Edge（连接边）**：POI 之间的道路/小径/传送/暗道。移动行为是“从 POI 到 POI”，并由服务端裁决成本与风险。

### 3.2 “地图切换”

多地图通过 `portal` 类型的 Edge 实现：

- `edge_type=portal` 从 `map_id=A, poi_id=x` 传送到 `map_id=B, poi_id=y`。
- 地图切换可被条件限制：钥匙、境界、破阵成功、声望等。

### 3.3 视野与隐私（不泄露全图）

为满足“世界不公开/局部可见”：

- 前端请求地图数据只能按“**可见 POI 子集**”获取。
- 服务端对入侵者返回：
  - POI：默认只返回已探索/已解锁/在当前会话视野范围内的点位。
  - Edge：仅返回连接“可见 POI”的边。
- 世界背景/势力信息默认只返回摘要，细节由事件解锁。

---

## 4. 实体系统（玩家/NPC/离线玩家统一）

### 4.1 EntityState（世界层实体）

实体统一为：

- `player_online`：在线玩家实体
- `player_offline`：离线玩家实体（可被杀）
- `npc`：世界 NPC

位置采用：
- `map_id`
- `poi_id`

### 4.2 接触触发（离线代理/交互）

v1 触发定义（简单且强一致）：

- “同一 POI”即接触，可触发对话/攻击/偷窃/破坏等互动。
- 扩展：允许半径接触（`distance(poiA, poiB) <= r`）用于“靠近触发警戒”。

---

## 5. 穿越会话（TravelSession）与回城锚点

### 5.1 会话模型

穿越必须创建 `TravelSession`：
- `visitor_player_id`：入侵者
- `target_world_instance_id`：目标主世界
- `entry_map_id/entry_poi_id`：入口
- `policy_json`：权限与规则（可否掠夺/可否破坏/保护期/结算规则等）
- `state`：`active|ended|settled`

### 5.2 回城锚点（保证可回去）

穿越开始时记录 `ReturnAnchor`：
- `home_world_instance_id`
- `home_map_id`
- `home_poi_id`

`travel/end` 时服务端强制：
- 入侵者实体从目标世界移除或冻结
- 入侵者返回锚点 POI
- 差量写回个人存档（战利品/受伤/状态等）

---

## 6. 行为系统与裁决（服务端权威）

### 6.1 “意图输入”原则（禁止口胡）

所有动作请求只允许描述：
- 自身行动/意图/选择/策略（例如“尝试潜入”“尝试破门”“尝试偷窃”）

禁止提交：
- 结果导向（“我成功拿到宝物”“他必死”）
- 替 NPC 做决定/心理倾向
- 多选一陷阱/诡辩式推导剧情结果

违反则触发“合理性审查拒绝”，并写入 `server_verdict_json`（用于报告与惩罚）。

### 6.2 三段裁决（偏叙事但规则硬）

1) 合理性审查（硬拒绝/反噬）
2) 规则判定（位置、门禁、陷阱、冷却、概率、状态效果）
3) 叙事包装（v1 使用模板叙事；有 Key 时可用 LLM 生成更自然文本，但不得影响裁决结果）

### 6.3 双境叙事限制（强约束）

常规：接触强度上限为当前境界 + 2 大境界。  
破格机制（写入裁决理由）：
- 因果牵连
- 世界事件
- 仇恨升级（持续挑衅同一势力 → 升级到定点清除）

---

## 7. 离线防守：纯规则 AI（无 Key 时默认）

### 7.1 离线玩家实体三态 FSM

- `IDLE`：低频巡逻/驻守核心 POI
- `ALERT`：警戒提升后撤退到安全 POI、加强门禁与陷阱、呼救守卫
- `ENGAGED`：同 POI 接触时才进入对抗策略（反击/撤离/诱导陷阱）

### 7.2 权谋记忆（不依赖 LLM）

为每个世界维护结构化记忆：
- `IntelLedger`：入侵者行为摘要、入口、路径、破坏类型
- `GrudgeGraph`：仇恨与恐惧分离；用于触发仇恨升级
- `TrapPlan`：诱饵 POI、陷阱 POI、资源转移策略
- `SafehouseRotation`：核心资源多 POI 轮换藏匿

规则 AI 的行为从这些数据驱动（例如“多次偷窃 → 诱饵 + 空仓 + 伏击”）。

---

## 8. LLM 离线代理（可选，仅被入侵者自愿配置）

### 8.1 Key 使用与优先级

- 若被入侵者启用并配置 Key：服务器使用 **被入侵者 Key** 调用 LLM，为其离线实体生成“意图候选/台词”。
- 若未配置：不调用 LLM，走纯规则 AI。

> 不允许使用入侵者 Key 来为被入侵者生成代理行为（否则可被操控）。

### 8.2 隐私裁剪

LLM 输入仅包含：
- 当前 POI 的局部信息（不含全图）
- 双境与合理性审查规则摘要
- 防守方状态摘要（不含敏感资产明细）

输出强制结构化：只允许“意图候选”，禁止“结果宣告”。

---

## 9. 离线死亡与上线 10HP + 入侵报告（事实源）

### 9.1 离线死亡规则

- 离线实体可被杀，死亡事件永久写入世界层。
- 目标玩家上线：在 `safehouse` POI 复活，HP=10；不掉境界、不额外惩罚。

### 9.2 入侵报告（服务端生成、不可篡改）

服务端基于 `WorldEventLog` 自动生成 `InvasionReport`：
- 时间线（何人何时进入，访问哪些 POI，做了什么）
- 损失清单（资源、建筑耐久、NPC/离线实体）
- 关键裁决理由（诡辩/口胡拒绝、破格机制触发等）
- 入侵者留言（可选，单独字段标记为留言）

---

## 10. 穿越入口与经济（TP）

### 10.1 入口

侧边栏「游戏功能」新增“穿越”入口：可查看目标世界（受隐私策略限制）、消耗 TP 发起穿越、查看自身 TP 与签到状态。

### 10.2 TP 规则（v1 建议）

- 每日签到：+1 TP
- 穿越消耗：`cost = 1 + risk + repeat_penalty - invite_discount`
  - `risk`：目标世界警戒/近期被入侵次数
  - `repeat_penalty`：短时间反复入侵同一人
  - `invite_discount`：持有邀请码/锚点令牌可降低消耗

### 10.3 护界（防止被刷退）

目标世界被连续入侵后进入“护界期”：
- 提高入侵成本、降低入侵者可见信息、提高陷阱/守卫权重
- 不做绝对免疫，保持攻防对抗

---

## 11. 数据模型（建议新增，字段为 v1 最小集合）

> 具体 Tortoise 模型落地时将放入 `server/models.py` 或拆分 `server/models_world.py`（视你现有组织方式而定）。

### 11.1 WorldInstance

- `id`
- `owner_player_id`
- `owner_char_id`
- `visibility_mode`：`public|hidden|locked`
- `world_state_json`：世界快照（含警戒、势力态度、世界背景版本等）
- `revision`：用于并发控制与报告生成
- `created_at/updated_at`

### 11.2 MapInstance

- `id`
- `world_instance_id`
- `map_key`（如 `mainland`, `manor`, `secret_realm`）
- `map_state_json`（POI/Edge 索引、资源全局参数等）
- `revision`

### 11.3 Poi

- `id`
- `map_instance_id`
- `poi_key`
- `x`, `y`
- `type`, `tags_json`
- `state_json`（资源库存、建筑耐久、门禁、陷阱等）
- `visibility_policy`

### 11.4 Edge

- `id`
- `map_instance_id`
- `from_poi_id`, `to_poi_id`
- `edge_type`
- `travel_cost`, `risk`
- `requirements_json`

### 11.5 EntityState

- `id`
- `world_instance_id`
- `map_instance_id`, `poi_id`
- `entity_type`
- `owner_player_id/owner_char_id`（可空）
- `stats_json`（含 HP、境界、状态）
- `ai_memory_json`（权谋记忆）
- `state_flags_json`
- `updated_at`

### 11.6 TravelSession

- `id`
- `visitor_player_id`
- `target_world_instance_id`
- `entry_map_id/entry_poi_id`
- `return_anchor_json`
- `policy_json`
- `state`
- `started_at/ended_at`

### 11.7 WorldEventLog

- `id`
- `world_instance_id`, `map_instance_id`, `poi_id`
- `actor_entity_id`, `target_entity_id`（可空）
- `event_type`
- `event_payload_json`
- `server_verdict_json`（合理性审查/双境触发原因/失败说明等）
- `created_at`

### 11.8 InvasionReport

- `id`
- `world_instance_id`
- `victim_player_id`
- `summary_json`
- `unread`（或 last_read_at）
- `created_at`

### 11.9 OfflineAgentProfile（可选）

- `owner_player_id/owner_char_id`
- `enabled`
- `provider_mode`（仅 `victim_key` / `disabled`）
- `encrypted_api_key`（加密存储）
- `rate_limit_json`（每日上限/预算）
- `prompt_version`

---

## 12. API 合同（v1 最小可实现）

### 12.1 穿越与签到

- `POST /api/v1/travel/signin`：签到获得 TP
- `POST /api/v1/travel/start`：发起穿越（消耗 TP，创建 session）
- `POST /api/v1/travel/end`：结束穿越（回城锚点生效，结算差量）

### 12.2 世界与地图

- `GET /api/v1/worlds/instance/me`：获取自己主世界概要/隐私配置
- `GET /api/v1/worlds/instance/{world_id}/map/{map_id}/graph`：获取可见 POI+Edge 子图
- `GET /api/v1/worlds/instance/{world_id}/entities?map_id=&poi_id=`：获取某 POI 的实体列表（裁剪视图）

### 12.3 行为提交（意图）

- `POST /api/v1/worlds/instance/{world_id}/action`
  - `action_type`: `move|scout|break_in|steal|sabotage|attack|talk`
  - `intent_payload`: 仅描述意图

### 12.4 入侵报告

- `GET /api/v1/invasion/reports/me`：读取报告（未读优先）

---

## 13. v1 实施范围（建议分阶段）

### M1（能跑）
- WorldInstance/MapInstance/POI/Edge/EntityState 基础模型
- TravelSession + 回城锚点
- 地图子图拉取（POI/Edge）
- `move` 行为裁决 + 事件日志
- 签到 TP + 穿越 TP 消耗
- 入侵报告生成（基于事件日志）

### M2（能抄家）
- `scout/break_in/steal/sabotage` 行为与永久改变
- 警戒值与护界期
- 离线实体 IDLE/ALERT/ENGAGED 纯规则 AI

### M3（能打）
- `attack` 行为、死亡与掉落、上线 10HP
- 双境限制与破格机制完整化

### M4（更像真人）
- 被入侵者自愿 Key 的 LLM 代理（仅 ENGAGED、结构化意图、隐私裁剪）

---

## 14. 非目标（v1 不做）

- 全格子地图与逐格寻路
- 高精度视线遮挡/射线投射
- 实时多人同屏高频同步（v1 采用 POI 级事件同步）
- 完整经济系统与复杂工会战（后续可扩展）

---

## 15. 风险与对策（反作弊/一致性）

- 玩家可作弊：服务端只接受“意图”，结果由裁决引擎决定；任何永久改变必须写入事件日志并带裁决理由。
- 信息泄露：地图子图裁剪、POI/Edge 不全量下发；LLM 输入仅局部摘要；Key 加密存储。
- 被刷退：护界期 + TP 成本递增 + 反复入侵惩罚 + 警戒升级（陷阱/守卫增强）。

