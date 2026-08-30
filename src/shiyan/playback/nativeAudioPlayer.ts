import { NativeModules } from 'react-native';

export interface NativePlayerState {
  positionMs: number;
  durationMs: number;
  playing: boolean;
  ended: boolean;
}

export interface NativeAudioPlayerModule {
  playerLoad(path: string): Promise<{ durationMs: number }>;
  playerPlay(): Promise<void>;
  playerPause(): Promise<void>;
  playerSeekTo(positionMs: number): Promise<void>;
  playerGetState(): Promise<NativePlayerState>;
  playerRelease(): Promise<void>;
}

const getModule = (): NativeAudioPlayerModule => {
  const module = NativeModules.MiraAudioRecorder as
    | (NativeAudioPlayerModule & {
        playerLoad?: unknown;
      })
    | undefined;
  if (!module || typeof module.playerLoad !== 'function') {
    throw new Error('Audio playback is not available in this build.');
  }
  return module;
};

export const nativeAudioPlayer: NativeAudioPlayerModule = {
  playerLoad(path) {
    return getModule().playerLoad(path);
  },
  playerPlay() {
    return getModule().playerPlay();
  },
  playerPause() {
    return getModule().playerPause();
  },
  playerSeekTo(positionMs) {
    return getModule().playerSeekTo(positionMs);
  },
  playerGetState() {
    return getModule().playerGetState();
  },
  playerRelease() {
    return getModule().playerRelease();
  },
};
