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
    // 从变量中获取当前角色名
    const vars = await helper.getVariables({ type: 'global' });
    return (vars['persona.name'] as string) || (vars['name'] as string) || null;
  } catch (error) {
    console.warn('[Tavern] 无法获取角色名:', error);
    return null;
  }
}

/**
 * 清除所有角色数据 - 清空酒馆变量
 */
export async function clearAllCharacterData(): Promise<void> {
  const helper = getTavernHelper();
  if (!helper) {
    console.warn('[Tavern] 酒馆助手不可用，跳过清理');
    return;
  }

  try {
    // 使用 insertOrAssignVariables 替换为空对象来清空变量
    await helper.insertOrAssignVariables({}, { type: 'global' });
    console.log('[Tavern] 已清除所有酒馆变量');
  } catch (error) {
    console.error('[Tavern] 清除酒馆变量失败:', error);
    throw error;
  }
}