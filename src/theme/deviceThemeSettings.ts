import { localKeyValueStore, type LocalKeyValueStore } from '../storage/localKeyValueStore';
import { themePresets, type ThemePresetId } from './palette';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = ThemePresetId;

export interface DeviceThemeSettings {
  mode: ThemeMode;
  accentColor: AccentColor;
}

export const DEFAULT_DEVICE_THEME_SETTINGS: DeviceThemeSettings = {
  mode: 'system',
  accentColor: 'default',
};

const THEME_MODE_KEY = 'mira.mobile.theme.mode';
const ACCENT_COLOR_KEY = 'mira.mobile.theme.accent';

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system';

const isAccentColor = (value: string | null): value is AccentColor =>
  value != null && Object.prototype.hasOwnProperty.call(themePresets, value);

export async function loadDeviceThemeSettings(
  store: LocalKeyValueStore = localKeyValueStore,
): Promise<DeviceThemeSettings> {
  const [mode, accentColor] = await Promise.all([
    store.get(THEME_MODE_KEY),
    store.get(ACCENT_COLOR_KEY),
  ]);

  return {
    mode: isThemeMode(mode) ? mode : DEFAULT_DEVICE_THEME_SETTINGS.mode,
    accentColor: isAccentColor(accentColor)
      ? accentColor
      : DEFAULT_DEVICE_THEME_SETTINGS.accentColor,
  };
}

export async function saveThemeMode(
  mode: ThemeMode,
  store: LocalKeyValueStore = localKeyValueStore,
): Promise<void> {
  await store.set(THEME_MODE_KEY, mode);
}

export async function saveAccentColor(
  accentColor: AccentColor,
  store: LocalKeyValueStore = localKeyValueStore,
): Promise<void> {
  await store.set(ACCENT_COLOR_KEY, accentColor);
}
