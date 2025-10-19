import type { GameTime } from '@/types/game';

/**
 * 格式化游戏时间为字符串
 */
export function formatGameTimeString(gameTime: GameTime | undefined): string {
  if (!gameTime) return '【未知时间】';

  const minutes = gameTime.分钟 ?? 0;
  return `【仙道${gameTime.年}年${gameTime.月}月${gameTime.日}日 ${String(gameTime.小时).padStart(2, '0')}:${String(minutes).padStart(2, '0')}】`;
}