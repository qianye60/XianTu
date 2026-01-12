export type NsfwGenderFilter = 'all' | 'male' | 'female';

export function getNsfwSettingsFromStorage(): { nsfwMode: boolean; nsfwGenderFilter: NsfwGenderFilter } {
  try {
    const savedSettings = localStorage.getItem('dad_game_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings) as Partial<{
        enableNsfwMode: boolean;
        nsfwGenderFilter: NsfwGenderFilter;
      }>;

      return {
        nsfwMode: parsed.enableNsfwMode !== undefined ? parsed.enableNsfwMode : true,
        nsfwGenderFilter: parsed.nsfwGenderFilter || 'female',
      };
    }
  } catch {
    // ignore
  }

  return { nsfwMode: true, nsfwGenderFilter: 'female' };
}

export function ensureSystemConfigHasNsfw(systemConfig: unknown): unknown {
  const cfg: Record<string, unknown> =
    systemConfig && typeof systemConfig === 'object' ? (systemConfig as Record<string, unknown>) : {};
  const { nsfwMode, nsfwGenderFilter } = getNsfwSettingsFromStorage();

  if (cfg.nsfwMode === undefined) cfg.nsfwMode = nsfwMode;
  if (cfg.nsfwGenderFilter === undefined) cfg.nsfwGenderFilter = nsfwGenderFilter;

  return cfg;
}

export function ensureSaveDataHasTavernNsfw(saveData: unknown): unknown {
  if (!saveData || typeof saveData !== 'object') return saveData;
  const sd = saveData as Record<string, any>;

  // 兼容历史误写字段（避免出现 sd.ϵͳ 这种不可预期的键）
  if (sd['ϵͳ'] && !sd['系统']) {
    sd['系统'] = sd['ϵͳ'];
    delete sd['ϵͳ'];
  }

  const system = sd['系统'] && typeof sd['系统'] === 'object' ? sd['系统'] : {};
  system['配置'] = ensureSystemConfigHasNsfw(system['配置']);
  sd['系统'] = system;

  // Tavern(NSFW) 兜底：为“角色.身体.部位开发/部位”提供最小骨架，避免界面/变量面板找不到路径
  if ((system['配置'] as any)?.nsfwMode) {
    const role = sd['角色'] && typeof sd['角色'] === 'object' ? sd['角色'] : {};
    const body = role['身体'] && typeof role['身体'] === 'object' ? role['身体'] : {};
    if (body['部位开发'] === undefined) body['部位开发'] = {};
    if (body['部位'] === undefined) body['部位'] = {};
    role['身体'] = body;
    sd['角色'] = role;
  }

  return sd;
}
