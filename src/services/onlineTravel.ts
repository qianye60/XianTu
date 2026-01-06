import { request } from './request';

export type TravelProfile = {
  travel_points: number;
  signed_in: boolean;
  message: string;
};

export type TravelStartResponse = {
  session_id: number;
  target_world_instance_id: number;
  entry_map_id: number;
  entry_poi_id: number;
  return_anchor: Record<string, unknown>;
  travel_points_left: number;
};

export type MapGraphResponse = {
  map_id: number;
  map_key: string;
  viewer_poi_id?: number | null;
  pois: Array<{
    id: number;
    poi_key: string;
    x: number;
    y: number;
    type: string;
    tags?: unknown;
    state?: unknown;
  }>;
  edges: Array<{
    id: number;
    from_poi_id: number;
    to_poi_id: number;
    edge_type: string;
    travel_cost: number;
    risk: number;
    one_way: boolean;
  }>;
};

export type WorldInstanceSummary = {
  world_instance_id: number;
  owner_player_id: number;
  owner_char_id?: string | null;
  visibility_mode: string;
  revision: number;
  maps: Array<{ map_id: number; map_key: string; revision: number }>;
};

export type InvasionReportOut = {
  id: number;
  world_instance_id: number;
  created_at: string;
  unread: boolean;
  summary?: unknown;
};

export async function getTravelProfile(): Promise<TravelProfile> {
  return request.get<TravelProfile>('/api/v1/travel/profile');
}

export async function signinTravel(): Promise<TravelProfile> {
  return request.post<TravelProfile>('/api/v1/travel/signin', {});
}

export async function startTravel(target_username: string, invite_code?: string): Promise<TravelStartResponse> {
  return request.post<TravelStartResponse>('/api/v1/travel/start', { target_username, invite_code });
}

export async function endTravel(session_id: number): Promise<{ success: boolean; message: string }> {
  return request.post<{ success: boolean; message: string }>('/api/v1/travel/end', { session_id });
}

export async function getMyWorldInstance(): Promise<WorldInstanceSummary> {
  return request.get<WorldInstanceSummary>('/api/v1/worlds/instance/me');
}

export async function updateMyWorldVisibility(visibility_mode: 'public' | 'hidden' | 'locked'): Promise<WorldInstanceSummary> {
  return request.post<WorldInstanceSummary>('/api/v1/worlds/instance/me/visibility', { visibility_mode });
}

export async function getMapGraph(
  world_instance_id: number,
  map_id: number,
  session_id?: number
): Promise<MapGraphResponse> {
  const qs = session_id ? `?session_id=${encodeURIComponent(String(session_id))}` : '';
  return request.get<MapGraphResponse>(`/api/v1/worlds/instance/${world_instance_id}/map/${map_id}/graph${qs}`);
}

export async function moveInWorld(
  world_instance_id: number,
  to_poi_id: number,
  session_id?: number
): Promise<{ success: boolean; message: string; new_map_id?: number; new_poi_id?: number }> {
  return request.post(`/api/v1/worlds/instance/${world_instance_id}/action`, {
    session_id,
    action_type: 'move',
    intent: { to_poi_id },
  });
}

export async function getMyInvasionReports(): Promise<InvasionReportOut[]> {
  return request.get<InvasionReportOut[]>('/api/v1/invasion/reports/me');
}

