export function buildOpenAICompatibleUrl(baseUrl: string, path: string): string {
  const base = (baseUrl || '').replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  try {
    const parsed = new URL(base);
    const pathname = (parsed.pathname || '').replace(/\/+$/, '');
    const hasVersion = /\/v\d+$/i.test(pathname);
    const finalPath = hasVersion ? `${pathname}${normalizedPath}` : `${pathname}/v1${normalizedPath}`;
    parsed.pathname = finalPath;
    parsed.search = '';
    return parsed.toString();
  } catch {
    const hasVersion = /\/v\d+$/i.test(base);
    const prefix = hasVersion ? '' : '/v1';
    return `${base}${prefix}${normalizedPath}`;
  }
}
