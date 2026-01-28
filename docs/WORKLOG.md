# 工作记录（自动维护）

> 目标：持续整理/合并前端代码结构、降低重复、提升可维护性；并修复“联机模式日志不生成/不显示”等联机链路问题。  
> 约定：不提交 commit；每次较大改动都在此追加记录，避免上下文丢失。

## 2026-01-27

### 初始化
- 建立本工作记录文档，用于持续追踪重构点、已改内容、待办与验证结果。
- 下一步：从 `src/services` 与“联机日志上报/回显链路”开始下手（改动范围可控、收益高、也最接近“联机不工作”的症状）。

### 服务层整理（进行中）
- 拆分 `src/services/request.ts`：把“HTTP 客户端能力”和“业务 API（auth/创角云端数据/角色存档）”解耦，降低单文件复杂度。
  - 新增 `src/services/httpClient.ts`：集中处理 token、错误解析、toast、401 跳转。
  - 新增 `src/services/api/*`：按业务域拆分（auth / characters / cloudData），便于后续继续迁移其它 API。
  - `src/services/request.ts` 变为对外兼容的“出口文件”（继续保留原有导出名，避免全项目大范围改动）。

### 联机日志上报加固（进行中）
- 新增 `src/services/onlineLogQueue.ts`：为 `/api/v1/travel/note` 增加“静默上报 + 失败入队 + 后续自动补发”的兜底链路。
  - 目的：后端短暂不可用/网络波动时不再“吞掉即消失”，至少保证日志可最终一致送达。
  - 机制：localStorage 队列（`dad_pending_travel_notes_v1`）+ 启动时/成功后自动 `flush`。
- `src/utils/AIBidirectionalSystem.ts`：把原本直接调用 `appendTravelNote` 改为 `tryPostTravelNoteWithQueue`，避免 toast 噪音并提供重试能力。
- `src/components/dashboard/OnlineTravelPanel.vue`：监听 `dad:travel-note-posted` 事件，当前会话日志页可自动刷新（不再需要手动点刷新才看到“刚刚上报”的内容）。
- `src/main.ts`：启动后尝试补发队列中未送达的联机日志。
- `src/views/LoginView.vue`：登录成功后立即补发队列（解决“先入队、后登录但一直没进入联机面板”的情况）。

### 验证（第1遍）
- `npm run type-check`：通过
- `npm run build`：通过（已更新 `dist/XianTu.js`）
- `npm run lint:check`：仅 warning（历史遗留 `any` / unused 变量较多），无 error

### 验证（第2遍）
- `npm run type-check`：通过
- `npm run build`：通过

### 补充验证（联机日志补发触发点）
- 追加登录后补发后，已重新 `npm run type-check` 与 `npm run build`，均通过。

### 关键问题假设（待验证）
- “联机日志”可能因为：未登录/Token 缺失、请求失败未重试、或联机状态字段不完整导致兜底不上报。
- 目前代码已存在两条上报路径：
  - AI 指令 `push 系统.联机.服务器日志`（只上报、不改存档）
  - 兜底：若 AI 未上报，则在联机穿越时调用 `/api/v1/travel/note`
- 如果这两条路径在网络波动/后端短暂不可用时失败，当前实现多为 `console.warn` 吞掉，UI 侧也不会自动补偿/重试，容易表现为“根本没生成”。

