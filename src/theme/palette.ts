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

// ─── Light Theme — Mira Warm-Toned ───
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
    bubble: '#efe9de',
    elevated: '#ffffff',
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

  onPrimary: '#ffffff',
  overlay: 'rgba(0,0,0,0.4)',
  divider: '#e6dfd8',
};

// ─── Dark Theme — Mira Dark ───
export const darkColors: ThemeColors = {
  primary: '#d49478',
  primaryActive: '#cc785c',
  primaryDisabled: '#2a2520',

  text: {
    ink: '#faf9f5',
    base: '#e8e0d2',
    strong: '#f5f0e8',
    muted: '#a09d96',
    soft: '#7a7770',
    placeholder: '#7a7770',
  },

  bg: {
    canvas: '#181715',
    card: '#252320',
    soft: '#1f1e1b',
    input: '#252320',
    bubble: '#252320',
    elevated: '#252320',
  },

  border: {
    default: '#3a3530',
    soft: '#2a2520',
  },

  status: {
    success: '#5db872',
    warning: '#d4a017',
    error: '#e07070',
    errorBg: '#452020',
  },

  onPrimary: '#181715',
  overlay: 'rgba(0,0,0,0.6)',
  divider: '#3a3530',
};
