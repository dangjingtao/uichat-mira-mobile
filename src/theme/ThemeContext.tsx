import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme, type ColorSchemeName } from 'react-native';
import { themePresets, type ThemeColors } from './palette';
import {
  DEFAULT_DEVICE_THEME_SETTINGS,
  loadDeviceThemeSettings,
  saveAccentColor,
  saveThemeMode,
  type AccentColor,
  type ThemeMode,
} from './deviceThemeSettings';

export type { AccentColor, ThemeMode } from './deviceThemeSettings';

interface ThemeContextValue {
  mode: ThemeMode;
  theme: 'light' | 'dark';
  colors: ThemeColors;
  accentColor: AccentColor;
  persistenceError: string | null;
  setMode: (mode: ThemeMode) => void;
  setAccentColor: (accentColor: AccentColor) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveEffectiveTheme(
  mode: ThemeMode,
  systemColorScheme: ColorSchemeName,
): 'light' | 'dark' {
  if (mode === 'system') {
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  }
  return mode;
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unable to persist device appearance settings';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [hydrated, setHydrated] = useState(false);
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_DEVICE_THEME_SETTINGS.mode);
  const [accentColor, setAccentColorState] = useState<AccentColor>(
    DEFAULT_DEVICE_THEME_SETTINGS.accentColor,
  );
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void loadDeviceThemeSettings()
      .then((settings) => {
        if (cancelled) return;
        setModeState(settings.mode);
        setAccentColorState(settings.accentColor);
      })
      .catch((error) => {
        if (!cancelled) setPersistenceError(errorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const theme = resolveEffectiveTheme(mode, systemColorScheme);
  const colors = useMemo(() => {
    const preset = themePresets[accentColor];
    return theme === 'light' ? preset.light : preset.dark;
  }, [accentColor, theme]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    setPersistenceError(null);
    void saveThemeMode(next).catch((error) => {
      setPersistenceError(errorMessage(error));
    });
  }, []);

  const setAccentColor = useCallback((next: AccentColor) => {
    setAccentColorState(next);
    setPersistenceError(null);
    void saveAccentColor(next).catch((error) => {
      setPersistenceError(errorMessage(error));
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setModeState((prev) => {
      const resolved = resolveEffectiveTheme(prev, systemColorScheme);
      const next: ThemeMode = resolved === 'light' ? 'dark' : 'light';
      setPersistenceError(null);
      void saveThemeMode(next).catch((error) => {
        setPersistenceError(errorMessage(error));
      });
      return next;
    });
  }, [systemColorScheme]);

  if (!hydrated) return null;

  const value: ThemeContextValue = {
    mode,
    theme,
    colors,
    accentColor,
    persistenceError,
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
