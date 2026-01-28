import { request } from '@/services/httpClient';
import { isBackendConfigured } from '@/services/backendConfig';

// 检查并验证存储的 Token
export async function verifyStoredToken(): Promise<boolean> {
  const token = localStorage.getItem('access_token');
  if (!isBackendConfigured()) return false;
  if (!token) return false;

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


