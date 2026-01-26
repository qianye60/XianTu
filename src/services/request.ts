import { toast } from '../utils/toast';
import type { World, TalentTier, Origin, SpiritRoot, Talent } from '@/types';
import { buildBackendUrl, isBackendConfigured } from './backendConfig';

// 后端API服务器地址

const normalizeRequestErrorMessage = (message: string): string => {
  const trimmed = message.trim();
  if (!trimmed) {
    return '网络连接失败或后端地址无效，请检查后端服务。';
  }
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('fetch failed') ||
    lower.includes('load failed')
  ) {
    return '网络连接失败或后端地址无效，请检查后端服务。';
  }
  if (lower.includes('invalid url')) {
    return '后端地址无效，请检查配置后重试。';
  }
  return trimmed;
};

const formatFastApiErrorDetail = (detail: unknown): string => {
  if (typeof detail === 'string') return detail;
  if (detail == null) return '服务器返回了未知错误。';
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (!item || typeof item !== 'object') return String(item);
        const record = item as Record<string, unknown>;
        const msg = typeof record.msg === 'string' ? record.msg : undefined;
        const loc = Array.isArray(record.loc)
          ? record.loc.filter((x) => typeof x === 'string' || typeof x === 'number')
          : undefined;
        const locStr = loc?.length ? ` (${loc.join('.')})` : '';
        return msg ? `${msg}${locStr}` : JSON.stringify(record);
      })
      .filter(Boolean);
    return parts.length ? parts.join('；') : '请求参数不合法。';
  }
  if (typeof detail === 'object') return JSON.stringify(detail);
  return String(detail);
};

const extractErrorMessageFromBody = (body: unknown): string | null => {
  if (body == null) return null;
  if (typeof body === 'string') return body;
  if (typeof body !== 'object') return String(body);
  const record = body as Record<string, unknown>;
  if ('detail' in record) return formatFastApiErrorDetail(record.detail);
  if (typeof record.message === 'string') return record.message;
  return JSON.stringify(record);
};

const shouldSkipAuthRedirect = (path: string): boolean =>
  path.includes('/api/v1/auth/token') ||
  path.includes('/api/v1/auth/register') ||
  path.includes('/api/v1/auth/me') ||
  path.includes('/api/v1/admin/token');

const redirectToLogin = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('username');
  void import('@/router').then(({ default: router }) => {
    if (router.currentRoute.value?.path !== '/login') {
      void router.push('/login');
    }
  });
};

// 统一的请求函数
export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('access_token');
  const headers = new Headers(options.headers || {});
  let didToast = false;

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
    const response = await fetch(fullUrl, config);

    // 如果响应是空的 (例如 204 No Content), 直接返回
    if (response.status === 204) {
      return null as T;
    }

    // 先获取原始文本，以便在JSON解析失败时也能看到内容
    const rawText = await response.text();

    if (!response.ok) {
      let errorMessage = `服务器错误 ${response.status}`;
      try {
        const errorJson = JSON.parse(rawText) as unknown;
        errorMessage = extractErrorMessageFromBody(errorJson) || errorMessage;
      } catch (_e) {
        // 如果响应不是JSON，就使用原始文本的前100个字符作为错误信息
        errorMessage = rawText.substring(0, 100) || '无法解析服务器响应。';
      }

      errorMessage = normalizeRequestErrorMessage(errorMessage);

      // 登录相关的 401 错误不自动弹 toast，让调用方处理
      if (shouldSkipAuthRedirect(url)) {
        throw new Error(errorMessage);
      }

      if (response.status === 401) {
        errorMessage = '登录已失效或未登录，请先登录后再试。';
        toast.info(errorMessage);
        didToast = true;
        redirectToLogin();
      } else {
        toast.error(errorMessage);
        didToast = true;
      }
      throw new Error(errorMessage);
    }

    try {
      const data = JSON.parse(rawText);
      return data as T;
    } catch (_e) {
      throw new Error('解析服务器响应失败，返回的不是有效的JSON格式。');
    }

  } catch (error) {
    const errorMessage = normalizeRequestErrorMessage(
      error instanceof Error ? error.message : '网络连接失败或后端地址无效，请检查后端服务。'
    );

    // 避免重复显示由 !response.ok 块已经处理过的错误，以及登录相关错误
    if (!didToast && !shouldSkipAuthRedirect(url)) {
      toast.error(errorMessage);
    }

    throw new Error(errorMessage); // 重新抛出，避免上层看到英文错误
  }
}

// 便捷的HTTP方法
request.get = <T>(url: string, options: Omit<RequestInit, 'method'> = {}) =>
  request<T>(url, { ...options, method: 'GET' });

request.post = <T>(url: string, data?: unknown, options: Omit<RequestInit, 'method' | 'body'> = {}) =>
  request<T>(url, {
    ...options,
    method: 'POST',
    body: data !== undefined ? JSON.stringify(data) : undefined
  });

request.put = <T>(url: string, data?: unknown, options: Omit<RequestInit, 'method' | 'body'> = {}) =>
  request<T>(url, {
    ...options,
    method: 'PUT',
    body: data !== undefined ? JSON.stringify(data) : undefined
  });

request.delete = <T>(url: string, options: Omit<RequestInit, 'method'> = {}) =>
  request<T>(url, { ...options, method: 'DELETE' });

// 检查并验证存储的Token
export async function verifyStoredToken(): Promise<boolean> {
  const token = localStorage.getItem('access_token');
  if (!isBackendConfigured()) {
    return false;
  }

  if (!token) {
    return false;
  }

  try {
    const userData = await request<{ user_name?: string }>('/api/v1/auth/me', { method: 'GET' });

    if (userData && userData.user_name) {
        localStorage.setItem('username', userData.user_name);
        return true;
    }
    throw new Error('无效的用户数据');
  } catch (_error) {
    return false;
  }
}

/**
 * 从服务器获取所有可用的世界列表
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
 * 从服务器获取所有天资等级
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
 * 从服务器获取所有出身选项
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
 * 从服务器获取所有灵根选项
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
 * 从服务器获取所有天赋选项
 */
type RawTalent = Partial<Talent> & { tier?: { id?: number }; tier_id?: number | null };
export async function fetchTalents(): Promise<Talent[]> {
  try {
    const response = await request.get<{ items: RawTalent[]; total: number }>('/api/v1/talents/');
    const talents = response?.items || [];

    // 转换后端数据结构，提取tier_id
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

/**
 * 向后端提交角色创建信息
 */
export async function createCharacter(characterData: unknown): Promise<unknown> {
  const result = await request.post<unknown>('/api/v1/characters/create', characterData);
  return result;
}

/**
 * 更新角色存档数据到云端
 */
export async function updateCharacterSave(charId: string, saveData: unknown): Promise<unknown> {
  const result = await request.put<unknown>(`/api/v1/characters/${charId}/save`, saveData);
  return result;
}

/**
 * 获取角色详情（联机模式：用于拉取云端权威存档）
 */
export async function fetchCharacterProfile(charId: string): Promise<unknown> {
  const result = await request.get<unknown>(`/api/v1/characters/${charId}`);
  return result;
}
