# 大道朝天 - 前端部署指南

## 1. 构建项目
```bash
npm run build
```

## 2. 部署方式
构建完成后，`dist/index.html` 是一个完全自包含的文件，包含了所有CSS和JavaScript。

### 使用 Live Server (推荐)
1. 在 VSCode 中打开 `dist` 文件夹
2. 右键点击 `index.html`
3. 选择 "Open with Live Server"
4. 浏览器会自动打开应用

### 使用其他方式
- 可以直接用任何HTTP服务器托管 `dist/index.html`
- 也可以直接在浏览器中打开 `dist/index.html` 文件

## 3. 后端服务
确保后端服务运行在端口12345：
```bash
cd server
python main.py
```

## 4. 注意事项
- 前端无需指定端口，打包后可在任何端口运行
- 后端API地址已配置为 `http://localhost:12345`
- 如需修改后端地址，请编辑 `src/services/api.ts` 中的 `BASE_URL`