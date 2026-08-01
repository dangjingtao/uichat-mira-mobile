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
    userMsg: string;
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
    ink: '#141413',
    base: '#3d3d3a',
    strong: '#252523',
    muted: '#6c6a64',
    soft: '#8e8b82',
    placeholder: '#8e8b82',
  },

  bg: {
    canvas: '#faf9f5',
    card: '#efe9de',
    soft: '#f5f0e8',
    input: '#f5f0e8',
    userMsg: '#efe9de',
    elevated: '#FFFFFF',
  },

  border: {
    default: '#e6dfd8',
    soft: '#ebe6df',
  },

  status: {
    success: '#5db872',
    warning: '#d4a017',
    error: '#c64545',
    errorBg: '#fce8e8',
  },

  onPrimary: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.4)',
  divider: '#ebe6df',
};

// ─── Dark Theme (tomz.io coral clay accent) ───
export const darkColors: ThemeColors = {
  primary: '#e8a07a',
  primaryActive: '#cc785c',
  primaryDisabled: '#3d3d3a',

  text: {
    ink: '#faf9f5',
    base: '#e5e5ea',
    strong: '#FFFFFF',
    muted: '#a09d96',
    soft: '#636366',
    placeholder: '#636366',
  },

  bg: {
    canvas: '#181715',
    card: '#252320',
    soft: '#1f1e1b',
    input: '#1f1e1b',
    userMsg: '#252320',
    elevated: '#252320',
  },

  border: {
    default: '#2C2C2E',
    soft: '#1f1e1b',
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
