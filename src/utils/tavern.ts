import type { TavernHelper } from '@/types';

/**
 * 获取酒馆助手
 * 根据文档，应该从 window.TavernHelper 获取
 */
export function getTavernHelper(): TavernHelper | null {
  if (typeof window !== 'undefined' && (window as any).TavernHelper) {
    return (window as any).TavernHelper as TavernHelper;
  }
  return null;
}

export async function getCurrentCharacterName(): Promise<string | null> {
  const helper = getTavernHelper();
  if (!helper) {
    return null;
  }

  try {
    const vars = await helper.getVariables({ type: 'global' });
    return (vars['persona.name'] as string) || (vars['name'] as string) || null;
  } catch (error) {
    console.warn('[Tavern] 无法获取角色名:', error);
    return null;
  }
}

export async function clearAllCharacterData(): Promise<void> {
  const helper = getTavernHelper();
  if (!helper) {
    console.warn('[Tavern] 酒馆助手不可用，跳过清理');
    return;
  }

  try {
    await helper.insertOrAssignVariables({}, { type: 'global' });
  } catch (error) {
    console.error('[Tavern] 清除酒馆变量失败:', error);
    throw error;
  }
}