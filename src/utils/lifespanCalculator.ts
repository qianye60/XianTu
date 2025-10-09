/**
 * 寿命计算工具
 * 使用出生日期自动计算当前年龄
 */

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
  const currentTime = saveData.游戏时间 || { 年: 1, 月: 1, 日: 1, 小时: 8, 分钟: 0 };

  // 如果没有出生日期，根据当前年龄推算出生日期
  if (!saveData.角色基础信息?.出生日期) {
    const currentAge = saveData.角色基础信息?.年龄 || 18;
    const birthdate = calculateBirthdateFromAge(currentAge, currentTime);

    // 保存出生日期到角色基础信息
    if (!saveData.角色基础信息) {
      saveData.角色基础信息 = {};
    }
    saveData.角色基础信息.出生日期 = birthdate;

    console.log('[寿命计算] 初始化玩家出生日期:', birthdate, '当前年龄:', currentAge);
    return currentAge;
  }

  // 根据出生日期计算当前年龄
  const birthdate = saveData.角色基础信息.出生日期;
  const calculatedAge = calculateAgeFromBirthdate(birthdate, currentTime);

  // 只更新基础信息中的年龄（用于显示），不再更新寿命.当前
  if (saveData.角色基础信息) {
    saveData.角色基础信息.年龄 = calculatedAge;
  }

  return calculatedAge;
}

/**
 * 从NPC数据中自动计算并更新当前年龄
 * @param npcData NPC数据对象
 * @param globalGameTime 当前游戏时间
 * @returns NPC当前年龄
 */
export function updateNpcLifespanFromGameTime(npcData: any, globalGameTime: GameTime): number {
  const currentTime = globalGameTime || { 年: 1, 月: 1, 日: 1, 小时: 8, 分钟: 0 };

  // NPC可能在不同层级存储信息
  const statusSource = npcData.玩家角色状态 || npcData.角色状态 || npcData;
  const baseInfo = npcData.角色基础信息 || npcData;

  // 如果NPC已死亡，返回死亡时年龄
  if (statusSource.已死亡) {
    return statusSource.寿命?.当前 || baseInfo.年龄 || 0;
  }

  // 如果没有出生日期，根据当前年龄推算出生日期
  if (!baseInfo.出生日期) {
    const currentAge = baseInfo.年龄 || statusSource.寿命?.当前 || 18;
    const birthdate = calculateBirthdateFromAge(currentAge, currentTime);

    baseInfo.出生日期 = birthdate;

    console.log(`[寿命计算] 初始化NPC出生日期 [${baseInfo.名字 || '未知'}]:`, birthdate, '当前年龄:', currentAge);
    return currentAge;
  }

  // 根据出生日期计算当前年龄
  const birthdate = baseInfo.出生日期;
  const calculatedAge = calculateAgeFromBirthdate(birthdate, currentTime);

  // 更新年龄到各个位置
  if (baseInfo.年龄 !== undefined) {
    baseInfo.年龄 = calculatedAge;
  }
  if (statusSource.寿命) {
    statusSource.寿命.当前 = calculatedAge;
  }

  return calculatedAge;
}
