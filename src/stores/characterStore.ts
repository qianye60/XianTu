import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { toast } from '@/utils/toast';
import * as storage from '@/utils/localStorageManager';
import { getTavernHelper } from '@/utils/tavern';
import { initializeCharacter } from '@/services/characterInitialization';
import { createCharacter as createCharacterAPI, updateCharacterSave } from '@/services/request';
import type { World } from '@/types';
import type { LocalStorageRoot, CharacterProfile, CharacterBaseInfo, SaveSlot, SaveData } from '@/types/game';

// 假设的创角数据包，实际应从创角流程获取
interface CreationPayload {
  charId: string; // e.g., 'char_' + Date.now()
  baseInfo: CharacterBaseInfo;
  world: World; // 世界数据
  mode: '单机' | '联机';
  age: number; // 开局年龄
}

export const useCharacterStore = defineStore('characterV3', () => {
  // --- 状态 (State) ---
  // Store的核心状态直接镜像本地存储的根对象
  const rootState = ref<LocalStorageRoot>(storage.loadRootData());

  // --- 计算属性 (Getters) ---

  // 获取所有角色Profile的列表
  const allCharacterProfiles = computed(() => Object.values(rootState.value.角色列表));
  
  // 获取当前激活的角色Profile
  const activeCharacterProfile = computed((): CharacterProfile | null => {
    const active = rootState.value.当前激活存档;
    if (!active) return null;
    return rootState.value.角色列表[active.角色ID] || null;
  });

  // 获取当前激活的存档槽位数据
  const activeSaveSlot = computed((): SaveSlot | null => {
    const active = rootState.value.当前激活存档;
    const profile = activeCharacterProfile.value;
    if (!active || !profile) return null;

    if (profile.模式 === '单机' && profile.存档列表) {
      return profile.存档列表[active.存档槽位] || null;
    }
    if (profile.模式 === '联机' && profile.存档) {
      return profile.存档;
    }
    return null;
  });

  // --- 核心行动 (Actions) ---

  /**
   * [核心] 保存当前状态到本地存储
   * 确保任何修改后都能持久化
   */
  const commitToStorage = () => {
    storage.saveRootData(rootState.value);
  };

  /**
   * 重新从本地存储加载数据，覆盖当前状态
   */
  const reloadFromStorage = () => {
    rootState.value = storage.loadRootData();
    console.log('【角色神殿】已从乾坤宝库重新同步所有数据。');
  };

  /**
   * 创建一个全新的角色 (AI增强版)
   * @param payload 包含角色基础信息和世界数据的数据包
   * @returns 创建成功则返回角色的基础信息，否则返回 undefined
   */
  const createNewCharacter = async (payload: CreationPayload): Promise<CharacterBaseInfo | undefined> => {
    const { charId, baseInfo, world, mode, age } = payload;
    if (rootState.value.角色列表[charId]) {
      toast.error(`角色ID ${charId} 已存在，创建失败！`);
      return undefined;
    }

    try {
      // 1. 如果是联机模式，先向后端提交角色创建信息
      if (mode === '联机') {
        try {
          toast.info('正在向云端提交角色信息...');
          
          // 构造符合后端schema的数据结构
          const characterSubmissionData = {
            char_id: charId,
            base_info: {
              名字: baseInfo.名字,
              世界: baseInfo.世界,
              天资: baseInfo.天资,
              出生: baseInfo.出生,
              灵根: baseInfo.灵根,
              天赋: baseInfo.天赋,
              先天六司: baseInfo.先天六司
            }
          };
          
          console.log('[角色创建] 向后端提交的数据:', characterSubmissionData);
          const backendResult = await createCharacterAPI(characterSubmissionData);
          console.log('[角色创建] 后端返回结果:', backendResult);
          toast.success('角色信息已成功提交至云端！');
        } catch (error) {
          console.error('[角色创建] 向后端提交失败:', error);
          toast.error('向云端提交角色信息失败，但会继续本地创建流程');
          // 不要抛出错误，允许继续本地创建流程
        }
      }

      // 2. 使用AI增强的初始化服务创建完整的存档数据
      toast.info('正在铸造法身...');
      const initialSaveData = await initializeCharacter(charId, baseInfo, world, age);

      let newProfile: CharacterProfile;
      if (mode === '单机') {
        newProfile = {
          模式: '单机',
          角色基础信息: baseInfo,
          存档列表: {
            '上次对话': { 存档名: '上次对话', 保存时间: null, 存档数据: null },
            '自动存档': { 存档名: '自动存档', 保存时间: null, 存档数据: null },
            '存档1': {
              存档名: '初始修行',
              保存时间: new Date().toISOString(),
              游戏内时间: '修仙元年 春',
              存档数据: initialSaveData
            }
          },
        };
      } else { // 联机模式
        newProfile = {
          模式: '联机',
          角色基础信息: baseInfo,
          存档: {
            存档名: '云端修行',
            保存时间: new Date().toISOString(),
            游戏内时间: '修仙元年 春',
            存档数据: initialSaveData,
            云端同步信息: {
              最后同步: new Date().toISOString(),
              版本: 1,
              需要同步: false,
            },
          },
        };
      }
      
      rootState.value.角色列表[charId] = newProfile;
      
      // 2. 设置为当前激活存档
      const slotKey = mode === '单机' ? '存档1' : '存档';
      rootState.value.当前激活存档 = { 角色ID: charId, 存档槽位: slotKey };
      
      commitToStorage();
      
      // 3. 同步到酒馆
      await setActiveCharacterInTavern(charId);
      
      // 4. 如果是联机模式，同步完整存档数据到云端
      if (mode === '联机') {
        try {
          toast.info('正在同步存档数据到云端...');
          
          const saveDataToSync = {
            save_data: initialSaveData,
            world_map: {}, // 从酒馆变量或初始化结果获取地图数据
            game_time: '修仙元年 春'
          };
          
          console.log('[角色存档] 准备同步到云端的存档数据:', saveDataToSync);
          await updateCharacterSave(charId, saveDataToSync);
          toast.success('存档数据已成功同步到云端！');
        } catch (error) {
          console.warn('[角色存档] 同步存档数据到云端失败:', error);
          toast.warning('存档同步失败，但角色创建成功。可在游戏中手动同步。');
          // 不要抛出错误，允许角色创建继续完成
        }
      }
      
      toast.success(`法身【${baseInfo.名字}】铸造完成！天机已定，修仙之路即将开启。`);
      return baseInfo;
    } catch (error) {
      console.error('角色创建失败:', error);
      toast.error('法身铸造失败，请重试');
      return undefined;
    }
  };
  
  /**
   * 删除一个角色及其所有存档
   * @param charId 要删除的角色ID
   */
  const deleteCharacter = (charId: string) => {
    if (!rootState.value.角色列表[charId]) return;
    
    // 如果删除的是当前激活的角色，则清空激活状态
    if (rootState.value.当前激活存档?.角色ID === charId) {
      rootState.value.当前激活存档 = null;
    }
    
    delete rootState.value.角色列表[charId];
    commitToStorage();
    toast.success(`角色已彻底删除。`);
  };

  /**
   * 加载一个游戏存档到Tavern (设置其为激活状态并同步聊天记录)
   * @param charId 角色ID
   * @param slotKey 存档槽位关键字 (e.g., "存档1")
   */
  const loadGame = async (charId: string, slotKey: string) => {
    console.log('[存档加载] 开始加载游戏，角色ID:', charId, '存档槽:', slotKey);
    
    const profile = rootState.value.角色列表[charId];
    if (!profile) {
      console.error('[存档加载] 找不到要加载的角色:', charId);
      toast.error('找不到要加载的角色！');
      return false;
    }

    let targetSlot: SaveSlot | undefined | null;
    if (profile.模式 === '单机') {
      targetSlot = profile.存档列表?.[slotKey];
    } else {
      targetSlot = profile.存档;
    }
    
    if (!targetSlot) {
      console.error('[存档加载] 找不到指定的存档槽位:', slotKey);
      toast.error('找不到指定的存档槽位！');
      return false;
    }

    try {
      // 1. 先设置激活存档
      console.log('[存档加载] 设置当前激活存档');
      rootState.value.当前激活存档 = { 角色ID: charId, 存档槽位: slotKey };
      commitToStorage();

      // 2. 同步角色档案到酒馆
      console.log('[存档加载] 同步角色档案到酒馆');
      await setActiveCharacterInTavern(charId);

      // 3. 如果存档有数据，加载存档内容到酒馆
      if (targetSlot.存档数据) {
        console.log('[存档加载] 加载存档数据到酒馆');
        const helper = getTavernHelper();
        if (helper) {
          // 将存档数据写入酒馆变量
          const gameVariables = {
            'character.saveData': targetSlot.存档数据,
            'character.name': profile.角色基础信息.名字,
            'character.realm': targetSlot.存档数据.玩家角色状态?.境界 || '凡人',
            'character.location': targetSlot.存档数据.玩家角色状态?.位置?.描述 || '新手村'
          };
          
          await helper.insertOrAssignVariables(gameVariables, { type: 'chat' });
          console.log('[存档加载] 游戏变量已设置到酒馆');
        }
      } else {
        console.log('[存档加载] 这是一个新存档，无需加载存档数据');
      }

      console.log('[存档加载] 加载完成');
      toast.success(`已成功加载角色【${profile.角色基础信息.名字}】的存档: ${targetSlot.存档名 || slotKey}`);
      return true;
      
    } catch (error) {
      console.error('[存档加载] 加载过程出错:', error);
      toast.error('存档加载失败：' + (error instanceof Error ? error.message : '未知错误'));
      return false;
    }
  };

  /**
   * [核心] 将指定的角色档案设置为酒馆中的当前激活角色
   * @param charId 要设置为激活的角色ID
   */
  const setActiveCharacterInTavern = async (charId: string) => {
    const profile = rootState.value.角色列表[charId];
    if (!profile) {
      toast.error(`无法找到ID为 ${charId} 的角色档案`);
      return;
    }
    try {
      const helper = getTavernHelper();
      if (!helper) {
        toast.error('酒馆连接尚未建立！');
        return;
      }
      // 将完整的 CharacterProfile 写入酒馆变量
      await helper.insertOrAssignVariables({ 'DAD_GameData': profile }, { type: 'global' });
      toast.success(`已将【${profile.角色基础信息.名字}】的档案同步至酒馆。`);
    } catch (error) {
      console.error('同步角色档案至酒馆失败:', error);
      toast.error('同步角色档案至酒馆失败，请检查控制台。');
    }
  };

  /**
   * [核心] 从酒馆加载当前激活的角色档案
   * 读取 DAD_GameData 变量并用其更新 store
   */
  const syncWithTavern = async () => {
    try {
      console.log('【角色神殿】开始从酒馆加载当前角色...');
      const helper = getTavernHelper();
      if (!helper) {
        toast.error('酒馆连接尚未建立！');
        return;
      }
      const tavernVars = await helper.getVariables({ type: 'global' });
      const activeProfile = tavernVars['DAD_GameData'] as CharacterProfile | undefined;

      if (activeProfile && activeProfile.角色基础信息) {
        // 为了兼容现有的多角色结构，我们动态地构建一个只包含当前角色的 rootState
        const charId = `char_${Date.now()}`; // 生成一个临时的ID
        rootState.value.角色列表 = { [charId]: activeProfile };
        
        // 确定存档槽位
        const slotKey = activeProfile.模式 === '单机' ? '存档1' : '存档'; // 假设总是加载第一个或唯一的存档
        rootState.value.当前激活存档 = { 角色ID: charId, 存档槽位: slotKey };
        
        commitToStorage(); // 将加载的角色也缓存到本地
        toast.success(`已从酒馆加载【${activeProfile.角色基础信息.名字}】`);
        console.log('【角色神殿】加载完成。', rootState.value);
      } else {
        console.log('【角色神殿】酒馆中无激活的角色档案。');
        // 清空当前激活存档，避免显示旧数据
        rootState.value.当前激活存档 = null;
        commitToStorage();
      }
    } catch (error) {
      console.error('从酒馆加载角色失败:', error);
      toast.error('从酒馆加载角色失败，请检查控制台。');
    }
  };

  /**
   * 保存当前游戏进度到当前激活的存档
   * 从Tavern获取聊天记录，并更新到激活的存档槽位中
   */
  const saveCurrentGame = async () => {
    const active = rootState.value.当前激活存档;
    const profile = activeCharacterProfile.value;
    const slot = activeSaveSlot.value;

    if (!active || !profile || !slot) {
      toast.error('没有激活的存档，无法保存！');
      return;
    }

    // TODO: 从Tavern获取当前的游戏状态/聊天记录
    // const helper = getTavernHelper();
    // const chatHistory = await helper?.getChatHistory();
    // if (!chatHistory) {
    //   toast.error('无法获取当前游戏进度，保存失败！');
    //   return;
    // }
    
    // TODO: 将获取到的游戏状态（chatHistory等）转化为完整的 SaveData 结构
    const newSaveData: SaveData | null = slot.存档数据 ? { ...slot.存档数据 } : null; // 这是一个示例
    // newSaveData.聊天记录 = chatHistory;

    // 更新存档槽位信息
    slot.保存时间 = new Date().toISOString();
    slot.存档数据 = newSaveData; // 将新数据写回
    
    // 将修改后的slot写回rootState
    if (profile.模式 === '单机' && profile.存档列表) {
      profile.存档列表[active.存档槽位] = slot;
    } else if (profile.模式 === '联机') {
      profile.存档 = slot;
    }

    commitToStorage();
    toast.success(`存档【${slot.存档名}】已成功保存！`);
  };

  /**
   * 删除指定角色的指定存档
   * @param charId 角色ID
   * @param slotKey 存档槽位关键字
   */
  const deleteSave = (charId: string, slotKey: string) => {
    const profile = rootState.value.角色列表[charId];
    if (!profile || profile.模式 !== '单机' || !profile.存档列表) {
      toast.error('无法删除存档：角色不存在或非单机模式');
      return;
    }

    // 检查是否存在该存档
    if (!profile.存档列表[slotKey]) {
      toast.error('存档不存在');
      return;
    }

    // 检查是否为当前激活的存档
    const active = rootState.value.当前激活存档;
    if (active?.角色ID === charId && active?.存档槽位 === slotKey) {
      rootState.value.当前激活存档 = null;
    }

    // 删除存档
    delete profile.存档列表[slotKey];
    commitToStorage();
    toast.success('存档已删除');
  };

  /**
   * 为指定角色创建新的存档槽位
   * @param charId 角色ID  
   * @param saveName 存档名称
   */
  const createNewSave = (charId: string, saveName: string) => {
    const profile = rootState.value.角色列表[charId];
    if (!profile || profile.模式 !== '单机') {
      toast.error('无法创建存档：角色不存在或非单机模式');
      return;
    }

    if (!profile.存档列表) {
      profile.存档列表 = {};
    }

    // 检查存档名是否已存在
    if (profile.存档列表[saveName]) {
      toast.error('存档名称已存在');
      return;
    }

    // 创建新的空存档槽位
    profile.存档列表[saveName] = {
      存档名: saveName,
      保存时间: null,
      存档数据: null
    };

    commitToStorage();
    toast.success(`存档【${saveName}】已创建`);
  };

  /**
   * 重命名指定角色的指定存档
   * @param charId 角色ID
   * @param oldSlotKey 旧的存档槽位关键字
   * @param newSaveName 新的存档名称
   */
  const renameSave = (charId: string, oldSlotKey: string, newSaveName: string) => {
    const profile = rootState.value.角色列表[charId];
    if (!profile || profile.模式 !== '单机' || !profile.存档列表) {
      toast.error('无法重命名存档：角色不存在或非单机模式');
      return;
    }

    const oldSave = profile.存档列表[oldSlotKey];
    if (!oldSave) {
      toast.error('要重命名的存档不存在');
      return;
    }

    // 如果新名称与旧槽位键相同，只更新存档名
    if (newSaveName === oldSlotKey) {
      oldSave.存档名 = newSaveName;
      commitToStorage();
      toast.success('存档名称已更新');
      return;
    }

    // 检查新名称是否已存在
    if (profile.存档列表[newSaveName]) {
      toast.error('新存档名称已存在');
      return;
    }

    // 创建新的存档槽位
    profile.存档列表[newSaveName] = {
      ...oldSave,
      存档名: newSaveName
    };

    // 如果是当前激活的存档，更新激活状态
    const active = rootState.value.当前激活存档;
    if (active?.角色ID === charId && active?.存档槽位 === oldSlotKey) {
      rootState.value.当前激活存档 = { 角色ID: charId, 存档槽位: newSaveName };
    }

    // 删除旧的存档槽位
    delete profile.存档列表[oldSlotKey];
    
    commitToStorage();
    toast.success(`存档已重命名为【${newSaveName}】`);
  };

  /**
   * 更新角色数据（从AI响应中提取数据更新）
   * @param characterUpdates 角色数据更新
   */
  const updateCharacterData = (characterUpdates: Partial<SaveData>) => {
    const save = activeSaveSlot.value;
    if (!save?.存档数据) {
      console.warn('[角色商店] 没有激活的存档，无法更新角色数据');
      return;
    }

    // 深度合并更新数据
    Object.keys(characterUpdates).forEach(key => {
      const updateValue = characterUpdates[key as keyof SaveData];
      if (updateValue !== undefined) {
        (save.存档数据 as any)[key] = updateValue;
      }
    });

    // 更新保存时间
    save.保存时间 = new Date().toISOString();
    commitToStorage();
    
    console.log('[角色商店] 角色数据已更新:', characterUpdates);
  };

  return {
    // State
    rootState,
    // Getters
    allCharacterProfiles,
    activeCharacterProfile,
    activeSaveSlot,
    // Actions
    reloadFromStorage,
    createNewCharacter,
    deleteCharacter,
    deleteSave,
    createNewSave,
    renameSave,
    loadGame,
    saveCurrentGame,
    updateCharacterData,
    commitToStorage, // 导出给外部使用
    syncWithTavern,
    setActiveCharacterInTavern,
  };
});