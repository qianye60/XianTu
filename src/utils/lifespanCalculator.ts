/**
 * 寿命计算工具
 * 根据开局年龄、开局时间和当前游戏时间自动计算当前年龄
 */

export interface GameTime {
  年: number;
  月: number;
  日: number;
  小时?: number;
  分钟?: number;
}

export interface LifespanCalculationParams {
  初始年龄: number;           // 开局时的年龄，如18岁
  开局时间: GameTime;        // 开局时的游戏时间，如{年:1000, 月:1, 日:1}
  当前时间: GameTime;        // 当前的游戏时间，如{年:1003, 月:1, 日:1}
}

/**
 * 计算当前年龄
 * @param params 计算参数
 * @returns 当前年龄（向下取整）
 */
export function calculateCurrentAge(params: LifespanCalculationParams): number {
  const { 初始年龄, 开局时间, 当前时间 } = params;

  // 计算经过了多少年
  let 经过年数 = 当前时间.年 - 开局时间.年;

  // 如果当前月日还没到开局月日，说明还没满一年
  if (当前时间.月 < 开局时间.月 ||
      (当前时间.月 === 开局时间.月 && 当前时间.日 < 开局时间.日)) {
    经过年数--;
  }

  return 初始年龄 + 经过年数;
}

/**
 * 从SaveData中自动计算并更新当前年龄（玩家）
 * @param saveData 存档数据
 * @returns 更新后的年龄
 */
export function updateLifespanFromGameTime(saveData: any): number {
  // 如果没有记录初始年龄或开局时间，使用当前年龄作为初始年龄并记录
  if (!saveData.系统?.初始年龄 || !saveData.系统?.开局时间) {
    const currentAge = saveData.玩家角色状态?.寿命?.当前 || 18;

    // 初始化系统数据
    if (!saveData.系统) {
      saveData.系统 = {};
    }

    // 记录初始年龄和开局时间
    saveData.系统.初始年龄 = currentAge;
    saveData.系统.开局时间 = saveData.游戏时间 ? { ...saveData.游戏时间 } : { 年: 1, 月: 1, 日: 1, 小时: 8, 分钟: 0 };

    console.log('[寿命计算] 初始化玩家年龄数据:', { 初始年龄: currentAge, 开局时间: saveData.系统.开局时间 });
    return currentAge;
  }

  const 当前年龄 = calculateCurrentAge({
    初始年龄: saveData.系统.初始年龄,
    开局时间: saveData.系统.开局时间,
    当前时间: saveData.游戏时间
  });

  // 更新到saveData
  if (saveData.玩家角色状态?.寿命) {
    saveData.玩家角色状态.寿命.当前 = 当前年龄;
  }

  return 当前年龄;
}

/**
 * 从NPC数据中自动计算并更新当前年龄
 * @param npcData NPC数据对象
 * @param globalGameTime 当前游戏时间
 * @returns 更新后的年龄
 */
export function updateNpcLifespanFromGameTime(npcData: any, globalGameTime: GameTime): number {
  // NPC可能在不同层级存储寿命信息
  const statusSource = npcData.玩家角色状态 || npcData.角色状态 || npcData;

  // 如果NPC已死亡，不更新年龄
  if (statusSource.已死亡) {
    return statusSource.寿命?.当前 || 0;
  }

  // 如果NPC没有记录初始年龄或开局时间，使用当前年龄作为初始年龄
  if (!npcData.初始年龄 || !npcData.开局时间) {
    const currentAge = statusSource.寿命?.当前 || 18;

    // 记录NPC的初始年龄和开局时间
    npcData.初始年龄 = currentAge;
    npcData.开局时间 = globalGameTime ? { ...globalGameTime } : { 年: 1, 月: 1, 日: 1, 小时: 8, 分钟: 0 };

    console.log(`[寿命计算] 初始化NPC年龄数据 [${npcData.角色基础信息?.名字 || '未知'}]:`, { 初始年龄: currentAge, 开局时间: npcData.开局时间 });
    return currentAge;
  }

  const 当前年龄 = calculateCurrentAge({
    初始年龄: npcData.初始年龄,
    开局时间: npcData.开局时间,
    当前时间: globalGameTime
  });

  // 更新到NPC数据
  if (statusSource.寿命) {
    statusSource.寿命.当前 = 当前年龄;
  }

  return 当前年龄;
}
