# 存档 V3 全仓库重构计划（以 `docs/save-schema-v3.md` 为唯一真相）

## 目标与原则

- **唯一真相**：存档落盘结构以 `docs/save-schema-v3.md` 为准，代码/提示词/UI 全部对齐该结构。
- **彻底移除旧 key**：运行时不再兼容读取旧 key；旧档只允许通过“迁移器”一次性升级到 V3。
- **可迁移且零差错**：迁移必须可回滚/可备份/可复测，避免用户旧存档损坏。
- **MECE + 短路径**：结构职责单一、路径短、好记，避免“状态/修行状态/修炼”等语义重叠。
- **联机友好**：明确服务器权威范围；客户端 UI 对只读路径置灰；同步冲突策略可配置。
- **分步生成（已定规则）**：第 1 步仅流式正文纯文本；第 2 步生成结构化 JSON（记忆/指令/行动选项），不把第 2 步内容串进正文。

## 当前现状（需要收敛的问题）

- 存在多套存档形态（平铺顶层中文 key / 旧字段 / 新字段混用），`SaveData` 仍是 `any`，导致 TS 与运行期都容易漂移。
- 迁移能力与迁移弹窗已有雏形，但未形成“检测 → 弹窗确认 → 备份 → 迁移 → 写回 → 再加载”的闭环。
- 大量 UI/提示词/校验逻辑仍引用旧路径（或有 fallback），需要统一替换并删掉兼容层。

## 验收标准（Definition of Done）

- 所有存档写入均是 V3（严格结构），读档只接受 V3；检测到旧档必须弹迁移窗口，不允许静默容错。
- 全仓库 `rg` 不再出现旧顶层 key / 旧路径（除迁移器实现内部的映射表与测试夹具）。
- AI 第 1 步响应不包含 JSON/指令；第 2 步产出结构化 JSON，并且写入/命令路径全部指向 V3。
- 联机模式：只读路径在 UI 置灰且写入会被拦截；同步流程能稳定工作（至少在本地模拟/最小闭环上验证）。

---

## 阶段计划

### Phase 0：冻结 V3 结构与类型（先把“尺子”定死）

1. 以 `docs/save-schema-v3.md` 为准，补齐所有缺失字段/子结构（持续进行，但必须先形成“可落地最小集”）。
2. 新建/重写 **强类型**：
   - `src/types/saveSchemaV3.ts`：定义 `SaveDataV3`（与文档一致），替代 `SaveData: any` 的使用面。
   - 关键点：**不再在结构中嵌入** `_AI说明/_AI修改规则/_AI重要提醒`（这些字段将从数据结构中移除，仅允许存在于提示词/代码内部）。
3. 新建 **V3 校验器**（运行期）：
   - `src/utils/saveValidationV3.ts`（建议）：校验必填节点、类型、引用一致性（如 `角色.装备.*` 必须引用 `角色.背包.物品` 的 key 或为 null）。

交付物：
- `docs/save-schema-v3.md`（最终定稿版）
- `src/types/saveSchemaV3.ts`
- `src/utils/saveValidationV3.ts`

### Phase 1：迁移闭环（旧档只走迁移器）

1. 迁移器：
   - `src/utils/saveMigration.ts`：实现 `detectLegacySave()` + `migrateLegacyToV3()`，覆盖已存在的旧形态（平铺 key、旧命名、缺字段等）。
   - 迁移必须 **幂等**：同一份旧档重复迁移不会产生二次污染。
2. 迁移窗口：
   - 复用/完善 `src/components/dashboard/components/SaveMigrationModal.vue`：
     - 显示：检测到的旧版本信息、将要迁移到的版本、关键差异摘要（至少列出顶层迁移映射）。
     - 提供：**备份**（导出 JSON 或复制到新槽位）、确认迁移、取消加载。
3. 接线：
   - 在 `characterStore.loadSaveData()`（或统一的 load flow）接入：
     - detect → modal → backup → migrate → validateV3 → writeBack → loadV3
4. 删除运行时兼容：
   - `src/utils/dataRepair.ts`：保持“检测旧 key 直接报错”的策略，但报错信息要指向“请使用迁移窗口”。

交付物：
- 旧档能被可靠迁移为 V3，且迁移前后可回滚/可重试
- UI 中存在可操作的迁移入口

### Phase 2：Store 重构（所有状态读写统一到 V3）

1. `src/stores/gameStateStore.ts`
   - `toSaveData()` 输出 V3：按 `元数据/角色/社交/世界/系统` 组织，不再输出平铺 key。
   - `loadFromSaveData()` 只接受 V3；删除所有 `anySave.旧字段 ?? fallback`。
2. `src/stores/characterStore.ts`
   - 存档槽位结构与 V3 对齐；旧字段（如 `角色基础信息` 等）彻底移除。
3. 同步更新依赖 store 的 composables（`src/composables/useGameData.ts` 等）。

交付物：
- 应用全流程（创建角色→游戏→保存→读档）只产生/消费 V3

### Phase 3：提示词与命令系统对齐（AI 只认 V3 路径）

1. 重写 prompt 定义：
   - `src/utils/prompts/definitions/dataDefinitions.ts`、`coreRules.ts`、`businessRules.ts`、`questSystemRules.ts`
   - 全部改为 V3 路径；删除旧路径/旧名词。
2. 命令校验与执行：
   - `src/utils/commandValidator.ts`、`src/utils/commandValueValidator.ts`、`src/stores/gameStateStore.ts#updateState`
   - 确保命令 path 能覆盖 V3（必要时引入**受控的短路径别名表**，但落盘字段仍以 V3 为准）。
3. 分步生成：
   - `src/utils/AIBidirectionalSystem.ts`：继续保持“第 1 步不注入结构/规则；第 2 步才输出 JSON”，并把第 2 步 schema/命令路径全部切到 V3。

交付物：
- AI 输出的命令/记忆更新不再引用旧 key
- 第 1 步正文不出现 JSON/指令

### Phase 4：UI 全量对齐（看得见、能操作、路径一致）

1. 全面替换 UI 读取路径：
   - 背包/装备/功法/修炼/大道/宗门/任务/记忆/关系/世界/历史等面板全部从 V3 读取。
2. 联机置灰：
   - `系统.联机.只读路径` 命中时：对应字段 UI 禁用，写入被拦截并提示“联机权威数据不可修改”。
3. 宗门面板替换：
   - 侧边栏与路由统一切到新版宗门系统面板（不再保留旧版入口）。

交付物：
- 所有新增系统“可见可用”，不再只堆在代码里

### Phase 5：服务端与联机同步（权威边界清晰）

1. 统一服务端 schema（`server/models.py` / `server/schemas/schema.py` / API endpoints）与 V3 对齐。
2. 同步协议：
   - 定义服务器权威路径（至少 `世界.*`）与客户端可写路径，并在 API 层校验。
3. 冲突策略：
   - `系统.联机.冲突策略` 落地到实际合并逻辑（默认服务器覆盖）。

交付物：
- 联机模式下能稳定同步，且不会因客户端改动导致脏写/分叉

### Phase 6：清理与回归（彻底收尾）

1. 清理旧 key、旧提示词、旧 UI 入口、旧迁移代码。
2. 全局 `rg` 检查：旧 key 必须只存在于迁移器映射与测试夹具。
3. 回归检查清单：
   - 新建存档、读写存档、迁移旧档、联机模式置灰、分步生成两步输出格式。

---

## 建议的落地顺序（避免返工）

1. **先定稿 `docs/save-schema-v3.md` + `SaveDataV3` 类型**（Phase 0）
2. **再做迁移闭环**（Phase 1），确保用户数据安全
3. **最后批量改 store/UI/prompt**（Phase 2/3/4），统一替换并删除兼容

## 关键风险与对策

- 旧档损坏风险：迁移前强制备份 + 迁移后 validate + 写回前二次确认。
- 路径漂移风险：类型 + 运行期校验器 + `rg` 清理门禁。
- 联机作弊/不同步风险：只读路径置灰 + 服务端校验 + 默认“服务器权威覆盖”。

