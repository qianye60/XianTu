import { generateWithRawPrompt } from '@/utils/tavernCore';
import { getPrompt } from '@/services/defaultPrompts';
import type { SaveData, GameTime, GameEvent, NpcProfile, WorldInfo } from '@/types/game';
import { parseJsonFromText } from '@/utils/jsonExtract';
import { SPECIAL_NPCS } from '@/data/specialNpcs';

type EventGenerationResult = {
  event: GameEvent;
  prompt_addition: string;
};

const buildEventId = () => `event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

type SpecialNpcEventGenerationResult = EventGenerationResult & {
  npcProfile: NpcProfile;
  npcId: string;
};

type SpecialNpcEventAiResponse = {
  selected_id: string;
  event_story: string;
  event_name?: string;
  event_type?: string;
};

function inferSpecialNpcSceneTags(args: { worldInfo?: WorldInfo | null; locationDesc?: string; worldName?: string }): string[] {
  const worldBackground = String(args.worldInfo?.世界背景 ?? '');
  const worldEra = String(args.worldInfo?.世界纪元 ?? '');
  const worldName = String(args.worldName ?? args.worldInfo?.世界名称 ?? '');
  const loc = String(args.locationDesc ?? '');
  const text = `${worldBackground}\n${worldEra}\n${worldName}\n${loc}`;

  const tags = new Set<string>();

  const has = (...keys: string[]) => keys.some((k) => text.includes(k));
  if (has('地球', '现代', '都市', '学校', '大学', '高中')) {
    tags.add('earth');
    tags.add('modern');
  }
  if (has('学校', '大学', '高中', '校园')) tags.add('campus');
  if (has('城', '坊市', '市', '街', '商会')) tags.add('city');

  if (has('修仙', '灵气', '宗门', '秘境', '洞府', '坊市', '仙', '道')) tags.add('xianxia');
  if (has('宗门', '山门', '内门', '外门', '长老')) tags.add('sect');
  if (has('江湖', '游侠', '散修', '客栈')) tags.add('jianghu');

  return Array.from(tags);
}

function pickCandidates(args: { saveData: SaveData; now: GameTime }): typeof SPECIAL_NPCS {
  const saveData = args.saveData as any;
  const rel = (saveData?.社交?.关系 ?? {}) as Record<string, any>;
  const usedIds = new Set<string>();
  const usedNames = new Set<string>(Object.keys(rel || {}));
  for (const v of Object.values(rel || {})) {
    if (v && typeof v === 'object') {
      const id = (v as any).扩展?.specialNpcId;
      if (typeof id === 'string' && id.trim()) usedIds.add(id.trim());
    }
  }

  const worldInfo = (saveData?.世界?.信息 ?? null) as WorldInfo | null;
  const locationDesc = String(saveData?.角色?.位置?.描述 ?? '');
  const tags = inferSpecialNpcSceneTags({ worldInfo, locationDesc });

  const available = SPECIAL_NPCS.filter((d) => !usedIds.has(d.id) && !usedNames.has(d.displayName));
  if (available.length === 0) return [];

  const matches = available.filter((d) => d.sceneTags.some((t) => tags.includes(t)));
  const pool = matches.length ? matches : available;

  // 随机抽取少量候选，避免提示词过长
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 6);
}

export async function generateSpecialNpcEvent(args: {
  saveData: SaveData;
  now: GameTime;
  customPrompt?: string;
}): Promise<SpecialNpcEventGenerationResult | null> {
  try {
    const { saveData, now, customPrompt } = args;
    const anySave = saveData as any;

    const candidates = pickCandidates({ saveData, now });
    // 如果没有可用的特殊NPC候选，返回null让调用方回退到普通世界事件
    if (!candidates.length) {
      console.log('[特殊NPC事件] 无可用候选NPC，将回退到普通世界事件');
      return null;
    }

    const playerName =
      anySave?.角色?.身份?.名字 ||
      anySave?.角色?.名字 ||
      '无名修士';

    const realmName = anySave?.角色?.属性?.境界?.名称 || '凡人';
    const realmStage = anySave?.角色?.属性?.境界?.阶段 || '';
    const locationDesc = String(anySave?.角色?.位置?.描述 || '未知');
    const worldInfo = (anySave?.世界?.信息 ?? null) as WorldInfo | null;

    const candidateText = candidates
      .map((c) => {
        const persona = String(c.personaPrompt || '').trim();
        const clippedPersona = persona.length > 260 ? persona.slice(0, 260) + '…' : persona;
        return `- id: ${c.id}\n  名称: ${c.displayName}\n  标签: ${c.sceneTags.join(',')}\n  人设: ${clippedPersona}`;
      })
      .join('\n\n');

    const extra = customPrompt && String(customPrompt).trim() ? `\n\n## 额外要求\n${String(customPrompt).trim()}` : '';

    const prompt = `
# 任务：生成“特殊NPC登场”世界事件（酒馆端专属）
你需要从候选列表中选择**最适合当前场景**的一位【特殊NPC/定制人物】，并写出一段“刚刚发生”的登场事件快照。
要求：
- 只允许从候选 id 中选择（输出 selected_id）
- 事件要有现场感，不要公告式总结
- 事件应让玩家在后续叙事中自然遇见/结识该NPC（但不要写成强制绑定/无条件跟随）
- 事件文本 80-180 字，简短但有信息密度

输出 JSON（不要代码块/解释/额外文本）：
{
  "selected_id": "string",
  "event_story": "string",
  "event_name": "string (可选)",
  "event_type": "人物风波|势力变动|世界变革|string (可选)"
}

---

# 当前状态
- 时间: ${now.年}年${now.月}月${now.日}日 ${String(now.小时).padStart(2, '0')}:${String(now.分钟).padStart(2, '0')}
- 玩家: ${playerName}
- 境界: ${realmName}${realmStage ? '-' + realmStage : ''}
- 位置: ${locationDesc}
- 世界: ${String(worldInfo?.世界名称 || '未知')}
- 世界背景: ${String(worldInfo?.世界背景 || '').slice(0, 200)}
- 世界纪元: ${String(worldInfo?.世界纪元 || '').slice(0, 200)}

# 候选特殊NPC
${candidateText}
${extra}
    `.trim();

    const raw = await generateWithRawPrompt('生成特殊NPC登场事件', prompt, false, 'event_generation');
    const parsed = parseJsonFromText(raw) as Partial<SpecialNpcEventAiResponse>;

    const selectedId = String((parsed as any)?.selected_id || '').trim();
    const eventStory = String((parsed as any)?.event_story || '').trim();
    if (!selectedId || !eventStory) return null;

    const selected = candidates.find((c) => c.id === selectedId);
    if (!selected) return null;

    const npcProfile = selected.createProfile({
      now,
      playerLocationDesc: locationDesc,
      worldInfo,
    });

    const eventName = String((parsed as any)?.event_name || `异人现世·${npcProfile.名字}`).trim();
    const eventType = String((parsed as any)?.event_type || '人物风波').trim();

    const event: GameEvent = {
      事件ID: buildEventId(),
      事件名称: eventName || `异人现世·${npcProfile.名字}`,
      事件类型: eventType || '人物风波',
      事件描述: eventStory,
      影响等级: '轻微',
      影响范围: '局部',
      相关人物: [npcProfile.名字],
      事件来源: '系统',
      发生时间: now,
    };

    return {
      npcProfile,
      npcId: selected.id,
      event,
      prompt_addition: eventStory,
    };
  } catch (error) {
    console.error('[特殊NPC事件生成] 生成失败:', error);
    return null;
  }
}

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
