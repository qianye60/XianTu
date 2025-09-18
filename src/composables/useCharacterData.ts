/**
 * @fileoverview 统一的角色数据组合函数
 * 解决各个面板数据不一致的问题，提供统一的数据接口
 */

import { computed, ComputedRef } from 'vue';
import { useCharacterStore } from '@/stores/characterStore';
import type { ThousandDaoSystem, Equipment } from '@/types/game';

/**
 * 角色基础信息接口
 */
export interface CharacterBasicInfo {
  name: string;
  gender: string;
  world: string;
  talent: string;
  birth: string;
  spiritualRoots: string;
  talents: string[];
}

/**
 * 角色状态信息接口
 */
export interface CharacterStatus {
  realm: {
    name: string;
    level: number;
    progress: number;
    maxProgress: number;
    progressPercent: number;
  };
  lifespan: {
    current: number;
    max: number;
    remaining: number;
  };
  reputation: {
    level: string;
    value: number;
  };
  vitals: {
    qiBlood: { current: number; max: number; percent: number };
    lingQi: { current: number; max: number; percent: number };
    shenShi: { current: number; max: number; percent: number };
  };
}

/**
 * 角色属性信息接口
 */
export interface CharacterAttributes {
  [key: string]: {
    name: string;
    value: number;
    quality: string;
    color: string;
  };
}

/**
 * 角色位置信息接口
 */
export interface CharacterLocation {
  name: string;
  description: string;
  activity: string;
  coordinates?: { x: number; y: number };
}

/**
 * 角色修炼信息接口
 */
export interface CharacterCultivation {
  daoSystem: ThousandDaoSystem | null;
  equipment: Equipment | null;
}

/**
 * 完整角色数据接口
 */
export interface UnifiedCharacterData {
  basicInfo: CharacterBasicInfo;
  status: CharacterStatus;
  attributes: CharacterAttributes;
  location: CharacterLocation;
  statusEffects: any[];
  cultivation: CharacterCultivation;
}

/**
 * 统一的角色数据组合函数
 */
export function useUnifiedCharacterData(): {
  characterData: ComputedRef<UnifiedCharacterData | null>;
  isDataLoaded: ComputedRef<boolean>;
  refreshData: () => void;
} {
  const characterStore = useCharacterStore();

  const characterData = computed<UnifiedCharacterData | null>(() => {
    const profile = characterStore.activeCharacterProfile;
    const save = characterStore.activeSaveSlot;

    if (!profile || !save?.存档数据) {
      return null;
    }

    const baseInfo = profile.角色基础信息;
    const playerStatus = save.存档数据.玩家角色状态;

    // 统一基础信息
    const basicInfo: CharacterBasicInfo = {
      name: baseInfo?.名字 || '未知',
      gender: baseInfo?.性别 || '未知',
      world: baseInfo?.世界 || '未知世界',
      talent: baseInfo?.天资 || '凡人资质',
      birth: baseInfo?.出生 || '寻常出身',
      spiritualRoots: baseInfo?.灵根 || '五行杂灵根',
      talents: baseInfo?.天赋 || []
    };

    // 统一状态信息
    const realmData = playerStatus?.境界;
    const status: CharacterStatus = {
      realm: {
        name: realmData?.名称 || '凡人',
        level: typeof realmData?.等级 === 'number' ? realmData.等级 : 0,
        progress: typeof realmData?.当前进度 === 'number' ? realmData.当前进度 : 0,
        maxProgress: typeof realmData?.下一级所需 === 'number' ? realmData.下一级所需 : 0,
        progressPercent: (() => {
          const cur = typeof realmData?.当前进度 === 'number' ? realmData.当前进度 : 0;
          const max = typeof realmData?.下一级所需 === 'number' ? realmData.下一级所需 : 0;
          return max > 0 ? Math.floor((cur / max) * 100) : 0;
        })()
      },
      lifespan: {
        current: typeof playerStatus?.寿命?.当前 === 'number' ? playerStatus.寿命.当前 : 0,
        max: typeof playerStatus?.寿命?.最大 === 'number' ? playerStatus.寿命.最大 : 0,
        remaining: (() => {
          const cur = typeof playerStatus?.寿命?.当前 === 'number' ? playerStatus.寿命.当前 : 0;
          const max = typeof playerStatus?.寿命?.最大 === 'number' ? playerStatus.寿命.最大 : 0;
          return Math.max(0, max - cur);
        })()
      },
      reputation: {
        level: getReputationLevel(playerStatus?.声望 || 0),
        value: playerStatus?.声望 || 0
      },
      vitals: {
        qiBlood: formatVital(playerStatus?.气血),
        lingQi: formatVital(playerStatus?.灵气),
        shenShi: formatVital(playerStatus?.神识)
      }
    };

    // 统一属性信息
    const attributes: CharacterAttributes = {};
    const rawAttributes = baseInfo?.先天六司;
    if (rawAttributes) {
      const attributeMap = {
        '根骨': { name: '根骨', icon: '🦴' },
        '灵性': { name: '灵性', icon: '✨' },
        '悟性': { name: '悟性', icon: '🧠' },
        '气运': { name: '气运', icon: '🍀' },
        '魅力': { name: '魅力', icon: '🌺' },
        '心性': { name: '心性', icon: '💎' }
      };

      Object.entries(rawAttributes).forEach(([key, value]) => {
        const info = attributeMap[key as keyof typeof attributeMap];
        if (info && typeof value === 'number') {
          attributes[key] = {
            name: info.name,
            value: value,
            quality: getAttributeQuality(value),
            color: getAttributeColor(value)
          };
        }
      });
    }

    // 统一位置信息
    const location: CharacterLocation = {
      name: playerStatus?.位置?.描述 || '未知之地',
      description: playerStatus?.位置?.描述 || '未知之地',
      activity: '修行中',
      coordinates: playerStatus?.位置?.坐标 ? {
        x: playerStatus.位置.坐标.X,
        y: playerStatus.位置.坐标.Y
      } : undefined
    };

    // 统一修炼信息
    const cultivation: CharacterCultivation = {
      daoSystem: save.存档数据.三千大道 || null,
      equipment: save.存档数据.装备栏 || null
    };

    return {
      basicInfo,
      status,
      attributes,
      location,
      statusEffects: playerStatus?.状态效果 || [],
      cultivation
    };
  });

  const isDataLoaded = computed(() => characterData.value !== null);

  const refreshData = () => {
    // 触发数据重新计算
    // 注意：characterStore 当前没有 refreshActiveData 方法
    // characterStore.refreshActiveData?.();
  };

  return {
    characterData,
    isDataLoaded,
    refreshData
  };
}

/**
 * 辅助函数：格式化生命值数据
 */
function formatVital(vital: any): { current: number; max: number; percent: number } {
  if (!vital || typeof vital !== 'object') {
    return { current: 0, max: 0, percent: 0 };
  }
  const current = typeof vital.当前 === 'number' ? vital.当前 : 0;
  const max = typeof vital.最大 === 'number' ? vital.最大 : 0;
  const percent = max > 0 ? Math.min(100, Math.floor((current / max) * 100)) : 0;
  return { current, max, percent };
}

/**
 * 辅助函数：获取声望等级
 */
function getReputationLevel(value: number): string {
  if (value >= 10000) return '声名远扬';
  if (value >= 5000) return '小有名气';
  if (value >= 1000) return '略有声望';
  if (value >= 100) return '初露头角';
  return '籍籍无名';
}

/**
 * 辅助函数：获取属性品质
 */
function getAttributeQuality(value: number): string {
  if (value >= 15) return '极品';
  if (value >= 12) return '上品';
  if (value >= 9) return '中品';
  if (value >= 6) return '下品';
  return '废品';
}

/**
 * 辅助函数：获取属性颜色
 */
function getAttributeColor(value: number): string {
  if (value >= 15) return 'purple'; // 极品 - 紫色
  if (value >= 12) return 'orange'; // 上品 - 橙色
  if (value >= 9) return 'blue';    // 中品 - 蓝色
  if (value >= 6) return 'green';   // 下品 - 绿色
  return 'gray';                    // 废品 - 灰色
}

/**
 * 特定面板的数据组合函数
 */
export function useCharacterBasicData() {
  const { characterData } = useUnifiedCharacterData();
  
  return computed(() => characterData.value?.basicInfo || null);
}

export function useCharacterStatusData() {
  const { characterData } = useUnifiedCharacterData();
  
  return computed(() => characterData.value?.status || null);
}

export function useCharacterAttributesData() {
  const { characterData } = useUnifiedCharacterData();
  
  return computed(() => characterData.value?.attributes || {});
}

export function useCharacterLocationData() {
  const { characterData } = useUnifiedCharacterData();
  
  return computed(() => characterData.value?.location || null);
}

export function useCharacterCultivationData() {
  const { characterData } = useUnifiedCharacterData();

  return computed(() => characterData.value?.cultivation || { daoSystem: null, equipment: null });
}
