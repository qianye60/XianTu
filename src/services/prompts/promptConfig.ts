/**
 * 提示词配置服务
 * 支持从后端获取提示词配置，避免硬编码
 * 优先级：用户自定义 > 远程配置 > 本地默认
 */

import { request } from './request';
import { isBackendConfigured } from './backendConfig';

// 远程提示词配置接口
export interface RemotePromptConfig {
  prompts: Record<string, {
    content: string;
    enabled: boolean;
    description?: string;
  }>;
  version: string;
  lastUpdated?: string;
}

// 缓存远程配置
let cachedRemoteConfig: RemotePromptConfig | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

/**
 * 从后端获取远程提示词配置
 * @returns 远程配置或 null（如果获取失败）
 */
export async function fetchRemotePromptConfig(): Promise<RemotePromptConfig | null> {
  if (!isBackendConfigured()) {
    console.log('[提示词配置] 未配置后端，跳过远程配置获取');
    return null;
  }

  // 检查缓存是否有效
  const now = Date.now();
  if (cachedRemoteConfig && (now - lastFetchTime) < CACHE_DURATION) {
    console.log('[提示词配置] 使用缓存的远程配置');
    return cachedRemoteConfig;
  }

  try {
    const config = await request<RemotePromptConfig>('/api/v1/prompts/config', { method: 'GET' });
    cachedRemoteConfig = config;
    lastFetchTime = now;
    console.log('[提示词配置] 成功获取远程配置:', config.version);
    return config;
  } catch (error) {
    console.warn('[提示词配置] 获取远程配置失败，使用本地默认值:', error);
    return null;
  }
}

/**
 * 获取指定 key 的提示词内容（优先使用远程配置）
 * @param key 提示词 key
 * @param defaultValue 默认值
 * @returns 提示词内容
 */
export function getPromptWithRemoteOverride(key: string, defaultValue: string): string {
  // 优先使用远程配置
  if (cachedRemoteConfig?.prompts[key]) {
    const remotePrompt = cachedRemoteConfig.prompts[key];
    if (remotePrompt.enabled !== false) {
      return remotePrompt.content;
    }
  }

  // 回退到默认值
  return defaultValue;
}

/**
 * 检查指定 key 的提示词是否启用
 * @param key 提示词 key
 * @returns 是否启用
 */
export function isPromptEnabled(key: string): boolean {
  // 优先使用远程配置
  if (cachedRemoteConfig?.prompts[key]) {
    return cachedRemoteConfig.prompts[key].enabled !== false;
  }

  // 默认启用
  return true;
}

/**
 * 获取所有远程提示词配置
 * @returns 远程配置或空对象
 */
export function getAllRemotePrompts(): Record<string, { content: string; enabled: boolean }> {
  return cachedRemoteConfig?.prompts ?? {};
}

/**
 * 清除缓存的远程配置
 */
export function clearRemotePromptCache(): void {
  cachedRemoteConfig = null;
  lastFetchTime = 0;
  console.log('[提示词配置] 已清除远程配置缓存');
}

/**
 * 获取远程配置版本
 * @returns 版本号或 null
 */
export function getRemoteConfigVersion(): string | null {
  return cachedRemoteConfig?.version ?? null;
}
