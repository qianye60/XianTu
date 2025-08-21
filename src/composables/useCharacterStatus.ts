import { computed } from 'vue';
import type { Ref } from 'vue';
import type { CharacterBaseInfo, SaveData, CharacterStatusForDisplay, Realm } from '@/types/game';

// V2重构: 此 composable 现在依赖于分离的 baseInfo 和 saveData
export function useCharacterStatus(
  baseInfo: Ref<CharacterBaseInfo | null>,
  saveData: Ref<SaveData | null>
) {
  
  const characterStatus = computed<CharacterStatusForDisplay | null>(() => {
    if (!baseInfo.value || !saveData.value) return null;

    const status = saveData.value.玩家角色状态;
    const attributes = baseInfo.value.先天六司;

    // 提供默认值以避免运行时错误
    const defaultRealm: Realm = {
      等级: 0,
      名称: '凡人',
      当前进度: 0,
      下一级所需: 10,
      突破描述: '尚未踏入仙途'
    };

    return {
      name: baseInfo.value.名字,
      realm: status.境界 || defaultRealm,
      age: status.寿命?.当前 || 18, // 使用寿命当前值作为年龄显示
      hp: `${status.气血.当前} / ${status.气血.最大}`,
      mana: `${status.灵气.当前} / ${status.灵气.最大}`,
      spirit: `${status.神识.当前} / ${status.神识.最大}`,
      lifespan: status.寿命,
      reputation: status.声望,
      cultivation_exp: status.修为.当前,
      cultivation_exp_max: status.修为.最大,
      root_bone: attributes.根骨,
      spirituality: attributes.灵性,
      comprehension: attributes.悟性,
      fortune: attributes.气运,
      charm: attributes.魅力,
      temperament: attributes.心性,
    };
  });

  return {
    characterStatus,
  };
}