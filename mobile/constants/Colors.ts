// 柒月半 配色方案 — 完全对齐原版 Web 端
export const Colors = {
  // 主色调
  primary: '#c42b2b',
  primaryLight: '#e63946',
  primaryDark: '#8b1a1a',

  // 背景
  background: '#0a0e14',
  backgroundLight: '#111822',
  surface: '#111822',
  surfaceLight: 'rgba(20, 35, 50, 0.9)',
  card: 'rgba(15, 25, 35, 0.85)',
  cardBorder: 'rgba(180, 40, 40, 0.5)',

  // 文字
  text: '#e0d8d0',
  textSecondary: '#8a8078',
  textMuted: '#5a5550',
  textOnPrimary: '#e0d8d0',

  // 状态色
  success: '#2ecc71',
  warning: '#f39c12',
  danger: '#c42b2b',
  info: '#c42b2b',

  // 边框
  border: 'rgba(180, 40, 40, 0.5)',
  borderLight: 'rgba(100, 30, 30, 0.3)',

  // 输入框
  inputBg: 'rgba(15, 25, 35, 0.85)',
  inputBorder: 'rgba(180, 40, 40, 0.5)',

  // 气泡
  bubbleSelf: '#c42b2b',
  bubbleOther: 'rgba(20, 35, 50, 0.9)',

  // 徽章
  badge: '#c42b2b',
  badgeText: '#e0d8d0',

  // 分类颜色 (原版如果有特定颜色可保留，这里使用统一的红黑风格为主)
  categoryColors: {
    '讨论': '#3498db',
    '探灵': '#9b59b6',
    '灵异': '#8e44ad',
    '求助': '#e67e22',
    '分享': '#2ecc71',
    '语C': '#c42b2b',
    'OC投稿': '#f39c12',
  } as Record<string, string>,

  // Tab 颜色
  tabActive: '#c42b2b',
  tabInactive: '#8a8078',

  // overlay
  overlay: 'rgba(10, 14, 20, 0.8)',

  // 在线状态
  online: '#2ecc71',
  offline: '#5a5550',
};
