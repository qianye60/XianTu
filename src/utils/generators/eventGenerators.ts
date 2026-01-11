import { generateWithRawPrompt } from '@/utils/tavernCore';
import { getPrompt } from '@/services/defaultPrompts';
import type { SaveData, GameTime, GameEvent } from '@/types/game';
import { parseJsonFromText } from '@/utils/jsonExtract';

type EventGenerationResult = {
  event: GameEvent;
  prompt_addition: string;
};

const buildEventId = () => `event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export async function generateWorldEvent(args: {
  saveData: SaveData;
  now: GameTime;
  customPrompt?: string;
}): Promise<EventGenerationResult | null> {
  try {
    const { saveData, now, customPrompt } = args;

    const playerName =
      (saveData as any)?.角色?.身份?.名字 ||
      (saveData as any)?.角色?.名字 ||
      '无名修士';

    const realmName = (saveData as any)?.角色?.属性?.境界?.名称 || '凡人';
    const realmStage = (saveData as any)?.角色?.属性?.境界?.阶段 || '';
    const locationDesc = (saveData as any)?.角色?.位置?.描述 || '未知';
    const reputation = Number((saveData as any)?.角色?.属性?.声望 ?? 0);

    const relations = (saveData as any)?.社交?.关系 || {};
    const relationList = Object.values(relations)
      .filter((n: any) => n && typeof n === 'object')
      .map((n: any) => ({
        名字: String(n.名字 || ''),
        与玩家关系: String(n.与玩家关系 || ''),
        好感度: Number(n.好感度 ?? 0),
        境界: n.境界 ? `${n.境界.名称 || ''}${n.境界.阶段 ? '-' + n.境界.阶段 : ''}` : '',
      }))
      .filter((n: any) => n.名字)
      .sort((a: any, b: any) => b.好感度 - a.好感度)
      .slice(0, 6);

    const promptTemplate = (await getPrompt('eventGeneration')).trim();
    const extra = customPrompt && String(customPrompt).trim() ? `\n\n## 额外要求\n${String(customPrompt).trim()}` : '';

    const context = `
# 当前状态
- 时间: ${now.年}年${now.月}月${now.日}日 ${String(now.小时).padStart(2, '0')}:${String(now.分钟).padStart(2, '0')}
- 玩家: ${playerName}
- 境界: ${realmName}${realmStage ? '-' + realmStage : ''}
- 位置: ${locationDesc}
- 声望: ${reputation}

# 玩家关系（好感度Top）
${relationList.length ? relationList.map(r => `- ${r.名字} | 关系:${r.与玩家关系 || '未知'} | 好感:${r.好感度} | 境界:${r.境界 || '未知'}`).join('\n') : '- （暂无）'}
`.trim();

    const finalPrompt = `${promptTemplate}\n\n---\n\n${context}${extra}`.trim();

    const raw = await generateWithRawPrompt('生成一个会影响玩家的世界事件', finalPrompt, false, 'event_generation');
    const parsed = parseJsonFromText(raw) as Partial<EventGenerationResult>;

    const event = (parsed as any)?.event;
    const prompt_addition = String((parsed as any)?.prompt_addition || '').trim();
    if (!event || typeof event !== 'object') return null;
    if (!prompt_addition) return null;

    const normalized: GameEvent = {
      事件ID: String((event as any).事件ID || buildEventId()),
      事件名称: String((event as any).事件名称 || '无名事件'),
      事件类型: String((event as any).事件类型 || '世界变革'),
      事件描述: String((event as any).事件描述 || prompt_addition),
      影响等级: (event as any).影响等级 ? String((event as any).影响等级) : undefined,
      影响范围: (event as any).影响范围 ? String((event as any).影响范围) : undefined,
      相关人物: Array.isArray((event as any).相关人物) ? (event as any).相关人物.map((x: any) => String(x)).filter(Boolean) : undefined,
      相关势力: Array.isArray((event as any).相关势力) ? (event as any).相关势力.map((x: any) => String(x)).filter(Boolean) : undefined,
      事件来源: String((event as any).事件来源 || '随机'),
      发生时间: now,
    };

    return { event: normalized, prompt_addition };
  } catch (error) {
    console.error('[事件生成] 生成失败:', error);
    return null;
  }
}

