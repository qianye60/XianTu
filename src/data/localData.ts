// src/data/localData.ts
/**
 * 本地数据服务层 (V2)
 * 这一层是应用逻辑与底层存储实现之间的桥梁。
 * 它封装了与 localStorageManager 的交互，为上层应用提供清晰、简单的API。
 * 所有操作都以角色为中心。
 */
import { getTavernHelper } from '@/utils/tavern';
import { loadRootData, saveRootData } from '@/utils/localStorageManager';
import type { CharacterProfile, LocalStorageRoot } from '@/types/game';
import { toast } from '@/utils/toast';

/**
 * 保存指定角色的游戏会话 (聊天记录)。
 * 这是一个“快照”操作，将当前Tavern的聊天记录存入该角色的Profile中。
 * @param characterName - 要为其保存游戏的角色的名称
 * @returns 返回更新后的所有角色档案，以便UI可以响应式地更新。
 */
export async function saveGame(characterId: string, slotId: string): Promise<LocalStorageRoot> {
  if (!characterId || !slotId) {
    throw new Error('必须提供角色ID和存档槽位ID才能存档。');
  }

  const helper = getTavernHelper();
  if (!helper) {
    throw new Error('无法连接到Tavern，存档失败。');
  }

  const chatSnapshot = await helper.getChatHistory();
  if (!chatSnapshot) {
    console.error('【本地数据】无法获取当前聊天记录，存档失败。');
    throw new Error('无法获取当前聊天记录。');
  }

  const rootData = loadRootData();
  const character = rootData.角色列表[characterId];

  if (!character) {
    console.error(`【本地数据】找不到ID为 "${characterId}" 的角色档案，无法存档。`);
    throw new Error(`找不到角色: ${characterId}`);
  }

  if (character.存档列表 && character.存档列表[slotId]) {
    // 假设聊天记录存在 SaveData 的某个地方，这里暂时放在一个临时字段
    // @ts-expect-error - 临时存储聊天记录字段
    character.存档列表[slotId].存档数据.聊天记录 = chatSnapshot;
    character.存档列表[slotId].保存时间 = new Date().toISOString();
  } else {
    // 处理存档槽不存在的情况
    throw new Error(`角色 ${characterId} 没有找到存档槽 ${slotId}`);
  }
  
  saveRootData(rootData);
  
  console.log(`【本地数据】游戏已成功保存到角色: ${characterId} 的存档槽: ${slotId}`);
  toast.success(`为角色 "${character.角色基础信息.名字}" 的存档 "${slotId}" 成功！`);
  return rootData;
}

/**
 * 从指定的角色档案加载游戏会話 (聊天记录) 到Tavern。
 * @param characterName - 要加载其存档的角色名称
 */
export async function loadGame(characterId: string, slotId: string): Promise<void> {
  const helper = getTavernHelper();
  if (!helper) {
    throw new Error('无法连接到Tavern，读档失败。');
  }

  const rootData = loadRootData();
  const character = rootData.角色列表[characterId];

  if (!character || !character.存档列表 || !character.存档列表[slotId] || !character.存档列表[slotId].存档数据) {
    console.error(`【本地数据】找不到角色 "${characterId}" 的存档槽 "${slotId}"。`);
    throw new Error(`找不到存档: ${characterId} - ${slotId}`);
  }

  // @ts-expect-error - 临时存储聊天记录字段
  const chatHistory = character.存档列表[slotId].存档数据.聊天记录;
  if (!chatHistory) {
      throw new Error(`存档 ${slotId} 中没有聊天记录。`);
  }

  await helper.setChatHistory(chatHistory);
  console.log(`【本地数据】已成功从角色 "${characterId}" 的存档槽 "${slotId}" 加载游戏。`);
  toast.success(`已成功加载角色 "${character.角色基础信息.名字}" 的存档 "${slotId}"！`);
}

/**
 * 列出所有拥有存档的角色档案。
 * @returns 返回一个包含所有拥有存档的角色Profile的数组。
 */
export function listSavedCharacters(): CharacterProfile[] {
    const rootData = loadRootData();
    return Object.values(rootData.角色列表).filter(profile =>
        profile.存档列表 && Object.values(profile.存档列表).some(slot => slot.存档数据 !== null)
    );
}

/**
 * 删除一个指定角色的存档（将其设置为null）。
 * 这不会删除角色本身。
 * @param characterName - 要删除其存档的角色名称
 * @returns 返回更新后的所有角色档案，如果角色不存在则返回 undefined。
 */
export function deleteSave(characterId: string, slotId: string): LocalStorageRoot | undefined {
  const rootData = loadRootData();
  const character = rootData.角色列表[characterId];

  if (character && character.存档列表 && character.存档列表[slotId]) {
    character.存档列表[slotId].存档数据 = null;
    character.存档列表[slotId].保存时间 = null;
    saveRootData(rootData);
    console.log(`【本地数据】已删除角色 "${characterId}" 的存档槽 "${slotId}"。`);
    toast.success(`角色 "${character.角色基础信息.名字}" 的存档 "${slotId}" 已删除。`);
    return rootData;
  } else {
    console.warn(`【本地数据】尝试删除一个不存在的存档: ${characterId} - ${slotId}`);
    return undefined;
  }
}