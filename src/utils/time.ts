import type { GameTime } from '@/types/game';

const DAYS_IN_MONTH = 30;
const MONTHS_IN_YEAR = 12;
const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;

/**
 * 标准化游戏时间，处理分钟、小时、天和月的进位。
 * @param time 要标准化的GameTime对象。
 * @returns 一个新的、已标准化的GameTime对象。
 */
export function normalizeGameTime(time: GameTime): GameTime {
  let { 年, 月, 日, 小时, 分钟 } = time;

  if (分钟 >= MINUTES_IN_HOUR) {
    小时 += Math.floor(分钟 / MINUTES_IN_HOUR);
    分钟 %= MINUTES_IN_HOUR;
  }

  if (小时 >= HOURS_IN_DAY) {
    日 += Math.floor(小时 / HOURS_IN_DAY);
    小时 %= HOURS_IN_DAY;
  }

  while (日 > DAYS_IN_MONTH) {
    月 += 1;
    日 -= DAYS_IN_MONTH;
  }

  if (月 > MONTHS_IN_YEAR) {
    年 += Math.floor((月 - 1) / MONTHS_IN_YEAR);
    月 = ((月 - 1) % MONTHS_IN_YEAR) + 1;
  }

  return { 年, 月, 日, 小时, 分钟 };
}