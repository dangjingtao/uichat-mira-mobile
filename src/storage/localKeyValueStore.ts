import { NativeModules } from 'react-native';

export interface LocalKeyValueStore {
  isAvailable(): boolean;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

interface NativeLocalStoreModule {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

const getNativeModule = (): NativeLocalStoreModule | null => {
  const module = NativeModules.MiraLocalStore as NativeLocalStoreModule | undefined;
  if (
    !module ||
    typeof module.get !== 'function' ||
    typeof module.set !== 'function' ||
    typeof module.remove !== 'function'
  ) {
    return null;
  }
  return module;
};

export class NativeLocalKeyValueStore implements LocalKeyValueStore {
  isAvailable() {
    return getNativeModule() !== null;
  }

  async get(key: string): Promise<string | null> {
    const module = getNativeModule();
    if (!module) {
      throw new Error('Local UI state storage is not installed in this build');
    }
    return module.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    const module = getNativeModule();
    if (!module) {
      throw new Error('Local UI state storage is not installed in this build');
    }
    await module.set(key, value);
  }

  async remove(key: string): Promise<void> {
    const module = getNativeModule();
    if (!module) {
      throw new Error('Local UI state storage is not installed in this build');
    }
    await module.remove(key);
  }
}

export class MemoryLocalKeyValueStore implements LocalKeyValueStore {
  private readonly values = new Map<string, string>();

  isAvailable() {
    return true;
  }

  async get(key: string) {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string) {
    this.values.set(key, value);
  }

  async remove(key: string) {
    this.values.delete(key);
  }
}

export const localKeyValueStore = new NativeLocalKeyValueStore();
