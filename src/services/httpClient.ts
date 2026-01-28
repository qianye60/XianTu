// XianTu by qianye60 | github.com/qianye60 | bilibili.com/477576651
import { toast } from '../utils/toast';
import { buildBackendUrl, isBackendConfigured } from './backendConfig';

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
  if (detail == null) return '服务端返回了未知错误。';
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

  // 确保 Content-Type（如果需要）
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

    // 如果响应是空的(例如 204 No Content), 直接返回
    if (response.status === 204) {
      return null as T;
    }

    // 先获取原始文本，以便在JSON解析失败时也能看到内容
    const rawText = await response.text();

    if (!response.ok) {
      let errorMessage = `服务端错误 ${response.status}`;
      try {
        const errorJson = JSON.parse(rawText) as unknown;
        errorMessage = extractErrorMessageFromBody(errorJson) || errorMessage;
      } catch (_e) {
        // 如果响应不是JSON，就使用原始文本的前100个字符作为错误信息
        errorMessage = rawText.substring(0, 100) || '无法解析服务端响应。';
      }

      errorMessage = normalizeRequestErrorMessage(errorMessage);

      // 登录相关的401错误不自动弹toast，让调用方处理
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
      return (rawText ? (JSON.parse(rawText) as T) : (null as T));
    } catch (_e) {
      throw new Error('解析服务端响应失败，返回的不是有效的JSON格式。');
    }
  } catch (error) {
    const errorMessage = normalizeRequestErrorMessage(
      error instanceof Error
        ? error.message
        : '网络连接失败或后端地址无效，请检查后端服务。'
    );

    // 避免重复显示由 !response.ok 块处理过的错误，以及登录相关错误
    if (!didToast && !shouldSkipAuthRedirect(url)) {
      toast.error(errorMessage);
    }

    throw new Error(errorMessage); // 重新抛出，避免上层看到英文错误
  }
}

// 便捷的 HTTP 方法
request.get = <T>(url: string, options: Omit<RequestInit, 'method'> = {}) =>
  request<T>(url, { ...options, method: 'GET' });

request.post = <T>(url: string, data?: unknown, options: Omit<RequestInit, 'method' | 'body'> = {}) =>
  request<T>(url, {
    ...options,
    method: 'POST',
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });

request.put = <T>(url: string, data?: unknown, options: Omit<RequestInit, 'method' | 'body'> = {}) =>
  request<T>(url, {
    ...options,
    method: 'PUT',
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });

request.delete = <T>(url: string, options: Omit<RequestInit, 'method'> = {}) =>
  request<T>(url, { ...options, method: 'DELETE' });


