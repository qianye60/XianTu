import type { WorldState, Character } from '@/core/rules/characterCreation'
import { saveCharacter as saveCharacterToApi } from './api'

interface SillyTavernWindow extends Window {
  SillyTavern: {
    name1: string
    // other SillyTavern properties
  }
  TavernHelper: any
}

// Make this function available to other modules.
export const getTavernEnv = () => {
  const global = window as unknown as SillyTavernWindow
  return {
    SillyTavern: global.SillyTavern,
    helper: global.TavernHelper,
  }
}

export const getUserInfo = async (): Promise<{ name: string }> => {
  const env = getTavernEnv()
  // In SillyTavern, user name is stored in name1
  if (env.SillyTavern && env.SillyTavern.name1) {
    const userName = env.SillyTavern.name1
    console.log(`Fetched user name: ${userName}`)
    return { name: userName }
  } else {
    // Fallback for development outside of SillyTavern
    console.log('SillyTavern environment not detected, using mock user name.')
    return { name: '模拟道友' }
  }
}

export const saveWorldState = async (worldState: WorldState): Promise<void> => {
  if (!worldState.character) {
    console.error('Cannot save world state, character data is missing.')
    return
  }

  try {
    const userInfo = await getUserInfo()
    const characterSheet = worldState.character

    // Construct the payload according to the Character interface for the API
    const characterPayload: Character = {
      userName: userInfo.name,
      name: characterSheet.name,
      origin: characterSheet.origin,
      // API expects Talent[], not CharacterTalent[], so we map it.
      talents: characterSheet.talents.map(({ id, name, description }) => ({
        id,
        name,
        description,
      })),
      spiritRoot: characterSheet.spiritRoot,
      attributes: characterSheet.attributes,
    }

    // Call the new API function
    const response = await saveCharacterToApi(characterPayload)
    console.log('Character saved to database successfully:', response.message)

    // We can still save to SillyTavern as a backup or for other extension interactions
    const env = getTavernEnv()
    if (env.helper) {
      await env.helper.insertOrAssignVariables({ world: worldState }, { type: 'chat' })
      console.log('World state also saved to SillyTavern variables.')
    }
  } catch (error) {
    console.error('Failed to save character to database:', error)
  }
}

/**
 * 创建或更新一条世界设定（World Info）。
 * Creates or updates a World Info entry.
 * @param entry - The World Info entry to create or update.
 * @param entry.key - The keyword for the entry.
 * @param entry.content - The content/description of the entry.
 */
export const upsertWorldInfoEntry = async (entry: {
  key: string
  content: string
}): Promise<void> => {
  const env = getTavernEnv()
  if (env.helper && typeof env.helper.addWorldEntry === 'function') {
    // SillyTavern's addWorldEntry handles both creation and update if the key exists.
    // We'll also add a unique prefix to avoid conflicts with user-created entries.
    const prefixedKey = `[CSX]${entry.key}`
    await env.helper.addWorldEntry({
      key: prefixedKey,
      content: entry.content,
      // 'selective' and 'constant' are important flags for how WI is injected.
      selective: true,
      constant: true,
    })
    console.log(`【世界之笔】已将记忆烙印于天地: ${prefixedKey}`)
  } else {
    console.warn('【世界之笔】无法找到 addWorldEntry 法门，跳过世界设定更新。')
  }
}

/**
 * 将世界书的完整内容同步到一条固定的世界设定中。
 * @param content The full content of the world book.
 */
export const syncWorldBook = async (content: string): Promise<void> => {
  await upsertWorldInfoEntry({
    key: 'DefaultWorldBook', // 使用一个固定的，易于识别的Key
    content: content,
  })
  console.log('【乾坤挪移】世界书已同步至天地法则。')
}

/**
 * Checks if the current environment is within SillyTavern by looking for the TavernHelper.
 * @returns {boolean} True if the TavernHelper global is present.
 */
export const isTavernEnvironment = (): boolean => {
  const env = getTavernEnv()
  return !!env.helper
}

/**
 * 监听酒馆内的消息流。
 * Listens to the message stream inside SillyTavern.
 * @param callback The function to execute when a new message arrives.
 */
export const onMessageStream = (callback: (message: any) => void): void => {
  const env = getTavernEnv()
  if (env.helper && typeof env.helper.on === 'function') {
    console.log('【天地祭坛】已连接，开始监听“chat-message”事件。')
    env.helper.on('chat-message', callback)
  } else {
    // 在非酒馆环境下，可以设置一个定时器模拟消息，便于调试
    // console.warn('TavernHelper or "on" method not available for message streaming. Faking messages for debug.');
    // setInterval(() => {
    //   callback({ name: 'AI', is_user: false, mes: '这只是一条模拟的AI消息。' });
    // }, 15000);
  }
}
