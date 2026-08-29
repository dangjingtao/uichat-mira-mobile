import { NativeModules } from 'react-native';

export interface NativeRecordingStopResult {
  path: string;
  startedAtMs: number;
  endedAtMs: number;
  durationMs: number;
  fileSizeBytes: number;
}

export interface NativeRecordingFileInfo {
  exists: boolean;
  size: number;
}

export type NativeRecordingPermissionResult = 'granted' | 'denied' | 'blocked' | 'unavailable';

interface NativeAudioRecorderModule {
  requestPermission(): Promise<NativeRecordingPermissionResult>;
  start(recordingId: string): Promise<{ path: string; startedAtMs: number }>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<NativeRecordingStopResult>;
  cancel(): Promise<void>;
  fileInfo(path: string): Promise<NativeRecordingFileInfo>;
  deleteFile(path: string): Promise<void>;
}

const getModule = (): NativeAudioRecorderModule => {
  const module = NativeModules.MiraAudioRecorder as NativeAudioRecorderModule | undefined;
  if (!module) {
    throw new Error('Recording is not available in this build.');
  }
  return module;
};

export const nativeAudioRecorder: NativeAudioRecorderModule = {
  requestPermission() {
    return getModule().requestPermission();
  },
  start(recordingId) {
    return getModule().start(recordingId);
  },
  pause() {
    return getModule().pause();
  },
  resume() {
    return getModule().resume();
  },
  stop() {
    return getModule().stop();
  },
  cancel() {
    return getModule().cancel();
  },
  fileInfo(path) {
    return getModule().fileInfo(path);
  },
  deleteFile(path) {
    return getModule().deleteFile(path);
  },
};
