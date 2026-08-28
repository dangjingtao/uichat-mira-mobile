import { MemoryLocalKeyValueStore } from '../storage/localKeyValueStore';
import {
  DEFAULT_DEVICE_THEME_SETTINGS,
  loadDeviceThemeSettings,
  saveAccentColor,
  saveThemeMode,
} from './deviceThemeSettings';

describe('deviceThemeSettings', () => {
  it('uses safe defaults when nothing has been persisted', async () => {
    const store = new MemoryLocalKeyValueStore();

    await expect(loadDeviceThemeSettings(store)).resolves.toEqual(
      DEFAULT_DEVICE_THEME_SETTINGS,
    );
  });

  it('persists and hydrates theme mode and accent color', async () => {
    const store = new MemoryLocalKeyValueStore();

    await saveThemeMode('dark', store);
    await saveAccentColor('archive-green', store);

    await expect(loadDeviceThemeSettings(store)).resolves.toEqual({
      mode: 'dark',
      accentColor: 'archive-green',
    });
  });

  it('falls back when persisted values are invalid or from an old build', async () => {
    const store = new MemoryLocalKeyValueStore();
    await store.set('mira.mobile.theme.mode', 'sepia');
    await store.set('mira.mobile.theme.accent', 'removed-accent');

    await expect(loadDeviceThemeSettings(store)).resolves.toEqual(
      DEFAULT_DEVICE_THEME_SETTINGS,
    );
  });
});
