import { request } from '@/services/request';

export type WorkshopItemType = 'settings' | 'prompts' | 'saves' | 'start_config';

export interface WorkshopItemOut {
  id: number;
  type: WorkshopItemType;
  title: string;
  description?: string | null;
  tags: string[];
  game_version?: string | null;
  data_version?: string | null;
  author_id: number;
  author_name: string;
  downloads: number;
  likes: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkshopItemsResponse {
  items: WorkshopItemOut[];
  total: number;
  page: number;
  page_size: number;
}

export interface WorkshopDownloadResponse {
  item: WorkshopItemOut;
  payload: unknown;
}

export interface CreateWorkshopItemInput {
  type: WorkshopItemType;
  title: string;
  description?: string;
  tags?: string[];
  payload: unknown;
  game_version?: string;
  data_version?: string;
}

export async function listWorkshopItems(params: {
  type?: WorkshopItemType | '';
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<WorkshopItemsResponse> {
  const search = new URLSearchParams();
  if (params.type) search.set('type', params.type);
  if (params.q) search.set('q', params.q);
  if (params.page) search.set('page', String(params.page));
  if (params.pageSize) search.set('page_size', String(params.pageSize));
  const qs = search.toString();
  return request.get<WorkshopItemsResponse>(`/api/v1/workshop/items${qs ? `?${qs}` : ''}`);
}

export async function createWorkshopItem(input: CreateWorkshopItemInput): Promise<WorkshopItemOut> {
  return request.post<WorkshopItemOut>(`/api/v1/workshop/items`, input);
}

export async function downloadWorkshopItem(itemId: number): Promise<WorkshopDownloadResponse> {
  return request.post<WorkshopDownloadResponse>(`/api/v1/workshop/items/${itemId}/download`, {});
}

export async function deleteWorkshopItem(itemId: number): Promise<{ message: string }> {
  return request.delete<{ message: string }>(`/api/v1/workshop/items/${itemId}`);
}

