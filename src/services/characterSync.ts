import { request } from './request';
import { toast } from '../utils/toast';
import { getTavernHelper } from '../utils/tavern';
import type { Character } from '../types';

/**
 * 定义需要同步到后端的角色核心属性清单。
 * 只有在此清单中的属性变更，才会触发后端API调用。
 */
const CORE_CHARACTER_ATTRIBUTES = new Set([
  'realm',      // 境界
  'reputation', // 声望
  'hp',
  'hp_max',
  'mana',
  'mana_max',
  'spirit',
  'spirit_max',
  'lifespan',   // 寿命
  'lifespan_max',
  // 基础六维也应被视为核心
  'root_bone',
  'spirituality',
  'comprehension',
  'fortune',
  'charm',
  'temperament',
]);

/**
 * 将单个核心属性的变更同步到后端。
 * @param characterId - 角色的唯一ID。
 * @param attributeKey - 要更新的属性名。
 * @param value - 新的属性值。
 */
export async function syncCharacterAttribute(
  characterId: number,
  attributeKey: string,
  value: any
): Promise<void> {
  // 1. 检查是否为核心属性
  if (!CORE_CHARACTER_ATTRIBUTES.has(attributeKey)) {
    return;
  }

  // 2. 获取酒馆助手中枢和授权令牌
  const helper = getTavernHelper();
  // 注意：此处的 token 路径是基于对通用扩展的猜测，可能需要根据实际情况调整
  const token = helper.settings.token;

  if (!token) {
    toast.error('同步失败：无法获取授权令牌，请检查扩展设置。');
    console.error('[Sync Failed] Authorization token is missing.');
    return;
  }

  // 3. 执行带令牌的后端请求
  try {
    // 根据用户反馈，使用 PUT 方法，并添加 Authorization 头部
    await request(`/api/v1/characters/${characterId}`, {
      method: 'PUT', // 使用 PUT 动词
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // 携带令牌
      },
      body: JSON.stringify({
        // 后端接口可能需要一个明确的结构
        updates: {
          [attributeKey]: value
        }
      }),
    });
    console.log(`[Sync Success] Character ${characterId}: ${attributeKey} -> ${value}`);
    toast.info(`核心命格 [${attributeKey}] 已同步云端。`);
  } catch (error) {
    console.error(`[Sync Failed] Failed to sync attribute ${attributeKey}:`, error);
    toast.error(`命格 [${attributeKey}] 同步云端失败！`);
  }
}
