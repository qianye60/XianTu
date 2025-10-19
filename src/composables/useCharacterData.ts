import { computed } from 'vue';
import { useCharacterStore } from '@/stores/characterStore';
import type { SaveData as GameSaveData } from '@/types/game';

/**
 * @description 一个提供对当前激活角色数据的只读访问的 Composable。
 * 这是访问角色数据的首选方式，以将组件与 store 的实现细节解耦。
 */
export function useCharacterData() {
  const characterStore = useCharacterStore();

  const saveData = computed(() => characterStore.activeSaveSlot?.存档数据 as GameSaveData | undefined);

  const baseInfo = computed(() => saveData.value?.角色基础信息);
  const playerStatus = computed(() => saveData.value?.玩家角色状态);
  const inventory = computed(() => saveData.value?.背包);
  const relationships = computed(() => saveData.value?.人物关系);
  const skills = computed(() => saveData.value?.掌握技能);
  const daoData = computed(() => saveData.value?.三千大道);
  const sect = computed(() => saveData.value?.玩家角色状态?.宗门信息);
  const world = computed(() => saveData.value?.世界信息);
  const gameTime = computed(() => saveData.value?.游戏时间);

  return {
    saveData,
    baseInfo,
    playerStatus,
    inventory,
    relationships,
    skills,
    daoData,
    sect,
    world,
    gameTime,
  };
}