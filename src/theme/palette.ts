export interface ThemeColors {
  primary: string;
  primaryActive: string;
  primaryDisabled: string;

  text: {
    ink: string;
    base: string;
    strong: string;
    muted: string;
    soft: string;
    placeholder: string;
  };

  bg: {
    canvas: string;
    card: string;
    soft: string;
    input: string;
    bubble: string;
    elevated: string;
  };

  border: {
    default: string;
    soft: string;
  };

  status: {
    success: string;
    warning: string;
    error: string;
    errorBg: string;
  };

  onPrimary: string;
  overlay: string;
  divider: string;
}

// ─── Light Theme — Mira warm canvas ───
export const lightColors: ThemeColors = {
  primary: designColors.primary,
  primaryActive: designColors.primaryActive,
  primaryDisabled: designColors.primaryDisabled,

  text: {
    ink: designColors.text.ink,
    base: designColors.text.base,
    strong: designColors.text.strong,
    muted: designColors.text.muted,
    soft: designColors.text.soft,
    placeholder: designColors.text.placeholder,
  },

  bg: {
    canvas: designColors.bg.canvas,
    card: designColors.bg.card,
    soft: designColors.bg.soft,
    input: designColors.bg.input,
    bubble: designColors.bg.bubble,
    elevated: designColors.bg.card,
  },

  border: {
    default: designColors.border.default,
    soft: designColors.border.soft,
  },

  status: {
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    errorBg: '#FEE2E2',
  },

  onPrimary: designColors.onPrimary,
  overlay: 'rgba(0,0,0,0.4)',
  divider: designColors.border.soft,
};

// ─── Dark Theme (ChatGPT style) ───
export const darkColors: ThemeColors = {
  primary: '#60A5FA',
  primaryActive: '#3B82F6',
  primaryDisabled: '#374151',

  text: {
    ink: '#F5F5F7',
    base: '#E5E5EA',
    strong: '#FFFFFF',
    muted: '#9CA3AF',
    soft: '#636366',
    placeholder: '#636366',
  },

  bg: {
    canvas: '#0F0F10',
    card: '#1C1C1E',
    soft: '#1C1C1E',
    input: '#1C1C1E',
    bubble: '#2C2C2E',
    elevated: '#1C1C1E',
  },

  border: {
    default: '#2C2C2E',
    soft: '#1C1C1E',
  },

  status: {
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    errorBg: '#450A0A',
  },

  onPrimary: '#0F0F10',
  overlay: 'rgba(0,0,0,0.6)',
  divider: '#2C2C2E',
};
import { colors as designColors } from './tokens';
