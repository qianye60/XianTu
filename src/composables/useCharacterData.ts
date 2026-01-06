import { computed } from 'vue';
import { useCharacterStore } from '@/stores/characterStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import type { SaveDataV3 } from '@/types/saveSchemaV3';

/**
 * @description 一个提供对当前激活角色数据的只读访问的 Composable。
 * 这是访问角色数据的首选方式，以将组件与 store 的实现细节解耦。
 */
export function useCharacterData() {
  const characterStore = useCharacterStore();
  const gameStateStore = useGameStateStore();

  // V3-only：统一从 gameStateStore 获取（已确保读档时迁移到 V3）
  const saveData = computed(() => gameStateStore.toSaveData() as SaveDataV3 | null);

  const baseInfo = computed(() => saveData.value?.角色?.身份 ?? null);
  const attributes = computed(() => saveData.value?.角色?.属性 ?? null);
  const location = computed(() => saveData.value?.角色?.位置 ?? null);
  const effects = computed(() => saveData.value?.角色?.效果 ?? []);
  const inventory = computed(() => saveData.value?.角色?.背包 ?? null);
  const relationships = computed(() => saveData.value?.社交?.关系 ?? null);
  const skills = computed(() => saveData.value?.角色?.技能?.掌握技能 ?? []);
  const daoData = computed(() => saveData.value?.角色?.大道 ?? null);
  const sect = computed(() => saveData.value?.社交?.宗门 ?? null);
  const world = computed(() => saveData.value?.世界?.信息 ?? null);
  const gameTime = computed(() => saveData.value?.元数据?.时间 ?? null);

  return {
    saveData,
    baseInfo,
    attributes,
    location,
    effects,
    inventory,
    relationships,
    skills,
    daoData,
    sect,
    world,
    gameTime,
  };
}
