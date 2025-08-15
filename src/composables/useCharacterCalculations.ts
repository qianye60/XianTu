/**
 * 天机算盘 - Character Calculation Composables
 * 此神通谱记载了所有与角色数值计算相关的法门。
 * 它接收角色的基础属性与选择，推演出最终的面板数值。
 */
import { computed, type Ref } from 'vue'
import {
  CoreAttribute,
  type CharacterSheet,
  type Origin,
  type Talent,
  type SpiritRoot,
  ATTRIBUTE_RULES,
} from '@/core/rules/characterCreation'

// Re-export CharacterSheet for components that need it
export type { CharacterSheet } from '@/core/rules/characterCreation'

// =================================================================
// 核心推演法门 (Core Calculation Logic)
// =================================================================

export function useCharacterCalculations(
  characterSheet: Ref<CharacterSheet>,
  totalAttributePoints: Ref<number>,
) {
  const allocatedAttributePoints = computed(() => {
    return Object.values(characterSheet.value.attributes).reduce((sum, val) => sum + val, 0)
  })

  const isCreationReady = computed(() => {
    return allocatedAttributePoints.value === totalAttributePoints.value
  })

  /**
   * 推演气血上限
   * @param root_bone - 根骨
   * 基础气血100点，每点根骨额外提供20点气血。
   */
  const maxHealth = computed(() => {
    const baseHealth = 100
    const healthFromStrength = (characterSheet.value.attributes[CoreAttribute.ROOT_BONE] || 0) * 20
    return baseHealth + healthFromStrength
  })

  /**
   * 推演灵气上限
   * @param comprehension - 悟性
   * 基础灵气80点，每点悟性额外提供15点灵气。
   */
  const maxMana = computed(() => {
    const baseMana = 80
    const manaFromIntelligence = (characterSheet.value.attributes[CoreAttribute.COMPREHENSION] || 0) * 15
    return baseMana + manaFromIntelligence
  })

  /**
   * 推演神识强度
   * @param spirituality - 灵性
   * 基础神识50点，每点灵性额外提供10点神识。
   */
  const spiritPower = computed(() => {
    const baseSpirit = 50
    const spiritFromSpirituality = (characterSheet.value.attributes[CoreAttribute.SPIRITUALITY] || 0) * 10
    return baseSpirit + spiritFromSpirituality
  })

  /**
   * 推演修炼速度加成
   * @param comprehension - 悟性
   * 每点悟性提供 5% 的修炼速度加成。
   */
  const cultivationSpeedBonus = computed(() => {
    return (characterSheet.value.attributes[CoreAttribute.COMPREHENSION] || 0) * 5
  })

  /**
   * 推演暴击率
   * @param fortune - 福缘
   * 每点福缘提供 0.5% 的暴击率。
   */
  const criticalChance = computed(() => {
    return (characterSheet.value.attributes[CoreAttribute.FORTUNE] || 0) * 0.5
  })

  // 将所有推演结果归一，方便外部调用
  return {
    // Getters
    maxHealth,
    maxMana,
    spiritPower,
    cultivationSpeedBonus,
    criticalChance,
    // State
    isCreationReady,
  }
}

// =================================================================
// 命盘构建法门 (Character Sheet Builder)
// =================================================================

export function useCharacterSheetBuilder(
  characterName: Ref<string>,
  selectedOrigin: Ref<Origin | null>,
  selectedSpiritRoot: Ref<SpiritRoot | null>,
  selectedTalents: Ref<Talent[]>,
) {
  const isCreationComplete = computed(() => {
    return selectedOrigin.value && selectedSpiritRoot.value && selectedTalents.value.length > 0
  })

  const finalCharacterSheet = computed<CharacterSheet>(() => {
    const baseAttributes = ATTRIBUTE_RULES.reduce(
      (acc, rule) => {
        acc[rule.id] = 10
        return acc
      },
      {} as Record<CoreAttribute, number>,
    )

    if (selectedOrigin.value) {
      for (const key in selectedOrigin.value.attributeModifiers) {
        const attrKey = key as CoreAttribute
        baseAttributes[attrKey] += selectedOrigin.value.attributeModifiers[attrKey] || 0
      }
    }
    selectedTalents.value.forEach((talent) => {
      if (talent.effects && typeof talent.effects === 'string') {
        try {
          const parsedEffects: Array<{ type: string; target: CoreAttribute; value: number }> =
            JSON.parse(talent.effects)
          parsedEffects.forEach((effect) => {
            if (effect.type === 'ATTRIBUTE_MODIFIER' && baseAttributes[effect.target]) {
              baseAttributes[effect.target] += effect.value
            }
          })
        } catch (e) {
          console.error(`天赋'${talent.name}'的effects字段解析失败:`, e)
        }
      }
    })

    const finalAttrs = baseAttributes
    const finalTalents = selectedTalents.value.map((t) => ({ ...t, level: 1 }))

    const generateFateVerdict = (): string => {
      if (!selectedOrigin.value || !selectedSpiritRoot.value) return '天机混沌，命数未显...'

      let verdict = `${characterName.value}，${selectedOrigin.value.description} `
      verdict += `身具【${selectedSpiritRoot.value.name}】，此乃修行之基。`

      if (finalTalents.length > 0) {
        verdict += `更得天道垂青，与生便有“${finalTalents
          .map((t) => t.name)
          .join('”、“')}”等天赋，仙路前景，已胜常人三分。`
      } else {
        verdict += `然未得天眷，无伴生天赋，仙路需倍加勤勉。`
      }

      const sortedAttrs = Object.entries(finalAttrs).sort((a, b) => b[1] - a[1])
      const highestAttr = sortedAttrs[0][0] as CoreAttribute

      let attrVerdict = ''
      switch (highestAttr) {
        case CoreAttribute.ROOT_BONE:
          attrVerdict = '然其命数之中，【根骨】二字最为耀眼，此乃肉身成圣之兆。'
          break
        case CoreAttribute.COMPREHENSION:
          attrVerdict = '其魂魄深处，【悟性】之光独占鳌头，此乃天生道子。'
          break
        case CoreAttribute.SPIRITUALITY:
          attrVerdict = '此子【灵性】天生强大，远超同辈，一切虚妄幻象，皆无所遁形。'
          break
        case CoreAttribute.FORTUNE:
          attrVerdict = '冥冥之中，【福缘】二字与汝纠缠最深，乃是福缘深厚之人。'
          break
        case CoreAttribute.CHARM:
          attrVerdict = '其【魅力】风姿，令人见之忘俗，如谪仙临尘。'
          break
        case CoreAttribute.TEMPERAMENT:
          attrVerdict = '其【心性】如磐石寿山，任风雨不动，乃是道心坚定之象。'
          break
      }
      verdict += ` ${attrVerdict}`

      return verdict
    }

    return {
      name: characterName.value,
      origin: selectedOrigin.value!,
      spiritRoot: selectedSpiritRoot.value!,
      talents: finalTalents,
      attributes: finalAttrs,
      description: generateFateVerdict(),
      memory_shards: [],
    }
  })

  return {
    finalCharacterSheet,
    isCreationComplete,
  }
}
