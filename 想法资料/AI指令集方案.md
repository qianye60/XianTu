# AI指令集与双向数据流系统方案

## 1. 核心目标：实现AI与酒馆的“状态感知”交互

本系统的核心目标是建立一个闭环、双向的数据流，让AI不仅能通过指令**改变**酒馆世界的状态，还能**感知**到这些变化，并基于最新的状态做出更智能、更连贯的决策。

这解决了传统指令系统的“盲目性”问题，使AI从一个简单的指令发出者，升级为一个能够进行有状态交互的智能伙伴。

## 2. 系统架构：AIBidirectionalSystem

我们设计并实现了一个名为 `AIBidirectionalSystem` 的核心系统，它自动完成以下所有工作：

- **监听AI回复**: 实时捕获AI生成的内容。
- **解析指令**: 自动从AI的回复中提取`tavern_commands` JSON代码块。
- **执行指令**: 安全地执行`set`, `add`, `delete`, `push`, `pull`等操作。
- **状态快照与比对**: 记录指令执行前后的变量变化，生成清晰的“变更日志”。
- **上下文注入**: 在下一次AI生成请求前，自动将“执行结果”和“当前关键变量状态”注入到提示词中。

## 3. 工作流程 (The Loop)

```
+--------------------------+
| 1. AI 生成回复           |
| (包含指令JSON)         |
+-----------+--------------+
            |
            v
+-----------+--------------+
| 2. 系统捕获回复并解析    |
| `AIBidirectionalSystem`  |
+-----------+--------------+
            |
            v
+-----------+--------------+
| 3. 执行指令 & 计算变更   |
| (set, add, push, etc.)   |
+-----------+--------------+
            |
            v
+-----------+--------------+
| 4. 用户发送下一条消息    |
+-----------+--------------+
            |
            v
+-----------+--------------+
| 5. 系统注入上下文到提示词|
| (执行结果 + 当前状态)    |
+-----------+--------------+
            |
            v
+-----------+--------------+
| 6. AI 接收到包含状态的   |
|    提示词，做出新回复    |
+--------------------------+
```

## 4. AI需要生成的指令格式

AI需要在其回复中，通过Markdown的JSON代码块提供指令。

**基本结构:**
```json
{
  "tavern_commands": [
    {
      "action": "set|add|delete|push|pull",
      "scope": "global|chat|character|message",
      "key": "variable.path.to.change",
      "value": "the_value"
    }
  ]
}
```

### 操作详解

- **`set`**: 设置或覆盖一个变量。
  ```json
  {"action": "set", "scope": "chat", "key": "player.hp", "value": 100}
  ```
- **`add`**: 对一个数值进行加减。
  ```json
  {"action": "add", "scope": "chat", "key": "player.gold", "value": -10}
  ```
- **`delete`**: 删除一个变量。
  ```json
  {"action": "delete", "scope": "chat", "key": "enemy.is_stunned"}
  ```
- **`push`**: 向数组末尾添加一个元素。
  ```json
  {"action": "push", "scope": "chat", "key": "player.inventory", "value": "Health Potion"}
  ```
- **`pull`**: 从数组中移除所有匹配的元素。
  ```json
  {"action": "pull", "scope": "chat", "key": "player.inventory", "value": "Useless Junk"}
  ```

## 5. 上下文注入：AI如何“看到”结果

这是系统的核心。在AI生成下一次回复前，系统会自动向提示词中添加一个系统笔记，格式如下：

```
[System Note: AI Command Execution Feedback]
Summary: 执行了 2 条指令，2 成功，0 失败。
Variable Changes:
- chat.player.gold: from 100 to 130
- chat.game.last_enemy: from undefined to "Goblin"

Current State:
- chat: {"player":{"gold":130,"inventory":["Sword"]},"game":{"last_enemy":"Goblin"}}
- global: {"world_time":"Day 1"}
[End of System Note]
```

这个上下文能让AI清楚地知道：
- **上一条指令成功了吗？** (`Summary`)
- **具体哪些数据改变了？** (`Variable Changes`)
- **现在所有的关键数据是什么？** (`Current State`)

## 6. 如何使用

1.  **安装**: 将 `src` 文件夹中的所有 `.js` 文件放入酒馆的 `scripts` 目录。
2.  **加载**: 在酒馆的脚本面板中，确保 `index.js` 被加载。
3.  **提示词引导**: 在你的角色卡或世界信息中，引导AI在需要操作数据时，使用`tavern_commands`格式。

**示例引导:**
> (OOC: 当你需要改变游戏状态，如增减玩家金币、修改库存或更新任务状态时，请在你的回复中使用```json ... ```代码块，并遵循`tavern_commands`格式来下达指令。)

---

现在，整个系统已经准备就绪，可以实现真正动态和有状态的AI交互了。