export const TURNSTILE_SITE_KEY = '0x4AAAAAACKKIZGhHxLokv-j';

function getCallbacks(): Array<() => void> | null {
  if (typeof window === 'undefined') return null;
  if (!window.turnstileCallbacks) window.turnstileCallbacks = [];
  return window.turnstileCallbacks;
}

export async function waitForTurnstile(timeoutMs = 8000): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.turnstile) return true;

  const callbacks = getCallbacks();
  if (!callbacks) return false;

  return await new Promise<boolean>((resolve) => {
    let done = false;

    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      resolve(ok);
    };

    const timer = setTimeout(() => finish(!!window.turnstile), timeoutMs);
    callbacks.push(() => {
      clearTimeout(timer);
      finish(!!window.turnstile);
    });
  });
}

export function renderTurnstile(
  container: HTMLElement,
  params: {
    siteKey?: string;
    theme?: 'light' | 'dark' | 'auto';
    onSuccess: (token: string) => void;
    onError?: () => void;
    onExpired?: () => void;
  },
): string {
  if (!window.turnstile) {
    throw new Error('Turnstile SDK not loaded');
  }

  const widgetId = window.turnstile.render(container, {
    sitekey: params.siteKey ?? TURNSTILE_SITE_KEY,
    theme: params.theme ?? 'auto',
    callback: (token: unknown) => params.onSuccess(typeof token === 'string' ? token : ''),
    'error-callback': () => params.onError?.(),
    'expired-callback': () => params.onExpired?.(),
  });

  return widgetId;
}

export function resetTurnstile(widgetId?: string | null) {
  if (!window.turnstile) return;
  try {
    window.turnstile.reset(widgetId ?? undefined);
  } catch (_e) {
    // ignore
  }
}

export function removeTurnstile(widgetId?: string | null) {
  if (!window.turnstile || !widgetId) return;
  try {
    window.turnstile.remove?.(widgetId);
  } catch (_e) {
    // ignore
  }
}
