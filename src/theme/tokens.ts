/**
 * Mira Mobile Design Tokens
 *
 * Based on the Mira design system (Claude/Anthropic visual language).
 * Reference: https://tomz.io/design-md/视觉/product-design-system
 *
 * Core principles:
 * - Single brand accent: coral clay (#cc785c), used sparingly.
 * - Warm-toned cream canvas, never pure white or cold gray.
 * - Hierarchy through surface color contrast, not shadows.
 * - Serif display fonts with negative letter-spacing.
 */

// ─── Brand & Text ──────────────────────────────────────────
export const colors = {
  /** 唯一品牌强调色 — 按钮 / CTA / 徽标 */
  primary: '#cc785c',
  /** 按钮按下态 */
  primaryActive: '#a9583e',
  /** 禁用态背景 */
  primaryDisabled: '#e6dfd8',

  // Text color ramp — hierarchy through light/dark, not hue
  text: {
    /** 标题 / 高对比正文 */
    ink: '#141413',
    /** 正文段落 */
    base: '#3d3d3a',
    /** 加粗正文 / 强调句 */
    strong: '#252523',
    /** 次要文字 */
    muted: '#6c6a64',
    /** 占位符 / 三级文字 */
    soft: '#8e8b82',
    /** deprecated alias — maps to muted */
    secondary: '#6c6a64',
    /** deprecated alias — maps to soft */
    tertiary: '#8e8b82',
    placeholder: '#8e8b82',
  },

  // ─── Light Surfaces ─────────────────────────────────────
  // 画布必须是带暖调的米白色
  bg: {
    /** 页面主底色 — 暖调米白 */
    canvas: '#faf9f5',
    /** alias for canvas (backwards compat) */
    base: '#faf9f5',
    /** 轻微区隔的分区底色 */
    soft: '#f5f0e8',
    /** 卡片背景（比画布更深一级） */
    card: '#efe9de',
    /** 强调型米色区块 */
    creamStrong: '#e8e0d2',
    /** 输入框底色 */
    input: '#f5f0e8',
    /** AI 消息气泡 */
    bubble: '#efe9de',
    /** deprecated alias */
    subtle: '#f5f0e8',
  },

  // ─── Dark Surfaces ──────────────────────────────────────
  // 深色只用于页脚、少数 CTA、产品截图模块，不作为页面主基调
  dark: {
    /** 深色板块底色 / 页脚 */
    surface: '#181715',
    /** 深色内嵌卡片 / 状态栏 */
    elevated: '#252320',
    /** 深色次级分区 */
    soft: '#1f1e1b',
    /** 深色背景上的主文字 */
    onDark: '#faf9f5',
    /** 深色背景上的次要文字 */
    onDarkSoft: '#a09d96',
  },

  /** 珊瑚色按钮上的文字 */
  onPrimary: '#ffffff',

  // ─── Borders ────────────────────────────────────────────
  border: {
    /** 卡片细边框 */
    default: '#e6dfd8',
    /** 更轻的分隔线 */
    soft: '#ebe6df',
    /** deprecated alias */
    light: '#ebe6df',
  },

  // ─── Accents & Status ───────────────────────────────────
  accent: {
    /** 代码高亮 / 图表点缀 */
    teal: '#5db8a6',
    /** 代码高亮 / 图表点缀 */
    amber: '#e8a55a',
  },

  status: {
    /** 成功状态 */
    success: '#5db872',
    /** 警告状态 */
    warning: '#d4a017',
    /** 错误状态 */
    error: '#c64545',
  },

  // ─── Deprecated aliases (backwards compat) ─────────────
  primaryDark: '#a9583e',
  success: '#5db872',
  warning: '#d4a017',
  danger: '#c64545',
  dangerLight: '#e8a55a',
  muted: '#6c6a64',

  hint: {
    bg: '#f5f0e8',
    text: '#a9583e',
  },

  banner: {
    bg: '#e8e0d2',
    text: '#6c6a64',
  },
} as const;

// ─── Radius ────────────────────────────────────────────────
export const radius = {
  /** 按钮圆角 */
  sm: 8,
  /** 卡片圆角 */
  md: 12,
  /** 大卡片圆角 */
  lg: 16,
  /** 更大圆角 */
  xl: 20,
  /** 全圆角 (pill / 徽标 / 标签) */
  full: 9999,
} as const;

// ─── Spacing ───────────────────────────────────────────────
// 遵循设计系统的间距代币
export const spacing = {
  /** 8px — 徽标 / 标签内边距 */
  xs: 8,
  /** 16px — 组件内部小间距 */
  sm: 16,
  /** 24px — 卡片间距 */
  md: 24,
  /** 32px — 卡片内边距 */
  lg: 32,
  /** 48px — 板块内左右留白 */
  xl: 48,
  /** 96px — 主要板块之间的垂直间距 */
  section: 96,
} as const;

// ─── Typography ────────────────────────────────────────────
export const fontSize = {
  /** 展示级 — 64px */
  displayLg: 64,
  /** 区块标题 — 40px */
  displaySm: 40,
  /** 卡片大标题 — 28px */
  titleXl: 28,
  /** 卡片标题 — 20px */
  titleLg: 20,
  /** 组件标题 — 17px */
  titleMd: 17,
  /** 正文段落 — 16px */
  bodyMd: 16,
  /** 导航链接 / 按钮文字 — 14px */
  button: 14,
  /** 小号标签 — 13px */
  caption: 13,
  /** 大写标签 — 12px */
  captionUppercase: 12,
  /** 代码块 — 13px */
  code: 13,

  // Backwards-compatible aliases
  xs: 12,
  sm: 13,
  base: 14,
  md: 15,
  lg: 16,
  xl: 17,
  '2xl': 18,
  '3xl': 20,
  '4xl': 28,
} as const;

export const lineHeight = {
  /** 正文段落行高 */
  body: 1.6,
  /** 标题行高 */
  title: 1.3,
  /** 紧凑行高 */
  tight: 1.2,
} as const;

export const letterSpacing = {
  /** display-lg */
  displayLg: -1.5,
  /** display-sm */
  displaySm: -1,
  /** title-xl */
  titleXl: -0.3,
  /** 大写标签 */
  captionUppercase: 1.5,
  /** 默认 */
  default: 0,
} as const;

// ─── Component Sizing ──────────────────────────────────────
export const sizing = {
  /** 按钮统一高度 */
  buttonHeight: 40,
  /** 圆形图标按钮 */
  iconButton: 36,
  /** 最小触控区域 */
  touchTarget: 44,
} as const;

// ─── Shadows ───────────────────────────────────────────────
// 设计系统哲学：色块优先，阴影罕见
// 浅色卡片 = 细边框 + 大圆角，零阴影
// 深色卡片 = 靠色块对比制造层次，而非投影
export const shadows = {
  // FAB 保留极轻阴影作为浮动元素的最小深度提示
  fab: {
    shadowColor: '#cc785c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
} as const;
