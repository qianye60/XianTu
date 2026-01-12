# 大道朝天 v4.0 更新日志

> 统计范围：`git f869fdf48b61ea93031132b11ecff5c01efef31c..399837c4d312f7ccd3bd5a6113a1ac833719214c`（2026-01-04 → 2026-01-12）

## 变更统计

- 提交数：11
- 文件变更：148（新增 36 / 删除 7 / 修改 105）
- 代码量：+27679 / -12151

## 核心更新（新增功能 + 用途）

### 1) 存档系统：存档格式 V3（模块化 / 短路径 / 联机友好）

- 新增 `SaveDataV3` 与完整文档：将存档拆分为 `元数据/角色/社交/世界/系统` 五大领域，路径更短、更利于 AI 指令稳定输出。
- 新增 V3 校验与修复链路：读档时可对关键字段做结构校验，降低坏档/脏数据引发的异常。
- 新增迁移工具链：支持从旧存档（或旧导出包）迁移到 V3，并明确“迁移只在迁移器里发生”，避免旧字段污染新结构。
- 新增可视化迁移入口：
  - `旧存档转化`：可检测文件类型（存档包/角色包/单个存档/裸存档数据），展示识别结果、旧 key 汇总、校验错误，并支持“转换下载/导入到当前单机角色”。
  - `存档迁移`、`宗门迁移`：在面板侧提供迁移流程与提示，降低升级门槛。

用途：让存档结构更稳定、字段职责更清晰；减少 AI 输出长路径导致的格式漂移；为后续联机权威/同步提供结构基础。

### 2) 联机/穿越：联机存档可进入他人世界（Travel 会话）

- 新增 `穿越`面板（联机模式专用）：
  - 世界列表浏览：按用户名搜索、按可见性筛选、分页加载。
  - 穿越点与签到：显示穿越点，提供签到入口（用于获取/刷新相关状态）。
  - 会话管理：开始穿越、查询当前会话、结束会话返回；并提供会话日志查看。
  - 地图联动：在穿越面板内集成地图视图与位置移动（取后端 map graph/poi）。
  - 入侵报告：查看“我的入侵报告”（世界被进入/发生行为的记录）。
  - 世界策略：支持调整“我的世界”可见性、离线代理开关与离线代理提示词等。
- 联机登录验证与后端状态管理增强：
  - 模式入口会根据“后端是否配置 + 是否可用 + token 是否有效”做明确提示与拦截，避免“点了没反应/半路失败”。
  - 后端不可用时，联机/穿越/登录/账号中心/创意工坊等入口统一置灰或提示。

用途：让联机不再只是“入口”，而是具备可用的世界穿越、会话、日志与地图联动能力；同时降低后端不可用导致的用户困惑。

### 3) AI 调度：新增「API 管理」面板（多 API 配置 + 功能分配 + 智能流水线）

- 新增 `API管理`面板与 `apiManagementStore`：
  - 多 API 配置：新增/编辑/启用禁用/删除，支持导入导出配置与连通性测试。
  - 功能分配：可为不同用途分配不同 API，例如：
    - `main` 主流程
    - `cot` 思维链
    - `instruction_generation` 指令生成
    - `memory_summary` 记忆总结
    - `text_optimization` 文本优化
    - `world_generation` 世界生成
    - `event_generation` 世界事件生成
    - `sect_generation` 宗门内容生成
    - `embedding` 向量/语义检索
  - 酒馆/网页双模式：酒馆端主流程可锁定走酒馆 API；网页端全部走自定义 API。
  - 请求合并策略：当多个功能分配同一 API 时可合并请求；只有分配了独立 API 的功能才会触发额外调用。

用途：把“一个 API 管全局”升级为“按任务分流 + 合并节省调用”，在稳定性、成本、质量之间更好取舍；同时便于调优不同模型/不同提供商的分工。

### 4) 记忆系统：新增向量记忆（本地检索 / 可选 Embedding）

- 新增 `vectorMemoryService`（IndexedDB 本地存储）：
  - 支持关键词/标签提取 + 向量相似度混合检索。
  - 默认可用 TF-IDF 向量化（无需外部 API）；也支持对接 Embedding API（更好的语义检索）。
- 新增 `embeddingService`：统一 Embedding 请求（`/v1/embeddings`）与向量归一化工具。

用途：在不把“全部历史”都塞进上下文的情况下，实现更可控的长期记忆召回，降低 token 压力并提升相关性。

### 5) 世界事件系统：可配置的随机事件（随时间推进）

- 新增 `世界事件`面板：
  - 可配置启用/禁用、随机事件间隔范围（年）、自定义事件提示词。
  - 支持重抽“下次事件时间”、查看事件记录（按时间倒序）。
- 新增事件生成器与提示词规则：`eventGenerators` + `eventSystemRules`，并在 AI 系统中对接世界事件生成流程。

用途：用“世界级事件”替代/补充传统任务面板的驱动方式，让世界随时间推进发生变化与危机，增强沉浸与长期动力。

### 6) 宗门系统 V2：系统化面板 + 迁移 + 生成

- 新增 `宗门系统`容器面板（带子路由）与内容模块：
  - 成员、藏经阁、贡献商店等分区展示。
- 新增宗门迁移与工厂：`sectMigration` / `sectSystemFactory`，并引入更清晰的宗门数据落盘结构。

用途：把宗门从“单面板堆字段”升级为更可扩展的系统化结构，方便后续加入宗门任务/宗门事件/宗门经济等模块。

### 7) 地图系统：开局减负 + 局内初始化生成

- 世界选择（创角 Step1）新增：
  - `修仙难度`选项（不同难度使用不同提示词）。
  - `仅生成大陆（开局优化）`开关：开局只生成宏观大陆，势力/地点可在局内再生成，减少 token、降低开局失败率。
  - 世界规模配置集中在右侧详情中，并加入“风险提示”（配置过高可能失败）。
- 游戏内地图面板新增“初始化地图”覆盖层：当地图为空时提示并一键生成势力/地点，避免开局一次性生成导致的超长上下文与失败。

用途：把“开局一次生成一切”改为“先有世界骨架，再按需生成细节”，显著提升稳定性与可玩性。

### 8) 角色详情增强：身体数据/寿元等更细分展示

- 新增 `BodyStatsPanel`：集中展示寿元、体格、三围、敏感与开发、纹身印记等（并结合环境/NSFW开关做提示）。
- 多个角色/状态相关模块同步更新（六司、寿元计算、状态格式化等），用于更稳定地展示与计算。

用途：增强角色信息的“可读性 + 可管理性”，让成长、代价与限制更直观。

### 9) 提示词系统：分类管理 + 权重可调 + 联机只读

- 提示词管理面板升级：
  - 按使用阶段/类别分组展示，支持批量展开/折叠。
  - 支持启用/禁用与权重调整（1-10），并保留单项/全部导入导出。
  - 联机模式下提示词只读（避免破坏联机一致性）。
- 新增 `promptConfig`：支持从后端拉取远程提示词配置（优先级：用户自定义 > 远程配置 > 本地默认）。

用途：把提示词从“硬编码+难管理”升级为“可版本化/可远程覆盖/可按阶段组织”，并为联机一致性做约束。

### 10) 全局与工程化：统一入口 + 后端管理页

- 全局菜单整合：在非游戏界面提供统一入口（全局设置 / API管理 / 创意工坊 / 账号中心 / 后端管理 / 主题/全屏/教程）。
- 新增后端管理页（管理员）：可对后端存档、角色等资源做查看/删除等操作（需要 admin token）。
- 依赖升级：新增 `@vueuse/core`、`clsx`、`class-variance-authority`、`tailwind-merge` 等，用于支撑新的面板/样式体系与组件组织方式。

用途：把“常用功能入口”集中化，减少找功能成本；同时为联机/后端运营提供必要的管理界面。

## 其他修复与优化（摘要）

- 修复 ESLint “空接口”规则触发的类型报错（`src/types/game.d.ts`）。
- 文本/指令稳健性增强：新增 `jsonExtract`、`regex` 等工具，并联动更新指令校验/文本清理/格式化渲染相关逻辑，降低 AI 输出抖动造成的解析失败。

## 重要变更（可能影响既有使用方式）

- **后端拆分**：`server/` 已移至私有仓库；公开仓库移除 `docker-compose.yml`。联机/穿越/云端相关能力需要单独部署后端并在前端配置后端地址。
- **任务系统调整**：移除 `QuestPanel` / `questStore` / `questGenerators` / `questSystemRules`，并引入 `世界事件系统` 作为新的世界驱动模块（任务相关后续如需回归需按新架构接入）。
- **存档升级**：引入 `存档格式 V3` 与迁移/校验链路，旧存档建议通过“旧存档转化/迁移”升级后再继续游玩。

## 中间变更（在本范围内已被移除/替换）

- 删除工程笔记：`ENGINEERING_ONLINE_TRAVEL_POI_V1.md`、`docs/REFACTOR_PLAN_SAVE_SCHEMA_V3.md`（用于开发过程记录，不纳入发布态）。
- 删除宗门任务内容页：`src/components/dashboard/components/SectMissionsContent.vue`（宗门系统现以成员/藏经阁/贡献为主）。

## 提交列表（按时间）

- fdcef06 2026-01-07 超级一大坨更新
- 61e2ebf 2026-01-07 feat: 完善联机模式登录验证和后端状态管理
- 325b587 2026-01-07 fix: 修复 ESLint 空接口错误
- e889874 2026-01-07 更新
- 944997e 2026-01-07 更新
- 074ceda 2026-01-08 更新
- e3a68c5 2026-01-08 更新
- eef8e99 2026-01-09 feat: 更新面板组件
- 568b66e 2026-01-09 chore: 移除服务端相关的 docker-compose (已移至私有仓库)
- 399837c 2026-01-12 更新

## 附录：文件级变更清单（A/M/D）

```text
M	.gitignore
D	docker-compose.yml
A	docs/save-schema-v3.md
A	docs/任务清单.md
M	package-lock.json
M	package.json
M	src/App.vue
M	src/components/character-creation/CharacterManagement.vue
A	src/components/character-creation/LegacySaveMigrationModal.vue
M	src/components/character-creation/RedemptionCodeModal.vue
M	src/components/character-creation/Step1_WorldSelection.vue
M	src/components/character-creation/Step2_TalentTierSelection.vue
M	src/components/character-creation/Step3_OriginSelection.vue
M	src/components/character-creation/Step4_SpiritRootSelection.vue
M	src/components/character-creation/Step5_TalentSelection.vue
M	src/components/character-creation/Step7_Preview.vue
M	src/components/common/CloudDataSync.vue
M	src/components/common/DataClearButtons.vue
M	src/components/common/DeepCultivationModal.vue
M	src/components/common/DetailModal.vue
M	src/components/common/FormattedText.vue
M	src/components/common/ProgressBar.vue
M	src/components/common/QuantitySelectModal.vue
M	src/components/common/TextReplaceRulesModal.vue
M	src/components/common/VideoBackground.vue
A	src/components/dashboard/APIManagementPanel.vue
M	src/components/dashboard/CharacterDetailsPanel.vue
A	src/components/dashboard/EventPanel.vue
M	src/components/dashboard/GameMapPanel.vue
M	src/components/dashboard/GameVariablePanel.vue
M	src/components/dashboard/InventoryPanel.vue
M	src/components/dashboard/LeftSidebar.vue
M	src/components/dashboard/MainGamePanel.vue
M	src/components/dashboard/MemoryCenterPanel.vue
A	src/components/dashboard/OnlineTravelPanel.vue
M	src/components/dashboard/PromptManagementPanel.vue
D	src/components/dashboard/QuestPanel.vue
M	src/components/dashboard/RelationshipNetworkPanel.vue
M	src/components/dashboard/RightSidebar.vue
M	src/components/dashboard/SavePanel.vue
M	src/components/dashboard/SectPanel.vue
A	src/components/dashboard/SectSystemPanel.vue
M	src/components/dashboard/SettingsPanel.vue
M	src/components/dashboard/SkillsPanel.vue
M	src/components/dashboard/ThousandDaoPanel.vue
M	src/components/dashboard/TopBar.vue
A	src/components/dashboard/components/BodyStatsPanel.vue
M	src/components/dashboard/components/CustomOptionsSection.vue
M	src/components/dashboard/components/GameVariableDataDisplay.vue
M	src/components/dashboard/components/GameVariableFormatGuideModal.vue
M	src/components/dashboard/components/GameVariableSaveDataSection.vue
A	src/components/dashboard/components/SaveMigrationModal.vue
A	src/components/dashboard/components/SectContributionContent.vue
A	src/components/dashboard/components/SectLibraryContent.vue
A	src/components/dashboard/components/SectMembersContent.vue
A	src/components/dashboard/components/SectMigrationModal.vue
M	src/components/dashboard/components/StatusDetailCard.vue
M	src/components/dashboard/components/TreeNode.vue
M	src/composables/useCharacterData.ts
M	src/composables/useGameData.ts
M	src/data/creationData.ts
M	src/i18n/index.ts
M	src/main.ts
M	src/router/index.ts
A	src/services/adminRequest.ts
M	src/services/aiService.ts
M	src/services/characterInitialization.ts
M	src/services/defaultPrompts.ts
A	src/services/embeddingService.ts
M	src/services/offlineInitialization.ts
A	src/services/onlineTravel.ts
A	src/services/presence.ts
A	src/services/promptConfig.ts
M	src/services/promptStorage.ts
M	src/services/request.ts
A	src/services/vectorMemoryService.ts
A	src/stores/apiManagementStore.ts
M	src/stores/characterCreationStore.ts
M	src/stores/characterStore.ts
M	src/stores/gameStateStore.ts
D	src/stores/questStore.ts
M	src/stores/uiStore.ts
M	src/style.css
A	src/styles/design-system.css
M	src/styles/panel-theme.css
M	src/types/game.d.ts
M	src/types/index.ts
A	src/types/saveSchemaV3.ts
M	src/utils/AIBidirectionalSystem.ts
M	src/utils/attributeCalculation.ts
A	src/utils/chatBus.ts
M	src/utils/commandValidator.ts
M	src/utils/commandValueValidator.ts
M	src/utils/coordinateConverter.ts
A	src/utils/cultivationSpeedCalculator.ts
A	src/utils/dadBundle.ts
M	src/utils/dataRepair.ts
M	src/utils/dataValidation.ts
M	src/utils/enhancedActionQueue.ts
M	src/utils/equipmentBonusApplier.ts
M	src/utils/gameMapManager.ts
A	src/utils/generators/eventGenerators.ts
D	src/utils/generators/questGenerators.ts
M	src/utils/indexedDBManager.ts
A	src/utils/jsonExtract.ts
M	src/utils/lifespanCalculator.ts
M	src/utils/masteredSkillsCalculator.ts
M	src/utils/memoryFormatConfig.ts
M	src/utils/nsfw.ts
M	src/utils/presetManager.ts
D	src/utils/prompts/cot/characterInitializationCot.ts
M	src/utils/prompts/cot/cotCore.ts
M	src/utils/prompts/definitions/actionOptions.ts
M	src/utils/prompts/definitions/businessRules.ts
M	src/utils/prompts/definitions/coreRules.ts
M	src/utils/prompts/definitions/dataDefinitions.ts
A	src/utils/prompts/definitions/eventSystemRules.ts
D	src/utils/prompts/definitions/questSystemRules.ts
M	src/utils/prompts/definitions/textFormats.ts
M	src/utils/prompts/definitions/worldStandards.ts
M	src/utils/prompts/promptAssembler.ts
M	src/utils/prompts/tasks/characterInitializationPrompts.ts
M	src/utils/prompts/tasks/gameElementPrompts.ts
A	src/utils/regex.ts
D	src/utils/saveDataValidator.ts
A	src/utils/saveMigration.ts
A	src/utils/saveValidationV3.ts
A	src/utils/sectMigration.ts
A	src/utils/sectSystemFactory.ts
A	src/utils/sixSiManager.ts
M	src/utils/stateChangeFormatter.ts
M	src/utils/statusEffectManager.ts
M	src/utils/tavern.ts
M	src/utils/tavernCore.ts
M	src/utils/textSanitizer.ts
M	src/utils/worldGeneration/enhancedWorldGenerator.ts
M	src/utils/worldGeneration/enhancedWorldPrompts.ts
M	src/utils/worldGeneration/sectDataCalculator.ts
M	src/utils/worldGeneration/sectDataValidator.ts
A	src/views/BackendAdminView.vue
M	src/views/CharacterCreation.vue
M	src/views/GameView.vue
M	src/views/LoginView.vue
M	src/views/ModeSelection.vue
M	src/views/WorkshopView.vue
M	webpack.config.js
A	【仙途】专用预设 .json
M	游戏介绍.html
```
