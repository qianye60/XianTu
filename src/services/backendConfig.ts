export function normalizeBackendUrl(input: string): string {
  if (!input) return '';
  let url = input.trim();
  if (!url) return '';
  url = url.replace(/\/api\/v1\/?$/i, '');
  url = url.replace(/\/+$/, '');
  return url;
}

export function getBackendServerUrl(): string {
  if (typeof BACKEND_BASE_URL === 'string') {
    return normalizeBackendUrl(BACKEND_BASE_URL);
  }
  return '';
}

export function isBackendConfigured(): boolean {
  return !!getBackendServerUrl();
}

export function buildBackendUrl(path: string): string {
  const baseUrl = getBackendServerUrl();
  if (!baseUrl) return '';
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${suffix}`;
}

export async function fetchBackendVersion(): Promise<string | null> {
  const baseUrl = getBackendServerUrl();
  if (!baseUrl) return null;
  try {
    const response = await fetch(`${baseUrl}/api/v1/version`, { method: 'GET' });
    if (!response.ok) return null;
    const data = await response.json();
    if (data && typeof data.version !== 'undefined') {
      return String(data.version);
    }
  } catch {
    return null;
  }
  return null;
}
