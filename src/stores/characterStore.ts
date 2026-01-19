import { ref, computed, triggerRef } from 'vue';
import { defineStore } from 'pinia';
import { set as setLodash, cloneDeep } from 'lodash';
import { toast } from '@/utils/toast';
import { debug } from '@/utils/debug';
import { useUIStore } from './uiStore'; // 导入UI Store
import { useCharacterCreationStore } from './characterCreationStore'; // 导入创角Store
import * as storage from '@/utils/indexedDBManager';
import { getTavernHelper, clearAllCharacterData, isTavernEnv } from '@/utils/tavern';
import { ensureSaveDataHasTavernNsfw } from '@/utils/nsfw';
import { initializeCharacter } from '@/services/characterInitialization';
import { createCharacter as createCharacterAPI, fetchCharacterProfile, updateCharacterSave, verifyStoredToken } from '@/services/request';
import { isBackendConfigured } from '@/services/backendConfig';
import { validateGameData } from '@/utils/dataValidation';
import { getAIDataRepairSystemPrompt } from '@/utils/prompts/tasks/dataRepairPrompts';
import { updateLifespanFromGameTime, updateNpcLifespanFromGameTime } from '@/utils/lifespanCalculator'; // <-- 导入寿命计算工具
import { updateMasteredSkills } from '@/utils/masteredSkillsCalculator'; // <-- 导入掌握技能计算工具
import { updateStatusEffects } from '@/utils/statusEffectManager'; // <-- 导入状态效果管理工具
import { detectLegacySaveData, isSaveDataV3, migrateSaveDataToLatest, extractSaveDisplayInfo } from '@/utils/saveMigration';
import { validateSaveDataV3 } from '@/utils/saveValidationV3';
import { useGameStateStore } from '@/stores/gameStateStore';
import SaveMigrationModal from '@/components/dashboard/components/SaveMigrationModal.vue';
import type { World} from '@/types';
import type { LocalStorageRoot, CharacterProfile, CharacterBaseInfo, SaveSlot, SaveData, StateChangeLog, Realm, NpcProfile, Item } from '@/types/game';

// 假设的创角数据包，实际应从创角流程获取
interface CreationPayload {
  charId: string; // e.g., 'char_' + Date.now()
  baseInfo: CharacterBaseInfo;
  world: World; // 世界数据
  mode: '单机' | '联机';
  age: number; // 开局年龄
}

// Tavern命令类型
interface TavernCommand {
  action: string;
  key: string;
  value?: unknown;
}

/**
 * 🔥 辅助函数：获取联机存档槽位
 * 统一接口，支持旧数据迁移
 */
function getOnlineSaveSlot(profile: CharacterProfile): SaveSlot | null {
  if (profile.模式 !== '联机') return null;

  // 新结构：使用存档列表
  if (profile.存档列表?.['云端修行']) {
    return profile.存档列表['云端修行'];
  }

  // 兼容：部分旧版本/旧数据使用 “存档” 作为联机槽位 key
  if (profile.存档列表?.['存档'] && !profile.存档列表?.['云端修行']) {
    debug.log('角色商店', '?? 检测到联机存档槽位 key=存档，正在迁移为 云端修行...');
    profile.存档列表['云端修行'] = { ...(profile.存档列表['存档'] as any), 存档名: '云端修行' };
    delete (profile.存档列表 as any)['存档'];
    return profile.存档列表['云端修行'];
  }

  // 兼容旧数据：如果旧的 profile.存档 存在，迁移到新结构
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((profile as any).存档) {
    debug.log('角色商店', '⚠️ 检测到旧存档结构，正在迁移到统一结构...');
    if (!profile.存档列表) {
      profile.存档列表 = {};
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profile.存档列表['云端修行'] = (profile as any).存档;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (profile as any).存档; // 清理旧字段
    debug.log('角色商店', '✅ 旧存档数据已迁移到 存档列表["云端修行"]');
    return profile.存档列表['云端修行'];
  }

  return null;
}

/**
 * 🔥 过滤存档数据用于云端同步
 * 排除叙事信息（narrativeHistory）以减少数据量
 */
function filterSaveDataForCloud(saveData: SaveData | null): SaveData | null {
  if (!saveData) return null;

  // 深拷贝以避免修改原始数据
  const filtered = JSON.parse(JSON.stringify(saveData)) as SaveData;

  // 🔥 移除叙事历史（太大了，且云存档不需要）
  // - V3: 系统.历史.叙事
  // - 兼容旧结构: 历史.叙事 / 叙事历史 / 对话历史
  const anyFiltered = filtered as any;
  let removed = false;

  if (anyFiltered?.系统?.历史 && typeof anyFiltered.系统.历史 === 'object' && '叙事' in anyFiltered.系统.历史) {
    delete anyFiltered.系统.历史.叙事;
    removed = true;
  }
  if (anyFiltered?.历史 && typeof anyFiltered.历史 === 'object' && '叙事' in anyFiltered.历史) {
    delete anyFiltered.历史.叙事;
    removed = true;
  }
  if ('叙事历史' in anyFiltered) {
    delete anyFiltered.叙事历史;
    removed = true;
  }
  if ('对话历史' in anyFiltered) {
    delete anyFiltered.对话历史;
    removed = true;
  }

  if (removed) {
    debug.log('角色商店', '✅ 已移除叙事历史用于云端同步');
  }

  return filtered;
}


export const useCharacterStore = defineStore('characterV3', () => {
  // --- 状态 (State) ---
  // Store的核心状态直接镜像本地存储的根对象
  const rootState = ref<LocalStorageRoot>({
    当前激活存档: null,
    角色列表: {}
  });
  // 新增：用于暂存角色创建时的初始状态变更
  const initialCreationStateChanges = ref<StateChangeLog | null>(null);

  // 🔥 异步初始化：从 IndexedDB 加载数据
  const initialized = ref(false);
  const initializeStore = async () => {
    if (initialized.value) return;

    try {
      // 1. 先尝试数据迁移
      const migrated = await storage.migrateData();
      if (migrated) {
        debug.log('角色商店', '✅ 数据已迁移到IndexedDB');
      }

      // 2. 加载数据
      rootState.value = await storage.loadRootData();

      // 🔥 3. 兼容性迁移：将旧版本的存档结构迁移到新结构
      let needsSave = false;
      const asyncMigrations: Promise<void>[] = [];
      Object.entries(rootState.value.角色列表).forEach(([charId, profile]) => {
        const anyProfile = profile as any;
        const roleNameForLog = anyProfile.角色?.名字 || anyProfile.角色基础信息?.名字 || charId;

        // 3.0 迁移角色字段：角色基础信息 → 角色（v3.7.x -> v4.0）
        if (!anyProfile.角色 && anyProfile.角色基础信息) {
          anyProfile.角色 = anyProfile.角色基础信息;
          delete anyProfile.角色基础信息;
          needsSave = true;
        }

        // 3.0.1 确保存档列表存在（新结构要求）
        if (!anyProfile.存档列表 || typeof anyProfile.存档列表 !== 'object') {
          anyProfile.存档列表 = {};
          needsSave = true;
        }

        // 3.0.2 修复联机槽位 key：存档 → 云端修行
        if (anyProfile.模式 === '联机' && anyProfile.存档列表?.['存档'] && !anyProfile.存档列表?.['云端修行']) {
          anyProfile.存档列表['云端修行'] = { ...(anyProfile.存档列表['存档'] as any), 存档名: '云端修行' };
          delete anyProfile.存档列表['存档'];
          needsSave = true;
        }
        // 3.1 迁移联机模式：profile.存档 → profile.存档列表['云端修行']
        if (profile.模式 === '联机' && profile.存档 && !profile.存档列表?.['云端修行']) {
          debug.log('角色商店', `🔄 迁移联机角色「${roleNameForLog}」的存档结构`);

          // 初始化存档列表（如果不存在）
          if (!profile.存档列表) {
            profile.存档列表 = {};
          }

          // 访问废弃字段用于迁移
          // 将旧的 profile.存档 迁移到 profile.存档列表['云端修行']
          profile.存档列表['云端修行'] = {
            ...profile.存档,
            存档名: '云端修行',
          };

          // 添加"上次对话"槽位（如果不存在）
          if (!profile.存档列表['上次对话']) {
            profile.存档列表['上次对话'] = {
              存档名: '上次对话',
              保存时间: null,
              存档数据: null
            };
          }

          // 删除废弃字段
          delete profile.存档;
          needsSave = true;

          debug.log('角色商店', `✅ 角色「${roleNameForLog}」存档结构迁移完成`);
        }

        // 3.2 迁移单机模式：兼容3.7.8版本的旧存档结构
        if (profile.模式 === '单机' && profile.存档 && (!profile.存档列表 || Object.keys(profile.存档列表).length === 0)) {
          debug.log('角色商店', `🔄 迁移单机角色「${roleNameForLog}」的旧版本存档结构`);

          // 初始化存档列表
          profile.存档列表 = {};

          // 将旧的单个存档迁移到"存档1"槽位
          profile.存档列表['存档1'] = {
            ...profile.存档,
            存档名: '存档1',
          };

          // 添加"上次对话"槽位
          profile.存档列表['上次对话'] = {
            存档名: '上次对话',
            保存时间: null,
            存档数据: null
          };

          // 添加"时间点存档"槽位
          profile.存档列表['时间点存档'] = {
            存档名: '时间点存档',
            保存时间: null,
            存档数据: null
          };

          // 删除废弃字段
          delete profile.存档;
          needsSave = true;

          debug.log('角色商店', `✅ 角色「${roleNameForLog}」旧版本存档结构迁移完成`);
        }

        // 3.3 确保所有角色都有必要的存档槽位
        if (profile.存档列表 && !profile.存档列表['上次对话']) {
          profile.存档列表['上次对话'] = {
            存档名: '上次对话',
            保存时间: null,
            存档数据: null
          };
          needsSave = true;
        }

        if (profile.模式 === '单机' && profile.存档列表 && !profile.存档列表['时间点存档']) {
          profile.存档列表['时间点存档'] = {
            存档名: '时间点存档',
            保存时间: null,
            存档数据: null
          };
          needsSave = true;
        }

        // 3.3.1 联机存档名修正
        if (profile.模式 === '联机' && profile.存档列表?.['云端修行']?.存档名 !== '云端修行') {
          profile.存档列表['云端修行'].存档名 = '云端修行';
          needsSave = true;
        }

        // 3.4 迁移激活存档槽位 key（联机：存档 → 云端修行）
        if (rootState.value.当前激活存档?.角色ID === charId && profile.模式 === '联机') {
          if (rootState.value.当前激活存档.存档槽位 === '存档') {
            rootState.value.当前激活存档.存档槽位 = '云端修行';
            needsSave = true;
          }
        }

        // 3.5 迁移联机 SaveData 键（IDB：savedata_{charId}_存档 → savedata_{charId}_云端修行）
        if (profile.模式 === '联机') {
          asyncMigrations.push((async () => {
            const newDataKey = `savedata_${charId}_云端修行`;
            const oldDataKey = `savedata_${charId}_存档`;
            const existingNew = await storage.loadFromIndexedDB(newDataKey);
            if (!existingNew) {
              const existingOld = await storage.loadFromIndexedDB(oldDataKey);
              if (existingOld) {
                await storage.saveSaveData(charId, '云端修行', existingOld as any);
                debug.log('角色商店', `? 已迁移联机存档数据键：${oldDataKey} → ${newDataKey}`);
              }
            }
          })());
        }
      });

      // 等待异步迁移（例如联机存档键迁移）完成
      if (asyncMigrations.length > 0) {
        await Promise.all(asyncMigrations);
      }

      // 如果有迁移，保存到存储
      if (needsSave) {
        await storage.saveRootData(rootState.value);
        debug.log('角色商店', '✅ 迁移后的数据已保存');
      }

      initialized.value = true;
      debug.log('角色商店', '✅ Store初始化完成，数据已加载');
    } catch (error) {
      debug.error('角色商店', '❌ Store初始化失败', error);
      // 初始化失败时使用空数据
      rootState.value = {
        当前激活存档: null,
        角色列表: {}
      };
      initialized.value = true;
    }
  };

  // 立即执行初始化
  initializeStore();

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
    if (profile.模式 === '联机') {
      return getOnlineSaveSlot(profile);
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
        // 🔥 修复：使用 extractSaveDisplayInfo 兼容旧格式和 V3 格式
        const displayInfo = extractSaveDisplayInfo(slot.存档数据 as any);
        const enhancedSlot = {
          ...slot,
          id: key,
          角色名字: slot.角色名字 || displayInfo.角色名字 || profile.角色?.名字 || '未知',
          境界: slot.境界 || displayInfo.境界 || '凡人',
          位置: slot.位置 || displayInfo.位置 || '未知',
          保存时间: slot.保存时间 || null,
          最后保存时间: slot.最后保存时间 ?? slot.保存时间 ?? null,
          游戏时长: slot.游戏时长 || 0
        };
        return enhancedSlot;
      });
    }
    if (profile.模式 === '联机') {
      const onlineSlot = getOnlineSaveSlot(profile);
      if (onlineSlot) {
        // 🔥 修复：使用 extractSaveDisplayInfo 兼容旧格式和 V3 格式
        const displayInfo = extractSaveDisplayInfo(onlineSlot.存档数据 as any);
        const enhancedSlot = {
          ...onlineSlot,
          id: '云端修行',
          角色名字: onlineSlot.角色名字 || displayInfo.角色名字 || profile.角色?.名字 || '未知',
          境界: onlineSlot.境界 || displayInfo.境界 || '凡人',
          位置: onlineSlot.位置 || displayInfo.位置 || '未知',
          保存时间: onlineSlot.保存时间 || null,
          最后保存时间: onlineSlot.最后保存时间 ?? onlineSlot.保存时间 ?? null,
          游戏时长: onlineSlot.游戏时长 || 0
        };
        return [enhancedSlot];
      }
    }
    return [];
  });

  // --- 核心行动 (Actions) ---

  /**
   * [核心] 保存当前状态到本地存储
   * 确保任何修改后都能持久化
   */
  const commitMetadataToStorage = async (): Promise<void> => {
    try {
      // 🔥 新架构：只保存元数据，不保存庞大的存档数据
      const metadataRoot = JSON.parse(JSON.stringify(rootState.value));
      Object.values(metadataRoot.角色列表).forEach((profile: any) => {
        if (profile.存档列表) {
          Object.values(profile.存档列表).forEach((slot: any) => {
            delete slot.存档数据; // 移除存档数据
          });
        }
        // 🔥 兼容清理：清理旧的 profile.存档（如果还存在）
        if (profile.存档) {
          delete profile.存档;
        }
      });

      await storage.saveRootData(metadataRoot);
      debug.log('角色商店', '✅ 角色元数据已提交到存储');

      // 触发响应式更新
      rootState.value = { ...rootState.value };
    } catch (error) {
      debug.error('角色商店', '持久化元数据到IndexedDB失败', error);
      throw error;
    }
  };


  /**
   * [架构重构待办] 将当前存档数据保存到本地
   *
   * TODO: [架构重构阶段2.1] 此函数需要完全重构
   * 当前实现：已删除 storageSharding 依赖，直接保存到 IndexedDB
   *
   * @see 架构迁移行动计划.md - 阶段 2：修改 characterStore
   *
   * @param fullSync 是否进行完整同步（默认 false，仅作参考，当前未使用）
   * @param changedPaths 变更的字段路径数组（当前未使用）
   */
  const saveToStorage = async (options?: {
    fullSync?: boolean;
    changedPaths?: string[]
  }): Promise<void> => {
    const active = rootState.value.当前激活存档;
    const profile = activeCharacterProfile.value;
    const slot = activeSaveSlot.value;
    const gameStateStore = useGameStateStore();

    if (!active || !profile || !slot?.存档数据) {
      debug.warn('角色商店', '[同步] 没有激活的存档数据');
      return;
    }

    try {
      // 1. 先更新年龄信息
      try {
        const 更新后年龄 = updateLifespanFromGameTime(slot.存档数据);
        debug.log('角色商店', `[同步] 自动更新玩家年龄: ${更新后年龄}岁`);

        // 更新所有NPC的年龄（添加安全检查，避免访问已删除的NPC）
        const npcMap = (slot.存档数据 as any)?.社交?.关系;
        const gameTime = (slot.存档数据 as any)?.元数据?.时间;
        if (npcMap && typeof npcMap === 'object' && gameTime) {
          let npcCount = 0;
          Object.entries(npcMap as Record<string, any>).forEach(([key, npc]) => {
            const npcProfile = npc as NpcProfile;
            // 🔥 添加详细的安全检查
            if (!npcProfile || typeof npcProfile !== 'object') {
              debug.warn('角色商店', `[同步] 跳过无效的NPC数据: ${key}`);
              return;
            }
            if (!npcProfile.名字) {
              debug.warn('角色商店', `[同步] 跳过缺少名字的NPC: ${key}`);
              return;
            }

            try {
              if (slot.存档数据) {
                updateNpcLifespanFromGameTime(npcProfile, gameTime);
                npcCount++;
              }
            } catch (npcError) {
              debug.warn('角色商店', `[同步] 更新NPC ${npcProfile.名字} 年龄失败:`, npcError);
            }
          });
          debug.log('角色商店', `[同步] 自动更新${npcCount}个NPC年龄`);
        }
      } catch (error) {
        debug.warn('角色商店', '[同步] 自动更新年龄失败（非致命）:', error);
      }

      // TODO: [架构重构] 分片存储已废弃，现在直接保存到 IndexedDB
      debug.log('角色商店', '[同步] 直接保存到 IndexedDB（架构已重构）');

      // 3. 更新存档槽位的保存时间和元数据
      // 注意：保存时间（创建时间）只在创建时设置，不再修改
      slot.保存时间 = new Date().toISOString();

      // 提取元数据用于存档列表显示
      slot.角色名字 = (slot.存档数据 as any).角色?.身份?.名字;
      const playerAttributes = (slot.存档数据 as any).角色?.属性 ?? null;
      const playerLocation = (slot.存档数据 as any).角色?.位置 ?? null;
      if (playerAttributes) {
        // 境界统一为 Realm 对象
        slot.境界 = playerAttributes.境界?.名称 || '凡人';

        // 计算修为进度百分比（从境界的当前进度获取）
        if (typeof playerAttributes.境界 === 'object' && playerAttributes.境界 !== null) {
          const realm = playerAttributes.境界 as Realm;
          if (realm.下一级所需 > 0) {
            slot.修为进度 = Math.floor((realm.当前进度 / realm.下一级所需) * 100);
          }
        }
      }

      slot.位置 = playerLocation?.描述 || '未知';

      // 时间
      const time = (slot.存档数据 as any)?.元数据?.时间;
      if (time) {
        slot.游戏内时间 = `${time.年}年${time.月}月${time.日}日`;
      }

      // 4. 将修改写回 rootState（触发响应式）
      if (profile.模式 === '单机' && profile.存档列表) {
        // 注意：不再在这里备份到"上次对话"，已改为在发送消息前备份
        rootState.value.角色列表[active.角色ID].存档列表 = {
          ...profile.存档列表,
          [active.存档槽位]: { ...slot } // 创建新对象触发响应式
        };
      } else if (profile.模式 === '联机') {
        rootState.value.角色列表[active.角色ID].存档 = { ...slot }; // 创建新对象触发响应式
      }

      // 强制触发响应式更新
      triggerRef(rootState);

      // 5. 保存到本地存储
      await commitMetadataToStorage();

      debug.log('角色商店', '[同步] 数据已保存到本地，元数据已更新');
    } catch (error) {
      debug.error('角色商店', '[同步] 保存到本地存储失败', error);
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
  const reloadFromStorage = async () => {
    rootState.value = await storage.loadRootData();
    debug.log('角色商店', '已从乾坤宝库重新同步所有数据');
  };

  /**
   * [新增] 同步整个根状态到云端（占位符）
   * @todo 需要实现后端API
   */
  const syncRootStateToCloud = async (): Promise<void> => {
    debug.log('角色商店', 'syncRootStateToCloud called. (Placeholder - no backend implementation yet)');
    // 在这里实现将 rootState.value 同步到后端的逻辑
    // 例如: await cloudApi.saveRootState(rootState.value);
    return Promise.resolve();
  };

  /**
   * 创建一个全新的角色 (AI增强版)
   * @param payload 包含角色和世界数据的数据包
   * @returns 创建成功则返回角色的基础信息，否则返回 undefined
   */
  const createNewCharacter = async (payload: CreationPayload): Promise<CharacterBaseInfo | undefined> => {
    const uiStore = useUIStore();
    const creationStore = useCharacterCreationStore(); // 导入创角状态
    const { charId, baseInfo, world, mode, age } = payload;

    if (rootState.value.角色列表[charId]) {
      toast.error(`角色ID ${charId} 已存在，创建失败！`);
      return undefined;
    }

    // [核心修复] 从创角store中提取最权威、最完整的数据，覆盖传入的payload
    // 这是为了确保即使用户界面和payload构建逻辑有误，最终发送给AI的数据也是绝对正确的
    const authoritativeBaseInfo: CharacterBaseInfo = {
      ...baseInfo, // 保留玩家输入的名字、性别等
      世界: creationStore.selectedWorld!,
      天资: creationStore.selectedTalentTier!,
      出生: creationStore.selectedOrigin || '随机出身',
      灵根: creationStore.selectedSpiritRoot || '随机灵根',
      天赋: creationStore.selectedTalents,
      // 确保后天六司存在且初始化为0（开局默认全为0）
      后天六司: baseInfo.后天六司 || {
        根骨: 0,
        灵性: 0,
        悟性: 0,
        气运: 0,
        魅力: 0,
        心性: 0,
      },
    };
    debug.log('角色商店', '构建权威创角信息:', authoritativeBaseInfo);

    // const toastId = `create-char-${charId}`; // 不再需要独立的toastId
    try {
      uiStore.updateLoadingText('即将开始角色创建...');

      // [核心改造] 1. 创建角色前，彻底清理酒馆环境
      await clearAllCharacterData(); // 不再需要传递toastId

      // 2. 如果是联机模式，先向后端提交角色创建信息
      // 🔥 标记：后端创建是否成功
      let backendCreationSuccess = false;
      if (mode === '联机') {
        try {
          uiStore.updateLoadingText('正在向云端提交角色信息...');

          // 构造符合后端schema的数据结构
          const characterSubmissionData = {
            char_id: charId,
            base_info: authoritativeBaseInfo,
          };

          debug.log('角色商店', '向后端提交的数据', characterSubmissionData);
          const backendResult = await createCharacterAPI(characterSubmissionData);
          debug.log('角色商店', '后端返回结果', backendResult);
          uiStore.updateLoadingText('角色信息已成功提交至云端！');
          backendCreationSuccess = true;
        } catch (error) {
          debug.error('角色商店', '向后端提交失败', error);
          toast.warning('向云端提交角色信息失败，将继续本地创建流程');
          backendCreationSuccess = false;
          // 不要抛出错误，允许继续本地创建流程
        }
      }

      // 3. 使用AI增强的初始化服务创建完整的存档数据
      console.log('[角色商店] 准备调用initializeCharacter...');
      let initialSaveData: SaveData | null = null;
      try {
        console.log('[角色商店] 调用initializeCharacter,参数:', { charId, baseInfo: authoritativeBaseInfo, world: world.name, age, useStreaming: creationStore.useStreamingStart, generateMode: creationStore.generateMode, splitResponseGeneration: creationStore.splitResponseGeneration });
        initialSaveData = await initializeCharacter(charId, authoritativeBaseInfo, world, age, creationStore.useStreamingStart, creationStore.generateMode, creationStore.splitResponseGeneration);
        console.log('[角色商店] ✅ initializeCharacter返回成功,数据有效:', !!initialSaveData);
      } catch (e) {
        console.error('[角色商店] ❌ initializeCharacter失败:', e);
        // 🔥 修复：AI生成失败时直接抛出错误，不再自动回退到离线初始化
        // 让上层（App.vue）处理错误，显示重试对话框让用户选择
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`角色初始化失败: ${errorMessage}`);
      }

      // Tavern 兜底：确保系统NSFW配置与“角色.身体”骨架存在（避免界面不展示/路径缺失）
      if (isTavernEnv() && initialSaveData) {
        initialSaveData = ensureSaveDataHasTavernNsfw(initialSaveData) as SaveData;
      }

      let newProfile: CharacterProfile;
      if (mode === '单机') {
        const now = new Date().toISOString();
        newProfile = {
          模式: '单机',
          角色: (initialSaveData as any)?.角色?.身份 || authoritativeBaseInfo, // 仅存静态身份信息
          存档列表: {
            '存档1': {
              存档名: '存档1',
              保存时间: now,
              游戏内时间: '修仙元年 春',
              角色名字: authoritativeBaseInfo.名字,
              境界: '凡人',
              位置: '未知',
              修为进度: 0,
              存档数据: initialSaveData
            },
            '上次对话': {
              存档名: '上次对话',
              保存时间: null,
              存档数据: null
            }
          },
        };
      } else { // 联机模式
        const now = new Date().toISOString();
        // 🔥 统一结构：联机也使用存档列表，只有一个存档
        newProfile = {
          模式: '联机',
          角色: (initialSaveData as any)?.角色?.身份 || authoritativeBaseInfo,
          存档列表: {
            '云端修行': {
              存档名: '云端修行',
              保存时间: now,
              游戏内时间: '修仙元年 春',
              角色名字: authoritativeBaseInfo.名字,
              境界: '凡人',
              位置: '未知',
              修为进度: 0,
              存档数据: initialSaveData,
              // 联机模式专属字段
              云端同步信息: {
                最后同步: backendCreationSuccess ? now : '',
                版本: 1,
                需要同步: !backendCreationSuccess,
                后端创建失败: !backendCreationSuccess,
              },
            },
            '上次对话': {
              存档名: '上次对话',
              保存时间: null,
              存档数据: null
            }
          },
        };
      }

      rootState.value.角色列表[charId] = newProfile;

      // 2. 设置为当前激活存档
      const slotKey = mode === '单机' ? '存档1' : '云端修行'; // 🔥 联机也使用存档列表的key
      rootState.value.当前激活存档 = { 角色ID: charId, 存档槽位: slotKey };

      // 🔥 [核心修复] 必须先将完整的初始存档数据持久化，再保存元数据
      // 这样可以确保原子性，避免出现元数据存在但存档数据丢失的情况
      await saveActiveCharacterToStorage(charId);
      await commitMetadataToStorage();

      // 🔥 [新架构] 将初始存档加载到 gameStateStore
      const gameStateStore = useGameStateStore();
      gameStateStore.loadFromSaveData(initialSaveData);
      debug.log('角色商店', '✅ 初始存档已加载到 gameStateStore');

      // 5. [核心修复] 同步完整存档数据到云端 (仅在后端创建成功时)
      if (mode === '联机' && backendCreationSuccess) {
        try {
          uiStore.updateLoadingText('正在同步初始存档到云端...');

          // 🔥 过滤掉叙事信息，减少数据量
          const saveDataForCloud = filterSaveDataForCloud(initialSaveData);
          const saveDataToSync = {
            save_data: saveDataForCloud,
            world_map: {}, // 从酒馆变量或初始化结果获取地图数据
            game_time: '修仙元年 春'
          };

          debug.log('角色商店', '准备同步到云端的初始存档数据', saveDataToSync);
          await updateCharacterSave(charId, saveDataToSync);
          uiStore.updateLoadingText('初始存档已成功同步到云端！');
        } catch (error) {
          debug.warn('角色商店', '同步初始存档数据到云端失败', error);
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          toast.warning(`云端同步失败(后端未启动): ${errorMessage}`);
          // 不要抛出错误，允许角色创建继续完成
        }
      } else if (mode === '联机' && !backendCreationSuccess) {
        debug.warn('角色商店', '后端创建角色失败，跳过初始存档同步');
      }

      // 最终的成功提示由App.vue处理
      return authoritativeBaseInfo;
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
    console.log('[角色商店-删除] 开始删除角色:', charId);
    console.log('[角色商店-删除] 删除前角色列表:', Object.keys(rootState.value.角色列表));

    if (!rootState.value.角色列表[charId]) {
      console.warn('[角色商店-删除] 角色不存在，无法删除');
      return;
    }

    const characterName = rootState.value.角色列表[charId]?.角色.名字 || charId;

    // 🔥 [新架构] 如果删除的是当前激活的角色，清理 gameStateStore
    if (rootState.value.当前激活存档?.角色ID === charId) {
      console.log('[角色商店-删除] 删除的是当前激活角色，重置 gameStateStore');
      const gameStateStore = useGameStateStore();
      gameStateStore.resetState();
      rootState.value.当前激活存档 = null;
    }

    // 🔥 [核心修复] 级联删除：清理 IndexedDB 中该角色的所有存档数据
    try {
      console.log('[角色商店-删除] 开始清理 IndexedDB 中的所有存档数据...');
      const deletedCount = await storage.deleteAllSaveDataForCharacter(charId);
      console.log(`[角色商店-删除] ✅ 已清理 ${deletedCount} 个存档记录`);
    } catch (error) {
      console.error('[角色商店-删除] 清理 IndexedDB 存档数据失败:', error);
      toast.warning('清理存档数据时出现错误，部分数据可能未删除');
    }

    // 从 rootState 中删除角色数据
    console.log('[角色商店-删除] 执行 delete 操作');
    delete rootState.value.角色列表[charId];

    console.log('[角色商店-删除] 删除后角色列表:', Object.keys(rootState.value.角色列表));
    console.log('[角色商店-删除] 开始保存到 IndexedDB');

    // 持久化到 IndexedDB
    await commitMetadataToStorage();

    console.log('[角色商店-删除] IndexedDB 保存完成');

    // 🔥 [可选] 同步到云端（仅联机模式需要）
    try {
      await syncRootStateToCloud();
      debug.log('角色商店', '删除角色后已同步到云端');
    } catch (error) {
      debug.warn('角色商店', '删除角色后同步云端失败（后端未启动）:', error);
      // 不显示错误提示，因为单机模式不需要云端同步
    }

    toast.success(`角色【${characterName}】已从本地数据库删除。`);
    console.log('[角色商店-删除] 删除角色完成');
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
        targetSlot = getOnlineSaveSlot(profile);
      }

      if (!targetSlot) {
        debug.error('角色商店', '找不到指定的存档槽位', slotKey);
        toast.error('找不到指定的存档槽位！');
        return false;
      }

      // 联机模式：必须登录才能加载
      // 🔥 检查后端创建是否失败，如果失败则跳过云端获取
      const onlineSlot = getOnlineSaveSlot(profile);
      const backendCreationFailed = (onlineSlot?.云端同步信息 as any)?.后端创建失败;
      if (profile.模式 === '联机' && isBackendConfigured() && !backendCreationFailed) {
        // 先验证token有效性
        const tokenValid = await verifyStoredToken();
        if (!tokenValid) {
          debug.warn('角色商店', '联机模式token无效，需要登录');
          toast.warning('联机模式需要登录');
          return false;
        } else {
          try {
            const cloudProfile = await fetchCharacterProfile(charId) as any;
            const cloudSave = cloudProfile?.game_save;
            const cloudSaveData = cloudSave?.save_data;

            if (cloudSaveData) {
              targetSlot.存档数据 = cloudSaveData as SaveData;

              if (cloudSave?.game_time && typeof cloudSave.game_time === 'string') {
                targetSlot.游戏内时间 = cloudSave.game_time;
              }
              if (cloudSave?.world_map && typeof cloudSave.world_map === 'object') {
                (targetSlot as any).世界地图 = cloudSave.world_map;
              }

              await storage.saveSaveData(charId, slotKey, targetSlot.存档数据);

              const currentOnlineSlot = getOnlineSaveSlot(profile);
              if (currentOnlineSlot) {
                currentOnlineSlot.云端同步信息 = {
                  最后同步: cloudSave?.last_sync ? String(cloudSave.last_sync) : new Date().toISOString(),
                  版本: typeof cloudSave?.version === 'number' ? cloudSave.version : (currentOnlineSlot.云端同步信息?.版本 ?? 1),
                  需要同步: false,
                };
                await commitMetadataToStorage();
              }

              debug.log('角色商店', '联机存档已从云端拉取并缓存到本地');
            }
          } catch (error) {
            debug.warn('角色商店', '联机存档云端拉取失败，回退本地缓存', error);
          }
        }
      } else if (profile.模式 === '联机' && backendCreationFailed) {
        debug.warn('角色商店', '检测到后端创建失败标记，跳过云端获取，使用本地缓存');
      }

      // 🔥 [关键修复] 如果存档数据不在内存中，先从 IndexedDB 加载
      if (!targetSlot.存档数据) {
        console.log('=== [诊断日志-loadGame] 从IndexedDB加载 ===')
        console.log('[14] 加载Key:', { 角色ID: charId, 存档槽位: slotKey })
        debug.log('角色商店', `存档数据不在内存中，从 IndexedDB 加载: ${charId}/${slotKey}`);
        try {
          const saveData = await storage.loadSaveData(charId, slotKey);
          if (saveData) {
            console.log('[15] 从IndexedDB加载的角色.背包.灵石数据:', (saveData as any).角色?.背包?.灵石)
            targetSlot.存档数据 = saveData;
            debug.log('角色商店', `✅ 已从 IndexedDB 加载存档数据`);
          } else {
            debug.error('角色商店', `IndexedDB 中不存在存档数据: ${charId}/${slotKey}`);
            toast.error('存档数据不存在！');
            return false;
          }
        } catch (error) {
          debug.error('角色商店', '从 IndexedDB 加载存档数据失败', error);
          toast.error('加载存档数据失败！');
          return false;
        }
      }

      // V3 迁移：检测到旧结构必须先迁移（写回同槽位），否则不允许加载
      if (targetSlot.存档数据) {
        const detection = detectLegacySaveData(targetSlot.存档数据);
        if (detection.needsMigration) {
          const shouldContinue = await new Promise<boolean>((resolve) => {
            uiStore.showDetailModal({
              title: '存档迁移（必须）',
              component: SaveMigrationModal,
              props: {
                characterId: charId,
                saveSlot: slotKey,
                legacyKeysFound: detection.legacyKeysFound,
                onConfirm: async () => {
                  try {
                    const original = targetSlot!.存档数据 as SaveData;
                    const backupSlot = `__backup__${slotKey}__${new Date().toISOString().replace(/[:.]/g, '-')}`;
                    await storage.saveSaveData(charId, backupSlot, original);

                    const { migrated, report } = migrateSaveDataToLatest(original);
                    const validation = validateSaveDataV3(migrated as any);
                    if (!validation.isValid) {
                      console.error('[存档迁移] 迁移后校验失败:', validation.errors, report);
                      toast.error('迁移失败：新结构校验不通过，请查看控制台');
                      resolve(false);
                      return;
                    }

                    if (validation.warnings.length > 0) {
                      console.warn('[存档迁移] 迁移告警:', validation.warnings);
                    }

                    await storage.saveSaveData(charId, slotKey, migrated as any);
                    targetSlot!.存档数据 = migrated as any;
                    debug.log('角色商店', `[存档迁移] ✅ 已写回 V3：${charId}/${slotKey}`);
                    resolve(true);
                  } catch (e) {
                    console.error('[存档迁移] ❌ 迁移过程异常:', e);
                    toast.error('迁移失败：发生异常，请查看控制台');
                    resolve(false);
                  } finally {
                    uiStore.hideDetailModal();
                  }
                },
                onCancel: () => {
                  uiStore.hideDetailModal();
                  resolve(false);
                },
              }
            });
          });

          if (!shouldContinue) {
            toast.info('已取消迁移，存档未加载');
            return false;
          }
        }
      }

      // 在加载前执行数据骨架验证
      // if (targetSlot.存档数据) {
      //   const validationResult = validateGameData(targetSlot.存档数据, profile);
      //   if (!validationResult.isValid) {
      //     debug.error('角色商店', '存档数据验证失败', validationResult.errors);
      //     uiStore.showDataValidationErrorDialog(
      //       validationResult.errors,
      //       () => {
      //         // [核心改造] 用户确认后，调用AI进行智能修复
      //         repairCharacterDataWithAI(charId, slotKey);
      //       },
      //       'loading' // [核心改造] 明确告知UI这是"加载"场景
      //     );
      //     return false; // 中断加载流程
      //   }
      // }

      try {
        uiStore.startLoading('开始加载存档...');
        // [核心改造] 1. 加载游戏前，彻底清理酒馆变量环境
        await clearAllCharacterData();

        uiStore.updateLoadingText('天机重置完毕，正在加载存档...');

        // 2. 设置激活存档
        debug.log('角色商店', '设置当前激活存档');
      rootState.value.当前激活存档 = { 角色ID: charId, 存档槽位: slotKey };
      await commitMetadataToStorage(); // 立即保存激活状态

      // 3. 将加载的存档数据同步到 gameStateStore
      debug.log('角色商店', '将存档数据加载到 gameStateStore');
      const gameStateStore = useGameStateStore();
      if (targetSlot.存档数据) {
        const patched = isTavernEnv() ? (ensureSaveDataHasTavernNsfw(targetSlot.存档数据) as SaveData) : targetSlot.存档数据;
        targetSlot.存档数据 = patched;
        gameStateStore.loadFromSaveData(patched);
        debug.log('角色商店', '✅ 存档数据已加载到 gameStateStore');

        // 🔥 初始化向量记忆服务并导入现有长期记忆
        try {
          const { vectorMemoryService } = await import('@/services/vectorMemoryService');
          const saveSlotId = `${charId}_${slotKey}`;
          await vectorMemoryService.init(saveSlotId);

          // 如果启用了向量记忆且向量库为空，导入现有长期记忆
          if (vectorMemoryService.isEnabled()) {
            const existingMemories = (targetSlot.存档数据 as any).社交?.记忆?.长期记忆 || [];
            if (existingMemories.length > 0) {
              const stats = await vectorMemoryService.getStats();
              if (stats.total === 0) {
                debug.log('角色商店', `向量记忆库为空，开始导入 ${existingMemories.length} 条长期记忆`);
                await vectorMemoryService.importLongTermMemories(existingMemories);
              }
            }
          }
        } catch (e) {
          console.warn('[角色商店] 初始化向量记忆服务失败（非致命）:', e);
        }
      }

      debug.log('角色商店', '加载完成');
      toast.success(`已成功加载【${profile.角色?.名字 || '未知角色'}】的存档: ${targetSlot.存档名 || slotKey}`);
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
   * [架构重构] 将激活存档保存到 IndexedDB
   * @param charId 要设置为激活的角色ID
   */
  const saveActiveCharacterToStorage = async (charId: string) => {
    const profile = rootState.value.角色列表[charId];
    if (!profile) {
      throw new Error(`[存档核心] 无法找到ID为 ${charId} 的角色档案`);
    }

    // 必须获取当前激活的存档数据，因为这是唯一的数据源
    const currentSlot = activeSaveSlot.value;
    if (!currentSlot || !currentSlot.存档数据) {
      // 这是一个警告而不是错误，因为新角色可能还没有存档数据
      debug.warn('角色商店', `角色 ${charId} 没有可用的存档数据来保存`);
      return;
    }

    try {
      const active = rootState.value.当前激活存档;
      if (!active) {
        throw new Error('[存档核心] 没有激活的存档');
      }

      // 🔥 新架构：直接保存到 IndexedDB
      debug.log('角色商店', '保存存档数据到 IndexedDB');

      // 直接将存档数据保存到 IndexedDB
      await storage.saveSaveData(active.角色ID, active.存档槽位, currentSlot.存档数据);

      // 🔥 保存后从内存中移除存档数据，保持与saveCurrentGame一致
      delete currentSlot.存档数据;

      debug.log('角色商店', `✅ 已将【${profile.角色?.名字 || '未知角色'}】的存档保存至 IndexedDB`);

    } catch (error) {
      debug.error('角色商店', '保存角色存档失败', error);
      toast.error('保存角色存档失败，请检查控制台。');
      // 重新抛出错误，以便调用堆栈可以捕获它
      throw error;
    }
  };

  /**
   * [架构重构] 从 IndexedDB 加载最新的存档数据到本地 store
   * 替代从酒馆变量加载，实现独立的数据持久化
   * @deprecated 此函数已被新架构替代，暂时保留以备后用
   */
  const syncFromIndexedDB = async () => {
    const active = rootState.value.当前激活存档;
    const profile = activeCharacterProfile.value;
    const slot = activeSaveSlot.value;
    const gameStateStore = useGameStateStore();

    if (!active || !profile || !slot) {
      debug.warn('角色商店', '当前没有激活的存档，跳过同步/保存');
      return;
    }

    try {
      // 🔥 新架构：从 IndexedDB 加载存档数据
      const saveData = await storage.loadSaveData(active.角色ID, active.存档槽位);

      if (!saveData) {
        debug.warn('角色商店', 'IndexedDB 中没有存档数据');
        return;
      }

      debug.log('角色商店', '✅ 从 IndexedDB 加载存档数据');

      // 修复大道数据：确保经验值不是undefined
      if (saveData.大道) {
        const daoSystem = saveData.大道;

        // 修复大道数据（新结构：数据+进度合并）
        if (daoSystem.大道列表) {
          Object.keys(daoSystem.大道列表).forEach(daoName => {
            const daoData = daoSystem.大道列表[daoName];
            if (daoData) {
              // 确保所有数值字段都是数字
              if (daoData.当前经验 === undefined || daoData.当前经验 === null) {
                daoData.当前经验 = 0;
              }
              if (daoData.总经验 === undefined || daoData.总经验 === null) {
                daoData.总经验 = 0;
              }
              if (daoData.当前阶段 === undefined || daoData.当前阶段 === null) {
                daoData.当前阶段 = 0;
              }
              if (daoData.是否解锁 === undefined) {
                daoData.是否解锁 = true;
              }
              if (!daoData.道名) {
                daoData.道名 = daoName;
              }
              if (!daoData.阶段列表) {
                daoData.阶段列表 = [];
              }
              if (!daoData.描述) {
                daoData.描述 = '神秘的大道';
              }
            }
          });
        } else {
          // 兼容旧数据结构
          daoSystem.大道列表 = {};
        }
      }

      // 根据时间自动更新寿命（年龄）- 用于实时显示
      try {
        const 更新后年龄 = updateLifespanFromGameTime(saveData);
        debug.log('角色商店', `[同步] 自动更新玩家年龄: ${更新后年龄}岁`);

        // 更新所有NPC的年龄
        if ((saveData as any).社交?.关系 && (saveData as any).元数据?.时间) {
          let npcCount = 0;
          Object.values((saveData as any).社交.关系 as Record<string, any>).forEach((npc) => {
            const npcProfile = npc as NpcProfile;
            if (npcProfile && typeof npcProfile === 'object') {
              updateNpcLifespanFromGameTime(npcProfile, (saveData as any).元数据.时间);
              npcCount++;
            }
          });
          debug.log('角色商店', `[同步] 自动更新${npcCount}个NPC年龄`);
        }
      } catch (error) {
        debug.warn('角色商店', '[同步] 自动更新年龄失败（非致命）:', error);
      }

      // 🔥 [掌握技能自动计算] 从酒馆同步后自动计算掌握技能
      try {
        const updatedSkills = updateMasteredSkills(saveData);
        debug.log('角色商店', `[同步] 已更新掌握技能列表，共 ${updatedSkills.length} 个技能`);
      } catch (error) {
        debug.warn('角色商店', '[同步] 自动计算掌握技能失败（非致命）:', error);
      }

      // 🔥 [状态效果过期检查] 每次从酒馆同步后自动移除过期的状态效果
      let needsSyncBackToTavern = false;
      try {
        const hasExpiredEffects = updateStatusEffects(saveData);
        if (hasExpiredEffects) {
          debug.log('角色商店', '[同步] 已自动移除过期的状态效果');
          needsSyncBackToTavern = true; // 标记需要同步回酒馆
        }
      } catch (error) {
        debug.warn('角色商店', '[同步] 自动清理过期状态效果失败（非致命）:', error);
      }

      // ⚠️ 保留本地的记忆数据，避免被酒馆的旧数据覆盖
      // 因为在AI响应流程中，记忆会在本地先更新，然后才同步到酒馆
      const localMemory = (slot.存档数据 as any)?.社交?.记忆;
      if (localMemory) {
        (saveData as any).社交 = (saveData as any).社交 || {};
        (saveData as any).社交.记忆 = localMemory;
        debug.log('角色商店', '[同步] 保留本地记忆数据，避免被酒馆旧数据覆盖');
      }

      // ⚠️ 保留本地的叙事历史，避免被酒馆的旧数据覆盖
      // 叙事历史包含了状态变更日志，不应该被同步覆盖
      const localNarrativeHistory = (slot.存档数据 as any)?.系统?.历史?.叙事;
      if (localNarrativeHistory && Array.isArray(localNarrativeHistory) && localNarrativeHistory.length > 0) {
        (saveData as any).系统 = (saveData as any).系统 || {};
        (saveData as any).系统.历史 = {
          ...(((saveData as any).系统.历史 ?? {}) as any),
          叙事: localNarrativeHistory,
        };
        debug.log('角色商店', `[同步] 保留本地叙事历史数据 (${localNarrativeHistory.length}条)，避免被酒馆旧数据覆盖`);
      }

      // 更新本地存档数据 - 使用响应式更新方式
      const charId = active.角色ID;
      const slotId = active.存档槽位;

      if (profile.模式 === '单机' && profile.存档列表) {
        // 创建新的存档列表对象，触发响应式
        rootState.value.角色列表[charId].存档列表 = {
          ...profile.存档列表,
          [slotId]: {
            ...profile.存档列表[slotId],
            存档数据: saveData,
            保存时间: new Date().toISOString()
          }
        };
      } else if (profile.模式 === '联机') {
        // 联机模式更新云端修行存档
        if (!profile.存档列表) {
          profile.存档列表 = {};
        }
        const currentOnlineSlot = getOnlineSaveSlot(profile);
        rootState.value.角色列表[charId].存档列表['云端修行'] = {
          ...(currentOnlineSlot || { 存档名: '云端修行' }),
          存档数据: saveData,
          保存时间: new Date().toISOString()
        };
      }

      await commitMetadataToStorage();
      debug.log('角色商店', '✅ 已从酒馆同步最新存档数据');
      debug.log('角色商店', `最终背包物品数量: ${Object.keys((saveData as any).角色?.背包?.物品 || {}).length}`);
      debug.log('角色商店', `是否有世界: ${!!(saveData as any).世界?.信息}`);

      // 🔥 [新架构] 状态效果已在saveData中更新，会在下次保存时持久化到IndexedDB
      // 不再需要同步到酒馆
      if (needsSyncBackToTavern) {
        debug.log('角色商店', '[同步] 状态效果已清理，已标记为待保存');
      }

    } catch (error) {
      debug.error('角色商店', '从酒馆同步数据失败', error);
    }
  };

  /**
   * 🔥 [新增] 直接更新存档数据（用于AI命令执行后立即更新UI）
   * 不从酒馆重新加载，直接使用传入的SaveData，确保数据实时性
   * @param updatedSaveData AI命令执行后的最新SaveData
   */
  const updateSaveDataDirectly = async (updatedSaveData: SaveData) => {
    const active = rootState.value.当前激活存档;
    const profile = activeCharacterProfile.value;
    const slot = activeSaveSlot.value;
    const gameStateStore = useGameStateStore();

    if (!active || !profile || !slot || !updatedSaveData) {
      debug.warn('角色商店', '[直接更新] 缺少必要参数，跳过更新');
      return;
    }

    const charId = active.角色ID;
    const slotId = active.存档槽位;

    debug.log('角色商店', '[直接更新] 开始更新存档数据到Store...');

    // 保留本地专有数据（叙事历史）
    const localNarrativeHistory = slot.存档数据?.历史?.叙事;
    if (localNarrativeHistory && Array.isArray(localNarrativeHistory) && localNarrativeHistory.length > 0) {
      updatedSaveData.历史 = {
        ...(updatedSaveData.历史 ?? {}),
        叙事: localNarrativeHistory,
      };
      debug.log('角色商店', `[直接更新] 保留本地叙事历史数据 (${localNarrativeHistory.length}条)`);
    }

    // 🔥 响应式更新存档数据
    if (profile.模式 === '单机' && profile.存档列表) {
      rootState.value.角色列表[charId].存档列表 = {
        ...profile.存档列表,
        [slotId]: {
          ...profile.存档列表[slotId],
          存档数据: updatedSaveData,
          保存时间: new Date().toISOString()
        }
      };
    } else if (profile.模式 === '联机') {
      if (!profile.存档列表) {
        profile.存档列表 = {};
      }
      const currentOnlineSlot = getOnlineSaveSlot(profile);
      rootState.value.角色列表[charId].存档列表['云端修行'] = {
        ...(currentOnlineSlot || { 存档名: '云端修行' }),
        存档数据: updatedSaveData,
        保存时间: new Date().toISOString()
      };
    }

    // 立即持久化到localStorage
    await commitMetadataToStorage();

    debug.log('角色商店', '✅ [直接更新] 存档数据已更新到Store并持久化');
  };

  /**
   * [核心改造] 保存当前游戏进度到激活的存档槽
   * 使用分片加载替代完整SaveData
   */
  const saveCurrentGame = async (options?: { notifyIfNoActive?: boolean }) => {
    if (!initialized.value) {
      await initializeStore();
    }
    const active = rootState.value.当前激活存档;
    const profile = activeCharacterProfile.value;
    const slot = activeSaveSlot.value;
    const gameStateStore = useGameStateStore();

    if (!active || !profile || !slot) {
      if (options?.notifyIfNoActive && gameStateStore.isGameLoaded) {
        toast.error('没有激活的存档，无法保存！', { id: 'save-no-active' });
      }
      debug.warn('角色商店', '当前没有激活的存档，跳过保存');
      return;
    }

    const saveId = `save-game-${Date.now()}`;
    try {
      // 静默保存，不显示loading
      // toast.loading('正在保存进度...', { id: saveId });

      console.log('=== [诊断日志-characterStore] 开始保存游戏 ===')
      console.log('[10] 当前激活存档:', { 角色ID: active.角色ID, 存档槽位: active.存档槽位 })

      // 1. 从 gameStateStore 获取最新、最完整的游戏状态
      const currentSaveData = gameStateStore.toSaveData();

      if (!currentSaveData) {
        throw new Error('无法生成存档数据，游戏状态不完整。');
      }

      console.log('[11] toSaveData()返回的角色.背包.灵石数据:', (currentSaveData as any).角色?.背包?.灵石)

      // 2. 自动更新年龄、技能等派生数据
      updateLifespanFromGameTime(currentSaveData);
      {
        const updatedSkills = updateMasteredSkills(currentSaveData);
        // 同步到当前内存态，避免“已掌握技能”UI需要重载才更新
        try {
          gameStateStore.masteredSkills = JSON.parse(JSON.stringify(updatedSkills)) as any;
          if (gameStateStore.skillState && typeof gameStateStore.skillState === 'object') {
            (gameStateStore.skillState as any).掌握技能 = gameStateStore.masteredSkills;
          }
        } catch {
          // 保底：不影响保存流程
        }
      }
      if ((currentSaveData as any).社交?.关系 && (currentSaveData as any).元数据?.时间) {
        Object.values((currentSaveData as any).社交.关系).forEach((npc) => {
          if (npc && typeof npc === 'object') {
            updateNpcLifespanFromGameTime(npc as NpcProfile, (currentSaveData as any).元数据.时间);
          }
        });
      }

      console.log('[12] 即将保存到IndexedDB的数据:', {
        角色ID: active.角色ID,
        存档槽位: active.存档槽位,
        背包灵石: (currentSaveData as any).角色?.背包?.灵石
      })

      // 3. 🔥 核心变更：将巨大的SaveData独立保存到IndexedDB
      await storage.saveSaveData(active.角色ID, active.存档槽位, currentSaveData);
      console.log('[13] IndexedDB保存完成')
      debug.log('角色商店', `✅ 存档内容已保存到 IndexedDB (Key: ${active.角色ID}_${active.存档槽位})`);

      // 4. 更新Pinia Store中的 *元数据*
      slot.保存时间 = new Date().toISOString();
      const playerAttributes = (currentSaveData as any).角色?.属性;
      const playerLocation = (currentSaveData as any).角色?.位置;
      slot.境界 = playerAttributes?.境界?.名称 || '凡人';
      slot.位置 = playerLocation?.描述 || '未知';
      if ((currentSaveData as any).元数据?.时间) {
        const time = (currentSaveData as any).元数据.时间;
        slot.游戏内时间 = `${time.年}年${time.月}月${time.日}日`;
      }
      // 确保存档数据在内存中也被移除，以保持一致性
      delete slot.存档数据;

      // 5. 将元数据变更写回 rootState 并持久化
      if (profile.模式 === '单机' && profile.存档列表) {
        profile.存档列表[active.存档槽位] = slot;
      } else if (profile.模式 === '联机') {
        if (!profile.存档列表) {
          profile.存档列表 = {};
        }
        profile.存档列表['云端修行'] = slot;
      }
      await commitMetadataToStorage();

      // 6. 云端同步（联机模式）
      if (profile.模式 === '联机') {
        // 🔥 检查是否后端创建失败，如果是则先尝试重新创建角色
        const currentOnlineSlot = getOnlineSaveSlot(profile);
        const backendCreationFailed = (currentOnlineSlot?.云端同步信息 as any)?.后端创建失败;
        if (backendCreationFailed) {
          try {
            debug.log('角色商店', '检测到后端创建失败标记，尝试重新创建角色...');
            const characterSubmissionData = {
              char_id: active.角色ID,
              base_info: profile.角色,
            };
            await createCharacterAPI(characterSubmissionData);
            // 创建成功，清除失败标记
            if (currentOnlineSlot?.云端同步信息) {
              (currentOnlineSlot.云端同步信息 as any).后端创建失败 = false;
            }
            debug.log('角色商店', '✅ 后端角色重新创建成功');
          } catch (error) {
            debug.warn('角色商店', '后端角色重新创建失败，跳过云端同步', error);
            // 保持失败标记，下次再试
            return;
          }
        }

        try {
          const worldMapToSync = (slot as any).世界地图 ?? {};
          const gameTimeToSync = slot.游戏内时间 ?? null;

          // 🔥 过滤叙事信息，减少数据量
          const saveDataForCloud = filterSaveDataForCloud(currentSaveData);
          const result = await updateCharacterSave(active.角色ID, {
            save_data: saveDataForCloud,
            world_map: worldMapToSync,
            game_time: gameTimeToSync
          });

          const syncOnlineSlot = getOnlineSaveSlot(profile);
          const nextVersion =
            typeof (result as any)?.version === 'number'
              ? (result as any).version
              : (syncOnlineSlot?.云端同步信息?.版本 ?? 1) + 1;

          if (syncOnlineSlot) {
            syncOnlineSlot.云端同步信息 = {
              最后同步: new Date().toISOString(),
              版本: nextVersion,
              需要同步: false,
            };
          }

          await commitMetadataToStorage();
        } catch (error) {
          debug.warn('角色商店', '云端同步失败（联机模式）', error);
          const errorOnlineSlot = getOnlineSaveSlot(profile);
          if (errorOnlineSlot) {
            errorOnlineSlot.云端同步信息 = {
              最后同步: errorOnlineSlot.云端同步信息?.最后同步 || new Date().toISOString(),
              版本: errorOnlineSlot.云端同步信息?.版本 || 1,
              需要同步: true,
            };
            await commitMetadataToStorage();
          }
        }
      }

      debug.log('角色商店', `存档【${slot.存档名}】元数据已更新`);

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
    console.log('[角色商店-删除存档] 开始删除存档:', { charId, slotKey });

    const profile = rootState.value.角色列表[charId];
    if (!profile || profile.模式 !== '单机' || !profile.存档列表) {
      console.warn('[角色商店-删除存档] 无法删除：角色不存在或非单机模式');
      toast.error('无法删除存档：角色不存在或非单机模式');
      return;
    }

    console.log('[角色商店-删除存档] 当前存档列表:', Object.keys(profile.存档列表));

    // 检查是否为最后一个可删除的存档
    const deletableSavesCount = Object.entries(profile.存档列表).filter(
      ([key, slot]) => slot && key !== '上次对话'
    ).length;

    console.log('[角色商店-删除存档] 可删除存档数量:', deletableSavesCount);

    if (deletableSavesCount <= 1) {
      console.warn('[角色商店-删除存档] 最后一个存档不能删除');
      toast.error('最后一个存档不能删除');
      return;
    }

    // 检查是否存在该存档
    const saveName = profile.存档列表?.[slotKey]?.存档名 || slotKey;
    if (!profile.存档列表?.[slotKey]) {
      console.warn('[角色商店-删除存档] 存档不存在:', slotKey);
      toast.error(`存档【${saveName}】不存在`);
      return;
    }

    // 检查是否为当前激活的存档
    const active = rootState.value.当前激活存档;
    if (active?.角色ID === charId && active?.存档槽位 === slotKey) {
      console.log('[角色商店-删除存档] 删除的是当前激活存档，清理酒馆环境');
      try {
        await clearAllCharacterData();
        toast.info(isTavernEnv() ? '当前存档已激活，同步清理酒馆环境变量。' : '当前存档已激活，已清理环境变量。');
      } catch (error) {
        debug.error('角色商店', '删除激活存档时清理酒馆数据失败', error);
        toast.error(isTavernEnv() ? '清理酒馆环境变量失败，建议刷新页面。' : '清理环境变量失败，建议刷新页面。');
      }
      rootState.value.当前激活存档 = null;
    }

    // 🔥 [核心修复] 从 IndexedDB 删除存档数据
    try {
      console.log(`[角色商店-删除存档] 从 IndexedDB 删除存档: ${charId}/${slotKey}`);
      await storage.deleteSaveData(charId, slotKey);
      console.log('[角色商店-删除存档] ✅ IndexedDB 存档数据已删除');
    } catch (error) {
      console.error('[角色商店-删除存档] 删除 IndexedDB 存档数据失败:', error);
      toast.warning('清理存档数据时出现错误');
    }

    // 删除存档
    console.log('[角色商店-删除存档] 执行 delete 操作');
    delete profile.存档列表[slotKey];

    // 触发响应式更新
    profile.存档列表 = { ...profile.存档列表 };

    console.log('[角色商店-删除存档] 删除后存档列表:', Object.keys(profile.存档列表));
    console.log('[角色商店-删除存档] 开始保存到 IndexedDB');

    await commitMetadataToStorage();

    console.log('[角色商店-删除存档] IndexedDB 保存完成');

    // 🔥 同步到云端
    try {
      await syncRootStateToCloud();
      debug.log('角色商店', '删除存档后已同步到云端');
    } catch (error) {
      debug.error('角色商店', '删除存档后同步云端失败', error);
    }

    toast.success('存档已删除');
    console.log('[角色商店-删除存档] 删除存档完成');
  };

  /**
   * 为指定角色创建新的存档槽位
   * @param charId 角色ID
   * @param saveName 存档名称
   */
  const createNewSave = async (charId: string, saveName: string) => {
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

    await commitMetadataToStorage();
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

    if (!active || !profile) {
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
      // 🔥 修复：从 gameStateStore 获取当前游戏状态，而不是依赖 activeSaveSlot
      const gameStateStore = useGameStateStore();
      const currentSaveData = gameStateStore.toSaveData();

      if (!currentSaveData) {
        toast.error('无法获取当前游戏状态');
        return null;
      }

      // 1. 创建新存档槽位，基于当前游戏状态
      const now = new Date().toISOString();
      const playerAttributes = (currentSaveData as any).角色?.属性;
      const playerLocation = (currentSaveData as any).角色?.位置;

      const newSlot: SaveSlot = {
        存档名: saveName,
        保存时间: now,
        角色名字: (currentSaveData as any).角色?.身份?.名字,
        境界: playerAttributes?.境界?.名称 || '凡人',
        位置: playerLocation?.描述 || '未知',
        // 深拷贝存档数据
        存档数据: JSON.parse(JSON.stringify(currentSaveData))
      };

      // 计算修为进度
      if (playerAttributes?.境界 && playerAttributes.境界.下一级所需 > 0) {
        newSlot.修为进度 = Math.floor((playerAttributes.境界.当前进度 / playerAttributes.境界.下一级所需) * 100);
      }

      // 更新时间
      if ((currentSaveData as any).元数据?.时间) {
        const time = (currentSaveData as any).元数据.时间;
        newSlot.游戏内时间 = `${time.年}年${time.月}月${time.日}日`;
      }

      // 2. 添加到存档列表
      profile.存档列表[saveName] = newSlot;

      // 🔥 新架构：将大的存档数据独立保存到 IndexedDB
      await storage.saveSaveData(active.角色ID, saveName, currentSaveData);

      // 3. 保存元数据到本地存储
      await commitMetadataToStorage();

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
   * [新增] 将当前游戏进度保存到指定的存档槽位
   * @param slotName 存档槽位名称（如"上次对话"等）
   *
   * 注意：
   * - "上次对话"是特殊存档，用于对话回滚
   */
  const saveToSlot = async (slotName: string): Promise<void> => {
    const active = rootState.value.当前激活存档;
    const profile = activeCharacterProfile.value;

    if (!active || !profile) {
      const errorMsg = `没有激活的角色，无法保存到 ${slotName}`;
      debug.error('角色商店', `[saveToSlot] ${errorMsg}`);
      console.error(`[saveToSlot] ${errorMsg}`, { active, profile });
      throw new Error(errorMsg);
    }

    if (profile.模式 !== '单机') {
      const errorMsg = `联机模式不支持多存档，无法保存到 ${slotName}`;
      debug.warn('角色商店', `[saveToSlot] ${errorMsg}`);
      console.warn(`[saveToSlot] ${errorMsg}`, { 模式: profile.模式 });
      throw new Error(errorMsg);
    }

    if (!profile.存档列表) {
      profile.存档列表 = {};
    }

    try {
      // 1. 从 gameStateStore 获取最新的游戏数据
      const gameStateStore = useGameStateStore();
      const currentSaveData = gameStateStore.getCurrentSaveData();

      if (!currentSaveData) {
        throw new Error('无法获取当前存档数据');
      }

      // 2. 自动更新年龄
      try {
        updateLifespanFromGameTime(currentSaveData);
        if ((currentSaveData as any).社交?.关系 && (currentSaveData as any).元数据?.时间) {
          Object.values((currentSaveData as any).社交.关系).forEach((npc) => {
            if (npc && typeof npc === 'object') {
              updateNpcLifespanFromGameTime(npc as NpcProfile, (currentSaveData as any).元数据.时间);
            }
          });
        }
      } catch (error) {
        debug.warn('角色商店', '[saveToSlot] 自动更新年龄失败（非致命）:', error);
      }

      // 3. 提取元数据
      const playerAttributes = (currentSaveData as any).角色?.属性;
      const playerLocation = (currentSaveData as any).角色?.位置;
      const now = new Date().toISOString();

      const targetSlotList = profile.存档列表;
      const existingSlot = targetSlotList[slotName];

      console.log(`[saveToSlot] 保存到槽位 "${slotName}"`, {
        角色ID: active.角色ID,
        角色名: profile.角色?.名字,
        当前激活槽位: active.存档槽位,
        目标槽位: slotName,
        说明: '特殊存档不受当前激活存档影响，始终保存到角色级别'
      });

      // 4. 构建完整的槽位数据
      const newSlotData: SaveSlot = {
        存档名: slotName,
        保存时间: now,
        存档数据: currentSaveData,
        角色名字: (currentSaveData as any).角色?.身份?.名字,
        境界: playerAttributes?.境界?.名称 || '凡人',
        位置: playerLocation?.描述 || '未知',
        修为进度: 0,
        游戏内时间: undefined
      };

      // 计算修为进度
      if (playerAttributes?.境界 && playerAttributes.境界.下一级所需 > 0) {
        newSlotData.修为进度 = Math.floor((playerAttributes.境界.当前进度 / playerAttributes.境界.下一级所需) * 100);
      }

      // 更新时间
      if ((currentSaveData as any).元数据?.时间) {
        const time = (currentSaveData as any).元数据.时间;
        newSlotData.游戏内时间 = `${time.年}年${time.月}月${time.日}日`;
      }

      // 🔥 关键：保存到角色的存档列表中（不受当前激活存档影响）
      targetSlotList[slotName] = newSlotData;

      // 🔥 新架构：将大的存档数据独立保存
      await storage.saveSaveData(active.角色ID, slotName, currentSaveData);

      // 5. 保存到本地存储
      await commitMetadataToStorage();

      debug.log('角色商店', `✅ 已保存到存档槽位: ${slotName}`);
    } catch (error) {
      debug.error('角色商店', `保存到槽位 ${slotName} 失败`, error);
      throw error;
    }
  };

  /**
   * 重命名指定角色的指定存档
   * @param charId 角色ID
   * @param oldSlotKey 旧的存档槽位关键字
   * @param newSaveName 新的存档名称
   */
  const renameSave = async (charId: string, oldSlotKey: string, newSaveName: string) => {
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
      await commitMetadataToStorage();
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

    await commitMetadataToStorage();
    toast.success(`存档已重命名为【${newSaveName}】`);
  };

  /**
   * 更新角色数据（从AI响应中提取数据更新）
   * @param characterUpdates 角色数据更新
   */
  const updateCharacterData = async (stateChanges: StateChangeLog) => {
    const active = rootState.value.当前激活存档;
    const profile = activeCharacterProfile.value;
    const save = activeSaveSlot.value;

    if (!save?.存档数据 || !active || !profile) {
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

    // 🔥 触发Vue响应式：重新创建存档对象
    const charId = active.角色ID;
    const slotId = active.存档槽位;

    if (profile.模式 === '单机' && profile.存档列表) {
      rootState.value.角色列表[charId].存档列表 = {
        ...profile.存档列表,
        [slotId]: {
          ...profile.存档列表[slotId],
          存档数据: cloneDeep(save.存档数据), // 深拷贝确保响应式更新
          保存时间: new Date().toISOString()
        }
      };
    } else if (profile.模式 === '联机') {
      if (!profile.存档列表) {
        profile.存档列表 = {};
      }
      const currentOnlineSlot = getOnlineSaveSlot(profile);
      rootState.value.角色列表[charId].存档列表['云端修行'] = {
        ...(currentOnlineSlot || { 存档名: '云端修行' }),
        存档数据: cloneDeep(save.存档数据), // 深拷贝确保响应式更新
        保存时间: new Date().toISOString()
      };
    }

    // 强制触发 rootState 的响应式更新
    triggerRef(rootState);

    await commitMetadataToStorage();

    // 🔥 增量保存到 IndexedDB
    if (changedPaths.length > 0) {
      await saveToStorage({ changedPaths });
      debug.log('角色商店', `✅ 角色数据已更新并增量同步 ${changedPaths.length} 个字段`, changedPaths);
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
      return await loadGame(charId, '云端修行');
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
  const importSave = async (charId: string, saveData: SaveSlot) => {
    const profile = rootState.value.角色列表[charId];

    if (!profile) {
      toast.error('找不到角色，无法导入存档');
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

    // 🔥 关键修复：先将存档数据保存到 IndexedDB
    if (saveData.存档数据) {
      const patched = isTavernEnv() ? (ensureSaveDataHasTavernNsfw(saveData.存档数据) as any) : saveData.存档数据;
      const v3Data = (isSaveDataV3(patched as any) ? patched : migrateSaveDataToLatest(patched as any).migrated) as any;
      const validation = validateSaveDataV3(v3Data as any);
      if (!validation.isValid) {
        console.error('[导入存档] V3校验失败:', validation.errors);
        toast.error(`导入失败：存档结构不合法（${validation.errors[0] || '未知原因'}）`);
        return;
      }

      await storage.saveSaveData(charId, importName, v3Data);

      const attrs = (v3Data as any)?.角色?.属性;
      const loc = (v3Data as any)?.角色?.位置;
      saveData = {
        ...saveData,
        角色名字: saveData.角色名字 ?? (v3Data as any)?.角色?.身份?.名字,
        境界: saveData.境界 ?? attrs?.境界?.名称,
        位置: saveData.位置 ?? loc?.描述,
        游戏内时间: saveData.游戏内时间 ?? (() => {
          const t = (v3Data as any)?.元数据?.时间;
          return t ? `${t.年}年${t.月}月${t.日}日` : undefined;
        })(),
        存档数据: cloneDeep(v3Data),
      };
      debug.log('角色商店', `✅ 已将导入的存档数据保存到 IndexedDB: ${charId}/${importName}`);
    }

    // 然后保存元数据到 Store
    profile.存档列表[importName] = {
      ...saveData,
      存档名: importName
    };

    await commitMetadataToStorage();
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
    } else if (profile.模式 === '联机') {
      const onlineSlot = getOnlineSaveSlot(profile);
      if (onlineSlot) {
        onlineSlot.存档数据 = null;
        onlineSlot.保存时间 = null;
      }
    }

    // 清空当前激活存档
    rootState.value.当前激活存档 = null;

    await commitMetadataToStorage();
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
    const gameStateStore = useGameStateStore();
    try {
      uiStore.startLoading('正在退出游戏...');
      await clearAllCharacterData();
      gameStateStore.resetState(); // 清除游戏状态（包括联机状态）
      rootState.value.当前激活存档 = null;
      await commitMetadataToStorage();
      toast.success(isTavernEnv() ? '已成功退出游戏，酒馆环境已重置。' : '已成功退出游戏。');
    } catch (error) {
      debug.error('角色商店', '退出游戏会话失败', error);
      toast.error('退出游戏失败，建议刷新页面以确保环境纯净。');
    } finally {
      uiStore.stopLoading();
    }
  };

  /**
   * [新增] 回滚到上次对话的状态
   */
  const rollbackToLastConversation = async () => {
    const profile = activeCharacterProfile.value;
    const active = rootState.value.当前激活存档;

    if (!profile || !active || profile.模式 !== '单机' || !profile.存档列表) {
      throw new Error('无法执行回滚：无效的存档状态');
    }

    let lastConversationSlot = profile.存档列表['上次对话'];

    // 🔥 修复：如果"上次对话"存档槽位不存在或数据不在内存中，先从IndexedDB加载
    if (!lastConversationSlot || !lastConversationSlot.存档数据) {
      debug.log('角色商店', '从IndexedDB加载"上次对话"存档数据');
      const loadedData = await storage.loadSaveData(active.角色ID, '上次对话');
      if (!loadedData) {
        throw new Error('没有可用于回滚的"上次对话"存档。请确保已启用"对话前自动备份"功能。');
      }

      // 如果槽位不存在，创建新槽位
      if (!lastConversationSlot) {
        lastConversationSlot = {
          id: '上次对话',
          存档名: '上次对话',
          角色名字: (loadedData as any).角色?.身份?.名字 || profile.角色?.名字 || '未知',
          境界: '未知',
          位置: '未知',
          保存时间: new Date().toISOString(),
          存档数据: loadedData
        };
        profile.存档列表['上次对话'] = lastConversationSlot;
      } else {
        lastConversationSlot.存档数据 = loadedData;
      }
    }

    const lastConversationData = lastConversationSlot.存档数据;
    if (!lastConversationData) {
      throw new Error('没有可用于回滚的"上次对话"存档。请确保已启用"对话前自动备份"功能。');
    }

    // 1. 用"上次对话"的数据深拷贝覆盖当前激活的存档数据
    const activeSlot = profile.存档列表[active.存档槽位];
    if (!activeSlot) {
      throw new Error(`找不到当前激活的存档槽位: ${active.存档槽位}`);
    }

    const rolledBackData = JSON.parse(JSON.stringify(lastConversationData));
    activeSlot.存档数据 = rolledBackData;
    activeSlot.保存时间 = new Date().toISOString();

    // 🔥 修复：更新元数据
    const playerAttributes = (rolledBackData as any).角色?.属性;
    const playerLocation = (rolledBackData as any).角色?.位置;
    activeSlot.境界 = playerAttributes?.境界?.名称 || '凡人';
    activeSlot.位置 = playerLocation?.描述 || '未知';
    if ((rolledBackData as any).元数据?.时间) {
      const time = (rolledBackData as any).元数据.时间;
      activeSlot.游戏内时间 = `${time.年}年${time.月}月${time.日}日`;
    }

    // 🔥 修复：触发响应式更新
    if (profile.模式 === '单机' && profile.存档列表) {
      rootState.value.角色列表[active.角色ID].存档列表 = {
        ...profile.存档列表,
        [active.存档槽位]: { ...activeSlot }
      };
    }
    triggerRef(rootState);

    // 2. 保存到IndexedDB
    await storage.saveSaveData(active.角色ID, active.存档槽位, rolledBackData);
    await commitMetadataToStorage();

    // 🔥 修复：同步到gameStateStore，确保UI立即更新
    const gameStateStore = useGameStateStore();
    gameStateStore.loadFromSaveData(rolledBackData);

    debug.log('角色商店', '✅ 已成功回滚到上次对话前的状态');
  };


  /**
   * [内部辅助] 执行Tavern指令
   * @param saveData 当前存档数据
   * @param profile 当前角色档案
   * @param commands 指令数组
   */
  const executeTavernCommands = async (saveData: SaveData, profile: CharacterProfile, commands: TavernCommand[]): Promise<string[]> => {
    const errors: string[] = [];

    // 简化的路径解析和设置函数
    const setNestedValue = (obj: Record<string, unknown> | SaveData | CharacterProfile, path: string, value: unknown) => {
      const keys = path.split('.');
      let current = obj as Record<string, unknown>;
      for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined || typeof current[keys[i]] !== 'object') {
          current[keys[i]] = {};
        }
        current = current[keys[i]] as Record<string, unknown>;
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
        let rootObject: Record<string, unknown> | SaveData | CharacterProfile;
        let relativeKey: string;

        if (key.startsWith('character.profile.')) {
          rootObject = profile;
          relativeKey = key.substring('character.profile.'.length);
        } else {
          // 默认操作saveData
          rootObject = saveData;
          relativeKey = key;
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
      let commands: TavernCommand[] = [];
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
      await commitMetadataToStorage();

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

/**
 * [新增] 删除一个NPC
 * @param npcName 要删除的NPC的名字
 */
const deleteNpc = async (npcName: string) => {
  // 🔥 修复：直接访问 gameStateStore 的响应式数据，而不是副本
  const gameStateStore = useGameStateStore();
  const relationships = gameStateStore.relationships;

  if (!relationships) {
    const msg = '无法删除NPC：没有激活的存档或关系数据。';
    toast.error(msg);
    throw new Error(msg);
  }

  const npcKey = Object.keys(relationships).find(
    key => relationships[key]?.名字 === npcName
  );

  if (!npcKey) {
    const msg = `找不到名为 ${npcName} 的NPC。`;
    toast.error(msg);
    throw new Error(msg);
  }

  // 备份NPC数据以便回滚
  const backupNpc = { ...relationships[npcKey] };

  try {
    // 1. 直接修改 gameStateStore.relationships（响应式数据）
    console.log(`[删除NPC-调试] 删除前 gameStateStore.relationships 的引用:`, gameStateStore.relationships === relationships);
    console.log(`[删除NPC-调试] 删除前 relationships 中的NPC列表:`, Object.keys(relationships).map(k => relationships[k]?.名字));

    delete relationships[npcKey];

    console.log(`[删除NPC-调试] 已从内存中删除NPC: ${npcName}`);
    console.log(`[删除NPC-调试] 删除后 relationships 中的NPC数量:`, Object.keys(relationships).length);
    console.log(`[删除NPC-调试] 删除后是否还存在该NPC:`, !!relationships[npcKey]);
    console.log(`[删除NPC-调试] 删除后 gameStateStore.relationships 中是否还存在:`, !!gameStateStore.relationships?.[npcKey]);
    console.log(`[删除NPC-调试] 删除后 relationships 中的NPC列表:`, Object.keys(relationships).map(k => relationships[k]?.名字));
    debug.log('角色商店', `已从 gameStateStore 中删除NPC: ${npcName}`);

    // 2. 通过 gameStateStore 保存，这将处理所有持久化逻辑
    // gameStateStore.saveGame() 内部会调用 characterStore.saveCurrentGame()
    // 所以这一步已经足够保存到所有存储层
    console.log(`[删除NPC-调试] 开始保存到存储...`);
    await gameStateStore.saveGame();
    console.log(`[删除NPC-调试] 保存完成`);

    // 🔥 [调试] 验证保存后的数据
    const savedData = gameStateStore.toSaveData();
    if ((savedData as any)?.社交?.关系) {
      const npcStillExists = Object.values((savedData as any).社交.关系).some((npc: any) => npc?.名字 === npcName);
      console.log(`[删除NPC-调试] toSaveData() 返回的数据中是否还存在该NPC:`, npcStillExists);
      console.log(`[删除NPC-调试] toSaveData() 返回的关系数量:`, Object.keys((savedData as any).社交.关系).length);
      console.log(`[删除NPC-调试] toSaveData() 返回的NPC列表:`, Object.values((savedData as any).社交.关系).map((npc: any) => npc?.名字));
    }

    debug.log('角色商店', `✅ NPC ${npcName} 已成功删除并保存`);
    toast.success(`NPC【${npcName}】已成功删除。`);
  } catch (error) {
    debug.error('角色商店', `删除NPC ${npcName} 后保存失败`, error);

    // 回滚 gameStateStore 中的内存数据
    relationships[npcKey] = backupNpc;
    debug.log('角色商店', `已回滚 gameStateStore 中的NPC删除操作: ${npcName}`);

    toast.error(`删除NPC失败: ${error instanceof Error ? error.message : '未知错误'}`);
    throw error; // 向上层抛出错误，让UI组件能够处理
  }
};


/**
 * [新增] 装备一个功法
 * @param itemId 要装备的功法物品ID
 */
const equipTechnique = async (itemId: string) => {
  // 🔥 [修复] 使用 gameStateStore 获取当前存档数据
  // activeSaveSlot 只包含元数据,不包含完整存档数据
  const gameStateStore = useGameStateStore();
  const saveData = gameStateStore.getCurrentSaveData();

  if (!saveData) {
    toast.error('存档数据不存在');
    return;
  }

  const item = (saveData as any).角色?.背包?.物品?.[itemId];

  if (!item || item.类型 !== '功法') {
    toast.error('要装备的物品不是一个有效的功法');
    return;
  }

  // 🔍 调试：装备前检查品质数据
  console.log('[角色商店-调试] 装备功法前的数据:', {
    功法名称: item.名称,
    品质字段存在: !!item.品质,
    品质内容: item.品质,
    完整物品数据: item
  });

  // 1. 卸下当前所有功法
  Object.values(((saveData as any).角色?.背包?.物品 ?? {}) as Record<string, Item>).forEach((i) => {
    if (i.类型 === '功法') {
      i.已装备 = false;
    }
  });

  // 2. 装备新功法
  item.已装备 = true;

  // 🔥 [关键修复] 初始化修炼进度（如果未定义）
  if (item.修炼进度 === undefined || item.修炼进度 === null) {
    item.修炼进度 = 0;
    debug.log('角色商店', `初始化功法修炼进度为 0`);
  }

  // 🔥 [关键修复] 初始化并更新已解锁技能数组
  if (!item.已解锁技能) {
    item.已解锁技能 = [];
  }

  // 检查哪些技能应该立即解锁（解锁阈值 <= 当前进度）
  if (item.功法技能 && Array.isArray(item.功法技能)) {
    const currentProgress = item.修炼进度 || 0;
    debug.log('角色商店', `[技能解锁检查] 功法: ${item.名称}, 进度: ${currentProgress}%, 技能数: ${item.功法技能.length}`);
    item.功法技能.forEach((skill: any) => {
      const unlockThreshold = skill.熟练度要求 || 0;
      debug.log('角色商店', `  检查技能: ${skill.技能名称}, 阈值: ${unlockThreshold}%, 当前进度: ${currentProgress}%, 应解锁: ${currentProgress >= unlockThreshold}`);
      if (currentProgress >= unlockThreshold && !item.已解锁技能!.includes(skill.技能名称)) {
        item.已解锁技能!.push(skill.技能名称);
        debug.log('角色商店', `  ✅ 立即解锁技能: ${skill.技能名称} (阈值: ${unlockThreshold}%)`);
      }
    });
    debug.log('角色商店', `[技能解锁结果] 已解锁技能数组:`, item.已解锁技能);
  }

  // 3. 创建或更新修炼槽位（只存储引用）
  (saveData as any).角色.修炼 = {
    ...(((saveData as any).角色.修炼 ?? {}) as any),
    修炼功法: {
      物品ID: item.物品ID,
      名称: item.名称,
    },
  };

  debug.log('角色商店', `已装备功法: ${item.名称}`);
  debug.log('角色商店', `修炼进度存储在: 背包.物品.${item.物品ID}.修炼进度`);
  debug.log('角色商店', `已解锁技能数量: ${item.已解锁技能?.length || 0}`);

  // 🔥 [掌握技能自动计算] 装备功法后重新计算掌握技能
  try {
    const updatedSkills = updateMasteredSkills(saveData);
    debug.log('角色商店', `装备功法后已更新掌握技能列表，共 ${updatedSkills.length} 个技能`);
  } catch (e) {
    debug.error('角色商店', '装备功法后自动计算掌握技能失败:', e);
  }

  // 🔥 [修复] 更新 gameStateStore 并保存完整存档数据
  gameStateStore.loadFromSaveData(saveData);

  // 🔥 [关键修复] loadFromSaveData 后再次确保技能解锁状态正确
  // 因为 loadFromSaveData 可能会创建新对象
  const itemInStore = gameStateStore.inventory?.物品?.[itemId];
  if (itemInStore && itemInStore.类型 === '功法') {
    if (!itemInStore.已解锁技能) {
      itemInStore.已解锁技能 = [];
    }
    const currentProgress = itemInStore.修炼进度 || 0;
    if (itemInStore.功法技能 && Array.isArray(itemInStore.功法技能)) {
      itemInStore.功法技能.forEach((skill: any) => {
        const unlockThreshold = skill.熟练度要求 || 0;
        if (currentProgress >= unlockThreshold && !itemInStore.已解锁技能!.includes(skill.技能名称)) {
          itemInStore.已解锁技能!.push(skill.技能名称);
          debug.log('角色商店', `[二次确认] 解锁技能: ${skill.技能名称}`);
        }
      });
    }
  }

  await saveCurrentGame(); // 使用 saveCurrentGame 保存完整存档数据

  // 🔍 调试：同步后再次检查品质数据
  const itemAfterSync = (saveData as any).角色?.背包?.物品?.[itemId];
  console.log('[角色商店-调试] 持久化后的功法数据:', {
    功法名称: itemAfterSync?.名称,
    品质字段存在: !!itemAfterSync?.品质,
    品质内容: itemAfterSync?.品质,
    完整物品数据: itemAfterSync
  });

  // 🔥 修复：显示真实功法名称而非伪装名称
  const realTechniqueName = item.名称;
  toast.success(`已开始修炼《${realTechniqueName}》`);
};

/**
 * [新增] 导入一个完整的角色档案
 * @param profileData 从JSON文件解析的角色档案数据（可能包含 _导入存档列表 字段）
 */
const importCharacter = async (profileData: CharacterProfile & { _导入存档列表?: any[] }) => {
  if (!profileData || !profileData.角色 || !profileData.模式) {
    throw new Error('无效的角色文件格式。');
  }

  // 为导入的角色生成一个新的唯一ID，避免覆盖现有角色
  const newCharId = `char_${Date.now()}`;
  const characterName = profileData.角色.名字 || '未知角色';

  // 检查角色名是否重复
  const isDuplicate = Object.values(rootState.value.角色列表).some(
    p => p.角色.名字 === characterName
  );

  if (isDuplicate) {
    // 可以选择抛出错误或自动重命名
    // 这里我们选择抛出错误，让用户决定如何处理
    throw new Error(`角色 "${characterName}" 已存在，请先删除或重命名现有角色。`);
  }

  // 🔥 提取并处理导入的存档列表
  const importedSaves = profileData._导入存档列表;
  // 删除临时字段，不保存到角色数据中
  delete (profileData as any)._导入存档列表;

  // 初始化存档列表
  if (!profileData.存档列表) {
    profileData.存档列表 = {};
  }

  // 🔥 如果有导入的存档，将存档数据保存到 IndexedDB
  if (importedSaves && Array.isArray(importedSaves) && importedSaves.length > 0) {
    debug.log('角色商店', `开始导入 ${importedSaves.length} 个存档...`);

    for (const save of importedSaves) {
      const saveName = save.存档名 || '导入存档';

      // 生成唯一的存档名称，避免冲突
      let finalSaveName = saveName;
      let counter = 1;
      while (profileData.存档列表[finalSaveName]) {
        finalSaveName = `${saveName}_${counter}`;
        counter++;
      }

      // 将存档数据保存到 IndexedDB
      if (save.存档数据) {
	        const patched = isTavernEnv() ? (ensureSaveDataHasTavernNsfw(save.存档数据) as any) : save.存档数据;
	        const v3Data = (isSaveDataV3(patched as any) ? patched : migrateSaveDataToLatest(patched as any).migrated) as any;
	        const validation = validateSaveDataV3(v3Data as any);
	        if (!validation.isValid) {
	          console.error('[导入角色] 存档V3校验失败:', validation.errors);
	          throw new Error(`导入角色失败：存档结构不合法（${validation.errors[0] || '未知原因'}）`);
	        }

	        await storage.saveSaveData(newCharId, finalSaveName, v3Data);

	        const attrs = (v3Data as any)?.角色?.属性;
	        const loc = (v3Data as any)?.角色?.位置;
	        save.角色名字 = save.角色名字 ?? (v3Data as any)?.角色?.身份?.名字;
	        save.境界 = save.境界 ?? attrs?.境界?.名称;
	        save.位置 = save.位置 ?? loc?.描述;
	        save.游戏内时间 = save.游戏内时间 ?? (() => {
	          const t = (v3Data as any)?.元数据?.时间;
	          return t ? `${t.年}年${t.月}月${t.日}日` : undefined;
	        })();
        debug.log('角色商店', `✅ 已将存档数据保存到 IndexedDB: ${newCharId}/${finalSaveName}`);
      }

      // 保存存档元数据（不包含存档数据本身）
      const saveMetadata = { ...save };
      delete saveMetadata.存档数据;
      profileData.存档列表[finalSaveName] = {
        ...saveMetadata,
        存档名: finalSaveName
      };
    }

    debug.log('角色商店', `✅ 成功导入 ${importedSaves.length} 个存档`);
  }

  // 将角色数据添加到列表
  rootState.value.角色列表[newCharId] = {
    ...profileData,
  };

  await commitMetadataToStorage();
  debug.log('角色商店', `成功导入角色: ${characterName} (新ID: ${newCharId})，含 ${Object.keys(profileData.存档列表).length} 个存档`);
  return newCharId;  // 返回新角色ID
};

/**
 * [新增] 卸下一个功法
 * @param itemId 要卸下的功法物品ID
 */
/**
 * 从 IndexedDB 加载指定槽位的存档数据
 * @param characterId 角色ID
 * @param saveSlot 存档槽位
 * @returns SaveData 或 null
 */
const loadSaveData = async (characterId: string, saveSlot: string): Promise<SaveData | null> => {
  console.log(`[CharacterStore] Loading save data for ${characterId} - ${saveSlot}`);
  const saveData = await storage.loadSaveData(characterId, saveSlot);
  if (!saveData) {
    console.error(`[CharacterStore] Failed to load save data for ${characterId} - ${saveSlot}`);
    return null;
  }
  return saveData;
};

  /**
   * [新增] 按需加载指定角色的所有存档数据
   * @param charId 要加载存档的角色ID
   */
  const loadCharacterSaves = async (charId: string): Promise<void> => {
    const profile = rootState.value.角色列表[charId];
    if (!profile) {
      debug.warn('角色商店', `[loadCharacterSaves] 角色不存在: ${charId}`);
      return;
    }

    debug.log('角色商店', `[loadCharacterSaves] 开始为角色 ${charId} 加载存档数据...`);

    try {
      let loadedCount = 0;

      // 🔥 联机模式：加载单个存档
      if (profile.模式 === '联机') {
        // 确保存档列表和云端修行存档存在
        if (!profile.存档列表) {
          profile.存档列表 = {};
        }
        if (!profile.存档列表['云端修行']) {
          profile.存档列表['云端修行'] = {
            存档名: '云端修行',
            保存时间: '',
            游戏内时间: '',
          };
        }
        const 存档 = profile.存档列表['云端修行'];

        // 如果存档数据不在内存中，尝试从云端或本地加载
        if (!存档.存档数据) {
          // 🔥 检查后端创建是否失败，如果失败则跳过云端获取
          const backendCreationFailed = (存档.云端同步信息 as any)?.后端创建失败;

          // 首先尝试从云端获取（如果已登录且后端创建未失败）
          if (isBackendConfigured() && !backendCreationFailed) {
            const tokenValid = await verifyStoredToken();
            if (tokenValid) {
              try {
                const cloudProfile = await fetchCharacterProfile(charId) as any;
                const cloudSave = cloudProfile?.game_save;
                const cloudSaveData = cloudSave?.save_data;

                if (cloudSaveData) {
                  存档.存档数据 = cloudSaveData as SaveData;
                  if (cloudSave?.game_time && typeof cloudSave.game_time === 'string') {
                    存档.游戏内时间 = cloudSave.game_time;
                  }
                  存档.云端同步信息 = {
                    最后同步: cloudSave?.last_sync ? String(cloudSave.last_sync) : new Date().toISOString(),
                    版本: typeof cloudSave?.version === 'number' ? cloudSave.version : 1,
                    需要同步: false,
                  };
                  loadedCount++;
                  debug.log('角色商店', `  > 成功从云端加载联机存档`);
                }
              } catch (error) {
                debug.warn('角色商店', '从云端加载联机存档失败，尝试本地缓存', error);
              }
            }
          }

          // 如果云端没有或加载失败，尝试从本地 IndexedDB 加载
          if (!存档.存档数据) {
            const saveData = await storage.loadSaveData(charId, '云端修行');
            if (saveData) {
              存档.存档数据 = saveData;
              loadedCount++;
              debug.log('角色商店', `  > 成功从本地加载联机存档缓存`);
            }
          }
        }
      } else {
        // 单机模式：加载所有存档槽位
        if (!profile.存档列表) {
          debug.log('角色商店', `[loadCharacterSaves] 角色 ${charId} 无存档列表，无需加载。`);
          return;
        }

        const slotKeys = Object.keys(profile.存档列表);

        for (const slotKey of slotKeys) {
          const slot = profile.存档列表[slotKey];
          // 只加载没有存档数据的槽位（包括"上次对话"）
          if (slot && !slot.存档数据) {
            const saveData = await storage.loadSaveData(charId, slotKey);
            if (saveData) {
              slot.存档数据 = saveData;
              loadedCount++;
              debug.log('角色商店', `  > 成功加载存档: ${slotKey}`);
            }
          }
        }
      }

      if (loadedCount > 0) {
        // 强制触发响应式更新
        triggerRef(rootState);
        debug.log('角色商店', `[loadCharacterSaves] 完成加载，共载入 ${loadedCount} 个存档数据。`);
      } else {
        debug.log('角色商店', `[loadCharacterSaves] 无需加载新的存档数据。`);
      }
    } catch (error) {
      debug.error('角色商店', `[loadCharacterSaves] 加载角色 ${charId} 的存档时出错`, error);
    }
  };

const unequipTechnique = async (itemId: string) => {
  // 🔥 修复：使用 gameStateStore 获取当前存档数据，与其他方法保持一致
  const gameStateStore = useGameStateStore();
  const saveData = gameStateStore.getCurrentSaveData();

  if (!saveData) {
    toast.error('存档数据不存在');
    return;
  }
  const item = (saveData as any).角色?.背包?.物品?.[itemId];

  // 🔥 修复：使用与UI一致的验证逻辑，检查背包中的已装备状态
  // 兼容旧数据：如果 已装备 为 false 但 修炼中 为 true，也允许卸下
  const isEquipped = item.已装备 || (item as any).修炼中;

  if (!item || item.类型 !== '功法' || !isEquipped) {
    debug.error('角色商店', '功法卸载验证失败:', {
      itemExists: !!item,
      itemType: item?.类型,
      isEquipped: item?.已装备,
      isCultivating: (item as any)?.修炼中,
      requestedItemId: itemId
    });
    toast.error('要卸下的功法与当前修炼的功法不匹配');
    return;
  }

  // 修炼进度已存储在背包物品本身，无需同步

  // 2. 更新背包中的功法状态
  item.已装备 = false;
  if ((item as any).修炼中) (item as any).修炼中 = false;

  // 3. 清空修炼槽（如果存在的话，确保数据一致性）
  if ((saveData as any).角色?.修炼?.修炼功法?.物品ID === itemId) {
    (saveData as any).角色.修炼 = {
      ...(((saveData as any).角色.修炼 ?? {}) as any),
      修炼功法: null,
    };
  }

  debug.log('角色商店', `已卸下功法: ${item.名称}`);
  debug.log('角色商店', `修炼进度保留在: 背包.物品.${item.物品ID}.修炼进度`);

  // 🔥 [掌握技能自动计算] 卸下功法后重新计算掌握技能
  try {
    const updatedSkills = updateMasteredSkills(saveData);
    debug.log('角色商店', `卸下功法后已更新掌握技能列表，共 ${updatedSkills.length} 个技能`);
  } catch (e) {
    debug.error('角色商店', '卸下功法后自动计算掌握技能失败:', e);
  }

  // 🔥 注意：由于saveData是gameStateStore状态的引用，直接修改已自动更新store

  // 🔥 [UI即时响应] 在同步前强制触发一次UI更新
  triggerRef(rootState);

  await commitMetadataToStorage(); // 直接持久化到IndexedDB
  const progress = item.修炼进度 || 0;
  // 🔥 修复：显示真实功法名称而非伪装名称
  const realTechniqueName =  item.名称;
  toast.info(`已停止修炼《${realTechniqueName}》，修炼进度${progress}%已保存到背包`);
};


return {
  // State
  rootState,
  initialized,
  // Getters
  allCharacterProfiles,
  activeCharacterProfile,
  activeSaveSlot,
  saveSlots,
  // Actions
  initializeStore, // 🔥 导出初始化函数
  reloadFromStorage,
  createNewCharacter,
  deleteCharacter,
  deleteNpc, // 新增：删除NPC
  deleteSave,
  deleteSaveById,
  createNewSave,
  saveAsNewSlot, // 新增：另存为新存档
  saveToSlot, // 新增：保存到指定存档槽位
  renameSave,
  loadGame,
  loadGameById,
  saveCurrentGame,
  updateSaveDataDirectly, // 🔥 新增：直接更新SaveData（AI命令执行后）
  updateCharacterData,
  loadSaves,
  importSave,
  clearAllSaves,
  exitGameSession, // 新增：退出游戏会话
  rollbackToLastConversation, // 新增：回滚到上次对话
  commitMetadataToStorage, // 导出给外部使用
  repairCharacterDataWithAI, // 暴露新的AI修复方法
  // 初始状态变更传递
  initialCreationStateChanges,
  setInitialCreationStateChanges,
  consumeInitialCreationStateChanges,
  // 功法管理
  equipTechnique,
  unequipTechnique,
  importCharacter, // 新增：导入角色
  loadSaveData,
  loadCharacterSaves, // 新增：按需加载存档
};
});
