/**
 * 授权验证配置文件
 *
 * 开发者可以在这里控制授权验证功能的开关
 */

export const AUTH_CONFIG = {
  // 🔧 开发者控制：是否启用授权验证功能
  // true = 启用验证弹窗，用户需要验证才能使用
  // false = 禁用验证弹窗，用户可以直接使用
  ENABLE_AUTH: true,

  // 授权服务器地址
  SERVER_URL: 'https://auth.ddct.top',

  // 应用ID（已写死）
  APP_ID: 'v30_3c7fb661',

  // 是否在启动时自动弹出验证窗口（如果未验证）
  AUTO_SHOW_ON_STARTUP: true,
};
