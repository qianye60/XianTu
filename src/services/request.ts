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
    const fullUrl = `${API_BASE_URL}${url}`;
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
      } catch (e) {
        // 如果响应不是JSON，就使用原始文本的前100个字符作为错误信息
        errorMessage = rawText.substring(0, 100) || '无法解析服务器响应。';
      }
      
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const data = JSON.parse(rawText);
      return data as T;
    } catch (e) {
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