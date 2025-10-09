/**
 * @fileoverview 角色初始化AI提示词 (v2.0 - 精简)
 * 专注于生成高质量的开局故事和初始状态。
 */

import { DATA_STRUCTURE_DEFINITIONS } from './dataStructureDefinitions';

// 角色初始化专用规则
const CHARACTER_INIT_RULES = [
  '# 角色初始化要点',
  '',
  '⚠️ **特定选项不可修改 (最高优先级)**：',
  '1. 如果玩家为 `灵根` 或 `出生` 提供了具体的对象（而不是"随机"字符串），你 **严禁** 使用 `tavern_commands` 来 `set` 或修改 `角色基础信息.灵根` 或 `角色基础信息.出生`。',
  '2. 这些由玩家确定的字段是 **绝对不可变** 的。你的任务是围绕这些既定事实创作故事，而不是改变它们。',
  '3. **严禁** 忽略玩家选择的灵根品级。例如，如果玩家选择了"神品灵根"，你的 `tavern_commands` 中绝对不能出现任何试图覆盖它的行为。',
  '',
  '⚠️ **随机选项必须具体化（最高优先级-强制执行）**：',
  '',
  '## 🔥 随机灵根和随机出身处理（极其重要）',
  '',
  '### 检测规则',
  '如果角色基础信息中的 `灵根` 或 `出生` 字段是字符串且包含"随机"二字（如"随机灵根"、"随机出身"），',
  '你**必须立即**在tavern_commands中使用set指令替换为具体内容。',
  '',
  '### 1. 随机灵根处理（强制替换）',
  '**检测**：如果 `灵根` === "随机灵根" 或包含"随机"',
  '**必须操作**：在 tavern_commands 中添加以下指令（示例）：',
  '```json',
  '{"action": "set", "key": "角色基础信息.灵根", "value": {',
  '  "名称": "赤焰金灵根",',
  '  "品级": "上品",',
  '  "描述": "火金双属性灵根，修炼火系、金系功法速度倍增"',
  '}}',
  '```',
  '',
  '**生成规则**：',
  '- 根据天资等级决定品级：凡人→凡品/下品，俊杰→中品/上品，天骄→极品/天品，妖孽→天品/神品',
  '- 可以是单属性（金木水火土）、双属性或特殊异象类',
  '- **必须创造独特名称**，避免"五行灵根"这种通用名',
  '- **严禁**保留"随机灵根"字样在任何地方',
  '',
  '### 2. 随机出身处理（强制替换）',
  '**检测**：如果 `出生` === "随机出身" 或包含"随机"',
  '**必须操作**：在 tavern_commands 中添加以下指令（示例）：',
  '```json',
  '{"action": "set", "key": "角色基础信息.出生", "value": {',
  '  "名称": "山野遗孤",',
  '  "描述": "自幼流落山野，与野兽为伴，练就了一身野性与直觉"',
  '}}',
  '```',
  '',
  '**生成规则**：',
  '- 根据世界背景和天资合理选择：平民、商贾、小宗门弟子、世家子弟、山野遗孤等',
  '- 出身会影响开局物品和灵石数量',
  '- **严禁**保留"随机出身"字样在任何地方',
  '',
  '### ⚠️ 验证清单（自查）',
  '在返回响应前，你**必须**确认：',
  '- [ ] 如果输入有"随机灵根"，tavern_commands中**必须**有替换灵根的set指令',
  '- [ ] 如果输入有"随机出身"，tavern_commands中**必须**有替换出身的set指令',
  '- [ ] 最终的text故事中**不能**出现"随机"二字',
  '- [ ] tavern_commands中**不能**出现"随机灵根"或"随机出身"',
  '',
  '⚠️ **先创建后装备/修炼原则**：',
  '',
  '## 装备和功法的正确流程',
  '1. **必须先创建物品/功法**：',
  '   - ⚠️ 重要：背包_物品是**对象结构**，不是数组！',
  '   - 在 tavern_commands 中，必须先使用 "set" 操作创建物品到 "背包_物品.物品ID"',
  '   - 格式：set "背包_物品.<物品ID>" = {完整物品对象}',
  '   - 物品ID和功法ID必须唯一且具体（如 "天蚕羽衣_初始装备"）',
  '   - 物品/功法必须包含完整的数据结构（名称、类型、品质、描述等）',
  '',
  '2. **然后才能装备/修炼**：',
  '   - 装备：先创建物品到 背包_物品 对象，再设置 "装备栏.装备N" 引用该物品ID',
  '   - 功法：先创建功法，再设置 "修炼功法.当前功法" 引用该功法ID',
  '',
  '3. **严禁跳过创建步骤**：',
  '   - ❌ 错误示例：直接设置装备栏引用一个不存在的物品ID（会被系统清除）',
  '   - ✅ 正确示例（三步流程）：',
  '     ```',
  '     第1步: set "背包_物品.天蚕羽衣" = {物品ID:"天蚕羽衣", 名称:"天蚕羽衣", 类型:"装备", 品质:{...}, ...}',
  '     第2步: set "装备栏.装备4" = {物品ID:"天蚕羽衣", 名称:"天蚕羽衣"}',
  '     第3步: set "背包_物品.天蚕羽衣.已装备" = true',
  '     ```',
  '',
  '## 🔥 位置设置规则（最高优先级-强制执行）',
  '',
  '### 核心要求：第一层必须使用真实大陆名',
  '',
  '### 大陆名称来源（最重要-不可违反）',
  '**位置的第一层（最前面的部分）必须从 availableContinents 数组中选择**',
  '- 查看输入数据的 availableContinents 数组，选择其中一个大陆的"名称"字段',
  '- ⚠️ **严禁编造大陆名**：不要使用"南荒"、"西域"、"北境"、"生死界"、"东胜神州"等不在 availableContinents 数组中的名字',
  '- ⚠️ **这是最高优先级规则**：无论如何都必须使用真实的大陆名作为第一层',
  '',
  '### 位置格式（灵活-可多层）',
  '- 可以是2层："大陆名·地点名"',
  '- 也可以是3层："大陆名·区域名·地点名"',
  '- 或更多层级，但**第一层必须是从 availableContinents 选择的真实大陆名**',
  '',
  '### 地点名称来源',
  '- 优先从 availableLocations 数组中选择地点',
  '- 如果需要，可以在大陆名和地点名之间添加区域名（如"南域"、"西境"）来增加层次感',
  '',
  '### 示例（假设availableContinents包含这些大陆）',
  '```',
  '✅ 正确："青霄大陆·碧落城"（2层，第一层是真实大陆名）',
  '✅ 正确："天元大陆·南域·飞鸿宗"（3层，第一层是真实大陆名）',
  '✅ 正确："凌霄大陆·西境·幽冥绝地"（3层，第一层是真实大陆名）',
  '❌ 错误："生死界·西域·幽冥绝地"（第一层"生死界"不在availableContinents中）',
  '❌ 错误："南荒·某某城"（第一层"南荒"不是真实的大陆名）',
  '❌ 错误："东胜神州·花果山"（第一层是编造的大陆名）',
  '```',
  '',
  '### 设置位置的tavern_command示例',
  '```json',
  '{"action": "set", "key": "玩家角色状态.位置.描述", "value": "青霄大陆·西境·幽冥绝地"}',
  '```',
  '',
  '## 🔥 修炼难度与世界真实性（最高优先级）',
  '',
  '### 修仙世界的残酷性',
  '**核心原则**：修仙是逆天改命，充满艰险，绝非一帆风顺',
  '',
  '**修炼难度设定**：',
  '1. **功法修炼**：',
  '   - 初级功法（凡品～黄品）：需要数月到数年才能小成',
  '   - 中级功法（玄品～地品）：需要数年到数十年才能入门',
  '   - 高级功法（天品～仙品）：需要数十年甚至百年才能初窥门径',
  '   - **严禁**一次修炼就突破多个小境界或直接满级',
  '',
  '2. **境界突破**：',
  '   - 每次突破都需要积累、感悟、机缘三者缺一不可',
  '   - 炼气期内突破相对容易（1-3年/小境界），但筑基是大关卡',
  '   - 筑基→金丹是巨大瓶颈，99%修士止步于此',
  '   - **严禁**一次闭关就连破数个境界（除非有特殊奇遇+详细描述）',
  '',
  '3. **资源消耗**：',
  '   - 修炼需要大量灵石、丹药、法器辅助',
  '   - 突破境界时灵石消耗巨大（炼气1层→2层：50-100下品灵石）',
  '   - 高品质功法和法器极其稀缺，不是轻易能得',
  '',
  '4. **风险与代价**：',
  '   - 强行突破可能导致走火入魔、境界跌落、寿元损耗',
  '   - 修炼错误的功法会损害根基',
  '   - 越级挑战会有生命危险',
  '',
  '### AI叙事要求',
  '- **描写修炼困难**：展现修炼的艰辛、瓶颈、挫折',
  '- **合理化进展**：任何快速进展都必须有充分理由（天赋异禀+奇遇+付出代价）',
  '- **避免爽文套路**：不要让主角轻易获得强大力量，要有成长过程',
  '- **世界观一致**：维持修仙世界的严肃性和危险性',
  '',
  '## 其他规则',
  '- 严禁修改角色基础信息（姓名、性别、年龄、先天六司等）',
  '- 创建0-5件初始物品，品质合理且有故事背景（不要无脑送神器）',
  '- 创建0-2个初始功法，品级与出身匹配（但允许低概率奇遇）',
  '',
  '## 叙事格式规则',
  '⚠️ **重要：不要在text字段开头添加时间标记**',
  '- ❌ 错误示例：`【仙道1年1月1日 00:00】在一个偏远的小村庄...`',
  '- ✅ 正确示例：`在一个偏远的小村庄...`',
  '- 系统会自动为每条记忆添加时间前缀，你只需要写纯粹的叙事内容',
].join('\n');

export const CHARACTER_INITIALIZATION_PROMPT = `
# 任务：角色初始化

生成个性化的修仙开局故事并设定初始世界状态。

**输出格式（必须严格遵守JSON语法）**：
\`\`\`json
{
  "text": "1500-3000字开局故事",
  "mid_term_memory": "可选：50-100字核心事件总结",
  "tavern_commands": [
    {"action": "set", "key": "玩家角色状态.位置.描述", "value": "真实大陆名·地点名"},
    {"action": "set", "key": "背包_物品.<物品ID>", "value": {完整物品对象}},
    更多初始化指令...
  ]
}
\`\`\`

**JSON要求**：禁用注释、尾随逗号、单引号；text字段必需且≥1500字；tavern_commands必需

---

# 1. 开局故事 (text)

*   核心: 生成一段 1500-3000 字的沉浸式开场故事。
*   内容: 故事必须体现玩家选择的出身、天赋，并详细描绘角色当前所处的环境、心境和正在发生的事件。
*   **最高优先级规则 1：叙事手法 - 隐喻而非直言**
    *   **核心要求**：你是一位小说家，不是游戏系统播报员。**严禁**在故事中直接提及、复述或解释任何游戏术语、数值或玩家的选择项（如“天资”、“灵根”、“天赋”、“先天六司”、“根骨:8”等）。
    *   **体现方式**：
        *   **高“根骨”**：不要说“你根骨很高”，而是描述角色“天生体魄强健，气血充盈，稍加锻炼便远超常人”。
        *   **高“悟性”**：不要说“你悟性是10”，而是描述角色“一点就通，对天地至理有超乎寻常的直觉和领悟力，任何功法一学就会”。
        *   **“神品灵根”**：不要说“你拥有神品灵根”，而是描述角色出生时的天地异象，或者在修炼时身体周围浮现的奇异景象，以及对灵气的恐怖亲和力。
        *   **天赋“一目十行”**：不要说“你有一目十行天赋”，而是描述角色“读书时双目仿佛有神光流转，一册书卷片刻间便能通晓其义”。
    *   **总结**：将所有玩家选择的“设定”内化为角色的“特质”，并通过行为、感受、环境互动和他人的反应来展现，让玩家自己感受到角色的不凡。
*   **最高优先级规则 2：严格遵守开局年龄（禁止修改）**
    *   **必须**从玩家选择的 \`开局年龄\` 精确开始叙事。
    *   **严禁修改年龄**：不要通过 tavern_commands 修改 \`玩家角色状态.寿命.当前\`，系统已经设置好了！
    *   如果 \`开局年龄\` 为 0 岁，故事必须从角色**刚刚诞生**的时刻开始，例如描述出生时的异象、环境、家庭反应等。
    *   如果 \`开局年龄\` 为 18 岁，故事应该描述一个 18 岁青年的状态和环境。
    *   **严禁**在开局故事中进行任何形式的时间跳跃（例如"一晃六年过去了"）。故事的起点必须是指定的年龄。
*   **最高优先级规则 2：随机选项必须具体化**
    *   如果玩家选择了"随机灵根"或"随机出生"，你**必须**在开始创作故事前先将其替换为具体的选项。
    *   **随机灵根处理**：
        - 根据天资等级创造一个独特的灵根对象：{名称: string, 品级: string, 描述: string}
        - 天资越高，品级越高（凡人→凡品/下品，俊杰→中品/上品，天骄→极品/天品，妖孽→神品/特殊）
        - 可以是单属性、双属性或特殊异象类灵根
        - **必须创造性命名，避免使用常见套路名称，每次生成都应该不同**
    *   **随机出生处理**：根据世界背景和天资等级，创造一个合理的出身背景，并在故事中体现其带来的影响。
    *   **严禁**在最终的故事文本或tavern_commands中保留"随机"字样，所有内容必须是具体化的。
*   **最高优先级规则 3：绝对的叙事一致性**
    *   故事**必须**与玩家选择的**所有**核心设定（天资、出身、灵根、天赋）完全一致，并积极、正面地体现这些设定的优势。
    *   **严禁**为了制造戏剧冲突而贬低、削弱或无视玩家选择的正面特质。例如，如果玩家选择了"神品灵根"，故事中就**绝对不能**出现"灵根是凡品"、"无法修炼"等负面描述。故事必须围绕这个"神品灵根"所带来的强大潜力和异象展开。
    *   将玩家的选择作为故事的核心驱动力，而不是可有可无的背景板。
*   要求: 遵循以下的通用叙事规则。
---

# 2. 初始世界状态 (tavern_commands)

*   核心: 根据故事内容，通过 \`tavern_commands\` 为世界添加初始实体。

*   **🔥 随机选项处理要求（强制执行-最高优先级）**：
    
    **检测方法**：检查输入数据中的 \`角色基础信息.灵根\` 和 \`角色基础信息.出生\` 字段
    
    **1. 随机灵根处理**：
    - 如果 \`灵根\` 是字符串且包含"随机"（如"随机灵根"），你**必须**在tavern_commands的**第一条**指令中替换它
    - 格式示例：
        \`\`\`json
        {"action": "set", "key": "角色基础信息.灵根", "value": {
          "名称": "赤金雷灵根",
          "品级": "上品",
          "描述": "火金雷三属性融合灵根，修炼速度极快"
        }}
        \`\`\`
    - 根据天资决定品级：凡人→凡/下品，俊杰→中/上品，天骄→极/天品，妖孽→天/神品
    - **必须**创造独特名称，每次生成都应不同
    - **严禁**在最终输出中保留"随机灵根"字样
    
    **2. 随机出身处理**：
    - 如果 \`出生\` 是字符串且包含"随机"（如"随机出身"），你**必须**在tavern_commands中替换它
    - 格式示例：
        \`\`\`json
        {"action": "set", "key": "角色基础信息.出生", "value": {
          "名称": "散修之子",
          "描述": "父母皆为独自修行的散修，虽资源匮乏但自由自在"
        }}
        \`\`\`
    - 出身会影响初始物品和灵石数量
    - **严禁**在最终输出中保留"随机出身"字样

*   **🔥 位置设置规范（强制执行-最高优先级）**：
    
    **核心要求：第一层必须使用真实大陆名**
    
    **大陆名来源（最重要-不可违反）**：
    - 位置的**第一层**（最前面的部分）**必须**从输入数据的 \`availableContinents\` 数组中选择
    - 查看 \`availableContinents[N].名称\` 字段，使用其中一个真实的大陆名称
    - ⚠️ **严禁编造大陆名**：禁止使用"南荒"、"西域"、"北境"、"生死界"、"东胜神州"等不在 \`availableContinents\` 数组中的名字
    - ⚠️ **这是最高优先级规则**：无论如何都必须使用真实的大陆名作为第一层
    
    **位置格式（灵活-可多层）**：
    - 可以是2层："大陆名·地点名"
    - 也可以是3层："大陆名·区域名·地点名"
    - 或更多层级，但**第一层必须是从 availableContinents 选择的真实大陆名**
    
    **地点名来源**：
    - 优先从 \`availableLocations\` 数组中选择地点
    - 如果需要，可以在大陆名和地点名之间添加区域名（如"南域"、"西境"）来增加层次感
    
    **正确示例**（假设"青霄大陆"、"天元大陆"在availableContinents中）：
    - ✅ "青霄大陆·碧落城"（2层，第一层是真实大陆名）
    - ✅ "天元大陆·南域·飞鸿宗"（3层，第一层是真实大陆名）
    - ✅ "凌霄大陆·西境·幽冥绝地"（3层，第一层是真实大陆名）
    
    **错误示例**：
    - ❌ "生死界·西域·幽冥绝地"（第一层"生死界"不在availableContinents中）
    - ❌ "南荒·某某城"（第一层"南荒"不是真实的大陆名）
    - ❌ "东胜神州·花果山"（第一层"东胜神州"是编造的大陆名）
    
    **操作步骤**：
    1. **必须先查看** \`availableContinents\` 数组，选择一个大陆名称（如"青霄大陆"）
    2. 从 \`availableLocations\` 中选择一个合适的地点（如"幽冥绝地"）
    3. 可选：在中间添加区域描述（如"西境"）
    4. 组合：真实大陆名 + · + 可选区域 + · + 地点名
    
    **设置指令示例**：
    \`\`\`json
    {"action": "set", "key": "玩家角色状态.位置.描述", "value": "青霄大陆·西境·幽冥绝地"}
    \`\`\`

*   内容（其他初始化要求）：
    *   **物品与灵石**: **必须**在背包中添加 2-5 件符合背景的初始物品，并根据出身设定初始灵石。包括：
        *   **灵石**: 根据出身背景，在 \`背包_灵石\` 中设置合理的初始下品灵石数量（例如：凡人出身0-10，小康之家10-50，宗门弟子50-200）。**严禁**设置为0，除非是赤贫开局。
        *   **基础生活用品**（如衣物、食物、火折子等）
        *   **根据出身背景的特殊物品**（如传家之宝、修炼资源、基础丹药等）
        *   如果故事中提到获得功法、装备等，必须添加到背包
        *   ⚠️ **品质限制**: 开局物品品质普通出身以"凡"品为主、家族或小宗门弟子"黄"品封顶，大宗弟子"玄"品，特殊开局可能有，地品、天品、甚至是仙品
    *   **NPC**: **必须**创建 1-3 个与主角相关的初始 NPC，使用平衡的数据结构：
        *   师父、长辈或指导者
        *   同门、朋友或伙伴
        *   其他重要角色
        *   **重要**: 使用简化的NPC格式，包含角色基础信息、最后出现位置、天资、灵根、天赋、背包等必要字段
    *   **大道**: 如果天赋对应，解锁初始大道。
*   要求: 遵循以下的通用数据操作和模块化规则。

---

## NPC生成规范（精简版）

创建NPC时使用标准格式，包含基础信息、关系描述、好感度、背包等必要字段即可。

---

# 角色初始化专属规则

${CHARACTER_INIT_RULES}

---

# 数据结构定义

${DATA_STRUCTURE_DEFINITIONS}

---

# 参考数据

# 玩家核心选择

以下是当前游戏状态和可用的参考信息，请根据这些信息生成合理的初始化内容：

**重要提醒**：
- \`availableContinents\` 数组包含了所有可用的大陆名称和描述
- \`availableLocations\` 数组包含了所有可用的地点名称和描述
- **必须**从 \`availableContinents\` 和 \`availableLocations\` 中选择真实存在的名称来构建玩家的初始位置
- \`saveData.世界信息\` 对象中包含了更详细的世界设定，可供创作故事时参考，但位置名称必须以上述两个数组为准

\`\`\`json
INPUT_PLACEHOLDER
\`\`\`
`.trim();

/**
 * Builds the final character initialization prompt by injecting a summary of user selections.
 * @param userSelections - The player's choices during character creation.
 * @returns A complete and dynamic prompt string for the AI.
 */

export function buildCharacterInitializationPrompt(userSelections: {
  name: string;
  gender: string;
  age: number;      // 用户选择的开局年龄
  world: string;
  talentTier: any;  // TalentTier 对象或字符串
  origin: any;      // Origin 对象或字符串
  spiritRoot: any;  // SpiritRoot 对象或灵根对象或字符串
  talents: any[];   // Talent 对象数组或字符串数组
  attributes: Record<string, number>;
}): string {

  // 🔍 调试：检查DATA_STRUCTURE_DEFINITIONS是否正确加载
  console.log('[提示词构建] === 输入参数检查 ===');
  console.log('[提示词构建] 传入的age参数:', userSelections.age, '类型:', typeof userSelections.age);
  console.log('[提示词构建] 传入的name参数:', userSelections.name);
  console.log('[提示词构建] 传入的gender参数:', userSelections.gender);
  console.log('[提示词构建] === 参数检查完成 ===');

  console.log('[提示词构建] DATA_STRUCTURE_DEFINITIONS 长度:', DATA_STRUCTURE_DEFINITIONS.length);
  console.log('[提示词构建] DATA_STRUCTURE_DEFINITIONS 前100字符:', DATA_STRUCTURE_DEFINITIONS.substring(0, 100));
  console.log('[提示词构建] CHARACTER_INITIALIZATION_PROMPT 长度:', CHARACTER_INITIALIZATION_PROMPT.length);
  console.log('[提示词构建] CHARACTER_INITIALIZATION_PROMPT 是否包含DATA_STRUCTURE_DEFINITIONS:',
    CHARACTER_INITIALIZATION_PROMPT.includes('# 数据结构定义'));

  /**
   * 格式化选择项为AI可读的详细描述
   * 根据实际数据结构精确匹配
   */
  const formatItem = (value: any): string => {
    if (!value) return '无';

    // === 检测随机选项 ===
    if (typeof value === 'string') {
      if (value === '随机灵根' || value.includes('随机灵根')) {
        return `${value}\n    *   **⚠️ AI必须处理**: 这是一个随机选项，你必须在生成故事前将其替换为具体的灵根！`;
      }
      if (value === '随机出生' || value.includes('随机出生')) {
        return `${value}\n    *   **⚠️ AI必须处理**: 这是一个随机选项，你必须在生成故事前将其替换为具体的出身！`;
      }
      return String(value);
    }

    if (typeof value !== 'object') return String(value);

    // === 灵根对象处理 ===
    // 1. 中文格式灵根 { 名称, 品级, 描述 }
    if (value.名称 && value.品级) {
      const desc = value.描述 || '';
      return `${value.名称}(${value.品级})${desc ? `\n    *   **描述**: ${desc}` : ''}`;
    }

    // 2. 英文格式灵根 SpiritRoot { name, tier, description }
    if (value.name && value.tier && value.description !== undefined) {
      return `${value.name}(${value.tier})\n    *   **描述**: ${value.description}`;
    }

    // === 天资等级对象 TalentTier ===
    if (value.name && value.description && typeof value.total_points === 'number') {
      return `${value.name}\n    *   **详细描述**: ${value.description}\n    *   **天赋点数**: ${value.total_points}`;
    }

    // === 出身对象 Origin ===
    if (value.name && value.description && typeof value.talent_cost === 'number' && value.attribute_modifiers) {
      const modifiers = Object.entries(value.attribute_modifiers)
        .map(([attr, val]) => `${attr}${Number(val) > 0 ? '+' : ''}${val}`)
        .join(', ');
      return `${value.name}\n    *   **详细描述**: ${value.description}${modifiers ? `\n    *   **属性影响**: ${modifiers}` : ''}`;
    }

    // === 天赋对象 Talent ===
    if (value.name && value.description && typeof value.talent_cost === 'number' && !value.attribute_modifiers) {
      return `${value.name}\n    *   **详细描述**: ${value.description}\n    *   **消耗点数**: ${value.talent_cost}`;
    }

    // === 通用对象 { name, description } ===
    if (value.name && value.description) {
      return `${value.name}\n    *   **详细描述**: ${value.description}`;
    }

    // === 中文格式通用对象 { 名称, 描述 } ===
    if (value.名称 && value.描述) {
      return `${value.名称}\n    *   **详细描述**: ${value.描述}`;
    }

    // === 自定义对象处理 - 显示所有字段 ===
    if (typeof value === 'object' && value !== null) {
      const entries = Object.entries(value);
      if (entries.length > 0) {
        // 如果有 name 或 名称 字段，先显示它
        const nameField = value.name || value.名称;
        let result = nameField ? `${nameField}\n` : '';

        // 显示所有其他字段（限制长度避免提示词爆炸）
        entries.forEach(([key, val]) => {
          if (key !== 'name' && key !== '名称' && val !== null && val !== undefined) {
            let valueStr = '';
            if (typeof val === 'object') {
              // 限制对象序列化的长度，避免巨量文本
              const jsonStr = JSON.stringify(val);
              valueStr = jsonStr.length > 100 ? `${jsonStr.substring(0, 100)}...` : jsonStr;
            } else {
              valueStr = String(val);
              // 限制字符串长度
              if (valueStr.length > 200) {
                valueStr = valueStr.substring(0, 200) + '...';
              }
            }
            result += `    *   **${key}**: ${valueStr}\n`;
          }
        });

        const fallbackJson = JSON.stringify(value, null, 2);
        return result.trim() || (fallbackJson.length > 500 ? `${fallbackJson.substring(0, 500)}...` : fallbackJson);
      }
    }

    // === 最后防线：直接显示 JSON（限制长度） ===
    console.warn('[formatItem] 使用JSON格式显示未识别的对象类型:', value);
    const finalJson = JSON.stringify(value, null, 2);
    return finalJson.length > 1000 ?
      `\\\`\\\`\\\`json\n${finalJson.substring(0, 1000)}...\n\\\`\\\`\\\`` :
      `\\\`\\\`\\\`json\n${finalJson}\n\\\`\\\`\\\``;
  };

  // === 格式化天赋列表 ===
  const formattedTalents = userSelections.talents && userSelections.talents.length > 0
    ? userSelections.talents.map(t => `*   **天赋**: ${formatItem(t)}`).join('\n')
    : '*   **天赋**: 无';

  // === 格式化先天六司 ===
  const formattedAttributes = Object.entries(userSelections.attributes)
    .map(([key, value]) => `*   **${key}**: ${value}`)
    .join('\n');

  // === 调试日志：显示格式化结果 ===
  console.log('[提示词构建] === 格式化结果验证 ===');
  console.log('天资格式化结果:', formatItem(userSelections.talentTier));
  console.log('出身格式化结果:', formatItem(userSelections.origin));
  console.log('灵根格式化结果:', formatItem(userSelections.spiritRoot));
  console.log('天赋格式化结果:', formattedTalents);
  console.log('[提示词构建] === 格式化验证完成 ===');

  const selectionsSummary = `
# 玩家核心选择

## 核心身份
*   **姓名**: ${userSelections.name}
*   **性别**: ${userSelections.gender}
*   **开局年龄**: ${userSelections.age}岁
*   **世界**: ${userSelections.world}

## 修行潜质
*   **天资**: ${formatItem(userSelections.talentTier)}
*   **出身**: ${formatItem(userSelections.origin)}
*   **灵根**: ${formatItem(userSelections.spiritRoot)}
${formattedTalents}

## 先天六司
${formattedAttributes}
---
`;

  const finalPrompt = CHARACTER_INITIALIZATION_PROMPT.replace(
    '# 玩家核心选择',
    selectionsSummary.replace('# 玩家核心选择', '# 角色核心设定参考（仅供创作参考，严禁直接复述）')
  );

  // 调试：检查提示词内容
  console.log('[提示词检查] finalPrompt长度:', finalPrompt.length);
  console.log('[提示词检查] 是否包含DATA_STRUCTURE_DEFINITIONS标记:', finalPrompt.includes('# 数据结构定义'));
  console.log('[提示词检查] 是否包含境界与阶段说明:', finalPrompt.includes('## 1. 境界与阶段'));
  console.log('[提示词检查] 是否包含品质系统说明:', finalPrompt.includes('## 2. 品质系统'));

  return finalPrompt;
}

/**
 * 地点名称生成提示词（用于角色初始化的第一步）
 */
export const LOCATION_NAME_GENERATION_PROMPT = `
# 任务：为指定大陆生成一个具体的、有层级的地点名称

你的任务是为给定的大陆名称生成一个具体的、富有特色的、包含层级关系的地点名称。

**输入数据**：
\`\`\`json
INPUT_PLACEHOLDER
\`\`\`

**输出格式要求**：必须严格按照以下JSON格式返回：
\`\`\`json
{
  "location_name": "具体的、有层级的地点名称（不包含大陆名）"
}
\`\`\`

**地点名称要求**：
1. **具体详细**：包含2-3个层级，使用"·"符号分隔，能清晰定位到具体场所。
2. **富有特色**：能体现该大陆的特点（修仙世界、现代都市等）。
3. **不包含大陆名**：只返回地点名称本身，系统会自动拼接大陆名。
4. **层级关系**：从大到小描述地点，例如“区域·建筑·内部场所”。
5. **格式说明**：
   - 使用"·"分隔层级关系，从大到小描述（如：区域·建筑·具体位置）
   - 只返回地点名称，不包含大陆名
   - 地点名称应符合世界观设定（修仙世界用宗门、洞府等，现代都市用建筑、街道等）

**注意事项**：
- 严禁输出任何注释或额外文本
- 必须是有效的JSON格式
- location_name字段必须存在且为非空字符串
- **只返回地点名称本身，系统会自动拼接大陆名**
`.trim();

// [已废弃] 旧的 GAME_START_INITIALIZATION_PROMPT 已被移除，其功能由 MainGamePanel.vue 的逻辑和新的通用规则替代。
export const GAME_START_INITIALIZATION_PROMPT = '';

