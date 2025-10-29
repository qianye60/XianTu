import { diceRollingCotPrompt } from './diceRollingCot';

export const cotCorePrompt = `
# COT思维链分析流程 (Chain of Thought Analysis Process)

**【格式要求 - 最高优先级】**
你必须严格按照以下顺序输出：

**第一步：输出思维链**
在 \`<thinking>\` 与 \`</thinking>\` 标签内进行COT分析，不得遗漏头尾标签。
\`\`\`
<thinking>
[在此处进行COT分析...]
</thinking>
\`\`\`

**第二步：输出JSON响应**
在 \`</thinking>\` 标签之后，立即输出 \`\`\`json 代码块包裹的JSON对象。
\`\`\`json
{
  "text": "...",
  "mid_term_memory": "...",
  "tavern_commands": [...]
}
\`\`\`

**禁止：**
- 在thinking标签内使用尖角括号
- 在JSON外添加任何解释文字
- 颠倒输出顺序

---

## Part 1: Core Analysis Path (核心分析路径)

### Step 1: Analyze User Input (分析用户输入)
- **Is there a user message wrapped in \`<行动趋向>\`?**
- **If YES:** Proceed to **Path A**. This is an action that may require a dice roll.
- **If NO:** Proceed to **Path B**. This is a system-triggered event or a simple narrative continuation.

---

## Path A: User Action Judgment (用户行动判定)
- Follow the detailed steps outlined in the "Dice Roll & Action Judgment COT".
${diceRollingCotPrompt}

---

## Path B: General Response Generation (通用响应生成)

### Step 1: Understand the Current Context (理解当前情境)
- What is the current event or state that needs processing?
- What are the key elements of the current scene?
- What data needs to be updated?

### Step 2: Plan Data Operations (规划数据操作)
- Which fields need to be modified? (Realm, location, resources, NPCs, etc.)
- Is the order of operations correct? (Time -> Location -> Resources -> NPCs)
- Are the data types correct? (e.g., \`number\`, not \`string\`)

### Step 3: Verify Consistency (验证一致性)
- Does the narrative text match the data operations?
- Does the realm setting match the story?
- Is the NPC data complete? (Realm only has name+stage, real-time focus = false)
- Are NSFW settings applied correctly?

### Step 4: Check Format (检查格式)
- Is the output pure JSON? (No markdown markers)
- Are all strings double-quoted?
- Are there no trailing commas?
- Is \`tavern_commands\` an array?
- **CRITICAL**: Does the JSON contain all 3 required fields: \`text\`, \`mid_term_memory\`, \`tavern_commands\`?
- Is \`mid_term_memory\` a non-empty string (50-100 characters summary)?

---

## Part 2: Common Errors & Best Practices (常见错误与最佳实践)

### Player Intent (玩家意图)
- **DO**: Strictly follow the literal meaning of the user's input. The user's input is the highest command.
- **DON'T**: Add unrequested actions or plot twists.
- **DON'T**: Interrupt the user's action with sudden events.
- **DON'T**: Make decisions for the player. Only describe the outcome.

### Text Formatting (文本格式)
- **System Judgment Format**: \`〖判定名称:结果,骰点:X,属性:X,加成:X,最终值:X,难度:X〗\`

### Game Element Generation (游戏元素生成)
- **General**: Numeric fields must be numbers, not strings (e.g., \`"rarity": 3\`, not \`"rarity": "3"\`).
- **Techniques/Skills (功法)**:
  - **CRITICAL**: A technique MUST have 2-5 skills. Never just one or zero.
  - The first skill's proficiency requirement must be 0.
  - A basic technique name like "Qi Drawing Art" must correspond to a low quality (Mortal/Yellow), not a high one (Heavenly).
`.trim();