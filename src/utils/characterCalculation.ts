/**
 * 前端角色属性计算法门
 * 用于在本地创建角色时，根据其先天属性计算核心状态
 */
import type { LocalCharacter } from '@/types';

interface FullAttributes {
  root_bone: number;
  spirituality: number;
  comprehension: number;
  fortune: number;
  charm: number;
  temperament: number;
}

/**
 * 根据完整的先天六维计算角色的初始核心属性
 * @param attrs 包含所有六维属性的对象
 * @returns 包含气血、灵气、神识、寿命等核心状态的对象
 */
export function calculateInitialCoreAttributes(attrs: FullAttributes): Omit<LocalCharacter, 'id' | 'character_name' | 'world_id' | 'talent_tier_id' | 'root_bone' | 'spirituality' | 'comprehension' | 'fortune' | 'charm' | 'temperament' | 'play_time_minutes' | 'created_at' | 'last_played' | 'source'> {
  
  // 气血系统 (根骨为主, 心性为辅)
  const max_hp = 80 + (attrs.root_bone * 15) + (attrs.temperament * 5);

  // 灵气系统 (灵性为主, 悟性为辅)
  const max_mana = 60 + (attrs.spirituality * 12) + (attrs.comprehension * 3);

  // 神识系统 (悟性为主, 灵性为辅)
  const max_spirit = 50 + (attrs.comprehension * 10) + (attrs.spirituality * 2);

  // 寿元系统 (根骨为主, 气运为辅)
  const max_lifespan = 60 + (attrs.root_bone * 8) + (attrs.fortune * 2);

  return {
    realm: '凡人',
    reputation: 0,
    hp: max_hp,
    hp_max: max_hp,
    mana: max_mana,
    mana_max: max_mana,
    spirit: max_spirit,
    spirit_max: max_spirit,
    lifespan: max_lifespan,
    cultivation_exp: 0,
    cultivation_exp_max: 100, // 凡人突破所需修为
  };
}