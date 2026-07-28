/**
 * Mira Mobile Design Tokens
 *
 * Centralized design values for use outside of Tailwind (e.g. dynamic styles,
 * runtime calculations, or when className is not enough).
 *
 * Tailwind config mirrors these values in theme.extend — keep them in sync.
 */

export const colors = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  dangerLight: '#fca5a5',
  muted: '#9ca3af',

  bg: {
    base: '#ffffff',
    subtle: '#f9f9f9',
    input: '#f5f5f5',
    bubble: '#f0f0f0',
  },

  text: {
    base: '#111111',
    secondary: '#333333',
    tertiary: '#666666',
    muted: '#888888',
    placeholder: '#999999',
  },

  border: {
    default: '#e0e0e0',
    light: '#e8e8e8',
  },

  hint: {
    bg: '#eef2ff',
    text: '#4f46e5',
  },

  banner: {
    bg: '#fef3c7',
    text: '#92400e',
  },
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  full: 20,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
} as const;

export const fontSize = {
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

export const shadows = {
  fab: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;
