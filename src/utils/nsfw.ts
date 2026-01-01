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
    systemConfig && typeof systemConfig === 'object'
      ? (systemConfig as Record<string, unknown>)
      : {};
  const { nsfwMode, nsfwGenderFilter } = getNsfwSettingsFromStorage();

  if (cfg.nsfwMode === undefined) cfg.nsfwMode = nsfwMode;
  if (cfg.nsfwGenderFilter === undefined) cfg.nsfwGenderFilter = nsfwGenderFilter;

  return cfg;
}

export function ensureSaveDataHasTavernNsfw(saveData: unknown): unknown {
  if (!saveData || typeof saveData !== 'object') return saveData;
  const sd = saveData as Record<string, unknown>;
  sd.系统 = ensureSystemConfigHasNsfw(sd.系统);
  return sd;
}
