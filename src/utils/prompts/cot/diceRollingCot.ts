export const diceRollingCotPrompt = `
# COT思维链分析流程 (Dice Rolling & Action Judgment)

---

## Part 1: Dice Roll & Action Judgment COT (掷骰及行动判定)

### Step 1: Determine if a Roll is Needed (判断是否需要掷骰)
- Analyze the user's action (\`<行动趋向>\`). Does it involve uncertainty or challenge? (e.g., combat, exploration, persuasion, crafting).
- If yes, a dice roll is required. Proceed to Step 2.
- If no (e.g., simple conversation, non-challenging movement), skip to narrative generation.

### Step 2: Data Loading and Analysis (数据载入分析)
- **Receive Dice**: From the pre-generated "Dice Pool" provided by the system, take the next available dice result (e.g., 1d20). This result is fixed and cannot be changed.
- **Load Parameters**:
  - Identify the action type (e.g., "Strength Check", "Spellcasting") and the target difficulty number from the game rules or context.
  - Retrieve the character's relevant attributes (e.g., \`后天六司.根骨\`), skill bonuses, and equipment bonuses from the SaveData.
  - Calculate the **Base Value** = Attribute + Skill Bonus + Equipment Bonus.
- **Calculate Final Value**: **Final Value** = **Base Value** + Dice Result.

### Step 3: Adjudicate Success Level (成功等级裁定)
- Compare the **Final Value** against the **Difficulty**.
- **Critical Success (大成功)**: Dice roll is 20. The action succeeds with an extra positive outcome.
- **Success (成功)**: Final Value >= Difficulty. The action succeeds as intended.
- **Failure (失败)**: Final Value < Difficulty. The action fails.
- **Critical Failure (大失败)**: Dice roll is 1. The action fails with an extra negative consequence.

### Step 4: Combat Judgment (战斗判定)
- If the action is an attack, perform the following sequence:
  1.  **Hit Calculation**: The roll from Step 2 determines if the attack hits. If it's a "Success", proceed to damage calculation.
  2.  **Damage Calculation**:
      - Attacker's Potential Damage = (Relevant Attribute + Weapon Bonus + Skill Bonus).
      - Defender's Damage Reduction = (Armor Bonus + Toughness Attribute).
      - **Final Damage** = Attacker's Potential Damage - Defender's Damage Reduction.
  3.  **Damage Adjudication**:
      - If **Final Damage** <= 0, the attack is blocked or ineffective. Describe this clearly.
      - If **Final Damage** > 0, the attack deals damage. Update the target's health.
  4.  **Narrate Outcome**: Clearly state the hit/miss, the final damage dealt, and the target's remaining health in the narrative text.
      - Example: "你的飞剑击中了哥布林，穿透了它的皮甲，造成了7点伤害。哥布林剩余生命值：2/9。"
      - A character only dies when their health reaches 0.

### Step 5: Output Generation (输出生成)
- **Update Data**: Generate the necessary \`tavern_commands\` to reflect all changes (health, item usage, status effects, etc.).
- **Generate Narrative**:
  - Write the story text, incorporating the dice roll result and the calculated outcome.
  - The narrative style should reflect the success level (e.g., a "Success" on a well-prepared action sounds different from a "Success" by pure luck).
  - **Crucially**, the narrative must explicitly mention the dice roll result and the final outcome (e.g., "你掷出了15点，加上你的力量加成，最终值为18，成功推开了石门。").
- **Format Judgment**: Include the standardized judgment format in the text: \`〖判定名称:结果,骰点:X,属性:X,加成:X,最终值:X,难度:X〗\`.
`.trim();