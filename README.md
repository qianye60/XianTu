<p align="center">
  <img src="https://ddct.top/XianTu.png">
</p>

<h1 align="center">仙途（Xian Tu）</h1>

<p align="center">
  <strong>AI 驱动的沉浸式修仙文字冒险游戏</strong>
</p>

<p align="center">
  <a href="#功能概览">功能</a> •
  <a href="#技术栈">技术栈</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#更新日志">更新日志</a> •
  <a href="#许可证">许可证</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3-4FC08D?style=flat-square&logo=vue.js&logoColor=white" alt="Vue 3"/>
  <img src="https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Pinia-yellow?style=flat-square&logo=vue.js&logoColor=white" alt="Pinia"/>
  <img src="https://img.shields.io/badge/Webpack-5-8DD6F9?style=flat-square&logo=webpack&logoColor=black" alt="Webpack"/>
  <img src="https://img.shields.io/badge/Python-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/AI-Gemini-4285F4?style=flat-square&logo=google&logoColor=white" alt="Gemini"/>
  <img src="https://img.shields.io/badge/AI-Claude-orange?style=flat-square&logo=anthropic&logoColor=white" alt="Claude"/>
  <img src="https://img.shields.io/badge/AI-OpenAI-412991?style=flat-square&logo=openai&logoColor=white" alt="OpenAI"/>
  <img src="https://img.shields.io/badge/SillyTavern-兼容-purple?style=flat-square" alt="SillyTavern"/>
</p>

<p align="center">
  <img src="https://visitor-badge.laobi.icu/badge?page_id=qianye60.XianTu&left_color=gray&right_color=blue" alt="visitors"/>
  <img src="https://img.shields.io/github/stars/qianye60/XianTu?style=flat-square&color=yellow" alt="stars"/>
  <img src="https://img.shields.io/github/forks/qianye60/XianTu?style=flat-square" alt="forks"/>
  <img src="https://img.shields.io/github/license/qianye60/XianTu?style=flat-square" alt="license"/>
</p>

<p align="center">
  <a href="https://qianye60.github.io/XianTu/游戏介绍.html">📖 游戏介绍</a> •
  <a href="https://www.ddct.top/">🎮 在线体验</a>
</p>

---

## ✨ 功能概览

🤖 **AI 动态叙事** — 支持 Gemini / Claude / OpenAI / DeepSeek 等多种大模型，实时生成个性化剧情

⚔️ **完整修仙体系** — 境界突破、三千大道、功法修炼、装备炼制、NPC 互动

🎲 **智能判定系统** — 基于境界、属性、装备、功法等多维度计算判定结果

💾 **多存档管理** — 多角色、多存档槽位，支持导入导出与云同步

🗺️ **开放世界** — 自由探索朝天大陆，触发奇遇事件，建立人物关系网络

📱 **全平台适配** — 完美支持桌面端与移动端，亮/暗双主题

🍺 **酒馆兼容** — 支持 SillyTavern 嵌入式环境与独立网页版

---

## 🛠️ 技术栈

|        前端        |        后端         |     AI      |
| :----------------: | :-----------------: | :---------: |
| Vue 3 + TypeScript |  Python + FastAPI   | Gemini API  |
|   Pinia 状态管理   | SQLite / PostgreSQL | Claude API  |
|     Vue Router     |      JWT 认证       | OpenAI API  |
|      Webpack       |      WebSocket      | SillyTavern |
| Chart.js + Pixi.js |                     |  DeepSeek   |
|     IndexedDB      |                     |             |

---

## 🚀 快速开始

### 前端

```bash
# 安装依赖
npm install

# 开发模式
npm run serve

# 生产构建
npm run build
```

### 后端（可选）

后端用于提供账号/存档等 API，默认使用 SQLite，开箱即用。

```bash
pip install -r server/requirements.txt
uvicorn server.main:app --reload --port 12345
```

环境变量配置见 `server/.env.example`

---

## 📖 更新日志

查看完整更新历史：[CHANGELOG.md](./CHANGELOG.md)

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 许可证

本项目采用 **非商业许可** 发布，详见 [LICENSE](./LICENSE)。

如需商用（包括但不限于：收费分发、付费服务、商业化集成、以盈利为目的的推广/运营），请联系作者获取书面商业授权。

---

<p align="center">
  <sub>如果觉得有帮助，请给个 ⭐ Star 支持一下！</sub>
</p>
