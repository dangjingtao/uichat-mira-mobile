import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { Appearance } from 'react-native';
import { lightColors, darkColors, type ThemeColors } from './palette';
import { accentPalette } from './tokens';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'default' | keyof typeof accentPalette;

interface ThemeContextValue {
  mode: ThemeMode;
  theme: 'light' | 'dark';
  colors: ThemeColors;
  accentColor: AccentColor;
  setMode: (mode: ThemeMode) => void;
  setAccentColor: (accentColor: AccentColor) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveEffectiveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    const colorScheme = Appearance.getColorScheme();
    return colorScheme === 'dark' ? 'dark' : 'light';
  }
  return mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [accentColor, setAccentColor] = useState<AccentColor>('default');

  const theme = resolveEffectiveTheme(mode);
  const colors = useMemo(() => {
    const baseColors = theme === 'light' ? lightColors : darkColors;
    if (accentColor === 'default') return baseColors;
    const accent = accentPalette[accentColor];
    return { ...baseColors, primary: accent.color, primaryActive: accent.active };
  }, [accentColor, theme]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setModeState((prev) => {
      const resolved = resolveEffectiveTheme(prev);
      return resolved === 'light' ? 'dark' : 'light';
    });
  }, []);

  const value: ThemeContextValue = {
    mode,
    theme,
    colors,
    accentColor,
    setMode,
    setAccentColor,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
