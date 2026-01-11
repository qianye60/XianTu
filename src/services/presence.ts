import { request } from './request';
import { buildBackendUrl, isBackendConfigured } from './backendConfig';

export type PresenceStatusResponse = {
  user_name: string;
  is_online: boolean;
  last_heartbeat_at: string | null;
  server_time: string;
};

export type PresenceHeartbeatResponse = {
  user_name: string;
  server_time: string;
  last_heartbeat_at: string | null;
};

export async function heartbeatPresence(): Promise<PresenceHeartbeatResponse> {
  return request.post<PresenceHeartbeatResponse>('/api/v1/presence/heartbeat', {});
}

// 用于轮询心跳：不弹 toast，避免刷屏
export async function heartbeatPresenceSilent(): Promise<void> {
  if (!isBackendConfigured()) return;
  const token = localStorage.getItem('access_token');
  if (!token) return;
  const fullUrl = buildBackendUrl('/api/v1/presence/heartbeat');
  if (!fullUrl) return;
  try {
    await fetch(fullUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
  } catch {
    // ignore
  }
}

export async function getMyPresence(): Promise<PresenceStatusResponse> {
  return request.get<PresenceStatusResponse>('/api/v1/presence/me');
}

export async function getPresenceStatus(username: string): Promise<PresenceStatusResponse> {
  return request.get<PresenceStatusResponse>(`/api/v1/presence/status/${encodeURIComponent(username)}`);
}
