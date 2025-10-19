/**
 * useGameData - 统一的游戏数据访问层
 *
 * 这个 composable 提供了一个统一的接口来访问和修改游戏状态
 * 所有组件应该通过这个接口而不是直接访问 stores
 */

import { computed } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import type {
  CharacterBaseInfo,
  PlayerStatus,
  Inventory,
  NpcProfile,
  Equipment,
  Memory,
  GameTime,
  WorldInfo
} from '@/types/game';

export function useGameData() {
  const gameState = useGameStateStore();

  // ==================== 只读计算属性 ====================

  /**
   * 角色基础信息（只读）
   */
  const character = computed<CharacterBaseInfo | null>(() => gameState.character);

  /**
   * 玩家角色状态（只读）
   */
  const playerStatus = computed<PlayerStatus | null>(() => gameState.playerStatus);

  /**
   * 背包（只读）
   */
  const inventory = computed<Inventory | null>(() => gameState.inventory);

  /**
   * 装备栏（只读）
   */
  const equipment = computed<Equipment | null>(() => gameState.equipment);

  /**
   * 人物关系（只读）
   */
  const relationships = computed(() => gameState.relationships);

  /**
   * 世界信息（只读）
   */
  const worldInfo = computed<WorldInfo | null>(() => gameState.worldInfo);

  /**
   * 记忆数据（只读）
   */
  const memory = computed<Memory | null>(() => gameState.memory);

  /**
   * 游戏时间（只读）
   */
  const gameTime = computed<GameTime | null>(() => gameState.gameTime);

  /**
   * 叙事历史（只读）
   */
  const narrativeHistory = computed(() => gameState.narrativeHistory);

  /**
   * 游戏是否已加载（只读）
   */
  const isGameLoaded = computed(() => gameState.isGameLoaded);

  // ==================== 衍生计算属性 ====================

  /**
   * 角色名字
   */
  const characterName = computed(() => gameState.character?.名字 || '未知');

  /**
   * 当前境界
   */
  const currentRealm = computed(() => gameState.playerStatus?.境界?.名称 || '凡人');

  /**
   * 当前位置
   */
  const currentLocation = computed(() => gameState.playerStatus?.位置?.描述 || '未知');

  /**
   * 灵石数量
   */
  const spiritStones = computed(() => gameState.inventory?.灵石 || 0);

  /**
   * 背包物品数量
   */
  const inventoryItemCount = computed(() => {
    if (!gameState.inventory?.物品) return 0;
    return Object.keys(gameState.inventory.物品).length;
  });

  // ==================== 更新方法 ====================

  /**
   * 更新玩家状态
   * @param updates 要更新的部分状态
   */
  const updateStatus = (updates: Partial<PlayerStatus>) => {
    gameState.updatePlayerStatus(updates);
  };

  /**
   * 更新背包
   * @param updates 要更新的部分背包数据
   */
  const updateInventory = (updates: Partial<Inventory>) => {
    gameState.updateInventory(updates);
  };

  /**
   * 更新特定NPC的关系
   * @param npcName NPC名字
   * @param updates 要更新的关系数据
   */
  const updateRelationship = (npcName: string, updates: Partial<NpcProfile>) => {
    gameState.updateRelationship(npcName, updates);
  };

  /**
   * 推进游戏时间
   * @param minutes 要推进的分钟数
   */
  const advanceTime = (minutes: number) => {
    gameState.advanceGameTime(minutes);
  };

  // ==================== 保存相关方法 ====================

  /**
   * 对话后保存（保存到当前存档 + "上次对话"存档）
   * 这是主要的保存方法，每次AI对话后调用
   */
  const saveAfterConversation = async () => {
    await gameState.saveAfterConversation();
  };

  /**
   * 手动保存游戏到当前激活存档
   */
  const saveGame = async () => {
    await gameState.saveGame();
  };

  /**
   * 返回道途前保存
   */
  const saveBeforeExit = async () => {
    await gameState.saveBeforeExit();
  };

  /**
   * 设置时间点存档间隔
   * @param minutes 间隔分钟数（真实世界时间）
   */
  const setTimeBasedSaveInterval = (minutes: number) => {
    gameState.setTimeBasedSaveInterval(minutes);
  };

  /**
   * 启用/禁用时间点存档
   * @param enabled 是否启用
   */
  const setTimeBasedSaveEnabled = (enabled: boolean) => {
    gameState.setTimeBasedSaveEnabled(enabled);
  };

  /**
   * 获取时间点存档配置
   */
  const timeBasedSaveConfig = computed(() => ({
    enabled: gameState.timeBasedSaveEnabled,
    interval: gameState.timeBasedSaveInterval,
  }));

  // ==================== 返回接口 ====================

  return {
    // 只读数据
    character,
    playerStatus,
    inventory,
    equipment,
    relationships,
    worldInfo,
    memory,
    gameTime,
    narrativeHistory,
    isGameLoaded,

    // 衍生数据
    characterName,
    currentRealm,
    currentLocation,
    spiritStones,
    inventoryItemCount,

    // 更新方法
    updateStatus,
    updateInventory,
    updateRelationship,
    advanceTime,

    // 保存方法
    saveAfterConversation,
    saveGame,
    saveBeforeExit,
    setTimeBasedSaveInterval,
    setTimeBasedSaveEnabled,
    timeBasedSaveConfig,
  };
}
