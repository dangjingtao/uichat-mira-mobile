import { create } from 'zustand';
import type { MiraHostConfig, ConnectionStatus } from '../types';

interface HostStore {
  config: MiraHostConfig | null;
  connectionStatus: ConnectionStatus;
  setConfig: (config: MiraHostConfig) => void;
  clearConfig: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

export const useHostStore = create<HostStore>((set) => ({
  config: null,
  connectionStatus: 'disconnected',
  setConfig: (config) => set({ config }),
  clearConfig: () => set({ config: null, connectionStatus: 'disconnected' }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
}));
