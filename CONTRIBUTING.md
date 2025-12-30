# 贡献指南（Contributing）

感谢你愿意帮助改进《仙途》。

## 开始之前

- 请先在 Issues 搜索是否已有相同问题/需求。
- 如果是较大的改动，建议先开 Issue 讨论方案，再提交 PR。

## 本地开发（前端）

- 环境：Node.js >= 18，npm >= 9
- 安装依赖：`npm install`
- 开发启动：`npm run serve`
- 构建：`npm run build`
- 类型检查：`npm run type-check`
- 代码检查：`npm run lint`（会自动修复）/ `npm run lint:check`（只检查）

## 本地开发（后端，可选）

后端用于提供账号/存档等 API，默认可用 SQLite 开箱即用。

- 复制环境变量示例：把 `server/.env.example` 复制为 `server/.env`
- 安装依赖：`python -m pip install -r server/requirements.txt`
- 启动：`uvicorn server.main:app --reload --port 12345`

## 提交规范

- 尽量保持改动聚焦：一个 PR 解决一个问题。
- PR 描述里写清楚：动机、改了什么、如何验证。
