/**
 * src/services/gameInitializer.ts
 * 创世引擎 - 负责处理角色创建完成后的所有初始化流程。
 */

import { getTavernHelper } from '../utils/tavern';
import { generateMapFromWorld, generateInitialMessage } from '../utils/tavernAI';
import { processGmResponse } from '../utils/AIGameMaster';
import { toast } from '../utils/toast';
import { useCharacterCreationStore } from '../stores/characterCreationStore';
import type { CharacterData, World, Origin, SpiritRoot } from '../types';
import type { LocalCharacterWithGameData, WorldInstanceData } from '../data/localData';
import { saveLocalCharacter, saveWorldInstance } from '../data/localData';
import { calculateInitialCoreAttributes } from '../utils/characterCalculation';

interface CharacterCreationPayload {
  character: LocalCharacterWithGameData;
  world: World;
  mode: 'cloud' | 'single';
  selectedOrigin: Origin | null;
  selectedSpiritRoot: SpiritRoot | null;
  // ... 其他创角过程中的选择，如天赋、出身等
}

/**
 * 天条一：铸就金身 (将最终角色数据存入正确的存档)
 * @param payload - 创角数据
 */
function finalizeCharacterData(payload: CharacterCreationPayload, onProgress: (message: string) => void): LocalCharacterWithGameData {
  onProgress('天条一：铸就金身...');
  
  // 步骤1：计算角色初始核心属性
  const coreAttributes = calculateInitialCoreAttributes({
    root_bone: payload.character.root_bone,
    spirituality: payload.character.spirituality,
    comprehension: payload.character.comprehension,
    fortune: payload.character.fortune,
    charm: payload.character.charm,
    temperament: payload.character.temperament,
  });

  // 将计算出的属性和年龄合入角色数据
  const finalCharacter: LocalCharacterWithGameData = {
    ...payload.character,
    ...coreAttributes,
    birth_age: payload.character.birth_age || 18,
  };
  
  console.log('【神识印记】角色法身数据计算完成:', finalCharacter);
  return finalCharacter;
}

/**
 * 天条二：开辟洞天 (写入世界书)
 * @param world - 世界数据
 */
async function writeToLorebook(world: World, onProgress: (message: string) => void): Promise<void> {
  onProgress('天条二：开辟洞天...');
  
  const helper = getTavernHelper();
  if (!helper) {
    toast.error('连接酒馆失败，无法铭刻世界法则。');
    throw new Error('TavernHelper not available');
  }

  const LOREBOOK_NAME = '大道朝天';
  const ENTRY_KEY = '【世界】'; //遵从您的最新法旨，修正条目名称
  const content = world.description || '一片混沌，待修士开辟。';

  try {
    // 1. 检查世界书是否存在，不存在则创建
    const lorebooks = await helper.getLorebooks();
    if (!lorebooks.includes(LOREBOOK_NAME)) {
      await helper.createLorebook(LOREBOOK_NAME);
      console.log(`已创建世界书：《${LOREBOOK_NAME}》`);
    }

    // 2. 检查是否已存在同名条目
    const entries = await helper.getLorebookEntries(LOREBOOK_NAME);
    const existingEntry = entries.find((entry: any) => entry.comment === ENTRY_KEY || (entry.keys && entry.keys.includes(ENTRY_KEY)));

    if (existingEntry) {
      // 3. 更新现有条目
      console.log(`找到已存在条目，UID: ${existingEntry.uid}，进行更新。`);
      await helper.setLorebookEntries(LOREBOOK_NAME, [{
        uid: existingEntry.uid,
        content: content,
        // 根据 types.d.ts，使用 type: 'constant'
        type: 'constant',
        order: 10,
      }]);
    } else {
      // 4. 创建新条目
      console.log('未找到条目，进行创建。');
      await helper.createLorebookEntries(LOREBOOK_NAME, [{
        comment: ENTRY_KEY,
        keys: [ENTRY_KEY],
        content: content,
        enabled: true,
        type: 'constant',
        order: 10,
        position: 'before_character_definition',
      }]);
    }
    
    toast.success(`新的世界法则“${ENTRY_KEY}”已成功铭刻于《${LOREBOOK_NAME}》`);
  } catch (error) {
    console.error('写入世界书失败:', error);
    toast.error('世界书铭刻失败，请检查与酒馆的连接。');
    throw error;
  }
}

/**
 * 天条三：衍化山河 (生成地图)
 * @param world - 当前的世界数据
 */
async function generateWorldMap(world: World, onProgress: (message: string) => void): Promise<any> {
  onProgress('天条三：衍化山河...');
  try {
    const geoJsonData = await generateMapFromWorld(world);
    if (!geoJsonData) throw new Error('AI未能返回有效的地图数据。');
    
    console.log('【玄光镜】地图数据已从天机阁获取');
    toast.success('世界舆图已衍化。');
    return geoJsonData;
  } catch (error) {
    console.error('生成地图失败:', error);
    toast.error('衍化山河失败，天机阁无响应。');
    throw error;
  }
}

/**
 * 天条四：天道初言 (生成首条消息并更新状态)
 * @param character - 最终的角色数据
 * @param mapData - 地图数据
 * @param payload - 完整的创角数据，用于获取细节
 */
async function generateFirstEncounter(character: LocalCharacterWithGameData, mapData: any, payload: CharacterCreationPayload, onProgress: (message: string) => void): Promise<void> {
  onProgress('天条四：天道初言...');
  const creationStore = useCharacterCreationStore();
  try {
    // 从 payload 中获取准确的出身和灵根名称
    const creationDetails = {
      age: character.birth_age || 18,
      originName: payload.selectedOrigin?.name || '未知出身',
      spiritRootName: payload.selectedSpiritRoot?.name || '凡人灵根',
    };
    const gmResponse = await generateInitialMessage(character, creationDetails, mapData);

    if (gmResponse && gmResponse.text) {
      await processGmResponse(gmResponse, character);
      
      // **【记录天道之音】**
      creationStore.setInitialGameMessage(gmResponse.text);

      toast.success('天道初言已降下，修行正式开始！');
    } else {
      throw new Error('AI未能生成有效的初始消息。');
    }
  } catch (error) {
    console.error('生成首条消息失败:', error);
    toast.error('天道初言失败，天机紊乱。');
    throw error;
  }
}


/**
 * 创世引擎主函数
 * @param payload - 从角色创建流程中获取的完整数据
 */
export async function initializeGameSession(payload: CharacterCreationPayload, onProgress: (message: string) => void): Promise<void> {
  try {
    const creationStore = useCharacterCreationStore();
    console.log('【神识印记】创世引擎启动...');
    console.log('【神识印记】初始payload:', JSON.parse(JSON.stringify(payload)));

    // --- 步骤一：天机演算，补完随机选项 ---
    onProgress('天机演算：定格命数...');
    if (payload.selectedOrigin === null) {
      const totalTalentPoints = creationStore.selectedTalentTier?.total_points || 0;
      const availableOrigins = creationStore.creationData.origins.filter(o => o.talent_cost <= totalTalentPoints);
      payload.selectedOrigin = availableOrigins.length > 0
        ? availableOrigins[Math.floor(Math.random() * availableOrigins.length)]
        : creationStore.creationData.origins[0];
      toast.success(`天意已决，你的出身为【${payload.selectedOrigin.name}】！`);
    }
    if (payload.selectedSpiritRoot === null) {
      const remainingPoints = creationStore.remainingTalentPoints + (payload.selectedOrigin?.talent_cost || 0);
      const availableRoots = creationStore.creationData.spiritRoots.filter(r => r.talent_cost <= remainingPoints);
      payload.selectedSpiritRoot = availableRoots.length > 0
        ? availableRoots[Math.floor(Math.random() * availableRoots.length)]
        : creationStore.creationData.spiritRoots[0];
      toast.success(`天意已决，你的灵根为【${payload.selectedSpiritRoot.name}】！`);
    }
    payload.character.creationChoices = {
      ...payload.character.creationChoices,
      origin: payload.selectedOrigin,
      spiritRoot: payload.selectedSpiritRoot,
    };

    // --- 步骤二：铸就金身，计算最终属性 ---
    const characterWithoutMap = finalizeCharacterData(payload, onProgress);
    console.log('【神识印记】完成 [天条一：铸就金身]，角色数据:', characterWithoutMap);

    // --- 步骤三：开辟洞天，写入世界书 ---
    await writeToLorebook(payload.world, onProgress);
    console.log('【神识印记】完成 [天条二：开辟洞天]。');

    // --- 步骤四：衍化山河，生成地图 ---
    const mapData = await generateWorldMap(payload.world, onProgress);
    console.log('【神识印记】完成 [天条三：衍化山河]，地图数据:', mapData);

    // --- 步骤五：开辟坤舆，独立存档世界数据 ---
    onProgress('开辟坤舆：固化世界法则...');
    const worldInstance: WorldInstanceData = {
      id: payload.world.id,
      continentName: null, // TODO: 将来由AI生成
      continentDescription: null, // TODO: 将来由AI生成
      factions: [], // TODO: 将来由AI生成
      mapInfo: mapData,
    };
    await saveWorldInstance(worldInstance);
    toast.success('坤舆图志已开辟，此方世界法则已固化！');
    console.log('【神识印记】世界实例已存档:', worldInstance);
    
    // --- 步骤六：铭刻法身，存档纯粹角色数据 ---
    onProgress('铭刻法身：天命入体...');
    await saveLocalCharacter(characterWithoutMap);
    toast.success('法身已铭刻于酒馆洞天！');
    console.log('【神识印记】纯粹角色数据已存档:', characterWithoutMap);

    // --- 步骤七：昭告天地，同步状态至Chat ---
    try {
      console.log('开始同步角色状态至当前天地(chat)...');
      const helper = getTavernHelper();
      await helper.insertOrAssignVariables({
        character: {
          name: characterWithoutMap.character_name,
          realm: characterWithoutMap.realm,
          hp: characterWithoutMap.hp, hp_max: characterWithoutMap.hp_max,
          mana: characterWithoutMap.mana, mana_max: characterWithoutMap.mana_max,
          spirit: characterWithoutMap.spirit, spirit_max: characterWithoutMap.spirit_max,
          lifespan: characterWithoutMap.lifespan,
          origin: characterWithoutMap.creationChoices.origin?.name,
          spiritRoot: characterWithoutMap.creationChoices.spiritRoot?.name,
        }
      }, { type: 'chat' });
      toast.success('角色状态已昭告当前天地！');
    } catch (error) {
        console.error('同步角色状态至chat变量失败:', error);
        toast.error('昭告天地失败，天机混乱。');
    }

    // --- 步骤八：天道初言，生成初始消息 ---
    await generateFirstEncounter(characterWithoutMap, mapData, payload, onProgress);
    console.log('【神识印记】完成 [天条四：天道初言]。');

    // --- 最终环节：完成创世 ---
    onProgress('创世完成！欢迎来到修仙世界。');
    creationStore.setMapData(mapData);
    console.log('【神识印记】创世流程全部成功完成。');
    await new Promise(resolve => setTimeout(resolve, 1500));

  } catch (error) {
    console.error("【神识印记】创世流程发生严重错误:", error);
    toast.error("创世失败，请打开控制台检查神识印记。");
    throw error;
  }
}