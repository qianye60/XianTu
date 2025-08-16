/**
 * 酒馆AI通信法门
 * 用于与酒馆助手的AI生成功能进行交互
 */

import type { World, Origin, TalentTier, SpiritRoot, Talent } from '../stores/characterCreationStore';
import { toast } from './toast';

// 定义TavernHelper的接口，与 types.d.ts 保持一致
type RolePrompt = {
    role: 'system' | 'assistant' | 'user';
    content: string;
};

type BuiltinPrompt =
  | 'world_info_before'
  | 'persona_description'
  | 'char_description'
  | 'char_personality'
  | 'scenario'
  | 'world_info_after'
  | 'dialogue_examples'
  | 'chat_history'
  | 'user_input';

interface GenerateRawConfig {
  should_stream?: boolean;
  ordered_prompts?: (BuiltinPrompt | RolePrompt)[];
}

interface TavernHelper {
  generateRaw: (config: GenerateRawConfig) => Promise<string>;
}

// 检查是否在酒馆环境中
// 由于应用运行在iframe中，需要从parent访问TavernHelper
export function isTavernEnvironment(): boolean {
  try {
    // 检查parent window（酒馆助手的前端渲染是在iframe中）
    if (typeof window !== 'undefined' && window.parent && (window.parent as any).TavernHelper !== undefined) {
      return true;
    }
    // 备用：检查当前window
    if (typeof window !== 'undefined' && (window as any).TavernHelper !== undefined) {
      return true;
    }
    return false;
  } catch {
    // 可能因为跨域等原因无法访问parent
    return false;
  }
}

// 获取酒馆助手实例
// 由于应用运行在iframe中，需要从parent获取TavernHelper
function getTavernHelper(): TavernHelper | null {
  try {
    // 优先从parent window获取（酒馆助手的前端渲染是在iframe中）
    if (typeof window !== 'undefined' && window.parent && (window.parent as any).TavernHelper !== undefined) {
      return (window.parent as any).TavernHelper;
    }
    // 备用：从当前window获取
    if (typeof window !== 'undefined' && (window as any).TavernHelper !== undefined) {
      return (window as any).TavernHelper;
    }
    console.warn('未检测到酒馆环境，AI功能不可用。');
    return null;
  } catch {
    console.warn('无法访问酒馆环境，可能存在跨域问题。');
    return null;
  }
}

/**
 * 统一的AI生成调用
 * @param prompt 提示词
 * @returns AI生成的原始文本
 */
async function callTavernGenerate(prompt: string): Promise<string> {
    const TavernHelper = getTavernHelper();
    if (!TavernHelper) {
        throw new Error('非酒馆环境，无法连接至AI。请在SillyTavern环境中运行此扩展。');
    }

    if (typeof TavernHelper.generateRaw !== 'function') {
        throw new Error('当前环境的 TavernHelper 不支持 generateRaw 方法。');
    }

    const config = {
        should_stream: false,
        ordered_prompts: [{ role: 'user' as const, content: prompt }],
    };

    try {
        const result = await TavernHelper.generateRaw(config);

        if (typeof result !== 'string' || result.trim() === '') {
            throw new Error('AI返回结果为空或格式不正确。');
        }
        return result;
    } catch (error) {
        console.error('调用 TavernHelper.generateRaw 失败:', error);
        throw new Error(`调用AI生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * 解析AI返回的JSON
 * @param result AI返回的原始字符串
 * @returns 解析后的对象
 */
function parseAIResponse(result: string): Record<string, any> {
    try {
        // AI可能返回被```json ... ```包裹的代码块，需要提取出来
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('未在AI返回中找到有效的JSON格式');
    } catch (parseError) {
        console.error('解析AI返回结果失败:', result, parseError);
        toast.error(`天机解析失败: ${parseError instanceof Error ? parseError.message : '未知错误'}`);
        throw new Error('天机解析失败，请检查AI返回格式或重试');
    }
}

// --- 后备函数，仅在AI生成或解析彻底失败时调用 ---

function createFallbackWorld(): World {
  toast.error('AI生成世界失败，已启用后备数据。');
  return { id: Date.now(), name: '幻梦界', era: '混沌初开', description: '一片由忆念与道则交织而成的虚幻之界。' };
}

function createFallbackOrigin(): Origin {
  toast.error('AI生成出身失败，已启用后备数据。');
  return { id: Date.now(), name: '山野之人', description: '天机难测，暂为山野之人。', talent_cost: 0, attribute_modifiers: null };
}

function createFallbackTalentTier(): TalentTier {
  toast.error('AI生成天资失败，已启用后备数据。');
  return { id: Date.now(), name: '凡夫俗子', description: '天机难测，暂为凡俗之辈。', total_points: 10, color: '#808080', rarity: 0 };
}

function createFallbackSpiritRoot(): SpiritRoot {
  toast.error('AI生成灵根失败，已启用后备数据。');
  return { id: Date.now(), name: '凡品灵根', description: '天机难测，暂为凡品灵根。', base_multiplier: 1.0, talent_cost: 0 };
}

function createFallbackTalent(): Talent {
  toast.error('AI生成天赋失败，已启用后备数据。');
  return { id: Date.now(), name: '平平无奇', description: '天机难测，此乃凡俗天赋。', talent_cost: 0, effects: null, rarity: 1 };
}

// --- AI Generation Functions ---

export async function generateWorldWithTavernAI(): Promise<World> {
  const prompt = `请为一款修仙主题应用生成一个独特的世界设定。要求：1. 世界名称：大气磅礴，2-6个字。2. 时代背景：简短描述。3. 描述：200-600字。请严格按照以下JSON格式返回，不要包含任何额外文本或解释：\n{\n  "name": "世界名称",\n  "era": "时代背景",\n  "description": "详细的世界描述"\n}`;
  try {
    const result = await callTavernGenerate(prompt);
    const parsed = parseAIResponse(result);
    return { id: Date.now(), name: parsed.name, era: parsed.era, description: parsed.description };
  } catch (error) {
    console.error('AI生成世界失败:', error);
    return createFallbackWorld();
  }
}

export async function generateOriginWithTavernAI(world: World): Promise<Origin> {
  const prompt = `在一个名为【${world.name}】(${world.era})的修仙世界中，为角色生成一个独特的出身背景。要求：1. 出身名称：2-6个字。2. 描述：50-150字，与世界背景相关。3. 消耗天道点：0到15的整数。请严格按照以下JSON格式返回，不要包含任何额外文本或解释：\n{\n  "name": "出身名称",\n  "description": "详细的出身描述",\n  "talent_cost": 整数\n}`;
  try {
    const result = await callTavernGenerate(prompt);
    const parsed = parseAIResponse(result);
    return { id: Date.now(), name: parsed.name, description: parsed.description, talent_cost: parsed.talent_cost, attribute_modifiers: null };
  } catch (error) {
    console.error('AI生成出身失败:', error);
    return createFallbackOrigin();
  }
}

export async function generateTalentTierWithTavernAI(): Promise<TalentTier> {
  const prompt = `请为一款修仙主题应用生成一个独特的天资等级。要求：1. 名称：2-4个字。2. 描述：50-150字。3. 天道点：5到30的整数。4. 辉光颜色：十六进制颜色码。请严格按照以下JSON格式返回，不要包含任何额外文本或解释：\n{\n  "name": "天资名称",\n  "description": "详细的天资描述",\n  "total_points": 整数,\n  "color": "十六进制颜色码"\n}`;
  try {
    const result = await callTavernGenerate(prompt);
    const parsed = parseAIResponse(result);
    return { id: Date.now(), name: parsed.name, description: parsed.description, total_points: parsed.total_points, color: parsed.color, rarity: 0 };
  } catch (error) {
    console.error('AI生成天资失败:', error);
    return createFallbackTalentTier();
  }
}

export async function generateSpiritRootWithTavernAI(): Promise<SpiritRoot> {
  const prompt = `请为一款修仙主题应用生成一个独特的灵根。要求：1. 名称：2-4个字。2. 描述：50-150字。3. 修炼倍率：1.0到3.0之间，最多一位小数。4. 消耗天道点：0到20的整数。请严格按照以下JSON格式返回，不要包含任何额外文本或解释：\n{\n  "name": "灵根名称",\n  "description": "详细的灵根描述",\n  "base_multiplier": 数字,\n  "talent_cost": 整数\n}`;
  try {
    const result = await callTavernGenerate(prompt);
    const parsed = parseAIResponse(result);
    return { id: Date.now(), name: parsed.name, description: parsed.description, base_multiplier: parsed.base_multiplier, talent_cost: parsed.talent_cost };
  } catch (error) {
    console.error('AI生成灵根失败:', error);
    return createFallbackSpiritRoot();
  }
}

export async function generateTalentWithTavernAI(): Promise<Talent> {
  const prompt = `请为一款修仙主题应用生成一个独特的天赋。要求：1. 名称：2-4个字。2. 描述：50-150字。3. 消耗天道点：0到10的整数。请严格按照以下JSON格式返回，不要包含任何额外文本或解释：\n{\n  "name": "天赋名称",\n  "description": "详细的天赋描述",\n  "talent_cost": 整数\n}`;
  try {
    const result = await callTavernGenerate(prompt);
    const parsed = parseAIResponse(result);
    return { id: Date.now(), name: parsed.name, description: parsed.description, talent_cost: parsed.talent_cost, effects: null, rarity: 1 };
  } catch (error) {
    console.error('AI生成天赋失败:', error);
    return createFallbackTalent();
  }
}

// --- Validation Function ---

export function validateCustomData(type: 'world' | 'origin' | 'talent_tier' | 'spirit_root' | 'talent', data: Record<string, any>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name || String(data.name).trim().length === 0) {
    errors.push('名称不能为空');
  } else if (String(data.name).length > 20) {
    errors.push('名称不能超过20个字符');
  }

  if (!data.description || String(data.description).trim().length === 0) {
    errors.push('描述不能为空');
  } else if (String(data.description).length > 500) {
    errors.push('描述不能超过500个字符');
  }

  if (type === 'world' && (!data.era || String(data.era).trim().length === 0)) {
      errors.push('时代背景不能为空');
  }

  if (type === 'talent_tier') {
    if (data.total_points == null || isNaN(parseInt(data.total_points, 10))) {
      errors.push('天道点必须是有效的数字');
    }
    if (!data.color || !/^#[0-9A-Fa-f]{6}$/i.test(data.color)) {
      errors.push('请输入有效的十六进制颜色代码 (例如: #FFD700)');
    }
  }

  if (type === 'spirit_root') {
    if (data.base_multiplier == null || isNaN(parseFloat(data.base_multiplier))) {
      errors.push('修炼倍率必须是有效的数字');
    }
  }

  if (type === 'origin' || type === 'spirit_root' || type === 'talent') {
      if (data.talent_cost == null || isNaN(parseInt(data.talent_cost, 10))) {
          errors.push('天道点消耗必须是有效的数字');
      }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
