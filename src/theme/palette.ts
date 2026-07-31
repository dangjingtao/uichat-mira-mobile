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

// ─── Light Theme — Clean White (ChatGPT style) ───
export const lightColors: ThemeColors = {
  primary: '#3B82F6',
  primaryActive: '#2563EB',
  primaryDisabled: '#E5E7EB',

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
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    errorBg: '#FEE2E2',
  },

  onPrimary: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.4)',
  divider: '#E8E8E8',
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
