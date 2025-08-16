import { toast } from '../utils/toast';
import { API_BASE_URL } from './api';

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
    const response = await fetch(`${API_BASE_URL}${url}`, config);

    // 如果响应是空的 (例如 204 No Content), 直接返回
    if (response.status === 204) {
      return null as T;
    }

    const data = await response.json();

    if (!response.ok) {
      // 从后端错误信息中提取 detail
      const errorMessage = data.detail || '未知服务器错误';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    return data as T;
  } catch (error) {
    console.error('请求失败:', error);
    const errorMessage = error instanceof Error ? error.message : '网络连接失败，请检查天网灵脉。';
    // 只在不是已经处理过的错误时才显示toast
    if (!error || !(error instanceof Error) || !error.message.includes('未知服务器错误')) {
      // 避免重复显示相同的错误
    }
    throw new Error(errorMessage);
  }
}

// 便捷的HTTP方法
request.get = <T>(url: string, options: Omit<RequestInit, 'method'> = {}) => 
  request<T>(url, { ...options, method: 'GET' });

request.post = <T>(url: string, data?: any, options: Omit<RequestInit, 'method' | 'body'> = {}) => 
  request<T>(url, { 
    ...options, 
    method: 'POST', 
    body: data ? JSON.stringify(data) : undefined 
  });

request.put = <T>(url: string, data?: any, options: Omit<RequestInit, 'method' | 'body'> = {}) => 
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
  console.log('[验证令牌] 从localStorage获取到的token:', token ? `${token.substring(0, 20)}...` : 'null');
  
  if (!token) {
    console.log('[验证令牌] 未找到令牌，直接返回false');
    return false;
  }

  try {
    console.log('[验证令牌] 开始发送验证请求到 /api/v1/auth/me');
    const userData = await request<any>('/api/v1/auth/me', { method: 'GET' });
    console.log('[验证令牌] 验证成功，用户数据:', userData);
    
    if (userData && userData.user_name) {
        localStorage.setItem('username', userData.user_name);
        return true;
    }
    throw new Error('无效的用户数据');
  } catch (error) {
    console.error('[验证令牌] 验证失败，错误详情:', error);
    // 暂时注释掉自动清除令牌的逻辑，让我们先看看具体是什么错误
    // localStorage.removeItem('access_token');
    // localStorage.removeItem('username');
    console.warn('[验证令牌] 注意：暂时保留令牌，不自动清除');
    return false;
  }
}