

export interface GameTime {
  年: number;
  月: number;
  日: number;
  小时?: number;
  分钟?: number;
}

/**
 * 根据出生日期和当前时间计算年龄
 * @param birthTime 出生日期
 * @param currentTime 当前时间
 * @returns 当前年龄（向下取整）
 */
export function calculateAgeFromBirthdate(birthTime: GameTime, currentTime: GameTime): number {
  // 计算年龄差
  let age = currentTime.年 - birthTime.年;

  // 如果当前月日还没到生日月日，说明还没满周岁
  if (currentTime.月 < birthTime.月 ||
      (currentTime.月 === birthTime.月 && currentTime.日 < birthTime.日)) {
    age--;
  }

  return Math.max(0, age); // 确保年龄不为负
}

/**
 * 根据当前年龄和当前时间推算出生日期
 * @param currentAge 当前年龄
 * @param currentTime 当前时间
 * @returns 出生日期
 */
export function calculateBirthdateFromAge(currentAge: number, currentTime: GameTime): GameTime {
  return {
    年: currentTime.年 - currentAge,
    月: currentTime.月,
    日: currentTime.日,
    小时: 0,
    分钟: 0
  };
}

/**
 * 从SaveData中计算当前年龄（玩家）
 * 注意：不再自动更新 寿命.当前，年龄应该通过出生日期实时计算
 * @param saveData 存档数据
 * @returns 计算得到的年龄
 */
export function updateLifespanFromGameTime(saveData: any): number {
  const currentTime = saveData?.元数据?.时间 ?? { 年: 1, 月: 1, 日: 1, 小时: 8, 分钟: 0 };
  const identity = saveData?.角色?.身份 ?? null;

  if (!identity || typeof identity !== 'object') return 0;

  // 如果没有出生日期，按默认年龄18推算（只补全出生日期，不写“年龄”冗余字段）
  if (!identity.出生日期) {
    const defaultAge = 18;
    identity.出生日期 = calculateBirthdateFromAge(defaultAge, currentTime);
    return defaultAge;
  }

  // 根据出生日期计算当前年龄
  return calculateAgeFromBirthdate(identity.出生日期, currentTime);
}

/**
 * 从NPC数据中自动计算并更新当前年龄
 * @param npcData NPC数据对象
 * @param globalGameTime 当前游戏时间
 * @returns NPC当前年龄
 */
export function updateNpcLifespanFromGameTime(npcData: any, globalGameTime: GameTime): number {
  const currentTime = globalGameTime || { 年: 1, 月: 1, 日: 1, 小时: 8, 分钟: 0 };

  const baseInfo = npcData;

  // 如果没有出生日期，根据当前年龄推算出生日期
  if (!baseInfo.出生日期) {
    const currentAge = baseInfo.年龄 || 18;
    const birthdate = calculateBirthdateFromAge(currentAge, currentTime);

    baseInfo.出生日期 = birthdate;

    
    return currentAge;
  }

  // 根据出生日期计算当前年龄
  const birthdate = baseInfo.出生日期;
  const calculatedAge = calculateAgeFromBirthdate(birthdate, currentTime);

  // 更新年龄字段（如果存在）
  if (baseInfo.年龄 !== undefined) baseInfo.年龄 = calculatedAge;

  return calculatedAge;
}
