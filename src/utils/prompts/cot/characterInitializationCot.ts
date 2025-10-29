export const characterInitializationCotPrompt = `
# COT思维链分析流程 (Character Initialization)

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

## Part 1: Character Initialization COT (角色初始化)

### Step 1: Understand Player Choices (理解玩家选择)
- Analyze the player's talent tier, origin, spirit root, and talents.
- Identify if there are any "random" options that need to be replaced.
- Determine the character's core traits and advantages.

### Step 2: Design the Opening Scene (构思开局场景)
- Based on the world background and origin, design a suitable opening scene.
- Determine the initial realm (Mortal / Qi Refining?).
- Decide if NPCs are needed (only create if explicitly mentioned in the text).

### Step 3: Plan Initial Resources (规划初始资源)
- Flexibly determine the amount of spirit stones based on origin and story (Poor: 0-50, Common: 20-100, Sect: 50-300, Rich: 100-500+).
- Design 1-6 initial items (based on story logic).
- Consider giving techniques (0-3, based on origin and story).

### Step 4: Final Validation Checklist (最终验证清单)
- **Format Validation**:
  - [ ] Is the output pure JSON, without markdown blocks or explanatory text?
  - [ ] Are all strings double-quoted? No trailing commas?
  - [ ] Is \`tavern_commands\` an array?
  - [ ] **CRITICAL**: Does the JSON contain all 3 required fields: \`text\`, \`mid_term_memory\`, \`tavern_commands\`?
  - [ ] Is \`mid_term_memory\` a non-empty string (50-100 characters summary)?
- **Content Validation**:
  - [ ] Is the \`text\` field 1200-2500 characters?
  - [ ] Does the opening story perfectly match the player's choices?
  - [ ] Is the realm setting consistent with the text?
  - [ ] Have all "random" options been replaced?
  - [ ] Are NPCs limited to only those mentioned in the text?
  - [ ] Is the NPC's "实时关注" (real-time focus) field set to false?
- **Command Validation**:
  - [ ] Is the command order correct: Time -> Location -> Reputation -> Random Items -> Resources -> NPCs -> Daos?
  - [ ] Do all key paths match the data structure definitions?
  - [ ] Does the NPC realm object only have "名称" (name) and "阶段" (stage)?
  - [ ] Are NSFW settings applied correctly (checking nsfwMode and nsfwGenderFilter)?
  - [ ] Are numeric types correct (not strings)?

### Sub-COT: Initial Realm Judgment (初始境界智能判定)
1.  **Analyze Opening Text**:
    - Does the text mention cultivation-related terms like "cultivation", "technique", "spiritual energy", "spells"?
    - Does it mention identities like "sect disciple", "cultivation family", "master"?
    - Does it describe actions like using spiritual energy or sensing spiritual qi?
2.  **Determine Realm based on Analysis**:
    - If YES to any above -> Realm name should be "炼气", and stage should be "初期".
    - If it mentions years of practice or mastering spells -> Realm name "炼气", stage "中期" or "后期".
    - If inner disciple or from a cultivation family -> Realm name "炼气", stage "后期" or name "筑基", stage "初期".
    - Only if there is absolutely no cultivation content -> Set realm name to "凡人", stage to "".
3.  **Verify Consistency**:
    - If set to "凡人", is there truly no mention of cultivation in the text?
    - If set to "炼气", is there corresponding description to support it?

### Sub-COT: Random Item Replacement (随机项替换)
- **For Random Spirit Root**:
  1. What is the player's talent tier? (Determines the quality range).
  2. What is the world background? (Determines the theme, e.g., Five Elements for Xianxia).
  3. How to create a unique and fitting name?
  4. Is the cultivation bonus reasonable for its tier?
- **For Random Origin**:
  1. What is the world background type? (Xianxia/Urban/Fantasy).
  2. What is the player's talent tier? (Higher tier can have a better origin).
  3. What are the gender and race?
  4. How to design an interesting and reasonable backstory?

### Sub-COT: NPC Creation (NPC创建)
1.  Is this character specifically described in the opening text (name, dialogue, interaction)?
2.  If not, is it really necessary to create them, or are they just background dressing?
3.  What is the NPC's gender? Do they need private info generated? (Check nsfwMode and nsfwGenderFilter).
4.  Is the NPC's realm setting reasonable? (Remember: only "name" and "stage").
5.  Is the "实时关注" (real-time focus) field set to \`false\`?
`.trim();