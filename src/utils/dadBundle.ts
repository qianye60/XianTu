export const DAD_BUNDLE_SCHEMA = 'dad.bundle';
export const DAD_BUNDLE_VERSION = 1 as const;

export type DadBundleType = 'settings' | 'prompts' | 'saves' | 'character' | 'start_config' | 'presets';

export interface DadBundleV1<TPayload = unknown> {
  schema: typeof DAD_BUNDLE_SCHEMA;
  version: typeof DAD_BUNDLE_VERSION;
  type: DadBundleType;
  exportedAt: string;
  appVersion?: string;
  payload: TPayload;
}

export function createDadBundle<TPayload>(
  type: DadBundleType,
  payload: TPayload,
  meta?: { appVersion?: string; exportedAt?: string },
): DadBundleV1<TPayload> {
  return {
    schema: DAD_BUNDLE_SCHEMA,
    version: DAD_BUNDLE_VERSION,
    type,
    exportedAt: meta?.exportedAt ?? new Date().toISOString(),
    appVersion: meta?.appVersion,
    payload,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function isDadBundleV1(value: unknown): value is DadBundleV1 {
  if (!isPlainObject(value)) return false;
  return value.schema === DAD_BUNDLE_SCHEMA && value.version === DAD_BUNDLE_VERSION && typeof value.type === 'string';
}

export function unwrapDadBundle(value: unknown): { type: DadBundleType | null; payload: any; isBundle: boolean } {
  if (isDadBundleV1(value)) {
    return { type: value.type, payload: value.payload, isBundle: true };
  }

  // 兼容：旧导出格式（非运行期兼容，只用于导入/迁移）
  if (isPlainObject(value) && typeof value.type === 'string') {
    const legacyType = value.type as DadBundleType;
    if (legacyType === 'saves' && Array.isArray((value as any).saves)) {
      return { type: 'saves', payload: { saves: (value as any).saves }, isBundle: false };
    }
    if (legacyType === 'character' && isPlainObject((value as any).character)) {
      // 旧角色导出格式：{ type:'character', character:{ 角色ID, 角色信息, 存档列表 } }
      return { type: 'character', payload: (value as any).character, isBundle: false };
    }
    if (legacyType === 'settings') {
      return { type: 'settings', payload: (value as any).settings ?? value, isBundle: false };
    }
    if (legacyType === 'prompts') {
      return { type: 'prompts', payload: value, isBundle: false };
    }
    if (legacyType === 'start_config') {
      return { type: 'start_config', payload: value, isBundle: false };
    }
  }

  // 兼容：旧预设导出格式 { version, exportTime, presets }
  if (isPlainObject(value) && Array.isArray((value as any).presets) && (value as any).version) {
    return { type: 'presets', payload: { presets: (value as any).presets }, isBundle: false };
  }

  // 兼容：旧提示词导出格式（直接是 Record<string, string>，没有 type 字段）
  if (isPlainObject(value) && !value.type && !value.schema) {
    // 如果对象的所有值都是字符串，可能是提示词导出
    const keys = Object.keys(value);
    if (keys.length > 0 && keys.every(k => typeof value[k] === 'string')) {
      return { type: 'prompts', payload: value, isBundle: false };
    }
  }

  // 兼容：settings 旧格式（直接就是 settings 对象）
  if (isPlainObject(value)) {
    return { type: null, payload: value, isBundle: false };
  }

  return { type: null, payload: value, isBundle: false };
}
