import { request } from '@/services/httpClient';

/**
 * 向后端提交角色创建信息
 */
export async function createCharacter(characterData: unknown): Promise<unknown> {
  return await request.post<unknown>('/api/v1/characters/create', characterData);
}

/**
 * 更新角色存档数据到云端
 */
export async function updateCharacterSave(charId: string, saveData: unknown): Promise<unknown> {
  return await request.put<unknown>(`/api/v1/characters/${charId}/save`, saveData);
}

/**
 * 获取角色详情（联机模式：用于拉取云端权威存档）
 */
export async function fetchCharacterProfile(charId: string): Promise<unknown> {
  return await request.get<unknown>(`/api/v1/characters/${charId}`);
}


