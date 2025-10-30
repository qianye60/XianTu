/**
 * 统一机器码生成工具
 * 用于授权验证系统
 */

/**
 * 生成稳定的机器码
 * @returns 机器码字符串
 */
export async function generateMachineCode(): Promise<string> {
  // 优先使用统一机器码系统
  try {
    if (typeof (window as any).generateStableMachineCode === 'function') {
      return await (window as any).generateStableMachineCode();
    }
  } catch (e) {
    console.warn('统一机器码系统不可用', e);
  }

  try {
    // 降级方案：基于多种设备特征生成稳定的机器码
    const features = [];

    // 1. User Agent
    try {
      features.push(navigator.userAgent || 'unknown-ua');
    } catch (e) {
      features.push('unknown-ua');
    }

    // 2. 屏幕分辨率
    try {
      features.push(`${window.screen.width || 0}x${window.screen.height || 0}`);
      features.push(`${window.screen.availWidth || 0}x${window.screen.availHeight || 0}`);
      features.push(`${window.screen.colorDepth || 0}`);
    } catch (e) {
      features.push('0x0');
    }

    // 3. 平台信息
    try {
      features.push(navigator.platform || 'unknown-platform');
      features.push(navigator.language || 'unknown-lang');
    } catch (e) {
      features.push('unknown-platform');
    }

    // 4. 时区
    try {
      features.push(`${new Date().getTimezoneOffset()}`);
    } catch (e) {
      features.push('0');
    }

    // 5. 硬件并发数（CPU核心数）
    try {
      features.push(`${navigator.hardwareConcurrency || 0}`);
    } catch (e) {
      features.push('0');
    }

    // 6. 设备内存（如果可用）
    try {
      if ((navigator as any).deviceMemory) {
        features.push(`${(navigator as any).deviceMemory}`);
      }
    } catch (e) {
      // 跳过
    }

    // 7. 触摸支持
    try {
      features.push(`${navigator.maxTouchPoints || 0}`);
    } catch (e) {
      features.push('0');
    }

    // 8. Canvas指纹（轻量级）
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('UMC', 2, 2);
        const dataUrl = canvas.toDataURL();
        features.push(dataUrl.slice(-50));
      }
    } catch (e) {
      // Canvas 指纹失败，跳过
    }

    const rawString = features.join('|');
    console.log('[机器码生成] 特征字符串:', rawString);

    // 使用哈希函数生成机器码
    const hash = await simpleHash(rawString);
    const machineCode = `UMC-${hash.substring(0, 16).toUpperCase()}`;
    console.log('[机器码生成] 成功:', machineCode);
    return machineCode;
  } catch (error) {
    console.error('[机器码生成] 失败:', error);
    // 最终降级：使用时间戳 + 随机数
    const fallbackCode = `UMC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    console.log('[机器码生成] 使用降级方案:', fallbackCode);
    return fallbackCode;
  }
}

/**
 * 简单哈希函数（支持降级）
 */
async function simpleHash(str: string): Promise<string> {
  try {
    // 检查是否支持 TextEncoder 和 crypto.subtle
    if (typeof TextEncoder !== 'undefined' && crypto && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('[简单哈希] crypto.subtle 不可用，使用降级方案');
  }

  // 降级方案：简单的字符串哈希
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}
