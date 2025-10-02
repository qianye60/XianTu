import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { merge, set as setLodash } from 'lodash';
import { toast } from '@/utils/toast';
import { debug } from '@/utils/debug';
import { useUIStore } from './uiStore'; // 导入UI Store
import * as storage from '@/utils/localStorageManager';
import { getTavernHelper, clearAllCharacterData } from '@/utils/tavern';
import { initializeCharacter } from '@/services/characterInitialization';
import { initializeCharacterOffline } from '@/services/offlineInitialization';
import { createCharacter as createCharacterAPI, updateCharacterSave } from '@/services/request';
import { validateGameData } from '@/utils/dataValidation';
import { getAIDataRepairSystemPrompt } from '@/utils/prompts/dataRepairPrompts';
import { updateLifespanFromGameTime, updateNpcLifespanFromGameTime } from '@/utils/lifespanCalculator'; // <-- 导入寿命计算工具
import type { World } from '@/types';
import type { LocalStorageRoot, CharacterProfile, CharacterBaseInfo, SaveSlot, SaveData, StateChangeLog, Realm } from '@/types/game';

// 假设的创角数据包，实际应从创角流程获取
interface CreationPayload {
  charId: string; // e.g., 'char_' + Date.now()
  baseInfo: CharacterBaseInfo;
  world: World; // 世界数据
  mode: '单机' | '联机';
  age: number; // 开局年龄
}

/**
 * 获取对象的嵌套值
 * @param obj 源对象
 * @param path 点号分隔的路径，如 '玩家角色状态.修为.当前'
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

export const useCharacterStore = defineStore('characterV3', () => {
  // --- 状态 (State) ---
  // Store的核心状态直接镜像本地存储的根对象
  const rootState = ref<LocalStorageRoot>(storage.loadRootData());
  // 新增：用于暂存角色创建时的初始状态变更
  const initialCreationStateChanges = ref<StateChangeLog | null>(null);

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

  // 获取存档槽位列表
  const saveSlots = computed((): SaveSlot[] => {
    const profile = activeCharacterProfile.value;
    if (!profile) return [];

    if (profile.模式 === '单机' && profile.存档列表) {
      // 为每个存档添加必要的展示信息
      return Object.entries(profile.存档列表).map(([key, slot]) => {
        const enhancedSlot = {
          ...slot,
          id: key,
          角色名字: profile.角色基础信息.名字,
          境界: slot.存档数据?.玩家角色状态?.境界?.名称 || '凡人',
          位置: slot.存档数据?.玩家角色状态?.位置?.描述 || '初始地',
          游戏时长: 0, // TODO: 从存档数据中计算实际游戏时长
          最后保存时间: slot.保存时间
        };
        return enhancedSlot;
      });
    }
    if (profile.模式 === '联机' && profile.存档) {
      const enhancedSlot = {
        ...profile.存档,
        id: 'online_save',
        角色名字: profile.角色基础信息.名字,
        境界: profile.存档.存档数据?.玩家角色状态?.境界?.名称 || '凡人',
        位置: profile.存档.存档数据?.玩家角色状态?.位置?.描述 || '初始地',
        游戏时长: 0, // TODO: 从存档数据中计算实际游戏时长
        最后保存时间: profile.存档.保存时间
      };
      return [enhancedSlot];
    }
    return [];
  });

  // --- 核心行动 (Actions) ---

  /**
   * [核心] 保存当前状态到本地存储
   * 确保任何修改后都能持久化
   */
  const commitToStorage = async (): Promise<void> => {
    try {
      storage.saveRootData(rootState.value);

      // 触发响应式更新：创建新的rootState引用
      // 这样可以确保所有computed和watchers都能检测到变化
      rootState.value = { ...rootState.value };

      // 可以在这里添加额外的异步操作，例如与后端同步
      // await someAsyncApiCall();
    } catch (error) {
      debug.error('角色商店', '持久化到本地存储失败', error);
      // 向上抛出错误，以便调用者可以处理
      throw error;
    }
  };

  /**
   * [新增] 增量更新酒馆变量的特定字段
   * 避免每次都保存整个 SaveData 结构，减少 token 消耗
   * @param path 要更新的字段路径，如 '玩家角色状态.修为.当前'
   * @param value 新的值
   */
  const updateTavernField = async (path: string, value: unknown): Promise<void> => {
    try {
      const helper = getTavernHelper();
      if (!helper) {
        debug.warn('角色商店', '[增量更新] helper 为空，无法同步到酒馆');
        return;
      }

      // 使用点号路径更新嵌套字段
      const fullPath = `character.saveData.${path}`;
      await helper.insertOrAssignVariables(
        { [fullPath]: value },
        { type: 'chat' }
      );
      debug.log('角色商店', `[增量更新] 已更新酒馆字段: ${fullPath}`);
    } catch (error) {
      debug.error('角色商店', `[增量更新] 更新字段 ${path} 失败:`, error);
      throw error;
    }
  };

  /**
   * [新增] 批量增量更新酒馆变量的多个字段
   * @param updates 字段路径和值的映射，如 { '玩家角色状态.修为.当前': 100, '背包.灵石.下品': 50 }
   */
  const updateTavernFields = async (updates: Record<string, unknown>): Promise<void> => {
    try {
      const helper = getTavernHelper();
      if (!helper) {
        debug.warn('角色商店', '[批量增量更新] helper 为空，无法同步到酒馆');
        return;
      }

      // 转换为完整路径
      const fullPathUpdates: Record<string, unknown> = {};
      for (const [path, value] of Object.entries(updates)) {
        fullPathUpdates[`character.saveData.${path}`] = value;
      }

      await helper.insertOrAssignVariables(fullPathUpdates, { type: 'chat' });
      debug.log('角色商店', `[批量增量更新] 已更新 ${Object.keys(updates).length} 个酒馆字段`);
    } catch (error) {
      debug.error('角色商店', '[批量增量更新] 批量更新失败:', error);
      throw error;
    }
  };

  /**
   * [新增] 将当前存档数据同步到酒馆并保存到本地
   * 这是UI操作后的标准保存方法，确保数据同时更新到酒馆和本地
   * @param fullSync 是否进行完整同步（默认 false，只在必要时使用）
   * @param changedPaths 变更的字段路径数组（增量同步时使用）
   */
  const syncToTavernAndSave = async (options?: {
    fullSync?: boolean;
    changedPaths?: string[]
  }): Promise<void> => {
    const active = rootState.value.当前激活存档;
    const profile = activeCharacterProfile.value;
    const slot = activeSaveSlot.value;

    if (!active || !profile || !slot?.存档数据) {
      debug.warn('角色商店', '[同步] 没有激活的存档数据');
      return;
    }

    try {
      // 1. 先更新年龄信息
      try {
        const 更新后年龄 = updateLifespanFromGameTime(slot.存档数据);
        debug.log('角色商店', `[同步] 自动更新玩家年龄: ${更新后年龄}岁`);

        // 更新所有NPC的年龄
        if (slot.存档数据?.人物关系 && slot.存档数据.游戏时间) {
          let npcCount = 0;
          Object.values(slot.存档数据.人物关系).forEach((npc: any) => {
            if (npc && typeof npc === 'object' && slot.存档数据) {
              updateNpcLifespanFromGameTime(npc, slot.存档数据.游戏时间);
              npcCount++;
            }
          });
          debug.log('角色商店', `[同步] 自动更新${npcCount}个NPC年龄`);
        }
      } catch (error) {
        debug.warn('角色商店', '[同步] 自动更新年龄失败（非致命）:', error);
      }

      // 2. 同步到酒馆（支持增量和完整同步）
      const helper = getTavernHelper();

      if (helper) {
        try {
          // 检查必需的方法是否存在
          if (typeof helper.setVariable !== 'function') {
            throw new Error('TavernHelper.setVariable 方法不可用，请检查 SillyTavern 版本');
          }
          if (typeof helper.getVariable !== 'function') {
            throw new Error('TavernHelper.getVariable 方法不可用，请检查 SillyTavern 版本');
          }

          const fullSync = options?.fullSync ?? false;
          const changedPaths = options?.changedPaths;

          if (fullSync || !changedPaths || changedPaths.length === 0) {
            // 完整同步：保存整个 SaveData（谨慎使用！）
            await helper.setVariable('character.saveData', slot.存档数据, { type: 'chat' });
            debug.log('角色商店', '[同步] 已将完整存档数据同步到酒馆（完整同步）');
          } else {
            // 🔥 增量同步：获取整个saveData，应用变更，再整体更新
            const currentSaveData = await helper.getVariable('character.saveData', { type: 'chat' }) || {};
            for (const path of changedPaths) {
              const value = getNestedValue(slot.存档数据! as unknown as Record<string, unknown>, path);
              setLodash(currentSaveData as object, path, value);
            }
            await helper.setVariable('character.saveData', currentSaveData, { type: 'chat' });
            debug.log('角色商店', `[同步] 已增量同步 ${changedPaths.length} 个字段到character.saveData`);
          }
        } catch (helperError) {
          debug.error('角色商店', '[同步] 同步失败:', helperError);
          throw new Error(`同步酒馆失败: ${helperError instanceof Error ? helperError.message : String(helperError)}`);
        }
      } else {
        debug.warn('角色商店', '[同步] helper 为空，无法同步到酒馆');
      }

      // 3. 更新存档槽位的保存时间和元数据
      slot.保存时间 = new Date().toISOString();
      slot.最后保存时间 = slot.保存时间;

      // 提取元数据用于存档列表显示
      const playerState = slot.存档数据.玩家角色状态;
      if (playerState) {
        slot.角色名字 = playerState.名字 || profile.角色基础信息?.名字;
        // 境界可能是 Realm 对象，提取名称
        if (typeof playerState.境界 === 'object' && playerState.境界 !== null) {
          slot.境界 = (playerState.境界 as Realm).名称 || '凡人';
        } else {
          slot.境界 = String(playerState.境界 || '凡人');
        }
        slot.位置 = playerState.位置?.描述 || '未知';

        // 计算修为进度百分比（从境界的当前进度获取）
        if (typeof playerState.境界 === 'object' && playerState.境界 !== null) {
          const realm = playerState.境界 as Realm;
          if (realm.下一级所需 > 0) {
            slot.修为进度 = Math.floor((realm.当前进度 / realm.下一级所需) * 100);
          }
        }
      }

      // 游戏时间
      if (slot.存档数据.游戏时间) {
        const time = slot.存档数据.游戏时间;
        slot.游戏内时间 = `${time.年}年${time.月}月${time.日}日`;
      }

      // 4. 将修改写回 rootState（触发响应式）
      if (profile.模式 === '单机' && profile.存档列表) {
        rootState.value.角色列表[active.角色ID].存档列表 = {
          ...profile.存档列表,
          [active.存档槽位]: slot
        };
      } else if (profile.模式 === '联机') {
        rootState.value.角色列表[active.角色ID].存档 = slot;
      }

      // 5. 保存到本地存储
      await commitToStorage();

      debug.log('角色商店', '[同步] 数据已同步到酒馆并保存到本地，元数据已更新');
    } catch (error) {
      debug.error('角色商店', '[同步] 同步到酒馆并保存失败', error);
      throw error;
    }
  };

  /**
   * [新增] 设置角色创建时的初始状态变更日志
   * @param changes 从 characterInitialization 服务传递过来的变更日志
   */
  const setInitialCreationStateChanges = (changes: StateChangeLog) => {
    debug.log('角色商店', '暂存初始角色创建的状态变更', changes);
    initialCreationStateChanges.value = changes;
  };

  /**
   * [新增] 消费（获取并清除）初始状态变更日志
   * 这是一个“一次性”的 getter，确保日志只被主面板使用一次
   * @returns 暂存的变更日志，如果没有则返回 null
   */
  const consumeInitialCreationStateChanges = (): StateChangeLog | null => {
    const changes = initialCreationStateChanges.value;
    if (changes) {
      debug.log('角色商店', '消费初始状态变更日志', changes);
      initialCreationStateChanges.value = null; // 获取后立即清除
    }
    return changes;
  };

  /**
   * 重新从本地存储加载数据，覆盖当前状态
   */
  const reloadFromStorage = () => {
    rootState.value = storage.loadRootData();
    debug.log('角色商店', '已从乾坤宝库重新同步所有数据');
  };

  /**
   * 创建一个全新的角色 (AI增强版)
   * @param payload 包含角色基础信息和世界数据的数据包
   * @returns 创建成功则返回角色的基础信息，否则返回 undefined
   */
  const createNewCharacter = async (payload: CreationPayload): Promise<CharacterBaseInfo | undefined> => {
    const uiStore = useUIStore();
    const { charId, baseInfo, world, mode, age } = payload;
    if (rootState.value.角色列表[charId]) {
      toast.error(`角色ID ${charId} 已存在，创建失败！`);
      return undefined;
    }

    // const toastId = `create-char-${charId}`; // 不再需要独立的toastId
    try {
      uiStore.updateLoadingText('即将开始角色创建...');
      
      // [核心改造] 1. 创建角色前，彻底清理酒馆环境
      await clearAllCharacterData(); // 不再需要传递toastId

      // 2. 如果是联机模式，先向后端提交角色创建信息
      if (mode === '联机') {
        try {
          uiStore.updateLoadingText('正在向云端提交角色信息...');
          
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
          
          debug.log('角色商店', '向后端提交的数据', characterSubmissionData);
          const backendResult = await createCharacterAPI(characterSubmissionData);
          debug.log('角色商店', '后端返回结果', backendResult);
          uiStore.updateLoadingText('角色信息已成功提交至云端！');
        } catch (error) {
          debug.error('角色商店', '向后端提交失败', error);
          toast.warning('向云端提交角色信息失败，将继续本地创建流程'); // 保留一个toast警告
          // 不要抛出错误，允许继续本地创建流程
        }
      }

      // 3. 使用AI增强的初始化服务创建完整的存档数据
      let initialSaveData: SaveData | null = null;
      try {
        initialSaveData = await initializeCharacter(charId, baseInfo, world, age);
      } catch (e) {
        if (mode === '单机') { // 单机
          initialSaveData = await initializeCharacterOffline(charId, baseInfo, world, age);
        } else {
          throw e;
        }
      }

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
      
      // 4. 同步到酒馆
      uiStore.updateLoadingText('正在将角色档案同步至酒馆...');
      await setActiveCharacterInTavern(charId);
      
      // 5. 如果是联机模式，同步完整存档数据到云端
      if (mode === '联机') {
        try {
          uiStore.updateLoadingText('正在同步完整存档到云端...');
          
          const saveDataToSync = {
            save_data: initialSaveData,
            world_map: {}, // 从酒馆变量或初始化结果获取地图数据
            game_time: '修仙元年 春'
          };
          
          debug.log('角色商店', '准备同步到云端的存档数据', saveDataToSync);
          await updateCharacterSave(charId, saveDataToSync);
          uiStore.updateLoadingText('完整存档已成功同步到云端！');
        } catch (error) {
          debug.warn('角色商店', '同步存档数据到云端失败', error);
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          toast.warning(`存档同步失败: ${errorMessage}`);
          // 不要抛出错误，允许角色创建继续完成
        }
      }
      
      // 最终的成功提示由App.vue处理
      return baseInfo;
    } catch (error) {
      debug.error('角色商店', '角色创建失败', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      // 错误也由App.vue处理
      throw new Error(`角色创建失败: ${errorMessage}`);
    }
  };
  
  /**
   * 删除一个角色及其所有存档
   * @param charId 要删除的角色ID
   */
  const deleteCharacter = async (charId: string) => {
    if (!rootState.value.角色列表[charId]) return;

    const characterName = rootState.value.角色列表[charId]?.角色基础信息.名字 || charId;

    // 如果删除的是当前激活的角色，则需要清理Tavern环境
    if (rootState.value.当前激活存档?.角色ID === charId) {
      try {
        await clearAllCharacterData();
        toast.info('已同步清理酒馆环境变量。');
      } catch (error) {
        debug.error('角色商店', '删除角色时清理酒馆数据失败', error);
        toast.error('清理酒馆环境变量失败，建议刷新页面。');
      }
      rootState.value.当前激活存档 = null;
    }

    delete rootState.value.角色列表[charId];
    commitToStorage();
    toast.success(`角色【${characterName}】已彻底删除。`);
  };

  /**
   * 加载一个游戏存档到Tavern (设置其为激活状态并同步聊天记录)
   * @param charId 角色ID
   * @param slotKey 存档槽位关键字 (e.g., "存档1")
   */
  const loadGame = async (charId: string, slotKey: string) => {
      debug.log('角色商店', `开始加载游戏，角色ID: ${charId}, 存档槽: ${slotKey}`);
      const uiStore = useUIStore();
      
      const profile = rootState.value.角色列表[charId];
      if (!profile) {
        debug.error('角色商店', '找不到要加载的角色', charId);
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
        debug.error('角色商店', '找不到指定的存档槽位', slotKey);
        toast.error('找不到指定的存档槽位！');
        return false;
      }

      // 在加载前执行数据骨架验证
      if (targetSlot.存档数据) {
        const validationResult = validateGameData(targetSlot.存档数据, profile);
        if (!validationResult.isValid) {
          debug.error('角色商店', '存档数据验证失败', validationResult.errors);
          uiStore.showDataValidationErrorDialog(
            validationResult.errors,
            () => {
              // [核心改造] 用户确认后，调用AI进行智能修复
              repairCharacterDataWithAI(charId, slotKey);
            },
            'loading' // [核心改造] 明确告知UI这是“加载”场景
          );
          return false; // 中断加载流程
        }
      }
  
      const loadId = 'load-game-process';
      try {
        uiStore.startLoading('开始加载存档...');
        // [核心改造] 1. 加载游戏前，彻底清理酒馆变量环境
        await clearAllCharacterData();
  
        uiStore.updateLoadingText('天机重置完毕，正在加载存档...');
        
        // 2. 设置激活存档
        debug.log('角色商店', '设置当前激活存档');
      rootState.value.当前激活存档 = { 角色ID: charId, 存档槽位: slotKey };
      commitToStorage(); // 立即保存激活状态

      // 3. 将激活的存档数据同步到酒馆
      debug.log('角色商店', '同步角色档案到酒馆');
      await setActiveCharacterInTavern(charId);
      
      debug.log('角色商店', '加载完成');
      toast.success(`已成功加载【${profile.角色基础信息.名字}】的存档: ${targetSlot.存档名 || slotKey}`);
      return true;
      
    } catch (error) {
      debug.error('角色商店', '加载过程出错', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error(`存档加载失败：${errorMessage}`);
      return false;
    } finally {
      uiStore.stopLoading();
    }
  };

  /**
   * [核心] 将激活存档的完整数据同步到酒馆的 `character.saveData` 聊天变量中
   * 这是唯一向酒馆写入角色数据的地方
   * @param charId 要设置为激活的角色ID
   */
  const setActiveCharacterInTavern = async (charId: string) => {
    const profile = rootState.value.角色列表[charId];
    if (!profile) {
      throw new Error(`[存档核心] 无法找到ID为 ${charId} 的角色档案`);
    }
    
    // 必须获取当前激活的存档数据，因为这是唯一的数据源
    const currentSlot = activeSaveSlot.value;
    if (!currentSlot || !currentSlot.存档数据) {
      // 这是一个警告而不是错误，因为新角色可能还没有存档数据
      debug.warn('角色商店', `角色 ${charId} 没有可用的存档数据来同步到酒馆`);
      return;
    }
    
    try {
      const helper = getTavernHelper();
      if (!helper) {
        throw new Error('[存档核心] 酒馆连接尚未建立！');
      }

      // ⚠️ 关键修复：先清空旧的 character.saveData，避免数据累积和嵌套
      debug.log('角色商店', '清空旧的character.saveData，避免数据累积');
      await helper.deleteVariable('character.saveData', { type: 'chat' });

      // 唯一的写入操作：将整个SaveData对象写入到 'character.saveData'
      const chatVars = {
        'character.saveData': currentSlot.存档数据
      };

      await helper.insertOrAssignVariables(chatVars, { type: 'chat' });

      debug.log('角色商店', `已将【${profile.角色基础信息.名字}】的激活存档同步至酒馆`);
      // toast.info(`已将【${profile.角色基础信息.名字}】的档案同步至酒馆。`); // 由调用者处理通知

    } catch (error) {
      debug.error('角色商店', '同步角色档案至酒馆失败', error);
      toast.error('同步角色档案至酒馆失败，请检查控制台。');
      // 重新抛出错误，以便调用堆栈可以捕获它
      throw error;
    }
  };

  /**
   * [核心] 从酒馆同步最新的存档数据到本地store
   * 用于在游戏过程中获取AI更新的数据
   */
  const syncFromTavern = async () => {
    const active = rootState.value.当前激活存档;
    const profile = activeCharacterProfile.value;
    const slot = activeSaveSlot.value;

    if (!active || !profile || !slot) {
      debug.warn('角色商店', '没有激活的存档，无法从酒馆同步数据');
      return;
    }

    try {
      const helper = getTavernHelper();
      if (!helper) {
        throw new Error('酒馆连接尚未建立！');
      }

      // 从酒馆获取最新数据
      const chatVars = await helper.getVariables({ type: 'chat' });
      const tavernSaveData = chatVars['character.saveData'] as SaveData | undefined;
      
      if (tavernSaveData) {
        // ⚠️ 数据完整性检查：拒绝嵌套或异常的数据结构
        if ((tavernSaveData as any).character ||
            (tavernSaveData as any).存档列表 ||
            (tavernSaveData as any).角色列表) {
          console.error('[角色商店] 检测到酒馆数据异常：包含不应存在的嵌套结构', tavernSaveData);
          toast.error('检测到酒馆数据异常，已拒绝同步。请检查控制台。');
          return;
        }

        // 直接使用酒馆数据，不做任何"修复"
        const cleanedSaveData = tavernSaveData;

        // 修复物品数据问题：确保背包物品数据正确
        if (cleanedSaveData.背包 && typeof cleanedSaveData.背包.物品 === 'object') {
          if (Object.keys(cleanedSaveData.背包.物品).length === 0) {
            debug.log('角色商店', '检测到空的背包.物品数据');
          } else {
            debug.log('角色商店', `背包中有${Object.keys(cleanedSaveData.背包.物品).length}个物品`);
          }
        }
        
        // 修复三千大道数据：确保经验值不是undefined
        if (cleanedSaveData.三千大道) {
          const daoSystem = cleanedSaveData.三千大道;
          
          // 修复大道进度数据
          if (daoSystem.大道进度) {
            Object.keys(daoSystem.大道进度).forEach(daoName => {
              const progress = daoSystem.大道进度[daoName];
              if (progress) {
                // 确保所有数值字段都是数字
                if (progress.当前经验 === undefined || progress.当前经验 === null) {
                  progress.当前经验 = 0;
                  debug.log('角色商店', `修复${daoName}的当前经验为0`);
                }
                if (progress.总经验 === undefined || progress.总经验 === null) {
                  progress.总经验 = 0;
                  debug.log('角色商店', `修复${daoName}的总经验为0`);
                }
                if (progress.当前阶段 === undefined || progress.当前阶段 === null) {
                  progress.当前阶段 = 0;
                  debug.log('角色商店', `修复${daoName}的当前阶段为0`);
                }
                if (progress.是否解锁 === undefined) {
                  progress.是否解锁 = true;
                  debug.log('角色商店', `修复${daoName}的解锁状态为true`);
                }
                if (!progress.道名) {
                  progress.道名 = daoName;
                }
              }
            });
          }
          
          // 确保已解锁大道数组存在
          if (!daoSystem.已解锁大道 || !Array.isArray(daoSystem.已解锁大道)) {
            daoSystem.已解锁大道 = Object.keys(daoSystem.大道进度 || {});
            debug.log('角色商店', `重建已解锁大道列表: ${daoSystem.已解锁大道.join(', ')}`);
          }
          
          // 确保大道路径定义存在
          if (!daoSystem.大道路径定义) {
            daoSystem.大道路径定义 = {};
            debug.log('角色商店', '初始化空的大道路径定义');
          }
        } else {
          // 如果完全没有三千大道数据，初始化一个空结构
          cleanedSaveData.三千大道 = {
            已解锁大道: [],
            大道进度: {},
            大道路径定义: {}
          };
          debug.log('角色商店', '初始化空的三千大道系统');
        }

        // 确保世界信息数据存在
        if (!cleanedSaveData.世界信息) {
          debug.warn('角色商店', '缺少世界信息数据，可能需要重新生成地图');
        } else {
          debug.log('角色商店', '世界信息数据正常');
        }

        // 根据游戏时间自动更新寿命（年龄）- 用于实时显示
        try {
          const 更新后年龄 = updateLifespanFromGameTime(cleanedSaveData);
          debug.log('角色商店', `[同步] 自动更新玩家年龄: ${更新后年龄}岁`);

          // 更新所有NPC的年龄
          if (cleanedSaveData.人物关系 && cleanedSaveData.游戏时间) {
            let npcCount = 0;
            Object.values(cleanedSaveData.人物关系).forEach((npc: any) => {
              if (npc && typeof npc === 'object') {
                updateNpcLifespanFromGameTime(npc, cleanedSaveData.游戏时间);
                npcCount++;
              }
            });
            debug.log('角色商店', `[同步] 自动更新${npcCount}个NPC年龄`);
          }
        } catch (error) {
          debug.warn('角色商店', '[同步] 自动更新年龄失败（非致命）:', error);
        }

        // 更新本地存档数据 - 使用响应式更新方式
        const charId = active.角色ID;
        const slotId = active.存档槽位;

        // ⚠️ 保留本地的记忆数据，避免被酒馆的旧数据覆盖
        // 因为在AI响应流程中，记忆会在本地先更新，然后才同步到酒馆
        const localMemory = slot.存档数据?.记忆;
        if (localMemory) {
          cleanedSaveData.记忆 = localMemory;
          debug.log('角色商店', '[同步] 保留本地记忆数据，避免被酒馆旧数据覆盖');
        }

        if (profile.模式 === '单机' && profile.存档列表) {
          // 创建新的存档列表对象，触发响应式
          rootState.value.角色列表[charId].存档列表 = {
            ...profile.存档列表,
            [slotId]: {
              ...profile.存档列表[slotId],
              存档数据: cleanedSaveData,
              保存时间: new Date().toISOString()
            }
          };
        } else if (profile.模式 === '联机' && profile.存档) {
          // 联机模式直接更新存档
          rootState.value.角色列表[charId].存档 = {
            ...profile.存档,
            存档数据: cleanedSaveData,
            保存时间: new Date().toISOString()
          };
        }

        commitToStorage();
        debug.log('角色商店', '已从酒馆同步最新存档数据（响应式更新）');
        debug.log('角色商店', `最终背包物品数量: ${Object.keys(cleanedSaveData.背包?.物品 || {}).length}`);
        debug.log('角色商店', `是否有世界信息: ${!!cleanedSaveData.世界信息}`);
      } else {
        debug.warn('角色商店', '酒馆中没有找到character.saveData数据');
      }
    } catch (error) {
      debug.error('角色商店', '从酒馆同步数据失败', error);
    }
  };

  /**
   * [核心改造] 保存当前游戏进度到激活的存档槽
   * 新逻辑: 从酒馆的 `character.saveData` 变量读取完整状态，然后写入 Pinia store
   */
  const saveCurrentGame = async () => {
    const active = rootState.value.当前激活存档;
    const profile = activeCharacterProfile.value;
    const slot = activeSaveSlot.value;

    if (!active || !profile || !slot) {
      toast.error('没有激活的存档，无法保存！');
      return;
    }

    const saveId = `save-game-${Date.now()}`;
    try {
      toast.loading('正在保存进度...', { id: saveId });

      const helper = getTavernHelper();
      if (!helper) {
        throw new Error('酒馆连接尚未建立！');
      }

      // 1. 从酒馆的聊天变量中获取最新的游戏状态
      const chatVars = await helper.getVariables({ type: 'chat' });
      const currentSaveData = chatVars['character.saveData'] as SaveData | undefined;

      if (!currentSaveData) {
        throw new Error('无法从酒馆获取当前存档数据(character.saveData)，可能尚未初始化。');
      }

      // 1.5 根据游戏时间自动更新寿命（年龄）
      try {
        const 更新后年龄 = updateLifespanFromGameTime(currentSaveData);
        debug.log('角色商店', `[保存] 自动更新玩家年龄: ${更新后年龄}岁`);

        // 更新所有NPC的年龄
        if (currentSaveData.人物关系 && currentSaveData.游戏时间) {
          let npcCount = 0;
          Object.values(currentSaveData.人物关系).forEach((npc: any) => {
            if (npc && typeof npc === 'object') {
              updateNpcLifespanFromGameTime(npc, currentSaveData.游戏时间);
              npcCount++;
            }
          });
          debug.log('角色商店', `[保存] 自动更新${npcCount}个NPC年龄`);
        }
      } catch (error) {
        debug.warn('角色商店', '[保存] 自动更新年龄失败（非致命）:', error);
      }

      // 2. 更新 Pinia Store 中的存档槽位
      slot.保存时间 = new Date().toISOString();
      slot.存档数据 = currentSaveData;
      // TODO: 更新游戏内时间等元数据
      // slot.游戏内时间 = currentSaveData.游戏内时间.当前时间;

      // 3. 将修改写回 rootState
      if (profile.模式 === '单机' && profile.存档列表) {
        profile.存档列表[active.存档槽位] = slot;
      } else if (profile.模式 === '联机') {
        profile.存档 = slot;
      }
      
      // 4. 持久化到本地存储
      commitToStorage();
      
      // 5. 如果是联机模式，则触发云端同步
      if (profile.模式 === '联机') {
        try {
          toast.loading('正在同步存档到云端...', { id: saveId });
          const saveDataToSync = {
            save_data: currentSaveData,
            world_map: {}, // 根据需要填充
            game_time: slot.游戏内时间 || '未知时间'
          };
          await updateCharacterSave(active.角色ID, saveDataToSync);
          toast.success('存档已成功同步到云端！', { id: saveId });

          // 更新云端同步信息
          if (profile.存档?.云端同步信息) {
            profile.存档.云端同步信息.最后同步 = new Date().toISOString();
            profile.存档.云端同步信息.需要同步 = false;
            profile.存档.云端同步信息.版本++;
            commitToStorage();
          }

        } catch (error) {
          debug.error('角色商店', '云端同步-保存时同步失败', error);
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          toast.error(`云端同步失败: ${errorMessage}`, { id: saveId });
          // 标记为需要同步
           if (profile.存档?.云端同步信息) {
            profile.存档.云端同步信息.需要同步 = true;
            commitToStorage();
          }
        }
      }

      // 如果不是联机模式，在这里就显示最终成功
      if (profile.模式 !== '联机') {
        toast.success(`存档【${slot.存档名}】已成功保存！`, { id: saveId });
      }

    } catch (error) {
      debug.error('角色商店', '存档保存过程出错', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error(`存档保存失败：${errorMessage}`, { id: saveId });
    }
  };

  /**
   * 删除指定角色的指定存档
   * @param charId 角色ID
   * @param slotKey 存档槽位关键字
   */
  const deleteSave = async (charId: string, slotKey: string) => {
    const profile = rootState.value.角色列表[charId];
    if (!profile || profile.模式 !== '单机' || !profile.存档列表) {
      toast.error('无法删除存档：角色不存在或非单机模式');
      return;
    }

    // 检查是否存在该存档
    const saveName = profile.存档列表?.[slotKey]?.存档名 || slotKey;
    if (!profile.存档列表?.[slotKey]) {
      toast.error(`存档【${saveName}】不存在`);
      return;
    }

    // 检查是否为当前激活的存档
    const active = rootState.value.当前激活存档;
    if (active?.角色ID === charId && active?.存档槽位 === slotKey) {
      try {
        await clearAllCharacterData();
        toast.info('当前存档已激活，同步清理酒馆环境变量。');
      } catch (error) {
        debug.error('角色商店', '删除激活存档时清理酒馆数据失败', error);
        toast.error('清理酒馆环境变量失败，建议刷新页面。');
      }
      rootState.value.当前激活存档 = null;
    }

    // 删除存档
    delete profile.存档列表[slotKey];
    commitToStorage();
    toast.success(`存档【${saveName}】已删除`);
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
   * [新增] 将当前游戏进度另存为新的存档槽位
   * @param saveName 新存档的名称
   * @returns 新存档的槽位ID，失败返回 null
   */
  const saveAsNewSlot = async (saveName: string): Promise<string | null> => {
    const active = rootState.value.当前激活存档;
    const profile = activeCharacterProfile.value;
    const currentSlot = activeSaveSlot.value;

    if (!active || !profile || !currentSlot?.存档数据) {
      toast.error('没有激活的游戏进度');
      return null;
    }

    if (profile.模式 !== '单机') {
      toast.error('联机模式不支持多存档');
      return null;
    }

    if (!profile.存档列表) {
      profile.存档列表 = {};
    }

    // 检查存档名是否已存在
    if (profile.存档列表[saveName]) {
      toast.error('存档名称已存在');
      return null;
    }

    try {
      // 1. 创建新存档槽位，复制当前存档数据
      const now = new Date().toISOString();
      const newSlot: SaveSlot = {
        存档名: saveName,
        保存时间: now,
        最后保存时间: now,
        游戏内时间: currentSlot.游戏内时间,
        游戏时长: currentSlot.游戏时长,
        角色名字: currentSlot.角色名字,
        境界: currentSlot.境界,
        位置: currentSlot.位置,
        修为进度: currentSlot.修为进度,
        世界地图: currentSlot.世界地图,
        // 深拷贝存档数据
        存档数据: JSON.parse(JSON.stringify(currentSlot.存档数据))
      };

      // 2. 添加到存档列表
      profile.存档列表[saveName] = newSlot;

      // 3. 保存到本地存储
      await commitToStorage();

      toast.success(`已另存为新存档：${saveName}`);
      debug.log('角色商店', `已创建新存档槽位: ${saveName}`);

      return saveName;
    } catch (error) {
      debug.error('角色商店', '另存为新存档失败', error);
      toast.error('另存为新存档失败');
      return null;
    }
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
  const updateCharacterData = async (stateChanges: StateChangeLog) => {
    const save = activeSaveSlot.value;
    if (!save?.存档数据) {
      debug.warn('角色商店', '没有激活的存档，无法更新角色数据');
      return;
    }

    // 从 stateChanges 提取变更的路径
    const changedPaths: string[] = [];
    if (stateChanges?.changes) {
      for (const change of stateChanges.changes) {
        changedPaths.push(change.key);
        // 应用变更到本地数据（使用 lodash set）
        setLodash(save.存档数据, change.key, change.newValue);
      }
    }

    // 更新保存时间
    save.保存时间 = new Date().toISOString();
    commitToStorage();

    // 🔥 增量同步到酒馆
    if (changedPaths.length > 0) {
      await syncToTavernAndSave({ changedPaths });
      debug.log('角色商店', `角色数据已更新并增量同步 ${changedPaths.length} 个字段`, changedPaths);
    }
  };

  /**
   * 加载存档列表（兼容方法）
   */
  const loadSaves = async () => {
    // 这个方法主要用于刷新存档数据，实际上存档数据已经在 computed 中自动计算
    reloadFromStorage();
  };

  /**
   * 根据存档 ID 加载游戏
   * @param saveId 存档 ID
   */
  const loadGameById = async (saveId: string) => {
    const profile = activeCharacterProfile.value;
    if (!profile) {
      toast.error('没有激活的角色');
      return false;
    }

    const charId = rootState.value.当前激活存档?.角色ID;
    if (!charId) {
      toast.error('无法确定角色ID');
      return false;
    }

    if (profile.模式 === '单机') {
      return await loadGame(charId, saveId);
    } else {
      // 联机模式只有一个存档
      return await loadGame(charId, '存档');
    }
  };

  /**
   * 根据存档 ID 删除存档
   * @param saveId 存档 ID
   */
  const deleteSaveById = async (saveId: string) => {
    const charId = rootState.value.当前激活存档?.角色ID;
    if (!charId) {
      toast.error('无法确定角色ID');
      return;
    }

    return deleteSave(charId, saveId);
  };

  /**
   * 导入存档数据
   * @param saveData 要导入的存档数据
   */
  const importSave = async (saveData: SaveSlot) => {
    const profile = activeCharacterProfile.value;
    const charId = rootState.value.当前激活存档?.角色ID;
    
    if (!profile || !charId) {
      toast.error('没有激活的角色，无法导入存档');
      return;
    }

    if (profile.模式 !== '单机') {
      toast.error('联机模式不支持存档导入');
      return;
    }

    if (!profile.存档列表) {
      profile.存档列表 = {};
    }

    // 生成新的存档名称，避免冲突
    let importName = saveData.存档名 || '导入存档';
    let counter = 1;
    while (profile.存档列表[importName]) {
      importName = `${saveData.存档名 || '导入存档'}_${counter}`;
      counter++;
    }

    profile.存档列表[importName] = {
      ...saveData,
      存档名: importName
    };

    commitToStorage();
    toast.success(`存档【${importName}】导入成功`);
  };

  /**
   * 清空所有存档
   */
  const clearAllSaves = async () => {
    const profile = activeCharacterProfile.value;
    const charId = rootState.value.当前激活存档?.角色ID;
    
    if (!profile || !charId) {
      toast.error('没有激活的角色');
      return;
    }

    if (profile.模式 === '单机' && profile.存档列表) {
      profile.存档列表 = {};
    } else if (profile.模式 === '联机' && profile.存档) {
      profile.存档.存档数据 = null;
      profile.存档.保存时间 = null;
    }

    // 清空当前激活存档
    rootState.value.当前激活存档 = null;
    
    commitToStorage();
    toast.success('所有存档已清空');
  };

  /**
   * [新增] 退出当前游戏会话
   * 清理激活状态和酒馆变量，但不删除任何数据
   */
  const exitGameSession = async () => {
    if (!rootState.value.当前激活存档) {
      // toast.info('当前没有激活的游戏会话。'); // 安静退出，无需提示
      return;
    }
    
    const uiStore = useUIStore();
    try {
      uiStore.startLoading('正在退出游戏...');
      await clearAllCharacterData();
      rootState.value.当前激活存档 = null;
      await commitToStorage();
      toast.success('已成功退出游戏，酒馆环境已重置。');
    } catch (error) {
      debug.error('角色商店', '退出游戏会话失败', error);
      toast.error('退出游戏失败，建议刷新页面以确保环境纯净。');
    } finally {
      uiStore.stopLoading();
    }
  };


  /**
   * [内部辅助] 执行Tavern指令
   * @param saveData 当前存档数据
   * @param profile 当前角色档案
   * @param commands 指令数组
   */
  const executeTavernCommands = async (saveData: SaveData, profile: CharacterProfile, commands: any[]): Promise<string[]> => {
    const errors: string[] = [];
    
    // 简化的路径解析和设置函数
    const setNestedValue = (obj: any, path: string, value: any) => {
      const keys = path.split('.');
      let current = obj;
      for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined || typeof current[keys[i]] !== 'object') {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
    };

    for (const command of commands) {
      try {
        const { action, key, value } = command;
        if (!action || !key) {
          errors.push(`无效指令: ${JSON.stringify(command)}`);
          continue;
        }

        // 确定操作的根对象
        let rootObject: any;
        let relativeKey: string;

        if (key.startsWith('character.profile.')) {
          rootObject = profile;
          relativeKey = key.substring('character.profile.'.length);
        } else if (key.startsWith('character.saveData.')) {
          rootObject = saveData;
          relativeKey = key.substring('character.saveData.'.length);
        } else {
          errors.push(`无法解析指令key的根路径: ${key}`);
          continue;
        }

        if (action === 'set') {
          setNestedValue(rootObject, relativeKey, value);
          debug.log('AI修复', `执行 set: ${key} =`, value);
        } else {
          debug.warn('AI修复', `暂不支持的指令 action: ${action}`);
        }
      } catch (e) {
        errors.push(`执行指令失败: ${JSON.stringify(command)}`);
        debug.error('AI修复', '执行指令时出错', e);
      }
    }
    return errors;
  };

  /**
   * [新增] 使用AI修复存档数据结构
   * @param charId 角色ID
   * @param slotKey 存档槽位
   */
  const repairCharacterDataWithAI = async (charId: string, slotKey: string) => {
    const uiStore = useUIStore();
    const profile = rootState.value.角色列表[charId];
    if (!profile) {
      toast.error('修复失败：找不到角色');
      return;
    }

    let targetSlot: SaveSlot | undefined | null;
    if (profile.模式 === '单机') {
      targetSlot = profile.存档列表?.[slotKey];
    } else {
      targetSlot = profile.存档;
    }

    if (!targetSlot || !targetSlot.存档数据) {
      toast.error('修复失败：找不到存档数据');
      return;
    }

    try {
      uiStore.startLoading('AI正在分析存档结构，请稍候...');
      const corruptedData = targetSlot.存档数据;

      // 1. 生成修复提示词 - 暂时传递空对象作为typeDefs
      const systemPrompt = getAIDataRepairSystemPrompt(corruptedData, {});

      // 2. 调用AI生成修复指令
      const helper = getTavernHelper();
      if (!helper) throw new Error('酒馆连接不可用');
      
      uiStore.updateLoadingText('天道正在推演修复方案...');
      const aiResponse = await helper.generate({
        user_input: systemPrompt,
        overrides: {
          temperature: 0.7,
          max_context_length: 8000,
          max_length: 2048,
        }
      });

      if (!aiResponse) {
        throw new Error('AI未能生成修复指令');
      }

      // 3. 解析AI响应
      let commands: any[] = [];
      try {
        const jsonString = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedResponse = JSON.parse(jsonString);
        if (parsedResponse.tavern_commands && Array.isArray(parsedResponse.tavern_commands)) {
          commands = parsedResponse.tavern_commands;
        } else {
          throw new Error('AI响应中缺少有效的 tavern_commands 数组');
        }
      } catch (e) {
        debug.error('角色商店', '解析AI修复指令失败', { error: e, response: aiResponse });
        throw new Error('解析AI修复指令失败');
      }

      if (commands.length === 0) {
        toast.info('AI分析认为当前存档无需修复。');
        await loadGame(charId, slotKey);
        return;
      }

      uiStore.updateLoadingText(`AI已生成 ${commands.length} 条修复指令，正在应用...`);
      
      // 4. 执行修复指令
      const executionErrors = await executeTavernCommands(targetSlot.存档数据, profile, commands);

      if (executionErrors.length > 0) {
        debug.error('角色商店', '执行AI修复指令时出错', executionErrors);
        toast.error(`部分修复指令执行失败: ${executionErrors.join(', ')}`);
      }

      // 5. 保存并重新加载
      targetSlot.保存时间 = new Date().toISOString();
      await commitToStorage();
      
      toast.success('AI已完成存档修复！正在重新加载游戏...');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadGame(charId, slotKey);

    } catch (error) {
      debug.error('角色商店', 'AI修复存档失败', error);
      toast.error(`存档修复失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      uiStore.stopLoading();
    }
  };

return {
  // State
  rootState,
  // Getters
  allCharacterProfiles,
  activeCharacterProfile,
  activeSaveSlot,
  saveSlots,
  // Actions
  reloadFromStorage,
  createNewCharacter,
  deleteCharacter,
  deleteSave,
  deleteSaveById,
  createNewSave,
  saveAsNewSlot, // 新增：另存为新存档
  renameSave,
  loadGame,
  loadGameById,
  saveCurrentGame,
  updateCharacterData,
  loadSaves,
  importSave,
  clearAllSaves,
  exitGameSession, // 新增：退出游戏会话
  commitToStorage, // 导出给外部使用
  syncToTavernAndSave, // 新增：同步到酒馆并保存（支持增量同步）
  updateTavernField, // 新增：增量更新单个字段
  updateTavernFields, // 新增：批量增量更新多个字段
  setActiveCharacterInTavern,
  syncFromTavern,
  repairCharacterDataWithAI, // 暴露新的AI修复方法
  // 初始状态变更传递
  initialCreationStateChanges,
  setInitialCreationStateChanges,
  consumeInitialCreationStateChanges,
};
});
