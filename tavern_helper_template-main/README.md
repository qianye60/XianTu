# tavern_helper_template

酒馆助手编写前端界面或脚本的模板.

## 使用方法

你可以点击网页右上角的绿色 `Code` 按钮-`Download ZIP` 下载本模板的压缩包来只在本地使用, 也可以通过绿色 `Use this template` 按钮来创建一个基于这个模板的新仓库.

无论哪种方式, 请阅读[教程文档](https://stagedog.github.io/青空莉/工具经验/实时编写前端界面或脚本/)来了解如何使用.

### 如果只在本地使用

这意味着

- 你将不能利用 jsdelivr 实现前端界面或脚本的自动更新
- 也不能享受本模板提供的自动打包、自动更新模板、第三方库依赖和酒馆助手 `@types` 文件夹功能

但你本地依旧能很方便地使用这个模板.

如果你想作为仓库使用, 请先通过 [Learn Git Branching](https://learngitbranching.js.org/?locale=zh_CN) 学习 git 分支和合并.

### 如果创建为新仓库

#### `.vscode/launch.json` 文件

由于 `.vscode/launch.json` 文件中填写了你的酒馆地址, 你可能需要运行命令来忽略这个更改, 避免你的云酒馆 ip 地址暴露:

```bash
git update-index --skip-worktree .vscode/launch.json
```

#### 利用 jsdelivr 实现前端界面或脚本的自动更新

由于你所制作的前端界面或脚本将被打包在 github 仓库中, 你将能用 jsdelivr 链接来访问它们, 而这个链接可以在前端界面或脚本中直接使用.

由此你就可以为用户创建这样一个自动更新的前端界面:

```html
<body>
  <script>
    $('body').load('https://testingcf.jsdelivr.net/gh/lolo-desu/lolocard/dist/日记络络/界面/介绍页/index.html')
  </script>
</body>
```

或一个自动更新的脚本:

```typescript
import 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/场景感/index.js'
```

更多请见于[文档](https://stagedog.github.io/青空莉/工具经验/实时编写前端界面或脚本/进阶技巧).

#### 自动打包、自动更新模板、第三方库依赖和酒馆助手 `@types` 文件夹

本仓库在 `.github/workflows` 文件夹中设置了几个 CI 工作流来为你带来自动打包、自动自动更新依赖和酒馆助手 `@types` 文件夹的功能, 你也可以在网页上方的 `Actions` 中手动运行它们:

- `bundle.yaml`: 自动打包 `src` 文件夹中的代码到 `dist` 文件夹中, 并自动递增版本号从而让 jsdelivr 更快更新缓存.
- `bump_deps.yaml`: 自动更新第三方库依赖和酒馆助手 `@types` 文件夹.
- `sync_template.yaml`: 在你基于模板仓库创建新仓库后, 你的新仓库将不再和模板仓库有关联, 因此我设置了这个工作流用于同步模板仓库的更新 (如编程助手编写规则、MCP、slash_command.txt 文件等). 如果模板仓库中有文件是你不想继续同步的, 可以在 `.github/.templatesyncignore` 中添加它.

#### 打包冲突问题

为了自动更新和打包一些东西, 本项目直接打包源代码在 `dist/` 文件夹中并随仓库上传, 而这会让开发时经常出现分支冲突.

为了解决这一点, 仓库在 `.gitattribute` 中设置了对于 `dist/` 文件夹中的冲突总是使用当前版本. 这不会有什么问题: 在上传后, ci 会将 `dist/` 文件夹重新打包成最新版本, 因而你上传的 `dist/` 文件夹内容如何无关紧要.

为了启用这个功能, 请执行一次以下命令:

```bash
git config --global merge.ours.driver true
```

## 许可证

[Aladdin](LICENSE)
