import { request } from '@/services/httpClient';
import type { World, TalentTier, Origin, SpiritRoot, Talent } from '@/types';

/**
 * 从服务端获取所有可用的世界列表
 */
export async function fetchWorlds(): Promise<World[]> {
  try {
    const response = await request.get<{ items: World[]; total: number }>('/api/v1/worlds/');
    return response?.items || [];
  } catch (_error) {
    return [];
  }
}

/**
 * 从服务端获取所有天资等级
 */
export async function fetchTalentTiers(): Promise<TalentTier[]> {
  try {
    const response = await request.get<{ items: TalentTier[]; total: number }>('/api/v1/talent_tiers/');
    return response?.items || [];
  } catch (_error) {
    return [];
  }
}

/**
 * 从服务端获取所有出身选项
 */
export async function fetchOrigins(): Promise<Origin[]> {
  try {
    const response = await request.get<{ items: Origin[]; total: number }>('/api/v1/origins/');
    return response?.items || [];
  } catch (_error) {
    return [];
  }
}

/**
 * 从服务端获取所有灵根选项
 */
export async function fetchSpiritRoots(): Promise<SpiritRoot[]> {
  try {
    const response = await request.get<{ items: SpiritRoot[]; total: number }>('/api/v1/spirit_roots/');
    return response?.items || [];
  } catch (_error) {
    return [];
  }
}

/**
 * 从服务端获取所有天赋选项
 */
type RawTalent = Partial<Talent> & { tier?: { id?: number }; tier_id?: number | null };
export async function fetchTalents(): Promise<Talent[]> {
  try {
    const response = await request.get<{ items: RawTalent[]; total: number }>('/api/v1/talents/');
    const talents = response?.items || [];

    // 转换后端数据结构，提取 tier_id
    const convertedTalents: Talent[] = talents.map((talent: RawTalent) => ({
      id: talent.id ?? 0,
      name: talent.name ?? '',
      description: talent.description,
      talent_cost: talent.talent_cost ?? 0,
      rarity: talent.rarity ?? 0,
      tier_id: talent.tier_id ?? talent.tier?.id ?? null,
      tier: talent.tier as Talent['tier'],
      source: talent.source,
      effects: talent.effects,
    }));

    return convertedTalents;
  } catch (_error) {
    return [];
  }
}


