export interface CharacterAttributes {
  health: number
  energy: number
  strength: number
  agility: number
  intelligence: number
  spirit: number
  luck: number
  consciousness: number
  lifespan: number
  comprehension: number
  spirit_root: number
}

export type AttributeModifier = Partial<CharacterAttributes>

export interface TalentLevel {
  cost: number
  description: string
}

export interface Talent {
  id: string
  name: string
  description: string
  cost?: number // For single-level talents
  levels?: TalentLevel[] // For multi-level talents
  prerequisites?: string[] // IDs of required talents
}

export interface CharacterTalent {
  id: string
  level: number
}

// For pre-defined, static birth origins
export interface BirthOrigin {
  id: string
  name: string
  icon: string
  description: string
  story?: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  effects: string[]
  attributeModifiers: AttributeModifier
}

// For user-created or AI-generated origins
export interface Origin {
  id: string
  name: string
  description: string
  backgroundStory: string
  initialPoints: number
  attributeModifiers: AttributeModifier
}
