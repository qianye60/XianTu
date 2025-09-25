# 大道朝天 - 项目结构说明（已更新）

## 项目概述

Vue 3 + TypeScript 前端，FastAPI + Python 后端，集成 SillyTavern 的 AI 交互能力，用于“修仙 RPG”原型与玩法验证。

## 顶层结构

```
./
├── src/                     # 前端源代码（Vue 3 + TS, Webpack）
├── server/                  # 后端（FastAPI + Tortoise ORM）
├── webpack/                 # Webpack 插件与辅助脚本
├── 想法资料/                  # 设计文档与提示词套件
├── 修仙世界元素材料/            # 设定与预制数据
├── index.html               # 前端入口模板
├── webpack.config.js        # Webpack 构建配置
├── tsconfig.json            # TypeScript 配置
├── eslint.config.ts         # ESLint 配置
├── config.yaml              # 应用配置
├── aerich.ini               # 数据库迁移配置
├── requirements.txt         # 根级 Python 依赖（如使用）
└── package.json             # 前端依赖与脚本
```

## 前端结构（src/）

- 入口与路由
  - `src/main.ts`、`src/router/index.ts`
  - 全局类型声明：`src/env.d.ts`（统一扩展 Window.TavernHelper）

- 视图与组件
  - `views/`：`CharacterCreation.vue`、`GameView.vue`、`LoginView.vue`、`ModeSelection.vue`
  - `components/character-creation/`：七步创建流程与辅助弹窗
  - `components/common/`：通用 UI（加载、Toast、数据同步、设置等）
  - `components/dashboard/`：主面板与功能区（人物、修行、背包、地图、存档等）

- 状态、服务与组合式
  - `stores/`：`characterCreationStore.ts`、`characterStore.ts`、`uiStore.ts`、`userStore.ts`、`actionQueueStore.ts`
  - `services/`：`api.ts`、`request.ts`、`characterInitialization.ts`、`offlineInitialization.ts`
  - `composables/`：`useCharacterData.ts`、`useTavernData.ts`、`useTavernVariables.ts`

- 类型与数据
  - `types/`：`game.d.ts`（主类型）、`index.ts`（通用类型）、`worldMap.ts`、`location.ts`、`AIGameMaster.d.ts`
  - `data/`：`creationData.ts`、`itemQuality.ts`、`realms.ts`、`thousandDaoData.ts`

- 工具与系统（utils/）
  - AI 与 GM：`AIGameMaster.ts`、`AIBidirectionalSystem.ts`、`tavernCore.ts`、`tavern.ts`、`tavernAI.ts`
  - 提示词：`utils/prompts/*`（gameElement、gameMaster、inGameGMPromptsV2、reasonabilityAudit 等）
  - 世界生成：`worldGeneration/`（`enhancedWorldGenerator.ts`、`cultivationWorldGenerator.ts`、`enhancedWorldPrompts.ts`、`gameWorldConfig.ts`、`sectDataCalculator.ts`、`sectDataValidator.ts`）
  - 数据校验：`gameDataValidator.ts`、`dataValidation.ts`
  - 计算与状态：`attributeCalculation.ts`、`MultiLayerMemorySystem.ts`、`GameStateManager.ts`
  - 其他：`cloudDataSync.ts`、`panelBus.ts`、`localStorageManager.ts`、`toast.ts`、`consolePatch.ts`、`debug.ts`

- 样式
  - 根样式：`src/style.css`
  - 主题与面板：`src/styles/panel-theme.css`、`src/styles/theme-overrides.css`

说明：已移除未使用的 `bright-theme.css`（参见“清理与调整”）。

## 后端结构（server/）

- 入口与基础
  - `main.py`、`auth.py`、`database.py`、`models.py`、`admin.py`

- API 路由
  - `api/api_v1/`：`api.py`、`deps.py`、`endpoints/`（`auth.py`、`users.py`、`characters.py`、`worlds.py`、`talents.py`、`talent_tiers.py`、`origins.py`、`spirit_roots.py`、`rules.py`、`system.py`、`admin.py`、`ai.py`、`ban_management.py`）

- 核心与数据
  - `core/`：`config.py`、`character_calculation.py`、`item_system.py`、`rules/`、`seed_*.py`
  - `crud/`：`crud_user.py`、`crud_world.py`、`crud_talents.py`、`crud_spirit_roots.py`、`crud_origins.py`、`crud_rule.py`、`crud_redemption.py`、`crud_system_config.py` 等
  - `schemas/`：`schema.py`
  - `utils/`：`db_retry.py`
  - 静态资源：`static/admin/index.html`

## 构建与运行

- 前端（Webpack）：
  - 开发：`npm run serve`
  - 构建：`npm run build`
  - 监听：`npm run watch`
  - 代码检查：`npm run lint`、类型检查：`npm run type-check`

- 后端（FastAPI）：
  - 启动：`python server/main.py`
  - 迁移：按 `aerich.ini` 配置执行（如使用 Aerich/Tortoise）

## 清理与调整（本次）

- 移除未使用或重复的文件
  - 删除：`env.d.ts`（项目根，重复声明）、`src/vite-env.d.ts`（项目使用 Webpack 而非 Vite）
  - 删除：`src/styles/bright-theme.css`（未被引用）
  - 删除：`src/utils/SaveManager.ts`、`src/utils/FactionSystem.ts`、`src/utils/thousandDaoManager.ts`（未被项目引用，且逻辑已被更现代的系统替代）

- 类型与配置修订
  - 统一在 `src/env.d.ts` 中扩展 `Window.TavernHelper`（来源：`utils/tavernCore`）
  - `tsconfig.json` 移除根级 `env.d.ts` 的 include，避免重复全局声明

## 代码风格约定

- Vue 文件 PascalCase（如 `CharacterCreation.vue`）
- TypeScript 文件 camelCase（如 `gameDataValidator.ts`）
- Python 文件 snake_case（如 `character_calculation.py`）
- 严格模式 + ESLint + Prettier 规范

## 备注

- 前端技术栈为 Webpack，而非 Vite（原文档已修正）。
- `src/types/index.ts` 与 `src/types/game.d.ts` 同时存在，承担不同层级的类型职责；如需合并可在后续重构中统一口径。

更新时间：2025-09-25  
项目版本：Development
