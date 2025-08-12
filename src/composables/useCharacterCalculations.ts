/**
 * 天机算盘 - Character Calculation Composables
 * 此神通谱记载了所有与角色数值计算相关的法门。
 * 它接收角色的基础属性与选择，推演出最终的面板数值。
 */
import { computed, type Ref } from 'vue'
import { CoreAttribute, type CharacterSheet } from '@/core/rules/characterCreation'

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
   * @param strength - 根骨
   * 基础气血100点，每点根骨额外提供20点气血。
   */
  const maxHealth = computed(() => {
    const baseHealth = 100
    const healthFromStrength = (characterSheet.value.attributes[CoreAttribute.CON] || 0) * 20
    return baseHealth + healthFromStrength
  })

  /**
   * 推演灵气上限
   * @param intelligence - 悟性
   * 基础灵气80点，每点悟性额外提供15点灵气。
   */
  const maxMana = computed(() => {
    const baseMana = 80
    const manaFromIntelligence = (characterSheet.value.attributes[CoreAttribute.INT] || 0) * 15
    return baseMana + manaFromIntelligence
  })

  /**
   * 推演神识强度
   * @param spirit - 神魂
   * 基础神识50点，每点神魂额外提供10点神识。
   */
  const spiritPower = computed(() => {
    const baseSpirit = 50
    const spiritFromSoul = (characterSheet.value.attributes[CoreAttribute.SPI] || 0) * 10
    return baseSpirit + spiritFromSoul
  })

  /**
   * 推演修炼速度加成
   * @param intelligence - 悟性
   * 每点悟性提供 5% 的修炼速度加成。
   */
  const cultivationSpeedBonus = computed(() => {
    return (characterSheet.value.attributes[CoreAttribute.INT] || 0) * 5
  })

  /**
   * 推演暴击率
   * @param luck - 气运
   * 每点气运提供 0.5% 的暴击率。
   */
  const criticalChance = computed(() => {
    return (characterSheet.value.attributes[CoreAttribute.LUK] || 0) * 0.5
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
