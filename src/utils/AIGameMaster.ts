/**
 * @fileoverview AI Game Master 核心模块
 * 负责构建GM请求、处理GM响应和执行酒馆命令
 */

import { getTavernHelper } from './tavern';
import { set, get, unset, cloneDeep } from 'lodash';
import type { GM_Response } from '../types/AIGameMaster';
import type { SaveData, StateChange, StateChangeLog, GameTime } from '@/types/game';
import { shardSaveData, assembleSaveData, type StorageShards } from './storageSharding';
import { applyEquipmentBonus, removeEquipmentBonus } from './equipmentBonusApplier';
import { buildInGameMessagePrompt } from './prompts/inGameGMPromptsV2';

/**
 * 从GameTime获取分钟数
 */
function getMinutes(gameTime: GameTime): number {
  return gameTime.分钟 ?? 0;
}

/**
 * 格式化游戏时间为字符串
 */
function formatGameTime(gameTime: GameTime | undefined): string {
  if (!gameTime) return '【仙历元年】';

  const minutes = getMinutes(gameTime);
  return `【仙道${gameTime.年}年${gameTime.月}月${gameTime.日}日 ${String(gameTime.小时).padStart(2, '0')}:${String(minutes).padStart(2, '0')}】`;
}

/**
 * 生成长期记忆总结
 */
async function generateLongTermSummary(memories: string[]): Promise<string | null> {
try {
  const helper = getTavernHelper();
  if (!helper) return null;

  // [核心修复] 重写系统提示词，强化规则，禁止使用世界书
  const systemPrompt = `
你是一名严谨的档案管理员，你的唯一任务是根据下面提供的文本记录，进行客观、忠实的总结。

**核心规则:**
1.  **绝对禁止**使用任何未在输入文本中提供的信息、知识或世界观设定。
2.  你的总结**必须**完全基于所提供的记忆片段。
3.  将多个离散的记忆点，按时间顺序和逻辑关系，整合成一段连贯、通顺的叙述。
4.  保留所有关键信息，如人物、地点、事件、对话核心、物品得失、能力变化等。
5.  输出格式为一段简洁、连贯的段落，不要使用列表、标题或任何多余的格式。
6.  直接返回总结好的文本，不要包含任何如“好的，这是您的总结：”之类的前言或结语。`;

  const userPrompt = `请根据以下记忆记录，生成一段客观、连贯的总结：

${memories.join('\n\n')}`;

  // [核心修复] 确保使用 generateRaw 并关闭世界书
  const response = await helper.generateRaw({
    ordered_prompts: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    // 明确禁止使用世界书
    use_world_info: false,
    should_stream: false
  });

  return (typeof response === 'string' ? response.trim() : null) || null;
} catch (error) {
  console.warn('[记忆管理] 生成长期记忆总结失败:', error);
  return null;
}
}

/**
 * 转移到长期记忆 - 直接操作存档数据（用于AIGameMaster.ts）
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function transferToLongTermMemoryInAI(saveData: SaveData, maxMidTermMemories: number): Promise<void> {
  try {
    console.log('[记忆管理] 开始检查并转移中期记忆到长期记忆');

    if (!saveData?.记忆?.中期记忆 || saveData.记忆.中期记忆.length <= maxMidTermMemories) {
      console.log('[记忆管理] 中期记忆数量未达到阈值，无需转移');
      return;
    }

    // [核心修复] 正确使用 splice 来提取并移除需要总结的记忆
    // 1. 计算需要从数组开头提取多少条记忆进行总结
    const memoriesToSummarizeCount = saveData.记忆.中期记忆.length - maxMidTermMemories;
    
    // 2. 从中期记忆的开头提取（并移除）这些记忆
    const memoriesToSummarize = saveData.记忆.中期记忆.splice(0, memoriesToSummarizeCount);

    console.log(`[记忆管理] 提取了 ${memoriesToSummarize.length} 条中期记忆进行总结。剩余中期记忆: ${saveData.记忆.中期记忆.length} 条`);

    if (memoriesToSummarize.length > 0) {
      // 3. 生成长期记忆总结
      const summary = await generateLongTermSummary(memoriesToSummarize);
      if (summary) {
        // 确保长期记忆结构存在
        if (!saveData.记忆.长期记忆) {
          saveData.记忆.长期记忆 = [];
        }

        // 4. 添加新的总结到长期记忆开头
        saveData.记忆.长期记忆.unshift(summary);

        console.log(`[记忆管理] ✅ 成功总结并添加到长期记忆。长期记忆总数: ${saveData.记忆.长期记忆.length} 条`);
      } else {
        console.warn('[记忆管理] ⚠️ 生成长期记忆总结失败，被移除的中期记忆已丢失:', memoriesToSummarize);
      }
    }
  } catch (error) {
    console.warn('[记忆管理] 转移长期记忆失败:', error);
  }
}

/**
 * [新] 批量执行酒馆命令并记录状态变更
 * @param commands 命令数组
 * @param saveData 初始存档数据
 * @returns 包含更新后存档和变更日志的对象
 */
export async function executeCommands(
  commands: { action: string; key: string; value?: unknown }[],
  saveData: SaveData
): Promise<{ saveData: SaveData; stateChanges: StateChangeLog }> {
  let updatedSaveData = cloneDeep(saveData);
  const changes: StateChangeLog['changes'] = [];

  for (const command of commands) {
    if (!command || !command.action || !command.key) continue;

    const { action, key } = command;

    // 🔥 核心修复：将分片路径映射为SaveData内部路径
    // AI使用分片路径(如"境界.名称"),executeCommand内部会映射为SaveData路径(如"玩家角色状态.境界.名称")
    // 所以这里必须用映射后的路径来获取oldValue/newValue,否则会获取不到值,导致变更为空
    const mappedPath = mapShardPathToSaveDataPath(key);
    const oldValue = cloneDeep(get(updatedSaveData, mappedPath));

    // 执行命令
    updatedSaveData = await executeCommand(command, updatedSaveData);

    const newValue = cloneDeep(get(updatedSaveData, mappedPath));

    // 简单比较来决定是否记录变更
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        key: mappedPath,  // 🔥 记录时使用映射后的SaveData路径,这样syncChangesToTavern可以正确识别分片
        action,
        oldValue,
        newValue,
      });
    }
  }

  // 🔥 注意：这里不同步到酒馆，由调用方决定何时同步
  // 初始化时会在最后一次性同步完整saveData
  // 游戏中会增量同步变更
  console.log('[executeCommands] 命令执行完成，共', changes.length, '个变更（未同步）');

  return {
    saveData: updatedSaveData,
    stateChanges: { changes },
  };
}


/**
 * 处理AI Game Master的响应，执行其中的酒馆命令
 * @param response GM响应对象
 * @param currentSaveData 当前存档数据
 * @param isInitialization 是否是角色初始化阶段（初始化时需要保存记忆）
 * @returns 包含更新后存档和变更日志的对象
 */
export async function processGmResponse(
  response: GM_Response,
  currentSaveData: SaveData,
  isInitialization: boolean = false
): Promise<{ saveData: SaveData; stateChanges: StateChangeLog }> {
  console.log('[processGmResponse] 开始处理GM响应，isInitialization=', isInitialization);

  const emptyChanges: StateChangeLog = { changes: [] };

  if (!response) {
    console.warn('[processGmResponse] 响应为空，返回原始数据');
    return { saveData: currentSaveData, stateChanges: emptyChanges };
  }

  let updatedSaveData = cloneDeep(currentSaveData);
  let stateChanges: StateChangeLog = emptyChanges;

  // 处理tavern_commands
  if (Array.isArray(response.tavern_commands) && response.tavern_commands.length > 0) {
    console.log(`[processGmResponse] 🎯 收到 ${response.tavern_commands.length} 个酒馆命令，开始执行...`);
    console.log('[processGmResponse] 命令详情:', response.tavern_commands);

    // 检查是否有随机灵根或随机出生的替换命令
    const spiritRootCmd = response.tavern_commands.find(cmd => cmd.key === '角色基础信息.灵根');
    const originCmd = response.tavern_commands.find(cmd => cmd.key === '角色基础信息.出生');
    if (spiritRootCmd) {
      console.log('[processGmResponse] 🔥 检测到灵根替换命令:', JSON.stringify(spiritRootCmd.value));
    }
    if (originCmd) {
      console.log('[processGmResponse] 🔥 检测到出生替换命令:', JSON.stringify(originCmd.value));
    }

    const result = await executeCommands(response.tavern_commands, updatedSaveData);
    updatedSaveData = result.saveData;
    stateChanges = result.stateChanges;

    // 验证替换后的值
    if (spiritRootCmd) {
      console.log('[processGmResponse] ✅ 灵根替换后的值:', JSON.stringify(updatedSaveData.角色基础信息?.灵根));
    }
    if (originCmd) {
      console.log('[processGmResponse] ✅ 出生替换后的值:', JSON.stringify(updatedSaveData.角色基础信息?.出生));
    }

    // 🔥 检查是否有时间更新，如果有则自动更新年龄
    const hasTimeUpdate = response.tavern_commands.some(cmd =>
      cmd.key?.includes('游戏时间') || cmd.key?.includes('game_time')
    );
    if (hasTimeUpdate) {
      console.log('[processGmResponse] 🕐 检测到时间更新，自动更新玩家和NPC年龄');
      const { updateLifespanFromGameTime, updateNpcLifespanFromGameTime } = await import('@/utils/lifespanCalculator');

      // 更新玩家年龄
      const playerAge = updateLifespanFromGameTime(updatedSaveData);
      console.log('[processGmResponse] 玩家当前年龄:', playerAge);

      // 更新所有NPC年龄
      const relations = updatedSaveData.人物关系 || {};
      const gameTime = updatedSaveData.游戏时间;
      if (gameTime) {
        for (const [npcName, npcData] of Object.entries(relations)) {
          if (npcData && typeof npcData === 'object') {
            const npcAge = updateNpcLifespanFromGameTime(npcData, gameTime);
            console.log(`[processGmResponse] NPC [${npcName}] 当前年龄:`, npcAge);
          }
        }
      }
    }

    // 将本次变更增量同步到酒馆，确保环境状态与本地一致
    try {
      if (stateChanges?.changes?.length) {
        console.log('[processGmResponse] 🎯 准备同步', stateChanges.changes.length, '个变更到酒馆');
        console.log('[processGmResponse] 变更详情:', stateChanges.changes.map(c => ({ key: c.key, action: c.action })));
        await syncChangesToTavern(stateChanges.changes, 'chat');
        console.log('[processGmResponse] ✅ 已同步变更到 Tavern 分片变量');
      } else {
        console.warn('[processGmResponse] ⚠️ 没有变更需要同步（stateChanges.changes为空）');
      }
    } catch (syncErr) {
      console.error('[processGmResponse] ❌ 同步变更到酒馆失败:', syncErr);
      throw syncErr; // 重新抛出错误以便上层感知
    }
    console.log('[processGmResponse] ✅ 所有命令执行完成');
  } else {
    console.log('[processGmResponse] ⚠️ 没有 tavern_commands 需要执行');
  }

  // 🔥 处理短期记忆
  // 初始化阶段：必须在这里保存，因为MainGamePanel还没加载
  // 游戏中：由MainGamePanel的addToShortTermMemory处理
  if (isInitialization && response.text) {
    if (!updatedSaveData.记忆) {
      updatedSaveData.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [], 隐式中期记忆: [] };
    }
    if (!Array.isArray(updatedSaveData.记忆.短期记忆)) {
      updatedSaveData.记忆.短期记忆 = [];
    }
    if (!Array.isArray(updatedSaveData.记忆.隐式中期记忆)) {
      updatedSaveData.记忆.隐式中期记忆 = [];
    }

    const gameTime = updatedSaveData.游戏时间;
    const timePrefix = formatGameTime(gameTime);

    const textToStore = `${timePrefix}${response.text}`;
    updatedSaveData.记忆.短期记忆.push(textToStore);
    console.log('[processGmResponse] ✅ 已添加初始化短期记忆');
    console.log('[processGmResponse] 记忆内容（前100字符）:', textToStore.substring(0, 100));
    console.log('[processGmResponse] 当前短期记忆数量:', updatedSaveData.记忆.短期记忆.length);
  } else if (!isInitialization) {
    console.log('[processGmResponse] ⚠️ 非初始化阶段，跳过短期记忆添加（由MainGamePanel处理）');
  }

  // 🔥 注意：mid_term_memory 不在这里处理
  // 在游戏中，由 MainGamePanel 的 addToShortTermMemory 统一处理
  // 在初始化时，也应该由初始化逻辑处理，保持一致性

  console.log('[processGmResponse] GM响应处理完成');
  return { saveData: updatedSaveData, stateChanges };
}

/**
 * 将分片路径转换为SaveData内部路径
 * @param shardPath AI使用的分片路径 (如: "境界.名称")
 * @returns SaveData内部路径 (如: "玩家角色状态.境界.名称")
 */
function mapShardPathToSaveDataPath(shardPath: string): string {
  // 分片路径映射到SaveData内部路径
  // 基础信息分片
  if (shardPath.startsWith('基础信息.')) {
    return '角色基础信息.' + shardPath.substring('基础信息.'.length);
  }
  if (shardPath === '基础信息') {
    return '角色基础信息';
  }

  // 境界分片
  if (shardPath.startsWith('境界.')) {
    return '玩家角色状态.境界.' + shardPath.substring('境界.'.length);
  }
  if (shardPath === '境界') {
    return '玩家角色状态.境界';
  }

  // 属性分片 (气血、灵气、神识、寿命)
  if (shardPath.startsWith('属性.')) {
    return '玩家角色状态.' + shardPath.substring('属性.'.length);
  }
  if (shardPath === '属性') {
    return '玩家角色状态';
  }

  // 位置分片
  if (shardPath.startsWith('位置.')) {
    return '玩家角色状态.位置.' + shardPath.substring('位置.'.length);
  }
  if (shardPath === '位置') {
    return '玩家角色状态.位置';
  }

  // 修炼功法分片
  if (shardPath.startsWith('修炼功法.') || shardPath === '修炼功法') {
    return shardPath;
  }

  // 装备栏分片
  if (shardPath.startsWith('装备栏.') || shardPath === '装备栏') {
    return shardPath;
  }

  // 背包分片
  if (shardPath.startsWith('背包_灵石.')) {
    return '背包.灵石.' + shardPath.substring('背包_灵石.'.length);
  }
  if (shardPath === '背包_灵石') {
    return '背包.灵石';
  }
  if (shardPath.startsWith('背包_物品.')) {
    return '背包.物品.' + shardPath.substring('背包_物品.'.length);
  }
  if (shardPath === '背包_物品') {
    return '背包.物品';
  }

  // 人物关系分片
  if (shardPath.startsWith('人物关系.') || shardPath === '人物关系') {
    return shardPath;
  }

  // 三千大道分片
  if (shardPath.startsWith('三千大道.') || shardPath === '三千大道') {
    return shardPath;
  }

  // 世界信息分片
  if (shardPath.startsWith('世界信息.') || shardPath === '世界信息') {
    return shardPath;
  }

  // 记忆分片
  if (shardPath.startsWith('记忆_短期.')) {
    return '记忆.短期记忆.' + shardPath.substring('记忆_短期.'.length);
  }
  if (shardPath === '记忆_短期') {
    return '记忆.短期记忆';
  }
  if (shardPath.startsWith('记忆_中期.')) {
    return '记忆.中期记忆.' + shardPath.substring('记忆_中期.'.length);
  }
  if (shardPath === '记忆_中期') {
    return '记忆.中期记忆';
  }
  if (shardPath.startsWith('记忆_长期.')) {
    return '记忆.长期记忆.' + shardPath.substring('记忆_长期.'.length);
  }
  if (shardPath === '记忆_长期') {
    return '记忆.长期记忆';
  }
  if (shardPath.startsWith('记忆_隐式中期.')) {
    return '记忆.隐式中期记忆.' + shardPath.substring('记忆_隐式中期.'.length);
  }
  if (shardPath === '记忆_隐式中期') {
    return '记忆.隐式中期记忆';
  }

  // 游戏时间分片
  if (shardPath.startsWith('游戏时间.') || shardPath === '游戏时间') {
    return shardPath;
  }

  // 状态效果分片
  if (shardPath.startsWith('状态效果.')) {
    return '玩家角色状态.状态效果.' + shardPath.substring('状态效果.'.length);
  }
  if (shardPath === '状态效果') {
    return '玩家角色状态.状态效果';
  }

  // 如果不匹配任何分片，直接返回
  console.warn('[路径映射] 未识别的分片路径，保持原样:', shardPath);
  return shardPath;
}

/**
 * 执行单个酒馆命令
 * @param command 酒馆命令
 * @param saveData 存档数据
 * @returns 更新后的存档数据
 */
async function executeCommand(command: { action: string; key: string; value?: unknown }, saveData: SaveData): Promise<SaveData> {
  if (!command || !command.action || !command.key) {
    console.warn('[executeCommand] 无效命令:', command);
    return saveData;
  }

  const { action, key, value } = command;

  // 工具：限制数值到0-10（用于先天六司）
  const clamp = (n: unknown, min = 0, max = 10): number => {
    const v = typeof n === 'number' ? n : parseFloat(String(n));
    if (Number.isNaN(v)) return min;
    return Math.max(min, Math.min(max, v));
  };

  // 若是先天六司路径，按规则裁剪
  const normalizeInnateSet = (p: string, val: unknown) => {
    if (!String(p).includes('先天六司')) return val;
    try {
      // 整体对象写入
      if (typeof val === 'object' && val !== null && (String(p).endsWith('先天六司') || String(p).endsWith('先天六司.')) ) {
        const obj = { ...val } as Record<string, unknown>;
        if ('根骨' in obj) obj['根骨'] = clamp(obj['根骨']);
        if ('灵性' in obj) obj['灵性'] = clamp(obj['灵性']);
        if ('悟性' in obj) obj['悟性'] = clamp(obj['悟性']);
        if ('气运' in obj) obj['气运'] = clamp(obj['气运']);
        if ('魅力' in obj) obj['魅力'] = clamp(obj['魅力']);
        if ('心性' in obj) obj['心性'] = clamp(obj['心性']);
        return obj;
      }
      // 单字段写入
      if (typeof val === 'number') return clamp(val);
      return val;
    } catch { return val; }
  };

  // 位置描述规范化：将任意叙事式地点描述，统一为「大陆名·区域·地点」结构，并基于地图坐标智能推断区域
  const normalizeLocationDescription = (raw: unknown, dataRoot: SaveData): { 描述: string; x?: number; y?: number } | unknown => {
    const worldName = (dataRoot?.['角色基础信息']?.['世界']) || '朝天大陆';

    const normalizeStr = (s: string): string => {
      let t = String(s || '').trim();
      if (!t) return `${worldName}·未知之地`;
      // 统一分隔符为 ·
      t = t
        .replace(/[，,、/\\|>]+/g, '·')
        .replace(/\s*[-—–]\s*/g, '·')
        .replace(/\s*·\s*/g, '·')
        .replace(/。/g, '')
        .replace(/\.\s*/g, '·');

      // 若仍无层级分隔，尽量从语句中抽取短语
      if (!t.includes('·')) {
        // 将句读转为层级，再去噪
        t = t.replace(/\s+/g, '·');
      }

      // 去掉常见虚词与尾缀（仅处理末段，避免破坏地名）
      const cleanup = (seg: string): string => {
        let u = seg.trim();
        u = u.replace(/的/g, '');
        u = u.replace(/[之的]?([上中下里内外处间旁畔边]{1})$/g, '');
        return u;
      };

      let parts = t.split('·').map(x => x.trim()).filter(Boolean).map(cleanup);
      // 去重空段
      parts = parts.filter(Boolean);

      // 确保首段为大陆名
      if (parts.length === 0) parts = ['未知之地'];
      if (parts[0] !== worldName) {
        parts.unshift(worldName);
      }

      // 限制总段数为 2~3（含大陆名）
      if (parts.length > 3) {
        parts = parts.slice(0, 3);
      }

      return parts.join('·');
    };

    // 基于地图坐标推断区域名称（地图范围：0-3600 x 0-2400）
    const inferRegionFromCoords = (x: number, y: number): string => {
      // 获取世界地图信息
      const worldInfo = dataRoot?.['世界信息'];
      const locations = worldInfo?.['地点信息'] || [];

      // 尝试找到最近的地点
      let nearestLocation = null;
      let minDistance = Infinity;

      for (const loc of locations) {
        // 检查坐标字段（支持多种格式）
        const locX = (loc as any).x ?? loc.coordinates?.longitude;
        const locY = (loc as any).y ?? loc.coordinates?.latitude;

        if (locX !== undefined && locY !== undefined) {
          const dist = Math.sqrt(Math.pow(locX - x, 2) + Math.pow(locY - y, 2));
          if (dist < minDistance) {
            minDistance = dist;
            nearestLocation = loc;
          }
        }
      }

      // 如果找到了附近的地点（距离小于200），使用其区域信息
      if (nearestLocation && minDistance < 200) {
        const locName = nearestLocation['名称'] || (nearestLocation as any)['地点名称'] || '';
        if (locName.includes('·')) {
          const parts = locName.split('·');
          return parts.slice(0, -1).join('·'); // 返回区域部分（去掉最后的具体地点）
        }
      }

      // 🔥 修复：基于坐标从实际大陆列表中选择最近的大陆
      const continents = worldInfo?.['大陆信息'] || [];
      if (continents.length > 0) {
        // 直接使用第一个大陆作为默认值（简化逻辑）
        // TODO: 未来可以根据坐标判断实际大陆，但现在AI已经会生成正确的大陆名
        const firstContinent = continents[0];
        // ⚠️ 优先使用中文名称，避免返回英文ID
        const continentName = (firstContinent['名称'] || firstContinent['name'] || worldName) as string;

        // 🔥 重要：如果大陆名是英文ID（如gilded_heartland），说明数据有问题
        if (continentName && /^[a-z_]+$/.test(continentName)) {
          console.error(`[位置规范化] ❌ 检测到英文大陆ID: ${continentName}，这是错误的！应该使用中文名称`);
          console.error('[位置规范化] 大陆数据:', firstContinent);
          // 尝试从第一个大陆的中文名称获取
          if (continents[0] && continents[0]['名称']) {
            return continents[0]['名称'] as string;
          }
          return worldName; // 最后回退到世界名
        }

        console.log(`[位置规范化] 使用大陆: ${continentName}`);
        return continentName;

      }

      // 最后的回退：如果连大陆信息都没有，直接返回世界名
      console.error('[位置规范化] 世界信息中没有大陆数据，回退到世界名');
      return worldName;
    };

    // 支持直接字符串或对象 { 描述: string, x?, y? }
    if (typeof raw === 'string') {
      return { 描述: normalizeStr(raw) };
    }
    if (raw && typeof raw === 'object' && '描述' in raw) {
      const obj = raw as Record<string, unknown>;
      let normalized = normalizeStr(obj['描述'] as string);

      // 如果有坐标信息，基于坐标智能推断区域
      if (typeof obj['x'] === 'number' && typeof obj['y'] === 'number') {
        const x = obj['x'] as number;
        const y = obj['y'] as number;
        const inferredRegion = inferRegionFromCoords(x, y);

        // 如果描述中没有包含明确的区域信息，使用推断的区域
        if (!normalized.includes('·') || normalized.split('·').length < 2) {
          normalized = `${inferredRegion}·${normalized.replace(worldName + '·', '')}`;
        }

        return { ...obj, 描述: normalized, x, y };
      }

      return { ...obj, 描述: normalized };
    }
    return raw;
  };

  // 规范化：当AI写入物品(尤其功法)时，自动校正品质与品级
  const normalizeItemIfNeeded = (val: unknown) => {
    try {
      if (!val || typeof val !== 'object') return val;
      const item = val as Record<string, unknown>;
      const type = (item.类型 as string || '').trim();
      if (!['装备', '功法', '其他'].includes(type)) return val;

      // 品质规范化
      const qualityMap: Record<string, string> = {
        '凡品': '凡', '凡阶': '凡', '凡': '凡',
        '黄品': '黄', '黄阶': '黄', '黄': '黄',
        '玄品': '玄', '玄阶': '玄', '玄': '玄',
        '地品': '地', '地阶': '地', '地': '地',
        '天品': '天', '天阶': '天', '天': '天',
        '仙品': '仙', '仙阶': '仙', '仙': '仙',
        '神品': '神', '神阶': '神', '神': '神'
      };
      const gradeTextToNumber: Record<string, number> = {
        '残缺': 0, '下品': 2, '中品': 5, '上品': 8, '极品': 10
      };
      const q = (item.品质 as Record<string, unknown>) || {};
      const rawQ = String(q.quality ?? q.品质 ?? '').trim();
      const normQuality = qualityMap[rawQ] || '凡';
      const rawG = (q.grade ?? q.品级 ?? q.等级);
      let normGrade = 0; // 默认值为0，修复“残篇”功法被自动升级到1级的问题
      if (typeof rawG === 'number' && !Number.isNaN(rawG)) {
        normGrade = Math.min(10, Math.max(0, Math.round(rawG)));
      } else if (typeof rawG === 'string' && rawG.trim()) {
        normGrade = gradeTextToNumber[rawG.trim()] ?? 0; // 如果文本解析失败，也默认为0
      }
      item.品质 = { quality: normQuality, grade: normGrade };

      // 确保装备类物品有已装备字段
      if (type === '装备' || type === '功法') {
        if (item.已装备 === undefined) {
          item.已装备 = false;
        }

        // 清理重复的装备状态字段，只保留"已装备"字段
        if (item.是否装备 !== undefined) {
          console.warn('[物品规范化] 发现重复的装备状态字段"是否装备"，已清理');
          delete item.是否装备;
        }
      }

      // 确保有物品ID字段
      if (!item.物品ID) {
        item.物品ID = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      return item;
    } catch {
      return val;
    }
  };

  // 🔥 核心修复：将分片路径映射到SaveData内部路径
  const path = mapShardPathToSaveDataPath(key);

  console.log(`[executeCommand] ========== 开始执行命令 ==========`);
  console.log(`[executeCommand] 原始路径: ${key}`);
  console.log(`[executeCommand] 映射路径: ${path}`);
  console.log(`[executeCommand] 动作: ${action}`);
  console.log(`[executeCommand] 值:`, value);
  console.log(`[executeCommand] 值类型:`, typeof value);

  try {
    // 🔥 [装备增幅系统] 在set之前，获取装备栏旧值（用于移除旧装备加成）
    let oldEquipmentItemId: string | null = null;
    if (action === 'set' && path.startsWith('装备栏.装备')) {
      oldEquipmentItemId = get(saveData, path) as string | null;
      console.log(`[装备增幅] 准备变更 ${path}，旧装备ID: ${oldEquipmentItemId || '无'}`);
    }

    switch (action) {
      case 'set':
        // 🔥 境界更新特殊日志
        if (String(path).includes('境界')) {
          console.log(`[executeCommand] 🌟 境界更新 - 路径: ${path}, 新值:`, value);
        }

        // 若写入物品或功法，先做一次品质规范化
        if (String(path).includes('背包.物品') || String(path).includes('修炼功法.功法')) {
          set(saveData, path, normalizeItemIfNeeded(value));
          console.log(`[executeCommand] ✅ 已设置(规范化物品/功法):`, get(saveData, path));
        } else {
          // 当写入位置时，做格式化：「大陆名·区域·地点」
          if (String(path).endsWith('玩家角色状态.位置.描述') || String(path).endsWith('位置.描述')) {
            const normalized = normalizeLocationDescription(value, saveData);
            // 只提取描述字符串，不要整个对象
            const description = typeof normalized === 'object' && normalized !== null && '描述' in normalized
              ? (normalized as any).描述
              : normalized;
            set(saveData, path, description);
            console.log(`[executeCommand] ✅ 已设置(规范化位置):`, get(saveData, path));
          } else if (String(path).endsWith('玩家角色状态.位置')) {
            set(saveData, path, normalizeLocationDescription(value, saveData));
            console.log(`[executeCommand] ✅ 已设置(规范化位置对象):`, get(saveData, path));
          } else {
            // 先天六司写入时裁剪到<=10（NPC与玩家均适用）
            const finalVal = normalizeInnateSet(path, value);
            set(saveData, path, finalVal);
            console.log(`[executeCommand] ✅ 已设置:`, get(saveData, path));
          }
        }

        // 🔥 境界更新后验证
        if (String(path).includes('境界')) {
          const updatedRealm = get(saveData, '玩家角色状态.境界');
          console.log(`[executeCommand] 🌟 境界更新后验证 - 完整境界对象:`, updatedRealm);
        }

        // [特例修复] 当设置大道进度时，自动将其添加到已解锁大道数组中
        if (path.startsWith('三千大道.大道进度.')) {
          try {
            const daoName = path.substring('三千大道.大道进度.'.length);
            const unlockedDaos = get(saveData, '三千大道.已解锁大道', []) as string[];
            if (Array.isArray(unlockedDaos) && !unlockedDaos.includes(daoName)) {
              unlockedDaos.push(daoName);
              set(saveData, '三千大道.已解锁大道', unlockedDaos);
              console.log(`[executeCommand] 特例：已自动解锁大道 "${daoName}"`);
            }
          } catch (e) {
            console.error('[executeCommand] 自动解锁大道失败:', e);
          }
        }

        // 🔥 [装备增幅系统] 当装备栏变更时，自动应用/移除装备属性加成
        if (path.startsWith('装备栏.装备')) {
          try {
            const newItemId = String(value || '');

            console.log(`[装备增幅] 检测到装备栏变更: ${path}`);
            console.log(`[装备增幅] 旧装备ID: ${oldEquipmentItemId || '无'}`);
            console.log(`[装备增幅] 新装备ID: ${newItemId || '无'}`);

            let attributesChanged = false;

            // 如果旧装备存在，移除其属性加成
            if (oldEquipmentItemId && oldEquipmentItemId !== 'null' && oldEquipmentItemId !== newItemId) {
              console.log(`[装备增幅] 移除旧装备 ${oldEquipmentItemId} 的属性加成`);
              const removed = removeEquipmentBonus(saveData, oldEquipmentItemId);
              if (removed) attributesChanged = true;
            }

            // 如果新装备存在，应用其属性加成
            if (newItemId && newItemId !== 'null' && newItemId !== oldEquipmentItemId) {
              console.log(`[装备增幅] 应用新装备 ${newItemId} 的属性加成`);
              const applied = applyEquipmentBonus(saveData, newItemId);
              if (applied) attributesChanged = true;
            }

            // 如果属性发生变化，立即同步"属性"分片到酒馆
            if (attributesChanged) {
              const helper = getTavernHelper();
              if (helper) {
                const attrs = {
                  气血: saveData.玩家角色状态?.气血,
                  灵气: saveData.玩家角色状态?.灵气,
                  神识: saveData.玩家角色状态?.神识,
                  寿命: saveData.玩家角色状态?.寿命
                };
                // 清理数据，移除不可序列化的值（修复酒馆助手3.6.11的structuredClone问题）
                const { deepCleanForClone } = await import('@/utils/dataValidation');
                const cleanedAttrs = deepCleanForClone({ '属性': attrs });
                await helper.insertOrAssignVariables(cleanedAttrs, { type: 'chat' });
                console.log(`[装备增幅] ✅ 已同步属性分片到酒馆:`, attrs);
              }
            }
          } catch (e) {
            console.error('[装备增幅] 处理装备增幅失败:', e);
          }
        }
        break;

      case 'add':
        const currentValue = get(saveData, path, 0);
        let added = Number(currentValue) + Number(value || 0);
        // 若针对先天六司，裁剪到<=10
        if (String(path).includes('先天六司')) added = clamp(added);

        // 🔥 特殊处理：游戏时间自动进位
        if (path === '游戏时间.分钟' || path.endsWith('游戏时间.分钟')) {
          console.log(`[executeCommand] 🕐 时间推进 ${value} 分钟，开始自动进位计算`);

          // 获取当前游戏时间
          const gameTime = get(saveData, '游戏时间', { 年: 1, 月: 1, 日: 1, 小时: 0, 分钟: 0 }) as GameTime;

          // 将当前时间转换为总分钟数（用于计算）
          const currentMinutes = gameTime.分钟 || 0;
          const currentHours = gameTime.小时 || 0;
          const currentDays = (gameTime.日 || 1) - 1; // 日期从1开始，所以-1
          const currentMonths = (gameTime.月 || 1) - 1; // 月份从1开始，所以-1
          const currentYears = (gameTime.年 || 1) - 1; // 年份从1开始，所以-1

          const 分钟每小时 = 60;
          const 小时每天 = 24;
          const 天每月 = 30;
          const 月每年 = 12;

          // 计算当前时间的总分钟数
          const currentTotalMinutes = currentYears * 月每年 * 天每月 * 小时每天 * 分钟每小时 +
                                      currentMonths * 天每月 * 小时每天 * 分钟每小时 +
                                      currentDays * 小时每天 * 分钟每小时 +
                                      currentHours * 分钟每小时 +
                                      currentMinutes;

          // 增加时间
          const newTotalMinutes = currentTotalMinutes + Number(value || 0);

          // 从总分钟数反推年月日时分
          const 分钟每天 = 分钟每小时 * 小时每天; // 1440
          const 分钟每月 = 分钟每天 * 天每月; // 43200
          const 分钟每年 = 分钟每月 * 月每年; // 518400

          let 剩余分钟 = newTotalMinutes;

          // 计算年份（从1开始）
          const 新年 = Math.floor(剩余分钟 / 分钟每年) + 1;
          剩余分钟 = 剩余分钟 % 分钟每年;

          // 计算月份（1-12）
          const 月份数 = Math.floor(剩余分钟 / 分钟每月);
          const 新月 = (月份数 % 月每年) + 1; // 确保月份在1-12之间
          剩余分钟 = 剩余分钟 % 分钟每月;

          // 计算日期（1-30）
          const 日期数 = Math.floor(剩余分钟 / 分钟每天);
          const 新日 = (日期数 % 天每月) + 1; // 确保日期在1-30之间
          剩余分钟 = 剩余分钟 % 分钟每天;

          // 计算小时（0-23）
          const 新小时 = Math.floor(剩余分钟 / 分钟每小时) % 小时每天;
          // 计算分钟（0-59）
          const 新分钟 = 剩余分钟 % 分钟每小时;

          // 更新游戏时间，不保存总分钟数
          set(saveData, '游戏时间', {
            年: 新年,
            月: 新月,
            日: 新日,
            小时: 新小时,
            分钟: 新分钟
          });

          console.log(`[executeCommand] ✅ 游戏时间已更新: ${新年}年${新月}月${新日}日 ${新小时}:${新分钟}`);
          console.log(`[executeCommand]   原时间: ${gameTime.年}年${gameTime.月}月${gameTime.日}日 ${gameTime.小时}:${currentMinutes}`);
          console.log(`[executeCommand]   推进: ${value}分钟`);
        } else {
          set(saveData, path, added);
          console.log(`[executeCommand] ✅ 已增加: ${currentValue} + ${value} = ${added}`);
        }
        break;

      case 'push':
        const array = get(saveData, path, []) as unknown[];
        if (Array.isArray(array)) {
          array.push(value ?? null);
          console.log(`[executeCommand] ✅ 已添加到数组，当前长度:`, array.length);
        } else {
          set(saveData, path, [value ?? null]);
          console.log(`[executeCommand] ✅ 已创建新数组并添加元素`);
        }
        break;

      case 'pull':
        {
          const pullArray = get(saveData, path, []) as unknown[];
          if (Array.isArray(pullArray)) {
            const deepEqual = (a: unknown, b: unknown): boolean => {
              try { return JSON.stringify(a) === JSON.stringify(b); } catch { return a === b; }
            };
            let removed = false;
            // 1) 直接匹配（适用于原始类型，或同引用的对象）
            let idx = pullArray.indexOf(value);
            if (idx > -1) {
              pullArray.splice(idx, 1);
              removed = true;
            }
            // 2) 深度相等匹配（用于对象值）
            if (!removed && typeof value === 'object' && value !== null) {
              idx = pullArray.findIndex((it) => deepEqual(it, value));
              if (idx > -1) {
                pullArray.splice(idx, 1);
                removed = true;
              }
            }
            // 3) 通过标识符匹配（常见：物品ID/名称/状态名称）
            if (!removed && (typeof value === 'string' || typeof value === 'number')) {
              const v = String(value);
              const keyCandidates = ['物品ID', '名称', '状态名称', 'id', 'name'];
              idx = pullArray.findIndex((it) => {
                if (it && typeof it === 'object') {
                  return keyCandidates.some(k => String((it as Record<string, unknown>)[k] ?? '') === v);
                }
                return String(it) === v;
              });
              if (idx > -1) {
                pullArray.splice(idx, 1);
                removed = true;
              }
            }
          }
        }
        break;

      case 'delete':
        {
          // 支持删除数组索引（以 [...][index] 结尾时使用 splice 保持数组紧凑）
          const arrayIndexMatch = String(path).match(/^(.*)\[(\d+)\]$/);
          if (arrayIndexMatch) {
            const basePath = arrayIndexMatch[1];
            const index = parseInt(arrayIndexMatch[2], 10);
            const arr = get(saveData, basePath, undefined) as unknown[] | undefined;
            if (Array.isArray(arr) && index >= 0 && index < arr.length) {
              arr.splice(index, 1);
            } else {
              unset(saveData, path);
            }
          } else {
            unset(saveData, path);
          }
        }
        break;

      default:
        console.warn('[executeCommand] 未知命令类型:', action);
    }
  } catch (error) {
    console.error('[executeCommand] 命令执行失败:', error);
  }

  return saveData;
}

/**
 * 同步数据到酒馆变量（使用分片存储）
 * @param saveData 存档数据
 * @param scope 变量作用域
 */
export async function syncToTavern(saveData: SaveData, scope: 'global' | 'chat' = 'chat'): Promise<void> {
  try {
    const helper = getTavernHelper();
    if (!helper) {
      console.warn('[syncToTavern] 酒馆助手不可用');
      return;
    }

    // 将saveData拆分为17个分片（包含隐式中期记忆）
    const shards = shardSaveData(saveData);

    // 清理数据，移除不可序列化的值（修复酒馆助手3.6.11的structuredClone问题）
    const { deepCleanForClone } = await import('@/utils/dataValidation');
    const cleanedShards = deepCleanForClone(shards as unknown as Record<string, unknown>);

    // 一次性写入所有分片
    await helper.insertOrAssignVariables(cleanedShards, { type: scope });

    console.log('[syncToTavern] 数据同步完成 (17个分片)');
  } catch (error) {
    console.error('[syncToTavern] 数据同步失败:', error);
  }
}

/**
 * 根据路径确定所属分片名称
 * @param path 数据路径,如 "玩家角色状态.境界.名称"
 * @returns 分片名称,如 "境界"
 */
function getShardNameFromPath(path: string): keyof StorageShards | null {
  const normalizedPath = path;

  // 路径映射到分片名称
  if (normalizedPath.startsWith('角色基础信息')) return '基础信息';
  if (normalizedPath.startsWith('玩家角色状态.境界')) return '境界';
  if (normalizedPath.startsWith('玩家角色状态.气血') ||
      normalizedPath.startsWith('玩家角色状态.灵气') ||
      normalizedPath.startsWith('玩家角色状态.神识') ||
      normalizedPath.startsWith('玩家角色状态.寿命')) return '属性';
  if (normalizedPath.startsWith('玩家角色状态.位置')) return '位置';
  if (normalizedPath.startsWith('修炼功法')) return '修炼功法';
  if (normalizedPath.startsWith('装备栏')) return '装备栏';
  if (normalizedPath.startsWith('背包.灵石')) return '背包_灵石';
  if (normalizedPath.startsWith('背包.物品')) return '背包_物品';
  if (normalizedPath.startsWith('人物关系')) return '人物关系';
  if (normalizedPath.startsWith('三千大道')) return '三千大道';
  if (normalizedPath.startsWith('世界信息')) return '世界信息';
  if (normalizedPath.startsWith('记忆.短期记忆')) return '记忆_短期';
  if (normalizedPath.startsWith('记忆.中期记忆')) return '记忆_中期';
  if (normalizedPath.startsWith('记忆.长期记忆')) return '记忆_长期';
  if (normalizedPath.startsWith('记忆.隐式中期记忆')) return '记忆_隐式中期';
  if (normalizedPath.startsWith('游戏时间')) return '游戏时间';
  if (normalizedPath.startsWith('玩家角色状态.状态效果')) return '状态效果';
  if (normalizedPath.startsWith('系统')) return '系统';

  return null;
}

/**
 * 将SaveData格式的路径转换为分片内部路径
 * @param path 完整路径,如 "玩家角色状态.境界.名称"
 * @param shardName 分片名称
 * @returns 分片内部路径,如 "名称"
 */
function getPathInShard(path: string, shardName: string): string {
  const normalizedPath = path;

  // 移除分片对应的SaveData路径前缀
  const prefixMap: Record<string, string> = {
    '基础信息': '角色基础信息.',
    '境界': '玩家角色状态.境界.',
    '属性': '玩家角色状态.',
    '位置': '玩家角色状态.位置.',
    '修炼功法': '修炼功法.',
    '装备栏': '装备栏.',
    '背包_灵石': '背包.灵石.',
    '背包_物品': '背包.物品.',
    '人物关系': '人物关系.',
    '三千大道': '三千大道.',
    '世界信息': '世界信息.',
    '记忆_短期': '记忆.短期记忆',
    '记忆_中期': '记忆.中期记忆',
    '记忆_长期': '记忆.长期记忆',
    '记忆_隐式中期': '记忆.隐式中期记忆',
    '游戏时间': '游戏时间.',
    '状态效果': '玩家角色状态.状态效果',
    '系统': '系统.',
  };

  const prefix = prefixMap[shardName];
  if (prefix && normalizedPath.startsWith(prefix)) {
    // 对于属性分片,需要特殊处理
    if (shardName === '属性') {
      // "玩家角色状态.气血.当前" -> "气血.当前"
      const afterPrefix = normalizedPath.substring('玩家角色状态.'.length);
      return afterPrefix;
    }
    return normalizedPath.substring(prefix.length);
  }

  return normalizedPath;
}

/**
 * 增量同步变更到酒馆（使用分片存储）
 * @param changes 变更列表
 * @param scope 变量作用域
 */
export async function syncChangesToTavern(changes: StateChange[], scope: 'global' | 'chat' = 'chat'): Promise<void> {
  try {
    console.log('[syncChangesToTavern] ========== 开始同步到酒馆 ==========');
    console.log('[syncChangesToTavern] 需要同步的变更数量:', changes.length);

    const helper = getTavernHelper();
    if (!helper) {
      console.warn('[syncChangesToTavern] 酒馆助手不可用');
      return;
    }

    if (changes.length === 0) {
      console.log('[syncChangesToTavern] 无变更需要同步');
      return;
    }

    // 按分片分组变更
    const shardChanges: Record<string, StateChange[]> = {};

    for (const change of changes) {
      const shardName = getShardNameFromPath(change.key);
      console.log(`[syncChangesToTavern] 路径 "${change.key}" -> 分片 "${shardName}"`);

      if (!shardName) {
        console.warn('[syncChangesToTavern] ⚠️ 无法确定分片:', change.key);
        continue;
      }

      if (!shardChanges[shardName]) {
        shardChanges[shardName] = [];
      }
      shardChanges[shardName].push(change);
    }

    console.log(`[syncChangesToTavern] 分片分组完成，共 ${Object.keys(shardChanges).length} 个分片受影响:`, Object.keys(shardChanges));

    // 对每个受影响的分片进行更新
    for (const [shardName, changes] of Object.entries(shardChanges)) {
      console.log(`[syncChangesToTavern] 处理分片 "${shardName}"，包含 ${changes.length} 个变更`);
      let currentShard = await helper.getVariable(shardName, { type: scope });

      // 如果分片不存在,创建空对象/数组
      if (!currentShard) {
        // 记忆分片是数组,其他是对象
        currentShard = shardName.startsWith('记忆_') ? [] : {};
        console.log(`[syncChangesToTavern] 分片不存在，创建新的:`, shardName.startsWith('记忆_') ? '数组' : '对象');
      }

      // 应用变更到分片
      for (const change of changes) {
        const pathInShard = getPathInShard(change.key, shardName);
        console.log(`[syncChangesToTavern]   应用变更: 路径="${pathInShard}", 值=`, change.newValue);

        // 如果是记忆分片且路径为空,直接赋值整个数组
        if (shardName.startsWith('记忆_') && !pathInShard) {
          currentShard = change.newValue;
          console.log(`[syncChangesToTavern]   ✅ 替换整个记忆数组`);
        } else {
          set(currentShard as object, pathInShard, change.newValue);
          console.log(`[syncChangesToTavern]   ✅ 已设置 ${pathInShard}`);
        }
      }

      // 更新分片
      const { deepCleanForClone } = await import('@/utils/dataValidation');
      await helper.setVariable(shardName, deepCleanForClone(currentShard), { type: scope });
      console.log(`[syncChangesToTavern] ✅ 分片 "${shardName}" 已更新到酒馆`);
    }

    console.log(`[syncChangesToTavern] 同步完成，更新了 ${changes.length} 个字段到 ${Object.keys(shardChanges).length} 个分片`);
  } catch (error) {
    console.error('[syncChangesToTavern] 同步失败:', error);
  }
}

/**
 * 从酒馆变量获取数据（仅使用分片存储）
 * @param scope 变量作用域
 * @returns 重组的完整SaveData
 */
export async function getFromTavern(scope: 'global' | 'chat' = 'chat'): Promise<SaveData | null> {
  try {
    const helper = getTavernHelper();
    if (!helper) {
      console.warn('[getFromTavern] 酒馆助手不可用');
      return null;
    }

    const variables = await helper.getVariables({ type: scope });

    // 从分片重组SaveData
    const shards: Partial<StorageShards> = {
      '基础信息': variables['基础信息'] as StorageShards['基础信息'],
      '境界': variables['境界'] as StorageShards['境界'],
      '属性': variables['属性'] as StorageShards['属性'],
      '位置': variables['位置'] as StorageShards['位置'],
      '修炼功法': variables['修炼功法'] as StorageShards['修炼功法'],
      '装备栏': variables['装备栏'] as StorageShards['装备栏'],
      '背包_灵石': variables['背包_灵石'] as StorageShards['背包_灵石'],
      '背包_物品': variables['背包_物品'] as StorageShards['背包_物品'],
      '人物关系': variables['人物关系'] as StorageShards['人物关系'],
      '三千大道': variables['三千大道'] as StorageShards['三千大道'],
      '世界信息': variables['世界信息'] as StorageShards['世界信息'],
      '记忆_短期': variables['记忆_短期'] as StorageShards['记忆_短期'],
      '记忆_中期': variables['记忆_中期'] as StorageShards['记忆_中期'],
      '记忆_长期': variables['记忆_长期'] as StorageShards['记忆_长期'],
      '记忆_隐式中期': variables['记忆_隐式中期'] as StorageShards['记忆_隐式中期'],
      '游戏时间': variables['游戏时间'] as StorageShards['游戏时间'],
      '状态效果': variables['状态效果'] as StorageShards['状态效果'],
      '系统': variables['系统'] as StorageShards['系统'],
    };

    // 从分片重组SaveData
    console.log('[getFromTavern] 从17个分片重组SaveData');
    return assembleSaveData(shards);
  } catch (error) {
    console.error('[getFromTavern] 获取数据失败:', error);
    return null;
  }
}
