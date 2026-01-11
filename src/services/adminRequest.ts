import { buildBackendUrl, isBackendConfigured } from './backendConfig';

const normalizeMessage = (message: string): string => {
  const trimmed = (message || '').trim();
  return trimmed || '请求失败，请检查后端服务与权限。';
};

const extractFastApiDetail = (body: unknown): string | null => {
  if (body == null) return null;
  if (typeof body === 'string') return body;
  if (typeof body !== 'object') return String(body);
  const record = body as Record<string, unknown>;
  if (typeof record.detail === 'string') return record.detail;
  if (typeof record.message === 'string') return record.message;
  if (record.detail != null) return JSON.stringify(record.detail);
  return JSON.stringify(record);
};

function getAdminToken(): string | null {
  return localStorage.getItem('admin_access_token');
}

export async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!isBackendConfigured()) throw new Error('未配置后端服务器');

  const fullUrl = buildBackendUrl(path);
  if (!fullUrl) throw new Error('后端地址无效');

  const headers = new Headers(options.headers || {});
  const token = getAdminToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(fullUrl, { ...options, headers });
  if (res.status === 204) return null as T;

  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';
  const maybeJson = contentType.includes('application/json');
  const data = maybeJson && text ? (JSON.parse(text) as unknown) : (text as unknown);

  if (!res.ok) {
    const detail = extractFastApiDetail(data);
    throw new Error(normalizeMessage(detail || `服务器错误 ${res.status}`));
  }

  return data as T;
}

adminRequest.get = async <T>(path: string, options: Omit<RequestInit, 'method'> = {}) =>
  adminRequest<T>(path, { ...options, method: 'GET' });

adminRequest.post = async <T>(path: string, body?: unknown, options: Omit<RequestInit, 'method' | 'body'> = {}) =>
  adminRequest<T>(path, { ...options, method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

adminRequest.put = async <T>(path: string, body?: unknown, options: Omit<RequestInit, 'method' | 'body'> = {}) =>
  adminRequest<T>(path, { ...options, method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) });

adminRequest.delete = async <T>(path: string, options: Omit<RequestInit, 'method'> = {}) =>
  adminRequest<T>(path, { ...options, method: 'DELETE' });

