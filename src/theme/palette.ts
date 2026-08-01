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

// ─── Light Theme — Clean White (tomz.io coral clay accent) ───
export const lightColors: ThemeColors = {
  primary: '#cc785c',
  primaryActive: '#a9583e',
  primaryDisabled: '#e6dfd8',

  text: {
    ink: '#111111',
    base: '#333333',
    strong: '#1A1A1C',
    muted: '#666666',
    soft: '#888888',
    placeholder: '#999999',
  },

  bg: {
    canvas: '#FFFFFF',
    card: '#F5F5F7',
    soft: '#F7F7F8',
    input: '#F5F5F7',
    bubble: '#F2F2F4',
    elevated: '#FFFFFF',
  },

  border: {
    default: '#E0E0E0',
    soft: '#E8E8E8',
  },

  status: {
    success: '#5db872',
    warning: '#d4a017',
    error: '#c64545',
    errorBg: '#fce8e8',
  },

  onPrimary: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.4)',
  divider: '#E8E8E8',
};

// ─── Dark Theme (tomz.io coral clay accent) ───
export const darkColors: ThemeColors = {
  primary: '#e8a07a',
  primaryActive: '#cc785c',
  primaryDisabled: '#3d3d3a',

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
    success: '#5db872',
    warning: '#d4a017',
    error: '#c64545',
    errorBg: '#3d1a1a',
  },

  onPrimary: '#1A1A1C',
  overlay: 'rgba(0,0,0,0.6)',
  divider: '#2C2C2E',
};
