---
description: 当用户输入中明确提及 MVU 时, 你应该参考本文件
---
# MVU 变量框架 ([MagVarUpdate](https://github.com/MagicalAstrogy/MagVarUpdate))

MVU 变量框架是一个独立的酒馆助手脚本. 它作用于消息楼层变量, 允许酒馆角色卡作者在世界书中设置消息楼层变量, 在世界书或聊天记录中初始化消息楼层变量, 及用 AI 输出更新消息楼层变量.

`@types/iframe/exported.mvu.d.ts` 中定义了 MVU 变量框架的接口. 如果提及到 "MVU 变量" 而非仅仅提及 "变量", 则应该优先使用 MVU 变量框架的接口.

## 数据存储

MVU 将变量数据存储在 `_.get(某楼层变量, 'stat_data')` 中, 因此 `_.get(getVariables({type: 'message', message_id: 5}), 'stat_data')` 等价于 `Mvu.getMvuData({type: 'message', message_id: 5})`.

此外, 它还会在变量中设置 `display_data` 和 `delta_data` 字段, 用于存储变量变化的可视化表示, 方便在前端显示变量变化.

## 自行解析变量

当酒馆因用户输入或 AI 输出等而产生新消息楼层时, MVU 会自动解析消息字符串中的 MVU 命令, 并根据它更新消息楼层变量. 但通过 `generate` 等接口自行生成 AI 输出时, 不会产生新消息楼层, 因此不会自动解析 MVU 命令.

为此, MVU 提供了 `parseMessage` 接口用于自行解析包含 MVU 命令的消息字符串. 它读取旧变量情况和一个消息字符串, 得到更新后的变量结果.

为了更好的细粒度控制, 解析不会将结果写回消息楼层. 如果需要写回, 则应执行 `replaceMvuData`.

## 事件

除了 `getMvuData` 等接口外, MVU 还提供了一些事件, 用于监听变量变化并在那时调整变量或执行其他功能.
