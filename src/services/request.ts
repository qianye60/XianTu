import { toast } from '../utils/toast';
import type { World } from '@/types';
import { buildBackendUrl, isBackendConfigured } from './backendConfig';

// 后端API服务器地址

// 统一的请求函数
export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('access_token');
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  // 确保 Content-Type (如果需要)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.append('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    if (!isBackendConfigured()) {
      throw new Error('未配置后端服务器');
    }
    const fullUrl = buildBackendUrl(url);
    console.log(`[Request] 发起请求: ${config.method || 'GET'} ${fullUrl}`);
    const response = await fetch(fullUrl, config);

    // 如果响应是空的 (例如 204 No Content), 直接返回
    if (response.status === 204) {
      console.log(`[Request] 收到 204 No Content 响应 from ${fullUrl}`);
      return null as T;
    }

    // 先获取原始文本，以便在JSON解析失败时也能看到内容
    const rawText = await response.text();

    if (!response.ok) {
      console.error(`[Request] 请求失败! Status: ${response.status} ${response.statusText} from ${fullUrl}`);
      console.error('[Request] 原始响应体:', rawText);

      let errorMessage = `服务器错误 ${response.status}`;
      try {
        const errorJson = JSON.parse(rawText);
        errorMessage = errorJson.detail || JSON.stringify(errorJson);
      } catch (_e) {
        // 如果响应不是JSON，就使用原始文本的前100个字符作为错误信息
        errorMessage = rawText.substring(0, 100) || '无法解析服务器响应。';
      }

      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const data = JSON.parse(rawText);
      return data as T;
    } catch (_e) {
      console.error(`[Request] JSON 解析失败 from ${fullUrl}. 原始响应体:`, rawText);
      throw new Error('解析服务器响应失败，返回的不是有效的JSON格式。');
    }

  } catch (error) {
    console.error(`[Request] 网络层或未知错误 for url: ${url}`, error);
    const errorMessage = error instanceof Error ? error.message : '网络连接失败，请检查天网灵脉。';

    // 避免重复显示由 !response.ok 块已经处理过的错误
    if (!errorMessage.includes('服务器错误')) {
      toast.error(errorMessage);
    }

    throw error; // 重新抛出原始错误，以便调用者可以进一步处理
  }
}

// 便捷的HTTP方法
request.get = <T>(url: string, options: Omit<RequestInit, 'method'> = {}) =>
  request<T>(url, { ...options, method: 'GET' });

request.post = <T>(url: string, data?: unknown, options: Omit<RequestInit, 'method' | 'body'> = {}) =>
  request<T>(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined
  });

request.put = <T>(url: string, data?: unknown, options: Omit<RequestInit, 'method' | 'body'> = {}) =>
  request<T>(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined
  });

request.delete = <T>(url: string, options: Omit<RequestInit, 'method'> = {}) =>
  request<T>(url, { ...options, method: 'DELETE' });

// 检查并验证存储的Token
export async function verifyStoredToken(): Promise<boolean> {
  const token = localStorage.getItem('access_token');
  if (!isBackendConfigured()) {
    console.log('[验证令牌] 未配置后端，跳过验证');
    return false;
  }
  console.log('[验证令牌] 从localStorage获取到的token:', token ? `${token.substring(0, 20)}...` : 'null');

  if (!token) {
    console.log('[验证令牌] 未找到令牌，直接返回false');
    return false;
  }

  try {
    console.log('[验证令牌] 开始发送验证请求到 /api/v1/auth/me');
    const userData = await request<{ user_name?: string }>('/api/v1/auth/me', { method: 'GET' });
    console.log('[验证令牌] 验证成功，用户数据:', userData);

    if (userData && userData.user_name) {
        localStorage.setItem('username', userData.user_name);
        return true;
    }
    throw new Error('无效的用户数据');
  } catch (error) {
    console.error('[验证令牌] 验证失败，错误详情:', error);
    console.warn('[验证令牌] 注意：暂时保留令牌，不自动清除');
    return false;
  }
}

/**
 * 从服务器获取所有可用的世界列表
 */
export async function fetchWorlds(): Promise<World[]> {
  try {
    const worlds = await request.get<World[]>('/api/v1/worlds/');
    console.log('[API] 成功获取世界列表:', worlds);
    return worlds || [];
  } catch (error) {
    console.error('[API] 获取世界列表失败:', error);
    toast.error('获取世界列表失败，请检查网络或联系管理员。');
    return []; // 返回空数组以避免页面崩溃
  }
}

/**
 * 从服务器获取所有天资等级
 */
export async function fetchTalentTiers(): Promise<unknown[]> {
  try {
    const talentTiers = await request.get<unknown[]>('/api/v1/talent_tiers/');
    console.log('[API] 成功获取天资等级列表:', talentTiers);
    return talentTiers || [];
  } catch (error) {
    console.error('[API] 获取天资等级失败:', error);
    toast.error('获取天资等级失败，请检查网络或联系管理员。');
    return [];
  }
}

/**
 * 从服务器获取所有出身选项
 */
export async function fetchOrigins(): Promise<unknown[]> {
  try {
    const origins = await request.get<unknown[]>('/api/v1/origins/');
    console.log('[API] 成功获取出身列表:', origins);
    return origins || [];
  } catch (error) {
    console.error('[API] 获取出身列表失败:', error);
    toast.error('获取出身列表失败，请检查网络或联系管理员。');
    return [];
  }
}

/**
 * 从服务器获取所有灵根选项
 */
export async function fetchSpiritRoots(): Promise<unknown[]> {
  try {
    const spiritRoots = await request.get<unknown[]>('/api/v1/spirit_roots/');
    console.log('[API] 成功获取灵根列表:', spiritRoots);
    return spiritRoots || [];
  } catch (error) {
    console.error('[API] 获取灵根列表失败:', error);
    toast.error('获取灵根列表失败，请检查网络或联系管理员。');
    return [];
  }
}

/**
 * 从服务器获取所有天赋选项
 */
type RawTalent = { tier?: { id?: number } } & Record<string, unknown>;
export async function fetchTalents(): Promise<RawTalent[]> {
  try {
    const talents = await request.get<RawTalent[]>('/api/v1/talents/');
    console.log('[API] 成功获取天赋列表:', talents);

    // 转换后端数据结构，提取tier_id
    const convertedTalents = (talents || []).map((talent: RawTalent) => ({
      ...talent,
      tier_id: talent.tier?.id || null, // 从嵌套的tier对象中提取id
      // 保留原有的tier对象以备后用，但主要使用tier_id
    }));

    console.log('[API] 天赋数据转换完成，示例:', convertedTalents.slice(0, 2));
    return convertedTalents;
  } catch (error) {
    console.error('[API] 获取天赋列表失败:', error);
    toast.error('获取天赋列表失败，请检查网络或联系管理员。');
    return [];
  }
}

/**
 * 向后端提交角色创建信息
 */
export async function createCharacter(characterData: unknown): Promise<unknown> {
  try {
    console.log('[API] 正在向后端提交角色创建信息:', characterData);
    const result = await request.post<unknown>('/api/v1/characters/create', characterData);
    console.log('[API] 角色创建成功，后端返回:', result);
    return result;
  } catch (error) {
    console.error('[API] 角色创建失败:', error);
    toast.error('角色创建失败，请检查网络或联系管理员。');
    throw error;
  }
}

/**
 * 更新角色存档数据到云端
 */
export async function updateCharacterSave(charId: string, saveData: unknown): Promise<unknown> {
  try {
    console.log('[API] 正在向云端同步存档数据:', { charId, saveData });
    const result = await request.put<unknown>(`/api/v1/characters/${charId}/save`, saveData);
    console.log('[API] 存档同步成功，后端返回:', result);
    return result;
  } catch (error) {
    console.error('[API] 存档同步失败:', error);
    toast.error('存档同步失败，请检查网络或联系管理员。');
    throw error;
  }
}
