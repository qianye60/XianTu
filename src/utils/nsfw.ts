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

    // 兜底：如果之前不是酒馆环境创建的存档，可能完全没有玩家身体数据；这里补一个“可展示”的基础骨架
    const gender = (() => {
      const identity = role['身份'] && typeof role['身份'] === 'object' ? role['身份'] : null;
      const g = identity?.性别;
      return g === '男' || g === '女' || g === '其他' ? g : undefined;
    })();

    const setIfMissing = (key: string, value: unknown) => {
      if (body[key] === undefined) body[key] = value;
    };

    if (gender === '男') {
      setIfMissing('身高', 178);
      setIfMissing('体重', 72);
      setIfMissing('体脂率', 14);
      setIfMissing('三围', { 胸围: 98, 腰围: 82, 臀围: 96 });
      setIfMissing('胸部描述', '待AI生成');
      setIfMissing('生殖器描述', '待AI生成');
    } else if (gender === '女') {
      setIfMissing('身高', 165);
      setIfMissing('体重', 52);
      setIfMissing('体脂率', 22);
      setIfMissing('三围', { 胸围: 88, 腰围: 62, 臀围: 92 });
      setIfMissing('罩杯', 'C');
      setIfMissing('胸部描述', '待AI生成');
      setIfMissing('私处描述', '待AI生成');
      setIfMissing('生殖器描述', '待AI生成');
    } else {
      setIfMissing('身高', 170);
      setIfMissing('体重', 60);
      setIfMissing('体脂率', 18);
      setIfMissing('三围', { 胸围: 90, 腰围: 70, 臀围: 90 });
      setIfMissing('胸部描述', '待AI生成');
      setIfMissing('生殖器描述', '待AI生成');
    }

    setIfMissing('外观特征', []);
    setIfMissing('敏感点', []);
    setIfMissing('开发度', {});
    setIfMissing('纹身与印记', []);
    if (body['部位开发'] === undefined) body['部位开发'] = {};
    if (body['部位'] === undefined) body['部位'] = {};
    role['身体'] = body;
    sd['角色'] = role;
  }

  return sd;
}
