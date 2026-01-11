import { aiService } from '@/services/aiService';
import type { TavernHelper } from '@/types';

function shouldDebugTavern(): boolean {
  try {
    return localStorage.getItem('dad_debug_tavern') === '1';
  } catch {
    return false;
  }
}

/**
 * 递归向上查找 TavernHelper，兼容多层 iframe 嵌套
 * 最多查找 5 层，防止无限循环
 */
function getNativeTavernHelper(): any | null {
  if (typeof window === 'undefined') return null;

  const debug = shouldDebugTavern();
  if (debug) {
    console.log('[Tavern检测] 开始查找 TavernHelper...');
    console.log('[Tavern检测] 当前window.location:', window.location.href);
  }

  // 先检查当前 window
  if ((window as any).TavernHelper) {
    if (debug) console.log('[Tavern检测] ✅ 在当前window找到TavernHelper');
    return (window as any).TavernHelper;
  }

  try {
    // 尝试直接访问 top（最顶层窗口）
    if (debug) console.log('[Tavern检测] 尝试访问window.top...');
    if (window.top && window.top !== window) {
      if (debug) console.log('[Tavern检测] window.top可访问，检查TavernHelper...');
      if ((window.top as any).TavernHelper) {
        if (debug) console.log('[Tavern检测] ✅ 在window.top找到TavernHelper');
        return (window.top as any).TavernHelper;
      }
      if (debug) console.log('[Tavern检测] window.top没有TavernHelper');
    }
  } catch (e) {
    if (debug) console.log('[Tavern检测] ⚠️ 访问window.top失败（跨域）:', e);
  }

  // 逐层向上查找，最多 5 层
  let currentWindow: Window = window;
  for (let i = 0; i < 5; i++) {
    try {
      if (currentWindow.parent && currentWindow.parent !== currentWindow) {
        if (debug) console.log(`[Tavern检测] 检查第${i + 1}层parent...`);
        if ((currentWindow.parent as any).TavernHelper) {
          if (debug) console.log(`[Tavern检测] ✅ 在第${i + 1}层parent找到TavernHelper`);
          return (currentWindow.parent as any).TavernHelper;
        }
        if (debug) console.log(`[Tavern检测] 第${i + 1}层parent没有TavernHelper，继续向上`);
        currentWindow = currentWindow.parent;
      } else {
        if (debug) console.log(`[Tavern检测] 已到达顶层（第${i + 1}层）`);
        break;
      }
    } catch (e) {
      if (debug) console.log(`[Tavern检测] ⚠️ 访问第${i + 1}层parent失败（跨域）:`, e);
      break;
    }
  }

  if (debug) console.log('[Tavern检测] ❌ 未找到TavernHelper');
  return null;
}

export function isTavernEnv(): boolean {
  return !!getNativeTavernHelper();
}

/**
 * 获取酒馆助手（兼容包装器）
 * 现在返回一个兼容的包装器，支持酒馆和自定义API两种模式
 */
export function getTavernHelper(): TavernHelper | null {
  // 返回一个兼容的包装器，内部调用 aiService
  return {
    generate: async (options: any) => {
      return await aiService.generate(options);
    },
    generateRaw: async (options: any) => {
      return await aiService.generateRaw(options);
    },
    getVariables: async (options: any) => {
      // 如果是酒馆模式，调用真实的 TavernHelper
      const nativeHelper = getNativeTavernHelper();
      if (nativeHelper) {
        return await nativeHelper.getVariables(options);
      }
      // 自定义API模式不支持变量系统
      return {};
    },
    insertOrAssignVariables: async (variables: any, options: any) => {
      // 如果是酒馆模式，调用真实的 TavernHelper
      const nativeHelper = getNativeTavernHelper();
      if (nativeHelper) {
        return await nativeHelper.insertOrAssignVariables(variables, options);
      }
      // 自定义API模式不支持变量系统
      return;
    }
  } as TavernHelper;
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
