import type { Origin, Talent, SpiritRoot, World, TalentTier, CharacterBaseCreate, CharacterBase } from '@/core/rules/characterCreation'

// --- 类型定义 ---
// 与后端 main.py 中的 Pydantic 模型保持同步
export interface User {
  id: number
  user_name: string
}

// This interface is now defined in characterCreation.ts to be shared.
// export interface World { ... }

// --- 角色/存档体系API ---

// 缔造仙身时，需要提交的数据契约
export interface CharacterCreatePayload {
  user_id: number
  world_id: number
  character_name: string
  character_data: {
    origin: Origin | null
    talents: Talent[]
    spiritRoot: SpiritRoot | null
    attributes: Record<string, number>
  }
}

// 缔造成功后，天宫返回的仙身信息
export interface CharacterResponse {
  id: number
  user_id: number
  world_id: number
  character_name: string
}

// 此乃与后台灵脉沟通的根基法阵地址
const BASE_URL = 'http://127.0.0.1:12349'

/**
 * 通用获取神通，用于从后台灵脉中获取各类数据。
 * @param endpoint - 灵脉的特定路径，如 'rules/origins'
 * @returns - 返回解析后的数据Promise
 */
async function fetchData<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/${endpoint}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: '无法解析错误信息。' }))
      throw new Error(errorData.detail || `天机受阻，无法从灵脉'${endpoint}'获取数据。`)
    }

    return response.json() as Promise<T>
  } catch (error) {
    console.error(`[API Fetch Error] 探查'${endpoint}'失败:`, error)
    throw error // 重新抛出错误，让上层调用者处理
  }
}

/**
 * 通用提交神通，用于向后台灵脉提交数据。
 * @param endpoint - 灵脉的特定路径，如 'register'
 * @param body - 要提交的数据体
 * @returns - 返回解析后的数据Promise
 */
export async function postData<T>(endpoint: string, body: object): Promise<T> {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: '无法解析错误信息。' }))
      // 将后端的HTTPException作为前端的Error抛出
      throw new Error(errorData.detail || `向灵脉'${endpoint}'提交数据失败，天道不允。`)
    }

    return response.json() as Promise<T>
  } catch (error) {
    console.error(`[API Post Error] 提交到'${endpoint}'失败:`, error)
    throw error // 重新抛出错误，让上层调用者处理
  }
}

// --- 用户体系API ---

/**
 * 接引新道友（注册）。
 * @param userName - 道号
 * @param password - 凭证
 * @returns 返回用户信息
 */
export const registerUser = (userName: string, password: string): Promise<User> => {
  return postData<User>('register', { user_name: userName, password: password })
}

/**
 * 道友登入。
 * @param userName - 道号
 * @param password - 凭证
 * @returns 返回用户信息
 */
export const loginUser = (userName: string, password: string): Promise<User> => {
  return postData<User>('login', { user_name: userName, password: password })
}

/**
 * 根据道号（用户名）查询用户信息。
 * @param userName - 道号
 * @returns 返回用户信息
 */
export const getUserByUserName = (userName: string): Promise<User> => {
  return fetchData<User>(`users/by-username/${userName}`)
}

// --- 世界体系API ---

/**
 * 获取所有已创建的世界列表。
 * @returns 返回世界列表
 */
export const getWorlds = (): Promise<World[]> => {
  return fetchData<World[]>('worlds')
}

/**
 * 为用户在指定世界中缔造一具化身（创建云存档）。
 * @param payload - 包含所有创角信息的负载
 * @returns 返回新创建的角色基本信息
 */
export const createCharacter = (payload: CharacterCreatePayload): Promise<CharacterResponse> => {
  return postData<CharacterResponse>('characters', payload)
}

/**
 * 使用兑换码获取专属的角色创建数据
 * @param code - 兑换码
 * @returns 包含origins, talents, spiritRoots的自定义数据
 */
export const redeemCodeForCreationData = (code: string): Promise<{ origins: Origin[]; talents: Talent[]; spiritRoots: SpiritRoot[] }> => {
  return postData<{ origins: Origin[]; talents: Talent[]; spiritRoots: SpiritRoot[] }>('redemption/redeem', { code });
}

/**
 * 验证兑换码是否有效
 * @param code - 兑换码
 * @returns 验证结果
 */
export const validateRedemptionCode = (code: string): Promise<{
  success: boolean;
  message: string;
  data?: { origins: Origin[]; talents: Talent[]; spiritRoots: SpiritRoot[] };
}> => {
  return postData('redemption/validate', { code });
}

// --- 核心规则API ---

/**
 * 探查所有可选的【出身】
 * @returns 返回一个包含所有出身的数组 Promise
 */
export const getOrigins = async (): Promise<Origin[]> => {
  const data = await fetchData<any[]>('rules/origins');
  return data.map(origin => ({
    ...origin,
    attributeModifiers: origin.attribute_modifiers,
    attribute_modifiers: undefined, // remove old key
  }));
}

/**
 * 探查所有可选的【天赋】
 * @returns 返回一个包含所有天赋的数组 Promise
 */
export const getTalents = async (): Promise<Talent[]> => {
  const data = await fetchData<any[]>('rules/talents');
  return data.map(talent => ({
    ...talent,
    // Ensure effects is a string if it's an object
    effects: typeof talent.effects === 'object' ? JSON.stringify(talent.effects) : talent.effects,
  }));
}

/**
 * 探查所有可选的【灵根】
 * @returns 返回一个包含所有灵根的数组 Promise
 */
export const getSpiritRoots = async (): Promise<SpiritRoot[]> => {
  const data = await fetchData<any[]>('rules/spirit-roots');
  return data.map(root => ({
    ...root,
    effects: root.effects || null, // Ensure effects property exists
  }));
}

/**
 * 探查所有可选的【世界背景】
 * @returns 返回一个包含所有世界背景的数组 Promise
 */
export const getWorldBackgrounds = (): Promise<World[]> => {
  return fetchData<World[]>('worlds')
}

/**
 * 提交用户自创天赋。
 * @param payload - 包含天赋名、描述、作者名和兑换码
 * @returns 返回提交结果
 */
export const submitUgcTalent = (payload: {
  name: string
  description: string
  redemption_code: string
  author_name: string
}): Promise<{ message: string; talent?: Talent }> => {
  console.log('正在向天宫提交自创天赋...', payload)
  // 此处为前端占位实现，待后端接口完成后再行对接
  // return postData('ugc/talents', payload);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ message: '天赋已上达天听，待天尊审核！' })
    }, 1000)
  })
}

/**
 * `saveCharacter` 是 `createCharacter` 的别名，为旧法兼容。
 */
export const saveCharacter = (payload: CharacterCreatePayload): Promise<CharacterResponse> => {
  return createCharacter(payload);
};

/**
 * 获取核心游戏设定
 * @returns 返回核心设定
 */
export const getCoreSettings = (): Promise<any> => {
  return fetchData('rules/settings');
};

/**
 * 请求AI生成内容。
 * @param prompt - 提供给AI的提示
 * @returns - 返回AI生成的JSON字符串
 */
export const generateAIContent = async (prompt: string): Promise<string> => {
  const response = await postData<string>('ai/generate', { prompt });
  return response;
};

/**
 * 获取所有天资等级
 * @returns 返回天资等级列表
 */
export const getTalentTiers = (): Promise<TalentTier[]> => {
  return fetchData<TalentTier[]>('talent_tiers');
}

/**
 * 获取角色创建所需的基础数据（包含出身、灵根、天赋）
 * @param worldId - 世界ID
 * @returns 返回创建数据
 */
export const getCreationData = (worldId: number): Promise<{
  origins: Origin[];
  spirit_roots: SpiritRoot[];
  talents: Talent[];
}> => {
  return fetchData(`creation_data?world_id=${worldId}`);
}

/**
 * 使用新的字符基础创建系统创建角色
 * @param characterData - 角色基础创建数据
 * @returns 返回创建的角色基础信息
 */
export const createCharacterBase = (characterData: CharacterBaseCreate): Promise<CharacterBase> => {
  return postData<CharacterBase>('create', characterData);
}

/**
 * 获取当前用户的所有角色
 * @returns 返回角色列表
 */
export const getMyCharacters = (): Promise<CharacterBase[]> => {
  return fetchData<CharacterBase[]>('my');
}
