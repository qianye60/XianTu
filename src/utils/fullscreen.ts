export function getFullscreenElement(): Element | null {
  const doc = document as any;
  return (
    document.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement ||
    null
  );
}

export function isFullscreenEnabled(): boolean {
  const doc = document as any;
  const enabled = !!(
    document.fullscreenEnabled ||
    doc.webkitFullscreenEnabled ||
    doc.mozFullScreenEnabled ||
    doc.msFullscreenEnabled
  );

  const hasRequest =
    !!(document.documentElement as any).requestFullscreen ||
    !!(document.documentElement as any).webkitRequestFullscreen ||
    !!(document.documentElement as any).mozRequestFullScreen ||
    !!(document.documentElement as any).msRequestFullscreen;

  return enabled || hasRequest;
}

export function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin frame access throws; still effectively "in iframe".
    return true;
  }
}

export async function requestFullscreen(target?: HTMLElement): Promise<void> {
  const element = (target || document.documentElement) as any;

  if (!element) {
    throw new Error('No element to request fullscreen.');
  }

  if (typeof element.requestFullscreen === 'function') {
    await element.requestFullscreen();
    return;
  }

  if (typeof element.webkitRequestFullscreen === 'function') {
    await element.webkitRequestFullscreen();
    return;
  }

  if (typeof element.mozRequestFullScreen === 'function') {
    await element.mozRequestFullScreen();
    return;
  }

  if (typeof element.msRequestFullscreen === 'function') {
    await element.msRequestFullscreen();
    return;
  }

  throw new Error('Fullscreen API not supported in this browser/environment.');
}

export async function exitFullscreen(): Promise<void> {
  const doc = document as any;

  if (typeof document.exitFullscreen === 'function') {
    await document.exitFullscreen();
    return;
  }

  if (typeof doc.webkitExitFullscreen === 'function') {
    await doc.webkitExitFullscreen();
    return;
  }

  if (typeof doc.mozCancelFullScreen === 'function') {
    await doc.mozCancelFullScreen();
    return;
  }

  if (typeof doc.msExitFullscreen === 'function') {
    await doc.msExitFullscreen();
    return;
  }

  throw new Error('Exit fullscreen not supported in this browser/environment.');
}

export function explainFullscreenError(error: unknown): string {
  const err = error as any;
  const name = String(err?.name || '');
  const message = String(err?.message || '');

  if (name === 'TypeError') {
    return '当前浏览器/环境不支持全屏 API（常见于 iOS Safari 或部分内置浏览器）。';
  }

  if (name === 'NotAllowedError' || name === 'SecurityError') {
    if (isInIframe()) {
      return '当前为嵌入环境，iframe 可能未允许全屏（需要 allowfullscreen / allow="fullscreen"）。建议在浏览器新标签打开再全屏。';
    }
    return '浏览器阻止进入全屏：需要用户手势触发，或站点权限策略禁止。';
  }

  if (message.toLowerCase().includes('fullscreen')) {
    return `全屏失败：${message}`;
  }

  return '无法进入全屏模式（可能被浏览器或嵌入环境限制）。';
}

